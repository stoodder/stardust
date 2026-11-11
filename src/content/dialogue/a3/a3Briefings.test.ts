// Act III briefing branches this folder owns (act3.md; D143), read from the scene data (content
// can't import story; story/runner.ts plays them): A3M3's packed-cluster intel sits behind the
// `revokedTower: 'thumper'` branch that both the door question and a replay reach, with nothing
// after it; A3M1 plates Bramble "The Matriarch" until Pebble names her.
import { describe, expect, it } from 'vitest';
import { MAP_DIALOGUE } from '../index.ts';
import type { DialogueNode, Scene } from '../types.ts';

const scene = (id: string): Scene =>
  MAP_DIALOGUE.flatMap((d) => d.scenes).find((s) => s.id === id)!;

const INTEL =
  'They come packed through here. Sterling took your thumpers. Bring something that chains.';

describe('A3M3 briefing: the Thumper-revoked intel (D143 R4b)', () => {
  const nodes = scene('a3_m03_brief').nodes;
  const at = (label: string): number => nodes.findIndex((n) => n.label === label);
  const node = (label: string): DialogueNode => nodes[at(label)]!;

  it('plays the intel only when the Clean Exit took the Thumper, else ends', () => {
    expect(node('done')).toMatchObject({
      kind: 'branch',
      cond: { revokedTower: 'thumper' },
      goto: 'packed',
      else: 'end',
    });
    expect(node('end').kind).toBe('end');
    expect(node('packed')).toMatchObject({ kind: 'line', speaker: 'bricks', text: INTEL });
    // The last node: nothing follows the intel.
    expect(at('packed')).toBe(nodes.length - 1);
  });

  it('comes after the door question, and a replay (the door already chosen) still reaches it', () => {
    const question = nodes.findIndex(
      (n) => n.kind === 'line' && n.text === 'Your call, Thorn. Which door do I hold?',
    );
    expect(question).toBeGreaterThan(0);
    expect(question).toBeLessThan(at('done'));
    expect(node('door')).toMatchObject({ kind: 'branch', goto: 'done' });
    // The door choice falls through to it.
    expect(nodes[at('done') - 1]!.kind).toBe('choice');
  });
});

describe('A3M1 briefing: Bramble is plated "The Matriarch" until Pebble names her (D143 R12)', () => {
  it('plates only her first line', () => {
    const lines = scene('a3_m01_brief').nodes.filter((n) => n.kind === 'line');
    expect(lines[0]).toMatchObject({ speaker: 'chitterbloom', plateAs: 'The Matriarch' });
    expect(lines[1]).toMatchObject({ speaker: 'pebble' });
    expect(lines[1]!.text).toContain('Her name is Bramble.');
    expect(lines.slice(1).some((n) => 'plateAs' in n)).toBe(false);
  });
});
