// System 9b: detection (design/enemies.md § 2.5; T406), and area Marks (T508). After movement,
// before the towers pick targets, so every tower sees this tick's reveals:
// - Each live cloaked unit (`def.cloaked`) first loses a tick of its reveal (`Enemy.revealedTicks`).
// - Then it is Revealed again if it stands inside a detector's radius or a live `reveal` zone
//   (Scanner Sweep): a detector sets it to at least 1 + its linger (Lookout T3 and its specs: 2 s),
//   a zone to at least 1. So a unit stays Revealed for the linger after it last stood inside.
// - A detector's radius (`detectRadiusTiles`) is its tier's `detect.radiusTiles` plus its links'
//   `bonusDetectTiles` (Overwatch, Skywatch: +0.5), × (1 + its `supportStat` radius tune-up).
//   High ground and power nodes don't change it: they raise attack range and aura strength.
// - A detector with `revealedDamagePct` (Crow's Nest: +10%) Marks each unit it reveals for as long
//   as the reveal (`applyMark`: highest only, so it never stacks with a Mark).
// - **Truthlight** (T508): a cloaked unit under a Truthlight Mark (`Enemy.noEvadeTicks`) can't
//   cloak: it is Revealed (at least 1) every tick the Mark's no-evade lasts, wherever it stands.
// - `Revealed` and `Cloaked` events mark each change (a unit spawns cloaked, with no event).
// - Then the area Marks (All-Seeing; systems/markArea.ts), so they reach what was just revealed.
// An undetected cloaked unit is untouchable (enemyAbilities/cloak.ts `cloakedOut`, folded into
// layers.ts): no targeting, splash, chains, statuses, or hits reach it, and it still leaks.
// Allocation-free; a map with no cloaked unit costs one pass over the enemy pool.
import type { IdSpace } from '../../content/types.ts';
import { stackedDetectTiles } from '../bonuses.ts';
import { applyMark } from '../combat/damage.ts';
import type { Modifier, SupportStat } from '../config.ts';
import type { Enemy, Tower } from '../entities.ts';
import { emit, type SimState } from '../state.ts';
import type { TickContext } from '../tick.ts';
import { markAreas } from './markArea.ts';

/**
 * Σ pct of the `supportStat` modifiers on `tower` (or '*') for `stat`: a support tower's tune-up
 * (design/progression.md § 4.2). The links system reads the aura half; detection the radius.
 */
export function supportPct(
  modifiers: readonly Modifier<IdSpace>[],
  tower: string,
  stat: SupportStat,
): number {
  let pct = 0;
  for (let i = 0; i < modifiers.length; i++) {
    const m = modifiers[i]!; // i < length
    if (m.kind === 'supportStat' && m.stat === stat && (m.tower === '*' || m.tower === tower)) {
      pct += m.pct;
    }
  }
  return pct;
}

/**
 * A tower's detection radius in tiles: its tier's, plus its links' bonus, × its radius tune-up;
 * 0 for a tower that detects nothing. The view draws it as the Lookout's ring.
 */
export function detectRadiusTiles(
  t: Pick<Tower, 'def' | 'tierDef' | 'bonusDetectTiles'>,
  modifiers: readonly Modifier<IdSpace>[],
): number {
  const det = t.tierDef?.detect ?? null;
  if (det === null || t.def === null) return 0;
  return stackedDetectTiles(
    det.radiusTiles,
    t.bonusDetectTiles,
    supportPct(modifiers, t.def.id, 'radius'),
  );
}

export function detection(state: SimState, ctx: TickContext): void {
  const enemies = state.enemies;
  for (let i = 0; i < enemies.used; i++) {
    const e = enemies.items[i]!; // i < used ≤ items.length
    if (!e.alive || e.def === null || !e.def.cloaked) continue;
    const was = e.revealedTicks > 0;
    if (e.revealedTicks > 0) e.revealedTicks--;
    reveal(state, ctx, e);
    const now = e.revealedTicks > 0;
    if (now) e.everRevealed = true; // the `passedMarker` condition's `unrevealed` (T500a)
    if (now && !was) emit(state, { type: 'Revealed', uid: e.uid });
    else if (was && !now) emit(state, { type: 'Cloaked', uid: e.uid });
  }
  markAreas(state);
}

/** Reveals `e` for every detector and reveal zone that covers it this tick. */
function reveal(state: SimState, ctx: TickContext, e: Enemy): void {
  const modifiers = ctx.config.modifiers;
  const towers = state.towers;
  for (let j = 0; j < towers.used; j++) {
    const t = towers.items[j]!; // j < used ≤ items.length
    const det = t.alive ? (t.tierDef?.detect ?? null) : null;
    if (det === null) continue;
    const r = detectRadiusTiles(t, modifiers);
    const dx = e.x - t.x;
    const dy = e.y - t.y;
    if (dx * dx + dy * dy > r * r) continue;
    const ticks = 1 + det.lingerTicks;
    if (ticks > e.revealedTicks) e.revealedTicks = ticks;
    if (det.revealedDamagePct > 0) applyMark(e, det.revealedDamagePct, ticks);
  }
  const zones = state.zones;
  for (let j = 0; j < zones.used; j++) {
    const z = zones.items[j]!; // j < used ≤ items.length
    if (!z.alive || z.kind !== 'reveal') continue;
    const dx = e.x - z.x;
    const dy = e.y - z.y;
    if (dx * dx + dy * dy <= z.radiusSq && e.revealedTicks < 1) e.revealedTicks = 1;
  }
  if (e.noEvadeTicks > 0 && e.revealedTicks < 1) e.revealedTicks = 1; // Truthlight: no cloaking
}
