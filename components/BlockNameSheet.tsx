"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BottomSheet } from "./ui/BottomSheet";

/** Feuille pour créer un bloc (« Block 3 ») ou renommer un bloc existant. */
export function BlockNameSheet({
  open,
  mode,
  nextNum,
  initialName = "",
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "create" | "rename";
  /** Numéro que prendra le nouveau bloc (affichage uniquement). */
  nextNum: number;
  initialName?: string;
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "create" ? `New block · Block ${nextNum}` : "Rename block";

  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="px-4 pt-3">
        <h2 className="text-center text-[22px] font-bold">{title}</h2>
        <p className="mt-1 text-center text-[15px] text-label3">
          {mode === "create"
            ? "Give it a name. Blocks are numbered in the order they are created."
            : "The number stays the same; only the name changes."}
        </p>
        <div className="card mt-5 p-1">
          <label htmlFor="block-name" className="sr-only">
            Block name
          </label>
          <input
            id="block-name"
            autoFocus
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Company codes and FI"
            className="w-full rounded-[12px] bg-transparent px-4 py-3 text-[17px] outline-none placeholder:text-label3"
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 text-center text-[14px] text-red">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy || !name.trim()} className="btn-blue mt-4 w-full">
          {busy ? "Saving…" : mode === "create" ? "Create block" : "Rename"}
        </button>
        <button type="button" className="btn-plain mt-1 w-full" onClick={onClose}>
          Cancel
        </button>
      </form>
    </BottomSheet>
  );
}
