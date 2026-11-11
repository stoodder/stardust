// Rocks (decor): clay-ramp boulders, so they turn rust in Act II; Act III's maps draw `night`.
import { defineSprite } from '../defineSprite.ts';
import { ENV_VARIANTS } from '../tiles/tileGen.ts';

export const propRock = defineSprite({
  id: 'prop.rock',
  size: { w: 16, h: 11 },
  anchor: { x: 8, y: 8 },
  palette: 'act1',
  variants: ENV_VARIANTS,
  outline: 'auto',
  // prettier-ignore
  frames: {
    v0: [
      '....ddc.........',
      '..cddeddc.......',
      '.cdddddccb......',
      '.ccdddccbb..dd..',
      'bccccccbba.ddec.',
      'bbccccbbbacdddcb',
      'abbbbbbbaabccccb',
      '.aabbbbaa.abbbba',
      '___aaaa_____aaa_',
      '.______..______.',
      '................',
    ],
    // Act III's (`night`, T640c): the boulder in the dark, only its crown catching the crystal's
    // light, so the crystal ramp's bright steps never make it a glowing blob.
    night: [
      '....bba.........',
      '..abbcbba.......',
      '.abbbbbaa1......',
      '.aabbbaa11..bb..',
      '1aaaaaa110.bbca.',
      '11aaaa1110abbba1',
      '01111111001aaaa1',
      '.00111100.011110',
      '___0000_____000_',
      '.______..______.',
      '................',
    ],
  },
});
