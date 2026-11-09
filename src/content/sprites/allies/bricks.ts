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

/**
 * The grounded cannon (`lowered`): stood on end, butt down on the post plate, muzzle up at his
 * chest. SE, it stands plumb in front of him; NE (his back turned), it stands beside his right
 * hip, leaning a little ahead, and is drawn before the body so he hides its near edge.
 * Lit from the left like the shouldered tube: white, lit, mid, dark across its width.
 */
function groundedCannon(g: CharGrid, facing: 'se' | 'ne'): void {
  const top = facing === 'se' ? 14 : 13;
  // Its left column per row: plumb (SE), or stepping right toward the muzzle (NE).
  const left = (y: number): number => (facing === 'se' ? 11 : y >= 21 ? 16 : y >= 17 ? 17 : 18);
  for (let y = top; y <= 24; y++) {
    const x = left(y);
    // The muzzle's white lip, the orange band, the dark butt on the plate.
    const ramp =
      y === top ? 'wwww' : y === 24 ? '0000' : y === top + 4 || y === top + 5 ? 'edcb' : '4321';
    for (let i = 0; i < 4; i++) plot(g, x + i, y, ramp.charAt(i));
  }
  // The box magazine, sticking out on the far side.
  const my = top + 2;
  for (let dy = 0; dy < 3; dy++) {
    const x = left(my + dy) + 4;
    plot(g, x, my + dy, '1');
    plot(g, x + 1, my + dy, '0');
  }
}

/**
 * Both big hands resting on the muzzle, one over the other, the forearms coming in from the slack
 * shoulders. SE, they meet in front of his chest; NE (his back turned), the near hand shows at the
 * end of his right shoulder, the far one's knuckles under it.
 */
function restingHands(g: CharGrid, facing: 'se' | 'ne', b: 0 | 1): void {
  if (facing === 'se') {
    // Forearms: a lit sleeve angling in from each shoulder, a dark crease under it.
    for (const [x, y] of [
      [6, 12],
      [7, 12],
      [8, 13],
      [9, 13],
    ] as const) {
      const yy = y - (x < 8 ? b : 0);
      if (g[yy]?.[x] !== 'R') plot(g, x, yy, 'L'); // the shoulder patch stays on top
    }
    line(g, 6, 14, 9, 14, 'J');
    for (const [x, y] of [
      [17, 12],
      [16, 12],
      [15, 13],
    ] as const)
      plot(g, x, y - (x > 16 ? b : 0), 'K');
    plot(g, 16, 13, 'J');
    // The hands on the muzzle, the right over the left, each lit on its left knuckle and a step
    // darker than the khaki behind them so they read on it.
    for (const [x, ch] of [
      [10, 'C'],
      [11, 'B'],
      [12, 'C'],
      [13, 'B'],
      [14, 'A'],
    ] as const)
      plot(g, x, 13, ch);
    plot(g, 10, 14, 'B'); // a thumb over the lip
    plot(g, 14, 14, 'A');
  } else {
    // The near hand on the muzzle, at the end of his shoulder; the far one's knuckles under it.
    for (const [x, ch] of [
      [19, 'C'],
      [20, 'C'],
      [21, 'B'],
    ] as const)
      plot(g, x, 12, ch);
    plot(g, 21, 13, 'A');
  }
}

/**
 * The figure, facing SE (toward the camera) or NE (back turned), with the cannon on his shoulder,
 * or (`lowered`) grounded: butt down on his post plate, both hands resting on the muzzle,
 * shoulders and head down a pixel. At ease, nothing to shoot.
 */
function figure(
  g: CharGrid,
  facing: 'se' | 'ne',
  breath: 0 | 1,
  fire: boolean,
  lowered = false,
): void {
  const b = breath; // shoulders and head rise 1 px on the in-breath
  const s = lowered ? 1 : 0; // slack: shoulders and head sit 1 px lower with the cannon grounded
  if (lowered && facing === 'ne') groundedCannon(g, facing); // ahead of him, so behind his body
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
  // Slack, the shoulder line also rounds off a pixel more.
  for (let y = 10 + s - b; y <= 19; y++) {
    const r = y - (10 + s - b);
    const inset = r === 0 ? 1 + s : r <= 4 ? 0 : r <= 7 ? 1 : 2;
    for (let x = 5 + inset; x <= 18 - inset; x++) {
      const ch = y === 19 ? 'O' : x <= 7 + inset ? 'L' : x <= 13 ? 'K' : 'J';
      plot(g, x, y, ch);
    }
  }
  if (facing === 'se') {
    // The open front: the teal fatigue shirt, then the belt with the pouch of stones.
    for (let y = 11 + s - b; y <= 16; y++) {
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
    plot(g, 7, 12 + s - b, 'R');
    plot(g, 8, 12 + s - b, 'R');
    plot(g, 7, 13 + s - b, 'J');
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
      plot(g, x, y + s - b, 'R');
    plot(g, 12, 14 + s - b, 'J');
    line(g, 6, 17, 17, 17, 'I');
    plot(g, 15, 18, 'I');
    plot(g, 15, 17, 'J');
  }
  if (lowered) {
    if (facing === 'se') groundedCannon(g, facing); // in front of him
    restingHands(g, facing, b);
  } else {
    // The hanging arm (screen left): sleeve, then a big hand.
    for (let y = 11 - b; y <= 16; y++) {
      plot(g, 5, y, 'L');
      plot(g, 6, y, 'K');
    }
    plot(g, 5, 17, 'C');
    plot(g, 6, 17, 'B');
  }
  // The rivet cannon on the right shoulder, aimed along the facing: a white tube, lit on top,
  // an orange band, a dark breech; it kicks back 1 px when it fires.
  const kick = fire ? -1 : 0;
  const dir = facing === 'se' ? 1 : -1;
  const x0 = (facing === 'se' ? 13 : 11) + kick;
  const y0 = (facing === 'se' ? 7 : 14) - b;
  const x1 = (facing === 'se' ? 23 : 21) + kick;
  const y1 = y0 + dir * 5;
  const tube: CharGrid = grid(W, H);
  if (!lowered) {
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
  }
  // Head: a round shaved head, lit upper left, grey stubble on the crown.
  const head: CharGrid = grid(W, H);
  const hx = facing === 'se' ? 12 : 11.5;
  const hy = 6.5 + s - b;
  disc(head, hx, hy, 3.3, (d, x, y) => {
    const lit = -(x + 0.5 - hx) - (y + 0.5 - hy);
    if (d > 2.6 && lit < -1) return 'A';
    if (lit > 1.5 && d < 2.6) return 'D';
    return lit > -1 ? 'C' : 'B';
  });
  const hb = s - b; // the head's offset from its authored rows
  for (const [x, y] of [
    [11, 4],
    [13, 4],
    [12, 3],
    [10, 5],
  ] as const)
    plot(head, x, y + hb, 'E');
  if (facing === 'se') {
    // Face toward the camera's right: brow, eyes (the left brow split by the scar), mouth.
    plot(head, 12, 6 + hb, 'A');
    plot(head, 14, 6 + hb, 'D'); // the scar through the brow
    plot(head, 12, 7 + hb, 'k');
    plot(head, 14, 7 + hb, 'k');
    plot(head, 13, 9 + hb, 'A');
    plot(head, 9, 7 + hb, 'B'); // ear
  } else {
    plot(head, 9, 7 + hb, 'B');
    plot(head, 14, 7 + hb, 'B');
    plot(head, 11, 9 + hb, 'A');
    plot(head, 12, 9 + hb, 'A');
  }
  // Neck.
  plot(g, 11, 10 + hb, 'A');
  plot(g, 12, 10 + hb, 'B');
  // Layering: SE, the head sits in front of the cannon's breech; NE, the cannon passes in front.
  const layers = facing === 'se' ? [tube, head] : [head, tube];
  for (const layer of layers) {
    layer.forEach((row, y) =>
      row.forEach((ch, x) => {
        if (ch !== '.') plot(g, x, y, ch);
      }),
    );
  }
  if (lowered) return;
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

function bricks(facing: 'se' | 'ne', breath: 0 | 1, fire: boolean, lowered = false): string[] {
  const g = grid(W, H);
  post(g);
  figure(g, facing, breath, fire, lowered);
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
    lowered_se_0: bricks('se', 0, false, true),
    lowered_se_1: bricks('se', 1, false, true),
    lowered_ne_0: bricks('ne', 0, false, true),
    lowered_ne_1: bricks('ne', 1, false, true),
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
    // Cannon grounded (the Quiet Wave, A1M5 W10): the idle breath, butt down, hands on the muzzle.
    lowered_se: { frames: ['lowered_se_0', 'lowered_se_1'], fps: 2 },
    lowered_sw: { mirrorOf: 'lowered_se' },
    lowered_ne: { frames: ['lowered_ne_0', 'lowered_ne_1'], fps: 2 },
    lowered_nw: { mirrorOf: 'lowered_ne' },
  },
});
