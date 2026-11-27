-- =====================================================================
-- Planning (plan_tasks) et registre Master data (master_data)
-- =====================================================================

-- ---------------------------------------------------------------------
-- plan_tasks : le plan à suivre, avec son avancement (vide au départ)
-- ---------------------------------------------------------------------
create table if not exists public.plan_tasks (
  id         uuid primary key default gen_random_uuid(),
  phase      text not null default '',
  ordre      int  not null default 0,
  titre      text not null default '',
  detail     text not null default '',
  kind       text not null default 'config' check (kind in ('config', 'controle', 'flow', 'final')),
  statut     text not null default 'afaire' check (statut in ('afaire', 'encours', 'fait')),
  resp       text not null default '',
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists plan_tasks_phase_idx on public.plan_tasks (phase, ordre);

-- ---------------------------------------------------------------------
-- master_data : tout ce qu'on crée ou copie dans SAP, avec les noms exacts
-- ---------------------------------------------------------------------
create table if not exists public.master_data (
  id         uuid primary key default gen_random_uuid(),
  type       text not null default 'Autre',
  cle        text not null default '',
  nom        text not null default '',
  ref        text not null default '',
  lien       text not null default '',
  tcode      text not null default '',
  resp       text not null default '',
  etat       text not null default 'cree' check (etat in ('cree', 'prevu')),
  remarque   text not null default '',
  step_id    uuid references public.steps (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  updated_at timestamptz not null default now()
);
create index if not exists master_data_step_idx on public.master_data (step_id);

-- Pas deux fois la même clé pour un même type (insensible à la casse) ;
-- les clés vides (« à définir ») ne sont pas concernées.
create unique index if not exists master_data_type_cle_uniq
  on public.master_data (type, upper(cle))
  where cle <> '';

-- ---------------------------------------------------------------------
-- updated_at / updated_by automatiques
-- ---------------------------------------------------------------------
create or replace function public.touch_row()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists plan_tasks_touch on public.plan_tasks;
create trigger plan_tasks_touch
  before insert or update on public.plan_tasks
  for each row execute function public.touch_row();

drop trigger if exists master_data_touch on public.master_data;
create trigger master_data_touch
  before insert or update on public.master_data
  for each row execute function public.touch_row();

-- ---------------------------------------------------------------------
-- RLS : mêmes règles que steps (tout membre de l'équipe lit et écrit)
-- ---------------------------------------------------------------------
alter table public.plan_tasks  enable row level security;
alter table public.master_data enable row level security;

drop policy if exists plan_tasks_all on public.plan_tasks;
create policy plan_tasks_all on public.plan_tasks
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

drop policy if exists master_data_all on public.master_data;
create policy master_data_all on public.master_data
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter table public.plan_tasks  replica identity full;
alter table public.master_data replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.plan_tasks;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.master_data;
  exception when duplicate_object then null;
  end;
end $$;
