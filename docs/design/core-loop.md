# Core Loop

How a play session flows, how a map plays minute to minute, how you win or lose, and how the in-map economy works.

> **Numbers:** every number in this doc is a **first-pass tuning value** unless it is labeled a **rule**. Tune freely within the rules. Tuning values live in data files, not engine code (see `/CLAUDE.md`, "Content is data"). Once the content files exist, they become the home for exact numbers, and this doc keeps roles, rules, and target ranges (see [../tech/architecture.md](../tech/architecture.md)).

Related docs: [towers.md](towers.md) (tower stats, upgrades, targeting, synergy links) · [enemies.md](enemies.md) (enemy roster and the damage/defense matrix) · [progression.md](progression.md) (Stardust, Intel, medals, shop, R&D) · [maps.md](maps.md) (tiles, paths, difficulty curve) · [../story/campaign.md](../story/campaign.md) (the order of maps, introductions, and unlocks; authoritative for ordering).

---

## 1. Session loop (between maps)

```
New game: Character creation (§6.1) ─► A1M1
Star map ─► Mission briefing ─► Loadout ─► Play the map ─► Results ─► Debrief ─► Base (inbox / shop / R&D / codex) ─► Star map
                 ▲                                │
                 └──────── Retry / change loadout ◄┘ (on a loss, or by choice)
After the finale: Ending choice (C5) ─► Epilogue cards over the credits (§6.8) ─► post-game star map
```

| Step | What the player does | Notes |
|---|---|---|
| **Star map** | Picks a mission node. | The main campaign path is linear; [campaign.md](../story/campaign.md) decides any side missions. Replayable nodes show earned medals and offer veteran modifiers ([progression.md §6](progression.md#6-veteran-modifiers-replays)). |
| **Mission briefing** | Reads a short briefing (a memo, QUILL, or the companion NPC). Sees the **threat intel** strip: icons for the defense traits expected on this map (for example *Flying*, *Shielded*, *Cloaked*) and the three medal conditions. | Rule: threat intel is always shown and always accurate. Losses should teach, never ambush (vision pillar 3). A map may hold back *one* surprise for its final wave, and the briefing hints at it ("QUILL: sensors show something big under the soil"). |
| **Loadout** | Picks **up to 4 tower types**, a **Technician ability**, and **Field Protocols** (meta perks). Sees which synergy links the chosen towers can form. | Rule: the 4-tower limit is a hard rule (`/CLAUDE.md`). The loadout locks when the map starts. Restarting a map lets you change it. |
| **Play the map** | Plays the waves (section 2). | Typically 6–20 minutes at 1x; see [maps.md §6](maps.md#6-difficulty-curve). |
| **Results** | Sees victory or defeat, medals earned, Stardust and Intel gained, and the act's counter line (§6.2). | On a loss, offers: Retry (same loadout), Change loadout, Back to star map. |
| **Debrief** | Reads a short scene (≤ 6 lines) and, after some maps, makes a story choice (C2–C4, [../story/bible.md §9](../story/bible.md#9-the-choices)). | Only after a victory (or a Holdout's scripted end). Skippable on replays. |
| **Base** | Reads the **Halcyon Inbox** (§6.4), spends Stardust at **Zibzab's shop**, Intel in **R&D**, reads the **codex** (§6.5), checks the **Pest Bounty Board** (§6.6, Acts I–II), talks to NPCs. | The base hub is the Perimeter Office (working name). Story scenes can play here. See [progression.md](progression.md). |

---

## 2. In-map loop

### 2.1 Phases

1. **Setup.** The map opens paused-in-spirit: no countdown runs until the player starts wave 1. The player gets the map's starting credits and builds freely. Dialogue may play.
2. **Wave.** Enemies spawn from spawn points along their ground paths or air lanes. Towers fire automatically. The player builds, upgrades, sells, retargets, and uses abilities.
3. **Countdown.** When a wave has *finished spawning*, the next wave's countdown starts (default **20 s**; Act I 25 s, Act III 15 s). When it reaches zero the next wave starts. The player can **call the wave early** at any point during the countdown (2.4).
4. **Repeat** until the last wave resolves.
5. **End.** Victory when every enemy of the last wave has been killed or has leaked and core integrity is above 0. Defeat the instant core integrity hits 0.

Waves can overlap: the countdown starts once spawning ends, not when the wave is dead, so slow kills stack pressure. **Rule:** a wave is *resolved* when every enemy in it has died or leaked. The wave clear bonus (2.3) pays out on resolution.

### 2.2 Wave preview

Before each wave, a **wave preview** shows the incoming enemy icons, grouped by type with counts, and marks which spawn and lane each group uses (ground or air). Pulsing "incoming" flags sit at the active spawn points. New enemy types show a "NEW" badge and a one-line codex hint the first time they appear ("Shielded: Energy damage breaks shields fast"). **Rule:** the preview never lies.

**One scripted exception: QUILL lockout (A3M2).** After Sterling orders QUILL to lock you out, the preview shows "ACCESS RESTRICTED" instead of icons for the rest of the map. It hides; it never shows anything false. To keep the map fair, QUILL **leaks the key trait of every remaining wave** through a mandatory script-cue bark at the start of each countdown ("I am not permitted to tell you wave six is armored. Ahem."), and the briefing's threat intel (shown before the lockout) covers every trait on the map.

### 2.3 Credits (the in-map currency)

Credits exist only inside a map and reset every map (D001).

| Source | Formula / value | Notes |
|---|---|---|
| Starting credits | Per map data. Act I 250–350, Act II 400–550, Act III 550–800, finale ~900. | Set per map in map data. |
| Kill bounty | Per enemy data (`bounty`). Nibbler 3, Chonk 12, bosses 0 (bosses pay through the wave bonus). | Paid when the enemy dies. Leaked enemies pay nothing. |
| Wave clear bonus | `20 + 4 × waveNumber` (wave 1 = 24). | Paid when the wave resolves, even if some of it leaked. |
| Early wave call | `round(secondsRemaining × 2)` | See 2.4. |
| Wreckage salvage | Per wreckage tile in map data (30–80). | See [maps.md §3](maps.md#3-tile-types). |
| Salvage Crane | Tower effect. | See [towers.md](towers.md#vrell-towers). |

| Sink | Rule |
|---|---|
| Build a tower | Pays its tier-1 cost ([towers.md §2](towers.md#2-roster-overview)). |
| Upgrade | Pays the next tier's cost. Tiers 1 to 3 are linear; tier 4 is a specialization choice ([towers.md §3](towers.md#3-upgrades-and-specializations)). |
| Sell | **Refund 70%** of everything spent on that tower (shop upgrades can raise this to 80%). **Misclick grace (rule):** a tower sold before the next wave starts, during the same setup or countdown it was built in, refunds 100%. |

**Rule:** there is no interest on banked credits by default (one Vrell specialization adds a small amount; see [towers.md](towers.md#vrell-towers)).

### 2.4 Early wave call

During a countdown, the player can press the incoming flag (or a hotkey) to start the next wave now.

- **Bonus credits:** `round(secondsRemaining × 2)`. A full 20 s skip gives +40.
- **Ability cooldowns:** every commander ability's remaining cooldown drops by `secondsRemaining × 0.5`.
- You can call several waves back to back; each call pays its own bonus.
- **Rule:** the player cannot call wave 1 early (there is no countdown before it). Starting wave 1 is free and pays nothing.

### 2.5 Building, upgrading, selling

- Towers go only on **buildable tiles**: pads, high ground, and power nodes. **Never on paths** (hard rule). See [maps.md §3](maps.md#3-tile-types).
- One tower per tile; every tower has a 1×1 footprint.
- Building, upgrading, selling, retargeting, and choosing specializations are all **allowed while paused** (accessibility, and it rewards planning over reflexes).
- A new tower **deploys** for 0.5 s before it can fire (a drop-pod or build animation). Upgrades apply instantly.

### 2.6 Targeting priorities

Every attacking tower has a targeting priority the player can change at any time: **First** (furthest along its route), **Last**, **Strong** (highest current HP + shield), **Close** (nearest). Defaults and tie-breaks are in [towers.md §5](towers.md#5-targeting).

### 2.7 Hold Fire

The player can order any tower, or all towers at once, to **hold fire**. A holding tower keeps its auras and links but does not attack. Commander abilities still fire if the player uses them. **Rule:** Hold Fire must always be available, because the story depends on it: the player must be able to *choose* not to shoot.

- **Taught in A1M3** by Gerald the mail drone, who flies along the path as a **neutral unit**: towers that aren't holding fire target him like an enemy (wasting their shots while real pests slip by), he takes no damage (shots plink off), and each hit plays a QUILL bark ("Do NOT shoot Gerald"). The HUD's Hold Fire (all) button pulses until the player uses it. Gerald never leaks, pays nothing, and can't make the map lost.
- **Story tracking.** The sim records per run: total ticks with any tower holding fire, the ticks since any tower last fired at a Skitterkin while one was in range of a tower (for the "not firing" bark, §6.3), and, for every **wave tag** ([enemies.md §7](enemies.md#7-wave-design-rules)), how many tagged units spawned, leaked, and were killed by the player.
- **C1, the Quiet Wave (A1M5), is tracked silently.** The flag `spared_quiet_wave` is set at map end if **at least 75%** of the `quiet_wave` units leaked (tuning value; the share, not the count, so it survives wave-size tuning). Nothing on screen acknowledges it in A1M5 except Bricks's line and Sterling's story-only memo and results stamp ([../story/bible.md §9](../story/bible.md#c1-the-quiet-wave-a1m5-implicit)). **Rules:** (1) the map must be winnable on Standard by the par build even if every Quiet Wave unit leaks (the balance harness runs that variant; [../tech/conventions.md § Balance sims](../tech/conventions.md#balance-sims-npm-run-sim)); (2) Quiet Wave leaks never cost a medal: groups tagged `quiet_wave` are **medal-exempt**, so their leaks don't break Perfect Core and no Challenge medal can reference them; (3) the wave's integrity cost is small (≤ 2, [enemies.md §5.1](enemies.md#51-skitterkin-body-organic)).
- The same single-button grammar returns for the forced inputs in §2.11.

### 2.8 Speed and pause

- Speeds: **1x** and **2x**. Pause at any time (hotkey Space).
- **Rule:** all timers (cooldowns, countdowns, effects) run on simulation time, so 2x halves real-world waits and pause freezes everything. The sim runs a fixed timestep; 2x runs two sim steps per frame (see `docs/tech/architecture.md`).
- 3x is a possible post-game unlock (open question).

### 2.9 Core integrity (lose condition)

- Each map has a **colony core** at the end of its paths. Core integrity starts at **20** (shop upgrades add up to +6; see [progression.md §4](progression.md#4-zibzabs-shop-stardust)).
- A leaking enemy subtracts its **leak cost** (`leak` in enemy data): 1 for small enemies, 2–4 for big ones. **Rule:** a leaking boss drains all remaining integrity.
- **Rule:** integrity never regenerates during a map (a Field Protocol may grant a one-time shield; see [progression.md §5](progression.md#5-field-protocols-meta-perks)).
- At 0 integrity the map is lost immediately. Per D001, a loss has no penalty beyond a retry; the player keeps a share of the Stardust earned ([progression.md §2](progression.md#2-earning-stardust)).
- **Meter labels are map data** (`meterLabel`). Defend maps show **Core integrity**. Escort maps show **Evacuated** (refugees reaching safety) or **Sheltered** (A3M6, refugees reaching the domes). Holdout shows **Evacuated**. The finale shows the choir (§2.10). The results-screen counter line follows the same label (§6.2).

### 2.10 Objective variants

Most maps are **Defend** maps (survive every wave with integrity above 0). A few story maps swap the objective. Each variant is a map-data flag, and [maps.md §5](maps.md#5-map-modifiers-and-objective-variants) defines them:

- **Escort:** friendly refugees walk the path *toward safety* while Hollow units chase or intercept them. The meter is relabeled **Evacuated** (or **Sheltered**) and counts refugees who made it. Escort paths can run **reversed** (A3M6 toward the domes; the finale south to north). A map can **pivot** into Escort mid-map (A2M5).
- **Holdout:** a deliberately unwinnable defense that ends on a **scripted event, not on integrity 0** (A3M3 ends on the SEAL). It is scored by Evacuated, always counts as completed, and never blocks progress.
- **Protect the asset:** a second, smaller objective (for example the A2M2 extraction rigs or the A3M5 vats) with its own integrity that shares the map's waves.
- **Choir escort (finale):** an Escort whose refugees are the singing choir, plus the song rules (laid to rest, scattering, the countdown) in [maps.md §5.5](maps.md#55-the-leaving-song-finale-rules).

### 2.11 Scripted moments

Story moments that change play are map-script actions ([maps.md §5.1](maps.md#51-layout-and-event-modifiers); tech: [../tech/architecture.md § Map scripts](../tech/architecture.md#map-scripts-story-driven-sim-changes)). The ones with player-facing rules:

| Moment | Where | Rules |
|---|---|---|
| **Forced single input** | A3M3 (**SEAL**), Finale under C4 Keep (**"Who's there?"**) | The sim pauses. Every HUD control, hotkey, and the tower panel lock; only one large button is live, centered low on screen, and the settings menu stays reachable (accessibility). There is no timer and no alternative. **SEAL** waits indefinitely while a looping hum plays; after 20 s of real time Bricks says "Kid. It's okay." (once). Pressing it issues a `scriptInput` command, so the moment is in the command log and the balance harness can press it. Reduced-motion and photosensitivity settings apply ([../story/style-guide.md §8](../story/style-guide.md#8-content-guidelines)). |
| **Tower license revocation** | A3M2 (Sterling, mid-wave); Finale under C4 Keep (QUILL, short) | [towers.md §9](towers.md#9-rules-for-story-driven-tower-changes). |
| **Ability revocation** | A3M2 | Sterling revokes the **Orbital Strike** uplink in the same cue. If it is equipped, slot 1 goes dark for the rest of the map with a "UPLINK REVOKED" stamp. From then on it can't be equipped; Intel spent on Orbital Strike Mk II is refunded. |
| **QUILL lockout** | A3M2, after the revocation | §2.2. QUILL's companion ability (if it is the companion) is disabled for the rest of the map. |
| **QUILL offline** | A3M5, only if `quill_choice = rewrite` | No QUILL ability, no QUILL barks or radio lines, and no R&D tip text in the base until A3M5 ends. The briefing's threat intel is still shown, delivered by `system`. You should feel the silence. |
| **Boss endings** | A1M5, A2M2, A2M5, Finale | `driveOff`, `retreat`, `pivot`, `layToRest` ([enemies.md §6.1](enemies.md#61-boss-scripting)). |

---

## 3. Commander abilities

Enemies can never attack towers, so these abilities are the player's direct way to act on the battlefield. They give agency, spectacle, and an answer to a crisis.

### 3.1 Rules

- **Two ability slots per map:**
  - **Slot 1, Technician:** the player's own ability, chosen in the loadout from those unlocked ([progression.md §7](progression.md#7-rd-tree-intel)).
  - **Slot 2, Companion:** the signature ability of the NPC who accompanies this mission, shown with their portrait. [campaign.md](../story/campaign.md) sets the companion per map. The companion also voices in-map barks and between-wave radio ([../story/style-guide.md §5.5](../story/style-guide.md#55-barks)).
- **No companion:** on a map with no companion the slot is **hidden**, not empty, and there is no fallback ability. The one exception is deliberate (next rule).
- **The empty slot (A3M4).** After Bricks dies, A3M4's map data sets the companion to Bricks in the **`absent`** state: the slot is visible, his portrait is dark (the art's `dark` portrait variant), the button is disabled and has no label, and his radio and bark slots play authored **silence** ([../story/style-guide.md §5.6](../story/style-guide.md#56-special-line-kinds-authoring-conventions)).
- **Bricks has no hero unit.** His presence is the companion slot (Suppressing Fire, portrait, barks) and his turret name tags ([towers.md §8](towers.md#8-presentation-and-personality)). On A1M1, A1M5, A2M6, and the A3M3 Holdout he also appears as a **scripted ally unit** on the map: a person, not a tower, so the 4-tower rule is untouched ([maps.md §5.4](maps.md#54-allies-on-the-map)). The player never places or moves him.
- **Inheritance.** At the end of A3M4, **Suppressing Fire** becomes a Technician ability, equippable in slot 1 from A3M5.
- Abilities are **ready when wave 1 starts**, then go on cooldown after each use.
- Cooldowns run on sim time and shrink with early wave calls (2.4).
- Targeted abilities can be **aimed while paused**; they fire when play resumes (or instantly if cast during play).
- Abilities follow the same damage rules as towers ([enemies.md §2](enemies.md#2-combat-resolution)). Bosses take reduced control effects as defined there.

### 3.2 Ability roster

Story owners and timing come from [../story/bible.md §12](../story/bible.md#12-mechanics-the-story-needs); [campaign.md](../story/campaign.md) is authoritative for exact maps.

| Ability | Granted by | Effect | Cooldown | Availability (story) |
|---|---|---|---|---|
| **Orbital Strike** | Technician. Sterling's welcome gift (the Halcyon uplink) | Targeted, radius 1.5 tiles: 200 Explosive after a 1 s visible targeting reticle. | 45 s | A1M1 (the default Technician ability) until it is **revoked mid-wave in A3M2** (§2.11) |
| **Scanner Sweep** | Technician (R&D) | Targeted, radius 4 tiles: reveals cloaked enemies for 10 s. | 30 s | Act II early (alongside the first cloaked enemies) |
| **System Reboot** | Technician (free; QUILL patches it in) | Instantly clears **Jammed** on all towers and makes them immune to jamming for 6 s. | 40 s | A3M4, before the first Silencer. Kept under every C4 outcome |
| **Suppressing Fire** | Companion: Sgt. Bricks. Then Technician (inherited) | Targeted path segment (3 tiles): enemies on it are slowed 50% and take 20 Kinetic/s for 5 s. | 50 s | Companion on Bricks's maps from A1M1 through A3M3; Technician from A3M5 |
| **Time Dilation** | Companion: QUILL | All enemies slowed 40% for 6 s (bosses 20%). | 60 s | On maps where QUILL is the companion. **Lost permanently under C4 Purge**; unavailable in A3M5 under C4 Rewrite |
| **Clearance Sale** | Companion: Zibzab | Your next 3 builds or upgrades this map cost 40% less. Rule: counted per purchase, not per second, so pausing can't exploit it. | Once per 4 waves | From A1M4 |
| **Stillness** | Companion: Ves'thara | Targeted, radius 2.5 tiles: Stasis for 3 s (bosses: 50% slow instead). Interrupts abilities ([enemies.md §2.4](enemies.md#24-status-effects)). | 45 s | From A2M5 |
| **Underfoot** | Companion: Matriarch Chitterbloom | Targeted path tile: for 6 s, each ground enemy that crosses it is Pinned 1 s and takes 30 Kinetic. Hits burrowed enemies. | 50 s | From A3M1 |

**Revocations are the betrayal you feel.** Losing Orbital Strike and a tower class in A3M2 is attributable to Sterling on screen (her portrait in the cue, a Halcyon "REVOKED" stamp), so the loss reads as hers, not as a bug.

---

## 4. Controls (desktop first)

| Action | Mouse | Key |
|---|---|---|
| Build | Click a buildable tile, then pick from the radial menu (only loadout towers) | 1–4 picks a tower, then click a tile |
| Upgrade / specialize / sell / retarget | Click a tower to open its panel | U upgrade, S sell, T cycle targeting |
| Call wave early | Click an incoming flag | W |
| Abilities | Click the ability button, then the target | Q (slot 1), E (slot 2) |
| Pause / speed | HUD buttons | Space pause, F toggle 1x/2x |
| Hold fire | Tower panel toggle (one tower) or HUD button (all) | H (selected), Shift+H (all) |
| Cancel | Right-click | Esc |

Every control is a click target at least 32 px so touch support can come later (D001). Key remapping is a backlog item.

---

## 5. Readability and feedback rules

- Every enemy ability has a **visual tell** before it fires and a **codex entry** naming its counter ([enemies.md](enemies.md)).
- Damage numbers are optional (off by default). A hit that does reduced damage because of armor or shields shows a distinct "plink" spark and sound, so the player learns "wrong tool".
- The tower panel shows live DPS, kills, and the active **synergy links** and tile bonuses.
- Range is shown as an ellipse when placing or selecting a tower (range is measured on the logical grid and drawn in isometric projection; see [maps.md §1](maps.md#1-grid-and-coordinates)).
- QUILL comments on key events during play (first leak, boss phase, a new enemy) in the Defense Grid style (D001 influences), through the bark matrix (§6.3). The voice is set by [../story/style-guide.md](../story/style-guide.md).
- The HUD's top-left name plate shows **JPT-1 · {callsign}** (§6.1), so the callsign change is visible during play.

---

## 6. Story-facing systems

Systems the story rides on outside the wave loop. Writing rules, lengths, and voice are owned by [../story/style-guide.md](../story/style-guide.md); data shapes are in [../tech/architecture.md § Story](../tech/architecture.md#story-srcstory). Each subsection is the design home for its system.

### 6.1 Character creation and callsigns

- **When:** New Game, before A1M1, framed as a Halcyon onboarding form ("Frontier Futures: New Hire Intake").
- **Fields:** **name** (1–16 characters; letters, digits, space, apostrophe, hyphen, and period, so the in-world bitmap font can draw it on a name tag), **pronouns** (she/her, he/him, they/them; each set carries its verb agreement for `{v:…}` tokens), and **`arrival_reason`** (`bonus`: "The signing bonus"; `family`: "Money for family back home"; `lettuce`: "I like lettuce"). The reason only flavors a few lines.
- Name and pronouns can be changed later in Settings; `arrival_reason` can't.
- **Callsign:** Sprout (A1M1) → Thorn (A2M2) → Waykeeper (A3M6), set by dialogue `set` nodes and shown on the HUD (§5). Sterling's employee number **#HD-447** is fixed and shown on memos and the onboarding form.

### 6.2 Results screen and the lifetime counter

- **Pests Processed** is a **lifetime save stat**: +1 for every Skitterkin enemy killed by the player's towers or abilities, on every run, including replays, losses, and retries (the game remembers everything you did). Units gathered by a Maw, scurrying young from a Hauler's sack, and medal-exempt younglings that leak don't count. It's added when a run ends for any reason.
- **Per-act results line** (copy owned by the style guide, [§2](../story/style-guide.md#2-voice-by-act)): Act I `PESTS PROCESSED: {n} ★ Top 5% of Technicians!` (the "Top 5%" is always true, and it's a lie nobody checks); Act II `Pests processed: {n}.` (no star); Act III the counter is **hidden** and replaced by the map's meter line (`Evacuated: {n}.`, `Held.`, or `Sheltered: {n}.`); Finale `REMEMBERED: {n}`. Act I results also show the cheerful star rating; Act III shows no stars at all.
- **Ves'thara reads the live number** in A2M2 through the `{pests_processed}` token, which resolves to the lifetime total plus the current run's kills so far.
- **The countdown:** in the finale's Phase 2 the counter returns at the lifetime total and **counts down to 0** as the Hollow is laid to rest, then flips to **REMEMBERED: {n}**. Its pacing rules are in [maps.md §5.5](maps.md#55-the-leaving-song-finale-rules).
- **Story stamps:** a results screen can carry a story-only stamp (for example A1M5's red "Containment Lapse" when the Quiet Wave was spared). Stamps never change rewards.

### 6.3 Barks

Barks are one-line, non-blocking reactions to game state, drawn from pools (authoring rules, priority, the 6-second spacing, presence, and silence: [../story/style-guide.md §5.5](../story/style-guide.md#55-barks)). Budget: about 200–400 across the campaign. **Rule: barks never pause, block input, or cover the playfield.**

| Trigger id | Fires when |
|---|---|
| `map_start` / `wave_start` / `wave_cleared` | The map's first build phase; a wave starts; a wave resolves |
| `first_leak` | The first enemy of the map leaks |
| `perfect_wave` | A wave resolves with no leaks (medal-exempt groups ignored) |
| `tower_built` / `tower_sold` | A tower is built; sold (condition data can check whether it carried a name tag) |
| `low_integrity` | The meter drops to 25% or below (once per map) |
| `enemy_killed` | A specific enemy id (condition) dies, for the first time this map |
| `new_enemy` | An enemy type appears for the first time in the campaign |
| `boss_phase` | A boss changes phase |
| `hold_fire_used` | Hold Fire is turned on (any tower) |
| `not_firing` | Skitterkin have been in range of at least one tower for **10 s** of sim time with no tower firing at any of them (Hold Fire, or simply choosing not to): "...You okay, Sprout?" Once per map |
| `skitterkin_killed_ahead` | The player kills a Skitterkin that was fleeing ahead of a Hollow group on the same route (wave tag `fleeing`). Once per map |
| `idle` | No player command for 30 s of sim time during a wave |
| `ally_hushed` | A refugee or singer is hushed |
| `flag` | Entering a map with a given story flag value (for example `spared_quiet_wave`), first build phase only |

Conditions can test the act, the map, flags, and run stats. Only speakers present on the map may bark: QUILL plus the companion.

### 6.4 Halcyon Inbox (memos)

- About **one memo per map**, delivered when the player enters the base after results. An unread badge sits on the Inbox; memos never pop up over play.
- A memo has From, To, Subject, body, sign-off, and **small print** (collapsed until clicked; [../story/style-guide.md §6.1](../story/style-guide.md#61-halcyon-memos)). The small print is where fair-play clues live, so it must be reachable in one click.
- A memo may carry a **gift** (for example the A1M1 Orbital Strike uplink, the A2M4 Q3 Bonus). The gift is granted when the memo is delivered, not when it's read, so skipping the Inbox never costs anything.
- The Inbox keeps every memo, newest first. In Act III memos become terse and automated; after A3M2 the sender line reads "Halcyon Automated Systems."

### 6.5 The codex

- Entries unlock on first encounter (enemies, towers, places, people). Each entry has up to three **versions**: `original` (the *Pest Field Guide*, smug Halcyon PR with bounty stars), `annotated` (Act II: QUILL's unredactions and Ves'thara's margin notes), and `corrected` (Act III). Each version has its own unlock condition (map progress and flags).
- From A3M1 the codex is retitled ***Field Journal***, and entries with a corrected version show **original and corrected side by side**. The original is never deleted.
- Before Act III, an entry shows its newest unlocked version, with a tab to read older ones.
- **Rule:** the codex is optional depth; nothing in it is required to follow the story or to play.

### 6.6 The Pest Bounty Board

- A fake leaderboard in the base during **Act I and Act II**. Kip is #1 ("three quarters running"), the player is always #2, and a few colonist names fill out the rest. Kip's score is computed to stay ahead of the player's Pests Processed. Rows are cosmetic.
- From A2M4 Kip's row reads "(on assignment: Reclamation)". From A3M1 the board is simply **gone** from the base, with no message.

### 6.7 Per-act presentation dials

Presentation that changes with the act is **data** (one table keyed by act, with per-map overrides), so a map's tone can be tuned without code. Defaults:

| Dial | Act I | Act II | Act III | Finale |
|---|---|---|---|---|
| Results counter line and stars | §6.2 | §6.2 | §6.2 | §6.2 |
| Loading tip pool | "a clean perimeter is a happy perimeter!" | "a clean perimeter." | "Remember." | "Remember them." (post-game) |
| Skitterkin death tone | [enemies.md §8](enemies.md#8-death-and-feedback-by-act) | | | |
| Tidybot cleanup after waves | On | On (A2M4: seen unloading at the plant) | Off | Off |
| Hally billboard state | `beaming` | `peeling` | `dark` (a hum-glyph painted over the smile) | `dark` |
| Wave-clear jingle | Bright sting | Sting with minor bridges (minor arrangement from A2M4) | **None** (the jingle stops playing) | The song ([../tech/architecture.md § Audio](../tech/architecture.md#audio-srcaudio-m2)) |
| UI act theme and lighting | [../art/art-direction.md §9](../art/art-direction.md#act-themes), [§3](../art/art-direction.md#3-environment-palettes-by-act) | | | |

### 6.8 Ending choice and epilogue cards

- After the finale's Dawn, the **ending choice** (C5) is a full-screen scene with exactly two fixed player lines: "We stay. We keep the way open." and "We go. We give it back." There's no "will remember" feedback.
- **Epilogue cards** then play over the credits: one card per topic slot, in order, each the first card whose flag condition matches ([../story/bible.md §10](../story/bible.md#epilogue-cards); each ≤ 240 characters). Cards advance on a timer (about 6 s) or on click, and the last card is the counter: **PESTS PROCESSED: 0**, then **REMEMBERED: {n}**, while the jingle plays in a major key.
- The final HUD image depends on the ending (`stay`: the old status line reads **PERIMETER STATUS: OPEN**). After the credits the post-game star map opens, and loading tips switch to "Remember them."

### 6.9 The Peeker

- On every Act I map, a youngling hides behind a rock on a decor tile near a warren mouth ([maps.md §7](maps.md#7-storytelling-with-the-map)). It peeks out every 20–40 s of play. Clicking it plays a squeak and a duck animation and sets `peeker_poked` (once is enough). It has no effect on play, rewards, or medals, and it isn't a sim entity.
- In A2M3 (A1M2 revisited) the rock holds Pebble instead; in A3M6 Pebble sits on top of the A1M1 rock.

---

## Open questions

1. **Wave checkpoints.** Should a loss offer "Retry from wave N" (the deterministic sim makes snapshots cheap)? Recommendation: yes, but using it forfeits the Perfect Core and Challenge medals for that run.
2. **3x speed** as a post-game unlock, or available from the start?
3. **Overlapping waves.** Is starting the countdown when spawning ends (not when the wave dies) too punishing in Act I? An alternative is a Story-difficulty-only rule that the countdown waits for the wave to resolve.
4. **Early-call credit rate.** At 2 credits per second, is there a degenerate "always call instantly" strategy on easy maps? Test with the balance harness ([maps.md §6.4](maps.md#64-balance-harness)).
5. **Spared threshold.** Is 75% of the Quiet Wave the right line between "spared" and "cleared"? A player who holds fire but loses a couple to a stray splash should still count as sparing.
6. **"Not firing" detection.** Ten seconds with Skitterkin in range and no shots fired may trigger by accident on maps with poor coverage. Should it also require Hold Fire to be on, at the cost of missing players who spare by placement?
7. **Pests Processed on quit.** Kills are added when a run ends. Closing the tab mid-map loses that run's count. Acceptable, or should the host flush the count on `pagehide`?
