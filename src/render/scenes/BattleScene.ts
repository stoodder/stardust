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
// The Peeker (T309) is PeekerView's: on a map with a `peeker` marker it peeks, ducks from enemies
// and the cursor, and ducks when poked (BattleInteraction's `onPoke`, a UI event).
// M3 (T312a): air lanes show dotted while flyers are due or an armed tower hits air (AirLaneView);
// flak climbs and bursts at a flyer's height; Zapcoil's arcs are ChainFx's and Gerald's plinks
// PlinkFx's; Time Dilation's field tints the playfield (FieldTintView); wreckage follows the
// salvage drone's queue (WreckageView) and the drone flies it (DroneView).
// M3 (T312b): enemies pick their anim from what they're doing (EnemyView: a Digger's dig tell and
// mound, Chitterbloom's sneeze, dig, burrow, panic, shimmer, and flight); a dig-in or surfacing
// puffs a dirt ring; a boss shows its bar (BossBarView); a huddle links its leader and young
// (HuddleView); driven-off units run on past the edge as they fade (LeaveFx); props on cues land
// (CuePropView); and A1M4's Peeker hides in its planter.
// The sim-event wiring is battleEvents.ts's, and the pointer and hover feedback (the ghost, aim
// previews, range rings) BattleHover's (T225). The scene only reads sim state; every change goes
// through a command.
import * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import {
  abilityStats,
  clearTicksFor,
  isBuildableTile,
  liveTileAt,
  tileElevation,
  type Command,
  type Sim,
  type SimEvent,
} from '../../sim/index.ts';
import { BattleInteraction } from '../input/BattleInteraction.ts';
import { applyIntent } from '../input/apply.ts';
import { resolveClick } from '../input/intents.ts';
import { slotAimsAtPath } from '../input/tileFacts.ts';
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
import { AirLaneView } from '../views/AirLaneView.ts';
import { AllyView } from '../views/AllyView.ts';
import { ChainFx } from '../views/ChainFx.ts';
import { CoreView } from '../views/CoreView.ts';
import { BossBarView } from '../views/BossBarView.ts';
import { CuePropView } from '../views/CuePropView.ts';
import { CursorView } from '../views/CursorView.ts';
import { DroneView } from '../views/DroneView.ts';
import { EnemyView } from '../views/EnemyView.ts';
import { FieldTintView } from '../views/FieldTintView.ts';
import { FxView } from '../views/FxView.ts';
import { HuddleView } from '../views/HuddleView.ts';
import { LeaveFx } from '../views/LeaveFx.ts';
import { drawGround } from '../views/GroundView.ts';
import { peekerCover } from '../views/groundTiles.ts';
import { LinkView } from '../views/LinkView.ts';
import { PING_RING_EVERY_MS } from '../vfx/pingPixels.ts';
import { PingView } from '../views/PingView.ts';
import { SackBurstView } from '../views/SackBurstView.ts';
import { PeekerView } from '../views/PeekerView.ts';
import { PlinkFx } from '../views/PlinkFx.ts';
import { PlacementView } from '../views/PlacementView.ts';
import { ProjectileView } from '../views/ProjectileView.ts';
import { enemyBody, facingOf } from '../views/spriteInfo.ts';
import { TowerView } from '../views/TowerView.ts';
import type { ViewContext } from '../views/ViewContext.ts';
import { ViewPool } from '../views/ViewPool.ts';
import { WreckageView } from '../views/WreckageView.ts';
import { bindBattleEvents, findLiveTower, type LiveTower } from './battleEvents.ts';
import { BattleHover } from './BattleHover.ts';

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

/** The Denise pointer's ring (D059), and the arrow's spot over the turret head (scratch). */
const PING_RING_TILES = 1;
const PING_RING_MS = 700;
const pingAt: Vec2 = { x: 0, y: 0 };
/** A dig-in or a surfacing kicks up a ring of dirt (T312b). */
const DIRT_RING_TILES = 0.5;
const DIRT_RING_MS = 300;

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
  #airLanes!: AirLaneView;
  #chains!: ChainFx;
  #plinks!: PlinkFx;
  #fieldTint!: FieldTintView;
  #wreckage!: WreckageView;
  #drone!: DroneView;
  #bossBar!: BossBarView;
  #huddles!: HuddleView;
  #leaves!: LeaveFx;
  #cueProps!: CuePropView;
  /** The salvage drone's time per tile under the run's modifiers (ticks). */
  #clearTicks = 0;
  /** The Peeker on the map's `peeker` marker, or null on a map without one. */
  #peeker: PeekerView | null = null;
  /** The sim tick at the last frame: play time only passes while it moves. */
  #lastTick = 0;
  /** The radio pointer id last pinged (0: none). */
  #pinged = 0;
  /** The tower that pointer pinged (0: none), and ms since its ring last pulsed. */
  #pingTower = 0;
  #pingRingMs = 0;
  /**
   * A tile's elevation level by row-major index (1 for high ground), for picking and towers' lift.
   * It reads the live tile, so a wreck cleared to high ground is raised from then on (D076).
   */
  readonly #elevationAt = (index: number): number => {
    const { map, state } = this.#deps.sim;
    if (index < 0 || index >= map.tiles.length) return 0;
    return tileElevation(liveTileAt(map, state.wreckage, index));
  };
  /** A tile's elevation level by column and row. */
  readonly #elevationOf = (col: number, row: number): number =>
    this.#elevationAt(row * this.#deps.sim.map.cols + col);
  /** Whether a tower has been built this battle (the onboarding pulse stops). */
  #built = false;
  /** Whether any teach pulse is showing (so a hidden pulse isn't re-hidden every frame). */
  #teachShown = false;
  /** Teach-pulse tile tests, bound once (not a closure per frame). */
  readonly #freeTile = (col: number, row: number): boolean => this.#towerSlotAt(col, row) < 0;
  readonly #towerTile = (col: number, row: number): boolean => this.#towerSlotAt(col, row) >= 0;
  readonly #noTile = (): boolean => false;
  #stamp = 0;
  /** The pointer and hover feedback (placement ghost, aim previews, range rings). */
  #hover!: BattleHover;
  readonly #offs: (() => void)[] = [];
  /** Each ability slot's strike radius after modifiers (Mk II), and segment reach (tiles; 0: none). */
  readonly #strikeRadius: [number, number] = [0, 0];
  readonly #segmentReach: [number, number] = [0, 0];
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

    const wreckProps = new Map<number, Phaser.GameObjects.Sprite>();
    const coreProps = drawGround(ctx, map, map.env, wreckProps);
    this.#airLanes = new AirLaneView(ctx, map, prefersReducedMotion);
    this.#towers = new ViewPool(() => new TowerView(ctx));
    this.#leaves = new LeaveFx(ctx);
    this.#enemies = new ViewPool(() => new EnemyView(ctx, this.#leaves));
    this.#projectiles = new ViewPool(() => new ProjectileView(ctx));
    this.#allies = new ViewPool(() => new AllyView(ctx));
    this.#placement = new PlacementView(ctx, this.#elevationOf);
    this.#links = new LinkView(ctx, prefersReducedMotion);
    this.#fx = new FxView(ctx, prefersReducedMotion);
    this.#sacks = new SackBurstView(ctx);
    this.#chains = new ChainFx(ctx);
    this.#plinks = new PlinkFx(ctx, this.#fx);
    this.#fieldTint = new FieldTintView(ctx, map.cols, map.rows, this.#fx, prefersReducedMotion);
    this.#wreckage = new WreckageView(ctx, map, wreckProps, this.#fx);
    this.#drone = new DroneView(ctx, map);
    this.#bossBar = new BossBarView(ctx, prefersReducedMotion);
    this.#huddles = new HuddleView(ctx, prefersReducedMotion, pulseOn);
    this.#cueProps = new CuePropView(ctx, map, map.env, this.#fx);
    this.#clearTicks = clearTicksFor(sim.config.modifiers);
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
    const peekerAt = map.markers['peeker'];
    this.#peeker =
      peekerAt === undefined
        ? null
        : new PeekerView(
            ctx,
            peekerAt[0],
            peekerAt[1],
            map.cols,
            map.env,
            sim.config.seed,
            peekerCover(map.id),
          );
    this.#lastTick = sim.state.tick;
    const teach: [number, number][] = [];
    map.tiles.forEach((t, i) => {
      if (isBuildableTile(t)) teach.push([i % map.cols, Math.floor(i / map.cols)]);
    });
    this.#placement.setTeachTiles(teach);
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
    this.#hover = new BattleHover({
      sim,
      interaction,
      placement: this.#placement,
      fx: this.#fx,
      cursor: this.#cursor,
      origin: this.#origin,
      elevationAt: this.#elevationAt,
      strikeRadius: this.#strikeRadius,
      segmentReach: this.#segmentReach,
    });

    this.#offs.push(
      bindBattleEvents({
        sim,
        bus,
        interaction,
        towers: this.#towers,
        enemies: this.#enemies,
        projectiles: this.#projectiles,
        allies: this.#allies,
        fx: this.#fx,
        links: this.#links,
        sacks: this.#sacks,
        core: this.#core,
        chains: this.#chains,
        plinks: this.#plinks,
        bossBar: this.#bossBar,
        cueProps: this.#cueProps,
        strikeRadius: this.#strikeRadius,
        liftPx: (col, row) => this.#liftPx(col, row),
        onBuilt: () => {
          this.#built = true;
        },
      }),
      interaction.onPoke(() => this.#peeker?.poke()),
    );
    this.#hover.bindPointer(this, (button) => this.#click(button));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.#offs) off();
      this.#allies.releaseAll();
      this.#offs.length = 0;
      this.#fx.reset();
      this.#sacks.reset();
      this.#ping.reset();
      this.#links.reset();
      this.#chains.reset();
      this.#plinks.reset();
      this.#fieldTint.reset();
      this.#wreckage.reset();
      this.#bossBar.reset();
      this.#huddles.reset();
      this.#leaves.reset();
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
    const dt = Number.isFinite(delta) && delta > 0 ? delta : 0;
    this.#chains.update(dt);
    this.#plinks.update(dt);
    this.#fieldTint.update(state.zones);
    this.#wreckage.update(state.wreckage, this.#clearTicks);
    this.#drone.update(state.wreckage, this.#clearTicks, state.tick);
    this.#bossBar.update(dt, state.enemies);
    this.#huddles.update(state.enemies);
    this.#leaves.update(dt);
    this.#cueProps.update(dt, state.towerAtTile);
    this.#airLanes.update(state.wave, this.#armedHitsAir());
    this.#sacks.update(delta);
    this.#links.update();
    this.#syncPing(delta);
    this.#syncPeeker(delta);
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

  /**
   * The Peeker's frame: play time passes only while the sim ticks, and it's shy of enemies and of
   * the pointer or keyboard cursor on its rock.
   */
  #syncPeeker(delta: number): void {
    const p = this.#peeker;
    if (p === null) return;
    const state = this.#deps.sim.state;
    const played = state.tick !== this.#lastTick;
    this.#lastTick = state.tick;
    const hovered = this.#hover.pointerTile(true).index === p.tile;
    p.update(delta, played ? delta : 0, state.enemies, hovered);
  }

  /** The boss bar's fill (px of 160), or −1 while no bar shows (the smoke flows' check). */
  get bossBarFill(): number {
    return this.#bossBar.showing ? this.#bossBar.fillPx : -1;
  }

  /** The drawn pose of the enemy `uid` (EnemyView's), or null without a view (smoke flows). */
  enemyPose(uid: number): string | null {
    return this.#enemies.get(uid)?.pose ?? null;
  }

  /** The Peeker's pose (the smoke hooks' view of it), or null on a map without one. */
  get peekerPose(): 'hidden' | 'peek' | 'duck' | null {
    return this.#peeker?.pose ?? null;
  }

  /** Whether the armed tower's first tier hits air (the air lanes show while it's armed). */
  #armedHitsAir(): boolean {
    const armed = this.#deps.interaction.armed;
    const towers = this.#deps.sim.config.content.towers;
    if (armed === null || !Object.hasOwn(towers, armed)) return false;
    return towers[armed]?.tiers[0].targets.air ?? false;
  }

  /** How far up a tower on tile (col, row) stands (px): one ELEV_H step on high ground. */
  #liftPx(col: number, row: number): number {
    return this.#elevationOf(col, row) * ELEV_H;
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
    return findLiveTower(this.#deps.sim.state.towers, uid);
  }

  #click(button: 'left' | 'right'): void {
    const { interaction, sim } = this.#deps;
    const onPath = slotAimsAtPath(sim, interaction.aiming);
    const tile = this.#hover.pointerTile();
    const intent = resolveClick(tile, button, interaction.armed, interaction.aiming, onPath);
    applyIntent(intent, interaction, this.#deps);
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
        v.show(e.uid, enemyBody(e.def.sprites.body, e.tags), e.def.layer === 'air', null, e.route);
      }
      v.stamp = stamp;
      v.sync(e);
      const under = v.burrowed;
      v.syncPose(e);
      if (under !== v.burrowed)
        this.#fx.ring(e.x, e.y, DIRT_RING_TILES, 'grime.3', DIRT_RING_MS, true);
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
    this.#hover.sync(selectedTower);
  }
}
