// The commander ability registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { clearance_sale } from './clearance_sale.ts';
import { orbital_strike } from './orbital_strike.ts';
import { suppressing_fire } from './suppressing_fire.ts';
import { time_dilation } from './time_dilation.ts';

export const ABILITIES = defineRegistry({
  orbital_strike,
  suppressing_fire,
  time_dilation,
  clearance_sale,
});
