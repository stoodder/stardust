// Review A1 (D143): one env-look table instead of env names compared across the render code.
import { describe, expect, it } from 'vitest';
import { ENV_PALETTE_IDS } from '../../content/palettes/env.ts';
import { isLongNight } from '../vfx/nightGlow.ts';
import { ENV_LOOKS, envLook } from './envLook.ts';
import { decorLook, isActTwo, peekerShows } from './groundTiles.ts';
import { nightRings } from './nightRings.ts';

describe('the env-look table (review A1)', () => {
  it('has a row for every env palette', () => {
    expect(Object.keys(ENV_LOOKS).toSorted()).toEqual([...ENV_PALETTE_IDS].toSorted());
  });

  it('reads an unknown or missing env as Act I', () => {
    expect(envLook(undefined)).toBe(ENV_LOOKS.act1);
    expect(envLook('dev')).toBe(ENV_LOOKS.act1);
  });

  it('drives every helper that used to compare env names', () => {
    for (const env of ENV_PALETTE_IDS) {
      const look = ENV_LOOKS[env];
      expect(isActTwo(env), env).toBe(look.decor === 'act2');
      expect(peekerShows(env), env).toBe(look.peeker);
      expect(nightRings(env), env).toBe(look.nightRings);
      expect(isLongNight(env), env).toBe(look.longNight);
    }
    // As before: only the Long Night hides the Peeker and glows without a darkness schedule; Act III
    // and the finale draw night rings; Act III's decor takes its own looks.
    expect(ENV_PALETTE_IDS.filter((e) => !ENV_LOOKS[e].peeker)).toEqual(['act3']);
    expect(ENV_PALETTE_IDS.filter((e) => ENV_LOOKS[e].nightRings)).toEqual(['act3', 'finale']);
    expect(decorLook('prop.dome', 'act3').frame).toBe('dark');
    expect(decorLook('prop.billboard', 'act2.dusk').frame).toBe('peeling');
    expect(decorLook('prop.dome', 'finale')).toEqual(decorLook('prop.dome', 'act1'));
  });
});
