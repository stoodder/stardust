// Development saves, loaded by the test-only `?save=<id>` hook (T209, with `?test=1`) so smoke
// tests and the owner can start partway through the campaign, or reach systems gated behind maps
// that don't exist yet. Each is built from the live registries, so it stays valid as content
// lands: `mid_m2` covers the first two campaign maps, the Act II saves (`after_a1m5_ref` on) win
// only the Act II maps already registered, and `all_unlocked` owns every registered tower, every
// spec unlock for specs already built, and every ability. devSaves.test.ts validates every one.
// `devUnlocks` opens gated systems whose maps don't exist yet (D031). It lives here, never in
// SaveData, so no save or import code can carry it, and the app honours it only under `?test=1`.
import { CAMPAIGN, type CampaignMap, type CampaignMapId } from '../../content/campaign.ts';
import { CODEX_IDS } from '../../content/codex/index.ts';
import { MAPS } from '../../content/maps/index.ts';
import { MEMO_IDS } from '../../content/memos/index.ts';
import { STAR_MAP_SEEN_ID } from '../../content/starMap.ts';
import { PROTOCOLS, UPGRADES } from '../../content/upgrades/index.ts';
import type { EnemyId, MedalId, ProtocolId, TowerId } from '../../content/types.ts';
import type { CallsignId } from '../../content/dialogue/profile.ts';
import { tagIndexAfter } from '../../story/tags.ts';
import { withIssuedTowers } from '../issued.ts';
import { LIVE_SPEC_NAMES } from '../loadout.ts';
import { isMapWon, type MetaSystem } from '../progress.ts';
import { META_SYSTEMS } from '../progress.ts';
import { buy, type PurchaseItem } from '../purchase.ts';
import { withFirstPaydayCaughtUp } from '../runEnd.ts';
import type { MapRecord, SaveData, SceneId } from '../saveData.ts';
import { LIVE_KNOWN_IDS, createNewSave } from '../saveData.ts';
import { withStoryUnlocks } from '../story.ts';
import {
  briefingGifts,
  buyJailbreak,
  grantGift,
  grantQ3Bonus,
  openCrate,
  resolveC2,
  resolveC4,
  resolveC5,
  runEndRevocations,
  runEndTransactions,
  setDoorChoice,
  type C3Choice,
  type C4Choice,
  type C5Choice,
  type StoryOutcome,
} from '../storyTransactions.ts';

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
  | 'after_a2m3_ref'
  | 'after_a2m4_returned'
  | 'after_a2m4_sold'
  | 'after_a2m4_unanswered'
  | 'after_a2m5'
  | 'after_a2m6'
  | 'after_a3m1_spared'
  | 'after_a3m1_cleared'
  | 'after_a3m2_rivet'
  | 'after_a3m2_thumper'
  | 'after_a3m3_convoy'
  | 'after_a3m3_warren'
  | 'after_a3m4_keep'
  | 'after_a3m4_purge'
  | 'after_a3m4_rewrite'
  | 'after_a3m4_keep_warren'
  | 'after_a3m4_purge_warren'
  | 'after_a3m4_rewrite_warren'
  | 'after_a3m5_keep'
  | 'after_a3m5_purge'
  | 'after_a3m5_rewrite'
  | 'after_a3m6'
  | 'after_a3m6_keep'
  | 'after_a3m6_purge'
  | 'after_a3m6_rewrite'
  | 'after_a3m6_weakest'
  | 'after_a3m6_strongest'
  | 'after_fin_stay'
  | 'after_fin_go'
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
function medalIds(map: CampaignMap): MedalId[] {
  const def: { readonly medals?: { readonly challenge: { readonly id: MedalId } } } = MAPS[map];
  return ['victory', 'perfect_core', def.medals?.challenge.id ?? 'challenge'];
}

function won(map: CampaignMap, medals: MedalId[]): MapRecord {
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

function isRegistered(id: string): id is CampaignMap {
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
    // Before A1M4: Head Start equipped, Rivet and Thumper tune 1 (campaign.md § 4.9). Bought at
    // Zibzab's, so the base has opened with his shop and his arrival has played.
    withTowers.story.seen.push(ARRIVAL_SCENE_ID);
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

/** The Act II maps the dev saves cover, in campaign order. */
const ACT_TWO = ['a2_m01', 'a2_m02', 'a2_m03', 'a2_m04', 'a2_m05', 'a2_m06'] as const;
type ActTwoMap = (typeof ACT_TWO)[number];

/**
 * What the reference profile buys before each Act II map (campaign.md § 4.9): the Lookout license
 * into A2M1; Sprinkler specs, Seed Money 1, and Zapcoil tune 1 into A2M2; Sprinkler tune 2 into
 * A2M3 (its rank 1 came before A1M5); Zapcoil specs and the Zapcoil and Rivet tune 2 into A2M4;
 * nothing into A2M5 (C2 Return emptied the bank); Reinforced Core 2 into A2M6.
 */
const ACT_TWO_PREP: Readonly<Record<ActTwoMap, readonly PurchaseItem[]>> = {
  a2_m01: [{ kind: 'license', tower: 'lookout' }],
  a2_m02: [
    { kind: 'specs', tower: 'sprinkler' },
    { kind: 'upgrade', id: 'seed_money' },
    { kind: 'upgrade', id: 'tune_zapcoil' },
  ],
  a2_m03: [{ kind: 'upgrade', id: 'tune_sprinkler' }],
  a2_m04: [
    { kind: 'specs', tower: 'zapcoil' },
    { kind: 'upgrade', id: 'tune_zapcoil' },
    { kind: 'upgrade', id: 'tune_rivet' },
  ],
  a2_m05: [],
  a2_m06: [{ kind: 'upgrade', id: 'reinforced_core' }],
};

/** C2's branch a dev save takes on A2M4's Results (the reference takes Return). */
type C2Branch = 'returned' | 'sold';

/**
 * A2M4's Results as the story transactions leave them (meta/storyTransactions.ts): the Q3 Bonus
 * paid and recorded (run end's step 6), then C2 for the whole bank (`resolveC2`: Return empties
 * it; Sell empties it for the Intel windfall and the Zibzab Tune-up), `stardust_choice` recording
 * the branch.
 */
export function afterA2M4Results(save: SaveData, c2: C2Branch): SaveData {
  return resolveC2(grantQ3Bonus(save).save, c2).save;
}

/** A2M5's debrief gift (act2.md § A2M5: Ves'thara gives the Prism Spire; `grantGift`). */
export function afterA2M5Results(save: SaveData): SaveData {
  const prism = knownTower('prism');
  return prism === undefined ? save : grantGift(save, prism).save;
}

/**
 * `save` with `items` bought through the shop's own `buy`, in order. An item whose content hasn't
 * landed yet (a tower not registered or still behind its stub gate, so not on the shelf; a tower
 * with no tier-4 specs yet) is skipped; any other refusal is a broken fixture and throws.
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

/** How far an Act II dev save goes. */
interface ActTwoPlan {
  /** Buy the next map's reference purchases too (the `_ref` saves: into that map). */
  readonly prepNext?: boolean;
  /**
   * C2's branch on A2M4's Results (default Return, the reference's); `unanswered`: the tab closed
   * on the card (the Q3 Bonus paid, C2 not made, the base not entered since).
   */
  readonly c2?: C2Branch | 'unanswered';
}

/**
 * The reference profile through `last` (campaign.md § 4.9): Act I through A1M5 with the weaker C1
 * branch (the Quiet Wave cleared), then each Act II map up to `last` prepared for (its purchases
 * bought through the shop's `buy`) and won with Victory, its first-clear Stardust and Intel
 * banked; with `prepNext`, the next map's purchases too (`last` null: into A2M1). An Act II map
 * that isn't registered yet is skipped with its purchases (the next map's prep is still bought),
 * so the save stays valid while A2M4–A2M6 land. The story follows the wins: Biscuit's tag
 * (A2M1), Thorn (A2M2's debrief), Auntie Funmi's tag and `held_fire_second_look` cleared (A2M3,
 * the weaker branch), the Q3 Bonus and C2 (A2M4, Return unless `c2` says Sell), and the Prism
 * Spire (A2M5).
 */
function actTwoThrough(last: ActTwoMap | null, plan: ActTwoPlan = {}): SaveData {
  let save = actOneThrough('a1_m05');
  save.story.flags.spared_quiet_wave = false;
  const played = last === null ? [] : ACT_TWO.slice(0, ACT_TWO.indexOf(last) + 1);
  for (const step of played) {
    // Widened, so the registered check narrows to MapId while the Act II maps aren't in it yet.
    const map: string = step;
    if (!isRegistered(map)) continue;
    save = bought(save, ACT_TWO_PREP[step]);
    save.campaign.maps[map] = won(map, medalIds(map).slice(0, 1));
    save.currencies.intel += 1;
    save.currencies.stardust += MAPS[map].stardust;
    for (const e of mapEnemies(map)) {
      if (!save.campaign.seenEnemies.includes(e)) save.campaign.seenEnemies.push(e);
    }
    save.stats = { pestsProcessed: save.stats.pestsProcessed + 300, runs: save.stats.runs + 2 };
    if (step === 'a2_m03') save.story.flags.held_fire_second_look = false;
    const c2 = plan.c2 ?? 'returned';
    if (step === 'a2_m04' && c2 === 'unanswered') {
      save = grantQ3Bonus(save).save;
    } else if (step === 'a2_m04' && c2 !== 'unanswered') {
      save = afterA2M4Results(save, c2);
      // Won A2M4, the player has seen the truth scene (Act II's jingle turns minor on it) and,
      // having entered the base since, Bricks's handover (app/baseScenes.ts HANDOVER_SCENE).
      save.story.seen.push(...A2M4_SEEN.filter((id) => !save.story.seen.includes(id)));
    }
    if (step === 'a2_m05') save = afterA2M5Results(save);
    // Won Sundown and back at the base since: its two visit scenes (app/baseScenes.ts).
    if (step === 'a2_m06') {
      save.story.seen.push(...A2M6_SEEN.filter((id) => !save.story.seen.includes(id)));
    }
  }
  const next = ACT_TWO[played.length];
  if (plan.prepNext === true && next !== undefined) save = bought(save, ACT_TWO_PREP[next]);
  // A save that has played Act II has opened the star map (its first-visit sweep is spent).
  if (played.some((m) => isRegistered(m)) && !save.story.seen.includes(STAR_MAP_SEEN_ID)) {
    save.story.seen.push(STAR_MAP_SEEN_ID);
  }
  save.story.bricksTagIndex = tagIndexFor(save);
  if (save.profile !== null) save.profile = { ...save.profile, callsign: callsignFor(save) };
  return caughtUp(save);
}

/** The Act III maps the dev saves cover (A3M1–A3M6), in campaign order. */
const ACT_THREE = ['a3_m01', 'a3_m02', 'a3_m03', 'a3_m04', 'a3_m05', 'a3_m06'] as const;
type ActThreeMap = (typeof ACT_THREE)[number];

/**
 * What the reference profile buys before each Act III map (campaign.md § 4.9): Ability Coolant 1
 * and Emergency Bulkhead into A3M1; the Harpoon's license and the Mindspike's attunement (3 Intel)
 * into A3M2; Seed Money 2 into A3M3 (its rank 1 came before A2M2); nothing on a shelf into A3M4
 * (the jailbreak is a story transaction: `actThreeThrough`); the Stasis Bloom's attunement and
 * Mindspike tune 1 into A3M5; Harpoon tune 1–2 into A3M6.
 */
const ACT_THREE_PREP: Readonly<Record<ActThreeMap, readonly PurchaseItem[]>> = {
  a3_m01: [
    { kind: 'upgrade', id: 'ability_coolant' },
    { kind: 'protocol', id: 'emergency_bulkhead' },
  ],
  a3_m02: [
    { kind: 'license', tower: 'harpoon' },
    { kind: 'attune', tower: 'mindspike' },
  ],
  a3_m03: [{ kind: 'upgrade', id: 'seed_money' }],
  a3_m04: [],
  a3_m05: [
    { kind: 'attune', tower: 'bloom' },
    { kind: 'upgrade', id: 'tune_mindspike' },
  ],
  a3_m06: [
    { kind: 'upgrade', id: 'tune_harpoon' },
    { kind: 'upgrade', id: 'tune_harpoon' },
  ],
};

/**
 * The protocol the reference equips on each Act III map (one slot; reference.ts): Head Start on
 * A3M1's Escort and from A3M3 on (A3M3's Holdout benches the Bulkhead, and the player carries Head
 * Start on: T771, T874), the Bulkhead on A3M2's Defend.
 */
const ACT_THREE_PROTOCOL: Readonly<Record<ActThreeMap, ProtocolId>> = {
  a3_m01: 'head_start',
  a3_m02: 'emergency_bulkhead',
  a3_m03: 'head_start',
  a3_m04: 'head_start',
  a3_m05: 'head_start',
  a3_m06: 'head_start',
};

/**
 * The scenes a save that won each Act III map has seen, the base entered since: A3M1's Leaving
 * Song and Bricks's survey confession (a base visit scene, so smoke flows entering the base aren't
 * held by it); A3M2's Clean Exit and the Asset Yield Log; A3M3's briefing (C3) and the SEAL.
 */
const ACT_THREE_SEEN: Readonly<Record<ActThreeMap, readonly SceneId[]>> = {
  a3_m01: ['a3_m01_scene_song', 'a3_m01_base_survey'],
  a3_m02: ['a3_m02_cue_revoke', 'a3_m02_scene_confession'],
  a3_m03: ['a3_m03_brief', 'a3_m03_cue_seal'],
  // Gerald's mail, then Night Shift at the base (the visit scene, D146: mandatory once).
  a3_m04: ['a3_m04_scene_mail', 'a3_m04_base_night_shift'],
  a3_m05: [],
  // The briefing (QUILL's list under Rewrite, the crate) has played.
  a3_m06: ['a3_m06_brief'],
};

/** Act III's base visit scenes (`ACT_THREE_SEEN`'s `base_*`): seen by a save that has won every map. */
const ACT_THREE_BASE_SEEN: readonly SceneId[] = Object.values(ACT_THREE_SEEN)
  .flat()
  .filter((id) => id.includes('_base_'));

/** An Act III dev save's branches (campaign.md § 6: C1's echo, the revoked class, C3). */
interface ActThreePlan {
  /** C1 as A3M1 reads it: `spared` gives Thrum's group and the Hum Choir at A3M1's debrief. */
  readonly c1: 'spared' | 'cleared';
  /** The Everglow class A3M2's Clean Exit took (the reference's par loses the Rivet). */
  readonly revoked: 'rivet' | 'thumper';
  /** C3, the door Bricks held. */
  readonly door: C3Choice;
  /** C4, QUILL's directives, answered on A3M4's card (needed once a plan reaches A3M4). */
  readonly c4?: C4Choice;
  /** C2's branch on A2M4's card (default Return, the reference's). */
  readonly c2?: C2Branch;
}

/** `r`'s save; a refusal is a broken fixture and throws. */
function made(r: StoryOutcome): SaveData {
  if (r.ok) return r.save;
  throw new Error(`dev save: ${r.reason}: ${r.message}`);
}

/**
 * The reference profile through `last` in Act III: `after_a2m6`, then each Act III map prepared for
 * (its § 4.9 purchases through the shop's `buy`) and won with Victory, the story transactions as
 * the app makes them: A3M1's briefing gift (the Scuttle Den) and its debrief's Hum Choir if
 * spared; A3M2's revocation of `revoked` and the uplink (Mk II refunded if owned) at run end's
 * step 3; C3 committed in A3M3's briefing. C1 is the plan's: `spared` flips the reference's
 * cleared branch. A map not registered yet is skipped with its purchases, so until A3M1–A3M3
 * land the saves equal `after_a2m6` (with the plan's C1).
 */
function actThreeThrough(last: ActThreeMap, plan: ActThreePlan): SaveData {
  let save = actTwoThrough('a2_m06', plan.c2 === undefined ? {} : { c2: plan.c2 });
  save.story.flags.spared_quiet_wave = plan.c1 === 'spared';
  for (const step of ACT_THREE.slice(0, ACT_THREE.indexOf(last) + 1)) {
    const map: string = step;
    if (!isRegistered(map)) continue;
    // The base before A3M4: the jailbreak (free under the convoy).
    if (step === 'a3_m04') save = made(buyJailbreak(save));
    save = bought(save, ACT_THREE_PREP[step]);
    save.loadouts.protocols = [ACT_THREE_PROTOCOL[step]];
    // The briefing: its gifts as the loadout first opens; C3 committed as it closes; the crate
    // opened as A3M6's closes.
    save = briefingGifts(save, step).save;
    if (step === 'a3_m03') save = setDoorChoice(save, plan.door).save;
    if (step === 'a3_m06') save = made(openCrate(save));
    save.campaign.maps[map] = won(map, medalIds(map).slice(0, 1));
    save.currencies.intel += 1;
    save.currencies.stardust += MAPS[map].stardust;
    for (const e of mapEnemies(map)) {
      if (!save.campaign.seenEnemies.includes(e)) save.campaign.seenEnemies.push(e);
    }
    save.stats = { pestsProcessed: save.stats.pestsProcessed, runs: save.stats.runs + 2 };
    // Run end's step 3, then step 6 (meta/runEnd.ts order).
    if (step === 'a3_m02') {
      const revoked = { towers: [plan.revoked], abilities: ['orbital_strike'] } as const;
      save = runEndRevocations(save, { won: true, wonBefore: false, revoked }).save;
    }
    save = runEndTransactions(save, { mapId: map, won: true, wonBefore: false }).save;
    // A3M4: Gerald's mail granted Suppressing Fire at step 6 (above); then C4 on the card.
    if (step === 'a3_m04') {
      const c4 = plan.c4;
      if (c4 === undefined) throw new Error('dev save: a plan through A3M4 needs its C4');
      save = made(resolveC4(save, c4));
    }
    // The {name} turret (A3M3's last tag): the par build's Scuttle Den at the choke.
    if (step === 'a3_m03') save.story.memorialTower = knownTower('burrow') ?? null;
    save.story.seen.push(...ACT_THREE_SEEN[step].filter((id) => !save.story.seen.includes(id)));
  }
  save.story.bricksTagIndex = tagIndexFor(save);
  // Waykeeper from A3M6's debrief (`callsignFor`); Thorn before it.
  if (save.profile !== null) save.profile = { ...save.profile, callsign: callsignFor(save) };
  return caughtUp(save);
}

/** A2M4's scenes a save that won it has seen: the truth scene and the base's handover. */
const A2M4_SEEN: readonly SceneId[] = ['a2_m04_scene_truth', 'a2_m04_base_handover'];

/** A2M6's base visit scenes a save that won it has seen: QUILL's loophole and the whistle. */
const A2M6_SEEN: readonly SceneId[] = ['a2_m06_base_loophole', 'a2_m06_base_whistle'];

/** Zibzab's arrival at the base (app/baseScenes.ts `ARRIVAL_SCENE`; the first base visit with his shop). */
const ARRIVAL_SCENE_ID: SceneId = 'a1_m03_base_arrival';

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

/** The reference's Act III branches: C1 cleared, the Rivet revoked, the convoy. */
const A3_REF = { c1: 'cleared', revoked: 'rivet', door: 'convoy' } as const;

/** The `after_a3m4_<c4>` save for `door` (`_warren` saves take the warren). */
function a3m4Save(door: C3Choice, c4: C4Choice): DevSave {
  const jailbreak = door === 'convoy' ? "free: Goldie's engineers" : '300 Stardust';
  const gloop = door === 'warren' ? ", and the warren's Gloop Spitter" : '';
  return {
    description:
      `after_a3m3_${door}, then the jailbreak (${jailbreak}) and A3M4 won (Victory): System ` +
      `Reboot and the Hum Choir given in its briefing${gloop}; Gerald's mail (Suppressing Fire ` +
      `inherited), C4 ${c4}, and Night Shift seen. Skipped while A3M4 is not registered.`,
    build: () => actThreeThrough('a3_m04', { ...A3_REF, door, c4 }),
  };
}

/** What the reference buys before the finale (campaign.md § 4.9): the Mindspike's specs. */
const FIN_PREP: readonly PurchaseItem[] = [{ kind: 'specs', tower: 'mindspike' }];

/**
 * The finale's scenes a save that won it has seen: the briefing and Dawn (C5's scene is added with
 * its answer).
 */
const FIN_SEEN: readonly SceneId[] = ['fin_m01_brief', 'fin_m01_scene_dawn'];

/**
 * `plan` through A3M6, then (once FIN is registered; until then the save equals A3M6's) the
 * finale prepared for (its § 4.9 purchase) and won with Victory, Head Start on: its briefing
 * gifts, run end's transactions, Dawn seen, then C5 answered `c5` on the way out (`resolveC5`)
 * and its scene seen.
 */
function finaleThrough(plan: ActThreePlan, c5: C5Choice): SaveData {
  let save = actThreeThrough('a3_m06', plan);
  // Widened, so the registered check narrows to MapId while the finale isn't in it yet.
  const map: string = 'fin_m01';
  if (!isRegistered(map)) return save;
  save = bought(save, FIN_PREP);
  save.loadouts.protocols = ['head_start'];
  save = briefingGifts(save, map).save;
  save.campaign.maps[map] = won(map, medalIds(map).slice(0, 1));
  save.currencies.intel += 1;
  save.currencies.stardust += MAPS[map].stardust;
  for (const e of mapEnemies(map)) {
    if (!save.campaign.seenEnemies.includes(e)) save.campaign.seenEnemies.push(e);
  }
  save.stats = { pestsProcessed: save.stats.pestsProcessed, runs: save.stats.runs + 2 };
  save = runEndTransactions(save, { mapId: map, won: true, wonBefore: false }).save;
  save.story.seen.push(...FIN_SEEN.filter((id) => !save.story.seen.includes(id)));
  save = made(resolveC5(save, c5));
  save.story.seen.push('fin_m01_scene_c5');
  save.story.bricksTagIndex = tagIndexFor(save);
  return caughtUp(save);
}

/** The `after_a3m6_<c4>` save: the reference (C1 cleared, Return, the convoy) with that C4. */
function a3m6Save(c4: C4Choice): DevSave {
  return {
    description:
      `after_a3m5_${c4}, then Harpoon tune 2 and A3M6 won (Victory), and the Mindspike specs ` +
      `bought for the finale (FIN's reference row; T821): the reference into the finale with C4 ` +
      `${c4} (Phase 2's ${c4 === 'keep' ? 'Directive 0' : c4 === 'rewrite' ? 'log' : 'silence'}). ` +
      'Skipped while A3M6 is not registered.',
    build: () => {
      const save = actThreeThrough('a3_m06', { ...A3_REF, c4 });
      const fin: string = 'fin_m01'; // widened, as finaleThrough's
      return isRegistered(fin) && isRegistered('a3_m06') ? bought(save, FIN_PREP) : save;
    },
  };
}

/** The `after_fin_<c5>` save. */
function finSave(c5: C5Choice): DevSave {
  return {
    description:
      `after_a3m6_rewrite, then the Mindspike specs bought and the finale won (Victory): Dawn ` +
      `seen, C5 answered ${c5} (ending_choice = ${c5}); the post-game. Skipped while the finale ` +
      'is not registered.',
    build: () => finaleThrough({ ...A3_REF, c4: 'rewrite' }, c5),
  };
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
      'cleared (spared_quiet_wave = false), then the Lookout license bought (once stocked).',
    build: () => actTwoThrough(null, { prepNext: true }),
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
  after_a2m3_ref: {
    description:
      'The reference profile into A2M4 (campaign.md § 4.9): after_a2m3, then Zapcoil specs and ' +
      'the Zapcoil and Rivet tune 2 bought.',
    build: () => actTwoThrough('a2_m03', { prepNext: true }),
  },
  after_a2m4_returned: {
    description:
      'after_a2m3_ref, then A2M4 won (Victory) with the Q3 Bonus paid and C2 taken as Return ' +
      '(stardust_choice = returned, the bank 0): the reference. Skipped while A2M4 is not ' +
      'registered.',
    build: () => actTwoThrough('a2_m04'),
  },
  after_a2m4_sold: {
    description:
      'after_a2m3_ref, then A2M4 won (Victory) with the Q3 Bonus paid and C2 taken as Sell ' +
      '(stardust_choice = sold, the bank 0, the Intel windfall, the Zibzab Tune-up). Skipped ' +
      'while A2M4 is not registered.',
    build: () => actTwoThrough('a2_m04', { c2: 'sold' }),
  },
  after_a2m4_unanswered: {
    description:
      'after_a2m3, then A2M4 won (Victory) with the Q3 Bonus paid and the tab closed on its ' +
      'card: C2 never answered (stardust_choice unset, the bank whole), the base not entered ' +
      'since (no handover). The base offers C2 (D138). Skipped while A2M4 is not registered.',
    build: () => actTwoThrough('a2_m04', { c2: 'unanswered' }),
  },
  after_a2m5: {
    description:
      'after_a2m4_returned, then A2M5 won (Victory): the Prism Spire given ' +
      'and Xenotech open. Skipped while A2M5 is not registered.',
    build: () => actTwoThrough('a2_m05'),
  },
  after_a2m6: {
    description:
      'after_a2m5, then Reinforced Core 2 bought and A2M6 won (Victory): Act II complete. ' +
      'Skipped while A2M6 is not registered.',
    build: () => actTwoThrough('a2_m06'),
  },
  after_a3m1_spared: {
    description:
      'after_a2m6 with the Quiet Wave spared, then Ability Coolant 1 and Emergency Bulkhead bought ' +
      'and A3M1 won (Victory): the Scuttle Den given in its briefing, Thrum alive and the Hum ' +
      'Choir given at its debrief; the Leaving Song and the survey confession seen. Skipped ' +
      'while A3M1 is not registered.',
    build: () => actThreeThrough('a3_m01', { c1: 'spared', revoked: 'rivet', door: 'convoy' }),
  },
  after_a3m1_cleared: {
    description:
      'The reference into A3M2: after_a2m6 (the Quiet Wave cleared), then A3M1 bought for and won ' +
      '(Victory): the Scuttle Den given, no Hum Choir (it comes in A3M4). Skipped while A3M1 is ' +
      'not registered.',
    build: () => actThreeThrough('a3_m01', { c1: 'cleared', revoked: 'rivet', door: 'convoy' }),
  },
  after_a3m2_rivet: {
    description:
      'after_a3m1_cleared, then the Harpoon licensed, the Mindspike attuned, and A3M2 won ' +
      '(Victory): the Clean Exit took the Rivet and Orbital Strike (the reference).',
    build: () => actThreeThrough('a3_m02', { c1: 'cleared', revoked: 'rivet', door: 'convoy' }),
  },
  after_a3m2_thumper: {
    description: 'after_a3m2_rivet, but the Clean Exit took the Thumper (and Orbital Strike).',
    build: () => actThreeThrough('a3_m02', { c1: 'cleared', revoked: 'thumper', door: 'convoy' }),
  },
  after_a3m3_convoy: {
    description:
      'after_a3m2_rivet, then Seed Money 2 bought and A3M3 held (Victory) with C3 the convoy ' +
      "(door_choice = convoy): Bricks's {name} turret a Scuttle Den. Skipped while A3M3 is not " +
      'registered.',
    build: () => actThreeThrough('a3_m03', { c1: 'cleared', revoked: 'rivet', door: 'convoy' }),
  },
  after_a3m3_warren: {
    description:
      'after_a3m3_convoy, but C3 the warren (door_choice = warren). Skipped while A3M3 is not ' +
      'registered.',
    build: () => actThreeThrough('a3_m03', { c1: 'cleared', revoked: 'rivet', door: 'warren' }),
  },
  // A3M4–A3M6 (T700b): until each map is registered it is skipped with its prep, so these equal
  // the save before it.
  after_a3m4_keep: a3m4Save('convoy', 'keep'),
  after_a3m4_purge: a3m4Save('convoy', 'purge'),
  after_a3m4_rewrite: a3m4Save('convoy', 'rewrite'),
  after_a3m4_keep_warren: a3m4Save('warren', 'keep'),
  after_a3m4_purge_warren: a3m4Save('warren', 'purge'),
  after_a3m4_rewrite_warren: a3m4Save('warren', 'rewrite'),
  after_a3m5_keep: {
    description:
      'after_a3m4_keep, then the Stasis Bloom attuned and Mindspike tune 1 bought and A3M5 won ' +
      '(Victory): the Sproing Pad given in its briefing. Skipped while A3M5 is not registered.',
    build: () => actThreeThrough('a3_m05', { ...A3_REF, c4: 'keep' }),
  },
  after_a3m5_purge: {
    description: 'after_a3m5_keep, but C4 Purge (no Time Dilation).',
    build: () => actThreeThrough('a3_m05', { ...A3_REF, c4: 'purge' }),
  },
  after_a3m5_rewrite: {
    description: 'after_a3m5_keep, but C4 Rewrite (QUILL was offline for A3M5).',
    build: () => actThreeThrough('a3_m05', { ...A3_REF, c4: 'rewrite' }),
  },
  after_a3m6: {
    description:
      "after_a3m5_rewrite, then Harpoon tune 2 bought and A3M6 won (Victory): Goldie's Gloop " +
      "Spitter given, Zibzab's crate opened (every owned Vrell tower's tune-ups at the top), the " +
      'callsign Waykeeper. Skipped while A3M6 is not registered.',
    build: () => actThreeThrough('a3_m06', { ...A3_REF, c4: 'rewrite' }),
  },
  // Into the finale (T800b): every C4 answer, and the choir's two extremes (reference.ts
  // FIN_CHOIR_CELLS). Until A3M6 is registered each equals the save before it.
  after_a3m6_keep: a3m6Save('keep'),
  after_a3m6_purge: a3m6Save('purge'),
  after_a3m6_rewrite: a3m6Save('rewrite'),
  after_a3m6_weakest: {
    description:
      'The weakest choir into the finale: the Quiet Wave cleared, C2 Sell (no Returned), the ' +
      'convoy, C4 Purge; A3M6 won (Victory).',
    build: () =>
      actThreeThrough('a3_m06', {
        c1: 'cleared',
        revoked: 'rivet',
        door: 'convoy',
        c4: 'purge',
        c2: 'sold',
      }),
  },
  after_a3m6_strongest: {
    description:
      'The strongest choir into the finale: the Quiet Wave spared (Thrum walks beside Pebble), C2 ' +
      'Return (the Returned), the warren, C4 Rewrite; A3M6 won (Victory).',
    build: () =>
      actThreeThrough('a3_m06', {
        c1: 'spared',
        revoked: 'rivet',
        door: 'warren',
        c4: 'rewrite',
        c2: 'returned',
      }),
  },
  after_fin_stay: finSave('stay'),
  after_fin_go: finSave('go'),
  all_unlocked: {
    description:
      'Every campaign map won with every medal; every registered tower, built spec, ability, protocol, ' +
      'and upgrade (at its top rank) owned; deep pockets for the shop and R&D; every gated ' +
      'system open; the intake done and the story caught up to the wins (memos all read).',
    devUnlocks: META_SYSTEMS,
    build: () => {
      const save = createNewSave();
      for (const map of CAMPAIGN) save.campaign.maps[map] = won(map, medalIds(map));
      // The registries' ids, typed back from the known-id sets.
      const towers = [...LIVE_KNOWN_IDS.towers] as SaveData['unlocks']['towers'];
      save.unlocks.towers = towers;
      // Every spec unlock Engineering can sell: towers whose specs ship later have none (T319).
      save.unlocks.specs = towers.filter((t) => LIVE_SPEC_NAMES(t, 'a') !== null);
      save.unlocks.abilities = [...LIVE_KNOWN_IDS.abilities] as SaveData['unlocks']['abilities'];
      save.unlocks.protocols = [...LIVE_KNOWN_IDS.protocols];
      for (const u of Object.values(UPGRADES)) save.upgrades[u.id] = u.ranks.length;
      save.currencies = { stardust: 99_999, intel: 999 };
      save.stats = { pestsProcessed: 9_999, runs: 40 };
      // The story as far as the wins go: the intake done, the callsign and tags they gave, and
      // every memo due delivered and read (so no NEW badge pulls the base to the Inbox).
      save.profile = { ...DEV_PROFILE, callsign: callsignFor(save) };
      // C4 answered (Keep, QUILL as it was), so the base never stops on A3M4's card (D146); and,
      // once the finale is a map it has won, C5 (Stay), so it is in the post-game.
      save.story.flags = {
        arrival_reason: 'lettuce',
        quill_choice: 'keep',
        ...(isRegistered('fin_m01') ? { ending_choice: 'stay' as const } : {}),
      };
      save.story.bricksTagIndex = tagIndexFor(save);
      const story = withStoryUnlocks(save).save;
      story.story.memosRead = [...story.story.memosDelivered];
      // Every campaign map won: the star map has been opened (its sweep spent), and the base with
      // Zibzab's shop (his arrival played), A2M4's and A2M6's scenes, and Act III's visit scenes.
      story.story.seen.push(
        STAR_MAP_SEEN_ID,
        ARRIVAL_SCENE_ID,
        ...A2M4_SEEN,
        ...A2M6_SEEN,
        ...ACT_THREE_BASE_SEEN,
      );
      return withFirstPaydayCaughtUp(story);
    },
  },
};
