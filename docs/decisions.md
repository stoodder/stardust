# Decision Log

Append-only. Newest entries go at the bottom. Each entry gives the date, the decision, and why. Docs describe the present state; this file records how we got here.

---

### D001 — 2026-11-08 — Foundational choices (M0 kickoff)
Agreed with the project owner during the kickoff brainstorm (the owner deferred to these recommendations):

| # | Topic | Decision | Why |
|---|---|---|---|
| 1 | Art | **Code-generated pixel art** (palette-indexed sprite grids rendered to textures at boot). The renderer is structured so hand-made sprite sheets could be swapped in later. | Agents can produce it end to end; it guarantees a consistent style. |
| 2 | Protagonist | **Player-named**, with player-chosen pronouns, plus a **callsign** NPCs use ("Sprout" at first, earned callsigns later). | Builds player identification; the callsign can carry story beats. |
| 3 | Choices | **3–4 key story choices** with felt payoffs and **one meaningful ending variation**. | Emotional agency without a branching explosion. |
| 4 | Tower disabling | Enemies can never damage or destroy towers. **A few late-game enemies may briefly disable towers** (for example an EMP pulse), with clear tells and counters. | Variety in Act III without breaking the core promise. |
| 5 | Length | **About 17 campaign maps** (Acts I–III plus a finale), then challenge maps, veteran modifiers, and endless mode. Can expand. | Enough room for the arc; achievable scope. |
| 6 | Currencies | **In-map: Credits** (from kills and waves, reset every map). **Meta: Stardust** (common, earned per map, buys permanent upgrades at Zibzab's shop and R&D) and **Intel** (rare, from medals and objectives, gates major unlocks such as new towers and specializations). | Two meta currencies keep the "grind" path and the "mastery" path distinct. |
| 7 | Lose condition | **Colony core integrity** (HP) is drained by leaking enemies. Failing has no penalty beyond a retry; you keep a small share of the Stardust earned. | Fair and low-frustration. |
| 8 | Platform | **Desktop browser first**. Layout and input are designed so touch support can be added later. | Focus. |
| 9 | Audio | **Procedural chiptune SFX and music** generated in code (WebAudio), added from M2 onward. | Fits the pixel style; no asset pipeline needed. |
| 10 | Shipping | Local git repo. A milestone ships as a commit plus a `m<N>` tag. GitHub Pages deploy once a remote exists. | Keeps things simple until hosting is needed. |
| 11 | Workflow | Custom lightweight workflow in `CLAUDE.md` (not the materia pipeline). | Better fit for iterative game development. |
| 12 | Influences | **Kingdom Rush** (feel, medals, upgrades), **Bloons TD 6** (specialization choice), **Defense Grid** (story via a companion voice during play), **Arknights** (story-heavy TD), plus StarCraft and Starship Troopers for setting. | Shared vocabulary for agents. |

### D002 — 2026-11-08 — Test loop before review
Owner request: every task runs a **test loop** after implementation and before review: typecheck, lint, unit/sim tests, build, headless balance sims for affected maps, browser smoke tests for UI, and link/consistency checks for docs. The loop repeats until green and re-runs after each round of review fixes. Reviewers never see red code. The summary is `CLAUDE.md` step 5; the detailed home is `docs/tech/conventions.md` § The test loop.

### D003 — 2026-11-08 — Tech stack versions
**Phaser 4.2.x** (stable since April 2026; built-in filters give bloom and glow; tint-fill mode for hit flashes), **TypeScript 7** (strict), **Vite 8**, **Vitest 5**, **Playwright** for browser smoke tests, **oxlint + tsgolint** for linting (typescript-eslint doesn't run on TS 7), Prettier, Node ≥22.18 (native `.ts` execution for tools). UI is a **Preact DOM overlay** over the Phaser canvas. Internal resolution is **640×360** with integer scaling, on **32×16** iso tiles. The sim runs at **60 Hz** fixed ticks with a seeded RNG. Details live in `docs/tech/architecture.md`. Why: these are the current stable, well-documented releases; DOM UI is far easier to make crisp, accessible, and testable than canvas UI.

### D004 — 2026-11-08 — M1 scope ("the M1 cut")
M1 ships map **A1M1** with **Rivet and Thumper** (the towers A1M1 uses) and **Nibbler and Zoomer**, plus **Sprinkler and Chonk** as sim-tested content not placed on A1M1 (they exercise the chill and armor code paths). Included: **Orbital Strike** (it gives the player active agency) and minimal title and results screens. Deferred: Bricks as a scripted ally and Suppressing Fire (M2, T207), adjacency links and medals (M2, T202), dialogue/tutorial (M3; M1 uses a static briefing), character creation (M3, T306). A1M1's par build is tuned for the M1 cut and re-tuned when the deferred pieces land. Why: the smallest slice that proves the core loop, the sim/render split, and the full test gate.

### D005 — 2026-11-08 — M0 review round 1 rulings
Three reviews (Story/Emotion, Gameplay/Balance, Docs-fitness/Architecture) produced about 80 findings. All of them were accepted and applied across the docs. The cross-cutting rulings:
- **Renames for originality:**
  - Halcyon Dynamics → **Everglow Dynamics**. *The Outer Worlds* uses "Halcyon" for its corporate colony; "Everglow" keeps the 3-syllable jingle and ties into the dawn motif.
  - "Terran" is dropped; the human government is the **Kepler Frontier Authority**.
  - Sunderglass Colossus → **Sunderglass Penitent**.
  - At most one "Brood" name (**Brood Hauler**); A1M2 is **Hatching Season**.
  - The Aelari get a non-Protoss identity: **chorded/woven glass-thread lattices** and a song-weaving culture learned long ago from the Skitterkin.
- **Mercy is never punished:** fleeing Skitterkin leak for 0 and are medal-exempt. A Hollow unit that hushes a Skitterkin is strengthened, so baiting is a bad trade. Allies never target quiet-wave, youngling, or fleeing units.
- **Fair economy and meta:** early-call bonus and meta bonuses are rescaled to percentages, and the full meta catalog can't replace counters. One R&D purchase unlocks both tier-4 specs.
- **Threat model:** `threatIntel` (every trait) is separate from `requiredCounters` (≤3, each backed by a no-counter build that must lose).
- **A3M6:** the same route as A1M1, with the destination flipped. The finale meter is **Voices**.
- **Navigability:** campaign.md is split into an overview plus per-act files. Architecture's story runtime and art's technical spec move to their own docs. Architecture §3 is the canonical type sketch until `src/content/types.ts` exists.

### D006 — 2026-11-08 — M0 review round 2 rulings
All three round-2 reviews concluded "ready, with fixes". Key rulings:
- **A1M1 has no required counters.** The tutorial never punishes skipping a tower; Splash first becomes required at A1M4.
- **"Spare runners" targeting filter** (from A2M1, hotkey Alt+H): towers never *pick* fleeing or youngling units as targets. Fleeing bounty is 1. A `spareFleeing` harness run must stay within 5 points of par. This makes mercy actually free, which the round-1 rule only claimed.
- **A trait → counter-category table** (enemies §3) makes the 15% soft-trait rule checkable. Speed-type traits are intel-only. No-counter builds are defined **by category** (excluding every tower that answers it), one per required counter.
- **Anti-farming:** a defeat after a checkpoint retry pays only for waves beyond the checkpoint, and a defeat on an already-won map pays 0.
- **Act III armor:** after Psionic ×0.35, Prism Spire and Harpoon, not Mindspike, are the armor answers.
- **C4 rebalance:** Keep grants Time Dilation as a Technician ability. Rewrite loses System Reboot in A3M5.
- **Story:** the thesis line ("The dead don't mind being useful. They mind being forgotten.") is spoken by Zibzab and Bramble. Facet Warden → **Weft Warden**. Bricks's dome is "always twenty-two degrees" (unit-agnostic).
- *(Tech follow-ups to D006)* "Spare runners" is its own command, `spareRunners { target: uid | 'all', on }`, with the spared tags fixed (`fleeing`, `youngling`). `holdFire` takes only a uid or `'all'`. Towers built while the global toggle is on start with it on. Map-scoped ability locks use `MapDef.lockedAbilities` rather than `revokeAbility`, so a lock never changes the save.

### D007 — 2026-11-08 — M0 shipped
Review round 3 (final verification) found every round-2 item applied consistently and three wording blockers on the M1 path, all fixed: the `phase: 'countdown'` script trigger (what `towerUnlockWave` compiles to), A1M1's reference profile (Rivet + Thumper + Orbital Strike, no purchases), and T108a's run list. The remaining findings are tasks T107, T108a, T111, T208, and T501. M0 ships as tag `m0`. Work pauses here before any code, and continues in a remote session from the GitHub repo.

### D008 — 2026-11-08 — Working from Claude Code cloud sessions
Development continues in Claude Code cloud sessions against `github.com/stoodder/stardust`, as the owner requested. Facts from the official docs (code.claude.com/docs: cloud-environments, claude-code-on-the-web, sub-agents) that change the process:
- **Tag pushes are rejected** by the cloud GitHub proxy. A milestone now ships as a `M<N>: ship` commit plus a decisions entry, pushed to `main`. The `m<N>` tag or release is made by the owner on GitHub or from a local session. This supersedes the tag-push part of D001 #10.
- **Node 22** is the default but the minor version isn't documented. Node tools run with `--experimental-strip-types` so any Node ≥ 22.6 works; this amends D003's Node ≥ 22.18.
- Repo subagents load with their model/effort honored, npm works on the default network level, and Chrome for Testing is preinstalled. Reaching a localhost dev server is undocumented, so T101 verifies it.

### D009 — 2026-11-09 — T101 scaffold: pins, cloud-check results, and tooling choices
- **Pinned versions** (exact, in `package.json`; confirms D003): phaser 4.2.1, preact 11.2.0, @preact/signals 2.11.4, typescript 7.0.2, vite 8.3.6, vitest 5.1.0, @playwright/test 1.65.0, oxlint 1.92.0, oxlint-tsgolint 7.0.2006, prettier 3.9.10, @types/node 22.20.5. There's no `@preact/preset-vite`: Vite's built-in `oxc.jsx` compiles Preact JSX without Babel. Type-aware oxlint works on TS 7.0.2, so D003's typescript-eslint fallback isn't needed.
- **Cloud checks (D008 follow-up):** Node 22.23.4. A Vite dev server on localhost can be reached from inside the session. Headless Chrome launches. The pinned Playwright expects a newer Chromium revision than the preinstalled `/opt/pw-browsers`, so `playwright.config.ts` launches `CHROME_PATH` (Chrome for Testing). Never run `playwright install` in cloud sessions. When bumping @playwright/test, check that it still launches.
- **Tooling choices:** `tsconfig.app.json` / `tsconfig.pure.json` / `tsconfig.node.json`, with a root `tsconfig.json` that only references them. Prettier skips `*.md` because docs are hand-formatted. The architecture test and lint also ban `Date`, `performance`, timers, `localStorage`, `globalThis`, and `Math` aliasing in `src/sim/`. `__sd` hooks exist only with `?test=1`. `__sd.ready` is a promise, and the sim-facing hooks are no-ops until T102/T112. The full gate takes about 7 s on the empty scaffold.

### D010 — 2026-11-09 — The art trail: a gallery screenshot every milestone
The owner's request, from an orchestrator pitch. Starting with M1, every milestone review looks at the sprite gallery screenshot (T104's gallery page, captured by `npm run smoke`) next to the previous milestone's. At ship, the final screenshot is committed as `docs/art/gallery/m<N>.png`. It is never overwritten, it is linked from the "M<N> shipped" entry, and it is sent to the owner. Why: it gives the art a visible history the owner can scan without running the game, and it catches palette or style drift between milestones. These screenshots are the only binaries allowed under `docs/`. The procedure lives in `CLAUDE.md` steps 6 and 8.

### D011 — 2026-11-09 — T111 content pipeline: type and compile rules
`src/content/types.ts` (raw) and `compiled.ts` (compiled) are now the canonical home of the data shapes, and architecture §3 is a summary that links to them. Rulings:
- **Id typing without cycles.** Cross-kind references are generic over an id space (default: the live registries), so a typo'd id is a compile error in live content and in test fixtures alike. Kinds with no registry yet (links, upgrades, protocols) are `never`.
- **Departures from the M0 sketch:**
  - `targets` and `defaultPriority` live on tiers, so specs can change them.
  - A new `pulse` attack kind covers the Sprinkler.
  - `armorPierce`, `ignoresArmor`, and `spinUpSec` sit on every attack.
  - `specs` stays optional until T202.
  - Enemies carry `spawnIntervalSec`, and a group's `intervalSec` overrides it.
  - Wave groups have no `spawn` field, because the route fixes the spawn.
  - Enemy abilities, bosses, allies, and presentation wait for their milestones.
- **Compile rules:**
  - Seconds become ticks by rounding to nearest, with halves rounding up, after snapping float error. A positive duration is at least 1 tick.
  - Distances stay in tiles.
  - Tier patches deep-merge; arrays replace; an attack whose `kind` changes is replaced whole.
  - `towerUnlockWave` compiles to `once` countdown events, which come before authored events.
  - Every error is collected into one `ContentCompileError`.
  - The entry point is `compileContent()`.

### D012 — 2026-11-09 — T104 sprite pipeline: format rulings
Code-generated sprites are live: 21 sprites in 454 frames, baked at boot in about 12 ms through the pure `rasterize`/`bake`/`atlas` modules and `CodeSpriteSource`. [art/tech-spec.md](art/tech-spec.md) now settles the details the spec left open:
- Anchors are pixel-edge coordinates, and a tower's anchor is the center of its base footprint.
- Mirrored animations rename frames by swapping the facing token.
- In patch rows, a space keeps the pixel underneath and `.` makes it transparent.
- Derived `+selected` (towers and enemies) and `+jammed` (towers) variants are baked.
- Glow frames are padded by their radius and use stepped alpha.
- The env palette slots are `p`/`s`/`a`/`e`.
- `fx` is a sprite category.
The orchestrator reviewed the gallery: Everglow steel with teal and orange reads clearly against the warm, chunky Skitterkin, and the env palettes darken from Act I to the finale as the art direction intends. The D010 art-trail capture is `test-results/gallery/gallery.png` (`npm run smoke`, deterministic, 1600 px wide).

### D013 — 2026-11-09 — T102 sim core: rulings
The sim core is live: `createSim(cfg)` → `{ state, enqueue, step, applyPending, drainEvents, hash }`, with typed pools, the nine systems in the documented order (later tasks fill in the stubs), and a determinism suite. Architecture §2 *Sim public API* describes it as built. Rulings:
- **RNG:** sfc32 as plain data, with functional helpers (`forkRng(rng, name)` in place of `rng.fork(name)`, because pure modules use functions). Forking by name doesn't advance the parent, so adding a stream never shifts the others.
- **`hash()`** walks all state generically. It skips the event buffer and the command log, and hashes frozen content by its id. Entities refer to each other only by uid.
- **Command timing:** a command applied by `applyPending()` after tick T is logged at T+1, the tick it takes effect before. Rejected commands are logged too, so a run replays from its log.
- **Unsupported config is refused, not ignored.** `createSim` throws on a companion, slot 2, modifiers, or Story difficulty until the owning task lands, so the harness can't silently test a different game.
- **Where the headless runner lives:** `runHeadless()` and the scripted-build executor stay in `src/sim/headless.ts`, as architecture §2 says. They're pure and use only the public sim API. The *harness* (profiles, the run list, assertions, reports) lives in `src/balance/` with the CLI in `tools/sim.ts`, and that is what T108a means by "not `sim/`".
- `src/shared/hash.ts` (FNV-1a 64) and `DeepReadonly` in `src/shared/types.ts` were added by T102. Shared utilities have no single owner, so whoever needs one adds it and reports it.

### D014 — 2026-11-09 — T103 grid, routes, and movement
- **Route format** ([design/maps.md §4](design/maps.md#4-paths-and-air-lanes)): a path lists its S tile, then only `#` tiles, then C, in orthogonal one-tile steps. Every `#` and S tile lies on some path. Rift lanes follow the same steps and never cross buildable tiles. Compile enforces all of this as a compile error, which shrinks T110's validator to the rules types and compile can't express. Enemies spawn at S's center and leak at C's center.
- **Iso math** lives in `src/render/iso.ts`, with no Phaser. A grid *point* (0,0) is the top vertex of tile (0,0), so a tile's center is (col+0.5, row+0.5) and sim x/y feed straight in. Picking snaps to the game-pixel center so it matches the tile mask exactly, and high-ground top faces win. `mapOrigin` centers the diamond plus 40 px of headroom; A1M1 (14×10) gets (288, 104).
- **Movement** advances `dist` by `speedTilesPerTick × chillMul`, with a 1e-9-tile arrival tolerance; without it, float sums leaked a tick late. The movement system owns leak damage: integrity drops by `leak` (0 for `fleeing`), never below 0. Win/lose stays in `cleanup`. The entity field is `seg` (architecture's `pathIndex` was renamed to match).
- **A1M1** (`a1_m01`, route `road`) is registered with its layout, 350 credits, `threatIntel: ['fast']`, `requiredCounters: []`, `companion: null`, and the act1.md briefing lines as static text. `towerUnlockWave: { thumper: 3 }` waits for T105c, because it can't compile before Thumper and three waves exist.

### D015 — 2026-11-09 — T112 BattleScene and host loop
- **Host:** `createHost(sim)` wraps one sim with a fixed-step accumulator (60 Hz × speed, frame delta capped at 250 ms). Speed 0 pauses and empties the accumulator, while commands still apply through `applyPending()`. `fastForward(0)` applies pending commands without advancing time. Each battle gets a fresh scene key.
- **Views** are pooled, keyed by uid, and created and released from drained events. Each frame also sweeps up any view whose entity is gone, as a backstop. Depth sorting follows tech-spec.
- **HUD seam for T106:** the `hud` signals in `ui/state.ts`, kept in sync by `app/hud.ts`. Actions go through `app/commands.ts`, and keys through `app/keys.ts` (Space, F, and Esc bound so far).
- **Dev battle:** until A1M1 has towers and waves (T105c), the default battle is the dev map `dev_range` in `src/render/__fixtures__/devBattle.ts`, with `dev_` towers drawn with the real sprites. Switching is the one line `DEFAULT_MAP_ID` in `app/battleSetup.ts` (T107). Until the build menu exists, the first loadout tower is armed, so clicking a free pad builds it.
- **Selection look:** a white outline and a `teal.3` highlight on the tile. Hovering a tower shows its range ring, which takes priority over the selected tower's ring.
- **Not yet drawn:** high-ground and power-node tiles are drawn as plain pads with no elevation offset until they get art (T117).
- **For the UX review:** A1M1 fills only about half of the 640×360 frame. Consider a backdrop or a camera fit.

### D016 — 2026-11-09 — T110 rules data and the content validator
- **`src/content/rules.ts`** holds the rule data: the damage matrix, status caps and the speed rule, stacking caps, aura kinds (`choir`, `lookout`), jam limits, counter categories, the trait → category map, `COUNTER_ANSWERS`, `SPARE_TAGS`, `SELL_REFUND_PCT` (0.7), `MISCLICK_GRACE_SEC` (10), `DEFAULT_COUNTDOWN_SEC`, and `DEFAULT_CORE_INTEGRITY`. Design docs keep the intent and point to it for the numbers.
- **Validate, then compile, into one error.** `compileContent()` runs `validate()` first and throws a single `ContentCompileError` with every problem, each tagged `[rule]`. `validate.test.ts` has one failing fixture per rule.
- **Feature guards:** content that needs an unbuilt feature is refused, not ignored. That covers bosses and the boss-leak rule (T304), Escort and other objectives (T305), and companions (T207). Named TODO stubs remain for par-purchasable (T204), medals (T202), tier/spec answers (T208), and per-flag revisit layouts (M5).
- **Numbers chosen where the docs were silent:**
  - Threat factors multiply when an enemy has several factor traits, and all auras share one ×1.5.
  - The countdown for finale, challenge, and endless maps is 20 s.
  - Alt builds are required from campaign index 3 (A1M4).
  - The mercy tags (`fleeing`, `youngling`, `quiet_wave`) are allowed only on Skitterkin.
  - `COUNTER_ANSWERS` lists every tower that answers a category at any tier, which is stricter than the design until T208 adds tier/spec entries.
- **`SpriteId`** is now derived from the sprite registry. Ability icons stay free-form (`icon.ability.*`) until T113.

### D017 — 2026-11-09 — T115 title and results screens
- **Run end:** the router listens for `MapWon`/`MapLost` and counts `WaveCleared`, builds a `RunResult` (Pests Processed = the run's `skitterkinKilled`; M1 has no save), pauses the battle, and shows Results over the frozen battlefield. UI buttons reach the router only through `app/navigation.ts`. Retry reuses the URL's seed if there is one, and otherwise starts a fresh seed (fine for M1).
- **`__sd.forceOutcome`** is a documented, test-only exception to "hooks only do what a player could", because real win/lose arrives with T105b. T108b moves those flows to `autoplay`.
- **Strings:** "PESTS PROCESSED: {n} ★ Top 5% of Technicians!", the loading tip, and "EVERGLOW · Brighter Every Day!" come from the story docs. Written fresh where the docs were silent and accepted by the orchestrator: "Start shift", "PERIMETER SECURED!" (win), "MINOR OPERATIONAL HICCUP" (loss, Everglow's canon euphemism, so a loss is funny and never scolds), "Shift report · Victory/Defeat", Retry, and Title. The style guide should take them in (Story owner, T118).
- **Look:** the title logo is Silkscreen at 32 px over a code-drawn starfield `BackdropScene`. Menu panels use **opaque** fills, because a translucent fill lets the edge color bleed through the inset layer.

### D018 — 2026-11-09 — T106 in-map HUD
- **Armed tower:** a battle starts with nothing armed. A slot (click, or key 1–4) arms its tower, and pressing it again disarms. A locked or unaffordable slot shows a notice instead of arming. After a build the slot stays armed while another copy is affordable. Esc or right-click clears both arming and selection. Selecting a tower disarms, and arming drops the selection.
- **Keys:** 1–4, U (upgrade), S (sell), T (targeting: First → Last → Strong → Close), W (call wave), Space (pause), F (fast), Esc.
- **Sim rejections** become HUD notices. `sell`/`callWave` show "Not online yet" until T105b. Sell value uses `SELL_REFUND_PCT` and `MISCLICK_GRACE_SEC` from `rules.ts`, rounded down.
- **`--ui-scale` = n / devicePixelRatio**, so one game pixel is exactly n device pixels (D009's open question, settled).
- **Fonts and tokens:** the HUD uses Silkscreen only (crisp at 8 and 16 px). Pixelify Sans renders soft at every size in Chrome, which is an open question for dialogue (T302). Both packages are pinned at 5.3.0, and their licences ship with the build. `:root` defines every `--sd-<ramp>-<n>` color from `master.ts`, and `tools/uiTokens.test.ts` keeps UI CSS on those tokens.
- **Icons:** 14×14 authored plus outline makes 16×16 for towers and enemies; glyphs are 8×8. Display names are derived from ids until `TowerDef`/`EnemyDef` get a `name` (T119).

### D019 — 2026-11-09 — T105c content data: first-pass numbers
- Towers Rivet, Thumper, and Sprinkler (tiers 1–3) and enemies Nibbler, Zoomer (`fast`), and Chonk (`armored`, armor 2) are live content with the towers.md §7 / enemies.md §5 numbers. No tier-4 specs yet (T202). The M1 Sprinkler is Chilled-only; Soaked waits for A2M2.
- **Numbers chosen where the docs were silent:** Chonk's spawn interval is 1.5 s (about 0.9 tiles apart at 0.6 tiles/s).
- **A1M1** has the seven act1.md waves on `road` and `towerUnlockWave: { thumper: 3 }`. The validator's stub guard is gone, and every rule passes for real. The new threats are Nibbler and Zoomer, exactly the cap of 2.
- **Par build timing:** if every enemy dies, the bank at each build phase is 350 / 292 / 270 / 113 / 165 / 95 / 179 for W1–W7. So **the second Thumper moves from W6 to W7** (T107's open note), and the Rivet T2 lands in W2. `rivet_only` is par with Rivets in place of Thumpers. Both builds are first-pass until T107's tuning. Orbital Strike steps join with T113.
- **Ruling on conventions' open question 1 (design tables vs content):** content files are the single home for exact numbers. Design-doc tables keep roles, intent, and target ranges, plus a pointer to the content file. Shrinking the existing number columns is task T120 (Design owner). Until then, if a table and a content file disagree, the content file wins.

### D020 — 2026-11-09 — T105a combat rules
Combat is live: the damage pipeline (`src/sim/combat/damage.ts`), deterministic targeting (`combat/targeting.ts`), and the `status`, `towers`, and `projectiles` systems. Architecture §2 has a *Combat* block, and towers.md §5 and enemies.md §2.3–2.4 have the settled details. Rulings where the docs were silent:
- **Targeting:**
  - A tower re-picks by priority each time it's ready to fire, and keeps its target between shots while it stays valid.
  - Ties go to First, then to the lowest uid.
  - With no minimum range, distance 0 is in range. Without that, a flyer passing over a tower's center was untargetable.
- **Firing:**
  - A new tower can fire on the tick it's built.
  - Spin-up runs from acquiring a target after having none.
  - A pulse tower holds its shot until an enemy is in range, so its first pulse always affects one (misclick grace).
- **Shells:**
  - A shell lands exactly `flightTicks` after firing, after that tick's movement, so a lead shot at a target holding speed lands on its center. This is tested around a corner and while Chilled.
  - Splash hits only the layers the tower targets.
  - Shells keep their stats if the tower is sold mid-flight.
- **Damage:**
  - Statuses apply after the hit's damage.
  - Any hit on a shielded enemy restarts its regen delay, even after the shield breaks.
  - A weaker chill does nothing while a stronger one runs.
  - Corroded stacks expire together.
  - HP is fractional, and an enemy at or below 1e-9 HP is dead.
- **API seams:**
  - `applyDamage(state, enemy, amount, type, source, hit?)` is the one damage entry point; Orbital Strike (T113) uses it with `{ kind: 'ability', slot }`.
  - Every kill goes through `killEnemy`, which counts `skitterkinKilled` and `killsByEnemy` and emits `EnemyDied { uid, enemy, bounty, killer, x, y }`. T105b credits the bounty there.
  - `ProjectileFired` and `ProjectileHit` fire for every attack, with uid 0 for hitscan and pulse.
- Attack kinds and statuses no M1 content uses (projectile, beam, chain, spawner; pinned, stasis, unnerved) are TODO no-ops. Under D013's "refuse, don't ignore" rule, `createSim` should refuse loadouts that need them (T121).

### D021 — 2026-11-09 — T105b waves, economy, and the end of a map
Architecture §2 has a *Waves, economy, and the end of a map* block, and the formulas are in `rules.ts`. Rulings:
- **Formulas:**
  - Clear bonus `20 + 4 × wave`.
  - Early-call bonus `round(0.5 × clearBonus × ticksLeft / countdownTicks)`, halves rounding up. An early call also cuts every ability's remaining cooldown by 25% of the seconds skipped.
  - Bounty is the enemy's bounty: 1 for fleeing units, 0 for younglings.
- **Wave resolution:**
  - A wave resolves when every enemy in it has died or leaked, so waves can resolve out of order when one is called early.
  - The map is won only when every wave has resolved.
  - Integrity 0 loses, and a loss on the same tick beats a win.
  - A countdown starts on the tick of the previous wave's last spawn, and `countdown` triggers fire on that tick.
- **Sell:** inside the misclick grace (the tower hasn't fired and was built under 600 ticks ago) the refund is the full investment, otherwise `floor(invested × 0.7)`, with float slack so 0.7 × 180 = 126. Selling frees the tile at once.
- **Stats:** `creditsSpent` stays gross. `creditsRefunded` and `creditsEarned` give the net.
- **Refuse, don't ignore (D013):** `createSim` refuses map-script triggers, actions, and conditions it can't run yet. It runs wave-phase and `tick` triggers plus `unlockTowerClass`, `cue`, and `grantCredits`.
- **Bank check:** D019's bank-per-phase numbers (350/292/270/113/165/95/179) hold exactly for an A1M1 par run with no leaks and a win, **if each step is bought as soon as the bank covers it during the countdown**. When a countdown starts, the previous wave's bounties haven't all arrived yet (W3's bank is 221, not enough for the 225 step). Buying only at the end of the countdown leaks 2 in W1. So the T108a executor buys each step as soon as it becomes affordable.
- **HUD API:** `state.schedule` (phase, countdown ticks, per-wave start/remaining/resolved), `callWaveBonus()`, `sellValue()`, and `MISCLICK_GRACE_TICKS` are exported from `sim/index.ts`. New events are `CountdownStarted` and `ScriptCue`, and `WaveStarted`/`WaveCleared` now carry `bonus`.

### D022 — 2026-11-09 — T113 Orbital Strike and T122 combat FX
- **Orbital Strike** (core-loop §3.2): 45 s cooldown, 200 Explosive damage, 1.5-tile radius, and a 1 s reticle before impact. Rulings where the docs were silent: it hits ground enemies only, its radius includes the edge (like splash), any in-bounds tile is a valid target, and it's ready from tick 0. The sim exports `applyAbilityCommand` and `reduceAbilityCooldowns` (the early call), and damage goes through `applyDamage` with `{ kind: 'ability', slot }`.
- **HUD:** the ability slot sits bottom-left with an icon, a Q badge, whole seconds left, and a 1/16-step cooldown wipe. Q or a click aims, and Esc or right-click cancels. Aiming, arming a build slot, and selecting a tower each cancel the other two.
- **A1M1 builds** cast the strike at the road corner (4,3), 2.4 s into W5 and W7. These are first-pass timings for T107 to tune with the harness.
- **FX** (`render/vfx/fxTiming.ts`, all pooled through `FxView`):
  - Rivet tracer: 90 ms.
  - Sprinkler pulse ring: 360 ms in `blue.4`.
  - Strike beam: 8→2 px over 200 ms, then a 7-burst ring.
  - Screen shake: 2 px for 240 ms, off under reduced motion.
  - Thumper shells play `fx.explosion` when they land.
  Phaser 4's WebGL Graphics doesn't draw 1-px rects, so tracers use the `rivet_tracer` sprite and beams are at least 2 px wide.
- **`SpriteId`** is now exactly the registered sprite ids (the `icon.*` carve-out is gone).
- **For the UX review:** pulse rings read faintly, and the strike's impact could be juicier.

### D023 — 2026-11-09 — T108a balance harness
`npm run sim` is real: `runHeadless()` and `createBuildExecutor()` in `src/sim/headless.ts`, the harness in `src/balance/`, the CLI in `tools/sim.ts` (`--map`, `--seeds`, `--build`, `--report` → `reports/balance.{json,md}`), and a non-zero exit on any failed check. Conventions § Balance sims documents the step semantics and the checks. Rulings:
- **Executor:** it applies each step at once with `applyPending()`, buys each step as soon as it is affordable (D021), and never drains events, so T107's `__sd.autoplay` can drive the same executor through the host.
- **Ability step timing:** a `waveStart` cast lands on the first tick after the wave starts, and an `afterSec` cast counts from the wave start. Both wait for the cooldown, and a step issued after its moment is recorded as late.
- **Step errors:** a step error (e.g. no tower on the tile) is recorded and fails the harness, and the build continues. A step kind the sim has no command for throws.
- **Margin** = integrity left ÷ max × 100. "Loses before the final third" means the last started wave is ≤ ⌊⅔ × waves⌋.
- **Refuse, don't skip:** map features the harness can't check yet fail as "refused": non-integrity objectives, flag variants, companion picks, fleeing/quiet groups, jammers, `noCounterBuilds` (the full-catalog run needs T204), and purchases in the reference profile. Story difficulty is listed as not checked.
- The band numbers' code home is `src/balance/rules.ts`. A1M1's "rivet_only below par" expectation is in `src/balance/expectations.ts` for now.
- **First A1M1 results** (13 runs, 0.2 s):
  - par wins at 100 in every seed.
  - none loses at W3.
  - alwaysCallEarly wins at 100. Its W7 strike never fires because the ability is still on cooldown.
  - rivet_only wins at 100.
  
  **Check #8 fails:** rivet_only's margin isn't below par's. Both are perfect, so Thumper isn't earning its slot, and act1.md targets a par margin of about 95. Tuning is T107's job, and the gate's `sim` step stays red until T107 lands. This was committed anyway so the harness survives container restarts.

### D024 — 2026-11-09 — T107 A1M1 playable and tuned
- **Tuning (waves only; no placements, strike timings, or unit numbers changed).** Sweeps showed par had about twice the defense it needed: it never leaked, even against 32 Zoomers in W6 or 60 Nibblers in W7. Only W1's lone T1 Rivet was tight.
  - **W1:** Nibbler ×8 @0.65 s (was ×6 @0.8). Par and rivet_only, identical through W2, each lose one Nibbler there, so QUILL's first-leak bark lands on the first shift.
  - **W7:** five big clumps (6 Nibblers @0.2 s, 2.25 s apart) plus two Zoomer ×8 groups, 46 enemies in all. Thumper's splash holds them and Rivets alone leak 5. That's A1M1's teaching point.
  - **Results** (every seed): par wins at **95** (act1.md's target), rivet_only at **70**, alwaysCallEarly at 100, and none loses at W3. Plausible human builds (Rivet spam, Thumper-heavy) score 95–100, so skipping a tower is never punished (D006).
  - **Known fragility:** rivet_only's W7 has a cliff. Spacing the clumps 2.4 s apart instead of 2.25 flips it to 95 and fails check #8. T202 re-tunes A1M1 when links and Bricks land; harden it then (T125).
  - Banks under par: 350/295/273/116/168/98/182.
- **The real game:** "Start shift" plays A1M1 (`DEFAULT_MAP_ID`). The static briefing is a modal ("Shift briefing", speaker and line, a focused "Clock in" button; Enter or Esc closes it). Game hotkeys are off while it's open, and Retry skips it. `dev_range` stays as `DEV_MAP_ID` (`?map=dev_range`) for the HUD and battle smoke flows.
- **HUD:** sell value comes from the sim's `sellValue()` (180 → 126). The wave panel shows the countdown and "Call +N", and Call is disabled while a wave is spawning.
- **`__sd.autoplay(name)`** drives the harness's `createBuildExecutor` through a new `host.setDriver`. `app/autoplay.ts` repeats the harness's two-line none/alwaysCallEarly policy, because `app` may not import `balance`. A smoke test plays par to a real win (19/20 integrity, 101 pests processed).
- **For the review:** W7's clumps overlap into a "centipede"; Thumper explosions are small; a build slot keeps its focus ring after Esc; the briefing has no threat-intel icons yet.

### D025 — 2026-11-09 — T108b smoke flows; M1 build complete
`smoke/m1.spec.ts` covers the M1 flow through the real UI: Start shift → briefing → build through the HUD → start wave → enemies and a Thumper shell on screen → `autoplay('par')` → Victory with PESTS PROCESSED equal to `stats.skitterkinKilled` (101) → Retry is a fresh run. It also covers the lose flow (`autoplay('none')` → MINOR OPERATIONAL HICCUP → Title). **`__sd.forceOutcome` is removed**, which closes D017's test-only exception. `__sd.perf()` reports sim entity counts, not view counts; screenshots prove the views. Smoke is 15 tests in about 17 s, and the whole gate takes about 31 s. With this, every M1 build task (T101–T115, T122) is done, and M1 goes to review.

### D026 — 2026-11-09 — M1 review round 1 rulings
Three reviews ran: Correctness/Architecture, Gameplay/Story, and UX/Art/Performance. Correctness found no high-severity bugs, and performance has plenty of headroom (frame ≈0.5 ms at W7, 423 KB gzipped, cold boot <1 s). The fixes go to four owners (sim, UI, art, then balance). Cross-cutting rulings:
- **Deploy delay restored.** core-loop §2.5's "a new tower deploys for 0.5 s before it can fire" wins over D020's "can fire on the tick it's built", which overlooked it.
- **An M1 radio ticker is in scope (amends D004).** act1.md's A1M1 lines appear verbatim as HUD radio notices on sim events: first leak, countdowns, the Thumper unlock. It isn't a dialogue system (that stays T302), but Act I's comedy and the first-leak darkness seed must reach the first map, which pillar 1 requires.
- **A1M1's curve is reshaped** so pressure ramps through W4–W7 rather than W1–W6 never leaking and W7 wiping an under-built player. The new harness checks are: par minus its last step ends ≥ 8 integrity; par without its strikes scores below par; rivet_only has no ±0.2 s cliff. This supersedes D024's wave numbers.
- **Tone pitches accepted:**
  - "Shift report · Incident logged" for a defeat and "Shift report · Exemplary!" for a victory.
  - "Thumper ships at wave 3" on the locked slot.
  - "Uplink recharging" for the strike's cooldown.
  - A how-to line in the briefing.
- **Feedback gaps fixed for ship:**
  - Leaks get a core flash, a pulse ring, and "−N".
  - Low integrity gets a shape signal, not only a red number.
  - The briefing becomes a real keyboard modal.
  - Value bands: Act I's ground is darker so actors sit in their own band.
  - A decor apron fills the void around the map.
  - A Zoomer `fast` tell, distinct tier silhouettes, and per-unit lateral offsets break up the W7 "centipede".
  - Impacts and builds get more juice.
- **Deferred:** keyboard-only building (a tile cursor) is T126.
- **Art-trail baseline:** M1's gallery is the first art-trail image. M2's should show the darker Act I ground, distinct tier silhouettes, and the Zoomer tell.

### D027 — 2026-11-09 — M1 review round 1 fixes landed
Four fixers applied D026: sim, art, UI, and balance. Notes beyond D026:
- **A1M1 curve** (supersedes D024's waves): W1–W3 are unchanged. W4 is Zoomer ×6. W5 is four Nibbler clumps plus Zoomer ×12. W6 is Zoomer ×20 plus two clumps. W7 is four big clumps of 8 plus two Zoomer ×12 groups.
  - **Par** builds two Rivets in setup and spends its whole bank (W7 starts with 69 unspent).
  - **Results** on every seed (margin; leaks W1–W7):

    | Build | Margin | Leaks |
    |---|---|---|
    | par | **95** | 1 in W7 |
    | rivet_only | 60 | 4 in W5, 4 in W7 |
    | par_minus_last | 85 | |
    | par without strikes | 65 | the W7 strike alone saves 6 |
    | alwaysCallEarly | 75 | |
    | none | loses at W3 | |
    | three Rivets then nothing | loses at W7 | 2 in W5, 5 in W6, 13 in W7 (gradual) |

  - **Robustness:** `src/balance/a1m1.test.ts` re-runs the harness with the W5–W7 clumps shifted ±0.1/±0.2 s, and every check holds. rivet_only touches its 40% floor at −0.2 s, so it sits at the edge (T125).
  - A first-time player with one setup Rivet leaks in W1, and the radio's first-leak line explains it. Par itself doesn't leak there.
  - W5's planning threat is slightly above W6's; round 2 judges whether that reads as a dip.
- **Harness:**
  - Alt expectations (`belowPar`, `minMarginPct`) live in `BuildsDef.altExpectations`, so `src/balance/expectations.ts` is gone and D023's line about it is stale.
  - A new `abilities` check: par without its casts must score below par.
  - Check #7 is flagged as vacuous when its cap is 100, not capped.
- **Value bands:** the art fixer went darker than D026's suggested hex values (grass `#348c48`, path centred on `#b48e80`), because the ruled values left the path no brighter than the grass. A palette test now enforces grass < path < every actor.
- **Decor is placed by an env rule**, not map data: the apron, fence, domes, billboard, lettuce, and the road running past the core.
- **Radio:**
  - Every line is verbatim from act1.md except "New hardware! Thumper Mortar, ready to deploy!", which is exempted by name in `tools/radioLines.test.ts` (Story task T128).
  - Triggers: first leak, W1 cleared (the jingle, which fills the W2 slot now that Bricks's pads line is in the briefing), Thumper unlock, W4 countdown (Goldie), first clean wave, W6 (Joke of the Shift, "It's Wednesday."), W7 (the grievance).
  - Name plates: QUILL teal.4, Bricks orange.4, Goldie green.4.
  - Each line shows for 4 s plus 40 ms per character over 60.

### D028 — 2026-11-09 — M1 review round 2 rulings
Round 2 ran two reviews. **Correctness/Architecture/Performance:** ship-ready, nothing high severity. Round 1's items are verified, the gate is green in 40 s and not flaky, and only cheap perf/robustness fixes remain. **Playtest** (three real-UI runs with the radio on): round 1's feedback, juice, radio voice, and art are at ship quality. One high finding remains. Rulings:
- **No single-wave wall for non-upgrading builds; teach upgrades.** Builds that never upgrade still lost all their integrity in one wave, two Rivets in W5 for example, because nothing teaches upgrading. The fixes are a HUD upgrade hint from W2 and a W4 warning bump. New harness guards cover alts `no_upgrades` and `two_rivets`: no single wave may cost more than 50% of integrity, and a losing build must start leaking at least one wave before it loses.
- **Results wait 1.5 s** after a win or loss so the last radio line and the leak feedback finish. Bricks's act1.md debrief shows on the win card, and a first-leak line from the last 4 s shows there too, so the first darkness seed is never lost.
- **The W5→W6 dip is intended.** It's a breather that carries the Joke of the Shift before W7. It gets documented, not retuned.
- **The pad behind the core stays where it is.** The core draws at about 60% alpha while a tower stands behind it.
- **Art trail:** the round-2 reviewer approved the current gallery as the `m1` baseline. The dioramas also get the apron and fence so the baseline matches play. M2 should improve the tier-2 silhouettes and the mid-darks inside the playfield.
- Minor fixes: radio staleness judged per batch, plus a 1–1.5 s beat before "It's Wednesday."; the fast glyph shown once per group; a red low-integrity halo; `matchMedia` cached; the HUD stat line cached; `radiusTiles` on `ProjectileFired`; `Object.hasOwn` in expectation checks; a note to run one gate at a time.

### D029 — 2026-11-09 — M1 review round 2 fixes; review closed at round 2
- **UI** (UI2 fixer):
  - The upgrade hint "Click a turret to upgrade it (U)" shows from W2 until the first upgrade, and the built towers pulse. All 1 Hz pulses share one clock.
  - Results hold 1.5 s with the sim frozen (`fastForward` skips the hold). The win card shows Bricks's act1.md debrief ("Not bad, Sprout." / "Don't name things on day one. You get attached."), plus QUILL's first-leak line when that leak fired within 4 s *and* 480 ticks of the end.
  - Radio staleness is judged per batch. A setup line drops to a 2.5 s hold when its reply is queued, and the reply shows under it. That's longer than D028's 1–1.5 s beat, because the 105-character setup must stay readable.
  - The fast glyph shows once per enemy type per battle.
  - The core turns red at low integrity and fades to 60% behind a tower.
  - Gallery dioramas match the play frame (apron, fence, decor), and the gallery smoke dropped from 28 s to 3 s.
- **Balance** (BAL2 fixer):
  - **The no-single-wave-wall rule:** the harness `gradual` check (`MAX_WAVE_LOSS_PCT`, `LEAK_LEAD_WAVES` in `src/balance/rules.ts`; maps.md §6.1) runs on every alt build. `AltBuildExpectation.outcome` (`'lose' | 'either'`) marks deliberately under-built alts.
  - **A1M1's final curve:** W4 got a warning clump, W5 is lighter, and W6 and W7 are denser. **The W5→W6 planning dip from D028 is gone**, because restoring it put `two_rivets` over the wall limit in W5. W6 still costs par nothing and still carries the Joke of the Shift.
  - **Results:**

    | Build | Margin / result | Leaks |
    |---|---|---|
    | par | 95 | 1 in W7 |
    | rivet_only | 80 | 4 in W7, its splash lesson |
    | par_minus_last | 80 | |
    | par without strikes | 75 | the W7 strike saves 4 |
    | no_upgrades | 60 | wins low |
    | alwaysCallEarly | 60 | |
    | two_rivets | loses in W6 | gradually: W4 4, W5 8, W6 8 |
    | none | loses at W3 | |

    Every check holds under ±0.2 s clump shifts.
  - `playwright.config.ts` reads `SMOKE_PORT`, and conventions say to run one gate at a time.
- **Review closed at round 2.** Round 2's only high finding (the wall for non-upgrading builds) is fixed and is now enforced by the harness. The other fixes were small and are verified by the gate and screenshots. A round 3 would mostly re-confirm automated checks, so M1 ships with the remaining low findings logged as tasks (T117, T125, T126, T128).

### D030 — 2026-11-09 — M1 shipped
M1 (the playable vertical slice, D004 as amended by D026) ships: A1M1 *Orientation Day* is winnable and losable in the browser.
- **Content:** Rivet and Thumper (plus Sprinkler and Chonk, sim-tested), Nibbler and Zoomer, and Orbital Strike.
- **Screens:** the static briefing, the Act I radio ticker, the HUD, and the title and results screens with PESTS PROCESSED and Bricks's debrief.
- **The gate:** typecheck, lint, 581 unit/sim tests, build, a 25-run A1M1 balance harness, 17 Playwright smoke flows, and the docs check, about 40 s in all. Two review rounds ran: D026 to D029.
- **Art trail:** the M1 baseline is [art/gallery/m1.png](art/gallery/m1.png). M2's image should show stronger tier-2 silhouettes and more mid-darks inside the playfield.
- **Release:** shipped as the `M1: ship` commit on `main`. Cloud sessions can't push tags, so the owner creates the `m1` release on GitHub.

### D031 — 2026-11-09 — M2 scope ("the M2 cut")
The owner said "start M2 … continue through to the end" and is away, so the orchestrator decided these forks under the kickoff's "use your best judgement". Each can be overturned on review.
- **A1M2 *Hatching Season* joins M2.** With one map, medals, Intel, Stardust, and R&D have nowhere to go. A1M2 costs one new enemy (Brood Hauler) and debuts the power node, the Sitting Ducks link, the first Stardust payout, and the **first required counter (Armor)**. That gives the harness's no-counter, full-catalog, and par-purchasable checks a real subject.
- **The playable M2 loop:**
  1. New game or continue: 3 save slots, plus SD1 export/import codes.
  2. A *Shift board* listing A1M1 and A1M2 (it stands in for the star map, T301).
  3. A briefing that shows the medals.
  4. Battle: Crossfire and Sitting Ducks links, tile bonuses, Bricks's ally post, Suppressing Fire on E, and Hold Fire.
  5. Results with medals, Intel, Stardust, and the lifetime Pests Processed.
  6. A Base with R&D Command open after A1M1. Mk II and Bricks Rapport cost 2 Intel each, so A1M1's 3 Intel buys one, which is a real choice.
- **Built and gated in campaign order** (campaign.md decides when each first appears): the loadout screen (A1M4), tier-4 specializations (Engineering after A1M4), the shop and full catalog (after A1M3), and spare runners (A2M1). The Hold Fire button is live now, because core-loop §2.7 says it "must always be available". A test-only `?save=<fixture>` hook (with `?test=1`) loads dev saves so smoke tests and the owner can reach the gated systems early.
- **Deferred to M3+:** the star map, dialogue/barks/codex/Inbox/Bounty Board/name tags (A1M2's lines play through the M1 radio ticker), character creation, Peeker, checkpoints, the Sprinkler specs (they need Soaked and Stasis), the protocol picker, wreckage, veteran modifiers, objective Intel, and A1M3 onward.
- **Story difficulty ships in M2.** It's cheap through modifiers, it un-refuses harness check #9, and it helps accessibility.
- **Field Protocols:** data for all 10, sim effects for the 3 the full-catalog check uses, and the picker in M3.
- **Gaps the plan found, settled by the tasks that hit them:**
  - The sim never applies the tile bonuses (high ground, power node) (T202a).
  - `Modifier` needs kinds for Mk II, Rapport, Coolant, Resale, Bounty, Linked Up, and Bulkhead (T200).
  - A1M2's Challenge medal gets a `passedMarker` condition (T202c).
  - Conditional link bonuses get `vsStatus` (T202a).
  - Suppressing Fire's segment is the clicked path tile ±1 along the route (T207a).
  - `SaveData.profile` is `null` until T306.
  - A new save grants Orbital Strike directly until the memo exists (T203a).
- **Plan:** 24 subtasks in waves of up to 3 agents. Critical paths: T200 → T202a → T202c → T125/T210b, and T203a → T209 → T204c → T204d/T201. T200 adds the sim seams (types, stubs, fields) up front so the sim tasks can run in parallel without sharing files.

### D032 — 2026-11-09 — M2 wave 1: sim seams (T200) and save core (T203a)
- **T200 sim seams:**
  - `Modifier` has 12 kinds (`towerStat`, `towerCost`, `enemyStat`, `economy`, `sellRefund`, `abilityStat`, `countdown`, `linkBonus`, `tileBonus`, `leakAbsorb`, `firstBuildFree`, `freeCast`).
  - `SimConfig.specsUnlocked` exists.
  - New commands: `specialize`, `holdFire`, `spareRunners`. New events: links, allies, hold fire, `MedalProgress`, `TowerSpecialized`.
  - The `links` (4b) and `allies` (7b) systems are in the tick order.
  - Refusals are split into the per-feature tables `FEATURE_GATES` (`src/sim/gates.ts`) and `HARNESS_GATES` (`src/balance/refusals.ts`). Each task lifts only its own row.
  - A1M1's numbers didn't change, only its hash. `systems/waves.ts` (where `enemyStat` and `countdown` apply) belongs to T204b.
- **T203a save core** (`src/meta/`, pure):
  - SaveData v1 has `profile: null`, and a new save owns Rivet, Thumper, and Orbital Strike.
  - It's stored as `{v, savedAt, data}`, with a `:bak` rotation only from a readable save. Loading never writes.
  - Export/import codes look like `SD<v>-<base64url(deflate-raw)>-<4 hex fnv>`, capped at 64 KB of code and 512 KB unpacked (counted while streaming). Unknown ids are rejected.
  - Dev saves: `fresh`, `after_a1m1`, `mid_m2`, `all_unlocked`.
- **Rulings:**
  - **SaveData v1 may change freely until M2 ships, then it freezes** (nothing has shipped, so no migration is owed). Difficulty and loadout presets go into v1.
  - The `?test=1&save=` hook may set a dev-only `devUnlocks` override (never honoured from imports), because the shop, Engineering, and loadout unlock at A1M3/A1M4, which don't exist yet.
  - Medal ids are `victory` / `perfect_core` / `<challenge id>` until T202c.
- **Gate flakiness:** under 4–5 concurrent agents, the ±0.2 s A1M1 robustness test can exceed Vitest's 5 s timeout, and overlapping builds swap asset hashes mid-smoke. The test gets a longer timeout; one gate run at a time.

### D033 — 2026-11-09 — T205 procedural audio
- **Engine:** a small WebAudio synth (`src/audio/`) with a voice limiter and a master limiter. All SFX recipes and music are data.
- **SFX:** every gameplay event that matters has a sound:
  - building, upgrades (pitch rises per tier), selling, rejections;
  - Rivet shots (rate-limited);
  - Thumper launch and impact, the Sprinkler pulse;
  - per-type enemy pops (cosmetic RNG, never the sim's);
  - the leak alarm and a low-integrity klaxon;
  - wave start, the early call, countdown ticks in the last 3 s;
  - Orbital Strike charge, beam, and boom;
  - a radio blip per speaker.
- **Music:** "Everglow Bright" is G–C–E, F–D–C plus its couplet, an 8-bar Act I loop at 140 BPM. Layers add in: base, then drums while a wave is on the field, then a lead in W6–W7 or at integrity ≤5. The title variant runs at 108 BPM. Cues are a wave-clear sting, a win, and a sad-trombone loss. Music ducks to 0.55 under the radio and the big SFX, and drops to half while paused.
- **Levels are verified without listening:** every recipe and cue, plus a W7-at-2× worst case, is rendered offline through the real graph. Sound peaks run −28 to −4 dBFS, battle music RMS is −21 dB, and the worst-case storm peaks at −3.0 dB after the limiter with nothing clipped. The smoke test asserts these ranges.
- **Controls:**
  - M is a global mute key, and there's a speaker button on the HUD and the title.
  - Settings persist in `stardust:settings`.
  - The volume sliders land in T209's Settings screen.
  - Audio is off under `?test=1` unless `&audio=1`.
- **Limit:** the title theme starts on the first click or key press, because of the browser's autoplay policy.
- **The owner should listen** when back; tuning by ear is the one check the automated pass can't do.

### D034 — 2026-11-09 — T204a catalog data
- **The catalog** (`src/content/upgrades/`):
  - 12 ranked upgrades: 6 global shop upgrades, 3 tower tune-ups, and 3 R&D items. The R&D items are Orbital Strike Mk II and Bricks Rapport (2 Intel each, stocked after A1M1) and protocol slots (after A1M3).
  - 10 Field Protocols (after A1M3).
  - Tower and ability access, plus Engineering prices: Everglow 2 Intel, others 3, after A1M4.
  - `availableAfter` means "once that map is won". Rapport is stocked after the companion's ability first appears.
- **Grants restate the sim's `Modifier` kinds**, because content can't import sim; a sim test checks every grant is a valid `Modifier`. Effects the kinds can't express yet (support-tower and Crane tune-ups, Specialist's pick, the Vrell-only Zibzab Tune-up) belong to later milestones.
- **`CAMPAIGN_PLAN`** lists all 18 maps. `CAMPAIGN` is the registered subset in that order.
- **Par-purchasable** (`validatePurchasable.ts`): every reference-profile item must exist, be stocked before its map, fit what earlier maps pay, and fit the protocol slots.
- New towers now need a `TOWER_ACCESS` entry and a tune-up.

### D035 — 2026-11-09 — T207a allies and Suppressing Fire
- **Suppressing Fire** (core-loop §3.2): 50 s cooldown; a 50% slow plus 20 Kinetic/s for 5 s over 3 path tiles.
  - **Rulings where the docs were silent:** the slow lands as Chilled 50%, so the strongest chill wins. The damage lands as 0.25 s beam ticks with armor applied per tick, so it is **not** an armor answer.
  - **Segment:** the clicked path tile ±1, with one zone per ground route through that tile. It shifts inward at a spawn or the core to keep 3 tiles. A non-path tile is rejected as `invalidTarget`.
- **Allies:** map data `MapDef.allies` (posts at decor markers). They spawn on tick 0 (`post`, vulnerability `never`) and shoot the nearest enemy, ties to the lowest uid. They never target `quiet_wave`, `youngling`, or `fleeing` units, and deal damage as `{kind:'ally'}`.
- **Pests Processed counts ally kills too**, because the counter is the shift's tally of every Skitterkin the colony killed. The story point is that the player's operation processed them, whoever pulled the trigger.
- **Modifiers:** Rapport is −15% cooldown on its companion's ability, Mk II is +0.5 strike radius (flat), and Coolant is −5% on every cooldown (progression §7.3).
- **Gates lifted:** companion, slot 2, `abilityStat`, and harness row #15 (par runs once per companion on pick-list maps).
- **Not yet:** A1M1's Bricks post tile isn't in act1.md ("post by the core"), so T125 adds that marker. The no-counter check ignores slot-2 abilities until T208.

### D036 — 2026-11-09 — T209 flow shell
- **Title:**
  - With no saves, *Start shift* makes slot 1 and drops straight into A1M1's briefing.
  - With saves: *Continue* first, then *New game*, *Load* (delete asks first; an unreadable slot offers *Copy raw data*), *Import code*, and *Settings*.
  - Import errors are written in Act I's voice and never scold.
- **Shift board:** stands in for the star map. It lists A1M1 and A1M2 with medal pips and Next up / Cleared + Replay / Locked / Coming soon.
- **Base:** R&D / Shop / Engineering tabs. Each locked tab shows its "Opens after …" hint.
- **Settings:** mute and Master/Music/Effects sliders, **Standard**/Story difficulty (named "standard" to match the sim and progression.md), and export/import.
- **Results:** Continue goes to the Base (or the Shift board while the Base is locked).
- **Battle config** is built from the save, including slot 2 via `companionSlot`. Any feature the sim still gates is left out, so a save ahead of the sim plays instead of throwing.
- **Unlock schedule** (`meta/progress.ts`, reading `CAMPAIGN_PLAN`): R&D after A1M1, Shop and Loadout after A1M3, Engineering after A1M4, spare runners after A1M5, Xenotech after A2M5.
- **Dev override:** `devUnlocks` lives only on dev-save fixtures, never in `SaveData`, so an import can't carry it. `?save=` works only with `?test=1`.
- **SaveData v1** gained `settings.difficulty` and `unlocks.protocols`, and is checked against the catalog. `?seed=` seeds every battle.

### D037 — 2026-11-09 — T202a stacking, tile bonuses, links, and modifiers
- **Formula** (`src/sim/bonuses.ts`): `(base + Σflat) × (1 + min(Σpct, cap))`. The inputs are:
  - `towerStat` modifiers;
  - high ground +25% range;
  - a power node +20% rate (+20% aura strength for support towers);
  - each link once (× `linkBonus`);
  - the strongest aura per kind, never the tower's own.
  
  A rate bonus applies to `60/cooldownTicks` and rounds back to whole ticks (a Crossfire Rivet goes from 30 to 27 ticks). The links system recomputes these totals only when `linksDirty` is set.
- **Links:** `src/content/links/` holds Crossfire and Sitting Ducks. `LinkId` comes from that registry, and compile fills `CompiledTowerDef.links` (`TowerDef.links` is gone). The conditional `vsStatus` bonus (+20% vs Chilled) joins the damage percent under the cap and is checked per hit (or per splash victim). The system emits `LinkFormed`/`LinkBroken` and tracks pairs and `stats.linkTicks`.
- **Modifiers applied:**
  - **Costs:** `towerCost` via `costFor`, with `invested` recording what was paid.
  - **Economy:** `sellRefund`, `bounty` (fractions carry over), `earlyCallBonus`, `startCredits`, and `coreIntegrity` (the lowest `set` wins).
  - **Movement:** `leakAbsorb`.
- **A1M1 interim:** the live links and high ground made par win at 100 with its strikes irrelevant. The minimal nudge: par skips the W6 Thumper T2, and W5/W7 Zoomer groups go 12 → 14. The results are par 100, rivet_only 70, par_minus_last 85, no_upgrades 55, and two_rivets loses in W6. Every check and the ±0.2 s robustness pass. **T125 re-tunes par back to ≈95** once Bricks's post and the Teamwork medal land.

### D038 — 2026-11-09 — T208 counter-answer model
- **Answer entries** are `{tower, minTier?, spec?, acts?, vsBodies?, vsAir?}` in `rules.ts`, sourced from towers.md. The shared model is `src/content/counterAnswers.ts`. Examples:
  - armor: Rivet T3+, Thumper in Acts I–II only (or [Bunker Buster]), Harpoon, Prism, Gloop, Skyhook [Seeker Swarm], and Mindspike only vs void/crystalline armor.
  - splash: Thumper, Gloop, Zapcoil, Rivet [Rivet Storm], Mindspike [Echo Spike], Sproing [Big Bonk], and Skyhook only when a splash-category enemy flies.
- **Reach-once rule:** a build is judged by the highest tier and spec each tower *reaches*. Reaching T3 counts even if the tower is later sold or specialized away. A loadout tower that's never built counts at T1.
- **Abilities** (either slot) count only when cast, and **a cooldown hit never answers by damage**: Orbital Strike, Suppressing Fire, and Underfoot are not armor or splash answers. Detection and jam abilities (Scanner Sweep, System Reboot, Stillness) do answer.
- **A1M2's `no_armor` build:** no Thumper, Rivets at most T2. It may cast both abilities. The harness has a new #5 check: a no-counter build carries no answer.
- The M0 doc gaps are fixed: Sproing in the splash row, Underfoot, A3M4's "no Seeker Swarm", A3M2/FIN's "no Rivet Storm / Echo Spike", conventions #6's protocols, and `youngling` staying a WaveTag.
- **Known limit:** answers aren't placement-aware, so A1M3's no-air build ("Rivets out of the air lane's reach") would be rejected. That's a task for whoever builds A1M3 (M3).

### D039 — 2026-11-09 — T210a M2 art
New sprites: the Brood Hauler (with the `carrier` tell), its sack burst and render-only scurrying young, Bricks at his post (idle and fire per facing, the post plate in every frame), raised high-ground tiles (drawn 8 px up) and pulsing power nodes, Crossfire and Sitting Ducks link tethers, and tier-2+ head frames for Rivet and Thumper (the m1 verdict). Grass gains mid-dark clumps, the second m1 verdict item. The value-band test now covers the new actors. Views that draw them come in T207b (Bricks), T202d (tethers, tower lift on high ground), and T210b (the Hauler).

### D040 — 2026-11-09 — T126 keyboard-only play and T212 menu polish
- **Tile cursor** (`src/render/input/cursor.ts`): arrow keys move a cursor to the nearest target in that screen direction. Targets are pads and towers, or any tile while aiming. Enter builds, selects, or fires the strike; Esc drops the selection, arm, or aim first, then hides the cursor. An aria-live region announces the tile. Moving the mouse hides the cursor. A test checks that every pad on every map is reachable.
- **Tower panel placement** (`ui/hud/layout.ts`): it tries the far side, then the near side, then above or below. The first spot that covers no other tower wins.
- **Menus:** Esc closes the innermost panel or screen (`ui/screens/escape.ts`). Art-direction §9 now describes the M2 menus.

### D041 — 2026-11-09 — T206a Hold Fire and spare runners
- **Commands** (`src/sim/fireControl.ts`):
  - `holdFire` and `spareRunners` take a tower uid or `'all'`.
  - `'all'` is a **master switch**: turning it off clears every tower, including ones held one by one. Towers built while it's on inherit it.
  - An unknown uid is rejected.
  - A holding tower drops its target, but its reload keeps running.
- **Spare-runners filter:** towers never *pick* `fleeing` or `youngling` units, but splash still hits them. A pulse tower waits while only spared units are in range (core-loop §2.7).
- **Stats:**
  - `holdFireTicks`, `holdFireUses` (counts only changes), per-tag spawned/leaked/killed, and `ticksSinceFiredAtSkitterkin` (runs only while a Skitterkin is in an attacking tower's range).
  - `NotFiringAtSkitterkin` fires once per run at 10 s.
  - Younglings leak 0 and move at ×0.5 (lead targeting included).
- **Harness:**
  - The executor runs `holdFire`, `spareRunners`, and `holdFireWhile` steps. Check #16 is lifted. New run invariants: no shot while holding, no spared target picked.
  - Results on a fixture map with fleeing and quiet groups: Quiet Wave run 90 vs par 95; `spareFleeing` 100 vs par 95.

### D042 — 2026-11-09 — T202c conditions and medals
- **Conditions** (`src/sim/conditions.ts`):
  - **Judged at evaluation** (a medal's win tick): `towers`, `linkActive`, `tagRatio` (false if none of the tag spawned).
  - **Accumulated over the run:** `stat` and `passedMarker {marker, enemy?}`. A unit passes once its route distance exceeds the route point closest to the marker; on a doubling route the later point counts. Medal-exempt units never count, and passes latch in `stats.markersPassed`.
  - **`flag`:** read from `config.scriptFlags`; an unset flag never matches.
  - **Forfeit at once:** `settledCondition` lets a Challenge be forfeited the moment it breaks.
  - **Triggers:** a trigger's `when` is judged once, on the trigger tick; if it's false, the event is used up.
- **Medals** (`src/sim/medals.ts`, from `cleanup`):
  - Any non-exempt leak forfeits Perfect Core at once, even a 0-cost leak or one a Bulkhead absorbs. The exempt tags are `quiet_wave`, `youngling`, `fleeing`, `medal_exempt`.
  - A loss forfeits every open medal. A win earns Victory and Perfect Core (if still open) and judges the Challenge.
  - `MedalProgress` precedes `MapWon`/`MapLost`. Medal save ids are `victory`, `perfect_core`, `<challenge id>` (`earnedMedalIds`).
  - Challenges need `name` and `description` data.
- **Ruling, markers on special tiles:** a script marker may sit on any **non-path** tile (decor, power node, high ground), not only decor, so A1M2's pump-station marker can mark its power node. T210b relaxes the `[marker]` rule accordingly.
- `createSim` refuses optional objectives until M3.

### D043 — 2026-11-09 — T202b tier-4 specializations
- **Specs as built** (towers.md §7, "Specializations as built"):
  - **Rivet Storm** (300): 9 dmg at 7.5/s after a 1 s spin-up.
  - **Railspike** (300): 120 dmg, 0.5/s, range 6, ignores armor, defaults to Strong.
  - **Cluster Thumper** (375): the T3 shell plus 4 bomblets (12 dmg, 0.6 splash, scattered within 1.2 tiles by the seeded combat RNG).
  - **Bunker Buster** (375): 140 dmg, 0.6 splash, 0.4/s, 3 Corroded stacks.
- **`specialize`** checks, in order: no tower, no specs, locked, already specialized, needs T3, can't afford. Spec cost goes through `costFor(..., true)` into `invested`.
- **Rulings where the docs were silent:** a spec whose default priority differs switches the tower to it; otherwise the player's chosen priority stays. Bunker Buster's Corroded is capped at 3 stacks.
- **T121:** `createSim` refuses loadouts whose reachable tiers or unlocked specs use the projectile, beam, chain, or spawner attack kinds, or the pinned, stasis, or unnerved statuses. They come in M3.

### D044 — 2026-11-09 — T117a specialization art and the art-trail capture
Each specialization has a distinct silhouette at 1×:
- **Rivet Storm:** ammo crates and rotary barrels with a spin frame.
- **Railspike:** outrigger legs and teal capacitor coils.
- **Cluster Thumper:** bomblet bins, plus new bomblet projectile and burst sprites.
- **Bunker Buster:** slab blast shields.

Also: the Thumper NE muzzle is fixed, `fx.explosion` is bigger with a white star first frame, and Bricks has a cannon-lowered idle. Art-direction §2/§3's hex tables now link to `master.ts`.

**The art-trail capture:** the gallery is now 17,772 px tall, past Chrome's single-screenshot limit. So `smoke/gallery.spec.ts` captures 4,096 px strips and stitches them into one deterministic `gallery.png` (up to 32,767 px, failing loudly beyond that), and CLAUDE.md step 8 is unchanged. Any Playwright run clears `test-results/`, so the orchestrator re-runs the gallery smoke right before copying `m<N>.png`.

### D045 — 2026-11-09 — T204b meta modifiers, Story difficulty, and the meta harness checks
- **Save → modifiers** (`src/meta/modifiers.ts`):
  - Owning rank n of an upgrade grants ranks 1 through n (sources `shop:<id>` / `rnd:<id>`).
  - Equipped protocols are sourced `protocol:<id>`. Specialist's `'*'` is replaced by the pick.
  - Invalid ids, ranks, duplicate protocols, or too many protocols throw.
  - A save equips no protocols until M3's picker.
  - Pools are in `src/meta/pools.ts`.
  - The battle config leaves out modifiers whose sim gate is still closed.
- **Story difficulty:** enemies have −30% HP and shields (shield regen scales too), +50% starting credits, integrity set to 30, and countdowns +50%. `enemyStat` and `countdown` apply in `waves.ts`.
- **Harness:** profiles build `SimConfig` through `meta/modifiers`. Check #6 (full catalog) leaves out grants the sim still refuses (only Salvage Rights until M3), names them in its summary, and keeps the reference profile's spec unlocks. On a fixture map with a required splash counter, the no-counter build loses at W2 with and without the full catalog. On A1M1 (no required counters), #9 Story wins at 100.
- The tracker now measures max integrity and the credits ledger from the run's actual start, so modifiers don't break the margins.
- T214's constants moved into `rules.ts`.

### D046 — 2026-11-09 — T204c run end and rewards
- **Payouts** (`src/meta/rewards.ts`, `REWARD_RULES`):
  - A first win pays the map's full Stardust.
  - A replay win pays 40% (× a veteran bonus, 0 until M6).
  - A loss on an unwon map pays 25% × the share of waves resolved; a loss on a won map pays 0.
  - Each medal pays 1 Intel, only the first time it's earned. A loss pays no medal Intel.
  - Story difficulty pays the same as Standard: no penalty for choosing accessibility.
- **Run end** (`src/meta/runEnd.ts`, pure, in meta-runtime's order): it adds the run's kills to the lifetime Pests Processed, increments `stats.runs`, adds only newly earned medals, and records completion and the best meter. Checkpoints, objective Intel, and the story steps are TODOs for M3.
- **Results:** a "Career total" under the counter, and a **Payroll** section listing the Stardust line, then each medal marked "NEW!" with its Intel, "On file", or "Next time!". A1M1's Stardust line reads "Training shifts are unpaid!" The copy is in style-guide §2.
- No mid-map retry or quit exists yet, so every run ends through Results.

### D047 — 2026-11-09 — T207b slot 2, Suppressing Fire in the HUD, and AllyView
- **Ability slot 2 (E)** shows only on maps with a companion. Both slots' tooltips and cooldown wipes use the real numbers from `abilityStats` (Mk II, Rapport, Coolant). Mk II's larger strike radius is drawn as a marching dashed ring.
- **Aiming:** only path tiles are valid. A click off the path is refused ("Can't target there") and keeps the aim. Arrow keys walk path tiles only. The segment preview uses the sim's own `segmentSpan`, so the preview is exactly the zone.
- **VFX:** the suppressed stretch is a hazard-striped strip with tracer streaks from Bricks's muzzle and spark rings. AllyView draws Bricks idling toward his target and firing.
- **Audio:** new ally sounds. Cluster bomblets merge into one rate-limited pop.
- `dev_range` has Bricks at (7,2) for smoke tests.

### D048 — 2026-11-09 — T210c A1M2 radio, item copy, and T128
- **A1M2 radio:** 12 lines verbatim from act1.md, including Kip as a new speaker (gold.3). Bricks names Denise as W1 clears. A new `enemyKilled` trigger carries the two Hauler barks; the app wires it in T206c. Unmapped until M3: "You sold Denise" (needs name tags) and Kip's `arrival_reason=bonus` variant (needs flags). `tools/radioLines.test.ts` now checks every radio table and every map briefing against that map's own act-file section.
- **Item copy** (`src/content/upgrades/copy.ts` is the home; style-guide §6.3–6.4 point to it): 19 Zibzab shop lines and 3 QUILL R&D lines, ≤100 chars, never using "!" (the Base shows them in every act). Tests check that Zibzab's named prices are true.
- **T128 resolved:** the non-canon Thumper unlock line is replaced by act1.md's canon W3 Crossfire line. Links are live since T202a, so the claim is true, and every radio line is now verbatim canon.

### D049 — 2026-11-09 — Per-map override for when a no-counter build must lose
A1M2's armor test is its Brood Hauler (armor 6). act1.md teaches it with one lone Hauler in W5, then pairs and triples in W7–8. A 300 HP Hauler takes about 49 s to walk A1M2's switchbacks, so a no-armor build's first real leaks land in W6, after the global "lose before the final third" line (⌊⅔ × 8⌋ = W5). Rather than break the teach wave or loosen the rule for every map, `BuildsDef.noCounterLoseByWave` overrides it per map. The validator caps it at ⌈0.75 × waves⌉, and builds.ts must carry a one-line reason. A1M2 uses 6, matching act1.md's and D038's "must lose by W6".

### D050 — 2026-11-09 — A1M2's armor must really be required (amends D049)
T210b's numbers showed the Hauler at armor 6 isn't an armor test: a T2 Rivet does 5 per hit to it, so an armor answer is worth at most about 2× per pad. A no-armor build therefore wins A1M2 with the full catalog, which breaks D005's threat model: a required counter must be required. Rulings:
- **The Brood Hauler's armor goes 6 → 9.** A T1/T2 Rivet hits the 20% damage floor, while a T3 Rivet and the Thumper still bite (about 3× per pad). HP may rise ≤ 20% if needed. enemies.md's row is updated.
- **The per-map lose-by override's cap becomes `waves − 1`**, never the final wave, replacing D049's ⌈0.75·n⌉. **A1M2 = W7**, on Standard and with the full catalog.
- act1.md's wave plan stays intact: a lone teach Hauler in W5, pairs and triples in W7–8.
- **Hard limit:** if armor 9 (at most 10) can't make the full-catalog no-armor build lose by W7, the agent stops and reports rather than distorting the map.

### D051 — 2026-11-09 — T125 A1M1 with Bricks and Teamwork; T124 report columns
- **A1M1** now has:
  - Bricks's post at `bricks_post` (5,8), east of the road by the gate: Kinetic 8 at 2/s, range 2.
  - Companion `{bricks, present}`, so slot 2 is Suppressing Fire.
  - The Challenge medal **Teamwork Makes the Dream Work™** (`linkActive: crossfire`), which par must earn.
  - Bricks's W5 Suppressing Fire radio line.
- **Waves re-tuned:** 8/10/12/22/32/46/72 enemies per wave.

  | Build | Result |
  |---|---|
  | par | **95** (Victory + Teamwork; one W7 leak costs Perfect Core) |
  | par without abilities | 55 (the W7 strike saves 8) |
  | rivet_only | 65, no Teamwork |
  | par_minus_last | 90 |
  | no_upgrades | 90 |
  | two_rivets | loses gradually in W6 |
  | alwaysCallEarly | 100 |
  | none | loses W3 |

  Every check holds under ±0.2 s.
- **Known weak spots, for the M2 balance review:**
  - The three-Rivets reference passes with zero headroom (W6 costs exactly the 50% cap), and other three-Rivet placements lose 14–17 in W6, a single-wave wall the harness doesn't test.
  - no_upgrades ≈ par, so upgrading barely matters on A1M1.
  - Par's Suppressing Fire casts change nothing.
- **T124:** `ProjectileHit.damage`, a per-tower damage/DPS table, a link-uptime column, and ability/ally kill lines in the balance report. The A1M1 sim test runs through `runHeadless`.

### D052 — 2026-11-09 — A1M2: why the no-armor build survived, and the fix order
T210b's sweep (armor 9–10, HP 300–360, 2–6 Haulers in W7) found that the no-armor build's real Hauler killer is **Orbital Strike**: 200 Explosive, 191 through armor 9. The full catalog makes the strike better (Mk II radius, Coolant) and adds core and Bulkhead. With Haulers in clumps, one strike substitutes for an armor answer. Rulings, in order:
1. **The no-armor build keeps its strike.** Excluding it would make the check lie, because a real player would cast it.
2. **The fix is to space the Haulers out:** release them one at a time, ≥12 s apart, in W7–8. Then the strike's ~41–45 s cooldown kills at most one per cast. This is act1.md's own escalation (a lone teach Hauler in W5, then many).
3. **Fallback, only if (2) fails:** a **teach-map exception**. The map that introduces a required counter may require the loss by its final wave (`teachMap: true`, with a reason). If the full catalog still wins there, #6 is reported as a **warning** behind an explicit `knownLimits: ['fullCatalog']` for A1M2 only, and goes to the owner. This would be the one place where D005's "the catalog can't replace counters" isn't enforced.

### D053 — 2026-11-09 — T206b story flags
- **Flags:** `src/content/dialogue/flags.ts` declares the 9 flags of campaign.md §6.2. Each has a default (false, or null for an unmade choice) and a description. The script-readable four are `door_choice`, `spared_quiet_wave`, `stardust_choice`, and `quill_choice`. `FlagId` and `ScriptFlagId` derive from the registry, and `tools/flagLedger.test.ts` checks it against the doc table.
- **Run-end rules** (`src/story/flags.ts`, a new pure module):
  - `spared_quiet_wave` is set on A1M5 when ≥75% of the quiet wave leaked.
  - `held_fire_second_look` is set on A2M3 when ≥50% of the fleeing units leaked and plain Hold Fire was used.
  - **They apply only on a map's first win**, so later scenes follow the run that completed the map.
  - The save's set flags reach scripts as `scriptFlags`.
- **Module edges:** `meta` and `balance` may import `story`.
- **Harness:** #16(a) uses the real `spared_quiet_wave` rule. #14 (flag variants) is live, with one par run per flag value on a fixture.

### D054 — 2026-11-09 — T204d R&D, Shop, and Engineering screens
- **Purchases** (`src/meta/purchase.ts`: `offerFor`, `buy`, `shelf`). Refusal reasons are checked in this order: unknown, pane locked, not stocked, tower not owned (tune-ups need the tower), no specs, maxed, short of currency. A purchase saves at once.
- **Screens:** one shared `Shelf` for R&D (QUILL), Shop ("Zibzab's Genuine Pre-Owned"), and Engineering. Each row shows:
  - rank pips, the price, and the effect derived from its grants (e.g. "+0.5 Orbital Strike radius");
  - T210c's copy, with no exclamation points;
  - "Arrives after <map>" for unstocked items.
  
  A purchase plays the upgrade (or unlock) sound and shows a thank-you; being short plays the reject sound and explains why. Shelves sort by arrival, then entry price, then name. A pane opened by `devUnlocks` is fully stocked.
- **Body-font bug found in review (T219):** "5" renders like "S" ("1.5" reads "1.S") and "fi" looks like "A". This is a readability bug in the body font at small sizes.

### D055 — 2026-11-09 — T201 loadout screen
- **Flow:** Shift board Start → the Loadout screen (when offered) → briefing (now with **Change loadout**) → battle. Lock in saves the pick, and Retry keeps it.
- **Skip rule:** the screen shows only when the loadout system is open (A1M3 won, or `devUnlocks`) **and** there's a choice to make: more than 4 tower types or more than 1 ability. The protocol and companion pickers wait for M3 and M5.
- **Presets:** `SaveData.loadouts = { last, byMap }`. The screen starts from this map's preset, else the last one, else a default pick.
- The screen shows each tower's role, cost, which towers answer the map's threats, the links the chosen four can form, and a gentle note (never a scold) if a required counter is missing.
- **Follow-ups:** the HUD build slots must use `costFor` (relayed to T202d), and Results doesn't offer Change loadout yet (T220).

### D056 — 2026-11-09 — T202d links, specializations, and the briefing in the HUD
- **Towers:** tier-4 spec bases and heads, tier-2+ heads, and towers on high ground drawn 8 px up with elevated picking. `tileToClient` returns a point that picks its own tile. Bomblets land with their own burst.
- **LinkView:** a tether between linked towers, shown on `LinkFormed` and removed on `LinkBroken`.
- **Tower panel:**
  - Stats come from the modifier-aware `towerStats`, with one line per source ("+25% range (high ground)", "+10% rate (Crossfire)").
  - Prices come from `costFor`, and the sell value from `sellValue` at the run's refund rate.
  - At tier 3 it shows two spec cards; a locked one says "Engineering unlocks after Shift 4".
  - The text is pre-wrapped, so nothing clips. The panel is 152 px wide and avoids the HUD corners.
- **Price fix:** build slots and the placement check use `costFor`, fixing the 100-vs-95 mismatch.
- **Briefing:** a threat-intel strip ("Required: Armor" plus the owned towers that answer it, or "Nothing owned answers it yet") and the three medals with "On file". Change loadout is kept.
- **HUD:** a medal tracker of three diamonds under credits; a forfeited one dims, with the tooltip "Next time!". The aim hint adds "Enter fires" while the keyboard cursor shows.
- New HUD copy, to go into style-guide §2: "Win the shift.", "Win with no leaks.", "Specialize: pick one", the lock notes, "Nothing owned answers it yet", "Enter fires".

### D057 — 2026-11-09 — T210b: A1M2 *Hatching Season* and the Brood Hauler
- **Brood Hauler:** 330 HP, armor 9, speed 0.7, leak 3, bounty 15, spawn interval 2.5 s, tells `carrier` + `armored`. On death it emits `SackBurst` with 3 render-only young (`src/sim/carrier.ts`); the young are never sim units. The validator enforces carrier tell ⇔ carrier.
- **A1M2:** 14×10, a 34-tile road down three terraces, high ground at (6,4), the power node at (10,6) carrying the `pump_station` marker, and 9 pads.
  - W5 has a lone teach Hauler. W7 sends 5 Haulers and W8 sends 6, **one every 12 s** (D052 step 2).
  - `requiredCounters: ['armor']`, `teachMap: true`, lose-by W8.
  - The Challenge is "Aim for the Sack!" (`passedMarker`).
- **D052's spacing fix worked, with the teach-map fallback.** no_armor loses in W8 on Standard **and with the full catalog**, so armor is genuinely required and D005 holds. No `knownLimits` entry is needed.
- **Results:**

  | Build | Result |
  |---|---|
  | par | 100 |
  | par without casts | 85 |
  | alwaysCallEarly | 55 |
  | Story | 100 |
  | no_sprinkler | 100 |
  | par_minus_last | 85 |
  | stops_after_w5 | 85 |

  Robust to ±0.5–1 s Hauler gaps, except the `abilities` check (par's W8 strike only sometimes decides a Hauler).
- **Open, for the M2 balance review:**
  - Par sits at 100 because one Hauler leak costs 15 points, so par can't land near 92 and is +5 over A1M1's 95.
  - A non-upgrading build hits a W7 wall (9–15 integrity in one wave), and no `no_upgrades` alt guards it, which conflicts with D028's no-wall rule.
  - EnemyView/FxView don't draw `SackBurst` yet.
  - A1M2's decor markers (`rig3`, `housing`, `scarecrow`) aren't drawn.

### D058 — 2026-11-09 — T206c Hold Fire HUD, T219 body font, T220; M2 build complete
- **Hold Fire HUD:**
  - **Controls:** H holds the selected tower ("Holding fire"). Shift+H, or the "Hold"/"Held" button in a new bottom-left "Fire control" group, is the master switch. H with nothing selected says "Pick a turret first · Shift+H holds all".
  - **Feedback:** a held tower dims to steel.3 and shows a 9×9 pause plate (a shape, not only colour), and toggling plays its own click.
  - **Spare runners:** the controls (panel toggle, Alt+H, all) stay hidden until they unlock (after A1M5, or `devUnlocks`).
- **Radio:** `EnemyDied` plays `enemyKilled` lines, so A1M2's Hauler barks are live.
- **T219:** Pixelify Sans draws "5" as "S" and "fi"/"fl" as "A" at every size from 8 to 16 px, so **all body text is now Silkscreen**. Pixelify stays as `--font-dialogue` for T302 to revisit.
- **T220:** Results offers **Change loadout** next to Retry where the map offers the loadout screen.
- **Every M2 build task is done.** The full gate is green: 1,262 unit tests, both maps' balance sims, 45 smoke flows, and the docs check. M2 goes to review.

### D059 — 2026-11-09 — M2 review round 1 rulings
Three reviews ran: Correctness/Architecture/Performance, Gameplay/Story, and UX/Art/Accessibility/Audio. The sim is deterministic and sound, and performance is about 0.8 ms per frame at A1M2 W8 2×. Rulings:
- **Issued towers.** The real save never granted the Sprinkler that campaign.md says is "Issued A1M2", so A1M2 played without it. Issued towers are derived from `TOWER_ACCESS` (`how: 'issued'`, `availableAfter`; one home), granted on unlock/start.
- **Never ship advice that loses.** Bricks's "Strong targeting on the big ones" predates armor 9 and now makes players lose, so it is rewritten in act1.md (canon first). Par's Strong step goes.
- **A1M2's seeds must be visible:**
  - The sack burst with young scurrying *back up the route toward the warren*.
  - The `rig3`/`housing`/`scarecrow` decor.
  - A Denise pointer when Bricks names her.
  - Terrace and cliff tiles are M3 (T223).
- **"&" never reaches Silkscreen,** which draws it like "$" (QUILL's very first line read "Logistics $ Lethality"). One text-pipeline substitution renders it as "and", and the R&D tab reads "Research".
- **M2's best moments get feedback:**
  - **Links:** floating text, a ring pulse, a chime, and a visible tether.
  - **Specialize:** a sound and a flash.
  - **Suppressing Fire:** an opaque striped zone, thicker tracers, and +10 dB. The sack pop gets +4 dB.
- **Feedback for the player:**
  - **Screen readers:** announcements for Hold Fire, targeting, and casts.
  - **Focus:** handled after purchases and imports.
  - **Contrast:** steel.3 for dim text.
- **A1M2 par stays 100,** with a `marginBand` reason. One Hauler leak is 15 points, so par can't sit at 92 without faking it. A1M3's par target is ≤ 90 (T224), so the monotonic chain resumes.
- **The R&D choice must matter on A1M2:** W4's Nibblers come as tight clumps a strike can catch. New alts `thumper_heavy`, `build_wide`, and `no_upgrades` (gradual) guard both the easy and hard sides.
- **New radio triggers:**
  - `enemyLeaked {enemy}`: the first leak per enemy type.
  - `bankNudge`: once per run, when a countdown starts with ≥ 250 credits banked; a never-scolding QUILL nudge.
  - Supportive `mapLost` debrief lines for both maps.
- **Correctness fixes:**
  - Per-item upgrade rank validation. A hostile import could pass validation, then crash every battle start.
  - `openBattle` fails safe.
  - Results reads the run's real max integrity (Story showed "30 / 20").
  - Currency clamps, a notice when a save write fails, and spec-key and bomblet guards.
- **Deferred:** split the 600–1,000-line HUD/FX/scene/checks files (T225); make Sitting Ducks or the power node decide a leak (T226); W7 clump readability (T117).
- **Art trail:** the round-1 reviewer approves the current gallery as the `m2` baseline direction.
  - **Better than m1:** tier-2 silhouettes, distinct specs, more actor variety.
  - **Unmoved:** playfield mid-darks.
  - **M3 should push:** terraces and cliffs, ground shadows, the clump split, death animations.

### D060 — 2026-11-09 — M2 review round 1: fixes landed; what didn't fully land
- **Landed:**
  - **Issued towers:** a real save gets the Sprinkler after A1M1, read from `TOWER_ACCESS`.
  - **Safe import:** per-item rank validation, and `openBattle` fails safe with a `menuNotice`.
  - **Results:** shows the true max integrity, plus "Issued for next shift", a save-failure notice, and a Stardust note ("Banked for Zibzab's shop…").
  - **Art:** A1M2's decor (Rig 3, the housing block, the scarecrow), road-verge mid-darks, an Armored tell, and a darker sack.
  - **UI (T227 UI items):** the sack burst with fleeing young, the Denise pointer, "&" → "and" (tab "Research"), link/spec/Suppressing Fire feedback, screen-reader announcements, contrast, focus.
- **New canon lines** (act1.md first):
  - Bricks's Hauler advice: "Mortars on the big ones. Rivets bounce off that hide till tier three."
  - QUILL's first Hauler leak: "A Hauler got out, sack and all! It looked... relieved? Logging it."
  - QUILL's bank nudge: "Unspent budget detected! Credits can't shoot. I checked. Turrets can!"
  - Bricks's supportive `mapLost` lines for A1M1 ("Everybody loses some lettuce on day one.") and A1M2.
- **A1M2 re-tuned:**
  - **Changes:** W4 is four tight Nibbler clumps, W8 has 7 Haulers, and par's W8 strike decides a Hauler, so the `abilities` check passes without the Strong step. `marginBand` is 80–100, with its reason.
  - **Results:** par 100 (85 without casts). Every alt (no_sprinkler, par_minus_last, stops_after_w5, thumper_heavy, build_wide, no_upgrades) wins. No-armor loses in W8, with and without the full catalog. alwaysCallEarly 30. Robustness 9/9.
- **Didn't fully land, accepted for M2 and logged as tasks:**
  - **Mk II and Rapport change no A1M2 result.** A1M2's 34-tile road gives towers time, so W4's clumps never leak. The R&D pick matters on A1M1 replays (Mk II earns Perfect Core) and must matter from A1M3 on (T228).
  - **A player who never upgrades *and never spends* still hits a W7–W8 wall on A1M2.** Trimming W7 only moves the wall to W8 and lets no-armor win with the full catalog. The `no_upgrades` alt is therefore par-without-upgrades plus one W6 Thumper, and the never-spend player is helped by QUILL's bank nudge instead (T229 revisits this with A1M3's curve).

### D061 — 2026-11-09 — M2 review round 2 rulings; review closes at round 2
Both round-2 reviewers call M2 ship-ready with one small fix each. Every round-1 item lands in play, the gate is green in 111 s with no flakes, and the art-trail reviewer approves the gallery as the `m2` baseline (55 sprites, 974 frames, up from 38 and 438). The fix round (T233):
- **Medal-forfeit sounds** play only mid-run, at most one per frame, never over the win or lose cues. Otherwise up to three stack under the lose cue, or one falls over the win jingle.
- **The bank nudge is its own radio batch,** queued after the countdown's lines, so QUILL never "answers" another speaker's line. At W7 it read as mocking Bricks's pension line, an Act III tear-beat plant.
- **The issued Sprinkler is announced:** a canon QUILL line at A1M2's start (act1.md first) introduces it and Sitting Ducks, plus a one-run NEW pip on its slot. Today it arrives silently while A1M1 announces the Thumper.
- **The "young running home" must be seeable:** ~2.5 s, 2–3 tiles, full opacity until the last 0.3 s, and one young pausing to look back. The light touch stays, but it must read as creatures fleeing, not debris.
- **Smaller fixes:**
  - **HUD hints:** the Denise pointer centres on the turret head and pulses while the line shows, and the upgrade hint shows once per save.
  - **`menuNotice`:** clears on Title and on slot changes, and a failed Retry shows it.
  - **Robustness and lint:** link callouts guard against unsupported glyphs (with a test over every link name); the smoke lint warnings are fixed.
- **Deferred to tasks:**
  - `silkText` applied in the view-model builders instead of per call site (no live bug: T234).
  - Remaining per-frame allocations (ghost label, `sellValue`) (T234).
  - The Results Career-total count-up and a first-payday marker, plus build floaters overlapping link callouts (T235).
- **Review closes at round 2.** The round-2 fixes are small and gate-verified, so a round 3 would mostly re-confirm automated checks.

### D062 — 2026-11-09 — M2 review round 2 fixes landed
- **Sound bug found and fixed:** `app/audio.ts` subscribed to only 13 event types, so the link chime, the specialize sound, the medal forfeit, the sack pop, Bricks, and Hold Fire never played in a real game. The subscription list is now derived from a table in `eventSounds.ts` that must name every event type, so a new event can't be silently unheard.
- **Medal-forfeit sounds:** at most one per frame, never in or after the win/lose frame.
- **The bank nudge** is its own radio batch, never a "reply".
- **The issued Sprinkler is announced:**
  - A new `issued` radio trigger plays after the briefing closes. The canon QUILL line (act1.md § A1M2): "New hardware! The Frostline Sprinkler chills pests. (Gently!) Set it by a Thumper: chilled pests are Sitting Ducks!"
  - A teal NEW tag marks the slot the first time the save takes a newly issued tower into battle (`src/meta/hints.ts`).
- **The young running home:** 2.5 s and 2–3 tiles at full opacity, drawn above the turrets, with one pausing 0.55 s to look back at the burst.
- **Denise pointer:** sits on the turret head and pulses while the line shows.
- **Hints and notices:** the upgrade hint shows once per save (`SaveData.seenHints`, optional on read). `menuNotice` clears on Title, slot, and session changes, and a failed Retry lands on the Shift board with the notice.
- **Robustness:** link callouts skip text they can't draw.

### D063 — 2026-11-09 — M2 shipped
M2 (*Loadout, Upgrades & Meta Progression*, the D031 cut) ships. The owner said "start M2 … continue through to the end" while away; every fork decided under "best judgement" is logged in D031–D062 for the owner's review.
- **The playable loop:**
  1. New game (3 slots, SD1 export/import codes).
  2. The Shift board: A1M1 *Orientation Day* and A1M2 *Hatching Season*.
  3. Loadout (gated after A1M3) and a briefing with the threat strip and medals.
  4. Battle:
     - Crossfire and Sitting Ducks links;
     - high-ground and power-node bonuses;
     - tier-4 specializations (gated);
     - Bricks at his post with Suppressing Fire on E;
     - Orbital Strike on Q;
     - Hold Fire (H / Shift+H);
     - keyboard-only play.
  5. Results: a payroll with medals → Intel and Stardust, the lifetime Pests Processed, and the issued towers.
  6. The Base: Research (Mk II or Rapport), the Shop and Engineering (gated).
- **Also in M2:**
  - procedural audio (SFX for every event, layered Act I music);
  - Story difficulty;
  - story flags;
  - the Act I radio with every line canon;
  - the Brood Hauler (armor is genuinely required on A1M2, even with the full catalog).
- **The gate:** typecheck, lint, 1,321 tests, build, 64 balance runs over 2 maps (incl. full-catalog, Story, flag variants, and robustness), 46 Playwright flows, and the docs check: about 110 s.
- **Reviews:** two rounds (D059–D062).
- **Art trail:** [art/gallery/m2.png](art/gallery/m2.png). Stronger tier-2 silhouettes, distinct specs, and 55 sprites (from 38). M3 should push terraces, cliffs, and ground shadows (mid-darks), clump separation, and death animations.
- **Known limits carried to M3:**
  - The R&D pick changes no A1M2 result (T228).
  - The never-spend player hits a W7–W8 wall on A1M2, mitigated by QUILL's nudge (T229).
  - A1M2 par sits at 100, so A1M3 targets ≤ 90 (T224).
  - Oversized UI files need splitting (T225).
- **Release:** shipped as the `M2: ship` commit on `main`. Cloud sessions can't push tags, so the owner creates the `m2` release on GitHub.

### D064 — 2026-11-09 — M3 scope ("the M3 cut")
The owner said "Please continue to M3". The forks below were decided under the kickoff's "use your best judgement" and can be overturned on review.
- **M3 = Act I, complete:** A1M3–A1M5 playable through **the Quiet Wave (C1) and the stinger**, told by a real dialogue system. A cut that stops at A1M4 has no crack in it, and C1 plus "Rig Nine stops answering" is Act I's payoff (bible §6; campaign §6.1). One milestone, not two.
- **In scope:**
  - **The maps (T304):** A1M3–A1M5, with the Puffwing, Bunchling, Elder, Digger, Chitterbloom (boss), and Gerald. Towers Skyhook and Zapcoil (T1–3). Air lanes, wreckage and the salvage drone, a second spawn, and `driveOff`. Time Dilation, Clearance Sale, and Conductive. Objective Intel.
  - **Dialogue (T302):** it replaces the M1 radio ticker, migrating every line verbatim.
  - **Character creation (T306).**
  - **The codex and the Everglow Inbox,** Act I scope (T303).
  - **The shop:** it opens with the Zapcoil sample and the early-ask scene, plus the protocol picker (T308).
  - **The Peeker.**
  - Every M2 carry-over.
- **Deferred to M4:**
  - **The star map (T301):** no doc specifies it, Act I is linear, and the Shift board already does the job. Pitch: the Shift board is Everglow's duty roster, and the star map opens in Act II as the world widens.
  - **Objectives and checkpoints (T305):** Act II uses them first.
  - **The Sprinkler, Skyhook, and Zapcoil specs:** they need homing, charge, Soaked, and Stasis, and the reference profile buys none before A2M2. Engineering shows them as "Arrives in a later shipment", a logged deviation from campaign §4.1.
  - Codex annotations and the Bounty Board.
- **Plan:** 30 tasks in 8 waves of up to 4 agents. The critical path is T300a → enemy/tower systems → A1M3 → A1M4 → A1M5 → flow → curve pass. Two seam tasks come first: T300a (sim/content) and T300b (story/saves, with SaveData v2). They pre-register every new unit under its final sprite id, so parallel tasks never share an index file and art never edits data.
- **Gaps for the owning tasks to settle and log:**
  - Gerald: the path vs the air, and whether splash counts as a hit.
  - Clean Audit's wording.
  - A1M5's order of party, Results, and stinger.
  - C1 on replays: lines read *this run*, payoffs read the flag.
  - A1M1's briefing choice has no replies.
  - The codex and memo bodies are unwritten.
  - The `burrower`/`huddle` tells are only "proposed".
- **Balance notes:**
  - 20 integrity moves margins in 5-point steps.
  - A1M3's par target is ≤ 90 (T224).
  - Mk II must decide a result on A1M3 (T228).
  - Bricks's Rapport can only matter on A1M5 (the companions on A1M3/A1M4 are QUILL and Zibzab).
  - The gate's sim time roughly triples; the budget stays ≤ 5 min.

### D065 — 2026-11-09 — T225/T234 file splits (behaviour-preserving)
The oversized files are split by responsibility with every importer updated. The sim report is identical before and after: every margin, hash, outcome, and check matches.
- `app/hud.ts` (1,150 lines) → `hud.ts` (bindHud + signals), `hudText.ts`, `hudViews.ts`, `hudPanel.ts`.
- `ui/hud/index.tsx` (943) → one file per component.
- `FxView.ts` (839) → `FxView` (strike/segment) extending `TransientFx` (the pooled effects).
- `BattleScene.ts` (804) → the scene plus `battleEvents.ts`, `BattleHover.ts`, `input/ghostLabel.ts`.
- `balance/checks.ts` (597) → `parChecks`, `altChecks`, `freeChoiceChecks`, and `counterChecks`, assembled by `mapChecks.ts` in the original order.

Three files stay at 430–470 lines, each one cohesive pool or frame loop. T234 is done: `silkText` is applied in the view models, ability slots, and loadout; the per-frame allocations are gone (`sellValueInto`, labels prebuilt); and the small dedupes are in.

### D066 — 2026-11-09 — T300b story and save seams
- **Dialogue types** (`content/dialogue/types.ts`): the 5 node kinds of style-guide §5, plus scenes, barks with triggers, conditions, tokens, glyphs, and expressions. The types reject a wrong speaker, a wrong expression for that speaker, and undeclared flag values.
- **18 speakers** (`speakers.ts`): each with a name, colour, frame, `portrait.<speaker>`, and `blip.<speaker>`.
- **Profile** (`profile.ts`): pronoun sets, callsigns, arrival reasons, and ASCII-only player names.
- **Registries and stubs:** empty scene and bark files for A1M1–A1M5; codex and memo registries; `story/` stubs naming T302a and T303.
- **SaveData v2:**
  - adds the player profile (name, pronouns, callsign), `campaign.seenEnemies`, and `loadouts.protocols` with `protocolPicks` (one equipped set per save, shared across maps), and makes `seenHints` required;
  - the **v1 → v2 migration** keeps the profile null, so the intake runs on Continue, and seeds seen enemies from A1M1/A1M2;
  - M2's SD1 codes still import, and export is now SD2;
  - T218: saved flag values are checked against each flag's declared values.
- **Rulings:**
  - `arrival_reason` lives only in the flag, not in the profile.
  - New conditions `{outcome}` and `{thisRun}`. C1's lines read *this run*, while payoffs read the flag.
  - New bark triggers `bank_nudge`, `enemy_leaked`, `neutral_hit`, `tower_issued`, and `menu`.
  - Nodes get an optional `label`.
  - Scene slots get `base_<name>`.
  - Scene, memo, and codex ids in saves are checked by shape only.

### D067 — 2026-11-09 — T310a portraits (batch 1)
48×48 portraits for the player, Bricks, QUILL, and Sterling. Each has neutral/happy/worried/angry/sad expressions with `_talk` frames, and every portrait bakes a dark variant for an absent speaker. QUILL adds `policy` with a one-frame gold `policy_flash` and scanline idles. Built variants: the player's `reflect_confetti` and QUILL's `party_hat`.
- **The player has no visible face.** Expressions read through the visor, its shadow acting as a brow, plus a thumbs-up, a sweat drop, or an anger mark. That keeps the protagonist open to any player-chosen identity (D001 #2).
- **Sterling's smile never changes**, whatever her eyes do. That's the Everglow tell, in the art.
- Later-act variants (Bricks `pebble`, QUILL `purge`, the player's `reflect_violet`/`reflect_pebble`) come with their acts.
- The gallery is now 27,090 px tall, against the stitched capture's 32,767 px limit; paginate before M4.

### D068 — 2026-11-09 — T306 character creation
- **New Hire Intake:** an Everglow onboarding form opens on New game (the save is written only when the form is signed; Back or Esc writes nothing) and on Continue/Load/Import for saves without a profile (migrated v1).
  - It asks for name, pronouns, and an arrival reason, with nothing pre-selected, and keyboard radio groups for pronouns and reason.
  - The callsign reads "Assigned in the field by your supervisor", so Bricks still names you "Sprout" in A1M1's briefing.
  - The small print says the field supervisor may read your file, which seeds A3M3.
  - A file-note preview fills in the player's tokens. The copy's home is act1.md § Character creation · New Hire Intake.
- **Settings ("Your file"):** edits name and pronouns. The callsign and arrival reason are read-only story facts (core-loop §6.1).
- **Shift board:** shows "JPT-1 {name} · #ED-447".
- `?test=1` skips the intake, the same as the radio and audio in tests; `&intake=1` turns it back on.

### D069 — 2026-11-09 — T300a sim and content seams for Act I
A1M1/A1M2 harness numbers are unchanged. The hashes change because state fields were added.
- **Declared:**
  - **Command:** `clear` (rejected until T304b).
  - **Events:** `NeutralHit`, `BossPhase`, `BossEnded`, `WreckageCleared`, and `ProjectileHit.reduced` (live, for the armor "plink").
  - **Unit fields:** burrow/split/huddle/boss/neutral, with matching per-unit state.
  - **Ability state:** wave-count ability cooldowns, and discount charges.
  - **Wreckage state.**
  - **Stats:** `neutralHits`, `wreckageCleared`, `lateSells`.
  - **Ability effects:** `slowAll`, `discount`.
  - **`ObjectiveDef`.**
  - **T119:** towers and enemies carry display names.
- **Stub systems in the tick order:** wreckage (1b), enemy abilities (4c), chain attacks.
- **Content stubs:** Skyhook, Zapcoil, Puffwing, Bunchling, Digger, Elder, Chitterbloom, Gerald, Time Dilation, and Clearance Sale, under **final sprite ids** with placeholder art.
- **Gates:** each feature is gated by a row naming its lifting task:
  - T304a: projectile, flying, neutral.
  - T304b: chain, salvage.
  - T304c: burrow, split, huddle, boss.
  - T304d: slowAll, discount, firstBuildFree, freeCast.
  - T304f: objectives.
  - M4: beam, spawner, Pinned, Stasis, Unnerved.
- **First-pass numbers for the owning tasks to confirm:**
  - Skyhook fires flak bursts at 10 tiles/s.
  - Zapcoil's `jumps` counts jumps after the first hit.
  - Spawn intervals.
  - Chitterbloom's phase-3 huddle and leak.
- Gerald is provisionally an air unit; T304a settles it.
- Meta pools leave out anything still gated.

### D070 — 2026-11-09 — T302a story runtime
- **Runner** (`src/story/runner.ts`): pure and deterministic, with a plain-data cursor `{scene, index, step, effects, chose}`. API: `start`, `advance(scene, cursor, ctx, choice?)`, `resume`, `scenePlays`, `pressButton`, `sceneSlot`. Branch nodes use `goto` (lint refuses a `then:` key).
- **Tokens:** `resolveText` with worst-case lengths `{name}` 16, `{callsign}` 9, `{pests_processed}` 9, `{evacuated}` 5. A missing profile falls back to Technician / Sprout / they. The token grammar's home is `content/dialogue/rules.ts`, because content can't import story.
- **Conditions:** flag, act, `mapAtLeast`/`mapIs`, stat, `seen`, `outcome`, `thisRun`, and `all`/`any`/`not`.
- **Barks:**
  - a candidate needs its trigger, its `when`, and its speaker present;
  - **once per map** by default, or `once: 'campaign'`, or `cooldownSec` to repeat;
  - most specific wins, unplayed before played, ties by seeded draw;
  - **6 s of spacing**, and a blocked bark is dropped, never queued;
  - priority boss > first-time > repeat;
  - barks are standalone, never replies (the D061 lesson).
- **Name tags:** Bricks's names are bound to maps, so `bricksTagIndex` is the position after the furthest map tagged. A failed tag waits for the next wave clear.
- **`validateDialogue`:** 18 rules, including line lengths, `{name}` use, the policy tell, the "!" budget per act, speaker/expression validity, reachable nodes, and no dangling jumps.

### D071 — 2026-11-09 — T310b portraits (batch 2)
- **Portraits:** Zibzab (the `vrell` palette, no human skin, eyestalks moving independently), Goldie, and Kip, each with the base contract. Prim is a comms screen with scanlines and Auditor-orange eyes, so it never reads as QUILL. Gerald is a 16×16 icon whose chime lamp turns gold when he "talks".
- **Gallery:** portrait cards go two to a row, bringing the page to 27,829 px, and the gallery test's timeout is now 90 s (it ran 37 s under full parallel load).
- Later-act variants are T318. Until they exist, dialogue falls back to the base frames.

### D072 — 2026-11-09 — T304a air, Skyhook, Puffwing, and Gerald
- **Air:** air lanes must end on the core (a compile error otherwise). Flyers move like ground units and leak 1. Each tower hits only the layers its tier targets, and its splash follows the same rule. Skyhook flak aims at an intercept point and bursts there; it doesn't home. Flak flies at 10 tiles/s (confirmed). Puffwings spawn 0.6 s apart, so a burst catches two or three.
- **Gerald (doc fork settled):**
  - **What he is:** an air unit that flies the *ground path*, shot only by towers that hit air (Rivet, Skyhook).
  - **What counts as a hit:** only shots aimed at him. That plinks, emits `NeutralHit`, and counts `neutralHits`. Splash, pulses, and chain jumps pass him by, so Return to Sender measures the hold-fire choice, not bad luck.
  - **At the end of the path:** he leaves with `NeutralExited`, with no leak and no Perfect Core cost. He still counts toward his wave's resolution.
  - **Movement:** HP 100 and speed 1.2, so he runs ahead of the Nibblers and draws First-targeting fire.
  - **Map validation:** he adds no trait or threat to a map.
- **Seams:**
  - The chain skips neutral units on jumps (T304b).
  - Suppressing Fire skips air units (T304d).
  - Allies skip neutral units (T304c).
  - Render releases Gerald on `NeutralExited` (T312a).
  - The harness holds fire from Gerald's spawn until `NeutralExited` (T313).
- **Follow-up:** spec counter-answers should require *authored* specs. The `all_unlocked` dev save owns Skyhook's M4 specs, so loadout suggests "Skyhook (Seeker Swarm)" (T319).

### D073 — 2026-11-09 — T304c split, huddle, burrow, and Chitterbloom
- **Burrow:** 4 s on the surface (the last 0.8 s is a tell), then 2 s underground at 1.5× pace. Underground it is untargetable and immune, but it still leaks. **No Act I tower answers burrowing**, so Diggers stay threat intel only (never a required counter) until Act II's burrow answers. Those answers need a flag that lets hits reach burrowed units (M4).
- **Split:** only a kill splits (a leak doesn't). Children spawn in `cleanup` with the run's scaled defs, joining the parent's wave and tags, 0.25 tiles apart.
- **Huddle:** each ally gets one huddle per tick, capped at the leader's pace. A huddle never speeds anyone up.
- **Chitterbloom (boss):**
  - **Phase 1:** a sneeze every 5 s, each with a 1.5 s tell.
  - **Thresholds:** damage stops at each one, and the new phase opens with 1.5 s of invulnerability (shots plink).
  - **Phase 2:** two 3 s burrows, each surfacing with a Bunchling.
  - **Phase 3:** Haste 50% plus the huddle.
  - **At 0%:** `driveOff`. She becomes untargetable and leaves by the nearest edge within 4 s, taking every live unit of her wave with her.
  - **Boss rules:** a boss leak drains all integrity (no Bulkhead). Bosses take chills at half strength. A boss wave's clear bonus is ×3; the early-call bonus uses the plain bonus.
  - **Script hooks:** `bossPhase` and `bossHpPct` triggers; the `bossEnd` action (`driveOff`/`retreat`). `pivot` and `layToRest` stay M4.

### D074 — 2026-11-09 — T311a Act I unit art
Real art went in behind T300a's ids. No data changed.
- **Towers:**
  - **Skyhook:** steep twin barrels, a quad mount from T2, sky-blue trim.
  - **Zapcoil:** a new Vrell scrap base with a price tag, and a claw-arm coil head firing blue-white arcs.
- **Enemies:**
  - **Puffwing:** fluff wings that flap.
  - **Bunchling:** three lobes with pink seams.
  - **Digger:** a `dig_<facing>` tell; there's no burrowed-mound art, because the docs give none.
  - **Elder:** a mossy shell, white brows, and pulsing gold huddle spots.
  - **Gerald:** matches his portrait.
- **Icons and tells:** wave-preview icons, tower and ability icons, and the flying/burrower/splitter/huddle/boss tells.
- **New ids:** `enemy.youngling` and `prop.peeker` (frames hidden, peek_0, peek_1, duck).
- **Gallery:** cards pack side by side, showing one extra palette and only the first `+selected`/`+jammed` frame. The page dropped from 27,829 to 16,132 px, well under the capture limit. Only Chitterbloom remains a placeholder (T311b).

### D075 — 2026-11-09 — T303 the codex and the Everglow Inbox (Act I)
- **Content:** 32 codex originals (every Act I entry the act file lists) and 6 memos (`memo_a1_00`–`_05`), in Everglow's voice with the darkness in the small print. Doc-quoted text is verbatim, checked by `tools/inboxCopy.test.ts`.
- **Unlocks:**
  - Enemy entries unlock when the enemy is seen; tower and ability entries when owned; places, people, and things when their map is won.
  - A new run-end **step 8** delivers due memos (with gifts) and unlocks entries. Entering the Base re-runs it, so older saves catch up.
- **The welcome memo grants the strike.** `createNewSave` delivers `memo_a1_00`, whose gift is Orbital Strike, replacing D031's direct grant. A save that already owns the strike gets the memo with no second grant.
- **Read state:**
  - **Dwell rule:** an item the pane opens on its own counts as read after 0.8 s; one you pick counts at once.
  - **Storage:** read marks live in `story.seen` (`codex_<entry>__<version>`), with no new save field.
- **Base tabs:** Inbox · Codex · Research · Shop · Engineering, opening on Research. NEW badges, fully keyboard-driven, with small print behind a toggle.

### D076 — 2026-11-09 — T304b Zapcoil chain, Conductive, and wreckage
- **Chain** (`src/sim/attacks/chain.ts`):
  - **Targeting:** it aims like Rivet, then each jump goes from the last enemy struck to the nearest unstruck enemy in range. Ties go to the lowest uid, and the chain stops when nothing is in range.
  - **Falloff** compounds (10 → 8 → 6.4).
  - **Neutrals and spared units:** jumps skip neutrals but land on spared units, like splash. A neutral first target is a `hitNeutral`, and the arc still jumps on.
  - **Events:** one `ProjectileFired`, then one `ProjectileHit` per victim in order, which gives render the arc.
- **Conductive (a new link):** a Zapcoil next to a Sprinkler gets +2 jumps (Linked Up scales it, rounding down), and the Sprinkler Soaks targets for 3 s from tier 1. Soaked's only live source is this link until the Sprinkler's own tier-3 Soak (T321, M4).
- **Wreckage:** `clear` queues the salvage drone, which clears one tile every 6 s (3 s with Salvage Expert). Cleared tiles read as their `underWreckage` everywhere, so builds, tile bonuses (a hidden node pays), and invariants all use the live tile. Salvage is paid through `earn`. Salvage Rights and Salvage Expert are live.

### D077 — 2026-11-09 — T304d Time Dilation and Clearance Sale
- **Time Dilation** (core-loop §3.2): 60 s cooldown, untargeted. A map-wide field chills every enemy 40% for 6 s, including air, burrowed units, and late spawns. Neutral units are never slowed. The strongest chill still wins, and bosses get half (20%) through `applyChill`.
- **Clearance Sale:**
  - **Charges:** loads 3 charges at 40% off. Each build, upgrade, or specialization spends one. A recast replaces the charges left rather than adding to them.
  - **Cooldown:** counted in **wave starts**. Cast in W1, it's ready as W5 starts. Rapport and Coolant apply as percentages rounded to whole waves, so Coolant leaves it at 4 and Rapport makes it 3.
- **Price order:** `costFor`, then Rapid Deploy (first build free; no charge spent), then the sale (`round(cost × 0.6)`). `invested` records what was paid, so a refund is 70% of the discounted price and a free tower refunds 0.
- **Ready Room:** one free cast per slot from W1's start until W2 starts.
- **Suppressing Fire** now hits ground units only (it can't hit Gerald).

### D078 — 2026-11-09 — T309 the Peeker
`prop.peeker` sits on any map's `peeker` marker.
- **Behaviour:** it peeks for 3 s every 20–40 s of play (pause stops the clock). It stays down while an enemy is within 2 tiles or the cursor is on it, and ducks if it was out. Its timing is seeded from the battle seed, never the sim's RNG.
- **Poking:** a plain click, or Enter with the keyboard cursor, ducks it with a squeak. Only on Act I maps.
- **The first poke writes `peeker_poked` to the save at once** (`app/peeker.ts`), not at run end. It counts whether the run is won, lost, or abandoned, and it never enters the sim's command log. The flag pays off in A3M6.
- There's no bark, because act1.md has no Peeker line.

### D079 — 2026-11-09 — T313 harness extensions for Act I
- **Placement-aware answers:** a placed tower answers a counter category only if one of its placements reaches a route that category's enemies take. Reach = its longest attack range (×1.25 on high ground) + 0.5 tiles of slack. Unplaced loadout towers and towers with no range still count. The validator and the harness share the model.
- **New executor steps:**
  - `specialize`;
  - `clear` (a later build on that tile waits for the drone);
  - `holdFireWhile: 'neutral'`, Gerald's macro: hold fire on each pass until he exits.
  
  Buys wait for the price the sim will actually charge, and ability steps wait until the slot is ready.
- **R&D-pick runs (T228):** par runs once per allowed R&D pick (`par@rnd:<id>`) and must win. A builds field `rndPickChanges` requires a listed pick to change par's outcome, margin, or medals on some seed.
- **Timing:** 70 runs in 4–7 s, single-threaded, so no worker threads are needed yet. The whole-map balance tests get a 30 s timeout under load.
- **For A1M3:** the build uses `holdFireWhile: 'neutral'`, a W2 `clear`, and `rndPickChanges: ['orbital_strike_mk2']`. The no-air build keeps its Rivets more than 3.5 tiles from the air lane.

### D080 — 2026-11-09 — T302b the dialogue UI
- **Comms panel** (top-left, in the radio's old slot):
  - the portrait with talk frames, QUILL's scanline and policy flash, and a dark frame for an absent speaker;
  - the speaker's coloured name plate, and text typed at 40 chars/s;
  - a reply shows under its cue, and the reply button appears once the line has typed out.
- **Scenes:**
  - **Layout:** a 400 px bottom panel, or a full-screen stage for `scene_*`.
  - **Controls:** Skip/Next on click, Enter, or Space. Choices are aria buttons with the first one focused and Up/Down to move; the line being answered stays on screen. **Esc skips to the next choice or the end.**
  - **Briefing:** plays in the existing modal, with Change loadout kept and Clock in focused at the end.
- **Pausing:** in battle, every scene except the briefing pauses play and restores the speed it found (a player's own pause stays).
- **Barks:** 6 s of sim-time spacing, dropped and never queued, and never over a line or a scene.
- **Dialogue font:** dialogue uses **Silkscreen 8**. Pixelify Sans has no fix for its "5" bug, and art-direction now proposes dropping it.
- **Radio adapter:** until T302c migrates the radio tables, a fallback adapter plays them.
- **Tests:** `?test=1` keeps dialogue off unless `&dialogue=1`.

### D081 — 2026-11-09 — T311b Chitterbloom, wreckage, and the salvage drone
- **Chitterbloom** (`enemy.chitterbloom`, 58×46 against the 64×64 boss budget). Anims: walk, sneeze tell, sneeze, dig, `under` (a mound with her crown showing), surface, phase-3 `panic`, the invulnerable `puff` (alternated with the selected variant for a shimmer), and `flee`. Four facings, two of them mirrored.
- **Wreckage** (`prop.wreckage`): a crashed delivery drone or a toppled lettuce cart, each with a beacon blink and a half-cleared frame.
- **Salvage drone** (`prop.salvage_drone`): it hovers inside its own frame, so render adds no lift. `fly` and `work` (tractor-beam) anims.
- The placeholders folder is gone, and every M3 unit now has real art.
- The gallery shows mirrored frames at 1× only and is 18,147 px tall.

### D082 — 2026-11-09 — T312a rendering air, combat FX, and wreckage
- **Air:**
  - Flyers draw 12 px up over a shadow, with a 1 px bob that turns off under reduced motion.
  - Air lanes are dotted lines drifting toward the core. They show while flyers are in the current or next wave, or while an anti-air tower is armed.
  - Flak climbs to the flyer's height, bursts there, and rings its splash on the ground.
- **FX:**
  - jagged blue-white chain arcs, one per hop;
  - Gerald's plink spark and "PLINK!" callout (at most once per 0.7 s);
  - Time Dilation's teal tint and ripple;
  - a zigzag teal Conductive tether.
- **Wreckage:**
  - The beacon blinks, queued wrecks show their place in line, and a wreck goes half-cleared as the drone works.
  - The drone flies in from the core, chains between queued wrecks, then flies home.
  - **A plain click or Enter clears.** "Drone already on it" and "Clear it first" are the notices. Every render and input path reads the *live* tile.
- **Bug fixed:** zero-delay bursts in `TransientFx` never played, which had hidden death pops and shell bursts.

### D083 — 2026-11-09 — T314 Act I audio
- **Sounds:** every event type now has a sound row (D062).
  - **Combat:**
    - flak fire and burst;
    - a zap per chain jump (45 ms apart, rising 2 semitones each, rate-limited);
    - the armor plink on `reduced` hits.
  - **Units:**
    - flock wing-flaps (one voice per flock);
    - burrow and surface;
    - the split pop;
    - a huddle coo;
    - Gerald's chime and exit whistle.
  - **The boss:** arrival, sneeze tell, sneeze, phase change, retreat, and a `boss_sting` cue. The docs ask for no boss music layer, so there isn't one.
  - **Abilities and the drone:** Time Dilation's pitch-down swell, Clearance Sale's ka-ching, and the drone's fly/work/cleared sounds.
  - Sounds that no event announces come from `fieldSounds.ts`, which reads sim state after each frame.
- **Voices:**
  - **Blips:** 14 per-speaker blips, including Kip's own. The narrator, system, KFA, and Hollow speakers are silent by design.
  - **Typewriter tick:** pitched per speaker, at most once every 55 ms, and quiet for 160 ms after a line's blip.
- **Levels:** every sound peaks between −34 and −4.3 dBFS with nothing clipping. **The W7/boss storm peaks at −1.1 dB**, the same as M2's storm, so D033's −3.0 dB figure is out of date and the headroom margin is just 0.2 dB (restore it: T323).

### D084 — 2026-11-09 — T302c the radio becomes dialogue
- **Migration:** all 31 A1M1/A1M2 radio and debrief lines are dialogue now, word for word. The briefings are `_brief` scenes. `content/radio/` and the adapter are deleted, and `tools/dialogueCanon.test.ts` checks every line against its act file.
- **A1M1's briefing choice** (new canon in act1.md):
  - Bricks asks "Any questions, Sprout?" with three answers: "Where do they all come from?", "Is the lettuce always this aggressive?", "...No, Sergeant."
  - The replies:
    - QUILL: "The Spires, up north, where the rigs are! Further questions go to Extraction. (Per policy.)"
    - Bricks: "Lettuce is fine. Ask Goldie. She talks to it."
    - Bricks: "Good. I asked questions once. They gave me a clipboard."
  - The callsign effect runs only on a first viewing, so a replay never undoes a later callsign.
- **Rules:**
  - A policy tell splits its line at "(Per policy.)" (style-guide §5.6).
  - `first_leak` and a tagged `tower_sold` queue behind the panel instead of dropping. The first leak plays once per campaign (act1.md).
  - Bark ids end in the map number; cue scenes are `<map>_cue_<moment>`; a tower intro over 80 characters is a cue scene.
  - The results card reads the outcome's `_debrief` scene.
  - Name tags run through `story/tags.ts`.

### D085 — 2026-11-09 — T304e A1M3
- **Map:** 14×10, a 26-tile road with one long hairpin, and an air lane from the top corner to the core crossing the hairpin. 10 pads plus the **depot roof**, a high-ground tile (the name is ours). 3 wrecks, one hiding a pad. Markers: peeker, mailbox, zibzab_shop. QUILL is the companion, Skyhook unlocks at W3, and the Challenge is **Return to Sender** (`neutralHits ≤ 0`).
- **Required counters are air *and* armor.** campaign.md §4.8 and act1.md say so, and without armor W4's and W6's armored units break the 15% soft-trait cap. Lose-by is W7.
- **Waves:**
  - Gerald opens W1, W4, and W7, so hold-fire decisions recur.
  - W3 teaches with 4 Puffwings, W5 is a 10-flock, and W8 a 20-flock.
  - W4 has 3 Chonks, and W6 has 5 Haulers 12 s apart plus a trailing pack.
- **Results** (every seed):

  | Build | Result |
  |---|---|
  | par | **90** with Return to Sender (T224: below A1M2's 100, so the chain resumes) |
  | par with Mk II | **100** and Perfect Core (T228: the R&D pick finally changes a result) |
  | par without casts | 40 |
  | no_air | loses W6 (W7 with the full catalog) |
  | no_armor | loses W7 (W8 with the full catalog) |
  | no_upgrades | 45 (gradual) |
  | Story | 100 |

  Robust under ±0.2–1 s shifts, including the Mk II result.
- **Dialogue** (verbatim): the brief; Form 88-B; the knock-knock, whose "Who's there?" button plays the answer cue; Zibzab at W6–W7; Bricks's form at W8; Gerald-hit and hold-fire barks.
- **Gaps for follow-up:** Gerald's status text has no channel, QUILL's wreckage line rides W2 (no trigger of its own), and no canon Skyhook-issued line exists (T325).

### D086 — 2026-11-09 — T311c terraces, Act I props, death animations, clump separation
- **Terraces (T223):** the render-only `terraces` field (digits 0–3, the same shape as `tiles`, never read by the sim; maps.md §3) gives A1M2 its three levels. `tile.cliff` paints an 8 px clay bank with a contact shadow on the lower tile; the road cuts through, and pads keep their plate. This is the playfield mid-dark push the m2 art verdict asked for.
- **Props:** mailbox, Zibzab's shop (it appears on its W6 cue), fountain, a podium with Prim hovering, party tent, confetti cannon, bunting, and a planter that hides the Peeker on A1M4. They are placed through decor markers.
- **Death animations:** a 4-frame pop for every killable Act I Skitterkin, played on its own corpse sprite.
- **Clumps:** a per-unit walk tempo (×0.88–1.12) and a start-frame offset, so a clump reads as individuals (T117).
- **Chonk:** its scutes are staggered, steel-rimmed plates.
- **Gallery:** 23,492 px tall.

### D087 — 2026-11-09 — T312c the HUD for Act I
- **Prices** everywhere use the sim's sale-aware price. Sale prices show in pink with an under-tick, a "SALE −40% ×3" tag sits over the build slots, and Rapid Deploy shows "FREE".
- **Abilities:**
  - Untargeted abilities (Time Dilation, Clearance Sale) cast on one press of Q/E.
  - Wave cooldowns read "3 waves", with a screen-reader label like ", recharging, 4 waves".
  - Charges show as "×3" on the icon, and a free cast is tagged "FREE".
- **The Hold Fire teach:** while Gerald is out and Hold (all) hasn't been used this run, the button pulses with "Gerald is the mail. Hold fire" and a Shift+H badge.
- **Wave preview:** a NEW tag marks enemy types the save hasn't seen (never on the Quiet Wave). Two-spawn maps show each group's spawn, flagged when it first opens.
- **Status:** the callsign plate "JPT-1 · SPROUT" heads the status panel. An objective tracker sits under the medals.
- **Playfield:**
  - the tower panel's bonuses read the live tile;
  - towers play their fire anims, including spec variants and the spin;
  - Bricks gets a glow halo;
  - rings sit on high ground;
  - a flat-to-high tether rides at the mean height of its ends.
- T213, T221, and T222 are closed. Leftovers: spawn "incoming" flags, the slot-2 companion portrait, and an objective-tracker smoke (T326).

### D088 — 2026-11-09 — T308 the shop opens; protocols
- **Zibzab's arrival** (`a1_m03_base_arrival`, a canon line added to act1.md § A1M3 *Base*) plays on the first Base visit with the shop open, landing on the Shop tab. It plays only while dialogue is on.
- **The Zapcoil sample** is a license priced 0, given once when it's stocked. The shop gains a *Licenses* group, where Zapcoil shows as Owned.
- **The early ask** is a shop row, not a click on the locked tab. act1.md and progression §4 place the question from A1M3 to A2M4. Answering "Still asking." sets `asked_zibzab_early` and removes the row; "Not today." keeps it.
- **QUILL's Rapport** (`rapport_quill`): 2 Intel for −15% Time Dilation cooldown, stocked after A1M3.
- **Protocol picker:** in the loadout under the tower grid. Protocols count toward the loadout's skip rule, a full slot swaps, and Specialist picks a tower. Equipped protocols reach the battle's modifiers.

### D089 — 2026-11-09 — T312b boss, burrow, split and huddle render
- **Enemy pose from sim state** (`views/enemyPose.ts`): the Digger's dig tell, a generic `fx.burrow_mound` while underground (new sprite; the docs give the Digger no underground art), and Chitterbloom's tell/sneeze/dig/under/surface/panic/puff/flee anims. Sim helpers `bossTelling`, `bossNextAbility`, `burrowTelling` are exported from `sim/index.ts` (read-only).
- **Boss bar** (`BossBarView`): name, HP fill with a damage chip, phase markers; flashes on a phase change, shimmers while invulnerable, fades after `driveOff`.
- **driveOff:** leaving units draw at 60%; `LeaveFx` carries them past the edge and fades them (render-only).
- **Cue props:** `CUE_DECOR` entries are `{sprite, wave}`; a cue prop fades to 60% over a tower behind it (the core's rule, D028). Zibzab's shell-shop drops onto A1M3's verge at W6's countdown, with his scene.
- **T232:** the Suppressing Fire strip is depth-sorted in `world` (bias `strip: 0.25`): over enemies, under towers.
- **`dev_boss`** dev map (a 200 HP Chitterbloom with Diggers, Bunchlings, an Elder) for smoke and the gallery.
- Follow-ups: T328.

### D090 — 2026-11-09 — T304f A1M4 and the objective system
- **Objectives** (`src/sim/objectives.ts`): `state.objectives[]` is `'open'|'done'|'failed'` in `map.objectives` order. Cleanup settles an objective as soon as its condition can no longer change (done runs `onComplete` at once via the exported `runScriptAction`); a win judges what's still open, a loss fails it. New event `ObjectiveProgress {id, status}`. Objective Intel pays **on a win, once per save** (`MapRecord.objectives?`, optional, no migration). Validation `[objectives]` caps Act I's objective Intel at 7.
- **Clean Audit** (core-loop §2.13): a tower's build phase lasts until the next wave starts after it was built; selling after that is a *late sell* and fails the objective at once. A misclick-grace refund is never a sale.
- **A1M4 as built:** par 85 (A1M3 90; campaign.md §7's target 87 → 85, since integrity moves in 5-point steps). Mk II → 90, no casts → 70. W5 (10 Chonks + 20 Bunchlings) is the armor and splash test; W9's Elder convoys keep the no-armor build losing with the full catalog. The alt `slow_and_shell` scores 100, above par; allowed (par is the reference, not the ceiling).
- **Ruling for T315:** par's only leak is a designed W1 rush of 32 Zoomers, and it ends with ~1,400 credits unspent. A map-4 margin that comes from wave 1 reads as cheap (D026 R3 ruled the same for A1M1). T315 moves the margin into the late waves and makes par spend its bank, keeping par ≤ 85.

### D091 — 2026-11-09 — T316 Results, the scene flow, the pause menu
- **Leaving mid-map counts as a loss** (meta-runtime: run end on "win, loss, retry, or quit"): `router.abandon()` records kills, the run and the defeat stipend for the waves resolved, never medals, objectives or flags, and shows no Results card. No more generous than losing at that moment.
- **Pause menu:** Esc cancels in order (armed build, aim, selection, keyboard cursor) and then opens the menu; a HUD Menu button too. Resume / Retry shift (same loadout, briefing skipped) / Quit (to Base, else the Shift board, else Title). Sim frozen, HUD inert, focus trapped.
- **Scenes around Results** live in content (`content/dialogue/resultsFlow.ts`): A1M5 plays `a1_m05_scene_party` before Results and `a1_m05_scene_stinger` after it, on every win, skippable, whichever button leaves the card; only registered scenes play, and only with dialogue on.
- **Stamps read the run** (`thisRun`), not the saved flag: a replay that cleared the Quiet Wave shows no CONTAINMENT LAPSE stamp.
- **Objective rows** show on a win, like medals ("NEW!" with Intel, "On file", "Next time!").
- **First payday:** a run that pays Stardust into an empty bank while the shop is locked; "Banked for Zibzab's shop…" shows only then (T235).
- Follow-ups: T329.

### D092 — 2026-11-09 — T304g A1M5 *Record Quarter*
- **Par 81.0** (17/21: the reference profile carries Reinforced Core 1, so integrity moves in 1/21 steps; 85.7 isn't below A1M4's 85 and 76.2 leaves the band, so par loses exactly 4). Its margin is late: W7's second warren Hauler and one W8 Puffwing on a second air lane `sky_east`. **Mk II and Bricks's Rapport each change a result** (95.2): Mk II's blast reaches the Hauler; Rapport readies Suppressing Fire at the gate in time (T228). Without casts par drops to 71–76. campaign.md §7's A1M5 target 84 → 81.
- **The Quiet Wave (C1):** spared = 7/7 leaked, flag set, 71.4, no medal lost; cleared = par. **Check #16a judges the band with the Quiet Wave's designed cost added back** (`quietWaveCost`: Old Thrum's leak 2, younglings 0), since sparing must never read as failing the map.
- **Capstone bosses aren't new threats** in `validateThreats` (maps.md §6.3 rule 2) when all their traits and brood are already known.
- **Pacing for early-call fairness:** W2–W8 open 10 s after the wave starts (`OPEN`), the Matriarch arrives 20 s into W9, W10 has a 60 s countdown so it walks in after she's driven off (at ~dist 16.6, before the banner line).
- **Alts as built** (act1.md's planned ones lost: an air-only Skyhook leaves two ground towers for two roads): `ducks_and_chain` (Thumper Bunker Buster + Sprinkler + Zapcoil) 81.0, `shell_and_chain` (Rivet + Thumper + Zapcoil) 52.4.
- **C1 on replays:** the debrief branches on `thisRun: spared_quiet_wave`, the stamp reads the run (D091), later payoffs read the saved flag.
- New canon lines in act1.md § A1M5: Sterling's brief and loss lines, Bricks's Marguerite name tag, the stinger caption "Rig Nine. Status: not answering." Follow-ups: T330; the runtime (~9.7 min) goes to T315.

### D093 — 2026-11-09 — T317 the M3 docs pass
- **T120's table convention:** design tables for *built* content give roles and target ranges (tower price bands Low 90–100 / Mid 110–130 / High 140–160; enemy toughness fodder/light/tank/heavy and pace slow/normal/fast) and point to the data files; content with no data yet keeps its numbers in the docs as their only home (D019).
- architecture.md's *Built so far (M3: Act I)* table replaces the M1 subset note; README's first reading-path row points there, and a new row covers story maps (dialogue, objectives, a boss).
- The Results debrief shows after a loss too (a supportive line, D059); core-loop §1 now says so.
- **Engineering's deferred-spec copy** is D064's "Arrives in a later shipment", not the built "No specs yet" (in voice; T331 changes the string).
- **Bug found:** the Shift board still stopped at A1M2 (`SHIFT_BOARD_SIZE = 2`), so A1M3–A1M5 were reachable only through dev hooks. T331 (high) fixes it before ship; the smoke suite gains a normal-flow step past A1M2.

### D094 — 2026-11-09 — Render polish: health bars, Bricks's lowered cannon (T328, T329, T330)
- **Enemy health bars** (art-direction §8): a 2 px bar in a 1 px `ink.1` frame (a full `green.3` bar vanished on Act I grass without it), body width − 2 rounded even, 8–16 px, 1 px above the body; shield as `blue.4` 3-on/1-off segments after the HP, the two split by their maximums. Shows while hurt or shielded, or under the mouse pointer (not the keyboard cursor). Bosses and neutrals get none; burrowed and leaving units hide it. Three cropped images per view, no per-frame allocation.
- **Tell glyphs** run on sim time (3 s from spawn), so fast-forward doesn't stretch them and pause holds them.
- **Link callouts** lift clear of a −cost floater landing in the same sim tick.
- **Bricks lowers his cannon only on the Quiet Wave**, a beat (1.5 s) after it starts, and holds it to the map's end; art-direction §6's "at-ease with nothing in reach" reading is dropped, since it would lower him as the boss leaves and flatten "Clear it, Sprout". Suppressing Fire cast on the Quiet Wave comes from off-map and never raises his cannon.
- Follow-ups: T332.

### D095 — 2026-11-09 — T331 the Shift board runs through Act I
- **The board's size is derived from the registry:** the campaign plan up to its last registered map (5 today), so a map joins the board, and the unlock hints name it, the moment its folder is registered. "Coming soon" shows only for unregistered maps (Act II). Hints now read "Opens after Special Delivery" (Shop, loadout), "Opens after The Audit" (Engineering), "Opens after Record Quarter" (spare runners).
- **With Act I won**, every row reads Cleared and the board focuses "Replay Record Quarter"; no Act II teaser row until the star map (M4).
- **Engineering lists towers whose specs ship later** (Sprinkler, Skyhook, Zapcoil) as unbuyable "Arrives in a later shipment" rows after the buyable ones, as D064 and progression §7.1 say (the shelf had filtered them out).
- A normal-flow smoke step now plays A1M2 from the board and sees A1M3 next (the gap that let this ship hidden: M3's smoke reached later maps only through `?map=` and dev saves).

### D096 — 2026-11-09 — T315 the Act I curve pass; the T228 verdict
- **Act I as built:** par 95 / 100 / 90 / 85 / 81.0; runtimes at 1× 3.8 / 6.4 / 6.9 / 7.3 / 8.7 min; Story wins everywhere (100, A1M5 96.8). Par leaks: A1M1 W7, A1M2 none, A1M3 W4 (Gerald's pass), A1M4 W9, A1M5 W7–W8. **The tutorial (A1M1) is exempt from Act I's 6–9 min target.**
- **A1M4 (supersedes D090's ruling):** the W1 rush is 16 Zoomers at 0.35 s and par holds it; par's one leak is a Hauler from a W9 tail (four Haulers, no Elder) that its W9 strike can't fully reach (no casts 65, Mk II 100 with Perfect Core). W5 Bunchlings 24; W6–W8 filler trimmed. Par adds a billboard Rivet but still ends with ~920 credits (was 1,396): every further purchase makes par unbreakable at wave sizes the alts survive. Partly met; T333.
- **A1M5:** `OPEN` 10 → 6 s (8.7 min); all D092 results hold.
- **T226 is met by a test**, not a retune: with Sitting Ducks' bonuses zeroed, A1M2's par and three alts leak in W8.
- **T229 is a UI fix:** the bank nudge arrives a wave after A1M2's W7 wall; a waves-only fix broke early-call.
- **T228 verdict:** Mk II changes par on A1M1 (replay), A1M3, A1M4 and A1M5; Bricks's Rapport on A1M5; **QUILL's Rapport nowhere in Act I** (A1M3 is the only Time Dilation map and par's casts are three waves apart). Accepted: Act I's pick is Mk II vs Bricks, and QUILL's Rapport is an investment that pays from A2M2 (T401). The verdict's home is act1.md's Act I curve section.

### D097 — 2026-11-09 — M3 review round 1 rulings
Reviewers: correctness/architecture/performance (no high-severity findings), gameplay/story/emotion, UX/art/accessibility/audio. Art trail M2 → M3: better overall (portraits, Chitterbloom, terraces; watch the crowded 2× diorama and Everglow props blurring into towers).
- **C1 is the player's choice, seen before it's made.** The Quiet Wave's countdown starts after the boss is driven off (a wave field `countdownAfter: 'bossEnded'`), it can't be called early (`callWave` refused on `quiet_wave` waves), its groups walk in after Bricks's cannon visibly lowers, and a validator `[quiet-wave-reach]` keeps its first route tiles out of every pad's reach. No pause on the cue.
- **Spared means Old Thrum lived:** `spared_quiet_wave` = Thrum leaked and ≥ 75% of the younglings leaked. Quiet-wave leaks never take the core below 1, for every player, not only par.
- **The stinger and the party get staging** (a Rig 9 camera feed with six frames of the wrong shape; confetti and the record counter). They are Act I's payoff.
- **Teach before testing:** A1M3 teaches the Skyhook, per-tower Hold Fire on Gerald and Time Dilation; wreckage tells mouse players how to clear it. **Act I keeps talking:** act-wide shared barks for A1M3–A1M5.
- **The Shift board shows a dimmed "Shift 6 · Coming soon" row after A1M5** (supersedes D095's no-teaser call: a dead end reads as the game ending).
- **"Met" means spawned:** `seenEnemies` comes from actual spawns, so quitting before a wave doesn't spend its NEW badge, first bark or codex unlock. **First payday is marked by Results showing it** (a `story.seen` id), so an abandon can't consume it; D091 stands.
- **Neutrals aren't pests in the preview** (Gerald: "MAIL", no NEW/AIR). **Dialogue is never buried:** blips and typing outrank combat SFX, which duck while someone speaks.
- *As built (round 1 fixes):* `[quiet-wave-reach]` counts every content tower's tier-3 range for the group's layer (specs excluded) × 1.25 on high ground, plus a 0.5-tile slack for range bonuses; A1M5's four east-pocket pads moved to (8,5), (10,7), (11,7), (12,7). The flag rule uses a new `tagRatio.except`. A1M5's `sky_east` lane first shows with a lone W6 Puffwing (par 81.0 now leaks W6 + W7). Scene art gets a `scene.<id>` sprite category; the stinger feed uses the `hollow` palette, so it is the Hollow's first sighting and may show the reserved acid. The 3 Hz flicker cap covers the link-tether shimmer too. Sterling's A1M5 W5 line now plants the lettuce insurance-fraud payoff (bible §8). Leftovers: T334.
- *UI as built:* the Shift board's teaser row reads "Shift 6 · Coming soon", and names the next map ("Shift 6 · Rig Nine · Coming soon") once A1M5 is won, paying off the stinger without naming a map the player hasn't seen. The stinger's 2.5 s feed is a staging lead-in the dialogue runner plays before the caption types (Skip ends the lead-in, not the scene); if a frame stalls past the smudge it still shows `smudge_3` once. The bottom-center hint shows one hint at a time (Gerald's second pass, the Hold Fire teach, salvage, upgrade). Speech outranks combat: blips priority 3, typing 2, and a `low` SFX bus (priority ≤ 1) ducks ~−3 dB while someone speaks. The Base opening on the Inbox when a memo is new stays a task (T320).

### D098 — 2026-11-09 — M3 review round 2 rulings
Reviewers: correctness/architecture (no high-severity findings; round 1's seams hold end to end) and a playtester who played the finale through the real Shift board (two high findings, both about barks at the climax).
- **The Quiet Wave is a silent zone for barks:** from its first spawn to the map's end no bark is offered (no clear cheers, jingle jokes, kill lines or bank nudge); scripted lines still play and the jingle *sound* still plays. The bank nudge never fires at the Quiet Wave's countdown.
- **Boss clears reach their bark:** `wave_cleared`/`wave_start` carry `boss: true` for a boss wave, so QUILL's "Driven off! Not processed…" fills the held pause.
- **Bricks's C1 reaction lands first:** at A1M5's end his C1 lines for this run play as comms during the results hold, before the party; they stay on the card too.
- **Silence lines in full-screen scenes advance by themselves** (the stinger's held beat no longer waits on NEXT).
- **Time Dilation is taught on the HUD** on A1M3's W5 (a hint and a pulsing Q until the first cast). **Hints never go stale:** the per-tower Hold Fire hint hides under Hold (all); the salvage hint times out after two wave starts and applies to any map with wreckage. **The act-wide jingle pool plays only after a clean wave.**
- **Sparing can never lose the map, even on a shared tick:** the quiet-wave floor applies before Emergency Bulkhead's absorb, and the loss check refunds quiet-wave integrity lost that tick.
- Bricks's lowered cannon becomes a grounded-muzzle pose that reads at 1×; the party's cannon moves toward the stage's center.
- *As built (round 2 fixes):* sparing can't lose the map on a shared tick because quiet-wave units leak **last** in their tick, after every other leak, rather than being refunded in cleanup (a refund was slot-order dependent and would have refunded a boss drain into survival); the map is lost only if the other leaks would empty the core on their own, and `EnemyLeaked` stays truthful. The first-payday catch-up runs in `decodeEnvelope` on every read and checks only for a won map that paid Stardust, never the bank (a stipend fills the bank too, which would break D097). `[wave-tag]` checks a flag rule's `except` tags on the rule's own map only. Bricks's lowered pose stands the cannon on its butt on his plate with both hands on the muzzle.
- *APP as built:* the bark silence starts at the Quiet Wave's `WaveStarted` (before its first spawn, so W10's `wave_start` is covered) and exempts only `not_firing` (Bricks's "...You okay, Sprout?", written for W10). The C1 lines play on the comms panel at map end, each held for its typing time + 2 s; the results hold waits for them (1.5–5 s). **The Time Dilation teach reads "Time Dilation slows the flock" with the slot's key** (on A1M3 it is QUILL's slot 2, **E**; the cast is instant, D082, so "click the flock" would be untrue), shown when a turret first targets a flyer from a flock wave (an air group of 10+) until the first cast. The salvage hint times out after two wave starts. The party has two 3× cannons, mirrored. The results test hook records nothing (`record: false`).

### D099 — 2026-11-09 — M3 shipped: Act I, complete
All of Act I plays: A1M1 *Orientation Day* through A1M5 *Record Quarter* on the Shift board, told by the dialogue system (briefings, radio, barks, full-screen scenes, debriefs), with character creation, the codex and Inbox, the shop opening and the protocol picker, the Peeker, air lanes and the Skyhook, the Zapcoil's chain and Conductive, wreckage and the salvage drone, burrowers, splitters and huddles, objectives (Clean Audit, Asset Recovery), Time Dilation and Clearance Sale, Matriarch Chitterbloom driven off with her young, **the Quiet Wave (C1)** as a choice the player sees before making it, the party, the stinger, Results with objectives and stamps, and a pause menu. Act I's curve: par 95 / 100 / 90 / 85 / 81.0, 3.8–8.6 min a map, Story wins everywhere.
- **Gate at ship:** typecheck, lint, 2,069 unit tests, the balance harness on 5 maps, 84 smoke flows, check:docs.
- **Reviews:** three rounds (D097, D098; this ship's round 3 verified the round 2 fixes and the seams with tests and the smoke flows `c1-radio`, `teach`, `staging`).
- **Art trail:** [docs/art/gallery/m3.png](art/gallery/m3.png) (103+ sprites, ~2,300 frames; M2 was 55 / 974).
- **Deferred to M4** (D064): the star map, objectives beyond Act I's, the Sprinkler/Skyhook/Zapcoil specs, codex annotations, the Bounty Board. Open follow-ups T216, T229, T318–T335 carry over.
- **Owner asks:** create release `m3` on GitHub (cloud sessions can't push tags); OK to delete `src/audio/sfx/radio.ts` (T323); a listen to the audio mix (the boss storm peaks at −1.1 dBFS).

### D100 — 2026-11-09 — Owner sign-off on M3
The owner approved M3's open calls (the star map in M4, abandon counts as a loss, QUILL's Rapport paying from Act II, the Hollow's palette in the stinger, the "Rig Nine" teaser, A1M4's banked credits as T333) and the deletion of `src/audio/sfx/radio.ts` (its `radio_*` recipes were dead since the speaker blips replaced them; T323). Release tags are skipped for now at the owner's request: ship steps still try `git tag`, and no release is asked for until the owner says otherwise.

### D101 — 2026-11-09 — M4 cut: Act II, part one
**M4 = A2M1 *Rig Nine*, A2M2 *The Glass Witch* and A2M3 *Second Look*, reached from a real star map.** It ends on Act II's first crack, "where I understood" (bible §6): the Haulers' sacks are young, the player's own click pulls Pebble off the Peeker's rock, QUILL declines to log her name, and Bricks reads his voided pension. Owner's calls (all three as recommended):
- **The cut:** A2M1–A2M3 (~32 tasks, 8 waves), not A2M1–A2M4 or all of Act II. **The milestones renumber:** M5 = Act II, part two (A2M4–A2M6, ending on the act's close), M6 = Act III, M7 = the finale, post-game and polish.
- **The star map is a real valley map of Tumble IV** ("Sector Map" on screen; every node is on the planet), replacing the Shift board once Act I is won; the Shift board stays as Act I's view.
- **Harpoon and Crane ship in M4** as the cut lever (no Act II par or alt needs them).
Orchestrator rulings on the plan's smaller forks (each logged here; the owning task updates its doc):
- **`clustered` trait** (intel "Hollow clusters", counter category splash, tell `hollow`) on the Mote; **Skittish** derives from the `fleeing` tag; **`boss`** is an intel-only threat entry, not a `Trait` (closes T330's half).
- **The hush rule:** contact = same layer within 0.4 tiles along the route; a ground Hollow can't hush a flyer. Skittish triggers on any Skitterkin within 2 tiles that dies or is hushed.
- **Protect the asset:** one asset meter (A2M2: 10) drawn as two rigs; branch leaks hit it by their leak value; a boss reaching it drains it (defeat); **the par margin is min(core %, asset %)**.
- **The Glass Witch:** her pulse restores 120 shield to her and Aelari within 2 tiles every 8 s (1.5 s tell); Stasis converted to Chilled on a boss doesn't interrupt her blink.
- **A2M3's light crossfade is cosmetic** (sky and shade only); A2M6 stays "the one map where the dark changes play" (art-direction §3 reworded).
- **Built gaps closed in M4:** the Lookout license (owed since A1M5) and Tidybots (core-loop §6.7) land with T406 and T410b.
- **act2.md wins over maps.md §7** on A2M3's pads (A1M2's 11 unchanged; cuts go through decor); enemies.md §5.4's act column for Fracture and Rift Moth is fixed to A2M6.
- **Every feature task ships its own minimal readable view**, so map tasks can screenshot real mechanics before the polish tasks land. Map tasks add a normal-flow smoke step from the star map (the T331 lesson). The gate budget is ≤ 7 min (T412).

### D102 — 2026-11-09 — T301a the star map spec
The star map ("Sector map" on screen) is specced in core-loop §1.1, art-direction §10 and architecture § UI.
- **DOM only, no Phaser scene:** the chart is a pure, seeded pixel generator painted into a `<canvas>`; nodes, panel and focus are DOM; glyphs are baked sprites. The `campaign` screen shows the Shift board until A1M5 is won and the star map after, so every route lands right ("Shift board" buttons read "Sector map" then).
- **Only won maps and the frontier show** (the first map not won: "Next up" if built, else a named "Coming soon" teaser with the act file's tagline). No locked nodes; later maps aren't named or in the page. The marker walks to a newly won map.
- **The Shift board is Act I only:** its sixth row is never named. This retires D097's named "Rig Nine" teaser row; T420 caps the board at Act I so registering Act II maps can't spoil their names before T301b lands.
- **Naming rule for locked shop and base copy:** Act I maps always; later maps only once won or at the frontier; otherwise "Shift {n}".
- **The chart's phase follows the frontier** (`act2.gold` from A2M1, `act2.dusk` from A2M4, `act3`, `dawn`), the UI theme too. The north is Everglow's "No survey data" hatch, never the Hollow's acid; Rig Nine's spoil and the plant's vats carry a few cold violet pixels from the start as fair-play clues; the Long Walk is labelled "Surge corridor" until A2M5 is won (M5).
- **First visit:** a survey sweep and "Access upgraded! Perimeter Ops now covers the whole valley." (`story.seen` id `star_map_opened`, no save bump). Keyboard: arrows in campaign order, Home/End, Enter to the panel, Esc back; arrival focuses the frontier's Start.

### D103 — 2026-11-09 — T441 Act II portraits
- **Ves'thara** (`aelari` palette) is woven and lit from inside: her lattice veil's gaps are real transparent holes (the only see-through portrait), her eyes are knots of light that lose their white core only in grief, her robes are dark emerald so violet stays reserved for the Hollow-touched variants, and the cut collar thread hangs loose in every frame.
- **Pebble** keeps the Peeker's green seedling (custom legend over `skitterkin.ally`) so the player knows her as the Peeker; she is bare-headed until Bricks's bottle cap (a `cap` variant from A2M4, M5). `singing` is drawn now for A3M1.
- **Bricks's `pebble` variant** carries her in his breast pocket ("Pocket's got room"); it shows only after the rescue (T422), and Pebble's name plate reads "???" until Bricks names her.

### D104 — 2026-11-09 — T400b story, meta and save seams
- **No SaveData bump for M4:** checkpoints live in memory (host and run end), star-map nodes derive from map records, presentation is content.
- **Presentation dials** live in `content/presentation.ts` (one row per act plus `byMap` overrides), not in map data; `story/presentation.ts` `presentationFor(map)` resolves them (wired by T410b).
- **Each act's shared barks are one file** (`barks/act2.ts`), and a test holds every shared bark to its act. `not_firing` takes an optional `wave`.
- **Later-act codex versions are a per-act patch** merged by the registry (`CODEX_LATER_VERSIONS`), never replacing a version an entry already has; T411 annotates Act I entries from `codex/act2.ts`.
- **Act II dev saves** (`after_a1m5_ref`, `after_a2m1..3`) follow the reference profile's weaker branches (C1 cleared, `held_fire_second_look` false), go through the shop's real `buy()`, and skip unregistered maps and unlanded content (M3's pattern), so they grow as M4 lands.

### D105 — 2026-11-09 — T400a sim and content seams
Every M4 shape, event, command, stat, stub and data id is declared (architecture.md's Built-so-far rows list them); `FEATURE_GATES` rows name the task that lifts each; A1M1–A1M5's harness output is identical (hashes moved as state fields were added, D069).
- **`boss` is intel-only** (`ThreatIntelId = Trait | 'boss'`): it must appear in `threatIntel` exactly when a boss walks the waves, so A1M5's briefing now shows it.
- **The hush is derived** (`hushes`: Hollow, not a boss, not gathering, not neutral), never authored; **Skittish** comes from fleeing Skitterkin groups and is refused only beside hushing units, so Act I's fleeing runners keep their M2 rules.
- **Stub towers stay out of play:** `TOWERS_AHEAD_OF_TASK` keeps Lookout, Harpoon and Crane out of loadout pools, licenses and spec unlocks until their task lifts the row (the Lookout license goes live with T406).
- **Open conflict for T408:** the Harpoon's documented 4.0 range reaches A1M5's Quiet Wave from two pads on a replay (D097); while the Harpoon is a stub it is excluded from `[quiet-wave-reach]`, and T408 must settle it (move a pad, scope the rule, or change the range) before lifting its gate. The Lookout's +20% range aura raises the same question for T406.
- **`dev_act2`** (18×12, two merging spawns) is a render fixture, not a campaign map; it fits 1280×720 clear of the HUD.

### D106 — 2026-11-09 — T403 Aelari shields in play
- **The shield pulse** (`enemyAbilities/pulse.ts`): the first pulse comes one period after spawn; its last `tellSec` is the tell; it refills its own shield and every shielded unit of its faction within the radius (any layer; never leaving or burrowed ones), capped at max, without resetting regen delay. A boss's pulse timer waits through phase invulnerability and carries across phases. Stasis on a non-boss blocks or interrupts it and restarts the cooldown (`interrupted` only once the tell has begun); bosses are exempt (D101).
- **Story difficulty scales the pulse amount** with the shield modifier (the Witch's 120 → 84), the one gap the shield-pipeline audit found against enemies.md §2.3.
- `ShieldHit {broken}` is emitted once per hit that touches a shield; `ShieldView` draws ripples, breaks, the pulse tell and ring (polish in T430a). Glimmer, Weft Warden and Lightwing are live; `dev_aelari` is their dev map.

### D107 — 2026-11-09 — T406 detection and the Lookout Shack
- **Untouchable means everything the player sends:** an unrevealed cloaked unit takes no targeting, splash, chain, on-hit status or ability damage, and Suppressing Fire doesn't slow it; it still leaks. Time Dilation still slows it (as it does burrowed units) and enemy pulses still reach it. A Scanner Sweep zone reveals whatever stands in it on each of its 600 ticks (it doesn't tag units for 10 s).
- **The Lookout's aura is one aura kind; the strongest wins** whatever its stat (an Overclock Rig's +20% rate replaces a neighbour's +15% range). High ground and power nodes don't change detection radius; a power node still gives a support tower +20% aura strength. Crow's Nest's +10% is a Mark (highest only) on the cloaked units it reveals, lasting the reveal.
- **`[quiet-wave-reach]` counts range auras only from support towers ownable on the run that first wins the map** (flags are set only on a first win, so that run is where the C1 choice must be seen first). The Lookout is stocked after A1M5, so A1M5 passes unchanged; counting it unconditionally would have moved two A1M5 pads and Act I par. T408 may apply the same scope to attack ranges for the Harpoon.
- **R&D sells abilities** (`{ kind: 'ability' }` items, Scanner Sweep 2 Intel after A2M1); support tune-ups use a new `supportStat` modifier kind; the counter model's reach is max(attack range, detection radius).

### D108 — 2026-11-09 — T412 the Act II harness
- **Reference profiles are data** (`REFERENCE_PROFILES` in `content/upgrades/reference.ts`, A1M1 through A2M3, per campaign §4.9); every map's builds take its row, and the purchase check refuses a row that owns a tower still waiting on its task.
- **Re-baselining after a boss:** a map with `rebaseline: true` is judged against its own act's band (A2M1: Act II's 65–85), refused unless the previous campaign map has a boss; the chain continues from it.
- **Run-end flags are checked:** a map's builds list each run-end rule ending on it (`runEndFlags`: runs that must set it, runs that must not), and the validator requires every rule to be listed. The hold-fire macro on fleeing runners holds once per wave.
- **Under-built alts** don't count toward the two required alts and may use par's towers; they and par on Story skip "every step issued". A1M5's `no_spec` is a real alt (81.0).
- **A `?map=` battle with no save uses the map's reference profile**, so `autoplay('par')` reproduces par.
- **Gate budget: 7 min**, printed per step by `tools/gate.ts` (over budget warns, never fails); `npm run sim` runs maps on worker threads with identical output at any job count.

### D109 — 2026-11-09 — T402 the hush, Skittish and the Mote
- **The hush tell holds both units still** (0.5 s) and either side can break it: the victim dying, leaking, burrowing or leaving releases the Hollow unit with its hush unspent; the Hollow unit dying frees the runner.
- **Contact** is same-layer within 0.4 tiles, along the route when both walk the same one and a straight line across merging roads. **Matching is order-independent:** contacts are judged against the tick's state before any lands, each victim to its nearest free Hollow unit, ties to the lower uid.
- **A hushed runner is neither a kill nor a leak** (no bounty, not processed, no split; it still counts toward its wave). The Hollow unit heals to its run's full HP and turns Heavy (×1.15 base speed).
- **Skittish:** a Skitterkin killed or hushed (never a leak) within 2 tiles, straight line, any layer, gives fleeing runners 40% haste for 1.5 s; a repeat restarts it without a new event.
- **`[fleeing-lead]`:** a fleeing group leads a hushing group on its route by 2–4 s; a fleeing group with no Hollow behind it is exempt. Heavy's minimal tint is `hollow.3` (charcoal); `acid` vanished on Act II's olive ground.

### D110 — 2026-11-09 — T404 the Glass Witch and the blink
- **A blinking unit holds still through its tell**, so the landing point it shows is exactly where it appears (and the tell is a window to punish). A boss phase's blink tell starts as the phase begins (after the 1.5 s phase invulnerability); a unit's own blink waits one period after spawning. The Witch's blinks land about 3, 10 and 17 s after she crosses 70%; Glass Half Empty is `bossBlinks ≤ 2`.
- **A blink moves along the route, round corners, clamped to its end; a blink onto the end leaks that tick**, through the normal leak path (so on A2M2 it drains the rigs, D101). A leaving unit never blinks; Stasis interrupts non-bosses only (`isInterrupted`, T407a).
- **`bossHpPct` is a share (0–1)**: validation now refuses whole-number percents, which would have fired a cue at spawn.

### D111 — 2026-11-09 — T305a Protect the asset
- **A leak on an asset route costs the asset its leak value** under the core's rules (fleeing and younglings 0, a Quiet Wave unit floored, a boss drains it all); asset 0 loses the map. It emits `EnemyLeaked {leak: 0}` then `AssetHit`, so first-leak barks and lines still work and the core doesn't flash.
- **Perfect Core needed no change:** a leak at the asset is a leak, so the medal already means nothing got through to either. **Emergency Bulkhead and Reinforced Core guard only the core.**
- **Asset routes end beside the asset** (a path's last tile next to its decor marker; an air lane's last point on it); the asset's `name` is required, ≤ 10 characters ("Rigs"). The low-asset alarm is the `critical` band (≤ 50%: on A2M2, one rig of two down).
- **The harness margin is min(core %, asset %)**, and the gradual rule applies to each meter.

### D112 — 2026-11-09 — T407a Stasis and the Sprinkler specs
- **Stasis never stacks or extends:** it lands only on a unit neither frozen nor immune, counts the tick it lands, and leaves 2× its duration of immunity starting when it ends. A frozen non-boss still takes damage and interrupts its abilities (`isInterrupted`): the shield pulse, the blink, the Digger's dig and the hush (the runner runs on, the hush unspent). A frozen huddle leader holds its huddle. A boss gets Chilled 50% instead, with no interrupt or immunity.
- **Flash Freeze is a burst on its own 8 s timer on top of T3's chill pulse** (Stasis 1.0 s), ready on specializing; not a burrowed answer. Cloudburst: radius 2.8, hits air. Every T3 Sprinkler now Soaks for 3 s (T321).
- **A spec answers counters only once it exists** (T319): `LIVE_SPEC_NAMES`; `all_unlocked` owns only built specs. Engineering sells the Sprinkler's specs; the Skyhook's and Zapcoil's stay "Arrives in a later shipment" until T407b.

### D113 — 2026-11-09 — T420 A2M1 *Rig Nine*
- **A third route, the yard cut** (from W8), leaves the bore road at (15,3) and runs down the dark east edge into the lift, out of reach of the merge's pads. Mote clusters alone gave par no margin (two Thumpers at the merge kill any packed cluster); the cut makes par's leaks come from a flank it covers with a Zapcoil and a Rivet, scaling smoothly with the cut's groups.
- **Par 81.0 (17/21), re-baselined after A1M5's boss** in Act II's 65–85 band; Mk II changes a result (85.7); without casts 66.7; no-splash loses by W6 (W7 with the full catalog); both alts bring the Lookout. 35 s countdowns on W2–W10; 9.4 min at 1×.
- **Story `objectiveDone` condition** (`{ map, objective }`, from the save) gates the crew-log codex entry. **A cue scene plays at most once per battle** (the crew-log line fires on either log's clear or W6's countdown, whichever is first).
- **The Shift board is capped at Act I** (`STAR_MAP_AFTER = 'a1_m05'`); A2M1 is reached by `?map=` until T301b's star map.
- **Ruling: Hiccup Contained becomes "no Heavy Mote leaks"** (a hushed Mote never reaches the lift). As built it equalled Perfect Core, since every Skitterkin flees and leaks for 0; T460 implements it.

### D114 — 2026-11-09 — T410a revisits by reference and the light
- **A revisit is composed from its original before validation:** `revisitOf`/`revisitAt` place the original's tiles, terraces, routes, markers and wreckage unchanged; `*` marks the footprint, and new pads live only in the band, so A1M2's 11 pads stay A2M3's (act2.md wins over maps.md §7; cuts go through decor). An edit to A1M2 flows into A2M3.
- **Lighting is map data, not a script action:** `lighting: [{ wave, env }]` eases the sky and a multiply shade toward each key's palette over 240 sim ticks from that wave's start (stepped under reduced motion). It is cosmetic: the sim never reads it. The battle sky is drawn only on maps with a schedule. `setLighting` waits for the finale's Dawn (M7); M5's Sundown extends the overlay with darkness and light sources.
- **Dressing is data** (`greySoil`, `mineScar` over an area), render-only, never on pads, path or blocks.
- **Process:** agents keep scratch files in their own scratchpad subfolder (one agent's logs and configs were overwritten by another's).

### D115 — 2026-11-09 — T409 clickable world objects
- **A click on a clickable object interacts whether or not a tower is armed** (only an aimed ability overrides it): the build slot stays armed after building, and "Can't build there" at A2M3's emotional peak would be cruel. The keyboard cursor reaches a clickable marker and Enter interacts; the cursor announces "<name>, column c, row r. Enter reaches for it." (and the Act I rock now reads "A rock … Enter pokes it.", T322).
- **`setClickable` is once per run:** a marker never re-arms after it's reached; `on: false` drops its fallback so a withdrawn beat never lands by itself. Fallbacks are checked before events each tick, so `interacted` fires on the same tick for a click or a fallback. The harness `interact` step is non-blocking.
- **On a map that lists the Peeker as clickable, the rock is bare before and after**, and holds Pebble only while it can be reached. The outline is a dashed `gold.4` contour rimmed in `ink.0`, marching at 2 Hz with a 1 Hz alpha step (steady under reduced motion).

### D116 — 2026-11-09 — T430a Act II units and combat on screen
- **All tells drawn from sim state step every 10 ticks (exactly 3 Hz)**, replacing the shield and blink tells' 3.75 Hz; the hush tell runs on sim ticks (2× shortens it, pause holds it) and draws in `overlay` so it reads through explosions.
- **Rims** (filled frame copies, most urgent first) stand in for Heavy's swollen outline, Stasis's crystal and the hush, blink and pulse tells until T440a/b's frames land; a cloaked body wears the white `selected` outline at 15–35%, and a Revealed unit `green.4` corner brackets.
- **Act II deaths:** Skitterkin go *quiet* (squash and pop, no confetti, a small fleck left behind); Aelari *shatter* into jewel-toned shards; the Hollow *unravel* into cold-violet motes in any act. Act III's *still* is declared, drawn in M6.
- **The Hollow moves wrong:** a held frame then a skipped one every 1–2 s and a rare 1–2 px shove (none under reduced motion), seeded per uid, never the sim's RNG. Fleeing runners glance back.
- **`__sd.render()`** reports render beats (pose, rims, rings, brackets, lowered allies) so smoke can assert them, not only screenshot them.

### D117 — 2026-11-09 — T421 A2M2 *The Glass Witch*
- **Par 76.2 (16/21, rigs untouched)**, A2M1 81.0 → A2M2 76.2; it earns Glass Half Empty with one blink because its strike lands on her phase 2 at the hairpin. **QUILL's Rapport changes a result (85.7, T401):** par casts Time Dilation 8 s into W11 and again 52 s later; only the 51 s Rapport cooldown catches the surge. Without casts par loses in W11 (she drains the rigs after three blinks); checkpoints (T305b) soften that.
- **The rig branch** is 38 tiles (a ledge, back under the thread-glass outcrop, a hairpin, a drop to the rigs at (17,10)); 14 pads; 11 waves; 9.4 min. **Start credits are 500** (the Witch fight needs ~2,000 on the branch; within Act II's 400–550).
- **Alts:** the plan's Zapcoil-and-Rivet alt can't hold Mote clusters (Energy ×0.75 vs the Hollow), so `shell_and_coil` and `soak_and_shell` replace it, both answering the Witch with a Bunker Buster.
- The KFA form is the last paragraph of `memo_a2_02` (T411 may split it). **Bug found:** the Thorn callsign never reaches the save (debrief effects aren't applied on Results); T413 fixes it.

### D118 — 2026-11-09 — T305b checkpoints
- **Taken as the countdown to every 5th wave begins** (W5, W10) on Act II+ maps (rule data; never on a Holdout, the finale, challenge or endless maps), so a retry lands in the build phase. After a loss, **"Retry from wave N" is the focused primary button**; the resumed battle opens paused ("Resumed at wave N. Unpause when ready.").
- **A retry replays the lost run's command log headlessly** to the checkpoint (exact, no state serialization; A2M2's W10 in ~124 ms). Listeners rebuild their own story state from the replayed events but play nothing visible or audible while replaying; bark spacing is approximate, once-limits and met enemies exact.
- **The pause menu's Retry stays a full retry:** checkpoints recover a lost run, never rewind a wave that went badly mid-run.
- **A checkpoint run forfeits Perfect Core and the Challenge, never objectives** (they carry story content and replay exactly). Pests Processed counts per attempt; flags and stamps read the whole run. A defeat pays only the waves beyond the checkpoint.

### D119 — 2026-11-09 — T440a Act II unit sprites
- **Fleeing looks are separate sprite ids chosen by the wave tag** (`<body>_fleeing`: ears flat, a glance back, a panic hop; canvases 2 px taller for the hop), like the youngling. **Every Act II Hauler flees, so its sack shows its young** (`enemy.brood_hauler_fleeing`: the sack untied, three young in its mouth) — A2M3's reveal needs no data change.
- **Heavy is an anim family** (`heavy_<facing>`, the victim pale inside), not a baked variant; the Hollow's dropped pixels are baked per frame from a seed, so render needs no RNG.
- **Aelari lattices have real holes** and a hand-drawn outside-only outline. A derived **`cloak` variant** (50% checker, white dashed outline) is baked for the Aelari and Hollow palettes, drawn at 35–60% alpha.
- **Value band to fix:** Act I Skitterkin (≈ 0.42 luminance) now match Act II's path; the outline and saturation carry them for now, and T440c re-bands the `act2.*` path.

### D120 — 2026-11-10 — T407b Skyhook and Zapcoil specs; homing and charge
- **Every M4 tower spec is built;** Engineering lists no "later shipment" rows for the Act I towers. No par or alt buys them yet (Act I–II numbers unchanged); M5 maps with armored flyers or tanks give them alts.
- **Homing:** pure pursuit of the target each tick, at most 3 s of flight; on losing its target a missile retargets the nearest enemy within 3 tiles (lowest uid on a tie, never a neutral, never a spared runner if its tower spares them), else flies to the last seen point and fizzles. Seeker Swarm fires a volley of 4 every 2 s, air-only, the tower's target first.
- **Charge (Capacitor Bank):** rate bonuses shorten the 4 s charge; it holds its target regardless of priority. A kill, a leak or the spare filter swings the charge to a new target; an escape (burrow, cloak, leaving, out of range) fizzles it; Hold Fire vents it. Blink, burrow and cloak counter it; Stasis and Pins help it.
- **Seeker Swarm answers armor only where the armor flies** (`vsAir`), so the loadout never claims it answers ground armor.

### D121 — 2026-11-10 — T422 A2M3 *Second Look*
- **Par 76.2 (16/21)**, the chain holding at A2M2's 76.2; 11.7 min; start credits 550 (three fronts from W6 starved every par at 460). Par brings Zapcoil, Sprinkler (Cloudburst from W10) and Skyhook; Clear Skies belongs to the `coil_and_shell` alt.
- **The strip mine has its own road** (`mine`, down the far wall into the gate), because a revisit's new routes can't join the original's road; the air lane flies the same line. The warren spawn stays one tile in from the edge (the band reads as spoil). **W3 is a pure "look" wave:** three fleeing Haulers with their young showing and nothing behind them.
- **Pebble becomes clickable as W5 starts** (fallback W6 cleared). **Bricks's `pebble` portrait shows once the rescue cue is seen** (mid-battle on A2M3, always from A2M4), and **her name plate reads "???" until Bricks names her** (`a2_m03_w07`); speakers gain name-plate rules. On a replay both show from the start.
- **Ruling for T460:** the hold-fire run sets `held_fire_second_look` but scores 28.6; mercy may cost integrity, never most of it — retune toward the band floor.

### D122 — 2026-11-10 — T413 dialogue and app carry-overs
- **A won run applies its debrief's `set` effects once per campaign** (guarded by `story.seen`), after run end and after the card's lines are read: A2M2's Thorn callsign now reaches the save. A loss applies nothing; a replay or a checkpoint win can never undo a later callsign.
- **The win hold lets lines cued before the win finish** (each to its typing time + its hold, capped at 5 s); a bark alone holds nothing; a loss stays 1.5 s.
- **`NotFiringAtSkitterkin` fires at most once a wave and carries its wave**, so an early hold no longer spends Bricks's Quiet Wave line (A1M5's bark is `wave: 10`).
- **The bank nudge also fires after two build phases with no purchase** while the cheapest tower is affordable, so A1M2's never-spend player hears it before the W7 wall (T229).
- `MapDef.briefing` is gone (briefings are scenes); A1M3 has its debrief (new canon in act1.md); `saveModifiers` lives in `meta/loadout.ts` and counts equipped protocols; full-screen scenes around Results can read `thisRun`. The name-tag plate is still undrawn (T431).

### D123 — 2026-11-10 — T440b the Glass Witch, the Vrell towers, every spec frame
- **No placeholder art remains** (`sprites/placeholders/` is gone). The Glass Witch is recognisably Ves'thara's portrait (D103) as a 31×48 woven avatar: the pointed lattice veil, the ruby brow knot, emerald robes, the cut collar thread frayed in every frame; her states each have a shape (walk, pulse tell with light in her palms, blink tell swept tall and thin, bowed on a phase change, dimmed with a hand at the thread in retreat).
- **The Vrell towers** (Lookout, Harpoon, Crane) share a scrap-and-price-tag spec base (`vrellSpecBase`); every Act I tower's specs have their own frames. Head canvases grew to fit their specs with anchors moved, so tier 1–3 draw where they did.
- Render still has to pick some of this art (the Witch's tell and blink poses, idle spec heads, the young-sack burst): T430b.

### D124 — 2026-11-10 — T411 Act II codex and Inbox
- **Act II's codex** speaks in Everglow's PR voice saying worse things (the Mote, the Diggings, the Hushed, the Glimmer, the Glass Witch, lumenglass, the Aelari, the Weft Warden, the Lightwing); the crew log unlocks with A2M1's objective. **Pebble's entry is withheld** ("[QUILL: Entry withheld.]", under Personnel, a "Withheld" photo).
- **An annotation is stored as the note alone and shown under its original, dimmed** (replacing core-loop §6.5's "tab to read older ones" and art-direction's strike-through). Everglow annotates too (Rig Nine's status update at A2M1); QUILL's notes begin at A2M3 (the Brood Hauler: the sacks are young; the Mote unredacted: "I filed them under weather").
- **The KFA form is its own Inbox item** (`memo_a2_02_kfa`, a form panel with a PENDING stamp, "Signature: pending" setting up the epilogue), delivered just before Sterling's "Please disregard it".
- **The Base opens on the Inbox when a memo is unread** (after Zibzab's arrival, else Research), replacing D075; after A1M5's stinger the player lands on the Record Quarter memo, whose small print is Rig Nine's "quiet period".

### D125 — 2026-11-10 — T301b the Sector map and the Pest Bounty Board
- **The Sector map is built** as D102 specs it: after A1M5 the campaign screen becomes Everglow's survey chart of the valley, showing won maps and the frontier only; every "Shift board" button reads "Sector map" then; the Shift board's sixth row is never named. Node places follow campaign.md §2's biome column; dusk takes a 32% shade wash so it reads apart from gold; the panel keeps clear of the selected node's plate. The marker's walk plays within a session only.
- **The Pest Bounty Board** is the Base's last tab from A1M2 won until A2M6 won: Kip #1 (the player's count + 13 + 6%), the player #2, a few colonists (M. Haddad, P. Lindqvist, and Tidybot 4, "Honorary"); Kip's row reads "(on assignment: Reclamation)" once A2M4 is won.
- The naming rule (D102) covers the Base shelves' "Arrives after {map}" too.

### D126 — 2026-11-10 — T410b Act II presentation
- **Every presentation dial is read through `presentationFor`/`presentationOfMap`;** nothing checks the act directly. Between maps, menus take the next map's row (they turn Act II orange once A1M5 is won); the Title and the intake stay Act I as Everglow's front door; dev maps take their act's row; challenge and endless maps the post-game row.
- **Act II's Results stop cheering:** the kicker reads "Shift report · Filed" and the counter "Pests processed: n." on a plain steel line (no badge, star or brag; the career total stays). The headline stays "PERIMETER SECURED!" in every act — the cheer curdles by repetition (style-guide).
- **Tidybots tidy up stardust:** each Skitterkin death leaves a speck of stardust, and after every wave but the last, Tidybots fly in, vacuum the specks and chime away — a quiet plant for "where stardust comes from".
- **Act II's wave-clear jingle stays silent until T450 writes the minor cue;** it never falls back to Act I's bright sting. The loading tip comes from the slot Continue would open.
- **Ruling:** radio lines at 2× scale their holds by game speed (≥ 1.5 s) and drop once their wave has started (T430b).
- **Process:** `SMOKE_PORT` must avoid Chrome's unsafe ports (5061 is one); ad-hoc Playwright configs must never output into `./test-results` (it's wiped on each run).

### D127 — 2026-11-10 — T440c Act II props, tiles and the value band
- **Act II's ground is re-banded** (D119): grass ≈ 0.22, road ≈ 0.31, units ≥ 0.39 (Skitterkin 1.2–1.4× the road; the Mote 2.2× below it); the Aelari, whose mean sits level with the road, are held to bright knots ≥ 2:1 over it inside a dark rim ≥ 3:1 under it. `palettes.test.ts` checks both Act II palettes.
- **A2M2's rigs draw one frame per damage band** (`assetLook` from `assetDamage`: intact, damaged, a pulsing critical, lost), apart from the decor list. **A map's dark edge grows from a `halls_dark` marker**; outcrops are high ground with an `outcrop*` marker; spoil heaps and warrens alternate frames by their marker's number.
- Every A2M1–A2M3 prop in act2.md's lists is drawn (Rig Nine dead over the bore, the hut with three hushed miners, the warrens with eggs, the faded scarecrow, Rig 3 working the strip mine), and Pebble holds on the Peeker's rock. The gallery is 29.4k of 32.7k px: M5's art will need the card plan trimmed.

### D128 — 2026-11-10 — T431 the Act II HUD
- **The name-tag plate is drawn** (an `ink.1` plate with an `orange.4` edge and clipped corners over the named unit, from `hud.nameTag`). A **"Checkpoint" cue** shows for 3 s when one is reached; the loss card's four buttons stay on one line.
- The threat strip says **"Hollow clusters"**; the briefing lists optional objectives; flak tiers show splash on their stat line; the asset meter has a rig icon; the status panel is 112 px wide so four-digit credits fit, and a Protect map's asset row counts toward its height when the tower panel is placed.
- **The loadout's link list puts formed links first**, shows each missing link on one line (its bonus in the tooltip), and counts formed links ("Links 2 / 6").
- Spawn flags call their wave on a click; the companion's portrait sits on slot 2; locked tier-4 cards follow the map-naming rule ("Engineering unlocks after The Audit"); A2M1 teaches Spare runners (Alt+H).

### D129 — 2026-11-10 — T408 the Grapple Harpoon and Salvage Crane
- **Both are live** (licenses after A2M1: Harpoon 250, Crane 200); no par or alt uses them yet (M5's maps give them alts), and Act I–II harness numbers are unchanged.
- **The Quiet Wave ruling:** D107's first-win scope now covers attack ranges too — `[quiet-wave-reach]` counts only towers the run that first wins a map can own, the only run that sets `spared_quiet_wave`. The Harpoon (4.0, the long-range armor answer) is stocked after A2M1, so A1M5 is unchanged; a replay Harpoon can reach the wave, but a replay can't change the flag. A test pins it.
- **Pinned interrupts nothing** (unlike Stasis), never extends, leaves 1 s of immunity, grounds flyers; on a boss it becomes Chilled 50%. **Skewer's line** is 0.4 tiles wide, scales with range bonuses, passes neutrals by, and hits spared runners in its way; it answers splash.
- **The Crane:** its radius is its range (with every bonus); kill credit goes to each Crane whose radius holds the killing tower, only for that tower's own hit; spared runners pay nothing. Haggler's Stall pays interest once a wave at the best Stall's rate, after the wave's other payouts, rounded down and capped. **Reel It In:** +3 credits per Harpoon kill, +10% Harpoon fire rate.

### D130 — 2026-11-10 — T460 the Act II curve pass
- **Act II as built:** par 81.0 → 76.2 → 76.2, Story wins everywhere (100 / 87.1 / 100), 9.4 / 9.4 / 11.8 min. **A2M3's mercy costs, but not most of the core:** the hold-fire run that sets `held_fire_second_look` now scores 57.1 (was 28.6) — fewer Motes chase the slow runners, and W10–W11's Zoomers spawn ahead of their chasers.
- **Hiccup Contained is the `heavyLeaks` stat** (no Heavy Mote gets through); par earns it. It is easy (every winning build earns it) — accepted for now as the Hollow's gentle introduction; revisit in M5 (T501g).
- **Par's banks are recorded, not forced:** A2M1's ~430 from W8 is W7's bounty (one more tower makes par perfect); A2M2 never banks more than 170 at a build phase. A2M2 without its casts losing in W11 is fair: the casts are the answer to the boss, and the W10 checkpoint returns that player close to the fight. A2M1's 156-spawn W7 stays (frame time ~2.5 ms).
- **Balance tests shift several groups at once in one harness run** (`balance/__fixtures__/shifts.ts`), at most one harness run per test, timeout 60 s: balance CPU time halved (248 s → 121 s). T401's verdict is recorded (QUILL's Rapport changes A2M2); T333's A1M4 bank stays (every extra purchase breaks par, D096).

### D131 — 2026-11-10 — T450 Act II audio
- **Act II sounds like Everglow's song going wrong:** the Act II theme bends the jingle minor and ends each loop on the leading tone, never home; A2M1–A2M3's wave clear (`bright_minor`) lands on G instead of C; A2M4–A2M6 get `minor_sting`; Act II never falls back to the bright sting.
- **The Hollow's quiet:** frequent sounds (priority ≤ 1) within 1.5 tiles of a live Hollow unit are dropped, so a Mote cluster under fire is nearly silent but for its unravels; `hollow_hum` (the jingle hummed backwards and out of tune) loops while Hollow walk and ducks the music. Silence is the effect.
- **Aelari are glass:** a hum while they walk, ripples and shatters on their shields (a ripple replaces the "nothing" plink when a shield absorbs a hit), tells and fizzles for pulses and blinks, a shatter on death. The Glass Witch's chord has one note 16 cents flat — the cut thread — and her own end sting; bosses now carry their own end cue. Ves'thara's blip has the same flat strand.
- **Headroom restored (T323):** the limiter sits at −8 dB with a −2.3 dB trim cancelling the compressor's makeup gain; the loudest storms peak at −4.3/−4.1 dBFS and smoke asserts they stay under −3. Only the Orbital Strike's boom changed alone (about 1 dB tamer).

### D132 — 2026-11-10 — T430b the world on screen
- The Witch shows her `tell` pose during a pulse tell and a new `blink` pose during a blink tell (blink outranks pulse); specialized towers play their spec idle heads; a fleeing Hauler's sack bursts with its young.
- **Radio at speed:** a line's hold scales with game speed but always stays whole on screen ≥ 1.5 s after it finishes typing, and never longer than at 1×; a queued radio scene is dropped when its wave starts (one already on the panel plays on). Map-end holds don't scale.
- **Floaters stack** up to three 7 px rows on a spot, then further ones are dropped (bounding fast-forward piles), and draw above health bars and tells. Pebble lifts off the rock in steps (both on a click and the fallback) with a small puff. The battle sky has its two moons on maps with a lighting schedule.
- **The kerb is a generic render rule:** an edge between two road tiles no route steps across draws as a kerb (A2M2's hairpin), and road treads follow route steps. Wreckage's scorch now shows round the debris.

### D133 — 2026-11-10 — T461 the M4 docs pass and the gate
- **Assertion #13 judges each run's own thread CPU time** (2 s limit unchanged; wall time only on a Node without the call), so a loaded machine no longer fails it; the slowest run is ~0.55 s.
- **`test.isolate: false` was tried and rejected:** a split that shared the module cache passed every test but measured no faster (the step is bound by the tests' own work). The default test timeout is 20 s.
- **Test-only fast text** (`?test=1&fasttext=1`): lines show whole and timed holds shorten to 40% (≥ 1.5 s); used only by smoke flows that don't assert typing or hold timing.
- Dev saves from `after_a1m4` on have seen Zibzab's arrival; the star map's marker memory clears when the save in play changes; the Base's opening tab never overrides a tab the player picked (a load-timing flake in `shop.spec`).
- The docs describe M4 as built (architecture's *Built so far: M4*); README gains a reading path for the gate, tests and smoke. The gate's smoke step still runs over its share under load (T501j).

### D134 — 2026-11-10 — M4 review round 1 rulings
Reviewers: correctness/architecture/performance (no high-severity findings), a playtester and story editor who played A2M1–A2M3 from the Sector map, and UX/art/accessibility/audio. **Art trail M3 → M4: better overall** (105 → 152 sprites; the Aelari lattices, the Glass Witch, the Mote and Pebble the strongest new art); watch Act II's murky gold and grey-on-grey.
- **Pebble's rescue is the player's own act, seen and felt:** it pauses (a scene flag `pause: true`), nothing draws over the rock while it can be reached or as she lifts, and the rock lights at W5's countdown — the build phase, hands free — with the Peeker's squeak. **The Witch's "I have watched you count" pauses too.** Only those two scenes carry the flag.
- **The young in the sacks read by sight at 1×** (heads over the rim, in W3's preview too); a fleeing Hauler shows no Carrier glyph — it drops nothing.
- **Runners aren't threats:** the threat strip shows one Skittish chip for every fleeing unit ("They don't hurt the core.") and lists only real threats.
- **A checkpoint can never soft-lock:** only one taken before the run's final tick is offered; a replay that ends the run fails safely. The resume banner says why medals are forfeit.
- **Dusk dims the world, not the actors;** Act II's grass turns back toward gold at the same value band.
- **The Hollow's sound is eerie, not broken:** one steady duck while any Hollow walks instead of a dip per hum; **speech stays ≥ 6 dB over the mix**, asserted.
- *Supersedes D121's timing:* Pebble becomes clickable at W5's countdown (the build phase), no longer as W5 starts; the W6-cleared fallback stands.
- *CONTENT as built:* A2M2's domes sit at (2,10)/(1,11), clearing the comms panel by ~20 px (a dome at (1,9) would poke into it), guarded by a test; par's rescue click lands 1.2 s into W5's countdown (it waits on par's W4 purchase), and the A2M3 smoke checks the pausing panel holds the sim. Rig 3's Act I "One of nine proud rigs" stays (nine rigs in all, Rig Nine among them); only the Diggings' "nine in the northern ridges" was wrong.
- *APP as built:* the resume banner reads "Resumed before wave 5. Unpause when ready. Perfect Core and the Challenge need a shift from wave 1." (6 s; the wave counter honestly still shows W4 in W5's countdown); a failed retry lands on the campaign screen with "That checkpoint couldn't be restored. The shift is safe to play again from wave 1." A runner trait that a real threat also brings stays on the strip. Act II's NEW badges take the act's orange; Act I's stay pink.
- *RENDER as built:* nothing draws over an armed clickable or the lift — floaters are blocked on the grid (1.5 tiles) and on screen (the rock's art and the lift's rise), the name plate hides while it would overlap; the fleeing Hauler carries three youngling heads over its untied sack (also in W3's preview icon); runners show the Skittish glyph instead of their own (so no Carrier on a fleeing Hauler). **The dusk grade sits on the scenery only, at 40% strength** (full strength broke the value bands whatever the actors did); a test checks every lighting stop. Act II's grass is gold again (hue ~39–41°, same luminance band). Ves'thara's brows are dark threads and her face a step brighter, so her five expressions read.
- *AUDIO as built:* the Hollow holds the music at −4 dB (0.4 s ease) while any live Hollow walks — the hum no longer ducks it; the hum gains an octave triangle so laptops hear it. Speech ducks every non-speech sound of priority ≤ 2 by −6 dB (alarms never), and every speaker blip is normalised to one level (its loudest 50 ms ≈ −17.5 dBFS RMS pre-limiter). Measured as each blip's loudest 50 ms against the rest of the mix over the line's first 0.3 s in a ducked storm: +7.1–7.6 dB (Act II), +10–10.5 dB (Act I), all 14 blips asserted ≥ 6 dB. Storms still peak −4.3/−4.1 dBFS. **Ruling for round 2:** lone blips now peak near the strike's boom — instead dip the under-speech bus ~−12 dB for ~0.35 s at each line's start and lower the blips ~5 dB, keeping the ≥ 6 dB margin.

### D135 — 2026-11-10 — M4 review round 2 rulings (fixed in round 3, the last)
Reviewers: correctness of round 1's seams (no high-severity findings; every pause, checkpoint, keep-clear and duck path traced) and a playtester (the rescue panel, the Witch's thesis line and the young in the sacks now land).
- **Pebble's rock lights once W4 is cleared:** on A2M3 each countdown opens 6 s into the previous wave, so "W5's countdown" was mid-fight; the rock now arms on W4's clear, the true build phase (supersedes D134's timing). Enemy health bars also hide near an armed clickable, and the rock draws above walkers.
- **The rock's lights-up sound turns heads** (a double squeak and a chime, louder than the death squeaks, never ducked under itself).
- **A pausing panel never eats a line:** a line on screen when a pause scene opens resumes afterwards. **Lines get a minimum read time** once typed (1.5 s + 45 ms a character, still scaled at speed).
- **The resume banner wraps below the HUD row; the pausing panel is opaque** and hides the PAUSED chip.
- **Dusk dims all scenery** (sprites too, the rock included) and salvaged tiles sit under it.
- **Blips sit back:** ~5 dB lower, with a short ~−8 dB dip of everything under speech at each line's start; speech still clears the mix by ≥ 6 dB, and a lone blip peaks ≤ −10 dBFS.
- *Supersedes the W4-cleared timing above:* on A2M3 a countdown opens once the previous wave finishes spawning, and W4 clears after W5 starts in every reference run; the only hands-free window in every build is W3's clear (W4's long build phase, 4.5–11 s before anything spawns), so the rock lights on `{ wave: 3, phase: 'cleared' }` — straight after the young-in-the-sacks wave. Par clicks in W4; the W6-cleared fallback stays.
- *APP as built (round 3):* a line on the comms panel when a pausing scene opens returns to the front of the queue and replays from its start afterwards, its `set` nodes kept and its wave check waived (it was already on the panel). A typed line now holds the longest of its reading time, typing + 2.5 s, and typing + 1.5 s + 45 ms a character — except a line answered by the next speaker, which keeps D028's typing + 2.5 s beat (it stays above the answer, and the jokes keep their timing). The resume banner is a two-line banner below the HUD row; the pausing panel is opaque (a CSS specificity bug) and PAUSED hides under any pausing panel or full-screen scene. A battle that binds with a clickable already armed (a checkpoint resume) announces it silently.
- *AUDIO as built (round 3):* the line-start dip is a further −8 dB on top of the held −6 dB speech duck (a new `lineDip` gain after `underSpeech`; settles in 30 ms, holds to 0.35 s, recovers over 0.25 s, restarted by each non-silent line). A recipe flag `overSpeech` takes a sound off the under-speech bus entirely; only `peeker_lights_up` carries it (rather than alarm priority, so it never outranks alarms). It peaks +6.0 dB over the louder death squeak (`panic_squeak`) and +4.7 dB over `peeker_squeak`. Blips drop 5 dB (`SIT_BACK`), and the peakiest voices are reshaped to meet the −10 dBFS ceiling (Zibzab's pulse12 becomes a low-passed square; QUILL's chirps and Kip sustain flatter; Pebble a further −1 dB). As measured: lone blips peak −10.4 to −13.9 dBFS, speech clears a ducked storm by +6.7–7.9 dB (Act II) and +7.9–9.0 dB (Act I), and storms still peak −4.3/−4.1 dBFS. The Hollow's hold-duck releases when the map's outcome is decided.
- *CONTENT as built (round 3):* par clicks the tick after the rock lights (8.5 s before W4 starts; hold-fire and Spare 11.4 s); the smoke gives the player's paused click a frame to apply before par's, so the log holds one `interact`. Every A2M3 number holds: par 76.2 (16/21 shifted), hold-fire 57.1 with `held_fire_second_look`, Spare 76.2, do-nothing loses W5, every narrow loadout loses. QUILL's W4 "cargo" line still precedes the rescue, and Sterling's W6 line now follows it. Ves'thara's retreat line plays `sad`.
- *RENDER as built (round 3):* an enemy's health bar and tell glyph hide when it stands within 1.5 tiles of an armed clickable or Pebble's lift, or when they would overlap the spot's screen box (a walker 2.2 tiles in front still drew its bar across the rock). While held or lifting, the rock sorts 34 px further down the screen (`KEEP_CLEAR_RAISE_PX`), so ground walkers near it pass behind; flyers stay on the `air` layer above it, bars hidden. The dusk grade tints every scenery object with a tint (Sprites as well as Images; the Peeker rock is scenery, the lift is not), and the grade moves back on top of the ground whenever a salvaged tile redraws (`LightingView.relight`); on A2M3 at W11 all 113 scenery objects are tinted.

### D136 — 2026-11-10 — M4 shipped: Act II, part one
Act II opens: after Act I the Shift board gives way to the **Sector map**, a seeded pixel chart of the valley with the Bounty Board, and three maps play, A2M1 through A2M3 (A2M3 revisits A1M2 at dusk). New in play:
- **Enemies:** the Hollow's quiet (hush), Skittish runners and the young in the sacks, Heavy units and Motes, Aelari shields, the pulse and the blink, the Glass Witch, cloaks, the Lookout's detection and the Scanner Sweep.
- **Towers and mechanics:** Stasis and Pinned; homing, charge and line attacks; the Grapple Harpoon and the Salvage Crane with its economy; Protect maps (rigs as assets); checkpoints at W5 and W10; clickable world objects (Pebble's rescue, the player's own act, in a pausing panel); dusk lighting schedules; Tidybots; Sky/Zap/Sprinkler specializations.
- **Story and meta:** codex annotations, the KFA form, the Thorn and Witch beats, Ves'thara; Act II's minor-key audio and glass Aelari voices.

Act II's curve: par 81.0 / 76.2 / 76.2 (band 65–85), A2M3 hold-fire 57.1, about 9–12 min a map, Story wins everywhere.
- **Gate at ship:** typecheck, lint, 2,736 unit tests, the balance harness on 8 maps, 131 smoke flows, check:docs (537 s against the 420 s budget, a warning; T501j).
- **Reviews:** three rounds (D134, D135; round 3 fixed round 2's findings in four owner lanes, each gated green, then one gate on the integrated tree).
- **Art trail:** [docs/art/gallery/m4.png](art/gallery/m4.png) (153 sprites, 3,671 frames; M3 was 103 / ~2,300).
- **Next:** M5, Act II part two (A2M4–A2M6); follow-ups T501a–T501l. Release tags stay skipped (D100).
- **Owner asks:** a listen to the Act II mix (the Hollow's quiet and its duck, the Witch's flat note, the new rock sound, the quieter blips and Zibzab's reshaped voice).

### D137 — 2026-11-10 — M5 cut: Act II, part two (A2M4–A2M6)
M5 plays A2M4 *Second Harvest*, A2M5 *The Long Walk* and A2M6 *Sundown* as authored, ending on Act II's close: the truth told plainly and C2, the pivot and the escort, everyone on the wall as the sun goes down, Ishael, and "It's a loophole. I found it myself." The last screen is the Sector map at night with A3M1 as a teaser, so the `act3` chart phase (a slice of T601b) comes forward. Size ~1.1× M4: 29 tasks in 8 waves (tasks.md § M5).
- **The Seer's Lantern ships in M5 as the cut lever** (its first designed use is A3M6, but the Xenotech shelf after A2M5 is Ves'thara's thank-you and stocks both attunements). Mindspike is firm: Unnerved completes the docs' interrupt rule. If the lever is pulled, the shelf row reads "Ves'thara is still tuning it."
- **One gate stays the definition of green; its budget becomes 8 minutes** (supersedes D101's 7). T501j buys time back first (≤ 400 s at M4 content). Three heavier maps and ~12 new flows would otherwise push it past 650 s.
- **A2M5 pivots at the Penitent's 50% or when W6 starts, whichever comes first**, so Kneel stays a skill medal; the median-over-15-min split trigger is the backstop. Closes enemies.md open question 4.
- **Rulings for the builders:** the Aegis Cantor's aura is continuous (15/s), not a pulse; phasing tells can be interrupted (Stasis, Unnerved); the Penitent's shield refills 4 s after breaking unless all three shards are dead; **darkness is sim state** (lit on screen = lit in the sim; supersedes D114 for `dark` only); every scripted beat binds to a phase that holds in every reference run, with a test; `jamLimit` and `objectiveCompleted` retarget to M6 (no M5 map uses them).
- **Moves:** T501c's Harpoon/Crane/Flak/Magnet alts go to A3M2 (M6; no Act II map has armored flyers or tanks); M5 maps still give alts to the Crane (A2M4), Capacitor Bank (A2M5) and Seeker Swarm (A2M6). Ves'thara's `touched_deep`/`dawn` portraits are a stretch. T501 (C4 Keep) goes to M7. T319, T321, T322 and T330 were done in M4 and are closed.
- **Pitch adopted:** Pebble's hum in `base_a2_whistle` becomes a four-note motif, written once (T550) as a cue Act III and the finale can reuse.
- *Wave 1 as built (T500a, T500b, T541):*
  - **Escort's safe exit** is a marker on the core tile (the only marker allowed on a path tile); refugee groups are named, walk a ground path ending there, and are released by `spawnAllies`.
  - **Nothing Unseen** counts a cloaked unit never Revealed since it spawned; **Before the Dark** counts leaks by the leaker's spawn wave.
  - **Stub towers** have one home, `STUB_TOWER_TASKS` (tower → task) in `content/towers/index.ts`; a stub is refused whole and its task lifts it by deleting the entry (replaces `stubFeature` and the dead tower rows; T501k).
  - **Granted-only upgrades** are `UpgradeDef.kind: 'grant'` (price 0, never sold); `tune_zibzab` grants +8% damage to each Vrell tower.
  - **Story transactions:** run end's step 6 pays the Q3 Bonus (A2M4) and the Prism gift (A2M5) on the map's first win; C2 is taken on Results from the debrief's choice, guarded by the `stardust_choice` flag; gifts are recorded `gift_<tower>`; a new `{ bank }` story condition (false without a bank) serves C2's `none` branch. `pause: true` is allowed only on cue scenes (`[dialogue-pause]`, T501l).
  - **Portraits:** Ves'thara's fray is grey slack threads with cold violet in the gaps, on her left side; `touched_deep` dims her a ramp step; `dawn` re-lights the threads in gold with a gold mote (the cut thread stays ruby in every variant). Pebble's cap is punched for her seedling. Kip's plant coat carries a faint stardust smear.
- *The gate as built (T501j):* the budget is 8 minutes with new shares (typecheck 10, lint 25, test 60, build 15, sim 40, smoke 325, check:docs 5 s). Vitest runs as two projects: files that mock modules (or carry `// vitest: isolate`) stay isolated, the rest share one module graph per worker (test step 106 s → 37–45 s; shuffled orders pass). The sprite atlas canvases are CPU-backed (`willReadFrequently`), cutting each page boot ~0.8 s (and the real game's load). In cloud sessions smoke runs on the preinstalled Chrome Headless Shell. `SMOKE_OUT` and `SMOKE_DIST` give each agent a private output folder and build; screenshots go through `shot()`/`outPath()`, never a literal `test-results/` path. Story flows use `fasttext=1` where the assertion allows. A quiet-machine timing is still owed (estimate ~375 s; busy 615 s).
- **The art trail becomes a folder per milestone** (supersedes the one-image rule from M5 on): the gallery is laid out as sheets of at most 8,000 px (a section continues on the next sheet), the ship copies every sheet to `docs/art/gallery/m<N>/sheet-NN.png`, and the owner receives the sheets whole. `m1.png`–`m4.png` stay as they are. CLAUDE.md step 8 and its file map follow.
- *M5 as built (waves 2–7), the decisions the docs left open:*
  - **Units:** the Aegis Cantor's aura refills allies' shields (never its own, never a boss's), the strongest aura only, through fire, reaching flyers and unrevealed cloaks but nothing out of reach (burrowed, Phased, leaving); Story 10.5/s. Phasing follows the burrow rule (Rift Moth: 3.5 s solid with a 0.5 s tell, then 1.5 s Phased); a Stasis or Unnerved during the tell cancels it; a Phased unit gets no shield from its own side. The Fracture splits to Shards (bounty 4, leak 1) and Shards to Motes. Unnerved is ×0.8 speed outside the chill cap and interrupts every tell, bosses' included (the Chitterbloom's sneeze and dig too). Suppressing Fire skips anything untargetable; a Phased Hollow unit can't hush.
  - **The Sunderglass Penitent** (A2M5): 1400 HP, a 600 shield (pulse 60 every 8 s), 0.2 tiles/s, tuned for A2M5's curve (T560; after 2500 → 1500 failed to break on Standard). Phase 2 enters when the shield breaks, never by HP; three cloaked shards (60 HP) re-form the shield 4 s after each break while any lives. The pivot comes at 50% HP or at W6's start (pure content: two events and a `pivotWave` guard); every live hostile of her faction stands down (60 ticks, no leak, bounty or kill; the wave resolves and pays) and she kneels as the Ward (Hollow Chilled 40% within 2.5; a Hollow boss 20%). A forced pivot kneels her at the rig junction, so the Ward is worth 3 refugees to par; Kneel is a skill medal (reveal the shards on the first leg and strike the break: `KNEEL_BUILD`), which par never earns.
  - **Towers:** beams ramp linearly while held (reset on a new or lost target), multiply after the stacking formula, tick every 0.25 s (a rate bonus adds ticks), and never share a target across Refractor's beams; Resonance's vs-shields bonus applies in `damageOn` only (a `[vs-shielded]` rule enforces it). Echo Spike echoes 50% to every other unit within 1.2 tiles; Dread unnerves. Stillness is an instant Stasis (3 s, r 2.5; bosses Chilled 50%). The Seer's Lantern's beam reaches its detection radius; a Mark lasts 1 s past the last tick (the highest Mark wins); All-Seeing marks an area each tick; Truthlight's Mark blocks every evade (cloak, blink, phase, burrow; bosses too) like an interrupt, not pulses, hushes or sneezes. Corrosive Kiss halves every shield gain (own regen, aura, pulses).
  - **Escort:** the safe exit is the core tile; refugees file in from the route start in named groups; an enemy at the exit takes a sheltered refugee (never integrity); defeat is lost > `maxLost`; victory waits for the road to empty; Perfect on an Escort is "no refugee lost" (leaks before a pivot follow Perfect Core); the harness scores Evacuated %. A2M5: 550 credits, `maxLost` 14, 36 refugees.
  - **Sundown is sim state:** the dark level steps per wave between the schedule's keys and eases over 240 ticks; a tower is lit when its tile centre sits inside a lamp's 1.5 tiles or a beaming Prism's 2.0; an unlit tower's range ×0.85 (after stacking, outside the cap); detection and allies are unaffected. Render's holes are exactly the sim's discs.
  - **Story and meta:** run end's step 6 pays the Q3 Bonus (A2M4) and the Prism gift (A2M5) on the first win; C2 is taken on Results (it replaces the way on until answered; the bank shown price first; guarded by the `stardust_choice` flag). The truth scene binds to W4's clear (W5's 50 s countdown); Act II's jingle turns minor from the next wave clear once it's seen. Ves'thara's margin notes are a fourth codex version, `margin`, unlocked after A2M6. Xenotech is Ves'thara's tab after A2M5 (Intel only: she takes no stardust; attunements need the Prism owned); Aelari tune-ups stay Zibzab's, specs in Engineering; her Rapport (Stillness cooldown) after A2M6. Base visit scenes play once each in order (arrival, the A2M4 handover, A2M6's loophole then whistle). After A2M6: the PA's stinger (a captioned scene, so sound-off players get it) → the base → the Sector map at night with *The Preserve* teased; the Bounty Board retires.
  - **Audio:** Pebble's four-note hum (`HOME_MOTIF`, A minor pentatonic) is a reusable cue, first heard in C2's "carried home" sting; the pivot has no sting and stand-downs are one breath; the music ducks with the dark; a checkpoint replay plays no sounds (a bug fixed). Storms stay ≤ −4 dBFS, speech margins ≥ +6.7 dB.
  - **Curve:** the Defend chain reads 81.0 → 76.2 → 76.2 → 76.2 → 72.7 (A2M4 holds 76.2 rather than fall under A2M6; A2M6's ~68 wasn't shift-robust), the Escort chain starts at 75.0; every Act II map runs 9–11 min at 1×. Hiccup Contained stays the Hollow's gentle intro.
  - **Art and render:** the art trail is a folder of sheets per milestone (≤ 8,000 px each). Fray bands at 2/3 and 1/3 HP (bosses never fray); flyers fade over an armed clickable; the Ward fades in as its boss stands down; a pivot's boss bar steps out; the Inbox and Codex count an item read only while uncovered.

### D138 — 2026-11-10 — M5 review round 1 rulings
Reviewers: correctness/architecture/performance (no high-severity findings; replays across the pivot and the dark exact, story transactions pay once, older saves load, the night costs ~3 ms a frame), gameplay/story/emotion (played A2M4–A2M6 from the Sector map: the truth scene, the pivot, Sundown and Act II's close land), and UX/art/accessibility/audio (the art trail M4 → M5: better overall; towers the one weak area).
- **A2M5's W6 can't be called early** (a per-wave `noCall` flag generalising the Quiet Wave's lock): calling it skipped the Penitent's fight and played her challenge after she knelt. Her cues don't play once the pivot is seen.
- **C2 can't be chosen by a stray key:** the offer takes focus as a group, its buttons wait 700 ms, and the Results dialog traps focus. **C2 is never lost:** an unanswered C2 is offered at the base. **Price first, truly:** each option's payout shows before the pick.
- **Read-on-dwell** counts the pane covered only while a scene or the Results screen shows (fixing this milestone's own regression).
- **The Penitent's fight reads:** her shield and the 50% kneel mark on the boss bar, the shards spread along the road, a QUILL line on the first break, 10–15 s of slack for the skilled Kneel; her kneel and back frames get a closed weave.
- **Teaching and light:** Ves'thara tells the player to save Stillness for W9's flock; a resting Prism shows a ghost of its light (and the placement preview shows it); the Lantern says it doesn't light the dark, and its beam ignores the dark penalty (its reach is its detection radius).
- **Ishael plays as a scene** before A2M6's Results card. Bricks's pocket is empty during A2M6's battle; Ves'thara looks `touched` from the pivot on. Small fixes: Zibzab's W1 praise, a diegetic stinger caption, no pivot spoiler on A2M5's node, characters.md. **Kept:** the Preserve teaser's "where you led them" (bible canon; complicity, not blame).
- **Escort:** defeat when lost reaches `maxLost` (all pips full = lost; A2M5 `maxLost` 15, same balance); the wave preview shows refugee groups. Correctness: the Skewer reads the dark, attack-less towers have no dark penalty, the range ring uses the stacked range, a refugee group spawns once, cleanups.
- **Readability and audio:** the three Aelari towers get distinct bases, heads and icons; the refugee icon, Motes, the Phased ghost and Stillness's aim are made clearer; the art-trail dioramas gain an M5 corner; the pivot's held relabel never shows "Core 0"; reduced motion keeps the relabel; the beam hum drops an octave and settles once ramped.
- Mindspike and Lantern get balance probes on A2M6 (tuning, if needed, becomes a task).
- *As built (round 1 fixes):*
  - **`noCall`:** a wave refuses an early call if its def sets `noCall` or any group is tagged `quiet_wave`; the refusal is `'noCall'` ("This one comes in its own time") and the Quiet Wave uses it too. A2M5's `alwaysCallEarly` now plays the whole fight (69.4, 25/36).
  - **The Penitent:** 1200 HP (the Kneel slack came from her HP, not the build: `KNEEL_BUILD` kneels her ~48.5 s after spawning, 11.5 s before W6); shards spread −0.6/0/+0.6 tiles along the road (`spreadTiles`, required data); her cue events sit after the pivot events and are guarded by `pivotWave` (a battle backstop is a map event's guard, never a scene's `when`/`seen`); QUILL's first-break line is the shield cue's second line. Her weave is closed on every pose.
  - **The pivot alone drops the comms panel's lines** (D135's "never eats a line" holds for every other pausing cue). Ves'thara's Stillness advice is a W8 radio scene (W9's build phase comes after W8's Moths). `perfect_wave` is offered only after a wave with a group not tagged `fleeing`.
  - **C2:** the stake is the offer's focused heading, the choices wait 700 ms, the Results dialog traps Tab, payouts show beside the buttons ("+N Intel · Zibzab Tune-up" / "Fee: an IOU"); an unanswered C2 is offered at the base (dialogue on; an empty bank there settles `none` silently). A2M6's debrief plays full-screen before the card (`debriefAsScene`), and the card keeps its lines when dialogue is off.
  - **Escort:** defeat when lost reaches `maxLost` (A2M5 15; validated ≥ 1); a refugee group spawns once; a pivoting boss's faction can't spawn in a later wave ([wave]); the next-wave preview shows "+6 walking".
  - **Darkness:** `darkDims` — a tower with no attack, or a detector (the Lantern), takes no penalty and shows no dark line; an unlit Skewer's line shrinks. A resting Prism on a dark map shows the rim of its sim disc (never a hole or pool), also in its placement preview.
  - **Readability:** the boss bar shows a shield strip and an end mark (the Witch's 40% retreat too); the Aelari towers are a pink gem (Prism), a violet needle (Mindspike) and a gold-lit cage (Lantern) on one dais with per-tower trim; Motes get an inner ink.0 contour; the Phased ghost a white rim; the relabel holds the last integrity; reduced motion keeps it; spec cards name what a choice gives up; margin notes in violet ink; the gallery has an M5 corner.
  - **Audio:** the beam hum is an octave lower, −3 dB, climbing ≤ 5 semitones, and yields to a soft bed (`beam_bed`) once capped.
  - Probes: the Mindspike holds par's level on A2M6; the Lantern is weak there (no cloaks) — T568.

### D139 — 2026-11-10 — M5 review round 2 rulings (fixed in round 3, the last)
Reviewers: correctness of round 1's seams (no high-severity findings; `noCall`, the cue guards, C2 at the base, `debriefAsScene`, the Escort's reach rule, `darkDims`, the boss bars and the beam bed verified end to end) and a playtester (round 1's fixes land: C2 can't be taken by a stray key, the Penitent's fight reads, Ishael's debrief lands as the act's peak; the art trail still beats M4's).
- **The pivot's held relabel shows the old meter whole** (Core and its last value), then swaps everything at once.
- **The Seer's Lantern has one reach:** its placement ring ignores the dark and its beam is clamped to its detection radius after stacking.
- **No stale comms line after a flow scene** (no old radio over the Results card).
- **The shards are seen:** they draw above the Penitent, and a short spark sheds each one on the break. **The shield strip is scaled to the shield**, with "½" under the kneel flag. **The light ring has its own dotted gold look.**
- **Act II's last image gets a stage:** Pebble's whistle scene plays full-screen. The Lantern's cage reads gold. Speaker labels never wrap.
- Ves'thara's `touched` keys to this run's pivot where the speaker rules allow; the pivot-faction rule also covers a boss's own wave.
- **Accepted:** the pivot clears everything on the comms panel (a hard cut); W6 stays locked after an early Kneel.
- *As built (round 3, M5's last fix round):* the relabel's held beat shows the old Core meter whole (not struck through) for 0.5 s, then every Escort row at once; a scene holding input stops the comms queue's stale clock, and once the map has ended any scene that opens drops what the comms panel holds (the "line over Results" was a cut line resuming); visit-scene rows can stage a scene full-screen (`mode`), and Pebble's whistle closes Act II on a dark stage; speaker names never wrap. The Seer's Lantern's range is clamped to its stacked detection radius in `bonusRangeTiles` (sim, HUD and rings share it; authored range must fit inside detection), its placement ring ignores the dark, and it reads as a brass-and-gold lantern. Shards sort just above their owner and a 0.4 s spark sheds each one from the Penitent's heart; the shield strip is scaled to the shield with a "½" under a 50% kneel flag; the light ghost and the placement preview are dotted alternating golds (one rim pixel in three, still rim only). Ves'thara's `touched` stays campaign-wide (speaker rules have no run state; T569). Pars unchanged throughout.

### D140 — 2026-11-10 — M5 shipped: Act II, part two
Act II plays to its close. A2M4 *Second Harvest* tells the truth plainly (where stardust comes from) in a quiet build phase, and C2 is taken on Results, price first: sell the bank at market, or carry it home. A2M5 *The Long Walk* turns a boss fight into an escort: the Sunderglass Penitent's shards, her pivot, the kneeling Ward, the refugees walking past (Kneel for those who break her early). A2M6 *Sundown* falls into real night: lamps, the Prism's light, Ves'thara's Stillness, Goldie's "Lights out in Dome 3", Ishael's debrief on a full-screen stage, QUILL's loophole and Pebble's hum at the base, the PA's minor stinger, and the Sector map at night with *The Preserve* teased. New in play: the Veilwalker, Blinkstrider, Aegis Cantor, Fracture, Rift Moth and the Penitent; Escort as an objective; darkness as sim state; beams; the Prism Spire, Mindspike and Seer's Lantern; Unnerved, Mark and Truthlight; Xenotech; story transactions; Ves'thara's codex margin notes; Pebble's four-note motif.

Act II's curve: Defend par 81.0 / 76.2 / 76.2 / 76.2 / 72.7, the Escort 75.0 (band 65–85); 9–11 min a map; Story wins everywhere.
- **Gate at ship:** typecheck, lint, 3,434 unit tests, the balance harness on 11 maps, 179 smoke flows, check:docs (597 s against the 8-minute budget on a quiet machine: smoke over its share, T564).
- **Reviews:** three rounds (D138, D139; round 3 fixed round 2's findings in four owner lanes, then one gate on the integrated tree).
- **Art trail:** [docs/art/gallery/m5/](art/gallery/m5/) — six sheets of ≤ 8,000 px (194 sprites, 5,314 frames; M4 was 153 / 3,671), with an M5 diorama corner (the kneeling Ward with refugees; Sundown's lamp pool and a resting Prism's light).
- **Next:** M6, Act III. Open follow-ups: T564 (gate time), T567 (stale comments), T568 (the Lantern's value before Act III), T569 (round-1 leftovers).
- **Owner asks:** a listen to the new sounds (the beam's hum and bed, the stand-down's breath, the PA's minor jingle, Pebble's hum, Zibzab's reshaped blip); the A3M1 teaser's "where you led them" (kept as bible canon — say if you'd prefer "we").

### D141 — 2026-11-10 — M6 cut: Act III, part one (A3M1–A3M3)
Act III is six maps, ~2.3× M5 as one milestone, so it splits (the owner's choice). **M6 = A3M1 *The Preserve*, A3M2 *License Revoked*, A3M3 *The Gap*** — the descent: the first tear, the betrayal and QUILL's log, the second tear — ending on the SEAL, "Held." and the Personnel Update memo, then the Sector map teasing A3M4. **M7 = A3M4–A3M6** (the absence, C4 and Night Shift, hitting back, the domes open). **M8 = the finale, post-game and polish.** C3 is asked in M6 and pays off in M7; C4 is wholly M7's, so QUILL's arc splits at "Don't decide about me yet". No system straddles the two: the spawner, gathering, revocation and the Holdout are M6's; jamming, bearers, C4's effects and militia are M7's. M6 is ~1.0× M5: 29 tasks in 8 waves (tasks.md § M6).
- **The gate:** one gate stays green's definition and the 8-minute budget holds; T564 runs first in W1 (≤ 400 s quiet at M5 content: map flows boot mid-map, the harness runs maps in parallel, trims). Above 440 s, the owner chooses a 10-minute budget or a split gate.
- **The Stasis Bloom is the cut lever** (its first par use is A3M5; the Scuttle Den covers burrowed units on the counter guarantee).
- **Gate retargets:** `forceInput`, `forcedInputResolved`, `endMap`, `revokeTowerClass`, `revokeAbility`, `setModifier`, `holdout` → M6; `jamLimit`, `objectiveCompleted`, `openTile`, `spawnWave` → M7; `choir`, `layToRest`, `restProgressPct`, `setLighting`, `checkpoint`, `restoreTowerClass` → M8.
- **Rulings for the builders:** on A3M3 every wave is `noCall`, so the last refugee group, W14's start and the SEAL share one tick in every run (a test); Bricks blocks up to 2 non-boss ground units at a time and his health follows the timeline only (nothing reads as the player's fault). A3M2's revocation cue binds inside W7's spawn window (an early call can't skip it). Revocation refunds what was paid, cancels a placement, upgrade or hotkey of the class and a pause-aimed Orbital Strike, re-runs silently on a checkpoint replay with no double refund, and is saved only on a win. C3 is asked in A3M3's first briefing, committed as it closes, never re-asked, its buttons waiting 700 ms. Briefing gifts are granted as the map's loadout first opens. Act III maps carry no `dark` keys (the `act3` tint is cosmetic). The Choir's jam rules ship as inert data until M7.
- **Moves:** T601 and the still Skitterkin body close if no Act III map kills a Skitterkin (T640a checks); T318's portraits split (Goldie `act3` in M6; QUILL `purge`, Kip `act3` in M7; the rest in M8); T501 and T701 → M8.

### D142 — 2026-11-11 — M6 as built: rulings and addenda to D141
The decisions the builders and the orchestrator made that the docs didn't cover. Each now lives in its doc; this is the record of why.
- **The burrowed exam moves to the finale (an orchestrator ruling; flagged to the owner).** On A3M3 a Harpoon in the Den's tile beat par whatever we tried: a ×2.5 burrowed DoT, Undertow-led waves, 7/4 and 6/4 burrow cycles, rift-only Undertows, Bricks unable to hold diggers, and Den rules that ride, wake for and prefer diggers. The best gap was about 17 points of the ~26 needed, because cut Undertows surface at the choke where every tower reaches them and every loss came from rift Undertows no build reaches. So A3M3 requires **air and splash only**, and its Undertows' `burrowing` and `armored` traits are **`softExempt`**, a new map-level list of `{ trait, reason }` that skips the 15% soft cap for a reason the validator insists on ([maps.md §6.2](design/maps.md)). The no-burrowed build and its tests were deleted, not skipped. The Den keeps `burrowedDotMul` ×2.5 as the finale's lever (T801-burrow, M8: FIN already requires three counters, so its design must make room).
- **Gathering counts as splash** (`TRAIT_COUNTER.gathering = 'splash'`): enemies.md's answer is "kill the small ones near it, or burst it", one Maw is 602 threat, and the soft cap made act3.md's Maw waves impossible otherwise. The Maw is armored too (armor 2).
- **A3M3's splash exam** lives in the doomed waves' packed Mote clusters. Its no-splash build uses the strongest single-target answer the reference owns (Mindspikes where the Thumpers stand); a player whose Thumper A3M2 revoked must bring the Zapcoil.
- **Pausing cues** (`pause: true`, or a `<map>_cue_revoke` by name) may run 6 lines; others stay at 4. QUILL's "Per poli— I'm sorry" splits at the tell (style-guide §5.6).
- **Holdout:** Perfect's slot is **Held the Door** (Evacuated ≥ 85%, judged at the win); the low mark is lost ≥ ((1 − floor) / 2) × total (9 of 36 on A3M3); a quit or retry during the SEAL abandons the run like any map; C3's warren option is remembered by Bramble. Validation requires a Holdout's `forceInput` and `endMap`, a blocker post within reach of a ground route, and every build on a forced-input map to end with its `scriptInput`.
- **Revisits** may drop the original's wreckage (`revisitWreckage: 'gone'`, A3M2's carts).
- **Shelves:** a given tower's tune-up and spec rows wait until the gift is owned (the Den and the Choir arrive later than their `availableAfter`); Bramble's Rapport is stocked after A3M1; Zibzab's waits for M7 (T609c). `ProfileDef.unequippedProtocols` prices owned-but-unequipped protocols.
- **Act III's copy and sound:** no system "!" in Act III or the finale ("PERIMETER SECURED.", "New", "Next time.", callouts, tooltips); the kicker reads "Shift report · Auto-filed" on a win or loss; a map without a meter shows no counter line; no win jingle, and a hummed `lose_hush` replaces the trombone; the Hollow die silently; the Choir hums "Everglow Bright" as a music layer; the Journal tab is named from A3M1.
- **The Seer's Lantern** (T568) needed no tune: its card says its role starts with what hides and what digs; Truthlight's first real payoff is A3M6.
- **Gate:** smoke runs software-composited at 30 fps with 3 workers, which brought it from ~485 s to ~290 s; the quiet gate lands at ~405–420 s warm, so no budget fork for the owner. The test step runs over its share (T564b).
- **The cut lever wasn't pulled:** the Stasis Bloom and the Choir's harmony line both shipped.
- The per-task as-built choices (numbers, timings, looks) are in each doc's "as built" notes and the scratch seam map; the docs are their home.

### D143 — 2026-11-11 — M6 review round 1 rulings
Three reviewers: correctness/architecture/performance; gameplay, story and emotion; UX, art, accessibility and audio. Three high findings, all fixed in this round:
- **C3 can't be chosen by stray keys.** A story choice focuses its question, never an option, as C2 does. Options arm only on a fresh key-down after the 700 ms lock.
- **The SEAL arms only after Bricks's "Do it, {name}."** The button shows at W14's start but arms once the cue's last line has typed. The 20 s line counts from the same moment.
- **Bricks is never hidden at his post.** While he blocks, an occlusion outline draws him over anything in front of him, and his bar sits above his head, not on a tower's base.

**The owner question** (a Thumper-revoked player on A3M3) is kept as an exam and made legible:
- A revoked class shows in the loadout as a stamped, locked card.
- Bricks gives one conditional briefing line, on a new `{ revokedTower }` story condition.
- One pre-doom cluster is packed, so a no-splash build leaks visibly while the waves are still holdable.
- A plain Zapcoil-for-Thumper swap clears the floor through both doors, pinned by a test.

Medium fixes:
- Revocation clears name tags, and Bricks gets a line for Lucky.
- Bricks's post-revocation bark is queued, so it always plays.
- An escort's fail cap can scale with who walks (`maxLostPct`), so sparing Thrum's group doesn't thin A3M1's margin.
- Base scenes play over a neutral backdrop.
- Core-only protocols are marked inert on coreless maps.
- The art trail gets two M6 corner dioramas.

Low fixes:
- Act III's darks are coloured, never `#000`, and an Act III value-band test is added.
- Story lines: "Lost one. Keep 'em coming."; Bramble is plated "The Matriarch" until Pebble names her.
- UI, render, sim, audio and infra polish, including a 1 MB initial-JS check in the gate and the gate brought back under 480 s.

Deferred: A3M2's par-specific difficulty (T660b).

**Owner asks (listen):** the Leaving Song's harmony and Thrum's timbre; Pebble's late hum in the SEAL's `door_hum`; Sterling's 2 s silence with the stamps; whether `lose_hush` reads as a hum; whether the Choir layer sits under speech.

### D144 — 2026-11-11 — M6 review round 2 rulings (fixed in round 3, the last)

Round 2 verified round 1 as landed and found one high: the Thumper exam on A3M3 failed for a player who carried Emergency Bulkhead (A3M2's reference protocol) into a map with no core. The protocol row clipped the "No core on this shift" note, so the player silently lost Head Start, and the Zapcoil swap Bricks recommends then lost as many refugees in W10 as ignoring him.

Rulings:
- **The exam holds whatever protocol the player brings.** The loadout shows the full protocol description and the no-core note without clipping. On a map with no core, a carried core-only protocol is benched in favour of the player's most recent non-inert one (or the first owned one); the player can still choose it. W10 is retuned so the Zapcoil swap loses none there with Head Start off, while no-splash builds still lose.
- **A tagged revocation bark waits for the cue.** Barks queued from `tower_revoked` while a cue's scenes are up are held until they close, exempt from staleness and the beat-end drop (Lucky's line never played before).
- **Bricks's x-ray draws his silhouette through the occluder** (a dithered ink.0 fill with a white.1 rim), not only an outline outside his frame.
- **The story-choice lock debounces:** any input while locked restarts the 700 ms, and a pointer answer needs a pointer move over the option after it appears.
- **The SEAL's fallback counts from the permission scene starting**, not from the button showing. "Do it, {name}." stays up until the press or the wait line. The SEAL clears both doors.
- Small: back-to-back locked choices each lock; the Gap corner's door reads as closing; the gather equivalence test is broadened.

*As fixed (D144 addenda):*
- The Thumper exam's gap was money, not damage: energy deals ×0.75 to void bodies, so no W10 retune separated the Zapcoil swap from no-splash once Head Start's credits were gone. A3M3's start credits go from 700 to 770 (Head Start's tenth for everyone; still inside Act III's band), and W10 is unchanged. The fair window is narrow: at 760 the swap loses 4 in W10 again, and at 780 no-splash holds. `a3m3Protocols.test.ts` pins both edges across the reference, no-protocol, carried-Bulkhead and benched profiles. The carried-Bulkhead profile is the `after_a3m2_thumper` save, checked to equal the game's own `saveModifiers`.
- Benching picks the first owned non-inert protocol in picker order, because the save keeps no equip history. On `after_a3m2_thumper` that is Head Start, and the row reads "Benched: no core on this shift".
- The x-ray shows Bricks's own pixels under an `ink.0` checker with a `white.1` rim, drawn only over the occluding tower. A pure ink fill took the tower's shape and didn't read as him, so the spire's middle hides while the x-ray shows.
- The SEAL's backstop is 30 s from the button showing, and its fallback band is the top 64 px. Pointer debounce needs a move over the option, a tap needs none, and a held revocation bark is still dropped once the map has ended.

### D145 — 2026-11-11 — M6 shipped: Act III, part one

Act III opens, and the colour drains. A3M1 *The Preserve* is an escort out of a doomed nature preserve: the Maw gathers refugees off the road, rifts open a wave ahead, Bramble's Den and Underfoot hold the column, and the Leaving Song plays at the base. A3M2 *License Revoked* is Sterling's betrayal enacted: mid-W7 Everglow revokes a tower class and Orbital Strike, QUILL is locked out, and the Asset Yield Log scene and Bricks's confession follow. A3M3 *The Gap* is a holdout with no defeat: C3 in the briefing, Bricks holding the door on a health timeline, the SEAL the player must press when he says so, "Held.", and the Personnel Update memo. New in play: the Maw, Compliance Drone, Expediter and Undertow; the Scuttle Den, Underfoot and the Harpoon in Act III; gathering, rifts, the haste aura, revocation and the QUILL lockout, Holdout, forced input and the blocker; Act III's presentation (no win jingle, silent Hollow deaths, coloured darks, "Shift report · Auto-filed").

Act III's curve so far: A3M1 66.7 Evacuated (cleared and spared), A3M2 63.6 on the Defend chain, A3M3 69.4 / 75.0 Held (convoy / warren; floor 50). About 12–14 minutes a map; Story wins everywhere.
- **Gate at ship:** typecheck, lint, 4,187 unit tests, the balance harness on 14 maps, 242 smoke flows, check:docs, initial JS 844 kB gz (the new bundle check warns at 900 and fails at 1,000). 525–543 s against the 8-minute budget on a quiet machine; smoke is over its share. **Owner fork (D141):** raise the budget to 10 minutes, or split it into a fast per-task gate plus a milestone gate. M7's first gate task (T764, from T564b) tries to win back time either way.
- **Reviews:** three rounds (D143, D144; round 3 found no highs and its fixes ran through one integrated gate). Round 3's leftovers are T662–T664.
- **Art trail:** [docs/art/gallery/m6/](art/gallery/m6/), eight sheets of ≤ 8,000 px, with two M6 corners on sheet 1 (the Preserve's homes, Den and Maw; the Gap at the SEAL, the door closing).
- **Next:** M7, Act III part two (A3M4–A3M6), as the owner asked. Open follow-ups: T660b, T609c, T501c-M6 (M7); T801-burrow (the burrowed exam moved to the finale, D142), T802-bundle, T662–T664 (M8).
- **Owner asks:** the gate fork above; a listen to the Leaving Song's harmony and Thrum's timbre, Pebble's late hum in the SEAL's `door_hum`, Sterling's 2 s silence with the stamps, `lose_hush`, and the Choir layer under speech (D143); the burrowed exam's move to the finale (D142); and A3M3's start credits going to 770, so the Thumper exam is fair whichever protocol the player brings (D144).

### D146 — 2026-11-11 — M7 cut: Act III, part two (A3M4–A3M6)

The owner, before going AFK: "once this is done let's also move on to the second half of this work, the additional maps". The plan is approved under "use your best judgement", for the owner to review on return; tasks.md § M7 holds the 30 tasks and their waves.

**The cut.** M7 is A3M4 *Empty Slot*, A3M5 *Unsung* and A3M6 *Let Them In*. It ends on the domes open and the Waykeeper callsign, then the Sector map teases the finale. M8 is unchanged: the finale, C5 and the epilogue, post-game and polish. The size is about 1.25× M6:
- 6 enemies and 2 bosses (Shareholder Value, the Gathering Maw)
- the Gloop Spitter and the Sproing Pad
- System Reboot
- 4 links
- jamming, the healer aura, bearers with script groups, the new boss phases, and C4's effects

**Cut lever**, pulled in this order if M7 runs long:
1. Zibzab's Rapport and the report-only probes
2. Big Glorp's puddle
3. the Gathering Maw's merge walk
4. A3M6's 2-wide lane offsets

**Forks, each taken as recommended:**
1. All three maps stay in M7. A3M6 is the act's hope beat, so splitting it off would end M7 mid-turn.
2. One gate with the 8-minute budget. T764, which takes over T564b, runs first and must find at least 60 s of headroom. The owner still holds the D145 fork: a 10-minute budget or a split gate.
3. The harness runs all three C4 outcomes on A3M5 and A3M6, because Purge's −2 armor carries forward.

**Rulings where the docs are silent.** These are proposed in the plan's §1 and taken here.

*Gate retargets*
- `jamLimit` (#10) goes to T702.
- `objectiveCompleted` and `spawnWave` go to T706.
- `openTile` goes to T707.

*Jamming*
- Jammed is a tower state.
- A jam lasts up to `JAM_MAX_SEC`, scaled by the tower's `jamMul` at the jam's start.
- A jammed tower gets 6 s of immunity after the jam ends. Reboot clears every jam and grants the same immunity.
- A jammed tower can still be sold, upgraded or retargeted. Its auras and links go off.
- An interrupted tell restarts the jammer's period, and Lulled stretches it ×1.5.
- The Silencer picks its target at the tell's start: a Choir within 2.5 tiles, else the highest tier.
- The Auditor jams every non-immune tower within 2 tiles.

*Hostile Takeover*
- It jams `min(2, floor(0.25 × towers placed))` towers, picked as the laser starts.
- **Declined:** `takeoverJamMaxSec ≤ 1`, so a Choir at T3 earns it.
- **Keep the Lights On:** `jammedPeak ≤ 1`.

*Jettison*
- At phase 3 armor drops to 0 and haste goes to 40%.
- Four plates land through `openTile` on the `crash_*` markers, never on a par pad.

*The Gathering Maw*
- It gathers within 2 tiles every 5 s, with a 1 s tell.
- At 50% HP it splits into 3 parts of 20% each, with one boss bar and boss rules for each part.
- The parts merge 12 s after the split, with 30% haste. Killing all three before the merge wins.

*Bearers*
- Bearers are an Escort-shaped group, `kind: 'bearer'`.
- A hushed bearer costs the asset 1 of 12. A bearer that reaches the band's edge is home.

*Cut the Feed*
- The three `feed_*` wreckage markers must be cleared before W10.
- If they aren't, W10 gets an extra script group through `spawnWave`, using a new `{ objectiveDone }` atom.

*C4*
- It is asked once, in A3M4's debrief on the first win, with C3's lock, and committed on the answer.
- Night Shift is mandatory at the next base visit.
- The mail scene grants Suppressing Fire (`inheritAbility`) on the first win.
- **Purge:** a faction-scoped −2 armor `enemyStat` (min 0) from A3M5 on.
- **Rewrite:** `lockedAbilities`, and QUILL absent with `system` intel.
- **Keep:** Time Dilation joins the Technician pool from A3M5 on.

*Jailbreak*
- Stocked after A3M3 for 300 Stardust, or free under `convoy`; the player still takes it.
- It moves the class from `revokedTowers` to `jailbroken`.

*The crate*
- It opens as A3M6's briefing closes. It installs every Vrell tune-up rank the player doesn't own, or, if they own them all, one Field Protocol unlock.
- The harness profile includes it.

*Act III maps* still carry no `dark` keys.

Proposed numbers for the Gathering Maw, `takeoverJamSec` and the like stay open to the map tasks' balance runs. Where a map task must change one, it logs an addendum here.

Carried tasks: T660b → T760, T609c → T709 (cut progression.md §7.3's companion-barks clause; Rapports are numbers only), T501c-M6 → T722, T564b → T764, T318-M6's QUILL `purge` and Kip `act3` → T741.

### D147 — 2026-11-11 — The gate is CPU-bound (T764)

T764 measured the gate on a quiet 4-core machine: 563 s before, 550 s now with 3 smoke workers (524 s with 4, within noise). It found that ≤ 420 s is out of reach at M6 content without cutting work. The gate does about 2,100 CPU-seconds of work (smoke ~1,600, test ~320, sim ~120) and keeps all four cores 93–99% busy through test and smoke, so scheduling can't win much more back.

What changed:
- `sim` now runs beside `smoke`.
- Each sprite atlas page is drawn once.
- The gallery smoke is split into three parts.
- Step shares are rebalanced (smoke 420, sim 90 beside it), and the 480 s budget is a wall-time total.

Projection: M7 adds about 70–100 s, which puts a quiet gate at ~600–640 s, past the 10-minute command limit. Main's recommendation to the owner, who still holds the D145 fork: **the split gate**. That means a fast per-task gate (typecheck, lint, test, build, sim, and the task's own smoke specs), with the full gate run by the orchestrator per wave and at the milestone. This is how M7 already works in practice (the gate policy in the agent rules), so only CLAUDE.md's step 5 wording and a `check:fast` script would change (T766). Until the owner answers, every wave and the milestone still pass the full gate, which reports over budget but doesn't fail on time.

### D148 — 2026-11-11 — Owner: the split gate

The owner, on D147's fork: "I'm down to run a fast check where it makes sense". So the gate splits in two.
- **Per task:** `npm run check:fast -- <smoke specs…>` (`tools/gate.ts --fast`). It runs every step whole except smoke, which runs only the named specs (the task's own and the flows its change touches), against a 5-minute budget.
- **Whole gate:** `npm run check`, with every smoke flow and the 8-minute budget it reports against. The orchestrator runs it on each wave's integrated tree, after each round of review fixes, and before shipping. A task that changes shared infrastructure (`tools/`, configs, the smoke harness, BattleScene's wiring) runs the whole gate itself.

The old `check:fast` (typecheck, lint, test, the inner loop) is replaced. The inner loop is `npm run test`, a single `sim -- --map`, or `smoke -- -g`. CLAUDE.md step 5 and conventions.md § The test loop say this. The whole gate's time overrun (D147) stays a warning. T766 tracks the rest of the trims.

### D149 — 2026-11-11 — M7 as built: rulings and addenda to D146

M7's build waves made these rulings. Each landed with its task's tests, and `tasks.md` § M7 links the tasks.

**Jamming (T702, T707, T720, T721, T760).** The A3M4 and A3M5 balance runs showed jamming barely biting, so the rules were retuned as a set:
- A jammer is ready from its first tick and tells as soon as a tower is in reach.
- The Silencer jams for 6 s and the Auditor for 4 s (`JAM_MAX_SEC` 6). Hostile Takeover jams for 4 s, so a Hum Choir at T3 still earns Declined.
- Immunity after a jam is 3 s, and System Reboot's is 6 s (`REBOOT_IMMUNITY_SEC`).
- A tendril, ring or Takeover lands only while fewer than max(1, ⌊25% × towers placed⌋) towers are Jammed, so harness #10 holds by construction.
- A jammer holds still through its tell. Jams never stack or extend. A Jammed tower behaves like Hold Fire.
- **Harness #6 never runs for jam.** The jam limit caps what jamming can take below what the full catalog adds. #5 (reference no-jam loses) runs on every jam map.

  As tuned: reference no-jam loses A3M4 in W16 and ends A3M5 47 points under par (it loses 10 of 12 bearers but not the map; A3M5 keeps a `counterExemptions` entry for jam with that reason). A3M4 stays a teach map.

**Bosses.**
- **Shareholder Value:** 3800 HP, armor 15. Before the jettison, par's armor-piercing damage is about 36 dps over a 130 s road. Takeover fires every 20 s, and the hangar launches 2 drones every 8 s.
- **The Gathering Maw:** 4000 HP (parts 800), armor 4. A1M1's road is 20 tiles. Its gather tell is 1.5 s, as for every boss. It splits at 50% of stat HP and merges 12 s later, the merge walk kept. With no `BossEnded`, the "beaten" sting keys on the last part's death.

**Harness.** `counterExemptions` is a per-map list with a reason, used by A3M5 for jam and A3M6 for detection. Detection's reason: canon gives the Operatives one teach wave and one test wave. A3M5's no-armor loses by W14, because its long road delays the Liability column's leak. Flag runs apply the game's own story modifiers, such as Purge's −2 armor. `referenceProfileByFlag` lists each door × C4 cell, with an optional par build.

**Content and story.**
- The Night Shift scene id is `a3_m04_base_night_shift`.
- A radio scene that opens with a reply button may run 4 lines (A3M6's knock-knock keeps both canon endings). Its reply is `a3_m06_cue_knock_answer`.
- QUILL's list is data (`QUILL_LIST`) behind a `system` header line.
- Under Rewrite, every QUILL line on A3M5 is skipped, and `system` gives the threat advisory.
- QUILL is "it" (characters.md), including in UI copy.
- Leapers Pin only flyers. A boss is Chilled 50% only if it flies, because ground bosses would be chilled 75–100% of the time.
- The crate opens on Clock in. Night Shift and the Waykeeper beat are full-screen.
- Zibzab's Rapport shipped (Clearance Sale cooldown 4 → 3 waves), and Rapports are numbers only (progression.md §7.3).

**Curve.** As tuned, par is A3M4 68.2, A3M5 63.6 and A3M6 59.3. A3M5 ends below A3M4 but above campaign.md's ~57 target; the gameplay review weighs it. Cut lever 4 (2-wide lanes) was pulled by geometry, since no M7 map has a band road. No other lever was pulled.

*D149 addendum (T761):* towers.md's open question on Gravity Well stacking is answered by `a3m5Jam.test.ts`: 32 units are each pulled once, so stacked wells aren't degenerate. The question is removed.

### D150 — 2026-11-11 — M7 review round 1 rulings

Three reviewers covered code and architecture, gameplay with UX and art, and story with emotional impact. They found three highs:
- The jailbreak confirmation drew as a solid orange box at the base. Its chamfer needed a variable that only the HUD defines.
- The Sproing Pad's loadout card couldn't be clicked by mouse at 1280×720.
- Story difficulty didn't soften A3M5's bearers asset.

All three are fixed. Smoke now checks pixels and mouse clicks where it only checked the DOM.

Rulings:
- **A3M5's balance must survive human timing.** Par's casts shifted ±2 s still clear the band minimum, a new harness row. A3M5 is eased through its waves, not through global abilities, and its W2 teach wave no longer drains a Head Start player.
- **Teach the jam timing, not just the button.** QUILL's A3M4 line teaches Reboot as a counter to the tell. A cancelled tell shows a visible fizzle. A3M4's W16 Silencers are staggered so the wave is a test, not a cliff.
- **Declined stays the Hum Choir's medal.** The song beats corporate control. A3M5 hints that the Choir shortens hostile jams, under every C4 outcome.
- **Canon in the small words.** Under Keep, QUILL *lends* Time Dilation ("Lent by QUILL"); "Inherited" stays Bricks's. QUILL's own list carries no Everglow plate. Kip's pin is seen before his silence (a caption and his pinned portrait). Zibzab's "Price first: nothing." stays on the crate card. A3M5's asset meter is named for what it guards, not "Bearers", beside the carried count.
- **The harness can't bless what a player can't play.** A build's slot-1 ability is checked against the map's story locks, and `createSim` refuses a locked one. A `counterExemptions` entry names the test that pins the counter instead. The jam limit has one definition.
- Readability: the Gathering Maw's merged state and the Auditor stand out at 1×.
- Initial JS: dev fixtures load only on demand.

A3M4's loose economy is logged for the finale's economy pass (T773).

*D150 addenda (round 1 fixes as landed):*
- A production build compiles content without `validate()`. The gate still validates every shipped content set (`content.test.ts`, `tools/shippedContent.test.ts`).
- Dev battles and dev saves load on demand from one lazy chunk. Boot awaits it for `?test=1` or for a dev `?map=`. Initial JS is down from 922 to 882 kB gz.
- System Reboot's immunity is exactly 6 s, counting the cast's tick. Of every harness number, only A3M5's beams alt moved: 41.7 → 40.9.
- The locked-abilities guard exposed a real hole: A3M5's Rewrite harness run was casting Reboot. It is now closed.
- Violet marks a jammer, including the Auditor's mast. The merged Gathering Maw rages in magenta. A cancelled tell shows "FIZZLED", detected from sim state, not a new event.
- A3M5's asset meter is "Long Walk". Story difficulty raises a Protect asset ×1.5.
- A3M4's W16 stays as tuned, with the teaching added: QUILL's tell-timing line and a W16 warning. The cliff, which comes from the Bulkhead absorbing every earlier leak, goes to T773.
- Easing A3M5's W2 lifts its par to 68.2. On par alone it now ties A3M4, but it stays the hardest map for a real player: no-cast and ±2 s numbers are logged with the curve.

### D151 — 2026-11-11 — M7 review round 2 rulings (fixed in round 3, the last)

Round 2 confirmed round 1's fixes as landed: the jailbreak confirmation, the loadout at 1280×720, "Lent by QUILL", the Long Walk meter, Kip's beat, the crate quote, the locked-ability guard, the lazy dev fixtures, Story's asset and the teaching of Reboot timing. On A3M4 a Reboot on the tell now pays (72.7 against par's 68.2), while a Reboot after the jam lands scores the same as none. There were no highs.

Rulings:
- **A3M5 must reach a human, not just a timer.** Casts shifted ±2 s now clear the band, but a cluster-aware human caster reaches only the floor (50.0). The gap is W13's hunt. A countdown line tells the player where to freeze it, the hunt eases if that isn't enough, and a cluster-aware caster joins the harness pins at band min + 5.
- **Declined's hint is fair and timely.** Pebble's Choir line moves to about W9, before the layout is set. It names the Choir's loudest song (T3) and plays only when the Choir was brought.
- **A briefing replays as it first played.** Kip wears his pin on his ledger line every time A3M5's briefing runs.
- **The loadout and the sim judge story locks the same way**, with one shared condition check (closes T774).
- Polish: "▾ More" is a real button with a visible scrollbar. QUILL's list stays up through its payoff line. FIZZLED holds 0.8 s, never shows for a ring that later lands, and also covers a Reboot that spends a Takeover laser. The Auditor gets a white mast tip. The Gathering Maw's parts spread on diagonal roads too.
- Kip's pinholes are invisible at briefing size. That is accepted: his cap and the missing pin carry the beat.

*D151 addendum (APP):* a replayed scene shows each speaker as it first played. Portrait variant and name plate are judged as if the scene were still unseen. This is a general rule, not a Kip special case, and it also keeps Pebble's A2M6 whistle scene right on replay. The loadout and `createSim` now judge story locks through one check, `flagConditionHolds` over the map's gated flag defaults (T774 closed).

*D151 addenda (CONTENT, RENDER):*
- Easing A3M5's W13 hunt moved no number. The bearers are lost to its two Silencers, not its Motes. The fix is Kip's W13 countdown line ("Save what you have. Freeze them on the back path, by the old intake.", reworded in round 3 so it points at the lane, not the intake hopper 4 tiles off it). A human caster who heeds it ends at 75.0, 75.0 and 91.7 under Keep, Purge and Rewrite; a plain one at 58.3, 58.3 and 25.0, where Rewrite's player has no Reboot and spent their casts before the hunt. `a3m5Human.test.ts` pins these. The reviewer's probe had two bugs: it skipped countdowns and rounded its targets.
- Pebble's Choir hint is a map-script cue on W9's countdown, gated on a Choir being built.
- A jam ring fizzles only on its landing tick, and only if it jammed nothing. A Takeover laser fizzles once every tower it picked will stay immune past its landing. FIZZLED holds for 1.6 s.
- The Auditor's mast has a white tip. The Gathering Maw's parts take lanes by their order along the road, at least 24 px apart on screen.

### D152 — 2026-11-11 — M7 shipped: Act III, part two

Act III plays to its turn. **A3M4 *Empty Slot*:**
- Bricks's place is a silence. Gerald walks his last delivery through the shelters.
- The mail brings his pension form (nineteen years, Pebble the beneficiary) and the key "For Thorn".
- QUILL asks C4, and Night Shift answers it. Under Keep or Rewrite, Ves'thara laughs for the first time; under Purge, QUILL's status bar blinks through a silence.

**A3M5 *Unsung*:**
- A2M4 at night: the bearers carry the vats' dead home along the Long Walk.
- Kip leaves his #1 EXTERMINATOR pin on the console.
- Sterling's platform, Shareholder Value, launches drones, takes towers over and jettisons its plates.

**A3M6 *Let Them In*:**
- A1M1 at night, with Zibzab's crate and Pebble's knock-knock.
- The Gathering Maw splits and merges.
- The domes open, and the callsign becomes Waykeeper.

New in play:
- **Enemies:** the Silencer and the Auditor, which jam towers, Act III's new verb, answered by System Reboot and the Hum Choir. Also the Associate (healer), the Liability, the Gunship and the Black Budget.
- **Bosses:** Shareholder Value and the Gathering Maw.
- **Towers:** the Gloop Spitter and the Sproing Pad, with four links.
- **Systems:** bearers and script groups; C4's three outcomes in play; the jailbreak; Zibzab's Rapport.

The finale is teased on the Sector map.

Act III's curve, part two, is in D149 and its addenda: par 68.2 / 68.2 / 59.3. A3M5 stays the hardest map for a human player, measured by the no-cast and ±2 s numbers. Story wins everywhere.
- **Gate at ship:** typecheck, lint, 4,926 unit tests, the balance harness on 17 maps, 317 smoke flows and check:docs, in 749 s against the 8-minute budget (a warning, D147). Initial JS is 883 kB gz. Per-task gates ran as `check:fast` (D148).
- **Reviews:** three rounds (D150, D151). Round 3 found no highs; its leftovers are T777.
- **Art trail:** [docs/art/gallery/m7/](art/gallery/m7/), ten sheets of ≤ 8,000 px, with three M7 corners on sheet 1: the Shelters, Second Harvest, Dome Row.
- **Next:** M8, the finale, post-game and polish. Open M7 follow-ups (in tasks.md § M8): T766, T769–T773, T775–T777; T801-burrow, T802-bundle and T501 carry on.
- **Owner asks:**
  - The gate's per-task split is in place (D148). Whether to trim the whole gate further (T766) is yours.
  - A listen (T750's list): A3M4's bed (Bricks hums half the phrase, a Choir finishes it), `domes_open` as the first warm cadence, the Waykeeper sting, `pa_frantic` against the no-jingle rule, `gmaw_beaten`, and the bearers' six notes over the vats.
  - A play of A3M5 under all three C4 answers, to judge whether jamming feels like a verb. Reboot on the tell now pays, and Kip's W13 line points the way.
  - The rulings taken in your absence: A3M5 easing W2 rather than lowering par, A3M4's W16 cliff left for the finale's economy pass (T773), Shareholder Value at 3800 HP and the Gathering Maw at 4000.

### D153 — 2026-11-11 — Owner: M8 adds a declutter pass

On M7's ship the owner said: "Everything looks great, one thing I'd like to add to the polish is a run through to declutter some of the app. It all looks great but some of the screens have a lot on them to consume." M8 proceeds (the finale, post-game and polish) with a declutter pass in its polish wave (T803).

The approach (main's recommendation, taken):
- Audit every screen at 1280×720.
- Keep only what the player needs to decide *now* in view. Move secondary detail behind hover, focus, a tooltip or a "more" panel, merge repeated information, and trim copy. Nothing becomes unreachable.
- Show the owner before and after screenshots of each screen.

It runs after the finale's screens exist, so the finale's own screens are decluttered in the same pass.

*D153 addendum:* the owner added: "Be sure to keep the gameplay, story, and character very present of course." So the declutter pass removes chrome, repetition and secondary numbers, never the game's voice. These stay prominent and should, if anything, gain room:
- portraits, speaker plates, barks and comms lines;
- character copy: Zibzab's shelf lines, QUILL's notes, the memos;
- story stamps and kickers;
- the playfield.

Gameplay-critical readouts (threats, counters, tells, meters) stay one glance away. Each screen's before and after names what moved, and confirms the story and character elements kept or gained space.

### D154 — 2026-11-11 — M8 cut: finale, post-game and polish

M8 is the last milestone. It covers the finale (*Clearing the Way*: the Descent, the Unsung, Dawn), C5 and the epilogue, the post-game and polish, ending on the post-game star map at dawn. Its last task is the declutter pass (D153). It runs about 1.3× M7: 37 tasks in 10 waves. The plan and every leftover's home are in `tasks.md` § M8.

**Forks, both taken as recommended:**
1. **Post-game ships all three modes in small form:** veteran replays, endless, and three challenge maps. vision.md and maps.md §8 commit to them.
2. **The burrowed exam (T801-burrow):** the finale keeps its three required counters (air, jam, splash). Burrowing is a pinned cost instead: the Unsung's phase 3 burrows toward the choir, and a build with no burrowed answer must end ≥ 10 Voices under par.

**Cut levers, in order:**
1. Challenge maps 3 → 1.
2. Endless keeps one record per seed.
3. Epilogue stills are static.
4. Low leftovers go to the Backlog.
5. Deploy becomes a written recipe for the owner.

The finale's spine, C5, the epilogue, veteran replays and the declutter pass are never cut.

**Rulings where the docs are silent** (numbers proposed; the map tasks tune them):
- **Phase 2** starts at the later of W18 cleared and the choir at the Halls mouth. It checkpoints ("Retry from the Halls"), and Directive 0 fires 20 s in.
- **Scatter and re-form** happen in Phase 2 only.
- **The sky** warms per wave (T701), but the world stays dark until Dawn's `setLighting`.
- **Directive 0's dark Time Dilation** is a phase-scoped lock, not a revocation. The Technician can't equip the companion's own ability (T501).
- **The finale persists its latest checkpoint** to the save, so a 25-minute run survives a closed tab. Other maps keep in-memory checkpoints.
- **The post-game star map:** dawn, every node cleared, the Endless and Challenge nodes, veteran pips, and 3× speed.
- **The choir:** 10 singers plus Pebble (warren +4, convoy −2), with Thrum beside Pebble if spared. `minVoices` is 40% of the run's choir.

**For the owner:**
- **Deploy:** T875 adds a GitHub Pages workflow. The owner turns Pages on under Settings → Pages → GitHub Actions.
- **Stay in the Backlog:** touch input, colorblind-safe tells and remappable keys (post-1.0).

**Addenda (as built, waves 2–4):**
- **The procession keeps wave time, not clock time.** Every beat the choir must hit is a wave (the memorial at W9, the Halls as W18 clears), so `ChoirDef.walkWaves` caps the leader at `min(1, wave ÷ walkWaves)` of her road: a leg per wave, never ahead. Under Story's longer countdowns, early calls and Rush Hour, every beat lands on the same wave. The cap is a ceiling, not a schedule: a choir halted mid-leg catches up later. Waiting at a leg's end is not a halt: no banner, no halt ticks, and the singers keep singing (`state.choir.waiting`). The pace fills most of a Standard wave, so waiting stays ≤ ~40% of Phase 1 and par still halts (more than 0%, at most 15%). The road-clearing verb has to show up in par. Phase 2's start is the trigger `{ choirAt: 'halls_mouth', afterWave: 18 }`.
- **The choir is 20 singers plus Pebble** (warren +8 → 28, convoy −4 → 16), and `minVoicesPct` is 30%, rounded up (6 / 9 / 5). This replaces "10, 40%". With 10, the convoy's only in-band Voices value was 4/8, one hush from defeat. The count was a balance number, not a story fact, and a longer column is the better image. Voices pins stay in percentage points.
- **Story actions** (T807): an ability lock ends whenever the phase rises. A locked cast is refused with "Locked out" and is never counted or saved. The restore leaves the folded towers' uids refused, and `stats.revocations` keeps its count. A restore fired in a run cancels that run's last revoke cue, so a finale win revokes nothing at map end. The Technician can't equip the companion's ability: par is checked beside every pick (#15), other builds beside their own pick.
- **Thrum's echo** spawns at the first live boss, else at the Halls end of the choir's road, and drifts to Pebble at 1 tile/s. It is untargetable. It turns gold on its first tick inside the song (`EchoArrived`), rises for 3 s, then is gone.
- **Story conditions** gain `{ phaseAtLeast }` and `{ inputResolved }`. The forced input id is `WHOS_THERE_INPUT` (`content/forcedInputs.ts`), and it arms after `fin_m01_cue_directive0`'s last line. On a pick-list map, the speakers present are the run's pick, Ves'thara and the choir's leader.
- **The Unsung keeps the Maw's gather growth** (5 stages, `enemy.unsung_g1`–`_g5`).

### D155 — 2026-11-12 — M8 as built: rulings and addenda to D154

The finale, its ending, the post-game and the polish are built (tasks.md § M8). The rulings made while building, beyond D154 and its addenda:

**The finale's battle.**
- **The choir:** a hush allowance replaces the Voices floor. The choir is lost once more than K = 14 singers are hushed, in every cell (`ChoirDef.maxHushed`), so every door choice has the same margin in singers. The harness reads Voices % of the base 20 at its lowest point (`stats.voicesMin`), because Dawn wakes the hushed; Results says "Voices held n of N". Convoy militia damage is 2.5 (at 4 it was the whole warren/convoy gap). The procession walks 0.08 tiles/s, one leg per wave (`walkWaves` 18); `haltTiles` 2.5.
- **Phase 2:** waves W19–26 hold until Phase 2 (`WaveDef.inPhase`), and none start after Dawn. The win is scripted (`MapDef.winBy: 'script'`), so Dawn plays its 8 s. Rest is trickle-dominant (target 1400, 5.6/s, 0.001 per boss HP) so every QUILL answer lands within ±30% of ~3 min. The Unsung has 18,000 HP (parts 1,500, worth 5 rest each) and is held still inside the song. A forced input freezes the whole sim, and the harness's executor rebuilds a restored class.
- **Two answers to the Descent, not one (pillar 2):** the finale has a winning build without a Mindspike (`alt:no_mindspike`: Thumper, Hum Choir, Sproing Pad, Harpoon; 45%), pinned on every seed, companion and the warren. It came from waves alone: about a third of the late void threat became Everglow's Bore security on the Bore road (Auditors, drones, an Associate), and most Silencers, which were what hushed non-psionic builds, became Auditors. Par holds 55.
- **Laid to Rest is 60%** of Phase 2 kills laid to rest inside the song. A deliberate "fight inside the song" build earns it; plain par doesn't.
- **The finale's night is render-only:** the world darkens toward Sundown's plum, punched by the song's rings; the sim's darkness stays 0, so no range penalty. The eastern sky warms per Phase 1 wave (sky-only keys) and Dawn's sun sweeps east to west over 8 s.

**The ending.** The close runs Dawn (unskippable the first time) → Results (REMEMBERED: {n}, Voices held, Continue only) → Sterling's memo → C5 (asked once, never re-asked) → the epilogue cards → PESTS PROCESSED: 0 flipping to REMEMBERED → credits → the final image (Wayside for Stay, the orbit for Go) → the post-game star map. One thing at a time (D153). The finale's music is the colony's jingle as a hymn, in tune over minor harmony, turning major at Dawn; laying a Hollow to rest chimes the jingle's next note.

**The post-game.** An "After the dawn" plate on the dawn star map lists Endless, the three challenges (Skitterkin Only, Lights Out, Glass Core) and "Watch the epilogue". Endless is seeded (one record per seed), with rotating counter blocks previewed in the HUD. Challenges carry their rules as map data, open the loadout (non-faction towers greyed with the reason), pay Intel once per medal and never touch the campaign. 3× speed unlocks once the finale is won. Veteran replays: eight opt-in modifiers on the briefing; a modifier that wouldn't bite is dimmed with its reason; the Veteran medal needs +100% and a win from wave 1.

**The rest of the curve.** A3M4's and A3M5's references carry Head Start (what the live player carries), with par 63.6 on each. The escort chain climbs A2M5 75 → A3M1 66.7 → A3M6 59.3 → FIN 55. A splitter's brood counts toward a wave's threat (maps.md §6.2). Story wins on every campaign and challenge map.

**Engineering.**
- The initial JS is 780 kB gz: Act II, Act III, the finale, the battle renderer, the portraits and the finale's sprites each load lazily, behind one content gate. Post-game maps register through the finale's chunk (`registerActMaps`). Finale-only code and sprites import only from the finale's edge.
- The sim harness spreads a map's runs over its workers; FIN's balance tests are split into parts.
- A GitHub Pages deploy runs on a release tag `m*` (architecture.md § 5, *Owner recipe*).
- The SEAL fallback band is 96 px, not the 64 px logged earlier: the comms panel is up to 86 px tall.

**The declutter pass (D153).** A voice guard is now a test (`smoke/declutter.spec.ts` against `smoke/declutter-before/`): no gameplay-critical readout behind a "more", and no character or story element loses area. Under it: the star-map panel tucks medals behind a toggle and no longer hides nodes; the loadout folds links and protocol effects; briefings give each line its own speaker's face and fold the answering-tower lists; floating text merges and goes quiet at Dawn; Results says each fact once.

### D156 — 2026-11-12 — M8 review round 1: rulings

Three reviewers (story and emotional impact, gameplay and correctness, UX/feel and art) played the finale, the close and the post-game. The art trail was approved, as consistent with M7, and the declutter was judged calmer with the voice kept. The rulings:
- **The finale scores its gate too.** On a choir map with a core, the margin is the lower of Voices % and the gate's %, as on Protect maps. Par had ended with the gate at 5/32, which the harness never saw.
- **No single-wave walls on the choir.** D028's gradual-loss rule applies to hushes (the allowance is the hush allowance); W17's converging Motes are spread so the first hush comes around W13.
- **Directive 0 must survive a human's rebuild.** After "Who's there?", play resumes paused with QUILL's word to rebuild, and a harness variant rebuilding 15 s late must still win, for par and for the Mindspike-free build.
- **The Unsung's forms have time floors**, so damaging it never makes Phase 2 harder, and hitting it shortens the phase. Every alt must win on Story in the weakest cells, and par and every alt run across all 24 flag combinations.
- **The finale takes wave checkpoints in Phase 1** (W5, W10, W15), so a closed tab resumes and a late loss doesn't restart from wave 1.
- **The post-game is QUILL's sim deck: none of it is real, and nobody is counted.** Endless is renamed (Ending A's title belongs to the ending), and Skitterkin and Chitterbloom leave its roster: after "Remember them.", the player is never asked to shoot the people they walked home.
- **The first "REMEMBERED" is the epilogue's flip.** The finale's Results card reads "PESTS PROCESSED: 0", the counter as Dawn left it, on the dawn gradient. The epilogue's backdrop warms from plum to gold across the cards.
- **A script cue plays only when its scene's condition holds** (each QUILL answer heard its own Phase 2 line only by luck of order).
- Veteran bonuses pay only when a replay beats its stored best.
Details and owners: the M8 review round 1 resolutions (orchestrator's scratchpad).

### D157 — 2026-11-12 — M8 review round 2: rulings

Round 2 verified round 1's fixes in play: each QUILL answer hears its own line, the gate counts, no wave is a wall, a late rebuild wins, the finale checkpoints, every build wins all 24 flag cells on Standard and Story, and the post-game never fields the people the player walked home. Runtime holds (5–7 ms frames, no leak, 786 kB initial JS); the gate's overrun is CPU. The rulings:
- **The joke lands before the logistics.** After "Who's there?", "Not Everglow." / "…That's the joke." play while the clock is held, and only then does QUILL ask the player to rebuild ("…Rebuild, then press play."). A forced input arms only after its permission line has typed on screen.
- **Damage never makes the Unsung harder, for every build:** every alt still wins with its damage on the boss at ×1.5 and ×2, and a dug-out Unsung is driven back like a surfaced one. The forms' time floors count unfrozen time.
- **Story never gives less than Standard:** Story's core integrity is a floor, not a value. Rush Hour is dimmed on a choir map ("The walk sets its own pace.").
- **The credits end on the player:** "And you" is the roll's last block, the player's name at title size, held under "Thank you for playing."
- **A checkpoint retry on the finale keeps the walk:** it writes the persisted run at the checkpoint it resumes from.
- **The sim runs a seed only when it can differ:** a build whose first seed drew no random number reuses that result for its other seeds (re-enabled by any future draw). The finale's 24-cell tests run in the whole gate's slow lane, not in a task's fast gate.
- One disclosure style: a trailing ▸.
Gate-time and architecture follow-ups that change no behaviour are logged in tasks.md (T878).
