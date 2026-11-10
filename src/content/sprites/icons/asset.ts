// The asset meter's 8×8 glyph (T431; art-direction §9: the HUD's top-left meters): A2M2's
// extraction rig, the first asset a Protect map guards (D111), drawn like the core's orb beside the
// core meter. An A-frame derrick on an Everglow slab with a beacon lamp; `critical` lights the lamp
// red once the asset is in its low band (half the meter: one rig of two down), so the glyph says
// it by shape and tone beside the meter's "!" alarm. Authored 6×6; the outline makes it 8×8.
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

// prettier-ignore
export const iconAssetRig = defineSprite({
  id: 'icon.asset.rig',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // Steel legs lit from the upper left, a darker brace, the orange slab, and the beacon lamp.
  legend: {
    A: 'steel.2',
    B: 'steel.4',
    X: 'steel.1',
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
    critical: [
      '..RR..',
      '..BA..',
      '.BXXA.',
      '.B..A.',
      'BXXXXA',
      'OOOOOO',
    ],
  },
});
