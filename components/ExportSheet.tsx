"use client";

import { useState } from "react";
import { BottomSheet } from "./ui/BottomSheet";
import { Icon, type IconName } from "./ui/Badges";

export type ExportKind = "final-docx" | "team-docx" | "team-zip" | "view-docx" | "view-text";

interface Option {
  kind: ExportKind;
  icon: IconName;
  title: string;
  detail: string;
}

export function ExportSheet({
  open,
  onClose,
  onExport,
  teamCount,
  doneCount,
  teamCaptures,
  viewCount,
  scopeLabel,
}: {
  open: boolean;
  onClose: () => void;
  onExport: (k: ExportKind, opts: { onlyDone: boolean }) => void;
  teamCount: number;
  doneCount: number;
  teamCaptures: number;
  viewCount: number;
  scopeLabel: string;
}) {
  const [onlyDone, setOnlyDone] = useState(false);
  const s = (n: number, w: string) => `${n} ${w}${n > 1 ? "s" : ""}`;
  const team: Option[] = [
    {
      kind: "team-docx",
      icon: "doc",
      title: "Full team file (Word)",
      detail: `Everyone's entries gathered in business-case order, with who did what, progress by block and missing pieces · ${s(teamCount, "step")}, ${s(teamCaptures, "screenshot")}`,
    },
    {
      kind: "team-zip",
      icon: "image",
      title: "Team screenshots (ZIP)",
      detail: "One folder per block, one subfolder per step, with numbered screenshots and the text entry",
    },
  ];
  const view: Option[] = [
    { kind: "view-docx", icon: "doc", title: "Current view in Word", detail: `${scopeLabel} with the current filters · ${s(viewCount, "step")}` },
    { kind: "view-text", icon: "copy", title: "Copy the current view as text", detail: "To the clipboard, for an email or Teams" },
  ];

  const group = (title: string, options: Option[]) => (
    <>
      <h3 className="section-title mt-4">{title}</h3>
      <div className="card inset-list overflow-hidden">
        {options.map((o) => (
          <button
            key={o.kind}
            type="button"
            onClick={() => onExport(o.kind, { onlyDone })}
            className="flex min-h-[60px] w-full items-center gap-3 px-4 py-2.5 text-left active:bg-fill/20"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] bg-blue text-white">
              <Icon name={o.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-medium">{o.title}</span>
              <span className="block text-[13px] leading-snug text-label3">{o.detail}</span>
            </span>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-label3" />
          </button>
        ))}
      </div>
    </>
  );

  return (
    <BottomSheet open={open} title="Export" onClose={onClose}>
      <div className="px-4 pt-3">
        <h2 className="text-center text-[22px] font-bold">Export</h2>
        <p className="mt-1 text-center text-[14px] text-label3">Bring everyone&apos;s work together in one file.</p>
        <h3 className="section-title mt-4">Final document</h3>
        <div className="card inset-list overflow-hidden">
          <button
            type="button"
            onClick={() => onExport("final-docx", { onlyDone })}
            className="flex min-h-[72px] w-full items-center gap-3 px-4 py-3 text-left active:bg-fill/20"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-gradient-to-br from-blue to-[#5856D6] text-white">
              <Icon name="sparkles" className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold">Final documentation (Word)</span>
              <span className="block text-[13px] leading-snug text-label3">
                Everyone&apos;s work combined into one coherent document: Claude writes the summary, each block&apos;s
                introduction and the points to check. Your entries stay exactly as written.
              </span>
            </span>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-label3" />
          </button>
          <label className="flex min-h-[52px] cursor-pointer items-center gap-3 px-4">
            <span className="min-w-0 flex-1">
              <span className="block text-[16px]">Only completed steps</span>
              <span className="block text-[13px] text-label3">
                {onlyDone ? `${s(doneCount, "step")} of ${teamCount}` : `All steps (${teamCount})`}
              </span>
            </span>
            <input type="checkbox" className="peer sr-only" checked={onlyDone} onChange={(e) => setOnlyDone(e.target.checked)} />
            <span
              aria-hidden
              className="relative h-[31px] w-[51px] shrink-0 rounded-full bg-fill/30 transition-colors after:absolute after:left-[2px] after:top-[2px] after:h-[27px] after:w-[27px] after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-green peer-checked:after:translate-x-[20px] peer-focus-visible:ring-2 peer-focus-visible:ring-blue/60"
            />
          </label>
        </div>
        {group("Whole team, no rewriting", team)}
        {group("Current view", view)}
        <button type="button" className="btn-plain mt-2 w-full" onClick={onClose}>
          Cancel
        </button>
      </div>
    </BottomSheet>
  );
}
