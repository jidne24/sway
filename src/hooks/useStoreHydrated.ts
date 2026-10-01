import { useSyncExternalStore } from 'react';
import { useCycleStore } from '../store/useCycleStore';

const subscribe = (onChange: () => void) => {
  const start = useCycleStore.persist.onHydrate(onChange);
  const finish = useCycleStore.persist.onFinishHydration(onChange);
  return () => { start(); finish(); };
};

export function useStoreHydrated() {
  return useSyncExternalStore(subscribe, useCycleStore.persist.hasHydrated, () => false);
}
