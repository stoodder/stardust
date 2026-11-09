// The Skyhook's and Zapcoil's spec looks that aren't a projectile (T407b; art-direction §7; the
// pure rules are vfx/specPixels.ts). Render-only: it reads sim state and the event bus.
// - **The capacitor charge** (Capacitor Bank): every charging bank wears an orb at its coil's claw
//   that grows a step per quarter of its charge (`chargeTicks`, read each frame, so it holds while
//   paused and follows 2×), flickering at the 3 Hz cap once full. A charge that drops without a
//   discharge (it fizzled: its target escaped, nothing was left in range, or Hold Fire vented it)
//   sputters a small `steel.4` ring at the claw.
// - **The discharge** (`ProjectileFired`, `kind: 'charge'`): a doubled arc from the claw to the
//   target (ChainFx's jagged bolt, twice over, so it reads heavier than a chain's hop), a white
//   flash at the claw, a small burst on the target, and a `blue.4` ring out to the splash radius
//   at the target's height.
// - **Flak Curtain**: every burst of its flak leaves a dark puff hanging where it burst
//   (CURTAIN_PUFF), rising a pixel at a time and fading in steps. Pooled (the oldest is reused).
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import {
  bonusChargeTicks,
  type Pool,
  type SimEvent,
  type Enemy,
  type Tower,
} from '../../sim/index.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import {
  ORB_RADIUS_PX,
  chargeAlpha,
  chargeLevel,
  orbImage,
  puffAlpha,
  puffImage,
  puffRise,
} from '../vfx/specPixels.ts';
import type { ChainFx } from './ChainFx.ts';
import type { TransientFx } from './TransientFx.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from './TransientFx.ts';
import type { ViewContext } from './ViewContext.ts';

/** Where Zapcoil's arc leaves its claw, above the tile (px; battleEvents' ARC_EMITTER_PX). */
const CLAW_PX = 14;
/**
 * A discharge holds longer than a chain's hop (it's the bank's one big hit every 4 s): the bolt,
 * the flash at the claw, and the splash ring. And the sputter of a charge that fizzles.
 */
const BOLT_MS = 280;
const FLASH_TILES = 0.5;
const FLASH_MS = 280;
const DISCHARGE_RING_MS = 400;
const SPUTTER_TILES = 0.3;
const SPUTTER_MS = 250;
/** A puff hangs this far (px) above its burst. */
const PUFF_ABOVE_PX = 4;
/** Puffs alive at once (Flak Curtain fires 3 a second; a few of them at once). */
const MAX_PUFFS = 48;
const ORB_KEY = (level: number): string => `fx.charge.orb${level}`;
const PUFF_KEY = 'fx.flak.puff';

/** The specs whose looks this view draws, by `tower:spec` (content ids). */
const CURTAIN_SPECS: ReadonlySet<string> = new Set(['skyhook:a']);

type TowerPool = DeepReadonly<Pool<Tower>>;
type EnemyPool = DeepReadonly<Pool<Enemy>>;

interface Puff {
  active: boolean;
  ms: number;
  x: number;
  y: number;
  readonly img: Phaser.GameObjects.Image;
}

const pos: Vec2 = { x: 0, y: 0 };

export class SpecFx {
  readonly #ctx: ViewContext;
  readonly #fx: TransientFx;
  readonly #chains: ChainFx;
  readonly #reducedMotion: () => boolean;
  readonly #liftPx: (col: number, row: number) => number;
  /** Each charging bank's orb, and the charge it showed last frame. */
  readonly #orbs = new Map<number, Phaser.GameObjects.Image>();
  readonly #lastCharge = new Map<number, number>();
  /** Banks that discharged in this frame's events (their drop to 0 isn't a fizzle). */
  readonly #discharged = new Set<number>();
  /** Flak Curtain shots in flight (their bursts leave puffs). */
  readonly #curtain = new Set<number>();
  readonly #puffs: Puff[] = [];
  #nextPuff = 0;
  /** Counters the smoke flows read (`__sd.render()`). */
  discharges = 0;
  fizzles = 0;

  constructor(
    ctx: ViewContext,
    fx: TransientFx,
    chains: ChainFx,
    reducedMotion: () => boolean,
    liftPx: (col: number, row: number) => number,
  ) {
    this.#ctx = ctx;
    this.#fx = fx;
    this.#chains = chains;
    this.#reducedMotion = reducedMotion;
    this.#liftPx = liftPx;
    const { scene, layers } = ctx;
    for (let level = 1; level < ORB_RADIUS_PX.length; level++) {
      if (!scene.textures.exists(ORB_KEY(level))) {
        scene.textures.addCanvas(ORB_KEY(level), imageToCanvas(orbImage(ORB_RADIUS_PX[level]!)));
      }
    }
    if (!scene.textures.exists(PUFF_KEY)) {
      scene.textures.addCanvas(PUFF_KEY, imageToCanvas(puffImage()));
    }
    for (let i = 0; i < MAX_PUFFS; i++) {
      const img = scene.make.image({}, false).setTexture(PUFF_KEY).setVisible(false);
      layers.vfx.add(img);
      this.#puffs.push({ active: false, ms: 0, x: 0, y: 0, img });
    }
  }

  /** How many orbs show (charging banks). */
  get glows(): number {
    let n = 0;
    for (const o of this.#orbs.values()) if (o.visible) n++;
    return n;
  }

  /** How many curtain puffs hang in the air. */
  get puffs(): number {
    let n = 0;
    for (const p of this.#puffs) if (p.active) n++;
    return n;
  }

  /** Listens for discharges and Flak Curtain's shots. Returns the unwiring. */
  bind(bus: Bus<SimEvent<IdSpace>>, towers: () => TowerPool, enemies: () => EnemyPool): () => void {
    const offFired = bus.on('ProjectileFired', (e) => {
      if (e.kind === 'charge') {
        this.#discharge(e, towers(), enemies());
        return;
      }
      if (e.kind !== 'projectile' || e.uid === 0) return;
      const t = findTower(towers(), e.towerUid);
      if (t?.def !== null && t?.def !== undefined && CURTAIN_SPECS.has(`${t.def.id}:${t.spec}`)) {
        this.#curtain.add(e.uid);
      }
    });
    const offHit = bus.on('ProjectileHit', (e) => {
      if (e.uid === 0 || !this.#curtain.delete(e.uid)) return;
      this.#puff(e.x, e.y);
    });
    return () => {
      offFired();
      offHit();
      this.#curtain.clear();
    };
  }

  /** Syncs the orbs to the banks' charge and ages the puffs, once a frame (`dt` ms). */
  update(dt: number, towers: TowerPool): void {
    const seen = this.#discharged;
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used ≤ items.length
      const attack = t.tierDef?.attack ?? null;
      if (!t.alive || attack === null || attack.kind !== 'charge') continue;
      const last = this.#lastCharge.get(t.uid) ?? 0;
      const lift = this.#liftPx(t.col, t.row) + CLAW_PX;
      if (t.chargeTicks < last && !seen.has(t.uid)) {
        this.fizzles++;
        this.#fx.ring(t.x, t.y, SPUTTER_TILES, 'steel.4', SPUTTER_MS, true, lift);
      }
      this.#lastCharge.set(t.uid, t.chargeTicks);
      const level = chargeLevel(t.chargeTicks, bonusChargeTicks(attack, t));
      let orb = this.#orbs.get(t.uid);
      if (level === 0) {
        orb?.setVisible(false);
        continue;
      }
      if (orb === undefined) {
        orb = this.#ctx.scene.make.image({}, false).setOrigin(0.5, 0.5);
        this.#ctx.layers.vfx.add(orb);
        this.#orbs.set(t.uid, orb);
      }
      gridToScreen(t.x, t.y, this.#ctx.origin, pos);
      orb
        .setTexture(ORB_KEY(level))
        .setPosition(Math.round(pos.x), Math.round(pos.y - lift))
        .setAlpha(chargeAlpha(level, t.chargeTicks, this.#reducedMotion()))
        .setVisible(true);
    }
    seen.clear();
    // Orbs of banks that are gone (sold) or no longer charge.
    for (const [uid, orb] of this.#orbs) {
      if (findTower(towers, uid)?.tierDef?.attack?.kind === 'charge') continue;
      orb.destroy();
      this.#orbs.delete(uid);
      this.#lastCharge.delete(uid);
    }
    for (const p of this.#puffs) {
      if (!p.active) continue;
      p.ms += dt;
      const a = puffAlpha(p.ms);
      if (a === 0) {
        p.active = false;
        p.img.setVisible(false);
        continue;
      }
      p.img.setPosition(p.x, p.y - puffRise(p.ms)).setAlpha(a);
    }
  }

  /** Hides everything (the scene is shutting down). */
  reset(): void {
    for (const orb of this.#orbs.values()) orb.destroy();
    this.#orbs.clear();
    this.#lastCharge.clear();
    this.#discharged.clear();
    this.#curtain.clear();
    for (const p of this.#puffs) {
      p.active = false;
      p.img.setVisible(false);
    }
    this.discharges = 0;
    this.fizzles = 0;
  }

  #discharge(
    e: Extract<SimEvent<IdSpace>, { type: 'ProjectileFired' }>,
    towers: TowerPool,
    enemies: EnemyPool,
  ): void {
    this.discharges++;
    this.#discharged.add(e.towerUid);
    const t = findTower(towers, e.towerUid);
    const claw = (t === null ? 0 : this.#liftPx(t.col, t.row)) + CLAW_PX;
    const air = flies(enemies, e.targetUid);
    const body = BODY_LIFT_PX + (air ? AIR_LIFT_PX : 0);
    // Two jagged bolts over each other: heavier than a chain's single hop.
    for (let k = 0; k < 2; k++) {
      this.#chains.begin(e.x, e.y, claw);
      this.#chains.hop(e.targetX, e.targetY, body, BOLT_MS);
    }
    this.#fx.ring(e.x, e.y, FLASH_TILES, 'white.1', FLASH_MS, false, claw);
    this.#fx.burst(e.targetX, e.targetY, 0, true, air ? AIR_LIFT_PX : 0);
    this.#fx.ring(
      e.targetX,
      e.targetY,
      e.radiusTiles,
      'blue.4',
      DISCHARGE_RING_MS,
      true,
      air ? AIR_LIFT_PX : 0,
    );
  }

  /** A curtain puff where a Flak Curtain shot burst, at the flyers' height. */
  #puff(x: number, y: number): void {
    const p = this.#puffs[this.#nextPuff]!; // index < MAX_PUFFS
    this.#nextPuff = (this.#nextPuff + 1) % MAX_PUFFS;
    gridToScreen(x, y, this.#ctx.origin, pos);
    p.x = Math.round(pos.x);
    // Just above the burst, so the burst's own smoke ring doesn't hide it while it plays.
    p.y = Math.round(pos.y - AIR_LIFT_PX - PUFF_ABOVE_PX);
    p.ms = 0;
    p.active = true;
    p.img.setPosition(p.x, p.y).setAlpha(puffAlpha(0)).setVisible(true);
  }
}

/** The standing tower `uid`, or null. */
function findTower(pool: TowerPool, uid: number): DeepReadonly<Tower> | null {
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/** Whether the enemy `uid` flies (a fresh kill still has its def). */
function flies(pool: EnemyPool, uid: number): boolean {
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.uid === uid) return e.def?.layer === 'air';
  }
  return false;
}
