// The asset meter (T305a, T431; core-loop § 2.10): on a Protect map, a second meter under the
// core's, built like it: the asset's glyph (`icon.asset.rig`; `_critical`, its beacon red, in the
// low band), its name ("Rigs"), and its value; the row flashes red on every hit that cost
// something and shows the low-asset alarm from `critical` (half the meter; one rig of two down).
// Other maps show nothing.
import { hud } from '../state.ts';
import { Icon } from './Icon.tsx';

/** The asset's glyph (A2M2's rigs, the only asset so far; D111), and its low-band look. */
export const ASSET_ICON = 'icon.asset.rig';
export const ASSET_ICON_LOW = 'icon.asset.rig_critical';

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
      <Icon id={low ? ASSET_ICON_LOW : ASSET_ICON} />
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
