// A3M3's blast doors (T630b; act3.md § A3M3; art-direction §6 *The blast doors*; the rules are
// blastDoor.ts): on each door core (a `door_<name>` marker), GroundView's core prop is redrawn as
// `prop.blast_door`, and CoreView leaves its overlays off those tiles. The door C3 chose stands
// `open`, lit warm from the shelter; the other is `shut` and dark. On the SEAL (the forced input
// `seal`, as its button is pressed) each open door runs shut (`closing`, once) and holds `sealed`
// under its turning alarm; under reduced motion it is `sealed_0` at once, still. A battle that
// opens with the SEAL already pressed shows it sealed. Each door wears a glow that follows its
// frame (frameGlow.ts: the doorway's light, the beacon, the seal lamp). Made right after the
// ground, before WorldGlowView, so the world's glow sees a door, not a core. Allocation-free per
// frame.
import type * as Phaser from 'phaser';
import type { IdSpace } from '../../content/types.ts';
import type { ScriptFlags } from '../../sim/index.ts';
import type { Bus } from '../../shared/bus.ts';
import type { SimEvent } from '../../sim/index.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import {
  BLAST_DOOR,
  doorCores,
  doorLook,
  SEAL_INPUT,
  type DoorMap,
  type SealPhase,
} from './blastDoor.ts';
import { FrameGlow } from './frameGlow.ts';
import type { ViewContext } from './ViewContext.ts';

/** The last frame of `closing`, the first of `sealed`. */
const SEALED_0 = ':sealed_0';

interface Door {
  readonly marker: string;
  readonly index: number;
  readonly open: boolean;
  readonly body: Phaser.GameObjects.Sprite;
  readonly glow: FrameGlow;
}

export class BlastDoorView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #doors: Door[] = [];
  #seal: SealPhase = 'none';
  #still = false;
  #first = true;

  /** `props`: GroundView's core props by tile index (drawGround's result). */
  constructor(
    ctx: ViewContext,
    map: DoorMap,
    flags: ScriptFlags,
    props: ReadonlyMap<number, Phaser.GameObjects.Sprite>,
    reducedMotion: () => boolean,
  ) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    const { sprites, layers } = ctx;
    for (const d of doorCores(map, flags)) {
      const body = props.get(d.index);
      if (body === undefined) continue;
      const a = sprites.frameAnchor(BLAST_DOOR, 'open');
      body.setDisplayOrigin(a.x, a.y);
      const glow = new FrameGlow(sprites, BLAST_DOOR, DEFAULT_VARIANT, body, layers.world);
      this.#doors.push({ marker: d.marker, index: d.index, open: d.open, body, glow });
    }
    this.#still = reducedMotion();
    for (const door of this.#doors) this.#show(door);
  }

  /** The door core tiles (tile indices), which CoreView leaves bare of its overlays. */
  get tiles(): ReadonlySet<number> {
    return new Set(this.#doors.map((d) => d.index));
  }

  /** Each door's marker and the frame it shows now (for `__sd.render()`; allocates, tests only). */
  looks(): { marker: string; frame: string }[] {
    return this.#doors.map((d) => ({
      marker: d.marker,
      frame: d.body.frame.name.slice(d.body.frame.name.lastIndexOf(':') + 1),
    }));
  }

  /** Where the SEAL stands now. */
  get seal(): SealPhase {
    return this.#seal;
  }

  /** Closes the open doors as the SEAL is pressed. Returns the unsubscribe. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    if (this.#doors.length === 0) return () => undefined;
    return bus.on('ForcedInputResolved', (e) => {
      if (e.id === SEAL_INPUT && this.#seal === 'none') this.#setSeal('closing');
    });
  }

  /** Once a frame (`resolved`: the sim's `forcedResolved`): the closing's end, and the glows. */
  update(resolved: readonly string[]): void {
    if (this.#doors.length === 0) return;
    if (this.#first) {
      this.#first = false;
      if (this.#seal === 'none' && resolved.includes(SEAL_INPUT)) this.#setSeal('sealed');
    }
    const still = this.#reducedMotion();
    if (still !== this.#still) {
      this.#still = still;
      for (const door of this.#doors) this.#show(door);
    }
    // The leaves have run shut: the doors hold sealed under the alarm.
    if (this.#seal === 'closing') {
      // `closing` ends on `sealed_0` (Phaser keeps a finished anim's `isPlaying` a while).
      let running = false;
      for (const d of this.#doors)
        if (d.open && !d.body.frame.name.endsWith(SEALED_0)) running = true;
      if (!running) this.#setSeal('sealed');
    }
    for (const door of this.#doors) door.glow.update();
  }

  #setSeal(seal: SealPhase): void {
    this.#seal = seal;
    for (const door of this.#doors) this.#show(door);
  }

  #show(door: Door): void {
    const { sprites } = this.#ctx;
    const look = doorLook(door.open, this.#seal, this.#still);
    const f = sprites.frame(BLAST_DOOR, look.frame);
    door.body.stop().setTexture(f.texture, f.frame);
    if (look.anim !== null) door.body.play(sprites.anim(BLAST_DOOR, look.anim));
  }

  reset(): void {
    for (const door of this.#doors) door.body.stop();
  }
}
