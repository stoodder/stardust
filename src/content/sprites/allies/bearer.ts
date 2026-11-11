// The bearers (`ally.bearer`, design/maps.md § 5.4; A3M5, and the finale under C2 Return): Brood
// Haulers carrying the vats' unsung dead home. The Brood Hauler's own body (enemies/brood_hauler.ts,
// so the player knows the creature they used to shoot), in the allies' `skitterkin.ally` palette, and
// on its back the **burden**: the Hauler's sack, now holding stardust taken unsung from the vats, so
// it glows cold violet (`stardust.unsung`'s violet ramp, the glitter a pale violet twinkle) where
// the enemy's sack was parchment and gold. That colour is what reads it as a bearer at 1×.
// - `walk_<facing>` (2 frames, 4 fps): the Hauler's waddle, slower: carrying, not fleeing.
// - `sung_<facing>` (2 frames, 4 fps): the same walk with the burden **warmed** to sung gold
//   (`stardust.sung`'s pink and gold), for the finale's Returned (maps.md § 5.5: the sacks warm from
//   violet to gold as the song rises; T7xx/M8 picks it).
import { defineSprite } from '../defineSprite.ts';
import { hauler } from '../enemies/brood_hauler.ts';
import { SACK_LEGEND } from '../enemies/sack.ts';
import { recolor } from '../helpers.ts';

/** The sack's characters (enemies/sack.ts SACK_LEGEND), each re-pointed for the warmed burden. */
const WARM: Readonly<Record<string, string>> = { G: 'A', H: 'B', J: 'F', I: 'N', P: 'O', Y: 'Z' };

const walk = (facing: 'se' | 'ne', step: 0 | 1): string[] => hauler(facing, step);
const sung = (facing: 'se' | 'ne', step: 0 | 1): string[] => recolor(hauler(facing, step), WARM);

export const allyBearer = defineSprite({
  id: 'ally.bearer',
  size: { w: 28, h: 25 },
  anchor: { x: 14, y: 24 },
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    ...SACK_LEGEND,
    S: 'white.0',
    T: 'steel.4',
    // The unsung burden: the sack's burlap in cold violet, its glitter a pale violet twinkle.
    G: 'violet.4',
    H: 'violet.3',
    J: 'violet.2',
    I: 'violet.1',
    P: 'white.1',
    Y: 'violet.4',
    R: 'grime.2',
    // The warmed burden (`sung_`): sung stardust's gold and pink.
    A: 'gold.4',
    B: 'gold.3',
    F: 'gold.2',
    N: 'gold.1',
    O: 'pink.3',
    Z: 'white.1',
  },
  frames: {
    walk_se_0: walk('se', 0),
    walk_se_1: walk('se', 1),
    walk_ne_0: walk('ne', 0),
    walk_ne_1: walk('ne', 1),
    sung_se_0: sung('se', 0),
    sung_se_1: sung('se', 1),
    sung_ne_0: sung('ne', 0),
    sung_ne_1: sung('ne', 1),
  },
  anims: {
    walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 4 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 4 },
    walk_nw: { mirrorOf: 'walk_ne' },
    sung_se: { frames: ['sung_se_0', 'sung_se_1'], fps: 4 },
    sung_sw: { mirrorOf: 'sung_se' },
    sung_ne: { frames: ['sung_ne_0', 'sung_ne_1'], fps: 4 },
    sung_nw: { mirrorOf: 'sung_ne' },
  },
});
