// Bark selection (story-runtime.md § Barks; style-guide § 5.5): trigger matching and specificity,
// presence and silence for an absent speaker, spacing, once-per-map and once-per-campaign, cooldowns,
// no-repeat pools, seeded determinism, priority across one moment's events, and script cues.
import { describe, expect, it } from 'vitest';
import type { Bark, BarkTrigger } from '../content/dialogue/types.ts';
import {
  BARK_SPACING_SEC,
  campaignBarksPlayed,
  cueBark,
  eventPriority,
  newBarkState,
  pickBark,
  pickBarkOf,
  triggerMatches,
  type BarkEvent,
  type BarkState,
} from './barks.ts';
import type { StoryContext } from './conditions.ts';

const ctx: StoryContext = { flags: {}, map: 'a1_m02', pestsProcessed: 0, seen: [], run: null };
const present = ['quill', 'bricks'] as const;
const ev = (
  trigger: BarkTrigger,
  atSec: number,
  who: BarkEvent['present'] = present,
): BarkEvent => ({
  trigger,
  atSec,
  present: who,
});

const killed: Bark = {
  id: 'quill_enemy_killed_a1_01',
  speaker: 'quill',
  text: 'Sack ruptured! Glitter everywhere!',
  trigger: { on: 'enemy_killed', enemy: 'hauler' },
};
const genericSold: Bark = {
  id: 'quill_tower_sold_a1_01',
  speaker: 'quill',
  text: 'Refund processed!',
  trigger: { on: 'tower_sold' },
};
const deniseSold: Bark = {
  id: 'bricks_tower_sold_a1_01',
  speaker: 'bricks',
  text: "You sold Denise. ...Fair. She'd have done the same.",
  trigger: { on: 'tower_sold', tagged: true },
};

describe('triggerMatches', () => {
  it('matches the id and every parameter the bark names', () => {
    // `ally_hushed` may name the hushed ally's kind (T500b): A3M6's bearers, the finale's singers.
    const refugee = { on: 'ally_hushed', ally: 'refugee' } as const;
    expect(triggerMatches(refugee, { on: 'ally_hushed', ally: 'refugee' })).toBe(true);
    expect(triggerMatches(refugee, { on: 'ally_hushed', ally: 'singer' })).toBe(false);
    expect(triggerMatches({ on: 'ally_hushed' }, { on: 'ally_hushed', ally: 'bearer' })).toBe(true);
    expect(triggerMatches(killed.trigger, { on: 'enemy_killed', enemy: 'hauler' })).toBe(true);
    expect(triggerMatches(killed.trigger, { on: 'enemy_killed', enemy: 'chonk' })).toBe(false);
    expect(triggerMatches(genericSold.trigger, { on: 'tower_sold', tagged: true })).toBe(true);
    expect(triggerMatches(deniseSold.trigger, { on: 'tower_sold', tagged: false })).toBe(false);
    expect(
      triggerMatches(
        { on: 'wave_cleared', boss: true },
        { on: 'wave_cleared', wave: 9, boss: true },
      ),
    ).toBe(true);
    expect(triggerMatches({ on: 'wave_cleared', wave: 2 }, { on: 'wave_cleared', wave: 3 })).toBe(
      false,
    );
  });

  it('filters not_firing by wave: a W10 line waits for W10, a generic one takes any (T330)', () => {
    const w10: Bark = {
      id: 'bricks_not_firing_a1_05',
      speaker: 'bricks',
      text: '...You okay, Sprout?',
      trigger: { on: 'not_firing', wave: 10 },
      once: 'map',
    };
    expect(triggerMatches(w10.trigger, { on: 'not_firing', wave: 10 })).toBe(true);
    expect(triggerMatches(w10.trigger, { on: 'not_firing', wave: 4 })).toBe(false);
    expect(triggerMatches(w10.trigger, { on: 'not_firing' })).toBe(false);
    expect(triggerMatches({ on: 'not_firing' }, { on: 'not_firing', wave: 4 })).toBe(true);
    // An early hold plays nothing and leaves the line for W10.
    const early = pickBark([w10], ev({ on: 'not_firing', wave: 4 }, 10), newBarkState(1), ctx);
    expect(early.bark).toBeNull();
    const late = pickBark([w10], ev({ on: 'not_firing', wave: 10 }, 90), early.state, ctx);
    expect(late.bark?.id).toBe(w10.id);
  });
});

describe('pickBark', () => {
  it('plays a matching bark once per map by default', () => {
    const s0 = newBarkState(1);
    const a = pickBark([killed], ev(killed.trigger, 10), s0, ctx);
    expect(a.bark).toBe(killed);
    const b = pickBark([killed], ev(killed.trigger, 100), a.state, ctx);
    expect(b.bark).toBeNull();
  });

  it('prefers the most specific bark (the tagged sale over the generic one)', () => {
    const pool = [genericSold, deniseSold];
    expect(
      pickBark(pool, ev({ on: 'tower_sold', tagged: true }, 0), newBarkState(1), ctx).bark,
    ).toBe(deniseSold);
    expect(
      pickBark(pool, ev({ on: 'tower_sold', tagged: false }, 0), newBarkState(1), ctx).bark,
    ).toBe(genericSold);
  });

  it('only present speakers bark; an absent speaker’s silence still plays', () => {
    const silence: Bark = {
      id: 'bricks_wave_cleared_a3_01',
      speaker: 'bricks',
      text: '',
      durationSec: 2,
      trigger: { on: 'wave_cleared' },
    };
    const voiced: Bark = {
      id: 'bricks_wave_cleared_a3_02',
      speaker: 'bricks',
      text: 'Clear.',
      trigger: { on: 'wave_cleared' },
    };
    const pick = pickBark(
      [voiced, silence],
      ev({ on: 'wave_cleared', wave: 2 }, 0, ['quill']),
      newBarkState(1),
      ctx,
    );
    expect(pick.bark).toBe(silence);
    expect(
      pickBark([voiced], ev({ on: 'wave_cleared', wave: 2 }, 0, ['quill']), newBarkState(1), ctx)
        .bark,
    ).toBeNull();
  });

  it('holds its `when`', () => {
    const bonus: Bark = {
      ...killed,
      id: 'quill_enemy_killed_a1_02',
      when: { flag: 'arrival_reason', eq: 'bonus' },
    };
    expect(pickBark([bonus], ev(killed.trigger, 0), newBarkState(1), ctx).bark).toBeNull();
    const withBonus = { ...ctx, flags: { arrival_reason: 'bonus' as const } };
    expect(pickBark([bonus], ev(killed.trigger, 0), newBarkState(1), withBonus).bark).toBe(bonus);
  });

  it('spaces barks 6 s of sim time apart, dropping (not queueing) the blocked one', () => {
    const other: Bark = { ...genericSold };
    const a = pickBark([killed, other], ev(killed.trigger, 10), newBarkState(1), ctx);
    const blocked = pickBark(
      [killed, other],
      ev({ on: 'tower_sold' }, 10 + BARK_SPACING_SEC - 0.1),
      a.state,
      ctx,
    );
    expect(blocked.bark).toBeNull();
    expect(blocked.state.played).toEqual([killed.id]);
    const later = pickBark(
      [killed, other],
      ev({ on: 'tower_sold' }, 10 + BARK_SPACING_SEC),
      blocked.state,
      ctx,
    );
    expect(later.bark).toBe(other);
  });

  it('a once-per-campaign bark already in the save never plays', () => {
    const once: Bark = { ...killed, once: 'campaign' };
    expect(
      pickBark([once], ev(killed.trigger, 0), newBarkState(1), { ...ctx, seen: [once.id] }).bark,
    ).toBeNull();
    const pick = pickBark([once], ev(killed.trigger, 0), newBarkState(1), ctx);
    expect(campaignBarksPlayed(pick.state, [once, genericSold])).toEqual([once.id]);
  });

  it('repeats a bark with a cooldown once it has passed', () => {
    const idle: Bark = {
      id: 'quill_idle_a1_01',
      speaker: 'quill',
      text: 'Still there?',
      trigger: { on: 'idle' },
      cooldownSec: 30,
    };
    let s: BarkState = pickBark([idle], ev({ on: 'idle' }, 0), newBarkState(1), ctx).state;
    expect(pickBark([idle], ev({ on: 'idle' }, 29), s, ctx).bark).toBeNull();
    const again = pickBark([idle], ev({ on: 'idle' }, 30), s, ctx);
    expect(again.bark).toBe(idle);
    s = again.state;
    expect(s.played).toEqual([idle.id, idle.id]);
  });

  it('draws a pool without repeats until it is exhausted, deterministically by seed', () => {
    const pool: Bark[] = [1, 2, 3].map((n) => ({
      id: `quill_perfect_wave_a1_0${n}`,
      speaker: 'quill',
      text: `Perfect ${n}.`,
      trigger: { on: 'perfect_wave' },
      cooldownSec: 1,
    }));
    const draw = (seed: number): string[] => {
      let s = newBarkState(seed);
      const out: string[] = [];
      for (let i = 0; i < 6; i++) {
        const p = pickBark(pool, ev({ on: 'perfect_wave' }, i * 10), s, ctx);
        s = p.state;
        out.push(p.bark?.id ?? 'none');
      }
      return out;
    };
    const a = draw(7);
    expect(new Set(a.slice(0, 3)).size).toBe(3);
    expect(a).not.toContain('none');
    expect(draw(7)).toEqual(a);
    const seeds = new Set([1, 2, 3, 4, 5, 6, 7, 8].map((s) => draw(s).slice(0, 3).join()));
    expect(seeds.size).toBeGreaterThan(1);
  });
});

describe('priority and script cues', () => {
  it('ranks boss lines, then first-time triggers, then repeats', () => {
    const s = { ...newBarkState(1), fired: ['wave_cleared' as const] };
    expect(eventPriority(ev({ on: 'boss_phase', phase: 2 }, 0), s)).toBe(1);
    expect(eventPriority(ev({ on: 'wave_start', wave: 9, boss: true }, 0), s)).toBe(1);
    expect(eventPriority(ev({ on: 'first_leak' }, 0), s)).toBe(2);
    expect(eventPriority(ev({ on: 'wave_cleared', wave: 3 }, 0), s)).toBe(3);
  });

  it('plays the highest-priority event of a moment and counts every event as fired', () => {
    const cleared: Bark = {
      id: 'quill_wave_cleared_a1_01',
      speaker: 'quill',
      text: 'Clear.',
      trigger: { on: 'wave_cleared' },
    };
    const leak: Bark = {
      id: 'quill_first_leak_a1_01',
      speaker: 'quill',
      text: 'Leak!',
      trigger: { on: 'first_leak' },
    };
    const s = { ...newBarkState(1), fired: ['wave_cleared' as const] };
    const pick = pickBarkOf(
      [cleared, leak],
      [ev({ on: 'wave_cleared', wave: 2 }, 5), ev({ on: 'first_leak' }, 5)],
      s,
      ctx,
    );
    expect(pick.bark).toBe(leak);
    expect(pick.state.fired).toEqual(['wave_cleared', 'first_leak']);
    const none = pickBarkOf(
      [],
      [ev({ on: 'idle' }, 5), ev({ on: 'map_start' }, 5)],
      newBarkState(1),
      ctx,
    );
    expect(none.bark).toBeNull();
    expect(none.state.fired).toEqual(['idle', 'map_start']);
  });

  it('a script cue plays whatever the spacing, and later barks space from it', () => {
    const first = pickBark([killed], ev(killed.trigger, 10), newBarkState(1), ctx);
    const cued = cueBark(deniseSold, 11, first.state);
    expect(cued.played).toEqual([killed.id, deniseSold.id]);
    expect(cued.lastAtSec).toBe(11);
    expect(pickBark([genericSold], ev({ on: 'tower_sold' }, 16), cued, ctx).bark).toBeNull();
  });
});
