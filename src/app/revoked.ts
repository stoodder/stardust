// Revocation and QUILL's lockout in the app (design/towers.md § 9, core-loop.md § 2.2 and § 2.11;
// T606's minimal hook, which T631's HUD and T621's leak lines build on). The HUD's `revokedHud`
// follows the sim (`state.revoked`, `scriptModifiers`, `abilitiesLocked`; ClassRevoked,
// AbilityRevoked, ModifierChanged, and the finale's ClassRestored and AbilityLocked (T807), and
// the state as the battle binds, so a checkpoint replay lands on it). As the
// class goes, a placement of it is cancelled (an armed build slot); as a slot goes dark, its aim is
// cancelled (a pause-aimed Orbital Strike: D141). The build slot and the hotkeys then refuse it with
// a notice (app/commands.ts), and the sim refuses anything that gets through (`revoked`). The
// leak line slot is set by story as QUILL's leak bark plays (`setLeakLine`) and cleared as the
// next wave starts.
import type { IdSpace } from '../content/types.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { previewHidden, radioSilent, slotRevoked } from '../sim/index.ts';
import { NOTHING_REVOKED, revokedHud } from '../ui/hud/revokedState.ts';
import type { Host } from './host.ts';

/** The HUD's view of what `host`'s sim has revoked now. */
function sync(host: Host<IdSpace>, leakLine: string | null): void {
  const { state, config } = host.sim;
  const slots = ([1, 2] as const).filter((s) => slotRevoked(state, config, s));
  revokedHud.value = {
    towers: [...state.revoked.towers],
    slots,
    previewHidden: previewHidden(state),
    leakLine,
    // T860: Radio Silence (a veteran rule) darkens the slots; absent otherwise.
    ...(radioSilent(config) ? { silenced: true } : {}),
  };
}

/** Keeps the HUD's `revokedHud` in sync with `host`'s sim, and cancels inputs; returns the unbind. */
export function bindRevoked(host: Host<IdSpace>, interaction: BattleInteraction): () => void {
  sync(host, null);
  const offs = [
    host.bus.on('ClassRevoked', (e) => {
      sync(host, revokedHud.value.leakLine);
      if (interaction.armed === e.tower) interaction.arm(null);
    }),
    host.bus.on('AbilityRevoked', () => {
      sync(host, revokedHud.value.leakLine);
      const aim = interaction.aiming;
      if (aim !== null && revokedHud.value.slots.includes(aim)) interaction.aimAbility(null);
    }),
    // T807: the finale's restored class ("Not Everglow.") and Directive 0's phase lock.
    host.bus.on('ClassRestored', () => sync(host, revokedHud.value.leakLine)),
    host.bus.on('AbilityLocked', () => {
      sync(host, revokedHud.value.leakLine);
      const aim = interaction.aiming;
      if (aim !== null && revokedHud.value.slots.includes(aim)) interaction.aimAbility(null);
    }),
    host.bus.on('ModifierChanged', () => {
      sync(host, revokedHud.value.leakLine);
      const aim = interaction.aiming;
      if (aim !== null && revokedHud.value.slots.includes(aim)) interaction.aimAbility(null);
    }),
    host.bus.on('WaveStarted', () => {
      if (revokedHud.value.leakLine !== null) setLeakLine(null);
    }),
  ];
  return () => {
    for (const off of offs) off();
    revokedHud.value = NOTHING_REVOKED;
  };
}

/** QUILL's leak line for the next wave under the lockout (story calls it; null clears it). */
export function setLeakLine(text: string | null): void {
  revokedHud.value = { ...revokedHud.value, leakLine: text };
}

/** What a slot dark under Radio Silence says (T860; a veteran rule, not Directive 0's lock). */
export const RADIO_SILENCE_TEXT = 'Radio Silence';

/** The notice for a press on a revoked build slot or ability slot. */
export function revokedText(kind: 'tower' | 'uplink' | 'lockout' | 'silence'): string {
  if (kind === 'tower') return 'License revoked';
  if (kind === 'silence') return RADIO_SILENCE_TEXT;
  return kind === 'uplink' ? 'Uplink revoked' : 'Locked out';
}
