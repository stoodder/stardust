// Act II portraits (T441; art-direction § Portrait roster, characters.md § Ves'thara and §
// Pebble): Ves'thara, Pebble, and Bricks's `pebble` variant. Each has the frame contract the
// dialogue panel asks for, and each keeps its tells: Ves'thara woven (real holes, colored outline,
// no skin), her cut thread, her knots of light; Pebble the Peeker's seedling, bare-headed, her
// `singing` hum lighting the shimmer; Bricks with Pebble in his pocket in every expression.
import { describe, expect, it } from 'vitest';
import { SPEAKER_DEFS } from '../../dialogue/speakers.ts';
import { EXPRESSION_EXTRAS, type SpeakerId } from '../../dialogue/types.ts';
import { contrastRatio, luminance } from '../../palettes/color.ts';
import { PALETTES } from '../../palettes/index.ts';
import { rgbOf } from '../../palettes/master.ts';
import { SPRITES } from '../index.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { portraitBricks } from './bricks.ts';
import { portraitPebble } from './pebble.ts';
import {
  BASE_EXPRESSIONS,
  portraitFrame,
  portraitTalkAnim,
  PORTRAIT_SIZE,
  TALK_FPS,
} from './portrait.ts';
import { portraitVesthara, VESTHARA_CUT_THREAD } from './vesthara.ts';

function isPatch(fd: FrameDef): fd is PatchFrame {
  return !Array.isArray(fd) && 'from' in fd;
}

/** A frame's full grid: grids as they are, patches applied over their source. */
function resolve(def: SpriteDef, name: string): string[] {
  const fd = def.frames[name];
  if (fd === undefined) throw new Error(`${def.id}: no frame ${name}`);
  if (Array.isArray(fd)) return [...(fd as readonly string[])];
  if (!isPatch(fd)) throw new Error(`${def.id}: ${name} is a mirror`);
  const out = resolve(def, fd.from).map((r) => r.split(''));
  for (const p of Array.isArray(fd.patch) ? fd.patch : [fd.patch]) {
    p.rows.forEach((r: string, dy: number) => {
      for (let dx = 0; dx < r.length; dx++) {
        const ch = r.charAt(dx);
        const row = out[p.y + dy];
        if (ch !== ' ' && row !== undefined) row[p.x + dx] = ch;
      }
    });
  }
  return out.map((r) => r.join(''));
}

/** The master colors a frame uses, through the sprite's custom legend (slot chars as-is). */
function colorsOf(def: SpriteDef, name: string): string[] {
  const legend: Readonly<Record<string, string>> = def.legend ?? {};
  return resolve(def, name)
    .join('')
    .split('')
    .map((ch) => legend[ch] ?? ch);
}

const at = (rows: readonly string[], x: number, y: number): string => rows[y]?.charAt(x) ?? '.';

/** How many pixels of a frame are inner light: the white core and the teal glow. */
const lit = (cs: readonly string[]): number => cs.filter((c) => c === '*' || c === '+').length;

/** The row where Pebble's seedling starts (higher is perkier). */
const sproutTop = (e: string): number =>
  resolve(portraitPebble, e).findIndex((r) => /[GHI]/.test(r));

/** The open part of Pebble's mouth (its dark inside and tongue). */
const mouthArea = (rows: readonly string[]): number =>
  rows
    .slice(32, 38)
    .map((r) => r.slice(20, 29))
    .join('')
    .replace(/[^kP]/g, '').length;

/** Pebble's shimmer sparkles in a frame. */
const sparkle = (e: string): number =>
  colorsOf(portraitPebble, e).filter(
    (c) => c === 'pink.3' || c === 'pink.4' || c === '*' || c === '+',
  ).length;

/** Bricks's head and shoulders, clear of the pocket corner. */
const bricksFace = (rows: readonly string[]): string =>
  rows
    .slice(0, 30)
    .map((r) => r.slice(0, 30))
    .join('');

describe('Act II portraits: the frame contract', () => {
  it.each([portraitVesthara, portraitPebble].map((d) => [d.id, d] as const))(
    '%s: 48×48 with every base expression as a patch over neutral, each with a talking mouth',
    (_id, def) => {
      expect(def.size).toEqual({ w: PORTRAIT_SIZE, h: PORTRAIT_SIZE });
      expect(Array.isArray(def.frames['neutral'])).toBe(true);
      const faces = new Set<string>();
      for (const e of BASE_EXPRESSIONS) {
        const closed = resolve(def, portraitFrame(e));
        expect(closed).toHaveLength(PORTRAIT_SIZE);
        expect(closed.every((r) => r.length === PORTRAIT_SIZE)).toBe(true);
        expect(resolve(def, portraitFrame(e, { mouth: 'talk' })), `${e}_talk`).not.toEqual(closed);
        expect(def.anims?.[portraitTalkAnim(e)]).toEqual({
          frames: [portraitFrame(e), portraitFrame(e, { mouth: 'talk' })],
          fps: TALK_FPS,
        });
        if (e !== 'neutral') {
          const fd = def.frames[e];
          expect(fd !== undefined && isPatch(fd) && fd.from === 'neutral', e).toBe(true);
        }
        faces.add(closed.join('\n'));
      }
      expect(faces.size, 'five different faces').toBe(BASE_EXPRESSIONS.length);
    },
  );

  it('registers both portraits under the ids speakers.ts names', () => {
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    for (const id of ['vesthara', 'pebble'] as const satisfies readonly SpeakerId[]) {
      const portrait = SPEAKER_DEFS[id].portrait;
      expect(portrait).toBe(`portrait.${id}`);
      expect(ids.has(portrait ?? ''), portrait ?? id).toBe(true);
    }
  });

  it('draws every expression extra the dialogue types allow for these speakers', () => {
    for (const e of Object.keys(EXPRESSION_EXTRAS.pebble)) {
      expect(portraitPebble.frames[portraitFrame(e)], e).toBeDefined();
      expect(portraitPebble.frames[portraitFrame(e, { mouth: 'talk' })], `${e}_talk`).toBeDefined();
    }
    expect('vesthara' in EXPRESSION_EXTRAS).toBe(false);
  });
});

describe("Ves'thara: woven lumenglass, lit from inside", () => {
  it('wears the Aelari palette (its colored outline) and no human skin anywhere', () => {
    expect(portraitVesthara.palette).toBe('aelari');
    for (const e of BASE_EXPRESSIONS) {
      const used = new Set(colorsOf(portraitVesthara, e));
      expect(
        [...used].filter((c) => c.startsWith('skin.')),
        e,
      ).toEqual([]);
      // Sapphire (p), emerald (s), and ruby knots (a) all show, inside a hand outline.
      for (const slot of ['3', '8', 'd', 'x']) expect(used, `${e}: ${slot}`).toContain(slot);
    }
  });

  it('is an open lattice: real see-through gaps inside her silhouette', () => {
    const rows = resolve(portraitVesthara, 'neutral');
    let holes = 0;
    rows.forEach((r, y) => {
      for (let x = 1; x < r.length - 1; x++) {
        if (r.charAt(x) !== '.') continue;
        // A gap with the weave on all four sides is a hole in the lattice, not the background.
        const ring = [
          at(rows, x - 1, y),
          at(rows, x + 1, y),
          at(rows, x, y - 1),
          at(rows, x, y + 1),
        ];
        const left = r.slice(0, x).replace(/\./g, '').length > 0;
        const right = r.slice(x + 1).replace(/\./g, '').length > 0;
        if (left && right && ring.filter((c) => c !== '.').length >= 2) holes++;
      }
    });
    expect(holes).toBeGreaterThan(40);
  });

  it('keeps the cut thread hanging from her collar in every expression', () => {
    for (const e of BASE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const rows = resolve(portraitVesthara, portraitFrame(e, { mouth }));
        for (const [x, y] of VESTHARA_CUT_THREAD)
          expect(at(rows, x, y), `${e} ${x},${y}`).toBe('d');
      }
    }
  });

  it('has eyes like bright knots of light, dimmed a step only in grief', () => {
    for (const e of BASE_EXPRESSIONS) {
      const eyes = resolve(portraitVesthara, e).slice(14, 23).join('');
      // The white core (`*`) burns in every face but `sad`, whose knots dim to teal.
      expect(eyes.includes('*'), e).toBe(e !== 'sad');
      expect(eyes, e).toMatch(/\+/);
    }
  });

  it('reads her expressions: dark thread brows on a face lit a step brighter (D134)', () => {
    const p = PALETTES.aelari;
    const lum = (ch: '0' | '1' | '4'): number =>
      luminance(rgbOf(p[ch === '0' ? 'p0' : ch === '1' ? 'p1' : 'p4']));
    const brows = new Set<string>();
    for (const e of BASE_EXPRESSIONS) {
      const rows = resolve(portraitVesthara, e);
      // The face's heart is her brightest blue, and her brows (the stamp's top rows, x 17–30)
      // are dark threads across it, ≥ 4:1 against it.
      expect(at(rows, 23, 20), e).toBe('4');
      const brow = rows
        .slice(14, 17)
        .map((r) => r.slice(17, 31))
        .join('|');
      expect(brow.replace(/[^1]/g, '').length, e).toBeGreaterThanOrEqual(6);
      // No bright thread brows (teal.4) left to wash into the lit face.
      expect(brow, e).not.toMatch(/9/);
      brows.add(brow);
    }
    expect(contrastRatio(lum('4'), lum('1'))).toBeGreaterThanOrEqual(4);
    // Five faces, five brows.
    expect(brows.size).toBe(BASE_EXPRESSIONS.length);
  });

  it('opens her mouth on her inner light when she talks', () => {
    for (const e of BASE_EXPRESSIONS) {
      const talk = colorsOf(portraitVesthara, portraitFrame(e, { mouth: 'talk' }));
      const rest = colorsOf(portraitVesthara, e);
      expect(lit(talk), e).toBeGreaterThan(lit(rest));
    }
  });
});

describe('Pebble: the Peeker, bare-headed', () => {
  const expressions = [...BASE_EXPRESSIONS, 'singing'];

  it('wears the allied Skitterkin palette and the Peeker’s green seedling in every expression', () => {
    expect(portraitPebble.palette).toBe('skitterkin.ally');
    for (const e of expressions) {
      const used = new Set(colorsOf(portraitPebble, e));
      // Coral fuzz (p), the butter belly (s), and the seedling's greens.
      for (const c of ['3', '8', 'green.3', 'green.4']) expect(used, `${e}: ${c}`).toContain(c);
      // Bare-headed at A2M3: nothing sits on her crown above the seedling's stem (no bottle cap).
      const crown = resolve(portraitPebble, e).slice(0, 12).join('');
      expect(crown.replace(/[.GHIx]/g, ''), e).toBe('');
    }
  });

  it('perks the seedling up when happy and droops it when worried or sad', () => {
    expect(sproutTop('happy')).toBeLessThan(sproutTop('neutral'));
    expect(sproutTop('worried')).toBeGreaterThan(sproutTop('neutral'));
    expect(sproutTop('sad')).toBeGreaterThan(sproutTop('neutral'));
  });

  it('sings with her eyes closed and a round mouth, small at rest and large on the hum', () => {
    const fd = portraitPebble.frames['singing'];
    expect(fd !== undefined && isPatch(fd) && fd.from === 'neutral').toBe(true);
    const rest = resolve(portraitPebble, 'singing');
    const hum = resolve(portraitPebble, 'singing_talk');
    expect(mouthArea(rest)).toBeGreaterThan(0);
    expect(mouthArea(hum)).toBeGreaterThan(mouthArea(rest));
    // No glints: her eyes are shut.
    expect(rest.slice(20, 32).join('')).not.toMatch(/w/);
    expect(portraitPebble.anims?.[portraitTalkAnim('singing')]).toEqual({
      frames: ['singing', 'singing_talk'],
      fps: TALK_FPS,
    });
  });

  it('lights the shimmer on her back while she sings', () => {
    expect(sparkle('singing')).toBeGreaterThan(sparkle('neutral') * 2);
    expect(sparkle('neutral')).toBeGreaterThan(0);
  });
});

describe('Bricks `pebble`: Pebble in his breast pocket', () => {
  it('has every expression and talking mouth, each with Pebble over the pocket flap', () => {
    for (const e of BASE_EXPRESSIONS) {
      const name = portraitFrame(e, { variant: 'pebble' });
      const withPebble = resolve(portraitBricks, name);
      expect(withPebble).not.toEqual(resolve(portraitBricks, e));
      expect(
        portraitBricks.frames[portraitFrame(e, { variant: 'pebble', mouth: 'talk' })],
      ).toBeDefined();
      const used = new Set(colorsOf(portraitBricks, name));
      for (const c of ['coral.3', 'green.3', 'green.4']) expect(used, `${e}: ${c}`).toContain(c);
      // His face is the base frame's: Pebble changes only the pocket corner.
      expect(bricksFace(withPebble)).toBe(bricksFace(resolve(portraitBricks, e)));
    }
  });

  it('is the variant speakers.ts picks for Bricks once Pebble rides with him', () => {
    expect(SPEAKER_DEFS.bricks.variants.map((v) => v.variant)).toContain('pebble');
  });
});
