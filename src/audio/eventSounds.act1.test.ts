// Act I's new event sounds (T314): flak, the chain's jumps, the plinks, splits, Gerald, the boss,
// salvage, and the new abilities; and the tables cover every tower, enemy, and ability in content.
import { describe, expect, it } from 'vitest';
import { ABILITIES } from '../content/abilities/index.ts';
import { ENEMIES } from '../content/enemies/index.ts';
import { TOWERS, TOWERS_AHEAD_OF_TASK } from '../content/towers/index.ts';
import type { AttackKind, IdSpace } from '../content/types.ts';
import type { SimEvent, SimEventType } from '../sim/index.ts';
import {
  createEventSounds,
  SOUND_EVENT_TYPES,
  type EnemyLookup,
  type SoundCall,
} from './eventSounds.ts';
import {
  ABILITY_SOUNDS,
  ATTACK_SOUNDS,
  BOSS_SOUNDS,
  CHAIN_SOUNDS,
  ENEMY_LOOPS,
  ENEMY_POP_PITCH,
  NEUTRAL_SOUNDS,
} from './eventTables.ts';
import { SFX } from './sfx/index.ts';

type E = SimEvent<IdSpace>;
const fired = (kind: AttackKind, uid: number, towerUid = 1): E => ({
  type: 'ProjectileFired',
  uid,
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
const hit = (
  uid: number,
  o: { towerUid?: number; hits?: number; damage?: number; reduced?: boolean } = {},
): E => ({
  type: 'ProjectileHit',
  uid,
  towerUid: o.towerUid ?? 1,
  x: 1,
  y: 1,
  hits: o.hits ?? 1,
  damage: o.damage ?? 5,
  reduced: o.reduced ?? false,
});

const phase = (n: number): E => ({
  type: 'BossPhase',
  uid: 9,
  enemy: 'chitterbloom',
  phase: n,
});
const cast = (ability: string): E => ({
  type: 'AbilityUsed',
  slot: 1,
  uid: 0,
  ability,
  target: null,
});

const SPLITS: EnemyLookup = {
  splits: (id) => id === 'bunchling',
  faction: () => 'skitterkin',
  quietAt: () => false,
};

function run(events: E[], enemies?: EnemyLookup): SoundCall[] {
  const s = createEventSounds({ jingle: 'bright', skitterkinDeath: 'confetti' }, enemies);
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out;
}
const ids = (calls: SoundCall[]): string[] => calls.map((c) => `${c.kind}:${c.id}`);

describe('Act I event sounds', () => {
  it("fires the Skyhook's flak and bursts it where it lands", () => {
    expect(ids(run([fired('projectile', 7), hit(7, { hits: 0, damage: 0 })]))).toEqual([
      'sfx:flak_fire',
      'sfx:flak_burst',
    ]);
  });

  it("crackles each of the Zapcoil's jumps, a beat later and a step higher, capped", () => {
    const victims = Array.from({ length: 8 }, () => hit(0, { towerUid: 4 }));
    const calls = run([fired('chain', 0, 4), ...victims]);
    expect(ids(calls)).toEqual(['sfx:zap_arc', ...Array<string>(7).fill('sfx:zap_jump')]);
    const jumps = calls.slice(1).map((c) => (c.kind === 'sfx' ? [c.pitch, c.delay] : null));
    expect(jumps[0]).toEqual([CHAIN_SOUNDS.pitchPerJump, CHAIN_SOUNDS.gapSec]);
    expect(jumps[1]).toEqual([2 * CHAIN_SOUNDS.pitchPerJump, 2 * CHAIN_SOUNDS.gapSec]);
    expect(Math.max(...jumps.map((j) => j?.[0] ?? 0))).toBe(CHAIN_SOUNDS.maxPitch);
    // Rate-limited: the delays spread the jumps past the recipe's gap, and its voice cap thins them.
    expect(CHAIN_SOUNDS.gapSec * 1000).toBeGreaterThanOrEqual(SFX.zap_jump.minGapMs);
    expect(SFX.zap_jump.maxVoices).toBeLessThanOrEqual(3);
  });

  it("doesn't count another tower's hits, or a new shot's, as the arc's jumps", () => {
    const calls = run([
      fired('chain', 0, 4),
      hit(0, { towerUid: 4 }),
      hit(0, { towerUid: 9 }), // a Rivet's hitscan landing in the same tick
      fired('hitscan', 0, 9),
      hit(0, { towerUid: 4 }),
    ]);
    expect(ids(calls)).toEqual(['sfx:zap_arc', 'sfx:rivet_shot']);
  });

  it('plinks a hit armor blunted, and a hit that did nothing, rate-limited', () => {
    expect(ids(run([hit(0, { reduced: true })]))).toEqual(['sfx:armor_plink']);
    expect(ids(run([hit(0, { damage: 0 })]))).toEqual(['sfx:invuln_plink']);
    expect(ids(run([hit(0, { damage: 0, reduced: true })]))).toEqual(['sfx:invuln_plink']);
    // A clean hit, and a shell that landed on nothing, don't plink.
    expect(run([hit(0), hit(0, { hits: 0, damage: 0 })])).toEqual([]);
    for (const id of ['armor_plink', 'invuln_plink'] as const) {
      expect(SFX[id].minGapMs, id).toBeGreaterThanOrEqual(80);
      expect(SFX[id].maxVoices, id).toBeLessThanOrEqual(2);
    }
  });

  it('pops a splitter, then its split', () => {
    const died: E = {
      type: 'EnemyDied',
      uid: 3,
      enemy: 'bunchling',
      bounty: 4,
      killer: { kind: 'tower', uid: 1 },
      x: 0,
      y: 0,
    };
    const calls = run([died], SPLITS);
    expect(ids(calls)).toEqual(['sfx:enemy_pop', 'sfx:split_pop']);
    expect(calls[1]).toMatchObject({ delay: expect.any(Number) });
    expect(ids(run([{ ...died, enemy: 'nibbler' }], SPLITS))).toEqual(['sfx:enemy_pop']);
  });

  it('chimes as a shot plinks off Gerald, and whistles as he leaves; other neutrals are quiet', () => {
    const at = { uid: 5, x: 0, y: 0 };
    expect(
      ids(
        run([
          { type: 'NeutralHit', ...at, enemy: 'gerald', towerUid: 1 },
          { type: 'NeutralExited', ...at, enemy: 'gerald' },
          { type: 'NeutralHit', ...at, enemy: 'someone_else', towerUid: 1 },
        ]),
      ),
    ).toEqual(['sfx:gerald_chime', 'sfx:gerald_whistle']);
  });

  it("announces the boss, each phase, and its ending with the sting (never after the map's end)", () => {
    const ended: E = { type: 'BossEnded', uid: 9, enemy: 'chitterbloom', how: 'driveOff' };
    expect(ids(run([phase(1), phase(2), phase(3), ended]))).toEqual([
      'sfx:boss_arrive',
      'sfx:boss_phase',
      'sfx:boss_phase',
      'sfx:boss_retreat',
      'cue:boss_sting',
    ]);
    expect(ids(run([{ type: 'MapWon' }, ended]))).toEqual(['cue:win', 'sfx:boss_retreat']);
  });

  it('clanks a cleared wreckage tile, and rings up the new abilities', () => {
    expect(
      ids(
        run([
          { type: 'WreckageCleared', tile: [2, 3], to: 'o', salvage: 30 },
          cast('time_dilation'),
          cast('clearance_sale'),
        ]),
      ),
    ).toEqual(['sfx:drone_cleared', 'sfx:dilation_swell', 'sfx:sale_kaching']);
  });

  it('subscribes to every M3 event, and sorts every event type (D062)', () => {
    const m3: SimEventType[] = [
      'NeutralHit',
      'NeutralExited',
      'BossPhase',
      'BossEnded',
      'WreckageCleared',
    ];
    for (const t of m3) expect(SOUND_EVENT_TYPES).toContain(t);
  });
});

describe('the sound tables cover the content', () => {
  it('every tower attack kind has its shot (specs too; stubs wait for their task)', () => {
    for (const t of Object.values(TOWERS)) {
      if (TOWERS_AHEAD_OF_TASK.includes(t.id)) continue;
      const specs: readonly { readonly attack?: { readonly kind?: string } | null }[] =
        'specs' in t ? [t.specs.a, t.specs.b] : [];
      for (const tier of [...t.tiers, ...specs]) {
        const kind = tier.attack?.kind;
        if (kind === undefined) continue;
        // A spawner (the Scuttle Den) fires no shot: its swarmlings' latches sound (SWARM_SOUNDS);
        // nor does a leaper pad (the Sproing Pad, T704): its leapers' bonks will (T750).
        if (kind === 'spawner' || kind === 'leaper') {
          expect(ATTACK_SOUNDS[kind], t.id).toBeDefined();
        } else expect(ATTACK_SOUNDS[kind]?.fire, `${t.id}: ${kind}`).toBeTruthy();
        else expect(ATTACK_SOUNDS[kind]?.fire, `${t.id}: ${kind}`).toBeTruthy();
      }
    }
  });

  it('every ability has its cast', () => {
    for (const a of Object.values(ABILITIES)) expect(ABILITY_SOUNDS[a.id], a.id).toBeDefined();
  });

  it('every enemy that can die has its pop; every neutral and boss its own sounds', () => {
    for (const e of Object.values(ENEMIES)) {
      if ('neutral' in e && e.neutral) expect(NEUTRAL_SOUNDS[e.id], e.id).toBeDefined();
      else if ('boss' in e && e.boss !== undefined) expect(BOSS_SOUNDS[e.id], e.id).toBeDefined();
      else expect(ENEMY_POP_PITCH[e.id], e.id).toBeDefined();
    }
    expect(ENEMY_LOOPS['puffwing']).toBeDefined();
  });
});
