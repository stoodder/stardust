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
