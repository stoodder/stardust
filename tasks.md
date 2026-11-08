# Tasks

The living task board. The orchestrator owns this file; subagents report proposed additions back rather than editing it in parallel.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked. IDs are stable: never reuse an ID.

---

## M0 — Foundation & Story  *(current)*
Goal: process scaffolding, a complete story bible, and first-draft design, art, and tech docs that M1 can build from.

- [x] **T001** Brainstorm with the owner and record the foundational decisions (`docs/decisions.md` D001)
- [x] **T002** Create `CLAUDE.md`, the `stardust-dev` agent, `docs/README.md`, `docs/vision.md`, `tasks.md`
- [x] **T003** Research emotional storytelling in games → `docs/research/emotional-storytelling.md`
- [x] **T004** First-draft design docs: `docs/design/{core-loop,towers,enemies,progression,maps}.md`
- [x] **T005** First-draft art direction and tech docs: `docs/art/art-direction.md`, `docs/tech/{architecture,conventions}.md`
- [x] **T006** Story bible: `docs/story/{bible,characters,races,style-guide}.md` (depends on T003)
- [x] **T009** Campaign map-by-map beats, introductions, unlocks, choices: `docs/story/campaign.md` (depends on T004, T006)
- [x] **T011** Absorb story mechanics (`docs/story/bible.md` §12) into design/tech/art docs; fix the Sterling pronoun, the Hollow description, and Zibzab's "free" line; add the dialogue tokens and portrait expressions
- [x] **T010** Test loop for M0 docs (`npm run check:docs` via `tools/check-docs.ts`, added): links resolve, README index complete, no cross-doc contradictions
- [~] **T007** Review rounds (≤3) on story and design: emotional impact, story/lore consistency, gameplay integration, docs fitness
- [x] **T012** Story-doc fixes found by T011 (the first three and the last are done; the naming items are being settled in T009):
  - races.md says the Hollow appears "from late Act II", but the bible places it at A2M1.
  - The bible gives two different timings for inheriting Suppressing Fire (§6 says A3M4, §12 says A3M5). Settle on granted at the end of A3M4, usable from A3M5.
  - style-guide.md: raise the `{pests_processed}` worst case to 9 characters, and drop "tech docs list the first five".
  - Name the finale's meter ("Singers"?), confirm the "Glass Witch" boss name, and specify Zibzab's A3M6 crate and which Skitterkin gift C3 moves.
  - research/emotional-storytelling.md: mark the "void intelligence" wording as superseded (low priority).
- [ ] **T008** Apply review fixes, reconcile docs, ship M0 (commit + `m0` tag)

## M1 — Playable Vertical Slice
Goal: one map you can win or lose in the browser.

- [ ] **T101** Scaffold per `docs/tech/architecture.md`: Vite + TS + Phaser 4 + Preact overlay + Vitest + Playwright, oxlint/Prettier, all npm scripts incl. `npm run check`; `__sd` test hooks and Playwright fixture
- [ ] **T102** Pure-TS simulation core: fixed-timestep tick, entities, deterministic RNG
- [ ] **T103** Isometric grid and map data format; buildable tiles vs paths; path following
- [ ] **T104** Code-generated pixel sprite pipeline (palette-indexed grids → textures) + sprite gallery dev page
- [ ] **T110** `content/rules.ts` (combat matrix, stacking caps, jam limits) + content validation
- [ ] **T105** Three towers (tiers 1–3), three enemies, a wave spawner, credits economy, core HP, win/lose
- [ ] **T106** Basic in-map HUD: build menu, upgrade/sell panel, wave call, speed controls
- [ ] **T107** Map 1 (Act I opener) playable end to end
- [ ] **T108** Test harness: headless balance-sim runner (`npm run sim`: par / no-counter / Story runs per `docs/design/maps.md`) and browser smoke tests (Playwright) wired into the test loop
- [ ] **T109** Content validation tests: paths vs buildable tiles, threat intel vs actual waves, counter-coverage guarantee

## M2 — Loadout, Upgrades & Meta Progression
- [ ] **T201** Loadout screen (pick up to 4 towers)
- [ ] **T202** Tier-4 specialization choice; targeting priorities
- [ ] **T203** Save system (localStorage plus export/import codes)
- [ ] **T204** Stardust and Intel currencies; medals; permanent upgrade shop (Zibzab) and R&D tree
- [ ] **T206** Hold Fire command + story-flag tracking (feeds choices)
- [ ] **T205** Procedural audio: SFX first, then music layers

## M3 — Star Map & Act I
- [ ] **T301** Star map / campaign select screen
- [ ] **T302** Dialogue system (portraits, between-wave and in-map barks, choices)
- [ ] **T303** Codex/field journal
- [ ] **T305** Objective variants: Escort ("Evacuated" meter), Holdout, Protect; allies entity pool
- [ ] **T304** All Act I maps, enemies, and towers per `docs/story/campaign.md`

## M4 — Act II · M5 — Act III & Finale · M6 — Post-game & Polish
To be split up when we reach them.

## Backlog / Ideas
- Touch/mobile input support
- GitHub Pages deploy workflow (once a GitHub remote exists)
- Accessibility: colorblind-safe enemy tells, remappable keys, reduced-motion mode
- Veteran modifiers, challenge maps, endless mode
