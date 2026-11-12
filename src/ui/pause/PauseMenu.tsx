// The pause menu (T316; design/core-loop.md § 4): Resume, Retry, and Quit over the frozen battle,
// opened by Esc with nothing to cancel or the HUD's Menu button (app/pause.ts). A real modal: the
// HUD behind it is inert, Tab stays inside, Resume has the focus, and Esc resumes (app/keys.ts).
// Retry and Quit file the run as a loss first (app/navigation.ts); the note says so, cheerfully.
import { quitDestination, quitFromPause, retryFromPause } from '../../app/navigation.ts';
import { campaignScreenName } from '../../app/starMap.ts';
import { openPauseMenu, resumeFromPause } from '../../app/pause.ts';
import { trapTab } from '../dialogue/SceneParts.tsx';
import { focusOnce } from '../screens/focus.ts';
import '../screens/screens.css';
import './pause.css';

/** Quit's label, by where it goes (style-guide.md § 2): the campaign screen by its name. */
const QUIT_LABEL = {
  base: () => 'Quit to base',
  campaign: () => `Quit to ${campaignScreenName()}`,
  title: () => 'Quit to Title',
} as const;

/** The menu over the frozen battle. */
export function PauseMenu() {
  return (
    <div class="sd-screen sd-pause" data-testid="pause-menu">
      <section
        class="sd-panel sd-pause-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sd-pause-heading"
        onKeyDown={trapTab}
      >
        <h1 id="sd-pause-heading" class="sd-pause-heading">
          Shift paused
        </h1>
        <div class="sd-pause-buttons">
          <button
            type="button"
            class="sd-button sd-button-primary"
            ref={focusOnce}
            onClick={resumeFromPause}
          >
            Resume
          </button>
          <button type="button" class="sd-button" onClick={retryFromPause}>
            Retry shift
          </button>
          <button type="button" class="sd-button" onClick={quitFromPause}>
            {QUIT_LABEL[quitDestination()]()}
          </button>
        </div>
        <p class="sd-pause-note" data-voice="note">
          Leaving files the shift as an incident. Pests still count!
        </p>
      </section>
    </div>
  );
}

/** Three bars, 8×8: the menu glyph. */
function MenuGlyph() {
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
      <rect x={1} y={1} width={6} height={1} />
      <rect x={1} y={3} width={6} height={1} />
      <rect x={1} y={5} width={6} height={1} />
    </svg>
  );
}

/** The HUD's Menu button (top right, beside the speaker): opens the pause menu, as Esc does. */
export function MenuButton() {
  return (
    <button
      type="button"
      class="hud-btn chamfer square"
      aria-label="Menu"
      aria-haspopup="dialog"
      title="Menu (Esc)"
      onMouseDown={(e) => e.preventDefault()}
      onClick={openPauseMenu}
    >
      <MenuGlyph />
    </button>
  );
}
