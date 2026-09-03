-- Operational tables: collection_requests, collector_clients, collections,
-- alerts, collectors_profile, transactions.

create table collection_requests (
  id             uuid primary key default gen_random_uuid(),
  requester_id   uuid references users (id),
  -- nullable: a household without a registered bin can still request pickup.
  bin_id         uuid references bins (id) on delete set null,
  request_type   request_type not null,
  -- nullable until payments are built.
  payment_type   payment_type,
  amount         numeric(12, 2),
  payment_status payment_status not null default 'unpaid',
  -- nullable until a collector claims the request.
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
