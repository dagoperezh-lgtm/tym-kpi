-- =============================================================================
-- TYM KPI — esquema inicial
--
-- Este proyecto NO usa Supabase Auth: el login es con usuario/contraseña
-- propios (tabla `atletas`), porque el usuario de acceso es el mismo nombre
-- que ya se usa en Strava/el Maestro para identificar a cada atleta
-- (equivalente al MatchKey de club-kpi-platform: mayúsculas, sin tildes),
-- y no todos los atletas tienen (ni van a tener) login OAuth de Strava.
--
-- Todas las consultas a este esquema se hacen desde el servidor de Next.js
-- (Route Handlers / Server Components) usando la service role key, nunca
-- desde el navegador. Por eso no hay políticas RLS basadas en auth.uid():
-- el control de acceso ("un atleta solo ve su propia ficha") se hace en el
-- código del servidor, no en la base de datos.
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------
-- ATLETAS: identidad + credenciales de acceso a la web
-- -----------------------------------------------------------------------
create table if not exists atletas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,                  -- nombre tal como se muestra (igual al de Strava)
  match_key text not null unique,        -- nombre normalizado: MAYÚSCULAS, sin tildes (mismo criterio que clean_string() en club-kpi-platform)
  password_hash text,                    -- null hasta que el atleta activa su cuenta
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- ACTIVACIONES: tokens de un solo uso para que cada atleta defina su clave
-- -----------------------------------------------------------------------
create table if not exists activaciones (
  token uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references atletas(id) on delete cascade,
  usado_en timestamptz,
  expira_en timestamptz not null,
  creado_en timestamptz not null default now()
);

create index if not exists idx_activaciones_atleta on activaciones(atleta_id);

-- -----------------------------------------------------------------------
-- SEMANAS_CLUB: snapshot de los datos generales del equipo, por semana
-- -----------------------------------------------------------------------
create table if not exists semanas_club (
  etiqueta_semana text primary key,      -- 'Sem 35'
  fecha_inicio date,
  fecha_fin date,
  atletas_activos int,
  horas_totales_equipo numeric,          -- suma de horas de TODOS los atletas (para "Horas totales del equipo")
  tpi_promedio_equipo numeric,
  -- Promedio POR ATLETA en cada disciplina (para comparar "rendiste X más/menos
  -- que el promedio del equipo" en la ficha personal — mismo criterio que
  -- promedio_equipo en app.py, que usa .mean(), no la suma).
  promedio_natacion_mins numeric,
  promedio_ciclismo_mins numeric,
  promedio_trote_mins numeric,
  actualizado_en timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- RANKINGS: Top 10 de cada categoría, por semana
-- -----------------------------------------------------------------------
-- categoria: 'completos' | 'tpi_global' | 'tiempo_total' |
--   'natacion_tiempo' | 'natacion_distancia' |
--   'ciclismo_tiempo' | 'ciclismo_distancia' | 'ciclismo_salida_larga' |
--   'ciclismo_vel_prom' | 'ciclismo_vel_max' | 'ciclismo_desnivel' |
--   'trote_tiempo' | 'trote_distancia' | 'trote_salida_larga' |
--   'trote_vel_prom' | 'trote_vel_max' | 'trote_desnivel'
create table if not exists rankings (
  id bigserial primary key,
  etiqueta_semana text not null references semanas_club(etiqueta_semana) on delete cascade,
  categoria text not null,
  posicion int not null,
  atleta_match_key text not null,
  atleta_nombre text not null,
  valor_mostrado text not null,          -- "05:22", "78.0%", "33,4 km" — ya formateado, mismo criterio que app.py
  valor_numerico numeric,
  unique (etiqueta_semana, categoria, posicion)
);

create index if not exists idx_rankings_semana_categoria on rankings(etiqueta_semana, categoria);

-- -----------------------------------------------------------------------
-- RECORDS_CLUB: mejor marca histórica por métrica (misma idea que la hoja
-- Records_Club del Maestro en club-kpi-platform)
-- -----------------------------------------------------------------------
create table if not exists records_club (
  metrica text primary key,              -- nombre legible, igual a METRICAS_RECORD en club-kpi-platform (ej. "Velocidad Promedio Ciclismo")
  categoria text not null,               -- slug de Categoria (ver types.ts), para cruzar con la tabla `rankings`
  valor_mostrado text,
  valor_numerico numeric,
  atleta_nombre text,
  fecha text,                            -- fecha exacta formateada ("20 de agosto de 2026")
  semana_record text,                    -- etiqueta de la semana en que se logró
  actualizado_en timestamptz not null default now()
);

-- -----------------------------------------------------------------------
-- FICHAS_SEMANALES: datos personales de cada atleta, por semana
-- -----------------------------------------------------------------------
create table if not exists fichas_semanales (
  id bigserial primary key,
  etiqueta_semana text not null references semanas_club(etiqueta_semana) on delete cascade,
  atleta_match_key text not null,
  atleta_nombre text not null,

  es_completo boolean not null default false,
  racha_completo int not null default 0,

  tpi_global numeric,
  tpi_natacion numeric,
  tpi_ciclismo numeric,
  tpi_trote numeric,

  minutos_total numeric,
  minutos_natacion numeric,
  minutos_ciclismo numeric,
  minutos_trote numeric,

  km_natacion numeric,
  km_ciclismo numeric,
  km_trote numeric,

  salida_mas_larga_ciclismo_km numeric,
  salida_mas_larga_trote_km numeric,
  vel_prom_ciclismo_kmh numeric,
  vel_max_ciclismo_kmh numeric,
  vel_prom_trote_kmh numeric,
  vel_max_trote_kmh numeric,
  desnivel_ciclismo_m numeric,
  desnivel_trote_m numeric,

  -- Datos personales: solo se muestran en la ficha propia del atleta,
  -- nunca en un ranking ni en una vista de otro atleta.
  pulso_promedio numeric,
  pulso_maximo numeric,
  potencia_promedio numeric,
  potencia_maxima numeric,

  unique (etiqueta_semana, atleta_match_key)
);

create index if not exists idx_fichas_atleta on fichas_semanales(atleta_match_key);
