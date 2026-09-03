-- Seed data for local dev + demo. Deterministic UUIDs so the app can
-- reference them and so re-seeding is stable.

-- Zones: three Kampala (KCCA) divisions with rough centroids.
insert into zones (id, name, centroid_lat, centroid_lng) values
  ('11111111-0000-0000-0000-000000000001', 'Central Division', 0.3136, 32.5811),
  ('11111111-0000-0000-0000-000000000002', 'Kawempe Division', 0.3700, 32.5560),
  ('11111111-0000-0000-0000-000000000003', 'Makindye Division', 0.2790, 32.5990);

-- One user per role (the dev switcher lists these).
insert into users (id, name, phone, role, lat, lng, zone_id) values
  ('22222222-0000-0000-0000-000000000001', 'Aisha (Household)',      '+256700000001', 'household',     0.3140, 32.5820, '11111111-0000-0000-0000-000000000001'),
  ('22222222-0000-0000-0000-000000000002', 'Okello (Market Vendor)', '+256700000002', 'market_vendor', 0.3705, 32.5565, '11111111-0000-0000-0000-000000000002'),
  ('22222222-0000-0000-0000-000000000003', 'Nakato (Collector)',     '+256700000003', 'collector',     0.2795, 32.5995, '11111111-0000-0000-0000-000000000003'),
  ('22222222-0000-0000-0000-000000000004', 'KCCA Duty Officer',      '+256700000004', 'admin',         0.3136, 32.5811, '11111111-0000-0000-0000-000000000001');

-- Bins across zones/types with varied starting fill levels (all below the
-- default 80 threshold so the demo generates the first alert).
insert into bins (id, owner_id, type, monitoring_mode, zone_id, current_fill_level, last_updated_at) values
  ('33333333-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000001', 'household', 'manual', '11111111-0000-0000-0000-000000000001', 20, now() - interval '2 days'),
  ('33333333-0000-0000-0000-000000000002', '22222222-0000-0000-0000-000000000001', 'household', 'manual', '11111111-0000-0000-0000-000000000001', 55, now() - interval '1 day'),
  ('33333333-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000002', 'market',    'manual', '11111111-0000-0000-0000-000000000002', 65, now() - interval '6 hours'),
  ('33333333-0000-0000-0000-000000000004', '22222222-0000-0000-0000-000000000002', 'market',    'manual', '11111111-0000-0000-0000-000000000002', 40, now() - interval '3 hours'),
  ('33333333-0000-0000-0000-000000000005', null,                                   'public',    'manual', '11111111-0000-0000-0000-000000000003', 70, now() - interval '12 hours');

-- A little history so charts/lists are not empty on first load.
insert into fill_reports (bin_id, fill_level, source, reported_at) values
  ('33333333-0000-0000-0000-000000000001', 10, 'manual_slider', now() - interval '3 days'),
  ('33333333-0000-0000-0000-000000000001', 20, 'manual_slider', now() - interval '2 days'),
  ('33333333-0000-0000-0000-000000000003', 50, 'manual_slider', now() - interval '1 day'),
  ('33333333-0000-0000-0000-000000000003', 65, 'manual_slider', now() - interval '6 hours');

-- Collector profile for the seeded collector.
insert into collectors_profile (id, business_name, service_area, pricing_one_time, pricing_subscription_monthly, rating, active_status) values
  ('22222222-0000-0000-0000-000000000003', 'Nakato Waste Services', 'Makindye & Central', 5000, 30000, 4.60, true);

-- One existing subscription relationship.
insert into collector_clients (collector_id, household_id, relationship_status) values
  ('22222222-0000-0000-0000-000000000003', '22222222-0000-0000-0000-000000000001', 'active');
