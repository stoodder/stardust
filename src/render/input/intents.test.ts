import { describe, expect, it } from 'vitest';
import { hoverLook, resolveClick, type TileFacts } from './intents.ts';

const pad: TileFacts = {
  index: 13,
  col: 1,
  row: 1,
  buildable: true,
  towerUid: 0,
  groundPath: false,
};
const path: TileFacts = {
  index: 2,
  col: 2,
  row: 0,
  buildable: false,
  towerUid: 0,
  groundPath: true,
};
const tower: TileFacts = { ...pad, towerUid: 7 };
const off: TileFacts = {
  index: -1,
  col: -1,
  row: 0,
  buildable: false,
  towerUid: 0,
  groundPath: false,
};

describe('resolveClick', () => {
  it('builds the armed tower on a free buildable tile', () => {
    expect(resolveClick(pad, 'left', 'rivet')).toEqual({
      kind: 'build',
      tower: 'rivet',
      tile: [1, 1],
    });
  });

  it('never builds on a path (hard rule) or with nothing armed', () => {
    // Armed on a path: "Can't build there" (D026), and the slot stays armed.
    expect(resolveClick(path, 'left', 'rivet')).toEqual({ kind: 'cantBuild' });
    expect(resolveClick(pad, 'left', null)).toEqual({ kind: 'deselect' });
  });

  it('selects a tower instead of building on it', () => {
    expect(resolveClick(tower, 'left', 'rivet')).toEqual({ kind: 'selectTower', uid: 7 });
  });

  it('cancels (and disarms) on right-click; deselects off the map', () => {
    expect(resolveClick(pad, 'right', 'rivet')).toEqual({ kind: 'cancel' });
    expect(resolveClick(off, 'right', null)).toEqual({ kind: 'cancel' });
    expect(resolveClick(off, 'left', 'rivet')).toEqual({ kind: 'deselect' });
  });
});

describe('hoverLook', () => {
  it('reuses one result object (no per-frame allocation)', () => {
    expect(hoverLook(pad, null, false)).toBe(hoverLook(path, 'rivet', false));
  });

  it('shows a valid ghost on a placeable pad and an invalid one on an unaffordable pad', () => {
    expect(hoverLook(pad, 'rivet', true)).toMatchObject({
      highlight: 'hover',
      ghost: true,
      ghostValid: true,
    });
    expect(hoverLook(pad, 'rivet', false)).toMatchObject({
      highlight: 'invalid',
      ghost: true,
      ghostValid: false,
    });
  });

  it('marks unbuildable tiles invalid while armed, and plain hover otherwise', () => {
    expect(hoverLook(path, 'rivet', false)).toMatchObject({ highlight: 'invalid', ghost: false });
    expect(hoverLook(path, null, false)).toMatchObject({ highlight: 'hover', ghost: false });
  });

  it("shows a hovered tower's range ring", () => {
    expect(hoverLook(tower, 'rivet', false)).toMatchObject({ ringTowerUid: 7, ghost: false });
  });

  it('shows nothing off the map', () => {
    expect(hoverLook(off, 'rivet', true)).toMatchObject({ highlight: null, ghost: false });
  });
});

describe('aiming an ability', () => {
  it('fires at any tile on the map, keeps aiming off it, and cancels on right-click', () => {
    for (const t of [pad, path, tower]) {
      expect(resolveClick(t, 'left', null, 1)).toEqual({
        kind: 'ability',
        slot: 1,
        tile: [t.col, t.row],
      });
    }
    expect(resolveClick(off, 'left', null, 1)).toEqual({ kind: 'none' });
    expect(resolveClick(pad, 'right', null, 1)).toEqual({ kind: 'cancel' });
  });

  it('shows the reticle on every tile, with no ghost or ring', () => {
    expect(hoverLook(tower, null, false, 1)).toEqual({
      highlight: 'hover',
      ghost: false,
      ghostValid: false,
      ringTowerUid: 0,
      aim: true,
    });
    expect(hoverLook(path, null, false, 1)).toMatchObject({ aim: true });
    expect(hoverLook(off, null, false, 1)).toMatchObject({ aim: false, highlight: null });
    expect(hoverLook(pad, 'rivet', true)).toMatchObject({ aim: false });
  });

  it('fires a path ability (a segment) only on the path; elsewhere it says so and stays aimed', () => {
    expect(resolveClick(path, 'left', null, 2, true)).toEqual({
      kind: 'ability',
      slot: 2,
      tile: [2, 0],
    });
    expect(resolveClick(pad, 'left', null, 2, true)).toEqual({ kind: 'cantTarget' });
    expect(resolveClick(tower, 'left', null, 2, true)).toEqual({ kind: 'cantTarget' });
    expect(resolveClick(off, 'left', null, 2, true)).toEqual({ kind: 'none' });
    expect(hoverLook(path, null, false, 2, true)).toMatchObject({ highlight: 'hover', aim: true });
    expect(hoverLook(pad, null, false, 2, true)).toMatchObject({
      highlight: 'invalid',
      aim: false,
    });
  });

  it('pokes the Act I Peeker on a plain click only (T309: a UI event, never a command)', () => {
    const peeker: TileFacts = { ...pad, index: 17, col: 3, row: 1, buildable: false, peeker: true };
    expect(resolveClick(peeker, 'left', null)).toEqual({ kind: 'poke' });
    // Armed or aimed, the click means what it means anywhere else; right-click still cancels.
    expect(resolveClick(peeker, 'left', 'rivet')).toEqual({ kind: 'cantBuild' });
    expect(resolveClick(peeker, 'left', null, 1)).toEqual({
      kind: 'ability',
      slot: 1,
      tile: [3, 1],
    });
    expect(resolveClick(peeker, 'right', null)).toEqual({ kind: 'cancel' });
    expect(resolveClick({ ...peeker, peeker: false }, 'left', null)).toEqual({ kind: 'deselect' });
  });
});
