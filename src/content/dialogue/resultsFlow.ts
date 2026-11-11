// What a map's end plays around its results card, and the story stamps the card can carry
// (design/core-loop.md § 6.2 *Story stamps*; T316). Data, played by app/runFlow.ts:
// - `beforeResults`: full-screen scenes a **win** plays over the frozen battle before Results;
// - `afterResults`: full-screen scenes a **win** plays once its Results is dismissed (any way on);
// - `debriefOnHold`: a **win** plays its debrief's lines on the comms panel over the frozen battle
//   first, during the results hold (D098: A1M5's C1 reaction lands before the party);
// - `debriefAsScene`: a **win** plays its debrief as a full-screen scene before Results, after
//   `beforeResults`, and the card then shows the payroll without its lines (D138: A2M6's Ishael,
//   the act's peak, isn't a few lines under a payroll);
// - `jingles`: the colony jingle, in one of its arrangements, played as a flow scene's line shows
//   (the PA's minor shift change that closes Act II, after A2M6's card);
// - `stamps`: story-only stamps on the card. Each `when` reads the run that just ended (`outcome`,
//   `thisRun`), so a replay shows what that run did, not what the save's flag remembers. Stamps
//   never change rewards.
// A scene listed here plays only once it is registered (content/dialogue/index.ts), so a map's
// flow can be wired before its dialogue lands.
import type { CampaignMapId } from '../campaign.ts';
import type { JingleVariant } from '../presentation.ts';
import { isCampaignMapId } from './rules.ts';
import type { Condition, SceneId } from './types.ts';

/** A story stamp on the results card (core-loop.md § 6.2). */
export interface ResultsStamp {
  /** Unique on the map (snake_case). */
  readonly id: string;
  /** As stamped: capitals in ASCII (the card's Silkscreen), copy owned by style-guide.md § 2. */
  readonly text: string;
  /** When the card carries it, over the run that just ended and the save as it left it. */
  readonly when: Condition;
}

/**
 * The jingle a flow scene plays as one of its lines shows (once, over whatever is on screen; the
 * arrangement is a presentation `JingleVariant`, its cue the audio's `WAVE_CLEAR_CUE`).
 */
export interface FlowJingle {
  /** One of the flow's own scenes. */
  readonly scene: SceneId;
  /** Which of its spoken lines, counting from 0 in the order they play (silences count too). */
  readonly line: number;
  readonly jingle: Exclude<JingleVariant, 'none' | 'song'>;
}

/** One map's results flow. Scene ids are its own `scene_*` slots (style-guide.md § 5.3). */
export interface ResultsFlow {
  readonly beforeResults?: readonly SceneId[];
  readonly afterResults?: readonly SceneId[];
  /** The debrief's lines play on the comms panel as the map is won, before `beforeResults`. */
  readonly debriefOnHold?: boolean;
  /** A win's debrief plays full-screen before Results (after `beforeResults`), not on the card. */
  readonly debriefAsScene?: boolean;
  readonly jingles?: readonly FlowJingle[];
  readonly stamps?: readonly ResultsStamp[];
}

/** Every map's results flow (a map with none plays straight to its card). */
export const RESULTS_FLOW: Readonly<Partial<Record<CampaignMapId, ResultsFlow>>> = {
  // A1M5 · Record Quarter (act1.md § A1M5): Bricks's C1 reaction on the radio, the party, the
  // card, then the stinger. C1's stamp when the Quiet Wave was spared this run (campaign.md § 6.1).
  a1_m05: {
    debriefOnHold: true,
    beforeResults: ['a1_m05_scene_party'],
    afterResults: ['a1_m05_scene_stinger'],
    stamps: [
      {
        id: 'containment_lapse',
        text: 'CONTAINMENT LAPSE',
        when: { all: [{ outcome: 'won' }, { thisRun: 'spared_quiet_wave', eq: true }] },
      },
    ],
  },
  // A2M6 · Sundown (act2.md § A2M6): Act II's close. Ves'thara's debrief (Ishael) full-screen
  // before the card. No memo from Sterling: after the card, the
  // dark, the PA's shift change, and the jingle once in minor as its caption shows; then the base
  // (QUILL's loophole, Pebble's hum) and the Sector map at night.
  a2_m06: {
    // Ishael (D138): the debrief is the act's peak, so it plays as a scene before the card.
    debriefAsScene: true,
    afterResults: ['a2_m06_scene_stinger'],
    jingles: [{ scene: 'a2_m06_scene_stinger', line: 2, jingle: 'minor' }],
  },
  // A3M1 · The Preserve (act3.md § A3M1): the Leaving Song, full-screen over the emptied road
  // after W14 (the map is won once the last refugee is out), then the card with the gift stones.
  a3_m01: { beforeResults: ['a3_m01_scene_song'] },
};

/** Map `map`'s results flow (an empty one when it has none). */
export function resultsFlow(map: string): ResultsFlow {
  return isCampaignMapId(map) ? (RESULTS_FLOW[map] ?? {}) : {};
}
