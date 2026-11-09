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
