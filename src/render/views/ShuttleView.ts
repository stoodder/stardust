// Sterling's shuttle (T630b; A3M2, act3.md § A3M2; art-direction §6 *Sterling's shuttle*): parked on
// its pad (GroundView draws the `shuttle_pad` marker's prop playing `parked`) until the map's
// `a3_m02_cue_shuttle` cue, when the pad drops to its bare `pad` and the shuttle (`ship`, at the
// same anchor, its lift jets firing) rises off it and climbs away north-east, fading as its lights
// cross the sky (shuttleLift.ts `liftPose`, on sim ticks: pause holds it). It flies in `air`, over
// the units. Reduced motion: no climb and no jet flicker; it fades out where it stood. A battle that
// opens after the cue (a checkpoint retry) shows the bare pad. The pad and the ship each wear a
// glow that follows their frame (frameGlow.ts: the nav lights, the lamps, the jets). Allocation-
// free per frame.
import * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { SimEvent } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { FrameGlow } from './frameGlow.ts';
import { cueFired, liftPose, SHUTTLE_CUE, SHUTTLE_MARKER, type LiftPose } from './shuttleLift.ts';
import type { ViewContext } from './ViewContext.ts';

const SHUTTLE = 'prop.shuttle' as const;
/** Its depth tie-break in `air` (not a pooled entity). */
const SHUTTLE_TIE = 0x180;

/** Finds GroundView's prop of `id` standing at screen point (x, y) in `world`, or null. */
function propAt(
  world: Phaser.GameObjects.Layer,
  id: string,
  x: number,
  y: number,
): Phaser.GameObjects.Sprite | null {
  for (const obj of world.list) {
    if (!(obj instanceof Phaser.GameObjects.Sprite)) continue;
    if (obj.frame.name.startsWith(`${id}#`) && obj.x === x && obj.y === y) return obj;
  }
  return null;
}

const at: Vec2 = { x: 0, y: 0 };

export class ShuttleView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #pad: Phaser.GameObjects.Sprite | null = null;
  readonly #padGlow: FrameGlow | null = null;
  readonly #ship: Phaser.GameObjects.Sprite | null = null;
  readonly #shipGlow: FrameGlow | null = null;
  readonly #events: DeepReadonly<CompiledMapDef<IdSpace>['events']>;
  readonly #pose: LiftPose = { dx: 0, dy: 0, alpha: 1, done: false };
  #baseX = 0;
  #baseY = 0;
  /** The sim tick the cue fired at (−1: not yet), and whether the lift is over. */
  #liftTick = -1;
  #gone = false;
  #first = true;
  /** The ship climbing now (for `__sd.render()`). */
  lifting = false;

  constructor(
    ctx: ViewContext,
    map: DeepReadonly<Pick<CompiledMapDef<IdSpace>, 'markers' | 'events'>>,
    reducedMotion: () => boolean,
  ) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#events = map.events;
    const marker = map.markers[SHUTTLE_MARKER];
    if (marker === undefined) return;
    const { scene, sprites, layers, origin } = ctx;
    // GroundView stands the pad's prop on the marker tile's centre.
    gridToScreen(marker[0] + 0.5, marker[1] + 0.5, origin, at);
    this.#pad = propAt(layers.world, SHUTTLE, at.x, at.y);
    if (this.#pad === null) return;
    this.#baseX = this.#pad.x;
    this.#baseY = this.#pad.y;
    this.#padGlow = new FrameGlow(sprites, SHUTTLE, DEFAULT_VARIANT, this.#pad, layers.world);
    const f = sprites.frame(SHUTTLE, 'ship_0');
    const a = sprites.frameAnchor(SHUTTLE, 'ship_0');
    this.#ship = scene.make.sprite({}, false);
    this.#ship.setTexture(f.texture, f.frame).setDisplayOrigin(a.x, a.y).setVisible(false);
    this.#ship.setPosition(this.#baseX, this.#baseY);
    this.#ship.setDepth(worldDepth(this.#baseY, 'enemy', SHUTTLE_TIE));
    layers.air.add(this.#ship);
    this.#shipGlow = new FrameGlow(sprites, SHUTTLE, DEFAULT_VARIANT, this.#ship, layers.air);
  }

  /** Whether the shuttle has left its pad (the cue has fired). */
  get left(): boolean {
    return this.#liftTick >= 0 || this.#gone;
  }

  /** Lifts the ship on the cue (`tick` reads the sim's tick then). Returns the unsubscribe. */
  bind(bus: Bus<SimEvent<IdSpace>>, tick: () => number): () => void {
    if (this.#pad === null) return () => undefined;
    return bus.on('ScriptCue', (e) => {
      if (e.cueId === SHUTTLE_CUE && this.#liftTick < 0 && !this.#gone) this.#lift(tick());
    });
  }

  /** Once a frame: the ship's climb (`tick`: the sim's), and the glows. */
  update(tick: number, fired: readonly boolean[]): void {
    if (this.#pad === null) return;
    if (this.#first) {
      this.#first = false;
      // A battle that opens after the cue (a checkpoint retry): the pad stands bare.
      if (this.#liftTick < 0 && cueFired(this.#events, fired, SHUTTLE_CUE)) {
        this.#bare();
        this.#gone = true;
      }
    }
    const ship = this.#ship!; // made with the pad
    if (this.#liftTick >= 0 && !this.#gone) {
      const still = this.#reducedMotion();
      const p = liftPose(tick - this.#liftTick, still, this.#pose);
      if (p.done) {
        this.#gone = true;
        ship.stop().setVisible(false);
      } else {
        if (still && ship.anims.isPlaying) ship.stop();
        else if (!still && !ship.anims.isPlaying) {
          ship.play(this.#ctx.sprites.anim(SHUTTLE, 'lift'));
        }
        ship.setPosition(this.#baseX + Math.round(p.dx), this.#baseY + Math.round(p.dy));
        ship.setAlpha(p.alpha).setVisible(true);
      }
    }
    this.lifting = ship.visible;
    this.#padGlow?.update();
    this.#shipGlow?.update();
  }

  #lift(tick: number): void {
    this.#liftTick = tick;
    this.#bare();
    const ship = this.#ship!; // made with the pad
    ship.setPosition(this.#baseX, this.#baseY).setAlpha(1).setVisible(true);
    if (!this.#reducedMotion()) ship.play(this.#ctx.sprites.anim(SHUTTLE, 'lift'));
  }

  /** The pad without its shuttle. */
  #bare(): void {
    const pad = this.#pad!; // checked by the callers
    const f = this.#ctx.sprites.frame(SHUTTLE, 'pad');
    pad.stop().setTexture(f.texture, f.frame);
  }

  reset(): void {
    this.#ship?.stop().setVisible(false);
    this.lifting = false;
  }
}
