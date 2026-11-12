// M8 review round 1's app pieces (D156): the HUD tracker's objective progress ("Waymarks 2/4", A7),
// C5's keys and voices (A5: 1 and 2 answer, the hint in words, Pebble and Ves'thara by Stay and
// Bramble by Go), and the "8 of yours answer it" toggle's trailing chevron (A8).
import { describe, expect, it } from 'vitest';
import { RAW_CONTENT } from '../content/registry.ts';
import { disclosureState } from '../ui/components/Disclosure.tsx';
import { choiceKeysHint, optionKey } from '../ui/dialogue/choiceLock.ts';
import type { LineView } from '../ui/dialogue/state.ts';
import { answersLabel } from '../ui/hud/briefingView.ts';
import { battleConfig } from './battleSetup.ts';
import { ENDING_VOICES, optionVoices } from './dialogue.ts';
import { objectiveProgress, objectiveViews } from './hudViews.ts';

describe("the tracker's objective progress (A7)", () => {
  const map = battleConfig('fin_m01', 1, null).content.maps['fin_m01']!;
  const tile = (m: string): number => {
    const pos = map.markers[m]!;
    return pos[1] * map.cols + pos[0];
  };

  it('counts the Waymarks lanterns relit, of four', () => {
    const w = map.objectives.find((o) => o.id === 'waymarks')!;
    const c = w.condition;
    if (!('cleared' in c)) throw new Error('Waymarks counts cleared markers');
    expect(objectiveProgress(map, [])).toEqual({ waymarks: { n: 0, of: 4 } });
    const two = [tile(c.cleared[0]!), tile(c.cleared[2]!), 9999];
    expect(objectiveProgress(map, two)).toEqual({ waymarks: { n: 2, of: 4 } });
    const views = objectiveViews(map, {}, [], {}, objectiveProgress(map, two));
    expect(views[0]).toMatchObject({ name: 'Waymarks', progress: { n: 2, of: 4 } });
  });

  it("leaves an objective that counts nothing without progress (A1M4's Clean Audit)", () => {
    const a14 = battleConfig('a1_m04', 1, null).content.maps['a1_m04']!;
    expect(objectiveProgress(a14, [])).toEqual({});
    expect(objectiveViews(a14)[0]?.progress).toBeUndefined();
  });

  it('every content map with a counting objective names a marker it has', () => {
    for (const m of Object.values(RAW_CONTENT.maps)) {
      for (const o of m.objectives ?? []) {
        const c = o.condition;
        if ('cleared' in c) for (const id of c.cleared) expect(m.markers?.[id], id).toBeDefined();
      }
    }
  });
});

/** A line said in the scene, as `optionVoices` reads it. */
const said = (speaker: string, id: number): LineView =>
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- only what optionVoices reads
  ({ id, speaker, portrait: { sprite: `portrait.${speaker}` } }) as unknown as LineView;

describe("C5's keys and voices (A5)", () => {
  it('a number key names its badge (1 → the first), nothing else does', () => {
    expect(optionKey('Digit1')).toBe(0);
    expect(optionKey('Digit2')).toBe(1);
    expect(optionKey('Numpad2')).toBe(1);
    expect(optionKey('Digit0')).toBeNull();
    expect(optionKey('KeyA')).toBeNull();
    expect(optionKey('Enter')).toBeNull();
  });

  it('the hint says the keys in words (Silkscreen has no arrows)', () => {
    expect(choiceKeysHint(2)).toBe('Keys: 1 or 2, or arrows and Enter');
    expect(choiceKeysHint(3)).toBe('Keys: 1, 2 or 3, or arrows and Enter');
    expect(choiceKeysHint(2)).not.toMatch(/[↑↓▸]/);
  });

  it('Pebble and Ves’thara by Stay, Bramble by Go: their last lines in the scene', () => {
    expect(ENDING_VOICES).toEqual({ stay: ['pebble', 'vesthara'], go: ['chitterbloom'] });
    const transcript = [
      said('goldie', 1),
      said('pebble', 2),
      said('vesthara', 3),
      said('chitterbloom', 4),
      said('zibzab', 5),
    ];
    const stay = optionVoices({ set: { ending_choice: 'stay' } }, transcript);
    expect(stay.map((v) => [v.speaker, v.id])).toEqual([
      ['pebble', 2],
      ['vesthara', 3],
    ]);
    const go = optionVoices({ set: { ending_choice: 'go' } }, transcript);
    expect(go.map((v) => v.speaker)).toEqual(['chitterbloom']);
    // Any other choice has none; a voice not yet heard isn't drawn.
    expect(optionVoices({ set: { quill_choice: 'keep' } }, transcript)).toEqual([]);
    expect(optionVoices({}, transcript)).toEqual([]);
    expect(optionVoices({ set: { ending_choice: 'go' } }, transcript.slice(0, 3))).toEqual([]);
  });
});

describe('"8 of yours answer it ▸" (A8)', () => {
  it('reads the count first, its mark after (never "+8")', () => {
    expect(answersLabel(8)).toBe('8 of yours answer it');
    const s = disclosureState(false, 'r', { label: answersLabel(8) });
    expect(s.text).toBe('8 of yours answer it');
    expect(s.text.startsWith('+')).toBe(false);
  });
});
