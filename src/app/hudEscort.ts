// The Escort's meter signals (T305c, T531; ui/hud/EscortMeter.tsx): while the map is an Escort
// (from the start, or once a `setObjective` pivots it), `hud.escort` mirrors the sim's Evacuated
// count of the map's refugees and the refugees lost against `maxLost` (a pip each, filled as
// they're lost; the alarm once few are left, `escortLow`), and the meter's label follows the sim's
// (`state.meterLabel`, relabeled on ObjectiveChanged). `hud.escortLost` flashes the meter on each
// RefugeeLost, and `hud.relabel` carries the old label and number for the relabel moment when a
// map turns Escort mid-map (A2M5's pivot): the old meter held whole until the meter has shown it
// (`relabelShown`, D139), then the new label's blink. A resumed run's replay shows neither (app/checkpoints.ts).
// On a Holdout (A3M3; T631) the same meter shows Evacuated of the run's refugees with no lost row:
// a Holdout has no defeat, so nothing counts down to one; its alarm is `holdoutLow`'s mark.
// The total is the run's (`state.refugeeTotal`: a gated group left out, A3M1's Thrum unspared, and
// on A3M3 only the chosen door's), never the map's every group.
// Otherwise `hud.escort` is null and the core's meter shows.
import type { IdSpace } from '../content/types.ts';
import { evaluateCondition, type Sim } from '../sim/index.ts';
import { hud, type EscortMeterView } from '../ui/state.ts';
import { escortLow, holdoutLow } from '../story/meters.ts';
import { meterLabelText } from './hudText.ts';
import type { Host } from './host.ts';

/**
 * The refugees wave `wave` sends walking (the next-wave preview's friendly "+6 walking" chip,
 * D138): the groups its script releases (`spawnAllies`) on its countdown, its start, or a beat
 * after, from events whose `when` holds now (A2M5's W6 releases the first group only when the
 * Penitent hasn't already pivoted). Pebble isn't counted. 0 on a map without refugees.
 */
export function refugeesWalking(
  sim: Pick<Sim<IdSpace>, 'map' | 'state' | 'config'>,
  wave: number,
): number {
  const escort = sim.map.escort;
  if (escort === null) return 0;
  const ctx = { content: sim.config.content, config: sim.config, map: sim.map };
  let n = 0;
  for (const e of sim.map.events) {
    if (!('wave' in e.on) || e.on.wave !== wave || e.on.phase === 'cleared') continue;
    if (e.when !== null && !evaluateCondition(e.when, sim.state, ctx)) continue;
    for (const a of e.actions) {
      if (!('spawnAllies' in a)) continue;
      n += escort.groups.find((g) => g.id === a.spawnAllies)?.count ?? 0;
    }
  }
  return n;
}

/** The most lost pips the meter draws (3 px each in the 100 px row); more read as words. */
export const MAX_LOST_PIPS = 16;

/** The lost row's pips: one per loss `maxLost` allows, true once lost; null to read as words. */
export function lostPips(lost: number, maxLost: number | null): boolean[] | null {
  if (maxLost === null || maxLost <= 0 || maxLost > MAX_LOST_PIPS) return null;
  return Array.from({ length: maxLost }, (_, i) => i < lost);
}

/** Whether the map's objective shows the Evacuated meter: an Escort's, or a Holdout's. */
export function showsEscortMeter(objective: string): boolean {
  return objective === 'escort' || objective === 'holdout';
}

/**
 * The meter's view from the sim's numbers, or null while the map is neither an Escort nor a
 * Holdout. A Holdout's has no pips and no lost row; its alarm is `holdoutLow` against its
 * `evacuatedFloor`.
 */
export function escortMeterView(
  objective: string,
  evacuated: number,
  lost: number,
  total: number,
  maxLost: number | null,
  evacuatedFloor: number | null = null,
): EscortMeterView | null {
  if (!showsEscortMeter(objective)) return null;
  const holdout = objective === 'holdout';
  return {
    evacuated,
    total,
    lost,
    maxLost: holdout ? null : maxLost,
    pips: holdout ? null : lostPips(lost, maxLost),
    low: holdout ? holdoutLow(lost, total, evacuatedFloor) : escortLow(lost, maxLost),
    holdout,
  };
}

/** The lost count in words, as the meter's accessible name and the no-pip row say it. */
export function lostWords(lost: number, maxLost: number | null): string {
  return maxLost === null ? `${lost}` : `${lost}/${maxLost}`;
}

/**
 * The relabel's held beat (the old meter whole, D139) has played: the Escort's rows show at once.
 * A later relabel (another `id`) is left alone.
 */
export function relabelShown(id: number): void {
  const r = hud.relabel.value;
  if (r !== null && r.id === id && r.held) hud.relabel.value = { ...r, held: false };
}

/** Wires the Escort's meter to a battle. Returns the unwiring (which also clears it). */
export function bindEscortMeter(host: Host<IdSpace>): () => void {
  const { sim } = host;
  // Replaced only when a number moves, so a steady frame re-renders nothing (app/hud.ts).
  const sync = (): void => {
    const s = sim.state;
    const was = hud.escort.value;
    const { evacuated, refugeesLost: lost } = s.stats;
    const on = showsEscortMeter(s.objective);
    const total = s.refugeeTotal;
    const same = was !== null && was.evacuated === evacuated && was.lost === lost;
    if (on && same && was.total === total) return;
    if (was === null && !on) return;
    hud.escort.value = escortMeterView(
      s.objective,
      evacuated,
      lost,
      total,
      sim.map.maxLost,
      sim.map.evacuatedFloor,
    );
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
      // The old meter's last number (the core's integrity), held with the struck label (D138:
      // never "Core 0").
      const fromValue = hud.escort.value?.evacuated ?? sim.state.integrity;
      hud.meterLabel.value = meterLabelText(e.meterLabel);
      sync();
      // The relabel moment: only a live change of the meter's name (a replay's played already).
      if (!host.replaying && from !== hud.meterLabel.value && hud.escort.value !== null) {
        hud.relabel.value = { id: ++relabelId, from, fromValue, held: true };
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
