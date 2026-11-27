/** Registre Master data : tout ce qu'on crée ou copie dans SAP, avec les noms exacts. */

export const MD_ETATS = ["cree", "prevu"] as const;
export type MdEtat = (typeof MD_ETATS)[number];
export const MD_ETAT_LABEL: Record<MdEtat, string> = { cree: "Created", prevu: "Planned" };

/**
 * Types, dans l'ordre d'affichage. `value` est la valeur stockée en base
 * (celle du seed), `label` le libellé affiché.
 */
export const MD_TYPE_GROUPS: { group: string; types: { value: string; label: string }[] }[] = [
  {
    group: "Organizational structure",
    types: [
      "Company code", "Plant", "Storage location", "Purchasing org", "Purchasing group", "Sales org",
      "Distribution channel", "Division", "Sales area", "Shipping point", "Controlling area", "Profit center",
    ].map((v) => ({ value: v, label: v })),
  },
  { group: "Settings", types: ["Number range", "BP grouping"].map((v) => ({ value: v, label: v })) },
  {
    group: "Master data",
    types: [
      { value: "Business partner fournisseur", label: "Business partner (vendor)" },
      { value: "Business partner client", label: "Business partner (customer)" },
      { value: "Material", label: "Material" },
      { value: "BOM", label: "BOM" },
      { value: "Production version", label: "Production version" },
    ],
  },
  {
    group: "Purchasing",
    types: [
      { value: "Info record", label: "Info record" },
      { value: "Contrat", label: "Contract" },
      { value: "Scheduling agreement", label: "Scheduling agreement" },
      { value: "Source list", label: "Source list" },
    ],
  },
  {
    group: "Pricing and SD",
    types: [
      { value: "Condition / prix", label: "Condition / price" },
      { value: "Pricing procedure", label: "Pricing procedure" },
      { value: "Condition type", label: "Condition type" },
      { value: "Document type", label: "Document type" },
      { value: "Item category", label: "Item category" },
    ],
  },
  { group: "Other", types: [{ value: "Autre", label: "Other" }] },
];

export const MD_TYPES = MD_TYPE_GROUPS.flatMap((g) => g.types);
export const MD_TYPE_ORDER = new Map(MD_TYPES.map((t, i) => [t.value, i]));

export function mdTypeLabel(value: string): string {
  return MD_TYPES.find((t) => t.value === value)?.label ?? value;
}

export interface MasterData {
  id: string;
  type: string;
  cle: string;
  nom: string;
  ref: string;
  lien: string;
  tcode: string;
  resp: string;
  etat: MdEtat;
  remarque: string;
  step_id: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type MasterDataFields = Omit<MasterData, "id" | "updated_by" | "updated_at">;

export const EMPTY_MD: MasterDataFields = {
  type: "Company code",
  cle: "",
  nom: "",
  ref: "",
  lien: "",
  tcode: "",
  resp: "",
  etat: "cree",
  remarque: "",
  step_id: null,
};

/** Tri dans un type : les données créées d'abord, puis par clé (clés vides à la fin). */
export function compareMd(a: MasterData, b: MasterData): number {
  if (a.etat !== b.etat) return a.etat === "cree" ? -1 : 1;
  if (!a.cle !== !b.cle) return a.cle ? -1 : 1;
  return a.cle.localeCompare(b.cle, "en", { numeric: true }) || a.nom.localeCompare(b.nom);
}

/** Même type et même clé non vide (insensible à la casse) : doublon. */
export function findDuplicate(rows: MasterData[], f: Pick<MasterData, "type" | "cle">, excludeId?: string) {
  const cle = f.cle.trim().toUpperCase();
  if (!cle) return undefined;
  return rows.find((r) => r.id !== excludeId && r.type === f.type && r.cle.trim().toUpperCase() === cle);
}

export function mdToText(rows: MasterData[]): string {
  const out: string[] = ["SAP master data · Philo Televisions", ""];
  for (const t of MD_TYPES) {
    const list = rows.filter((r) => r.type === t.value).sort(compareMd);
    if (!list.length) continue;
    out.push(`## ${t.label}`);
    for (const r of list) {
      const parts = [
        `${r.cle || "(to be defined)"} · ${r.nom}`,
        r.ref && `copied from ${r.ref}`,
        r.lien && `linked to ${r.lien}`,
        r.tcode && r.tcode,
        MD_ETAT_LABEL[r.etat] + (r.resp ? ` by ${r.resp}` : ""),
      ].filter(Boolean);
      out.push(`- ${parts.join(" · ")}`);
      if (r.remarque) out.push(`  ${r.remarque}`);
    }
    out.push("");
  }
  return out.join("\n").trim() + "\n";
}
