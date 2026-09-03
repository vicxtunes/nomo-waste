-- Row Level Security.
--
-- Real per-role policies are drafted below against a future JWT that carries
-- the user's id (auth.uid()) and `role` claim. They are NOT exercised this
-- phase because auth is not wired up yet (seeded users + a dev switcher).
--
-- The DEV ONLY block at the bottom grants the anon key full access so the
-- switcher can read/write while there is no session. Delete that block when
-- phone-OTP auth lands.

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

-- Helper: role from JWT claims (null until auth is wired up).
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

-- ---------------------------------------------------------------------------
-- Drafted per-role policies (inert without a session)
-- ---------------------------------------------------------------------------

-- Everyone authenticated can read zones (reference data).
create policy zones_read on zones for select to authenticated using (true);

-- Users can read their own row; admins read all.
create policy users_self_read on users for select to authenticated
  using (id = auth.uid() or auth_role() = 'admin');

-- Households/vendors manage their own bins; collectors + admins read all bins.
create policy bins_owner_all on bins for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
create policy bins_staff_read on bins for select to authenticated
  using (auth_role() in ('collector', 'admin'));

-- Fill reports: a user may report for a bin they own; staff may read all.
create policy fill_reports_owner_insert on fill_reports for insert to authenticated
  with check (exists (select 1 from bins b where b.id = bin_id and b.owner_id = auth.uid()));
create policy fill_reports_read on fill_reports for select to authenticated
  using (
    exists (select 1 from bins b where b.id = bin_id and b.owner_id = auth.uid())
    or auth_role() in ('collector', 'admin')
  );

-- Collection requests: requester sees own; assigned collector sees own; admin all.
create policy requests_stakeholders on collection_requests for select to authenticated
  using (requester_id = auth.uid() or collector_id = auth.uid() or auth_role() = 'admin');
create policy requests_requester_insert on collection_requests for insert to authenticated
  with check (requester_id = auth.uid());

-- Collector clients: either party in the relationship, or admin.
create policy collector_clients_parties on collector_clients for select to authenticated
  using (collector_id = auth.uid() or household_id = auth.uid() or auth_role() = 'admin');

-- Collections: performing collector or admin.
create policy collections_collector on collections for select to authenticated
  using (collector_id = auth.uid() or auth_role() = 'admin');

-- Alerts: collectors and admins (authority dashboard is admin-facing).
create policy alerts_staff_read on alerts for select to authenticated
  using (auth_role() in ('collector', 'admin'));

-- Collector profiles are publicly readable (residents browse collectors).
create policy collectors_profile_read on collectors_profile for select to authenticated using (true);
create policy collectors_profile_self on collectors_profile for all to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- Transactions: payer or receiving collector or admin.
create policy transactions_parties on transactions for select to authenticated
  using (payer_id = auth.uid() or collector_id = auth.uid() or auth_role() = 'admin');

-- Settings readable by all authenticated; only admin writes.
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
