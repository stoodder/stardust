# Tasks

The living task board. The orchestrator owns this file; subagents report proposed additions back rather than editing it in parallel.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done · `[!]` blocked. IDs are stable: never reuse an ID.

---

## M0 — Foundation & Story  *(done, tagged `m0`)*
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
- [x] **T007** Review rounds (≤3) on story and design: emotional impact, story/lore consistency, gameplay integration, docs fitness
- [x] **T012** Story-doc fixes found by T011 (the first three and the last are done; the naming items are being settled in T009):
  - races.md says the Hollow appears "from late Act II", but the bible places it at A2M1.
  - The bible gives two different timings for inheriting Suppressing Fire (§6 says A3M4, §12 says A3M5). Settle on granted at the end of A3M4, usable from A3M5.
  - style-guide.md: raise the `{pests_processed}` worst case to 9 characters, and drop "tech docs list the first five".
  - ~~Naming items~~ settled in T009 (Voices; Glass Witch; the crate; Gloop Spitter).
  - research/emotional-storytelling.md: mark the "void intelligence" wording as superseded (low priority).
- [x] **T008** Apply review fixes, reconcile docs, ship M0 (commit + `m0` tag)

## M1 — Playable Vertical Slice
**Status: current, in progress.**
Goal: map A1M1 (the "M1 cut", see `docs/decisions.md` D004) winnable and losable in the browser, with the full test gate green. Starts after `m0` is tagged.

**Parallel lanes:** sim (T111 → T102 → T103 → T110 → T105a/b/c → T108a) · sprites (T104, any time after T101) · render/UI (T112 → T106/T115/T113, once the sim API from T102 exists). T107 integrates everything; T108b closes the milestone.

- [x] **T101** Scaffold per `docs/tech/architecture.md`: Vite + TS + Phaser 4 + Preact overlay + Vitest + Playwright, oxlint/Prettier, `tsconfig.pure.json` + `tsconfig.node.json` (tools, smoke, configs), every npm script, and `npm run check`. `sim` and `smoke` start as passing stubs ("0 maps"). Add `__sd` test hooks, including `fastForward(ticks)`. Confirm package versions with `npm view`, pin them, and report them for D003. **Cloud checks first:** `node -v`; that a Vite dev server on localhost is reachable from inside the session (curl it); Playwright launches Chrome for Testing (`CHROME_PATH`) headless. Report the results for D008.
- [x] **T111** Content pipeline (also: the conventions *Add a map* example uses the real id `a1_m01` with illustrative values; rename it or match A1M1: 350 credits, `companion: null`, no medals): `content/types.ts`, `define.ts`, `registry.ts`, `compile.ts` (seconds→ticks, `CompiledContent`). Becomes the canonical home of data shapes (design docs link to it).
- [x] **T102** Pure-TS sim core: fixed 60 Hz tick, typed pools, per-system seeded RNG, command queue + `applyPending()` (commands while paused), events, `hash()`, determinism test.
- [x] **T103** Iso grid + map data format (compile already emits route polylines and a row-major `TileChar[]`; settle whether paths list the S and C tiles), buildable pads vs paths, path following, `iso.ts` math.
- [x] **T110** `content/rules.ts` (damage matrix, stacking formula and caps, jam limits) + content validator (paths vs pads, threatIntel/requiredCounters vs waves, cross-refs). (Absorbs the former T109.) Also: wire `validate()` into `compileContent()` and have it call `validateSprites` plus the palette hue-reservation and contrast checks (now in `palettes.test.ts`); make `content/types.ts` import the real `SpriteId` / `EnvPaletteId` from `content/sprites/` in place of T111's template type; move `DEFAULT_COUNTDOWN_SEC` from `compileMap.ts` into `rules.ts`. Path geometry is already a compile error (D014); the validator still needs Escort safe exits, markers on decor, `cols + rows ≤ 36`, and a boss-leak rule (drains all integrity). Refresh the stale comments in `compile.ts` (geometry isn't `validate()`'s) and `compile.test.ts`.
- [x] **T105a** Combat: damage pipeline, armor/shields, targeting priorities, tower behaviors (Rivet hitscan, Thumper lead-targeting splash, Sprinkler chill aura).
- [x] **T105b** Waves: spawner (spawn intervals), early wave call (bonus formula per `docs/design/core-loop.md`), credits economy, build/upgrade/sell (misclick grace rule), core integrity, win/lose. Lift `createSim`'s config refusals as features land; credit bounties in `combat/damage.ts` `killEnemy` (settle youngling bounties per the docs); have the spawner set `hp` and `shieldHp`; add the clear-bonus formula (`20 + 4 × wave`) to `rules.ts` and point `data.test.ts`'s `TODO(T105b)` at it; expose the countdown state (the HUD shows the countdown and the early-call bonus) and a sim-side sell-value helper; settle whether `stats.creditsSpent` is gross (it is now) or net of refunds.
- [x] **T105c** Content data: towers Rivet, Thumper, Sprinkler (tiers 1–3); enemies Nibbler, Zoomer, Chonk. Sprinkler and Chonk are sim-tested but not used on A1M1. Add A1M1's `towerUnlockWave: { thumper: 3 }` once Thumper and the waves exist (D014), and delete the validator's `isStubMap` guard. Enemy traits need matching tells (Zoomer: `fast`; Chonk: `armored` with armor > 0).
- [ ] **T108a** Headless runner + `npm run sim` (A1M1 runs: par, do-nothing, `altBuilds.rivet_only`, alwaysCallEarly; the no-counter runner is built but unused until a map has required counters) composed in `tools/` + `src/balance/`; `runHeadless()` and the scripted-build executor go in `src/sim/headless.ts` (D013). The scripted-build executor buys each step as soon as it is affordable in its wave's build phase (D021). Also assert alwaysCallEarly *wins* (its upper bound can't fail on A1M1–A1M3).
- [x] **T104** Code-generated sprite pipeline (palette-indexed grids → textures, palette swaps, outlines) + sprite gallery dev page.
- [x] **T112** BattleScene: host loop (accumulator, 1×/2×/pause), pooled views, depth sorting, tile picking, range rings, pointer input → commands. Wire the sim-facing `__sd` hooks (`state`, `enqueue`, `fastForward`) to the live sim.
- [x] **T106** In-map HUD (Preact overlay), incl. 16×16 tower icons (`icon.tower.*` sprites): build menu, upgrade/sell panel, wave call, speed controls, credits/integrity/wave readouts, keyboard routing rule. Decide whether the armed tower stays armed after a build and after Esc.
- [x] **T113** Orbital Strike commander ability (cooldown, targeting, VFX; add the pooled `FxView`). Add the HUD ability slot (bottom-left); set A1M1's `technicianAbility: 'orbital_strike'` and add the par build's strike steps; register `icon.ability.orbital_strike` and drop the `icon.ability.*` carve-out in `content/types.ts`.
- [x] **T115** Minimal title screen and results screen (PESTS PROCESSED counter shown; no medals yet).
- [ ] **T107** A1M1 playable end to end per the M1 cut: briefing as static text, with no Bricks ally, Suppressing Fire, Crossfire link, or medals. Par build tuned to match. Tune the strike timing too (D022). Set `DEFAULT_MAP_ID` to `'a1_m01'` (D015) and implement `__sd.autoplay(build)`. HUD: use the sim's `sellValue()` (the HUD's own copy floors 0.7 × 180 to 125), and show the countdown and `callWaveBonus()` (D021). Write A1M1 par and `rivet_only` as **explicit step lists** in `docs/story/campaign/act1.md`. First-pass content moved the second Thumper to W7 and Rivet T2 to W2 (D019); tune both builds and keep act1.md's step table in sync.
- [ ] **T108b** Playwright smoke flows (boot, build, wave, win via `fastForward`, lose; assert enemy and projectile views appear). Move the results flows off `__sd.forceOutcome` onto `autoplay`, and assert a non-zero PESTS PROCESSED with screenshots, wired into `npm run check`.

- [ ] **T117** Art pass (any time; uses the gallery and the D010 art trail): tier-4 `spec_a`/`spec_b` tower frames (needed by T202), enemy death animations, Chonk scutes, Thumper NE muzzle. Also trim the art-direction §2/§3 hex tables to a link to `src/content/palettes/master.ts` (one home per fact).
- [ ] **T118** Docs, Design and Story owners: add the armed-tower rule (D018) to core-loop §4, and the results/title strings (D017) to style-guide §2.
- [ ] **T119** Add a display `name` to `TowerDef` and `EnemyDef`; the HUD derives labels from ids until then.
- [ ] **T120** Design docs: shrink the towers.md / enemies.md number columns to roles + target ranges with pointers to the content files (D019).
- [ ] **T121** `createSim` refuses loadouts that use attack kinds or statuses the towers system doesn't run yet (projectile/beam/chain/spawner; pinned/stasis/unnerved), per D013. Apply stat modifiers in `towers` once modifiers exist.
- [x] **T122** Render: a hitscan tracer and a Sprinkler pulse ring driven by `ProjectileFired` (shells and hit flashes are already drawn). Good fit with T113's `FxView`.
- [ ] **T123** Younglings: leaks cost 0 (`LEAK_FREE_TAGS`) and the ×0.5 speed (no M1 content uses them; needed before the first youngling map). Boss waves triple the clear bonus (with T304).
- [ ] **T116** Docs: shrink the map-script sketch in `docs/tech/story-runtime.md` to a link once script types land in `content/types.ts` (they partly duplicate it now). Low priority.

## M2 — Loadout, Upgrades & Meta Progression
- [ ] **T201** Loadout screen (pick up to 4 towers; skipped when you own ≤4 types and have no choice to make)
- [ ] **T202** Tier-4 specialization choice; adjacency links (incl. Crossfire); medals (in-map evaluation + results screen)
- [ ] **T203** Save system (localStorage plus export/import codes)
- [ ] **T204** Stardust and Intel currencies (medals → Intel payout); permanent upgrade shop (Zibzab) and R&D tree
- [ ] **T207** Companion slot + Suppressing Fire (ability slot 2 on key E); allies pool with the Bricks ally (never targets `quiet_wave`, `youngling`, or `fleeing` units)
- [ ] **T206** Hold Fire command, `spareRunners` filter (per tower + global Alt+H; new towers inherit the global toggle), and story-flag tracking (feeds choices)
- [ ] **T208** Counter-answer model: `rules.ts` answer entries `{tower, minTier?, spec?}`; the validator checks the tiers and specs a build reaches (air reach is proven by the harness). Docs gaps from M0 review round 3: Sproing [Big Bonk] in the towers §2.1 Splash row and the FIN no-splash build; Underfoot in A3M1 §4.8 vs enemies §3.1; A3M4 no-armor needs "no Seeker Swarm"; A3M2 no-splash needs "no Rivet Storm / Echo Spike"; conventions assertion #6 should name the full-catalog protocols; settle `youngling` as a wave modifier vs a `WaveTag`. Replace `COUNTER_ANSWERS` (tower lists) with `{tower, minTier?, spec?}` entries.
- [ ] **T205** Procedural audio: SFX first, then music layers

## M3 — Star Map & Act I
- [ ] **T301** Star map / campaign select screen
- [ ] **T302** Dialogue system (portraits, between-wave and in-map barks, choices)
- [ ] **T303** Codex/field journal
- [ ] **T305** Objective variants: Escort ("Evacuated" meter), Holdout, Protect; retry-from-wave checkpoints
- [ ] **T306** Character creation (name, pronouns), callsigns
- [ ] **T304** All Act I maps, enemies, and towers per `docs/story/campaign.md`

## M4 — Act II · M5 — Act III & Finale · M6 — Post-game & Polish
To be split up when we reach them. Known items:
- [ ] **T501** C4 Keep edge cases: the Technician can't equip an ability the companion provides (no double Time Dilation in the finale), and the Phase 2 lock must be phase-scoped and non-persisting (not `revokeAbility`), per D006.

## Backlog / Ideas
- HUD wave preview: the NEW badge and codex hint (needs saves, M2+); the callsign plate (T306)
- Touch/mobile input support
- GitHub Pages deploy workflow (once a GitHub remote exists)
- Accessibility: colorblind-safe enemy tells, remappable keys, reduced-motion mode
- Veteran modifiers, challenge maps, endless mode
