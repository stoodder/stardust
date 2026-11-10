// Which sprites dress each map tile (art-direction.md § Tile readability): the ground tile, and a
// prop standing on it, if any; plus the decor apron around the grid (art-direction §3). Pure, so
// the choices are unit-tested; GroundView draws them.
import type { SpriteId } from '../../content/sprites/index.ts';
import type { PeekerCover } from '../../content/sprites/props/peeker.ts';
import { APRON_RINGS } from '../../content/sprites/tiles/apron.ts';
import { CLIFF_VARIANTS, type CliffEdge } from '../../content/sprites/tiles/cliff.ts';
import { VERGE_VARIANTS, type VergeEdge } from '../../content/sprites/tiles/verge.ts';
import { GRIME_VARIANTS } from '../../content/sprites/tiles/grime.ts';
import type { HighGroundLook } from '../../content/sprites/tiles/high_ground.ts';
import type { DressingLayerDef, GridPos, MarkerId, TileChar } from '../../content/types.ts';
import { assertNever } from '../../shared/types.ts';
import { DEFAULT_VARIANT } from '../sprites/bake.ts';

export interface TileLook {
  readonly sprite: SpriteId;
  readonly frame: string;
}

/** A ground tile's look: a still frame, or a looping anim (the power node's pulse). */
export interface GroundLook extends TileLook {
  readonly anim?: string;
}

export interface TileDressing {
  readonly ground: GroundLook;
  /**
   * `tile.verge` overlay frames drawn over the ground, in order: darker grass clumps along each
   * edge a grass tile shares with the road (art-direction §3). Absent with none.
   */
  readonly verge?: readonly string[];
  /**
   * A `tile.grime` overlay frame drawn over the ground, under the verge: the map's dressing layers
   * over a decor tile's grass (`soilFrame`; A2M3's grey soil). Absent with none.
   */
  readonly soil?: string;
  /**
   * A `tile.hush` overlay frame drawn over the ground, after the cliffs: the dark creeping in from
   * a map's `halls_dark` marker (A2M1's north-east edge; `hushFrame`). Absent with none.
   */
  readonly hush?: string;
  /**
   * `tile.cliff` overlay frames drawn over the ground (and verge), in order: a terrace step down
   * from each back neighbour that stands higher (`GroundGrid.terraces`; T223). Absent with none.
   */
  readonly cliff?: readonly string[];
  /** A prop on the tile's center (the core, wreckage, decor), or null. */
  readonly prop: (TileLook & { readonly anim: string | null }) | null;
  /**
   * A raised block standing on the tile (high ground): drawn in `world` by its frame anchor at
   * the tile's top vertex, sorted by the tile center with `highGround` bias (tech-spec § Depth
   * sorting). Its top face is `ELEVATION_PX` above the ground plane.
   */
  readonly block?: TileLook;
}

/** The grid as GroundView reads it (a CompiledMapDef satisfies it). */
export interface GroundGrid {
  readonly cols: number;
  readonly rows: number;
  readonly tiles: readonly TileChar[];
  /** The map's markers; the ones named in `DECOR_MARKERS` are drawn as props. */
  readonly markers?: Readonly<Record<MarkerId, GridPos>>;
  /** Render-only terrace levels, row-major like `tiles` (MapDef.terraces); absent or null: flat. */
  readonly terraces?: readonly number[] | null;
  /** Render-only dressing layers (MapDef.dressing); absent or empty: none. */
  readonly dressing?: readonly DressingLayerDef[];
  /** A revisit's original footprint: where its (0, 0) sits, and its size (null: not a revisit). */
  readonly revisitAt?: GridPos | null;
  readonly revisitSize?: { readonly cols: number; readonly rows: number } | null;
  /**
   * The map's env palette (CompiledMapDef.env): Act II's maps dress their decor, wreckage, high
   * ground, and power node in Act II's looks (`ACT2_ENVS`). Absent: Act I's.
   */
  readonly env?: string;
  /** A Protect map's asset (CompiledMapDef.asset): AssetView draws it, so its tile stays bare. */
  readonly asset?: { readonly marker: MarkerId } | null;
}

/** The env palettes whose maps take Act II's looks (art-direction §3, §6). */
const ACT2_ENVS: ReadonlySet<string> = new Set(['act2.gold', 'act2.dusk']);

/** True on an Act II map (by its env). */
export function isActTwo(env: string | undefined): boolean {
  return env !== undefined && ACT2_ENVS.has(env);
}

/**
 * Decor markers (maps.md: markers are map-local names on non-path tiles): a marker with one of
 * these ids, or one of them plus `_<n>` (`billboard_2`, for a map with several), is drawn as its
 * prop, on any map, in place of the tile's sparse decor. Other markers (a Challenge's power node,
 * an ally post) draw nothing here. The props each map names are in act1.md (A1M2's Rig 3, housing
 * block, and scarecrow; A1M3's fallen mailbox; A1M4's fountain, podium, and Evie billboards;
 * A1M5's banner line, party tent, and confetti cannon).
 */
export const DECOR_MARKERS: Readonly<Record<MarkerId, SpriteId>> = {
  rig3: 'prop.rig',
  housing: 'prop.housing',
  scarecrow: 'prop.scarecrow',
  mailbox: 'prop.mailbox',
  fountain: 'prop.fountain',
  podium: 'prop.podium',
  billboard: 'prop.billboard',
  banner_line: 'prop.bunting',
  party_tent: 'prop.party_tent',
  confetti_cannon: 'prop.confetti_cannon',
  // Act II (act2.md per map, T440c): A2M1's Rig Nine head frame and the crew's hut, its yard cut's
  // spoil; A2M2's habitat domes; A2M3's exposed warrens and the warren's spoil.
  rig_nine: 'prop.rig',
  crew_hut: 'prop.crew_hut',
  spoil: 'prop.spoil',
  dome: 'prop.dome',
  warren: 'prop.warren',
  warren_spoil: 'prop.spoil',
};

/**
 * A decor marker's own frame, where its sprite's frame isn't the default: Rig Nine is `prop.rig`'s
 * `nine`; spoil heaps and warrens alternate their frames by the marker's `_<n>`.
 */
function markerFrame(id: MarkerId): string | null {
  if (id === 'rig_nine') return 'nine';
  if (id === 'warren_spoil') return 'warren';
  const n = Number(/_(\d+)$/.exec(id)?.[1] ?? 0);
  if (id.startsWith('spoil')) return `drill_${n % 2}`;
  if (id.startsWith('warren')) return `v${n % 2}`;
  return null;
}

/** A decor prop's frame and looping anim on the map, where it isn't `v0` and still. */
const DECOR_LOOKS: Readonly<Partial<Record<SpriteId, { frame: string; anim: string | null }>>> = {
  'prop.fountain': { frame: 'f0', anim: 'flow' },
  // Compliance Officer Prim hovers at the podium all map (act1.md § A1M4).
  'prop.podium': { frame: 'prim_0', anim: 'prim' },
  'prop.billboard': { frame: 'beaming', anim: null },
  'prop.confetti_cannon': { frame: 'idle', anim: null },
};

/**
 * Act II's looks for decor props that have one (act2.md): Evie's billboards peel (from A2M1), the
 * Terrace 2 scarecrow's badge has faded and Rig 3 works the strip mine (A2M3, a revisit).
 */
const ACT2_LOOKS: Readonly<Partial<Record<SpriteId, { frame: string; anim: string | null }>>> = {
  'prop.billboard': { frame: 'peeling', anim: null },
  'prop.scarecrow': { frame: 'faded', anim: null },
  'prop.rig': { frame: 'strip', anim: null },
};

/** A decor prop's frame and anim on an `env` map: Act II's look, else its own, else `v0`. */
export function decorLook(
  sprite: SpriteId,
  env: string | undefined,
): { frame: string; anim: string | null } {
  const act2 = isActTwo(env) ? ACT2_LOOKS[sprite] : undefined;
  return act2 ?? DECOR_LOOKS[sprite] ?? { frame: 'v0', anim: null };
}

/**
 * Markers drawn by a view of their own, which leave their tile bare of sparse decor: the Peeker
 * (PeekerView, T309).
 */
export const VIEW_MARKERS: readonly MarkerId[] = ['peeker'];

/** A prop that arrives on a cue: its sprite, and the wave whose countdown brings it on. */
export interface CueDecor {
  readonly sprite: SpriteId;
  /** It lands as this wave's build-phase countdown starts (the cue scene's moment). */
  readonly wave: number;
}

/**
 * Props the story brings on (props on cues, T312b): their marker's tile stays bare until the cue,
 * then CuePropView drops the prop there. Zibzab's shell-shop clanks onto A1M3's verge with his W6
 * scene (`a1_m03_w06`, which plays as W6's countdown starts; act1.md § A1M3).
 */
export const CUE_DECOR: Readonly<Record<MarkerId, CueDecor>> = {
  zibzab_shop: { sprite: 'prop.zibzab_shop', wave: 6 },
};

/**
 * Each map's own cover for the Peeker, where it isn't the default rock (art-direction §6, act1.md
 * per map; T312b): A1M4's planter by the fountain. A1M3's fallen mailbox is a decor prop of its own
 * in front of the rock, and A1M5 keeps the rock.
 */
const PEEKER_COVER_BY_MAP: Readonly<Record<string, PeekerCover>> = { a1_m04: 'planter' };

/** What the Peeker hides behind on map `mapId` (PeekerView plays `peekerFrame(cover, …)`). */
export function peekerCover(mapId: string): PeekerCover {
  return Object.hasOwn(PEEKER_COVER_BY_MAP, mapId) ? PEEKER_COVER_BY_MAP[mapId]! : 'rock'; // hasOwn
}

/**
 * The decor id a marker id names: itself, or itself less a `_<suffix>` (`billboard_2`, a map with
 * several; `dome_north`, a name).
 */
function decorSprite(id: MarkerId): SpriteId | undefined {
  if (Object.hasOwn(DECOR_MARKERS, id)) return DECOR_MARKERS[id];
  const base = id.replace(/_[a-z0-9]+$/, '');
  return base !== id && Object.hasOwn(DECOR_MARKERS, base) ? DECOR_MARKERS[base] : undefined;
}

/** A marker's decor on its tile: its sprite and, where it names one, its own frame. */
interface MarkerDecor {
  readonly sprite: SpriteId;
  readonly frame: string | null;
}

/**
 * The decor prop a marker puts on (col, row), if any; 'bare' for a view, cue, or asset marker's
 * tile (its own view draws what stands there).
 */
function decorAt(g: GroundGrid, col: number, row: number): MarkerDecor | 'bare' | null {
  if (g.markers === undefined) return null;
  for (const [id, [c, r]] of Object.entries(g.markers)) {
    if (c !== col || r !== row) continue;
    if (VIEW_MARKERS.includes(id) || Object.hasOwn(CUE_DECOR, id) || g.asset?.marker === id)
      return 'bare';
    const sprite = decorSprite(id);
    if (sprite !== undefined) return { sprite, frame: markerFrame(id) };
  }
  return null;
}

/** True when a marker whose id starts with `prefix` stands on (col, row). */
function markerOn(g: GroundGrid, prefix: string, col: number, row: number): boolean {
  if (g.markers === undefined) return false;
  for (const [id, [c, r]] of Object.entries(g.markers)) {
    if (c === col && r === row && id.startsWith(prefix)) return true;
  }
  return false;
}

/**
 * The banner line's frame: slung back across the road behind its tile, along grid x (`x`) or y
 * (`y`); `x` if neither neighbour is road.
 */
function buntingFrame(g: GroundGrid, col: number, row: number): 'x' | 'y' {
  const t = (c: number, r: number): TileChar | undefined =>
    c < 0 || r < 0 || c >= g.cols || r >= g.rows ? undefined : g.tiles[r * g.cols + c];
  return !isPathLike(t(col - 1, row)) && isPathLike(t(col, row - 1)) ? 'y' : 'x';
}

/** Each tile edge's neighbour offset (verge.ts names the edges). */
const EDGES: readonly (readonly [VergeEdge, number, number])[] = [
  ['nw', -1, 0],
  ['ne', 0, -1],
  ['se', 1, 0],
  ['sw', 0, 1],
];

const GRASS_VARIANTS = 3;

/** The env palette's sprite variant: `act1` is every env sprite's default palette. */
export function envVariant(env: string): string {
  return env === 'act1' ? DEFAULT_VARIANT : env;
}

/**
 * The `prop.wreckage` wreck on tile (col, row), alternating by tile: Act I's `v0` (a crashed drone)
 * or `v1` (a toppled cart), T311b's; on an Act II map (`env`) its broken mining rigs, `v2` (a
 * snapped derrick) or `v3` (a burst pump house), each with a crew log on its stake (T440c).
 */
export function wreckageFrame(col: number, row: number, env?: string): 'v0' | 'v1' | 'v2' | 'v3' {
  const odd = (col + row) % 2 !== 0;
  if (isActTwo(env)) return odd ? 'v3' : 'v2';
  return odd ? 'v1' : 'v0';
}

/**
 * The high-ground block's look on tile (col, row): an `outcrop*` marker's thread-glass (A2M2), an
 * Act II map's canyon ledge (A2M1), else Act I's grassy block.
 */
export function highGroundLook(g: GroundGrid, col: number, row: number): HighGroundLook {
  if (markerOn(g, 'outcrop', col, row)) return 'outcrop';
  return isActTwo(g.env) ? 'ledge' : 'v0';
}

/** The marker the dark creeps in from (A2M1's north-east edge, toward the Halls). */
const HUSH_MARKER = 'halls_dark';

/**
 * The `tile.hush` frame at (col, row) on a map with a `halls_dark` marker, or null: deepest near
 * the marker, fading along the edges that lead away from it (a step across the grid's columns
 * counts as much as five down its rows, so the dark runs down the east edge). Applies to apron
 * cells too (outside the grid).
 */
export function hushFrame(g: GroundGrid, col: number, row: number): string | null {
  const at = g.markers?.[HUSH_MARKER];
  if (at === undefined) return null;
  const reach = Math.abs(col - at[0]) + Math.abs(row - at[1]) / 5;
  if (reach <= 1.5) return 'd3';
  if (reach <= 3) return 'd2';
  if (reach <= 4.5) return 'd1';
  return null;
}

function isPathLike(t: TileChar | undefined): boolean {
  return t === '#' || t === 'S' || t === 'C';
}

/** Back neighbours a terrace face can step down from: (col, row − 1), then (col − 1, row). */
const CLIFF_EDGES: readonly (readonly [CliffEdge, number, number])[] = [
  ['ne', 0, -1],
  ['nw', -1, 0],
];

/**
 * The terrace faces on tile (col, row): one per back neighbour on a higher terrace. The road cuts
 * through (a path tile gets none: the switchbacks read as cuts), a high-ground block covers its
 * own footprint, and a pad or power node keeps its plate clear (the `_pad` frames).
 */
export function cliffFrames(g: GroundGrid, col: number, row: number): string[] {
  const out: string[] = [];
  const levels = g.terraces;
  if (levels === undefined || levels === null) return out;
  const t = g.tiles[row * g.cols + col];
  if (isPathLike(t) || t === '^') return out;
  const here = levels[row * g.cols + col] ?? 0;
  const plate = t === 'o' || t === '+' ? '_pad' : '';
  for (const [edge, dc, dr] of CLIFF_EDGES) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || r < 0) continue;
    if ((levels[r * g.cols + c] ?? 0) > here) {
      out.push(`${edge}${plate}_${(col + row) % CLIFF_VARIANTS}`);
    }
  }
  return out;
}

/** The dressing for tile (col, row). Deterministic: the same map always looks the same. */
export function dressTile(g: GroundGrid, col: number, row: number): TileDressing {
  let look = dressBase(g, col, row);
  const grass = look.ground.sprite === 'tile.grass' && look.block === undefined;
  const soil = grass ? soilFrame(g, col, row) : null;
  if (soil !== null) {
    // Bare earth grows no flora: a scar keeps only its rocks (and any marker's prop).
    const bare = soil.startsWith('scar') && look.prop?.sprite === 'prop.flora';
    look = { ...look, soil, ...(bare ? { prop: null } : {}) };
  }
  const cliff = cliffFrames(g, col, row);
  if (cliff.length > 0) look = { ...look, cliff };
  // The dark edge: over grass (decor) only, so a pad, the road, and a block keep their read.
  const hush = grass ? hushFrame(g, col, row) : null;
  return hush === null ? look : { ...look, hush };
}

/** True when (col, row) is in a dressing layer's area (DressingLayerDef). */
export function inDressingArea(
  g: GroundGrid,
  area: DressingLayerDef['area'],
  col: number,
  row: number,
): boolean {
  if (typeof area !== 'string') {
    return col >= area.from[0] && col <= area.to[0] && row >= area.from[1] && row <= area.to[1];
  }
  if (area === 'all') return true;
  const at = g.revisitAt;
  const size = g.revisitSize;
  if (at === undefined || at === null || size === undefined || size === null) return false;
  const inside = col >= at[0] && row >= at[1] && col < at[0] + size.cols && row < at[1] + size.rows;
  return area === 'original' ? inside : !inside;
}

/**
 * The `tile.grime` frame the map's dressing lays over the grass at (col, row), or null: the last
 * layer whose area holds it (`greySoil` → `soil_<k>`, `mineScar` → `scar_<k>`), its variant by tile.
 * The caller draws it only over grass (decor tiles: never a pad, the path, or a block).
 */
export function soilFrame(g: GroundGrid, col: number, row: number): string | null {
  const layers = g.dressing ?? [];
  for (let i = layers.length - 1; i >= 0; i--) {
    const d = layers[i]!; // i < length
    if (!inDressingArea(g, d.area, col, row)) continue;
    const k = (col * 5 + row * 3) % GRIME_VARIANTS;
    return d.kind === 'greySoil' ? `soil_${k}` : `scar_${k}`;
  }
  return null;
}

function dressBase(g: GroundGrid, col: number, row: number): TileDressing {
  const at = (c: number, r: number): TileChar | undefined =>
    c < 0 || r < 0 || c >= g.cols || r >= g.rows ? undefined : g.tiles[r * g.cols + c];
  const t = at(col, row);
  const grass: TileLook = {
    sprite: 'tile.grass',
    frame: `v${(col * 7 + row * 13) % GRASS_VARIANTS}`,
  };
  switch (t) {
    case '#':
    case 'C': {
      // Treads run along the path: rows above or below mean it runs along the grid's y axis.
      const alongY = isPathLike(at(col, row - 1)) || isPathLike(at(col, row + 1));
      const ground: TileLook = { sprite: 'tile.path', frame: alongY ? 'tread_y' : 'tread_x' };
      return {
        ground,
        prop: t === 'C' ? { sprite: 'prop.core', frame: 'idle_0', anim: 'idle' } : null,
      };
    }
    case 'S':
      return { ground: { sprite: 'tile.spawn', frame: 'v0' }, prop: null };
    case 'o':
      return { ground: { sprite: 'tile.pad', frame: 'v0' }, prop: null };
    case '^': {
      // The block covers its whole footprint; the grass under it only backs its seams.
      const frame = highGroundLook(g, col, row);
      return { ground: grass, prop: null, block: { sprite: 'tile.high_ground', frame } };
    }
    case '+':
      // Act II's power node is a stardust conduit (A2M1, A2M2).
      return isActTwo(g.env)
        ? { ground: { sprite: 'tile.power_node', frame: 'conduit_0', anim: 'conduit' }, prop: null }
        : { ground: { sprite: 'tile.power_node', frame: 'v0', anim: 'pulse' }, prop: null };
    case 'x':
    case '.':
    case undefined: {
      // A decor marker's prop; else sparse decor, so blocked ground reads as neither pad nor path.
      // A view marker's tile (the Peeker's rock) stays bare: its view draws what stands there.
      const decor = t === undefined ? null : decorAt(g, col, row);
      let sprite: SpriteId | null = decor === 'bare' || decor === null ? null : decor.sprite;
      if (decor === null) {
        if (t === 'x') sprite = 'prop.wreckage';
        else if ((col * 3 + row * 5) % 7 === 0) sprite = 'prop.flora';
        else if ((col * 5 + row * 3) % 11 === 0) sprite = 'prop.rock';
      }
      // Wreckage alternates its two wrecks by tile (a crashed drone, a toppled cart); WreckageView
      // swaps the frame as the drone works and hides it once the tile is cleared.
      let onTile: Prop | null = null;
      if (sprite === 'prop.bunting') {
        onTile = { sprite, frame: buntingFrame(g, col, row), anim: null };
      } else if (sprite !== null && t === 'x' && decor === null) {
        onTile = { sprite, frame: wreckageFrame(col, row, g.env), anim: null };
      } else if (sprite !== null) {
        const look = decorLook(sprite, g.env);
        const own = decor !== null && decor !== 'bare' ? decor.frame : null;
        onTile = own === null ? { sprite, ...look } : { sprite, frame: own, anim: null };
      }
      // Grass beside the road: a verge of darker clumps on each edge it shares with the road.
      const verge: string[] = [];
      for (const [edge, dc, dr] of EDGES) {
        if (isPathLike(at(col + dc, row + dr)))
          verge.push(`${edge}_${(col + row) % VERGE_VARIANTS}`);
      }
      return verge.length === 0
        ? { ground: grass, prop: onTile }
        : { ground: grass, prop: onTile, verge };
    }
    default:
      return assertNever(t);
  }
}

/**
 * Props that keep their own palette in every act (Everglow hardware, and the scarecrow in his
 * Everglow cap); the rest follow env.
 */
const OWN_PALETTE: ReadonlySet<SpriteId> = new Set<SpriteId>([
  'prop.core',
  'prop.fence',
  'prop.dome',
  'prop.billboard',
  'prop.rig',
  'prop.housing',
  'prop.scarecrow',
  'prop.mailbox',
  'prop.zibzab_shop',
  'prop.fountain',
  'prop.podium',
  'prop.party_tent',
  'prop.confetti_cannon',
  'prop.bunting',
  'prop.rigs',
  'prop.crew_hut',
  'prop.tidybot',
]);

/** The palette variant a prop draws in on a map of env `env`. */
export function propVariant(sprite: SpriteId, env: string): string {
  return OWN_PALETTE.has(sprite) ? DEFAULT_VARIANT : envVariant(env);
}

/** One apron cell: a tile outside the grid, `ring` steps from it (1 touches the grid). */
export interface ApronCell extends TileDressing {
  readonly col: number;
  readonly row: number;
  readonly ring: number;
}

type Prop = NonNullable<TileDressing['prop']>;
const prop = (sprite: SpriteId, frame: string): Prop => ({ sprite, frame, anim: null });

/**
 * Act I's colony dressing on the apron's second ring, behind the map (north edges), so it never
 * hides the playfield (and clear of the HUD's top-center banner): an Evie billboard and lettuce
 * patches along the north-west edge, Dome Row along the north-east. Positions scale with the map; a cell the road uses is
 * skipped.
 */
function colonyDecor(g: GroundGrid): ReadonlyMap<string, Prop> {
  const m = new Map<string, Prop>();
  m.set(`-2,${Math.round(g.rows * 0.2)}`, prop('prop.billboard', 'beaming'));
  m.set(`${Math.round(g.cols * 0.55)},-2`, prop('prop.dome', 'v0'));
  m.set(`${g.cols - 2},-2`, prop('prop.dome', 'v0'));
  for (let r = Math.round(g.rows * 0.4); r < Math.round(g.rows * 0.4) + 3; r++) {
    m.set(`-2,${r}`, prop('prop.lettuce', 'v0'));
  }
  return m;
}

/**
 * Act II's apron dressing on the same north edges: the mining frontier. An Evie billboard peeling
 * on the north-west with a drill spoil heap beside it, and spoil heaps along the north-east where
 * Act I had Dome Row (act2.md: "Evie billboards peeling").
 */
function frontierDecor(g: GroundGrid): ReadonlyMap<string, Prop> {
  const m = new Map<string, Prop>();
  m.set(`-2,${Math.round(g.rows * 0.2)}`, prop('prop.billboard', 'peeling'));
  m.set(`-2,${Math.round(g.rows * 0.2) + 2}`, prop('prop.spoil', 'drill_1'));
  m.set(`${Math.round(g.cols * 0.55)},-2`, prop('prop.spoil', 'drill_0'));
  m.set(`${Math.round(g.cols * 0.3)},-2`, prop('prop.spoil', 'drill_1'));
  return m;
}

const DECOR_BY_ENV: Readonly<Record<string, (g: GroundGrid) => ReadonlyMap<string, Prop>>> = {
  act1: colonyDecor,
  'act2.gold': frontierDecor,
  'act2.dusk': frontierDecor,
};

/**
 * The decor apron: every cell within `APRON_RINGS` of the grid, back to front. Ground darkens
 * and dithers to ink ring by ring; the road runs on out of every border core tile (the road out
 * through the gate); ring 1 carries the perimeter fence, with gaps where the road leaves and
 * beside border spawns; ring 2 carries the env's decor and sparse brush. Never picked.
 */
export function apronCells(g: GroundGrid, env: string): ApronCell[] {
  const R = APRON_RINGS;
  const inGrid = (c: number, r: number): boolean => c >= 0 && r >= 0 && c < g.cols && r < g.rows;
  const tileAt = (c: number, r: number): TileChar | undefined =>
    inGrid(c, r) ? g.tiles[r * g.cols + c] : undefined;
  const roads = new Map<string, 'x' | 'y'>();
  const gaps = new Set<string>();
  for (let r = 0; r < g.rows; r++) {
    for (let c = 0; c < g.cols; c++) {
      const t = tileAt(c, r);
      if (t !== 'C' && t !== 'S') continue;
      for (const [dc, dr] of [
        [0, -1],
        [0, 1],
        [-1, 0],
        [1, 0],
      ] as const) {
        if (inGrid(c + dc, r + dr)) continue;
        gaps.add(`${c + dc},${r + dr}`);
        if (t !== 'C') continue;
        for (let k = 1; k <= R; k++) roads.set(`${c + k * dc},${r + k * dr}`, dc === 0 ? 'y' : 'x');
      }
    }
  }
  const decor = DECOR_BY_ENV[env]?.(g) ?? new Map<string, Prop>();
  const out: ApronCell[] = [];
  for (let d = -2 * R; d <= g.cols + g.rows - 2 + 2 * R; d++) {
    for (let col = -R; col < g.cols + R; col++) {
      const row = d - col;
      if (row < -R || row >= g.rows + R || inGrid(col, row)) continue;
      const ring = Math.max(
        col < 0 ? -col : col >= g.cols ? col - g.cols + 1 : 0,
        row < 0 ? -row : row >= g.rows ? row - g.rows + 1 : 0,
      );
      const key = `${col},${row}`;
      const road = roads.get(key);
      const ground: TileLook = {
        sprite: 'tile.apron',
        frame: road === undefined ? `r${ring}` : `road_${road}_r${ring}`,
      };
      let p: Prop | null = null;
      if (road === undefined && !gaps.has(key)) {
        if (ring === 1) {
          const alongX = row === -1 || row === g.rows;
          const alongY = col === -1 || col === g.cols;
          if (alongX !== alongY) p = prop('prop.fence', alongX ? 'x' : 'y');
        } else if (ring === 2) {
          p = decor.get(key) ?? null;
          if (p === null) {
            const h = (((col + 16) * 7 + (row + 16) * 11) >>> 0) % 9;
            p = h === 0 ? prop('prop.flora', 'v0') : h === 4 ? prop('prop.rock', 'v0') : null;
          }
        }
      }
      const hush = hushFrame(g, col, row);
      out.push(
        hush === null
          ? { col, row, ring, ground, prop: p }
          : { col, row, ring, ground, prop: p, hush },
      );
    }
  }
  return out;
}

/**
 * The tiles behind core tile (col, row) whose tower the core's sprite would hide: the same screen
 * column (col − row equal; iso tiles in neighbouring columns sit 16 px aside, clear of the core's
 * pylon) and 2 or more diagonals back (one diagonal back is the next screen column), while the
 * tower's foot is still under the core's top (`heightPx`: the core's height above its anchor).
 */
export function tilesBehind(
  grid: { readonly cols: number; readonly tiles: readonly unknown[] },
  col: number,
  row: number,
  heightPx: number,
): number[] {
  const rows = Math.floor(grid.tiles.length / grid.cols);
  const out: number[] = [];
  // Each diagonal back is 8 px up the screen; a tower's base reaches about 6 px below its foot.
  for (let k = 1; 16 * k < heightPx + 6; k++) {
    const c = col - k;
    const r = row - k;
    if (c < 0 || r < 0 || c >= grid.cols || r >= rows) break;
    out.push(r * grid.cols + c);
  }
  return out;
}
