// Placeholder art for Matriarch Chitterbloom (T300a), body and wave-preview icon, under its final
// sprite ids. Simple shapes in the right palette and size class; T311b replaces it (shapes.ts).
// The other M3 placeholders were replaced by real art in T311a.
import { defineSprite } from '../defineSprite.ts';
import { BIG_EYE } from '../enemies/skitter.ts';
import { enemyIcon } from '../icons/enemyIcon.ts';
import { ICON } from '../icons/iconGen.ts';
import { blobWalk, type BlobSpec } from './shapes.ts';

/** A Skitterkin placeholder sprite and its icon (same body, fitted to 14×14). */
function skitter(spec: BlobSpec, icon: { rx: number; ry: number; features: BlobSpec['se'] }) {
  const walk = blobWalk(spec);
  return {
    body: {
      size: { w: spec.w, h: spec.h },
      anchor: { x: Math.floor(spec.w / 2), y: spec.h - 1 },
      frames: walk.frames,
      anims: walk.anims,
    },
    icon: enemyIcon({
      cx: 7,
      cy: 8,
      rx: icon.rx,
      ry: icon.ry,
      belly: 0.4,
      features: icon.features,
    }),
  };
}

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

// ── Sprite definitions ────────────────────────────────────────────────────────────────────────

export const enemyChitterbloom = defineSprite({
  id: 'enemy.chitterbloom',
  ...chitterbloom.body,
  palette: 'skitterkin',
  variants: ['skitterkin.ally'],
  outline: 'auto',
  glow: { slots: ['e0', 'e1'], radius: 1 },
});

export const iconEnemyChitterbloom = defineSprite({
  id: 'icon.enemy.chitterbloom',
  size: { w: ICON, h: ICON },
  anchor: { x: 0, y: 0 },
  outline: 'auto',
  palette: 'skitterkin',
  frames: { icon: chitterbloom.icon },
});
