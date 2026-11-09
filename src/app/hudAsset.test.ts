// The asset meter's signals (T305a): null off a Protect map; on dev_protect, "Rigs 10 of 10" at the
// start, then the sim's meter, damage band, and a flash for every hit that cost something.
import { describe, expect, it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { hud } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { createHost } from './host.ts';
import { assetMeterView, bindAssetMeter } from './hudAsset.ts';

const hostOn = (mapId: string) =>
  createHost(createSim(battleConfig(mapId, 1)), { now: () => 0, speed: 0 });

describe('the asset meter', () => {
  it('views the meter with its damage band, or null without an asset', () => {
    expect(assetMeterView('Rigs', 0, 0)).toBeNull();
    expect(assetMeterView('Rigs', 10, 10)).toEqual({
      name: 'Rigs',
      value: 10,
      max: 10,
      damage: 'intact',
    });
    expect(assetMeterView('Rigs', 4, 10)?.damage).toBe('critical');
  });

  it('shows nothing on a map without an asset', () => {
    const off = bindAssetMeter(hostOn('dev_range'));
    expect(hud.asset.value).toBeNull();
    off();
  });

  it('follows the rigs on dev_protect, flashing on each costly hit, and clears on unbind', () => {
    const host = hostOn('dev_protect');
    const off = bindAssetMeter(host);
    expect(hud.asset.value).toEqual({ name: 'Rigs', value: 10, max: 10, damage: 'intact' });
    host.enqueue({ type: 'callWave' });
    for (let i = 0; i < 600 && host.sim.state.asset === 10; i++) host.fastForward(10);
    expect(hud.asset.value).toMatchObject({ value: host.sim.state.asset, damage: 'damaged' });
    expect(hud.assetHit.value).toMatchObject({ amount: 1 });
    off();
    expect([hud.asset.value, hud.assetHit.value]).toEqual([null, null]);
  });
});
