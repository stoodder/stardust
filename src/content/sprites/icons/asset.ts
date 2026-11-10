// The asset meter's 8×8 glyph (T431; art-direction §9: the HUD's top-left meters): A2M2's
// extraction rig, the first asset a Protect map guards (D111), drawn like the core's orb beside the
// core meter. An A-frame derrick on an Everglow slab with a beacon lamp; `icon.asset.rig_critical`
// lights the lamp red once the asset is in its low band (half the meter: one rig of two down),
// beside the meter's "!" alarm. Each glyph has the one `icon` frame (art-direction §5). Authored
// 6×6; the outline makes them 8×8.
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

// prettier-ignore
export const iconAssetRig = defineSprite({
  id: 'icon.asset.rig',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // Steel legs lit from the upper left, a darker brace, the orange slab, and the gold beacon lamp.
  legend: {
    A: 'steel.3',
    B: 'steel.4',
    X: 'steel.2',
    O: 'orange.3',
    G: 'gold.4',
    R: 'red.3',
  },
  frames: {
    icon: [
      '..GG..',
      '..BA..',
      '.BXXA.',
      '.B..A.',
      'BXXXXA',
      'OOOOOO',
    ],
  },
});

// prettier-ignore
export const iconAssetRigCritical = defineSprite({
  id: 'icon.asset.rig_critical',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The same rig, its beacon lamp red: the asset is low.
  legend: {
    A: 'steel.3',
    B: 'steel.4',
    X: 'steel.2',
    O: 'orange.3',
    G: 'gold.4',
    R: 'red.3',
  },
  frames: {
    icon: [
      '..RR..',
      '..BA..',
      '.BXXA.',
      '.B..A.',
      'BXXXXA',
      'OOOOOO',
    ],
  },
});
