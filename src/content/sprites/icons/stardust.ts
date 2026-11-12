// Stardust, the meta currency, as a thing you can hold (art-direction § 2, *The Stardust currency
// icon*; § 6, *Gift stones*; T843). Its icon follows where the Stardust comes from: in Acts I–II
// Everglow's candy-cut gem (its cycle cooling from pink-gold candy to a cold edge as the truth
// comes out), from Act III the warrens' gift stone, a smooth rounded pebble with the hum-glyph
// scratched into it at 1 px, glowing `stardust.sung`, and in the finale the same stone in its
// warmer gold cycle: remembered, not undone.
//
// `icon.stardust` (8×8 with the outline, the currency icons' size): frame `icon` is Act I's gem
// (the default a bare <Icon> shows), then a still per phase (`act1`, `act2`, `act3`, `finale`),
// and per phase three shimmer frames `<phase>_0`–`_2` with an anim `shimmer_<phase>` (the palette
// cycle: three colours rotating every 150 ms). `prop.gift_stone` is a stone set down in the world
// (8×6 authored, 10×8 outlined): `sung_0`–`sung_2`, anim `shimmer`.
import { defineSprite } from '../defineSprite.ts';
import type { AnimDef, FrameDef } from '../types.ts';
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
  Record<StardustPhase, { readonly steps: readonly [string, string, string]; readonly shade: string }>
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

function iconFrames(): { frames: Record<string, FrameDef>; anims: Record<string, AnimDef> } {
  const frames: Record<string, FrameDef> = {};
  const anims: Record<string, AnimDef> = {};
  for (const phase of STARDUST_PHASES) {
    const template = phase === 'act1' || phase === 'act2' ? GEM : STONE;
    for (let step = 0; step < 3; step++) {
      frames[`${phase}_${step}`] = painted(template, CYCLES[phase], step);
    }
    frames[phase] = painted(template, CYCLES[phase], 0);
    anims[`shimmer_${phase}`] = {
      frames: [`${phase}_0`, `${phase}_1`, `${phase}_2`],
      fps: SHIMMER_FPS,
    };
  }
  frames['icon'] = painted(GEM, CYCLES.act1, 0);
  return { frames, anims };
}

const ICON = iconFrames();

export const iconStardust = defineSprite({
  id: 'icon.stardust',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: STARDUST_LEGEND,
  frames: ICON.frames,
  anims: ICON.anims,
});
