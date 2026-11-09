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

// prettier-ignore
export const iconTellFast = defineSprite({
  id: 'icon.tell.fast',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `fast` tell (art-direction §8): a double chevron », `orange.4` lit over `orange.3`.
  legend: { C: 'orange.3', D: 'orange.4' },
  frames: {
    icon: [
      'D..D..',
      'DD.DD.',
      '.DD.DD',
      '.CC.CC',
      'CC.CC.',
      'C..C..',
    ],
  },
});

// prettier-ignore
export const iconTellCarrier = defineSprite({
  id: 'icon.tell.carrier',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `carrier` tell (art-direction §8): a box with a dot, `gold.3` lit to `gold.4`.
  legend: { B: 'gold.2', C: 'gold.3', D: 'gold.4' },
  frames: {
    icon: [
      'DDDDDC',
      'D....B',
      'D.DD.B',
      'D.DC.B',
      'D....B',
      'CBBBBB',
    ],
  },
});

// prettier-ignore
export const iconTellArmored = defineSprite({
  id: 'icon.tell.armored',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `armored` tell (art-direction §8): a square plate, `steel.4` lit to `white.0`, with a
  // dark rivet in each corner.
  legend: { A: 'steel.2', B: 'steel.3', C: 'steel.4', D: 'white.0', R: 'steel.1' },
  frames: {
    icon: [
      'DCCCCB',
      'CRCCRB',
      'CCCCCB',
      'CCCCCB',
      'CRCCRA',
      'BBBBAA',
    ],
  },
});
