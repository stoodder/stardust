// Revocation and QUILL's lockout in the app (app/revoked.ts; T606) on the dev revoke range
// (render/__fixtures__/devM6.ts `dev_revoke`: the Clean Exit 5 s into W2): the HUD's `revokedHud`
// follows the sim, a placement or aim of what goes is cancelled as it goes (D141), the leak line
// slot holds story's line until the next wave starts, and a resumed battle binds onto what its
// replay revoked.
import { afterEach, describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { IdSpace } from '../content/types.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { createSim, type SimConfig } from '../sim/index.ts';
import { NOTHING_REVOKED, revokedHud } from '../ui/hud/revokedState.ts';
import { checkpointOf, resumeOf } from './checkpoints.ts';
import { createHost, type Host } from './host.ts';
import { bindRevoked, revokedText, setLeakLine } from './revoked.ts';

const content = compileContent(DEV_CONTENT);

function config(): SimConfig<IdSpace> {
  return {
    content,
    mapId: 'dev_revoke',
    seed: 1,
    loadout: ['rivet', 'sprinkler', 'zapcoil', 'prism'],
    companion: null,
    modifiers: [],
    difficulty: 'standard',
    abilities: { slot1: 'dev_strike', slot2: null, slot2State: 'none' },
    specsUnlocked: [],
    scriptFlags: {},
  };
}

/** Builds two Rivets, starts W1, and calls W2 the moment its countdown starts. */
function play(host: Host<IdSpace>, until: (h: Host<IdSpace>) => boolean): void {
  host.sim.enqueue({ type: 'build', tower: 'rivet', tile: [7, 2] });
  host.sim.enqueue({ type: 'build', tower: 'rivet', tile: [12, 4] });
  host.sim.enqueue({ type: 'callWave' });
  for (let t = 0; t < 60 * 90 && !until(host); t++) {
    if (host.sim.state.schedule.phase === 'countdown') host.sim.enqueue({ type: 'callWave' });
    host.fastForward(1);
  }
}

const revoked = (h: Host<IdSpace>): boolean => h.sim.state.revoked.towers.length > 0;

afterEach(() => {
  revokedHud.value = NOTHING_REVOKED;
});

describe('the revocation in the app (T606)', () => {
  it('the HUD follows the sim, and a placement of the class is cancelled as it goes', () => {
    const host = createHost(createSim(config()));
    const interaction = new BattleInteraction();
    const off = bindRevoked(host, interaction);
    expect(revokedHud.value).toEqual(NOTHING_REVOKED);
    interaction.arm('rivet');
    play(host, revoked);
    expect(revokedHud.value).toEqual({
      towers: ['rivet'],
      slots: [1],
      previewHidden: true,
      leakLine: null,
    });
    expect(interaction.armed).toBe(null);
    off();
    expect(revokedHud.value).toEqual(NOTHING_REVOKED);
  });

  it("a pause-aimed strike is cancelled; another class's placement stays", () => {
    const host = createHost(createSim(config()));
    const interaction = new BattleInteraction();
    const off = bindRevoked(host, interaction);
    interaction.aimAbility(1);
    play(host, revoked);
    expect(interaction.aiming).toBe(null);
    interaction.arm('zapcoil');
    host.fastForward(1);
    expect(interaction.armed).toBe('zapcoil');
    off();
  });

  it("holds QUILL's leak line until the next wave starts", () => {
    const host = createHost(createSim(config()));
    const off = bindRevoked(host, new BattleInteraction());
    play(host, revoked);
    setLeakLine('I am not permitted to tell you wave three is armored. Ahem.');
    expect(revokedHud.value.leakLine).toMatch(/wave three/);
    play(host, (h) => h.sim.state.wave >= 3);
    expect(revokedHud.value.leakLine).toBe(null);
    expect(revokedHud.value.previewHidden).toBe(true);
    off();
  });

  it('a resumed battle binds onto what its replay revoked', () => {
    const host = createHost(createSim(config()));
    play(host, revoked);
    host.fastForward(30);
    const tick = host.sim.state.tick;
    const cp = checkpointOf({ wave: 2, tick }, host.sim.state.commandLog);
    const resumed = createHost(createSim(config()), {
      resume: resumeOf(host.sim.state.commandLog, cp),
    });
    resumed.catchUp();
    expect(resumed.sim.state.credits).toBe(host.sim.state.credits); // one refund, not two
    const off = bindRevoked(resumed, new BattleInteraction());
    expect(revokedHud.value).toMatchObject({ towers: ['rivet'], slots: [1], previewHidden: true });
    off();
  });

  it('words the refusals', () => {
    expect(revokedText('tower')).toBe('License revoked');
    expect(revokedText('uplink')).toBe('Uplink revoked');
    expect(revokedText('lockout')).toBe('Locked out');
  });
});
