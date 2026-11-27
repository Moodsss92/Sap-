"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  EMPTY_MD,
  MD_ETATS,
  MD_ETAT_LABEL,
  MD_TYPES,
  MD_TYPE_GROUPS,
  findDuplicate,
  mdTypeLabel,
  type MasterData,
  type MasterDataFields,
  type MdEtat,
} from "@/lib/masterData";
import { normalizeTcode } from "@/lib/tcodes";
import { MEMBERS, type Step } from "@/lib/types";
import { BottomSheet } from "../ui/BottomSheet";
import { SegmentedControl } from "../ui/SegmentedControl";

export interface MdModalState {
  /** Donnée modifiée, ou absente pour un ajout. */
  row?: MasterData;
  /** Valeurs de départ d'un ajout (T-code et fiche du Journal, par exemple). */
  defaults?: Partial<MasterDataFields>;
}

/** Ajouter / modifier une donnée ; doublon refusé ; « Mark as created » ; supprimer. */
export function MdModal({
  state,
  rows,
  steps,
  me,
  onSave,
  onDelete,
  onClose,
}: {
  state: MdModalState | null;
  rows: MasterData[];
  steps: Step[];
  me: string;
  onSave: (fields: MasterDataFields, id?: string) => Promise<void>;
  onDelete: (row: MasterData) => void;
  onClose: () => void;
}) {
  const [f, setF] = useState<MasterDataFields>(EMPTY_MD);
  const [busy, setBusy] = useState(false);
  const [keyHint, setKeyHint] = useState<string | null>(null);
  const keyRef = useRef<HTMLInputElement>(null);
  const editing = state?.row;

  useEffect(() => {
    if (!state) return;
    setKeyHint(null);
    if (state.row) {
      const { id, updated_by, updated_at, ...fields } = state.row;
      void id;
      void updated_by;
      void updated_at;
      setF(fields);
    } else {
      setF({ ...EMPTY_MD, resp: me, ...state.defaults });
    }
  }, [state, me]);

  const set = <K extends keyof MasterDataFields>(k: K, v: MasterDataFields[K]) => setF((p) => ({ ...p, [k]: v }));
  const dup = findDuplicate(rows, f, editing?.id);
  const typeKnown = MD_TYPES.some((t) => t.value === f.type);

  const clean = (x: MasterDataFields): MasterDataFields => ({
    ...x,
    cle: x.cle.trim(),
    nom: x.nom.trim(),
    ref: x.ref.trim(),
    lien: x.lien.trim(),
    tcode: normalizeTcode(x.tcode),
    remarque: x.remarque.trim(),
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (dup || !f.nom.trim()) return;
    setBusy(true);
    try {
      await onSave(clean(f), editing?.id);
    } finally {
      setBusy(false);
    }
  }

  /** Prévu → Créé : il faut d'abord la clé exacte ; « créé par » devient l'utilisateur. */
  async function markCreated() {
    if (!f.cle.trim()) {
      setKeyHint("Enter the exact key used in SAP first.");
      keyRef.current?.focus();
      return;
    }
    if (dup) return;
    setBusy(true);
    try {
      await onSave(clean({ ...f, etat: "cree", resp: me }), editing?.id);
    } finally {
      setBusy(false);
    }
  }

  const label = "block text-[13px] font-medium text-label3";
  const input = "ios-input mt-1";
  const title = editing ? `Edit ${mdTypeLabel(editing.type)}${editing.cle ? " " + editing.cle : ""}` : "Add master data";

  return (
    <BottomSheet open={!!state} title={title} onClose={onClose} wide>
      <form onSubmit={submit} className="px-5 pt-3">
        <h2 className="text-center text-[20px] font-bold">{title}</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <label className={label}>
            Type
            <select className={input} value={f.type} onChange={(e) => set("type", e.target.value)}>
              {MD_TYPE_GROUPS.map((g) => (
                <optgroup key={g.group} label={g.group}>
                  {g.types.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </optgroup>
              ))}
              {!typeKnown && <option value={f.type}>{f.type}</option>}
            </select>
          </label>
          <label className={label}>
            Key (exact code in SAP)
            <input
              ref={keyRef}
              className={`${input} font-mono`}
              value={f.cle}
              onChange={(e) => {
                set("cle", e.target.value);
                setKeyHint(null);
              }}
              placeholder="Leave empty if not defined yet"
              spellCheck={false}
            />
          </label>
          {(dup || keyHint) && (
            <p role="alert" className="col-span-2 -mt-1 text-[13px] font-medium text-red">
              {dup ? `${mdTypeLabel(dup.type)} ${dup.cle} already exists` : keyHint}
            </p>
          )}
          <label className={`${label} col-span-2`}>
            Name / description
            <input className={input} value={f.nom} onChange={(e) => set("nom", e.target.value)} placeholder="e.g. Breda" />
          </label>
          <label className={label}>
            Copied from
            <input className={input} value={f.ref} onChange={(e) => set("ref", e.target.value)} placeholder="e.g. 1010" />
          </label>
          <label className={label}>
            Linked to
            <input className={input} value={f.lien} onChange={(e) => set("lien", e.target.value)} placeholder="e.g. C2NL" />
          </label>
          <label className={label}>
            T-code
            <input
              className={`${input} font-mono uppercase`}
              value={f.tcode}
              onChange={(e) => set("tcode", e.target.value.toUpperCase())}
              placeholder="e.g. EC02"
              spellCheck={false}
            />
          </label>
          <label className={label}>
            Created by
            <select className={input} value={f.resp} onChange={(e) => set("resp", e.target.value)}>
              <option value="">—</option>
              {MEMBERS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
          <div className="col-span-2">
            <span className={label}>Status</span>
            <div className="mt-1 w-[260px]">
              <SegmentedControl
                label="Status"
                size="sm"
                value={f.etat}
                onChange={(v: MdEtat) => set("etat", v)}
                segments={MD_ETATS.map((s) => ({ value: s, label: MD_ETAT_LABEL[s], tint: s === "cree" ? "text-green" : "text-label" }))}
              />
            </div>
          </div>
          <label className={`${label} col-span-2`}>
            Note
            <textarea className={`${input} resize-y`} rows={2} value={f.remarque} onChange={(e) => set("remarque", e.target.value)} />
          </label>
          <label className={`${label} col-span-2`}>
            Linked Journal entry (optional)
            <select className={input} value={f.step_id ?? ""} onChange={(e) => set("step_id", e.target.value || null)}>
              <option value="">— None —</option>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.num ? `${s.num} · ` : ""}
                  {s.titre || "Untitled"}
                  {s.tcode ? ` (${s.tcode})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {editing && (
            <button type="button" onClick={() => onDelete(editing)} className="btn-danger">
              Delete
            </button>
          )}
          {editing?.etat === "prevu" && (
            <button type="button" onClick={markCreated} disabled={busy} className="btn-tinted">
              Mark as created
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="btn-plain">
            Cancel
          </button>
          <button type="submit" disabled={busy || !!dup || !f.nom.trim()} className="btn-blue min-w-[100px]">
            {busy ? "Saving…" : editing ? "Save" : "Add"}
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
