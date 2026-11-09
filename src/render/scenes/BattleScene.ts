// The playfield (architecture.md § Rendering). Each frame: the host loop advances the sim and
// dispatches its events (views are created and released from them), then views are positioned
// from sim state, and the hover, selection, range ring, and placement ghost are redrawn. Pointer
// input becomes intents (input/intents.ts), and intents become commands through `deps.issue`.
// Event-driven effects (tracers, pulse rings, shell bursts, the Orbital Strike) are FxView's.
// The scene only reads sim state; every change goes through a command.
import * as Phaser from 'phaser';
import type { CompiledTowerDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import {
  isBuildableTile,
  type Command,
  type Sim,
  type SimEvent,
  type Tower,
} from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { BattleInteraction } from '../input/BattleInteraction.ts';
import { hoverLook, resolveClick, type TileFacts } from '../input/intents.ts';
import { gridToScreen, mapOrigin, pickTile, type IsoOrigin, type Vec2 } from '../iso.ts';
import { createLayers } from '../layers.ts';
import { VIEW_H, VIEW_W } from '../scale.ts';
import { SPRITE_SOURCE_KEY } from '../sprites/CodeSpriteSource.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';
import { EnemyView } from '../views/EnemyView.ts';
import { FxView } from '../views/FxView.ts';
import { drawGround } from '../views/GroundView.ts';
import { PlacementView } from '../views/PlacementView.ts';
import { ProjectileView } from '../views/ProjectileView.ts';
import { facingOf } from '../views/spriteInfo.ts';
import { TowerView } from '../views/TowerView.ts';
import type { ViewContext } from '../views/ViewContext.ts';
import { ViewPool } from '../views/ViewPool.ts';

export const BATTLE_SCENE_KEY = 'Battle';

/** Reduced motion turns off screen shake (art-direction §7). */
function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

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
}

type LiveTower = DeepReadonly<Tower>;

export class BattleScene extends Phaser.Scene {
  readonly #deps: BattleSceneDeps;
  #origin: IsoOrigin = { x: 0, y: 0 };
  #towers!: ViewPool<TowerView>;
  #enemies!: ViewPool<EnemyView>;
  #projectiles!: ViewPool<ProjectileView>;
  #placement!: PlacementView;
  #fx!: FxView;
  /** Uids of lobbed shells in flight: their impact draws a burst. */
  readonly #shells = new Set<number>();
  #stamp = 0;
  /** The pointer in game pixels, or NaN while it's off the canvas. */
  #px = Number.NaN;
  #py = Number.NaN;
  readonly #offs: (() => void)[] = [];
  /** Scratch for the tile under the pointer, reused every frame. */
  readonly #tile: { -readonly [K in keyof TileFacts]: TileFacts[K] } = {
    index: -1,
    col: -1,
    row: -1,
    buildable: false,
    towerUid: 0,
  };

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
    gridToScreen(col + 0.5, row + 0.5, this.#origin, out);
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

    drawGround(ctx, map, map.env);
    this.#towers = new ViewPool(() => new TowerView(ctx));
    this.#enemies = new ViewPool(() => new EnemyView(ctx));
    this.#projectiles = new ViewPool(() => new ProjectileView(ctx));
    this.#placement = new PlacementView(ctx);
    this.#fx = new FxView(ctx, prefersReducedMotion);

    const content = sim.config.content;
    this.#offs.push(
      bus.on('TowerBuilt', (e) => {
        this.#towers.acquire(e.uid).show(e.uid, content.towers[e.tower]!.sprites, 1); // built from the loadout
      }),
      bus.on('TowerUpgraded', (e) => this.#towers.get(e.uid)?.setTier(e.tier)),
      bus.on('TowerSold', (e) => {
        this.#towers.release(e.uid);
        if (interaction.selectedTower === e.uid) interaction.selectTower(0);
      }),
      bus.on('EnemySpawned', (e) => {
        const def = content.enemies[e.enemy]!; // spawned from the map's waves
        this.#enemies.acquire(e.uid).show(e.uid, def.sprites.body, def.layer === 'air');
      }),
      bus.on('EnemyDied', (e) => this.#enemies.release(e.uid)),
      bus.on('EnemyLeaked', (e) => this.#enemies.release(e.uid)),
      bus.on('ProjectileFired', (e) => {
        if (e.kind === 'hitscan') {
          this.#fx.tracer(e.x, e.y, e.targetX, e.targetY, this.#isFlyer(e.targetUid));
        } else if (e.kind === 'pulse') {
          const range = this.#findTower(e.towerUid)?.tierDef?.attack?.rangeTiles ?? 0;
          if (range > 0) this.#fx.pulse(e.x, e.y, range);
        } else {
          this.#showProjectile(e.uid, e.towerUid);
        }
      }),
      bus.on('ProjectileHit', (e) => {
        this.#projectiles.release(e.uid);
        if (this.#shells.delete(e.uid)) this.#fx.burst(e.x, e.y);
      }),
      bus.on('AbilityUsed', (e) => {
        if (e.uid !== 0 && e.target !== null) {
          this.#fx.strike(e.uid, e.target[0] + 0.5, e.target[1] + 0.5);
        }
      }),
    );

    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      this.#px = p.x;
      this.#py = p.y;
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
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
      this.#offs.length = 0;
      this.#fx.reset();
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
    this.#fx.update(delta, this.#deps.sim.state.zones);
  }

  /** Esc and right-click: drops the selection, disarms the build slot, and stops aiming. */
  cancel(): void {
    this.#deps.interaction.clear();
  }

  #showProjectile(uid: number, towerUid: number): void {
    const tower = this.#findTower(towerUid);
    const attack = tower?.tierDef?.attack;
    if (attack === undefined || attack === null) return;
    if (attack.kind === 'lobbed') {
      this.#shells.add(uid);
      this.#projectiles
        .acquire(uid)
        .show(uid, { sprite: attack.projectile, flightTicks: attack.flightTicks });
    } else if (attack.kind === 'projectile') {
      this.#projectiles.acquire(uid).show(uid, { sprite: attack.projectile, flightTicks: 0 });
    }
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

  #findTower(uid: number): LiveTower | null {
    if (uid === 0) return null;
    const pool = this.#deps.sim.state.towers;
    for (let i = 0; i < pool.used; i++) {
      const t = pool.items[i]!; // i < used ≤ items.length
      if (t.alive && t.uid === uid) return t;
    }
    return null;
  }

  /** Fills the tile scratch with the facts about the tile under the pointer. */
  #pointerTile(): TileFacts {
    const { sim } = this.#deps;
    const map = sim.map;
    const t = this.#tile;
    // Every tile is drawn flat for now (no high-ground art yet), so picking uses no elevation.
    const index = Number.isNaN(this.#px)
      ? -1
      : pickTile(this.#px, this.#py, this.#origin, map.cols, map.rows);
    t.index = index;
    if (index < 0) {
      t.col = -1;
      t.row = -1;
      t.buildable = false;
      t.towerUid = 0;
      return t;
    }
    t.col = index % map.cols;
    t.row = (index - t.col) / map.cols;
    t.buildable = isBuildableTile(map.tiles[index]!); // index < cols·rows
    const slot = sim.state.towerAtTile[index] ?? -1;
    t.towerUid = slot < 0 ? 0 : (sim.state.towers.items[slot]?.uid ?? 0);
    return t;
  }

  #click(button: 'left' | 'right'): void {
    const { interaction } = this.#deps;
    const intent = resolveClick(this.#pointerTile(), button, interaction.armed, interaction.aiming);
    switch (intent.kind) {
      case 'ability':
        // One shot per aim; the sim re-validates (cooldown, target) and the HUD shows rejections.
        this.#deps.issue({ type: 'ability', slot: intent.slot, target: intent.tile });
        interaction.aimAbility(null);
        return;
      case 'none':
        return;
      case 'selectTower':
        interaction.selectTower(intent.uid);
        return;
      case 'build':
        // The slot stays armed; app/hud.ts disarms it once another can't be afforded.
        this.#deps.issue({ type: 'build', tile: intent.tile, tower: intent.tower });
        return;
      case 'deselect':
        interaction.selectTower(0);
        return;
      case 'cancel':
        this.cancel();
        return;
    }
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
      s.credits >= def.tiers[0].cost
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
        v.show(e.uid, e.def.sprites.body, e.def.layer === 'air');
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
        v.show(t.uid, t.def.sprites, t.tier);
      }
      v.stamp = stamp;
      v.setTier(t.tier);
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

    if (selected !== 0 && selectedTower === null) interaction.selectTower(0);
    this.#syncFeedback(selectedTower);
  }

  #syncFeedback(selectedTower: LiveTower | null): void {
    const placement = this.#placement;
    const tile = this.#pointerTile();
    const armed = this.#armedDef();
    const look = hoverLook(
      tile,
      armed === null ? null : armed.id,
      armed !== null && this.#canPlace(armed, tile),
      this.#deps.interaction.aiming,
    );
    placement.setHover(tile.col, tile.row, look.highlight);
    this.#fx.setAim(look.aim ? tile.col : -1, tile.row);
    placement.setSelectedTile(selectedTower?.col ?? -1, selectedTower?.row ?? -1);

    if (look.ghost && armed !== null) {
      placement.setGhost(tile.col, tile.row, armed.sprites.base, armed.sprites.head);
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
