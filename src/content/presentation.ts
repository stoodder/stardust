// Per-act presentation dials (docs/design/core-loop.md § 6.7): the presentation that changes with
// the act, as data, so a map's tone can be tuned without code. One table keyed by act, plus
// per-map overrides, and overrides keyed on a scene seen; story/presentation.ts resolves a map's dials. The values are core-loop
// § 6.7's defaults (the results line § 6.2, the Skitterkin death enemies.md § 8, the UI theme
// art-direction § 9 *Act themes*). The copy of each tip is style-guide § 2's.
import type { CampaignMapId } from './campaign.ts';
import type { StoryAct } from './dialogue/types.ts';

/**
 * The results counter (core-loop § 6.2; story/counter.ts draws it): Act I's starred brag, Act II's
 * plain line, Act III's meter line in its place, the finale's REMEMBERED.
 */
export type CounterStyle = 'starred' | 'plain' | 'meter' | 'remembered';

/**
 * How a Skitterkin enemy dies (enemies.md § 8): a confetti pop and a squeak (Act I); a pop and a
 * small, sad squeak (Act II); a still body that lingers briefly (Act III); none die (the finale).
 */
export type SkitterkinDeath = 'confetti' | 'sad_squeak' | 'linger' | 'none';

/** The Tidybots after each wave: on, on and seen unloading at the plant (A2M4), or gone. */
export type TidybotMode = 'on' | 'unloading' | 'off';

/** The Evie billboards' state (art-direction § 6): `dark` has the hum-glyph over the smile. */
export type EvieState = 'beaming' | 'peeling' | 'dark';

/**
 * The wave-clear jingle: the bright sting (Act I), the sting with minor bridges (Act II), the
 * minor arrangement (once A2M4's truth scene is seen), none (Act III), the song (the finale;
 * architecture § Audio).
 */
export type JingleVariant = 'bright' | 'minor_bridges' | 'minor' | 'none' | 'song';

/**
 * How the Hollow sound as they die (enemies.md § 8): `unravel`, the faint backwards hiss (Act II
 * on); `silent`, no sound at all (Act III: the silence is the effect; T601d).
 */
export type HollowDeath = 'unravel' | 'silent';

/** One map's presentation. */
export interface PresentationDials {
  readonly counter: CounterStyle;
  /** The loading-tip pool (≤ TEXT_LIMITS.tip each, no tokens); a screen shows one. */
  readonly loadingTips: readonly string[];
  readonly skitterkinDeath: SkitterkinDeath;
  readonly tidybots: TidybotMode;
  readonly evie: EvieState;
  readonly jingle: JingleVariant;
  /**
   * Whether a won map plays the win jingle (the "PERIMETER SECURED!" fanfare). Off in Act III, where
   * the jingle stops playing and QUILL notices ("...No song."); the finale's win is M8's (the song).
   */
  readonly winJingle: boolean;
  /** How the Hollow sound as they die (enemies.md § 8). */
  readonly hollowDeath: HollowDeath;
  /** The UI act theme: the `data-act` value on the UI root (art-direction § 9 *Act themes*). */
  readonly theme: StoryAct;
  /**
   * Results shows no medal toasts or reward fanfare; rewards are recorded silently (A3M3's
   * Holdout, core-loop § 6.2 *Held-back toasts*).
   */
  readonly holdRewardToasts: boolean;
}

/** A map's changes to its act's dials. */
export type PresentationOverride = Partial<PresentationDials>;

/**
 * A story moment's change to the dials: once `scene` is in the save's `story.seen`, maps of
 * `acts` take `dials` over their act's row (a map's own overrides still win). Live mid-battle:
 * the scene is saved as seen as it ends, and a reader that asks again gets the new dials.
 */
export interface SceneOverride {
  /** A registered scene id (presentation.test.ts checks it). */
  readonly scene: string;
  readonly acts: readonly StoryAct[];
  readonly dials: PresentationOverride;
}

export interface PresentationTable {
  readonly byAct: Readonly<Record<StoryAct, PresentationDials>>;
  /** In order; a later one wins where two set the same dial. */
  readonly afterScene: readonly SceneOverride[];
  readonly byMap: Readonly<Partial<Record<CampaignMapId, PresentationOverride>>>;
}

export const PRESENTATION: PresentationTable = {
  byAct: {
    1: {
      counter: 'starred',
      loadingTips: ['Remember: a clean perimeter is a happy perimeter!'],
      skitterkinDeath: 'confetti',
      tidybots: 'on',
      evie: 'beaming',
      jingle: 'bright',
      winJingle: true,
      hollowDeath: 'unravel',
      theme: 1,
      holdRewardToasts: false,
    },
    2: {
      counter: 'plain',
      loadingTips: ['Remember: a clean perimeter.'],
      skitterkinDeath: 'sad_squeak',
      tidybots: 'on',
      evie: 'peeling',
      jingle: 'minor_bridges',
      winJingle: true,
      hollowDeath: 'unravel',
      theme: 2,
      holdRewardToasts: false,
    },
    3: {
      counter: 'meter',
      loadingTips: ['Remember.'],
      skitterkinDeath: 'linger',
      tidybots: 'off',
      evie: 'dark',
      jingle: 'none',
      winJingle: false,
      hollowDeath: 'silent',
      theme: 3,
      holdRewardToasts: false,
    },
    finale: {
      counter: 'remembered',
      // The post-game's tip (core-loop § 6.8); the finale's own column names no other.
      loadingTips: ['Remember them.'],
      skitterkinDeath: 'none',
      tidybots: 'off',
      evie: 'dark',
      jingle: 'song',
      winJingle: true,
      hollowDeath: 'unravel',
      theme: 'finale',
      holdRewardToasts: false,
    },
  },
  // Act II's jingle turns minor once the player has asked where stardust comes from (A2M4's
  // truth scene, act2.md § A2M4): mid-battle, from the next wave clear, and on every Act II map
  // after, replays included.
  afterScene: [{ scene: 'a2_m04_scene_truth', acts: [2], dials: { jingle: 'minor' } }],
  byMap: {
    a2_m04: { tidybots: 'unloading' },
    a3_m03: { holdRewardToasts: true },
  },
};
