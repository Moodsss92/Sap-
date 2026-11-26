"use client";

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import { NO_BLOC, blocNumber } from "./blocs";
import { BUSINESS_CASE } from "./businessCase";
import { signedUrl } from "./storage";
import { buildTeamSummary, type TeamSummary } from "./teamSummary";
import { STATUT_LABEL, type Capture, type ComposedDoc, type Step } from "./types";

const MAX_WIDTH = 600;
const GREY = "6E6E73";
const STATUT_COLOR: Record<Step["statut"], string> = { fait: "34C759", encours: "007AFF", probleme: "FF3B30", afaire: "8E8E93" };

type DocxImage = { data: ArrayBuffer; type: "png" | "jpg" | "gif"; width: number; height: number };
type Block = Paragraph | Table;

/** Télécharge une capture et la convertit si besoin (webp → png) pour Word. */
async function loadForDocx(path: string): Promise<DocxImage | null> {
  const url = await signedUrl(path);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let data: ArrayBuffer;
  let type: DocxImage["type"];
  if (blob.type === "image/png" || blob.type === "image/jpeg" || blob.type === "image/gif") {
    data = await blob.arrayBuffer();
    type = blob.type === "image/jpeg" ? "jpg" : blob.type === "image/gif" ? "gif" : "png";
  } else {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    const png = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/png"));
    if (!png) return null;
    data = await png.arrayBuffer();
    type = "png";
  }
  bitmap.close();
  const scale = Math.min(1, MAX_WIDTH / width);
  return { data, type, width: Math.round(width * scale), height: Math.round(height * scale) };
}

function multiline(text: string, opts: { color?: string; font?: string } = {}): TextRun[] {
  return text.split("\n").map(
    (line, i) => new TextRun({ text: line, break: i > 0 ? 1 : undefined, color: opts.color, font: opts.font }),
  );
}

function field(label: string, value: string, opts: { color?: string; font?: string } = {}): Paragraph[] {
  if (!value.trim()) return [];
  return [
    new Paragraph({
      spacing: { after: 80 },
      children: [new TextRun({ text: `${label} : `, bold: true }), ...multiline(value, opts)],
    }),
  ];
}

// ---------- Tableaux de synthèse ----------

function cell(text: string, opts: { bold?: boolean; header?: boolean; color?: string; align?: "left" | "center" } = {}) {
  return new TableCell({
    shading: opts.header ? { type: ShadingType.CLEAR, color: "auto", fill: "E5F0FF" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [
      new Paragraph({
        alignment: opts.align === "center" ? AlignmentType.CENTER : AlignmentType.LEFT,
        children: [new TextRun({ text, bold: opts.bold || opts.header, color: opts.color, size: 20 })],
      }),
    ],
  });
}

function table(header: string[], rows: { cells: string[]; colors?: (string | undefined)[] }[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: header.map((h, i) => cell(h, { header: true, align: i ? "center" : "left" })) }),
      ...rows.map(
        (r) =>
          new TableRow({
            children: r.cells.map((c, i) => cell(c, { align: i ? "center" : "left", color: r.colors?.[i] })),
          }),
      ),
    ],
  });
}

function progressBar(done: number, total: number, width = 20): string {
  const n = total ? Math.round((done / total) * width) : 0;
  return "█".repeat(n) + "░".repeat(width - n);
}

function blocTable(s: TeamSummary): Table {
  return table(
    ["Bloc", "Étapes", "Faites", "En cours", "Problème", "À faire", "Contributeurs"],
    s.blocs.map((b) => ({
      cells: [
        b.bloc,
        String(b.total),
        String(b.byStatut.fait),
        String(b.byStatut.encours),
        String(b.byStatut.probleme),
        String(b.byStatut.afaire),
        b.contributors.join(", ") || "—",
      ],
      colors: [undefined, undefined, STATUT_COLOR.fait, STATUT_COLOR.encours, b.byStatut.probleme ? STATUT_COLOR.probleme : undefined],
    })),
  );
}

function memberTable(s: TeamSummary): Table {
  return table(
    ["Membre", "Étapes", "Faites", "Captures"],
    s.members.map((m) => ({ cells: [m.name, String(m.total), String(m.fait), String(m.captures)] })),
  );
}

function teamSummaryBlocks(steps: Step[], capturesByStep: Map<string, Capture[]>): Block[] {
  const s = buildTeamSummary(steps, capturesByStep);
  const out: Block[] = [
    new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun("Assemblage de l'équipe")] }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: `${s.fait}/${s.total} étapes faites (${s.pct} %)  `, bold: true, size: 28 }),
        new TextRun({ text: progressBar(s.fait, s.total), color: "34C759", size: 28 }),
      ],
    }),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Avancement par bloc")] }),
    blocTable(s),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Contribution de chacun")] }),
    memberTable(s),
    new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun("Pièces manquantes")] }),
  ];

  if (!s.emptyBlocs.length && !s.openSteps.length) {
    out.push(new Paragraph({ children: [new TextRun({ text: "Rien ne manque : toutes les étapes sont faites. 🎉", color: "34C759" })] }));
  }
  if (s.emptyBlocs.length) {
    out.push(new Paragraph({ children: [new TextRun({ text: "Blocs sans aucune étape :", bold: true })] }));
    s.emptyBlocs.forEach((b) => out.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun(b)] })));
  }
  if (s.openSteps.length) {
    out.push(new Paragraph({ spacing: { before: 120 }, children: [new TextRun({ text: "Étapes à terminer :", bold: true })] }));
    s.openSteps.forEach((st) =>
      out.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun(`${st.num ? st.num + " · " : ""}${st.titre || "(sans titre)"}`),
            new TextRun({ text: `  ${STATUT_LABEL[st.statut]}`, color: STATUT_COLOR[st.statut], bold: true }),
            new TextRun({ text: st.resp ? ` · ${st.resp}` : " · non attribuée", color: GREY }),
          ],
        }),
      ),
    );
  }
  return out;
}

// ---------- Fiches ----------

export interface DocxOptions {
  title: string;
  subtitle?: string;
  /** Dossier d'équipe : page de synthèse + signature de chaque fiche. */
  team?: boolean;
  nameOf?: (id: string | null | undefined) => string | undefined;
  onProgress?: (done: number, total: number) => void;
}

type Progress = { done: number; total: number; report?: (d: number, t: number) => void };

function attribution(s: Step, nameOf?: DocxOptions["nameOf"]): Paragraph {
  const author = nameOf?.(s.author_id);
  const updater = nameOf?.(s.updated_by);
  const parts = [
    `Responsable : ${s.resp || "non attribuée"}`,
    author && `rédigée par ${author}`,
    updater && updater !== author && `complétée par ${updater}`,
  ].filter(Boolean);
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `● ${STATUT_LABEL[s.statut]}`, bold: true, color: STATUT_COLOR[s.statut] }),
      new TextRun({ text: `   ${parts.join(" · ")}`, italics: true, color: GREY }),
    ],
  });
}

async function stepBlocks(
  s: Step,
  caps: Capture[],
  opts: { signed: boolean; nameOf?: DocxOptions["nameOf"]; heading?: (typeof HeadingLevel)[keyof typeof HeadingLevel] },
  progress: Progress,
): Promise<Block[]> {
  const out: Block[] = [
    new Paragraph({
      heading: opts.heading ?? HeadingLevel.HEADING_2,
      children: [new TextRun(`${s.num ? s.num + " · " : ""}${s.titre || "(sans titre)"}`)],
    }),
  ];
  if (opts.signed) out.push(attribution(s, opts.nameOf));
  else out.push(...field("Responsable", s.resp), ...field("Statut", STATUT_LABEL[s.statut]));
  out.push(
    ...field("Transaction", s.tcode),
    ...field("Chemin", s.chemin, { font: "Consolas", color: "007AFF" }),
    ...field("Ce qu'on fait", s.action),
    ...field("Valeurs", s.valeurs),
    ...field("Contrôle", s.controle),
    ...field("Problème / solution", s.remarque, { color: "FF3B30" }),
  );

  for (let i = 0; i < caps.length; i++) {
    const c = caps[i];
    let img: DocxImage | null = null;
    try {
      img = await loadForDocx(c.path);
    } catch {
      img = null;
    }
    progress.done++;
    progress.report?.(progress.done, progress.total);
    if (img) {
      out.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 160 },
          children: [
            new ImageRun({
              type: img.type,
              data: img.data,
              transformation: { width: img.width, height: img.height },
              altText: { name: `Capture ${i + 1}`, description: c.legende || `Capture ${i + 1}`, title: `Capture ${i + 1}` },
            }),
          ],
        }),
      );
    } else {
      out.push(new Paragraph({ children: [new TextRun({ text: "[capture indisponible]", italics: true, color: "8E8E93" })] }));
    }
    out.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [
          new TextRun({ text: `Capture ${i + 1}/${caps.length}${c.legende ? " · " + c.legende : ""}`, italics: true, size: 18, color: GREY }),
        ],
      }),
    );
  }
  out.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D1D1D6", space: 4 } },
      spacing: { after: 200 },
      children: [],
    }),
  );
  return out;
}

function countCaptures(steps: Step[], capturesByStep: Map<string, Capture[]>): number {
  return steps.reduce((n, s) => n + (capturesByStep.get(s.id)?.length ?? 0), 0);
}

function makeDoc(title: string, children: Block[]): Promise<Blob> {
  const doc = new Document({
    creator: "Journal SAP · Philo Televisions",
    title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [{ children }],
  });
  return Packer.toBlob(doc);
}

// ---------- Export du journal (vue actuelle / dossier d'équipe) ----------

export async function exportJournalDocx(
  steps: Step[],
  capturesByStep: Map<string, Capture[]>,
  opts: DocxOptions,
): Promise<Blob> {
  const children: Block[] = [new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(opts.title)] })];
  if (opts.subtitle) {
    children.push(new Paragraph({ children: [new TextRun({ text: opts.subtitle, italics: true, color: GREY })] }));
  }
  if (opts.team) children.push(...teamSummaryBlocks(steps, capturesByStep));

  const progress: Progress = { done: 0, total: countCaptures(steps, capturesByStep), report: opts.onProgress };
  opts.onProgress?.(0, progress.total);

  let current: string | null = null;
  for (const s of steps) {
    const bloc = s.bloc || NO_BLOC;
    if (bloc !== current) {
      current = bloc;
      children.push(
        new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: children.length > 2, children: [new TextRun(bloc)] }),
      );
    }
    children.push(...(await stepBlocks(s, capturesByStep.get(s.id) ?? [], { signed: !!opts.team, nameOf: opts.nameOf }, progress)));
  }
  return makeDoc(opts.title, children);
}

// ---------- Documentation finale ----------

function paragraphs(text: string): Paragraph[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => new Paragraph({ spacing: { after: 160 }, children: multiline(p) }));
}

/** Introduction de bloc : encadré gris avec un liseré bleu à gauche. */
function introBox(text: string): Paragraph[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        new Paragraph({
          spacing: { after: 200 },
          shading: { type: ShadingType.CLEAR, color: "auto", fill: "F2F2F7" },
          border: { left: { style: BorderStyle.SINGLE, size: 18, color: "007AFF", space: 8 } },
          children: multiline(p),
        }),
    );
}

/** Retrouve l'introduction rédigée par Claude pour un bloc (nom exact, sinon même numéro). */
function introFor(composed: ComposedDoc | null, bloc: string): string {
  if (!composed) return "";
  const norm = (x: string) => x.trim().toLowerCase();
  const exact = composed.blocs.find((b) => norm(b.bloc) === norm(bloc));
  if (exact) return exact.intro;
  const n = blocNumber(bloc);
  return (n !== null && composed.blocs.find((b) => blocNumber(b.bloc) === n)?.intro) || "";
}

export interface FinalDocOptions {
  composed: ComposedDoc | null;
  onlyDone: boolean;
  nameOf?: DocxOptions["nameOf"];
  onProgress?: (done: number, total: number) => void;
}

/**
 * Documentation finale : page de titre, sommaire, synthèse, structure
 * organisationnelle, un chapitre par bloc (introduction + fiches), annexes.
 * `allSteps` sert aux annexes (étapes non incluses, contributions).
 */
export async function exportFinalDocx(
  allSteps: Step[],
  capturesByStep: Map<string, Capture[]>,
  opts: FinalDocOptions,
): Promise<Blob> {
  const steps = opts.onlyDone ? allSteps.filter((s) => s.statut === "fait") : allSteps;
  const title = "Documentation de configuration SAP S/4HANA";
  const date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const summary = buildTeamSummary(allSteps, capturesByStep);

  // Regroupement par bloc
  const groups: { bloc: string; steps: Step[] }[] = [];
  for (const s of steps) {
    const bloc = s.bloc || NO_BLOC;
    const last = groups[groups.length - 1];
    if (last && last.bloc === bloc) last.steps.push(s);
    else groups.push({ bloc, steps: [s] });
  }

  const H1 = (text: string, pageBreak = true) =>
    new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: pageBreak, children: [new TextRun(text)] });
  const H2 = (text: string) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun(text)] });

  // Page de titre
  const children: Block[] = [
    new Paragraph({ spacing: { before: 2400 }, children: [] }),
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun(title)] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: `Business case ${BUSINESS_CASE.name} · modules MM et SD`, size: 32, color: "007AFF" })],
    }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Équipe : ${BUSINESS_CASE.team.join(", ")}`, size: 24 })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: `${steps.length} étape${steps.length > 1 ? "s" : ""} documentée${steps.length > 1 ? "s" : ""}${opts.onlyDone ? " (étapes terminées)" : ""} · version du ${date}`,
          color: GREY,
        }),
      ],
    }),
  ];

  // Sommaire
  let chap = 1;
  const toc: string[] = [];
  if (opts.composed?.synthese) toc.push(`${chap++}. Synthèse`);
  toc.push(`${chap++}. Structure organisationnelle`);
  const firstBlocChap = chap;
  groups.forEach((g) => toc.push(`${chap++}. ${g.bloc.replace(/^\d+\s*·\s*/, "")}`));
  toc.push("Annexes");
  children.push(H1("Sommaire"));
  toc.forEach((t, i) => {
    children.push(new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: t, bold: true })] }));
    const g = groups[i - (firstBlocChap - 1)];
    if (t.match(/^\d+\./) && g && i >= firstBlocChap - 1) {
      g.steps.forEach((s) =>
        children.push(
          new Paragraph({
            indent: { left: 400 },
            spacing: { after: 20 },
            children: [new TextRun({ text: `${s.num ? s.num + " · " : ""}${s.titre || "(sans titre)"}`, color: GREY, size: 20 })],
          }),
        ),
      );
    }
  });

  // Synthèse
  chap = 1;
  if (opts.composed?.synthese) {
    children.push(H1(`${chap++}. Synthèse`), ...paragraphs(opts.composed.synthese));
  }

  // Structure organisationnelle
  children.push(
    H1(`${chap++}. Structure organisationnelle`, !opts.composed?.synthese),
    new Paragraph({
      spacing: { after: 160 },
      children: [new TextRun(`Unités organisationnelles configurées pour ${BUSINESS_CASE.name}.`)],
    }),
    table(
      ["Unité", "Valeurs", "Remarque"],
      BUSINESS_CASE.orgUnits.map((u) => ({ cells: [u.type, u.values, u.note || "—"] })),
    ),
  );

  // Chapitres par bloc
  const progress: Progress = { done: 0, total: countCaptures(steps, capturesByStep), report: opts.onProgress };
  opts.onProgress?.(0, progress.total);
  for (const g of groups) {
    children.push(H1(`${chap++}. ${g.bloc.replace(/^\d+\s*·\s*/, "")}`));
    const intro = introFor(opts.composed, g.bloc);
    if (intro) children.push(...introBox(intro));
    for (const s of g.steps) {
      children.push(...(await stepBlocks(s, capturesByStep.get(s.id) ?? [], { signed: true, nameOf: opts.nameOf }, progress)));
    }
  }

  // Annexes
  children.push(H1("Annexes"));
  const problems = steps.filter((s) => s.remarque.trim());
  children.push(H2("A. Problèmes rencontrés et solutions"));
  if (problems.length) {
    problems.forEach((s) =>
      children.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: `${s.num ? s.num + " · " : ""}${s.titre || "(sans titre)"}${s.tcode ? ` (${s.tcode})` : ""} : `, bold: true }),
            ...multiline(s.remarque, { color: "FF3B30" }),
          ],
        }),
      ),
    );
  } else {
    children.push(new Paragraph({ children: [new TextRun({ text: "Aucun problème signalé.", color: GREY })] }));
  }

  if (opts.composed) {
    children.push(H2("B. Points à vérifier avant la remise"));
    if (opts.composed.aVerifier.length) {
      opts.composed.aVerifier.forEach((p) =>
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [new TextRun({ text: p.num ? `${p.num} : ` : "", bold: true }), new TextRun(p.point)],
          }),
        ),
      );
    } else {
      children.push(new Paragraph({ children: [new TextRun({ text: "Aucune incohérence relevée.", color: GREY })] }));
    }
  }

  children.push(H2(`${opts.composed ? "C" : "B"}. Avancement et contributions`), blocTable(summary));
  children.push(new Paragraph({ spacing: { before: 200 }, children: [] }), memberTable(summary));
  if (opts.onlyDone) {
    const excluded = allSteps.filter((s) => s.statut !== "fait");
    if (excluded.length) {
      children.push(
        new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "Étapes non incluses (pas encore faites) :", bold: true })] }),
      );
      excluded.forEach((s) =>
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            children: [
              new TextRun(`${s.num ? s.num + " · " : ""}${s.titre || "(sans titre)"}`),
              new TextRun({ text: `  ${STATUT_LABEL[s.statut]}`, bold: true, color: STATUT_COLOR[s.statut] }),
              new TextRun({ text: s.resp ? ` · ${s.resp}` : "", color: GREY }),
            ],
          }),
        ),
      );
    }
  }

  return makeDoc(title, children);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
