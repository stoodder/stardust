// The HUD's 8×8 glyphs (art-direction §5): the credits chip, the core-integrity orb, and the lock
// on a locked build slot. Authored 6×6; the outline makes them 8×8.
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

// prettier-ignore
export const iconCredits = defineSprite({
  id: 'icon.credits',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The gold chip (art-direction §5), straight from the master palette.
  legend: { A: 'gold.1', B: 'gold.2', C: 'gold.3', D: 'gold.4' },
  frames: {
    icon: [
      '.CCCB.',
      'CDCCBB',
      'CCBCBA',
      'CCBCBA',
      'BBCBAA',
      '.BAAA.',
    ],
  },
});

// prettier-ignore
export const iconCore = defineSprite({
  id: 'icon.core',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The colony core's teal orb (prop.core), the thing integrity protects.
  frames: {
    icon: [
      '.8888.',
      '89w*87',
      '89*877',
      '888776',
      '787766',
      '.7666.',
    ],
  },
});

// prettier-ignore
export const iconLock = defineSprite({
  id: 'icon.lock',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: {
    icon: [
      '.3333.',
      '.3..3.',
      '444443',
      '44k442',
      '44k442',
      '222221',
    ],
  },
});
