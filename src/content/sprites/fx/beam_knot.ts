// The beam's knot (art-direction §7: "Aelari shots are thrown threads … with a 1-frame knot sparkle
// at the hit"): where a Prism Spire's or a Seer's Lantern's beam meets its target. `spark` (once,
// 15 fps) is the lock: a white star with four thread-ends flung out along the diagonals, then a
// teal knot in a ruby ring, then the ring alone, loosening. `hold` (loop, 15 fps, the beam's flicker
// rate) is the beam burning on its target: a knot of white in teal, its threads flicking between two
// lengths. Centred on the hit point; aelari palette, the `blue.0` outline round the knot so it
// reads on any ground. BeamView can draw it at the beam's end (T530a).
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp } from '../helpers.ts';

const S = 11;
const C = 5;

function spark(k: number): string[] {
  const g = grid(S, S);
  if (k === 0) {
    // The lock: a white star, thread-ends flung out on the diagonals.
    stamp(g, C - 2, C - 2, ['..*..', '.+*+.', '*****', '.+*+.', '..*..']);
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      plot(g, C + dx * 3, C + dy * 3, '9');
      plot(g, C + dx * 4, C + dy * 4, 'd');
    }
  } else if (k === 1) {
    // The knot, ringed in ruby.
    stamp(g, C - 1, C - 1, ['.+.', '+*+', '.+.']);
    for (const [dx, dy] of [
      [0, -3],
      [2, -2],
      [3, 0],
      [2, 2],
      [0, 3],
      [-2, 2],
      [-3, 0],
      [-2, -2],
    ] as const) {
      plot(g, C + dx, C + dy, dx + dy < 0 ? 'e' : 'd');
    }
  } else {
    // The ring loosening: every other knot gone, a last speck of light.
    for (const [dx, dy] of [
      [0, -4],
      [4, 0],
      [0, 4],
      [-4, 0],
    ] as const) {
      plot(g, C + dx, C + dy, 'c');
    }
    plot(g, C, C, '+');
  }
  return rows(g);
}

function hold(k: number): string[] {
  const g = grid(S, S);
  stamp(g, C - 1, C - 1, ['+*+', '***', '+*+']);
  // Its threads flick between two lengths (the beam's 15 Hz flicker).
  const r = k === 0 ? 2 : 3;
  for (const [dx, dy] of [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
  ] as const) {
    for (let t = 2; t <= r; t++) plot(g, C + dx * t, C + dy * t, t === r ? '9' : '+');
  }
  return rows(g);
}

export const fxBeamKnot = defineSprite({
  id: 'fx.beam_knot',
  size: { w: S, h: S },
  anchor: { x: C, y: C },
  palette: 'aelari',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: { s0: spark(0), s1: spark(1), s2: spark(2), h0: hold(0), h1: hold(1) },
  anims: {
    spark: { frames: ['s0', 's1', 's2'], fps: 15, loop: false },
    hold: { frames: ['h0', 'h1'], fps: 15 },
  },
});
