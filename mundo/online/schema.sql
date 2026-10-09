-- =========================================================
-- VENJY · Mundo 3D online · esquema de Supabase
-- Pegar completo en el SQL Editor (o aplicar como migracion).
-- Es idempotente: se puede ejecutar mas de una vez.
-- Solo se guardan salas y cambios de bloques (y, para la supervivencia cooperativa, la foto
-- del mundo en salas_coop). Jugadores, posiciones y combate viajan por Realtime (Presence +
-- Broadcast) y no tocan la base. Desde el paso 1 de seguridad (más abajo) el cliente usa funciones.
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

-- =========================================================
-- Paso 1 de seguridad (aplicado el 2026-10-09): el juego entra por funciones
-- =========================================================
create or replace function public.entrar_sala(p_codigo text, p_modo text default 'libre')
returns table(modo text, ronda integer)
language sql security definer set search_path = public
as $$
    insert into public.salas (codigo, modo) values (p_codigo, p_modo) on conflict (codigo) do nothing;
    select s.modo, s.ronda from public.salas s where s.codigo = p_codigo;
$$;

create or replace function public.leer_cambios(p_codigo text, p_mundo text, p_desde integer default 0)
returns table(x integer, y integer, z integer, bloque smallint)
language sql stable security definer set search_path = public
as $$
    select c.x, c.y, c.z, c.bloque from public.cambios_bloques c
    where c.sala = p_codigo and c.mundo = p_mundo
    order by c.x, c.z, c.y
    offset greatest(0, p_desde) limit 1000;
$$;

-- p_filas: [[mundo, x, y, z, bloque], ...] (hasta 500 por llamada; tope de 60000 filas por sala)
create or replace function public.guardar_cambios(p_codigo text, p_filas jsonb)
returns void
language plpgsql security definer set search_path = public
as $$
declare n integer;
begin
    if jsonb_typeof(p_filas) <> 'array' or jsonb_array_length(p_filas) > 500 then raise exception 'lote invalido'; end if;
    if not exists (select 1 from public.salas where codigo = p_codigo) then raise exception 'sala inexistente'; end if;
    select count(*) into n from public.cambios_bloques where sala = p_codigo;
    if n >= 60000 then raise exception 'la sala llego al tope de cambios'; end if;
    insert into public.cambios_bloques (sala, mundo, x, y, z, bloque)
    select p_codigo, f->>0, (f->>1)::integer, (f->>2)::integer, (f->>3)::integer, (f->>4)::smallint
    from jsonb_array_elements(p_filas) f
    on conflict (sala, mundo, x, y, z) do update set bloque = excluded.bloque, actualizado = now();
    update public.salas set actualizada = now() where codigo = p_codigo;
end;
$$;

create or replace function public.guardar_ronda(p_codigo text, p_ronda integer, p_modo text)
returns void
language sql security definer set search_path = public
as $$
    update public.salas set ronda = p_ronda, modo = p_modo, actualizada = now() where codigo = p_codigo;
$$;

-- Supervivencia cooperativa: una fila por sala con el hash de la clave del anfitrión y la
-- foto del mundo (JSON con gzip en base64) que baja quien entra. Sin políticas: solo funciones.
create table if not exists public.salas_coop (
    codigo      text primary key check (codigo ~ '^[A-Z0-9]{4,12}$'),
    clave_hash  text not null,
    foto        text check (foto is null or length(foto) <= 8000000),
    creada      timestamptz not null default now(),
    actualizada timestamptz not null default now()
);
alter table public.salas_coop enable row level security;
revoke all on public.salas_coop from anon, authenticated;

-- Crea la sala (o la retoma con la misma clave, o reusa un código abandonado hace más de un día)
create or replace function public.crear_sala_coop(p_codigo text, p_clave text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
declare h text;
begin
    if p_codigo !~ '^[A-Z0-9]{4,12}$' or length(coalesce(p_clave, '')) not between 16 and 64 then return false; end if;
    h := encode(extensions.digest(p_clave, 'sha256'), 'hex');
    insert into public.salas_coop (codigo, clave_hash) values (p_codigo, h)
    on conflict (codigo) do update set clave_hash = excluded.clave_hash, foto = null, actualizada = now()
        where public.salas_coop.clave_hash = excluded.clave_hash or public.salas_coop.actualizada < now() - interval '1 day';
    return exists (select 1 from public.salas_coop where codigo = p_codigo and clave_hash = h);
end;
$$;

create or replace function public.subir_foto(p_codigo text, p_clave text, p_foto text)
returns boolean
language plpgsql security definer set search_path = public, extensions
as $$
begin
    if length(coalesce(p_foto, '')) > 8000000 then return false; end if;
    update public.salas_coop set foto = p_foto, actualizada = now()
    where codigo = p_codigo and clave_hash = encode(extensions.digest(coalesce(p_clave, ''), 'sha256'), 'hex');
    return found;
end;
$$;

create or replace function public.bajar_foto(p_codigo text)
returns text
language sql stable security definer set search_path = public
as $$
    select foto from public.salas_coop where codigo = p_codigo;
$$;

create or replace function public.cerrar_sala_coop(p_codigo text, p_clave text)
returns void
language sql security definer set search_path = public, extensions
as $$
    delete from public.salas_coop where codigo = p_codigo and clave_hash = encode(extensions.digest(coalesce(p_clave, ''), 'sha256'), 'hex');
$$;

create or replace function public.limpiar_salas_viejas()
returns integer
language sql security definer set search_path = public
as $$
    with a as (delete from public.salas where actualizada < now() - interval '7 days' returning 1),
         b as (delete from public.salas_coop where actualizada < now() - interval '2 days' returning 1)
    select ((select count(*) from a) + (select count(*) from b))::integer;
$$;
revoke all on function public.limpiar_salas_viejas() from public, anon, authenticated;

do $$
declare f text;
begin
    foreach f in array array[
        'entrar_sala(text,text)', 'leer_cambios(text,text,integer)', 'guardar_cambios(text,jsonb)', 'guardar_ronda(text,integer,text)',
        'crear_sala_coop(text,text)', 'subir_foto(text,text,text)', 'bajar_foto(text)', 'cerrar_sala_coop(text,text)', 'reiniciar_sala(text,text)'
    ] loop
        execute format('revoke all on function public.%s from public', f);
        execute format('revoke execute on function public.%s from authenticated', f);
        execute format('grant execute on function public.%s to anon', f);
    end loop;
end $$;

-- =========================================================
-- Paso 2 de seguridad (PENDIENTE: aplicar solo después de publicar el cliente que usa las
-- funciones de arriba). Sin acceso directo a las tablas, nadie puede listar salas: el código
-- de sala pasa a ser la llave.
-- =========================================================
-- drop policy if exists salas_leer on public.salas;
-- drop policy if exists salas_crear on public.salas;
-- drop policy if exists salas_actualizar on public.salas;
-- drop policy if exists cambios_leer on public.cambios_bloques;
-- drop policy if exists cambios_crear on public.cambios_bloques;
-- drop policy if exists cambios_actualizar on public.cambios_bloques;
-- revoke all on public.salas, public.cambios_bloques from anon, authenticated;
