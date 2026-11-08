# Story Runtime

How the story runs in code: map scripts (story moments that change play, inside the sim), and `src/story/` (dialogue, conditions, flags, text tokens, barks, and the other story systems). The module layout and the sim are in [architecture.md](architecture.md); content data shapes are in [architecture.md § Data shapes](architecture.md#data-shapes). Saves and the meta-side story transactions are in [meta-runtime.md](meta-runtime.md).

The authoring format and voice rules are owned by [story/style-guide.md](../story/style-guide.md); the TS types in `content/dialogue/types.ts` must map one-to-one onto its §5. The design homes for the systems below are in [design/core-loop.md §6](../design/core-loop.md#6-story-facing-systems).

**Not in M1.** M1 uses only the `unlockTowerClass` action (compiled from `towerUnlockWave`); A1M1's briefing is static text ([architecture.md, M1 subset](architecture.md#architecture)).

---

## Map scripts (story-driven sim changes)

Story moments that change play run **inside the sim** as map data, so headless runs, replays, and the balance harness see exactly what a player sees ([design/maps.md §5.3](../design/maps.md#53-map-scripts)). The `triggers` system ([architecture.md § Entity model](architecture.md#entity-model-typed-pools-not-an-ecs)) evaluates them. Dialogue stays in `story/`; the sim only emits `ScriptCue` ids.

```ts
interface ScriptedEvent { id: string; on: ScriptTrigger; when?: ConditionDef; actions: ScriptAction[]; once?: boolean }
type ScriptTrigger =
  | { wave: number; phase: 'start' | 'cleared' | { afterSec: number } }
  | { bossHpPct: number; boss?: EnemyId }        // crossing downward
  | { bossPhase: number }
  | { refugeesRemaining: number }                 // Escort / Holdout
  | { restProgressPct: number }                   // finale
  | { objectiveCompleted: string }
  | { interacted: MarkerId }                      // a clickable world object, by click or by fallback
  | { forcedInputResolved: string }
  | { tick: number };
type ScriptAction =
  | { cue: string }                                               // story binds it to a scene or bark
  | { unlockTowerClass: TowerId }                                 // the build button appears (towerUnlockWave compiles to this)
  | { revokeTowerClass: { select: 'mostPlaced'; faction?: TowerFaction }; refundPct: 100 }
  | { restoreTowerClass: 'lastRevoked' }
  | { revokeAbility: AbilityId }                                  // A3M2 Orbital Strike; finale C4 Keep: QUILL's Time Dilation for Phase 2
  | { setObjective: ObjectiveKind; meterLabel?: MeterLabel }      // the A2M5 pivot
  | { bossEnd: 'driveOff' | 'retreat' | 'pivot' }
  | { standDown: Faction }                                        // pivot: remove that faction's hostiles, no leak
  | { spawnAllies: AllyGroupId } | { spawnWave: WaveGroupId }
  | { setClickable: { marker: MarkerId; on: boolean; fallbackSec?: number } }
  | { forceInput: { id: string } }                                // freezes play and locks commands until scriptInput
  | { setModifier: 'quillLockout' | 'previewHidden'; on: boolean }
  | { startTimer: TimerId } | { setTimerRate: { timer: TimerId; pct: number } } | { setPhase: number }  // finale phases
  | { setLighting: LightingPresetId }                             // sets darkness in the sim; render reads it
  | { checkpoint: true }                                          // finale Phase 2 start (architecture.md § Checkpoints)
  | { grantCredits: number } | { openTile: MarkerId; to: TileChar }  // openTile targets a predefined decor marker
  | { endMap: 'won' | 'completed' };                              // Holdout ends as 'completed'
```

- **Cue ids** follow `<map_id>_wNN` for wave-bound cues (`a1_m01_w03`), and the other `<map_id>_<slot>` forms from [story/style-guide.md](../story/style-guide.md) for the rest. Validation checks the pattern.
- **Flags in the sim.** `SimConfig.scriptFlags` carries the story flags a map's scripts and setup may read (`door_choice`, `spared_quiet_wave`, `stardust_choice`, `quill_choice`), copied from the save by `app/`. `ConditionDef` tests them with `{ flag, eq }` ([architecture.md § Data shapes](architecture.md#data-shapes)). The sim never sets flags; story derives flags from `state.stats` when the run ends ([§ Flags](#flags)). C4's mechanical effects (Purge: QUILL's ability can target Everglow units and the Deep Bore timer runs slower in Phase 1; Keep: QUILL loses Time Dilation for Phase 2) are flag-conditioned events and ability variants, specified in [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules).
- **Forced input.** `forceInput` sets `state.pendingInput`. While it is set, the wave schedule, movement, firing, cooldowns, and timers are frozen. The sim still ticks (so render can animate and `tick` stays monotonic), and `applyCommands` accepts only `{ type: 'scriptInput', id }`. The host shows the single-button overlay on `ForcedInputRequested`. Real-time lines (Bricks's line after 20 s on the SEAL) are a story-side timer on wall-clock time, not sim ticks. The balance harness presses it with a `scriptInput` build step.
- **Clickable world objects.** `setClickable` marks a marker (for example `peeker` in A2M3) as clickable and emits `ClickableChanged`; render highlights it ([art-direction.md §6](../art/art-direction.md#6-story-and-world-sprites)). An `interact` command, or the `fallbackSec` timer if the player never clicks, fires the `interacted` trigger once and emits `Interacted { by }`. Pebble's A2M3 rescue is built this way. Clicks that change nothing in the sim (poking the Peeker in Act I) are UI events instead (`peeker_poked`, [§ Flags](#flags)).
- **Revocation** selects the class deterministically (most towers placed, then credits invested, then loadout slot; [design/towers.md §9](../design/towers.md#9-rules-for-story-driven-tower-changes)), sells every tower of it at 100%, adds it to `state.revoked`, and emits `TowerClassRevoked`. Meta copies `revoked` into the save at run end.
- **Rest and scatter** (finale, [design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)): when a Hollow unit dies, `cleanup` checks it against every active song zone (squared distance). Inside: `EnemyLaidToRest`, `restPoints += restValue × songMult`. Outside, and if the map's song is active and the unit hasn't re-formed before: it becomes a `reforming` enemy (untargetable, drifting back along its route) and returns at 50% HP after the delay. The song's passive trickle adds rest points every tick. The modifiers by flag come from `MapDef.song`.
- **Bricks in A3M3.** His health bar follows `allies[].healthTimeline` (per-wave percentages in map data), so it drains on a scripted schedule whatever the player builds, and reaches its floor near the end. Results-screen medal toasts are held on that map (a presentation override), so the SEAL plays the same at any score.

---

## Dialogue runner

A pure state machine over dialogue data: `start(sceneId) → cursor`, `advance(cursor, choiceIndex?)`. Node kinds:

```ts
type DialogueNode =
  | { kind: 'line'; speaker: SpeakerId; expression?: Expression; text: string;
      durationSec?: number }                 // required when text is '' (a silence line)
  | { kind: 'choice'; options: { text: string; tone: 'earnest' | 'wry' | 'quiet'; set?: FlagSet[];
      goto?: string; remember?: SpeakerId }[] }   // remember → "{Speaker} will remember that." (C3, C4 only)
  | { kind: 'branch'; cond: Condition; then: string; else?: string }
  | { kind: 'set'; flag: FlagId; value: FlagValue } | { kind: 'set'; callsign: Callsign }
  | { kind: 'end' };
```

- **Speakers** are the ids in [style-guide §5.1](../story/style-guide.md#51-speaker-ids), declared in `content/dialogue/speakers.ts` with their portrait set (or `none` for `pa`, `kfa`, `hollow`, `narrator`, `system`) and the text style for portrait-less speakers (`form` for `kfa`, `distorted` for `hollow`, `caption` for `narrator`).
- **Expressions:** the five base expressions plus per-speaker extras (`quill.policy`, `pebble.singing`); the portrait list is in [art-direction.md § Portrait roster](../art/art-direction.md#portrait-roster). A line naming no expression uses `neutral`.
- **Portrait variants** are chosen by rules, not by lines: `speakers.ts` lists, per speaker, `{ variant, when: Condition }` in priority order (for example `vesthara`: `dawn` in the finale's Phase 3, `touched_deep` in Act III, `touched` from A2M5; `bricks`: `pebble` from A2M3, `dark` when absent; `quill`: `party_hat` on A1M5, `purge` under `quill_choice = purge`).
- **Silence:** a `line` with `text: ''` shows the speaker's frame (dark for Bricks after A3M3) for `durationSec`, with no text and no typing sound.

## Conditions

Story conditions are data, not strings: `{ flag, eq }`, `{ act }`, `{ mapAtLeast: MapId }`, `{ mapIs: MapId }`, `{ stat: 'pestsProcessed', gte }`, `{ all: [...] }`, `{ any: [...] }`, `{ not: … }`. Map order comes from `content/campaign.ts`. (In-map medal and objective conditions use the sim's `ConditionDef`, [architecture.md § Data shapes](architecture.md#data-shapes).)

## Flags

Flags are declared in `content/dialogue/flags.ts` with a type (`boolean`, or a string union such as `'convoy' | 'warren'`) and a one-line description. The canon set is in [story/bible.md § Flag summary](../story/bible.md#flag-summary). Flags are set by `choice`/`set` nodes, by UI events (`peeker_poked`, `asked_zibzab_early`, optional bark buttons), or by **run-end rules**: data in `content/dialogue/flags.ts` that derives a flag from `state.stats` when a map ends, for example:

```ts
{ flag: 'spared_quiet_wave', onMapEnd: 'a1_m05',
  value: { tagRatio: { tag: 'quiet_wave', of: 'leaked', gte: 0.75 } } },          // design/core-loop.md §2.7
{ flag: 'held_fire_second_look', onMapEnd: 'a2_m03',
  value: { all: [{ tagRatio: { tag: 'fleeing', of: 'leaked', gte: 0.5 } },
                 { stat: 'holdFireUses', gte: 1 }] } },
```

## Text substitution

`story/text.ts` runs on every line, bark, choice, memo, codex version, tip, results line, and epilogue card:

| Token | Resolves to |
|---|---|
| `{name}` | `profile.name` |
| `{callsign}` | `profile.callsign` (Sprout, Thorn, Waykeeper) |
| `{they}` `{them}` `{their}` `{theirs}` `{themself}` and capitalized `{They}` `{Them}` `{Their}` `{Theirs}` `{Themself}` | The forms from `profile.pronouns` (a `PronounSet`: `she`, `he`, or `they`, each with all five forms and its `agreement`) |
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

**Optional bark button.** A bark (or radio line) may carry `button: { label: string; set?: FlagSet[]; reply?: SceneId }`, for example QUILL's Act I knock-knock joke with a "Who's there?" button. The UI rule is owned by [design/core-loop.md §6](../design/core-loop.md#6-story-facing-systems); in code:
- The button shows in the comms panel for the bark's display time and then goes away. It never pauses, never blocks input, and never changes the sim, so it isn't a `Command` and isn't in the command log.
- Pressing it emits the host event `BarkButtonPressed { barkId }`; story applies `set` and plays `reply`. Not pressing it is a valid outcome and needs no default.
- The balance harness ignores bark buttons. The forced single input ([§ Map scripts](#map-scripts-story-driven-sim-changes)) is the blocking counterpart, and the two share a visual grammar ([art-direction.md §9](../art/art-direction.md#dialogue-presentation)).

## Story state

Flags, seen scenes, read memos, unlocked codex versions, `bricksTagIndex`, and `memorialTower` live in the save ([meta-runtime.md § Save system](meta-runtime.md#save-system)). Choices (D001 #3) are just flags; their payoffs are read by content (tower gifts, allies, map dressing, bark pools, epilogue cards) and by map scripts through `scriptFlags`.

## Other story systems

All pure functions over content and save state:
- `story/counter.ts`: the results line per act, and the finale countdown display `round(N × (1 − restPoints / restTarget))` from the sim's stats ([design/maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)).
- `story/codex.ts`: which versions of each entry are unlocked, the *Pest Field Guide* / *Field Journal* title, and side-by-side mode from A3M1.
- `story/inbox.ts`: which memos are delivered after a map (one condition per memo), and gifts attached to them.
- `story/epilogue.ts`: for each card slot in order, the first `EpilogueCard { id, slot, when: Condition, text }` whose condition matches.
- `story/presentation.ts`: resolves the act dials plus map overrides (loading tip pool, billboard state, Tidybots on or off, jingle variant, UI theme, held medal toasts).
- `story/tags.ts`: Bricks's name-tag choice (which tower, which name) from sim events, starting at A1M2; cosmetic, so it lives outside the sim.
