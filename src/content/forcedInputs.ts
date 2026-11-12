// The forced single inputs (design/core-loop.md § 2.11; T605's mechanic, reused by T809): each id a
// map's `forceInput` names and its build steps' `scriptInput` press, with how the app shows it.
// A3M3's SEAL (the blast doors) and the finale's "Who's there?" (Directive 0 under C4 Keep: QUILL
// revokes a class, "...Knock knock.", the only button, "Not Everglow.", the class returns;
// story/campaign/finale.md § FIN). Map data and dialogue import the ids from here.

/** A3M3's SEAL (act3.md § A3M3). */
export const SEAL_INPUT = 'seal';
/** The finale's knock-knock under Keep (finale.md § FIN, Phase 2 cues). */
export const WHOS_THERE_INPUT = 'whos_there';

/** How the app shows one forced input (app/forcedInput.ts, ui/hud/ForcedInputButton.tsx). */
export interface ForcedInputDef {
  /** The one button's text ("SEAL", "Who's there?"). */
  readonly label: string;
  /**
   * The cue slot whose scene's last line permits the press (`<map>_cue_<slot>`; default: the
   * input's id). The finale's is `directive0`, ending on QUILL's "...Knock knock."
   */
  readonly permission?: string;
  /**
   * The sound struck while it waits (`door_hum` at A3M3's doors: Bricks low, Pebble above), or
   * null for none (the knock-knock waits in silence).
   */
  readonly hum: string | null;
}

/** Every forced input the content names. An id not listed shows its id in capitals and no hum. */
export const FORCED_INPUTS: Readonly<Record<string, ForcedInputDef>> = {
  [SEAL_INPUT]: { label: 'SEAL', hum: 'door_hum' },
  [WHOS_THERE_INPUT]: { label: "Who's there?", permission: 'directive0', hum: null },
};

/** The forced input `id`'s def (an unlisted id: its id in capitals, no hum). */
export function forcedInputDef(id: string): ForcedInputDef {
  return Object.hasOwn(FORCED_INPUTS, id) ? FORCED_INPUTS[id]! : { label: id.toUpperCase(), hum: null }; // hasOwn
}
