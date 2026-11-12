// The live sprite registry (architecture.md § 5, *Bundle*; T871): the core sprites (`SPRITES`, in
// the initial JS and the boot atlas) plus the ones lazy chunks register when they load: the
// portraits (app/portraitContent.ts, before any screen shows) and the finale's sprites (its act
// chunk, app/acts/fin.ts). Read it at call time, never at module load: a lazy sprite is missing
// until its chunk has loaded. Tests and the Node tools register everything up front
// (tools/vitestSetup.ts).
import { SPRITES } from './index.ts';
import type { SpriteDef } from './types.ts';

const late: SpriteDef[] = [];
let byId: Map<string, SpriteDef> | null = null;
let live: readonly SpriteDef[] | null = null;
let version = 0;

function index(): Map<string, SpriteDef> {
  if (byId === null) {
    byId = new Map();
    for (const d of SPRITES as readonly SpriteDef[]) byId.set(d.id, d);
    for (const d of late) byId.set(d.id, d);
  }
  return byId;
}

/**
 * Adds a lazy chunk's sprites (idempotent: a def already registered is skipped). Throws on a
 * different def under a registered id.
 */
export function registerSprites(defs: readonly SpriteDef[]): void {
  const ids = index();
  let added = false;
  for (const d of defs) {
    const had = ids.get(d.id);
    if (had === d) continue;
    if (had !== undefined) throw new Error(`sprites: '${d.id}' is already registered`);
    late.push(d);
    ids.set(d.id, d);
    added = true;
  }
  if (added) {
    live = null;
    version++;
  }
}

/** The sprite registered under `id` (core or lazy), or undefined (unknown, or not loaded yet). */
export function spriteDef(id: string): SpriteDef | undefined {
  return index().get(id);
}

/** Whether a sprite is registered under `id`. */
export function hasSprite(id: string): boolean {
  return index().has(id);
}

/** Every registered sprite: the core ones in gallery order, then the lazy ones as registered. */
export function liveSprites(): readonly SpriteDef[] {
  live ??= [...(SPRITES as readonly SpriteDef[]), ...late];
  return live;
}

/** Bumps each time `registerSprites` adds something (a baker re-checks what it holds). */
export function spritesVersion(): number {
  return version;
}
