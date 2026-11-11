// The unravel mote (`fx.unravel_mote`; art-direction §4 *Hollow pieces scatter violet*, §7): one
// of the cold `stardust.unsung` motes a Hollow unit comes apart into, drifting up and away, never
// warm. Three looks of one mote twinkling as it goes (`drift`, 6 fps): `m0` a small cross, a
// `white.1` core in `violet.4` arms; `m1` a `violet.4` pixel over a `violet.3` one; `m2` a lone
// `violet.3` speck. No outline: it's light, not a body. Centred on its middle pixel.
// TransientFx draws the unravel as debris pixels today; T630a may draw these instead.
import { defineSprite } from '../defineSprite.ts';

const LEGEND = { V: 'violet.3', U: 'violet.4', W: 'white.1' } as const;

// prettier-ignore
export const fxUnravelMote = defineSprite({
  id: 'fx.unravel_mote',
  size: { w: 3, h: 3 },
  anchor: { x: 1, y: 1 },
  palette: 'hollow',
  legend: LEGEND,
  frames: {
    m0: ['.U.', 'UWU', '.U.'],
    m1: ['.U.', '.V.', '...'],
    m2: ['...', '.V.', '...'],
  },
  anims: {
    drift: { frames: ['m0', 'm1', 'm2', 'm1'], fps: 6 },
  },
});
