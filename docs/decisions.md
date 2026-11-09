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
