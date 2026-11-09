import { describe, expect, it } from 'vitest';
import { asContext, FakeAudioContext, lastTarget } from './__fixtures__/fakeAudio.ts';
import { analyze } from './analyze.ts';
import { createAudioEngine, silentEngine } from './engine.ts';
import { SFX, SFX_IDS } from './sfx/index.ts';
import { BLIP_SFX } from './sfx/blips.ts';
import {
  DEFAULT_VOLUMES,
  LOW_PRIORITY_MAX,
  MAX_SFX_VOICES,
  MUSIC_TRIM,
  SFX_TRIM,
  SPEECH_SFX_DUCK,
  Synth,
} from './synth.ts';

/** Whether `node`'s outputs lead to `target` (the fake graph records every connect). */
function reaches(node: unknown, target: unknown): boolean {
  if (node === target) return true;
  const outs = (node as { outputs?: unknown[] }).outputs ?? [];
  return outs.some((o) => reaches(o, target));
}

function synth(): { ctx: FakeAudioContext; s: Synth } {
  const ctx = new FakeAudioContext();
  return { ctx, s: new Synth(asContext(ctx)) };
}

describe('the synth', () => {
  it('builds the bus graph with a limiter and the default volumes', () => {
    const { ctx, s } = synth();
    expect(ctx.created['compressor']).toBe(2);
    expect(ctx.created['shaper']).toBe(1);
    expect(lastTarget(s.master.gain)).toBe(DEFAULT_VOLUMES.master);
    expect(lastTarget(s.music.gain)).toBeCloseTo(DEFAULT_VOLUMES.music * MUSIC_TRIM);
    expect(lastTarget(s.sfx.gain)).toBeCloseTo(DEFAULT_VOLUMES.sfx * SFX_TRIM);
    s.setVolumes({ ...DEFAULT_VOLUMES, muted: true });
    expect(lastTarget(s.master.gain)).toBe(0);
  });

  it('plays a recipe as one source per layer and counts it', () => {
    const { ctx, s } = synth();
    expect(s.play('build')).toBe(true);
    expect(ctx.voices).toBe(SFX.build.layers.length);
    expect(s.played.get('build')).toBe(1);
    expect(s.voices()).toBe(1);
  });

  it('rate-limits a hitscan stream: 20 shots in one moment play once', () => {
    const { ctx, s } = synth();
    let played = 0;
    for (let i = 0; i < 20; i++) if (s.play('rivet_shot')) played++;
    expect(played).toBe(1);
    // 70 ms later the next one may play.
    ctx.currentTime = 0.08;
    expect(s.play('rivet_shot')).toBe(true);
  });

  it(`never holds more than ${MAX_SFX_VOICES} sound instances`, () => {
    const { ctx, s } = synth();
    const ids = SFX_IDS;
    for (let i = 0; i < 200; i++) {
      ctx.currentTime = i * 0.01;
      s.play(ids[i % ids.length]!);
      expect(s.voices()).toBeLessThanOrEqual(MAX_SFX_VOICES);
    }
  });

  it('schedules a theme ahead of the clock, only on its live layers', () => {
    const { ctx, s } = synth();
    s.setTheme('act1_battle', { base: 1, drums: 0, lead: 0 });
    const afterBase = ctx.voices;
    expect(afterBase).toBeGreaterThan(0);
    s.setTheme('act1_battle', { base: 1, drums: 1, lead: 1 });
    expect(s.theme).toBe('act1_battle');
    expect(s.layerLevels).toEqual({ base: 1, drums: 1, lead: 1 });
    ctx.currentTime = 1;
    s.pump();
    // Notes start no earlier than now, and no later than the lookahead.
    const starts = ctx.started.slice(afterBase).map((v) => v.startAt ?? 0);
    expect(Math.min(...starts)).toBeGreaterThanOrEqual(0.9);
    expect(Math.max(...starts)).toBeLessThanOrEqual(1.2);
  });

  it('crossfades to another theme and fades out to silence', () => {
    const { s } = synth();
    s.setTheme('title', { base: 1, drums: 0, lead: 1 });
    s.setTheme('act1_battle', { base: 1, drums: 0, lead: 0 });
    expect(s.theme).toBe('act1_battle');
    s.setTheme(null, { base: 0, drums: 0, lead: 0 });
    expect(s.theme).toBeNull();
  });

  it('ducks the music under held and timed ducks', () => {
    const { ctx, s } = synth();
    s.holdDuck('radio', 0.55);
    expect(lastTarget(s.duck.gain)).toBe(0.55);
    s.play('strike_boom');
    expect(lastTarget(s.duck.gain)).toBe(SFX.strike_boom.duck);
    s.holdDuck('radio', null);
    ctx.currentTime = 2;
    s.pump();
    expect(lastTarget(s.duck.gain)).toBe(1);
  });

  it('routes low-priority sounds through the bus speech ducks by about 3 dB (R10)', () => {
    const { ctx, s } = synth();
    expect(SFX.rivet_shot.priority).toBeLessThanOrEqual(LOW_PRIORITY_MAX);
    s.play('rivet_shot');
    const shot = ctx.started.at(-1);
    expect(reaches(shot, s.low)).toBe(true);
    s.play('leak');
    expect(reaches(ctx.started.at(-1), s.low)).toBe(false);
    expect(reaches(ctx.started.at(-1), s.sfx)).toBe(true);
    s.holdSfxDuck('speech', SPEECH_SFX_DUCK);
    expect(20 * Math.log10(lastTarget(s.low.gain))).toBeCloseTo(-3, 0);
    s.holdSfxDuck('speech', null);
    expect(lastTarget(s.low.gain)).toBe(1);
  });

  it('never ducks or buries a line: blips outrank combat, ticks outrank the rattle (R10)', () => {
    for (const r of Object.values(BLIP_SFX)) expect(r.priority).toBe(3);
    expect(SFX.type_tick.priority).toBe(2);
    expect(SFX.type_tick.priority).toBeGreaterThan(LOW_PRIORITY_MAX);
  });

  it('plays cues to their end', () => {
    const { ctx, s } = synth();
    s.cue('bright_sting');
    s.pump(10);
    expect(ctx.voices).toBeGreaterThan(6);
    expect(s.played.get('cue:bright_sting')).toBe(1);
  });
});

describe('the engine', () => {
  it('is silent without WebAudio', () => {
    const e = createAudioEngine(() => null);
    e.unlock();
    expect(e.play('build')).toBe(false);
    expect(e.status()).toMatchObject({ enabled: false, unlocked: false });
    expect(silentEngine(true).status().muted).toBe(true);
  });

  it('makes no context before a gesture, then starts the remembered music on unlock', () => {
    const ctx = new FakeAudioContext();
    let made = 0;
    const e = createAudioEngine(() => {
      made++;
      return asContext(ctx);
    });
    e.setMusic('title', { base: 1, drums: 0, lead: 1 });
    expect(e.play('ui_click')).toBe(false);
    expect(made).toBe(0);
    e.unlock();
    e.unlock();
    expect(made).toBe(1);
    expect(e.status()).toMatchObject({
      enabled: true,
      unlocked: true,
      state: 'running',
      theme: 'title',
    });
    expect(e.play('ui_click')).toBe(true);
    expect(e.status().played).toMatchObject({ ui_click: 1 });
    e.setVolumes({ ...DEFAULT_VOLUMES, muted: true });
    expect(e.status().muted).toBe(true);
    e.setSuspended(true);
    expect(ctx.state).toBe('suspended');
    expect(e.play('ui_click')).toBe(false);
    e.setSuspended(false);
  });
});

describe('analyze', () => {
  it('measures peak, RMS, audible length, and clipping', () => {
    const a = new Float32Array(100);
    for (let i = 0; i < 50; i++) a[i] = i % 2 === 0 ? 0.5 : -0.5;
    a[10] = 1;
    const l = analyze([a], 100);
    expect(l.peak).toBe(1);
    expect(l.clipped).toBe(1);
    expect(l.durationSec).toBe(0.5);
    expect(l.rms).toBeGreaterThan(0.5);
    expect(l.rms).toBeLessThan(0.6);
    expect(analyze([new Float32Array(10)], 10)).toMatchObject({ peak: 0, rms: 0, durationSec: 0 });
  });
});
