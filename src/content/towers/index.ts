// The tower registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { rivet } from './rivet.ts';
import { sprinkler } from './sprinkler.ts';
import { thumper } from './thumper.ts';

export const TOWERS = defineRegistry({ rivet, thumper, sprinkler });
