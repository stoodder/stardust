// T832: the finale's HUD. The clock's words and fills (the Bore, the countdown, the counter at 0),
// the choir's Voices meter (its Hushed pips from the floor), and the binding on fin_m01 itself:
// phase-scoped (the Bore in Phase 1 only, the countdown in Phase 2, the counter at 0 at Dawn), the
// phase banners (none in a replay), a held wave, the halted choir, and Directive 0's dark slot kept
// apart from a revocation and Radio Silence.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSim, type Sim, type SimState } from '../sim/index.ts';
import { setPhase } from '../sim/phases.ts';
import { lockAbility } from '../sim/revoke.ts';
import type { IdSpace } from '../content/types.ts';
import { TICK_HZ } from '../shared/time.ts';
import { revokedHud } from '../ui/hud/revokedState.ts';
import {
  choirHalted,
  FINALE_CLOCK_W,
  finaleClock,
  finalePhase,
  nextHeld,
  phaseBanner,
} from '../ui/hud/finaleState.ts';
import { hud } from '../ui/state.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost, type Host } from './host.ts';
import { choirMeterView, bindEscortMeter } from './hudEscort.ts';
import {
  bindFinaleHud,
  BORE_FULL,
  boreClock,
  COUNTER_LABEL,
  counterClock,
  PHASE_ONE_KICKER,
  PHASE_TWO_BANNER,
  phasedMap,
} from './hudFinale.ts';
import { bindRevoked, DIRECTIVE_TEXT, RADIO_SILENCE_TEXT, revokedText } from './revoked.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

let offs: (() => void)[] = [];
afterEach(() => {
  for (const off of offs) off();
  offs = [];
});

function mut(s: Sim<IdSpace>): SimState {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  return s.state as unknown as SimState;
}

/** fin_m01 on its reference profile (no save), with QUILL walking: Time Dilation in slot 2. */
function finale(): Host<IdSpace> {
  const cfg = battleConfig('fin_m01', 1, null);
  const sim = createSim({
    ...cfg,
    companion: 'quill',
    abilities: { ...cfg.abilities, slot2: 'time_dilation', slot2State: 'present' },
  });
  return createHost(sim);
}

describe('the clock (pure)', () => {
  it('reads the Bore in whole percent, floored, and "Full" once it breaks through', () => {
    expect(boreClock('Deep Bore', { filled: 0, full: false }, 1000)).toEqual({
      kind: 'bore',
      label: 'Deep Bore',
      value: '0%',
      fill: 0,
      full: false,
    });
    const most = boreClock('Deep Bore', { filled: 629, full: false }, 1000);
    expect(most.value).toBe('62%');
    expect(most.fill).toBe(Math.round(0.629 * FINALE_CLOCK_W));
    expect(boreClock('Deep Bore', { filled: 1000, full: true }, 1000)).toMatchObject({
      value: BORE_FULL,
      fill: FINALE_CLOCK_W,
      full: true,
    });
  });

  it('reads the countdown with thousands separators; full only at 0 with the song complete', () => {
    const c = counterClock(12345, 0.25);
    expect(c).toMatchObject({ kind: 'counter', label: COUNTER_LABEL, value: '12,345' });
    expect(c.fill).toBe(FINALE_CLOCK_W / 4);
    expect(c.full).toBe(false);
    expect(counterClock(0, 1)).toMatchObject({ value: '0', fill: FINALE_CLOCK_W, full: true });
    // A run with no count to fall from (N = 0) still fills with the song, and isn't "full" early.
    expect(counterClock(0, 0.5).full).toBe(false);
    expect(counterClock(5, 2).fill).toBe(FINALE_CLOCK_W); // p clamps
  });

  it('scopes only the phased maps (a song or a timer)', () => {
    expect(phasedMap({ song: null, timers: [] })).toBe(false);
    expect(phasedMap({ song: null, timers: [{ id: 'x', fillTicks: 1, bossHpPerTenth: 0 }] })).toBe(
      true,
    );
  });
});

describe("the choir's Voices meter (pure)", () => {
  it('draws one pip per hush the choir can take before its floor, filled as singers are hushed', () => {
    // The convoy's 16 with the finale's floor (16 − 14 = 2): lost at 15 hushed, so 15 pips.
    const fresh = choirMeterView(16, 16, 2);
    expect(fresh).toMatchObject({ evacuated: 16, total: 16, lost: 0, maxLost: 15, choir: true });
    expect(fresh.pips).toHaveLength(15);
    expect(fresh.low).toBe(false);
    const late = choirMeterView(4, 16, 2);
    expect(late.lost).toBe(12);
    expect(late.pips?.filter(Boolean)).toHaveLength(12);
    expect(late.low).toBe(true); // 3 hushes left of 15
    expect(choirMeterView(10, 10, null)).toMatchObject({ maxLost: null, pips: null, low: false });
  });
});

describe('the finale HUD on fin_m01 (T832)', () => {
  it('Phase 1: Voices with the gate under it, the Bore once W1 starts, the Descent banner', () => {
    const host = finale();
    offs.push(bindEscortMeter(host), bindFinaleHud(host, 5000));
    expect(finalePhase.value).toBe(1);
    expect(finaleClock.value).toBeNull(); // the Bore hasn't started
    const meter = hud.escort.value!; // the choir map shows the meter
    expect(meter).toMatchObject({ choir: true, evacuated: host.sim.state.choir.singers });
    expect(meter.maxLost).toBe(host.sim.state.choir.singers - 1);
    host.enqueue({ type: 'callWave' });
    host.fastForward(1);
    expect(phaseBanner.value).toMatchObject({ kicker: PHASE_ONE_KICKER, title: 'Wave 1' });
    host.fastForward(TICK_HZ * 30);
    expect(finaleClock.value).toMatchObject({ kind: 'bore', label: 'Deep Bore' });
    expect(finaleClock.value!.fill).toBeGreaterThan(0);
    // The banner had its beat 30 s of sim time ago: a fast-forward doesn't leave it up (T803b).
    expect(phaseBanner.value).toBeNull();
  });

  it("Phase 2: the countdown from N in the Bore's place; Dawn: the counter at 0", () => {
    const host = finale();
    offs.push(bindFinaleHud(host, 5000));
    host.enqueue({ type: 'callWave' });
    host.fastForward(TICK_HZ * 10);
    const s = mut(host.sim);
    setPhase(s, 2);
    host.fastForward(1);
    expect(finalePhase.value).toBe(2);
    expect(phaseBanner.value).toMatchObject(PHASE_TWO_BANNER);
    const n = 5000 + s.stats.skitterkinKilled;
    expect(finaleClock.value).toMatchObject({ kind: 'counter', value: n.toLocaleString('en-US') });
    s.restPoints = s.restTarget / 2;
    host.fastForward(0);
    expect(finaleClock.value).toMatchObject({
      kind: 'counter',
      value: Math.round(n / 2).toLocaleString('en-US'),
      fill: FINALE_CLOCK_W / 2,
    });
    setPhase(s, 3);
    host.fastForward(1);
    expect(finalePhase.value).toBe(3);
    expect(finaleClock.value).toMatchObject({ kind: 'counter', value: '0', full: true });
  });

  it('shows a wave held for its phase, and the halted choir', () => {
    const host = finale();
    offs.push(bindFinaleHud(host, 0));
    const s = mut(host.sim);
    s.wave = 18;
    s.schedule.phase = 'held';
    s.choir.halted = true;
    host.fastForward(0);
    expect(nextHeld.value).toBe(true);
    expect(choirHalted.value).toBe(true);
    s.schedule.phase = 'countdown';
    s.choir.halted = false;
    host.fastForward(0);
    expect(nextHeld.value).toBe(false);
    expect(choirHalted.value).toBe(false);
  });

  it('a resumed run replays its banners silently', () => {
    const host = finale();
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a host mid-replay
    const replaying = Object.create(host, { replaying: { value: true } }) as Host<IdSpace>;
    offs.push(bindFinaleHud(replaying, 0));
    host.enqueue({ type: 'callWave' });
    host.fastForward(TICK_HZ);
    setPhase(mut(host.sim), 2);
    host.fastForward(1);
    expect(phaseBanner.value).toBeNull();
    expect(finaleClock.value?.kind).toBe('counter');
  });

  it('quiets every signal on unbind and on a map without the song', () => {
    const host = finale();
    const off = bindFinaleHud(host, 0);
    host.enqueue({ type: 'callWave' });
    host.fastForward(TICK_HZ * 5);
    off();
    expect(finaleClock.value).toBeNull();
    expect(finalePhase.value).toBe(0);
    const plain = createHost(createSim(battleConfig('a1_m01', 1, null)));
    offs.push(bindFinaleHud(plain, 0));
    plain.enqueue({ type: 'callWave' });
    plain.fastForward(TICK_HZ * 5);
    expect(finalePhase.value).toBe(0);
    expect(finaleClock.value).toBeNull();
  });
});

describe("Directive 0's dark slot (T832)", () => {
  it('a phase lock darkens its slot as Directive 0, not a revocation', () => {
    const host = finale();
    offs.push(bindRevoked(host, new BattleInteraction()));
    expect(revokedHud.value.slots).toEqual([]);
    lockAbility(mut(host.sim), 'time_dilation', true);
    host.fastForward(0);
    expect(revokedHud.value.slots).toEqual([2]);
    expect(revokedHud.value.locked).toEqual([2]);
    lockAbility(mut(host.sim), 'time_dilation', false);
    host.fastForward(0);
    expect(revokedHud.value.slots).toEqual([]);
    expect(revokedHud.value.locked).toBeUndefined();
  });

  it('says why on a press, apart from the lockout and Radio Silence', () => {
    expect(revokedText('directive')).toBe(DIRECTIVE_TEXT);
    expect(DIRECTIVE_TEXT).toMatch(/Directive 0/);
    expect(revokedText('lockout')).toBe('Locked out');
    expect(revokedText('silence')).toBe(RADIO_SILENCE_TEXT);
  });
});
