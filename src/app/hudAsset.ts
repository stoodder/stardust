// The asset meter's signals (T305a; ui/hud/AssetMeter.tsx): on a Protect map, `hud.asset` mirrors
// the sim's asset meter and its damage band, and `hud.assetHit` flashes on every `AssetHit` that
// cost something. Other maps leave `hud.asset` null, so the meter doesn't show.
import type { IdSpace } from '../content/types.ts';
import { assetDamage } from '../sim/index.ts';
import { hud, type AssetMeterView } from '../ui/state.ts';
import type { Host } from './host.ts';

/** The meter's view from the sim's numbers, or null without an asset. */
export function assetMeterView(name: string, value: number, max: number): AssetMeterView | null {
  const damage = assetDamage(value, max);
  return damage === 'none' ? null : { name, value, max, damage };
}

/** Wires the asset meter to a battle. Returns the unwiring (which also clears it). */
export function bindAssetMeter(host: Host<IdSpace>): () => void {
  const { sim } = host;
  const asset = sim.map.asset;
  // Replaced only when the meter moves, so a steady frame re-renders nothing (app/hud.ts).
  const sync = (): void => {
    const was = hud.asset.value;
    const { asset: value, maxAsset: max } = sim.state;
    if (asset === null || (was !== null && was.value === value && was.max === max)) return;
    hud.asset.value = assetMeterView(asset.name, value, max);
  };
  hud.asset.value = null;
  sync();
  hud.assetHit.value = null;
  let hitId = 0;
  const offs = [
    host.onAfterFrame(sync),
    host.bus.on('AssetHit', (e) => {
      sync();
      // A resumed run's replay doesn't flash (app/checkpoints.ts).
      if (e.lost > 0 && !host.replaying) hud.assetHit.value = { id: ++hitId, amount: e.lost };
    }),
  ];
  return () => {
    for (const off of offs) off();
    hud.asset.value = null;
    hud.assetHit.value = null;
  };
}
