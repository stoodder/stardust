// CH_M03 · Glass Core (design/maps.md § 8, challenge maps; T862): Reclamation Facility 2 again,
// after the dawn, with a core you could crack with a stern look and the radio dead. A2M4's layout
// by reference (read from its map.ts, never copied): the road in under the gold seams, round
// Intake B, east under the vats and down round the conduit to the control core; the vats' drain
// hatch (the `vats` route, open from the first wave here); the Lightwings' lane over the vats; the
// catwalks (high ground), the conduit (power node), and the two intake hoppers (wreckage, salvage
// as A2M4 pays it). An edit to A2M4's layout flows here.
//
// The rules (sim/rules.ts `challengeConfig`): `glassCore` (core integrity 5; Reinforced Core's
// ranks add, as on a veteran replay) and `noAbilities` (Radio Silence: slot 1 empty). Nobody walks
// with you (no slot 2): comms are down, so it's you and the towers.
import { defineMapLayout } from '../../define.ts';
import { map as a2m04 } from '../a2_m04/map.ts';

export const map = defineMapLayout({
  id: 'ch_m03',
  act: 'challenge',
  // After the dawn: the finale's palette (post-game maps read the finale's dials).
  env: 'finale',
  objective: 'defend',
  size: a2m04.size,
  tiles: a2m04.tiles,
  paths: a2m04.paths,
  airLanes: a2m04.airLanes ?? [],
  markers: a2m04.markers ?? {},
  underWreckage: a2m04.underWreckage ?? {},
  salvage: a2m04.salvage ?? {},
  challenge: {
    name: 'Glass Core',
    tagline: 'Core integrity 5. Comms down.',
    rules: [{ kind: 'glassCore' }, { kind: 'noAbilities' }],
  },
  startCredits: 600,
  // A challenge pays Intel for its medals, never Stardust.
  stardust: 0,
  threatIntel: ['shielded', 'shield_aura', 'clustered', 'flying', 'armored'],
  // The Aelari's shields (Energy or Soaked), the Mote clusters (splash), and the Lightwings (air).
  requiredCounters: ['shield', 'splash', 'air'],
  // Light Touch: win with at most eight towers standing.
  medals: {
    challenge: {
      id: 'light_touch',
      name: 'Light Touch',
      description: 'Win with eight towers or fewer.',
      condition: { towers: {}, lte: 8 },
    },
  },
  companion: null,
});
