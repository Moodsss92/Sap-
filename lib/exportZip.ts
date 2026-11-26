"use client";

import JSZip from "jszip";
import { NO_BLOC, blocNumber } from "./blocs";
import { journalToText, stepToText } from "./exportText";
import { signedUrl } from "./storage";
import { buildTeamSummary } from "./teamSummary";
import { STATUT_LABEL, type Capture, type Step } from "./types";

/** Nom de fichier sûr (Windows / macOS), sans accents problématiques. */
function safe(name: string, max = 60): string {
  return (
    name
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, max)
      .replace(/[ .]+$/, "") || "untitled"
  );
}

function blocFolder(bloc: string): string {
  const n = blocNumber(bloc);
  const name = bloc.replace(/^\d+\s*·\s*/, "");
  return safe(n !== null ? `${String(n).padStart(2, "0")} - ${name}` : bloc || NO_BLOC);
}

function stepFolder(s: Step): string {
  return safe([s.num, s.tcode, s.titre || "untitled"].filter(Boolean).join(" - "), 80);
}

function summaryText(steps: Step[], capturesByStep: Map<string, Capture[]>): string {
  const s = buildTeamSummary(steps, capturesByStep);
  const lines = [
    "HOW THE TEAM'S WORK FITS TOGETHER",
    `${s.fait}/${s.total} steps done (${s.pct}%)`,
    "",
    "Progress by block:",
    ...s.blocs.map(
      (b) => `  ${b.bloc}: ${b.byStatut.fait}/${b.total} done` + (b.contributors.length ? ` (${b.contributors.join(", ")})` : ""),
    ),
    "",
    "Contribution by member:",
    ...s.members.map((m) => `  ${m.name}: ${m.total} step(s), ${m.fait} done, ${m.captures} screenshot(s)`),
    "",
    "Missing pieces:",
    ...(s.emptyBlocs.length ? s.emptyBlocs.map((b) => `  Block with no steps: ${b}`) : []),
    ...s.openSteps.map((st) => `  ${st.num || "–"} ${st.titre || "(untitled)"}: ${STATUT_LABEL[st.statut]} · ${st.resp || "unassigned"}`),
    ...(!s.emptyBlocs.length && !s.openSteps.length ? ["  Nothing missing, everything is done."] : []),
  ];
  return lines.join("\n") + "\n";
}

/**
 * ZIP des captures rangées comme le journal :
 *   00 - README.txt              synthèse + journal complet
 *   01 - Company codes et FI/
 *     1.4 - OBY6 - Paramètres globaux/
 *       entry.txt
 *       capture 1 - Écran OBY6.png
 */
export async function exportCapturesZip(
  steps: Step[],
  capturesByStep: Map<string, Capture[]>,
  opts: { title: string; onProgress?: (done: number, total: number) => void },
): Promise<{ blob: Blob; missing: number }> {
  const zip = new JSZip();
  zip.file(
    "00 - README.txt",
    `${opts.title}\nExported on ${new Date().toLocaleString("en-GB")}\n\n${summaryText(steps, capturesByStep)}\n\n${journalToText(steps, capturesByStep, "FULL LOG")}`,
  );

  const total = steps.reduce((n, s) => n + (capturesByStep.get(s.id)?.length ?? 0), 0);
  let done = 0;
  let missing = 0;
  opts.onProgress?.(0, total);

  const used = new Set<string>();
  for (const s of steps) {
    let dir = `${blocFolder(s.bloc)}/${stepFolder(s)}`;
    for (let k = 2; used.has(dir); k++) dir = `${blocFolder(s.bloc)}/${stepFolder(s)} (${k})`;
    used.add(dir);

    const caps = capturesByStep.get(s.id) ?? [];
    zip.file(`${dir}/entry.txt`, stepToText(s, caps) + "\n");

    for (let i = 0; i < caps.length; i++) {
      const c = caps[i];
      const ext = c.path.split(".").pop() || "png";
      const name = safe(`screenshot ${i + 1}${c.legende ? " - " + c.legende : ""}`, 70);
      try {
        const url = await signedUrl(c.path);
        const res = url ? await fetch(url) : null;
        if (!res?.ok) throw new Error();
        zip.file(`${dir}/${name}.${ext}`, await res.arrayBuffer());
      } catch {
        missing++;
      }
      opts.onProgress?.(++done, total);
    }
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
  return { blob, missing };
}
