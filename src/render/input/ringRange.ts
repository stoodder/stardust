// A placed tower's range ring as the hover and the selection draw it (art-direction.md § Range rings
// and placement; scenes/BattleHover.ts): the range the tower really fires at, read through the
// sim's own stacking (`bonusRangeTiles`: its links, its tile and the dark), so the ring and the
// tower's targeting never disagree (review C5).
import type { IdSpace } from '../../content/types.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { bonusRangeTiles, detectRadiusTiles, type Modifier, type Tower } from '../../sim/index.ts';

/**
 * A placed tower's range ring (tiles; 0: none): its stacked range, dark included, or, for a
 * tower without an attack, its detection radius (the Lookout; T406).
 */
export function ringRangeTiles(
  t: DeepReadonly<Tower> | null,
  modifiers: readonly Modifier<IdSpace>[],
): number {
  if (t === null) return 0;
  const attack = t.tierDef?.attack ?? null;
  return attack !== null ? bonusRangeTiles(attack, t) : detectRadiusTiles(t, modifiers);
}

/** Whether the ring dims: a tower with an attack the darkness reaches (Sundown; T505). */
export function ringDimmed(
  t: Pick<DeepReadonly<Tower>, 'tierDef' | 'darkRangePct'> | null,
): boolean {
  return t !== null && (t.tierDef?.attack ?? null) !== null && t.darkRangePct > 0;
}
