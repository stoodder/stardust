// The Holdout's Results card (heldCard.ts; act3.md § A3M3; T614): a won Holdout reads "Held." over
// "Evacuated: {n}."; any other run (an Escort, a Defend map, a loss) keeps the ordinary card.
import { describe, expect, it } from 'vitest';
import { heldCard } from './heldCard.ts';
import type { RunEscort } from './state.ts';

const escort = (over: Partial<RunEscort> = {}): RunEscort => ({
  kind: 'evacuated',
  label: 'Evacuated',
  evacuated: 1234,
  total: 1500,
  lost: 266,
  holdout: true,
  ...over,
});

describe('heldCard', () => {
  it('a won Holdout: "Held." and "Evacuated: {n}."', () => {
    expect(heldCard({ outcome: 'won', escort: escort() })).toEqual({
      headline: 'Held.',
      line: 'Evacuated: 1,234.',
    });
    expect(heldCard({ outcome: 'won', escort: escort({ evacuated: 0 }) })?.line).toBe(
      'Evacuated: 0.',
    );
  });

  it('anything else keeps the ordinary card', () => {
    expect(heldCard({ outcome: 'won', escort: null })).toBeNull();
    expect(heldCard({ outcome: 'won', escort: escort({ holdout: false }) })).toBeNull();
    const { holdout: _, ...plain } = escort();
    expect(heldCard({ outcome: 'won', escort: plain })).toBeNull();
    expect(heldCard({ outcome: 'lost', escort: escort() })).toBeNull();
  });
});
