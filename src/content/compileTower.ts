// Tower compilation: tier patches resolved into full per-tier definitions, times in ticks.
import { assertNever } from '../shared/types.ts';
import { TICK_HZ, perSecToPerTick } from '../shared/time.ts';
import type { CompiledAttack, CompiledEffect, CompiledTier, CompiledTowerDef } from './compiled.ts';
import { mergePatch, periodTicks, ticks, type Ctx } from './compileHelpers.ts';
import type { AttackDef, AttackKind, EffectDef, TierDef, TierPatch, TowerDef } from './types.ts';

const ATTACK_FIELDS: Readonly<Record<AttackKind, readonly string[]>> = {
  hitscan: [],
  projectile: ['projectile', 'speedTilesPerSec'],
  lobbed: ['projectile', 'flightSec', 'splashTiles', 'lead'],
  beam: ['tickSec'],
  chain: ['jumps', 'jumpRangeTiles', 'falloffPct'],
  spawner: ['ally', 'maxAlive'],
  pulse: [],
};
const ATTACK_COMMON_FIELDS = ['type', 'damage', 'ratePerSec', 'rangeTiles'];

export function compileTower<Id extends string>(
  ctx: Ctx,
  def: TowerDef<Id>,
): CompiledTowerDef<Id> | null {
  const where = `towers.${def.id}`;
  const [tier1, t2, t3] = def.tiers;
  const tier2 = applyPatch(tier1, t2);
  const tier3 = applyPatch(tier2, t3);
  const tiers = [
    compileTier(ctx, tier1, 1, null, `${where}.tiers[0]`),
    compileTier(ctx, tier2, 2, null, `${where}.tiers[1]`),
    compileTier(ctx, tier3, 3, null, `${where}.tiers[2]`),
  ] as const;
  const specs =
    def.specs === undefined
      ? null
      : {
          a: compileTier(
            ctx,
            applyPatch(tier3, def.specs.a),
            4,
            def.specs.a.name,
            `${where}.specs.a`,
          ),
          b: compileTier(
            ctx,
            applyPatch(tier3, def.specs.b),
            4,
            def.specs.b.name,
            `${where}.specs.b`,
          ),
        };
  return {
    id: def.id,
    faction: def.faction,
    role: def.role,
    tiers,
    specs,
    links: [], // compileContent fills it from the link registry (compileLinks.ts)
    sprites: { base: def.sprites.base, head: def.sprites.head ?? null, icon: def.sprites.icon },
    lightRadiusTiles: def.lightRadiusTiles ?? null,
  };
}

function applyPatch(base: TierDef, patch: TierPatch): TierDef {
  // Validated boundary: both inputs are typed, and compileAttack checks that a replaced attack
  // has every field its kind needs.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the merge of a TierDef and its patch
  return mergePatch(base, patch) as TierDef;
}

function compileTier(
  ctx: Ctx,
  tier: TierDef,
  n: CompiledTier['tier'],
  name: string | null,
  where: string,
): CompiledTier {
  return {
    tier: n,
    name,
    cost: tier.cost,
    targets: { ground: tier.targets.ground, air: tier.targets.air },
    defaultPriority: tier.defaultPriority,
    attack: tier.attack === undefined ? null : compileAttack(ctx, tier.attack, `${where}.attack`),
    effects: (tier.effects ?? []).map((e, i) => compileEffect(ctx, e, `${where}.effects[${i}]`)),
    auras: (tier.auras ?? []).map((a) => ({
      kind: a.kind,
      radiusTiles: a.radiusTiles,
      radiusSq: a.radiusTiles * a.radiusTiles,
      stat: a.stat,
      pct: a.pct,
    })),
  };
}

function compileAttack(ctx: Ctx, a: AttackDef, where: string): CompiledAttack | null {
  const missing = [...ATTACK_COMMON_FIELDS, ...(ATTACK_FIELDS[a.kind] ?? ['kind'])].filter(
    (f) => !(f in a),
  );
  if (missing.length > 0) {
    ctx.errors.push(`${where}: '${a.kind}' attack is missing ${missing.join(', ')}`);
    return null;
  }
  const minRange = a.minRangeTiles ?? 0;
  const common = {
    type: a.type,
    damage: a.damage,
    cooldownTicks: periodTicks(ctx, a.ratePerSec, `${where}.ratePerSec`),
    rangeTiles: a.rangeTiles,
    rangeSq: a.rangeTiles * a.rangeTiles,
    minRangeTiles: minRange,
    minRangeSq: minRange * minRange,
    armorPierce: a.armorPierce ?? 0,
    ignoresArmor: a.ignoresArmor ?? false,
    spinUpTicks: a.spinUpSec === undefined ? 0 : ticks(ctx, a.spinUpSec, `${where}.spinUpSec`),
  };
  switch (a.kind) {
    case 'hitscan':
    case 'pulse':
      return { ...common, kind: a.kind };
    case 'projectile':
      return {
        ...common,
        kind: a.kind,
        projectile: a.projectile,
        speedTilesPerTick: perSecToPerTick(a.speedTilesPerSec),
      };
    case 'lobbed':
      return {
        ...common,
        kind: a.kind,
        projectile: a.projectile,
        flightTicks: ticks(ctx, a.flightSec, `${where}.flightSec`),
        splashTiles: a.splashTiles,
        splashSq: a.splashTiles * a.splashTiles,
        lead: a.lead,
      };
    case 'beam': {
      const beamTickTicks = ticks(ctx, a.tickSec, `${where}.tickSec`);
      return { ...common, kind: a.kind, beamTickTicks, beamTickSec: beamTickTicks / TICK_HZ };
    }
    case 'chain':
      return {
        ...common,
        kind: a.kind,
        jumps: a.jumps,
        jumpRangeTiles: a.jumpRangeTiles,
        jumpRangeSq: a.jumpRangeTiles * a.jumpRangeTiles,
        falloffPct: a.falloffPct,
      };
    case 'spawner':
      return { ...common, kind: a.kind, ally: a.ally, maxAlive: a.maxAlive };
    default:
      return assertNever(a);
  }
}

function compileEffect(ctx: Ctx, e: EffectDef, where: string): CompiledEffect {
  switch (e.status) {
    case 'chilled':
    case 'marked':
      return { status: e.status, pct: e.pct, durationTicks: ticks(ctx, e.durationSec, where) };
    case 'soaked':
    case 'pinned':
    case 'stasis':
    case 'unnerved':
      return { status: e.status, durationTicks: ticks(ctx, e.durationSec, where) };
    case 'corroded':
      return { status: e.status, stacks: e.stacks, maxStacks: e.maxStacks };
    default:
      return assertNever(e);
  }
}
