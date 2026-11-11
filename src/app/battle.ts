// A battle session: one sim, its host loop, the interaction state, and the BattleScene drawing
// it. The router starts and stops sessions; commands, the HUD, and the test hooks reach the live
// one through it.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../content/types.ts';
import { BattleInteraction } from '../render/input/BattleInteraction.ts';
import { BATTLE_SCENE_KEY, BattleScene } from '../render/scenes/BattleScene.ts';
import { createSim, type SimConfig } from '../sim/index.ts';
import { speaking } from '../ui/dialogue/state.ts';
import { hud } from '../ui/state.ts';
import { issue, setCommandTarget } from './commands.ts';
import { createHost, type Host } from './host.ts';
import { bindHud, hudSaveInfo, showNotice, type HudOptions } from './hud.ts';
import { rejectText } from './hudText.ts';
import { bindBattleAudio } from './audio.ts';
import { bindDialogue } from './dialogue.ts';
import { bindClickables, bindPeeker } from './peeker.ts';
import { bindForcedInput } from './forcedInput.ts'; // T605
import type { Resume } from './checkpoints.ts';

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

/** How a battle starts, beyond its config. */
export interface BattleStart {
  /**
   * Resume the run from a checkpoint (app/checkpoints.ts): `cfg` must be the run's own config.
   * The run is replayed before the battle shows.
   */
  readonly resume?: Resume<IdSpace>;
  /**
   * Subscribes the caller's own listeners (the router's) to the new host, before any resumed
   * run's replay, so they count its events too.
   */
  readonly listen?: (host: Host<IdSpace>) => void;
}

/**
 * Starts a battle on `cfg` in a new BattleScene. Throws a RangeError on an invalid config. A
 * resumed run is replayed up to its checkpoint once the HUD, dialogue, and `listen` are wired
 * (they rebuild their state from its events; `Host.replaying`), and before audio and the scene,
 * which start from the state it reached.
 */
export function startBattle(
  game: Phaser.Game,
  cfg: SimConfig<IdSpace>,
  hudOptions: HudOptions = { briefing: false },
  start: BattleStart = {},
): Battle {
  const sim = createSim(cfg);
  const host = createHost(sim, start.resume === undefined ? {} : { resume: start.resume });
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
      teachUpgrade: () => hud.upgradeHint.value,
      // The line being spoken points at the first-built turret (D059's Denise pointer).
      pointFirstTower: () => {
        const l = speaking.value;
        return l !== null && l.point ? l.id : 0;
      },
      // Bricks's name tag (T431): the turret carrying it, set by app/dialogue.ts's tagging.
      nameTag: () => hud.nameTag.value,
    },
    key,
  );
  // Read once, before the HUD marks this run's newly issued towers as fielded (meta/hints.ts).
  const save = hudOptions.save ?? hudSaveInfo(sim.map.id, sim.config.loadout);
  const unbindHud = bindHud(host, interaction, { ...hudOptions, save });
  const unbindDialogue = bindDialogue(host, {
    briefing: hudOptions.briefing,
    newTowers: save.newTowers,
  });
  start.listen?.(host);
  try {
    host.catchUp();
  } catch (err) {
    unbindDialogue();
    unbindHud();
    throw err;
  }
  const unbindAudio = bindBattleAudio(host);
  const unbindPeeker = bindPeeker(sim.map, interaction);
  const unbindClickables = bindClickables(host);
  const unbindForcedInput = bindForcedInput(host); // T605
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
      // Dialogue first: closing the briefing as the HUD unwinds would start the map's lines.
      unbindDialogue();
      unbindHud();
      unbindAudio();
      unbindPeeker();
      unbindClickables();
      unbindForcedInput();
      game.scene.remove(key);
    },
  };
}
