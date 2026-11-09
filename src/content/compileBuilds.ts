// Build compilation: the balance harness's scripted builds, with key-shaped steps turned into
// tagged ones and step times in ticks.
import type {
  BuildStepKind,
  CompiledBuild,
  CompiledBuildStep,
  CompiledBuilds,
} from './compiled.ts';
import { checkId, ticks, type Ctx, type Refs } from './compileHelpers.ts';
import type { BuildStep, CounterId, IdSpace, MapDef, ScriptedBuild } from './types.ts';

export function compileBuilds<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  def: MapDef<K, K['map']>,
  mapWhere: string,
): CompiledBuilds<K> {
  const profile = def.referenceProfile;
  const pw = `${mapWhere}.referenceProfile`;
  for (const t of profile.towers) checkId(ctx, refs.towers, t, `${pw}.towers`, 'tower');
  for (const t of profile.specs) checkId(ctx, refs.towers, t, `${pw}.specs`, 'tower');
  if (profile.technicianAbility !== null) {
    checkId(ctx, refs.abilities, profile.technicianAbility, `${pw}.technicianAbility`, 'ability');
  }
  const build = (b: ScriptedBuild<K>, w: string): CompiledBuild<K> =>
    compileBuild(ctx, refs, b, profile.technicianAbility, `${mapWhere}.${w}`);
  const noCounterBuilds: Partial<Record<CounterId, CompiledBuild<K>>> = {};
  for (const counter of def.requiredCounters) {
    const b = def.noCounterBuilds[counter];
    if (b !== undefined) noCounterBuilds[counter] = build(b, `noCounterBuilds.${counter}`);
  }
  for (const counter of Object.keys(def.noCounterBuilds)) {
    if (!def.requiredCounters.some((c) => c === counter)) {
      ctx.errors.push(
        `${mapWhere}.noCounterBuilds.${counter}: not one of the map's requiredCounters`,
      );
    }
  }
  return {
    referenceProfile: profile,
    parBuild: build(def.parBuild, 'parBuild'),
    noCounterBuilds,
    altBuilds: Object.fromEntries(
      Object.entries(def.altBuilds ?? {}).map(([name, b]) => [name, build(b, `altBuilds.${name}`)]),
    ),
    altExpectations: { ...def.altExpectations },
    guards: { ...def.guards },
    marginBand: def.marginBand ?? null,
    rebaseline: def.rebaseline ?? false,
    flagVariants: { ...def.flagVariants },
    runEndFlags: { ...def.runEndFlags },
    parMedals: def.parMedals ?? [],
    rndPickChanges: def.rndPickChanges ?? [],
    noCounterLoseByWave: def.noCounterLoseByWave ?? null,
  };
}

function compileBuild<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  b: ScriptedBuild<K>,
  profileAbility: K['ability'] | null,
  where: string,
): CompiledBuild<K> {
  for (const t of b.loadout) checkId(ctx, refs.towers, t, `${where}.loadout`, 'tower');
  if (b.technicianAbility !== undefined) {
    checkId(ctx, refs.abilities, b.technicianAbility, `${where}.technicianAbility`, 'ability');
  }
  const steps: CompiledBuildStep<K>[] = [];
  for (const [i, s] of b.steps.entries()) {
    const step = compileStep(ctx, refs, s, `${where}.steps[${i}]`);
    if (step !== null) steps.push(step);
  }
  return {
    loadout: b.loadout,
    companion: b.companion ?? null,
    technicianAbility: b.technicianAbility ?? profileAbility,
    callEarly: b.callEarly ?? false,
    steps,
  };
}

/** The action keys a build step may carry; a step has exactly one. */
export const STEP_KEYS = [
  'build',
  'upgrade',
  'specialize',
  'sell',
  'targeting',
  'holdFire',
  'spareRunners',
  'ability',
  'clear',
  'callWave',
  'interact',
  'scriptInput',
  'holdFireWhile',
] as const satisfies readonly BuildStepKind[];

/** Turns a key-shaped step (`{ wave, upgrade: [5, 1] }`) into a tagged one (`kind: 'upgrade'`). */
function compileStep<K extends IdSpace>(
  ctx: Ctx,
  refs: Refs<K>,
  s: BuildStep<K>,
  where: string,
): CompiledBuildStep<K> | null {
  const kinds = STEP_KEYS.filter((k) => k in s);
  if (kinds.length !== 1) {
    ctx.errors.push(
      `${where}: a step needs exactly one action key (found ${kinds.join(', ') || 'none'})`,
    );
    return null;
  }
  const wave = s.wave;
  if ('build' in s) {
    checkId(ctx, refs.towers, s.build, where, 'tower');
    return { wave, kind: 'build', tower: s.build, tile: s.tile };
  }
  if ('upgrade' in s) return { wave, kind: 'upgrade', tile: s.upgrade };
  if ('specialize' in s) return { wave, kind: 'specialize', tile: s.specialize, spec: s.spec };
  if ('sell' in s) return { wave, kind: 'sell', tile: s.sell };
  if ('targeting' in s) return { wave, kind: 'targeting', tile: s.targeting, mode: s.mode };
  if ('holdFire' in s) return { wave, kind: 'holdFire', target: s.holdFire, on: s.on };
  if ('spareRunners' in s) return { wave, kind: 'spareRunners', target: s.spareRunners, on: s.on };
  if ('ability' in s) {
    const when = s.when;
    return {
      wave,
      kind: 'ability',
      slot: s.ability,
      target: s.target ?? null,
      when:
        when === undefined
          ? 'asap'
          : when === 'waveStart'
            ? when
            : { afterTicks: ticks(ctx, when.afterSec, `${where}.when.afterSec`) },
    };
  }
  if ('clear' in s) return { wave, kind: 'clear', tile: s.clear };
  if ('callWave' in s) return { wave, kind: 'callWave' };
  if ('interact' in s) return { wave, kind: 'interact', marker: s.interact };
  if ('scriptInput' in s) return { wave, kind: 'scriptInput', id: s.scriptInput };
  return { wave, kind: 'holdFireWhile', tag: s.holdFireWhile };
}
