// The enemy registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { chonk } from './chonk.ts';
import { hauler } from './hauler.ts';
import { nibbler } from './nibbler.ts';
import { zoomer } from './zoomer.ts';

export const ENEMIES = defineRegistry({ nibbler, zoomer, chonk, hauler });
