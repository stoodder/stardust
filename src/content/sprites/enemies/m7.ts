// M7's units in gallery order (T740a; sprites/index.ts spreads these into SPRITES): Everglow
// Security's part two (the Auditor, the Maintenance Associate, the Liability-Class Enforcer, the
// Asset Recovery Gunship, the Black Budget Operative), the Silencer, the two bosses ("Shareholder
// Value"; the Gathering Maw at each growth step and its part), the allies (the Sproing Pad's
// leapers, the bearers, the militia), and the overlays a view draws on a unit or a tower (the
// Jammed static, C4 Purge's open panel).
import { allyBearer } from '../allies/bearer.ts';
import { allyLeaper } from '../allies/leaper.ts';
import { allyMilitia } from '../allies/militia.ts';
import { fxJamStatic } from '../fx/jam_static.ts';
import { fxOpenPanel } from '../fx/open_panel.ts';
import { enemyAssociate } from './associate.ts';
import { enemyAuditor } from './auditor.ts';
import { enemyBlackBudget } from './blackbudget.ts';
import {
  enemyGatheringMaw,
  enemyGatheringMawG1,
  enemyGatheringMawG2,
  enemyGatheringMawG3,
  enemyGatheringMawG4,
  enemyGatheringMawG5,
  enemyGatheringMawPart,
} from './gathering_maw.ts';
import { enemyGunship } from './gunship.ts';
import { enemyLiability } from './liability.ts';
import { enemyShareholderValue } from './shareholder_value.ts';
import { enemySilencer } from './silencer.ts';

export const M7_UNITS = [
  enemySilencer,
  enemyAuditor,
  enemyAssociate,
  enemyLiability,
  enemyGunship,
  enemyBlackBudget,
  enemyShareholderValue,
  enemyGatheringMaw,
  enemyGatheringMawG1,
  enemyGatheringMawG2,
  enemyGatheringMawG3,
  enemyGatheringMawG4,
  enemyGatheringMawG5,
  enemyGatheringMawPart,
] as const;

export const M7_ALLIES = [allyLeaper, allyBearer, allyMilitia] as const;

export const M7_UNIT_FX = [fxJamStatic, fxOpenPanel] as const;
