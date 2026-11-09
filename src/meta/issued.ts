// Issued towers (design/progression.md § 8; the schedule is story/campaign.md § 4.1): Everglow
// issues some towers free when the campaign reaches them, the Sprinkler for A1M2 among them. The
// one home of "which map issues what" is content/upgrades/access.ts: a tower with `how: 'issued'`
// is owned once its `availableAfter` map is won (null: from the start, createNewSave's kit). A
// save gets them at run end (the win that unlocks the next map) and whenever the app takes a save
// into play (load, import, dev save), so a save written before a tower was issued catches up.
// Gifts and licenses are story transactions and purchases, not this.
import { TOWER_ACCESS, type Access } from '../content/upgrades/index.ts';
import type { TowerId } from '../content/types.ts';
import { isMapWon } from './progress.ts';
import type { SaveData } from './saveData.ts';

/** The issued towers `save` should own by now, in access-table order. */
export function issuedTowers(
  save: SaveData,
  access: Readonly<Record<TowerId, Access<string>>> = TOWER_ACCESS,
): TowerId[] {
  const out: TowerId[] = [];
  for (const [id, a] of Object.entries(access) as [TowerId, Access<string>][]) {
    if (a.how !== 'issued') continue;
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
