// M7's 8×8 glyphs (art-direction §8 *Trait tells*, §5 *Sizes*): authored 6×6 plus the outline,
// each a shape first and a colour second, like the glyphs in glyphs.ts.
// - `disabler` (the jammers: the Silencer, the Auditor): a lightning bolt, `orange.3` lit
//   `orange.4`, the safety colour of the Auditor's ring, zagging down left to a point.
// - `healer` (the Maintenance Associate's aura): a plus, `green.3` with a `green.4` heart, its arms
//   one pixel shorter than the box so the outline keeps it a cross, never a square.
// - `icon.jammed` (a HUD glyph, not a tell: a Jammed tower, for the panel and the HUD that name it):
//   the jam's static between two steel brackets: a `white.1` / `teal.4` zigzag (the colours of
//   `fx.jam_static`) cut across a dead screen, the brackets the tell's jagged bracket squared off.
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

// prettier-ignore
export const iconTellDisabler = defineSprite({
  id: 'icon.tell.disabler',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { C: 'orange.3', D: 'orange.4' },
  frames: {
    icon: [
      '...DD.',
      '..DC..',
      '.DDDDC',
      '...CC.',
      '..CC..',
      '.C....',
    ],
  },
});

// prettier-ignore
export const iconTellHealer = defineSprite({
  id: 'icon.tell.healer',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { G: 'green.3', A: 'green.4' },
  frames: {
    icon: [
      '..GG..',
      '..GG..',
      'GGAAGG',
      'GGAAGG',
      '..GG..',
      '..GG..',
    ],
  },
});

// prettier-ignore
export const iconJammed = defineSprite({
  id: 'icon.jammed',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // `4` steel.4 brackets, `k` the dead screen, `w`/`*` the static (white.1 / teal.4).
  frames: {
    icon: [
      '44kk44',
      '4kkkk4',
      '*kwk*k',
      'kwk*kw',
      '4kkkk4',
      '44kk44',
    ],
  },
});

/** M7's glyphs, in gallery order (sprites/index.ts spreads them into SPRITES). */
export const M7_GLYPHS = [iconTellDisabler, iconTellHealer, iconJammed] as const;
