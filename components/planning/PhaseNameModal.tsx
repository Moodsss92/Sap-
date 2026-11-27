"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BottomSheet } from "../ui/BottomSheet";

/** Nom d'une phase (création ou renommage), par exemple « 02 · Plants et storage locations ». */
export function PhaseNameModal({
  open,
  mode,
  initial,
  existing,
  onSubmit,
  onClose,
}: {
  open: boolean;
  mode: "create" | "rename";
  initial: string;
  existing: string[];
  onSubmit: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState(initial);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setName(initial);
  }, [open, initial]);

  const clean = name.trim();
  const taken = !!clean && clean !== initial && existing.some((p) => p.toLowerCase() === clean.toLowerCase());

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!clean || taken) return;
    setBusy(true);
    try {
      await onSubmit(clean);
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "create" ? "New phase" : "Rename phase";
  return (
    <BottomSheet open={open} title={title} onClose={onClose}>
      <form onSubmit={submit} className="px-5 pt-3">
        <h2 className="text-center text-[20px] font-bold">{title}</h2>
        <p className="mt-1 text-center text-[13px] text-label3">Phases are sorted by name: start with a number.</p>
        <label htmlFor="phase-name" className="sr-only">
          Phase name
        </label>
        <input
          id="phase-name"
          autoFocus
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. 02 · Plants and storage locations"
          className="ios-input mt-4"
        />
        {taken && (
          <p role="alert" className="mt-2 text-[13px] text-red">
            A phase with this name already exists.
          </p>
        )}
        <button type="submit" disabled={busy || !clean || taken} className="btn-blue mt-4 w-full">
          {busy ? "Saving…" : mode === "create" ? "Create phase" : "Rename"}
        </button>
        <button type="button" className="btn-plain mt-1 w-full" onClick={onClose}>
          Cancel
        </button>
      </form>
    </BottomSheet>
  );
}
