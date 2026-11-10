// The dialogue system in play (docs/tech/story-runtime.md; story/style-guide.md § 4–5; design/
// core-loop.md § 6.3): plays scenes and barks over the pure story runtime (story/runner.ts,
// story/barks.ts) and writes the views (ui/dialogue/state.ts) the comms panel and scenes draw.
// - **Scenes that hold input** (the briefing, a scene with a choice, a full-screen `scene_*`) play
//   one at a time. In a battle a scene other than the briefing pauses the sim (`setSpeed(0)`) and
//   puts the speed back as it ends. Lines type and wait for Next; choices wait for a pick.
// - **The comms panel** (top-left, never blocking) plays radio scenes (`w<NN>` as wave NN's
//   countdown begins), script cues, and barks, one line at a time on real-time holds (scaled by
//   the game speed, `holdAtSpeedMs`; D126). Scenes queue (going stale after COMMS_STALE_MS, and a
//   countdown's radio dropped once its wave starts); barks never queue: one that can't show now is
//   dropped (D070).
// - **Barks** are standalone (never a reply to another speaker's line; D061), picked by
//   `pickBarkOf` from the map's pools with 6 s of sim-time spacing. Two must never be lost, so they
//   queue behind the line on the panel instead (`QUEUED_BARKS`): QUILL's first-leak seed, and
//   Bricks on selling the turret he named.
// - Moments that play a map's scenes: wave NN's countdown (`<map>_wNN`), a map script cue (the
//   scene with the cue's id), Bricks's tag moment (`<map>_cue_name_tag`; story/tags.ts), and a
//   newly issued tower at the battle's start (`<map>_cue_issued_<tower>`).
// - What a scene changed (flags, the callsign) and that it was seen go into the save as it ends.
// `?test=1` turns the comms panel and in-battle scenes off unless `&dialogue=1` (the radio's rule);
// the briefing still shows, whole, at once (up to its first choice). `&fasttext=1` (tests only)
// shows every line whole and shortens the timed holds (`fastHoldMs`), for story smoke flows.
import { ENEMIES } from '../content/enemies/index.ts';
import { BANK_NUDGE_CREDITS, BANK_NUDGE_IDLE_PHASES } from '../content/rules.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { CampaignMapId } from '../content/campaign.ts';
import { SHARED_BARKS } from '../content/dialogue/barks/index.ts';
import { barksFor, BARKS, mapDialogue, SCENES } from '../content/dialogue/index.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import { isCampaignMapId, parseSceneId } from '../content/dialogue/rules.ts';
import { SPEAKER_DEFS } from '../content/dialogue/speakers.ts';
import {
  SCENE_ID,
  type Bark,
  type BarkTrigger,
  type LineNode,
  type ReplyButton,
  type Scene,
  type SpeakerId,
} from '../content/dialogue/types.ts';
import type { EnemyId, IdSpace, MapDef, TowerId } from '../content/types.ts';
import type { SaveData } from '../meta/index.ts';
import { baseStoryContext } from '../meta/story.ts';
import { isBossWave } from '../sim/index.ts';
import { TICK_HZ } from '../shared/time.ts';
import {
  campaignBarksPlayed,
  cueBark,
  newBarkState,
  pickBark,
  pickBarkOf,
  type BarkEvent,
  type BarkState,
} from '../story/barks.ts';
import { evaluateCondition, type RunContext, type StoryContext } from '../story/conditions.ts';
import {
  advance,
  NO_EFFECTS,
  pressButton,
  readThrough,
  scenePlays,
  sceneSlot,
  start,
  type DialogueCursor,
  type DialogueEffects,
} from '../story/runner.ts';
import { newTagState, tagIndexAfter, tagStep, type TagState } from '../story/tags.ts';
import { resolveText, type TextContext } from '../story/text.ts';
import {
  dialogue,
  type LineView,
  type SceneMode,
  type SceneView,
  type StagingView,
} from '../ui/dialogue/state.ts';
import { stagingLeadInMs, stagingOf } from '../ui/dialogue/staging.ts';
import { fastText, typedLength, typeMs } from '../ui/dialogue/text.ts';
import { prefersReducedMotion } from '../ui/motion.ts';
import { silkText } from '../ui/silk.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { setSpeed } from './commands.ts';
import { attemptKills } from './checkpoints.ts';
import type { Host } from './host.ts';
import { activeSave, updateActiveSave } from './save.ts';
import type { Speed } from './testHookTypes.ts';

// The bank nudge's rule (D059, T229) is content/rules.ts's, so the balance tests can check it.
export { BANK_NUDGE_CREDITS, BANK_NUDGE_IDLE_PHASES };
/**
 * Under test-only fast text (`?test=1&fasttext=1`; `setFastText`), a timed hold (a comms line, a
 * silence, a map-end line) runs at this share of its length, but no shorter than
 * FAST_TEXT_MIN_HOLD_MS (so a smoke test's polling still sees each line) unless it was shorter.
 */
export const FAST_TEXT_HOLD_SHARE = 0.4;
export const FAST_TEXT_MIN_HOLD_MS = 1500;

/** A timed hold of `ms`, shortened under fast text (FAST_TEXT_HOLD_SHARE); else `ms`. */
export function fastHoldMs(ms: number): number {
  if (!fastText()) return ms;
  return Math.min(ms, Math.max(FAST_TEXT_MIN_HOLD_MS, ms * FAST_TEXT_HOLD_SHARE));
}

/** A queued comms scene waiting longer than this (ms of real time) is dropped (D048's staleness). */
export const COMMS_STALE_MS = 15_000;
/** A line answered by the next (another speaker) holds this long once typed (D028's beat). */
export const REPLY_BEAT_MS = 2500;
/** At 2×, a comms line still stays whole on screen at least this long, in ms (D126). */
export const RADIO_MIN_READ_MS = 1500;
/** Integrity at or below this share of the maximum fires `low_integrity` (core-loop.md § 6.3). */
export const LOW_INTEGRITY_SHARE = 0.25;

let enabled = true;

/** Turns the comms panel and in-battle scenes on or off (`?test=1` turns them off; D026). */
export function setDialogueEnabled(on: boolean): void {
  enabled = on;
}

/** Whether dialogue plays (false under `?test=1` without `&dialogue=1`). */
export function dialogueEnabled(): boolean {
  return enabled;
}

/** How long a line stays readable once typed, in ms: 4 s, plus time for a long line. */
export function readMs(text: string): number {
  return 4000 + Math.max(0, text.length - 60) * 40;
}

/**
 * How long a comms line holds, in ms (its `durationSec` for a silence or a timed line): its
 * reading time, and at least REPLY_BEAT_MS once typed; just that beat when the next line answers it.
 */
export function commsHoldMs(
  text: string,
  durationSec: number | undefined,
  nextIsReply: boolean,
): number {
  if (durationSec !== undefined) return durationSec * 1000;
  // Reading starts as the line types; a short line still stays up a beat once it's whole.
  const typing = typeMs(text);
  if (nextIsReply) return typing + REPLY_BEAT_MS;
  return Math.max(readMs(text), typing + REPLY_BEAT_MS);
}

/**
 * A comms hold at game speed `gameSpeed` (D126, T430b): the radio keeps pace with the battle, so
 * at 2× each hold halves, but never below RADIO_MIN_READ_MS once the line is typed (and never
 * longer than at 1×). Paused or at 1× it holds `ms`.
 */
export function holdAtSpeedMs(ms: number, text: string, gameSpeed: number): number {
  if (gameSpeed <= 1) return ms;
  return Math.max(ms / gameSpeed, Math.min(ms, typeMs(text) + RADIO_MIN_READ_MS));
}

/** What a scene changed, applied to `save`: flags, the callsign, and (for a real scene id) seen. */
export function withSceneEffects(
  save: SaveData,
  sceneId: string,
  effects: DialogueEffects,
): SaveData {
  const record = SCENE_ID.test(sceneId) && !save.story.seen.includes(sceneId);
  const flags = Object.keys(effects.flags).length > 0;
  const callsign = effects.callsign !== null && save.profile !== null;
  if (!record && !flags && !callsign) return save;
  return {
    ...save,
    profile:
      callsign && save.profile !== null && effects.callsign !== null
        ? { ...save.profile, callsign: effects.callsign }
        : save.profile,
    story: {
      ...save.story,
      flags: flags ? { ...save.story.flags, ...effects.flags } : save.story.flags,
      seen: record ? [...save.story.seen, sceneId] : save.story.seen,
    },
  };
}

// ─── Lines ─────────────────────────────────────────────────────────────────────────────────────

/** What a line or a bark says, as a view reads it. */
interface Spoken {
  readonly speaker: SpeakerId;
  readonly expression?: string;
  readonly text: string;
  readonly durationSec?: number;
  readonly point?: 'firstTower';
  readonly button?: ReplyButton;
}

let lineSerial = 0;

/** Whether `speaker` is gone for good outside a battle's radio (Bricks after A3M3). */
function speakerGone(speaker: SpeakerId, ctx: StoryContext): boolean {
  return speaker === 'bricks' && evaluateCondition({ mapAtLeast: 'a3_m04' }, ctx);
}

/**
 * The view of line `s`: its speaker's name plate and portrait (the plate and the variant the
 * speaker's rules pick; the `dark` bake for a silence from an absent speaker), and its text with
 * tokens resolved.
 * `present`: who is on the radio (a battle), or null (anyone not gone for good).
 */
export function lineView(
  s: Spoken,
  ctx: StoryContext,
  text: TextContext,
  present: readonly SpeakerId[] | null,
): LineView {
  const def = SPEAKER_DEFS[s.speaker];
  const silence = s.text === '';
  const absent = present === null ? speakerGone(s.speaker, ctx) : !present.includes(s.speaker);
  const expression = s.expression ?? 'neutral';
  const variant = def.variants.find((r) => evaluateCondition(r.when, ctx))?.variant ?? null;
  const name = def.names?.find((r) => evaluateCondition(r.when, ctx))?.name ?? def.name;
  return {
    id: ++lineSerial,
    speaker: s.speaker,
    name,
    color: def.color,
    frame: def.frame,
    portrait:
      def.portrait === null
        ? null
        : {
            sprite: def.portrait,
            variant,
            expression,
            dark: silence && absent,
            icon: def.frame === 'icon',
            policy: expression === 'policy',
          },
    text: silence ? '' : silkText(resolveText(s.text, text)),
    silence,
    point: s.point === 'firstTower',
  };
}

// ─── The battle's story session ──────────────────────────────────────────────────────────────

/** What dialogue knows about the battle in play. */
interface Session {
  readonly map: CampaignMapId | null;
  /** Speakers on the radio: QUILL and the companion when present (style-guide § 5.5). */
  readonly present: readonly SpeakerId[];
  /** Sim seconds now. */
  simSec(): number;
  /** Skitterkin killed this run (for `{pests_processed}`): this attempt's (`attemptKills`). */
  runKills(): number;
  /**
   * A resumed run's replay (`Host.replaying`; app/checkpoints.ts): barks are still picked, so
   * their spacing and once-limits count what the replayed attempt heard, but nothing plays.
   */
  replaying(): boolean;
  readonly pool: readonly Bark[];
  barks: BarkState;
  /**
   * The Quiet Wave's silence (D098): from its start to the map's end no bark is offered but
   * Bricks's `not_firing` (the wave's own line). Scripted lines (cues, cue barks) still play.
   */
  silent: boolean;
}

/** The one trigger the Quiet Wave's silence still offers: Bricks's "...You okay, Sprout?". */
const SILENT_ZONE_TRIGGERS: ReadonlySet<BarkTrigger['on']> = new Set(['not_firing']);

/** The act-wide `wave_cleared` barks (the jingle jokes): offered only after a clean wave (D098). */
const JINGLE_BARKS: ReadonlySet<string> = new Set(
  SHARED_BARKS.filter((b) => b.trigger.on === 'wave_cleared').map((b) => b.id),
);

let session: Session | null = null;

/** The map a scene outside a battle is about: its id's map. */
function mapOfScene(sceneId: string): CampaignMapId | null {
  return parseSceneId(sceneId)?.map ?? null;
}

const NO_FLAGS: FlagSet = {};

/**
 * The run whose end is on screen (T329): set by the run's end (app/runResult.ts `endRunStory`), so
 * the scenes around Results (the results flow's full-screen scenes) read `outcome` and `thisRun`
 * as the debrief does. A new battle clears it.
 */
let storyRun: RunContext | null = null;

/** Sets (or clears) the run whose end is on screen, for the scenes around Results. */
export function setStoryRun(run: RunContext | null): void {
  storyRun = run;
}

/** The story context for `map`: the save's (meta/story.ts), plus the run's kills so far. */
function storyContext(map: CampaignMapId | null): StoryContext {
  const save = activeSave();
  const kills = session?.runKills() ?? 0;
  if (save === null) {
    return { flags: NO_FLAGS, map, pestsProcessed: kills, seen: [], run: storyRun };
  }
  return {
    ...baseStoryContext(save),
    map,
    pestsProcessed: save.stats.pestsProcessed + kills,
    run: storyRun,
  };
}

function textContext(): TextContext {
  const save = activeSave();
  return {
    profile: save?.profile ?? null,
    pestsProcessed: (save?.stats.pestsProcessed ?? 0) + (session?.runKills() ?? 0),
    evacuated: null,
  };
}

/** Writes what a scene changed into the save in play (none: nothing to write). */
function commit(sceneId: string, effects: DialogueEffects): void {
  const save = activeSave();
  if (save === null || withSceneEffects(save, sceneId, effects) === save) return;
  updateActiveSave((s) => withSceneEffects(s, sceneId, effects));
}

/** How a scene plays: full-screen (`scene_*`), a pausing panel (it has a choice), or comms. */
export function sceneMode(scene: Scene): SceneMode | 'comms' {
  const slot = sceneSlot(scene.id);
  if (slot?.kind === 'scene') return 'fullscreen';
  if (slot?.kind === 'brief') return 'briefing';
  if (scene.nodes.some((n) => n.kind === 'choice')) return 'panel';
  return 'comms';
}

// ─── Scenes that hold input ──────────────────────────────────────────────────────────────────

interface Holding {
  readonly scene: Scene;
  readonly mode: SceneMode;
  readonly map: CampaignMapId | null;
  readonly instant: boolean;
  /** The speed to put back as it ends (a battle scene other than the briefing), else null. */
  readonly resume: Speed | null;
  readonly onEnd: (() => void) | null;
  /** Whether its effects and seen id go into the save as it ends (not for the results fixture). */
  readonly record: boolean;
  cursor: DialogueCursor;
  transcript: LineView[];
  line: LineView | null;
  /** When the line on screen started typing (performance.now), and whether Next finished it. */
  typedFrom: number;
  typedOut: boolean;
  remember: string | null;
  /** A full-screen scene's staging (ui/dialogue/staging.ts): its clock and lead-in, else null. */
  staging: StagingView | null;
}

let holding: Holding | null = null;
const waiting: { scene: Scene; opts: PlayOptions }[] = [];

export interface PlayOptions {
  /** Default: `sceneMode(scene)` (a comms scene plays on the panel instead). */
  readonly mode?: SceneMode;
  /** Text shows whole (the briefing while dialogue is off). */
  readonly instant?: boolean;
  /** Runs as the scene ends (after its effects are saved). */
  readonly onEnd?: () => void;
  /** Default true; false: nothing it does is saved (the results fixture, `__sd.results`). */
  readonly record?: boolean;
  /** A countdown's radio (`w<NN>`): the wave it's for, dropped unplayed once that wave starts. */
  readonly radioWave?: number;
}

/** How long a silence holds when its line names no `durationSec`, in seconds. */
export const SILENCE_SEC = 2;

/**
 * Whether the line on screen moves on by itself (D098): a silence in a full-screen scene holds
 * for its `durationSec` and goes on, with no Next to press (Skip and Esc still work).
 */
export function advancesItself(
  mode: SceneMode,
  line: Pick<LineView, 'silence'> | null,
  instant: boolean,
): boolean {
  return mode === 'fullscreen' && line !== null && line.silence && !instant;
}

let silenceTimer: ReturnType<typeof setTimeout> | null = null;

function clearSilence(): void {
  if (silenceTimer !== null) clearTimeout(silenceTimer);
  silenceTimer = null;
}

/**
 * Times the silence on screen (`advancesItself`): it moves on `durationSec` after it shows (after
 * a staged lead-in, when one holds it back). Re-armed on every publish of the same line.
 */
function armSilence(h: Holding): void {
  clearSilence();
  const line = h.line;
  const step = h.cursor.step;
  if (!advancesItself(h.mode, line, h.instant) || step.kind !== 'line') return;
  const wait =
    Math.max(0, h.typedFrom - performance.now()) +
    fastHoldMs((step.node.durationSec ?? SILENCE_SEC) * 1000);
  silenceTimer = setTimeout(() => {
    silenceTimer = null;
    if (holding === h && h.line === line) advanceScene();
  }, wait);
}

/**
 * A full-screen scene's staging as it opens (D097 R3): its kind, its clock's start (now), and how
 * long its lead-in holds the lines back. None for a panel, a briefing, or text shown whole.
 */
function openStaging(sceneId: string, mode: SceneMode, instant: boolean): StagingView | null {
  const kind = stagingOf(sceneId);
  if (kind === null || mode !== 'fullscreen' || instant) return null;
  return { kind, from: performance.now(), leadInMs: stagingLeadInMs(kind, reducedMotion()) };
}

/** The reduced-motion preference (none outside a browser: the unit tests). */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && prefersReducedMotion();
}

/** Who is on the radio: the battle's speakers, or null outside one. */
function onRadio(): readonly SpeakerId[] | null {
  return session?.present ?? null;
}

function publish(): void {
  const h = holding;
  if (h === null) {
    clearSilence();
    dialogue.scene.value = null;
    return;
  }
  armSilence(h);
  const step = h.cursor.step;
  // Shown whole (dialogue off), a scene stops short of its first choice: nobody is there to pick.
  const stopped = h.instant && step.kind === 'choice';
  const view: SceneView = {
    sceneId: h.scene.id,
    mode: h.mode,
    transcript: [...h.transcript],
    line: h.line,
    choices:
      step.kind === 'choice' && !stopped
        ? step.node.options.map((o) => ({
            text: silkText(resolveText(o.text, textContext())),
            tone: o.tone,
          }))
        : null,
    remember: h.remember,
    ended: step.kind === 'end' || stopped,
    instant: h.instant,
    typing: { from: h.typedFrom, done: h.typedOut },
    staging: h.staging,
  };
  dialogue.scene.value = view;
}

/** Rests the scene on its cursor: a line becomes the line on screen (all lines, when instant). */
function settle(h: Holding): void {
  const ctx = storyContext(h.map);
  h.line = null;
  for (;;) {
    const step = h.cursor.step;
    if (step.kind !== 'line') break;
    const view = lineView(step.node, ctx, textContext(), onRadio());
    if (!h.instant) {
      h.line = view;
      h.typedFrom = performance.now();
      h.typedOut = fastText() || reducedMotion() || typedLength(view.text) === 0;
      break;
    }
    h.transcript.push(view);
    h.cursor = advance(h.scene, h.cursor, ctx);
  }
}

function open(scene: Scene, opts: PlayOptions, mode: SceneMode): void {
  const map = session?.map ?? mapOfScene(scene.id);
  const inBattle = session !== null && screen.value === 'battle';
  const resume = mode !== 'briefing' && inBattle ? speed.value : null;
  if (resume !== null) setSpeed(0);
  holdComms(true);
  const h: Holding = {
    scene,
    mode,
    map,
    instant: opts.instant ?? false,
    resume,
    onEnd: opts.onEnd ?? null,
    record: opts.record ?? true,
    cursor: start(scene, storyContext(map)),
    transcript: [],
    line: null,
    typedFrom: 0,
    typedOut: false,
    remember: null,
    staging: openStaging(scene.id, mode, opts.instant ?? false),
  };
  holding = h;
  settle(h);
  // A staged lead-in (the stinger's feed) holds the first line back: it types once it ends.
  if (h.staging !== null && h.line !== null) {
    h.typedFrom = Math.max(h.typedFrom, h.staging.from + h.staging.leadInMs);
  }
  if (h.cursor.step.kind === 'end' && mode !== 'briefing') {
    finish();
    return;
  }
  publish();
}

/** Ends the scene holding input: saves its effects, puts the speed back, plays the next. */
function finish(): void {
  const h = holding;
  if (h === null) return;
  holding = null;
  clearSilence();
  if (h.record) commit(h.scene.id, h.cursor.effects);
  if (h.resume !== null && session !== null && speed.value === 0) setSpeed(h.resume);
  dialogue.scene.value = null;
  h.onEnd?.();
  const next = waiting.shift();
  if (next !== undefined) {
    playScene(next.scene, next.opts);
  } else {
    holdComms(false);
  }
}

/**
 * Plays `scene`: one that holds input opens now (or after the one on screen), a comms scene
 * queues on the panel. Comms scenes (and scenes in a battle) don't play while dialogue is off.
 */
export function playScene(scene: Scene, opts: PlayOptions = {}): void {
  const mode = opts.mode ?? sceneMode(scene);
  if (mode === 'comms') {
    queueComms(scene, opts.radioWave ?? 0);
    return;
  }
  if (holding !== null) {
    waiting.push({ scene, opts: { ...opts, mode } });
    return;
  }
  open(scene, opts, mode);
}

/**
 * Next (a click, Enter, or Space): finishes the typing of the line on screen, else moves past it
 * (or closes a scene that has played out). Judged on the scene's own clock, so presses faster
 * than the screen redraws still land one step each.
 */
export function nextScene(): void {
  const h = holding;
  if (h === null) return;
  // During a staged lead-in, Skip cuts to its end: the staging jumps on, and the line types now.
  const now = performance.now();
  if (h.staging !== null && now < h.staging.from + h.staging.leadInMs) {
    h.staging = { ...h.staging, from: now - h.staging.leadInMs };
    h.typedFrom = now;
    publish();
    return;
  }
  if (h.line !== null && !h.typedOut && performance.now() - h.typedFrom < typeMs(h.line.text)) {
    h.typedOut = true;
    publish();
    return;
  }
  if (h.line !== null) advanceScene();
  else closeScene();
}

/** Moves past the line on screen (typed or not). */
export function advanceScene(): void {
  const h = holding;
  if (h === null || h.cursor.step.kind !== 'line') return;
  if (h.line !== null) h.transcript.push(h.line);
  h.remember = null;
  h.cursor = advance(h.scene, h.cursor, storyContext(h.map));
  settle(h);
  if (h.cursor.step.kind === 'end' && h.mode !== 'briefing') {
    finish();
    return;
  }
  publish();
}

/** Takes option `index` at the choice on screen. */
export function chooseOption(index: number): void {
  const h = holding;
  if (h === null || h.cursor.step.kind !== 'choice') return;
  const option = h.cursor.step.node.options[index];
  if (option === undefined) return;
  const ctx = storyContext(h.map);
  // The pick joins the transcript as the player's own line.
  h.transcript.push(lineView({ speaker: 'player', text: option.text }, ctx, textContext(), null));
  h.cursor = advance(h.scene, h.cursor, ctx, index);
  h.remember =
    option.remember === undefined
      ? null
      : `${SPEAKER_DEFS[option.remember].name} will remember that.`;
  settle(h);
  if (h.cursor.step.kind === 'end' && h.mode !== 'briefing') {
    // A choice that ends the scene still shows its "will remember" before it closes.
    if (h.remember === null) {
      finish();
      return;
    }
  }
  publish();
}

/**
 * Esc on a scene: skips its lines up to the next choice (which still waits), or to the end. The
 * briefing isn't this one's: Esc clocks in there (D040). Returns whether a scene took the key.
 */
export function skipScene(): boolean {
  const h = holding;
  if (h === null || h.mode === 'briefing') return false;
  const ctx = storyContext(h.map);
  // Every skipped line joins the transcript (T327), not only the one on screen.
  while (h.cursor.step.kind === 'line') {
    h.transcript.push(h.line ?? lineView(h.cursor.step.node, ctx, textContext(), onRadio()));
    h.cursor = advance(h.scene, h.cursor, ctx);
    h.line = null;
  }
  if (h.cursor.step.kind === 'end') {
    finish();
    return true;
  }
  h.remember = null;
  settle(h);
  publish();
  return true;
}

/** Closes a scene that has played out but still shows (a choice's "will remember" at the end). */
export function closeScene(): void {
  const h = holding;
  if (h !== null && h.mode !== 'briefing' && h.cursor.step.kind === 'end') finish();
}

// ─── The comms panel ─────────────────────────────────────────────────────────────────────────

interface CommsPlay {
  readonly scene: Scene;
  cursor: DialogueCursor;
  prev: LineView | null;
  button: ReplyButton | null;
  /** The line on screen: when it showed (performance.now), and what moves past it. */
  shownAt?: number;
  moveOn?: () => void;
}

/** Queued comms scenes: when each queued, and the wave a countdown's radio is for (else 0). */
const commsQueue: { scene: Scene; at: number; wave: number }[] = [];
let commsNow: CommsPlay | null = null;
let commsTimer: ReturnType<typeof setTimeout> | null = null;
/** Set while a scene holds input: the panel waits (its queue's clocks restart as it frees). */
let commsHeld = false;
/** Runs when the panel next goes idle (the bank nudge's "after the countdown's radio"). */
let onIdle: (() => void) | null = null;
/**
 * The map has ended and the results hold waits for the panel (`playMapEndLines`): every line
 * from now on holds `endLineMs` (its typing and a beat), not its reading time.
 */
let commsEnding = false;

function clearCommsTimer(): void {
  if (commsTimer !== null) clearTimeout(commsTimer);
  commsTimer = null;
}

function holdComms(on: boolean): void {
  commsHeld = on;
  if (on) {
    // The line on screen goes; a scene that was playing is cut, never replayed.
    clearCommsTimer();
    commsNow = null;
    dialogue.comms.value = null;
    return;
  }
  const now = performance.now();
  for (let i = 0; i < commsQueue.length; i++) {
    const q = commsQueue[i];
    if (q !== undefined) commsQueue[i] = { ...q, at: now };
  }
  pumpComms();
}

function queueComms(scene: Scene, wave = 0): void {
  if (!enabled) return;
  commsQueue.push({ scene, at: performance.now(), wave });
  pumpComms();
}

/**
 * Wave `wave` has started (D126): a countdown's radio still queued for it (or an earlier wave) is
 * dropped unplayed, so it never talks over the wave it was setting up. A scene already on the
 * panel plays on.
 */
function dropRadioFor(wave: number): void {
  for (let i = commsQueue.length - 1; i >= 0; i--) {
    const w = commsQueue[i]?.wave ?? 0;
    if (w > 0 && w <= wave) commsQueue.splice(i, 1);
  }
}

function pumpComms(): void {
  if (commsHeld || commsNow !== null) return;
  const now = performance.now();
  let next = commsQueue.shift();
  while (next !== undefined && now - next.at > COMMS_STALE_MS) next = commsQueue.shift();
  if (next === undefined) {
    dialogue.comms.value = null;
    const idle = onIdle;
    onIdle = null;
    idle?.();
    return;
  }
  const map = session?.map ?? mapOfScene(next.scene.id);
  commsNow = {
    scene: next.scene,
    cursor: start(next.scene, storyContext(map)),
    prev: null,
    button: null,
  };
  showCommsLine();
}

/** Shows the comms scene's current line and schedules the next. */
function showCommsLine(): void {
  const c = commsNow;
  if (c === null) return;
  const step = c.cursor.step;
  const map = session?.map ?? mapOfScene(c.scene.id);
  const ctx = storyContext(map);
  if (step.kind !== 'line') {
    // Played out (a choice can't wait on the panel: sceneMode sends those to a panel scene).
    commsNow = null;
    commit(c.scene.id, c.cursor.effects);
    pumpComms();
    return;
  }
  const node = step.node;
  const view = lineView(node, ctx, textContext(), onRadio());
  const cue = c.prev !== null && c.prev.speaker !== view.speaker ? c.prev : null;
  c.button = node.button ?? null;
  dialogue.comms.value = {
    line: view,
    cue,
    button: c.button === null ? null : silkText(c.button.label),
  };
  const next = advance(c.scene, c.cursor, ctx);
  const reply = next.step.kind === 'line' && next.step.node.speaker !== node.speaker;
  const moveOn = (): void => {
    commsTimer = null;
    if (commsNow !== c || c.moveOn !== moveOn) return;
    c.prev = view;
    c.cursor = next;
    showCommsLine();
  };
  c.shownAt = performance.now();
  c.moveOn = moveOn;
  clearCommsTimer();
  commsTimer = setTimeout(
    moveOn,
    commsEnding
      ? endHoldMs(node)
      : fastHoldMs(
          holdAtSpeedMs(commsHoldMs(view.text, node.durationSec, reply), view.text, speed.value),
        ),
  );
}

/** The scenes `barkScene` made: a bark on the panel, as opposed to a scene's line. */
const barkScenes = new WeakSet<Scene>();

/** A bark on the panel: its own one-line scene, never under another line (D061). */
function barkScene(b: Bark): Scene {
  const scene: Scene = { id: b.id, nodes: [{ ...b, kind: 'line' as const }] };
  barkScenes.add(scene);
  return scene;
}

function showBark(b: Bark): void {
  clearCommsTimer();
  const scene = barkScene(b);
  commsNow = {
    scene,
    cursor: start(scene, storyContext(session?.map ?? null)),
    prev: null,
    button: null,
  };
  showCommsLine();
}

/** The comms panel's reply button: applies its flags, and plays its reply now. */
export function pressCommsButton(): void {
  const c = commsNow;
  if (c === null || c.button === null) return;
  const { flags, reply } = pressButton(c.button);
  c.button = null;
  const view = dialogue.comms.value;
  if (view !== null) dialogue.comms.value = { ...view, button: null };
  commit(c.scene.id, { ...NO_EFFECTS, flags });
  const scene = reply === null ? undefined : (SCENES[reply] ?? devScene(reply));
  if (scene === undefined) return;
  if (sceneMode(scene) !== 'comms') {
    playScene(scene);
    return;
  }
  clearCommsTimer();
  commsNow = {
    scene,
    cursor: start(scene, storyContext(session?.map ?? null)),
    prev: null,
    button: null,
  };
  showCommsLine();
}

/** A map-end line holds this long once typed (the results hold's lines; D098). */
export const END_LINE_BEAT_MS = 2000;

/** How long a map-end line holds on the panel, in ms: its typing, then END_LINE_BEAT_MS. */
export function endLineMs(text: string): number {
  return typeMs(text) + END_LINE_BEAT_MS;
}

/**
 * How long a line holds on the panel once the map has ended: its `durationSec`, else `endLineMs`
 * (shortened under fast text).
 */
function endHoldMs(node: Pick<LineNode, 'text' | 'durationSec'>): number {
  return fastHoldMs(
    node.durationSec !== undefined ? node.durationSec * 1000 : endLineMs(node.text),
  );
}

/**
 * As the map ends, what the comms panel was given before it ended finishes (T413: A2M2's
 * retreat line, cued moments before the win): the line on screen holds just past its typing
 * (`endLineMs` from when it showed), and every line after it in its scene and the queue holds
 * `endLineMs`. A bark on screen with nothing behind it is left alone (it doesn't hold Results).
 * Returns how long that takes in ms (0: nothing to wait for).
 */
function finishComms(): number {
  const now = performance.now();
  const queued = commsQueue.filter((q) => now - q.at <= COMMS_STALE_MS);
  const c = commsNow;
  const lineOnScreen = c !== null && c.cursor.step.kind === 'line' ? c.cursor.step.node : null;
  if (queued.length === 0 && (c === null || lineOnScreen === null || barkScenes.has(c.scene))) {
    return 0;
  }
  commsEnding = true;
  const ctx = storyContext(session?.map ?? null);
  let ms = 0;
  if (c !== null && lineOnScreen !== null && c.moveOn !== undefined) {
    // The line on screen: what's left of its typing and beat, then the rest of its scene.
    const left = Math.max(0, (c.shownAt ?? now) + endHoldMs(lineOnScreen) - now);
    clearCommsTimer();
    commsTimer = setTimeout(c.moveOn, left);
    ms += left;
    let cursor = advance(c.scene, c.cursor, ctx);
    while (cursor.step.kind === 'line') {
      ms += endHoldMs(cursor.step.node);
      cursor = advance(c.scene, cursor, ctx);
    }
  }
  for (const q of queued) {
    for (const l of readThrough(q.scene, ctx).lines) ms += endHoldMs(l);
  }
  return ms;
}

/**
 * The comms panel as the map ends, over the frozen battle; returns how long the results hold
 * should wait for it, in ms (0 when dialogue is off or outside a battle):
 * - with `lines` (a won map's `debriefOnHold`, D098: A1M5's C1 reaction lands before the party),
 *   plays them now, cutting whatever the panel shows, each held `endLineMs`;
 * - else, on a win, lets what the panel was given before the map ended finish (`finishComms`).
 */
export function playMapEndLines(
  lines: readonly LineNode[],
  outcome: 'won' | 'lost' = 'won',
): number {
  if (!enabled || session === null || commsHeld) return 0;
  if (lines.length === 0) return outcome === 'won' ? finishComms() : 0;
  const nodes = lines.map((l) => ({ ...l, durationSec: endLineMs(l.text) / 1000 }));
  // Not a scene id (SCENE_ID), so nothing is saved as seen: the card's debrief keeps the lines.
  const scene: Scene = { id: 'map_end', nodes };
  clearCommsTimer();
  commsQueue.length = 0;
  onIdle = null;
  commsNow = {
    scene,
    cursor: start(scene, storyContext(session.map)),
    prev: null,
    button: null,
  };
  showCommsLine();
  return lines.reduce((ms, l) => ms + fastHoldMs(endLineMs(l.text)), 0);
}

// ─── Barks ───────────────────────────────────────────────────────────────────────────────────

/**
 * Offers one moment's triggers to the bark pools (`pickBarkOf`; `pool` defaults to the map's).
 * Nothing plays over a line on the panel or a scene, and nothing waits: the triggers still count
 * as fired. A queued trigger's bark (`isQueuedTrigger`) queues first, so the moment's other
 * triggers find the panel busy. In the Quiet Wave's silence only its own trigger is offered.
 */
function offerBarks(offered: readonly BarkTrigger[], pool?: readonly Bark[]): void {
  const s = session;
  if (s === null || !enabled) return;
  const all = s.silent ? offered.filter((t) => SILENT_ZONE_TRIGGERS.has(t.on)) : offered;
  for (const t of all) if (isQueuedTrigger(t)) queueBark(t);
  const triggers = all.filter((t) => !isQueuedTrigger(t));
  if (triggers.length === 0) return;
  const atSec = s.simSec();
  const events: BarkEvent[] = triggers.map((trigger) => ({ trigger, atSec, present: s.present }));
  const busy = commsNow !== null || commsHeld || commsQueue.length > 0;
  const pick = pickBarkOf(busy ? [] : (pool ?? s.pool), events, s.barks, storyContext(s.map));
  s.barks = pick.state;
  if (pick.bark !== null && !s.replaying()) showBark(pick.bark);
}

/**
 * Whether a trigger's bark queues behind the line on the panel instead of dropping: the battle's
 * first leak (QUILL's "Toward... the wilderness?", a fair-play seed) and selling the turret Bricks
 * named. Their pick ignores the 6 s spacing (later barks keep theirs from it), but not the bark's
 * `when`, presence, or once limits.
 */
export function isQueuedTrigger(t: BarkTrigger): boolean {
  return t.on === 'first_leak' || (t.on === 'tower_sold' && t.tagged === true);
}

/** Picks a queued trigger's bark (`isQueuedTrigger`) and queues it on the panel. */
function queueBark(trigger: BarkTrigger): void {
  const s = session;
  if (s === null || !enabled) return;
  const atSec = s.simSec();
  const event: BarkEvent = { trigger, atSec, present: s.present };
  const free = { ...s.barks, lastAtSec: null };
  const pick = pickBark(s.pool, event, free, storyContext(s.map));
  s.barks = pick.bark === null ? { ...pick.state, lastAtSec: s.barks.lastAtSec } : pick.state;
  if (pick.bark !== null && !s.replaying()) queueComms(barkScene(pick.bark));
}

/** A bark a map script names: it plays whatever the spacing says, after the line on screen. */
function playCueBark(b: Bark): void {
  const s = session;
  if (s === null || !enabled) return;
  s.barks = cueBark(b, s.simSec(), s.barks);
  if (!s.replaying()) queueComms(barkScene(b));
}

// ─── Wiring a battle ─────────────────────────────────────────────────────────────────────────

const isEnemy = (id: string): id is EnemyId => Object.hasOwn(ENEMIES, id);
const isTower = (id: string): id is TowerId => Object.hasOwn(TOWERS, id);

/** Who is on the radio on `map`: QUILL and a present companion (style-guide § 5.5). */
export function presentSpeakers(map: Pick<MapDef<IdSpace>, 'companion'>): SpeakerId[] {
  const out: SpeakerId[] = ['quill'];
  const c = map.companion;
  if (c !== null && 'id' in c && c.state === 'present') {
    const id = c.id === 'bramble' ? 'chitterbloom' : c.id;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** The briefing scene of `map` (`<map>_brief`), or null when it has none. */
export function briefingScene(map: { readonly id: string }): Scene | null {
  return SCENES[`${map.id}_brief`] ?? null;
}

export interface DialogueOptions {
  /** Open the map's briefing over the battle (a fresh start, not a retry). */
  readonly briefing: boolean;
  /** The loadout's newly issued towers (meta/hints.ts): `tower_issued` once the briefing closes. */
  readonly newTowers: readonly string[];
}

/**
 * Wires a battle's dialogue: the briefing, the radio scenes, cues, and barks. Returns the
 * unwiring (it clears the panel and any battle scene, and saves the once-per-campaign barks).
 */
export function bindDialogue(host: Host<IdSpace>, opts: DialogueOptions): () => void {
  const { sim, bus } = host;
  const mapDef = sim.map;
  const map = isCampaignMapId(mapDef.id) ? mapDef.id : null;
  const own = map === null ? { scenes: [] } : mapDialogue(map);
  /** Radio scenes by the countdown that plays them (`<map>_wNN` → NN). */
  const radio = new Map<number, Scene>();
  for (const scene of own.scenes) {
    const slot = sceneSlot(scene.id);
    if (slot?.kind === 'radio') radio.set(slot.wave, scene);
  }
  const s: Session = {
    map,
    present: presentSpeakers(mapDef),
    simSec: () => sim.state.tick / TICK_HZ,
    runKills: () => attemptKills(host),
    replaying: () => host.replaying,
    pool: map === null ? [] : barksFor(map),
    barks: newBarkState(sim.config.seed),
    silent: false,
  };
  /** The map's pool after a wave that leaked: no jingle jokes (D098). */
  const leakyPool = s.pool.filter((b) => !JINGLE_BARKS.has(b.id));
  // Per wave (index = wave − 1): a Quiet Wave (any group tagged `quiet_wave`), a boss wave.
  const quiet = sim.map.waves.map((w) => w.groups.some((g) => g.tags.includes('quiet_wave')));
  const boss = sim.map.waves.map(isBossWave);
  /** A boss wave's `wave_start` and `wave_cleared` say so (`boss: true`; D098). */
  const bossOf = (w: number): { boss?: true } => (boss[w - 1] === true ? { boss: true } : {});
  session = s;
  storyRun = null;
  dialogue.comms.value = null;
  commsQueue.length = 0;
  commsNow = null;
  commsEnding = false;
  onIdle = null;

  const save = activeSave();
  const met = new Set<string>(save?.campaign.seenEnemies ?? []);
  const waveOf = new Map<number, number>();
  const towerOf = new Map<number, string>();
  const leakedWaves = new Set<number>();
  const leakedEnemies = new Set<string>();
  let tags: TagState | null = map === null ? null : newTagState(map);
  let tagGiven = false;
  let leaked = false;
  let lowFired = false;
  /** Cue scenes this battle has played (a cue scene plays once a battle). */
  const cuedScenes = new Set<string>();
  /** The run's fleeing kills already offered as `skitterkin_killed_ahead` (the sim's tagKilled). */
  let fleeingKilled = 0;
  let wave = 0;

  /** Plays the map's scene `<map>_<slot>` if it has one and its `when` holds. */
  const playSlot = (slot: string): void => {
    const scene = map === null ? undefined : SCENES[`${map}_${slot}`];
    if (scene === undefined || !enabled || host.replaying) return;
    if (!scenePlays(scene, storyContext(map))) return;
    playScene(scene);
  };

  /** Steps Bricks's name tag past a sim event; returns whether a tagged turret was just sold. */
  const stepTags = (e: Parameters<typeof tagStep>[1]): boolean => {
    if (tags === null) return false;
    const step = tagStep(tags, e);
    tags = step.state;
    let sold = false;
    for (const fx of step.effects) {
      if (fx.kind === 'untagged' && fx.reason === 'sold') sold = true;
      // The plate over the tagged turret (T431): render draws `hud.nameTag` (BattleScene).
      if (fx.kind === 'untagged' && hud.nameTag.value?.uid === fx.uid) hud.nameTag.value = null;
      if (fx.kind === 'tagged') {
        hud.nameTag.value = { uid: fx.uid, text: resolveText(fx.name, textContext()) };
      }
      if (fx.kind === 'tagged' && !tagGiven) {
        tagGiven = true;
        playSlot('cue_name_tag');
      }
    }
    return sold;
  };

  // The start: newly issued towers' scenes, then map_start, the entry flag barks, and
  // tower_issued (first, so its bark wins the moment), once the briefing closes.
  const begin = (): void => {
    const triggers: BarkTrigger[] = [];
    for (const t of opts.newTowers) {
      playSlot(`cue_issued_${t}`);
      if (isTower(t)) triggers.push({ on: 'tower_issued', tower: t });
    }
    triggers.push({ on: 'map_start' }, { on: 'flag' });
    offerBarks(triggers);
  };
  let begun = false;
  const brief = opts.briefing ? briefingScene(mapDef) : null;
  hud.briefing.value = brief === null ? null : brief.id;
  // Subscribing runs this at once: with no briefing, the start plays now.
  const offBriefing = hud.briefing.subscribe((b) => {
    if (b !== null) return;
    if (holding?.mode === 'briefing') finish();
    if (!begun) {
      begun = true;
      begin();
    }
  });
  if (brief !== null) playScene(brief, { mode: 'briefing', instant: !enabled });

  /** The loadout's cheapest tower to build (a tier 1), for the idle nudge (T229). */
  const cheapest = Math.min(
    ...sim.config.loadout.map((t) => sim.config.content.towers[t]?.tiers[0].cost ?? Infinity),
  );
  /** Build phases opened since the last purchase. */
  let idlePhases = 0;
  const purchased = (): void => {
    idlePhases = 0;
  };
  /**
   * Whether the bank calls for the nudge (D059, T229): BANK_NUDGE_CREDITS banked, or, after
   * BANK_NUDGE_IDLE_PHASES build phases with no purchase, enough for the cheapest tower.
   */
  const bankWants = (idle: boolean): boolean =>
    sim.state.credits >= BANK_NUDGE_CREDITS || (idle && sim.state.credits >= cheapest);
  /** The bank nudge waits for the countdown's radio to finish, within the same build phase. */
  const nudge = (forWave: number, idle: boolean): void => {
    const fire = (): void => {
      if (wave >= forWave || !bankWants(idle)) return;
      offerBarks([{ on: 'bank_nudge' }]);
    };
    if (commsNow === null && commsQueue.length === 0 && !commsHeld) fire();
    else onIdle = fire;
  };

  const offs = [
    bus.on('CountdownStarted', (e) => {
      const scene = radio.get(e.wave);
      radio.delete(e.wave);
      // A resumed run's replay plays no scene (app/checkpoints.ts): its lines were heard already.
      const plays = scene !== undefined && enabled && !host.replaying;
      if (plays && scenePlays(scene, storyContext(map))) playScene(scene, { radioWave: e.wave });
      // Never before the Quiet Wave (D098): its countdown is the held breath.
      const quietNext = quiet[e.wave - 1] === true;
      const idle = idlePhases >= BANK_NUDGE_IDLE_PHASES;
      idlePhases++;
      if (e.wave >= 2 && !quietNext && bankWants(idle)) nudge(e.wave, idle);
    }),
    bus.on('WaveStarted', (e) => {
      wave = Math.max(wave, e.wave);
      dropRadioFor(e.wave);
      // The Quiet Wave's silence starts with it (before its first spawn) and lasts the map.
      if (quiet[e.wave - 1] === true) s.silent = true;
      offerBarks([{ on: 'wave_start', wave: e.wave, ...bossOf(e.wave) }]);
    }),
    bus.on('WaveCleared', (e) => {
      stepTags(e);
      const triggers: BarkTrigger[] = [{ on: 'wave_cleared', wave: e.wave, ...bossOf(e.wave) }];
      const clean = !leakedWaves.has(e.wave);
      if (clean) triggers.push({ on: 'perfect_wave' });
      offerBarks(triggers, clean ? s.pool : leakyPool);
    }),
    bus.on('EnemySpawned', (e) => {
      waveOf.set(e.uid, e.wave);
      if (met.has(e.enemy)) return;
      met.add(e.enemy);
      if (isEnemy(e.enemy)) offerBarks([{ on: 'new_enemy', enemy: e.enemy }]);
    }),
    bus.on('EnemyDied', (e) => {
      waveOf.delete(e.uid);
      const triggers: BarkTrigger[] = isEnemy(e.enemy)
        ? [{ on: 'enemy_killed', enemy: e.enemy }]
        : [];
      // A kill of a runner fleeing the Hollow (core-loop.md § 6.3): the run's fleeing kill count
      // moved since the last one offered (the event doesn't carry its unit's wave tags).
      const killed = sim.state.stats.tagKilled.fleeing;
      if (killed > fleeingKilled) {
        fleeingKilled = killed;
        triggers.push({ on: 'skitterkin_killed_ahead' });
      }
      offerBarks(triggers);
    }),
    // A Hollow unit hushed a fleeing Skitterkin (enemies.md § 5.4; the bark's once-per-map limit).
    bus.on('Hushed', (e) => {
      if (e.victimEnemy !== null) offerBarks([{ on: 'skitterkin_hushed' }]);
    }),
    bus.on('EnemyLeaked', (e) => {
      const w = waveOf.get(e.uid);
      if (w !== undefined) leakedWaves.add(w);
      waveOf.delete(e.uid);
      const triggers: BarkTrigger[] = [];
      if (!leaked) {
        leaked = true;
        triggers.push({ on: 'first_leak' });
      }
      if (!leakedEnemies.has(e.enemy)) {
        leakedEnemies.add(e.enemy);
        if (isEnemy(e.enemy)) triggers.push({ on: 'enemy_leaked', enemy: e.enemy });
      }
      const st = sim.state;
      if (!lowFired && st.integrity > 0 && st.integrity <= st.maxIntegrity * LOW_INTEGRITY_SHARE) {
        lowFired = true;
        triggers.push({ on: 'low_integrity' });
      }
      offerBarks(triggers);
    }),
    bus.on('TowerUpgraded', purchased),
    bus.on('TowerSpecialized', purchased),
    bus.on('TowerBuilt', (e) => {
      purchased();
      towerOf.set(e.uid, e.tower);
      stepTags(e);
      offerBarks([
        isTower(e.tower) ? { on: 'tower_built', tower: e.tower } : { on: 'tower_built' },
      ]);
    }),
    bus.on('TowerSold', (e) => {
      const t = towerOf.get(e.uid);
      towerOf.delete(e.uid);
      const tagged = stepTags(e) ? { tagged: true } : {};
      const tower = t !== undefined && isTower(t) ? { tower: t } : {};
      offerBarks([{ on: 'tower_sold', ...tower, ...tagged }]);
    }),
    bus.on('HoldFireChanged', (e) => {
      if (e.on) offerBarks([{ on: 'hold_fire_used' }]);
    }),
    // Per wave (T330): a line written for one wave (A1M5's W10) waits for that wave.
    bus.on('NotFiringAtSkitterkin', (e) => offerBarks([{ on: 'not_firing', wave: e.wave }])),
    bus.on('NeutralHit', () => offerBarks([{ on: 'neutral_hit' }])),
    bus.on('BossPhase', (e) => offerBarks([{ on: 'boss_phase', phase: e.phase }])),
    // A map script's cue: the scene with its id (`<map>_cue_*`, `<map>_scene_*`), or a bark.
    bus.on('ScriptCue', (e) => {
      const scene = SCENES[e.cueId];
      if (scene !== undefined) {
        // A cue scene plays once a battle, however many events cue it (A2M1's crew-log line is
        // cued by either log or by W6's countdown, whichever comes first).
        if (cuedScenes.has(scene.id)) return;
        cuedScenes.add(scene.id);
        if (enabled && !host.replaying) playScene(scene);
        return;
      }
      const bark = BARKS[e.cueId];
      if (bark !== undefined) playCueBark(bark);
    }),
  ];
  /** The save's place in Bricks's tag list after this battle (never back; story/tags.ts). */
  const tagIndex = (index: number): number =>
    map !== null && tagGiven ? tagIndexAfter(map, index) : index;
  return () => {
    for (const off of offs) off();
    offBriefing();
    // Barks that play once per campaign go into the save's seen list; a tag given moves the
    // save's place in Bricks's tag list (never back: a replay reuses its map's name).
    const played = campaignBarksPlayed(s.barks, s.pool);
    const saved = activeSave();
    const fresh = played.filter((id) => saved !== null && !saved.story.seen.includes(id));
    const moved =
      saved !== null && tagIndex(saved.story.bricksTagIndex) !== saved.story.bricksTagIndex;
    if (fresh.length > 0 || moved) {
      updateActiveSave((sv) => ({
        ...sv,
        story: {
          ...sv.story,
          seen: [...sv.story.seen, ...fresh],
          bricksTagIndex: tagIndex(sv.story.bricksTagIndex),
        },
      }));
    }
    if (session === s) session = null;
    clearCommsTimer();
    commsQueue.length = 0;
    commsNow = null;
    commsEnding = false;
    onIdle = null;
    dialogue.comms.value = null;
    // A battle's scenes end with it (none can be open as it stops, but a test may leave one).
    if (holding !== null) {
      holding = null;
      waiting.length = 0;
      clearSilence();
      dialogue.scene.value = null;
    }
    commsHeld = false;
    hud.briefing.value = null;
  };
}

// ─── Dev scenes and test hooks ───────────────────────────────────────────────────────────────

let devScenes: ReadonlyMap<string, Scene> = new Map();
let devBarks: ReadonlyMap<string, Bark> = new Map();

/** Registers dev scenes and barks for `__sd.dialogue` (ui/dialogue/dev.ts; tests only). */
export function setDevDialogue(scenes: readonly Scene[], barks: readonly Bark[]): void {
  devScenes = new Map(scenes.map((s) => [s.id, s]));
  devBarks = new Map(barks.map((b) => [b.id, b]));
}

function devScene(id: string): Scene | undefined {
  return devScenes.get(id);
}

/** `__sd.dialogue`: plays a scene or bark by id (registered or dev), and reads what shows. */
export function dialogueTestHooks(): {
  play(id: string): void;
  bark(id: string): void;
  shown(): { readonly scene: string | null; readonly comms: string | null };
} {
  return {
    play: (id) => {
      const scene = SCENES[id] ?? devScene(id);
      if (scene === undefined) throw new Error(`__sd.dialogue.play: no scene '${id}'`);
      playScene(scene);
    },
    bark: (id) => {
      const bark = BARKS[id] ?? devBarks.get(id);
      if (bark === undefined) throw new Error(`__sd.dialogue.bark: no bark '${id}'`);
      if (session === null) throw new Error('__sd.dialogue.bark: no battle is running');
      playCueBark(bark);
    },
    shown: () => ({
      scene: dialogue.scene.value?.sceneId ?? null,
      comms: dialogue.comms.value?.line.text ?? null,
    }),
  };
}
