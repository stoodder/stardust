// Development saves, loaded by the test-only `?save=<id>` hook (T209, with `?test=1`) so smoke
// tests and the owner can start partway through the campaign, or reach systems gated behind maps
// that don't exist yet. Each is built from the live registries, so it stays valid as content
// lands: `mid_m2` covers the first two campaign maps, and `all_unlocked` owns every registered
// tower, spec, and ability. devSaves.test.ts validates every one.
// `devUnlocks` opens gated systems whose maps don't exist yet (D031). It lives here, never in
// SaveData, so no save or import code can carry it, and the app honours it only under `?test=1`.
import { CAMPAIGN, type CampaignMapId } from '../../content/campaign.ts';
import { CODEX_IDS } from '../../content/codex/index.ts';
import { MAPS } from '../../content/maps/index.ts';
import { MEMO_IDS } from '../../content/memos/index.ts';
import { PROTOCOLS, UPGRADES } from '../../content/upgrades/index.ts';
import type { EnemyId, MapId, MedalId, ProtocolId, TowerId } from '../../content/types.ts';
import { withIssuedTowers } from '../issued.ts';
import type { MetaSystem } from '../progress.ts';
import { META_SYSTEMS } from '../progress.ts';
import type { MapRecord, SaveData } from '../saveData.ts';
import { LIVE_KNOWN_IDS, createNewSave } from '../saveData.ts';

export type DevSaveId =
  'fresh' | 'after_a1m1' | 'mid_m2' | 'after_a1m3' | 'after_a1m4' | 'after_a1m5' | 'all_unlocked';

export interface DevSave {
  readonly description: string;
  /** Returns a fresh copy every call. */
  readonly build: () => SaveData;
  /** Systems to open regardless of campaign progress (meta/progress.ts `isSystemUnlocked`). */
  readonly devUnlocks?: readonly MetaSystem[];
}

/**
 * The medal ids a map can award (sim/medals.ts's convention): `victory`, `perfect_core`, and the
 * map's own Challenge id (`challenge` for a map whose data has none).
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
  save.stats = { pestsProcessed: 212, runs: 2 };
  return withIssuedTowers(save); // the Sprinkler, issued for A1M2 (campaign.md § 4.1)
}

/** The profile the M3 dev saves carry (character creation done, T306). */
const DEV_PROFILE = { name: 'Dev Tech', pronouns: 'they', callsign: 'sprout' } as const;

function isRegistered(id: string): id is MapId {
  return CAMPAIGN.some((m) => m === id);
}

/** The enemy types `map`'s waves spawn, when it's registered (none otherwise). */
function mapEnemies(map: CampaignMapId): EnemyId[] {
  if (!isRegistered(map)) return [];
  const out: EnemyId[] = [];
  for (const w of MAPS[map].waves) {
    for (const g of w.groups) if (!out.includes(g.enemy)) out.push(g.enemy);
  }
  return out;
}

/** `ids` that are in `known` (an id whose content hasn't landed yet stays out). */
function registered<T extends string>(ids: readonly string[], known: readonly T[]): T[] {
  return known.filter((k) => ids.includes(k));
}

/**
 * The Act I campaign through `last` on the reference profile (campaign.md § 4.9): every map won
 * with Victory (A1M1 with all three medals), its first-clear Stardust and Intel banked and the
 * reference purchases paid for, the intake done (`arrival_reason = lettuce`), Act I's memos
 * delivered, and Bricks's tags given. A map that isn't registered yet is skipped (no record, no
 * payout), so each save stays valid while A1M3–A1M5 land; ids with no registry entry yet (memos,
 * codex entries, towers) are left out the same way.
 */
function actOneThrough(last: 'a1_m03' | 'a1_m04' | 'a1_m05'): SaveData {
  const save = afterA1M1();
  const order = ['a1_m02', 'a1_m03', 'a1_m04', 'a1_m05'] as const;
  const played = order.slice(0, order.indexOf(last) + 1);
  for (const map of played) {
    if (!isRegistered(map)) continue;
    save.campaign.maps[map] = won(map, medalIds(map).slice(0, 1));
    save.currencies.intel += 1;
    save.currencies.stardust += MAPS[map].stardust;
  }
  const seen: EnemyId[] = [];
  for (const map of ['a1_m01', ...played] as const) {
    for (const e of mapEnemies(map)) if (!seen.includes(e)) seen.push(e);
  }
  save.campaign.seenEnemies = seen;
  save.profile = { ...DEV_PROFILE };
  save.story.flags = { arrival_reason: 'lettuce' };
  // Bricks names Denise on A1M2 and Marguerite on A1M5 (campaign.md § 6.3).
  save.story.bricksTagIndex = played.includes('a1_m05') ? 2 : 1;
  const memos = [
    'memo_a1_00',
    'memo_a1_01',
    'memo_a1_02',
    'memo_a1_03',
    'memo_a1_04',
    'memo_a1_05',
  ];
  save.story.memosDelivered = registered(memos.slice(0, played.length + 2), MEMO_IDS);
  save.story.memosRead = save.story.memosDelivered.slice(0, -1);
  for (const id of registered(['codex_nibbler', 'codex_zoomer', 'codex_rivet'], CODEX_IDS)) {
    save.story.codex[id] = ['original'];
  }
  // Towers issued by now (the Skyhook for A1M3 once T304a registers it), then the Zapcoil sample,
  // Zibzab's shop opening gift after A1M3 (campaign.md § 4.9), once it is registered.
  const withTowers = withIssuedTowers(save);
  const zapcoil = knownTower('zapcoil');
  if (zapcoil !== undefined && !withTowers.unlocks.towers.includes(zapcoil)) {
    withTowers.unlocks.towers.push(zapcoil);
  }
  if (last !== 'a1_m03') {
    // Before A1M4: Head Start equipped, Rivet and Thumper tune 1 (campaign.md § 4.9).
    const headStart: ProtocolId = 'head_start';
    withTowers.unlocks.protocols = [headStart];
    withTowers.loadouts.protocols = [headStart];
    withTowers.upgrades.tune_rivet = 1;
    withTowers.upgrades.tune_thumper = 1;
    withTowers.currencies.stardust -=
      PROTOCOLS.head_start.price + price('tune_rivet') + price('tune_thumper');
  }
  if (last === 'a1_m05') {
    // Before A1M5: Thumper specs (2 Intel), Reinforced Core 1, Sprinkler tune 1.
    withTowers.unlocks.specs = ['thumper'];
    withTowers.currencies.intel -= 2;
    withTowers.upgrades.reinforced_core = 1;
    withTowers.upgrades.tune_sprinkler = 1;
    withTowers.currencies.stardust -= price('reinforced_core') + price('tune_sprinkler');
    // C1 spared, so the Containment Lapse stamp and memo paragraph have a save to show on.
    withTowers.story.flags.spared_quiet_wave = true;
  }
  withTowers.currencies.stardust = Math.max(0, withTowers.currencies.stardust);
  withTowers.stats = { pestsProcessed: 400 + 300 * played.length, runs: 2 + 2 * played.length };
  return withTowers;
}

/** The registered tower `id`, if it is registered yet. */
function knownTower(id: string): TowerId | undefined {
  const towers: readonly string[] = LIVE_KNOWN_IDS.towers;
  const i = towers.indexOf(id);
  return i < 0 ? undefined : LIVE_KNOWN_IDS.towers[i];
}

/** An upgrade's first-rank price (dev saves pay for what they own). */
function price(id: keyof typeof UPGRADES): number {
  return UPGRADES[id].ranks[0]?.price ?? 0;
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
      'A1M2 won (Victory only) and its payout banked: A1M3 is next up.',
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
  after_a1m3: {
    description:
      'Act I through A1M3 on the reference profile: the intake done (lettuce), the Skyhook and the ' +
      'Zapcoil sample (once registered), the shop open with its Stardust banked. Maps not ' +
      'registered yet are skipped.',
    build: () => actOneThrough('a1_m03'),
  },
  after_a1m4: {
    description:
      'after_a1m3, then A1M4 bought and won: Head Start equipped, Rivet and Thumper tune 1.',
    build: () => actOneThrough('a1_m04'),
  },
  after_a1m5: {
    description:
      'after_a1m4, then Thumper specs, Reinforced Core 1, Sprinkler tune 1, and A1M5 won with the ' +
      'Quiet Wave spared (spared_quiet_wave = true): Act I complete.',
    build: () => actOneThrough('a1_m05'),
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
