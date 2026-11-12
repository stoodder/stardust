// Stardust, the meta currency, as a thing you can hold (art-direction § 2, *The Stardust currency
// icon*; § 6, *Gift stones*; T843). Its icon follows where the Stardust comes from: in Acts I–II
// Everglow's candy-cut gem (its cycle cooling from pink-gold candy to a cold edge as the truth
// comes out), from Act III the warrens' gift stone, a smooth rounded pebble with the hum-glyph
// scratched into it at 1 px, glowing `stardust.sung`, and in the finale the same stone in its
// warmer gold cycle: remembered, not undone.
//
// One 8×8 icon per phase (6×6 authored plus the outline, the currency icons' size), each with the
// icons' single `icon` frame: `icon.stardust` (Act I), `icon.stardust_act2`, `icon.stardust_act3`,
// `icon.stardust_finale` (`STARDUST_ICON` by phase). An icon is a still (its cycle at its first
// step); the stone set down in the world, `prop.gift_stone` (props/gift_stone.ts), shimmers
// (`painted` at each step of its cycle).
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

/** The cycle's step: three colours rotating every 150 ms (art-direction § 2, *Stardust shimmer*). */
export const SHIMMER_FPS = 1000 / 150;

/** The phases the icon changes with (the currency's story; art-direction § 2's table). */
export const STARDUST_PHASES = ['act1', 'act2', 'act3', 'finale'] as const;
export type StardustPhase = (typeof STARDUST_PHASES)[number];

/*
 * Legend: the cycles' colours and the shades under them.
 * A pink.3, B gold.3, C gold.4, D orange.3, E violet.4 (the cycles' steps),
 * F gold.1, G gold.2 (the stone's shade), H pink.2, I violet.2 (the gems' shade),
 * K white.1 (the candy's glint), L pink.4.
 */
export const STARDUST_LEGEND = {
  A: 'pink.3',
  B: 'gold.3',
  C: 'gold.4',
  D: 'orange.3',
  E: 'violet.4',
  F: 'gold.1',
  G: 'gold.2',
  H: 'pink.2',
  I: 'violet.2',
  K: 'white.1',
  L: 'pink.4',
} as const;

/** Each phase's cycle (its three steps, in order) and the shade it sits on. */
export const CYCLES: Readonly<
  Record<
    StardustPhase,
    { readonly steps: readonly [string, string, string]; readonly shade: string }
  >
> = {
  // The brochure: sparkly pink-gold candy.
  act1: { steps: ['A', 'B', 'C'], shade: 'H' },
  // Warm, with a cold edge creeping in.
  act2: { steps: ['A', 'D', 'E'], shade: 'I' },
  // `stardust.sung`: given, not harvested.
  act3: { steps: ['A', 'B', 'C'], shade: 'G' },
  // Remembered: warm gold.
  finale: { steps: ['B', 'A', 'C'], shade: 'G' },
};

/*
 * Templates: `1`–`3` the cycle's three positions (they rotate frame by frame), `s` the shade, `k` a
 * glint, `b`/`g`/`d` the stone's gold body, shade and deepest shade, `x` the hum-glyph's scratch
 * (pink.3, a singer's arc).
 */
// prettier-ignore
const GEM = [
  '.2332.',
  '23kk32',
  '122221',
  's1221s',
  '.s11s.',
  '..ss..',
] as const;

// The stone is gold all through; only its glints cycle (the shimmer is on emissive pixels).
// prettier-ignore
const STONE = [
  '......',
  '.1b3g.',
  'bxbxbg',
  '2bxbgd',
  '.ggdd.',
  '......',
] as const;

/** A template painted with a cycle at `step` (0–2): position n takes steps[(n - 1 + step) % 3]. */
export function painted(
  template: readonly string[],
  cycle: { readonly steps: readonly [string, string, string]; readonly shade: string },
  step: number,
): string[] {
  const map: Readonly<Record<string, string>> = {
    '1': cycle.steps[step % 3]!,
    '2': cycle.steps[(step + 1) % 3]!,
    '3': cycle.steps[(step + 2) % 3]!,
    s: cycle.shade,
    b: 'B',
    g: 'G',
    d: 'F',
    k: 'K',
    x: 'A',
  };
  return template.map((row) =>
    row
      .split('')
      .map((ch) => map[ch] ?? ch)
      .join(''),
  );
}

/** A phase's icon: one `icon` frame (the icon contract), its cycle at its first step. */
function stardustIcon<const Id extends string>(id: Id, phase: StardustPhase) {
  const template = phase === 'act1' || phase === 'act2' ? GEM : STONE;
  return defineSprite({
    id,
    size: { w: GLYPH, h: GLYPH },
    anchor: { x: 0, y: 0 },
    palette: 'everglow',
    outline: 'auto',
    legend: STARDUST_LEGEND,
    frames: { icon: painted(template, CYCLES[phase], 0) },
  });
}

/** Acts I–II: Everglow's candy-cut gem, its cycle cooling in Act II. */
export const iconStardust = stardustIcon('icon.stardust', 'act1');
export const iconStardustAct2 = stardustIcon('icon.stardust_act2', 'act2');
/** From Act III: the warrens' gift stone, `stardust.sung`; in the finale, its warmer gold. */
export const iconStardustAct3 = stardustIcon('icon.stardust_act3', 'act3');
export const iconStardustFinale = stardustIcon('icon.stardust_finale', 'finale');

/** Every phase's icon, in story order (the registry takes them all). */
export const STARDUST_ICONS = [
  iconStardust,
  iconStardustAct2,
  iconStardustAct3,
  iconStardustFinale,
] as const;

/** The icon a screen shows for the phase the story is in (art-direction § 2's table). */
export const STARDUST_ICON: Readonly<Record<StardustPhase, (typeof STARDUST_ICONS)[number]['id']>> =
  {
    act1: 'icon.stardust',
    act2: 'icon.stardust_act2',
    act3: 'icon.stardust_act3',
    finale: 'icon.stardust_finale',
  };
