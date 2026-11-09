// Suppressing Fire: Sgt. Bricks's companion ability (slot 2), inherited as a Technician ability
// from A3M5. Numbers: design/core-loop.md § 3.2 (a targeted 3-tile path segment; enemies on it
// are slowed 50% and take 20 Kinetic/s for 5 s; 50 s cooldown). D031 fixes the segment: the
// clicked path tile ±1 along each route through it. Rulings (T207a): the slow lands as Chilled
// 50% (the strongest-source rule, so it doesn't stack with a Sprinkler's chill), and the damage
// lands in 0.25 s beam ticks with armor prorated per tick (enemies.md § 2.3), so armor blunts it
// as it does a beam and it isn't an armor answer.
import { defineAbility } from '../define.ts';

export const suppressing_fire = defineAbility({
  id: 'suppressing_fire',
  name: 'Suppressing Fire',
  cooldownSec: 50,
  effect: {
    kind: 'segment',
    type: 'kinetic',
    damagePerSec: 20,
    slowPct: 0.5,
    durationSec: 5,
    lengthTiles: 3,
  },
  companion: 'bricks',
  sprites: { icon: 'icon.ability.suppressing_fire' },
});
