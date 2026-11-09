// The commander ability registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { orbital_strike } from './orbital_strike.ts';

export const ABILITIES = defineRegistry({ orbital_strike });
