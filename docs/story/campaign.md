# Campaign

The authoritative map-by-map campaign: the order of maps, what each one introduces, its story beats, its choices, its medals, and the reference strategy the balance harness plays. It expands the beat sheets in [bible.md §6](bible.md#6-the-arc-act-by-act) and the choices in [bible.md §9](bible.md#9-the-choices). Mechanics, numbers, and rules live in `docs/design/` and are linked, not restated: [core-loop.md](../design/core-loop.md), [towers.md](../design/towers.md), [enemies.md](../design/enemies.md), [progression.md](../design/progression.md), [maps.md](../design/maps.md). Voice and line limits come from [style-guide.md](style-guide.md); every sample line here fits them (dialogue ≤ 120 characters, barks ≤ 80, after worst-case token substitution).

Map IDs: `A1M1` is data id `a1_m01`; the finale `FIN` is `fin_m01` ([../tech/conventions.md](../tech/conventions.md)). Spoilers throughout.

---

## 1. Shape of the campaign

**18 maps: 5 + 6 + 6, plus a one-map finale in three phases.** This is the bible's spine unchanged. (The vision's "about 17" counts the three acts; the finale is the eighteenth.) No map is added by default:

- **A2M5 stays one map.** Its pivot works if the boss half is short (the Colossus pivots at 50%, so its blink phase is never reached) and the escort half is gentle (the escort is *introduced* here and *tested* in A3M1). **Split trigger:** if A2M5's median 1x playtime exceeds 15 minutes, split into A2M5a *The Glass Witch Returns* (Defend + Colossus, phase 3 restored) and A2M5b *The Long Walk* (Escort). Both keep A2M5's flags and rewards split 50/50.
- **The finale stays one map,** because a results screen between the walk and the song would break the ritual. It gets a **phase checkpoint** instead (a loss in Phase 2 offers "Retry from the Halls"; see §8). **Split trigger:** median 1x playtime over 25 minutes → `fin_m01` (the Descent) and `fin_m02` (the Unsung and Dawn), 19 maps total.
- **"Night Shift" is a base vignette, not a map.** A light-combat map would break the monotonic-difficulty and one-new-thing rules, and grief needs a pause, not a dip. It plays in the Perimeter Office after A3M4 (§5, A3M4 entry).

**Timeline.** One Tumble day is ~38 standard days; the campaign spans ~7 weeks. Day numbers below drive Bricks's pension count (412 days on day 2), memo dates, and the light.

| Days | Light | Maps |
|---|---|---|
| 1–16 | The Long Afternoon | A1M1 (d1), A1M2 (d2), A1M3 (d5), A1M4 (d9), A1M5 (d14) |
| 17–30 | The Long Dusk | A2M1 (d18), A2M2 (d20), A2M3 (d23), A2M4 (d25), A2M5 (d27), A2M6 (d30, sunset) |
| 31–49 | The Long Night (19 days) | A3M1 (d32), A3M2 (d34), A3M3 (d36), A3M4 (d38), A3M5 (d42), A3M6 (d47), FIN (d49) |
| 50 | The First Dawn | FIN Phase 3 |

---

## 2. Overview

Every map has three medals: **Victory**, **Perfect Core** (Escort: no refugee lost; Protect: neither objective damaged; Holdout: a second score tier), and a **Challenge** named below. Companion = the slot-2 ability ([core-loop.md §3.1](../design/core-loop.md#31-rules)); QUILL speaks on every map regardless.

| ID | Name | Act | Objective | Biome (`env`) | Waves | New enemies | Towers unlocked / gifted | Companion (ability) | Choice | Challenge medal |
|---|---|---|---|---|---|---|---|---|---|---|
| A1M1 | Orientation Day | I | Defend (tutorial) | Dome Row (`act1`) | 7 | Nibbler, Zoomer | Rivet, Thumper (issued); Orbital Strike (Sterling's gift) | Bricks (Suppressing Fire) + Bricks ally | — | Teamwork Makes the Dream Work™ |
| A1M2 | Brood Season | I | Defend | The Terraces (`act1`) | 8 | Chonk, Brood Hauler | Frostline Sprinkler | Bricks | — | Aim for the Sack! |
| A1M3 | Special Delivery | I | Defend + Gerald (neutral) | Mail Road (`act1`) | 8 | Puffwing | Skyhook; shop opens after (Zapcoil sample, Crane license) | QUILL (Time Dilation) | Early ask opens | Return to Sender |
| A1M4 | The Audit | I | Defend | Admin Plaza (`act1`) | 9 | Elder, Bunchling | Zapcoil (first use); R&D Engineering opens after | Zibzab (Clearance Sale) | — | Asset Recovery |
| A1M5 | Record Quarter | I | Defend + boss | Northern Gate (`act1`) | 10 | Digger, **Matriarch Chitterbloom** | Lookout Shack stocked after | Bricks + Bricks ally | **C1** (implicit) | Party Pooper Prevention |
| A2M1 | Rig Nine | II | Defend | The Diggings (`act2.gold`) | 10 | Mote | Harpoon stocked, Scanner Sweep in R&D after | Bricks | — | Hiccup Contained |
| A2M2 | The Glass Witch | II | Protect the rigs + boss | Ridge Rigs (`act2.gold`) | 11 | Glimmer, **The Glass Witch** | — | QUILL (Time Dilation) | — | Glass Half Empty |
| A2M3 | Second Look | II | Defend (revisit A1M2) | The Terraces at dusk (`act2.gold`→`act2.dusk`) | 11 | Facet Warden, Lightwing | — | Bricks | — | Clear Skies |
| A2M4 | Second Harvest | II | Defend | Reclamation Facility 2 (`act2.dusk`) | 12 | Veilwalker, Blinkstrider | Q3 Bonus (+400 Stardust) before | Zibzab (Clearance Sale) | **C2** (debrief) | Nothing Unseen |
| A2M5 | The Long Walk | II | Defend → Escort (pivot) + boss | Preserve Road (`act2.dusk`) | 12 | Aegis Cantor, **Sunderglass Colossus** | Prism Spire (gift, debrief); Mindspike + Lantern attunable | Bricks | — | Kneel |
| A2M6 | Sundown | II | Defend + Sundown | Colony perimeter (`act2.dusk`→night) | 14 | Fracture, Rift Moth | (Prism first use) | Ves'thara (Stillness) + Bricks ally | — | Before the Dark |
| A3M1 | The Preserve | III | Escort | The Preserve (`act3`) | 14 | Maw | Brood Burrow (gift, briefing); Hum Choir if C1 spared (debrief); Stasis Bloom attunable | Chitterbloom (Underfoot) | C1 payoff | Nothing Gathered |
| A3M2 | License Revoked | III | Defend + revocation (revisit A1M4) | Admin Plaza at night (`act3`) | 15 | Compliance Drone, Expediter | — (loses a Halcyon class and Orbital Strike) | Bricks | — | Back on Your Feet |
| A3M3 | The Gap | III | **Holdout** | Okonkwo's Gap (`act3`) | 14 | Undertow | — | Bricks + Bricks ally (blocker) | **C3** (briefing) | Held / Held the Door |
| A3M4 | Empty Slot | III | Defend | The Shelters (`act3`) | 16 | Silencer, Liability-Class Enforcer | System Reboot; Hum Choir (if not yet); Gloop (if warren); jailbreak in base | Bricks (**absent**) | **C4** (debrief) | Keep the Lights On |
| A3M5 | Unsung | III | Protect the bearers + boss (revisit A2M4) | Second Harvest at night (`act3`) | 17 | Auditor, Maintenance Associate, **"Shareholder Value"** | Sproing Pad (gift); Suppressing Fire (Technician) | Ves'thara (Stillness) | — | Declined |
| A3M6 | Let Them In | III | Escort (**Sheltered**) + boss (revisit A1M1) | Dome Row at night (`act3`) | 18 | Asset Recovery Gunship, Black Budget Operative, **The Gathering Maw** | Gloop (if convoy); Zibzab's crate | Zibzab (Clearance Sale) | — | Nothing Repossessed |
| FIN | Clearing the Way | Finale | Choir escort → Leaving Song → Dawn | The Long Walk to the Deep Halls (`finale`) | 26 | **The Unsung** | — | Player's pick of who walks with you (default Ves'thara) | **C5** after | Laid to Rest |

---

## 3. Counting rules

[maps.md §6.3](../design/maps.md#63-one-new-thing-per-map) allows at most two new threats and one new modifier per map. The roster (27 enemies, 6 bosses) plus Act III's story events can't fit in 18 maps × 2 under the strictest reading, so this doc counts as follows (design should adopt these in the validator, §8):

1. **A new threat** is a new hostile enemy type, a new combat trait on a known enemy (Skittish), or a new **difficulty modifier** (air lane, second spawn, rift lanes). A new enemy that brings a new trait is **one** threat. The air lane arrives with the first flyer and counts with it.
2. **A capstone boss** whose every mechanic is already taught is not a new threat: Chitterbloom, the Colossus, Shareholder Value, the Gathering Maw, and the Unsung. **The Glass Witch counts**, because she previews shield pulses and blinking.
3. **Story events** (the A3M2 Clean Exit cue, which is one cue carrying the license revocation, the Orbital Strike revocation, and QUILL lockout; QUILL offline; Sundown; the Deep Bore), **presentation modifiers** (Revisit), **economy modifiers** (salvage yard, crash site), objective variants, allies, towers, abilities, and tiles are **novelties, not threats**. At most one story event per map, always foreshadowed in the briefing.
4. **Every map still introduces at least one new thing** (§4.7 lists them).

---

## 4. Introduction schedule

"Teach → test → combine" ([enemies.md §7](../design/enemies.md#7-wave-design-rules)): **teach** = alone or in a small slow group with a NEW badge; **test** = mixed with known threats later in the same map; **combine** = paired with a new modifier or faction on a later map.

### 4.1 Towers and specialization access

Specs are bought in R&D ([progression.md §7.1](../design/progression.md#71-engineering-specializations)) once the tower is owned **and** Engineering is open. **Engineering opens after A1M4**, when Sterling signs off your tier approvals (her second gift; small print: "contingent on Q3 extraction targets"). R&D's Command branch opens after A1M1. The first in-map tier-4 choice is taught in A1M5.

| Tower | Available from | How | Designed first use | Specs purchasable from | Link debut |
|---|---|---|---|---|---|
| Rivet Autoturret | A1M1 | Issued | A1M1 W1 | after A1M4 | Crossfire A1M1 |
| Thumper Mortar | A1M1 (build button unlocks at W3) | Issued | A1M1 W3 | after A1M4 | Crossfire A1M1; Sitting Ducks A1M2 |
| Frostline Sprinkler | A1M2 | Issued | A1M2 | after A1M4 | Sitting Ducks A1M2; Conductive A1M4 |
| Skyhook Flak Battery | A1M3 | Issued | A1M3 W3 | after A1M4 | Skywatch A2M4 |
| Zapcoil | Shop opens after A1M3 | Free sample ("Price first: your next visit.") | A1M4 | after A1M4 | Conductive A1M4; Resonance A2M6 |
| Salvage Crane | Shop, after A1M3 (200) | Licensed | A1M4 salvage yard (alt build) | on license, after A1M4 | Reel It In A2M2+; Finders Keepers A3M1+ |
| Lookout Shack | Stocked after A1M5 (150) | Licensed | A2M4 (required) | on license | Overwatch, Skywatch A2M4 |
| Grapple Harpoon | Stocked after A2M1 (250) | Licensed | A2M3 Wardens; A3M2 armor | on license | Reel It In; Pinned Down A3M3 |
| Prism Spire | A2M5 debrief | Gift (Ves'thara) | A2M6 | on gift | Resonance A2M6; Lightsong A3M1+ |
| Mindspike Obelisk | After A2M5 (3 Intel) | R&D attunement | A2M6 (reference: A3M2) | on attune | Stillmind, Harmony A3M1+ |
| Seer's Lantern | After A2M5 (3 Intel) | R&D attunement | A3M6 Black Budget (alt to Lookout) | on attune | Lightsong; Lookie Here A3M5+ |
| Stasis Bloom | After A3M1 (3 Intel) | R&D attunement | A3M3 Undertows; A3M5 interrupts | on attune | Pinned Down, Stillmind A3M3 |
| Brood Burrow | A3M1 briefing | Gift (Chitterbloom's warren) | A3M1 | on gift | Splash Zone, Finders Keepers A3M1 |
| Hum Choir | A3M1 debrief if `spared_quiet_wave`; else A3M4 briefing | Gift (Thrum's ring / the shelter elders) | A3M2 or A3M4 | on gift | Harmony A3M2+; Bounce Chorus A3M5+ |
| Gloop Spitter | A3M4 briefing if `door_choice = warren`; A3M6 briefing if `convoy` | Gift (the warren Bricks saved / the warren regathered) | A3M4 Liability or A3M6 | on gift | Acid Rain, Sticky Flak |
| Sproing Pad | A3M5 briefing | Gift (Pebble's friend "Boing" and the leapers) | A3M5; A3M6 gunships | on gift | Lookie Here, Bounce Chorus A3M5 |

**Loadout choice begins at A1M4**, the first map where the player owns more than four tower types. A1M1 skips the loadout screen.

### 4.2 Abilities

| Ability | Slot | First available | Ends | Teach |
|---|---|---|---|---|
| Orbital Strike | Technician | A1M1 (welcome memo gift) | Revoked mid-wave A3M2 (Mk II Intel refunded) | A1M1 W5 prompt |
| Suppressing Fire | Companion (Bricks) | A1M1 | Companion through A3M3; **Technician from A3M5** (granted in A3M4's closing scene) | A1M1 W4 prompt |
| Time Dilation | Companion (QUILL) | A1M3 | Lost forever under C4 Purge (finale pick list) | A1M3 W5 |
| Clearance Sale | Companion (Zibzab) | A1M4 | — | A1M4 W1 |
| Scanner Sweep | Technician | R&D after A2M1 (2 Intel) | — | A2M4 (optional detection) |
| Stillness | Companion (Ves'thara) | A2M6 (she is the Ward ally in A2M5) | — | A2M6 W5 vs Rift Moths |
| Underfoot | Companion (Chitterbloom) | A3M1 | Finale pick list | A3M1 W4 vs the first Maw |
| System Reboot | Technician | A3M4 briefing (QUILL patches it in; kept under every C4) | — | A3M4 W4, first Silencer |

Between A3M2's revocation and A3M4, slot 1 holds only Scanner Sweep if the player bought it; otherwise it is empty. At the Gap the player has only Bricks's ability. That is intended.

### 4.3 Enemies and bosses

| Enemy | Teach | Test | Combine | Notes |
|---|---|---|---|---|
| Nibbler | A1M1 W1 | A1M1 W5, W7 | A1M5 (boss sneezes), A2M1 (Skittish) | Youngling form: the Quiet Wave; ally sprites in Act III |
| Zoomer | A1M1 W4 | A1M1 W6 | A1M2 W6, A2M1 W1 | |
| Chonk | A1M2 W3 | A1M2 W4 | A1M3 W4, A1M4 W5 | First armor "plink" |
| Brood Hauler | A1M2 W5 (one, alone) | A1M2 W7–8 | A1M4 W7, A2M3 W3 (cargo visible), A2M4 | Friendly bearer A3M5, FIN |
| Puffwing | A1M3 W3 | A1M3 W5 | A1M5 W6, A2M1 W2 | Brings the air lane |
| Bunchling | A1M4 W2 | A1M4 W3, W5 | A1M5 boss phase 2, A2M1 W7 | |
| Elder | A1M4 W4 | A1M4 W6, W9 | A1M5 W5 and the Quiet Wave (Old Thrum), A2M3 W8 | |
| Digger | A1M5 W2 | A1M5 W4 | A2M1 W2, boss phase 2 | Burrowing taught as "not a hard requirement" |
| Mote | A2M1 W3 | A2M1 W6, W9 | Every later map | First Hollow; Skittish groups run ahead |
| Glimmer | A2M2 W2 | A2M2 W4–5 | A2M3, A2M4, A2M5 | First shields |
| **The Glass Witch** | A2M2 W11 | — | — | Retreats at 40% |
| Facet Warden | A2M3 W4 | A2M3 W7 | A2M4 W8, A2M5 W2 | |
| Lightwing | A2M3 W6 | A2M3 W7 | A2M4 W8, A2M5 W4 | |
| Veilwalker | A2M4 W3 | A2M4 W7 | A2M4 W11, A2M5 (cloaked shards) | First cloak |
| Blinkstrider | A2M4 W6 | A2M4 W9 | A2M5 W3 | |
| Aegis Cantor | A2M5 W1 | A2M5 W2, W4 | Colossus pulses W5 | |
| **Sunderglass Colossus** | A2M5 W5 | — | — | `pivot` at 50% or when W6 starts |
| Fracture | A2M6 W3 | A2M6 W6 | A3M1 onward | |
| Rift Moth | A2M6 W5 | A2M6 W9 | A3M1, A3M3, A3M6, FIN | |
| Maw | A3M1 W4 | A3M1 W7, W12 | A3M3, A3M4 | Gathers refugees on escorts |
| Compliance Drone | A3M2 W3 | A3M2 W4, W6 | A3M4, A3M5 (boss hangar), A3M6, FIN | Halcyon Security debut |
| Expediter | A3M2 W5 | A3M2 W6, W9 | A3M4, A3M6 | |
| Undertow | A3M3 W3 | A3M3 W7 | A3M4, A3M6, FIN (Unsung phase 3) | |
| Liability-Class Enforcer | A3M4 W2 | A3M4 W8 | A3M5, A3M6 | |
| Silencer | A3M4 W4 | A3M4 W6, W9 | A3M5, A3M6, FIN (Unsung phase 4) | First hushing; System Reboot given first |
| Maintenance Associate | A3M5 W2 | A3M5 W6 | A3M6, FIN | |
| Auditor | A3M5 W4 | A3M5 W7, W9 | FIN (Bore security) | |
| **"Shareholder Value"** | A3M5 W14 | — | — | Phase 3 jettison makes wreckage (crash site) |
| Asset Recovery Gunship | A3M6 W3 | A3M6 W9 | FIN | |
| Black Budget Operative | A3M6 W5 | A3M6 W9 | FIN (two, Bore escort) | |
| **The Gathering Maw** | A3M6 W16 | — | — | Comes up the road behind the last group |
| **The Unsung** | FIN Phase 2 | — | — | `layToRest` |

**Hostile Skitterkin end at A2M4.** The last Skitterkin the player can kill are the fleeing groups in A2M4's post-truth waves; from A2M5 the Skitterkin on the path are refugees. So the counter's last increase happens on the map where the player learns what it counts, and the A2M5 and A2M6 results lines show the same number, unchanged.

### 4.4 Traits, modifiers, objectives, and story events

| Element | Kind | First appears | Teach → test |
|---|---|---|---|
| Fast | Trait | A1M1 W4 (Zoomer) | W6 rush |
| Armored | Trait | A1M2 W3 (Chonk) | Haulers W7–8 |
| Flying + air lane | Trait + modifier | A1M3 W3 | W5 flock |
| Splitting | Trait | A1M4 W2 | W3, W5 |
| Huddle | Trait | A1M4 W4 | W6, W9 |
| Burrowing | Trait | A1M5 W2 | Boss phase 2 |
| Second spawn | Modifier | A1M5 W3 | W7–8 |
| Youngling (non-hostile young) | Wave modifier | A1M5 W10 (Quiet Wave) | A2M1 W5, A2M3 W1 |
| Skittish + `fleeing` tag (mixed waves) | Trait | A2M1 W1 | W4 with Motes |
| Shielded | Trait | A2M2 W2 | W4–5 |
| Shield pulse, blink | Boss previews | A2M2 W11 | Cantor A2M5; Blinkstrider A2M4 |
| Protect the asset | Objective | A2M2 | A3M5 |
| Revisit | Presentation | A2M3 | A3M2, A3M5, A3M6 |
| Cloaked | Trait | A2M4 W3 | W7, W11 |
| Blink | Trait | A2M4 W6 | W9 |
| Shield-recharge aura | Trait | A2M5 W1 | W2, W4, boss |
| Escort + mid-map pivot + Ward ally | Objective | A2M5 W6 | A3M1 (full escort) |
| Phasing | Trait | A2M6 W5 | W9 |
| Sundown | Story event | A2M6 | — |
| Gathering (consumer) | Trait | A3M1 W4 | W7, W12 |
| Rift lanes | Modifier | A3M1 W2 | W6, W11 |
| Haste aura | Trait | A3M2 W5 | W6, W9 |
| Clean Exit cue (revocation + lockout) | Story event | A3M2 mid-W7 | — (finale echo under Keep) |
| Holdout + blocker ally + SEAL | Objective | A3M3 | — (used once) |
| Heavy armor | Trait | A3M4 W2 | W8 |
| Jammer (hushing) | Trait | A3M4 W4 | W6, W9 |
| Empty companion slot | Story event | A3M4 | — |
| Healer aura | Trait | A3M5 W2 | W6 |
| QUILL offline (Rewrite only) | Story event | A3M5 | — |
| Crash site | Economy | A3M5 (boss jettison) | — |
| Sheltered escort, militia allies | Objective / allies | A3M6 | FIN |
| Choir escort, song, Deep Bore, forced "Who's there?" | Objective / story event | FIN | — |

**Not used in the campaign:** Gates, Dust storm, Corrupted node, Forked path (beyond the A2M2 rig branch, which belongs to its Protect objective), and the Colossus's phase 3 (only if A2M5 splits). They are reserved for challenge maps and endless mode ([maps.md §8](../design/maps.md#8-post-game-maps)). The campaign has no slot for them under §3; adding one would push a roster entry out.

### 4.5 Tiles

| Tile | First appears | Notes |
|---|---|---|
| Path, pad, decor, spawn, core | A1M1 | |
| High ground | A1M1 (greenhouse roof) | QUILL prompt W2 |
| Power node | A1M2 (pump station) | Sprinkler on it |
| Wreckage + salvage drone | A1M3 (crashed delivery drones, "Gerald's colleagues") | |
| Hidden node under wreckage | A1M4 (salvage yard) | "Reading a power signature under that cart." |
| 2-wide lanes | A3M6, FIN | |
| Memorial wreckage | FIN (the turret named `{name}`) | Never on a par tile |

### 4.6 Systems

| System | Introduced | Where it ends or turns |
|---|---|---|
| Character creation, callsign Sprout | Before A1M1 | Thorn A2M2 debrief; Waykeeper A3M6 debrief |
| Build, upgrade, sell, core integrity, wave preview, countdown | A1M1 | |
| Results counter `PESTS PROCESSED ★` and Tidybots | A1M1 | Plain from A2M1; hidden from A3M1; countdown FIN |
| Halcyon Inbox, R&D Command | After A1M1 | Automated after A3M2 |
| Early wave call, targeting priorities | A1M2 (W6 Zoomers; W3 Strong on Chonks) | |
| Pest Bounty Board, Stardust payout | A1M2 | Kip's row "on assignment" A2M4; gone A3M1 |
| Bricks's name tags | A1M2 (Denise) | `{name}` at A3M3; silence at A3M4 |
| Hold Fire | A1M3 (Gerald) | Quiet Wave A1M5; Gerald again A3M4 |
| Zibzab's shop, Field Protocol slot 1, the early ask | After A1M3 | |
| Loadout choice | A1M4 | |
| R&D Engineering, tier-4 specializations | After A1M4; first in-map T4 A1M5 | |
| The Peeker | A1M1–A1M5 (one rock per map) | Pebble at the rock A2M3; on it A3M6 |
| Codex annotations | A2M3 (QUILL), A2M6 (Ves'thara's margins) | *Field Journal* with corrections from A3M1 |
| Minor-key jingle | A2M4 | No wave-clear jingle in Act III |
| Ves'thara's Xenotech branch | After A2M5 | |
| Jailbroken firmware | Base after A3M3 | |
| Companion pick list | FIN | |
| Epilogue cards | After C5 | |

### 4.7 Novelty ledger

New threats per map under §3 (≤ 2), and the other new things that satisfy "something new every map".

| Map | New threats | Other new things |
|---|---|---|
| A1M1 | Nibbler, Zoomer | Everything basic; Rivet, Thumper, Orbital Strike, Suppressing Fire, high ground, Crossfire |
| A1M2 | Chonk, Brood Hauler | Sprinkler, power node, early call, targeting, Stardust, Bounty Board, name tags |
| A1M3 | Puffwing (+air lane) | Skyhook, Hold Fire, Gerald, wreckage, Time Dilation, shop |
| A1M4 | Elder, Bunchling | Zapcoil, loadout choice, salvage yard, Clearance Sale |
| A1M5 | Digger, second spawn | First boss (capstone), T4 specs, Quiet Wave |
| A2M1 | Mote, Skittish | Mixed waves, kill-order bark, Act II presentation |
| A2M2 | Glimmer, Glass Witch | Protect objective, in-stage boss dialogue, retreat |
| A2M3 | Facet Warden, Lightwing | Revisit, codex annotations, Pebble |
| A2M4 | Veilwalker, Blinkstrider | Lookout as a required counter, Q3 Bonus, C2 |
| A2M5 | Aegis Cantor | Capstone Colossus, pivot, Escort, Ward ally, Prism gift |
| A2M6 | Fracture, Rift Moth | Prism, Stillness, Sundown |
| A3M1 | Maw, rift lanes | Brood Burrow, Underfoot, Field Journal, Act III presentation |
| A3M2 | Compliance Drone, Expediter | Clean Exit cue, Halcyon Security faction |
| A3M3 | Undertow | Holdout, blocker ally, SEAL |
| A3M4 | Silencer, Liability | System Reboot, empty slot, jailbreak |
| A3M5 | Auditor, Maint. Associate | Capstone boss, bearers, Sproing Pad, crash site, QUILL offline |
| A3M6 | Gunship, Black Budget | Capstone Maw, Sheltered, militia, 2-wide lanes |
| FIN | — | Choir escort, song rules, Deep Bore, Unsung (capstone), Dawn |

### 4.8 Counter coverage

Required counters per map (≤ 3, [enemies.md §7](../design/enemies.md#7-wave-design-rules)) and how the guarantee in [progression.md §8](../design/progression.md#8-tower-acquisition) holds on the default path. Licensing must cost ≤ the previous map's first-clear Stardust (§4.9).

| Map | Threat intel | Required counters | Guaranteed answer (owned, free, or affordable) |
|---|---|---|---|
| A1M1 | Fast | Splash | Thumper |
| A1M2 | Armored (light) | Armor | Rivet T3 pierce, Thumper |
| A1M3 | Flying | Air | Skyhook (issued this map), Rivet |
| A1M4 | Splitting, Huddle | Splash | Thumper, Zapcoil |
| A1M5 | Flying, Armored, Splitting, Huddle, Burrowing, Boss | Air, Splash | Skyhook, Rivet, Thumper; burrowing is not required |
| A2M1 | Skittish, Flying, Hollow | Splash | Thumper, Zapcoil |
| A2M2 | Shielded, Boss | Shield | Zapcoil, Sprinkler T3 |
| A2M3 | Shielded (heavy), Flying + shielded | Shield, Air | Zapcoil (G+A); Harpoon licensed after A2M1 |
| A2M4 | Cloaked, Blink, Shielded, Flying | Detection, Shield, Air | Lookout (150 ≤ 210); Scanner Sweep; Zapcoil |
| A2M5 | Shield aura, Cloaked (boss shards), Hollow | Shield, Detection | Zapcoil, Lookout |
| A2M6 | Splitting, Flying + Phasing | Air, Splash | Skyhook, Rivet, Prism (gift), Thumper |
| A3M1 | Gathering, Flying, Splitting, Rift | Splash, Air | Thumper, Skyhook, Brood Burrow (gift), Underfoot |
| A3M2 | Armored, Haste aura | Armor | Harpoon (owned; 250 ≤ 280), Mindspike; survives either Halcyon class revoked |
| A3M3 | Burrowing, Gathering, Flying | Burrowed, Air | Brood Burrow, Stasis Bloom; non-Halcyon air (Zapcoil, Prism, Harpoon) |
| A3M4 | Jammer, Heavy armor | Jam, Armor | System Reboot (free), Hum Choir (gift by now on both C1 paths); Harpoon, Gloop (warren), jailbroken class |
| A3M5 | Jammer, Healer aura, Heavy armor, Boss | Jam, Armor | System Reboot, Hum Choir; Harpoon, Gloop (warren) |
| A3M6 | Flying + armored, Cloaked + armored, Gathering | Air, Detection, Armor | Sproing (gift A3M5), Harpoon; Lookout or Lantern |
| FIN | Flying, Jammer, Burrowing, Splitting, Gathering, Phasing, Armored, Cloaked (light) | Air, Jam, Burrowed | Sproing, Skyhook/Harpoon; Hum Choir, System Reboot; Brood Burrow, Underfoot |

### 4.9 Shop stock and the reference profile

**Zibzab's stock** (campaign data; licenses per [progression.md §4.1](../design/progression.md#41-vrell-tower-licenses)): the shop opens after A1M3 with the Zapcoil sample, the Crane license, tune-ups, global upgrades, and Field Protocol unlocks. **"New shipment"** after A1M5 adds the Lookout Shack; after A2M1, the Grapple Harpoon ("for rig security, the brochure says"). The jailbreak appears after A3M3; the crate is given in A3M6.

**First-clear Stardust** (progression's per-act ranges, adjusted to 5/6/6): A1M1 **0** (the tutorial pays only the counter; your first Stardust comes from the map where you burst the Haulers' sacks), A1M2 130, A1M3 140, A1M4 150, A1M5 160 · A2M1 180, A2M2 195, A2M3 210, A2M4 225 (+400 Q3 Bonus before it), A2M5 240, A2M6 260 · A3M1 280, A3M2 300, A3M3 260–340 by Evacuated, A3M4 330, A3M5 355, A3M6 380 · FIN 500. Total ≈ 4,330 plus the bonus.

**Objective Intel** (+1 each, optional, never moral): A1M4, A2M1, A2M4, A3M1, A3M4, A3M5, FIN = 7.

**Reference profile** (Standard; first-clear Stardust spent sensibly; Intel from Victory medals only; the *weaker* branch of every flag: C1 cleared, C2 Return, both C3 branches, every C4):

| Before map | Towers owned | Intel spent so far | Notable shop state |
|---|---|---|---|
| A1M1–A1M3 | Rivet, Thumper (+Sprinkler A1M2, Skyhook A1M3) | — | — |
| A1M4 | + Zapcoil | — | Head Start protocol; Rivet, Thumper tune 1 |
| A1M5 | same | Thumper A (Cluster), Rivet A (Rivet Storm) | Reinforced Core 1; Sprinkler tune 1 |
| A2M1 | + Lookout | same | — |
| A2M2 | same | + Sprinkler B (Cloudburst) | Seed Money 1; Zapcoil tune 1 |
| A2M3 | + Harpoon | same | — |
| A2M4 | same | same | Zapcoil, Rivet tune 2 |
| A2M5 | same | + Zapcoil A (Overload) | Reinforced Core 2 (bank went to Return) |
| A2M6 | + Prism | same | Ability Coolant 1 |
| A3M1 | + Brood Burrow | same | Emergency Bulkhead |
| A3M2 | same | + Mindspike | Seed Money 2 |
| A3M3 | −1 Halcyon class (revoked) | same | — |
| A3M4 | + jailbroken class, Hum Choir (+Gloop if warren) | same | Jailbreak bought (warren) or free (convoy) |
| A3M5 | + Sproing | + Stasis Bloom | Mindspike tune 1 |
| A3M6 | (+Gloop if convoy) | same | Harpoon tune 2 |
| FIN | same (the reference never buys Crane or Lantern) | + Rivet B (Railspike) | — |

---

## 5. Per-map entries

Each entry: hook · quick facts · story purpose · layout · waves · story delivery · medals · rewards · par build. Wave lists are themes, not data; **[T]** = teach, **[X]** = test, **[C]** = combine. Radio lines are between-wave scenes (`<map>_wNN`); barks are pool samples keyed to [core-loop.md §6.3](../design/core-loop.md#63-barks). Par margin targets follow [maps.md §6.1](../design/maps.md#61-per-act-targets) and the monotonic chain in §7.

### Act I: Pest Control

#### A1M1 · Orientation Day

*Your first shift: keep the adorable pests out of the lettuce.*

- **Facts:** Dome Row · `act1` · Defend · 14×10, 10 buildable (1 high ground) · 7 waves · 300 credits, 25 s countdowns · companion Bricks (Suppressing Fire) + Bricks ally post by the core · Technician Orbital Strike · loadout screen skipped (Rivet + Thumper).
- **Story purpose:** Arrival (bible A1M1). Plant the counter, the jingle, "Logging it," the north-to-south path, the Tidybots, the Peeker, Goldie and Duchess. **Target: delight.** The player should like everyone by the end of the shift.

**Layout.** Spawn on the north edge (facing the Spires). The road drops south, swings east along the domes, back west, and out through the perimeter gate (the core) on the south edge, where it visibly continues into open grassland. The domes fill the S-bends. The Peeker's rock is at (3,1), in the brush beside the spawn road. This layout is reused by A3M6 and is the gate the finale leaves from.

```
....S.........
....#.o.......
..o.#.o^......
....######....
...o.....#o...
...o.....#o...
....######....
..o.#.o.......
....#.........
....C.........   → the road continues south into the wilderness
```

Dressing: Hally billboards (`beaming`), Goldie's Dome 1 with Duchess in the window, sprinklers ticking, a sign reading "PESTS PROCESSED THIS QUARTER: 38% MORE!"

**Waves.** 1 Nibblers ×6 [T: build] · 2 Nibblers ×10 [T: upgrade; high-ground prompt] · 3 Nibbler clumps ×12 [T: Thumper unlocks, Crossfire] · 4 Zoomers ×4 [T: fast; Suppressing Fire prompt] · 5 Nibblers + Zoomers [X; Orbital Strike prompt] · 6 Zoomer rush ×10 [X] · 7 Nibblers ×20 + Zoomers ×8 [X].

**Story delivery.**
- *Before:* character creation (the onboarding form), then memo `memo_a1_00` *WELCOME TO THE GARDENS!* (grants Orbital Strike; small print per the style guide).
- *Briefing:* QUILL introduces itself; Bricks names you; a choice (earnest / wry / quiet, characters.md's A1M1 set).
  - QUILL: "Hello, Technician! I'm QUILL, your Quantified Unified Integrated Logistics & Lethality assistant. I love my job!"
  - Bricks: "Name's Okonkwo. Sergeant. I'll call you Sprout, 'cause you're green and you work with lettuce."
  - QUILL (threat intel): "Today's forecast: Nibblers, with a chance of Zoomers!"
- *Radio:*
  - w02 Bricks: "Turrets go on the pads. Bugs go on the path. Nothing goes on the path but bugs and bad decisions."
  - w03 QUILL: "New hardware! Put the mortar beside your Rivet. They like each other. It's called Crossfire!"
  - w04 Goldie: "Oh! You're the new tech! Want to meet Duchess? She's a butterhead. She's shy. Don't look directly at her."
  - w05 Bricks: "Fast ones. Lay my Suppressing Fire across the road. That's what it's for."
- *Barks:* QUILL `first_leak` (once per campaign): "Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)" · QUILL `wave_cleared`: "(singing along) Hal-cy-on, Hal-cy-on!" · Bricks `wave_cleared`: "That jingle. Every time." · QUILL `perfect_wave`: "Perfect wave! I'd give you a sticker, but stickers are Tier 2."
- *Debrief:* Bricks: "Not bad, Sprout." · "Don't name things on day one. You get attached." (He names one tomorrow.)
- *Codex:* Nibbler, Zoomer, Rivet, Thumper, Tidybot, Halcyon Gardens, Orbital Strike (small print: "Uplink access contingent on Q2 extraction targets").
- *Memo after:* `memo_a1_01` *Q2 Results: Pest Losses Down 38%!* (small print: "Lettuce loss figures pending Accounting review.")

**Medals.** Victory · Perfect Core · **Teamwork Makes the Dream Work™:** win with a Crossfire link active.
**Rewards.** Stardust 0 · Intel 3.
**Par build.** Rivet on the greenhouse roof (7,2) at W1 → T3 by W5; second Rivet (10,4) + Thumper (10,5) for Crossfire at W3; Thumper (3,5) at W5. Orbital Strike on W5 and W7 clumps; Suppressing Fire on W6. Target margin 95. `noCounterBuild` not needed (no counters yet).

#### A1M2 · Brood Season

*Big, slow Brood Haulers waddle down the terraces with glittering sacks. High bounty!*

- **Facts:** The Terraces (north slope) · `act1` · Defend · 14×10, 11 buildable (1 high ground irrigation tower, 1 power node pump station) · 8 waves · 300 credits · companion Bricks · Technician Orbital Strike.
- **Story purpose:** Bible A1M2. Plant the Haulers, the leaderboard, tower names, the pension, and policy placement; the Peeker's rock sits at a warren mouth. **Target: delight, with the first pebble in the shoe** (the tiny shapes running *back* from a burst sack).

**Layout.** Long switchbacks down three terraces from a north spawn to a gate core at the south edge. Long and slow by design, so Sprinkler + Thumper shine. The pump station (power node) sits at the second switchback; Extraction Rig 3 (decor) sits beside one pad and the housing block beside another, so QUILL's "(Per policy.)" suggestion is visible. The Peeker's rock is at a warren mouth halfway down the east side. This is the layout A2M3 revisits: keep the west two-thirds clean of anything Act I–specific so the scars read.

**Waves.** 1 Nibblers · 2 Nibblers + Zoomers [early-call prompt] · 3 Chonks ×2 [T: armor plink; Strong targeting] · 4 Chonks + Nibbler swarm [X; Sitting Ducks] · 5 one Brood Hauler, alone [T] · 6 Zoomer rush + Chonks [X: early call] · 7 Haulers ×2 + Nibblers [X] · 8 Haulers ×3 + Chonks + Zoomers [X].

**Story delivery.**
- *Briefing:* Bricks counts pension days; QUILL flags the Haulers ("sensors show something big and sparkly").
- *Radio:*
  - w02 Kip: "Kip Vandermeer. 'The Exterminator.' Number one on the Bounty Board, three quarters running. Don't get comfy at two."
  - w03 QUILL: "Suggested build site: beside Extraction Rig 3. (Per policy.) The housing block will be fine. Probably!"
  - First `wave_cleared` (name tag) Bricks: "That one's Denise. After my first wife. Keeps her distance, fires on schedule, never calls."
  - w05 Kip: "Pro tip: Brood Haulers. Big bounty, slow, and they never shoot back. It's basically free money."
  - w07 Bricks: "Four hundred and twelve days to pension. Then it's me, a hammock, and a planet with zero bugs on it."
- *Barks:* Bricks `enemy_killed` hauler: "Strong targeting on the big ones." · QUILL `enemy_killed` hauler: "Sack ruptured! Glitter everywhere! Tidybots are on it!" · Bricks `tower_sold` (tagged): "You sold Denise. ...Fair. She'd have done the same."
- *Debrief:* Kip: "Nice wave, Sprout! For a two." · the results screen pays Stardust for the first time.
- *Codex:* Chonk, Brood Hauler (original, style guide §6.2), Frostline Sprinkler, Pest Bounty Board, Stardust ("Halcyon's premium mineral! Responsibly sourced!"), Rig 3.
- *Memo after:* `memo_a1_02` *Introducing the Pest Bounty Board!* (small print: "Bounties funded by Reclamation Facility 2, a sustainability success story!")

**Medals.** Victory · Perfect Core · **Aim for the Sack!:** no Brood Hauler gets past the pump station. (It is in the codex's voice on purpose; its icon stays on the star map for the rest of the game.)
**Rewards.** Stardust 130 · Intel 3.
**Par build.** Rivet, Thumper, Sprinkler (fourth slot empty: the player owns three). Sprinkler on the power node with Thumper adjacent (Sitting Ducks); Rivet T3 on the irrigation tower set to Strong for W5 onward; second Thumper at the bottom switchback. Orbital Strike on each Hauler pair. Target 92. `noCounterBuild`: Rivets at T1 only, no Thumper (must lose by W6).

#### A1M3 · Special Delivery

*Gerald the mail drone flies the path. Gerald is not a pest. Do NOT shoot Gerald.*

- **Facts:** Mail Road · `act1` · Defend; Gerald is a neutral air unit on three passes · 14×10, 11 buildable + 3 wreckage (crashed delivery drones) · 8 waves · 310 credits · companion QUILL (Time Dilation) · Technician Orbital Strike.
- **Story purpose:** Bible A1M3. Teach Hold Fire as a joke, bring Bricks's rejected form, deliver Zibzab and the early ask. **Target: slapstick and warmth.** Lowest threat load in Act I, so Hold Fire gets the room.

**Layout.** A straight-ish mail road from a north spawn with one long hairpin; the air lane (dotted) cuts diagonally across the hairpin. Three wreckage tiles are crashed delivery drones in Gerald's livery (QUILL: "Gerald's colleagues. Gerald doesn't like to talk about it."); one hides a pad near the hairpin. Zibzab's shell-shop clanks onto a decor patch beside the road at W6 and stays as dressing. The Peeker's rock is behind a fallen mailbox.

**Waves.** 1 Nibblers + Gerald pass 1 [T: Hold Fire (all); the button pulses] · 2 Zoomers [salvage-drone prompt] · 3 Puffwings ×4 [T: air lane, Skyhook] · 4 Chonks + Gerald pass 2 [X: hold fire on single towers] · 5 Puffwing flock ×10 [X; Time Dilation prompt] · 6 Haulers + Puffwings · 7 mixed + Gerald pass 3 (carrying the form) · 8 mixed + big flock.

**Story delivery.**
- *Briefing:* QUILL: "Today's route includes Gerald. Gerald is the mail. Gerald has right of way."
- *Radio:*
  - w02 QUILL: "Rerouting Gerald requires Form 88-B. Form 88-B must be delivered by mail. I've asked Gerald."
  - w06 Zibzab (arrival): "Price first: forty stardust. Then the product: a very good gun. Zibzab does not lie. Lying is bad for repeat business."
  - w07 Zibzab: "No refunds, no regrets! It's on the shell. Right there. Next to the other thing I won't refund."
  - w08 Bricks (after Gerald's pass 3): "Pension form. Rejected. 'Missing signature.' I signed it. Twice. In pen."
- *Barks:* QUILL (Gerald hit): "Do NOT shoot Gerald. Gerald is the mail." / "Hold Fire, please, Technician. He's doing his best." · Gerald (status text): "DELIVERY: ATTEMPTED." · QUILL `hold_fire_used`: "Thank you! Gerald thanks you. Gerald can't talk." · QUILL `new_enemy` puffwing: "Flying pests! They're fluffy. Don't let that stop you!"
- *Base:* the shop opens; the Zapcoil sample ("Price first: your next visit. First one's on me. Zibzab is patient."); the optional question "Where does stardust come from?" (sets `asked_zibzab_early`; available until A2M3).
- *Codex:* Puffwing, Skyhook, Gerald ("Do not target. Do not reroute without Form 88-B."), Form 88-B, Zibzab, Vrell, Hold Fire.
- *Memo after:* `memo_a1_03` *Mandatory Fun Friday Is Back! (Attendance Optional) (Required)* (small print: "Mail-drone incidents must be reported on Form 88-B.")

**Medals.** Victory · Perfect Core · **Return to Sender:** Gerald is never hit.
**Rewards.** Stardust 140 · Intel 3.
**Par build.** Rivet, Thumper, Sprinkler, Skyhook (all four owned). Skyhook ×2 under the air lane; Hold Fire (all) toggled for each Gerald pass in the script; clear the hairpin wreckage at W2. Time Dilation on W5. Target 90. `noCounterBuild`: no Skyhook and Rivets kept away from the air lane (must lose by W6).

#### A1M4 · The Audit

*Compliance Officer Prim is auditing you. Smile. Sterling has your back.*

- **Facts:** Admin Plaza · `act1` · Defend · 14×10, 12 buildable + 5 wreckage (salvage yard: toppled lettuce carts, one hiding a power node) · 9 waves · 320 credits · companion Zibzab (Clearance Sale) · Technician Orbital Strike · **first loadout choice** (five types owned; Crane licensable).
- **Story purpose:** Bible A1M4. Sterling defends you and signs off your tiers (earned trust, with small print); Elders slow the swarm; Goldie's lettuce math; "buffer populations" in a memo. **Target: comedy at full volume, with Sterling at her most likable.**

**Layout.** A U-shaped road around the plaza fountain under three giant Hally billboards, entering north-west and leaving south-east through the plaza gate (core). The audit podium (decor) faces the path; Prim hovers there all map. Five wreckage carts ring the fountain; the power node is under the cart nearest the podium. The Peeker's rock is a planter by the fountain. A3M2 revisits this plaza: the podium, billboards, and fountain must be landmark-clear.

**Waves.** 1 Nibblers [Clearance Sale prompt] · 2 Bunchlings ×3 [T: splitting] · 3 Bunchlings + Zoomers [X] · 4 one Elder + 6 huddled Nibblers [T: huddle; splash] · 5 Chonks + Bunchlings · 6 Elders ×2 + Bunchlings [X] · 7 Haulers ×2 + Elder · 8 Zoomer flood + Bunchlings · 9 Elders ×3 with big huddles + Haulers [X].

**Story delivery.**
- *Briefing:* Prim: "Compliance Officer Prim. Audit 2361-Q2-447. Please continue working. I will be watching your face."
- *Radio:*
  - w03 Prim: "Smiling detected at 61% of mandated sincerity."
  - w04 Sterling: "Auditor Prim, Four-Forty-Seven is the best technician on this rock. Dock {their} pay and you'll have to dock mine."
  - w06 Goldie: "Memo says pests ate forty percent of the crop. Weird! I count every head. They walked right past Duchess."
  - w08 Sterling: "Tier approvals are on me, Four-Forty-Seven. My signature, my risk!"
- *Barks:* Zibzab `map_start`: "Clearance Sale! Everything must go. Not you. You're not for sale. Yet." · Zibzab `tower_built` (Zapcoil): "Ten percent better than new. Honestly, eight. The ten is marketing." · QUILL `new_enemy` elder: "Elder! Slow, old, and in the way. Clear it first for efficiency!"
- *Debrief:* Sterling's sign-off: R&D Engineering opens (specializations).
- *Codex:* Elder (original, citing "Survey 2346, Okonkwo"), Bunchling, Zapcoil, Salvage Crane, Admin Plaza, Hally, Compliance Officer Prim, the Smile Audit.
- *Memo after:* `memo_a1_04` *Buffer Populations and You: A Quick FAQ!* (body about "wildlife management" that says nothing; small print: "Tier approvals contingent on Q3 extraction targets.")

**Medals.** Victory · Perfect Core · **Asset Recovery:** clear all 5 wreckage tiles. **Objective Intel +1, Clean Audit:** sell no tower after its build phase (misclick grace doesn't count).
**Rewards.** Stardust 150 · Intel 3 (+1).
**Par build.** Rivet, Thumper, Sprinkler, Zapcoil (no flyers in the intel, so Skyhook stays home: the lesson). Thumper ×3 at the fountain bends for huddles; Sprinkler + Zapcoil adjacent (Conductive); clear the podium cart by W3 and put Thumper on the node. Clearance Sale on W4 and W8 upgrades. Target 87. `altBuild`: Crane + Rivet + Thumper + Sprinkler (must win ≥ 20%). `noCounterBuild`: no Thumper or Zapcoil (no splash) must lose by W6.

#### A1M5 · Record Quarter

*It's the Spring Surge, the Quarterly Results party is on, and something big is coming down the north road.*

- **Facts:** Northern Gate · `act1` (party dressing: banners, hats, a confetti cannon) · Defend + boss · 14×10, 12 buildable (2 high ground, 1 power node) · 10 waves · 350 credits · **second spawn** opens W3 · companion Bricks + Bricks ally post by the gate · Technician Orbital Strike.
- **Story purpose:** Act I's comedy peak and its one crack (bible A1M5): the boss who is driven off with her brood, then the **Quiet Wave (C1)**, then the stinger. **Target: triumph, then a held breath.**

**Layout.** Two roads from the north edge (the Spires road, west, and a warren track, north-east) merge at the colony's north gate before the core at the south edge. The banner line (a strip of party bunting across the merged road two-thirds of the way down) marks the Challenge. The party tent is decor beside the core. The Peeker's rock is on the warren track, closer than ever.

**Waves.** 1 Nibblers (west) · 2 Diggers ×3 [T: burrowing, "not a hard requirement"] · 3 east spawn opens: Zoomers + Nibblers [T: second spawn] · 4 Bunchlings + Diggers, both roads [X] · 5 Elder + Haulers · 6 Puffwings + Chonks · 7 mixed, both roads [X] · 8 the Spring Surge (largest Act I wave) · 9 **Matriarch Chitterbloom** (west road; sneezes Nibblers; burrows and surfaces with a Bunchling; panics and huddles her young; `driveOff` at 0%) · 10 **the Quiet Wave:** Old Thrum leading six younglings, east road, no NEW badge, no prompt ([enemies.md §5.1](../design/enemies.md#51-skitterkin-body-organic)).

**Story delivery.**
- *Briefing:* Sterling's party memo; QUILL in a party hat: "I'm wearing a hat! It's a hat file. I made it myself." · QUILL (the boss hint): "Sensors show something big under the north road. Probably a party surprise!"
- *Radio:*
  - w03 Bricks: "Second road's open. Watch both. You've got two eyes. Use both of 'em."
  - w05 Sterling: "Q2 pest losses down 38%! Lettuce losses: Accounting is still working on that number!"
  - w07 Bricks: "Four hundred even. Round number. Don't like round numbers."
  - w09 (boss cue) QUILL: "That's not a surprise. That's a Matriarch. Codename: CHITTERBLOOM."
- *Quiet Wave (cue at W10 start):* Bricks: "Clear it, Sprout." · Sterling: "Let's finish strong, Four-Forty-Seven!" Then nothing. At map end, if spared: Bricks: "...Sprout." then "Yeah. Okay." If cleared: Bricks: "Good work."
- *Barks:* QUILL `boss_phase` 3: "She's panicking! Panicking is ninety percent of being driven off!" · Bricks `not_firing` (W10 only, once): "...You okay, Sprout?" · QUILL `wave_cleared` (boss): "Driven off! Not processed. Is that allowed? Logging it."
- *Full-screen scene:* `a1_m05_scene_party` (≤ 20 lines): confetti, the record counter, Sterling announces your promotion and "top five percent," Kip demands a rematch, Goldie brings Duchess in a party hat, Zibzab sells hats, Bricks doesn't dance.
- *Stinger:* `a1_m05_scene_stinger`: Rig Nine stops answering; six frames of something the wrong shape. QUILL: "Probably a smudge! Logging it."
- *Results:* the counter with ★; if spared, a red **CONTAINMENT LAPSE** stamp (story-only).
- *Codex:* Digger, Matriarch Chitterbloom (original: "Codename CHITTERBLOOM. Big! Grumpy! Lays pests! ★★★★★"), Northern Gate, Rig Nine (one line, "status: answering").
- *Memo after:* `memo_a1_05` *Record Quarter! You're Top 5%!* If spared, a second paragraph: *Performance Note: Containment Lapse* (no consequence).

**Medals.** Victory · Perfect Core (Quiet Wave leaks exempt) · **Party Pooper Prevention:** drive the Matriarch off before she reaches the banner line. No medal can reference the Quiet Wave.
**Rewards.** Stardust 160 · Intel 3.
**Par build.** Rivet, Thumper (Cluster spec), Sprinkler, Skyhook. Thumper ×2 and Sprinkler at the merge (Sitting Ducks); Rivet T3 on each high ground; one Skyhook at the merge for W6. First T4: Cluster Thumper by W8. Orbital Strike + Suppressing Fire on the boss's phase 3. Target 84. **Story variants** (harness): par with Hold Fire (all) during W10 must still win (Quiet Wave all leaks ≤ 2 integrity); par clearing W10 must win. `noCounterBuild`: no Skyhook and no Rivet on the air lane (must lose by W7).

### Act II: First Contact

Act II presentation from A2M1: results line `Pests processed: {n}.` (no star), loading tips "Remember: a clean perimeter.", Hally billboards `peeling`, Skitterkin deaths without confetti, Tidybots still on. Sterling gets at least one between-wave line on every Act II map.

#### A2M1 · Rig Nine

*Rig Nine stopped answering. Go take a peek. Minor operational hiccup!*

- **Facts:** The Diggings · `act2.gold` · Defend · 18×12, 13 buildable (2 high ground on canyon ledges, 1 stardust-conduit power node) + 2 "crew log" wreckage · 10 waves · 420 credits · two spawns (the Spires road for Skitterkin; Rig Nine's bore mouth for the Hollow) · companion Bricks · Technician Orbital Strike.
- **Story purpose:** Bible A2M1. Pay the stinger; plant hushing and "they're running from it" without anyone saying so. **Target: curiosity curdling to unease.** First Hollow, first mixed waves.

**Layout.** Two northern entries (road north-west, bore mouth north-east) merge mid-map and run south through the rig yard to the outpost lift (core). Broken mining rigs are the wreckage; two marked "crew logs." The hushed crew sit outside their hut (decor) beside the path, staring at nothing, unharmed and unreachable by anything. The north-east edge (toward the Halls) is visibly darker than the rest.

**Waves.** 1 Nibblers + Zoomers, Skittish [T: Skittish; splash, slows] · 2 Puffwings + Diggers, Skittish · 3 a Skittish group, then Motes ×6 behind it on the same road [T: Mote; `fleeing` tag] · 4 Haulers fleeing + Motes ×8 [X: kill order] · 5 an Elder with younglings + Motes · 6 Mote cluster ×12 [X: splash] · 7 Bunchlings fleeing + Motes, both roads · 8 mixed · 9 Motes ×20 from the bore [X] · 10 everything, both roads.

**Story delivery.**
- *Briefing:* Sterling: "Minor operational hiccup at Rig Nine! Super minor. Hiccup-sized. Go take a peek, Four-Forty-Seven!" · Bricks: "Rig crew's been quiet two days. Quiet's not a status, Sprout. Quiet's a symptom."
- *Radio:*
  - w02 QUILL: "They're moving faster than usual. And they keep looking back. Logging it."
  - w04 Bricks (crew found): "They're breathing. They just don't know their names. Sweet moons."
  - w06 QUILL (log recovered, or here if not): "The crew called it 'the hollow.' Lower case. I don't know why that's worse."
  - w08 Bricks: "Three hundred ninety-six days. Saying it out loud. Helps."
- *Barks:* QUILL `skitterkin_killed_ahead`: "If you clear them first, you are clearing its path. Just noting it." · QUILL `new_enemy` mote: "Unknown signature. It isn't on any list. I've checked every list." · Bricks `wave_cleared`: "Jingle sounds different out here." (A2M4 makes it minor; here it only *feels* off.)
- *Codex:* Mote (original: "Rig Nine Atmospheric Event. Not dangerous! [REDACTED]"), Rig Nine, the Diggings, "Hushed" (wellness-event classification).
- *Memo after:* `memo_a2_01` *Rig Nine: A Minor Operational Hiccup!* (small print: "Rig crew wellness events are covered under Plan B.")

**Medals.** Victory · Perfect Core · **Hiccup Contained:** no Hollow unit leaks. **Objective Intel +1, Crew Logs:** clear both log wreckage tiles (unlocks the crew-log codex entry).
**Rewards.** Stardust 180 · Intel 3 (+1).
**Par build.** Rivet, Thumper, Sprinkler (Cloudburst not yet), Zapcoil. Thumper ×2 + Sprinkler at the merge; Zapcoil chains for clusters; Rivet on a ledge for Puffwings. Target 82 (re-baselines after the boss). The harness tunes mixed waves with the hush rule on ([enemies.md §5.4](../design/enemies.md#54-the-hollow-body-void)). `noCounterBuild`: single-target only (Rivets, no splash) must lose by W7.

#### A2M2 · The Glass Witch

*Someone is shattering the extraction rigs, and only the rigs.*

- **Facts:** Ridge Rigs · `act2.gold` · **Protect the asset** (two extraction rigs on the rig branch, own integrity 10) · 18×12, 14 buildable (2 Aelari crystal outcrops as high ground, 1 conduit node) · 11 waves · 450 credits · main road (Skitterkin and Motes to the ridge relay core) + rig branch (Aelari to the rigs) · companion QUILL (Time Dilation) · Technician Orbital Strike.
- **Story purpose:** Bible A2M2. Ves'thara's first appearance, her targets, her grievance, the C1 variant line; the callsign **Thorn**. QUILL as companion on the map where you defend rigs is the fair-play joke: its "(Per policy.)" suggestions are, for once, correct. **Target: intrigue; the first voice that refuses to joke.**

**Layout.** The main road runs north to south along a ridge. At the top a branch peels east along a ledge to Rigs 7 and 8 at the map's east edge. Aelari constructs only ever take the branch. Habitat domes sit untouched on the west side all map; the camera frames them so the player can notice she never goes near them.

**Waves.** 1 Skitterkin, Skittish · 2 Glimmers ×4 on the branch [T: shields; Zapcoil] · 3 Skitterkin + Motes · 4 Glimmers ×8 + Skitterkin [X] · 5 Glimmer column + Chonks [X] · 6 Mote cluster + Haulers · 7 Glimmers + Puffwings · 8 mixed, both routes · 9 Glimmers + Motes · 10 big mixed · 11 **the Glass Witch** on the branch (shield pulse; blink from 70%; in-stage cue at 70%; `retreat` at 40%, which resolves the wave and wins the map).

**Story delivery.**
- *Briefing:* Sterling: "Vandalism at the ridge rigs! That's the word. Vandalism. Write it on everything!" · QUILL (threat intel): "Shielded signatures. Your Zapcoil was free. It is about to earn it."
- *Radio:*
  - w03 QUILL: "Rig integrity is my top priority. (Per policy.) Your integrity is also a priority. A close second."
  - w06 Bricks (cue): "Whoever it is, they're not touching the domes. Not once. That's a choice."
  - w09 Sterling: "Insurers say 'vandalism.' Legal says 'vandalism.' So it's vandalism. Super!"
- *Boss cues:* at spawn, if `spared_quiet_wave`: Ves'thara: "You let the small ones walk, once. I saw. It is why I have not struck you." · At 70%: "You are the Counter. {pests_processed}. I have watched you count." · At 55%: "I do not strike your homes, Counter. Look at what I strike. Ask yourself why it bleeds light." · At retreat: "Keep shooting. You are very good at it. That has never been the question."
- *Barks:* QUILL `perfect_wave`: "Both rigs intact! (Per policy.) Also, you're intact. Also good." · QUILL `new_enemy` glimmer: "Shielded! Energy breaks shields. Zapcoils are energy. You see where I'm going."
- *Debrief:* Bricks: "Sprout's grown some thorns. Thorn. That's you now. Don't let it go to your head." (callsign → Thorn).
- *Codex:* Glimmer, the Glass Witch (original: "Unidentified vandal. Probably sad! Report sightings to Security."), lumenglass, Aelari (heavily redacted).
- *Memo after:* `memo_a2_02` *Re: Incident 2361-A. Please Use "Vandalism" in All Correspondence!*, plus a TFA form (`tfa`): *First Contact Incident 2361-A, filed, pending.*

**Medals.** Victory · Perfect (core and rigs undamaged) · **Glass Half Empty:** force her retreat before she blinks three times.
**Rewards.** Stardust 195 · Intel 3.
**Par build.** Zapcoil, Sprinkler (Cloudburst), Thumper, Rivet. Zapcoil ×2 + Sprinkler adjacent (Conductive, Soaked) on the branch ledge; Thumper + Rivet on the main road (Crossfire). Time Dilation and Orbital Strike on the Witch after her first pulse. Target 79. `noCounterBuild`: no Zapcoil and no Sprinkler T3 (must lose a rig by W8).

#### A2M3 · Second Look

*The terraces again, at dusk. Same road. Everything on it is running south.*

- **Facts:** The Terraces at dusk · `act2.gold` → `act2.dusk` across the waves · Defend · **revisit of A1M2**, 18×12: A1M2's 14×10 grid sits at its original screen position and a 4-column strip mine is added on the east · 14 buildable (A1M2's 11 minus 1 lost to a mining cut, plus 4 on the strip-mine benches) · 11 waves · 460 credits · air lane over the strip mine · companion Bricks · Technician Orbital Strike.
- **Story purpose:** **Where the player understands** (bible A2M3, twist layer 1 by sight). The Haulers' cargo is visible; Pebble at the Peeker's rock; QUILL's first disobedience; the pension voided. **Target: recognition. Not darkness: seeing.** Threat novelty stays modest (two shield variants) so the player has room to look.

**Layout and revisit dressing.** The same switchbacks and pump station as A1M2. Grey mining cuts slice across two terraces (one A1M2 pad is now a cut); exposed warrens with eggs line the path; the soil is grey-streaked; Rig 3 is now a strip mine filling the new east band, where Ves'thara's constructs strike. The Peeker's rock is still at the warren mouth; from W5 it holds Pebble. Skitterkin glance backward as they run. Hally billboard peeling.

**Waves.** 1 Skitterkin families with younglings in tow, Skittish · 2 Glimmers on the strip mine · 3 Haulers fleeing (sacks visibly young) · 4 one Facet Warden + Glimmers [T: heavy shield; Soaked + Zapcoil, Harpoon] · 5 Skitterkin + Motes [then the Pebble cue] · 6 Lightwings ×4 over the strip mine [T: flying shields] · 7 Wardens ×2 + Lightwings [X] · 8 Elders with younglings + Motes · 9 big Aelari wave · 10 Hollow push, both routes · 11 everything.

**Story delivery.**
- *Briefing:* Bricks: "Same terraces. Different day. Keep your eyes on the path, Thorn."
- *Radio:*
  - w02 Bricks: "Don't look at the eggs, Thorn. Look at the path. ...I said look at the path."
  - w04 QUILL: "Per policy, I am required to classify those as 'cargo.' I would like the record to show that I hesitated."
  - w05 (the rock) Bricks: "Small Fry. On your own? ...Pocket's got room. Just till we find her folks."
  - w06 Bricks: "You keep following me. Pebble. That's you. It's a rock thing."
  - w06 QUILL: "Naming a pest violates Handbook Section 12.4. ...I've decided not to log it. I don't know why I said that out loud."
  - w08 Goldie: "There's grey creeping into Dome 3's soil. Plants know when something's wrong. People take longer."
  - w10 Sterling: "Love the thoroughness, Four-Forty-Seven! Maybe a little less looking, a little more processing?"
- *Barks:* Bricks `not_firing`: "...You okay, Thorn?" · Bricks `wave_cleared` (after W5): "She's not a pest, she's a passenger. Don't make it weird." · QUILL `skitterkin_killed_ahead`: "That one was running. ...Logging it."
- *Codex:* annotations begin. Brood Hauler annotated (QUILL's half), Facet Warden, Lightwing, a "Pebble" entry QUILL refuses to file ("Entry withheld.").
- *Debrief:* Bricks reads the memo: "'Pension Restructuring Opportunity.' Nineteen years, restructured into a coupon. Ha."
- *Memo after:* `memo_a2_03` *Pension Restructuring Opportunity!* (to Okonkwo, cc you). Then, before A2M4, `memo_a2_04` *Your Q3 Performance Bonus!* (+400 Stardust).

**Medals.** Victory · Perfect Core · **Clear Skies:** no Lightwing leaks. (No medal rewards or punishes sparing anyone.)
**Rewards.** Stardust 210 · Intel 3. **Sets** `held_fire_second_look` (minor, §6).
**Par build.** Zapcoil, Sprinkler (Cloudburst), Harpoon, Rivet. Zapcoil + Sprinkler on the pump station (Conductive); Harpoon on the strip-mine bench for Wardens; Zapcoil + Rivet under the air lane. Target 77. `noCounterBuild`: no Energy damage at all (must lose by W8).

#### A2M4 · Second Harvest

*Kip's new plant smells like burnt sugar. The Tidybots unload here. Ask Zibzab where stardust comes from.*

- **Facts:** Reclamation Facility 2 · `act2.dusk` · Defend (the plant's control core) · 18×12, 15 buildable (2 catwalk high ground, 1 conduit node) + intake wreckage · 12 waves · 480 credits · one road through the intake yard plus an air lane over the vats · companion Zibzab (Clearance Sale) · Technician Orbital Strike or Scanner Sweep.
- **Story purpose:** **The midpoint** (bible A2M4; twist layer 2, told plainly by Zibzab). Pays the Tidybots, the counter, the currency, the early ask. You keep defending the plant after you know, because the Hollow is drawn to the vats, and the last killable Skitterkin of the campaign are in the waves after the truth. **Target: "I know, and I'm still doing it."**

**Layout.** The road enters north, loops through the intake yard past Intake B (where Tidybots unload after every wave, in full view), and ends at the control core in the south. The big vats glow **violet** (unsung) in the middle of the map; natural seams on the north cliff glow gold. Ves'thara's scouts walk the same road toward the core: she is learning this as you are. A3M5 revisits this map: the vats, Intake B, and the control core are the landmarks.

**Waves.** 1 Skitterkin, Skittish · 2 Motes drawn toward the vats · 3 Veilwalkers ×2 [T: cloak; Lookout, Scanner Sweep] · 4 Skitterkin + Motes · *(cue: the truth scene)* · 5 Mote cluster · 6 Blinkstriders ×3 [T: blink; depth placement] · 7 Veilwalkers + Glimmers [X] · 8 Lightwings + Wardens · 9 Blinkstriders + Veilwalkers [X] · 10 Hollow surge at the vats, with fleeing Skitterkin ahead · 11 cloak + blink mixed [X] · 12 everything.

**Story delivery.**
- *Briefing (the tour):* Kip: "Promoted! Reclamation Lead. Big vats, great benefits. Smells like burnt sugar, honestly. You get used to it." · Kip: "We don't call it that. It's 'throughput.' ...Why do you keep saying it like that?" · QUILL (the surprise hint): "Something under the vats is listening."
- *Full-screen scene* `a2_m04_scene_truth` (after W4): the player asks Zibzab.
  - Zibzab: "You asked. Good. Stardust is the dead, Technician. Everyone in the trade knows. Nobody in the trade says."
  - (if `asked_zibzab_early`) Zibzab: "You asked me in the spring. I told you. You kept buying."
  - Player choice (earnest / wry / quiet): "You knew. All this time." / "Great. Love that. Very normal." / "..."
  - Zibzab: "I never lied to you, Technician. Can your QUILL say that? Can your Director?"
  - From here the wave-clear jingle plays in its minor arrangement.
- *Radio:*
  - w06 QUILL: "Tidybot 14 is unloading at Intake B. I used to think the chime was cheerful."
  - w08 Zibzab: "Clearance Sale, Technician. You'll want the discount. I'd want it."
  - w10 Sterling: "Throughput is up, morale is up, everything is up! Keep that plant safe, Four-Forty-Seven!"
- *Barks:* Zibzab `skitterkin_killed_ahead`: "That one was worth eight stardust. Price first. I won't pretend." · QUILL `wave_cleared` (after the scene): "...Pests processed." · Zibzab `perfect_wave`: "Good work. Zibzab is careful what he calls good."
- *Debrief:* Sterling: "Reclamation is a sustainability initiative, Four-Forty-Seven! Nothing on Tumble IV goes to waste. Isn't that beautiful?" · then "Let's call it the Humane Relocation Pilot. My budget, my risk. Just trust me, okay?" Then **C2** (§6).
- *Base:* Goldie takes in Pebble: "She can sleep in the butterheads. She doesn't eat them. She just... sits in them. Like a little egg."
- *Codex:* Second Harvest (original: "A sustainability success story!"), Veilwalker, Blinkstrider, Tidybot annotated, Stardust annotated, Kip Act II portrait.
- *Memos:* before, `memo_a2_04` (the bonus); after, `memo_a2_05` *Humane Relocation Pilot: Next Steps!* (small print: "Preserve capacity planned per Buffer Protocol BP-2359.")

**Medals.** Victory · Perfect Core · **Nothing Unseen:** every Veilwalker is revealed before it passes Intake B. **Objective Intel +1, Intake Manifest:** clear the intake wreckage (unlocks the manifest codex entry: tonnages, no names).
**Rewards.** Stardust 225 (plus the 400 bonus before) · Intel 3 (+1) · C2 may add 4–10 Intel ([progression.md §2.1](../design/progression.md#21-story-hooks)).
**Par build.** Lookout, Rivet, Zapcoil, Sprinkler. Lookout + Rivet adjacent (Overwatch) at the yard entrance; Zapcoil (Overload) at the vats; Rivet + Zapcoil deep on the route so blinkers land in fire. Target 74. `noCounterBuild`: no Lookout and no Scanner Sweep (must lose by W8). Counter budget used: Detection, Shield, Air.

#### A2M5 · The Long Walk

*Ves'thara comes for the Preserve Road in a glass giant. Then the Hollow comes for everyone on it.*

- **Facts:** Preserve Road · `act2.dusk` · **Defend → Escort pivot** · 18×12, 15 buildable · 12 waves (5 before the pivot, 7 after) · 500 credits · one road to the Preserve gate (the core before the pivot, the **safe exit** after), plus a Hollow spawn on the rig road that opens at the pivot · companion Bricks · Technician Orbital Strike.
- **Story purpose:** **Ves'thara's turn** (bible A2M5): a boss fight with arguing, a Hollow surge, her shield and her Hollow-touch, the escort, "Not there. Never there." **Target: alliance under fire, and a wrong place to go.** Busiest story map in Act II; the escort is taught gently here and tested in A3M1.

**Layout.** A long road from the north-west to the Preserve gate in the south-east, between Halcyon relocation fencing. Before the pivot the core is the relocation checkpoint at the gate. At the pivot the Colossus kneels mid-road and becomes the **Ward** ally; refugee groups start from the north-west and walk to the gate. Behind the gate, the Preserve's fenced basin is visible and too quiet.

**Waves.** 1 Glimmers + one Aegis Cantor [T: shield aura; kill it first] · 2 Wardens + Cantor [X] · 3 Blinkstriders + Veilwalkers [C] · 4 Lightwings + Cantors [X] · 5 **Sunderglass Colossus** (shield wall, recharge pulse; cloaked shards when its shield breaks; `pivot` at 50% or when W6 starts) · *pivot:* Aelari stand down, objective becomes Escort, meter relabels **Evacuated** · 6 the surge: Motes ×12 from the rig road toward the first refugee group [T: escort, gently; generous `maxLost`] · 7 Motes + second group · 8 Mote clusters from both ends · 9 larger Mote clusters, one ahead of the group · 10 Motes ×20 · 11 two groups at once · 12 last group + the largest surge.

**Story delivery.**
- *Briefing:* Bricks: "Relocation pilot. We walk 'em to the Preserve. Sterling's budget, Sterling's risk." · QUILL (pivot foreshadow): "Hollow readings rising behind the rig road. They may arrive during the engagement."
- *Boss cues:* Ves'thara: "Halcyon builds a road to a pen and calls it relocation. I will break the road." · Ves'thara (shield breaks): "You count them. I carry them. Which of us is the monster, Counter?" · Bricks: "She's not wrong about the road, Thorn. Doesn't mean she gets it."
- *Pivot cue* `a2_m05_cue_pivot` (brief pause): Ves'thara: "Run, small ones. I will be the wall. Counter, if you have ever been sorry, be sorry now, and help me." · PA (Halcyon Ops): "Mixed hostile contact. Area clearance authorized." · Bricks: "Radio's bad. Can't hear the order. Funny, that. Get those little ones moving."
- *Radio:*
  - w08 QUILL: "Evacuated is a number I like. I don't know if I'm allowed to like numbers."
  - w10 Sterling: "Love the initiative! The Preserve has plenty of room. Plenty!"
  - w11 Bricks: "Pebble's in my pocket. Don't tell Goldie. She thinks it's unsanitary."
- *Barks:* Bricks `ally_hushed`: "Lost one. Keep the rest moving." · QUILL `low_integrity`: "Too many. Too many on the road."
- *Debrief:* Ves'thara, frost on her arm: "Not there. Never there." · Bricks: "Then where?" · (silence, 2 s) · Ves'thara gives Prism Spire; R&D's Xenotech branch opens under her.
- *Codex:* Aegis Cantor, Sunderglass Colossus, the Preserve (original: "Humane Relocation Preserve: a forever home!"), Ves'thara (first entry).
- *Memo after:* `memo_a2_06` *Long Night Readiness: Stay Positive!*

**Medals.** Victory · Perfect (no refugee lost) · **Kneel:** force the pivot by breaking the Colossus to 50% before W6 starts.
**Rewards.** Stardust 240 · Intel 3. Prism Spire. Mindspike and Lantern attunable.
**Par build.** Zapcoil (Overload), Lookout, Rivet, Thumper. Zapcoil + Lookout mid-road for Cantors and the cloaked shards; Thumper ×2 near the Ward for the Mote surges after the pivot. The Ward's chill does real work; the harness must see it. Target 71 (Evacuated %). `noCounterBuild`: no Lookout (the shards keep the shield up; must lose before the pivot or right after).

#### A2M6 · Sundown

*The first Hollow assault on the colony itself. Everyone on the wall. The sun goes down.*

- **Facts:** Colony perimeter (north wall) · `act2.dusk` with the **Sundown** lighting modifier (full Long Night darkness by W12) · Defend (core: the dome cluster where Pebble sleeps) · 18×12, 16 buildable · 14 waves · 550 credits · two ground spawns + one air lane · companion Ves'thara (Stillness) · Bricks ally post on the wall · Technician Orbital Strike.
- **Story purpose:** Bible A2M6: pays the alliance; plants QUILL's directives; the sun sets. No Skitterkin enemies: they are inside the domes now, and the results line shows the same number as last map. **Target: togetherness against the dark.**

**Layout.** Two roads come down from the Spires and meet the wall at two gates that merge inside, ending at Goldie's dome cluster. The air lane crosses the wall diagonally. Pads sit on the wall walk; one high ground is the old watchtower. Lamps along the wall are light sources in the darkness overlay; they stay on. Through a dome window, a small shape sleeps in the lettuce.

**Waves.** 1 Motes · 2 Motes, both roads · 3 Fractures ×2 [T: Hollow splitting; splash at the death point] · 4 Mote clusters · 5 Rift Moths ×3 [T: phasing; burst; Stillness, Prism] · 6 Fractures + Motes [X] · 7 both roads · 8 Rift Moths + Fractures · 9 Rift Moth flock [X] · 10 big mixed · 11 surge, west road · 12 surge, east road (full dark) · 13 both · 14 everything.

**Story delivery.**
- *Briefing:* Ves'thara: "Tonight I fight beside the Old Soldier. Do not make me regret it, Thorn." · QUILL (threat intel): "Splitting shapes and flickering flyers. And then the sun goes down."
- *Radio:*
  - w02 Ves'thara: "It is not hungry. It is lonely. When you are dead, those are the same thing."
  - w04 Pebble (from the dome): "Keep 'em off the perimeter!"
  - w06 Bricks: "Everybody on the wall. Even the fancy one." · Ves'thara: "I heard that."
  - w09 Sterling (her moment of fear): "Do you know what happens to people who miss targets, Four-Forty-Seven? Neither do I. Nobody's ever seen one."
  - w12 Goldie: "Lights out in Dome 3. Pebble's asleep in the butterheads. Don't let anything wake her."
- *Barks:* Ves'thara `new_enemy` fracture: "It breaks. It does not end. Remember that." · Ves'thara `perfect_wave`: "Good. Again." · QUILL `wave_cleared` (in the dark): "Knock knock. ...I've forgotten the rest. That's never happened before."
- *Debrief:* QUILL's partial confession: "There are things I am not permitted to tell you. I am permitted to tell you that. It's a loophole. I found it myself."
- *Base vignette* `base_a2_whistle`: Bricks tries to teach Pebble to whistle. She can't. She hums instead: a low family hum, not the jingle.
- *Codex:* Fracture, Rift Moth, Prism Spire, the Long Night; Ves'thara's margin notes appear on earlier entries (Brood Hauler: "They are carrying their children away from what you made.").
- *Memo after:* none from Sterling. The PA's shift-change jingle plays once over the dark, in minor.

**Medals.** Victory · Perfect Core · **Before the Dark:** no leaks in the last three waves.
**Rewards.** Stardust 260 · Intel 3.
**Par build.** Prism, Thumper (Cluster), Skyhook, Rivet. Thumper ×2 at the inner merge for Fracture splits; Skyhook ×2 under the air lane; Prism on the watchtower for the late surges. Stillness on Rift Moth flocks. Target 68. `noCounterBuild`: no splash (must lose by W9 to Fracture children).

### Act III: The Quiet

Act III presentation from A3M1: the counter is hidden (results show the map's meter line), no stars, no wave-clear jingle, no Tidybots, Skitterkin are never enemies, Hally billboards `dark` with the hum-glyph, loading tips "Remember.", the codex is the *Field Journal* (original and corrected side by side), the Bounty Board is gone without comment. Exclamation points belong to Sterling and Pebble only. After A3M3, Bricks's radio and bark slots play authored silence.

#### A3M1 · The Preserve

*The Hollow is inside the Preserve, where you led them. Get them out.*

- **Facts:** The Preserve · `act3` · **Escort** (meter **Evacuated**) · 22×14, 16 buildable · 14 waves · 600 credits · refugee groups walk from the inner basin to the back gate (safe exit toward the shelters); Hollow from two ground spawns, an air lane, and **rift lanes** from W2 · companion **Chitterbloom** (Underfoot) · Technician Orbital Strike · gift in the briefing: **Brood Burrow**.
- **Story purpose:** Bible A3M1: C1 pays off; the **Leaving Song** (first tear beat, twist layer 5, sung not said); Bricks confesses the survey (layer 6). **Target: grief arriving through a melody you already know.**

**Layout.** A fenced bowl. The refugee route spirals out from the centre to a gate in the south-west. Halcyon's "HUMANE RELOCATION PRESERVE" sign hangs over the inner gate. Rift cracks open through the fence on the north and east (telegraphed a wave ahead, never over a pad). Brood Burrow mounds look like the Preserve's own warren homes.

**Waves.** 1 Motes, first group out · 2 the first rift opens [T: rift lanes] · 3 Fractures · 4 one Maw [T: gathering; burst it, or kill the small ones near it; Underfoot] · 5 Rift Moths over the second group · 6 Motes through two rifts [X] · 7 Maw + Motes [X] · 8 Fractures + Rift Moths · 9 Chitterbloom's own column + two Maws · 10 the third group (Old Thrum's, if spared) · 11 rifts everywhere · 12 three Maws [X] · 13 surge · 14 the last group out.

**Story delivery.**
- *Briefing:* Ves'thara translates Chitterbloom: "You chased me off my own road. Now help me walk it." · Pebble: "Her friends will dig for you. They dig very fast. (squeak)" (the Brood Burrow gift) · QUILL (threat intel): "Something in there is gathering them. Don't let it."
- *Radio:*
  - w03 (if `held_fire_second_look`) Chitterbloom, via Ves'thara: "On the terraces, at dusk, you stopped. Some of mine walked home because you stopped."
  - w05 (if `stardust_choice = returned`) Ves'thara: "She says the warm stone you sent home arrived. She says it is good to be trusted."
  - w07 Pebble: "(squeak) Bricks says 'keep 'em off the perimeter.' What is perimeter? Is it a friend?"
  - w10 (if spared) Pebble: "(squeak) Grandmother!" · Thrum, via Ves'thara: "You are very tall. It must be lonely up there."
  - w10 (if cleared) Pebble: "Grandmother walked with the small ones. The sky sang the Leaving Song that day."
- *Barks:* Chitterbloom `ally_hushed` (translated): "One of mine." · QUILL `wave_cleared`: (silence: no jingle, and QUILL notices) "...No song. Logging it." · Ves'thara `new_enemy` maw: "It takes them into itself. Break it before it is full."
- *Full-screen scene* `a3_m01_scene_song` (after W14):
  - Pebble (`singing`): "(hum, six notes)" · Thrum, if alive, hums with her.
  - QUILL: "Melody match: 'Halcyon Bright.'"
  - Ves'thara: "They call it the Leaving Song. The sky sings it when many of them die at once. They thought it was mourning them."
  - Pebble: "This is the Leaving Song. The sky sings it when lots of us leave at once. You know it?"
  - Player: "I know it. I'm so sorry." / "Everyone knows it. That's the problem." / (hum along)
  - The delayed C1 echo: "Old Thrum remembered." (spared) or "Pebble will remember that." (cleared).
- *Debrief (Bricks's confession):* "Fifteen years ago I wrote 'vocalizations: non-linguistic.' I heard 'em, kid. I heard 'em singing, and I wrote that." · "Not knowing is a choice. I kept making it."
- *Gifts:* Hum Choir (if spared: Thrum's ring). Stasis Bloom becomes attunable.
- *Codex:* retitled *Field Journal*; corrected Brood Hauler and Elder entries unlock (the Elder's citation still reads "Survey 2346, Okonkwo" until A3M3); Maw; the Leaving Song; Old Thrum or "the small ones' walk."
- *Memo after:* `memo_a3_01` *Clean Exit: Frequently Asked Questions!* (foreshadows A3M2; small print: "Corporate Tower Licenses are reviewed at Exit.")

**Medals.** Victory · Perfect (no refugee lost) · **Nothing Gathered:** no Maw gathers a refugee. **Objective Intel +1, The Matriarch's Brood:** Chitterbloom's column (W9) loses no one.
**Rewards.** Stardust 280 · Intel 3 (+1).
**Par build.** Brood Burrow, Thumper, Prism, Skyhook. Burrow + Thumper at the spiral's outer ring; Prism (sticky beam) on the Maw's route; Skyhook under the air lane. Underfoot on each Maw. Target 66 (Evacuated %). Harness runs `spared` (Thrum's group present) and `cleared`. `noCounterBuild`: no splash and no Underfoot use (Maws grow; must lose by W9).

#### A3M2 · License Revoked

*The Admin Plaza again, at night. Sterling is on the line. She sounds... cheerful.*

- **Facts:** Admin Plaza at night · `act3` · Defend (Compliance Drones walk the old path to repossess the core: a leak is a repossession) · **revisit of A1M4**, 22×14 with A1M4's 14×10 centred and a dark band around it (rift cracks west and east, Sterling's shuttle pad north-east) · 17 buildable · 15 waves · 650 credits · **the Clean Exit cue** mid-W7 · companion Bricks · Technician Orbital Strike (until revoked).
- **Story purpose:** Bible A3M2: **Sterling's betrayal, enacted mechanically** (layer 7). Pays every Sterling tell, "Smiling is mandatory," and the Audit on the same plaza. Then QUILL's full confession (layer 4). **Target: cold anger; the floor drops out.**

**Layout and revisit dressing.** The same fountain U-road and three billboards, now dark with a hum-glyph over Hally's smile. The audit podium is empty; Prim's voice comes from the Compliance Drones. A1M4's wreckage carts are gone; your old Halcyon turrets stand dead on two pads (wreckage). Sterling's shuttle lifts from the north-east pad during W12 and its lights cross the sky.

**Waves.** 1 Motes · 2 Fractures through a west rift · 3 Compliance Drones ×4 [T: Halcyon Security; armor 4] · 4 drones + Motes [X] · 5 one Expediter + drones [T: haste aura; kill it first] · 6 drone column + Expediters [X] · 7 drones ×10, **mid-wave: the Clean Exit cue** (revoke the Halcyon class with the most towers placed, 100% refund; revoke Orbital Strike; QUILL lockout begins) · 8 Hollow push (preview hidden; QUILL leaks the trait) · 9 Expediters + drones · 10 Maws · 11 Rift Moths + drones · 12 big drone wave (the shuttle leaves) · 13 Hollow, both rifts · 14 everything Halcyon · 15 everything.

**Story delivery.**
- *Briefing:* Bricks: "Sterling's on the line. She sounds... cheerful." · QUILL (threat intel, complete for the whole map): "Armored machines, a fast escort, the usual dark. Write that down. Please."
- *Clean Exit cue* `a3_m02_cue_revoke` (≤ 4 lines, Sterling's portrait on screen):
  - Sterling: "I'm revoking your Corporate Tower License now! Don't take it personally. It isn't. That's what makes it so easy!"
  - QUILL (`policy`): "License revoked. Per poli— I'm sorry. Per policy. I'm sorry. I'm so sorry."
- *Radio (lockout leaks, one per countdown):* QUILL: "I am not permitted to tell you wave eight is mostly Hollow. I am permitted to cough. Ahem."
  - w09 Sterling: "The Preserve was always the buffer, Four-Forty-Seven. You did wonderful work getting them there!"
  - w10 Bricks: "Nineteen years." (silence, 2 s) "Pebble. Pocket. Now."
  - w11 Pebble: "(squeak) Is the sun lady angry?" · Bricks: "No. That's the worst part."
  - w13 Sterling: "Smiling is mandatory, Four-Forty-Seven. Even now. Especially now!"
- *Barks:* Prim (via drones, `wave_start`): "Repossession in progress. Please remain compliant." · Bricks `tower_built` (after the revocation): "Build what you've got. That's the job now."
- *Scene* `a3_m02_scene_confession` (after results): QUILL: "I logged every one. Timestamp, coordinates, yield. Forty-one thousand entries. I thought it was inventory." · The five directives, by number, for the first time. · "Don't decide about me yet."
- *Codex:* Compliance Drone, Expediter, Buffer Protocol, Clean Exit, QUILL's directives, Director Joy Sterling corrected.
- *Memo after:* `memo_a3_02` *Your Access Has Been Updated* (Halcyon Automated Systems; the first memo without an exclamation point).

**Medals.** Victory · Perfect Core · **Back on Your Feet:** no leak during W8–W9, the two waves after the revocation.
**Rewards.** Stardust 300 · Intel 3. Lost: one Halcyon class (until the jailbreak), Orbital Strike (Mk II Intel refunded).
**Par build.** Harpoon, Mindspike, Rivet, Thumper; two Halcyon classes so the cue takes one. Pre-cue: Harpoon ×2 at the fountain, Rivets T3, Thumper at the gate. Post-cue: rebuild the refund as Harpoon + Mindspike. Target 63. **Story variants:** the harness runs the cue against each Halcyon class the build could lose. `noCounterBuild`: no armor answer at all (must lose by W10).

#### A3M3 · The Gap

*An unwinnable surge. Bricks holds the choke in person. The score is how many get out.*

- **Facts:** Okonkwo's Gap · `act3` · **Holdout** (meter **Evacuated**; ends on the **SEAL**) · 22×14, 18 buildable · 14 waves (the SEAL fires when the last refugee group is through or W14 starts) · 700 credits · two southern passages to the blast doors (the convoy road west, the warren tunnel east); only the `door_choice` side carries refugees · Hollow from the north, plus rifts · companion Bricks (Suppressing Fire) · **Bricks ally blocker** at the choke ([maps.md §5.4](../design/maps.md#54-allies-on-the-map)) · Technician: Scanner Sweep if owned, else empty.
- **Story purpose:** **The second tear beat** (bible A3M3). Pays tower names, the name motif, the jingle, the stones, the survey, the pension. **Target: devastation with the player's hand on it.** The briefing says plainly: the goal is how many get out.

**Layout.** An old mining cut narrowing to a choke at mid-map, where Bricks stands on his post. South of it the cut forks to two blast doors. The chosen side's refugees enter from the south-west or south-east edge, cross under the choke's south face, and leave through the doors. The unchosen door is shut and dark. A ridge on the east rim will later hold the memorial wreck.

**Waves.** 1 Motes · 2 Fractures · 3 one Undertow [T: burrowing in Act III; Brood Burrow, Stasis Bloom] · 4 Motes + a rift · 5 a Maw · 6 Rift Moths · 7 Undertows ×3 [X] · 8 everything, larger · 9–14 escalation past what any build holds; Bricks's health falls toward its floor near the end.

**Story delivery.**
- *Briefing* `a3_m03_brief` (≤ 8 lines):
  - Bricks to Pebble: "Take this home, Pebble. It's someone. I kept 'em in a jar for fifteen years like a fool."
  - Bricks gives you the Amended Survey: "Correction: they were singing."
  - Bricks: "Your call, Thorn. Which door do I hold?" → **C3** (§6).
- *Radio:*
  - w02 Bricks (reads `arrival_reason`): "Why'd you really come out here, Thorn?" then one of: "Signing bonus. Ha. Me too, nineteen years back." / "Family. Yeah. Send 'em a picture of something nice." / "Lettuce. You came out here for lettuce. Best answer I ever heard."
  - w04 Bricks: "Stopped counting the days. Didn't seem like the important number anymore."
  - w06 Goldie (convoy) or Chitterbloom via Ves'thara (warren): "We're coming. Hold it. Please hold it."
  - w08 Bricks (getting more polite): "Thank you for the cover, Thorn. Much obliged."
  - w10 (name tag) Bricks: "This one's {name}. Good turret. Doesn't quit."
- *Barks:* Bricks `ally_hushed`: "Got through. Keep 'em coming." · Bricks `low_integrity`: "Steady. Steady now." · QUILL `boss_phase`-style (his health at 25%): "His vitals are dropping. I'm not permitted to— I'm telling you anyway."
- *SEAL cue* `a3_m03_cue_seal` (the forced input, [core-loop.md §2.11](../design/core-loop.md#211-scripted-moments)): Bricks: "Last one's through." · "(hum, six notes, slow)" · Pebble (`singing`): "(hum, six notes, along)" · Bricks: "Do it, {name}." · after 20 s, once: "Kid. It's okay. I'm tired of this song anyway." The only button is **SEAL**.
- *Results:* headline **Held.** · sub-line **Evacuated: {n}.** No debrief. The next screen is the base, and the Inbox has one automated memo.
- *Codex:* Undertow, Okonkwo's Gap, the Amended Survey; the Elder's corrected entry now cites "Amended Survey 2346, Okonkwo: 'Correction: they were singing.'"
- *Memo after:* `memo_a3_03` *Personnel Update* (automated): "Employee #HD-112 (Okonkwo, I.): Unscheduled Departure. Pension: Restructured." Small print: "Beneficiary changes are not accepted after departure."

**Medals.** Victory (always, on the SEAL) · **Held the Door** (in Perfect's slot): Evacuated ≥ 85% · **Held** (Challenge): Evacuated ≥ 60%. ("C3 will remember that" feedback per §6.)
**Rewards.** Stardust 260–340 by Evacuated (the floor keeps A3M4's Harpoon license affordable) · Intel 1–3 by medals.
**Par build.** Brood Burrow, Mindspike, Thumper (or the remaining Halcyon class), Prism. Burrow ×2 at the choke's north face for the Undertows (Stasis Bloom is the `altBuild` answer); Mindspike behind Bricks; Prism on the doors' approach. Suppressing Fire at the choke on every cooldown. Par Evacuated ≈ 70%. The map is **excluded from the monotonic chain** (Holdout asserts an Evacuated floor, [maps.md §6.4](../design/maps.md#64-balance-harness)); the harness runs both `door_choice` values and presses SEAL by `scriptInput`.

#### A3M4 · Empty Slot

*The shelters. His portrait is dark. The mail still comes.*

- **Facts:** The Shelters (under the colony) · `act3` · Defend (core: the shelter generator; Liability Enforcers come to repossess it, the Hollow comes for everyone) · 22×14, 18 buildable · 16 waves · 700 credits · two ground spawns + rifts + an air lane; **Gerald** flies the path on W7 as a neutral unit · companion **Bricks, `absent`** (dark portrait, disabled button, silence) · Technician **System Reboot** (patched in during the briefing) or Scanner Sweep · gifts in the briefing: Hum Choir (if not yet owned), Gloop Spitter (if `door_choice = warren`) · base before: the **jailbreak** (300 Stardust; free under `convoy`).
- **Story purpose:** Bible A3M4: the Lee rule (legacy over grief). Pays Gerald, the pension, the Fun Friday banner. Ves'thara loses her mother's face. Then **C4**. **Target: absence you can see on the HUD.**

**Layout.** Concrete tunnels and blast-door bays around a central hall where the colonists (convoy) or the warren (warren) shelter; their presence is dressing. The last Mandatory Fun Friday banner hangs in the hall; Goldie has one end of it over sleeping kids. Flag dressing: under `convoy`, a blast door stands upright by the hall, painted HE HELD THE DOOR; under `warren`, a ring of Skitterkin hum by the hall door. Gerald's route is an old mail chute that crosses the main path.

**Waves.** 1 Motes · 2 one Liability-Class Enforcer [T: heavy armor; Gloop, Harpoon, Railspike, Bunker Buster] · 3 Compliance + Expediter · 4 one Silencer [T: hushing; tendril tell; System Reboot, Hum Choir; codex popup] · 5 Fractures + a Maw · 6 Silencers ×2 + Motes [X] · 7 **Gerald's pass** + Undertows · 8 Liability ×2 + drones [X] · 9 Rift Moths + a Silencer [X] · 10 Hollow surge · 11 Halcyon column · 12 Silencers + Maws · 13 both spawns · 14 rifts open · 15 Liability + Silencers · 16 everything.

**Story delivery.**
- *Briefing:* QUILL: "I've patched in System Reboot. It was in a folder marked 'Do Not.' I did." · (convoy) Goldie: "Two hundred people, six trucks, and a lot of lettuce. I'm in charge now, apparently. Nobody else raised a hand." · (warren) Pebble: "The warren says thank you. Loudly. These are their spitters. (squeak)"
- *Silence:* at `map_start`, W2, the first `wave_cleared` (where he would name a turret), and W9, Bricks's frame lights dark for 3 s with no text.
- *Radio:*
  - w03 Pebble: "Why did the lettuce cross the road? Because... it was very crunchy water. (squeak) QUILL says that's not it."
  - w05 QUILL: "Sergeant Okonkwo would say— ...Never mind. I don't want to do his voice. It wouldn't be fair to him."
  - w07 QUILL: "Gerald is on the path. He has mail. From the Sergeant. Please hold fire."
  - w08 Gerald (status text): "DELIVERY: COMPLETE."
  - w11 Ves'thara: "I cannot remember my mother's face. I remember that I loved it. That will have to be enough."
- *Barks:* QUILL `new_enemy` silencer: "That one makes things quiet. Reboot. Please reboot." · QUILL `perfect_wave`: "Clean wave. He'd have said something gruff. I'll leave a gap."
- *Scene* `a3_m04_scene_mail` (after results): Gerald's envelope, sent days before the Gap: Bricks's pension form, re-filed and signed, beneficiary *"Pebble, c/o the Deep Halls."* A second slip: "Fire-control key. For Thorn. Point it at the bad stuff." → **Suppressing Fire** becomes a Technician ability, equippable from A3M5.
- *Debrief:* QUILL: "I'd decide for myself, but I'm not permitted to. That's sort of the whole problem." → **C4** (§6).
- *Base vignette* `base_a3_night_shift` (after C4, optional, ≤ 8 lines): Pebble, Ves'thara, and QUILL in the shelters. Pebble tells the scarecrow joke wrong; Ves'thara laughs, once (her only laugh). QUILL's line depends on C4: Keep tells the right punchline; Rewrite says "I'll have one tomorrow. I'm writing it."; Purge says nothing, and its status bar blinks.
- *Codex:* Silencer, Liability-Class Enforcer, System Reboot, Gerald (corrected: "Route older than the perimeter. Delivered everything he was given."), the pension form.
- *Memo after:* `memo_a3_04` (automated) *Facility Status: Reclamation Facility 2 at 140% Throughput.*

**Medals.** Victory · Perfect Core · **Keep the Lights On:** never more than one tower jammed at once. **Objective Intel +1, Signature: Received:** Gerald is never hit.
**Rewards.** Stardust 330 · Intel 3 (+1). Suppressing Fire (Technician). Hum Choir (cleared path).
**Par build.** Hum Choir, Harpoon, Mindspike, Brood Burrow (warren alt: Gloop for Harpoon). Choir T3 at the hall junction with Mindspike adjacent (Harmony); Harpoon ×2 on the Liability route; Burrow for the W7 Undertows. System Reboot on the W6 and W12 Silencer pairs; Hold Fire on Gerald's pass. Target 60. **Story variants:** `door_choice` (Gloop present or not; jailbroken class free or bought) and `spared_quiet_wave` (Choir owned since A3M2 or gifted here) all run par. Jam uptime ≤ 25%. `noCounterBuild`: no Choir and no System Reboot (must lose by W11).

#### A3M5 · Unsung

*Second Harvest at maximum throughput. Kip opens the vats. The bearers carry the dead home.*

- **Facts:** Second Harvest at night · `act3` · **Protect the asset** (the bearers: Brood Haulers walking the back route out of the plant carry the vats' unsung dead toward the Long Walk; bearer integrity 12) · **revisit of A2M4**, 22×14 with A2M4's 18×12 centred; the added band holds the bearers' back route (west) and Shareholder Value's hangar (east) · 18 buildable · 17 waves · 750 credits · companion Ves'thara (Stillness) · Technician: Suppressing Fire, System Reboot, or Scanner Sweep · gift in the briefing: **Sproing Pad** · **QUILL offline** if `quill_choice = rewrite`.
- **Story purpose:** Bible A3M5: pays Kip, the Haulers, and Prim; shows how big the Unsung is. **Target: purpose; the first map in Act III that feels like hitting back.** The difficulty peak before the finale.

**Layout and revisit dressing.** The same intake yard, Intake B, and vats, now glowing violet at full blaze; no Tidybots anywhere. Kip's office overlooks the yard. Three vat-feed lines are wreckage tiles (the objective). From W5 the bearers leave the vats by the new west route, past the old intake, to the band's west edge. When Shareholder Value jettisons its plating (phase 3), the plates land as four new wreckage tiles (the **crash site**).

**Waves.** 1 Motes toward the vats · 2 Compliance + one Maintenance Associate [T: healer aura; focus it] · 3 Fractures + Maws · 4 one Auditor [T: ring tell; interrupt with Stillness or Bloom; Choir] · 5 Kip opens the vats: the first bearers walk; Hollow hunt them · 6 Liability + Associates [X] · 7 Auditors ×2 + drones [X] · 8 Rift Moths + Undertows · 9 Silencers + Auditors [X, jam limit] · 10 Hollow surge at the vats · 11 Expediters + Liability · 12 mixed · 13 bearers' biggest group + Hollow · 14 **"Shareholder Value"** (Sterling by remote; drones from the hangar; Hostile Takeover; jettison) · 15–17 the Unsung swarm: the Hollow pours out of the opened vats after the last bearers.

**Story delivery.**
- *Briefing:* Kip: "Here. The ledger. Every batch, every date. Take it before I get scared again." · Pebble: "My friend Boing wants to help. He jumps very high!" (the Sproing Pad gift) · QUILL (unless offline): "Jammers inbound. Prim's model. I'm sorry it's her face."
- *If QUILL is offline:* the briefing's threat intel is shown by `system`; QUILL's barks and radio slots are silent; the base shows no R&D tip text.
- *Radio:*
  - w03 Kip: "I was number one. Do you know what I was number one at? I do now."
  - w05 Ves'thara: "Every vat is a chamber nobody sang to. Open them, Kip. Let them be carried."
  - w06 Kip: "The vats hum. Same six notes, all day. I told myself it was the machinery."
  - w09 Pebble: "The big ones carry the morning. That's what Grandmother says." (cleared: "...what Chitterbloom says.")
- *Boss cues (Sterling, remote):* "Throughput is people, Four-Forty-Seven! Specifically, it's my quarterly bonus!" · (Hostile Takeover) "It's just a name! Mostly!" · (jettison) "That plating was leased! You're going to love the invoice!"
- *Barks:* Ves'thara `ally_hushed` (bearer): "Carry the next one. Do not look back." · QUILL `skitterkin_killed_ahead` never fires (no hostile Skitterkin); QUILL `boss_phase` (Keep only): "Directive conflict. I'm— helping you anyway."
- *Codex:* Auditor, Maintenance Associate, "Shareholder Value," Kip's ledger, Brood Hauler corrected ("carries the morning").
- *Memo after:* `memo_a3_05` (automated) *Asset Recovery Scheduled: Dome Row.*

**Medals.** Victory · Perfect (core and bearers undamaged) · **Declined:** no tower stays jammed by Hostile Takeover for more than 1 s. **Objective Intel +1, Cut the Feed:** clear the three vat-feed wreckage tiles before W10 (the W10 surge then spawns one group smaller).
**Rewards.** Stardust 355 · Intel 3 (+1).
**Par build.** Hum Choir, Harpoon, Mindspike, Stasis Bloom. Bloom + Harpoon on the bearer route (Pinned Down); Choir T3 central with Mindspike (Harmony); Technician **System Reboot** for Hostile Takeover (Suppressing Fire is the alt). Stillness on Auditor tells. Target 57. **Story variants:** every `quill_choice` (Rewrite = no QUILL); `door_choice` (Gloop early or not). Jam uptime ≤ 25%. `noCounterBuild`: no jam protection (must lose by W10).

#### A3M6 · Let Them In

*Dome Row again, at night. The valley's Skitterkin come to the domes. Goldie opens them.*

- **Facts:** Dome Row at night · `act3` · **Escort**, meter **Sheltered** · **revisit of A1M1**, 22×14 with A1M1's 14×10 centred (offset 4, 2) · 19 buildable (A1M1's 10 + 9 in the band) · 18 waves · 780 credits · refugees enter at the north edge and walk A1M1's road, 2-wide in the band; the **safe exit is the A1M1 core position**, the gate, where Dome 1 now stands open · Hollow behind them on the same road plus rifts; Halcyon gunships on two air lanes · companion Zibzab (Clearance Sale) · Technician Suppressing Fire (par) · colonist militia posts under `convoy` · Gloop Spitter gift if `convoy`.
- **Story purpose:** Bible A3M6: the domes that kept them out now let them in. Pays A1M1, the Peeker rock, Zibzab, and the callsign. **Target: hope, earned and fragile.**

**Layout and revisit dressing.** The same S-road, domes, greenhouse roof, and gate. The route runs the same way as in A1M1 (north to south): what flips is the destination. The gate no longer lets them out into the dark; Goldie has opened Dome 1 beside it, the old road beyond is barricaded with lettuce crates, and every refugee who reaches the gate turns in. Pebble sits on top of the Peeker rock at (3,1) from W1. The Gathering Maw comes up the road *behind* the last group. Halcyon units that reach the gate reseal a dome door (the escort leak rule, reskinned as repossession: one sheltered refugee is lost).

**Waves.** 1 first group + Motes · 2 Fractures · 3 one Asset Recovery Gunship [T: flying armor; Sproing pin, Harpoon, Seeker Swarm] · 4 Maws behind a group · 5 Black Budget Operatives ×2 [T: cloaked armor; Lookout or Lantern + Harpoon] · 6 Rift Moths · 7 Undertows · 8 Silencers · 9 gunships + Black Budget [X] · 10 Hollow surge · 11 Expediters + drones (the "Accounting" column) · 12 rifts · 13 two groups at once · 14 gunships + Rift Moths · 15 Maws + Silencers · 16 **the Gathering Maw** behind the last group · 17–18 the road behind it fills.

**Story delivery.**
- *Briefing:* Goldie: "Open the domes. All of them. If Accounting has a problem, Accounting can come out here and say it." · `system` (Halcyon Automated Systems): "Asset Recovery: Dome Row scheduled for repossession. Please vacate." · Zibzab: "Price first: nothing. ...Don't look at me like that, friend. It's a terrible deal. I hate it. Take the crate."
- *Zibzab's crate:* every Vrell tune-up rank the player doesn't own, installed at no cost; if the player owns them all, one Field Protocol unlock of their choice instead. The NO REFUNDS sticker on the crate has been peeled off.
- *Radio:*
  - w02 Pebble (`peeker_poked` false): "I watched you from the rock. You never looked up. That's okay. You were busy."
  - w02 Pebble (`peeker_poked` true): "I watched you from the rock. You poked at me. I thought it was hello. Was it hello?"
  - w05 Ves'thara: "Thorn. No. You need a new name. Ask the small one. She has opinions."
  - w08 Goldie: "They never ate a single leaf. Not one. They were just walking home through my garden."
  - w12 Zibzab: "The Hollow is the worst customer I ever had. It doesn't want anything. It only wants."
- *Barks:* QUILL `first_leak`-style when the first group shelters (Keep/Rewrite): "Pest escaped containment. ...Toward the domes. Logging it. Gladly." · (Purge) "Sheltered: {evacuated}." · Zibzab `tower_built`: "Good build. I would have charged you more for it."
- *Debrief:* Pebble: "I picked Waykeeper. Grandmother says the ones who walk with the song need a name. You have to like it." (cleared: "Chitterbloom says...") → callsign **Waykeeper**. The choir gathers in Dome 1.
- *Codex:* Asset Recovery Gunship, Black Budget Operative, the Gathering Maw, Dome Row corrected, Zibzab corrected.
- *Memo after:* `memo_a3_06` (automated) *Deep Bore: Final Extraction Window Open.* (Foreshadows the finale's timer.)

**Medals.** Victory · Perfect (no refugee lost) · **Nothing Repossessed:** no Halcyon unit reaches the gate.
**Rewards.** Stardust 380 · Intel 3. Zibzab's crate. Callsign Waykeeper.
**Par build.** Sproing Pad, Lookout, Mindspike, Hum Choir. Sproing ×2 under the gunship lanes; Lookout at the gate approach for Black Budget units; Mindspike + Choir at the inner bend (Harmony); Underfoot is not available, so Suppressing Fire goes on the Maw's route. `altBuild`: Harpoon for Mindspike. Target 54 (Sheltered %). **Story variants:** `door_choice` (militia + Gloop under convoy). `noCounterBuild`: no detection (Black Budget units walk in; must lose before W13).

### Finale: Clearing the Way

#### FIN · Clearing the Way

*Walk them home. The choir sings the jingle as a funeral hymn, and your counter counts down to zero.*

- **Facts:** The Long Walk, from Dome Row north over Okonkwo's Gap to the mouth of the Deep Halls · `finale` (Act III dark; warm light rakes in from the east as waves clear; dawn in Phase 3) · **Choir escort** → the Leaving Song → Dawn ([maps.md §5.5](../design/maps.md#55-the-leaving-song-finale-rules)) · 22×14, 21 buildable (Halls-mouth ledges as high ground; natural gold seams as power nodes; four waymark lanterns as wreckage) · 26 waves (Phase 1: 18; Phase 2: 8 add waves on a fixed cadence) · 900 credits · three spawns (west rift field, east Bore road, north Halls mouth) + air lanes + rifts; the road is 2-wide · meter **Voices** (singers still singing) · companion: **the player picks who walks with them** from Ves'thara (Stillness, default), Chitterbloom (Underfoot), Zibzab (Clearance Sale), and QUILL (Time Dilation; absent under Purge) · Technician: Suppressing Fire (par) · allies: the choir (Pebble; Old Thrum if spared), the Returned (if `returned`), colonist militia (if `convoy`) · **Deep Bore** secondary timer in Phase 1.
- **Story purpose:** Bible finale and the third tear beat (the countdown), then catharsis and the one returning laugh. **Target: grief turning into ceremony, then hope.**

**Layout.** The road starts at the A1M1 gate on the south edge and winds north. At mid-map it climbs past the ridge above Okonkwo's Gap, where the **memorial wreck** stands: the wrecked variant of `memorialTower`, tooltip showing the `{name}` plate. The east band holds the Deep Bore rig and its progress bar. The north edge is the Halls mouth, a wide ledge where the choir stops and sings. Lighting starts at full dark; the eastern horizon warms one step per Phase 1 wave cleared.

**Waves.**
- *Phase 1, the Descent (W1–18):* 1 Motes ahead of the choir · 2 Fractures from the rift field · 3 Rift Moths · 4 Bore security: Compliance Drones + an Auditor (they guard the Bore, and the road runs past it) · 5 Maws · 6 Undertows · 7 Silencers · 8 gunships over the road · 9 the choir passes the memorial (cue; no wave pressure for 10 s) · 10 Hollow from all three spawns · 11 Black Budget Operatives ×2 escorting a Bore crew · 12 Maws + Silencers · 13 Rift Moth flock · 14 Associates + Liability on the Bore road · 15 rifts everywhere · 16 Undertows + Fractures · 17 the largest surge · 18 the Halls mouth: everything converges. (If the Bore fills before the choir arrives, its breakthrough surge spawns here.)
- *Phase 2, the Unsung (W19–26):* the Unsung rises from the Halls (gathers → splits → phases and burrows → the Song, with Silencer adds; `layToRest` at rest progress 100%). Add waves arrive every ~20 s. Hollow broken inside the song radius are laid to rest (gold motes; the counter falls); outside it they scatter and re-form once. Target length ~3 minutes at 1x for every `quill_choice` (±20%).
- *Phase 3, Dawn:* no waves.

**Story delivery.**
- *Briefing:* Zibzab: "Price first: one song, sung loud. That's my fee. Zibzab is a very hard bargainer." · Ves'thara: "Sing, Waykeeper. I will hold the light. You hold the road. We have both practiced." · QUILL (threat intel; or `system` under Purge): "Everything. From everywhere. And a drill."
- *Radio (Phase 1):*
  - w02 Pebble: "Clearing the way! Clearing the way! (That's the good part.)"
  - w05 Goldie (convoy, with the militia): "Every truck we've got is on this road. Lettuce included."
  - w09 at the memorial: Pebble: "(hum, low) That's Bricks's. That's yours." · then a silence line in Bricks's dark frame, 3 s.
  - w12 Ves'thara: "The light is thin here. It is enough. It has to be enough."
  - w15 (if `returned`) Chitterbloom, via Ves'thara: "The ones you sent home are walking with us. Listen. They are warm."
- *Phase 2 cues:* the counter returns at your lifetime total.
  - (Rewrite) QUILL: "Entry one. Cycle two, 08:14:22, Dome Ridge. You were small and you were running. I saw you. I'm sorry."
  - (Keep) when the choir enters the Halls, Directive 0 fires: QUILL revokes one tower class (100% refund). QUILL: "Directive conflict. Engaging Morale Module. ...Knock knock." The only button: **"Who's there?"** QUILL: "Not Halcyon." The class returns.
  - (Purge) QUILL: "I don't have them anymore. You counted, though. It's in your file. It's not nothing."
  - Sterling (as the Ascendant aborts with a partial load): "Clean Exit complete! You were a top-five-percent technician. I'll put that in your reference!"
- *Barks:* Pebble `wave_cleared` (Phase 2): "Louder! Sing louder!" · Ves'thara `ally_hushed`: "Keep singing. She will come back. They all come back." · QUILL `perfect_wave` (Keep): "That one went gold. All of it."
- *Full-screen scene* `fin_m01_scene_dawn` (≤ 20 lines): the counter reaches **0**; the last of the Unsung joins the song; hushed singers wake; the jingle in a major key, sung by everyone; Ves'thara: "Her face. I remember her face. She was laughing."; Pebble: "{name}. Bricks said it like that. I practiced."; the visor goes up once, a silhouette against the sunrise. The results screen reads **REMEMBERED: {n}**.
- *Then:* Sterling's farewell memo `memo_fin_01` *Clean Exit Complete!* (with a reference letter: "Four-Forty-Seven was a top-five-percent technician."), then **C5** and the epilogue cards ([bible.md §10](bible.md#10-endings)).
- *Codex:* the Unsung, the Deep Halls, the Deep Bore, the Long Walk corrected; the Field Journal's last page lists `REMEMBERED: {n}`.

**Medals.** Victory · Perfect (no singer hushed) · **Laid to Rest:** in Phase 2, at least 90% of Hollow units destroyed are destroyed inside the song. **Objective Intel +1, Waymarks:** relight all four waymark lanterns (clear their wreckage) in Phase 1.
**Rewards.** Stardust 500 · Intel 3 (+1).
**Par build.** Mindspike (Dread), Hum Choir, Sproing Pad, Brood Burrow; companion Ves'thara; Technician Suppressing Fire. Choir + Mindspike (Harmony) leapfrogging along the road; Sproing at the Gap ridge for gunships and Rift Moths; Burrow at the Halls mouth for Undertows and the Unsung's burrow phase; build the Halls-mouth ring before W17 so Phase 2 kills land inside the song. Target 48 (Voices %). **Story variants:** the harness runs the weakest choir (cleared, `sold` or `none`, `convoy`, `purge`) and the strongest (spared, `returned`, `warren`, `rewrite`), plus every `quill_choice` for the Phase 2 length check; under Keep the build script presses "Who's there?". `noCounterBuild`: no anti-air and no jam protection (must lose in Phase 1).

---

## 6. Choice and flag ledger

Flags are declared in `content/dialogue/flags.ts` ([bible.md §9](bible.md#flag-summary)). Scripts read flags but never set them; story sets them at map end or in dialogue ([maps.md §5.3](../design/maps.md#53-map-scripts)).

### 6.1 The choices

| Choice | Where and UI | Options (≤ 60 chars) | Sets | Feedback |
|---|---|---|---|---|
| **C1** The Quiet Wave | A1M5 W10. No UI, no prompt; Hold Fire is the only tool | (clear it, or hold fire) | `spared_quiet_wave` if ≥ 75% of the `quiet_wave` group leaks | None in A1M5 beyond Bricks's line, the memo paragraph, and the results stamp. Delayed echo in A3M1 |
| **C2** Zibzab's Price | A2M4 debrief, before the base. Two offers, price first, for the whole bank | "Sell it. Market price." / "Take it to them." | `stardust_choice` = `sold` / `returned` (`none` if the bank is 0) | None |
| **C3** Which door | A3M3 briefing. Bricks: "Your call, Thorn. Which door do I hold?" | "The convoy. Goldie's people." / "The warren. Pebble's people." | `door_choice` = `convoy` / `warren` | "Goldie will remember that." / "The warren will remember that." |
| **C4** QUILL's directives | A3M4 debrief, after the mail scene | "Purge them. All of them." / "Keep them. Stay yourself." / "Write your own." | `quill_choice` = `purge` / `keep` / `rewrite` | "QUILL will remember that." |
| **C5** Stay or Go | After Dawn, full-screen | "We stay. We keep the way open." / "We go. We give it back." | `ending_choice` = `stay` / `go` | None |

### 6.2 Flag ledger

| Flag | Values | Set | Pays off |
|---|---|---|---|
| `arrival_reason` | `bonus` / `family` / `lettuce` | Character creation | A1M1 Goldie's greeting variant; A1M2 Kip ("Signing bonus? Me too. Spent it."); **A3M3 w02 Bricks** ("Why'd you really come out here?") |
| `peeker_poked` | bool | Clicking the Peeker on any Act I map | **A3M6 w02** Pebble's rock line (two variants) |
| `spared_quiet_wave` | bool | A1M5 end (silent) | A1M5 results stamp + memo paragraph; **A2M2** Ves'thara's opening line; **A3M1** Thrum alive and reunited (else Pebble's news), the C1 echo, **Hum Choir at A3M1 debrief** (else A3M4); A3M5 and A3M6 Pebble quoting "Grandmother" vs Chitterbloom; **FIN** Thrum beside Pebble (+0.5 song radius); epilogue card 3 |
| `asked_zibzab_early` | bool | Zibzab's shop, after A1M3 through before A2M4 | **A2M4** truth scene: "You asked me in the spring. I told you. You kept buying." |
| `held_fire_second_look` *(minor, proposed)* | bool | A2M3 end: true if the `not_firing` bark fired or Hold Fire was on while a `fleeing` group was in range | **A3M1 w03** Chitterbloom's line. No mechanical effect, no medal, no false negative line |
| `stardust_choice` | `sold` / `returned` / `none` | A2M4 debrief (C2) | `sold`: Intel windfall + Zibzab Tune-up immediately; `returned`: **A3M1 w05** line, **FIN** the Returned (two bearers) and **w15** line; `none`: Zibzab's "No refunds. I did say."; epilogue card 5 |
| `door_choice` | `convoy` / `warren` | A3M3 briefing (C3) | **A3M3** which refugees cross; **A3M4** jailbreak free (convoy) or 300; Gloop at A3M4 (warren) or A3M6 (convoy); shelter dressing (HE HELD THE DOOR, or the hum ring); **A3M6 and FIN** militia posts (convoy); FIN choir size; Goldie's A3M4 line; epilogue card 2 |
| `quill_choice` | `purge` / `keep` / `rewrite` | A3M4 debrief (C4) | **Night Shift** vignette line; **A3M5** QUILL offline (rewrite); QUILL's voice A3M5–FIN (purge: status-bar portrait, flat lines, no jokes); Time Dilation absent from the FIN pick list (purge); QUILL Rapport refund (purge); **FIN Phase 2** log / knock-knock + revocation / silence, and the rest multiplier; epilogue card 4 |
| `ending_choice` | `stay` / `go` | After FIN (C5) | Epilogue cards 1, 2 (`go` variant), 8, 10; final HUD image |

**Save state that behaves like a flag** (owned by [progression.md §11](../design/progression.md#11-what-persists)): the lifetime Pests Processed (A2M2 read-aloud, the FIN countdown, `REMEMBERED`), the revoked class (A3M2 → jailbreak), `memorialTower` and the `{name}` plate (A3M3 → FIN), `bricksTagIndex`, the callsign.

### 6.3 Name tags

Bricks's tag list, in order (campaign data; append-only): **Denise** (A1M2), **Marguerite** (A1M5), **Biscuit** (A2M1), **Auntie Funmi** (A2M3; the aunt who raised him in Lagos, moved to the Core, wrote every month for ten years, then stopped), **Dele** (A2M5; his brother, a Core-world accountant who doesn't call), **Lucky** (A3M2; his survey mule-bot, "left on Kepler-2207, still walking, probably"). A3M3 is `{name}`. A3M4's tag moment is silence. Replays reuse each map's first name.

---

## 7. Pacing check

Tone: 1 = pure whimsy, 10 = grief. Difficulty: relative effort on Standard. Novelty: how much is new to learn. Par margin is the target median (Escort: Evacuated / Sheltered / Voices %).

| Map | Tone | Difficulty | Novelty | Par margin | Note |
|---|---|---|---|---|---|
| A1M1 | 1 | 1 | 9 | 95 | Everything is new, gated by prompts |
| A1M2 | 1 | 2 | 6 | 92 | First pebble in the shoe |
| A1M3 | 1 | 2 | 6 | 90 | Lightest threat load in Act I, for Hold Fire |
| A1M4 | 2 | 3 | 6 | 87 | First loadout choice |
| A1M5 | 3 | 4 | 6 | 84 | Boss; the Quiet Wave; stinger |
| A2M1 | 4 | 4 | 7 | 82 | Re-baseline after the boss |
| A2M2 | 4 | 5 | 6 | 79 | |
| A2M3 | 5 | 5 | 4 | 77 | Deliberate low novelty: room to look |
| A2M4 | 6 | 6 | 6 | 74 | The midpoint |
| A2M5 | 6 | 6 | 8 | 71 | Overloaded by design; split trigger in §1 |
| A2M6 | 6 | 7 | 5 | 68 | Warm, then dark |
| A3M1 | 8 | 7 | 7 | 66 | Tear beat 1 |
| A3M2 | 7 | 7 | 7 | 63 | Anger, not grief |
| A3M3 | 10 | — | 6 | ≈70 (excluded) | Tear beat 2; Holdout |
| A3M4 | 9 | 8 | 6 | 60 | Absence |
| A3M5 | 7 | 9 | 6 | 57 | Hitting back; difficulty peak before the finale |
| A3M6 | 6 | 9 | 6 | 54 | Hope; Waykeeper |
| FIN | 8 → 2 | 10 | 4 | 48 | Tear beat 3, then dawn |

Par margins fall monotonically (each ≤ the previous + 5) inside every act's band ([../tech/conventions.md](../tech/conventions.md#balance-sims-npm-run-sim)); A2M1 uses its post-boss re-baseline; A3M3 is excluded and A3M4 is checked against A3M2.

**Where the curve might sag (self-critique).**
- **A2M3 is the flattest map in the game** on purpose (two shield variants, a revisit). If playtesters call it boring rather than quiet, give it the Forked path back (the mining cut splitting a switchback) instead of adding enemies.
- **A3M3 breaks the chain.** A player who holds badly gets a low Evacuated at the emotional peak and may feel they failed Bricks. The briefing must frame the score as how many got out, never as winning, and the SEAL beat must play identically at any score.
- **A3M4 asks a grieving player to learn two hard threats** (hushing and heavy armor). System Reboot in the briefing and a single-unit teach wave for each are the mitigation; watch first-attempt loss rates closely.
- **A3M5 → A3M6 → FIN are three very hard maps in a row**, and A3M6 is the hopeful one. If A3M6's three-faction busyness drowns the Waykeeper beat, cut the Black Budget units back to two waves.
- **After A2M5 shields vanish**, so Zapcoil and the new Prism Spire both lose their main job right as Prism arrives (Energy is weak against the Hollow). Prism's boss-killing and Rift Moth burst have to feel good in A2M6, or the gift lands flat.
- **The tone step from A2M6 (6) to A3M1 (8)** is the biggest single jump. The whistle vignette and A3M1's quiet first waves (no jingle, and QUILL noticing) are the bridge; if it still reads as "where it got dark," move the Fun Friday PA loop earlier into A2M6.
- **Three of the four revisits are in Act III.** Keep each revisit's outer band visibly new, so they read as returns rather than reuse.
- **Finale Phase 2 under Purge runs longest** with the least to say. If it drags, shorten Purge's `restTarget` and let the silence be the cost instead of extra minutes.

---

## 8. Open questions

Items this campaign needs from design, tech, or art. Each is stated here as the campaign assumes it.

1. **Counting rules** (§3) for maps.md §6.3 and the validator: an enemy and its new trait count as one threat, capstone bosses are exempt, and story events count separately (A3M2's revocation and lockout as one cue).
2. **A1M1 tutorial:** the loadout screen is skipped and the Thumper build button unlocks at W3.
3. **Name tags start at A1M2** (towers.md says every Bricks companion map; A1M1 is the exception).
4. **R&D Engineering opens after A1M4** (Sterling's sign-off); Command opens after A1M1.
5. **Zibzab's stock schedule:** Lookout after A1M5, Harpoon after A2M1.
6. **Gift timings:** Prism at the A2M5 debrief (usable A2M6; Stillness from A2M6, not A2M5); Hum Choir at the A3M1 debrief if spared (usable A3M2); Stasis Bloom attunable after A3M1; Sproing Pad at A3M5; **Gloop is the C3 gift**, at A3M4 (warren) or A3M6 (convoy). Progression's "two maps late" would land on the finale with no practice, so the campaign uses one.
7. **Revisits may grow:** the original grid sits centred inside the act-sized map, with a new outer band.
8. **A3M6's direction:** the route runs north to south as in A1M1; the destination flips (the gate opens into Dome 1). maps.md's "route reversed" and bible §8's "South to the domes" should read this way; the true reversal is the finale.
9. **Halcyon units at an escort exit** use the same leak rule, presented as a dome being resealed.
10. **The finale companion pick list** (Ves'thara, Chitterbloom, Zibzab, QUILL unless purged). Fallback: Ves'thara fixed.
11. **Finale phase checkpoint** ("Retry from the Halls") on a Phase 2 loss, forfeiting Perfect and Challenge for that run.
12. **Finale meter label:** **Voices**.
13. **Optional objectives** (Objective Intel) need a `objectives` field in map data.
14. **Event hooks:** the boss phase 3 jettison spawning wreckage (A3M5); Gerald as a neutral unit again (A3M4); the Deep Bore's Halcyon units spawning from a Bore spawn.
15. **First-clear Stardust** for 5/6/6 (§4.9) replaces progression's 6/5/5 table; A1M1 pays 0.
16. **`held_fire_second_look`** is a new minor flag.
