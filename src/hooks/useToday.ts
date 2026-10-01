import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { addDays, startOfDay } from 'date-fns';
import { toDateKey } from '../utils/cycleDates';

/** Refresh daily predictions at midnight and when returning to the app. */
export function useToday() {
  const [today, setToday] = useState(() => toDateKey(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      clearTimeout(timer);
      setToday(toDateKey(new Date()));
      const nextMidnight = addDays(startOfDay(new Date()), 1).getTime();
      timer = setTimeout(refresh, nextMidnight - Date.now() + 100);
    };
    refresh();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearTimeout(timer); subscription.remove(); };
  }, []);
  return today;
}
