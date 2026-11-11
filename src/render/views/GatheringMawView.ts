// The Gathering Maw's split and merge, minimal (T708; gmawLook.ts has the rules; T730a polishes
// them, T740a draws the bodies): the burst as it splits, the tether running between its parts
// along the road (slack, then pulled taut through the merge's tell as they walk together), and
// the gulp as they merge. One Graphics on the vfx layer, redrawn each frame; allocation-free per
// frame (the scratch points and the burst slots are reused). Its phase-1 gather is HollowView's
// (the Maw's tendrils, at the boss's reach); its one boss bar is BossBarView's (gmawLook.ts
// `bossBarKey`, the sim's `splitHp`).
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  isSplitPart,
  MERGE_TELL_TICKS,
  mergeTelling,
  type Enemy,
  type SimEvent,
} from '../../sim/index.ts';
import { gridToScreen, rangeEllipsePx, type Vec2 } from '../iso.ts';
import {
  BURST,
  burstRing,
  TETHER,
  TETHER_CORE,
  TETHER_TAUT,
  tetherStroke,
  UNDER,
} from './gmawLook.ts';
import { hexOf } from './jamLook.ts';
import type { ViewContext } from './ViewContext.ts';

interface Pool<T> {
  readonly used: number;
  readonly items: readonly DeepReadonly<T>[];
}

const INK = hexOf(UNDER);
const BURST_HEX = hexOf(BURST);
const CORE = hexOf(TETHER_CORE);
const SLACK_HEX = hexOf(TETHER);
const TAUT_HEX = hexOf(TETHER_TAUT);
/** The tether runs body to body, this far above each part's ground point. */
const BODY_LIFT_PX = 6;

const a: Vec2 = { x: 0, y: 0 };
const b: Vec2 = { x: 0, y: 0 };
const semi: Vec2 = { x: 0, y: 0 };

interface Burst {
  active: boolean;
  uid: number;
  ms: number;
}

export class GatheringMawView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #g: Phaser.GameObjects.Graphics;
  readonly #bursts: Burst[] = [];
  #parts = 0;
  #tethers = 0;
  #taut = 0;
  /** Splits and merges seen since the view was made (smoke's checks). */
  splitsSeen = 0;
  mergesSeen = 0;

  constructor(ctx: ViewContext, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#g = ctx.scene.make.graphics({}, false);
    ctx.layers.vfx.add(this.#g);
  }

  /** The burst on a split (round its middle part) and the gulp on a merge. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    const offs = [
      bus.on('BossSplit', (e) => {
        this.splitsSeen++;
        const mid = e.parts[Math.floor(e.parts.length / 2)];
        if (mid !== undefined) this.#burst(mid);
      }),
      bus.on('BossMerged', (e) => {
        this.mergesSeen++;
        this.#burst(e.uid);
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Each frame: the tethers between parts and the bursts under way. */
  update(dtMs: number, enemies: Pool<Enemy>): void {
    const g = this.#g;
    g.clear();
    let parts = 0;
    let tethers = 0;
    let taut = 0;
    for (let i = 0; i < enemies.used; i++) {
      const p = enemies.items[i]!; // i < used ≤ items.length
      if (!isSplitPart(p) || p.leaving) continue;
      parts++;
      // Its tether runs forward to the nearest part of its split ahead of it on the road.
      let next: DeepReadonly<Enemy> | null = null;
      for (let j = 0; j < enemies.used; j++) {
        const q = enemies.items[j]!; // j < used ≤ items.length
        if (q === p || !isSplitPart(q) || q.leaving || q.ownerUid !== p.ownerUid) continue;
        if (q.dist < p.dist || (q.dist === p.dist && q.uid < p.uid)) continue;
        if (next === null || q.dist < next.dist) next = q;
      }
      if (next === null) continue;
      tethers++;
      if (mergeTelling(p)) taut++;
      this.#drawTether(g, p, next);
    }
    this.#parts = parts;
    this.#tethers = tethers;
    this.#taut = taut;
    this.#drawBursts(g, dtMs, enemies);
  }

  #drawTether(g: Phaser.GameObjects.Graphics, p: DeepReadonly<Enemy>, q: DeepReadonly<Enemy>): void {
    gridToScreen(p.x, p.y, this.#ctx.origin, a);
    gridToScreen(q.x, q.y, this.#ctx.origin, b);
    a.y -= BODY_LIFT_PX;
    b.y -= BODY_LIFT_PX;
    const st = tetherStroke(p.mergeTicks, MERGE_TELL_TICKS);
    g.lineStyle(st.px + 2, INK, 0.6).lineBetween(a.x, a.y, b.x, b.y);
    g.lineStyle(st.px, st.color === TETHER ? SLACK_HEX : TAUT_HEX, 1).lineBetween(a.x, a.y, b.x, b.y);
    if (st.core) g.lineStyle(1, CORE, 1).lineBetween(a.x, a.y, b.x, b.y);
  }

  #burst(uid: number): void {
    let slot = this.#bursts.find((s) => !s.active);
    if (slot === undefined) {
      slot = { active: false, uid: 0, ms: 0 };
      this.#bursts.push(slot);
    }
    slot.active = true;
    slot.uid = uid;
    slot.ms = 0;
  }

  #drawBursts(g: Phaser.GameObjects.Graphics, dtMs: number, enemies: Pool<Enemy>): void {
    const still = this.#reducedMotion();
    for (const s of this.#bursts) {
      if (!s.active) continue;
      s.ms += dtMs;
      const ring = burstRing(s.ms, still);
      const e = findLive(enemies, s.uid);
      if (ring.alpha <= 0 || e === null) {
        s.active = ring.alpha > 0 && e === null && s.ms < 100; // the unit may land a frame late
        continue;
      }
      gridToScreen(e.x, e.y, this.#ctx.origin, a);
      rangeEllipsePx(ring.tiles, semi);
      g.lineStyle(3, INK, 0.6 * ring.alpha).strokeEllipse(a.x, a.y, semi.x * 2, semi.y * 2);
      g.lineStyle(1, BURST_HEX, ring.alpha).strokeEllipse(a.x, a.y, semi.x * 2, semi.y * 2);
    }
  }

  /** What shows now (the smoke flow's check): parts on the field, tethers, taut ones, bursts. */
  get shown(): {
    readonly parts: number;
    readonly tethers: number;
    readonly taut: number;
    readonly bursts: number;
  } {
    let bursts = 0;
    for (const s of this.#bursts) if (s.active) bursts++;
    return { parts: this.#parts, tethers: this.#tethers, taut: this.#taut, bursts };
  }

  reset(): void {
    this.#g.clear();
    for (const s of this.#bursts) s.active = false;
    this.#parts = 0;
    this.#tethers = 0;
    this.#taut = 0;
  }
}

function findLive(enemies: Pool<Enemy>, uid: number): DeepReadonly<Enemy> | null {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e;
  }
  return null;
}
