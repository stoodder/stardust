// T705: the Gloop Spitter's spec cards say what each choice adds (D059): Big Glorp its puddle,
// Corrosive Kiss its 3 stacks.
import { describe, expect, it } from 'vitest';
import { towerStats } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { specDescription } from './hudText.ts';

describe("the Gloop Spitter's cards (T705)", () => {
  it('Big Glorp shows its puddle; Corrosive Kiss its stacks', () => {
    const gloop = battleConfig('a1_m01', 1).content.towers.gloop!;
    const card = (spec: 'a' | 'b'): string =>
      specDescription(towerStats(gloop, 4, undefined, [], spec), gloop.specs![spec]);
    expect(card('a')).toBe('16 dmg · 0.6/s · range 3 · splash 1 · 2 Corroded · puddle 3 s');
    expect(card('b')).toBe('16 dmg · 0.6/s · range 3 · splash 1 · 3 Corroded');
  });
});
