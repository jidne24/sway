-- Sway: authenticated membership and immediate, server-enforced revocation.
-- Enable Anonymous Sign-ins in Supabase Auth before using online pairing.
-- Legacy device-ID pairs must relink; never transfer ownership using public device IDs.
begin;

alter table public.couples add column if not exists pairing_enabled boolean not null default true;
alter table public.couples add column if not exists share_calendar_with_partner boolean not null default false;

create table if not exists public.couple_access (
  couple_id uuid not null references public.couples(id) on delete cascade,
  member_uuid uuid not null,
  owner_uuid uuid not null,
  active boolean not null default true,
  primary key (couple_id, member_uuid)
);
-- Contains NO cycle data. Former members can receive their own revocation event
-- even after RLS has removed permission to read the couples row.
alter table public.couple_access enable row level security;
alter table public.couples enable row level security;

-- Remove prototype policies as well as previous versions of these policies.
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('couples', 'couple_access')
  loop execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

revoke all on public.couples, public.couple_access from anon;
revoke all on public.couples, public.couple_access from authenticated;
grant select, insert, update on public.couples to authenticated;
grant select on public.couple_access to authenticated;

create policy couples_member_read on public.couples for select to authenticated
  using ((select auth.uid()) = her_uuid or (select auth.uid()) = partner_uuid);
create policy couples_owner_insert on public.couples for insert to authenticated
  with check ((select auth.uid()) = her_uuid and partner_uuid is null);
create policy couples_owner_update on public.couples for update to authenticated
  using ((select auth.uid()) = her_uuid) with check ((select auth.uid()) = her_uuid);
create policy access_member_read on public.couple_access for select to authenticated
  using ((select auth.uid()) = member_uuid or (select auth.uid()) = owner_uuid);

create or replace function public.record_couple_access() returns trigger
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if tg_op = 'UPDATE' then
    if new.her_uuid is distinct from old.her_uuid or new.id is distinct from old.id then
      raise exception 'Couple ownership is immutable';
    end if;
    if old.partner_uuid is not null and old.partner_uuid is distinct from new.partner_uuid then
      update public.couple_access set active = false
        where couple_id = old.id and member_uuid = old.partner_uuid;
    end if;
  end if;
  if new.partner_uuid is not null then
    insert into public.couple_access(couple_id, member_uuid, owner_uuid, active)
      values (new.id, new.partner_uuid, new.her_uuid, true)
      on conflict(couple_id, member_uuid) do update set active = true;
  end if;
  return new;
end $$;
drop trigger if exists record_couple_access on public.couples;
create trigger record_couple_access after insert or update on public.couples
  for each row execute function public.record_couple_access();

-- Backfill only pairs whose owner is a real authenticated user, NOT prototype IDs.
insert into public.couple_access(couple_id, member_uuid, owner_uuid)
  select c.id, c.partner_uuid, c.her_uuid from public.couples c
  join auth.users u on u.id = c.her_uuid where c.partner_uuid is not null
  on conflict do nothing;

create or replace function public.join_couple(pairing_code_input text) returns jsonb
language plpgsql security definer set search_path = public, pg_temp as $$
declare c public.couples; caller uuid := auth.uid();
begin
  if caller is null then raise exception 'Authentication required'; end if;
  if pairing_code_input !~ '^[A-Z2-9]{6}$' then return jsonb_build_object('status', 'not_found'); end if;
  select * into c from public.couples where pairing_code = pairing_code_input
    and pairing_enabled = true for update;
  if not found then return jsonb_build_object('status', 'not_found'); end if;
  if c.her_uuid = caller then return jsonb_build_object('status', 'own_code'); end if;
  if not exists(select 1 from auth.users where id = c.her_uuid)
    or (c.partner_uuid is not null and c.partner_uuid <> caller) then
    return jsonb_build_object('status', 'not_found');
  end if;
  update public.couples set partner_uuid = caller where id = c.id;
  return jsonb_build_object('status', 'joined', 'coupleId', c.id);
end $$;

create or replace function public.revoke_partner_access(target_couple uuid) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.couples set partner_uuid = null, share_calendar_with_partner = false,
    pairing_enabled = false where id = target_couple and her_uuid = auth.uid();
  return found;
end $$;

create or replace function public.acknowledge_sos(target_couple uuid) returns boolean
language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.couples set sos_active = false, sos_message = null
    where id = target_couple and (her_uuid = auth.uid() or partner_uuid = auth.uid());
  return found;
end $$;

revoke all on function public.record_couple_access() from public;
revoke all on function public.join_couple(text) from public;
revoke all on function public.revoke_partner_access(uuid) from public;
revoke all on function public.acknowledge_sos(uuid) from public;
grant execute on function public.join_couple(text), public.revoke_partner_access(uuid),
  public.acknowledge_sos(uuid) to authenticated;

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='couples') then
    alter publication supabase_realtime add table public.couples;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
    and schemaname='public' and tablename='couple_access') then
    alter publication supabase_realtime add table public.couple_access;
  end if;
end $$;
commit;
