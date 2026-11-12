// A speaker's portrait in the DOM (art-direction.md § Portraits and icons, § Dialogue presentation):
// the 48×48 bust (Gerald: his 16×16 icon) shown 1:1 in game pixels, its mouth flapping between the
// expression and its `_talk` frame while the line types, a comms screen's scanline flicker at rest,
// QUILL's one gold `policy_flash` frame as a policy line starts, a blinking silence (Purge's status
// bar, `blink`), and the derived `dark` bake for an absent speaker. Frames are baked from the same sprite definitions as the canvas art, once per
// sprite, and each frame becomes a data URL the first time it's drawn.
import { useEffect, useRef, useState } from 'preact/hooks';
import { PALETTES } from '../../content/palettes/index.ts';
import { SCAN_FPS, TALK_FPS } from '../../content/sprites/portraits/portrait.ts';
import { spriteDef } from '../../content/sprites/registry.ts';
import {
  bakeSprite,
  DEFAULT_VARIANT,
  frameKey,
  type BakedSprite,
} from '../../render/sprites/bake.ts';
import { imageToCanvas } from '../../render/sprites/canvas.ts';
import { prefersReducedMotion } from '../motion.ts';
import { pickFrame, type FramePhase } from './portraitFrames.ts';
import { plateColor } from './plate.ts';
import type { LineView, PortraitView } from './state.ts';

/** QUILL's policy flash lasts one frame of its 8 fps `policy_in` (125 ms). */
const FLASH_MS = 125;
/** A blinking silence (`PortraitView.blink`: Purge's status bar) changes frame twice a second. */
export const BLINK_FPS = 2;
const DARK = `${DEFAULT_VARIANT}+dark`;

interface SpriteFrames {
  readonly baked: BakedSprite;
  readonly names: ReadonlySet<string>;
  readonly urls: Map<string, string>;
}

const sprites = new Map<string, SpriteFrames | null>();

/** The sprite's baked frames (null when no such sprite is registered yet). */
function spriteFrames(id: string): SpriteFrames | null {
  const hit = sprites.get(id);
  if (hit !== undefined) return hit;
  const def = spriteDef(id);
  // Not registered yet (the portraits' chunk is still loading): not cached, so it bakes later.
  if (def === undefined) return null;
  const baked = bakeSprite(def, PALETTES);
  const out: SpriteFrames = {
    baked,
    names: new Set(baked.frameNames),
    urls: new Map<string, string>(),
  };
  sprites.set(id, out);
  return out;
}

/** A frame's data URL and size, or null. */
function frameUrl(
  s: SpriteFrames,
  sprite: string,
  frame: string,
  dark: boolean,
): { url: string; w: number; h: number } | null {
  const key = frameKey(sprite, dark ? DARK : DEFAULT_VARIANT, frame);
  const baked = s.baked.frames.find((f) => f.key === key);
  if (baked === undefined) return null;
  let url = s.urls.get(key);
  if (url === undefined) {
    url = imageToCanvas(baked.image).toDataURL();
    s.urls.set(key, url);
  }
  return { url, w: baked.image.w, h: baked.image.h };
}

/**
 * The phase to draw `ms` after the line started: the policy flash first, then (while `talking`)
 * the mouth flap at TALK_FPS, else (for comms screens) the scanline flicker at SCAN_FPS.
 */
function phaseAt(p: PortraitView, ms: number, talking: boolean, still: boolean): FramePhase {
  if (p.policy && ms < FLASH_MS) return 'flash';
  if (still) return 'rest';
  if (p.blink) return Math.floor((ms * BLINK_FPS) / 1000) % 2 === 1 ? 'talk' : 'rest';
  if (talking) return Math.floor((ms * TALK_FPS) / 1000) % 2 === 1 ? 'talk' : 'rest';
  return Math.floor((ms * SCAN_FPS) / 1000) % 2 === 1 ? 'scan' : 'rest';
}

/** The ms since `key` changed, ticking while `running` (one timer per mounted portrait). */
function useClock(key: number, running: boolean): number {
  const start = useRef({ key, at: performance.now() });
  if (start.current.key !== key) start.current = { key, at: performance.now() };
  const [, tick] = useState(0);
  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => tick((n) => n + 1), 1000 / (TALK_FPS * 2));
    return () => clearInterval(id);
  }, [running, key]);
  return performance.now() - start.current.at;
}

/**
 * The frame box for `line`'s speaker: the portrait (or Gerald's icon) in a 1 px frame of the
 * speaker's colour, or a lettered placeholder while the art is still to come. Decorative: the
 * name plate beside it names the speaker.
 */
export function Portrait({
  line,
  talking,
  still: held = false,
}: {
  line: LineView;
  talking: boolean;
  /** At rest for good: no flap, flicker or policy flash (the briefing's earlier faces; T803e). */
  still?: boolean;
}) {
  const p = line.portrait;
  const still = held || prefersReducedMotion();
  const ms = useClock(line.id, p !== null && !still);
  const style = { '--dlg-edge': plateColor(line.color) };
  if (p === null) return null;
  const s = spriteFrames(p.sprite);
  const frame =
    s === null ? null : pickFrame(s.names, p.variant, p.expression, held ? 'rest' : phaseAt(p, ms, talking, still));
  const img = s === null || frame === null ? null : frameUrl(s, p.sprite, frame, p.dark);
  return (
    <span
      class={`dlg-portrait${p.icon ? ' icon' : ''}${p.dark ? ' dark' : ''}`}
      data-voice="portrait"
      style={style}
      aria-hidden="true"
      data-frame={frame ?? ''}
    >
      {img === null ? (
        <span class="dlg-portrait-missing">{line.name.charAt(0)}</span>
      ) : (
        <img src={img.url} width={img.w} height={img.h} alt="" />
      )}
    </span>
  );
}
