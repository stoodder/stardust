// The radio line tables by map id (D026's M1 radio ticker). A map with no table has no radio.
import { A1_M01_RADIO } from './a1_m01.ts';
import type { RadioLine } from './types.ts';

export type { RadioLine, RadioSpeaker, RadioTrigger, SpeakerLook } from './types.ts';
export { SPEAKERS } from './types.ts';

const BY_MAP: Readonly<Record<string, readonly RadioLine[]>> = {
  a1_m01: A1_M01_RADIO,
};

/** The radio lines of map `mapId` (empty when it has none). */
export function radioLines(mapId: string): readonly RadioLine[] {
  return Object.hasOwn(BY_MAP, mapId) ? (BY_MAP[mapId] ?? []) : [];
}
