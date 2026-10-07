-- =========================================================
-- VENJY · Mundo 3D online · esquema de Supabase
-- Pegar completo en el SQL Editor (o aplicar como migracion).
-- Es idempotente: se puede ejecutar mas de una vez.
-- Solo se guardan salas y cambios de bloques. Jugadores, posiciones y
-- combate viajan por Realtime (Presence + Broadcast) y no tocan la base.
-- =========================================================

-- Salas ---------------------------------------------------
create table if not exists public.salas (
    codigo      text primary key check (codigo ~ '^[A-Z0-9]{3,12}$'),
    modo        text not null default 'libre' check (modo in ('libre', 'skywars')),
    ronda       integer not null default 0 check (ronda between 0 and 100000),
    creada      timestamptz not null default now(),
    actualizada timestamptz not null default now()
);

-- Cambios de bloques: una fila por posicion, gana el ultimo -
create table if not exists public.cambios_bloques (
    sala        text not null references public.salas(codigo) on delete cascade,
    mundo       text not null default 'libre' check (mundo in ('libre', 'arena')),
    x           integer not null check (x between -64 and 4200),
    y           integer not null check (y between 0 and 255),
    z           integer not null check (z between -64 and 4200),
    bloque      smallint not null check (bloque between 0 and 63), -- 0 = aire (bloque roto)
    actualizado timestamptz not null default now(),
    primary key (sala, mundo, x, y, z)
);
create index if not exists cambios_bloques_sala_idx on public.cambios_bloques (sala, mundo);

-- Seguridad: solo lo que el juego necesita -----------------
alter table public.salas enable row level security;
alter table public.cambios_bloques enable row level security;

drop policy if exists salas_leer on public.salas;
drop policy if exists salas_crear on public.salas;
drop policy if exists salas_actualizar on public.salas;
create policy salas_leer on public.salas for select to anon using (true);
create policy salas_crear on public.salas for insert to anon with check (true);
create policy salas_actualizar on public.salas for update to anon using (true) with check (true);

drop policy if exists cambios_leer on public.cambios_bloques;
drop policy if exists cambios_crear on public.cambios_bloques;
drop policy if exists cambios_actualizar on public.cambios_bloques;
create policy cambios_leer on public.cambios_bloques for select to anon using (true);
create policy cambios_crear on public.cambios_bloques for insert to anon with check (true);
create policy cambios_actualizar on public.cambios_bloques for update to anon using (true) with check (true);
-- Sin politica de DELETE: anon no puede borrar filas directamente.

-- Reinicio de una sala (nueva ronda o limpiar edicion): unica via de borrado
create or replace function public.reiniciar_sala(p_codigo text, p_mundo text)
returns void
language sql
security definer
set search_path = public
as $$
    delete from public.cambios_bloques where sala = p_codigo and mundo = p_mundo;
    update public.salas set actualizada = now() where codigo = p_codigo;
$$;
revoke all on function public.reiniciar_sala(text, text) from public;
grant execute on function public.reiniciar_sala(text, text) to anon;

-- Limpieza de salas abandonadas (llamar a mano o con pg_cron si se quiere)
create or replace function public.limpiar_salas_viejas()
returns integer
language sql
security definer
set search_path = public
as $$
    with borradas as (
        delete from public.salas where actualizada < now() - interval '7 days' returning 1
    ) select count(*)::integer from borradas;
$$;
revoke all on function public.limpiar_salas_viejas() from public, anon, authenticated;
