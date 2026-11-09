// The playfield's pointer and hover feedback (T225 split from BattleScene.ts): where the pointer is
// (or the keyboard tile cursor, while it shows), and what hovering there shows: the tile
// highlight, the placement ghost with its tile-bonus label and range ring, the aimed ability's
// reticle or segment preview, and the selected or hovered tower's range ring. The decisions are
// input/intents.ts's (`hoverLook`); this draws them. Allocation-free per frame: the ghost label's
// words are built once per battle (input/ghostLabel.ts, T234), and the tile facts and preview
// tiles are scratch.
import * as Phaser from 'phaser';
import type { CompiledTowerDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import {
  costFor,
  detectRadiusTiles,
  liveTileAt,
  salvageFor,
  segmentSpan,
  type SegmentSpan,
  type Sim,
} from '../../sim/index.ts';
import type { BattleInteraction } from '../input/BattleInteraction.ts';
import { ghostLabel, ghostLabels, salvageLabel, type GhostLabels } from '../input/ghostLabel.ts';
import { hoverLook, type TileFacts } from '../input/intents.ts';
import { emptyTileFacts, fillTileFacts, slotAimsAtPath } from '../input/tileFacts.ts';
import { pickTile, type IsoOrigin, type Vec2 } from '../iso.ts';
import type { CursorView } from '../views/CursorView.ts';
import type { FxView } from '../views/FxView.ts';
import type { PlacementView } from '../views/PlacementView.ts';
import { findLiveTower, type LiveTower } from './battleEvents.ts';

/** Most route tiles a segment preview can tint (FxView draws up to 12). */
const MAX_PREVIEW_TILES = 12;

/** What the hover feedback reads and draws on. */
export interface BattleHoverDeps {
  readonly sim: Sim<IdSpace>;
  readonly interaction: BattleInteraction;
  readonly placement: PlacementView;
  readonly fx: FxView;
  readonly cursor: CursorView;
  readonly origin: IsoOrigin;
  /** A tile's elevation level by row-major index (1 for high ground), for picking. */
  readonly elevationAt: (index: number) => number;
  /** Each ability slot's strike radius after modifiers (Mk II), and segment reach (tiles; 0: none). */
  readonly strikeRadius: readonly number[];
  readonly segmentReach: readonly number[];
}

export class BattleHover {
  readonly #deps: BattleHoverDeps;
  readonly #labels: GhostLabels;
  /** The pointer in game pixels, or NaN while it's off the canvas. */
  readonly #pointer: Vec2 = { x: Number.NaN, y: Number.NaN };
  /** Scratch for the tile under the pointer (or the keyboard cursor), reused every frame. */
  readonly #tile = emptyTileFacts();
  /** Scratch for the segment preview: the span on one route, and the tiles (col, row pairs). */
  readonly #span: SegmentSpan = { lo: 0, hi: 0, distFrom: 0, distTo: 0 };
  readonly #previewTiles: number[] = Array.from({ length: 2 * MAX_PREVIEW_TILES }, () => 0);
  /** The tile the segment preview was last drawn for, so it's recomputed only on a move. */
  #previewAt = -2;
  /** Each wreckage tile's "SEND DRONE +n" label (by tile index), built once per battle. */
  readonly #salvageLabels = new Map<number, string>();
  /** The canvas cursor as last set (the pointer hand over a wreck to clear). */
  #handCursor = false;
  #scene: Phaser.Scene | null = null;

  constructor(deps: BattleHoverDeps) {
    this.#deps = deps;
    this.#labels = ghostLabels(deps.sim.config.modifiers);
    const map = deps.sim.map;
    map.tiles.forEach((t, index) => {
      if (t !== 'x') return;
      const col = index % map.cols;
      const key = `${col},${(index - col) / map.cols}` as const;
      const pays = salvageFor(deps.sim.config.modifiers, map.salvage[key] ?? 0);
      this.#salvageLabels.set(index, salvageLabel(pays));
    });
  }

  /**
   * Tracks the pointer on `scene` and calls `click` on a press. A real move or a click hides the
   * keyboard tile cursor (the mouse takes over the hover again).
   */
  bindPointer(scene: Phaser.Scene, click: (button: 'left' | 'right') => void): void {
    const { interaction } = this.#deps;
    const pointer = this.#pointer;
    this.#scene = scene;
    scene.input.mouse?.disableContextMenu();
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      if (p.x !== pointer.x || p.y !== pointer.y) interaction.hideCursor();
      pointer.x = p.x;
      pointer.y = p.y;
    });
    scene.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      interaction.hideCursor();
      pointer.x = p.x;
      pointer.y = p.y;
      click(p.rightButtonDown() ? 'right' : 'left');
    });
    scene.input.on(Phaser.Input.Events.GAME_OUT, () => {
      pointer.x = Number.NaN;
      pointer.y = Number.NaN;
    });
  }

  /**
   * Writes the pointer's spot (game px) into `out` and returns true, or false while it's off the
   * canvas or the keyboard tile cursor shows (the hover follows the cursor's tile then).
   */
  pointerAt(out: Vec2): boolean {
    const { x, y } = this.#pointer;
    if (Number.isNaN(x) || this.#deps.interaction.cursor >= 0) return false;
    out.x = x;
    out.y = y;
    return true;
  }

  /**
   * Fills the tile scratch with the facts about the tile under the pointer, or under the keyboard
   * cursor while it shows (`keyboard`).
   */
  pointerTile(keyboard = false): TileFacts {
    const { sim, interaction, origin } = this.#deps;
    const map = sim.map;
    if (keyboard && interaction.cursor >= 0) {
      return fillTileFacts(sim, interaction.cursor, this.#tile);
    }
    // High ground's top face is drawn ELEV_H up, so a click there picks the raised tile.
    const { x, y } = this.#pointer;
    const index = Number.isNaN(x)
      ? -1
      : pickTile(x, y, origin, map.cols, map.rows, this.#deps.elevationAt);
    return fillTileFacts(sim, index, this.#tile);
  }

  /** Redraws the hover feedback for this frame; `selectedTower` is the selection, if standing. */
  sync(selectedTower: LiveTower | null): void {
    const { sim, interaction, placement, cursor } = this.#deps;
    const tile = this.pointerTile(true);
    cursor.set(interaction.cursor, sim.map.cols);
    const armed = this.#armedDef();
    const aiming = interaction.aiming;
    const look = hoverLook(
      tile,
      armed === null ? null : armed.id,
      armed !== null && this.#canPlace(armed, tile),
      aiming,
      slotAimsAtPath(sim, aiming),
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
      // A tower without an attack (the Lookout) shows its detection radius instead (T406).
      const t1 = armed.tiers[0];
      const range = t1.attack?.rangeTiles ?? t1.detect?.radiusTiles ?? 0;
      placement.setRing(tile.col + 0.5, tile.row + 0.5, range, look.ghostValid);
      this.#setHand(false);
      return;
    }
    placement.setGhost(0, 0, null, null);
    placement.setSalvageLabel(
      tile.col,
      tile.row,
      look.salvage ? (this.#salvageLabels.get(tile.index) ?? null) : null,
    );
    this.#setHand(look.salvage && interaction.cursor < 0);
    // A hovered tower's ring wins over the selected tower's, so hovering previews any tower.
    const ringTower =
      look.ringTowerUid !== 0 ? findLiveTower(sim.state.towers, look.ringTowerUid) : selectedTower;
    const attack = ringTower?.tierDef?.attack ?? null;
    const range =
      ringTower === null
        ? 0
        : (attack?.rangeTiles ?? detectRadiusTiles(ringTower, sim.config.modifiers));
    placement.setRing(ringTower?.x ?? 0, ringTower?.y ?? 0, range, true);
  }

  /** Puts the default cursor back (the scene is shutting down). */
  reset(): void {
    this.#setHand(false);
  }

  /** The pointer hand over a clickable wreck (art-direction: clickable world objects), else the default. */
  #setHand(on: boolean): void {
    if (on === this.#handCursor || this.#scene === null) return;
    this.#handCursor = on;
    this.#scene.input.setDefaultCursor(on ? 'pointer' : '');
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

  /** The ghost's tile-bonus label for `armed` on (col, row), or null. */
  #ghostLabel(armed: CompiledTowerDef, col: number, row: number): string | null {
    const { sim } = this.#deps;
    // A cleared wreck shows what it uncovered (a hidden power node's bonus; D076).
    const tile = liveTileAt(sim.map, sim.state.wreckage, row * sim.map.cols + col);
    return ghostLabel(this.#labels, tile, armed.tiers[0].attack !== null);
  }

  /**
   * The aimed ability's feedback on the hovered tile: a strike's reticle at its real radius, or
   * the stretch of path a segment would cover there (exactly the sim's `segmentSpan`, on every
   * ground route through the tile).
   */
  #syncAim(aim: boolean, tile: TileFacts, aiming: 1 | 2 | null): void {
    const { fx, strikeRadius, segmentReach } = this.#deps;
    const slot = aiming === null ? -1 : aiming - 1;
    const radius = strikeRadius[slot] ?? 0;
    const reach = segmentReach[slot] ?? 0;
    fx.setAim(aim && radius > 0 ? tile.col : -1, tile.row, radius);
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
    fx.setSegmentAim(this.#previewTiles, n);
  }
}
