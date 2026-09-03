-- The authority dashboard subscribes to these instead of polling.
alter publication supabase_realtime add table alerts;
alter publication supabase_realtime add table bins;
alter publication supabase_realtime add table collection_requests;
