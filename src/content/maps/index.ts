// The map registry: one import per map folder (conventions.md § Add a map).
import { defineRegistry } from '../define.ts';
import { a1M01 } from './a1_m01/index.ts';

export const MAPS = defineRegistry({ a1_m01: a1M01 });
