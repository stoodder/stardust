# Conventions

How to write code and content for Stardust, and how to prove it works. The module layout and the sim/render split are in [architecture.md](architecture.md). The workflow that runs these checks is in [CLAUDE.md](../../CLAUDE.md) (step 5, the test loop). **This doc is the detailed home of the test loop.**

---

## TypeScript style

**Compiler options** (`tsconfig.base.json`): `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `isolatedModules`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `noEmit`, `module: "esnext"`, `moduleResolution: "bundler"`, `target: "es2023"`.

Rules:

- **No `any`.** Use `unknown` and narrow it. `as` casts are allowed only at validated boundaries (content compile, save load), with a comment. A non-null `!` needs a comment saying why it's safe.
- **Erasable syntax only:** no `enum`, no `namespace`, no constructor parameter properties. Use `as const` objects and string-literal unions. (This is what lets Node run `.ts` files directly.)
- **Discriminated unions** for commands, events, behaviors, abilities, and dialogue nodes, with an exhaustive `switch` ending in `assertNever(x)`.
- `interface` for object shapes, `type` for unions and aliases.
- **Named exports only**, no default exports. The only `index.ts` barrels are module public APIs (`src/sim/index.ts`) and content registries.
- **Relative imports with the `.ts` extension**, `import type` for type-only imports, and no path aliases ([architecture.md §5](architecture.md#5-build-test-and-deploy)).
- **Pure modules** (`sim`, `content`, `story`, `shared`) have **no module-level mutable state**. Everything lives in an explicit state object, so many sims can run in one process.
- Functions and plain data in pure modules. Classes are fine where the framework wants them (Phaser scenes, views).
- Content and compiled definitions are `readonly`. The sim exposes its state as `DeepReadonly<SimState>`.
- **Units go in the name** wherever a number has a unit: `rangeTiles`, `ratePerSec`, `speedTilesPerSec` in content, and `cooldownTicks` and `speedTilesPerTick` in compiled sim data (the tile is the sim's distance unit). Credits, HP, and damage are integers.
- Comments explain *why*, not *what*. Public functions of a module get a one-line TSDoc.

## Naming

| Thing | Style | Example |
|---|---|---|
| Code file (module of functions) | `camelCase.ts` | `rasterize.ts`, `applyCommands.ts` |
| File whose main export is a class or component | `PascalCase.ts(x)` | `BattleScene.ts`, `BuildBar.tsx` |
| Content file | `<id>.ts` (snake_case, matching the id) | `towers/example_blaster.ts` |
| Unit test | next to the source, `*.test.ts` | `path.test.ts` |
| Smoke test | `smoke/*.spec.ts` | `smoke/battle.spec.ts` |
| Types and interfaces | `PascalCase` | `SimState`, `TowerDef` |
| Functions and variables | `camelCase`, functions start with a verb | `spawnEnemy`, `towerAt` |
| Booleans | `is` / `has` / `can` prefix | `isAlive`, `canAfford` |
| Constants | `SCREAMING_SNAKE` | `TICK_HZ`, `TILE_W` |
| Content ids | `snake_case`, unique per kind | `example_blaster`, `a1_m01` |
| Map ids | `a<act>_m<nn>`, with `fin_m<nn>` for the finale and `ch_<name>` for challenge maps | `a1_m01`, `a3_m04` |
| Sprite ids | `<category>.<id>` | `enemy.example_mite`, `icon.tower.example_blaster` |
| Story flags | `snake_case`, declared in `content/dialogue/flags.ts` | `spared_quiet_wave` |
| Events and commands | `PascalCase` event names, `camelCase` command types | `EnemyDied`, `{ type: 'build' }` |

## File layout

- **One definition per content file**, registered in that folder's `index.ts`. Never use `import.meta.glob`. Registries are explicit so that Node can load them.
- A system or behavior gets its own file in `sim/systems/`, `sim/behaviors/`, or `sim/abilities/`, with its test beside it.
- Keep files under about 300 lines. Split by responsibility, not by layer.
- Nothing outside a module imports another module's internals. Cross-module imports go through the allowed edges in [architecture.md §4](architecture.md#4-other-modules).

---

## Recipes

Every recipe ends with **the test loop** (below) and **updating the docs** (CLAUDE.md step 7). The example ids are illustrative; real rosters live in the design docs.

### Add a tower

1. **Confirm the design.** The tower must exist in [design/towers.md](../design/towers.md) (role, tiers, specializations, unlock). If it doesn't, stop and ask the orchestrator; don't invent towers.
2. **Sprites** in `src/content/sprites/towers/<id>.ts`: a base with `t1`, `t2`, `t3`, `spec_a`, and `spec_b` frames; a head with at least SE and NE facings (mirrored to 4); a `fire` animation; and a 16×16 `icon.tower.<id>`. Add a projectile sprite in `sprites/projectiles/` if the tower needs a new one. Register them in `sprites/index.ts`. Format: [art/tech-spec.md §2](../art/tech-spec.md#2-code-generated-pixel-art-format).
3. **Data** in `src/content/towers/<id>.ts`. The shape is `TowerDef` in [`src/content/types.ts`](../../src/content/types.ts).
   ```ts
   export const exampleBlaster = defineTower({
     id: 'example_blaster',
     faction: 'everglow',
     role: 'Single-target DPS',
     sprites: { base: 'tower.example_blaster', head: 'tower.example_blaster_head', icon: 'icon.tower.example_blaster' },
     tiers: [
       { cost: 100, targets: { ground: true, air: false }, defaultPriority: 'first',
         attack: { kind: 'projectile', projectile: 'projectile.rivet_small', speedTilesPerSec: 8,
                   type: 'kinetic', damage: 6, ratePerSec: 1.6, rangeTiles: 2.5 } },
       { cost: 80,  attack: { damage: 9 } },                  // later tiers patch the previous tier
       { cost: 140, attack: { damage: 14, rangeTiles: 2.75 } },
     ],
     specs: {                                                 // tier 4: one R&D purchase unlocks both
       a: { name: 'Overcharge', cost: 300, attack: { damage: 30, ratePerSec: 0.8 } },
       b: { name: 'Rapid',      cost: 300, attack: { ratePerSec: 4 }, effects: [{ status: 'chilled', pct: 0.1, durationSec: 1 }] },
     },
   });
   ```
   Tiers 2 and 3 patch the tier before, and specs patch tier 3 (`compileContent()` resolves them; the merge rule is in `src/content/compile.ts`). A tier may also change `targets` or `defaultPriority`. Numbers come from towers.md. Modifiers stack by the design formula (flat first, then summed percentages; see [architecture.md §2](architecture.md#sim-public-api)).
4. **Register** it in `src/content/towers/index.ts`. Its synergy links (towers.md §6.2) go in `src/content/links/<link>.ts` via `defineLink({ id, name, partners: [{ tower, bonuses }, { tower, bonuses }] })` (`LinkDef` in `types.ts`), registered in `links/index.ts` (append: registry order is each link's bit).
5. **New behavior?** If the attack `kind` doesn't exist yet (for example `chain`), add `src/sim/behaviors/<kind>.ts`, add its variant to `AttackDef`, and write `<kind>.test.ts` (damage, cooldown, range edge cases, targeting modes, jammed state, hold fire, determinism).
6. **New visuals?** Add the projectile or beam handling in `render/views/ProjectileView.ts`, following [art-direction.md §7](../art/art-direction.md#7-vfx).
7. **Unlock** it through progression content (`content/upgrades/`), per [design/progression.md](../design/progression.md).
8. **Test loop:** `npm run check`. While tuning, run `npm run sim -- --map <id>` for each map whose builds or reference profile include the tower.

### Add an enemy

1. **Confirm the design** in [design/enemies.md](../design/enemies.md): abilities, counters, and **tell ids** from the vocabulary in [art-direction.md §8](../art/art-direction.md#8-readability-and-enemy-ability-tells). A new kind of tell must be added to that table first.
2. **Sprites** in `src/content/sprites/enemies/<id>.ts`: SE and NE walk cycles (mirrored to 4 facings), the faction palette, and a death animation (or the faction's shared one; Skitterkin death VFX vary by act).
3. **Data** in `src/content/enemies/<id>.ts` via `defineEnemy({ id, faction, body, layer, hp, armor, shield?, speedTilesPerSec, leak, bounty, spawnIntervalSec, traits: [...], tells: [...], sprites })` (`EnemyDef` in [`src/content/types.ts`](../../src/content/types.ts)). Column meanings and numbers come from the roster tables in enemies.md.
4. **New ability?** Add its shape to `EnemyDef` (the first enemy with an ability adds the field), then `src/sim/abilities/<kind>.ts` as a state machine (`idle → telegraph → active → cooldown`), with the telegraph time as data, and implement interrupts (Stasis, Unnerved) per [design/enemies.md §2.4](../design/enemies.md#24-status-effects). **Jamming** must follow [design/enemies.md §4](../design/enemies.md#4-tower-disabling-jamming): its minimum tell, maximum duration, post-jam immunity, and exhaustive source list (a new jammer needs a decision entry). `content/validate.ts` enforces the numeric limits from `content/rules.ts`. Write tests for the full cycle, including interrupts, and that a jam never removes or damages a tower.
5. **Codex entry** in `src/content/codex/<id>.ts` (voice per [story/style-guide.md](../story/style-guide.md)).
6. **Register** it, add it to waves, and run `npm run check`, plus `npm run sim -- --map <id>` for every map whose waves include it.

### Add a map

1. **Confirm the design:** [design/maps.md](../design/maps.md) (tile legend, layout intent, per-act targets, the one new thing this map introduces) and [story/campaign.md](../story/campaign.md) (beats, unlocks, companion, choices). Add the map id to `content/campaign.ts` in campaign order.
2. **Create `src/content/maps/<id>/`** with four files. Together they form one `MapDef` ([`src/content/types.ts`](../../src/content/types.ts)). The id and values below are illustrative; they are not A1M1's.
   - **`map.ts`**: layout and rules.
     ```ts
     export const map = defineMapLayout({
       id: 'example_map', act: 1, env: 'act1', objective: 'defend',
       size: { cols: 10, rows: 5 },
       // prettier-ignore
       tiles: [                     // legend: design/maps.md §3 (# path, o pad, ^ high ground,
         '..........',              //   + power node, x wreckage, . decor, S spawn, C core)
         'S####oo^..',
         '.oo.#o..x.',
         '..+.#####C',
         '..........',
       ],
       paths: [{ id: 'a', tiles: [[0,1],[1,1],[2,1],[3,1],[4,1],[4,2],[4,3],[5,3] /* … */, [9,3]] }], // S, every #, C (maps.md §4)
       markers: { peeker: [1, 0] },                       // named decor tiles for scripts
       underWreckage: { '8,2': 'o' }, salvage: { '8,2': 40 },
       startCredits: 300, coreIntegrity: 20, stardust: 0,
       towerUnlockWave: { example_mortar: 3 },            // unlocks when W3's countdown starts
       threatIntel: ['fast'],                             // every trait in waves.ts
       requiredCounters: [],                              // A1M1 requires none; ≤ 3, each with a noCounterBuild
       medals: { challenge: { id: 'one_mortar', name: 'Mortar Minimalist',  // required on campaign maps
         description: 'Win with at most one mortar.', condition: { towers: { tower: 'example_mortar' }, lte: 1 } } },
       objectives: [{ id: 'clean_w4', condition: { stat: 'integrityLost', lte: 0 }, intel: 1 }], // M3: createSim refuses objectives until then
       companion: { id: 'bricks', state: 'present' },     // or { pick: [...] }, or null
       events: [{ id: 'w03_radio', on: { wave: 3, phase: 'start' }, actions: [{ cue: 'example_map_w03' }] }],
     });
     ```
   - **`waves.ts`**: `defineWaves([...])`, one entry per wave (`countdownSec` defaults by act) with its groups: `enemy`, `count`, `route` (a path, air-lane, or rift-lane id, which also fixes the spawn), and optionally `intervalSec` (default: the enemy's `spawnIntervalSec`), `delaySec`, and `tags`.
   - **`builds.ts`**: `defineBuilds({ ... })` with `referenceProfile`, `parBuild`, `noCounterBuilds` (one per required counter), `altBuilds` (at least 2 from A1M4), and optionally `flagVariants` and `guards` (see [Balance sims](#balance-sims-npm-run-sim)).
   - **`index.ts`**: `export const exampleMap = defineMap({ ...map, waves, ...builds })`.
3. **Register** the map in `src/content/maps/index.ts`. The content test runs every check in [architecture.md § Validation](architecture.md#validation): geometry, threat intel and required counters, the new-threat limits, revisit rules, builds, and the par-purchasable check.
4. **Dialogue cues and scripts:** map `events` are triggers with actions ([story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes)); a `cue` action emits an id (`<map_id>_wNN` for wave cues) that story content binds to a scene or bark (next recipe). Story moments that change play (revocation, pivot, forced input, clickable objects, allies, timers, checkpoints) are script actions too, never special-case code. If a script reads a story flag, add a `flagVariants` entry to `builds.ts` for each value that changes the sim.
5. **Tune** with `npm run sim -- --map <id> --report` until it passes. Read the per-wave leak table, the per-tower damage, and the link-uptime column, not only the verdict.
6. **Test loop:** `npm run check`. The "every map boots" smoke test picks up the new map automatically. Look at its screenshot.

### Add dialogue

1. **Read** [story/style-guide.md](../story/style-guide.md) (format, voice, tone per act, length limits), [story/characters.md](../story/characters.md) (speaker voices), and the map's beat in [story/campaign.md](../story/campaign.md).
2. **Scenes** go in `src/content/dialogue/scenes/<act>/<scene_id>.ts` (`defineScene`, a list of `line` / `choice` / `branch` / `set` / `end` nodes; ids per style-guide §5.3). **Barks** go in `src/content/dialogue/barks/<trigger>.ts` (`defineBarks`, keyed to a trigger id from [design/core-loop.md §6.3](../design/core-loop.md#63-barks), with conditions and cooldowns). **Memos**, **codex versions**, **epilogue cards**, **loading tips**, and **results lines** have their own folders and files ([architecture.md §3](architecture.md#3-content-srccontent)).
3. **Bind** it to a trigger: a map `cue`, a bark trigger, or a menu event. An optional bark button ("Who's there?") is a `button` on the bark ([story-runtime.md § Barks](story-runtime.md#barks)); it never blocks play.
4. **New flags** are declared in `src/content/dialogue/flags.ts` with a type and a one-line description, so typos fail validation. Flags derived from play (like `spared_quiet_wave`) are run-end rules in the same file.
5. Speakers and portrait expressions must exist (the content test validates them). Use the tokens in [story-runtime.md § Text substitution](story-runtime.md#text-substitution) (`{name}`, `{callsign}`, pronouns, `{v:are|is}`, `{pests_processed}`, `{evacuated}`, `{glyph:sun}`); never hard-code the protagonist's name, pronouns, or callsign. QUILL's directive lines use "(Per policy.)" and the `policy` expression together. Silence is a line with `text: ''` and `durationSec`.
6. The content test enforces the rules in [story-runtime.md § Validation](story-runtime.md#validation): lengths after worst-case substitution, the protected `{name}` rule, QUILL's tell, and the exclamation budget. If a line fails a length check, split it into two lines; don't raise the limit.
7. **Test loop:** `npm run check`. If the change adds a choice or a new node kind, add a story runner test and extend the dialogue smoke flow, then look at the screenshots.

---

## The test loop

Run this after implementing and **before any review** (D002). It's also re-run after every round of review fixes, and once more before shipping a milestone. **The loop is done only when everything is green.**

### What to run

| Change touches | Run |
|---|---|
| Anything in `src/`, configs, or `tools/` | **`npm run check`** (the whole gate) |
| Docs only (`docs/`, `CLAUDE.md`, `tasks.md`, `.claude/`) | **`npm run check:docs`**, plus the manual consistency pass below |
| Inner loop while coding | `npm run check:fast`, `npm run sim -- --map <id>`, `npm run smoke -- -g <flow>`. These are shortcuts, not the gate. |

`npm run check` runs, in this order (fail fast): **`typecheck` → `lint` → `test` → `build` → `sim` → `smoke` → `check:docs`**. The scripts are defined in [architecture.md §5](architecture.md#5-build-test-and-deploy). Budget: the whole gate under 5 minutes.

**Run one `npm run check` at a time** per checkout: parallel runs (two agents, say) share `dist/` and the smoke server's port 4173, so one run's build or server breaks the other's smoke step. `npm run smoke` on its own tests whatever `dist/` holds now, so run `npm run build` first. `SMOKE_PORT=<n>` moves the smoke server to another port; it doesn't separate `dist/`.

### Red means stop

- Fix the cause. **Never weaken, skip, `.only`, or delete a test, loosen a balance band, or add a console allow-list entry just to get green.** If a band or expectation is genuinely wrong, change it deliberately, say why in the commit message, and get it past the gameplay reviewer.
- If you can't get to green within the task's scope, mark the task `[!]` in your report and say exactly what's failing.

### Unit and sim tests (`npm test`)

Vitest, Node environment, tests next to the source. It covers everything listed under [Testing](#testing), including the content validation test, the determinism test on a fixture map, save migrations, and the architecture boundary test. Target: under 20 s.

### Balance sims (`npm run sim`)

`tools/sim.ts` is the CLI over `src/balance/`. It loads the content in plain Node and runs each map's scripted builds headlessly through `runHeadless()` ([architecture.md § Sim public API](architecture.md#sim-public-api)). With no arguments it checks **every map in campaign order**. Use `--map <id>` while tuning (it skips assertion 3, which needs the earlier maps), `--seeds <n>` to run the every-seed assertions on seeds 1–*n* (the seeds 1–3 ones use 1–min(3, *n*)), `--build <name>` to keep only the assertions about one build (`par`, `none`, `alwaysCallEarly`, `parNoAbilities`, `spareFleeing`, `holdFireWhile:quiet_wave`, an alt build's name, a `requiredCounters` category, or a guard's name) plus the runs they compare against, and `--report` to write `reports/balance.{json,md}` (gitignored).

The **design rules** behind these assertions (par margins per act, monotonic difficulty, counters matter, the forgiving floor, the jam limit, fair early calls, meta can't replace counters) are owned by [design/maps.md §6](../design/maps.md#6-difficulty-curve) and [§6.4](../design/maps.md#64-balance-harness). This section defines how the harness checks them. **"Par build" and "reference strategy" mean the same thing.** The M1 subset of these assertions is listed in [architecture.md](architecture.md#architecture).

**What it asserts, per map:**

| # | Assertion | Difficulty | Seeds |
|---|---|---|---|
| 1 | The **par build wins** | Standard | every seed (default 1–5) |
| 2 | The **par margin** is **inside the band** `[act target, act target + 20 points]`. Defend and Protect maps measure core integrity % against the act target; Escort and Choir maps measure Evacuated % (or Voices %) against the escort target. Both targets are owned by [maps.md §6.1](../design/maps.md#61-per-act-targets). The upper bound catches maps that are trivial for the intended solution. A map may override its band in `builds.ts` with a comment saying why. | Standard | every seed |
| 3 | **Monotonic difficulty:** the median par margin is ≤ the previous map's in the **same chain** + 5 points. Integrity maps and escort maps are separate chains. A map may set `rebaseline: true` (the first map after a boss) | Standard | median |
| 4 | **Doing nothing loses** (built-in `none` policy: no towers, no abilities) | Standard | seed 1 |
| 5 | **Counters matter:** every entry in `noCounterBuilds` (one per `requiredCounters` entry) **loses before the final third** of waves | Standard | seeds 1–3 |
| 6 | **Meta can't replace counters:** every `noCounterBuilds` entry still loses with the **full-catalog profile** (every shop and R&D upgrade in the game at max rank, and every protocol slot filled, equipping the protocols **Head Start**, **Emergency Bulkhead**, and **Linked Up**; [progression.md §10](../design/progression.md#10-pacing-targets-and-tuning-assumptions) owns the rule), whatever the map's real reference profile | Standard | seeds 1–3 |
| 7 | **Early calls stay fair:** the par build run with `alwaysCallEarly` (it calls each wave the moment its countdown starts) has a margin **≤ `min(band top, par margin + 10)`**, against the par margin on the same seed | Standard | seeds 1–3 |
| 8 | **Forgiving floor:** each of the `altBuilds` (sensible non-par builds; at least 2 from A1M4, each sharing ≤ 2 tower types with par) wins with margin ≥ 20%. An alt build's entry in `altExpectations` adds a stricter floor (`minMarginPct`), requires a margin **below par's** on the same seed (`belowPar`), or marks it **under-built** (`outcome: 'lose'`: it must lose; `'either'`: no outcome is required), which replaces the forgiving floor | Standard | seeds 1–3 |
| 9 | **Story difficulty:** the par build wins with margin ≥ its Standard median | Story | seed 1 |
| 10 | **Jam limit:** with the par build, no tick has more than 25% of towers jammed ([enemies.md §4](../design/enemies.md#4-tower-disabling-jamming)) | Standard | every seed |
| 11 | **Determinism:** seed 1 run twice gives an identical `sim.hash()` and result | Standard | seed 1 |
| 12 | **No invariant violations** (headless runs enable debug checks: no NaN, credits ≥ 0, the credits ledger holds (credits = start + earned − spent + refunded), entities inside the map, loadout ≤ 4, towers only on buildable tiles with the tile map and the tower pool agreeing, no wave's remaining count below 0, no tower ever damaged or removed by an enemy, no ally attack on a `quiet_wave`, `youngling`, or `fleeing` unit, no shot from a tower holding fire, no tower with the spare-runners filter firing at a `fleeing` or `youngling` unit as its target, at most one hush per Hollow unit) | all | all runs |
| 13 | **Runtime:** each run finishes within 2 s wall time (a 25-minute finale is about 90,000 ticks) | all | all runs |
| 14 | **Flag variants:** for every `flagVariants` entry (each value of a story flag the map's scripts read, for example `door_choice`, `quill_choice`, `spared_quiet_wave`), the par build passes assertions 1–2 with that flag set | Standard | seeds 1–3 |
| 15 | **Companion pick list:** on a map whose `companion` is a pick list (the finale), the par build passes assertions 1–2 with each companion | Standard | seeds 1–3 |
| 16 | **Free choices stay free:** (a) maps with a medal-exempt story wave (A1M5's Quiet Wave) also run the par build with a `holdFireWhile: 'quiet_wave'` step. It must win inside the band, and the run-end rules must set `spared_quiet_wave = true`. (b) Maps with `fleeing` groups also run the built-in `spareFleeing` policy (the par build with the spare-runners filter on for every tower from W1). Its margin must be **≥ par margin − 5** on the same seed | Standard | seeds 1–3 |
| 17 | **Holdout:** instead of 1–2, the par build's Evacuated is ≥ the map's `evacuatedFloor`, and the map ends through its scripted forced input, never through integrity 0 | Standard | every seed |
| 18 | **Song timing (finale):** Phase 2 lasts within the tolerance of its target time set in [maps.md §6.4](../design/maps.md#64-balance-harness), under each `quill_choice` variant | Standard | seeds 1–3 |

The **par-purchasable** check (every par build's reference profile can be bought by that point in the campaign) is static, so it runs in the content test, not here ([architecture.md § Validation](architecture.md#validation)).

**How the harness judges** (`src/balance/checks.ts`, `refusals.ts`, and `harness.ts`; the numbers live in `src/balance/rules.ts`):

- **Margin** is integrity left ÷ max integrity × 100 for every run, so a loss is 0. Max integrity is what the run starts with after its modifiers (Reinforced Core's ranks, Story's 30).
- **Run labels** name a build and, after `@`, the profile it runs on when that isn't the reference profile on Standard: `par@story` (assertion 9) and `noCounter:<category>@fullCatalog` (assertion 6). These checks keep the build as their subject, so `--build par` or `--build armor` keeps them.
- **Assertion 6** runs each no-counter build on the full-catalog profile (seeds 1–3) and passes on any loss. Its summary lists the catalog grants the sim doesn't simulate yet, which the profile leaves out (now only Salvage Rights, until wreckage in M3; see *Profiles* below).
- **Assertion 9** runs par on Story (seed 1) and compares it with the median of par's Standard margins over every seed.
- **Assertion 5's "before the final third"** means the last wave started when the map is lost is ≤ ⌊⅔ × waves⌋. Its premise is checked too (`counterChecks.ts`, needing no run): the no-counter build carries no answer to its category, judged by the same model as the content validator (`src/content/counterAnswers.ts`: the tiers and specs its towers reach and the abilities it casts; [design/enemies.md §3.1](../design/enemies.md#31-counter-categories)).
- **Assertion 7** also requires `alwaysCallEarly` to **win**. When par's margin is within 10 points of 100 on every seed (par ≥ 90 in Act I), the cap is 100 and the fairness bound can't fail, so the summary says so ("the fairness bound is vacuous; only the win is checked") rather than passing silently.
- **Abilities matter** (check `abilities`): when the par build casts a commander ability, the par build with its `ability` steps removed (`parNoAbilities`; the slot stays equipped) must end with a margin **below par's** on the same seed, on seeds 1–3. A cast that changes nothing fails it.
- **Alt build expectations** live with the builds, in `altExpectations` ([maps.md §6.4](../design/maps.md#64-balance-harness)). A1M1's: `rivet_only` wins below par and at ≥ 40%, `par_minus_last` (par one purchase short) wins at ≥ 40%, and two under-built alts: `no_upgrades` (`outcome: 'either'`) and `two_rivets` (`outcome: 'lose'`). The validator rejects an expectation for a build the map doesn't have, an empty one, and an `outcome` combined with `minMarginPct` or `belowPar`.
- **No single-wave wall** (check `gradual`, every alt build, seeds 1–3; [maps.md §6.1](../design/maps.md#61-per-act-targets)): no wave of the run costs more than 50% of max integrity, and a run that loses has leaked in an earlier wave than the one it loses in. Its summary lists the integrity lost per wave. The judge is `notGradual()` in `checks.ts`, and its numbers (`MAX_WAVE_LOSS_PCT`, `LEAK_LEAD_WAVES`) are in `rules.ts`.
- **A1M1's robustness test** (`src/balance/a1m1.test.ts`, part of `npm test`) re-runs the whole harness on A1M1 with each of W5–W7's clumps shifted ±0.1 and ±0.2 s apart, and expects every check to pass, so the tuning can't rest on a cliff. Every check includes the alt builds' `gradual` checks, so the under-built alts can't hit a wall under a shift either. It also checks that three setup Rivets and nothing else (a reference that isn't an alt build) lose no earlier than W6 and pass the same `notGradual()` judge, and that W7's strike is worth 4–6 integrity to par.
- **Assertion 16** (`freeChoiceChecks` in `checks.ts`, seeds 1–3; checked on the fixture map in `src/balance/__fixtures__/fireControl.ts` until a live map has these groups): (a) on a map with a `quiet_wave` group, the run `holdFireWhile:quiet_wave` (par with the macro armed before W1, `withHoldFireWhile`) must win with its margin in band, and every `quiet_wave` unit that spawned must leak. Until the run-end flag rules exist (T206b), that full leak stands in for `spared_quiet_wave = true`, since it meets any share threshold. (b) On a map with a `fleeing` group, the `spareFleeing` run's margin must be ≥ par's − `SPARE_FLEEING_SLACK_PCT` (5) on the same seed.
- **Par earns its medals** (check `medals`, every seed; `src/balance/medals.ts`): when a map's builds list `parMedals` (for example `['challenge']`), the par build must earn each of them on every seed. A1M1's par earns its Teamwork medal. Medals themselves are the sim's ([architecture.md § Medals](architecture.md#medals)).
- **Build steps run cleanly** (checked on every run, beside 12 and 13): no step errors, and the par and alt builds get every step in before the map ends.
- **Refused, not skipped:** a map that needs an assertion the harness can't make yet fails with a "refused" check that names the task it waits for. That covers non-integrity objectives, `flagVariants`, and jammers. `HARNESS_GATES` in `src/balance/refusals.ts` names the task that lifts each map-feature refusal. A profile that `meta/modifiers.ts` refuses (an unknown item, too many protocols) or a config the sim refuses (a gated feature) fails each run that needs it, with the reason.

**Report.** Always printed: per map, a PASS/FAIL verdict, each assertion with its summary and every failing seed, then a leaks-per-wave table for the first seed of each build with its result, credits left, and medals (`V P C`, with `·` for each one not earned). `--report` also writes `reports/balance.json` (every run in full) and `reports/balance.md`: the assertion table; a runs table (build, seed, result, margin, ticks, credits left, late steps, medals, **link uptime**: each link's active ticks from `stats.linkTicks` as a share of the run, hash, wall time); and, for the first seed of each build, a **per-wave table** (spawned, killed, leaked, integrity lost, the bank as the build phase opened, credits unspent as the wave started, early-call bonus, late steps) and a **per-tower table** (tile, tier, built tick, shots, kills, **damage**, and **DPS**). Damage is the HP the tower's hits took (`ProjectileHit.damage`, summed by the run tracker; shield-absorbed damage and overkill don't count), and DPS is that damage over the tower's whole life, from its build to its sale or the end of the run, build phases included. Under the tower table: ability kills, ally kills (Bricks's post), and link uptime; jam uptime reads "none" until jammers exist. Exit code 1 on any failure.

Optional **guards** catch known cheese: built-in policies such as `spamCheapest` (the cheapest loadout tower on every pad), listed under `guards` in `builds.ts` with an expectation (`lose`, or `maxMarginPct`).

**How the par build is encoded.** The par build is the designer's *good but not optimal* solution ([maps.md §6.4](../design/maps.md#64-balance-harness)), written as data in `src/content/maps/<id>/builds.ts`:

```ts
export const builds = defineBuilds({
  referenceProfile: {                         // what a Standard player owns here (progression.md §10)
    towers: ['example_blaster', 'example_slower', 'example_mortar'],
    specs: ['example_blaster'],               // both tier-4 specs of these towers are unlocked
    shop: { tuneup_damage: 1, reinforced_core: 1 },
    protocols: [],
    technicianAbility: 'orbital_strike',
  },
  parBuild: {
    loadout: ['example_blaster', 'example_slower', 'example_mortar'],   // ≤ 4, all from the profile
    callEarly: false,
    steps: [
      { wave: 1, build: 'example_blaster', tile: [5, 1] },
      { wave: 1, build: 'example_blaster', tile: [7, 1] },              // high ground
      { wave: 2, clear: [8, 2] },                                       // send the salvage drone
      { wave: 2, upgrade: [5, 1] },                                     // towers are addressed by tile
      { wave: 3, build: 'example_mortar', tile: [2, 3] },               // unlocked at wave 3 (power node)
      { wave: 4, ability: 1, target: [4, 2], when: 'waveStart' },       // commander ability, slot 1
      { wave: 5, specialize: [5, 1], spec: 'a' },
      { wave: 6, targeting: [7, 1], mode: 'strong' },
    ],
  },
  noCounterBuilds: {                          // keys = the map's requiredCounters
    splash: { loadout: ['example_blaster', 'example_slower'], steps: [/* … no splash … */] },
  },
  altBuilds: {
    slow_heavy:   { loadout: [/* … */], steps: [/* … */] },
    mortar_heavy: { loadout: [/* … */], steps: [/* … */] },
  },
  altExpectations: { slow_heavy: { belowPar: true, minMarginPct: 40 } },   // optional, per alt build
  parMedals: ['challenge'],                   // optional: medals par must earn on every seed
  guards: { spam: { policy: 'spamCheapest', expect: 'lose' } },
});
```

Step semantics, implemented by the scripted-build executor in `src/sim/headless.ts`:

- Steps run **strictly in order**. A step becomes eligible when the build phase before its `wave` begins (`wave: 1` is the pre-game build phase; the phase before wave N opens when wave N − 1 finishes spawning). It's issued as a normal `Command` **the first tick it's affordable** (and its tower is unlocked), and later steps wait behind it, so builds stay valid through small cost changes. Buying the moment the bank covers a step matters: the previous wave's bounties keep arriving during the countdown, and buying only at its end leaks ([D021](../decisions.md#d021--2026-11-09--t105b-waves-economy-and-the-end-of-a-map)). A step still waiting when its wave starts goes in as soon as it can, and the report counts it as **late**.
- The executor applies each command at once with `applyPending()` (identical to applying it at the start of the next tick), so the next step sees its effect. Wave 1 starts once the setup's affordable steps are in.
- An `ability` step waits for its moment, then for the slot's cooldown: with no `when`, as soon as it's eligible; `waveStart`, the first tick after its wave starts; `{ afterSec }`, that long after its wave starts.
- An `upgrade`, `sell`, or `targeting` step with no tower on its tile, or a command the sim rejects, is recorded as a **step error** and the build continues (the harness fails on any). Step kinds the sim has no command for yet (`specialize`, `clear`, `interact`, `scriptInput`) make the executor throw until their tasks land.
- Step kinds map one-to-one onto commands: `build`, `upgrade`, `specialize`, `sell`, `targeting`, `holdFire` (by tile or `'all'`), `spareRunners` (by tile or `'all'`), `ability` (with an optional `when: 'waveStart' | { afterSec }`), `clear` (wreckage), `callWave`, `interact` (click a marker as soon as it's clickable; without the step, the marker's fallback trigger fires), and `scriptInput` (presses a forced input as soon as it is requested). After a scripted revocation, steps for the revoked class are skipped and the build continues.
- **One macro step:** `holdFireWhile: <tag>` issues plain `holdFire 'all'` on when the first unit of that tag spawns and off when the last one dies or leaks. It's what a player does by hand, so the run stays a plain command log. Reaching the step arms a watcher and completes the step at once, so later steps don't wait behind it. The watcher reacts like a player: on the tick after the first tagged spawn, and off the tick after the last tagged unit (by the map's group counts) is gone. A rejected toggle is recorded as the step's error.
- `callEarly: true` calls each wave the moment its countdown starts, after issuing whatever steps of that phase are already affordable. The built-in `alwaysCallEarly` policy is the par build with `callEarly: true`.
- `flagVariants` lists the story-flag values to test: `{ door_choice: ['convoy', 'warren'] }`. Each value may override the build's steps and `technicianAbility` where a variant needs a different plan (A3M5 under `quill_choice = rewrite` equips Suppressing Fire, because System Reboot is locked there).
- **Profiles:** `src/balance/profile.ts` turns a profile into a run's modifiers, spec unlocks, and difficulty through `meta/modifiers.ts`'s `metaModifiers`, the same code the game uses on a save, so the harness tests the real progression math ([meta-runtime.md § Meta](meta-runtime.md#meta-srcmeta)). There are three: the map's `referenceProfile` on Standard (every run but two), the same on Story (`par@story`), and the **full-catalog profile** (`fullCatalogProfile`): every ranked shop and R&D upgrade at its top rank, the protocol slots filled with `FULL_CATALOG_PROTOCOLS` (Head Start, Emergency Bulkhead, Linked Up), and the reference profile's spec unlocks (Engineering buys options, not power). It leaves out any grant whose sim gate is still closed and lists it in assertion 6's summary. A run unlocks the profile's specs for its loadout's towers only. `HarnessOptions.catalog` swaps the live catalog for a fixture's in tests. The sim itself never imports `meta/` or `balance/`.
- **Policies** live in `src/balance/policies.ts` and need no authored steps: `none` (no steps), `spamCheapest` (generates a build step for every pad), `alwaysCallEarly` (above), and `spareFleeing` (the par build plus `spareRunners 'all'` on before W1). `withoutAbilityCasts` derives `parNoAbilities` for the abilities check.
- The content test validates builds ([architecture.md § Validation](architecture.md#validation)).
- The same builds drive the smoke tests (`__sd.autoplay('par')`), so one encoding serves both.

### Browser smoke tests (`npm run smoke`)

**Playwright** (`@playwright/test`) with headless Chromium against the **production build** (`npm run preview`, started by Playwright's `webServer`). That way the gate catches build-only breakage. Headless Chromium renders WebGL in software, which is slow but correct.

Why Playwright: it drives a real browser, captures console output and page errors, takes screenshots, and queries the DOM UI by role and text. It's also what agents know best. We don't use Vitest browser mode because it tests components, not the booted game.

**Test hooks.** When the URL has `?test=1`, `src/app/testHooks.ts` exposes `window.__sd`:

| Hook | Does |
|---|---|
| `ready` | A promise that resolves after boot: the title, or the battle's first frame when the URL has `map` or `skipIntro` |
| `state()` | The current battle's live, read-only sim state (string ids), or `null` outside a battle |
| `enqueue(cmd)` | Issues a `Command` through `app/commands.ts`, exactly as the UI would. It applies at the next tick, or at the end of the next frame while paused |
| `setSpeed(n)` | 0, 1, or 2; drives the host loop |
| `autoplay(build)` | Plays a named build from the map's `builds.ts` (`'par'`, `'none'`, `'alwaysCallEarly'`, an alt build) through the host from now on, with the harness's executor: each step is issued before the tick it's due on, at any speed or under `fastForward`. Closes the briefing. Throws outside a battle or for an unknown build |
| `fastForward(ticks)` | Steps the sim `ticks` times synchronously with no frame cap, whatever the speed (even paused), then drains and dispatches the events once. `fastForward(0)` applies pending commands without advancing time. A whole map resolves in well under a second of wall time. If the map has ended, its results show at once: fast-forwarded time skips the 1.5 s results delay (D028), so play-outs stay fast; a spec that tests the delay ends the map on real frames |
| `tileToClient(x, y)` | Client (CSS px) coordinates of the center of tile (x, y), for real mouse clicks; `null` outside a battle |
| `goto(screen)` | Jumps to a screen (`'title'`, `'campaign'`, `'base'`, `'settings'`, `'battle'`, `'results'`); returns a promise that resolves once it has rendered. `'results'` shows the last finished run and rejects if no run has ended; `'campaign'` rejects without a save in play, and `'base'` until the save has opened it |
| `perf()` | Recent frame CPU time (Phaser's pre-step through post-render), sim ms per tick, and the sim's live enemy, tower, and projectile counts (`particles` stays 0 until particle VFX exist) |
| `save()` | A copy of the campaign save in play (`SaveData`), or `null` on the Title or in a battle opened by `map`/`skipIntro` |
| `audio` | The audio (T205): `status()` (enabled, unlocked, the context's state, muted, the theme and its layer levels, live voices, and sounds played by id), `ids()` (every sound effect, cue, and theme), and `render(what)` (`sfx:<id>`, `cue:<id>`, `theme:<id>`, or `storm`: an offline render through the real master chain, returning peak, RMS, and length, through the chain and before the limiter) |

Boot parameters: `seed`, `map` (opens that map's battle), `skipIntro` (opens the default battle, `DEFAULT_MAP_ID` in `src/app/battleSetup.ts`: A1M1, which opens on its briefing; `map=dev_range` is the dev battle), `radio=1` (`?test=1` turns the M1 radio ticker off so screenshots stay clear; a spec that asserts radio lines turns it back on), `audio=1` (`?test=1` turns audio off, so no `AudioContext` exists; `smoke/audio.spec.ts` turns it back on), and `save=<id>` (with `?test=1` only: plays a dev save from `src/meta/__fixtures__/devSaves.ts` in an in-memory slot, gated systems opened by its `devUnlocks`, starting on its Shift board; [meta-runtime.md § Progress and gating](meta-runtime.md#progress-and-gating)). Each smoke test gets a fresh browser context, so localStorage starts empty and Start shift opens a new campaign in slot 1. The hooks only read state and issue the same commands a player could, so they're safe to ship. Without `?test=1`, `window.__sd` doesn't exist. The hook types live in `src/app/testHookTypes.ts` (DOM-free, so specs import them too). To land a command deterministically, pause first (`setSpeed(0)`), then `enqueue` and `fastForward(0)`.

**What the smoke tests check:**

1. **Boot:** the page loads, `__sd.ready` resolves within 10 s, the canvas has a non-zero size, and the title screen is visible (found by role and name).
2. **No console errors:** a shared fixture records `console.error`, `pageerror`, and failed or 4xx/5xx requests for every test, and any of them fails the test. Allowed exceptions live in `smoke/allowedConsole.ts`, each with a justifying comment.
3. **Every map boots:** for each registered map, load `?test=1&map=<id>&skipIntro=1`, wait for the first rendered frame, and take a screenshot (`smoke/battle.spec.ts`, over `battleMapIds()` from `src/app/battleSetup.ts`, which also lists the dev battle; shots go to `test-results/screens/maps/`). The same spec runs the T112 battle flow: build by hook and by real click, select, upgrade while paused, `fastForward`, and run at 2×.
4. **Key flows** (each milestone adds its own). Flows **assert on the DOM** (the results screen's heading and counter, found by role and text), not on sim state alone:
   - **M1:** title → battle; place a tower by **real mouse click** on a buildable tile; select it and upgrade through the HUD; call a wave; switch to 2×; **enemies and projectiles** on the field (`perf()` counts plus a screenshot); fire Orbital Strike at a tile; then `autoplay('par')` plus `fastForward` through to the **win** results screen, with a non-zero PESTS PROCESSED; Retry starts the map over. Separately, `autoplay('none')` plus `fastForward` reaches the **lose** results screen, and Title returns. `smoke/m1.spec.ts` plays A1M1 the way a player meets it (Start shift → briefing → Clock in → HUD build → Start wave 1 → 2× → par → Victory → Retry, and the lose flow); `hud.spec.ts` covers select, upgrade, retarget, and sell; `ability.spec.ts` the strike; `screens.spec.ts` the title and briefing (a real modal: the HUD behind it is inert, Tab stays inside, Esc closes it from anywhere). M1's feedback (D026) is covered inside those flows: the onboarding pulses on slot 1 and Start, the locked slot's "Thumper ships at wave 3", "Can't build there", the PAUSED notice, the tower panel's stat line, and (with `radio=1`) the first leak's radio line and the meter's leak flash. Round 2's (D028) too: the upgrade teach from W2's countdown (the hint, then the pulsing Upgrade button), the win card's debrief, the lose flow's results delay (the map ends on real frames; the battle stays frozen and Results waits), and the core flow's screenshots (a tower showing through the core, the red heart at low integrity; `test-results/screens/core/`).
   - **M2:** pick a 4-tower loadout; toggle hold fire and the spare-runners filter; buy something in the shop; round-trip a save export and import. The flow shell (`smoke/meta.spec.ts`, T209): Start shift → A1M1 by `autoplay('par')` → Results → Continue → Base (R&D open, Shop and Engineering locked with their hints) → Shift board → reload → Load and Continue; Settings' difficulty and Export, then a bad code and the real one imported on the Title into slot 2; `?test=1&save=all_unlocked` opens every base pane; the gated screens refuse without a save, and `save=` does nothing without `?test=1`. Audio (`smoke/audio.spec.ts`, T205): off under `?test=1` without `&audio=1`; the first gesture unlocks it; par plays the battle theme with its layers and the build, wave, shot, and pop sounds; M and the speaker button mute it and the choice survives a reload; every sound, cue, theme, and a W7-intensity storm render offline at sane levels with no clipping. The companion slot (`smoke/suppress.spec.ts`, T207b, on `dev_range` with Bricks at his post): E aims, a pad says "Can't target there" and keeps the aim, hovering the path previews the segment, a click casts it (one segment zone over the expected stretch, slot 2 recharging), E while recharging says so; and keyboard-only, E then the arrows walk only path tiles and Enter fires. Screenshots in `test-results/screens/suppress/`.
   - **M3:** advance dialogue and make a choice (the flag is set); navigate the star map; open the codex.
5. **Screenshots** at every flow step: `test-results/screens/<flow>/<nn>-<step>.png`, at a 1280×720 viewport (2× scale). **Look at them** (they open with the Read tool) whenever your change is visual. They aren't pixel-diffed yet ([architecture.md, open question 2](architecture.md#open-questions)).

**Speed budget.** The whole gate stays under 5 minutes. Smoke flows play in real time only for the steps a player performs; anything longer (playing out waves) uses `fastForward`.

For visual or feel changes, also play the affected flow yourself: `npm run dev`, then use a browser tool, or `npm run smoke -- --headed -g <flow>`.

### Docs check (`npm run check:docs`)

`tools/check-docs.ts` (plain Node, no dependencies) checks `docs/**/*.md`, `CLAUDE.md`, `tasks.md`, and `.claude/agents/*.md`:

1. Every **relative link resolves** to an existing file.
2. Every **`#anchor` matches a heading** in the target file (GitHub slug rules: lowercase, punctuation removed, spaces become hyphens).
3. **`docs/README.md` lists every doc** under `docs/`, and every doc it lists exists.

External URLs aren't checked (the check runs offline). It reports every failure and exits 1 if there are any.

**Manual consistency pass** (required for docs-only changes): for each fact you changed, `grep -rn` the old wording across `docs/` and `CLAUDE.md`, and make sure the fact has one home and that every other mention links to it rather than restating it.

---

## Testing

What must have tests (Vitest, unless noted):

| Area | Expectation |
|---|---|
| **Sim systems, behaviors, abilities** | **Required.** Every system and every attack or ability kind has unit tests covering normal cases, edge cases (zero HP, exact range boundary including exclusive minimum range, simultaneous kills, a tower sold mid-flight, interrupts mid-tell, lead targeting on a route corner), and invariants (enemies never damage towers; a jam always expires and grants immunity; allies are never harmed; allies never target `quiet_wave`, `youngling`, or `fleeing` units; a tower with the spare-runners filter never picks a `fleeing` or `youngling` unit as its primary target, while its splash and chains still hit them; a Hollow unit hushes at most once and turns Heavy; `fleeing` leaks cost 0 and count as medal-exempt; the misclick-grace refund ends at first fire or 10 s; commands applied by `applyPending()` while paused). |
| **Determinism** | `sim/determinism.test.ts`: a fixture map with a scripted command list, run twice, gives an identical `hash()`. Replaying the command log gives the same result, and replaying a log prefix to a checkpoint tick gives the same `hash()` as the original run at that tick. Commands applied by `applyPending()` at the end of tick *T* give the same state as the same commands applied at the start of tick *T + 1*. |
| **Content** | `content/content.test.ts`: `validate(RAW_CONTENT)` returns no errors, and `content/validate.test.ts` has one failing fixture per rule (it must throw from `compileContent()`, matching the rule's `[name]`). Together they cover every check in [architecture.md § Validation](architecture.md#validation) (cross-references, geometry, `threatIntel` and `requiredCounters`, the soft-trait share, new-threat limits, revisit rules, builds, par-purchasable profiles, `altBuilds` from A1M4), rule limits (jam and stacking caps), sprite grids, master-palette membership, the Hollow hue reservation, path-vs-pad luminance contrast per environment palette, the dialogue rules in [story-runtime.md § Validation](story-runtime.md#validation) (lengths, protected `{name}`, QUILL's tell, exclamation budget), and the counter coverage guarantee on every branch (each possible A3M2 revoked class, each gift-timing flag). |
| **Stacking** | `sim/stats.test.ts`: the [towers.md §4](../design/towers.md#4-stat-modifiers-and-stacking) formula, with flat bonuses first, percentages summed, caps applied to the sum, and same-kind auras not stacking. |
| **Sprites** | `render/sprites/rasterize.test.ts`: palette mapping, auto-outline, mirroring, patches, glow stepping (pure buffers, no canvas). |
| **Iso math** | `render/iso.test.ts`: grid→screen→grid round trip, tile picking at the edges of the tile mask. |
| **Saves** | Every `__fixtures__/save.v<n>.json` migrates to current and validates. The export→import round trip is lossless. Corrupt, truncated, and oversized codes are rejected cleanly. |
| **Story runner** | Branching, choices setting flags, conditions, and text substitution: every token with each pronoun set (including `{v:…}` agreement and capitalized forms), `{pests_processed}` formatting and its live in-map value, `{glyph:…}`, and unknown tokens failing. Run-end flag rules (the Quiet Wave threshold at 74%, 75%, and 100%; `held_fire_second_look` at 49% and 50% fleeing leaked, with and without a Hold Fire use). Bark buttons (pressing applies `set` and plays `reply`; ignoring them changes nothing). Bark selection (priority, spacing, presence, no-repeat, silence for an absent speaker). Epilogue selection for every flag combination, codex version unlocking, memo delivery, and the countdown display at `p` = 0, 0.5, and 1. |
| **Story transactions and run end** | `meta/`: the Q3 grant applies once, on A2M4's results; C2 Sell, Return, and none; jailbreak pricing under each `door_choice`; revocation refunds (Orbital Strike Mk II Intel); C4 Keep's Time Dilation inheritance and Purge's Rapport refund; Zibzab's crate (missing tune-ups, or a protocol when all are owned); Pests Processed accumulates on win, loss, and retry; a checkpoint run forfeits Perfect and Challenge; a defeat after a checkpoint retry pays only for waves from `resumedFromWave` on, and a defeat on a completed map pays 0; one spec purchase unlocks both specs; `availableAfter` hides items until their map is completed. |
| **Architecture** | `shared/architecture.test.ts`: no forbidden imports anywhere in `src/` (the edges in [architecture.md §4](architecture.md#4-other-modules)); no `Math.sin`, `Math.cos`, `Math.atan2`, `Math.pow`, or `Math.random`, no aliased `Math`, and no `Date`, `performance`, timers, `localStorage`, or `globalThis` in `src/sim/`. Fixture strings prove the scanner catches each kind of violation. |
| **Balance harness code** | `src/balance/*.test.ts`: profile → modifier composition (including the full-catalog profile), the policies' generated steps, and each assertion on a tiny fixture map. |
| **Balance** | `npm run sim` (above), not Vitest. |
| **UI and render** | Covered by smoke tests. Component unit tests are optional. |

Every bug fix comes with a regression test that fails without the fix. There's no coverage percentage gate; the table above is the contract.

---

## Lint and format

- **oxlint** with type-aware rules (`oxlint --type-aware`), configured in `.oxlintrc.json`:
  - Categories: `correctness` as error, `suspicious` as error, `perf` as warn.
  - Key rules: `no-explicit-any`, `no-floating-promises`, `no-misused-promises`, `switch-exhaustiveness-check`, `eqeqeq`, `no-console` (allowed only in `tools/`, `smoke/`, and `app/log.ts`), and `no-restricted-imports` for the module boundaries ([architecture.md §4](architecture.md#4-other-modules): pure modules may not import `phaser`, `preact`, or `render/`, `ui/`, `audio/`, `app/`; `sim/` also may not import `meta/` or `balance/`).
  - **Determinism ban:** `no-restricted-properties` on `Math.sin`, `Math.cos`, `Math.atan2`, `Math.pow`, and `Math.random`, and `no-restricted-globals` on `Date`, `performance`, timers, `localStorage`, and `globalThis`, in `src/sim/**` ([architecture.md § Determinism](architecture.md#determinism)). The architecture test repeats the check, so it holds even if the lint rule is unavailable.
  - Also on: `import/no-default-export` (off for `vite.config.ts` and `playwright.config.ts`, which need one), and `import/no-unassigned-import` except for `*.css`.
  - A suppression needs a reason: `// oxlint-disable-next-line <rule> -- <why>`.
- **Prettier** (`.prettierrc.json`): `printWidth: 100`, `singleQuote: true`, `trailingComma: "all"`, `semi: true`. `npm run format` rewrites, `npm run format:check` only checks (and runs inside `lint`). **Exceptions:** sprite grids and map grids are wrapped in `// prettier-ignore` so their columns stay aligned, and Markdown is excluded in `.prettierignore` (docs are hand-formatted).
- `.editorconfig`: 2-space indent, LF, final newline, UTF-8.

---

## Commit messages

```
T105 sim: add wave spawner and credits economy

Why the change was made and anything a reviewer should know.
Balance band changes must be justified here.

Co-Authored-By: ...
```

- **Subject:** `<task id> <area>: <imperative summary>`, at most 72 characters. The area is one of `sim`, `content`, `render`, `ui`, `story`, `meta`, `audio`, `app`, `tools`, `docs`, `art`. Use `fix` or `chore` in place of the task id only for work outside any task.
- One logical change per commit. The tree must pass `npm run check` at every commit on the main branch.
- Milestone ship: `M1: ship playable vertical slice`, then `git tag m1`.
- Add the attribution trailers your session's instructions require.

---

## Performance rules

Budgets: sim tick ≤ 1 ms with 300 enemies and 40 towers; frame ≤ 8 ms CPU at 60 fps on a mid-range laptop; boot ≤ 300 ms; initial JS ≤ 1 MB gzipped.

**In hot loops** (per entity, per tick in the sim; per sprite, per frame in render):

1. **No allocations.** No object or array literals, closures, spreads, destructuring into new objects, `map`/`filter`/`forEach`/`reduce`, string concatenation or template strings, or temporary vectors. Use indexed `for` loops, scalar `x`/`y` fields, and module-level scratch objects in render. (The sim gets scratch space from `TickContext`, because pure modules have no module-level state.)
2. **Pool everything that churns:** enemies, projectiles, zones, events per frame, views, particles, and floating text. Return items to the pool; don't `destroy()` and re-create. In render, hide pooled objects with `setVisible(false)`.
3. **Monomorphic shapes.** Initialize every field in the factory, never add or `delete` properties later, and don't mix types in one field.
4. **Resolve once.** Look up string ids at spawn or compile time, never in a hot loop. Use direct object references and precomputed per-tick values (`cooldownTicks`, `rangeSq`).
5. **Cheap math:** compare squared distances, use integer ticks, no trig where arithmetic will do.
6. **Bound the work:** targeting scans are O(towers × enemies), which is fine at our scale. Retarget only when the current target is lost or every N ticks, and add a spatial hash only if profiling demands it.
7. **Render:** one atlas page where possible (keep batches unbroken), no per-frame texture creation, `DynamicTexture.render()` only on change (except the lighting overlay), at most 512 live particles.
8. **DOM UI:** update signals only when values change, never write layout properties every frame, and never read layout (`getBoundingClientRect`) in the frame loop.
9. **Measure before optimizing** anything beyond these rules. Use `__sd.perf()` in the browser, and the per-run timings from `npm run sim`.

---

## Open questions

1. **Gate time.** Plan to run sims in parallel with `worker_threads` once there are more than 5 maps, before `npm run sim` plus `smoke` push `check` past 5 minutes, and before cutting any coverage.
2. **Firefox and WebKit smoke runs.** The gate is Chromium-only. Add a `smoke:all` run before milestone ships?
3. **Variant explosion.** Flag and companion variants multiply harness runs on late maps (the finale reads four flags and has a companion pick list). Test each flag's values and each companion independently with the par combination, rather than every combination? Confirm before the finale is built.
