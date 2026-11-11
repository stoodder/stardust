import { getHeapStatistics, setFlagsFromString } from 'node:v8';
import { runInNewContext } from 'node:vm';
import { it } from 'vitest';
it('probe', () => {
  setFlagsFromString('--expose-gc');
  const gc = runInNewContext('gc') as () => void;
  const o = { x: 0.5 };
  const run = (n: number): void => { for (let i = 0; i < n; i++) o.x = (i % 3) * 0.5; };
  for (const n of [20000, 5000, 5000, 50000]) {
    run(20000); gc();
    const b = getHeapStatistics().used_heap_size; run(n);
    console.log('empty', n, getHeapStatistics().used_heap_size - b);
  }
});
