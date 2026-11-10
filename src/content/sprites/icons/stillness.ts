// Stillness's ability icon (Ves'thara's companion ability, design/core-loop.md: a circle of Stasis
// for 3 s): her open hand raised palm-out ("be still"), woven sapphire with a knot of light in
// the palm, inside a ring of stasis crystal (`blue.4` lit `white.1` at the upper left, the Stasis
// rim's colours, art-direction §8) that holds the whole circle still. The hand reads "stop" at 16×16
// in any colour vision; the ring says it holds an area.
import { defineSprite } from '../defineSprite.ts';
import { disc, plot, rows } from '../helpers.ts';
import { ICON, iconGrid } from './iconGen.ts';

function stillnessIcon(): string[] {
  const g = iconGrid();
  // The ring of stasis crystal, a gap of air inside it.
  disc(g, 7, 7, 7, (d, x, y) => (d > 6 ? (x + y < 11 ? 'w' : '4') : '.'));
  // prettier-ignore
  const hand = [
    '...3.3.3.....',
    '...3.3.3.3...',
    '...3.3.3.3...',
    '...434343....',
    '.3.433332....',
    '..34+*332....',
    '..3433332....',
    '...43332.....',
    '....4332.....',
    '....432......',
  ];
  hand.forEach((r, dy) => {
    for (let dx = 0; dx < r.length; dx++) {
      const c = r.charAt(dx);
      if (c !== '.') plot(g, 1 + dx, 2 + dy, c);
    }
  });
  // A ruby thread round the wrist.
  plot(g, 5, 11, 'd');
  plot(g, 6, 11, 'c');
  return rows(g);
}

export const iconAbilityStillness = defineSprite({
  id: 'icon.ability.stillness',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'aelari',
  outline: 'auto',
  frames: { icon: stillnessIcon() },
});
