// Act II, part two's event sounds (T550, T501h): towers with their own voices, beams (a lock per
// lock, a plink per lock), phasing, the Hollow's splits, the Penitent and the pivot, the Escort,
// Echo Spike, Stillness, Sundown, and tower income; and the tables cover M5's content.
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../content/enemies/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { EnemyFaction, IdSpace } from '../content/types.ts';
import type { SimEvent, SimEventType } from '../sim/index.ts';
import {
  createEventSounds,
  SOUND_EVENT_TYPES,
  type EnemyLookup,
  type SoundCall,
} from './eventSounds.ts';
import { ATTACK_SOUNDS, bossSounds, ENEMY_LOOPS, ENEMY_POP_PITCH } from './eventTables.ts';
import { HOLLOW_QUIET } from './eventTablesAct2.ts';
import { FACTION_SPLIT_SOUNDS, TOWER_SOUNDS } from './eventTablesAct2b.ts';
import { SFX } from './sfx/index.ts';

type E = SimEvent<IdSpace>;

const FACTIONS: Readonly<Record<string, EnemyFaction>> = {
  bunchling: 'skitterkin',
  fracture: 'hollow',
  fracture_shard: 'hollow',
  riftmoth: 'hollow',
  sunderglass_penitent: 'aelari',
  glass_witch: 'aelari',
};
/** Tower uids → ids, as the binder's lookup reads the sim's towers. */
const TOWER_IDS: Readonly<Record<number, string>> = {
  1: 'prism',
  2: 'lantern',
  3: 'mindspike',
  4: 'crane',
  5: 'harpoon',
};

const lookup = (quiet = false): EnemyLookup => ({
  splits: (id) => id === 'bunchling' || id === 'fracture' || id === 'fracture_shard',
  faction: (id) => FACTIONS[id] ?? null,
  quietAt: () => quiet,
  tower: (uid) => TOWER_IDS[uid] ?? null,
});

function run(events: E[], o: { quiet?: boolean } = {}): SoundCall[] {
  const s = createEventSounds({ jingle: 'minor', skitterkinDeath: 'sad_squeak' }, lookup(o.quiet));
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out;
}
const ids = (calls: SoundCall[]): string[] => calls.map((c) => `${c.kind}:${c.id}`);

const fired = (towerUid: number, kind: 'beam' | 'hitscan' | 'line'): E => ({
  type: 'ProjectileFired',
  uid: 0,
  towerUid,
  kind,
  targetUid: 2,
  x: 0,
  y: 0,
  targetX: 1,
  targetY: 1,
  sprite: null,
  flightTicks: 0,
  radiusTiles: 0,
});
const tick = (towerUid: number, o: { reduced?: boolean; damage?: number } = {}): E => ({
  type: 'ProjectileHit',
  uid: 0,
  towerUid,
  x: 1,
  y: 1,
  hits: 1,
  damage: o.damage ?? 4,
  reduced: o.reduced ?? false,
});
const died = (enemy: string): E => ({
  type: 'EnemyDied',
  uid: 1,
  enemy,
  bounty: 1,
  killer: { kind: 'tower', uid: 1 },
  x: 2,
  y: 2,
});
const boss = (phase: number): E => ({
  type: 'BossPhase',
  uid: 9,
  enemy: 'sunderglass_penitent',
  phase,
});
const phase = (p: 'tell' | 'in' | 'out' | 'interrupted'): E => ({
  type: 'PhaseShift',
  uid: 4,
  enemy: 'riftmoth',
  phase: p,
  x: 1,
  y: 1,
});
const dark = (d: number): E => ({ type: 'DarknessShift', wave: 1, dark: d });

describe('M5 event sounds (T550)', () => {
  it('gives the M5 towers their own shots: the Prism and Lantern locks, Mindspike, Skewer, Magnet Crane', () => {
    expect(ids(run([fired(1, 'beam')]))).toEqual(['sfx:prism_lock']);
    expect(ids(run([fired(2, 'beam')]))).toEqual(['sfx:lantern_lock']);
    expect(ids(run([fired(3, 'hitscan')]))).toEqual(['sfx:mindspike_shot']);
    expect(ids(run([fired(4, 'hitscan')]))).toEqual(['sfx:magnet_grab']);
    expect(ids(run([fired(5, 'line')]))).toEqual(['sfx:skewer_shot']);
    // A tower the lookup doesn't know (and no TowerBuilt) plays its attack kind's sound.
    expect(ids(run([fired(99, 'hitscan')]))).toEqual(['sfx:rivet_shot']);
    // A TowerBuilt names the tower without the lookup.
    const built: E = { type: 'TowerBuilt', uid: 42, tower: 'mindspike', tile: [1, 1], cost: 1 };
    expect(ids(run([built, fired(42, 'hitscan')]))).toEqual(['sfx:build', 'sfx:mindspike_shot']);
  });

  it("plinks a beam's wrong-tool hit once per lock, not once per beam tick", () => {
    const armored = [tick(1, { reduced: true }), tick(1, { reduced: true })];
    expect(ids(run([fired(1, 'beam'), ...armored, ...armored]))).toEqual([
      'sfx:prism_lock',
      'sfx:armor_plink',
    ]);
    // A new lock may plink again; a clean tick never does.
    expect(ids(run([fired(1, 'beam'), tick(1), ...armored, fired(1, 'beam'), ...armored]))).toEqual(
      ['sfx:prism_lock', 'sfx:armor_plink', 'sfx:prism_lock', 'sfx:armor_plink'],
    );
    // A hit that took nothing (a boss between phases) plinks once per lock too.
    expect(ids(run([fired(1, 'beam'), tick(1, { damage: 0 }), tick(1, { damage: 0 })]))).toEqual([
      'sfx:prism_lock',
      'sfx:invuln_plink',
    ]);
    // Other towers' hits plink every time, as before.
    expect(ids(run([tick(7, { reduced: true }), tick(7, { reduced: true })]))).toEqual([
      'sfx:armor_plink',
      'sfx:armor_plink',
    ]);
  });

  it('flickers a phase tell, falls away and returns, and fizzles an interrupt like every tell', () => {
    expect(ids(run([phase('tell'), phase('in'), phase('out'), phase('interrupted')]))).toEqual([
      'sfx:phase_tell',
      'sfx:phase_in',
      'sfx:phase_out',
      'sfx:tell_fizzle',
    ]);
    // The Hollow's quiet keeps its own sounds.
    expect(ids(run([phase('tell')], { quiet: true }))).toEqual(['sfx:phase_tell']);
  });

  it("cracks a Hollow splitter violet (kept in the Hollow's quiet), and pops a Bunchling's split", () => {
    expect(ids(run([died('fracture')], { quiet: true }))).toEqual([
      'sfx:hollow_unravel',
      'sfx:void_crack',
    ]);
    expect(ids(run([died('bunchling')]))).toEqual(['sfx:sad_squeak', 'sfx:split_pop']);
  });

  it('meets the Penitent in glass, bursts its shield, and kneels it hushed with no sting', () => {
    expect(ids(run([boss(1), boss(2)]))).toEqual(['sfx:penitent_arrive', 'sfx:penitent_break']);
    const pivot: E = { type: 'BossEnded', uid: 9, enemy: 'sunderglass_penitent', how: 'pivot' };
    expect(ids(run([pivot]))).toEqual(['sfx:penitent_kneel']);
    // The Witch still leaves to her own sting.
    const retreat: E = { type: 'BossEnded', uid: 9, enemy: 'glass_witch', how: 'retreat' };
    expect(ids(run([retreat]))).toEqual(['sfx:witch_retreat', 'cue:witch_sting']);
    // Hushed: no duck of its own, and under speech (the pivot's cue speaks over it).
    expect(SFX.penitent_kneel).not.toHaveProperty('duck');
    expect(SFX.penitent_kneel.priority).toBeLessThanOrEqual(2);
    expect(SFX.stand_down.priority).toBeLessThanOrEqual(1);
  });

  it('re-forms a shield, and breathes out once as the faction stands down', () => {
    const reform: E = { type: 'ShieldReformed', uid: 9, enemy: 'sunderglass_penitent', x: 1, y: 1 };
    expect(ids(run([reform]))).toEqual(['sfx:shield_reform']);
    const down = (uid: number): E => ({
      type: 'StoodDown',
      uid,
      enemy: 'cantor',
      faction: 'aelari',
      x: 1,
      y: 1,
    });
    // Every unit sends one; the recipe's single voice and gap make them one breath.
    expect(ids(run([down(1), down(2)]))).toEqual(['sfx:stand_down', 'sfx:stand_down']);
    expect(SFX.stand_down.maxVoices).toBe(1);
    expect(SFX.stand_down.minGapMs).toBeGreaterThanOrEqual(300);
  });

  it('chirps a refugee home (Pebble her own), and alarms one taken at the exit, not one hushed', () => {
    const safe = (pebble: boolean): E => ({ type: 'RefugeeEvacuated', uid: 3, pebble });
    expect(ids(run([safe(false), safe(true)]))).toEqual(['sfx:refugee_safe', 'sfx:pebble_safe']);
    const lost = (cause: 'hushed' | 'exit'): E => ({
      type: 'RefugeeLost',
      uid: 0,
      cause,
      enemyUid: 1,
    });
    expect(ids(run([lost('exit'), lost('hushed')]))).toEqual(['sfx:refugee_taken']);
    // The Escort's alarm is an alarm, never the core's siren.
    expect(SFX.refugee_taken.priority).toBe(3);
  });

  it("rings Echo Spike's echo, casts Stillness, and locks its freeze only when it froze something", () => {
    const echo: E = { type: 'EchoBurst', towerUid: 3, x: 1, y: 1, radiusTiles: 1.2, hits: 2 };
    expect(ids(run([echo]))).toEqual(['sfx:echo_burst']);
    const cast: E = { type: 'AbilityUsed', slot: 2, uid: 0, ability: 'stillness', target: [1, 1] };
    const area = (frozen: number): E => ({
      type: 'StasisArea',
      slot: 2,
      x: 1,
      y: 1,
      radiusTiles: 2.5,
      frozen,
    });
    expect(ids(run([cast, area(3)]))).toEqual(['sfx:stillness_cast', 'sfx:stasis_lock']);
    expect(ids(run([cast, area(0)]))).toEqual(['sfx:stillness_cast']);
  });

  it('falls as a wave takes Sundown darker, and says nothing as it holds or lightens', () => {
    expect(ids(run([dark(0.3), dark(0.6), dark(0.6), dark(0.2), dark(1)]))).toEqual([
      'sfx:dusk_fall',
      'sfx:dusk_fall',
      'sfx:dusk_fall',
    ]);
  });

  it("drops a coin for a tower's income, a kill's a few steps up (T501h)", () => {
    const income = (kind: 'wave' | 'kill' | 'interest'): E => ({
      type: 'TowerIncome',
      towerUid: 4,
      kind,
      credits: 5,
      wave: 1,
      x: 1,
      y: 1,
    });
    const out = run([income('wave'), income('kill')]);
    expect(ids(out)).toEqual(['sfx:income_coin', 'sfx:income_coin']);
    expect(out.map((c) => (c.kind === 'sfx' ? c.pitch : null))).toEqual([0, 3]);
    // Small and placed: the Hollow's quiet swallows it.
    expect(run([income('kill')], { quiet: true })).toEqual([]);
  });

  it("subscribes to M5's sounding events, and leaves the beam's flip and the objective's out", () => {
    const loud: SimEventType[] = [
      'PhaseShift',
      'ShieldReformed',
      'StoodDown',
      'RefugeeEvacuated',
      'RefugeeLost',
      'EchoBurst',
      'StasisArea',
      'DarknessShift',
      'TowerIncome',
    ];
    for (const t of loud) expect(SOUND_EVENT_TYPES).toContain(t);
    for (const t of ['BeamChanged', 'ObjectiveChanged'] as const) {
      expect(SOUND_EVENT_TYPES).not.toContain(t);
    }
  });
});

describe("the M5 tables cover M5's content", () => {
  const M5_ENEMIES = [
    'veilwalker',
    'blinkstrider',
    'cantor',
    'glimmer_shard',
    'fracture',
    'fracture_shard',
    'riftmoth',
  ] as const;

  it('pitches every M5 unit, and loops the visible ones (a cloaked one walks by its steps)', () => {
    for (const id of M5_ENEMIES) {
      expect(ENEMIES[id], id).toBeDefined();
      expect(ENEMY_POP_PITCH[id], id).toBeDefined();
    }
    for (const id of ['cantor', 'blinkstrider', 'fracture', 'fracture_shard', 'riftmoth']) {
      expect(ENEMY_LOOPS[id], id).toBeDefined();
    }
    for (const id of ['veilwalker', 'glimmer_shard'] as const) {
      expect(ENEMY_LOOPS[id], id).toBeUndefined();
      expect(ENEMIES[id].traits, id).toContain('cloaked');
    }
    expect(ENEMY_LOOPS['cantor']?.id).toBe('cantor_song');
  });

  it("gives the Penitent its own sounds, none of the Witch's", () => {
    const s = bossSounds('sunderglass_penitent');
    expect(s).toMatchObject({
      arrive: 'penitent_arrive',
      phase: 'penitent_break',
      end: 'penitent_kneel',
      endCue: null,
    });
    expect(Object.values(bossSounds('glass_witch'))).not.toContain(s.arrive);
  });

  it('every splitting faction that splits in content has its split; the Hollow keeps its crack', () => {
    for (const e of Object.values(ENEMIES)) {
      if (!('split' in e) || e.split === undefined || e.faction === 'skitterkin') continue;
      expect(FACTION_SPLIT_SOUNDS[e.faction], e.id).toBeDefined();
    }
    expect(HOLLOW_QUIET.keep).toContain('void_crack');
  });

  it("names only real towers, by an attack kind they have; no beam borrows the Zapcoil's arc", () => {
    for (const [id, kinds] of Object.entries(TOWER_SOUNDS)) {
      const t = Object.values(TOWERS).find((d) => d.id === id);
      if (t === undefined) throw new Error(`TOWER_SOUNDS names no tower '${id}'`);
      const tiers: readonly { readonly attack?: object | null }[] = [
        ...t.tiers,
        ...('specs' in t ? [t.specs.a, t.specs.b] : []),
      ];
      const kindOf = (tier: { readonly attack?: object | null }): string | undefined => {
        const a: { kind?: string } | null | undefined = tier.attack;
        return a?.kind;
      };
      const has = new Set(tiers.map(kindOf).filter((k) => k !== undefined));
      for (const kind of Object.keys(kinds ?? {})) expect(has, `${id}: ${kind}`).toContain(kind);
    }
    expect(ATTACK_SOUNDS['beam']?.fire).toBe('prism_lock');
    expect(ATTACK_SOUNDS['line']?.fire).toBe('skewer_shot');
  });
});
