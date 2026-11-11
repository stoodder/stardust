// A tower's looks beyond its sprites (T630a; TowerView applies them): pure, so they're unit-tested.
// - **A voice:** a head can sing in a voice its sprite authors as extra idle anims (`<idle>_<voice>`
//   and `<idle>_<voice>_spec_<a|b>`): the Hum Choir's `hum_thrum`, Old Thrum's ring, which every
//   Choir sings once the save holds `spared_quiet_wave` (Thrum lived, A1M5's C1; her ring is the
//   A3M1 debrief's gift). Without the flag (A3M4's gift, a dev battle with no save) it sings the
//   plain `hum`. A head with no such anim keeps its own idle (`voicedIdle`).
// - **An idle head's shot:** a head that idles (no aiming facings) and authors a `fire` anim (the
//   Stasis Bloom's crystal: `fire`, `fire_spec_<a|b>`, ~0.3 s) plays it once each time its reload
//   jumps (the field's pulse resets its timer: a `PulseBurst`), then goes back to its idle
//   (`idleFire`). The Den has none: its swarm is SwarmView's.
// - **Powered down** (License Revoked, towers.md § 9; RevokedView's stamp, 1 s): the tower goes
//   dark at once (a `steel.2` multiply, its glows out, its head's anim held on its last frame), and
//   for its last FOLD_MS it folds away: its head sinks into its base, then its base into the ground,
//   each cropped at its own foot as it goes (`powerDownLook`, `foldSinkPx`), whole pixels only.
//   Under reduced motion nothing sinks: it fades down the stepped-alpha ladder instead.
// - **Jailbroken** (towers.md § 9; T740b): a class in the save's `unlocks.jailbroken` (the revoked
//   Everglow class Zibzab's firmware brought back) draws its base's `_jb` twin (the logo plate
//   scratched out, a brass patch bolted on) and its base and head in the `everglow.jailbroken`
//   palette (worn paint, Vrell-orange status lights), selected and glow alike (`jailbreakLook`). A
//   sprite without the twin or the variant draws as it always did.
import type { ColorName } from '../../content/palettes/master.ts';
import type { SpriteId } from '../../content/sprites/index.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';
import { STEPPED_ALPHA } from '../vfx/fxTiming.ts';
import { hasAnim, hasFrame, hasPaletteVariant, idleAnim, type SpecLetter } from './spriteInfo.ts';

/**
 * The voice the battle's towers sing in, from the run's story flags (`SimConfig.scriptFlags`):
 * `thrum` once Thrum was spared (`spared_quiet_wave`), else none.
 */
export function towerVoice(flags: { readonly spared_quiet_wave?: unknown }): 'thrum' | null {
  return flags.spared_quiet_wave === true ? 'thrum' : null;
}

/** The idle anim a head plays in `voice` (null: none), falling back to its own (`idleAnim`). */
export function voicedIdle(
  id: SpriteId,
  idle: string,
  spec: SpecLetter | null,
  voice: string | null,
): string {
  if (voice !== null) {
    const own = `${idle}_${voice}`;
    const specced = spec === null ? own : `${own}_spec_${spec}`;
    if (hasAnim(id, specced)) return specced;
    if (hasAnim(id, own)) return own;
  }
  return idleAnim(id, idle, spec);
}

/** An idle head's shot anim for its spec (`fire_spec_<x>`, else `fire`), or '' for none. */
export function idleFire(id: SpriteId, spec: SpecLetter | null): string {
  if (spec !== null && hasAnim(id, `fire_spec_${spec}`)) return `fire_spec_${spec}`;
  return hasAnim(id, 'fire') ? 'fire' : '';
}

/** A powered-down tower's multiply tint. */
export const POWER_DOWN_COLOR: ColorName = 'steel.2';
/** How long the tower stays under its stamp (RevokedView's STAMP_MS), and its fold at the end. */
export const POWER_DOWN_MS = 1000;
export const FOLD_MS = 360;

/**
 * A powered-down tower's look `ms` into its stamp: how far its fold has gone (0–1; 0 until the
 * last FOLD_MS) and its alpha (whole, or under reduced motion the stepped fade the fold becomes).
 */
export function powerDownLook(
  ms: number,
  reducedMotion: boolean,
): { readonly fold: number; readonly alpha: number } {
  const t = Math.min(1, Math.max(0, (ms - (POWER_DOWN_MS - FOLD_MS)) / FOLD_MS));
  if (!reducedMotion) return { fold: t, alpha: 1 };
  if (t <= 0) return { fold: 0, alpha: 1 };
  const step = Math.min(STEPPED_ALPHA.length - 1, Math.floor(t * STEPPED_ALPHA.length));
  return { fold: 0, alpha: STEPPED_ALPHA[step]! }; // step < length
}

/**
 * How far the head and the base have sunk (whole px) at `fold` (0–1) for a head `headH` and a
 * base `baseH` px tall: the head over the first half, into the base, then the base over the second,
 * into the ground.
 */
export function foldSinkPx(
  fold: number,
  headH: number,
  baseH: number,
): { readonly head: number; readonly base: number } {
  const f = Math.min(1, Math.max(0, fold));
  return {
    head: Math.round(Math.min(1, 2 * f) * headH),
    base: Math.round(Math.max(0, 2 * f - 1) * baseH),
  };
}

/** The jailbroken palette (content/palettes/factions.ts). */
export const JAILBROKEN_PALETTE = 'everglow.jailbroken';
/** The suffix of a base frame's jailbroken twin (content/sprites/towers/base.ts `withJailbreak`). */
export const JAILBROKEN_FRAME_SUFFIX = '_jb';

/** How a tower draws: its palette variant, and the suffix its base frames take. */
export interface TowerPalette {
  /** The base's palette variant (`default`, or `everglow.jailbroken`). */
  readonly base: string;
  /** The head's (`default` where the head doesn't bake the jailbroken palette). */
  readonly head: string;
  /** Appended to the base's tier frame (`_jb`, or ''). */
  readonly frameSuffix: string;
}

const PLAIN: TowerPalette = { base: DEFAULT_VARIANT, head: DEFAULT_VARIANT, frameSuffix: '' };

/**
 * A tower's look for a base sprite `baseId` (and head `headId`) when the run's jailbroken classes
 * draw from `jailbrokenBases` (their base sprite ids): jailbroken where the base is among them and
 * authors the `_jb` twins and bakes the palette, else plain.
 */
export function jailbreakLook(
  baseId: SpriteId,
  headId: SpriteId | null,
  jailbrokenBases: ReadonlySet<string>,
): TowerPalette {
  if (
    !jailbrokenBases.has(baseId) ||
    !hasFrame(baseId, `t1${JAILBROKEN_FRAME_SUFFIX}`) ||
    !hasPaletteVariant(baseId, JAILBROKEN_PALETTE)
  ) {
    return PLAIN;
  }
  const head =
    headId !== null && hasPaletteVariant(headId, JAILBROKEN_PALETTE)
      ? JAILBROKEN_PALETTE
      : DEFAULT_VARIANT;
  return { base: JAILBROKEN_PALETTE, head, frameSuffix: JAILBROKEN_FRAME_SUFFIX };
}

/**
 * The base sprite ids of the classes a save holds jailbroken (`unlocks.jailbroken`), from the
 * content's towers: the set `jailbreakLook` reads. Unknown ids are skipped.
 */
export function jailbrokenBaseIds(
  towers: Readonly<Record<string, { readonly sprites: { readonly base: string } } | undefined>>,
  jailbroken: readonly string[],
): ReadonlySet<string> {
  const out = new Set<string>();
  for (const id of jailbroken) {
    const t = Object.hasOwn(towers, id) ? towers[id] : undefined;
    if (t !== undefined) out.add(t.sprites.base);
  }
  return out;
}
