// The Glass Witch (`glass_witch`, design/enemies.md § 6; A2M2's boss): Ves'thara's lumenglass
// avatar, the same person as her portrait (art-direction §5, D103), woven at full height
// (art-direction §4: woven, never plated). A tall pointed veil of open sapphire lattice whose gaps
// are real holes (the ground shows through), a long face lit from inside with two knots of light
// for eyes and a ruby knot on the brow, a woven neck, and dark emerald robes falling to a fringed
// hem, open at the chest on a woven body round a white-hot heart. At her collar the ruby thread is
// **cut**: its loose end hangs out of the weave, frayed in two, in every frame and pose. She hovers
// two pixels over her shadow, and the outline is the weave's own (`outlineOutside`).
// Every boss state has its own shape (art-direction §6), each in SE and NE (mirrored to SW/NW):
// - `walk`: a slow glide, a 1 px bob, the veil humming, the hem fringe swaying (4 frames, 4 fps).
// - `tell`: the shield pulse's tell, arms raised, light gathering in both palms and the heart
//   blazing (2 frames, 4 fps).
// - `blink`: the blink tell pose, held: drawn up tall and thin, leaning into the step, arms swept
//   back, the robe's hem already coming undone into open weave (1 frame).
// - `puff`: the phase change, gathered in on herself: head bowed, eyes shut, arms crossed over the
//   heart (1 frame; render shimmers it).
// - `flee`: the retreat at 40%, bowed and dimmed (the eyes lose their white core, as only her grief
//   does in the portrait), one hand at the cut thread, the hem trailing loose threads (2 frames).
import { defineSprite } from '../defineSprite.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { hum, outlineOutside, rim, weave, type Mask } from './lattice.ts';

const W = 31;
const H = 48;
const CX = 15.5;
/** The hem's bottom row while level; the ground point is two rows below (she hovers). */
const HEM = 43;

export type WitchPose = 'walk' | 'tell' | 'blink' | 'puff' | 'flee';
type Facing = 'se' | 'ne';

interface Shape {
  /** Rise (px) of the whole figure this frame. */
  readonly bob: number;
  /** Hood top row. */
  readonly top: number;
  /** Lean: px the head moves toward the facing (the hem stays). */
  readonly lean: number;
  /** Robe half-width at the hem. */
  readonly hem: number;
  /** Head lowered (px): bowed. */
  readonly bow: number;
}

/** Each pose's shape, before the walk's bob (`flee` drifts down a pixel on its second frame). */
const SHAPES: Readonly<Record<WitchPose, Omit<Shape, 'bob'>>> = {
  walk: { top: 2, lean: 1, hem: 10, bow: 0 },
  tell: { top: 2, lean: 0, hem: 10, bow: 0 },
  blink: { top: 0, lean: 2, hem: 7, bow: 0 },
  puff: { top: 3, lean: 0, hem: 8.5, bow: 2 },
  flee: { top: 4, lean: 1, hem: 9.5, bow: 3 },
};

function shapeOf(pose: WitchPose, beat: number): Shape {
  const bob = pose === 'walk' ? beat % 2 : pose === 'flee' ? beat : 0;
  return { bob, ...SHAPES[pose] };
}

function witch(pose: WitchPose, facing: Facing, beat: number): string[] {
  const g: CharGrid = grid(W, H);
  const s = shapeOf(pose, beat);
  const front = facing === 'se';
  const lift = s.bob;
  /** x offset of the upper body at row y (the lean fades out toward the hem). */
  const leanAt = (y: number): number => Math.round(s.lean * Math.max(0, (32 - y) / 30));
  const shoulder = 18 + s.bow - lift;
  const hemY = HEM - lift;
  const cx = (y: number): number => CX + leanAt(y);

  // The robe: dark emerald, lit left, from the shoulders to a fringed bell at the hem.
  const robeHalf = (y: number): number => {
    const t = (y + 0.5 - shoulder) / (hemY - shoulder);
    if (t < 0 || t > 1) return -1;
    const narrow = pose === 'blink' || pose === 'puff' ? 1 : 0;
    if (t < 0.3) return 6.5 - narrow - t * 4;
    return 5.3 - narrow + ((t - 0.3) / 0.7) * (s.hem - 5.3 + narrow);
  };
  const robe: Mask = (x, y) => {
    const hw = robeHalf(y);
    return hw >= 0 && Math.abs(x + 0.5 - cx(y)) <= hw;
  };
  // The front opening: a V from the collar, closing again at the hips.
  const open: Mask = (x, y) => {
    if (!front || pose === 'puff') return false;
    const d = y + 0.5 - shoulder;
    if (d < 0 || d > 19) return false;
    const half = d < 12 ? 0.6 + d * 0.3 : (19 - d) * 0.6;
    return Math.abs(x + 0.5 - cx(y)) < half;
  };
  // In the blink, the hem is already coming undone: the lowest rows are open weave.
  const undone = (y: number): boolean => pose === 'blink' && y > hemY - 8;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!robe(x, y) || open(x, y)) continue;
      const rel = (x + 0.5 - cx(y)) / Math.max(1, robeHalf(y));
      if (undone(y) && (x + y) % 3 !== 0 && (x - y) % 3 !== 0) continue;
      // Dark emerald, lit at the left edge, a fold line falling down each side, and here and
      // there a lit thread: the robes are woven from the same glass.
      const thread = (x * 3 + y * 5 + beat) % 11 === 0;
      const fold = Math.abs(rel + 0.5) < 0.12 || Math.abs(rel - 0.35) < 0.1;
      plot(g, x, y, rel < -0.6 ? '7' : thread ? '7' : fold ? '5' : rel < 0.2 ? '6' : '5');
    }
  }
  rim(g, (x, y) => robe(x, y) && !open(x, y), CX - 3, shoulder + 4, 's');
  // Inside the opening: her woven body, sapphire with real gaps, round the heart.
  const heartY = shoulder + 7;
  weave(g, open, { mode: 'diag', spacing: 3, phase: 1, rise: lift, lx: cx(heartY), ly: heartY }, 7);
  const blaze = pose === 'tell';
  const dim = pose === 'flee';
  if (front) {
    const hx = Math.floor(cx(heartY)) - 1;
    if (pose === 'puff') {
      // Gathered in: the heart's light only shows between her crossed arms.
      plot(g, hx + 1, heartY, '+');
    } else if (blaze) {
      stamp(g, hx - 1, heartY - 2, ['.+++.', '++*++', '+***+', '++*++', '.+++.']);
    } else {
      stamp(g, hx, heartY - 1, dim ? ['.+.', '+++', '.+.'] : ['.+.', '+*+', '.+.']);
    }
  } else {
    // From behind, only the heart's glow through the robe.
    plot(g, Math.floor(cx(heartY)), heartY, '+');
    plot(g, Math.floor(cx(heartY)) - 1, heartY + 1, '+');
  }

  // The veil: a tall pointed arch of open lattice from the hood's tip to the shoulders.
  const vTop = s.top + s.bow - lift;
  const veil: Mask = (x, y) => {
    const t = (y + 0.5 - vTop) / (shoulder + 2 - vTop);
    if (t < 0 || t > 1) return false;
    const hw = 7.6 * Math.pow(t, 0.6);
    // A drooping veil (bowed) leans its tip forward.
    return Math.abs(x + 0.5 - cx(y) - (s.bow > 1 && t < 0.3 ? 1 : 0)) <= hw;
  };
  const faceCy = vTop + 10;
  const face: Mask = (x, y) =>
    front &&
    Math.hypot((x + 0.5 - cx(y) - 0.5) / 3.1, (y + 0.5 - faceCy) / 4.6) <= 1 &&
    y > vTop + 5;
  weave(
    g,
    (x, y) => veil(x, y) && !face(x, y),
    { mode: 'diag', spacing: 3, phase: 0, rise: lift, lx: cx(faceCy), ly: faceCy },
    7,
  );
  rim(g, veil, CX - 2, vTop + 6);
  hum(g, veil, pose === 'walk' ? beat : 0, front ? 11 : 12);
  if (front) {
    // The face, lit from inside: brightest at its heart, the fine weave showing toward the rim.
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (!face(x, y)) continue;
        const d = Math.hypot((x + 0.5 - cx(y) - 0.5) / 3.1, (y + 0.5 - faceCy) / 4.6);
        const lowLit = y > faceCy && x + 0.5 < cx(y);
        plot(g, x, y, d > 0.8 && x + 0.5 > cx(y) + 1 ? '2' : lowLit && d < 0.6 ? '4' : '3');
      }
    }
    const fx = Math.floor(cx(faceCy));
    const ey = faceCy - 1;
    // The eyes: knots of light in dim sockets. Shut in the puff; dimmed (no white) in the retreat.
    // Brows: single threads.
    plot(g, fx - 2, ey - 2, '1');
    plot(g, fx - 1, ey - 2, '2');
    plot(g, fx + 2, ey - 2, '2');
    plot(g, fx + 3, ey - 2, '1');
    if (pose === 'puff') {
      plot(g, fx - 1, ey + 1, '1');
      plot(g, fx + 2, ey + 1, '1');
      plot(g, fx - 2, ey + 1, '1');
      plot(g, fx + 3, ey + 1, '1');
    } else {
      // Each eye a knot of light in a dim almond socket: a white core (the `hi` slot, so its glow
      // doesn't wash out the face at 1×), dimmed to teal in the retreat.
      const eye = dim ? '9' : 'w';
      plot(g, fx - 2, ey, '1');
      plot(g, fx - 1, ey, eye);
      plot(g, fx + 2, ey, eye);
      plot(g, fx + 3, ey, '1');
      if (pose === 'blink') {
        // Wide and white: she is about to step through.
        plot(g, fx - 1, ey - 1, 'w');
        plot(g, fx + 2, ey - 1, 'w');
      }
      // In the retreat, one light falls like a tear.
      if (dim) plot(g, fx - 1, ey + 2, '9');
    }
    // The mouth: a seam in the weave.
    plot(g, fx, faceCy + 2, '1');
    plot(g, fx + 1, faceCy + 2, '1');
  } else {
    // The back of her head: a denser weave inside the veil.
    weave(
      g,
      (x, y) => veil(x, y) && Math.hypot((x + 0.5 - cx(y)) / 3, (y + 0.5 - faceCy) / 4.3) <= 1,
      { mode: 'diag', spacing: 2, phase: 1, rise: lift, lx: cx(faceCy), ly: faceCy - 3 },
      8,
    );
  }
  // The ruby knot on the brow (on the crown from behind).
  const bx = Math.floor(cx(vTop + 4));
  plot(g, bx, vTop + 4, 'd');
  plot(g, bx + 1, vTop + 4, 'c');
  plot(g, bx, vTop + 5, 'c');
  // The woven neck.
  const nx = Math.floor(cx(shoulder)) - 1;
  for (let y = faceCy + 4; y < shoulder; y++) {
    plot(g, nx, y, '3');
    plot(g, nx + 1, y, (y + beat) % 2 === 0 ? '2' : '.');
    plot(g, nx + 2, y, '2');
  }

  arms(g, pose, facing, beat, cx, shoulder);

  // The collar's ruby thread (over the arms: the hand at her collar in the retreat stays under it), and its cut end hanging out of the weave, frayed in two.
  const cy0 = shoulder;
  const cxL = Math.floor(cx(cy0)) - 4;
  for (let x = cxL; x <= cxL + 8; x++) plot(g, x, cy0, x < cxL + 4 ? 'd' : 'c');
  const cutX = cxL + 7;
  const sway = pose === 'walk' ? (beat === 1 || beat === 2 ? 1 : 0) : pose === 'flee' ? beat : 0;
  plot(g, cutX + 1, cy0 + 1, 'c');
  plot(g, cutX + 1, cy0 + 2, 'c');
  plot(g, cutX + 2, cy0 + 3, 'b');
  plot(g, cutX + 2 + sway, cy0 + 4, 'c');
  plot(g, cutX + 1 + sway, cy0 + 5, 'b');
  plot(g, cutX + 3 + sway, cy0 + 5, 'b');
  plot(g, cutX + 4 + sway, cy0 + 6, 'a');

  // The hem fringe: loose threads hanging from the hem, swaying with the glide; trailing long
  // and sideways in the retreat.
  const hw = s.hem;
  for (let x = Math.ceil(CX - hw) + 1; x <= Math.floor(CX + hw) - 1; x += 2) {
    const len = 1 + ((x * 5) % 3 === 0 ? 1 : 0) + (dim ? 1 : 0);
    const sw = pose === 'walk' ? (beat < 2 ? -1 : 1) * (x < CX ? 1 : 0) : dim ? -1 - beat : 0;
    for (let k = 0; k < len; k++) {
      plot(g, x + (k === len - 1 ? sw : 0), hemY + 1 + k, k === 0 ? '7' : '3');
    }
  }
  outlineOutside(g);
  return rows(g);
}

/** Her arms (sleeves, woven forearms, hands as knots of light) for each pose. */
function arms(
  g: CharGrid,
  pose: WitchPose,
  facing: Facing,
  beat: number,
  cx: (y: number) => number,
  shoulder: number,
): void {
  const c = Math.floor(cx(shoulder));
  const sleeve = (x0: number, y0: number, x1: number, y1: number): void => {
    // A 2 px emerald sleeve, lit edge up.
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      const x = Math.round(x0 + ((x1 - x0) * k) / n);
      const y = Math.round(y0 + ((y1 - y0) * k) / n);
      plot(g, x, y, '7');
      plot(g, x, y + 1, '5');
    }
  };
  const fore = (x0: number, y0: number, x1: number, y1: number): void => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 0; k <= n; k++) {
      plot(g, Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), '3');
    }
  };
  switch (pose) {
    case 'walk': {
      // Arms at her sides in the sleeves, hands just showing, swinging a pixel with the glide.
      const sw = beat === 1 || beat === 2 ? 1 : 0;
      sleeve(c - 7, shoulder + 1, c - 9, shoulder + 10);
      sleeve(c + 7, shoulder + 1, c + 9, shoulder + 10);
      stamp(g, c - 9 - sw, shoulder + 12, ['3', '+']);
      stamp(g, c + 9 + sw, shoulder + 12, ['3', '+']);
      return;
    }
    case 'tell': {
      // Both arms raised wide, light gathering in the palms (bigger on the second beat).
      for (const side of [-1, 1]) {
        const ex = c + side * 10 + (side < 0 ? 0 : 1);
        sleeve(c + side * 7 + (side < 0 ? 0 : 1), shoulder + 1, ex, shoulder - 4);
        fore(ex + side, shoulder - 5, ex + side * 3, shoulder - 10);
        const hx = ex + side * 3;
        const hy = shoulder - 11;
        if (beat === 0) stamp(g, hx - 1, hy - 1, ['.+.', '+*+', '.+.']);
        else stamp(g, hx - 2, hy - 2, ['..+..', '.+*+.', '+***+', '.+*+.', '..+..']);
      }
      return;
    }
    case 'blink': {
      // Swept back behind her (both facings step to the right; SW and NW are mirrors).
      const back = -1;
      sleeve(c + back * 6, shoulder + 1, c + back * 10, shoulder + 6);
      fore(c + back * 11, shoulder + 7, c + back * 13, shoulder + 11);
      plot(g, c + back * 13, shoulder + 12, '+');
      sleeve(c - back * 6, shoulder + 2, c + back * 3, shoulder + 9);
      plot(g, c + back * 4, shoulder + 10, '+');
      return;
    }
    case 'puff': {
      // Crossed over her heart.
      sleeve(c - 7, shoulder + 1, c + 3, shoulder + 6);
      sleeve(c + 7, shoulder + 1, c - 3, shoulder + 6);
      plot(g, c + 4, shoulder + 5, '3');
      plot(g, c - 4, shoulder + 5, '3');
      return;
    }
    case 'flee': {
      // One hand at the cut thread on her collar; the other hanging slack.
      sleeve(c + 6, shoulder + 1, c + 6, shoulder + 7);
      fore(c + 6, shoulder + 7, c + 4, shoulder + 2);
      plot(g, c + 4, shoulder + 1, '+');
      sleeve(c - 6, shoulder + 1, c - 8, shoulder + 12);
      plot(g, c - 8, shoulder + 13, '2');
      return;
    }
  }
}

const POSES: readonly [WitchPose, number][] = [
  ['walk', 4],
  ['tell', 2],
  ['blink', 1],
  ['puff', 1],
  ['flee', 2],
];

const frames: Record<string, string[]> = {};
const anims: Record<
  string,
  { frames: string[]; fps: number; loop?: boolean } | { mirrorOf: string }
> = {};
for (const [pose, n] of POSES) {
  for (const f of ['se', 'ne'] as const) {
    const names: string[] = [];
    for (let k = 0; k < n; k++) {
      const name = `${pose}_${f}_${k}`;
      frames[name] = witch(pose, f, k);
      names.push(name);
    }
    anims[`${pose}_${f}`] = { frames: names, fps: pose === 'flee' ? 3 : 4 };
    anims[`${pose}_${f === 'se' ? 'sw' : 'nw'}`] = { mirrorOf: `${pose}_${f}` };
  }
}

export const enemyGlassWitch = defineSprite({
  id: 'enemy.glass_witch',
  size: { w: W, h: H },
  // Between her feet, two rows under the hem: she hovers.
  anchor: { x: 16, y: 46 },
  palette: 'aelari',
  // The outline is the weave's own (lattice.ts `outlineOutside`), so the gaps stay see-through.
  outline: 'none',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames,
  anims,
});
