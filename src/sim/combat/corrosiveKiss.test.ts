// Corrosive Kiss (T562; design/towers.md Gloop [B]): a Corroded that carries a shield slow halves
// every shield the unit regains while the stacks hold: its own regeneration (systems/status.ts),
// a shield aura's (enemyAbilities/shieldAura.ts) and a pulse's (enemyAbilities/pulse.ts). The
// strongest slow wins, a plain Corroded never lifts it, and it ends with the stacks.
import { describe, expect, it } from 'vitest';
import type { CompiledEffect, CompiledPulse, CompiledShieldAura } from '../../content/compiled.ts';
import { compileContent } from '../../content/compile.ts';
import { CORRODED_STACK_SEC } from '../../content/rules.ts';
import { FIXTURE } from '../../content/__fixtures__/content.ts';
import { secToTicks } from '../../shared/time.ts';
import { enemyDef, setup, spawn } from '../__fixtures__/combat.ts';
import { restoreShields } from '../enemyAbilities/pulse.ts';
import { shieldAuraPass } from '../enemyAbilities/shieldAura.ts';
import { status } from '../systems/status.ts';
import { applyEffects } from './damage.ts';

const KISS: CompiledEffect = { status: 'corroded', stacks: 3, maxStacks: 12, shieldRegenMul: 0.5 };
const PLAIN: CompiledEffect = { status: 'corroded', stacks: 3, maxStacks: 3, shieldRegenMul: 1 };
const crystal = { faction: 'aelari', body: 'crystalline' } as const;
/** Regenerates 1 a tick with no delay, so one status pass shows the rate. */
const regen = enemyDef('fx_regen', {
  ...crystal,
  hp: 1000,
  shield: { hp: 10_000, regenPerTick: 1, regenDelayTicks: 0 },
});
const SHIELD = Object.freeze({ hp: 20, regenPerTick: 0, regenDelayTicks: 60 });
const AURA: CompiledShieldAura = Object.freeze({ radiusTiles: 2, radiusSq: 4, shieldPerTick: 1 });
const cantor = enemyDef('fx_cantor', { ...crystal, shield: SHIELD, shieldAura: AURA });
const ally = enemyDef('fx_glimmer', { ...crystal, shield: SHIELD });
const PULSE: CompiledPulse = Object.freeze({
  everyTicks: 60,
  tellTicks: 15,
  radiusTiles: 2,
  radiusSq: 4,
  shield: 5,
});

describe('Corrosive Kiss: Corroded enemies regenerate shields 50% slower', () => {
  it('halves the unit’s own regeneration while the stacks hold, then lifts with them', () => {
    const { state } = setup();
    const kissed = spawn(state, regen);
    const plain = spawn(state, regen);
    kissed.shieldHp = 0;
    plain.shieldHp = 0;
    applyEffects(kissed, [KISS]);
    applyEffects(plain, [PLAIN]);
    status(state);
    expect([kissed.shieldHp, plain.shieldHp]).toEqual([0.5, 1]);
    for (let i = 1; i < secToTicks(CORRODED_STACK_SEC); i++) status(state);
    expect([kissed.corrodedStacks, kissed.corrodedShieldMul]).toEqual([0, 1]);
    const before = kissed.shieldHp;
    status(state);
    expect(kissed.shieldHp).toBe(before + 1);
  });

  it('keeps the strongest slow: a plain Corroded refreshes the stacks but never lifts it', () => {
    const { state } = setup();
    const e = spawn(state, regen);
    applyEffects(e, [KISS]);
    applyEffects(e, [PLAIN]);
    expect([e.corrodedStacks, e.corrodedShieldMul]).toEqual([3, 0.5]); // its own max 3 caps the add
    applyEffects(e, [{ ...KISS, shieldRegenMul: 0.8 }]);
    expect(e.corrodedShieldMul).toBe(0.5);
  });

  it('halves what a Cantor’s aura restores to a kissed ally', () => {
    const { state, ctx } = setup();
    spawn(state, cantor, { dist: 2 });
    const kissed = spawn(state, ally, { dist: 2.5 });
    const plain = spawn(state, ally, { dist: 1.5 });
    kissed.shieldHp = 0;
    plain.shieldHp = 0;
    applyEffects(kissed, [KISS]);
    shieldAuraPass(state, ctx);
    shieldAuraPass(state, ctx);
    expect([kissed.shieldHp, plain.shieldHp]).toEqual([1, 2]);
  });

  it('halves what a shield pulse restores to a kissed unit', () => {
    const { state } = setup();
    const src = spawn(state, ally, { dist: 2 });
    const kissed = spawn(state, ally, { dist: 2.5 });
    src.shieldHp = 0;
    kissed.shieldHp = 0;
    applyEffects(kissed, [KISS]);
    expect(restoreShields(state, src, PULSE)).toBe(2);
    expect([src.shieldHp, kissed.shieldHp]).toEqual([5, 2.5]);
  });

  it('compiles `shieldRegenSlowPct` to the multiplier (1 without it)', () => {
    const m = FIXTURE.towers.fx_mortar;
    const raw = {
      ...FIXTURE,
      towers: {
        ...FIXTURE.towers,
        fx_mortar: {
          ...m,
          specs: {
            a: m.specs!.a,
            b: {
              ...m.specs!.b,
              effects: [
                { status: 'corroded', stacks: 3, maxStacks: 12, shieldRegenSlowPct: 0.5 },
              ] as const,
            },
          },
        },
      },
    };
    const towers = compileContent(raw).towers;
    expect(towers.fx_mortar.specs?.b.effects).toEqual([KISS]);
    expect(compileContent(FIXTURE).towers.fx_mortar.specs?.b.effects).toEqual([PLAIN]);
  });
});
