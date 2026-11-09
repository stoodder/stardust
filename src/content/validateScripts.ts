// Map-script validation (story-runtime.md § Map scripts; the rule list is validateMap.ts's
// header): [script], [clickable], and [flag-variants].
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
  const clickables = new Set(Object.keys(def.clickables ?? {}));
  const objectives = new Set((def.objectives ?? []).map((o) => o.id));
  for (const [m, c] of Object.entries(def.clickables ?? {})) {
    const w = `${mapWhere}.clickables.${m}`;
    if (!markers.has(m)) issues.add('clickable', w, `unknown marker '${m}'`);
    if (c.name.trim() === '') issues.add('clickable', `${w}.name`, 'needs a name to read aloud');
  }
  /** A clickable marker: a marker the map declares in `clickables`. */
  const clickable = (m: string, w: string): void => {
    if (!markers.has(m)) issues.add('script', w, `unknown marker '${m}'`);
    else if (!clickables.has(m)) issues.add('clickable', w, `marker '${m}' is not in clickables`);
  };
  /** A marker on a wreckage tile ('x'), for `wreckageCleared`. */
  const wreck = (m: string, w: string): void => {
    const pos = def.markers?.[m];
    if (pos === undefined) issues.add('script', w, `unknown marker '${m}'`);
    else if (def.tiles[pos[1]]?.charAt(pos[0]) !== 'x') {
      issues.add('script', w, `marker '${m}' is not on a wreckage tile ('x')`);
    }
  };
  const conditions: [ConditionDef<IdSpace>, string][] = [];
  if (def.medals !== undefined) {
    conditions.push([def.medals.challenge.condition, `${mapWhere}.medals.challenge.condition`]);
  }
  for (const [i, o] of (def.objectives ?? []).entries()) {
    conditions.push([o.condition, `${mapWhere}.objectives[${i}].condition`]);
  }
  for (const [i, e] of (def.events ?? []).entries()) {
    if (e.when !== undefined) conditions.push([e.when, `${mapWhere}.events[${i}].when`]);
  }
  for (const [c, w] of conditions) {
    for (const atom of atomsOf(c)) {
      if ('wreckageCleared' in atom) wreck(atom.wreckageCleared, w);
      if ('objectiveDone' in atom && !objectives.has(atom.objectiveDone)) {
        issues.add('script', w, `unknown objective '${atom.objectiveDone}'`);
      }
    }
  }
  for (const [i, o] of (def.objectives ?? []).entries()) {
    if (atomsOf(o.condition).some((a) => 'objectiveDone' in a && a.objectiveDone === o.id)) {
      issues.add('script', `${mapWhere}.objectives[${i}].condition`, 'an objective reads itself');
    }
  }
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
      clickable(a.setClickable.marker, w);
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
    if ('interacted' in t) clickable(t.interacted, w);
    if ('wreckageCleared' in t) wreck(t.wreckageCleared, w);
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

/** A condition's atoms (every leaf under `all`, `any`, and `not`). */
function atomsOf(c: ConditionDef<IdSpace>): ConditionDef<IdSpace>[] {
  if ('all' in c) return c.all.flatMap(atomsOf);
  if ('any' in c) return c.any.flatMap(atomsOf);
  if ('not' in c) return atomsOf(c.not);
  return [c];
}

/** Every story flag a condition reads. */
function flagsOf(c: ConditionDef<IdSpace>): ScriptFlagId[] {
  if ('flag' in c) return [c.flag];
  if ('all' in c) return c.all.flatMap(flagsOf);
  if ('any' in c) return c.any.flatMap(flagsOf);
  if ('not' in c) return flagsOf(c.not);
  return [];
}
