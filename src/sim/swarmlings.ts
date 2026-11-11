// Swarmlings (design/towers.md § 7, the Scuttle Den; T604): each Den keeps its swarmlings (or, as
// Brave Hearts, its Champions) as owner allies (`mode: 'owner'`, the Den's uid in `ownerUid`) that
// rest at home, dash to an enemy in the Den's range, latch on for the DoT and the chill, then run
// home and rest. They can't be harmed (vulnerability `never`) and always come home. Runs after the
// towers (tick.ts), so it reads this tick's sells, upgrades, and specs. Allocation-free once warm
// (a new swarmling takes a pool slot; the pool is sized for the Dens, state.ts POOL_CAPACITY).
//
// - **The family.** A Den keeps `maxAlive` + its Finders Keepers swarmlings (`linkSwarmlings`) of
//   its tier's `ally` kind; `Tower.swarmAlive` counts them. Missing ones appear at home, ready
//   (a new Den sends its first three out at once). One past the count (a link broken) or of the
//   wrong kind (a Den that took Brave Hearts) lets go, runs home, and goes in for good there. A sold Den's swarmlings let go and go in at once (SwarmHome), wherever they are.
// - **Home.** At the Den's tile centre, resting `swarmTicks` (its tier's `restTicks` after each
//   run; 0 when new). Rested, it picks a target and dashes (`out`). It stays in while the Den
//   holds fire.
// - **The pick** (towers.md § 5's First: least route distance left, ties to the lowest uid): a
//   live enemy whose centre is in the Den's range (its bonuses applied, systems/towers.ts
//   `rangeOf`), on a layer the tier hits (`onLayers`: a ground Den reaches a pinned flyer;
//   Brave Hearts' tier hits air, so its Champions leap onto flyers), burrowed included
//   (Skitterkin follow anything underground), never Phased, leaving, cloaked out, neutral, or a
//   spared unit an ally never targets (allyMayTarget: `quiet_wave`, `youngling`, `fleeing`;
//   D005). It prefers a unit with fewer than SPREAD swarmlings already on it (dashing or
//   latched: as many as stack the chill to SWARMLING_CHILL_CAP, so 3 swarmlings or 2 Champions),
//   else the First anyway: the first ones stack the chill on the lead, the rest spread out.
// - **The dash** (`out`): SWARM_DASH_TILES_PER_SEC (× (1 + Splash Zone's `linkSwarmSpeedPct`))
//   straight at the target's centre each tick. A target that dies, goes out of reach, or runs
//   SWARM_LEASH_TILES past the Den's range is dropped for a fresh pick, else it heads home. A Den
//   holding fire calls its dashers home. Reaching the target (within one step) latches on.
// - **The latch** (`latched`): it rides its target (its position is the target's) for the tier's
//   `latchTicks` + Splash Zone's `linkLatchTicks`, counting the tick it latches. Its DoT lands on
//   the latch tick and every DoT tick after (the attack's period under the Den's rate bonus;
//   0.25 s): the Den's damage per second under its bonuses (`damageOn`) × DOT_TICK_SEC, a DoT that
//   bypasses armor but not shields, reaching a burrowed unit (combat/damage.ts `reachesBurrowed`),
//   credited to the Den (`{ kind: 'tower' }`: its kills, Finders Keepers' credit). It lets go when
//   the latch runs out, the target dies or goes out of reach (Phased, leaving, cloaked out, a
//   pinned flyer freed under a ground Den), or the Den holds fire: SwarmLatch `on: false`, `back`.
// - **The chill** (enemies.md § 2.4): every latched unit adds its tier's `chillPct` to its
//   target's `swarmChillPct`, capped at SWARMLING_CHILL_CAP; that sum is one Chilled source
//   (`applyChill` for this movement tick, like a segment: the strongest source wins, a boss takes
//   half), so it holds exactly while they're on. `latchCount` counts the latched units.
// - **Back** (`back`): the same speed home; on arrival SwarmHome (the head-count chirp) and a rest.
import { DOT_TICK_SEC, SWARMLING_CHILL_CAP } from '../content/rules.ts';
import type { CompiledAttack } from '../content/compiled.ts';
import { TICK_HZ } from '../shared/time.ts';
import { bonusPeriodTicks } from './bonuses.ts';
import { applyChill, applyDamage, type HitMods } from './combat/damage.ts';
import { isNeutral } from './combat/neutral.ts';
import { cloakedOut } from './enemyAbilities/cloak.ts';
import { onLayers } from './enemyAbilities/layers.ts';
import { ALLY_BLANK, type Ally, type Enemy, type Tower } from './entities.ts';
import { poolAlloc, poolKill } from './pool.ts';
import { emit, takeUid, type SimState } from './state.ts';
import { allyMayTarget } from './systems/allies.ts';
import { damageOn, rangeOf } from './systems/towers.ts';
import type { TickContext } from './tick.ts';

type Spawner = Extract<CompiledAttack, { kind: 'spawner' }>;
// EXPERIMENT (T604c): toggles from env.
const ENV: Record<string, string | undefined> = (globalThis as any).process?.env ?? {};
const EXP = {
  ride: ENV.RIDE === '1',
  wake: ENV.WAKE === '1',
  prefb: ENV.PREFB === '1',
  hop: ENV.HOP === '1',
};

/** A swarmling's or Champion's dash and run home (the docs give none; T604's choice). */
export const SWARM_DASH_TILES_PER_SEC = 4;
/** A dash drops a target this far past the Den's range (tiles), for a fresh pick or home. */
export const SWARM_LEASH_TILES = 1.5;

/** A swarmling's DoT tick: a DoT (armor bypassed, enemies.md § 2.3) that reaches a burrowed unit. */
const SWARM_HIT: HitMods = Object.freeze({
  armorPierce: 0,
  ignoresArmor: false,
  isDoT: true,
  reachesBurrowed: true,
});

/** How many units stack `chillPct` to the cap: the spread threshold of the pick (3 or 2). */
export function swarmSpread(chillPct: number): number {
  if (chillPct <= 0) return 1;
  const n = Math.ceil(SWARMLING_CHILL_CAP / chillPct - 1e-9);
  return n > 1 ? n : 1;
}

/** A Den's family size now: its tier's `maxAlive` plus Finders Keepers'. */
export function swarmMax(t: Tower, attack: Spawner): number {
  return attack.maxAlive + t.linkSwarmlings;
}

/** Whether `e` is a target a Den's swarmlings may hold (see the header; burrowed is fine). */
function reachable(e: Enemy, ground: boolean, air: boolean): boolean {
  return (
    e.alive &&
    e.def !== null &&
    !e.phased &&
    !e.leaving &&
    !cloakedOut(e) &&
    !isNeutral(e) &&
    onLayers(e, ground, air) &&
    allyMayTarget(e.tags)
  );
}

/** The live enemy `uid` (its pool `slot` a hint), or null. */
function enemyAt(state: SimState, slot: number, uid: number): Enemy | null {
  if (uid === 0 || slot < 0 || slot >= state.enemies.used) return null;
  const e = state.enemies.items[slot]!; // 0 ≤ slot < used
  return e.alive && e.uid === uid ? e : null;
}

/** The live Den `uid`, or null (sold). */
function denOf(state: SimState, uid: number): Tower | null {
  const pool = state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i]!; // i < used ≤ items.length
    if (t.alive && t.uid === uid) return t;
  }
  return null;
}

/** The Den's spawner attack, or null (not a Den). */
function spawnerOf(t: Tower): Spawner | null {
  const a = t.tierDef?.attack ?? null;
  return a !== null && a.kind === 'spawner' ? a : null;
}

export function swarmlings(state: SimState, ctx: TickContext): void {
  if (!anySwarm(state)) return;
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    e.swarmChillPct = 0;
    e.latchCount = 0;
  }
  family(state);
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (a.alive && a.mode === 'owner') step(state, ctx, a);
  }
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.swarmChillPct <= 0) continue;
    if (e.swarmChillPct > SWARMLING_CHILL_CAP) e.swarmChillPct = SWARMLING_CHILL_CAP;
    applyChill(e, e.swarmChillPct, 1);
  }
}

/** Whether any Den stands or any swarmling is out (else the pass has nothing to do). */
function anySwarm(state: SimState): boolean {
  const towers = state.towers;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    if (t.alive && spawnerOf(t) !== null) return true;
  }
  const allies = state.allies;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (a.alive && a.mode === 'owner') return true;
  }
  return false;
}

/** Counts each Den's family of its kind (`swarmAlive`) and makes up the missing at home. */
function family(state: SimState): void {
  const towers = state.towers;
  const allies = state.allies;
  for (let i = 0; i < towers.used; i++) {
    const t = towers.items[i]!; // i < used ≤ items.length
    const attack = t.alive ? spawnerOf(t) : null;
    if (attack === null) continue;
    let n = 0;
    for (let j = 0; j < allies.used; j++) {
      const a = allies.items[j]!; // j < used ≤ items.length
      if (a.alive && a.mode === 'owner' && a.ownerUid === t.uid && a.kind === attack.ally) n++;
    }
    const max = swarmMax(t, attack);
    while (n < max) {
      spawnAtHome(state, t, attack);
      n++;
    }
    t.swarmAlive = n;
  }
}

/** A new swarmling (or Champion) at its Den, rested and ready. */
function spawnAtHome(state: SimState, t: Tower, attack: Spawner): void {
  const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
  a.kind = attack.ally;
  a.mode = 'owner';
  a.vulnerability = 'never';
  a.ownerUid = t.uid;
  a.x = t.x;
  a.y = t.y;
  // No attack of its own (`damage` 0, so the allies system passes it by): its DoT is the Den's.
  a.damageType = attack.type;
  a.hitsGround = t.tierDef!.targets.ground; // spawnerOf checked tierDef
  a.hitsAir = t.tierDef!.targets.air;
  a.swarmState = 'home';
  a.swarmTicks = 0;
}

/** One tick of a swarmling (see the header). */
function step(state: SimState, ctx: TickContext, a: Ally): void {
  const den = denOf(state, a.ownerUid);
  const attack = den === null ? null : spawnerOf(den);
  if (den === null || attack === null) {
    goIn(state, a); // its Den was sold: it lets go and goes in at once
    return;
  }
  const speed = (SWARM_DASH_TILES_PER_SEC / TICK_HZ) * (1 + den.linkSwarmSpeedPct);
  // Of a kind its Den no longer sends (it took Brave Hearts): it lets go and runs home to retire.
  if (a.kind !== attack.ally && (a.swarmState === 'out' || a.swarmState === 'latched')) {
    if (a.swarmState === 'latched') letGo(state, a);
    else turnBack(a);
  }
  switch (a.swarmState) {
    case 'home':
      home(state, ctx, a, den, attack);
      return;
    case 'out':
      dash(state, ctx, a, den, attack, speed);
      return;
    case 'latched':
      hold(state, ctx, a, den, attack);
      return;
    case 'back':
      run(state, a, den, attack, speed);
      return;
  }
}

/** Resting at home: counts down, or (rested, its Den not holding fire) dashes at a fresh pick. */
function home(state: SimState, ctx: TickContext, a: Ally, den: Tower, attack: Spawner): void {
  a.x = den.x;
  a.y = den.y;
  if (a.kind !== attack.ally || den.swarmAlive > swarmMax(den, attack)) {
    retire(state, a, den, attack);
    return;
  }
  // Its rest counts the arrival's pass: it heads out on the restTicks-th pass after.
  if (
    a.swarmTicks > 0 &&
    --a.swarmTicks > 0 &&
    !(EXP.wake && burrowedInRange(state, ctx, den, attack, a))
  )
    return;
  if (den.holdFire) return;
  a.swarmTicks = 0;
  const target = pick(state, ctx, den, attack, a);
  if (target === null) return;
  a.swarmState = 'out';
  a.targetUid = target.uid;
  a.targetSlot = target.slot;
}

/** Dashing at its target: re-picks one it lost, latches on reaching it. */
function dash(
  state: SimState,
  ctx: TickContext,
  a: Ally,
  den: Tower,
  attack: Spawner,
  speed: number,
): void {
  if (den.holdFire) {
    turnBack(a);
    return;
  }
  let target = enemyAt(state, a.targetSlot, a.targetUid);
  if (target !== null && !keepsChasing(ctx, den, attack, a, target)) target = null;
  if (target === null) {
    target = pick(state, ctx, den, attack, a);
    if (target === null) {
      turnBack(a);
      return;
    }
    a.targetUid = target.uid;
    a.targetSlot = target.slot;
  }
  if (moveToward(a, target.x, target.y, speed)) {
    a.swarmState = 'latched';
    if (!(EXP.hop && a.swarmTicks > 0)) a.swarmTicks = attack.latchTicks + den.linkLatchTicks;
    a.cooldownTicks = 0;
    emit(state, { type: 'SwarmLatch', uid: a.uid, enemyUid: target.uid, on: true });
    hold(state, ctx, a, den, attack);
  }
}

/** Whether a dasher keeps after `e`: still reachable and within the leash of the Den's range. */
function keepsChasing(ctx: TickContext, den: Tower, attack: Spawner, a: Ally, e: Enemy): boolean {
  if (!reachable(e, a.hitsGround, a.hitsAir)) return false;
  const leash = Math.sqrt(rangeOf(ctx, den, attack).rangeSq) + SWARM_LEASH_TILES;
  const dx = e.x - den.x;
  const dy = e.y - den.y;
  return dx * dx + dy * dy <= leash * leash;
}

/** Latched on: rides its target, lands its DoT ticks, adds its chill; lets go when it's over. */
function hold(state: SimState, ctx: TickContext, a: Ally, den: Tower, attack: Spawner): void {
  const target = enemyAt(state, a.targetSlot, a.targetUid);
  if (den.holdFire || target === null || !reachable(target, a.hitsGround, a.hitsAir)) {
    letGo(state, a);
    return;
  }
  a.x = target.x;
  a.y = target.y;
  if (a.cooldownTicks > 0) a.cooldownTicks--;
  if (a.cooldownTicks === 0) {
    // One scratch source for every DoT tick (applyDamage copies what an EnemyDied keeps).
    const source = ctx.scratch.towerSource;
    source.uid = den.uid;
    // On a burrowed target the DoT is the Den's `burrowedDotMul` (towers.md § 7).
    const mul = target.burrowed ? attack.burrowedDotMul : 1;
    const amount = damageOn(den, attack, target) * DOT_TICK_SEC * mul;
    applyDamage(state, target, amount, attack.type, source, SWARM_HIT);
    a.cooldownTicks = bonusPeriodTicks(attack, den);
    if (den.firstFiredTick < 0) den.firstFiredTick = state.tick;
  }
  if (target.alive) {
    target.swarmChillPct += attack.chillPct;
    target.latchCount++;
  }
  if (EXP.ride && target.alive && target.burrowed && a.swarmTicks <= 1) return;
  if (EXP.hop && !target.alive && a.swarmTicks > 1) {
    a.swarmTicks--;
    emit(state, { type: 'SwarmLatch', uid: a.uid, enemyUid: a.targetUid, on: false });
    const next = pick(state, ctx, den, attack, a);
    if (next !== null) {
      a.swarmState = 'out';
      a.targetUid = next.uid;
      a.targetSlot = next.slot;
      a.cooldownTicks = 0;
      return;
    }
    turnBack(a);
    return;
  }
  if (--a.swarmTicks <= 0 || !target.alive) letGo(state, a);
}

/** Running home: arrives, chirps (SwarmHome), and rests (or goes in for good, `retire`). */
function run(state: SimState, a: Ally, den: Tower, attack: Spawner, speed: number): void {
  if (!moveToward(a, den.x, den.y, speed)) return;
  a.swarmState = 'home';
  a.swarmTicks = attack.restTicks;
  emit(state, { type: 'SwarmHome', uid: a.uid, towerUid: den.uid });
  if (a.kind !== attack.ally || den.swarmAlive > swarmMax(den, attack))
    retire(state, a, den, attack);
}

/** Steps (x, y) toward a point; returns whether it got there this tick (it snaps on). */
function moveToward(a: Ally, x: number, y: number, speed: number): boolean {
  const dx = x - a.x;
  const dy = y - a.y;
  const d2 = dx * dx + dy * dy;
  if (d2 <= speed * speed) {
    a.x = x;
    a.y = y;
    return true;
  }
  const k = speed / Math.sqrt(d2);
  a.x += dx * k;
  a.y += dy * k;
  return false;
}

/** Lets go of its target (SwarmLatch off) and runs home. */
function letGo(state: SimState, a: Ally): void {
  emit(state, { type: 'SwarmLatch', uid: a.uid, enemyUid: a.targetUid, on: false });
  turnBack(a);
}

function turnBack(a: Ally): void {
  a.swarmState = 'back';
  a.targetUid = 0;
  a.targetSlot = -1;
  a.cooldownTicks = 0;
}

/** One past its Den's count, or of a kind the Den no longer sends, goes in for good at home. */
function retire(state: SimState, a: Ally, den: Tower, attack: Spawner): void {
  if (a.kind === attack.ally) den.swarmAlive--;
  poolKill(state.allies, a);
}

/** Its Den is gone: it lets go if latched and goes in at once (SwarmHome names the old Den). */
function goIn(state: SimState, a: Ally): void {
  if (a.swarmState === 'latched') {
    emit(state, { type: 'SwarmLatch', uid: a.uid, enemyUid: a.targetUid, on: false });
  }
  emit(state, { type: 'SwarmHome', uid: a.uid, towerUid: a.ownerUid });
  poolKill(state.allies, a);
}

/**
 * The Den's pick for swarmling `self` (see the header): First among the reachable units in range
 * with fewer than the spread already on them, else First among all of them; null if none.
 */
function pick(
  state: SimState,
  ctx: TickContext,
  den: Tower,
  attack: Spawner,
  self: Ally,
): Enemy | null {
  const enemies = state.enemies;
  const rangeSq = rangeOf(ctx, den, attack).rangeSq;
  const spread = swarmSpread(attack.chillPct);
  let best: Enemy | null = null;
  let bestLeft = 0;
  let open: Enemy | null = null;
  let openLeft = 0;
  let bur: Enemy | null = null;
  let burLeft = 0;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!reachable(e, self.hitsGround, self.hitsAir)) continue;
    const dx = e.x - den.x;
    const dy = e.y - den.y;
    if (dx * dx + dy * dy > rangeSq) continue;
    const left = e.route === null ? 0 : e.route.lengthTiles - e.dist;
    if (best === null || left < bestLeft || (left === bestLeft && e.uid < best.uid)) {
      best = e;
      bestLeft = left;
    }
    if (EXP.prefb && e.burrowed && claims(state, e.uid, self) < spread) {
      if (bur === null || left < burLeft) {
        bur = e;
        burLeft = left;
      }
    }
    if (open !== null && (left > openLeft || (left === openLeft && e.uid > open.uid))) continue;
    if (claims(state, e.uid, self) < spread) {
      open = e;
      openLeft = left;
    }
  }
  return bur ?? open ?? best;
}

function burrowedInRange(
  state: SimState,
  ctx: TickContext,
  den: Tower,
  attack: Spawner,
  self: Ally,
): boolean {
  const rangeSq = rangeOf(ctx, den, attack).rangeSq;
  for (let i = 0; i < state.enemies.used; i++) {
    const e = state.enemies.items[i]!;
    if (!e.burrowed || !reachable(e, self.hitsGround, self.hitsAir)) continue;
    const dx = e.x - den.x;
    const dy = e.y - den.y;
    if (dx * dx + dy * dy <= rangeSq) return true;
  }
  return false;
}

/** Swarmlings (any Den's, but `self`) dashing at or latched onto enemy `uid`. */
function claims(state: SimState, uid: number, self: Ally): number {
  const allies = state.allies;
  let n = 0;
  for (let i = 0; i < allies.used; i++) {
    const a = allies.items[i]!; // i < used ≤ items.length
    if (a === self || !a.alive || a.mode !== 'owner' || a.targetUid !== uid) continue;
    if (a.swarmState === 'out' || a.swarmState === 'latched') n++;
  }
  return n;
}
