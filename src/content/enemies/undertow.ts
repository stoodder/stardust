// Undertow (design/enemies.md § 5.4): the Hollow's burrower, A3M3's teach (burrowing in Act III;
// the Scuttle Den answers it). The roster row is the spec: 350 HP, armor 5, 0.8 tiles/s, leak 2,
// bounty 18, ground, void. Burrowing: every 7 s it digs in for 3 s (the burrow rule, enemies.md
// § 2.6; sim/enemyAbilities/burrow.ts), with a visible ripple trail (render).
// The tell is the Burrowing trait's 0.8 s dirt spray (enemies.md § 3). The docs give no
// underground pace or spawn interval: its own pace underground (×1: a heavy that doesn't speed up
// below, unlike the Digger's ×1.5) and 1.5 s between spawns (T602). Its ripple trail is
// render/views/HollowView.ts. Sprites: placeholders under their final ids (T640a).
import { defineEnemy } from '../define.ts';

export const undertow = defineEnemy({
  id: 'undertow',
  name: 'Undertow',
  faction: 'hollow',
  body: 'void',
  layer: 'ground',
  hp: 350,
  armor: 5,
  speedTilesPerSec: 0.8,
  leak: 2,
  bounty: 18,
  spawnIntervalSec: 1.5,
  traits: ['armored', 'burrowing'],
  tells: ['armored', 'burrower', 'hollow'],
  burrow: { everySec: 7, durationSec: 3, speedMul: 1, tellSec: 0.8 },
  sprites: { body: 'enemy.undertow', icon: 'icon.enemy.undertow' },
});
