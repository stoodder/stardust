# Story Runtime

How the story runs in code: map scripts (story moments that change play, inside the sim), and `src/story/` (dialogue, conditions, flags, text tokens, barks, and the other story systems). The module layout and the sim are in [architecture.md](architecture.md); content data shapes are in [`src/content/types.ts`](../../src/content/types.ts) ([architecture.md § Data shapes](architecture.md#data-shapes)). Saves and the meta-side story transactions are in [meta-runtime.md](meta-runtime.md).

The authoring format and voice rules are owned by [story/style-guide.md](../story/style-guide.md); the TS types in `content/dialogue/types.ts` must map one-to-one onto its §5. The design homes for the systems below are in [design/core-loop.md §6](../design/core-loop.md#6-story-facing-systems).

**Not in M1.** M1 uses only the `unlockTowerClass` action (compiled from `towerUnlockWave`); A1M1's briefing is static text ([architecture.md, M1 subset](architecture.md#architecture)).

**Built so far.** The flag registry, its run-end rules, and `scriptFlags` from the save ([§ Flags](#flags), T206b). The M3 seams (T300b): the dialogue, codex, and memo data shapes and their registries (all still empty), the speaker registry, the profile data, and `src/story/` stubs for the runner, conditions, text, barks, the codex, and the Inbox, which throw "not implemented" and name the task that builds each (T302a; T303 for the codex and the Inbox).

---

## Map scripts (story-driven sim changes)

Story moments that change play run **inside the sim** as map data, so headless runs, replays, and the balance harness see exactly what a player sees ([design/maps.md §5.3](../design/maps.md#53-map-scripts)). The `triggers` system ([architecture.md § Entity model](architecture.md#entity-model-typed-pools-not-an-ecs)) evaluates them. Dialogue stays in `story/`; the sim only emits `ScriptCue` ids.

The types are `ScriptedEvent`, `ScriptTrigger`, and `ScriptAction` in [`src/content/types.ts`](../../src/content/types.ts), each trigger and action documented there. An event fires at most once per run unless it sets `once: false`. A trigger `{ wave, phase: 'countdown' }` fires as that wave's build-phase countdown begins (W1's is the pre-game build phase). An action `{ cue }` is a scene or bark id that story plays; `revokeAbility` serves A3M2's Orbital Strike and, under C4 Keep, the finale's Time Dilation for Phase 2; `setObjective` is the A2M5 pivot; `setLighting` sets darkness in the sim for render to read; `checkpoint` marks the finale's Phase 2 start ([architecture.md § Checkpoints](architecture.md#checkpoints)); `openTile` targets a predefined decor marker; and `endMap` ends a Holdout as `'completed'`. Revocation, forced input, and clickable objects are described below.

`towerUnlockWave: { [towerId]: N }` in map data compiles to `{ on: { wave: N, phase: 'countdown' }, actions: [{ unlockTowerClass: towerId }] }` (A1M1: `{ thumper: 3 }`).

- **Cue ids** follow `<map_id>_wNN` for wave-bound cues (`a1_m01_w03`), and the other `<map_id>_<slot>` forms from [story/style-guide.md](../story/style-guide.md) for the rest. Validation checks the pattern.
- **`when`** is judged once, on the tick its event's trigger is reached ([§ Conditions](#conditions)). If it doesn't hold then, the event is spent without running; it never waits for the condition to come true.
- **Flags in the sim.** `SimConfig.scriptFlags` carries the story flags a map's scripts and setup may read (`ScriptFlagId`: the registry's flags marked `script: true`, now `door_choice`, `spared_quiet_wave`, `stardust_choice`, `quill_choice`), copied from the save by `app/battleSetup.ts` with `scriptFlagsOf` (only flags that are set; defaults never reach the sim). `ConditionDef` tests them with `{ flag, eq }` ([`src/content/types.ts`](../../src/content/types.ts)). The sim never sets flags; story derives flags from `state.stats` when the run ends ([§ Flags](#flags)). C4's in-play effects are flag-conditioned map data (events, modifiers, and `lockedAbilities`); the rules are in [design/core-loop.md](../design/core-loop.md) §6.11.
- **Forced input.** `forceInput` sets `state.pendingInput`. While it is set, the wave schedule, movement, firing, cooldowns, and timers are frozen. The sim still ticks (so render can animate and `tick` stays monotonic), and `applyCommands` accepts only `{ type: 'scriptInput', id }`. The host shows the single-button overlay on `ForcedInputRequested`. Real-time lines (Bricks's line after 20 s on the SEAL) are a story-side timer on wall-clock time, not sim ticks. The balance harness presses it with a `scriptInput` build step.
- **Clickable world objects.** `setClickable` marks a marker (for example `peeker` in A2M3) as clickable and emits `ClickableChanged`; render highlights it ([art-direction.md §6](../art/art-direction.md#6-story-and-world-sprites)). An `interact` command (valid only while the marker is clickable), or the `fallback` trigger if the player never clicks, fires the `interacted` trigger once and emits `Interacted { by }`. Pebble's A2M3 rescue is built this way, with "W6 cleared" as its fallback. Clicks that change nothing in the sim (poking the Peeker in Act I) are UI events instead (`peeker_poked`, [§ Flags](#flags)).
- **Revocation** selects the class deterministically (most credits invested, then most towers placed, then loadout slot; [design/towers.md §9](../design/towers.md#9-rules-for-story-driven-tower-changes)), sells every tower of it at 100%, adds it to `state.revoked`, and emits `TowerClassRevoked`. Meta copies `revoked` into the save at run end.
- **Rest and scatter** (finale, [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)): when a Hollow unit dies, `cleanup` checks it against every active song zone (squared distance). Inside: `EnemyLaidToRest`, `restPoints += restValue × songMult`. Outside, and if the map's song is active and the unit hasn't re-formed before: it becomes a `reforming` enemy (untargetable, drifting back along its route) and returns at 50% HP after the delay. The song's passive trickle adds rest points every tick. The modifiers by flag come from `MapDef.song`.
- **Bricks in A3M3.** His health bar follows `allies[].healthTimeline` (per-wave percentages in map data), so it drains on a scripted schedule whatever the player builds, and reaches its floor near the end. Results-screen medal toasts are held on that map (a presentation override), so the SEAL plays the same at any score.

---

## Dialogue runner

A pure state machine over dialogue data (`src/story/runner.ts`): `start(scene, ctx) → cursor`, `advance(cursor, ctx, choiceIndex?)`. A cursor rests on a line, a choice, or the end; `branch` and `set` nodes run on the way, and the effects (flags set, the callsign) ride on the cursor for meta to save.

**The data shapes** are [`src/content/dialogue/types.ts`](../../src/content/dialogue/types.ts), one-to-one with [style-guide §5](../story/style-guide.md#5-dialogue-format-conventions): `Scene` (an id and its nodes, with an optional `when`), the node kinds `line` (speaker, expression, text, `durationSec`, an optional reply `button`), `choice` (2–3 options, each with `text`, `tone`, the flags it `set`s, `goto`, and `remember`), `branch` (`cond`, `then`, `else`), `set` (a flag and one of its declared values, or the callsign), and `end`; `Bark`, `BarkTrigger`, `Condition`, and the token and glyph ids. The types make a bad speaker, a bad expression for a speaker, or a flag value outside its declaration a compile error.
- **Labels.** Any node may carry a `label`; `goto`, `then`, and `else` name a label in the same scene. A choice option without `goto`, and a branch without `else`, continue with the next node.
- **Files.** Each map's scenes and map-scoped barks are `content/dialogue/a<act>/<map_id>/scenes.ts` and `barks.ts`, listed once in `content/dialogue/index.ts` (`MAP_DIALOGUE`, with `SCENES` and `BARKS` by id). Barks that can fire on several maps go in `content/dialogue/barks/<trigger>.ts` (`SHARED_BARKS`), each gated by its `when`.
- **What plays a scene** is its id's slot (`<map_id>_<slot>`, [style-guide §5.3](../story/style-guide.md#53-ids)): `brief` (the briefing), `w<NN>` (the radio as wave NN's countdown begins), `cue_<name>` (a map script `{ cue }` with the scene's id), `debrief` (after Results), `scene_<name>` (a full-screen scene the flow or a cue plays), and `base_<name>` (a base conversation topic, such as A1M3's early ask).
- **Speakers** are the ids in [style-guide §5.1](../story/style-guide.md#51-speaker-ids), registered in [`content/dialogue/speakers.ts`](../../src/content/dialogue/speakers.ts) with the name plate, its color, the typewriter's blip (`blip.<speaker>`, authored by audio), the frame (`portrait`; `icon` for Gerald; and for portrait-less speakers their text style: `pa`, `form` for `kfa`, `distorted` for `hollow`, `caption` for `narrator`, `ui` for `system`), and the portrait sprite.
- **Portraits** are one sprite per speaker, `portrait.<speaker>` (`src/content/sprites/portraits/`). Its frames are `[<variant>.]<expression>[_talk]` (`neutral`, `neutral_talk`, `party_hat.policy`), with QUILL's `policy_flash` for the tell; the portrait list is in [art-direction.md § Portrait roster](../art/art-direction.md#portrait-roster).
- **Expressions:** the five base expressions plus per-speaker extras (`EXPRESSION_EXTRAS`: `quill.policy`, `pebble.singing`, each with the base expression art falls back to). A line naming no expression uses `neutral`; speakers with no portrait (and Gerald) take none.
- **Portrait variants** are chosen by rules, not by lines: `speakers.ts` lists, per speaker, `{ variant, when: Condition }` in priority order, and the first that holds wins (for example `vesthara`: `touched_deep` in Act III, `touched` from A2M5; `bricks`: `pebble` from A2M3; `quill`: `purge` under `quill_choice = purge`, `party_hat` on A1M5). The finale's `dawn` and Bricks's `dark` (the derived bake, for an absent speaker) are not rules.
- **Silence:** a `line` with `text: ''` shows the speaker's frame (dark for Bricks after A3M3) for `durationSec`, with no text and no typing sound.

## Conditions

Story conditions are data, not strings (`Condition` in [`content/dialogue/types.ts`](../../src/content/dialogue/types.ts), evaluated by `story/conditions.ts` over a `StoryContext`: the flags, the map the story is about, the lifetime counter, and the run that just ended): `{ flag, eq }` (the flag's value, or its default while unset), `{ act }`, `{ mapAtLeast }`, `{ mapIs }` (campaign map ids, built or not; order from `content/campaign.ts`), `{ stat: 'pestsProcessed', gte }`, `{ all: [...] }`, `{ any: [...] }`, `{ not: … }`, and two that read the run that just ended, so they hold only in a debrief, on Results, and in run-end barks: `{ outcome: 'won' | 'lost' }` and `{ thisRun: <boolean flag>, eq }` (the value that flag's run-end rule gives over this run, set or not; C1's lines read *this run*, its payoffs the flag).

**In-map conditions** (the Challenge medal, optional objectives, and script `when` guards) use the sim's `ConditionDef` ([`src/content/types.ts`](../../src/content/types.ts)), evaluated by `src/sim/conditions.ts` over run state. Its atoms, by when they are judged ([design/progression.md §3](../design/progression.md#3-medals-and-intel), "Evaluation"):

| Atom | Reads | Judged |
|---|---|---|
| `{ towers: { tower?, faction? }, gte?, lte? }` | Live towers of that tower id or faction (all towers if neither) | As things stand (a medal's on the win tick) |
| `{ linkActive: LinkId }` | At least one pair of that synergy link is active | As things stand |
| `{ tagRatio: { tag, of: 'leaked' \| 'killed', gte } }` | That tag's leaked or killed units ÷ its spawned units (false when none spawned) | As things stand |
| `{ stat: RunStat, gte?, lte? }` | A run counter (`integrityLost`, `towersBuilt`, `creditsSpent`, `abilityUses`); counters only grow | Over the run |
| `{ passedMarker: { marker, enemy? } }` | A unit of `enemy` (any enemy if omitted) went past the marker at some point: its route distance passed the route point closest to the marker (the later one where a route doubles back). Medal-exempt units never count. Latched each tick in `stats.markersPassed` | Over the run |
| `{ flag, eq }` | `SimConfig.scriptFlags`; an unset flag never matches | Fixed for the run |
| `{ all }`, `{ any }`, `{ not }` | Combinators | — |

A condition **settles** once the rest of the run can't change it (`settledCondition`): a flag at once, a `stat` past its `lte` (false) or at its `gte` with no `lte` (true), a `passedMarker` once passed (true), and the combinators by three-valued logic. State atoms stay open until judged. That is how a Challenge such as A1M2's "no Brood Hauler gets past the pump station" (`{ not: { passedMarker: { marker: 'pump_station', enemy: 'hauler' } } }`) is forfeited the moment one does ([architecture.md § Medals](architecture.md#medals)). The validator's rules for conditions and medals are in [`src/content/validateMedals.ts`](../../src/content/validateMedals.ts).

## Flags

Flags are declared in `content/dialogue/flags.ts` (`FLAGS`): each with its `values` (a boolean flag lists `true` and `false`; a choice lists its ids, such as `'convoy'`, `'warren'`), a `default`, an optional `script: true`, and a one-line description. `FlagId` and `ScriptFlagId` (`content/types.ts`) are derived from it, so a typo'd flag is a compile error, and a map's `flagVariants` may list only that flag's values. The registry is exactly the canonical flag table, [story/campaign.md](../story/campaign.md) §6.2, in its order and with its values (`tools/flagLedger.test.ts` checks it; the bible's table is a summary).

- **Defaults** are what story reads while a flag is unset (`flagValue` in `src/story/flags.ts`): `false` for a boolean (not done yet), `null` for a choice not made yet. The sim never sees a default ([§ Map scripts](#map-scripts-story-driven-sim-changes)).
- **Who sets them:** the intake (`arrival_reason`, T306), `choice`/`set` nodes, UI events (`peeker_poked`, `asked_zibzab_early`, optional bark buttons), or **run-end rules**.
- **Saves** hold `story.flags` keyed by `FlagId`, each value one of the flag's declared `values` ([meta-runtime.md § Validation](meta-runtime.md#validation)).

**Run-end rules** (`FLAG_RULES` in `content/dialogue/flags.ts`) derive a boolean flag from the finished run's `state.stats` when a map ends:

```ts
{ flag: 'spared_quiet_wave', onMapEnd: 'a1_m05',
  value: { tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0.75 } } },          // design/core-loop.md §2.7
{ flag: 'held_fire_second_look', onMapEnd: 'a2_m03',
  value: { all: [{ tagRatio: { tag: 'fleeing', of: 'leaked', gte: 0.5 } },
                 { stat: 'holdFireUses', gte: 1 }] } },                          // plain Hold Fire only
```

- **The grammar** (`FlagRuleCondition`) is the sim's condition atoms that make sense after a run: `tagRatio` (leaked or killed ÷ spawned for a wave tag; false when none spawned), `stat` over the run counters `holdFireUses`, `holdFireTicks`, `integrityLost`, `towersBuilt`, `creditsSpent`, and `abilityUses` (`gte`/`lte`), and `all`, `any`, `not`. `holdFireUses` counts only plain Hold Fire turned on, never the Spare runners filter ([architecture.md § Commands](architecture.md#commands-input-into-the-sim)).
- **When they apply:** `src/story/flags.ts` `runEndFlags(mapId, stats)` evaluates the rules whose `onMapEnd` is the ended map, and meta's run end applies them only on the run that **first wins** that map ([meta-runtime.md § Run end](meta-runtime.md#run-end), step 2). Each rule sets its flag to `true` or `false`, so the flag is always set once the map is won. Losses and replays never change it: the map's results stamp, its memo, and every later payoff follow the run that completed the map.
- **The harness** judges C1 with the same rule: assertion #16(a)'s held run must make `spared_quiet_wave`'s rule true ([conventions.md § Balance sims](conventions.md#balance-sims-npm-run-sim)).

## Text substitution

`story/text.ts` runs on every line, bark, choice, memo, codex version, tip, results line, and epilogue card:

| Token | Resolves to |
|---|---|
| `{name}` | `profile.name` |
| `{callsign}` | `profile.callsign` (Sprout, Thorn, Waykeeper; `CALLSIGNS`) |
| `{they}` `{them}` `{their}` `{theirs}` `{themself}` and capitalized `{They}` `{Them}` `{Their}` `{Theirs}` `{Themself}` | The forms from `profile.pronouns` (`PRONOUN_SETS` in [`content/dialogue/profile.ts`](../../src/content/dialogue/profile.ts): `she`, `he`, or `they`, each with all five forms and its `agreement`) |
| `{v:<plural>\|<singular>}` | Verb agreement: the first form when `agreement` is `plural` (they/them), the second when `singular` (she, he). Any pair works: `{v:are\|is}`, `{v:were\|was}`, `{v:have\|has}` |
| `{pests_processed}` | The lifetime counter with thousands separators; inside a map it is the save value plus the run's `skitterkinKilled` so far |
| `{evacuated}` | The current map's meter count (Evacuated, Sheltered, or Voices) |
| `{glyph:<id>}` | An inline glyph from the pixel font's glyph set (`sun`, the Evie sun used in memo sign-offs; `star`, the results-screen ★). Unknown ids fail validation |

Emphasis `*word*` (at most one per line) renders italic; parentheticals such as `(hum, six notes)` and `(squeak)` are plain text. Lines from `hollow` render in the `distorted` style (dropped letters and misregistered glyphs, cosmetic RNG, reduced to plain grey text in reduced-motion mode).

## Validation

`content/validate.ts`, run by the content test, enforces the style guide's mechanical rules:
- **Lengths after worst-case substitution** ([style-guide §5.4](../story/style-guide.md#54-text-tokens-and-length)): `{name}` counts 16, `{callsign}` 9, `{pests_processed}` 9 ("1,234,567"), pronoun tokens their longest form, `{v:…}` its longer form, `{glyph:…}` 1. Limits: dialogue line 120, bark 80, choice option 60, bark button 16, codex version 600, memo body 600 and small print 140, loading tip 80, shop description 100, epilogue card 240. Scene sizes: briefing ≤ 8 lines, radio slot 1–3, mid-map cue ≤ 4, full-screen scene ≤ 20, debrief ≤ 6, base topic ≤ 8.
- Every speaker exists; every expression exists for its speaker; every flag and condition target is declared; scene ids match `<map_id>_<slot>`.
- **Protected `{name}`:** it may appear only in scenes for maps at or after `a3_m03` in campaign order, in epilogue cards, and in `system` UI copy (name tags, onboarding), and never in a `sterling` line.
- **QUILL's tell:** a `quill` line uses expression `policy` if and only if its text starts or ends with "(Per policy.)".
- **Exclamation budget:** `bricks` and `vesthara` lines never contain `!`; in Act III scenes only `sterling` and `pebble` lines may; `quill` never does after A3M2; in the finale only `pebble`, `sterling`, and `system` (the final lyric) may. Softer per-act guidance stays with writers.
- A silence line has `durationSec`; a `choice` has 2–3 options; a `remember` appears only on C3 and C4 choices.

## Barks

Scenes and barks bind to triggers: map script cues (`ScriptCue`), bark-matrix events (the trigger ids and their exact conditions are owned by [design/core-loop.md §6.3](../design/core-loop.md#63-barks); each maps to a sim event or a host event), and menu events (entering the base, the shop, the star map, the Inbox). `story/barks.ts` picks barks by the style guide's priority (script cue → boss → first-time trigger → repeat), spacing (one per 6 s of sim time unless scripted), presence (QUILL and the companion only; QUILL is absent when `quillOffline`), and no-repeat pools, using its own seeded RNG. A bark slot assigned to an absent speaker plays that speaker's authored silence line.

`BarkTrigger` ([`content/dialogue/types.ts`](../../src/content/dialogue/types.ts)) carries core-loop's trigger ids with their parameters (`enemy_killed`, `enemy_leaked`, and `new_enemy` name an enemy; `tower_built` and `tower_sold` may name a tower, and `tower_sold` whether it was tagged; `wave_start` and `wave_cleared` may name a wave or the boss wave; `boss_phase` a phase), plus the Act I radio's event barks that core-loop's table doesn't list yet: `bank_nudge` (D059), `enemy_leaked` (D059), `neutral_hit` (Gerald, A1M3), `tower_issued` (D061), and `menu` (entering a base screen). A bark may play `once` per map or per campaign; the save keeps once-per-campaign barks in `story.seen`.

**Optional bark button.** A bark (or radio line) may carry `button: { label: string; set?: FlagSet[]; reply?: SceneId }`, for example QUILL's Act I knock-knock joke with a "Who's there?" button. The UI rule is owned by [design/core-loop.md §6](../design/core-loop.md#6-story-facing-systems); in code:
- The button shows in the comms panel for the bark's display time and then goes away. It never pauses, never blocks input, and never changes the sim, so it isn't a `Command` and isn't in the command log.
- Pressing it emits the host event `BarkButtonPressed { barkId }`; story applies `set` and plays `reply`. Not pressing it is a valid outcome and needs no default.
- The balance harness ignores bark buttons. The forced single input ([§ Map scripts](#map-scripts-story-driven-sim-changes)) is the blocking counterpart, and the two share a visual grammar ([art-direction.md §9](../art/art-direction.md#dialogue-presentation)).

## Story state

The profile, flags, seen scenes (and once-per-campaign barks), delivered and read memos, unlocked codex versions, seen enemies, `bricksTagIndex`, and `memorialTower` live in the save ([meta-runtime.md § Save system](meta-runtime.md#save-system)). Choices (D001 #3) are just flags; their payoffs are read by content (tower gifts, allies, map dressing, bark pools, epilogue cards) and by map scripts through `scriptFlags`.

## Other story systems

All pure functions over content and save state:
- `story/counter.ts`: the results line per act, and the finale countdown display `round(N × (1 − restPoints / restTarget))` from the sim's stats ([design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)).
- `story/codex.ts`: which versions of each entry are unlocked, the *Pest Field Guide* / *Field Journal* title, and side-by-side mode from A3M1. The entries are `content/codex/` (`CodexEntryDef`: an id `codex_<entry>`, a title, a kind, an optional subject whose first encounter unlocks `original`, and each version's text and `when`).
- `story/inbox.ts`: which memos are delivered on entering the base (each memo's `afterMap` won, or null for the intake's `memo_a1_00`, and its `when`), and the gifts attached to them. The memos are `content/memos/` (`MemoDef`: From, To, Subject, body, conditional `extra` paragraphs, sign-off, small print, `afterMap`, `when`, and `gift`).
- `story/epilogue.ts`: for each card slot in order, the first `EpilogueCard { id, slot, when: Condition, text }` whose condition matches.
- `story/presentation.ts`: resolves the act dials plus map overrides (loading tip pool, billboard state, Tidybots on or off, jingle variant, UI theme, held medal toasts).
- `story/tags.ts`: Bricks's name-tag choice (which tower, which name) from sim events, starting at A1M2; cosmetic, so it lives outside the sim.
