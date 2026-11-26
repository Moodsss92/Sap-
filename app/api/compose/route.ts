import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { NO_BLOC } from "@/lib/blocs";
import { businessCaseText } from "@/lib/businessCase";
import { compareSteps } from "@/lib/numbering";
import { requireMember } from "@/lib/supabase/server";
import { STATUT_LABEL, type Capture, type ComposedDoc, type Step } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";
const MAX_INPUT_CHARS = 400_000; // ≈ 100 000 tokens : largement assez pour le journal

const RequestSchema = z.object({ onlyDone: z.boolean().default(false) });

const str = z.preprocess((v) => (v === null || v === undefined ? "" : String(v)), z.string().max(6000));
const ComposedSchema = z.object({
  synthese: str,
  blocs: z.array(z.object({ bloc: str, intro: str })).default([]),
  a_verifier: z.array(z.object({ num: str, point: str })).default([]),
});

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function stepForPrompt(s: Step, caps: Capture[]): string {
  const lines = [`### ${s.num || "–"} · ${s.titre || "(sans titre)"} [${STATUT_LABEL[s.statut]}] — responsable : ${s.resp || "?"}`];
  const add = (k: string, v: string) => v.trim() && lines.push(`${k} : ${v.trim()}`);
  add("T-code", s.tcode);
  add("Chemin", s.chemin);
  add("Ce qu'on fait", s.action);
  add("Valeurs", s.valeurs);
  add("Contrôle", s.controle);
  add("Problème / solution", s.remarque);
  const legendes = caps.map((c) => c.legende).filter(Boolean);
  if (legendes.length) lines.push(`Légendes des captures : ${legendes.join(" ; ")}`);
  return lines.join("\n");
}

function buildPrompt(journal: string): string {
  return `Tu aides une équipe de stagiaires SAP S/4HANA (MM/SD) à transformer leur journal de configuration, écrit à plusieurs mains, en une documentation finale claire et cohérente.

${businessCaseText()}

Voici le journal, groupé par bloc. Chaque fiche a été écrite par un membre différent de l'équipe.

<journal>
${journal}
</journal>

Rédige UNIQUEMENT le texte de liaison du document. Les fiches seront reproduites telles quelles : ne les réécris pas.
1. "synthese" : 2 paragraphes séparés par une ligne vide. Que configure l'équipe, dans quel ordre, et en quoi les blocs s'enchaînent (structure organisationnelle → données de base → flux achats / ventes).
2. "blocs" : pour CHAQUE bloc présent dans le journal (reprends son nom exact), une "intro" de 2 à 4 phrases : ce que le bloc configure, à quoi il sert dans le business case, et le lien avec les blocs précédents ou suivants.
3. "a_verifier" : au maximum 15 points concrets à relire, chacun rattaché au numéro de la fiche concernée ("num") : valeurs incohérentes entre deux fiches (codes d'unités organisationnelles différents, par exemple), contrôle manquant sur une étape faite, étape faite sans valeurs saisies, doublon. Liste vide s'il n'y a rien.

Règles : écris en français, dans un registre de documentation professionnelle, à la 3e personne (« l'équipe a… »). Appuie-toi uniquement sur le journal et le business case ; n'invente aucune valeur, aucun code ni aucun message SAP. Ne cite pas les prénoms dans la synthèse ni dans les introductions.

Réponds UNIQUEMENT en JSON :
{"synthese":"","blocs":[{"bloc":"","intro":""}],"a_verifier":[{"num":"","point":""}]}`;
}

function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no-json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

export async function POST(request: NextRequest) {
  const auth = await requireMember();
  if (!auth.ok) return fail(auth.error, auth.status);
  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("La clé ANTHROPIC_API_KEY n'est pas configurée sur le serveur.", 500);
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json().catch(() => ({})));
  } catch {
    return fail("Requête invalide.", 400);
  }

  // Le serveur relit lui-même le journal (droits RLS de l'utilisateur)
  const [stepsRes, capsRes] = await Promise.all([
    auth.supabase.from("steps").select("*"),
    auth.supabase.from("captures").select("step_id, legende, position").order("position"),
  ]);
  if (stepsRes.error || capsRes.error) return fail("Lecture du journal impossible.", 500);

  const steps = (stepsRes.data as Step[])
    .filter((s) => !body.onlyDone || s.statut === "fait")
    .sort(compareSteps);
  if (!steps.length) {
    return fail(body.onlyDone ? "Aucune étape au statut « Fait » pour l'instant." : "Le journal est vide.", 400);
  }
  const capsByStep = new Map<string, Capture[]>();
  for (const c of capsRes.data as Capture[]) capsByStep.set(c.step_id, [...(capsByStep.get(c.step_id) ?? []), c]);

  const parts: string[] = [];
  let current: string | null = null;
  for (const s of steps) {
    const bloc = s.bloc || NO_BLOC;
    if (bloc !== current) {
      current = bloc;
      parts.push(`\n## ${bloc}`);
    }
    parts.push(stepForPrompt(s, capsByStep.get(s.id) ?? []));
  }
  const journal = parts.join("\n\n");
  if (journal.length > MAX_INPUT_CHARS) {
    return fail("Le journal est trop long pour être relu en une fois. Exporte bloc par bloc avec les filtres.", 413);
  }

  const anthropic = new Anthropic();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await anthropic.beta.messages.create(
      {
        model: MODEL,
        max_tokens: 12000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        messages: [{ role: "user", content: buildPrompt(journal) }],
      },
      { signal: request.signal },
    );
  } catch (err) {
    if (request.signal.aborted) return fail("Rédaction arrêtée.", 499);
    if (err instanceof Anthropic.RateLimitError) return fail("Trop de demandes à Claude : réessaie dans une minute.", 429);
    if (err instanceof Anthropic.AuthenticationError) return fail("Clé API Anthropic invalide côté serveur.", 500);
    if (err instanceof Anthropic.BadRequestError) return fail(`Claude a refusé la requête : ${err.message}`, 400);
    if (err instanceof Anthropic.APIConnectionError) return fail("Impossible de joindre l'API Claude.", 502);
    if (err instanceof Anthropic.APIError) return fail(`Erreur de l'API Claude (${err.status ?? "?"}). Réessaie.`, 502);
    return fail("Erreur inattendue pendant la rédaction.", 500);
  }

  if (message.stop_reason === "refusal") return fail("Claude n'a pas pu rédiger ce document.", 422);
  if (message.stop_reason === "max_tokens") return fail("Réponse de Claude incomplète (journal trop long). Réessaie avec moins d'étapes.", 502);

  const raw = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  let parsed: z.infer<typeof ComposedSchema>;
  try {
    parsed = ComposedSchema.parse(extractJson(raw));
  } catch {
    return fail("Réponse de Claude illisible (JSON invalide). Réessaie.", 502);
  }

  const result: ComposedDoc = {
    synthese: parsed.synthese.trim(),
    blocs: parsed.blocs.filter((b) => b.intro.trim()).map((b) => ({ bloc: b.bloc.trim(), intro: b.intro.trim() })),
    aVerifier: parsed.a_verifier.filter((p) => p.point.trim()).map((p) => ({ num: p.num.trim(), point: p.point.trim() })),
  };
  return NextResponse.json({ result, steps: steps.length });
}
