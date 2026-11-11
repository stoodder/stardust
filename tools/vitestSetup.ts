// Vitest's setup file (vite.config.ts `test.setupFiles`): registers the dev fixtures (the dev
// battles' content and the dev saves) up front, as a dev URL loads them before boot in the game
// (app/devRegistry.ts; D150). It imports only the registry and the fixtures, so a test file that
// mocks a module (battleSetup.lazy.test.ts mocks the compiler) still sees its mock.
import { DEV_FIXTURES } from '../src/app/devFixtures.ts';
import { setDevFixtures } from '../src/app/devRegistry.ts';

setDevFixtures(DEV_FIXTURES);
