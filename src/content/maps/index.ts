// The map registry: one import per map folder (conventions.md § Add a map).
import { defineRegistry } from '../define.ts';
import { a1M01 } from './a1_m01/index.ts';
import { a1M02 } from './a1_m02/index.ts';
import { a1M03 } from './a1_m03/index.ts';
import { a1M04 } from './a1_m04/index.ts';

export const MAPS = defineRegistry({
  a1_m01: a1M01,
  a1_m02: a1M02,
  a1_m03: a1M03,
  a1_m04: a1M04,
});
