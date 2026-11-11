// The Escort meter's lost row reads the map's limit through `escortMaxLost` (D143 R7): A3M1's
// `maxLostPct` of the run's refugees, so Old Thrum's group (spared) walks 30 with 16 pips, and
// without her (cleared) 24 with 13. Both through the HUD's own binding on the real map.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSim } from '../sim/index.ts';
import { hud } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost } from './host.ts';
import { bindEscortMeter } from './hudEscort.ts';

vi.mock('./battle.ts', () => ({ startBattle: () => undefined }));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

let unbind = (): void => {};
afterEach(() => {
  unbind();
  unbind = () => {};
});

/** A3M1's escort meter with Old Thrum's group walking (`spared`) or not. */
function meterOn(spared: boolean) {
  const cfg = battleConfig('a3_m01', 1, null);
  const sim = createSim({
    ...cfg,
    scriptFlags: { ...cfg.scriptFlags, spared_quiet_wave: spared },
  });
  unbind = bindEscortMeter(createHost(sim));
  return { total: sim.state.refugeeTotal, view: hud.escort.value };
}

describe("A3M1's lost row scales with who walks (maxLostPct)", () => {
  it('spared: 30 walk, 16 pips', () => {
    const { total, view } = meterOn(true);
    expect(total).toBe(30);
    expect(view?.maxLost).toBe(16);
    expect(view?.pips).toHaveLength(16);
  });

  it('cleared: 24 walk, 13 pips', () => {
    const { total, view } = meterOn(false);
    expect(total).toBe(24);
    expect(view?.maxLost).toBe(13);
    expect(view?.pips).toHaveLength(13);
  });
});
