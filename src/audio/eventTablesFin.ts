// The finale's sound tables (T850; pure data, read by eventSounds.ts, fieldSounds.ts, and
// app/audio.ts like eventTablesAct3b.ts): the Leaving Song's rest and scatter, the choir, the Deep
// Bore, the Unsung's moments that aren't its BOSS_SOUNDS row (eventTables.ts), Directive 0 and
// "Not Everglow.", Dawn, and the waymark lanterns. The recipes are sfx/fin.ts, which loads with
// the finale's chunk; these tables hold only ids, so they cost the core nothing.
import type { SfxId } from './sfx/index.ts';

/**
 * The Leaving Song (maps.md § 5.5; LaidToRest, Scattered, Reformed). In the song's phase (`phase`,
 * the script phase PhaseChanged reports), a Hollow unit's death waits for the end of the frame:
 * laid to rest inside the song (LaidToRest, later in the same tick) it rings `rest` instead,
 * scattered outside it (Scattered) it hisses `scatter`, and only one that falls for good with
 * neither (a second death outside the song) plays its faction's death. Each rest chime is the
 * next note of the six, G–C–E, F–D–C (`restSteps`, semitones over the recipe's G4), round and
 * round, so a Phase 2 played inside the song sings the jingle; several in one frame (Dawn lays
 * every unit to rest at once) ring one after another, `restStaggerSec` apart, up to
 * `restMaxStagger` steps. A re-formed unit draws its hiss back in (`reform`).
 */
export const SONG_SOUNDS = {
  phase: 2,
  rest: 'rest_chime',
  restSteps: [0, 5, 9, 10, 7, 5],
  restStaggerSec: 0.09,
  restMaxStagger: 8,
  scatter: 'scatter_hiss',
  reform: 'scatter_reform',
} as const satisfies {
  readonly phase: number;
  readonly rest: SfxId;
  readonly restSteps: readonly number[];
  readonly restStaggerSec: number;
  readonly restMaxStagger: number;
  readonly scatter: SfxId;
  readonly reform: SfxId;
};

/**
 * The choir (SingerHushed, ChoirHalted, EchoArrived; the Voices meter's low mark, app/audio.ts): a
 * singer hushed (a Hollow hush landing on one plays this, not the refugee's `hushed`), Pebble
 * halting and walking on, the Voices running low (in place of METER_ALARM's klaxon on a choir
 * map: the finale has no klaxons), and Thrum's echo reaching the song.
 */
export const CHOIR_SOUNDS = {
  hushed: 'singer_hushed',
  halt: 'choir_halt',
  walk: 'choir_walk',
  low: 'voices_low',
  echo: 'echo_rise',
} as const satisfies Readonly<Record<'hushed' | 'halt' | 'walk' | 'low' | 'echo', SfxId>>;

/** The ally kind of a choir singer (a Hollow hush on one is SingerHushed's sound, not Hushed's). */
export const SINGER_ALLY = 'singer';

/**
 * Secondary timers (maps.md § 9; T806): while one runs (started, not full, its rate above 0), the
 * drill grinds every `everySec` of sim time (fieldSounds.ts; one voice), a semitone higher for
 * every `pctPerStep` of the Bore's fill (`stats.boreProgress`); as one fills (TimerFull) its own
 * sound plays (the Bore's breakthrough).
 */
export const TIMER_SOUNDS = {
  drill: 'bore_drill',
  everySec: 1.5,
  pctPerStep: 20,
  full: { deep_bore: 'bore_breach' } as Readonly<Partial<Record<string, SfxId>>>,
} as const;

/**
 * The Unsung's moments outside its BOSS_SOUNDS row, by boss enemy (the uid's, from its BossPhase):
 * tearing into its parts (BossSplit; ahead of BOSS_SPLIT_SOUNDS) and rising again where the last
 * fell (BossRisen); surfacing among the singers or dug out short (BossSurfaced); calling its adds
 * (BossAdds).
 */
export const BOSS_MOMENT_SOUNDS: Readonly<
  Partial<
    Record<
      string,
      {
        readonly split?: SfxId;
        readonly risen?: SfxId;
        readonly surfaced?: SfxId;
        readonly dugOut?: SfxId;
        readonly adds?: SfxId;
      }
    >
  >
> = {
  unsung: {
    split: 'unsung_split',
    risen: 'unsung_rise',
    surfaced: 'unsung_surface',
    dugOut: 'unsung_dug_out',
    adds: 'unsung_call',
  },
};

/**
 * A burrowing boss's surfacing tell (its last BOSS_ABILITY_TELL_SEC underground, the ground
 * churning under the singers; fieldSounds.ts), by enemy: the moment to dig it out.
 */
export const SURFACE_TELL_SOUNDS: Readonly<Partial<Record<string, SfxId>>> = {
  unsung: 'unsung_churn',
};

/**
 * Directive 0 (AbilityLocked `on`, as QUILL's revocation stamps: the glitch) and "Not Everglow."
 * (ClassRestored: the class back). An ability unlocked as the phase rises is silent (Dawn says it).
 */
export const DIRECTIVE_SOUNDS = {
  locked: 'directive_glitch',
  restored: 'class_restored',
} as const satisfies Readonly<Record<'locked' | 'restored', SfxId>>;

/** Dawn breaks (DawnBroke): the light. Its music is PHASE_THEME's `dawn_major`. */
export const DAWN_SOUND = 'dawn_break' as const satisfies SfxId;

/**
 * A waymark lantern relit (WreckageCleared on a tile whose marker starts with `prefix`): after
 * the drone's own sound, `afterSec` later, the lantern catches, each one this battle the next
 * note of "Ev-er-glow" and then the octave (`steps`, semitones over the recipe's G4: G, C, E, G),
 * so the four lit spell the phrase's start.
 */
export const WAYMARK_SOUNDS = {
  prefix: 'waymark_',
  lit: 'lantern_lit',
  steps: [0, 5, 9, 12],
  afterSec: 0.15,
} as const satisfies {
  readonly prefix: string;
  readonly lit: SfxId;
  readonly steps: readonly number[];
  readonly afterSec: number;
};

/**
 * The song is louder than the quiet: from this script phase on a choir map, the Hollow's steady
 * music duck (HOLLOW_DUCK) is let go (app/audio.ts), so the hymn swells over the Hollow it lays to
 * rest.
 */
export const SONG_UNDUCKS_FROM_PHASE = 2;
