# SAP Log · Philo Televisions

Web app partagée par l'équipe (Moad, Armel, Mazen, Thomas) pour documenter chaque étape de la configuration S/4HANA MM/SD du business case **Philo Televisions** : company codes C2NL / C2BE (copiées de 1010), plants Breda, Delft, Brussels, Antwerp, purchasing orgs P2HQ / P2BR / P2BX / P2AN, sales orgs S2NL / S2BE.

L'interface est en **anglais**. Chaque étape tient en **4 champs** : titre, T-code, chemin (SPRO) et « What I did », plus les captures d'écran. Le T-code pré-remplit le titre et le chemin (dictionnaire local). L'étape est attribuée automatiquement à la personne qui la crée.

**Blocs** : l'équipe crée ses blocs (« + New block »), chacun avec un nom. Ils sont numérotés automatiquement dans l'ordre de création (Block 1, Block 2…). Chaque étape est rattachée à un bloc et numérotée dedans (1.1, 1.2…, puis 2.1…). La liste, les exports Word / ZIP / texte et la documentation finale suivent l'ordre des blocs. Un bloc se renomme à tout moment ; il ne se supprime que s'il est vide.

**Réorganiser** : dans l'onglet « Whole log », le bouton **Reorder** active le glisser-déposer : on attrape une étape par sa poignée ≡ (ou n'importe où sur la ligne à la souris) et on la lâche à n'importe quelle position, dans n'importe quel bloc ; une ligne bleue montre l'endroit. Les flèches ↑ ↓ déplacent d'une place (en haut ou en bas d'un bloc, l'étape passe dans le bloc voisin). Les étapes sans bloc se réorganisent aussi (1, 2, 3…). Les numéros sont recalculés et le nouvel ordre est partagé avec toute l'équipe. Le mode n'est disponible que sans recherche ni filtre de statut.

## Fonctionnalités

En haut de l'app, un segmented control passe d'une vue à l'autre : **Journal | Planning | Master data**. La vue active est dans l'URL (`?view=planning`, `?view=master-data`). Si le Journal a des modifications non enregistrées, l'alerte habituelle s'affiche avant de changer de vue.

### Planning (le plan à suivre) · vide au départ
- Carte d'en-tête : avancement global en %, barre de progression, « X done · Y in progress · Z to do, out of N tasks », filtres responsable et statut, **Go to next task** (fait défiler jusqu'à la première tâche non terminée et la surligne), **+ New phase**.
- Une carte par phase, triée par nom (« 01 · … », « 02 · … ») : statut calculé (Done / In progress / To do), x/y et mini barre, renommer, supprimer (avec confirmation).
- Chaque tâche : badge de type (Config gris, Check bleu, Flow test vert, Final test orange), titre et détail, statut en un clic (segmented control), responsable, **Edit** (titre, détail, type, phase, ordre, suppression). Une tâche Done est barrée.
- En bas de chaque phase : « Add a task to this phase… » (Entrée) avec le type ; la tâche est ajoutée en dernier, au nom de l'utilisateur.
- Flèches ↑ ↓ pour réordonner (sans filtre actif).
- Une phase existe en base à travers ses tâches : une phase toute neuve, sans tâche, est gardée dans le navigateur de la personne qui l'a créée jusqu'à sa première tâche.

### Master data (registre de ce qu'on crée ou copie dans SAP)
- Carte d'en-tête : **+ Add master data**, recherche, filtre All / Created / Planned, **Copy as text**, chips par type avec compteur (seulement les types qui ont des données).
- Une carte par type, dans l'ordre de la liste des types, avec un tableau : Key (vide = « to be defined »), Name / description (+ note), Copied from, Linked to, T-code, Created by, Status, Edit. Tri : créées d'abord, puis par clé.
- Fenêtre Ajouter / Modifier : **doublon refusé** (« Plant 2BRE already exists », même clé non vide pour le même type, insensible à la casse ; aussi garanti en base par un index unique partiel), **Mark as created** sur une donnée prévue (demande d'abord la clé ; « Created by » devient l'utilisateur), suppression avec confirmation.
- Lien avec le Journal : chaque fiche affiche ses master data liées et propose **Record created data** (pré-rempli avec le T-code de la fiche et l'utilisateur) ; depuis le registre, un clic sur « Journal: … » ouvre la fiche.

### Journal

- **Accès direct, sans e-mail ni mot de passe** : on ouvre le site et on choisit son nom (« Qui es-tu ? »). Chaque navigateur reçoit une session anonyme Supabase, gardée ensuite ; le nom se change avec « Changer ».
- **Un espace par personne** + « Tout le journal », dans un segmented control collé en haut.
- Liste des étapes avec la progression « x/y done », la recherche plein texte et un filtre par statut.
- **+ Nouvelle étape depuis une capture** : glisser-déposer de plusieurs images, sélection de fichiers ou Ctrl/⌘ + V. Claude remplit ensuite les champs vides.
- Auto-complétion du chemin et du titre à partir du T-code (`lib/tcodes.ts`), numérotation automatique.
- Fiche détaillée façon Réglages iOS : statut en un clic, lightbox, ajout de captures sans passer par « Modifier », Dupliquer, Copier, Supprimer.
- **Exports** (bouton « Exporter ») :
  - **Documentation finale (Word)** : le travail de chacun regroupé en un seul document cohérent. Claude relit tout le journal et rédige uniquement le texte de liaison : une synthèse, une introduction par bloc (ce qu'on configure, pourquoi, lien avec les autres blocs) et une liste de points à vérifier (incohérences entre fiches, contrôles manquants). Les fiches sont reproduites telles quelles. Le document contient une page de titre, un sommaire, la structure organisationnelle, un chapitre par bloc et des annexes (problèmes rencontrés et solutions, points à vérifier, avancement et contributions). Option « Seulement les étapes faites ». Si Claude est indisponible, l'export se fait quand même, sans le texte de liaison.
  - **Dossier complet de l'équipe (Word)** : les fiches de tout le monde, quel que soit l'onglet ouvert, rassemblées dans l'ordre du business case. La première page fait la synthèse : avancement par bloc avec ses contributeurs, contribution de chacun, et « pièces manquantes » (blocs sans étape, étapes pas encore faites). Chaque fiche indique son statut, son responsable, qui l'a rédigée et qui l'a complétée. Les captures sont intégrées (largeur max. 600 px) avec leur légende.
  - **Captures de l'équipe (ZIP)** : un dossier par bloc (`01 - Company codes et FI/`), un sous-dossier par étape (`1.4 - OBY6 - Paramètres globaux/`), avec les captures numérotées et légendées et un `fiche.txt`. Un `00 - LISEZMOI.txt` résume l'assemblage et contient le journal complet.
  - **Vue actuelle en Word** et **copie en texte** : seulement l'onglet et les filtres en cours.
- Synchronisation **temps réel** (Supabase Realtime) et mode sombre automatique.
- **Pensée pour PC** : liste et fiche toujours côte à côte (largeur minimale 1100 px, jusqu'à 1600 px), texte compact, fenêtres de dialogue centrées.

## Structure

```
.
├── app/
│   ├── layout.tsx, globals.css      Thème iOS (variables clair / sombre)
│   ├── page.tsx                     Application (client)
│   ├── api/analyze/route.ts         Lecture des captures par Claude (serveur uniquement)
│   └── api/compose/route.ts         Texte de liaison de la documentation finale (serveur uniquement)
├── components/
│   ├── JournalApp.tsx               Orchestration : onglets, split view, collage, exports
│   ├── StepList.tsx, StepDetail.tsx, StepForm.tsx
│   ├── NewFromCaptureButton.tsx, AddCapturesZone.tsx, Lightbox.tsx, CaptureImage.tsx
│   ├── PersonTabs.tsx, WhoAreYouSheet.tsx, HelpBanner.tsx, ExportSheet.tsx
│   ├── planning/                    PlanningView, PhaseCard, TaskRow, TaskModal, PhaseNameModal
│   ├── masterdata/                  MasterDataView, MdTable, MdModal
│   └── ui/                          SegmentedControl, BottomSheet, Alert, Toast, Badges/Icônes
├── hooks/                           useSession, useMembers, useJournal, usePlanTasks, useMasterData (Realtime), useSignedUrl, useImageDrop
├── lib/
│   ├── types.ts                     Types partagés
│   ├── tcodes.ts                    Dictionnaire T-code → [chemin, titre]
│   ├── blocs.ts, numbering.ts       Blocs proposés, numérotation automatique
│   ├── storage.ts, images.ts        Upload, URLs signées, compression des captures
│   ├── exportDocx.ts, exportZip.ts, exportText.ts
│   ├── planning.ts, masterData.ts   Types, libellés, tri, doublons
│   ├── businessCase.ts              Structure organisationnelle Philo Televisions
│   ├── teamSummary.ts               Assemblage : avancement par bloc, par membre, pièces manquantes
│   └── supabase/                    Clients navigateur et serveur
├── middleware.ts                    Rafraîchit la session et protège les pages
└── supabase/
    ├── migrations/0001_init.sql     Tables, RLS, bucket « captures », Realtime
    ├── migrations/0002_blocks.sql   Blocs créés par l'équipe (numérotation automatique)
    ├── migrations/0003_planning_master_data.sql  Tables plan_tasks et master_data, RLS, Realtime, index unique partiel
    ├── seed_master_data.sql         Registre Master data pré-rempli (40 objets) ; aucun seed pour le planning
    └── seed.sql                     Étapes 1.1 à 1.7 (facultatif)
```

## Installation

### 1. Dépendances

```bash
npm i
```

### 2. Projet Supabase

1. Crée un projet sur [supabase.com](https://supabase.com).
2. Dans **SQL Editor**, exécute dans l'ordre `supabase/migrations/0001_init.sql`, `0002_blocks.sql` et `0003_planning_master_data.sql`, puis `supabase/seed_master_data.sql` (une seule fois). Ce script crée :
   - les tables `members`, `steps` et `captures` ;
   - les policies RLS : tout membre connecté peut tout lire et tout modifier ;
   - le bucket **privé** `captures` et ses policies ;
   - la publication Realtime sur `steps`, `captures` et `members`.

   Avec la CLI Supabase, tu peux aussi lancer `supabase db push`.
3. Facultatif : exécute `supabase/seed.sql` pour créer les étapes 1.1 à 1.7 (responsable : Moad).
4. Vérifie que le bucket `captures` existe et qu'il est **privé** (Storage › Buckets). Le script le crée ; sinon, crée-le à la main avec le nom `captures`, sans cocher « Public ».
5. Dans **Authentication › Sign In / Providers**, active **Allow anonymous sign-ins** : c'est ce qui permet d'entrer sans e-mail. Sans ce réglage, l'app affiche un écran qui l'explique.

   ⚠️ Toute personne qui a le lien du site peut entrer et modifier le journal. Ne le partage qu'avec l'équipe.

### 3. Variables d'environnement

Le projet Supabase de l'équipe (`sap`, région Paris) est déjà inscrit dans `lib/env.ts`. Son URL et sa clé `anon` sont publiques par conception : la sécurité repose sur les règles RLS de la base. **Aucune variable Supabase n'est donc nécessaire.**

| Variable | Rôle | Obligatoire ? |
|---|---|---|
| `ANTHROPIC_API_KEY` | lecture des captures et documentation finale par Claude (serveur uniquement) | oui, pour les fonctions Claude |
| `ANTHROPIC_MODEL` | modèle utilisé, par défaut `claude-sonnet-5-5` | non |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pointer vers un autre projet Supabase | non |

```bash
cp .env.example .env.local
```

La clé Anthropic n'est utilisée que dans les routes `app/api/*`. Celles-ci vérifient d'abord que l'appelant est connecté et membre de l'équipe ; elles lisent les données avec la session de l'utilisateur, donc sous les règles RLS.

## Lancer en local

```bash
npm run dev
```

Ouvre http://localhost:3000 et choisis ton nom.

Autres commandes : `npm run build` (build de production), `npm run lint`, `npm run typecheck`.

## Déploiement sur Vercel

1. Importe le dépôt `Moodsss92/Sap-` dans Vercel (**Add New › Project**). Vercel détecte Next.js, rien d'autre à régler.
2. Ajoute `ANTHROPIC_API_KEY` dans **Settings › Environment Variables** (Production et Preview), puis redéploie.

Production actuelle : https://sap-flame.vercel.app

`/api/analyze` déclare `maxDuration = 60` s : la lecture de 5 captures prend en général 10 à 30 s. `/api/compose` déclare `maxDuration = 120` s pour relire tout le journal, ce que le plan gratuit de Vercel accepte quand Fluid Compute est activé (réglage par défaut des nouveaux projets).

## Lecture des captures par Claude

> **Désactivé dans l'interface** : l'équipe n'utilise pas de clé Anthropic. Les routes `app/api/analyze` et `app/api/compose` restent dans le code ; pour les réactiver, il faut ajouter `ANTHROPIC_API_KEY` dans Vercel et remettre les appels côté client (voir l'historique Git). La documentation finale s'exporte sans texte rédigé par Claude.

- Au maximum **5 images** sont envoyées par analyse. Le serveur les télécharge depuis le Storage privé, avec la session de l'utilisateur,, puis appelle l'API Anthropic avec le prompt du business case et le dictionnaire `lib/tcodes.ts`.
- La réponse JSON est validée avec **zod**. Si le JSON est invalide, le client reçoit une erreur claire.
- Seuls les **champs vides** sont remplis. Ils portent le hint « proposé, à vérifier ».
- Le bouton **Arrêter** annule la requête. **Remplir depuis les captures** relance l'analyse sur une fiche existante.
- Les captures de plus de 3,5 Mo sont réduites dans le navigateur avant l'envoi, à cause de la limite de 5 Mo par image de l'API.
- En cas de refus du modèle principal, la requête active le repli serveur (`fallbacks: "default"`) vers un autre modèle.

## Raccourcis clavier

| Raccourci | Action |
|---|---|
| Ctrl/⌘ + V | Colle une capture : nouvelle étape ; ajout au formulaire s'il est ouvert ; ajout à la fiche si la zone « Ajouter d'autres captures » est survolée ou sélectionnée |
| ↑ / ↓ | Étape précédente / suivante |
| ← / → | Capture précédente / suivante dans la lightbox |
| Ctrl/⌘ + S | Enregistrer le formulaire |
| Échap | Annuler, ou fermer la lightbox ou l'alerte |
