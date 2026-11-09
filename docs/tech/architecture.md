# Architecture

How Stardust is built: the stack, the module layout, the sim/render boundary, content data shapes, and build and deploy. Related tech docs:
- [story-runtime.md](story-runtime.md): map scripts, dialogue, flags, text tokens, barks, and the other story systems.
- [meta-runtime.md](meta-runtime.md): meta progression, run end, the story transactions, and the save system.
- [conventions.md](conventions.md): code style, recipes, and the test loop in detail.
- [art/tech-spec.md](../art/tech-spec.md): the isometric spec and the sprite format. The look is in [art/art-direction.md](../art/art-direction.md).

> **M1 subset.** M1 builds only the slice below (the M1 cut, [decisions.md D004](../decisions.md#d004--2026-11-08--m1-scope-the-m1-cut)). Everything else in this doc waits for its milestone. Task ids are in [tasks.md](../../tasks.md#m1--playable-vertical-slice).
>
> | Area | In M1 | Not yet |
> |---|---|---|
> | **Modules** | `shared`, `content`, `sim`, `render`, `ui`, `app`, `balance`, `tools/` | `story` (A1M1's briefing is a static string in map data), `meta` (no saves or currencies), `audio` |
> | **Content** (T111, T110, T105c) | `types.ts`, `define.ts`, `registry.ts`, `validate.ts`, `compile.ts`, `rules.ts`; towers `rivet`, `thumper`, `sprinkler` (tiers 1–3); enemies `nibbler`, `zoomer`, `chonk`; map `a1_m01`; ability `orbital_strike`. Sprinkler and Chonk are sim-tested but not placed on A1M1 | Tier-4 specs, links, medals, objectives, allies, companion (A1M1's `companion` is `null` until T207) |
> | **Sim systems** (T102, T103, T105a/b, T113) | `applyCommands`, `waves`, `triggers` (only `unlockTowerClass`, compiled from `towerUnlockWave`: Thumper unlocks when W3's countdown starts), `status` (Chilled only), `abilities` (Orbital Strike only; no enemy abilities), `movement`, `towers` (hitscan Rivet, lobbed lead-targeting Thumper, Sprinkler aura), `projectiles`, `cleanup` (win/lose). Plus `applyPending()`, `hash()`, and per-system RNG streams | Allies, hold fire, the spare-runners filter, links, jams, story stats beyond `skitterkinKilled` |
> | **Commands** | `build`, `upgrade`, `sell`, `targeting`, `ability` (slot 1), `callWave` | `specialize` (T202), `holdFire` and `spareRunners` (T206), `clear`, `interact`, `scriptInput` |
> | **Events** | `EnemySpawned`, `EnemyDied`, `EnemyLeaked`, `ProjectileFired`, `ProjectileHit`, `TowerBuilt`, `TowerUpgraded`, `TowerSold`, `TowerClassUnlocked`, `WaveStarted`, `WaveCleared`, `AbilityUsed`, `MapWon`, `MapLost`, `CommandRejected` | Every story-facing event |
> | **Render and UI** (T104, T112, T106, T115) | `BootScene`, `BattleScene`, sprite baker and gallery page, HUD, keyboard routing rule, Title and Results screens (the run's Pests Processed count; no medals) | Loadout, shop, dialogue, codex, star map |
> | **Harness** (T108a) | A1M1 has `requiredCounters: []`, so it has no no-counter builds. Its runs: do-nothing loses; par wins with its margin in band; a Rivet-only alt build (`altBuilds.rivet_only`) wins, with a lower margin than par; `alwaysCallEarly` stays at or under `min(band top, par margin + 10)`. Plus determinism, invariants, and runtime ([conventions.md § Balance sims](conventions.md#balance-sims-npm-run-sim)). A1M1's reference profile is `towers: ['rivet', 'thumper']` plus `technicianAbility: 'orbital_strike'`, with no specs, shop items, or protocols | No-counter builds and the full-catalog check (no map in M1 has a required counter), monotonic chain (one map), the ≥ 2 `altBuilds` rule (from A1M4), Story difficulty, jam limit, flag and companion variants, Hold Fire and `spareFleeing` variants, the full par-purchasable check (A1M1's profile has no purchases) |
> | **Smoke and hooks** (T101, T108b) | Boot, no console errors, every map boots, the M1 flow, the lose flow. `__sd`: `ready`, `state`, `enqueue`, `setSpeed`, `autoplay`, `fastForward`, `tileToClient`, `goto`, `perf` | M2+ flows |

---

## 1. Stack

| Tool | Version (Nov 2026) | Role |
|---|---|---|
| **Node** | ≥ 22.6 (22 is the Claude Code cloud default; 24 also fine) | Dev tooling. `tools/*.ts` run through Node's type stripping: native from 22.18, and the npm scripts pass `--experimental-strip-types` so any Node 22 works. `npm run sim` and the docs check rely on it. |
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
| `setPipeline('Light2D')` | `setLighting(true)` (we don't use Phaser lights; see [art-direction.md §7](../art/art-direction.md#7-vfx)). |

### Why TypeScript 7 plus oxlint (not typescript-eslint)

TypeScript 7.0 (July 2026) is the native compiler: same language, and roughly 10× faster type checks. It ships **no programmatic API yet**, so typescript-eslint can't run on it. oxlint's type-aware mode (`oxlint-tsgolint` v7, built on TS 7.0.2) covers almost all of typescript-eslint's type-aware rules and is much faster. Vite and Vitest only strip types and never call `tsc`, so they're unaffected.

**Fallback:** if a tool we need breaks on TS 7, pin `typescript@6.0` and switch to `typescript-eslint`. Record that as a decision.

---

## 2. The hard boundary: sim vs render

```
               ┌──────────────────────────── browser ────────────────────────────┐
               │                                                                 │
  input ─────▶ │  render/ (Phaser)      ui/ (Preact DOM)      story/   audio/     │
               │      │   ▲                 │    ▲              ▲         ▲       │
               │      │   │ read-only       │    │ view models  │ events  │ events│
               │      ▼   │ state           ▼    │              │         │       │
               │  ┌─────────────── app/ (host: loop, routing) ───────────────┐   │
               │  │   commands ──▶  sim.enqueue()     sim.step() × N         │   │
               │  │   events   ◀──  sim.drainEvents()                        │   │
               │  └──────────────────────────────────────────────────────────┘   │
               │                         sim/  (pure TS, deterministic)          │
               └─────────────────────────────────────────────────────────────────┘
```

**`src/sim/` is pure TypeScript.** It never imports Phaser, the DOM, `render/`, `ui/`, `audio/`, `meta/`, or `balance/`, and never uses `Date`, `Math.random`, `performance`, timers, or `localStorage`. This is enforced three ways:

1. **Separate tsconfig.** `tsconfig.pure.json` covers `src/sim`, `src/content`, `src/story`, `src/balance`, and `src/shared` with `"lib": ["ES2023"]` and `"types": []`. Any DOM global (`window`, `document`, `HTMLCanvasElement`) is a **type error** there.
2. **An architecture test** (`src/shared/architecture.test.ts`) scans the imports (static, re-export, dynamic `import()`, `require`) of every file in `src/` and fails on any edge the [allowed dependencies](#4-other-modules) forbid: pure modules may import no packages (only `vitest`, in tests) and only the modules they depend on; `render`, `ui`, and `audio` reach `sim` only through `sim/index.ts`. It also scans `src/sim/` (comments and strings excluded) for the banned `Math` members below, any `Math` use other than `Math.<member>` (so aliasing can't hide a ban), and the globals `Date`, `performance`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `localStorage`, and `globalThis`. This is the authoritative check.
3. **Lint** (`no-restricted-imports`, `no-restricted-properties`, and `no-restricted-globals` in `.oxlintrc.json`) gives fast editor feedback.

Rendering **reads** sim state and **sends commands**. It never mutates sim state.

### Determinism

- Same content + same map + same seed + same command list ⇒ the **same outcome**, on the same JS engine. That's what tests, balance sims, checkpoints, and reproducible bug reports need. Bit-exact results across browsers aren't a goal (there's no multiplayer or server replay).
- **Fixed timestep: 60 ticks per second.** `TICK_HZ = 60`. Sim time is an integer `tick` counter. Content is authored in seconds and tiles, and converted to ticks once at content compile time.
- **Seeded RNG:** `sfc32` (128-bit state, serializable) in `src/shared/rng.ts`. The sim derives one **stream per system** from the map seed (`rng.fork('spawn')`, `rng.fork('combat')`), so adding a random roll in one system doesn't shift every other system's results. Cosmetic randomness (particles, Hollow glitches, bark choice) uses separate render-side or story-side RNGs and **never** touches the sim's.
- Iteration order is always array order (entities are processed in ascending slot order). No `for…in` over objects, and no sorting without a deterministic tie-break.
- **Banned in `src/sim/`:** `Math.sin`, `Math.cos`, `Math.atan2`, `Math.pow`, and `Math.random` (lint rule plus the architecture test). Their results can differ between engines, and none is needed: use squared distances, precomputed polyline lengths, and `x * x`. Lead targeting solves along the route's `dist`, not with angles.

### Entity model: typed pools, not an ECS

We have about 5 entity kinds and at most a few hundred live entities. A generic ECS would be more machinery than it's worth. **The simplest thing that works:**

- One **typed pool per kind**: `towers`, `enemies` (including neutral units such as Gerald, flagged `neutral`), `projectiles`, `zones` (ground effects, ability areas, and song auras), and `allies`. Each pool is a preallocated array of plain objects with every field initialized (monomorphic shapes), plus a free list.
- **Allies** are every friendly non-tower unit ([design/maps.md §5.4](../design/maps.md#54-allies-on-the-map)). Each has an `allyKind` (`swarmling`, `leaper`, `refugee`, `bearer`, `singer`, `bricks`, `militia`, `ward`), a movement mode (`route`, `post`, `owner`, or `stationary`), an optional attack (Bricks and militia), an optional song aura (singers, bearers), and a **vulnerability**: `never` (swarmlings, leapers, militia, wards, Pebble, Old Thrum), `hush` (refugees, singers, bearers), or `scripted` (Bricks in A3M3: Hollow units stop at his post, but his health bar follows a per-wave timeline in map data, never the player's DPS). Enemies never target towers.
- **Ally targeting.** Ally attacks never target units whose wave group is tagged `quiet_wave`, `youngling`, or `fleeing` (the tags are in [§3](#data-shapes)).
- **Hushing:** a non-boss Hollow unit hushes at most one `fleeing` enemy or `hush` ally and turns Heavy. The fleeing and hush rules (tell, heal, speed, the Maw's gather) have one home, [design/enemies.md](../design/enemies.md) §5.4. In code, the victim is removed and the unit sets `hasHushed = true` so it can't hush again.
- Each entity has a `uid` (a monotonic integer, never reused within a run) and an `alive` flag. Dead slots return to the free list at the end of the tick.
- Entities hold a **direct reference to their compiled definition** (`def: CompiledEnemyDef`), resolved at spawn, so hot loops never look up string ids.
- Status effects ([design/enemies.md §2.4](../design/enemies.md#24-status-effects)) are **fixed fields** (`chillMul`, `chillTicks`, `soakedTicks`, `corrodedStacks`, `pinnedTicks`, `stasisTicks`, `stasisImmuneTicks`, `unnervedTicks`, `revealedTicks`, and on towers `jammedTicks` and `jamImmuneTicks`), not dynamic lists. Towers also carry `builtTick` and `firstFiredTick` for the misclick-grace refund ([design/core-loop.md §2.3](../design/core-loop.md#23-credits-the-in-map-currency)); for pulse and aura towers, `firstFiredTick` is the first pulse that affects an enemy. Each tower also has a `spareRunners` boolean (the targeting filter, [§ Commands](#commands-input-into-the-sim)).
- Enemies follow **predefined routes**. Map data gives ground paths and rift lanes as ordered tile sequences, and air lanes as polylines ([design/maps.md §4](../design/maps.md#4-paths-and-air-lanes)). Compile turns each into a polyline through tile centers with precomputed cumulative lengths. An enemy stores `pathIndex` and `dist` (distance traveled), and its position is derived from those. `dist` also gives "first / last" targeting and lead targeting (predict `dist + speed × flightTicks`) for free.
- Systems are **plain functions** `(state: SimState, ctx: TickContext) => void`, run in a fixed order:

| # | System | Does |
|---|---|---|
| 1 | `applyCommands` | Validates and applies queued player commands, FIFO. Rejections emit `CommandRejected`. |
| 2 | `waves` | Advances the wave schedule and spawns enemies |
| 3 | `triggers` | Evaluates map script triggers and objectives and executes their actions ([story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes)); emits `ScriptCue` and the other script events |
| 4 | `status` | Ticks status timers, DoTs, auras, detection (Revealed), darkness and light sources, and synergy links |
| 5 | `abilities` | Enemy ability state machines (telegraph → effect → cooldown), and commander ability cooldowns and effects |
| 6 | `movement` | Advances enemies along paths; leaks damage the core (or the escort meter) |
| 7 | `towers` | Targeting (including the spare-runners filter), cooldowns, firing, hold fire; `allies` (swarmling and leaper sorties, refugee, bearer, and choir movement, hushes, ally attacks, song auras) |
| 8 | `projectiles` | Movement, hits, damage, deaths, bounties |
| 9 | `cleanup` | Releases dead slots, resolves rest vs scatter for dead Hollow units (finale), updates story stats, and checks win/lose |

Win and lose conditions, economy, and every mechanic rule (damage pipeline, targeting tie-breaks, jam limits, beam armor per tick) are defined in [design/core-loop.md](../design/core-loop.md), [design/towers.md](../design/towers.md), and [design/enemies.md](../design/enemies.md). The sim implements them; it doesn't redefine them. The sim also records per-run **story stats** in `state.stats` for story and meta to read: `skitterkinKilled` (the run's Pests Processed: Skitterkin enemies killed by towers or abilities), `killsByEnemy`, `holdFireTicks`, `holdFireUses`, `ticksSinceFiredAtSkitterkin` (reset whenever a tower fires at a Skitterkin; frozen while none is in range), and, per wave **tag**, `tagSpawned` / `tagLeaked` / `tagKilled` ([design/core-loop.md §2.7](../design/core-loop.md#27-hold-fire)). It also tracks `medalExemptLeaks`, the meter (`evacuated`, `lost`, `voices`), and in the finale `restPoints`, `restTarget`, and `boreProgress`. All are integers.

If profiling ever shows object pools are too slow (unlikely below about 2,000 entities), convert a hot pool to struct-of-arrays (`Float32Array` columns) behind the same system functions.

### Commands (input into the sim)

Every player action is a **command**: a plain, serializable object in a discriminated union.

```ts
type Command =
  | { type: 'build';      tile: GridPos; tower: TowerId }
  | { type: 'upgrade';    towerUid: number }               // next tier
  | { type: 'specialize'; towerUid: number; spec: 'a' | 'b' }
  | { type: 'sell';       towerUid: number }
  | { type: 'targeting';  towerUid: number; mode: TargetPriority }
  | { type: 'holdFire';   target: number | 'all'; on: boolean }      // stop firing
  | { type: 'spareRunners'; target: number | 'all'; on: boolean }    // the targeting filter
  | { type: 'clear';      tile: GridPos }                  // send the salvage drone to a wreckage tile
  | { type: 'ability';    slot: 1 | 2; target?: GridPos }  // commander abilities
  | { type: 'callWave' }                                   // call the next wave early
  | { type: 'interact';   marker: MarkerId }               // click a clickable world object (the Peeker rock, A2M3)
  | { type: 'scriptInput'; id: string };                   // the forced single input (SEAL, "Who's there?")
```

- The host calls `sim.enqueue(cmd)`, and the command applies at the **start of the next tick**, or immediately through `sim.applyPending()` (below).
- `holdFire` (a tower uid or `'all'`) stops the tower attacking; it's the plain Hold Fire that C1 uses.
- `spareRunners` is the **"Spare runners" targeting filter** (from A2M1; the rules are in [design/core-loop.md](../design/core-loop.md) §2.6–2.7). With a tower uid it is the per-tower toggle. `'all'` is the global HUD toggle (hotkey Alt+H): it sets every tower's filter, and towers built while it's on start with it on. A tower with the filter on never *picks* a unit whose wave group has a tag in `SPARE_TAGS` (`fleeing`, `youngling`; `content/rules.ts`) as its primary target. Splash and chain hits still land on those units.
- `interact` is accepted only while the marker is clickable (a `setClickable` script action). It is the input half of the clickable-world-object trigger ([story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes)).
- The sim validates every command (affordability, a buildable and empty tile, a tower in the loadout, unlocked and not revoked, an ability off cooldown and not revoked). While a forced input is pending, **every command except the matching `scriptInput` is rejected** (`reason: 'forcedInput'`). Invalid commands emit `CommandRejected { cmd, reason }` so the UI can explain.
- The **command log plus the seed reproduces a run exactly.** The log records each command with the tick it applied at. The game keeps it in memory for checkpoints and so a bug report can include a replayable code (dev builds), and balance-sim builds are just scripted commands.
- **Optional bark buttons** ("Who's there?" in Act I) are not commands. They never change play, so they stay out of the sim and the command log; story handles them ([story-runtime.md § Barks](story-runtime.md#barks)).

### Events (output from the sim)

- During a tick, systems push typed events into `state.events`.
  - **Combat:** `EnemySpawned`, `EnemyDied`, `EnemyLeaked`, `ProjectileFired`, `ProjectileHit`, `TowerBuilt`, `TowerUpgraded`, `TowerSold`, `TowerJammed`, `HoldFireChanged`, `AbilityUsed`, `WaveStarted`, `WaveCleared`, `BossPhase`, `MapWon`, `MapLost`, `CommandRejected`, `CheckpointReached { wave }`.
  - **Story-facing:** `ScriptCue { cueId }`, `NotFiringAtSkitterkin` (once, when `ticksSinceFiredAtSkitterkin` crosses the threshold in `content/rules.ts`), `SkitterkinKilledAhead`, `Hushed { hollowUid, victim: 'enemy' | 'ally' }` (the Hollow unit turns Heavy), `RefugeeSaved`, `AllyHealthChanged`, `EnemyLaidToRest { uid, restValue }`, `EnemyScattered`, `EnemyReformed`, `BossEnded { how: 'driveOff' | 'retreat' | 'pivot' | 'layToRest' }`, `ObjectiveChanged`, `ObjectiveCompleted { id }`, `TowerClassUnlocked`, `TowerClassRevoked { tower, refund }`, `TowerClassRestored`, `AbilityRevoked`, `ClickableChanged { marker, on }`, `Interacted { marker, by: 'player' | 'fallback' }`, `ForcedInputRequested { id }`, `ForcedInputResolved { id }`, and `TimerProgress` (secondary timer, emitted on each whole percent).
- After each frame's ticks, the host calls `sim.drainEvents(out)` and dispatches the events to subscribers (render views, UI signals, story, audio) through the **typed event bus** in `src/shared/bus.ts` (a tiny `on/off/emit` emitter keyed by event `type`).
- **Inside the sim, systems communicate through state, not events.** Events are output only, which keeps the tick order explicit.
- Events are infrequent compared to per-entity work, so plain object events are fine. Per-entity, per-tick work must not allocate ([conventions.md § Performance](conventions.md#performance-rules)).

### Map scripts

Story moments that change play run **inside the sim** as map data (`MapDef.events`, evaluated by the `triggers` system), so headless runs, replays, and the balance harness see exactly what a player sees. The trigger and action unions, flags in the sim, forced input, revocation, clickable objects, and rest and scatter are specified in [story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes).

### Game speed, pause, and the host loop

The sim doesn't know about speed. The host (`src/app/host.ts`) drives it from Phaser's `update(time, delta)`:

```ts
const TICK_MS = 1000 / TICK_HZ;
const MAX_STEPS_PER_FRAME = 4;                   // per 1× of speed
const cap = MAX_STEPS_PER_FRAME * Math.max(speed, 1);
acc += Math.min(delta, 250) * speed;             // speed ∈ {0 (paused), 1, 2}
let steps = 0;
while (acc >= TICK_MS && steps < cap) {
  sim.step(); acc -= TICK_MS; steps++;
}
if (steps === cap) acc = 0;                      // drop backlog rather than spiral
if (speed === 0) sim.applyPending();             // build/upgrade/sell land while paused
sim.drainEvents(events); dispatch(events);
```

- Speeds are 1× and 2×, with 3× an open design question ([design/core-loop.md §2.8](../design/core-loop.md#28-speed-and-pause)). The loop handles any integer speed; 2× is two ticks per 16.7 ms of accumulated time, not a bigger timestep. Pause sets speed to 0. Full-screen dialogue scenes pause; build-phase barks don't ([story/style-guide.md](../story/style-guide.md)).
- **`sim.applyPending()`** is a zero-time, command-only step: it runs `applyCommands` on the queue without advancing `tick` or any other system. Applying commands at the end of tick *T* is identical to applying them at the start of tick *T + 1* (`applyCommands` runs first), so the command log stays replayable without knowing whether the game was paused.
- Rendering shows the latest tick's state with no interpolation. (At 60 Hz ticks this is smooth enough for pixel art; interpolation can be added later if 120 Hz+ displays look juddery.)

### Checkpoints

"Retry from wave N" ([design/core-loop.md](../design/core-loop.md) §2.12) needs no state serialization. A **checkpoint** is `{ wave, tick, commandCount }`, recorded by the host when the sim emits `CheckpointReached` (every 5 waves from Act II, per `content/rules.ts`; the finale also emits it at the start of Phase 2 through a `checkpoint` script action). Retrying re-creates the sim from the same `SimConfig`, replays the first `commandCount` logged commands headlessly up to `tick`, then hands the sim back to the host. Replay at uncapped speed costs the same as a headless run (well under 2 s even for the finale). Checkpoints live in memory for the current run only. Using one marks the run result `usedCheckpoint` (which forfeits Perfect and Challenge medals) and records `resumedFromWave`, which the defeat payout uses ([meta-runtime.md § Run end](meta-runtime.md#run-end)).

### Sim public API

```ts
// src/sim/index.ts
export function createSim(cfg: SimConfig): Sim;
interface SimConfig {
  content: CompiledContent; mapId: MapId; seed: number;
  loadout: TowerId[];                 // ≤ 4 (hard rule); never contains a revoked class
  companion: CompanionId | null;      // resolved from MapDef.companion (a pick list is resolved before the map)
  modifiers: Modifier[];              // from permanent upgrades, difficulty, veteran mods
  difficulty: DifficultyId;
  abilities: { slot1: AbilityId | null; slot2: AbilityId | null; slot2State: 'present' | 'absent' | 'none' };
  scriptFlags: ScriptFlags;           // story flags that map scripts read (story-runtime.md § Map scripts)
}
interface Sim {
  readonly state: DeepReadonly<SimState>;
  enqueue(cmd: Command): void;
  step(): void;                       // one 60 Hz tick
  applyPending(): void;               // zero-time, command-only step (works while paused)
  drainEvents(out: SimEvent[]): void;
  hash(): string;                     // FNV-1a over key state, for determinism checks
}
// src/sim/headless.ts
export function runHeadless(cfg: SimConfig, build: ScriptedBuild, opts?: HeadlessOptions): HeadlessResult;
```

- **`runHeadless`** runs one map to the end with no frame cap, issuing the build's steps through the scripted-build executor ([conventions.md § Balance sims](conventions.md#balance-sims-npm-run-sim)). It takes a ready `SimConfig`; it never imports `meta/`.
- **The sim knows nothing about meta progression.** Permanent upgrades, Field Protocols, and difficulty arrive as a list of `Modifier`s. In the game, `app/` gets them from `meta/`. In the harness, `src/balance/profile.ts` composes a map's `referenceProfile` into modifiers through the same pure `meta/modifiers.ts` functions the game uses. For M1, A1M1's profile is empty, so its modifier list is empty.

**Modifiers follow the design's stacking formula** ([design/towers.md §4](../design/towers.md#4-stat-modifiers-and-stacking)): `stat_final = (stat_tier + Σ flat) × (1 + Σ pct)`, with percentages **added, never multiplied**, and per-stat caps on the total percentage.

```ts
type Modifier =
  | { kind: 'towerStat'; tower: TowerId | '*'; stat: TowerStat; flat?: number; pct?: number; source: ModifierSource }
  | { kind: 'enemyStat'; stat: EnemyStat; pct: number; source: ModifierSource }   // e.g. Story difficulty −30% HP
  | { kind: 'economy';   stat: 'startCredits' | 'coreIntegrity' | …; flat?: number; pct?: number; source: ModifierSource };
// pct is a fraction: +10% → 0.10
```

- Static modifiers (shop, protocols, difficulty) are folded into each tower's **base stat block** when the tower is built or upgraded.
- Dynamic sources (synergy links, auras, adjacency aura kinds such as Overclock and Lookout, high ground, power nodes, darkness) are summed into per-tower `flatBonus[stat]` and `pctBonus[stat]` slots, which are recomputed only when something changes: a tower is built, upgraded, sold, or jammed, a jam expires, or the lighting changes. They're never recomputed per tick.
- The final stat is computed once from the summed bonuses, with the cap applied to the summed percentage. Same-kind auras take the strongest value, not the sum, and an aura tower is not covered by its own aura. Caps and aura kinds are data in `content/rules.ts`, not hard-coded.
- **Darkness** that affects play (A2M6 Sundown onward) is sim state set by the `setLighting` script action: a range penalty on towers outside every light source. A tower def's `lightRadiusTiles` (Prism Spire's beam) makes a light source, so nearby towers keep full range. Render draws the same sources as light stamps ([art-direction.md §7](../art/art-direction.md#7-vfx)).

---

## 3. Content (`src/content/`)

**Content is data**: typed TypeScript files, one entity per file, with explicit registries (no `import.meta.glob`, so the same files load in Vite, Vitest, and plain Node).

| Folder | Holds |
|---|---|
| `towers/` | Tower definitions: cost, tiers 1–3, two tier-4 specializations, attack behavior, sprite ids |
| `enemies/` | Enemy definitions: HP, speed, bounty, abilities, tell ids, sprite ids |
| `abilities/` | Commander ability definitions (Orbital Strike, Suppressing Fire, companion abilities) |
| `maps/<id>/` | One folder per map: `map.ts` (tiles, paths, air and rift lanes, markers, objective, credits, events, environment palette), `waves.ts`, `builds.ts` (`referenceProfile`, `parBuild`, `noCounterBuilds`, `altBuilds`, variants, guards), and `index.ts` composing them into one `MapDef` |
| `upgrades/` | Permanent upgrades (shop and R&D) as modifiers, each with `availableAfter` |
| `dialogue/` | `flags.ts`, `speakers.ts`, `scenes/<act>/`, `barks/<trigger>.ts`, `memos/` (Everglow Inbox), `epilogue/`, `tips.ts`, `results.ts`, `bricks_tags.ts` ([story-runtime.md](story-runtime.md)) |
| `codex/` | Codex entries, each with `original` / `annotated` / `corrected` versions and their unlock conditions |
| `presentation.ts` | The per-act presentation dials ([design/core-loop.md §6.7](../design/core-loop.md#67-per-act-presentation-dials)), with per-map overrides in map data |
| `campaign.ts` | Campaign map order (mirrors [story/campaign.md](../story/campaign.md)) |
| `rules.ts` | Rule data: damage matrix, stacking caps, aura kinds, jam limits, the speed rule, counter categories, the trait → counter-category map (canonical table: [design/enemies.md](../design/enemies.md) §3; intel-only traits map to no category), which towers answer each category, `SPARE_TAGS`, checkpoint interval, bark thresholds |
| `sprites/`, `palettes/` | Pixel art data ([art/tech-spec.md §2](../art/tech-spec.md#2-code-generated-pixel-art-format)) |
| `types.ts`, `define.ts` | Definition types plus `defineTower()`, `defineEnemy()`, and similar identity helpers that give type inference |
| `registry.ts` | Imports every registry and exports `RAW_CONTENT` |
| `validate.ts` | Cross-reference, range, and design-rule validation (below) |
| `compile.ts` | Resolves ids to references, converts seconds to ticks, compiles `towerUnlockWave` into script events, and freezes the result into `CompiledContent` |

- **Ids** are `snake_case` strings, unique per kind. Id union types are derived from the registries (`type TowerId = keyof typeof TOWERS`), so a typo in a wave file is a compile error.
- **Exact numbers live in content files.** Design docs hold intent, roles, and target ranges, and link to the content file rather than copying its numbers.
- TS types check shape at compile time; `validate()` checks what types can't (cross-references, ranges, grid geometry, design rules). No schema library is needed, because content is TS, not JSON. Untrusted input (save import) gets its own validator in `meta/`.

### Data shapes

**This section is the canonical type sketch** until `src/content/types.ts` exists (T111); then the code is the home and this section shrinks to a link. Design docs link here instead of keeping their own sketches. Units are in field names ([conventions.md § TypeScript style](conventions.md#typescript-style)); content is authored in seconds and tiles.

```ts
type GridPos = [col: number, row: number];
type TileKey = `${number},${number}`;               // "col,row"
type TargetPriority = 'first' | 'last' | 'strong' | 'close';
type DamageType = 'kinetic' | 'explosive' | 'energy' | 'psionic';
type WaveTag = 'quiet_wave' | 'youngling' | 'fleeing' | 'medal_exempt' | string;  // allies never target the first three
type CounterId = 'splash' | 'armor' | 'air' | 'shield' | 'detection' | …;     // listed in content/rules.ts

interface TowerDef {
  id: TowerId;                                      // 'rivet'
  faction: 'everglow' | 'vrell' | 'aelari' | 'skitterkin';
  role: string;                                     // display only
  targets: { ground: boolean; air: boolean };
  defaultPriority: TargetPriority | null;           // null: the tower doesn't attack
  sprites: { base: SpriteId; head?: SpriteId; icon: SpriteId };
  tiers: [TierDef, TierPatch, TierPatch];           // T1 in full; T2 and T3 patch the previous tier
  specs: { a: SpecDef; b: SpecDef };                // tier 4; one R&D purchase unlocks both
  links: LinkId[];                                  // link effects live in the links table
  lightRadiusTiles?: number;                        // a light source under darkness (Prism Spire)
}
interface TierDef { cost: number; attack?: AttackDef; effects?: EffectDef[]; auras?: AuraDef[] }
type TierPatch = { cost: number } & DeepPartial<Omit<TierDef, 'cost'>>;
interface SpecDef extends TierPatch { name: string }
type AttackDef = { type: DamageType; damage: number; ratePerSec: number; rangeTiles: number;
                   minRangeTiles?: number /* exclusive: hits only at distance > min */ } & (
  | { kind: 'hitscan'; pierce?: number }                                       // Rivet
  | { kind: 'projectile'; projectile: ProjectileId; speedTilesPerSec: number }
  | { kind: 'lobbed'; projectile: ProjectileId; flightSec: number; splashTiles: number; lead: boolean }  // Thumper
  | { kind: 'beam'; tickSec: number }               // non-DoT: armor applies per tick (design/enemies.md §2.3)
  | { kind: 'chain'; jumps: number; jumpRangeTiles: number; falloffPct: number }
  | { kind: 'spawner'; ally: AllyKind; maxAlive: number });
// AuraDef: { kind: AuraKind; radiusTiles; stat or status; pct }; same-kind auras don't stack

interface EnemyDef {
  id: EnemyId;
  faction: 'skitterkin' | 'aelari' | 'everglow' | 'hollow';
  body: 'organic' | 'crystalline' | 'mechanical' | 'void';
  layer: 'ground' | 'air';
  hp: number; armor: number; shield?: { hp: number; regenPerSec: number; regenDelaySec: number };
  speedTilesPerSec: number; leak: number; bounty: number;
  traits: Trait[]; abilities: AbilityRef[]; tells: TellId[];
  restValue?: number;                               // finale; default 1
  boss?: BossDef;                                   // phases and scripted endings (design/enemies.md §6.1)
  sprites: { body: SpriteId; icon: SpriteId };
}

interface WaveDef {
  countdownSec?: number;                            // defaults by act
  teach?: boolean;                                  // the teach wave for a new trait: exempt from the soft-trait cap
  groups: WaveGroup[];
}
interface WaveGroup {
  enemy: EnemyId; count: number; intervalSec: number; delaySec?: number;
  spawn: string; route: string;                     // a path, air-lane, or rift-lane id
  tags?: WaveTag[];                                 // fleeing: leak 0, medal-exempt (design/enemies.md §5.4)
  teach?: boolean;                                  // a teach group inside a mixed wave: only its threat is exempt
}

interface MapDef {
  id: MapId; act: 1 | 2 | 3 | 'finale' | 'challenge' | 'endless'; env: EnvPaletteId;
  size: { cols: number; rows: number };
  tiles: string[];                                  // one string per row; legend in design/maps.md §3
  underWreckage?: Record<TileKey, TileChar>; salvage?: Record<TileKey, number>;
  paths: { id: string; tiles: GridPos[] }[];
  airLanes?: { id: string; points: GridPos[] }[];
  riftLanes?: { id: string; tiles: GridPos[]; opensAtWave: number }[];
  markers?: Record<MarkerId, GridPos>;              // named decor positions: 'peeker' (the Peeker rock), exits, wreckage sites
  objective: ObjectiveKind;                         // 'defend' | 'escort' | 'holdout' | 'protect' | 'choir'; a script may pivot it
  meterLabel?: MeterLabel;                          // 'integrity' | 'evacuated' | 'sheltered' | 'voices'
  maxLost?: number; minVoices?: number; evacuatedFloor?: number;
  startCredits: number; coreIntegrity?: number;     // default 20
  stardust: number;                                 // first-clear reward (flat; A1M1 pays 0)
  briefing?: string;                                // M1 only: the static briefing before story/ exists
  towerUnlockWave?: Partial<Record<TowerId, number>>;  // the build button unlocks when that wave's countdown starts
  threatIntel: Trait[];                             // every trait in the waves; shown as icons
  requiredCounters: CounterId[];                    // ≤ 3; each backed by a noCounterBuild that must lose
  waves: WaveDef[];
  medals?: { challenge: { id: MedalId; condition: ConditionDef } }; // required on campaign maps from T202 (§ Validation)
  objectives?: { id: string; condition: ConditionDef; intel: number; onComplete?: ScriptAction[] }[];
  companion: { id: CompanionId; state: 'present' | 'absent' } | { pick: CompanionId[] } | null;
  lockedAbilities?: { ability: AbilityId; when: Condition }[];  // unequippable here (A3M5: system_reboot under quill_choice = rewrite)
  allies?: AllyPlacement[];                         // posts, groups, routes; Bricks's A3M3 health timeline
  revisitOf?: MapId;                                // reuses that map's layout, centred (design/maps.md §7)
  dressing?: { layer: string; when?: Condition }[]; // state-dependent dressing (story Condition)
  presentation?: Partial<PresentationDials>;
  events?: ScriptedEvent[];                         // { id, on, when?, actions[] }; story-runtime.md § Map scripts
  song?: SongDef;                                   // finale only (design/maps.md §5.5)
  // builds.ts
  referenceProfile: ProfileDef;
  parBuild: ScriptedBuild;
  noCounterBuilds: Partial<Record<CounterId, ScriptedBuild>>;  // keys = requiredCounters
  altBuilds?: Record<string, ScriptedBuild>;        // ≥ 2 from A1M4
  flagVariants?: Partial<{ [F in ScriptFlagId]: FlagValue<F>[] }>;
  guards?: Record<string, { policy: PolicyId; expect: 'lose' | { maxMarginPct: number } }>;
}

// Medal and objective conditions: one grammar, evaluated by the sim over run state.
type ConditionDef =
  | { stat: RunStat; gte?: number; lte?: number }   // integrityLost, towersBuilt, creditsSpent, abilityUses, …
  | { towers: { tower?: TowerId; faction?: TowerFaction }; gte?: number; lte?: number }
  | { linkActive: LinkId }                          // evaluated at the moment of victory when used by a medal
  | { tagRatio: { tag: WaveTag; of: 'leaked' | 'killed'; gte: number } }
  | { flag: ScriptFlagId; eq: FlagValue }           // reads SimConfig.scriptFlags
  | { all: ConditionDef[] } | { any: ConditionDef[] } | { not: ConditionDef };

interface ProfileDef {                              // what a Standard player owns here (design/progression.md §10)
  towers: TowerId[]; specs: TowerId[];              // specs: towers whose tier-4 pair is unlocked
  shop: Partial<Record<UpgradeId, number>>; protocols: ProtocolId[];
  technicianAbility: AbilityId | null;
}
interface ScriptedBuild { loadout: TowerId[]; companion?: CompanionId; technicianAbility?: AbilityId;  // default: the profile's
                          callEarly?: boolean; steps: BuildStep[] }
// BuildStep kinds and their semantics: conventions.md § Balance sims
```

### Validation

`compileContent(RAW_CONTENT)` runs `validate()` first. In dev builds a failure throws with a full error list. **`src/content/content.test.ts`** runs the same validation in `npm test` (the schema test). The design rules it checks are owned by the linked design docs; this list is what the code checks.

- **References and ranges:** every referenced id exists, numeric ranges are sane, sprite grids are well-formed, palette colors exist in the master palette, and Hollow-reserved hues aren't used elsewhere.
- **Geometry** ([design/maps.md §9](../design/maps.md#9-map-data-shape-for-implementers)): ground paths lie on path tiles (air and rift lanes are exempt) and never cross buildable tiles; every path connects a spawn to the core or a safe exit; every wave group can walk its route; markers and script tile changes (crash-site wreckage) sit on predefined decor tiles; `cols + rows ≤ 36` for campaign maps. A revisit keeps the original's pads unchanged, adds pads only in the added band, and centres the original layout.
- **Threats** ([design/maps.md §6.3](../design/maps.md#63-one-new-thing-per-map)): `threatIntel` equals the set of traits in the waves; every trait has an entry in the `rules.ts` trait → counter-category map (a category, or intel-only); `requiredCounters` has at most 3 entries, each with a `noCounterBuilds` entry.
  - **Soft-trait share** (the threat formula in [design/maps.md §6.2](../design/maps.md#62-threat-budget-planning-tool); the trait map in [design/enemies.md](../design/enemies.md) §3): an enemy is **soft** if at least one of its traits maps to a counter category and none maps to one of the map's `requiredCounters`. Intel-only traits never make an enemy soft. Soft enemies are at most 15% of any wave's threat. `fleeing` units count as 0 threat, and a `teach` wave (or `teach` group) is exempt, at most one per new trait.
  - **New-thing limits:** at most two new threats and at most one new required-counter category per map, counted by the design's rules (an enemy with its new trait is one threat; a boss built only from known mechanics is exempt; a scripted event is one).
- **Builds:** tiles are buildable, towers are in the loadout and the profile, upgrade targets have been built by then, and loadouts have at most 4 towers. **Par is purchasable:** every tower, spec, upgrade, protocol, and ability in `referenceProfile` is available by that map (`availableAfter`) and its total Stardust and Intel price is within what the campaign pays out before that map ([design/progression.md](../design/progression.md)). From A1M4, there are at least 2 `altBuilds`, each sharing at most 2 tower types with the par loadout. **Counter builds** (by category, [design/maps.md](../design/maps.md) §6): `noCounterBuilds[c]` uses no tower that answers category `c` (the `rules.ts` answer list), and every alt build includes an answer to every required counter, so no alt build is a no-counter build. A build's `technicianAbility` is never one of the map's `lockedAbilities` under that build's flag variant.
- **Scripts and story:** cue ids follow `<map_id>_wNN` (or another `<map_id>_<slot>` from [story/style-guide.md](../story/style-guide.md)); every flag a script reads has a `flagVariants` entry when it changes the sim; medal conditions don't reference medal-exempt groups. **Medals:** `medals.challenge` is required on every campaign map from T202 (M1 maps have none). The dialogue rules are in [story-runtime.md § Validation](story-runtime.md#validation).

---

## 4. Other modules

| Module | Purity | Responsibility |
|---|---|---|
| `src/shared/` | pure | RNG, typed event bus, hashing, small math, `DeepReadonly`, id helpers, the architecture test |
| `src/sim/` | pure | The simulation (§2), including `runHeadless()` and the scripted-build executor |
| `src/content/` | pure | Game data, validation, compilation (§3) |
| `src/story/` | pure | Dialogue runner, story flags, bark selection ([story-runtime.md](story-runtime.md)) |
| `src/meta/` | logic pure, I/O via adapters | Saves, progression, shop and R&D, medals, profile → modifiers ([meta-runtime.md](meta-runtime.md)) |
| `src/balance/` | pure | The balance harness: reference profile → `SimConfig` (through `meta/modifiers.ts`), built-in policies, and assertions. `tools/sim.ts` is its CLI |
| `src/render/` | browser + Phaser | Phaser scenes, views, sprite baking, VFX, input |
| `src/ui/` | browser + Preact | DOM overlay: HUD, menus, loadout, shop, dialogue, codex |
| `src/audio/` | browser (WebAudio) | Procedural chiptune SFX and music (M2+) |
| `src/app/` | browser | Composition root: boot, screen routing, the host loop, checkpoints, keyboard routing, settings, logging, test hooks |

**Allowed dependencies** (arrows point at what a module may import):

```
shared ◀── content ◀── sim ◀──────┐
   ▲          ▲  ▲      ▲  ▲      │
   │          │  └─ story  │      │
   │          └──── meta ◀─┴─ balance
   └── render, ui, audio ─────────┘   (read sim types and state; never sim internals)
app ──▶ everything except balance
```

`render`, `ui`, and `audio` import from `sim` only through `src/sim/index.ts` (types, `Command`, `SimEvent`, read-only state). They don't import each other, except that `ui` may use the `render/sprites` canvases for portraits and icons. `sim` never imports `meta` or `balance`; profile-to-modifier composition happens in `balance` (harness) and `app` (game).

### Rendering

Lives in `src/render/`.

- **Phaser config:** `type: Phaser.WEBGL`, `width: 640`, `height: 360`, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `backgroundColor: '#05030a'`, `scale.mode: NONE`. `render/scale.ts` computes the integer zoom on resize (formula in [art/tech-spec.md § Tile and screen](../art/tech-spec.md#tile-and-screen)) and applies it to the canvas and to the UI root (`--ui-scale`).
- **Scenes:** `BootScene` (compile content, bake sprites, load fonts), `BattleScene` (the playfield), `StarMapScene` (M3), `BackdropScene` (animated backgrounds behind DOM menus).
- **Views:** pooled `EnemyView`, `TowerView`, `ProjectileView`, and `FxView` objects, keyed by sim `uid`, created and released in response to sim events and positioned each frame from sim state through `render/iso.ts`. Layers and depth rules are in [art/tech-spec.md § Depth sorting](../art/tech-spec.md#depth-sorting).
- **Sprites:** `render/sprites/` (rasterize, atlas, `SpriteSource`); see [art/tech-spec.md §2](../art/tech-spec.md#2-code-generated-pixel-art-format).
- **Input:** `render/input/` turns pointer input on the canvas into *intents* (select tile, place, cancel, click a clickable marker), then into `Command`s. Nothing is hover-only, so touch can be added later. Keyboard input goes through `app/`'s router (below).

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
- **Keyboard routing** (one `keydown` listener in `app/`, so the rule lives in one place): game hotkeys ([design/core-loop.md §4](../design/core-loop.md#4-controls-desktop-first)) are ignored while focus is in a text input or textarea. When focus is on a button, **Space and 1–4 go to the game hotkey** (the handler calls `preventDefault()` so the button doesn't also activate), unless a modal is open, in which case the modal keeps them. Enter always activates the focused button.
- Images (portraits, icons) are canvases from the sprite baker with `image-rendering: pixelated`.
- The style is defined in [art-direction.md §9](../art/art-direction.md#9-ui-style), including act themes as CSS variables.
- **Story UI states** the HUD must support: the forced-input overlay (one live button, everything else inert, settings still reachable), optional bark buttons (non-blocking; the game keeps running), the companion slot's `present` / `absent` (dark portrait, no label) / hidden states, the callsign name plate, the preview's "ACCESS RESTRICTED" state, REVOKED stamps on loadout and ability slots, held medal toasts (A3M3), the finale countdown counter and Deep Bore bar, and the codex's side-by-side Field Journal view.

### Audio (`src/audio/`, M2+)

WebAudio synthesis of SFX (square, triangle, and noise voices with envelopes) and layered music (D001 #9). It subscribes to sim and app events through the bus, has master, music, and SFX gain nodes, and unlocks the `AudioContext` on the first user gesture. It never blocks the sim.

**"Everglow Bright" variants.** The campaign's motif is one six-note phrase (and its couplet) in seven arrangements ([story/bible.md §8](../story/bible.md#8-recurring-motifs)). Each is a named cue in `audio/music.ts`, chosen by the presentation dials or by a script cue, never hard-coded per map:

| Cue id | Arrangement | Used |
|---|---|---|
| `bright_sting` | Upbeat corporate wave-clear sting (the six notes); the full couplet on the PA at shift change | Act I `WaveCleared` |
| `bright_minor` | The same sting with minor-key bridges, then fully in minor from A2M4 | Act II `WaveCleared` |
| `hollow_hum` | Hummed off-key, out of tune, half backwards; drops in near Hollow units while other music ducks | Acts II–III, Hollow proximity |
| `leaving_hum` | Hummed slowly by one small voice (Pebble), then a second (Thrum, if spared) | A3M1 scene |
| `door_hum` | Hummed by Bricks over the radio, with Pebble humming along; loops while the SEAL waits | A3M3 SEAL |
| `choir_hymn` | Sung by the choir as a hymn, swelling with the number of voices; "clearing the way!" shouted | Finale Phase 2 |
| `dawn_major` | Major-key reprise, many voices | Finale Phase 3, credits |

In Act III there is **no wave-clear sting** (the jingle stops playing). The Hum Choir tower's harmony line carries the same phrase whenever a Choir is built ([design/towers.md](../design/towers.md#skitterkin-towers)).

---

## 5. Build, test, and deploy

The npm scripts that make up the test loop (D002) are defined here. **What each one checks and how to use them is in [conventions.md § The test loop](conventions.md#the-test-loop).**

| Script | Runs |
|---|---|
| `dev` | `vite`: dev server with HMR |
| `build` | `vite build` to `dist/` |
| `preview` | `vite preview --port 4173 --strictPort`: serves `dist/` |
| `typecheck` | `tsc -p tsconfig.pure.json --noEmit && tsc -p tsconfig.app.json --noEmit && tsc -p tsconfig.node.json --noEmit` |
| `lint` | `oxlint --type-aware && prettier --check .` |
| `format` | `prettier --write .` |
| `format:check` | `prettier --check .` (the formatting half of `lint`) |
| `test` | `vitest run`: unit, sim, content, save, balance-harness, and architecture tests |
| `test:watch` | `vitest` |
| `sim` | `node --experimental-strip-types tools/sim.ts`: headless balance sims for every map (args: `--map <id>`, `--seeds <n>`, `--build <name>`, `--report`) |
| `smoke` | `playwright test --trace off`: browser smoke tests against `npm run preview` |
| `check:docs` | `node --experimental-strip-types tools/check-docs.ts`: link and docs-index checks |
| `check` | **The whole gate:** `typecheck && lint && test && build && sim && smoke && check:docs` |
| `check:fast` | `typecheck && lint && test` (inner dev loop only, never the gate) |

From T101, `sim` and `smoke` exist as passing stubs ("0 maps") so the gate runs end to end before any map does.

`package.json` sets `"type": "module"` and `"engines": { "node": ">=22.6" }`.

**Config files:**
- `tsconfig.base.json`: shared strict options.
- `tsconfig.pure.json`: the pure modules, no DOM lib.
- `tsconfig.app.json`: the browser modules, with the DOM lib and Preact JSX (`"jsx": "react-jsx"`, `"jsxImportSource": "preact"`).
- `tsconfig.node.json`: Node-side code with `"types": ["node"]`: `tools/`, `smoke/`, `vite.config.ts`, `playwright.config.ts`, and `src/shared/architecture.test.ts` (it reads files with `node:fs`).
- `tsconfig.json`: a solution-style root (`"files": []` plus references to the three projects) for editors and oxlint's type-aware mode. `typecheck` runs the three projects directly.
- `vite.config.ts` (with `base: './'` so the build works from any subpath, JSX through Vite's `oxc` option with `importSource: 'preact'`, and Vitest config inline), `playwright.config.ts`, `.oxlintrc.json`, `.prettierrc.json` (with `.prettierignore`: Markdown is hand-formatted and not run through Prettier), `.editorconfig`.
- **Playwright's browser:** `playwright.config.ts` launches `CHROME_PATH` when it's set (Claude Code cloud sessions, where the preinstalled Chromium doesn't match the pinned Playwright's revision, so never run `playwright install` there), and otherwise Playwright's own Chromium (CI installs it). It passes `--use-angle=swiftshader --enable-unsafe-swiftshader` so headless WebGL always uses SwiftShader. Smoke runs always pass `--trace off`.

**Imports use relative paths with explicit `.ts` extensions** (`allowImportingTsExtensions`), and there are no path aliases. That lets the pure modules run unchanged in Vite, Vitest, and plain Node (`tools/sim.ts`), with no loader or alias config to keep in sync.

**Bundle:** Phaser goes in its own vendor chunk. Budgets: initial JS ≤ 1 MB gzipped, boot (compile content and bake sprites) ≤ 300 ms on a mid-range laptop.

### Deploy to GitHub Pages (once a remote exists, D001 #10)

1. Add `.github/workflows/deploy.yml`, triggered on push of tags `m*` (and manual dispatch): `npm ci`, `npx playwright install --with-deps chromium`, `npm run check`, then `actions/upload-pages-artifact` with `dist/` and `actions/deploy-pages`.
2. Enable Pages with source "GitHub Actions". With `base: './'` the site works at `https://<user>.github.io/stardust/` without config changes.
3. Saves are per-origin localStorage, so moving the host later orphans saves unless players use export/import. Document that in the release notes when it happens.

---

## 6. Directory tree

```
stardust/
├── index.html                  # #game canvas host + #ui overlay root
├── package.json
├── tsconfig.json  tsconfig.base.json  tsconfig.pure.json  tsconfig.app.json  tsconfig.node.json
├── vite.config.ts      playwright.config.ts
├── .oxlintrc.json      .prettierrc.json    .prettierignore    .editorconfig
├── tools/
│   ├── sim.ts                  # npm run sim: CLI over src/balance/
│   └── check-docs.ts           # npm run check:docs
├── smoke/                      # Playwright specs (*.spec.ts); fixtures.ts (console-error fixture), allowedConsole.ts, hooks.ts (__sd helpers)
├── docs/ … CLAUDE.md  tasks.md
└── src/
    ├── main.ts                 # entry: calls app/boot
    ├── app/                    # composition root
    │   ├── boot.ts  host.ts  router.ts  commands.ts  keys.ts  checkpoints.ts
    │   ├── settings.ts  log.ts  testHooks.ts    # log.ts: the only console user in src/
    │   ├── testHookTypes.ts    # the __sd shape, DOM-free so smoke specs can import it
    ├── shared/                 # pure utilities
    │   ├── rng.ts  bus.ts  hash.ts  math.ts  types.ts
    │   └── architecture.test.ts
    ├── sim/                    # pure, deterministic
    │   ├── index.ts            # public API
    │   ├── state.ts  constants.ts  commands.ts  events.ts  pool.ts  path.ts  grid.ts
    │   ├── tick.ts             # system order
    │   ├── systems/            # applyCommands, waves, triggers, status, abilities, movement, towers, projectiles, cleanup
    │   ├── behaviors/          # tower attack kinds (hitscan, projectile, lobbed, beam, chain, aura, spawner)
    │   ├── abilities/          # enemy ability kinds (blink, burrow, gather, jam, hush, …) and commander abilities
    │   └── headless.ts         # runHeadless() and the scripted-build executor
    ├── content/                # pure data
    │   ├── types.ts  define.ts  registry.ts  validate.ts  compile.ts  content.test.ts
    │   ├── towers/  enemies/  abilities/  maps/<id>/  upgrades/  codex/
    │   ├── rules.ts            # rule data: damage matrix, stacking caps, aura kinds, jam limits, counters
    │   ├── presentation.ts     # per-act presentation dials
    │   ├── campaign.ts         # campaign map order (mirrors story/campaign.md)
    │   ├── dialogue/           # flags.ts speakers.ts types.ts scenes/ barks/ memos/ epilogue/ tips.ts results.ts bricks_tags.ts
    │   ├── palettes/           # master.ts, factions.ts, env.ts
    │   └── sprites/            # defineSprite.ts, index.ts, towers/ enemies/ projectiles/ props/ tiles/ icons/ portraits/ ui/
    ├── story/                  # pure: runner.ts conditions.ts flags.ts barks.ts text.ts counter.ts codex.ts inbox.ts epilogue.ts presentation.ts tags.ts
    ├── meta/                   # save.ts, migrations.ts, codec.ts, store.ts, progression.ts, modifiers.ts, shop.ts, __fixtures__/
    ├── balance/                # pure: profile.ts (profile → SimConfig), policies.ts, assertions.ts, report.ts
    ├── render/
    │   ├── scale.ts  iso.ts  depth.ts  layers.ts
    │   ├── scenes/             # BootScene, BattleScene, StarMapScene, BackdropScene
    │   ├── views/              # pooled EnemyView, TowerView, ProjectileView, FxView
    │   ├── sprites/            # rasterize.ts (pure), atlas.ts, SpriteSource.ts, CodeSpriteSource.ts
    │   ├── vfx/                # particles, glow, bloom, lighting overlay, range rings
    │   └── input/              # pointer → intents → commands
    ├── ui/
    │   ├── theme.css           # tokens from the master palette, act themes
    │   ├── state.ts            # signals / view models
    │   ├── Overlay.tsx         # overlay root: mountUi() and the current screen
    │   ├── components/         # Panel, Button, Icon, Portrait, …
    │   ├── hud/                # TopBar, BuildBar, TowerPanel, BossBar
    │   └── screens/            # Title, Loadout, Shop, Codex, Dialogue, Results, Settings
    └── audio/                  # M2+: synth.ts, sfx.ts, music.ts
```

Unit tests sit next to their source as `*.test.ts`.

---

## Open questions

1. **Mid-map saves.** Checkpoints (§2) live in memory, so closing the tab mid-map loses the run. Persist the latest checkpoint (seed, config, and command log prefix) to the save if maps grow longer than about 15 minutes (the finale may: [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules))?
2. **Visual regression.** Smoke tests capture screenshots but don't diff them. Turn on Playwright `toHaveScreenshot` once the art stabilizes (M3+)?
3. **TypeScript 7 tooling.** If oxlint's type-aware rules (including `no-restricted-properties` for the banned `Math` members) or editor tooling prove immature, fall back to TS 6 plus typescript-eslint (§1). The architecture test covers the determinism ban either way.
