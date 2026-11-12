// The asset meter (T305a, T431; core-loop § 2.10): on a Protect map, a second meter under the
// core's, built like it: the asset's glyph (`icon.asset.rig`; `_critical`, its beacon red, in the
// low band), its name ("Rigs"), and its value; the row flashes red on every hit that cost
// something and shows the low-asset alarm from `critical` (half the meter; one rig of two down).
// Where the asset is the bearers (A3M5; T731), the glyph is the refugee's and a second row under
// it reads "Carried n of total" (those home so far, of the run's). Other maps show nothing.
import { hud } from '../state.ts';
import { Icon } from './Icon.tsx';

/** The asset's glyph (A2M2's rigs; D111), and its low-band look. */
export const ASSET_ICON = 'icon.asset.rig';
export const ASSET_ICON_LOW = 'icon.asset.rig_critical';
/**
 * The bearers' glyph (A3M5; T731): the Escort meter's refugee, its bundle riding high, since the
 * bearers are Haulers carrying the vats' dead home; the alarm, not the glyph, says it's low.
 */
export const BEARER_ICON = 'icon.refugee';

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
      data-critical="asset"
      data-damage={a.damage}
      aria-label={`${a.name} ${a.value} of ${a.max}${low ? ', low' : ''}${a.bearers === undefined ? '' : `. Carried home ${a.bearers.home} of ${a.bearers.total}`}`}
    >
      {/* The key restarts the flash on every hit (like the core's leak flash, D026). */}
      {hit !== null && <span key={hit.id} class="hud-asset-flash" aria-hidden="true" />}
      <Icon id={a.bearers !== undefined ? BEARER_ICON : low ? ASSET_ICON_LOW : ASSET_ICON} />
      <span class="hud-label">
        {a.name}
        {low && (
          <span class="hud-alarm" aria-hidden="true">
            !
          </span>
        )}
      </span>
      <span class={low ? 'big num danger' : 'big num'}>{a.value}</span>
      {/* The bearers home so far (A3M5; T731): Results' "Carried" line, live. */}
      {a.bearers !== undefined && (
        <span class="hud-asset-carried" data-testid="bearers-carried" aria-hidden="true">
          Carried <span class="num">{a.bearers.home}</span> of{' '}
          <span class="num">{a.bearers.total}</span>
        </span>
      )}
    </div>
  );
}
