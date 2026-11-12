// The finale's story/meta seams (T800b; D154): C5 (`resolveC5`, its body T810's), and the dev
// saves into and out of the finale: every C4 answer and both choir extremes after A3M6, and
// `after_fin_{stay,go}` (C5 made by `resolveC5`).
import { describe, expect, it } from 'vitest';
import { CAMPAIGN } from '../content/campaign.ts';
import { FIN_CHOIR_CELLS } from '../content/upgrades/reference.ts';
import { DEV_SAVES } from './__fixtures__/devSaves.ts';
import { C5, C5_CHOICES, resolveC5, type C5Choice } from './storyTransactions.ts';

const isRegistered = (id: string): boolean => (CAMPAIGN as readonly string[]).includes(id);
const build = (id: keyof typeof DEV_SAVES) => DEV_SAVES[id].build();

/** The reference into the finale with the finale won (a record stood in while it is unbuilt). */
function finaleWon() {
  const save = build('after_a3m6_rewrite');
  // fin_m01 isn't a registered map id yet: a record keyed by it is written as the run end will.
  (save.campaign.maps as Record<string, unknown>)['fin_m01'] = {
    completed: true,
    medals: ['victory'],
    bestMeter: 48,
  };
  return save;
}

describe('resolveC5 (bible.md § 9, C5; T810)', () => {
  it("answers with the ending_choice flag's values, in the ledger's order", () => {
    expect(C5_CHOICES).toEqual(['stay', 'go']);
    expect(C5).toEqual({ map: 'fin_m01', task: 'T810' });
  });

  it("refuses a value outside the flag's, and before the finale is won", () => {
    const save = build('after_a3m6_rewrite');
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a value outside the flag's
    const odd = resolveC5(save, 'maybe' as C5Choice);
    expect(odd).toMatchObject({ ok: false, reason: 'invalid' });
    expect(resolveC5(save, 'stay')).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('once due, sets ending_choice and nothing else, once; an answered save is left as it is', () => {
    for (const c5 of C5_CHOICES) {
      const before = finaleWon();
      const r = resolveC5(before, c5);
      if (!r.ok) throw new Error(r.message);
      expect(r.applied).toEqual({ kind: 'c5', choice: c5 });
      expect(r.save.story.flags).toEqual({ ...before.story.flags, ending_choice: c5 });
      expect({ ...r.save, story: { ...r.save.story, flags: before.story.flags } }).toEqual(before);
      // The input is untouched, and a second answer changes nothing (never re-asked).
      expect(before.story.flags.ending_choice).toBeUndefined();
      const again = resolveC5(r.save, c5 === 'stay' ? 'go' : 'stay');
      expect(again).toEqual({ ok: true, save: r.save, applied: null });
    }
    const answered = build('after_a3m6_rewrite');
    answered.story.flags.ending_choice = 'stay';
    expect(resolveC5(answered, 'go')).toEqual({ ok: true, save: answered, applied: null });
  });
});

describe('the dev saves into and out of the finale', () => {
  it.runIf(isRegistered('a3_m06'))('after_a3m6_<c4>: the reference with each C4 answer', () => {
    for (const c4 of ['keep', 'purge', 'rewrite'] as const) {
      const save = build(`after_a3m6_${c4}`);
      expect(save.story.flags, c4).toMatchObject({
        quill_choice: c4,
        door_choice: 'convoy',
        spared_quiet_wave: false,
        stardust_choice: 'returned',
      });
      expect(isRegistered('a3_m06') && save.campaign.maps.a3_m06?.completed, c4).toBe(true);
      expect(save.unlocks.abilities.includes('time_dilation'), c4).toBe(c4 === 'keep');
      expect(save.unlocks.specs, c4).toContain('mindspike'); // par's Echo Spike and Dread (T821)
    }
    // `after_a3m6` is the Rewrite one, kept by its old id, before the finale's prep: the
    // `after_a3m6_<c4>` saves have also bought the Mindspike specs (FIN's row: 3 Intel; T821).
    const plain = build('after_a3m6');
    const prepped = build('after_a3m6_rewrite');
    expect(plain.unlocks.specs).not.toContain('mindspike');
    expect(prepped.unlocks.specs).toEqual([...plain.unlocks.specs, 'mindspike']);
    expect(prepped.currencies.intel).toBe(plain.currencies.intel - 3);
    expect({
      ...prepped,
      unlocks: { ...prepped.unlocks, specs: plain.unlocks.specs },
      currencies: { ...prepped.currencies, intel: plain.currencies.intel },
    }).toEqual(plain);
  });

  it.runIf(isRegistered('a3_m06'))("the choir's extremes carry FIN_CHOIR_CELLS' flags", () => {
    expect(build('after_a3m6_weakest').story.flags).toMatchObject(FIN_CHOIR_CELLS.weakest);
    expect(build('after_a3m6_strongest').story.flags).toMatchObject(FIN_CHOIR_CELLS.strongest);
    // Sell's windfall and tune-up on the weakest; the warren's paid jailbreak on the strongest.
    expect(build('after_a3m6_weakest').upgrades.tune_zibzab).toBe(1);
    expect(build('after_a3m6_strongest').unlocks.towers).toContain('choir');
  });

  it.runIf(!isRegistered('fin_m01'))(
    'after_fin_<c5> equal A3M6’s until the finale is registered',
    () => {
      expect(build('after_fin_stay')).toEqual(build('after_a3m6_rewrite'));
      expect(build('after_fin_go')).toEqual(build('after_a3m6_rewrite'));
    },
  );

  it.runIf(isRegistered('fin_m01'))(
    'after_fin_<c5>: the finale won, C5 answered, never re-asked',
    () => {
      for (const c5 of C5_CHOICES) {
        const save = build(`after_fin_${c5}`);
        expect(save.story.flags.ending_choice).toBe(c5);
        expect(save.unlocks.specs).toContain('mindspike');
        expect(save.story.seen).toEqual(
          expect.arrayContaining(['fin_m01_scene_dawn', 'fin_m01_scene_c5']),
        );
        const again = resolveC5(save, c5 === 'stay' ? 'go' : 'stay');
        expect(again).toEqual({ ok: true, save, applied: null });
      }
    },
  );
});
