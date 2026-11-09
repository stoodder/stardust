// Seeker Swarm's missile (design/towers.md § Skyhook; art-direction §7 Seekers; T407b): a small
// dart, nose up, with a white-hot spine, teal fins (Everglow's own colour, so a volley reads apart
// from the orange flak), and an orange exhaust flickering at its tail. 3×4, so render may turn it
// along its flight (tech-spec: projectiles of 4 px or smaller may rotate); its smoke trail is
// render's (views/ProjectileView.ts, vfx/specPixels.ts). A first pass under its final id.
import { defineSprite } from '../defineSprite.ts';

export const projectileSkyhookSeeker = defineSprite({
  id: 'projectile.skyhook_seeker',
  size: { w: 3, h: 4 },
  anchor: { x: 1, y: 2 },
  palette: 'everglow',
  // prettier-ignore
  frames: {
    burn_0: ['.w.', '*w*', '8w8', '.e.'],
    burn_1: ['.w.', '*w*', '8w8', '.d.'],
  },
  anims: { burn: { frames: ['burn_0', 'burn_1'], fps: 12 } },
});
