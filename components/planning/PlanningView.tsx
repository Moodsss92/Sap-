"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlanTasks } from "@/hooks/usePlanTasks";
import {
  PLAN_STATUTS,
  PLAN_STATUT_LABEL,
  comparePhases,
  type PlanKind,
  type PlanStatut,
  type PlanTask,
  type PlanTaskFields,
} from "@/lib/planning";
import { MEMBERS } from "@/lib/types";
import type { AlertOptions } from "../ui/Alert";
import { Icon } from "../ui/Badges";
import { useToast } from "../ui/Toast";
import { PhaseCard } from "./PhaseCard";
import { PhaseNameModal } from "./PhaseNameModal";
import { TaskModal } from "./TaskModal";

const PENDING_KEY = "sapjournal.pendingPhases";

/**
 * Planning : le plan à suivre et son avancement. Une phase n'existe en base qu'à
 * travers ses tâches ; une phase toute neuve (sans tâche) est gardée dans ce
 * navigateur jusqu'à sa première tâche.
 */
export function PlanningView({
  me,
  confirm,
}: {
  me: string;
  confirm: (o: AlertOptions) => Promise<boolean>;
}) {
  const toast = useToast();
  const { tasks, loading, error, addTask, updateTask, deleteTask, renamePhase, deletePhase, reorderPhase } =
    usePlanTasks(true);

  const [resp, setResp] = useState("");
  const [statut, setStatut] = useState<PlanStatut | "">("");
  const [pending, setPending] = useState<string[]>([]);
  const [phaseModal, setPhaseModal] = useState<{ mode: "create" | "rename"; phase: string } | null>(null);
  const [editing, setEditing] = useState<PlanTask | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout>>();

  // Phases sans tâche, mémorisées dans ce navigateur
  useEffect(() => {
    try {
      setPending(JSON.parse(localStorage.getItem(PENDING_KEY) ?? "[]"));
    } catch {
      setPending([]);
    }
  }, []);
  const savePending = (list: string[]) => {
    setPending(list);
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch {}
  };

  const phases = useMemo(() => {
    const set = new Set<string>(tasks.map((t) => t.phase));
    pending.forEach((p) => set.add(p));
    return Array.from(set).sort(comparePhases);
  }, [tasks, pending]);

  // Une phase en attente qui a reçu une tâche n'a plus besoin d'être mémorisée
  useEffect(() => {
    const withTasks = new Set(tasks.map((t) => t.phase));
    if (pending.some((p) => withTasks.has(p))) savePending(pending.filter((p) => !withTasks.has(p)));
  }, [tasks, pending]);

  const filtersOn = !!(resp || statut);
  const matches = (t: PlanTask) => (!resp || t.resp === resp) && (!statut || t.statut === statut);

  // ---------- Avancement global ----------
  const total = tasks.length;
  const nDone = tasks.filter((t) => t.statut === "fait").length;
  const nProgress = tasks.filter((t) => t.statut === "encours").length;
  const nTodo = total - nDone - nProgress;
  const pct = total ? Math.round((nDone / total) * 100) : 0;

  const fail = (e: unknown) => toast(e instanceof Error ? e.message : "Could not save.", "error", 6000);

  // ---------- Actions ----------
  const goToNext = () => {
    const next = tasks.find((t) => t.statut !== "fait" && matches(t));
    if (!next) return toast(total ? "Everything is done 🎉" : "No task yet.", "success");
    document.getElementById(`task-${next.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightId(next.id);
    clearTimeout(highlightTimer.current);
    highlightTimer.current = setTimeout(() => setHighlightId(null), 2500);
  };

  const addToPhase = async (phase: string, titre: string, kind: PlanKind) => {
    const inPhase = tasks.filter((t) => t.phase === phase);
    const ordre = inPhase.reduce((m, t) => Math.max(m, t.ordre), 0) + 1;
    try {
      await addTask({ phase, ordre, titre, detail: "", kind, statut: "afaire", resp: me });
    } catch (e) {
      fail(e);
      throw e;
    }
  };

  const moveTask = async (t: PlanTask, dir: -1 | 1) => {
    const ids = tasks.filter((x) => x.phase === t.phase).map((x) => x.id);
    const i = ids.indexOf(t.id);
    const j = i + dir;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    try {
      await reorderPhase(ids);
    } catch (e) {
      fail(e);
    }
  };

  const saveEdit = async (patch: Partial<PlanTaskFields>) => {
    if (!editing) return;
    const t = editing;
    try {
      const { ordre, ...rest } = patch;
      await updateTask(t.id, rest);
      // Ordre / phase : on replace la tâche puis on renumérote 1, 2, 3…
      const phase = rest.phase ?? t.phase;
      if (phase !== t.phase || (ordre !== undefined && ordre !== t.ordre)) {
        const others = tasks.filter((x) => x.phase === phase && x.id !== t.id).map((x) => x.id);
        const at = Math.max(0, Math.min((ordre ?? others.length + 1) - 1, others.length));
        others.splice(at, 0, t.id);
        await reorderPhase(others);
        if (phase !== t.phase) await reorderPhase(tasks.filter((x) => x.phase === t.phase && x.id !== t.id).map((x) => x.id));
      }
      setEditing(null);
      toast("Task saved", "success");
    } catch (e) {
      fail(e);
    }
  };

  const removeTask = async () => {
    if (!editing) return;
    const t = editing;
    const ok = await confirm({ title: `Delete "${t.titre}"?`, message: "The task will be removed for the whole team.", confirmLabel: "Delete", destructive: true });
    if (!ok) return;
    setEditing(null);
    try {
      await deleteTask(t.id);
      toast("Task deleted");
    } catch (e) {
      fail(e);
    }
  };

  const removePhase = async (phase: string) => {
    const n = tasks.filter((t) => t.phase === phase).length;
    const ok = await confirm({
      title: `Delete phase "${phase}"?`,
      message: n ? `Its ${n} task${n > 1 ? "s" : ""} will be deleted for the whole team.` : "The phase is empty.",
      confirmLabel: "Delete",
      destructive: true,
    });
    if (!ok) return;
    savePending(pending.filter((p) => p !== phase));
    if (!n) return;
    try {
      await deletePhase(phase);
      toast("Phase deleted");
    } catch (e) {
      fail(e);
    }
  };

  const submitPhase = async (name: string) => {
    if (!phaseModal) return;
    if (phaseModal.mode === "create") {
      savePending([...pending, name]);
      toast(`Phase "${name}" created: add its first task`, "success");
    } else {
      const from = phaseModal.phase;
      savePending(pending.map((p) => (p === from ? name : p)));
      try {
        if (tasks.some((t) => t.phase === from)) await renamePhase(from, name);
        toast("Phase renamed", "success");
      } catch (e) {
        fail(e);
      }
    }
    setPhaseModal(null);
  };

  // ---------- Rendu ----------
  const select = "h-9 rounded-[8px] bg-card2 px-2.5 text-[14px] outline-none focus:ring-2 focus:ring-blue/50";

  return (
    <div className="mx-auto max-w-[1100px] space-y-5 pb-16">
      {/* En-tête : avancement + filtres + actions */}
      <section className="card p-5" aria-label="Planning progress">
        <div className="flex items-end gap-6">
          <div>
            <p className="text-[13px] font-medium text-label3">Overall progress</p>
            <p className="text-[44px] font-bold leading-none tracking-tight tabular-nums">{pct}%</p>
          </div>
          <div className="min-w-0 flex-1 pb-1.5">
            <div className="h-2.5 overflow-hidden rounded-full bg-fill/20" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
              <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-[13px] text-label3">
              {nDone} done · {nProgress} in progress · {nTodo} to do, out of {total} task{total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="plan-resp">
            Filter by owner
          </label>
          <select id="plan-resp" className={select} value={resp} onChange={(e) => setResp(e.target.value)}>
            <option value="">All owners</option>
            {MEMBERS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <label className="sr-only" htmlFor="plan-statut">
            Filter by status
          </label>
          <select id="plan-statut" className={select} value={statut} onChange={(e) => setStatut(e.target.value as PlanStatut | "")}>
            <option value="">All statuses</option>
            {PLAN_STATUTS.map((s) => (
              <option key={s} value={s}>
                {PLAN_STATUT_LABEL[s]}
              </option>
            ))}
          </select>
          {filtersOn && (
            <button type="button" className="btn-plain px-2 text-[13px]" onClick={() => { setResp(""); setStatut(""); }}>
              Clear filters
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={goToNext} disabled={!total} className="btn-tinted">
            <Icon name="chevron-down" className="h-4 w-4" /> Go to next task
          </button>
          <button type="button" onClick={() => setPhaseModal({ mode: "create", phase: "" })} className="btn-blue">
            <Icon name="plus" className="h-4 w-4" /> New phase
          </button>
        </div>
      </section>

      {error && (
        <p role="alert" className="card p-3 text-[14px] text-red">
          Could not load the planning: {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3" aria-label="Loading">
          {[0, 1].map((i) => (
            <div key={i} className="card h-[120px] animate-pulse" />
          ))}
        </div>
      ) : phases.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-[16px] font-semibold">The planning is empty.</p>
          <p className="mt-1 text-[14px] text-label3">Create your first phase, then add the steps to follow.</p>
          <button type="button" onClick={() => setPhaseModal({ mode: "create", phase: "" })} className="btn-blue mt-4">
            <Icon name="plus" className="h-4 w-4" /> New phase
          </button>
        </div>
      ) : (
        phases.map((phase) => {
          const all = tasks.filter((t) => t.phase === phase);
          return (
            <PhaseCard
              key={phase}
              phase={phase}
              tasks={all}
              visible={all.filter(matches)}
              highlightId={highlightId}
              reorderEnabled={!filtersOn}
              onRename={() => setPhaseModal({ mode: "rename", phase })}
              onDelete={() => removePhase(phase)}
              onAdd={(titre, kind) => addToPhase(phase, titre, kind)}
              onStatut={(t, s) => updateTask(t.id, { statut: s }).catch(fail)}
              onResp={(t, r) => updateTask(t.id, { resp: r }).catch(fail)}
              onEdit={(t) => setEditing(t)}
              onMove={moveTask}
            />
          );
        })
      )}

      <PhaseNameModal
        open={!!phaseModal}
        mode={phaseModal?.mode ?? "create"}
        initial={phaseModal?.phase ?? ""}
        existing={phases}
        onSubmit={submitPhase}
        onClose={() => setPhaseModal(null)}
      />
      <TaskModal task={editing} phases={phases} onSave={saveEdit} onDelete={removeTask} onClose={() => setEditing(null)} />
    </div>
  );
}
