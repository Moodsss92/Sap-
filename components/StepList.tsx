"use client";

import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { NO_BLOC } from "@/lib/blocs";
import { STATUTS, STATUT_LABEL, type Block, type Capture, type Statut, type Step } from "@/lib/types";
import { Icon, StatutBadge, TcodeBadge } from "./ui/Badges";

export interface ReorderControls {
  /** Bouton « Reorder » affiché (onglet Whole log). */
  available: boolean;
  enabled: boolean;
  /** Raison pour laquelle le mode est indisponible (filtres actifs), sinon null. */
  blockedReason: string | null;
  onToggle: () => void;
  canMove: (step: Step, dir: -1 | 1) => boolean;
  onMove: (step: Step, dir: -1 | 1) => void;
  /** Glisser-déposer : place l'étape à `index` dans le groupe `groupKey` (id du bloc ou "none"). */
  onDrop: (stepId: string, groupKey: string, index: number) => void;
}

type DropTarget = { key: string; index: number };

export interface ListFilters {
  q: string;
  statut: Statut | "";
}

export function StepList({
  steps,
  blocks,
  onNewBlock,
  onAddToBlock,
  onRenameBlock,
  onDeleteBlock,
  reorder,
  capturesByStep,
  filters,
  onFilters,
  selectedId,
  onSelect,
  loading,
}: {
  steps: Step[];
  blocks: Block[];
  onNewBlock: () => void;
  onAddToBlock: (block: Block) => void;
  onRenameBlock: (block: Block) => void;
  onDeleteBlock: (block: Block) => void;
  reorder: ReorderControls;
  capturesByStep: Map<string, Capture[]>;
  filters: ListFilters;
  onFilters: (f: ListFilters) => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // ---------- Glisser-déposer (mode Reorder) ----------
  const rootRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; label: string; x: number; y: number } | null>(null);
  const [target, setTarget] = useState<DropTarget | null>(null);
  const suppressClick = useRef(false);

  /** Cible de dépôt sous le pointeur : avant la première ligne dont le milieu est plus bas. */
  const targetAt = (y: number): DropTarget | null => {
    const rows = Array.from(rootRef.current?.querySelectorAll<HTMLElement>("[data-drop-row]") ?? []);
    if (!rows.length) return null;
    for (const el of rows) {
      const r = el.getBoundingClientRect();
      if (y < r.top + r.height / 2) return { key: el.dataset.group!, index: Number(el.dataset.index) };
    }
    const last = rows[rows.length - 1];
    const lastIndex = Number(last.dataset.index);
    // Sous la dernière ligne : après elle (une ligne « Add a step » vaut déjà la fin du bloc)
    return { key: last.dataset.group!, index: last.dataset.add ? lastIndex : lastIndex + 1 };
  };

  const startDrag = (e: ReactPointerEvent, step: Step) => {
    if (!reorder.enabled) return;
    const onHandle = !!(e.target as HTMLElement).closest("[data-drag-handle]");
    // Au doigt : seulement depuis la poignée ≡ (sinon on ne pourrait plus faire défiler la liste)
    if (e.pointerType !== "mouse" && !onHandle) return;
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (e.pointerType === "mouse") e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const label = `${step.num ? step.num + " · " : ""}${step.titre || "Untitled"}`;
    let active = onHandle && e.pointerType !== "mouse"; // au doigt, la poignée démarre tout de suite
    let last: DropTarget | null = null;
    if (active) {
      setDrag({ id: step.id, label, x: startX, y: startY });
      last = targetAt(startY);
      setTarget(last);
    }

    const scroller = rootRef.current?.closest("aside") as HTMLElement | null;
    const onMove = (ev: PointerEvent) => {
      if (!active) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < 5) return;
        active = true;
      }
      ev.preventDefault();
      setDrag({ id: step.id, label, x: ev.clientX, y: ev.clientY });
      last = targetAt(ev.clientY);
      setTarget(last);
      // Défilement automatique près des bords
      const edge = 80;
      const dy = ev.clientY < edge ? -14 : ev.clientY > window.innerHeight - edge ? 14 : 0;
      if (dy) {
        if (scroller && scroller.scrollHeight > scroller.clientHeight) scroller.scrollBy(0, dy);
        window.scrollBy(0, dy);
      }
    };
    const end = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
      if (active) {
        suppressClick.current = true;
        setTimeout(() => (suppressClick.current = false), 0);
        if (ev.type === "pointerup" && last) reorder.onDrop(step.id, last.key, last.index);
      }
      setDrag(null);
      setTarget(null);
    };
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
  };

  /** Ligne bleue d'insertion : au-dessus de la ligne visée (sans décaler la mise en page). */
  const dropLine = (key: string, index: number) =>
    target && target.key === key && target.index === index ? "shadow-[inset_0_3px_0_rgb(var(--blue))]" : "";
  const dropLineAfter = (key: string, index: number) =>
    target && target.key === key && target.index === index ? "shadow-[inset_0_-3px_0_rgb(var(--blue))]" : "";

  const hasFilters = !!(filters.q || filters.statut);

  // Un groupe par bloc, dans l'ordre (y compris les blocs vides), puis les étapes sans bloc
  const groups = useMemo(() => {
    const ids = new Set(blocks.map((b) => b.id));
    const out: { key: string; label: string; block: Block | null; steps: Step[] }[] = blocks.map((b) => ({
      key: b.id,
      label: `Block ${b.num} · ${b.name}`,
      block: b,
      steps: steps.filter((st) => st.block_id === b.id),
    }));
    const loose = steps.filter((st) => !st.block_id || !ids.has(st.block_id));
    if (loose.length) out.push({ key: "none", label: NO_BLOC, block: null, steps: loose });
    return hasFilters ? out.filter((g) => g.steps.length) : out;
  }, [steps, blocks, hasFilters]);

  const toggle = (bloc: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(bloc)) next.delete(bloc);
      else next.add(bloc);
      return next;
    });

  return (
    <div ref={rootRef}>
      {/* Recherche + filtres */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <Icon name="search" className="pointer-events-none absolute left-2.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-label3" />
          <label htmlFor="search" className="sr-only">
            Search
          </label>
          <input
            id="search"
            type="search"
            placeholder="Search (T-code, title, values…)"
            value={filters.q}
            onChange={(e) => onFilters({ ...filters, q: e.target.value })}
            className="w-full rounded-[10px] bg-fill/[0.12] py-2.5 pl-9 pr-3 text-[15px] outline-none placeholder:text-label3 focus:ring-2 focus:ring-blue/50"
          />
        </div>
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="filter-statut">
            Filter by status
          </label>
          <select
            id="filter-statut"
            value={filters.statut}
            onChange={(e) => onFilters({ ...filters, statut: e.target.value as Statut | "" })}
            className="min-h-[40px] w-full rounded-[10px] bg-card px-2.5 text-[15px] text-label outline-none focus:ring-2 focus:ring-blue/50"
          >
            <option value="">All statuses</option>
            {STATUTS.map((s) => (
              <option key={s} value={s}>
                {STATUT_LABEL[s]}
              </option>
            ))}
          </select>
          {reorder.available && (
            <button
              type="button"
              onClick={reorder.onToggle}
              disabled={!!reorder.blockedReason}
              title={reorder.blockedReason ?? (reorder.enabled ? "Finish reordering" : "Move steps up or down")}
              aria-pressed={reorder.enabled}
              className={`min-h-[40px] shrink-0 rounded-[10px] px-3 text-[15px] font-semibold transition disabled:opacity-40 ${
                reorder.enabled ? "bg-blue text-white" : "bg-card text-blue"
              }`}
            >
              {reorder.enabled ? "Done" : "Reorder"}
            </button>
          )}
        </div>
      </div>

      {drag && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[80] max-w-[320px] truncate rounded-[12px] bg-card px-4 py-2.5 text-[15px] font-medium shadow-pop ring-2 ring-blue"
          style={{ left: drag.x + 12, top: drag.y - 22 }}
        >
          {drag.label}
        </div>
      )}

      {reorder.enabled && (
        <p className="mb-3 rounded-[10px] bg-blue/10 px-3 py-2 text-[13px] text-blue">
          Drag a step by its ≡ handle (or anywhere on the row with a mouse) and drop it anywhere, or use ↑ ↓. Numbers update for
          everyone.
        </p>
      )}

      {loading ? (
        <div className="space-y-2" aria-label="Loading">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-[64px] animate-pulse" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="card px-4 py-8 text-center">
          <p className="text-[15px] font-semibold">{hasFilters ? "No results" : "No blocks yet"}</p>
          <p className="mt-1 text-[14px] text-label3">
            {hasFilters ? "Change the search or filters." : "Create Block 1 and give it a name, then add your screenshots to it."}
          </p>
          {hasFilters ? (
            <button type="button" className="btn-plain mt-2" onClick={() => onFilters({ q: "", statut: "" })}>
              Clear filters
            </button>
          ) : (
            <button type="button" className="btn-blue mt-4" onClick={onNewBlock}>
              <Icon name="plus" className="h-[18px] w-[18px]" /> Create Block 1
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => {
            const done = g.steps.filter((st) => st.statut === "fait").length;
            const open = reorder.enabled || !collapsed.has(g.key);
            const pct = g.steps.length ? (done / g.steps.length) * 100 : 0;
            return (
              <section key={g.key} aria-label={g.label}>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggle(g.key)}
                    className="flex min-h-[44px] min-w-0 flex-1 items-center gap-2 px-1 text-left"
                  >
                    <Icon name="chevron-down" className={`h-4 w-4 shrink-0 text-label3 transition-transform ${open ? "" : "-rotate-90"}`} />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{g.label}</span>
                    <span className="shrink-0 text-[13px] tabular-nums text-label3">
                      {done}/{g.steps.length} done
                    </span>
                  </button>
                  {g.block && (
                    <>
                      <button
                        type="button"
                        onClick={() => onRenameBlock(g.block!)}
                        aria-label={`Rename ${g.label}`}
                        title="Rename"
                        className="flex h-11 w-9 shrink-0 items-center justify-center text-label3 hover:text-blue"
                      >
                        <Icon name="edit" className="h-4 w-4" />
                      </button>
                      {g.steps.length === 0 && (
                        <button
                          type="button"
                          onClick={() => onDeleteBlock(g.block!)}
                          aria-label={`Delete ${g.label}`}
                          title="Delete empty block"
                          className="flex h-11 w-9 shrink-0 items-center justify-center text-label3 hover:text-red"
                        >
                          <Icon name="trash" className="h-4 w-4" />
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="mx-1 mb-2 h-1 overflow-hidden rounded-full bg-fill/20" role="progressbar" aria-valuemin={0} aria-valuemax={g.steps.length} aria-valuenow={done} aria-label={`Progress ${g.label}`}>
                  <div className="h-full rounded-full bg-green transition-all" style={{ width: `${pct}%` }} />
                </div>
                {open && (
                  <ul className="card inset-list overflow-hidden">
                    {g.steps.map((s, idx) => {
                      const nCap = capturesByStep.get(s.id)?.length ?? 0;
                      const active = s.id === selectedId;
                      const isLast = idx === g.steps.length - 1;
                      return (
                        <li
                          key={s.id}
                          data-drop-row
                          data-group={g.key}
                          data-index={idx}
                          onPointerDown={(e) => startDrag(e, s)}
                          className={`flex items-stretch ${drag?.id === s.id ? "opacity-40" : ""} ${dropLine(g.key, idx)} ${
                            !g.block && isLast ? dropLineAfter(g.key, idx + 1) : ""
                          } ${reorder.enabled ? "select-none" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (!suppressClick.current) onSelect(s.id);
                            }}
                            aria-current={active ? "true" : undefined}
                            className={`flex min-h-[50px] min-w-0 flex-1 items-center gap-3 py-2.5 text-left transition ${
                              reorder.enabled ? "cursor-grab pl-1 pr-4" : "px-4"
                            } ${active ? "bg-blue/10 dark:bg-blue/25" : "active:bg-fill/15"}`}
                          >
                            {reorder.enabled && (
                              <span
                                data-drag-handle
                                aria-hidden
                                style={{ touchAction: "none" }}
                                title="Drag to move"
                                className="-my-2.5 flex w-9 shrink-0 cursor-grab items-center justify-center self-stretch text-label3"
                              >
                                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                                  <path d="M5 8h14M5 12h14M5 16h14" />
                                </svg>
                              </span>
                            )}
                            <span className="w-9 shrink-0 text-[14px] font-semibold tabular-nums text-label3">{s.num || "–"}</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[14px]">{s.titre || <em className="text-label3">Untitled</em>}</span>
                              <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-label3">
                                <TcodeBadge tcode={s.tcode} />
                                {nCap > 0 && (
                                  <span className="inline-flex items-center gap-0.5" aria-label={`${nCap} screenshot${nCap > 1 ? "s" : ""}`}>
                                    <Icon name="image" className="h-3.5 w-3.5" />
                                    {nCap}
                                  </span>
                                )}
                                {s.resp && <span className="truncate">· {s.resp}</span>}
                              </span>
                            </span>
                            <StatutBadge statut={s.statut} />
                          </button>
                          {reorder.enabled && (
                            <span className="flex shrink-0 flex-col justify-center border-l-hair border-sep pr-1">
                              <button
                                type="button"
                                onClick={() => reorder.onMove(s, -1)}
                                disabled={!reorder.canMove(s, -1)}
                                aria-label={`Move ${s.num} up`}
                                className="flex h-8 w-11 items-center justify-center text-blue disabled:text-label3/30"
                              >
                                <Icon name="chevron-up" />
                              </button>
                              <button
                                type="button"
                                onClick={() => reorder.onMove(s, 1)}
                                disabled={!reorder.canMove(s, 1)}
                                aria-label={`Move ${s.num} down`}
                                className="flex h-8 w-11 items-center justify-center text-blue disabled:text-label3/30"
                              >
                                <Icon name="chevron-down" />
                              </button>
                            </span>
                          )}
                        </li>
                      );
                    })}
                    {g.block && (
                      <li data-drop-row data-add="1" data-group={g.key} data-index={g.steps.length} className={dropLine(g.key, g.steps.length)}>
                        <button
                          type="button"
                          onClick={() => onAddToBlock(g.block!)}
                          className="flex min-h-[48px] w-full items-center gap-2 px-4 text-left text-[15px] text-blue active:bg-fill/15"
                        >
                          <Icon name="plus" className="h-4 w-4" />
                          {g.steps.length ? `Add a step to Block ${g.block.num}` : `Add the first step to Block ${g.block.num}`}
                        </button>
                      </li>
                    )}
                  </ul>
                )}
              </section>
            );
          })}
          {!hasFilters && (
            <button type="button" onClick={onNewBlock} className="btn-tinted w-full">
              <Icon name="plus" className="h-[18px] w-[18px]" /> New block (Block {(blocks[blocks.length - 1]?.num ?? 0) + 1})
            </button>
          )}
        </div>
      )}
    </div>
  );
}
