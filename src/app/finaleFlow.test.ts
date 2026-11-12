// The campaign's close after the finale's card (T800b; D154; content/dialogue/resultsFlow.ts
// `ending`): a first win plays Sterling's memo, C5, the epilogue, then the post-game star map; a
// later win, C5 answered, goes straight to the post-game; other maps and losses play none; and the
// pieces not landed yet are placeholders naming their task.
import { describe, expect, it } from 'vitest';
import { sceneById } from '../content/dialogue/index.ts';
import { resultsFlow } from '../content/dialogue/resultsFlow.ts';
import { MEMOS } from '../content/memos/index.ts';
import { createNewSave } from '../meta/saveData.ts';
import { endingPlaceholder, endingSteps } from './finaleFlow.ts';

describe('the finale close (RESULTS_FLOW.fin_m01)', () => {
  const unanswered = createNewSave();
  const answered = createNewSave();
  answered.story.flags.ending_choice = 'go';

  it('plays Dawn before the card', () => {
    expect(resultsFlow('fin_m01').beforeResults).toEqual(['fin_m01_scene_dawn']);
  });

  it('on the win that leaves C5 to answer: the memo, C5, the epilogue, the post-game', () => {
    expect(endingSteps('fin_m01', true, unanswered)).toEqual([
      { memo: 'memo_fin_01' },
      { scene: 'fin_m01_scene_c5' },
      { screen: 'epilogue' },
      { screen: 'post_game' },
    ]);
  });

  it('never re-asks C5: a later win goes to the post-game star map', () => {
    expect(endingSteps('fin_m01', true, answered)).toEqual([{ screen: 'post_game' }]);
  });

  it('plays nothing after a loss, or after any other map', () => {
    expect(endingSteps('fin_m01', false, unanswered)).toEqual([]);
    expect(endingSteps('a3_m06', true, unanswered)).toEqual([]);
    expect(endingSteps('dev_range', true, unanswered)).toEqual([]);
  });

  it('names what each step waits for until it lands', () => {
    const steps = endingSteps('fin_m01', true, unanswered);
    expect(steps.map((s) => endingPlaceholder(s))).toEqual([
      null,
      null,
      null,
      null,
    ]);
    // The memo and C5's scene are T811's, registered: Sterling's farewell, and C5's choice.
    expect(MEMOS.memo_fin_01?.subject).toBe('Clean Exit Complete!');
    const c5 = sceneById('fin_m01_scene_c5');
    const choice = c5?.nodes.find((n) => n.kind === 'choice');
    expect(choice?.kind === 'choice' ? choice.options.map((o) => o.set) : []).toEqual([
      { ending_choice: 'stay' },
      { ending_choice: 'go' },
    ]);
    expect(endingPlaceholder({ memo: 'memo_fin_99' })).toBe(
      "memo memo_fin_99 isn't registered yet",
    );
    expect(endingPlaceholder({ scene: 'fin_m01_scene_nope' })).toBe(
      "scene fin_m01_scene_nope isn't registered yet",
    );
    expect(endingPlaceholder({ screen: 'epilogue' }, ['epilogue'])).toBeNull();
    expect(endingPlaceholder({ scene: 'a3_m01_scene_song' })).toBeNull();
    expect(endingPlaceholder({ memo: 'memo_a1_00' })).toBeNull();
  });
});
