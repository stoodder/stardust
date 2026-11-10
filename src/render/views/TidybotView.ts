// The Tidybots (T410b; design/enemies.md § 8; core-loop.md § 6.7, the `tidybots` dial; art-direction
// §7): Everglow's cheerful cleanup drones. Render-only. Each Skitterkin that dies leaves a speck of
// stardust where it fell (a `gold.4` and a `pink.3` pixel, like Act II's fleck, lying until it's
// swept); when a wave resolves, 1–3 `prop.tidybot`s hover in from the map's edge, vacuum the
// specks up stop by stop, chime, and leave (vfx/tidybotFlight.ts, on sim ticks, so pause holds
// them). Nobody says where the stardust goes, until A2M4 (the `unloading` dial; T501f, T530b):
// there each drone, after its chime, rises to the mouth of Intake B's hopper (the `intake_b`
// marker's prop), hangs over it pouring its load in (`unload`), and leaves from it, the drones
// taking turns. On a map whose dial is `off` (Act III on) there are neither specks nor drones. The
// body hovers inside its frame (the anchor is the ground point under it), so it draws at its
// ground point in `air`, depth-sorted like a flyer, over `fx.shadow`, raised over the hopper's
// mouth while it unloads (its shadow stays on the ground). Allocation-free per frame (T501k: the
// speck pool is searched with plain loops).
import type * as Phaser from 'phaser';
import type { TidybotMode } from '../../content/presentation.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { ColorName } from '../../content/palettes/master.ts';
import type { SimEvent } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { debrisTexture } from '../vfx/overlayTextures.ts';
import {
  planSweep,
  TIDY_MAX_BOTS,
  TIDY_MAX_SPECKS,
  TIDY_MAX_STOPS,
  tidyPose,
  type TidyPhase,
  type TidyPlan,
  type TidyPose,
} from '../vfx/tidybotFlight.ts';
import { tintOf } from './holdMarker.ts';
import type { ViewContext } from './ViewContext.ts';

/** The drone's sprite (T440c): anims `fly`, `vacuum`, `chime` (once, ending lit). */
export const TIDYBOT_SPRITE = 'prop.tidybot' as const;
/** The anim each phase plays. */
const PHASE_ANIM: Readonly<Record<Exclude<TidyPhase, 'waiting' | 'gone'>, string>> = {
  fly: 'fly',
  vacuum: 'vacuum',
  chime: 'chime',
  unload: 'unload',
};
/** The marker whose prop the drones unload into (A2M4's Intake B). */
export const UNLOAD_MARKER = 'intake_b';
/**
 * How far over the hopper's ground point its mouth is (`prop.intake`): the unloading drone's
 * anchor hangs there, so the stream from its nozzle falls into the mouth (T540c).
 */
export const UNLOAD_LIFT_PX = 23;
/** Its depth tie-breaks (not pooled entities): just past the salvage drone's. */
const TIDY_TIE = 0x100;
/** A speck's two pixels: stardust, the colours of the fleck Act II's pop leaves. */
const SPECK_COLORS: readonly [ColorName, ColorName] = ['gold.4', 'pink.3'];

/** What the drones need to know of the content: whether an enemy is a Skitterkin. */
export type IsSkitterkin = (enemy: string) => boolean;

interface Speck {
  x: number;
  y: number;
  /** Waiting for a sweep; then which drone and stop sweeps it; −1 when it's free. */
  stop: number;
  readonly a: Phaser.GameObjects.Image;
  readonly b: Phaser.GameObjects.Image;
}

interface Bot {
  plan: TidyPlan | null;
  phase: TidyPhase;
  /** Where it is now (grid). */
  x: number;
  y: number;
  readonly body: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
}

/** A speck waiting for the next sweep (its `stop`). */
const WAITING = -2;
const FREE = -1;

const pos: Vec2 = { x: 0, y: 0 };

export class TidybotView {
  readonly #ctx: ViewContext;
  readonly #cols: number;
  readonly #rows: number;
  readonly #on: boolean;
  readonly #specks: Speck[] = [];
  readonly #bots: Bot[] = [];
  readonly #pose: TidyPose = { x: 0, y: 0, phase: 'gone', cleared: 0, lift: 0 };
  /** Where the drones unload (grid), on a map whose dial is `unloading`; else null. */
  readonly #dock: Vec2 | null = null;
  /** The sim tick the current sweep began, or −1 with none under way. */
  #sweepTick = -1;
  /** The battle has ended: no new sweeps. */
  #ended = false;
  /** Sweeps begun this battle, and drones that have unloaded (for `__sd.render()`). */
  sweeps = 0;
  unloads = 0;

  constructor(
    ctx: ViewContext,
    cols: number,
    rows: number,
    mode: TidybotMode,
    markers: Readonly<Record<string, readonly [number, number]>> = {},
  ) {
    this.#ctx = ctx;
    this.#cols = cols;
    this.#rows = rows;
    this.#on = mode !== 'off';
    // A2M4's drones unload at Intake B (without the marker they sweep as everywhere else).
    const intake = mode === 'unloading' ? markers[UNLOAD_MARKER] : undefined;
    if (intake !== undefined) this.#dock = { x: intake[0] + 0.5, y: intake[1] + 0.5 };
    if (!this.#on) return;
    const { scene, layers, sprites } = ctx;
    const px = debrisTexture(scene, 1);
    for (let i = 0; i < TIDY_MAX_SPECKS; i++) {
      const a = scene.make.image({}, false).setTexture(px).setOrigin(0, 0).setVisible(false);
      const b = scene.make.image({}, false).setTexture(px).setOrigin(0, 0).setVisible(false);
      a.setTint(tintOf(SPECK_COLORS[0]));
      b.setTint(tintOf(SPECK_COLORS[1]));
      layers.decal.add(a);
      layers.decal.add(b);
      this.#specks.push({ x: 0, y: 0, stop: FREE, a, b });
    }
    const s = sprites.frame('fx.shadow', 'small');
    const sa = sprites.frameAnchor('fx.shadow', 'small');
    const f = sprites.frame(TIDYBOT_SPRITE, 'fly_0');
    const fa = sprites.frameAnchor(TIDYBOT_SPRITE, 'fly_0');
    for (let i = 0; i < TIDY_MAX_BOTS; i++) {
      const shadow = scene.make.image({}, false);
      shadow.setTexture(s.texture, s.frame).setDisplayOrigin(sa.x, sa.y).setVisible(false);
      layers.decal.add(shadow);
      const body = scene.make.sprite({}, false);
      body.setTexture(f.texture, f.frame).setDisplayOrigin(fa.x, fa.y).setVisible(false);
      layers.air.add(body);
      this.#bots.push({ plan: null, phase: 'gone', x: 0, y: 0, body, shadow });
    }
  }

  /** Drones in the air now. */
  get flying(): number {
    let n = 0;
    for (const b of this.#bots) if (b.phase !== 'gone' && b.phase !== 'waiting') n++;
    return n;
  }

  /** The drones in the air (for `__sd.render()`; allocates, so tests only). */
  drones(): { x: number; y: number; phase: string }[] {
    return this.#bots
      .filter((b) => b.phase !== 'gone' && b.phase !== 'waiting')
      .map((b) => ({ x: b.x, y: b.y, phase: b.phase }));
  }

  /** Specks lying on the field now. */
  get specks(): number {
    let n = 0;
    for (const s of this.#specks) if (s.stop !== FREE) n++;
    return n;
  }

  /**
   * Leaves a speck where each Skitterkin dies, and starts a sweep as each wave but the map's
   * `lastWave` resolves (`tick` reads the sim's tick then). Returns the unsubscribe.
   */
  bind(
    bus: Bus<SimEvent<IdSpace>>,
    isSkitterkin: IsSkitterkin,
    tick: () => number,
    lastWave: number,
  ): () => void {
    if (!this.#on) return () => undefined;
    const offs = [
      bus.on('EnemyDied', (e) => {
        if (isSkitterkin(e.enemy)) this.#leave(e.x, e.y);
      }),
      // The map's last wave ends it: Results come up over a field nobody sweeps.
      bus.on('WaveCleared', (e) => {
        if (e.wave < lastWave) this.#sweep(tick());
      }),
      bus.on('MapWon', () => {
        this.#ended = true;
      }),
      bus.on('MapLost', () => {
        this.#ended = true;
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** The first speck whose `stop` is `stop`, or null (a plain loop: no closure per death). */
  #speckAt(stop: number): Speck | null {
    const specks = this.#specks;
    for (let i = 0; i < specks.length; i++) {
      const s = specks[i]!; // i < length
      if (s.stop === stop) return s;
    }
    return null;
  }

  #leave(x: number, y: number): void {
    // A free slot, else a waiting one is swept unseen (its slot reused).
    const slot = this.#speckAt(FREE) ?? this.#speckAt(WAITING);
    if (slot === null) return; // every speck is under a sweep: this one goes unseen
    slot.x = x;
    slot.y = y;
    slot.stop = WAITING;
    gridToScreen(x, y, this.#ctx.origin, pos);
    const sx = Math.round(pos.x);
    const sy = Math.round(pos.y) - 1;
    slot.a.setPosition(sx, sy).setVisible(true);
    slot.b.setPosition(sx + 1, sy).setVisible(true);
  }

  /** A wave resolved: the drones come for what's waiting, unless a sweep is still under way. */
  #sweep(tick: number): void {
    if (this.#ended || this.#sweepTick >= 0) return;
    const waiting: Speck[] = this.#specks.filter((s) => s.stop === WAITING);
    if (waiting.length === 0) return;
    const sweep = planSweep(waiting, this.#cols, this.#rows, this.#dock);
    waiting.forEach((s, i) => {
      s.stop = sweep.stopOf[i] ?? 0;
    });
    this.#bots.forEach((b, i) => {
      b.plan = sweep.plans[i] ?? null;
      b.phase = b.plan === null ? 'gone' : 'waiting';
    });
    this.#sweepTick = tick;
    this.sweeps++;
  }

  /** Places the drones for this frame and sweeps up what they've cleared (`tick`: the sim's). */
  update(tick: number): void {
    if (this.#sweepTick < 0) return;
    const ticks = tick - this.#sweepTick;
    let busy = false;
    for (let i = 0; i < this.#bots.length; i++) {
      const bot = this.#bots[i]!; // i < length
      if (bot.plan === null) continue;
      const p = tidyPose(bot.plan, ticks, this.#pose);
      this.#clear(i, p.cleared);
      this.#show(bot, p);
      if (p.phase !== 'gone') busy = true;
    }
    if (!busy) {
      for (const b of this.#bots) b.plan = null;
      this.#sweepTick = -1;
    }
  }

  /** Hides drone `bot`'s first `cleared` stops' specks. */
  #clear(bot: number, cleared: number): void {
    if (cleared === 0) return;
    const first = bot * TIDY_MAX_STOPS;
    const specks = this.#specks;
    for (let i = 0; i < specks.length; i++) {
      const s = specks[i]!; // i < length
      if (s.stop >= first && s.stop < first + cleared) {
        s.stop = FREE;
        s.a.setVisible(false);
        s.b.setVisible(false);
      }
    }
  }

  #show(bot: Bot, p: TidyPose): void {
    if (p.phase === 'gone' || p.phase === 'waiting') {
      if (bot.phase !== p.phase) {
        bot.body.stop().setVisible(false);
        bot.shadow.setVisible(false);
        bot.phase = p.phase;
      }
      return;
    }
    if (bot.phase !== p.phase) {
      const anim = this.#ctx.sprites.anim(TIDYBOT_SPRITE, PHASE_ANIM[p.phase]);
      bot.body.setVisible(true).play(anim, true);
      bot.shadow.setVisible(true);
      if (p.phase === 'unload') this.unloads++;
      bot.phase = p.phase;
    }
    bot.x = p.x;
    bot.y = p.y;
    gridToScreen(p.x, p.y, this.#ctx.origin, pos);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    bot.body.setPosition(x, y - Math.round((p.lift ?? 0) * UNLOAD_LIFT_PX));
    bot.shadow.setPosition(x, y);
    const depth = worldDepth(y, 'enemy', TIDY_TIE + this.#bots.indexOf(bot));
    if (bot.body.depth !== depth) bot.body.setDepth(depth);
  }

  /** Clears every speck and drone (the scene is shutting down). */
  reset(): void {
    for (const s of this.#specks) {
      s.stop = FREE;
      s.a.setVisible(false);
      s.b.setVisible(false);
    }
    for (const b of this.#bots) {
      b.plan = null;
      b.phase = 'gone';
      b.body.stop().setVisible(false);
      b.shadow.setVisible(false);
    }
    this.#sweepTick = -1;
    this.#ended = false;
  }
}
