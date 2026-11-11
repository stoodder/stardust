// T704: the Sproing Pad's cards say what each choice adds (D059): Sky Bouncers its second leaper,
// Big Bonk its damage and splash; every tier names the Pin a bonked flyer takes.
import { describe, expect, it } from 'vitest';
import { towerStats } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { specDescription, statLineText } from './hudText.ts';

describe("the Sproing Pad's cards (T704)", () => {
  it('Sky Bouncers shows its two leapers; Big Bonk its 90 and its splash; each its Pin', () => {
    const pad = battleConfig('a1_m01', 1).content.towers.sproing!;
    const card = (spec: 'a' | 'b'): string =>
      specDescription(towerStats(pad, 4, undefined, [], spec), pad.specs![spec]);
    expect(card('a')).toBe('35 dmg · 0.6/s · range 3 · 2 leapers · Pins flyers 2 s');
    expect(card('b')).toBe('90 dmg · 0.6/s · range 3 · splash 0.8 · Pins flyers 2 s');
    expect(statLineText(towerStats(pad, 1), pad.tiers[0])).toBe(
      '25 dmg · 0.5/s · range 3 · Pins flyers 1.5 s',
    );
  });
});
