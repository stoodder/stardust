// M3's content stubs (T300a): Skyhook and Zapcoil (tiers 1–3), the six Act I enemies, and the two
// companion abilities, with the docs' numbers (design/towers.md § 7, enemies.md § 5.1 and § 6,
// core-loop.md § 3.2) and their final sprite ids. createSim refuses each mechanic until its task
// (sim/m3seams.test.ts), so no live map uses them yet.
import { describe, expect, it } from 'vitest';
import { compileContent } from './compile.ts';
import { RAW_CONTENT } from './registry.ts';
import { SPRITES } from './sprites/index.ts';

const content = compileContent(RAW_CONTENT);
const SPRITE_IDS = new Set<string>(SPRITES.map((s) => s.id));

describe('M3 towers', () => {
  it('Skyhook: 14 → 20 explosive flak with a 0.8 burst, air only; T3 1.3/s, range 4', () => {
    const t = content.towers.skyhook;
    expect(t).toMatchObject({ name: 'Skyhook', faction: 'everglow', specs: null });
    expect(t.tiers.map((x) => x.cost)).toEqual([110, 90, 165]);
    for (const tier of t.tiers) {
      expect(tier.targets).toEqual({ ground: false, air: true });
      expect(tier.defaultPriority).toBe('first');
      expect(tier.attack).toMatchObject({
        kind: 'projectile',
        type: 'explosive',
        splashTiles: 0.8,
      });
    }
    expect(
      t.tiers.map((x) => [x.attack?.damage, x.attack?.cooldownTicks, x.attack?.rangeTiles]),
    ).toEqual([
      [14, 60, 3.5],
      [20, 60, 3.5],
      [20, 46, 4],
    ]);
  });

  it('Zapcoil: 10 → 14 energy, chains to 3 (−20% a jump), then 4 at 1.2/s; ground and air', () => {
    const t = content.towers.zapcoil;
    expect(t).toMatchObject({ name: 'Zapcoil', faction: 'vrell', specs: null });
    expect(t.tiers.map((x) => x.cost)).toEqual([120, 95, 180]);
    const chain = t.tiers.map((x) =>
      x.attack?.kind === 'chain'
        ? [x.attack.damage, x.attack.jumps + 1, x.attack.cooldownTicks, x.attack.falloffPct]
        : null,
    );
    expect(chain).toEqual([
      [10, 3, 60, 0.2],
      [14, 3, 60, 0.2],
      [14, 4, 50, 0.2],
    ]);
    expect(t.tiers[0].targets).toEqual({ ground: true, air: true });
    expect(t.tiers[0].attack).toMatchObject({ rangeTiles: 2.5, jumpRangeTiles: 1.5 });
  });
});

/** An enemy's roster row: HP, armor, speed (tiles/s), leak, bounty. */
function row(id: keyof typeof content.enemies): unknown {
  const e = content.enemies[id];
  return [e.hp, e.armor, Math.round(e.speedTilesPerTick * 60 * 100) / 100, e.leak, e.bounty];
}

describe('M3 enemies', () => {
  it('has the roster numbers (enemies.md § 5.1 and § 6)', () => {
    expect(row('puffwing')).toEqual([40, 0, 1.1, 1, 5]);
    expect(row('bunchling')).toEqual([60, 0, 0.9, 1, 5]);
    expect(row('digger')).toEqual([70, 1, 0.9, 1, 7]);
    expect(row('elder')).toEqual([160, 2, 0.6, 2, 12]);
    expect(row('chitterbloom')).toEqual([2500, 2, 0.4, 2, 0]);
    expect(content.enemies.puffwing.layer).toBe('air');
  });

  it('compiles their abilities', () => {
    const e = content.enemies;
    expect(e.digger.burrow).toEqual({
      everyTicks: 360,
      durationTicks: 120,
      speedMul: 1.5,
      tellTicks: 48,
    });
    expect(e.bunchling.split).toEqual({ enemy: 'nibbler', count: 3 });
    expect(e.elder.huddle).toMatchObject({ radiusTiles: 1.5, radiusSq: 2.25 });
    expect(e.elder.huddle!.regenPerTick * 60).toBeCloseTo(4); // elder has a huddle
    const boss = e.chitterbloom.boss!; // chitterbloom is the boss
    expect(boss).toMatchObject({ ending: 'driveOff', endAtPct: 0 });
    expect(boss.phases.map((p) => p.fromPct)).toEqual([1, 0.6, 0.25]);
    expect(boss.phases[0]!.spawn).toEqual({ enemy: 'nibbler', count: 2, everyTicks: 300 });
    expect(boss.phases[1]!.burrow).toEqual({
      times: 2,
      durationTicks: 180,
      surfaceSpawn: { enemy: 'bunchling', count: 1 },
    });
    expect(boss.phases[2]).toMatchObject({ hastePct: 0.5, spawn: null, burrow: null });
    for (const id of ['nibbler', 'puffwing', 'digger', 'elder'] as const) {
      expect(e[id].boss, id).toBeNull();
    }
  });

  it('Gerald is neutral: no leak, no bounty, an air unit (T304a settles the path fork)', () => {
    expect(content.enemies.gerald).toMatchObject({
      name: 'Gerald',
      neutral: true,
      leak: 0,
      bounty: 0,
      layer: 'air',
      faction: 'everglow',
    });
    expect(content.enemies.nibbler.neutral).toBe(false);
  });
});

describe('M3 abilities', () => {
  it("Time Dilation: QUILL's; all enemies −40% (bosses −20%) for 6 s; 60 s", () => {
    expect(content.abilities.time_dilation).toMatchObject({
      companion: 'quill',
      cooldownTicks: 3600,
      cooldownWaves: 0,
      effect: { kind: 'slowAll', slowPct: 0.4, bossSlowPct: 0.2, durationTicks: 360 },
    });
  });

  it("Clearance Sale: Zibzab's; the next 3 purchases 40% off; once per 4 waves", () => {
    expect(content.abilities.clearance_sale).toMatchObject({
      companion: 'zibzab',
      cooldownTicks: 0,
      cooldownWaves: 4,
      effect: { kind: 'discount', pct: 0.4, charges: 3 },
    });
  });
});

describe('final sprite ids (T311a/T311b replace the art, never the ids)', () => {
  it('names registered sprites by the convention', () => {
    for (const id of ['skyhook', 'zapcoil'] as const) {
      expect(content.towers[id].sprites).toEqual({
        base: `tower.${id}`,
        head: `tower.${id}_head`,
        icon: `icon.tower.${id}`,
      });
    }
    const enemies = ['puffwing', 'bunchling', 'digger', 'elder', 'chitterbloom', 'gerald'] as const;
    for (const id of enemies) {
      const e = content.enemies[id];
      expect(e.sprites, id).toEqual({ body: `enemy.${id}`, icon: `icon.enemy.${id}` });
    }
    expect(content.abilities.time_dilation.sprites.icon).toBe('icon.ability.time_dilation');
    expect(content.abilities.clearance_sale.sprites.icon).toBe('icon.ability.clearance_sale');
    expect(SPRITE_IDS.has('projectile.skyhook_flak')).toBe(true);
  });

  it('gives every live tower and enemy a display name (T119)', () => {
    for (const t of Object.values(content.towers)) expect(t.name.length, t.id).toBeGreaterThan(0);
    for (const e of Object.values(content.enemies)) expect(e.name.length, e.id).toBeGreaterThan(0);
    expect(content.enemies.hauler.name).toBe('Brood Hauler');
    expect(content.enemies.chitterbloom.name).toBe('Matriarch Chitterbloom');
  });
});
