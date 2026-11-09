// scratch previewer: node --experimental-strip-types .tmp-preview/preview.ts <out.png> <scale> <spriteId[:frame,frame]>...
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { SPRITES } from '../src/content/sprites/index.ts';
import { PALETTES } from '../src/content/palettes/index.ts';
import { bakeSprite } from '../src/render/sprites/bake.ts';

const [out, scaleS, ...specs] = process.argv.slice(2);
const S = Number(scaleS);
type F = { w: number; h: number; data: Uint8ClampedArray | Uint8Array | number[] };
const tiles: { img: F; label: string }[] = [];
for (const spec of specs) {
  const [id, fl] = spec.split(':');
  const def = SPRITES.find((d) => d.id === id)!;
  const b = bakeSprite(def as never, PALETTES as never);
  const want = fl?.split(',');
  for (const f of b.frames) {
    const [, rest] = f.key.split('#');
    const [variant, name] = rest!.split(':');
    if (variant !== 'default') continue;
    if (want && !want.includes(name!)) continue;
    tiles.push({ img: f.image as unknown as F, label: name! });
  }
}
const gap = 2;
const W = tiles.reduce((s, t) => s + (t.img.w + gap) * S, 0) + gap * S;
const H = Math.max(...tiles.map((t) => t.img.h)) * S + 2 * gap * S;
const buf = new Uint8Array(W * H * 4);
for (let i = 0; i < W * H; i++) buf.set([40, 34, 60, 255], i * 4);
let ox = gap * S;
for (const t of tiles) {
  const { w, h, data } = t.img;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const a = data[k + 3]!;
      const checker = ((x + y) & 1) === 0 ? [60, 52, 84] : [52, 46, 74];
      const px = a === 0 ? checker : [data[k]!, data[k + 1]!, data[k + 2]!];
      for (let dy = 0; dy < S; dy++)
        for (let dx = 0; dx < S; dx++) {
          const o = ((gap * S + y * S + dy) * W + ox + x * S + dx) * 4;
          buf.set([px[0]!, px[1]!, px[2]!, 255], o);
        }
    }
  ox += (w + gap) * S;
}
// PNG encode
const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (b: Uint8Array) => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type: string, data: Uint8Array) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), Buffer.from(data)]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
const raw = Buffer.alloc((W * 4 + 1) * H);
for (let y = 0; y < H; y++) { raw[y * (W * 4 + 1)] = 0; Buffer.from(buf.buffer, y * W * 4, W * 4).copy(raw, y * (W * 4 + 1) + 1); }
const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4); ihdr[8] = 8; ihdr[9] = 6;
writeFileSync(out!, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array())]));
console.log('wrote', out, W, H, tiles.map((t) => t.label).join(' '));
