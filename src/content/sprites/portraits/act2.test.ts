// Act II portraits (T441, T541; art-direction § Portrait roster, characters.md § Ves'thara, §
// Pebble and § Kip): Ves'thara, Pebble, and Bricks's `pebble` variant. Each has the frame contract
// the dialogue panel asks for, and each keeps its tells: Ves'thara woven (real holes, colored
// outline, no skin), her cut thread, her knots of light; Pebble the Peeker's seedling, bare-headed,
// her `singing` hum lighting the shimmer; Bricks with Pebble in his pocket in every expression.
// M5's variants: Kip's `act2` coat, Pebble's `cap`, and Ves'thara's `touched`, `touched_deep` and
// `dawn`, each keeping the base frame's faces so the expressions read as they do there.
import { describe, expect, it } from 'vitest';
import { SPEAKER_DEFS } from '../../dialogue/speakers.ts';
import { EXPRESSION_EXTRAS, type SpeakerId } from '../../dialogue/types.ts';
import { contrastRatio, luminance } from '../../palettes/color.ts';
import { PALETTES } from '../../palettes/index.ts';
import { isColorName, rgbOf } from '../../palettes/master.ts';
import { SPRITES } from '../index.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { portraitBricks } from './bricks.ts';
import { portraitKip } from './kip.ts';
import { PEBBLE_EXPRESSIONS, portraitPebble } from './pebble.ts';
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

/** A portrait variant (T541) and the expressions it carries. */
const M5_VARIANTS: readonly (readonly [SpriteDef, string, readonly string[]])[] = [
  [portraitKip, 'act2', BASE_EXPRESSIONS],
  [portraitPebble, 'cap', PEBBLE_EXPRESSIONS],
  [portraitVesthara, 'touched', BASE_EXPRESSIONS],
  [portraitVesthara, 'touched_deep', BASE_EXPRESSIONS],
  [portraitVesthara, 'dawn', BASE_EXPRESSIONS],
];

/** The pixels in rows `y0..y1` and columns `x0..x1` of a frame, joined. */
const region = (rows: readonly string[], x0: number, y0: number, x1: number, y1: number): string =>
  rows
    .slice(y0, y1 + 1)
    .map((r) => r.slice(x0, x1 + 1))
    .join('|');

/** Ves'thara's fray colors: the Hollow's grey and the cold violet in the gaps. */
const isFray = (c: string): boolean => c.startsWith('hollow.') || c.startsWith('violet.');

/** Where each fray-colored pixel of a Ves'thara frame is. */
function frayPixels(name: string): [number, number][] {
  const legend: Readonly<Record<string, string>> = portraitVesthara.legend ?? {};
  const out: [number, number][] = [];
  resolve(portraitVesthara, name).forEach((r, y) => {
    for (let x = 0; x < r.length; x++) if (isFray(legend[r.charAt(x)] ?? '')) out.push([x, y]);
  });
  return out;
}

/** The variant names a speaker's rules in speakers.ts pick. */
const rules = (id: 'kip' | 'vesthara'): string[] => SPEAKER_DEFS[id].variants.map((v) => v.variant);

/** The row where capped Pebble's seedling starts (higher is perkier). */
const capSproutTop = (e: string): number =>
  resolve(portraitPebble, portraitFrame(e, { variant: 'cap' })).findIndex((r) => /[GHI]/.test(r));

describe('M5 portrait variants: the frame contract (T541)', () => {
  it.each(M5_VARIANTS.map(([d, v, es]) => [`${d.id} ${v}`, d, v, es] as const))(
    '%s: every expression and talking mouth, patched over the base',
    (_name, def, variant, expressions) => {
      const neutral = def.frames[portraitFrame('neutral', { variant })];
      expect(neutral !== undefined && isPatch(neutral) && neutral.from === 'neutral').toBe(true);
      const faces = new Set<string>();
      for (const e of expressions) {
        const name = portraitFrame(e, { variant });
        const talk = portraitFrame(e, { variant, mouth: 'talk' });
        const rows = resolve(def, name);
        expect(rows, `${name} differs from the base ${e}`).not.toEqual(resolve(def, e));
        expect(resolve(def, talk), talk).not.toEqual(rows);
        expect(def.anims?.[portraitTalkAnim(e, variant)]).toEqual({
          frames: [name, talk],
          fps: TALK_FPS,
        });
        if (e !== 'neutral') {
          const fd = def.frames[name];
          expect(fd !== undefined && isPatch(fd) && fd.from === `${variant}.neutral`, name).toBe(
            true,
          );
        }
        faces.add(rows.join('\n'));
      }
      expect(faces.size, 'every expression a different face').toBe(expressions.length);
    },
  );

  it('registers the variants speakers.ts already names (T513 wires Pebble’s cap)', () => {
    expect(rules('kip')).toContain('act2');
    expect(rules('vesthara')).toEqual(expect.arrayContaining(['touched', 'touched_deep']));
    for (const [def, variant] of M5_VARIANTS) {
      expect(
        def.frames[portraitFrame('neutral', { variant })],
        `${def.id} ${variant}`,
      ).toBeDefined();
    }
  });
});

describe('M5 variants keep the base faces, so every expression reads as it does there', () => {
  it('Kip `act2`: his head, cap and sunglasses are the base frame’s in every expression', () => {
    for (const e of BASE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const base = resolve(portraitKip, portraitFrame(e, { mouth }));
        const act2 = resolve(portraitKip, portraitFrame(e, { variant: 'act2', mouth }));
        expect(region(act2, 0, 0, 47, 32), `${e} ${mouth}`).toBe(region(base, 0, 0, 47, 32));
      }
    }
  });

  it('Pebble `cap`: her eyes, blush, mouth and brows are the base frame’s', () => {
    for (const e of PEBBLE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const base = resolve(portraitPebble, portraitFrame(e, { mouth }));
        const cap = resolve(portraitPebble, portraitFrame(e, { variant: 'cap', mouth }));
        expect(region(cap, 0, 19, 47, 47), `${e} ${mouth}`).toBe(region(base, 0, 19, 47, 47));
        // The brow tufts that reach up beside the cap are drawn over it, never under.
        const plain = resolve(portraitPebble, 'neutral');
        for (let y = 15; y < 19; y++) {
          for (let x = 0; x < 48; x++) {
            if (at(base, x, y) !== at(plain, x, y) && at(base, x, y) === '1') {
              expect(at(cap, x, y), `${e} brow ${x},${y}`).toBe('1');
            }
          }
        }
      }
    }
  });

  it("Ves'thara `touched` and `dawn`: her face and veil are the base frame's", () => {
    for (const variant of ['touched', 'dawn']) {
      for (const e of BASE_EXPRESSIONS) {
        for (const mouth of ['closed', 'talk'] as const) {
          const base = resolve(portraitVesthara, portraitFrame(e, { mouth }));
          const v = resolve(portraitVesthara, portraitFrame(e, { variant, mouth }));
          expect(region(v, 0, 0, 36, 27), `${variant} ${e} ${mouth}`).toBe(
            region(base, 0, 0, 36, 27),
          );
        }
      }
    }
  });

  it("Ves'thara `touched_deep`: the same brows, dark on a face one step dimmer (≥ 4:1, D134)", () => {
    const p = PALETTES.aelari;
    expect(contrastRatio(luminance(rgbOf(p.p3)), luminance(rgbOf(p.p1)))).toBeGreaterThanOrEqual(4);
    for (const e of BASE_EXPRESSIONS) {
      const base = resolve(portraitVesthara, e);
      const deep = resolve(portraitVesthara, portraitFrame(e, { variant: 'touched_deep' }));
      // The face's heart is a step down (blue.3), its brows the base frame's dark threads.
      expect(at(deep, 23, 20), e).toBe('3');
      const browsOf = (rows: readonly string[]): string =>
        region(rows, 17, 14, 30, 16).replace(/[^1|]/g, '.');
      expect(browsOf(deep), e).toBe(browsOf(base));
    }
  });
});

describe('Kip `act2`: Reclamation Lead in a white coat, the pin still on', () => {
  it('wears the white coat over the jumpsuit, popped collar, pin, and the stardust smear', () => {
    for (const e of BASE_EXPRESSIONS) {
      const name = portraitFrame(e, { variant: 'act2' });
      const rows = resolve(portraitKip, name);
      const chest = region(rows, 0, 40, 47, 47).replace(/[.|x]/g, '');
      const white = chest.replace(/[^34]/g, '').length;
      expect(white / chest.length, `${e}: mostly white coat`).toBeGreaterThan(0.5);
      const used = new Set(colorsOf(portraitKip, name));
      // The cap and sunglasses, the teal jumpsuit collar, the gold pin, and a pink-gold smear.
      for (const c of ['4', 'ink.3', '8', '9', 'gold.3', 'pink.4', 'gold.4']) {
        expect(used, `${e}: ${c}`).toContain(c);
      }
    }
    // Act I's jumpsuit is teal across the chest, with no coat and no smear.
    const plain = region(resolve(portraitKip, 'neutral'), 0, 40, 47, 47);
    expect(plain.replace(/[^34]/g, '').length).toBeLessThan(10);
    expect(colorsOf(portraitKip, 'neutral')).not.toContain('pink.4');
  });
});

describe('Pebble `cap`: Bricks’s bottle cap, the seedling up through it', () => {
  it('sits on her crown: a teal-ringed white top and a crimped steel skirt', () => {
    for (const e of PEBBLE_EXPRESSIONS) {
      const legend: Readonly<Record<string, string>> = portraitPebble.legend ?? {};
      const crown = region(
        resolve(portraitPebble, portraitFrame(e, { variant: 'cap' })),
        14,
        9,
        33,
        18,
      )
        .split('')
        .map((ch) => legend[ch] ?? ch);
      for (const c of ['steel.2', 'steel.3', 'steel.4', 'd', 'w'])
        expect(crown, `${e}: ${c}`).toContain(c);
    }
  });

  it('keeps the seedling’s tell: perkier when happy, drooping when worried or sad', () => {
    const top = capSproutTop;
    expect(top('happy')).toBeLessThan(top('neutral'));
    expect(top('worried')).toBeGreaterThan(top('neutral'));
    expect(top('sad')).toBeGreaterThan(top('neutral'));
    // And it grows out of the cap's hole: an unbroken stem from the leaves down into the cap.
    for (const e of PEBBLE_EXPRESSIONS) {
      const rows = resolve(portraitPebble, portraitFrame(e, { variant: 'cap' }));
      for (let y = 10; y <= 12; y++) expect(at(rows, 24, y), `${e} stem ${y}`).toBe('G');
    }
  });
});

describe("Ves'thara `touched`: her left arm and neck fray grey, cold violet in the gaps", () => {
  it('draws no violet or grey on her outside the fray (D103 keeps violet for it)', () => {
    for (const variant of [null, 'dawn']) {
      for (const e of BASE_EXPRESSIONS) {
        expect(frayPixels(portraitFrame(e, { variant })), `${variant ?? 'base'} ${e}`).toEqual([]);
      }
    }
  });

  it('frays only her left side (screen right) of the neck, shoulder and arm, deeper in Act III', () => {
    for (const e of BASE_EXPRESSIONS) {
      const touched = frayPixels(portraitFrame(e, { variant: 'touched' }));
      const deep = frayPixels(portraitFrame(e, { variant: 'touched_deep' }));
      expect(touched.length, e).toBeGreaterThan(120);
      expect(deep.length, e).toBeGreaterThan(touched.length + 30);
      // Never on her face or veil above the neck, never on her right shoulder.
      for (const [x, y] of touched) expect(y >= 28 && x >= 23, `${e} ${x},${y}`).toBe(true);
      for (const [x, y] of deep) expect(y >= 28 && x >= 21, `${e} deep ${x},${y}`).toBe(true);
      // The cold violet shows in the gaps.
      const used = colorsOf(portraitVesthara, portraitFrame(e, { variant: 'touched' }));
      for (const c of ['violet.0', 'violet.1', 'hollow.2', 'hollow.3'])
        expect(used, `${e}: ${c}`).toContain(c);
    }
  });

  it('keeps the cut thread ruby through the fray, and the dawn', () => {
    for (const variant of ['touched', 'touched_deep', 'dawn']) {
      for (const e of BASE_EXPRESSIONS) {
        for (const mouth of ['closed', 'talk'] as const) {
          const rows = resolve(portraitVesthara, portraitFrame(e, { variant, mouth }));
          for (const [x, y] of VESTHARA_CUT_THREAD) {
            expect(at(rows, x, y), `${variant} ${e} ${x},${y}`).toBe('d');
          }
        }
      }
    }
  });

  it('never lets the fray outshine her face', () => {
    const legend: Readonly<Record<string, string>> = portraitVesthara.legend ?? {};
    const p = PALETTES.aelari;
    for (const [variant, heart] of [
      ['touched', p.p4],
      ['touched_deep', p.p3],
    ] as const) {
      for (const e of BASE_EXPRESSIONS) {
        const rows = resolve(portraitVesthara, portraitFrame(e, { variant }));
        for (const [x, y] of frayPixels(portraitFrame(e, { variant }))) {
          const c = legend[at(rows, x, y)] ?? '';
          if (!isColorName(c)) throw new Error(`${variant} ${e}: ${c} is not a color`);
          expect(luminance(rgbOf(c)), `${variant} ${e} ${c}`).toBeLessThan(luminance(rgbOf(heart)));
        }
      }
    }
  });

  it('dims her eyes a step in Act III: no white core in any face', () => {
    for (const e of BASE_EXPRESSIONS) {
      const deep = resolve(portraitVesthara, portraitFrame(e, { variant: 'touched_deep' }));
      expect(region(deep, 16, 13, 31, 27), e).not.toMatch(/\*/);
      expect(region(deep, 16, 13, 31, 27), e).toMatch(/\+|8/);
    }
  });

  it('`dawn`: no fray, the broken threads re-lit gold, a gold mote at her shoulder', () => {
    for (const e of BASE_EXPRESSIONS) {
      const name = portraitFrame(e, { variant: 'dawn' });
      const used = colorsOf(portraitVesthara, name);
      for (const c of ['gold.2', 'gold.3', 'gold.4']) expect(used, `${e}: ${c}`).toContain(c);
      // The mote's white-gold heart, just off her left shoulder, clear of her silhouette.
      expect(at(resolve(portraitVesthara, name), 41, 29), e).toBe('Y');
      // Her eyes burn as in the base frame.
      const eyes = resolve(portraitVesthara, name).slice(14, 23).join('');
      expect(eyes.includes('*'), e).toBe(e !== 'sad');
    }
  });
});
