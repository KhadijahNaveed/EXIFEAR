// Covers R8.8 — reads prefers-reduced-motion and provides it to the component tree

import React, { createContext, useContext, useEffect, useState } from 'react';

const ReducedMotionContext = createContext<boolean>(false);

// ── Provider ──────────────────────────────────────────────────────────────────

interface ReducedMotionProviderProps {
  children: React.ReactNode;
}

export function ReducedMotionProvider({
  children,
}: ReducedMotionProviderProps): React.ReactElement {
  const query = window.matchMedia('(prefers-reduced-motion: reduce)');

  const [reducedMotion, setReducedMotion] = useState<boolean>(query.matches);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');

    const handleChange = (event: MediaQueryListEvent): void => {
      setReducedMotion(event.matches);
    };

    mq.addEventListener('change', handleChange);

    return () => {
      mq.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <ReducedMotionContext.Provider value={reducedMotion}>
      {children}
    </ReducedMotionContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useReducedMotion(): boolean {
  return useContext(ReducedMotionContext);
}
