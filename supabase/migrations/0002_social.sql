-- Taro · red de amigos, feed, comentarios, reacciones y privacidad
-- Ejecutar después de 0001_init.sql.

-- 1) Datos sensibles del perfil (nacimiento, personas, patrones) pasan a la tabla privada.
alter table public.private_notes add column if not exists meta jsonb not null default '{}'::jsonb;
insert into public.private_notes (user_id, meta)
select id, coalesce(meta, '{}'::jsonb) from public.profiles
on conflict (user_id) do update set meta = public.private_notes.meta || excluded.meta;
update public.profiles set meta = '{}'::jsonb;

-- 2) Amistades
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester uuid not null references public.profiles(id) on delete cascade,
  addressee uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester <> addressee)
);
create unique index if not exists friendships_pair on public.friendships (least(requester, addressee), greatest(requester, addressee));

create or replace function public.are_friends(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from friendships f where f.status = 'accepted'
    and ((f.requester = a and f.addressee = b) or (f.requester = b and f.addressee = a)));
$$;

-- Quien compartía círculo pasa a ser amigo.
insert into public.friendships (requester, addressee, status)
select a.id, b.id, 'accepted' from public.profiles a join public.profiles b
  on a.circle_id = b.circle_id and a.id < b.id where a.circle_id is not null
on conflict do nothing;

-- 3) Privacidad por tirada
alter table public.readings add column if not exists visibility text not null default 'friends' check (visibility in ('friends', 'private'));

-- Nota privada: si el dueño la oculta, vive aquí y solo él la lee.
create table if not exists public.reading_private (
  reading_id uuid primary key references public.readings(id) on delete cascade,
  note text not null default ''
);

-- 4) Comentarios y reacciones
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  reading_id uuid not null references public.readings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists comments_reading on public.comments (reading_id, created_at);

create table if not exists public.reactions (
  reading_id uuid not null references public.readings(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('✨', '🔮', '💜', '🌙', '😮', '🙏')),
  created_at timestamptz not null default now(),
  primary key (reading_id, user_id, emoji)
);

-- 5) Funciones para buscar y agregar amigos sin exponer perfiles completos
create or replace function public.search_profiles(q text)
returns table (id uuid, handle text, display_name text, accent text, sun text, moon text, asc_sign text, relation text)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, p.display_name, p.accent,
    (select x->>1 from jsonb_array_elements(coalesce(p.natal, '[]'::jsonb)) x where x->>0 = 'Sol' limit 1),
    (select x->>1 from jsonb_array_elements(coalesce(p.natal, '[]'::jsonb)) x where x->>0 = 'Luna' limit 1),
    (select x->>1 from jsonb_array_elements(coalesce(p.natal, '[]'::jsonb)) x where x->>0 = 'Ascendente' limit 1),
    coalesce((select case when f.status = 'accepted' then 'friend' when f.requester = auth.uid() then 'sent' else 'received' end
      from friendships f where (f.requester = p.id and f.addressee = auth.uid()) or (f.addressee = p.id and f.requester = auth.uid()) limit 1), 'none')
  from profiles p
  where auth.uid() is not null and p.id <> auth.uid()
    and (p.handle ilike replace(replace(lower(trim(q)), '%', ''), '_', '\_') || '%' or p.display_name ilike '%' || replace(trim(q), '%', '') || '%')
    and char_length(trim(q)) >= 2
  order by (p.handle = lower(trim(q))) desc, p.display_name
  limit 12;
$$;

create or replace function public.request_friend(target uuid) returns text
language plpgsql security definer set search_path = public as $$
declare f friendships;
begin
  if auth.uid() is null or target = auth.uid() then raise exception 'no válido'; end if;
  select * into f from friendships where (requester = auth.uid() and addressee = target) or (requester = target and addressee = auth.uid());
  if found then
    if f.status = 'pending' and f.addressee = auth.uid() then update friendships set status = 'accepted' where id = f.id; return 'accepted'; end if;
    return f.status;
  end if;
  insert into friendships (requester, addressee) values (auth.uid(), target);
  return 'pending';
end $$;

-- 6) Seguridad
alter table public.friendships enable row level security;
alter table public.reading_private enable row level security;
alter table public.comments enable row level security;
alter table public.reactions enable row level security;

drop policy if exists "mis amistades" on public.friendships;
create policy "mis amistades" on public.friendships for select to authenticated using (auth.uid() in (requester, addressee));
drop policy if exists "aceptar solicitud" on public.friendships;
create policy "aceptar solicitud" on public.friendships for update to authenticated using (addressee = auth.uid()) with check (addressee = auth.uid() and status = 'accepted');
drop policy if exists "quitar amistad" on public.friendships;
create policy "quitar amistad" on public.friendships for delete to authenticated using (auth.uid() in (requester, addressee));

-- Perfiles: el mío, mis amigos y quien tiene una solicitud conmigo.
drop policy if exists "ver perfiles del círculo" on public.profiles;
drop policy if exists "ver perfiles de amigos" on public.profiles;
create policy "ver perfiles de amigos" on public.profiles for select to authenticated using (
  id = auth.uid() or public.are_friends(id, auth.uid())
  or exists (select 1 from public.friendships f where (f.requester = id and f.addressee = auth.uid()) or (f.addressee = id and f.requester = auth.uid()))
);

-- Tiradas: las mías, y las de mis amigos que no sean privadas.
drop policy if exists "ver tiradas del círculo" on public.readings;
drop policy if exists "ver tiradas de amigos" on public.readings;
create policy "ver tiradas de amigos" on public.readings for select to authenticated using (
  user_id = auth.uid() or (visibility = 'friends' and public.are_friends(user_id, auth.uid()))
);

drop policy if exists "mi nota privada" on public.reading_private;
create policy "mi nota privada" on public.reading_private for all to authenticated
  using (exists (select 1 from public.readings r where r.id = reading_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.readings r where r.id = reading_id and r.user_id = auth.uid()));

drop policy if exists "ver comentarios" on public.comments;
create policy "ver comentarios" on public.comments for select to authenticated using (exists (select 1 from public.readings r where r.id = reading_id));
drop policy if exists "comentar" on public.comments;
create policy "comentar" on public.comments for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.readings r where r.id = reading_id));
drop policy if exists "borrar comentario" on public.comments;
create policy "borrar comentario" on public.comments for delete to authenticated using (
  user_id = auth.uid() or exists (select 1 from public.readings r where r.id = reading_id and r.user_id = auth.uid())
);

drop policy if exists "ver reacciones" on public.reactions;
create policy "ver reacciones" on public.reactions for select to authenticated using (exists (select 1 from public.readings r where r.id = reading_id));
drop policy if exists "reaccionar" on public.reactions;
create policy "reaccionar" on public.reactions for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.readings r where r.id = reading_id));
drop policy if exists "quitar reacción" on public.reactions;
create policy "quitar reacción" on public.reactions for delete to authenticated using (user_id = auth.uid());

do $$ begin alter publication supabase_realtime add table public.comments; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.reactions; exception when others then null; end $$;
do $$ begin alter publication supabase_realtime add table public.friendships; exception when others then null; end $$;
