"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { removeFiles, uploadCaptures } from "@/lib/storage";
import { lookupTcode, normalizeTcode } from "@/lib/tcodes";
import {
  type AnalyzeResult,
  type DraftCapture,
  type Step,
  type StepFields,
} from "@/lib/types";
import { AddCapturesZone } from "./AddCapturesZone";
import { CaptureImage } from "./CaptureImage";
import { Icon } from "./ui/Badges";
import { useToast } from "./ui/Toast";

export interface FormInit {
  id: string;
  isNew: boolean;
  fields: StepFields;
  drafts: DraftCapture[];
  autoAnalyze?: boolean;
  /** Fichiers déjà envoyés pour ce brouillon (à nettoyer si on annule). */
  uploaded?: string[];
}

export interface StepFormHandle {
  addFiles: (files: File[]) => void;
  discard: () => Promise<void>;
}

type AiField = keyof AnalyzeResult;
const AI_FIELDS: AiField[] = ["tcode", "titre", "chemin", "action"];
const MAX_ANALYZE = 5;

function snapshot(fields: StepFields, drafts: DraftCapture[]) {
  return JSON.stringify([fields, drafts.map((d) => [d.id ?? "", d.path, d.legende])]);
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 py-2.5">
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-label3">
          {label}
        </label>
        {hint}
      </div>
      {children}
    </div>
  );
}

function SuggestHint({ show }: { show: boolean }) {
  if (!show) return null;
  return <span className="text-[12px] font-medium text-orange">suggested, please check</span>;
}

export const StepForm = forwardRef<
  StepFormHandle,
  {
    init: FormInit;
    onSave: (id: string, fields: StepFields, drafts: DraftCapture[], isNew: boolean) => Promise<void>;
    onCancel: () => void;
    onDirtyChange: (dirty: boolean) => void;
  }
>(function StepForm({ init, onSave, onCancel, onDirtyChange }, ref) {
  const toast = useToast();
  const [fields, setFields] = useState<StepFields>(init.fields);
  const [drafts, setDrafts] = useState<DraftCapture[]>(init.drafts);
  const [suggested, setSuggested] = useState<Set<keyof StepFields>>(new Set());
  const [saving, setSaving] = useState(false);
  const [upload, setUpload] = useState<{ done: number; total: number } | null>(null);
  const [analysis, setAnalysis] = useState<{ state: "idle" | "running" | "done" | "error"; message?: string }>({ state: "idle" });

  const initial = useRef(snapshot(init.fields, init.drafts));
  const uploaded = useRef<string[]>(init.uploaded ?? []);
  const abort = useRef<AbortController | null>(null);
  const fieldsRef = useRef(fields);
  fieldsRef.current = fields;
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const dirty = useMemo(
    () => snapshot(fields, drafts) !== initial.current || (init.isNew && drafts.length > 0),
    [fields, drafts, init.isNew],
  );
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);

  // Avertissement du navigateur si on quitte la page avec des modifications
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const set = useCallback(<K extends keyof StepFields>(key: K, value: StepFields[K]) => {
    setFields((f) => ({ ...f, [key]: value }));
    setSuggested((s) => {
      if (!s.has(key)) return s;
      const next = new Set(s);
      next.delete(key);
      return next;
    });
  }, []);

  /** T-code → chemin et titre depuis le dictionnaire local, s'ils sont vides. */
  function changeTcode(raw: string) {
    const tcode = raw.toUpperCase();
    set("tcode", tcode);
    const entry = lookupTcode(tcode);
    if (!entry) return;
    const [chemin, titre] = entry;
    const cur = fieldsRef.current;
    const filled: (keyof StepFields)[] = [];
    const patch: Partial<StepFields> = {};
    if (!cur.chemin.trim()) {
      patch.chemin = chemin;
      filled.push("chemin");
    }
    if (!cur.titre.trim()) {
      patch.titre = titre;
      filled.push("titre");
    }
    setFields((f) => ({ ...f, ...patch }));
    if (filled.length) setSuggested((s) => new Set([...Array.from(s), ...filled]));
  }

  // ---------- Lecture des captures par Claude ----------
  const analyze = useCallback(async () => {
    const paths = draftsRef.current.map((d) => d.path).slice(0, MAX_ANALYZE);
    if (!paths.length) {
      setAnalysis({ state: "error", message: "Add at least one screenshot to analyze." });
      return;
    }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setAnalysis({ state: "running" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths }),
        signal: ctrl.signal,
      });
      const body = (await res.json().catch(() => ({}))) as { result?: AnalyzeResult; error?: string };
      if (!res.ok || !body.result) throw new Error(body.error || `Erreur ${res.status}`);
      const r = body.result;

      // On ne remplit QUE les champs vides
      const cur = fieldsRef.current;
      const next: StepFields = { ...cur };
      const filled: (keyof StepFields)[] = [];
      for (const k of AI_FIELDS) {
        const v = k === "tcode" ? normalizeTcode(r.tcode) : r[k];
        if (v && !cur[k].trim()) {
          next[k] = v;
          filled.push(k);
        }
      }
      // Complément par le dictionnaire si Claude a trouvé le T-code mais pas le chemin
      const entry = lookupTcode(next.tcode);
      if (entry) {
        if (!next.chemin.trim()) {
          next.chemin = entry[0];
          filled.push("chemin");
        }
        if (!next.titre.trim()) {
          next.titre = entry[1];
          filled.push("titre");
        }
      }
      setFields(next);
      setSuggested((s) => new Set([...Array.from(s), ...filled]));
      const n = new Set(filled).size;
      const more = draftsRef.current.length > MAX_ANALYZE ? ` (first ${MAX_ANALYZE} screenshots read)` : "";
      setAnalysis({
        state: "done",
        message:
          n > 0
            ? `Claude filled ${n} field${n > 1 ? "s" : ""}. Review it and complete "What I did".${more}`
            : `Claude found nothing to add: the fields were already filled or unreadable.${more}`,
      });
    } catch (e) {
      if (ctrl.signal.aborted) {
        setAnalysis({ state: "idle", message: "Analysis stopped. You can fill in the entry by hand." });
      } else {
        setAnalysis({
          state: "error",
          message: `${e instanceof Error ? e.message : "Analysis failed."} You can still fill it in by hand.`,
        });
      }
    } finally {
      if (abort.current === ctrl) abort.current = null;
    }
  }, []);

  const autoRan = useRef(false);
  useEffect(() => {
    if (init.autoAnalyze && !autoRan.current) {
      autoRan.current = true;
      analyze();
    }
    return () => abort.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Captures ----------
  const addFiles = useCallback(
    async (files: File[]) => {
      if (upload) return;
      try {
        const paths = await uploadCaptures(init.id, files, (done, total) => setUpload({ done, total }));
        uploaded.current.push(...paths);
        setDrafts((d) => [...d, ...paths.map((path) => ({ key: path, path, legende: "" }))]);
        toast(`${paths.length} screenshot${paths.length > 1 ? "s" : ""} added`, "success");
      } catch (e) {
        toast(e instanceof Error ? e.message : "Upload failed", "error", 5000);
      } finally {
        setUpload(null);
      }
    },
    [init.id, toast, upload],
  );

  const move = (i: number, d: -1 | 1) =>
    setDrafts((list) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return list;
      const next = list.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const discard = useCallback(async () => {
    abort.current?.abort();
    const paths = uploaded.current;
    uploaded.current = [];
    await removeFiles(paths);
  }, []);

  useImperativeHandle(ref, () => ({ addFiles, discard }), [addFiles, discard]);

  // ---------- Enregistrement ----------
  const save = useCallback(async () => {
    if (saving || upload) return;
    setSaving(true);
    try {
      const f = fieldsRef.current;
      const clean: StepFields = {
        ...f,
        tcode: normalizeTcode(f.tcode),
        num: f.num.trim(),
        bloc: f.bloc.trim(),
        titre: f.titre.trim(),
      };
      const finalDrafts = draftsRef.current;
      await onSave(init.id, clean, finalDrafts, init.isNew);
      // Nettoyage des fichiers envoyés puis retirés avant l'enregistrement
      const kept = new Set(finalDrafts.map((d) => d.path));
      const orphans = uploaded.current.filter((p) => !kept.has(p));
      uploaded.current = [];
      removeFiles(orphans);
      initial.current = snapshot(clean, finalDrafts);
    } catch (e) {
      toast(`Could not save: ${e instanceof Error ? e.message : "error"}`, "error", 6000);
    } finally {
      setSaving(false);
    }
  }, [init.id, init.isNew, onSave, saving, toast, upload]);

  // Raccourcis : Ctrl/Cmd+S, Échap
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        save();
      } else if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, onCancel]);

  const running = analysis.state === "running";

  return (
    <form
      className="pb-28"
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      aria-label={init.isNew ? "New step" : "Edit step"}
    >
      {/* Barre du haut */}
      <div className="glass sticky top-[var(--header-h,0px)] z-10 -mx-4 mb-3 flex items-center justify-between gap-2 px-4 py-2 split:static split:mx-0 split:bg-transparent split:px-0 split:backdrop-blur-0">
        <button type="button" onClick={onCancel} className="btn-plain -ml-2">
          Cancel
        </button>
        <h1 className="truncate text-[17px] font-semibold">{init.isNew ? "New step" : "Edit step"}</h1>
        <button type="submit" disabled={saving || !!upload} className="btn-blue min-w-[110px]">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* Lecture par Claude */}
      <div className="card mb-4 p-3" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          {running ? (
            <>
              <span className="flex flex-1 items-center gap-2 text-[15px]">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue border-t-transparent" aria-hidden />
                Claude is reading {Math.min(drafts.length, MAX_ANALYZE)} screenshot{drafts.length > 1 ? "s" : ""}…
              </span>
              <button type="button" onClick={() => abort.current?.abort()} className="btn-danger min-h-[36px] px-3 text-[15px]">
                <Icon name="stop" className="h-4 w-4" /> Stop
              </button>
            </>
          ) : (
            <>
              <span className="flex flex-1 items-center gap-2 text-[15px] text-label3">
                <Icon name="sparkles" className="h-5 w-5 text-blue" />
                Claude only fills empty fields.
              </span>
              <button
                type="button"
                onClick={analyze}
                disabled={!drafts.length || !!upload}
                className="btn-tinted min-h-[36px] px-3 text-[15px]"
              >
                Fill from screenshots
              </button>
            </>
          )}
        </div>
        {analysis.message && (
          <p
            role={analysis.state === "error" ? "alert" : undefined}
            className={`mt-2 text-[14px] ${analysis.state === "error" ? "text-red" : analysis.state === "done" ? "text-green" : "text-label3"}`}
          >
            {analysis.message}
          </p>
        )}
      </div>

      {/* Les 4 champs à remplir */}
      <div className="card inset-list mb-4 overflow-hidden">
        <Field label="Title" htmlFor="f-titre" hint={<SuggestHint show={suggested.has("titre")} />}>
          <input
            id="f-titre"
            className="ios-input"
            value={fields.titre}
            onChange={(e) => set("titre", e.target.value)}
            placeholder="e.g. Assign plant to company code"
            autoFocus={!init.autoAnalyze}
          />
        </Field>
        <Field label="T-code" htmlFor="f-tcode" hint={<SuggestHint show={suggested.has("tcode")} />}>
          <input
            id="f-tcode"
            className="ios-input font-mono uppercase"
            value={fields.tcode}
            onChange={(e) => changeTcode(e.target.value)}
            placeholder="e.g. OX18"
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field label="Path" htmlFor="f-chemin" hint={<SuggestHint show={suggested.has("chemin")} />}>
          <textarea
            id="f-chemin"
            rows={2}
            className="ios-input resize-y font-mono text-[14px] text-blue"
            value={fields.chemin}
            onChange={(e) => set("chemin", e.target.value)}
            placeholder="SPRO › Enterprise Structure › …"
          />
        </Field>
        <Field label="What I did" htmlFor="f-action" hint={<SuggestHint show={suggested.has("action")} />}>
          <textarea
            id="f-action"
            rows={4}
            className="ios-input resize-y"
            value={fields.action}
            onChange={(e) => set("action", e.target.value)}
            placeholder="Explain what you configured and why."
          />
        </Field>
      </div>

      {/* Captures */}
      <h2 className="section-title">Screenshots ({drafts.length})</h2>
      <div className="space-y-2">
        {drafts.length > 0 && (
          <ul className="card inset-list overflow-hidden">
            {drafts.map((d, i) => (
              <li key={d.key} className="flex items-center gap-3 p-3">
                <CaptureImage path={d.path} alt={d.legende || `Capture ${i + 1}`} className="h-16 w-24 shrink-0 rounded-[8px] bg-black/5 object-cover" />
                <div className="min-w-0 flex-1">
                  <label htmlFor={`leg-${d.key}`} className="text-[12px] text-label3">
                    Screenshot {i + 1} · caption
                  </label>
                  <input
                    id={`leg-${d.key}`}
                    className="ios-input mt-0.5 py-2 text-[15px]"
                    value={d.legende}
                    onChange={(e) => setDrafts((list) => list.map((x) => (x.key === d.key ? { ...x, legende: e.target.value } : x)))}
                    placeholder="e.g. Save screen"
                  />
                </div>
                <div className="flex shrink-0 flex-col">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move screenshot ${i + 1} up`} className="flex h-9 w-11 items-center justify-center text-blue disabled:text-label3/40">
                    <Icon name="chevron-up" />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === drafts.length - 1} aria-label={`Move screenshot ${i + 1} down`} className="flex h-9 w-11 items-center justify-center text-blue disabled:text-label3/40">
                    <Icon name="chevron-down" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setDrafts((list) => list.filter((x) => x.key !== d.key))}
                  className="min-h-[44px] shrink-0 px-2 text-[15px] text-red"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <AddCapturesZone target="form" onFiles={addFiles} progress={upload} label={drafts.length ? "+ Add more screenshots" : "+ Add screenshots"} />
      </div>

      <p className="mt-4 px-4 text-center text-[13px] text-label3">Ctrl/⌘ + S to save · Esc to cancel</p>
    </form>
  );
});
