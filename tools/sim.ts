// npm run sim: headless balance sims for every map (docs/tech/conventions.md § Balance sims).
// T101 stub: no maps exist yet. T108a replaces this with the CLI over src/balance/.
// Args (accepted now, used from T108a): --map <id>, --seeds <n>, --build <name>, --report.
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    map: { type: 'string' },
    seeds: { type: 'string' },
    build: { type: 'string' },
    report: { type: 'boolean', default: false },
  },
  strict: true,
});

if (values.map !== undefined) {
  console.error(`sim: unknown map '${values.map}' (0 maps registered)`);
  process.exit(1);
}
console.log('sim: 0 maps');
