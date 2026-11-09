// The asset meter (T305a; core-loop § 2.10): on a Protect map, a second meter under the core's,
// labelled with the asset's name ("Rigs"), its row flashing red on every hit that cost something
// and showing the low-asset alarm from `critical` (half the meter; one rig of two down). A minimal
// view: T431 polishes it. Other maps show nothing.
import { hud } from '../state.ts';

export function AssetMeter() {
  const a = hud.asset.value;
  if (a === null) return null;
  const hit = hud.assetHit.value;
  const low = a.damage === 'critical' || a.damage === 'lost';
  return (
    <div
      class="hud-meter hud-asset"
      role="status"
      data-testid="asset-meter"
      data-damage={a.damage}
      aria-label={`${a.name} ${a.value} of ${a.max}${low ? ', low' : ''}`}
    >
      {/* The key restarts the flash on every hit (like the core's leak flash, D026). */}
      {hit !== null && <span key={hit.id} class="hud-asset-flash" aria-hidden="true" />}
      <span class="hud-asset-glyph" aria-hidden="true" />
      <span class="hud-label">
        {a.name}
        {low && (
          <span class="hud-alarm" aria-hidden="true">
            !
          </span>
        )}
      </span>
      <span class={low ? 'big num danger' : 'big num'}>{a.value}</span>
    </div>
  );
}
