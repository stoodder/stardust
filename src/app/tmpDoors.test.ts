import { it } from 'vitest';
import { createSim } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import { doorBoxes } from './forcedInput.ts';
import { createHost } from './host.ts';
import { sealButtonBottom } from '../ui/hud/layout.ts';
it('boxes', () => {
  for (const door of ['convoy', 'warren']) {
    const cfg = battleConfig('a3_m03', 1, null);
    const sim = createSim({ ...cfg, scriptFlags: { ...cfg.scriptFlags, door_choice: door } } as never);
    const b = doorBoxes(createHost(sim));
    console.log(door, JSON.stringify(b), sealButtonBottom(b));
  }
});
