// The no-counter runs' own precondition (conventions.md § Balance sims, #5–#6): a no-counter build
// must carry no answer to its category, judged by the same model as the content validator
// (content/counterAnswers.ts: the tiers and specs its towers reach, and the abilities it casts).
// Compile already rejects such content; this keeps the harness honest when it runs content
// compiled under other answer tables (fixtures) and states the premise next to the result.
import type { CompiledBuild, CompiledContent, CompiledMapDef } from '../content/compiled.ts';
import {
  answerScope,
  answersCarried,
  towersReached,
  type ReachStep,
} from '../content/counterAnswers.ts';
import { COUNTER_ANSWERS, COUNTER_CATEGORIES, type CounterAnswers } from '../content/rules.ts';
import type { CounterId, IdSpace } from '../content/types.ts';
import type { CheckSpec } from './checks.ts';

const tileKey = (t: readonly [number, number]): string => `${t[0]},${t[1]}`;

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
    if (s.kind === 'build') steps.push({ op: 'build', tower: s.tower, tile: tileKey(s.tile) });
    else if (s.kind === 'upgrade') steps.push({ op: 'upgrade', tile: tileKey(s.tile) });
    else if (s.kind === 'specialize') {
      steps.push({ op: 'specialize', tile: tileKey(s.tile), spec: s.spec });
    } else if (s.kind === 'sell') steps.push({ op: 'sell', tile: tileKey(s.tile) });
  }
  const enemies = map.waves.flatMap((w) => w.groups.map((g) => g.enemy));
  return answersCarried(
    answers[counter],
    answerScope(counter, map.act, enemies),
    towersReached(b.loadout, steps),
    castBy(map, content, b),
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
