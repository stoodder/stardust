// The voice book (pure): which sound effect instances are playing, the per-sound rate limits and
// voice caps, and the global voice limit with priority stealing. The synth asks it before every
// sound, so a 20-shots-a-second Rivet stream is a rattle, not noise, and a storm of pops can never
// drown a leak alarm. Times are seconds on the audio clock.
import type { Priority } from './types.ts';

/** What a sound asks for (a recipe's voice fields). */
export interface VoiceRules {
  readonly priority: Priority;
  readonly minGapMs?: number;
  readonly maxVoices?: number;
}

interface Entry<H> {
  readonly id: string;
  readonly priority: Priority;
  readonly start: number;
  readonly end: number;
  readonly handle: H;
}

/** Why a sound was dropped. */
export type DropReason = 'rate' | 'full';

export type Admission<H> =
  | { readonly ok: true; /** Voices to cut to make room. */ readonly cut: readonly H[] }
  | { readonly ok: false; readonly reason: DropReason };

export interface VoiceBook<H> {
  /**
   * Whether `id` may start at `now`, and which voices it displaces (the caller stops them; they
   * leave the book now). Doesn't record the new instance: `add` does, once it has started.
   */
  admit(id: string, rules: VoiceRules, now: number): Admission<H>;
  /** Records a started instance (after `admit` said ok and its cuts were made). */
  add(id: string, priority: Priority, start: number, end: number, handle: H): void;
  /** Instances still sounding at `now`. */
  live(now: number): number;
  clear(): void;
}

/** Creates a voice book holding at most `maxVoices` instances at once. */
export function createVoiceBook<H>(maxVoices: number): VoiceBook<H> {
  let entries: Entry<H>[] = [];
  const lastStart = new Map<string, number>();
  const prune = (now: number): void => {
    if (entries.some((e) => e.end <= now)) entries = entries.filter((e) => e.end > now);
  };
  return {
    admit(id, rules, now) {
      prune(now);
      const last = lastStart.get(id);
      if (
        rules.minGapMs !== undefined &&
        last !== undefined &&
        (now - last) * 1000 < rules.minGapMs
      ) {
        return { ok: false, reason: 'rate' };
      }
      const cut: Entry<H>[] = [];
      // The per-sound cap: the oldest instance of this sound makes way.
      const same = entries.filter((e) => e.id === id);
      if (rules.maxVoices !== undefined && same.length >= rules.maxVoices) {
        cut.push(...same.slice(0, same.length - rules.maxVoices + 1));
      }
      // The global cap: the oldest voice of the lowest priority, if it's no higher than this one.
      let over = entries.length - cut.length + 1 - maxVoices;
      if (over > 0) {
        const candidates = entries
          .filter((e) => !cut.includes(e) && e.priority <= rules.priority)
          .toSorted((a, b) => a.priority - b.priority || a.start - b.start);
        if (candidates.length < over) return { ok: false, reason: 'full' };
        for (const e of candidates) {
          if (over === 0) break;
          cut.push(e);
          over--;
        }
      }
      if (cut.length > 0) entries = entries.filter((e) => !cut.includes(e));
      return { ok: true, cut: cut.map((e) => e.handle) };
    },
    add(id, priority, start, end, handle) {
      entries = entries.filter((e) => e.handle !== handle);
      entries.push({ id, priority, start, end, handle });
      lastStart.set(id, start);
    },
    live(now) {
      prune(now);
      return entries.length;
    },
    clear() {
      entries = [];
      lastStart.clear();
    },
  };
}
