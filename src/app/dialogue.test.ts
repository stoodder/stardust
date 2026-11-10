// The dialogue system in play (T302b, T302c): scenes that hold input (pause, choices, effects
// saved), the comms panel (radio scenes, replies under their cue, staleness), barks (6 s spacing,
// dropped rather than queued, never under another line; the first leak and a sold tag queue), the
// bank nudge after the countdown's radio, Bricks's name tag, and the briefing as a scene, all over
// A1M1's and A1M2's real dialogue. Real-time holds run on fake timers; sim time is the sim's tick.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BARKS, SCENES } from '../content/dialogue/index.ts';
import { defineScene } from '../content/dialogue/define.ts';
import type { Scene } from '../content/dialogue/types.ts';
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
  isQueuedTrigger,
  presentSpeakers,
  playScene,
  minReadMs,
  readMs,
  REPLY_BEAT_MS,
  sceneMode,
  setDialogueEnabled,
  skipScene,
  withSceneEffects,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { activeSave, initSaves, newGame, updateActiveSave } from './save.ts';

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
/** The texts of scene `id`'s line nodes, in authoring order. */
const lines = (id: string): string[] =>
  (SCENES[id]?.nodes ?? []).flatMap((n) => (n.kind === 'line' ? [n.text] : []));
/** Bark `id`'s text. */
const bark = (id: string): string => BARKS[id]?.text ?? `<no bark ${id}>`;
const built = (uid: number, tower: string): Ev => ({
  type: 'TowerBuilt',
  uid,
  tower,
  tile: [0, 0],
  cost: 0,
});
const sold = (uid: number): Ev => ({ type: 'TowerSold', uid, refund: 0 });
/** How long a lone comms line holds. */
const hold = (text: string): number => commsHoldMs(text, undefined, false);

describe('dialogue helpers', () => {
  it('holds a comms line for its reading time, and a typed beat before an answer', () => {
    expect(readMs('short')).toBe(4000);
    expect(readMs('x'.repeat(100))).toBe(4000 + 40 * 40);
    expect(commsHoldMs('hello', undefined, false)).toBe(4000);
    // A long line: its minimum read time once typed (D135) outlasts its reading time.
    const long = 'x'.repeat(200);
    expect(commsHoldMs(long, undefined, false)).toBe(typeMs(long) + minReadMs(long));
    expect(minReadMs(long)).toBe(1500 + 45 * 200);
    expect(commsHoldMs('hello', undefined, true)).toBe(typeMs('hello') + REPLY_BEAT_MS);
    expect(commsHoldMs('', 2.5, false)).toBe(2500);
  });

  it('stages scenes by slot: full-screen, the briefing, a panel for a choice, else comms', () => {
    const [survey, party, knock] = DEV_SCENES;
    expect(sceneMode(survey!)).toBe('panel');
    expect(sceneMode(party!)).toBe('fullscreen');
    expect(sceneMode(knock!)).toBe('comms');
    expect(sceneMode(defineScene('a1_m01_brief', [{ kind: 'end' }]))).toBe('briefing');
    // A cue flagged `pause` (D134) is a pausing panel too, with no choice in it.
    const hi = defineScene('a2_m03_cue_test', [{ kind: 'line', speaker: 'pebble', text: 'Hi.' }]);
    expect(sceneMode(hi)).toBe('comms');
    expect(sceneMode({ ...hi, pause: true })).toBe('panel');
    // A base topic is always a panel over the base (T513), choice or not.
    expect(sceneMode(defineScene('a2_m04_base_handover', [{ kind: 'end' }]))).toBe('panel');
  });

  it('queues only the first leak and a tagged sale (never lost); every other bark drops', () => {
    expect(isQueuedTrigger({ on: 'first_leak' })).toBe(true);
    expect(isQueuedTrigger({ on: 'tower_sold', tower: 'rivet', tagged: true })).toBe(true);
    expect(isQueuedTrigger({ on: 'tower_sold', tower: 'rivet' })).toBe(false);
    expect(isQueuedTrigger({ on: 'perfect_wave' })).toBe(false);
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

  it("saves a scene's flags, callsign, and seen id; never a bark's id", () => {
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
    expect(withSceneEffects(save, 'quill_first_leak_a1_01', { flags: {}, callsign: null })).toBe(
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
    const [setup, punchline, answer] = lines('a1_m01_w06');
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
    emit(countdown(3)); // QUILL's Crossfire line, queued
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

  it("gives Goldie the 'lettuce' line when that's why you came (D068)", () => {
    bind('a1_m01');
    newGame(1);
    updateActiveSave((sv) => ({
      ...sv,
      story: { ...sv.story, flags: { ...sv.story.flags, arrival_reason: 'lettuce' } },
    }));
    emit(countdown(4));
    expect(shown()).toMatch(/^You're the one who wrote 'lettuce' on the form!/);
  });

  it('plays a bark when the panel is free, keeps 6 s of sim time between barks, and never queues', () => {
    bind('a1_m01');
    at(10);
    emit({ type: 'WaveCleared', wave: 2, bonus: 0 });
    // W2's clear: the generic wave_cleared bark (Bricks) is tried before perfect_wave.
    const jingle = bark('bricks_wave_cleared_a1_01');
    expect(shown()).toBe(jingle);
    expect(cue()).toBeNull(); // standalone, never a reply (D061)
    vi.advanceTimersByTime(hold(jingle));
    expect(shown()).toBeNull();
    // A big bank as W3's build phase opens, within 6 s of sim time: dropped, not queued.
    b.state.credits = BANK_NUDGE_CREDITS;
    at(14);
    emit(countdown(3));
    vi.advanceTimersByTime(hold(lines('a1_m01_w03')[0]!));
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
    expect(shown()).toBeNull(); // the wave-cleared bark never played late
  });

  it('queues the first leak behind a bark just before it, never dropping it', () => {
    bind('a1_m01');
    b.state.credits = BANK_NUDGE_CREDITS;
    at(8);
    emit(countdown(2)); // the nudge
    at(10);
    emit(leak(1));
    expect(shown()).toMatch(/^Unspent budget detected!/);
    vi.advanceTimersByTime(hold(shown()!));
    expect(shown()).toBe(bark('quill_first_leak_a1_01'));
  });

  it('plays the first leak once per campaign', () => {
    newGame(1);
    updateActiveSave((sv) => ({
      ...sv,
      story: { ...sv.story, seen: [...sv.story.seen, 'quill_first_leak_a1_01'] },
    }));
    bind('a1_m01');
    at(10);
    emit(leak(1));
    expect(shown()).toBeNull();
    unbind();
    unbind = noop;
    // And a battle that plays it puts it in the seen list.
    updateActiveSave((sv) => ({ ...sv, story: { ...sv.story, seen: [] } }));
    bind('a1_m01');
    emit(leak(1));
    expect(shown()).toBe(bark('quill_first_leak_a1_01'));
    unbind();
    unbind = noop;
    expect(activeSave()?.story.seen).toContain('quill_first_leak_a1_01');
  });

  it("plays W1's jingle on its clear, not the perfect-wave bark", () => {
    bind('a1_m01');
    at(30);
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
    expect(shown()).toBe('(singing along) Ev-er-glow, Ev-er-glow!');
  });

  it("nudges a big bank after the countdown's radio, on its own (D061)", () => {
    bind('a1_m02');
    b.state.credits = BANK_NUDGE_CREDITS + 100;
    const pension = lines('a1_m02_w07')[0]!;
    at(100);
    emit(countdown(7));
    expect(shown()).toBe(pension);
    vi.advanceTimersByTime(hold(pension));
    // The nudge is an act-wide bark (R5): found by its trigger, whatever its id.
    const nudge = Object.values(BARKS).find((x) => x.trigger.on === 'bank_nudge');
    expect(shown()).toBe(nudge?.text);
    expect(cue()).toBeNull();
  });

  it("gives QUILL's policy suggestion its tell, and the shrug its own line", () => {
    bind('a1_m02');
    emit(countdown(3));
    expect(dialogue.comms.value?.line.portrait).toMatchObject({ expression: 'policy' });
    expect(shown()).toMatch(/\(Per policy\.\)$/);
    vi.advanceTimersByTime(hold(shown()!));
    expect(shown()).toBe('The housing block will be fine. Probably!');
    expect(dialogue.comms.value?.line.portrait?.policy).toBe(false);
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

  it('shows the briefing whole and played out while dialogue is off, up to its choice', () => {
    setDialogueEnabled(false);
    bind('a1_m01', { briefing: true });
    const view = dialogue.scene.value;
    expect(hud.briefing.value).toBe('a1_m01_brief');
    expect(view?.instant).toBe(true);
    expect(view?.ended).toBe(true);
    expect(view?.choices).toBeNull();
    expect(view?.transcript.map((l) => l.name)).toEqual([
      'QUILL',
      'Bricks',
      'QUILL',
      'Bricks',
      'Bricks',
    ]);
    // "&" reads "and" in Silkscreen (D059).
    expect(view?.transcript[0]?.text).toContain('Logistics and Lethality');
    // And nothing plays on the panel.
    dismissBriefing();
    emit(countdown(4));
    expect(shown()).toBeNull();
  });

  it('types the briefing line by line, takes the choice, and names you once', () => {
    newGame(1);
    updateActiveSave((sv) => ({
      ...sv,
      profile: { name: 'Ada', pronouns: 'they', callsign: 'thorn' },
    }));
    bind('a1_m01', { briefing: true });
    expect(dialogue.scene.value?.line?.name).toBe('QUILL');
    expect(dialogue.scene.value?.ended).toBe(false);
    for (let i = 0; i < 5; i++) advanceScene();
    expect(dialogue.scene.value?.choices?.map((c) => c.tone)).toEqual(['earnest', 'wry', 'quiet']);
    chooseOption(2);
    expect(dialogue.scene.value?.transcript.at(-1)).toMatchObject({
      speaker: 'player',
      text: '...No, Sergeant.',
    });
    expect(dialogue.scene.value?.line?.text).toMatch(/clipboard\.$/);
    advanceScene();
    expect(dialogue.scene.value?.ended).toBe(true);
    expect(hud.briefing.value).not.toBeNull(); // Clock in closes it
    dismissBriefing();
    // Bricks named you: the callsign is Sprout, and the briefing is seen.
    expect(activeSave()?.profile?.callsign).toBe('sprout');
    expect(activeSave()?.story.seen).toContain('a1_m01_brief');
    // A replay never takes back a later callsign.
    updateActiveSave((sv) => ({
      ...sv,
      profile: { name: 'Ada', pronouns: 'they', callsign: 'thorn' },
    }));
    unbind();
    bind('a1_m01', { briefing: true });
    dismissBriefing();
    expect(activeSave()?.profile?.callsign).toBe('thorn');
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

  it('holds the sim for a cue flagged pause until its last line, then puts the speed back', () => {
    bind('a1_m01');
    setSpeed(2);
    const paused: Scene = {
      ...defineScene('a1_m01_cue_test', [
        { kind: 'line', speaker: 'quill', text: 'One.' },
        { kind: 'line', speaker: 'quill', text: 'Two.' },
      ]),
      pause: true,
    };
    playScene(paused);
    expect(speed.value).toBe(0);
    expect(dialogue.scene.value?.mode).toBe('panel');
    expect(dialogue.comms.value).toBeNull();
    vi.advanceTimersByTime(60_000); // nothing moves it on by itself
    expect(dialogue.scene.value?.line?.text).toBe('One.');
    expect(speed.value).toBe(0);
    advanceScene();
    expect(speed.value).toBe(0);
    advanceScene();
    expect(dialogue.scene.value).toBeNull();
    expect(speed.value).toBe(2);
  });

  it('skips to the next choice on Esc, and a pause the player made stays', () => {
    bind('a1_m01');
    setSpeed(0);
    const survey = DEV_SCENES[0]!;
    playScene(survey);
    expect(skipScene()).toBe(true);
    expect(dialogue.scene.value?.choices).toHaveLength(3);
    // Every skipped line is in the transcript, not only the one on screen (T327).
    const skipped = survey.nodes.slice(
      0,
      survey.nodes.findIndex((n) => n.kind === 'choice'),
    );
    expect(dialogue.scene.value?.transcript.map((l) => l.text)).toEqual(
      skipped.map((n) => (n.kind === 'line' ? n.text : '')),
    );
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

  it('names the earliest attacking turret at the first clear, and Bricks minds its sale', () => {
    newGame(1);
    bind('a1_m02');
    emit(built(6, 'rivet'));
    emit(built(7, 'thumper'));
    at(20);
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
    expect(dialogue.comms.value?.line).toMatchObject({ speaker: 'bricks', point: true });
    expect(shown()).toMatch(/^That one's Denise\./);
    // Selling an untagged turret is no story; selling Denise queues Bricks behind the line.
    at(22);
    emit(sold(7));
    emit(sold(6));
    vi.advanceTimersByTime(hold(shown()!));
    expect(shown()).toBe(bark('bricks_tower_sold_a1_02'));
    unbind();
    unbind = noop;
    expect(activeSave()?.story.bricksTagIndex).toBe(1); // past Denise
  });

  it('waits for an attacking turret before the tag moment comes', () => {
    bind('a1_m02');
    emit({ type: 'WaveCleared', wave: 1, bonus: 0 });
    // No tag moment yet (an act-wide wave-clear bark may play: R5); let it finish.
    expect(shown() ?? '').not.toMatch(/Denise/);
    if (shown() !== null) vi.advanceTimersByTime(hold(shown()!));
    emit(built(3, 'thumper'));
    at(30);
    emit({ type: 'WaveCleared', wave: 2, bonus: 0 });
    expect(shown()).toMatch(/^That one's Denise\./);
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
