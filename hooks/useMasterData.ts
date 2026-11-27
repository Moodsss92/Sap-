"use client";

import { useCallback } from "react";
import { getSupabase } from "@/lib/supabase/client";
import { mdTypeLabel, type MasterData, type MasterDataFields } from "@/lib/masterData";
import { useRealtimeTable } from "./useRealtimeTable";

/** Message lisible pour le doublon refusé par l'index unique (type, clé). */
function friendly(error: { message: string; code?: string }, f?: Partial<MasterDataFields>): string {
  if (error.code === "23505" && f) return `${mdTypeLabel(f.type ?? "")} ${f.cle ?? ""} already exists`;
  return error.message;
}

/** Registre Master data (Realtime) + mutations optimistes. */
export function useMasterData(enabled: boolean) {
  const { rows, setRows, put, loading, error, reload } = useRealtimeTable<MasterData>("master_data", enabled);

  const addMd = useCallback(
    async (fields: MasterDataFields): Promise<MasterData> => {
      const { data, error } = await getSupabase().from("master_data").insert(fields).select().single();
      if (error) throw new Error(friendly(error, fields));
      put(data as MasterData);
      return data as MasterData;
    },
    [put],
  );

  const updateMd = useCallback(
    async (id: string, patch: Partial<MasterDataFields>) => {
      const before = rows.find((r) => r.id === id);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      const { data, error } = await getSupabase().from("master_data").update(patch).eq("id", id).select().single();
      if (error) {
        if (before) put(before);
        else await reload();
        throw new Error(friendly(error, { ...before, ...patch }));
      }
      put(data as MasterData);
    },
    [rows, setRows, put, reload],
  );

  const deleteMd = useCallback(
    async (id: string) => {
      setRows((prev) => prev.filter((r) => r.id !== id));
      const { error } = await getSupabase().from("master_data").delete().eq("id", id);
      if (error) {
        await reload();
        throw new Error(error.message);
      }
    },
    [setRows, reload],
  );

  return { rows, loading, error, addMd, updateMd, deleteMd };
}
