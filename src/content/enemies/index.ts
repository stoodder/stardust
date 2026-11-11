// The enemy registry: one import per file in this folder (conventions.md § File layout).
import { defineRegistry } from '../define.ts';
import { blinkstrider } from './blinkstrider.ts';
import { bunchling } from './bunchling.ts';
import { cantor } from './cantor.ts';
import { chitterbloom } from './chitterbloom.ts';
import { chonk } from './chonk.ts';
import { compliance } from './compliance.ts';
import { digger } from './digger.ts';
import { elder } from './elder.ts';
import { expediter } from './expediter.ts';
import { fracture } from './fracture.ts';
import { fracture_shard } from './fracture_shard.ts';
import { gerald } from './gerald.ts';
import { glass_witch } from './glass_witch.ts';
import { glimmer } from './glimmer.ts';
import { glimmer_shard } from './glimmer_shard.ts';
import { hauler } from './hauler.ts';
import { lightwing } from './lightwing.ts';
import { maw } from './maw.ts';
import { associate } from './associate.ts';
import { auditor } from './auditor.ts';
import { blackbudget } from './blackbudget.ts';
import { gathering_maw } from './gathering_maw.ts';
import { gathering_maw_part } from './gathering_maw_part.ts';
import { gunship } from './gunship.ts';
import { liability } from './liability.ts';
import { shareholder_value } from './shareholder_value.ts';
import { silencer } from './silencer.ts';
import { mote } from './mote.ts';
import { nibbler } from './nibbler.ts';
import { puffwing } from './puffwing.ts';
import { riftmoth } from './riftmoth.ts';
import { sunderglass_penitent } from './sunderglass_penitent.ts';
import { undertow } from './undertow.ts';
import { veilwalker } from './veilwalker.ts';
import { weft_warden } from './weft_warden.ts';
import { zoomer } from './zoomer.ts';

export const ENEMIES = defineRegistry({
  nibbler,
  zoomer,
  chonk,
  hauler,
  puffwing,
  bunchling,
  digger,
  elder,
  chitterbloom,
  gerald,
  // M4 (Act II, part one; T400a stubs under their final ids).
  mote,
  glimmer,
  weft_warden,
  lightwing,
  glass_witch,
  // M5 (Act II, part two; T500a stubs under their final ids).
  veilwalker,
  blinkstrider,
  cantor,
  sunderglass_penitent,
  glimmer_shard,
  fracture,
  fracture_shard,
  riftmoth,
  // M6 (Act III, part one; T600a stubs under their final ids): the Hollow's Maw (T602) and
  // Undertow (T602), Everglow Security's Compliance Drone and Expediter (T603).
  maw,
  undertow,
  compliance,
  expediter,
  // M7 (Act III, part two; T700a stubs under their final ids): the Silencer (T702), Everglow's
  // Associate, Liability, Gunship, and Black Budget (T703), the Auditor and "Shareholder Value"
  // (T707), the Gathering Maw and its parts (T708).
  silencer,
  associate,
  liability,
  gunship,
  blackbudget,
  auditor,
  shareholder_value,
  gathering_maw,
  gathering_maw_part,
});
