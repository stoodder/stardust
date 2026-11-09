// Rocks (decor): clay-ramp boulders, so they turn rust in Act II and crystal in Act III.
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
  },
});
