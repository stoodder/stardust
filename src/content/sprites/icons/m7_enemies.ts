// M7's wave-preview icons (T740a; art-direction §5: the enemy's own look, front-facing, 14×14 with
// the `auto` outline): each from its unit's own SE walk frame. The small units (Silencer, Auditor,
// Maintenance Associate, Black Budget Operative) are fitted to the box like M6's Everglow walkers
// (their feet on the bottom row, whatever overhangs trimmed); the big ones (Liability-Class
// Enforcer, Asset Recovery Gunship, "Shareholder Value", the Gathering Maw and its part) are
// shrunk into it by `shrink`, which keeps each block's most telling pixel (an eye, a lamp, a
// stripe, a seam) over its bulk, so the visor, the rotors, the chart and the mouths survive.
import { defineSprite } from '../defineSprite.ts';
import { enemyAssociate } from '../enemies/associate.ts';
import { enemyAuditor } from '../enemies/auditor.ts';
import { enemyBlackBudget } from '../enemies/blackbudget.ts';
import { enemyGatheringMaw, enemyGatheringMawPart } from '../enemies/gathering_maw.ts';
import { enemyGunship } from '../enemies/gunship.ts';
import { enemyLiability } from '../enemies/liability.ts';
import { enemyShareholderValue } from '../enemies/shareholder_value.ts';
import { enemySilencer } from '../enemies/silencer.ts';
import { grid, plot, rows, stamp, type CharGrid } from '../helpers.ts';
import type { SpriteDef } from '../types.ts';
import { ICON } from './iconGen.ts';

/** The pixels a shrink keeps over the bulk, most telling first (features, lamps, then edges). */
const TELLING = '*+edwkRQPYZUV78c6GH';

function walkSe(def: SpriteDef): readonly string[] {
  const src = def.frames['walk_se_0'];
  if (src === undefined || !Array.isArray(src)) throw new Error(`${def.id} has no walk_se_0 grid`);
  return src;
}

/** The opaque bounds of a frame. */
function bounds(frame: readonly string[]): { x0: number; x1: number; y0: number; y1: number } {
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  frame.forEach((r, y) => {
    for (let x = 0; x < r.length; x++) {
      if (r[x] === '.' || r[x] === '_') continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  });
  return { x0, x1, y0, y1 };
}

/** A frame fitted to the box: centred, its feet on the bottom row, whatever overhangs trimmed. */
function fitted(frame: readonly string[]): string[] {
  const b = bounds(frame);
  const left = Math.round((b.x0 + b.x1 + 1) / 2 - ICON / 2);
  const g: CharGrid = grid(ICON, ICON);
  stamp(g, -left, ICON - 1 - b.y1, frame);
  return rows(g);
}

/**
 * A big frame shrunk into the box (aspect kept, its feet on the bottom row): each box pixel takes
 * its source block's most telling pixel (TELLING) if it has one, else its commonest body pixel,
 * or stays clear when the block is mostly clear.
 */
function shrink(frame: readonly string[]): string[] {
  const b = bounds(frame);
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  const k = Math.max(bw, bh) / ICON;
  const ow = Math.round(bw / k);
  const oh = Math.round(bh / k);
  const ox = Math.floor((ICON - ow) / 2);
  const oy = ICON - oh;
  const g: CharGrid = grid(ICON, ICON);
  for (let y = 0; y < oh; y++) {
    for (let x = 0; x < ow; x++) {
      const counts = new Map<string, number>();
      let n = 0;
      let clear = 0;
      for (let sy = Math.floor(b.y0 + y * k); sy < Math.floor(b.y0 + (y + 1) * k); sy++) {
        for (let sx = Math.floor(b.x0 + x * k); sx < Math.floor(b.x0 + (x + 1) * k); sx++) {
          const c = frame[sy]?.[sx] ?? '.';
          n++;
          if (c === '.' || c === '_') clear++;
          else counts.set(c, (counts.get(c) ?? 0) + 1);
        }
      }
      if (n === 0 || clear > n * 0.6) continue;
      let pick = '';
      for (const c of TELLING) {
        if (counts.has(c)) {
          pick = c;
          break;
        }
      }
      if (pick === '') {
        let best = 0;
        for (const [c, m] of counts) {
          if (m > best) {
            best = m;
            pick = c;
          }
        }
      }
      if (pick !== '') plot(g, ox + x, oy + y, pick);
    }
  }
  return rows(g);
}

/** An icon sprite `id` from `def`'s SE walk, fitted or shrunk, in its palette and legend. */
function icon<const Id extends string>(id: Id, def: SpriteDef, big: boolean): SpriteDef<Id> {
  const frame = walkSe(def);
  return defineSprite({
    id,
    size: { w: ICON, h: ICON },
    anchor: { x: 0, y: 0 },
    palette: def.palette,
    outline: 'auto',
    ...(def.legend === undefined ? {} : { legend: def.legend }),
    frames: { icon: big ? shrink(frame) : fitted(frame) },
  });
}

export const iconEnemySilencer = icon('icon.enemy.silencer', enemySilencer, true);
export const iconEnemyAuditor = icon('icon.enemy.auditor', enemyAuditor, false);
export const iconEnemyAssociate = icon('icon.enemy.associate', enemyAssociate, false);
export const iconEnemyLiability = icon('icon.enemy.liability', enemyLiability, true);
export const iconEnemyGunship = icon('icon.enemy.gunship', enemyGunship, true);
export const iconEnemyBlackBudget = icon('icon.enemy.blackbudget', enemyBlackBudget, false);
export const iconEnemyShareholderValue = icon(
  'icon.enemy.shareholder_value',
  enemyShareholderValue,
  true,
);
export const iconEnemyGatheringMaw = icon('icon.enemy.gathering_maw', enemyGatheringMaw, true);
export const iconEnemyGatheringMawPart = icon(
  'icon.enemy.gathering_maw_part',
  enemyGatheringMawPart,
  true,
);

/** M7's unit icons in gallery order (sprites/index.ts spreads them into SPRITES). */
export const M7_UNIT_ICONS = [
  iconEnemySilencer,
  iconEnemyAuditor,
  iconEnemyAssociate,
  iconEnemyLiability,
  iconEnemyGunship,
  iconEnemyBlackBudget,
  iconEnemyShareholderValue,
  iconEnemyGatheringMaw,
  iconEnemyGatheringMawPart,
] as const;
