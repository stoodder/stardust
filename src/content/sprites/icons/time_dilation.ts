// Time Dilation's ability icon (QUILL's companion ability): a teal clock face in a white rim, its
// minute hand dragging a fading trail, so the icon reads "slowed time" at 16×16.
import { defineSprite } from '../defineSprite.ts';
import { disc, line, plot, rows } from '../helpers.ts';
import { ICON, iconGrid } from './iconGen.ts';

function timeDilationIcon(): string[] {
  const g = iconGrid();
  disc(g, 7, 7, 6.5, (d, x, y) => (d > 5.6 ? (x + y < 12 ? 'w' : '4') : d > 4.8 ? '7' : '6'));
  // Hour ticks at 12, 3, 6, and 9.
  for (const [x, y] of [
    [6, 2],
    [11, 6],
    [6, 11],
    [2, 6],
  ] as const) {
    plot(g, x, y, '8');
  }
  line(g, 6, 6, 6, 3, 'w');
  line(g, 6, 6, 9, 9, 'w');
  // The trail the minute hand drags behind it: fading steps.
  plot(g, 10, 8, '9');
  plot(g, 10, 7, '8');
  plot(g, 9, 5, '7');
  plot(g, 6, 6, '*');
  return rows(g);
}

export const iconAbilityTimeDilation = defineSprite({
  id: 'icon.ability.time_dilation',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: timeDilationIcon() },
});
