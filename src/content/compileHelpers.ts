// Shared helpers for the content compiler (compile.ts and its compile*.ts parts).
import { ratePerSecToPeriodTicks, secToTicks } from '../shared/time.ts';
import type { CompiledAbilityDef, CompiledEnemyDef, CompiledTowerDef } from './compiled.ts';
import type { IdSpace } from './types.ts';

/** Errors collected while compiling; `where` strings locate each one (`maps.x.waves[2]`). */
export interface Ctx {
  readonly errors: string[];
}

/** Compiled definitions by id, for resolving references. */
export interface Refs<K extends IdSpace> {
  readonly towers: ReadonlyMap<string, CompiledTowerDef<K['tower']>>;
  readonly enemies: ReadonlyMap<string, CompiledEnemyDef<K['enemy']>>;
  readonly abilities: ReadonlyMap<string, CompiledAbilityDef<K['ability']>>;
}

export function entriesOf<V>(record: Readonly<Record<string, V>>): [string, V][] {
  return Object.entries(record);
}

export function checkKey(ctx: Ctx, kind: string, key: string, id: string): void {
  if (key !== id)
    ctx.errors.push(`${kind}.${key}: registered under '${key}' but its id is '${id}'`);
}

/** secToTicks, recording an invalid duration as an error (and returning 0) instead of throwing. */
export function ticks(ctx: Ctx, sec: number, where: string): number {
  try {
    return secToTicks(sec);
  } catch (e) {
    ctx.errors.push(`${where}: ${e instanceof Error ? e.message : String(e)}`);
    return 0;
  }
}

export function periodTicks(ctx: Ctx, ratePerSec: number, where: string): number {
  try {
    return ratePerSecToPeriodTicks(ratePerSec);
  } catch (e) {
    ctx.errors.push(`${where}: ${e instanceof Error ? e.message : String(e)}`);
    return 0;
  }
}

function isPlainObject(x: unknown): x is Readonly<Record<string, unknown>> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/** The tier-patch merge rule (compile.ts header). Returns new objects; never mutates its inputs. */
export function mergePatch(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return base;
  if (!isPlainObject(base) || !isPlainObject(patch)) return patch;
  if ('kind' in patch && patch['kind'] !== base['kind']) return patch;
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) out[k] = mergePatch(base[k], v);
  return out;
}

/** Deep-freezes plain objects and arrays in place. Shared references are frozen once. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value)) deepFreeze(v);
  }
  return value;
}

export function checkId(
  ctx: Ctx,
  registry: ReadonlyMap<string, unknown>,
  id: string,
  where: string,
  kind: string,
): void {
  if (!registry.has(id)) ctx.errors.push(`${where}: unknown ${kind} '${id}'`);
}
