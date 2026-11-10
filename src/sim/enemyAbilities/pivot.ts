// Standing down and the pivot (design/enemies.md § 6.1; T506; A2M5's Sunderglass Penitent).
// A leaf beside bossPhases.ts: it spawns no enemies, so the damage pipeline can reach it.
// - **Standing down** (`standDown`, a script action, and every pivot): each live hostile unit of a
//   faction (not neutral, not already leaving) stops where it is, fades out over
//   STAND_DOWN_FADE_SEC, and is removed: no leak, no bounty, no kill (no split, no Skittish loss).
//   It is `leaving` meanwhile, so the leaving rules hold it out of everything (untargetable, no
//   ability, no aura, no hush, no huddle; layers.ts), and `standDownTicks` counts the fade
//   (`standDownStep`, from the abilities system, before the leaving move). Cleanup books it
//   against its wave like any other departure, so the wave resolves cleanly (and pays its clear
//   bonus) once the rest of it is gone. StoodDown as it begins; nothing as it goes.
// - **The pivot** (`pivot`, a boss's ending at `endAtPct` or the `bossEnd: 'pivot'` action): the
//   boss's fight ends (BossEnded `pivot`), `stats.pivotWave` records the wave (once: Kneel), every
//   hostile unit of its faction stands down, itself included (its body fades as it kneels), and
//   the boss's `ward` takes its place: a stationary ally at its position (kind `ward`, group −1:
//   never a refugee) whose aura Chills Hollow units inside its radius (systems/allies.ts
//   `wardAuras`). A boss with no `ward` only stands down. The objective switch, the refugees, and
//   the cue are the map's own script actions (maps.md § 5.3), run beside it.
import { STAND_DOWN_FADE_SEC } from '../../content/rules.ts';
import type { EnemyFaction } from '../../content/types.ts';
import { secToTicks } from '../../shared/time.ts';
import { ALLY_BLANK, type Enemy } from '../entities.ts';
import { poolAlloc, poolKill } from '../pool.ts';
import { emit, takeUid, type SimState } from '../state.ts';

export const STAND_DOWN_TICKS = secToTicks(STAND_DOWN_FADE_SEC);

/** Stands one live unit down (see the header): it stops, fades, and goes. StoodDown. */
export function standDownUnit(state: SimState, e: Enemy): void {
  const def = e.def;
  if (!e.alive || def === null || e.leaving) return;
  e.leaving = true;
  e.burrowed = false;
  e.phased = false;
  e.invulnerableTicks = 0;
  e.huddleUid = 0;
  e.hushTicks = 0;
  e.hushUid = 0;
  e.reformTicks = 0;
  e.standDownTicks = STAND_DOWN_TICKS;
  emit(state, {
    type: 'StoodDown',
    uid: e.uid,
    enemy: def.id,
    faction: def.faction,
    x: e.x,
    y: e.y,
  });
}

/**
 * `standDown` (a script action, and every pivot): every live hostile unit of `faction` stands
 * down, in slot order. Neutral units (Gerald) aren't hostile and stay.
 */
export function standDown(state: SimState, faction: EnemyFaction): void {
  const pool = state.enemies;
  for (let i = 0; i < pool.used; i++) {
    const e = pool.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || e.def.neutral || e.def.faction !== faction) continue;
    standDownUnit(state, e);
  }
}

/** One tick of a standing-down unit's fade: removed (no event) when it runs out. */
export function standDownStep(state: SimState, e: Enemy): void {
  if (--e.standDownTicks <= 0) {
    e.standDownTicks = 0;
    poolKill(state.enemies, e);
  }
}

/**
 * The pivot (see the header): BossEnded `pivot`, `stats.pivotWave` (first pivot only), its faction
 * stands down with it, and its ward (if any) takes its place. A boss already leaving is ignored.
 */
export function pivotBoss(state: SimState, boss: Enemy): void {
  const def = boss.def;
  if (!boss.alive || def === null || def.boss === null || boss.leaving) return;
  emit(state, { type: 'BossEnded', uid: boss.uid, enemy: def.id, how: 'pivot' });
  if (state.stats.pivotWave === 0) state.stats.pivotWave = state.wave;
  const x = boss.x;
  const y = boss.y;
  standDown(state, def.faction);
  const ward = def.boss.ward;
  if (ward === null) return;
  const a = poolAlloc(state.allies, ALLY_BLANK, takeUid(state));
  a.kind = 'ward';
  a.mode = 'stationary';
  a.vulnerability = 'never';
  a.x = x;
  a.y = y;
  a.rangeSq = ward.radiusSq;
  a.auraChillPct = ward.chillPct;
  a.enemyId = def.id;
  emit(state, { type: 'AllySpawned', uid: a.uid, kind: 'ward', x, y });
}
