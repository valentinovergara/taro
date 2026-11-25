-- Taro · esquema inicial
-- Ejecútalo una vez en Supabase: SQL Editor → New query → pega todo → Run.

create extension if not exists pgcrypto;

-- Círculos: grupo de personas que comparten tiradas (p. ej. Valentino y Diego).
create table if not exists public.circles (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Nuestro círculo',
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text not null unique check (handle ~ '^[a-z0-9-]{2,24}$'),
  display_name text not null,
  accent text not null default '#B58CE7',
  tags text[] not null default array['Energía general','Personal','Trabajo','Familia'],
  natal jsonb,
  meta jsonb not null default '{}'::jsonb,
  circle_id uuid references public.circles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  cards jsonb not null check (jsonb_typeof(cards) = 'array' and jsonb_array_length(cards) between 1 and 6),
  positions text[],
  tags text[] not null default '{}',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists readings_user_date on public.readings (user_id, date desc);

-- Contexto privado para las lecturas profundas: solo su dueño lo ve.
create table if not exists public.private_notes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  context text not null default '',
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists readings_touch on public.readings;
create trigger readings_touch before update on public.readings for each row execute function public.touch_updated_at();

-- ¿Comparte círculo conmigo?
create or replace function public.in_my_circle(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles me join profiles o on o.circle_id = me.circle_id
    where me.id = auth.uid() and o.id = other and me.circle_id is not null
  ) or other = auth.uid();
$$;

-- Crear círculo y unirse a él.
create or replace function public.create_circle(circle_name text default 'Nuestro círculo') returns public.circles
language plpgsql security definer set search_path = public as $$
declare c circles;
begin
  insert into circles(name, created_by) values (coalesce(nullif(circle_name, ''), 'Nuestro círculo'), auth.uid()) returning * into c;
  update profiles set circle_id = c.id where id = auth.uid();
  return c;
end $$;

create or replace function public.join_circle(code text) returns public.circles
language plpgsql security definer set search_path = public as $$
declare c circles;
begin
  select * into c from circles where invite_code = upper(trim(code));
  if not found then raise exception 'Código no válido'; end if;
  update profiles set circle_id = c.id where id = auth.uid();
  return c;
end $$;

alter table public.circles enable row level security;
alter table public.profiles enable row level security;
alter table public.readings enable row level security;
alter table public.private_notes enable row level security;

drop policy if exists "ver mi círculo" on public.circles;
create policy "ver mi círculo" on public.circles for select to authenticated
  using (id = (select circle_id from public.profiles where id = auth.uid()));

drop policy if exists "ver perfiles del círculo" on public.profiles;
create policy "ver perfiles del círculo" on public.profiles for select to authenticated using (public.in_my_circle(id));
drop policy if exists "crear mi perfil" on public.profiles;
create policy "crear mi perfil" on public.profiles for insert to authenticated with check (id = auth.uid() and circle_id is null);
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update to authenticated using (id = auth.uid())
  with check (id = auth.uid() and circle_id is not distinct from (select p.circle_id from public.profiles p where p.id = auth.uid()));

drop policy if exists "ver tiradas del círculo" on public.readings;
create policy "ver tiradas del círculo" on public.readings for select to authenticated using (public.in_my_circle(user_id));
drop policy if exists "crear mis tiradas" on public.readings;
create policy "crear mis tiradas" on public.readings for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "editar mis tiradas" on public.readings;
create policy "editar mis tiradas" on public.readings for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "borrar mis tiradas" on public.readings;
create policy "borrar mis tiradas" on public.readings for delete to authenticated using (user_id = auth.uid());

drop policy if exists "mi contexto" on public.private_notes;
create policy "mi contexto" on public.private_notes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Cambios en vivo para que la app se actualice sola.
do $$ begin
  alter publication supabase_realtime add table public.readings;
exception when others then null; end $$;
