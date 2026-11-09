// The dialogue runner (story-runtime.md § Dialogue runner): stepping lines, choices that set flags
// and jump, branches that see flags set earlier in the scene, set nodes, the end, resuming, scene
// gates, bark buttons, and slot parsing.
import { describe, expect, it } from 'vitest';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
import type { StoryContext } from './conditions.ts';
import {
  advance,
  labelIndex,
  linesUntilChoice,
  pressButton,
  resume,
  sceneSlot,
  scenePlays,
  start,
  type DialogueCursor,
} from './runner.ts';

const ctx: StoryContext = { flags: {}, map: 'a3_m03', pestsProcessed: 0, seen: [], run: null };

const door: Scene = defineScene('a3_m03_brief', [
  { kind: 'line', speaker: 'bricks', text: 'Two doors. One of us.' },
  { kind: 'set', flag: 'peeker_poked', value: true },
  {
    kind: 'choice',
    options: [
      { text: 'The convoy.', tone: 'earnest', set: { door_choice: 'convoy' }, remember: 'bricks' },
      { text: 'The warren.', tone: 'quiet', set: { door_choice: 'warren' }, goto: 'warren' },
    ],
  },
  { kind: 'branch', cond: { flag: 'door_choice', eq: 'convoy' }, goto: 'convoy', else: 'warren' },
  { kind: 'line', speaker: 'bricks', text: 'Never shown.', label: 'unreached' },
  { kind: 'line', speaker: 'goldie', text: 'Trucks are ready.', label: 'convoy' },
  { kind: 'end' },
  { kind: 'line', speaker: 'bricks', text: 'Warren it is.', label: 'warren' },
  { kind: 'set', callsign: 'waykeeper' },
]);

const walk = (scene: Scene, choices: number[]): DialogueCursor[] => {
  const out = [start(scene, ctx)];
  let c = out[0]!;
  for (let guard = 0; c.step.kind !== 'end' && guard < 50; guard++) {
    c = advance(scene, c, ctx, c.step.kind === 'choice' ? choices.shift() : undefined);
    out.push(c);
  }
  return out;
};
const texts = (cs: DialogueCursor[]): string[] =>
  cs.flatMap((c) => (c.step.kind === 'line' ? [c.step.node.text] : []));

describe('the runner', () => {
  it('rests on a line, runs set nodes on the way, and waits at a choice', () => {
    const c0 = start(door, ctx);
    expect(c0.step).toMatchObject({ kind: 'line', node: { text: 'Two doors. One of us.' } });
    const c1 = advance(door, c0, ctx);
    expect(c1.step.kind).toBe('choice');
    expect(c1.index).toBe(2);
    expect(c1.effects.flags).toEqual({ peeker_poked: true });
  });

  it('takes a choice: sets its flags, and a branch sees them', () => {
    const run = walk(door, [0]);
    expect(texts(run)).toEqual(['Two doors. One of us.', 'Trucks are ready.']);
    const end = run.at(-1)!;
    expect(end.step.kind).toBe('end');
    expect(end.effects).toEqual({
      flags: { peeker_poked: true, door_choice: 'convoy' },
      callsign: null,
    });
    expect(run.find((c) => c.chose !== null)?.chose?.remember).toBe('bricks');
  });

  it('follows a goto, and falls off the end after a set callsign', () => {
    const run = walk(door, [1]);
    expect(texts(run)).toEqual(['Two doors. One of us.', 'Warren it is.']);
    const end = run.at(-1)!;
    expect(end.effects).toEqual({
      flags: { peeker_poked: true, door_choice: 'warren' },
      callsign: 'waykeeper',
    });
    expect(end.index).toBe(door.nodes.length);
    expect(advance(door, end, ctx)).toBe(end);
  });

  it('needs a valid choice at a choice node', () => {
    const at = advance(door, start(door, ctx), ctx);
    expect(() => advance(door, at, ctx)).toThrow('needs a choice');
    expect(() => advance(door, at, ctx, 2)).toThrow('needs a choice');
  });

  it('refuses a cursor from another scene', () => {
    const other = defineScene('a1_m01_w02', [{ kind: 'line', speaker: 'quill', text: 'Hi.' }]);
    expect(() => advance(other, start(door, ctx), ctx)).toThrow('cursor is on');
  });

  it('resumes from a saved index and effects', () => {
    const saved = advance(door, start(door, ctx), ctx);
    const back = resume(door, saved.index, saved.effects, ctx);
    expect(back).toEqual({ ...saved, chose: null });
    expect(JSON.parse(JSON.stringify(back))).toEqual(back);
  });

  it('a branch without else continues; branches read the save’s flags too', () => {
    const s = defineScene('a1_m02_debrief', [
      { kind: 'branch', cond: { flag: 'arrival_reason', eq: 'bonus' }, goto: 'bonus' },
      { kind: 'line', speaker: 'kip', text: 'Plain.' },
      { kind: 'end' },
      { kind: 'line', speaker: 'kip', text: 'Bonus.', label: 'bonus' },
    ]);
    expect(start(s, ctx).step).toMatchObject({ node: { text: 'Plain.' } });
    const bonus = { ...ctx, flags: { arrival_reason: 'bonus' as const } };
    expect(start(s, bonus).step).toMatchObject({ node: { text: 'Bonus.' } });
  });

  it('an empty scene is already at its end; a loop with no line throws', () => {
    expect(start(defineScene('a1_m01_w03', []), ctx).step.kind).toBe('end');
    const loop = defineScene('a1_m01_w04', [
      { kind: 'branch', cond: { act: 3 }, goto: 'top', label: 'top' },
    ]);
    expect(() => start(loop, ctx)).toThrow('loops');
    expect(() => labelIndex(loop, 'nope')).toThrow("no label 'nope'");
  });

  it('judges a scene’s gate', () => {
    const gated = defineScene('a1_m01_w05', [], { mapIs: 'a1_m01' });
    expect(scenePlays(gated, ctx)).toBe(false);
    expect(scenePlays(gated, { ...ctx, map: 'a1_m01' })).toBe(true);
    expect(scenePlays(door, ctx)).toBe(true);
  });
});

describe('linesUntilChoice', () => {
  it('reads the lines up to the first choice, or the end, taking no choice', () => {
    expect(linesUntilChoice(door, ctx).map((l) => l.text)).toEqual(['Two doors. One of us.']);
    const after = defineScene('a3_m03_w02', [
      { kind: 'branch', cond: { flag: 'peeker_poked', eq: true }, goto: 'poked' },
      { kind: 'line', speaker: 'bricks', text: 'Quiet one.' },
      { kind: 'end' },
      { kind: 'line', speaker: 'quill', text: 'Poked!', label: 'poked' },
    ]);
    expect(linesUntilChoice(after, ctx).map((l) => l.text)).toEqual(['Quiet one.']);
    const poked = { ...ctx, flags: { peeker_poked: true } };
    expect(linesUntilChoice(after, poked).map((l) => l.text)).toEqual(['Poked!']);
  });
});

describe('pressButton', () => {
  it('applies the button’s flags and plays its reply; a bare button does neither', () => {
    expect(
      pressButton({ label: "Who's there?", set: { peeker_poked: true }, reply: 'a1_m03_w05' }),
    ).toEqual({ flags: { peeker_poked: true }, reply: 'a1_m03_w05' });
    expect(pressButton({ label: 'Ok' })).toEqual({ flags: {}, reply: null });
  });
});

describe('sceneSlot', () => {
  it('parses every slot kind, and refuses malformed ids', () => {
    expect(sceneSlot('a1_m01_brief')).toEqual({ kind: 'brief' });
    expect(sceneSlot('a1_m05_w08')).toEqual({ kind: 'radio', wave: 8 });
    expect(sceneSlot('a3_m03_cue_seal')).toEqual({ kind: 'cue', name: 'seal' });
    expect(sceneSlot('a2_m04_debrief')).toEqual({ kind: 'debrief' });
    expect(sceneSlot('a1_m05_scene_party')).toEqual({ kind: 'scene', name: 'party' });
    expect(sceneSlot('a1_m03_base_stardust')).toEqual({ kind: 'base', name: 'stardust' });
    expect(sceneSlot('fin_m01_w15')).toEqual({ kind: 'radio', wave: 15 });
    for (const bad of ['a1_m01_w00', 'a1_m01_w8', 'a9_m01_brief', 'a1_m06_brief', 'nope']) {
      expect(sceneSlot(bad), bad).toBeNull();
    }
  });
});
