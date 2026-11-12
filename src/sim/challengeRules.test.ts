// A challenge map's rules (sim/rules.ts `challengeConfig`; T862), on the fixture map given a
// `challenge`: createSim applies them first (sourced `challenge:<map>`), fits the config to them,
// leaves a config that already carries them alone, and changes nothing on a map without them.
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '../content/compiled.ts';
import type { ChallengeRuleDef, IdSpace } from '../content/types.ts';
import { fixtureConfig } from './__fixtures__/sim.ts';
import { createSim, type SimConfig } from './index.ts';
import {
  allCloaked,
  challengeConfig,
  CHALLENGE_GLASS_CORE_INTEGRITY,
  radioSilent,
  ruleConfigErrors,
  towerFactionRule,
} from './rules.ts';

/** The fixture's config on fx_map carrying `rules` as its challenge. */
function onChallenge(rules: readonly ChallengeRuleDef[]): SimConfig<IdSpace> {
  const cfg: SimConfig<IdSpace> = fixtureConfig();
  const map = cfg.content.maps[cfg.mapId]!;
  const content: CompiledContent<IdSpace> = {
    ...cfg.content,
    maps: { ...cfg.content.maps, [cfg.mapId]: { ...map, challenge: { tagline: 'x', rules } } },
  };
  return { ...cfg, content };
}

/** A run's state hash after `ticks` ticks with wave 1 called. */
function hashAfter(cfg: SimConfig<IdSpace>, ticks: number): string {
  const sim = createSim(cfg);
  sim.enqueue({ type: 'callWave' });
  for (let i = 0; i < ticks; i++) sim.step();
  return sim.hash();
}

describe('challenge rules (T862)', () => {
  it('a map without a challenge runs exactly as before', () => {
    const cfg = fixtureConfig();
    expect(challengeConfig(cfg)).toBe(cfg);
    expect(createSim(cfg).config).toBe(cfg);
  });

  it('joins the rules sourced challenge:<map>, and fits the config to them', () => {
    const cfg = onChallenge([
      { kind: 'towerFaction', faction: 'everglow' },
      { kind: 'allCloaked' },
      { kind: 'noAbilities' },
      { kind: 'glassCore' },
    ]);
    const out = challengeConfig(cfg);
    expect(out.rules).toEqual([
      { kind: 'towerFaction', faction: 'everglow', source: 'challenge:fx_map' },
      { kind: 'allCloaked', source: 'challenge:fx_map' },
      { kind: 'noAbilities', source: 'challenge:fx_map' },
    ]);
    expect(out.modifiers).toEqual([
      {
        kind: 'economy',
        stat: 'coreIntegrity',
        set: CHALLENGE_GLASS_CORE_INTEGRITY,
        source: 'challenge:fx_map',
      },
    ]);
    expect(out.loadout).toEqual(cfg.loadout); // every fixture tower is Everglow
    expect(out.abilities.slot1).toBeNull(); // Radio Silence empties slot 1
    expect(towerFactionRule(out)).toBe('everglow');
    expect(allCloaked(out)).toBe(true);
    expect(radioSilent(out)).toBe(true);
    // Idempotent: a config that carries them already is left alone.
    expect(challengeConfig(out)).toBe(out);
  });

  it('towerFaction keeps the loadout to its faction (and only those towers’ specs)', () => {
    const cfg = onChallenge([{ kind: 'towerFaction', faction: 'skitterkin' }]);
    const out = challengeConfig({ ...cfg, specsUnlocked: ['fx_gun'] });
    expect(out.loadout).toEqual([]);
    expect(out.specsUnlocked).toEqual([]);
    // A config that breaks the rule by hand is refused.
    const bad = {
      ...fixtureConfig(),
      rules: [{ kind: 'towerFaction', faction: 'skitterkin', source: 's' }] as const,
    };
    expect(ruleConfigErrors(bad)).toEqual([
      "rules: towerFaction allows skitterkin towers only (got 'fx_gun', everglow)",
      "rules: towerFaction allows skitterkin towers only (got 'fx_mortar', everglow)",
    ]);
  });

  it('createSim applies them: the run’s config is the fitted one', () => {
    const sim = createSim(onChallenge([{ kind: 'noAbilities' }, { kind: 'glassCore' }]));
    expect(sim.config.abilities.slot1).toBeNull();
    expect(radioSilent(sim.config)).toBe(true); // the HUD greys every slot (app/revoked.ts)
    expect(sim.state.maxIntegrity).toBe(CHALLENGE_GLASS_CORE_INTEGRITY);
    // Glass Core holds on Story (the lowest `set` wins over Story's 30).
    const story = createSim({ ...onChallenge([{ kind: 'glassCore' }]), difficulty: 'story' });
    const storySet = { kind: 'economy', stat: 'coreIntegrity', set: 30, source: 'difficulty' };
    const withStory = createSim({
      ...onChallenge([{ kind: 'glassCore' }]),
      modifiers: [storySet as SimConfig<IdSpace>['modifiers'][number]],
    });
    expect(story.state.maxIntegrity).toBe(CHALLENGE_GLASS_CORE_INTEGRITY);
    expect(withStory.state.maxIntegrity).toBe(CHALLENGE_GLASS_CORE_INTEGRITY);
  });

  it('allCloaked spawns every hostile unit cloaked, deterministically', () => {
    const cfg = onChallenge([{ kind: 'allCloaked' }]);
    const sim = createSim(cfg);
    sim.enqueue({ type: 'callWave' });
    for (let i = 0; i < 600; i++) sim.step();
    const live = sim.state.enemies.items.filter((e) => e.alive && e.def !== null);
    expect(live.length).toBeGreaterThan(0);
    for (const e of live) expect(e.def!.cloaked).toBe(true);
    expect(hashAfter(cfg, 900)).toBe(hashAfter(cfg, 900));
    // Without the rule the fixture's units walk uncloaked.
    const plain = createSim(fixtureConfig());
    plain.enqueue({ type: 'callWave' });
    for (let i = 0; i < 600; i++) plain.step();
    expect(plain.state.enemies.items.some((e) => e.alive && e.def?.cloaked === false)).toBe(true);
  });
});
