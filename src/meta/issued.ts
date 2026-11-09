// Issued towers (design/progression.md § 8; the schedule is story/campaign.md § 4.1): Everglow
// issues some towers free when the campaign reaches them, the Sprinkler for A1M2 among them. The
// one home of "which map issues what" is content/upgrades/access.ts: a tower with `how: 'issued'`
// is owned once its `availableAfter` map is won (null: from the start, createNewSave's kit). A
// save gets them at run end (the win that unlocks the next map) and whenever the app takes a save
// into play (load, import, dev save), so a save written before a tower was issued catches up.
// A license priced 0 is given the same way the moment it's stocked: Zibzab's Zapcoil sample, "given
// the moment the shop opens" after A1M3 (progression.md § 4.1; T308). Gifts and paid licenses are
// story transactions and purchases, not this.
import { TOWER_ACCESS, type Access } from '../content/upgrades/index.ts';
import type { TowerId } from '../content/types.ts';
import { isMapWon } from './progress.ts';
import type { SaveData } from './saveData.ts';

/** Whether access row `a` hands its tower over unasked: issued, or a license priced 0 (a sample). */
function given(a: Access<string>): boolean {
  return a.how === 'issued' || (a.how === 'license' && a.price === 0);
}

/** The issued (and sampled) towers `save` should own by now, in access-table order. */
export function issuedTowers(
  save: SaveData,
  access: Readonly<Record<TowerId, Access<string>>> = TOWER_ACCESS,
): TowerId[] {
  const isTower = (k: string): k is TowerId => Object.hasOwn(access, k);
  const out: TowerId[] = [];
  for (const id of Object.keys(access).filter(isTower)) {
    const a = access[id];
    if (!given(a)) continue;
    if (a.availableAfter === null || isMapWon(save, a.availableAfter)) out.push(id);
  }
  return out;
}

/**
 * `save` with every issued tower it should own added to `unlocks.towers` (appended, in
 * access-table order). Returns `save` itself when nothing is missing, so callers can tell.
 */
export function withIssuedTowers(
  save: SaveData,
  access: Readonly<Record<TowerId, Access<string>>> = TOWER_ACCESS,
): SaveData {
  const missing = issuedTowers(save, access).filter((t) => !save.unlocks.towers.includes(t));
  if (missing.length === 0) return save;
  return { ...save, unlocks: { ...save.unlocks, towers: [...save.unlocks.towers, ...missing] } };
}
