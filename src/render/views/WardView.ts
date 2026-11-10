// The Ward (design/enemies.md § 6.1 `pivot`; maps.md § 5.4; T506's minimal view, T530a and T540b
// polish): a pivoted boss kneeling where it stood, as an ally (`Ally.kind` 'ward'; AllyView draws
// no ward). Each frame, for every live Ward: its boss's body sprite (`Ally.enemyId`'s def's, in a
// `kneel` pose when the art has one, else the bowed `puff` pose the Glass Witch's placeholder
// shares, else its first walk frame) on its ground point in `world`, and a solid `blue.3` ring at
// its aura's radius (`Ally.rangeSq`) over a 1 px `ink.0` under-stroke in `decal`, steady: the
// chill holds as long as a Hollow unit stays inside (the Cantor's dashed `blue.4` ring crawls; this
// one doesn't). Allocation-free per frame: pooled bodies and rings, set up when a Ward first shows.
import type * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { Ally } from '../../sim/index.ts';
import type { DeepReadonly } from '../../shared/types.ts';
import { worldDepth } from '../depth.ts';
import { gridToScreen, type Vec2 } from '../iso.ts';
import { effectRingTexture } from '../vfx/overlayTextures.ts';
import { hasAnim, spriteId } from './spriteInfo.ts';
import type { ViewContext } from './ViewContext.ts';

/** The ally pool as the Ward view reads it. */
export interface WardPool {
  readonly used: number;
  readonly items: readonly DeepReadonly<Ally>[];
}

const MAX_WARDS = 2;
const RING_COLOR = 'blue.3';
const RING_UNDER = 'ink.0';

/** The frame a Ward kneels in: `kneel_se_0`, else `puff_se_0`, else `walk_se_0`. */
export function wardFrame(id: SpriteId): string {
  if (hasAnim(id, 'kneel_se')) return 'kneel_se_0';
  if (hasAnim(id, 'puff_se')) return 'puff_se_0';
  return 'walk_se_0';
}

interface Slot {
  readonly body: Phaser.GameObjects.Image;
  readonly ring: Phaser.GameObjects.Image;
  uid: number;
}

const pos: Vec2 = { x: 0, y: 0 };

export class WardView {
  readonly #ctx: ViewContext;
  readonly #slots: Slot[] = [];
  /** The body sprite for each boss id (resolved once). */
  readonly #bodyOf = new Map<string, SpriteId>();
  /** A boss id's body sprite id, from the run's content. */
  readonly #spriteOf: (enemyId: string) => string;

  constructor(ctx: ViewContext, spriteOf: (enemyId: string) => string) {
    this.#ctx = ctx;
    this.#spriteOf = spriteOf;
    for (let i = 0; i < MAX_WARDS; i++) {
      const body = ctx.scene.make.image({}, false).setVisible(false);
      const ring = ctx.scene.make.image({}, false).setVisible(false);
      ctx.layers.world.add(body);
      ctx.layers.decal.add(ring);
      this.#slots.push({ body, ring, uid: 0 });
    }
  }

  /** How many Wards show now (the smoke flow's check). */
  get shown(): number {
    let n = 0;
    for (const s of this.#slots) if (s.ring.visible) n++;
    return n;
  }

  update(allies: WardPool): void {
    let n = 0;
    for (let i = 0; i < allies.used && n < MAX_WARDS; i++) {
      const a = allies.items[i]!; // i < used ≤ items.length
      if (!a.alive || a.kind !== 'ward' || a.enemyId === null) continue;
      const slot = this.#slots[n++]!; // n < MAX_WARDS
      if (slot.uid !== a.uid) this.#show(slot, a);
    }
    for (; n < MAX_WARDS; n++) {
      const slot = this.#slots[n]!; // n < MAX_WARDS
      if (slot.uid !== 0) this.#hide(slot);
    }
  }

  reset(): void {
    for (const s of this.#slots) this.#hide(s);
  }

  #show(slot: Slot, a: DeepReadonly<Ally>): void {
    slot.uid = a.uid;
    const { sprites, origin, scene } = this.#ctx;
    gridToScreen(a.x, a.y, origin, pos);
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    const id = this.#body(a.enemyId!); // update checked it
    const frame = wardFrame(id);
    const f = sprites.frame(id, frame);
    const anchor = sprites.frameAnchor(id, frame);
    slot.body
      .setTexture(f.texture, f.frame)
      .setDisplayOrigin(anchor.x, anchor.y)
      .setPosition(x, y)
      .setDepth(worldDepth(pos.y, 'enemy', a.uid))
      .setVisible(true);
    const tex = effectRingTexture(scene, Math.sqrt(a.rangeSq), RING_COLOR, RING_UNDER);
    slot.ring.setTexture(tex.key).setDisplayOrigin(tex.ox, tex.oy).setPosition(x, y);
    slot.ring.setVisible(true);
  }

  #hide(slot: Slot): void {
    slot.uid = 0;
    slot.body.setVisible(false);
    slot.ring.setVisible(false);
  }

  #body(enemyId: string): SpriteId {
    let id = this.#bodyOf.get(enemyId);
    if (id === undefined) {
      id = spriteId(this.#spriteOf(enemyId));
      this.#bodyOf.set(enemyId, id);
    }
    return id;
  }
}
