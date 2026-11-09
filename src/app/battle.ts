// A battle session: one sim, its host loop, the interaction state, and the BattleScene drawing
// it. The router starts and stops sessions; commands, the HUD, and the test hooks reach the live
// one through it.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../content/types.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { BATTLE_SCENE_KEY, BattleScene } from '../render/scenes/BattleScene.ts';
import { createSim, type SimConfig } from '../sim/index.ts';
import { issue, setCommandTarget } from './commands.ts';
import { createHost, type Host } from './host.ts';
import { bindHud, rejectText, showNotice, type HudOptions } from './hud.ts';
import { bindRadio } from './radio.ts';

/** Successive battles get distinct scene keys, so a new one never collides with a queued removal. */
let battleCount = 0;

export interface Battle {
  readonly host: Host<IdSpace>;
  readonly interaction: BattleInteraction;
  readonly scene: BattleScene;
  /** Game-pixel position of a tile's center (the `tileToClient` hook). */
  tileCenter(col: number, row: number, out: { x: number; y: number }): void;
  /** Resolves after the scene's first rendered frame. */
  readonly firstFrame: Promise<void>;
  /** Removes the scene and unwires the HUD and commands. */
  stop(): void;
}

/** Starts a battle on `cfg` in a new BattleScene. Throws a RangeError on an invalid config. */
export function startBattle(
  game: Phaser.Game,
  cfg: SimConfig<IdSpace>,
  hudOptions: HudOptions = { briefing: false },
): Battle {
  const sim = createSim(cfg);
  const host = createHost(sim);
  // Nothing is armed at the start: the HUD's build slots (or keys 1–4) arm a tower.
  const interaction = new BattleInteraction();
  let resolveFirstFrame: (() => void) | null = null;
  const firstFrame = new Promise<void>((resolve) => {
    resolveFirstFrame = resolve;
  });
  const key = `${BATTLE_SCENE_KEY}.${++battleCount}`;
  const scene = new BattleScene(
    {
      sim,
      bus: host.bus,
      interaction,
      frame: (delta) => {
        host.frame(delta);
      },
      issue,
      onFirstFrame: () => resolveFirstFrame?.(),
      onCantBuild: () => showNotice(rejectText('notBuildable') ?? ''),
    },
    key,
  );
  const unbindHud = bindHud(host, interaction, hudOptions);
  const unbindRadio = bindRadio(host.bus, sim.map.id);
  setCommandTarget({ host, interaction, cancel: () => scene.cancel() });
  game.scene.add(key, scene, true);
  return {
    host,
    interaction,
    scene,
    tileCenter: (col, row, out) => scene.tileCenter(col, row, out),
    firstFrame,
    stop() {
      setCommandTarget(null);
      unbindHud();
      unbindRadio();
      game.scene.remove(key);
    },
  };
}
