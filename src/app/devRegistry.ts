// The dev fixtures (the dev battles' content, render/__fixtures__/devBattle.ts, and the dev saves,
// meta/__fixtures__/devSaves.ts), kept out of the initial JS (D150). A dev URL loads them before
// the game boots (`loadDevFixtures`, boot.ts: `?map=<a dev map>` or `?test=1&save=<id>`); until
// then battleSetup.ts and save.ts see the live game only. Tests and Node tools register them up
// front (`setDevFixtures`; tools/vitestSetup.ts, smoke/battle.spec.ts). No other imports, so a
// test that mocks a module can still register them first.
import type { IdSpace, RawContent } from '../content/types.ts';
import type { DevSave } from '../meta/__fixtures__/devSaves.ts';

export interface DevFixtures {
  readonly content: RawContent<IdSpace>;
  readonly saves: Readonly<Record<string, DevSave>>;
}

let fixtures: DevFixtures | null = null;

/** The dev fixtures, or null until they're loaded or set. */
export function devFixtures(): DevFixtures | null {
  return fixtures;
}

/** Registers the dev fixtures (tests and Node tools import them statically). */
export function setDevFixtures(f: DevFixtures): void {
  fixtures = f;
}

/** Loads the dev fixtures' chunk on demand (a dev URL, before boot), once. */
export async function loadDevFixtures(): Promise<DevFixtures> {
  if (fixtures === null) fixtures = (await import('./devFixtures.ts')).DEV_FIXTURES;
  return fixtures;
}
