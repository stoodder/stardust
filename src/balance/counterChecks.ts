// The no-counter checks (conventions.md § Balance sims): #5 and #6 (T225: moved from checks.ts),
// and the runs' own precondition: a no-counter build
// must carry no answer to its category, judged by the same model as the content validator
// (content/counterAnswers.ts: the tiers and specs its towers reach, from placements that reach
// the category's routes, and the abilities it casts).
// Compile already rejects such content; this keeps the harness honest when it runs content
// compiled under other answer tables (fixtures) and states the premise next to the result.
import type { CompiledBuild, CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import {
  answerScope,
  answersCarried,
  rangeReached,
  towersReached,
  type RangedTower,
  type ReachStep,
} from '../content/counterAnswers.ts';
import { COUNTER_ANSWERS, COUNTER_CATEGORIES, type CounterAnswers } from '../content/rules.ts';
import type { CounterId, IdSpace, TileKey } from '../content/types.ts';
import { describeRun, perRun, type CheckSpec } from './checks.ts';
import { noCounterLoseByWave } from './rules.ts';

const tileKey = (t: readonly [number, number]): TileKey => `${t[0]},${t[1]}`;

/** The abilities a compiled build casts (slot 1, and slot 2's companion ability). */
function castBy<K extends IdSpace>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  b: CompiledBuild<K>,
): string[] {
  const out: string[] = [];
  const slots = new Set(b.steps.flatMap((s) => (s.kind === 'ability' ? [s.slot] : [])));
  if (slots.has(1) && b.technicianAbility !== null) out.push(b.technicianAbility);
  const c = map.companion;
  const companion =
    c === null
      ? null
      : 'pick' in c
        ? (b.companion ?? c.pick[0] ?? null)
        : c.state === 'present'
          ? c.id
          : null;
  if (slots.has(2) && companion !== null) {
    const abilities = Object.values<{ id: string; companion: string | null }>(content.abilities);
    const a = abilities.find((x) => x.companion === companion);
    if (a !== undefined) out.push(a.id);
  }
  return out;
}

/** The answers to `counter` a compiled build carries on `map` (empty when none). */
export function compiledAnswersCarried<K extends IdSpace>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  b: CompiledBuild<K>,
  counter: CounterId,
  answers: Readonly<Record<CounterId, CounterAnswers>> = COUNTER_ANSWERS,
): string[] {
  const steps: ReachStep[] = [];
  for (const s of b.steps) {
    if (s.kind === 'build') {
      const key = tileKey(s.tile);
      const raw = map.tiles[s.tile[1] * map.cols + s.tile[0]];
      const tile = raw === 'x' ? map.underWreckage[key] : raw;
      const at = { tile: s.tile, highGround: tile === '^' };
      steps.push({ op: 'build', tower: s.tower, tile: key, at });
    } else if (s.kind === 'upgrade') steps.push({ op: 'upgrade', tile: tileKey(s.tile) });
    else if (s.kind === 'specialize') {
      steps.push({ op: 'specialize', tile: tileKey(s.tile), spec: s.spec });
    } else if (s.kind === 'sell') steps.push({ op: 'sell', tile: tileKey(s.tile) });
  }
  const enemies = map.waves.flatMap((w) =>
    w.groups.map((g) => ({ ...g.enemy, route: g.route.tiles })),
  );
  const towers: Readonly<Record<string, RangedTower | undefined>> = content.towers;
  return answersCarried(
    answers[counter],
    answerScope(counter, map.act, enemies),
    towersReached(b.loadout, steps),
    castBy(map, content, b),
    (t) => {
      const def = towers[t.tower];
      return def === undefined ? null : rangeReached(def, t);
    },
  );
}

/** One check per no-counter build: it carries no answer to its category (#5's premise). */
export function noCounterAnswerChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  content: CompiledContent<K>,
  answers: Readonly<Record<CounterId, CounterAnswers>> = COUNTER_ANSWERS,
): CheckSpec[] {
  const out: CheckSpec[] = [];
  for (const counter of COUNTER_CATEGORIES) {
    const b = map.builds.noCounterBuilds[counter];
    if (b === undefined) continue;
    const label = `noCounter:${counter}`;
    out.push({
      id: '5',
      title: `${label} carries no ${counter} answer`,
      subject: label,
      needs: [],
      evaluate() {
        const hits = compiledAnswersCarried(map, content, b, counter, answers);
        return hits.length === 0
          ? { ok: true, summary: 'no answer reached', failures: [] }
          : { ok: false, summary: `reaches ${hits.join(', ')}`, failures: hits };
      },
    });
  }
  return out;
}

/**
 * #5 every no-counter build loses before the final third (or by the map's override), and #6 it
 * still loses with the full-catalog profile: meta can't replace a counter. `leftOut` lists the
 * catalog grants the sim doesn't simulate yet (#6 names them).
 */
export function noCounterChecks<K extends IdSpace>(
  map: CompiledMapDef<K>,
  few: readonly number[],
  leftOut: readonly string[],
): CheckSpec[] {
  const b = map.builds;
  const checks: CheckSpec[] = [];
  // A map may push the lose-by wave later (BuildsDef.noCounterLoseByWave, capped by the validator).
  // A Holdout's no-counter build loses by finishing below its floor, whenever it ends (T605).
  const holdout = map.objective === 'holdout';
  const loseBy = holdout
    ? map.waves.length
    : (b.noCounterLoseByWave ?? noCounterLoseByWave(map.waves.length));
  const loseByWhy = holdout
    ? 'below the Evacuated floor'
    : b.noCounterLoseByWave === null
      ? 'before the final third'
      : "by the map's override";
  for (const counter of Object.keys(b.noCounterBuilds)) {
    const label = `noCounter:${counter}`;
    // A counter the map exempts (BuildsDef.counterExemptions; A3M6's detection, D146 addendum) isn't
    // held to #5's loss or #6: the map's own tests pin its cost. #5's premise (no answer carried)
    // still holds (noCounterAnswerChecks).
    if (b.counterExemptions.some((x) => x.counter === counter)) continue;
    checks.push(
      perRun(
        '5',
        `${label} loses ${loseByWhy} (by W${loseBy})`,
        label,
        few,
        (rec) =>
          rec.result?.outcome === 'lost' && (rec.result.lostAtWave ?? Infinity) <= loseBy
            ? null
            : describeRun(rec),
        (recs) => recs.map(describeRun).join(', '),
      ),
    );
    // #6: meta can't replace a counter (design/progression.md § 10). Not for jam (D146 addendum,
    // T760): the jam limit (sim/jam.ts `jamRoom`) caps what jamming takes at 25% of the towers,
    // less than the whole catalog adds, so #5 holds no-jam to losing on the reference instead.
    if (counter === 'jam') continue;
    const note =
      leftOut.length === 0 ? '' : ` (left out, not simulated yet: ${leftOut.join(', ')})`;
    checks.push(
      perRun(
        '6',
        `${label} still loses with the full-catalog profile`,
        `${label}@fullCatalog`,
        few,
        (rec) => (rec.result?.outcome === 'lost' ? null : describeRun(rec)),
        (recs) => `${recs.map(describeRun).join(', ')}${note}`,
        [],
        label,
      ),
    );
  }
  return checks;
}
