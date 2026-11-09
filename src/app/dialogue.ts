// The dialogue system in play (docs/tech/story-runtime.md; story/style-guide.md § 4–5; design/
// core-loop.md § 6.3): plays scenes and barks over the pure story runtime (story/runner.ts,
// story/barks.ts) and writes the views (ui/dialogue/state.ts) the comms panel and scenes draw.
// - **Scenes that hold input** (the briefing, a scene with a choice, a full-screen `scene_*`) play
//   one at a time. In a battle a scene other than the briefing pauses the sim (`setSpeed(0)`) and
//   puts the speed back as it ends. Lines type and wait for Next; choices wait for a pick.
// - **The comms panel** (top-left, never blocking) plays radio scenes (`w<NN>` as wave NN's
//   countdown begins), script cues, and barks, one line at a time on real-time holds. Scenes queue
//   (going stale after COMMS_STALE_MS); barks never queue: one that can't show now is dropped (D070).
// - **Barks** are standalone (never a reply to another speaker's line; D061), picked by
//   `pickBarkOf` from the map's pools with 6 s of sim-time spacing. Two must never be lost, so they
//   queue behind the line on the panel instead (`QUEUED_BARKS`): QUILL's first-leak seed, and
//   Bricks on selling the turret he named.
// - Moments that play a map's scenes: wave NN's countdown (`<map>_wNN`), a map script cue (the
//   scene with the cue's id), Bricks's tag moment (`<map>_cue_name_tag`; story/tags.ts), and a
//   newly issued tower at the battle's start (`<map>_cue_issued_<tower>`).
// - What a scene changed (flags, the callsign) and that it was seen go into the save as it ends.
// `?test=1` turns the comms panel and in-battle scenes off unless `&dialogue=1` (the radio's rule);
// the briefing still shows, whole, at once (up to its first choice).
import { ENEMIES } from '../content/enemies/index.ts';
import { TOWERS } from '../content/towers/index.ts';
import type { CampaignMapId } from '../content/campaign.ts';
import { barksFor, BARKS, mapDialogue, SCENES } from '../content/dialogue/index.ts';
import type { FlagSet } from '../content/dialogue/flags.ts';
import { isCampaignMapId, parseSceneId } from '../content/dialogue/rules.ts';
import { SPEAKER_DEFS } from '../content/dialogue/speakers.ts';
import {
  SCENE_ID,
  type Bark,
  type BarkTrigger,
  type ReplyButton,
  type Scene,
  type SpeakerId,
} from '../content/dialogue/types.ts';
import type { EnemyId, IdSpace, MapDef, TowerId } from '../content/types.ts';
import type { SaveData } from '../meta/index.ts';
import { baseStoryContext } from '../meta/story.ts';
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
import { evaluateCondition, type StoryContext } from '../story/conditions.ts';
import {
  advance,
  NO_EFFECTS,
  pressButton,
  scenePlays,
  sceneSlot,
  start,
  type DialogueCursor,
  type DialogueEffects,
} from '../story/runner.ts';
import { newTagState, tagIndexAfter, tagStep, type TagState } from '../story/tags.ts';
import { resolveText, type TextContext } from '../story/text.ts';
import { dialogue, type LineView, type SceneMode, type SceneView } from '../ui/dialogue/state.ts';
import { typedLength, typeMs } from '../ui/dialogue/text.ts';
import { prefersReducedMotion } from '../ui/motion.ts';
import { silkText } from '../ui/silk.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { setSpeed } from './commands.ts';
import type { Host } from './host.ts';
import { activeSave, updateActiveSave } from './save.ts';
import type { Speed } from './testHookTypes.ts';

/** Credits banked as a build phase opens (W2 on) that fire `bank_nudge` (D059). */
export const BANK_NUDGE_CREDITS = 250;
/** A queued comms scene waiting longer than this (ms of real time) is dropped (D048's staleness). */
export const COMMS_STALE_MS = 15_000;
/** A line answered by the next (another speaker) holds this long once typed (D028's beat). */
export const REPLY_BEAT_MS = 2500;
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
 * The view of line `s`: its speaker's plate and portrait (the variant the speaker's rules pick;
 * the `dark` bake for a silence from an absent speaker), and its text with tokens resolved.
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
  return {
    id: ++lineSerial,
    speaker: s.speaker,
    name: def.name,
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
  /** Skitterkin killed this run (for `{pests_processed}`). */
  runKills(): number;
  readonly pool: readonly Bark[];
  barks: BarkState;
}

let session: Session | null = null;

/** The map a scene outside a battle is about: its id's map. */
function mapOfScene(sceneId: string): CampaignMapId | null {
  return parseSceneId(sceneId)?.map ?? null;
}

const NO_FLAGS: FlagSet = {};

/** The story context for `map`: the save's (meta/story.ts), plus the run's kills so far. */
function storyContext(map: CampaignMapId | null): StoryContext {
  const save = activeSave();
  const kills = session?.runKills() ?? 0;
  if (save === null) {
    return { flags: NO_FLAGS, map, pestsProcessed: kills, seen: [], run: null };
  }
  return { ...baseStoryContext(save), map, pestsProcessed: save.stats.pestsProcessed + kills };
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
  cursor: DialogueCursor;
  transcript: LineView[];
  line: LineView | null;
  /** When the line on screen started typing (performance.now), and whether Next finished it. */
  typedFrom: number;
  typedOut: boolean;
  remember: string | null;
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
    dialogue.scene.value = null;
    return;
  }
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
      h.typedOut = reducedMotion() || typedLength(view.text) === 0;
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
    cursor: start(scene, storyContext(map)),
    transcript: [],
    line: null,
    typedFrom: 0,
    typedOut: false,
    remember: null,
  };
  holding = h;
  settle(h);
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
  commit(h.scene.id, h.cursor.effects);
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
    queueComms(scene);
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
  while (h.cursor.step.kind === 'line') {
    if (h.line !== null) h.transcript.push(h.line);
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
}

const commsQueue: { scene: Scene; at: number }[] = [];
let commsNow: CommsPlay | null = null;
let commsTimer: ReturnType<typeof setTimeout> | null = null;
/** Set while a scene holds input: the panel waits (its queue's clocks restart as it frees). */
let commsHeld = false;
/** Runs when the panel next goes idle (the bank nudge's "after the countdown's radio"). */
let onIdle: (() => void) | null = null;

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

function queueComms(scene: Scene): void {
  if (!enabled) return;
  commsQueue.push({ scene, at: performance.now() });
  pumpComms();
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
  clearCommsTimer();
  commsTimer = setTimeout(
    () => {
      commsTimer = null;
      if (commsNow !== c) return;
      c.prev = view;
      c.cursor = next;
      showCommsLine();
    },
    commsHoldMs(view.text, node.durationSec, reply),
  );
}

/** A bark on the panel: its own one-line scene, never under another line (D061). */
function barkScene(b: Bark): Scene {
  return { id: b.id, nodes: [{ ...b, kind: 'line' as const }] };
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

// ─── Barks ───────────────────────────────────────────────────────────────────────────────────

/**
 * Offers one moment's triggers to the bark pools (`pickBarkOf`). Nothing plays over a line on the
 * panel or a scene, and nothing waits: the triggers still count as fired. A queued trigger's bark
 * (`isQueuedTrigger`) queues first, so the moment's other triggers find the panel busy.
 */
function offerBarks(all: readonly BarkTrigger[]): void {
  const s = session;
  if (s === null || !enabled) return;
  for (const t of all) if (isQueuedTrigger(t)) queueBark(t);
  const triggers = all.filter((t) => !isQueuedTrigger(t));
  if (triggers.length === 0) return;
  const atSec = s.simSec();
  const events: BarkEvent[] = triggers.map((trigger) => ({ trigger, atSec, present: s.present }));
  const busy = commsNow !== null || commsHeld || commsQueue.length > 0;
  const pick = pickBarkOf(busy ? [] : s.pool, events, s.barks, storyContext(s.map));
  s.barks = pick.state;
  if (pick.bark !== null) showBark(pick.bark);
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
  if (pick.bark !== null) queueComms(barkScene(pick.bark));
}

/** A bark a map script names: it plays whatever the spacing says, after the line on screen. */
function playCueBark(b: Bark): void {
  const s = session;
  if (s === null || !enabled) return;
  s.barks = cueBark(b, s.simSec(), s.barks);
  queueComms(barkScene(b));
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
    runKills: () => sim.state.stats.skitterkinKilled,
    pool: map === null ? [] : barksFor(map),
    barks: newBarkState(sim.config.seed),
  };
  session = s;
  dialogue.comms.value = null;
  commsQueue.length = 0;
  commsNow = null;
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
  let wave = 0;

  /** Plays the map's scene `<map>_<slot>` if it has one and its `when` holds. */
  const playSlot = (slot: string): void => {
    const scene = map === null ? undefined : SCENES[`${map}_${slot}`];
    if (scene === undefined || !enabled || !scenePlays(scene, storyContext(map))) return;
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

  /** The bank nudge waits for the countdown's radio to finish, within the same build phase. */
  const nudge = (forWave: number): void => {
    const fire = (): void => {
      if (wave >= forWave || sim.state.credits < BANK_NUDGE_CREDITS) return;
      offerBarks([{ on: 'bank_nudge' }]);
    };
    if (commsNow === null && commsQueue.length === 0 && !commsHeld) fire();
    else onIdle = fire;
  };

  const offs = [
    bus.on('CountdownStarted', (e) => {
      const scene = radio.get(e.wave);
      radio.delete(e.wave);
      if (scene !== undefined && enabled && scenePlays(scene, storyContext(map))) playScene(scene);
      if (e.wave >= 2 && sim.state.credits >= BANK_NUDGE_CREDITS) nudge(e.wave);
    }),
    bus.on('WaveStarted', (e) => {
      wave = Math.max(wave, e.wave);
      offerBarks([{ on: 'wave_start', wave: e.wave }]);
    }),
    bus.on('WaveCleared', (e) => {
      stepTags(e);
      const triggers: BarkTrigger[] = [{ on: 'wave_cleared', wave: e.wave }];
      if (!leakedWaves.has(e.wave)) triggers.push({ on: 'perfect_wave' });
      offerBarks(triggers);
    }),
    bus.on('EnemySpawned', (e) => {
      waveOf.set(e.uid, e.wave);
      if (met.has(e.enemy)) return;
      met.add(e.enemy);
      if (isEnemy(e.enemy)) offerBarks([{ on: 'new_enemy', enemy: e.enemy }]);
    }),
    bus.on('EnemyDied', (e) => {
      waveOf.delete(e.uid);
      if (isEnemy(e.enemy)) offerBarks([{ on: 'enemy_killed', enemy: e.enemy }]);
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
    bus.on('TowerBuilt', (e) => {
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
    bus.on('NotFiringAtSkitterkin', () => offerBarks([{ on: 'not_firing' }])),
    bus.on('NeutralHit', () => offerBarks([{ on: 'neutral_hit' }])),
    bus.on('BossPhase', (e) => offerBarks([{ on: 'boss_phase', phase: e.phase }])),
    // A map script's cue: the scene with its id (`<map>_cue_*`, `<map>_scene_*`), or a bark.
    bus.on('ScriptCue', (e) => {
      const scene = SCENES[e.cueId];
      if (scene !== undefined) {
        if (enabled) playScene(scene);
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
    onIdle = null;
    dialogue.comms.value = null;
    // A battle's scenes end with it (none can be open as it stops, but a test may leave one).
    if (holding !== null) {
      holding = null;
      waiting.length = 0;
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
