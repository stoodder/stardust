// Act III part one's portraits (T641; art-direction § Portrait roster, characters.md § Bramble, §
// Old Thrum and § Goldie, act3.md A3M1–A3M3): Bramble (the `chitterbloom` speaker), Old Thrum, and
// Goldie's `act3` variant. Each has the frame contract the dialogue panel asks for, under the ids
// speakers.ts names, and keeps its tells. The two elders read apart from Pebble (the youngling)
// and from each other at 1×, and their faces read on the panel's `ink.0`.
import { describe, expect, it } from 'vitest';
import { SPEAKER_DEFS } from '../../dialogue/speakers.ts';
import { EXPRESSION_EXTRAS, type SpeakerId } from '../../dialogue/types.ts';
import { contrastRatio, luminance } from '../../palettes/color.ts';
import { PALETTES } from '../../palettes/index.ts';
import { rgbOf, type ColorName } from '../../palettes/master.ts';
import { SPRITES } from '../index.ts';
import { STANDARD_LEGEND } from '../legend.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { BRAMBLE_EXPRESSIONS, BRAMBLE_FACE, portraitBramble } from './bramble.ts';
import { portraitGoldie } from './goldie.ts';
import { PEBBLE_EXPRESSIONS, portraitPebble, SURVEY_PATCH } from './pebble.ts';
import {
  BASE_EXPRESSIONS,
  portraitFrame,
  portraitTalkAnim,
  PORTRAIT_SIZE,
  TALK_FPS,
} from './portrait.ts';
import { portraitThrum, THRUM_BROWS, THRUM_EXPRESSIONS } from './thrum.ts';

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

/** A frame character's master color under the sprite's palette and legend. */
function colorOf(def: SpriteDef, ch: string): ColorName | null {
  // Transparent, or a `region` row separator.
  if (ch === '.' || ch === '|') return null;
  const slot = STANDARD_LEGEND[ch];
  const palette = PALETTES[def.palette];
  if (slot !== undefined) return palette[slot];
  const custom = (def.legend as Readonly<Record<string, ColorName>> | undefined)?.[ch];
  if (custom === undefined) throw new Error(`${def.id}: '${ch}' has no color`);
  return custom;
}

/** The master colors a frame uses. */
function colorsOf(def: SpriteDef, name: string): Set<ColorName> {
  const out = new Set<ColorName>();
  for (const ch of resolve(def, name).join('')) {
    const c = colorOf(def, ch);
    if (c !== null) out.add(c);
  }
  return out;
}

/** The pixels in columns `x0..x1` and rows `y0..y1` of a frame, joined. */
const region = (rows: readonly string[], x0: number, y0: number, x1: number, y1: number): string =>
  rows
    .slice(y0, y1 + 1)
    .map((r) => r.slice(x0, x1 + 1))
    .join('|');

/** The opaque mask of a frame. */
const mask = (rows: readonly string[]): string => rows.join('').replace(/[^.]/g, '#');
const opaque = (rows: readonly string[]): number => mask(rows).replace(/\./g, '').length;

const lum = (c: ColorName): number => luminance(rgbOf(c));

/** The white glints of Bramble's young (its eyes show only while it peeks). */
const youngEyes = (e: string): number =>
  region(resolve(portraitBramble, e), 0, 12, 11, 21).replace(/[^w]/g, '').length;
/** The first row of Thrum's face with an eye glint in it. */
const glintRow = (e: string): number =>
  resolve(portraitThrum, e).findIndex((r, y) => y > 27 && /w/.test(r.slice(14, 34)));
/** Thrum's eye band, and the open part of her mouth (dark coral). */
const eyes = (rows: readonly string[]): string => region(rows, 12, 28, 35, 34);
const open = (rows: readonly string[]): number =>
  region(rows, 20, 36, 28, 38).replace(/[^R]/g, '').length;
/** Thrum's lit shimmer over her shell. */
const lit = (e: string): number =>
  region(resolve(portraitThrum, e), 0, 0, 47, 26).replace(/[^*P]/g, '').length;
/** How many pixels two masks disagree on. */
const diff = (a: string, c: string): number => {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a.charAt(i) !== c.charAt(i)) n++;
  return n;
};
/** The dark eye pixels of a neutral face. */
const eyePx = (def: SpriteDef): number =>
  resolve(def, 'neutral').join('').replace(/[^kJ]/g, '').length;
/** A Goldie `act3` frame. */
const act3 = (e: string, mouth: 'closed' | 'talk' = 'closed'): string[] =>
  resolve(portraitGoldie, portraitFrame(e, { variant: 'act3', mouth }));

describe('Act III portraits: the frame contract', () => {
  it.each([
    [portraitBramble.id, portraitBramble, BRAMBLE_EXPRESSIONS],
    [portraitThrum.id, portraitThrum, THRUM_EXPRESSIONS],
  ] as const)(
    '%s: 48×48, every expression a patch over neutral with a talking mouth',
    (_id, def, expressions) => {
      expect(def.size).toEqual({ w: PORTRAIT_SIZE, h: PORTRAIT_SIZE });
      expect(Array.isArray(def.frames['neutral'])).toBe(true);
      for (const e of BASE_EXPRESSIONS) expect(expressions, e).toContain(e);
      const faces = new Set<string>();
      for (const e of expressions) {
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
      expect(faces.size, 'every expression a different face').toBe(expressions.length);
    },
  );

  it('Goldie `act3`: every expression and talking mouth, patched over the variant’s neutral', () => {
    const neutral = portraitGoldie.frames[portraitFrame('neutral', { variant: 'act3' })];
    expect(neutral !== undefined && isPatch(neutral) && neutral.from === 'neutral').toBe(true);
    const faces = new Set<string>();
    for (const e of BASE_EXPRESSIONS) {
      const name = portraitFrame(e, { variant: 'act3' });
      const talk = portraitFrame(e, { variant: 'act3', mouth: 'talk' });
      const rows = resolve(portraitGoldie, name);
      expect(rows, `${name} differs from the base ${e}`).not.toEqual(resolve(portraitGoldie, e));
      expect(resolve(portraitGoldie, talk), talk).not.toEqual(rows);
      expect(portraitGoldie.anims?.[portraitTalkAnim(e, 'act3')]).toEqual({
        frames: [name, talk],
        fps: TALK_FPS,
      });
      if (e !== 'neutral') {
        const fd = portraitGoldie.frames[name];
        expect(fd !== undefined && isPatch(fd) && fd.from === 'act3.neutral', name).toBe(true);
      }
      faces.add(rows.join('\n'));
    }
    expect(faces.size).toBe(BASE_EXPRESSIONS.length);
  });

  it('registers each portrait under the id speakers.ts names, and Goldie’s act3 rule', () => {
    const ids = new Set<string>(SPRITES.map((s) => s.id));
    for (const [speaker, def] of [
      ['chitterbloom', portraitBramble],
      ['thrum', portraitThrum],
    ] as const satisfies readonly (readonly [SpeakerId, SpriteDef])[]) {
      expect(SPEAKER_DEFS[speaker].portrait).toBe(def.id);
      expect(ids.has(def.id), def.id).toBe(true);
    }
    expect(SPEAKER_DEFS.goldie.variants.map((v) => v.variant)).toContain('act3');
  });

  it('draws every expression extra the dialogue types allow for these speakers', () => {
    const extras: Readonly<Record<string, Readonly<Record<string, string>>>> = EXPRESSION_EXTRAS;
    for (const [speaker, def] of [
      ['thrum', portraitThrum],
      ['chitterbloom', portraitBramble],
      ['goldie', portraitGoldie],
    ] as const) {
      for (const e of Object.keys(extras[speaker] ?? {})) {
        expect(def.frames[portraitFrame(e)], `${speaker} ${e}`).toBeDefined();
        expect(
          def.frames[portraitFrame(e, { mouth: 'talk' })],
          `${speaker} ${e}_talk`,
        ).toBeDefined();
      }
    }
  });
});

describe('Bramble: the matriarch, too big for the frame', () => {
  it('wears the allied Skitterkin palette, her blossom wreath, and her flank spots in every face', () => {
    expect(portraitBramble.palette).toBe('skitterkin.ally');
    for (const e of BRAMBLE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const used = colorsOf(portraitBramble, portraitFrame(e, { mouth }));
        // Coral fur, the butter belly, the wreath's moss (green, as in A1M5), pink petals, and
        // gold hearts.
        for (const c of ['coral.3', 'gold.3', 'green.2', 'green.3', 'pink.3', 'gold.4'] as const)
          expect(used, `${e} ${mouth}: ${c}`).toContain(c);
        expect(
          [...used].filter((c) => c.startsWith('skin.')),
          e,
        ).toEqual([]);
      }
    }
  });

  it('is cropped close: her fur fills the frame and runs off its sides and bottom', () => {
    for (const e of BRAMBLE_EXPRESSIONS) {
      const rows = resolve(portraitBramble, e);
      expect(opaque(rows) / PORTRAIT_SIZE ** 2, e).toBeGreaterThan(0.8);
      // No outline along a cut edge: fur, not ink, at the frame's left, right and bottom.
      expect(rows[30]?.charAt(0), e).not.toMatch(/[.x]/);
      expect(rows[30]?.charAt(47), e).not.toMatch(/[.x]/);
      expect(rows[47]?.charAt(24), e).not.toMatch(/[.x]/);
    }
    expect(opaque(resolve(portraitBramble, 'neutral'))).toBeGreaterThan(
      opaque(resolve(portraitPebble, 'neutral')) * 1.4,
    );
  });

  it('carries one of her young over her shoulder; it ducks into her fur when she’s worried', () => {
    for (const e of BRAMBLE_EXPRESSIONS) {
      if (e === 'worried') expect(youngEyes(e), e).toBe(0);
      else expect(youngEyes(e), e).toBeGreaterThanOrEqual(2);
    }
  });

  it('bristles her crown when angry', () => {
    const top = (e: string): number => resolve(portraitBramble, e).findIndex((r) => /[^.]/.test(r));
    expect(top('angry')).toBeLessThanOrEqual(top('neutral'));
    expect(opaque(resolve(portraitBramble, 'angry'))).toBeGreaterThan(
      opaque(resolve(portraitBramble, 'neutral')),
    );
  });

  it('keeps her face inside its box, and her brows dark on her fur (≥ 4:1)', () => {
    const { x0, y0, x1, y1 } = BRAMBLE_FACE;
    const plain = resolve(portraitBramble, 'neutral');
    for (const e of BRAMBLE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const rows = resolve(portraitBramble, portraitFrame(e, { mouth }));
        rows.forEach((r, y) => {
          for (let x = 0; x < r.length; x++) {
            if (r.charAt(x) === plain[y]?.charAt(x)) continue;
            // Only the face, the young, the wreath, and (angry) the bristling rim change.
            const inFace = x >= x0 && x <= x1 && y >= y0 && y <= y1;
            const young = x <= 11 && y >= 12 && y <= 21;
            const wreath = y < y0;
            const rim =
              e === 'angry' &&
              [-2, -1, 0, 1, 2].some((d) =>
                /[.x]/.test((plain[y + d]?.charAt(x) ?? '.') + (plain[y]?.charAt(x + d) ?? '.')),
              );
            expect(inFace || young || wreath || rim, `${e} ${mouth} ${x},${y}`).toBe(true);
          }
        });
      }
    }
    const p = PALETTES['skitterkin.ally'];
    expect(contrastRatio(lum(p.p3), lum(p.p0))).toBeGreaterThanOrEqual(4);
    // Brows of the darkest fur in every face.
    for (const e of BRAMBLE_EXPRESSIONS) {
      expect(region(resolve(portraitBramble, e), x0, y0, x1, y0 + 4), e).toMatch(/0/);
    }
  });
});

describe('Old Thrum: the Elder of the Quiet Wave', () => {
  it('wears the allied palette, the mossy steel shell, and her white brows and whiskers', () => {
    expect(portraitThrum.palette).toBe('skitterkin.ally');
    for (const e of THRUM_EXPRESSIONS) {
      const used = colorsOf(portraitThrum, e);
      for (const c of ['coral.3', 'steel.3', 'steel.4', 'white.0', 'green.3', 'gold.3'] as const)
        expect(used, `${e}: ${c}`).toContain(c);
      // The brows are white tufts, in their box, in every face.
      const { x0, y0, x1, y1 } = THRUM_BROWS;
      expect(
        region(resolve(portraitThrum, e), x0, y0, x1, y1).replace(/[^W]/g, '').length,
        e,
      ).toBeGreaterThanOrEqual(10);
    }
  });

  it('looks up at you at rest (she is knee-high): her glints sit high in her eyes', () => {
    expect(glintRow('neutral')).toBeLessThan(glintRow('worried'));
  });

  it('hums with her eyes shut and a round mouth, the shimmer lit in her shell’s seams', () => {
    const rest = resolve(portraitThrum, 'singing');
    const hum = resolve(portraitThrum, 'singing_talk');
    expect(eyes(rest)).not.toMatch(/[kw]/);
    expect(open(rest)).toBeGreaterThan(0);
    expect(open(hum)).toBeGreaterThan(open(rest));
    expect(lit('singing')).toBeGreaterThan(lit('neutral') + 10);
  });
});

describe('the elders read apart from Pebble and from each other', () => {
  it('has three different silhouettes', () => {
    const b = mask(resolve(portraitBramble, 'neutral'));
    const t = mask(resolve(portraitThrum, 'neutral'));
    const p = mask(resolve(portraitPebble, 'neutral'));
    expect(diff(b, t)).toBeGreaterThan(200);
    expect(diff(b, p)).toBeGreaterThan(200);
    expect(diff(t, p)).toBeGreaterThan(200);
  });

  it('gives the elders older, smaller eyes than the youngling’s', () => {
    expect(eyePx(portraitBramble)).toBeLessThan(eyePx(portraitPebble));
    expect(eyePx(portraitThrum)).toBeLessThan(eyePx(portraitPebble));
  });

  it('reads on the panel’s ink.0: bodies bright, eyes dark on the fur (≥ 4:1)', () => {
    const p = PALETTES['skitterkin.ally'];
    for (const def of [portraitBramble, portraitThrum]) {
      for (const e of BASE_EXPRESSIONS) {
        let sum = 0;
        let n = 0;
        for (const ch of resolve(def, e).join('')) {
          if (ch === '.' || ch === 'x' || ch === 'k') continue;
          const c = colorOf(def, ch);
          if (c === null) continue;
          sum += lum(c);
          n++;
        }
        expect(contrastRatio(sum / n, lum('ink.0')), `${def.id} ${e}`).toBeGreaterThan(6);
      }
    }
    expect(contrastRatio(lum(p.p3), lum(p.eye))).toBeGreaterThanOrEqual(4);
  });
});

describe('Goldie `act3`: the convoy organizer at night', () => {
  it('keeps the base frame’s face, so every expression reads as it does there', () => {
    for (const e of BASE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const base = resolve(portraitGoldie, portraitFrame(e, { mouth }));
        // Brows and eyes, then the mouth (the hat's brim shows behind her neck beside it).
        expect(region(act3(e, mouth), 14, 20, 31, 30), `${e} ${mouth}`).toBe(
          region(base, 14, 20, 31, 30),
        );
        expect(region(act3(e, mouth), 17, 29, 27, 32), `${e} ${mouth}`).toBe(
          region(base, 17, 29, 27, 32),
        );
      }
    }
  });

  it('wears a lit headlamp, the sun hat down her back, and holds a clipboard, not Duchess', () => {
    for (const e of BASE_EXPRESSIONS) {
      const rows = act3(e);
      const color = (ch: string): ColorName | null => colorOf(portraitGoldie, ch);
      // The lamp: a white-hot lens over gold on her brow.
      const lamp = region(rows, 19, 11, 26, 16).split('').map(color);
      expect(lamp, e).toContain('white.1');
      expect(lamp, e).toContain('gold.3');
      // Nothing straw on her head: the hat's brim shows behind her shoulder instead.
      const head = region(rows, 10, 0, 35, 22).split('').map(color);
      expect(
        head.filter((c) => c?.startsWith('brass.') === true),
        e,
      ).toEqual([]);
      const shoulder = region(rows, 0, 26, 12, 38).split('').map(color);
      expect(shoulder, e).toContain('brass.4');
      // The clipboard's paper, and Duchess's butterhead gone.
      const used = colorsOf(portraitGoldie, portraitFrame(e, { variant: 'act3' }));
      expect(used, e).toContain('white.0');
      expect(used.has('green.4'), e).toBe(false);
      expect(used.has('coral.2'), `${e}: no terracotta pot`).toBe(false);
    }
  });
});

/** A Pebble frame in a variant. */
const pebbleIn = (variant: string, e: string, mouth: 'closed' | 'talk' = 'closed'): string[] =>
  resolve(portraitPebble, portraitFrame(e, { variant, mouth }));

describe('Pebble `patch` (T641b): the cap carrying Bricks’s Survey Corps patch', () => {
  it('has every expression and talking mouth, patched over its own neutral', () => {
    const neutral = portraitPebble.frames[portraitFrame('neutral', { variant: 'patch' })];
    expect(neutral !== undefined && isPatch(neutral) && neutral.from === 'neutral').toBe(true);
    const faces = new Set<string>();
    for (const e of PEBBLE_EXPRESSIONS) {
      const name = portraitFrame(e, { variant: 'patch' });
      const talk = portraitFrame(e, { variant: 'patch', mouth: 'talk' });
      const rows = resolve(portraitPebble, name);
      expect(rows, `${name} differs from cap`).not.toEqual(pebbleIn('cap', e));
      expect(resolve(portraitPebble, talk), talk).not.toEqual(rows);
      expect(portraitPebble.anims?.[portraitTalkAnim(e, 'patch')]).toEqual({
        frames: [name, talk],
        fps: TALK_FPS,
      });
      if (e !== 'neutral') {
        const fd = portraitPebble.frames[name];
        expect(fd !== undefined && isPatch(fd) && fd.from === 'patch.neutral', name).toBe(true);
      }
      faces.add(rows.join('\n'));
    }
    expect(faces.size).toBe(PEBBLE_EXPRESSIONS.length);
    expect(SPEAKER_DEFS.pebble.variants.map((v) => v.variant)).toContain('patch');
  });

  it('is the cap, the seedling and her face unchanged: only the patch box differs', () => {
    const { x, y, w, h } = SURVEY_PATCH;
    for (const e of PEBBLE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const cap = pebbleIn('cap', e, mouth);
        const patch = pebbleIn('patch', e, mouth);
        patch.forEach((r, py) => {
          for (let px = 0; px < r.length; px++) {
            if (r.charAt(px) === cap[py]?.charAt(px)) continue;
            const inBox = px >= x && px < x + w && py >= y && py < y + h;
            expect(inBox, `${e} ${mouth} ${px},${py}`).toBe(true);
          }
        });
        // The seedling still grows out of the cap's hole.
        for (let sy = 10; sy <= 12; sy++) expect(patch[sy]?.charAt(24), `${e} stem`).toBe('G');
      }
    }
  });

  it('wears his patch’s colours (a grime rim and ring, a coral needle, a slate stone)', () => {
    const { x, y, w, h } = SURVEY_PATCH;
    for (const e of PEBBLE_EXPRESSIONS) {
      const box = region(pebbleIn('patch', e), x, y, x + w - 1, y + h - 1)
        .replace(/\|/g, '')
        .split('')
        .map((ch) => colorOf(portraitPebble, ch));
      for (const c of ['grime.1', 'grime.4', 'coral.2', 'steel.1'] as const)
        expect(box, `${e}: ${c}`).toContain(c);
    }
  });
});
