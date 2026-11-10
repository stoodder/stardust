// Root of the DOM overlay (docs/tech/architecture.md § UI: DOM overlay): picks the current screen.
import { computed, effect } from '@preact/signals';
import { render } from 'preact';
import { presentationBetweenMaps } from '../story/presentation.ts';
import { assertNever } from '../shared/types.ts';
import { SceneLayer } from './dialogue/SceneLayer.tsx';
import { Hud } from './hud/index.tsx';
import { Base } from './screens/Base.tsx';
import { Campaign } from './screens/Campaign.tsx';
import { Intake } from './screens/Intake.tsx';
import { Loadout } from './screens/Loadout.tsx';
import { Results } from './screens/Results.tsx';
import { Settings } from './screens/Settings.tsx';
import { Title } from './screens/Title.tsx';
import { campaign, runResult } from './screens/state.ts';
import { hud, screen } from './state.ts';

/** The overlay's root component: the current screen, and a scene holding input over it. */
export function Overlay() {
  return (
    <>
      <Screen />
      <SceneLayer />
    </>
  );
}

/** The current screen. */
function Screen() {
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

/**
 * The UI act theme on the root (art-direction § 9 *Act themes*; a presentation dial, core-loop.md
 * § 6.7): a battle's and its Results' are the map's; the campaign's menus (the Base, the loadout
 * screen, Settings) take the next map's, so Act II's orange edges arrive with A1M5 won; the Title
 * and the intake are Everglow's front door, Act I's. The HUD, Results, and the star map also set
 * their own `data-act`, which wins inside them.
 */
export const uiTheme = computed((): string => {
  const current = screen.value;
  if (current === 'battle') return hud.act.value;
  if (current === 'results') return String(runResult.value?.theme ?? hud.act.value);
  if (current === null || current === 'title' || current === 'intake') return '1';
  const c = campaign.value;
  return c === null ? '1' : String(presentationBetweenMaps(c.frontier).theme);
});

/** Mounts the overlay into the `#ui` root, which carries the UI act theme (`data-act`). */
export function mountUi(root: HTMLElement): void {
  effect(() => {
    root.dataset['act'] = uiTheme.value;
  });
  render(<Overlay />, root);
}
