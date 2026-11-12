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
// - **No merge** (T808, the Unsung: a split with no `mergeAfterSec`): the parts keep no clock and
//   never merge, not even the last one alone. Once the last of them falls (killed, inside the song
//   or out: cleanup calls `riseAfterSplit` over the tick's dead), the boss rises again where it
//   fell: a fresh whole boss of its def (a new uid; not split-born, so its own phases, floor, and
//   ending run), at its next phase's share of its max HP, in that phase with its 1.5 s of
//   invulnerability (BossPhase, then BossRisen; a map's `bossPhase` trigger cues it), held until
//   that phase's time floor if it rises sooner (`notBeforeTicks`; D156). A part that
//   leaks or is laid to rest by `restAll` raises nothing.
import { BOSS_ABILITY_TELL_SEC, HASTE_CAP } from '../../content/rules.ts';
import { secToTicks } from '../../shared/time.ts';
import type { Enemy } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import {
  BOSS_PHASE_INVULNERABLE_TICKS,
  enterBossPhase,
  nextHpPhase,
  phaseWaitTicks,
} from './bossPhases.ts';
import { removeGone, spawnSplitBorn, splitOf } from './bossSplit.ts';
import { wasKilled } from './split.ts';

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

/**
 * Whether a live part of `e`'s group sits in a lower slot than `e` (that part runs the group). A
 * scan up to `e`'s slot only, so the parts that don't lead never gather the group.
 */
function leadIsBefore(state: SimState, e: Enemy): boolean {
  const pool = state.enemies;
  for (let i = 0; i < e.slot; i++) {
    const p = pool.items[i]!; // i < e.slot < used ≤ items.length
    if (p.alive && !p.leaving && p.splitFrom !== null && p.ownerUid === e.ownerUid) return true;
  }
  return false;
}

/** One tick of a split-born unit (see the header): a part's group, or the merged boss. */
export function splitBornStep(state: SimState, e: Enemy): void {
  if (e.splitFrom === null) {
    mergedStep(state, e);
    return;
  }
  if (e.leaving || leadIsBefore(state, e)) return; // only the group's lead gathers it
  if ((splitOf(e.splitFrom)?.mergeAfterTicks ?? 0) <= 0) return; // T808: no merge, no clock
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

/**
 * A split with no merge (T808; see the header): when `dead`, a part killed this tick, was the last
 * of its split (no part of it still stands, and none in a later slot fell this tick: that one
 * raises it), the boss rises again in its next phase where `dead` fell. Cleanup calls it for each
 * of the tick's dead parts.
 */
export function riseAfterSplit(state: SimState, dead: Enemy): void {
  const root = dead.splitFrom;
  if (root === null || root.boss === null || !wasKilled(dead)) return;
  if ((splitOf(root)?.mergeAfterTicks ?? 1) > 0) return; // a merge's split: bossMerge's clock
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const p = pool.items[i]!; // i < used ≤ items.length
    if (p === dead || p.uid === 0 || p.splitFrom === null || p.ownerUid !== dead.ownerUid) continue;
    if (p.alive ? !p.leaving : p.slot > dead.slot) return;
  }
  const next = nextHpPhase(root.boss, dead.bossPhase);
  if (next === 0) return; // validated: a split with no merge has a later phase
  const m = spawnSplitBorn(state, root, dead, dead.dist, 0, 0); // a whole boss: not split-born
  m.hp = root.boss.phases[next - 1]!.fromPct * root.hp; // next ≤ phases.length
  enterBossPhase(state, m, root.boss, next, true);
  // D156: risen before its phase's time floor, it stays in its rise's telegraph until then.
  const wait = phaseWaitTicks(state, root.boss.phases[next - 1]!);
  if (wait > m.invulnerableTicks) m.invulnerableTicks = wait;
  emit(state, { type: 'BossRisen', uid: m.uid });
}
