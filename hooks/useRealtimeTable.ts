"use client";

import { useCallback, useEffect, useState } from "react";
import { getSupabase } from "@/lib/supabase/client";

/** Lignes d'une table Supabase, chargées puis tenues à jour en temps réel. */
export function useRealtimeTable<T extends { id: string }>(table: string, enabled: boolean) {
  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const { data, error } = await getSupabase().from(table).select("*");
    setError(error ? error.message : null);
    if (data) setRows(data as T[]);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    if (!enabled) return;
    const supabase = getSupabase();
    reload();
    const channel = supabase
      .channel(`${table}-changes`)
      .on("postgres_changes", { event: "*", schema: "public", table }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as Partial<T>).id;
          setRows((prev) => prev.filter((r) => r.id !== id));
        } else {
          const row = p.new as T;
          setRows((prev) => {
            const i = prev.findIndex((r) => r.id === row.id);
            if (i === -1) return [...prev, row];
            const next = prev.slice();
            next[i] = row;
            return next;
          });
        }
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") reload();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, table, reload]);

  /** Remplace (ou ajoute) une ligne localement : mise à jour optimiste. */
  const put = useCallback((row: T) => {
    setRows((prev) => {
      const i = prev.findIndex((r) => r.id === row.id);
      if (i === -1) return [...prev, row];
      const next = prev.slice();
      next[i] = row;
      return next;
    });
  }, []);

  return { rows, setRows, put, loading, error, reload };
}
