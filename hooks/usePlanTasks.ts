"use client";

import { useCallback, useMemo } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { compareTasks, type PlanTask, type PlanTaskFields } from "@/lib/planning";
import { useRealtimeTable } from "./useRealtimeTable";

/** Tâches du planning (Realtime) + mutations optimistes. */
export function usePlanTasks(enabled: boolean) {
  const { rows, setRows, put, loading, error, reload } = useRealtimeTable<PlanTask>("plan_tasks", enabled);
  const tasks = useMemo(() => rows.slice().sort(compareTasks), [rows]);

  /** Applique un changement local tout de suite, l'envoie, et revient en arrière en cas d'échec. */
  const optimistic = useCallback(
    async (apply: () => void, send: () => PromiseLike<{ error: { message: string } | null }>) => {
      apply();
      const { error } = await send();
      if (error) {
        await reload();
        throw new Error(error.message);
      }
    },
    [reload],
  );

  const addTask = useCallback(
    async (fields: PlanTaskFields): Promise<PlanTask> => {
      const { data, error } = await getSupabase().from("plan_tasks").insert(fields).select().single();
      if (error) throw new Error(error.message);
      put(data as PlanTask);
      return data as PlanTask;
    },
    [put],
  );

  const updateTask = useCallback(
    (id: string, patch: Partial<PlanTaskFields>) =>
      optimistic(
        () => setRows((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t))),
        () => getSupabase().from("plan_tasks").update(patch).eq("id", id),
      ),
    [optimistic, setRows],
  );

  const deleteTask = useCallback(
    (id: string) =>
      optimistic(
        () => setRows((prev) => prev.filter((t) => t.id !== id)),
        () => getSupabase().from("plan_tasks").delete().eq("id", id),
      ),
    [optimistic, setRows],
  );

  /** Renomme une phase : toutes ses tâches changent de phase. */
  const renamePhase = useCallback(
    (from: string, to: string) =>
      optimistic(
        () => setRows((prev) => prev.map((t) => (t.phase === from ? { ...t, phase: to } : t))),
        () => getSupabase().from("plan_tasks").update({ phase: to }).eq("phase", from),
      ),
    [optimistic, setRows],
  );

  const deletePhase = useCallback(
    (phase: string) =>
      optimistic(
        () => setRows((prev) => prev.filter((t) => t.phase !== phase)),
        () => getSupabase().from("plan_tasks").delete().eq("phase", phase),
      ),
    [optimistic, setRows],
  );

  /** Nouvel ordre d'une phase : ordre = 1, 2, 3… pour les ids donnés. */
  const reorderPhase = useCallback(
    async (ids: string[]) => {
      const changes = ids
        .map((id, i) => ({ id, ordre: i + 1 }))
        .filter((c) => rows.find((t) => t.id === c.id)?.ordre !== c.ordre);
      if (!changes.length) return;
      setRows((prev) => prev.map((t) => ({ ...t, ordre: changes.find((c) => c.id === t.id)?.ordre ?? t.ordre })));
      const supabase = getSupabase();
      const results = await Promise.all(
        changes.map((c) => supabase.from("plan_tasks").update({ ordre: c.ordre }).eq("id", c.id)),
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        await reload();
        throw new Error(failed.error.message);
      }
    },
    [rows, setRows, reload],
  );

  return { tasks, loading, error, addTask, updateTask, deleteTask, renamePhase, deletePhase, reorderPhase };
}
