// M6's tell glyphs (art-direction §8 *Trait tells*): 8×8, authored 6×6 plus the outline, each a
// shape first and a colour second, like the glyphs in glyphs.ts.
// - `consumer` (Gathering, the Maw): inward arrows, the Maw's tendrils pulling in: a wedge from
//   each side (▶ ◀), `acid.2` lit `acid.3` toward their points, pinching a dark mouth between
//   them, inside the Hollow's pale outline (its palette), so it reads wrong like the Hollow's and
//   holds on Act III's near-black ground as on grass.
// - `haste_aura` (the Expediter): a double chevron with a ring: the » of `fast` (`orange.4` over
//   `orange.3`), squat, over an `orange.2` arc, the swing of the Expediter's metronome pendulum,
//   so it reads as `fast`'s family but never as `fast` alone.
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
      '......',
      '+....+',
      '*+..+*',
      '**kk**',
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
  legend: { B: 'orange.2', C: 'orange.3', D: 'orange.4' },
  frames: {
    icon: [
      'DD.DD.',
      '.DD.DD',
      '.CC.CC',
      'CC.CC.',
      'B....B',
      '.BBBB.',
    ],
  },
});
