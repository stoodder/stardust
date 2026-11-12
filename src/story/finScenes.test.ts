// The finale's scene branches (content/dialogue/fin/fin_m01/; story/campaign/finale.md § FIN) as
// the runner plays them, which the canon check (tools/dialogueCanon.test.ts, text only) can't see:
// the briefing's QUILL by C4, each Phase 2 cue gated to its answer, Directive 0 ending on the
// permission line, Dawn's branches (Thrum if spared, QUILL by C4, then the mote, the name, the
// visor), the loss-only debrief, and C5 (the family line, asked once, setting `ending_choice`).
// It lives here because content may not import story (shared/architecture.test.ts).
import { describe, expect, it } from 'vitest';
import { scenes } from '../content/dialogue/fin/fin_m01/scenes.ts';
import { barks } from '../content/dialogue/fin/fin_m01/barks.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import { RESULTS_FLOW } from '../content/dialogue/resultsFlow.ts';
import { DAWN_SCENE } from '../content/dialogue/speakers.ts';
import { FORCED_INPUTS, WHOS_THERE_INPUT } from '../content/forcedInputs.ts';
import { evaluateCondition as evaluate, type StoryContext } from './conditions.ts';
import { advance, readThrough, type DialogueCursor } from './runner.ts';

const scene = (id: string) => {
  const s = scenes.find((x) => x.id === id);
  if (s === undefined) throw new Error(`no scene ${id}`);
  return s;
};
const ctx = (flags: FlagSet, run: StoryContext['run'] = null): StoryContext => ({
  flags,
  map: 'fin_m01',
  pestsProcessed: 1234,
  seen: [],
  run,
});
const run = (outcome: 'won' | 'lost'): StoryContext['run'] => ({ outcome, ruleFlags: {} });

/** Every line `id` plays in `c` (taking option `pick` at a choice), as `speaker: text`. */
function play(id: string, c: StoryContext, pick = 0): string[] {
  const sc = scene(id);
  if (sc.when !== undefined && !evaluate(sc.when, c)) return [];
  const out: string[] = [];
  let { lines, cursor } = readThrough(sc, c);
  for (;;) {
    out.push(...lines.map((l) => `${l.speaker}: ${l.text}`));
    if (cursor.step.kind !== 'choice') return out;
    let next: DialogueCursor = advance(sc, cursor, c, pick);
    lines = [];
    while (next.step.kind === 'line') {
      lines.push(next.step.node);
      next = advance(sc, next, c);
    }
    cursor = next;
  }
}

const C4 = ['purge', 'keep', 'rewrite'] as const;

/** A context inside a battle at script phase `phase`. */
const live = (phase: number, flags: FlagSet): StoryContext => ({
  ...ctx(flags),
  liveScript: { phase, resolved: [] },
});

describe('FIN scenes', () => {
  it('names the scenes the seams fix (m8 plan § 3), Dawn under the id the speaker rules read', () => {
    const ids = scenes.map((s) => s.id);
    for (const id of [
      'fin_m01_brief',
      'fin_m01_cue_memorial',
      'fin_m01_cue_phase2',
      'fin_m01_cue_log',
      'fin_m01_cue_directive0',
      'fin_m01_cue_not_everglow',
      'fin_m01_cue_not_nothing',
      'fin_m01_cue_echo',
      'fin_m01_scene_dawn',
      'fin_m01_scene_c5',
    ]) {
      expect(ids, id).toContain(id);
    }
    expect(DAWN_SCENE).toBe('fin_m01_scene_dawn');
    expect(RESULTS_FLOW.fin_m01?.beforeResults).toEqual([DAWN_SCENE]);
  });

  it("gives QUILL the briefing's threat intel, flat under Purge", () => {
    expect(play('fin_m01_brief', ctx({ quill_choice: 'keep' })).at(-1)).toBe(
      'quill: Everything. From everywhere. And a drill.',
    );
    expect(play('fin_m01_brief', ctx({ quill_choice: 'purge' })).at(-1)).toBe(
      'quill: Hostiles: all types, all approaches. One Deep Bore, drilling.',
    );
    expect(play('fin_m01_brief', ctx({ quill_choice: 'keep' }))).toHaveLength(3);
  });

  it('plays each flag-gated radio slot only on its flag', () => {
    expect(play('fin_m01_w05', ctx({ door_choice: 'warren' }))).toEqual([]);
    expect(play('fin_m01_w05', ctx({ door_choice: 'convoy' }))).toHaveLength(1);
    expect(play('fin_m01_w06', ctx({ quill_choice: 'keep' }))).toEqual([]);
    expect(play('fin_m01_w06', ctx({ quill_choice: 'purge' }))).toHaveLength(1);
    expect(play('fin_m01_w15', ctx({ stardust_choice: 'sold' }))).toEqual([]);
    expect(play('fin_m01_w15', ctx({ stardust_choice: 'returned' }))).toEqual([
      'chitterbloom: The ones you sent home are walking with us. Listen. They are warm.',
    ]);
  });

  it("holds Bricks's dark frame 3 s at the memorial, after Pebble", () => {
    const nodes = scene('fin_m01_cue_memorial').nodes;
    expect(nodes.at(-1)).toEqual({ kind: 'line', speaker: 'bricks', text: '', durationSec: 3 });
  });

  it('plays exactly one of the Phase 2 QUILL cues for each C4 answer, and Directive 0 only under Keep', () => {
    const cues = ['fin_m01_cue_log', 'fin_m01_cue_holding', 'fin_m01_cue_not_nothing'];
    for (const answer of C4) {
      const c = ctx({ quill_choice: answer });
      expect(
        cues.filter((id) => play(id, c).length > 0),
        answer,
      ).toHaveLength(1);
      const keepOnly = [
        'fin_m01_cue_directive0',
        'fin_m01_cue_whos_there_wait',
        'fin_m01_cue_not_everglow',
      ];
      for (const id of keepOnly)
        expect(play(id, c).length > 0, `${id} ${answer}`).toBe(answer === 'keep');
    }
  });

  it('ends Directive 0 on the knock-knock, the line that permits "Who\'s there?"', () => {
    expect(FORCED_INPUTS[WHOS_THERE_INPUT]?.permission).toBe('directive0');
    const lines = play('fin_m01_cue_directive0', ctx({ quill_choice: 'keep' }));
    expect(lines.at(-1)).toBe('quill: Directive conflict. Engaging Morale Module. ...Knock knock.');
    expect(play('fin_m01_cue_not_everglow', ctx({ quill_choice: 'keep' }))[0]).toBe(
      'quill: Not Everglow.',
    );
  });

  it("plays Thrum's farewell only on the cleared path", () => {
    expect(play('fin_m01_cue_echo', ctx({ spared_quiet_wave: true }))).toEqual([]);
    expect(play('fin_m01_cue_echo', ctx({ spared_quiet_wave: false }))).toEqual([
      'pebble: Grandmother. (hum, six notes) She heard.',
    ]);
  });

  it('plays Dawn: Thrum if spared, QUILL by C4, then the mote, the name, and the visor', () => {
    const tail = [
      "narrator: (One gold mote rises apart from the rest. It stops at Ves'thara's shoulder.)",
      'vesthara: Ishael.',
      'vesthara: Her face. I remember her face. She was laughing.',
      'pebble: Waykeeper is my name for you. Bricks had a different one.',
      'pebble: {name}. Bricks said it like that. I practiced.',
      'narrator: (The visor goes up, once.)',
    ];
    const quill = {
      rewrite: 'quill: Last entry. Dawn, the Deep Halls. All of them, sung. Closing the log.',
      keep: 'quill: Good... morning. Good morning, Waykeeper.',
      purge: "quill: Sunrise, 06:14. ...I'm logging it.",
    } as const;
    for (const answer of C4) {
      for (const spared of [true, false]) {
        const lines = play(DAWN_SCENE, ctx({ quill_choice: answer, spared_quiet_wave: spared }));
        expect(lines.slice(-tail.length), `${answer} ${spared}`).toEqual(tail);
        expect(lines.filter((l) => l.startsWith('quill:'))).toEqual([quill[answer]]);
        expect(lines.some((l) => l.startsWith('thrum:'))).toBe(spared);
        expect(lines.length).toBeLessThanOrEqual(20);
      }
    }
    // No answer on file (a dev save): Keep's line, never two of QUILL's.
    expect(play(DAWN_SCENE, ctx({})).filter((l) => l.startsWith('quill:'))).toEqual([quill.keep]);
  });

  it('says nothing on a win (the close follows the card), and gives a way back on a loss', () => {
    expect(play('fin_m01_debrief', ctx({}, run('won')))).toEqual([]);
    expect(play('fin_m01_debrief', ctx({}, run('lost')))).toHaveLength(1);
  });

  it("asks C5 once, adds the family's line for `family`, and sets ending_choice", () => {
    const family = play('fin_m01_scene_c5', ctx({ arrival_reason: 'family' }));
    const bonus = play('fin_m01_scene_c5', ctx({ arrival_reason: 'bonus' }));
    expect(family.length).toBe(bonus.length + 1);
    expect(family.find((l) => l.startsWith('kfa: 5.'))).toContain('{name}');
    expect(play('fin_m01_scene_c5', ctx({ ending_choice: 'stay' }))).toEqual([]);
    const choice = scene('fin_m01_scene_c5').nodes.find((n) => n.kind === 'choice');
    expect(
      choice?.kind === 'choice' && choice.options.map((o) => [o.text, o.set, o.remember]),
    ).toEqual([
      ['We stay. We keep the way open.', { ending_choice: 'stay' }, undefined],
      ['We go. We give it back.', { ending_choice: 'go' }, undefined],
    ]);
  });

  it("keeps Phase 2 barks to Phase 2, and QUILL's to Keep", () => {
    const pebble = barks.find((b) => b.speaker === 'pebble')!;
    const quill = barks.find((b) => b.speaker === 'quill')!;
    expect(evaluate(pebble.when!, live(1, {}))).toBe(false);
    expect(evaluate(pebble.when!, live(2, {}))).toBe(true);
    expect(evaluate(quill.when!, live(2, { quill_choice: 'keep' }))).toBe(true);
    expect(evaluate(quill.when!, live(2, { quill_choice: 'rewrite' }))).toBe(false);
  });
});
