// Browser glue: baked RGBA buffers → canvases (for Phaser textures and the DOM UI).
import type { RgbaImage } from './rasterize.ts';

/** A new canvas holding the image at 1×. */
export function imageToCanvas(img: RgbaImage): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = img.w;
  canvas.height = img.h;
  drawImageAt(canvas, img, 0, 0);
  return canvas;
}

/** Writes the image's pixels into a canvas at (x, y), replacing what was there. */
export function drawImageAt(canvas: HTMLCanvasElement, img: RgbaImage, x: number, y: number): void {
  if (img.w === 0 || img.h === 0) return;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('sprites: 2D canvas context unavailable');
  ctx.putImageData(new ImageData(img.data, img.w, img.h), x, y);
}
