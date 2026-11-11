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
 * shows its detection radius (T406); a Hum Choir its song's reach (its widest `choir` aura) and a
 * Stasis Bloom its field's, each × the radius tune-up `radiusPct` (T631: the aura preview,
 * `choirReach`'s and `fieldReachTiles`'s rule before any link); out of every light the ring shrinks
 * with the dark and dims (Sundown, T505), but only for a tower the dark shortens (`darkDims`: not
 * the Lookout, not the Lantern, whose beam reaches its detection radius; D138, D139 S2). `litAt`
 * is asked only when it matters. Writes into `out` (the hover runs every frame) and returns it.
 */
export function previewRing(
  tier: {
    readonly attack: { readonly rangeTiles: number } | null;
    readonly detect: { readonly radiusTiles: number } | null;
    readonly auras?: readonly { readonly kind: string; readonly radiusTiles: number }[];
    readonly field?: { readonly radiusTiles: number } | null;
  },
  dark: number,
  litAt: () => boolean,
  out: PreviewRing,
  radiusPct = 0,
): PreviewRing {
  const range =
    tier.attack?.rangeTiles ?? tier.detect?.radiusTiles ?? supportReach(tier) * (1 + radiusPct);
  const lit = dark === 0 || !darkDims(tier) || litAt();
  out.rangeTiles = range * darkRangeMul(dark, lit);
  out.dimmed = !lit;
  return out;
}

/**
 * Whether the preview ring is a Hum Choir's song (T631, review R14): a tier with no attack and no
 * detection whose reach is its `choir` aura. Its valid ring takes the song's gold (choirLook.ts
 * `SONG_COLOR`), so the preview reads as the ring the placed Choir sings.
 */
export function songRing(tier: {
  readonly attack: unknown;
  readonly detect: unknown;
  readonly auras?: readonly { readonly kind: string; readonly radiusTiles: number }[];
}): boolean {
  if (tier.attack !== null || tier.detect !== null) return false;
  for (const a of tier.auras ?? []) if (a.kind === 'choir' && a.radiusTiles > 0) return true;
  return false;
}

/** A range ring's colour: red when the placement is invalid, else the song's gold or white. */
export function ringKind(valid: boolean, song: boolean): 'valid' | 'invalid' | 'song' {
  if (!valid) return 'invalid';
  return song ? 'song' : 'valid';
}

/** A support tier's reach without its tune-up: its widest `choir` aura, else its field (T631). */
function supportReach(tier: {
  readonly auras?: readonly { readonly kind: string; readonly radiusTiles: number }[];
  readonly field?: { readonly radiusTiles: number } | null;
}): number {
  let r = 0;
  for (const a of tier.auras ?? []) if (a.kind === 'choir' && a.radiusTiles > r) r = a.radiusTiles;
  return r > 0 ? r : (tier.field?.radiusTiles ?? 0);
}
