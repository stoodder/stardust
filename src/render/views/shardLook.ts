// A boss's shards in the depth sort (D139 S4; the Sunderglass Penitent's Glimmer-shards, T506): a
// shard spawns about its owner on the road (`spreadTiles` behind to ahead), and one just behind it
// would sort under the giant's body and vanish. So a shard (an enemy with `ownerUid`) sorts at
// least one depth step over its owner: always drawn in front of the boss that shed it, and still in
// its own place among everything else (EnemyView's `sync` floor; BattleScene passes the owner's
// depth). The spark that shows them shed is ShieldView's (`shedOwner`).

/**
 * The step over the owner's depth: past the owner's bubble (EnemyDress's IN_FRONT, 2e-5) with the
 * shard's own rim (BEHIND, 2e-5) still in front of it, and under the uid tiebreak's 1e-4, so
 * nothing else sorts between the boss and its shards.
 */
export const SHARD_DEPTH_STEP = 5e-5;

/**
 * The least depth a unit sorts at: one step over its owner's (`ownerDepth`, null without a live
 * owner view), split a hair by uid so shards never tie; −∞ (no floor) for a unit with no owner.
 */
export function shardDepthFloor(ownerDepth: number | null, uid: number): number {
  if (ownerDepth === null) return Number.NEGATIVE_INFINITY;
  return ownerDepth + SHARD_DEPTH_STEP + (uid & 7) * 1e-6;
}
