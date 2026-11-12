// Vitest's setup file (vite.config.ts `test.setupFiles`): registers what the game loads on demand,
// up front. Every act's chunk first (the story's Act II, Act III, and finale content and sounds,
// which the game loads an act at a time: app/actContent.ts; T802), so every test sees all the
// content, as do the dev saves built from it; then the dev fixtures (the dev battles' content and
// the dev saves), as a dev URL loads them before boot in the game (app/devRegistry.ts; D150). It
// imports only the registries and the content, so a test file that mocks a module
// (battleSetup.lazy.test.ts mocks the compiler) still sees its mock.
import { ALL_ACT_CHUNKS } from '../src/app/acts/all.ts';
import { registerActChunk } from '../src/app/actContent.ts';
import { DEV_FIXTURES } from '../src/app/devFixtures.ts';
import { setDevFixtures } from '../src/app/devRegistry.ts';

for (const chunk of ALL_ACT_CHUNKS) registerActChunk(chunk);
setDevFixtures(DEV_FIXTURES);
