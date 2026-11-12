// T810, the campaign's close (app/ending.ts): the steps a won finale plays after its card (the memo
// card, C5's scene, the epilogue, then the post-game star map in place of the way on), a replay's
// (the post-game only, only on Continue), the epilogue's cards per flag set with their tokens
// resolved, "Watch the epilogue", C5 committed once through the scene's effects, the Dawn scene
// unskippable the first time, the stages' rules (Dawn's frames, C5's form), the epilogue's
// timeline, and Results' "Voices held" (the fewest that sang, not the choir Dawn woke).
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { sceneById, type Scene } from '../content/dialogue/index.ts';
import { EPILOGUE_SLOTS } from '../content/dialogue/epilogue.ts';
import { readThrough } from '../story/runner.ts';
import { DAWN_CUES, dawnFrame } from '../ui/screens/dawn.ts';
import { c5Label, filedClauses } from '../ui/screens/c5.ts';
import {
  beatMs,
  cardMs,
  COUNTER_ZERO_MS,
  counterFlipped,
  creditsMs,
  epilogueBeats,
  FINAL_IMAGES,
  stillFrameAt,
} from '../ui/screens/epilogue.ts';
import { endingScreen } from '../ui/screens/epilogueState.ts';
import { stagingOf } from '../ui/dialogue/staging.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { baseStoryContext } from '../meta/story.ts';
import type { SaveData } from '../meta/index.ts';

const played: { scene: Scene; opts: Record<string, unknown> }[] = [];
let dialogueOn = true;
/** What C5's scene answers when the mock plays it. */
let answer: 'stay' | 'go' = 'go';

vi.mock('./dialogue.ts', async (original) => {
  const real = await original<typeof import('./dialogue.ts')>();
  return {
    ...real,
    dialogueEnabled: () => dialogueOn,
    playScene: (
      scene: Scene,
      opts: { onEnd?: (fx: { flags: Record<string, unknown>; callsign: null }) => void },
    ) => {
      played.push({ scene, opts });
      opts.onEnd?.({ flags: { ending_choice: answer }, callsign: null });
    },
  };
});

const { asksC5, playEnding, registerEnding, setPostGameRoute } = await import('./ending.ts');
const { closeEndingScreen, ENDING_PLAYER, epilogueFlags, epilogueView } =
  await import('./endingPlay.ts');
registerEnding(ENDING_PLAYER);
const { activeSave, closeSession, loadDevSave, updateActiveSave } = await import('./save.ts');
const { endingSteps } = await import('./finaleFlow.ts');
const { unskippable } = await import('./runFlow.ts');
const { withSceneEffects } = await import('./dialogue.ts');
const { resultsStats, voicesHeld } = await import('./runResult.ts');

/** The finale won (Dawn seen), C5 still to answer: after_fin_stay with the answer taken back. */
function finaleWonUnanswered(): SaveData {
  expect(loadDevSave('after_fin_stay')).toBe(true);
  updateActiveSave((s) => {
    const { ending_choice: _, ...flags } = s.story.flags;
    return { ...s, story: { ...s.story, flags } };
  });
  return activeSave()!;
}

let routed: string[] = [];

beforeEach(() => {
  played.length = 0;
  dialogueOn = true;
  answer = 'go';
  routed = [];
  setPostGameRoute(() => routed.push('post_game'));
});

afterEach(() => {
  endingScreen.value = null;
  closeSession();
});

describe("a won finale's close (finale.md § FIN; core-loop.md § 6.8)", () => {
  it('first win: the memo card, C5 (Esc held), the epilogue, then the post-game star map', () => {
    const save = finaleWonUnanswered();
    const steps = endingSteps('fin_m01', true, save);
    expect(asksC5(steps)).toBe(true);
    const go = vi.fn();
    playEnding(steps, { record: true, onward: false }, go);

    // Sterling's farewell, on its letterhead, resolved.
    const memo = endingScreen.value;
    expect(memo?.kind).toBe('memo');
    if (memo?.kind !== 'memo') return;
    expect(memo.memo.subject).toBe('Clean Exit Complete!');
    expect(memo.memo.paragraphs.join(' ')).not.toMatch(/[{}]/);
    closeEndingScreen();
    expect(activeSave()!.story.memosRead).toContain('memo_fin_01');

    // C5, full-screen, Esc held; its answer (the mock's `go`) reaches the epilogue.
    expect(played.map((p) => p.scene.id)).toEqual(['fin_m01_scene_c5']);
    expect(played[0]!.opts).toMatchObject({ mode: 'fullscreen', noSkip: true, record: true });
    const epi = endingScreen.value;
    expect(epi?.kind).toBe('epilogue');
    if (epi?.kind !== 'epilogue') return;
    expect(epi.first).toBe(true);
    expect(epi.ending).toBe('go');
    expect(epi.cards[0]?.text).toMatch(/^The last freighter lifted/);

    closeEndingScreen();
    expect(endingScreen.value).toBeNull();
    // The post-game star map takes the way on's place.
    expect(routed).toEqual(['post_game']);
    expect(go).not.toHaveBeenCalled();
  });

  it('on the results fixture (record false): C5 is asked, the epilogue reads its pick, nothing saved', () => {
    const save = finaleWonUnanswered();
    answer = 'stay';
    playEnding(endingSteps('fin_m01', true, save), { record: false, onward: true }, vi.fn());
    closeEndingScreen();
    expect(activeSave()!.story.memosRead).not.toContain('memo_fin_01');
    expect(played[0]!.opts['record']).toBe(false);
    const epi = endingScreen.value;
    expect(epi?.kind === 'epilogue' ? epi.ending : null).toBe('stay');
    expect(activeSave()!.story.flags.ending_choice).toBeUndefined();
  });

  it('with dialogue off (smoke runs): no story screens, straight to the post-game', () => {
    dialogueOn = false;
    const save = finaleWonUnanswered();
    playEnding(endingSteps('fin_m01', true, save), { record: true, onward: false }, vi.fn());
    expect(endingScreen.value).toBeNull();
    expect(played).toEqual([]);
    expect(routed).toEqual(['post_game']);
  });

  it('a replay (C5 answered): the post-game only, and only on Continue', () => {
    expect(loadDevSave('after_fin_go')).toBe(true);
    const steps = endingSteps('fin_m01', true, activeSave()!);
    expect(asksC5(steps)).toBe(false);
    const retry = vi.fn();
    playEnding(steps, { record: true, onward: false }, retry);
    expect(retry).toHaveBeenCalledOnce();
    expect(routed).toEqual([]);
    const onward = vi.fn();
    playEnding(steps, { record: true, onward: true }, onward);
    expect(onward).not.toHaveBeenCalled();
    expect(routed).toEqual(['post_game']);
    expect(endingScreen.value).toBeNull();
  });

  it('no close at all for other maps: the way on', () => {
    const go = vi.fn();
    playEnding([], { record: true, onward: true }, go);
    expect(go).toHaveBeenCalledOnce();
  });
});

describe('the epilogue (bible.md § 10)', () => {
  const base = DEV_SAVES.after_fin_stay.build();

  it.each([
    ['stay', /^The domes on the Long Walk/],
    ['go', /^The last freighter lifted/],
  ] as const)('%s: one card per slot, the counter apart, tokens resolved', (ending, world) => {
    const flags = epilogueFlags(base, ending);
    const view = epilogueView(flags, base, true);
    expect(view.ending).toBe(ending);
    expect(view.cards[0]!.text).toMatch(world);
    expect(view.cards.every((c) => c.slot !== 'final')).toBe(true);
    expect(view.cards.length).toBeLessThanOrEqual(EPILOGUE_SLOTS.length - 1);
    // Slot order, no slot twice.
    const order = EPILOGUE_SLOTS.map((s) => s.id);
    const slots = view.cards.map((c) => order.indexOf(c.slot));
    expect(slots).toEqual(slots.toSorted((a, b) => a - b));
    expect(new Set(slots).size).toBe(slots.length);
    for (const c of view.cards) expect(c.text, c.slot).not.toMatch(/[{}]/);
    expect(view.remembered).toBe(
      `REMEMBERED: ${base.stats.pestsProcessed.toLocaleString('en-US')}`,
    );
  });

  it("C5's pick overrides the save's flag (the fixture's answer isn't saved)", () => {
    expect(epilogueFlags(base, 'go').ending_choice).toBe('go');
    expect(epilogueFlags(base, null).ending_choice).toBe('stay');
    expect(epilogueFlags(null, null)).toEqual({});
  });

  it('beats: the cards, the counter, the credits, the final image; about 6 s a card', () => {
    const view = epilogueView(epilogueFlags(base, 'stay'), base, true);
    const beats = epilogueBeats(view);
    expect(beats.slice(-3).map((b) => b.kind)).toEqual(['counter', 'credits', 'final']);
    expect(beats.filter((b) => b.kind === 'card')).toHaveLength(view.cards.length);
    expect(cardMs('short')).toBe(6000);
    expect(cardMs('x'.repeat(170))).toBe(8000);
    for (const b of beats) expect(beatMs(b, view, false)).toBeGreaterThan(0);
    expect(counterFlipped(COUNTER_ZERO_MS - 1)).toBe(false);
    expect(counterFlipped(COUNTER_ZERO_MS)).toBe(true);
    expect(creditsMs(true)).toBeGreaterThan(0);
    expect(creditsMs(false)).toBeGreaterThan(creditsMs(true) / 4);
    expect(Object.keys(FINAL_IMAGES)).toEqual(['stay', 'go']);
    // The orbit's relay blinks on T843's anim; held still under reduced motion.
    const blink = { frames: ['still', 'blink_1'], fps: 4 };
    expect(stillFrameAt(blink, 0, false)).toBe('still');
    expect(stillFrameAt(blink, 250, false)).toBe('blink_1');
    expect(stillFrameAt(blink, 250, true)).toBe('still');
    expect(stillFrameAt(undefined, 250, false)).toBe('still');
  });

  it('"Watch the epilogue": the epilogue again, Esc allowed, then back', async () => {
    const { watchEpilogue } = await import('./ending.ts');
    expect(loadDevSave('after_fin_stay')).toBe(true);
    const done = watchEpilogue();
    await vi.waitFor(() => expect(endingScreen.value?.kind).toBe('epilogue'));
    const view = endingScreen.value;
    expect(view?.kind === 'epilogue' && view.first).toBe(false);
    closeEndingScreen();
    await expect(done).resolves.toBeUndefined();
    expect(routed).toEqual([]);
  });

  it('"Watch the epilogue" waits for C5', async () => {
    const { watchEpilogue } = await import('./ending.ts');
    finaleWonUnanswered();
    await expect(watchEpilogue()).rejects.toThrow(/C5/);
  });
});

describe("C5's commit and the Dawn scene's rule", () => {
  it('the scene commits ending_choice through resolveC5, once', () => {
    const save = finaleWonUnanswered();
    const fx = { flags: { ending_choice: 'go' as const }, callsign: null };
    const once = withSceneEffects(save, 'fin_m01_scene_c5', fx);
    expect(once.story.flags.ending_choice).toBe('go');
    expect(once.story.seen).toContain('fin_m01_scene_c5');
    const twice = withSceneEffects(once, 'fin_m01_scene_c5', {
      ...fx,
      flags: { ending_choice: 'stay' },
    });
    expect(twice.story.flags.ending_choice).toBe('go');
  });

  it('Dawn is unskippable until the save has seen it; C5 and Dawn are staged', () => {
    const dawn = sceneById('fin_m01_scene_dawn')!;
    expect(unskippable('fin_m01', dawn, [])).toBe(true);
    expect(unskippable('fin_m01', dawn, ['fin_m01_scene_dawn'])).toBe(false);
    expect(unskippable('a3_m01', sceneById('a3_m01_scene_song')!, [])).toBe(false);
    expect(stagingOf('fin_m01_scene_dawn')).toBe('dawn');
    expect(stagingOf('fin_m01_scene_c5')).toBe('c5');
  });
});

/** Scene `id`'s lines as a won finale's save reads them, with `flags` over its own. */
function lines(id: string, flags: Partial<SaveData['story']['flags']>) {
  const save = DEV_SAVES.after_fin_stay.build();
  // C5 unanswered, so its scene asks.
  const { ending_choice: _, ...own } = save.story.flags;
  save.story.flags = { ...own, ...flags };
  return readThrough(sceneById(id)!, baseStoryContext(save)).lines.map((l) => ({
    speaker: l.speaker,
    text: l.text,
  }));
}

describe('the stages (dawn.ts, c5.ts)', () => {
  it("Dawn's cues are in its data, and turn the still dawn → mote → visor", () => {
    const said = lines('fin_m01_scene_dawn', { quill_choice: 'keep' });
    for (const cue of DAWN_CUES) {
      expect(said.some((l) => l.speaker === 'narrator' && l.text.includes(cue.says))).toBe(true);
    }
    const frames = said.map((_, i) => dawnFrame(said.slice(0, i), said[i]!));
    expect(frames[0]).toBe('dawn');
    expect(frames.at(-1)).toBe('visor');
    const mote = said.findIndex((l) => l.text.includes('gold mote'));
    expect(frames[mote - 1]).toBe('dawn');
    expect(frames[mote]).toBe('mote');
    expect(frames.indexOf('visor')).toBe(said.length - 1);
  });

  it("C5's form files the KFA's clauses (the family line too)", () => {
    const plain = lines('fin_m01_scene_c5', { arrival_reason: 'lettuce' });
    const family = lines('fin_m01_scene_c5', { arrival_reason: 'family' });
    expect(filedClauses(plain)).toHaveLength(4);
    expect(filedClauses(family)).toHaveLength(5);
    expect(filedClauses(plain)[0]).toMatch(/^1\. /);
    expect(c5Label(0)).toBe('Dawn over the valley.');
    expect(c5Label(4)).toContain('4 clauses');
  });
});

describe('Results: Voices held (T821 relay)', () => {
  it('scores the fewest that sang, not the choir Dawn woke whole', () => {
    expect(voicesHeld({ choir: { singers: 20, voices: 20 }, stats: { voicesMin: 13 } })).toEqual({
      n: 13,
      total: 20,
    });
    expect(voicesHeld({ choir: { singers: 0, voices: 0 }, stats: { voicesMin: 0 } })).toBeNull();
    const row = resultsStats({
      wavesSurvived: 26,
      waveCount: 26,
      integrity: 20,
      maxIntegrity: 20,
      escort: null,
      asset: null,
      voices: { n: 13, total: 20 },
    })[1];
    expect(row).toEqual({ id: 'voices', label: 'Voices held', value: '13 of 20', note: null });
  });
});
