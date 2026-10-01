import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { getAuthenticatedUserId } from '../services/auth';
import { useCycleStore } from '../store/useCycleStore';
import type { CoupleRow } from '../types/couple';
import { useStoreHydrated } from './useStoreHydrated';

/** RLS protects the data; a separate data-free access stream delivers revocation. */
export function useSupabaseSync(): { ready: boolean } {
  const coupleId = useCycleStore(s => s.coupleId);
  const hydrated = useStoreHydrated();
  const syncRevision = useCycleStore(s => s.syncRevision);
  const [settled, setSettled] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated || !coupleId || !isSupabaseConfigured) return;
    let cancelled = false;
    let generation = 0;
    let userId: string | undefined;
    let subscribed = false;
    const current = () => !cancelled && useCycleStore.getState().coupleId === coupleId;
    const lock = () => {
      if (current()) useCycleStore.setState({ calendarConsentVerified: false, partnerAccessVerified: false });
    };
    const apply = (row: CoupleRow) => {
      if (!current()) return;
      const role = useCycleStore.getState().userRole;
      if ((role === 'partner' && row.partner_uuid !== userId) || (role === 'her' && row.her_uuid !== userId)) {
        useCycleStore.getState().unlinkCouple();
        return;
      }
      useCycleStore.getState().applyRemoteCouple(row);
    };
    const catchUp = async () => {
      const request = ++generation;
      try {
        userId = await getAuthenticatedUserId();
        if (!current() || request !== generation) return;
        await useCycleStore.getState().flushCycleSync();
        if (!current() || request !== generation) return;
        const { data, error } = await supabase.from('couples').select('*').eq('id', coupleId).maybeSingle();
        if (!current() || request !== generation) return;
        if (error) lock();
        else if (!data) useCycleStore.getState().unlinkCouple();
        else apply(data as CoupleRow);
      } catch { if (current() && request === generation) lock(); }
      finally { if (!cancelled) setSettled(coupleId); }
    };

    const channel = supabase.channel(`couple:${coupleId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couples', filter: `id=eq.${coupleId}` },
        payload => { if (current() && userId) { generation++; apply(payload.new as CoupleRow); } })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'couple_access', filter: `couple_id=eq.${coupleId}` },
        payload => {
          if (current() && payload.new.member_uuid === userId && payload.new.active === false) {
            generation++;
            useCycleStore.getState().unlinkCouple();
          }
        });
    const subscribe = () => channel.subscribe(status => {
      if (!current()) return;
      if (status === 'SUBSCRIBED') void catchUp();
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { generation++; lock(); }
    });
    const reconnect = () => catchUp().then(() => {
      // Auth may fail on the first offline launch. A later foreground retry
      // must establish the realtime stream as well as refresh the row.
      if (current() && userId && !subscribed) { subscribed = true; subscribe(); }
    });
    void reconnect();
    const foreground = AppState.addEventListener('change', state => {
      generation++;
      lock();
      if (state === 'active') { supabase.auth.startAutoRefresh(); void reconnect(); }
      else supabase.auth.stopAutoRefresh();
    });
    return () => { cancelled = true; foreground.remove(); void supabase.removeChannel(channel); };
  }, [coupleId, hydrated, syncRevision]);

  return { ready: hydrated && (!coupleId || !isSupabaseConfigured || settled === coupleId) };
}

export default useSupabaseSync;
