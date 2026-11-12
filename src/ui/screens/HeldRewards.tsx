// The rewards a Holdout's card held back (T610; core-loop.md § 6.2 *Held-back toasts*): A3M3's
// card plays identically at any score, so what the run recorded (its medals, the Stardust as gift
// stones, the Intel) is shown once here, at the top of the base it leads to, in Act III's plain
// voice. Set by the router at run end (`heldRewards`), cleared as the base closes.
import { useEffect } from 'preact/hooks';
import { mapName } from '../../meta/index.ts';
import { silkText } from '../silk.ts';
import { heldRewardsLine } from './heldRewards.ts';
import { heldRewards } from './state.ts';
import { StardustIcon } from './Results.tsx'; // T803e: the gift stone's own icon
import './results.css';

/** The held rewards, once, over the base's tabs; nothing when none wait. */
export function HeldRewards() {
  const view = heldRewards.value;
  // Shown once: leaving the base drops them.
  useEffect(() => () => void (heldRewards.value = null), []);
  if (view === null) return null;
  const line = heldRewardsLine(view);
  if (line === '') return null;
  return (
    <p class="sd-base-held" role="status" data-testid="base-held-rewards">
      <span class="sd-base-held-kicker">Recorded · {silkText(mapName(view.mapId))}</span>{' '}
      {view.rewards.stones && <StardustIcon theme={3} />}
      {silkText(line)}
    </p>
  );
}
