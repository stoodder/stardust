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
// compileContent() composes each revisit with its original (compileRevisit.ts), runs validate()
// (validate.ts: the design rules types and compile can't express, each error tagged `[rule]`) on
// the composed content, then compiles, collecting what it can't compile past:
// unknown ids, registry keys that don't match ids, malformed tile grids, routes that break the
// route format (compileMap.ts), invalid durations. It throws one ContentCompileError listing
// every validation and compile problem, so invalid content never compiles.
import type {
  CompiledAbilityDef,
  CompiledAbilityEffect,
  CompiledContent,
  CompiledEnemyDef,
  CompiledMapDef,
  CompiledTowerDef,
} from './compiled.ts';
import { checkKey, deepFreeze, entriesOf, ticks, type Ctx, type Refs } from './compileHelpers.ts';
import { compileLinks } from './compileLinks.ts';
import { compileEnemy } from './compileEnemy.ts';
import { compileMap } from './compileMap.ts';
import { composeRevisits } from './compileRevisit.ts';
import { compileTower } from './compileTower.ts';
import type { AbilityEffect, IdSpace, LiveIds, MapDef, RawContent } from './types.ts';
import { validate, type ValidationRules } from './validate.ts';
import { assertNever } from '../shared/types.ts';

/** An ability's effect in ticks. */
function compileAbilityEffect(ctx: Ctx, e: AbilityEffect, where: string): CompiledAbilityEffect {
  switch (e.kind) {
    case 'strike':
      return {
        kind: 'strike',
        type: e.type,
        damage: e.damage,
        radiusTiles: e.radiusTiles,
        radiusSq: e.radiusTiles * e.radiusTiles,
        delayTicks: ticks(ctx, e.delaySec, `${where}.delaySec`),
      };
    case 'segment':
      return {
        kind: 'segment',
        type: e.type,
        damagePerSec: e.damagePerSec,
        slowPct: e.slowPct,
        durationTicks: ticks(ctx, e.durationSec, `${where}.durationSec`),
        reachTiles: (e.lengthTiles - 1) / 2,
      };
    case 'slowAll':
      return {
        kind: 'slowAll',
        slowPct: e.slowPct,
        bossSlowPct: e.bossSlowPct,
        durationTicks: ticks(ctx, e.durationSec, `${where}.durationSec`),
      };
    case 'discount':
      return { kind: 'discount', pct: e.pct, charges: e.charges };
    case 'reveal':
      return {
        kind: 'reveal',
        radiusTiles: e.radiusTiles,
        radiusSq: e.radiusTiles * e.radiusTiles,
        durationTicks: ticks(ctx, e.durationSec, `${where}.durationSec`),
      };
    case 'stasisArea':
      return {
        kind: 'stasisArea',
        radiusTiles: e.radiusTiles,
        radiusSq: e.radiusTiles * e.radiusTiles,
        durationTicks: ticks(ctx, e.durationSec, `${where}.durationSec`),
      };
    case 'pathTrap':
      return {
        kind: 'pathTrap',
        type: e.type,
        damage: e.damage,
        pinTicks: ticks(ctx, e.pinSec, `${where}.pinSec`),
        durationTicks: ticks(ctx, e.durationSec, `${where}.durationSec`),
      };
    case 'reboot':
      return { kind: 'reboot', immuneTicks: ticks(ctx, e.immuneSec, `${where}.immuneSec`) };
    default:
      return assertNever(e);
  }
}

/** Thrown when content is invalid or can't be compiled; `errors` lists every problem found. */
export class ContentCompileError extends Error {
  readonly errors: readonly string[];
  constructor(errors: readonly string[]) {
    super(`Content failed to compile (${errors.length}):\n- ${errors.join('\n- ')}`);
    this.name = 'ContentCompileError';
    this.errors = errors;
  }
}

/**
 * Validates and compiles every registry. Throws ContentCompileError when anything is invalid or
 * can't be compiled. `rules` defaults to rules.ts; tests pass fixture answer lists.
 */
export function compileContent<K extends IdSpace = LiveIds>(
  input: RawContent<K>,
  rules?: ValidationRules,
): CompiledContent<K> {
  // Revisits are composed with their originals first (compileRevisit.ts), so validation and
  // compilation see each revisit's whole layout.
  const composed = composeRevisits(input);
  const raw = composed.raw;
  const ctx: Ctx = { errors: [...composed.errors, ...validate(raw, rules)] };

  const towers = new Map<string, CompiledTowerDef<K['tower']>>();
  for (const [key, def] of entriesOf(raw.towers)) {
    checkKey(ctx, 'towers', key, def.id);
    const tower = compileTower(ctx, def);
    if (tower !== null) towers.set(key, tower);
  }
  const linked = compileLinks(ctx, raw.links ?? {}, new Set(Object.keys(raw.towers)));
  for (const [key, tower] of towers) {
    towers.set(key, { ...tower, links: linked.byTower.get(tower.id) ?? [] });
  }
  const enemies = new Map<string, CompiledEnemyDef<K['enemy']>>();
  for (const [key, def] of entriesOf(raw.enemies)) {
    checkKey(ctx, 'enemies', key, def.id);
    enemies.set(key, compileEnemy(ctx, def));
  }
  const abilities = new Map<string, CompiledAbilityDef<K['ability']>>();
  for (const [key, def] of entriesOf(raw.abilities)) {
    checkKey(ctx, 'abilities', key, def.id);
    const where = `abilities.${def.id}`;
    abilities.set(key, {
      id: def.id,
      name: def.name,
      cooldownTicks:
        def.cooldownSec === undefined ? 0 : ticks(ctx, def.cooldownSec, `${where}.cooldownSec`),
      cooldownWaves: def.cooldownWaves ?? 0,
      effect: compileAbilityEffect(ctx, def.effect, `${where}.effect`),
      companion: def.companion ?? null,
      lockedOutBy: def.lockedOutBy ?? null,
      sprites: def.sprites,
    });
  }

  const refs: Refs<K> = { towers, enemies, abilities };
  const maps = new Map<string, CompiledMapDef<K>>();
  for (const [key, def] of entriesOf(raw.maps)) {
    checkKey(ctx, 'maps', key, def.id);
    const of = def.revisitOf;
    const revisitSize =
      of !== undefined && Object.hasOwn(input.maps, of)
        ? (input.maps as Readonly<Record<string, { size: MapDef['size'] }>>)[of]!.size // hasOwn
        : null;
    const map = compileMap(ctx, refs, def, revisitSize);
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
    links: linked.links,
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
