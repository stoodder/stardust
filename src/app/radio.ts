// The M1 radio ticker (D026, D028): plays a map's radio lines (content/radio/) as HUD radio notices
// when their sim events happen. Not the dialogue system (T302): each line plays once per battle,
// queued, one at a time for a few seconds of real time, and never blocks input or pauses the game.
// The lines one event plays are a batch: a batch plays whole once its first line has played, and a
// reply (the next line of the batch, another speaker) follows its cue after a short beat, shown
// under it. The bank nudge is a batch of its own, after the countdown's (D061), so it never
// answers another speaker's line. A map's debrief isn't the ticker's: the results card shows it (app/runResult.ts).
import { radioLines, SPEAKERS, type RadioLine } from '../content/radio/index.ts';
import { BANK_NUDGE_CREDITS } from '../content/radio/types.ts';
import type { IdSpace } from '../content/types.ts';
import type { Bus } from '../shared/bus.ts';
import type { SimEvent } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import { silkText } from '../ui/silk.ts';
import { hud, type RadioView } from '../ui/state.ts';

/**
 * A batch whose first line has waited longer than this (ms of real time) is dropped instead of
 * shown, so a fast game (2×, early calls) never hears the W1 jingle in W5.
 */
export const RADIO_STALE_MS = 15_000;

/**
 * The longest a line holds when the next queued line is its reply (D028): the reply's beat, so
 * Bricks's "It's Wednesday." lands right on QUILL's punchline. The cue stays up above the reply.
 */
export const REPLY_BEAT_MS = 2500;

/** How long a radio line stays up, in ms of real time: 4 s, plus time to read a long line. */
export function radioLineMs(text: string): number {
  return 4000 + Math.max(0, text.length - 60) * 40;
}

/**
 * Picks which of a map's lines a sim event plays, each at most once. Pure apart from its own
 * bookkeeping (which lines have played, which waves and enemy types leaked), so it's unit-tested
 * without a host. `credits` reads the credits banked now (for `bankNudge`).
 */
export function createRadioScript(lines: readonly RadioLine[], credits: () => number = () => 0) {
  const played = new Set<RadioLine>();
  const waveOf = new Map<number, number>();
  const leakedWaves = new Set<number>();
  const leakedEnemies = new Set<string>();
  let leaked = false;
  const take = (match: (l: RadioLine) => boolean): RadioLine[] => {
    const out: RadioLine[] = [];
    for (const l of lines) {
      if (played.has(l) || !match(l)) continue;
      played.add(l);
      out.push(l);
    }
    return out;
  };
  /** The lines `e` plays as its own batch (the bank nudge is `batches`'s second). */
  const own = (e: SimEvent<IdSpace>): RadioLine[] => {
    switch (e.type) {
      case 'EnemySpawned':
        waveOf.set(e.uid, e.wave);
        return [];
      case 'EnemyDied':
        waveOf.delete(e.uid);
        return take((l) => l.on === 'enemyKilled' && l.enemy === e.enemy);
      case 'EnemyLeaked': {
        const w = waveOf.get(e.uid);
        if (w !== undefined) leakedWaves.add(w);
        waveOf.delete(e.uid);
        const firstOfType = !leakedEnemies.has(e.enemy);
        leakedEnemies.add(e.enemy);
        const first = !leaked;
        leaked = true;
        // The battle's first leak, then the first of this enemy type (both when one leak is both).
        return [
          ...(first ? take((l) => l.on === 'firstLeak') : []),
          ...(firstOfType ? take((l) => l.on === 'enemyLeaked' && l.enemy === e.enemy) : []),
        ];
      }
      case 'CountdownStarted':
        return take((l) => l.on === 'countdown' && l.wave === e.wave);
      case 'TowerClassUnlocked':
        return take((l) => l.on === 'unlock' && l.tower === e.tower);
      case 'WaveStarted':
        return take((l) => l.on === 'waveStart' && l.wave === e.wave);
      case 'WaveCleared': {
        const perfect = !leakedWaves.has(e.wave);
        return take(
          (l) =>
            (l.on === 'waveCleared' && l.wave === e.wave) ||
            (perfect && l.on === 'perfectWave' && e.wave >= (l.wave ?? 1)),
        );
      }
      // The debrief is the results card's (app/runResult.ts), never the ticker's.
      case 'MapWon':
      case 'MapLost':
      case 'ProjectileFired':
      case 'ProjectileHit':
      case 'TowerBuilt':
      case 'TowerUpgraded':
      case 'TowerSold':
      case 'ScriptCue':
      case 'AbilityUsed':
      case 'CommandRejected':
      case 'TowerSpecialized':
      case 'HoldFireChanged':
      case 'SpareRunnersChanged':
      case 'NotFiringAtSkitterkin':
      case 'LinkFormed':
      case 'LinkBroken':
      case 'AllySpawned':
      case 'AllyAttacked':
      case 'AllyRemoved':
      case 'MedalProgress':
      case 'SackBurst':
        return [];
      default:
        return assertNever(e);
    }
  };
  /**
   * The batches `e` plays, in order, none empty: its own lines, then (for a countdown, from wave
   * 2, with `BANK_NUDGE_CREDITS` banked) the bank nudge on its own. W1's setup has its starting
   * credits banked by design, so it never nudges.
   */
  const batches = (e: SimEvent<IdSpace>): RadioLine[][] => {
    const out = [own(e)];
    if (e.type === 'CountdownStarted' && e.wave >= 2 && credits() >= BANK_NUDGE_CREDITS) {
      out.push(take((l) => l.on === 'bankNudge'));
    }
    return out.filter((b) => b.length > 0);
  };
  return {
    /** The lines the battle's start plays for its newly issued towers (`issued`), once. */
    start: (newTowers: readonly string[]): RadioLine[] =>
      take((l) => l.on === 'issued' && l.tower !== undefined && newTowers.includes(l.tower)),
    batches,
    /** The lines `e` plays, in table and batch order (none for most events). */
    lines: (e: SimEvent<IdSpace>): RadioLine[] => batches(e).flat(),
  };
}

let enabled = true;

/** Turns the radio on or off for battles started from now on (`?test=1` turns it off; D026). */
export function setRadioEnabled(on: boolean): void {
  enabled = on;
}

let radioId = 0;

/** A line as the HUD shows it; `cue`: the line it replies to, kept up above it. */
export function radioView(line: RadioLine, cue: RadioLine | null = null): RadioView {
  const look = SPEAKERS[line.speaker];
  const prev =
    cue === null
      ? null
      : {
          name: SPEAKERS[cue.speaker].name,
          color: SPEAKERS[cue.speaker].color,
          text: silkText(cue.text),
        };
  return {
    id: ++radioId,
    name: look.name,
    color: look.color,
    text: silkText(line.text),
    cue: prev,
    pointFirstTower: line.point === 'firstTower',
  };
}

/** A line on (or waiting for) the ticker: when it was queued and the event batch it came in. */
interface Queued {
  readonly line: RadioLine;
  readonly at: number;
  readonly batch: number;
}

/** Whether `next` replies to `line`: the same batch, another speaker. */
function isReply(line: Queued, next: Queued | undefined): next is Queued {
  return next !== undefined && next.batch === line.batch && next.line.speaker !== line.line.speaker;
}

/** How long `line` holds (ms): its reading time, capped at the reply beat when `next` replies. */
export function radioHoldMs(text: string, nextIsReply: boolean): number {
  const ms = radioLineMs(text);
  return nextIsReply ? Math.min(ms, REPLY_BEAT_MS) : ms;
}

/**
 * Wires a battle's radio to the HUD's `radio` signal. `credits` reads the battle's banked credits
 * (for `bankNudge`); `newTowers` are the loadout's newly issued towers (meta/hints.ts), whose
 * `issued` lines play as the battle starts, once the briefing (if any) closes. Returns the
 * unwiring (which clears it).
 */
export function bindRadio(
  bus: Bus<SimEvent<IdSpace>>,
  mapId: string,
  credits: () => number = () => 0,
  newTowers: readonly string[] = [],
): () => void {
  hud.radio.value = null;
  const lines = radioLines(mapId);
  if (!enabled || lines.length === 0) return () => {};
  const script = createRadioScript(lines, credits);
  const queue: Queued[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  let batches = 0;
  /** The line on screen (or last shown), or null. */
  let shown: Queued | null = null;
  const showNext = (): void => {
    timer = null;
    const now = performance.now();
    let next = queue.shift();
    // Staleness is judged per batch, on its first line: a batch already playing plays out, and a
    // stale one is dropped whole (its later lines would be replies to nothing).
    while (next !== undefined && next.batch !== shown?.batch && now - next.at > RADIO_STALE_MS) {
      const stale = next.batch;
      do next = queue.shift();
      while (next !== undefined && next.batch === stale);
    }
    if (next === undefined) {
      hud.radio.value = null;
      return;
    }
    const cue = shown !== null && isReply(shown, next) ? shown.line : null;
    hud.radio.value = radioView(next.line, cue);
    shown = next;
    timer = setTimeout(showNext, radioHoldMs(next.line.text, isReply(next, queue[0])));
  };
  const enqueue = (add: readonly (readonly RadioLine[])[]): void => {
    if (add.length === 0) return;
    const at = performance.now();
    for (const group of add) {
      const batch = ++batches;
      for (const line of group) queue.push({ line, at, batch });
    }
    if (timer === null) showNext();
  };
  const onEvent = (e: SimEvent<IdSpace>): void => enqueue(script.batches(e));
  // The start's lines wait for the briefing to close, so they're never spoken under it.
  let started = false;
  const offBriefing = hud.briefing.subscribe((b) => {
    if (started || b !== null) return;
    started = true;
    const opening = script.start(newTowers);
    if (opening.length > 0) enqueue([opening]);
  });
  const types = [
    'EnemySpawned',
    'EnemyDied',
    'EnemyLeaked',
    'CountdownStarted',
    'TowerClassUnlocked',
    'WaveStarted',
    'WaveCleared',
  ] as const;
  const offs = types.map((t) => bus.on(t, onEvent));
  return () => {
    for (const off of offs) off();
    offBriefing();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    queue.length = 0;
    hud.radio.value = null;
  };
}
