// Scanner Sweep's ability icon (16×16, art-direction §5; design/core-loop.md: reveals cloaked
// enemies in a 4-tile circle): a round Everglow scope in a white rim, its green sweep wedge trailing
// fading steps behind the beam, and a blip caught in the four corner brackets of the Revealed mark
// (art-direction §8: detection's `green.4`).
import { defineSprite } from '../defineSprite.ts';
import { disc, line, plot, rows } from '../helpers.ts';
import { ICON, iconGrid } from './iconGen.ts';

function scannerSweepIcon(): string[] {
  const g = iconGrid();
  disc(g, 7, 7, 6.5, (d, x, y) => (d > 5.6 ? (x + y < 12 ? 'w' : '3') : d > 4.8 ? '1' : '0'));
  // The range rings.
  disc(g, 7, 7, 3, (d) => (d > 2.3 ? 'H' : '0'));
  // The sweep: the beam, and the wedge behind it fading in steps.
  line(g, 7, 7, 11, 3, 'G');
  line(g, 7, 7, 10, 2, 'H');
  line(g, 7, 7, 8, 2, 'F');
  plot(g, 9, 3, 'H');
  plot(g, 6, 7, 'G');
  plot(g, 7, 6, 'w');
  // The revealed blip, bracketed.
  plot(g, 4, 9, 'w');
  for (const [x, y] of [
    [2, 7],
    [6, 7],
    [2, 11],
    [6, 11],
  ] as const) {
    plot(g, x, y, 'G');
  }
  plot(g, 3, 7, 'G');
  plot(g, 5, 7, 'G');
  plot(g, 3, 11, 'G');
  plot(g, 5, 11, 'G');
  return rows(g);
}

export const iconAbilityScannerSweep = defineSprite({
  id: 'icon.ability.scanner_sweep',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  legend: { G: 'green.4', H: 'green.3', F: 'green.1' },
  frames: { icon: scannerSweepIcon() },
});
