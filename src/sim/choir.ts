// The choir (design/maps.md § 5.5, Phase 1; T800a slot, T804 fills it): Pebble leads the singers
// up the choir's road (`map.choir.route`, from its core end) at its pace, halting while a Hollow
// unit is within `haltTiles` ahead of her (`ChoirHalted`), until she reaches `stopAt` (the Halls
// mouth). A hushed singer stops singing (`SingerHushed`) and trails at the back; Voices
// (`state.choir.voices`) is the singers still singing, `stats.voicesMin` the fewest this run, and
// fewer than the map's `minVoices` loses the map. Runs after the allies and bearers (tick.ts).
// Until T804 lands, createSim refuses a choir (`map.choir`), so this pass has nothing to do, and
// `choirAt` (the `{ choirAt }` trigger, SCRIPT_GATES: T806) is never reached.
import type { CompiledMapDef } from '../content/compiled.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimState } from './state.ts';
import type { TickContext } from './tick.ts';

export function choir(_state: SimState, _ctx: TickContext): void {
  // T804.
}

/** Whether the choir's leader has reached `marker` (the `{ choirAt }` trigger; T806 with T804). */
export function choirAt(
  _state: SimState,
  _map: CompiledMapDef<IdSpace>,
  _marker: string,
): boolean {
  return false; // T806
}
