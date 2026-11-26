-- Taro · arreglos de reglas de perfiles y avatar con personaje

-- La regla de edición se referenciaba a sí misma (recursión infinita al guardar el perfil).
drop policy if exists "editar mi perfil" on public.profiles;
create policy "editar mi perfil" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Ver perfiles: el mío, y cualquiera con quien tenga amistad o solicitud (columna calificada).
create or replace function public.has_friendship_with(other uuid) returns boolean
language sql stable security definer set search_path = public as $f$
  select exists (select 1 from friendships f where (f.requester = other and f.addressee = auth.uid()) or (f.addressee = other and f.requester = auth.uid()));
$f$;
drop policy if exists "ver perfiles de amigos" on public.profiles;
create policy "ver perfiles de amigos" on public.profiles for select to authenticated using (
  profiles.id = auth.uid() or public.has_friendship_with(profiles.id)
);

-- Avatar: personaje elegido (sun, moon, star, planet, comet, nebula).
alter table public.profiles add column if not exists avatar text check (avatar in ('sun', 'moon', 'star', 'planet', 'comet', 'nebula'));
