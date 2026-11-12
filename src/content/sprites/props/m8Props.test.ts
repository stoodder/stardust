// M8's props and tiles (T842; art-direction §6, finale.md § FIN): the frames say what they should
// at 1×. Every tower class has a memorial wreck, dead but for its gold tag; the waymarks are dark,
// lit gold (breathing under 3 Hz) or knocked down, and their wrecks are wreckage with the stake;
// the Deep Bore's gauge fills by eighths and its head hangs over the bore mouth; the Halls glow
// sung gold, never the forgotten's violet; the ledges and seams are the Halls' own.
import { describe, expect, it } from 'vitest';
import { TOWERS } from '../../towers/index.ts';
import type { SpriteId } from '../index.ts';
import { ALL_SPRITES } from '../all.ts';
import type { SpriteDef } from '../types.ts';
import { BORE_MOUNT, boreGaugeFrame } from './bore_rig.ts';
import { deadChar, MEMORIAL_FALLBACK, memorialWreckFrame } from './memorial_wreck.ts';

function def(id: SpriteId): SpriteDef {
  const d = ALL_SPRITES.find((s) => s.id === id);
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

function grid(id: SpriteId, frame: string): readonly string[] {
  const f = def(id).frames[frame];
  if (f === undefined || !Array.isArray(f)) throw new Error(`${id}:${frame} is not a grid`);
  return f;
}

function count(rows: readonly string[], chars: string): number {
  return rows
    .join('')
    .split('')
    .filter((c) => chars.includes(c)).length;
}

function anim(
  id: SpriteId,
  name: string,
): { frames: readonly string[]; fps: number; loop?: boolean } {
  const a = def(id).anims?.[name];
  if (a === undefined || !('frames' in a)) throw new Error(`${id} has no anim ${name}`);
  return a;
}

/** The custom legend chars that map to a colour family (`gold`, `violet`…). */
function charsOf(id: SpriteId, family: string): string {
  return Object.entries(def(id).legend ?? {})
    .filter(([, c]) => c?.startsWith(`${family}.`))
    .map(([ch]) => ch)
    .join('');
}

describe('the memorial wreck', () => {
  it('has a wreck for every tower class, each its own', () => {
    const frames = Object.keys(def('prop.memorial_wreck').frames).toSorted();
    expect(frames).toEqual(Object.keys(TOWERS).toSorted());
    const seen = new Set(frames.map((f) => grid('prop.memorial_wreck', f).join('')));
    expect(seen.size).toBe(frames.length);
  });

  it("names the save's class, and falls back to the Rivet", () => {
    expect(memorialWreckFrame('prism')).toBe('prism');
    expect(memorialWreckFrame(null)).toBe(MEMORIAL_FALLBACK);
    expect(memorialWreckFrame(undefined)).toBe('rivet');
    expect(memorialWreckFrame('no_such_tower')).toBe('rivet');
  });

  it('is dead: no light in it but the tag, and nothing violet grows on it', () => {
    const d = def('prop.memorial_wreck');
    expect(Object.values(d.legend ?? {}).some((c) => c?.startsWith('violet'))).toBe(false);
    expect(Object.values(d.legend ?? {}).some((c) => c === 'white.1')).toBe(false);
    for (const f of Object.keys(d.frames)) {
      const g = grid('prop.memorial_wreck', f);
      // The tag: a small gold-rimmed plate, the only emissive pixels.
      expect(count(g, '+*'), f).toBeGreaterThanOrEqual(8);
      expect(count(g, '+*'), f).toBeLessThanOrEqual(14);
      expect(count(g, 'Z'), f).toBeGreaterThan(0);
      // Still a tower's bulk, not a scatter of pixels.
      expect(
        count(
          g.map((r) => r.replace(/[._+*Z]/g, '')),
          'ABCDEFGHIKLMNOPQRSTUXY',
        ),
      ).toBeGreaterThan(200);
    }
  });

  it('drains every colour to its dull ramp', () => {
    expect(deadChar('teal.4')).toBe('H');
    expect(deadChar('teal.0')).toBe('G');
    expect(deadChar('gold.4')).toBe('L'); // a lantern, out
    expect(deadChar('white.1')).toBe('F'); // Everglow white, grey
    expect(deadChar('ink.0')).toBe('A');
    expect(deadChar('coral.3')).toBe('T'); // a Skitterkin body is only earth
    // Aelari glass drains to navy under slate, never a saturated blue (M9: T901).
    expect(deadChar('blue.3')).toBe('C');
    expect(deadChar('blue.2')).toBe('I');
    expect(deadChar('pink.4')).toBe('D');
    expect(Object.values(def('prop.memorial_wreck').legend ?? {})).not.toContain('blue.1');
  });
});

describe('the waymarks', () => {
  it('stands dark, burns gold (breathing under 3 Hz), kindles once, and lies knocked down', () => {
    const gold = charsOf('prop.waymark', 'gold');
    expect(count(grid('prop.waymark', 'dark'), '+*')).toBe(0);
    expect(count(grid('prop.waymark', 'lit'), '+*')).toBeGreaterThan(10);
    expect(count(grid('prop.waymark', 'lit'), gold)).toBeGreaterThan(4); // the glyph lit
    expect(grid('prop.waymark', 'lit').join('')).not.toBe(grid('prop.waymark', 'lit_1').join(''));
    expect(anim('prop.waymark', 'lit').fps).toBeLessThanOrEqual(3);
    const light = anim('prop.waymark', 'light');
    expect(light.loop).toBe(false);
    expect(light.frames.at(-1)).toBe('lit');
    expect(count(grid('prop.waymark', 'wreck'), '+*')).toBe(0);
    expect(def('prop.waymark').glow?.slots).toEqual(['e0', 'e1']);
  });

  it('wrecks as wreckage: two looks with the stake, lit, half (stood up) and their anims', () => {
    const w = def('prop.wreckage');
    for (const v of ['v8', 'v9']) {
      for (const f of [v, `${v}_lit`, `${v}_half`]) expect(w.frames[f], f).toBeDefined();
      expect(anim('prop.wreckage', `blink_${v}`).frames).toEqual([v, `${v}_lit`]);
      expect(anim('prop.wreckage', `idle_${v}`).frames).toHaveLength(8);
      expect(count(grid('prop.wreckage', v), 'O')).toBeGreaterThan(3); // the stake's hazard paint
      expect(count(grid('prop.wreckage', `${v}_lit`), 'Y')).toBeGreaterThan(0); // its beacon
    }
    expect(grid('prop.wreckage', 'v8').join('')).not.toBe(grid('prop.wreckage', 'v9').join(''));
  });
});

describe("the Deep Bore's rig", () => {
  it('fills its gauge by eighths, violet from the bottom', () => {
    const violet = charsOf('prop.bore_rig', 'violet');
    let last = -1;
    for (let k = 0; k <= 8; k++) {
      const n = count(grid('prop.bore_rig', `g${k}`), violet);
      expect(n, `g${k}`).toBeGreaterThan(last);
      last = n;
    }
    expect(boreGaugeFrame(0)).toBe('g0');
    expect(boreGaugeFrame(0.124)).toBe('g0');
    expect(boreGaugeFrame(0.125)).toBe('g1');
    expect(boreGaugeFrame(0.39)).toBe('g3');
    expect(boreGaugeFrame(1)).toBe('g8');
    expect(boreGaugeFrame(1.5)).toBe('g8');
  });

  it('burns full at the breakthrough, flashing under 3 Hz', () => {
    const full = anim('prop.bore_rig', 'full');
    expect(full.fps).toBeLessThanOrEqual(3);
    expect(grid('prop.bore_rig', 'full_0').join('')).not.toBe(
      grid('prop.bore_rig', 'full_1').join(''),
    );
  });

  it("hangs the drill head's tip just over the bore mouth, with room for the head above it", () => {
    const rig = def('prop.bore_rig');
    expect(rig.mount).toEqual(BORE_MOUNT);
    const head = def('fx.bore_head');
    expect(BORE_MOUNT.y - head.anchor.y).toBeGreaterThan(0);
    expect(BORE_MOUNT.x).toBe(rig.anchor.x);
    // The bore mouth (ink.0, violet-rimmed) lies under the mount.
    const g = grid('prop.bore_rig', 'g0');
    expect(g[BORE_MOUNT.y]?.[BORE_MOUNT.x]).toBe('Z');
  });
});

describe('the Halls', () => {
  it('glow sung gold, never violet: the mouth, the ledges, the seams', () => {
    expect(charsOf('prop.halls_mouth', 'violet')).toBe('');
    for (const f of ['v0', 'glint_1', 'glint_2']) {
      expect(count(grid('prop.halls_mouth', f), '+*'), f).toBeGreaterThan(20);
    }
    expect(anim('prop.halls_mouth', 'glint').fps).toBeLessThanOrEqual(3);
    const ledgeGold = 'DEF'; // the high ground's seam chars (gold.2, gold.3, pink.3)
    expect(def('tile.high_ground').legend).toMatchObject({ D: 'gold.2', E: 'gold.3', F: 'pink.3' });
    expect(count(grid('tile.high_ground', 'halls'), ledgeGold)).toBeGreaterThan(4);
    expect(count(grid('tile.high_ground', 'halls'), 'GHI')).toBe(0); // no Aelari thread-glass
    const seam = anim('tile.power_node', 'seam');
    expect(seam.frames).toHaveLength(4);
    const gold = 'ABCE';
    for (const f of seam.frames) {
      expect(count(grid('tile.power_node', f), gold), f).toBeGreaterThan(16);
      expect(count(grid('tile.power_node', f), 'UVG'), f).toBe(0); // not the conduit's violet
    }
    expect(new Set(seam.frames.map((f) => grid('tile.power_node', f).join(''))).size).toBe(4);
  });
});

describe("A3M3's tunnel mouths", () => {
  it("draws the convoy's portal and the warren's burrow, each with its light", () => {
    for (const f of ['convoy', 'warren']) {
      expect(count(grid('prop.tunnel_mouth', f), '*'), f).toBeGreaterThan(0);
      expect(count(grid('prop.tunnel_mouth', f), 'Z'), f).toBeGreaterThan(10); // the dark inside
    }
    expect(count(grid('prop.tunnel_mouth', 'convoy'), 'O')).toBeGreaterThan(3); // hazard lintel
    expect(count(grid('prop.tunnel_mouth', 'warren'), 'QR')).toBeGreaterThan(10); // moss
  });
});
