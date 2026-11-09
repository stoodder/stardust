// Bark selection (docs/tech/story-runtime.md § Barks; docs/story/style-guide.md § 5.5): picks the
// bark a trigger plays by priority (script cue → boss → first-time trigger → repeat), spacing (one
// per 6 s of sim time unless scripted), presence (only speakers on the radio; an absent speaker's
// authored silence still plays), once-per-map and once-per-campaign limits, cooldowns, and
// no-repeat pools, with its own seeded RNG. Pure: the state is plain data the caller keeps.
//
// A bark is always its own radio batch: the comms panel never shows it as a reply to another
// speaker's line (D061). Authored replies are the next line of the same scene, or a button's reply.
import type {
  Bark,
  BarkId,
  BarkTrigger,
  BarkTriggerId,
  SpeakerId,
} from '../content/dialogue/types.ts';
import { cloneRng, createRng, nextInt, type Rng } from '../shared/rng.ts';
import { evaluateCondition, type StoryContext } from './conditions.ts';

/** Sim seconds between two barks (style-guide § 5.5); script cues ignore it. */
export const BARK_SPACING_SEC = 6;

/** Bark state for one battle: what played and when, which triggers fired, and the draw RNG. */
export interface BarkState {
  /** When the last bark played (sim seconds), or null before the first. */
  readonly lastAtSec: number | null;
  /** Every bark played this map, in play order (repeats appear again). */
  readonly played: readonly BarkId[];
  /** When each bark last played (sim seconds), for cooldowns. */
  readonly lastPlayedAt: Readonly<Record<BarkId, number>>;
  /** The triggers that have fired this map (barked or not), for the first-time priority. */
  readonly fired: readonly BarkTriggerId[];
  readonly rng: Readonly<Rng>;
}

/** A trigger as it fires: the trigger with its parameters, the sim time, and who is on the radio. */
export interface BarkEvent {
  readonly trigger: BarkTrigger;
  readonly atSec: number;
  /** Speakers on the radio this map: QUILL (unless offline) and the companion. */
  readonly present: readonly SpeakerId[];
}

/** A pick: the bark (or null) and the state after it. */
export interface BarkPick {
  readonly bark: Bark | null;
  readonly state: BarkState;
}

/** A fresh state for a battle; `seed` is a uint32 (the run's seed works). */
export function newBarkState(seed: number): BarkState {
  return { lastAtSec: null, played: [], lastPlayedAt: {}, fired: [], rng: createRng(seed >>> 0) };
}

/** Priority classes, lower first: boss lines, a trigger's first firing this map, repeats. */
export function eventPriority(event: BarkEvent, state: BarkState): 1 | 2 | 3 {
  const t = event.trigger;
  if (t.on === 'boss_phase' || ('boss' in t && t.boss !== undefined)) return 1;
  return state.fired.includes(t.on) ? 3 : 2;
}

/**
 * Whether bark trigger `want` matches the firing trigger `got`: the same id, and every parameter
 * `want` names equal to `got`'s (a bark naming none matches any).
 */
export function triggerMatches(want: BarkTrigger, got: BarkTrigger): boolean {
  if (want.on !== got.on) return false;
  const params = new Map<string, unknown>(Object.entries(got));
  return Object.entries(want).every(([k, v]) => params.get(k) === v);
}

/** How many parameters a bark's trigger names: a more specific bark wins over a generic one. */
function specificity(b: Bark): number {
  return Object.keys(b.trigger).length - 1;
}

/** Whether `b` may play again: once-per-map (the default without a cooldown), campaign, cooldown. */
function available(b: Bark, atSec: number, state: BarkState, ctx: StoryContext): boolean {
  if (b.once === 'campaign' && ctx.seen.includes(b.id)) return false;
  const last = state.lastPlayedAt[b.id];
  if (last === undefined) return true;
  if (b.once !== undefined || b.cooldownSec === undefined) return false;
  return atSec - last >= b.cooldownSec;
}

/**
 * The bark `event` plays from `pool` (or null), and the state after it. Candidates match the
 * trigger, hold their `when`, have a present speaker (or are silence lines, which play for an
 * absent one), and are available; the most specific win, unplayed before played, then a seeded
 * draw. Within `BARK_SPACING_SEC` of the last bark nothing plays (and nothing queues).
 */
export function pickBark(
  pool: readonly Bark[],
  event: BarkEvent,
  state: BarkState,
  ctx: StoryContext,
): BarkPick {
  const on = event.trigger.on;
  const fired = state.fired.includes(on) ? state.fired : [...state.fired, on];
  const after: BarkState = fired === state.fired ? state : { ...state, fired };
  if (after.lastAtSec !== null && event.atSec - after.lastAtSec < BARK_SPACING_SEC) {
    return { bark: null, state: after };
  }
  const matched = pool.filter(
    (b) =>
      triggerMatches(b.trigger, event.trigger) &&
      (b.text === '' || event.present.includes(b.speaker)) &&
      available(b, event.atSec, after, ctx) &&
      (b.when === undefined || evaluateCondition(b.when, ctx)),
  );
  if (matched.length === 0) return { bark: null, state: after };
  const top = Math.max(...matched.map(specificity));
  const best = matched.filter((b) => specificity(b) === top);
  const fresh = best.filter((b) => !after.played.includes(b.id));
  const draw = fresh.length > 0 ? fresh : best;
  const rng = cloneRng(after.rng);
  const bark = draw.length === 1 ? draw[0] : draw[nextInt(rng, draw.length)];
  if (bark === undefined) return { bark: null, state: after };
  return { bark, state: record(after, bark, event.atSec, rng) };
}

/**
 * The bark the events of one moment play (at most one): tried in priority order (boss, first-time,
 * repeat; ties in event order), every event counting as fired.
 */
export function pickBarkOf(
  pool: readonly Bark[],
  events: readonly BarkEvent[],
  state: BarkState,
  ctx: StoryContext,
): BarkPick {
  const ranked = events
    .map((e, i) => ({ e, i, p: eventPriority(e, state) }))
    .toSorted((x, y) => x.p - y.p || x.i - y.i);
  let s = state;
  let bark: Bark | null = null;
  const unheard: BarkTriggerId[] = [];
  for (const { e } of ranked) {
    if (bark === null) {
      const pick = pickBark(pool, e, s, ctx);
      s = pick.state;
      bark = pick.bark;
    } else if (!s.fired.includes(e.trigger.on) && !unheard.includes(e.trigger.on)) {
      unheard.push(e.trigger.on);
    }
  }
  return { bark, state: unheard.length === 0 ? s : { ...s, fired: [...s.fired, ...unheard] } };
}

/**
 * A bark a map script cue names (`{ cue: <bark id> }`): it plays whatever the spacing, presence,
 * or once limits say (a cue is authored to play), and later barks keep their spacing from it.
 */
export function cueBark(bark: Bark, atSec: number, state: BarkState): BarkState {
  return record(state, bark, atSec, state.rng);
}

function record(state: BarkState, bark: Bark, atSec: number, rng: Readonly<Rng>): BarkState {
  return {
    ...state,
    lastAtSec: atSec,
    played: [...state.played, bark.id],
    lastPlayedAt: { ...state.lastPlayedAt, [bark.id]: atSec },
    rng,
  };
}

/** The barks to add to the save's `story.seen` after a battle: the once-per-campaign ones played. */
export function campaignBarksPlayed(state: BarkState, pool: readonly Bark[]): BarkId[] {
  const once = new Set(pool.filter((b) => b.once === 'campaign').map((b) => b.id));
  return [...new Set(state.played.filter((id) => once.has(id)))];
}
