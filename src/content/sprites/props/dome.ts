// A Dome Row habitat (apron decor, act1.md § A1M1: the road swings east along the domes):
// a white Everglow dome on a steel ring, a teal band, lit window slits, and a round door.
// `window` (A2M6's `dome_window`, act2.md § A2M6; T540c): Dome 3, an orange "3" on its band and a
// round window on its lit side, warm inside, where rows of butterhead lettuce grow and a small
// coral shape sleeps curled among them (Pebble; T530b lights it in the dark). `dark` (Act III's
// apron, T640c): the Long Night's dome, its shell two steps darker under the moons and its window
// slits out but one on emergency red. `open`, `frost_1`, `frost_2` (A3M6, act3.md § A3M6: Goldie has
// opened Dome 1 beside the gate, "for the first time it is cold inside; the panes frost over"): the
// Long Night's shell with its round door slid wide, lit warm inside, the light spilling onto the
// ground, its slits lit again; then frost creeping up the shell from the ring and riming the slits,
// in two steps (T730b steps it as the map goes on).
import { defineSprite } from '../defineSprite.ts';
import { grid, hash01, isoBox, plot, rows, stamp } from '../helpers.ts';

const W = 30;
const H = 24;
const CX = 15;
const FOOT_Y = 18;

type Look = 'v0' | 'window' | 'dark' | 'open' | 'frost_1' | 'frost_2';

/** How far frost has crept over an open dome (A3M6): none, then two steps. */
function frostOf(look: Look): number {
  return look === 'frost_1' ? 1 : look === 'frost_2' ? 2 : 0;
}

function domeGrid(look: Look = 'v0'): string[] {
  const g = grid(W, H);
  isoBox(g, CX, FOOT_Y + 1, 14, 0, { top: '_', rim: '_', left: '_', right: '_' });
  isoBox(g, CX, FOOT_Y, 13, 2, { top: '2', rim: '3', left: '1', right: '0' });
  // The shell: a half-ellipse lit from the upper left.
  const rx = 12;
  const ry = 13;
  const by = FOOT_Y - 2;
  for (let y = by - ry; y < by; y++) {
    for (let x = CX - rx; x < CX + rx; x++) {
      const dx = (x + 0.5 - CX) / rx;
      const dy = (y + 0.5 - by) / ry;
      const d = Math.hypot(dx, dy);
      if (d > 1) continue;
      const lit = -0.7 * dx - 0.7 * dy;
      // In the Long Night (`dark`) the shell is lit only by the moons: two steps down.
      const night = look !== 'v0' && look !== 'window';
      const shell = lit > 0.75 && d < 0.8 ? 'w' : lit > 0.35 ? '4' : lit > -0.15 ? '3' : '2';
      plot(g, x, y, night ? ({ w: '3', '4': '2', '3': '1', '2': '0' }[shell] ?? shell) : shell);
    }
  }
  // The teal band, then window slits glowing along it.
  for (let x = CX - rx + 1; x < CX + rx - 1; x++) plot(g, x, by - 4, x < CX ? '8' : '7');
  for (const x of [CX - 8, CX - 4, CX + 4, CX + 8]) {
    // In the Long Night (`dark`) the slits are out but one, on emergency red.
    // Open (A3M6) the lights are back on inside: the slits glow warm.
    const red = look === 'dark' && x === CX + 4;
    const out = look === 'dark';
    const warm = look === 'open' || look === 'frost_1' || look === 'frost_2';
    plot(g, x, by - 6, out ? (red ? 'R' : 'k') : warm ? 'H' : '+');
    plot(g, x + 1, by - 6, out ? (red ? 'S' : 'k') : warm ? 'Y' : '*');
  }
  if (look === 'open' || look === 'frost_1' || look === 'frost_2') {
    // Dome 1 open to the Long Night (A3M6): the round door slid wide, the inside lit warm, the
    // light spilling out down the ring onto the ground in front.
    // prettier-ignore
    const door = [
      '..1111..',
      '.1HHHH1.',
      '1HHHHHH1',
      '1HYYYYH1',
      '1YYYYYY1',
      '1YYYYYY1',
      '.HOHOHO.',
      '..OHOH..',
    ];
    stamp(g, CX - 4, by - 6, door);
  } else {
    // The round door, front and center.
    for (let y = by - 4; y < by; y++) {
      for (let x = CX - 2; x < CX + 2; x++) plot(g, x, y, y === by - 4 ? '1' : '0');
    }
    plot(g, CX + 1, by - 2, 'd');
  }
  const frost = frostOf(look);
  if (frost > 0) {
    // Frost creeping up the shell from the ring, rime on the window slits: the cold gets in.
    for (let y = by - ry; y < by; y++) {
      for (let x = CX - rx; x < CX + rx; x++) {
        const ch = g[y]?.[x] ?? '.';
        if (!'0123w'.includes(ch)) continue;
        const reach = (by - y) / ry; // 0 at the ring, 1 at the crown
        const n = hash01(x, y, 61);
        if (n < (frost === 1 ? 0.55 : 0.85) - reach * (frost === 1 ? 1.1 : 0.9)) {
          plot(g, x, y, n < 0.12 ? 'I' : 'F');
        }
      }
    }
    for (const x of [CX - 8, CX - 4, CX + 4, CX + 8]) {
      if (frost === 2 || x < CX) plot(g, x + 1, by - 6, 'F');
    }
  }
  if (look === 'window') {
    // The round window on the lit side: warm light, two rows of lettuce, Pebble asleep in them.
    // prettier-ignore
    const win = [
      '..1111..',
      '.1GGGG1.',
      '1GLGGLG1',
      '1MLPQLM1',
      '1LMPPML1',
      '.1LMML1.',
      '..1111..',
    ];
    stamp(g, CX - 10, by - 12, win);
    // "3" on the band's shaded side.
    // prettier-ignore
    const three = ['cc.', '..c', '.c.', '..c', 'cc.'];
    stamp(g, CX + 5, by - 11, three);
  }
  return rows(g);
}

export const propDome = defineSprite({
  id: 'prop.dome',
  size: { w: W, h: H },
  anchor: { x: CX, y: FOOT_Y },
  palette: 'everglow',
  variants: ['everglow.worn'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  legend: {
    G: 'gold.4',
    L: 'green.3',
    M: 'green.2',
    P: 'coral.3',
    Q: 'coral.4',
    R: 'red.2',
    S: 'red.3',
    // Open (A3M6): the warm inside, and the frost.
    O: 'orange.2',
    H: 'orange.3',
    Y: 'gold.4',
    F: 'blue.4',
    I: 'white.1',
  },
  frames: {
    v0: domeGrid(),
    window: domeGrid('window'),
    dark: domeGrid('dark'),
    open: domeGrid('open'),
    frost_1: domeGrid('frost_1'),
    frost_2: domeGrid('frost_2'),
  },
});
