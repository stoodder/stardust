// T407a: the Stasis status (systems/status.ts; enemies.md § 2.4), its interrupt hook
// (`isInterrupted`) on the dig and the hush, and the Sprinkler's tier-3 Soak and specs (Flash
// Freeze's burst, Cloudburst over air) with the live data on fx_map: road `a` (0,0) → (2,0) →
// (2,3) → (3,3) → (3,4) → (5,4), and the air lane `sky`, (2,0) to (5,4).
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledContent } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { BOSS_CONVERTED_CHILL, statusMask } from '../content/rules.ts';
import type { IdSpace, WaveTag } from '../content/types.ts';
import { MAP, WALKER, enemyDef, placeTower, setup, spawn } from './__fixtures__/combat.ts';
import { FIXTURE_CONTENT, fixtureConfig } from './__fixtures__/sim.ts';
import { hasStatusIn } from './bonuses.ts';
import { applyDamage, applyEffects } from './combat/damage.ts';
import { burrowTelling, surfaceTicks } from './enemyAbilities/burrow.ts';
import { enemyAbilities } from './enemyAbilities/index.ts';
import type { SimEvent } from './events.ts';
import { gateRefusals } from './gates.ts';
import type { SimState } from './state.ts';
import { applyStasis, inStasis, isInterrupted, status } from './systems/status.ts';
import { enemySpeedPerTick, movement } from './systems/movement.ts';
import { towers } from './systems/towers.ts';

const LIVE = compileContent(RAW_CONTENT);
const SPRINKLER = LIVE.towers.sprinkler;
const FLASH_FREEZE = SPRINKLER.specs!.a; // the Sprinkler's specs are built (T407a)
const CLOUDBURST = SPRINKLER.specs!.b;
const PUFFWING = LIVE.enemies.puffwing;
const DIGGER = LIVE.enemies.digger;
const MOTE = LIVE.enemies.mote;
const BOSS = enemyDef('fx_boss', { boss: LIVE.enemies.chitterbloom.boss });
const SKY = MAP.routes.sky!; // fx_map has the air lane `sky`
const SRC = { kind: 'ability', slot: 1 } as const;

type Ev = SimEvent<IdSpace>;
const ofType = <T extends Ev['type']>(state: SimState, type: T): Extract<Ev, { type: T }>[] =>
  state.events.filter((e): e is Extract<Ev, { type: T }> => e.type === type);

describe('Stasis (enemies.md § 2.4)', () => {
  it('freezes a non-boss, which still takes damage, then gives 2× immunity', () => {
    const { state } = setup();
    const e = spawn(state, WALKER, { dist: 2 });
    expect(applyStasis(e, 60)).toBe(true);
    expect(inStasis(e) && isInterrupted(e)).toBe(true);
    expect(hasStatusIn(e, statusMask(['stasis']))).toBe(true);
    expect(enemySpeedPerTick(e)).toBe(0);
    applyDamage(state, e, 5, 'kinetic', SRC);
    expect(e.hp).toBe(WALKER.hp - 5);
    // It lasts 60 ticks counting the one it lands on (towers hit after movement): 59 still steps.
    for (let i = 0; i < 59; i++) {
      status(state);
      movement(state);
    }
    expect(e.dist).toBe(2);
    expect(e.stasisTicks).toBe(1);
    status(state);
    expect(inStasis(e)).toBe(false);
    movement(state);
    expect(e.dist).toBeGreaterThan(2);
    // Immunity: 2 × 60 ticks, from when the Stasis ends; nothing lands meanwhile.
    expect(e.stasisImmuneTicks).toBe(120);
    expect(applyStasis(e, 60)).toBe(false);
    for (let i = 0; i < 119; i++) status(state);
    expect(applyStasis(e, 60)).toBe(false);
    status(state);
    expect(applyStasis(e, 30)).toBe(true);
    expect(e.stasisImmuneTicks).toBe(60);
  });

  it("never extends or stacks: a second Stasis while one runs doesn't land", () => {
    const { state } = setup();
    const e = spawn(state, WALKER, { dist: 2 });
    applyStasis(e, 60);
    status(state);
    expect(applyStasis(e, 120)).toBe(false);
    expect(e.stasisTicks).toBe(59);
    expect(e.stasisImmuneTicks).toBe(120);
  });

  it('turns into Chilled 50% on a boss (not halved again) and interrupts nothing (D101)', () => {
    const { state } = setup();
    const boss = spawn(state, BOSS, { dist: 2 });
    expect(applyStasis(boss, 60)).toBe(false);
    expect(boss.stasisTicks).toBe(0);
    expect(boss.stasisImmuneTicks).toBe(0);
    expect(isInterrupted(boss)).toBe(false);
    expect(boss.chillPct).toBe(BOSS_CONVERTED_CHILL);
    expect(boss.chillTicks).toBe(60);
    // An ordinary chill on a boss is still halved; the converted one already won.
    applyEffects(boss, [{ status: 'chilled', pct: 0.6, durationTicks: 90 }]);
    expect(boss.chillPct).toBe(BOSS_CONVERTED_CHILL);
  });

  it('lands through on-hit effects, but never on an untouchable (burrowed) unit', () => {
    const { state } = setup();
    const e = spawn(state, WALKER, { dist: 2 });
    applyEffects(e, [{ status: 'stasis', durationTicks: 60 }]);
    expect(e.stasisTicks).toBe(60);
    const d = spawn(state, DIGGER, { dist: 3 });
    d.burrowed = true;
    applyEffects(d, [{ status: 'stasis', durationTicks: 60 }]);
    expect(d.stasisTicks).toBe(0);
  });
});

describe('the interrupt hook', () => {
  it('cancels a dig mid-tell and restarts the surface stretch', () => {
    const { state, ctx } = setup();
    const burrow = DIGGER.burrow!;
    const d = spawn(state, DIGGER, { dist: 1 });
    const up = surfaceTicks(burrow);
    enemyAbilities(state, ctx); // first tick alive: the surface stretch starts
    for (let i = 0; i < up - burrow.tellTicks; i++) enemyAbilities(state, ctx);
    expect(burrowTelling(d, burrow)).toBe(true);
    applyStasis(d, 30);
    enemyAbilities(state, ctx);
    expect(burrowTelling(d, burrow)).toBe(false);
    expect(d.abilityTicks).toBe(up);
    // Before the tell, Stasis lets the stretch run: free by then, it digs a full stretch later.
    let ticks = 0;
    while (!d.burrowed && ticks < 2 * up) {
      status(state);
      enemyAbilities(state, ctx);
      ticks++;
    }
    expect(ticks).toBe(up);
  });

  it("blocks a hush from starting and cancels one under way (the runner runs on)", () => {
    const { state, ctx } = setup();
    const flee: readonly WaveTag[] = ['fleeing'];
    const m = spawn(state, MOTE, { dist: 3 });
    const v = spawn(state, WALKER, { dist: 3.2, tags: flee });
    applyStasis(m, 60);
    enemyAbilities(state, ctx);
    expect(m.hushUid).toBe(0);
    expect(ofType(state, 'HushStarted')).toEqual([]);
    // Free again: the hush starts; a Stasis mid-tell lets the runner go, hush unspent.
    m.stasisTicks = 0;
    m.stasisImmuneTicks = 0;
    enemyAbilities(state, ctx);
    expect(m.hushUid).toBe(v.uid);
    applyStasis(m, 60);
    enemyAbilities(state, ctx);
    expect(m.hushUid).toBe(0);
    expect(v.hushUid).toBe(0);
    expect(m.heavy).toBe(false);
    expect(v.alive).toBe(true);
  });
});

describe('the Sprinkler (T407a, T321)', () => {
  it('Soaks for 3 s from tier 3', () => {
    const { state, ctx } = setup();
    placeTower(state, SPRINKLER, 1, 1, 3);
    const e = spawn(state, WALKER, { dist: 2 }); // (2, 0): in range of (1.5, 1.5)
    towers(state, ctx);
    expect(e.soakedTicks).toBe(180);
    expect(e.chillPct).toBe(0.35);
  });

  it('Flash Freeze: Stasis 1.0 s every 8 s on top of the chill each second', () => {
    const { state, ctx } = setup();
    expect(FLASH_FREEZE.name).toBe('Flash Freeze');
    const t = placeTower(state, SPRINKLER, 1, 1, FLASH_FREEZE);
    const e = spawn(state, WALKER, { dist: 2 });
    towers(state, ctx);
    // The first burst goes off with the first pulse, on the first enemy in range.
    expect(ofType(state, 'PulseBurst')).toEqual([
      { type: 'PulseBurst', towerUid: t.uid, x: 1.5, y: 1.5, radiusTiles: 2.3, frozen: 1 },
    ]);
    expect(e.stasisTicks).toBe(60);
    expect(e.chillPct).toBe(0.35);
    expect(e.soakedTicks).toBe(180);
    expect(t.burstTicks).toBe(480);
    let bursts = 0;
    let pulses = 0;
    for (let i = 1; i <= 480; i++) {
      state.events.length = 0;
      status(state);
      e.hp = WALKER.hp; // keep it alive and in range
      towers(state, ctx);
      bursts += ofType(state, 'PulseBurst').length;
      pulses += ofType(state, 'ProjectileFired').length;
    }
    expect(bursts).toBe(1); // 8 s later, at tick 480
    expect(pulses).toBe(8); // the chill pulse every second meanwhile
    // That burst came while it was immune (60 frozen + 120 immune < 480): it froze it again.
    expect(e.stasisTicks).toBe(60);
  });

  it("Flash Freeze's burst on a boss is Chilled 50%; an immune unit isn't counted", () => {
    const { state, ctx } = setup();
    placeTower(state, SPRINKLER, 1, 1, FLASH_FREEZE);
    const boss = spawn(state, BOSS, { dist: 2 });
    const e = spawn(state, WALKER, { dist: 2.1 });
    e.stasisImmuneTicks = 10;
    towers(state, ctx);
    expect(ofType(state, 'PulseBurst')[0]?.frozen).toBe(0);
    expect(boss.stasisTicks).toBe(0);
    expect(boss.chillPct).toBe(BOSS_CONVERTED_CHILL);
  });

  it('Cloudburst: radius 2.8 and it hits air, Chilling and Soaking flyers', () => {
    const { state, ctx } = setup();
    expect(CLOUDBURST.name).toBe('Cloudburst');
    expect(CLOUDBURST.targets).toEqual({ ground: true, air: true });
    expect(CLOUDBURST.attack!.rangeTiles).toBe(2.8);
    expect(SPRINKLER.tiers[2].targets.air).toBe(false);
    placeTower(state, SPRINKLER, 1, 1, CLOUDBURST);
    const flyer = spawn(state, PUFFWING, { route: SKY, dist: 0.5 }); // (2.3, 0.4)
    towers(state, ctx);
    expect(flyer.chillPct).toBe(0.35);
    expect(flyer.soakedTicks).toBe(180);
    expect(flyer.stasisTicks).toBe(0);
  });

  it('plays: no gate refuses its specs (status.stasis lifted)', () => {
    const content: CompiledContent<IdSpace> = {
      ...FIXTURE_CONTENT,
      towers: { ...FIXTURE_CONTENT.towers, sprinkler: SPRINKLER },
    };
    const cfg = fixtureConfig({
      content,
      loadout: ['sprinkler'],
      specsUnlocked: ['sprinkler'],
    });
    expect(gateRefusals(cfg)).toEqual([]);
  });
});
