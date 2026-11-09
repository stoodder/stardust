// Pointer input → intents → commands (architecture.md § Rendering, Input). Pure: the scene gathers
// the facts about the tile under the pointer, and these functions decide what a click means and
// what the hover should show. Nothing is hover-only, so touch can come later (one tap = click).
import type { GridPos } from '../../content/types.ts';
import type { AbilitySlot } from './BattleInteraction.ts';

/** What the player has picked to build (the HUD's build slot, T106), or null. */
export type Armed = string | null;

/** Facts about the tile under the pointer. */
export interface TileFacts {
  /** Row-major index, or −1 off the map. */
  readonly index: number;
  readonly col: number;
  readonly row: number;
  /** Pad, high ground, or power node (sim `isBuildableTile`). */
  readonly buildable: boolean;
  /** The uid of the tower standing there, or 0. */
  readonly towerUid: number;
  /** On a ground route (paths and rift lanes, spawn and core tiles included): a segment's target. */
  readonly groundPath: boolean;
}

/** What a click does. The scene applies the selection and issues the command. */
export type Intent =
  | { readonly kind: 'selectTower'; readonly uid: number }
  | { readonly kind: 'build'; readonly tower: string; readonly tile: GridPos }
  /** Fire the aimed ability at a tile (any tile on the map; the sim re-validates it). */
  | { readonly kind: 'ability'; readonly slot: AbilitySlot; readonly tile: GridPos }
  /** Nothing (a click off the map while aiming keeps the aim). */
  | { readonly kind: 'none' }
  /** Drops the selection; an armed build slot stays armed. */
  | { readonly kind: 'deselect' }
  /** An armed click on a tile nothing can be built on: the HUD says so (D026); stays armed. */
  | { readonly kind: 'cantBuild' }
  /** An aimed path ability (a segment) clicked off the path: the HUD says so; it stays aimed. */
  | { readonly kind: 'cantTarget' }
  /** Right-click: drops the selection and disarms (like Esc). */
  | { readonly kind: 'cancel' };

/**
 * Decides a click: right-click cancels (and disarms, and stops aiming); while aiming an ability, a
 * click on any tile fires it there (towers included: the strike hits the ground around them), or,
 * for an ability that targets the path (`aimOnPath`: Suppressing Fire's segment), a click on a
 * ground-route tile fires it and a click on any other tile says it can't target there; a
 * tower selects it; an armed click on a free pad builds (the slot stays armed, so the next click
 * builds another), and an armed click on any other tile says it can't build there. Anything else
 * deselects.
 */
export function resolveClick(
  tile: TileFacts,
  button: 'left' | 'right',
  armed: Armed,
  aiming: AbilitySlot | null = null,
  aimOnPath = false,
): Intent {
  if (button === 'right') return { kind: 'cancel' };
  if (aiming !== null) {
    if (tile.index < 0) return { kind: 'none' };
    if (aimOnPath && !tile.groundPath) return { kind: 'cantTarget' };
    return { kind: 'ability', slot: aiming, tile: [tile.col, tile.row] };
  }
  if (tile.index < 0) return { kind: 'deselect' };
  if (tile.towerUid !== 0) return { kind: 'selectTower', uid: tile.towerUid };
  if (armed !== null) {
    return tile.buildable
      ? { kind: 'build', tower: armed, tile: [tile.col, tile.row] }
      : { kind: 'cantBuild' };
  }
  return { kind: 'deselect' };
}

/** What the hover shows: a highlight style (or none), and whether to draw the placement ghost. */
export interface HoverLook {
  readonly highlight: 'hover' | 'invalid' | null;
  /** Draw the armed tower's ghost and range ring here. */
  readonly ghost: boolean;
  /** The ghost's ring and highlight read as an invalid placement (red). */
  readonly ghostValid: boolean;
  /** The uid of a hovered tower whose range ring to show, or 0. */
  readonly ringTowerUid: number;
  /** Draw the aimed ability's reticle (or its segment preview) on this tile. */
  readonly aim: boolean;
}

type MutableHoverLook = { -readonly [K in keyof HoverLook]: HoverLook[K] };

/** hoverLook's result, reused every call (it runs every frame; D026: no per-frame allocation). */
const look: MutableHoverLook = {
  highlight: null,
  ghost: false,
  ghostValid: false,
  ringTowerUid: 0,
  aim: false,
};

/**
 * The hover feedback for a tile. `canPlace` is the armed tower's full placement check
 * (buildable, empty, unlocked, affordable); the sim re-validates the command either way. While
 * aiming an ability that targets the path (`aimOnPath`), a tile off the ground routes reads as
 * invalid and shows no preview. The result is a shared scratch object, valid until the next call:
 * read it, don't keep it.
 */
export function hoverLook(
  tile: TileFacts,
  armed: Armed,
  canPlace: boolean,
  aiming: AbilitySlot | null = null,
  aimOnPath = false,
): HoverLook {
  look.ghost = false;
  look.ghostValid = false;
  look.ringTowerUid = 0;
  look.aim = false;
  if (tile.index < 0) {
    look.highlight = null;
  } else if (aiming !== null) {
    const ok = !aimOnPath || tile.groundPath;
    look.highlight = ok ? 'hover' : 'invalid';
    look.aim = ok;
  } else if (tile.towerUid !== 0) {
    look.highlight = 'hover';
    look.ringTowerUid = tile.towerUid;
  } else if (armed !== null && tile.buildable) {
    look.highlight = canPlace ? 'hover' : 'invalid';
    look.ghost = true;
    look.ghostValid = canPlace;
  } else {
    look.highlight = armed === null ? 'hover' : 'invalid';
  }
  return look;
}
