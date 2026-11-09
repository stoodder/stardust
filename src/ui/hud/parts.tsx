// Small pieces the HUD's components share: the key-hint badge, the credits chip, the 8×8 pixel
// glyphs (Hold fire's pause bars, Spare runners' arrow), and the number ticker.
import { useEffect, useRef, useState } from 'preact/hooks';
import { Icon } from './Icon.tsx';
import { tickToward } from './layout.ts';
import { prefersReducedMotion } from '../motion.ts';

/** A number that ticks toward `value` instead of jumping (art-direction § Look). */
export function useTicker(value: number): number {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number): void => {
      const next = prefersReducedMotion() ? value : tickToward(shownRef.current, value, now - last);
      last = now;
      shownRef.current = next;
      setShown(next);
      if (next !== value) raf = requestAnimationFrame(step);
    };
    if (shownRef.current !== value) raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return shown;
}

/** A small key-hint badge. */
export function Key({ k }: { k: string }) {
  return (
    <span class="hud-key" aria-hidden="true">
      {k}
    </span>
  );
}

/** Keeps a pointer press from focusing a button, so its focus ring doesn't linger (D026). */
export const noFocusOnPress = (e: MouseEvent): void => e.preventDefault();

/**
 * A credits amount: the gold chip and the number. `sale`: Clearance Sale discounts it (D077), so
 * the number takes the sale's color and a small down-tick, a shape as well as a color.
 */
export function Credits({
  value,
  short = false,
  sale = false,
}: {
  value: number;
  short?: boolean;
  sale?: boolean;
}) {
  return (
    <span class={`hud-cost${short ? ' short' : ''}${sale ? ' sale' : ''}`}>
      <Icon id="icon.credits" />
      <span class="num">{value}</span>
    </span>
  );
}

/** An 8×8 pixel glyph in SVG from [x, y, w, h] rectangles. */
export function Glyph({
  rects,
}: {
  rects: readonly (readonly [number, number, number, number])[];
}) {
  return (
    <svg
      class="hud-glyph"
      width="8"
      height="8"
      viewBox="0 0 8 8"
      shape-rendering="crispEdges"
      aria-hidden="true"
      fill="currentColor"
    >
      {rects.map(([x, y, w, h]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={w} height={h} />
      ))}
    </svg>
  );
}

/** Hold fire: the pause bars (the same mark a holding tower wears on the playfield). */
export const HOLD_GLYPH = [
  [1, 1, 2, 6],
  [5, 1, 2, 6],
] as const;
/** Spare runners: an arrow pointing back the way they came. */
export const SPARE_GLYPH = [
  [0, 3, 8, 2],
  [1, 2, 1, 4],
  [2, 1, 1, 6],
  [3, 0, 1, 2],
  [3, 6, 1, 2],
] as const;
