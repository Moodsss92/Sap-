"use client";

import { useMemo, useState } from "react";
import { copyToClipboard } from "@/lib/exportText";
import { MD_ETAT_LABEL, MD_TYPES, mdToText, mdTypeLabel, type MasterData, type MdEtat } from "@/lib/masterData";
import type { Step } from "@/lib/types";
import { Icon } from "../ui/Badges";
import { SegmentedControl } from "../ui/SegmentedControl";
import { useToast } from "../ui/Toast";
import { MdTable } from "./MdTable";

/** Registre de tout ce qu'on crée ou copie dans SAP, avec les noms exacts. */
export function MasterDataView({
  rows,
  loading,
  error,
  steps,
  onAdd,
  onEdit,
  onOpenStep,
}: {
  rows: MasterData[];
  loading: boolean;
  error: string | null;
  steps: Step[];
  onAdd: () => void;
  onEdit: (row: MasterData) => void;
  onOpenStep: (id: string) => void;
}) {
  const toast = useToast();
  const [q, setQ] = useState("");
  const [etat, setEtat] = useState<MdEtat | "all">("all");
  const [type, setType] = useState<string | null>(null);

  const stepLabel = (id: string) => {
    const s = steps.find((x) => x.id === id);
    return s ? `${s.num ? s.num + " · " : ""}${s.titre || "Untitled"}` : undefined;
  };

  // Recherche + état (les chips de type gardent les compteurs de cette sélection)
  const base = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return rows.filter((r) => {
      if (etat !== "all" && r.etat !== etat) return false;
      if (!words.length) return true;
      const hay = [r.cle, r.nom, r.ref, r.lien, r.tcode, r.resp, r.remarque, mdTypeLabel(r.type), MD_ETAT_LABEL[r.etat]]
        .join(" ")
        .toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [rows, q, etat]);

  // Types dans l'ordre de la liste, puis les types inconnus éventuels
  const types = useMemo(() => {
    const known = MD_TYPES.map((t) => t.value).filter((v) => base.some((r) => r.type === v));
    const unknown = Array.from(new Set(base.map((r) => r.type))).filter((v) => !MD_TYPES.some((t) => t.value === v));
    return [...known, ...unknown];
  }, [base]);

  const shownTypes = type ? types.filter((t) => t === type) : types;
  const count = (t: string) => base.filter((r) => r.type === t).length;

  const copy = async () => {
    try {
      await copyToClipboard(mdToText(type ? base.filter((r) => r.type === type) : base));
      toast("Master data copied", "success");
    } catch {
      toast("Copy failed: allow clipboard access.", "error");
    }
  };

  return (
    <div className="mx-auto max-w-[1300px] space-y-5 pb-16">
      <section className="card p-5" aria-label="Master data filters">
        <div className="flex items-center gap-3">
          <h1 className="flex-1 text-[20px] font-bold tracking-tight">Data created or copied in SAP</h1>
          <button type="button" onClick={copy} disabled={!base.length} className="btn-tinted">
            <Icon name="copy" className="h-4 w-4" /> Copy as text
          </button>
          <button type="button" onClick={onAdd} className="btn-blue">
            <Icon name="plus" className="h-4 w-4" /> Add master data
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-label3" />
            <label htmlFor="md-search" className="sr-only">
              Search master data
            </label>
            <input
              id="md-search"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search (key, name, T-code, linked to…)"
              className="w-full rounded-[10px] bg-fill/[0.12] py-2 pl-9 pr-3 text-[14px] outline-none placeholder:text-label3 focus:ring-2 focus:ring-blue/50"
            />
          </div>
          <div className="w-[260px]">
            <SegmentedControl
              label="Status"
              size="sm"
              value={etat}
              onChange={setEtat}
              segments={[
                { value: "all", label: "All" },
                { value: "cree", label: "Created", tint: "text-green" },
                { value: "prevu", label: "Planned" },
              ]}
            />
          </div>
        </div>
        {types.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
            <Chip active={!type} onClick={() => setType(null)} label="All types" n={base.length} />
            {types.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)} label={mdTypeLabel(t)} n={count(t)} />
            ))}
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="card p-3 text-[14px] text-red">
          Could not load master data: {error}
        </p>
      )}

      {loading ? (
        <div className="card h-[160px] animate-pulse" aria-label="Loading" />
      ) : rows.length === 0 ? (
        <div className="card px-6 py-12 text-center">
          <p className="text-[16px] font-semibold">No master data recorded yet.</p>
          <p className="mt-1 text-[14px] text-label3">Add each object as soon as you create or copy it in SAP.</p>
          <button type="button" onClick={onAdd} className="btn-blue mt-4">
            <Icon name="plus" className="h-4 w-4" /> Add master data
          </button>
        </div>
      ) : shownTypes.length === 0 ? (
        <div className="card px-6 py-10 text-center text-[14px] text-label3">No result for this search.</div>
      ) : (
        shownTypes.map((t) => {
          const list = base.filter((r) => r.type === t);
          const created = list.filter((r) => r.etat === "cree").length;
          return (
            <section key={t} className="card overflow-hidden" aria-label={mdTypeLabel(t)}>
              <header className="flex items-baseline gap-2 px-4 pb-2 pt-3">
                <h2 className="text-[16px] font-semibold">{mdTypeLabel(t)}</h2>
                <span className="text-[13px] text-label3">
                  {list.length} · {created} created
                </span>
              </header>
              <MdTable rows={list} stepLabel={stepLabel} onEdit={onEdit} onOpenStep={onOpenStep} />
            </section>
          );
        })
      )}
    </div>
  );
}

function Chip({ active, onClick, label, n }: { active: boolean; onClick: () => void; label: string; n: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition ${
        active ? "bg-blue text-white" : "bg-fill/[0.12] text-label hover:bg-fill/20"
      }`}
    >
      {label}
      <span className={`tabular-nums ${active ? "text-white/80" : "text-label3"}`}>{n}</span>
    </button>
  );
}
