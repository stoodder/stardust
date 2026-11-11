// The party hats and the finale's portraits (T840; art-direction § Portrait roster, act1.md § A1M5,
// bible.md § C4, finale.md): a `party_hat` variant on every portrait at A1M5's party, Duchess's
// thimble, QUILL `damaged` (C4 Keep, after Directive 0) and Pebble's `singing` on the variant she
// wears to the finale. Each has the frame contract the dialogue panel asks for, differs from its
// base, and keeps its tells.
import { describe, expect, it } from 'vitest';
import { PALETTES } from '../../palettes/index.ts';
import type { ColorName } from '../../palettes/master.ts';
import { STANDARD_LEGEND } from '../legend.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { portraitBricks } from './bricks.ts';
import { portraitGoldie } from './goldie.ts';
import { portraitKip } from './kip.ts';
import { portraitPebble } from './pebble.ts';
import {
  BASE_EXPRESSIONS,
  portraitFrame,
  portraitIdleAnim,
  portraitTalkAnim,
  PORTRAIT_SIZE,
  SCAN_FPS,
  TALK_FPS,
} from './portrait.ts';
import { portraitQuill, QUILL_CRACK, QUILL_TEAR_ROWS } from './quill.ts';
import { portraitSterling, STERLING_MOUTH_ROWS } from './sterling.ts';
import { portraitZibzab } from './zibzab.ts';

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

/** Colors in rows `y0..y1` and columns `x0..x1` of a frame. */
function colorsIn(
  def: SpriteDef,
  name: string,
  box: { x0: number; y0: number; x1: number; y1: number } = {
    x0: 0,
    y0: 0,
    x1: PORTRAIT_SIZE - 1,
    y1: PORTRAIT_SIZE - 1,
  },
): Set<ColorName> {
  const out = new Set<ColorName>();
  resolve(def, name)
    .slice(box.y0, box.y1 + 1)
    .forEach((r) => {
      for (const ch of r.slice(box.x0, box.x1 + 1)) {
        const c = colorOf(def, ch);
        if (c !== null) out.add(c);
      }
    });
  return out;
}

const region = (rows: readonly string[], x0: number, y0: number, x1: number, y1: number): string =>
  rows
    .slice(y0, y1 + 1)
    .map((r) => r.slice(x0, x1 + 1))
    .join('|');

/** Every portrait at A1M5's party (its speakers: act1.md § A1M5). */
const PARTY: readonly SpriteDef[] = [
  portraitQuill,
  portraitSterling,
  portraitKip,
  portraitGoldie,
  portraitZibzab,
  portraitBricks,
];

/** The frame contract for one variant: every expression closed and talking, at 48×48. */
function expectVariantContract(def: SpriteDef, variant: string): void {
  for (const e of BASE_EXPRESSIONS) {
    const closed = resolve(def, portraitFrame(e, { variant }));
    const talk = resolve(def, portraitFrame(e, { variant, mouth: 'talk' }));
    expect(closed, `${def.id} ${variant}.${e}`).toHaveLength(PORTRAIT_SIZE);
    for (const r of closed) expect(r).toHaveLength(PORTRAIT_SIZE);
    expect(talk, `${def.id} ${variant}.${e}_talk`).not.toEqual(closed);
    expect(def.anims?.[portraitTalkAnim(e, variant)]).toEqual({
      frames: [portraitFrame(e, { variant }), portraitFrame(e, { variant, mouth: 'talk' })],
      fps: TALK_FPS,
    });
  }
}

describe('party hats (A1M5)', () => {
  it('every portrait at the party has a `party_hat` variant with the full frame contract', () => {
    for (const def of PARTY) expectVariantContract(def, 'party_hat');
  });

  it('each hat adds a gold-striped cone with a white pom-pom to the base frame', () => {
    for (const def of PARTY) {
      for (const e of BASE_EXPRESSIONS) {
        const base = resolve(def, portraitFrame(e));
        const hat = resolve(def, portraitFrame(e, { variant: 'party_hat' }));
        expect(hat, `${def.id} ${e}`).not.toEqual(base);
        const added = new Set<ColorName>();
        hat.forEach((r, y) => {
          for (let x = 0; x < r.length; x++) {
            if (r.charAt(x) === base[y]?.charAt(x)) continue;
            const c = colorOf(def, r.charAt(x));
            if (c !== null) added.add(c);
          }
        });
        expect(added.has('gold.3'), `${def.id} ${e} gold`).toBe(true);
        expect(added.has('white.1'), `${def.id} ${e} pom`).toBe(true);
      }
    }
  });

  it('the hat sits on the head: the face below the brows is the base frame', () => {
    // Rows from the eyes down to the chin, per speaker; Goldie's hat is on her brim, right side.
    const faces: readonly [SpriteDef, number, number][] = [
      [portraitSterling, 14, 30],
      [portraitKip, 16, 30],
      [portraitBricks, 15, 30],
      [portraitGoldie, 19, 33],
    ];
    for (const [def, y0, y1] of faces) {
      for (const e of BASE_EXPRESSIONS) {
        const base = resolve(def, portraitFrame(e));
        const hat = resolve(def, portraitFrame(e, { variant: 'party_hat' }));
        expect(region(hat, 8, y0, 34, y1), `${def.id} ${e}`).toBe(region(base, 8, y0, 34, y1));
      }
    }
  });

  it("Sterling's smile is the same pixels under the hat (the fair-play tell)", () => {
    const { y0, y1 } = STERLING_MOUTH_ROWS;
    const smile = region(resolve(portraitSterling, 'neutral'), 0, y0, 47, y1);
    for (const e of BASE_EXPRESSIONS) {
      const rows = resolve(portraitSterling, portraitFrame(e, { variant: 'party_hat' }));
      expect(region(rows, 0, y0, 47, y1), e).toBe(smile);
    }
  });

  it('Duchess wears a steel thimble; Zibzab swaps his visor cap for his own stock', () => {
    const top = { x0: 36, y0: 21, x1: 42, y1: 27 };
    expect(colorsIn(portraitGoldie, 'party_hat.neutral', top).has('steel.3')).toBe(true);
    expect(colorsIn(portraitGoldie, 'neutral', top).has('steel.3')).toBe(false);
    const cap = { x0: 16, y0: 17, x1: 24, y1: 21 };
    // The cap's welding-glow band (the Vrell e1) is gone; the hat's violet is there instead.
    expect(colorsIn(portraitZibzab, 'neutral', cap).has('orange.4')).toBe(true);
    expect(colorsIn(portraitZibzab, 'party_hat.neutral', cap).has('orange.4')).toBe(false);
    expect(colorsIn(portraitZibzab, 'party_hat.neutral').has('violet.3')).toBe(true);
  });
});

describe('QUILL `damaged` (C4 Keep, finale Phase 2)', () => {
  it('has the frame contract, the scanline flicker and the policy face', () => {
    expectVariantContract(portraitQuill, 'damaged');
    for (const e of [...BASE_EXPRESSIONS, 'policy']) {
      const name = portraitFrame(e, { variant: 'damaged' });
      expect(portraitQuill.frames[name], name).toBeDefined();
      expect(portraitQuill.anims?.[portraitIdleAnim(e, 'damaged')]).toEqual({
        frames: [name, portraitFrame(e, { variant: 'damaged', scan: true })],
        fps: SCAN_FPS,
      });
    }
  });

  it('keeps the eye and the smile of every expression (the crack misses them)', () => {
    for (const e of [...BASE_EXPRESSIONS, 'policy']) {
      for (const mouth of ['closed', 'talk'] as const) {
        const base = resolve(portraitQuill, portraitFrame(e, { mouth }));
        const hurt = resolve(portraitQuill, portraitFrame(e, { variant: 'damaged', mouth }));
        // The eye (11×9 at (19, 17)) and the mouth (13×4 at (18, 28)).
        expect(region(hurt, 19, 17, 29, 25), `${e} eye`).toBe(region(base, 19, 17, 29, 25));
        expect(region(hurt, 18, 28, 30, 31), `${e} ${mouth}`).toBe(region(base, 18, 28, 30, 31));
      }
    }
  });

  it('shows a cracked glass, a torn band and an amber power LED', () => {
    const base = resolve(portraitQuill, 'neutral');
    const hurt = resolve(portraitQuill, 'damaged.neutral');
    for (const path of QUILL_CRACK) {
      for (const [x, y] of path) expect(hurt[y]?.charAt(x), `crack ${x},${y}`).toBe('w');
    }
    const { y0, y1 } = QUILL_TEAR_ROWS;
    for (let y = y0; y <= y1; y++) expect(hurt[y], `tear ${y}`).not.toBe(base[y]);
    expect(colorOf(portraitQuill, hurt[45]?.charAt(39) ?? '.')).toBe('gold.3');
    expect(colorOf(portraitQuill, base[45]?.charAt(39) ?? '.')).toBe('teal.4');
  });

  it('is QUILL, not Purge: the smile stays and the status bar does not appear', () => {
    const hurt = resolve(portraitQuill, 'damaged.happy');
    const purge = resolve(portraitQuill, 'purge.happy');
    expect(region(hurt, 18, 28, 30, 31)).not.toBe(region(purge, 18, 28, 30, 31));
  });
});

describe("Pebble's `singing` in the finale", () => {
  it('exists on the `patch` variant she wears from A3M3 on, eyes closed and mouth round', () => {
    for (const variant of [null, 'cap', 'patch']) {
      const name = portraitFrame('singing', { variant });
      expect(portraitPebble.frames[name], name).toBeDefined();
      expect(portraitPebble.anims?.[portraitTalkAnim('singing', variant)]).toBeDefined();
      expect(resolve(portraitPebble, name)).not.toEqual(
        resolve(portraitPebble, portraitFrame('neutral', { variant })),
      );
    }
  });
});
