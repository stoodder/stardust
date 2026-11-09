import { it } from 'vitest';
import { runMap } from './harness.ts';
import { PLAIN_CONTENT, NO_SPLASH_CONTENT, FIXTURE_CATALOG } from './__fixtures__/harness.ts';
it('dbg', () => {
  for (const r of [runMap(PLAIN_CONTENT, 'fx_map', { seeds: 2 }), runMap(NO_SPLASH_CONTENT, 'fx_map', { seeds: 3, catalog: FIXTURE_CATALOG })]) {
    for (const c of r.checks) console.log(c.id, c.subject, c.ok, c.summary, c.failures.slice(0, 3).join(' | '));
  }
});
