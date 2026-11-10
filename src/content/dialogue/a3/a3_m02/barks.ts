// A3M2 · License Revoked: map-scoped barks (story/campaign/act3.md § A3M2, *Barks*), verbatim.
// They fire only on this map. Ids end `_a3_02` (this map). Bricks's `tower_built` line comes after
// the revocation: gate it on this run's `{ runStat: 'revocations', gte: 1 }`, never on the cue's
// `seen` (that holds from the start of a replay). Registered empty (T600b) for the map's task
// (T621).
import { defineBarks } from '../../define.ts';

export const barks = defineBarks([]);
