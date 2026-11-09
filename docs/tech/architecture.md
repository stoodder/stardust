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
> | **Modules** | `shared`, `content`, `sim`, `render`, `ui`, `app`, `balance`, `tools/` | `story` (A1M1's briefing is a static string in map data; its radio is a line table, `content/radio/`, played by `app/radio.ts`), `meta` (no saves or currencies), `audio` |
> | **Content** (T111, T110, T105c) | `types.ts`, `define.ts`, `registry.ts`, `validate.ts`, `compile.ts`, `rules.ts`; towers `rivet`, `thumper`, `sprinkler` (tiers 1–3); enemies `nibbler`, `zoomer`, `chonk`; map `a1_m01`; ability `orbital_strike`. Sprinkler and Chonk are sim-tested but not placed on A1M1 | Tier-4 specs, links, medals, objectives, allies, companion (A1M1's `companion` is `null` until T207) |
> | **Sim systems** (T102, T103, T105a/b, T113) | `applyCommands`, `waves`, `triggers` (wave-phase and `tick` triggers with the `unlockTowerClass`, `cue`, and `grantCredits` actions; A1M1 uses only `unlockTowerClass`, compiled from `towerUnlockWave`: Thumper unlocks when W3's countdown starts), `status` (Chilled only), `abilities` (Orbital Strike only; no enemy abilities), `movement`, `towers` (hitscan Rivet, lobbed lead-targeting Thumper, the Sprinkler's chill aura as a `pulse` attack), `projectiles`, `cleanup` (win/lose). Plus `applyPending()`, `hash()`, and per-system RNG streams | Allies, hold fire, the spare-runners filter, links, jams, story stats beyond `skitterkinKilled` |
> | **Commands** | `build`, `upgrade`, `sell`, `targeting`, `ability` (slot 1), `callWave` | `specialize` (T202), `holdFire` and `spareRunners` (T206), `clear`, `interact`, `scriptInput` |
> | **Events** | `EnemySpawned`, `EnemyDied`, `EnemyLeaked`, `ProjectileFired`, `ProjectileHit`, `TowerBuilt`, `TowerUpgraded`, `TowerSold`, `TowerClassUnlocked`, `WaveStarted`, `CountdownStarted`, `WaveCleared`, `ScriptCue`, `AbilityUsed`, `MapWon`, `MapLost`, `CommandRejected` | The other story-facing events |
> | **Render and UI** (T104, T112, T106, T115, T113, T122) | `BootScene`, `BattleScene`, sprite baker and gallery page, HUD (with the slot-1 ability), effects (`FxView`: tracers, pulse rings, shell bursts, the Orbital Strike, feedback juice; `CoreView`: leaks and low integrity), the M1 radio ticker, keyboard routing rule, Title and Results screens (the run's Pests Processed count; no medals) | Loadout, shop, dialogue, codex, star map |
> | **Harness** (T108a) | A1M1 has `requiredCounters: []`, so it has no no-counter builds. Its runs: do-nothing loses; par wins with its margin in band; par without its strike casts scores below par; a Rivet-only alt build (`altBuilds.rivet_only`) wins at ≥ 40%, with a lower margin than par; par one purchase short (`altBuilds.par_minus_last`) wins at ≥ 40%; two under-built alts (`no_upgrades`, `two_rivets`) and every other alt build lose no more than half the integrity in any one wave (the `gradual` check); `alwaysCallEarly` wins and stays at or under `min(band top, par margin + 10)`. Plus determinism, invariants, and runtime ([conventions.md § Balance sims](conventions.md#balance-sims-npm-run-sim)). A1M1's reference profile is `towers: ['rivet', 'thumper']` plus `technicianAbility: 'orbital_strike'`, with no specs, shop items, or protocols | No-counter builds and the full-catalog check (no map in M1 has a required counter), monotonic chain (one map), the ≥ 2 `altBuilds` rule (from A1M4), Story difficulty, jam limit, flag and companion variants, Hold Fire and `spareFleeing` variants, the full par-purchasable check (A1M1's profile has no purchases) |
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
2. **An architecture test** (`src/shared/architecture.test.ts`) scans the imports (static, re-export, dynamic `import()`, `require`) of every file in `src/` and fails on any edge the [allowed dependencies](#4-other-modules) forbid: pure modules may import no packages (only `vitest`, in tests) and only the modules they depend on; `render`, `ui`, and `audio` reach `sim` only through `sim/index.ts`. It also scans the code the sim executes, `src/sim/`, `src/shared/`, and `src/content/rules.ts` (comments and strings excluded), for the banned `Math` members below, any `Math` use other than `Math.<member>` (so aliasing can't hide a ban), and the globals `Date`, `performance`, `setTimeout`, `setInterval`, `requestAnimationFrame`, `localStorage`, and `globalThis`. This is the authoritative check.
3. **Lint** (`no-restricted-imports`, `no-restricted-properties`, and `no-restricted-globals` in `.oxlintrc.json`) gives fast editor feedback.

Rendering **reads** sim state and **sends commands**. It never mutates sim state.

### Determinism

- Same content + same map + same seed + same command list ⇒ the **same outcome**, on the same JS engine. That's what tests, balance sims, checkpoints, and reproducible bug reports need. Bit-exact results across browsers aren't a goal (there's no multiplayer or server replay).
- **Fixed timestep: 60 ticks per second.** `TICK_HZ = 60` (`src/shared/time.ts`, with the seconds → ticks conversions). Sim time is an integer `tick` counter. Content is authored in seconds and tiles, and converted to ticks once at content compile time.
- **Seeded RNG:** `sfc32` (128-bit state as four plain numbers, so it hashes and serializes) in `src/shared/rng.ts`. The sim derives one **stream per system** from the run's seed (`state.rng.waves`, `state.rng.towers`, …, each `forkRng(root, '<system>')`), so adding a random roll in one system doesn't shift every other system's results. `forkRng` reads its parent without advancing it, so adding a stream doesn't shift the others either. Use the integer helpers (`nextInt`, `nextIntBetween`, `chance`) rather than scaling floats yourself. Cosmetic randomness (particles, Hollow glitches, bark choice) uses separate render-side or story-side RNGs and **never** touches the sim's.
- Iteration order is always array order (entities are processed in ascending slot order). No `for…in` over objects, and no sorting without a deterministic tie-break.
- **Banned in `src/sim/`, `src/shared/`, and `src/content/rules.ts`** (everything the sim executes): `Math.sin`, `Math.cos`, `Math.atan2`, `Math.pow`, and `Math.random` (lint rule plus the architecture test). Their results can differ between engines, and none is needed: use squared distances, precomputed polyline lengths, and `x * x`. Lead targeting solves along the route's `dist`, not with angles.

### Entity model: typed pools, not an ECS

We have about 5 entity kinds and at most a few hundred live entities. A generic ECS would be more machinery than it's worth. **The simplest thing that works:**

- One **typed pool per kind**: `towers`, `enemies` (including neutral units such as Gerald, flagged `neutral`), `projectiles`, `zones` (ground effects, ability areas, and song auras), and `allies`. Each pool is a preallocated array of plain objects with every field initialized (monomorphic shapes), plus a free list.
- **Allies** are every friendly non-tower unit ([design/maps.md §5.4](../design/maps.md#54-allies-on-the-map)). Each has an `allyKind` (`swarmling`, `leaper`, `refugee`, `bearer`, `singer`, `bricks`, `militia`, `ward`), a movement mode (`route`, `post`, `owner`, or `stationary`), an optional attack (Bricks and militia), an optional song aura (singers, bearers), and a **vulnerability**: `never` (swarmlings, leapers, militia, wards, Pebble, Old Thrum), `hush` (refugees, singers, bearers), or `scripted` (Bricks in A3M3: Hollow units stop at his post, but his health bar follows a per-wave timeline in map data, never the player's DPS). Enemies never target towers.
- **Ally targeting.** Ally attacks never target units whose wave group is tagged `quiet_wave`, `youngling`, or `fleeing` (`WaveTag`, [§3 Data shapes](#data-shapes)).
- **Hushing:** a non-boss Hollow unit hushes at most one `fleeing` enemy or `hush` ally and turns Heavy. The fleeing and hush rules (tell, heal, speed, the Maw's gather) have one home, [design/enemies.md](../design/enemies.md) §5.4. In code, the victim is removed and the unit sets `hasHushed = true` so it can't hush again.
- Each entity has a `slot`, a `uid` (a monotonic integer from one run-wide counter, `state.nextUid`, never reused within a run; `0` marks a free slot), and an `alive` flag. Killing an entity (`poolKill`) clears `alive` but keeps the uid, so later systems in the same tick can still name it in events. `cleanup` returns dead slots to the free list at the end of the tick (`poolReleaseDead`), and `poolAlloc` resets every field from the kind's frozen blank when it reuses one. A full pool grows by one slot rather than failing. The pool code is `src/sim/pool.ts`; the entity shapes and blanks are `src/sim/entities.ts`, and each behavior task adds the fields it needs there.
- Entities hold a **direct reference to their compiled definition** (`def: CompiledEnemyDef`; towers also `tierDef`, the current tier), resolved at spawn, so hot loops never look up string ids. Entities refer to **each other only by uid** (`targetUid`, `towerUid`), never by object reference, so sim state has no cycles and `hash()` can walk it.
- Status effects ([design/enemies.md §2.4](../design/enemies.md#24-status-effects)) are **fixed fields** (`chillPct`, `chillMul`, `chillTicks`, `soakedTicks`, `corrodedStacks`, `corrodedTicks`, `markPct`, `markTicks`, `pinnedTicks`, `stasisTicks`, `stasisImmuneTicks`, `unnervedTicks`, `revealedTicks`, and on towers `jammedTicks` and `jamImmuneTicks`), not dynamic lists. Towers also carry `builtTick` and `firstFiredTick` for the misclick-grace refund ([design/core-loop.md §2.3](../design/core-loop.md#23-credits-the-in-map-currency)); for pulse and aura towers, `firstFiredTick` is the first pulse that affects an enemy. Each tower also has a `spareRunners` boolean (the targeting filter, [§ Commands](#commands-input-into-the-sim)).
- Enemies follow **predefined routes**. Map data gives ground paths and rift lanes as ordered tile sequences, and air lanes as polylines ([design/maps.md §4](../design/maps.md#4-paths-and-air-lanes)). Compile turns each into a polyline through tile centers with precomputed cumulative lengths. An enemy stores `dist` (tiles traveled) and `seg` (the segment `dist` lies on), and `x, y` are derived from those each tick (`src/sim/path.ts`: `placeOnRoute`, `pointAt`, `segmentAt`). A spawned enemy starts at its spawn tile's center (`dist` 0) and leaks on the tick it reaches the core tile's center. Movement adds `speedTilesPerTick × chillMul` to `dist` each tick, using only `+ − × ÷` on doubles (bit-identical on every engine), with a 1e-9-tile arrival tolerance so float sums don't land a tick late. `dist` also gives "first / last" targeting and lead targeting (predict `dist + speed × flightTicks`, then `pointAt`) for free.
- Systems are **plain functions** `(state: SimState, ctx: TickContext) => void`, run in a fixed order:

| # | System | Does |
|---|---|---|
| 1 | `applyCommands` | Validates and applies queued player commands, FIFO. Rejections emit `CommandRejected`. |
| 2 | `waves` | Advances the wave schedule and spawns enemies |
| 3 | `triggers` | Evaluates map script triggers and objectives and executes their actions ([story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes)); emits `ScriptCue` and the other script events |
| 4 | `status` | Ticks status timers, DoTs, auras, detection (Revealed), darkness and light sources, and synergy links |
| 5 | `abilities` | Enemy ability state machines (telegraph → effect → cooldown), and commander ability cooldowns and effects |
| 6 | `movement` | Advances enemies along paths; leaks damage the core (or the escort meter): integrity drops by the enemy's `leak` (0 for `fleeing`), never below 0, `stats.integrityLost` counts it, and `EnemyLeaked` fires with `leak` = the integrity actually lost. The loss check is `cleanup`'s |
| 7 | `towers` | Targeting (including the spare-runners filter), cooldowns, firing, hold fire; `allies` (swarmling and leaper sorties, refugee, bearer, and choir movement, hushes, ally attacks, song auras) |
| 8 | `projectiles` | Movement, hits, damage, deaths, bounties |
| 9 | `cleanup` | Releases dead slots, resolves rest vs scatter for dead Hollow units (finale), updates story stats, and checks win/lose |

Win and lose conditions, economy, and every mechanic rule (damage pipeline, targeting tie-breaks, jam limits, beam armor per tick) are defined in [design/core-loop.md](../design/core-loop.md), [design/towers.md](../design/towers.md), and [design/enemies.md](../design/enemies.md). The sim implements them; it doesn't redefine them. The sim also records per-run **story stats** in `state.stats` for story and meta to read: `skitterkinKilled` (the run's Pests Processed: Skitterkin enemies killed by towers or abilities), `killsByEnemy`, `holdFireTicks`, `holdFireUses`, `ticksSinceFiredAtSkitterkin` (reset whenever a tower fires at a Skitterkin; frozen while none is in range), and, per wave **tag**, `tagSpawned` / `tagLeaked` / `tagKilled` ([design/core-loop.md §2.7](../design/core-loop.md#27-hold-fire)). It also tracks `medalExemptLeaks`, the meter (`evacuated`, `lost`, `voices`), and in the finale `restPoints`, `restTarget`, and `boreProgress`. All are integers.

**Combat** (`src/sim/combat/`, the `status`, `towers`, and `projectiles` systems) implements those rules. The details the design docs leave to code:

- **One damage entry point.** Every hit (tower shot, shell splash, pulse, and the Orbital Strike) goes through `applyDamage(state, enemy, amount, type, source, hit?)` in `combat/damage.ts`: the [enemies.md §2.3](../design/enemies.md#23-damage-pipeline) pipeline, then the kill. `source` is a `DamageSource` (`{ kind: 'tower', uid }` or `{ kind: 'ability', slot }`); `hit` carries `armorPierce`, `ignoresArmor`, `isDoT`, and `beamTickSec`, and a `CompiledAttack` satisfies it. On-hit statuses apply after the hit's damage (`applyEffects`), so a Soak never boosts the hit that applies it. A kill (`killEnemy`) is the one place kills are booked: `skitterkinKilled`, `killsByEnemy`, the bounty, and `EnemyDied { killer, bounty, x, y }`.
- **HP is fractional** in the sim (the pipeline multiplies), and an enemy at or below `DEAD_HP_EPS` (1e-9) HP is dead, so float residue never costs an extra shot.
- **Targeting** (`combat/targeting.ts`) scans in ascending slot order on squared distances. A single-target tower picks by priority whenever it's ready to fire, and between shots keeps its target while it stays alive, hittable, and in range (so `targetUid` is always current for render). With no minimum range, distance 0 is in range (a flyer over the tower).
- **Timing.** A tower fires on a tick whose `cooldownTicks` starts at 0, then waits `cooldownTicks`. A new tower **deploys** first ([design/core-loop.md §2.5](../design/core-loop.md#25-building-upgrading-selling)): `build` sets its cooldown so its first shot or pulse comes exactly `TOWER_DEPLOY_SEC` (0.5 s, `content/rules.ts`) after the build tick. Upgrades don't reset the cooldown. Spin-up runs from acquiring a target after having none. A pulse tower waits at 0 until an enemy is in range, so its first pulse always affects one (misclick grace). A lobbed shell lands exactly `flightTicks` after the tick it fired, after that tick's movement, so a lead shot at a target holding its speed lands on its center. A Chilled of *N* ticks slows exactly *N* movement ticks.
- **Shells** copy everything the impact needs at fire time (damage, armor fields, splash, layers, effects), so selling or upgrading the tower mid-flight changes nothing. Splash hits only the layers the firing tier targets, and every victim is chosen before any damage lands.
- **Commander abilities** (`systems/abilities.ts`, [design/core-loop.md §3](../design/core-loop.md#3-commander-abilities)). `applyCommands` hands the `ability` command to `applyAbilityCommand`, which rejects `noAbility` (an empty slot, or slot 2 until T207), `abilityOnCooldown`, or `invalidTarget` (a missing target, or one off the map; any tile on the map is valid). An accepted strike opens a **zone** at the tile's center (`abilitySlot` names its source), sets `state.abilityCooldownTicks[slot − 1]`, counts `stats.abilityUses`, and emits `AbilityUsed { slot, uid, ability, target }` (`uid` is the zone's). Each tick the `abilities` system counts every cooldown down and resolves zones: a strike lands exactly `delayTicks` after the tick it was cast, before that tick's movement, on every **ground** enemy whose center is within its radius (inclusive, like splash; the strike isn't an air answer in `COUNTER_ANSWERS`), all chosen before any damage, through `applyDamage` with `{ kind: 'ability', slot }`. Abilities are ready from tick 0. Cooldowns run on sim time, so a strike aimed while paused (`applyPending()`) lands 1 s after play resumes; an early call cuts them through `reduceAbilityCooldowns`.

**Waves, economy, and the end of a map** (the `waves`, `triggers`, and `cleanup` systems, `applyCommands`, and `src/sim/economy.ts`) implement [design/core-loop.md §2.1–2.5 and §2.9](../design/core-loop.md#2-in-map-loop). The formulas and numbers are in `content/rules.ts` (`waveClearBonus`, `earlyCallBonus`, `SELL_REFUND_PCT`, `MISCLICK_GRACE_SEC`, the tagged bounties). The details the design leaves to code:

- **The schedule** is `state.schedule`: `phase` (`setup` → `spawning` ⇄ `countdown` → `done`), `waveTicks` (the spawning wave's clock), `countdownTicks` and `countdownTotalTicks` (0 outside a countdown), `countdownWave` (the highest wave whose build phase has begun: 1 in setup), and per wave `startTick`, `remaining` (enemies not yet dead or leaked, unspawned ones included), and `resolved`. Only one wave spawns at a time, because a wave can be called only during a countdown.
- **Spawning.** A wave's spawn clock starts at 0 on the tick it starts (a `callWave` applied by `applyPending()` starts it on the next tick). Group *g*'s *i*-th unit spawns at `delay + i × interval`, groups in parallel and in authored order within a tick, with full `hp` and `shieldHp`, at its route's start. On the last spawn tick the next wave's countdown starts (`CountdownStarted`), and its wave-phase `countdown` triggers fire that same tick. When it reaches 0 the wave starts (`WaveStarted { early: false }`).
- **`callWave`** in setup starts wave 1 for free. During a countdown it starts the next wave now, credits `earlyCallBonus(wave, countdownTicks, countdownTotalTicks)` (`WaveStarted { early: true, bonus }`), and cuts every ability cooldown by `round(0.25 × countdownTicks)` ticks. While a wave spawns it's rejected `waveInProgress`; after the last wave starts, `noWavesLeft`.
- **Bounties** are credited in `killEnemy`: the enemy's `bounty`, 1 for a `fleeing` unit, 0 for a `youngling` (`bountyFor`). `EnemyDied.bounty` is what was paid. Leaks pay nothing.
- **Sell** refunds `sellValue(tower, state.tick)`: everything invested while `firstFiredTick < 0` and fewer than 600 ticks have passed since `builtTick`, else `floor(invested × 0.7)` (with float slack, so 0.7 × 180 is 126). Sim time is ticks, so paused time never counts. The tile frees at once, so a sell and a rebuild can share a tick. Shells in flight still land.
- **Resolution, win, and loss** are `cleanup`'s, at the end of the tick: each enemy that died or leaked this tick decrements its wave's `remaining`. Then integrity 0 loses (`MapLost`, which beats a same-tick win). Otherwise every started wave at 0 resolves, in wave order within a tick (waves overlap, so they can resolve out of order across ticks), credits `waveClearBonus(wave)`, and emits `WaveCleared { wave, bonus }`. When every wave has resolved, the map is won (`MapWon`). Either way `outcome` is set, `step()` does nothing after, and commands are rejected `mapEnded`.
- **Script triggers** fire on the first tick they're reached, in map-event order (`state.scriptFired`). Every trigger M1 runs is monotonic, so `once: false` changes nothing yet. A `cleared` trigger fires on the tick after its wave resolves.
- **Stats.** `creditsSpent` is gross (builds and upgrades); `creditsRefunded` counts sells, so net spending is the difference. `creditsEarned` counts bounties, clear and early-call bonuses, and script grants.
- **For the HUD** (`sim/index.ts`): `state.schedule` for the countdown, `callWaveBonus(state, map)` for the call button's bonus (0 outside a countdown), `sellValue(tower, state.tick)` for the sell button, and `towerStats(def, tier)` (`sim/towerStats.ts`) for the tower panel's stat line and the next tier's delta, as simulated (rate from the whole-tick cooldown).

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

- The code is the home of the union as built: [`src/sim/commands.ts`](../../src/sim/commands.ts) holds the M1 subset (`build`, `upgrade`, `sell`, `targeting`, `ability`, `callWave`) and `RejectReason`. The sketch above is the full target.
- The host calls `sim.enqueue(cmd)`, and the command applies at the **start of the next tick**, or immediately through `sim.applyPending()` (below). `enqueue` copies the command, so the caller may reuse its object.
- `holdFire` (a tower uid or `'all'`) stops the tower attacking; it's the plain Hold Fire that C1 uses.
- `spareRunners` is the **"Spare runners" targeting filter** (from A2M1; the rules are in [design/core-loop.md](../design/core-loop.md) §2.6–2.7). With a tower uid it is the per-tower toggle. `'all'` is the global HUD toggle (hotkey Alt+H): it sets every tower's filter, and towers built while it's on start with it on. A tower with the filter on never *picks* a unit whose wave group has a tag in `SPARE_TAGS` (`fleeing`, `youngling`; `content/rules.ts`) as its primary target. Splash and chain hits still land on those units.
- `interact` is accepted only while the marker is clickable (a `setClickable` script action). It is the input half of the clickable-world-object trigger ([story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes)).
- The sim validates every command (affordability, a buildable and empty tile, a tower in the loadout, unlocked and not revoked, an ability off cooldown and not revoked). While a forced input is pending, **every command except the matching `scriptInput` is rejected** (`reason: 'forcedInput'`). Invalid commands emit `CommandRejected { cmd, reason }` so the UI can explain.
- The **command log plus the seed reproduces a run exactly.** The sim appends every command it applies, accepted or rejected, to `state.commandLog` as `{ tick, cmd }`, where `tick` is the tick it applied at (a command applied by `applyPending()` after tick *T* logs *T + 1*, the same as one applied at the start of tick *T + 1*). Replaying means enqueuing each entry just before that tick runs. The game keeps the log in memory for checkpoints and so a bug report can include a replayable code (dev builds), and balance-sim builds are just scripted commands.
- **Optional bark buttons** ("Who's there?" in Act I) are not commands. They never change play, so they stay out of the sim and the command log; story handles them ([story-runtime.md § Barks](story-runtime.md#barks)).

### Events (output from the sim)

- During a tick, systems push typed events into `state.events`.
  - **Combat:** `EnemySpawned`, `EnemyDied`, `EnemyLeaked`, `ProjectileFired`, `ProjectileHit`, `TowerBuilt`, `TowerUpgraded`, `TowerSold`, `TowerJammed`, `HoldFireChanged`, `AbilityUsed`, `WaveStarted`, `WaveCleared`, `BossPhase`, `MapWon`, `MapLost`, `CommandRejected`, `CheckpointReached { wave }`.
  - **Story-facing:** `ScriptCue { cueId }`, `NotFiringAtSkitterkin` (once, when `ticksSinceFiredAtSkitterkin` crosses the threshold in `content/rules.ts`), `SkitterkinKilledAhead`, `Hushed { hollowUid, victim: 'enemy' | 'ally' }` (the Hollow unit turns Heavy), `RefugeeSaved`, `AllyHealthChanged`, `EnemyLaidToRest { uid, restValue }`, `EnemyScattered`, `EnemyReformed`, `BossEnded { how: 'driveOff' | 'retreat' | 'pivot' | 'layToRest' }`, `ObjectiveChanged`, `ObjectiveCompleted { id }`, `TowerClassUnlocked`, `TowerClassRevoked { tower, refund }`, `TowerClassRestored`, `AbilityRevoked`, `ClickableChanged { marker, on }`, `Interacted { marker, by: 'player' | 'fallback' }`, `ForcedInputRequested { id }`, `ForcedInputResolved { id }`, and `TimerProgress` (secondary timer, emitted on each whole percent).
- After each frame's ticks, the host calls `sim.drainEvents(out)`, which **appends** every event since the last drain to `out` (the caller clears `out`) and empties the sim's buffer. Events wait in the buffer until drained, so a headless runner that ignores them should still drain now and then. The host dispatches the events to subscribers (render views, UI signals, story, audio) through the **typed event bus** in `src/shared/bus.ts` (a tiny `on/off/emit` emitter keyed by event `type`).
- **Inside the sim, systems communicate through state, not events.** Events are output only, which keeps the tick order explicit. Payloads as built are in [`src/sim/events.ts`](../../src/sim/events.ts). `ProjectileFired` and `ProjectileHit` fire once per attack of every kind (`uid` 0 when no projectile entity exists: hitscan and pulses), so render and audio see every shot. `ProjectileFired` carries what render needs to draw the shot without looking up the tower (which may be sold or upgraded by then): `sprite` (the firing tier's projectile sprite, null for hitscan and pulses) and `flightTicks` (a shell's flight, else 0).
- Events are infrequent compared to per-entity work, so plain object events are fine. Per-entity, per-tick work must not allocate ([conventions.md § Performance](conventions.md#performance-rules)).

### Map scripts

Story moments that change play run **inside the sim** as map data (`MapDef.events`, evaluated by the `triggers` system), so headless runs, replays, and the balance harness see exactly what a player sees. The trigger and action unions, flags in the sim, forced input, revocation, clickable objects, and rest and scatter are specified in [story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes).

### Game speed, pause, and the host loop

The sim doesn't know about speed. The host (`createHost(sim)` in `src/app/host.ts`) wraps one sim, and `BattleScene.update(time, delta)` calls its `frame(delta)` once per rendered frame:

```ts
const TICK_MS = 1000 / TICK_HZ;
const MAX_STEPS_PER_FRAME = 4;                   // per 1× of speed
const MAX_FRAME_DELTA_MS = 250;                  // a background tab or a debugger pause
const cap = MAX_STEPS_PER_FRAME * Math.max(speed, 1);
acc += Math.min(delta, MAX_FRAME_DELTA_MS) * speed;   // speed ∈ {0 (paused), 1, 2}
let steps = 0;
while (acc >= TICK_MS && steps < cap) {
  sim.step(); acc -= TICK_MS; steps++;
}
if (steps === cap) acc = 0;                      // drop backlog rather than spiral
if (speed === 0) sim.applyPending();             // build/upgrade/sell land while paused
events.length = 0; sim.drainEvents(events); dispatch(events);   // then the after-frame listeners
```

- **The host's API:** `sim`, `bus` (the drained events, by type), `speed` / `setSpeed(s)` (pausing empties the accumulator, so paused time never banks), `enqueue(cmd)`, `frame(deltaMs)` (returns the ticks stepped; non-finite or negative deltas count as 0), `fastForward(ticks)` (steps exactly `ticks` with no cap and regardless of speed, then dispatches once; `fastForward(0)` applies pending commands without advancing time), `onAfterFrame(listener)` (runs after every dispatch: the HUD's signal sync), and `simMsPerTick()` (a smoothed mean, for `__sd.perf()`). Its unit tests are `src/app/host.test.ts`.
- **One frame, in order:** the host steps and dispatches (views are created and released by the events), then BattleScene positions every view from sim state and redraws the hover, selection, range ring, and placement ghost ([§ Rendering](#rendering)).

- Speeds are 1× and 2×, with 3× an open design question ([design/core-loop.md §2.8](../design/core-loop.md#28-speed-and-pause)). The loop handles any integer speed; 2× is two ticks per 16.7 ms of accumulated time, not a bigger timestep. Pause sets speed to 0. Full-screen dialogue scenes pause; build-phase barks don't ([story/style-guide.md](../story/style-guide.md)).
- **`sim.applyPending()`** is a zero-time, command-only step: it runs `applyCommands` on the queue without advancing `tick` or any other system. Applying commands at the end of tick *T* is identical to applying them at the start of tick *T + 1* (`applyCommands` runs first), so the command log stays replayable without knowing whether the game was paused.
- Rendering shows the latest tick's state with no interpolation. (At 60 Hz ticks this is smooth enough for pixel art; interpolation can be added later if 120 Hz+ displays look juddery.)

### Checkpoints

"Retry from wave N" ([design/core-loop.md](../design/core-loop.md) §2.12) needs no state serialization. A **checkpoint** is `{ wave, tick, commandCount }`, recorded by the host when the sim emits `CheckpointReached` (every 5 waves from Act II, per `content/rules.ts`; the finale also emits it at the start of Phase 2 through a `checkpoint` script action). Retrying re-creates the sim from the same `SimConfig`, replays the first `commandCount` logged commands headlessly up to `tick`, then hands the sim back to the host. Replay at uncapped speed costs the same as a headless run (well under 2 s even for the finale). Checkpoints live in memory for the current run only. Using one marks the run result `usedCheckpoint` (which forfeits Perfect and Challenge medals) and records `resumedFromWave`, which the defeat payout uses ([meta-runtime.md § Run end](meta-runtime.md#run-end)).

### Sim public API

```ts
// src/sim/index.ts (implementation: sim.ts, config.ts, state.ts)
export function createSim<K extends IdSpace = LiveIds>(cfg: SimConfig<K>): Sim<K>;
interface SimConfig<K> {
  content: CompiledContent<K>; mapId: K['map']; seed: number;   // seed: an integer in [0, 2³²)
  loadout: K['tower'][];              // ≤ 4 distinct (hard rule); never contains a revoked class
  companion: CompanionId | null;      // resolved from MapDef.companion (a pick list is resolved before the map)
  modifiers: Modifier<K>[];           // from permanent upgrades, difficulty, veteran mods
  difficulty: DifficultyId;           // 'story' | 'standard'
  abilities: { slot1: K['ability'] | null; slot2: K['ability'] | null; slot2State: 'present' | 'absent' | 'none' };
  scriptFlags: ScriptFlags;           // story flags that map scripts read (story-runtime.md § Map scripts)
}
interface Sim<K> {
  readonly state: DeepReadonly<SimState<K>>;   // the live object, same every tick
  readonly config: SimConfig<K>;
  readonly map: CompiledMapDef<K>;
  enqueue(cmd: Command<K>): void;     // copied; applies at the start of the next tick
  step(): void;                       // one 60 Hz tick; a no-op once the map is won or lost
  applyPending(): void;               // zero-time, command-only step (works while paused)
  drainEvents(out: SimEvent<K>[]): void;   // appends to out, empties the buffer
  hash(): string;                     // 16 hex digits over all state, for determinism checks
}
// src/sim/headless.ts (also exported from src/sim/index.ts)
export function runHeadless<K>(cfg: SimConfig<K>, build: CompiledBuild<K>, opts?: HeadlessOptions): HeadlessResult;
export function createBuildExecutor<K>(sim: Sim<K>, build: CompiledBuild<K>): BuildExecutor;   // beforeTick(), steps, waveCalls
```

- **Id typing.** `K` is the content's id space ([§3 Data shapes](#data-shapes)): the game uses the live registries, tests use `src/sim/__fixtures__/sim.ts` over the content fixture. It types only the API's edges (config, commands, events); inside, the sim runs on plain string ids.
- **`createSim` validates the config** and throws a `RangeError` listing every problem: an unknown map, tower, or ability, a bad seed, or a loadout over 4 or with duplicates. Until their tasks land it also refuses what it can't simulate, rather than ignoring it: a companion or slot 2 (T207), any modifier (T204), Story difficulty, and map-script triggers, actions, or `when` conditions the `triggers` system doesn't run yet (`unsupportedScript` in `systems/triggers.ts`).
- **`state`** ([`src/sim/state.ts`](../../src/sim/state.ts)) holds everything that changes: `tick` (ticks completed; during a step, the tick being run, starting at 0), `nextUid`, `outcome`, `credits`, `integrity`, `wave`, `schedule` (the wave schedule; see *Waves, economy, and the end of a map* above), `scriptFired`, `lockedTowers`, `towerAtTile`, the five pools, the RNG streams, `stats`, `abilityCooldownTicks`, the `pending` queue, and the output buffers `commandLog` and `events`. Immutable inputs (content, map, config) and per-tick scratch live in the `TickContext` that systems receive, not in state.
- **`hash()`** walks all of `state` generically except the output buffers, so a field added later is covered automatically. Numbers hash by their exact bits; a frozen object with a string `id` (a compiled definition or route) hashes as its id, so two runs over separately compiled but identical content agree. Two lanes (FNV-1a plus a second mix, `src/shared/hash.ts`) give a 64-bit digest. It isn't for hot loops.
- **`runHeadless`** runs one map to the end (or `maxTicks`, default 30 minutes of sim time) with no frame cap, issuing the build's steps through the scripted-build executor ([conventions.md § Balance sims](conventions.md#balance-sims-npm-run-sim)). It takes a ready `SimConfig` and a compiled build (`map.builds.*`, or a policy's); it never imports `meta/`. Its `HeadlessResult` holds the outcome, final integrity and credits, `hash()`, the wave a loss happened in, per-wave tallies (spawned, killed, leaked, integrity lost, the bank as the build phase opened, credits unspent at the wave's start, early-call bonus), per-tower shots and kills, each step's issue tick, lateness and error, and any invariant violations (`headlessTracker.ts` checks them after every tick).
- **`createBuildExecutor`** is the executor on its own: call `beforeTick()` before each `sim.step()`, and it issues whatever steps are due through `enqueue` + `applyPending()`. It never drains events, so a host can drive it alongside rendering: `__sd.autoplay(name)` (`app/autoplay.ts`) runs it from `host.setDriver`, which calls it before every tick of a frame or a `fastForward`.
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
| `maps/<id>/` | One folder per map: `map.ts` (tiles, paths, air and rift lanes, markers, objective, credits, events, environment palette), `waves.ts`, `builds.ts` (`referenceProfile`, `parBuild`, `noCounterBuilds`, `altBuilds`, `altExpectations`, variants, guards), and `index.ts` composing them into one `MapDef` |
| `upgrades/` | Permanent upgrades (shop and R&D) as modifiers, each with `availableAfter` |
| `dialogue/` | `flags.ts`, `speakers.ts`, `scenes/<act>/`, `barks/<trigger>.ts`, `memos/` (Everglow Inbox), `epilogue/`, `tips.ts`, `results.ts`, `bricks_tags.ts` ([story-runtime.md](story-runtime.md)) |
| `codex/` | Codex entries, each with `original` / `annotated` / `corrected` versions and their unlock conditions |
| `presentation.ts` | The per-act presentation dials ([design/core-loop.md §6.7](../design/core-loop.md#67-per-act-presentation-dials)), with per-map overrides in map data |
| `campaign.ts` | Campaign map order (mirrors [story/campaign.md](../story/campaign.md)) |
| `rules.ts` | Rule data: damage matrix, status caps and the speed rule, stacking caps, aura kinds, jam limits, counter categories, the trait → counter-category and trait → tell maps (human-readable table: [design/enemies.md](../design/enemies.md) §3.1; intel-only traits map to `null`), which towers and abilities answer each category, threat-budget factors, map design limits, default countdowns and integrity, sell refund and misclick grace, `SPARE_TAGS`, checkpoint interval. Bark thresholds join it with the story runtime |
| `sprites/`, `palettes/` | Pixel art data ([art/tech-spec.md §2](../art/tech-spec.md#2-code-generated-pixel-art-format)) |
| `types.ts`, `compiled.ts`, `define.ts` | Definition types (authored and compiled; [§ Data shapes](#data-shapes)) plus `defineTower()`, `defineEnemy()`, `defineMap()`, and similar identity helpers that give type inference |
| `registry.ts` | Imports every registry and exports `RAW_CONTENT` |
| `validate.ts` | Design-rule validation (below; its parts: `validateMap.ts` with `validateWaves.ts`, `validateThreats.ts`, and `validateScripts.ts`, plus `validateBuilds.ts` and `validateHelpers.ts`) |
| `compile.ts` | `compileContent()`: resolves ids to references, converts seconds to ticks, resolves tier patches, compiles routes and `towerUnlockWave`, and freezes the result into `CompiledContent` (its parts: `compileTower.ts`, `compileMap.ts`, `compileBuilds.ts`, `compileHelpers.ts`) |

- **Ids** are `snake_case` strings, unique per kind. Id union types are derived from the registries (`type TowerId = keyof typeof TOWERS`), so a typo in a wave file is a compile error.
- **Exact numbers live in content files.** Design docs hold intent, roles, and target ranges, and link to the content file rather than copying its numbers.
- TS types check shape at compile time; `validate()` checks what types can't (cross-references, ranges, grid geometry, design rules). No schema library is needed, because content is TS, not JSON. Untrusted input (save import) gets its own validator in `meta/`.

### Data shapes

**The code is the home of the data shapes:** [`src/content/types.ts`](../../src/content/types.ts) defines what content authors write (`TowerDef`, `EnemyDef`, `AbilityDef`, `MapDef` and its parts, waves, builds, conditions, and the map-script triggers and actions), and [`src/content/compiled.ts`](../../src/content/compiled.ts) defines what the sim reads (`CompiledContent`). Design docs link there instead of keeping their own sketches. The essentials:

- **Units are in field names** ([conventions.md § TypeScript style](conventions.md#typescript-style)). Content is authored in seconds and tiles (`ratePerSec`, `rangeTiles`, `flightSec`); compiled data is in ticks and tiles (`cooldownTicks`, `rangeSq`, `speedTilesPerTick`). The tile is the sim's only distance unit; tile `(c, r)` has its center at `(c + 0.5, r + 0.5)` ([art/tech-spec.md § Grid ↔ screen math](../art/tech-spec.md#grid--screen-math)).
- **Id unions come from the registries** (`type TowerId = Extract<keyof typeof TOWERS, string>`). Types that refer to another kind's ids take an id space `K` that defaults to the live registries, so test fixtures (`src/content/__fixtures__/`) get the same typo checking against their own registries. A definition never names its own kind's ids (`MapDef.revisitOf` is a plain string that `validate()` checks), which keeps the types free of cycles. Kinds without a registry yet (links, upgrades, protocols) are `never`, so nothing can reference them until their task adds one.
- **Towers:** tier 1 is complete; tiers 2 and 3 are patches on the tier before, and the tier-4 specs (optional until T202) patch tier 3. Targets and default priority live on the tier, so a spec can change them (Railspike's Strong, Cloudburst's air). Attack kinds: `hitscan`, `projectile`, `lobbed` (fixed flight time, optional lead), `beam`, `chain`, `spawner`, and `pulse` (hits every enemy in range each period, with no target: the Sprinkler's chill aura). Armor pierce and ignore-armor are attack fields on every kind.
- **Waves:** a group's `intervalSec` defaults to the enemy's `spawnIntervalSec` ([design/enemies.md §5](../design/enemies.md#5-roster)), and its `route` (a path, air-lane, or rift-lane id) also fixes its spawn. A wave's `countdownSec` defaults by act ([design/core-loop.md §2.1](../design/core-loop.md#21-phases)). Wave tags (`WaveTag`) include `quiet_wave`, `youngling`, and `fleeing`, which allies and the spare-runners filter never pick.
- **A map** is `MapLayoutDef` (`map.ts`) + `WaveDef[]` (`waves.ts`) + `BuildsDef` (`builds.ts`), composed by `defineMap` ([conventions.md § Add a map](conventions.md#add-a-map)).

**Compiling** (`compileContent()` in `src/content/compile.ts`; its header comment is the home of the conversion and merge rules) turns seconds into whole ticks and rates into whole-tick periods, resolves tier patches into full per-tier definitions, gives wave groups direct references to their compiled enemy and route, turns routes into polylines through tile centers with cumulative lengths, compiles `towerUnlockWave` into `{ wave: N, phase: 'countdown' }` → `unlockTowerClass` events (ahead of the authored events) plus the map's `lockedTowersAtStart`, turns build steps into tagged steps, resolves every optional field to a value or `null`, and deep-freezes the result. Anything it can't compile past (an unknown id, a registry key that differs from its id, a malformed tile grid, a route that breaks the route format) is reported with the validation errors in one `ContentCompileError`.

### Validation

`compileContent()` runs `validate()` ([`src/content/validate.ts`](../../src/content/validate.ts)) first and throws one `ContentCompileError` listing every validation and compile problem, so invalid content never compiles; each validation error reads `[rule] where: message`. **The code is the home of the check list:** the headers of `validate.ts`, `validateMap.ts`, and `validateBuilds.ts` name every rule they check, and `validate.test.ts` has one failing fixture per rule. `content.test.ts` validates the live registries (the schema test). The design rules are owned by the linked design docs; their values (caps, the trait → counter-category map, the answer lists, limits) live in `rules.ts`. In summary:

- **References and ranges:** ids exist (compile), sprites are registered and of the right category, numbers are in range on every resolved tier, enemy traits agree with the data and show their tells, and only the listed jammers jam. Sprite grids, master-palette colors, the Hollow hue reservation, and path-vs-pad contrast run through `sprites/validate.ts` and `palettes/validate.ts`.
- **Geometry** ([design/maps.md §9](../design/maps.md#9-map-data-shape-for-implementers)): the route format is a compile error (`compileMap.ts`). `validate()` adds: every wave group can walk its route, a Defend map has one core, markers sit on decor, wreckage says what lies under it and pays 30–80 salvage, and `cols + rows ≤ 36` for campaign maps.
- **Threats** ([design/maps.md §6.2–6.3](../design/maps.md#63-one-new-thing-per-map)): `threatIntel` equals the traits in the waves; `requiredCounters` has at most 3 entries, each with a `noCounterBuilds` entry; soft enemies stay within 15% of every wave's threat; teach waves teach a new trait; in campaign order, at most two new threats and one new required-counter category per map.
- **Builds:** loadouts (≤ 4, owned by the reference profile), what each scripted step means on the map (buildable empty tiles, unlocked towers, towers built by then, tiers and specs), no-counter builds leave out every answer in the `rules.ts` answer list, alt builds answer every required counter, and from A1M4 there are at least 2 alt builds sharing at most 2 tower types with par.
- **Scripts:** wave triggers, markers, objectives, and forced inputs exist; cue ids follow `<map_id>_wNN` or `<map_id>_<slot>` ([story/style-guide.md](../story/style-guide.md)); every flag a script reads has a `flagVariants` entry.
- **Feature guards:** content that needs a system that doesn't exist yet is refused rather than mis-simulated: bosses (M3, with the boss-leak rule), non-Defend objectives (T305, with Escort safe exits), and companions (T207).
- **Not yet checked** (TODO stubs in the code, waiting for content that can't exist yet): par is purchasable (T204), answer tiers and specs (T208), medals (T202), revisit layouts and locked abilities per flag variant (M5). The dialogue rules are in [story-runtime.md § Validation](story-runtime.md#validation).

---

## 4. Other modules

| Module | Purity | Responsibility |
|---|---|---|
| `src/shared/` | pure | RNG, typed event bus, hashing, small math, `DeepReadonly`, id helpers, the architecture test |
| `src/sim/` | pure | The simulation (§2), including `runHeadless()` and the scripted-build executor |
| `src/content/` | pure | Game data, validation, compilation (§3) |
| `src/story/` | pure | Dialogue runner, story flags, bark selection ([story-runtime.md](story-runtime.md)) |
| `src/meta/` | logic pure, I/O via adapters | Saves, progression, shop and R&D, medals, profile → modifiers ([meta-runtime.md](meta-runtime.md)) |
| `src/balance/` | pure | The balance harness: reference profile → `SimConfig` (through `meta/modifiers.ts`; until T204 it refuses a profile with purchases), built-in policies, the run list, assertions, and reports. `tools/sim.ts` is its CLI, and the only place that touches the clock and the file system |
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

- **Phaser config:** `type: Phaser.WEBGL`, `width: 640`, `height: 360`, `pixelArt: true`, `roundPixels: true`, `antialias: false`, `backgroundColor: '#05030a'`, `scale.mode: NONE`. `render/scale.ts` computes the integer zoom on resize (formula in [art/tech-spec.md § Tile and screen](../art/tech-spec.md#tile-and-screen)) and applies it to the canvas and to the UI root (`--ui-scale`, [§ UI: DOM overlay](#ui-dom-overlay)).
- **Scenes:** `BootScene` (bake sprites; later load fonts), `BattleScene` (the playfield), `StarMapScene` (M3), `BackdropScene` (the animated backdrop behind DOM menus: the night sky over Dome Row from the pure `vfx/backdropPixels.ts`, seeded so it's the same every boot, with twinkling stars and rising `stardust.sung` motes; still under reduced motion). `BootScene` and `BackdropScene` are in the game config; only `BootScene` starts on its own.
- **Screens and run end** (`src/app/router.ts`): `goto` shows `title` (starts the backdrop), `battle` (stops it and starts a session), or `results`. The router subscribes to the battle's `MapWon` and `MapLost` (and counts `WaveCleared`, and notes the first `EnemyLeaked`). When the map ends it freezes the battle (speed 0, selection cleared; game hotkeys go off with the sim's outcome) and waits `RESULTS_DELAY_MS` (1.5 s of real time, D028) so the last radio line and the leak's feedback play out; then at run end (`endRun`, once per battle; `flushResults()` skips the rest of the wait) it builds a `RunResult` (`app/runResult.ts`: waves survived, integrity left, `stats.skitterkinKilled` as Pests Processed, and the `debrief`: the map's `mapWon` or `mapLost` radio lines, led by its `firstLeak` line when the first leak came within 4 s of real time and 4 s of 2× game time of the end; M1 adds nothing to a save) and shows Results over the frozen playfield. `retry()` replays the last battle request (same map, and the URL's seed if it gave one). The UI's buttons reach the router only through `app/navigation.ts` (`startGame`, `retryRun`, `toTitle`), the screen counterpart of `commands.ts`.
- **Battles** (`src/app/`): `battle.ts` starts a session: one sim, its host, a `BattleInteraction`, and a `BattleScene` added under a fresh key (`Battle.<n>`), and stops it by removing the scene. `battleSetup.ts` turns a map id into a `SimConfig` (the map's par loadout and Technician ability, until loadouts and saves land) and names `DEFAULT_MAP_ID` (`a1_m01`), the map a battle opens when the URL names none (the title's Start shift). It searches the live registries first, then the dev battle `render/__fixtures__/devBattle.ts` (`DEV_MAP_ID`, `?map=dev_range`: a 12×8 map with `dev_`-prefixed towers drawn with the real sprites and no Thumper lock), which the dev-layout smoke flows use. `BattleScene` gets everything through a `BattleSceneDeps` object (the sim, the host's bus, `frame`, `issue`, the interaction state), so it never imports `app/`.
- **Views:** pooled `EnemyView`, `TowerView`, and `ProjectileView` objects in a `ViewPool` keyed by sim `uid` (`render/views/ViewPool.ts`: hidden and reused, never destroyed), created and released in response to sim events and positioned each frame from sim state. Each sync pass also stamps the views of live entities and sweeps the rest, so a missed event can't leak a view; a live entity with no view gets one lazily. Tower views draw the tier's base frame, the head on the base's mount (aiming heads turn to their target's facing; idle heads such as the Sprinkler's play their anim), and the `@glow` halos additively in `vfx`; selection swaps to the baked `+selected` variant. Enemy views play `walk_<facing>` for the direction they last moved (anim keys and anchors are looked up once per `show()`, not per frame); flyers draw 12 px up in `air` over `fx.shadow`, and ground units stand on a contact shadow (`groundShadowFor` in `content/sprites/shadows.ts`). Each enemy walks `((uid % 5) − 2) × 1.5` px to the side of the path's center line, perpendicular to its travel on the ground, so a tight clump reads as a crowd. The first enemy of each type in a battle with a tell that has a glyph (`icon.tell.<tell>`, e.g. the Zoomer's `fast`) shows it above itself for its first 3 s (once per type, D028). `show()` seeds the sideways direction from the route's first segment, so a reused view never starts on its last enemy's side; anim keys sit in an array indexed facing × 2 + selected. A newly built tower drops in 4 px (1 px per 2 frames), and an upgrade fills it white for 2 frames. The core's feedback is `views/CoreView.ts`, over GroundView's static core prop (`drawGround` returns the core props by tile): a leak fills it white for 2 frames; at integrity 5 or less its heart turns red, with overlays cut once from the core's `@glow` frame (the halo in `red.3`, the orb pulsing `red.3` ↔ `red.4` at 1 Hz, a steady `red.4` under reduced motion); and while a tower stands on a tile the core hides (`tilesBehind`: the same screen column, 2+ diagonals back, under the core's top) the core draws at 60%. The teach pulses (free pads until the first build, then built towers while the HUD's `upgradeHint` is on, through `BattleSceneDeps.teachUpgrade`) and the core's orb blink on the page clock (`render/motion.ts` `pulseOn`); the reduced-motion preference is one cached `MediaQueryList` (`render/motion.ts` for the canvas, `ui/motion.ts` for the DOM). Lobbed shells arc (a cosmetic parabola over the sim's ground point). The static ground and props are drawn once (`views/GroundView.ts`, tile choices in the pure `views/groundTiles.ts`; high ground and power nodes use the pad sprite until they have art). Positions go through `render/iso.ts` (the pure grid ↔ screen math, tile picking, and map centering of [art/tech-spec.md § Grid ↔ screen math](../art/tech-spec.md#grid--screen-math)). Grid queries shared with the sim (`tileAt`, `isBuildable`, `tileElevation`, …) come from `src/sim/grid.ts` through `sim/index.ts`. Layers and depth rules are in [art/tech-spec.md § Depth sorting](../art/tech-spec.md#depth-sorting); the code is `render/layers.ts` (the eight Phaser `Layer`s) and `render/depth.ts` (`worldDepth`). Range rings and tile highlights are pure RGBA buffers (`render/vfx/overlayPixels.ts`: a dashed 1 px midpoint ellipse per quarter-tile radius with an `ink.0` under-stroke, filled ellipse decals, and the tile mask with a 1 px edge and a 15% fill) registered as textures on first use. Floating numbers use the 3×5 pixel font (`render/vfx/pixelFont.ts`: digits, plus, minus, with a 1 px `ink.0` outline), one texture per string.
- **Effects** (`views/FxView.ts`, T113/T122) are driven by events and pooled as fixed arrays of slots (the oldest of a kind is reused when its pool is full), so firing allocates nothing: a hitscan `ProjectileFired` flies the `projectile.rivet_tracer` streak from the muzzle to the target; a `pulse` one expands a solid ring to its reach (`overlayTextures.effectRingTexture`); a lobbed shell (its look comes from the event's `sprite` and `flightTicks`) lands with `fx.explosion` over an `orange.3` ring at its tier's splash radius (the event's `radiusTiles` carries both reaches, so a tower sold mid-flight needs no lookup); and `AbilityUsed` shows `fx.orbital_reticle` on the target for exactly as long as its sim zone lives (so it holds while paused), then the beam, a `teal.4` ground flash out to the strike's radius with a `white.1` edge, a big center burst inside the rolling ring of bursts, a 1.5 s dithered scorch, and the shake. The feedback juice (D026) is FxView's too: `EnemyDied` pops `fx.explosion`; `EnemyLeaked` grows a `red.3` ring from the core, shakes the camera 1 px for 120 ms (not under reduced motion), and floats "−N"; `TowerBuilt` grows a `steel.4` dust ring and floats "−cost"; `TowerUpgraded` grows a `teal.4` ring and floats "−cost"; and `TowerSold` floats "+refund". The timings and shapes are pure functions in `render/vfx/fxTiming.ts`; the look is [art-direction.md §7](../art/art-direction.md#7-vfx). Cosmetic effects run on real time. Phaser's WebGL Graphics drops 1 px wide rects, so anything that thin is a sprite.
- **Sprites:** `render/sprites/` (the pure `rasterize`, `bake`, and `atlas` modules, plus `CodeSpriteSource`, the `SpriteSource` that `BootScene` registers at boot and stores in the game registry under `spriteSource`); see [art/tech-spec.md §2](../art/tech-spec.md#2-code-generated-pixel-art-format). The sprite gallery dev page (`gallery.html`) is a second Vite entry, built with the game ([tech-spec § The sprite gallery](../art/tech-spec.md#the-sprite-gallery)).
- **Input:** `render/input/` turns pointer input on the canvas into *intents* (select tile, place, cancel, click a clickable marker), then into `Command`s. The decisions are pure (`input/intents.ts`: `resolveClick` and `hoverLook`): a left click on a tower selects it; on a free buildable tile with a tower armed, it builds; while an ability is aimed, a click on any tile fires it there (off the map, the aim stays); a click with a tower armed on any other tile says "Can't build there" (the `cantBuild` intent; the slot stays armed); anything else clears the selection. A right-click or Esc *cancels*: it clears the selection, disarms, and stops aiming. Picking uses `pickTile` with no elevation while every tile is drawn flat. The selection and the armed build slot live in `BattleInteraction` (`input/BattleInteraction.ts`), which the scene draws and `app/` mirrors into the HUD. **The armed-slot rule (T106):** a battle starts with nothing armed; a build slot (HUD click or keys 1–4) arms its tower, and pressing the armed slot again disarms it. A locked or unaffordable tower doesn't arm (a HUD notice says why). After a build the slot **stays armed while another of that tower is affordable** (so several can be placed in a row, as in Kingdom Rush or BTD) and disarms otherwise (`app/hud.ts`). Selection, arming, and **aiming an ability** are exclusive: each drops the other two. An ability slot (HUD click or Q) aims it, pressing it again stops aiming, and an empty or recharging slot doesn't aim (a notice says why); one click fires and ends the aim. While aiming, the hover shows the ability's reticle on the tile under the pointer. Otherwise the hover shows the tile highlight (red where the armed tower can't go), the placement ghost with its range ring on a buildable tile (red when the tower is locked, unaffordable, or the tile is taken), and a hovered or selected tower's range ring. Until the first build, every free pad blinks a `teal.3` highlight at 1 Hz (onboarding; steady under reduced motion). `hoverLook` returns one reused scratch object, so the per-frame hover allocates nothing. Nothing is hover-only, so touch can be added later. Keyboard input goes through `app/keys.ts` (below).

### UI: DOM overlay

**Decision: menus, the HUD, and dialogue are a Preact DOM overlay above the canvas. In-world UI (range rings, health bars, tells, floating numbers, placement ghosts) is drawn in Phaser.**

Why DOM:
- Stardust is **text-heavy** (dialogue, codex, memos, shop). DOM gives us text layout, wrapping, scrolling, and selection for free. Phaser text would need a hand-built layout engine.
- **Accessibility:** focus order, keyboard navigation, screen-reader labels, and user font scaling.
- **Forms:** player name and pronoun entry, and the save export/import text field.
- **Agent-friendly and testable:** Playwright can query DOM elements by role and text, and components are plain TSX.
- **Touch-ready:** native hit testing and scrolling.

How:
- `#ui` is a 640×360 box (in game pixels) layered over the canvas and scaled with CSS **`zoom: var(--ui-scale)`**, the same zoom as the canvas. All UI is authored in game pixels. (Use `zoom`, not `transform: scale`, so text re-rasterizes crisply and pointer coordinates stay correct.) `--ui-scale` is the canvas's CSS zoom, `n / devicePixelRatio` (`cssZoom` in `render/scale.ts`), not the integer `n` itself: one game pixel then covers exactly `n` *device* pixels, so text and icons stay on the device-pixel grid at fractional DPRs (1.25, 1.5) too. `app/boot.ts` sets it on `#ui` on boot and resize.
- The root has `pointer-events: none`; panels set `pointer-events: auto`, so clicks on empty space reach the canvas.
- **Screens:** `ui/Overlay.tsx` picks the screen from the `screen` signal: `screens/Title.tsx`, the HUD (`hud/`) during a battle, or `screens/Results.tsx`. The screens' view model is `ui/screens/state.ts` (`runResult`, the last finished run); their styles are `ui/screens/screens.css`. Full-screen menus set `pointer-events: auto` (Results is a scrim over the frozen battle, so the canvas gets no clicks), and the game hotkeys are live only on the battle screen. Title focuses Start and Results focuses its primary button (Retry after a loss, Title after a win), so Enter acts at once.
- **State flow:** the host updates `@preact/signals` view models (credits, core HP, wave, selection, dialogue) from sim events and state, only when values change. Components dispatch `Command`s through `app/commands.ts`. UI never imports sim internals. As built: `ui/state.ts` holds `screen`, `speed`, and `hud` (`mapId`, `act`, `credits`, `integrity`, `meterLabel`, `wave`, `waveCount`, `outcome`, `loadout`, `slots`, `lockedTowers`, `selectedTower`, `selected` (the tower panel's view: tier, next cost, sell value, priority, screen position), `armedTower`, `nextWave` (the preview), `countdown` (whole seconds to the next wave, or null), `callBonus` (the sim's `callWaveBonus`), `callPulse`, `briefing` (the open static briefing's lines, or null), `notice`, `radio` (the radio line on screen), `leak` (the latest leak, for the meter's flash), `waveBanner`, `built` (whether a tower has been built, for the onboarding pulses), `countdownCue`, and `upgradeHint` (the upgrade teach, D028: from W2's countdown until the first `TowerUpgraded`, while a tower stands)); the tower panel's sell value is the sim's `sellValue`. `app/hud.ts` (`bindHud`) writes them after every host frame and on every interaction change, applies the armed-slot rule after a `TowerBuilt`, and turns `CommandRejected` events into notices (`rejectText`). The tower panel's stat line and upgrade delta come from the sim's `towerStats` (`statLineText`, `deltaText`), recomputed only when the selected tower or its tier changes. `app/commands.ts` is the one door for actions: `issue(cmd)`, `setSpeed`, `togglePause`, `toggleFastSpeed`, `armBuild(tower)`, `pressBuildSlot(i)`, `selectTower(uid)`, `upgradeSelected`, `sellSelected`, `cycleTargeting` (First → Last → Strong → Close), `callWave`, `dismissBriefing`, and `cancel()`, each a no-op outside a battle. A command the sim rejects (including `notImplemented` while a handler is still missing) shows as a notice, never an error.
- **The HUD** (`ui/hud/`, T106) follows the corner layout of [art-direction.md § Look](../art/art-direction.md#look-a-sci-fi-tactical-hud): status (meter and credits) top-left; speed, wave counter, call-wave (with the early-call bonus while a countdown runs, and disabled while a wave is still spawning), and the next-wave preview (core-loop §2.2, groups merged by enemy and layer, air marked) with the countdown's seconds top-right; the commander ability slots bottom-left (slot 1 in M1: icon, hotkey, and a cooldown shown as whole seconds left plus an ink wipe over the icon that recedes one game pixel per 1/16 of the cooldown; ready, recharging, and aiming states, with a "Pick a target · Esc cancels" hint beside the slot while aiming); the four build slots (icon, cost, hotkey; locked, unaffordable, and armed states) bottom-right; the selected tower's panel (tier, Upgrade, Sell with the live sell value, Targeting) beside the tower, away from the screen center (`placePanel` in `ui/hud/layout.ts`); and notices top center. **Feedback (D026):** a leak flashes the status panel's edge `red.3` for 300 ms; at integrity 5 or less a blinking "!" box sits beside the meter's label (a shape, not only a red number). The call button pulses at 1 Hz while calling now pays (a countdown with more than 5 s left and nothing alive) and, in the setup, once a tower stands; build slot 1 pulses until the first build. The bonus shows the credits chip ("Call +13"). A ready ability slot flashes three times as each countdown starts, and its tooltip describes it ("200 damage in an area after 1 s. Recharges 45 s."). A locked slot says when it ships ("Thumper ships at wave 3") in its tooltip, label, and notice. Preview groups have a tooltip with the enemy's name, and a `fast` enemy shows the `icon.tell.fast` chip. A "WAVE n" banner shows for 1.2 s as each wave starts. While paused, a 15% ink scrim covers the playfield and a pinned "PAUSED" notice sits bottom center. **The upgrade teach (D028):** while `upgradeHint` is on, a "Click a turret to upgrade it (U)" hint sits bottom center above the PAUSED slot (hidden while a tower is selected) and the tower panel's Upgrade button pulses. Every `hud-pulse` animation is started at the document timeline's zero (`ui/hud/pulse.ts`), so the HUD's pulses blink in phase with each other and the canvas's. Build and ability slots `preventDefault` their mousedown, so a pointer press never leaves a focus ring. Every control is a real `<button>` with an `aria-label`, a visible focus ring, and a hit target of at least 16×16 game px; states use `aria-pressed` and `aria-disabled` (still focusable, and a click explains itself with a notice). Icons are the `icon.*` sprites, baked once per id through `render/sprites` into data URLs (`ui/hud/Icon.tsx`). Not yet built: the companion slot (T207), Hold Fire (T206), the callsign plate (no callsigns in M1), the threat-intel strip, and the preview's NEW badge. **The M1 briefing:** a fresh battle on a map with a static `briefing` opens it as a modal over the battle (speaker and line per row, one "Clock in" button focused, Enter or Esc closes it). It is a real modal: the rest of the HUD (`.hud-play`) is `inert` while it's open, Tab and Shift+Tab cycle inside it, and Esc closes it wherever the focus is (`app/keys.ts` asks the routing's `dismissModal` first). Game hotkeys are off while it's open, and Retry skips it.
- **The M1 radio ticker (D026)** is not the dialogue system (T302). `content/radio/<map>.ts` lists a map's radio lines and barks verbatim from its act file, each keyed to a trigger (`firstLeak`, `countdown` for a wave, `unlock` for a tower, `waveStart`, `waveCleared`, `perfectWave` from a wave on, `mapWon`, `mapLost`), with name plates and colors in `content/radio/types.ts` (`SPEAKERS`). `app/radio.ts` (`bindRadio`, bound per battle in `app/battle.ts`) plays each line at most once per battle, from sim events, queued one at a time in a comms panel top-left under the status panel: about 4 s each (longer for long lines), never blocking input. The lines one event plays are a **batch** (D028): staleness is judged on a batch's first line (a batch that waited over 15 s of real time is dropped whole; one that started plays out), and a **reply** (the batch's next line, another speaker) cuts its cue's hold to 2.5 s and shows under it, so Bricks's "It's Wednesday." lands on QUILL's punchline. The `mapWon` and `mapLost` lines never play on the ticker: they're the results card's debrief. `?test=1` turns the radio off so screenshots stay clear; `&radio=1` turns it back on for the specs that assert it. `tools/radioLines.test.ts` checks every line against the act file.
- **Keyboard routing** (one `keydown` listener, `app/keys.ts`, so the rule lives in one place; its binding table has Space, F, Esc, 1–4, U, S, T, W, and Q; E and the Hold Fire keys join it with their tasks): game hotkeys ([design/core-loop.md §4](../design/core-loop.md#4-controls-desktop-first)) are ignored while focus is in a text input or textarea. When focus is on a button, **Space and 1–4 go to the game hotkey** (the handler calls `preventDefault()` so the button doesn't also activate), unless a modal is open, in which case the modal keeps them. Enter always activates the focused button. Esc first closes a blocking modal (the briefing) wherever the focus is.
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
├── gallery.html                # sprite gallery dev page (second Vite entry)
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
    │   ├── boot.ts  host.ts  router.ts  navigation.ts  runResult.ts  commands.ts  keys.ts  checkpoints.ts
    │   ├── battle.ts  battleSetup.ts  hud.ts  perf.ts   # a battle session; map → SimConfig; HUD signal sync; frame timing
    │   ├── radio.ts            # the M1 radio ticker (D026): plays content/radio/ lines on sim events
    │   ├── settings.ts  log.ts  testHooks.ts    # log.ts: the only console user in src/
    │   ├── testHookTypes.ts    # the __sd shape, DOM-free so smoke specs can import it
    │   ├── gallery.ts          # the sprite gallery page (gallery.html)
    ├── shared/                 # pure utilities
    │   ├── rng.ts  bus.ts  hash.ts  math.ts  time.ts  types.ts
    │   └── architecture.test.ts
    ├── sim/                    # pure, deterministic
    │   ├── index.ts            # public API (createSim lives in sim.ts)
    │   ├── sim.ts  config.ts  state.ts  entities.ts  commands.ts  events.ts  pool.ts  hashState.ts
    │   ├── grid.ts  path.ts    # tile lookups; route following (T103)
    │   ├── economy.ts  towerStats.ts  # sell values, bounties, call bonus; the HUD's tower stat line
    │   ├── tick.ts             # system order, TickContext
    │   ├── determinism.test.ts
    │   ├── __fixtures__/       # test helpers: a sim over the content fixture map
    │   ├── systems/            # applyCommands, waves, triggers, status, abilities, movement, towers, projectiles, cleanup
    │   ├── behaviors/          # tower attack kinds (hitscan, projectile, lobbed, beam, chain, pulse, spawner)
    │   ├── abilities/          # enemy ability kinds (blink, burrow, gather, jam, hush, …) and commander abilities
    │   └── headless.ts         # runHeadless() and the scripted-build executor (headlessTracker.ts: run tallies, invariants)
    ├── content/                # pure data
    │   ├── types.ts  compiled.ts  define.ts  registry.ts  validate.ts  content.test.ts
    │   ├── validateMap.ts  validateWaves.ts  validateThreats.ts  validateScripts.ts  validateBuilds.ts
    │   ├── compile.ts  compileTower.ts  compileMap.ts  compileBuilds.ts  compileHelpers.ts
    │   ├── __fixtures__/       # test-only content (fixture towers, enemies, ability, map)
    │   ├── towers/  enemies/  abilities/  maps/<id>/  upgrades/  codex/
    │   ├── rules.ts            # rule data: damage matrix, stacking caps, aura kinds, jam limits, counters
    │   ├── presentation.ts     # per-act presentation dials
    │   ├── campaign.ts         # campaign map order (mirrors story/campaign.md)
    │   ├── radio/              # the M1 radio ticker's line tables, by map (D026); dialogue/ replaces it at T302
    │   ├── dialogue/           # flags.ts speakers.ts types.ts scenes/ barks/ memos/ epilogue/ tips.ts results.ts bricks_tags.ts
    │   ├── palettes/           # master.ts, factions.ts, env.ts, index.ts, color.ts
    │   └── sprites/            # types.ts legend.ts defineSprite.ts helpers.ts validate.ts index.ts; tiles/ props/ towers/ enemies/ projectiles/ fx/ (later icons/ portraits/ ui/)
    ├── story/                  # pure: runner.ts conditions.ts flags.ts barks.ts text.ts counter.ts codex.ts inbox.ts epilogue.ts presentation.ts tags.ts
    ├── meta/                   # save.ts, migrations.ts, codec.ts, store.ts, progression.ts, modifiers.ts, shop.ts, __fixtures__/
    ├── balance/                # pure: harness.ts (plan, run, judge), checks.ts (the assertions), refusals.ts (checks not possible yet), rules.ts (bands, seeds, budgets), profile.ts (profile → SimConfig), policies.ts, report.ts
    ├── render/
    │   ├── scale.ts  iso.ts  depth.ts  layers.ts  motion.ts   # motion.ts: reduced motion (cached) and the 1 Hz pulse phase
    │   ├── scenes/             # BootScene, BattleScene, StarMapScene, BackdropScene
    │   ├── views/              # ViewPool; pooled EnemyView, TowerView, ProjectileView, FxView; CoreView, GroundView, PlacementView
    │   ├── sprites/            # rasterize.ts bake.ts atlas.ts (pure), canvas.ts, SpriteSource.ts, CodeSpriteSource.ts
    │   ├── vfx/                # particles, glow, bloom, lighting overlay, range rings (overlayPixels.ts, overlayTextures.ts), menu backdrop (backdropPixels.ts)
    │   ├── input/              # pointer → intents → commands (intents.ts, BattleInteraction.ts)
    │   └── __fixtures__/       # devBattle.ts: the dev battle content (stands in until a live map is playable)
    ├── ui/
    │   ├── theme.css           # tokens from the master palette, act themes
    │   ├── state.ts            # signals / view models
    │   ├── motion.ts  color.ts # the cached reduced-motion query; palette names as CSS tokens
    │   ├── Overlay.tsx         # overlay root: mountUi() and the current screen
    │   ├── components/         # Panel, Button, Icon, Portrait, …
    │   ├── hud/                # TopBar, BuildBar, TowerPanel, BossBar
    │   └── screens/            # Title, Results (+ state.ts, format.ts, countUp.ts, screens.css); later Loadout, Shop, Codex, Dialogue, Settings
    └── audio/                  # M2+: synth.ts, sfx.ts, music.ts
```

Unit tests sit next to their source as `*.test.ts`.

---

## Open questions

1. **Mid-map saves.** Checkpoints (§2) live in memory, so closing the tab mid-map loses the run. Persist the latest checkpoint (seed, config, and command log prefix) to the save if maps grow longer than about 15 minutes (the finale may: [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules))?
2. **Visual regression.** Smoke tests capture screenshots but don't diff them. Turn on Playwright `toHaveScreenshot` once the art stabilizes (M3+)?
3. **TypeScript 7 tooling.** If oxlint's type-aware rules (including `no-restricted-properties` for the banned `Math` members) or editor tooling prove immature, fall back to TS 6 plus typescript-eslint (§1). The architecture test covers the determinism ban either way.
