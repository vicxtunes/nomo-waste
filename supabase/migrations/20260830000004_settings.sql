-- Single-row settings table. `fill_threshold_pct` is the configurable
-- threshold that triggers an auto pickup request + alert.

create table settings (
  id                smallint primary key default 1 check (id = 1),
  fill_threshold_pct int not null default 80 check (fill_threshold_pct between 1 and 100),
  updated_at        timestamptz not null default now()
);

insert into settings (id) values (1);
