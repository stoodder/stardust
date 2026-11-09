// The playfield's sim-event wiring (T225 split from BattleScene.ts): views are created and released
// from sim events, and the event-driven effects and feedback juice (D026, D059) fire from them:
// build dust and costs, upgrade and specialize rings, link tethers and callouts, deaths, leaks,
// shells and bomblets, the strike's landing, and Bricks's shots; and M3's (T312a): flak climbing
// to a flyer and bursting there, Zapcoil's chain arcs hop by hop, Gerald's plink and exit, and the
// salvage a cleared wreck pays. Render-only: it reads sim state.
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Sim, SimEvent, Tower } from '../../sim/index.ts';
import type { BattleInteraction } from '../input/BattleInteraction.ts';
import type { Vec2 } from '../iso.ts';
import type { AllyView } from '../views/AllyView.ts';
import type { ChainFx } from '../views/ChainFx.ts';
import type { CoreView } from '../views/CoreView.ts';
import type { EnemyView } from '../views/EnemyView.ts';
import type { FxView } from '../views/FxView.ts';
import { calloutText, LINK_CALLOUT, type LinkEnd, type LinkView } from '../views/LinkView.ts';
import type { PlinkFx } from '../views/PlinkFx.ts';
import type { ProjectileView } from '../views/ProjectileView.ts';
import type { SackBurstView } from '../views/SackBurstView.ts';
import { facingOf, tellGlyph } from '../views/spriteInfo.ts';
import type { TowerView } from '../views/TowerView.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from '../views/TransientFx.ts';
import type { ViewPool } from '../views/ViewPool.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import {
  BUILD_PUFF_MS,
  BUILD_PUFF_TILES,
  LEAK_RING_MS,
  LEAK_RING_TILES,
  SPLASH_RING_MS,
  UPGRADE_RING_MS,
  UPGRADE_RING_TILES,
} from '../vfx/fxTiming.ts';

/** Where floating numbers start above a ground point (px): a tower's head, the core's heart. */
const TOWER_FLOAT_LIFT_PX = 24;
const CORE_FLOAT_LIFT_PX = 46;
/** A link's callout (D059): its rings, and its name floated above the pair, held to be read. */
const LINK_RING_TILES = 0.75;
const LINK_RING_MS = 450;
const LINK_CALLOUT_LIFT_PX = 6;
const LINK_CALLOUT_MS = 1600;
/** A specialization's extra flash (D059): a gold ring past the upgrade's teal one. */
const SPEC_RING_TILES = 1.25;
const SPEC_RING_MS = 500;

/** A standing tower as render reads it. */
export type LiveTower = DeepReadonly<Tower>;

/** An ally's muzzle point (scratch). */
const muzzle: Vec2 = { x: 0, y: 0 };
/** Where Skyhook's flak leaves its tall barrels, and Zapcoil's arc its claw, above the tile (px). */
const FLAK_MUZZLE_PX = 16;
const ARC_EMITTER_PX = 14;
/** A cleared wreck's salvage floats up from its tile, over a dust ring. */
const SALVAGE_FLOAT_LIFT_PX = 12;
/** The nearest enemy within this (tiles) of a chain's strike point is the one struck. */
const STRUCK_NEAR_TILES = 0.75;

/** Where a shot meets an enemy's body (px above its ground point): flyers draw 12 px higher. */
function bodyLift(air: boolean): number {
  return BODY_LIFT_PX + (air ? AIR_LIFT_PX : 0);
}

/** What the event wiring drives: the scene's sim, view pools, and effect views. */
export interface BattleEventViews {
  readonly sim: Sim<IdSpace>;
  /** The host's event bus: drained sim events, dispatched once per frame. */
  readonly bus: Bus<SimEvent<IdSpace>>;
  readonly interaction: BattleInteraction;
  readonly towers: ViewPool<TowerView>;
  readonly enemies: ViewPool<EnemyView>;
  readonly projectiles: ViewPool<ProjectileView>;
  readonly allies: ViewPool<AllyView>;
  readonly fx: FxView;
  readonly links: LinkView;
  readonly sacks: SackBurstView;
  readonly core: CoreView;
  /** Zapcoil's chain arcs (T312a). */
  readonly chains: ChainFx;
  /** Gerald's plinks (T312a). */
  readonly plinks: PlinkFx;
  /** Each ability slot's strike radius after modifiers (Mk II; tiles, 0: none). */
  readonly strikeRadius: readonly number[];
  /** How far up a tower on tile (col, row) stands (px): one ELEV_H step on high ground. */
  liftPx(col: number, row: number): number;
  /** A tower was built (the onboarding pulse stops). */
  onBuilt(): void;
}

/** The standing tower `uid` in `pool`, or null (0 is no tower). */
export function findLiveTower(
  pool: Sim<IdSpace>['state']['towers'],
  uid: number,
): LiveTower | null {
  if (uid === 0) return null;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/**
 * Subscribes the playfield's views to the sim's events. Returns the unwiring, which also forgets
 * the shells in flight.
 */
export function bindBattleEvents(views: BattleEventViews): () => void {
  const { sim, bus, interaction, fx } = views;
  const map = sim.map;
  const content = sim.config.content;
  /**
   * Lobbed shells in flight, by uid → splash radius (tiles; negative for a bomblet): their impact
   * draws a burst and a ring (a bomblet: its small pop, no ring).
   */
  const shells = new Map<number, number>();
  /** Flak in flight, by uid → splash radius (tiles): it bursts at its flyer's height. */
  const flak = new Map<number, number>();
  /** The tower whose chain is being drawn (its uid-0 ProjectileHits are the arc's hops), or 0. */
  let chainTower = 0;
  /** The projectile sprites of the content's bomblets (Cluster Thumper's). */
  const bombletSprites = new Set<string>();
  for (const t of Object.values(content.towers)) {
    const attacks = [...t.tiers, ...(t.specs === null ? [] : [t.specs.a, t.specs.b])];
    for (const tier of attacks) {
      const b = tier.attack?.kind === 'lobbed' ? tier.attack.bomblets : null;
      if (b !== null && b !== undefined) bombletSprites.add(b.projectile);
    }
  }
  /** Enemy types whose tell glyph has shown this battle (once per type; D028). */
  const told = new Set<string>();
  /** A linked tower's tile and lift, for its tether; null if it's gone. */
  const linkEnd = (uid: number): LinkEnd | null => {
    const t = findLiveTower(sim.state.towers, uid);
    return t === null ? null : { uid, col: t.col, row: t.row, liftPx: views.liftPx(t.col, t.row) };
  };
  /** Whether the enemy `uid` flies (its slot keeps its def until reused, so a fresh kill counts). */
  const isFlyer = (uid: number): boolean => {
    const pool = sim.state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used ≤ items.length
      if (e.uid === uid) return e.def?.layer === 'air';
    }
    return false;
  };
  /** Whether the enemy struck at grid (x, y) flies: the nearest one there (a chain hop's height). */
  const flyerAt = (x: number, y: number): boolean => {
    const pool = sim.state.enemies;
    let best = STRUCK_NEAR_TILES * STRUCK_NEAR_TILES;
    let air = false;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used ≤ items.length
      if (e.def === null) continue;
      const d = (e.x - x) * (e.x - x) + (e.y - y) * (e.y - y);
      if (d <= best) {
        best = d;
        air = e.def.layer === 'air';
      }
    }
    return air;
  };
  /** How far up tower `uid` stands (px; 0 if it's gone). */
  const towerLift = (uid: number): number => {
    const t = findLiveTower(sim.state.towers, uid);
    return t === null ? 0 : views.liftPx(t.col, t.row);
  };
  const offs = [
    bus.on('TowerBuilt', (e) => {
      views.onBuilt();
      const tower = content.towers[e.tower]!; // built from the loadout
      const [c, r] = e.tile;
      views.towers.acquire(e.uid).show(e.uid, tower.sprites, 1, true, views.liftPx(c, r));
      fx.ring(c + 0.5, r + 0.5, BUILD_PUFF_TILES, 'steel.4', BUILD_PUFF_MS, true);
      fx.floatText(`−${e.cost}`, 'gold.3', c + 0.5, r + 0.5, TOWER_FLOAT_LIFT_PX);
    }),
    bus.on('TowerUpgraded', (e) => {
      const v = views.towers.get(e.uid);
      if (v === undefined) return;
      v.setTier(e.tier);
      v.flash();
      if (!Number.isNaN(v.x)) {
        fx.ring(v.x, v.y, UPGRADE_RING_TILES, 'teal.4', UPGRADE_RING_MS, true);
        fx.floatText(`−${e.cost}`, 'gold.3', v.x, v.y, TOWER_FLOAT_LIFT_PX);
      }
    }),
    bus.on('TowerSpecialized', (e) => {
      const v = views.towers.get(e.uid);
      const t = findLiveTower(sim.state.towers, e.uid);
      if (v === undefined || t === null) return;
      v.setTier(t.tier, t.spec);
      v.flash();
      fx.ring(t.x, t.y, UPGRADE_RING_TILES, 'teal.4', UPGRADE_RING_MS, true);
      fx.ring(t.x, t.y, SPEC_RING_TILES, 'gold.3', SPEC_RING_MS, true);
      fx.floatText(`−${e.cost}`, 'gold.3', t.x, t.y, TOWER_FLOAT_LIFT_PX);
    }),
    bus.on('LinkFormed', (e) => {
      const a = linkEnd(e.a);
      const b = linkEnd(e.b);
      if (a === null || b === null) return;
      views.links.form(e.link, a, b);
      // The moment gets its feedback (D059): a ring on both towers and the link's name, floated
      // between them ("CROSSFIRE!"); the chime is the audio's.
      const look = Object.hasOwn(LINK_CALLOUT, e.link) ? LINK_CALLOUT[e.link] : undefined;
      const name = content.links.find((l) => l.id === e.link)?.name;
      if (look === undefined) return;
      for (const t of [a, b]) {
        fx.ring(t.col + 0.5, t.row + 0.5, LINK_RING_TILES, look.ring, LINK_RING_MS, true);
      }
      // The pixel font has capitals, digits, and a few marks: a name it can't draw keeps its
      // rings and chime, and skips the text rather than throwing mid-battle (D061).
      const text = name === undefined ? '' : calloutText(name);
      if (text === '' || !canDraw(text)) return;
      const lift = TOWER_FLOAT_LIFT_PX + Math.max(a.liftPx, b.liftPx) + LINK_CALLOUT_LIFT_PX;
      const mx = (a.col + b.col) / 2 + 0.5;
      const my = (a.row + b.row) / 2 + 0.5;
      fx.floatText(text, look.text, mx, my, lift, LINK_CALLOUT_MS);
    }),
    bus.on('LinkBroken', (e) => {
      views.links.break(e.link, e.a, e.b);
    }),
    bus.on('TowerSold', (e) => {
      const v = views.towers.get(e.uid);
      if (v !== undefined && !Number.isNaN(v.x)) {
        fx.floatText(`+${e.refund}`, 'gold.4', v.x, v.y, TOWER_FLOAT_LIFT_PX);
      }
      views.towers.release(e.uid);
      if (interaction.selectedTower === e.uid) interaction.selectTower(0);
    }),
    bus.on('EnemySpawned', (e) => {
      const def = content.enemies[e.enemy]!; // spawned from the map's waves
      // A tell glyph shows over the first of each enemy type this battle, not every one (D028):
      // the body cue carries the rest.
      const glyph = told.has(e.enemy) ? null : tellGlyph(def.tells);
      if (glyph !== null) told.add(e.enemy);
      const route = Object.hasOwn(map.routes, e.route) ? (map.routes[e.route] ?? null) : null;
      views.enemies.acquire(e.uid).show(e.uid, def.sprites.body, def.layer === 'air', glyph, route);
    }),
    bus.on('EnemyDied', (e) => {
      views.enemies.release(e.uid);
      fx.burst(e.x, e.y); // the Act I death pop
    }),
    bus.on('SackBurst', (e) => {
      // The young run back up the route toward the warren (D059); render-only.
      const route = Object.hasOwn(map.routes, e.route) ? (map.routes[e.route] ?? null) : null;
      views.sacks.burst(e.x, e.y, route, e.dist, e.young);
    }),
    bus.on('EnemyLeaked', (e) => {
      const v = views.enemies.get(e.uid);
      const core = views.core.nearest(v?.x ?? Number.NaN, v?.y ?? Number.NaN);
      views.enemies.release(e.uid);
      if (e.leak <= 0) return;
      views.core.leak();
      fx.leakShake();
      if (core !== null) {
        fx.ring(core.x, core.y, LEAK_RING_TILES, 'red.3', LEAK_RING_MS, true);
        fx.floatText(`−${e.leak}`, 'red.3', core.x, core.y, CORE_FLOAT_LIFT_PX);
      }
    }),
    bus.on('ProjectileFired', (e) => {
      chainTower = 0;
      if (e.kind === 'chain') {
        // The hits that follow, in chain order, are the arc's hops (D076).
        chainTower = e.towerUid;
        views.chains.begin(e.x, e.y, ARC_EMITTER_PX + towerLift(e.towerUid));
      } else if (e.kind === 'hitscan') {
        fx.tracer(e.x, e.y, e.targetX, e.targetY, isFlyer(e.targetUid));
      } else if (e.kind === 'pulse') {
        if (e.radiusTiles > 0) fx.pulse(e.x, e.y, e.radiusTiles);
      } else if (e.sprite !== null) {
        // The event carries the shot's look and reach, so a tower sold mid-flight still shows
        // its shell and splash.
        if (e.kind === 'lobbed') {
          shells.set(e.uid, bombletSprites.has(e.sprite) ? -1 : e.radiusTiles);
          views.projectiles
            .acquire(e.uid)
            .show(e.uid, { sprite: e.sprite, flightTicks: e.flightTicks });
          return;
        }
        // Flak (D072): a straight shot climbing from the barrels to its flyer's height, bursting
        // at the intercept point.
        flak.set(e.uid, e.radiusTiles);
        views.projectiles.acquire(e.uid).show(e.uid, {
          sprite: e.sprite,
          flightTicks: e.flightTicks,
          liftFrom: FLAK_MUZZLE_PX + towerLift(e.towerUid),
          liftTo: bodyLift(isFlyer(e.targetUid)),
        });
      }
    }),
    bus.on('ProjectileHit', (e) => {
      if (e.uid === 0) {
        if (e.towerUid === chainTower) views.chains.hop(e.x, e.y, bodyLift(flyerAt(e.x, e.y)));
        return;
      }
      views.projectiles.release(e.uid);
      const burst = flak.get(e.uid);
      if (burst !== undefined) {
        // The flak bursts in the air; its splash shows on the ground, around the shadows it caught.
        flak.delete(e.uid);
        fx.ring(e.x, e.y, burst, 'orange.3', SPLASH_RING_MS, false);
        fx.burst(e.x, e.y, 0, true, AIR_LIFT_PX);
        return;
      }
      const splash = shells.get(e.uid);
      if (splash === undefined) return;
      shells.delete(e.uid);
      if (splash < 0) {
        // A bomblet: its own small pop, no ring (four rings would bury the shell's).
        fx.burst(e.x, e.y, 0, true);
        return;
      }
      // The splash radius in orange under the burst, sized by the firing tier.
      fx.ring(e.x, e.y, splash, 'orange.3', SPLASH_RING_MS, false);
      fx.burst(e.x, e.y);
    }),
    bus.on('AbilityUsed', (e) => {
      // A strike's reticle and landing at its real radius (abilityStats: Mk II). A segment
      // (Suppressing Fire) needs nothing here: FxView draws every live segment zone.
      const radius = views.strikeRadius[e.slot - 1] ?? 0;
      if (e.uid !== 0 && e.target !== null && radius > 0) {
        fx.strike(e.uid, e.target[0] + 0.5, e.target[1] + 0.5, radius);
      }
    }),
    bus.on('NeutralHit', (e) => {
      views.plinks.plink(e.x, e.y);
    }),
    bus.on('NeutralExited', (e) => {
      // Gerald delivered the mail and left: never a leak (D072).
      views.enemies.release(e.uid);
    }),
    bus.on('WreckageCleared', (e) => {
      // WreckageView swaps the wreck for its live tile; the salvage is income, floated in gold.
      const [c, r] = e.tile;
      fx.ring(c + 0.5, r + 0.5, BUILD_PUFF_TILES, 'steel.4', BUILD_PUFF_MS, true);
      if (e.salvage > 0) {
        fx.floatText(`+${e.salvage}`, 'gold.4', c + 0.5, r + 0.5, SALVAGE_FLOAT_LIFT_PX);
      }
    }),
    bus.on('AllySpawned', (e) => {
      views.allies.acquire(e.uid).show(e.uid, e.kind, e.x, e.y);
    }),
    bus.on('AllyAttacked', (e) => {
      const v = views.allies.get(e.uid);
      const air = isFlyer(e.targetUid);
      if (v === undefined || v.sprite === null) {
        fx.tracer(e.x, e.y, e.targetX, e.targetY, air);
        return;
      }
      v.fire(facingOf(e.targetX - e.x, e.targetY - e.y));
      v.muzzle(muzzle);
      fx.tracerFrom(muzzle.x, muzzle.y, e.targetX, e.targetY, air);
    }),
    bus.on('AllyRemoved', (e) => {
      views.allies.release(e.uid);
    }),
  ];
  return () => {
    for (const off of offs) off();
    shells.clear();
    flak.clear();
    chainTower = 0;
  };
}
