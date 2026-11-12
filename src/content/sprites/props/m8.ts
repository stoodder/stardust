// M8's props for the finale and A3M3 (T842; art-direction §6, finale.md § FIN), gathered for the
// registry (`M8_PROPS` in sprites/index.ts): the Deep Halls' mouth, the Long Walk's waymark lanterns
// (their wrecks are `prop.wreckage`'s `v8`/`v9`), the memorial wreck, the Deep Bore's rig, and
// A3M3's tunnel mouths. The Halls-mouth ledges and the gold seams are frames of `tile.high_ground`
// and `tile.power_node`.
import { propBoreRig } from './bore_rig.ts';
import { propHallsMouth } from './halls_mouth.ts';
import { propMemorialWreck } from './memorial_wreck.ts';
import { propTunnelMouth } from './tunnel_mouth.ts';
import { propWaymark } from './waymark.ts';

export const M8_PROPS = [
  propHallsMouth,
  propWaymark,
  propMemorialWreck,
  propBoreRig,
  propTunnelMouth,
] as const;
