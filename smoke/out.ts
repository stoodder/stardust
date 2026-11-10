// Where the smoke run writes its output (conventions.md § Browser smoke tests): `SMOKE_OUT`, else
// ./test-results. Playwright cleans it at the start of each run. Agents sharing a checkout each set
// their own, so one run's cleanup never deletes another's screenshots.
export const SMOKE_OUT = process.env['SMOKE_OUT'] ?? './test-results';

/** A path under the smoke output folder, such as `outPath('screens/m1/01-title.png')`. */
export function outPath(rel: string): string {
  return `${SMOKE_OUT.replace(/\/+$/, '')}/${rel}`;
}
