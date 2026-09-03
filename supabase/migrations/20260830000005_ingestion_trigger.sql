-- The shared ingestion point. Every fill level — manual slider today, sensor
-- POST tomorrow — lands as a row in `fill_reports`; this AFTER INSERT trigger
-- owns ALL downstream effects so no caller (UI handler, hardware, Edge
-- Function) ever reimplements them:
--   1. sync bins.current_fill_level / last_updated_at
--   2. if fill >= configured threshold, open ONE auto pickup request + alert
--      per bin (no duplicates while the request is still open)

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
