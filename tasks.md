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
**Status: done, shipped (D030); release `m1`.**
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
- [x] **T108a** Headless runner + `npm run sim` (A1M1 runs: par, do-nothing, `altBuilds.rivet_only`, alwaysCallEarly; the no-counter runner is built but unused until a map has required counters) composed in `tools/` + `src/balance/`; `runHeadless()` and the scripted-build executor go in `src/sim/headless.ts` (D013). The scripted-build executor buys each step as soon as it is affordable in its wave's build phase (D021). Also assert alwaysCallEarly *wins* (its upper bound can't fail on A1M1–A1M3).
- [x] **T104** Code-generated sprite pipeline (palette-indexed grids → textures, palette swaps, outlines) + sprite gallery dev page.
- [x] **T112** BattleScene: host loop (accumulator, 1×/2×/pause), pooled views, depth sorting, tile picking, range rings, pointer input → commands. Wire the sim-facing `__sd` hooks (`state`, `enqueue`, `fastForward`) to the live sim.
- [x] **T106** In-map HUD (Preact overlay), incl. 16×16 tower icons (`icon.tower.*` sprites): build menu, upgrade/sell panel, wave call, speed controls, credits/integrity/wave readouts, keyboard routing rule. Decide whether the armed tower stays armed after a build and after Esc.
- [x] **T113** Orbital Strike commander ability (cooldown, targeting, VFX; add the pooled `FxView`). Add the HUD ability slot (bottom-left); set A1M1's `technicianAbility: 'orbital_strike'` and add the par build's strike steps; register `icon.ability.orbital_strike` and drop the `icon.ability.*` carve-out in `content/types.ts`.
- [x] **T115** Minimal title screen and results screen (PESTS PROCESSED counter shown; no medals yet).
- [x] **T107** A1M1 playable end to end per the M1 cut: briefing as static text, with no Bricks ally, Suppressing Fire, Crossfire link, or medals. Par build tuned to match. Tune the strike timing too (D022). **The gate's `sim` step is red until this lands:** par and rivet_only both score 100, so check #8 (alt below par) fails; tune A1M1 so par lands near act1.md's 95 and rivet_only below it (D023). Drive `__sd.autoplay` with `createBuildExecutor`. Set `DEFAULT_MAP_ID` to `'a1_m01'` (D015) and implement `__sd.autoplay(build)`. HUD: use the sim's `sellValue()` (the HUD's own copy floors 0.7 × 180 to 125), and show the countdown and `callWaveBonus()` (D021). Write A1M1 par and `rivet_only` as **explicit step lists** in `docs/story/campaign/act1.md`. First-pass content moved the second Thumper to W7 and Rivet T2 to W2 (D019); tune both builds and keep act1.md's step table in sync.
- [x] **T108b** Playwright smoke flows (boot, build, wave, win via `fastForward`, lose; assert enemy and projectile views appear). Move the results flows off `__sd.forceOutcome` onto `autoplay`, and assert a non-zero PESTS PROCESSED with screenshots, wired into `npm run check`.

- [x] **T118** Docs, Design and Story owners: add the armed-tower rule (D018) to core-loop §4, and the results/title/briefing strings (D017, D024: "Shift briefing", "Clock in") to style-guide §2.
- [x] **T122** Render: a hitscan tracer and a Sprinkler pulse ring driven by `ProjectileFired` (shells and hit flashes are already drawn). Good fit with T113's `FxView`.
- [x] **T127** M1 review round 1 fixes (D026, D027): sim, UI, art, and balance fixers.
- [x] **T130** M1 review round 2 fixes (D028): UI and balance fixers.

## M2 — Loadout, Upgrades & Meta Progression
**Status: done, shipped (D063); release `m2`.**
- [x] **T121** (folded into T202b) `createSim` refuses loadouts that use attack kinds or statuses the towers system doesn't run yet (projectile/beam/chain/spawner; pinned/stasis/unnerved), per D013. Apply stat modifiers in `towers` once modifiers exist.
- [x] **T123** (absorbed by T206a; boss-wave clear bonus moved to T304) Younglings: leaks cost 0 (`LEAK_FREE_TAGS`) and the ×0.5 speed (no M1 content uses them; needed before the first youngling map). Boss waves triple the clear bonus (with T304).
- [x] **T124** Harness follow-ups (the `BuildsDef` expectations and the maps.md §6.1 pointers are done, D027): add a per-tower damage tally (e.g. `damage` on `ProjectileHit`) so the report shows DPS per tower; switch `src/sim/a1m1.test.ts`'s mini-executor to `runHeadless`.
- [x] **T125** (with T124, wave 5) Balance: A1M1 gets the companion, ally marker, and Teamwork medal; when T202 re-tunes A1M1 (links, Bricks), keep `src/balance/a1m1.test.ts` green; rivet_only sits on its 40% floor at a −0.2 s clump shift (D027). Add a threat-intel strip to the briefing once trait icons exist.
- [x] **T126** Accessibility: keyboard-only building and selecting (a tile cursor: arrows hop between pads and towers, Enter builds/selects). Also reposition the tower panel so it doesn't cover neighbouring towers.
- [x] **T128** Story: canonise the Thumper unlock radio line ("New hardware! Thumper Mortar, ready to deploy!") in act1.md § A1M1, or replace it with a canon line and drop its exemption in `tools/radioLines.test.ts`. Polish: phase-sync the 1 Hz HUD slot and pad pulses; a clearer low-integrity core frame (ART).
- [x] **T129** (folded into T200) Cleanup: `sim/config.ts` duplicates `MAX_LOADOUT` from rules.ts.
- [x] **T212** Menus polish: Esc closes Settings and the Title panels; art-direction §9 describes the M2 menus (Shift board, Base, Settings, slot list, import).
- [x] **T214** Move `NOT_FIRING_SEC` and `YOUNGLING_SPEED_MUL` (TODOs in sim) into `content/rules.ts`.
- [x] **T219** UI text: the body font at small sizes renders "5" like "S" and "fi" oddly (R&D: "radius 1.S", "-1S%", "Ales"). Switch body text to Silkscreen or fix the glyphs (D054). Also: architecture.md's Base section still says placeholders; art-direction §9 needs the shelf-row spec; add a dev save with the shop open and items left to buy.
- [x] **T220** Results offers "Change loadout" before a retry (when the loadout system is open).
- [x] **T227** M2 review round 1 fixes (D059): CORE, UI, ART, STORY+BAL fixers.
- [x] **T231** M2 review round 2 (verify round-1 fixes and seams) (D061).
- [x] **T233** M2 review round 2 fixes (D061).

M2 cut and plan: `docs/decisions.md` D031. Waves of ≤3 agents: W1 T200·T203a·T205 → W2 T202a·T207a·T209 → W3 T202c·T204a·T208 → W4 T202b·T204b·T210a → W5 T206a·T204c·T125 → W6 T210b·T207b·T117a → W7 T202d·T201·T210c → W8 T206b·T206c·T204d → fillers.

- [x] **T200** Sim seams: widen `Modifier` (ability cooldown/radius, cost, refund, bounty, link bonus, leak absorb); `SimConfig.specsUnlocked`; declare every M2 command and event (stubs reject); entity, ally, and stat fields; stub `links` and `allies` in tick order; split refusals per feature; fold in T129.
- [x] **T203a** Save core: `src/meta/` KeyValueStore, SaveData v1 (`profile: null`), migrations, validateSave, `:bak`, the SD1 export/import codec with caps; a new save grants Orbital Strike.
- [x] **T205** Procedural audio: SFX first, then music layers.
- [x] **T202a** Stacking formula and caps; apply the tile bonuses (high ground, power node); links (Crossfire, Sitting Ducks, `vsStatus`); tower and economy modifiers; modifier-aware `towerStats`.
- [x] **T207a** Ability slot 2 + Suppressing Fire (segment = clicked path tile ±1); the allies system (Bricks never targets `quiet_wave`/`youngling`/`fleeing`); Mk II and Rapport modifiers.
- [x] **T209** Flow shell: Title (new / continue / import), slots, Shift board, Base tabs, Settings (codes, difficulty); the battle config built from the save; `?save=<fixture>` dev hook.
- [x] **T202c** Condition evaluator (medals, trigger `when` incl. flags); Victory / Perfect Core / Challenge medals; `passedMarker`; the medal validator.
- [x] **T204a** Catalog data (tune-ups, global upgrades, 10 protocols, R&D, `availableAfter`); campaign order; the par-purchasable check.
- [x] **T208** Counter-answer model: `rules.ts` answer entries `{tower, minTier?, spec?}`; the validator checks the tiers and specs a build reaches. M0 doc gaps: Sproing [Big Bonk] in the towers §2.1 Splash row and the FIN no-splash build; Underfoot in A3M1 §4.8 vs enemies §3.1; A3M4 no-armor needs "no Seeker Swarm"; A3M2 no-splash needs "no Rivet Storm / Echo Spike"; conventions assertion #6 should name the full-catalog protocols; `youngling` stays a `WaveTag`.
- [x] **T202b** `specialize` command; Rivet and Thumper tier-4 specs (gated); fold in T121.
- [x] **T210a** Art: Brood Hauler (`carrier` tell, sack burst, scurrying young), power-node and high-ground tiles, Bricks's post, link tether.
- [x] **T206a** Hold Fire + spare runners (global inherit); per-tag stats; youngling leak 0 and ×0.5 speed (absorbs T123); `holdFireWhile` / `spareFleeing` harness variants.
- [x] **T204c** Run end (meta-runtime order); rewards (progression §2: defeat share, replays, already-won pays 0); medals → Intel; Results shows rewards and the lifetime Pests Processed.
- [x] **T207b** HUD ability slot 2 (E, path-segment aiming); AllyView.
- [x] **T210b** Brood Hauler data + A1M2 (layout, 8 waves, medals, `pump_station` marker, par, `no_armor`, alt builds); tune.
- [x] **T117a** Spec frames, Thumper NE muzzle, explosion punch, Bricks's cannon-lowered frame; trim the art-direction hex tables (part of T117). The gallery page is 14,897 px tall, close to Chrome's 16,384 px screenshot limit: paginate the gallery or the art-trail capture so `m2.png` stays complete.
- [x] **T202d** TowerView: use base frames `spec_a`/`spec_b` at tier 4 and the `_t2`/`_spec_<a|b>` heads, lift towers on high ground 8 px, and fix PlacementView's highlight under the block; set Cluster Thumper bomblets' `projectile` to `projectile.thumper_bomblet` (+ `fx.bomblet_burst`). HUD: link tethers; panel shows links, tile bonus, and modified stats; the T4 choice (locked + price); briefing shows medals and the threat-intel strip.
- [x] **T201** Loadout screen (pick up to 4 towers + ability; skipped when you own ≤4 types; last preset; Change loadout). Gated until A1M4.
- [x] **T206b** `content/dialogue/flags.ts` + run-end rules; `src/story/flags.ts`; save → `scriptFlags`.
- [x] **T206c** HUD Hold Fire (H, Shift+H, an "all" button); Alt+H hidden until A2M1. Also wire the radio's `enemyKilled` trigger (`app/radio.ts` `EnemyDied` case: one line; A1M2's two Hauler barks use it) and list it in architecture §4.
- [x] **T204d** R&D and Shop screens: buy, availability, locked panes.

## M3 — Star Map & Act I
**Status: current (started 2026-11-09; scope cut and plan in progress).** Carried over from M2:
- [x] **T117** Art pass (any time; uses the gallery and the D010 art trail): tier-4 `spec_a`/`spec_b` tower frames (needed by T202), enemy death animations, Chonk scutes, Thumper NE muzzle. Make W7's big clumps read as separate bugs (lateral offset or spacing) and give Thumper's shell explosion more punch (D024). Also trim the art-direction §2/§3 hex tables to a link to `src/content/palettes/master.ts` (one home per fact).
- [x] **T119** Add a display `name` to `TowerDef` and `EnemyDef`; the HUD derives labels from ids until then.
- [x] **T120** Design docs: shrink the towers.md / enemies.md number columns to roles + target ranges with pointers to the content files (D019).
- [x] **T211** Audio follow-ups: Kip's own radio blip (he borrows Goldie's); an armor "plink" (needs a reduced-damage flag on `ProjectileHit`); sounds for links, allies, Hold Fire, and medals as those land; Act II/III themes and the other six "Everglow Bright" cue variants (M4+); an `icon.ui.sound` sprite to replace the SVG glyph.
- [x] **T213** HUD polish from T126: the aim hint says "Enter fires" when the cursor shows (style-guide wording); the panel's "Next:" line clips "+3 pierce"; the panel avoids the HUD corners.
- [x] **T215** Specs follow-ups: the headless executor runs `specialize` steps (it refuses them today); `validate.ts` checks bomblet sprite ids.
- [ ] **T216** Allies polish: a glow halo for AllyView; the companion portrait on slot 2 (M3, with portraits); check in the UX review that the suppression tracers are juicy enough.
- [x] **T217** Docs: stale "T125" references in architecture.md (lines ~14, ~162), meta-runtime.md (~145), maps.md (~262), and comments in `hud.test.ts` / `devBattle.ts`.
- [x] **T218** `meta/validate.ts` checks each saved flag's value against the flag's declared values (any id-shaped string passes today).
- [x] **T221** HUD follow-ups from T202d: the tall tier-3 panel can cover a neighbouring tower on busy maps; upgrade rings draw at ground level for towers on high ground; tower fire anims (`fire_<facing>_t2`, spec spin) aren't played yet; a flat-to-high-ground tether ends a few px low; add T202d's new HUD copy to style-guide §2.
- [x] **T222** Silkscreen draws "&" like "$" (the R&D tab reads "R$D"): rename the tab to "R and D" / "Research" or fix the glyph. Add the Hold Fire / spare-runners HUD copy to style-guide §2. A dev save with the shop open and items left to buy.
- [x] **T223** Terrace and cliff tiles (A1M2's three terraces; real mid-darks in the playfield) — M3.
- [x] **T224** A1M3's par target ≤ 90 so the monotonic chain resumes after A1M2's 100 — with A1M3 (M3).
- [x] **T225** Split the oversized files: `app/hud.ts` (~1,050 lines) → hudText/hudViews/hudBind; `ui/hud/index.tsx` by component; `FxView` (strike/segment vs pooled effects); `BattleScene`; `balance/checks.ts`.
- [ ] **T226** Make Sitting Ducks or the power node decide a leak in at least one A1M2 alt (today the Sprinkler's 0.7 DPS makes them decoration).
- [x] **T228** Make the R&D pick (Mk II vs Rapport) change a result from A1M3 on (strike-shaped clumps on a short route; a Suppressing Fire-limited wave) (D060).
- [ ] **T229** Revisit the never-spend player's W7–W8 wall on A1M2 alongside A1M3's curve; consider an earlier, louder bank nudge or a W6 warning wave (D060).
- [x] **T230** Peeker sprite (A2M3's clickable rock; no sprite yet).
- [ ] **T232** Suppressing Fire's striped zone draws in `overlay` and covers towers next to the path; depth-sort it under towers (M3).
- [x] **T234** Apply `silkText` in the view-model builders (medalViews, specChoice, selectedView, loadoutView) and fix architecture.md's claim; remove the remaining per-frame allocations (BattleScene ghost label, `sellValue` in selectedView, LinkView's Map iterator); `Object.hasOwn` for DECOR_MARKERS/LINK_CALLOUT; dedupe `towerLabel`/`displayName`; headlessTracker reads `state.maxIntegrity`.
- [x] **T235** Results polish: Career total counts up with PESTS PROCESSED; mark the first Stardust payday and show the "Banked for Zibzab's shop" note once; build floaters don't overlap link callouts; a compact Results layout before more rows land (M3).
- [x] **T116** Docs: shrink the map-script sketch in `docs/tech/story-runtime.md` to a link once script types land in `content/types.ts` (they partly duplicate it now). Low priority.
- [ ] **T204b** `meta/modifiers` + pools (incl. Story difficulty); profiles through them; harness checks #5, #6 (full catalog), and #9 (Story).
- [ ] **T210c** Story: A1M2 radio lines verbatim; Zibzab and QUILL item copy (≤100 chars); settle T128's line.

M3 cut and plan: `docs/decisions.md` D064. Waves (≤ 4 agents): W1 T225·T300a·T300b·T310a → W2 T304a·T304c·T302a·T311a → W3 T304b·T304d·T313·T306 → W4 T304e·T302b·T312a·T311b → W5 T304f·T302c·T308·T312c → W6 T304g·T303·T312b·T310b → W7 T316·T314·T309·T311c → W8 T315·T317, then review. Housekeeping: T204b and T210c landed in D045/D048.

- [x] **T300a** Sim and content seams (folds in T119):
  - commands: `clear`;
  - events: `BossPhase`, `BossEnded`, `WreckageCleared`, `NeutralHit`, `ProjectileHit.reduced`;
  - fields and stats: burrow, split, huddle, boss, neutral, wreckage, discount charges, wave-count cooldowns, `neutralHits`, `wreckageCleared`, `lateSells`, `MapDef.objectives`;
  - stub systems in the tick order (`enemyAbilities/`, `wreckage.ts`, `attacks/chain.ts`);
  - data stubs with final sprite ids; `gates.ts` rows.
  A1M1/A1M2 must stay hash-identical.
- [x] **T300b** Story and save seams (folds in T218, T116): `dialogue/types.ts` (1:1 with style-guide §5), `speakers.ts`, empty scene and bark files per map, the codex and memo registries, `src/story/` stubs, SaveData v2 (profile, seen scenes, memos, codex, seen enemies, `bricksTagIndex`, protocols) with the migration from v1, dev saves `after_a1m3`/`4`/`5`.
- [x] **T225** Split the oversized files (+ T234).
- [x] **T302a** Pure story runtime: the runner, tokens, conditions, bark selection, `tags.ts`, `counter.ts`, `validateDialogue` (lengths, `{name}`, the policy tell, the `!` budget).
- [x] **T302b** Dialogue UI: the comms panel with portrait, scenes (pause, typewriter), choices, the bark button, full-screen scenes, the briefing as a scene; `app/dialogue.ts` replaces `radio.ts`.
- [x] **T302c** Migrate the A1M1–A1M2 radio verbatim; A1M1's briefing choice, the callsign, the Goldie/Kip variants, "You sold Denise".
- [x] **T303** Codex and the Everglow Inbox (Act I): logic, originals and memo bodies, the Base tabs, small print, gifts, the NEW badge.
- [x] **T304a** Air lanes and air targeting; Puffwing; Skyhook T1–3; Gerald (neutral).
- [x] **T304b** Zapcoil chain; Conductive (+ a minimal Soaked); `clear` and the drone queue; the hidden node; salvage gates.
- [x] **T304c** Split, huddle, burrow; Chitterbloom's phases and `driveOff`; a boss leak drains integrity; the boss clear bonus ×3; boss triggers.
- [x] **T304d** Time Dilation; Clearance Sale; lift the `firstBuildFree`/`freeCast` gates.
- [x] **T313** Harness: placement-aware answers (T307), `specialize` steps (T215), `clear` steps, Gerald's hold-fire macro, R&D-pick variants (T228), the gate-time budget.
- [x] **T304e** A1M3 (par ≤ 90, T224; Mk II decides a result, T228; Return to Sender; the knock-knock; Zibzab).
- [x] **T304f** A1M4 (the Clean Audit objective; ≥ 2 alts).
- [x] **T304g** A1M5 (the boss; second spawn; the Quiet Wave with check #16 live; Cluster par; party and stinger scenes; Bricks's Rapport matters).
- [x] **T306** Character creation: intake, editing in Settings, `arrival_reason`, the intake on Continue for v1 saves.
- [ ] **T308** The shop opens: the Zapcoil sample, the early-ask scene, QUILL's Rapport, protocol slots in the loadout and battle setup.
- [ ] **T312a** Render: Time Dilation's tint while a `field` zone lives; the flak burst fx; air altitude and shadows, the dotted lane, flak/chain FX, Gerald, Time Dilation's tint, wreckage and the drone, the clear intent.
- [x] **T312b** Render: hook the Peeker's `planter` cover on A1M4 (`peekerFrame('planter', …)`); WreckageView passes `terraces`; draw `enemy.youngling` for `youngling`-tagged units and play the Digger's `dig_<facing>` tell; burrow, split, huddle, the boss bar and phases, `driveOff`, props on cues, T232.
- [x] **T312c** HUD: price builds/upgrades/specs with `purchasePriceInto` (Clearance Sale, Rapid Deploy) instead of `costFor` in commands/hudViews/hudPanel/loadout; `abilityReady`/`freeCastReady` for slot states; slot-2 charges, the Hold Fire pulse, route flags and NEW, the callsign plate, the objective tracker; T216, T213, T221, T222.
- [x] **T316** Results and flow: the Containment Lapse stamp, objective Intel, the debrief, party → Results → stinger, a pause menu (Retry/Quit); T235.
- [x] **T310a** Portraits: the player, Bricks, QUILL (`policy`, `party_hat`), Sterling.
- [x] **T310b** Portraits: Zibzab, Goldie, Kip, Prim; Gerald's icon.
- [x] **T311a** Sprites: Skyhook, Zapcoil, Puffwing, Bunchling, Elder, Digger, youngling, Gerald, the Peeker (T230), new tells.
- [ ] **T318** Later-act portrait variants: Bricks `pebble`, QUILL `purge`, player `reflect_violet`/`reflect_pebble`, Goldie `act3`, Kip `act2`/`act3` (dialogue falls back to base frames until then) — with their acts (M4/M5).
- [ ] **T319** Counter-answers via specs require authored spec content (loadout currently suggests "Skyhook (Seeker Swarm)" from the `all_unlocked` dev save's M4 specs) (D072).
- [ ] **T320** Inbox follow-ups (from T303's hand-back).
- [ ] **T321** Sprinkler T3 Soak data.
- [ ] **T322** Peeker polish.
- [ ] **T323** Audio follow-ups: delete `src/audio/sfx/radio.ts` (needs the owner's OK; an agent's delete was refused), restore storm headroom (−1.1 dB, only 0.2 dB margin), the `testHookTypes` `render()` comment.
- [ ] **T324** Dialogue cleanup: `MapDef.briefing`, `briefingLines`, the name-tag plate.
- [ ] **T325** A1M3 dialogue gaps: no `a1_m03_debrief` scene (the other maps have one with a `lost` branch); then add `a1_m03` and `a1_m04` to `COMPLETE` in `tools/dialogueCanon.test.ts`.
- [ ] **T326** HUD leftovers: spawn flags, the slot-2 portrait, an objective-tracker smoke; switch `hud.ts` to `objectiveStatusById(state, map)` (D090).
- [ ] **T327** `skipScene` transcript bug; `saveModifiers` ignores protocols.
- [x] **T328** Render follow-ups from T312b: enemy health bars; the tell-glyph timer on sim ticks (D094).
- [ ] **T329** Results follow-ups from T316: full-screen scenes outside the debrief can't read `thisRun`/`outcome` (`storyContext.run` is null); the counter's `aria-label` on a `<p>` (fix with `m1.spec`); a confirm step before Retry/Quit if playtests show misclicks. Debrief choices on Results land with A2M4 (C2).
- [ ] **T330** A1M5 follow-ups from T304g: `BarkTrigger` `not_firing` has no wave filter, so holding fire earlier spends Bricks's W10 line; the briefing can't list "Boss" as threat intel (campaign.md §4.8; `boss` isn't a `Trait`: add one with TRAIT_COUNTER/TRAIT_TELL or change the doc).
- [~] **T331** (high) The Shift board stops at A1M2 (`SHIFT_BOARD_SIZE = 2` from the M2 cut): size from the registered campaign, real map names in unlock hints, a smoke step past A1M2 in normal flow; Engineering's deferred-spec copy → "Arrives in a later shipment" (D064); stale comments in validateBuilds/devSaves; `jamLimit` → M5.
- [ ] **T332** Render follow-ups: the tell glyph also shows on hover (art-direction §8; enemy hover now exists); an app-owned `__sd` render-state hook (bar shown, ally lowered) so smoke can assert render beats, not only screenshot them; test-only fast-forward piles floaters/callouts into one frame; `?map=` + `autoplay('par')` runs without the harness's reference profile (Reinforced Core, spec unlock, R&D), so it can't reproduce par (A1M5's W8 Cluster specialize is refused).
- [x] **T311b** Sprites: Chitterbloom, wreckage, the drone.
- [x] **T311c** Props for A1M3–A1M5 (incl. the Peeker's per-map covers); terraces and cliffs (T223); death animations, scutes, clump separation (T117).
- [x] **T309** The Peeker (`prop.peeker`: frames hidden/peek_0/peek_1/duck): view + click sets `peeker_poked`.
- [x] **T314** Audio (T211): new sounds, per-speaker blips, the typewriter, the plink.
- [~] **T315** Act I curve pass: Story difficulty everywhere; T226, T229; the T228 verdict; A1M4: move par's margin off the W1 Zoomer rush into the late waves and spend its ~1,400 unspent credits (D090); A1M5 runs ~9.7 min at 1× against Act I's 6–9 min (trim the `OPEN` delays, D092); add `a1_m05` to `COMPLETE` in `tools/dialogueCanon.test.ts`.
- [x] **T317** Docs: T217, T120, as-built tables; maps.md §4 "air lanes also show while an armed tower hits air"; enemies.md §3.1 + architecture § Validation mention placement-aware answers (D079); conventions open question 1 records sim timing.

## M4 — Act II · M5 — Act III & Finale · M6 — Post-game & Polish
To be split up when we reach them. Known items:
- [ ] **T501** C4 Keep edge cases: the Technician can't equip an ability the companion provides (no double Time Dilation in the finale), and the Phase 2 lock must be phase-scoped and non-persisting (not `revokeAbility`), per D006.

## Backlog / Ideas
- HUD wave preview: the NEW badge and codex hint (needs saves, M2+); the callsign plate (T306)
- Touch/mobile input support
- GitHub Pages deploy workflow (once a GitHub remote exists)
- Accessibility: colorblind-safe enemy tells, remappable keys, reduced-motion mode
- Veteran modifiers, challenge maps, endless mode
