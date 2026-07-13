import { useEffect, useRef, useState } from "react";

/**
 * CountUp — the app's signature moment. Animates a number from 0 (or its
 * previous value) up to `value` with an ease-out curve, so the savings figure
 * "arrives" rather than just appearing.
 *
 * - `format` shapes the displayed number (e.g. formatINR).
 * - Respects prefers-reduced-motion: shows the final value immediately.
 * - Used ONCE per page (the savings reveal) — deliberately not sprinkled around.
 */
export default function CountUp({ value, format = (n) => n, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0); // animate from the previous value on updates

  useEffect(() => {
    const target = Number(value) || 0;

    // Reduced motion: no animation, just the result.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      fromRef.current = target;
      setDisplay(target);
      return;
    }

    const from = fromRef.current;
    let raf;
    const start = performance.now();

    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };

    raf = requestAnimationFrame(tick);

    // Browsers pause requestAnimationFrame in hidden/background tabs — without
    // this, the number would freeze at its starting value. Once the animation
    // window has passed, guarantee the true value is shown.
    const settle = setTimeout(() => {
      fromRef.current = target;
      setDisplay(target);
    }, duration + 100);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(settle);
    };
  }, [value, duration]);

  return <span>{format(display)}</span>;
}
