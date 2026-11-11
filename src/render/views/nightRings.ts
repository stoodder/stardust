// Night rings (T630a, from T630b's look at Act III's ground): the decal layer takes no tint, so a
// ring drawn at partial alpha sinks into Act III's near-black ground. On a night map (Act III's
// `act3` env and the finale's) the unit rings that beat or dim (the Expediter's haste ring) stay
// whole over their 1 px `ink.0` under-stroke and step a colour brighter on the beat instead.
// Acts I–II keep their alpha steps (envLook.ts's table). Pure, so it's unit-tested; BattleScene
// asks it once per map.
import { envLook } from './envLook.ts';

/** Whether a map baked in `env` draws its decal rings whole (no partial-alpha steps). */
export function nightRings(env: string): boolean {
  return envLook(env).nightRings;
}
