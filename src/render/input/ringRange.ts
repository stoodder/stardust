// A placed tower's range ring as the hover and the selection draw it (art-direction.md § Range rings
// and placement; scenes/BattleHover.ts): the range the tower really fires at, read through the
// sim's own stacking (`bonusRangeTiles`: its links, its tile and the dark), so the ring and the
// tower's targeting never disagree (review C5).
import type { IdSpace } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  bonusRangeTiles,
  darkDims,
  darkRangeMul,
  detectRadiusTiles,
  type Modifier,
  type Tower,
} from '../../sim/index.ts';

/**
 * A placed tower's range ring (tiles; 0: none): its stacked range, dark included, or, for a
 * tower without an attack, its detection radius (the Lookout; T406).
 */
export function ringRangeTiles(
  t: DeepReadonly<Tower> | null,
  modifiers: readonly Modifier<IdSpace>[],
): number {
  if (t === null) return 0;
  const attack = t.tierDef?.attack ?? null;
  return attack !== null ? bonusRangeTiles(attack, t) : detectRadiusTiles(t, modifiers);
}

/** Whether the ring dims: a tower with an attack the darkness reaches (Sundown; T505). */
export function ringDimmed(
  t: Pick<DeepReadonly<Tower>, 'tierDef' | 'darkRangePct'> | null,
): boolean {
  return t !== null && (t.tierDef?.attack ?? null) !== null && t.darkRangePct > 0;
}

/** The armed tower's placement-preview ring: its tier-1 reach from the hovered tile. */
export interface PreviewRing {
  /** Tiles: the authored attack range (or detection radius), shortened by the dark if it dims. */
  rangeTiles: number;
  /** Whether the ring dims: the dark reaches this tower here (unlit, and `darkDims`). */
  dimmed: boolean;
}

/**
 * The placement preview's ring (scenes/BattleHover.ts): a tower without an attack (the Lookout)
 * shows its detection radius (T406); out of every light the ring shrinks with the dark and dims
 * (Sundown, T505), but only for a tower the dark shortens (`darkDims`: not the Lookout, not the
 * Lantern, whose beam reaches its detection radius; D138, D139 S2). `litAt` is asked only when it
 * matters. Writes into `out` (the hover runs every frame) and returns it.
 */
export function previewRing(
  tier: {
    readonly attack: { readonly rangeTiles: number } | null;
    readonly detect: { readonly radiusTiles: number } | null;
  },
  dark: number,
  litAt: () => boolean,
  out: PreviewRing,
): PreviewRing {
  const range = tier.attack?.rangeTiles ?? tier.detect?.radiusTiles ?? 0;
  const lit = dark === 0 || !darkDims(tier) || litAt();
  out.rangeTiles = range * darkRangeMul(dark, lit);
  out.dimmed = !lit;
  return out;
}
