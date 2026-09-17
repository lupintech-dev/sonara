// frontend/src/hooks/useDoubleTap.js
import { useRef, useCallback, useEffect } from 'react';

/**
 * Single vs double tap/click on ONE button.
 * Works identically on desktop and mobile (uses onClick, which Chromium
 * fires reliably on touch — unlike onPointerDown which can drop events).
 */
export function useDoubleTap({ onSingle, onDouble, window: windowMs = 350 }) {
  const lastClickRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastClickRef.current;

    if (elapsed > 0 && elapsed < windowMs) {
      // Second tap → double
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      lastClickRef.current = 0;
      onDouble?.();
    } else {
      // First tap → wait for possible second
      lastClickRef.current = now;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onSingle?.();
      }, windowMs);
    }
  }, [onSingle, onDouble, windowMs]);
}