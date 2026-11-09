// The dialogue view model (docs/tech/story-runtime.md § Dialogue runner; art-direction.md
// § Dialogue presentation): the comms panel's line (radio, barks, non-pausing scenes) and the scene
// on screen (the briefing, a pausing bottom panel, or a full-screen scene). app/dialogue.ts writes
// these; the components only read them and act through app/dialogue.ts.
import { computed, signal } from '@preact/signals';
import type { ColorName } from '../../content/palettes/master.ts';
import type { SpeakerFrame } from '../../content/dialogue/speakers.ts';
import type { ChoiceTone, SpeakerId } from '../../content/dialogue/types.ts';

/** How a scene is staged. */
export type SceneMode = 'briefing' | 'panel' | 'fullscreen';

/** A portrait as one line shows it (art-direction.md § Portrait roster). */
export interface PortraitView {
  /** `portrait.<speaker>` (Gerald's is his 16×16 icon sprite). */
  readonly sprite: string;
  /** The variant the speaker's rules picked (`party_hat`), or null for the base frame. */
  readonly variant: string | null;
  /** The line's expression (`neutral` when it names none), before art fallbacks. */
  readonly expression: string;
  /** The absent speaker's `dark` bake (a silence line for someone not on the radio). */
  readonly dark: boolean;
  /** Gerald: a 16×16 icon with status text, not a 48×48 bust. */
  readonly icon: boolean;
  /** QUILL's `policy` tell: one 125 ms gold frame as the line starts (`policy_in`). */
  readonly policy: boolean;
}

/** One spoken line, ready to draw. `id` changes with every line shown. */
export interface LineView {
  readonly id: number;
  readonly speaker: SpeakerId;
  /** The name plate ('' for the Hollow and the narrator). */
  readonly name: string;
  readonly color: ColorName;
  readonly frame: SpeakerFrame;
  readonly portrait: PortraitView | null;
  /** Tokens resolved, "&" spelled out; `*word*` still marks the emphasis. '' for a silence. */
  readonly text: string;
  readonly silence: boolean;
  /** The playfield points at the first-built turret while it shows (D059's Denise pointer). */
  readonly point: boolean;
}

/** The comms panel (top-left, never blocking): one line, the line it follows, and its button. */
export interface CommsView {
  readonly line: LineView;
  /** The scene's previous line when this one answers it (another speaker), kept up above it. */
  readonly cue: LineView | null;
  /** An optional reply button's label (core-loop.md § 6.10), or null. */
  readonly button: string | null;
}

export interface ChoiceView {
  readonly text: string;
  readonly tone: ChoiceTone;
}

/** The scene on screen (it holds input; the briefing, a panel, or full-screen). */
export interface SceneView {
  readonly sceneId: string;
  readonly mode: SceneMode;
  /** The lines already said, in order (the briefing and full-screen scenes show them). */
  readonly transcript: readonly LineView[];
  /** The line on screen (typing, then waiting for Next), or null at a choice or the end. */
  readonly line: LineView | null;
  /** The options while the scene waits on a choice, else null. */
  readonly choices: readonly ChoiceView[] | null;
  /** "{Speaker} will remember that." after a C3/C4 choice, until the next advance. */
  readonly remember: string | null;
  /** The scene has played out (the briefing then waits on Clock in). */
  readonly ended: boolean;
  /** Text shows whole, with no typewriter (dialogue off under `?test=1`). */
  readonly instant: boolean;
  /** The line's typewriter: when it started (performance.now), and whether Next finished it. */
  readonly typing: { readonly from: number; readonly done: boolean };
}

export const dialogue = {
  /** The comms panel's line, or null when it's empty. */
  comms: signal<CommsView | null>(null),
  /** The scene holding input, or null. */
  scene: signal<SceneView | null>(null),
};

/** The line being spoken now (the scene's, else the comms panel's): the voice blips and duck. */
export const speaking = computed<LineView | null>(
  () => dialogue.scene.value?.line ?? dialogue.comms.value?.line ?? null,
);

/** Whether a scene holds input (hotkeys off, the HUD inert): any but the briefing's own flag. */
export const sceneBlocks = computed(() => {
  const s = dialogue.scene.value;
  return s !== null && s.mode !== 'briefing';
});
