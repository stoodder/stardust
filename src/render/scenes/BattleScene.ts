// The playfield (architecture.md § Rendering). Each frame: the host loop advances the sim and
// dispatches its events (views are created and released from them), then views are positioned
// from sim state, and the hover, selection, range ring, and placement ghost are redrawn. Pointer
// input becomes intents (input/intents.ts), and intents become commands through `deps.issue`.
// Event-driven effects (tracers, pulse rings, shell bursts, the Orbital Strike, and the feedback
// juice: leaks, builds, upgrades, sells, deaths) are FxView's; the core's flash and low-integrity
// glow are CoreView's. Until the first build, free pads pulse (onboarding, D026); from W2's
// countdown until the first upgrade, built towers pulse (`deps.teachUpgrade`, D028).
// The keyboard tile cursor (T126) is CursorView's; while it shows, the hover feedback follows it
// instead of the pointer, and moving the mouse (or clicking) hides it.
// Allies (Bricks at his post, T207b) are AllyView's: they face their targets and fire with a
// tracer. Aiming a strike shows its reticle at its real radius (`abilityStats`, so Orbital Strike
// Mk II's is wider); aiming Suppressing Fire tints the stretch of path it would cover (the sim's
// `segmentSpan`), and a live segment is FxView's strip of suppressive fire.
// Towers draw their tier's look (a specialized tower its spec's base and head, T202d) and stand on
// high ground's block, ELEV_H up; picking knows raised tiles, so a click on a block's top face
// lands on it. Linked towers show a tether (LinkView, from LinkFormed / LinkBroken). A Cluster
// Thumper's bomblets pop with their own small burst.
// The scene only reads sim state; every change goes through a command.
import * as Phaser from 'phaser';
import type { CompiledTowerDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import {
  abilityStats,
  costFor,
  isBuildableTile,
  segmentSpan,
  tileAndLinkRules,
  tileElevation,
  type Command,
  type SegmentSpan,
  type Sim,
  type SimEvent,
  type Tower,
} from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { BattleInteraction } from '../input/BattleInteraction.ts';
import { applyIntent } from '../input/apply.ts';
import { hoverLook, resolveClick, type TileFacts } from '../input/intents.ts';
import { emptyTileFacts, fillTileFacts, slotAimsAtPath } from '../input/tileFacts.ts';
import {
  ELEV_H,
  gridToScreen,
  HALF_H,
  mapOrigin,
  pickTile,
  type IsoOrigin,
  type Vec2,
} from '../iso.ts';
import { createLayers } from '../layers.ts';
import { prefersReducedMotion, pulseOn } from '../motion.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { SPRITE_SOURCE_KEY } from '../sprites/CodeSpriteSource.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { AllyView } from '../views/AllyView.ts';
import { CoreView } from '../views/CoreView.ts';
import { CursorView } from '../views/CursorView.ts';
import { EnemyView } from '../views/EnemyView.ts';
import { FxView } from '../views/FxView.ts';
import { drawGround } from '../views/GroundView.ts';
import { calloutText, LINK_CALLOUT, LinkView, type LinkEnd } from '../views/LinkView.ts';
import { PING_RING_EVERY_MS } from '../vfx/pingPixels.ts';
import { canDraw } from '../vfx/pixelFont.ts';
import { PingView } from '../views/PingView.ts';
import { SackBurstView } from '../views/SackBurstView.ts';
import { PlacementView } from '../views/PlacementView.ts';
import { ProjectileView } from '../views/ProjectileView.ts';
import { facingOf, tellGlyph } from '../views/spriteInfo.ts';
import {
  BUILD_PUFF_MS,
  BUILD_PUFF_TILES,
  LEAK_RING_MS,
  LEAK_RING_TILES,
  SPLASH_RING_MS,
  UPGRADE_RING_MS,
  UPGRADE_RING_TILES,
} from '../vfx/fxTiming.ts';
import { TowerView } from '../views/TowerView.ts';
import type { ViewContext } from '../views/ViewContext.ts';
import { ViewPool } from '../views/ViewPool.ts';

export const BATTLE_SCENE_KEY = 'Battle';

/** What the scene needs from the app (app/battle.ts provides it). */
export interface BattleSceneDeps {
  readonly sim: Sim<IdSpace>;
  /** The host's event bus: drained sim events, dispatched once per frame. */
  readonly bus: Bus<SimEvent<IdSpace>>;
  readonly interaction: BattleInteraction;
  /** Advances the host loop by one rendered frame (app/host.ts). */
  frame(deltaMs: number): void;
  /** Issues a player command (app/commands.ts). */
  issue(cmd: Command<IdSpace>): void;
  /** Called once, after the scene's first rendered frame. */
  onFirstFrame(): void;
  /** An armed click on a tile nothing can be built on (the HUD says so). */
  onCantBuild(): void;
  /** Whether built towers pulse to teach upgrading (app/hud.ts decides; D028). */
  teachUpgrade(): boolean;
  /**
   * A nonzero id while a radio line points at the first-built tower (D059's Denise pointer; a new
   * id is a new ping), else 0. Optional: without it nothing is pointed at.
   */
  pointFirstTower?(): number;
}

/** Where floating numbers start above a ground point (px): a tower's head, the core's heart. */
const TOWER_FLOAT_LIFT_PX = 24;
/** A link's callout (D059): its rings, and its name floated above the pair, held to be read. */
const LINK_RING_TILES = 0.75;
const LINK_RING_MS = 450;
const LINK_CALLOUT_LIFT_PX = 6;
const LINK_CALLOUT_MS = 1600;
/** A specialization's extra flash (D059): a gold ring past the upgrade's teal one. */
const SPEC_RING_TILES = 1.25;
const SPEC_RING_MS = 500;
/** A tile bonus fraction as the ghost label's percent ("+25%"). */
function pct(frac: number): string {
  return `+${Math.round(frac * 100)}%`;
}

/** The Denise pointer's ring (D059), and the arrow's spot over the turret head (scratch). */
const PING_RING_TILES = 1;
const PING_RING_MS = 700;
const pingAt: Vec2 = { x: 0, y: 0 };
const CORE_FLOAT_LIFT_PX = 46;
type LiveTower = DeepReadonly<Tower>;
/** Most route tiles a segment preview can tint (FxView draws up to 12). */
const MAX_PREVIEW_TILES = 12;

export class BattleScene extends Phaser.Scene {
  readonly #deps: BattleSceneDeps;
  #origin: IsoOrigin = { x: 0, y: 0 };
  #towers!: ViewPool<TowerView>;
  #enemies!: ViewPool<EnemyView>;
  #projectiles!: ViewPool<ProjectileView>;
  #allies!: ViewPool<AllyView>;
  #placement!: PlacementView;
  #fx!: FxView;
  #core!: CoreView;
  #cursor!: CursorView;
  #links!: LinkView;
  #sacks!: SackBurstView;
  #ping!: PingView;
  /** The radio pointer id last pinged (0: none). */
  #pinged = 0;
  /** The tower that pointer pinged (0: none), and ms since its ring last pulsed. */
  #pingTower = 0;
  #pingRingMs = 0;
  /**
   * Lobbed shells in flight, by uid → splash radius (tiles; negative for a bomblet): their impact
   * draws a burst and a ring (a bomblet: its small pop, no ring).
   */
  readonly #shells = new Map<number, number>();
  /** The projectile sprites of the content's bomblets (Cluster Thumper's). */
  readonly #bombletSprites = new Set<string>();
  /** A tile's elevation level by row-major index (1 for high ground), for picking. */
  readonly #elevationAt = (index: number): number => {
    const t = this.#deps.sim.map.tiles[index];
    return t === undefined ? 0 : tileElevation(t);
  };
  /** A tile's elevation level by column and row. */
  readonly #elevationOf = (col: number, row: number): number =>
    this.#elevationAt(row * this.#deps.sim.map.cols + col);
  /** Whether a tower has been built this battle (the onboarding pulse stops). */
  #built = false;
  /** Enemy types whose tell glyph has shown this battle (once per type; D028). */
  readonly #told = new Set<string>();
  /** Whether any teach pulse is showing (so a hidden pulse isn't re-hidden every frame). */
  #teachShown = false;
  /** Teach-pulse tile tests, bound once (not a closure per frame). */
  readonly #freeTile = (col: number, row: number): boolean => this.#towerSlotAt(col, row) < 0;
  readonly #towerTile = (col: number, row: number): boolean => this.#towerSlotAt(col, row) >= 0;
  readonly #noTile = (): boolean => false;
  #stamp = 0;
  /** The pointer in game pixels, or NaN while it's off the canvas. */
  #px = Number.NaN;
  #py = Number.NaN;
  readonly #offs: (() => void)[] = [];
  /** Scratch for the tile under the pointer (or the keyboard cursor), reused every frame. */
  readonly #tile = emptyTileFacts();
  /** Each ability slot's strike radius after modifiers (Mk II), and segment reach (tiles; 0: none). */
  readonly #strikeRadius: [number, number] = [0, 0];
  readonly #segmentReach: [number, number] = [0, 0];
  /** Scratch for the segment preview: the span on one route, and the tiles (col, row pairs). */
  readonly #span: SegmentSpan = { lo: 0, hi: 0, distFrom: 0, distTo: 0 };
  readonly #previewTiles: number[] = Array.from({ length: 2 * MAX_PREVIEW_TILES }, () => 0);
  /** The tile the segment preview was last drawn for, so it's recomputed only on a move. */
  #previewAt = -2;
  readonly #muzzle: Vec2 = { x: 0, y: 0 };
  /** The ally Suppressing Fire's streaks come from (Bricks), and his post (grid), or null. */
  #shooter: AllyView | null = null;
  #shooterX = 0;
  #shooterY = 0;

  /** `key` must be unique among live scenes (the app numbers successive battles). */
  constructor(deps: BattleSceneDeps, key: string = BATTLE_SCENE_KEY) {
    super(key);
    this.#deps = deps;
  }

  /** The iso origin of the map (grid point (0, 0) in game pixels). */
  get origin(): IsoOrigin {
    return this.#origin;
  }

  /** Game-pixel position of a tile's center, for the `tileToClient` test hook. */
  tileCenter(col: number, row: number, out: Vec2): void {
    // A raised tile's center is on its block's top face, where a click picks it.
    gridToScreen(col + 0.5, row + 0.5, this.#origin, out, this.#elevationOf(col, row));
    // A flat tile right behind high ground has its center on the block's top vertex, which picks
    // the block: nudge up into the tile's own visible top half.
    const map = this.#deps.sim.map;
    const index = row * map.cols + col;
    for (let dy = 0; dy < HALF_H; dy++) {
      if (
        pickTile(out.x, out.y - dy, this.#origin, map.cols, map.rows, this.#elevationAt) !== index
      ) {
        continue;
      }
      out.y -= dy;
      return;
    }
  }

  /** How many link tethers show (the smoke flows' check). */
  get tethers(): number {
    return this.#links.count;
  }

  create(): void {
    const { sim, bus, interaction } = this.#deps;
    const map = sim.map;
    // BootScene stores the baked sprite source in the registry (architecture.md § Rendering).
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- BootScene sets it before any battle
    const sprites = this.registry.get(SPRITE_SOURCE_KEY) as SpriteSource;
    const layers = createLayers(this);
    this.#origin = mapOrigin(map.cols, map.rows, VIEW_W, VIEW_H);
    const ctx: ViewContext = { scene: this, sprites, layers, origin: this.#origin };

    const coreProps = drawGround(ctx, map, map.env);
    this.#towers = new ViewPool(() => new TowerView(ctx));
    this.#enemies = new ViewPool(() => new EnemyView(ctx));
    this.#projectiles = new ViewPool(() => new ProjectileView(ctx));
    this.#allies = new ViewPool(() => new AllyView(ctx));
    this.#placement = new PlacementView(ctx, this.#elevationOf);
    this.#links = new LinkView(ctx, prefersReducedMotion);
    this.#bombletSprites.clear();
    for (const t of Object.values(sim.config.content.towers)) {
      const attacks = [...t.tiers, ...(t.specs === null ? [] : [t.specs.a, t.specs.b])];
      for (const tier of attacks) {
        const b = tier.attack?.kind === 'lobbed' ? tier.attack.bomblets : null;
        if (b !== null && b !== undefined) this.#bombletSprites.add(b.projectile);
      }
    }
    this.#fx = new FxView(ctx, prefersReducedMotion);
    this.#sacks = new SackBurstView(ctx);
    this.#shooter = null;
    this.#ping = new PingView(ctx, prefersReducedMotion);
    this.#pinged = 0;
    this.#pingTower = 0;
    // Each Suppressing Fire streak flashes Bricks's muzzle toward where it lands (D059).
    this.#fx.onRake = (x, y) => {
      const v = this.#shooter;
      if (v === null) return;
      v.fire(facingOf(x - this.#shooterX, y - this.#shooterY));
      v.muzzle(this.#muzzle);
      this.#fx.setFireSource(this.#muzzle.x, this.#muzzle.y);
    };
    this.#core = new CoreView(ctx, map, prefersReducedMotion, coreProps);
    this.#cursor = new CursorView(ctx);
    const teach: [number, number][] = [];
    map.tiles.forEach((t, i) => {
      if (isBuildableTile(t)) teach.push([i % map.cols, Math.floor(i / map.cols)]);
    });
    this.#placement.setTeachTiles(teach);
    this.#previewAt = -2;
    for (const slot of [1, 2] as const) {
      const a = sim.config.abilities;
      const id = slot === 1 ? a.slot1 : a.slot2;
      const def = id === null ? undefined : sim.config.content.abilities[id];
      const e = def?.effect;
      this.#strikeRadius[slot - 1] =
        def !== undefined && e?.kind === 'strike'
          ? abilityStats(def, sim.config.modifiers).radiusTiles
          : 0;
      this.#segmentReach[slot - 1] = e?.kind === 'segment' ? e.reachTiles : 0;
    }
    this.#built = false;
    this.#teachShown = false;
    this.#told.clear();

    const content = sim.config.content;
    const fx = this.#fx;
    this.#offs.push(
      bus.on('TowerBuilt', (e) => {
        this.#built = true;
        const tower = content.towers[e.tower]!; // built from the loadout
        const [c, r] = e.tile;
        this.#towers.acquire(e.uid).show(e.uid, tower.sprites, 1, true, this.#liftPx(c, r));
        fx.ring(c + 0.5, r + 0.5, BUILD_PUFF_TILES, 'steel.4', BUILD_PUFF_MS, true);
        fx.floatText(`−${e.cost}`, 'gold.3', c + 0.5, r + 0.5, TOWER_FLOAT_LIFT_PX);
      }),
      bus.on('TowerUpgraded', (e) => {
        const v = this.#towers.get(e.uid);
        if (v === undefined) return;
        v.setTier(e.tier);
        v.flash();
        if (!Number.isNaN(v.x)) {
          fx.ring(v.x, v.y, UPGRADE_RING_TILES, 'teal.4', UPGRADE_RING_MS, true);
          fx.floatText(`−${e.cost}`, 'gold.3', v.x, v.y, TOWER_FLOAT_LIFT_PX);
        }
      }),
      bus.on('TowerSpecialized', (e) => {
        const v = this.#towers.get(e.uid);
        const t = this.#findTower(e.uid);
        if (v === undefined || t === null) return;
        v.setTier(t.tier, t.spec);
        v.flash();
        fx.ring(t.x, t.y, UPGRADE_RING_TILES, 'teal.4', UPGRADE_RING_MS, true);
        fx.ring(t.x, t.y, SPEC_RING_TILES, 'gold.3', SPEC_RING_MS, true);
        fx.floatText(`−${e.cost}`, 'gold.3', t.x, t.y, TOWER_FLOAT_LIFT_PX);
      }),
      bus.on('LinkFormed', (e) => {
        const a = this.#linkEnd(e.a);
        const b = this.#linkEnd(e.b);
        if (a === null || b === null) return;
        this.#links.form(e.link, a, b);
        // The moment gets its feedback (D059): a ring on both towers and the link's name, floated
        // between them ("CROSSFIRE!"); the chime is the audio's.
        const look = LINK_CALLOUT[e.link];
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
        this.#links.break(e.link, e.a, e.b);
      }),
      bus.on('TowerSold', (e) => {
        const v = this.#towers.get(e.uid);
        if (v !== undefined && !Number.isNaN(v.x)) {
          fx.floatText(`+${e.refund}`, 'gold.4', v.x, v.y, TOWER_FLOAT_LIFT_PX);
        }
        this.#towers.release(e.uid);
        if (interaction.selectedTower === e.uid) interaction.selectTower(0);
      }),
      bus.on('EnemySpawned', (e) => {
        const def = content.enemies[e.enemy]!; // spawned from the map's waves
        // A tell glyph shows over the first of each enemy type this battle, not every one (D028):
        // the body cue carries the rest.
        const glyph = this.#told.has(e.enemy) ? null : tellGlyph(def.tells);
        if (glyph !== null) this.#told.add(e.enemy);
        const route = Object.hasOwn(map.routes, e.route) ? (map.routes[e.route] ?? null) : null;
        this.#enemies
          .acquire(e.uid)
          .show(e.uid, def.sprites.body, def.layer === 'air', glyph, route);
      }),
      bus.on('EnemyDied', (e) => {
        this.#enemies.release(e.uid);
        fx.burst(e.x, e.y); // the Act I death pop
      }),
      bus.on('SackBurst', (e) => {
        // The young run back up the route toward the warren (D059); render-only.
        const route = Object.hasOwn(map.routes, e.route) ? (map.routes[e.route] ?? null) : null;
        this.#sacks.burst(e.x, e.y, route, e.dist, e.young);
      }),
      bus.on('EnemyLeaked', (e) => {
        const v = this.#enemies.get(e.uid);
        const core = this.#core.nearest(v?.x ?? Number.NaN, v?.y ?? Number.NaN);
        this.#enemies.release(e.uid);
        if (e.leak <= 0) return;
        this.#core.leak();
        fx.leakShake();
        if (core !== null) {
          fx.ring(core.x, core.y, LEAK_RING_TILES, 'red.3', LEAK_RING_MS, true);
          fx.floatText(`−${e.leak}`, 'red.3', core.x, core.y, CORE_FLOAT_LIFT_PX);
        }
      }),
      bus.on('ProjectileFired', (e) => {
        if (e.kind === 'hitscan') {
          this.#fx.tracer(e.x, e.y, e.targetX, e.targetY, this.#isFlyer(e.targetUid));
        } else if (e.kind === 'pulse') {
          if (e.radiusTiles > 0) this.#fx.pulse(e.x, e.y, e.radiusTiles);
        } else if (e.sprite !== null) {
          // The event carries the shot's look and reach, so a tower sold mid-flight still shows
          // its shell and splash.
          if (e.kind === 'lobbed') {
            this.#shells.set(e.uid, this.#bombletSprites.has(e.sprite) ? -1 : e.radiusTiles);
          }
          this.#projectiles
            .acquire(e.uid)
            .show(e.uid, { sprite: e.sprite, flightTicks: e.flightTicks });
        }
      }),
      bus.on('ProjectileHit', (e) => {
        this.#projectiles.release(e.uid);
        const splash = this.#shells.get(e.uid);
        if (splash === undefined) return;
        this.#shells.delete(e.uid);
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
        const radius = this.#strikeRadius[e.slot - 1] ?? 0;
        if (e.uid !== 0 && e.target !== null && radius > 0) {
          fx.strike(e.uid, e.target[0] + 0.5, e.target[1] + 0.5, radius);
        }
      }),
      bus.on('AllySpawned', (e) => {
        this.#allies.acquire(e.uid).show(e.uid, e.kind, e.x, e.y);
      }),
      bus.on('AllyAttacked', (e) => {
        const v = this.#allies.get(e.uid);
        const air = this.#isFlyer(e.targetUid);
        if (v === undefined || v.sprite === null) {
          fx.tracer(e.x, e.y, e.targetX, e.targetY, air);
          return;
        }
        v.fire(facingOf(e.targetX - e.x, e.targetY - e.y));
        v.muzzle(this.#muzzle);
        fx.tracerFrom(this.#muzzle.x, this.#muzzle.y, e.targetX, e.targetY, air);
      }),
      bus.on('AllyRemoved', (e) => {
        this.#allies.release(e.uid);
      }),
    );

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      // A real move hides the keyboard cursor (the mouse takes over the hover again).
      if (p.x !== this.#px || p.y !== this.#py) interaction.hideCursor();
      this.#px = p.x;
      this.#py = p.y;
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      interaction.hideCursor();
      this.#px = p.x;
      this.#py = p.y;
      this.#click(p.rightButtonDown() ? 'right' : 'left');
    });
    this.input.on(Phaser.Input.Events.GAME_OUT, () => {
      this.#px = Number.NaN;
      this.#py = Number.NaN;
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.#offs) off();
      this.#allies.releaseAll();
      this.#offs.length = 0;
      this.#fx.reset();
      this.#sacks.reset();
      this.#ping.reset();
      this.#links.reset();
      this.#shells.clear();
    });
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      this.#deps.onFirstFrame();
    });
    this.#syncViews();
  }

  override update(_time: number, delta: number): void {
    this.#deps.frame(delta);
    this.#syncViews();
    const state = this.#deps.sim.state;
    this.#fx.update(delta, state.zones);
    this.#sacks.update(delta);
    this.#links.update();
    this.#syncPing(delta);
    this.#core.update(state.integrity, state.towerAtTile);
    this.#syncTeach();
  }

  /**
   * The teach pulses, blinking at 1 Hz in phase with the HUD's (steady under reduced motion):
   * free pads until the first build (D026), then built towers while `deps.teachUpgrade()` (D028).
   */
  #syncTeach(): void {
    const tiles = !this.#built
      ? this.#freeTile
      : this.#deps.teachUpgrade()
        ? this.#towerTile
        : null;
    if (tiles === null) {
      if (this.#teachShown) this.#placement.showTeach(false, this.#noTile);
      this.#teachShown = false;
      return;
    }
    this.#teachShown = true;
    this.#placement.showTeach(prefersReducedMotion() || pulseOn(), tiles);
  }

  /** How far up a tower on tile (col, row) stands (px): one ELEV_H step on high ground. */
  #liftPx(col: number, row: number): number {
    return this.#elevationOf(col, row) * ELEV_H;
  }

  /** A linked tower's tile and lift, for its tether; null if it's gone. */
  #linkEnd(uid: number): LinkEnd | null {
    const t = this.#findTower(uid);
    return t === null ? null : { uid, col: t.col, row: t.row, liftPx: this.#liftPx(t.col, t.row) };
  }

  /** The tower slot on tile (col, row), or −1. */
  #towerSlotAt(col: number, row: number): number {
    const { sim } = this.#deps;
    return sim.state.towerAtTile[row * sim.map.cols + col] ?? -1;
  }

  /** Esc and right-click: drops the selection, disarms the build slot, and stops aiming. */
  cancel(): void {
    this.#deps.interaction.clear();
  }

  /** Whether the enemy `uid` flies (its slot keeps its def until reused, so a fresh kill counts). */
  #isFlyer(uid: number): boolean {
    const pool = this.#deps.sim.state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!; // i < used ≤ items.length
      if (e.uid === uid) return e.def?.layer === 'air';
    }
    return false;
  }

  /**
   * Pings the first-built tower still standing (the lowest uid) when the radio asks (D059): the
   * arrow over its turret head and a gold ring from its tile, pulsing again every
   * PING_RING_EVERY_MS while the line is up (D061).
   */
  #syncPing(delta: number): void {
    const id = this.#deps.pointFirstTower?.() ?? 0;
    if (id !== 0 && id !== this.#pinged) {
      this.#pinged = id;
      this.#pingTower = 0;
      let first: LiveTower | null = null;
      const pool = this.#deps.sim.state.towers;
      for (let i = 0; i < pool.used; i++) {
        const t = pool.items[i]!; // i < used ≤ items.length
        if (t.alive && (first === null || t.uid < first.uid)) first = t;
      }
      const view = first === null ? undefined : this.#towers.get(first.uid);
      if (first !== null && view !== undefined && view.artTop(pingAt)) {
        this.#pingTower = first.uid;
        this.#pingRingMs = 0;
        this.#ping.point(pingAt.x, pingAt.y);
        this.#fx.ring(first.x, first.y, PING_RING_TILES, 'gold.3', PING_RING_MS, true);
      }
    } else if (id !== 0 && this.#pingTower !== 0) {
      const t = this.#findTower(this.#pingTower);
      this.#pingRingMs += Number.isFinite(delta) && delta > 0 ? delta : 0;
      if (t === null) {
        this.#pingTower = 0;
        this.#ping.reset();
      } else if (this.#pingRingMs >= PING_RING_EVERY_MS) {
        this.#pingRingMs = 0;
        this.#fx.ring(t.x, t.y, PING_RING_TILES, 'gold.3', PING_RING_MS, true);
      }
    }
    this.#ping.update(delta, id !== 0 && id === this.#pinged && this.#pingTower !== 0);
  }

  /** The ping's arrow, for the smoke hooks: whether one shows. */
  get pinging(): boolean {
    return this.#ping.showing;
  }

  #findTower(uid: number): LiveTower | null {
    if (uid === 0) return null;
    const pool = this.#deps.sim.state.towers;
    for (let i = 0; i < pool.used; i++) {
      const t = pool.items[i]!; // i < used ≤ items.length
      if (t.alive && t.uid === uid) return t;
    }
    return null;
  }

  /**
   * Fills the tile scratch with the facts about the tile under the pointer, or under the keyboard
   * cursor while it shows (`keyboard`).
   */
  #pointerTile(keyboard = false): TileFacts {
    const { sim, interaction } = this.#deps;
    const map = sim.map;
    if (keyboard && interaction.cursor >= 0) {
      return fillTileFacts(sim, interaction.cursor, this.#tile);
    }
    // High ground's top face is drawn ELEV_H up, so a click there picks the raised tile.
    const index = Number.isNaN(this.#px)
      ? -1
      : pickTile(this.#px, this.#py, this.#origin, map.cols, map.rows, this.#elevationAt);
    return fillTileFacts(sim, index, this.#tile);
  }

  #click(button: 'left' | 'right'): void {
    const { interaction, sim } = this.#deps;
    const onPath = slotAimsAtPath(sim, interaction.aiming);
    const tile = this.#pointerTile();
    const intent = resolveClick(tile, button, interaction.armed, interaction.aiming, onPath);
    applyIntent(intent, interaction, this.#deps);
  }

  /** The armed tower's definition, if it's in this sim's content. */
  #armedDef(): CompiledTowerDef | null {
    const armed = this.#deps.interaction.armed;
    const towers = this.#deps.sim.config.content.towers;
    return armed !== null && Object.hasOwn(towers, armed) ? (towers[armed] ?? null) : null;
  }

  #canPlace(def: CompiledTowerDef, tile: TileFacts): boolean {
    const { sim } = this.#deps;
    const s = sim.state;
    return (
      tile.buildable &&
      tile.towerUid === 0 &&
      sim.config.loadout.includes(def.id) &&
      !s.lockedTowers.includes(def.id) &&
      s.credits >= costFor(sim.config.modifiers, def.id, def.tiers[0].cost)
    );
  }

  #syncViews(): void {
    const { sim, interaction } = this.#deps;
    const state = sim.state;
    const stamp = ++this.#stamp;
    const selected = interaction.selectedTower;
    let selectedTower: LiveTower | null = null;

    // Enemies first, so towers can aim at their fresh positions.
    const enemies = state.enemies;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used
      if (!e.alive || e.def === null) continue;
      let v = this.#enemies.get(e.uid);
      if (v === undefined) {
        v = this.#enemies.acquire(e.uid);
        v.show(e.uid, e.def.sprites.body, e.def.layer === 'air', null, e.route);
      }
      v.stamp = stamp;
      v.sync(e);
    }
    this.#enemies.sweep(stamp);

    const towers = state.towers;
    for (let i = 0; i < towers.used; i++) {
      const t = towers.items[i]!; // i < used
      if (!t.alive || t.def === null) continue;
      let v = this.#towers.get(t.uid);
      if (v === undefined) {
        v = this.#towers.acquire(t.uid);
        v.show(t.uid, t.def.sprites, t.tier, false, this.#liftPx(t.col, t.row), t.spec);
      }
      v.stamp = stamp;
      v.setTier(t.tier, t.spec);
      v.setSelected(t.uid === selected);
      if (t.uid === selected) selectedTower = t;
      const target = t.targetUid === 0 ? undefined : this.#enemies.get(t.targetUid);
      if (target !== undefined) v.setFacing(facingOf(target.x - t.x, target.y - t.y));
      v.sync(t);
    }
    this.#towers.sweep(stamp);

    const shots = state.projectiles;
    for (let i = 0; i < shots.used; i++) {
      const p = shots.items[i]!; // i < used
      if (!p.alive) continue;
      const v = this.#projectiles.get(p.uid);
      if (v === undefined) continue; // hitscan and unknown shots have no view
      v.stamp = stamp;
      v.sync(p);
    }
    this.#projectiles.sweep(stamp);

    // Allies face their current target; the first one with a sprite (Bricks) is where
    // Suppressing Fire's streaks come from.
    const allies = state.allies;
    let fireFrom: AllyView | null = null;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used
      if (!a.alive || a.kind === null) continue;
      let v = this.#allies.get(a.uid);
      if (v === undefined) {
        v = this.#allies.acquire(a.uid);
        v.show(a.uid, a.kind, a.x, a.y);
      }
      v.stamp = stamp;
      v.sync(a);
      const target = a.targetUid === 0 ? undefined : this.#enemies.get(a.targetUid);
      if (target !== undefined) v.setFacing(facingOf(target.x - a.x, target.y - a.y));
      if (fireFrom === null && v.sprite !== null) {
        fireFrom = v;
        this.#shooterX = a.x;
        this.#shooterY = a.y;
      }
    }
    this.#shooter = fireFrom;
    this.#allies.sweep(stamp);
    if (fireFrom === null) {
      this.#fx.setFireSource(Number.NaN, Number.NaN);
    } else {
      fireFrom.muzzle(this.#muzzle);
      this.#fx.setFireSource(this.#muzzle.x, this.#muzzle.y);
    }

    if (selected !== 0 && selectedTower === null) interaction.selectTower(0);
    this.#syncFeedback(selectedTower);
  }

  /**
   * The aimed ability's feedback on the hovered tile: a strike's reticle at its real radius, or
   * the stretch of path a segment would cover there (exactly the sim's `segmentSpan`, on every
   * ground route through the tile).
   */
  #syncAim(aim: boolean, tile: TileFacts, aiming: 1 | 2 | null): void {
    const slot = aiming === null ? -1 : aiming - 1;
    const radius = this.#strikeRadius[slot] ?? 0;
    const reach = this.#segmentReach[slot] ?? 0;
    this.#fx.setAim(aim && radius > 0 ? tile.col : -1, tile.row, radius);
    const at = aim && reach > 0 ? tile.index : -1;
    if (at === this.#previewAt) return;
    this.#previewAt = at;
    let n = 0;
    if (at >= 0) {
      for (const route of Object.values(this.#deps.sim.map.routes)) {
        if (!segmentSpan(route, tile.col, tile.row, reach, this.#span)) continue;
        for (let i = this.#span.lo; i <= this.#span.hi && n < MAX_PREVIEW_TILES; i++) {
          const t = route.tiles[i]!; // lo ≤ i ≤ hi < tiles.length
          this.#previewTiles[2 * n] = t[0];
          this.#previewTiles[2 * n + 1] = t[1];
          n++;
        }
      }
    }
    this.#fx.setSegmentAim(this.#previewTiles, n);
  }

  /**
   * The tile bonus a tower built on (col, row) would get, as the ghost's label (D059): "+25%
   * RANGE" on high ground, "+20% RATE" (or AURA, for a tower with no attack) on a power node.
   */
  #ghostLabel(armed: CompiledTowerDef, col: number, row: number): string | null {
    const map = this.#deps.sim.map;
    const t = map.tiles[row * map.cols + col];
    if (t !== '^' && t !== '+') return null;
    const rules = tileAndLinkRules(this.#deps.sim.config.modifiers);
    if (t === '^') return `${pct(rules.highGroundRangePct)} RANGE`;
    return armed.tiers[0].attack === null
      ? `${pct(rules.powerNodeAuraPct)} AURA`
      : `${pct(rules.powerNodeRatePct)} RATE`;
  }

  #syncFeedback(selectedTower: LiveTower | null): void {
    const placement = this.#placement;
    const tile = this.#pointerTile(true);
    this.#cursor.set(this.#deps.interaction.cursor, this.#deps.sim.map.cols);
    const armed = this.#armedDef();
    const aiming = this.#deps.interaction.aiming;
    const look = hoverLook(
      tile,
      armed === null ? null : armed.id,
      armed !== null && this.#canPlace(armed, tile),
      aiming,
      slotAimsAtPath(this.#deps.sim, aiming),
    );
    placement.setHover(tile.col, tile.row, look.highlight);
    this.#syncAim(look.aim, tile, aiming);
    placement.setSelectedTile(selectedTower?.col ?? -1, selectedTower?.row ?? -1);

    if (look.ghost && armed !== null) {
      placement.setGhost(
        tile.col,
        tile.row,
        armed.sprites.base,
        armed.sprites.head,
        this.#ghostLabel(armed, tile.col, tile.row),
      );
      const range = armed.tiers[0].attack?.rangeTiles ?? 0;
      placement.setRing(tile.col + 0.5, tile.row + 0.5, range, look.ghostValid);
      return;
    }
    placement.setGhost(0, 0, null, null);
    // A hovered tower's ring wins over the selected tower's, so hovering previews any tower.
    const ringTower = look.ringTowerUid !== 0 ? this.#findTower(look.ringTowerUid) : selectedTower;
    const range = ringTower?.tierDef?.attack?.rangeTiles ?? 0;
    placement.setRing(ringTower?.x ?? 0, ringTower?.y ?? 0, range, true);
  }
}
