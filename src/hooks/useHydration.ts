import { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';

export function useHydration() {
  const [hydrated, setHydrated] = useState(useGameStore.persist.hasHydrated());

  useEffect(() => {
    // Listen to the finish hydration event in case it finishes after mounting
    const unsubFinishHydration = useGameStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // Immediately check hydration state in case it completed between the initial render and the effect
    setHydrated(useGameStore.persist.hasHydrated());

    return () => {
      unsubFinishHydration();
    };
  }, []);

  return hydrated;
}
