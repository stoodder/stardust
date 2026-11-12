// The post-game shell's core half (T863; design/core-loop.md § 1.1 *After the finale*, § 2.8;
// design/maps.md § 8): the seams the finale's lazy chunk fills, and the little state the core reads.
// Everything with weight (the post-game plate and its panels, Endless's generator, the dawn
// chart's look, the Endless score screen) is in the finale's screens chunk (app/acts/postGame.ts
// registers it, `registerPostGame`), so none of it reaches the initial JS (architecture.md § 5,
// *Bundle*). This file imports signals and types only, so battleSetup.ts, the HUD, and Results can
// read it without pulling anything else in.
import { computed, signal } from '@preact/signals';
import type { ComponentType } from 'preact';
import type { DawnChartLook, StarMapEnding } from '../content/sprites/starmap/dawn.ts';
import type { IdSpace } from '../content/types.ts';
import type { SimConfig } from '../sim/index.ts';
import { campaign } from '../ui/screens/state.ts';

/** Endless's map (design/maps.md § 8; T861). */
export const ENDLESS_MAP_ID = 'end_m01';

/** One counter block of an Endless run, as the HUD's Next line names it. */
export interface EndlessBlockView {
  readonly first: number;
  readonly last: number;
  /** Its required counters' names ("Armor"), none for the warm-up. */
  readonly counters: readonly string[];
  /** The counters it brings that the run hadn't required before. */
  readonly fresh: readonly string[];
}

/** The Endless run a battle config was built for: its seed and its blocks. */
export interface EndlessRunView {
  readonly map: string;
  readonly seed: number;
  readonly blocks: readonly EndlessBlockView[];
}

/** An Endless run's end, for the score screen (it shows in the results card's place). */
export interface EndlessResultView {
  readonly map: string;
  readonly seed: number;
  /** The score: waves fully resolved before the core fell (sim/endless.ts `endlessWavesHeld`). */
  readonly held: number;
  /** The seed's best before this run, or null (a first run on it, or no save). */
  readonly bestBefore: number | null;
  /** The run set the seed's best (it was recorded). */
  readonly newBest: boolean;
  /** The save's records after the run, best first (meta/endless.ts `endlessScores`). */
  readonly scores: readonly { readonly seed: number; readonly wave: number }[];
  /** No save in play (a `?map=end_m01` dev battle): nothing was recorded. */
  readonly recorded: boolean;
}

/** What the post-game plate needs from the core star map. */
export interface PostGameLayerProps {
  /** The selected post-game map's id, or null while a campaign node is selected. */
  readonly selected: string | null;
  /** Selects a post-game map (its panel shows in the node panel's place). */
  readonly select: (id: string) => void;
  /** The screen just opened: the first entry's Start takes the focus once placed. */
  readonly arrival: boolean;
}

/** The finale's lazy half of the post-game shell, registered as its chunk loads. */
export interface PostGameUi {
  /** The `dawn` chart's look for C5's answer (content/sprites/starmap/dawn.ts). */
  readonly dawnLook: (ending: StarMapEnding | null) => DawnChartLook;
  /** The post-game plate and the selected entry's panel, over the chart. */
  readonly Layer: ComponentType<PostGameLayerProps>;
  /** The Endless score screen, in the results card's place after an Endless run. */
  readonly EndlessScore: ComponentType<{ readonly result: EndlessResultView }>;
  /** The first post-game map listed (the arrival's selection), or null when none is registered. */
  readonly firstEntry: () => string | null;
  /**
   * A battle config with its run's content: on Endless, the seed's generated waves
   * (`endlessContent`) and the run's blocks; null for any other map (the config as built).
   */
  readonly runContent: (
    cfg: SimConfig<IdSpace>,
  ) => { readonly cfg: SimConfig<IdSpace>; readonly run: EndlessRunView } | null;
}

/** The registered lazy half, or null before the finale's screens load. */
export const postGameUi = signal<PostGameUi | null>(null);

/** Registers the post-game shell's lazy half (app/acts/postGame.ts). */
export function registerPostGame(ui: PostGameUi): void {
  postGameUi.value = ui;
}

/** The Endless run the latest Endless battle config was built for (the HUD's Next line). */
export const endlessRun = signal<EndlessRunView | null>(null);

/** The last run's Endless score, or null when the last run wasn't Endless. */
export const endlessResult = signal<EndlessResultView | null>(null);

/**
 * `cfg` with its run's content (battleSetup.ts `battleConfig`): an Endless config gets its seed's
 * generated waves once the finale's chunk has registered the generator; any other as it is.
 */
export function withRunContent(cfg: SimConfig<IdSpace>): SimConfig<IdSpace> {
  const out = postGameUi.peek()?.runContent(cfg) ?? null;
  if (out === null) return cfg;
  const was = endlessRun.peek();
  if (was?.map !== out.run.map || was.seed !== out.run.seed) endlessRun.value = out.run;
  return out.cfg;
}

/**
 * The fastest game speed the save in play allows (core-loop.md § 2.8): 3× once the finale is won
 * (the post-game unlock; no frontier left), else 2×. Outside a campaign, 2×.
 */
export const fastestSpeed = computed<2 | 3>(() =>
  campaign.value !== null && campaign.value.frontier === null ? 3 : 2,
);
