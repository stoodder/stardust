import { compileContent } from '../src/content/compile.ts';
import { RAW_CONTENT } from '../src/content/registry.ts';
const m = compileContent(RAW_CONTENT).maps.a2_m03;
for (let r = 0; r < m.rows; r++) console.log(m.tiles.slice(r * m.cols, (r + 1) * m.cols).join(''));
console.log(m.routes.road!.tiles.length, m.routes.mine!.tiles.length);
