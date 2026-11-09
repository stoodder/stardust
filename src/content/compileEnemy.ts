// Enemy compilation: seconds to ticks, optional fields resolved to a value or null. The enemy
// abilities (burrow, split, huddle, boss; T300a) compile here; the sim runs them in
// sim/enemyAbilities/ (T304c). Their ids (a split's or a spawn's enemy) are checked by validate().
import { perSecToPerTick } from '../shared/time.ts';
import type {
  CompiledBoss,
  CompiledBossPhase,
  CompiledBurrow,
  CompiledEnemyDef,
  CompiledHuddle,
} from './compiled.ts';
import { ticks, type Ctx } from './compileHelpers.ts';
import type { BossDef, BurrowDef, EnemyDef, HuddleDef } from './types.ts';

export function compileEnemy<Id extends string>(ctx: Ctx, def: EnemyDef<Id>): CompiledEnemyDef<Id> {
  const where = `enemies.${def.id}`;
  return {
    id: def.id,
    name: def.name,
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
            regenDelayTicks: ticks(ctx, def.shield.regenDelaySec, `${where}.shield.regenDelaySec`),
          },
    speedTilesPerTick: perSecToPerTick(def.speedTilesPerSec),
    leak: def.leak,
    bounty: def.bounty,
    spawnIntervalTicks: ticks(ctx, def.spawnIntervalSec, `${where}.spawnIntervalSec`),
    traits: def.traits,
    tells: def.tells,
    restValue: def.restValue ?? 1,
    carrierYoung: def.carrier?.young ?? 0,
    burrow: def.burrow === undefined ? null : compileBurrow(ctx, def.burrow, `${where}.burrow`),
    split: def.split === undefined ? null : { enemy: def.split.enemy, count: def.split.count },
    huddle: def.huddle === undefined ? null : compileHuddle(def.huddle),
    boss: def.boss === undefined ? null : compileBoss(ctx, def.boss, `${where}.boss`),
    neutral: def.neutral === true,
    sprites: def.sprites,
  };
}

function compileBurrow(ctx: Ctx, b: BurrowDef, where: string): CompiledBurrow {
  return {
    everyTicks: ticks(ctx, b.everySec, `${where}.everySec`),
    durationTicks: ticks(ctx, b.durationSec, `${where}.durationSec`),
    speedMul: b.speedMul,
    tellTicks: ticks(ctx, b.tellSec, `${where}.tellSec`),
  };
}

function compileHuddle(h: HuddleDef): CompiledHuddle {
  return {
    radiusTiles: h.radiusTiles,
    radiusSq: h.radiusTiles * h.radiusTiles,
    regenPerTick: perSecToPerTick(h.regenPerSec),
  };
}

function compileBoss(ctx: Ctx, b: BossDef, where: string): CompiledBoss {
  const phases = b.phases.map((p, i): CompiledBossPhase => {
    const w = `${where}.phases[${i}]`;
    return {
      fromPct: p.fromPct,
      spawn:
        p.spawn === undefined
          ? null
          : {
              enemy: p.spawn.enemy,
              count: p.spawn.count,
              everyTicks: ticks(ctx, p.spawn.everySec, `${w}.spawn.everySec`),
            },
      burrow:
        p.burrow === undefined
          ? null
          : {
              times: p.burrow.times,
              durationTicks: ticks(ctx, p.burrow.durationSec, `${w}.burrow.durationSec`),
              surfaceSpawn:
                p.burrow.surfaceSpawn === undefined
                  ? null
                  : { enemy: p.burrow.surfaceSpawn.enemy, count: p.burrow.surfaceSpawn.count },
            },
      hastePct: p.hastePct ?? 0,
      huddle: p.huddle === undefined ? null : compileHuddle(p.huddle),
    };
  });
  return { phases, ending: b.ending, endAtPct: b.endAtPct };
}
