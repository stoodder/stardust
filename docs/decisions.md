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
Owner request: every task runs a **test loop** after implementation and before review: typecheck, lint, unit/sim tests, build, headless balance sims for affected maps, browser smoke tests for UI, and link/consistency checks for docs. The loop repeats until green and re-runs after each round of review fixes. Reviewers never see red code. Details are in `CLAUDE.md` step 5.

### D003 — 2026-11-08 — Tech stack versions
**Phaser 4.2.x** (stable since April 2026; built-in filters give bloom and glow; tint-fill mode for hit flashes), **TypeScript 7** (strict), **Vite 8**, **Vitest 5**, **Playwright** for browser smoke tests, **oxlint + tsgolint** for linting (typescript-eslint doesn't run on TS 7), Prettier, Node ≥22.18 (native `.ts` execution for tools). UI is a **Preact DOM overlay** over the Phaser canvas. Internal resolution is **640×360** with integer scaling, on **32×16** iso tiles. The sim runs at **60 Hz** fixed ticks with a seeded RNG. Details live in `docs/tech/architecture.md`. Why: these are the current stable, well-documented releases; DOM UI is far easier to make crisp, accessible, and testable than canvas UI.
