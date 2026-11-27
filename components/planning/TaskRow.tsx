"use client";

import { MEMBERS } from "@/lib/types";
import {
  PLAN_KIND_LABEL,
  PLAN_KIND_STYLE,
  PLAN_STATUTS,
  PLAN_STATUT_LABEL,
  type PlanStatut,
  type PlanTask,
} from "@/lib/planning";
import { Icon } from "../ui/Badges";
import { SegmentedControl } from "../ui/SegmentedControl";

const STATUT_TINT: Record<PlanStatut, string> = { afaire: "text-label", encours: "text-blue", fait: "text-green" };

/** Une tâche du planning : type, titre, statut en un clic, responsable, modifier, ↑ ↓. */
export function TaskRow({
  task,
  highlighted,
  canUp,
  canDown,
  showReorder,
  onStatut,
  onResp,
  onEdit,
  onMove,
}: {
  task: PlanTask;
  highlighted: boolean;
  canUp: boolean;
  canDown: boolean;
  showReorder: boolean;
  onStatut: (s: PlanStatut) => void;
  onResp: (r: string) => void;
  onEdit: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const done = task.statut === "fait";
  return (
    <li
      id={`task-${task.id}`}
      className={`flex items-center gap-3 px-4 py-2.5 transition-colors duration-700 ${highlighted ? "bg-blue/15" : ""}`}
    >
      {showReorder && (
        <span className="flex shrink-0 flex-col">
          <button
            type="button"
            onClick={() => onMove(-1)}
            disabled={!canUp}
            aria-label={`Move "${task.titre}" up`}
            className="flex h-6 w-7 items-center justify-center text-blue disabled:text-label3/30"
          >
            <Icon name="chevron-up" className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            disabled={!canDown}
            aria-label={`Move "${task.titre}" down`}
            className="flex h-6 w-7 items-center justify-center text-blue disabled:text-label3/30"
          >
            <Icon name="chevron-down" className="h-4 w-4" />
          </button>
        </span>
      )}
      <span className={`w-[78px] shrink-0 rounded-[6px] px-1.5 py-0.5 text-center text-[11.5px] font-semibold ${PLAN_KIND_STYLE[task.kind]}`}>
        {PLAN_KIND_LABEL[task.kind]}
      </span>
      <div className={`min-w-0 flex-1 ${done ? "text-label3 line-through decoration-label3/60" : ""}`}>
        <p className="truncate text-[14px] font-medium">{task.titre || <em className="text-label3">Untitled</em>}</p>
        {task.detail && <p className="truncate text-[12.5px] text-label3">{task.detail}</p>}
      </div>
      <div className="w-[270px] shrink-0">
        <SegmentedControl
          label={`Status of ${task.titre}`}
          size="sm"
          value={task.statut}
          onChange={onStatut}
          segments={PLAN_STATUTS.map((s) => ({ value: s, label: PLAN_STATUT_LABEL[s], tint: STATUT_TINT[s] }))}
        />
      </div>
      <label className="sr-only" htmlFor={`resp-${task.id}`}>
        Owner
      </label>
      <select
        id={`resp-${task.id}`}
        value={task.resp}
        onChange={(e) => onResp(e.target.value)}
        className="h-8 w-[96px] shrink-0 rounded-[8px] bg-card2 px-2 text-[13px] outline-none focus:ring-2 focus:ring-blue/50"
      >
        <option value="">—</option>
        {MEMBERS.map((m) => (
          <option key={m} value={m}>
            {m}
          </option>
        ))}
      </select>
      <button type="button" onClick={onEdit} className="btn-plain h-8 min-h-0 shrink-0 px-2 text-[13px]">
        Edit
      </button>
    </li>
  );
}
