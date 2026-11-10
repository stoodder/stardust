// Act II's event sounds (T450): deaths by faction and dial, the Aelari's shields, pulses and blinks,
// the hush, the Hollow's quiet, Stasis, detection, the M4 specs, the asset and checkpoints, and
// the Glass Witch; and the tables cover Act II's content.
import { describe, expect, it } from 'vitest';
import { ENEMIES } from '../content/enemies/index.ts';
import type { SkitterkinDeath } from '../content/presentation.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { EnemyFaction, IdSpace, SpriteId } from '../content/types.ts';
import type { SimEvent, SimEventType } from '../sim/index.ts';
import {
  createEventSounds,
  SOUND_EVENT_TYPES,
  type EnemyLookup,
  type SoundCall,
} from './eventSounds.ts';
import { ATTACK_SOUNDS, ENEMY_POP_PITCH } from './eventTables.ts';
import {
  FACTION_DEATH_SOUNDS,
  HOLLOW_QUIET,
  PROJECTILE_SOUNDS,
  SKITTERKIN_DEATH_SOUNDS,
  STASIS_SOUNDS,
} from './eventTablesAct2.ts';
import { SFX } from './sfx/index.ts';

type E = SimEvent<IdSpace>;

const FACTIONS: Readonly<Record<string, EnemyFaction>> = {
  nibbler: 'skitterkin',
  mote: 'hollow',
  glimmer: 'aelari',
  glass_witch: 'aelari',
};

/** A lookup with content's factions; `quiet` marks where a Hollow unit stands. */
const lookup = (quiet = false): EnemyLookup => ({
  splits: () => false,
  faction: (id) => FACTIONS[id] ?? null,
  quietAt: () => quiet,
});

function run(events: E[], o: { death?: SkitterkinDeath; quiet?: boolean } = {}): SoundCall[] {
  const s = createEventSounds(
    { jingle: 'minor_bridges', skitterkinDeath: o.death ?? 'sad_squeak' },
    lookup(o.quiet),
  );
  const out: SoundCall[] = [];
  for (const e of events) s.sounds(e, out);
  s.endFrame(out);
  return out;
}
const ids = (calls: SoundCall[]): string[] => calls.map((c) => `${c.kind}:${c.id}`);

const died = (enemy: string): E => ({
  type: 'EnemyDied',
  uid: 1,
  enemy,
  bounty: 1,
  killer: { kind: 'tower', uid: 1 },
  x: 2,
  y: 2,
});
const hit = (o: { hits?: number; damage?: number; reduced?: boolean } = {}): E => ({
  type: 'ProjectileHit',
  uid: 0,
  towerUid: 1,
  x: 2,
  y: 2,
  hits: o.hits ?? 1,
  damage: o.damage ?? 5,
  reduced: o.reduced ?? false,
});
const shield = (broken: boolean): E => ({ type: 'ShieldHit', uid: 3, x: 2, y: 2, broken });
const pulse = (phase: 'tell' | 'fired' | 'interrupted'): E => ({
  type: 'ShieldPulse',
  uid: 9,
  enemy: 'glass_witch',
  phase,
  x: 2,
  y: 2,
  radiusTiles: 2,
  restored: 0,
});
const fired = (
  kind: 'projectile' | 'charge' | 'hitscan',
  uid: number,
  sprite: SpriteId | null,
): E => ({
  type: 'ProjectileFired',
  uid,
  towerUid: 1,
  kind,
  targetUid: 2,
  x: 0,
  y: 0,
  targetX: 1,
  targetY: 1,
  sprite,
  flightTicks: 0,
  radiusTiles: 0,
});

/** A recipe's summed peak (every layer at once). */
const peak = (id: 'enemy_pop' | 'sad_squeak'): number =>
  SFX[id].gain * SFX[id].layers.reduce((a, l) => a + l.gain, 0);
const burst = (frozen: number): E => ({
  type: 'PulseBurst',
  towerUid: 1,
  x: 1,
  y: 1,
  radiusTiles: 2,
  frozen,
});
const witchPhase = (n: number): E => ({
  type: 'BossPhase',
  uid: 9,
  enemy: 'glass_witch',
  phase: n,
});

describe('Act II event sounds', () => {
  it('kills each faction its own way: a sad squeak, a shatter, an unravel; pitched per enemy', () => {
    const calls = run([died('nibbler'), died('glimmer'), died('mote'), died('stranger')]);
    expect(ids(calls)).toEqual([
      'sfx:sad_squeak',
      'sfx:aelari_shatter',
      'sfx:hollow_unravel',
      'sfx:enemy_pop',
    ]);
    expect(calls.map((c) => (c.kind === 'sfx' ? c.pitch : null))).toEqual([
      ENEMY_POP_PITCH['nibbler'],
      ENEMY_POP_PITCH['glimmer'],
      ENEMY_POP_PITCH['mote'],
      0,
    ]);
    // The dial: Act I's confetti pop; Act III's still body and the finale's none are silent.
    expect(ids(run([died('nibbler')], { death: 'confetti' }))).toEqual(['sfx:enemy_pop']);
    expect(run([died('nibbler')], { death: 'linger' })).toEqual([]);
    expect(run([died('nibbler')], { death: 'none' })).toEqual([]);
    // Other factions die their own way under any dial.
    expect(ids(run([died('glimmer')], { death: 'confetti' }))).toEqual(['sfx:aelari_shatter']);
  });

  it('keeps the sad squeak quieter than the pop it replaces', () => {
    expect(peak('sad_squeak')).toBeLessThan(peak('enemy_pop'));
  });

  it('ripples a shield hit, shatters a broken one, and ripples in place of the nothing-plink', () => {
    expect(ids(run([hit(), shield(false)]))).toEqual(['sfx:shield_ripple']);
    expect(ids(run([hit(), shield(true)]))).toEqual(['sfx:shield_shatter']);
    // The shield took the hit whole: the ripple says it, not the plink.
    expect(ids(run([hit({ damage: 0 }), shield(false)]))).toEqual(['sfx:shield_ripple']);
    // A hit that did nothing with no shield (a boss between phases) still plinks, before the
    // next event's sounds, or at the end of the frame.
    expect(ids(run([hit({ damage: 0 }), died('nibbler')]))).toEqual([
      'sfx:invuln_plink',
      'sfx:sad_squeak',
    ]);
    expect(ids(run([hit({ damage: 0 })]))).toEqual(['sfx:invuln_plink']);
    // Never over the map's end.
    expect(ids(run([hit({ damage: 0 }), { type: 'MapLost' }]))).toEqual([
      'sfx:invuln_plink',
      'cue:lose',
    ]);
  });

  it('tells, fires, and fizzles a pulse; tells and lands a blink; one fizzle for an interrupt', () => {
    expect(ids(run([pulse('tell'), pulse('fired'), pulse('interrupted')]))).toEqual([
      'sfx:pulse_tell',
      'sfx:pulse_fire',
      'sfx:tell_fizzle',
    ]);
    const blink = { uid: 9, enemy: 'glass_witch', x: 1, y: 1, toX: 3, toY: 1 };
    expect(
      ids(
        run([
          { type: 'BlinkTell', ...blink },
          { type: 'Blinked', ...blink },
          { type: 'BlinkInterrupted', uid: 9 },
        ]),
      ),
    ).toEqual(['sfx:blink_tell', 'sfx:blink', 'sfx:tell_fizzle']);
  });

  it('breathes in for the hush, cuts the hushed runner off, and squeaks a bolting runner', () => {
    const at = { uid: 4, enemy: 'mote', victim: 5, x: 1, y: 1 };
    expect(
      ids(
        run([
          { type: 'HushStarted', ...at },
          { type: 'Hushed', ...at, victimEnemy: 'nibbler' },
          { type: 'TurnedHeavy', uid: 4, enemy: 'mote' },
          { type: 'SkittishBolt', uid: 6 },
        ]),
      ),
    ).toEqual(['sfx:hush_tell', 'sfx:hushed', 'sfx:panic_squeak']);
  });

  it("drops the small sounds inside a Hollow unit's quiet, never its own, an alarm, or a moment", () => {
    const quiet = run(
      [
        fired('hitscan', 0, null),
        hit({ reduced: true }),
        died('nibbler'),
        died('mote'),
        shield(false),
        shield(true),
        { type: 'EnemyLeaked', uid: 1, enemy: 'nibbler', leak: 1 },
        { type: 'HushStarted', uid: 4, enemy: 'mote', victim: 5, x: 2, y: 2 },
      ],
      { quiet: true },
    );
    expect(ids(quiet)).toEqual([
      'sfx:hollow_unravel',
      'sfx:shield_shatter',
      'sfx:leak',
      'sfx:hush_tell',
    ]);
    for (const id of HOLLOW_QUIET.keep) expect(SFX[id].priority).toBeLessThanOrEqual(1);
    expect(SFX.leak.priority).toBeGreaterThan(HOLLOW_QUIET.maxPriority);
  });

  it('bursts Flash Freeze, locking Stasis in after it only when it froze something', () => {
    expect(ids(run([burst(0)]))).toEqual(['sfx:frost_burst']);
    expect(run([burst(3)])).toEqual([
      { kind: 'sfx', id: 'frost_burst', pitch: 0, delay: 0 },
      { kind: 'sfx', id: 'stasis_lock', pitch: 0, delay: STASIS_SOUNDS.lockAfterSec },
    ]);
  });

  it('pings a reveal, keeps a re-cloak quiet, clangs the rigs, and chimes a checkpoint', () => {
    expect(
      ids(
        run([
          { type: 'Revealed', uid: 3 },
          { type: 'Cloaked', uid: 3 },
          { type: 'AssetHit', uid: 2, enemy: 'nibbler', lost: 1, x: 1, y: 1 },
          { type: 'AssetLost' },
          { type: 'CheckpointReached', wave: 5, tick: 900 },
        ]),
      ),
    ).toEqual(['sfx:reveal_ping', 'sfx:asset_hit', 'sfx:checkpoint']);
  });

  it('gives the Seeker Swarm its volley and the Capacitor Bank its discharge; a flak shell stays flak', () => {
    const seeker = 'projectile.skyhook_seeker';
    expect(
      ids(
        run([
          fired('projectile', 5, seeker),
          {
            type: 'ProjectileHit',
            uid: 5,
            towerUid: 1,
            x: 1,
            y: 1,
            hits: 1,
            damage: 9,
            reduced: false,
          },
          fired('projectile', 6, 'projectile.skyhook_flak'),
          fired('charge', 0, null),
        ]),
      ),
    ).toEqual(['sfx:seeker_launch', 'sfx:flak_burst', 'sfx:flak_fire', 'sfx:capacitor_discharge']);
    // One launch per volley: the four shots of a tick merge in the recipe's gap.
    expect(SFX.seeker_launch.maxVoices).toBe(1);
    expect(SFX.seeker_launch.minGapMs).toBeGreaterThanOrEqual(100);
  });

  it('meets the Glass Witch in glass and sees her off with her own sting', () => {
    expect(
      ids(
        run([
          witchPhase(1),
          witchPhase(2),
          { type: 'BossEnded', uid: 9, enemy: 'glass_witch', how: 'retreat' },
        ]),
      ),
    ).toEqual(['sfx:witch_arrive', 'sfx:witch_phase', 'sfx:witch_retreat', 'cue:witch_sting']);
  });

  it("subscribes to Act II's events, and leaves the quiet ones out", () => {
    const loud: SimEventType[] = [
      'HushStarted',
      'Hushed',
      'SkittishBolt',
      'ShieldPulse',
      'ShieldHit',
      'BlinkTell',
      'Blinked',
      'BlinkInterrupted',
      'PulseBurst',
      'Revealed',
      'AssetHit',
      'CheckpointReached',
    ];
    for (const t of loud) expect(SOUND_EVENT_TYPES).toContain(t);
    for (const t of ['TurnedHeavy', 'Cloaked', 'AssetLost'] as const) {
      expect(SOUND_EVENT_TYPES).not.toContain(t);
    }
  });
});

describe('the Act II tables cover the content', () => {
  it('every faction that can die has its death; every dial its row', () => {
    for (const e of Object.values(ENEMIES)) {
      if (('neutral' in e && e.neutral) || ('boss' in e && e.boss !== undefined)) continue;
      if (e.faction === 'skitterkin') continue;
      expect(FACTION_DEATH_SOUNDS[e.faction], e.id).toBeDefined();
    }
    expect(Object.keys(SKITTERKIN_DEATH_SOUNDS).toSorted()).toEqual(
      ['confetti', 'linger', 'none', 'sad_squeak'].toSorted(),
    );
  });

  it("every homing shot has its own launch; the charge doesn't borrow the Zapcoil's arc", () => {
    for (const t of Object.values(TOWERS)) {
      const specs: readonly { readonly attack?: object | null }[] =
        'specs' in t ? [t.specs.a, t.specs.b] : [];
      for (const tier of [...t.tiers, ...specs]) {
        const a: { homing?: boolean; projectile?: string } | null | undefined = tier.attack;
        if (a?.homing === true) {
          expect(PROJECTILE_SOUNDS[a.projectile ?? '']?.fire, `${t.id}: homing`).toBeTruthy();
        }
      }
    }
    expect(ATTACK_SOUNDS['charge']?.fire).toBe('capacitor_discharge');
  });
});
