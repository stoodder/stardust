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
  - ~~Naming items~~ settled in T009 (Voices; Glass Witch; the crate; Gloop Spitter).
  - research/emotional-storytelling.md: mark the "void intelligence" wording as superseded (low priority).
- [ ] **T008** Apply review fixes, reconcile docs, ship M0 (commit + `m0` tag)

## M1 — Playable Vertical Slice
Goal: map A1M1 (the "M1 cut", see `docs/decisions.md` D004) winnable and losable in the browser, with the full test gate green. Starts after `m0` is tagged.

**Parallel lanes:** sim (T111 → T102 → T103 → T110 → T105a/b/c → T108a) · sprites (T104, any time after T101) · render/UI (T112 → T106/T115/T113, once the sim API from T102 exists). T107 integrates everything; T108b closes the milestone.

- [ ] **T101** Scaffold per `docs/tech/architecture.md`: Vite + TS + Phaser 4 + Preact overlay + Vitest + Playwright, oxlint/Prettier, `tsconfig.pure.json` + `tsconfig.node.json` (tools, smoke, configs), every npm script, and `npm run check`. `sim` and `smoke` start as passing stubs ("0 maps"). Add `__sd` test hooks, including `fastForward(ticks)`. Confirm package versions with `npm view`, pin them, and report them for D003.
- [ ] **T111** Content pipeline: `content/types.ts`, `define.ts`, `registry.ts`, `compile.ts` (seconds→ticks, `CompiledContent`). Becomes the canonical home of data shapes (design docs link to it).
- [ ] **T102** Pure-TS sim core: fixed 60 Hz tick, typed pools, per-system seeded RNG, command queue + `applyPending()` (commands while paused), events, `hash()`, determinism test.
- [ ] **T103** Iso grid + map data format (incl. `towerUnlockWave`), buildable pads vs paths, path following, `iso.ts` math.
- [ ] **T110** `content/rules.ts` (damage matrix, stacking formula and caps, jam limits) + content validator (paths vs pads, threatIntel/requiredCounters vs waves, cross-refs). (Absorbs the former T109.)
- [ ] **T105a** Combat: damage pipeline, armor/shields, targeting priorities, tower behaviors (Rivet hitscan, Thumper lead-targeting splash, Sprinkler chill aura).
- [ ] **T105b** Waves: spawner (spawn intervals), early wave call (bonus formula per `docs/design/core-loop.md`), credits economy, build/upgrade/sell (misclick grace rule), core integrity, win/lose.
- [ ] **T105c** Content data: towers Rivet, Thumper, Sprinkler (tiers 1–3); enemies Nibbler, Zoomer, Chonk. Sprinkler and Chonk are sim-tested but not used on A1M1.
- [ ] **T108a** Headless runner + `npm run sim` (par / no-counter / do-nothing / alwaysCallEarly runs) composed in `tools/` or `src/balance/` (not `sim/`).
- [ ] **T104** Code-generated sprite pipeline (palette-indexed grids → textures, palette swaps, outlines) + sprite gallery dev page.
- [ ] **T112** BattleScene: host loop (accumulator, 1×/2×/pause), pooled views, depth sorting, tile picking, range rings, pointer input → commands.
- [ ] **T106** In-map HUD (Preact overlay): build menu, upgrade/sell panel, wave call, speed controls, credits/integrity/wave readouts, keyboard routing rule.
- [ ] **T113** Orbital Strike commander ability (cooldown, targeting, VFX).
- [ ] **T115** Minimal title screen and results screen (PESTS PROCESSED counter shown; no medals yet).
- [ ] **T107** A1M1 playable end to end per the M1 cut: briefing as static text, with no Bricks ally, Suppressing Fire, Crossfire link, or medals. Par build tuned to match.
- [ ] **T108b** Playwright smoke flows (boot, build, wave, win via `fastForward`, lose) with screenshots, wired into `npm run check`.

## M2 — Loadout, Upgrades & Meta Progression
- [ ] **T201** Loadout screen (pick up to 4 towers; skipped when you own ≤4 types and have no choice to make)
- [ ] **T202** Tier-4 specialization choice; adjacency links (incl. Crossfire); medals (in-map evaluation + results screen)
- [ ] **T203** Save system (localStorage plus export/import codes)
- [ ] **T204** Stardust and Intel currencies (medals → Intel payout); permanent upgrade shop (Zibzab) and R&D tree
- [ ] **T207** Companion slot + Suppressing Fire; allies pool with the Bricks ally (never targets `quiet_wave`, `youngling`, or `fleeing` units)
- [ ] **T206** Hold Fire command + story-flag tracking (feeds choices)
- [ ] **T205** Procedural audio: SFX first, then music layers

## M3 — Star Map & Act I
- [ ] **T301** Star map / campaign select screen
- [ ] **T302** Dialogue system (portraits, between-wave and in-map barks, choices)
- [ ] **T303** Codex/field journal
- [ ] **T305** Objective variants: Escort ("Evacuated" meter), Holdout, Protect; retry-from-wave checkpoints
- [ ] **T306** Character creation (name, pronouns), callsigns
- [ ] **T304** All Act I maps, enemies, and towers per `docs/story/campaign.md`

## M4 — Act II · M5 — Act III & Finale · M6 — Post-game & Polish
To be split up when we reach them.

## Backlog / Ideas
- Touch/mobile input support
- GitHub Pages deploy workflow (once a GitHub remote exists)
- Accessibility: colorblind-safe enemy tells, remappable keys, reduced-motion mode
- Veteran modifiers, challenge maps, endless mode
