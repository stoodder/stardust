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
import { riftCrackTiles } from './riftCrack.ts';
import { envLook } from './envLook.ts';

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
  /**
   * The road tile's edges that carry a kerb (`kerbEdges`, T430b): it shares them with another
   * road tile no route steps across (A2M2's hairpin lanes). Absent with none.
   */
  readonly kerb?: readonly VergeEdge[];
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
  /**
   * The map's routes (CompiledMapDef.routeList): ground paths say which way the road runs on a
   * tile and where two lanes only lie side by side (`kerbEdges`). Absent: the road runs wherever
   * its tiles touch.
   */
  readonly routeList?: readonly { readonly kind: string; readonly tiles: readonly GridPos[] }[];
  /**
   * The map's id (CompiledMapDef.id): the few looks one map has of its own (`CORE_BY_MAP`,
   * `PERCH_MAPS`). Absent: none.
   */
  readonly id?: string;
}

/** Each grid's route steps (tile index pairs, low × 65536 + high), built once per grid. */
const STEPS = new WeakMap<GroundGrid, ReadonlySet<number>>();

/** The set of tile pairs some ground route steps between, or null for a grid without routes. */
function routeSteps(g: GroundGrid): ReadonlySet<number> | null {
  const routes = g.routeList;
  if (routes === undefined) return null;
  const cached = STEPS.get(g);
  if (cached !== undefined) return cached;
  const steps = new Set<number>();
  for (const r of routes) {
    if (r.kind !== 'path') continue;
    for (let k = 1; k < r.tiles.length; k++) {
      const a = r.tiles[k - 1]!; // k − 1 < length
      const b = r.tiles[k]!;
      steps.add(stepKey(a[1] * g.cols + a[0], b[1] * g.cols + b[0]));
    }
  }
  STEPS.set(g, steps);
  return steps;
}

function stepKey(a: number, b: number): number {
  return a < b ? a * 65536 + b : b * 65536 + a;
}

/**
 * Whether the road joins (col, row) to its neighbour (dc, dr) away: both are road and, on a grid
 * with routes, a route steps between them (else touching is enough).
 */
function roadJoins(g: GroundGrid, col: number, row: number, dc: number, dr: number): boolean {
  const c = col + dc;
  const r = row + dr;
  if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) return false;
  if (!isPathLike(g.tiles[r * g.cols + c])) return false;
  const steps = routeSteps(g);
  return steps === null || steps.has(stepKey(row * g.cols + col, r * g.cols + c));
}

/**
 * A road tile's kerbed edges (T430b): each it shares with another road tile that no ground route
 * steps across, so two lanes side by side read as two (A2M2's hairpin). None on a grid without
 * routes, or off the road.
 */
export function kerbEdges(g: GroundGrid, col: number, row: number): VergeEdge[] {
  const out: VergeEdge[] = [];
  if (routeSteps(g) === null || !isPathLike(g.tiles[row * g.cols + col])) return out;
  for (const [edge, dc, dr] of EDGES) {
    const c = col + dc;
    const r = row + dr;
    if (c < 0 || r < 0 || c >= g.cols || r >= g.rows) continue;
    if (isPathLike(g.tiles[r * g.cols + c]) && !roadJoins(g, col, row, dc, dr)) out.push(edge);
  }
  return out;
}

/** A wreck's look (`prop.wreckage`'s base frames; `wreckageFrame`). */
export type WreckLook = 'v0' | 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7';

/** True on an Act II map (by its env: its decor takes Act II's looks; art-direction §3, §6). */
export function isActTwo(env: string | undefined): boolean {
  return envLook(env).decor === 'act2';
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
  // M5 (act2.md per map, T540c): A2M4's plant (Intake B, the three vats, the gold seams on the
  // north cliff); A2M5's relocation fencing, the Preserve's fenced basin, and the dead rig where
  // the rig road starts; A2M6's wall (its lamps on the gateposts, its two ends; the walk between is
  // `wallSpan`'s) and Dome 3's window (`dome_window`, a `prop.dome` frame).
  intake_b: 'prop.intake',
  vat: 'prop.vat',
  seam: 'prop.seam',
  fence: 'prop.relocation_fence',
  basin: 'prop.basin',
  rig_yard: 'prop.rig',
  lamp: 'prop.wall',
  wall: 'prop.wall',
  // M6 (act3.md per map, T640c): A3M1's Preserve sign over the inner gate and its warren homes;
  // A3M2's shuttle pad (Sterling's shuttle, parked until W12's cue: ShuttleView lifts it) and your
  // old turrets, dead in the dark band. A3M3's blast doors stand on its door cores (BlastDoorView).
  sign: 'prop.preserve_sign',
  home: 'prop.warren_home',
  shuttle_pad: 'prop.shuttle',
  dead_turret: 'prop.dead_turret',
  // M7 (act3.md per map, T740c): A3M4's Shelters (the hall door, the last Fun Friday banner, HE
  // HELD THE DOOR under convoy and the humming ring under warren, by `markerWhen`; Gerald's mail
  // chute; any `bay_<n>`, a shelter bay); A3M5's hangar ("Shareholder Value"'s); A3M6's lettuce-crate
  // barricade (along x, across a road running along y; `barricade_y…` runs along y), Zibzab's crate
  // (opened in the briefing), and Dome 1 by the gate (`dome_1`, a `prop.dome` drawn `open`; T730b
  // frosts it). The generator (A3M4's core), the crash site's plates, and Pebble on the Peeker's
  // rock (A3M6) are their views' (T730b).
  hall_door: 'prop.hall_door',
  banner_friday: 'prop.banner_friday',
  held_door: 'prop.held_door',
  humming_ring: 'prop.humming_ring',
  mail_chute: 'prop.mail_chute',
  bay: 'prop.shelter_bay',
  hangar: 'prop.hangar',
  barricade: 'prop.barricade',
  zibzab_crate: 'prop.crate',
};

/**
 * A decor marker's own frame, where its sprite's frame isn't the default: Rig Nine is `prop.rig`'s
 * `nine`; spoil heaps and warrens alternate their frames by the marker's `_<n>`.
 */
function markerFrame(id: MarkerId): string | null {
  if (id === 'rig_nine') return 'nine';
  if (id === 'rig_yard') return 'yard';
  if (id === 'warren_spoil') return 'warren';
  if (id === 'dome_window') return 'window';
  if (id === 'dome_1') return 'open'; // A3M6's Dome 1, open beside the gate (T740c)
  if (id === 'zibzab_crate') return 'open';
  if (id.startsWith('barricade')) return /_y(_|$)/.test(id) ? 'y' : 'x';
  const n = Number(/_(\d+)$/.exec(id)?.[1] ?? 0);
  // The first run of relocation fencing carries Everglow's sign; numbered runs are plain.
  if (id.startsWith('fence')) return n === 0 ? 'v0' : 'v1';
  if (id.startsWith('spoil')) return `drill_${n % 2}`;
  if (id.startsWith('warren')) return `v${n % 2}`;
  if (id.startsWith('home')) return `v${n % 2}`;
  if (id.startsWith('bay')) return `v${n % 2}`;
  if (id.startsWith('dead_turret')) return `v${(n + 1) % 2}`;
  return null;
}

/** A decor prop's frame and looping anim on the map, where it isn't `v0` and still. */
const DECOR_LOOKS: Readonly<Partial<Record<SpriteId, { frame: string; anim: string | null }>>> = {
  'prop.fountain': { frame: 'f0', anim: 'flow' },
  // Compliance Officer Prim hovers at the podium all map (act1.md § A1M4).
  'prop.podium': { frame: 'prim_0', anim: 'prim' },
  'prop.billboard': { frame: 'beaming', anim: null },
  'prop.confetti_cannon': { frame: 'idle', anim: null },
  // A2M4's vats churn, and its seams glint (T540c).
  'prop.vat': { frame: 'v0', anim: 'churn' },
  'prop.seam': { frame: 'v0', anim: 'glint' },
  // Sterling's shuttle waits on its pad, nav lights trading (A3M2, T640c).
  'prop.shuttle': { frame: 'parked_0', anim: 'parked' },
  // M7 (T740c): the candles at HE HELD THE DOOR, the humming ring, the hangar's REC lamp (A3M4–5).
  'prop.held_door': { frame: 'v0', anim: 'flicker' },
  'prop.humming_ring': { frame: 'hum_0', anim: 'hum' },
  'prop.hangar': { frame: 'shut_0', anim: 'idle' },
  // Pebble on the Peeker's rock, looking out, blinking, bouncing (A3M6, T730b).
  'prop.pebble_rock': { frame: 'perch_0', anim: 'perch' },
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

/**
 * Act III's looks (act3.md, T640c): Evie's billboards are `dark` (content/presentation.ts; T613
 * drew the frame), the audit podium stands empty at night (A3M2: Prim's voice comes from the
 * drones) and the fountain runs dark, the brush is crystal and the rocks sit in the dark, and the
 * domes are out but for an emergency light.
 */
const ACT3_LOOKS: Readonly<Partial<Record<SpriteId, { frame: string; anim: string | null }>>> = {
  'prop.billboard': { frame: 'dark', anim: null },
  'prop.podium': { frame: 'v0', anim: null },
  'prop.flora': { frame: 'crystal', anim: null },
  'prop.rock': { frame: 'night', anim: null },
  'prop.fountain': { frame: 'night_0', anim: 'night' },
  'prop.dome': { frame: 'dark', anim: null },
  // A2M4's vats at maximum throughput (A3M5, T740c): burning violet at full blaze.
  'prop.vat': { frame: 'blaze_0', anim: 'blaze' },
};

/** A decor prop's frame and anim on an `env` map: its act's look, else its own, else `v0`. */
export function decorLook(
  sprite: SpriteId,
  env: string | undefined,
): { frame: string; anim: string | null } {
  const decor = envLook(env).decor;
  const act =
    decor === 'act2' ? ACT2_LOOKS[sprite] : decor === 'act3' ? ACT3_LOOKS[sprite] : undefined;
  return act ?? DECOR_LOOKS[sprite] ?? { frame: 'v0', anim: null };
}

/**
 * Whether the Peeker peeks on a map of `env` (PeekerView): not in the Long Night. A3M2 revisits
 * A1M4 with its `peeker` marker, but no Skitterkin hides there now (act3.md § A3M2); its tile
 * stays bare.
 */
export function peekerShows(env: string | undefined): boolean {
  return envLook(env).peeker;
}

/**
 * Markers drawn by a view of their own, which leave their tile bare of sparse decor: the Peeker
 * (PeekerView, T309).
 */
export const VIEW_MARKERS: readonly MarkerId[] = ['peeker'];
const PEEKER_MARKER: MarkerId = 'peeker';

/**
 * Each map's core, where it isn't the colony's core beacon (T730b): A3M4's is the shelter
 * generator in the hall (act3.md § A3M4). It shares the core's frames and glow slots, so CoreView's
 * flash and red heart draw over it unchanged.
 */
const CORE_BY_MAP: Readonly<Record<string, SpriteId>> = { a3_m04: 'prop.generator' };

/** The sprite drawn on map `mapId`'s core tiles (`prop.core` unless `CORE_BY_MAP` names one). */
export function coreSprite(mapId: string | undefined): SpriteId {
  return mapId !== undefined && Object.hasOwn(CORE_BY_MAP, mapId)
    ? CORE_BY_MAP[mapId]! // hasOwn
    : 'prop.core';
}

/**
 * Maps where Pebble sits on top of the Peeker's rock in plain sight (T730b; act3.md § A3M6: "Pebble
 * sits on top of the Peeker rock from W1"): its `peeker` marker's tile shows `prop.pebble_rock`
 * perched, where elsewhere in the Long Night it stays bare (`peekerShows`).
 */
const PERCH_MAPS: ReadonlySet<string> = new Set(['a3_m06']);

/** Whether Pebble perches on the Peeker's rock on map `mapId`. */
export function pebblePerches(mapId: string | undefined): boolean {
  return mapId !== undefined && PERCH_MAPS.has(mapId);
}

/**
 * A marker whose tile a jettisoned boss's plate lands on (`crash_<n>`, A3M5's crash site; T707):
 * its tile stays bare of sparse decor, and CrashSiteView lands the plate there (T730b).
 */
export function isPlateMarker(id: MarkerId): boolean {
  return /^crash_\d+$/.test(id);
}

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
 * The decor id a marker id names: itself, or itself less its `_<suffix>`es, the longest match
 * first (`billboard_2`, a map with several; `dome_north`, a name; `lamp_west_gate`, two).
 */
function decorSprite(id: MarkerId): SpriteId | undefined {
  for (let base = id; ;) {
    if (Object.hasOwn(DECOR_MARKERS, base)) return DECOR_MARKERS[base];
    const shorter = base.replace(/_[a-z0-9]+$/, '');
    if (shorter === base) return undefined;
    base = shorter;
  }
}

/**
 * A spawn tile's look: `hatch` off every edge of the map (or, on a revisit, of the original map's
 * footprint, where its own spawns stand: `revisitAt`/`revisitSize`), else `v0`, a burrow at the
 * head of the road.
 */
export function spawnFrame(g: GroundGrid, col: number, row: number): 'hatch' | 'v0' {
  const at = g.revisitAt ?? null;
  const size = g.revisitSize ?? null;
  const inFoot =
    at !== null &&
    size !== null &&
    col >= at[0] &&
    row >= at[1] &&
    col < at[0] + size.cols &&
    row < at[1] + size.rows;
  const [c0, r0, c1, r1] =
    inFoot && at !== null && size !== null
      ? [at[0], at[1], at[0] + size.cols - 1, at[1] + size.rows - 1]
      : [0, 0, g.cols - 1, g.rows - 1];
  return col > c0 && row > r0 && col < c1 && row < r1 ? 'hatch' : 'v0';
}

/** The wall's ends (A2M6): markers on one row; the wall runs between them (inclusive). */
const WALL_ENDS = ['wall_west_end', 'wall_east_end'] as const;

/**
 * The wall row's span on a map with both wall-end markers on one row (A2M6, T540c), or null: its
 * row and its first and last column. Every non-road tile in it carries the parapet.
 */
export function wallSpan(
  g: GroundGrid,
): { readonly row: number; readonly from: number; readonly to: number } | null {
  const a = g.markers?.[WALL_ENDS[0]];
  const b = g.markers?.[WALL_ENDS[1]];
  if (a === undefined || b === undefined || a[1] !== b[1]) return null;
  return { row: a[1], from: Math.min(a[0], b[0]), to: Math.max(a[0], b[0]) };
}

/** True when (col, row) is on the wall row's span (road tiles included). */
function onWall(g: GroundGrid, col: number, row: number): boolean {
  const w = wallSpan(g);
  return w !== null && row === w.row && col >= w.from && col <= w.to;
}

/**
 * A wall marker's frame (A2M6): a lamp is a gatepost on the side that meets the gate (`lamp_w`
 * with the road to its west, else `lamp_e`); a wall end's buttress stands at the grid edge it ends
 * on.
 */
function wallFrame(g: GroundGrid, id: MarkerId, col: number, row: number): string {
  if (id.startsWith('lamp')) {
    const west = col > 0 && isPathLike(g.tiles[row * g.cols + col - 1]);
    return west ? 'lamp_w' : 'lamp_e';
  }
  return col < g.cols / 2 ? 'end_w' : 'end_e';
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
    if (id === PEEKER_MARKER && pebblePerches(g.id))
      return { sprite: 'prop.pebble_rock', frame: null };
    if (
      VIEW_MARKERS.includes(id) ||
      Object.hasOwn(CUE_DECOR, id) ||
      g.asset?.marker === id ||
      isPlateMarker(id)
    )
      return 'bare';
    const sprite = decorSprite(id);
    if (sprite === 'prop.wall') return { sprite, frame: wallFrame(g, id, col, row) };
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
 * snapped derrick) or `v3` (a burst pump house), each with a crew log on its stake (T440c). A tile
 * under an `intake_hopper*` marker (A2M4's Intake Manifest, T540c) is a wrecked intake hopper,
 * `v4` (toppled) or `v5` (buckled and split), whatever the act; under a `feed*` marker (A3M5's
 * vat-feed lines, Cut the Feed; T740c), a burst feed line, `v6` (a pipe in two) or `v7` (a junction).
 */
export function wreckageFrame(
  col: number,
  row: number,
  env?: string,
  markers?: Readonly<Record<MarkerId, GridPos>>,
): WreckLook {
  const odd = (col + row) % 2 !== 0;
  if (markers !== undefined) {
    for (const [id, [c, r]] of Object.entries(markers)) {
      if (c === col && r === row && id.startsWith('intake_hopper')) return odd ? 'v5' : 'v4';
      if (c === col && r === row && id.startsWith('feed')) return odd ? 'v7' : 'v6';
    }
  }
  if (isActTwo(env)) return odd ? 'v3' : 'v2';
  return odd ? 'v1' : 'v0';
}

/**
 * The high-ground block's look on tile (col, row): an `outcrop*` marker's thread-glass (A2M2), a
 * `catwalk*` marker's plant catwalk (A2M4), a `watchtower*` marker's old watchtower (A2M6), an Act
 * II map's canyon ledge (A2M1), else Act I's grassy block.
 */
export function highGroundLook(g: GroundGrid, col: number, row: number): HighGroundLook {
  if (markerOn(g, 'outcrop', col, row)) return 'outcrop';
  if (markerOn(g, 'catwalk', col, row)) return 'catwalk';
  if (markerOn(g, 'watchtower', col, row)) return 'watchtower';
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

/** The parapet on a wall-walk tile, its variant alternating along the wall. */
function wallWalk(col: number): Prop {
  return { sprite: 'prop.wall', frame: `walk_${col % 2}`, anim: null };
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

/** Each grid's rift-crack tiles (tile indices), built once per grid. */
const CRACKS = new WeakMap<GroundGrid, ReadonlySet<number>>();

/** True when a rift lane's crack crosses (col, row) (`riftCrackTiles`): no sparse decor there. */
function onCrack(g: GroundGrid, col: number, row: number): boolean {
  let set = CRACKS.get(g);
  if (set === undefined) {
    const s = new Set<number>();
    for (const r of g.routeList ?? []) {
      if (r.kind !== 'rift') continue;
      for (const k of riftCrackTiles(g, r)) s.add(k.row * g.cols + k.col);
    }
    set = s;
    CRACKS.set(g, set);
  }
  return set.has(row * g.cols + col);
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
  const kerb = kerbEdges(g, col, row);
  if (kerb.length > 0) look = { ...look, kerb };
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
      // Treads run along the path: a road joined above or below runs along the grid's y axis
      // (where routes say so: a lane beside another isn't joined to it, `roadJoins`).
      const alongY = roadJoins(g, col, row, 0, -1) || roadJoins(g, col, row, 0, 1);
      const ground: TileLook = { sprite: 'tile.path', frame: alongY ? 'tread_y' : 'tread_x' };
      return {
        ground,
        prop: t === 'C' ? { sprite: coreSprite(g.id), frame: 'idle_0', anim: 'idle' } : null,
      };
    }
    case 'S': {
      // A spawn inside the map, off every edge, is a hatch the enemy comes up out of (A2M4's vat
      // drain hatch); one on the edge is a burrow at the head of the road. On a revisit the edge
      // is the original map's (T730b): A1M1's road still comes down out of its burrow on A3M6,
      // A2M4's out of its own on A3M5, wherever the band puts them.
      return { ground: { sprite: 'tile.spawn', frame: spawnFrame(g, col, row) }, prop: null };
    }
    case 'o':
      // A pad on the wall walk (A2M6) keeps the parapet behind its plate; a tower on it draws in
      // front of the parapet (tower bias).
      return {
        ground: { sprite: 'tile.pad', frame: 'v0' },
        prop: onWall(g, col, row) ? wallWalk(col) : null,
      };
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
        else if (onCrack(g, col, row))
          sprite = null; // a rift lane's crack runs here (T640c)
        else if (onWall(g, col, row)) sprite = 'prop.wall';
        else if ((col * 3 + row * 5) % 7 === 0) sprite = 'prop.flora';
        else if ((col * 5 + row * 3) % 11 === 0) sprite = 'prop.rock';
      }
      // Wreckage alternates its two wrecks by tile (a crashed drone, a toppled cart); WreckageView
      // swaps the frame as the drone works and hides it once the tile is cleared.
      let onTile: Prop | null = null;
      if (sprite === 'prop.bunting') {
        onTile = { sprite, frame: buntingFrame(g, col, row), anim: null };
      } else if (sprite !== null && t === 'x' && decor === null) {
        onTile = { sprite, frame: wreckageFrame(col, row, g.env, g.markers), anim: null };
      } else if (sprite === 'prop.wall' && decor === null) {
        onTile = wallWalk(col);
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
  // M5's plant and colony hardware (T540c).
  'prop.vat',
  'prop.intake',
  'prop.wall',
  'prop.relocation_fence',
  // M6's Everglow kit and the warrens' homes (T640c).
  'prop.preserve_sign',
  'prop.warren_home',
  'prop.shuttle',
  'prop.dead_turret',
  'prop.blast_door',
  'prop.emergency_lamp',
  // M7's (T740c): Everglow kit, the Shelters' things, the warren's ring, Zibzab's crate, and Pebble
  // on her rock (its own default palette is already `act3`).
  'prop.generator',
  'prop.hall_door',
  'prop.shelter_bay',
  'prop.banner_friday',
  'prop.held_door',
  'prop.humming_ring',
  'prop.mail_chute',
  'prop.hangar',
  'prop.crash_plate',
  'prop.barricade',
  'prop.pebble_rock',
  'prop.crate',
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

/**
 * Act III's apron dressing on the same north edges: the colony in the Long Night. Evie's billboard
 * `dark` on the north-west under an emergency lamp, crystal breaking out of the ground beside it,
 * and the domes of Dome Row out but for their emergency lights on the north-east, each with a lamp
 * (art-direction §3 *Act III*).
 */
function nightDecor(g: GroundGrid): ReadonlyMap<string, Prop> {
  const m = new Map<string, Prop>();
  const west = Math.round(g.rows * 0.2);
  m.set(`-2,${west}`, prop('prop.billboard', 'dark'));
  m.set(`-2,${west + 2}`, prop('prop.emergency_lamp', 'v0'));
  m.set(`-2,${west + 4}`, prop('prop.flora', 'crystal'));
  m.set(`${Math.round(g.cols * 0.55)},-2`, prop('prop.dome', 'dark'));
  m.set(`${Math.round(g.cols * 0.55) + 2},-2`, prop('prop.emergency_lamp', 'v0'));
  m.set(`${g.cols - 2},-2`, prop('prop.dome', 'dark'));
  m.set(`${Math.round(g.cols * 0.3)},-2`, prop('prop.flora', 'crystal'));
  return m;
}

const DECOR_BY_ENV: Readonly<Record<string, (g: GroundGrid) => ReadonlyMap<string, Prop>>> = {
  act1: colonyDecor,
  'act2.gold': frontierDecor,
  'act2.dusk': frontierDecor,
  act3: nightDecor,
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
            const brush = prop('prop.flora', decorLook('prop.flora', env).frame);
            p =
              h === 0
                ? brush
                : h === 4
                  ? prop('prop.rock', decorLook('prop.rock', env).frame)
                  : null;
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
