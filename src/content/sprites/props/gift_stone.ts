// A gift stone set down in the world (art-direction § 6, *Gift stones*; T843): where the warrens'
// Skitterkin leave one after a map, a smooth gold pebble with the hum-glyph scratched in, its glints
// cycling `stardust.sung`. 8×6 authored (10×8 with the outline); frames `sung_0`–`sung_2`, anim
// `shimmer`. Its look is the Act III Stardust icon's (icons/stardust.ts), a size up.
import { defineSprite } from '../defineSprite.ts';
import { CYCLES, painted, SHIMMER_FPS, STARDUST_LEGEND } from '../icons/stardust.ts';

// prettier-ignore
const STONE = [
  '..1b3g..',
  '.bbbbgg.',
  'bbxbxbgd',
  '2bbxbgdd',
  '.ggggdd.',
  '...ddd..',
] as const;

export const propGiftStone = defineSprite({
  id: 'prop.gift_stone',
  size: { w: 8, h: 6 },
  // Its foot, where it rests on the ground.
  anchor: { x: 4, y: 6 },
  palette: 'skitterkin',
  outline: 'auto',
  legend: STARDUST_LEGEND,
  frames: {
    sung_0: painted(STONE, CYCLES.act3, 0),
    sung_1: painted(STONE, CYCLES.act3, 1),
    sung_2: painted(STONE, CYCLES.act3, 2),
  },
  anims: { shimmer: { frames: ['sung_0', 'sung_1', 'sung_2'], fps: SHIMMER_FPS } },
});
