"use client";

import { useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";
import { Icon } from "./ui/Badges";
import { MEMBERS, type MemberName } from "@/lib/types";

export function WhoAreYouSheet({
  open,
  current,
  onChoose,
  onClose,
}: {
  open: boolean;
  current?: MemberName;
  onChoose: (name: MemberName) => Promise<void>;
  onClose?: () => void;
}) {
  const [busy, setBusy] = useState<MemberName | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(name: MemberName) {
    setBusy(name);
    setError(null);
    try {
      await onChoose(name);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <BottomSheet open={open} title="Who are you?" onClose={onClose} dismissible={!!current}>
      <div className="px-4 pt-3">
        <h2 className="text-center text-[22px] font-bold">Who are you?</h2>
        <p className="mt-1 text-center text-[15px] text-label3">
          Pick your name to enter the log. It signs your entries; you can change it at any time.
        </p>
        <div className="card inset-list mt-5 overflow-hidden">
          {MEMBERS.map((name) => (
            <button
              key={name}
              type="button"
              disabled={!!busy}
              onClick={() => choose(name)}
              className="flex min-h-[52px] w-full items-center gap-3 px-4 text-left active:bg-fill/20"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue/15 text-[15px] font-semibold text-blue">
                {name[0]}
              </span>
              <span className="flex-1 text-[17px]">{name}</span>
              {busy === name ? (
                <span className="text-[14px] text-label3">…</span>
              ) : current === name ? (
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-blue" fill="none" stroke="currentColor" strokeWidth={2.6} aria-label="selected">
                  <path d="m5 12 5 5 9-10" />
                </svg>
              ) : (
                <Icon name="chevron-right" className="h-4 w-4 text-label3" />
              )}
            </button>
          ))}
        </div>
        {error && (
          <p role="alert" className="mt-3 text-center text-[14px] text-red">
            {error}
          </p>
        )}
        {current && (
          <button type="button" className="btn-plain mt-2 w-full" onClick={onClose}>
            Cancel
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
