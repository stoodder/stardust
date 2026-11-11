// Prim's PA for Everglow Security, part two (T703; act3.md § Act III barks): the first time the
// save meets each new unit, Prim greets it on the radio, on any Act III map that sends them, QUILL
// on the radio or not (C4 Rewrite), and never in another act or without her on the radio.
import { describe, expect, it } from 'vitest';
import { act3Barks } from '../content/dialogue/barks/act3.ts';
import { SHARED_BARKS } from '../content/dialogue/barks/index.ts';
import { TEXT_LIMITS } from '../content/dialogue/rules.ts';
import { newBarkState, pickBark } from '../story/barks.ts';
import type { StoryContext } from '../story/conditions.ts';
import { presentSpeakers } from './dialogue.ts';

const ctx = (map: StoryContext['map']): StoryContext => ({
  flags: {},
  map,
  pestsProcessed: 0,
  seen: [],
  run: null,
});

describe("Prim's PA for the part-two units", () => {
  it('one greeting per unit, all shared, all within the bark limit', () => {
    expect(act3Barks.map((b) => b.trigger)).toEqual(
      ['associate', 'liability', 'gunship', 'blackbudget'].map((enemy) => ({
        on: 'new_enemy',
        enemy,
      })),
    );
    for (const b of act3Barks) {
      expect(b.speaker).toBe('prim');
      expect(SHARED_BARKS).toContain(b);
      expect(b.text.length).toBeLessThanOrEqual(TEXT_LIMITS.bark);
    }
  });

  it('plays on its unit’s first sighting in Act III, with or without QUILL', () => {
    for (const present of [
      presentSpeakers({ companion: null }, true),
      ['prim'] as const, // QUILL offline (Rewrite)
    ]) {
      const picked = pickBark(
        SHARED_BARKS,
        { trigger: { on: 'new_enemy', enemy: 'gunship' }, atSec: 10, present },
        newBarkState(1),
        ctx('a3_m06'),
      );
      expect(picked.bark?.id).toBe('prim_new_enemy_a3_03');
    }
  });

  it('never without Prim on the radio, nor outside Act III', () => {
    const offer = { trigger: { on: 'new_enemy', enemy: 'liability' }, atSec: 10 } as const;
    expect(
      pickBark(SHARED_BARKS, { ...offer, present: ['quill'] }, newBarkState(1), ctx('a3_m04')).bark,
    ).toBeNull();
    expect(
      pickBark(
        SHARED_BARKS,
        { ...offer, present: ['quill', 'prim'] },
        newBarkState(1),
        ctx('a2_m04'),
      ).bark,
    ).toBeNull();
  });
});
