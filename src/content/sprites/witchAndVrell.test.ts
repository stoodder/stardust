// T440b's art (art-direction §4–§6, §8): the Glass Witch (Ves'thara's lumenglass avatar) in every
// boss state, the Vrell towers licensed in Act II (Lookout Shack, Grapple Harpoon, Salvage Crane)
// with their spec frames, the idle heads' spec anims, Scanner Sweep's icon, and the Act II sack
// burst. The tier and spec silhouette rules every tower shares are in art.test.ts.
import { describe, expect, it } from 'vitest';
import { SPRITES } from './index.ts';
import type { SpriteDef } from './types.ts';

function def(id: string): SpriteDef {
  const d: SpriteDef | undefined = SPRITES.find((s) => s.id === id);
  if (d === undefined) throw new Error(`no sprite ${id}`);
  return d;
}

function grid(id: string, frame: string): readonly string[] {
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

/** Opaque bounds (shadow excluded). */
function bounds(rows: readonly string[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  rows.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if ('._'.includes(r.charAt(x))) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { x0, x1, y0, y1 };
}

/** Transparent pixels the outside can't reach (4-connected): the see-through gaps. */
function holes(rows: readonly string[]): number {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const seen = new Set<number>();
  const stack: number[] = [];
  const push = (x: number, y: number): void => {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const k = y * w + x;
    if (seen.has(k) || rows[y]?.[x] !== '.') return;
    seen.add(k);
    stack.push(k);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }
  while (stack.length > 0) {
    const k = stack.pop() ?? 0;
    push((k % w) - 1, Math.floor(k / w));
    push((k % w) + 1, Math.floor(k / w));
    push(k % w, Math.floor(k / w) - 1);
    push(k % w, Math.floor(k / w) + 1);
  }
  return count(rows, '.') - seen.size;
}

const WITCH = 'enemy.glass_witch';

/** White eye cores in the head's rows of a Witch frame. */
function eyes(frame: string): number {
  return count(grid(WITCH, frame).slice(0, 18), 'w');
}
const POSES = ['walk', 'tell', 'blink', 'puff', 'flee'] as const;

describe('the Glass Witch (T440b; art-direction §6)', () => {
  const frames = Object.entries(def(WITCH).frames).filter((e): e is [string, string[]] =>
    Array.isArray(e[1]),
  );

  it('is woven Aelari: blue outline outside only, real gaps, lit from inside, no auto outline', () => {
    const d = def(WITCH);
    expect(d.palette).toBe('aelari');
    expect(d.outline ?? 'none').toBe('none');
    for (const [name, rows] of frames) {
      expect(holes(rows), name).toBeGreaterThanOrEqual(10);
      expect(count(rows, 'x'), name).toBeGreaterThan(40);
      expect(count(rows, '+*'), name).toBeGreaterThan(0);
    }
  });

  it('wears the cut ruby collar thread in every frame (Ves’thara’s unthreading)', () => {
    for (const [name, rows] of frames) {
      // The collar: a ruby run across one row; the cut end: ruby hanging below it.
      const collar = rows.findIndex((r) => /[cd]{8}/.test(r));
      expect(collar, name).toBeGreaterThan(0);
      expect(count(rows.slice(collar + 1, collar + 7), 'abc'), name).toBeGreaterThanOrEqual(4);
    }
  });

  it('is the tallest Aelari on the road, within the boss canvas', () => {
    expect(def(WITCH).size.h).toBeGreaterThan(def('enemy.weft_warden').size.h + 12);
    expect(def(WITCH).size.w).toBeLessThanOrEqual(64);
    expect(def(WITCH).size.h).toBeLessThanOrEqual(64);
  });

  it('has an anim for every boss state, in four facings, each its own shape', () => {
    const anims = def(WITCH).anims ?? {};
    for (const p of POSES) {
      for (const f of ['se', 'sw', 'ne', 'nw'])
        expect(anims[`${p}_${f}`], `${p}_${f}`).toBeDefined();
    }
    const sig = (f: string): string => {
      const b = bounds(grid(WITCH, f));
      return `${b.x0},${b.x1},${b.y0},${b.y1}`;
    };
    // Every pose's silhouette differs from the walk's and from every other pose's.
    const shapes = POSES.map((p) => sig(`${p}_se_0`));
    expect(new Set(shapes).size).toBe(POSES.length);
    // The pulse tell raises both arms: wider and with light in the palms high up.
    const tell = bounds(grid(WITCH, 'tell_se_1'));
    const walk = bounds(grid(WITCH, 'walk_se_0'));
    expect(tell.x1 - tell.x0).toBeGreaterThan(walk.x1 - walk.x0 + 4);
    // The blink tell draws her up tall; the puff and the retreat bow her head.
    expect(bounds(grid(WITCH, 'blink_se_0')).y0).toBeLessThan(walk.y0);
    expect(bounds(grid(WITCH, 'puff_se_0')).y0).toBeGreaterThan(walk.y0);
    expect(bounds(grid(WITCH, 'flee_se_0')).y0).toBeGreaterThan(walk.y0);
  });

  it('shows her eyes facing you, white-cored except in the retreat, and none from behind', () => {
    expect(eyes('walk_se_0')).toBeGreaterThanOrEqual(2);
    expect(eyes('flee_se_0')).toBe(0);
    expect(eyes('walk_ne_0')).toBe(0);
  });

  it('glides: her walk frames differ (bob, hum, swaying hem)', () => {
    const walk = [0, 1, 2, 3].map((k) => grid(WITCH, `walk_se_${k}`).join('|'));
    expect(new Set(walk).size).toBe(4);
  });

  it('has a woven wave-preview icon', () => {
    const icon = grid('icon.enemy.glass_witch', 'icon');
    expect(icon.length).toBe(16);
    expect(holes(icon)).toBeGreaterThan(0);
    expect(count(icon, 'cd')).toBeGreaterThanOrEqual(6);
  });
});

describe('the Act II Vrell towers (T440b; design/towers.md § Vrell towers)', () => {
  const towers = ['lookout', 'harpoon', 'crane'] as const;

  it('are Vrell scrap: brass, the price tag on, no Everglow logo plate', () => {
    for (const t of towers) {
      const base = def(`tower.${t}`);
      expect(base.palette, t).toBe('vrell');
      expect(def(`tower.${t}_head`).palette, t).toBe('vrell');
      for (const f of ['t1', 't3', 'spec_a', 'spec_b']) {
        expect(count(grid(`tower.${t}`, f), 'W'), `${t}:${f}`).toBeGreaterThanOrEqual(5);
      }
      expect(def(`icon.tower.${t}`).palette, t).toBe('vrell');
      expect(count(grid(`icon.tower.${t}`, 'icon'), 'W'), t).toBeGreaterThan(0);
    }
  });

  it('Lookout looks about (an idle sweep) with a green lens glint, and has spec idle anims', () => {
    const head = def('tower.lookout_head');
    expect(Object.keys(head.anims ?? {})[0]).toBe('look');
    const looks = [0, 1, 2, 3].map((k) => grid('tower.lookout_head', `look_${k}`).join('|'));
    expect(new Set(looks).size).toBe(4);
    expect(count(grid('tower.lookout_head', 'look_0'), 'G')).toBeGreaterThan(0);
    expect(head.anims?.['look_spec_a']).toBeDefined();
    expect(head.anims?.['look_spec_b']).toBeDefined();
    // Crow's Nest's base mast stands taller than anything at tier 3.
    expect(bounds(grid('tower.lookout', 'spec_a')).y0).toBeLessThan(
      bounds(grid('tower.lookout', 't3')).y0,
    );
  });

  it('Harpoon fires its harpoon away: the fire frame loses the loaded steel point', () => {
    for (const f of ['se', 'ne', 'se_spec_a', 'se_spec_b']) {
      const fire = f.replace(/^(se|ne)(.*)$/, '$1$2_fire');
      expect(count(grid('tower.harpoon_head', fire), 'S'), f).toBeLessThan(
        count(grid('tower.harpoon_head', f), 'S'),
      );
    }
    // Skewer's lance reaches further than the plain harpoon.
    expect(bounds(grid('tower.harpoon_head', 'se_spec_a')).x1).toBeGreaterThan(
      bounds(grid('tower.harpoon_head', 'se_t2')).x1 + 3,
    );
  });

  it('Crane hangs a hook, and only the Magnet Crane slams (its fire frame drops the magnet)', () => {
    const anims = def('tower.crane_head').anims ?? {};
    expect(anims['fire_se_spec_b']).toMatchObject({
      frames: ['se_spec_b_fire', 'se_spec_b_fire', 'se_spec_b'],
    });
    // The others' "fire" anims are single stills: they exist only to bake the mirrored facings.
    for (const a of ['fire_se', 'fire_ne_t2', 'fire_se_spec_a']) {
      expect(anims[a], a).toMatchObject({ frames: [expect.any(String)] });
    }
    // The slam: the magnet white-hot underneath, sparks thrown.
    expect(count(grid('tower.crane_head', 'se_spec_b_fire'), '*w')).toBeGreaterThan(
      count(grid('tower.crane_head', 'se_spec_b'), '*w') + 4,
    );
  });
});

describe('spec heads for the idle towers (T440b)', () => {
  it('Sprinkler spins its spec heads: Flash Freeze frosted, Cloudburst raised and wider', () => {
    const head = def('tower.sprinkler_head');
    expect(Object.keys(head.anims ?? {})[0]).toBe('spin');
    for (const s of ['spec_a', 'spec_b']) expect(head.anims?.[`spin_${s}`], s).toBeDefined();
    const t1 = bounds(grid('tower.sprinkler_head', 'spin_0'));
    const cloud = bounds(grid('tower.sprinkler_head', 'spin_spec_b_0'));
    expect(cloud.y0).toBeLessThan(t1.y0 - 3);
    expect(cloud.x1 - cloud.x0).toBeGreaterThan(t1.x1 - t1.x0);
    expect(count(grid('tower.sprinkler_head', 'spin_spec_a_0'), 'C')).toBeGreaterThan(
      count(grid('tower.sprinkler_head', 'spin_0'), 'C') + 10,
    );
  });
});

describe('Act II effects and icons (T440b)', () => {
  it("bursts an Act II Hauler's sack with its young showing, then pops as in Act I", () => {
    const anims = def('fx.sack_burst').anims ?? {};
    expect(anims['burst_young']).toMatchObject({
      frames: ['young_0', 'f1', 'f2', 'f3', 'f4'],
      loop: false,
    });
    // The young's eyes in the sack's mouth.
    expect(count(grid('fx.sack_burst', 'young_0'), 'K')).toBeGreaterThanOrEqual(6);
    expect(count(grid('fx.sack_burst', 'f0'), 'k')).toBe(0);
  });

  it("Scanner Sweep's icon is a scope in detection's green", () => {
    const d = def('icon.ability.scanner_sweep');
    expect(d.legend?.G).toBe('green.4');
    expect(count(grid('icon.ability.scanner_sweep', 'icon'), 'GHF')).toBeGreaterThan(10);
  });
});
