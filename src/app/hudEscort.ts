// The Escort's meter signals (T305c, T531; ui/hud/EscortMeter.tsx): while the map is an Escort
// (from the start, or once a `setObjective` pivots it), `hud.escort` mirrors the sim's Evacuated
// count of the map's refugees and the refugees lost against `maxLost` (a pip each, filled as
// they're lost; the alarm once few are left, `escortLow`), and the meter's label follows the sim's
// (`state.meterLabel`, relabeled on ObjectiveChanged). `hud.escortLost` flashes the meter on each
// RefugeeLost, and `hud.relabel` carries the old label for the relabel moment when a map turns
// Escort mid-map (A2M5's pivot). A resumed run's replay shows neither (app/checkpoints.ts).
// Otherwise `hud.escort` is null and the core's meter shows.
import type { IdSpace } from '../content/types.ts';
import { hud, type EscortMeterView } from '../ui/state.ts';
import { escortLow } from './dialogue.ts';
import { meterLabelText } from './hudText.ts';
import type { Host } from './host.ts';

/** The most lost pips the meter draws (3 px each in the 100 px row); more read as words. */
export const MAX_LOST_PIPS = 16;

/** The lost row's pips: one per loss `maxLost` allows, true once lost; null to read as words. */
export function lostPips(lost: number, maxLost: number | null): boolean[] | null {
  if (maxLost === null || maxLost <= 0 || maxLost > MAX_LOST_PIPS) return null;
  return Array.from({ length: maxLost }, (_, i) => i < lost);
}

/** The meter's view from the sim's numbers, or null while the map isn't an Escort. */
export function escortMeterView(
  objective: string,
  evacuated: number,
  lost: number,
  total: number,
  maxLost: number | null,
): EscortMeterView | null {
  if (objective !== 'escort') return null;
  return {
    evacuated,
    total,
    lost,
    maxLost,
    pips: lostPips(lost, maxLost),
    low: escortLow(lost, maxLost),
  };
}

/** The lost count in words, as the meter's accessible name and the no-pip row say it. */
export function lostWords(lost: number, maxLost: number | null): string {
  return maxLost === null ? `${lost}` : `${lost}/${maxLost}`;
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
  hud.escortLost.value = null;
  hud.relabel.value = null;
  sync();
  let lostId = 0;
  let relabelId = 0;
  const offs = [
    host.onAfterFrame(sync),
    host.bus.on('ObjectiveChanged', (e) => {
      const from = hud.meterLabel.value;
      hud.meterLabel.value = meterLabelText(e.meterLabel);
      sync();
      // The relabel moment: only a live change of the meter's name (a replay's played already).
      if (!host.replaying && from !== hud.meterLabel.value && hud.escort.value !== null) {
        hud.relabel.value = { id: ++relabelId, from };
      }
    }),
    host.bus.on('RefugeeLost', () => {
      sync();
      if (!host.replaying) hud.escortLost.value = { id: ++lostId, amount: 1 };
    }),
  ];
  return () => {
    for (const off of offs) off();
    hud.escort.value = null;
    hud.escortLost.value = null;
    hud.relabel.value = null;
  };
}
