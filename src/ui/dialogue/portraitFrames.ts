// Which portrait frame a line shows (art-direction.md § Portrait roster; story-runtime.md § Dialogue
// runner): frames are `[<variant>.]<expression>[_talk|_scan]`, plus QUILL's `[<variant>.]
// policy_flash`. A variant or expression the art doesn't have yet falls back, in order: the
// expression's base (EXPRESSION_EXTRAS: `singing` → `happy`), then `neutral`; the variant, then
// the base frame. Pure, so the fallbacks are unit-tested.
import { EXPRESSION_EXTRAS } from '../../content/dialogue/types.ts';

/** A frame's mouth or screen phase: the expression itself, its talk frame, or a scanline phase. */
export type FramePhase = 'rest' | 'talk' | 'scan' | 'flash';

function extraBase(expression: string): string | null {
  for (const extras of Object.values(EXPRESSION_EXTRAS)) {
    const base: unknown = (extras as Readonly<Record<string, string>>)[expression];
    if (typeof base === 'string') return base;
  }
  return null;
}

/** The expressions to try, best first: the line's, its base (for an extra), then `neutral`. */
export function expressionChain(expression: string): string[] {
  const out = [expression];
  const base = extraBase(expression);
  if (base !== null && !out.includes(base)) out.push(base);
  if (!out.includes('neutral')) out.push('neutral');
  return out;
}

/**
 * The frame to draw from `available`, or null when the sprite has none of them. `flash` is QUILL's
 * `policy_flash` (only for `policy`); `talk` and `scan` fall back to the resting frame.
 */
export function pickFrame(
  available: ReadonlySet<string>,
  variant: string | null,
  expression: string,
  phase: FramePhase,
): string | null {
  const variants = variant === null ? [null] : [variant, null];
  // The resting frame first (expression before variant: QUILL's `policy` tell outranks its hat);
  // the talk, scan, and flash frames are that same frame's, else the resting frame.
  for (const expr of expressionChain(expression)) {
    for (const v of variants) {
      const rest = `${v === null ? '' : `${v}.`}${expr}`;
      if (!available.has(rest)) continue;
      const prefix = v === null ? '' : `${v}.`;
      const alt =
        phase === 'talk'
          ? `${rest}_talk`
          : phase === 'scan'
            ? `${rest}_scan`
            : phase === 'flash' && expr === 'policy'
              ? `${prefix}policy_flash`
              : null;
      return alt !== null && available.has(alt) ? alt : rest;
    }
  }
  return null;
}
