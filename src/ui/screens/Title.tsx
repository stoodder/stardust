// The title screen (T115): the game's name over the animated backdrop (render BackdropScene), one
// Start button, and a little Act I corporate cheer. Copy: Everglow's slogan (story/races.md
// § Everglow Dynamics) and the Act I loading tip (story/style-guide.md §2).
import { startGame } from '../../app/navigation.ts';
import { MuteButton } from '../hud/MuteButton.tsx';
import './screens.css';

/** The title screen. Enter (or a click) on the focused Start button opens the battle. */
export function Title() {
  return (
    <main class="sd-screen sd-title" aria-labelledby="sd-title-heading">
      <div class="sd-title-brand">
        <span class="sd-title-chevron" aria-hidden="true">
          ››
        </span>
        <span>EVERGLOW · Brighter Every Day!</span>
        <span class="sd-title-chevron" aria-hidden="true">
          ‹‹
        </span>
      </div>
      <h1 id="sd-title-heading" class="sd-title-logo">
        Stardust
      </h1>
      <button
        type="button"
        class="sd-button sd-button-primary sd-title-start"
        // Focused on arrival, so Enter starts.
        ref={(el) => el?.focus()}
        onClick={startGame}
      >
        Start shift
      </button>
      <MuteButton class="sd-title-sound" />
      <p class="sd-title-tip">
        <span class="sd-title-tip-label">Tip</span> Remember: a clean perimeter is a happy
        perimeter!
      </p>
    </main>
  );
}
