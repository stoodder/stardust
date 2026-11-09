// Screen routing: which screen the overlay shows and whether a battle is running. M1 has the
// title placeholder and the battle; T115 adds the real title and the results screen.
import type * as Phaser from 'phaser';
import { assertNever } from '../shared/types.ts';
import { screen } from '../ui/state.ts';
import { startBattle, type Battle } from './battle.ts';
import { battleConfig, DEFAULT_MAP_ID, randomSeed } from './battleSetup.ts';
import { setSpeed } from './commands.ts';
import type { ScreenId } from './testHookTypes.ts';

export interface BattleRequest {
  /** Default: DEFAULT_MAP_ID. */
  readonly mapId?: string | null;
  /** Default: a random seed. */
  readonly seed?: number | null;
}

export interface Router {
  /** The running battle, or null. */
  readonly battle: Battle | null;
  /** Shows a screen. Resolves once it has rendered (a battle: its first frame). */
  goto(id: ScreenId, request?: BattleRequest): Promise<void>;
}

/** Creates the router over a booted game. */
export function createRouter(game: Phaser.Game, defaults: BattleRequest = {}): Router {
  let battle: Battle | null = null;
  const stopBattle = (): void => {
    battle?.stop();
    battle = null;
  };
  return {
    get battle() {
      return battle;
    },
    goto(id, request = defaults) {
      switch (id) {
        case 'title':
          stopBattle();
          screen.value = 'title';
          return Promise.resolve();
        case 'battle': {
          stopBattle();
          const mapId = request.mapId ?? DEFAULT_MAP_ID;
          const seed = request.seed ?? randomSeed();
          setSpeed(1);
          battle = startBattle(game, battleConfig(mapId, seed));
          screen.value = 'battle';
          return battle.firstFrame;
        }
        default:
          return assertNever(id);
      }
    },
  };
}
