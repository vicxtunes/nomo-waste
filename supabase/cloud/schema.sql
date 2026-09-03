-- ===========================================================================
-- Nomo Waste — consolidated schema for a HOSTED Supabase project.
-- ===========================================================================
-- This is every file in supabase/migrations/ (20260830000001..07) concatenated
-- in order, for a one-shot setup on a fresh cloud database.
--
-- Two ways to apply it:
--   A. Supabase dashboard -> SQL Editor -> paste this file -> Run.
--   B. psql "$SUPABASE_DB_URL" -f supabase/cloud/schema.sql
--      (connection string: Project Settings -> Database -> Connection string)
--
-- Then load data with supabase/cloud/seed.sql the same way.
--
-- The numbered files in supabase/migrations/ remain the source of truth for
-- local dev (`npx supabase db reset`) and for `npx supabase db push`. Keep this
-- file in sync when a migration changes.
--
-- WARNING: the RLS section still contains the `-- DEV ONLY` block that grants
-- the anon key full read/write access (auth is not wired up yet). That is a
-- wide-open database. Fine for a demo project with throwaway data; delete that
-- block before anything real goes in.
-- ===========================================================================

begin;

-- ---------------------------------------------------------------------------
-- 20260830000001_enums.sql
-- ---------------------------------------------------------------------------
create type user_role as enum ('household', 'market_vendor', 'collector', 'admin');
create type bin_type as enum ('household', 'market', 'public');
create type monitoring_mode as enum ('sensor', 'manual');
create type fill_source as enum ('manual_slider', 'photo', 'sensor');
create type request_type as enum ('manual_call', 'auto_threshold_alert');
create type payment_type as enum ('one_time', 'subscription');
create type payment_status as enum ('unpaid', 'pending', 'paid', 'refunded');
create type request_status as enum (
  'pending', 'assigned', 'in_progress', 'completed', 'missed'
);
create type collection_status as enum ('completed', 'missed', 'rescheduled');
create type alert_severity as enum ('low', 'medium', 'high');
create type txn_method as enum ('mobile_money', 'card', 'cash_on_pickup');
create type txn_status as enum ('pending', 'success', 'failed', 'refunded');
create type relationship_status as enum ('active', 'paused');

-- ---------------------------------------------------------------------------
-- 20260830000002_core_tables.sql
-- ---------------------------------------------------------------------------
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

create table fill_reports (
  id          uuid primary key default gen_random_uuid(),
  bin_id      uuid not null references bins (id) on delete cascade,
  fill_level  int not null check (fill_level between 0 and 100),
  source      fill_source not null,
  reported_at timestamptz not null default now()
);

create index fill_reports_bin_idx on fill_reports (bin_id, reported_at desc);

-- ---------------------------------------------------------------------------
-- 20260830000003_ops_tables.sql
-- ---------------------------------------------------------------------------
create table collection_requests (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid references users (id),
  bin_id         uuid references bins (id) on delete set null,
  request_type   request_type not null,
  payment_type   payment_type,
  amount         numeric(12, 2),
  payment_status payment_status not null default 'unpaid',
  collector_id   uuid references users (id),
  status         request_status not null default 'pending',
  created_at     timestamptz not null default now()
);

create index collection_requests_status_idx on collection_requests (status);
create index collection_requests_bin_idx on collection_requests (bin_id);

create table collector_clients (
  id                  uuid primary key default gen_random_uuid(),
  collector_id        uuid not null references users (id),
  household_id        uuid not null references users (id),
  relationship_status relationship_status not null default 'active',
  assigned_at         timestamptz not null default now(),
  unique (collector_id, household_id)
);

create table collections (
  id             uuid primary key default gen_random_uuid(),
  request_id     uuid not null references collection_requests (id) on delete cascade,
  collector_id   uuid not null references users (id),
  status         collection_status not null,
  notes          text,
  completed_at   timestamptz,
  proof_photo_url text
);

create table alerts (
  id           uuid primary key default gen_random_uuid(),
  bin_id       uuid references bins (id) on delete cascade,
  collector_id uuid references users (id),
  zone_id      uuid references zones (id),
  severity     alert_severity not null,
  created_at   timestamptz not null default now(),
  resolved_at  timestamptz
);

create index alerts_unresolved_idx on alerts (zone_id) where resolved_at is null;

create table collectors_profile (
  id                          uuid primary key references users (id) on delete cascade,
  business_name               text,
  service_area                text,
  pricing_one_time            numeric(12, 2),
  pricing_subscription_monthly numeric(12, 2),
  rating                      numeric(3, 2),
  active_status               boolean not null default true
);

create table transactions (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid references collection_requests (id) on delete set null,
  payer_id     uuid references users (id),
  collector_id uuid references users (id),
  amount       numeric(12, 2) not null,
  method       txn_method not null,
  status       txn_status not null default 'pending',
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 20260830000004_settings.sql
-- ---------------------------------------------------------------------------
create table settings (
  id                smallint primary key default 1 check (id = 1),
  fill_threshold_pct int not null default 80 check (fill_threshold_pct between 1 and 100),
  updated_at        timestamptz not null default now()
);

insert into settings (id) values (1);

-- ---------------------------------------------------------------------------
-- 20260830000005_ingestion_trigger.sql
-- ---------------------------------------------------------------------------
create or replace function severity_for_fill(pct int)
returns alert_severity
language sql
immutable
as $$
  select case
    when pct >= 95 then 'high'::alert_severity
    when pct >= 85 then 'medium'::alert_severity
    else 'low'::alert_severity
  end;
$$;

create or replace function fn_on_fill_report()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bin       bins%rowtype;
  v_threshold int;
  v_open_count int;
  v_request_id uuid;
begin
  select * into v_bin from bins where id = new.bin_id;

  update bins
    set current_fill_level = new.fill_level,
        last_updated_at = new.reported_at
    where id = new.bin_id;

  select fill_threshold_pct into v_threshold from settings where id = 1;

  if new.fill_level >= coalesce(v_threshold, 80) then
    select count(*) into v_open_count
      from collection_requests
      where bin_id = new.bin_id
        and request_type = 'auto_threshold_alert'
        and status in ('pending', 'assigned', 'in_progress');

    if v_open_count = 0 then
      insert into collection_requests (requester_id, bin_id, request_type, status)
        values (v_bin.owner_id, new.bin_id, 'auto_threshold_alert', 'pending')
        returning id into v_request_id;

      insert into alerts (bin_id, zone_id, severity)
        values (new.bin_id, v_bin.zone_id, severity_for_fill(new.fill_level));
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_on_fill_report
  after insert on fill_reports
  for each row
  execute function fn_on_fill_report();

-- ---------------------------------------------------------------------------
-- 20260830000006_rls.sql
-- ---------------------------------------------------------------------------
alter table zones               enable row level security;
alter table users               enable row level security;
alter table bins                enable row level security;
alter table fill_reports        enable row level security;
alter table collection_requests enable row level security;
alter table collector_clients   enable row level security;
alter table collections         enable row level security;
alter table alerts              enable row level security;
alter table collectors_profile  enable row level security;
alter table transactions        enable row level security;
alter table settings            enable row level security;

create or replace function auth_role()
returns text
language sql
stable
as $$
  select coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role',
    ''
  );
$$;

create policy zones_read on zones for select to authenticated using (true);

create policy users_self_read on users for select to authenticated
  using (id = auth.uid() or auth_role() = 'admin');

create policy bins_owner_all on bins for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy bins_staff_read on bins for select to authenticated
  using (auth_role() in ('collector', 'admin'));

create policy fill_reports_owner_insert on fill_reports for insert to authenticated
  with check (exists (select 1 from bins b where b.id = bin_id and b.owner_id = auth.uid()));
create policy fill_reports_read on fill_reports for select to authenticated
  using (
    exists (select 1 from bins b where b.id = bin_id and b.owner_id = auth.uid())
    or auth_role() in ('collector', 'admin')
  );

create policy requests_stakeholders on collection_requests for select to authenticated
  using (requester_id = auth.uid() or collector_id = auth.uid() or auth_role() = 'admin');
create policy requests_requester_insert on collection_requests for insert to authenticated
  with check (requester_id = auth.uid());

create policy collector_clients_parties on collector_clients for select to authenticated
  using (collector_id = auth.uid() or household_id = auth.uid() or auth_role() = 'admin');

create policy collections_collector on collections for select to authenticated
  using (collector_id = auth.uid() or auth_role() = 'admin');

create policy alerts_staff_read on alerts for select to authenticated
  using (auth_role() in ('collector', 'admin'));

create policy collectors_profile_read on collectors_profile for select to authenticated using (true);
create policy collectors_profile_self on collectors_profile for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy transactions_parties on transactions for select to authenticated
  using (payer_id = auth.uid() or collector_id = auth.uid() or auth_role() = 'admin');

create policy settings_read on settings for select to authenticated using (true);
create policy settings_admin_write on settings for update to authenticated
  using (auth_role() = 'admin') with check (auth_role() = 'admin');

-- ===========================================================================
-- DEV ONLY — remove this whole block when auth lands.
-- Grants the anon role (the key the app uses today) full access.
-- ===========================================================================
create policy dev_anon_all_zones on zones for all to anon using (true) with check (true);
create policy dev_anon_all_users on users for all to anon using (true) with check (true);
create policy dev_anon_all_bins on bins for all to anon using (true) with check (true);
create policy dev_anon_all_fill_reports on fill_reports for all to anon using (true) with check (true);
create policy dev_anon_all_requests on collection_requests for all to anon using (true) with check (true);
create policy dev_anon_all_collector_clients on collector_clients for all to anon using (true) with check (true);
create policy dev_anon_all_collections on collections for all to anon using (true) with check (true);
create policy dev_anon_all_alerts on alerts for all to anon using (true) with check (true);
create policy dev_anon_all_collectors_profile on collectors_profile for all to anon using (true) with check (true);
create policy dev_anon_all_transactions on transactions for all to anon using (true) with check (true);
create policy dev_anon_all_settings on settings for all to anon using (true) with check (true);

-- ---------------------------------------------------------------------------
-- 20260830000007_realtime.sql
-- ---------------------------------------------------------------------------
-- `supabase_realtime` already exists on a hosted project. If this errors with
-- "publication ... already member", the table is already added — safe to skip.
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table bins;
alter publication supabase_realtime add table collection_requests;

commit;
