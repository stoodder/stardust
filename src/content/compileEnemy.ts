// Enemy compilation: seconds to ticks, optional fields resolved to a value or null. The enemy
// abilities (burrow, split, huddle, boss: T300a; pulse, blink, and the derived hush and cloak
// flags: T400a) compile here; the sim runs them in sim/enemyAbilities/. Their ids (a split's or a
// spawn's enemy) are checked by validate().
import { perSecToPerTick } from '../shared/time.ts';
import type {
  CompiledBlink,
  CompiledBoss,
  CompiledBossPhase,
  CompiledBurrow,
  CompiledEnemyDef,
  CompiledHuddle,
  CompiledPulse,
} from './compiled.ts';
import { ticks, type Ctx } from './compileHelpers.ts';
import type { BlinkDef, BossDef, BurrowDef, EnemyDef, HuddleDef, PulseDef } from './types.ts';

/**
 * Whether a unit hushes under the hush rule (enemies.md § 5.4): every non-boss Hollow unit, except
 * a gatherer (a Maw's one hush is a gather) and a neutral one. Derived, never authored.
 */
export function hushesOf(def: Pick<EnemyDef, 'faction' | 'boss' | 'neutral' | 'traits'>): boolean {
  return (
    def.faction === 'hollow' &&
    def.boss === undefined &&
    def.neutral !== true &&
    !def.traits.includes('gathering')
  );
}

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
    pulse: def.pulse === undefined ? null : compilePulse(ctx, def.pulse, `${where}.pulse`),
    blink: def.blink === undefined ? null : compileBlink(ctx, def.blink, `${where}.blink`),
    hushes: hushesOf(def),
    cloaked: def.traits.includes('cloaked'),
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

function compilePulse(ctx: Ctx, p: PulseDef, where: string): CompiledPulse {
  return {
    everyTicks: ticks(ctx, p.everySec, `${where}.everySec`),
    tellTicks: ticks(ctx, p.tellSec, `${where}.tellSec`),
    radiusTiles: p.radiusTiles,
    radiusSq: p.radiusTiles * p.radiusTiles,
    shield: p.shield,
  };
}

function compileBlink(ctx: Ctx, b: BlinkDef, where: string): CompiledBlink {
  return {
    everyTicks: ticks(ctx, b.everySec, `${where}.everySec`),
    tellTicks: ticks(ctx, b.tellSec, `${where}.tellSec`),
    tiles: b.tiles,
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
      pulse: p.pulse === undefined ? null : compilePulse(ctx, p.pulse, `${w}.pulse`),
      blink: p.blink === undefined ? null : compileBlink(ctx, p.blink, `${w}.blink`),
    };
  });
  return { phases, ending: b.ending, endAtPct: b.endAtPct };
}
