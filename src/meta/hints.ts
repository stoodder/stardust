// One-time hints (D061): the HUD teaches some things once per save, and the save remembers it.
// `upgrade` is the upgrade teach (D028); `xenotech` is the first visit to Ves'thara's Xenotech
// tab, which carries a NEW tag until then (T566). `new:<tower>` marks a newly issued tower's first battle:
// a tower Everglow issues after a map (TOWER_ACCESS `how: 'issued'` with an `availableAfter`, so
// never the starting kit), taken into a battle for the first time, gets a NEW pip on its build
// slot and its `issued` radio line for that one run (the Sprinkler on A1M2). An Aelari tower
// given or attuned (`how: 'gift'` or `'attune'`: the Prism Spire, the Mindspike, the Lantern;
// T566) is new the same way; its radio line plays where the map has one (`<map>_cue_issued_<tower>`).
import { TOWER_ACCESS, type Access } from '../content/upgrades/index.ts';
import type { TowerId } from '../content/types.ts';
import type { HintId, SaveData } from './saveData.ts';

/** The upgrade teach's hint. */
export const UPGRADE_HINT: HintId = 'upgrade';

/** The Xenotech tab's first visit (its NEW tag until then). */
export const XENOTECH_HINT: HintId = 'xenotech';

/** A newly issued tower's hint. */
export function newTowerHint(tower: TowerId): HintId {
  return `new:${tower}`;
}

/** Every hint id a save may hold, for `towers` (validation). */
export function hintIds(towers: readonly TowerId[]): HintId[] {
  return [UPGRADE_HINT, XENOTECH_HINT, ...towers.map(newTowerHint)];
}

/** Whether `save` has shown `hint`. */
export function hintSeen(save: SaveData, hint: HintId): boolean {
  return save.seenHints.includes(hint);
}

/**
 * The towers in `loadout` that are new this battle: issued after a map (not the starting kit), or
 * given or attuned, and never taken into a battle by `save` before. In loadout order.
 */
export function newlyIssuedTowers(
  save: SaveData,
  loadout: readonly string[],
  access: Readonly<Record<TowerId, Access<string>>> = TOWER_ACCESS,
): TowerId[] {
  const isTower = (k: string): k is TowerId => Object.hasOwn(access, k);
  return loadout.filter(isTower).filter((t) => {
    const a = access[t];
    const fresh =
      (a.how === 'issued' && a.availableAfter !== null) || a.how === 'gift' || a.how === 'attune';
    return fresh && !hintSeen(save, newTowerHint(t));
  });
}

/** `save` with `hints` marked seen (appended). Returns `save` itself when none is new. */
export function withHintsSeen(save: SaveData, hints: readonly HintId[]): SaveData {
  const add = hints.filter((h, i) => !save.seenHints.includes(h) && hints.indexOf(h) === i);
  return add.length === 0 ? save : { ...save, seenHints: [...save.seenHints, ...add] };
}
