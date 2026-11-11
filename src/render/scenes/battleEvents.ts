// The playfield's sim-event wiring (T225 split from BattleScene.ts): views are created and released
// from sim events, and the event-driven effects and feedback juice (D026, D059) fire from them:
// build dust and costs, upgrade and specialize rings, link tethers and callouts, deaths, leaks,
// shells and bomblets, the strike's landing, and Bricks's shots; and M3's (T312a): flak climbing
// to a flyer and bursting there, Zapcoil's chain arcs hop by hop, Gerald's plink and exit, and the
// salvage a cleared wreck pays; and T312b's: younglings drawn as `enemy.youngling`, a brood popping
// in where it's born (a split's children, a sneeze, a surfacing), a splitter's pink pop, a boss's
// phase change (its bar flashes, gold and white rings, a 1 px shake) and the sparks of shots
// plinking off it while it's invulnerable, its ending fading the bar, and props on cues landing
// with their wave's countdown; T328's health bars scaled to each unit's def (none on a boss or a
// neutral unit); and T329's: a link formed by this frame's build floats its callout clear of the
// new tower's `−cost`; and T430a's: deaths in the act's tone (deathLook.ts: Act I's comic pop, Act
// II's quiet pop and lingering stardust fleck, the Aelari's shatter, the Hollow's unravelling
// violet motes), the hush's vanish (its tell is EnemyView's, on sim ticks), and Cloudburst's
// pulse ring at the flyers' height as well as on the ground. Render-only: it reads sim state.
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import type { Sim, SimEvent, Tower } from '../../sim/index.ts';
import type { BattleInteraction } from '../input/BattleInteraction.ts';
import type { Vec2 } from '../iso.ts';
import type { AllyView } from '../views/AllyView.ts';
import type { BossBarView } from '../views/BossBarView.ts';
import type { CuePropView } from '../views/CuePropView.ts';
import type { ChainFx } from '../views/ChainFx.ts';
import type { CoreView } from '../views/CoreView.ts';
import { presentationOfMap } from '../../story/presentation.ts';
import { deathStyle } from '../views/deathLook.ts';
import type { EnemyView } from '../views/EnemyView.ts';
import type { FxView } from '../views/FxView.ts';
import {
  calloutLiftOver,
  calloutText,
  LINK_CALLOUT,
  type LinkEnd,
  type LinkView,
} from '../views/LinkView.ts';
import type { PlinkFx } from '../views/PlinkFx.ts';
import type { ProjectileView } from '../views/ProjectileView.ts';
import type { SackBurstView } from '../views/SackBurstView.ts';
import { enemyBody, facingOf, isRunner, unitGlyph } from '../views/spriteInfo.ts';
import { FREEZE_RING_COLOR, FREEZE_RING_MS } from '../views/stasisLook.ts';
import type { TowerView } from '../views/TowerView.ts';
import { AIR_LIFT_PX, BODY_LIFT_PX } from '../views/TransientFx.ts';
import type { ViewPool } from '../views/ViewPool.ts';
import { barMaxHp } from '../vfx/healthBar.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import {
  BUILD_PUFF_MS,
  PULSE_MS,
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
/** A brood born mid-route (not at its route's start): it pops in. */
const BROOD_MIN_DIST_TILES = 0.01;
/** A splitter's pop where it fell (T312b): a quick pink ring. */
const SPLIT_RING_TILES = 0.6;
const SPLIT_RING_MS = 300;
/** A boss's phase change (the telegraph's first beat): a wide gold ring and a white one inside. */
const PHASE_RING_TILES = 1.5;
const PHASE_RING_MS = 600;
const PHASE_FLASH_RING_TILES = 0.75;
const PHASE_FLASH_RING_MS = 250;
/** Shots bouncing off a boss between phases spark on its body, this high (px). */
const BOSS_SPARK_LIFT_PX = 18;
/** A specialization's extra flash (D059): a gold ring past the upgrade's teal one. */
const SPEC_RING_TILES = 1.25;
const SPEC_RING_MS = 500;
/**
 * The hush rule (T402): when the hush lands, the runner vanishes in a small acid ring (never a
 * pop). Its tell (the closing ring, the Hollow unit's reach) is EnemyView's, on sim ticks.
 */
const HUSH_RING_TILES = 0.6;
const HUSH_RING_MS = 300;
/** Cloudburst's ring at the flyers' height (its ground ring is the Sprinkler's `blue.4`). */
const AIR_PULSE_COLOR = 'white.1';
/** Where a death's shards and motes start: the body's middle, above its ground point (px). */
const DEATH_BODY_PX = 6;

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
  /** Gerald's plinks (T312a), and the sparks off an invulnerable boss (T312b). */
  readonly plinks: PlinkFx;
  /** The boss bar (T312b). */
  readonly bossBar: BossBarView;
  /** Props that land on a cue (T312b). */
  readonly cueProps: CuePropView;
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
  /** The map's Skitterkin death, a presentation dial (core-loop.md § 6.7). */
  const skitterkinDeath = presentationOfMap(map).skitterkinDeath;
  /**
   * Lobbed shells in flight, by uid → splash radius (tiles; negative for a bomblet): their impact
   * draws a burst and a ring (a bomblet: its small pop, no ring).
   */
  const shells = new Map<number, number>();
  /** Flak in flight, by uid → splash radius (tiles): it bursts at its flyer's height. */
  const flak = new Map<number, number>();
  /** The tower whose chain is being drawn (its uid-0 ProjectileHits are the arc's hops), or 0. */
  let chainTower = 0;
  /** The tower whose volley is arriving (its seekers fan out by their place in it), and the next place. */
  let volleyTower = 0;
  let volleyPlace = 0;
  /** The projectile sprites of the content's bomblets (Cluster Thumper's). */
  const bombletSprites = new Set<string>();
  /** The projectile sprites of the content's homing shots (Seeker Swarm's missiles, T407b). */
  const seekerSprites = new Set<string>();
  for (const t of Object.values(content.towers)) {
    const attacks = [...t.tiers, ...(t.specs === null ? [] : [t.specs.a, t.specs.b])];
    for (const tier of attacks) {
      const b = tier.attack?.kind === 'lobbed' ? tier.attack.bomblets : null;
      if (b !== null && b !== undefined) bombletSprites.add(b.projectile);
      const a = tier.attack;
      if (a?.kind === 'projectile' && a.homing) seekerSprites.add(a.projectile);
    }
  }
  /** Enemy types whose tell glyph has shown this battle (once per type; D028). */
  const told = new Set<string>();
  /** Fleeing carriers alive now: their sack is untied, so it bursts as `burst_young` (T430b). */
  const untied = new Set<number>();
  /**
   * Towers built in this frame's dispatch (its events all carry the same sim tick), whose `−cost`
   * floaters a link's callout must clear (T329), and that tick.
   */
  const builtNow = new Set<number>();
  let builtTick = -1;
  /** Scratch grid points for the callout's placement. */
  const calloutMid: Vec2 = { x: 0, y: 0 };
  const calloutEnd: Vec2 = { x: 0, y: 0 };
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
  /** The enemy `uid` in the pool (its slot keeps it until reused, so a fresh death finds it), or null. */
  const enemyOf = (uid: number): Sim<IdSpace>['state']['enemies']['items'][number] | null => {
    const pool = sim.state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used ≤ items.length
      if (e.uid === uid) return e;
    }
    return null;
  };
  /** Whether a hit at grid (x, y) that took nothing struck a boss between phases (its plinks). */
  const shieldedBossAt = (x: number, y: number): boolean => {
    const pool = sim.state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used ≤ items.length
      if (!e.alive || e.invulnerableTicks <= 0) continue;
      if ((e.x - x) * (e.x - x) + (e.y - y) * (e.y - y) <= STRUCK_NEAR_TILES * STRUCK_NEAR_TILES) {
        return true;
      }
    }
    return false;
  };
  /** Whether tower `uid`'s attack (its spec's at tier 4, else its tier's) reaches flyers. */
  const pulseHitsAir = (uid: number): boolean => {
    const t = findLiveTower(sim.state.towers, uid);
    const def = t?.def ?? null;
    if (t === null || def === null) return false;
    const spec = t.spec === null || def.specs === null ? null : def.specs[t.spec];
    return (spec ?? def.tiers[t.tier - 1])?.targets.air ?? false;
  };
  /** How far up tower `uid` stands (px; 0 if it's gone). */
  const towerLift = (uid: number): number => {
    const t = findLiveTower(sim.state.towers, uid);
    return t === null ? 0 : views.liftPx(t.col, t.row);
  };
  const offs = [
    bus.on('TowerBuilt', (e) => {
      views.onBuilt();
      if (sim.state.tick !== builtTick) {
        builtNow.clear();
        builtTick = sim.state.tick;
      }
      builtNow.add(e.uid);
      const tower = content.towers[e.tower]!; // built from the loadout
      const [c, r] = e.tile;
      const lift = views.liftPx(c, r);
      views.towers.acquire(e.uid).show(e.uid, tower.sprites, 1, true, lift);
      fx.ring(c + 0.5, r + 0.5, BUILD_PUFF_TILES, 'steel.4', BUILD_PUFF_MS, true, lift);
      fx.floatText(`−${e.cost}`, 'gold.3', c + 0.5, r + 0.5, TOWER_FLOAT_LIFT_PX + lift);
    }),
    bus.on('TowerUpgraded', (e) => {
      const v = views.towers.get(e.uid);
      if (v === undefined) return;
      v.setTier(e.tier);
      v.flash();
      if (!Number.isNaN(v.x)) {
        // On high ground the ring sits on the block's top face, with the tower (T221).
        const lift = towerLift(e.uid);
        fx.ring(v.x, v.y, UPGRADE_RING_TILES, 'teal.4', UPGRADE_RING_MS, true, lift);
        fx.floatText(`−${e.cost}`, 'gold.3', v.x, v.y, TOWER_FLOAT_LIFT_PX + lift);
      }
    }),
    bus.on('TowerSpecialized', (e) => {
      const v = views.towers.get(e.uid);
      const t = findLiveTower(sim.state.towers, e.uid);
      if (v === undefined || t === null) return;
      v.setTier(t.tier, t.spec);
      v.flash();
      const lift = views.liftPx(t.col, t.row);
      fx.ring(t.x, t.y, UPGRADE_RING_TILES, 'teal.4', UPGRADE_RING_MS, true, lift);
      fx.ring(t.x, t.y, SPEC_RING_TILES, 'gold.3', SPEC_RING_MS, true, lift);
      fx.floatText(`−${e.cost}`, 'gold.3', t.x, t.y, TOWER_FLOAT_LIFT_PX + lift);
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
        fx.ring(t.col + 0.5, t.row + 0.5, LINK_RING_TILES, look.ring, LINK_RING_MS, true, t.liftPx);
      }
      // The pixel font has capitals, digits, and a few marks: a name it can't draw keeps its
      // rings and chime, and skips the text rather than throwing mid-battle (D061).
      const text = name === undefined ? '' : calloutText(name, presentationOfMap(map).counter);
      if (text === '' || !canDraw(text)) return;
      let lift = TOWER_FLOAT_LIFT_PX + Math.max(a.liftPx, b.liftPx) + LINK_CALLOUT_LIFT_PX;
      calloutMid.x = (a.col + b.col) / 2 + 0.5;
      calloutMid.y = (a.row + b.row) / 2 + 0.5;
      // A link formed by this frame's build floats over the new tower's `−cost` (T329).
      if (builtTick === sim.state.tick) {
        for (const t of [a, b]) {
          if (!builtNow.has(t.uid)) continue;
          calloutEnd.x = t.col + 0.5;
          calloutEnd.y = t.row + 0.5;
          lift = calloutLiftOver(lift, calloutMid, calloutEnd, TOWER_FLOAT_LIFT_PX + t.liftPx);
        }
      }
      fx.floatText(text, look.text, calloutMid.x, calloutMid.y, lift, LINK_CALLOUT_MS);
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
      // A runner wears the Skittish glyph instead of its own (D134): the first runner of each
      // type shows it, apart from that type's first non-runner.
      const unit = enemyOf(e.uid);
      const runner = unit !== null && isRunner(def, unit.tags);
      const key = runner ? `${e.enemy}:fleeing` : e.enemy;
      const glyph = told.has(key) ? null : unitGlyph(def.tells, runner);
      if (glyph !== null) told.add(key);
      const route = Object.hasOwn(map.routes, e.route) ? (map.routes[e.route] ?? null) : null;
      // A `youngling`-tagged unit draws as the little one (D074).
      const body = enemyBody(def.sprites.body, unit?.tags ?? []);
      if (def.carrierYoung > 0 && unit?.tags.includes('fleeing') === true) untied.add(e.uid);
      const v = views.enemies.acquire(e.uid);
      v.show(e.uid, body, def.layer === 'air', glyph, route);
      v.setBar(barMaxHp(def), def.shield?.hp ?? 0);
      // A brood (a split's children, a sneeze, a surfacing) is born mid-route: it pops in.
      if (unit !== null && unit.dist > BROOD_MIN_DIST_TILES) v.popIn();
    }),
    bus.on('EnemyDied', (e) => {
      // The death tone by the map's dial and faction (deathLook.ts): Act I's comic pop is the unit's own
      // `death` anim (T311c), Act II's the same pop without the confetti and a fleck left lying;
      // the Aelari shatter and the Hollow unravel; a sprite with no death anim bursts.
      const def = Object.hasOwn(content.enemies, e.enemy) ? content.enemies[e.enemy] : undefined;
      const style = def === undefined ? 'comic' : deathStyle(skitterkinDeath, def.faction);
      const lift = DEATH_BODY_PX + (def?.layer === 'air' ? AIR_LIFT_PX : 0);
      const popped = views.enemies.get(e.uid)?.die(style) === true;
      views.enemies.release(e.uid);
      if (style === 'shatter') fx.shatter(e.x, e.y, lift);
      else if (style === 'unravel') fx.unravel(e.x, e.y, lift);
      // Everglow's `shutdown` is EverglowView's (it binds EnemyDied itself; T603).
      else if (!popped && style !== 'shutdown') {
        fx.burst(e.x, e.y, 0, style !== 'comic' && style !== 'burst');
      }
      if (style === 'quiet') fx.fleck(e.x, e.y);
      // A splitter's pop (its children spawn here this tick and pop in).
      const split = Object.hasOwn(content.enemies, e.enemy)
        ? content.enemies[e.enemy]?.split
        : null;
      if (split !== null && split !== undefined) {
        fx.ring(e.x, e.y, SPLIT_RING_TILES, 'pink.3', SPLIT_RING_MS, true);
      }
    }),
    bus.on('BossPhase', (e) => {
      views.bossBar.phase(e.uid, e.phase);
      if (e.phase <= 1) return;
      // The telegraph's first beat (enemies.md § 6): she flashes and puffs up, rings go out, and
      // the screen shakes a pixel (a boss's to have, art-direction §7).
      views.enemies.get(e.uid)?.flash();
      const boss = enemyOf(e.uid);
      if (boss !== null) {
        fx.ring(boss.x, boss.y, PHASE_RING_TILES, 'gold.4', PHASE_RING_MS, true);
        fx.ring(boss.x, boss.y, PHASE_FLASH_RING_TILES, 'white.1', PHASE_FLASH_RING_MS, true);
      }
      fx.leakShake();
    }),
    bus.on('Hushed', (e) => {
      untied.delete(e.victim);
      views.enemies.release(e.victim);
      fx.ring(e.x, e.y, HUSH_RING_TILES, 'acid.3', HUSH_RING_MS, true);
    }),
    bus.on('TurnedHeavy', (e) => {
      views.enemies.get(e.uid)?.flash(); // it heals to full: a flash, then the Heavy tint
    }),
    bus.on('BossEnded', (e) => {
      // Driven off: she turns and runs for the edge with her brood (EnemyView's `flee`); the bar
      // holds a moment and steps out.
      views.bossBar.ended(e.uid, e.how === 'pivot'); // a pivot steps out at once (T530a)
    }),
    bus.on('CountdownStarted', (e) => {
      views.cueProps.reveal(e.wave);
    }),
    bus.on('WaveStarted', (e) => {
      views.cueProps.reveal(e.wave);
    }),
    bus.on('SackBurst', (e) => {
      // The young run back up the route toward the warren (D059); render-only.
      const route = Object.hasOwn(map.routes, e.route) ? (map.routes[e.route] ?? null) : null;
      views.sacks.burst(e.x, e.y, route, e.dist, e.young, untied.delete(e.uid));
    }),
    bus.on('EnemyLeaked', (e) => {
      untied.delete(e.uid);
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
    // Flash Freeze's burst (T407a; stasisLook.ts): a pale ice ring over the pulse's reach.
    bus.on('PulseBurst', (e) => {
      // A Stasis Bloom's pulse rings its own six-petalled burst (BloomView, T630a).
      if ((findLiveTower(sim.state.towers, e.towerUid)?.tierDef?.field ?? null) !== null) return;
      fx.ring(e.x, e.y, e.radiusTiles, FREEZE_RING_COLOR, FREEZE_RING_MS, true);
    }),
    bus.on('ProjectileFired', (e) => {
      chainTower = 0;
      if (e.kind === 'chain') {
        // The hits that follow, in chain order, are the arc's hops (D076).
        chainTower = e.towerUid;
        views.chains.begin(e.x, e.y, ARC_EMITTER_PX + towerLift(e.towerUid));
      } else if (e.kind === 'hitscan') {
        fx.tracer(e.x, e.y, e.targetX, e.targetY, isFlyer(e.targetUid));
      } else if (e.kind === 'line') {
        // Skewer (T408): the streak runs to the line's far end; HarpoonView draws the line.
        fx.tracer(e.x, e.y, e.targetX, e.targetY, false);
      } else if (e.kind === 'pulse') {
        if (e.radiusTiles > 0) fx.pulse(e.x, e.y, e.radiusTiles);
        // A pulse that reaches flyers (Cloudburst, D112) rings at their height too, in cloud
        // white, so the burst reads where the flyers are as well as on the road.
        if (e.radiusTiles > 0 && pulseHitsAir(e.towerUid)) {
          fx.ring(e.x, e.y, e.radiusTiles, AIR_PULSE_COLOR, PULSE_MS, true, AIR_LIFT_PX);
        }
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
        // at the intercept point. A seeker (T407b) climbs, turns, and trails smoke as it steers.
        // No splash: its landing pops small with no ring.
        const seeker = seekerSprites.has(e.sprite);
        // A volley's shots arrive together: each fans out by its place in it.
        volleyPlace = seeker && e.towerUid === volleyTower ? volleyPlace + 1 : 0;
        volleyTower = seeker ? e.towerUid : 0;
        flak.set(e.uid, e.radiusTiles);
        views.projectiles.acquire(e.uid).show(e.uid, {
          sprite: e.sprite,
          flightTicks: e.flightTicks,
          liftFrom: FLAK_MUZZLE_PX + towerLift(e.towerUid),
          liftTo: bodyLift(isFlyer(e.targetUid)),
          seeker,
          fan: volleyPlace,
        });
      }
    }),
    bus.on('ProjectileHit', (e) => {
      // A hit that took nothing off a boss between phases plinks off it (enemies.md § 6).
      if (e.damage <= 0 && shieldedBossAt(e.x, e.y)) {
        views.plinks.spark(e.x, e.y, BOSS_SPARK_LIFT_PX);
      }
      if (e.uid === 0) {
        if (e.towerUid === chainTower) views.chains.hop(e.x, e.y, bodyLift(flyerAt(e.x, e.y)));
        return;
      }
      views.projectiles.release(e.uid);
      const burst = flak.get(e.uid);
      if (burst !== undefined) {
        // The flak bursts in the air, and its splash rings out there too, at the flyers' height
        // round the burst, so the hit reads where the flyers are (D097), not on the grass below.
        flak.delete(e.uid);
        fx.ring(e.x, e.y, burst, 'orange.3', SPLASH_RING_MS, false, AIR_LIFT_PX);
        fx.burst(e.x, e.y, 0, true, AIR_LIFT_PX);
        return;
      }
      const splash = shells.get(e.uid);
      if (splash === undefined) return;
      shells.delete(e.uid);
      if (splash < 0) {
        // A bomblet: its own small pop, no ring (four rings would bury the shell's); capped per tile.
        fx.shellBurst(e.x, e.y, true);
        return;
      }
      // The splash radius in orange under the burst, sized by the firing tier. The burst is capped per
      // tile (TransientFx `shellBurst`), so a choke under several Thumpers isn't buried; the ring
      // always shows what the shell covered.
      fx.ring(e.x, e.y, splash, 'orange.3', SPLASH_RING_MS, false);
      fx.shellBurst(e.x, e.y);
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
      views.plinks.plink(e.x, e.y, e.uid);
    }),
    bus.on('NeutralExited', (e) => {
      // Gerald delivered the mail and left: never a leak (D072).
      views.enemies.release(e.uid);
    }),
    // The Crane's income and Reel It In's credits (T408): gold floaters, a wave's and interest
    // over the tower, a kill's where the unit fell.
    bus.on('TowerIncome', (e) => {
      const lift =
        e.kind === 'kill' ? SALVAGE_FLOAT_LIFT_PX : TOWER_FLOAT_LIFT_PX + towerLift(e.towerUid);
      fx.floatText(`+${e.credits}`, 'gold.4', e.x, e.y, lift);
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
  // A battle that starts past tick 0 resumed from a checkpoint (app/checkpoints.ts): its replay ran
  // before this scene, so the views the events would have made come from the state instead (towers
  // and enemies sync every frame): the active links' tethers, and the props cued by now.
  if (sim.state.tick > 0) {
    const pairs = sim.state.linkPairs;
    for (let i = 0; i < pairs.length; i += 3) {
      const link = content.links[pairs[i]!]; // i < length, a multiple of 3
      const a = linkEnd(pairs[i + 1]!);
      const b = linkEnd(pairs[i + 2]!);
      if (link !== undefined && a !== null && b !== null) views.links.form(link.id, a, b);
    }
    views.cueProps.reveal(Math.max(sim.state.wave, sim.state.schedule.countdownWave));
  }
  return () => {
    for (const off of offs) off();
    shells.clear();
    flak.clear();
    chainTower = 0;
    builtNow.clear();
    builtTick = -1;
  };
}
