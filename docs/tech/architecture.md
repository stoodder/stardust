# Architecture

How Stardust is built: the stack, the module layout, the sim/render boundary, saves, and build and deploy. Code style, recipes, and the test loop in detail are in [conventions.md](conventions.md). The look and the sprite format are in [art/art-direction.md](../art/art-direction.md).

---

## 1. Stack

| Tool | Version (Nov 2026) | Role |
|---|---|---|
| **Node** | ≥ 22.18 (LTS; 24 also fine) | Dev tooling. 22.18+ runs `.ts` files natively (type stripping), which `npm run sim` and the docs check rely on. |
| **TypeScript** | 7.0.x (`typescript`), strict | Language and type checking (`tsc` is the native Go compiler in 7.x) |
| **Vite** | 8.x | Dev server and production bundler |
| **Phaser** | **4.2.x** | Rendering, input, animation, cameras, filters (WebGL) |
| **Preact** + `@preact/signals` | 11.x / 2.x | DOM UI overlay (HUD, menus, dialogue) |
| **Vitest** | 5.x | Unit, sim, and content tests |
| **Playwright** (`@playwright/test`) | 1.x | Browser smoke tests and screenshots |
| **oxlint** + `oxlint-tsgolint` | 1.x / 7.x | Linting, including type-aware rules |
| **Prettier** | 3.x | Formatting |

Output is a **static site** (HTML + JS + CSS, with no backend), playable in a desktop browser. Input and layout are designed so that touch can be added later (D001 #8).

### Why Phaser 4, not Phaser 3

- **Phaser 4 is the current stable line.** 4.0.0 shipped on 2026-04-10. 4.1.0 and 4.2.0 followed, and 4.2.1 is npm `latest`. Phaser 3 is the legacy line. We have no v3 code to migrate, so there's no reason to start on the older line.
- **Its renderer suits our look.** The v4 WebGL renderer is faster, and its unified filter system gives us camera bloom and glow (`Phaser.Actions.AddEffectBloom`, internal and external filters) for the "glowing emissives against inky dark" style. It also has a tint **fill** mode for hit flashes.
- **It's well documented:** an official v3→v4 migration guide, the "Phaser 4 Rendering Concepts" guide, and updated API docs.
- **The risk is training data.** Most tutorials, and most of what agents remember, target Phaser 3. **Agents must check the v4 API before using anything they remember from v3.** Known traps:

| Phaser 3 habit | Phaser 4 reality |
|---|---|
| `this.make.graphics().generateTexture()` / `Create.GenerateTexture` for pixel art | `Create.GenerateTexture` and the built-in palettes are **removed**. We bake our own textures (`textures.addCanvas` plus frames). |
| `roundPixels` defaults to `true` | Defaults to **`false`**. We set `roundPixels: true` explicitly. |
| `setTintFill(color)` | Removed. Use `setTint(color)` plus `setTintMode(Phaser.TintModes.FILL)`. |
| `preFX` / `postFX` | Replaced by `filters` (internal and external lists). |
| `RenderTexture.draw()` draws immediately | `DynamicTexture`/`RenderTexture` buffer commands until you call **`.render()`**. |
| `Phaser.Geom.Point` | Removed. Use `Phaser.Math.Vector2`. |
| `Phaser.AUTO` with Canvas fallback | The Canvas renderer is deprecated, and filters need WebGL. We use **`Phaser.WEBGL`**. |
| `setPipeline('Light2D')` | `setLighting(true)` (we don't use Phaser lights; see art-direction §7). |

### Why TypeScript 7 plus oxlint (not typescript-eslint)

TypeScript 7.0 (July 2026) is the native compiler: same language, and roughly 10× faster type checks. It ships **no programmatic API yet**, so typescript-eslint can't run on it. oxlint's type-aware mode (`oxlint-tsgolint` v7, built on TS 7.0.2) covers almost all of typescript-eslint's type-aware rules and is much faster. Vite and Vitest only strip types and never call `tsc`, so they're unaffected.

**Fallback:** if a tool we need breaks on TS 7, pin `typescript@6.0` and switch to `typescript-eslint`. Record that as a decision.

---

## 2. The hard boundary: sim vs render

```
                ┌──────────────────────────── browser ────────────────────────────┐
                │                                                                   │
  input ──────▶ │  render/ (Phaser)      ui/ (Preact DOM)      story/   audio/       │
                │      │   ▲                 │    ▲              ▲         ▲         │
                │      │   │ read-only       │    │ view models  │ events  │ events  │
                │      ▼   │ state           ▼    │              │         │         │
                │  ┌─────────────── app/ (host: loop, routing) ─────────────────┐    │
                │  │   commands ──▶  sim.enqueue()     sim.step() × N          │    │
                │  │   events   ◀──  sim.drainEvents()                         │    │
                │  └────────────────────────────────────────────────────────────┘    │
                │                         sim/  (pure TS, deterministic)               │
                └───────────────────────────────────────────────────────────────────┘
```

**`src/sim/` is pure TypeScript.** It never imports Phaser, the DOM, `render/`, `ui/`, `audio/`, or `meta/`, and never uses `Date`, `Math.random`, `performance`, timers, or `localStorage`. This is enforced three ways:

1. **Separate tsconfig.** `tsconfig.pure.json` covers `src/sim`, `src/content`, `src/story`, and `src/shared` with `"lib": ["ES2023"]` and `"types": []`. Any DOM global (`window`, `document`, `HTMLCanvasElement`) is a **type error** there.
2. **An architecture test** (`src/shared/architecture.test.ts`) scans the import statements of every file in the pure modules and fails on forbidden imports. This is the authoritative check.
3. **Lint** (`no-restricted-imports` in `.oxlintrc.json`) gives fast editor feedback.

Rendering **reads** sim state and **sends commands**. It never mutates sim state.

### Determinism

- Same content + same map + same seed + same command list ⇒ the **same outcome**, on the same JS engine. That's what tests, balance sims, and reproducible bug reports need. Bit-exact results across browsers aren't a goal (there's no multiplayer or server replay).
- **Fixed timestep: 60 ticks per second.** `TICK_HZ = 60`. Sim time is an integer `tick` counter. Content is authored in seconds and tiles, and converted to ticks once at content compile time.
- **Seeded RNG:** `sfc32` (128-bit state, serializable) in `src/shared/rng.ts`. The sim derives one **stream per system** from the map seed (`rng.fork('spawn')`, `rng.fork('combat')`), so adding a random roll in one system doesn't shift every other system's results. Cosmetic randomness (particles, Hollow glitches, bark choice) uses separate render-side or story-side RNGs and **never** touches the sim's.
- Iteration order is always array order (entities are processed in ascending slot order). No `for…in` over objects, and no sorting without a deterministic tie-break.
- Prefer squared distances. Avoid transcendental math (`sin`, `atan2`, `pow`) in outcome-affecting code where simple arithmetic works.

### Entity model: typed pools, not an ECS

We have about 5 entity kinds and at most a few hundred live entities. A generic ECS would be more machinery than it's worth. **The simplest thing that works:**

- One **typed pool per kind**: `towers`, `enemies` (including neutral units such as Gerald, flagged `neutral`), `projectiles`, `zones` (ground effects, ability areas, and song auras), and `allies`. Each pool is a preallocated array of plain objects with every field initialized (monomorphic shapes), plus a free list.
- **Allies** are every friendly non-tower unit ([design/maps.md §5.4](../design/maps.md#54-allies-on-the-map)). Each has an `allyKind` (`swarmling`, `leaper`, `refugee`, `bearer`, `singer`, `bricks`, `militia`, `ward`), a movement mode (`route`, `post`, `owner`, or `stationary`), an optional attack (Bricks and militia), an optional song aura (singers, bearers), and a **vulnerability**: `never` (swarmlings, leapers, militia, wards, Pebble, Old Thrum), `hush` (refugees, singers, bearers: a Hollow unit that reaches them removes them after a 0.5 s tell), or `hp` (Bricks in A3M3, with a scripted HP floor). Enemies never target towers; Hollow enemies may target `hush` and `hp` allies.
- Each entity has a `uid` (a monotonic integer, never reused within a run) and an `alive` flag. Dead slots return to the free list at the end of the tick.
- Entities hold a **direct reference to their compiled definition** (`def: CompiledEnemyDef`), resolved at spawn, so hot loops never look up string ids.
- Status effects ([design/enemies.md §2.4](../design/enemies.md#24-status-effects)) are **fixed fields** (`chillMul`, `chillTicks`, `soakedTicks`, `corrodedStacks`, `pinnedTicks`, `stasisTicks`, `unnervedTicks`, `revealedTicks`, and on towers `jammedTicks` and `jamImmuneTicks`), not dynamic lists.
- Enemies follow **predefined routes**. Map data gives ground paths and rift lanes as ordered tile sequences, and air lanes as polylines ([design/maps.md §4](../design/maps.md#4-paths-and-air-lanes)). Compile turns each into a polyline through tile centers with precomputed cumulative lengths. An enemy stores `pathIndex` and `dist` (distance traveled), and its position is derived from those. `dist` also gives "first / last" targeting for free.
- Systems are **plain functions** `(state: SimState, ctx: TickContext) => void`, run in a fixed order:

| # | System | Does |
|---|---|---|
| 1 | `applyCommands` | Validates and applies queued player commands, FIFO. Rejections emit `CommandRejected`. |
| 2 | `waves` | Advances the wave schedule and spawns enemies |
| 3 | `triggers` | Evaluates map script triggers and executes their actions (see [Map scripts](#map-scripts-story-driven-sim-changes)); emits `ScriptCue` and the other script events |
| 4 | `status` | Ticks status timers, DoTs, auras, detection (Revealed), and synergy links |
| 5 | `abilities` | Enemy ability state machines (telegraph → effect → cooldown), and commander ability cooldowns and effects |
| 6 | `movement` | Advances enemies along paths; leaks damage the core |
| 7 | `towers` | Targeting, cooldowns, firing, hold fire; `allies` (swarmling and leaper sorties, refugee, bearer, and choir movement, hushes, ally attacks, song auras) |
| 8 | `projectiles` | Movement, hits, damage, deaths, bounties |
| 9 | `cleanup` | Releases dead slots, resolves rest vs scatter for dead Hollow units (finale), updates story stats, and checks win/lose |

Win and lose conditions, economy, and every mechanic rule (damage pipeline, targeting tie-breaks, jam limits) are defined in [design/core-loop.md](../design/core-loop.md), [design/towers.md](../design/towers.md), and [design/enemies.md](../design/enemies.md). The sim implements them; it doesn't redefine them. The sim also records per-run **story stats** in `state.stats` for story and meta to read: `skitterkinKilled` (the run's Pests Processed: Skitterkin enemies killed by towers or abilities), `killsByEnemy`, `holdFireTicks`, `ticksSinceFiredAtSkitterkin` (reset whenever a tower fires at a Skitterkin; frozen while none is in range), and, per wave **tag**, `tagSpawned` / `tagLeaked` / `tagKilled` ([design/core-loop.md §2.7](../design/core-loop.md#27-hold-fire)). It also tracks `medalExemptLeaks`, the meter (`evacuated`, `lost`, `singers`), and in the finale `restPoints`, `restTarget`, and `boreProgress`. All are integers.

If profiling ever shows object pools are too slow (unlikely below about 2,000 entities), convert a hot pool to struct-of-arrays (`Float32Array` columns) behind the same system functions.

### Commands (input into the sim)

Every player action is a **command**: a plain, serializable object in a discriminated union.

```ts
type Command =
  | { type: 'build';      tile: GridPos; tower: TowerId }
  | { type: 'upgrade';    towerUid: number }               // next tier
  | { type: 'specialize'; towerUid: number; spec: 'a' | 'b' }
  | { type: 'sell';       towerUid: number }
  | { type: 'targeting';  towerUid: number; mode: 'first' | 'last' | 'strong' | 'close' }
  | { type: 'holdFire';   towerUid: number | 'all'; on: boolean }
  | { type: 'ability';    slot: 1 | 2; target?: GridPos }   // commander abilities
  | { type: 'callWave' }                                    // call the next wave early
  | { type: 'scriptInput'; id: string };                    // the forced single input (SEAL, "Who's there?")
```

- The host calls `sim.enqueue(cmd)`, and the command applies at the **start of the next tick**.
- The sim validates every command (affordability, a buildable and empty tile, a tower in the loadout and not revoked, an ability off cooldown and not revoked). While a forced input is pending, **every command except the matching `scriptInput` is rejected** (`reason: 'forcedInput'`). Commands can be issued while paused (for example aiming an ability) and apply on the next tick. Invalid commands emit `CommandRejected { cmd, reason }` so the UI can explain.
- The **command log plus the seed reproduces a run exactly.** The game keeps it in memory so a bug report can include a replayable code (dev builds), and balance-sim builds are just scripted commands.

### Events (output from the sim)

- During a tick, systems push typed events into `state.events`. Combat: `EnemySpawned`, `EnemyDied`, `EnemyLeaked`, `ProjectileFired`, `ProjectileHit`, `TowerBuilt`, `TowerSold`, `TowerJammed`, `HoldFireChanged`, `WaveStarted`, `WaveCleared`, `BossPhase`, `MapWon`, `MapLost`, `CommandRejected`. Story-facing: `ScriptCue { cueId }`, `NotFiringAtSkitterkin` (once, when `ticksSinceFiredAtSkitterkin` crosses the threshold in `content/rules.ts`), `SkitterkinKilledAhead`, `AllyHushed`, `RefugeeSaved`, `AllyDamaged`, `EnemyLaidToRest { uid, restValue }`, `EnemyScattered`, `EnemyReformed`, `BossEnded { how: 'driveOff' | 'retreat' | 'pivot' | 'layToRest' }`, `ObjectiveChanged`, `TowerClassRevoked { tower, refund }`, `TowerClassRestored`, `AbilityRevoked`, `ForcedInputRequested { id }`, `ForcedInputResolved { id }`, and `TimerProgress` (secondary timer, emitted on each whole percent).
- After each frame's ticks, the host calls `sim.drainEvents(out)` and dispatches the events to subscribers (render views, UI signals, story, audio) through the **typed event bus** in `src/shared/bus.ts` (a tiny `on/off/emit` emitter keyed by event `type`).
- **Inside the sim, systems communicate through state, not events.** Events are output only, which keeps the tick order explicit.
- Events are infrequent compared to per-entity work, so plain object events are fine. Per-entity, per-tick work must not allocate ([conventions.md § Performance](conventions.md#performance-rules)).

### Map scripts (story-driven sim changes)

Story moments that change play run **inside the sim** as map data, so headless runs, replays, and the balance harness see exactly what a player sees ([design/maps.md §5.3](../design/maps.md#53-map-scripts)). Dialogue stays in `story/`; the sim only emits `ScriptCue` ids.

```ts
interface ScriptedEvent { id: string; on: ScriptTrigger; when?: SimCondition; actions: ScriptAction[]; once?: boolean }
type ScriptTrigger =
  | { wave: number; phase: 'start' | 'cleared' | { afterSec: number } }
  | { bossHpPct: number; boss?: EnemyId }        // crossing downward
  | { bossPhase: number }
  | { refugeesRemaining: number }                 // Escort / Holdout
  | { restProgressPct: number }                   // finale
  | { forcedInputResolved: string }
  | { tick: number };
type ScriptAction =
  | { cue: string }                                               // story binds it to a scene or bark
  | { revokeTowerClass: { select: 'mostPlaced'; faction?: Faction }; refundPct: 100 }
  | { restoreTowerClass: 'lastRevoked' }
  | { revokeAbility: AbilityId }
  | { setObjective: ObjectiveKind; meterLabel?: MeterLabel }      // the A2M5 pivot
  | { bossEnd: 'driveOff' | 'retreat' | 'pivot' }
  | { standDown: Faction }                                        // pivot: remove that faction's hostiles, no leak
  | { spawnAllies: AllyGroupId } | { spawnWave: WaveGroupId }
  | { forceInput: { id: string } }                                // pauses waves and locks commands until scriptInput
  | { setModifier: 'quillLockout' | 'previewHidden'; on: boolean }
  | { startTimer: TimerId } | { setPhase: number }                // finale phases
  | { setLighting: LightingPresetId }                             // sim records it; render reads it
  | { grantCredits: number } | { openTile: GridPos; to: TileChar }
  | { endMap: 'won' | 'completed' };                              // Holdout ends as 'completed'
```

- **Flags in the sim.** `SimConfig.scriptFlags` carries the story flags a map's scripts and setup may read (`door_choice`, `spared_quiet_wave`, `stardust_choice`, `quill_choice`), copied from the save by `app/`. `SimCondition` can test them. The sim never sets flags; story derives flags from `state.stats` when the run ends ([Story](#story-srcstory)).
- **Forced input.** `forceInput` sets `state.pendingInput`. While it is set, the wave schedule, movement, and firing are frozen (the sim still ticks, so render can animate), and `applyCommands` accepts only `{ type: 'scriptInput', id }`. The host shows the single-button overlay on `ForcedInputRequested`. Real-time lines (Bricks's "Kid. It's okay." after 20 s) are a story-side timer on wall-clock time, not sim ticks. The balance harness presses it with a `scriptInput` build step.
- **Revocation** selects the class deterministically (most towers placed, then credits invested, then loadout slot; [design/towers.md §9](../design/towers.md#9-rules-for-story-driven-tower-changes)), sells every tower of it at 100%, adds it to `state.revoked`, and emits `TowerClassRevoked`. Meta copies `revoked` into the save at run end.
- **Rest and scatter** (finale, [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)): when a Hollow unit dies, `cleanup` checks it against every active song zone (squared distance). Inside: `EnemyLaidToRest`, `restPoints += restValue × songMult`. Outside, and if the map's song is active and the unit hasn't re-formed before: it becomes a `reforming` enemy (untargetable, drifting back along its route) and returns at 50% HP after the delay. The song's passive trickle adds rest points every tick. The modifiers by flag come from `MapDef.song`.

### Game speed, pause, and the host loop

The sim doesn't know about speed. The host (`src/app/host.ts`) drives it from Phaser's `update(time, delta)`:

```ts
const TICK_MS = 1000 / TICK_HZ;
acc += Math.min(delta, 250) * speed;            // speed ∈ {0 (paused), 1, 2}
let steps = 0;
while (acc >= TICK_MS && steps < MAX_STEPS_PER_FRAME * Math.max(speed, 1)) {
  sim.step(); acc -= TICK_MS; steps++;
}
if (steps === cap) acc = 0;                     // drop backlog rather than spiral
sim.drainEvents(events); dispatch(events);
```

- Speeds are 1× and 2×, with 3× an open design question ([design/core-loop.md §2.8](../design/core-loop.md#28-speed-and-pause)). The loop handles any integer speed. Pause sets speed to 0. Full-screen dialogue scenes pause; build-phase barks don't ([story/style-guide.md](../story/style-guide.md)).
- Rendering shows the latest tick's state with no interpolation. (At 60 Hz ticks this is smooth enough for pixel art; interpolation can be added later if 120 Hz+ displays look juddery.)

### Sim public API

```ts
// src/sim/index.ts
export function createSim(cfg: SimConfig): Sim;
interface SimConfig {
  content: CompiledContent; mapId: MapId; seed: number;
  loadout: TowerId[];                 // ≤ 4 (hard rule); never contains a revoked class
  modifiers: Modifier[];              // from permanent upgrades, difficulty, veteran mods
  difficulty: DifficultyId;
  abilities: { slot1: AbilityId | null; slot2: AbilityId | null; slot2State: 'present' | 'absent' | 'none' };
  scriptFlags: ScriptFlags;           // story flags that map scripts read (Map scripts above)
}
interface Sim {
  readonly state: DeepReadonly<SimState>;
  enqueue(cmd: Command): void;
  step(): void;
  drainEvents(out: SimEvent[]): void;
  hash(): string;                     // FNV-1a over key state, for determinism checks
}
export function runHeadless(opts: HeadlessOptions): HeadlessResult;  // balance sims
```

The sim knows nothing about meta progression. Permanent upgrades, Field Protocols, and difficulty arrive as a list of `Modifier`s computed by `meta/`.

**Modifiers follow the design's stacking formula** ([design/towers.md §4](../design/towers.md#4-stat-modifiers-and-stacking)): `stat_final = (stat_tier + Σ flat) × (1 + Σ pct)`, with percentages **added, never multiplied**, and per-stat caps on the total percentage.

```ts
type Modifier =
  | { kind: 'towerStat'; tower: TowerId | '*'; stat: TowerStat; flat?: number; pct?: number; source: ModifierSource }
  | { kind: 'enemyStat'; stat: EnemyStat; pct: number; source: ModifierSource }   // e.g. Story difficulty −30% HP
  | { kind: 'economy';   stat: 'startCredits' | 'coreIntegrity' | …; flat?: number; pct?: number; source: ModifierSource };
// pct is a fraction: +10% → 0.10
```

- Static modifiers (shop, protocols, difficulty) are folded into each tower's **base stat block** when the tower is built or upgraded.
- Dynamic sources (synergy links, auras, high ground, power nodes) are summed into per-tower `flatBonus[stat]` and `pctBonus[stat]` slots, which are recomputed only when something changes: a tower is built, upgraded, sold, or jammed, or a jam expires. They're never recomputed per tick.
- The final stat is computed once from the summed bonuses, with the cap applied to the summed percentage. Same-kind auras take the strongest value, not the sum. Caps and aura rules are data in `content/rules.ts`, not hard-coded.

---

## 3. Content (`src/content/`)

**Content is data**: typed TypeScript files, one entity per file, with explicit registries (no `import.meta.glob`, so the same files load in Vite, Vitest, and plain Node).

| Folder | Holds |
|---|---|
| `towers/` | Tower definitions: cost, tiers 1–3, two tier-4 specializations, attack behavior, sprite ids |
| `enemies/` | Enemy definitions: HP, speed, bounty, abilities, tell ids, sprite ids |
| `maps/<id>/` | One folder per map: `map.ts` (tiles, paths, air and rift lanes, objective, credits, events, environment palette), `waves.ts`, `builds.ts` (`referenceProfile`, `parBuild`, optional `noCounterBuild` and `altBuilds`), and `index.ts` composing them into one `MapDef` ([design/maps.md §9](../design/maps.md#9-map-data-shape-for-implementers)) |
| `upgrades/` | Permanent upgrades (shop and R&D) as modifiers |
| `dialogue/` | `flags.ts` (typed flag declarations), `speakers.ts` (speaker ids → portrait sets), `scenes/<act>/` (briefings, radio, cues, debriefs, full-screen scenes), `barks/<trigger>.ts` (bark pools), `memos/` (Halcyon Inbox), `epilogue/` (epilogue cards), `tips.ts` (loading tips), `results.ts` (results-screen counter lines), `bricks_tags.ts` (his turret-name list) |
| `codex/` | Codex entries, each with `original` / `annotated` / `corrected` versions and their unlock conditions |
| `presentation.ts` | The per-act presentation dials ([design/core-loop.md §6.7](../design/core-loop.md#67-per-act-presentation-dials)), with per-map overrides in map data |
| `sprites/`, `palettes/` | Pixel art data ([art-direction.md §6](../art/art-direction.md#6-code-generated-pixel-art-format)) |
| `types.ts`, `define.ts` | Definition types plus `defineTower()`, `defineEnemy()`, and similar identity helpers that give type inference |
| `registry.ts` | Imports every registry and exports `RAW_CONTENT` |
| `validate.ts` | Cross-reference and range validation |
| `compile.ts` | Resolves ids to references, converts seconds to ticks, and freezes the result into `CompiledContent` |

- **Ids** are `snake_case` strings, unique per kind. Id union types are derived from the registries (`type TowerId = keyof typeof TOWERS`), so a typo in a wave file is a compile error.
- **Exact numbers live in content files.** Design docs hold intent, roles, and target ranges, and link to the content file rather than copying its numbers.
- **Validation at load.** `compileContent(RAW_CONTENT)` runs `validate()` first: every referenced id exists, every wave enemy can walk its route, ground paths lie on path tiles (air and rift lanes are exempt), numeric ranges are sane, sprite grids are well-formed, palette colors exist in the master palette, Hollow-reserved hues aren't used elsewhere, and so on. In dev builds a failure throws with a full error list. **`src/content/content.test.ts`** runs the same validation in `npm test` (the schema test).
- TS types check shape at compile time; `validate()` checks what types can't (cross-references, ranges, grid geometry). No schema library is needed, because content is TS, not JSON. Untrusted input (save import) gets its own validator in `meta/`.

---

## 4. Other modules

| Module | Purity | Responsibility |
|---|---|---|
| `src/shared/` | pure | RNG, typed event bus, hashing, small math, `DeepReadonly`, id helpers, the architecture test |
| `src/sim/` | pure | The simulation (§2) |
| `src/content/` | pure | Game data, validation, compilation (§3) |
| `src/story/` | pure | Dialogue runner, story flags, bark selection |
| `src/meta/` | logic pure, I/O via adapters | Saves, progression, shop and R&D, medals |
| `src/render/` | browser + Phaser | Phaser scenes, views, sprite baking, VFX, input |
| `src/ui/` | browser + Preact | DOM overlay: HUD, menus, loadout, shop, dialogue, codex |
| `src/audio/` | browser (WebAudio) | Procedural chiptune SFX and music (M2+) |
| `src/app/` | browser | Composition root: boot, screen routing, the host loop, settings, test hooks |

**Allowed dependencies** (arrows point at what a module may import):

```
shared ◀── content ◀── sim ◀──┐
   ▲          ▲  ▲      ▲     │
   │          │  └── story    │
   │          └───── meta     │
   └── render, ui, audio ─────┘   (read sim types and state; never sim internals)
app ──▶ everything
```

`render`, `ui`, and `audio` import from `sim` only through `src/sim/index.ts` (types, `Command`, `SimEvent`, read-only state). They don't import each other, except that `ui` may use the `render/sprites` canvases for portraits and icons.

### Rendering

Lives in `src/render/`.

- **Phaser config:** `type: Phaser.WEBGL`, `width: 640`, `height: 360`, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `backgroundColor: '#05030a'`, `scale.mode: NONE`. `render/scale.ts` computes the integer zoom on resize (formula in [art-direction.md §5](../art/art-direction.md#5-isometric-spec)) and applies it to the canvas and to the UI root (`--ui-scale`).
- **Scenes:** `BootScene` (compile content, bake sprites, load fonts), `BattleScene` (the playfield), `StarMapScene` (M3), `BackdropScene` (animated backgrounds behind DOM menus).
- **Views:** pooled `EnemyView`, `TowerView`, `ProjectileView`, and `FxView` objects, keyed by sim `uid`, created and released in response to sim events and positioned each frame from sim state through `render/iso.ts`. Layers and depth rules are in art-direction §5.
- **Sprites:** `render/sprites/` (rasterize, atlas, `SpriteSource`); see art-direction §6.
- **Input:** `render/input/` turns pointer and keyboard input into *intents* (select tile, place, cancel, hotkeys), then into `Command`s. Nothing is hover-only, so touch can be added later.

### UI: DOM overlay

**Decision: menus, the HUD, and dialogue are a Preact DOM overlay above the canvas. In-world UI (range rings, health bars, tells, floating numbers, placement ghosts) is drawn in Phaser.**

Why DOM:
- Stardust is **text-heavy** (dialogue, codex, memos, shop). DOM gives us text layout, wrapping, scrolling, and selection for free. Phaser text would need a hand-built layout engine.
- **Accessibility:** focus order, keyboard navigation, screen-reader labels, and user font scaling.
- **Forms:** player name and pronoun entry, and the save export/import text field.
- **Agent-friendly and testable:** Playwright can query DOM elements by role and text, and components are plain TSX.
- **Touch-ready:** native hit testing and scrolling.

How:
- `#ui` is a 640×360 box (in game pixels) layered over the canvas and scaled with CSS **`zoom: var(--ui-scale)`**, the same integer factor as the canvas. All UI is authored in game pixels. (Use `zoom`, not `transform: scale`, so text re-rasterizes crisply and pointer coordinates stay correct.)
- The root has `pointer-events: none`; panels set `pointer-events: auto`, so clicks on empty space reach the canvas.
- **State flow:** the host updates `@preact/signals` view models (credits, core HP, wave, selection, dialogue) from sim events and state, only when values change. Components dispatch `Command`s through `app/commands.ts`. UI never imports sim internals.
- Images (portraits, icons) are canvases from the sprite baker with `image-rendering: pixelated`.
- The style is defined in [art-direction.md §9](../art/art-direction.md#9-ui-style), including act themes as CSS variables.
- **Story UI states** the HUD must support: the forced-input overlay (one live button, everything else inert, settings still reachable), the companion slot's `present` / `absent` (dark portrait, no label) / hidden states, the callsign name plate, the preview's "ACCESS RESTRICTED" state, REVOKED stamps on loadout and ability slots, the finale countdown counter and Deep Bore bar, and the codex's side-by-side Field Journal view.

### Story (`src/story/`)

Pure TS. It reads content, the save's story state, and sim events, and produces dialogue, bark choices, flag changes, and presentation state. The authoring format and voice rules are defined in [story/style-guide.md](../story/style-guide.md); the TS types in `content/dialogue/types.ts` must map one-to-one onto its §5. The design homes for the systems below are in [design/core-loop.md §6](../design/core-loop.md#6-story-facing-systems).

**Dialogue runner.** A pure state machine over dialogue data: `start(sceneId) → cursor`, `advance(cursor, choiceIndex?)`. Node kinds:

```ts
type DialogueNode =
  | { kind: 'line'; speaker: SpeakerId; expression?: Expression; text: string;
      durationSec?: number }                 // required when text is '' (a silence line)
  | { kind: 'choice'; options: { text: string; tone: 'earnest' | 'wry' | 'quiet'; set?: FlagSet[];
      goto?: string; remember?: SpeakerId }[] }   // remember → "{Speaker} will remember that." (C3, C4 only)
  | { kind: 'branch'; cond: Condition; then: string; else?: string }
  | { kind: 'set'; flag: FlagId; value: FlagValue } | { kind: 'set'; callsign: Callsign }
  | { kind: 'end' };
```

- **Speakers** are the ids in [style-guide §5.1](../story/style-guide.md#51-speaker-ids), declared in `content/dialogue/speakers.ts` with their portrait set (or `none` for `pa`, `tfa`, `hollow`, `narrator`, `system`) and the text style for portrait-less speakers (`form` for `tfa`, `distorted` for `hollow`, `caption` for `narrator`).
- **Expressions:** the five base expressions plus per-speaker extras (`quill.policy`, `pebble.singing`); the portrait list is in [art-direction.md § Portraits and icons](../art/art-direction.md#portraits-and-icons). A line naming no expression uses `neutral`.
- **Portrait variants** are chosen by rules, not by lines: `speakers.ts` lists, per speaker, `{ variant, when: Condition }` in priority order (for example `vesthara`: `dawn` in the finale's Phase 3, `touched_deep` in Act III, `touched` from A2M5; `bricks`: `pebble` from A2M3, `dark` when absent; `quill`: `party_hat` on A1M5, `purge` under `quill_choice = purge`).
- **Silence:** a `line` with `text: ''` shows the speaker's frame (dark for Bricks after A3M3) for `durationSec`, with no text and no typing sound.

**Conditions** are data, not strings: `{ flag, eq }`, `{ act }`, `{ mapAtLeast: MapId }`, `{ mapIs: MapId }`, `{ stat: 'pestsProcessed', gte }`, `{ all: [...] }`, `{ any: [...] }`, `{ not: … }`. Map order comes from `content/campaign.ts`.

**Flags** are declared in `content/dialogue/flags.ts` with a type (`boolean`, or a string union such as `'convoy' | 'warren'`) and a one-line description. The canon set is in [story/bible.md § Flag summary](../story/bible.md#flag-summary). Flags are set by `choice`/`set` nodes, by UI events (`peeker_poked`, `asked_zibzab_early`), or by **run-end rules**: data in `content/dialogue/flags.ts` that derives a flag from `state.stats` when a map ends, for example:

```ts
{ flag: 'spared_quiet_wave', onMapEnd: 'a1_m05',
  value: { tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0.75 } } }   // design/core-loop.md §2.7
```

**Text substitution** (`story/text.ts`) runs on every line, bark, choice, memo, codex version, tip, results line, and epilogue card:

| Token | Resolves to |
|---|---|
| `{name}` | `profile.name` |
| `{callsign}` | `profile.callsign` (Sprout, Thorn, Waykeeper) |
| `{they}` `{them}` `{their}` `{theirs}` `{themself}` and capitalized `{They}` `{Them}` `{Their}` `{Theirs}` `{Themself}` | The forms from `profile.pronouns` (a `PronounSet`: `she`, `he`, or `they`, each with all five forms and its `agreement`) |
| `{v:<plural>\|<singular>}` | Verb agreement: the first form when `agreement` is `plural` (they/them), the second when `singular` (she, he). Any pair works: `{v:are\|is}`, `{v:were\|was}`, `{v:have\|has}` |
| `{pests_processed}` | The lifetime counter with thousands separators; inside a map it is the save value plus the run's `skitterkinKilled` so far |
| `{evacuated}` | The current map's meter count (Evacuated, Sheltered, or singers) |
| `{glyph:<id>}` | An inline glyph from the pixel font's glyph set (`sun`, the Hally sun used in memo sign-offs; `star`, the results-screen ★). Unknown ids fail validation |

Emphasis `*word*` (at most one per line) renders italic; parentheticals such as `(hum, six notes)` and `(squeak)` are plain text. Lines from `hollow` render in the `distorted` style (dropped letters and misregistered glyphs, cosmetic RNG, reduced to plain grey text in reduced-motion mode).

**Validation** (`content/validate.ts`, run by the content test) enforces the style guide's mechanical rules:
- **Lengths after worst-case substitution** ([style-guide §5.4](../story/style-guide.md#54-text-tokens-and-length)): `{name}` counts 16, `{callsign}` 9, `{pests_processed}` 6, pronoun tokens their longest form, `{v:…}` its longer form, `{glyph:…}` 1. Limits: dialogue line 120, bark 80, choice option 60, codex version 600, memo body 600 and small print 140, loading tip 80, shop description 100, epilogue card 240. Scene sizes: briefing ≤ 8 lines, radio slot 1–3, mid-map cue ≤ 4, full-screen scene ≤ 20, debrief ≤ 6, base topic ≤ 8.
- Every speaker exists; every expression exists for its speaker; every flag and condition target is declared; scene ids match `<map_id>_<slot>`.
- **Protected `{name}`:** it may appear only in scenes for maps at or after `a3_m03` in campaign order, in epilogue cards, and in `system` UI copy (name tags, onboarding), and never in a `sterling` line.
- **QUILL's tell:** a `quill` line uses expression `policy` if and only if its text starts or ends with "(Per policy.)".
- **Exclamation budget:** `bricks` and `vesthara` lines never contain `!`; in Act III scenes only `sterling` and `pebble` lines may; `quill` never does after A3M2; in the finale only `pebble`, `sterling`, and `system` (the final lyric) may. Softer per-act guidance stays with writers.
- A silence line has `durationSec`; a `choice` has 2–3 options; a `remember` appears only on C3 and C4 choices.

**Triggers and barks.** Scenes and barks bind to triggers: map script cues (`ScriptCue`), bark-matrix events (the trigger ids and their exact conditions are owned by [design/core-loop.md §6.3](../design/core-loop.md#63-barks); each maps to a sim event or a host event), and menu events (entering the base, the shop, the star map, the Inbox). `story/barks.ts` picks barks by the style guide's priority (script cue → boss → first-time trigger → repeat), spacing (one per 6 s of sim time unless scripted), presence (QUILL and the companion only; QUILL is absent when `quillOffline`), and no-repeat pools, using its own seeded RNG. A bark slot assigned to an absent speaker plays that speaker's authored silence line.

**Story state** (flags, seen scenes, read memos, unlocked codex versions, `bricksTagIndex`, `memorialTower`) lives in the save. Choices (D001 #3) are just flags; their payoffs are read by content (tower gifts, allies, map dressing, bark pools, epilogue cards) and by map scripts through `scriptFlags`.

**Other story systems**, all pure functions over content and save state:
- `story/counter.ts`: the results line per act, and the finale countdown display `round(N × (1 − restPoints / restTarget))` from the sim's stats ([design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)).
- `story/codex.ts`: which versions of each entry are unlocked, the *Pest Field Guide* / *Field Journal* title, and side-by-side mode from A3M1.
- `story/inbox.ts`: which memos are delivered after a map (one condition per memo), and gifts attached to them.
- `story/epilogue.ts`: for each card slot in order, the first `EpilogueCard { id, slot, when: Condition, text }` whose condition matches.
- `story/presentation.ts`: resolves the act dials plus map overrides (loading tip pool, billboard state, Tidybots on or off, jingle variant, UI theme).
- `story/tags.ts`: Bricks's name-tag choice (which tower, which name) from sim events; cosmetic, so it lives outside the sim.

### Meta (`src/meta/`)

Progression, currencies (Stardust and Intel, D001 #6), the shop, R&D, medals, and unlocks. It turns a save into `SimConfig.modifiers`, the available loadout pool (owned minus revoked), the ability pool (owned minus revoked), and `scriptFlags`, and turns a run result into rewards. The rules are in [design/progression.md](../design/progression.md). Persistence goes through a `KeyValueStore` interface (a localStorage adapter in the browser, in-memory in tests).

- **Run end** (win, loss, retry, or quit to menu): add `stats.skitterkinKilled` to `save.stats.pestsProcessed`; apply story run-end flag rules; copy `revoked` towers and abilities; record medals, ignoring `medalExemptLeaks` for Perfect Core.
- **Story transactions** are named meta operations, so they're testable and idempotent: `grantQ3Bonus`, `resolveC2(choice)` (Sell: bank → 0, Intel windfall, Zibzab Tune-up; Return: bank → 0; none), `buyJailbreak` (price 0 under `door_choice = convoy`), `inheritAbility('suppressing_fire')`, `revokeAbility` (refunding Orbital Strike Mk II Intel), and `grantGift(towerId)`.

### Audio (`src/audio/`, M2+)

WebAudio synthesis of SFX (square, triangle, and noise voices with envelopes) and layered music (D001 #9). It subscribes to sim and app events through the bus, has master, music, and SFX gain nodes, and unlocks the `AudioContext` on the first user gesture. It never blocks the sim.

**"Halcyon Bright" variants.** The campaign's motif is one six-note phrase (and its couplet) in seven arrangements ([story/bible.md §8](../story/bible.md#8-recurring-motifs)). Each is a named cue in `audio/music.ts`, chosen by the presentation dials or by a script cue, never hard-coded per map:

| Cue id | Arrangement | Used |
|---|---|---|
| `bright_sting` | Upbeat corporate wave-clear sting (the six notes); the full couplet on the PA at shift change | Act I `WaveCleared` |
| `bright_minor` | The same sting with minor-key bridges, then fully in minor from A2M4 | Act II `WaveCleared` |
| `hollow_hum` | Hummed off-key, out of tune, half backwards; drops in near Hollow units while other music ducks | Acts II–III, Hollow proximity |
| `leaving_hum` | Hummed slowly by one small voice (Pebble), then a second (Thrum, if spared) | A3M1 scene |
| `door_hum` | Hummed by Bricks over the radio, with Pebble humming along; loops while the SEAL waits | A3M3 SEAL |
| `choir_hymn` | Sung by the choir as a hymn, swelling with the number of singers; "clearing the way!" shouted | Finale Phase 2 |
| `dawn_major` | Major-key reprise, many voices | Finale Phase 3, credits |

In Act III there is **no wave-clear sting** (the jingle stops playing). The Hum Choir tower's harmony line carries the same phrase whenever a Choir is built ([design/towers.md](../design/towers.md#skitterkin-towers)).

---

## 5. Save system

| Item | Decision |
|---|---|
| Storage | `localStorage`, behind `KeyValueStore` |
| Keys | `stardust:slot:1`…`3` (campaign saves), `stardust:slot:N:bak` (the previous good write), `stardust:settings`, `stardust:lastSlot` |
| Format | JSON: `{ v: <schemaVersion>, savedAt, data: SaveData }` |
| When | After map results, purchases, story choices, and settings changes. Never mid-map; a map in progress isn't saved. Replaying a map is cheap and matches "failing has no penalty". |

**SaveData** (sketch; the progression fields come from design/progression.md):

```ts
interface SaveData {
  profile: {
    name: string;                       // 1–16 chars, charset in design/core-loop.md §6.1
    pronouns: 'she' | 'he' | 'they';    // PronounSet id
    callsign: 'sprout' | 'thorn' | 'waykeeper';
    arrivalReason: 'bonus' | 'family' | 'lettuce';
  };
  campaign: { maps: Record<MapId, { completed: boolean; medals: MedalId[]; bestMeter: number }>; };
  currencies: { stardust: number; intel: number };
  unlocks: {
    towers: TowerId[]; specs: SpecId[];
    revokedTowers: TowerId[];           // A3M2 until the jailbreak
    jailbroken: TowerId[];              // drawn with the jailbroken palette
    abilities: AbilityId[]; revokedAbilities: AbilityId[];
  };
  upgrades: Record<UpgradeId, number>;  // includes the C2 Zibzab Tune-up
  story: {
    flags: Partial<StoryFlags>;         // typed from content/dialogue/flags.ts
    seen: SceneId[];                    // scenes played (skippable on replay)
    memosRead: MemoId[]; memosDelivered: MemoId[];
    codex: Record<CodexId, ('original' | 'annotated' | 'corrected')[]>;
    bricksTagIndex: number;             // next name in Bricks's tag list
    memorialTower: TowerId | null;      // the A3M3 {name} turret's type
    granted: string[];                  // one-time grants already applied (q3_bonus, gifts, crate)
  };
  stats: { pestsProcessed: number; runs: number; /* … */ };
}
```

**Versioning and migrations**
- `SAVE_VERSION` is an integer. `src/meta/migrations.ts` exports `migrations: Record<number, (old: unknown) => unknown>`, where `migrations[n]` upgrades version `n` to `n + 1`.
- Loading parses JSON, applies migrations in sequence to the current version, then `validateSave()`. If validation fails it falls back to the `:bak` key, then to a clear "save could not be loaded; export raw data?" prompt. **Never silently wipe a save.**
- Migrations are never deleted or edited after release. Each schema bump adds a fixture `src/meta/__fixtures__/save.v<n>.json`, and a test migrates every fixture to the current version and validates it.

**Export and import codes**
- Export: `JSON → deflate-raw (CompressionStream) → base64url`, with the prefix `SD<v>-` and a 4-character checksum suffix. Example: `SD1-eNqrVkrLz…-a3f9`. A typical save is about 1–2 KB of text, which pastes fine.
- Import: check the prefix and checksum, cap the input at 64 KB and the decompressed size at 512 KB (to block decompression bombs), parse, migrate, validate, then confirm with the player before overwriting a slot.
- `CompressionStream` is available in all target browsers and in Node 22, so the codec is testable in Vitest.

---

## 6. Build, test, and deploy

The npm scripts that make up the test loop (D002) are defined here. **What each one checks and how to use them is in [conventions.md § The test loop](conventions.md#the-test-loop).**

| Script | Runs |
|---|---|
| `dev` | `vite`: dev server with HMR |
| `build` | `vite build` to `dist/` |
| `preview` | `vite preview --port 4173 --strictPort`: serves `dist/` |
| `typecheck` | `tsc -p tsconfig.pure.json --noEmit && tsc -p tsconfig.app.json --noEmit` |
| `lint` | `oxlint --type-aware && prettier --check .` |
| `format` | `prettier --write .` |
| `test` | `vitest run`: unit, sim, content, save, and architecture tests |
| `test:watch` | `vitest` |
| `sim` | `node tools/sim.ts`: headless balance sims for every map (args: `--map <id>`, `--seeds <n>`, `--build <name>`, `--report`) |
| `smoke` | `playwright test`: browser smoke tests against `npm run preview` |
| `check:docs` | `node tools/check-docs.ts`: link and docs-index checks |
| `check` | **The whole gate:** `typecheck && lint && test && build && sim && smoke && check:docs` |
| `check:fast` | `typecheck && lint && test` (inner dev loop only, never the gate) |

`package.json` sets `"type": "module"` and `"engines": { "node": ">=22.18" }`.

**Config files:** `tsconfig.base.json` (shared strict options), `tsconfig.pure.json` (no DOM lib), `tsconfig.app.json` (DOM lib, Preact JSX: `"jsx": "react-jsx"`, `"jsxImportSource": "preact"`), `vite.config.ts` (with `base: './'` so the build works from any subpath, and Vitest config inline), `playwright.config.ts`, `.oxlintrc.json`, `.prettierrc.json`, `.editorconfig`.

**Imports use relative paths with explicit `.ts` extensions** (`allowImportingTsExtensions`), and there are no path aliases. That lets the pure modules run unchanged in Vite, Vitest, and plain Node (`tools/sim.ts`), with no loader or alias config to keep in sync.

**Bundle:** Phaser goes in its own vendor chunk. Budgets: initial JS ≤ 1 MB gzipped, boot (compile content and bake sprites) ≤ 300 ms on a mid-range laptop.

### Deploy to GitHub Pages (once a remote exists, D001 #10)

1. Add `.github/workflows/deploy.yml`, triggered on push of tags `m*` (and manual dispatch): `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`, then `actions/upload-pages-artifact` with `dist/` and `actions/deploy-pages`.
2. Enable Pages with source "GitHub Actions". With `base: './'` the site works at `https://<user>.github.io/stardust/` without config changes.
3. Saves are per-origin localStorage, so moving the host later orphans saves unless players use export/import. Document that in the release notes when it happens.

---

## 7. Directory tree

```
stardust/
├── index.html                  # #game canvas host + #ui overlay root
├── package.json
├── tsconfig.base.json  tsconfig.pure.json  tsconfig.app.json
├── vite.config.ts      playwright.config.ts
├── .oxlintrc.json      .prettierrc.json    .editorconfig
├── tools/
│   ├── sim.ts                  # npm run sim: headless balance runner
│   └── check-docs.ts           # npm run check:docs
├── smoke/                      # Playwright specs (*.spec.ts) and helpers
├── docs/ … CLAUDE.md  tasks.md
└── src/
    ├── main.ts                 # entry: calls app/boot
    ├── app/                    # composition root
    │   ├── boot.ts  host.ts  router.ts  commands.ts  settings.ts  testHooks.ts
    ├── shared/                 # pure utilities
    │   ├── rng.ts  bus.ts  hash.ts  math.ts  types.ts
    │   └── architecture.test.ts
    ├── sim/                    # pure, deterministic
    │   ├── index.ts            # public API
    │   ├── state.ts  constants.ts  commands.ts  events.ts  pool.ts  path.ts  grid.ts
    │   ├── tick.ts             # system order
    │   ├── systems/            # applyCommands, waves, triggers, status, abilities, movement, towers, projectiles, cleanup
    │   ├── behaviors/          # tower attack kinds (projectile, beam, chain, aura, …)
    │   ├── abilities/          # enemy ability kinds (blink, burrow, gather, jam, hush, …) and commander abilities
    │   ├── headless.ts         # runHeadless(), the scripted-build executor
    │   └── policies/           # built-in policies: none (do nothing), spamCheapest, rushCalls
    ├── content/                # pure data
    │   ├── types.ts  define.ts  registry.ts  validate.ts  compile.ts  content.test.ts
    │   ├── towers/  enemies/  maps/<id>/  upgrades/  codex/
    │   ├── rules.ts            # rule data: stacking caps, jam limits, speed rule, bark thresholds
│   ├── presentation.ts     # per-act presentation dials
│   ├── dialogue/           # flags.ts speakers.ts types.ts scenes/ barks/ memos/ epilogue/ tips.ts results.ts bricks_tags.ts
    │   ├── campaign.ts         # campaign map order (mirrors story/campaign.md)
    │   ├── palettes/           # master.ts, factions.ts, env.ts
    │   └── sprites/            # defineSprite.ts, index.ts, towers/ enemies/ projectiles/ props/ tiles/ icons/ portraits/ ui/
    ├── story/                  # pure: runner.ts conditions.ts flags.ts barks.ts text.ts counter.ts codex.ts inbox.ts epilogue.ts presentation.ts tags.ts
    ├── meta/                   # save.ts, migrations.ts, codec.ts, store.ts, progression.ts, shop.ts, __fixtures__/
    ├── render/
    │   ├── scale.ts  iso.ts  depth.ts  layers.ts
    │   ├── scenes/             # BootScene, BattleScene, StarMapScene, BackdropScene
    │   ├── views/              # pooled EnemyView, TowerView, ProjectileView, FxView
    │   ├── sprites/            # rasterize.ts (pure), atlas.ts, SpriteSource.ts, CodeSpriteSource.ts
    │   ├── vfx/                # particles, glow, bloom, lighting overlay, range rings
    │   └── input/              # pointer/keyboard → intents → commands
    ├── ui/
    │   ├── theme.css           # tokens from the master palette, act themes
    │   ├── state.ts            # signals / view models
    │   ├── components/         # Panel, Button, Icon, Portrait, …
    │   ├── hud/                # TopBar, BuildBar, TowerPanel, BossBar
    │   └── screens/            # Title, Loadout, Shop, Codex, Dialogue, Results, Settings
    └── audio/                  # M2+: synth.ts, sfx.ts, music.ts
```

Unit tests sit next to their source as `*.test.ts`.

---

## Open questions

1. **Mid-map saves.** Not planned. Revisit if maps grow longer than about 15 minutes (the finale may: [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)).
2. **Visual regression.** Smoke tests capture screenshots but don't diff them. Turn on Playwright `toHaveScreenshot` once the art stabilizes (M3+)?
3. **TypeScript 7 tooling.** If oxlint's type-aware rules or editor tooling prove immature, fall back to TS 6 plus typescript-eslint (§1).
4. **Pests Processed on quit.** The count is added at run end, so closing the tab mid-map loses that run's kills. Flush on `pagehide` (a save write mid-map, which §5 otherwise forbids), or accept the loss?
5. **Custom pronouns.** `PronounSet` supports any five forms plus an agreement, but the save stores only three ids. Adding custom sets later needs a save migration and a name-entry-style form.
6. **Forced input and the sim clock.** Freezing waves, movement, and firing while the sim keeps ticking is simplest for render; confirm it doesn't disturb cooldown or determinism tests (cooldowns should also freeze).
