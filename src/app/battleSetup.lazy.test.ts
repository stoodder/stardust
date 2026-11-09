// battleSetup compiles each content set on first use (its own file, so the module cache is fresh).
import { describe, expect, it, vi } from 'vitest';
import { RAW_CONTENT } from '../content/registry.ts';
import { DEV_CONTENT } from '../render/__fixtures__/devBattle.ts';
import { battleConfig, battleMapIds, DEFAULT_MAP_ID, DEV_MAP_ID } from './battleSetup.ts';

const compiled = vi.hoisted(() => [] as unknown[]);
vi.mock('../content/compile.ts', async (importOriginal) => {
  const real = await importOriginal<typeof import('../content/compile.ts')>();
  return {
    ...real,
    compileContent: (...args: Parameters<typeof real.compileContent>) => {
      compiled.push(args[0]);
      return real.compileContent(...args);
    },
  };
});

describe('battleSetup compiles lazily', () => {
  it('lists map ids without compiling, compiles A1M1 alone, and the dev battle only when asked', () => {
    expect(battleMapIds()).toEqual(expect.arrayContaining([DEFAULT_MAP_ID, DEV_MAP_ID]));
    expect(compiled).toEqual([]);
    battleConfig(DEFAULT_MAP_ID, 1);
    battleConfig(DEFAULT_MAP_ID, 2);
    expect(compiled).toEqual([RAW_CONTENT]);
    battleConfig(DEV_MAP_ID, 1);
    expect(compiled).toEqual([RAW_CONTENT, DEV_CONTENT]);
  });
});
