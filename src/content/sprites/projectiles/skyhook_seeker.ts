// Seeker Swarm's missile (design/towers.md § Skyhook; art-direction §7 Seekers; T407b): a tiny dart
// with a white-hot core, a teal fin edge (Everglow's own colour, so a volley reads apart from the
// orange flak), and an orange exhaust spark at its tail. 3×3, so render may turn it along its
// flight (tech-spec: projectiles of 4 px or smaller may rotate); its smoke trail is render's
// (views/SeekerTrail.ts). A first pass under its final id: T440b may redraw it.
import { defineSprite } from '../defineSprite.ts';

export const projectileSkyhookSeeker = defineSprite({
  id: 'projectile.skyhook_seeker',
  size: { w: 3, h: 3 },
  anchor: { x: 1, y: 1 },
  palette: 'everglow',
  // prettier-ignore
  frames: {
    burn_0: ['.8.', '9w9', '.e.'],
    burn_1: ['.8.', '9w9', '.d.'],
  },
  anims: { burn: { frames: ['burn_0', 'burn_1'], fps: 12 } },
});
