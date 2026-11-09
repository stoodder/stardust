// Test helpers for combat (T105a): a bare state + tick context on fx_map (src/content/__fixtures__),
// enemies and towers placed directly (the wave spawner and build economy are T105b's), and
// derived enemy defs for the cases the content fixture lacks (armor, shields, bodies, flyers).
// fx_map's path `a` runs (0,0) → (2,0) → (2,3) → (3,3) → (3,4) → (5,4), 9 tiles; pads (1,1),
// (3,1), (4,2), (1,3). fx_gun: hitscan 10 kinetic, 2/s, range 3. fx_mortar: lobbed 20 explosive,
// 0.5/s, range 3.5, min 1, splash 0.9, 0.8 s flight, lead. fx_sprinkler: pulse 2 kinetic, 1/s,
// radius 2, Chilled 25% for 1.5 s.
import type {
  CompiledEnemyDef,
  CompiledRoute,
  CompiledTier,
  CompiledTowerDef,
} from '../../content/compiled.ts';
import type { IdSpace, WaveTag } from '../../content/types.ts';
import type { SimConfig } from '../config.ts';
import { ENEMY_BLANK, TOWER_BLANK, type Enemy, type Tower } from '../entities.ts';
import { placeOnRoute } from '../path.ts';
import { poolAlloc } from '../pool.ts';
import { createState, takeUid, type SimState } from '../state.ts';
import { createScratch, type TickContext } from '../tick.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './sim.ts';

export const MAP = FIXTURE_CONTENT.maps.fx_map;
export const ROAD: CompiledRoute = MAP.routes.a!; // fx_map has route a
export const GUN = FIXTURE_CONTENT.towers.fx_gun;
export const MORTAR = FIXTURE_CONTENT.towers.fx_mortar;
export const SPRINKLER = FIXTURE_CONTENT.towers.fx_sprinkler;
export const WALKER = FIXTURE_CONTENT.enemies.fx_walker; // 30 HP, 1 tile/s, organic skitterkin
export const RUNNER = FIXTURE_CONTENT.enemies.fx_runner; // 20 HP + 10 shield, 2 tiles/s

/** A derived enemy def (frozen, with its own id, as compiled content is). */
export function enemyDef(id: string, over: Partial<CompiledEnemyDef>): CompiledEnemyDef {
  return Object.freeze({ ...WALKER, id, ...over });
}

/** A derived tier: `base` with its attack fields patched (same kind). */
export function tierWith(base: CompiledTier, attack: Record<string, unknown>): CompiledTier {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- test fixture: patches keep the kind
  return Object.freeze({
    ...base,
    attack: Object.freeze({ ...base.attack, ...attack }),
  } as CompiledTier);
}

export function setup(over: Partial<SimConfig<IdSpace>> = {}): {
  state: SimState;
  ctx: TickContext;
} {
  const config: SimConfig<IdSpace> = { ...fixtureConfig(), ...over };
  return {
    state: createState(MAP, config.seed),
    ctx: { content: FIXTURE_CONTENT, map: MAP, config, scratch: createScratch() },
  };
}

/** Allocates an enemy on a route at `dist`, as the wave spawner (T105b) will. */
export function spawn(
  state: SimState,
  def: CompiledEnemyDef,
  over: { dist?: number; route?: CompiledRoute; tags?: readonly WaveTag[] } = {},
): Enemy {
  const e = poolAlloc(state.enemies, ENEMY_BLANK, takeUid(state));
  e.def = def;
  e.hp = def.hp;
  e.shieldHp = def.shield === null ? 0 : def.shield.hp;
  e.tags = over.tags ?? e.tags;
  e.spawnTick = state.tick;
  placeOnRoute(e, over.route ?? ROAD, over.dist ?? 0);
  return e;
}

/** Places a tower on tile (col, row) at `tier` (1–3), or with an explicit tier def. */
export function placeTower(
  state: SimState,
  def: CompiledTowerDef,
  col: number,
  row: number,
  tier: number | CompiledTier = 1,
): Tower {
  const t = poolAlloc(state.towers, TOWER_BLANK, takeUid(state));
  const tierDef = typeof tier === 'number' ? def.tiers[tier - 1]! : tier; // tiers 1–3
  t.def = def;
  t.tier = tierDef.tier;
  t.tierDef = tierDef;
  t.col = col;
  t.row = row;
  t.x = col + 0.5;
  t.y = row + 0.5;
  t.priority = tierDef.defaultPriority;
  t.builtTick = state.tick;
  state.towerAtTile[row * MAP.cols + col] = t.slot;
  return t;
}
