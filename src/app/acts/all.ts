// Every act's chunk at once, for tests and the Node tools (tools/vitestSetup.ts, tools/sim.ts):
// they see all the content up front, as the game does once each act has loaded
// (app/actContent.ts). Never imported by the game: it would put every act in the initial JS.
import { ACT2_CHUNK } from './a2.ts';
import { ACT3_CHUNK } from './a3.ts';
import { FINALE_CHUNK } from './fin.ts';
import type { ActChunk } from './types.ts';

export const ALL_ACT_CHUNKS: readonly ActChunk[] = [ACT2_CHUNK, ACT3_CHUNK, FINALE_CHUNK];
