// The memorial wreck (`prop.memorial_wreck`; design/maps.md § 3 *Memorial wreckage*, art-direction
// §6 *Memorial wrecks*; finale.md § FIN): the turret Bricks named `{name}` in A3M3, standing wrecked
// on the ridge above Okonkwo's Gap on the finale route. It is whatever tower class carried the tag
// (the save's `memorialTower`), so every class has a frame, named by its tower id, and each is
// **wrecked by code** from that class's own T1 art, never drawn by hand, so a new tower class gets
// its wreck for free (the test holds every class to one):
// - its T1 base, its head on the mount **snapped** along a jagged line (the top part gone, rubble
//   at the foot) and the stump slumped back, so the silhouette still says which tower it was;
// - every colour **drained** to a short dead ramp (`deadChar`): greys by luminance for the
//   neutrals, two or three dull steps for each faction hue (Everglow teal, Aelari blue, Vrell brass
//   and patina, the warrens' earth and moss), no light left anywhere: its lamps, lanterns and
//   threads out, its eyes and glints gone (a Skitterkin home's resident never shows in it);
// - a crack down its lit face and soot near its foot.
// Nothing violet grows on it: violet is the forgotten (art-direction §1 principle 6), and this one
// is remembered. The one warm thing on it is **the tag** Bricks hung on it, a small white plate on
// a wire, rimmed in gold (the palette's emissives, so it keeps a faint glow in the dark); render's
// tooltip shows the `{name}` on it (T831). `memorialWreckFrame` names the frame for a save.
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { STANDARD_LEGEND } from '../legend.ts';
import type { FrameDef, GridFrame, SpriteDef } from '../types.ts';
import { patchList } from '../validate.ts';
import { PALETTES } from '../../palettes/index.ts';
import { rgbOf, type ColorName } from '../../palettes/master.ts';
import { luminance } from '../../palettes/color.ts';
import { BASE_ANCHOR, BASE_MOUNT } from '../towers/base.ts';
import { towerBloom, towerBloomHead } from '../towers/bloom.ts';
import { towerChoir, towerChoirHead } from '../towers/choir.ts';
import { towerCrane, towerCraneHead } from '../towers/crane.ts';
import { towerBurrow, towerBurrowHead } from '../towers/den.ts';
import { towerGloop, towerGloopHead } from '../towers/gloop.ts';
import { towerHarpoon, towerHarpoonHead } from '../towers/harpoon.ts';
import { towerLantern, towerLanternHead } from '../towers/lantern.ts';
import { towerLookout, towerLookoutHead } from '../towers/lookout.ts';
import { towerMindspike, towerMindspikeHead } from '../towers/mindspike.ts';
import { towerPrism, towerPrismHead } from '../towers/prism.ts';
import { towerRivet, towerRivetHead } from '../towers/rivet.ts';
import { towerSkyhook, towerSkyhookHead } from '../towers/skyhook.ts';
import { towerSprinkler, towerSprinklerHead } from '../towers/sprinkler.ts';
import { towerSproing, towerSproingHead } from '../towers/sproing.ts';
import { towerThumper, towerThumperHead } from '../towers/thumper.ts';
import { towerZapcoil, towerZapcoilHead } from '../towers/zapcoil.ts';

/**
 * A tower class with a wreck: every `TowerId` (the test holds the two lists equal; the type is
 * spelled out here, not taken from the tower registry, so the sprite registry doesn't import it).
 */
export type MemorialClass =
  | 'rivet'
  | 'thumper'
  | 'sprinkler'
  | 'skyhook'
  | 'zapcoil'
  | 'lookout'
  | 'harpoon'
  | 'crane'
  | 'prism'
  | 'mindspike'
  | 'lantern'
  | 'burrow'
  | 'choir'
  | 'bloom'
  | 'gloop'
  | 'sproing';

/** A tower's base and head sprites: the art its wreck is made from. */
interface WreckSource {
  readonly base: SpriteDef;
  readonly head: SpriteDef;
}

/** Each tower class's base and head sprites. */
export const MEMORIAL_SOURCES: Readonly<Record<MemorialClass, WreckSource>> = {
  rivet: { base: towerRivet, head: towerRivetHead },
  thumper: { base: towerThumper, head: towerThumperHead },
  sprinkler: { base: towerSprinkler, head: towerSprinklerHead },
  skyhook: { base: towerSkyhook, head: towerSkyhookHead },
  zapcoil: { base: towerZapcoil, head: towerZapcoilHead },
  lookout: { base: towerLookout, head: towerLookoutHead },
  harpoon: { base: towerHarpoon, head: towerHarpoonHead },
  crane: { base: towerCrane, head: towerCraneHead },
  prism: { base: towerPrism, head: towerPrismHead },
  mindspike: { base: towerMindspike, head: towerMindspikeHead },
  lantern: { base: towerLantern, head: towerLanternHead },
  burrow: { base: towerBurrow, head: towerBurrowHead },
  choir: { base: towerChoir, head: towerChoirHead },
  bloom: { base: towerBloom, head: towerBloomHead },
  gloop: { base: towerGloop, head: towerGloopHead },
  sproing: { base: towerSproing, head: towerSproingHead },
};

/** The class whose wreck stands when the save names none (Bricks's first turret was a Rivet). */
export const MEMORIAL_FALLBACK: MemorialClass = 'rivet';

function isMemorialClass(id: string): id is MemorialClass {
  return Object.hasOwn(MEMORIAL_SOURCES, id);
}

/** The memorial wreck's frame for the save's `memorialTower` (null, absent or unknown: the fallback). */
export function memorialWreckFrame(tower: string | null | undefined): MemorialClass {
  return tower !== null && tower !== undefined && isMemorialClass(tower) ? tower : MEMORIAL_FALLBACK;
}

const W = 40;
const H = 36;
/** Where the tower's base canvas sits in the wreck's (its anchor lands on the wreck's anchor). */
const OX = 5;
const OY = 2;
const ANCHOR = { x: BASE_ANCHOR.x + OX, y: BASE_ANCHOR.y + OY };
/** The share of the head's height that snapped off and is gone. */
const SNAP = 0.28;
/** How far the stump slumps back toward the lit side, px per px of height above the mount. */
const SLUMP = 0.16;

// The dead ramp: every colour of the source drains to one of these.
const NEUTRAL = ['A', 'B', 'C', 'D', 'E', 'F'] as const; // ink.1 … steel.3, by luminance
const NEUTRAL_LUM = [0.012, 0.03, 0.06, 0.14, 0.3] as const;
/** A faction hue's dull steps, darkest first, by the source step (0–4). */
const HUE_STEPS: Readonly<Record<string, readonly string[]>> = {
  teal: ['G', 'G', 'G', 'H', 'H'],
  blue: ['I', 'I', 'I', 'J', 'J'],
  violet: ['I', 'I', 'I', 'J', 'J'],
  brass: ['K', 'K', 'K', 'L', 'L'],
  gold: ['K', 'K', 'L', 'L', 'L'],
  orange: ['M', 'M', 'M', 'N', 'N'],
  red: ['M', 'M', 'M', 'N', 'N'],
  // Aelari glass (the Prism's and the Mindspike's crystal) goes grey-blue, never warm.
  pink: ['I', 'I', 'I', 'J', 'J'],
  patina: ['O', 'O', 'O', 'P', 'P'],
  green: ['Q', 'Q', 'Q', 'R', 'R'],
  // The warrens' earth, and a Skitterkin's coral body, go to cold turned earth.
  'skin.a': ['S', 'S', 'T', 'U', 'U'],
  'skin.b': ['S', 'S', 'T', 'U', 'U'],
  'skin.c': ['S', 'S', 'T', 'U', 'U'],
  coral: ['S', 'S', 'T', 'T', 'U'],
};

/** The dead colour for a master colour (a neutral by luminance, else its hue's dull step). */
export function deadChar(color: ColorName): string {
  const dot = color.lastIndexOf('.');
  const family = dot < 0 ? color : color.slice(0, dot);
  const step = Number(color.slice(dot + 1));
  const steps = HUE_STEPS[family];
  if (steps !== undefined && Number.isInteger(step)) return steps[step] ?? 'A';
  const l = luminance(rgbOf(color));
  let k = 0;
  while (k < NEUTRAL_LUM.length && l >= (NEUTRAL_LUM[k] ?? 1)) k++;
  return NEUTRAL[k] ?? 'F';
}

function isGrid(f: FrameDef): f is GridFrame {
  return Array.isArray(f);
}

/** A frame of `def` resolved to a full grid (patches applied, mirrors flipped). */
function resolve(def: SpriteDef, name: string): string[][] {
  const f = def.frames[name];
  if (f === undefined) throw new Error(`${def.id}: no frame '${name}'`);
  if (isGrid(f)) return f.map((r) => [...r]);
  if ('mirrorOf' in f) return resolve(def, f.mirrorOf).map((r) => r.reverse());
  const g = resolve(def, f.from);
  for (const p of patchList(f)) {
    p.rows.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        const line = g[p.y + dy];
        if (ch !== ' ' && line !== undefined) line[p.x + dx] = ch;
      });
    });
  }
  return g;
}

/** A source pixel's dead char ('.' clear, '_' its ground shadow kept). */
function drained(def: SpriteDef, ch: string): string {
  if (ch === '.' || ch === '_') return ch;
  // Eyes and glints go dark: nothing looks out of a memorial.
  if (ch === 'k' || ch === 'w') return 'A';
  const slot = STANDARD_LEGEND[ch];
  const color =
    slot !== undefined
      ? PALETTES[def.palette][slot]
      : (def.legend as Readonly<Record<string, ColorName>> | undefined)?.[ch];
  return color === undefined ? 'A' : deadChar(color);
}

/** The head's first frame (its T1 idle facing), and the row its art starts on. */
function headArt(head: SpriteDef): { g: string[][]; top: number } {
  const first = Object.keys(head.frames)[0];
  if (first === undefined) throw new Error(`${head.id}: no frames`);
  const g = resolve(head, first);
  const top = g.findIndex((r) => r.some((c) => c !== '.'));
  return { g, top: Math.max(0, top) };
}

function wreck(tower: MemorialClass): string[] {
  const { base, head } = MEMORIAL_SOURCES[tower];
  const g: CharGrid = grid(W, H);
  const seed = [...tower].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) % 997;
  // The T1 base, drained.
  resolve(base, 't1').forEach((r, y) =>
    r.forEach((ch, x) => {
      const d = drained(base, ch);
      if (d !== '.') plot(g, x + OX, y + OY, d);
    }),
  );
  // Soot near its foot, and a crack down its lit face.
  for (let y = ANCHOR.y - 6; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const c = g[y]?.[x] ?? '.';
      if (c === '.' || c === '_') continue;
      const r = hash01(x, y, seed);
      if (r < 0.06) plot(g, x, y, 'X');
      else if (r < 0.14) plot(g, x, y, 'Y');
    }
  }
  let cx = ANCHOR.x - 7;
  for (let y = ANCHOR.y - 6; y <= ANCHOR.y + 4; y++) {
    if ((g[y]?.[cx] ?? '.') !== '.') plot(g, cx, y, 'A');
    if (hash01(y, 3, seed) < 0.45) cx += hash01(y, 5, seed) < 0.5 ? -1 : 1;
  }
  // The head, snapped along a jagged line and slumped back on its mount.
  const { g: hg, top } = headArt(head);
  const ha = head.anchor;
  const mx = BASE_MOUNT.x + OX;
  const my = BASE_MOUNT.y + OY;
  const snapY = top + Math.round((ha.y - top) * SNAP);
  const rubble: string[] = [];
  hg.forEach((r, y) =>
    r.forEach((ch, x) => {
      const d = drained(head, ch);
      if (d === '.' || d === '_') return;
      if (y < snapY + Math.floor(hash01(x, 1, seed) * 3)) {
        rubble.push(d);
        return;
      }
      const lean = Math.round((ha.y - y) * SLUMP);
      plot(g, x - ha.x + mx - lean, y - ha.y + my, d);
    }),
  );
  // What snapped off lies in pieces at its foot: lumps of its own colours.
  const lumpOf = (i: number): string => rubble[Math.floor(hash01(i, 9, seed) * rubble.length)] ?? 'D';
  for (const [x, y, w] of [
    [ANCHOR.x + 9, ANCHOR.y + 3, 3],
    [ANCHOR.x + 12, ANCHOR.y + 1, 2],
    [ANCHOR.x - 13, ANCHOR.y + 2, 3],
  ] as const) {
    const c = lumpOf(x + y);
    for (let k = 0; k < w; k++) {
      plot(g, x + k, y, c);
      if (k > 0) plot(g, x + k, y - 1, lumpOf(x + k));
    }
    plot(g, x, y + 1, '_');
    plot(g, x + w - 1, y + 1, '_');
  }
  // The tag on a wire round the plinth's lit face: a white plate rimmed in gold, a stencilled name.
  const tx = ANCHOR.x - 9;
  const ty = ANCHOR.y - 2;
  plot(g, tx + 1, ty - 1, 'E');
  plot(g, tx + 3, ty - 2, 'E');
  // prettier-ignore
  stamp(g, tx, ty, [
    '*+++',
    '+ZA+',
    '++++',
  ]);
  return rows(g);
}

const FRAMES: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  (Object.keys(MEMORIAL_SOURCES) as MemorialClass[]).map((t) => [t, wreck(t)]),
);

export const propMemorialWreck = defineSprite({
  id: 'prop.memorial_wreck',
  size: { w: W, h: H },
  anchor: ANCHOR,
  // The skitterkin palette for its emissives (gold.3 / gold.4: the tag's rim); everything else is
  // custom legend, the dead ramp, so it holds in every act and every light.
  palette: 'skitterkin.ally',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    A: 'ink.1',
    B: 'ink.2',
    C: 'steel.0',
    D: 'steel.1',
    E: 'steel.2',
    F: 'steel.3',
    G: 'teal.0',
    H: 'teal.1',
    I: 'blue.0',
    J: 'blue.1',
    K: 'brass.0',
    L: 'brass.1',
    M: 'orange.0',
    N: 'orange.1',
    O: 'patina.0',
    P: 'patina.1',
    Q: 'green.0',
    R: 'green.1',
    S: 'skin.b.0',
    T: 'skin.b.1',
    U: 'skin.b.2',
    X: 'grime.0',
    Y: 'grime.1',
    Z: 'white.0',
  },
  frames: FRAMES,
});
