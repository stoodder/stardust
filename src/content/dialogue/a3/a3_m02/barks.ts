// A3M2 · License Revoked: map-scoped barks (story/campaign/act3.md § A3M2, *Barks*), verbatim. They
// fire only on this map; ids end `_a3_02` (this map). Prim's voice comes from the Compliance Drones'
// PA, so she is on the radio for every wave that sends Everglow Security (`everglow: true`;
// app/dialogue.ts `presentSpeakers`). Bricks's `tower_built` line comes after the revocation: it is
// gated on this run's `{ runStat: 'revocations', gte: 1 }`, never on the cue's `seen` (that holds
// from the start of a replay).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([
  {
    id: 'prim_wave_start_a3_02',
    speaker: 'prim',
    text: 'Repossession in progress. Please remain compliant.',
    trigger: { on: 'wave_start', everglow: true },
    cooldownSec: 120,
  },
  {
    id: 'bricks_tower_built_a3_02',
    speaker: 'bricks',
    text: "Build what you've got. That's the job now.",
    trigger: { on: 'tower_built' },
    when: { runStat: 'revocations', gte: 1 },
    once: 'map',
  },
  // Lucky's class taken by the Clean Exit (her name tag goes with the turret; D143).
  {
    id: 'bricks_tower_revoked_a3_02',
    speaker: 'bricks',
    text: 'Lucky too, huh. ...Still walking, probably.',
    trigger: { on: 'tower_revoked', tagged: true },
  },
]);
