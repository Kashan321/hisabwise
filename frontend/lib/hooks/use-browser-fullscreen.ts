'use client';

import { useCallback, useEffect, useState } from 'react';

export function useBrowserFullscreen() {
  const [active, setActive] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const doc = document.documentElement;
    setSupported(typeof doc.requestFullscreen === 'function');
    const sync = () => setActive(Boolean(document.fullscreenElement));
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* blocked without user gesture or by browser policy */
    }
  }, []);

  return { active, supported, toggle };
}
