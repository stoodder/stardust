// Act III part two's portrait variants (T741; art-direction § Portrait roster, characters.md §
// QUILL, § Kip, § Ves'thara and § Sterling, act3.md A3M4–A3M5): QUILL `purge` (flattened, the
// status bar in place of the smile), Kip `act3` (no cap or pin, tired, the ledger), Ves'thara's
// `laugh` (Night Shift), and Sterling `remote` (A3M5's boss cues on a live feed). Each has the frame
// contract the dialogue panel asks for, differs from its base, and keeps its tells.
import { describe, expect, it } from 'vitest';
import { SPEAKER_DEFS } from '../../dialogue/speakers.ts';
import { EXPRESSION_EXTRAS } from '../../dialogue/types.ts';
import { contrastRatio, luminance } from '../../palettes/color.ts';
import { PALETTES } from '../../palettes/index.ts';
import { MASTER, rgbOf, type ColorName } from '../../palettes/master.ts';
import { STANDARD_LEGEND } from '../legend.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { KIP_LEDGER, KIP_PINHOLES, portraitKip } from './kip.ts';
import {
  BASE_EXPRESSIONS,
  portraitFrame,
  portraitIdleAnim,
  portraitTalkAnim,
  PORTRAIT_SIZE,
  SCAN_FPS,
  TALK_FPS,
} from './portrait.ts';
import { portraitQuill, QUILL_STATUS_BAR } from './quill.ts';
import { portraitSterling, STERLING_EYE_ROWS, STERLING_MOUTH_ROWS } from './sterling.ts';
import { portraitVesthara } from './vesthara.ts';

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
  if (ch === '.') return null;
  const slot = STANDARD_LEGEND[ch];
  if (slot !== undefined) return PALETTES[def.palette][slot];
  const custom = (def.legend as Readonly<Record<string, ColorName>> | undefined)?.[ch];
  if (custom === undefined) throw new Error(`${def.id}: '${ch}' has no color`);
  return custom;
}

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

const at = (rows: readonly string[], x: number, y: number): string => rows[y]?.charAt(x) ?? '.';

const statusBar = (m: 'closed' | 'talk'): string =>
  QUILL_STATUS_BAR[m].map((r) => r.replace(/\./g, '?')).join('|');
const litSegments = (m: 'closed' | 'talk'): number =>
  QUILL_STATUS_BAR[m].join('').replace(/[^w]/g, '').length;
const kipAct3 = (e: string, mouth: 'closed' | 'talk' = 'closed'): string[] =>
  resolve(portraitKip, portraitFrame(e, { variant: 'act3', mouth }));

const kipMouth = (rows: readonly string[]): string => region(rows, 19, 26, 28, 29);
const laugh = (variant: string | null, mouth: 'closed' | 'talk' = 'closed'): string[] =>
  resolve(portraitVesthara, portraitFrame('laugh', { variant, mouth }));

const deepEyes = (e: string): string =>
  region(resolve(portraitVesthara, portraitFrame(e, { variant: 'touched_deep' })), 16, 13, 31, 22);
const remote = (e: string, mouth: 'closed' | 'talk' = 'closed'): string[] =>
  resolve(portraitSterling, portraitFrame(e, { variant: 'remote', mouth }));

const smileBand = (rows: readonly string[]): string =>
  rows.slice(STERLING_MOUTH_ROWS.y0, STERLING_MOUTH_ROWS.y1 + 1).join('|');

/** The variants T741 adds, each with the expressions it must carry. */
const T741_VARIANTS: readonly (readonly [SpriteDef, string, readonly string[]])[] = [
  [portraitQuill, 'purge', BASE_EXPRESSIONS],
  [portraitKip, 'act3', BASE_EXPRESSIONS],
  [portraitSterling, 'remote', BASE_EXPRESSIONS],
];

describe('T741 portrait variants: the frame contract', () => {
  it.each(T741_VARIANTS.map(([d, v, es]) => [`${d.id} ${v}`, d, v, es] as const))(
    '%s: 48×48, every expression and talking mouth patched over the variant’s neutral',
    (_name, def, variant, expressions) => {
      const neutral = def.frames[portraitFrame('neutral', { variant })];
      expect(neutral !== undefined && isPatch(neutral) && neutral.from === 'neutral').toBe(true);
      const faces = new Set<string>();
      for (const e of expressions) {
        const name = portraitFrame(e, { variant });
        const talk = portraitFrame(e, { variant, mouth: 'talk' });
        const rows = resolve(def, name);
        expect(rows).toHaveLength(PORTRAIT_SIZE);
        expect(rows.every((r) => r.length === PORTRAIT_SIZE)).toBe(true);
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

  it('names the variants speakers.ts asks for (QUILL purge, Kip act3)', () => {
    expect(SPEAKER_DEFS.quill.variants.map((v) => v.variant)).toContain('purge');
    expect(SPEAKER_DEFS.kip.variants.map((v) => v.variant)).toContain('act3');
  });

  it('paints only master colours, and no pure black (the darks are coloured)', () => {
    const frames: [SpriteDef, string][] = [
      ...T741_VARIANTS.flatMap(([def, variant, es]) =>
        es.flatMap((e) =>
          (['closed', 'talk'] as const).map(
            (mouth) => [def, portraitFrame(e, { variant, mouth })] as [SpriteDef, string],
          ),
        ),
      ),
      ...[null, 'touched', 'touched_deep', 'dawn'].flatMap((variant) =>
        (['closed', 'talk'] as const).map(
          (mouth) =>
            [portraitVesthara, portraitFrame('laugh', { variant, mouth })] as [SpriteDef, string],
        ),
      ),
    ];
    for (const [def, name] of frames) {
      for (const c of colorsOf(def, name)) {
        expect(Object.hasOwn(MASTER, c), `${def.id} ${name}: ${c}`).toBe(true);
        expect(MASTER[c].toLowerCase(), `${def.id} ${name}: ${c}`).not.toBe('#000000');
      }
    }
  });
});

/** QUILL's mouth box: the 13×4 stamp under the eye, from (HX − 6, HY + 2). */
const quillMouth = (rows: readonly string[]): string => region(rows, 18, 28, 30, 31);

describe('QUILL `purge`: flattened, a status bar for a smile', () => {
  const QUILL_EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'sad', 'policy'];

  it('has every QUILL expression, its scanline flicker, and no policy flash', () => {
    for (const e of QUILL_EXPRESSIONS) {
      const name = portraitFrame(e, { variant: 'purge' });
      expect(portraitQuill.frames[name], name).toBeDefined();
      const scan = portraitFrame(e, { variant: 'purge', scan: true });
      expect(resolve(portraitQuill, scan)).not.toEqual(resolve(portraitQuill, name));
      expect(portraitQuill.anims?.[portraitIdleAnim(e, 'purge')]).toEqual({
        frames: [name, scan],
        fps: SCAN_FPS,
      });
    }
    // No directives, no tell: no gold flash, and `policy` is just the neutral face.
    expect(portraitQuill.frames['purge.policy_flash']).toBeUndefined();
    expect(resolve(portraitQuill, 'purge.policy')).toEqual(resolve(portraitQuill, 'purge.neutral'));
  });

  it('shows the same plain status bar in every expression; it blinks a segment on to talk', () => {
    for (const e of QUILL_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const box = quillMouth(
          resolve(portraitQuill, portraitFrame(e, { variant: 'purge', mouth })),
        );
        // Every stamped pixel of the bar is there (the `?`s are the hexagon behind it).
        const want = statusBar(mouth);
        for (let i = 0; i < want.length; i++) {
          if (want.charAt(i) !== '?')
            expect(box.charAt(i), `${e} ${mouth} @${i}`).toBe(want.charAt(i));
        }
      }
    }
    expect(litSegments('talk')).toBe(litSegments('closed') + 1);
  });

  it('is flat: the hexagon has no lit half, and its eye still carries the expression', () => {
    for (const e of QUILL_EXPRESSIONS) {
      const rows = resolve(portraitQuill, portraitFrame(e, { variant: 'purge' }));
      // `7` is the base hexagon's lit fill; the base frame has it.
      expect(region(rows, 10, 14, 37, 38), e).not.toMatch(/7/);
    }
    expect(region(resolve(portraitQuill, 'neutral'), 10, 14, 37, 38)).toMatch(/7/);
    const eyes = new Set(
      BASE_EXPRESSIONS.map((e) =>
        region(resolve(portraitQuill, portraitFrame(e, { variant: 'purge' })), 19, 17, 29, 25),
      ),
    );
    expect(eyes.size).toBe(BASE_EXPRESSIONS.length);
  });
});

describe('Kip `act3`: the cap and the pin gone, the ledger to his chest', () => {
  it('wears no cap, no sunglasses and no pin: his sandy hair, the coat, the pinholes', () => {
    for (const e of BASE_EXPRESSIONS) {
      const used = colorsOf(portraitKip, portraitFrame(e, { variant: 'act3' }));
      // The sunglasses' lenses (ink.3), the pin's golds, the cap's orange button.
      for (const c of ['ink.3', 'gold.0', 'gold.1', 'gold.3', 'gold.4', 'orange.2'] as const)
        expect(used.has(c), `${e}: ${c}`).toBe(false);
      // Sandy hair over his head where the cap's white crown was.
      const crown = region(kipAct3(e), 16, 7, 31, 12)
        .split('')
        .map((ch) => (ch === '|' ? null : colorOf(portraitKip, ch)));
      expect(crown.filter((c) => c?.startsWith('brass.') === true).length, e).toBeGreaterThan(40);
      expect(crown, e).not.toContain('white.0');
      // The white coat (still Reclamation Lead), and two pinholes where the pin sat.
      expect(used, e).toContain('white.0');
      for (const [x, y] of KIP_PINHOLES) expect(at(kipAct3(e), x, y), `${e} ${x},${y}`).toBe('1');
    }
  });

  it('holds the ledger flat to his chest: a brass-brown binder, white pages and label, his hands', () => {
    const { x0, y0, x1, y1 } = KIP_LEDGER;
    for (const e of BASE_EXPRESSIONS) {
      const box = region(kipAct3(e), x0, y0, x1, y1)
        .split('')
        .map((ch) => (ch === '|' ? null : colorOf(portraitKip, ch)));
      for (const c of ['brass.0', 'brass.1', 'white.0', 'steel.3', 'skin.b.3'] as const)
        expect(box, `${e}: ${c}`).toContain(c);
      const brown = box.filter((c) => c === 'brass.0' || c === 'brass.1').length;
      expect(brown / box.length, e).toBeGreaterThan(0.35);
    }
  });

  it('is tired: bags under his eyes in every face, and no smirk or toothy grin', () => {
    for (const e of BASE_EXPRESSIONS) {
      // The bags: skin shadow (B) on the row under the eyes, where the base has none.
      if (e !== 'sad') expect(region(kipAct3(e), 15, 22, 32, 22), e).toMatch(/BBB/);
    }
    // His base neutral smirks (lopsided) and his happy shows teeth; act3's don't.
    expect(kipMouth(kipAct3('happy'))).not.toMatch(/W|w/);
    expect(kipMouth(kipAct3('neutral'))).not.toBe(kipMouth(resolve(portraitKip, 'neutral')));
  });
});

describe("Ves'thara `laugh`: her one laugh (Night Shift)", () => {
  it('is drawn in the base frame and every variant, with its talk anim', () => {
    for (const variant of [null, 'touched', 'touched_deep', 'dawn']) {
      const name = portraitFrame('laugh', { variant });
      const talk = portraitFrame('laugh', { variant, mouth: 'talk' });
      expect(laugh(variant), name).not.toEqual(
        resolve(portraitVesthara, portraitFrame('happy', { variant })),
      );
      expect(laugh(variant, 'talk'), talk).not.toEqual(laugh(variant));
      expect(portraitVesthara.anims?.[portraitTalkAnim('laugh', variant)]).toEqual({
        frames: [name, talk],
        fps: TALK_FPS,
      });
    }
  });

  it('is the extra the dialogue types name for her (falls back to happy)', () => {
    const extras: Readonly<Record<string, Readonly<Record<string, string>>>> = EXPRESSION_EXTRAS;
    for (const [e, fallback] of Object.entries(extras['vesthara'] ?? {})) {
      expect(portraitVesthara.frames[portraitFrame(e)], e).toBeDefined();
      expect(fallback).toBe('happy');
    }
  });

  it('opens her mouth on her light, and keeps the cut thread and the veil of every variant', () => {
    for (const variant of [null, 'touched', 'touched_deep', 'dawn']) {
      // The seam is parted on light (the white core) even between words.
      expect(region(laugh(variant), 20, 24, 27, 26), `${variant}`).toMatch(/\*/);
      // Only the face changes from the variant's happy: the veil above it and the body below hold.
      const happy = resolve(portraitVesthara, portraitFrame('happy', { variant }));
      expect(region(laugh(variant), 0, 0, 47, 12)).toBe(region(happy, 0, 0, 47, 12));
      expect(region(laugh(variant), 0, 28, 47, 47)).toBe(region(happy, 0, 28, 47, 47));
    }
  });

  it('under `touched_deep`, lights her eyes again: the one face with a white core', () => {
    expect(deepEyes('laugh')).toMatch(/\*/);
    for (const e of BASE_EXPRESSIONS) expect(deepEyes(e), e).not.toMatch(/\*/);
    // Her face itself stays a step dimmer (the heart blue.3), and the chest knot dims as before.
    const rows = laugh('touched_deep');
    expect(at(rows, 23, 20)).toBe('3');
    expect(region(rows, 21, 36, 26, 40)).not.toMatch(/\*/);
  });
});

describe('Sterling `remote`: the boss cues on a live feed', () => {
  it('is her portrait untouched, on a scanline feed with viewfinder brackets and a REC lamp', () => {
    for (const e of BASE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const base = resolve(portraitSterling, portraitFrame(e, { mouth }));
        const rows = remote(e, mouth);
        // Every pixel of her is the base frame's; only the transparent ground is filled.
        base.forEach((r, y) => {
          for (let x = 0; x < r.length; x++) {
            if (r.charAt(x) !== '.')
              expect(at(rows, x, y), `${e} ${mouth} ${x},${y}`).toBe(r.charAt(x));
          }
        });
        expect(rows.join('')).not.toMatch(/\./);
      }
      const used = colorsOf(portraitSterling, portraitFrame(e, { variant: 'remote' }));
      for (const c of ['teal.0', 'ink.1', 'white.0', 'red.3'] as const)
        expect(used, `${e}: ${c}`).toContain(c);
    }
    // The REC lamp reads on the feed.
    expect(contrastRatio(luminance(rgbOf('red.3')), luminance(rgbOf('teal.0')))).toBeGreaterThan(3);
  });

  it('keeps the tell: the same smile in every expression, patches only on the eye rows', () => {
    for (const mouth of ['closed', 'talk'] as const) {
      const ref = smileBand(remote('neutral', mouth));
      for (const e of BASE_EXPRESSIONS)
        expect(smileBand(remote(e, mouth)), `${e} ${mouth}`).toBe(ref);
    }
    for (const e of BASE_EXPRESSIONS) {
      if (e === 'neutral') continue;
      const fd = portraitSterling.frames[portraitFrame(e, { variant: 'remote' })];
      if (fd === undefined || !isPatch(fd)) throw new Error(e);
      for (const p of Array.isArray(fd.patch) ? fd.patch : [fd.patch]) {
        expect(p.y, e).toBeGreaterThanOrEqual(STERLING_EYE_ROWS.y0);
        expect(p.y + p.rows.length - 1, e).toBeLessThanOrEqual(STERLING_EYE_ROWS.y1);
      }
    }
  });
});
