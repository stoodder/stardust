// M8 R4: a gate's loss number steps aside from a lettered memorial beside it (gateFloat.ts).
import { describe, expect, it } from 'vitest';
import { map as FIN } from '../../content/maps/fin_m01/map.ts';
import { gridToScreen } from '../iso.ts';
import { GATE_FLOAT_SHIFT_TILES, gateFloatAt } from './gateFloat.ts';

const ORIGIN = { x: 0, y: 0 };
const at = { x: 0, y: 0 };
const screenX = (x: number, y: number): number => {
  gridToScreen(x, y, ORIGIN, at);
  return at.x;
};
const screenY = (x: number, y: number): number => {
  gridToScreen(x, y, ORIGIN, at);
  return at.y;
};

describe('a gate’s loss number', () => {
  it('rises from the core’s heart with no memorial beside it', () => {
    const out = gateFloatAt({ x: 4.5, y: 4.5 }, { held_door: [12, 12] }, { x: 0, y: 0 });
    expect(out).toEqual({ x: 4.5, y: 4.5 });
  });

  it('steps east, level, from a memorial standing west of the gate', () => {
    // A memorial up-left of the gate on screen (FIN's HE HELD THE DOOR beside the colony gate).
    const core = { x: 6.5, y: 13.5 };
    const out = gateFloatAt(core, { held_door: [5, 12] }, { x: 0, y: 0 });
    expect(screenX(out.x, out.y)).toBeGreaterThan(screenX(core.x, core.y));
    expect(screenY(out.x, out.y)).toBe(screenY(core.x, core.y));
    expect(out.x - core.x).toBe(GATE_FLOAT_SHIFT_TILES);
  });

  it('steps west from a memorial standing east of the gate', () => {
    const core = { x: 6.5, y: 13.5 };
    const out = gateFloatAt(core, { memorial_wreck: [8, 12] }, { x: 0, y: 0 });
    expect(screenX(out.x, out.y)).toBeLessThan(screenX(core.x, core.y));
  });

  it('steps clear of FIN’s HE HELD THE DOOR on its own map', () => {
    // The colony gate (8,13) and the stone propped by it (map.ts `held_door`).
    const core = { x: 8.5, y: 13.5 };
    const out = gateFloatAt(core, FIN.markers ?? {}, { x: 0, y: 0 });
    expect(screenX(out.x, out.y)).toBeGreaterThan(screenX(core.x, core.y));
  });
});
