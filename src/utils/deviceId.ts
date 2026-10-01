/**
 * Anonymous device ID — the prototype's pseudo-auth.
 *
 * Generates a random UUID on first launch and persists it in AsyncStorage.
 * Used as `her_uuid` / `partner_uuid` in the `couples` table, so no
 * email/password flow is needed for the demo.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'sway-device-id';

/** RFC-4122 v4 UUID via Math.random — sufficient for a demo device ID. */
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Memoized promise so concurrent callers share one read/generate cycle.
let pending: Promise<string> | null = null;

export function getDeviceId(): Promise<string> {
  if (!pending) {
    pending = (async () => {
      try {
        const existing = await AsyncStorage.getItem(STORAGE_KEY);
        if (existing) return existing;
      } catch (err) {
        console.warn('[Sway] Failed to read device ID:', err);
      }
      const id = uuidv4();
      try {
        await AsyncStorage.setItem(STORAGE_KEY, id);
      } catch (err) {
        console.warn('[Sway] Failed to persist device ID:', err);
      }
      return id;
    })();
  }
  return pending;
}
