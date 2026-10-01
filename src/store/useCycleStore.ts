/**
 * Sway — Persistent Cycle Store
 *
 * Zustand store with `persist` middleware backed by AsyncStorage.
 * Holds all cycle-related state, SOS alerts, pairing, and premium status.
 *
 * When paired (`coupleId` set), mutating actions also push their changes to
 * the shared `couples` row via coupleSync. Remote updates arrive through
 * `useSupabaseSync` and are applied via `applyRemoteCouple`, which never
 * pushes back — so there are no realtime update loops.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserRole } from '../types/user';
import type { SOSAlert, SOSAlertType } from '../types/cycle';
import type { CoupleRow } from '../types/couple';
import { pushCoupleUpdate } from '../services/coupleSync';
import { isValidCycleData, parseDateKey, toDateKey } from '../utils/cycleDates';
import { normalizeCycleLengths } from '../utils/cycleCalculator';
import { revokePartnerAccess, leaveCouple, acknowledgeSOS } from '../services/coupleAccess';
import { isSupabaseConfigured } from '../services/supabase';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface CycleStoreState {
  /** Current user's role in the pair. null = onboarding not completed. */
  userRole: UserRole | null;
  /** Unique pairing code (e.g. "K7M2PQ"). */
  pairCode: string;
  /** Supabase `couples` row id — set once paired. */
  coupleId: string | null;
  /** Whether a partner has connected via the pair code. */
  partnerConnected: boolean;
  /** ISO-8601 date string of the last period start. */
  lastPeriodStartDate: string;
  /** Average cycle length in days. */
  cycleLength: number;
  /** Average period duration in days. */
  periodLength: number;
  /** IDs of symptoms logged today. */
  loggedSymptomsToday: string[];
  /** Currently active SOS alert, if any. */
  activeSOS: SOSAlert | null;
  /** Whether the user has an active premium subscription. */
  isPremium: boolean;
  shareCalendarWithPartner: boolean;
  /** True only after a successful current-session remote read (not persisted). */
  calendarConsentVerified: boolean;
  partnerAccessVerified: boolean;
  partnerAccessRevoked: boolean;
  pendingCycleSync: boolean;
  syncRevision: number;
  empathyReminderEnabled: boolean;
  empathyReminderHour: number;
  empathyReminderMinute: number;
  cycleReminderEnabled: boolean;
  cycleReminderHour: number;
  cycleReminderMinute: number;
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface CycleStoreActions {
  setShareCalendarWithPartner: (share: boolean) => Promise<boolean>;
  setEmpathyReminder: (enabled: boolean, hour: number, minute: number) => void;
  setCycleReminder: (enabled: boolean, hour: number, minute: number) => void;
  /** Switch between 'her' and 'partner' roles. */
  setUserRole: (role: UserRole) => void;
  /** Set core cycle data. Optionally override cycleLength / periodLength. */
  setCycleData: (
    startDate: string,
    cycleLength?: number,
    periodLength?: number,
  ) => Promise<boolean>;
  unlinkCouple: () => void;
  revokePartner: () => Promise<boolean>;
  leavePartner: () => Promise<boolean>;
  flushCycleSync: () => Promise<boolean>;
  requestSync: () => void;
  /** Toggle a symptom ID in today's log (add if absent, remove if present). */
  toggleDailySymptom: (symptomId: string) => void;
  /** Fire an SOS alert to the partner. */
  triggerSOS: (type: SOSAlertType, message?: string) => void;
  /** Dismiss / acknowledge the active SOS alert. */
  dismissSOS: () => void;
  /** Set or update the pairing code. */
  setPairCode: (code: string) => void;
  /** Store the shared `couples` row id (null to unlink). */
  setCoupleId: (id: string | null) => void;
  /** Mark the partner as connected. */
  connectPartner: () => void;
  /** Update premium subscription status. */
  setPremium: (status: boolean) => void;
  /**
   * Apply a remote `couples` row to local state (realtime / catch-up fetch).
   * Pure local set — deliberately does NOT push back to Supabase.
   */
  applyRemoteCouple: (row: CoupleRow) => void;
  /** Reset the entire store to factory defaults. */
  resetToDefault: () => void;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_STATE: CycleStoreState = {
  userRole: null,
  pairCode: '',
  coupleId: null,
  partnerConnected: false,
  lastPeriodStartDate: toDateKey(new Date()),
  cycleLength: 28,
  periodLength: 5,
  loggedSymptomsToday: [],
  activeSOS: null,
  isPremium: false,
  shareCalendarWithPartner: false,
  calendarConsentVerified: false,
  partnerAccessVerified: false,
  partnerAccessRevoked: false,
  pendingCycleSync: false,
  syncRevision: 0,
  empathyReminderEnabled: false,
  empathyReminderHour: 9,
  empathyReminderMinute: 0,
  cycleReminderEnabled: false,
  cycleReminderHour: 20,
  cycleReminderMinute: 0,
};

// ─── Store ───────────────────────────────────────────────────────────────────

/** Generate a short pseudo-random ID for SOS alerts. */
function uid(): string {
  return `sos_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export const useCycleStore = create<CycleStoreState & CycleStoreActions>()(
  persist(
    (set, get) => ({
      // --- Initial state ---
      ...DEFAULT_STATE,

      // --- Actions ---

      setUserRole: (role) => set({ userRole: role }),
      requestSync: () => set(state => ({ syncRevision: state.syncRevision + 1 })),

      setCycleData: async (startDate, cycleLength, periodLength) => {
        if (get().userRole === 'partner' || !isValidCycleData(startDate, cycleLength ?? get().cycleLength, periodLength ?? get().periodLength)) return false;
        set((state) => ({
          lastPeriodStartDate: startDate,
          cycleLength: cycleLength ?? state.cycleLength,
          periodLength: periodLength ?? state.periodLength,
          pendingCycleSync: Boolean(state.coupleId && isSupabaseConfigured),
        }));
        return get().flushCycleSync();
      },

      flushCycleSync: async () => {
        const { coupleId, lastPeriodStartDate, cycleLength, periodLength, pendingCycleSync } = get();
        if (!pendingCycleSync || get().userRole === 'partner') return true;
        const synced = await pushCoupleUpdate(coupleId, {
          cycle_start_date: lastPeriodStartDate, cycle_length: cycleLength, period_length: periodLength,
        });
        const current = get();
        if (synced && current.coupleId === coupleId && current.lastPeriodStartDate === lastPeriodStartDate
          && current.cycleLength === cycleLength && current.periodLength === periodLength) set({ pendingCycleSync: false });
        return synced;
      },

      unlinkCouple: () => set(state => ({
        coupleId: null, pairCode: '', partnerConnected: false, shareCalendarWithPartner: false,
        calendarConsentVerified: false, partnerAccessVerified: false, activeSOS: null, pendingCycleSync: false,
        ...(state.userRole === 'partner' ? {
          partnerAccessRevoked: true, lastPeriodStartDate: toDateKey(new Date()),
          cycleLength: 28, periodLength: 5, loggedSymptomsToday: [], empathyReminderEnabled: false,
        } : {}),
      })),

      revokePartner: async () => {
        const { coupleId, userRole } = get();
        if (userRole !== 'her' || !coupleId) return false;
        const revoked = await revokePartnerAccess(coupleId);
        if (revoked && get().coupleId === coupleId) get().unlinkCouple();
        return revoked;
      },

      leavePartner: async () => {
        const { coupleId, userRole } = get();
        if (userRole !== 'partner' || !coupleId) return false;
        const left = await leaveCouple(coupleId);
        if (left && get().coupleId === coupleId && get().userRole === 'partner') get().unlinkCouple();
        return left;
      },

      toggleDailySymptom: (symptomId) => {
        set((state) => {
          const exists = state.loggedSymptomsToday.includes(symptomId);
          return {
            loggedSymptomsToday: exists
              ? state.loggedSymptomsToday.filter((id) => id !== symptomId)
              : [...state.loggedSymptomsToday, symptomId],
          };
        });
        const { coupleId, loggedSymptomsToday } = get();
        void pushCoupleUpdate(coupleId, { symptoms: loggedSymptomsToday });
      },

      triggerSOS: (type, message) => {
        set({
          activeSOS: {
            id: uid(),
            type,
            message,
            timestamp: Date.now(),
            active: true,
          },
        });
        void pushCoupleUpdate(get().coupleId, {
          sos_active: true,
          sos_type: type,
          sos_message: message ?? null,
        });
      },

      dismissSOS: () => {
        set({ activeSOS: null });
        void acknowledgeSOS(get().coupleId);
      },

      setPairCode: (code) => set({ pairCode: code }),

      setCoupleId: (id) => set((state) => ({
        coupleId: id,
        calendarConsentVerified: false,
        partnerAccessVerified: false,
        // A new invitation clears the revoked flag only after an authenticated
        // read. This also avoids resetting a still-open Pairing modal mid-join.
        ...(state.userRole === 'partner' ? {
          shareCalendarWithPartner: false,
          ...(state.coupleId !== id ? {
            lastPeriodStartDate: toDateKey(new Date()), cycleLength: 28, periodLength: 5,
            loggedSymptomsToday: [], activeSOS: null,
          } : {}),
        } : {}),
      })),

      setShareCalendarWithPartner: async (share) => {
        if (get().userRole !== 'her') return false;
        const { coupleId } = get();
        // Never claim that a remote revocation succeeded if the request failed.
        const synced = await pushCoupleUpdate(coupleId, { share_calendar_with_partner: share });
        if (synced && get().coupleId === coupleId && get().userRole === 'her') set({ shareCalendarWithPartner: share });
        return synced;
      },

      setEmpathyReminder: (enabled, hour, minute) => {
        if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return;
        set({ empathyReminderEnabled: enabled, empathyReminderHour: hour, empathyReminderMinute: minute });
      },

      setCycleReminder: (enabled, hour, minute) => {
        if (get().userRole !== 'her' || !Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return;
        set({ cycleReminderEnabled: enabled, cycleReminderHour: hour, cycleReminderMinute: minute });
      },

      connectPartner: () => set({ partnerConnected: true }),

      setPremium: (status) => set({ isPremium: status }),

      applyRemoteCouple: (row) =>
        set((state) => row.id !== state.coupleId ? {} : ({
          lastPeriodStartDate: state.userRole === 'her' && state.pendingCycleSync ? state.lastPeriodStartDate
            : row.cycle_start_date && parseDateKey(row.cycle_start_date) ? row.cycle_start_date : state.lastPeriodStartDate,
          ...normalizeCycleLengths(state.userRole === 'her' && state.pendingCycleSync ? state.cycleLength : row.cycle_length ?? state.cycleLength,
            state.userRole === 'her' && state.pendingCycleSync ? state.periodLength : row.period_length ?? state.periodLength),
          shareCalendarWithPartner: row.share_calendar_with_partner === true,
          calendarConsentVerified: true,
          partnerAccessVerified: true,
          partnerAccessRevoked: false,
          loggedSymptomsToday: Array.isArray(row.symptoms)
            ? row.symptoms
            : state.loggedSymptomsToday,
          partnerConnected: Boolean(row.partner_uuid),
          activeSOS: row.sos_active
            ? {
                id: state.activeSOS?.id ?? uid(),
                type: row.sos_type ?? 'custom',
                message: row.sos_message ?? undefined,
                timestamp: state.activeSOS?.timestamp ?? Date.now(),
                active: true,
              }
            : null,
        })),

      resetToDefault: () => set({ ...DEFAULT_STATE }),
    }),
    {
      name: 'sway-cycle-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ calendarConsentVerified: _verified, partnerAccessVerified: _access, isPremium: _premium, syncRevision: _revision, ...state }) => state,
      merge: (persisted, current) => {
        const saved = (persisted ?? {}) as Partial<CycleStoreState>;
        const merged = { ...current, ...saved, calendarConsentVerified: false, partnerAccessVerified: false, isPremium: false };
        return {
          ...merged,
          ...normalizeCycleLengths(merged.cycleLength, merged.periodLength),
          lastPeriodStartDate: parseDateKey(merged.lastPeriodStartDate) ? merged.lastPeriodStartDate : toDateKey(new Date()),
          shareCalendarWithPartner: merged.shareCalendarWithPartner === true,
          cycleReminderEnabled: merged.cycleReminderEnabled === true,
          cycleReminderHour: Number.isInteger(merged.cycleReminderHour) && merged.cycleReminderHour >= 0 && merged.cycleReminderHour <= 23 ? merged.cycleReminderHour : 20,
          cycleReminderMinute: Number.isInteger(merged.cycleReminderMinute) && merged.cycleReminderMinute >= 0 && merged.cycleReminderMinute <= 59 ? merged.cycleReminderMinute : 0,
        };
      },
    },
  ),
);

export default useCycleStore;
