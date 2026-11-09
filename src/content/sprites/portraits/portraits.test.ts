// Portrait rules (art-direction § Portrait roster, style-guide §5.2, characters.md): every
// expression with talking mouths, QUILL's policy tell and party hat, the player's faceless helmet,
// Sterling's fixed smile, and Bricks's scar.
import { describe, expect, it } from 'vitest';
import { luminance } from '../../palettes/color.ts';
import { rgbOf } from '../../palettes/master.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { portraitBricks } from './bricks.ts';
import { portraitPlayer } from './player.ts';
import {
  BASE_EXPRESSIONS,
  diffPatch,
  portraitFrame,
  portraitTalkAnim,
  PORTRAIT_SIZE,
} from './portrait.ts';
import { portraitQuill } from './quill.ts';
import { portraitSterling, STERLING_EYE_ROWS, STERLING_MOUTH_ROWS } from './sterling.ts';

const PORTRAITS: readonly SpriteDef[] = [
  portraitPlayer,
  portraitBricks,
  portraitQuill,
  portraitSterling,
];

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

function colorsUsed(def: SpriteDef, name: string): Set<string> {
  return new Set(resolve(def, name).join(''));
}

describe('portraits', () => {
  it.each(PORTRAITS.map((d) => [d.id, d] as const))(
    '%s: 48×48 with every base expression, each with a talking mouth and a talk anim',
    (_id, def) => {
      expect(def.size).toEqual({ w: PORTRAIT_SIZE, h: PORTRAIT_SIZE });
      const seen = new Set<string>();
      for (const e of BASE_EXPRESSIONS) {
        const closed = resolve(def, portraitFrame(e));
        const talk = resolve(def, portraitFrame(e, { mouth: 'talk' }));
        expect(closed).toHaveLength(PORTRAIT_SIZE);
        expect(closed.every((r) => r.length === PORTRAIT_SIZE)).toBe(true);
        expect(talk, `${e}_talk opens the mouth`).not.toEqual(closed);
        const anim = def.anims?.[portraitTalkAnim(e)];
        expect(anim).toEqual({ frames: [portraitFrame(e), `${e}_talk`], fps: 8 });
        seen.add(closed.join('\n'));
      }
      expect(seen.size, 'the five expressions are five different faces').toBe(5);
    },
  );

  it('authors expressions as patches over the neutral base frame', () => {
    for (const def of PORTRAITS) {
      expect(Array.isArray(def.frames['neutral'])).toBe(true);
      for (const e of BASE_EXPRESSIONS.slice(1)) {
        const fd = def.frames[e];
        expect(fd !== undefined && isPatch(fd) && fd.from === 'neutral').toBe(true);
      }
    }
  });

  it('diffPatch keeps unchanged pixels and returns null for identical grids', () => {
    expect(diffPatch(['ab', 'cd'], ['ab', 'cd'])).toBeNull();
    expect(diffPatch(['ab', 'cd'], ['ab', 'xd'])).toEqual({ x: 0, y: 1, rows: ['x'] });
    expect(diffPatch(['abc', 'def'], ['xbc', 'dex'])).toEqual({ x: 0, y: 0, rows: ['x  ', '  x'] });
  });
});

describe('the player: no face is ever drawn', () => {
  it('uses no skin colors anywhere, in any frame', () => {
    const legend = Object.values(portraitPlayer.legend ?? {});
    expect(legend.filter((c) => c.startsWith('skin.'))).toEqual([]);
  });

  it('has the reflect_confetti variant with every expression and talking mouth', () => {
    for (const e of BASE_EXPRESSIONS) {
      const base = resolve(portraitPlayer, portraitFrame(e));
      const party = resolve(portraitPlayer, portraitFrame(e, { variant: 'reflect_confetti' }));
      expect(party).not.toEqual(base);
      expect(
        portraitPlayer.frames[portraitFrame(e, { variant: 'reflect_confetti', mouth: 'talk' })],
      ).toBeDefined();
    }
  });
});

describe('QUILL', () => {
  const expressions = [...BASE_EXPRESSIONS, 'policy'];

  it('has the policy tell: a flat-line mouth, same eye as neutral', () => {
    const neutral = resolve(portraitQuill, 'neutral');
    const policy = resolve(portraitQuill, 'policy');
    const changed = neutral.flatMap((r, y) => (r === policy[y] ? [] : [y]));
    expect(changed.length).toBeGreaterThan(0);
    // Only the mouth rows change (the eye sits above row 27).
    expect(Math.min(...changed)).toBeGreaterThanOrEqual(27);
  });

  it('flashes the whole screen corporate yellow for one 125 ms frame as a policy line starts', () => {
    for (const variant of [null, 'party_hat']) {
      const flash = portraitFrame('policy_flash', { variant });
      const used = colorsUsed(portraitQuill, flash);
      const legend: Readonly<Record<string, string>> = portraitQuill.legend ?? {};
      const colors = [...used].map((ch) => legend[ch] ?? ch);
      // No teal left on the screen: only gold (plus the steel bezel and the hat).
      expect(colors.some((c) => c.startsWith('teal.'))).toBe(false);
      expect(colors).toContain('gold.3');
      const anim = portraitQuill.anims?.[`${variant === null ? '' : 'party_hat.'}policy_in`];
      expect(anim).toEqual({
        frames: [flash, portraitFrame('policy', { variant })],
        fps: 8,
        loop: false,
      });
    }
  });

  it('flickers its scanlines and wears the party hat in every expression', () => {
    for (const e of expressions) {
      for (const variant of [null, 'party_hat']) {
        const name = portraitFrame(e, { variant });
        const scan = resolve(portraitQuill, portraitFrame(e, { variant, scan: true }));
        expect(scan).not.toEqual(resolve(portraitQuill, name));
        expect(portraitQuill.frames[portraitFrame(e, { variant, mouth: 'talk' })]).toBeDefined();
      }
      // The hat sits above the hexagon, in rows the base frame keeps for the screen.
      const hat = resolve(portraitQuill, portraitFrame(e, { variant: 'party_hat' }));
      const bare = resolve(portraitQuill, portraitFrame(e));
      expect(hat.slice(0, 14)).not.toEqual(bare.slice(0, 14));
    }
  });
});

/** Sterling's mouth band rows of a frame. */
function band(rows: string[]): string[] {
  return rows.slice(STERLING_MOUTH_ROWS.y0, STERLING_MOUTH_ROWS.y1 + 1);
}

describe('Sterling: the same smile in every expression', () => {
  const { y0, y1 } = STERLING_EYE_ROWS;

  it('patches only the eye and brow rows, never the mouth band', () => {
    expect(y1).toBeLessThan(STERLING_MOUTH_ROWS.y0);
    for (const e of BASE_EXPRESSIONS.slice(1)) {
      const fd = portraitSterling.frames[e];
      if (fd === undefined || !isPatch(fd)) throw new Error(`${e} is not a patch`);
      for (const p of Array.isArray(fd.patch) ? fd.patch : [fd.patch]) {
        expect(p.y).toBeGreaterThanOrEqual(y0);
        expect(p.y + p.rows.length - 1).toBeLessThanOrEqual(y1);
      }
    }
  });

  it('keeps the mouth band identical across expressions, closed and talking', () => {
    for (const mouth of ['closed', 'talk'] as const) {
      const ref = band(resolve(portraitSterling, portraitFrame('neutral', { mouth })));
      for (const e of BASE_EXPRESSIONS) {
        expect(band(resolve(portraitSterling, portraitFrame(e, { mouth })))).toEqual(ref);
      }
    }
  });
});

describe('Bricks', () => {
  it('keeps the scar through his left eyebrow in every expression', () => {
    for (const e of BASE_EXPRESSIONS) {
      expect(resolve(portraitBricks, e).join('')).toMatch(/F/);
    }
  });

  it('has dark skin: his face is mostly the deep skin ramp', () => {
    const legend: Readonly<Record<string, string>> = portraitBricks.legend ?? {};
    const face = resolve(portraitBricks, 'neutral')
      .slice(8, 28)
      .map((r) => r.slice(14, 34))
      .join('');
    const counts = new Map<string, number>();
    for (const ch of face) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    const [top] = [...counts].toSorted((a, b) => b[1] - a[1])[0] ?? ['?'];
    expect(legend[top]).toMatch(/^skin\.c\./);
    const dark = luminance(rgbOf('skin.c.2'));
    expect(dark).toBeLessThan(luminance(rgbOf('skin.a.2')));
  });
});
