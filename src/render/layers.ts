// The playfield's fixed layers, bottom to top (art/tech-spec.md § Depth sorting). Each is a
// Phaser Layer; `world` and `air` sort their children by depth (render/depth.ts), and the rest
// draw in insertion order.
import type * as Phaser from 'phaser';

export const LAYER_NAMES = [
  'backdrop',
  'ground',
  'decal',
  'world',
  'air',
  'vfx',
  'lighting',
  'overlay',
] as const;
export type LayerName = (typeof LAYER_NAMES)[number];
export type Layers = Readonly<Record<LayerName, Phaser.GameObjects.Layer>>;

/** Creates the eight layers in draw order. */
export function createLayers(scene: Phaser.Scene): Layers {
  const make = (depth: number): Phaser.GameObjects.Layer => scene.add.layer().setDepth(depth);
  return {
    backdrop: make(0),
    ground: make(1),
    decal: make(2),
    world: make(3),
    air: make(4),
    vfx: make(5),
    lighting: make(6),
    overlay: make(7),
  };
}
