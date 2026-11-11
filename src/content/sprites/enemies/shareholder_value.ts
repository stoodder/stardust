// "Shareholder Value" Executive Assault Platform (`shareholder_value`, design/enemies.md § 6): A3M5's
// boss, piloted by Director Sterling by remote. Everglow's shape language (art-direction §4) at its
// most expensive: a vast white hull on four stocky piston legs, armored in **four bolted plates**
// (pale steel, the `armored` tell's `steel.4`, dark seams and bolt heads; the four that jettison),
// an orange hazard skirt, Everglow's teal chevron, two exhaust stacks breathing teal at its back, a
// **bridge** up front whose big screen shows a stock chart going up in Evie's pink and gold (her
// throughput, defended by remote), the **hangar door** on its rear flank (hazard-striped), and the
// **Takeover dish** folded flat on its back. It reads at 1× as the biggest Everglow thing on the map,
// wide and flat where Chitterbloom is round. Every boss state has its own shape (frame and anim
// names: tech-spec § Format rules; enemyPose.ts picks them):
// - `walk_<facing>` (4 frames, 4 fps): a diagonal gait, two legs lifting at a time, the hull
//   bobbing; the chart's last bar ticks up.
// - `tell_<facing>` (2 frames, 4 fps; phase 1's launch tell, `hangarTelling`): it stops, the
//   hangar door slides open on a dark bay with a Compliance Drone's teal visor peering out, a
//   launch lamp blinking (TakeoverView's orange door bar marks it too).
// - `aim_<facing>` (4 frames, 4 fps; phase 2, Hostile Takeover, the walk's gait): the dish raised
//   on its mast, its red targeting lens lit and pulsing (TakeoverView draws the laser).
// - `panic_<facing>` (4 frames, 10 fps; phase 3 after the jettison, its haste): the plates gone,
//   its bare frame showing (girders, orange wiring, sparks), the screen's chart crashing red, the
//   legs scrambling.
// - `puff_<facing>` (1 frame; between phases, invulnerable): hunkered down two pixels, the screen
//   showing a loading row of dots (render shimmers it).
// - `flee_<facing>` (2 frames, 3 fps; driven off at 0): listing, a rear leg dragging, the screen in
//   static, smoke rising.
// Its plates, once jettisoned, are TakeoverView's wreckage on the crash tiles (render, T730b).
import { defineSprite } from '../defineSprite.ts';
import { at, grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { AnimDef } from '../types.ts';

const W = 54;
const H = 44;
const AX = 27;
const AY = 43;

export type PlatformLook = 'walk' | 'tell' | 'aim' | 'panic' | 'puff' | 'flee';
type Facing = 'se' | 'ne';

/** The legs' columns (rear far, rear near, front far, front near) and which pair a step lifts. */
const LEGS: readonly { x: number; near: boolean; pair: 0 | 1 }[] = [
  { x: 9, near: false, pair: 0 },
  { x: 17, near: true, pair: 1 },
  { x: 35, near: false, pair: 1 },
  { x: 43, near: true, pair: 0 },
];

/** The four plates (x0, y0, x1, y1, from the hull's top-left at rest). */
const PLATES: readonly (readonly [number, number, number, number])[] = [
  [19, 15, 30, 22],
  [31, 15, 47, 22],
  [19, 23, 30, 30],
  [31, 23, 47, 30],
];

/** A piston leg from the hull's underside down to its foot, lifted by `lift`. */
function leg(
  g: CharGrid,
  x: number,
  from: number,
  lift: number,
  near: boolean,
  drag = false,
): void {
  const foot = H - 1 - lift;
  for (let y = from; y < foot - 1; y++) {
    plot(g, x, y, near ? '3' : '2');
    plot(g, x + 1, y, near ? '2' : '1');
    plot(g, x + 2, y, near ? '1' : '0');
  }
  plot(g, x + 1, from + 3, 'c'); // the orange knee joint
  plot(g, x + 1, from + 4, 'b');
  stamp(
    g,
    x - 2 + (drag ? -2 : 0),
    foot - 1,
    drag ? ['.1333..', '0111100'] : ['1333311', '0111110'],
  );
}

/** A rectangle filled with `ch`. */
function box(g: CharGrid, x0: number, y0: number, x1: number, y1: number, ch: string): void {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) plot(g, x, y, ch);
}

/** The bridge screen's face at (x0, y0), 13×7: a chart, a crash, dots, static, or its back. */
function screen(
  g: CharGrid,
  x0: number,
  y0: number,
  look: PlatformLook,
  step: number,
  back: boolean,
): void {
  box(g, x0, y0, x0 + 12, y0 + 6, back ? '1' : 'k');
  if (back) {
    // From behind: the screen's steel back, vent slots and a status lamp.
    for (let y = y0 + 1; y < y0 + 6; y += 2) line(g, x0 + 2, y, x0 + 9, y, '0');
    plot(g, x0 + 11, y0 + 1, '+');
    return;
  }
  if (look === 'puff') {
    for (let k = 0; k < 3; k++) plot(g, x0 + 4 + k * 2, y0 + 3, 'w');
    return;
  }
  if (look === 'flee') {
    for (let y = y0; y <= y0 + 6; y++)
      for (let x = x0; x <= x0 + 12; x++)
        if ((x * 7 + y * 5 + step * 3) % 4 === 0) plot(g, x, y, (x + y) % 3 === 0 ? 'w' : '2');
    return;
  }
  const crash = look === 'panic';
  // The bars: rising pink and gold (its throughput), or crashing red after the jettison.
  const heights = crash ? [5, 4, 4, 3, 2, 1] : [1, 2, 2, 3, 4, step % 2 === 0 ? 5 : 6];
  heights.forEach((hgt, i) => {
    const x = x0 + 1 + i * 2;
    const ch = crash ? (i === 5 ? 'Q' : 'R') : i % 2 === 0 ? 'P' : 'Y';
    for (let k = 0; k < Math.min(hgt, 6); k++) plot(g, x, y0 + 6 - k, ch);
  });
  // The trend line's arrowhead (up, or the crash's down).
  if (crash) stamp(g, x0 + 11, y0 + 4, ['Q.', 'QQ']);
  else stamp(g, x0 + 11, y0, ['.Z', 'ZZ']);
}

function platform(facing: Facing, step: number, look: PlatformLook): string[] {
  const g: CharGrid = grid(W, H);
  const se = facing === 'se';
  const bare = look === 'panic';
  const still = look === 'tell' || look === 'puff';
  const crouch = look === 'puff' ? 2 : 0;
  const bob = still ? 0 : step % 2;
  const dy = crouch + bob;
  // Drawn level; a fleeing hull is sheared afterwards (its rear sinks, `list`).
  // The legs (far ones first), lifting in diagonal pairs as it walks.
  const lifted: 0 | 1 = step < 2 ? 0 : 1;
  for (const l of LEGS.filter((k) => !k.near)) {
    const lift = still || look === 'flee' ? 0 : step % 2 === 0 && l.pair === lifted ? 2 : 0;
    leg(g, l.x, 32 + dy - 1, lift, false);
  }
  // The exhaust stacks at its back, breathing teal (a puff on the beat).
  for (const sx of [6, 9]) {
    box(g, sx, 8 + dy, sx + 1, 14 + dy, '2');
    plot(g, sx, 8 + dy, '3');
    plot(g, sx, 7 + dy, step % 2 === 0 || look === 'flee' ? '+' : '*');
  }
  // The hull: white paint lit from the upper left, rounded corners.
  for (let x = 4; x <= 49; x++) {
    for (let y = 13; y <= 33; y++) {
      const corner = (y === 13 || y === 33) && (x === 4 || x === 49);
      if (corner) continue;
      const ch = bare
        ? (x + y) % 6 === 0 || y % 5 === 0
          ? '0'
          : '1'
        : x + (y - 13) < 22
          ? '4'
          : x < 38
            ? '3'
            : '2';
      plot(g, x, y + dy, ch);
    }
  }
  // The hazard skirt along its underside.
  for (let x = 5; x <= 48; x++) plot(g, x, 32 + dy, (x + step) % 4 < 2 ? 'c' : 'x');
  if (bare) {
    // The bare frame after the jettison: orange wiring sagging between girders, sparks spitting.
    for (let x = 6; x <= 47; x++) {
      const y = 22 + Math.round(2 * Math.sin((x + step) / 2.5));
      plot(g, x, y + dy, x % 7 < 4 ? 'c' : 'b');
    }
    const sparks = [
      [22 + step * 3, 16],
      [40 - step * 2, 27],
      [13 + step, 25],
    ] as const;
    for (const [x, y] of sparks) {
      plot(g, x, y + dy, 'e');
      plot(g, x + 1, y + dy - 1, 'w');
    }
  } else {
    // The four plates, bolted on, pale steel lit along the top, dark seams, a bolt per corner.
    for (const [x0, y0, x1, y1] of PLATES) {
      for (let x = x0; x <= x1; x++) {
        for (let y = y0; y <= y1; y++) {
          const edge = x === x0 || x === x1 || y === y0 || y === y1;
          plot(g, x, y + dy, edge ? '1' : y === y0 + 1 ? 'S' : x > x1 - 3 ? '3' : 'T');
        }
      }
      for (const [bx, by] of [
        [x0 + 1, y0 + 1],
        [x1 - 1, y0 + 1],
        [x0 + 1, y1 - 1],
        [x1 - 1, y1 - 1],
      ] as const)
        plot(g, bx, by + dy, '0');
    }
    // Everglow's chevron on the front plate.
    stamp(g, se ? 41 : 22, 25 + dy, ['8.8', '.8.']);
  }
  // The hangar door on its rear flank: hazard-striped, slid open in the launch tell.
  const hx = se ? 6 : 33;
  const hy = 19 + dy;
  if (look === 'tell') {
    box(g, hx, hy, hx + 11, hy + 11, 'k');
    // A Compliance Drone in the bay, its teal visor peering out, a launch lamp blinking.
    box(g, hx + 3, hy + 4, hx + 8, hy + 9, '3');
    line(g, hx + 4, hy + 6, hx + 8, hy + 6, '7');
    plot(g, hx + 5 + step, hy + 6, 'w');
    plot(g, hx + 6, hy + 3, 'c');
    stamp(g, hx - 1, hy - 1, ['1cxcxcxcxcxcx1']);
    plot(g, hx + 11, hy - 2, step === 0 ? 'e' : 'c');
  } else if (!bare) {
    for (let y = hy; y <= hy + 11; y++) {
      for (let x = hx; x <= hx + 11; x++) {
        const edge = x === hx || x === hx + 11 || y === hy || y === hy + 11;
        plot(g, x, y, edge ? '1' : (x + y) % 6 < 3 ? 'c' : 'x');
      }
    }
  } else {
    box(g, hx, hy, hx + 11, hy + 11, 'k'); // the hangar's bay, its door blown off with the plates
  }
  // The bridge up front: a steel housing round the big screen.
  const bx = se ? 28 : 13;
  const by = 2 + dy;
  box(g, bx, by, bx + 16, by + 11, bare ? '1' : '2');
  line(g, bx, by, bx + 16, by, bare ? '2' : '3');
  screen(g, bx + 2, by + 2, look, step, !se);
  plot(g, bx + 16, by + 1, 'e'); // the REC lamp: Sterling is watching
  // The Takeover dish: folded flat on its back, or raised on its mast with its red lens lit.
  const dx0 = se ? 13 : 37;
  const dtop = 10 + dy;
  if (look === 'aim') {
    // The dish up on its mast, turned to the field, its red lens pulsing (bright on frame 0).
    line(g, dx0 + 3, dtop + 2, dx0 + 3, 8, '1');
    line(g, dx0 + 4, dtop + 2, dx0 + 4, 8, '2');
    const lens = step % 2 === 0 ? ['QQQ', 'QwQ', 'QQQ'] : ['RRR', 'RQR', 'RRR'];
    stamp(g, dx0 - 1, 0, [
      '..12221..',
      '.1233321.',
      '123333321',
      '123333321',
      '123333321',
      '.1233321.',
      '..12221..',
    ]);
    stamp(g, dx0 + 2, 2, lens);
  } else if (!bare) {
    stamp(g, dx0, dtop, ['.2222.', '133331']);
    plot(g, dx0 + 2, dtop + 1, 'R');
  }
  // The near legs in front.
  for (const l of LEGS.filter((k) => k.near)) {
    const drag = look === 'flee' && l.x < 27 && step === 1;
    const lift = still || look === 'flee' ? 0 : step % 2 === 0 && l.pair === lifted ? 2 : 0;
    leg(g, l.x, 32 + dy - 1, lift, true, drag);
  }
  if (look === 'flee') {
    // Smoke rising from the stacks and a seam, a puff higher each frame.
    for (const [sx, sy] of [
      [6, 4],
      [9, 2],
      [24, 10],
    ] as const) {
      stamp(g, sx, sy - step, ['.22.', '2332', '.22.']);
    }
  }
  return look === 'flee' ? list(g) : rows(g);
}

/** The fleeing hull listing: each column sunk by how far back it is (its rear legs giving way). */
function list(g: CharGrid): string[] {
  const out: CharGrid = grid(W, H);
  for (let x = 0; x < W; x++) {
    const d = x < 20 ? 2 : x < 36 ? 1 : 0;
    for (let y = 0; y + d < H; y++) plot(out, x, y + d, at(g, x, y));
  }
  return rows(out);
}

const se = (look: PlatformLook, n: number): Record<string, string[]> =>
  Object.fromEntries(
    (['se', 'ne'] as const).flatMap((f) =>
      Array.from({ length: n }, (_, i) => [`${look}_${f}_${i}`, platform(f, i, look)]),
    ),
  );

/** The four facings of `look` (SE and NE authored, SW and NW mirrored) at `fps`. */
function anims(look: PlatformLook, n: number, fps: number, loop = true): Record<string, AnimDef> {
  const names = (f: string): string[] => Array.from({ length: n }, (_, i) => `${look}_${f}_${i}`);
  return {
    [`${look}_se`]: { frames: names('se'), fps, ...(loop ? {} : { loop }) },
    [`${look}_sw`]: { mirrorOf: `${look}_se` },
    [`${look}_ne`]: { frames: names('ne'), fps, ...(loop ? {} : { loop }) },
    [`${look}_nw`]: { mirrorOf: `${look}_ne` },
  };
}

export const enemyShareholderValue = defineSprite({
  id: 'enemy.shareholder_value',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    S: 'white.0',
    T: 'steel.4',
    P: 'pink.3',
    Y: 'gold.3',
    Z: 'gold.4',
    R: 'red.3',
    Q: 'red.4',
  },
  frames: {
    ...se('walk', 4),
    ...se('tell', 2),
    ...se('aim', 4),
    ...se('panic', 4),
    ...se('puff', 1),
    ...se('flee', 2),
  },
  anims: {
    ...anims('walk', 4, 4),
    ...anims('tell', 2, 4),
    ...anims('aim', 4, 4),
    ...anims('panic', 4, 10),
    ...anims('puff', 1, 2),
    ...anims('flee', 2, 3),
  },
});
