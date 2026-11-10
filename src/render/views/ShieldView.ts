// Aelari shields (T403's view, T430a's polish; art-direction §8's `shielded` and `shield_aura`
// tells; enemies.md § 2.3, § 3). The shield bar is EnemyView's (vfx/healthBar.ts), and so is the
// hex bubble round each shielded body (shieldLook.ts), which flashes on every hit. This adds:
// - **The ripple** (`ShieldHit`): a hit that lands on a shield grows a small `blue.3` ring out from
//   the bubble at the unit's body (flyers 12 px up), at most once per RIPPLE_GAP_MS per unit and
//   RIPPLES_PER_FRAME in all, so a Zapcoil's chain through a column reads as ripples, not a flood.
//   The hit that breaks the shield always shows: a wider `white.1` flash, a `blue.4` ring, and the
//   bubble's shards flying off and falling (TransientFx's debris).
// - **The shed spark** (`EnemySpawned` of a unit with an owner, D139): a boss's shards each get a
//   spark lobbed from its heart to their spot (TransientFx's `shed`), so the player sees them shed.
// - **The pulse ring** (`ShieldPulse` 'fired'): a `white.1` flash at the pulser and a `blue.4` ring
//   growing on the ground out to the pulse's radius, the dashed `shield_aura` ring.
// - **The pulse tell**, from sim state each frame (`pulseTelling`): the reach laid on the ground as
//   a dithered `blue.1` pool at 35% (cold blue on Act II's warm gold reads at a glance), a held
//   `blue.4` ring over a 1 px `ink.0` under-stroke at its edge, and a `white.1` one closing in from
//   it to the pulser as the tell runs out (the charge; `chargeRadius`), all in `decal` under the
//   units; the rings step 100% ↔ 60% on the sim's 3 Hz tell step (vfx/fxTiming.ts `tellHigh`; held
//   while paused; steady under reduced motion). The pulser itself wears a `blue.4` rim meanwhile
//   (EnemyView). Allocation-free per frame: the rings are TransientFx's and this view's pools.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { activePulse, pulseTelling, type Enemy, type SimEvent } from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { STEPPED_ALPHA, tellHigh } from '../vfx/fxTiming.ts';
import { discTexture, effectRingTexture } from '../vfx/overlayTextures.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX, type TransientFx } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** The enemy pool as the shield view reads it. */
export interface ShieldPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Enemy>[];
}

/** One unit's ripples: at most one per this many ms. */
export const RIPPLE_GAP_MS = 150;
/** Ripples started in one frame, at most (a break always shows). */
export const RIPPLES_PER_FRAME = 6;
const RIPPLE_TILES = 0.5;
const RIPPLE_MS = 250;
const BREAK_TILES = 0.75;
const BREAK_MS = 300;
const PULSE_RING_MS = 600;
const PULSE_FLASH_TILES = 0.5;
const PULSE_FLASH_MS = 250;
/** A break's shards fly from the bubble's middle, a little above the hit point (px). */
const SHARD_LIFT_PX = 2;
/** A shed spark leaves the boss's heart this far over its ground point (px; the Penitent's chest). */
const SHED_FROM_LIFT_PX = 24;
/** Units remembered by the ripple gate (the oldest is forgotten first). */
const GATE_SLOTS = 32;
const MAX_TELLS = 6;
const TELL_ALPHA = { on: STEPPED_ALPHA[0], off: STEPPED_ALPHA[1] } as const;
/** The tell's pool on the ground: its colour and alpha. */
const POOL_COLOR = 'blue.1';
const POOL_ALPHA = STEPPED_ALPHA[2];

/** The smallest ring (the effect rings' quarter-tile step). */
const MIN_RING_TILES = 0.25;

/**
 * The charge ring's radius `ticksLeft` ticks before the pulse fires: from the pulse's radius at the
 * tell's start in to a quarter tile, in the rings' quarter-tile steps.
 */
export function chargeRadius(ticksLeft: number, tellTicks: number, radiusTiles: number): number {
  const t = tellTicks > 0 ? Math.min(1, Math.max(0, ticksLeft / tellTicks)) : 0;
  const r = MIN_RING_TILES + (radiusTiles - MIN_RING_TILES) * t;
  return Math.max(MIN_RING_TILES, Math.round(r * 4) / 4);
}

/** The tell ring's alpha `ticksLeft` ticks before the pulse fires. */
export function tellAlpha(ticksLeft: number, reducedMotion: boolean): number {
  return tellHigh(ticksLeft, reducedMotion) ? TELL_ALPHA.on : TELL_ALPHA.off;
}

/**
 * Which shield hits ripple: once per RIPPLE_GAP_MS per unit, RIPPLES_PER_FRAME a frame; breaks
 * always. Fixed slots, allocation-free.
 */
export class RippleGate {
  readonly #uids = new Int32Array(GATE_SLOTS);
  readonly #at = new Float64Array(GATE_SLOTS);
  #next = 0;
  #now = 0;
  #frame = 0;

  /** Advances the clock by `dt` ms and opens a new frame. */
  tick(dt: number): void {
    this.#now += dt;
    this.#frame = 0;
  }

  /** Whether a hit on unit `uid` ripples now (and records it if so). */
  admit(uid: number, broken: boolean): boolean {
    let slot = -1;
    for (let i = 0; i < GATE_SLOTS; i++) {
      if (this.#uids[i] === uid) {
        slot = i;
        break;
      }
    }
    if (!broken) {
      if (this.#frame >= RIPPLES_PER_FRAME) return false;
      if (slot >= 0 && this.#now - this.#at[slot]! < RIPPLE_GAP_MS) return false; // slot < GATE_SLOTS
    }
    if (slot < 0) {
      slot = this.#next;
      this.#next = (this.#next + 1) % GATE_SLOTS;
      this.#uids[slot] = uid;
    }
    this.#at[slot] = this.#now;
    this.#frame++;
    return true;
  }

  reset(): void {
    this.#uids.fill(0);
    this.#at.fill(0);
    this.#now = 0;
    this.#frame = 0;
  }
}

interface TellRing {
  readonly img: Phaser.GameObjects.Image;
  /** The reach's pool on the ground, under the rings. */
  readonly pool: Phaser.GameObjects.Image;
  radius: number;
  /** The closing charge ring. */
  readonly charge: Phaser.GameObjects.Image;
  chargeRadius: number;
}

const pos: Vec2 = { x: 0, y: 0 };

export class ShieldView {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #reducedMotion: () => boolean;
  readonly #gate = new RippleGate();
  readonly #tells: TellRing[] = [];
  /** Ripples and pulse rings started since the view was made (the smoke flow's check). */
  ripples = 0;
  pulseRings = 0;
  /** Shields broken (their shards thrown) since the view was made. */
  breaks = 0;
  /** Shed sparks thrown from a boss to its shards since the view was made. */
  sheds = 0;

  constructor(ctx: ViewContext, fx: TransientFx, reducedMotion: () => boolean) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#reducedMotion = reducedMotion;
    for (let i = 0; i < MAX_TELLS; i++) {
      const pool = ctx.scene.make.image({}, false).setVisible(false);
      const img = ctx.scene.make.image({}, false).setVisible(false);
      const charge = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.decal.add(pool);
      ctx.layers.decal.add(img);
      ctx.layers.decal.add(charge);
      this.#tells.push({ img, pool, radius: 0, charge, chargeRadius: 0 });
    }
  }

  /** Subscribes to ShieldHit and ShieldPulse; `pool` finds a hit unit's layer. Returns the off. */
  bind(bus: Bus<SimEvent<IdSpace>>, pool: () => ShieldPool): () => void {
    const offHit = bus.on('ShieldHit', (e) => {
      if (!this.#gate.admit(e.uid, e.broken)) return;
      const lift = BODY_LIFT_PX + (flying(pool(), e.uid) ? AIR_LIFT_PX : 0);
      this.ripples++;
      if (e.broken) {
        this.#fx.ring(e.x, e.y, BREAK_TILES, 'white.1', BREAK_MS, true, lift);
        this.#fx.ring(e.x, e.y, RIPPLE_TILES, 'blue.4', BREAK_MS, true, lift);
        this.#fx.shieldShards(e.x, e.y, lift + SHARD_LIFT_PX);
        this.breaks++;
      } else {
        this.#fx.ring(e.x, e.y, RIPPLE_TILES, 'blue.3', RIPPLE_MS, true, lift);
      }
    });
    const offPulse = bus.on('ShieldPulse', (e) => {
      if (e.phase !== 'fired') return; // the tell is drawn from state (update)
      this.pulseRings++;
      this.#fx.ring(e.x, e.y, PULSE_FLASH_TILES, 'white.1', PULSE_FLASH_MS, false);
      this.#fx.ring(e.x, e.y, e.radiusTiles, 'blue.4', PULSE_RING_MS, true);
    });
    // A boss's shards (D139 S4): a spark sheds from its heart to each shard's spot as they spawn.
    const offSpawn = bus.on('EnemySpawned', (e) => {
      const units = pool();
      const shard = findUnit(units, e.uid);
      const owner = shard === null ? null : shedOwner(units, shard);
      if (shard === null || owner === null) return;
      this.#fx.shed(owner.x, owner.y, shard.x, shard.y, SHED_FROM_LIFT_PX);
      this.sheds++;
    });
    return () => {
      offHit();
      offPulse();
      offSpawn();
    };
  }

  /** Each frame: the gate's clock, and a held ring under every unit telling a pulse. */
  update(dt: number, enemies: ShieldPool): void {
    this.#gate.tick(dt);
    const reduced = this.#reducedMotion();
    let r = 0;
    for (let i = 0; i < enemies.used && r < MAX_TELLS; i++) {
      const e = enemies.items[i]!; // i < used ≤ items.length
      if (!e.alive) continue;
      const pulse = activePulse(e);
      if (pulse === null || !pulseTelling(e, pulse)) continue;
      const ring = this.#tells[r++]!; // r < MAX_TELLS
      if (ring.radius !== pulse.radiusTiles) {
        const tex = effectRingTexture(this.#ctx.scene, pulse.radiusTiles, 'blue.4', 'ink.0');
        ring.img.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
        const pool = discTexture(this.#ctx.scene, pulse.radiusTiles, POOL_COLOR, 1, true);
        ring.pool.setTexture(pool.key).setDisplayOrigin(pool.ox, pool.oy).setAlpha(POOL_ALPHA);
        ring.radius = pulse.radiusTiles;
      }
      const cr = chargeRadius(e.pulseTicks, pulse.tellTicks, pulse.radiusTiles);
      if (ring.chargeRadius !== cr) {
        const tex = effectRingTexture(this.#ctx.scene, cr, 'white.1', 'ink.0');
        ring.charge.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy);
        ring.chargeRadius = cr;
      }
      gridToScreen(e.x, e.y, this.#ctx.origin, pos);
      const x = Math.round(pos.x);
      const y = Math.round(pos.y);
      const alpha = tellAlpha(e.pulseTicks, reduced);
      ring.pool.setPosition(x, y).setVisible(true);
      ring.img.setPosition(x, y).setAlpha(alpha).setVisible(true);
      ring.charge.setPosition(x, y).setAlpha(alpha).setVisible(true);
    }
    for (; r < MAX_TELLS; r++) {
      const ring = this.#tells[r]!; // r < MAX_TELLS
      if (ring.img.visible) ring.img.setVisible(false);
      if (ring.pool.visible) ring.pool.setVisible(false);
      if (ring.charge.visible) ring.charge.setVisible(false);
    }
  }

  /** How many pulse tells show (the smoke flow's check). */
  get tells(): number {
    let n = 0;
    for (const t of this.#tells) if (t.img.visible) n++;
    return n;
  }

  reset(): void {
    this.#gate.reset();
    for (const t of this.#tells) {
      t.img.setVisible(false);
      t.pool.setVisible(false);
      t.charge.setVisible(false);
    }
  }
}

/** Whether live unit `uid` flies (its ripple draws at a flyer's height). */
function flying(enemies: ShieldPool, uid: number): boolean {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === uid) return e.def?.layer === 'air';
  }
  return false;
}

/**
 * The live boss a just-spawned unit was shed from (its `ownerUid`: a Penitent's shard), or null for
 * any other spawn (D139 S4).
 */
export function shedOwner(
  enemies: ShieldPool,
  unit: Pick<DeepReadonly<Enemy>, 'ownerUid'>,
): DeepReadonly<Enemy> | null {
  return unit.ownerUid === 0 ? null : findUnit(enemies, unit.ownerUid);
}

/** The live unit `uid` in the pool, or null. */
export function findUnit(enemies: ShieldPool, uid: number): DeepReadonly<Enemy> | null {
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (e.uid === uid && e.alive) return e;
  }
  return null;
}
