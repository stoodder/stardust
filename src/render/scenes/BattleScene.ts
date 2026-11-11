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
// Escort refugees walk their road as RefugeeViews (T305c).
// Allies (Bricks at his post, T207b) are AllyView's: they face their targets and fire with a
// tracer. Aiming a strike shows its reticle at its real radius (`abilityStats`, so Orbital Strike
// Mk II's is wider); aiming Suppressing Fire tints the stretch of path it would cover (the sim's
// `segmentSpan`), and a live segment is FxView's strip of suppressive fire.
// Towers draw their tier's look (a specialized tower its spec's base and head, T202d) and stand on
// high ground's block, ELEV_H up; picking knows raised tiles, so a click on a block's top face
// lands on it. Linked towers show a tether (LinkView, from LinkFormed / LinkBroken). A Cluster
// Thumper's bomblets pop with their own small burst.
// The Peeker (T309) is PeekerView's: on a map with a `peeker` marker it peeks, ducks from enemies
// and the cursor, and ducks when poked (BattleInteraction's `onPoke`, a UI event). Where the map
// makes its rock a clickable world object (T409) it holds Pebble while the sim says it's clickable
// (`peekerHold`), and ClickableView outlines whatever is clickable now (`state.clickable`).
// M3 (T312a): air lanes show dotted while flyers are due or an armed tower hits air (AirLaneView);
// flak climbs and bursts at a flyer's height; Zapcoil's arcs are ChainFx's and Gerald's plinks
// PlinkFx's; Time Dilation's field tints the playfield (FieldTintView); wreckage follows the
// salvage drone's queue (WreckageView) and the drone flies it (DroneView).
// M3 (T312b): enemies pick their anim from what they're doing (EnemyView: a Digger's dig tell and
// mound, Chitterbloom's sneeze, dig, burrow, panic, shimmer, and flight); a dig-in or surfacing
// puffs a dirt ring; a boss shows its bar (BossBarView); a huddle links its leader and young
// (HuddleView); driven-off units run on past the edge as they fade (LeaveFx); props on cues land
// (CuePropView); and A1M4's Peeker hides in its planter.
// T328: an enemy under the pointer (the front-most body) is hovered, so its health bar shows at
// full HP too (EnemyView). T330: on A1M5's Quiet Wave Bricks lowers his cannon a beat after the
// wave starts and keeps it low (allyPose.ts); Suppressing Fire's streaks then come from off the map.
// M4 (T403): a hit on a shield ripples, and a shield pulse tells and rings (ShieldView).
// M4 (T404): a blink's tell shows a ghost where the unit will land, and leaves an afterimage
// (BlinkView).
// M5 (T503): a phaser's tell and Phased stretch show a broken teal ring under it (PhaseView).
// M6 (T602): a Maw's tendril tell and growth ring, a burrowed Undertow's ripple trail, and the rift
// cracks (closed, opening a wave ahead, open) (HollowView).
// M6 (T607): the Hum Choir's dashed gold song ring and a Lullaby's blue ring, a note over each
// Choir, and a blue note over each Lulled unit (ChoirView).
// M6 (T608): the Stasis Bloom's field as a faint ground disc under a dashed ring, brightening as it
// pulses (BloomView); the pulse's frost ring is PulseBurst's.
// M6 (T605): a blocker's health bar over Bricks at the Gap, and a bracket under each unit he holds
// (BlockerView).
// M5 (T502): an Aegis Cantor's continuous shield aura shows as a crawling dashed blue ring
// (ShieldAuraView).
// M6 (T603): an Expediter's haste aura shows as a solid orange ring beating like a metronome, the
// units it hastes trail speed lines, and Everglow units shut down with a falling price tag
// (EverglowView).
// M5 (T504): a beam tower's lit beams run from its crystal to their targets, wider and brighter as
// each ramps (BeamView).
// M5 (T507): an Unnerved unit wears a wobbling violet squiggle overhead, an Echo Spike hit rings
// out to its echo's radius, and Stillness leaves a pale blue disc where it froze (MindView).
// M5 (T508): a Marked unit wears a pink eye beside its head, Truthlight's filled gold-and-white
// while it can't evade (MarkView).
// M4 (T410a): a map's lighting schedule crossfades the sky and a multiply grade as its waves start
// (LightingView; cosmetic), and its dressing greys the grass (GroundView).
// The sim-event wiring is battleEvents.ts's, and the pointer and hover feedback (the ghost, aim
// previews, range rings) BattleHover's (T225). The scene only reads sim state; every change goes
// through a command.
import * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import {
  abilityStats,
  clearTicksFor,
  hasDarkness,
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
import { quietWaves, weaponsLowered } from '../views/allyPose.ts';
import { ChainFx } from '../views/ChainFx.ts';
import { SpecFx } from '../views/SpecFx.ts';
import { CoreView } from '../views/CoreView.ts';
import { BlinkView } from '../views/BlinkView.ts';
import { PhaseView } from '../views/PhaseView.ts';
import { HollowView } from '../views/HollowView.ts'; // T602
import { BlockerView } from '../views/BlockerView.ts'; // T605
import { ChoirView } from '../views/ChoirView.ts'; // T607
import { BloomView } from '../views/BloomView.ts'; // T608
import { SwarmView } from '../views/SwarmView.ts'; // T604
import { TrapView } from '../views/TrapView.ts'; // T604
import { RevokedView } from '../views/RevokedView.ts'; // T606
import { MindView } from '../views/MindView.ts';
import { MarkView } from '../views/MarkView.ts';
import { BossBarView } from '../views/BossBarView.ts';
import { AssetView } from '../views/AssetView.ts';
import { CuePropView } from '../views/CuePropView.ts';
import { CursorView } from '../views/CursorView.ts';
import { DroneView } from '../views/DroneView.ts';
import { TidybotView } from '../views/TidybotView.ts';
import { presentationOfMap } from '../../story/presentation.ts';
import { EnemyView } from '../views/EnemyView.ts';
import { FieldTintView } from '../views/FieldTintView.ts';
import { LightingView } from '../views/LightingView.ts';
import { DarknessView } from '../views/DarknessView.ts';
import { WorldGlowView } from '../views/WorldGlowView.ts';
import { SweepView } from '../views/SweepView.ts';
import { StillnessAimView } from '../views/StillnessAimView.ts';
import { LightGhostView } from '../views/LightGhostView.ts';
import { FxView } from '../views/FxView.ts';
import { HarpoonView } from '../views/HarpoonView.ts';
import { BeamView } from '../views/BeamView.ts';
import { HuddleView } from '../views/HuddleView.ts';
import { LeaveFx } from '../views/LeaveFx.ts';
import { drawGround } from '../views/GroundView.ts';
import { peekerCover, peekerShows } from '../views/groundTiles.ts';
import { LinkView } from '../views/LinkView.ts';
import { PING_RING_EVERY_MS } from '../vfx/pingPixels.ts';
import { PingView } from '../views/PingView.ts';
import { NameTagView } from '../views/NameTagView.ts';
import { SpawnFlagView } from '../views/SpawnFlagView.ts';
import { SackBurstView } from '../views/SackBurstView.ts';
import { ClickableView } from '../views/ClickableView.ts';
import { PeekerView } from '../views/PeekerView.ts';
import {
  LIFT_PUFF_MS,
  LIFT_PUFF_TILES,
  LIFT_RISE_PX,
  PEEKER_MARKER,
  peekerHold,
} from '../views/peekerMotion.ts';
import { KeepClear, type Box } from '../vfx/keepClear.ts';
import { PlinkFx } from '../views/PlinkFx.ts';
import { ShieldAuraView } from '../views/ShieldAuraView.ts';
import { EverglowView } from '../views/EverglowView.ts';
import { WardView } from '../views/WardView.ts';
import type { UnitAnchors } from '../views/unitAnchor.ts';
import { ShieldView } from '../views/ShieldView.ts';
import { shardDepthFloor } from '../views/shardLook.ts';
import { PlacementView } from '../views/PlacementView.ts';
import { ProjectileView } from '../views/ProjectileView.ts';
import { RefugeeViews } from '../views/RefugeeView.ts';
import { enemyBody, facingOf } from '../views/spriteInfo.ts';
import { TowerView } from '../views/TowerView.ts';
import type { ViewContext } from '../views/ViewContext.ts';
import type { AllyRenderState, EnemyRenderState, RenderState } from '../views/renderState.ts';
import { ViewPool } from '../views/ViewPool.ts';
import { barMaxHp } from '../vfx/healthBar.ts';
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
  /**
   * Bricks's name tag (T431): the tower carrying it and the name its plate reads, or null.
   * Optional: without it no plate is drawn.
   */
  nameTag?(): { readonly uid: number; readonly text: string } | null;
}

/** The Denise pointer's ring (D059), and the arrow's spot over the turret head (scratch). */
const PING_RING_TILES = 1;
const PING_RING_MS = 700;
const pingAt: Vec2 = { x: 0, y: 0 };
/** Scratch for a kept-clear spot's screen point (D134 K2). */
const clearAt: Vec2 = { x: 0, y: 0 };
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
  /** Escort refugees (T305c). */
  #refugees!: RefugeeViews;
  #placement!: PlacementView;
  #fx!: FxView;
  #core!: CoreView;
  #cursor!: CursorView;
  #links!: LinkView;
  #sacks!: SackBurstView;
  #ping!: PingView;
  /** Bricks's name-tag plate over the tagged turret (T431). */
  #nameTag!: NameTagView;
  /** The "incoming" flags on the next wave's spawns (T326). */
  #spawnFlags!: SpawnFlagView;
  #airLanes!: AirLaneView;
  #chains!: ChainFx;
  /** The Skyhook's and Zapcoil's spec looks: capacitor orbs, discharges, curtain puffs (T407b). */
  #specs!: SpecFx;
  #plinks!: PlinkFx;
  #fieldTint!: FieldTintView;
  #lighting!: LightingView;
  /** Sundown's darkness overlay, from the sim's `state.dark` and light sources (T505). */
  #darkness!: DarknessView;
  /** The world's glow: lamps, windows, vats, seams, pools of lamplight, the Prism's crystal (T530b). */
  #glow!: WorldGlowView;
  /** Scanner Sweep's circle while its reveal zone lives (T406). */
  #sweeps!: SweepView;
  /** Stillness's aim preview (T531). */
  #stillAim!: StillnessAimView;
  /** A resting Prism's ghost light disc, and the armed Prism's preview (review R9). */
  #lightGhosts!: LightGhostView;
  #wreckage!: WreckageView;
  #drone!: DroneView;
  /** The Tidybots and the stardust specks they sweep after each wave (T410b; the map's dial). */
  #tidybots!: TidybotView;
  #bossBar!: BossBarView;
  #huddles!: HuddleView;
  /** Aelari shields: the ripple, the pulse tell and ring (T403). */
  #shields!: ShieldView;
  /** The Aegis Cantor's shield aura ring (T502). */
  #auras!: ShieldAuraView;
  /** Everglow Security: the Expediter's haste ring and speed lines, the shutdown (T603). */
  #everglow!: EverglowView;
  /** The Ward (T506): a pivoted boss kneeling, its chill ring. */
  #wards!: WardView;
  /** Blinks: the tell's ghost at the landing, the afterimage (T404). */
  #blinks!: BlinkView;
  /** Phasing: the broken ring under a telling or Phased unit (T503). */
  #phases!: PhaseView;
  #hollow!: HollowView; // T602
  #blocker!: BlockerView; // T605: Bricks's bar at the Gap, the units he holds
  #choir!: ChoirView; // T607: the Hum Choir's song and Lullaby rings, its notes, Lulled notes
  #bloom!: BloomView; // T608: the Stasis Bloom's field disc and its pulse
  #swarm!: SwarmView; // T604: the Scuttle Den's swarmlings dashing and latched
  #traps!: TrapView; // T604: Underfoot's trap ring and its springs
  #revoked!: RevokedView; // T606: the LICENSE REVOKED stamp over a revoked class's towers
  /** Unnerved squiggles, Echo Spike rings, and Stillness's disc (T507). */
  #mind!: MindView;
  /** Marks and Truthlight's no-evade (T508). */
  #marks!: MarkView;
  #harpoon!: HarpoonView;
  /** The Prism's beams (T504). */
  #beams!: BeamView;
  #leaves!: LeaveFx;
  #cueProps!: CuePropView;
  /** A Protect map's asset on its marker, by damage band (T440c). */
  #asset!: AssetView;
  /** The salvage drone's time per tile under the run's modifiers (ticks). */
  #clearTicks = 0;
  /** The Peeker on the map's `peeker` marker, or null on a map without one. */
  #peeker: PeekerView | null = null;
  /** The clickable-object outlines (T409). */
  #clickables!: ClickableView;
  /** What floaters and the name plate keep clear of (D134 K2): armed clickables, Pebble's lift. */
  readonly #keepClear = new KeepClear();
  readonly #clearBox: Box = { left: 0, top: 0, right: 0, bottom: 0 };
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
  /** Each slot's Scanner Sweep radius: aiming it previews the sweep's own circle (T406, T431). */
  readonly #sweepRadius: [number, number] = [0, 0];
  /** Each slot's Stillness radius: aiming it previews its own circle (T531). */
  readonly #stillRadius: [number, number] = [0, 0];
  readonly #segmentReach: [number, number] = [0, 0];
  readonly #muzzle: Vec2 = { x: 0, y: 0 };
  /** The pointer's spot (game px; scratch), and the enemy hovered there (0: none). */
  readonly #pointerPx: Vec2 = { x: 0, y: 0 };
  #hoveredEnemy = 0;
  /** Per wave: whether it's a Quiet Wave (allies lower their weapons; allyPose.ts). */
  #quietWaves: readonly boolean[] = [];
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
    this.#enemies = new ViewPool(() => new EnemyView(ctx, this.#leaves, this.#keepClear));
    this.#projectiles = new ViewPool(() => new ProjectileView(ctx));
    this.#allies = new ViewPool(() => new AllyView(ctx));
    this.#refugees = new RefugeeViews(ctx);
    this.#placement = new PlacementView(ctx, this.#elevationOf);
    this.#links = new LinkView(ctx, prefersReducedMotion);
    this.#fx = new FxView(ctx, prefersReducedMotion);
    this.#fx.setKeepClear(this.#keepClear);
    this.#sacks = new SackBurstView(ctx);
    this.#chains = new ChainFx(ctx);
    this.#specs = new SpecFx(ctx, this.#fx, this.#chains, prefersReducedMotion, (c, r) =>
      this.#liftPx(c, r),
    );
    this.#plinks = new PlinkFx(ctx, this.#fx);
    this.#fieldTint = new FieldTintView(ctx, map.cols, map.rows, this.#fx, prefersReducedMotion);
    this.#lighting = new LightingView(ctx, map, prefersReducedMotion);
    this.#darkness = new DarknessView(ctx, this.#lighting, {
      lights: map.lights,
      dark: hasDarkness(map),
    });
    this.#glow = new WorldGlowView(
      ctx,
      this.#darkness,
      { lights: map.lights, lighting: map.lighting, dark: hasDarkness(map) },
      (c, r) => this.#liftPx(c, r),
    );
    this.#sweeps = new SweepView(ctx, this.#fx);
    this.#stillAim = new StillnessAimView(ctx);
    this.#lightGhosts = new LightGhostView(ctx, hasDarkness(map));
    // A salvaged tile is drawn after the dusk grade: the grade goes back over it (D135).
    this.#wreckage = new WreckageView(ctx, map, wreckProps, this.#fx, () =>
      this.#lighting.relight(),
    );
    this.#drone = new DroneView(ctx, map);
    this.#tidybots = new TidybotView(
      ctx,
      map.cols,
      map.rows,
      presentationOfMap(map).tidybots,
      map.markers,
    );
    this.#bossBar = new BossBarView(ctx, prefersReducedMotion);
    this.#huddles = new HuddleView(ctx, prefersReducedMotion, pulseOn);
    this.#shields = new ShieldView(ctx, this.#fx, prefersReducedMotion);
    // T530a: views that mark a unit find its body as EnemyView draws it (unitAnchor.ts).
    const anchors: UnitAnchors = { box: (uid, out) => this.#enemies.get(uid)?.box(out) ?? false };
    this.#auras = new ShieldAuraView(ctx, prefersReducedMotion, anchors);
    this.#everglow = new EverglowView(ctx, prefersReducedMotion, anchors);
    this.#wards = new WardView(
      ctx,
      (id) => this.#deps.sim.config.content.enemies[id]?.sprites.body ?? `enemy.${id}`,
      prefersReducedMotion,
    );
    this.#blinks = new BlinkView(ctx, this.#fx, prefersReducedMotion);
    this.#phases = new PhaseView(ctx, this.#fx, prefersReducedMotion, anchors);
    this.#hollow = new HollowView(ctx, map, prefersReducedMotion, pulseOn); // T602
    this.#blocker = new BlockerView(ctx, prefersReducedMotion); // T605
    this.#choir = new ChoirView(ctx, prefersReducedMotion, anchors); // T607
    this.#bloom = new BloomView(ctx); // T608
    this.#swarm = new SwarmView(ctx, anchors, prefersReducedMotion); // T604
    this.#traps = new TrapView(ctx, this.#fx, prefersReducedMotion); // T604
    this.#revoked = new RevokedView(ctx, prefersReducedMotion); // T606
    this.#mind = new MindView(ctx, this.#fx, prefersReducedMotion, anchors);
    this.#marks = new MarkView(ctx);
    this.#harpoon = new HarpoonView(ctx, prefersReducedMotion);
    this.#beams = new BeamView(ctx, prefersReducedMotion, (c, r) => this.#liftPx(c, r), anchors);
    this.#cueProps = new CuePropView(ctx, map, map.env, this.#fx);
    this.#asset = new AssetView(ctx, map);
    this.#clearTicks = clearTicksFor(sim.config.modifiers);
    this.#shooter = null;
    this.#ping = new PingView(ctx, prefersReducedMotion);
    this.#nameTag = new NameTagView(ctx);
    this.#nameTag.setKeepClear(this.#keepClear);
    this.#spawnFlags = new SpawnFlagView(ctx, map, prefersReducedMotion, pulseOn);
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
      peekerAt === undefined || !peekerShows(map.env)
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
    // Clickable world objects (T409): the outline hugs the Peeker holding Pebble on her marker.
    this.#clickables = new ClickableView(ctx, map, prefersReducedMotion);
    const peeker = this.#peeker;
    if (peeker !== null) this.#clickables.setObject(PEEKER_MARKER, () => peeker.outlineFrame());
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
      const area =
        def !== undefined &&
        (e?.kind === 'strike' || e?.kind === 'reveal' || e?.kind === 'stasisArea');
      const radius = area ? abilityStats(def, sim.config.modifiers).radiusTiles : 0;
      // Aiming previews an area at its real radius: a strike's reticle, Scanner Sweep's circle, or
      // Stillness's own (T531).
      this.#strikeRadius[slot - 1] = e?.kind === 'strike' ? radius : 0;
      this.#sweepRadius[slot - 1] = e?.kind === 'reveal' ? radius : 0;
      this.#stillRadius[slot - 1] = e?.kind === 'stasisArea' ? radius : 0;
      this.#segmentReach[slot - 1] = e?.kind === 'segment' ? e.reachTiles : 0;
    }
    this.#built = false;
    this.#teachShown = false;
    this.#hoveredEnemy = 0;
    this.#quietWaves = quietWaves(map.waves);
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
      sweepRadius: this.#sweepRadius,
      sweeps: this.#sweeps,
      stillRadius: this.#stillRadius,
      stills: this.#stillAim,
      lightGhosts: this.#lightGhosts,
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
      // T606: a revoked class's towers stay under their stamp, then fold away; a selected one drops.
      bus.on('TowerRevoked', (e) => {
        const v = this.#towers.get(e.uid);
        if (v !== undefined && !Number.isNaN(v.x)) {
          const lift = this.#liftPx(Math.floor(v.x), Math.floor(v.y));
          this.#revoked.stamp(e.uid, v.x, v.y, lift);
          // The refund, as a sell's (100% of what was paid).
          if (e.refund > 0) this.#fx.floatText(`+${e.refund}`, 'gold.4', v.x, v.y, 24);
        }
        if (interaction.selectedTower === e.uid) interaction.selectTower(0);
      }),
      this.#tidybots.bind(
        bus,
        (id) =>
          Object.hasOwn(sim.config.content.enemies, id) &&
          sim.config.content.enemies[id]?.faction === 'skitterkin',
        () => sim.state.tick,
        map.waves.length,
      ),
      this.#shields.bind(bus, () => sim.state.enemies),
      this.#blinks.bind(bus, () => sim.state.enemies),
      this.#phases.bind(bus),
      this.#mind.bind(bus),
      this.#everglow.bind(bus, sim.config.content.enemies, presentationOfMap(map).skitterkinDeath),
      this.#harpoon.bind(bus, (uid) => {
        const t = sim.state.towers.items.find((x) => x.alive && x.uid === uid);
        return t === undefined ? 0 : this.#liftPx(t.col, t.row);
      }),
      this.#specs.bind(
        bus,
        () => sim.state.towers,
        () => sim.state.enemies,
      ),
    );
    this.#hover.bindPointer(this, (button) => this.#click(button));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.#offs) off();
      this.#allies.releaseAll();
      this.#refugees.releaseAll();
      this.#offs.length = 0;
      this.#fx.reset();
      this.#sacks.reset();
      this.#ping.reset();
      this.#nameTag.reset();
      this.#spawnFlags.reset();
      this.#links.reset();
      this.#chains.reset();
      this.#specs.reset();
      this.#plinks.reset();
      this.#fieldTint.reset();
      this.#lighting.reset();
      this.#darkness.reset();
      this.#glow.reset();
      this.#sweeps.reset();
      this.#stillAim.reset();
      this.#lightGhosts.reset();
      this.#wreckage.reset();
      this.#tidybots.reset();
      this.#bossBar.reset();
      this.#huddles.reset();
      this.#shields.reset();
      this.#auras.reset();
      this.#everglow.reset();
      this.#wards.reset();
      this.#blinks.reset();
      this.#phases.reset();
      this.#hollow.reset(); // T602
      this.#blocker.reset(); // T605
      this.#choir.reset(); // T607
      this.#bloom.reset(); // T608
      this.#swarm.reset(); // T604
      this.#traps.reset(); // T604
      this.#revoked.reset(); // T606
      this.#mind.reset();
      this.#marks.reset();
      this.#harpoon.reset();
      this.#beams.reset();
      this.#leaves.reset();
      this.#hover.reset();
      this.#clickables.reset();
    });
    this.game.events.once(Phaser.Core.Events.POST_RENDER, () => {
      this.#deps.onFirstFrame();
    });
    this.#syncViews();
  }

  override update(_time: number, delta: number): void {
    // Before the frame's events spawn floaters.
    this.#syncKeepClear();
    this.#deps.frame(delta);
    this.#syncViews();
    const state = this.#deps.sim.state;
    this.#fx.update(delta, state.zones);
    const dt = Number.isFinite(delta) && delta > 0 ? delta : 0;
    this.#chains.update(dt);
    this.#specs.update(dt, state.towers);
    this.#plinks.update(dt);
    this.#fieldTint.update(state.zones);
    this.#sweeps.update(state.zones);
    this.#wreckage.update(state.wreckage, this.#clearTicks);
    // After the wreckage, so a tile salvaged this frame is under the grade and tinted at once.
    this.#lighting.update(state.wave, state.schedule.startTick, state.tick);
    this.#darkness.update(state.dark, state.towers);
    this.#glow.update(state.dark, state.towers);
    this.#lightGhosts.update(state.towers);
    this.#drone.update(state.wreckage, this.#clearTicks, state.tick);
    this.#tidybots.update(state.tick);
    this.#bossBar.update(dt, state.enemies);
    this.#huddles.update(state.enemies);
    this.#shields.update(dt, state.enemies);
    this.#auras.update(state.enemies, state.tick);
    this.#everglow.update(state.enemies, state.tick, dt);
    this.#wards.update(state.allies, state.enemies);
    this.#blinks.update(dt, state.enemies);
    this.#phases.update(state.enemies);
    this.#hollow.update(dt, state.wave, state.enemies, state.allies); // T602
    this.#blocker.update(dt, state); // T605
    this.#choir.update(state, state.tick); // T607
    this.#bloom.update(state); // T608
    this.#swarm.update(state.allies, state.enemies); // T604
    this.#traps.update(state.zones, state.trapSprung); // T604
    this.#revoked.update(dt); // T606
    this.#mind.update(dt, state.enemies);
    this.#marks.update(state.enemies);
    this.#harpoon.update(dt, state.enemies);
    this.#beams.update(dt, state.towers, state.enemies);
    this.#leaves.update(dt);
    this.#cueProps.update(dt, state.towerAtTile);
    this.#asset.update(state.asset, state.maxAsset, state.towerAtTile);
    this.#airLanes.update(state.wave, this.#armedHitsAir());
    this.#sacks.update(delta);
    this.#links.update();
    this.#syncNameTag();
    this.#spawnFlags.update(state);
    this.#syncPing(delta);
    this.#syncPeeker(delta);
    this.#clickables.update(dt, state.clickable);
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
    const scripted = Object.hasOwn(this.#deps.sim.map.clickables, PEEKER_MARKER);
    const hold = peekerHold(scripted, state.clickable);
    const was = p.hold;
    p.update(delta, played ? delta : 0, state.enemies, hovered, hold);
    // Pebble picked up (T430b): a little dust off the rock as she lifts away.
    if (was === 'holding' && hold === 'empty') {
      const at = this.#deps.sim.map.markers[PEEKER_MARKER];
      if (at !== undefined) {
        this.#fx.ring(at[0] + 0.5, at[1] + 0.5, LIFT_PUFF_TILES, 'steel.4', LIFT_PUFF_MS, true);
      }
    }
  }

  /** The boss bar's fill (px of 160), or −1 while no bar shows (the smoke flows' check). */
  get bossBarFill(): number {
    return this.#bossBar.showing ? this.#bossBar.fillPx : -1;
  }

  /** The drawn pose of the enemy `uid` (EnemyView's), or null without a view (smoke flows). */
  enemyPose(uid: number): string | null {
    return this.#enemies.get(uid)?.pose ?? null;
  }

  /**
   * What the playfield draws now, as data (T332, T430a; views/renderState.ts): the `__sd.render()`
   * hook's. Test-only, so it allocates freely.
   */
  /** Seekers in flight trailing their smoke (T407b). */
  #seekersShown(): number {
    let n = 0;
    for (const v of this.#projectiles.live.values()) if (v.trailing) n++;
    return n;
  }

  renderState(): RenderState {
    const enemies: EnemyRenderState[] = [];
    for (const [uid, v] of this.#enemies.live) {
      enemies.push({
        uid,
        pose: v.pose,
        alpha: v.alpha,
        bar: v.barShown,
        tell: v.tellShown,
        glyph: v.glyph,
        overClear: v.overClear,
        ...v.dress,
      });
    }
    const allies: AllyRenderState[] = [];
    for (const [uid, v] of this.#allies.live) {
      allies.push({ uid, sprite: v.sprite, lowered: v.lowered, glow: v.glowShown });
    }
    const sh = this.#shields;
    return {
      enemies,
      allies,
      refugees: this.#refugees.counts,
      shields: {
        ripples: sh.ripples,
        breaks: sh.breaks,
        sheds: sh.sheds,
        pulseRings: sh.pulseRings,
        tells: sh.tells,
        auras: this.#auras.rings,
        glints: this.#auras.glints,
      },
      wards: this.#wards.shown,
      wardAlpha: this.#wards.alpha,
      blinks: { tells: this.#blinks.tells, afterimages: this.#blinks.afterimages },
      everglow: {
        rings: this.#everglow.rings,
        lines: this.#everglow.lines,
        shutdowns: this.#everglow.shutdowns,
        shutdownsPlayed: this.#everglow.shutdownsPlayed,
      },
      phases: {
        ...this.#phases.shown,
        phasedIn: this.#phases.phasedIn,
        phasedOut: this.#phases.phasedOut,
      },
      hollow: { ...this.#hollow.shown, tellsSeen: this.#hollow.tellsSeen }, // T602
      swarm: { ...this.#swarm.shown, ...this.#traps.shown }, // T604
      blocker: {
        shown: this.#blocker.shown,
        holding: this.#blocker.holding,
        health: this.#blocker.health,
      }, // T605
      choir: {
        rings: this.#choir.rings,
        lullRings: this.#choir.lullRings,
        notes: this.#choir.notes,
        lulled: this.#choir.lulled,
      }, // T607
      bloom: { fields: this.#bloom.fields, flashing: this.#bloom.flashing }, // T608
      revoked: { shown: this.#revoked.shown, played: this.#revoked.played }, // T606
      mind: { unnerved: this.#mind.unnerved, echoes: this.#mind.echoes, stills: this.#mind.stills },
      marks: this.#marks.shown,
      harpoon: { pins: this.#harpoon.pins, skewered: this.#harpoon.skewered },
      beams: {
        drawn: this.#beams.beams,
        topStep: this.#beams.topStep,
        knots: this.#beams.knots,
        throws: this.#beams.throws,
      },
      debris: this.#fx.debrisLive,
      bossBar: this.bossBarFill,
      bossShield: this.#bossBar.shieldPx,
      bossEnd: this.#bossBar.endPx,
      tethers: this.tethers,
      nameTag:
        this.#nameTag.text === '' ? null : { uid: this.#nameTag.uid, text: this.#nameTag.text },
      spawnFlags: this.#spawnFlags.shown,
      keepClear: this.#keepClear.size,
      peekerRaised: this.#peeker?.raised === true,
      lighting: this.#lighting.look(),
      darkness: {
        dark: this.#darkness.dark,
        lights: this.#darkness.lights,
        ringDimmed: this.#placement.ringDimmed,
        world: this.#darkness.tones.world,
        veil: this.#darkness.tones.veil,
        ...this.#darkness.scenery(),
      },
      glow: {
        props: this.#glow.props,
        pools: this.#glow.pools,
        crystals: this.#glow.crystals,
        moons: this.#glow.moons,
        ghosts: this.#lightGhosts.resting,
        ghostPreview: this.#lightGhosts.previewing,
      },
      floats: this.#fx.floatsUp,
      sweepAim: this.#sweeps.aiming,
      stillAim: this.#stillAim.aiming,
      specs: {
        glows: this.#specs.glows,
        puffs: this.#specs.puffs,
        discharges: this.#specs.discharges,
        fizzles: this.#specs.fizzles,
        seekers: this.#seekersShown(),
      },
      tidybots: {
        flying: this.#tidybots.flying,
        specks: this.#tidybots.specks,
        sweeps: this.#tidybots.sweeps,
        unloads: this.#tidybots.unloads,
        drones: this.#tidybots.drones(),
      },
    };
  }

  /** How many clickable-object outlines show (T409; tests' view of them). */
  get clickablesShown(): number {
    return this.#clickables.shown;
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
        // The arrow lands over the name plate when this turret carries it (the tag line points).
        if (this.#nameTag.uid === first.uid) pingAt.y -= this.#nameTag.height;
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

  /**
   * The name-tag plate follows the turret the app says carries it (T431), hidden while it would
   * cover an armed clickable or a lift (D134 K2: NameTagView reads the keep-clear spots).
   */
  #syncNameTag(): void {
    const tag = this.#deps.nameTag?.() ?? null;
    this.#nameTag.sync(
      tag?.uid ?? 0,
      tag?.text ?? '',
      tag === null ? undefined : this.#towers.get(tag.uid),
    );
  }

  /**
   * What floaters and the name plate keep clear of now (D134 K2): every armed clickable's tile,
   * and the Peeker's rock while Pebble lifts off it.
   */
  #syncKeepClear(): void {
    const k = this.#keepClear;
    k.clear();
    const { sim } = this.#deps;
    const markers = sim.map.markers;
    const p = this.#peeker;
    for (const marker of sim.state.clickable) {
      const at = Object.hasOwn(markers, marker) ? markers[marker] : undefined;
      if (at === undefined) continue;
      gridToScreen(at[0] + 0.5, at[1] + 0.5, this.#origin, clearAt);
      k.add(
        at[0] + 0.5,
        at[1] + 0.5,
        clearAt,
        p !== null && marker === PEEKER_MARKER ? this.#peekerBox() : undefined,
      );
    }
    if (p !== null && p.lifting && !sim.state.clickable.includes(PEEKER_MARKER)) {
      const at = markers[PEEKER_MARKER];
      if (at !== undefined) {
        gridToScreen(at[0] + 0.5, at[1] + 0.5, this.#origin, clearAt);
        k.add(at[0] + 0.5, at[1] + 0.5, clearAt, this.#peekerBox());
      }
    }
  }

  /** The Peeker holding Pebble on screen, up to the top of her lift (the keep-clear box). */
  #peekerBox(): Box {
    const box = this.#clearBox;
    const p = this.#peeker;
    if (p === null) return box;
    const f = p.outlineFrame();
    const frame = this.textures.getFrame(f.texture, f.frame);
    box.left = f.left;
    box.top = f.top - LIFT_RISE_PX;
    box.right = f.left + (frame?.width ?? 0);
    box.bottom = f.top + (frame?.height ?? 0);
    return box;
  }

  /** How many "incoming" flags show (T326; the smoke hooks' view of them). */
  get spawnFlagsShown(): number {
    return this.#spawnFlags.shown;
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
    const pointed = this.#hover.pointerAt(this.#pointerPx);
    let hovered: EnemyView | undefined;
    let hoveredUid = 0;
    for (let i = 0; i < enemies.used; i++) {
      const e = enemies.items[i]!; // i < used
      if (!e.alive || e.def === null) continue;
      let v = this.#enemies.get(e.uid);
      if (v === undefined) {
        v = this.#enemies.acquire(e.uid);
        v.show(e.uid, enemyBody(e.def.sprites.body, e.tags), e.def.layer === 'air', null, e.route);
        v.setBar(barMaxHp(e.def), e.def.shield?.hp ?? 0);
      }
      v.stamp = stamp;
      // A boss's shard sorts over the boss that shed it (D139 S4; views/shardLook.ts).
      const owner = e.ownerUid === 0 ? undefined : this.#enemies.get(e.ownerUid);
      v.sync(e, state.tick, shardDepthFloor(owner?.depth ?? null, e.uid));
      const under = v.burrowed;
      v.syncPose(e);
      if (under !== v.burrowed)
        this.#fx.ring(e.x, e.y, DIRT_RING_TILES, 'grime.3', DIRT_RING_MS, true);
      // The front-most body under the pointer is hovered (its health bar shows).
      if (pointed && v.contains(this.#pointerPx.x, this.#pointerPx.y)) {
        if (hovered === undefined || v.depth > hovered.depth) {
          hovered = v;
          hoveredUid = e.uid;
        }
      }
    }
    this.#enemies.sweep(stamp);
    if (hoveredUid !== this.#hoveredEnemy) {
      this.#enemies.get(this.#hoveredEnemy)?.setHovered(false);
      hovered?.setHovered(true);
      this.#hoveredEnemy = hoveredUid;
    }

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
    this.#revoked.hold(this.#towers, stamp); // T606: powered down under the stamp for 1 s
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
    // Suppressing Fire's streaks come from. On a Quiet Wave they lower their weapons a beat after
    // it starts (allyPose.ts, T330); a lowered Bricks stays lowered, so the streaks come from off
    // the map then, as on a map without him.
    const allies = state.allies;
    const lowered = weaponsLowered(
      this.#quietWaves,
      state.wave,
      state.tick,
      state.schedule.startTick,
    );
    let fireFrom: AllyView | null = null;
    for (let i = 0; i < allies.used; i++) {
      const a = allies.items[i]!; // i < used
      if (!a.alive || a.kind === null || a.group >= 0) continue; // refugees: RefugeeViews (T305c)
      if (a.mode === 'owner') continue; // swarmlings: SwarmView (T604)
      let v = this.#allies.get(a.uid);
      if (v === undefined) {
        v = this.#allies.acquire(a.uid);
        v.show(a.uid, a.kind, a.x, a.y);
      }
      v.stamp = stamp;
      v.sync(a);
      v.setLowered(lowered);
      const target = a.targetUid === 0 ? undefined : this.#enemies.get(a.targetUid);
      if (target !== undefined) v.setFacing(facingOf(target.x - a.x, target.y - a.y));
      if (fireFrom === null && v.sprite !== null && !v.lowered) {
        fireFrom = v;
        this.#shooterX = a.x;
        this.#shooterY = a.y;
      }
    }
    this.#shooter = fireFrom;
    this.#allies.sweep(stamp);
    this.#refugees.sync(allies, stamp);
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
