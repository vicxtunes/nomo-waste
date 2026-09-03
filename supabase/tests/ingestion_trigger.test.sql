-- pgTAP tests for the fill_reports ingestion trigger.
-- Run with: npx supabase test db

begin;
select plan(7);

-- Fixtures: a zone, an owner, a bin at 0%.
insert into zones (id, name, centroid_lat, centroid_lng)
  values ('aaaaaaaa-0000-0000-0000-000000000001', 'Test Zone', 0.0, 0.0);
insert into users (id, name, role, zone_id)
  values ('bbbbbbbb-0000-0000-0000-000000000001', 'Test Owner', 'household',
          'aaaaaaaa-0000-0000-0000-000000000001');
insert into bins (id, owner_id, type, zone_id, current_fill_level)
  values ('cccccccc-0000-0000-0000-000000000001',
          'bbbbbbbb-0000-0000-0000-000000000001', 'household',
          'aaaaaaaa-0000-0000-0000-000000000001', 0);

-- 1. A below-threshold report syncs the bin but creates no request/alert.
insert into fill_reports (bin_id, fill_level, source)
  values ('cccccccc-0000-0000-0000-000000000001', 40, 'manual_slider');

select is(
  (select current_fill_level from bins where id = 'cccccccc-0000-0000-0000-000000000001'),
  40, 'bin fill synced to 40 after below-threshold report');
select is(
  (select count(*)::int from collection_requests where bin_id = 'cccccccc-0000-0000-0000-000000000001'),
  0, 'no collection_request from a below-threshold report');
select is(
  (select count(*)::int from alerts where bin_id = 'cccccccc-0000-0000-0000-000000000001'),
  0, 'no alert from a below-threshold report');

-- 2. An at/over-threshold report opens exactly one request + one alert.
insert into fill_reports (bin_id, fill_level, source)
  values ('cccccccc-0000-0000-0000-000000000001', 90, 'manual_slider');

select is(
  (select count(*)::int from collection_requests
     where bin_id = 'cccccccc-0000-0000-0000-000000000001'
       and request_type = 'auto_threshold_alert' and status = 'pending'),
  1, 'one pending auto_threshold_alert request after crossing threshold');
select is(
  (select severity::text from alerts where bin_id = 'cccccccc-0000-0000-0000-000000000001'),
  'medium', 'alert severity is medium for a 90% fill');

-- 3. A further over-threshold report does not duplicate the open request/alert.
insert into fill_reports (bin_id, fill_level, source)
  values ('cccccccc-0000-0000-0000-000000000001', 92, 'manual_slider');

select is(
  (select count(*)::int from collection_requests where bin_id = 'cccccccc-0000-0000-0000-000000000001'),
  1, 'no duplicate request while one is still open');
select is(
  (select count(*)::int from alerts where bin_id = 'cccccccc-0000-0000-0000-000000000001'),
  1, 'no duplicate alert while the request is still open');

select * from finish();
rollback;
