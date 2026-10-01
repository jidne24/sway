-- Existing couples stay private until Her explicitly opts in.
alter table public.couples
  add column if not exists share_calendar_with_partner boolean not null default false;

-- This preference gates the app UI. The prototype's anonymous-device IDs and
-- open RLS policies do not enforce data confidentiality. Before production,
-- migrate to authenticated couple members and restrict SELECT/UPDATE access.
