// frontend/src/hooks/useIdleTimer.js
import { useEffect, useState } from 'react';

/**
 * Returns true when the user has been idle for `timeout` ms.
 * Resets on any mouse move, key press, click, touch, or scroll.
 */
export function useIdleTimer(timeout = 3000) {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    let t = null;

    const reset = () => {
      setIsIdle(false);
      if (t) clearTimeout(t);
      t = setTimeout(() => setIsIdle(true), timeout);
    };

    reset();

    const opts = { passive: true };
    window.addEventListener('mousemove', reset, opts);
    window.addEventListener('mousedown', reset, opts);
    window.addEventListener('keydown', reset, opts);
    window.addEventListener('touchstart', reset, opts);
    window.addEventListener('wheel', reset, opts);

    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('mousedown', reset);
      window.removeEventListener('keydown', reset);
      window.removeEventListener('touchstart', reset);
      window.removeEventListener('wheel', reset);
    };
  }, [timeout]);

  return isIdle;
}