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

// prettier-ignore
export const iconTellFlying = defineSprite({
  id: 'icon.tell.flying',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `flying` tell (art-direction §8): a wing caret ^ over a dotted air lane, `white.0`.
  legend: { C: 'steel.4', D: 'white.0' },
  frames: {
    icon: [
      '..DD..',
      '.DCCD.',
      'DC..CD',
      'C....C',
      '......',
      'D.D.D.',
    ],
  },
});

// prettier-ignore
export const iconTellBurrower = defineSprite({
  id: 'icon.tell.burrower',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `burrower` tell (art-direction §8): a down arrow into a line (the ground), `grime.3` lit to
  // `grime.4`.
  legend: { B: 'grime.2', C: 'grime.3', D: 'grime.4' },
  frames: {
    icon: [
      '..DC..',
      'DDDCCB',
      '.DDCB.',
      '..DB..',
      '......',
      'CCCCCB',
    ],
  },
});

// prettier-ignore
export const iconTellSplitter = defineSprite({
  id: 'icon.tell.splitter',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `splitter` tell (art-direction §8): three dots ∴, `pink.3` lit to `pink.4`.
  legend: { B: 'pink.2', C: 'pink.3', D: 'pink.4' },
  frames: {
    icon: [
      '..DC..',
      '..CB..',
      '......',
      '......',
      'DC..DC',
      'CB..CB',
    ],
  },
});

// prettier-ignore
export const iconTellHuddle = defineSprite({
  id: 'icon.tell.huddle',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `huddle` tell (art-direction §8): three circles pressed together over the soft ring under the
  // group, `gold.4` over `gold.3`.
  legend: { B: 'gold.2', C: 'gold.3', D: 'gold.4' },
  frames: {
    icon: [
      '......',
      'DCDCDC',
      'CBCBCB',
      '......',
      'C....C',
      '.CCCC.',
    ],
  },
});

// prettier-ignore
export const iconTellBoss = defineSprite({
  id: 'icon.tell.boss',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  // The `boss` tell (art-direction §8): a crown, `gold.4` lit over `gold.3`, a pink jewel.
  legend: { B: 'gold.2', C: 'gold.3', D: 'gold.4', P: 'pink.3' },
  frames: {
    icon: [
      'D..D..',
      'D.DD.D',
      'DDCCDC',
      'DCPCCC',
      'CCCCCB',
      'BBBBBB',
    ],
  },
});
