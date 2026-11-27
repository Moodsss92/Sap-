"use client";

import { useState, type FormEvent } from "react";
import {
  PLAN_KINDS,
  PLAN_KIND_LABEL,
  PLAN_STATUT_LABEL,
  phaseStatut,
  type PlanKind,
  type PlanStatut,
  type PlanTask,
} from "@/lib/planning";
import { Icon } from "../ui/Badges";
import { TaskRow } from "./TaskRow";

const PHASE_BADGE: Record<PlanStatut, string> = {
  fait: "bg-green/15 text-green",
  encours: "bg-blue/15 text-blue",
  afaire: "bg-gray/20 text-label3",
};

/** Une phase : en-tête (statut, x/y, mini barre, renommer / supprimer), tâches, ajout rapide. */
export function PhaseCard({
  phase,
  tasks,
  visible,
  highlightId,
  reorderEnabled,
  onRename,
  onDelete,
  onAdd,
  onStatut,
  onResp,
  onEdit,
  onMove,
}: {
  phase: string;
  /** Toutes les tâches de la phase (pour le statut et l'ordre). */
  tasks: PlanTask[];
  /** Tâches affichées (après filtres). */
  visible: PlanTask[];
  highlightId: string | null;
  reorderEnabled: boolean;
  onRename: () => void;
  onDelete: () => void;
  onAdd: (titre: string, kind: PlanKind) => Promise<void>;
  onStatut: (t: PlanTask, s: PlanStatut) => void;
  onResp: (t: PlanTask, r: string) => void;
  onEdit: (t: PlanTask) => void;
  onMove: (t: PlanTask, dir: -1 | 1) => void;
}) {
  const [titre, setTitre] = useState("");
  const [kind, setKind] = useState<PlanKind>("config");
  const [adding, setAdding] = useState(false);

  const done = tasks.filter((t) => t.statut === "fait").length;
  const statut = phaseStatut(tasks);
  const pct = tasks.length ? (done / tasks.length) * 100 : 0;

  async function add(e: FormEvent) {
    e.preventDefault();
    if (!titre.trim() || adding) return;
    setAdding(true);
    try {
      await onAdd(titre.trim(), kind);
      setTitre("");
    } finally {
      setAdding(false);
    }
  }

  return (
    <section aria-label={phase} className="card overflow-hidden">
      <header className="flex items-center gap-3 px-4 pb-2 pt-3">
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-semibold">{phase}</h2>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold ${PHASE_BADGE[statut]}`}>
          {PLAN_STATUT_LABEL[statut]}
        </span>
        <span className="w-12 shrink-0 text-right text-[13px] tabular-nums text-label3">
          {done}/{tasks.length}
        </span>
        <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-fill/20" aria-hidden>
          <span className="block h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
        </span>
        <button type="button" onClick={onRename} title="Rename phase" aria-label={`Rename ${phase}`} className="flex h-8 w-8 items-center justify-center text-label3 hover:text-blue">
          <Icon name="edit" className="h-4 w-4" />
        </button>
        <button type="button" onClick={onDelete} title="Delete phase" aria-label={`Delete ${phase}`} className="flex h-8 w-8 items-center justify-center text-label3 hover:text-red">
          <Icon name="trash" className="h-4 w-4" />
        </button>
      </header>

      {visible.length > 0 && (
        <ul className="inset-list hairline-t">
          {visible.map((t) => {
            const i = tasks.findIndex((x) => x.id === t.id);
            return (
              <TaskRow
                key={t.id}
                task={t}
                highlighted={highlightId === t.id}
                showReorder={reorderEnabled}
                canUp={i > 0}
                canDown={i < tasks.length - 1}
                onStatut={(s) => onStatut(t, s)}
                onResp={(r) => onResp(t, r)}
                onEdit={() => onEdit(t)}
                onMove={(dir) => onMove(t, dir)}
              />
            );
          })}
        </ul>
      )}
      {tasks.length > 0 && visible.length === 0 && (
        <p className="hairline-t px-4 py-3 text-[13px] text-label3">No task matches the filters in this phase.</p>
      )}

      <form onSubmit={add} className="hairline-t flex items-center gap-2 px-4 py-2.5">
        <Icon name="plus" className="h-4 w-4 shrink-0 text-blue" />
        <label htmlFor={`add-${phase}`} className="sr-only">
          Add a task to this phase
        </label>
        <input
          id={`add-${phase}`}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          placeholder="Add a task to this phase… (Enter)"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] outline-none placeholder:text-label3"
        />
        <label htmlFor={`kind-${phase}`} className="sr-only">
          Task type
        </label>
        <select
          id={`kind-${phase}`}
          value={kind}
          onChange={(e) => setKind(e.target.value as PlanKind)}
          className="h-8 rounded-[8px] bg-card2 px-2 text-[13px] outline-none focus:ring-2 focus:ring-blue/50"
        >
          {PLAN_KINDS.map((k) => (
            <option key={k} value={k}>
              {PLAN_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <button type="submit" disabled={!titre.trim() || adding} className="btn-tinted h-8 min-h-0 px-3 text-[13px]">
          Add
        </button>
      </form>
    </section>
  );
}
