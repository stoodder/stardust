// Tower compilation: tier patches resolved into full per-tier definitions, times in ticks.
import { assertNever } from '../shared/types.ts';
import { TICK_HZ, perSecToPerTick } from '../shared/time.ts';
import type {
  CompiledAttack,
  CompiledBomblets,
  CompiledDetect,
  CompiledEffect,
  CompiledField,
  CompiledTier,
  CompiledTowerDef,
  CompiledTowerEconomy,
} from './compiled.ts';
import { mergePatch, periodTicks, ticks, type Ctx } from './compileHelpers.ts';
import type {
  AttackDef,
  AttackKind,
  BombletsDef,
  DetectDef,
  EffectDef,
  FieldDef,
  TierDef,
  TierPatch,
  TowerDef,
  TowerEconomyDef,
} from './types.ts';

const ATTACK_FIELDS: Readonly<Record<AttackKind, readonly string[]>> = {
  hitscan: [],
  projectile: ['projectile', 'speedTilesPerSec'],
  lobbed: ['projectile', 'flightSec', 'splashTiles', 'lead'],
  beam: ['tickSec'],
  chain: ['jumps', 'jumpRangeTiles', 'falloffPct'],
  spawner: ['ally', 'maxAlive', 'latchSec', 'restSec', 'chillPct'],
  pulse: [],
  charge: ['chargeSec', 'splashTiles', 'splashPct'],
  line: ['lengthTiles'],
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
    name: def.name,
    faction: def.faction,
    role: def.role,
    tiers,
    specs,
    links: [], // compileContent fills it from the link registry (compileLinks.ts)
    sprites: { base: def.sprites.base, head: def.sprites.head ?? null, icon: def.sprites.icon },
    lightRadiusTiles: def.lightRadiusTiles ?? null,
    lightRadiusSq: (def.lightRadiusTiles ?? 0) * (def.lightRadiusTiles ?? 0),
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
  const attack =
    tier.attack === undefined ? null : compileAttack(ctx, tier.attack, `${where}.attack`);
  return {
    tier: n,
    name,
    cost: tier.cost,
    targets: { ground: tier.targets.ground, air: tier.targets.air },
    defaultPriority: tier.defaultPriority,
    attack: withDetectCap(ctx, attack, tier.detect, where),
    effects: (tier.effects ?? []).map((e, i) => compileEffect(ctx, e, `${where}.effects[${i}]`)),
    auras: (tier.auras ?? []).map((a) => ({
      kind: a.kind,
      radiusTiles: a.radiusTiles,
      radiusSq: a.radiusTiles * a.radiusTiles,
      stat: a.stat,
      pct: a.pct,
    })),
    detect: tier.detect === undefined ? null : compileDetect(ctx, tier.detect, `${where}.detect`),
    economy: tier.economy === undefined ? null : compileEconomy(tier.economy),
    markArea:
      tier.markArea === undefined
        ? null
        : {
            radiusTiles: tier.markArea.radiusTiles,
            radiusSq: tier.markArea.radiusTiles * tier.markArea.radiusTiles,
            pct: tier.markArea.pct,
          },
    jamMul: tier.jamMul ?? 1,
    lull:
      tier.lull === undefined
        ? null
        : {
            radiusTiles: tier.lull.radiusTiles,
            radiusSq: tier.lull.radiusTiles * tier.lull.radiusTiles,
          },
    field: tier.field === undefined ? null : compileField(ctx, tier.field, `${where}.field`),
  };
}

function compileField(ctx: Ctx, f: FieldDef, where: string): CompiledField {
  return {
    radiusTiles: f.radiusTiles,
    radiusSq: f.radiusTiles * f.radiusTiles,
    chillPct: f.chillPct,
    pulseEveryTicks: ticks(ctx, f.pulseEverySec, `${where}.pulseEverySec`),
    stasisTicks: ticks(ctx, f.stasisSec, `${where}.stasisSec`),
    pullBackTiles: f.pullBackTiles ?? 0,
    pullBackCooldownTicks:
      f.pullBackCooldownSec === undefined
        ? 0
        : ticks(ctx, f.pullBackCooldownSec, `${where}.pullBackCooldownSec`),
  };
}

/**
 * A detecting tier's attack reaches no further than it sees (the Seer's Lantern; D137, D139): the
 * attack carries the detection radius as `detectCapTiles`, and its authored range must fit inside.
 */
function withDetectCap(
  ctx: Ctx,
  attack: CompiledAttack | null,
  detect: DetectDef | undefined,
  where: string,
): CompiledAttack | null {
  if (attack === null || detect === undefined) return attack;
  if (attack.rangeTiles > detect.radiusTiles) {
    ctx.errors.push(
      `${where}.attack.rangeTiles: a tower that detects can't reach past its detection radius ` +
        `(${attack.rangeTiles} > ${detect.radiusTiles})`,
    );
  }
  return { ...attack, detectCapTiles: detect.radiusTiles };
}

function compileDetect(ctx: Ctx, d: DetectDef, where: string): CompiledDetect {
  return {
    radiusTiles: d.radiusTiles,
    radiusSq: d.radiusTiles * d.radiusTiles,
    lingerTicks: d.lingerSec === undefined ? 0 : ticks(ctx, d.lingerSec, `${where}.lingerSec`),
    revealedDamagePct: d.revealedDamagePct ?? 0,
  };
}

function compileEconomy(e: TowerEconomyDef): CompiledTowerEconomy {
  const radius = e.radiusTiles ?? 0;
  return {
    perWave: e.perWave ?? 0,
    perKill: e.perKill ?? 0,
    radiusTiles: radius,
    radiusSq: radius * radius,
    salvageSpeedMul: e.salvageSpeedMul ?? 1,
    salvagePct: e.salvagePct ?? 0,
    interestPct: e.interestPct ?? 0,
    interestCap: e.interestCap ?? 0,
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
    detectCapTiles: 0, // compileTier sets a detecting tier's (`withDetectCap`)
    armorPierce: a.armorPierce ?? 0,
    ignoresArmor: a.ignoresArmor ?? false,
    spinUpTicks: a.spinUpSec === undefined ? 0 : ticks(ctx, a.spinUpSec, `${where}.spinUpSec`),
    targetFilter:
      a.targetFilter === undefined
        ? null
        : { bodies: a.targetFilter.bodies ?? [], armored: a.targetFilter.armored === true },
  };
  switch (a.kind) {
    case 'hitscan':
      return {
        ...common,
        kind: a.kind,
        echo:
          a.echo === undefined
            ? null
            : {
                pct: a.echo.pct,
                radiusTiles: a.echo.radiusTiles,
                radiusSq: a.echo.radiusTiles * a.echo.radiusTiles,
              },
      };
    case 'pulse':
      return {
        ...common,
        kind: a.kind,
        burst:
          a.burst === undefined
            ? null
            : {
                everyTicks: ticks(ctx, a.burst.everySec, `${where}.burst.everySec`),
                effects: a.burst.effects.map((e, i) =>
                  compileEffect(ctx, e, `${where}.burst.effects[${i}]`),
                ),
              },
      };
    case 'projectile': {
      const splash = a.splashTiles ?? 0;
      return {
        ...common,
        kind: a.kind,
        projectile: a.projectile,
        speedTilesPerTick: perSecToPerTick(a.speedTilesPerSec),
        splashTiles: splash,
        splashSq: splash * splash,
        homing: a.homing === true,
        volley: a.volley ?? 1,
      };
    }
    case 'lobbed':
      return {
        ...common,
        kind: a.kind,
        projectile: a.projectile,
        flightTicks: ticks(ctx, a.flightSec, `${where}.flightSec`),
        splashTiles: a.splashTiles,
        splashSq: a.splashTiles * a.splashTiles,
        lead: a.lead,
        bomblets:
          a.bomblets === undefined ? null : compileBomblets(ctx, a.bomblets, `${where}.bomblets`),
      };
    case 'beam': {
      const beamTickTicks = ticks(ctx, a.tickSec, `${where}.tickSec`);
      return {
        ...common,
        kind: a.kind,
        beamTickTicks,
        beamTickSec: beamTickTicks / TICK_HZ,
        rampPctPerTick: perSecToPerTick(a.rampPctPerSec ?? 0),
        rampCap: a.rampCap ?? 1,
        beams: a.beams ?? 1,
      };
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
      return {
        ...common,
        kind: a.kind,
        ally: a.ally,
        maxAlive: a.maxAlive,
        latchTicks: ticks(ctx, a.latchSec, `${where}.latchSec`),
        restTicks: ticks(ctx, a.restSec, `${where}.restSec`),
        chillPct: a.chillPct,
        burrowedDotMul: a.burrowedDotMul ?? 1,
      };
    case 'charge':
      return {
        ...common,
        kind: a.kind,
        chargeTicks: ticks(ctx, a.chargeSec, `${where}.chargeSec`),
        splashTiles: a.splashTiles,
        splashSq: a.splashTiles * a.splashTiles,
        splashPct: a.splashPct,
      };
    case 'line':
      return { ...common, kind: a.kind, lengthTiles: a.lengthTiles };
    default:
      return assertNever(a);
  }
}

const BOMBLET_FIELDS = [
  'count',
  'damage',
  'splashTiles',
  'scatterTiles',
  'flightSec',
  'projectile',
] as const;

function compileBomblets(ctx: Ctx, b: BombletsDef, where: string): CompiledBomblets | null {
  // A spec may patch bomblets onto tier 3's shell, so a partial one is possible here.
  const missing = BOMBLET_FIELDS.filter((f) => !(f in b));
  if (missing.length > 0) {
    ctx.errors.push(`${where}: bomblets are missing ${missing.join(', ')}`);
    return null;
  }
  if (!Number.isInteger(b.count) || b.count < 1) {
    ctx.errors.push(`${where}.count: must be a whole number ≥ 1 (got ${b.count})`);
  }
  if (!(b.damage >= 0)) ctx.errors.push(`${where}.damage: must be ≥ 0 (got ${b.damage})`);
  for (const f of ['splashTiles', 'scatterTiles'] as const) {
    if (!(b[f] > 0)) ctx.errors.push(`${where}.${f}: must be > 0 (got ${b[f]})`);
  }
  const flightTicks = ticks(ctx, b.flightSec, `${where}.flightSec`);
  if (flightTicks < 1) {
    ctx.errors.push(`${where}.flightSec: must last at least one tick (got ${b.flightSec})`);
  }
  return {
    count: b.count,
    damage: b.damage,
    splashTiles: b.splashTiles,
    splashSq: b.splashTiles * b.splashTiles,
    scatterTiles: b.scatterTiles,
    scatterSq: b.scatterTiles * b.scatterTiles,
    flightTicks,
    projectile: b.projectile,
  };
}

function compileEffect(ctx: Ctx, e: EffectDef, where: string): CompiledEffect {
  switch (e.status) {
    case 'chilled':
      return { status: e.status, pct: e.pct, durationTicks: ticks(ctx, e.durationSec, where) };
    case 'marked':
      return {
        status: e.status,
        pct: e.pct,
        durationTicks: ticks(ctx, e.durationSec, where),
        noEvade: e.noEvade === true,
      };
    case 'soaked':
    case 'pinned':
    case 'stasis':
    case 'unnerved':
      return { status: e.status, durationTicks: ticks(ctx, e.durationSec, where) };
    case 'corroded':
      return {
        status: e.status,
        stacks: e.stacks,
        maxStacks: e.maxStacks,
        shieldRegenMul: 1 - (e.shieldRegenSlowPct ?? 0),
      };
    default:
      return assertNever(e);
  }
}
