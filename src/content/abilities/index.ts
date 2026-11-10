// The commander ability registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { clearance_sale } from './clearance_sale.ts';
import { orbital_strike } from './orbital_strike.ts';
import { scanner_sweep } from './scanner_sweep.ts';
import { stillness } from './stillness.ts';
import { suppressing_fire } from './suppressing_fire.ts';
import { time_dilation } from './time_dilation.ts';

export const ABILITIES = defineRegistry({
  orbital_strike,
  suppressing_fire,
  time_dilation,
  clearance_sale,
  scanner_sweep,
  // M5 (T500a stub: Ves'thara's, run by T507).
  stillness,
});
