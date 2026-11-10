// M5 review round 1's app fixes (D138): C2 priced per option before the pick; C2 offered at the
// base when A2M4's card was never answered; A2M6's debrief as a scene before its card; Zibzab's
// `perfect_wave` only after a hostile wave; the pivot cue drops what the comms panel held.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import { defineScene } from '../content/dialogue/define.ts';
import { MemoryStore, ZIBZAB_TUNE_UP, type SaveData } from '../meta/index.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { baseChoice } from '../ui/screens/state.ts';
import {
  closeBaseChoice,
  dropBaseChoice,
  offerChoiceAtBase,
  pickBaseChoice,
} from './baseChoice.ts';
import { HANDOVER_SCENE, playBaseScenesIfDue } from './baseScenes.ts';
import { closeScene, endsBeat, hostileWaves, setDialogueEnabled, skipScene } from './dialogue.ts';
import { C2_RETURN_NOTE, openChoice } from './resultsFlow.ts';
import { flowScenes } from './runFlow.ts';
import { debriefLines, debriefStoryOf, runStoryContext } from './runResult.ts';
import { activeSave, initSaves, loadDevSave, updateActiveSave } from './save.ts';

beforeEach(() => {
  initSaves(new MemoryStore(), () => 1);
  setDialogueEnabled(true);
});

afterEach(() => {
  dropBaseChoice();
  skipScene();
  closeScene();
  setDialogueEnabled(true);
});

/** The save in play with A2M4 won but C2 never answered (the tab closed on its card). */
function unanswered(stardust: number): SaveData {
  loadDevSave('after_a2m4_unanswered');
  expect(activeSave()?.story.flags.stardust_choice).toBeUndefined();
  updateActiveSave((s) => ({ ...s, currencies: { ...s.currencies, stardust } }));
  return activeSave()!;
}

describe('C2, price first (D138)', () => {
  it("shows each option's payout before the pick: Sell's windfall and Tune-up, Return's IOU", () => {
    const save = unanswered(940);
    const story = debriefStoryOf(save).story!;
    const opening = openChoice(
      SCENES.a2_m04_debrief!,
      runStoryContext('a2_m04', { story }, 'won'),
      story,
      save,
      false,
    );
    expect(opening.kind).toBe('offer');
    if (opening.kind !== 'offer') return;
    expect(opening.pending.view.bank).toBe(940);
    expect(opening.pending.view.pays).toEqual([
      { intel: 6, note: 'Zibzab Tune-up' },
      { intel: 0, note: C2_RETURN_NOTE },
    ]);
  });
});

describe('C2 at the base (D138: never lost)', () => {
  it('offers an unanswered C2 first, priced at the bank now, then plays the visit scenes', () => {
    const save = unanswered(700);
    const intel = save.currencies.intel;
    expect(offerChoiceAtBase(playBaseScenesIfDue)).toBe(true);
    const view = baseChoice.value!;
    expect(view.choice.by).toBe('Zibzab');
    expect(view.choice.bank).toBe(700);
    expect(view.choice.options).toEqual(['Sell it. Market price.', 'Take it to them.']);
    // The offerer's own lines lead to it, not Sterling's.
    expect(view.lines.map((l) => l.name)).toEqual(['Zibzab', 'Zibzab']);
    // The visit scenes wait for it.
    expect(dialogue.scene.value).toBeNull();
    expect(closeBaseChoice()).toBe(false); // not before it's answered
    pickBaseChoice(0);
    const after = activeSave()!;
    expect(after.story.flags.stardust_choice).toBe('sold');
    expect(after.currencies).toEqual({ stardust: 0, intel: intel + 4 });
    expect(after.upgrades[ZIBZAB_TUNE_UP]).toBe(1);
    expect(after.story.seen).toContain('a2_m04_debrief');
    expect(baseChoice.value?.made).toMatchObject({ kind: 'c2', choice: 'sold', bank: 700 });
    pickBaseChoice(1); // taken: a second press changes nothing
    expect(activeSave()?.story.flags.stardust_choice).toBe('sold');
    expect(closeBaseChoice()).toBe(true);
    expect(baseChoice.value).toBeNull();
    expect(dialogue.scene.value?.sceneId).toBe(HANDOVER_SCENE);
    // Answered: never offered again.
    expect(offerChoiceAtBase(() => undefined)).toBe(false);
  });

  it('offers nothing once C2 is made, or while dialogue is off', () => {
    loadDevSave('after_a2m4_returned');
    expect(offerChoiceAtBase(() => undefined)).toBe(false);
    unanswered(700);
    setDialogueEnabled(false);
    expect(offerChoiceAtBase(() => undefined)).toBe(false);
    expect(baseChoice.value).toBeNull();
  });

  it('makes `none` quietly on an empty bank: no panel, no "No refunds" to the unasked', () => {
    unanswered(0);
    expect(offerChoiceAtBase(() => undefined)).toBe(false);
    expect(baseChoice.value).toBeNull();
    expect(activeSave()?.story.flags.stardust_choice).toBe('none');
  });

  it('leaving the base with it up drops it unanswered (offered again next visit)', () => {
    unanswered(700);
    expect(offerChoiceAtBase(() => undefined)).toBe(true);
    dropBaseChoice();
    expect(baseChoice.value).toBeNull();
    expect(activeSave()?.story.flags.stardust_choice).toBeUndefined();
    expect(offerChoiceAtBase(() => undefined)).toBe(true);
  });
});

describe("A2M6's debrief as a scene (D138)", () => {
  const input = {
    mapId: 'a2_m06',
    waveCount: 12,
    maxIntegrity: 20,
    integrity: 18,
    skitterkinKilled: 40,
    wavesCleared: 12,
    firstLeakAgo: null,
    stardust: 0,
    medals: [],
    earnedMedals: [],
  };

  it('plays before the card on a win, and the card leaves its lines to it', () => {
    expect(flowScenes('a2_m06', 'won', 'before').map((s) => s.id)).toEqual(['a2_m06_debrief']);
    expect(flowScenes('a2_m06', 'lost', 'before')).toEqual([]);
    expect(debriefLines(input, 'won')).toEqual([]);
    // A loss keeps its line on the card; so does a win with dialogue off (no scene plays).
    expect(debriefLines(input, 'lost')).toHaveLength(1);
    setDialogueEnabled(false);
    expect(debriefLines(input, 'won').at(-1)?.text).toBe('Do not be sorry, Old Soldier. Be awake.');
  });

  it("leaves other maps' debriefs on the card", () => {
    expect(flowScenes('a2_m05', 'won', 'before').map((s) => s.id)).not.toContain('a2_m05_debrief');
  });
});

/** A wave whose groups carry `tags`. */
const wave = (...tags: string[][]) => ({ groups: tags.map((t) => ({ tags: t })) });

describe('Zibzab praises a clean wave only when it had something hostile in it (D138)', () => {
  it('reads a wave of runners alone as not hostile', () => {
    expect(hostileWaves([wave(['fleeing']), wave(['fleeing'], []), wave([]), wave()])).toEqual([
      false,
      true,
      true,
      false,
    ]);
  });
});

describe('the pivot ends a beat (D138)', () => {
  it("drops the comms panel's lines only for a pausing `pivot` cue", () => {
    const line = { kind: 'line', speaker: 'bricks', text: 'Hi.' } as const;
    expect(endsBeat({ ...defineScene('a2_m05_cue_pivot', [line]), pause: true })).toBe(true);
    expect(endsBeat(defineScene('a2_m05_cue_pivot', [line]))).toBe(false);
    expect(endsBeat({ ...defineScene('a2_m02_cue_witch_counter', [line]), pause: true })).toBe(
      false,
    );
  });
});
