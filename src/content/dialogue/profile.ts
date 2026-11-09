// The player's profile as content data (design/core-loop.md § 6.1; docs/tech/story-runtime.md
// § Text substitution): the pronoun sets the text tokens resolve to, the callsigns, the intake
// form's arrival reasons, and the name rule. The save holds only the ids (meta/saveData.ts
// `SaveData.profile`); `arrival_reason` is a story flag (content/dialogue/flags.ts), so story
// conditions read it like any other flag.
import type { FlagValueOf } from './flags.ts';

/** The pronoun sets a profile can pick (core-loop.md § 6.1). */
export const PRONOUN_IDS = ['she', 'he', 'they'] as const;
export type PronounId = (typeof PRONOUN_IDS)[number];

/**
 * One pronoun set: each form keyed by its text token (`{they}`, `{them}`, `{their}`, `{theirs}`,
 * `{themself}`), and the verb agreement `{v:<plural>|<singular>}` picks (`plural` for they/them).
 */
export interface PronounSet {
  readonly they: string;
  readonly them: string;
  readonly their: string;
  readonly theirs: string;
  readonly themself: string;
  readonly agreement: 'singular' | 'plural';
  /** The intake form's label. */
  readonly label: string;
}

export const PRONOUN_SETS: Readonly<Record<PronounId, PronounSet>> = {
  she: {
    they: 'she',
    them: 'her',
    their: 'her',
    theirs: 'hers',
    themself: 'herself',
    agreement: 'singular',
    label: 'she/her',
  },
  he: {
    they: 'he',
    them: 'him',
    their: 'his',
    theirs: 'his',
    themself: 'himself',
    agreement: 'singular',
    label: 'he/him',
  },
  they: {
    they: 'they',
    them: 'them',
    their: 'their',
    theirs: 'theirs',
    themself: 'themself',
    agreement: 'plural',
    label: 'they/them',
  },
};

/** The callsigns, in the order the story gives them (core-loop.md § 6.1; campaign.md § 4.6). */
export const CALLSIGN_IDS = ['sprout', 'thorn', 'waykeeper'] as const;
export type CallsignId = (typeof CALLSIGN_IDS)[number];

/** What `{callsign}` resolves to. */
export const CALLSIGNS: Readonly<Record<CallsignId, string>> = {
  sprout: 'Sprout',
  thorn: 'Thorn',
  waykeeper: 'Waykeeper',
};

/** Why the player came to Kepler: the `arrival_reason` flag's values. */
export type ArrivalReason = FlagValueOf<'arrival_reason'>;

/** The intake form's options for `arrival_reason`, in form order (core-loop.md § 6.1). */
export const ARRIVAL_REASONS: Readonly<Record<ArrivalReason, string>> = {
  bonus: 'The signing bonus',
  family: 'Money for family back home',
  lettuce: 'I like lettuce',
};

/**
 * The player's name (core-loop.md § 6.1): 1–16 characters of letters, digits, space, apostrophe,
 * hyphen, and period, so the in-world bitmap font can draw it on a name tag. Letters are ASCII
 * (the pixel fonts' glyph set). No leading or trailing space, and not only spaces or punctuation.
 */
export const PLAYER_NAME = {
  maxLength: 16,
  /** Every character the name may hold. */
  allowed: /^[A-Za-z0-9 '.-]+$/,
} as const;

/** Whether `name` is a valid player name (the intake form trims before it checks). */
export function isValidPlayerName(name: string): boolean {
  return (
    name.length >= 1 &&
    name.length <= PLAYER_NAME.maxLength &&
    PLAYER_NAME.allowed.test(name) &&
    name.trim() === name &&
    /[A-Za-z0-9]/.test(name)
  );
}

/**
 * The profile character creation fills in (T306): plain save data (`SaveData.profile`, null until
 * the intake). Name and pronouns can change in Settings; the callsign changes by dialogue `set`
 * nodes. `arrival_reason` is the flag of that name, set by the same intake.
 */
export interface PlayerProfile {
  name: string;
  pronouns: PronounId;
  callsign: CallsignId;
}
