// Confetti for the A1M5 party (act1.md § A1M5, `a1_m05_scene_party`; D097 R3), staged by the
// full-screen scene layer (DOM) over `prop.confetti_cannon`'s `fire`. `burst` (once, 10 fps): a
// white muzzle puff, then a fountain of confetti in every party colour thrown up from the anchor
// (the cannon's muzzle), peaking, spreading, and fluttering down. `fall` (6 fps, looping): confetti
// drifting down that tiles vertically and horizontally, for the stage behind the lines. Pieces
// twirl between 2×1, 1×2 and 1×1 frame to frame. Deterministic: seeded by piece index.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';

const W = 96;
const H = 72;
const AX = 48;
const AY = 71;
/** Party colours: pink, gold, blue, teal, orange, white, green (legend below). */
const COLORS = ['P', 'G', 'B', 'T', 'O', 'L', 'R', 'Q'] as const;

function piece(g: CharGrid, x: number, y: number, ch: string, twirl: number): void {
  plot(g, x, y, ch);
  if (twirl % 3 === 0) plot(g, x + 1, y, ch);
  else if (twirl % 3 === 1) plot(g, x, y + 1, ch);
}

const BURST_PIECES = 72;
/** Simulated time (s) of each burst frame. */
const BURST_T = [0.06, 0.2, 0.38, 0.6, 0.86, 1.14];

/** Where burst piece `i` is at time `t`: a ballistic throw with drag, then a capped flutter. */
function burstAt(i: number, t: number): { x: number; y: number; falling: boolean } {
  const ang = (hash01(i, 1, 31) - 0.5) * 1.5; // ±43° off vertical
  const speed = 70 + hash01(i, 2, 31) * 100;
  let vx = Math.sin(ang) * speed;
  let vy = -Math.cos(ang) * speed;
  let x = AX;
  let y = AY - 4;
  const dt = 0.01;
  for (let s = 0; s < t; s += dt) {
    vy += 160 * dt;
    vx *= 1 - 1.6 * dt;
    if (vy > 26) vy = 26; // paper flutters, it doesn't drop
    x += vx * dt;
    y += vy * dt;
  }
  const sway = vy > 0 ? Math.round(Math.sin(t * 9 + i) * 1.5) : 0;
  return { x: Math.round(x) + sway, y: Math.round(y), falling: vy > 0 };
}

function burstFrame(k: number): string[] {
  const g = grid(W, H);
  const t = BURST_T[k] ?? 0;
  // The muzzle puff: big and white at once, a thinning ring after.
  const puff = k === 0 ? 6 : k === 1 ? 4 : 0;
  for (let y = AY - 12; y <= AY; y++) {
    for (let x = AX - 8; x <= AX + 8; x++) {
      const d = Math.hypot(x + 0.5 - AX, (y + 0.5 - (AY - 5)) * 1.2);
      if (d > puff) continue;
      if (k === 1 && hash01(x, y, 33) < 0.65) continue; // the puff thins out
      plot(g, x, y, k === 0 && d < puff - 2 ? 'L' : 'K');
    }
  }
  for (let i = 0; i < BURST_PIECES; i++) {
    const p = burstAt(i, t);
    const ch = COLORS[i % COLORS.length] ?? 'L';
    // Streamers (every ninth piece): a short ribbon trailing back along its path.
    if (i % 9 === 0 && k >= 1) {
      for (let j = 1; j <= 4; j++) {
        const q = burstAt(i, Math.max(0, t - j * 0.035));
        plot(g, q.x, q.y + (j % 2), ch);
      }
    }
    piece(g, p.x, p.y, ch, i + k);
  }
  return rows(g);
}

const FALL_FRAMES = 8;
const FALL_PIECES = 46;

/** Drifting confetti: each piece falls H / FALL_FRAMES px a frame, wrapping, so the loop is seamless. */
function fallFrame(k: number): string[] {
  const g = grid(W, H);
  const step = H / FALL_FRAMES;
  for (let i = 0; i < FALL_PIECES; i++) {
    const x0 = Math.floor(hash01(i, 5, 37) * W);
    const y0 = Math.floor(hash01(i, 6, 37) * H);
    const y = Math.floor((y0 + k * step) % H);
    const sway = Math.round(Math.sin(((k + i) * Math.PI * 2) / FALL_FRAMES) * 1.5);
    const x = (((x0 + sway) % (W - 1)) + (W - 1)) % (W - 1);
    piece(g, x, y, COLORS[i % COLORS.length] ?? 'L', i + k);
  }
  return rows(g);
}

const BURST = BURST_T.map((_, k) => `burst_${k}`);
const FALL = Array.from({ length: FALL_FRAMES }, (_, k) => `fall_${k}`);

export const fxConfettiBurst = defineSprite({
  id: 'fx.confetti_burst',
  size: { w: W, h: H },
  anchor: { x: AX, y: AY },
  palette: 'everglow',
  outline: 'none',
  legend: {
    P: 'pink.3',
    Q: 'pink.4',
    G: 'gold.4',
    B: 'blue.4',
    T: 'teal.3',
    O: 'orange.3',
    L: 'white.1',
    K: 'white.0',
    R: 'green.3',
  },
  frames: {
    ...Object.fromEntries(BURST.map((name, k) => [name, burstFrame(k)])),
    ...Object.fromEntries(FALL.map((name, k) => [name, fallFrame(k)])),
  },
  anims: {
    burst: { frames: BURST, fps: 10, loop: false },
    fall: { frames: FALL, fps: 6 },
  },
});
