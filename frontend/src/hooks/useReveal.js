// frontend/src/hooks/useReveal.js
// Adds a `revealed` class when an element scrolls into view. Used for
// fade-in / slide-up animations on the welcome page.
//
// Usage:
//   const ref = useReveal();
//   <section ref={ref} className="reveal"> … </section>
//   CSS: .reveal { opacity:0; transform: translateY(24px); }
//        .reveal.revealed { opacity:1; transform:none; transition:… }

import { useEffect, useRef } from 'react';

export function useReveal(options = {}) {
  const { threshold = 0.15, once = true, rootMargin = '0px 0px -60px 0px' } = options;
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // If IntersectionObserver isn't available, just reveal everything
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('revealed');
      return;
    }

    // Respect user preference for reduced motion
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      el.classList.add('revealed');
      return;
    }

    const obs = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            if (once) obs.unobserve(entry.target);
          } else if (!once) {
            entry.target.classList.remove('revealed');
          }
        }
      },
      { threshold, rootMargin }
    );

    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold, once, rootMargin]);

  return ref;
}