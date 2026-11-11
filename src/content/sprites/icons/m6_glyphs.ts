// M6's tell glyphs (art-direction §8 *Trait tells*): 8×8, authored 6×6 plus the outline, each a
// shape first and a colour second, like the glyphs in glyphs.ts.
// - `consumer` (Gathering, the Maw): inward arrows, the Maw's tendrils pulling in: a wedge from
//   each side (▶ ◀), `acid.2` lit `acid.3` toward their points, pinching a dark mouth between
//   them, inside the Hollow's pale outline (its palette), so it reads wrong like the Hollow's and
//   holds on Act III's near-black ground as on grass.
// - `haste_aura` (the Expediter): a double chevron with a ring: `fast`'s » (`orange.4` over
//   `orange.3`) set in a ring of deep `orange.1` that fills the gaps round it (the swing of the
//   Expediter's metronome), so it reads as a round "fast-forward" badge: `fast`'s family, never
//   `fast` itself. (In 6×6 a » shorter than six rows reads as "22", and one inside a drawn ring
//   breaks into a checker, so the ring takes the gaps.)
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
  legend: { A: 'orange.1', C: 'orange.3', D: 'orange.4' },
  frames: {
    icon: [
      'DAADA.',
      'DD.DDA',
      'ADD.DD',
      'ACC.CC',
      'CC.CCA',
      'CAACA.',
    ],
  },
});
