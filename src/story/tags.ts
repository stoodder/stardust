// Bricks's name tags (docs/design/towers.md § 8; docs/story/campaign.md § 6.3): which tower carries
// the map's tag, from sim events, starting at A1M2. Cosmetic, so it lives outside the sim: render
// draws the plate, story plays the tagging line and the `tower_sold` bark with `tagged: true` (or
// `tower_revoked` with `tagged: true`, when A3M2's Clean Exit takes the named turret; D143 R5).
// Pure: the state is plain data the caller keeps, one per battle.
import type { CampaignMapId } from '../content/campaign.ts';
import { NAME_TAGS, type NameTagDef } from '../content/dialogue/tags.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimEvent } from '../sim/index.ts';

/** A standing tower, as tagging sees it. */
export interface TaggableTower {
  readonly uid: number;
  readonly tower: string;
}

/** One battle's tagging state. */
export interface TagState {
  /** The map's tag, or null on a map where Bricks gives none. */
  readonly def: NameTagDef | null;
  /** Standing attacking towers, in build order. */
  readonly towers: readonly TaggableTower[];
  /** The tower carrying the tag now. */
  readonly tagged: TaggableTower | null;
  /** Whether the tag moment has come (it comes once a map). */
  readonly given: boolean;
}

/**
 * What a step changed. `tagged`: the plate goes on `uid` (`name` is the raw tag text: resolve it
 * with `resolveText`, for A3M3's `{name}`). `untagged`: it comes off, because the tower was sold
 * (play the `tower_sold` bark with `tagged: true`), revoked (`tower_revoked` with `tagged: true`;
 * never the sold bark), or the tag moved to a newer tower.
 */
export type TagEffect =
  | { readonly kind: 'tagged'; readonly uid: number; readonly tower: string; readonly name: string }
  | { readonly kind: 'untagged'; readonly uid: number; readonly reason: 'sold' | 'revoked' | 'moved' };

export interface TagStep {
  readonly state: TagState;
  readonly effects: readonly TagEffect[];
}

/** Whether a tower attacks (support towers, with no attack, are never tagged). Unknown ids do. */
export function isAttackingTower(tower: string): boolean {
  const def = Object.values(TOWERS).find((d) => d.id === tower);
  return def === undefined || def.tiers[0].attack !== undefined;
}

/** The tag Bricks gives on `map`, if any. */
export function tagDefFor(
  map: CampaignMapId,
  tags: readonly NameTagDef[] = NAME_TAGS,
): NameTagDef | null {
  return tags.find((t) => t.map === map) ?? null;
}

/** A fresh state for a battle on `map`. */
export function newTagState(map: CampaignMapId, tags: readonly NameTagDef[] = NAME_TAGS): TagState {
  return { def: tagDefFor(map, tags), towers: [], tagged: null, given: false };
}

/**
 * The save's `bricksTagIndex` after a battle on `map` gave its tag: the list position after the
 * furthest map tagged, never going back (a replay of an earlier map leaves it).
 */
export function tagIndexAfter(
  map: CampaignMapId,
  index: number,
  tags: readonly NameTagDef[] = NAME_TAGS,
): number {
  const i = tags.findIndex((t) => t.map === map);
  return i < 0 ? index : Math.max(index, i + 1);
}

/** The tower to tag now: the earliest-built (lowest uid) or most recent standing attacking tower. */
function pickTower(state: TagState): TaggableTower | null {
  if (state.def === null || state.towers.length === 0) return null;
  const byUid = state.towers.toSorted((a, b) => a.uid - b.uid);
  return (state.def.pick === 'earliest' ? byUid[0] : byUid.at(-1)) ?? null;
}

/** Puts the tag on the tower `pickTower` chooses, moving it off another if needed. */
function retag(state: TagState): TagStep {
  const def = state.def;
  const want = pickTower(state);
  if (def === null || want === null || want.uid === state.tagged?.uid) {
    return { state: { ...state, given: state.given || state.tagged !== null }, effects: [] };
  }
  const effects: TagEffect[] = [];
  if (state.tagged !== null) {
    effects.push({ kind: 'untagged', uid: state.tagged.uid, reason: 'moved' });
  }
  effects.push({ kind: 'tagged', uid: want.uid, tower: want.tower, name: def.name });
  return { state: { ...state, tagged: want, given: true }, effects };
}

/**
 * The tag moment: Bricks tags a tower now (a map script cue, for a `latest` tag such as A3M3's;
 * `earliest` tags come at the first wave clear by themselves). With no attacking tower standing,
 * nothing is tagged and the moment waits for the next clear.
 */
export function giveTag(state: TagState): TagStep {
  if (state.def === null || state.given) return { state, effects: [] };
  return retag(state);
}

/**
 * Steps tagging past one sim event. `TowerBuilt` adds an attacking tower (a `latest` tag moves to
 * it); `TowerSold` and `TowerRevoked` take the tag off with it (reason `'sold'` or `'revoked'`; a
 * `latest` tag moves to the newest standing tower); the first `WaveCleared` with an attacking tower standing is an `earliest` tag's moment. Other
 * events change nothing.
 */
export function tagStep(
  state: TagState,
  e: SimEvent<IdSpace>,
  attacking: (tower: string) => boolean = isAttackingTower,
): TagStep {
  if (state.def === null) return { state, effects: [] };
  if (e.type === 'TowerBuilt') {
    if (!attacking(e.tower)) return { state, effects: [] };
    const next = { ...state, towers: [...state.towers, { uid: e.uid, tower: e.tower }] };
    return next.given && next.def?.pick === 'latest' ? retag(next) : { state: next, effects: [] };
  }
  if (e.type === 'TowerSold' || e.type === 'TowerRevoked') {
    const towers = state.towers.filter((t) => t.uid !== e.uid);
    if (towers.length === state.towers.length) return { state, effects: [] };
    if (state.tagged?.uid !== e.uid) return { state: { ...state, towers }, effects: [] };
    const reason = e.type === 'TowerSold' ? 'sold' : 'revoked';
    const sold: TagEffect = { kind: 'untagged', uid: e.uid, reason };
    const next: TagState = { ...state, towers, tagged: null };
    if (next.def?.pick !== 'latest') return { state: next, effects: [sold] };
    const moved = retag(next);
    return { state: moved.state, effects: [sold, ...moved.effects] };
  }
  if (e.type === 'WaveCleared' && state.def.pick === 'earliest') return giveTag(state);
  return { state, effects: [] };
}

/** The tower type carrying the tag (A3M3's is saved as `memorialTower`). */
export function taggedTowerType(state: TagState): string | null {
  return state.tagged?.tower ?? null;
}
