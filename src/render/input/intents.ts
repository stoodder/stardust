// Pointer input → intents → commands (architecture.md § Rendering, Input). Pure: the scene gathers
// the facts about the tile under the pointer, and these functions decide what a click means and
// what the hover should show. Nothing is hover-only, so touch can come later (one tap = click).
import type { GridPos } from '../../content/types.ts';

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
}

/** What a click does. The scene applies the selection and issues the command. */
export type Intent =
  | { readonly kind: 'selectTower'; readonly uid: number }
  | { readonly kind: 'build'; readonly tower: string; readonly tile: GridPos }
  /** Drops the selection; an armed build slot stays armed. */
  | { readonly kind: 'deselect' }
  /** Right-click: drops the selection and disarms (like Esc). */
  | { readonly kind: 'cancel' };

/**
 * Decides a click: right-click cancels (and disarms); a tower selects it; an armed click on a free
 * pad builds (the slot stays armed, so the next click builds another). Anything else deselects.
 */
export function resolveClick(tile: TileFacts, button: 'left' | 'right', armed: Armed): Intent {
  if (button === 'right') return { kind: 'cancel' };
  if (tile.index < 0) return { kind: 'deselect' };
  if (tile.towerUid !== 0) return { kind: 'selectTower', uid: tile.towerUid };
  if (armed !== null && tile.buildable) {
    return { kind: 'build', tower: armed, tile: [tile.col, tile.row] };
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
}

/**
 * The hover feedback for a tile. `canPlace` is the armed tower's full placement check
 * (buildable, empty, unlocked, affordable); the sim re-validates the command either way.
 */
export function hoverLook(tile: TileFacts, armed: Armed, canPlace: boolean): HoverLook {
  if (tile.index < 0) return { highlight: null, ghost: false, ghostValid: false, ringTowerUid: 0 };
  if (tile.towerUid !== 0) {
    return { highlight: 'hover', ghost: false, ghostValid: false, ringTowerUid: tile.towerUid };
  }
  if (armed !== null && tile.buildable) {
    return {
      highlight: canPlace ? 'hover' : 'invalid',
      ghost: true,
      ghostValid: canPlace,
      ringTowerUid: 0,
    };
  }
  return {
    highlight: armed === null ? 'hover' : 'invalid',
    ghost: false,
    ghostValid: false,
    ringTowerUid: 0,
  };
}
