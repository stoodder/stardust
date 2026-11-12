// M8's finale props (T842; art-direction §6, finale.md § FIN): the Deep Halls'
// mouth, the Long Walk's waymark lanterns (their wrecks are `prop.wreckage`'s `v8`/`v9`), the
// memorial wreck, and the Deep Bore's rig: the finale's lazy sprites (sprites/finale.ts). A3M3's
// tunnel mouths (`prop.tunnel_mouth`) are in the core registry (sprites/index.ts), not here: this
// module is only ever imported with the finale's. The Halls-mouth ledges and the gold seams are
// frames of `tile.high_ground` and `tile.power_node`.
import { propBoreRig } from './bore_rig.ts';
import { propHallsMouth } from './halls_mouth.ts';
import { propMemorialWreck } from './memorial_wreck.ts';
import { propWaymark } from './waymark.ts';

/** The finale's props (the finale's chunk registers them: sprites/finale.ts). */
export const FINALE_PROPS = [propHallsMouth, propWaymark, propMemorialWreck, propBoreRig] as const;
