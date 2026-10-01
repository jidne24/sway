import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useCycleStore } from '../store/useCycleStore';
import { configureEmpathyReminder, configureCycleReminder } from '../services/empathyNotifications';
import { navigationRef } from '../navigation/navigationRef';

/** Both reminder kinds wait for hydration/navigation; partner routes also wait for server access. */
export function openEmpathyBrief(received?: Notifications.NotificationResponse) {
  if (Platform.OS === 'web') return;
  const response = received ?? Notifications.getLastNotificationResponse();
  const kind = response?.notification.request.content.data?.kind;
  if (kind !== 'empathy-reminder' && kind !== 'cycle-reminder') return;
  if (!navigationRef.isReady()) return;
  const state = useCycleStore.getState();
  if (kind === 'empathy-reminder' && state.userRole === 'partner' && state.coupleId && !state.partnerAccessVerified) return;
  if (kind === 'empathy-reminder' && state.userRole === 'partner' && state.coupleId && state.partnerAccessVerified) {
    navigationRef.navigate('Main', { screen: 'Brief' });
  } else if (kind === 'cycle-reminder' && state.userRole === 'her') {
    navigationRef.navigate('Main', { screen: 'Tracker' });
  }
  Notifications.clearLastNotificationResponse();
}

export function useEmpathyNotifications(ready: boolean) {
  const role = useCycleStore(s => s.userRole);
  const enabled = useCycleStore(s => s.empathyReminderEnabled);
  const hour = useCycleStore(s => s.empathyReminderHour);
  const minute = useCycleStore(s => s.empathyReminderMinute);
  const cycleEnabled = useCycleStore(s => s.cycleReminderEnabled);
  const cycleHour = useCycleStore(s => s.cycleReminderHour);
  const cycleMinute = useCycleStore(s => s.cycleReminderMinute);
  const verified = useCycleStore(s => s.partnerAccessVerified);
  useEffect(() => { if (ready && (verified || role === 'her')) openEmpathyBrief(); }, [ready, verified, role]);
  useEffect(() => {
    if (!ready || Platform.OS === 'web') return;
    const reconcile = () => {
      const state = useCycleStore.getState();
      const partnerEnabled = state.userRole === 'partner' && state.partnerAccessVerified && state.partnerConnected && state.empathyReminderEnabled;
      void configureEmpathyReminder(partnerEnabled, state.empathyReminderHour, state.empathyReminderMinute)
        .then(allowed => {
          const current = useCycleStore.getState();
          if (!allowed && current.userRole === state.userRole && current.empathyReminderEnabled
            && current.empathyReminderHour === state.empathyReminderHour && current.empathyReminderMinute === state.empathyReminderMinute) {
            current.setEmpathyReminder(false, state.empathyReminderHour, state.empathyReminderMinute);
          }
        }).catch(error => console.warn('[Sway Reminders] Could not reconcile empathy reminder:', error));
      void configureCycleReminder(state.userRole === 'her' && state.cycleReminderEnabled, state.cycleReminderHour, state.cycleReminderMinute)
        .then(allowed => {
          const current = useCycleStore.getState();
          if (!allowed && current.userRole === 'her' && current.cycleReminderEnabled
            && current.cycleReminderHour === state.cycleReminderHour && current.cycleReminderMinute === state.cycleReminderMinute) {
            current.setCycleReminder(false, state.cycleReminderHour, state.cycleReminderMinute);
          }
        }).catch(error => console.warn('[Sway Reminders] Could not reconcile cycle reminder:', error));
    };
    reconcile();
    const foreground = AppState.addEventListener('change', state => { if (state === 'active') reconcile(); });
    const response = Notifications.addNotificationResponseReceivedListener(openEmpathyBrief);
    return () => { foreground.remove(); response.remove(); };
  }, [ready, role, enabled, hour, minute, cycleEnabled, cycleHour, cycleMinute, verified]);
}
