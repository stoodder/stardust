// The dialogue UI's pure parts (T302b): how a line types and draws (emphasis, the sun glyph, the
// typewriter's pace, the Hollow's distortion), which portrait frame shows, and the dev dialogue
// the smoke flows play (validated like real dialogue).
import { describe, expect, it } from 'vitest';
import { portraitQuill } from '../../content/sprites/portraits/quill.ts';
import { portraitBricks } from '../../content/sprites/portraits/bricks.ts';
import { validateDialogue } from '../../content/validateDialogue.ts';
import { GLYPH_CHARS } from '../../story/text.ts';
import { DEV_BARKS, DEV_SCENES } from './dev.ts';
import { expressionChain, pickFrame } from './portraitFrames.ts';
import {
  distort,
  plainText,
  restSegments,
  revealedAt,
  revealSegments,
  segments,
  TYPE_CPS,
  typedLength,
  typeMs,
} from './text.ts';

describe('line text', () => {
  it('splits out the one *emphasis* and the sun glyph', () => {
    expect(segments('Do *NOT* shoot Gerald.')).toEqual([
      { kind: 'text', text: 'Do ', em: false },
      { kind: 'text', text: 'NOT', em: true },
      { kind: 'text', text: ' shoot Gerald.', em: false },
    ]);
    expect(segments(`Regards, Joy ${GLYPH_CHARS.sun}`)).toEqual([
      { kind: 'text', text: 'Regards, Joy ', em: false },
      { kind: 'sun' },
    ]);
    expect(segments('a * b')).toEqual([{ kind: 'text', text: 'a * b', em: false }]);
    expect(plainText(`*Hi* ${GLYPH_CHARS.sun}`)).toBe('Hi sun');
  });

  it(`types about ${TYPE_CPS} characters a second, the marks not counted`, () => {
    expect(typedLength('*abc*de')).toBe(5);
    expect(typeMs('x'.repeat(40))).toBe(1000);
    expect(revealedAt('x'.repeat(40), 500)).toBe(20);
    expect(revealedAt('x'.repeat(40), 5000)).toBe(40);
    expect(revealedAt('abc', -10)).toBe(0);
  });

  it('cuts a line at its typed length, the rest held for the layout', () => {
    const text = 'Do *NOT* shoot.';
    expect(revealSegments(text, 5)).toEqual([
      { kind: 'text', text: 'Do ', em: false },
      { kind: 'text', text: 'NO', em: true },
    ]);
    expect(restSegments(text, 5)).toEqual([
      { kind: 'text', text: 'T', em: true },
      { kind: 'text', text: ' shoot.', em: false },
    ]);
    const all = typedLength(text);
    expect(revealSegments(text, all)).toEqual(segments(text));
    expect(restSegments(text, all)).toEqual([]);
  });

  it("drops and nudges some of the Hollow's letters, the same for the same roll", () => {
    const text = '...brigh— every... every... every...';
    const a = distort(text, 7);
    expect(a).toEqual(distort(text, 7));
    expect(a).toHaveLength(text.length);
    expect(a.some((c, i) => c.ch !== text[i])).toBe(true);
    expect(a.every((c, i) => c.ch === text[i] || c.ch === ' ')).toBe(true);
    expect(distort(text, 8)).not.toEqual(a);
  });
});

/** A sprite's frame names. */
const frames = (def: { frames?: object }): ReadonlySet<string> =>
  new Set(Object.keys(def.frames ?? {}));

describe('portrait frames', () => {
  it('tries the expression, its base, then neutral', () => {
    expect(expressionChain('singing')).toEqual(['singing', 'happy', 'neutral']);
    expect(expressionChain('angry')).toEqual(['angry', 'neutral']);
  });

  it("picks QUILL's frames: talk, scanline, the policy flash, and the party hat", () => {
    const q = frames(portraitQuill);
    expect(pickFrame(q, null, 'happy', 'rest')).toBe('happy');
    expect(pickFrame(q, null, 'happy', 'talk')).toBe('happy_talk');
    expect(pickFrame(q, null, 'happy', 'scan')).toBe('happy_scan');
    expect(pickFrame(q, null, 'policy', 'flash')).toBe('policy_flash');
    expect(pickFrame(q, null, 'happy', 'flash')).toBe('happy');
    expect(pickFrame(q, 'party_hat', 'policy', 'flash')).toBe('party_hat.policy_flash');
    expect(pickFrame(q, 'party_hat', 'sad', 'talk')).toBe('party_hat.sad_talk');
  });

  it('falls back to the base frame for a variant the art lacks, and neutral for an expression', () => {
    const b = frames(portraitBricks);
    expect(pickFrame(b, 'pebble', 'sad', 'talk')).toBe('sad_talk');
    expect(pickFrame(b, null, 'singing', 'rest')).toBe('happy');
    expect(pickFrame(b, null, 'policy', 'flash')).toBe('neutral');
    expect(pickFrame(new Set(), null, 'neutral', 'rest')).toBeNull();
  });
});

describe('dev dialogue', () => {
  it('is valid dialogue (the smoke flows play it like the real thing)', () => {
    const known = new Set([...DEV_SCENES.map((s) => s.id), ...DEV_BARKS.map((b) => b.id)]);
    expect(
      validateDialogue({
        maps: [{ map: 'a1_m01', scenes: DEV_SCENES, barks: DEV_BARKS }],
        shared: [],
        tags: [],
        known,
      }),
    ).toEqual([]);
  });
});
