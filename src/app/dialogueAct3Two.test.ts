// Act III part two's dialogue in play (T713): QUILL offline on A3M5 under C4 Rewrite (his lines
// skipped wherever they come, his barks silent, `system` still speaking), Purge's QUILL (the status
// bar, no `policy` tell, a silence that blinks), Sterling by remote on A3M5, Kip's `act3` from
// A3M5, Ves'thara's laugh, Gerald's status line, Bricks's dark silences on A3M4, and the A3M6
// knock-knock's reply button. The scenes are dev data shaped like the maps' (their lines are
// T721's and T722's content); the A3M4 barks are its own.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parseSceneId } from '../content/dialogue/rules.ts';
import { barksFor } from '../content/dialogue/index.ts';
import type { Bark, Scene, SpeakerId } from '../content/dialogue/types.ts';
import { SPRITES } from '../content/sprites/index.ts';
import type { SpriteDef } from '../content/sprites/types.ts';
import { PALETTES } from '../content/palettes/index.ts';
import type { IdSpace } from '../content/types.ts';
import { MemoryStore, type SaveData } from '../meta/index.ts';
import { bakeSprite } from '../render/sprites/bake.ts';
import { createSim } from '../sim/index.ts';
import { newBarkState, pickBarkOf } from '../story/barks.ts';
import type { StoryContext } from '../story/conditions.ts';
import { pickFrame } from '../ui/dialogue/portraitFrames.ts';
import { dialogue } from '../ui/dialogue/state.ts';
import { screen } from '../ui/state.ts';
import { battleConfig } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import {
  bindDialogue,
  dialogueTestHooks,
  lineView,
  nextScene,
  offlineSpeakers,
  playScene,
  pressCommsButton,
  setDevDialogue,
  setDialogueEnabled,
  skipScene,
} from './dialogue.ts';
import { createHost, type Host } from './host.ts';
import { activeSave, initSaves, loadDevSave } from './save.ts';

vi.mock('./battle.ts', () => ({
  startBattle: () => {
    throw new Error('stub: no battles here');
  },
}));
vi.mock('../render/scenes/BackdropScene.ts', () => ({ BACKDROP_SCENE_KEY: 'backdrop' }));

const noop = (): void => {};
const TEXT = { profile: null, pestsProcessed: 0, evacuated: null };

/** A story context on `map` with `flags`. */
const ctxOn = (map: StoryContext['map'], flags: StoryContext['flags'] = {}): StoryContext => ({
  flags,
  map,
  pestsProcessed: 0,
  seen: [],
  run: null,
});

/** The portrait variant `speaker`'s rules pick in `ctx`. */
const variantOf = (speaker: SpeakerId, ctx: StoryContext): string | null =>
  lineView({ speaker, text: 'Hm.' }, ctx, TEXT, null).portrait?.variant ?? null;

// A3M5-shaped scenes (the real lines are T721's): the briefing with QUILL's intel and `system`'s
// under Rewrite, a radio slot of QUILL alone, and one QUILL shares with Kip.
const BRIEF: Scene = {
  id: 'a3_m05_cue_t713_brief',
  nodes: [
    { kind: 'line', speaker: 'kip', text: 'Here. The ledger.' },
    { kind: 'line', speaker: 'quill', text: "Jammers inbound. Prim's model." },
    { kind: 'line', speaker: 'system', text: 'Threat Advisory: Auditor units inbound.' },
  ],
};
const QUILL_ONLY: Scene = {
  id: 'a3_m05_cue_t713_quill',
  nodes: [{ kind: 'line', speaker: 'quill', text: 'Directive conflict.' }],
};
const QUILL_BARK: Bark = {
  id: 'quill_cue_t713',
  speaker: 'quill',
  text: 'Directive conflict. Helping anyway.',
  trigger: { on: 'boss_phase' },
};
// A3M6's knock-knock (T722's lines): Pebble's radio line carries the button; ignored, the scene
// runs on; pressed, its reply plays (a cue scene: `<map>_w02_reply` isn't a scene id).
const KNOCK_REPLY: Scene = {
  id: 'a3_m06_cue_knock_answer',
  nodes: [
    { kind: 'line', speaker: 'pebble', text: 'Lettuce! ...Lettuce in.' },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
  ],
};
const KNOCK: Scene = {
  id: 'a3_m06_w02',
  nodes: [
    {
      kind: 'line',
      speaker: 'pebble',
      text: 'Knock knock! (squeak)',
      button: { label: "Who's there?", reply: KNOCK_REPLY.id },
    },
    { kind: 'line', speaker: 'pebble', text: "Lettuce! You're supposed to ask." },
    { kind: 'line', speaker: 'bricks', text: '', durationSec: 2 },
  ],
};

/** Dev save `after_a3m4_<choice>`, loaded. */
const c4Save = (choice: 'keep' | 'purge' | 'rewrite'): SaveData => {
  expect(loadDevSave(`after_a3m4_${choice}`)).toBe(true);
  return activeSave()!;
};
/** The comms line's speaker and text, or null. */
const comms = (): { speaker: string; text: string; dark: boolean } | null => {
  const l = dialogue.comms.value?.line;
  return l === undefined ? null : { speaker: l.speaker, text: l.text, dark: !!l.portrait?.dark };
};

describe('who is offline', () => {
  beforeEach(() => initSaves(new MemoryStore()));

  it('QUILL, on A3M5 under Rewrite only', () => {
    expect(offlineSpeakers('a3_m05', c4Save('rewrite'))).toEqual(['quill']);
    expect(offlineSpeakers('a3_m06', c4Save('rewrite'))).toEqual([]);
    expect(offlineSpeakers('a3_m04', c4Save('rewrite'))).toEqual([]);
    expect(offlineSpeakers('a3_m05', c4Save('keep'))).toEqual([]);
    expect(offlineSpeakers('a3_m05', c4Save('purge'))).toEqual([]);
    expect(offlineSpeakers(null, c4Save('rewrite'))).toEqual([]);
    expect(offlineSpeakers('a3_m05', null)).toEqual([]);
  });
});

describe('portraits and frames', () => {
  it("Purge's QUILL: the status bar, no policy tell, and a silence that blinks", () => {
    const purge = ctxOn('a3_m05', { quill_choice: 'purge' });
    const policy = lineView({ speaker: 'quill', expression: 'policy', text: 'Hm.' }, purge, TEXT, [
      'quill',
    ]);
    expect(policy.portrait).toMatchObject({ variant: 'purge', policy: false, blink: false });
    // Night Shift (the base: nobody's radio): "no line; its status bar blinks".
    const silence = lineView({ speaker: 'quill', text: '', durationSec: 2 }, purge, TEXT, null);
    expect(silence.portrait).toMatchObject({ variant: 'purge', dark: false, blink: true });
    // Keep and Rewrite: the smile, the tell, and a silence at rest.
    for (const choice of ['keep', 'rewrite'] as const) {
      const ctx = ctxOn('a3_m05', { quill_choice: choice });
      const kept = lineView({ speaker: 'quill', expression: 'policy', text: 'Hm.' }, ctx, TEXT, [
        'quill',
      ]);
      expect(kept.portrait).toMatchObject({ variant: null, policy: true });
      const still = lineView({ speaker: 'quill', text: '' }, ctx, TEXT, null);
      expect(still.portrait?.blink).toBe(false);
    }
  });

  it('the status bar has a talk frame to blink to', () => {
    const def = (SPRITES as readonly SpriteDef[]).find((s) => s.id === 'portrait.quill')!;
    const names = new Set(bakeSprite(def, PALETTES).frameNames);
    expect(pickFrame(names, 'purge', 'neutral', 'rest')).toBe('purge.neutral');
    expect(pickFrame(names, 'purge', 'neutral', 'talk')).toBe('purge.neutral_talk');
    // `purge.policy` has no gold flash: the flash phase rests on the face.
    expect(pickFrame(names, 'purge', 'policy', 'flash')).toBe('purge.policy');
  });

  it('Sterling flies Shareholder Value by remote on A3M5, and only there', () => {
    expect(variantOf('sterling', ctxOn('a3_m05'))).toBe('remote');
    expect(variantOf('sterling', ctxOn('a3_m02'))).toBeNull();
    expect(variantOf('sterling', ctxOn('a3_m06'))).toBeNull();
  });

  it("Kip's coat through A3M4; from A3M5, the pin left on the console", () => {
    expect(variantOf('kip', ctxOn('a1_m04'))).toBeNull();
    expect(variantOf('kip', ctxOn('a2_m04'))).toBe('act2');
    expect(variantOf('kip', ctxOn('a3_m04'))).toBe('act2');
    expect(variantOf('kip', ctxOn('a3_m05'))).toBe('act3');
    expect(variantOf('kip', ctxOn('a3_m06'))).toBe('act3');
  });

  it("Ves'thara's laugh is drawn in her Act III frame (Night Shift)", () => {
    const view = lineView(
      { speaker: 'vesthara', expression: 'laugh', text: '(a laugh, short, surprised)' },
      ctxOn('a3_m04'),
      TEXT,
      null,
    );
    expect(view.portrait).toMatchObject({ variant: 'touched_deep', expression: 'laugh' });
    const def = (SPRITES as readonly SpriteDef[]).find((s) => s.id === 'portrait.vesthara')!;
    const names = new Set(bakeSprite(def, PALETTES).frameNames);
    expect(pickFrame(names, 'touched_deep', 'laugh', 'rest')).toBe('touched_deep.laugh');
    expect(pickFrame(names, 'touched_deep', 'laugh', 'talk')).toBe('touched_deep.laugh_talk');
  });

  it("Gerald's status line: his icon frame, the status text style", () => {
    const view = lineView(
      { speaker: 'gerald', text: 'DELIVERY: COMPLETE.' },
      ctxOn('a3_m04'),
      TEXT,
      ['quill'],
    );
    expect(view.frame).toBe('icon');
    expect(view.portrait).toMatchObject({ sprite: 'portrait.gerald', icon: true, dark: false });
    expect(view.text).toBe('DELIVERY: COMPLETE.');
  });

  it("A3M6's knock-knock reply is a cue scene id (a `w02_reply` slot wouldn't parse)", () => {
    expect(parseSceneId(KNOCK_REPLY.id)?.slot).toEqual({ kind: 'cue', name: 'knock_answer' });
    expect(parseSceneId('a3_m06_w02_reply')).toBeNull();
  });
});

describe("A3M4's silences (Bricks absent)", () => {
  it('the map start and the first clear pick his dark silences over anything else', () => {
    const ctx = ctxOn('a3_m04', { door_choice: 'convoy' });
    const pool = barksFor('a3_m04');
    const present: SpeakerId[] = ['quill'];
    let state = newBarkState(1);
    const start = pickBarkOf(
      pool,
      [{ trigger: { on: 'map_start' }, atSec: 0, present }],
      state,
      ctx,
    );
    expect(start.bark?.id).toBe('bricks_map_start_a3_04');
    state = start.state;
    const clear = pickBarkOf(
      pool,
      [
        { trigger: { on: 'wave_cleared', wave: 1 }, atSec: 60, present },
        { trigger: { on: 'perfect_wave' }, atSec: 60, present },
      ],
      state,
      ctx,
    );
    expect(clear.bark?.id).toBe('bricks_wave_cleared_a3_04');
    // Only the first clear: the next goes to QUILL's.
    const again = pickBarkOf(
      pool,
      [
        { trigger: { on: 'wave_cleared', wave: 2 }, atSec: 120, present },
        { trigger: { on: 'perfect_wave' }, atSec: 120, present },
      ],
      clear.state,
      ctx,
    );
    expect(again.bark?.speaker).not.toBe('bricks');
  });
});

describe('in a battle', () => {
  let unbind: () => void = noop;
  let host: Host<IdSpace>;
  const bind = (map: string, save: string | null): void => {
    if (save !== null) expect(loadDevSave(save)).toBe(true);
    setDialogueEnabled(true);
    host = createHost(createSim(battleConfig(map, 1, activeSave())));
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    // The start's barks (Bricks's silence on A3M4) play out.
    vi.advanceTimersByTime(30_000);
  };
  beforeEach(() => {
    vi.useFakeTimers();
    initSaves(new MemoryStore(), () => 1_793_000_000_000);
    screen.value = 'battle';
    setSpeed(1);
    setDevDialogue([BRIEF, QUILL_ONLY, KNOCK, KNOCK_REPLY], [QUILL_BARK]);
  });
  afterEach(() => {
    unbind();
    unbind = noop;
    while (skipScene());
    setDevDialogue([], []);
    vi.useRealTimers();
    setDialogueEnabled(true);
    screen.value = null;
  });

  it("A3M4: Bricks's silence lights his frame dark as the map starts", () => {
    expect(loadDevSave('after_a3m3_convoy')).toBe(true);
    setDialogueEnabled(true);
    host = createHost(createSim(battleConfig('a3_m04', 1, activeSave())));
    unbind = bindDialogue(host, { briefing: false, newTowers: [] });
    expect(comms()).toEqual({ speaker: 'bricks', text: '', dark: true });
    vi.advanceTimersByTime(3500);
    expect(comms()).toBeNull();
  });

  it('A3M5 under Rewrite: QUILL is skipped, `system` and Kip still speak', () => {
    bind('a3_m05', 'after_a3m4_rewrite');
    playScene(BRIEF);
    expect(comms()?.speaker).toBe('kip');
    // Answered by another speaker, Kip's line holds 2.5 s once typed.
    vi.advanceTimersByTime(4000);
    expect(comms()?.speaker).toBe('system');
    vi.advanceTimersByTime(10_000);
    expect(comms()).toBeNull();
    // A scene of QUILL alone plays nothing; nor does his bark.
    playScene(QUILL_ONLY);
    expect(comms()).toBeNull();
    dialogueTestHooks().bark(QUILL_BARK.id);
    expect(comms()).toBeNull();
  });

  it('and in a scene that holds input (the briefing, a panel), too', () => {
    bind('a3_m05', 'after_a3m4_rewrite');
    playScene(BRIEF, { mode: 'panel' });
    expect(dialogue.scene.value?.line?.speaker).toBe('kip');
    nextScene();
    nextScene();
    expect(dialogue.scene.value?.line?.speaker).toBe('system');
    nextScene();
    nextScene();
    expect(dialogue.scene.value).toBeNull();
  });

  it('A3M5 under Keep (and A3M6 under Rewrite): QUILL speaks', () => {
    bind('a3_m05', 'after_a3m4_keep');
    playScene(QUILL_ONLY);
    expect(comms()?.speaker).toBe('quill');
    vi.advanceTimersByTime(10_000);
    dialogueTestHooks().bark(QUILL_BARK.id);
    expect(comms()?.text).toContain('Helping anyway');
  });

  it("A3M6's knock-knock: pressed, its reply; ignored, the scene runs on", () => {
    bind('a3_m04', 'after_a3m3_convoy');
    playScene(KNOCK);
    expect(dialogue.comms.value?.button).toBe("Who's there?");
    pressCommsButton();
    expect(comms()?.text).toContain('Lettuce in');
    expect(dialogue.comms.value?.button).toBeNull();
    vi.advanceTimersByTime(4000);
    // Bricks's dark silence closes it, then nothing.
    expect(comms()).toEqual({ speaker: 'bricks', text: '', dark: true });
    vi.advanceTimersByTime(10_000);
    expect(comms()).toBeNull();

    playScene(KNOCK);
    vi.advanceTimersByTime(5000);
    expect(comms()?.text).toContain('supposed to ask');
  });
});
