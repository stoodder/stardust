// The Jammed static (`fx.jam_static`; design/enemies.md § 4: a jammed tower shows static, sparks,
// and a countdown ring; art-direction §8 *Jammed towers*): an overlay over a Jammed tower's body,
// on top of its baked `jammed` variant. Short horizontal static dashes in `white.0` and `teal.4`,
// each with an `ink.0` under-stroke so it reads on a pale tower, and a white spark crackling
// between two of them; four frames that scatter differently (`s0`–`s3`, anim `crackle`, 12 fps).
// Anchored at its bottom centre, on the tower's ground point; it covers a T3 tower's body and head.
// Until T730a wires it in, JamView draws its own dashes.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, type CharGrid } from '../helpers.ts';

const W = 22;
const H = 30;

/** One frame of static: dashes scattered by a seeded hash, a spark between two of them. */
function noise(seed: number): string[] {
  const g: CharGrid = grid(W, H);
  for (let i = 0; i < 7; i++) {
    const x = 1 + Math.floor(hash01(seed, i, 7) * (W - 6));
    const y = 2 + Math.floor(hash01(seed, i, 11) * (H - 6));
    const len = 2 + Math.floor(hash01(seed, i, 13) * 3);
    const ch = i % 3 === 0 ? '*' : '4';
    for (let k = 0; k < len; k++) {
      plot(g, x + k, y, ch);
      plot(g, x + k, y + 1, 'x');
    }
  }
  // The spark: a zigzag of white with a teal core pixel.
  const sx = 4 + Math.floor(hash01(seed, 9, 17) * (W - 9));
  const sy = 4 + Math.floor(hash01(seed, 9, 19) * (H - 10));
  for (const [dx, dy] of [
    [0, 0],
    [1, 1],
    [0, 2],
    [1, 3],
  ] as const) {
    plot(g, sx + dx, sy + dy, dy === 1 ? '*' : 'w');
    plot(g, sx + dx + 1, sy + dy, 'x');
  }
  return rows(g);
}

export const fxJamStatic = defineSprite({
  id: 'fx.jam_static',
  size: { w: W, h: H },
  anchor: { x: W / 2, y: H - 1 },
  palette: 'everglow',
  glow: { slots: ['e1'], radius: 1 },
  frames: { s0: noise(1), s1: noise(2), s2: noise(3), s3: noise(4) },
  anims: { crackle: { frames: ['s0', 's1', 's2', 's3'], fps: 12 } },
});
