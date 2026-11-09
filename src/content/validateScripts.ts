// Map-script validation (story-runtime.md § Map scripts; the rule list is validateMap.ts's
// header): [script] and [flag-variants].
import type {
  ConditionDef,
  IdSpace,
  MapDef,
  ScriptAction,
  ScriptFlagId,
  ScriptTrigger,
} from './types.ts';
import { Issues, duplicates, isNonNegativeInt, isPositiveInt } from './validateHelpers.ts';

export function validateScripts(issues: Issues, def: MapDef<IdSpace>, mapWhere: string): void {
  const markers = new Set(Object.keys(def.markers ?? {}));
  const objectives = new Set((def.objectives ?? []).map((o) => o.id));
  const actions: [ScriptAction<IdSpace>, string][] = [];
  const triggers: [ScriptTrigger<IdSpace>, string][] = [];
  const flagsRead: [ScriptFlagId, string][] = [];
  for (const [i, e] of (def.events ?? []).entries()) {
    const w = `${mapWhere}.events[${i}]`;
    triggers.push([e.on, `${w}.on`]);
    for (const [j, a] of e.actions.entries()) actions.push([a, `${w}.actions[${j}]`]);
    if (e.when !== undefined) for (const f of flagsOf(e.when)) flagsRead.push([f, `${w}.when`]);
  }
  for (const id of duplicates((def.objectives ?? []).map((o) => o.id))) {
    issues.add('script', `${mapWhere}.objectives`, `duplicate objective id '${id}'`);
  }
  for (const [i, o] of (def.objectives ?? []).entries()) {
    const w = `${mapWhere}.objectives[${i}]`;
    if (!isNonNegativeInt(o.intel))
      issues.add('script', `${w}.intel`, 'must be a whole number ≥ 0');
    for (const [j, a] of (o.onComplete ?? []).entries()) actions.push([a, `${w}.onComplete[${j}]`]);
  }
  for (const [i, l] of (def.lockedAbilities ?? []).entries()) {
    for (const f of flagsOf(l.when)) flagsRead.push([f, `${mapWhere}.lockedAbilities[${i}].when`]);
  }
  const forcedInputs = new Set<string>();
  for (const [a] of actions) if ('forceInput' in a) forcedInputs.add(a.forceInput.id);

  const cueRe = new RegExp(`^${def.id}_[a-z0-9_]+$`);
  const radioRe = new RegExp(`^${def.id}_w(\\d+)$`);
  for (const [a, w] of actions) {
    const marker = (m: string): void => {
      if (!markers.has(m)) issues.add('script', w, `unknown marker '${m}'`);
    };
    if ('cue' in a) {
      const radio = radioRe.exec(a.cue);
      if (!cueRe.test(a.cue)) {
        issues.add('script', w, `cue '${a.cue}' must be '${def.id}_wNN' or '${def.id}_<slot>'`);
      } else if (
        radio !== null &&
        (radio[1]?.length !== 2 || Number(radio[1]) > def.waves.length)
      ) {
        issues.add(
          'script',
          w,
          `cue '${a.cue}': a radio cue names a wave of this map as two digits`,
        );
      }
    }
    if ('setClickable' in a) {
      marker(a.setClickable.marker);
      if (a.setClickable.fallback !== undefined) {
        triggers.push([a.setClickable.fallback, `${w}.setClickable.fallback`]);
      }
    }
    if ('openTile' in a) marker(a.openTile);
    if ('grantCredits' in a && !isPositiveInt(a.grantCredits)) {
      issues.add('script', `${w}.grantCredits`, 'must be a whole number of credits ≥ 1');
    }
  }
  for (const [t, w] of triggers) {
    if ('wave' in t && (!Number.isInteger(t.wave) || t.wave < 1 || t.wave > def.waves.length)) {
      issues.add('script', w, `wave ${t.wave} is not a wave of this map`);
    }
    if ('tick' in t && !isNonNegativeInt(t.tick))
      issues.add('script', w, 'tick must be a whole number ≥ 0');
    if ('bossHpPct' in t && !(t.bossHpPct > 0 && t.bossHpPct < 100)) {
      issues.add('script', w, 'bossHpPct must be in (0, 100)');
    }
    if ('objectiveCompleted' in t && !objectives.has(t.objectiveCompleted)) {
      issues.add('script', w, `unknown objective '${t.objectiveCompleted}'`);
    }
    if ('interacted' in t && !markers.has(t.interacted)) {
      issues.add('script', w, `unknown marker '${t.interacted}'`);
    }
    if ('forcedInputResolved' in t && !forcedInputs.has(t.forcedInputResolved)) {
      issues.add('script', w, `no forceInput action requests '${t.forcedInputResolved}'`);
    }
  }
  const variants = def.flagVariants ?? {};
  for (const [f, w] of flagsRead) {
    if (variants[f] === undefined) {
      issues.add('flag-variants', w, `reads flag '${f}', so flagVariants needs a '${f}' entry`);
    }
  }
}

/** Every story flag a condition reads. */
function flagsOf(c: ConditionDef<IdSpace>): ScriptFlagId[] {
  if ('flag' in c) return [c.flag];
  if ('all' in c) return c.all.flatMap(flagsOf);
  if ('any' in c) return c.any.flatMap(flagsOf);
  if ('not' in c) return flagsOf(c.not);
  return [];
}
