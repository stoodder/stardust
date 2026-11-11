// The dev fixtures as one chunk (devRegistry.ts loads it on demand; D150).
import { DEV_SAVES } from '../meta/__fixtures__/devSaves.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import type { DevFixtures } from './devRegistry.ts';

export const DEV_FIXTURES: DevFixtures = { content: DEV_CONTENT, saves: DEV_SAVES };
