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
