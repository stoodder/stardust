// Development saves, loaded by the test-only `?save=<id>` hook (T209, with `?test=1`) so smoke
// tests and the owner can start partway through the campaign, or reach systems gated behind maps
// that don't exist yet. Each is built from the live registries, so it stays valid as content
// lands: `mid_m2` covers the first two campaign maps, the Act II saves (`after_a1m5_ref` on) win
// only the Act II maps already registered, and `all_unlocked` owns every registered tower, spec,
// and ability. devSaves.test.ts validates every one.
// `devUnlocks` opens gated systems whose maps don't exist yet (D031). It lives here, never in
// SaveData, so no save or import code can carry it, and the app honours it only under `?test=1`.
import { CAMPAIGN, type CampaignMapId } from '../../content/campaign.ts';
import { CODEX_IDS } from '../../content/codex/index.ts';
import { MAPS } from '../../content/maps/index.ts';
import { MEMO_IDS } from '../../content/memos/index.ts';
import { PROTOCOLS, UPGRADES } from '../../content/upgrades/index.ts';
import type { EnemyId, MapId, MedalId, ProtocolId, TowerId } from '../../content/types.ts';
import type { CallsignId } from '../../content/dialogue/profile.ts';
import { tagIndexAfter } from '../../story/tags.ts';
import { withIssuedTowers } from '../issued.ts';
import { isMapWon, type MetaSystem } from '../progress.ts';
import { META_SYSTEMS } from '../progress.ts';
import { buy, type PurchaseItem } from '../purchase.ts';
import { withFirstPaydayCaughtUp } from '../runEnd.ts';
import type { MapRecord, SaveData } from '../saveData.ts';
import { LIVE_KNOWN_IDS, createNewSave } from '../saveData.ts';
import { withStoryUnlocks } from '../story.ts';

export type DevSaveId =
  | 'fresh'
  | 'after_a1m1'
  | 'mid_m2'
  | 'after_a1m3'
  | 'after_a1m4'
  | 'after_a1m5'
  | 'after_a1m5_ref'
  | 'after_a2m1'
  | 'after_a2m2'
  | 'after_a2m3'
  | 'all_unlocked';

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
  return withFirstPaydayCaughtUp(withTowers); // A1M2's Results showed the first payday
}

/** The Act II maps the dev saves cover (M4), in campaign order. */
type ActTwoMap = 'a2_m01' | 'a2_m02' | 'a2_m03';

/**
 * What the reference profile buys before each Act II map (campaign.md § 4.9): the Lookout license
 * into A2M1; Sprinkler specs, Seed Money 1, and Zapcoil tune 1 into A2M2; Sprinkler tune 2 into
 * A2M3 (its rank 1 came before A1M5).
 */
const ACT_TWO_PREP: Readonly<Record<ActTwoMap, readonly PurchaseItem[]>> = {
  a2_m01: [{ kind: 'license', tower: 'lookout' }],
  a2_m02: [
    { kind: 'specs', tower: 'sprinkler' },
    { kind: 'upgrade', id: 'seed_money' },
    { kind: 'upgrade', id: 'tune_zapcoil' },
  ],
  a2_m03: [{ kind: 'upgrade', id: 'tune_sprinkler' }],
};

/**
 * `save` with `items` bought through the shop's own `buy`, in order. An item whose content hasn't
 * landed yet (an unregistered tower, or a tower with no tier-4 specs yet) is skipped; any other
 * refusal is a broken fixture and throws.
 */
function bought(save: SaveData, items: readonly PurchaseItem[]): SaveData {
  let next = save;
  for (const item of items) {
    const r = buy(next, item);
    if (r.ok) next = r.save;
    else if (r.reason !== 'unknown' && r.reason !== 'no_specs') {
      throw new Error(`dev save: can't buy ${JSON.stringify(item)} (${r.reason}): ${r.message}`);
    }
  }
  return next;
}

/**
 * The callsign the story has given by the furthest map won (campaign.md § 4.6): Thorn at A2M2's
 * debrief, then Waykeeper at A3M6's.
 */
function callsignFor(save: SaveData): CallsignId {
  if (isMapWon(save, 'a3_m06')) return 'waykeeper';
  return isMapWon(save, 'a2_m02') ? 'thorn' : 'sprout';
}

/** Bricks's tag index after every map `save` has won (story/tags.ts `tagIndexAfter`). */
function tagIndexFor(save: SaveData): number {
  return CAMPAIGN.reduce((i, map) => (isMapWon(save, map) ? tagIndexAfter(map, i) : i), 0);
}

/**
 * `save`'s story caught up the way entering the base would (meta/story.ts): the memos due
 * delivered with their gifts and the codex versions unlocked; every memo but the newest read.
 */
function caughtUp(save: SaveData): SaveData {
  const next = withStoryUnlocks(save).save;
  next.story.memosRead = next.story.memosDelivered.slice(0, -1);
  return next;
}

/**
 * The reference profile through `last` (campaign.md § 4.9): Act I through A1M5 with the weaker C1
 * branch (the Quiet Wave cleared), the Lookout license bought for A2M1 (once registered), then
 * each Act II map up to `last` prepared for and won with Victory, its first-clear Stardust and
 * Intel banked. An Act II map that isn't registered yet is skipped, its purchases with it, so the
 * save stays valid while A2M1–A2M3 land (`last` null: into A2M1, nothing of Act II won). The
 * story follows the wins: Biscuit's tag (A2M1), Thorn (A2M2's debrief), Auntie Funmi's tag and
 * `held_fire_second_look` cleared (A2M3, the weaker branch).
 */
function actTwoThrough(last: ActTwoMap | null): SaveData {
  let save = actOneThrough('a1_m05');
  save.story.flags.spared_quiet_wave = false;
  save = bought(save, ACT_TWO_PREP.a2_m01);
  const order: readonly ActTwoMap[] = ['a2_m01', 'a2_m02', 'a2_m03'];
  const played = last === null ? [] : order.slice(0, order.indexOf(last) + 1);
  for (const step of played) {
    // Widened, so the registered check narrows to MapId while the Act II maps aren't in it yet.
    const map: string = step;
    if (!isRegistered(map)) continue;
    if (step !== 'a2_m01') save = bought(save, ACT_TWO_PREP[step]); // A2M1's is bought above
    save.campaign.maps[map] = won(map, medalIds(map).slice(0, 1));
    save.currencies.intel += 1;
    save.currencies.stardust += MAPS[map].stardust;
    for (const e of mapEnemies(map)) {
      if (!save.campaign.seenEnemies.includes(e)) save.campaign.seenEnemies.push(e);
    }
    save.stats = { pestsProcessed: save.stats.pestsProcessed + 300, runs: save.stats.runs + 2 };
    if (step === 'a2_m03') save.story.flags.held_fire_second_look = false;
  }
  save.story.bricksTagIndex = tagIndexFor(save);
  if (save.profile !== null) save.profile = { ...save.profile, callsign: callsignFor(save) };
  return caughtUp(save);
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
      return withFirstPaydayCaughtUp(save); // A1M2's Results showed the first payday
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
  after_a1m5_ref: {
    description:
      'The reference profile into A2M1 (campaign.md § 4.9): Act I complete with the Quiet Wave ' +
      'cleared (spared_quiet_wave = false), then the Lookout license bought (once registered).',
    build: () => actTwoThrough(null),
  },
  after_a2m1: {
    description:
      'after_a1m5_ref, then A2M1 won (Victory) with its payout banked: Biscuit tagged. Skipped ' +
      'while A2M1 is not registered.',
    build: () => actTwoThrough('a2_m01'),
  },
  after_a2m2: {
    description:
      'after_a2m1, then Sprinkler specs, Seed Money 1, and Zapcoil tune 1 bought and A2M2 won: ' +
      'the callsign Thorn. Skipped while A2M2 is not registered.',
    build: () => actTwoThrough('a2_m02'),
  },
  after_a2m3: {
    description:
      'after_a2m2, then Sprinkler tune 2 bought and A2M3 won with held_fire_second_look cleared: ' +
      'Auntie Funmi tagged. Skipped while A2M3 is not registered.',
    build: () => actTwoThrough('a2_m03'),
  },
  all_unlocked: {
    description:
      'Every campaign map won with every medal; every registered tower, spec, ability, protocol, ' +
      'and upgrade (at its top rank) owned; deep pockets for the shop and R&D; every gated ' +
      'system open; the intake done and the story caught up to the wins (memos all read).',
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
      // The story as far as the wins go: the intake done, the callsign and tags they gave, and
      // every memo due delivered and read (so no NEW badge pulls the base to the Inbox).
      save.profile = { ...DEV_PROFILE, callsign: callsignFor(save) };
      save.story.flags = { arrival_reason: 'lettuce' };
      save.story.bricksTagIndex = tagIndexFor(save);
      const story = withStoryUnlocks(save).save;
      story.story.memosRead = [...story.story.memosDelivered];
      return withFirstPaydayCaughtUp(story);
    },
  },
};
