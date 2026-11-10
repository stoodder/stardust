// The Escort's meter (T305c; core-loop § 2.9–2.10): while the map is an Escort, it stands in for
// the core's meter: the label the map gives it ("Evacuated", "Sheltered"), refugees evacuated, and
// under it "of 12 · lost 1/6" (the map's total; lost against `maxLost`, red once one more loses the
// map). The minimal readout; T531 builds the real meter (the relabel moment, the lost pips).
import { hud } from '../state.ts';
import { Icon } from './Icon.tsx';

export function EscortMeter() {
  const m = hud.escort.value;
  if (m === null) return null;
  const label = hud.meterLabel.value;
  const last = m.maxLost !== null && m.lost >= m.maxLost;
  const lost = m.maxLost === null ? `${m.lost}` : `${m.lost}/${m.maxLost}`;
  return (
    <div
      class="hud-meter hud-escort"
      role="status"
      data-testid="escort-meter"
      aria-label={`${label} ${m.evacuated} of ${m.total}, lost ${lost}`}
    >
      <Icon id="icon.core" />
      <span class="hud-label">{label}</span>
      <span class="big num">{m.evacuated}</span>
      <span class={last ? 'num danger' : 'num'} data-testid="escort-lost">
        of {m.total} · lost {lost}
      </span>
    </div>
  );
}
