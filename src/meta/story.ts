// The story's between-map unlocks (docs/tech/meta-runtime.md § Run end, step 8; story-runtime.md
// § Other story systems): the enemies a run met, the memos due (with their gifts), and the codex
// versions unlocked, folded into the save. Pure and idempotent: run end applies it, and so does
// entering the base, so a save from before a memo or entry existed catches up.
import { CAMPAIGN_PLAN_IDS, type CampaignMapId } from '../content/campaign.ts';
import type { CodexId } from '../content/codex/index.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import { ENEMIES } from '../content/enemies/index.ts';
import { MAPS } from '../content/maps/index.ts';
import type { MemoGift, MemoId } from '../content/memos/index.ts';
import type { EnemyId, MapId } from '../content/types.ts';
import { newCodexUnlocks } from '../story/codex.ts';
import type { StoryContext } from '../story/conditions.ts';
import { memosDue } from '../story/inbox.ts';
import type { SaveData } from './saveData.ts';
import { clampCurrency } from './validate.ts';

/** The furthest campaign map the save has won, or null before A1M1 is won. */
export function furthestWon(save: SaveData): CampaignMapId | null {
  let out: CampaignMapId | null = null;
  for (const id of CAMPAIGN_PLAN_IDS) if (isWon(save, id)) out = id;
  return out;
}

/** Whether the save has won campaign map `id` (registered or not: a record is all it reads). */
function isWon(save: SaveData, id: CampaignMapId): boolean {
  const maps: Partial<Record<string, { readonly completed: boolean }>> = save.campaign.maps;
  return maps[id]?.completed === true;
}

/**
 * The story context between maps (the base, run end): the save's flags, seen list, and lifetime
 * count, about the furthest map won (null before A1M1: the intake).
 */
export function baseStoryContext(save: SaveData): StoryContext {
  return {
    // A valid save holds only each flag's declared values (validate.ts, T218), so its flags are a
    // FlagSet.
    flags: save.story.flags as FlagSet,
    map: furthestWon(save),
    pestsProcessed: save.stats.pestsProcessed,
    seen: save.story.seen,
    run: null,
  };
}

function pushNew(out: EnemyId[], id: string): void {
  if (Object.hasOwn(ENEMIES, id) && !out.includes(id as EnemyId)) out.push(id as EnemyId);
}

/**
 * The enemy types a run of `mapId` met, in wave order: every group of the waves it reached (all of
 * them on a win; on a loss the waves resolved plus the one under way), with the units those enemies
 * bring (a Bunchling's Nibblers, a boss's sneezes and surfacing young). The save's
 * `campaign.seenEnemies` (the codex's subjects, the NEW badge) adds them at run end.
 */
export function enemiesMet(mapId: MapId, won: boolean, wavesResolved: number): EnemyId[] {
  const map = MAPS[mapId];
  const reached = won
    ? map.waves.length
    : Math.min(map.waves.length, Math.max(0, wavesResolved) + 1);
  const out: EnemyId[] = [];
  for (const wave of map.waves.slice(0, reached)) {
    for (const g of wave.groups) pushNew(out, g.enemy);
  }
  // Units that bring others (one level is all Act I needs; the loop keeps going while it grows).
  for (let i = 0; i < out.length; i++) {
    const e = ENEMIES[out[i]!];
    if (e.split !== undefined) pushNew(out, e.split.enemy);
    for (const p of e.boss?.phases ?? []) {
      if (p.spawn !== undefined) pushNew(out, p.spawn.enemy);
      if (p.burrow?.surfaceSpawn !== undefined) pushNew(out, p.burrow.surfaceSpawn.enemy);
    }
  }
  return out;
}

/** What `withStoryUnlocks` added. */
export interface StoryUnlocks {
  readonly save: SaveData;
  /** Memos delivered now, in delivery order (the Inbox's NEW badge). */
  readonly memos: readonly MemoId[];
  /** The gifts those memos granted, in order (one the save already held isn't listed). */
  readonly gifts: readonly MemoGift[];
  /** Codex entries with a version unlocked now, in codex order. */
  readonly codex: readonly CodexId[];
}

function grant(save: SaveData, gift: MemoGift): SaveData {
  if ('ability' in gift) {
    if (save.unlocks.abilities.includes(gift.ability)) return save;
    return { ...save, unlocks: { ...save.unlocks, abilities: [...save.unlocks.abilities, gift.ability] } };
  }
  if ('tower' in gift) {
    if (save.unlocks.towers.includes(gift.tower)) return save;
    return { ...save, unlocks: { ...save.unlocks, towers: [...save.unlocks.towers, gift.tower] } };
  }
  return {
    ...save,
    currencies: {
      ...save.currencies,
      stardust: clampCurrency(save.currencies.stardust + gift.stardust),
    },
  };
}

/** The memos due now delivered into a copy of `save`, their gifts granted once. */
export function deliverMemos(save: SaveData): {
  readonly save: SaveData;
  readonly memos: readonly MemoId[];
  readonly gifts: readonly MemoGift[];
} {
  const won = CAMPAIGN_PLAN_IDS.filter((id) => isWon(save, id));
  const delivery = memosDue(save.story.memosDelivered, won, baseStoryContext(save));
  if (delivery.memos.length === 0) return { save, memos: [], gifts: [] };
  let next = save;
  const gifts: MemoGift[] = [];
  const granted = [...save.story.granted];
  for (const { memo, gift } of delivery.gifts) {
    if (granted.includes(memo)) continue;
    const after = grant(next, gift);
    if (after !== next) gifts.push(gift);
    next = after;
    granted.push(memo);
  }
  next = {
    ...next,
    story: {
      ...next.story,
      memosDelivered: [...next.story.memosDelivered, ...delivery.memos],
      granted,
    },
  };
  return { save: next, memos: delivery.memos, gifts };
}

/** Every codex version unlocked now added to a copy of `save`, and the entries that gained one. */
export function unlockCodex(save: SaveData): {
  readonly save: SaveData;
  readonly codex: readonly CodexId[];
} {
  const fresh = newCodexUnlocks(save.story.codex, baseStoryContext(save), {
    enemies: save.campaign.seenEnemies,
    towers: save.unlocks.towers,
    abilities: save.unlocks.abilities,
  });
  const codex = Object.keys(fresh);
  if (codex.length === 0) return { save, codex };
  const merged: Record<CodexId, SaveData['story']['codex'][CodexId]> = { ...save.story.codex };
  for (const id of codex) merged[id] = [...(merged[id] ?? []), ...(fresh[id] ?? [])];
  return { save: { ...save, story: { ...save.story, codex: merged } }, codex };
}

/**
 * Folds the story's between-map unlocks into a copy of `save` (the input is untouched):
 * 1. `met` (a run's enemies) joins `campaign.seenEnemies`;
 * 2. every memo due is delivered, and its gift granted once (`story.granted` records the memo id),
 *    so skipping the Inbox never costs anything (core-loop.md § 6.4);
 * 3. every codex version now unlocked joins `story.codex` (after the gifts, so a gifted ability's
 *    entry unlocks with it).
 * Returns the same save object when nothing changed.
 */
export function withStoryUnlocks(save: SaveData, met: readonly EnemyId[] = []): StoryUnlocks {
  let next = save;
  const seenEnemies = [...save.campaign.seenEnemies];
  for (const e of met) if (!seenEnemies.includes(e)) seenEnemies.push(e);
  if (seenEnemies.length !== save.campaign.seenEnemies.length) {
    next = { ...next, campaign: { ...next.campaign, seenEnemies } };
  }
  const memos = deliverMemos(next);
  const codex = unlockCodex(memos.save);
  return { save: codex.save, memos: memos.memos, gifts: memos.gifts, codex: codex.codex };
}
