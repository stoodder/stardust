// Act III part one's meta in the app (T610; D141; meta-runtime.md § Story transactions):
// - **Briefing gifts** (`grantBriefingGifts`): a map's briefing gifts reach the save in play as its
//   loadout first opens, or as its battle starts fresh where no loadout screen comes first (A3M1's
//   Scuttle Den, so it can be picked for that very map). Once a save (meta `briefingGifts`).
// - **What run end reads** from the finished battle: the classes and abilities its script revoked
//   (`revokedAtEnd`, the sim's `state.revoked`), and the tower type under Bricks's `{name}` plate
//   (`memorialAtEnd`; A3M3's last tag, saved as `memorialTower`).
// - **A briefing that sets a script flag** (C3's `door_choice`, committed as A3M3's briefing closes):
//   the battle was built before the answer, so when the save's script flags no longer match the
//   battle's (`scriptFlagsChanged`), the router restarts it on the same seed with no briefing
//   (app/router.ts). It is still at its first tick: the briefing holds the battle.
// Pure apart from `grantBriefingGifts`, which writes the save in play.
import { ABILITIES } from '../content/abilities/index.ts';
import type { CampaignMapId } from '../content/campaign.ts';
import { isCampaignMapId } from '../content/dialogue/rules.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { AbilityId, IdSpace, TowerId } from '../content/types.ts';
import { UPGRADES } from '../content/upgrades/index.ts';
import {
  briefingGifts,
  type RevocationTransaction,
  type RunRevocations,
  type SaveData,
  type StoryTransaction,
} from '../meta/index.ts';
import { gatedFlagDefaults, type SimConfig } from '../sim/index.ts';
import { scriptFlagsOf } from '../story/flags.ts';
import { tagDefFor } from '../story/tags.ts';
import type { ResultsRevocation } from '../ui/screens/state.ts';
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

/** What a finished battle's script revoked (the sim's `state.revoked`), as run end reads it. */
export function revokedAtEnd(revoked: {
  readonly towers: readonly string[];
  readonly abilities: readonly string[];
}): RunRevocations {
  return { towers: revoked.towers.filter(isTower), abilities: revoked.abilities.filter(isAbility) };
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
