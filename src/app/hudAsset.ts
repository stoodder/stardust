// The asset meter's signals (T305a; ui/hud/AssetMeter.tsx): on a Protect map, `hud.asset` mirrors
// the sim's asset meter and its damage band, and `hud.assetHit` flashes on every `AssetHit` that
// cost something. Other maps leave `hud.asset` null, so the meter doesn't show. Where the asset is
// the bearers (A3M5; T731), the view also carries how many are home of the run's total
// (`bearersCarried`), for the meter's "Carried n of total" row.
import type { IdSpace } from '../content/types.ts';
import { assetDamage, bearersCarried, bearerTotal } from '../sim/index.ts';
import { hud, type AssetMeterView } from '../ui/state.ts';
import type { Host } from './host.ts';

/**
 * The meter's view from the sim's numbers, or null without an asset; `bearers` (A3M5's) adds
 * those carried home of the run's total.
 */
export function assetMeterView(
  name: string,
  value: number,
  max: number,
  bearers: { readonly home: number; readonly total: number } | null = null,
): AssetMeterView | null {
  const damage = assetDamage(value, max);
  if (damage === 'none') return null;
  return bearers === null
    ? { name, value, max, damage }
    : { name, value, max, damage, bearers: { home: bearers.home, total: bearers.total } };
}

/** Wires the asset meter to a battle. Returns the unwiring (which also clears it). */
export function bindAssetMeter(host: Host<IdSpace>): () => void {
  const { sim } = host;
  const asset = sim.map.asset;
  // Replaced only when the meter moves, so a steady frame re-renders nothing (app/hud.ts).
  // The bearers' row only where the run walks any (A3M5's; `bearerTotal` under its flags).
  const bearers = asset !== null && bearerTotal(sim.map, sim.config.scriptFlags) > 0;
  const sync = (): void => {
    const was = hud.asset.value;
    const { asset: value, maxAsset: max } = sim.state;
    if (asset === null) return;
    const carried = bearers ? bearersCarried(sim.state, sim.map, sim.config.scriptFlags) : null;
    if (
      was !== null &&
      was.value === value &&
      was.max === max &&
      (carried === null ||
        (was.bearers?.home === carried.home && was.bearers.total === carried.total))
    ) {
      return;
    }
    hud.asset.value = assetMeterView(asset.name, value, max, carried);
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
