-- À coller dans Supabase → SQL Editor → New query → Run (une seule fois)

-- 1. Table des extraits
create table if not exists public.extraits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  author      text default '',
  title       text default '',
  page        text default '',
  read_date   date,
  tags        text[] not null default '{}',
  note        text default '',
  ocr_text    text default '',
  image_path  text not null,
  thumb_path  text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists extraits_user_idx on public.extraits (user_id, created_at desc);

-- 2. Sécurité : chaque utilisateur ne voit et ne modifie que ses propres extraits
alter table public.extraits enable row level security;

drop policy if exists "extraits_proprietaire" on public.extraits;
create policy "extraits_proprietaire" on public.extraits
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 3. Espace de stockage privé pour les photos
insert into storage.buckets (id, name, public)
values ('extraits', 'extraits', false)
on conflict (id) do nothing;

-- Chaque utilisateur n'accède qu'au dossier portant son identifiant
drop policy if exists "photos_lecture" on storage.objects;
create policy "photos_lecture" on storage.objects for select to authenticated
  using (bucket_id = 'extraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_ajout" on storage.objects;
create policy "photos_ajout" on storage.objects for insert to authenticated
  with check (bucket_id = 'extraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_modif" on storage.objects;
create policy "photos_modif" on storage.objects for update to authenticated
  using (bucket_id = 'extraits' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "photos_suppression" on storage.objects;
create policy "photos_suppression" on storage.objects for delete to authenticated
  using (bucket_id = 'extraits' and (storage.foldername(name))[1] = auth.uid()::text);
