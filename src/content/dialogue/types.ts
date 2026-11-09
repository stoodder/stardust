// Dialogue data shapes (docs/tech/story-runtime.md § Dialogue runner, § Conditions, § Text
// substitution, § Barks). They map one-to-one onto the authoring format in
// docs/story/style-guide.md § 5: speaker ids (§ 5.1), expressions (§ 5.2), ids (§ 5.3), tokens
// (§ 5.4), barks (§ 5.5), special line kinds (§ 5.6), and choices (§ 5.7). Content only: the
// runner, conditions, and token resolution are in src/story/.
import type { CampaignMapId } from '../campaign.ts';
import type { Act, EnemyId, FlagId, TowerId } from '../types.ts';
import type { BooleanFlagId, FlagSet, FlagValueOf } from './flags.ts';
import type { CallsignId } from './profile.ts';

// ─── Speakers and expressions (style-guide § 5.1–5.2) ──────────────────────────────────────────

/** Every speaker id, in style-guide § 5.1's order. Registered in speakers.ts. */
export const SPEAKER_IDS = [
  'player',
  'bricks',
  'quill',
  'sterling',
  'zibzab',
  'vesthara',
  'pebble',
  'goldie',
  'kip',
  'thrum',
  'chitterbloom',
  'prim',
  'gerald',
  'pa',
  'kfa',
  'hollow',
  'narrator',
  'system',
] as const;
export type SpeakerId = (typeof SPEAKER_IDS)[number];

/** Speakers with no portrait expressions: no portrait at all, or Gerald's status icon. */
export type ExpressionlessSpeakerId = 'gerald' | 'pa' | 'kfa' | 'hollow' | 'narrator' | 'system';
/** Speakers with a 48×48 portrait and its expressions. */
export type PortraitSpeakerId = Exclude<SpeakerId, ExpressionlessSpeakerId>;

/** The five base expressions every portrait has. A line naming none uses `neutral`. */
export const BASE_EXPRESSIONS = ['neutral', 'happy', 'worried', 'angry', 'sad'] as const;
export type BaseExpression = (typeof BASE_EXPRESSIONS)[number];

/**
 * Per-speaker extras (style-guide § 5.2; art-direction.md § Portrait roster), each with the base
 * expression art falls back to until its patch exists. QUILL's `policy` is the fair-play tell: a
 * `quill` line uses it if and only if the text starts or ends with "(Per policy.)".
 */
export const EXPRESSION_EXTRAS = {
  quill: { policy: 'neutral' },
  pebble: { singing: 'happy' },
} as const satisfies Partial<Record<PortraitSpeakerId, Readonly<Record<string, BaseExpression>>>>;
type Extras = typeof EXPRESSION_EXTRAS;
export type ExtraExpression = { [S in keyof Extras]: keyof Extras[S] }[keyof Extras];
export type Expression = BaseExpression | ExtraExpression;

/** The expressions speaker `S` can show: the base five plus its extras; none without a portrait. */
export type ExpressionOf<S extends SpeakerId> = S extends ExpressionlessSpeakerId
  ? never
  : S extends keyof Extras
    ? BaseExpression | keyof Extras[S]
    : BaseExpression;

// ─── Ids (style-guide § 5.3) ───────────────────────────────────────────────────────────────────

/**
 * A scene id: `<map_id>_<slot>`, the slot being `brief`, `w<NN>` (radio before wave NN), `cue_<name>`
 * (a map script cue), `debrief`, `scene_<name>` (full-screen), or `base_<name>` (a base
 * conversation topic). A map script's `{ cue }` id is the scene id it plays.
 */
export type SceneId = string;
/** A bark id: `<speaker>_<trigger>_a<act>_<nn>` (`bricks_idle_fire_a1_01`). */
export type BarkId = string;

/** A scene slot as parsed from its id (`sceneSlot` in story/runner.ts reads it). */
export type SceneSlot =
  | { readonly kind: 'brief' }
  | { readonly kind: 'radio'; readonly wave: number }
  | { readonly kind: 'cue'; readonly name: string }
  | { readonly kind: 'debrief' }
  | { readonly kind: 'scene'; readonly name: string }
  | { readonly kind: 'base'; readonly name: string };

/** The scene-id pattern: `<map_id>_<slot>`. */
export const SCENE_ID =
  /^(a[1-3]_m0[1-6]|fin_m01)_(brief|w\d\d|cue_[a-z0-9_]+|debrief|scene_[a-z0-9_]+|base_[a-z0-9_]+)$/;
/** The bark-id pattern: `<speaker>_<trigger>_a<act>_<nn>` (the finale's act is `fin`). */
export const BARK_ID = /^[a-z]+_[a-z0-9_]+_a(1|2|3|fin)_\d\d$/;

// ─── Conditions (story-runtime.md § Conditions) ───────────────────────────────────────────────

/** The acts story conditions can name. */
export type StoryAct = Extract<Act, 1 | 2 | 3 | 'finale'>;

/** A flag test: the flag's value (its registry default while unset) equals `eq`. */
export type FlagCondition = {
  readonly [F in FlagId]: { readonly flag: F; readonly eq: FlagValueOf<F> };
}[FlagId];

/**
 * A story condition: data, never a string. Map order is `CAMPAIGN_PLAN` (content/campaign.ts); "the
 * map" is the one the story is about (the map being briefed, played, or debriefed; at the base, the
 * last map won). `outcome` and `thisRun` read the run that just ended, so they hold only in a
 * debrief, on results, and in run-end barks (D064: C1's lines read *this run*, its payoffs the flag).
 */
export type Condition =
  | FlagCondition
  | { readonly act: StoryAct }
  | { readonly mapAtLeast: CampaignMapId }
  | { readonly mapIs: CampaignMapId }
  | { readonly stat: 'pestsProcessed'; readonly gte: number }
  /** A scene id (or a once-per-campaign bark id) is in the save's `story.seen`. */
  | { readonly seen: string }
  | { readonly outcome: 'won' | 'lost' }
  /** The value `flag`'s run-end rule gives over the run that just ended (FLAG_RULES). */
  | { readonly thisRun: BooleanFlagId; readonly eq: boolean }
  | { readonly all: readonly Condition[] }
  | { readonly any: readonly Condition[] }
  | { readonly not: Condition };

// ─── Text tokens (style-guide § 5.4; story-runtime.md § Text substitution) ───────────────────

/** The plain `{token}`s `story/text.ts` resolves. `{v:<plural>|<singular>}` and `{glyph:<id>}` too. */
export const TEXT_TOKENS = [
  'name',
  'callsign',
  'they',
  'them',
  'their',
  'theirs',
  'themself',
  'They',
  'Them',
  'Their',
  'Theirs',
  'Themself',
  'pests_processed',
  'evacuated',
] as const;
export type TextToken = (typeof TEXT_TOKENS)[number];

/** Inline glyphs `{glyph:<id>}` can name: the Evie sun (memo sign-offs) and the results ★. */
export const GLYPH_IDS = ['sun', 'star'] as const;
export type GlyphId = (typeof GLYPH_IDS)[number];

// ─── Dialogue nodes (style-guide § 5.6–5.8) ───────────────────────────────────────────────────

/**
 * An optional reply button on a radio line or a bark (design/core-loop.md § 6.10): shown for the
 * line's display time, never pausing or blocking. Pressing it applies `set` and plays `reply`;
 * not pressing it is a valid outcome (author the ignored line too).
 */
export interface ReplyButton {
  /** ≤ 16 characters after substitution. */
  readonly label: string;
  readonly set?: FlagSet;
  readonly reply?: SceneId;
}

/** Fields every node may carry. */
interface NodeBase {
  /** A jump target for `goto` and `else` in the same scene. Unique within it. */
  readonly label?: string;
}

/**
 * A spoken line. `text: ''` is a **silence** line: the speaker's frame (dark for an absent one)
 * for `durationSec`, with no text and no typing sound; `durationSec` is required then.
 */
export type LineNode = {
  readonly [S in SpeakerId]: NodeBase & {
    readonly kind: 'line';
    readonly speaker: S;
    readonly expression?: ExpressionOf<S>;
    readonly text: string;
    readonly durationSec?: number;
    /** Radio lines only: an optional reply button (one per line). */
    readonly button?: ReplyButton;
    /** What the playfield points at while the line shows (D059's first-turret ping). */
    readonly point?: 'firstTower';
  };
}[SpeakerId];

/** Tone tags for writers (style-guide § 5.7). */
export type ChoiceTone = 'earnest' | 'wry' | 'quiet';

export interface ChoiceOption {
  /** ≤ 60 characters after substitution. Never previews the payoff. */
  readonly text: string;
  readonly tone: ChoiceTone;
  /** The flags this option sets (style-guide § 5.7: each choice lists the flags it sets). */
  readonly set?: FlagSet;
  /** A label in the same scene; without one the scene continues after the choice. */
  readonly goto?: string;
  /** "{Speaker} will remember that." (C3 and C4 only). */
  readonly remember?: SpeakerId;
}

/** 2–3 options. C1 is never a choice node. */
export interface ChoiceNode extends NodeBase {
  readonly kind: 'choice';
  readonly options: readonly ChoiceOption[];
}

/**
 * Jumps to `goto` when `cond` holds, else to `else` (or on to the next node). The field is `goto`,
 * not `then`: lint refuses thenable object literals.
 */
export interface BranchNode extends NodeBase {
  readonly kind: 'branch';
  readonly cond: Condition;
  readonly goto: string;
  readonly else?: string;
}

/** Sets one flag to one of its declared values. */
export type SetFlagNode = {
  readonly [F in FlagId]: NodeBase & {
    readonly kind: 'set';
    readonly flag: F;
    readonly value: FlagValueOf<F>;
  };
}[FlagId];

/** Sets the player's callsign (Sprout → Thorn at A2M2's debrief → Waykeeper at A3M6's). */
export interface SetCallsignNode extends NodeBase {
  readonly kind: 'set';
  readonly callsign: CallsignId;
}

export interface EndNode extends NodeBase {
  readonly kind: 'end';
}

export type DialogueNode =
  LineNode | ChoiceNode | BranchNode | SetFlagNode | SetCallsignNode | EndNode;

/**
 * A scene: the nodes one trigger plays, in order. Its id's slot says what plays it (`SceneSlot`).
 * Sizes (story-runtime.md § Validation): briefing ≤ 8 lines, radio 1–3, mid-map cue ≤ 4,
 * full-screen ≤ 20, debrief ≤ 6, base topic ≤ 8.
 */
export interface Scene {
  readonly id: SceneId;
  readonly nodes: readonly DialogueNode[];
  /** The scene plays only when this holds (judged when its trigger fires). */
  readonly when?: Condition;
}

// ─── Barks (style-guide § 5.5; design/core-loop.md § 6.3) ─────────────────────────────────────

/** Screens whose entry is a bark trigger (menu events). */
export type MenuScreen = 'base' | 'shop' | 'rnd' | 'engineering' | 'inbox' | 'codex' | 'star_map';

/**
 * What plays a bark: core-loop.md § 6.3's trigger ids (that table owns their exact conditions),
 * plus the Act I radio's event barks and menu events. Each maps to a sim or host event.
 */
export type BarkTrigger =
  | {
      readonly on:
        | 'map_start'
        | 'first_leak'
        | 'perfect_wave'
        | 'low_integrity'
        | 'hold_fire_used'
        | 'not_firing'
        | 'skitterkin_killed_ahead'
        | 'idle'
        | 'ally_hushed'
        | 'skitterkin_hushed'
        /** A build phase from W2 on that opens with BANK_NUDGE_CREDITS banked (D059). */
        | 'bank_nudge'
        /** Entering the map with the bark's `when` flag condition holding; first build phase only. */
        | 'flag';
    }
  | { readonly on: 'wave_start' | 'wave_cleared'; readonly wave?: number; readonly boss?: true }
  | { readonly on: 'tower_built'; readonly tower?: TowerId }
  | { readonly on: 'tower_sold'; readonly tower?: TowerId; readonly tagged?: boolean }
  | { readonly on: 'enemy_killed' | 'enemy_leaked' | 'new_enemy'; readonly enemy: EnemyId }
  | { readonly on: 'boss_phase'; readonly phase?: number }
  /** A neutral unit (Gerald) was hit by the player's fire (A1M3). */
  | { readonly on: 'neutral_hit' }
  /** The battle starts with a newly issued tower in the loadout (meta/hints.ts; D061). */
  | { readonly on: 'tower_issued'; readonly tower: TowerId }
  | { readonly on: 'menu'; readonly screen: MenuScreen };

export type BarkTriggerId = BarkTrigger['on'];

/** One bark: a single line on a trigger. Pools draw without repeats until exhausted. */
export type Bark = {
  readonly [S in SpeakerId]: {
    readonly id: BarkId;
    readonly speaker: S;
    readonly expression?: ExpressionOf<S>;
    /** ≤ 80 characters after substitution; '' is an authored silence (with `durationSec`). */
    readonly text: string;
    readonly durationSec?: number;
    readonly trigger: BarkTrigger;
    /** Act, map, flags, run state (style-guide § 5.5). */
    readonly when?: Condition;
    /** Seconds of sim time before this bark may play again. */
    readonly cooldownSec?: number;
    /** At most once per map (the default for most triggers) or once per campaign (saved). */
    readonly once?: 'map' | 'campaign';
    readonly button?: ReplyButton;
  };
}[SpeakerId];

/** One map's dialogue: its scenes and its map-scoped barks (they fire only on that map). */
export interface MapDialogue {
  readonly map: CampaignMapId;
  readonly scenes: readonly Scene[];
  readonly barks: readonly Bark[];
}
