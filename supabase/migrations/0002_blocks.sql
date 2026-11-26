-- =====================================================================
-- Blocs créés par l'équipe : « Block 1 · nom », « Block 2 · nom »…
-- Le numéro est attribué automatiquement dans l'ordre de création.
-- =====================================================================

create table if not exists public.blocks (
  id         uuid primary key default gen_random_uuid(),
  num        int  not null unique,
  name       text not null check (length(trim(name)) > 0),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);

-- Numéro suivant automatique (1, 2, 3…)
create or replace function public.blocks_next_num()
returns trigger
language plpgsql
as $$
begin
  if new.num is null then
    perform pg_advisory_xact_lock(hashtext('public.blocks.num'));
    select coalesce(max(num), 0) + 1 into new.num from public.blocks;
  end if;
  return new;
end;
$$;

drop trigger if exists blocks_num on public.blocks;
create trigger blocks_num
  before insert on public.blocks
  for each row execute function public.blocks_next_num();

-- Chaque étape appartient (au plus) à un bloc
alter table public.steps
  add column if not exists block_id uuid references public.blocks (id) on delete restrict;
create index if not exists steps_block_idx on public.steps (block_id);

-- RLS : tout membre de l'équipe lit, crée, renomme et supprime les blocs
alter table public.blocks enable row level security;
drop policy if exists blocks_all on public.blocks;
create policy blocks_all on public.blocks
  for all to authenticated
  using (public.is_member())
  with check (public.is_member());

-- Realtime
alter table public.blocks replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.blocks;
  exception when duplicate_object then null;
  end;
end $$;
