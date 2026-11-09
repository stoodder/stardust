# Maps

Grid rules, tile types, paths and lanes, map modifiers and objective variants, the difficulty curve, the balance harness, and using maps for storytelling.

> **Numbers:** every number in this doc is a **first-pass tuning value** unless it is labeled a **rule**. Once the content files exist, they become the home for exact numbers, and this doc keeps roles, rules, and target ranges (see [../tech/architecture.md](../tech/architecture.md)).
>
> **Ordering:** this doc defines *what* maps are made of and *how hard* they should be. [../story/campaign.md](../story/campaign.md) is **authoritative** for the map-by-map list, each map's story beats, and which tower, enemy, or modifier each map introduces.

Related docs: [core-loop.md](core-loop.md) (building rules, the wave loop, objectives) · [towers.md](towers.md) (tile bonuses in the stacking formula) · [enemies.md](enemies.md) (movement layers, wave design rules) · [progression.md](progression.md) (reference profiles, medals) · [../art/tech-spec.md](../art/tech-spec.md) (isometric tile size) · [../art/art-direction.md](../art/art-direction.md) (palettes per act) · [../tech/architecture.md](../tech/architecture.md) (sim and render split, map loading).

---

## 1. Grid and coordinates

- **Rule:** maps are a **logical square grid** of tiles addressed by `(col, row)`. The renderer projects it into 2:1 isometric diamonds. The pixel size of a tile is owned by [../art/tech-spec.md](../art/tech-spec.md#1-isometric-spec).
- **Rule:** all gameplay distances (range, radius, splash, aura, adjacency) are measured on the logical grid in **tiles**, as Euclidean distance between tile centers (or entity positions). The renderer draws a circular range as an ellipse in isometric projection.
- Towers sit at their tile's center. Enemies move continuously along path polylines through tile centers.
- **Adjacency (rule):** two tiles are adjacent if they share an edge or a corner (8-neighborhood). Synergy links ([towers.md §6](towers.md#6-synergy-links-adjacency)) and the Lookout Shack use this.
- **Map size targets:** see the per-act table in §6.1. **Rule:** campaign maps fit on one screen without panning, which per [../art/tech-spec.md §1](../art/tech-spec.md#1-isometric-spec) means `cols + rows ≤ 36`. Only endless mode and post-game challenge maps may exceed this and pan.

---

## 2. Map anatomy

A map has: one or more **spawns**, one or more **ground paths** from spawns to the **core**, optional **air lanes** and **rift lanes**, **buildable tiles** (some of them special), **wreckage**, and **decor** (unbuildable scenery).

A small example (Act I scale). Legend in §3.

```
. . . . . . . . . . . . . .
S # # # # # # . . o o . . .
. . o o . . # . ^ o . . . .
. . o + . . # # # # # . . .
. . . . . . . . o x # . . .
. . . o o ^ . . o o # . . .
. . . . . # # # # # # . . .
. . . . . # . o o . . . . .
. . . . . # # # # # # # C →
. . . . . . . . . . . . . .
```

(The `→` after the core marks where the path continues beyond the perimeter into the wilderness; see §7.)

---

## 3. Tile types

| Char | Tile | Buildable | Effect | Notes |
|---|---|---|---|---|
| `#` | **Path** | **Never (hard rule)** | Enemy ground route | |
| `o` | **Pad** | Yes | — | The standard buildable tile |
| `^` | **High ground** | Yes | Tower **+25% range** | 1–3 per map. Placing it is a map's main spatial decision. It is drawn raised by one elevation step. **Rule:** paths never run over high ground and there are no ramps, so gameplay stays flat (this answers art's multi-level question: one raised level, buildable only). |
| `+` | **Power node** | Yes | Tower **+20% fire rate** (support towers: +20% aura strength) | 1–2 per map. Contested with high ground and links. |
| `x` | **Wreckage** | Not until cleared | Clearing pays **salvage** (30–80 credits, per map data), then the tile becomes the tile underneath (usually a Pad, sometimes a high ground or power node) | See the clearing rules below |
| `.` | **Decor / blocked** | No | — | Domes, rocks, crystals, buildings. Air lanes and rift lanes may cross it. |
| `S` | **Spawn** | No | Enemy entry point | The portal look is per faction (art) |
| `C` | **Core** | No | The colony core (the lose condition, [core-loop.md §2.9](core-loop.md#29-core-integrity-lose-condition)) | |

**Wreckage clearing (rules):**
- Click a wreckage tile to send the **salvage drone**. Clearing takes **6 s** of sim time, and only one wreckage clears at a time (a queue is allowed). It costs nothing.
- A Salvage Crane in range doubles clearing speed and adds +25% salvage ([towers.md](towers.md#vrell-towers)).
- Map data defines what lies underneath. A hidden power node under wreckage is a deliberate discovery reward, and the map's intel can hint at it ("QUILL: reading a power signature under that junk").
- **Script-added wreckage** (the crash-site modifier, §5.1) appears only on **decor tiles predefined in map data** (named crash-site `markers`, §5.3), never on a pad, path, or built tower's tile, so no event ever takes a tile the player is using.
- **Memorial wreckage** (a story variant) can't be cleared. It is decor with a codex tooltip. It never blocks a tile the par build needs. The canonical one is the wreck of the turret Bricks named `{name}` in A3M3, standing on the ridge above Okonkwo's Gap on the finale route: its sprite is the wrecked variant of the tower type that carried the tag (saved as `memorialTower`, [towers.md §8](towers.md#8-presentation-and-personality)), and its tooltip shows the name tag.

**Pad scarcity (design principle):** buildable tiles are a designed resource, not filler. Every pad should matter: it covers a stretch of path, sits next to a link partner, or is contested. Target pad counts are in §6.1.

---

## 4. Paths and air lanes

- **Ground paths** are ordered tile sequences from a spawn to the core. They are 1 tile wide (Act III and the finale may use 2-wide lanes; enemies get a small visual offset only).
- **Rule (route format):** a path lists **every tile it walks, ends included**: the spawn `S` first, then only `#` tiles, then the core `C` last, each step one tile up, down, left, or right (no diagonals, no gaps). Every `#` and `S` tile on the map lies on some path; a decorative road is drawn as decor. An enemy spawns at the `S` tile's center and leaks when it reaches the `C` tile's center, so it visibly walks into the gate. Content compile rejects a path that breaks this, so a path can't cross a buildable tile. (Escort maps' safe exits extend the last-tile rule when the first Escort map lands.)
- **Forks:** a path can fork and merge. **Rule (determinism):** each enemy's route is fixed by the wave data (`route` ID), never chosen at random at runtime. The wave preview shows which fork each group takes.
- **Multiple spawns:** allowed from Act I late. Each spawn's flag shows in the wave preview.
- **Air lanes:** flyers follow straight or gently curved polylines from an air spawn to the core. They ignore ground paths and may cross any tile. The lane is drawn dotted whenever a flyer is in the current or next wave.
- **Rift lanes (Act III, Hollow only):** ground routes that cut through decor where no path should exist. They appear as cracks that open, telegraphed one wave ahead. **Rule:** a rift lane never passes over a buildable tile, so "towers never on paths" holds in both directions. Rift-lane enemies are ground units for targeting.
- **"First" targeting** measures remaining distance along each enemy's own route ([towers.md §5](towers.md#5-targeting)).

---

## 5. Map modifiers and objective variants

A menu for [campaign.md](../story/campaign.md) to pick from. How many a map may introduce follows the counting rules in §6.3: a difficulty modifier counts as a new threat, and a story event is limited to one per map.

### 5.1 Layout and event modifiers

| Modifier | What it does | Recommended act | Complexity |
|---|---|---|---|
| **Second spawn** | Two entry points | Act I late | Low |
| **Forked path** | One spawn, two routes, assigned per group | Act I mid | Low |
| **Air lane** | Flyers on their own route | Act I mid | Low |
| **Salvage yard** | Lots of wreckage; the economy is about clearing order | Act I late | Low |
| **Gates** | Scripted path switches between waves, telegraphed one wave ahead | Act II | Medium |
| **Dust storm** | On specific telegraphed waves, all tower ranges −20% | Act II | Medium |
| **Corrupted node** | A **tile state**: the Hollow corrupts a power node mid-map, and the node's bonus is **suppressed** (it acts as a plain pad) until the map's next boss wave. It never debuffs the tower on it, and the bonus returns the moment the state ends. Announced one wave ahead. | Act III | Medium |
| **Rift lanes** | Hollow units take new routes through terrain (§4) | Act III | Medium |
| **Crash site** | A scripted event adds new wreckage mid-map (for example a downed Everglow gunship), only on predefined decor tiles (§3) | Act III | Low |
| **License revocation** | A scripted event powers down one tower class with a 100% refund ([towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)) | A3M2 (Sterling); finale under C4 Keep (QUILL) | High |
| **QUILL lockout** | The wave preview hides for the rest of the map; QUILL leaks each wave's key trait instead ([core-loop.md §2.2](core-loop.md#22-wave-preview)) | A3M2 | Medium |
| **QUILL offline** | No QUILL ability, barks, or R&D tips this map ([core-loop.md §2.11](core-loop.md#211-scripted-moments)). Applied only when the map's flag condition holds (`quill_choice = rewrite`) | A3M5 | Low |
| **Sundown** | The lighting overlay fades in across the map's waves, ending in full Long Night darkness ([../art/art-direction.md §3](../art/art-direction.md#3-environment-palettes-by-act)). As it deepens, towers outside every light source lose range, up to **−15%** at full dark. Light sources negate it within their radius: map lamps (map data) and a firing **Prism Spire** (radius 2.0; [towers.md §7](towers.md#prism-spire-prism)), so the Spire's beam pushes the dark back and nearby towers keep full range | A2M6 | Low |
| **Secondary timer** | A second progress bar on the HUD that fills on sim time and changes later difficulty when it fills, never ending the map by itself. The finale's **Deep Bore** (§5.5) | Finale | Medium |
| **Revisit** | The same layout as an earlier map with changed dressing and an added outer band (see §7) | Any | Low (reuse) |

### 5.2 Objective variants

These are introduced in [core-loop.md §2.10](core-loop.md#210-objective-variants).

| Variant | Rules | Medals |
|---|---|---|
| **Defend** (default) | Survive all waves with integrity above 0. | Victory / Perfect Core / Challenge |
| **Escort** | There is no core. Friendly **refugees** (Skitterkin using the Act I sprites with the `skitterkin.ally` palette, or colonists) walk the path to a **safe exit**, in groups of **6**, spaced **0.6 tiles** apart, at **0.7 tiles/s**. The meter is relabeled **Evacuated** (A3M6: **Sheltered**) and counts refugees who reached the exit, against the map's total. Hollow enemies hush refugees, one each, under the hush rule ([enemies.md § The hush rule](enemies.md#the-hush-rule)). Each enemy that reaches the exit, a Heavy one included, hushes one refugee already sheltered there (it follows them in; Everglow units that reach it reseal a dome door instead, the same rule presented as repossession). **A boss reaching the exit is a defeat.** Defeat also comes if the lost count passes the map's `maxLost`. **Rules:** refugees can't be targeted or harmed by towers or abilities, never stop to fight, and **Pebble is never a loss condition** (she rides with a group and can't be hushed). **Direction:** a route can keep an earlier map's road and change only its destination. A3M6 walks A1M1's road **north to south, as in A1M1**; what flips is the gate at the end, which now opens into Dome 1 at the **A1M1 core position**, the gate you defended in map 1. Only the finale reverses a route (south to north). **Pivot:** a map can start as Defend and switch to Escort mid-map through a script action (A2M5; [enemies.md §6.1](enemies.md#61-boss-scripting)); the meter switches label then. | Perfect = no refugee lost |
| **Holdout** | A deliberately unwinnable escalation that **ends on a scripted event, not on integrity 0**. A3M3 (Okonkwo's Gap): refugees from the side chosen in C3 (`door_choice`: the colonist convoy or the warren) cross the map to the blast doors while Hollow waves escalate; Bricks holds the choke as a scripted ally (§5.4). When the map's last refugee group is through, or its final wave starts, the **SEAL** forced input fires ([core-loop.md §2.11](core-loop.md#211-scripted-moments)) and the map ends when it is pressed. There is no core and no defeat; the meter is **Evacuated** and the score is Evacuated. It always counts as completed, pays a **flat** Stardust reward ([progression.md §2](progression.md#2-earning-stardust)), shows no medal toasts on its results screen ([core-loop.md §6.2](core-loop.md#62-results-screen-and-the-lifetime-counter)), and the SEAL beat plays identically at any score. Use it **once** in the campaign. The briefing must say plainly that the goal is how many get out. | Challenge medal tiers by Evacuated; Perfect isn't applicable (it is replaced by a second score tier) |
| **Protect the asset** | A second objective (the A2M2 extraction rigs, the A3M5 vats, a convoy, or a dome) has its own small integrity on a branch path. Losing it is defeat. | Perfect = neither damaged |
| **Choir escort** | The finale: an Escort whose refugees are the singing choir (meter **Voices**), plus the song rules in §5.5 | Perfect = no singer hushed |

### 5.3 Map scripts

A map's `events` are triggers with actions, run **inside the sim** so headless runs stay faithful ([../tech/story-runtime.md § Map scripts](../tech/story-runtime.md#map-scripts-story-driven-sim-changes)). Dialogue cues are just one action among many. Every story event in §5 and in [core-loop.md §2.11](core-loop.md#211-scripted-moments) is expressed this way. **Rules:** every script action that changes difficulty is foreshadowed in the briefing; a script may read story flags (for example `door_choice`, `spared_quiet_wave`) but never sets one (story sets flags from run stats at map end); and every flag combination that changes the sim gets its own balance-harness run (§6.4).

- **Cue ids.** A between-wave radio cue is named `<map>_wNN` (two-digit wave: `a1_m01_w03`); other cues add a descriptive suffix (`a2_m05_cue_pivot`).
- **Markers.** Map data can name tiles and points (`markers`: the Peeker rock, Bricks's post, a crash site, the banner line) so scripts, objectives, and Challenge conditions refer to places by name instead of coordinates.
- **Clickable world objects.** A `setClickable` script action makes a marker **clickable** (it gets the art's clickable highlight). While it is clickable, clicking it issues an `interact` command (rejected at any other time), so it is in the command log and headless runs can replay it, and fires the `interacted` trigger once. A clickable beat that the story needs always gives `setClickable` a **fallback** script trigger (for example "W6 cleared") that fires the same `interacted` trigger if the player never clicks. The first use is Pebble's rescue in A2M3 ([core-loop.md §6.9](core-loop.md#69-the-peeker)). Clicks that change nothing in the sim (the Act I Peeker) are UI events, not commands.
- **Tower unlocks.** Map data's `towerUnlockWave` holds a loadout tower back until a given wave; it runs as an unlock script action at the **start of that wave's countdown** (the build phase before it), so A1M1's Thumper unlocks when W3's countdown starts. Until then the tower's build slot shows locked.
- **Optional objectives.** `objectives` (Objective Intel, [progression.md §3](progression.md#3-medals-and-intel)) are conditions in the same grammar as Challenge medals, each with an Intel value and optional script actions to run when completed (A3M5's "Cut the Feed" shrinks a later wave).

### 5.4 Allies on the map

Scripted friendly units, separate from the player's towers. None of them uses a pad or counts toward the 4-tower loadout, and the player never places or moves them. Their numbers are map data. **Rule:** allies with an attack (Bricks, militia) never target units tagged `quiet_wave` or `fleeing`, or `youngling` units ([core-loop.md §2.7](core-loop.md#27-hold-fire)); sparing is always the player's choice.

| Ally | Maps | Behavior | Can be hurt? |
|---|---|---|---|
| **Bricks** (in person) | A1M1, A1M5, A2M6, A3M3 | Stands at a fixed **post** beside the path and fires his rivet cannon (Kinetic, about one Rivet T1's worth of DPS) at the nearest enemy. In A1M5 he lowers his cannon for the Quiet Wave (the rule above). In A3M3 his post is *on* the choke: Hollow units that reach him stop and wear him down instead of passing (he blocks). **His health follows a scripted wave timeline** in map data, falling to a 5% floor near the end before the SEAL whatever the player's DPS, so no score can be read as having failed him. | Only in A3M3 (by the Hollow, on the timeline) |
| **Refugees** | Escort and Holdout maps | Walk the route to the safe exit (§5.2) | Hushed by Hollow |
| **Brood Hauler bearers** | A3M5, finale | Walk the route carrying the vats' unsung dead home. In A3M5 they're the Protect-the-asset payload; in the finale, extra bearers join under C2 Return (§5.5) | Hushed by Hollow (A3M5: losing them costs asset integrity) |
| **Colonist militia** | A3M6 and the finale, under C3 Convoy | 2–3 posts beside the path firing Kinetic at Hollow units (low DPS, long range). | No |
| **Choir** | Finale | §5.5 | Singers can be hushed; Pebble and Old Thrum can't |
| **Ward** (the kneeling Sunderglass Penitent) | A2M5 after the pivot | Stationary; Hollow inside its radius are Chilled ([enemies.md §6.1](enemies.md#61-boss-scripting)) | No |
| **Swarmlings and leapers** | Any map with Skitterkin towers | Owned by their tower ([towers.md](towers.md#skitterkin-towers)) | Never |

**Hushed allies recover.** Story rule: the hushed recover when the Hollow is laid to rest, so hushed refugees and singers return at Dawn (finale) and in the epilogue; nothing an escort map loses is a death on screen.

### 5.5 The Leaving Song (finale rules)

The finale is one map in three phases (splittable into two maps at the Phase 1 / Phase 2 boundary, [../story/bible.md §6](../story/bible.md#finale-clearing-the-way-1-map-in-3-phases-splittable-into-2--the-first-dawn)).

**Phase 1, the Descent (Choir escort).** The choir walks the Long Walk **south to north**, from the colony to the Deep Halls, with Hollow units coming from every side (three spawns, air lanes, and rift lanes). The route passes the memorial wreckage at the Gap (§3).
- **The choir** is an ally group led by **Pebble** (and **Old Thrum** beside her if `spared_quiet_wave`). It moves at a fixed pace and **halts while any Hollow unit is within 1.5 tiles ahead of the leader**, so clearing its road keeps it moving. The meter is **Voices** (`meterLabel: 'voices'`): the number of singers still singing. A hushed singer stops singing and trails behind. Defeat if fewer than the map's `minVoices` remain.
- **The song aura** is a circle around the choir leader (base radius 2.5 tiles). It is also a warm-gold light source in the darkness overlay. Its radius grows with the number of singers still singing.
- **The Deep Bore** (secondary timer) fills over sim time while Phase 1 runs and stops when Phase 2 begins. At Phase 2 start, each 10% of Bore progress adds +5% HP to the Unsung; if the Bore fills completely before the choir arrives, it breaks through: one extra Hollow surge spawns and the bar stays full. It never ends the map. Under C4 Purge the Bore fills at 75% speed ([core-loop.md §6.11](core-loop.md#611-quills-directives-c4-in-play)).

**Checkpoint.** The game records a checkpoint at the start of Phase 2 (towers, credits, Voices, Bore %), so a Phase 2 loss retries from the Halls ([core-loop.md §2.12](core-loop.md#212-checkpoints)).

**Phase 2, the Unsung.** The choir stands at the mouth of the Halls and sings "Everglow Bright" as the Leaving Song. The Unsung (design's *Unmaking*, [enemies.md §6](enemies.md#6-bosses)) comes up from below.
- **Laid to rest:** a Hollow unit destroyed **inside the song radius** is laid to rest: warm-gold motes rise, it is gone for good, and it adds **rest points** (its `restValue`, default 1, bosses' adds more).
- **Scattered:** a Hollow unit destroyed **outside** the song radius scatters into cold-violet motes that drift back 2 tiles along its route and **re-form after 4 s at 50% max HP**, once. It pays no bounty the second time. (This rule is active in the finale only. Before the finale, destroyed Hollow units stay gone.)
- **The countdown:** the HUD counter returns at the lifetime **Pests Processed** total *N* and shows `round(N × (1 − p))`, where `p = restPoints / restTarget` (capped at 1). The song also adds a steady trickle of rest points per second, so the phase can't stall. `restTarget` is tuned so the par build reaches `p = 1` in a **fixed target time** (about 3 minutes at 1×, measured at Keep's ×1.25 rest multiplier) whatever *N* is, so the sequence length never depends on how much the player killed. The other choices move it by at most about +25% (Purge) and −17% (Rewrite), inside the ±30% harness check (§6.4), so the multipliers stay felt.
- **Modifiers by choice flags:**

| Flag | Effect on the song |
|---|---|
| `spared_quiet_wave = true` | Old Thrum sings beside Pebble: song radius +0.5 tiles (a stronger choir) |
| `spared_quiet_wave = false` | **Thrum's echo** appears in Phase 2 among the Unsung: a scripted, **untargetable** Hollow figure that walks into the song radius on its own and is laid to rest in gold (no rest-point cost or gain); Pebble: "Grandmother. She heard." ([../story/campaign/finale.md](../story/campaign/finale.md)) |
| `stardust_choice = returned` | **The Returned:** 2 extra Brood Hauler bearers walk with the choir, each with its own 1-tile song aura; their sacks warm from violet to gold as `p` rises |
| `door_choice = warren` | A bigger choir (more singers, so a larger radius) |
| `door_choice = convoy` | A smaller choir, plus colonist militia posts (§5.4) |
| `quill_choice = rewrite` | QUILL reads its log into the song: rest points ×1.5. The countdown runs fastest |
| `quill_choice = keep` | Rest points ×1.25. When the choir enters the Halls, **Directive 0** fires: QUILL revokes one tower class (refunded, [towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)), then the **"Who's there?"** forced input ([core-loop.md §2.11](core-loop.md#211-scripted-moments)); pressing it restores the class. Time Dilation is unavailable for all of Phase 2 |
| `quill_choice = purge` | Rest points ×1.0, and `restTarget` is not reduced, so the phase lasts longer. (Purge's benefits land earlier: the slower Bore in Phase 1 and weaker Everglow armor, [core-loop.md §6.11](core-loop.md#611-quills-directives-c4-in-play)) |

- **The Unsung's last phase** is scripted to the countdown: it can't drop below 1% HP, damage dealt to it inside the radius feeds rest points, and at `p = 1` it is laid to rest ([enemies.md §6.1](enemies.md#61-boss-scripting)).

**Phase 3, Dawn.** No waves and no combat. The counter reaches 0, the remaining Hollow units turn gold and rise, hushed singers recover, and the first sunlight crosses the valley from the east edge (lighting: [../art/art-direction.md §3](../art/art-direction.md#finale-dawn-through-the-dark-finale)). The map is won when Dawn's closing scene ends; the results screen reads **REMEMBERED: {n}**.

---

## 6. Difficulty curve

### 6.1 Per-act targets

| Act | Grid (approx.) | Buildable tiles | Waves | Length at 1x | Spawns | Start credits | Par band: Defend / Protect (integrity %) | Par band: Escort (Evacuated %) |
|---|---|---|---|---|---|---|---|---|
| I | 14 × 10 | 8–12 | 6–10 | 6–9 min | 1 (2 by late Act I) | 250–350 | **80–100** | — |
| II | 18 × 12 | 12–16 | 10–14 | 9–13 min | 1–2, plus air | 400–550 | **65–85** | **65–85** |
| III | 22 × 14 | 14–20 | 14–20 | 12–18 min | 2–3, plus air and rift | 550–800 | **50–70** | **50–70** |
| Finale | 22 × 14 | 18–22 | 25–30 | 20–25 min | 3, plus air and rift | ~900 | — | **40–60** (Voices %) |

**Par margin** is what the par build (§6.4) has left at the end on Standard: remaining integrity ÷ max integrity (including Reinforced Core ranks) on Defend and Protect-the-asset maps, and the meter % (Evacuated, Sheltered, or Voices) on Escort and Choir maps. Integrity absorbed by Emergency Bulkhead doesn't count as lost. A *lower* par margin means a harder map. **Rule (par band):** the par build's margin must land **inside** its act's band. Below the band the map is too hard for the intended solution; above it (the top is the floor + 20 points) the map is trivial for it. A map may override its band in its build data with a comment saying why. The Holdout (A3M3) has no band; it asserts an Evacuated floor of **50%** instead (§6.4). The band floors and width, and the harness's other thresholds (the 20% forgiving floor, the +10 early-call slack, the 5-point monotonic tolerance), live in code in [`src/balance/rules.ts`](../../src/balance/rules.ts); if they differ from this section, fix one of them.

**Difficulty curve rules:**
- **Rule (monotonic, two chains):** Defend/Protect maps and Escort maps form **two separate chains** in campaign order, because an integrity % and an Evacuated % don't measure the same thing. Within each chain, each map's par margin is ≤ the previous map's in that chain (5 points of tolerance), so each map is harder than the last (vision pillar 5). The first map after a boss may re-baseline within that tolerance. The Holdout belongs to neither chain.
- **Rule (counters matter):** for each of a map's `requiredCounters` (§6.3), a build that lacks that counter (for example no detection on a cloaked map) must **lose** before the final third of the map. A map whose counter test comes late by design may push that wave later in its build data (`noCounterLoseByWave`, never later than the second-to-last wave, with a comment saying why). The one exception is a **teach map**, the map that introduces a required-counter category (`teachMap: true`, checked by the validator): it may ask for the loss only by its final wave. A1M2, where armor is first required, is one.
- **Rule (no-counter builds):** a map has **exactly one** `noCounterBuilds` entry per required counter, defined **by category**: it leaves out *every* answer that category lists in [enemies.md §3.1](enemies.md#31-counter-categories), not just the obvious one, and is otherwise a sensible build. For Air: no Skyhook, Rivet, Zapcoil, or any other tower that hits air on that lane. For Shield: no Energy damage and no Soaked. The same pattern holds for every category. **An alt build must not match any no-counter build:** each alt build carries an answer for every required counter.
- **Rule (forgiving floor):** a sensible non-par build that uses the right counters must win on Standard with a margin of **≥ 20%**. On Story difficulty, a weak scripted build must win.
- **Rule (no single-wave wall):** a build that falls short must feel it coming. In every alt build's run, including the **under-built** alts that model a player who stops building or never upgrades, no single wave costs more than **50%** of max integrity, and a build that loses starts leaking at least **one wave before** the wave it loses in ([D028](../decisions.md#d028--2026-11-09--m1-review-round-2-rulings)).
- **Rule (real loadout choice, from A1M4):** every map from A1M4 on has at least **two `altBuilds`**, each sharing **at most 2 towers** with the par build's loadout, and each must win with a margin of **≥ 20%**. So no loadout is the only answer.

### 6.2 Threat budget (planning tool)

Designers plan waves with a rough **threat value** per enemy, computed from its data:

```
threat = (hp + 1.5 × shield) × (1 + armor / 10) × sqrt(speed) × traitFactor
traitFactor: cloaked 1.3 · flying 1.1 · burrowing 1.2 · blink/phasing 1.2 · any aura 1.5 · jammer 1.5 · consumer 1.5
splitting: add the children's threat
```

- **Wave threat** = Σ threat of its enemies.
- Within a map, wave threat grows **8–12% per wave**, with spikes on "test" waves and boss waves.
- The **first wave** of a map is about 60–70% of the previous map's last wave (a breather while the player sets up).
- The **peak wave** of a map is about 10–15% above the previous map's peak, adjusted for the growth in the reference profile.
- **Soft traits (rule):** **soft enemies** (defined by the trait → category table, [enemies.md §3.1](enemies.md#31-counter-categories): a trait in a category the map doesn't require, and no trait in one it does; intel-only traits never count) make up at most **15%** of any wave's threat. Validation checks this. Exemptions: **`fleeing`-tagged units count as 0 threat** (they leak for 0; [enemies.md § Fleeing Skitterkin](enemies.md#fleeing-skitterkin)), and a map's designated **teach wave** for a newly introduced trait (flagged `teach: true` in wave data, at most one per new trait) is exempt from the 15% cap.
- The factors and the 15% share are rule data in [`src/content/rules.ts`](../../src/content/rules.ts); with several factor traits, the factors multiply. The threat budget is only for planning. **The balance harness (§6.4) decides.**

### 6.3 One new thing per map

- **Rule:** every campaign map introduces **at least one** new element: a tower, enemy type, trait, tile type, modifier, objective variant, or story event.
- **Rule:** a map introduces **at most two new threats**. New player tools (towers, abilities), tiles, objective variants, allies, and presentation or economy modifiers (Revisit, salvage yard, crash site) don't count against the limit.
- **Counting threats (rules, applied by the validator):**
  1. A new threat is a new hostile enemy type, a new combat trait on a known enemy (for example Skittish), or a new **difficulty modifier** (air lane, second spawn, rift lanes). An enemy that brings its own new trait counts as **one** threat; the air lane arrives with the first flyer and counts with it.
  2. A **capstone boss** built only from mechanics already taught is exempt (Chitterbloom, the Sunderglass Penitent, Shareholder Value, the Gathering Maw, the Unsung). A boss that previews new mechanics counts (the Glass Witch).
  3. A **scripted story event** (A3M2's Clean Exit cue, which carries the license revocation, the Orbital Strike revocation, and the QUILL lockout; QUILL offline; Sundown; the Deep Bore) counts as **one story event**, separately from threats. At most one per map, always foreshadowed in the briefing.
- **Threat intel and required counters.** Map data lists `threatIntel` (every trait present in the waves, shown as briefing icons; always complete) and, separately, `requiredCounters`: at most **3** counter categories ([enemies.md §3.1](enemies.md#31-counter-categories)) the map demands, each backed by exactly one `noCounterBuilds` entry that omits that category and must lose (§6.1). Everything else in the intel is a soft trait (§6.2). **Rule:** a map adds at most **one new required-counter category** compared with all earlier maps. Wave-design detail: [enemies.md §7](enemies.md#7-wave-design-rules).
- A new threat follows teach → test → twist ([enemies.md §7](enemies.md#7-wave-design-rules)).
- The actual map-by-map introduction list lives in [campaign.md](../story/campaign.md).

### 6.4 Balance harness

The sim is deterministic and headless (see `/CLAUDE.md` and D002's test loop), so balance is **tested**, not guessed.

Each map's data includes:
- `referenceProfile`: what a Standard player owns at that point ([progression.md §10](progression.md#10-pacing-targets-and-tuning-assumptions)).
- `parBuild`: a scripted loadout, placement order, upgrade order, and targeting settings that a designer considers a good-but-not-optimal solution.
- `noCounterBuilds`: exactly one scripted build per entry in `requiredCounters`, each omitting every answer in that category (§6.1; a map with no required counters, such as A1M1, has none).
- `altBuilds`: sensible non-par builds (at least two from A1M4, §6.1), with optional `altExpectations` per build: a stricter floor than 20%, or a margin below par's. An alt build can instead be marked **under-built** (`outcome: 'lose'` or `'either'`): a player who stops short, held to the no-single-wave-wall rule (§6.1) instead of the forgiving floor.

The harness runs, per map:
1. **Par build, Standard:** must win, with its margin **inside the par band** (§6.1). If it casts a commander ability, the same build without those casts must score lower: the ability has to matter.
2. **No-counter builds:** each must lose before the final third.
3. **Alt builds:** each must win with a margin of ≥ 20% (or its `altExpectations` floor), below par's margin where `altExpectations` says so, and (from A1M4) there are at least two, each sharing at most 2 towers with the par loadout. Under-built alts don't have to win. Every alt build passes the no-single-wave-wall rule (§6.1).
4. **Par build, Story:** must win comfortably.
5. **Monotonic check:** par margin ≤ the previous map's in the same chain (§6.1, within tolerance).
6. **Purchasable:** the reference profile is affordable on its timeline and the par build uses only what it owns ([progression.md §10](progression.md#10-pacing-targets-and-tuning-assumptions)).
7. **Meta can't replace a counter:** a full-catalog meta profile (every shop item, protocol, and slot, with the protocols **Head Start**, **Emergency Bulkhead**, and **Linked Up** equipped) running each of the map's `noCounterBuilds` must still lose.
8. **`alwaysCallEarly`:** the par build with every wave called the instant its countdown starts must end with a margin ≤ `min(bandTop, parMargin + 10)` ([core-loop.md §2.4](core-loop.md#24-early-wave-call)).
9. **Reports:** credits over time, leaks per wave, DPS per tower, link uptime, and jam uptime (≤ 25% rule, [enemies.md §4](enemies.md#4-tower-disabling-jamming)).
10. **Story variants:**
    - Forced inputs are pressed by the build script (`scriptInput` steps).
    - A1M5's par build must also win with Hold Fire on the Quiet Wave, and that run must end with `spared_quiet_wave = true` (allies never fire on it).
    - Every flag combination that changes the sim (§5.3) runs its own par check.
    - Mixed waves and escorts run with the hush rule on ([enemies.md § The hush rule](enemies.md#the-hush-rule)).
    - Maps with `fleeing` units also run **`spareFleeing`**: the par build with Spare runners on for every tower ([core-loop.md § Spare runners](core-loop.md#spare-runners)). Its margin must be ≥ par margin − 5.
    - A3M5 under `quill_choice = rewrite` runs with Suppressing Fire in slot 1 (no System Reboot; [core-loop.md §6.11](core-loop.md#611-quills-directives-c4-in-play)).
    - Holdout maps assert an Evacuated floor instead of a win (A3M3: 50%).
    - The finale runs the par build once per **companion on the pick list** ([core-loop.md §3.1](core-loop.md#31-rules)), and asserts that Phase 2 lasts within **±30%** of its target time for every `quill_choice` (§5.5).

How the harness encodes these is in [../tech/conventions.md § Balance sims](../tech/conventions.md#balance-sims-npm-run-sim).

**A1M1, the tutorial.** A1M1 has `requiredCounters: []`: it must never punish a player who skips the Thumper, so it has no no-counter run. Its harness runs are: do-nothing loses; par wins inside the band; par without its strikes scores lower; a **Rivet-only** build wins at a lower margin than par and at ≥ 40%; par one purchase short (`par_minus_last`) wins at ≥ 40%; `alwaysCallEarly`; and two under-built alts, par never upgraded (`no_upgrades`, which may win or lose) and two setup Rivets with nothing after (`two_rivets`, which must lose), both held to the no-single-wave-wall rule, so an under-built player is never wiped in one wave. Splash first becomes a required counter at A1M4.

**The M1 cut.** Under [D004](../decisions.md), M1 shipped A1M1 without adjacency links (Crossfire), tile bonuses, medals, Suppressing Fire, or the Bricks ally, and tuned its par build without them. Links and tile bonuses are live since T202a, which nudged A1M1 only enough to keep the harness green (par skips the Thumper's tier 2, and W5's and W7's Zoomer groups grew to 14; par now wins at 100). T125 re-tunes it with medals, Bricks, and Suppressing Fire. In M1 the Sprinkler (sim-tested content, not placed on A1M1) applies Chilled only; Soaked is left out until a map needs it. A1M1's reference profile carries no meta purchases (nothing has been bought yet).

---

## 7. Storytelling with the map

- **The path tells the twist (rule).** In Acts I–II every Skitterkin spawn faces the Spires (north) and every exit leads to open wilderness, never into a colony building. Skitterkin spawns sit on the map edge facing the Hollow's region. The core sits *on the perimeter*, and the path visibly continues past it into open wilderness. Skitterkin were never going *to* the colony; they were going *through* it ([../research/emotional-storytelling.md §1](../research/emotional-storytelling.md#how-stardust-should-apply-this)). That is readable in hindsight from map 1.
- **Special tiles carry the setting:**

| Act | High ground | Power nodes | Wreckage | Decor |
|---|---|---|---|---|
| I (sunny, whimsical) | Greenhouse roofs, irrigation towers | Hydroponic pump stations | Toppled lettuce carts, crashed delivery drones | Domes, cheerful Everglow billboards |
| II (dusk, uneasy) | Aelari crystal outcrops, canyon ledges | Glowing stardust conduits | Broken mining rigs | Mining scars, the first Skitterkin warrens |
| III (the Long Night, desperate) | Ruined HQ terraces | Damaged, sometimes corrupted, conduits | Your own former Everglow defenses, downed gunships, memorial wrecks | Dark billboards with the hum-glyph, rift-cracked ground, cold-violet unsung stardust |
| Finale (night into dawn) | Halls-mouth ledges | Natural stardust seams (warm gold: sung) | The Gap memorial | The Long Walk's old waymarks, glowing fungus lanterns |

- **Revisits as a timeline.** A revisit reuses an earlier map's layout (`revisitOf`) with new dressing. **Rules:** the revisit may be larger, sized for its act, with the original grid **centred** inside it and a new outer band around it; the **original pads stay unchanged** (same tiles, same bonuses, except where the story cuts one, as A2M3's mining cut does), and **new pads appear only in the added band**; the band must read as visibly new, so the revisit feels like a return, not reuse. The campaign's four:

| Original → revisit | What changes |
|---|---|
| A1M2 The Terraces → **A2M3** Second Look (dusk) | Mining cuts across the terraces, exposed warrens with eggs, grey soil, everything running south. The Peeker's rock now holds Pebble |
| A1M4 Admin Plaza → **A3M2** License Revoked (night) | Same plaza and billboards, now dark; Everglow Security enters along the old path; the Audit's podium is empty |
| A1M1 Dome Row → **A3M6** Let Them In (night) | Same path and gate, walked **north to south as in A1M1**; the destination flips: the gate is now the safe exit and opens into Dome 1. Goldie's domes open, Pebble on the Peeker rock |
| A2M4 Second Harvest → **A3M5** Unsung (night) | The plant at maximum throughput, vats glowing violet, Tidybots gone, bearers at the intake |

- **State-dependent dressing.** Dressing layers can carry a flag condition, so choices show on the map: for example the `door_choice` memorial (a blast door painted HE HELD THE DOOR under `convoy`) in A3M4's shelters and the finale, the Fun Friday banner in the shelters, and Bricks's memorial wreck on the finale route (§3).
- **The Peeker** sits behind a rock on every Act I map ([core-loop.md §6.9](core-loop.md#69-the-peeker)); the rock is a named marker on decor (clickable only while a script sets it, as in A2M3; §5.3) where a warren mouth or brush line meets the path.
- **Evie billboards** carry the act's billboard state ([core-loop.md §6.7](core-loop.md#67-per-act-presentation-dials)).
- **The Hollow's edge:** on maps that show the Hollow's region, that edge darkens act by act, even before the Hollow appears.
- The palette darkens across acts per [../art/art-direction.md](../art/art-direction.md).

---

## 8. Post-game maps

- **Challenge maps:** handmade maps with fixed modifiers and special rules (for example "only Skitterkin towers" or "every wave is cloaked"). Each awards Intel for its medals.
- **Endless mode:** a dedicated map with waves generated procedurally from the threat budget (§6.2), escalating forever, with a local high-score table. Generation uses the deterministic RNG and is seeded, so a run can be shared by seed.
- **Veteran replays** of campaign maps: [progression.md §6](progression.md#6-veteran-modifiers-replays).

---

## 9. Map data shape (for implementers)

The type is `MapDef` in [`src/content/types.ts`](../../src/content/types.ts) (overview: [architecture.md § Data shapes](../tech/architecture.md#data-shapes)). This table says what each field means for design and where its rules live.

| Field(s) | Design meaning | Rules |
|---|---|---|
| `id`, `act`, `size`, `tiles`, `underWreckage`, `salvage` | Identity, grid, and tiles (legend in §3); what lies under each wreckage tile and what it pays | §1, §3 |
| `paths`, `airLanes`, `riftLanes` | Routes from spawns to the core or safe exit | §4 |
| `objective`, `meterLabel` (`integrity`, `evacuated`, `sheltered`, `voices`), `maxLost`, `minVoices`, `evacuatedFloor`, `coreIntegrity` | What the map asks and how the meter reads | §5.2, [core-loop.md §2.9](core-loop.md#29-core-integrity-lose-condition) |
| `startCredits`, `stardust` | In-map economy start and first-clear reward | §6.1, [progression.md §2](progression.md#2-earning-stardust) |
| `waves`, `threatIntel`, `requiredCounters` | Wave groups (enemy, count, interval, spawn, route, tags); every trait present; the ≤ 3 counters the map demands | §6.2, §6.3, [enemies.md §7](enemies.md#7-wave-design-rules) |
| `medals`, `objectives` | The Challenge medal and optional objectives, both as `ConditionDef`s; an objective also has an Intel value and optional `onComplete` script actions | [progression.md §3](progression.md#3-medals-and-intel) |
| `companion`, `allies`, `towerUnlockWave` | Who is in slot 2 (`present`, `absent`, or the finale's pick list); scripted allies, including Bricks's A3M3 health timeline; towers held back until a given wave | §5.4, [core-loop.md §3.1](core-loop.md#31-rules), §5.3 |
| `events`, `markers`, `song` | Map scripts (triggers and actions); named places (the Peeker rock and other clickable objects, Bricks's post, crash sites); the finale's song rules | §5.3, §5.5 |
| `revisitOf`, `dressing`, `presentation` | The map a revisit reuses; flag-conditioned dressing layers; per-map overrides of the act dials | §7, [core-loop.md §6.7](core-loop.md#67-per-act-presentation-dials) |
| `referenceProfile`, `parBuild`, `noCounterBuilds`, `altBuilds` | The balance harness's inputs | §6.4 |

**Validation rules** (design intent; the checks as built are listed in [`src/content/validate.ts`](../../src/content/validate.ts) and its parts): paths follow the route format (§4) and so never cross buildable tiles; rift lanes never cross buildable tiles; crash sites are decor tiles; every path connects a spawn to the core (or the safe exit); `threatIntel` matches every trait present in `waves`; `requiredCounters` has at most 3 entries from the category table ([enemies.md §3.1](enemies.md#31-counter-categories)), each with exactly one matching `noCounterBuilds` entry that uses none of that category's answers, and adds at most one new category over earlier maps; no `altBuilds` entry lacks an answer to a required counter; soft enemies stay within 15% of every wave's threat; the map introduces at most two new threats and one story event (§6.3 counting rules); every par build uses only what its reference profile owns; from A1M4, at least two `altBuilds`, each sharing at most 2 towers with the par loadout.

---

## Open questions

1. **Camera:** campaign maps are capped at `cols + rows ≤ 36` (one screen). Is 22 × 14 enough room for the finale's three spawns, air and rift lanes, and the choir's walk, or should the finale alone be allowed to pan?
2. **Dust storm** shrinking range may feel unfair if it isn't telegraphed well. Keep it, or swap it for a pure visual?
3. Should the par build be **authored by hand** per map or **searched automatically** by the harness (for example a simple greedy placer)? Hand-authored first; automated search could come later.
4. **Choir halting.** Halting the choir while Hollow are near its leader makes the Deep Bore timer meaningful, but it can feel like an escort-quest stall. Playtest against a constant-pace choir.
5. **Escort leak rule.** Is "an enemy reaching the exit hushes one sheltered refugee" readable, or should leaks only cost a flat amount?
