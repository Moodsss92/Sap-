export const MEMBERS = ["Moad", "Armel", "Mazen", "Thomas"] as const;
export type MemberName = (typeof MEMBERS)[number];

export const STATUTS = ["afaire", "encours", "fait", "probleme"] as const;
export type Statut = (typeof STATUTS)[number];

export const STATUT_LABEL: Record<Statut, string> = {
  afaire: "To do",
  encours: "In progress",
  fait: "Done",
  probleme: "Issue",
};

export interface Member {
  id: string;
  name: MemberName;
  created_at: string;
}

/** Bloc créé par l'équipe : « Block 1 · nom ». */
export interface Block {
  id: string;
  num: number;
  name: string;
  created_by: string | null;
  created_at: string;
}

export function blockLabel(b: Pick<Block, "num" | "name">): string {
  return `${b.num} · ${b.name}`;
}

export interface Step {
  id: string;
  block_id: string | null;
  num: string;
  bloc: string;
  titre: string;
  tcode: string;
  chemin: string;
  action: string;
  valeurs: string;
  controle: string;
  remarque: string;
  resp: string;
  statut: Statut;
  author_id: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Champs éditables d'une étape (formulaire). */
export type StepFields = Pick<
  Step,
  "block_id" | "num" | "bloc" | "titre" | "tcode" | "chemin" | "action" | "valeurs" | "controle" | "remarque" | "resp" | "statut"
>;

export interface Capture {
  id: string;
  step_id: string;
  path: string;
  legende: string;
  position: number;
  created_at?: string;
}

/** Capture dans le formulaire : déjà enregistrée (id) ou fraîchement envoyée. */
export interface DraftCapture {
  key: string;
  id?: string;
  path: string;
  legende: string;
}

/** Réponse de /api/analyze. */
export interface AnalyzeResult {
  tcode: string;
  titre: string;
  chemin: string;
  action: string;
  valeurs: string;
  controle: string;
  bloc: string;
}

export const EMPTY_FIELDS: StepFields = {
  block_id: null,
  num: "",
  bloc: "",
  titre: "",
  tcode: "",
  chemin: "",
  action: "",
  valeurs: "",
  controle: "",
  remarque: "",
  resp: "",
  statut: "afaire",
};

/** Texte de liaison rédigé par Claude pour la documentation finale (/api/compose). */
export interface ComposedDoc {
  synthese: string;
  blocs: { bloc: string; intro: string }[];
  aVerifier: { num: string; point: string }[];
}
