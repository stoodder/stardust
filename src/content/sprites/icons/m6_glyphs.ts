// M6's tell glyphs (art-direction §8 *Trait tells*): 8×8, authored 6×6 plus the outline, each a
// shape first and a colour second, like the glyphs in glyphs.ts.
// - `consumer` (Gathering, the Maw): inward arrows, the Maw's tendrils pulling in: a chevron from
//   each side pointing at a dark mouth between them, `acid.2` lit `acid.3` at their tips, inside
//   the Hollow's pale outline (its palette), so it reads wrong like the Hollow's and holds on
//   Act III's near-black ground as on grass.
// - `haste_aura` (the Expediter): a double chevron with a ring: the » of `fast` (`orange.3` lit
//   `orange.4`) inside a ring that is the Expediter's metronome swing, an arc over it with the
//   pendulum's bob at its top, so it reads as "speeds up the ones round it", never as `fast`
//   alone.
import { defineSprite } from '../defineSprite.ts';
import { GLYPH } from './iconGen.ts';

// prettier-ignore
export const iconTellConsumer = defineSprite({
  id: 'icon.tell.consumer',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  // `+` acid.2, `*` acid.3 (the palette's emissives), `k` the mouth (hollow.0).
  frames: {
    icon: [
      '+....+',
      '*+..+*',
      '.*kk*.',
      '.*kk*.',
      '*+..+*',
      '+....+',
    ],
  },
});

// prettier-ignore
export const iconTellHasteAura = defineSprite({
  id: 'icon.tell.haste_aura',
  size: { w: GLYPH, h: GLYPH },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { C: 'orange.3', D: 'orange.4', B: 'orange.2' },
  frames: {
    icon: [
      '.CDDC.',
      'C....C',
      'BD.D.B',
      'B.D.DB',
      'BD.D.B',
      '.BBBB.',
    ],
  },
});
