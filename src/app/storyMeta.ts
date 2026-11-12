// Act III part one's meta in the app (T610; D141; meta-runtime.md § Story transactions):
// - **Briefing gifts** (`grantBriefingGifts`): a map's briefing gifts reach the save in play as its
//   loadout first opens, or as its battle starts fresh where no loadout screen comes first (A3M1's
//   Scuttle Den, so it can be picked for that very map). Once a save (meta `briefingGifts`).
// - **What run end reads** from the finished battle: the classes and abilities its script revoked
//   (`revokedAtEnd`, the sim's `state.revoked`), and the tower type under Bricks's `{name}` plate
//   (`memorialAtEnd`; A3M3's last tag, saved as `memorialTower`).
// - **A briefing that changes the battle** (C3's `door_choice`, committed as A3M3's briefing
//   closes; Zibzab's crate, opened as A3M6's closes, `openCrateAtBriefing`, T710): the battle was
//   built before, so when the save now gives it other script flags (`scriptFlagsChanged`) or other
//   modifiers (`briefingChangedBattle`), the router restarts it on the same seed with no briefing
//   (app/router.ts). It is still at its first tick: the briefing holds the battle.
// - **C4 in play** (T710; meta/storyInPlay.ts): `quillOfflineHere` (A3M5 under Rewrite: QUILL's
//   barks and radio silent, `system` intel; the presentation is T713's), and what the crate holds
//   (`crateOffer`, for T714's opening and its protocol pick).
// Pure apart from `grantBriefingGifts` and `openCrateAtBriefing`, which write the save in play.
import { ABILITIES } from '../content/abilities/index.ts';
import type { CampaignMapId } from '../content/campaign.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { AbilityId, IdSpace, ProtocolId, TowerId, UpgradeId } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import {
  CRATE,
  briefingGifts,
  crateContents,
  crateProtocols,
  openCrate,
  quillOffline,
  revokedClassFactions,
  type ActThreeTwoTransaction,
  type RevocationTransaction,
  type RunRevocations,
  type SaveData,
  type StoryTransaction,
} from '../meta/index.ts';
import { gatedFlagDefaults, type SimConfig } from '../sim/index.ts';
import { scriptFlagsOf } from '../story/flags.ts';
import { tagDefFor } from '../story/tags.ts';
import type { ResultsRevocation } from '../ui/screens/state.ts';
import { battleConfig } from './battleSetup.ts';
import { towerName } from './hudText.ts';
import { activeSave, updateActiveSave } from './save.ts';

const isTower = (id: string): id is TowerId => Object.hasOwn(TOWERS, id);
const isAbility = (id: string): id is AbilityId => Object.hasOwn(ABILITIES, id);

/**
 * The briefing gifts of `mapId` into the save in play (none outside a campaign map, or once given):
 * what the router calls as the map's loadout opens and as a fresh battle starts. Returns what was
 * given (usually nothing).
 */
export function grantBriefingGifts(mapId: string): readonly StoryTransaction[] {
  const save = activeSave();
  if (save === null || !isCampaignMapId(mapId)) return [];
  const r = briefingGifts(save, mapId);
  if (r.transactions.length > 0) updateActiveSave(() => r.save);
  return r.transactions;
}

/**
 * What a finished battle's script revoked (the sim's `state.revoked`), as run end reads it: the
 * classes and abilities by live id, and the factions of the `revokeTowerClass` cues that fired
 * (`events` index-aligned with `fired`, the sim's `scriptFired`), for towers.md § 9's map-end class.
 * A cue that never fired takes nothing.
 */
export function revokedAtEnd(
  revoked: { readonly towers: readonly string[]; readonly abilities: readonly string[] },
  events: Parameters<typeof revokedClassFactions>[0] = [],
  fired: readonly boolean[] = [],
): RunRevocations {
  const atMapEnd = revokedClassFactions((events ?? []).filter((_, i) => fired[i] === true));
  return {
    towers: revoked.towers.filter(isTower),
    abilities: revoked.abilities.filter(isAbility),
    ...(atMapEnd.length > 0 ? { atMapEnd } : {}),
  };
}

/** What `memorialAtEnd` reads of the finished battle. */
interface MemorialSim {
  readonly map: { readonly id: string };
  readonly state: {
    readonly towers: {
      readonly used: number;
      readonly items: readonly {
        readonly uid: number;
        readonly alive: boolean;
        readonly def: { readonly id: string } | null;
      }[];
    };
  };
}

/**
 * The tower type under Bricks's plate as the map ended, on a map whose tag reads `{name}` (A3M3's
 * last tag, towers.md § 8), or null: another map, no plate, or its turret gone.
 */
export function memorialAtEnd(
  sim: MemorialSim,
  plate: { readonly uid: number } | null,
  tagOf: (map: CampaignMapId) => { readonly name: string } | null = tagDefFor,
): TowerId | null {
  const map = sim.map.id;
  if (plate === null || !isCampaignMapId(map) || tagOf(map)?.name.includes('{name}') !== true) {
    return null;
  }
  const pool = sim.state.towers;
  for (let i = 0; i < pool.used; i++) {
    const t = pool.items[i];
    if (t === undefined || !t.alive || t.uid !== plate.uid) continue;
    const id = t.def?.id;
    return id !== undefined && isTower(id) ? id : null;
  }
  return null;
}

/**
 * Whether the save's story flags now give `cfg`'s map other values of the script flags it reads
 * (its `builds.flagVariants`) than the battle was built with (a briefing just committed C3's door):
 * the battle must restart on them.
 */
export function scriptFlagsChanged(cfg: SimConfig<IdSpace>, save: SaveData | null): boolean {
  if (save === null) return false;
  const map = cfg.content.maps[cfg.mapId];
  if (map === undefined) return false;
  const want: Readonly<Record<string, unknown>> = gatedFlagDefaults(
    map,
    scriptFlagsOf(save.story.flags),
  );
  const have: Readonly<Record<string, unknown>> = cfg.scriptFlags;
  // Only the flags the map's script reads: the ones its builds vary (`flagVariants`).
  return Object.keys(map.builds.flagVariants).some((k) => want[k] !== have[k]);
}

/**
 * A revocation as Results shows it (core-loop.md § 6.2): the class by name; the ability by name,
 * with what came back for it (Orbital Strike Mk II's Intel), by the upgrade's name.
 */
export function revocationView(t: RevocationTransaction): ResultsRevocation {
  if (t.kind === 'revoke_tower') return { kind: 'tower', name: towerName(t.tower) };
  return {
    kind: 'ability',
    name: ABILITIES[t.ability].name,
    refund:
      t.refund === null
        ? null
        : {
            name: UPGRADES[t.refund.upgrade].name,
            currency: t.refund.currency,
            amount: t.refund.amount,
          },
  };
}

/**
 * Whether the save now builds `cfg`'s battle differently (a briefing just committed C3's door, or
 * opened Zibzab's crate, or its veteran picker changed the replay's modifiers): other script flags
 * (`scriptFlagsChanged`), modifiers, rules, loadout, or abilities. The router restarts the battle
 * on them.
 */
export function briefingChangedBattle(cfg: SimConfig<IdSpace>, save: SaveData | null): boolean {
  if (save === null) return false;
  if (scriptFlagsChanged(cfg, save)) return true;
  let next: SimConfig<IdSpace>;
  try {
    next = battleConfig(cfg.mapId, cfg.seed, save);
  } catch {
    return false;
  }
  // T860: a veteran pick on the briefing changes the rules, the loadout, and slot 1 too.
  const shape = (c: SimConfig<IdSpace>): string =>
    JSON.stringify([c.modifiers, c.rules ?? [], c.loadout, c.abilities]);
  return shape(next) !== shape(cfg);
}

/** What Zibzab's crate holds for `save`: its tune-ups, else the protocols to pick from (D146). */
export interface CrateOffer {
  readonly tuneUps: Readonly<Partial<Record<UpgradeId, number>>>;
  /** The Field Protocols the player may pick when it holds no tune-up (else empty). */
  readonly protocols: readonly ProtocolId[];
}

/** The crate's offer for `save`, or null once it is opened (or for no save). */
export function crateOffer(save: SaveData | null): CrateOffer | null {
  if (save === null || save.story.granted.includes(CRATE.grant)) return null;
  const tuneUps = crateContents(save);
  return {
    tuneUps,
    protocols: Object.keys(tuneUps).length > 0 ? [] : crateProtocols(save),
  };
}

/**
 * As `mapId`'s briefing closes: on A3M6 (`CRATE.map`), Zibzab's crate opens on the save in play,
 * once (D146: live from W1). Its tune-ups install at once; a crate holding none opens on the
 * protocol `pick` (T714's picker in the briefing; without one it stays shut, refused
 * `'needs_pick'`, and asks again on the next briefing). Returns what it did, or null.
 */
export function openCrateAtBriefing(
  mapId: string,
  pick?: ProtocolId,
): ActThreeTwoTransaction | null {
  const save = activeSave();
  if (save === null || mapId !== CRATE.map) return null;
  const r = openCrate(save, pick);
  if (!r.ok || r.applied === null) return null;
  const next = r.save;
  updateActiveSave(() => next);
  return r.applied;
}

/** Whether QUILL is offline on `mapId` for the save in play (A3M5 under C4 Rewrite; T713 reads). */
export function quillOfflineHere(mapId: string): boolean {
  return quillOffline(mapId, activeSave());
}
