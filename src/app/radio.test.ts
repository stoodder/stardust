// The radio adapter (T302b): content/radio's tables as dialogue scenes and barks, until T302c
// migrates them. Every line still plays somewhere (nothing goes silent), batches stay scenes (so a
// reply still answers its cue, D028), and lone event lines become barks on the D070 triggers.
import { describe, expect, it } from 'vitest';
import { A1_M01_RADIO } from '../content/radio/a1_m01.ts';
import { A1_M02_RADIO } from '../content/radio/a1_m02.ts';
import { RADIO_TABLES } from '../content/radio/index.ts';
import { MAPS } from '../content/maps/index.ts';
import type { LineNode, Scene } from '../content/dialogue/types.ts';
import { adaptRadio, momentOf, speakerNamed, staticBriefingScene } from './radio.ts';

const lines = (s: Scene | undefined): LineNode[] =>
  (s?.nodes ?? []).filter((n): n is LineNode => n.kind === 'line');
const texts = (s: Scene | undefined): string[] => lines(s).map((n) => n.text);

describe('the radio adapter', () => {
  it('plays every radio line but the debrief, exactly once, as a scene line or a bark', () => {
    for (const [mapId, table] of Object.entries(RADIO_TABLES)) {
      const a = adaptRadio(mapId);
      expect(a, mapId).not.toBeNull();
      const played = [
        ...[...(a?.scenes.values() ?? [])].flatMap((s) => texts(s)),
        ...(a?.barks ?? []).map((b) => b.text),
      ].toSorted();
      const want = table
        .filter((l) => l.on !== 'mapWon' && l.on !== 'mapLost')
        .map((l) => l.text)
        .toSorted();
      expect(played, mapId).toEqual(want);
    }
  });

  it("keeps A1M1's batches as scenes: the joke's punchline and Bricks's answer, the jingle pair", () => {
    const a = adaptRadio('a1_m01');
    expect(texts(a?.scenes.get('countdown:6'))).toEqual(
      A1_M01_RADIO.filter((l) => l.on === 'countdown' && l.wave === 6).map((l) => l.text),
    );
    expect(lines(a?.scenes.get('countdown:6')).map((n) => n.speaker)).toEqual([
      'quill',
      'quill',
      'bricks',
    ]);
    expect(texts(a?.scenes.get('waveCleared:1'))).toEqual([
      '(singing along) Ev-er-glow, Ev-er-glow!',
      'That jingle. Every time.',
    ]);
    expect(lines(a?.scenes.get('unlock:thumper'))[0]?.speaker).toBe('quill');
    // Adapted ids never reach the save's seen list.
    for (const s of a?.scenes.values() ?? []) expect(s.id.startsWith('radio:a1_m01:')).toBe(true);
  });

  it('turns lone event lines into barks on the D070 triggers', () => {
    const a1 = adaptRadio('a1_m01');
    expect(a1?.barks.map((b) => b.trigger)).toEqual([
      { on: 'first_leak' },
      { on: 'perfect_wave' },
      { on: 'bank_nudge' },
    ]);
    // A1M1's perfect-wave line plays from W2 (the jingle owns W1).
    const perfect = a1?.barks.find((b) => b.trigger.on === 'perfect_wave');
    expect(a1?.fromWave.get(perfect?.id ?? '')).toBe(2);
    const a2 = adaptRadio('a1_m02');
    expect(a2?.barks.map((b) => b.trigger)).toEqual([
      { on: 'tower_issued', tower: 'sprinkler' },
      { on: 'enemy_leaked', enemy: 'hauler' },
      { on: 'bank_nudge' },
    ]);
    // The first Hauler down is a pair (QUILL's glee, Bricks's tip): a scene.
    expect(lines(a2?.scenes.get('enemyKilled:hauler')).map((n) => n.speaker)).toEqual([
      'quill',
      'bricks',
    ]);
  });

  it("keeps the Denise pointer and QUILL's policy tell", () => {
    const a = adaptRadio('a1_m02');
    const denise = lines(a?.scenes.get('waveCleared:1'))[0];
    expect(denise).toMatchObject({ speaker: 'bricks', point: 'firstTower' });
    const policy = lines(a?.scenes.get('countdown:3'))[0];
    expect(policy).toMatchObject({ speaker: 'quill', expression: 'policy' });
    expect(A1_M02_RADIO.some((l) => l.text === policy?.text)).toBe(true);
  });

  it('keys each line by its moment, and leaves the debrief to the results card', () => {
    expect(momentOf({ on: 'countdown', wave: 4, speaker: 'goldie', text: 'x' })).toBe('countdown:4');
    expect(momentOf({ on: 'unlock', tower: 'thumper', speaker: 'quill', text: 'x' })).toBe(
      'unlock:thumper',
    );
    expect(momentOf({ on: 'mapWon', speaker: 'bricks', text: 'x' })).toBeNull();
    expect(adaptRadio('dev_range')).toBeNull();
  });
});

describe('the static briefing as a scene', () => {
  it("plays A1M1's briefing lines verbatim, each by its speaker", () => {
    const scene = staticBriefingScene('a1_m01', MAPS.a1_m01.briefing);
    expect(scene?.id).toBe('radio:a1_m01:brief');
    expect(lines(scene ?? undefined).map((n) => n.speaker)).toEqual([
      'quill',
      'bricks',
      'quill',
      'bricks',
    ]);
    const rows = (MAPS.a1_m01.briefing ?? '').split('\n').map((r) => r.replace(/^[^:]+: /, ''));
    expect(texts(scene ?? undefined)).toEqual(rows);
  });

  it('reads an unknown or missing speaker as system copy, and no briefing as none', () => {
    const scene = staticBriefingScene('a1_m01', 'Note: read the manual\nNo speaker here\n\n');
    expect(lines(scene ?? undefined).map((n) => [n.speaker, n.text])).toEqual([
      ['system', 'Note: read the manual'],
      ['system', 'No speaker here'],
    ]);
    expect(staticBriefingScene('a1_m01', undefined)).toBeNull();
    expect(staticBriefingScene('a1_m01', '\n')).toBeNull();
  });

  it('finds a speaker by name plate, case aside', () => {
    expect(speakerNamed('QUILL')).toBe('quill');
    expect(speakerNamed('bricks')).toBe('bricks');
    expect(speakerNamed('Prim')).toBe('prim');
    expect(speakerNamed('Nobody')).toBeNull();
  });
});
