// A3M6's Dome Row at night (T730b; the rules are domeRow.ts): Dome 1 (GroundView's `dome_1` prop,
// drawn `open` beside the gate) frosts over as the map goes on; each refugee who reaches the gate
// turns in at its door (a few steps from the gate and gone inside, on sim ticks); and as the map is
// won the Long Night's dark domes on the apron open one after another in the hold before Results
// (Goldie's "All of them"; the Waykeeper beat that follows is staged at Dome 1, T714). Reduced
// motion: a turn-in fades where it stands, and the domes open all at once. The domes' glows follow
// their frames (WorldGlowView). Only on a map with a `dome_1` marker. Allocation-free per frame:
// the turn-ins are a fixed pool, the poses a reused scratch.
import * as Phaser from 'phaser';
import type { GridPos, IdSpace } from '../../content/types.ts';
import type { Bus } from '../../shared/bus.ts';
import type { SimEvent } from '../../sim/index.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import {
  DOME_ONE,
  DOME_SPRITE,
  domeFrost,
  domeOpensAt,
  TURN_IN_REACH,
  turnInPose,
  type DomeFrost,
  type TurnInPose,
} from './domeRow.ts';
import { PEBBLE_SPRITE, REFUGEE_SPRITE, REFUGEE_VARIANT } from './RefugeeView.ts';
import { facingOf } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

/** Turn-ins that can play at once (a group arrives a refugee every few ticks). */
const MAX_TURN_INS = 8;
/** Their depth tie-breaks (not pooled sim entities). */
const TURN_IN_TIE = 0x1c0;

interface TurnIn {
  readonly body: Phaser.GameObjects.Sprite;
  active: boolean;
  /** Started on the next update's tick (the event carries none): −1 until then. */
  startTick: number;
  pebble: boolean;
}

/** The map as the view reads it. */
export interface DomeRowMap {
  readonly markers: Readonly<Record<string, GridPos>>;
  readonly safeExit?: string | null;
  readonly waves: readonly unknown[];
}

const at: Vec2 = { x: 0, y: 0 };
const pose: TurnInPose = { share: 0, alpha: 1, done: false };

export class DomeRowView {
  readonly #ctx: ViewContext;
  readonly #reducedMotion: () => boolean;
  readonly #waveCount: number;
  readonly #dome: Phaser.GameObjects.Sprite | null;
  /** The apron's dark domes (they open as the map is won). */
  readonly #apron: Phaser.GameObjects.Sprite[] = [];
  readonly #turnIns: TurnIn[] = [];
  /** The gate's and Dome 1's door's ground points (screen px). */
  readonly #gate: Vec2 = { x: 0, y: 0 };
  readonly #door: Vec2 = { x: 0, y: 0 };
  readonly #facing: string = 'se';
  #frost: DomeFrost | null = null;
  #next = 0;
  /** Real ms since the win (−1: not won). */
  #wonMs = -1;
  #opened = 0;
  /** Turn-ins seen (the smoke flow's check). */
  turnedIn = 0;

  constructor(ctx: ViewContext, map: DomeRowMap, reducedMotion: () => boolean = () => false) {
    this.#ctx = ctx;
    this.#reducedMotion = reducedMotion;
    this.#waveCount = map.waves.length;
    const domeAt = map.markers[DOME_ONE];
    const gateAt = map.safeExit === null || map.safeExit === undefined ? undefined : map.markers[map.safeExit];
    const { scene, layers, origin } = ctx;
    if (domeAt === undefined) {
      this.#dome = null;
      return;
    }
    gridToScreen(domeAt[0] + 0.5, domeAt[1] + 0.5, origin, at);
    let dome: Phaser.GameObjects.Sprite | null = null;
    for (const obj of layers.world.list) {
      if (!(obj instanceof Phaser.GameObjects.Sprite)) continue;
      if (!obj.frame.name.startsWith(`${DOME_SPRITE}#`)) continue;
      if (obj.x === at.x && obj.y === at.y) dome = obj;
      else this.#apron.push(obj);
    }
    this.#dome = dome;
    if (gateAt !== undefined) {
      // From the gate's centre toward Dome 1's door (its tile's centre, short of it: the door is
      // in the shell's front).
      const gx = gateAt[0] + 0.5;
      const gy = gateAt[1] + 0.5;
      const dx = domeAt[0] + 0.5 - gx;
      const dy = domeAt[1] + 0.5 - gy;
      gridToScreen(gx, gy, origin, this.#gate);
      gridToScreen(gx + dx * TURN_IN_REACH, gy + dy * TURN_IN_REACH, origin, this.#door);
      this.#facing = facingOf(dx, dy);
      for (let i = 0; i < MAX_TURN_INS; i++) {
        const body = scene.make.sprite({}, false).setVisible(false);
        layers.world.add(body);
        this.#turnIns.push({ body, active: false, startTick: -1, pebble: false });
      }
    }
  }

  /** Turns refugees in at the door as they reach the gate, and opens the domes on the win. */
  bind(bus: Bus<SimEvent<IdSpace>>): () => void {
    if (this.#dome === null) return () => undefined;
    const offs = [
      bus.on('RefugeeEvacuated', (e) => this.#turnIn(e.pebble)),
      bus.on('MapWon', () => {
        if (this.#wonMs < 0) this.#wonMs = 0;
      }),
    ];
    return () => {
      for (const off of offs) off();
    };
  }

  /** Each frame: Dome 1's frost, the turn-ins under way, and the domes opening after a win. */
  update(dtMs: number, wave: number, tick: number): void {
    const dome = this.#dome;
    if (dome === null) return;
    const frost = domeFrost(wave, this.#waveCount);
    if (frost !== this.#frost) {
      this.#frost = frost;
      this.#show(dome, frost);
    }
    const still = this.#reducedMotion();
    for (let i = 0; i < this.#turnIns.length; i++) {
      const t = this.#turnIns[i]!; // i < length
      if (!t.active) continue;
      if (t.startTick < 0) t.startTick = tick;
      turnInPose(tick - t.startTick, still, pose);
      if (pose.done) {
        t.active = false;
        t.body.stop().setVisible(false);
        continue;
      }
      const x = Math.round(this.#gate.x + (this.#door.x - this.#gate.x) * pose.share);
      const y = Math.round(this.#gate.y + (this.#door.y - this.#gate.y) * pose.share);
      t.body.setPosition(x, y).setAlpha(pose.alpha).setVisible(true);
      t.body.setDepth(worldDepth(y, 'enemy', TURN_IN_TIE + i));
      if (still && t.body.anims.isPlaying) t.body.anims.pause();
    }
    if (this.#wonMs < 0 || this.#opened >= this.#apron.length) return;
    this.#wonMs += Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 0;
    while (this.#opened < this.#apron.length && this.#wonMs >= domeOpensAt(this.#opened, still)) {
      this.#show(this.#apron[this.#opened]!, 'open'); // opened < length
      this.#opened++;
    }
  }

  /** A refugee reached the gate: it turns in at the door (on the next update's tick). */
  #turnIn(pebble: boolean): void {
    if (this.#turnIns.length === 0) return;
    const t = this.#turnIns[this.#next]!; // next < length
    this.#next = (this.#next + 1) % this.#turnIns.length;
    this.turnedIn++;
    t.active = true;
    t.startTick = -1;
    t.pebble = pebble;
    const { sprites } = this.#ctx;
    const sprite = pebble ? PEBBLE_SPRITE : REFUGEE_SPRITE;
    const anim = `walk_${this.#facing}`;
    t.body.play(sprites.anim(sprite, anim, REFUGEE_VARIANT), true);
    const a = sprites.frameAnchor(sprite, `${anim}_0`);
    t.body.setDisplayOrigin(a.x, a.y).setPosition(this.#gate.x, this.#gate.y).setAlpha(1);
  }

  #show(dome: Phaser.GameObjects.Sprite, frame: string): void {
    const name = dome.frame.name;
    const variant = name.slice(name.indexOf('#') + 1, name.lastIndexOf(':'));
    const f = this.#ctx.sprites.frame(DOME_SPRITE, frame, variant);
    dome.setTexture(f.texture, f.frame);
  }

  /** What shows now (`__sd.render()`): Dome 1's frame, turn-ins under way and seen, domes opened. */
  get shown(): {
    readonly dome: string;
    readonly turningIn: number;
    readonly turnedIn: number;
    readonly opened: number;
  } {
    let turningIn = 0;
    for (const t of this.#turnIns) if (t.active) turningIn++;
    const name = this.#dome?.frame.name ?? '';
    return {
      dome: name === '' ? 'none' : name.slice(name.lastIndexOf(':') + 1),
      turningIn,
      turnedIn: this.turnedIn,
      opened: this.#opened,
    };
  }

  reset(): void {
    for (const t of this.#turnIns) {
      t.active = false;
      t.body.stop().setVisible(false);
    }
  }
}
