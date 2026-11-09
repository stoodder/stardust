// A1M1 balance-harness builds. TODO(T107): the par and `rivet_only` builds as explicit step lists
// (docs/story/campaign/act1.md § A1M1, Par build), with the Standard reference profile.
import { defineBuilds } from '../../define.ts';

export const builds = defineBuilds({
  referenceProfile: { towers: [], specs: [], shop: {}, protocols: [], technicianAbility: null },
  parBuild: { loadout: [], steps: [] },
  noCounterBuilds: {},
});
