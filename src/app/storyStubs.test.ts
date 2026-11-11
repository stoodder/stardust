// The placeholder scenes T710's meta plays until A3M4's dialogue lands (app/storyStubs.ts): valid
// dialogue, C4's three answers in the debrief, and Night Shift's QUILL line by answer.
import { describe, expect, it } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import { validateDialogue } from '../content/validateDialogue.ts';
import { readThrough } from '../story/runner.ts';
import { baseStoryContext, createNewSave } from '../meta/index.ts';
import { STORY_STUB_SCENES, storyScene } from './storyStubs.ts';

describe('story stubs (A3M4 until T720)', () => {
  it('are valid dialogue', () => {
    const known = new Set([...Object.keys(SCENES), ...STORY_STUB_SCENES.map((s) => s.id)]);
    expect(
      validateDialogue({
        maps: [{ map: 'a3_m04', scenes: STORY_STUB_SCENES, barks: [] }],
        shared: [],
        tags: [],
        known,
      }),
    ).toEqual([]);
  });

  it('prefer a registered scene', () => {
    for (const s of STORY_STUB_SCENES) {
      expect(storyScene(s.id)).toBe(SCENES[s.id] ?? s);
    }
    expect(storyScene('a3_m04_no_such_scene')).toBeUndefined();
  });

  it('ask C4 in the debrief, each answer setting quill_choice', () => {
    const debrief = STORY_STUB_SCENES.find((s) => s.id === 'a3_m04_debrief');
    const choice = debrief?.nodes.find((n) => n.kind === 'choice');
    expect(choice?.kind === 'choice' && choice.options.map((o) => o.set)).toEqual([
      { quill_choice: 'purge' },
      { quill_choice: 'keep' },
      { quill_choice: 'rewrite' },
    ]);
  });
});

/** The texts of Night Shift as read under `quill`. */
function nightShift(quill: 'purge' | 'keep' | 'rewrite'): string[] {
  const scene = STORY_STUB_SCENES.find((s) => s.id === 'a3_m04_base_night_shift')!;
  const save = createNewSave();
  save.story.flags.quill_choice = quill;
  const ctx = baseStoryContext(save);
  return readThrough(scene, ctx).lines.map((l) => `${l.speaker}:${l.text}`);
}

describe('Night Shift (stub)', () => {
  it("plays QUILL's line by C4, a silence under Purge", () => {
    expect(nightShift('keep')).toContain(
      "quill:It's 'outstanding in his field,' Pebble. ...Yours is better.",
    );
    expect(nightShift('rewrite')).toContain("quill:I'll have one tomorrow. I'm writing it.");
    expect(nightShift('purge')).toContain('quill:');
    for (const q of ['purge', 'keep', 'rewrite'] as const) {
      const lines = nightShift(q);
      expect(lines.length, q).toBeLessThanOrEqual(8);
      expect(lines.at(-1)).toBe('pebble:(squeak) Again!');
      expect(lines.filter((l) => l.startsWith('quill:'))).toHaveLength(1);
    }
  });
});
