// Act III's presentation dials in the event sounds (T613; core-loop.md § 6.7, enemies.md § 8): no
// win jingle (the jingle stops playing), and the Hollow die with no sound (T601d). Other acts keep
// theirs; the dials come from content/presentation.ts through story/presentation.ts.
import { describe, expect, it } from 'vitest';
import { PRESENTATION } from '../content/presentation.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';
import { createEventSounds, type SoundCall, type SoundDials } from './eventSounds.ts';

type E = SimEvent<IdSpace>;

const FACTIONS: Readonly<Record<string, EnemyFaction>> = {
  mote: 'hollow',
  maw: 'hollow',
  compliance: 'everglow',
};

function run(dials: SoundDials, events: E[]): string[] {
  const s = createEventSounds(dials, {
    splits: () => false,
    faction: (id) => FACTIONS[id] ?? null,
    quietAt: () => false,
  });
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out.map((c) => `${c.kind}:${c.id}`);
}

const died = (enemy: string): E => ({
  type: 'EnemyDied',
  uid: 1,
  enemy,
  bounty: 1,
  killer: { kind: 'tower', uid: 1 },
  x: 2,
  y: 2,
});

const { byAct } = PRESENTATION;

describe("Act III's sound dials (T613)", () => {
  it('plays no win jingle in Act III; the loss cue still plays', () => {
    expect(run(byAct[3], [{ type: 'MapWon' }])).toEqual([]);
    expect(run(byAct[3], [{ type: 'MapLost' }])).toEqual(['cue:lose']);
    for (const act of [1, 2, 'finale'] as const) {
      expect(run(byAct[act], [{ type: 'MapWon' }]), String(act)).toEqual(['cue:win']);
    }
  });

  it('lets the Hollow die silently in Act III, and only the Hollow', () => {
    expect(run(byAct[3], [died('mote'), died('maw')])).toEqual([]);
    expect(run(byAct[3], [died('compliance')])).not.toEqual([]);
    expect(run(byAct[2], [died('mote')])).toEqual(['sfx:hollow_unravel']);
  });

  it('keeps the old behaviour when a caller passes no new dial', () => {
    expect(run({ jingle: 'none', skitterkinDeath: 'linger' }, [{ type: 'MapWon' }])).toEqual([
      'cue:win',
    ]);
    expect(run({ jingle: 'none', skitterkinDeath: 'linger' }, [died('mote')])).toEqual([
      'sfx:hollow_unravel',
    ]);
  });
});
