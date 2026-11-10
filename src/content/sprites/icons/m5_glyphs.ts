// M5's tell glyphs (art-direction §8 *Trait tells*; T501k): 8×8, authored 6×6 plus the outline,
// each a shape first and a colour second, like the glyphs in glyphs.ts.
// - `stealth` (Cloaked): a dashed eye, pattern only: its lids broken into dashes round a white
//   pupil, steel and white, so no hue carries it.
// - `blink`: a dotted arrow, `violet.4` lit over `violet.3`: a dot of shaft, a gap, the rest of
//   the shaft into an open chevron head.
// - `shield_aura`: a hexagon with a plus, the plus `white.1` filling a `blue.4` hexagon shaded
//   `blue.3` over a dark `blue.1` pane in its corners (the Shielded glyph is the plain pane; this
//   one adds the plus of the recharge).
// - `phasing`: a broken circle, `teal.4` shaded `teal.3`, open at two places, its middle half
//   there (a dithered `teal.2` speck).
// - `heavy` (a Hollow unit that has hushed someone): a weight, its handle a loop on top and its
//   body widening to a heavy foot, `acid.3` shaded `acid.2`, inside the Hollow's pale outline (its
//   palette), so it reads wrong like the Hollow's.
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

// prettier-ignore
export const iconTellStealth = defineSprite({
  id: 'icon.tell.stealth',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { C: 'steel.4', W: 'white.1' },
  frames: {
    icon: [
      '.C..C.',
      'C....C',
      '..WW..',
      '..WW..',
      'C....C',
      '.C..C.',
    ],
  },
});

// prettier-ignore
export const iconTellBlink = defineSprite({
  id: 'icon.tell.blink',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { C: 'violet.3', D: 'violet.4' },
  frames: {
    icon: [
      '...D..',
      '....D.',
      'D.DDDD',
      '....C.',
      '...C..',
      '......',
    ],
  },
});

// prettier-ignore
export const iconTellShieldAura = defineSprite({
  id: 'icon.tell.shield_aura',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { A: 'blue.1', C: 'blue.3', D: 'blue.4', W: 'white.1' },
  frames: {
    icon: [
      '..DD..',
      '.AWWA.',
      'DWWWWC',
      'DWWWWC',
      '.AWWA.',
      '..CC..',
    ],
  },
});

// prettier-ignore
export const iconTellPhasing = defineSprite({
  id: 'icon.tell.phasing',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { B: 'teal.2', C: 'teal.3', D: 'teal.4' },
  frames: {
    icon: [
      '.DD...',
      'D....C',
      'D.B..C',
      'D..B..',
      '.....C',
      '..CCC.',
    ],
  },
});

// prettier-ignore
export const iconTellHeavy = defineSprite({
  id: 'icon.tell.heavy',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  frames: {
    icon: [
      '.dddd.',
      '.d..d.',
      '.dddc.',
      'ddddcc',
      'dddccc',
      '.cccc.',
    ],
  },
});
