// A2M4's scene branches (content/dialogue/a2/a2_m04/scenes.ts) as the runner plays them, which the
// canon check (tools/dialogueCanon.test.ts, text only) can't see: the truth scene's early-ask line,
// and the debrief's C2 shape (T510 reads it on Results). It lives here because content may not
// import story (shared/architecture.test.ts).
import { describe, expect, it } from 'vitest';
import { scenes } from '../content/dialogue/a2/a2_m04/scenes.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import type { StoryContext } from './conditions.ts';
import { readThrough } from './runner.ts';

const scene = (id: string) => scenes.find((s) => s.id === id)!;
const ctx = (flags: FlagSet, run: StoryContext['run'] = null, stardust = 0): StoryContext => ({
  flags,
  map: 'a2_m04',
  pestsProcessed: 0,
  seen: [],
  run,
  bank: { stardust, intel: 0 },
});
const texts = (id: string, c: StoryContext) => readThrough(scene(id), c).lines.map((l) => l.text);

describe('A2M4 scenes', () => {
  it('pays off the early ask in the truth scene, and only then', () => {
    const asked = texts('a2_m04_scene_truth', ctx({ asked_zibzab_early: true }));
    expect(asked).toContain('You asked me in the afternoon. I told you. You kept buying.');
    const not = texts('a2_m04_scene_truth', ctx({}));
    expect(not).not.toContain('You asked me in the afternoon. I told you. You kept buying.');
    // Both rest on the player's reply: three tones, no flag.
    for (const c of [ctx({}), ctx({ asked_zibzab_early: true })]) {
      const step = readThrough(scene('a2_m04_scene_truth'), c).cursor.step;
      expect(step.kind).toBe('choice');
      if (step.kind !== 'choice') continue;
      expect(step.node.options.map((o) => [o.tone, o.set])).toEqual([
        ['earnest', undefined],
        ['wry', undefined],
        ['quiet', undefined],
      ]);
    }
  });

  it('offers C2 on a win with a bank, sets none with an empty one, nothing on a replay or a loss', () => {
    const won = { outcome: 'won' as const, ruleFlags: {} };
    const offer = readThrough(scene('a2_m04_debrief'), ctx({}, won, 625));
    expect(offer.lines.map((l) => l.speaker)).toEqual(['sterling', 'sterling', 'zibzab', 'zibzab']);
    expect(offer.cursor.step.kind).toBe('choice');
    if (offer.cursor.step.kind === 'choice') {
      expect(offer.cursor.step.node.options.map((o) => o.set)).toEqual([
        { stardust_choice: 'sold' },
        { stardust_choice: 'returned' },
      ]);
    }
    const empty = readThrough(scene('a2_m04_debrief'), ctx({}, won, 0));
    expect(empty.lines.at(-1)?.text).toBe('No refunds. I did say.');
    expect(empty.cursor.effects.flags).toEqual({ stardust_choice: 'none' });
    // A replay after C2: Sterling's lines, then nothing more (no offer, no "No refunds").
    for (const [choice, bank] of [
      ['sold', 0],
      ['returned', 0],
      ['none', 300],
    ] as const) {
      const replay = readThrough(
        scene('a2_m04_debrief'),
        ctx({ stardust_choice: choice }, won, bank),
      );
      expect(
        replay.lines.map((l) => l.speaker),
        choice,
      ).toEqual(['sterling', 'sterling']);
      expect(replay.cursor.step.kind, choice).toBe('end');
      expect(replay.cursor.effects.flags, choice).toEqual({});
    }
    const lost = texts('a2_m04_debrief', ctx({}, { outcome: 'lost', ruleFlags: {} }, 625));
    expect(lost).toEqual(['No charge for that one, Technician. Go again.']);
  });
});
