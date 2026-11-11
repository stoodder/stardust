// M7's props for A3M4–A3M6 (T740c; art-direction §6, act3.md per map), gathered for the registry
// (`M7_PROPS` in sprites/index.ts). The Shelters (A3M4): the generator, the hall door, the bays,
// the last Fun Friday banner, HE HELD THE DOOR, the humming ring, Gerald's mail chute. Second
// Harvest at night (A3M5): "Shareholder Value"'s hangar and its crash-site plates (the vats' blaze
// and the feed lines are frames of `prop.vat` and `prop.wreckage`). Dome Row at night (A3M6): the
// lettuce-crate barricade, Pebble on the Peeker's rock, Zibzab's crate (Dome 1 open and frosting is
// `prop.dome`'s; the 2-wide lane is `tile.path`'s).
import { propBannerFriday } from './banner_friday.ts';
import { propBarricade } from './barricade.ts';
import { propCrashPlate } from './crash_plate.ts';
import { propCrate } from './crate.ts';
import { propGenerator } from './generator.ts';
import { propHallDoor } from './hall_door.ts';
import { propHangar } from './hangar.ts';
import { propHeldDoor } from './held_door.ts';
import { propHummingRing } from './humming_ring.ts';
import { propMailChute } from './mail_chute.ts';
import { propPebbleRock } from './pebble_rock.ts';
import { propShelterBay } from './shelter_bay.ts';

export const M7_PROPS = [
  propGenerator,
  propHallDoor,
  propShelterBay,
  propBannerFriday,
  propHeldDoor,
  propHummingRing,
  propMailChute,
  propHangar,
  propCrashPlate,
  propBarricade,
  propPebbleRock,
  propCrate,
] as const;
