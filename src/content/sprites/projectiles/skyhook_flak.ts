// Skyhook's flak round (design/towers.md § Skyhook; art-direction §7 Explosive): a small hot shell
// climbing to its burst, a white core in a safety-orange jacket with a darker tail, 3×3 so render
// may turn it to its flight (tech-spec: projectiles of 4 px or smaller may rotate). The burst in
// the air is an fx (T312a).
import { defineSprite } from '../defineSprite.ts';

export const projectileSkyhookFlak = defineSprite({
  id: 'projectile.skyhook_flak',
  size: { w: 3, h: 3 },
  anchor: { x: 1, y: 1 },
  palette: 'everglow',
  // prettier-ignore
  frames: { e: ['.e.', 'ewd', '.dc'] },
});
