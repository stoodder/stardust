// Root of the DOM overlay (docs/tech/architecture.md § UI: DOM overlay): picks the current screen.
import { render } from 'preact';
import { assertNever } from '../shared/types.ts';
import { Hud } from './hud/index.tsx';
import { Base } from './screens/Base.tsx';
import { Campaign } from './screens/Campaign.tsx';
import { Intake } from './screens/Intake.tsx';
import { Loadout } from './screens/Loadout.tsx';
import { Results } from './screens/Results.tsx';
import { Settings } from './screens/Settings.tsx';
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
    case 'intake':
      return <Intake />;
    case 'campaign':
      return <Campaign />;
    case 'base':
      return <Base />;
    case 'settings':
      return <Settings />;
    case 'loadout':
      return <Loadout />;
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
