-- BAQUI · Esquema de la base (PostgreSQL 15+ con PostGIS)
--
-- Idea: NASA (y CONAE) guardan las imágenes; BAQUI guarda solo la respuesta por tramo.
-- Tres tablas: tramos (los caminos cortados cada 100 m), pasadas (cada archivo de radar)
-- y lecturas (lo que midió cada pasada en cada tramo). La web consulta solo "estado_hoy".
-- Explicación y cuentas de tamaño: docs/SCALABILITY.md.

create extension if not exists postgis;

-- Caminos rurales sin pavimento de OpenStreetMap, cortados en tramos de 100 m.
create table tramos (
    id          integer generated always as identity primary key,
    osm_way_id  bigint      not null,                -- camino de OSM al que pertenece
    orden       integer     not null,                -- número de tramo dentro del camino (0, 1, 2...)
    tipo        text        not null,                -- etiqueta highway de OSM (track, unclassified...)
    superficie  text,                                -- etiqueta surface de OSM; null = sin dato
    hand_m      real,                                -- altura sobre el drenaje más cercano (NASADEM); null = sin calcular
    monte       boolean     not null default false,  -- el eje pasa bajo monte (el agua no se confirma)
    geom        geometry(LineString, 4326) not null,
    unique (osm_way_id, orden)
);
create index tramos_geom_idx on tramos using gist (geom);

-- Cada archivo de radar procesado. El ID del archivo permite que cualquiera rehaga el cálculo.
create table pasadas (
    id             integer generated always as identity primary key,
    satelite       text        not null check (satelite in ('NISAR', 'SAOCOM', 'Sentinel-1')),
    archivo        text        not null unique,       -- ID del producto (ASF Vertex o catálogo CONAE)
    orbita         integer     not null,              -- track relativo
    sentido        char(1)     not null check (sentido in ('A', 'D')),  -- ascendente o descendente
    frame          integer,
    adquirida_utc  timestamptz not null,
    version_proc   text,                              -- versión del procesador: no se comparan versiones distintas
    referencia_id  integer references pasadas (id)    -- pasada de referencia: misma órbita, suelo seco
);
create index pasadas_orbita_idx on pasadas (satelite, orbita, sentido, adquirida_utc);

-- Lo que midió cada pasada en cada tramo, contra su referencia.
create table lecturas (
    tramo_id   integer  not null references tramos (id),
    pasada_id  integer  not null references pasadas (id),
    dhh_db     real,                                  -- eco extra HH (mediana del eje), en dB
    dhv_db     real,                                  -- eco extra HV, en dB
    n_px       smallint not null,                     -- píxeles del eje usados
    agua_px    smallint not null default 0,           -- píxeles con agua abierta nueva
    estado     smallint not null check (estado in (0, 1, 2)),     -- 0 sin dato, 1 transitable, 2 intransitable
    confianza  smallint not null check (confianza in (0, 1, 2)),  -- 0 baja, 1 media, 2 alta
    primary key (tramo_id, pasada_id)
);
create index lecturas_pasada_idx on lecturas (pasada_id);

-- Lluvia diaria de IMERG por celda de 0,1° (unos 10 km): actualiza el estado entre pasadas.
create table lluvia_diaria (
    dia    date     not null,
    celda  integer  not null,                         -- índice de la celda en la grilla de IMERG
    mm     real     not null,
    primary key (dia, celda)
);

-- Lo único que consulta la web: el último estado de cada tramo y de cuándo es el dato.
-- Se refresca después de cargar cada pasada nueva: refresh materialized view concurrently estado_hoy;
create materialized view estado_hoy as
select distinct on (l.tramo_id)
       l.tramo_id,
       l.estado,
       l.confianza,
       l.pasada_id,
       p.adquirida_utc as dato_de
from lecturas l
join pasadas p on p.id = l.pasada_id
order by l.tramo_id, p.adquirida_utc desc;

create unique index estado_hoy_tramo_idx on estado_hoy (tramo_id);
