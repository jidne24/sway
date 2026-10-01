-- Partner self-unlink. Apply after 202610010001; safe to re-run.
-- RLS still denies direct partner writes. The existing access trigger emits
-- the privacy-safe revocation receipt and realtime clients purge their caches.
create or replace function public.leave_couple(target_couple uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  update public.couples
    set partner_uuid = null, share_calendar_with_partner = false, pairing_enabled = false
    where id = target_couple and partner_uuid = auth.uid();
  return found;
end $$;
revoke all on function public.leave_couple(uuid) from public;
grant execute on function public.leave_couple(uuid) to authenticated;
