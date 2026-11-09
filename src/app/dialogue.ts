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
//   `pickBarkOf` from the map's pools with 6 s of sim-time spacing.
// - What a scene changed (flags, the callsign) and that it was seen go into the save as it ends.
// Until T302c migrates content/radio/, a map with no dialogue plays its adapted radio (app/radio.ts).
// `?test=1` turns the comms panel and in-battle scenes off unless `&dialogue=1` (the radio's rule);
// the briefing still shows, whole, at once.
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
import { TICK_HZ } from '../shared/time.ts';
import type { SimEvent } from '../sim/index.ts';
import {
  campaignBarksPlayed,
  cueBark,
  newBarkState,
  pickBarkOf,
  type BarkEvent,
  type BarkState,
} from '../story/barks.ts';
import { evaluateCondition, type StoryContext } from '../story/conditions.ts';
import {
  advance,
  NO_EFFECTS,
  pressButton,
  sceneSlot,
  start,
  type DialogueCursor,
  type DialogueEffects,
} from '../story/runner.ts';
import { resolveText, type TextContext } from '../story/text.ts';
import { dialogue, type LineView, type SceneMode, type SceneView } from '../ui/dialogue/state.ts';
import { typeMs } from '../ui/dialogue/text.ts';
import { silkText } from '../ui/silk.ts';
import { hud, screen, speed } from '../ui/state.ts';
import { setSpeed } from './commands.ts';
import type { Host } from './host.ts';
import { adaptRadio, staticBriefingScene } from './radio.ts';
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
 * How long a comms line holds, in ms: typing plus reading (its `durationSec` for a silence or a
 * timed line), the reading capped at REPLY_BEAT_MS when the next line answers it.
 */
export function commsHoldMs(text: string, durationSec: number | undefined, nextIsReply: boolean): number {
  if (durationSec !== undefined) return durationSec * 1000;
  const read = readMs(text);
  return typeMs(text) + (nextIsReply ? Math.min(read, REPLY_BEAT_MS) : read);
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
  /** A `perfect_wave` bark's first wave (the adapted radio's). */
  readonly fromWave: ReadonlyMap<string, number>;
  barks: BarkState;
}

let session: Session | null = null;

/** The map a scene outside a battle is about: its id's map. */
function mapOfScene(sceneId: string): CampaignMapId | null {
  return parseSceneId(sceneId)?.map ?? null;
}

function storyContext(map: CampaignMapId | null): StoryContext {
  const save = activeSave();
  return {
    // A valid save holds only each flag's declared values (meta/validate.ts), so they're a FlagSet.
    flags: (save?.story.flags ?? {}) as FlagSet,
    map,
    pestsProcessed: (save?.stats.pestsProcessed ?? 0) + (session?.runKills() ?? 0),
    seen: save?.story.seen ?? [],
    run: null,
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
  cursor: DialogueCursor;
  transcript: LineView[];
  line: LineView | null;
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

function present(): readonly SpeakerId[] | null {
  return session?.present ?? null;
}

function publish(): void {
  const h = holding;
  if (h === null) {
    dialogue.scene.value = null;
    return;
  }
  const step = h.cursor.step;
  const view: SceneView = {
    sceneId: h.scene.id,
    mode: h.mode,
    transcript: [...h.transcript],
    line: h.line,
    choices:
      step.kind === 'choice' ? step.node.options.map((o) => ({ text: silkText(resolveText(o.text, textContext())), tone: o.tone })) : null,
    remember: h.remember,
    ended: step.kind === 'end',
    instant: h.instant,
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
    const view = lineView(step.node, ctx, textContext(), present());
    if (!h.instant) {
      h.line = view;
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

/** Next: moves past the line on screen (the UI first finishes its typing). */
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
    option.remember === undefined ? null : `${SPEAKER_DEFS[option.remember].name} will remember that.`;
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
  commsNow = { scene: next.scene, cursor: start(next.scene, storyContext(map)), prev: null, button: null };
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
  const view = lineView(node, ctx, textContext(), present());
  const cue = c.prev !== null && c.prev.speaker !== view.speaker ? c.prev : null;
  c.button = node.button ?? null;
  dialogue.comms.value = { line: view, cue, button: c.button === null ? null : silkText(c.button.label) };
  const next = advance(c.scene, c.cursor, ctx);
  const reply = next.step.kind === 'line' && next.step.node.speaker !== node.speaker;
  clearCommsTimer();
  commsTimer = setTimeout(() => {
    commsTimer = null;
    if (commsNow !== c) return;
    c.prev = view;
    c.cursor = next;
    showCommsLine();
  }, commsHoldMs(view.text, node.durationSec, reply));
}

/** A bark on the panel: its own one-line scene, never under another line (D061). */
function barkScene(b: Bark): Scene {
  return { id: b.id, nodes: [{ ...b, kind: 'line' as const }] };
}

function showBark(b: Bark): void {
  clearCommsTimer();
  const scene = barkScene(b);
  commsNow = { scene, cursor: start(scene, storyContext(session?.map ?? null)), prev: null, button: null };
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
  commsNow = { scene, cursor: start(scene, storyContext(session?.map ?? null)), prev: null, button: null };
  showCommsLine();
}

// ─── Barks ───────────────────────────────────────────────────────────────────────────────────

/**
 * Offers one moment's triggers to the bark pools (`pickBarkOf`). Nothing plays over a line on the
 * panel or a scene, and nothing waits: the triggers still count as fired. `wave` is the wave a
 * `perfect_wave` resolved (the adapted radio's A1M1 line plays from W2).
 */
function offerBarks(triggers: readonly BarkTrigger[], wave: number | null = null): void {
  const s = session;
  if (s === null || !enabled || triggers.length === 0) return;
  const atSec = s.simSec();
  const events: BarkEvent[] = triggers.map((trigger) => ({ trigger, atSec, present: s.present }));
  const busy = commsNow !== null || commsHeld || commsQueue.length > 0;
  const pool = busy
    ? []
    : s.pool.filter((b) => wave === null || (s.fromWave.get(b.id) ?? 0) <= wave);
  const pick = pickBarkOf(pool, events, s.barks, storyContext(s.map));
  s.barks = pick.state;
  if (pick.bark !== null) showBark(pick.bark);
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
export function presentSpeakers(map: MapDef<IdSpace>): SpeakerId[] {
  const out: SpeakerId[] = ['quill'];
  const c = map.companion;
  if (c !== null && 'id' in c && c.state === 'present') {
    const id = c.id === 'bramble' ? 'chitterbloom' : c.id;
    if (!out.includes(id)) out.push(id);
  }
  return out;
}

/** The briefing scene of `map`: its `<map>_brief`, else its static briefing (app/radio.ts). */
export function briefingScene(map: MapDef<IdSpace>): Scene | null {
  const id = `${map.id}_brief`;
  return SCENES[id] ?? staticBriefingScene(map.id, map.briefing);
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
  const own = map === null ? { scenes: [], barks: [] } : mapDialogue(map);
  const adapted = own.scenes.length === 0 && own.barks.length === 0 ? adaptRadio(mapDef.id) : null;
  /** Scenes by the moment that plays them (`countdown:<wave>`, `cue:<id>`, the adapter's keys). */
  const moments = new Map<string, Scene>(adapted?.scenes ?? []);
  for (const scene of own.scenes) {
    const slot = sceneSlot(scene.id);
    if (slot?.kind === 'radio') moments.set(`countdown:${slot.wave}`, scene);
  }
  const s: Session = {
    map,
    present: presentSpeakers(mapDef),
    simSec: () => sim.state.tick / TICK_HZ,
    runKills: () => sim.state.stats.skitterkinKilled,
    pool: [...(map === null ? [] : barksFor(map)), ...(adapted?.barks ?? [])],
    fromWave: adapted?.fromWave ?? new Map(),
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
  const killedEnemies = new Set<string>();
  let leaked = false;
  let lowFired = false;
  let wave = 0;

  const playMoment = (key: string): void => {
    const scene = moments.get(key);
    if (scene === undefined) return;
    moments.delete(key);
    if (!enabled) return;
    playScene(scene);
  };

  // The start: map_start, the entry flag barks, and newly issued towers, once the briefing closes.
  const begin = (): void => {
    if (opts.newTowers.length > 0 && adapted !== null) {
      for (const t of opts.newTowers) playMoment(`issued:${t}`);
    }
    const triggers: BarkTrigger[] = [{ on: 'map_start' }, { on: 'flag' }];
    for (const t of opts.newTowers) if (isTower(t)) triggers.push({ on: 'tower_issued', tower: t });
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

  const handle = (e: SimEvent<IdSpace>): void => {
    switch (e.type) {
      case 'CountdownStarted':
        playMoment(`countdown:${e.wave}`);
        if (e.wave >= 2 && sim.state.credits >= BANK_NUDGE_CREDITS) nudge(e.wave);
        return;
      case 'TowerClassUnlocked':
        playMoment(`unlock:${e.tower}`);
        return;
      case 'WaveStarted':
        wave = Math.max(wave, e.wave);
        playMoment(`waveStart:${e.wave}`);
        offerBarks([{ on: 'wave_start', wave: e.wave }]);
        return;
      case 'WaveCleared': {
        playMoment(`waveCleared:${e.wave}`);
        const triggers: BarkTrigger[] = [{ on: 'wave_cleared', wave: e.wave }];
        if (!leakedWaves.has(e.wave)) triggers.push({ on: 'perfect_wave' });
        offerBarks(triggers, e.wave);
        return;
      }
      case 'EnemySpawned':
        waveOf.set(e.uid, e.wave);
        if (!met.has(e.enemy)) {
          met.add(e.enemy);
          if (isEnemy(e.enemy)) offerBarks([{ on: 'new_enemy', enemy: e.enemy }]);
        }
        return;
      case 'EnemyDied': {
        waveOf.delete(e.uid);
        const first = !killedEnemies.has(e.enemy);
        killedEnemies.add(e.enemy);
        if (first) playMoment(`enemyKilled:${e.enemy}`);
        if (isEnemy(e.enemy)) offerBarks([{ on: 'enemy_killed', enemy: e.enemy }]);
        return;
      }
      case 'EnemyLeaked': {
        const w = waveOf.get(e.uid);
        if (w !== undefined) leakedWaves.add(w);
        waveOf.delete(e.uid);
        const triggers: BarkTrigger[] = [];
        if (!leaked) {
          leaked = true;
          playMoment('firstLeak');
          triggers.push({ on: 'first_leak' });
        }
        if (!leakedEnemies.has(e.enemy)) {
          leakedEnemies.add(e.enemy);
          playMoment(`enemyLeaked:${e.enemy}`);
          if (isEnemy(e.enemy)) triggers.push({ on: 'enemy_leaked', enemy: e.enemy });
        }
        const st = sim.state;
        if (!lowFired && st.integrity > 0 && st.integrity <= st.maxIntegrity * LOW_INTEGRITY_SHARE) {
          lowFired = true;
          triggers.push({ on: 'low_integrity' });
        }
        offerBarks(triggers);
        return;
      }
      case 'TowerBuilt':
        towerOf.set(e.uid, e.tower);
        offerBarks([isTower(e.tower) ? { on: 'tower_built', tower: e.tower } : { on: 'tower_built' }]);
        return;
      case 'TowerSold': {
        // Name tags (story/tags.ts) join with T302c: `tagged` isn't known here yet.
        const t = towerOf.get(e.uid);
        towerOf.delete(e.uid);
        offerBarks([t !== undefined && isTower(t) ? { on: 'tower_sold', tower: t } : { on: 'tower_sold' }]);
        return;
      }
      case 'HoldFireChanged':
        if (e.on) offerBarks([{ on: 'hold_fire_used' }]);
        return;
      case 'NotFiringAtSkitterkin':
        offerBarks([{ on: 'not_firing' }]);
        return;
      case 'NeutralHit':
        offerBarks([{ on: 'neutral_hit' }]);
        return;
      case 'BossPhase':
        offerBarks([{ on: 'boss_phase', phase: e.phase }]);
        return;
      case 'ScriptCue': {
        const scene = SCENES[e.cueId];
        if (scene !== undefined) {
          if (enabled) playScene(scene);
          return;
        }
        const bark = BARKS[e.cueId];
        if (bark !== undefined) playCueBark(bark);
        return;
      }
      default:
        return;
    }
  };
  const types = [
    'CountdownStarted',
    'TowerClassUnlocked',
    'WaveStarted',
    'WaveCleared',
    'EnemySpawned',
    'EnemyDied',
    'EnemyLeaked',
    'TowerBuilt',
    'TowerSold',
    'HoldFireChanged',
    'NotFiringAtSkitterkin',
    'NeutralHit',
    'BossPhase',
    'ScriptCue',
  ] as const;
  const offs = types.map((t) => bus.on(t, handle));
  return () => {
    for (const off of offs) off();
    offBriefing();
    // Barks that play once per campaign go into the save's seen list.
    const played = campaignBarksPlayed(s.barks, s.pool);
    const saved = activeSave();
    const fresh = played.filter((id) => saved !== null && !saved.story.seen.includes(id));
    if (fresh.length > 0) {
      updateActiveSave((sv) => ({ ...sv, story: { ...sv.story, seen: [...sv.story.seen, ...fresh] } }));
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
