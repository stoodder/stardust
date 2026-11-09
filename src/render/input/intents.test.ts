import { describe, expect, it } from 'vitest';
import { hoverLook, resolveClick, type TileFacts } from './intents.ts';

const pad: TileFacts = { index: 13, col: 1, row: 1, buildable: true, towerUid: 0 };
const path: TileFacts = { index: 2, col: 2, row: 0, buildable: false, towerUid: 0 };
const tower: TileFacts = { ...pad, towerUid: 7 };
const off: TileFacts = { index: -1, col: -1, row: 0, buildable: false, towerUid: 0 };

describe('resolveClick', () => {
  it('builds the armed tower on a free buildable tile', () => {
    expect(resolveClick(pad, 'left', 'rivet')).toEqual({
      kind: 'build',
      tower: 'rivet',
      tile: [1, 1],
    });
  });

  it('never builds on a path (hard rule) or with nothing armed', () => {
    expect(resolveClick(path, 'left', 'rivet')).toEqual({ kind: 'deselect' });
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
