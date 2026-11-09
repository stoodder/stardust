// compileContent(): RawContent (authored in seconds and tiles) → CompiledContent (ticks and
// tiles, references resolved, deep-frozen). Shapes: types.ts and compiled.ts.
//
// Conversion rules (deterministic; same input, same output on every run):
// - Durations: secToTicks (nearest tick, halves round up, a positive duration is ≥ 1 tick).
// - Rates: ratePerSecToPeriodTicks (the period 60 / rate, rounded the same way), so 1.6 shots/s
//   fires every 38 ticks (1.58/s). The sim never accumulates fractional cooldowns.
// - Speeds and regeneration: per second / TICK_HZ, exact (no rounding).
// - Distances stay in tiles; squared ranges are precomputed.
// - Tier patches: objects merge deeply; arrays and values replace; an object whose `kind`
//   differs from the one it patches replaces it whole (an attack that changes delivery).
//
// compileContent() throws a ContentCompileError listing every problem it can't compile past:
// unknown ids, registry keys that don't match ids, malformed tile grids, invalid durations.
// Design rules (geometry, threat intel, builds) are validate()'s job (T110).
import type {
  CompiledAbilityDef,
  CompiledContent,
  CompiledEnemyDef,
  CompiledMapDef,
  CompiledTowerDef,
} from './compiled.ts';
import { checkKey, deepFreeze, entriesOf, ticks, type Ctx, type Refs } from './compileHelpers.ts';
import { compileMap } from './compileMap.ts';
import { compileTower } from './compileTower.ts';
import type { IdSpace, LiveIds, RawContent } from './types.ts';
import { perSecToPerTick } from '../shared/time.ts';

/** Thrown when content can't be compiled; `errors` lists every problem found. */
export class ContentCompileError extends Error {
  readonly errors: readonly string[];
  constructor(errors: readonly string[]) {
    super(`Content failed to compile (${errors.length}):\n- ${errors.join('\n- ')}`);
    this.name = 'ContentCompileError';
    this.errors = errors;
  }
}

/** Compiles every registry. Throws ContentCompileError when anything can't be compiled. */
export function compileContent<K extends IdSpace = LiveIds>(
  raw: RawContent<K>,
): CompiledContent<K> {
  const ctx: Ctx = { errors: [] };

  const towers = new Map<string, CompiledTowerDef<K['tower']>>();
  for (const [key, def] of entriesOf(raw.towers)) {
    checkKey(ctx, 'towers', key, def.id);
    const tower = compileTower(ctx, def);
    if (tower !== null) towers.set(key, tower);
  }
  const enemies = new Map<string, CompiledEnemyDef<K['enemy']>>();
  for (const [key, def] of entriesOf(raw.enemies)) {
    checkKey(ctx, 'enemies', key, def.id);
    const where = `enemies.${def.id}`;
    enemies.set(key, {
      id: def.id,
      faction: def.faction,
      body: def.body,
      layer: def.layer,
      hp: def.hp,
      armor: def.armor,
      shield:
        def.shield === undefined
          ? null
          : {
              hp: def.shield.hp,
              regenPerTick: perSecToPerTick(def.shield.regenPerSec),
              regenDelayTicks: ticks(
                ctx,
                def.shield.regenDelaySec,
                `${where}.shield.regenDelaySec`,
              ),
            },
      speedTilesPerTick: perSecToPerTick(def.speedTilesPerSec),
      leak: def.leak,
      bounty: def.bounty,
      spawnIntervalTicks: ticks(ctx, def.spawnIntervalSec, `${where}.spawnIntervalSec`),
      traits: def.traits,
      tells: def.tells,
      restValue: def.restValue ?? 1,
      sprites: def.sprites,
    });
  }
  const abilities = new Map<string, CompiledAbilityDef<K['ability']>>();
  for (const [key, def] of entriesOf(raw.abilities)) {
    checkKey(ctx, 'abilities', key, def.id);
    const where = `abilities.${def.id}`;
    const e = def.effect;
    abilities.set(key, {
      id: def.id,
      name: def.name,
      cooldownTicks: ticks(ctx, def.cooldownSec, `${where}.cooldownSec`),
      effect: {
        kind: e.kind,
        type: e.type,
        damage: e.damage,
        radiusTiles: e.radiusTiles,
        radiusSq: e.radiusTiles * e.radiusTiles,
        delayTicks: ticks(ctx, e.delaySec, `${where}.effect.delaySec`),
      },
      sprites: def.sprites,
    });
  }

  const refs: Refs<K> = { towers, enemies, abilities };
  const maps = new Map<string, CompiledMapDef<K>>();
  for (const [key, def] of entriesOf(raw.maps)) {
    checkKey(ctx, 'maps', key, def.id);
    const map = compileMap(ctx, refs, def);
    if (map !== null) maps.set(key, map);
  }
  for (const [i, id] of raw.campaign.entries()) {
    if (!Object.hasOwn(raw.maps, id)) ctx.errors.push(`campaign[${i}]: unknown map '${id}'`);
  }

  if (ctx.errors.length > 0) throw new ContentCompileError(ctx.errors);
  const out: CompiledContent<K> = {
    towers: toRecord(towers),
    enemies: toRecord(enemies),
    abilities: toRecord(abilities),
    maps: toRecord(maps),
    campaign: [...raw.campaign],
  };
  return deepFreeze(out);
}

/**
 * A Map of compiled definitions as a record keyed by its id union. Validated boundary: the map
 * holds exactly the registry's keys (each checked against its definition's id), and TS can't
 * relate `{ [k: string]: V }` to a record over a generic key union, hence the cast.
 */
function toRecord<Key extends string, V>(m: ReadonlyMap<string, V>): Readonly<Record<Key, V>> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- validated boundary (above)
  return Object.fromEntries(m) as unknown as Readonly<Record<Key, V>>;
}
