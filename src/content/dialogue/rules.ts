// Dialogue rule data (docs/story/style-guide.md § 5.3–5.4; docs/tech/story-runtime.md § Text
// substitution, § Validation): the token grammar and each token's worst-case length, the length
// and scene-size limits, and scene-id parsing. Content-side, so both src/story/ (which resolves
// tokens and runs scenes) and content/validateDialogue.ts read one home; content never imports
// story (architecture.md § Allowed dependencies).
import { CAMPAIGN_PLAN_IDS, type CampaignMapId } from '../campaign.ts';
import { CALLSIGNS, PLAYER_NAME, PRONOUN_SETS, type PronounSet } from './profile.ts';
import {
  GLYPH_IDS,
  SCENE_ID,
  TEXT_TOKENS,
  type GlyphId,
  type SceneId,
  type SceneSlot,
  type StoryAct,
  type TextToken,
} from './types.ts';

// ─── Limits (style-guide § 4, § 5.4) ──────────────────────────────────────────────────────────

/** Hard length limits, in characters after worst-case substitution. */
export const TEXT_LIMITS = {
  line: 120,
  bark: 80,
  choice: 60,
  /** A reply button's label (story-runtime.md § Barks). */
  button: 16,
  /** A name tag: 16 characters fit the 64 px plate (art-direction.md). */
  tag: 16,
  codex: 600,
  memoBody: 600,
  smallPrint: 140,
  tip: 80,
  shop: 100,
  epilogue: 240,
} as const;

/** Lines per scene, by slot (style-guide § 4): the most lines any one play-through shows. */
export const SCENE_LINES: Readonly<Record<SceneSlot['kind'], { min: number; max: number }>> = {
  brief: { min: 1, max: 8 },
  radio: { min: 1, max: 3 },
  cue: { min: 1, max: 4 },
  debrief: { min: 1, max: 6 },
  scene: { min: 1, max: 20 },
  base: { min: 1, max: 8 },
};

/**
 * A cue scene that pauses the battle (`pause: true`) may run to this many lines: a pausing panel
 * is effectively a scene, while the 4-line cap is for the comms panel play runs under (D141;
 * A3M2's Clean Exit).
 */
export const PAUSING_CUE_MAX_LINES = 6;

/** QUILL's fair-play tell (style-guide § 5.6): a directive line starts or ends with this. */
export const POLICY_TELL = '(Per policy.)';

// ─── Tokens (style-guide § 5.4) ───────────────────────────────────────────────────────────────

type PronounForm = Exclude<keyof PronounSet, 'agreement' | 'label'>;
const PRONOUN_FORMS: readonly PronounForm[] = ['they', 'them', 'their', 'theirs', 'themself'];

/** The pronoun form a pronoun token names, and whether it is capitalized; null for others. */
export function pronounToken(
  token: TextToken,
): { readonly form: PronounForm; readonly cap: boolean } | null {
  const lower = token.toLowerCase();
  const form = PRONOUN_FORMS.find((f) => f === lower);
  return form === undefined ? null : { form, cap: token !== lower };
}

const longest = (xs: readonly string[]): number => Math.max(...xs.map((x) => x.length));

/** A plain token's worst-case length: `{name}` 16, `{callsign}` 9, pronouns their longest form. */
export function tokenWorstCase(token: TextToken): number {
  const p = pronounToken(token);
  if (p !== null) return longest(Object.values(PRONOUN_SETS).map((s) => s[p.form]));
  if (token === 'name') return PLAYER_NAME.maxLength; // 16
  if (token === 'callsign') return longest(Object.values(CALLSIGNS)); // "Waykeeper"
  if (token === 'pests_processed') return 9; // "1,234,567"
  return 5; // `evacuated`: "12,345", which no map's meter comes near
}

/** One piece of a text: literal text, or a parsed token. */
export type TextPart =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'token'; readonly token: TextToken }
  | { readonly kind: 'verb'; readonly plural: string; readonly singular: string }
  | { readonly kind: 'glyph'; readonly glyph: GlyphId };

/** A problem found while parsing a text's tokens. */
export interface TokenProblem {
  readonly at: number;
  readonly message: string;
}

const isTextToken = (s: string): s is TextToken => TEXT_TOKENS.some((t) => t === s);
const isGlyphId = (s: string): s is GlyphId => GLYPH_IDS.some((g) => g === s);

/** Parses `text` into literal runs and tokens, collecting problems (unknown or malformed tokens). */
export function parseText(text: string): {
  readonly parts: readonly TextPart[];
  readonly problems: readonly TokenProblem[];
} {
  const parts: TextPart[] = [];
  const problems: TokenProblem[] = [];
  let run = '';
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    if (ch === '}') {
      problems.push({ at: i, message: "stray '}'" });
      run += ch;
      i++;
      continue;
    }
    if (ch !== '{') {
      run += ch;
      i++;
      continue;
    }
    const close = text.indexOf('}', i + 1);
    const open = text.indexOf('{', i + 1);
    if (close < 0 || (open >= 0 && open < close)) {
      problems.push({ at: i, message: "unclosed '{'" });
      run += ch;
      i++;
      continue;
    }
    const body = text.slice(i + 1, close);
    const part = parseToken(body);
    if (typeof part === 'string') {
      problems.push({ at: i, message: `${part}: '{${body}}'` });
      run += text.slice(i, close + 1);
    } else {
      if (run !== '') parts.push({ kind: 'text', text: run });
      run = '';
      parts.push(part);
    }
    i = close + 1;
  }
  if (run !== '') parts.push({ kind: 'text', text: run });
  return { parts, problems };
}

/** A token body (`name`, `v:are|is`, `glyph:sun`) as a part, or the problem with it. */
function parseToken(body: string): Exclude<TextPart, { kind: 'text' }> | string {
  if (body.startsWith('v:')) {
    const forms = body.slice(2).split('|');
    if (forms.length !== 2 || forms.some((f) => f === '' || /[{}]/.test(f))) {
      return 'malformed verb agreement (want {v:<plural>|<singular>})';
    }
    return { kind: 'verb', plural: forms[0] ?? '', singular: forms[1] ?? '' };
  }
  if (body.startsWith('glyph:')) {
    const id = body.slice(6);
    return isGlyphId(id) ? { kind: 'glyph', glyph: id } : 'unknown glyph';
  }
  return isTextToken(body) ? { kind: 'token', token: body } : 'unknown token';
}

/** Problems with the tokens in `text` (unknown tokens, malformed `{v:…}`, unknown glyphs). */
export function tokenProblems(text: string): string[] {
  return parseText(text).problems.map((p) => `${p.message} at ${p.at}`);
}

/** The length of `text` after worst-case substitution (`{name}` 16, `{callsign}` 9, …). */
export function worstCaseLength(text: string): number {
  let n = 0;
  for (const p of parseText(text).parts) {
    if (p.kind === 'text') n += p.text.length;
    else if (p.kind === 'token') n += tokenWorstCase(p.token);
    else if (p.kind === 'verb') n += Math.max(p.plural.length, p.singular.length);
    else n += 1;
  }
  return n;
}

/** Whether `text` uses the `{name}` token. */
export function usesName(text: string): boolean {
  return parseText(text).parts.some((p) => p.kind === 'token' && p.token === 'name');
}

// ─── Maps, acts, and scene ids (style-guide § 5.3) ────────────────────────────────────────────

/** A campaign map's place in the plan (0-based). */
export function mapIndex(map: CampaignMapId): number {
  return CAMPAIGN_PLAN_IDS.indexOf(map);
}

/** Whether `id` is a planned campaign map id. */
export function isCampaignMapId(id: string): id is CampaignMapId {
  return CAMPAIGN_PLAN_IDS.some((m) => m === id);
}

/** The act a campaign map belongs to (`a1_*` → 1, …, `fin_*` → 'finale'). */
export function mapAct(map: CampaignMapId): StoryAct {
  if (map.startsWith('fin_')) return 'finale';
  const act = Number(map.charAt(1));
  return act === 2 ? 2 : act === 3 ? 3 : 1;
}

/** A scene id parsed: its map and its slot; null when malformed (`SCENE_ID`). */
export function parseSceneId(
  id: SceneId,
): { readonly map: CampaignMapId; readonly slot: SceneSlot } | null {
  const m = SCENE_ID.exec(id);
  const map = m?.[1];
  const slot = m?.[2];
  if (map === undefined || slot === undefined || !isCampaignMapId(map)) return null;
  if (slot === 'brief') return { map, slot: { kind: 'brief' } };
  if (slot === 'debrief') return { map, slot: { kind: 'debrief' } };
  if (/^w\d\d$/.test(slot)) {
    const wave = Number(slot.slice(1));
    return wave >= 1 ? { map, slot: { kind: 'radio', wave } } : null;
  }
  const named = /^(cue|scene|base)_(.+)$/.exec(slot);
  const kind = named?.[1];
  const name = named?.[2];
  if (name === undefined) return null;
  if (kind === 'cue') return { map, slot: { kind: 'cue', name } };
  if (kind === 'scene') return { map, slot: { kind: 'scene', name } };
  return { map, slot: { kind: 'base', name } };
}
