import { describe, expect, it } from 'vitest';
import { SPRITES } from '../sprites/index.ts';
import { isCustomChar, STANDARD_LEGEND } from '../sprites/legend.ts';
import type { SlotPalette, SpriteDef } from '../sprites/types.ts';
import {
  ACT2_BAND_ACTORS,
  AELARI_BAND_FRAMES,
  bodyLuminance,
  HOLLOW_BAND_FRAMES,
  slotLuminance,
  sprite,
} from '../__fixtures__/valueBands.ts';
import { contrastRatio, hsv, isHollowReserved, luminance } from './color.ts';
import { ENV_PALETTE_IDS, ENV_PALETTES, ENV_SKY } from './env.ts';
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
      ['tower.skyhook', 't1'],
      ['tower.zapcoil', 't1'],
      ['tower.zapcoil', 't3'],
      // T440b: the idle heads' and Vrell towers' spec bases, and Act II's Vrell towers.
      ['tower.sprinkler', 'spec_a'],
      ['tower.sprinkler', 'spec_b'],
      ['tower.skyhook', 'spec_a'],
      ['tower.skyhook', 'spec_b'],
      ['tower.zapcoil', 'spec_a'],
      ['tower.zapcoil', 'spec_b'],
      ['tower.lookout', 't1'],
      ['tower.lookout', 'spec_a'],
      ['tower.harpoon', 'spec_b'],
      ['tower.crane', 'spec_a'],
      ['enemy.puffwing', 'walk_se_1'],
      ['enemy.bunchling', 'walk_se_0'],
      ['enemy.digger', 'walk_se_0'],
      ['enemy.digger', 'dig_se_0'],
      ['enemy.elder', 'walk_se_0'],
      ['enemy.elder', 'walk_ne_0'],
      ['enemy.youngling', 'walk_se_0'],
      ['enemy.gerald', 'walk_se_0'],
      ['enemy.chitterbloom', 'walk_se_0'],
      ['enemy.chitterbloom', 'walk_ne_0'],
      ['enemy.chitterbloom', 'panic_se_0'],
      ['prop.salvage_drone', 'fly_0'],
    ];
    for (const [id, frame] of actors) {
      const d = sprite(id);
      const l = bodyLuminance(d, frame, PALETTES[d.palette]);
      expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(1.2);
      expect(l, `${id}:${frame}`).toBeGreaterThan(path);
    }
  });
});

describe("Act II's gold (art-direction §3, D134)", () => {
  it('turns the grass gold, not olive: hue 38–42°, saturated, on its body steps', () => {
    for (const step of [1, 2, 3] as const) {
      const { h, s } = hsv(rgbOf(`act2.grass.${step}`));
      expect(h, `act2.grass.${step} hue`).toBeGreaterThanOrEqual(38);
      expect(h, `act2.grass.${step} hue`).toBeLessThanOrEqual(42);
      expect(s, `act2.grass.${step} saturation`).toBeGreaterThanOrEqual(0.75);
    }
  });
});

describe('Act II value bands (art-direction §1 and §3, T440a, T440c)', () => {
  // Act II's ground is re-banded under Act I's units (T440c, D119): dry gold grass < the rust
  // road < every Skitterkin, ally, and tower body, as in Act I. The Hollow reads by its dark
  // interior inside a pale outline; the Aelari, whose lattices have real holes (the road shows
  // through them), by bright knots in a dark blue rim.
  for (const env of ['act2.gold', 'act2.dusk'] as const) {
    const palette = ENV_PALETTES[env];
    const grass = bodyLuminance(sprite('tile.grass'), 'v0', palette);
    const path = bodyLuminance(sprite('tile.path'), 'tread_x', palette);

    it(`${env}: keeps the grass a band below the road`, () => {
      expect(path).toBeGreaterThan(grass);
      expect(contrastRatio(path, grass)).toBeGreaterThanOrEqual(1.3);
      // The grass's value stays in its band (≈ 0.22, art-direction §3) whatever its hue does.
      expect(grass).toBeGreaterThan(0.19);
      expect(grass).toBeLessThan(0.25);
    });

    it(`${env}: puts every Act II unit, ally, and tower body a band above the road`, () => {
      for (const [id, frame] of ACT2_BAND_ACTORS) {
        const d = sprite(id);
        const l = bodyLuminance(d, frame, PALETTES[d.palette]);
        expect(l, `${id}:${frame}`).toBeGreaterThan(path);
        expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(1.2);
      }
    });

    it(`${env}: the Hollow sits well below the ground it crosses, Heavy too`, () => {
      for (const frame of HOLLOW_BAND_FRAMES) {
        const d = sprite('enemy.mote');
        const l = bodyLuminance(d, frame, PALETTES[d.palette]);
        expect(contrastRatio(l, path), frame).toBeGreaterThanOrEqual(2);
        expect(contrastRatio(l, grass), frame).toBeGreaterThanOrEqual(1.6);
      }
    });

    it(`${env}: the Aelari's knots shine over the road inside a rim darker than it`, () => {
      for (const [id, frame] of AELARI_BAND_FRAMES) {
        const d = sprite(id);
        const knots = slotLuminance(d, frame, ['e0', 'e1', 'hi']);
        const rim = slotLuminance(d, frame, ['outline']);
        expect(contrastRatio(knots, path), `${id}:${frame} knots`).toBeGreaterThanOrEqual(2);
        expect(path, `${id}:${frame} rim`).toBeGreaterThan(rim);
        expect(contrastRatio(rim, path), `${id}:${frame} rim`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

describe('coloured darks (art-direction §1 principle 4, review R11)', () => {
  it('never paints a sky band or an env shade pure black: every dark keeps a hue', () => {
    for (const env of ENV_PALETTE_IDS) {
      for (const name of [...ENV_SKY[env], ENV_PALETTES[env].outline]) {
        expect(MASTER[name], `${env}: ${name}`).not.toBe('#000000');
        // A dark (value under a quarter) is a coloured near-black, never a grey one.
        const { s, v } = hsv(rgbOf(name));
        if (v < 0.25) expect(s, `${env}: ${name} saturation`).toBeGreaterThanOrEqual(0.3);
      }
    }
  });
});

describe('Act III value bands (art-direction §3, review R11)', () => {
  // The Long Night: near-black ground < the road < every unit, ally, and tower body by a wide
  // band, and the Hollow, dark on dark, read by its pale rim.
  const env = ENV_PALETTES.act3;
  const ground = bodyLuminance(sprite('tile.grass'), 'v0', env);
  const path = bodyLuminance(sprite('tile.path'), 'tread_x', env);

  it('keeps the ground a band below the road', () => {
    expect(path).toBeGreaterThan(ground);
    expect(contrastRatio(path, ground)).toBeGreaterThanOrEqual(1.3);
  });

  it('puts every Act III unit, ally, and tower body well above the road', () => {
    const actors: readonly [string, string][] = [
      ['ally.bricks', 'idle_se_0'],
      ['ally.bricks', 'block_se_0'],
      ['ally.bricks', 'last_se_0'],
      ['ally.swarmling', 'walk_se_0'],
      ['ally.swarmling', 'latch_se_0'],
      ['ally.champion', 'walk_se_0'],
      ['ally.refugee', 'walk_se_0'],
      ['ally.refugee', 'carry_se_0'],
      ['ally.pebble', 'walk_se_0'],
      ['enemy.compliance', 'walk_se_0'],
      ['enemy.expediter', 'walk_se_0'],
      ['tower.burrow', 't1'],
      ['tower.burrow', 'spec_a'],
      ['tower.choir', 't1'],
      ['tower.choir', 'spec_b'],
      ['tower.rivet', 't1'],
      ['tower.thumper', 't1'],
      ['tower.zapcoil', 't1'],
      ['tower.sprinkler', 't1'],
      ['tower.skyhook', 't1'],
      ['tower.lookout', 't1'],
      ['tower.prism', 't1'],
      ['tower.mindspike', 't1'],
      ['tower.bloom', 't1'],
      ['tower.lantern', 't1'],
    ];
    for (const [id, frame] of actors) {
      const d = sprite(id);
      const l = bodyLuminance(d, frame, PALETTES[d.palette]);
      expect(contrastRatio(l, path), `${id}:${frame}`).toBeGreaterThanOrEqual(2);
      expect(l, `${id}:${frame}`).toBeGreaterThan(path);
    }
  });

  it("reads the Hollow by its pale rim over the road, its bodies dark under the units' band", () => {
    const rim = luminance(rgbOf(PALETTES.hollow.outline));
    expect(contrastRatio(rim, path)).toBeGreaterThanOrEqual(3);
    for (const [id, frame] of [
      ['enemy.mote', 'walk_se_0'],
      ['enemy.maw', 'walk_se_0'],
      ['enemy.maw', 'tell_se_0'],
      ['enemy.undertow', 'walk_se_0'],
      ['enemy.riftmoth', 'walk_se_0'],
      ['enemy.fracture', 'walk_se_0'],
    ] as const) {
      const l = bodyLuminance(sprite(id), frame, PALETTES.hollow);
      expect(contrastRatio(rim, l), `${id}:${frame} rim`).toBeGreaterThanOrEqual(3);
      expect(l, `${id}:${frame}`).toBeLessThan(0.15);
    }
  });
});
