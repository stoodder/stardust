// Placeholder art for M3's enemies (T300a): Puffwing, Bunchling, Digger, Elder, Matriarch
// Chitterbloom, and Gerald the mail drone, body and wave-preview icon, under their final sprite
// ids. Simple shapes in the right palette and size class; T311a (and T311b for Chitterbloom)
// replace them (shapes.ts).
import { defineSprite } from '../defineSprite.ts';
import { BIG_EYE, EYE } from '../enemies/skitter.ts';
import { grid, line, plot, rows } from '../helpers.ts';
import { enemyIcon } from '../icons/enemyIcon.ts';
import { ICON } from '../icons/iconGen.ts';
import type { AnimDef, FrameDef } from '../types.ts';
import { ball, blobWalk, box, type BlobSpec } from './shapes.ts';

const TUFT = ['.dc.', 'cdcb', '.bb.'];

/** A Skitterkin placeholder sprite and its icon (same body, fitted to 14×14). */
function skitter(
  spec: BlobSpec,
  icon: { rx: number; ry: number; features: BlobSpec['se'] },
) {
  const walk = blobWalk(spec);
  return {
    body: {
      size: { w: spec.w, h: spec.h },
      anchor: { x: Math.floor(spec.w / 2), y: spec.h - 1 },
      frames: walk.frames,
      anims: walk.anims,
    },
    icon: enemyIcon({ cx: 7, cy: 8, rx: icon.rx, ry: icon.ry, belly: 0.4, features: icon.features }),
  };
}

// ── Puffwing: a fluffy glider ─────────────────────────────────────────────────────────────────

const WING = ['bb', 'cb', 'c.'];
const puffwing = skitter(
  {
    w: 16,
    h: 12,
    rx: 5,
    ry: 4.2,
    se: [
      [0, 2, WING],
      [14, 2, WING],
      [6, 0, TUFT],
      [7, 4, EYE],
      [10, 4, EYE],
    ],
    ne: [
      [0, 2, WING],
      [14, 2, WING],
      [6, 0, TUFT],
    ],
  },
  {
    rx: 5,
    ry: 4.5,
    features: [
      [0, 5, WING],
      [12, 5, WING],
      [5, 2, TUFT],
      [6, 7, EYE],
      [9, 7, EYE],
    ],
  },
);

// ── Bunchling: packed, with bulges (the `splitter` tell) ──────────────────────────────────────

const BULGE = ['.4.', '434', '.3.'];
const bunchling = skitter(
  {
    w: 16,
    h: 14,
    rx: 6.5,
    ry: 5.5,
    se: [
      [1, 3, BULGE],
      [12, 4, BULGE],
      [5, 1, BULGE],
      [7, 6, EYE],
      [10, 6, EYE],
    ],
    ne: [
      [1, 3, BULGE],
      [12, 4, BULGE],
      [5, 1, BULGE],
      [9, 3, BULGE],
    ],
  },
  {
    rx: 6.4,
    ry: 5.4,
    features: [
      [1, 5, BULGE],
      [10, 5, BULGE],
      [5, 3, BULGE],
      [6, 8, EYE],
      [9, 8, EYE],
    ],
  },
);

// ── Digger: claws out, a dirt clod ────────────────────────────────────────────────────────────

const CLAW = ['0.0', '.0.'];
const digger = skitter(
  {
    w: 14,
    h: 12,
    rx: 5.5,
    ry: 4.5,
    se: [
      [7, 4, EYE],
      [10, 4, EYE],
      [10, 8, CLAW],
      [1, 8, CLAW],
      [5, 0, ['.dd.', 'dccd']],
    ],
    ne: [
      [5, 0, ['.dd.', 'dccd']],
      [3, 3, ['1.1', '.1.']],
    ],
  },
  {
    rx: 5.6,
    ry: 4.8,
    features: [
      [6, 7, EYE],
      [9, 7, EYE],
      [9, 11, CLAW],
      [2, 11, CLAW],
      [5, 3, ['.dd.', 'dccd']],
    ],
  },
);

// ── Elder: big, slow, a grumpy brow and a grey tuft ───────────────────────────────────────────

const BROW = ['00', '.k'];
const elder = skitter(
  {
    w: 22,
    h: 17,
    rx: 9,
    ry: 7,
    se: [
      [9, 0, ['.88.', '8998', '.88.']],
      [11, 5, BROW],
      [15, 5, BROW],
      [13, 10, ['kk']],
    ],
    ne: [
      [9, 0, ['.88.', '8998', '.88.']],
      [6, 6, ['+.+.+', '.....', '+.+.+']],
    ],
  },
  {
    rx: 6.6,
    ry: 5.6,
    features: [
      [5, 1, ['.88.', '8998', '.88.']],
      [6, 7, BROW],
      [9, 7, BROW],
    ],
  },
);

// ── Matriarch Chitterbloom: huge, crowned with moss, big eyes ─────────────────────────────────

const chitterbloom = skitter(
  {
    w: 32,
    h: 24,
    rx: 14,
    ry: 10.5,
    se: [
      [12, 0, ['..dcd..', '.dcdcd.', 'dcbcbcd', '.bb.bb.']],
      [17, 7, BIG_EYE],
      [22, 7, BIG_EYE],
      [20, 13, ['kk']],
      [6, 9, ['+.+', '.*.', '+.+']],
    ],
    ne: [
      [12, 0, ['..dcd..', '.dcdcd.', 'dcbcbcd', '.bb.bb.']],
      [8, 9, ['+.+.+.+', '.*.*.*.', '+.+.+.+']],
    ],
  },
  {
    rx: 6.8,
    ry: 5.8,
    features: [
      [4, 1, ['.dcd.', 'dcbcd']],
      [6, 7, BIG_EYE],
      [9, 7, BIG_EYE],
    ],
  },
);

// ── Gerald the mail drone: a rotor, a body, a satchel ─────────────────────────────────────────

const GERALD_W = 16;
const GERALD_H = 14;

function geraldFrame(facing: 'se' | 'ne', blade: 0 | 1): string[] {
  const g = grid(GERALD_W, GERALD_H);
  // Rotor: a mast and a spinning blade (two lengths).
  line(g, 8, 1, 8, 3, '1');
  if (blade === 0) line(g, 2, 1, 14, 1, '3');
  else line(g, 5, 1, 11, 1, '3');
  // Body: a lit capsule with a teal visor.
  ball(g, 8, 7, 4, '4', '3', '2');
  if (facing === 'se') {
    box(g, 8, 6, 3, 1, '8');
    plot(g, 9, 6, 'w');
  }
  // The satchel, orange, slung low.
  box(g, facing === 'se' ? 3 : 9, 9, 4, 3, 'd');
  box(g, facing === 'se' ? 3 : 9, 9, 4, 1, 'e');
  plot(g, 8, 11, '+');
  return rows(g);
}

const geraldFrames: Record<string, FrameDef> = {
  walk_se_0: geraldFrame('se', 0),
  walk_se_1: geraldFrame('se', 1),
  walk_ne_0: geraldFrame('ne', 0),
  walk_ne_1: geraldFrame('ne', 1),
};
const geraldAnims: Record<string, AnimDef> = {
  walk_se: { frames: ['walk_se_0', 'walk_se_1'], fps: 12 },
  walk_sw: { mirrorOf: 'walk_se' },
  walk_ne: { frames: ['walk_ne_0', 'walk_ne_1'], fps: 12 },
  walk_nw: { mirrorOf: 'walk_ne' },
};

function geraldIcon(): string[] {
  const g = grid(ICON, ICON);
  line(g, 7, 1, 7, 3, '1');
  line(g, 1, 1, 13, 1, '3');
  ball(g, 7, 7, 4.5, '4', '3', '2');
  box(g, 7, 6, 3, 1, '8');
  box(g, 2, 9, 5, 4, 'd');
  box(g, 2, 9, 5, 1, 'e');
  return rows(g);
}

// ── Sprite definitions ────────────────────────────────────────────────────────────────────────

export const enemyPuffwing = defineSprite({
  id: 'enemy.puffwing',
  ...puffwing.body,
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
});
export const enemyBunchling = defineSprite({
  id: 'enemy.bunchling',
  ...bunchling.body,
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
});
export const enemyDigger = defineSprite({
  id: 'enemy.digger',
  ...digger.body,
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
});
export const enemyElder = defineSprite({
  id: 'enemy.elder',
  ...elder.body,
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
});
export const enemyChitterbloom = defineSprite({
  id: 'enemy.chitterbloom',
  ...chitterbloom.body,
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
});
export const enemyGerald = defineSprite({
  id: 'enemy.gerald',
  size: { w: GERALD_W, h: GERALD_H },
  anchor: { x: 8, y: GERALD_H - 1 },
  palette: 'everglow',
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
  frames: geraldFrames,
  anims: geraldAnims,
});

const ICON_BOX = { size: { w: ICON, h: ICON }, anchor: { x: 0, y: 0 }, outline: 'auto' } as const;

export const iconEnemyPuffwing = defineSprite({
  id: 'icon.enemy.puffwing',
  ...ICON_BOX,
  palette: 'skitterkin',
  frames: { icon: puffwing.icon },
});
export const iconEnemyBunchling = defineSprite({
  id: 'icon.enemy.bunchling',
  ...ICON_BOX,
  palette: 'skitterkin',
  frames: { icon: bunchling.icon },
});
export const iconEnemyDigger = defineSprite({
  id: 'icon.enemy.digger',
  ...ICON_BOX,
  palette: 'skitterkin',
  frames: { icon: digger.icon },
});
export const iconEnemyElder = defineSprite({
  id: 'icon.enemy.elder',
  ...ICON_BOX,
  palette: 'skitterkin',
  frames: { icon: elder.icon },
});
export const iconEnemyChitterbloom = defineSprite({
  id: 'icon.enemy.chitterbloom',
  ...ICON_BOX,
  palette: 'skitterkin',
  frames: { icon: chitterbloom.icon },
});
export const iconEnemyGerald = defineSprite({
  id: 'icon.enemy.gerald',
  ...ICON_BOX,
  palette: 'everglow',
  frames: { icon: geraldIcon() },
});
