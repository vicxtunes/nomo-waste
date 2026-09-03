-- Enums. Full value set is defined now even where a value is not wired up
-- this phase (see CLAUDE.md) so later phases need no migration:
--   * fill_source includes 'photo' | 'sensor'
--   * monitoring_mode includes 'sensor'
--   * txn_method includes 'card'

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
