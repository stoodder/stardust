// M6 review round 1, the app's seams and rules (D143): the `revokedTower` condition (R4) and its
// validation; a line's `plateAs` (R12); the `tower_revoked` trigger and the queued triggers (R5,
// R6); a story choice's scene locks every choice in it (R1) and a locked option takes only a fresh
// press; Results drops a counter line that repeats a stat row (R13); the SEAL button lifts above a
// door it would cover (R3).
import { describe, expect, it } from 'vitest';
import { defineScene } from '../content/dialogue/define.ts';
import type { Bark, ChoiceNode } from '../content/dialogue/types.ts';
import { validateDialogue, type DialogueContent } from '../content/validateDialogue.ts';
import { evaluateCondition, type StoryContext } from '../story/conditions.ts';
import { choicePressAccepted } from '../ui/dialogue/choiceLock.ts';
import { SEAL_BOTTOM, SEAL_H, UI_H, sealButtonBottom } from '../ui/hud/layout.ts';
import { isQueuedTrigger, isStoryChoice, lineView, locksChoices } from './dialogue.ts';
import { counterRepeatsStat, resultsStats } from './runResult.ts';

const ctx = (over: Partial<StoryContext> = {}): StoryContext => ({
  flags: {},
  map: 'a3_m03',
  pestsProcessed: 0,
  seen: [],
  run: null,
  ...over,
});
const text = { profile: null, pestsProcessed: 0, evacuated: null };

describe('revokedTower (R4b)', () => {
  it("holds when the save's revoked classes include it; false without them", () => {
    const c = { revokedTower: 'thumper' } as const;
    expect(evaluateCondition(c, ctx({ revokedTowers: ['thumper'] }))).toBe(true);
    expect(evaluateCondition(c, ctx({ revokedTowers: ['rivet'] }))).toBe(false);
    expect(evaluateCondition(c, ctx())).toBe(false);
    expect(evaluateCondition({ not: c }, ctx({ revokedTowers: ['rivet'] }))).toBe(true);
  });
});

/** A one-map dialogue content for validation. */
function content(over: {
  scenes?: DialogueContent['maps'][number]['scenes'];
  barks?: Bark[];
  shared?: Bark[];
}): DialogueContent {
  return {
    maps: [{ map: 'a3_m02', scenes: over.scenes ?? [], barks: over.barks ?? [] }],
    shared: over.shared ?? [],
    tags: [],
  };
}
const rules = (c: DialogueContent): string[] =>
  validateDialogue(c).map((e) => /^\[([a-z-]+)\]/.exec(e)?.[1] ?? e);

/** A briefing that branches on `revokedTower: tower`. */
const branchOn = (tower: string) =>
  defineScene('a3_m02_brief', [
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- an invalid id on purpose
    { kind: 'branch', cond: { revokedTower: tower as 'thumper' }, goto: 'x' },
    { label: 'x', kind: 'line', speaker: 'bricks', text: 'Bring something that chains.' },
  ]);
/** A briefing whose one line is plated `plateAs`. */
const platedAs = (plateAs: string) =>
  defineScene('a3_m02_brief', [
    { kind: 'line', speaker: 'chitterbloom', plateAs, text: 'Walk with us.' },
  ]);

describe('validation of the new seams', () => {
  it('a revokedTower names a registered tower', () => {
    expect(rules(content({ scenes: [branchOn('thumper')] }))).toEqual([]);
    expect(rules(content({ scenes: [branchOn('nope')] }))).toEqual(['dialogue-cond']);
  });

  it('a plateAs is 1–16 characters', () => {
    expect(rules(content({ scenes: [platedAs('The Matriarch')] }))).toEqual([]);
    expect(rules(content({ scenes: [platedAs('')] }))).toEqual(['dialogue-plate']);
    expect(rules(content({ scenes: [platedAs('A Very Long Plate Name')] }))).toEqual([
      'dialogue-plate',
    ]);
  });

  it("a tower_revoked bark is its map's, never a shared pool's", () => {
    const b: Bark = {
      id: 'bricks_tower_revoked_a3_01',
      speaker: 'bricks',
      text: 'They took Lucky.',
      trigger: { on: 'tower_revoked', tagged: true },
    };
    expect(rules(content({ barks: [b] }))).toEqual([]);
    expect(rules(content({ shared: [b] }))).toEqual(['dialogue-bark']);
  });
});

describe("a line's plateAs (R12)", () => {
  it('names the plate instead of the speaker; the portrait stays theirs', () => {
    const named = lineView(
      { speaker: 'chitterbloom', text: 'Hm.' },
      ctx({ map: 'a3_m01' }),
      text,
      null,
    );
    const plated = lineView(
      { speaker: 'chitterbloom', text: 'Hm.', plateAs: 'The Matriarch' },
      ctx({ map: 'a3_m01' }),
      text,
      null,
    );
    expect(plated.name).toBe('The Matriarch');
    expect(plated.portrait?.sprite).toBe(named.portrait?.sprite);
    expect(named.name).not.toBe('The Matriarch');
  });
});

describe('queued triggers (R5, R6)', () => {
  it('the named turret revoked queues; an unnamed one does not', () => {
    expect(isQueuedTrigger({ on: 'tower_revoked', tower: 'thumper', tagged: true })).toBe(true);
    expect(isQueuedTrigger({ on: 'tower_revoked', tower: 'thumper' })).toBe(false);
  });

  it('a tower built after a revocation this run queues ("Build what you\'ve got.")', () => {
    const live = { pivotWave: 0, evacuated: 0, refugeesLost: 0, revocations: 0 };
    const before = ctx({ map: 'a3_m02', live });
    const after = ctx({ map: 'a3_m02', live: { ...live, revocations: 2 } });
    expect(isQueuedTrigger({ on: 'tower_built' }, before)).toBe(false);
    expect(isQueuedTrigger({ on: 'tower_built', tower: 'rivet' }, after)).toBe(true);
    // Without the battle's context (a pure call), it doesn't.
    expect(isQueuedTrigger({ on: 'tower_built' })).toBe(false);
  });
});

describe('locked choices (R1)', () => {
  const arrival: ChoiceNode = {
    kind: 'choice',
    options: [
      { text: 'The signing bonus.', tone: 'quiet' },
      { text: 'Honestly? The lettuce.', tone: 'wry' },
    ],
  };
  const door: ChoiceNode = {
    kind: 'choice',
    options: [
      { text: 'The convoy.', tone: 'earnest', set: { door_choice: 'convoy' } },
      { text: 'The warren.', tone: 'quiet', set: { door_choice: 'warren' } },
    ],
  };
  it("C3's scene locks its arrival question too; a scene without a story choice locks none", () => {
    expect(isStoryChoice(arrival.options)).toBe(false);
    expect(locksChoices({ nodes: [arrival, door] })).toBe(true);
    expect(locksChoices({ nodes: [arrival] })).toBe(false);
  });

  it('an option takes only a fresh down after the lock (never a repeat or an early down)', () => {
    const until = 1700;
    expect(choicePressAccepted({ until, downAt: 1699, now: 2500 })).toBe(false);
    expect(choicePressAccepted({ until, downAt: 1700, now: 1700 })).toBe(true);
    expect(choicePressAccepted({ until, downAt: 2000, now: 2000, repeat: true })).toBe(false);
    expect(choicePressAccepted({ until, downAt: null, now: 1699 })).toBe(false);
    expect(choicePressAccepted({ until, downAt: null, now: 1700 })).toBe(true);
    // An open choice (no lock) takes any press.
    expect(choicePressAccepted({ until: 0, downAt: null, now: 0, repeat: true })).toBe(true);
  });
});

describe("Results' counter line (R13)", () => {
  const base = { wavesSurvived: 14, waveCount: 14, integrity: 0, maxIntegrity: 0, asset: null };
  const escort = { label: 'Evacuated', evacuated: 30, total: 30, lost: 0 };
  it('goes when it only repeats the Escort row; a Pests Processed line stays', () => {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the rows read these fields
    const rows = resultsStats({ ...base, escort } as Parameters<typeof resultsStats>[0]);
    const meter = { label: 'Evacuated:', n: 30, career: null };
    expect(counterRepeatsStat(meter, rows)).toBe(true);
    expect(counterRepeatsStat({ ...meter, n: 29 }, rows)).toBe(false);
    expect(
      counterRepeatsStat({ label: 'Pests processed:', n: 30, career: 'Career total: 9' }, rows),
    ).toBe(false);
  });
});

describe('the SEAL button keeps the door in sight (R3)', () => {
  it('stays put with nothing to avoid; lifts above a door it would cover, with the margin', () => {
    expect(sealButtonBottom([])).toBe(SEAL_BOTTOM);
    // Off to the side (the west door): nothing to do.
    expect(sealButtonBottom([{ x: 60, y: 150, w: 44, h: 46 }])).toBe(SEAL_BOTTOM);
    // Right under it (the east door, centred low).
    const door = { x: 298, y: 282, w: 44, h: 46 };
    const bottom = sealButtonBottom([door]);
    expect(bottom).toBe(UI_H - (door.y - 4));
    // The button's box now ends above the door's box and its margin.
    expect(UI_H - bottom).toBeLessThanOrEqual(door.y - 4);
    expect(UI_H - bottom - SEAL_H).toBeGreaterThan(0);
  });
});
