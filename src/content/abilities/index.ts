// The commander ability registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { orbital_strike } from './orbital_strike.ts';
import { suppressing_fire } from './suppressing_fire.ts';

export const ABILITIES = defineRegistry({ orbital_strike, suppressing_fire });
