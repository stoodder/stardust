// What every view needs from its scene: the Phaser scene, the sprite source, the layers, and the
// map's iso origin.
import type * as Phaser from 'phaser';
import type { IsoOrigin } from '../iso.ts';
import type { Layers } from '../layers.ts';
import type { SpriteSource } from '../sprites/SpriteSource.ts';

export interface ViewContext {
  readonly scene: Phaser.Scene;
  readonly sprites: SpriteSource;
  readonly layers: Layers;
  readonly origin: IsoOrigin;
}

/** The variant name for a palette variant, plain or selected (`default+selected`). */
export function variantName(base: string, selected: boolean): string {
  return selected ? `${base}+selected` : base;
}
