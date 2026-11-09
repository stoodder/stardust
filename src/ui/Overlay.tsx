// Root of the DOM overlay (docs/tech/architecture.md § UI: DOM overlay).
// T101 placeholder: the real Title screen arrives in T115.
import { render } from 'preact';
import { screen } from './state.ts';

/** The overlay's root component: picks the current screen. */
export function Overlay() {
  if (screen.value === 'title') {
    return (
      <main class="screen title">
        <h1>Stardust</h1>
        <p>Scaffold build</p>
      </main>
    );
  }
  return null;
}

/** Mounts the overlay into the `#ui` root. */
export function mountUi(root: HTMLElement): void {
  render(<Overlay />, root);
}
