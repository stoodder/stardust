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
| **Mission briefing** | Reads a short briefing (a memo, QUILL, or the companion NPC). Sees the **threat intel** strip: one icon for every defense trait on this map (the map's `threatIntel`, for example *Flying*, *Shielded*, *Cloaked*) and the three medal conditions. | Rule: threat intel is always shown and always accurate. Losses should teach, never ambush (vision pillar 3). A map may hold back *one* surprise for its final wave, and the briefing hints at it ("QUILL: sensors show something big under the soil"). Which traits a map *requires* an answer to is a separate field ([maps.md §6.3](maps.md#63-one-new-thing-per-map)). |
| **Loadout** | Picks **up to 4 tower types**, a **Technician ability**, and **Field Protocols** (meta perks). Sees which synergy links the chosen towers can form. | Rule: the 4-tower limit is a hard rule (`/CLAUDE.md`). The loadout locks when the map starts. Restarting a map lets you change it. **Rule:** the loadout screen is shown only when there is a choice to make: the player owns more than 4 tower types, or has a real choice of Technician ability, Field Protocols, or companion (the finale pick list). Otherwise it is skipped and the map starts with everything owned (A1M1 skips it; a map can also hold a tower back until a wave with `towerUnlockWave`, [maps.md §9](maps.md#9-map-data-shape-for-implementers)). |
| **Play the map** | Plays the waves (section 2). | Typically 6–20 minutes at 1x; see [maps.md §6](maps.md#6-difficulty-curve). |
| **Results** | Sees victory or defeat, medals earned, Stardust and Intel gained, and the act's counter line (§6.2). | On a loss, offers: Retry (same loadout), Retry from a checkpoint (§2.12, Act II on), Change loadout, Back to star map. Change loadout shows after a win too, wherever the map offers the loadout screen; it opens that map's loadout screen. |
| **Debrief** | Reads a short scene (≤ 6 lines) and, after some maps, makes a story choice (C2–C4, [../story/bible.md §9](../story/bible.md#9-the-choices)). | Only after a victory (or a Holdout's scripted end). Skippable on replays. |
| **Base** | Reads the **Everglow Inbox** (§6.4), spends Stardust at **Zibzab's shop**, Intel in **R&D**, reads the **codex** (§6.5), checks the **Pest Bounty Board** (§6.6, Acts I–II), talks to NPCs. | The base hub is the Perimeter Office (working name). Story scenes can play here. See [progression.md](progression.md). |

**The loadout screen as built (T201, M2).** It offers the towers and the Technician ability. Field Protocols join it with their picker (M3), and the finale's companion pick with the finale (M5).
- It comes before the briefing, which opens over the battle (the star map and its briefing are M3).
- The order the player picks towers in is their build-slot order (keys 1–4).
- Each tower shows its icon, role, cost (after the save's discounts), and which of the map's counters it answers, from which tier or spec.
- A side column shows slot 2 (the map's companion), the links the owned towers can form (lit when the pick forms them), and a heads-up for any required counter the pick leaves unanswered. The heads-up names the towers that would answer it and never blocks the pick.
- The last pick on each map is remembered; a map with none starts from the last pick anywhere. Retry keeps it, and the briefing's *Change loadout* goes back to the screen. Results doesn't offer *Change loadout* yet.

The rules and the code are in [../tech/meta-runtime.md § Meta](../tech/meta-runtime.md#meta-srcmeta).

---

## 2. In-map loop

### 2.1 Phases

1. **Setup.** The map opens paused-in-spirit: no countdown runs until the player starts wave 1. The player gets the map's starting credits and builds freely. Dialogue may play.
2. **Wave.** Enemies spawn from spawn points along their ground paths or air lanes. Towers fire automatically. The player builds, upgrades, sells, retargets, and uses abilities.
3. **Countdown.** When a wave has *finished spawning*, the next wave's countdown starts (default **20 s**; Act I 25 s, Act III 15 s). When it reaches zero the next wave starts. The player can **call the wave early** at any point during the countdown (2.4).
4. **Repeat** until the last wave resolves.
5. **End.** Victory when every wave has resolved (below), so every enemy of the last wave and of any earlier wave still on the field has been killed or has leaked, and core integrity is above 0. Defeat the instant core integrity hits 0; it wins over a victory on the same tick.

Waves can overlap: the countdown starts once spawning ends, not when the wave is dead, so slow kills stack pressure. **Rule:** a wave is *resolved* when every enemy in it has died or leaked. The wave clear bonus (2.3) pays out on resolution.

### 2.2 Wave preview

Before each wave, a **wave preview** shows the incoming enemy icons, grouped by type with counts, and marks which spawn and lane each group uses (ground or air). Pulsing "incoming" flags sit at the active spawn points. New enemy types show a "NEW" badge and a one-line codex hint the first time they appear ("Shielded: Energy damage breaks shields fast"). **Rule:** the preview never lies.

**One scripted exception: QUILL lockout (A3M2).** After Sterling orders QUILL to lock you out, the preview shows "ACCESS RESTRICTED" instead of icons for the rest of the map. It hides; it never shows anything false. To keep the map fair, QUILL **leaks the key trait of every remaining wave** through a mandatory script-cue bark at the start of each countdown ("I am not permitted to tell you wave six is armored. Ahem."), and the briefing's threat intel (shown before the lockout) covers every trait on the map.

### 2.3 Credits (the in-map currency)

Credits exist only inside a map and reset every map (D001).

| Source | Formula / value | Notes |
|---|---|---|
| Starting credits | Per map data (`startCredits`). | Per-act ranges: [maps.md §6.1](maps.md#61-per-act-targets). |
| Kill bounty | Per enemy data (`bounty`). Nibbler 3, Chonk 12, bosses 0 (bosses pay through the wave bonus). | Paid when the enemy dies. Leaked enemies pay nothing. Fleeing Skitterkin pay only 1 ([enemies.md § Fleeing Skitterkin](enemies.md#fleeing-skitterkin)). |
| Wave clear bonus | `20 + 4 × waveNumber` (wave 1 = 24); ×3 for a boss wave (one that sends a boss). | Paid when the wave resolves, even if some of it leaked. A driven-off boss's wave resolves when she and her brood are off the map ([enemies.md §6.1](enemies.md#61-boss-scripting)). |
| Early wave call | `round(0.5 × nextWaveClearBonus × secondsRemaining / countdown)` | See 2.4. |
| Wreckage salvage | Per wreckage tile in map data (30–80). | See [maps.md §3](maps.md#3-tile-types). |
| Salvage Crane | Tower effect. | See [towers.md](towers.md#vrell-towers). |

| Sink | Rule |
|---|---|
| Build a tower | Pays its tier-1 cost ([towers.md §2](towers.md#2-roster-overview)). |
| Upgrade | Pays the next tier's cost. Tiers 1 to 3 are linear; tier 4 is a specialization choice ([towers.md §3](towers.md#3-upgrades-and-specializations)). |
| Sell | **Refund 70%** of everything spent on that tower (shop upgrades can raise this to 80%). **Misclick grace (rule):** a tower sold before it first fires and within **10 s** of sim time of being built (whichever ends first) refunds 100%. Paused time doesn't count toward the 10 s. For pulse and aura towers, "first fires" means the first pulse that affects an enemy. |

**Rule:** there is no interest on banked credits by default (one Vrell specialization adds a small amount; see [towers.md](towers.md#vrell-towers)).

### 2.4 Early wave call

During a countdown, the player can press the incoming flag (or a hotkey) to start the next wave now.

- **Bonus credits:** `round(0.5 × nextWaveClearBonus × secondsRemaining / countdown)`, where `nextWaveClearBonus` is the clear bonus of the wave being called (2.3; for a boss wave, the plain bonus, never the tripled one: the triple rewards the fight, not calling it early) and `countdown` is that countdown's full length. Skipping a whole countdown pays half that wave's clear bonus: calling wave 5 the instant its 20 s countdown starts pays `0.5 × 40 = +20`. The bonus scales with the map's own economy, so it can't dominate early maps.
- **Ability cooldowns:** every commander ability's remaining cooldown drops by `0.25 × secondsRemaining`.
- You can call several waves back to back; each call pays its own bonus.
- **Rule:** the player cannot call wave 1 early (there is no countdown before it). Starting wave 1 is free and pays nothing.
- **Rule (no degenerate rush):** the balance harness runs an `alwaysCallEarly` policy (par build, every wave called the instant its countdown starts). Its margin must be ≤ `min(bandTop, parMargin + 10)`: it may not leave the map's par band, and it may not beat the normal par run by more than 10 points ([maps.md §6.4](maps.md#64-balance-harness)).

### 2.5 Building, upgrading, selling

- Towers go only on **buildable tiles**: pads, high ground, and power nodes. **Never on paths** (hard rule). See [maps.md §3](maps.md#3-tile-types). How the player picks a tower and a tile is in §4.
- One tower per tile; every tower has a 1×1 footprint.
- Building, upgrading, selling, retargeting, and choosing specializations are all **allowed while paused** (accessibility, and it rewards planning over reflexes).
- A new tower **deploys** for 0.5 s before it can fire (a drop-pod or build animation). Upgrades apply instantly.

### 2.6 Targeting priorities

Every attacking tower has a targeting priority the player can change at any time: **First** (furthest along its route), **Last**, **Strong** (highest current HP + shield), **Close** (nearest). Defaults and tie-breaks are in [towers.md §5](towers.md#5-targeting). From A2M1 the **Spare runners** filter ([§2.7](#spare-runners)) can sit on top of any priority.

### 2.7 Hold Fire

The player can order any tower, or all towers at once, to **hold fire**. A holding tower keeps its auras and links but does not attack. Commander abilities still fire if the player uses them. **Rule:** Hold Fire must always be available, because the story depends on it: the player must be able to *choose* not to shoot.

- **One tower or all.** A tower's panel toggle holds that tower. The HUD's Hold Fire (all) toggle is a master switch: on, it holds every tower, and towers built while it's on start holding; off, it releases every tower, including ones held one by one. A released tower can fire at once (its reload kept running while it held).
- **What the player sees.** The tower panel's toggle reads "Hold fire", then "Holding fire" while on. Hold Fire (all) sits bottom-left beside the ability slots on every map, and reads "Hold", then "Held" while the master switch is on. A holding tower dims and wears a small pause plate above it, so it reads by shape, not by color alone ([../art/art-direction.md §8](../art/art-direction.md#status-visuals)). H with no tower selected says how: "Pick a turret first · Shift+H holds all". Each change clicks: down for on, up for off.
- **Taught in A1M3** by Gerald the mail drone, who flies along the path as a **neutral unit**: towers that aren't holding fire target him like an enemy (wasting their shots while real pests slip by), he takes no damage (shots plink off), and each hit plays a QUILL bark ("Do NOT shoot Gerald"). The HUD's Hold Fire (all) button pulses until the player uses it. Gerald never leaks, pays nothing, and can't make the map lost: at the end of the path he delivers and leaves. He flies the same way once more in A3M4.
  - **His layer (rule):** Gerald is an **air** unit whose route is the **ground path**, so the towers the player built along the path see him, but only those that hit air (Rivet and Skyhook in A1M3) can shoot him; Thumpers and Sprinklers can't.
  - **What counts as a hit (rule):** only a shot a tower *aimed at him*: a hitscan shot, or a shell or flak burst fired at him that lands with him inside. Area hits aimed at someone else (a flak burst at a Puffwing beside him, a pulse, a chain's jump) pass him by and never count, so the Return to Sender medal measures the player's choice to hold fire, not bad luck. A burst fired at him still hurts the pests around him.
- **Story tracking.** The sim records per run: total ticks with any tower holding fire, the ticks since any tower last fired at a Skitterkin while one was in range of a tower (for the "not firing" bark, §6.3), and, for every **wave tag** ([enemies.md §7](enemies.md#7-wave-design-rules)), how many tagged units spawned, leaked, and were killed by the player.
- **C1, the Quiet Wave (A1M5), is tracked silently.** The flag `spared_quiet_wave` is set at map end if **at least 75%** of the `quiet_wave` units leaked (tuning value; the share, not the count, so it survives wave-size tuning). Nothing on screen acknowledges it in A1M5 except Bricks's line and Sterling's story-only memo and results stamp ([../story/bible.md §9](../story/bible.md#c1-the-quiet-wave-a1m5-implicit)). **Rules:** (1) the map must be winnable on Standard by the par build even if every Quiet Wave unit leaks, and the harness's Hold Fire variant must end with `spared_quiet_wave = true` ([maps.md §6.4](maps.md#64-balance-harness)); (2) Quiet Wave leaks never cost a medal (medal exemption below); (3) the wave's integrity cost is small (≤ 2, [enemies.md §5.1](enemies.md#51-skitterkin-body-organic)).
- **`held_fire_second_look` (A2M3)** is set at map end when **at least 50%** of the map's `fleeing` units leaked **and** Hold Fire was turned on at least once during the run.
- **Medal-exempt units (rule).** Units in groups tagged `quiet_wave` or `fleeing`, units with the `youngling` modifier ([enemies.md §5.1](enemies.md#51-skitterkin-body-organic)), and any group tagged `medal_exempt` are **medal-exempt**: their leaks cost only the integrity their data says (0 for younglings and fleeing units; Old Thrum's 2), never break Perfect Core, and no Challenge medal can reference them. Any other leak breaks Perfect Core the moment it happens, even one that costs no integrity (a leak cost of 0, or Emergency Bulkhead absorbing it): the medal means *nothing got through*. How the sim settles medals is in [../tech/architecture.md § Medals](../tech/architecture.md#medals).
- **Allies hold fire too (rule).** Scripted allies with an attack (Bricks's post, colonist militia) **never target** those same medal-exempt units ([maps.md §5.4](maps.md#54-allies-on-the-map)), so sparing them is always the player's choice alone. In A1M5, right after "Clear it, Sprout," Bricks visibly **lowers his cannon** for the Quiet Wave (a silent tell, no line).
- The same single-button grammar returns for the forced inputs in §2.11.

#### Spare runners

From **A2M1**, when the first fleeing Skitterkin appear, the player can tell towers to **spare runners**: a toggle in each attacking tower's panel, plus a global HUD toggle (hotkey **Alt+H**) that sets it on every tower.

- **Hidden until it unlocks** (with A1M5 won; [../tech/meta-runtime.md § Progress and gating](../tech/meta-runtime.md#progress-and-gating)): the panel toggle ("Spare runners", then "Sparing runners") shows only on towers with an attack, the HUD's Spare runners (all) button sits beside Hold Fire (all), and Alt+H does nothing before then.
- **Rule:** while it is on, a tower never **picks** a `fleeing`-tagged unit or a `youngling` unit as its primary target. It takes the best other target by its priority (§2.6), or waits if there is none. Its attacks are otherwise unchanged, so splash, chains, and multi-target hits can still catch those units. A pulse tower, which picks no target, waits while only spared units are in range, and still catches them when it pulses for another unit. Abilities are unaffected. The global toggle works like Hold Fire's: towers built while it's on start with it on.
- **Why (rule):** sparing must cost nothing in play, not only in the leak and medal rules. The balance harness proves it: the `spareFleeing` policy (the par build with the filter on for every tower) must end with a margin ≥ par margin − 5 ([maps.md §6.4](maps.md#64-balance-harness)). Fleeing units pay a bounty of only 1 ([enemies.md § Fleeing Skitterkin](enemies.md#fleeing-skitterkin)), so the filter gives up almost nothing.
- **Plain Hold Fire is unchanged.** It stops all fire, and it is still the only tool for C1 in A1M5, where the filter doesn't exist yet. The filter is taught in A2M1 by one short line in voice ([../story/campaign/act2.md § A2M1](../story/campaign/act2.md#a2m1--rig-nine)).
- The filter is a sim command (`spareRunners`, separate from Hold Fire), so it is in the command log and the harness can set it ([../tech/architecture.md § Commands](../tech/architecture.md#commands-input-into-the-sim)).

### 2.8 Speed and pause

- Speeds: **1x** and **2x**. Pause at any time (hotkey Space).
- **Rule:** all timers (cooldowns, countdowns, effects) run on simulation time, so 2x halves real-world waits and pause freezes everything. The sim runs a fixed timestep; 2x doubles the rate at which the host's tick accumulator fills, so twice as many fixed ticks run per real second ([../tech/architecture.md § Game speed](../tech/architecture.md#game-speed-pause-and-the-host-loop)).
- 3x is a possible post-game unlock (open question).

### 2.9 Core integrity (lose condition)

- Each map has a **colony core** at the end of its paths. Core integrity starts at **20** (shop upgrades add up to +3; see [progression.md §4](progression.md#4-zibzabs-shop-stardust)).
- A leaking enemy subtracts its **leak cost** (`leak` in enemy data): 1 for small enemies, 2–4 for big ones, and **0** for fleeing Skitterkin and younglings (§2.7). **Rule:** a leaking boss drains all remaining integrity (Emergency Bulkhead can't absorb it); on an Escort map, a boss reaching the safe exit is a defeat ([maps.md §5.2](maps.md#52-objective-variants)).
- **Rule:** integrity never regenerates during a map (a Field Protocol may grant a one-time shield; see [progression.md §5](progression.md#5-field-protocols-meta-perks)).
- At 0 integrity the map is lost immediately. Per D001, a loss has no penalty beyond a retry; the player keeps a share of the Stardust earned ([progression.md §2](progression.md#2-earning-stardust)).
- **Meter labels are map data** (`meterLabel`). Defend maps show **Core integrity**. Escort maps show **Evacuated** (refugees reaching safety) or **Sheltered** (A3M6, refugees reaching the domes). Holdout shows **Evacuated**. The finale shows **Voices** (`meterLabel: 'voices'`, the singers still singing; §2.10). The results-screen counter line follows the same label (§6.2).

### 2.10 Objective variants

Most maps are **Defend** maps (survive every wave with integrity above 0). A few story maps swap the objective. Each variant is a map-data flag, and [maps.md §5](maps.md#5-map-modifiers-and-objective-variants) defines them:

- **Escort:** friendly refugees walk the path *toward safety* while Hollow units chase or intercept them. The meter is relabeled **Evacuated** (or **Sheltered**) and counts refugees who made it. An escort can keep an earlier map's route and change only where it leads: A3M6 walks A1M1's road north to south as before, but the gate at the end now opens into Dome 1 (the Skitterkin are welcome inside). **Only the finale reverses a path** (south to north, going home). A map can **pivot** into Escort mid-map (A2M5).
- **Holdout:** a deliberately unwinnable defense that ends on a **scripted event, not on integrity 0** (A3M3 ends on the SEAL). It is scored by Evacuated, always counts as completed, never blocks progress, and pays a flat reward ([progression.md §2](progression.md#2-earning-stardust)).
- **Protect the asset:** a second, smaller objective (for example the A2M2 extraction rigs or the A3M5 vats) with its own integrity that shares the map's waves.
- **Choir escort (finale):** an Escort whose refugees are the singing choir, plus the song rules (laid to rest, scattering, the countdown) in [maps.md §5.5](maps.md#55-the-leaving-song-finale-rules).

### 2.11 Scripted moments

Story moments that change play are map-script actions ([maps.md §5.1](maps.md#51-layout-and-event-modifiers); tech: [../tech/story-runtime.md § Map scripts](../tech/story-runtime.md#map-scripts-story-driven-sim-changes)). The ones with player-facing rules:

| Moment | Where | Rules |
|---|---|---|
| **Forced single input** | A3M3 (**SEAL**), Finale under C4 Keep (**"Who's there?"**) | Waves, movement, and firing freeze, but **the sim keeps ticking** (animations play, and the command log stays continuous; [../tech/story-runtime.md § Map scripts](../tech/story-runtime.md#map-scripts-story-driven-sim-changes)). Every HUD control, hotkey, and the tower panel lock; only one large button is live, centered low on screen, and the settings menu stays reachable (accessibility). There is no timer and no alternative. **SEAL** waits indefinitely while a looping hum plays; after 20 s of real time Bricks says "Kid. It's okay." (once). Pressing it issues a `scriptInput` command, so the moment is in the command log and the balance harness can press it. Reduced-motion and photosensitivity settings apply ([../story/style-guide.md §8](../story/style-guide.md#8-content-guidelines)). |
| **Tower license revocation** | A3M2 (Sterling, mid-wave); Finale under C4 Keep (QUILL, short) | [towers.md §9](towers.md#9-rules-for-story-driven-tower-changes). |
| **Ability revocation** | A3M2 | Sterling revokes the **Orbital Strike** uplink in the same cue. If it is equipped, slot 1 goes dark for the rest of the map with a "UPLINK REVOKED" stamp. From then on it can't be equipped; Intel spent on Orbital Strike Mk II is refunded. |
| **QUILL lockout** | A3M2, after the revocation | §2.2. QUILL's companion ability (if it is the companion) is disabled for the rest of the map. |
| **QUILL offline** | A3M5, only if `quill_choice = rewrite` | No QUILL ability, no **System Reboot** (QUILL runs it), no QUILL barks or radio lines, and no R&D tip text in the base until A3M5 ends. The briefing's threat intel is still shown, delivered by `system`. You should feel the silence. The other C4 outcomes' in-play effects are in §6.11. |
| **Clickable world object** | A2M3 (the Peeker rock holds Pebble) | While the rock is clickable, clicking it issues an `interact` command and fires its `interacted` trigger (Pebble's rescue cue); the `setClickable` action's fallback trigger (A2M3: W6 cleared) fires the same trigger if the player never clicks (§6.9; [maps.md §5.3](maps.md#53-map-scripts)). |
| **Boss endings** | A1M5, A2M2, A2M5, Finale | `driveOff`, `retreat`, `pivot`, `layToRest` ([enemies.md §6.1](enemies.md#61-boss-scripting)). |

### 2.12 Checkpoints

From **Act II** on, a lost run can be resumed from a checkpoint instead of from wave 1.

- **When.** The game records a checkpoint at the start of every 5th wave (W5, W10, W15, …); how it is stored and restored is in [../tech/architecture.md § Checkpoints](../tech/architecture.md#checkpoints). On a loss, Results offers **"Retry from wave N"** for the latest checkpoint; the run resumes with the towers, credits, meter, cooldowns, and timers it had then.
- **Finale.** The finale also records a checkpoint at the **start of Phase 2** (towers, credits, Voices, and Deep Bore %), so a Phase 2 loss offers "Retry from the Halls" and never replays the Descent.
- **Cost (rule):** a run that used a checkpoint can still earn **Victory** and the first-clear rewards, but **forfeits Perfect Core and the Challenge medal** for that run.
- **No farming (rule):** a defeat after a checkpoint retry pays defeat Stardust only for the waves resolved **in this attempt beyond the checkpoint**, and a defeat on a map already won pays **0** ([progression.md §2](progression.md#2-earning-stardust)).
- Act I and the A3M3 Holdout (which has no defeat) have no checkpoints.

---

## 3. Commander abilities

Enemies can never attack towers, so these abilities are the player's direct way to act on the battlefield. They give agency, spectacle, and an answer to a crisis.

### 3.1 Rules

- **Two ability slots per map:**
  - **Slot 1, Technician:** the player's own ability, chosen in the loadout from those unlocked ([progression.md §7](progression.md#7-rd-tree-intel)).
  - **Slot 2, Companion:** the signature ability of the NPC who accompanies this mission, shown with their portrait. [campaign.md](../story/campaign.md) sets the companion per map. The companion also voices in-map barks and between-wave radio ([../story/style-guide.md §5.5](../story/style-guide.md#55-barks)).
- **No companion:** on a map with no companion the slot is **hidden**, not empty, and there is no fallback ability. The one exception is deliberate (next rule).
- **The finale pick list.** In the finale the player picks who walks with them in the loadout screen: Ves'thara (Stillness, the default), Bramble (Underfoot), Zibzab (Clearance Sale), or QUILL (Time Dilation; not offered under C4 Purge). The balance harness runs the par build with each companion ([maps.md §6.4](maps.md#64-balance-harness)).
- **The empty slot (A3M4).** After Bricks dies, A3M4's map data sets the companion to Bricks in the **`absent`** state: the slot is visible, his portrait is dark (the art's `dark` portrait variant), the button is disabled and has no label, and his radio and bark slots play authored **silence** ([../story/style-guide.md §5.6](../story/style-guide.md#56-special-line-kinds-authoring-conventions)).
- **Bricks has no hero unit.** His presence is the companion slot (Suppressing Fire, portrait, barks) and his turret name tags ([towers.md §8](towers.md#8-presentation-and-personality)). On A1M1, A1M5, A2M6, and the A3M3 Holdout he also appears as a **scripted ally unit** on the map: a person, not a tower, so the 4-tower rule is untouched ([maps.md §5.4](maps.md#54-allies-on-the-map)). The player never places or moves him.
- **Inheritance.** At the end of A3M4, **Suppressing Fire** becomes a Technician ability, equippable in slot 1 from A3M5. Under C4 Keep, **Time Dilation** is also equippable in slot 1 from A3M5 through finale Phase 1 (§6.11).
- Abilities are **ready when wave 1 starts**, then go on cooldown after each use.
- Cooldowns run on sim time and shrink with early wave calls (2.4).
- Targeted abilities can be **aimed while paused**; they fire when play resumes (or instantly if cast during play).
- Abilities follow the same damage rules as towers ([enemies.md §2](enemies.md#2-combat-resolution)). Bosses take reduced control effects as defined there.

### 3.2 Ability roster

Story owners and timing come from [../story/bible.md §12](../story/bible.md#12-mechanics-the-story-needs); [campaign.md](../story/campaign.md) is authoritative for exact maps.

| Ability | Granted by | Effect | Cooldown | Availability (story) |
|---|---|---|---|---|
| **Orbital Strike** | Technician. Sterling's welcome gift (the Everglow uplink) | Targeted, radius 1.5 tiles: 200 Explosive after a 1 s visible targeting reticle. | 45 s | A1M1 (the default Technician ability) until it is **revoked mid-wave in A3M2** (§2.11) |
| **Scanner Sweep** | Technician (R&D) | Targeted, radius 4 tiles: reveals cloaked enemies for 10 s. | 30 s | R&D after A2M1, ahead of the first cloaked enemies |
| **System Reboot** | Technician (free; QUILL patches it in) | Instantly clears **Jammed** on all towers and makes them immune to jamming for 6 s. | 40 s | A3M4, before the first Silencer. Kept under every C4 outcome, but unavailable in A3M5 under C4 Rewrite (§6.11) |
| **Suppressing Fire** | Companion: Sgt. Bricks. Then Technician (inherited) | Targeted path segment (3 tiles): enemies on it are slowed 50% and take 20 Kinetic/s for 5 s. | 50 s | Companion on Bricks's maps from A1M1 through A3M3; Technician from A3M5 |
| **Time Dilation** | Companion: QUILL. Under C4 Keep, also Technician | All enemies slowed 40% for 6 s (bosses 20%). | 60 s | On maps where QUILL is the companion. Under C4 Keep, also a Technician ability from A3M5 through finale Phase 1, then unavailable for all of Phase 2. **Lost permanently under C4 Purge**; unavailable in A3M5 under C4 Rewrite (§6.11) |
| **Clearance Sale** | Companion: Zibzab | Your next 3 builds or upgrades this map cost 40% less. Rule: counted per purchase, not per second, so pausing can't exploit it. | Once per 4 waves | From A1M4 |
| **Stillness** | Companion: Ves'thara | Targeted, radius 2.5 tiles: Stasis for 3 s (bosses: Chilled 50% instead). Interrupts abilities ([enemies.md §2.4](enemies.md#24-status-effects)). | 45 s | From A2M6 (in A2M5 she is the Ward ally) |
| **Underfoot** | Companion: Bramble (the matriarch; "Chitterbloom" is Everglow's codename, and the HUD shows Bramble from A3M1) | Targeted path tile: for 6 s, each ground enemy that crosses it is Pinned 1 s and takes 30 Kinetic. Hits burrowed enemies. | 50 s | From A3M1 |

**Suppressing Fire's segment** is the clicked path tile and one tile either side of it along the route ([decisions.md D031](../decisions.md#d031--2026-11-09--m2-scope-the-m2-cut)), on every route through that tile, shifted inward at a spawn or core so it always covers 3 tiles. It must target a path tile. Its slow is Chilled 50% (the strongest chill wins, so it doesn't stack with a Sprinkler), and its damage lands in beam ticks every 0.25 s, so armor blunts it per second as it does a beam ([enemies.md §2.3](enemies.md#23-damage-pipeline)): it is a crowd-control tool, not an armor answer. It hits every unit on the segment, quiet-wave units included: it is the player's cast, not the ally's.

**Revocations are the betrayal you feel.** Losing Orbital Strike and a tower class in A3M2 is attributable to Sterling on screen (her portrait in the cue, an Everglow "REVOKED" stamp), so the loss reads as hers, not as a bug.

---

## 4. Controls (desktop first)

| Action | Mouse | Key |
|---|---|---|
| Build | Click one of the 4 **build slots** in the HUD's bottom-right corner (only loadout towers, with costs), then click a buildable tile; a placement ghost and range ring follow the cursor ([../art/art-direction.md §9](../art/art-direction.md#9-ui-style)) | 1–4 selects a build slot, then the arrows and Enter (the tile cursor, below) |
| Point at a tile | Move the mouse | Arrows move the **tile cursor**; Enter acts there as a click would |
| Upgrade / specialize / sell / retarget | Click a tower to open its panel | Enter on a tower selects it; U upgrade, S sell, T cycle targeting |
| Call wave early | Click an incoming flag | W |
| Abilities | Click the ability button, then the target | Q (slot 1), E (slot 2) |
| Pause / speed | HUD buttons | Space pause, F toggle 1x/2x |
| Hold fire | Tower panel toggle (one tower) or HUD button (all) | H (selected), Shift+H (all) |
| Spare runners (from A2M1, §2.7) | Tower panel toggle (one tower) or HUD button (all) | Alt+H (all) |
| Cancel | Right-click | Esc (with nothing to cancel, it hides the tile cursor) |
| Back out of a menu (Settings, a Title panel, the Base) | Its Back button | Esc |
| Mute sound (any screen) | The speaker button, top right | M |

**The armed-tower rule.** A battle starts with nothing armed. A build slot (click, or 1–4) arms its tower, and pressing it again disarms. A locked slot doesn't arm and says when it ships ("Thumper ships at wave 3"); an unaffordable one says "Not enough credits". With a tower armed, clicking a free pad builds it, and the slot **stays armed while another copy is affordable**, so several can go down in a row; clicking any other tile says "Can't build there" and keeps the slot armed. Selecting a tower, aiming an ability, Esc, or right-click disarms. Until the first build, slot 1 and the free pads pulse to show where to start.

**The tile cursor (keyboard-only play).** The first arrow key shows a cursor on the playfield (on the selected tower, else where it was last, else on the pad nearest the map's middle), and each arrow moves it to the nearest pad or tower in that direction on screen; while an ability is aimed it moves over every tile instead, so a strike can land on the road (only the path for Suppressing Fire; aiming it, E, snaps a showing cursor straight onto the nearest path tile). Enter does what a click on that tile would: build the armed tower on a free pad, select a tower, or fire the aimed ability. The ghost, range ring, and reticle follow the cursor, and a screen reader hears the tile and what stands on it, and what H, Shift+H, T, and a cast just did ("Rivet holding fire.", "Targeting: Last.", "Orbital Strike fired."; D059). Moving the mouse hides it. The exact rule is in [architecture.md § Rendering](../tech/architecture.md#rendering) (*Input*).

Every control is a hit target of at least **16×16 game px** (32×32 screen px at the 2× scale) so touch support can come later (D001). Key remapping is a backlog item.

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

Systems the story rides on outside the wave loop. Writing rules, lengths, and voice are owned by [../story/style-guide.md](../story/style-guide.md); data shapes are in [../tech/story-runtime.md](../tech/story-runtime.md). Each subsection is the design home for its system.

### 6.1 Character creation and callsigns

- **When:** New Game, before A1M1, framed as an Everglow onboarding form ("Frontier Futures: New Hire Intake").
- **Fields:** **name** (1–16 characters; letters, digits, space, apostrophe, hyphen, and period, so the in-world bitmap font can draw it on a name tag), **pronouns** (she/her, he/him, they/them; each set carries its verb agreement for `{v:…}` tokens), and **`arrival_reason`** (`bonus`: "The signing bonus"; `family`: "Money for family back home"; `lettuce`: "I like lettuce"). The reason only flavors a few lines.
- Name and pronouns can be changed later in Settings; `arrival_reason` can't.
- **Callsign:** Sprout (A1M1) → Thorn (A2M2) → Waykeeper (A3M6), set by dialogue `set` nodes and shown on the HUD (§5). Sterling's employee number **#ED-447** is fixed and shown on memos and the onboarding form.

### 6.2 Results screen and the lifetime counter

- **Pests Processed** is a **lifetime save stat**: +1 for every Skitterkin enemy killed by the player's towers or abilities, on every run, including replays, losses, and retries (the game remembers everything you did). Units gathered by a Maw, scurrying young from a Hauler's sack, and medal-exempt younglings that leak don't count. It's added when a run ends for any reason.
- **Per-act results line** (copy owned by the style guide, [§2](../story/style-guide.md#2-voice-by-act)): Act I `PESTS PROCESSED: {n} ★ Top 5% of Technicians!` (the "Top 5%" is always true, and it's a lie nobody checks); Act II `Pests processed: {n}.` (no star); Act III the counter is **hidden** and replaced by the map's meter line (`Evacuated: {n}.`, `Held.`, or `Sheltered: {n}.`); Finale `REMEMBERED: {n}`. Act I results also show the cheerful star rating; Act III shows no stars at all.
- **Ves'thara reads the live number** in A2M2 through the `{pests_processed}` token, which resolves to the lifetime total plus the current run's kills so far.
- **The countdown:** in the finale's Phase 2 the counter returns at the lifetime total and **counts down to 0** as the Hollow is laid to rest, then flips to **REMEMBERED: {n}**. Its pacing rules are in [maps.md §5.5](maps.md#55-the-leaving-song-finale-rules).
- **Story stamps:** a results screen can carry a story-only stamp (for example A1M5's red "Containment Lapse" when the Quiet Wave was spared). Stamps never change rewards.
- **Held-back toasts (A3M3).** The Holdout's results screen shows no medal toasts or reward fanfare: medals and rewards are recorded silently (they show on the star map and in the base), so the screen plays identically at any score.

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
| `skitterkin_hushed` | A non-ally Skitterkin (a `fleeing` unit) is hushed by a Hollow unit. Once per map |
| `flag` | Entering a map with a given story flag value (for example `spared_quiet_wave`), first build phase only |
| `enemy_leaked` | A specific enemy id (condition) leaks, for the first time this map (A1M2's first Hauler through the gate). It plays after `first_leak` when one leak is both |
| `bank_nudge` | A build phase from W2 on opens with 250+ credits unspent (`BANK_NUDGE_CREDITS`). Once per map; it plays on its own after the countdown's radio, never as a reply to it |
| `neutral_hit` | The player's fire hits a neutral unit (Gerald, A1M3) |
| `tower_issued` | The battle starts with a newly issued tower in the loadout (its first battle in the save), once the briefing closes |
| `menu` | The player enters a base screen (the base, shop, R&D, Engineering, Inbox, codex, or star map) |

Conditions can test the act, the map, flags, and run stats. Only speakers present on the map may bark: QUILL plus the companion.

### 6.4 Everglow Inbox (memos)

- About **one memo per map**, delivered when the player enters the base after results. An unread badge sits on the Inbox; memos never pop up over play.
- A memo has From, To, Subject, body, sign-off, and **small print** (collapsed until clicked; [../story/style-guide.md §6.1](../story/style-guide.md#61-everglow-memos)). The small print is where fair-play clues live, so it must be reachable in one click.
- A memo may carry a **gift** (for example the A1M1 Orbital Strike uplink). The gift is granted when the memo is delivered, not when it's read, so skipping the Inbox never costs anything. (One memo arrives early: the Q3 Bonus memo lands on A2M4's results screen with its 400 Stardust; [progression.md §2.1](progression.md#21-story-hooks).)
- The Inbox keeps every memo, newest first. In Act III memos become terse and automated; after A3M2 the sender line reads "Everglow Automated Systems."
- **As built (T303):** a memo is delivered at the run end that first wins its map (and on entering the base, for a save that missed one), so its gift lands before the next map whether or not the Inbox is opened. The welcome memo `memo_a1_00` is delivered with the new save and is the only source of the Orbital Strike uplink. The Inbox and Codex are the base's first two tabs, with a NEW tag while something is unread. Act I's memo texts live in [`src/content/memos/act1.ts`](../../src/content/memos/act1.ts); the runtime is [story-runtime.md § Other story systems](../tech/story-runtime.md#other-story-systems).

### 6.5 The codex

- Entries unlock on first encounter (enemies, towers, places, people). Each entry has up to three **versions**: `original` (the *Pest Field Guide*, smug Everglow PR with bounty stars), `annotated` (Act II: QUILL's unredactions and Ves'thara's margin notes), and `corrected` (Act III). Each version has its own unlock condition (map progress and flags).
- From A3M1 the codex is retitled ***Field Journal***, and entries with a corrected version show **original and corrected side by side**. The original is never deleted.
- Before Act III, an entry shows its newest unlocked version, with a tab to read older ones.
- **Rule:** the codex is optional depth; nothing in it is required to follow the story or to play.
- **As built (T303):** Act I's originals, 32 entries (every enemy, tower, place, and person the Act I maps list), in [`src/content/codex/act1.ts`](../../src/content/codex/act1.ts). An enemy entry unlocks once the enemy has been met in a run, a tower or ability entry once it's owned, and a place, person, or thing once its map is won. Each shows its picture (the unit's icon, or a prop or portrait; "Photo pending" for the rest). Annotations and corrections arrive with their acts (D064 defers them to M4).

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
| Evie billboard state | `beaming` | `peeling` | `dark` (a hum-glyph painted over the smile) | `dark` |
| Wave-clear jingle | Bright sting | Sting with minor bridges (minor arrangement from A2M4) | **None** (the jingle stops playing) | The song ([../tech/architecture.md § Audio](../tech/architecture.md#audio-srcaudio-m2)) |
| UI act theme and lighting | [../art/art-direction.md §9](../art/art-direction.md#act-themes), [§3](../art/art-direction.md#3-environment-palettes-by-act) | | | |

### 6.8 Ending choice and epilogue cards

- After the finale's Dawn, the **ending choice** (C5) is a full-screen scene with exactly two fixed player lines: "We stay. We keep the way open." and "We go. We give it back." There's no "will remember" feedback.
- **Epilogue cards** then play over the credits: one card per topic slot, in order, each the first card whose flag condition matches ([../story/bible.md §10](../story/bible.md#epilogue-cards); each ≤ 240 characters). Cards advance on a timer (about 6 s) or on click, and the last card is the counter: **PESTS PROCESSED: 0**, then **REMEMBERED: {n}**, while the jingle plays in a major key.
- The final HUD image depends on the ending (`stay`: the old status line reads **PERIMETER STATUS: OPEN**). After the credits the post-game star map opens, and loading tips switch to "Remember them."

### 6.9 The Peeker

- On every Act I map, a youngling hides behind a rock on a decor tile near a warren mouth ([maps.md §7](maps.md#7-storytelling-with-the-map)). It peeks out every 20–40 s of play. Clicking it plays a squeak and a duck animation and sets `peeker_poked` (once is enough). It has no effect on play, rewards, or medals.
- **In Act I a poke is a UI event, not a command.** It changes nothing in the sim, so it never enters the command log; story records it and sets `peeker_poked` ([../tech/story-runtime.md § Flags](../tech/story-runtime.md#flags)). The rock is still a named marker in map data (`peeker`), and the peeking animation is render-only.
- **A2M3 (A1M2 revisited): Pebble's rescue is player-triggered.** From W5 the rock holds Pebble: a `setClickable` script action makes the `peeker` marker a **clickable world object** and shows the highlight ([maps.md §5.3](maps.md#53-map-scripts)). Clicking it issues an `interact` command (valid only while the marker is clickable), so it is in the command log, and fires the `interacted` trigger once: the rescue cue (Bricks picks her up). The `setClickable` action carries a fallback trigger (A2M3: W6 cleared) that fires the same `interacted` trigger if the player never clicks, so the story always lands. In A3M6 Pebble sits on top of the A1M1 rock.

### 6.10 Joke of the Shift and the optional bark button

- **Joke of the Shift.** On A1M1–A1M5, one of QUILL's radio slots per map is the **Joke of the Shift**, a short joke in its policy-and-lettuce voice (copy: [../story/campaign.md](../story/campaign.md)). It plants the jokes that pay off later.
- **Optional bark button (rule).** A radio line or bark may carry **one optional reply button** in the comms panel (for example the knock-knock joke's **"Who's there?"**). It is the finale's single-button grammar, rehearsed with nothing at stake:
  - It never pauses the game, blocks input, locks any control, or covers the playfield; the player can keep building, and hotkeys stay live.
  - It is mouse-only (no hotkey) and at least 16×16 game px, inside the comms panel.
  - It disappears when its line auto-dismisses. Ignoring it is always fine: there is no penalty, no timer on screen, and no reprompt.
  - Pressing it plays the authored reply line and emits a story-side UI event. It is **not a sim command**, so it can't affect play, the command log, or the balance harness. Story may record that it was pressed.

### 6.11 QUILL's directives (C4) in play

C4 ([../story/bible.md §9](../story/bible.md#c4-quills-directives-after-a3m4)) changes play from A3M5 on. Each outcome has a cost and a benefit, and none is required to win.

| Outcome | Cost | Benefit |
|---|---|---|
| **Purge** | Time Dilation is lost for good (QUILL leaves the finale pick list), and QUILL's Rapport is refunded ([progression.md §7.3](progression.md#73-command-abilities-and-protocols)). Finale rest points ×1.0 ([maps.md §5.5](maps.md#55-the-leaving-song-finale-rules)). | **Unbound:** with no Directive 0, QUILL attacks Everglow systems from inside. From A3M5, every Everglow Security unit spawns with **−2 armor** (minimum 0; an open maintenance-panel tell), and in finale Phase 1 the **Deep Bore fills at 75% speed**. |
| **Keep** | Directive 0 fires when the choir enters the Halls (a class revocation, then the "Who's there?" forced input; [towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)), and **Time Dilation is unavailable for all of Phase 2**. | QUILL stays at full strength through A3M5 and A3M6, and **Time Dilation becomes an equippable Technician ability** (slot 1) from A3M5 through finale Phase 1. Finale rest points ×1.25. |
| **Rewrite** | QUILL is offline for A3M5 (§2.11), so **System Reboot is unavailable in A3M5**. Suppressing Fire (Technician from A3M5, §3.1) is the slot-1 alternative, Hum Choir still answers jamming, and the harness runs A3M5 that way. | Finale rest points ×1.5 (the countdown runs fastest). |

The rest multipliers survive the finale's Phase 2 length rule (±30% of the target time, [maps.md §6.4](maps.md#64-balance-harness)), because the target time is set at Keep's ×1.25: Purge runs about 25% longer and Rewrite about 17% shorter.


---

## Open questions

1. **3x speed** as a post-game unlock, or available from the start?
2. **Overlapping waves.** Is starting the countdown when spawning ends (not when the wave dies) too punishing in Act I? An alternative is a Story-difficulty-only rule that the countdown waits for the wave to resolve.
3. **Spared threshold.** Is 75% of the Quiet Wave the right line between "spared" and "cleared"? A player who holds fire but loses a couple to a stray splash should still count as sparing.
4. **"Not firing" detection.** Ten seconds with Skitterkin in range and no shots fired may trigger by accident on maps with poor coverage. Should it also require Hold Fire to be on, at the cost of missing players who spare by placement?
5. **Pests Processed on quit.** Kills are added when a run ends. Closing the tab mid-map loses that run's count. Acceptable, or should the host flush the count on `pagehide`?
