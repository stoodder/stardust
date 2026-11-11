// T714: Zibzab's crate's card (crate.ts): what it lists (the tune-ups it installs, or the Field
// Protocols to pick one from), Clock in opening the card first on A3M6 only, and the pick it owes.
import { afterEach, describe, expect, it } from 'vitest';
import { crateOffer } from '../../app/storyMeta.ts';
import { DEV_SAVES } from '../../meta/__fixtures__/devSaves.ts';
import {
  canTake,
  crate,
  crateHere,
  crateIntercepts,
  crateLine,
  crateView,
  ranksText,
  resetCrate,
  takeCrate,
  takenPick,
} from './crate.ts';

afterEach(resetCrate);

describe("Zibzab's crate's card (T714)", () => {
  it('lists the tune-ups it installs, with the ranks each gains', () => {
    const save = DEV_SAVES.after_a2m6.build();
    const view = crateView(crateOffer(save), save);
    expect(view?.kind).toBe('tune_ups');
    if (view?.kind !== 'tune_ups') return;
    expect(view.rows.length).toBeGreaterThan(0);
    for (const r of view.rows) {
      expect(r.name).toMatch(/Tune-up/);
      expect(r.ranks).toMatch(/^(Rank \d|Ranks \d–\d|All \d ranks)$/);
    }
    expect(canTake(view, null)).toBe(true);
    expect(crateLine(view)).not.toContain('!');
  });

  it('offers the protocols to pick from when it holds no tune-up, and owes a pick', () => {
    const save = DEV_SAVES.fresh.build();
    const view = crateView(crateOffer(save), save);
    expect(view?.kind).toBe('pick');
    if (view?.kind !== 'pick') return;
    expect(view.options.length).toBeGreaterThan(0);
    expect(view.options[0]?.effect).not.toBe('');
    expect(canTake(view, null)).toBe(false);
    expect(takeCrate(view)).toBe(false);
    crate.pick.value = view.options[0]!.id;
    expect(takeCrate(view)).toBe(true);
    expect(takenPick()).toBe(view.options[0]!.id);
  });

  it('opens its card on Clock in on A3M6 only, once, until taken', () => {
    const save = DEV_SAVES.after_a2m6.build();
    expect(crateHere('a3_m05', save)).toBeNull();
    const view = crateHere('a3_m06', save);
    expect(view).not.toBeNull();
    expect(crateIntercepts(null)).toBe(false);
    expect(crate.open.value).toBe(false);
    expect(crateIntercepts(view)).toBe(true);
    expect(crate.open.value).toBe(true);
    expect(takeCrate(view!)).toBe(true);
    expect(crate.open.value).toBe(false);
    // Taken: Clock in now closes the briefing; no pick owed for tune-ups.
    expect(crateIntercepts(view)).toBe(false);
    expect(takenPick()).toBeUndefined();
  });

  it('says ranks plainly', () => {
    expect(ranksText(0, 3)).toBe('All 3 ranks');
    expect(ranksText(1, 3)).toBe('Ranks 2–3');
    expect(ranksText(2, 3)).toBe('Rank 3');
    expect(ranksText(0, 1)).toBe('Rank 1');
  });
});
