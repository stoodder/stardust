// Each veteran modifier in a real run (T860; design/progression.md § 6, a test per modifier): the
// replay's config as app/battleSetup.ts builds it from the briefing's picks, and the sim under it.
import { describe, expect, it } from 'vitest';
import type { IdSpace } from '../content/types.ts';
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import type { SaveData } from '../meta/saveData.ts';
import {
  GLASS_CORE_INTEGRITY,
  VETERAN_MODIFIER_IDS,
  veteranConfig,
  veteranModsOf,
  withVeteranPick,
  type VeteranModifierId,
} from '../meta/veteran.ts';
import { createSim, slotRevoked, type SimConfig, type SimEvent } from '../sim/index.ts';
import { runWaveModifiers } from '../sim/systems/waves.ts';
import { battleConfig } from './battleSetup.ts';

/** A save with Act II won: protocols owned and equipped, more than three tower types. */
const actTwo = (): SaveData => DEV_SAVES.after_a2m6.build();
/** Rig Nine (a defend map with a core), won in `actTwo`. */
const RIG = 'a2_m01';

/** The config of a replay of Rig Nine under `mods` (the picker's record, as the briefing writes it). */
function replay(mods: readonly VeteranModifierId[], save = actTwo()): SimConfig<IdSpace> {
  return battleConfig(RIG, 7, withVeteranPick(save, RIG, mods));
}

/** The % terms on starting credits in a config. */
const startPct = (c: SimConfig<IdSpace>): number =>
  c.modifiers
    .filter((m) => m.kind === 'economy' && m.stat === 'startCredits')
    .reduce((sum, m) => sum + ('pct' in m ? (m.pct ?? 0) : 0), 0);

/** A config's modifiers from Field Protocols. */
const fromProtocol = (c: SimConfig<IdSpace>) =>
  c.modifiers.filter((m) => m.source.startsWith('protocol:'));

/** The first countdown a run's sim starts (after wave 1 is called), in ticks. */
function firstCountdown(cfg: SimConfig<IdSpace>): number {
  const s = createSim(cfg);
  s.enqueue({ type: 'callWave' });
  for (let i = 0; i < 60 * 600 && s.state.schedule.countdownTotalTicks === 0; i++) s.step();
  return s.state.schedule.countdownTotalTicks;
}

describe('each modifier in the run (a test per modifier)', () => {
  const base = replay([]);
  const sim = (mods: readonly VeteranModifierId[]) => createSim(replay(mods));

  it('no picks: the config is the same as one built with no veteran record', () => {
    expect(JSON.stringify(replay([]))).toBe(JSON.stringify(battleConfig(RIG, 7, actTwo())));
    expect(base.rules).toBeUndefined();
    expect(veteranConfig(base, [])).toBe(base);
  });

  it('Hardened Hides: enemies +40% HP and shields', () => {
    const w = runWaveModifiers(replay(['hardened_hides']));
    const b = runWaveModifiers(base);
    expect(w.enemyPct.hp - b.enemyPct.hp).toBeCloseTo(0.4);
    expect(w.enemyPct.shield - b.enemyPct.shield).toBeCloseTo(0.4);
    const id = Object.keys(base.content.enemies)[0]!;
    expect(w.enemies.get(id)!.hp).toBeCloseTo(base.content.enemies[id]!.hp * 1.4, 5);
  });

  it('Double Time: enemies +20% speed', () => {
    const w = runWaveModifiers(replay(['double_time']));
    expect(w.enemyPct.speed - runWaveModifiers(base).enemyPct.speed).toBeCloseTo(0.2);
  });

  it('Lean Budget: −30% starting credits, −20% bounties', () => {
    const lean = sim(['lean_budget']).state;
    const plain = createSim(base).state;
    expect(lean.economy.bountyPct - plain.economy.bountyPct).toBeCloseTo(-0.2);
    expect(lean.credits).toBeLessThan(plain.credits);
    // The start's % terms add (Head Start's +10% and Lean Budget's −30% on the save's ones).
    expect(startPct(replay(['lean_budget'])) - startPct(base)).toBeCloseTo(-0.3);
  });

  it('Glass Core: core integrity 5 (Reinforced Core ranks still add)', () => {
    const save = actTwo();
    const ranks = save.upgrades['reinforced_core'] ?? 0;
    expect(sim(['glass_core']).state.integrity).toBe(GLASS_CORE_INTEGRITY + ranks);
    expect(createSim(base).state.integrity).toBeGreaterThan(GLASS_CORE_INTEGRITY + ranks);
  });

  it('Radio Silence: slot 1 empty, the companion slot dark, every cast refused', () => {
    const cfg = replay(['radio_silence']);
    expect(cfg.abilities.slot1).toBeNull();
    expect(cfg.rules).toEqual([{ kind: 'noAbilities', source: 'veteran:radio_silence' }]);
    const s = createSim(cfg);
    const events: SimEvent<IdSpace>[] = [];
    for (const slot of [1, 2] as const) {
      s.enqueue({ type: 'ability', slot, target: [3, 3] });
      s.step();
      s.drainEvents(events);
    }
    const reasons = events.flatMap((e) => (e.type === 'CommandRejected' ? [e.reason] : []));
    expect(reasons).toEqual(
      cfg.abilities.slot2 === null ? ['noAbility'] : ['noAbility', 'revoked'],
    );
    expect(events.some((e) => e.type === 'AbilityUsed')).toBe(false);
    if (cfg.abilities.slot2 !== null) expect(slotRevoked(s.state, cfg, 2)).toBe(true);
    expect(slotRevoked(createSim(base).state, base, 2)).toBe(false);
  });

  it('Short-Handed: the first three towers in build-slot order deploy', () => {
    expect(base.loadout.length).toBe(4);
    const cfg = replay(['short_handed']);
    expect(cfg.loadout).toEqual(base.loadout.slice(0, 3));
    expect(cfg.specsUnlocked.every((t) => cfg.loadout.includes(t))).toBe(true);
    // The sim refuses a fourth under the rule.
    expect(() => createSim({ ...cfg, loadout: base.loadout })).toThrow(/allows 3/);
  });

  it('No Protocols: every Field Protocol modifier leaves the run', () => {
    expect(fromProtocol(base).length).toBeGreaterThan(0);
    const cfg = replay(['no_protocols']);
    expect(fromProtocol(cfg)).toEqual([]);
    expect(() => createSim(cfg)).not.toThrow();
    // The sim refuses a protocol's modifier under the rule.
    expect(() => createSim({ ...cfg, modifiers: base.modifiers })).toThrow(/noProtocols/);
  });

  it('Rush Hour: wave countdowns −50%', () => {
    const w = runWaveModifiers(replay(['rush_hour']));
    expect(w.countdownPct - runWaveModifiers(base).countdownPct).toBeCloseTo(-0.5);
    // The first countdown that runs (after wave 1 starts): half as long.
    const plain = firstCountdown(base);
    expect(plain).toBeGreaterThan(0);
    expect(firstCountdown(replay(['rush_hour']))).toBe(Math.round(plain * 0.5));
  });

  it('stacks all eight in one valid run, and the config names them (veteranModsOf)', () => {
    const cfg = replay(VETERAN_MODIFIER_IDS);
    expect(veteranModsOf(cfg)).toEqual([...VETERAN_MODIFIER_IDS]);
    expect(veteranModsOf(base)).toEqual([]);
    const s = createSim(cfg);
    for (let i = 0; i < 600; i++) s.step();
    expect(s.state.outcome).toBe('playing');
  });
});
