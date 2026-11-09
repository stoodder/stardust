// The renderer's only door to sprite art (tech-spec § Naming contract). Render code never
// touches grids; it asks a SpriteSource for frames and animations by stable names.
import type * as Phaser from 'phaser';
import type { SpriteId } from '../../content/sprites/index.ts';
import type { Point } from '../../content/sprites/types.ts';

export interface FrameRef {
  readonly texture: string;
  readonly frame: string;
}

export interface SpriteSource {
  /** Registers textures, frames, and animations with the scene's game. */
  load(scene: Phaser.Scene): Promise<void>;
  /** A frame by name. `variant` defaults to `default`; derived ones are `<variant>+selected`. */
  frame(spriteId: SpriteId, frame: string, variant?: string): FrameRef;
  /** Like `frame`, for the additive `@glow` halo; `null` if the sprite has no glow. */
  glowFrame(spriteId: SpriteId, frame: string, variant?: string): FrameRef | null;
  /** A registered animation key. */
  anim(spriteId: SpriteId, anim: string, variant?: string): string;
  /** Size and anchor of the sprite's default frames (after the outline pass). */
  meta(spriteId: SpriteId): { w: number; h: number; anchor: Point };
  /** The anchor of one frame (mirrored frames of an off-center sprite differ from `meta`). */
  frameAnchor(spriteId: SpriteId, frame: string): Point;
  /** Tower bases: where the head's anchor goes, in this sprite's (outlined) pixels. */
  mount(spriteId: SpriteId): Point | null;
}
