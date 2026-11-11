// Gathering (design/enemies.md § 3 and § 5.4, the `consumer` tell; the Maw; T602). A pass over
// every unit at once, after the hush rule's and the huddles' (enemyAbilities/index.ts), so the
// tell's stop is this tick's pace.
// - **The cycle** ("every 4 s, after a 1 s tendril tell"): a gatherer's `gatherTicks` counts down
//   from `everyTicks` (set on its first tick alive: its first gather comes one period after it
//   spawns). At `tellTicks` it is ready: it starts its tell on the nearest eligible unit within
//   `radiusTiles`, or waits, ready, until one comes in reach. The tell runs `tellTicks`; then it
//   gathers and the period starts over. A gatherer with `maxAbsorbs` absorbs is full: it never
//   tells again.
// - **Who** (§ 5.4): a live non-boss, non-neutral **Hollow** unit (not another gatherer: a Maw
//   never takes a Maw), or, while it hasn't taken one, **one Skitterkin**: a hushable `fleeing`
//   enemy or an escort refugee (hush.ts `isHushable`, `isHushableAlly`; Pebble and a Skitterkin
//   tower's swarmlings are never hushable). Never an Everglow or Aelari unit, never a boss. The
//   same layer (a ground Maw never reaches a flyer) and in reach (not burrowed, Phased, leaving,
//   or standing down; layers.ts `outOfReach`), within the radius, measured as the hush rule's
//   contact is (along the route when both walk the same one, else a straight line). A unit
//   another gatherer holds is taken.
// - **Order independence** (the hush rule's matching): a unit goes to its nearest ready gatherer
//   and each ready gatherer takes its nearest such unit, ties to the lower uid, matched on this
//   tick's state before any tell starts; a gatherer left out waits a tick.
// - **The tell** (GatherTell): the tendrils hold both still (`paceMul` 0) for its `tellTicks`. A
//   tell on a Skitterkin is the Maw's one hush, so it holds the hush rule's pair (`hushUid` both
//   ways; hush.ts leaves a gatherer's pair alone): no Hollow unit hushes it meanwhile, and a
//   refugee stands still by its `hushUid` (systems/allies.ts).
// - **Losing the tell:** while the interrupt hook holds (systems/status.ts `isInterrupted`:
//   Stasis on a non-boss, Unnerved), a tell can't start or go on, and the cooldown restarts from
//   zero (§ 2.4; gathering isn't evasive, so a Truthlight Mark doesn't stop it). The same when its
//   unit dies, leaks, goes out of reach or out of the radius (a Gravity Well's pull) mid-tell, or
//   the gatherer itself goes out of reach: killing the held unit buys a whole period.
// - **The gather** (Gathered): the unit is removed (marked `leaving`, so cleanup books it to its
//   wave and nothing else: no kill, no leak, no bounty, no split, not Pests Processed), and its
//   current HP is added to the gatherer's HP and max HP (`bonusMaxHp`; a refugee has no HP in the
//   sim, so it adds none). `absorbs` + 1 (leak + `leakPerAbsorb` each: `gatherLeak`, movement.ts;
//   size + `growPct` each: render), `hollowAbsorbs` + 1 for a Hollow unit (bounty
//   + `bountyPerHollowAbsorb` each: `gatherBounty`, combat/damage.ts). A Skitterkin is its one
//   hush: `gatheredSkitterkin`, and it never turns Heavy (it doesn't hush). A gathered fleeing unit
//   sets the runners near it bolting (Skittish, as a hush does). A gathered refugee is lost, its
//   group's loss (escort.ts `loseRefugee` with its group; RefugeeLost `hushed`), and counts in
//   `stats.refugeesGathered` (Nothing Gathered).
// - **A boss's phase gather** (T708; `gatherOf`): the Gathering Maw gathers in its phase 1 by these
//   same rules at that phase's numbers (2 tiles, every 5 s, a 1.5 s tell: BOSS_MIN_TELL_SEC; its
//   one Skitterkin; no leak or bounty per absorb, a boss's leak drains everything anyway). When
//   the phase ends (the split's telegraph), a tell under way is let go and it gathers no more; it
//   keeps the size it grew to. A boss is never gathered (who, above).
// - **No balloon:** absorbs are capped at `maxAbsorbs` (5), and a unit gathered whole never splits,
//   so a Maw among Fractures and their Shards tops out at 400 + five units' HP (a test).
import type { CompiledGather } from '../../content/compiled.ts';
import type { Ally, Enemy } from '../entities.ts';
import { hushSinger } from '../choir.ts';
import { loseRefugee } from '../escort.ts';
import { poolKill, type Pool } from '../pool.ts';
import { emit, type SimState } from '../state.ts';
import { cooldownHeld, isInterrupted } from '../systems/status.ts';
import type { TickContext } from '../tick.ts';
import { isHushable, isHushableAlly } from './hush.ts';
import { outOfReach } from './layers.ts';
import { boltNear } from './skittish.ts';

/**
 * The gather a unit runs now (T708): its def's (the Maw), else its boss phase's (the Gathering
 * Maw's phase 1, at that phase's radius and period), else null. The phase's ends as the phase does.
 */
export function gatherOf(e: Pick<Enemy, 'def' | 'bossPhase'>): CompiledGather | null {
  const def = e.def;
  if (def === null) return null;
  if (def.gather !== null) return def.gather;
  const boss = def.boss;
  return boss === null || e.bossPhase === 0 ? null : (boss.phases[e.bossPhase - 1]?.gather ?? null);
}

/** The leak a gatherer's absorbs add (+`leakPerAbsorb` each; enemies.md § 5.4's roster row). */
export function gatherLeak(e: Pick<Enemy, 'def' | 'bossPhase' | 'absorbs'>): number {
  const g = gatherOf(e);
  return g === null ? 0 : g.leakPerAbsorb * e.absorbs;
}

/** The bounty a gatherer's Hollow absorbs add (+`bountyPerHollowAbsorb` each; a Skitterkin none). */
export function gatherBounty(e: Pick<Enemy, 'def' | 'bossPhase' | 'hollowAbsorbs'>): number {
  const g = gatherOf(e);
  return g === null ? 0 : g.bountyPerHollowAbsorb * e.hollowAbsorbs;
}

/** A gatherer's size now, as a scale on its body (1 + `growPct` per absorb; render reads it). */
export function gatherScale(e: Pick<Enemy, 'def' | 'bossPhase' | 'absorbs'>): number {
  // A boss keeps the size it grew to after its gathering phase ends (the Gathering Maw splits).
  const g = gatherOf(e) ?? bossGather(e.def);
  return g === null ? 1 : 1 + g.growPct * e.absorbs;
}

/** A gatherer's max HP: its def's plus what its absorbs added (render's health bar). */
export function gatherMaxHp(e: Pick<Enemy, 'def' | 'bonusMaxHp'>): number {
  return (e.def?.hp ?? 0) + e.bonusMaxHp;
}

/** Whether `e` is a gatherer showing its tendril tell this tick (render reads it). */
export function gatherTelling(
  e: Pick<Enemy, 'alive' | 'def' | 'bossPhase' | 'gatherUid'>,
): boolean {
  return e.alive && e.gatherUid !== 0 && gatherOf(e) !== null;
}

/**
 * Whether a def ever gathers (its own gather, or one of its boss phases': the Gathering Maw; T708).
 * Render keys a gatherer's growth sprites on it.
 */
export function canGather(def: Enemy['def']): boolean {
  return def !== null && (def.gather !== null || bossGather(def) !== null);
}

/** The first gather among a boss def's phases, or null (its size after the phase). */
function bossGather(def: Enemy['def']): CompiledGather | null {
  const phases = def?.boss?.phases ?? [];
  for (let i = 0; i < phases.length; i++) {
    const g = phases[i]!.gather; // i < length
    if (g !== null) return g;
  }
  return null;
}

/** The tell's length in ticks (at least 1, so a ready gatherer never reads as unset). */
function tellTicksOf(g: CompiledGather): number {
  return g.tellTicks > 0 ? g.tellTicks : 1;
}

/** The period in ticks (at least the tell and 1). */
function everyTicksOf(g: CompiledGather): number {
  const t = tellTicksOf(g);
  return g.everyTicks > t ? g.everyTicks : t + 1;
}

/** Whether `m` is a live gatherer on the field (not leaving or standing down, a def with gather). */
function isGatherer(m: Enemy): boolean {
  return m.alive && gatherOf(m) !== null && !m.leaving && m.standDownTicks === 0;
}

/** A gatherer free to start a tell: ready, not full, in reach, not interrupted. */
function isReady(m: Enemy): boolean {
  const g = gatherOf(m);
  return (
    g !== null &&
    isGatherer(m) &&
    m.gatherUid === 0 &&
    m.absorbs < g.maxAbsorbs &&
    m.gatherTicks > 0 &&
    m.gatherTicks <= tellTicksOf(g) &&
    !outOfReach(m) &&
    !isInterrupted(m)
  );
}

/** Squared distance from `m` to a unit at (x, y) on `route` at `dist` (the hush rule's measure). */
function distSq(m: Enemy, route: Enemy['route'], dist: number, x: number, y: number): number {
  if (m.route !== null && m.route === route) {
    const d = m.dist - dist;
    return d * d;
  }
  const dx = m.x - x;
  const dy = m.y - y;
  return dx * dx + dy * dy;
}

/** Whether gatherer `m` may take enemy `v` (§ 5.4's who; not the distance). `held`: another holds it. */
function mayTake(m: Enemy, v: Enemy, held: boolean): boolean {
  const def = v.def;
  const mdef = m.def!; // callers checked
  if (v === m || !v.alive || def === null || def.boss !== null || def.neutral) return false;
  if (def.gather !== null || def.layer !== mdef.layer || outOfReach(v) || v.standDownTicks > 0) {
    return false;
  }
  if (def.faction === 'hollow') return !held;
  return def.faction === 'skitterkin' && !m.gatheredSkitterkin && isHushable(v);
}

/** Whether gatherer `m` may take refugee `a` (its one Skitterkin; not the distance). */
function mayTakeAlly(m: Enemy, a: Ally): boolean {
  return !m.gatheredSkitterkin && m.def!.layer === 'ground' && isHushableAlly(a);
}

/** Whether a candidate at `d2` with `uid` beats the best so far (nearer, then the lower uid). */
function better(d2: number, uid: number, bestD2: number, bestUid: number): boolean {
  return bestD2 < 0 || d2 < bestD2 || (d2 === bestD2 && uid < bestUid);
}

const NO_UNIT = Number.MIN_SAFE_INTEGER;

/** Scratch for the matching (tick.ts `Scratch.gather`): cleared and refilled each pass. */
export interface GatherScratch {
  /** The ready gatherers' slots; the other lists are indexed alike. */
  readonly ready: number[];
  /** The uids held in a tell now (one per telling gatherer). */
  readonly held: number[];
  /** Per ready gatherer: the unit it takes (the code startTell reads), its squared distance and uid. */
  readonly code: number[];
  readonly d2: number[];
  readonly uid: number[];
}

/** Fresh matching scratch (tick.ts `createScratch`). */
export function createGatherScratch(): GatherScratch {
  return { ready: [], held: [], code: [], d2: [], uid: [] };
}

/** Offers the unit `code` (at `d2`, `uid`) to ready gatherer `r`: kept when it beats its best. */
function offer(s: GatherScratch, r: number, code: number, d2: number, uid: number): void {
  if (!better(d2, uid, s.d2[r]!, s.uid[r]!)) return; // r < ready.length = d2.length
  s.code[r] = code;
  s.d2[r] = d2;
  s.uid[r] = uid;
}

/**
 * The matching (the header's order independence), in O(G·N): every unit finds its nearest ready
 * gatherer that may take it, once, and offers itself there; each gatherer keeps the nearest unit
 * offered (ties to the lower uid). That is the pairwise rule exactly (a gatherer takes its nearest
 * unit among those whose nearest ready gatherer it is), with the held marks read once rather than
 * per pair. Pairwise (O(G²·N²)), 30 ready Maws among 300 units took ~130 ms a match; this takes
 * ~0.06 ms (8 among 150: ~0.01 ms; 4 cores, quiet, 2026-11-11). gather.test.ts holds the two equal
 * on 200 random dense fields. Fills `s.code` for each `s.ready` gatherer (NO_UNIT when none).
 */
function matchUnits(state: SimState, s: GatherScratch): void {
  const pool = state.enemies;
  const ready = s.ready;
  s.held.length = 0;
  for (let i = 0; i < pool.used; i++) {
    const m = pool.items[i]!; // i < used ≤ items.length
    if (m.alive && m.gatherUid !== 0) s.held.push(m.gatherUid);
  }
  s.code.length = 0;
  s.d2.length = 0;
  s.uid.length = 0;
  for (let r = 0; r < ready.length; r++) {
    s.code.push(NO_UNIT);
    s.d2.push(-1);
    s.uid.push(0);
  }
  for (let i = 0; i < pool.used; i++) {
    const v = pool.items[i]!; // i < used ≤ items.length
    if (!v.alive) continue;
    const held = s.held.includes(v.uid);
    let best = -1;
    let bestUid = 0;
    let bestD2 = -1;
    for (let r = 0; r < ready.length; r++) {
      const m = pool.items[ready[r]!]!; // r < length; a ready gatherer's slot
      const d2 = distSq(m, v.route, v.dist, v.x, v.y);
      if (d2 > gatherOf(m)!.radiusSq || !better(d2, m.uid, bestD2, bestUid)) continue;
      if (!mayTake(m, v, held)) continue;
      best = r;
      bestUid = m.uid;
      bestD2 = d2;
    }
    if (best >= 0) offer(s, best, v.slot, bestD2, v.uid);
  }
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (!a.alive) continue;
    let best = -1;
    let bestUid = 0;
    let bestD2 = -1;
    for (let r = 0; r < ready.length; r++) {
      const m = pool.items[ready[r]!]!; // r < length; a ready gatherer's slot
      const d2 = distSq(m, a.route, a.dist, a.x, a.y);
      if (d2 > gatherOf(m)!.radiusSq || !better(d2, m.uid, bestD2, bestUid)) continue;
      if (!mayTakeAlly(m, a)) continue;
      best = r;
      bestUid = m.uid;
      bestD2 = d2;
    }
    if (best >= 0) offer(s, best, -(a.slot + 1), bestD2, a.uid);
  }
}

function liveEnemy(pool: Pool<Enemy>, uid: number): Enemy | null {
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (e.alive && e.uid === uid) return e;
  }
  return null;
}

function liveAlly(pool: Pool<Ally>, uid: number): Ally | null {
  for (let i = 0; i < pool.used; i++) {
    const a = pool.items[i]!; // i < used ≤ items.length
    if (a.alive && a.uid === uid) return a;
  }
  return null;
}

/**
 * Lets go of the tell's unit (its hush pair too) and restarts the period from zero (`g` null: its
 * gathering phase ended, T708).
 */
function letGo(state: SimState, m: Enemy, g: CompiledGather | null): void {
  const uid = m.gatherUid;
  if (uid !== 0) {
    const v = liveEnemy(state.enemies, uid);
    if (v !== null && v.hushUid === m.uid) v.hushUid = 0;
    const a = v === null ? liveAlly(state.allies, uid) : null;
    if (a !== null && a.hushUid === m.uid) a.hushUid = 0;
  }
  m.gatherUid = 0;
  m.hushUid = 0;
  m.gatherTicks = g === null ? 0 : everyTicksOf(g);
}

/** One tick of a gatherer's tell under way: hold, lose it, or gather. */
function tellStep(state: SimState, m: Enemy, g: CompiledGather): void {
  const v = liveEnemy(state.enemies, m.gatherUid);
  const a = v === null ? liveAlly(state.allies, m.gatherUid) : null;
  let held = !outOfReach(m) && !isInterrupted(m);
  if (held && v !== null) {
    held = !outOfReach(v) && v.standDownTicks === 0;
    held &&= distSq(m, v.route, v.dist, v.x, v.y) <= g.radiusSq;
  } else if (held && a !== null) {
    held = a.hushUid === m.uid && distSq(m, a.route, a.dist, a.x, a.y) <= g.radiusSq;
  } else {
    held = false; // its unit died, leaked, or was evacuated
  }
  if (!held) {
    letGo(state, m, g);
    return;
  }
  if (--m.gatherTicks > 0) {
    m.paceMul = 0;
    if (v !== null) v.paceMul = 0; // a refugee holds still by its hushUid
    return;
  }
  if (v !== null) gatherEnemy(state, m, v);
  else gatherRefugee(state, m, a!); // held ⇒ one of them
  m.gatherUid = 0;
  m.hushUid = 0;
  m.gatherTicks = everyTicksOf(g);
}

/** Gathers enemy `v` into `m` (see the header). */
function gatherEnemy(state: SimState, m: Enemy, v: Enemy): void {
  const vdef = v.def!; // live enemies have a def
  const hp = v.hp > 0 ? v.hp : 0;
  const x = v.x;
  const y = v.y;
  const skitterkin = vdef.faction === 'skitterkin';
  // Gone, not killed or leaked: cleanup books it to its wave and nothing else (split.ts wasKilled).
  v.leaving = true;
  v.hushUid = 0;
  poolKill(state.enemies, v);
  absorb(m, hp, !skitterkin);
  emit(state, {
    type: 'Gathered',
    uid: m.uid,
    victimUid: v.uid,
    victim: vdef.id,
    hp,
    absorbs: m.absorbs,
  });
  if (skitterkin) boltNear(state, x, y);
}

/** Gathers refugee `a` into `m`: a loss, its group's, and Nothing Gathered's count. */
function gatherRefugee(state: SimState, m: Enemy, a: Ally): void {
  if (hushSinger(state, a)) return; // a choir singer is hushed, not gathered (sim/choir.ts; T804)
  poolKill(state.allies, a);
  a.hushUid = 0;
  absorb(m, 0, false);
  state.stats.refugeesGathered++;
  emit(state, {
    type: 'Gathered',
    uid: m.uid,
    victimUid: a.uid,
    victim: 'refugee',
    hp: 0,
    absorbs: m.absorbs,
  });
  loseRefugee(state, a.uid, 'hushed', m.uid, a.group);
  emit(state, { type: 'AllyRemoved', uid: a.uid });
}

function absorb(m: Enemy, hp: number, hollow: boolean): void {
  m.hp += hp;
  m.bonusMaxHp += hp;
  m.absorbs++;
  if (hollow) m.hollowAbsorbs++;
  else m.gatheredSkitterkin = true;
}

/** Starts `m`'s tell on the unit `code` encodes (matchUnits's: an enemy's slot, or −(an ally's slot + 1)), holding both still. */
function startTell(state: SimState, m: Enemy, code: number): void {
  const g = gatherOf(m)!; // isReady checked
  m.gatherTicks = tellTicksOf(g);
  m.paceMul = 0;
  if (code >= 0) {
    const v = state.enemies.items[code]!; // matchUnits's slot
    m.gatherUid = v.uid;
    v.paceMul = 0;
    if (v.def!.faction === 'skitterkin') {
      m.hushUid = v.uid; // its one hush: the hush rule's pair (hush.ts leaves it alone)
      v.hushUid = m.uid;
    }
    emit(state, { type: 'GatherTell', uid: m.uid, targetUid: v.uid, ally: false });
  } else {
    const a = state.allies.items[-code - 1]!; // matchUnits's ally slot
    m.gatherUid = a.uid;
    m.hushUid = a.uid;
    a.hushUid = m.uid;
    emit(state, { type: 'GatherTell', uid: m.uid, targetUid: a.uid, ally: true });
  }
}

/**
 * This tick's new tells, before any starts: `s.ready` the ready gatherers' slots (ascending), and
 * `s.code` the unit each takes (an enemy's slot, −(an ally's slot + 1), or Number.MIN_SAFE_INTEGER
 * for none). Exported for the matching's equivalence test (gather.test.ts).
 */
export function gatherMatches(state: SimState, s: GatherScratch): void {
  const pool = state.enemies;
  s.ready.length = 0;
  for (let i = 0; i < pool.used; i++) {
    if (isReady(pool.items[i]!)) s.ready.push(i); // i < used ≤ items.length
  }
  matchUnits(state, s);
}

/** One tick of gathering over every unit: tells under way, the cooldowns, then new tells. */
export function gatherPass(state: SimState, ctx: TickContext): void {
  const pool = state.enemies;
  let anyReady = false;
  for (let i = 0; i < pool.used; i++) {
    const m = pool.items[i]!; // i < used ≤ items.length
    if (!m.alive) continue;
    const g = gatherOf(m);
    if (g === null) {
      if (m.gatherUid !== 0) letGo(state, m, null); // its gathering phase ended mid-tell (T708)
      continue;
    }
    if (!isGatherer(m)) {
      if (m.gatherUid !== 0) letGo(state, m, g); // it started leaving or standing down
      continue;
    }
    if (m.gatherUid !== 0) {
      tellStep(state, m, g);
      continue;
    }
    if (m.absorbs >= g.maxAbsorbs) continue; // full: it never tells again
    const tell = tellTicksOf(g);
    if (m.gatherTicks <= 0) {
      m.gatherTicks = everyTicksOf(g); // first tick alive
      continue;
    }
    if (m.gatherTicks > tell && !cooldownHeld(m)) m.gatherTicks--; // Lulled (T607): its beat
    if (m.gatherTicks > tell) continue;
    if (outOfReach(m) || isInterrupted(m)) {
      m.gatherTicks = everyTicksOf(g); // a tell can't start: the cooldown restarts from zero
      continue;
    }
    anyReady = true;
  }
  if (!anyReady) return;
  // New tells, matched on this state before any starts (order independence).
  const s = ctx.scratch.gather;
  gatherMatches(state, s);
  for (let r = 0; r < s.ready.length; r++) {
    const code = s.code[r]!; // r < ready.length = code.length
    if (code !== NO_UNIT) startTell(state, pool.items[s.ready[r]!]!, code); // a ready slot
  }
}
