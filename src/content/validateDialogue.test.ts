// Dialogue validation (story-runtime.md § Validation): the live dialogue is clean, and one failing
// fixture per rule. Dialogue isn't RawContent, so its fixtures go to validateDialogue directly.
import { describe, expect, it } from 'vitest';
import { defineScene } from './dialogue/define.ts';
import type { NameTagDef } from './dialogue/tags.ts';
import type { Bark, MapDialogue, Scene } from './dialogue/types.ts';
import { mapIndex } from './dialogue/rules.ts';
import { compileContent } from './compile.ts';
import { RAW_CONTENT } from './registry.ts';
import {
  dialogueErrors,
  impliesMapAtLeast,
  validateDialogue,
  type DialogueContent,
} from './validateDialogue.ts';

const radio = (id: string, ...lines: Scene['nodes']): Scene => defineScene(id, lines);
const content = (
  over: Partial<DialogueContent> & { scenes?: Scene[]; barks?: Bark[]; map?: MapDialogue['map'] },
): DialogueContent => ({
  maps: [{ map: over.map ?? 'a1_m01', scenes: over.scenes ?? [], barks: over.barks ?? [] }],
  shared: over.shared ?? [],
  tags: over.tags ?? [],
  ...(over.known === undefined ? {} : { known: over.known }),
});
const errors = (c: DialogueContent): string[] => validateDialogue(c);
const rules = (c: DialogueContent): string[] =>
  errors(c).map((e) => /^\[([a-z-]+)\]/.exec(e)?.[1] ?? e);

/** Fixtures may be invalid on purpose (bad speakers, expressions), so they skip the types. */
function asBark(x: object): Bark {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- deliberately invalid fixtures
  return x as Bark;
}
const bark = (over: object = {}): Bark =>
  asBark({
    id: 'quill_idle_a1_01',
    speaker: 'quill',
    text: 'Still there?',
    trigger: { on: 'idle' },
    ...over,
  });

describe('the live dialogue', () => {
  it('is clean, and compiles with the content', () => {
    expect(dialogueErrors()).toEqual([]);
    expect(() => compileContent(RAW_CONTENT)).not.toThrow();
  });

  it('a clean fixture has no errors', () => {
    const s = radio(
      'a1_m01_w02',
      { kind: 'line', speaker: 'quill', expression: 'happy', text: 'Hello, {callsign}!' },
      {
        kind: 'line',
        speaker: 'bricks',
        text: "It's Wednesday.",
        button: { label: "Who's there?" },
      },
    );
    expect(errors(content({ scenes: [s], barks: [bark()] }))).toEqual([]);
  });
});

describe('one failing fixture per rule', () => {
  it('[dialogue-id]', () => {
    expect(
      rules(
        content({ scenes: [radio('a1_m02_w02', { kind: 'line', speaker: 'quill', text: 'Hi.' })] }),
      ),
    ).toEqual(['dialogue-id']);
    expect(
      rules(
        content({
          scenes: [radio('a1_m01_wave2', { kind: 'line', speaker: 'quill', text: 'Hi.' })],
        }),
      ),
    ).toEqual(['dialogue-id']);
    const s = radio('a1_m01_w02', { kind: 'line', speaker: 'quill', text: 'Hi.' });
    expect(rules(content({ scenes: [s, s] }))).toEqual(['dialogue-id']);
    expect(rules(content({ barks: [bark({ id: 'bricks_idle_a1_01' })] }))).toEqual(['dialogue-id']);
    expect(rules(content({ barks: [bark({ id: 'quill_idle_a2_01' })] }))).toEqual(['dialogue-id']);
    expect(rules(content({ barks: [bark(), bark()] }))).toEqual(['dialogue-id']);
    expect(rules(content({ barks: [bark({ id: 'quill_idle_1' })] }))).toEqual(['dialogue-id']);
  });

  it('[dialogue-speaker]', () => {
    const bad = bark({ speaker: 'nobody', id: 'nobody_idle_a1_01' });
    expect(rules(content({ barks: [bad] }))).toEqual(['dialogue-speaker']);
    expect(
      rules(
        content({
          barks: [bark({ id: 'bricks_idle_a1_01', speaker: 'bricks', expression: 'singing' })],
        }),
      ),
    ).toEqual(['dialogue-speaker']);
    expect(
      rules(
        content({
          barks: [bark({ id: 'gerald_idle_a1_01', speaker: 'gerald', expression: 'happy' })],
        }),
      ),
    ).toEqual(['dialogue-speaker']);
  });

  it('[dialogue-token]', () => {
    expect(rules(content({ barks: [bark({ text: 'Hi {nmae}.' })] }))).toEqual(['dialogue-token']);
  });

  it('[dialogue-length]', () => {
    expect(rules(content({ barks: [bark({ text: 'x'.repeat(81) })] }))).toEqual([
      'dialogue-length',
    ]);
    expect(rules(content({ barks: [bark({ text: `${'x'.repeat(70)}{callsign}` })] }))).toEqual([]);
    expect(rules(content({ barks: [bark({ text: `${'x'.repeat(72)}{callsign}` })] }))).toEqual([
      'dialogue-length',
    ]);
    const line = radio('a1_m01_w02', { kind: 'line', speaker: 'quill', text: 'x'.repeat(121) });
    expect(rules(content({ scenes: [line] }))).toEqual(['dialogue-length']);
    const choice = radio(
      'a1_m01_brief',
      { kind: 'line', speaker: 'quill', text: 'Pick.' },
      {
        kind: 'choice',
        options: [
          { text: 'x'.repeat(61), tone: 'wry' },
          { text: 'No.', tone: 'quiet' },
        ],
      },
    );
    expect(rules(content({ scenes: [choice] }))).toEqual(['dialogue-length']);
    expect(rules(content({ barks: [bark({ button: { label: 'x'.repeat(17) } })] }))).toEqual([
      'dialogue-length',
    ]);
    const tag: NameTagDef = { map: 'a1_m02', name: 'Marguerite the Second', pick: 'earliest' };
    expect(rules(content({ tags: [tag] }))).toEqual(['dialogue-length']);
  });

  it('[dialogue-name]', () => {
    const early = radio('a1_m01_w02', { kind: 'line', speaker: 'bricks', text: 'Do it, {name}.' });
    expect(rules(content({ scenes: [early] }))).toEqual(['dialogue-name']);
    const seal = radio('a3_m03_cue_seal', {
      kind: 'line',
      speaker: 'bricks',
      text: 'Do it, {name}.',
    });
    expect(rules(content({ map: 'a3_m03', scenes: [seal] }))).toEqual([]);
    const sterling = radio('a3_m03_cue_x', {
      kind: 'line',
      speaker: 'sterling',
      text: 'Hello, {name}.',
    });
    expect(rules(content({ map: 'a3_m03', scenes: [sterling] }))).toEqual(['dialogue-name']);
    const system = radio('a1_m01_w02', {
      kind: 'line',
      speaker: 'system',
      text: 'Welcome, {name}.',
    });
    expect(rules(content({ scenes: [system] }))).toEqual([]);
    const shared = bark({ id: 'pebble_idle_a3_01', speaker: 'pebble', text: '{name}!' });
    expect(rules(content({ shared: [shared] }))).toEqual(['dialogue-name']);
    expect(
      rules(content({ shared: [bark({ ...shared, when: { mapAtLeast: 'a3_m04' } })] })),
    ).toEqual([]);
  });

  it('impliesMapAtLeast reads the combinators', () => {
    const at = mapIndex('a3_m03');
    expect(impliesMapAtLeast({ mapIs: 'fin_m01' }, at)).toBe(true);
    expect(impliesMapAtLeast({ act: 'finale' }, at)).toBe(true);
    expect(impliesMapAtLeast({ act: 3 }, at)).toBe(false);
    expect(impliesMapAtLeast({ all: [{ act: 3 }, { mapAtLeast: 'a3_m03' }] }, at)).toBe(true);
    expect(impliesMapAtLeast({ any: [{ mapIs: 'a3_m05' }, { mapIs: 'a1_m01' }] }, at)).toBe(false);
    expect(impliesMapAtLeast({ any: [] }, at)).toBe(false);
    expect(impliesMapAtLeast({ not: { mapAtLeast: 'a3_m03' } }, at)).toBe(false);
  });

  it('[dialogue-policy]', () => {
    expect(rules(content({ barks: [bark({ text: '(Per policy.) Smile.' })] }))).toEqual([
      'dialogue-policy',
    ]);
    expect(rules(content({ barks: [bark({ text: 'Smile.', expression: 'policy' })] }))).toEqual([
      'dialogue-policy',
    ]);
    expect(
      rules(content({ barks: [bark({ text: 'Smile. (Per policy.)', expression: 'policy' })] })),
    ).toEqual([]);
  });

  it('[dialogue-bang]', () => {
    expect(
      rules(
        content({ barks: [bark({ id: 'bricks_idle_a1_01', speaker: 'bricks', text: 'Go!' })] }),
      ),
    ).toEqual(['dialogue-bang']);
    const a3 = (speaker: 'quill' | 'sterling' | 'pebble'): Bark =>
      bark({ id: `${speaker}_idle_a3_01`, speaker, text: 'Go!' });
    expect(rules(content({ map: 'a3_m01', barks: [a3('quill')] }))).toEqual(['dialogue-bang']);
    expect(
      rules(
        content({
          map: 'a3_m01',
          barks: [a3('sterling'), bark({ ...a3('pebble'), id: 'pebble_idle_a3_01' })],
        }),
      ),
    ).toEqual([]);
    expect(rules(content({ shared: [a3('quill')] }))).toEqual(['dialogue-bang']);
    const fin = bark({ id: 'system_idle_afin_01', speaker: 'system', text: 'Go!' });
    expect(rules(content({ map: 'fin_m01', barks: [fin] }))).toEqual([]);
    expect(
      rules(
        content({
          map: 'fin_m01',
          barks: [bark({ ...fin, id: 'quill_idle_afin_01', speaker: 'quill' })],
        }),
      ),
    ).toEqual(['dialogue-bang']);
    const choice = radio(
      'a3_m03_brief',
      { kind: 'line', speaker: 'bricks', text: 'Pick.' },
      {
        kind: 'choice',
        options: [
          { text: 'Now!', tone: 'earnest' },
          { text: 'Wait.', tone: 'quiet' },
        ],
      },
    );
    expect(rules(content({ map: 'a3_m03', scenes: [choice] }))).toEqual(['dialogue-bang']);
  });

  it('[dialogue-emphasis]', () => {
    expect(rules(content({ barks: [bark({ text: 'It *is* *very* odd.' })] }))).toEqual([
      'dialogue-emphasis',
    ]);
    expect(rules(content({ barks: [bark({ text: 'It *is* odd.' })] }))).toEqual([]);
  });

  it('[dialogue-silence]', () => {
    expect(rules(content({ barks: [bark({ text: '' })] }))).toEqual(['dialogue-silence']);
    expect(rules(content({ barks: [bark({ text: '', durationSec: 2 })] }))).toEqual([]);
    expect(rules(content({ barks: [bark({ durationSec: 0 })] }))).toEqual(['dialogue-silence']);
  });

  it('[dialogue-choice]', () => {
    const one = radio(
      'a1_m01_brief',
      { kind: 'choice', options: [{ text: 'Ok.', tone: 'wry' }] },
      { kind: 'line', speaker: 'quill', text: 'Hi.' },
    );
    expect(rules(content({ scenes: [one] }))).toEqual(['dialogue-choice']);
    const remember = radio(
      'a1_m01_brief',
      { kind: 'line', speaker: 'quill', text: 'Pick.' },
      {
        kind: 'choice',
        options: [
          { text: 'A.', tone: 'wry', remember: 'quill' },
          { text: 'B.', tone: 'quiet' },
        ],
      },
    );
    expect(rules(content({ scenes: [remember] }))).toEqual(['dialogue-choice']);
    const c4 = radio(
      'a3_m04_debrief',
      { kind: 'line', speaker: 'quill', text: 'Pick.' },
      {
        kind: 'choice',
        options: [
          { text: 'Purge.', tone: 'quiet', set: { quill_choice: 'purge' }, remember: 'quill' },
          { text: 'Keep.', tone: 'quiet', set: { quill_choice: 'keep' } },
        ],
      },
    );
    expect(rules(content({ map: 'a3_m04', scenes: [c4] }))).toEqual([]);
  });

  it('[dialogue-flag]', () => {
    const c1 = radio(
      'a1_m05_debrief',
      { kind: 'line', speaker: 'bricks', text: 'Well.' },
      {
        kind: 'choice',
        options: [
          { text: 'Spare them.', tone: 'quiet', set: { spared_quiet_wave: true } },
          { text: 'No.', tone: 'wry' },
        ],
      },
    );
    expect(rules(content({ map: 'a1_m05', scenes: [c1] }))).toEqual(['dialogue-flag']);
    const set = radio(
      'a1_m05_debrief',
      { kind: 'line', speaker: 'bricks', text: 'Well.' },
      { kind: 'set', flag: 'spared_quiet_wave', value: true },
    );
    expect(rules(content({ map: 'a1_m05', scenes: [set] }))).toEqual(['dialogue-flag']);
  });

  it('[dialogue-jump]', () => {
    const dangling = radio(
      'a1_m01_w02',
      { kind: 'branch', cond: { act: 1 }, goto: 'nowhere' },
      { kind: 'line', speaker: 'quill', text: 'Hi.' },
    );
    expect(rules(content({ scenes: [dangling] }))).toEqual(['dialogue-jump']);
    const twice = radio(
      'a1_m01_w02',
      { kind: 'line', speaker: 'quill', text: 'Hi.', label: 'a' },
      { kind: 'line', speaker: 'quill', text: 'Hi.', label: 'a' },
    );
    expect(rules(content({ scenes: [twice] }))).toEqual(['dialogue-jump']);
  });

  it('[dialogue-reach]', () => {
    const dead = radio(
      'a1_m01_w02',
      { kind: 'line', speaker: 'quill', text: 'Hi.' },
      { kind: 'end' },
      { kind: 'line', speaker: 'quill', text: 'Never.' },
    );
    expect(rules(content({ scenes: [dead] }))).toEqual(['dialogue-reach']);
    const spin = radio(
      'a1_m01_w02',
      { kind: 'line', speaker: 'quill', text: 'Hi.' },
      { kind: 'set', flag: 'peeker_poked', value: true, label: 'top' },
      { kind: 'branch', cond: { act: 1 }, goto: 'top' },
    );
    expect(rules(content({ scenes: [spin] }))).toEqual(['dialogue-reach']);
    // A loop back to a choice is fine: the player rests there.
    const menu = radio(
      'a1_m03_base_ask',
      {
        kind: 'choice',
        label: 'menu',
        options: [
          { text: 'Again.', tone: 'wry', goto: 'again' },
          { text: 'Bye.', tone: 'quiet', goto: 'bye' },
        ],
      },
      { kind: 'line', speaker: 'zibzab', text: 'Price first.', label: 'again' },
      { kind: 'branch', cond: { act: 1 }, goto: 'menu' },
      { kind: 'end', label: 'bye' },
    );
    expect(rules(content({ map: 'a1_m03', scenes: [menu] }))).toEqual([]);
  });

  it('[dialogue-size]', () => {
    const line = { kind: 'line', speaker: 'quill', text: 'Hi.' } as const;
    expect(rules(content({ scenes: [radio('a1_m01_w02', line, line, line, line)] }))).toEqual([
      'dialogue-size',
    ]);
    expect(rules(content({ scenes: [radio('a1_m01_w02')] }))).toEqual(['dialogue-size']);
    // Each branch of a debrief counts on its own: 4 + 4 lines, ≤ 6 on any play-through.
    const debrief = radio(
      'a1_m01_debrief',
      { kind: 'branch', cond: { outcome: 'won' }, goto: 'won' },
      line,
      line,
      line,
      line,
      { kind: 'end' },
      { ...line, label: 'won' },
      line,
      line,
      line,
    );
    expect(rules(content({ scenes: [debrief] }))).toEqual([]);
    // A cue that pauses the battle may run to 6 lines; a plain cue still stops at 4.
    const cue = (pause: boolean, n: number): Scene => ({
      ...defineScene(
        'a1_m01_cue_look',
        Array.from({ length: n }, () => line),
      ),
      ...(pause ? { pause: true } : {}),
    });
    expect(rules(content({ scenes: [cue(true, 6)] }))).toEqual([]);
    expect(rules(content({ scenes: [cue(true, 7)] }))).toEqual(['dialogue-size']);
    expect(rules(content({ scenes: [cue(false, 5)] }))).toEqual(['dialogue-size']);
    expect(rules(content({ scenes: [cue(false, 4)] }))).toEqual([]);
  });

  it('[dialogue-button]', () => {
    const brief = radio('a1_m01_brief', {
      kind: 'line',
      speaker: 'quill',
      text: 'Hi.',
      button: { label: 'Hi.' },
    });
    expect(rules(content({ scenes: [brief] }))).toEqual(['dialogue-button']);
    expect(
      rules(content({ barks: [bark({ button: { label: 'Who?', reply: 'a1_m01_w09' } })] })),
    ).toEqual(['dialogue-button']);
    const reply = radio('a1_m01_w09', { kind: 'line', speaker: 'quill', text: 'Lettuce.' });
    expect(
      rules(
        content({
          scenes: [reply],
          barks: [bark({ button: { label: 'Who?', reply: 'a1_m01_w09' } })],
        }),
      ),
    ).toEqual([]);
  });

  it('[dialogue-cond]', () => {
    const outcome = defineScene('a1_m01_w02', [{ kind: 'line', speaker: 'quill', text: 'Hi.' }], {
      outcome: 'won',
    });
    expect(rules(content({ scenes: [outcome] }))).toEqual(['dialogue-cond']);
    const debrief = defineScene(
      'a1_m01_debrief',
      [{ kind: 'line', speaker: 'quill', text: 'Hi.' }],
      {
        all: [{ outcome: 'won' }, { thisRun: 'peeker_poked', eq: true }],
      },
    );
    expect(rules(content({ scenes: [debrief] }))).toEqual(['dialogue-cond']);
    expect(rules(content({ barks: [bark({ when: { seen: 'a1_m01_nope' } })] }))).toEqual([
      'dialogue-cond',
    ]);
    expect(
      rules(content({ barks: [bark({ when: { not: { seen: 'quill_idle_a1_01' } } })] })),
    ).toEqual([]);
    // A bank test (C2's `none`) needs a bound, non-negative integers, and a range that can hold.
    const banked = (when: object): string[] => rules(content({ barks: [bark({ when })] }));
    expect(banked({ bank: 'stardust', lte: 0 })).toEqual([]);
    expect(banked({ bank: 'intel', gte: 3, lte: 8 })).toEqual([]);
    expect(banked({ bank: 'stardust' })).toEqual(['dialogue-cond']);
    expect(banked({ bank: 'stardust', gte: -1 })).toEqual(['dialogue-cond']);
    expect(banked({ bank: 'stardust', lte: 0.5 })).toEqual(['dialogue-cond']);
    expect(banked({ bank: 'stardust', gte: 9, lte: 8 })).toEqual(['dialogue-cond']);
    // A runStat test (T569) has the same bounds rules, names a run story stat, and never sits in a
    // base topic (there is no run at the base).
    expect(banked({ runStat: 'revocations', gte: 1 })).toEqual([]);
    expect(banked({ runStat: 'pivotWave', gte: 1, lte: 5 })).toEqual([]);
    expect(banked({ runStat: 'pivotWave' })).toEqual(['dialogue-cond']);
    expect(banked({ runStat: 'evacuated', gte: 1.5 })).toEqual(['dialogue-cond']);
    expect(banked({ runStat: 'evacuated', gte: 3, lte: 2 })).toEqual(['dialogue-cond']);
    expect(banked({ runStat: 'integrityLost', gte: 1 })).toEqual(['dialogue-cond']);
    const line = { kind: 'line', speaker: 'bricks', text: 'Hm.' } as const;
    const at = (id: string): string[] =>
      rules(
        content({
          scenes: [defineScene(id, [line], { runStat: 'pivotWave', gte: 1 })],
        }),
      );
    expect(at('a1_m01_w03')).toEqual([]);
    expect(at('a1_m01_debrief')).toEqual([]);
    expect(at('a1_m01_base_talk')).toEqual(['dialogue-cond']);
  });

  it('[dialogue-pause] (T501l): only a cue scene pauses the battle', () => {
    const line = { kind: 'line', speaker: 'quill', text: 'Hi.' } as const;
    const pausing = (id: string): Scene => ({ ...defineScene(id, [line]), pause: true });
    expect(rules(content({ scenes: [pausing('a1_m01_cue_look')] }))).toEqual([]);
    for (const id of ['a1_m01_w02', 'a1_m01_brief', 'a1_m01_debrief', 'a1_m01_scene_party']) {
      expect(rules(content({ scenes: [pausing(id)] })), id).toEqual(['dialogue-pause']);
    }
    expect(rules(content({ scenes: [pausing('a1_m01_base_chat')] }))).toEqual(['dialogue-pause']);
  });

  it('[dialogue-bark]', () => {
    expect(rules(content({ barks: [bark({ trigger: { on: 'wave_start', wave: 0 } })] }))).toEqual([
      'dialogue-bark',
    ]);
    expect(
      rules(content({ barks: [bark({ trigger: { on: 'boss_phase', phase: 1.5 } })] })),
    ).toEqual(['dialogue-bark']);
    expect(rules(content({ barks: [bark({ trigger: { on: 'flag' } })] }))).toEqual([
      'dialogue-bark',
    ]);
    expect(rules(content({ barks: [bark({ cooldownSec: -1 })] }))).toEqual(['dialogue-bark']);
    expect(rules(content({ barks: [bark({ cooldownSec: 5, once: 'map' })] }))).toEqual([
      'dialogue-bark',
    ]);
  });

  it('[dialogue-tag]', () => {
    const tags: NameTagDef[] = [
      { map: 'a1_m05', name: 'Marguerite', pick: 'earliest' },
      { map: 'a1_m02', name: 'Denise', pick: 'earliest' },
    ];
    expect(rules(content({ tags }))).toEqual(['dialogue-tag']);
  });
});
