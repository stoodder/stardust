// The portraits (T871; architecture.md § 5, *Bundle*): drawn only in the DOM (the comms panel, the
// staging, the HUD's and the intake's faces), never in the atlas. A lazy chunk of their own
// (app/portraitContent.ts loads it at boot and the content gate waits for it before any screen
// shows), so their grids aren't in the initial JS. Their ids are in `SpriteId` all the same.
import { portraitBramble } from './bramble.ts';
import { portraitBricks } from './bricks.ts';
import { portraitGerald } from './gerald.ts';
import { portraitGoldie } from './goldie.ts';
import { portraitKip } from './kip.ts';
import { portraitPebble } from './pebble.ts';
import { portraitPlayer } from './player.ts';
import { portraitPrim } from './prim.ts';
import { portraitQuill } from './quill.ts';
import { portraitSterling } from './sterling.ts';
import { portraitThrum } from './thrum.ts';
import { portraitVesthara } from './vesthara.ts';
import { portraitZibzab } from './zibzab.ts';

/** Every portrait, in gallery order. */
export const PORTRAIT_SPRITES = [
  portraitPlayer,
  portraitBricks,
  portraitQuill,
  portraitSterling,
  portraitZibzab,
  portraitGoldie,
  portraitKip,
  portraitPrim,
  portraitGerald,
  portraitVesthara,
  portraitPebble,
  portraitBramble,
  portraitThrum,
] as const;
