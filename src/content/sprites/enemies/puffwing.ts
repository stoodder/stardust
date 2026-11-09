// Puffwing (`puffwing`, design/enemies.md § 5.1): Act I's first flyer, a fluffy Skitterkin glider.
// A small round body slung between two big dandelion-fluff wings, so its silhouette is wide and
// winged where every ground Skitterkin is round. The fluff is cream lit to white, shaded pink, the
// brightest mass on the map's air layer, which keeps a flock readable over any ground. Its little
// feet dangle. Render draws it 12 px up over a ground shadow (the `flying` tell's body cue; tech-
// spec § Sprite anchoring); the sprite itself only flaps: wings up, level, down, level.
import { defineSprite } from '../defineSprite.ts';
import { DEATH_ANIM, deathFrames } from './death.ts';
import { plot, type CharGrid } from '../helpers.ts';
import { BIG_EYE, finish, skitterBody } from './skitter.ts';

const W = 24;
const H = 15;
const CX = 12;
const CY = 8;

/** The wing stroke: 0 up, 1 level, 2 down (3 is level again on the way up). */
type Stroke = 0 | 1 | 2;

/** One fluff wing centered at (cx, cy): lit cream on top, pink underneath, a soft edge. */
function wing(g: CharGrid, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      // Fluff: rim pixels drop out in a pattern so the wing reads soft.
      if (d > 0.8 && (x * 5 + y * 3) % 4 === 0) continue;
      plot(g, x, y, dy > 0.35 ? 'G' : dy < -0.3 && dx < 0.3 ? 'w' : 'F');
    }
  }
}

/** Each stroke's wings: height off the body, radii, and how far out from the body's center. */
const WINGS: Readonly<Record<Stroke, { dy: number; rx: number; ry: number; spread: number }>> = {
  0: { dy: -4, rx: 3.2, ry: 3.6, spread: 6.5 },
  1: { dy: -1, rx: 4.6, ry: 2.6, spread: 7.5 },
  2: { dy: 2, rx: 4, ry: 1.8, spread: 7 },
};

function puffwing(facing: 'se' | 'ne', stroke: Stroke): string[] {
  // The body rides up as the wings beat down, and sinks as they lift.
  const lift = stroke === 2 ? -1 : stroke === 0 ? 1 : 0;
  const by = CY + lift;
  const g = skitterBody({ w: W, h: H, cx: CX, cy: by, rx: 5, ry: 4.4, facing, belly: 0.35 });
  // Wings: raised and tall on the upstroke, spread wide level, swept down and thin.
  const { dy, rx, ry, spread } = WINGS[stroke];
  const wy = by + dy;
  // The far wing first (it tucks behind the body), then the near one over the shoulder.
  wing(g, CX + spread, wy, rx, ry);
  wing(g, CX - spread, wy, rx, ry);
  // A fluff collar where each wing roots into the body.
  for (const s of [-1, 1]) {
    plot(g, CX + s * 4 - (s < 0 ? 1 : 0), by - 1, 'F');
    plot(g, CX + s * 4 - (s < 0 ? 1 : 0), by, 'G');
  }
  const feet = stroke === 2 ? ['1..1', '0..0'] : ['.1..1', '.0..0'];
  if (facing === 'se') {
    return finish(g, [
      [CX - 3, by + 4, feet],
      // A curl of tuft, and the big eyes of something that has never once worried.
      [CX - 1, by - 6, ['.dc', 'cdb']],
      [CX, by - 2, BIG_EYE],
      [CX + 3, by - 2, BIG_EYE],
      [CX + 2, by + 1, ['k']],
      [CX - 3, by - 1, ['+']],
    ]);
  }
  return finish(g, [
    [CX - 3, by + 4, feet],
    [CX - 1, by - 6, ['.dc', 'cdb']],
    // The shimmer along the back, between the wing roots.
    [CX - 2, by - 2, ['+.+', '.*.', '+.+']],
  ]);
}

const FLAP = { se: [0, 1, 2, 1], ne: [0, 1, 2, 1] } as const;

export const enemyPuffwing = defineSprite({
  id: 'enemy.puffwing',
  size: { w: W, h: H },
  anchor: { x: CX, y: H - 1 },
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  // The fluff: cream lit to white (`w`), shaded pink underneath.
  legend: { F: 'gold.4', G: 'pink.4' },
  frames: {
    walk_se_0: puffwing('se', FLAP.se[0]),
    walk_se_1: puffwing('se', FLAP.se[1]),
    walk_se_2: puffwing('se', FLAP.se[2]),
    walk_ne_0: puffwing('ne', FLAP.ne[0]),
    walk_ne_1: puffwing('ne', FLAP.ne[1]),
    walk_ne_2: puffwing('ne', FLAP.ne[2]),
    ...deathFrames(puffwing('se', FLAP.se[0]), { x: CX, y: H - 1 }),
  },
  anims: {
    // Up, level, down, level: a lazy flap.
    walk_se: { frames: ['walk_se_0', 'walk_se_1', 'walk_se_2', 'walk_se_1'], fps: 8 },
    walk_sw: { mirrorOf: 'walk_se' },
    walk_ne: { frames: ['walk_ne_0', 'walk_ne_1', 'walk_ne_2', 'walk_ne_1'], fps: 8 },
    walk_nw: { mirrorOf: 'walk_ne' },
    death: DEATH_ANIM,
  },
});
