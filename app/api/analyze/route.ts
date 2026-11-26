import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireMember } from "@/lib/supabase/server";
import { normalizeTcode, tcodesForPrompt } from "@/lib/tcodes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_IMAGES = 5;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5";

type ImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

const RequestSchema = z.object({
  paths: z
    .array(z.string().min(1).max(500).refine((p) => !p.includes(".."), "Invalid path"))
    .min(1, "No screenshots to analyze.")
    .max(20),
});

/** Champ texte tolérant : null → "", tableau → lignes, nombre → texte. */
const text = z.preprocess((v) => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : JSON.stringify(x))).join("\n");
  if (typeof v === "object") {
    return Object.entries(v as Record<string, unknown>)
      .map(([k, val]) => `${k} : ${String(val)}`)
      .join("\n");
  }
  return String(v);
}, z.string().max(8000));

const ResultSchema = z.object({
  tcode: text,
  titre: text,
  chemin: text,
  action: text,
});

function buildPrompt(): string {
  return `You are helping a team of SAP S/4HANA (MM/SD) trainees document the configuration of the Philo Televisions business case (company codes C2NL and C2BE copied from 1010, plants Breda, Delft, Brussels, Antwerp, purchasing orgs P2HQ/P2BR/P2BX/P2AN, sales orgs S2NL/S2BE). Here are SAP GUI or Fiori screenshots of one configuration step. Read the screen title, the fields, the values and the status bar message. Write in English. Reply ONLY with JSON:
{"tcode":"","titre":"short step title","chemin":"full SPRO path separated by ' › '","action":"what was configured on this screen and why, with the key values entered (2 to 4 sentences)"}.
Do not invent anything that is not visible or certain; leave the string empty otherwise.

Reference paths:
${tcodesForPrompt()}`;
}

function mediaTypeFor(path: string, blobType: string): ImageMediaType {
  const t = blobType.toLowerCase();
  if (t === "image/png" || t === "image/jpeg" || t === "image/webp" || t === "image/gif") return t;
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/png";
}

/** Extrait le premier objet JSON d'une réponse (tolère les ```json … ```). */
function extractJson(raw: string): unknown {
  const cleaned = raw.replace(/```(?:json)?/gi, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no-json");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  // 1. Utilisateur connecté et membre de l'équipe
  const auth = await requireMember();
  if (!auth.ok) return fail(auth.error, auth.status);

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail("ANTHROPIC_API_KEY is not configured on the server.", 500);
  }

  // 2. Corps de la requête
  let body: z.infer<typeof RequestSchema>;
  try {
    body = RequestSchema.parse(await request.json());
  } catch {
    return fail("Invalid request: a list of screenshots was expected.", 400);
  }
  const paths = body.paths.slice(0, MAX_IMAGES);

  // 3. Téléchargement des captures depuis le Storage privé
  // (avec la session de l'utilisateur : les règles RLS autorisent les membres à les lire)
  const storage = auth.supabase.storage;
  const images: Anthropic.Beta.BetaImageBlockParam[] = [];
  for (const path of paths) {
    const { data, error } = await storage.from("captures").download(path);
    if (error || !data) return fail(`Screenshot not found in Storage (${path}).`, 404);
    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.byteLength > 5 * 1024 * 1024) {
      return fail("A screenshot is larger than 5 MB: shrink it before analyzing.", 413);
    }
    images.push({
      type: "image",
      source: { type: "base64", media_type: mediaTypeFor(path, data.type), data: buffer.toString("base64") },
    });
  }

  // 4. Appel à Claude (vision)
  const anthropic = new Anthropic();
  let message: Anthropic.Beta.BetaMessage;
  try {
    message = await anthropic.beta.messages.create(
      {
        model: MODEL,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        messages: [
          {
            role: "user",
            content: [
              ...images,
              { type: "text", text: buildPrompt() },
            ],
          },
        ],
      },
      { signal: request.signal },
    );
  } catch (err) {
    if (request.signal.aborted) return fail("Analysis stopped.", 499);
    if (err instanceof Anthropic.RateLimitError) {
      return fail("Too many requests to Claude right now: try again in a minute.", 429);
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return fail("Invalid Anthropic API key on the server.", 500);
    }
    if (err instanceof Anthropic.BadRequestError) {
      return fail(`Claude rejected the request: ${err.message}`, 400);
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return fail("Could not reach the Claude API. Check the server connection.", 502);
    }
    if (err instanceof Anthropic.APIError) {
      return fail(`Claude API error (${err.status ?? "?"}). Try again.`, 502);
    }
    return fail("Unexpected error during analysis.", 500);
  }

  if (message.stop_reason === "refusal") {
    return fail("Claude could not analyze these screenshots. Fill in the entry by hand.", 422);
  }

  const raw = message.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");

  // 5. Validation zod
  let parsed: z.infer<typeof ResultSchema>;
  try {
    parsed = ResultSchema.parse(extractJson(raw));
  } catch {
    return fail("Unreadable response from Claude (invalid JSON). Try again or fill it in by hand.", 502);
  }

  const result = {
    tcode: normalizeTcode(parsed.tcode),
    titre: parsed.titre.trim(),
    chemin: parsed.chemin.trim(),
    action: parsed.action.trim(),
    // Champs qui ne figurent plus dans le formulaire
    valeurs: "",
    controle: "",
    bloc: "",
  };

  return NextResponse.json({ result, analyzed: paths.length, skipped: body.paths.length - paths.length });
}
