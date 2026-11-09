// Bricks in person (`ally.bricks`; story/characters.md § Bricks, art-direction §6): Sgt. Okonkwo
// at his post beside the path. Huge and broad, dark skin, a grey-stubbled shaved head, a battered
// khaki Survey Corps jacket over teal Everglow fatigues, a pouch of stones on his belt (one glints
// pink-gold: his Tumble IV stone), and the rivet cannon on his shoulder. He stands on a round
// Everglow post plate with a hazard-striped rim, so he reads as a person at a station, never as a
// tower (no plinth block, no chevrons, no teal sensor).
import { defineSprite } from '../defineSprite.ts';
import { disc, grid, line, plot, rows, type CharGrid } from '../helpers.ts';

const W = 28;
const H = 30;
/** The post plate's center: his ground point. */
const CX = 12;
const CY = 26;

/** The round post plate: steel deck, hazard stripes (orange and ink) around the rim. */
function post(g: CharGrid): void {
  for (let y = CY - 2; y <= CY + 5; y++) {
    for (let x = CX - 11; x <= CX + 11; x++) {
      if (Math.hypot((x + 0.5 - CX) / 9.5, (y + 0.5 - CY - 1.5) / 3.8) <= 1) plot(g, x, y, '_');
    }
  }
  for (let y = CY - 4; y <= CY + 3; y++) {
    for (let x = CX - 9; x <= CX + 9; x++) {
      const top = Math.hypot((x + 0.5 - CX) / 8, (y + 0.5 - CY + 1) / 3.2) <= 1;
      const side = Math.hypot((x + 0.5 - CX) / 8, (y + 0.5 - CY) / 3.2) <= 1;
      if (top) plot(g, x, y, (x + y) % 5 === 0 ? '2' : (x + 2 * y) % 3 === 0 ? '3' : '4');
      else if (side) plot(g, x, y, Math.floor((x + 40) / 2) % 2 === 0 ? 'c' : '0');
    }
  }
}

/** The figure, facing SE (toward the camera) or NE (back turned), with the cannon on his shoulder. */
function figure(g: CharGrid, facing: 'se' | 'ne', breath: 0 | 1, fire: boolean): void {
  const b = breath; // shoulders and head rise 1 px on the in-breath
  // Legs in fatigues, planted wide; boots.
  for (let y = 19; y <= 24; y++) {
    const legs: readonly (readonly [number, number])[] = [
      [8, 10],
      [13, 15],
    ];
    for (const [x0, x1] of legs) {
      for (let x = x0; x <= x1; x++) plot(g, x, y, y >= 23 ? 'I' : x === x1 ? 'M' : 'N');
    }
  }
  // Torso: the broad jacket, shoulders wider than the waist, lit left, with a darker hem.
  for (let y = 10 - b; y <= 19; y++) {
    const r = y - (10 - b);
    const inset = r === 0 ? 1 : r <= 4 ? 0 : r <= 7 ? 1 : 2;
    for (let x = 5 + inset; x <= 18 - inset; x++) {
      const ch = y === 19 ? 'O' : x <= 7 + inset ? 'L' : x <= 13 ? 'K' : 'J';
      plot(g, x, y, ch);
    }
  }
  if (facing === 'se') {
    // The open front: the teal fatigue shirt, then the belt with the pouch of stones.
    for (let y = 11 - b; y <= 16; y++) {
      plot(g, 12, y, 'N');
      plot(g, 13, y, 'M');
    }
    line(g, 6, 17, 17, 17, 'I');
    plot(g, 12, 17, 'w');
    plot(g, 8, 18, 'I');
    plot(g, 9, 18, 'I');
    plot(g, 8, 17, 'J');
    plot(g, 9, 18, 'Q'); // the stone that is someone
    // The faded Survey Corps patch (a compass over a stone) on the left shoulder.
    plot(g, 7, 12 - b, 'R');
    plot(g, 8, 12 - b, 'R');
    plot(g, 7, 13 - b, 'J');
  } else {
    // His back: the big faded patch between the shoulders, the belt.
    for (const [x, y] of [
      [11, 12],
      [12, 12],
      [11, 13],
      [12, 13],
      [10, 13],
      [13, 13],
    ] as const)
      plot(g, x, y - b, 'R');
    plot(g, 12, 14 - b, 'J');
    line(g, 6, 17, 17, 17, 'I');
    plot(g, 15, 18, 'I');
    plot(g, 15, 17, 'J');
  }
  // The hanging arm (screen left): sleeve, then a big hand.
  for (let y = 11 - b; y <= 16; y++) {
    plot(g, 5, y, 'L');
    plot(g, 6, y, 'K');
  }
  plot(g, 5, 17, 'C');
  plot(g, 6, 17, 'B');
  // The rivet cannon on the right shoulder, aimed along the facing: a white tube, lit on top,
  // an orange band, a dark breech; it kicks back 1 px when it fires.
  const kick = fire ? -1 : 0;
  const dir = facing === 'se' ? 1 : -1;
  const x0 = (facing === 'se' ? 13 : 11) + kick;
  const y0 = (facing === 'se' ? 7 : 14) - b;
  const x1 = (facing === 'se' ? 23 : 21) + kick;
  const y1 = y0 + dir * 5;
  const tube: CharGrid = grid(W, H);
  // Four rows thick: white top, lit, mid, dark underside.
  ['4', '3', '2', '1'].forEach((ch, i) => {
    line(tube, x0, y0 - 2 + i, x1, y1 - 2 + i, ch);
  });
  // The orange band, and the box magazine hanging under it.
  for (let k = 0; k < 2; k++) {
    const bx = Math.round(x0 + (x1 - x0) * (0.5 + k * 0.1));
    const by = Math.round(y0 + (y1 - y0) * (0.5 + k * 0.1));
    plot(tube, bx, by - 2, 'e');
    plot(tube, bx, by - 1, 'd');
    plot(tube, bx, by, 'c');
    plot(tube, bx, by + 1, 'b');
  }
  const mx = Math.round(x0 + (x1 - x0) * 0.3);
  const my = Math.round(y0 + (y1 - y0) * 0.3);
  for (let dy = 2; dy <= 4; dy++) {
    plot(tube, mx, my + dy, '2');
    plot(tube, mx + 1, my + dy, '1');
    plot(tube, mx + 2, my + dy, '0');
  }
  // Dark breech; the muzzle's white ring around a black bore.
  for (let i = -2; i <= 1; i++) plot(tube, x0, y0 + i, '0');
  for (let i = -2; i <= 1; i++) plot(tube, x1, y1 + i, i === -1 || i === 0 ? 'k' : 'w');
  // Head: a round shaved head, lit upper left, grey stubble on the crown.
  const head: CharGrid = grid(W, H);
  const hx = facing === 'se' ? 12 : 11.5;
  const hy = 6.5 - b;
  disc(head, hx, hy, 3.3, (d, x, y) => {
    const lit = -(x + 0.5 - hx) - (y + 0.5 - hy);
    if (d > 2.6 && lit < -1) return 'A';
    if (lit > 1.5 && d < 2.6) return 'D';
    return lit > -1 ? 'C' : 'B';
  });
  for (const [x, y] of [
    [11, 4],
    [13, 4],
    [12, 3],
    [10, 5],
  ] as const)
    plot(head, x, y - b, 'E');
  if (facing === 'se') {
    // Face toward the camera's right: brow, eyes (the left brow split by the scar), mouth.
    plot(head, 12, 6 - b, 'A');
    plot(head, 14, 6 - b, 'D'); // the scar through the brow
    plot(head, 12, 7 - b, 'k');
    plot(head, 14, 7 - b, 'k');
    plot(head, 13, 9 - b, 'A');
    plot(head, 9, 7 - b, 'B'); // ear
  } else {
    plot(head, 9, 7 - b, 'B');
    plot(head, 14, 7 - b, 'B');
    plot(head, 11, 9 - b, 'A');
    plot(head, 12, 9 - b, 'A');
  }
  // Neck.
  plot(g, 11, 10 - b, 'A');
  plot(g, 12, 10 - b, 'B');
  // Layering: SE, the head sits in front of the cannon's breech; NE, the cannon passes in front.
  const layers = facing === 'se' ? [tube, head] : [head, tube];
  for (const layer of layers) {
    layer.forEach((row, y) =>
      row.forEach((ch, x) => {
        if (ch !== '.') plot(g, x, y, ch);
      }),
    );
  }
  // The gripping hand under the tube.
  const gx = Math.round(x0 + (x1 - x0) * 0.42);
  const gy = Math.round(y0 + (y1 - y0) * 0.42) + 2;
  plot(g, gx, gy, 'C');
  plot(g, gx + 1, gy, 'B');
  if (fire) {
    // Muzzle flash: a white-hot core in a warm burst, ahead of the muzzle.
    const fx = x1 + 2;
    const fy = y1 - 1;
    disc(g, fx + 0.5, fy + 0.5, 2.2, (d) => (d < 1 ? 'w' : 'e'));
    plot(g, fx + 3, fy + dir, 'd');
  }
}

function bricks(facing: 'se' | 'ne', breath: 0 | 1, fire: boolean): string[] {
  const g = grid(W, H);
  post(g);
  figure(g, facing, breath, fire);
  return rows(g);
}

export const allyBricks = defineSprite({
  id: 'ally.bricks',
  size: { w: W, h: H },
  anchor: { x: CX, y: CY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['a4', 'hi'], radius: 1 },
  // prettier-ignore
  legend: {
    A: 'skin.c.2', B: 'skin.c.3', C: 'skin.c.4', D: 'skin.b.4', E: 'steel.3',
    I: 'grime.2', J: 'grime.3', K: 'grime.4', L: 'orange.4', O: 'grime.3',
    M: 'teal.2', N: 'teal.3', Q: 'pink.3', R: 'steel.3',
  },
  frames: {
    idle_se_0: bricks('se', 0, false),
    idle_se_1: bricks('se', 1, false),
    fire_se_0: bricks('se', 0, true),
    idle_ne_0: bricks('ne', 0, false),
    idle_ne_1: bricks('ne', 1, false),
    fire_ne_0: bricks('ne', 0, true),
  },
  anims: {
    idle_se: { frames: ['idle_se_0', 'idle_se_1'], fps: 2 },
    idle_sw: { mirrorOf: 'idle_se' },
    idle_ne: { frames: ['idle_ne_0', 'idle_ne_1'], fps: 2 },
    idle_nw: { mirrorOf: 'idle_ne' },
    fire_se: { frames: ['fire_se_0', 'idle_se_0'], fps: 10, loop: false },
    fire_sw: { mirrorOf: 'fire_se' },
    fire_ne: { frames: ['fire_ne_0', 'idle_ne_0'], fps: 10, loop: false },
    fire_nw: { mirrorOf: 'fire_ne' },
  },
});
