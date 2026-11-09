// Suppressing Fire's ability icon (16×16, art-direction §5): three orange rivet-cannon tracers
// raking down onto a stretch of road, sparking where they land. A first pass by T207a so the
// ability validates; the art pass (T210a/T207b) may redraw it.
import { defineSprite } from '../defineSprite.ts';
import { plot, rows } from '../helpers.ts';
import { ICON, iconGrid, rect } from './iconGen.ts';

function suppressingFireIcon(): string[] {
  const g = iconGrid();
  // The road: a lit edge, the deck with a dashed center line, a dark underside.
  rect(g, 0, 9, ICON, 1, '4');
  rect(g, 0, 10, ICON, 2, '2');
  rect(g, 0, 12, ICON, 1, '1');
  for (const x of [1, 6, 11]) rect(g, x, 11, 2, 1, '3');
  // Three tracers, dim tail to white-hot head, each landing in a spark on the road's edge.
  const trail = ['c', 'c', 'd', 'd', 'e', 'e', 'w', 'w'];
  for (const x0 of [1, 5, 9]) {
    for (let i = 0; i < 4; i++) {
      plot(g, x0 + i, 1 + 2 * i, trail[2 * i]!); // i < 4: trail has 8 steps
      plot(g, x0 + i, 2 + 2 * i, trail[2 * i + 1]!);
    }
    plot(g, x0 + 3, 9, 'w');
    plot(g, x0 + 2, 9, 'e');
    plot(g, x0 + 4, 9, 'e');
  }
  return rows(g);
}

export const iconAbilitySuppressingFire = defineSprite({
  id: 'icon.ability.suppressing_fire',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: suppressingFireIcon() },
});
