// Development saves, loaded by the test-only `?save=<id>` hook (T209, with `?test=1`) so smoke
// tests and the owner can reach systems the campaign gates behind maps that don't exist yet.
// Each is built from the live registries, so it stays valid as content lands: `mid_m2` covers
// the first two campaign maps once A1M2 is in CAMPAIGN, and `all_unlocked` owns every registered
// tower, spec, and ability. devSaves.test.ts validates every one.
// `devUnlocks` opens gated systems whose maps don't exist yet (D031). It lives here, never in
// SaveData, so no save or import code can carry it, and the app honours it only under `?test=1`.
import { CAMPAIGN } from '../../content/campaign.ts';
import { MAPS } from '../../content/maps/index.ts';
import { UPGRADES } from '../../content/upgrades/index.ts';
import type { MapId, MedalId } from '../../content/types.ts';
import type { MetaSystem } from '../progress.ts';
import { META_SYSTEMS } from '../progress.ts';
import type { MapRecord, SaveData } from '../saveData.ts';
import { LIVE_KNOWN_IDS, createNewSave } from '../saveData.ts';

export type DevSaveId = 'fresh' | 'after_a1m1' | 'mid_m2' | 'all_unlocked';

export interface DevSave {
  readonly description: string;
  /** Returns a fresh copy every call. */
  readonly build: () => SaveData;
  /** Systems to open regardless of campaign progress (meta/progress.ts `isSystemUnlocked`). */
  readonly devUnlocks?: readonly MetaSystem[];
}

/**
 * The medal ids a map can award. Victory and Perfect Core ids are placeholders until T202c fixes
 * the medal id convention; the Challenge id is the map's own when its data has one.
 */
function medalIds(map: MapId): MedalId[] {
  const def: { readonly medals?: { readonly challenge: { readonly id: MedalId } } } = MAPS[map];
  return ['victory', 'perfect_core', def.medals?.challenge.id ?? 'challenge'];
}

function won(map: MapId, medals: MedalId[]): MapRecord {
  return { completed: true, medals, bestMeter: MAPS[map].coreIntegrity ?? 0 };
}

function afterA1M1(): SaveData {
  const save = createNewSave();
  save.campaign.maps.a1_m01 = won('a1_m01', medalIds('a1_m01'));
  save.currencies.intel = 3;
  save.unlocks.towers.push('sprinkler'); // issued for A1M2 (campaign.md § 4.1)
  save.stats = { pestsProcessed: 212, runs: 2 };
  return save;
}

export const DEV_SAVES: Readonly<Record<DevSaveId, DevSave>> = {
  fresh: {
    description: 'A new campaign: Rivet, Thumper, and Orbital Strike; nothing played.',
    build: createNewSave,
  },
  after_a1m1: {
    description: 'A1M1 won with all three medals: 3 Intel, 0 Stardust, Sprinkler issued for A1M2.',
    build: afterA1M1,
  },
  mid_m2: {
    description:
      'A1M1 won with all three medals, Orbital Strike Mk II bought with 2 of its 3 Intel, then ' +
      'the second campaign map won (Victory only, once it is in CAMPAIGN) and its payout banked.',
    build: () => {
      const save = afterA1M1();
      save.upgrades.orbital_strike_mk2 = 1;
      save.currencies.intel -= 2;
      const second = CAMPAIGN[1];
      if (second !== undefined) {
        save.campaign.maps[second] = won(second, medalIds(second).slice(0, 1));
        save.currencies.intel += 1;
        save.currencies.stardust += MAPS[second].stardust;
      }
      save.stats = { pestsProcessed: 540, runs: 5 };
      return save;
    },
  },
  all_unlocked: {
    description:
      'Every campaign map won with every medal; every registered tower, spec, ability, protocol, ' +
      'and upgrade (at its top rank) owned; ' +
      'deep pockets for the shop and R&D; every gated system open.',
    devUnlocks: META_SYSTEMS,
    build: () => {
      const save = createNewSave();
      for (const map of CAMPAIGN) save.campaign.maps[map] = won(map, medalIds(map));
      // The registries' ids, typed back from the known-id sets.
      const towers = [...LIVE_KNOWN_IDS.towers] as SaveData['unlocks']['towers'];
      save.unlocks.towers = towers;
      save.unlocks.specs = [...towers];
      save.unlocks.abilities = [...LIVE_KNOWN_IDS.abilities] as SaveData['unlocks']['abilities'];
      save.unlocks.protocols = [...LIVE_KNOWN_IDS.protocols];
      for (const u of Object.values(UPGRADES)) save.upgrades[u.id] = u.ranks.length;
      save.currencies = { stardust: 99_999, intel: 999 };
      save.stats = { pestsProcessed: 9_999, runs: 40 };
      return save;
    },
  },
};
