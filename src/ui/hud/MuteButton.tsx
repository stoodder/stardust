// The sound toggle (T205): a 16×16 HUD button with an 8×8 pixel speaker glyph, on the HUD's top
// right and the title screen. M toggles it too (app/keys.ts). Pressed means muted.
import { settings, toggleMute } from '../../app/settings.ts';

/** The 8×8 glyph's pixels, [x, y]: the speaker, then its sound waves or a cross. */
const SPEAKER: readonly (readonly [number, number, number, number])[] = [
  [0, 3, 2, 2],
  [2, 2, 1, 4],
  [3, 1, 1, 6],
];
const WAVES: readonly (readonly [number, number])[] = [
  [5, 3],
  [5, 4],
  [6, 1],
  [7, 2],
  [7, 3],
  [7, 4],
  [7, 5],
  [6, 6],
];
const CROSS: readonly (readonly [number, number])[] = [
  [5, 2],
  [7, 2],
  [6, 3],
  [5, 4],
  [7, 4],
];

function SpeakerGlyph({ muted }: { muted: boolean }) {
  return (
    <svg
      class="hud-glyph"
      width="8"
      height="8"
      viewBox="0 0 8 8"
      shape-rendering="crispEdges"
      aria-hidden="true"
      fill="currentColor"
    >
      {SPEAKER.map(([x, y, w, h]) => (
        <rect key={`s${x}`} x={x} y={y} width={w} height={h} />
      ))}
      {(muted ? CROSS : WAVES).map(([x, y]) => (
        <rect key={`${x},${y}`} x={x} y={y} width={1} height={1} />
      ))}
    </svg>
  );
}

/** Mutes or unmutes all audio. Its state persists (app/settings.ts). */
export function MuteButton({ class: extra = '' }: { class?: string }) {
  const muted = settings.value.audio.muted;
  return (
    <button
      type="button"
      class={`hud-btn chamfer square ${extra}`}
      aria-pressed={muted}
      aria-label="Mute sound"
      title={muted ? 'Sound off (M)' : 'Sound on (M)'}
      onMouseDown={(e) => e.preventDefault()}
      onClick={toggleMute}
    >
      <SpeakerGlyph muted={muted} />
    </button>
  );
}
