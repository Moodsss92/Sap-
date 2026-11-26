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
  const lines = [`### ${s.num || "–"} · ${s.titre || "(untitled)"} [${STATUT_LABEL[s.statut]}] — owner: ${s.resp || "?"}`];
  const add = (k: string, v: string) => v.trim() && lines.push(`${k}: ${v.trim()}`);
  add("T-code", s.tcode);
  add("Path", s.chemin);
  add("What we did", s.action);
  add("Values", s.valeurs);
  add("Check", s.controle);
  add("Issue / solution", s.remarque);
  const legendes = caps.map((c) => c.legende).filter(Boolean);
  if (legendes.length) lines.push(`Screenshot captions: ${legendes.join("; ")}`);
  return lines.join("\n");
}

function buildPrompt(journal: string): string {
  return `You are helping a team of SAP S/4HANA (MM/SD) trainees turn their configuration log, written by several people, into clear and coherent final documentation.

${businessCaseText()}

Here is the log, grouped by block. Each entry was written by a different team member. Some entries may be written in French.

<journal>
${journal}
</journal>

Write ONLY the connecting text of the document. The entries will be reproduced as they are: do not rewrite them.
1. "synthese": 2 paragraphs separated by a blank line. What the team configures, in what order, and how the blocks connect (organizational structure → master data → purchasing / sales flows).
2. "blocs": for EACH block in the log (use its exact name), an "intro" of 2 to 4 sentences: what the block configures, what it is for in the business case, and how it links to the previous or next blocks.
3. "a_verifier": at most 15 concrete points to review, each tied to the number of the entry concerned ("num"): values that conflict between two entries (for example different organizational unit codes), a missing check on a completed step, a completed step with no values entered, a duplicate. Empty list if there is nothing.

Rules: write in English, in a professional documentation register, in the third person ("the team configured…"). Rely only on the log and the business case; do not invent any value, code or SAP message. Do not mention first names in the summary or the introductions.

Reply ONLY with JSON:
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
    return fail("ANTHROPIC_API_KEY is not configured on the server.", 500);
  }

  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json().catch(() => ({})));
  } catch {
    return fail("Invalid request.", 400);
  }

  // Le serveur relit lui-même le journal (droits RLS de l'utilisateur)
  const [stepsRes, capsRes] = await Promise.all([
    auth.supabase.from("steps").select("*"),
    auth.supabase.from("captures").select("step_id, legende, position").order("position"),
  ]);
  if (stepsRes.error || capsRes.error) return fail("Could not read the log.", 500);

  const steps = (stepsRes.data as Step[])
    .filter((s) => !body.onlyDone || s.statut === "fait")
    .sort(compareSteps);
  if (!steps.length) {
    return fail(body.onlyDone ? "No steps marked \"Done\" yet." : "The log is empty.", 400);
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
    return fail("The log is too long to review in one go. Export block by block using the filters.", 413);
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
    if (request.signal.aborted) return fail("Writing stopped.", 499);
    if (err instanceof Anthropic.RateLimitError) return fail("Too many requests to Claude: try again in a minute.", 429);
    if (err instanceof Anthropic.AuthenticationError) return fail("Invalid Anthropic API key on the server.", 500);
    if (err instanceof Anthropic.BadRequestError) return fail(`Claude rejected the request: ${err.message}`, 400);
    if (err instanceof Anthropic.APIConnectionError) return fail("Could not reach the Claude API.", 502);
    if (err instanceof Anthropic.APIError) return fail(`Claude API error (${err.status ?? "?"}). Try again.`, 502);
    return fail("Unexpected error while writing.", 500);
  }

  if (message.stop_reason === "refusal") return fail("Claude could not write this document.", 422);
  if (message.stop_reason === "max_tokens") return fail("Incomplete response from Claude (log too long). Try again with fewer steps.", 502);

  const raw = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  let parsed: z.infer<typeof ComposedSchema>;
  try {
    parsed = ComposedSchema.parse(extractJson(raw));
  } catch {
    return fail("Unreadable response from Claude (invalid JSON). Try again.", 502);
  }

  const result: ComposedDoc = {
    synthese: parsed.synthese.trim(),
    blocs: parsed.blocs.filter((b) => b.intro.trim()).map((b) => ({ bloc: b.bloc.trim(), intro: b.intro.trim() })),
    aVerifier: parsed.a_verifier.filter((p) => p.point.trim()).map((p) => ({ num: p.num.trim(), point: p.point.trim() })),
  };
  return NextResponse.json({ result, steps: steps.length });
}
