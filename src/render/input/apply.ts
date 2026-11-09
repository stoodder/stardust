// Applies a click's intent (intents.ts `resolveClick`): the selection and arming changes go to the
// battle's BattleInteraction, the rest become commands. Shared by the pointer (BattleScene) and
// the keyboard cursor's Enter (app/commands.ts), so both act the same way.
import type { IdSpace } from '../../content/types.ts';
import type { Command } from '../../sim/index.ts';
import type { BattleInteraction } from './BattleInteraction.ts';
import type { Intent } from './intents.ts';

/** Where an intent's effects go. */
export interface IntentSink {
  /** Issues a player command (app/commands.ts `issue`). */
  issue(cmd: Command<IdSpace>): void;
  /** An armed click on a tile nothing can be built on (the HUD says so). */
  onCantBuild(): void;
}

export function applyIntent(intent: Intent, interaction: BattleInteraction, sink: IntentSink): void {
  switch (intent.kind) {
    case 'ability':
      // One shot per aim; the sim re-validates (cooldown, target) and the HUD shows rejections.
      sink.issue({ type: 'ability', slot: intent.slot, target: intent.tile });
      interaction.aimAbility(null);
      return;
    case 'none':
      return;
    case 'selectTower':
      interaction.selectTower(intent.uid);
      return;
    case 'build':
      // The slot stays armed; app/hud.ts disarms it once another can't be afforded.
      sink.issue({ type: 'build', tile: intent.tile, tower: intent.tower });
      return;
    case 'deselect':
      interaction.selectTower(0);
      return;
    case 'cantBuild':
      interaction.selectTower(0);
      sink.onCantBuild();
      return;
    case 'cancel':
      interaction.clear();
      return;
  }
}
