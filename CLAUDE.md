# Stardust — Agent Guide

Stardust is a web-based **2D isometric pixel-art tower defense game** set in a StarCraft / Starship Troopers–flavored future. Its story begins whimsical and funny and grows serious and emotional as the campaign progresses. The main character is human; several alien races and a cast of NPCs (some good, some bad, some ambiguous) drive the story.

This file explains **how to work on the project**. Everything about **what the game is** lives in `docs/`.

---

## The workflow (mandatory, every task)

```
CLAUDE.md → docs/ → tasks.md (plan) → implement → test loop → review (≤3 rounds) → update docs → ship milestone
```

1. **Read this file.**
2. **Gather context from `docs/`.** Start at `docs/README.md`. Its **Reading paths** table tells you which docs and sections each kind of task needs, so read those rather than everything. Never invent lore, mechanics, numbers, or conventions that contradict the docs. If the docs are silent, make a sensible choice and record it (step 7).
3. **Plan in `tasks.md`.** Find or add the task under the current milestone. Break large tasks into subtasks that one agent can finish in a single session. Mark a task `[~]` (in progress) when you start it.
4. **Implement.** Stay within the task's scope. Follow `docs/tech/conventions.md`. Write tests alongside the code: sim logic and content changes always need tests.
5. **Test loop (before any review).** Run **`npm run check`**, the whole gate: typecheck → lint → test → build → sim → smoke → check:docs. Fix failures and repeat until green. Never hand red code to reviewers. The detailed spec lives in [docs/tech/conventions.md § The test loop](docs/tech/conventions.md#the-test-loop). In short:
   - **Code:** types, lint, unit and sim tests, and build all pass.
   - **Gameplay/content:** headless balance sims pass for every affected map. The reference strategy wins, doing nothing loses, and margins fall within the target band.
   - **UI/rendering:** automated smoke flows pass, and for visual changes you also look at the screenshots and play the flow yourself.
   - **Docs-only changes:** `npm run check:docs`, plus the manual consistency pass (one home per fact, no contradictions).
   - If the loop can't get to green within the task's scope, stop, mark the task `[!]`, and report what's failing rather than weakening or skipping tests.
6. **Review: up to 3 rounds, from several angles.** After the test loop is green, the orchestrator spawns parallel reviewers, each with a distinct angle (see *Review angles* below). Fix real findings, **re-run the test loop after each round of fixes**, then re-review only if the fixes were substantial. Stop when a round comes back clean, or after round 3, logging any leftover findings as tasks.
7. **Update the docs.** The docs must describe the game as it is *now*. Update every doc your change touched, add new decisions to `docs/decisions.md`, and update `docs/README.md` if you added a doc.
8. **Ship the milestone.** Mark tasks `[x]`, run the test loop one final time, add a short "M<N> shipped" entry to `docs/decisions.md`, commit with a message starting `M<N>: ship`, and push to `origin main`. Then try `git tag -a m<N>` and push the tag. **Claude Code cloud sessions can't push tags** (the GitHub proxy rejects them), so in a cloud session skip the tag and tell the owner to create release `m<N>` on GitHub (Releases → Draft a new release → new tag `m<N>` on `main`). Deploy once hosting is set up (see `docs/tech/architecture.md`).

### Review angles

Pick the 2–3 that fit the change (up to 3 reviewers per round):

| Angle | Looks for |
|---|---|
| **Correctness** | Bugs, edge cases, broken invariants, missing tests, type holes |
| **Gameplay & balance** | Fun, fairness, difficulty curve, degenerate strategies, readability of mechanics |
| **Story & lore** | Consistency with `docs/story/`, character voice, tone matching the act, foreshadowing intact |
| **Emotional impact** | Do beats land? Is the whimsy-to-serious ramp earned? Do choices feel meaningful? |
| **UX & feel** | Clarity, feedback, juice, onboarding, accessibility |
| **Performance** | Frame time, allocations in hot loops, asset sizes, load time |
| **Architecture** | Sim/render separation, data-driven content, conventions, simplicity |
| **Docs fitness** | Can a fresh agent find and follow what they need? Contradictions, staleness |

Reviewers report findings with severity (high / medium / low) and a concrete fix. They **do not** edit files unless the orchestrator tells them to.

---

## Orchestration model

**Who does which step.** Subagents do steps **1, 2, 4, 5**, plus step **7 for the files they own**. They report proposed `tasks.md` and `docs/decisions.md` changes back and never commit. The **orchestrator** does steps **3, 6, and 8**, owns `tasks.md`, `docs/decisions.md`, `docs/README.md`, and `CLAUDE.md`, and makes all commits. A subagent working solo (no orchestrator) does every step.

- The main session is the **orchestrator**. It plans, delegates, integrates, and runs reviews.
- Subagents use the **`stardust-dev`** agent definition (`.claude/agents/stardust-dev.md`: Opus, high effort). If that type isn't available (agent definitions load at session start), use `general-purpose` with `model: opus` and tell the agent to follow `.claude/agents/stardust-dev.md`.
- Run independent work in parallel. Never let two agents edit the same file at the same time; split the work by file ownership.
- Each subagent prompt names its task ID from `tasks.md`, the docs to read, the files it owns, and what to report back.

### How the orchestrator runs a review round

1. Spawn up to 3 **read-only** reviewers in parallel, each with distinct angles, a word budget, and a "ranked findings with severity + concrete fix" output format. Tell them what earlier rounds already settled, so they don't re-litigate it.
2. **Consolidate** all findings into one resolutions file (in the session scratchpad, not the repo). Where reviewers conflict, make the ruling yourself. Tag every item with its owner (Design = `docs/design/*`, Tech/Art = `docs/tech/*` + `docs/art/*`, Story = `docs/story/*`, Orchestrator = `CLAUDE.md`, `tasks.md`, `docs/README.md`, `docs/decisions.md`).
3. Log the cross-cutting rulings as a new `docs/decisions.md` entry.
4. Spawn one **fixer per owner** in parallel, all reading the same resolutions file. Relay cross-owner details between fixers with SendMessage while they run (renamed anchors, new IDs, numbers the other side must mirror).
5. Do the orchestrator-owned fixes yourself, run the test loop, and commit a checkpoint.
6. Later rounds verify the previous round's fixes and the seams between owners. Round 3 is the last; anything left becomes a task.

### Working with the owner

- The owner is a **partner**. Pitch your own ideas (story, mechanics, process) alongside the work, not just what was asked.
- Make decisive recommendations and proceed. Record them in `docs/decisions.md`, and bring only genuine forks to the owner. In the kickoff the owner said "use your best judgement".
- **The story must be genuinely emotional as well as fun.** Act I is laugh-out-loud funny, and the later acts earn real tears and end in hope. Never scold the player. Visual target: vibrant colors and deep darks.
- Keep the owner posted with short status updates at each phase: what finished, what's running, what's next.

---

## Project pillars (short version; full version in `docs/vision.md`)

1. **Story with heart.** Funny first, devastating later, hopeful at the end. Mechanics carry the story too.
2. **Meaningful loadouts.** Many towers to collect, only 4 per map. Every choice is a trade-off.
3. **Readable depth.** Easy to learn, with enemy abilities that demand varied answers.
4. **Vibrant colors, deep darks.** Saturated pixel art against rich shadow, with a palette that darkens as the story does.
5. **Fair challenge.** Progressively harder maps, never cheap.

## Hard rules (game design invariants)

- Towers are built only on **predefined buildable grid tiles**, never on enemy paths.
- **Enemies cannot attack or destroy towers.** A few late-game enemies may *briefly disable* towers (see `docs/design/enemies.md`).
- The player brings **exactly up to 4 tower types** into each map (the loadout).
- **Two upgrade layers:** in-map upgrades (paid with credits, reset every map) and permanent upgrades (paid with meta currency between maps).
- Maps get progressively harder across the campaign.
- The protagonist is **human**.

## Environment (Claude Code cloud sessions)

- Node 22 is the default (20, 21, and 22 are installed under `/opt/node*`). npm registry access works on the default "Trusted" network level.
- `.claude/agents/stardust-dev.md` loads from the repo, with its `model` and `effort` honored.
- Chrome for Testing is at `/usr/bin/google-chrome` (`CHROME_PATH` is set). Point Playwright at it, or run `npx playwright install chromium`. Check early (T101) that a Vite dev server on localhost is reachable from inside the session.
- Pushing branches works; **pushing tags doesn't** (see step 8). The VM pauses when idle, so commit and push progress at least at every task boundary.
- Commands time out at 2 min by default (10 min max). Run long jobs (full `npm run check`, balance sims) in the background or raise `BASH_DEFAULT_TIMEOUT_MS`.

## Tech (short version; full version in `docs/tech/architecture.md`)

- TypeScript + Vite + Phaser. Static site, playable in a browser. Desktop first; touch-friendly later.
- **The simulation is pure TypeScript with no Phaser imports**, so it is deterministic and unit-tested with Vitest. Rendering only reads sim state.
- **Content is data.** Towers, enemies, waves, maps, dialogue, and upgrades live in typed data files, not in engine code.
- **Art is generated by code**: pixel sprites defined as palette-indexed grids and rendered to textures at boot. No binary art assets unless `docs/art/` says otherwise.
- Saves go to localStorage, with export/import codes.

## File map

| Path | Purpose |
|---|---|
| `CLAUDE.md` | How to work (this file) |
| `tasks.md` | Living task board, split by milestone |
| `docs/README.md` | Index of all docs; start here |
| `docs/vision.md` | Pillars, tone, scope, target experience |
| `docs/decisions.md` | Decision log (append-only, newest last) |
| `docs/story/` | Story bible, characters, races, campaign beats |
| `docs/design/` | Mechanics: core loop, towers, enemies, progression, maps |
| `docs/art/` | Art direction, palettes, isometric spec |
| `docs/tech/` | Architecture, conventions |
| `docs/research/` | Background research that informs decisions |
| `.claude/agents/` | Subagent definitions |

## Conventions for docs

- Docs describe the **present state**. Put history in `docs/decisions.md` and git, not in the docs.
- Each fact has **one home**. Link to it rather than copying it.
- Story spoilers are fine. The docs are for builders, not players.
