// The "incoming" flags on the playfield (T326, T431; core-loop.md § 2.2, § 2.4): one pennant on
// each spawn the next wave comes from (spawnFlags.ts), during the setup and every countdown,
// pulsing at 1 Hz in phase with the HUD's Call pulse (steady under reduced motion). A plain click
// on a flagged spawn calls the wave (render/input/intents.ts `callWave`). Drawn in `overlay`, so
// no tower or unit hides it. Pooled: nothing allocates per frame.
import type * as Phaser from 'phaser';
import type { CompiledMapDef } from '../../content/compiled.ts';
import type { IdSpace } from '../../content/types.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { imageToCanvas } from '../sprites/canvas.ts';
import { FLAG_FOOT, spawnFlagAlpha, spawnFlagImage } from '../vfx/spawnFlagPixels.ts';
import { incomingSpawns, type FlagState } from './spawnFlags.ts';
import type { ViewContext } from './ViewContext.ts';

const FLAG_KEY = 'overlay.spawn_flag';
/** Flags drawn at once: a map's spawns (A1M2 has two; none has more than four). */
const MAX_FLAGS = 4;

const pos: Vec2 = { x: 0, y: 0 };

export class SpawnFlagView {
  readonly #ctx: ViewContext;
  readonly #map: Pick<CompiledMapDef<IdSpace>, 'waves' | 'cols' | 'rows'>;
  readonly #reduced: () => boolean;
  readonly #pulseOn: () => boolean;
  readonly #flags: Phaser.GameObjects.Image[] = [];
  readonly #at: number[] = [];
  #shown = 0;

  constructor(
    ctx: ViewContext,
    map: Pick<CompiledMapDef<IdSpace>, 'waves' | 'cols' | 'rows'>,
    reduced: () => boolean,
    pulseOn: () => boolean,
  ) {
    this.#ctx = ctx;
    this.#map = map;
    this.#reduced = reduced;
    this.#pulseOn = pulseOn;
    const { scene, layers } = ctx;
    if (!scene.textures.exists(FLAG_KEY)) {
      scene.textures.addCanvas(FLAG_KEY, imageToCanvas(spawnFlagImage()));
    }
    for (let i = 0; i < MAX_FLAGS; i++) {
      const img = scene.make.image({}, false).setTexture(FLAG_KEY);
      img.setDisplayOrigin(FLAG_FOOT.x, FLAG_FOOT.y).setVisible(false);
      layers.overlay.add(img);
      this.#flags.push(img);
    }
  }

  /** How many flags show (the smoke hooks' view of them). */
  get shown(): number {
    return this.#shown;
  }

  /** Places the flags for the schedule now, and steps their pulse. */
  update(state: FlagState): void {
    const n = Math.min(MAX_FLAGS, incomingSpawns(this.#map, state, this.#at));
    const alpha = spawnFlagAlpha(this.#pulseOn(), this.#reduced());
    const cols = this.#map.cols;
    for (let i = 0; i < MAX_FLAGS; i++) {
      const img = this.#flags[i]!; // i < MAX_FLAGS
      if (i >= n) {
        if (img.visible) img.setVisible(false);
        continue;
      }
      const at = this.#at[i] ?? 0;
      const col = at % cols;
      gridToScreen(col + 0.5, (at - col) / cols + 0.5, this.#ctx.origin, pos);
      img.setPosition(Math.round(pos.x), Math.round(pos.y)).setAlpha(alpha).setVisible(true);
    }
    this.#shown = n;
  }

  reset(): void {
    for (const img of this.#flags) img.setVisible(false);
    this.#shown = 0;
  }
}
