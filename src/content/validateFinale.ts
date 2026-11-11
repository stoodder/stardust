// The finale's validation (T800a seams; design/maps.md § 5.5; the rule list is validateMap.ts's
// header, and the boss phase kinds are validate.ts's [enemy-ability]):
// - [choir]: a `choir` map has a `choir` (and only it does), and exactly one of `minVoices` (a
//   whole number ≥ 1) or `minVoicesPct` (in (0, 1]); its meter reads `voices`. The choir walks a
//   ground path of the map and stops at a marker within 1 tile of it; its base singers are a whole
//   number ≥ 1, its pace and halt distance > 0; each flag group adds a whole, non-zero number of
//   singers, and the smallest choir any flags allow still has one; Thrum's radius bonus is ≥ 0;
//   the Returned are a whole number ≥ 1 with an aura > 0. Every gate is a script flag and one of
//   its values ([flag-gate]) with a `flagVariants` entry ([flag-variants]: it changes the sim).
// - [song]: a song needs a choir (its circle is round the leader); radius > 0, `silentPct` in
//   [0, 1], `restTarget` > 0, a trickle `restPerSec` > 0 (Phase 2 can't stall), `restPerBossHp`
//   ≥ 0; each multiplier names a script flag value once, × > 0, with a `flagVariants` entry; the
//   scatter re-forms after > 0 s at a share of HP in (0, 1].
// - [timers]: timer ids are snake_case, each fills in > 0 s, its boss bonus is ≥ 0, and some
//   `startTimer` starts it; `startTimer`, `setTimerRate` (a share in [0, 1]), and the
//   `{ timerFull }` trigger name a timer of the map.
// - [script] (the finale's parts): `choirAt` names a marker on a map with a choir;
//   `restProgressPct` is a share in (0, 1] and `restAll` and `spawnEcho` need a song; the
//   `{ phase }` trigger and the `phaseAtLeast` atom name a whole phase ≥ 1 that the map reaches
//   (phase 1 from the start, a later one by some `setPhase`), with `afterSec` ≥ 0; `setPhase`
//   names a whole phase ≥ 2; a `checkpoint` label and an echo id are snake_case; `setLighting`
//   names a key; `restoreTowerClass` needs a `revokeTowerClass` on the map.
import { checkFlagGate } from './validateM7.ts';
import type {
  BossPhaseDef,
  ConditionDef,
  EnemyDef,
  FlagGateDef,
  IdSpace,
  MapDef,
  ScriptAction,
  ScriptFlagId,
  ScriptTrigger,
} from './types.ts';
import { Issues, duplicates, isNonNegative, isPositive, isPositiveInt } from './validateHelpers.ts';

const SNAKE = /^[a-z][a-z0-9_]*$/;

export function validateFinaleMap(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const flagsRead: [ScriptFlagId, string][] = [];
  validateChoir(issues, def, flagsRead, where);
  validateSong(issues, def, flagsRead, where);
  validateFinaleScripts(issues, def, where);
  const variants = def.flagVariants ?? {};
  for (const [f, w] of flagsRead) {
    if (variants[f] === undefined) {
      issues.add('flag-variants', w, `reads flag '${f}', so flagVariants needs a '${f}' entry`);
    }
  }
}

/** [choir] (see the header). */
function validateChoir(
  issues: Issues,
  def: MapDef<IdSpace>,
  flagsRead: [ScriptFlagId, string][],
  where: string,
): void {
  const c = def.choir;
  const w = `${where}.choir`;
  const isChoir = def.objective === 'choir';
  if (isChoir && c === undefined) issues.add('choir', w, "a 'choir' map needs a choir");
  if (!isChoir && c !== undefined) issues.add('choir', w, "only a 'choir' map has a choir");
  const floors = (def.minVoices !== undefined ? 1 : 0) + (def.minVoicesPct !== undefined ? 1 : 0);
  if (isChoir ? floors !== 1 : floors > 0) {
    issues.add(
      'choir',
      `${where}.minVoices`,
      isChoir ? 'a choir map gives one of minVoices or minVoicesPct' : "only a 'choir' map has one",
    );
  }
  if (def.minVoices !== undefined && !isPositiveInt(def.minVoices)) {
    issues.add('choir', `${where}.minVoices`, 'must be a whole number ≥ 1');
  }
  const pct = def.minVoicesPct;
  if (pct !== undefined && !(pct > 0 && pct <= 1)) {
    issues.add('choir', `${where}.minVoicesPct`, `${pct} must be in (0, 1]`);
  }
  if (isChoir && def.meterLabel !== undefined && def.meterLabel !== 'voices') {
    issues.add('choir', `${where}.meterLabel`, "a choir's meter reads 'voices'");
  }
  if (c === undefined) return;
  const path = def.paths.find((p) => p.id === c.route);
  if (path === undefined) {
    issues.add('choir', `${w}.route`, `'${c.route}' is not a ground path of the map`);
  }
  const stop = def.markers?.[c.stopAt];
  if (stop === undefined) {
    issues.add('choir', `${w}.stopAt`, `unknown marker '${c.stopAt}'`);
  } else if (
    path !== undefined &&
    !path.tiles.some(([pc, pr]) => Math.abs(pc - stop[0]) <= 1 && Math.abs(pr - stop[1]) <= 1)
  ) {
    issues.add('choir', `${w}.stopAt`, `marker '${c.stopAt}' is more than 1 tile from its road`);
  }
  if (!isPositiveInt(c.singers)) issues.add('choir', `${w}.singers`, 'must be a whole number ≥ 1');
  if (!isPositive(c.pace)) issues.add('choir', `${w}.pace`, 'must be > 0');
  if (!isPositive(c.haltTiles)) issues.add('choir', `${w}.haltTiles`, 'must be > 0');
  const gate = (g: FlagGateDef, at: string): void => {
    checkFlagGate(issues, g, at);
    flagsRead.push([g.flag, at]);
  };
  let fewest = c.singers;
  for (const [i, g] of (c.groups ?? []).entries()) {
    const at = `${w}.groups[${i}]`;
    gate(g.when, `${at}.when`);
    if (!Number.isInteger(g.singers) || g.singers === 0) {
      issues.add('choir', `${at}.singers`, 'must be a whole number, not 0');
    } else if (g.singers < 0) fewest += g.singers;
  }
  if (isPositiveInt(c.singers) && fewest < 1) {
    issues.add('choir', `${w}.groups`, `the smallest choir the flags allow has ${fewest} singers`);
  }
  if (c.thrum !== undefined) {
    gate(c.thrum.when, `${w}.thrum.when`);
    if (!isNonNegative(c.thrum.radiusBonus)) {
      issues.add('choir', `${w}.thrum.radiusBonus`, 'must be ≥ 0');
    }
  }
  const r = c.returned;
  if (r !== undefined) {
    gate(r.when, `${w}.returned.when`);
    if (!isPositiveInt(r.count))
      issues.add('choir', `${w}.returned.count`, 'must be a whole number ≥ 1');
    if (!isPositive(r.auraRadius)) issues.add('choir', `${w}.returned.auraRadius`, 'must be > 0');
  }
}

/** [song] (see the header). */
function validateSong(
  issues: Issues,
  def: MapDef<IdSpace>,
  flagsRead: [ScriptFlagId, string][],
  where: string,
): void {
  const s = def.song;
  if (s === undefined) return;
  const w = `${where}.song`;
  if (def.choir === undefined)
    issues.add('song', w, "a song needs a choir (it's round the leader)");
  if (!isPositive(s.baseRadius)) issues.add('song', `${w}.baseRadius`, 'must be > 0');
  if (s.silentPct !== undefined && !(s.silentPct >= 0 && s.silentPct <= 1)) {
    issues.add('song', `${w}.silentPct`, `${s.silentPct} must be in [0, 1]`);
  }
  if (!isPositive(s.restTarget)) issues.add('song', `${w}.restTarget`, 'must be > 0');
  if (!isPositive(s.restPerSec)) {
    issues.add('song', `${w}.restPerSec`, 'must be > 0 (the trickle: Phase 2 never stalls)');
  }
  if (s.restPerBossHp !== undefined && !isNonNegative(s.restPerBossHp)) {
    issues.add('song', `${w}.restPerBossHp`, 'must be ≥ 0');
  }
  for (const [i, m] of s.multipliers.entries()) {
    const at = `${w}.multipliers[${i}]`;
    checkFlagGate(issues, { flag: m.flag, eq: m.value }, at);
    flagsRead.push([m.flag, at]);
    if (!isPositive(m.mul)) issues.add('song', `${at}.mul`, 'must be > 0');
  }
  for (const k of duplicates(s.multipliers.map((m) => `${m.flag}=${String(m.value)}`))) {
    issues.add('song', `${w}.multipliers`, `'${k}' is listed twice`);
  }
  if (!isPositive(s.scatter.reformSec)) {
    issues.add('song', `${w}.scatter.reformSec`, 'must be > 0');
  }
  const hp = s.scatter.hpPct;
  if (!(hp > 0 && hp <= 1)) issues.add('song', `${w}.scatter.hpPct`, `${hp} must be in (0, 1]`);
}

/** [timers] and the finale's [script] parts (see the header). */
function validateFinaleScripts(issues: Issues, def: MapDef<IdSpace>, where: string): void {
  const timers = new Set(Object.keys(def.timers ?? {}));
  for (const [id, t] of Object.entries(def.timers ?? {})) {
    const w = `${where}.timers.${id}`;
    if (!SNAKE.test(id)) issues.add('timers', w, `timer id '${id}' must be snake_case`);
    if (!isPositive(t.fillSec)) issues.add('timers', `${w}.fillSec`, 'must be > 0');
    if (t.bossHpPerTenth !== undefined && !isNonNegative(t.bossHpPerTenth)) {
      issues.add('timers', `${w}.bossHpPerTenth`, 'must be ≥ 0');
    }
  }
  const actions: [ScriptAction<IdSpace>, string][] = [];
  const triggers: [ScriptTrigger<IdSpace>, string][] = [];
  const conditions: [ConditionDef<IdSpace>, string][] = [];
  for (const [i, e] of (def.events ?? []).entries()) {
    const w = `${where}.events[${i}]`;
    triggers.push([e.on, `${w}.on`]);
    for (const [j, a] of e.actions.entries()) actions.push([a, `${w}.actions[${j}]`]);
    if (e.when !== undefined) conditions.push([e.when, `${w}.when`]);
  }
  for (const [i, o] of (def.objectives ?? []).entries()) {
    const w = `${where}.objectives[${i}]`;
    for (const [j, a] of (o.onComplete ?? []).entries()) actions.push([a, `${w}.onComplete[${j}]`]);
    conditions.push([o.condition, `${w}.condition`]);
  }
  if (def.medals !== undefined) {
    conditions.push([def.medals.challenge.condition, `${where}.medals.challenge.condition`]);
  }
  for (const [i, l] of (def.lockedAbilities ?? []).entries()) {
    conditions.push([l.when, `${where}.lockedAbilities[${i}].when`]);
  }
  const started = new Set<string>();
  const phasesSet = new Set<number>([1]);
  const timer = (id: string, w: string): void => {
    if (!timers.has(id)) issues.add('timers', w, `names no timer '${id}' of the map`);
  };
  const needsSong = (w: string, what: string): void => {
    if (def.song === undefined) issues.add('script', w, `${what} needs a song (MapDef.song)`);
  };
  const revokes = actions.some(([a]) => 'revokeTowerClass' in a);
  for (const [a, w] of actions) {
    if ('startTimer' in a) {
      started.add(a.startTimer);
      timer(a.startTimer, w);
    }
    if ('setTimerRate' in a) {
      timer(a.setTimerRate.timer, w);
      const pct = a.setTimerRate.pct;
      if (!(pct >= 0 && pct <= 1)) issues.add('timers', `${w}.pct`, `${pct} must be in [0, 1]`);
    }
    if ('setPhase' in a) {
      if (!Number.isInteger(a.setPhase) || a.setPhase < 2) {
        issues.add('script', w, `setPhase ${a.setPhase} must be a whole phase ≥ 2`);
      } else phasesSet.add(a.setPhase);
    }
    if ('checkpoint' in a && !SNAKE.test(a.checkpoint)) {
      issues.add('script', w, `checkpoint label '${a.checkpoint}' must be snake_case`);
    }
    if ('setLighting' in a && a.setLighting.trim() === '') {
      issues.add('script', w, 'setLighting names a key');
    }
    if ('spawnEcho' in a) {
      needsSong(w, 'spawnEcho');
      if (!SNAKE.test(a.spawnEcho)) {
        issues.add('script', w, `echo id '${a.spawnEcho}' must be snake_case`);
      }
    }
    if ('restAll' in a) needsSong(w, 'restAll');
    if ('restoreTowerClass' in a && !revokes) {
      issues.add('script', w, 'restoreTowerClass needs a revokeTowerClass on the map');
    }
  }
  for (const id of timers) {
    if (!started.has(id)) issues.add('timers', `${where}.timers.${id}`, 'no startTimer starts it');
  }
  const phase = (n: number, w: string): void => {
    if (!Number.isInteger(n) || n < 1) issues.add('script', w, `phase ${n} must be a whole ≥ 1`);
    else if (!phasesSet.has(n)) issues.add('script', w, `no setPhase action reaches phase ${n}`);
  };
  for (const [t, w] of triggers) {
    if ('choirAt' in t) {
      if (def.choir === undefined) issues.add('script', w, 'choirAt needs a choir (MapDef.choir)');
      if (def.markers?.[t.choirAt] === undefined) {
        issues.add('script', w, `unknown marker '${t.choirAt}'`);
      }
    }
    if ('timerFull' in t) timer(t.timerFull, w);
    if ('restProgressPct' in t) {
      needsSong(w, 'restProgressPct');
      const p = t.restProgressPct;
      if (!(p > 0 && p <= 1)) issues.add('script', w, `restProgressPct ${p} must be in (0, 1]`);
    }
    if ('phase' in t && !('wave' in t)) {
      phase(t.phase, w);
      if (t.afterSec !== undefined && !isNonNegative(t.afterSec)) {
        issues.add('script', `${w}.afterSec`, 'must be ≥ 0');
      }
    }
  }
  for (const [c, w] of conditions) {
    for (const atom of atomsOf(c)) if ('phaseAtLeast' in atom) phase(atom.phaseAtLeast, w);
  }
}

/** A condition's atoms (every leaf under `all`, `any`, and `not`). */
function atomsOf(c: ConditionDef<IdSpace>): ConditionDef<IdSpace>[] {
  if ('all' in c) return c.all.flatMap(atomsOf);
  if ('any' in c) return c.any.flatMap(atomsOf);
  if ('not' in c) return atomsOf(c.not);
  return [c];
}

/**
 * [enemy-ability], the finale's boss phase kinds (T800a; the Unsung, T808): a floor is a share of
 * HP above 0 and below its phase's start, and only on a `layToRest` boss, whose last phase has one
 * (the song ends it, never its HP) and which is Hollow; `burrowTo` goes with a `burrow` in its
 * phase; adds name an enemy (never itself), a whole count ≥ 1, and a period > 0.
 */
export function validateFinalePhases(
  bad: (field: string, msg: string) => void,
  child: (field: string, id: string, count: number) => void,
  def: EnemyDef,
): void {
  const boss = def.boss;
  if (boss === undefined) return;
  const phases: readonly BossPhaseDef[] = boss.phases;
  const layToRest = boss.ending === 'layToRest';
  for (const [i, p] of phases.entries()) {
    const w = `boss.phases[${i}]`;
    if (p.floorPct !== undefined) {
      const from = p.fromPct === 'shieldBroken' ? 1 : p.fromPct;
      if (!(p.floorPct > 0 && p.floorPct < from)) {
        bad(`${w}.floorPct`, "must be above 0 and below its phase's start");
      }
      if (!layToRest) bad(`${w}.floorPct`, "only a 'layToRest' boss has an HP floor");
    }
    if (p.burrowTo !== undefined && p.burrow === undefined) {
      bad(`${w}.burrowTo`, 'goes with a `burrow` in the same phase');
    }
    if (p.adds !== undefined) {
      child(`${w}.adds`, p.adds.enemy, p.adds.count ?? 1);
      if (!isPositive(p.adds.everySec)) bad(`${w}.adds.everySec`, 'must be > 0');
    }
  }
  if (layToRest) {
    if (def.faction !== 'hollow') bad('boss.ending', 'only the Hollow is laid to rest');
    if (phases.at(-1)?.floorPct === undefined) {
      bad('boss.ending', "a 'layToRest' boss's last phase has a floorPct (the song ends it)");
    }
  }
}
