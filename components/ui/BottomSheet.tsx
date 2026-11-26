"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Feuille iOS qui monte du bas, avec poignée. */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
  dismissible = true,
}: {
  open: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("button, [href], input")?.focus();
    // Phase de capture + stopPropagation : Échap ferme la feuille sans fermer
    // aussi ce qui est derrière (formulaire, fiche).
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.stopPropagation();
      e.preventDefault();
      if (dismissible) onClose?.();
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open, dismissible, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center split:items-center" role="presentation">
      <div
        className="anim-fade absolute inset-0 bg-black/40"
        onClick={() => dismissible && onClose?.()}
        aria-hidden
      />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-pop relative w-full max-w-[480px] rounded-[16px] bg-bg pb-5 pt-2 shadow-pop"
      >
        {children}
      </div>
    </div>
  );
}
