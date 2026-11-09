// The radio line tables by map id (D026's M1 radio ticker). A map with no table has no radio.
import { A1_M01_RADIO } from './a1_m01.ts';
import { A1_M02_RADIO } from './a1_m02.ts';
import type { RadioLine } from './types.ts';

export type { RadioLine, RadioSpeaker, RadioTrigger, SpeakerLook } from './types.ts';
export { SPEAKERS } from './types.ts';

/** Every radio table, by map id (tools/radioLines.test.ts checks each against its act file). */
export const RADIO_TABLES: Readonly<Record<string, readonly RadioLine[]>> = {
  a1_m01: A1_M01_RADIO,
  a1_m02: A1_M02_RADIO,
};

/** The radio lines of map `mapId` (empty when it has none). */
export function radioLines(mapId: string): readonly RadioLine[] {
  return Object.hasOwn(RADIO_TABLES, mapId) ? (RADIO_TABLES[mapId] ?? []) : [];
}
