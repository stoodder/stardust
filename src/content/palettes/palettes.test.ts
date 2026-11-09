import { describe, expect, it } from 'vitest';
import { SPRITES } from '../sprites/index.ts';
import { isCustomChar, STANDARD_LEGEND } from '../sprites/legend.ts';
import type { SlotPalette, SpriteDef } from '../sprites/types.ts';
import { contrastRatio, hsv, isHollowReserved, luminance } from './color.ts';
import { ENV_PALETTE_IDS, ENV_PALETTES } from './env.ts';
import { PALETTE_IDS, PALETTES } from './index.ts';
import { COLOR_NAMES, MASTER, rgbOf, type ColorName } from './master.ts';

const SLOT_COUNT = 21;

describe('master palette', () => {
  it('has well-formed hex values', () => {
    for (const name of COLOR_NAMES) expect(MASTER[name], name).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('parses hex into channels', () => {
    expect(rgbOf('ink.0')).toEqual({ r: 0x05, g: 0x03, b: 0x0a });
    expect(rgbOf('white.1')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('has complete five-step ramps wherever a ramp has a .4 step', () => {
    for (const name of COLOR_NAMES.filter((n) => n.endsWith('.4'))) {
      const base = name.slice(0, -2);
      for (let i = 0; i < 4; i++) expect(COLOR_NAMES, `${base}.${i}`).toContain(`${base}.${i}`);
    }
  });
});

describe('slot palettes', () => {
  it('map every slot to a master color', () => {
    expect(PALETTE_IDS.length).toBe(12);
    for (const id of PALETTE_IDS) {
      const p: SlotPalette = PALETTES[id];
      expect(Object.keys(p), id).toHaveLength(SLOT_COUNT);
      for (const [slot, color] of Object.entries(p))
        expect(MASTER, `${id}.${slot}`).toHaveProperty([color]);
    }
  });

  it('give the Hollow its inverted (pale) outline and everyone else a dark one', () => {
    for (const id of PALETTE_IDS) {
      const l = luminance(rgbOf(PALETTES[id].outline));
      if (id === 'hollow') expect(l).toBeGreaterThan(0.3);
      else expect(l, id).toBeLessThan(0.05);
    }
  });
});

describe('Hollow hue reservation (art-direction §2)', () => {
  it('classifies the acid ramp as reserved and neighbors as not', () => {
    expect(isHollowReserved(rgbOf('acid.3'))).toBe(true);
    expect(isHollowReserved(rgbOf('acid.2'))).toBe(true);
    expect(isHollowReserved(rgbOf('green.3'))).toBe(false);
    expect(isHollowReserved(rgbOf('gold.3'))).toBe(false);
    expect(hsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 });
  });

  it('is used by no palette except the Hollow’s', () => {
    for (const id of PALETTE_IDS.filter((p) => p !== 'hollow')) {
      for (const [slot, color] of Object.entries(PALETTES[id])) {
        expect(isHollowReserved(rgbOf(color)), `${id}.${slot} = ${color}`).toBe(false);
      }
    }
  });

  it('is used by no non-Hollow sprite legend', () => {
    for (const def of SPRITES as readonly SpriteDef[]) {
      if (def.palette === 'hollow') continue;
      for (const [ch, color] of Object.entries(def.legend ?? {})) {
        if (color === undefined) continue;
        expect(isHollowReserved(rgbOf(color)), `${def.id} '${ch}' = ${color}`).toBe(false);
      }
    }
  });
});

/** Mean luminance of a grid frame's opaque pixels under a palette (shadow pixels skipped). */
function frameLuminance(def: SpriteDef, frame: string, palette: SlotPalette): number {
  const fd = def.frames[frame];
  if (fd === undefined || !Array.isArray(fd))
    throw new Error(`${def.id}:${frame} is not a grid frame`);
  const rows: readonly string[] = fd;
  let sum = 0;
  let n = 0;
  for (const row of rows) {
    for (const ch of row) {
      const slot = STANDARD_LEGEND[ch];
      const color: ColorName | undefined =
        slot !== undefined
          ? slot === 'shadow'
            ? undefined
            : palette[slot]
          : isCustomChar(ch)
            ? def.legend?.[ch]
            : undefined;
      if (color === undefined) continue;
      sum += luminance(rgbOf(color));
      n++;
    }
  }
  return sum / n;
}

describe('path vs pad contrast (art-direction §8 Tile readability)', () => {
  const path = SPRITES.find((s) => s.id === 'tile.path') as SpriteDef | undefined;
  const pad = SPRITES.find((s) => s.id === 'tile.pad') as SpriteDef | undefined;

  it('is at least 1.5:1 in every environment palette', () => {
    expect(path).toBeDefined();
    expect(pad).toBeDefined();
    if (path === undefined || pad === undefined) return;
    for (const env of ENV_PALETTE_IDS) {
      const palette = ENV_PALETTES[env];
      const padL = frameLuminance(pad, 'v0', palette);
      for (const frame of Object.keys(path.frames)) {
        const ratio = contrastRatio(frameLuminance(path, frame, palette), padL);
        expect(ratio, `${env} path:${frame} vs pad`).toBeGreaterThanOrEqual(1.5);
      }
    }
  });
});

/** Mean luminance of a frame's body pixels: no outline, eye, or shadow (the value of its mass). */
function bodyLuminance(def: SpriteDef, frame: string, palette: SlotPalette): number {
  const fd = def.frames[frame];
  if (fd === undefined || !Array.isArray(fd))
    throw new Error(`${def.id}:${frame} is not a grid frame`);
  const rows: readonly string[] = fd;
  let sum = 0;
  let n = 0;
  for (const row of rows) {
    for (const ch of row) {
      const slot = STANDARD_LEGEND[ch];
      if (slot === 'outline' || slot === 'eye' || slot === 'shadow') continue;
      const color =
        slot !== undefined ? palette[slot] : isCustomChar(ch) ? def.legend?.[ch] : undefined;
      if (color === undefined) continue;
      sum += luminance(rgbOf(color));
      n++;
    }
  }
  return sum / n;
}

function sprite(id: string): SpriteDef {
  const d = SPRITES.find((s) => s.id === id) as SpriteDef | undefined;
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

describe('Act I value bands (art-direction §1)', () => {
  const env = ENV_PALETTES.act1;
  const grass = bodyLuminance(sprite('tile.grass'), 'v0', env);
  const path = bodyLuminance(sprite('tile.path'), 'tread_x', env);

  it('keeps the grass below the path, so the road reads in grayscale', () => {
    expect(contrastRatio(path, grass)).toBeGreaterThanOrEqual(1.3);
    expect(path).toBeGreaterThan(grass);
  });

  it('puts every enemy, ally, and tower body a band above the path they stand beside', () => {
    const actors: readonly [string, string][] = [
      ['enemy.nibbler', 'walk_se_0'],
      ['enemy.zoomer', 'walk_se_0'],
      ['enemy.chonk', 'walk_se_0'],
      ['enemy.brood_hauler', 'walk_se_0'],
      ['enemy.brood_hauler', 'walk_ne_0'],
      ['enemy.hauler_young', 'walk_se_0'],
      ['ally.bricks', 'idle_se_0'],
      ['ally.bricks', 'lowered_se_0'],
      ['tower.rivet', 't1'],
      ['tower.rivet', 'spec_a'],
      ['tower.rivet', 'spec_b'],
      ['tower.thumper', 't1'],
      ['tower.thumper', 'spec_a'],
      ['tower.thumper', 'spec_b'],
      ['tower.sprinkler', 't1'],
    ];
    for (const [id, frame] of actors) {
      const d = sprite(id);
      const l = bodyLuminance(d, frame, PALETTES[d.palette]);
      expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(1.2);
      expect(l, `${id}:${frame}`).toBeGreaterThan(path);
    }
  });
});
