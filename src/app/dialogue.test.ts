// The dialogue system in play (T302b): scenes that hold input (pause, choices, effects saved),
// the comms panel (radio scenes, replies under their cue, staleness), barks (6 s spacing, dropped
// rather than queued, never under another line), the bank nudge after the countdown's radio, and
// the briefing as a scene. Real-time holds run on fake timers; sim time is the sim's tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
import { A1_M01_RADIO } from '../content/radio/a1_m01.ts';
import { A1_M02_RADIO } from '../content/radio/a1_m02.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore, createNewSave, type SaveData } from '../meta/index.ts';
import type { DialogueEffects } from '../story/runner.ts';
import { createSim, type SimEvent, type SimState } from '../sim/index.ts';
import { DEV_SCENES } from '../ui/dialogue/dev.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { typeMs } from '../ui/dialogue/text.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { dismissBriefing, setSpeed } from './commands.ts';
import {
  advanceScene,
  BANK_NUDGE_CREDITS,
  bindDialogue,
  chooseOption,
  commsHoldMs,
  presentSpeakers,
  playScene,
  readMs,
  REPLY_BEAT_MS,
  sceneMode,
  setDialogueEnabled,
  skipScene,
  withSceneEffects,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { activeSave, initSaves, newGame } from './save.ts';

type Ev = SimEvent<IdSpace>;
const noop = (): void => {};

/** A battle's host on `mapId`, its state writable (tests set the tick and credits directly). */
function battle(mapId: string): { host: Host<IdSpace>; state: SimState } {
  const sim = createSim(battleConfig(mapId, 1, null));
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the test sets up state directly
  const state = sim.state as unknown as SimState;
  return { host: createHost(sim), state };
}

const shown = (): string | null => dialogue.comms.value?.line.text ?? null;
const cue = (): string | null => dialogue.comms.value?.cue?.text ?? null;
const countdown = (wave: number): Ev => ({ type: 'CountdownStarted', wave, ticks: 1500 });
const leak = (uid: number, enemy = 'nibbler'): Ev => ({ type: 'EnemyLeaked', uid, enemy, leak: 1 });
const radio = (table: typeof A1_M01_RADIO, pick: (l: (typeof A1_M01_RADIO)[number]) => boolean) =>
  table.filter(pick).map((l) => l.text);
/** How long a lone comms line holds. */
const hold = (text: string): number => commsHoldMs(text, undefined, false);

describe('dialogue helpers', () => {
  it('holds a comms line for its reading time, and a typed beat before an answer', () => {
    expect(readMs('short')).toBe(4000);
    expect(readMs('x'.repeat(100))).toBe(4000 + 40 * 40);
    expect(commsHoldMs('hello', undefined, false)).toBe(4000);
    const long = 'x'.repeat(200);
    expect(commsHoldMs(long, undefined, false)).toBe(readMs(long));
    expect(commsHoldMs('hello', undefined, true)).toBe(typeMs('hello') + REPLY_BEAT_MS);
    expect(commsHoldMs('', 2.5, false)).toBe(2500);
  });

  it('stages scenes by slot: full-screen, the briefing, a panel for a choice, else comms', () => {
    const [survey, party, knock] = DEV_SCENES;
    expect(sceneMode(survey!)).toBe('panel');
    expect(sceneMode(party!)).toBe('fullscreen');
    expect(sceneMode(knock!)).toBe('comms');
    expect(sceneMode(defineScene('a1_m01_brief', [{ kind: 'end' }]))).toBe('briefing');
  });

  it('puts QUILL and a present companion on the radio', () => {
    expect(presentSpeakers({ companion: { id: 'bricks', state: 'present' } })).toEqual([
      'quill',
      'bricks',
    ]);
    expect(presentSpeakers({ companion: { id: 'bricks', state: 'absent' } })).toEqual(['quill']);
    expect(presentSpeakers({ companion: { id: 'bramble', state: 'present' } })).toEqual([
      'quill',
      'chitterbloom',
    ]);
    expect(presentSpeakers({ companion: null })).toEqual(['quill']);
  });

  it("saves a scene's flags, callsign, and seen id; never an adapted radio id", () => {
    const save: SaveData = {
      ...createNewSave(),
      profile: { name: 'Ada', pronouns: 'they', callsign: 'sprout' },
    };
    const fx: DialogueEffects = { flags: { peeker_poked: true }, callsign: 'thorn' };
    const after = withSceneEffects(save, 'a1_m01_cue_test', fx);
    expect(after.story.flags.peeker_poked).toBe(true);
    expect(after.profile?.callsign).toBe('thorn');
    expect(after.story.seen).toEqual(['a1_m01_cue_test']);
    // Seen once; nothing new is the same save.
    expect(withSceneEffects(after, 'a1_m01_cue_test', { flags: {}, callsign: null })).toBe(after);
    expect(withSceneEffects(save, 'radio:a1_m01:countdown:4', { flags: {}, callsign: null })).toBe(
      save,
    );
  });
});

describe("a battle's dialogue", () => {
  let unbind: () => void = noop;
  let b: ReturnType<typeof battle>;
  const bind = (mapId: string, opts: { briefing?: boolean; newTowers?: string[] } = {}): void => {
    b = battle(mapId);
    b.state.credits = 0; // no bank nudge unless a test banks credits
    unbind = bindDialogue(b.host, {
      briefing: opts.briefing ?? false,
      newTowers: opts.newTowers ?? [],
    });
  };
  const emit = (e: Ev): void => b.host.bus.emit(e);
  /** Moves sim time to `sec` seconds (bark spacing reads it). */
  const at = (sec: number): void => {
    b.state.tick = Math.round(sec * 60);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    setDialogueEnabled(true);
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    vi.useRealTimers();
    setDialogueEnabled(true);
    screen.value = null;
  });

  it("plays a countdown's radio as a scene: the punchline, then Bricks's answer under it (D028)", () => {
    bind('a1_m01');
    const [setup, punchline, answer] = radio(
      A1_M01_RADIO,
      (l) => l.on === 'countdown' && l.wave === 6,
    );
    emit(countdown(6));
    expect(shown()).toBe(setup);
    expect(dialogue.comms.value?.line.portrait?.sprite).toBe('portrait.quill');
    vi.advanceTimersByTime(hold(setup!)); // QUILL to QUILL: the setup holds in full
    expect(shown()).toBe(punchline);
    expect(cue()).toBeNull();
    vi.advanceTimersByTime(typeMs(punchline!) + REPLY_BEAT_MS);
    expect(shown()).toBe(answer);
    expect(cue()).toBe(punchline);
    expect(dialogue.comms.value?.line.name).toBe('Bricks');
    vi.advanceTimersByTime(hold(answer!));
    expect(shown()).toBeNull();
  });

  it('queues scenes behind the line on screen, and drops one gone stale', () => {
    bind('a1_m01');
    emit(countdown(4)); // Goldie
    emit({ type: 'TowerClassUnlocked', tower: 'thumper' }); // QUILL's Crossfire line, queued
    const goldie = shown()!;
    expect(goldie).toMatch(/^Oh! You're the new tech!/);
    vi.advanceTimersByTime(hold(goldie));
    expect(shown()).toMatch(/^New hardware!/);
    unbind();
    bind('a1_m01');
    emit(countdown(7)); // Bricks: about 7 s
    emit(countdown(4));
    emit(countdown(5));
    emit(countdown(6)); // starts after Goldie and Bricks's W5: stale by then
    const heard: string[] = [];
    const off = dialogue.comms.subscribe((c) => {
      if (c !== null && !heard.includes(c.line.text)) heard.push(c.line.text);
    });
    vi.advanceTimersByTime(60_000);
    off();
    expect(heard.some((t) => t.startsWith('Time for Joke of the Shift'))).toBe(false);
  });

  it('plays a bark when the panel is free, keeps 6 s of sim time between barks, and never queues', () => {
    bind('a1_m01');
    at(10);
    emit({ type: 'WaveCleared', wave: 2, bonus: 0 });
    const perfect = radio(A1_M01_RADIO, (l) => l.on === 'perfectWave')[0]!;
    expect(shown()).toBe(perfect);
    expect(cue()).toBeNull(); // standalone, never a reply (D061)
    vi.advanceTimersByTime(hold(perfect));
    expect(shown()).toBeNull();
    // A big bank as W3's build phase opens, within 6 s of sim time: dropped, not queued.
    b.state.credits = BANK_NUDGE_CREDITS;
    at(14);
    emit(countdown(3));
    expect(shown()).toBeNull();
    vi.advanceTimersByTime(20_000);
    expect(shown()).toBeNull();
    // Later, it plays.
    at(30);
    emit(countdown(2));
    expect(shown()).toMatch(/^Unspent budget detected!/);
  });

  it("drops a bark that comes while a scene's line is up", () => {
    bind('a1_m01');
    emit(countdown(4));
    at(20);
    emit({ type: 'WaveCleared', wave: 3, bonus: 0 });
    expect(shown()).toMatch(/^Oh! You're the new tech!/);
    vi.advanceTimersByTime(30_000);
    expect(shown()).toBeNull(); // the perfect-wave line never played late
  });

  it('plays the first leak as a queued scene, so a bark just before it never drops it', () => {
    bind('a1_m01');
    b.state.credits = BANK_NUDGE_CREDITS;
    at(8);
    emit(countdown(2)); // the nudge
    at(10);
    emit(leak(1));
    expect(shown()).toMatch(/^Unspent budget detected!/);
    vi.advanceTimersByTime(hold(shown()!));
    expect(shown()).toBe(radio(A1_M01_RADIO, (l) => l.on === 'firstLeak')[0]);
  });

  it('plays the perfect-wave bark from its wave on (A1M1: from W2)', () => {
    bind('a1_m01');
    at(30);
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 }); // the jingle pair, not the bark
    expect(shown()).toBe('(singing along) Ev-er-glow, Ev-er-glow!');
  });

  it("nudges a big bank after the countdown's radio, on its own (D061)", () => {
    bind('a1_m02');
    b.state.credits = BANK_NUDGE_CREDITS + 100;
    const pension = radio(A1_M02_RADIO, (l) => l.on === 'countdown' && l.wave === 7)[0]!;
    const nudge = radio(A1_M02_RADIO, (l) => l.on === 'bankNudge')[0]!;
    at(100);
    emit(countdown(7));
    expect(shown()).toBe(pension);
    vi.advanceTimersByTime(hold(pension));
    expect(shown()).toBe(nudge);
    expect(cue()).toBeNull();
  });

  it('announces a newly issued tower once the briefing closes (D061)', () => {
    setDialogueEnabled(true);
    bind('a1_m02', { briefing: true, newTowers: ['sprinkler'] });
    expect(dialogue.scene.value?.mode).toBe('briefing');
    expect(shown()).toBeNull(); // never under the briefing
    dismissBriefing();
    expect(dialogue.scene.value).toBeNull();
    expect(shown()).toMatch(/^New hardware! The Frostline Sprinkler/);
  });

  it('shows the briefing whole and played out while dialogue is off', () => {
    setDialogueEnabled(false);
    bind('a1_m01', { briefing: true });
    const view = dialogue.scene.value;
    expect(hud.briefing.value).toBe('radio:a1_m01:brief');
    expect(view?.instant).toBe(true);
    expect(view?.ended).toBe(true);
    expect(view?.transcript.map((l) => l.name)).toEqual(['QUILL', 'Bricks', 'QUILL', 'Bricks']);
    // "&" reads "and" in Silkscreen (D059).
    expect(view?.transcript[0]?.text).toContain('Logistics and Lethality');
    // And nothing plays on the panel.
    dismissBriefing();
    emit(countdown(4));
    expect(shown()).toBeNull();
  });

  it('types the briefing line by line while dialogue is on', () => {
    bind('a1_m01', { briefing: true });
    expect(dialogue.scene.value?.line?.name).toBe('QUILL');
    expect(dialogue.scene.value?.ended).toBe(false);
    for (let i = 0; i < 4; i++) advanceScene();
    expect(dialogue.scene.value?.ended).toBe(true);
    expect(dialogue.scene.value?.transcript).toHaveLength(4);
    expect(hud.briefing.value).not.toBeNull(); // Clock in closes it
  });

  it('pauses play for a scene with a choice, takes the pick, and puts the speed back', () => {
    bind('a1_m01');
    newGame(1);
    setSpeed(2);
    const survey = DEV_SCENES[0]!;
    playScene(survey);
    expect(speed.value).toBe(0);
    expect(dialogue.scene.value?.mode).toBe('panel');
    expect(dialogue.scene.value?.line?.speaker).toBe('quill');
    advanceScene();
    advanceScene();
    expect(dialogue.scene.value?.choices?.map((c) => c.text)).toEqual([
      'Great, honestly.',
      'Ask me after lunch.',
      '...',
    ]);
    chooseOption(1);
    const line = dialogue.scene.value?.line;
    expect(line?.portrait).toMatchObject({ expression: 'policy', policy: true });
    expect(dialogue.scene.value?.transcript.at(-1)).toMatchObject({
      speaker: 'player',
      text: 'Ask me after lunch.',
    });
    advanceScene();
    expect(dialogue.scene.value).toBeNull();
    expect(speed.value).toBe(2);
    expect(activeSave()?.story.seen).toContain(survey.id);
  });

  it('skips to the next choice on Esc, and a pause the player made stays', () => {
    bind('a1_m01');
    setSpeed(0);
    playScene(DEV_SCENES[0]!);
    expect(skipScene()).toBe(true);
    expect(dialogue.scene.value?.choices).toHaveLength(3);
    chooseOption(2);
    expect(skipScene()).toBe(true);
    expect(dialogue.scene.value).toBeNull();
    expect(speed.value).toBe(0);
  });

  it("applies a choice's flags as the scene ends", () => {
    bind('a1_m01');
    newGame(1);
    const scene: Scene = defineScene('a1_m01_cue_test', [
      {
        kind: 'choice',
        options: [
          { text: 'Poke it.', tone: 'wry', set: { peeker_poked: true } },
          { text: 'Leave it be.', tone: 'quiet' },
        ],
      },
      { kind: 'line', speaker: 'bricks', text: 'Huh.' },
    ]);
    playScene(scene);
    chooseOption(0);
    expect(activeSave()?.story.flags.peeker_poked).toBeUndefined(); // saved as it ends
    advanceScene();
    expect(activeSave()?.story.flags.peeker_poked).toBe(true);
  });

  it('plays the A1M2 Denise line with the pointer on', () => {
    bind('a1_m02');
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
    expect(dialogue.comms.value?.line).toMatchObject({ speaker: 'bricks', point: true });
  });

  it('unbinding clears the panel and stops the radio', () => {
    bind('a1_m01');
    emit(countdown(4));
    expect(shown()).not.toBeNull();
    unbind();
    unbind = noop;
    expect(shown()).toBeNull();
    vi.advanceTimersByTime(30_000);
    expect(shown()).toBeNull();
  });
});
