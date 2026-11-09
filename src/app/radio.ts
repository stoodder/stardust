// The M1 radio ticker (D026): plays a map's radio lines (content/radio/) as HUD radio notices when
// their sim events happen. Not the dialogue system (T302): each line plays once per battle, queued,
// one at a time for a few seconds of real time, and never blocks input or pauses the game.
import { radioLines, SPEAKERS, type RadioLine } from '../content/radio/index.ts';
import type { IdSpace } from '../content/types.ts';
import type { Bus } from '../shared/bus.ts';
import type { SimEvent } from '../sim/index.ts';
import { assertNever } from '../shared/types.ts';
import { hud, type RadioView } from '../ui/state.ts';

/**
 * A queued line older than this (ms of real time) is dropped instead of shown, so a fast game
 * (2×, early calls) never hears the W1 jingle in W5.
 */
export const RADIO_STALE_MS = 15_000;

/** How long a radio line stays up, in ms of real time: 4 s, plus time to read a long line. */
export function radioLineMs(text: string): number {
  return 4000 + Math.max(0, text.length - 60) * 40;
}

/**
 * Picks which of a map's lines a sim event plays, each at most once. Pure apart from its own
 * bookkeeping (which lines have played, which waves leaked), so it's unit-tested without a host.
 */
export function createRadioScript(lines: readonly RadioLine[]) {
  const played = new Set<RadioLine>();
  const waveOf = new Map<number, number>();
  const leakedWaves = new Set<number>();
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
  return {
    /** The lines `e` plays, in table order (none for most events). */
    lines(e: SimEvent<IdSpace>): RadioLine[] {
      switch (e.type) {
        case 'EnemySpawned':
          waveOf.set(e.uid, e.wave);
          return [];
        case 'EnemyDied':
          waveOf.delete(e.uid);
          return [];
        case 'EnemyLeaked': {
          const w = waveOf.get(e.uid);
          if (w !== undefined) leakedWaves.add(w);
          waveOf.delete(e.uid);
          if (leaked) return [];
          leaked = true;
          return take((l) => l.on === 'firstLeak');
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
        case 'MapWon':
          return take((l) => l.on === 'mapWon');
        case 'MapLost':
          return take((l) => l.on === 'mapLost');
        case 'ProjectileFired':
        case 'ProjectileHit':
        case 'TowerBuilt':
        case 'TowerUpgraded':
        case 'TowerSold':
        case 'ScriptCue':
        case 'AbilityUsed':
        case 'CommandRejected':
          return [];
        default:
          return assertNever(e);
      }
    },
  };
}

let enabled = true;

/** Turns the radio on or off for battles started from now on (`?test=1` turns it off; D026). */
export function setRadioEnabled(on: boolean): void {
  enabled = on;
}

let radioId = 0;

/** A line as the HUD shows it. */
export function radioView(line: RadioLine): RadioView {
  const look = SPEAKERS[line.speaker];
  return { id: ++radioId, name: look.name, color: look.color, text: line.text };
}

/** Wires a battle's radio to the HUD's `radio` signal. Returns the unwiring (which clears it). */
export function bindRadio(bus: Bus<SimEvent<IdSpace>>, mapId: string): () => void {
  hud.radio.value = null;
  const lines = radioLines(mapId);
  if (!enabled || lines.length === 0) return () => {};
  const script = createRadioScript(lines);
  const queue: { line: RadioLine; at: number }[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;
  const showNext = (): void => {
    timer = null;
    const now = performance.now();
    let next = queue.shift();
    while (next !== undefined && now - next.at > RADIO_STALE_MS) next = queue.shift();
    hud.radio.value = next === undefined ? null : radioView(next.line);
    if (next !== undefined) timer = setTimeout(showNext, radioLineMs(next.line.text));
  };
  const onEvent = (e: SimEvent<IdSpace>): void => {
    const add = script.lines(e);
    if (add.length === 0) return;
    const at = performance.now();
    for (const line of add) queue.push({ line, at });
    if (timer === null) showNext();
  };
  const types = [
    'EnemySpawned',
    'EnemyDied',
    'EnemyLeaked',
    'CountdownStarted',
    'TowerClassUnlocked',
    'WaveStarted',
    'WaveCleared',
    'MapWon',
    'MapLost',
  ] as const;
  const offs = types.map((t) => bus.on(t, onEvent));
  return () => {
    for (const off of offs) off();
    if (timer !== null) clearTimeout(timer);
    timer = null;
    queue.length = 0;
    hud.radio.value = null;
  };
}
