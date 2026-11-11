// Act III briefing branches this folder owns (act3.md; D143): A3M3's packed-cluster intel plays only
// when A3M2's Clean Exit took the Thumper (`revokedTower`), and on a replay too; A3M1 plates Bramble
// "The Matriarch" until Pebble names her.
import { describe, expect, it } from 'vitest';
import type { StoryContext } from '../../../story/conditions.ts';
import { advance, start, type DialogueCursor } from '../../../story/runner.ts';
import type { TowerId } from '../../types.ts';
import { MAP_DIALOGUE } from '../index.ts';
import type { Scene } from '../types.ts';

const scene = (id: string): Scene =>
  MAP_DIALOGUE.flatMap((d) => d.scenes).find((s) => s.id === id)!;

/** Every line node the scene shows, picking the first option at each choice. */
function play(s: Scene, ctx: StoryContext): DialogueCursor[] {
  const out = [start(s, ctx)];
  let c = out[0]!;
  for (let guard = 0; c.step.kind !== 'end' && guard < 50; guard++) {
    c = advance(s, c, ctx, c.step.kind === 'choice' ? 0 : undefined);
    out.push(c);
  }
  return out;
}
const lines = (cs: DialogueCursor[]): string[] =>
  cs.flatMap((c) => (c.step.kind === 'line' ? [c.step.node.text] : []));

const INTEL =
  'They come packed through here. Sterling took your thumpers. Bring something that chains.';
const ctx = (revokedTowers: readonly TowerId[], doorChosen = false): StoryContext => ({
  flags: doorChosen ? { door_choice: 'convoy' } : {},
  map: 'a3_m03',
  pestsProcessed: 0,
  seen: [],
  run: null,
  revokedTowers,
});

describe('A3M3 briefing: the Thumper-revoked intel (D143 R4b)', () => {
  const brief = scene('a3_m03_brief');

  it('plays last, after the door, when the Clean Exit took the Thumper', () => {
    expect(lines(play(brief, ctx(['thumper']))).at(-1)).toBe(INTEL);
  });

  it('plays on a replay too, the door already chosen', () => {
    const shown = lines(play(brief, ctx(['thumper'], true)));
    expect(shown).not.toContain('Your call, Thorn. Which door do I hold?');
    expect(shown.at(-1)).toBe(INTEL);
  });

  it('never plays when the Clean Exit took another class', () => {
    for (const taken of ['rivet', 'sprinkler', 'skyhook'] as const) {
      expect(lines(play(brief, ctx([taken]))), taken).not.toContain(INTEL);
    }
    expect(lines(play(brief, ctx([])))).not.toContain(INTEL);
  });
});

describe('A3M1 briefing: Bramble is plated "The Matriarch" until Pebble names her (D143 R12)', () => {
  it('plates only her first line', () => {
    const nodes = scene('a3_m01_brief').nodes.filter((n) => n.kind === 'line');
    expect(nodes[0]).toMatchObject({ speaker: 'chitterbloom', plateAs: 'The Matriarch' });
    expect(nodes[1]).toMatchObject({ speaker: 'pebble' });
    expect(nodes[1]!.text).toContain('Her name is Bramble.');
    expect(nodes.slice(1).some((n) => 'plateAs' in n)).toBe(false);
  });
});
