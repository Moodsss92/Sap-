"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

type Tone = "default" | "success" | "error";
interface ToastItem {
  id: number;
  text: string;
  tone: Tone;
}

const Ctx = createContext<(text: string, tone?: Tone, ms?: number) => void>(() => {});

export function useToast() {
  return useContext(Ctx);
}

/** Toasts en pilule floutée, en bas de l'écran (le haut porte la navigation). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const seq = useRef(0);

  const show = useCallback((text: string, tone: Tone = "default", ms = 3200) => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-2), { id, text, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), ms);
  }, []);

  return (
    <Ctx.Provider value={show}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-0 z-[70]">
        {items.map((t, i) => (
          <div
            key={t.id}
            role="status"
            style={{ bottom: `calc(max(env(safe-area-inset-bottom), 20px) + ${(items.length - 1 - i) * 54}px)` }}
            className="anim-toast glass absolute left-1/2 flex max-w-[92vw] -translate-x-1/2 items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium shadow-pop"
          >
            <span
              aria-hidden
              className={`h-2 w-2 shrink-0 rounded-full ${
                t.tone === "success" ? "bg-green" : t.tone === "error" ? "bg-red" : "bg-blue"
              }`}
            />
            <span className="text-label">{t.text}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
