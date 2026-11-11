import { describe, expect, it } from 'vitest';
import { SCENES } from '../content/dialogue/index.ts';
import { DRUMS, INSTRUMENTS } from './music/instruments.ts';
import { CUES, HOME_MOTIF, THEMES } from './music/index.ts';
import { compileSong, songProblems } from './music/pattern.ts';
import { midiToHz, noteHz, noteToMidi, semitones } from './notes.ts';
import {
  instrumentProblems,
  layerProblems,
  MAX_SFX_SEC,
  recipeDuration,
  overlapPeak,
  recipePeak,
  recipeProblems,
} from './recipes.ts';
import { SFX, SFX_IDS, sfxRecipe } from './sfx/index.ts';
import {
  C2_STINGS,
  LINE_CUES,
  LINE_SFX,
  lineCue,
  lineSfx,
  PA_JINGLE_CUE,
  silenceHush,
  WAYKEEPER_STING,
} from './storyCues.ts';
import type { ToneLayer } from './types.ts';

const instrumentIds = new Set([...Object.keys(INSTRUMENTS), ...Object.keys(DRUMS)]);
const drumIds = new Set(Object.keys(DRUMS));

const peakOf = (id: keyof typeof SFX): number => recipePeak(sfxRecipe(id));
/** A recipe's loudest single layer (for sounds whose layers barely overlap). */
const loudest = (id: keyof typeof SFX): number =>
  SFX[id].gain * Math.max(...SFX[id].layers.map((l) => l.gain));

/** A short crack at `at` s (the overlap-peak test). */
const crack = (at: number): ToneLayer => ({
  wave: 'square',
  at,
  freq: 440,
  env: { a: 0.001, d: 0.05, s: 0, r: 0.01 },
  gain: 0.6,
});

describe('notes', () => {
  it('names and pitches notes', () => {
    expect(noteToMidi('C4')).toBe(60);
    expect(noteToMidi('A4')).toBe(69);
    expect(noteToMidi('F#3')).toBe(54);
    expect(noteToMidi('Bb2')).toBe(46);
    expect(noteToMidi('H2')).toBeNull();
    expect(midiToHz(69)).toBe(440);
    expect(noteHz('C5')).toBeCloseTo(523.25, 2);
    expect(semitones(12)).toBe(2);
    expect(() => noteHz('nope')).toThrow(RangeError);
  });
});

describe('sound effect recipes', () => {
  it('are all valid', () => {
    const problems = SFX_IDS.flatMap((id) => recipeProblems(id, sfxRecipe(id)));
    expect(problems).toEqual([]);
  });

  it('cover every sound the game plays', () => {
    expect(SFX_IDS.toSorted()).toEqual(
      [
        'aelari_hum',
        'aelari_shatter',
        'armor_plink',
        'asset_hit',
        'blink',
        'blink_tell',
        'blip.bricks',
        'blip.chitterbloom',
        'blip.gerald',
        'blip.goldie',
        'blip.kip',
        'blip.pa',
        'blip.pebble',
        'blip.player',
        'blip.prim',
        'blip.quill',
        'blip.sterling',
        'blip.thrum',
        'blip.vesthara',
        'blip.zibzab',
        'bomblet_pop',
        'boss_arrive',
        'boss_phase',
        'boss_retreat',
        'bricks_ready',
        'bricks_shot',
        'capacitor_discharge',
        'capacitor_hum',
        'checkpoint',
        'cloak_steps',
        'build',
        'burrow_dig',
        'burrow_surface',
        'countdown_tick',
        'dilation_swell',
        'drone_cleared',
        'drone_fly',
        'drone_work',
        'enemy_pop',
        'flak_burst',
        'flak_fire',
        'frost_burst',
        'gerald_chime',
        'gerald_whistle',
        'hold_fire_off',
        'hold_fire_on',
        'huddle_coo',
        'hollow_hum',
        'hollow_unravel',
        'hush_tell',
        'hushed',
        'invuln_plink',
        'leak',
        'link_chime',
        'low_integrity',
        'medal_forfeit',
        'panic_squeak',
        'peeker_lights_up',
        'peeker_squeak',
        'reject',
        'pulse_fire',
        'pulse_tell',
        'reveal_ping',
        'rivet_shot',
        'sack_pop',
        'sad_squeak',
        'sale_kaching',
        'scan_ping',
        'seeker_launch',
        'shield_ripple',
        'shield_shatter',
        'sell',
        'sneeze',
        'sneeze_tell',
        'specialize',
        'split_pop',
        'sprinkler_pulse',
        'stasis_lock',
        'strike_beam',
        'strike_boom',
        'strike_charge',
        'suppress_burst',
        'tell_fizzle',
        'thumper_impact',
        'thumper_launch',
        'tidybot_chime',
        'type_tick',
        'ui_click',
        'ui_hover',
        'unlock',
        'upgrade',
        'wave_call',
        'wave_start',
        'wing_flap',
        'witch_arrive',
        'witch_phase',
        'witch_retreat',
        'zap_arc',
        'zap_jump',
        // Act II, part two (T550, T501h).
        'beam_bed',
        'beam_hum',
        'cantor_song',
        'charge_fizzle',
        'dusk_fall',
        'echo_burst',
        'income_coin',
        'lantern_lock',
        'magnet_grab',
        'mindspike_shot',
        'night_air',
        'pebble_safe',
        'penitent_arrive',
        'penitent_break',
        'penitent_kneel',
        'phase_in',
        'phase_out',
        'phase_tell',
        'prism_lock',
        'refugee_safe',
        'refugee_taken',
        'shield_reform',
        'skewer_shot',
        'stand_down',
        'stillness_cast',
        'void_crack',
        'maw_tell',
        'maw_gulp',
        'undertow_sink',
        'undertow_rise',
        'rift_crack',
        'rift_open',
        'swarm_latch',
        'swarm_home',
        'underfoot_cast',
        'trap_snap',
        'everglow_shutdown',
        'compliance_step',
        'haste_tick',
        'bloom_chime',
        'gravity_pull',
        'revoke_stamp',
        'bricks_brace',
        'door_hum',
        'door_seal',
        // Act III, part two (T750).
        'jam_tendril',
        'jam_ring',
        'jammed',
        'jam_static',
        'jam_clear',
        'reboot',
        'sv_arrive',
        'sv_hangar',
        'sv_launch',
        'sv_takeover',
        'takeover_laser',
        'jettison',
        'plate_crash',
        'sv_retreat',
        'gmaw_arrive',
        'gmaw_strain',
        'gmaw_split',
        'gmaw_merge',
        'leaper_boing',
        'grounded_thud',
        'gloop_spit',
        'gloop_splat',
        'puddle_hiss',
        'liability_stomp',
        'gunship_rotor',
        'bb_shimmer',
        'associate_hum',
        'bearer_note',
        'mail_delivered',
        'knock_knock',
      ].toSorted(),
    );
  });

  it('keep the frequent sounds short and quiet, and rate-limited', () => {
    const frequent = [
      'rivet_shot',
      'bricks_shot',
      'bomblet_pop',
      'enemy_pop',
      'ui_hover',
      'ui_click',
      'flak_fire',
      'flak_burst',
      'zap_arc',
      'zap_jump',
      'armor_plink',
      'invuln_plink',
      'wing_flap',
      'type_tick',
      'shield_ripple',
      'panic_squeak',
    ] as const;
    for (const id of frequent) {
      const r = sfxRecipe(id);
      expect(recipeDuration(r), id).toBeLessThan(0.15);
      expect(recipePeak(r), id).toBeLessThan(0.3);
      expect(r.minGapMs, id).toBeGreaterThan(0);
    }
    expect(SFX.rivet_shot.maxVoices).toBeLessThanOrEqual(3);
  });

  it("make the Peeker's rock lighting up about 6 dB over the squeaks around it (D135)", () => {
    // Each sound's loudest layer (the layers barely touch; smoke/audio.spec.ts measures the
    // rendered peaks, 6.0 dB apart as built).
    const squeaks = Math.max(loudest('panic_squeak'), loudest('sad_squeak'));
    const over = 20 * Math.log10(loudest('peeker_lights_up') / squeaks);
    expect(over).toBeGreaterThan(4.5);
    expect(over).toBeLessThan(7.5);
    // Kin to the poke's squeak, and louder than it.
    expect(loudest('peeker_lights_up')).toBeGreaterThan(loudest('peeker_squeak'));
  });

  it('make the alarms the loudest and highest priority', () => {
    for (const id of ['leak', 'low_integrity', 'strike_boom'] as const) {
      expect(SFX[id].priority).toBe(3);
      expect(peakOf(id)).toBeGreaterThan(peakOf('rivet_shot') * 2);
    }
  });

  it("don't sum layers that never sound together (a rattle's separate cracks)", () => {
    const rattle = { gain: 1, layers: [crack(0), crack(0.065), crack(0.13)] };
    expect(overlapPeak(rattle)).toBeCloseTo(0.6);
    expect(recipePeak(rattle)).toBeCloseTo(1.8);
    const chord = { gain: 1, layers: [crack(0), crack(0.03)] };
    expect(overlapPeak(chord)).toBeCloseTo(1.2);
  });

  it('time the strike charge to its 1 s reticle (D022)', () => {
    expect(recipeDuration(SFX.strike_charge)).toBeGreaterThan(0.95);
    expect(recipeDuration(SFX.strike_charge)).toBeLessThan(1.1);
  });

  it('catch bad numbers', () => {
    const ok: ToneLayer = {
      wave: 'square',
      freq: 440,
      env: { a: 0.01, d: 0.1, s: 0.5, r: 0.1 },
      gain: 0.5,
    };
    expect(layerProblems(ok, 'ok', true)).toEqual([]);
    const bad = (l: Partial<ToneLayer>): string[] => layerProblems({ ...ok, ...l }, 'x', true);
    expect(bad({ freq: 5 })).not.toEqual([]);
    expect(bad({ freq: 20_000 })).not.toEqual([]);
    expect(bad({ gain: 1.5 })).not.toEqual([]);
    expect(bad({ env: { a: 0, d: 0.1, s: 0.5, r: 0.1 } })).not.toEqual([]);
    expect(bad({ env: { a: 0.01, d: 0.1, s: 2, r: 0.1 } })).not.toEqual([]);
    expect(bad({ glide: 100, glideSec: 0.1 })).not.toEqual([]);
    expect(bad({ glide: 2 })).not.toEqual([]);
    expect(bad({ wave: 'noise' })).not.toEqual([]);
    expect(
      bad({
        steps: [
          [0.2, 1],
          [0.1, 2],
        ],
      }),
    ).not.toEqual([]);
    const { freq: _drop, ...noPitch } = ok;
    expect(layerProblems(noPitch, 'x', true)).not.toEqual([]);
    expect(layerProblems(noPitch, 'x', false)).toEqual([]);
    expect(
      recipeProblems('loud', { gain: 1, priority: 0, layers: [ok, { ...ok, gain: 0.9 }] }),
    ).toContain('loud: summed peak 1.40 is over 1');
    const long = { ...ok, env: { ...ok.env, hold: MAX_SFX_SEC } };
    expect(recipeProblems('long', { gain: 0.5, priority: 0, layers: [long] })).not.toEqual([]);
  });
});

/** The notes of a cue's first lead track. */
const lead = (id: keyof typeof CUES): string[] =>
  CUES[id].tracks
    .find((t) => t.layer === 'lead')!
    .pattern.split(/\s+/)
    .filter((t) => /^[A-G]/.test(t));

describe('instruments and songs', () => {
  it('instruments are valid (drums carry their own pitch)', () => {
    const problems = [
      ...Object.entries(INSTRUMENTS).flatMap(([id, inst]) => instrumentProblems(id, inst, false)),
      ...Object.entries(DRUMS).flatMap(([id, inst]) => instrumentProblems(id, inst, true)),
    ];
    expect(problems).toEqual([]);
  });

  it('every theme and cue is valid', () => {
    for (const song of [...Object.values(THEMES), ...Object.values(CUES)]) {
      expect(songProblems(song, instrumentIds, drumIds), song.id).toEqual([]);
    }
  });

  it('themes loop on whole bars; cues are short one-shots', () => {
    for (const song of Object.values(THEMES)) {
      expect(song.loop).toBe(true);
      const c = compileSong(song);
      const loopSec = c.steps * c.secPerStep;
      expect(loopSec).toBeGreaterThan(10);
      expect(loopSec).toBeLessThan(30);
    }
    for (const song of Object.values(CUES)) {
      expect(song.loop).toBe(false);
      const c = compileSong(song);
      expect(c.steps * c.secPerStep).toBeLessThan(5);
    }
  });

  it("Act II's theme has every layer; its stings keep the phrase's shape in minor (T450)", () => {
    const layers = new Set(THEMES.act2_battle.tracks.map((t) => t.layer));
    expect([...layers].toSorted()).toEqual(['base', 'choir', 'drums', 'lead']);
    // The minor-bridges sting: the six notes as Act I sang them, then a sigh off home.
    expect(lead('bright_minor').slice(0, 6)).toEqual(['G5', 'C6', 'E6', 'F6', 'D6', 'C6']);
    expect(lead('bright_minor').slice(6)).toEqual(['Ab5', 'G5']);
    // The minor sting: the six notes with the third flattened.
    expect(lead('minor_sting')).toEqual(['G5', 'C6', 'Eb6', 'F6', 'D6', 'C6']);
  });

  it('hums the jingle wrong: forward, then backwards, never in tune (the Hollow, bible §8)', () => {
    const hum = SFX.hollow_hum.layers[0];
    const base = hum.freq;
    const notes = [base, ...hum.steps.map(([, m]) => base * m)];
    expect(notes).toHaveLength(6);
    const midi = notes.map((hz) => 69 + 12 * Math.log2(hz / 440));
    // G–C–E, then C–D–F (F–D–C backwards), each well off its semitone.
    expect(midi.map((m) => Math.round(m))).toEqual([55, 60, 64, 60, 62, 65]);
    for (const m of midi.slice(1)) expect(Math.abs(m - Math.round(m))).toBeGreaterThan(0.15);
    // An octave partial carries the tune where small speakers can't play G3 (D134), on the same
    // wrong notes; the music's duck is held while Hollow walk (HOLLOW_DUCK), not per hum.
    const octave = SFX.hollow_hum.layers.filter(
      (l) => l.wave !== 'noise' && 'freq' in l && l.freq / base > 1.9 && l.freq / base < 2.1,
    );
    expect(octave).toHaveLength(1);
    expect(octave[0]).toMatchObject({ steps: hum.steps });
    expect(octave[0]!.gain).toBeGreaterThanOrEqual(0.3);
    expect(SFX.hollow_hum).not.toHaveProperty('duck');
  });

  it('the Act I battle theme has every layer, and the sting is the six-note phrase', () => {
    const layers = new Set(THEMES.act1_battle.tracks.map((t) => t.layer));
    expect([...layers].toSorted()).toEqual(['base', 'choir', 'drums', 'lead']);
    const sting = CUES.bright_sting.tracks.find((t) => t.layer === 'lead')!;
    const notes = sting.pattern.split(/\s+/).filter((t) => /^[A-G]/.test(t));
    expect(notes).toEqual(['G5', 'C6', 'E6', 'F6', 'D6', 'C6']);
  });

  it('reports pattern problems', () => {
    const bad = {
      id: 'bad',
      bpm: 120,
      bars: 1,
      loop: true,
      tracks: [
        {
          layer: 'lead' as const,
          instrument: 'lead',
          stepsPerToken: 2 as const,
          gain: 0.5,
          pattern: 'C4 - X9 .',
        },
      ],
    };
    const problems = songProblems(bad, instrumentIds, drumIds);
    expect(problems.join('\n')).toMatch(/4 tokens, expected 8/);
    expect(problems.join('\n')).toMatch(/'X9' is not a note/);
  });
});

/** A track pattern's notes. */
const notes = (pattern: string): string[] => pattern.split(/\s+/).filter((t) => /^[A-G]/.test(t));

describe("Act II's story cues (T550)", () => {
  it("hums the home motif as written once (HOME_MOTIF), alone on Pebble's voice", () => {
    expect(HOME_MOTIF).toEqual(['A3', 'C4', 'D4', 'A3']);
    expect(lead('home_hum')).toEqual([...HOME_MOTIF]);
    expect(CUES.home_hum.tracks).toHaveLength(1);
    expect(CUES.home_hum.tracks[0]!.instrument).toBe('hum');
    // In tune (the Hollow's hum is the one that's wrong): the hum voice never glides or bends.
    for (const l of INSTRUMENTS.hum.layers) expect(l).not.toHaveProperty('glide');
  });

  it('carries the stardust home on the motif an octave up; selling it shrugs in minor', () => {
    const up = HOME_MOTIF.map((n) => noteToMidi(n)! + 12);
    expect(lead('c2_returned').map((n) => noteToMidi(n))).toEqual(up);
    // Sold: Zibzab's coin, then a bass that stops on the dominant, not home.
    const bass = CUES.c2_sold.tracks.find((t) => t.instrument === 'bass')!;
    expect(notes(bass.pattern).at(-1)).toBe('G2');
    expect(C2_STINGS).toEqual({ sold: 'c2_sold', returned: 'c2_returned', none: null });
  });

  it("plays the PA's shift change in minor on the PA, the six notes with the third flattened", () => {
    expect(PA_JINGLE_CUE.minor).toBe('pa_shift_minor');
    const pa = CUES.pa_shift_minor.tracks.filter((t) => t.instrument === 'pa');
    expect(pa.length).toBeGreaterThanOrEqual(1);
    expect(lead('pa_shift_minor').slice(0, 6)).toEqual(['G4', 'C5', 'Eb5', 'F5', 'D5', 'C5']);
    expect(lead('pa_shift_minor').at(-1)).toBe('C4');
  });

  it('sings each sung line in place of its blip, matched by its scene, speaker and text', () => {
    for (const c of LINE_CUES) {
      const scene = SCENES[c.scene];
      expect(scene, c.scene).toBeDefined();
      // The line (or, for the player, the pick) is in its scene as written.
      const found = scene!.nodes.some(
        (n) =>
          (n.kind === 'line' && n.speaker === c.speaker && n.text === c.text) ||
          (n.kind === 'choice' &&
            c.speaker === 'player' &&
            n.options.some((o) => o.text === c.text)),
      );
      expect(found, `${c.scene}: ${c.speaker} '${c.text}'`).toBe(true);
      expect(c.musicDuck).toBeGreaterThan(0);
      expect(c.musicDuck).toBeLessThan(1);
    }
    expect(lineCue('a2_m06_base_whistle', 'pebble', 'Hm. Hm-hm. Hmmm.')?.cue).toBe('home_hum');
    expect(lineCue('a2_m06_base_loophole', 'pebble', 'Hm. Hm-hm. Hmmm.')).toBeNull();
    expect(lineCue('a2_m06_base_whistle', 'pebble', '(squeak) Home.')).toBeNull();
    // A comms cue's lines match without a scene id; a scene's never do.
    expect(lineCue(null, 'bricks', '(hum, six notes, slow)')?.cue).toBeNull();
    expect(lineCue(null, 'bricks', '(hum, six notes, slow)')).not.toBeNull();
    expect(lineCue(null, 'pebble', 'Hm. Hm-hm. Hmmm.')).toBeNull();
  });
});

const trackNotes = (song: {
  tracks: readonly { instrument: string; layer: string; pattern: string }[];
}) => song.tracks.map((t) => ({ ...t, notes: notes(t.pattern) }));

describe("Act III, part two's music (T750)", () => {
  it("stops Bricks's hum halfway in the shelters' bed; the Choir's line, where one stands, finishes it", () => {
    const tracks = trackNotes(THEMES.act3_shelters);
    const bricks = tracks.filter((t) => t.layer === 'base' && t.instrument === 'hum');
    expect(bricks).toHaveLength(1);
    expect(bricks[0]!.notes).toEqual(['G2', 'C3', 'E3']);
    // His bar is the Choir's "Ev-er-glow" bar (bar 5), and the Choir sings on to F–D–C.
    const bars = bricks[0]!.pattern.split('|');
    const choir = THEMES.act3_shelters.tracks.find((t) => t.layer === 'choir')!;
    const choirBars = choir.pattern.split('|');
    const at = bars.findIndex((b) => /[A-G]/.test(b));
    expect(notes(choirBars[at]!)).toEqual(['G4', 'C5', 'E5']);
    expect(notes(choirBars[at + 1]!)).toEqual(['F5', 'D5', 'C5']);
  });

  it("hums the six notes in the vats' bed, low, on a machine's voice", () => {
    const vats = trackNotes(THEMES.act3_vats).find((t) => t.instrument === 'bass')!;
    expect(vats.notes.slice(0, 6)).toEqual(['G2', 'C3', 'E3', 'F3', 'D3', 'C3']);
    const layers = new Set(THEMES.act3_vats.tracks.map((t) => t.layer));
    expect([...layers].toSorted()).toEqual(['base', 'choir', 'drums', 'lead']);
  });

  it('lands the domes opening home: F–D–C over IV–V–I in C major, a major third on top', () => {
    const t = trackNotes(CUES.domes_open);
    expect(t.find((x) => x.instrument === 'hum')!.notes).toEqual(['F4', 'D4', 'C4']);
    const roots = t.filter((x) => x.instrument === 'pad').map((x) => x.notes);
    expect(roots[0]).toEqual(['F2', 'G2', 'C3']);
    expect(t.find((x) => x.instrument === 'glass')!.notes.at(-1)).toBe('E5');
  });

  it("lifts the home motif to E for Waykeeper, then climbs the jingle's first notes on glass", () => {
    const t = trackNotes(CUES.waykeeper);
    const [h1, h2, h3] = HOME_MOTIF.map((n) => n.replace(/\d$/, (d) => String(Number(d) + 1)));
    expect(t.find((x) => x.instrument === 'hum')!.notes).toEqual([h1, h2, h3, 'E5']);
    expect(t.find((x) => x.instrument === 'glass')!.notes.slice(0, 3)).toEqual(['G4', 'C5', 'E5']);
  });

  it("stutters the PA's chime up a semitone at a time as the platform flees, and finishes the Maw in tune", () => {
    const pa = trackNotes(CUES.pa_frantic)[0]!;
    expect(pa.instrument).toBe('pa');
    expect(pa.notes.slice(0, 6)).toEqual(['G4', 'C5', 'E5', 'Ab4', 'Db5', 'F5']);
    for (const t of trackNotes(CUES.gmaw_beaten).filter((x) => x.instrument === 'hum')) {
      expect(t.notes.map((n) => n.slice(0, -1))).toEqual(['F', 'D', 'C']);
    }
  });
});

describe("Act III, part two's story sounds (T750)", () => {
  it("makes Bricks's silences truly silent, and only his", () => {
    expect(silenceHush('bricks')?.musicDuck).toBe(0);
    expect(silenceHush('bricks')!.sfxDuck).toBeLessThan(0.5);
    expect(silenceHush('quill')).toBeNull();
    expect(silenceHush('kip')).toBeNull();
  });

  it("knocks on Pebble's knock-knock, matched to the line as written", () => {
    for (const l of LINE_SFX) {
      const found = Object.values(SCENES).some((scene) =>
        scene.nodes.some((n) => n.kind === 'line' && n.speaker === l.speaker && n.text === l.text),
      );
      expect(found, l.text).toBe(true);
    }
    expect(lineSfx('pebble', 'Knock knock! (squeak)')?.sfx).toBe('knock_knock');
    expect(lineSfx('pebble', 'Knock knock!')).toBeNull();
  });

  it("stings Waykeeper in A3M6's debrief, where Pebble names you", () => {
    const scene = SCENES[WAYKEEPER_STING.scene];
    expect(scene).toBeDefined();
    const named = scene!.nodes.some(
      (n) => n.kind === 'line' && n.speaker === 'pebble' && n.text.includes('Waykeeper'),
    );
    expect(named).toBe(true);
  });
});
