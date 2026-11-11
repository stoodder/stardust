// System Reboot (design/core-loop.md § 3.2): a Technician ability, free (QUILL patches it in at
// A3M4's briefing, before the first Silencer; a briefing gift, meta/storyTransactions.ts). No
// target: it instantly clears Jammed on every tower and makes each immune to jamming for 6 s
// (REBOOT_IMMUNITY_SEC, twice a jam's own JAM_IMMUNITY_SEC). 40 s cooldown. It answers `jam` (rules.ts COUNTER_ANSWERS). Kept under
// every C4 outcome, but locked in A3M5 under Rewrite (the map's `lockedAbilities`).
//
// Live since T702: sim/abilities/reboot.ts runs the `reboot` effect on the cast's tick. Icon: a
// placeholder under its final id (T740b).
import { REBOOT_IMMUNITY_SEC } from '../rules.ts';
import { defineAbility } from '../define.ts';

export const system_reboot = defineAbility({
  id: 'system_reboot',
  name: 'System Reboot',
  cooldownSec: 40,
  effect: { kind: 'reboot', immuneSec: REBOOT_IMMUNITY_SEC },
  sprites: { icon: 'icon.ability.system_reboot' },
});
