// M6's wave-preview icons (T640a; art-direction §5: the enemy's own look, front-facing, 16×16 with
// the `auto` outline): the Hollow units redrawn small in their bodies' grammar (both outgrow the
// 14×14 box): the Maw's toothy mound with its plates and eyes, the Undertow's long low body with
// its dorsal plates; and Everglow Security's walkers from their own SE walk frames, fitted to the
// box (the Compliance Drone's PA horn and the Expediter's metronome mast trimmed to fit).
import { defineSprite } from '../defineSprite.ts';
import { enemyCompliance } from '../enemies/compliance.ts';
import { enemyExpediter } from '../enemies/expediter.ts';
import { hollowBody, inkContour } from '../enemies/hollow.ts';
import { MOTE_BODY_LEGEND } from '../enemies/mote.ts';
import { grid, line, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import { ICON } from './iconGen.ts';

/** The Maw, small: a plated drained mound, a wide mouth of pale teeth, eyes, a wilting stalk. */
function maw(): string[] {
  const g: CharGrid = grid(ICON, ICON);
  hollowBody(g, 7, 7.5, 6.8, 5.6, 0.5);
  for (const sx of [4, 8]) line(g, sx, 3, sx + 1, 6, '0');
  inkContour(g);
  // The mouth: dark inside, pale teeth hanging from its top lip, a violet glint swallowed.
  for (let x = 4; x <= 11; x++) {
    plot(g, x, 9, x % 3 === 0 ? 'k' : 'w');
    plot(g, x, 10, 'k');
    plot(g, x, 11, x === 4 || x === 11 ? 'K' : '3');
  }
  plot(g, 8, 10, 'V');
  plot(g, 6, 4, '*');
  plot(g, 10, 5, '+');
  plot(g, 3, 6, '+');
  line(g, 5, 2, 3, 0, '2');
  return rows(g);
}

/** The Undertow, small: long and low, three dorsal plates up, a ring face at its nose. */
function undertow(): string[] {
  const g: CharGrid = grid(ICON, ICON);
  hollowBody(g, 7, 9, 6.8, 3.4, 0);
  for (const [x, hgt] of [
    [4, 2],
    [7, 3],
    [10, 2],
  ] as const) {
    for (let k = 0; k < hgt; k++) plot(g, x, 5 - k, k === hgt - 1 ? '3' : '2');
  }
  inkContour(g);
  stamp(g, 10, 8, ['.w.', 'wkw', '.w.']);
  plot(g, 9, 6, '*');
  plot(g, 5, 7, '+');
  for (const x of [3, 6, 9]) plot(g, x, 10, x === 6 ? 'U' : 'V');
  return rows(g);
}

/**
 * A walk frame fitted to the 14×14 box, centred on its opaque middle: its feet on the bottom row
 * (`feet`; whatever overhangs the top trimmed), or its top on the top row (whatever hangs below
 * trimmed: the Expediter's wheel, so its metronome, visor and stopwatch show).
 */
function fitted(frame: readonly string[], feet = true): string[] {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  frame.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  });
  const left = Math.round((x0 + x1 + 1) / 2 - ICON / 2);
  const g: CharGrid = grid(ICON, ICON);
  stamp(g, -left, feet ? ICON - 1 - y1 : 0, frame);
  return rows(g);
}

function walkSe(def: {
  readonly id: string;
  readonly frames: Readonly<Record<string, unknown>>;
}): readonly string[] {
  const src = def.frames['walk_se_0'];
  if (!Array.isArray(src)) throw new Error(`${def.id} has no walk_se_0 grid`);
  return src;
}

export const iconEnemyMaw = defineSprite({
  id: 'icon.enemy.maw',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_BODY_LEGEND,
  frames: { icon: maw() },
});

export const iconEnemyUndertow = defineSprite({
  id: 'icon.enemy.undertow',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'hollow',
  outline: 'auto',
  legend: MOTE_BODY_LEGEND,
  frames: { icon: undertow() },
});

export const iconEnemyCompliance = defineSprite({
  id: 'icon.enemy.compliance',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: fitted(walkSe(enemyCompliance)) },
});

export const iconEnemyExpediter = defineSprite({
  id: 'icon.enemy.expediter',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  palette: 'everglow',
  outline: 'auto',
  frames: { icon: fitted(walkSe(enemyExpediter), false) },
});
