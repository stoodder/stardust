// The Deep Bore's rig at work (design/maps.md § 5.5 *The Deep Bore*; art-direction §6 *Deep Bore*;
// T831 on T842's art): GroundView stands `prop.bore_rig` on its `bore_rig` marker at `g0`; this
// view hangs the drill head (`fx.bore_head`) in it, its anchor (the auger's tip) on the rig's
// `mount` over the bore mouth, and follows the map's first timer (`state.timers`, the Bore):
// - the rig's depth gauge shows the fill by eighths (`boreGaugeFrame(filled ÷ fillTicks)`), and
//   burns `full` (2 fps) once the Bore has broken through;
// - the head `drill`s (10 fps) while the Bore runs and stands `idle` while it doesn't (before W1,
//   stopped at Phase 2); at the breakthrough it plays `breach` once (a cold violet burst ringing out
//   from the mouth) and then hangs `idle`, spent;
// - the mouth glows `stardust.unsung` violet (art-direction §3 *Finale*: "the Deep Bore glows
//   unsung"): an additive pool just in front of the rig, a step brighter with each eighth.
// Under reduced motion the head holds still (`drill_0` while it runs) and the breach shows its
// last frame. It reads sim state alone, so it holds while paused and stands right after a
// checkpoint replay. Allocation-free per frame: it changes a frame only when the gauge's eighth, the
// head's state, or the breakthrough changes.
import * as Phaser from 'phaser';
import { boreGaugeFrame } from '../../content/sprites/props/bore_rig.ts';
import type { CompiledTimer } from '../../content/compiled.ts';
import type { TimerState } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { poolImage } from '../vfx/glowPixels.ts';
import { propVariant } from './groundTiles.ts';
import { isScenery, sceneryGround } from './scenery.ts';
import type { TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

export const BORE_RIG = 'prop.bore_rig' as const;
export const BORE_HEAD = 'fx.bore_head' as const;
/** The marker the rig stands on (T842). */
export const BORE_MARKER = 'bore_rig';
/** The mouth's glow: its radius (tiles), colour, and its alpha at each eighth (0–8) and full. */
const GLOW_TILES = 0.9;
const GLOW_KEY = 'fx.bore_glow';
const glowAlpha = (eighths: number, full: boolean): number => (full ? 1 : 0.25 + eighths * 0.07);
/** The breakthrough's ring out of the mouth. */
const BREACH_RING_TILES = 1.5;
const BREACH_RING_MS = 600;

/** The head's state as drawn. */
type Head = 'idle' | 'drill' | 'breach';

/** What the smoke flows read of the rig (`__sd.render().bore`). */
export interface BoreLook {
  readonly gauge: string;
  readonly head: Head;
  readonly full: boolean;
}

export class BoreView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #reduced: () => boolean;
  readonly #timer: CompiledTimer | null;
  readonly #rig: Phaser.GameObjects.Sprite | null = null;
  readonly #head: Phaser.GameObjects.Sprite | null = null;
  readonly #glow: Phaser.GameObjects.Image | null = null;
  readonly #variant: string;
  /** The mouth's ground point (grid), for the breach ring. */
  readonly #gx: number = 0;
  readonly #gy: number = 0;
  #gauge = '';
  #headState: Head | '' = '';
  #full = false;

  constructor(
    ctx: ViewContext,
    map: { readonly markers: Readonly<Record<string, readonly [number, number]>> },
    timers: readonly CompiledTimer[],
    fx: TransientFx,
    env: string,
    reducedMotion: () => boolean,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reduced = reducedMotion;
    this.#timer = timers[0] ?? null;
    this.#variant = propVariant(BORE_RIG, env);
    const at = map.markers[BORE_MARKER];
    if (at === undefined || this.#timer === null) return;
    this.#gx = at[0] + 0.5;
    this.#gy = at[1] + 0.5;
    // The rig GroundView stood on the marker's tile.
    const { scene, sprites, layers } = ctx;
    for (const obj of layers.world.list) {
      if (!isScenery(obj) || !(obj instanceof Phaser.GameObjects.Sprite)) continue;
      const g = sceneryGround(obj);
      if (g === null || g.x !== this.#gx || g.y !== this.#gy) continue;
      if (obj.frame.name !== sprites.frame(BORE_RIG, 'g0', this.#variant).frame) continue;
      this.#rig = obj;
    }
    const rig = this.#rig;
    if (rig === null) return;
    const mount = sprites.mount(BORE_RIG);
    const anchor = sprites.frameAnchor(BORE_RIG, 'g0');
    if (mount === null) return;
    const mx = rig.x - anchor.x + mount.x;
    const my = rig.y - anchor.y + mount.y;
    const f = sprites.frame(BORE_HEAD, 'idle');
    const ha = sprites.frameAnchor(BORE_HEAD, 'idle');
    this.#head = new Phaser.GameObjects.Sprite(scene, 0, 0, f.texture, f.frame)
      .setDisplayOrigin(ha.x, ha.y)
      .setPosition(mx, my)
      .setDepth(rig.depth + 0.00005);
    layers.world.add(this.#head);
    if (!scene.textures.exists(GLOW_KEY)) {
      scene.textures.addCanvas(GLOW_KEY, imageToCanvas(poolImage(GLOW_TILES, 'violet.3').img));
    }
    this.#glow = new Phaser.GameObjects.Image(scene, rig.x, rig.y, GLOW_KEY)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(rig.depth + 0.0001)
      .setVisible(false);
    layers.world.add(this.#glow);
  }

  /** What the rig shows now (smoke hooks; null off a Bore map). */
  look(): BoreLook | null {
    if (this.#head === null) return null;
    return { gauge: this.#gauge, head: this.#headState === '' ? 'idle' : this.#headState, full: this.#full };
  }

  update(timers: readonly DeepReadonly<TimerState>[]): void {
    const rig = this.#rig;
    const head = this.#head;
    const def = this.#timer;
    if (rig === null || head === null || def === null) return;
    const t = timers[0];
    const filled = t === undefined || def.fillTicks <= 0 ? 0 : Math.min(1, t.filled / def.fillTicks);
    const full = t?.full === true;
    const { sprites } = this.#ctx;
    const reduced = this.#reduced();
    if (full !== this.#full) {
      this.#full = full;
      if (full) {
        this.#gauge = 'full';
        if (reduced) setFrameOf(rig, sprites.frame(BORE_RIG, 'full_1', this.#variant));
        else rig.play(sprites.anim(BORE_RIG, 'full', this.#variant));
        this.#fx.ring(this.#gx, this.#gy, BREACH_RING_TILES, 'violet.4', BREACH_RING_MS, true);
        this.#setHead('breach', reduced);
      }
    }
    if (!full) {
      const gauge = boreGaugeFrame(filled);
      if (gauge !== this.#gauge) {
        this.#gauge = gauge;
        rig.stop();
        setFrameOf(rig, sprites.frame(BORE_RIG, gauge, this.#variant));
        const eighths = Number(gauge.slice(1));
        this.#glow?.setAlpha(glowAlpha(eighths, false)).setVisible(t?.running === true);
      }
      this.#setHead(t?.running === true && t.ratePct > 0 ? 'drill' : 'idle', reduced);
      if (this.#glow !== null && this.#glow.visible !== (t?.running === true)) {
        this.#glow.setVisible(t?.running === true);
      }
    } else if (this.#glow !== null && this.#glow.alpha !== 1) {
      this.#glow.setAlpha(glowAlpha(8, true)).setVisible(true);
    }
  }

  #setHead(state: Head, reduced: boolean): void {
    if (state === this.#headState) return;
    this.#headState = state;
    const head = this.#head!; // update checked it
    const { sprites } = this.#ctx;
    if (state === 'drill' && !reduced) {
      head.play(sprites.anim(BORE_HEAD, 'drill'));
      return;
    }
    if (state === 'breach' && !reduced) {
      // Once, then the spent head hangs idle.
      head.play(sprites.anim(BORE_HEAD, 'breach'));
      head.once('animationcomplete', () => {
        setFrameOf(head, sprites.frame(BORE_HEAD, 'idle'));
      });
      return;
    }
    head.stop();
    const frame = state === 'drill' ? 'drill_0' : state === 'breach' ? 'breach_2' : 'idle';
    setFrameOf(head, sprites.frame(BORE_HEAD, frame));
  }

  reset(): void {
    this.#gauge = '';
    this.#headState = '';
    this.#full = false;
  }
}

/** Shows frame `f` on `s` (its texture too: a variant's frames may live in another atlas). */
function setFrameOf(s: Phaser.GameObjects.Sprite, f: { texture: string; frame: string }): void {
  s.setTexture(f.texture, f.frame);
}
