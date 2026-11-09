// Root of the DOM overlay (docs/tech/architecture.md § UI: DOM overlay): picks the current screen.
import { render } from 'preact';
import { assertNever } from '../shared/types.ts';
import { Hud } from './hud/index.tsx';
import { Results } from './screens/Results.tsx';
import { Title } from './screens/Title.tsx';
import { screen } from './state.ts';

/** The overlay's root component: picks the current screen. */
export function Overlay() {
  const current = screen.value;
  switch (current) {
    case null:
      return null;
    case 'title':
      return <Title />;
    case 'battle':
      return <Hud />;
    case 'results':
      return <Results />;
    default:
      return assertNever(current);
  }
}

/** Mounts the overlay into the `#ui` root. */
export function mountUi(root: HTMLElement): void {
  render(<Overlay />, root);
}
