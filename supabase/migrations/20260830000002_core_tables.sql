-- Core tables: zones, users, bins, fill_reports.
-- `zones` is not in the CLAUDE.md numbered list, but every other table
-- references zone_id, so it is effectively table 0.

create table zones (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  centroid_lat double precision not null,
  centroid_lng double precision not null,
  created_at   timestamptz not null default now()
);

create table users (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  phone      text unique,
  role       user_role not null,
  lat        double precision,
  lng        double precision,
  zone_id    uuid references zones (id),
  created_at timestamptz not null default now()
);

create table bins (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid references users (id),
  type               bin_type not null,
  monitoring_mode    monitoring_mode not null default 'manual',
  zone_id            uuid references zones (id),
  current_fill_level int not null default 0 check (current_fill_level between 0 and 100),
  last_updated_at    timestamptz not null default now(),
  created_at         timestamptz not null default now()
);

create index bins_zone_idx on bins (zone_id);
create index bins_owner_idx on bins (owner_id);

-- Generic ingestion point. The app never cares which `source` populated a
-- row, only that a row was written. Hardware will later INSERT here directly
-- (PostgREST / Edge Function) and the same trigger fires — see
-- 20260830000005_ingestion_trigger.sql.
create table fill_reports (
  id          uuid primary key default gen_random_uuid(),
  bin_id      uuid not null references bins (id) on delete cascade,
  fill_level  int not null check (fill_level between 0 and 100),
  source      fill_source not null,
  reported_at timestamptz not null default now()
);

create index fill_reports_bin_idx on fill_reports (bin_id, reported_at desc);
