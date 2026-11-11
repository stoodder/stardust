// A split boss's merge (design/enemies.md § 6, the Gathering Maw's phase 3; D146; T708), run from
// boss.ts for every split-born unit (bossSplit.ts made them). Its numbers are the split phase's:
// `mergeAfterTicks` and `mergeHastePct`.
// - **The parts' clock:** a split's parts (one `ownerUid`) share `mergeTicks`, counted down once a
//   tick for the group, from the tick after they were born, so the merge lands exactly
//   `mergeAfterSec` after the split. The group runs when its lowest-slot live part is visited
//   (every part's state is the group's, so slot order never decides).
// - **The merge tell, walking together** (its last MERGE_TELL_SEC, the boss tell's 1.5 s): the
//   lead part (the furthest along the route; ties to the lower uid) holds still and the others
//   walk up to it under the merge's haste, so the pieces visibly come back together. The merge
//   is the fight's phase change, not an ability: Unnerved and Stasis don't cancel it.
// - **The merge:** when the clock runs out, the survivors become one: the boss they split from
//   (`splitFrom`, a fresh unit with a new uid) where the lead stood, in its wave, with their HP
//   summed, the next phase's number (3), and the phase's 1.5 s of invulnerability; the parts are
//   gone (not killed: booked to their wave only). BossPhase then BossMerged name it, so a map's
//   `bossPhase: 3` trigger cues it the tick after.
// - **The early merge:** "or as the last but one dies": once a single part is left, it merges at
//   once (no tell: it is alone), with its own HP.
// - **Beaten before the merge:** with every part dead, nothing is left to merge: the fight is won
//   when the wave resolves.
// - **The merged boss** keeps the split's `ownerUid` and `splitMaxHp` (the one bar goes on), is
//   hasted `mergeHastePct` (under HASTE_CAP) from the tick it forms, its invulnerability included,
//   gathers no more (its phase has no gather), and dies at 0 HP like a part.
import { BOSS_ABILITY_TELL_SEC, HASTE_CAP } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import { BOSS_PHASE_INVULNERABLE_TICKS } from './bossPhases.ts';
import { removeGone, spawnSplitBorn, splitOf } from './bossSplit.ts';

/** The merge's tell, the walk together: the boss tell's length (BOSS_MIN_TELL_SEC). */
export const MERGE_TELL_TICKS = secToTicks(BOSS_ABILITY_TELL_SEC);

/** Whether `e` is a split boss's part (not yet merged). */
export function isSplitPart(e: Pick<Enemy, 'alive' | 'splitFrom'>): boolean {
  return e.alive && e.splitFrom !== null;
}

/** Whether `e` is a merged boss (the Gathering Maw re-formed, phase 3; render's `panic`). */
export function isMergedBoss(e: Pick<Enemy, 'alive' | 'splitFrom' | 'splitMaxHp'>): boolean {
  return e.alive && e.splitFrom === null && e.splitMaxHp > 0;
}

/** Whether `e` is a part walking together in its merge's tell this tick (render's `tell`). */
export function mergeTelling(
  e: Pick<Enemy, 'alive' | 'splitFrom' | 'mergeTicks' | 'leaving'>,
): boolean {
  return (
    e.alive &&
    !e.leaving &&
    e.splitFrom !== null &&
    e.mergeTicks > 0 &&
    e.mergeTicks <= MERGE_TELL_TICKS
  );
}

/** A haste fraction under HASTE_CAP, as a pace factor. */
function hasteMul(pct: number): number {
  return 1 + (pct < HASTE_CAP ? pct : HASTE_CAP);
}

/** The group's live parts, in ascending slot order (module scratch: refilled per call). */
const group: Enemy[] = [];

function fillGroup(state: SimState, ownerUid: number): void {
  group.length = 0;
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && !e.leaving && e.splitFrom !== null && e.ownerUid === ownerUid) group.push(e);
  }
}

/** One tick of a split-born unit (see the header): a part's group, or the merged boss. */
export function splitBornStep(state: SimState, e: Enemy): void {
  if (e.splitFrom === null) {
    mergedStep(state, e);
    return;
  }
  fillGroup(state, e.ownerUid);
  if (group[0] !== e) return; // the group ran with its lowest-slot part (or runs when it's met)
  if (e.spawnTick === state.tick) return; // born this tick: the clock starts on the next
  if (group.length === 1) {
    merge(state, e); // the last but one died
    return;
  }
  const left = e.mergeTicks - 1;
  for (let i = 0; i < group.length; i++) group[i]!.mergeTicks = left; // i < length
  if (left <= 0) {
    merge(state, e);
    return;
  }
  if (left > MERGE_TELL_TICKS) return;
  // The walk together: the lead holds, the others close on it hasted.
  let lead = e; // group[0]
  for (let i = 1; i < group.length; i++) {
    const p = group[i]!; // i < length
    if (p.dist > lead.dist || (p.dist === lead.dist && p.uid < lead.uid)) lead = p;
  }
  const haste = hasteMul(splitOf(e.splitFrom)?.mergeHastePct ?? 0);
  for (let i = 0; i < group.length; i++) {
    const p = group[i]!; // i < length
    p.paceMul = p === lead ? 0 : p.paceMul * haste;
  }
}

/** The merged boss: its haste, and its invulnerability running out (not on the tick it forms). */
function mergedStep(state: SimState, e: Enemy): void {
  if (e.spawnTick === state.tick) return; // merge() set this tick's pace
  e.paceMul *= hasteMul(splitOf(e.def!)?.mergeHastePct ?? 0); // a merged boss has a def
  if (e.invulnerableTicks > 0) e.invulnerableTicks--;
}

/** The group (filled, `first` its lowest slot) becomes its boss again, where its lead stood. */
function merge(state: SimState, first: Enemy): void {
  let lead = first;
  let hp = 0;
  for (let i = 0; i < group.length; i++) {
    const p = group[i]!; // i < length
    if (p.dist > lead.dist || (p.dist === lead.dist && p.uid < lead.uid)) lead = p;
    hp += p.hp;
  }
  const root = lead.splitFrom!; // a part
  const m = spawnSplitBorn(state, root, lead, lead.dist, lead.ownerUid, lead.splitMaxHp);
  m.hp = hp;
  m.bossPhase = lead.bossPhase + 1;
  m.invulnerableTicks = BOSS_PHASE_INVULNERABLE_TICKS;
  m.paceMul = hasteMul(splitOf(root)?.mergeHastePct ?? 0);
  for (let i = 0; i < group.length; i++) removeGone(state, group[i]!); // i < length
  group.length = 0;
  emit(state, { type: 'BossPhase', uid: m.uid, enemy: root.id, phase: m.bossPhase });
  emit(state, { type: 'BossMerged', uid: m.uid });
}
