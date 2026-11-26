import { NO_BLOC } from "./blocs";
import { STATUT_LABEL, type Capture, type Step } from "./types";

export function stepToText(step: Step, captures: Capture[] = []): string {
  const lines: string[] = [];
  lines.push(`${step.num ? step.num + " · " : ""}${step.titre || "(untitled)"}`);
  const field = (label: string, value: string) => {
    if (value.trim()) lines.push(`${label}: ${value.includes("\n") ? "\n  " + value.split("\n").join("\n  ") : value}`);
  };
  field("Block", step.bloc);
  field("Owner", step.resp);
  field("Status", STATUT_LABEL[step.statut]);
  field("Transaction", step.tcode);
  field("Path", step.chemin);
  field("What we did", step.action);
  field("Values", step.valeurs);
  field("Check", step.controle);
  field("Issue / solution", step.remarque);
  if (captures.length) {
    lines.push(
      `Screenshots (${captures.length}): ` +
        captures.map((c, i) => `${i + 1}${c.legende ? " " + c.legende : ""}`).join("; "),
    );
  }
  return lines.join("\n");
}

export function journalToText(
  steps: Step[],
  capturesByStep: Map<string, Capture[]>,
  title = "SAP configuration log · Philo Televisions",
): string {
  const out: string[] = [title, "=".repeat(title.length), ""];
  let current: string | null = null;
  for (const s of steps) {
    const bloc = s.bloc || NO_BLOC;
    if (bloc !== current) {
      current = bloc;
      out.push("", `## ${bloc}`, "");
    }
    out.push(stepToText(s, capturesByStep.get(s.id) ?? []), "");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() + "\n";
}

export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  ta.remove();
}
