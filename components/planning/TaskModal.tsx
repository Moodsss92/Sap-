"use client";

import { useEffect, useState, type FormEvent } from "react";
import { PLAN_KINDS, PLAN_KIND_LABEL, type PlanKind, type PlanTask, type PlanTaskFields } from "@/lib/planning";
import { BottomSheet } from "../ui/BottomSheet";

/** Modifier une tâche : titre, détail, type, phase, ordre ; supprimer. */
export function TaskModal({
  task,
  phases,
  onSave,
  onDelete,
  onClose,
}: {
  task: PlanTask | null;
  phases: string[];
  onSave: (patch: Partial<PlanTaskFields>) => Promise<void>;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [f, setF] = useState({ titre: "", detail: "", kind: "config" as PlanKind, phase: "", ordre: 1 });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) setF({ titre: task.titre, detail: task.detail, kind: task.kind, phase: task.phase, ordre: task.ordre });
  }, [task]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!f.titre.trim()) return;
    setBusy(true);
    try {
      await onSave({ ...f, titre: f.titre.trim(), detail: f.detail.trim(), ordre: Number(f.ordre) || 1 });
    } finally {
      setBusy(false);
    }
  }

  const input = "ios-input mt-1";
  return (
    <BottomSheet open={!!task} title="Edit task" onClose={onClose} wide>
      <form onSubmit={submit} className="px-5 pt-3">
        <h2 className="text-center text-[20px] font-bold">Edit task</h2>
        <div className="mt-4 space-y-3">
          <label className="block text-[13px] font-medium text-label3">
            Title
            <input className={input} value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} autoFocus />
          </label>
          <label className="block text-[13px] font-medium text-label3">
            Detail
            <textarea className={`${input} resize-y`} rows={3} value={f.detail} onChange={(e) => setF({ ...f, detail: e.target.value })} />
          </label>
          <div className="grid grid-cols-[1fr_2fr_90px] gap-3">
            <label className="block text-[13px] font-medium text-label3">
              Type
              <select className={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as PlanKind })}>
                {PLAN_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {PLAN_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-label3">
              Phase
              <select className={input} value={f.phase} onChange={(e) => setF({ ...f, phase: e.target.value })}>
                {phases.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[13px] font-medium text-label3">
              Order
              <input
                className={`${input} tabular-nums`}
                type="number"
                min={1}
                value={f.ordre}
                onChange={(e) => setF({ ...f, ordre: Number(e.target.value) })}
              />
            </label>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onDelete} className="btn-danger">
            Delete
          </button>
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="btn-plain">
            Cancel
          </button>
          <button type="submit" disabled={busy || !f.titre.trim()} className="btn-blue min-w-[100px]">
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
