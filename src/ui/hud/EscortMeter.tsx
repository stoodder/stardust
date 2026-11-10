// The Escort's meter (T305c, T531; core-loop § 2.9–2.10): while the map is an Escort, it stands in
// for the core's meter. Three rows: the label the map gives it ("Evacuated", "Sheltered") with the
// refugees safe as the big number; "of 36", the map's total; and the lost row, one pip per loss the
// map allows (`maxLost`), filled `red.3` as refugees are lost, with the blinking alarm box once
// few are left (app/dialogue.ts `escortLow`, the bark's threshold). Without `maxLost`, or with too
// many to draw, the lost row reads in words ("3", "3/20"). Each refugee lost flashes the meter
// red (like the core's leak flash, D026), and when a map turns Escort mid-map (A2M5's pivot) the
// relabel moment plays: the old label, struck through, gives way to the new one, which blinks
// its accent edge three times (2 s; it waits while a scene or the pause menu holds the HUD).
import { lostWords } from '../../app/hudEscort.ts';
import { hud } from '../state.ts';
import { baked, Icon } from './Icon.tsx';

/** The meter's glyph: the refugee's own once art draws one (`icon.refugee`), else the core orb. */
export function escortIcon(): string {
  return baked('icon.refugee', 'icon') === null ? 'icon.core' : 'icon.refugee';
}

export function EscortMeter() {
  const m = hud.escort.value;
  if (m === null) return null;
  const label = hud.meterLabel.value;
  const flash = hud.escortLost.value;
  const relabel = hud.relabel.value;
  const lost = lostWords(m.lost, m.maxLost);
  const last = m.maxLost !== null && m.lost >= m.maxLost;
  return (
    <div
      class="hud-escort"
      role="status"
      data-testid="escort-meter"
      data-low={m.low}
      aria-label={`${label} ${m.evacuated} of ${m.total}, lost ${lost}${m.low ? ', few left' : ''}`}
    >
      {flash !== null && <span key={flash.id} class="hud-asset-flash" aria-hidden="true" />}
      <div class="hud-meter">
        <Icon id={escortIcon()} />
        {relabel === null ? (
          <span class="hud-label">{label}</span>
        ) : (
          <span key={relabel.id} class="hud-label hud-relabel" data-testid="meter-relabel">
            <span class="hud-relabel-from">{relabel.from}</span>
            <span class="hud-relabel-to">{label}</span>
          </span>
        )}
        <span class="big num">{m.evacuated}</span>
      </div>
      <span class="hud-escort-of num" data-testid="escort-total">
        of {m.total}
      </span>
      <div class="hud-escort-lost" data-testid="escort-lost">
        <span class={m.low ? 'hud-label danger' : 'hud-label'}>
          Lost
          {m.low && (
            <span class="hud-alarm" aria-hidden="true">
              !
            </span>
          )}
        </span>
        {m.pips === null ? (
          <span class={last ? 'num danger' : 'num'}>{lost}</span>
        ) : (
          <span class={m.pips.length <= 10 ? 'hud-pips wide' : 'hud-pips'} aria-hidden="true">
            {m.pips.map((on, i) => (
              <span key={i} class={on ? 'hud-pip on' : 'hud-pip'} />
            ))}
          </span>
        )}
      </div>
    </div>
  );
}
