// Mirrors a battle into the HUD's signals (ui/state.ts `hud`) after every host frame. The seam
// T106 builds on: components read `hud` and `speed`, and act through app/commands.ts. Signals
// only notify on a changed value, and the arrays are replaced only when their contents change.
import type { IdSpace } from '../content/types.ts';
import type { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { hud, speed } from '../ui/state.ts';
import type { Host } from './host.ts';

function sameList(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** Wires the HUD signals to a battle. Returns the unwiring (which also resets them). */
export function bindHud(host: Host<IdSpace>, interaction: BattleInteraction): () => void {
  const { sim } = host;
  hud.mapId.value = sim.map.id;
  hud.waveCount.value = sim.map.waves.length;
  hud.loadout.value = [...sim.config.loadout];
  const sync = (): void => {
    const s = sim.state;
    hud.credits.value = s.credits;
    hud.integrity.value = s.integrity;
    hud.wave.value = s.wave;
    hud.outcome.value = s.outcome;
    if (!sameList(hud.lockedTowers.value, s.lockedTowers)) {
      hud.lockedTowers.value = [...s.lockedTowers];
    }
    speed.value = host.speed;
  };
  const syncInteraction = (): void => {
    hud.selectedTower.value = interaction.selectedTower;
    hud.armedTower.value = interaction.armed;
  };
  sync();
  syncInteraction();
  const offFrame = host.onAfterFrame(sync);
  const offInteraction = interaction.subscribe(syncInteraction);
  return () => {
    offFrame();
    offInteraction();
    hud.mapId.value = null;
    hud.selectedTower.value = 0;
    hud.armedTower.value = null;
  };
}
