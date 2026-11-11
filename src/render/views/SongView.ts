// The Leaving Song's rest and scatter (T805's minimal view; design/maps.md § 5.5; the motion is
// songLook.ts). On `LaidToRest` the unit's body flips to a warm-gold flash and gold motes rise
// from it (a Dawn's too, from where each unit stood); on `Scattered` cold-violet motes drift from
// where it fell back to where it lies scattered and hover there; on `Reformed` they draw in on the
// body with a violet flash. The scattered body itself isn't drawn (BattleScene skips a unit while
// `scatterTicks` > 0). One Graphics in the vfx layer, redrawn each frame from a fixed pool of
// bursts (the oldest reused), so a busy Phase 2 allocates nothing. Real time, cosmetic.
// T830 and T841 replace the pixels with `fx.rest_mote` / `fx.scatter_mote` and the `rest` flip.
import type * as Phaser from 'phaser';
import { rgbOf, type ColorName } from '../../content/palettes/master.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Enemy, SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  FLIP_COLOR,
  flipShows,
  REFORM_COLOR,
  REFORM_MS,
  REST_COLORS,
  REST_MOTES,
  REST_MS,
  restMoteAt,
  SCATTER_COLORS,
  SCATTER_MAX_MS,
  SCATTER_MOTES,
  scatterMoteAt,
  type MoteAt,
} from './songLook.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as this view reads it (to find a scattered unit's resting place). */
export interface SongPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

const MAX_BURSTS = 24;

interface Burst {
  kind: 'none' | 'rest' | 'scatter';
  uid: number;
  ms: number;
  /** Grid points: where it fell (or rests), and where a scattered unit lies. */
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  liftPx: number;
  /** ms into the re-form (−1: not re-forming). */
  reformMs: number;
}

function hex(name: ColorName): number {
  const c = rgbOf(name);
  return (c.r << 16) | (c.g << 8) | c.b;
}
const REST_HEX = REST_COLORS.map(hex);
const SCATTER_HEX = SCATTER_COLORS.map(hex);
const FLIP_HEX = hex(FLIP_COLOR);
const REFORM_HEX = hex(REFORM_COLOR);

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const mote: MoteAt = { dx: 0, dy: 0, alpha: 0 };
const smote: MoteAt & { share: number } = { dx: 0, dy: 0, alpha: 0, share: 0 };

export class SongView {
  readonly #ctx: ViewContext;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #still: () => boolean;
  readonly #bursts: Burst[] = [];
  #next = 0;
  /** Units laid to rest, scattered, and re-formed this battle (the smoke flow's checks). */
  restsSeen = 0;
  scattersSeen = 0;
  reformsSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#still = reducedMotion;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
    for (let i = 0; i < MAX_BURSTS; i++) {
      this.#bursts.push({
        kind: 'none',
        uid: 0,
        ms: 0,
        x0: 0,
        y0: 0,
        x1: 0,
        y1: 0,
        liftPx: 0,
        reformMs: -1,
      });
    }
  }

  /** Listens for the song's events; `pool` finds a scattered unit where the sim put it. */
  bind(bus: Bus<SimEvent<IdSpace>>, pool: () => SongPool): () => void {
    const offs = [
      bus.on('LaidToRest', (e) => {
        this.#end(e.uid); // a scattered unit laid to rest at Dawn
        const u = find(pool(), e.uid);
        this.#start('rest', e.uid, e.at[0], e.at[1], e.at[0], e.at[1], lift(u));
        this.restsSeen++;
      }),
      bus.on('Scattered', (e) => {
        const u = find(pool(), e.uid);
        const x1 = u?.x ?? e.at[0];
        const y1 = u?.y ?? e.at[1];
        this.#start('scatter', e.uid, e.at[0], e.at[1], x1, y1, lift(u));
        this.scattersSeen++;
      }),
      bus.on('Reformed', (e) => {
        for (const s of this.#bursts) {
          if (s.kind === 'scatter' && s.uid === e.uid && s.reformMs < 0) s.reformMs = 0;
        }
        this.reformsSeen++;
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Bursts showing now, by kind (the render-state hook). */
  get shown(): { rests: number; scatters: number } {
    let rests = 0;
    let scatters = 0;
    for (const s of this.#bursts) {
      if (s.kind === 'rest') rests++;
      else if (s.kind === 'scatter') scatters++;
    }
    return { rests, scatters };
  }

  update(deltaMs: number): void {
    const dt = Number.isFinite(deltaMs) && deltaMs > 0 ? deltaMs : 0;
    const g = this.#g;
    g.clear();
    const still = this.#still();
    for (const s of this.#bursts) {
      if (s.kind === 'none') continue;
      s.ms += dt;
      if (s.reformMs >= 0) s.reformMs += dt;
      if (s.kind === 'rest') this.#drawRest(g, s, still);
      else this.#drawScatter(g, s, still);
    }
  }

  reset(): void {
    for (const s of this.#bursts) s.kind = 'none';
    this.#g.clear();
    this.restsSeen = 0;
    this.scattersSeen = 0;
    this.reformsSeen = 0;
  }

  #start(
    kind: 'rest' | 'scatter',
    uid: number,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    liftPx: number,
  ): void {
    const s = this.#bursts[this.#next]!; // index < MAX_BURSTS
    this.#next = (this.#next + 1) % MAX_BURSTS;
    s.kind = kind;
    s.uid = uid;
    s.ms = 0;
    s.x0 = x0;
    s.y0 = y0;
    s.x1 = x1;
    s.y1 = y1;
    s.liftPx = liftPx;
    s.reformMs = -1;
  }

  #end(uid: number): void {
    for (const s of this.#bursts) if (s.kind === 'scatter' && s.uid === uid) s.kind = 'none';
  }

  #drawRest(g: Phaser.GameObjects.Graphics, s: Burst, still: boolean): void {
    if (s.ms >= REST_MS) {
      s.kind = 'none';
      return;
    }
    gridToScreen(s.x0, s.y0, this.#ctx.origin, a);
    const x = Math.round(a.x);
    const y = Math.round(a.y) - s.liftPx;
    if (flipShows(s.ms)) {
      // The flip: a warm-gold star of light the size of the body, white at its heart.
      g.fillStyle(FLIP_HEX, 0.9);
      g.fillRect(x - 4, y - 4, 9, 3);
      g.fillRect(x - 1, y - 7, 3, 9);
      g.fillStyle(REST_HEX[1]!, 1); // white.1
      g.fillRect(x, y - 3, 1, 1);
    }
    for (let i = 0; i < REST_MOTES; i++) {
      restMoteAt(s.ms, i, still, mote);
      if (mote.alpha <= 0) continue;
      g.fillStyle(REST_HEX[i % REST_HEX.length]!, mote.alpha);
      g.fillRect(x + mote.dx * 2, y - 4 + mote.dy, 2, 2);
    }
  }

  #drawScatter(g: Phaser.GameObjects.Graphics, s: Burst, still: boolean): void {
    if (s.ms >= SCATTER_MAX_MS || s.reformMs >= REFORM_MS) {
      s.kind = 'none';
      return;
    }
    gridToScreen(s.x0, s.y0, this.#ctx.origin, a);
    gridToScreen(s.x1, s.y1, this.#ctx.origin, b);
    for (let i = 0; i < SCATTER_MOTES; i++) {
      scatterMoteAt(s.ms, i, s.reformMs, still, smote);
      if (smote.alpha <= 0) continue;
      const x = Math.round(a.x + (b.x - a.x) * smote.share) + smote.dx;
      const y = Math.round(a.y + (b.y - a.y) * smote.share) + smote.dy - s.liftPx;
      g.fillStyle(SCATTER_HEX[i % SCATTER_HEX.length]!, smote.alpha);
      g.fillRect(x, y, 2, 2);
    }
    if (s.reformMs >= 0) {
      g.fillStyle(REFORM_HEX, 0.7);
      g.fillRect(Math.round(b.x) - 2, Math.round(b.y) - s.liftPx - 8, 5, 5);
    }
  }
}

function find(pool: SongPool, uid: number): DeepReadonly<Enemy> | null {
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.uid === uid) return e;
  }
  return null;
}

function lift(u: DeepReadonly<Enemy> | null): number {
  return BODY_LIFT_PX + (u?.def?.layer === 'air' ? AIR_LIFT_PX : 0);
}
