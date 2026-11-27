/** Planning : le plan à suivre, avec son avancement. */

export const PLAN_STATUTS = ["afaire", "encours", "fait"] as const;
export type PlanStatut = (typeof PLAN_STATUTS)[number];

export const PLAN_STATUT_LABEL: Record<PlanStatut, string> = {
  afaire: "To do",
  encours: "In progress",
  fait: "Done",
};

export const PLAN_KINDS = ["config", "controle", "flow", "final"] as const;
export type PlanKind = (typeof PLAN_KINDS)[number];

export const PLAN_KIND_LABEL: Record<PlanKind, string> = {
  config: "Config",
  controle: "Check",
  flow: "Flow test",
  final: "Final test",
};

/** Couleurs des badges de type : Config gris, Contrôle bleu, Flow test vert, Test final orange. */
export const PLAN_KIND_STYLE: Record<PlanKind, string> = {
  config: "bg-gray/20 text-label3",
  controle: "bg-blue/15 text-blue",
  flow: "bg-green/15 text-green",
  final: "bg-orange/15 text-orange",
};

export interface PlanTask {
  id: string;
  phase: string;
  ordre: number;
  titre: string;
  detail: string;
  kind: PlanKind;
  statut: PlanStatut;
  resp: string;
  updated_by: string | null;
  updated_at: string;
}

export type PlanTaskFields = Pick<PlanTask, "phase" | "ordre" | "titre" | "detail" | "kind" | "statut" | "resp">;

/** Tri des phases par nom (« 02 · … » avant « 10 · … »). */
export function comparePhases(a: string, b: string): number {
  return a.localeCompare(b, "fr", { numeric: true, sensitivity: "base" });
}

export function compareTasks(a: PlanTask, b: PlanTask): number {
  return comparePhases(a.phase, b.phase) || a.ordre - b.ordre || a.titre.localeCompare(b.titre);
}

/** Statut d'une phase : Done si tout est fait, In progress si quelque chose a commencé, sinon To do. */
export function phaseStatut(tasks: Pick<PlanTask, "statut">[]): PlanStatut {
  if (tasks.length && tasks.every((t) => t.statut === "fait")) return "fait";
  if (tasks.some((t) => t.statut !== "afaire")) return "encours";
  return "afaire";
}
