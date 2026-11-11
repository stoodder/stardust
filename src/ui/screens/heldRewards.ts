// The line the base shows for a Holdout's held-back rewards (T610; HeldRewards.tsx).
import { formatCount } from './format.ts';
import type { HeldRewardsView } from './state.ts';

/** The recap's one line: "Victory, Much Obliged · +320 Stardust · +2 Intel" (only what it paid). */
export function heldRewardsLine(view: HeldRewardsView): string {
  const r = view.rewards;
  const medals = r.medals.filter((m) => m.isNew).map((m) => m.name);
  const parts = [
    ...(medals.length > 0 ? [medals.join(', ')] : []),
    ...(r.stardust.amount > 0 ? [`+${formatCount(r.stardust.amount)} Stardust`] : []),
    ...(r.intel > 0 ? [`+${formatCount(r.intel)} Intel`] : []),
  ];
  return parts.join(' · ');
}
