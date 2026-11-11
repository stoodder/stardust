// The star map's glyphs (art-direction.md § 10 *Nodes, legs, and the marker*), shown 1:1 in the
// Sector map's DOM node buttons: the node states, the medal pips under a cleared node, and the
// "you are here" marker. Fixed colors go through the custom legend, the act accent (the next
// glyph's core and its ping) too: each act's accent is its own letter and its own frames
// (`next`, `ping_0`–`ping_3` in Act II's orange; `_act3` in Act III's alarm red; `_finale` in the
// dawn's gold), since no palette's flora slot carries the UI theme's accent. Outlines are drawn
// in `ink.0` by hand, not by the outline pass (which takes the palette's shade).
import { defineSprite } from '../defineSprite.ts';

const N = 15;
const C = 7;

/** A 15×15 grid from a per-pixel picker (`.` transparent). */
function grid(pick: (dx: number, dy: number) => string): string[] {
  const rows: string[] = [];
  for (let y = 0; y < N; y++) {
    let row = '';
    for (let x = 0; x < N; x++) row += pick(x - C, y - C);
    rows.push(row);
  }
  return rows;
}

/** Chebyshev distance, with the square's four corners chamfered off. */
function chamfer(dx: number, dy: number, r: number): 'in' | 'edge' | 'out' {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax > r || ay > r || (ax === r && ay === r)) return 'out';
  return ax === r || ay === r ? 'edge' : 'in';
}

// `cleared`: a 9×9 gold diamond (a survey benchmark in the medal's shape), lit top-left.
const cleared = grid((dx, dy) => {
  const d = Math.abs(dx) + Math.abs(dy);
  if (d <= 4) return d === 4 && dx <= 0 && dy <= 0 ? 'H' : d === 0 ? 'H' : 'G';
  return d === 5 ? 'K' : '.';
});

/**
 * The act accents (art-direction § 10 *The north edge and the palette by phase*; the UI themes'
 * accents, § 9): each act's letter in the legend, and the suffix its frames carry.
 */
const ACCENTS = [
  { suffix: '', letter: 'O' },
  { suffix: '_act3', letter: 'A' },
  { suffix: '_finale', letter: 'G' },
] as const;

// `next`: a chamfered 11×11 white ring around a 5×5 core in the act accent.
const next = (accent: string): string[] =>
  grid((dx, dy) => {
    if (chamfer(dx, dy, 2) !== 'out') return accent;
    const ring = chamfer(dx, dy, 5);
    if (ring === 'edge') return 'W';
    if (ring === 'in') return 'K';
    return chamfer(dx, dy, 6) === 'out' ? '.' : 'K';
  });

// `ping_0`–`ping_3`: one accent ring growing from 11 to 15 px; the last one dithered out.
const ping = (accent: string, r: number, dither: boolean): string[] =>
  grid((dx, dy) =>
    chamfer(dx, dy, r) === 'edge' && (!dither || (dx + dy) % 2 === 0) ? accent : '.',
  );

/** Each act's `next` and `ping_0`–`ping_3` frames, and its ping animation. */
const accentFrames: Record<string, string[]> = {};
const accentAnims: Record<string, { frames: string[]; fps: number; loop: false }> = {};
for (const { suffix, letter } of ACCENTS) {
  accentFrames[`next${suffix}`] = next(letter);
  const pings = [ping(letter, 5, false), ping(letter, 6, false), ping(letter, 7, false)];
  pings.push(ping(letter, 7, true));
  pings.forEach((f, i) => (accentFrames[`ping${suffix}_${i}`] = f));
  accentAnims[`ping${suffix}`] = {
    frames: pings.map((_, i) => `ping${suffix}_${i}`),
    fps: 8,
    loop: false,
  };
}

// `soon`: a dashed steel ring around the menus' 7×8 padlock.
const PADLOCK = [
  '..SSS..',
  '.S...S.',
  '.S...S.',
  'TTTTTTS',
  'TTTKTTS',
  'TTTKTTS',
  'TTTTTTS',
  'RRRRRRR',
];
const soon = grid((dx, dy) => {
  const lx = dx + 3;
  const ly = dy + 4;
  if (lx >= 0 && lx < 7 && ly >= 0 && ly < 8) {
    const ch = PADLOCK[ly]![lx]!;
    if (ch !== '.') return ch;
  }
  if (chamfer(dx, dy, 6) === 'edge') return (dx + dy + 14) % 3 === 2 ? '.' : 'S';
  return '.';
});

// `focus`: four 3 px white corner brackets at 15×15, over the selected node.
const focus = grid((dx, dy) => {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  return (ax === C && ay >= C - 2) || (ay === C && ax >= C - 2) ? 'W' : '.';
});

// prettier-ignore
export const uiStarNode = defineSprite({
  id: 'ui.star_node',
  size: { w: N, h: N },
  anchor: { x: C, y: C },
  palette: 'act2.gold',
  legend: {
    G: 'gold.3', H: 'gold.4', W: 'white.1', K: 'ink.0',
    S: 'steel.3', T: 'steel.2', R: 'steel.1',
    O: 'orange.3', A: 'red.3',
  },
  frames: { cleared, ...accentFrames, soon, focus },
  anims: accentAnims,
});

// One 3×3 diamond per medal, 2 px apart: gold earned, steel not.
const pip = (earned: number): string[] => {
  const rows = ['', '', ''];
  for (let i = 0; i < 3; i++) {
    const c = i < earned ? 'G' : 'S';
    rows[0] += `.${c}.`;
    rows[1] += c.repeat(3);
    rows[2] += `.${c}.`;
    if (i < 2) for (let r = 0; r < 3; r++) rows[r] += '..';
  }
  return rows;
};

// prettier-ignore
export const uiStarPips = defineSprite({
  id: 'ui.star_pips',
  size: { w: 13, h: 3 },
  anchor: { x: 6, y: 0 },
  palette: 'act2.gold',
  legend: { G: 'gold.3', S: 'steel.1' },
  frames: { '0': pip(0), '1': pip(1), '2': pip(2), '3': pip(3) },
});

// prettier-ignore
const MARKER = [
  '..KKKKK..',
  '.KWWWWWK.',
  'KWWWWWWWK',
  'KWTTTTTWK',
  'KWWWWWWWK',
  'KWWWWWWWK',
  '.KWWWWWK.',
  '..KWWWK..',
  '..KWWWK..',
  '...KWK...',
  '...KWK...',
  '....K....',
];

// prettier-ignore
export const uiStarMarker = defineSprite({
  id: 'ui.star_marker',
  size: { w: 9, h: 13 },
  // The tip: 1 px above its node's glyph.
  anchor: { x: 4, y: 12 },
  palette: 'act2.gold',
  legend: { K: 'ink.0', W: 'white.1', T: 'teal.3' },
  frames: {
    idle_0: [...MARKER, '.........'],
    idle_1: ['.........', ...MARKER],
  },
  anims: { idle: { frames: ['idle_0', 'idle_1'], fps: 2 } },
});
