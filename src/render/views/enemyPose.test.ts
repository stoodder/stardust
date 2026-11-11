import { describe, expect, it } from 'vitest';
import { battleConfig } from '../../app/battleSetup.ts';
import { createSim, type Enemy, type Sim } from '../../sim/index.ts';
import type { IdSpace } from '../../content/types.ts';
import {
  blankFacts,
  frayBand,
  FRAY1_PCT,
  FRAY2_PCT,
  interruptsOneShot,
  isStride,
  oneShotFor,
  poseFacts,
  statePose,
  strideFor,
  type EnemyPose,
  type PoseFacts,
} from './enemyPose.ts';

const calm: PoseFacts = {
  leaving: false,
  burrowed: false,
  invulnerable: false,
  telling: null,
  panic: false,
  heavy: false,
  phased: false,
  shieldDown: false,
};

describe('statePose (T312b)', () => {
  it('ranks leaving, burrowed, invulnerable, a tell, panic, then the walk', () => {
    expect(statePose(calm)).toBe('walk');
    expect(statePose({ ...calm, panic: true })).toBe('panic');
    expect(statePose({ ...calm, panic: true, telling: 'tell' })).toBe('tell');
    expect(statePose({ ...calm, telling: 'dig' })).toBe('dig');
    expect(statePose({ ...calm, telling: 'dig', invulnerable: true })).toBe('puff');
    expect(statePose({ ...calm, invulnerable: true, burrowed: true })).toBe('under');
    expect(statePose({ ...calm, burrowed: true, leaving: true })).toBe('flee');
    // Heavy (T440a) is the walk of a unit that has hushed someone: a tell or panic outranks it.
    expect(statePose({ ...calm, heavy: true })).toBe('heavy');
    expect(statePose({ ...calm, heavy: true, telling: 'tell' })).toBe('tell');
    expect(statePose({ ...calm, heavy: true, leaving: true })).toBe('flee');
  });

  it('strides on the walk, the Heavy walk, and the glance back (their tempo follows the pace)', () => {
    for (const p of ['walk', 'heavy', 'glance', 'broken', 'fray1', 'fray2'] as const)
      expect(isStride(p)).toBe(true);
    for (const p of ['tell', 'panic', 'flee', 'puff', 'sneeze', 'phase'] as const)
      expect(isStride(p)).toBe(false);
  });

  it('shows Phased as `phase` under leaving, burrowed and invulnerable, over a tell (T530a)', () => {
    expect(statePose({ ...calm, phased: true })).toBe('phase');
    expect(statePose({ ...calm, phased: true, telling: 'tell' })).toBe('phase');
    expect(statePose({ ...calm, phased: true, invulnerable: true })).toBe('puff');
    expect(statePose({ ...calm, phased: true, leaving: true })).toBe('flee');
  });

  it("marches `broken` while a shield-broken boss's shield is down, under its tells (T530a)", () => {
    expect(statePose({ ...calm, shieldDown: true })).toBe('broken');
    expect(statePose({ ...calm, shieldDown: true, telling: 'tell' })).toBe('tell');
    expect(statePose({ ...calm, shieldDown: true, leaving: true })).toBe('flee');
    expect(oneShotFor('broken', 'walk')).toBeNull();
  });

  it('frays the walk by HP band: whole, then fray1 below two thirds, fray2 below a third', () => {
    expect(frayBand(90, 90)).toBe(0);
    expect(frayBand(90 * FRAY1_PCT, 90)).toBe(0);
    expect(frayBand(59, 90)).toBe(1);
    expect(frayBand(90 * FRAY2_PCT, 90)).toBe(1);
    expect(frayBand(29, 90)).toBe(2);
    expect(frayBand(1, 90)).toBe(2);
    expect(frayBand(5, 0)).toBe(0); // nothing to measure against
    expect(strideFor('walk', 0)).toBe('walk');
    expect(strideFor('walk', 1)).toBe('fray1');
    expect(strideFor('walk', 2)).toBe('fray2');
    // Only the walk frays: a tell, the Heavy walk, a glance keep their own frames.
    for (const p of ['tell', 'heavy', 'glance', 'phase', 'broken'] as const)
      expect(strideFor(p, 2)).toBe(p);
  });

  it('plays the sneeze when a sneeze tell ends in a stride, and the surfacing out of the ground', () => {
    expect(oneShotFor('tell', 'walk')).toBe('sneeze');
    expect(oneShotFor('tell', 'panic')).toBe('sneeze');
    // A tell cut short by a phase change, a dig, or the ending is no sneeze.
    for (const next of ['puff', 'under', 'flee', 'dig'] as const) {
      expect(oneShotFor('tell', next)).toBeNull();
    }
    expect(oneShotFor('under', 'walk')).toBe('surface');
    expect(oneShotFor('under', 'dig')).toBe('surface');
    expect(oneShotFor('under', 'flee')).toBeNull();
    expect(oneShotFor('walk', 'dig')).toBeNull();
  });

  it('lets leaving, digging in, and puffing up cut a one-shot short', () => {
    const cut: EnemyPose[] = ['flee', 'under', 'puff'];
    for (const p of ['walk', 'tell', 'dig', 'panic', 'sneeze', 'surface'] as const) {
      expect(interruptsOneShot(p)).toBe(false);
    }
    for (const p of cut) expect(interruptsOneShot(p)).toBe(true);
  });
});

/** Steps `sim` until `pred` holds for some live enemy (up to `max` ticks); returns its pose. */
function poseWhen(
  sim: Sim<IdSpace>,
  pred: (e: Sim<IdSpace>['state']['enemies']['items'][number]) => boolean,
  max = 6000,
): EnemyPose | null {
  const f = blankFacts();
  for (let k = 0; k < max && sim.state.outcome === 'playing'; k++) {
    sim.step();
    const pool = sim.state.enemies;
    for (let i = 0; i < pool.used; i++) {
      const e = pool.items[i]!;
      if (e.alive && e.def !== null && pred(e)) return statePose(poseFacts(e, f));
    }
  }
  return null;
}

type LiveEnemy = Sim<IdSpace>['state']['enemies']['items'][number];

/** The dev boss range with Rivets along the road, wave 1 called. */
function start(): Sim<IdSpace> {
  const sim = createSim(battleConfig('dev_boss', 1));
  const pads = [
    [9, 3],
    [9, 5],
    [7, 1],
    [4, 4],
    [6, 5],
    [12, 5],
    [10, 7],
  ] as const;
  for (const [c, r] of pads) sim.enqueue({ type: 'build', tower: 'rivet', tile: [c, r] });
  sim.enqueue({ type: 'callWave' });
  return sim;
}

const digTell = (e: LiveEnemy): boolean =>
  e.def!.burrow !== null && !e.burrowed && e.abilityTicks > 0 && e.abilityTicks <= 10;
const isBoss = (e: LiveEnemy): boolean => e.def!.boss !== null;

describe('poseFacts on the dev boss range', () => {
  it("reads a Digger's dig tell and burrow", () => {
    const sim = start();
    expect(poseWhen(sim, digTell)).toBe('dig');
    expect(poseWhen(sim, (e) => e.def!.burrow !== null && e.burrowed)).toBe('under');
  });

  it("reads Chitterbloom's sneeze tell, her phase change, her panic, and her flight", () => {
    const sim = start();
    expect(poseWhen(sim, (e) => isBoss(e) && e.abilityTicks === 30 && e.bossPhase === 1)).toBe(
      'tell',
    );
    expect(poseWhen(sim, (e) => isBoss(e) && e.invulnerableTicks > 0)).toBe('puff');
    expect(poseWhen(sim, (e) => isBoss(e) && e.bossPhase === 3 && e.invulnerableTicks === 0)).toBe(
      'panic',
    );
    expect(poseWhen(sim, (e) => isBoss(e) && e.leaving)).toBe('flee');
  });
});

const isWitch = (e: LiveEnemy): boolean => e.def!.id === 'dev_glass_witch';

describe('poseFacts for the Glass Witch (T430b, D123)', () => {
  it('raises her arms through a shield pulse tell and holds the blink pose through a blink tell', () => {
    const sim = createSim(battleConfig('dev_witch', 1));
    sim.enqueue({ type: 'callWave' });
    // Phase 1: her pulse tell is the `tell` pose (no sneeze follows: she has none).
    expect(
      poseWhen(sim, (e) => {
        if (!isWitch(e) || e.def!.boss === null) return false;
        const pulse = e.def!.boss.phases[0]!.pulse;
        return pulse !== null && e.pulseTicks > 0 && e.pulseTicks <= pulse.tellTicks;
      }),
    ).toBe('tell');
    // Phase 2 (pushed there by hand): a blink tell outranks the pulse she keeps.
    const pool = sim.state.enemies;
    const found = pool.items.slice(0, pool.used).find((e) => e.alive && isWitch(e))!;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets her timers directly
    const witch = found as Enemy;
    witch.bossPhase = 2;
    const blink = witch.def!.boss!.phases[1]!.blink!;
    witch.blinkTicks = blink.tellTicks;
    witch.pulseTicks = 1;
    const f = blankFacts();
    expect(statePose(poseFacts(witch, f))).toBe('blink');
    witch.blinkTicks = blink.tellTicks + 1;
    expect(statePose(poseFacts(witch, f))).toBe('tell');
    witch.pulseTicks = 999;
    expect(statePose(poseFacts(witch, f))).toBe('walk');
  });

  it('ranks the blink tell as a tell: a phase change or a retreat outranks it', () => {
    expect(statePose({ ...calm, telling: 'blink' })).toBe('blink');
    expect(statePose({ ...calm, telling: 'blink', invulnerable: true })).toBe('puff');
    expect(statePose({ ...calm, telling: 'blink', leaving: true })).toBe('flee');
    expect(isStride('blink')).toBe(false);
    expect(oneShotFor('blink', 'walk')).toBeNull();
  });
});

const moth = (e: LiveEnemy): boolean => e.def!.id === 'riftmoth';
/** dev_penitent's boss (the only one on its map). */
const penitent = (e: LiveEnemy): boolean => e.def!.boss !== null;

describe('poseFacts for M5 units (T530a)', () => {
  it('folds a Phased Rift Moth into its `phase` pose, and back to the walk when it solidifies', () => {
    const sim = createSim(battleConfig('dev_rift', 1));
    sim.enqueue({ type: 'callWave' });
    expect(poseWhen(sim, (e) => moth(e) && e.phased)).toBe('phase');
    expect(poseWhen(sim, (e) => moth(e) && !e.phased && e.phaseTicks > 40)).toBe('walk');
  });

  it('marches the Penitent `broken` while its shield is down in phase 2, and whole once it re-forms', () => {
    const sim = createSim(battleConfig('dev_penitent', 1));
    sim.enqueue({ type: 'callWave' });
    expect(poseWhen(sim, penitent)).toBe('walk');
    const pool = sim.state.enemies;
    const found = pool.items.slice(0, pool.used).find((e) => e.alive && penitent(e))!;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets its state directly
    const boss = found as Enemy;
    const f = blankFacts();
    boss.shieldHp = 0;
    expect(statePose(poseFacts(boss, f))).toBe('walk'); // phase 1: a broken shield is just down
    boss.bossPhase = 2;
    expect(statePose(poseFacts(boss, f))).toBe('broken');
    boss.shieldHp = 10;
    expect(statePose(poseFacts(boss, f))).toBe('walk'); // re-formed
  });
});

const maw = (e: Enemy): boolean => e.def?.id === 'maw';

describe('poseFacts for the Maw (T640a)', () => {
  it('reaches into its `tell` (mouth agape, tendrils out) while it holds a unit to gather', () => {
    const sim = createSim(battleConfig('dev_maw', 1));
    sim.enqueue({ type: 'callWave' });
    expect(poseWhen(sim, (e) => maw(e) && e.gatherUid === 0)).toBe('walk');
    expect(poseWhen(sim, (e) => maw(e) && e.gatherUid !== 0)).toBe('tell');
  });
});
