// A3M1's scene branches (content/dialogue/a3/a3_m01/) as the runner plays them, which the canon
// check (tools/dialogueCanon.test.ts, text only) can't see: the Leaving Song after W14 (Thrum hums
// with Pebble and the C1 echo closes it only if she was spared; cleared, the scene simply ends), its
// place in the map's end (before Results), W10's radio either way, the gift-stones debrief, and the
// survey confession's three replies. It lives here because content may not import story
// (shared/architecture.test.ts).
import { describe, expect, it } from 'vitest';
import { scenes as base } from '../content/dialogue/a3/a3_m01/base.ts';
import { scenes } from '../content/dialogue/a3/a3_m01/scenes.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import { RESULTS_FLOW } from '../content/dialogue/resultsFlow.ts';
import type { StoryContext } from './conditions.ts';
import { advance, readThrough, type DialogueCursor } from './runner.ts';

const scene = (id: string) => [...scenes, ...base].find((s) => s.id === id)!;
const ctx = (flags: FlagSet, run: StoryContext['run'] = null): StoryContext => ({
  flags,
  map: 'a3_m01',
  pestsProcessed: 0,
  seen: [],
  run,
});
const SPARED = ctx({ spared_quiet_wave: true });
/** A finished run's context, for the debrief. */
const run = (outcome: 'won' | 'lost'): StoryContext['run'] => ({ outcome, ruleFlags: {} });
const CLEARED = ctx({ spared_quiet_wave: false });

/** Every line `id` plays in `c`, taking option `pick` at each choice, as `speaker: text`. */
function playThrough(id: string, c: StoryContext, pick: number): string[] {
  const sc = scene(id);
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

describe('A3M1 scenes', () => {
  it('plays the Leaving Song before Results, as a win ends (after W14: the road empties first)', () => {
    expect(RESULTS_FLOW.a3_m01).toEqual({ beforeResults: ['a3_m01_scene_song'] });
  });

  it('sings the Leaving Song with Thrum, and ends on the C1 echo, only if she was spared', () => {
    const spared = playThrough('a3_m01_scene_song', SPARED, 0);
    expect(spared).toEqual([
      'pebble: (hum, six notes)',
      'thrum: (hum, six notes)',
      "quill: Melody match: 'Everglow Bright.'",
      'pebble: This is the Leaving Song. The sky sings it when lots of us leave at once. You know it?',
      'vesthara: They thought you were mourning them.',
      'narrator: Old Thrum remembered.',
    ]);
    // Cleared: Pebble hums alone, and after Ves'thara the scene simply ends.
    const cleared = playThrough('a3_m01_scene_song', CLEARED, 2);
    expect(cleared).toEqual([
      'pebble: (hum, six notes)',
      "quill: Melody match: 'Everglow Bright.'",
      'pebble: This is the Leaving Song. The sky sings it when lots of us leave at once. You know it?',
      'vesthara: They thought you were mourning them.',
    ]);
    // Pebble and Thrum hum in their singing portraits.
    const s = scene('a3_m01_scene_song');
    const hums = s.nodes.filter((n) => n.kind === 'line' && n.text === '(hum, six notes)');
    expect(hums.map((n) => (n.kind === 'line' ? [n.speaker, n.expression] : null))).toEqual([
      ['pebble', 'singing'],
      ['thrum', 'singing'],
    ]);
  });

  it('answers the song three ways, none setting a flag, all reaching Ves’thara', () => {
    const step = readThrough(scene('a3_m01_scene_song'), SPARED).cursor.step;
    expect(step.kind).toBe('choice');
    if (step.kind !== 'choice') return;
    expect(step.node.options.map((o) => [o.text, o.tone, o.set, o.goto])).toEqual([
      ["I know it. I'm so sorry.", 'earnest', undefined, undefined],
      ["Everyone knows it. That's the problem.", 'wry', undefined, undefined],
      ['(hum along)', 'quiet', undefined, undefined],
    ]);
    for (const pick of [0, 1, 2]) {
      expect(playThrough('a3_m01_scene_song', CLEARED, pick)).toContain(
        'vesthara: They thought you were mourning them.',
      );
    }
  });

  it('meets Old Thrum at W10 if spared, and remembers her if not', () => {
    expect(playThrough('a3_m01_w10', SPARED, 0)).toEqual([
      'pebble: (squeak) Grandmother!',
      'thrum: You are very tall. It must be lonely up there.',
    ]);
    expect(playThrough('a3_m01_w10', CLEARED, 0)).toEqual([
      'pebble: Grandmother walked with the small ones. The sky sang the Leaving Song that day.',
    ]);
  });

  it('gives the first gift stones in the debrief on a win, and sends you back on a loss', () => {
    expect(playThrough('a3_m01_debrief', ctx({}, run('won')), 0)).toEqual([
      'vesthara: She says: these are ours. Sung, and warm. Take them.',
      'vesthara: She says: the dead do not mind being useful. They mind being forgotten.',
    ]);
    expect(playThrough('a3_m01_debrief', ctx({}, run('lost')), 0)).toEqual([
      'chitterbloom: My young are still in there. So is my road. Walk it again.',
    ]);
  });

  it('lets Bricks answer each reply to the survey confession, Pebble asleep after each', () => {
    const replies = [0, 1, 2].map((pick) => playThrough('a3_m01_base_survey', ctx({}), pick));
    for (const lines of replies) {
      expect(lines.slice(0, 3)).toEqual([
        "bricks: Got something to say, Thorn. Should've said it fifteen years ago.",
        "bricks: I wrote 'vocalizations: non-linguistic.' I heard 'em, kid. I heard 'em singing, and I wrote that.",
        'bricks: Not knowing is a choice. I kept making it.',
      ]);
      expect(lines.at(-1)).toBe('pebble: (squeak, asleep)');
    }
    expect(replies.map((l) => l.slice(3, -1))).toEqual([
      ['bricks: ...Yeah. Working on it.'],
      ['bricks: Longer than both my marriages. Put together.'],
      ['bricks: ', "bricks: Yeah. That's about right."],
    ]);
  });
});
