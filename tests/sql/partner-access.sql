-- Run bootstrap.sql, schema.sql, then this file in an isolated test database.
begin;
set role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.couples(id, pairing_code, her_uuid, cycle_start_date, share_calendar_with_partner)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'K7M2PQ', auth.uid(), '2026-09-01', true);
select public.test_assert((select count(*) = 1 from public.couples), 'owner can read her data');
select public.test_assert(public.join_couple('K7M2PQ')->>'status' = 'own_code', 'owner cannot join her own invitation');

-- Outsiders cannot discover cycle data or impersonate its owner.
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select public.test_assert((select count(*) = 0 from public.couples), 'outsider cannot read cycle rows');
select public.test_assert(public.revoke_partner_access('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') = false, 'outsider cannot revoke');
do $$ begin
  begin
    insert into public.couples(pairing_code, her_uuid) values ('Q7M2PQ', '11111111-1111-1111-1111-111111111111');
    raise exception 'FAIL: outsider created a row owned by someone else';
  exception when insufficient_privilege then null; end;
end $$;

-- Join is atomic and does not require an open SELECT/UPDATE policy.
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.test_assert(public.join_couple('K7M2PQ')->>'status' = 'joined', 'partner can join with invitation');
select public.test_assert(public.join_couple('K7M2PQ')->>'status' = 'joined', 'same partner can rejoin idempotently');
select public.test_assert((select count(*) = 1 from public.couples), 'current partner can read');
select public.test_assert((select active from public.couple_access), 'partner receives an active access receipt');
update public.couples set cycle_start_date = '2026-09-20';
select public.test_assert((select cycle_start_date = '2026-09-01' from public.couples), 'partner cannot edit biological data');
select public.test_assert(public.acknowledge_sos('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'current partner can acknowledge SOS');
select public.test_assert(not public.revoke_partner_access('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'partner cannot revoke owner');
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select public.test_assert(public.join_couple('K7M2PQ')->>'status' = 'not_found', 'another partner cannot steal a claimed invitation');

-- Owner revokes in one transaction: membership, calendar consent and old code.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.test_assert(public.revoke_partner_access('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'owner can revoke');
select public.test_assert((select partner_uuid is null and not share_calendar_with_partner and not pairing_enabled from public.couples), 'revocation clears membership and invalidates the code');
select public.test_assert((select cycle_start_date = '2026-09-01' from public.couples), 'revocation preserves owner biological data');
select public.test_assert((select not active from public.couple_access), 'access receipt becomes revoked');
do $$ begin
  begin
    update public.couples set id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
    raise exception 'FAIL: owner changed row identity';
  exception when foreign_key_violation then null;
  when raise_exception then
    if sqlerrm <> 'Couple ownership is immutable' then raise; end if;
  end;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.test_assert((select count(*) = 0 from public.couples), 'revoked partner immediately loses read access');
select public.test_assert((select not active from public.couple_access), 'revoked partner can still receive their data-free revocation event');
select public.test_assert(public.join_couple('K7M2PQ')->>'status' = 'not_found', 'revoked partner cannot reuse the old code');
select public.test_assert(not public.acknowledge_sos('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'), 'revoked partner cannot mutate SOS');

-- A current partner can self-unlink, without acquiring owner edit privileges.
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.couples(id, pairing_code, her_uuid, cycle_start_date, cycle_length, period_length, share_calendar_with_partner, symptoms)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'L7M2PQ', auth.uid(), '2026-09-02', 31, 6, true, '["bloating"]');
select public.test_assert(not public.leave_couple('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'owner cannot invoke partner self-unlink');
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', false);
select public.test_assert(not public.leave_couple('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'outsider cannot self-unlink a different couple');
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
select public.test_assert(public.join_couple('L7M2PQ')->>'status' = 'joined', 'partner joins the second fixture');
select public.test_assert(public.leave_couple('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'current partner can leave');
select public.test_assert((select count(*) = 0 from public.couples), 'self-unlinked partner loses cycle read access');
select public.test_assert((select not active from public.couple_access where couple_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'self-unlink publishes a data-free inactive receipt');
select public.test_assert(not public.leave_couple('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'former partner cannot leave again');
select public.test_assert(public.join_couple('L7M2PQ')->>'status' = 'not_found', 'self-unlinked partner cannot reuse the old code');
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select public.test_assert((select partner_uuid is null and not pairing_enabled and not share_calendar_with_partner
  and cycle_start_date = '2026-09-02' and cycle_length = 31 and period_length = 6 and symptoms = '["bloating"]'::jsonb
  from public.couples where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'), 'self-unlink preserves every owner biological field');

set role anon;
select set_config('request.jwt.claim.sub', '', false);
do $$ begin
  begin perform * from public.couples; raise exception 'FAIL: anon read cycle data';
  exception when insufficient_privilege then null; end;
  begin perform public.join_couple('K7M2PQ'); raise exception 'FAIL: anon joined a couple';
  exception when insufficient_privilege then null; end;
  begin perform public.leave_couple('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'); raise exception 'FAIL: anon unlinked a couple';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select public.test_assert((select count(*) = 2 from pg_publication_tables where pubname='supabase_realtime' and tablename in ('couples','couple_access')), 'both realtime streams are published');
select 'PASS: authenticated membership, owner-only edits, SOS, revocation, partner self-unlink, invalidated codes, and RLS isolation' as result;
rollback;
