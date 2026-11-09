// UI view models (signals). The host updates them (app/hud.ts, after every frame, only when a
// value changes); components read them and act through app/commands.ts.
import { signal } from '@preact/signals';
import type { ScreenId, Speed } from '../app/testHookTypes.ts';

/** The screen the overlay shows. `null` while booting. */
export const screen = signal<ScreenId | null>(null);

/** Game speed (0 is paused). Mirrors the host loop's speed during a battle. */
export const speed = signal<Speed>(1);

/**
 * The battle HUD's view model (T106 builds the widgets). Mirrors sim state and the battle's
 * interaction state; never write these from components, use app/commands.ts.
 */
export const hud = {
  /** The map being played, or null outside a battle. */
  mapId: signal<string | null>(null),
  credits: signal(0),
  /** Core integrity (lose at 0). */
  integrity: signal(0),
  /** The last wave started (0 during the setup phase). */
  wave: signal(0),
  waveCount: signal(0),
  outcome: signal<'playing' | 'won' | 'lost'>('playing'),
  /** The loadout, in slot order (build slots 1–4). */
  loadout: signal<readonly string[]>([]),
  /** Loadout towers still locked (towerUnlockWave). */
  lockedTowers: signal<readonly string[]>([]),
  /** The selected tower's uid, or 0. */
  selectedTower: signal(0),
  /** The tower armed for building (a build slot), or null. */
  armedTower: signal<string | null>(null),
};
