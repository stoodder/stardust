// Character creation (T306; design/core-loop.md § 6.1): the intake form's rules and the profile
// writes. The intake ("Frontier Futures: New Hire Intake") runs on New game before A1M1, and on
// Continue, Load, or Import for a save with no profile yet (every save from before SaveData v2).
// It writes `SaveData.profile` (name, form of address as `pronouns`, the first callsign) and the
// `arrival_reason` flag, that flag's one home (D066). Settings edits the name and form of address
// later; the callsign
// changes only by dialogue `set` nodes, and the reason is final. The copy's home is
// docs/story/campaign/act1.md § Character creation.
import {
  ARRIVAL_REASONS,
  CALLSIGN_IDS,
  DEFAULT_ADDRESS,
  PLAYER_NAME,
  isValidPlayerName,
  type ArrivalReason,
  type PronounId,
} from '../content/dialogue/profile.ts';
import type { SaveData, SlotId } from '../meta/index.ts';
import { resolveText } from '../story/text.ts';
import { activeSave, newGame, updateActiveSave, type SaveResult } from './save.ts';

// ── When the intake runs ─────────────────────────────────────────────────────────────────────

let enabled = true;

/**
 * Whether the intake runs (on for players). `?test=1` turns it off, so a new game goes straight to
 * A1M1 with no profile, as a v1 save plays; `&intake=1` turns it back on (boot.ts).
 */
export function setIntakeEnabled(on: boolean): void {
  enabled = on;
}

/** What the open intake is for: a new campaign in an empty slot, or the save in play. */
export type IntakeMode =
  { readonly kind: 'new'; readonly slot: SlotId } | { readonly kind: 'existing' };

let pendingNew: SlotId | null = null;

/**
 * Whether the save in play still needs its intake (no profile yet). False with no save, or while
 * the intake is off.
 */
export function needsIntake(): boolean {
  return enabled && activeSave()?.profile === null;
}

/**
 * Holds a new campaign's slot for the intake: the save is created when the form is signed, so
 * backing out of the form leaves the slot empty. Null clears it.
 */
export function holdNewGame(slot: SlotId | null): void {
  pendingNew = slot;
}

/** Whether New game should open the intake first (it's on). */
export function intakeBeforeNewGame(): boolean {
  return enabled;
}

/** The open intake's mode, or null when there's nothing to fill in. */
export function intakeMode(): IntakeMode | null {
  if (pendingNew !== null) return { kind: 'new', slot: pendingNew };
  return activeSave() === null ? null : { kind: 'existing' };
}

// ── The form ─────────────────────────────────────────────────────────────────────────────────

/**
 * The intake form as filled in so far. The name and the reason start blank; the form of address is
 * optional and starts on Tech. (D163), so it never holds the form up.
 */
export interface IntakeForm {
  readonly name: string;
  readonly pronouns: PronounId;
  readonly arrival: ArrivalReason | null;
}

/** A fresh intake form. */
export const BLANK_INTAKE: IntakeForm = { name: '', pronouns: DEFAULT_ADDRESS, arrival: null };

/** Field problems, in the Act I voice: cheerful, never scolding (story/style-guide.md § 2). */
export const INTAKE_PROBLEMS = {
  nameEmpty: 'Your name tag needs a name!',
  nameLong: `Name tags fit ${PLAYER_NAME.maxLength} characters. Try a shorter one!`,
  nameChars: "Name tags print letters, digits, spaces, and ' - . only. Try those!",
  nameBare: 'Name tags need at least one letter or digit!',
  arrival: "Pick a reason. Any reason! They're all approved.",
} as const;

/** The name as the form files it: trimmed, inner runs of spaces collapsed to one. */
export function cleanName(raw: string): string {
  return raw.trim().replace(/ {2,}/g, ' ');
}

/** What's wrong with a name as typed (before cleaning), or null when it files. */
export function nameProblem(raw: string): string | null {
  const name = cleanName(raw);
  if (isValidPlayerName(name)) return null;
  if (name === '') return INTAKE_PROBLEMS.nameEmpty;
  if (name.length > PLAYER_NAME.maxLength) return INTAKE_PROBLEMS.nameLong;
  if (!PLAYER_NAME.allowed.test(name)) return INTAKE_PROBLEMS.nameChars;
  return INTAKE_PROBLEMS.nameBare;
}

/** Each field's problem; an empty object when the form can be signed. */
export interface IntakeProblems {
  name?: string;
  arrival?: string;
}

export function intakeProblems(form: IntakeForm): IntakeProblems {
  const out: IntakeProblems = {};
  const name = nameProblem(form.name);
  if (name !== null) out.name = name;
  if (form.arrival === null) out.arrival = INTAKE_PROBLEMS.arrival;
  return out;
}

/** The first callsign, which a new profile files (Bricks says it aloud in A1M1's briefing). */
export const FIRST_CALLSIGN = CALLSIGN_IDS[0];

/**
 * `save` with the intake filed: the profile (keeping a callsign already earned) and the
 * `arrival_reason` flag. Pure; returns a copy.
 */
export function withIntake(
  save: SaveData,
  profile: { readonly name: string; readonly pronouns: PronounId },
  arrival: ArrivalReason,
): SaveData {
  return {
    ...save,
    profile: {
      name: profile.name,
      pronouns: profile.pronouns,
      callsign: save.profile?.callsign ?? FIRST_CALLSIGN,
    },
    story: { ...save.story, flags: { ...save.story.flags, arrival_reason: arrival } },
  };
}

/** `save` with a new name and form of address (Settings). The callsign and the reason stay. */
export function withProfileEdit(
  save: SaveData,
  edit: { readonly name: string; readonly pronouns: PronounId },
): SaveData {
  if (save.profile === null) return save;
  return { ...save, profile: { ...save.profile, name: edit.name, pronouns: edit.pronouns } };
}

/** A form that can't be signed yet: which fields need another look. */
export type IntakeSubmit = SaveResult | { readonly ok: false; readonly problems: IntakeProblems };

/**
 * Signs the intake: a new campaign in its held slot, or the save in play, with the profile and
 * the flag, written at once. Returns the problems instead while a field needs another look.
 */
export function signIntake(form: IntakeForm): IntakeSubmit {
  const problems = intakeProblems(form);
  if (form.arrival === null || Object.keys(problems).length > 0) {
    return { ok: false, problems };
  }
  const profile = { name: cleanName(form.name), pronouns: form.pronouns };
  const arrival = form.arrival;
  const fill = (save: SaveData): SaveData => withIntake(save, profile, arrival);
  const mode = intakeMode();
  if (mode === null) return { ok: false, message: 'No save is loaded.' };
  if (mode.kind === 'existing') return updateActiveSave(fill);
  const r = newGame(mode.slot, fill);
  if (r.ok) pendingNew = null;
  return r;
}

/** Settings → Update file: a new name and form of address for the save in play. */
export function editProfile(raw: string, pronouns: PronounId): SaveResult {
  const problem = nameProblem(raw);
  if (problem !== null) return { ok: false, message: problem };
  const save = activeSave();
  if (save === null) return { ok: false, message: 'Load a campaign to update your file.' };
  if (save.profile === null) {
    return { ok: false, message: 'Your intake form opens when you continue this campaign.' };
  }
  return updateActiveSave((s) => withProfileEdit(s, { name: cleanName(raw), pronouns }));
}

// ── The preview ──────────────────────────────────────────────────────────────────────────────

/**
 * The intake's sample file note (act1.md § Character creation): the pronoun tokens in use, so the
 * player sees in a sentence how their form of address reads (it reads naturally under each). Third person about the player, from the form, never an
 * NPC (no NPC says `{name}` before A3M3; style-guide.md § 3).
 */
export const SAMPLE_NOTE =
  'File note: {They} {v:are|is} cleared for perimeter duty. {Their} helmet is one size fits most!';

/**
 * `text` resolved for a profile being filled in (the intake's file note, Settings' preview):
 * the story runtime's `resolveText` (story/text.ts), with the name as typed so far.
 */
export function previewText(text: string, pronouns: PronounId, name = ''): string {
  const cleaned = cleanName(name);
  return resolveText(text, {
    profile: { name: cleaned === '' ? 'Technician' : cleaned, pronouns, callsign: FIRST_CALLSIGN },
    pestsProcessed: 0,
    evacuated: null,
  });
}

function isArrivalReason(x: string): x is ArrivalReason {
  return Object.hasOwn(ARRIVAL_REASONS, x);
}

/** The arrival reasons in form order (core-loop.md § 6.1). */
export const ARRIVAL_ORDER: readonly ArrivalReason[] =
  Object.keys(ARRIVAL_REASONS).filter(isArrivalReason);
