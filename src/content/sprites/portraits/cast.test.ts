// Portrait batch 2 (T310b; art-direction § Portrait roster, characters.md): Zibzab, Goldie, Kip,
// Prim, and Gerald's icon. Every Act I speaker with a portrait or icon has one registered, with
// the frame contract the dialogue panel asks for; and each character keeps its tell.
import { describe, expect, it } from 'vitest';
import { ACT1_SPEAKERS, SPEAKER_DEFS } from '../../dialogue/speakers.ts';
import { ALL_SPRITES } from '../all.ts';
import type { FrameDef, PatchFrame, SpriteDef } from '../types.ts';
import { portraitGerald } from './gerald.ts';
import { portraitGoldie } from './goldie.ts';
import { portraitKip } from './kip.ts';
import {
  BASE_EXPRESSIONS,
  portraitFrame,
  portraitIdleAnim,
  portraitTalkAnim,
  PORTRAIT_SIZE,
  SCAN_FPS,
  TALK_FPS,
} from './portrait.ts';
import { portraitPrim } from './prim.ts';
import { portraitZibzab, ZIBZAB_FACES } from './zibzab.ts';

const BATCH: readonly SpriteDef[] = [portraitZibzab, portraitGoldie, portraitKip, portraitPrim];

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
function colorsOf(def: SpriteDef, name: string): Set<string> {
  const legend: Readonly<Record<string, string>> = def.legend ?? {};
  return new Set(
    resolve(def, name)
      .join('')
      .split('')
      .map((ch) => legend[ch] ?? ch),
  );
}

describe('portrait batch 2', () => {
  it.each(BATCH.map((d) => [d.id, d] as const))(
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

  it('registers a portrait (or icon) for every Act I speaker that shows one', () => {
    const ids = new Set<string>(ALL_SPRITES.map((s) => s.id));
    for (const id of ACT1_SPEAKERS) {
      const portrait = SPEAKER_DEFS[id].portrait;
      if (portrait !== null) expect(ids.has(portrait), portrait).toBe(true);
    }
  });
});

describe('Zibzab: a Vrell, not a human', () => {
  it('wears the Vrell faction palette and no human skin anywhere', () => {
    expect(portraitZibzab.palette).toBe('vrell');
    for (const e of BASE_EXPRESSIONS) {
      for (const mouth of ['closed', 'talk'] as const) {
        const used = [...colorsOf(portraitZibzab, portraitFrame(e, { mouth }))];
        expect(
          used.filter((c) => c.startsWith('skin.')),
          e,
        ).toEqual([]);
        // Brass (p), rust (s), and patina (a) all show: shell, rim and claw, body.
        for (const slot of ['3', '7', 'c']) expect(used, `${e}: slot ${slot}`).toContain(slot);
      }
    }
  });

  it('moves his eyestalks independently: in neutral one eye watches you, the other the goods', () => {
    const { left, right } = ZIBZAB_FACES['neutral'] ?? {};
    if (left === undefined || right === undefined) throw new Error('no neutral face');
    // A mirrored pair would look the same way, mirrored; his don't.
    expect(left.look[0]).not.toBe(-right.look[0]);
    // Every expression places its stalks somewhere else.
    const tips = new Set(
      Object.values(ZIBZAB_FACES).map((f) => [...f.left.at, ...f.right.at].join(',')),
    );
    expect(tips.size).toBe(Object.keys(ZIBZAB_FACES).length);
  });
});

describe('Goldie and Kip keep their tells in every expression', () => {
  it('Goldie: the sun hat (straw), the overalls (green), and Duchess', () => {
    for (const e of BASE_EXPRESSIONS) {
      const used = colorsOf(portraitGoldie, e);
      for (const c of ['brass.4', 'green.2', 'green.4', 'coral.2']) expect(used, e).toContain(c);
    }
  });

  it('Kip: the backwards cap, the sunglasses, and the gold #1 trophy pin', () => {
    for (const e of BASE_EXPRESSIONS) {
      const used = colorsOf(portraitKip, e);
      for (const c of ['4', 'ink.3', 'gold.3', '8']) expect(used, e).toContain(c);
    }
  });
});

describe('Prim: an Auditor on a comms screen', () => {
  it('flickers its scanlines in every expression, like QUILL', () => {
    for (const e of BASE_EXPRESSIONS) {
      const scan = portraitFrame(e, { scan: true });
      expect(resolve(portraitPrim, scan)).not.toEqual(resolve(portraitPrim, e));
      expect(portraitPrim.anims?.[portraitIdleAnim(e)]).toEqual({
        frames: [e, scan],
        fps: SCAN_FPS,
      });
    }
  });

  it('shows its eyes in the Auditor orange, never QUILL teal', () => {
    for (const e of BASE_EXPRESSIONS) {
      const used = colorsOf(portraitPrim, e);
      expect(used).toContain('d');
      expect(used.has('9'), e).toBe(false);
    }
  });
});

describe('Gerald: a 16×16 icon that chimes', () => {
  it('is authored 14×14 and outlined to 16×16, with one face and its talk frame', () => {
    expect(portraitGerald.size).toEqual({ w: 14, h: 14 });
    expect(portraitGerald.outline).toBe('auto');
    expect(Object.keys(portraitGerald.frames)).toEqual(['neutral', 'neutral_talk']);
    expect(resolve(portraitGerald, 'neutral_talk')).not.toEqual(resolve(portraitGerald, 'neutral'));
    expect(portraitGerald.anims?.[portraitTalkAnim('neutral')]).toEqual({
      frames: ['neutral', 'neutral_talk'],
      fps: TALK_FPS,
    });
  });

  it('lights his chime lamp gold only while he chimes', () => {
    expect(colorsOf(portraitGerald, 'neutral').has('gold.3')).toBe(false);
    expect(colorsOf(portraitGerald, 'neutral_talk').has('gold.3')).toBe(true);
  });
});
