// The Escort's meter signals (T305c; ui/hud/EscortMeter.tsx): while the map is an Escort (from the
// start, or once a `setObjective` pivots it), `hud.escort` mirrors the sim's Evacuated count of
// the map's refugees and the refugees lost against `maxLost`, and the meter's label follows the
// sim's (`state.meterLabel`, relabeled on ObjectiveChanged). Otherwise `hud.escort` is null and
// the core's meter shows. The minimal readout; T531 builds the real meter.
import type { IdSpace } from '../content/types.ts';
import { hud, type EscortMeterView } from '../ui/state.ts';
import { meterLabelText } from './hudText.ts';
import type { Host } from './host.ts';

/** The meter's view from the sim's numbers, or null while the map isn't an Escort. */
export function escortMeterView(
  objective: string,
  evacuated: number,
  lost: number,
  total: number,
  maxLost: number | null,
): EscortMeterView | null {
  return objective === 'escort' ? { evacuated, total, lost, maxLost } : null;
}

/** Wires the Escort's meter to a battle. Returns the unwiring (which also clears it). */
export function bindEscortMeter(host: Host<IdSpace>): () => void {
  const { sim } = host;
  const total = sim.map.escort?.total ?? 0;
  // Replaced only when a number moves, so a steady frame re-renders nothing (app/hud.ts).
  const sync = (): void => {
    const s = sim.state;
    const was = hud.escort.value;
    const { evacuated, refugeesLost: lost } = s.stats;
    const on = s.objective === 'escort';
    if (was !== null && on && was.evacuated === evacuated && was.lost === lost) return;
    if (was === null && !on) return;
    hud.escort.value = escortMeterView(s.objective, evacuated, lost, total, sim.map.maxLost);
    hud.meterLabel.value = meterLabelText(s.meterLabel);
  };
  hud.escort.value = null;
  sync();
  const offs = [
    host.onAfterFrame(sync),
    host.bus.on('ObjectiveChanged', (e) => {
      hud.meterLabel.value = meterLabelText(e.meterLabel);
      sync();
    }),
  ];
  return () => {
    for (const off of offs) off();
    hud.escort.value = null;
  };
}
