// T1003's three prelude stills (shots 4–7): the descent, the touchdown and Dome Row. Their sizes
// and full coverage, every colour named by their legends (no stamp or painter falls back), the
// battle sprites stamped 1:1, each frame's beat (and nothing else) changing between frames, the
// descent's walkers going one way, and the dark the line panel sits on. Plus the builders they
// share: the stamp's frame resolution and outline, and sceneKit's tall stills.
import { describe, expect, it } from 'vitest';
import { contrastRatio, luminance } from '../../../palettes/color.ts';
import { PALETTES } from '../../../palettes/index.ts';
import { rgbOf, type ColorName } from '../../../palettes/master.ts';
import { enemyGerald } from '../../enemies/gerald.ts';
import { enemyNibbler } from '../../enemies/nibbler.ts';
import { isCustomChar, STANDARD_LEGEND } from '../../legend.ts';
import { propBillboard } from '../../props/billboard.ts';
import { propPeeker } from '../../props/peeker.ts';
import type { SpriteDef } from '../../types.ts';
import { defineScene, SCENE_H, SCENE_W, sceneGrid } from '../sceneKit.ts';
import { DESCENT_H, DESCENT_INK, DESCENT_PAN, sceneDescent, walkerPoints } from './descent.ts';
import {
  BRICKS_AT,
  BRICKS_STILL,
  BRICKS_WAVE,
  bricksArmPixels,
  DOME_ROW_INK,
  GERALD_AT,
  sceneDomeRow,
  TECHNICIAN_AT,
} from './domeRow.ts';
import { sceneDescent as indexDescent, sceneDomeRow as indexDomeRow } from './index.ts';
import { sceneTouchdown as indexTouchdown } from './index.ts';
import { colorOfChar, framePixels, frameRows, sceneInk } from './stamp.ts';
import {
  BILLBOARD_AT,
  LINE_PANEL_TOP,
  NIBBLER_AT,
  PEEKER_AT,
  sceneTouchdown,
  SIGN,
  TOUCHDOWN_INK,
} from './touchdown.ts';

function rowsOf(def: SpriteDef, frame: string): readonly string[] {
  const f = def.frames[frame];
  if (!Array.isArray(f)) throw new Error(`${def.id} ${frame}: not a grid frame`);
  return f as readonly string[];
}

function colorAt(def: SpriteDef, frame: string, x: number, y: number): ColorName | null {
  const ch = rowsOf(def, frame)[y]?.[x] ?? '.';
  if (ch === '.') return null;
  if (isCustomChar(ch)) return def.legend?.[ch] ?? null;
  const slot = STANDARD_LEGEND[ch];
  return slot === undefined ? null : PALETTES[def.palette][slot];
}

function meanLum(def: SpriteDef, frame: string, x0: number, y0: number, x1: number, y1: number) {
  let sum = 0;
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = colorAt(def, frame, x, y);
      if (c === null) continue;
      sum += luminance(rgbOf(c));
      n++;
    }
  }
  return sum / n;
}

/** How many pixels of a frame in a box are one of `colors`. */
function count(
  def: SpriteDef,
  frame: string,
  colors: readonly ColorName[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): number {
  let n = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const c = colorAt(def, frame, x, y);
      if (c !== null && colors.includes(c)) n++;
    }
  }
  return n;
}

/** The bounding box of the pixels two frames differ at, or null if they're the same. */
function diffBox(def: SpriteDef, a: string, b: string): [number, number, number, number] | null {
  const ra = rowsOf(def, a);
  const rb = rowsOf(def, b);
  let box: [number, number, number, number] | null = null;
  for (let y = 0; y < ra.length; y++) {
    for (let x = 0; x < SCENE_W; x++) {
      if (ra[y]?.[x] === rb[y]?.[x]) continue;
      box =
        box === null
          ? [x, y, x, y]
          : [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)];
    }
  }
  return box;
}

/** Every pixel of a stamped frame is on the still in its own colour. */
function expectStamped(
  scene: SpriteDef,
  frame: string,
  def: SpriteDef,
  spriteFrame: string,
  ax: number,
  ay: number,
): void {
  const px = framePixels(def, spriteFrame, ax, ay);
  expect(px.length).toBeGreaterThan(20);
  for (const p of px) {
    expect(colorAt(scene, frame, p.x, p.y), `${def.id} at ${p.x},${p.y}`).toBe(p.color);
  }
}

const MINE = [sceneDescent, sceneTouchdown, sceneDomeRow] as const;

describe("T1003's prelude stills", () => {
  it('are the ones the index registers', () => {
    expect(indexDescent).toBe(sceneDescent);
    expect(indexTouchdown).toBe(sceneTouchdown);
    expect(indexDomeRow).toBe(sceneDomeRow);
  });

  it('are 320 wide, 180 tall (the descent 300, panned 120), and opaque edge to edge', () => {
    expect(sceneDescent.size).toEqual({ w: SCENE_W, h: DESCENT_H });
    expect(sceneDescent.anchor).toEqual({ x: SCENE_W / 2, y: DESCENT_H });
    expect(DESCENT_H - DESCENT_PAN).toBe(SCENE_H);
    expect(sceneTouchdown.size).toEqual({ w: SCENE_W, h: SCENE_H });
    expect(sceneDomeRow.size).toEqual({ w: SCENE_W, h: SCENE_H });
    for (const def of MINE) {
      for (const name of Object.keys(def.frames)) {
        const g = rowsOf(def, name);
        expect(g.length, `${def.id} ${name}`).toBe(def.size.h);
        expect(g.join('').includes('.'), `${def.id} ${name} has a hole`).toBe(false);
      }
    }
  });

  it('carry their cue frames', () => {
    expect(Object.keys(sceneDescent.frames)).toEqual(['still']);
    expect(Object.keys(sceneTouchdown.frames)).toEqual(['one', 'zero']);
    expect(Object.keys(sceneDomeRow.frames)).toEqual(['still', 'wave', 'gerald']);
  });

  it('name every colour they paint and stamp (no fallback to a nearest colour)', () => {
    for (const def of MINE) expect(Object.keys(def.frames).length).toBeGreaterThan(0);
    expect(DESCENT_INK.missed()).toEqual([]);
    expect(TOUCHDOWN_INK.missed()).toEqual([]);
    expect(DOME_ROW_INK.missed()).toEqual([]);
  });

  it("never draw the Hollow's acid", () => {
    for (const def of MINE) {
      for (const color of Object.values(def.legend ?? {}))
        expect(color.startsWith('acid')).toBe(false);
    }
  });
});

describe('scene.touchdown', () => {
  it('stamps Evie beaming and the Peeker 1:1 in both frames', () => {
    for (const f of ['one', 'zero']) {
      expectStamped(sceneTouchdown, f, propBillboard, 'beaming', BILLBOARD_AT.x, BILLBOARD_AT.y);
      expectStamped(sceneTouchdown, f, propPeeker, 'peek_0', PEEKER_AT.x, PEEKER_AT.y);
    }
  });

  it('on `zero`, flips the counter and sends a Nibbler across, and changes nothing else', () => {
    expectStamped(sceneTouchdown, 'zero', enemyNibbler, 'walk_se_1', NIBBLER_AT.x, NIBBLER_AT.y);
    const box = diffBox(sceneTouchdown, 'one', 'zero');
    expect(box).not.toBeNull();
    const [x0, y0, x1, y1] = box ?? [0, 0, 0, 0];
    // From the dust's tail behind the Nibbler to the sign's right edge; the sky stays untouched.
    expect(x0).toBeGreaterThan(NIBBLER_AT.x - 45);
    expect(x1).toBeLessThan(SIGN.x + SIGN.w);
    expect(y0).toBeGreaterThan(SIGN.y);
    expect(y1).toBeLessThan(NIBBLER_AT.y + 3);
    // The punchline is seen: the Nibbler and its dust stay above the line panel.
    expect(y1).toBeLessThan(LINE_PANEL_TOP);
    // The 0 is lit orange; the 1 is white.
    const sign = [SIGN.x, SIGN.y, SIGN.x + SIGN.w - 1, SIGN.y + SIGN.h - 1] as const;
    expect(count(sceneTouchdown, 'one', ['orange.3'], ...sign)).toBe(0);
    expect(count(sceneTouchdown, 'zero', ['orange.3'], ...sign)).toBeGreaterThan(20);
  });

  it('keeps its bottom band dark for the line panel', () => {
    const panel = meanLum(sceneTouchdown, 'one', 52, 150, 268, SCENE_H - 1);
    const sky = meanLum(sceneTouchdown, 'one', 0, 0, SCENE_W - 1, 40);
    expect(panel).toBeLessThan(sky / 3);
  });
});

describe('scene.dome_row', () => {
  it('draws Bricks as a 14–16 px silhouette, raising his hand on `wave` and nothing else', () => {
    for (const shape of [BRICKS_STILL, BRICKS_WAVE]) {
      expect(shape.length).toBeGreaterThanOrEqual(14);
      expect(shape.length).toBeLessThanOrEqual(16);
    }
    // On the wave a hand stands in the top row, left of his head (two rows above it).
    expect(BRICKS_WAVE[0]?.indexOf('H')).toBe(0);
    expect(BRICKS_STILL[0]?.indexOf('B')).toBe(-1);
    expect(BRICKS_WAVE[2]?.indexOf('B')).toBeGreaterThan(2);
    const [x0, y0, x1, y1] = diffBox(sceneDomeRow, 'still', 'wave') ?? [0, 0, 0, 0];
    expect(x0).toBeGreaterThanOrEqual(BRICKS_AT.x - 8);
    expect(x1).toBeLessThanOrEqual(BRICKS_AT.x + 8);
    expect(y0).toBeGreaterThanOrEqual(BRICKS_AT.y - 17);
    expect(y1).toBeLessThanOrEqual(BRICKS_AT.y + 1);
    // His body is ink: the silhouette's middle reads dark.
    expect(['ink.1', 'ink.2']).toContain(
      colorAt(sceneDomeRow, 'wave', BRICKS_AT.x, BRICKS_AT.y - 7),
    );
  });

  it('makes the wave read at 2×: a big change, the lit hand clear of the fence against grass', () => {
    // At least ~20 still pixels change (the arm up, the hanging arm gone), so the narrated beat
    // shows at a 2× window.
    const a = rowsOf(sceneDomeRow, 'still');
    const b = rowsOf(sceneDomeRow, 'wave');
    let changed = 0;
    for (let y = 0; y < SCENE_H; y++)
      for (let x = 0; x < SCENE_W; x++) if (a[y]?.[x] !== b[y]?.[x]) changed++;
    expect(changed).toBeGreaterThanOrEqual(20);
    // The arm and hand, with a pixel's margin, sit over open grass on `still`: no fence (its
    // steel posts, wires and orange tags) or anything else behind them.
    const arm = bricksArmPixels();
    expect(arm.filter((p) => p.hand).length).toBeGreaterThanOrEqual(4);
    const xs = arm.map((p) => p.x);
    const ys = arm.filter((p) => p.hand).map((p) => p.y);
    // (The box: the hand's rows down to the head's, from left of the hand to the arm's root.)
    const bx0 = Math.min(...xs) - 1;
    const by0 = Math.min(...ys) - 1;
    const bx1 = Math.max(...xs) - 1;
    const by1 = Math.max(...ys) + 3;
    for (let y = by0; y <= by1; y++) {
      for (let x = bx0; x <= bx1; x++) {
        expect(colorAt(sceneDomeRow, 'still', x, y)?.startsWith('act1.grass'), `${x},${y}`).toBe(
          true,
        );
      }
    }
    // The hand is lit cream, inked round, at better than the 3:1 non-text contrast to the grass.
    for (const p of arm.filter((q) => q.hand))
      expect(colorAt(sceneDomeRow, 'wave', p.x, p.y)).toBe('act1.light');
    const hand = luminance(rgbOf('act1.light'));
    const grass = meanLum(sceneDomeRow, 'still', bx0, by0, bx1, by1);
    expect(contrastRatio(hand, grass)).toBeGreaterThan(3);
    // And all of him stands above the line panel.
    expect(BRICKS_AT.y + 1).toBeLessThan(LINE_PANEL_TOP);
  });

  it('on `gerald`, stamps Gerald 1:1 by the Technician with the clipboard, and changes nothing else', () => {
    expectStamped(sceneDomeRow, 'gerald', enemyGerald, 'walk_se_0', GERALD_AT.x, GERALD_AT.y);
    const [x0, y0, x1, y1] = diffBox(sceneDomeRow, 'wave', 'gerald') ?? [0, 0, 0, 0];
    expect(x0).toBeGreaterThan(TECHNICIAN_AT.x - 24);
    expect(x1).toBeLessThan(TECHNICIAN_AT.x + 24);
    expect(y0).toBeGreaterThan(TECHNICIAN_AT.y - 6);
    expect(y1).toBeLessThan(GERALD_AT.y + 8);
    // Everything stays above the line panel's top.
    expect(y1).toBeLessThan(144);
  });

  it('stands the Technician on the road in every frame, and Bricks by the gate beyond', () => {
    for (const f of ['still', 'wave', 'gerald']) {
      expect(colorAt(sceneDomeRow, f, TECHNICIAN_AT.x, TECHNICIAN_AT.y - 8)).toBe('white.0');
    }
    expect(BRICKS_AT.x).toBeGreaterThan(TECHNICIAN_AT.x);
  });
});

describe('scene.descent', () => {
  it('reads north to south: cloud and sky on top, the Spires, the colony, the grass below', () => {
    expect(
      count(sceneDescent, 'still', ['white.1', 'white.0'], 0, 0, SCENE_W - 1, 20),
    ).toBeGreaterThan(1000);
    expect(
      count(
        sceneDescent,
        'still',
        ['act1.clay.1', 'act1.clay.2', 'act1.clay.3'],
        0,
        90,
        SCENE_W - 1,
        140,
      ),
    ).toBeGreaterThan(1500);
    expect(
      count(sceneDescent, 'still', ['teal.2', 'teal.3', 'teal.4'], 0, 186, SCENE_W - 1, 224),
    ).toBeGreaterThan(40);
    expect(
      count(
        sceneDescent,
        'still',
        ['act1.grass.0', 'act1.grass.1', 'act1.grass.2'],
        0,
        230,
        SCENE_W - 1,
        DESCENT_H - 1,
      ),
    ).toBeGreaterThan(15000);
  });

  it('sends a long line of coral walkers one way, south, seen by the end of the pan', () => {
    const pts = walkerPoints();
    expect(pts.length).toBeGreaterThan(40);
    for (let i = 1; i < pts.length; i++)
      expect(pts[i]?.y).toBeGreaterThanOrEqual(pts[i - 1]?.y ?? 0);
    for (const p of pts)
      expect(colorAt(sceneDescent, 'still', p.x, p.y)?.startsWith('coral')).toBe(true);
    // Above the line panel at the pan's end (rows DESCENT_PAN … DESCENT_H − 36).
    const seen = pts.filter((p) => p.y >= DESCENT_PAN && p.y < DESCENT_H - 36);
    expect(seen.length).toBeGreaterThan(20);
  });
});

describe('stamp.ts', () => {
  it('resolves patches and mirrors as the baker does', () => {
    const def: SpriteDef = {
      id: 'prop.test',
      size: { w: 3, h: 2 },
      anchor: { x: 1, y: 2 },
      palette: 'everglow',
      outline: 'auto',
      frames: {
        a: ['12.', '.3.'],
        b: { from: 'a', patch: { x: 2, y: 0, rows: ['4', ' '] } },
        c: { mirrorOf: 'b' },
      },
    };
    expect(frameRows(def, 'b')).toEqual(['124', '.3.']);
    expect(frameRows(def, 'c')).toEqual(['421', '.3.']);
    expect(colorOfChar(def, '1')).toBe('steel.2');
    expect(colorOfChar(def, '_')).toBeNull();
    // `auto` rings the opaque pixels 4-adjacently in the sprite's outline colour.
    const px = framePixels(def, 'a', 10, 10);
    const outline = px.filter((p) => p.color === 'ink.0');
    expect(px.find((p) => p.x === 9 && p.y === 8)?.color).toBe('steel.2');
    expect(outline.some((p) => p.x === 8 && p.y === 8)).toBe(true);
    expect(outline.some((p) => p.x === 8 && p.y === 9)).toBe(false);
    // Mirrored about the anchor's pixel edge (x = 10): a pixel at [10, 11) lands at [9, 10).
    const m = framePixels(def, 'a', 10, 10, { mirror: true });
    expect(px.find((p) => p.color === 'steel.4')?.x).toBe(10);
    expect(m.find((p) => p.color === 'steel.4')?.x).toBe(9);
  });

  it("writes a colour in the still's legend, or its nearest (and lists it as missed)", () => {
    const ink = sceneInk('act1', { A: 'teal.3' });
    expect(ink.char('teal.3')).toBe('A');
    expect(ink.char('act1.grass.2')).toBe('2');
    expect(ink.missed()).toEqual([]);
    expect(ink.char('teal.4')).not.toBe('.');
    expect(ink.missed()).toEqual(['teal.4']);
  });
});

describe('sceneKit tall stills', () => {
  it('paints a still `h` rows tall, and refuses a frame of the wrong height', () => {
    const tall = defineScene({
      id: 'scene.test_tall',
      palette: 'act1',
      h: 240,
      legend: {},
      paint: () => ({ a: sceneGrid('0', 240) }),
    });
    expect(tall.size).toEqual({ w: SCENE_W, h: 240 });
    expect(tall.anchor).toEqual({ x: SCENE_W / 2, y: 240 });
    expect(rowsOf(tall, 'a').length).toBe(240);
    const wrong = defineScene({
      id: 'scene.test_wrong',
      palette: 'act1',
      h: 240,
      legend: {},
      paint: () => ({ a: sceneGrid('0') }),
    });
    expect(() => wrong.frames).toThrow(/320×240/);
  });
});
