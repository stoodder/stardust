// C4 Purge's open panel (`fx.open_panel`; design/enemies.md § 5.3: every Everglow unit of a Purge
// run spawns with its armor −2 and a maintenance hatch hanging open): an overlay a view draws on the
// flank of any Everglow body, so every unit (the boss and its drones too) gets it without frames of
// its own. A dark service bay in a steel frame, its hatch door (pale `steel.4`, lit along its top,
// two bolt heads) swung open on its hinge and hanging off the side, a loose cable curling out of the
// bay. `dark`: the bay unlit; `spark`: an `orange.4` spark spitting in the bay (QUILL working
// against it from inside; render blinks the two on the tell step). Anchored at its top-left, where
// it hooks onto the body's right edge. Until T730a wires it in, HealAuraView draws its own 5×6 one.
import { defineSprite } from '../defineSprite.ts';

// prettier-ignore
const DARK = [
  '22222...',
  '2kkk2T..',
  '2kkk2TS.',
  '2kkk2TT.',
  '2kk02TS.',
  '22c22TT.',
  '..c..T..',
  '..cc....',
] as const;

// prettier-ignore
const SPARK = [
  '22222...',
  '2kwk2T..',
  '2eke2TS.',
  '2kek2TT.',
  '2kk02TS.',
  '22c22TT.',
  '..c..T..',
  '..cc....',
] as const;

export const fxOpenPanel = defineSprite({
  id: 'fx.open_panel',
  size: { w: 8, h: 8 },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['a4'], radius: 1 },
  legend: { S: 'white.0', T: 'steel.4' },
  frames: { dark: [...DARK], spark: [...SPARK] },
  anims: { blink: { frames: ['dark', 'spark'], fps: 3 } },
});
