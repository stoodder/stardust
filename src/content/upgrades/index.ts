// The meta catalog's registries (design/progression.md §§ 4–8): ranked upgrades (UpgradeId: the
// shop's tune-ups and global upgrades, R&D Command), Field Protocols (ProtocolId), and the tower,
// ability, and spec-unlock access tables. Shapes: types.ts; what each item grants: its file.
import { defineRegistry } from '../define.ts';
import * as protocols from './protocols.ts';
import * as rnd from './rnd.ts';
import * as shop from './shop.ts';
import * as tuneUps from './tuneUps.ts';

export const UPGRADES = defineRegistry({ ...shop, ...tuneUps, ...rnd });
export const PROTOCOLS = defineRegistry({ ...protocols });

export { ABILITY_ACCESS, ENGINEERING, TOWER_ACCESS } from './access.ts';
export type * from './types.ts';
