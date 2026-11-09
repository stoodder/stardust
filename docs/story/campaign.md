# Campaign

The authoritative campaign: the order of maps, what each one introduces, its choices, and the reference profile the balance harness plays. It expands the beat sheets in [bible.md §6](bible.md#6-the-arc-act-by-act) and the choices in [bible.md §9](bible.md#9-the-choices). Mechanics, numbers, and rules live in `docs/design/` and are linked, not restated: [core-loop.md](../design/core-loop.md), [towers.md](../design/towers.md), [enemies.md](../design/enemies.md), [progression.md](../design/progression.md), [maps.md](../design/maps.md). Voice and line limits come from [style-guide.md](style-guide.md).

**The per-map entries** (story beats, waves, lines, medals, rewards, par builds) live in four files, one heading per map:
- [campaign/act1.md](campaign/act1.md): Act I, *Pest Control* (A1M1–A1M5), plus the Joke of the Shift table
- [campaign/act2.md](campaign/act2.md): Act II, *First Contact* (A2M1–A2M6), plus the fleeing-Skitterkin summary
- [campaign/act3.md](campaign/act3.md): Act III, *The Quiet* (A3M1–A3M6)
- [campaign/finale.md](campaign/finale.md): *Clearing the Way* (FIN)

Each map's heading is `<ID> · <Name>`, so its anchor is predictable: `campaign/act1.md#a1m1--orientation-day`. Map IDs: `A1M1` is data id `a1_m01`; the finale `FIN` is `fin_m01` ([../tech/conventions.md](../tech/conventions.md)). Spoilers throughout.

---

## 1. Shape of the campaign

**18 maps: 5 + 6 + 6, plus a one-map finale in three phases.** (The vision's "about 17" counts the three acts; the finale is the eighteenth.) No map is added by default:

- **A2M5 stays one map.** Its pivot works if the boss half is short (the Penitent pivots at 50%, so its blink phase is never reached) and the escort half is gentle (the escort is *introduced* here and *tested* in A3M1). **Split trigger:** if A2M5's median 1x playtime exceeds 15 minutes, split into A2M5a *The Glass Witch Returns* (Defend + Penitent, phase 3 restored) and A2M5b *The Long Walk* (Escort). Both keep A2M5's flags and rewards split 50/50.
- **The finale stays one map,** because a results screen between the walk and the song would break the ritual. It has a checkpoint at the start of Phase 2 instead ([finale.md](campaign/finale.md#fin--clearing-the-way)). **Split trigger:** median 1x playtime over 25 minutes → `fin_m01` (the Descent) and `fin_m02` (the Unsung and Dawn), 19 maps total.
- **"Night Shift" is a short, mandatory base vignette, not a map.** A light-combat map would break the monotonic-difficulty and one-new-thing rules, and grief needs a pause, not a dip. It plays in the shelters after C4 ([act3.md, A3M4](campaign/act3.md#a3m4--empty-slot)) and holds Ves'thara's only laugh.

**Coverage rules for writers.** Sterling gets at least one between-wave line on every Act II map, so the betrayal costs something. Pebble and Bricks share at least one exchange on every map from A2M3 to A3M3, plus the whistle vignette (A2M6). Every Act I map has one Joke of the Shift.

**Timeline.** One Tumble day is ~38 standard days; the campaign spans ~7 weeks. Day numbers drive Bricks's pension count (412 days on day 2), memo dates, and the light.

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
| A1M1 | [Orientation Day](campaign/act1.md#a1m1--orientation-day) | I | Defend (tutorial) | Dome Row (`act1`) | 7 | Nibbler, Zoomer | Rivet, Thumper (issued); Orbital Strike (Sterling's gift) | Bricks (Suppressing Fire) + Bricks ally | — | Teamwork Makes the Dream Work™ |
| A1M2 | [Hatching Season](campaign/act1.md#a1m2--hatching-season) | I | Defend | The Terraces (`act1`) | 8 | Chonk, Brood Hauler | Frostline Sprinkler | Bricks | — | Aim for the Sack! |
| A1M3 | [Special Delivery](campaign/act1.md#a1m3--special-delivery) | I | Defend + Gerald (neutral) | Mail Road (`act1`) | 8 | Puffwing | Skyhook; shop opens after (Zapcoil sample) | QUILL (Time Dilation) | Early ask opens | Return to Sender |
| A1M4 | [The Audit](campaign/act1.md#a1m4--the-audit) | I | Defend | Admin Plaza (`act1`) | 9 | Elder, Bunchling | Zapcoil (first use); R&D Engineering opens after | Zibzab (Clearance Sale) | — | Asset Recovery |
| A1M5 | [Record Quarter](campaign/act1.md#a1m5--record-quarter) | I | Defend + boss | Northern Gate (`act1`) | 10 | Digger, **Matriarch Chitterbloom** | Lookout Shack stocked after | Bricks + Bricks ally | **C1** (implicit) | Party Pooper Prevention |
| A2M1 | [Rig Nine](campaign/act2.md#a2m1--rig-nine) | II | Defend | The Diggings (`act2.gold`) | 10 | Mote | Harpoon and Crane stocked, Scanner Sweep in R&D after | Bricks | — | Hiccup Contained |
| A2M2 | [The Glass Witch](campaign/act2.md#a2m2--the-glass-witch) | II | Protect the rigs + boss | Ridge Rigs (`act2.gold`) | 11 | Glimmer, **The Glass Witch** | — | QUILL (Time Dilation) | — | Glass Half Empty |
| A2M3 | [Second Look](campaign/act2.md#a2m3--second-look) | II | Defend (revisit A1M2) | The Terraces at dusk (`act2.gold`→`act2.dusk`) | 11 | Weft Warden, Lightwing | — | Bricks | — | Clear Skies |
| A2M4 | [Second Harvest](campaign/act2.md#a2m4--second-harvest) | II | Defend | Reclamation Facility 2 (`act2.dusk`) | 12 | Veilwalker, Blinkstrider | Q3 Bonus (+400 Stardust) on the results screen | Zibzab (Clearance Sale) | **C2** (debrief) | Nothing Unseen |
| A2M5 | [The Long Walk](campaign/act2.md#a2m5--the-long-walk) | II | Defend → Escort (pivot) + boss | Preserve Road (`act2.dusk`) | 12 | Aegis Cantor, **Sunderglass Penitent** | Prism Spire (gift, debrief); Mindspike + Lantern attunable | Bricks | — | Kneel |
| A2M6 | [Sundown](campaign/act2.md#a2m6--sundown) | II | Defend + Sundown | Colony perimeter (`act2.dusk`→night) | 14 | Fracture, Rift Moth | (Prism first use) | Ves'thara (Stillness) + Bricks ally | — | Before the Dark |
| A3M1 | [The Preserve](campaign/act3.md#a3m1--the-preserve) | III | Escort | The Preserve (`act3`) | 14 | Maw | Scuttle Den (gift, briefing); Hum Choir if C1 spared (debrief); Stasis Bloom attunable | Bramble (Underfoot) | C1 payoff | Nothing Gathered |
| A3M2 | [License Revoked](campaign/act3.md#a3m2--license-revoked) | III | Defend + revocation (revisit A1M4) | Admin Plaza at night (`act3`) | 15 | Compliance Drone, Expediter | — (loses an Everglow class and Orbital Strike) | Bricks | — | Back on Your Feet |
| A3M3 | [The Gap](campaign/act3.md#a3m3--the-gap) | III | **Holdout** | Okonkwo's Gap (`act3`) | 14 | Undertow | — | Bricks + Bricks ally (blocker) | **C3** (briefing) | Much Obliged |
| A3M4 | [Empty Slot](campaign/act3.md#a3m4--empty-slot) | III | Defend | The Shelters (`act3`) | 16 | Silencer, Liability-Class Enforcer | System Reboot; Hum Choir (if not yet); Gloop (if warren); jailbreak in base | Bricks (**absent**) | **C4** (debrief) | Keep the Lights On |
| A3M5 | [Unsung](campaign/act3.md#a3m5--unsung) | III | Protect the bearers + boss (revisit A2M4) | Second Harvest at night (`act3`) | 17 | Auditor, Maintenance Associate, **"Shareholder Value"** | Sproing Pad (gift); Suppressing Fire (Technician) | Ves'thara (Stillness) | — | Declined |
| A3M6 | [Let Them In](campaign/act3.md#a3m6--let-them-in) | III | Escort (**Sheltered**) + boss (revisit A1M1) | Dome Row at night (`act3`) | 18 | Asset Recovery Gunship, Black Budget Operative, **The Gathering Maw** | Gloop (if convoy); Zibzab's crate | Zibzab (Clearance Sale) | — | Nothing Repossessed |
| FIN | [Clearing the Way](campaign/finale.md#fin--clearing-the-way) | Finale | Choir escort → Leaving Song → Dawn | The Long Walk to the Deep Halls (`finale`) | 26 | **The Unsung** | — | Player's pick of who walks with you (default Ves'thara) | **C5** after | Laid to Rest |

---

## 3. Counting rules

Threats are counted by design's rules ([maps.md §6.3](../design/maps.md#63-one-new-thing-per-map)): an enemy and its new trait count as one threat, bosses built only from known mechanics are exempt (Chitterbloom, the Penitent, Shareholder Value, the Gathering Maw, the Unsung; **the Glass Witch counts**, because she previews shield pulses and blinking), a scripted story event counts as one (A3M2's Clean Exit cue carries the license revocation, the Orbital Strike revocation, and the QUILL lockout), and a map adds at most one new required-counter category. How the campaign applies them:

1. **Fleeing groups carry no threat.** From A2M1 every Skitterkin enemy group is `fleeing` and leaks for 0 ([enemies.md § Fleeing Skitterkin](../design/enemies.md#fleeing-skitterkin)), so their traits appear in `threatIntel` as icons but count as 0 threat ([maps.md §6.2](../design/maps.md#62-threat-budget-planning-tool)) and never toward a required counter.
2. **Counters are categories.** Required counters, the soft-enemy rule, and which traits are intel-only come from the trait table in [enemies.md §3.1](../design/enemies.md#31-counter-categories). Each required counter has exactly one no-counter build, which leaves out every answer in that category; no alt build may lack an answer to a required counter ([maps.md §6.1](../design/maps.md#61-per-act-targets)). The act files list each map's builds.
3. **Story events, presentation modifiers (Revisit), economy modifiers (salvage yard, crash site), objective variants, allies, towers, abilities, and tiles are novelties, not threats.** At most one story event per map, always foreshadowed in the briefing.
4. **Every map still introduces at least one new thing** (§4.7 lists them).

---

## 4. Introduction schedule

"Teach → test → combine" ([enemies.md §7](../design/enemies.md#7-wave-design-rules)): **teach** = alone or in a small slow group with a NEW badge; **test** = mixed with known threats later in the same map; **combine** = paired with a new modifier or faction on a later map.

### 4.1 Towers and specialization access

Specs are bought in R&D ([progression.md §7.1](../design/progression.md#71-engineering-specializations)) once the tower is owned **and** Engineering is open; one purchase unlocks both of a tower's specs. **Engineering opens after A1M4**, when Sterling signs off your tier approvals (her second gift; small print: "contingent on Q3 extraction targets"). R&D's Command branch opens after A1M1 offering only Orbital Strike Mk II and Companion Rapport; Field Protocol slot 2 appears after A1M3 and Scanner Sweep after A2M1. The first in-map tier-4 choice is taught in A1M5.

| Tower | Available from | How | Designed first use | Specs purchasable from | Link debut |
|---|---|---|---|---|---|
| Rivet Autoturret | A1M1 | Issued | A1M1 W1 | after A1M4 | Crossfire A1M1 |
| Thumper Mortar | A1M1 (build button unlocks when W3's countdown starts) | Issued | A1M1 W3 | after A1M4 | Crossfire A1M1; Sitting Ducks A1M2 |
| Frostline Sprinkler | A1M2 | Issued | A1M2 | after A1M4 | Sitting Ducks A1M2; Conductive A1M4 |
| Skyhook Flak Battery | A1M3 | Issued | A1M3 W3 | after A1M4 | Skywatch A2M4 |
| Zapcoil | Shop opens after A1M3 | Sample ("Price first: your next visit.") | A1M4 | after A1M4 | Conductive A1M4; Resonance A2M6 |
| Lookout Shack | Stocked after A1M5 (150) | Licensed | A2M4 (required) | on license | Overwatch, Skywatch A2M4 |
| Grapple Harpoon | Stocked after A2M1 (250) | Licensed | A3M2 armor (the reference licenses it before A3M2) | on license | Reel It In; Pinned Down A3M3 |
| Salvage Crane | Stocked after A2M1 (200) | Licensed | A2M4 intake wreckage (optional; never par) | on license | Reel It In A2M2+; Finders Keepers A3M1+ |
| Prism Spire | A2M5 debrief | Gift (Ves'thara) | A2M6 (holds the light at Sundown) | on gift | Resonance A2M6; Lightsong A3M1+ |
| Mindspike Obelisk | After A2M5 (3 Intel) | R&D attunement | A2M6 (reference: A3M2) | on attune | Stillmind, Harmony A3M1+ |
| Seer's Lantern | After A2M5 (3 Intel) | R&D attunement | A3M6 Black Budget (alt to Lookout) | on attune | Lightsong; Lookie Here A3M5+ |
| Stasis Bloom | After A3M1 (3 Intel) | R&D attunement | A3M5 interrupts | on attune | Pinned Down, Stillmind A3M3 |
| Scuttle Den (`burrow`) | A3M1 briefing | Gift (Bramble's warren) | A3M1 | on gift | Splash Zone, Finders Keepers A3M1 |
| Hum Choir | A3M1 debrief if `spared_quiet_wave`; else A3M4 briefing | Gift (Thrum's ring / the shelter elders) | A3M2 or A3M4 | on gift | Harmony A3M2+; Bounce Chorus A3M5+ |
| Gloop Spitter | A3M4 briefing if `door_choice = warren`; A3M6 briefing if `convoy` | Gift (the warren Bricks saved / the warren regathered) | A3M4 Liability or A3M6 | on gift | Acid Rain, Sticky Flak |
| Sproing Pad | A3M5 briefing | Gift (Pebble's friend "Boing" and the leapers) | A3M5; A3M6 gunships | on gift | Lookie Here, Bounce Chorus A3M5 |

**Loadout choice begins at A1M4**, the first map where the player owns more than four tower types. A1M1 skips the loadout screen.

### 4.2 Abilities

| Ability | Slot | First available | Ends | Teach |
|---|---|---|---|---|
| Orbital Strike | Technician | A1M1 (welcome memo gift) | Revoked mid-wave A3M2 (Mk II Intel refunded) | A1M1 W5 prompt |
| Suppressing Fire | Companion (Bricks) | A1M1 | Companion through A3M3; **Technician from A3M5** (granted in A3M4's closing scene) | A1M1 W4 prompt |
| Time Dilation | Companion (QUILL) | A1M3 | Lost for good under C4 Purge. Under C4 Keep it is also an equippable Technician ability from A3M5 through finale Phase 1, and dark for Phase 2 | A1M3 W5 |
| Clearance Sale | Companion (Zibzab) | A1M4 | — | A1M4 W1 |
| Scanner Sweep | Technician | R&D after A2M1 (2 Intel) | — | A2M4 (optional detection) |
| Stillness | Companion (Ves'thara) | A2M6 (she is the Ward ally in A2M5) | — | A2M6 W5 vs Rift Moths |
| Underfoot | Companion (Bramble) | A3M1 | Finale pick list | A3M1 W4 vs the first Maw |
| System Reboot | Technician | A3M4 briefing (QUILL patches it in; kept under every C4) | Unavailable in A3M5 under C4 Rewrite (QUILL is offline) | A3M4 W4, first Silencer |

Between A3M2's revocation and A3M4, slot 1 holds only Scanner Sweep if the player bought it; otherwise it is empty. At the Gap the player has only Bricks's ability. That is intended.

### 4.3 Enemies and bosses

| Enemy | Teach | Test | Combine | Notes |
|---|---|---|---|---|
| Nibbler | A1M1 W1 | A1M1 W5, W7 | A1M5 (boss sneezes), A2M1 (fleeing) | Youngling form: the Quiet Wave; ally sprites in Act III |
| Zoomer | A1M1 W4 | A1M1 W6 | A1M2 W6, A2M1 W1 | |
| Chonk | A1M2 W3 | A1M2 W4 | A1M3 W4, A1M4 W5 | First armor "plink" |
| Brood Hauler | A1M2 W5 (one, alone) | A1M2 W7–8 | A1M4 W7, A2M3 W3 (cargo visible), A2M4 | Friendly bearer A3M5, FIN |
| Puffwing | A1M3 W3 | A1M3 W5 | A1M5 W6, A2M1 W2 | Brings the air lane |
| Bunchling | A1M4 W2 | A1M4 W3, W5 | A1M5 boss phase 2, A2M1 W7 | |
| Elder | A1M4 W4 | A1M4 W6, W9 | A1M5 W5 and the Quiet Wave (Old Thrum), A2M3 W8 | |
| Digger | A1M5 W2 | A1M5 W4 | A2M1 W2, boss phase 2 | Burrowing taught as "not a hard requirement" |
| Mote | A2M1 W3 | A2M1 W6, W9 | Every later map | First Hollow; first hush and the Heavy tell |
| Glimmer | A2M2 W2 | A2M2 W4–5 | A2M3, A2M4, A2M5 | First shields |
| **The Glass Witch** | A2M2 W11 | — | — | Retreats at 40% |
| Weft Warden | A2M3 W4 | A2M3 W7 | A2M4 W8, A2M5 W2 | |
| Lightwing | A2M3 W6 | A2M3 W7 | A2M4 W8, A2M5 W4 | |
| Veilwalker | A2M4 W3 | A2M4 W7 | A2M4 W11, A2M5 (cloaked shards) | First cloak |
| Blinkstrider | A2M4 W6 | A2M4 W9 | A2M5 W3 | |
| Aegis Cantor | A2M5 W1 | A2M5 W2, W4 | Penitent pulses W5 | |
| **Sunderglass Penitent** | A2M5 W5 | — | — | `pivot` at 50% or when W6 starts |
| Fracture | A2M6 W3 | A2M6 W6 | A3M1 onward | |
| Rift Moth | A2M6 W5 | A2M6 W9 | A3M1, A3M3, A3M4, A3M6, FIN | |
| Maw | A3M1 W4 | A3M1 W7, W12 | A3M3, A3M6 | Gathers refugees on escorts |
| Compliance Drone | A3M2 W3 | A3M2 W4, W6 | A3M4, A3M5 (boss hangar), A3M6, FIN | Everglow Security debut |
| Expediter | A3M2 W5 | A3M2 W6, W9 | A3M4, A3M5, A3M6 | |
| Undertow | A3M3 W3 | A3M3 W7 | FIN (W6, W16, Unsung phase 3) | |
| Liability-Class Enforcer | A3M4 W2 | A3M4 W8 | A3M5, FIN | |
| Silencer | A3M4 W4 | A3M4 W6, W9 | A3M5, FIN (Unsung phase 4) | First hushing; System Reboot given first |
| Maintenance Associate | A3M5 W2 | A3M5 W6 | FIN | |
| Auditor | A3M5 W4 | A3M5 W7, W9 | FIN (Bore security) | |
| **"Shareholder Value"** | A3M5 W14 | — | — | Phase 3 jettison makes wreckage (crash site) |
| Asset Recovery Gunship | A3M6 W3 | A3M6 W9 | FIN | |
| Black Budget Operative | A3M6 W5 | A3M6 W9 | FIN (two, Bore escort) | One teach wave and one test wave only |
| **The Gathering Maw** | A3M6 W16 | — | — | Comes up the road behind the last group |
| **The Unsung** | FIN Phase 2 | — | — | `layToRest` |

**Skitterkin stop being a threat at A2M1 and stop being killable after A2M4.** From A2M1 every Skitterkin enemy is fleeing: leak 0, medal-exempt, bounty if killed. The last Skitterkin the player *can* kill are the fleeing groups in A2M4's post-truth waves; from A2M5 the Skitterkin on the path are refugees. So the counter's last possible increase happens on the map where the player learns what it counts, and the A2M5 and A2M6 results lines show the same number, unchanged.

### 4.4 Traits, modifiers, objectives, and story events

| Element | Kind | First appears | Teach → test |
|---|---|---|---|
| Fast | Trait | A1M1 W4 (Zoomer) | W6 rush |
| Armored | Trait | A1M2 W3 (Chonk) | Haulers W7–8 |
| Flying + air lane | Trait + modifier | A1M3 W3 | W5 flock |
| Optional bark button ("Who's there?") | UI | A1M3 w04 (the knock-knock) | A3M6 w02 (Pebble) |
| Splitting | Trait | A1M4 W2 | W3, W5 |
| Huddle | Trait | A1M4 W4 | W6, W9 |
| Burrowing | Trait | A1M5 W2 | Boss phase 2 |
| Second spawn | Modifier | A1M5 W3 | W7–8 |
| Youngling (non-hostile young) | Wave modifier | A1M5 W10 (Quiet Wave) | A2M1 W5, A2M3 W1 |
| Skittish + `fleeing` tag (leak 0, medal-exempt) | Trait | A2M1 W1 | Every Act II map |
| Hush → Heavy | Hollow rule | A2M1 W3 | W4, every mixed wave |
| Shielded | Trait | A2M2 W2 | W4–5 |
| Shield pulse, blink | Boss previews | A2M2 W11 | Cantor A2M5; Blinkstrider A2M4 |
| Protect the asset | Objective | A2M2 | A3M5 |
| Revisit | Presentation | A2M3 | A3M2, A3M5, A3M6 |
| Clickable world object (the Peeker rock) | Interaction | A2M3 (Pebble's rescue) | — |
| Cloaked | Trait | A2M4 W3 | W7, W11 |
| Blink | Trait | A2M4 W6 | W9 |
| Shield-recharge aura | Trait | A2M5 W1 | W2, W4, boss |
| Escort + mid-map pivot + Ward ally | Objective | A2M5 W6 | A3M1 (full escort) |
| Phasing | Trait | A2M6 W5 | W9 |
| Sundown (Prism holds the light) | Story event | A2M6 | — |
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
| Crash site | Economy | A3M5 (boss jettison, onto predefined decor tiles) | — |
| Sheltered escort, militia allies | Objective / allies | A3M6 | FIN |
| Choir escort, song, Deep Bore, forced "Who's there?" | Objective / story event | FIN | — |

**Not used in the campaign:** Gates, Dust storm, Corrupted node, Forked path (beyond the A2M2 rig branch, which belongs to its Protect objective), and the Penitent's phase 3 (only if A2M5 splits). They are reserved for challenge maps and endless mode ([maps.md §8](../design/maps.md#8-post-game-maps)).

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

Revisits keep the original map's pads unchanged and add new pads only in the outer band ([maps.md §7](../design/maps.md#7-storytelling-with-the-map)).

### 4.6 Systems

| System | Introduced | Where it ends or turns |
|---|---|---|
| Character creation, callsign Sprout | Before A1M1 | Thorn A2M2 debrief; Waykeeper A3M6 debrief |
| Build, upgrade, sell, core integrity, wave preview, countdown | A1M1 | |
| Results counter `PESTS PROCESSED ★` and Tidybots | A1M1 | Plain from A2M1; hidden from A3M1; countdown FIN |
| Joke of the Shift | A1M1–A1M5 | Forgotten A2M6; Pebble's versions A3M4, Night Shift, A3M6 |
| Everglow Inbox, R&D Command (Mk II and Rapport only) | After A1M1 | Automated after A3M2 |
| Early wave call, targeting priorities | A1M2 (early call on W6's Zoomers; the priority cycle in the tower panel) | |
| Pest Bounty Board, Stardust payout | A1M2 | Kip's row "on assignment" A2M4; gone A3M1 |
| Bricks's name tags | A1M2 (Denise) | `{name}` at A3M3; silence at A3M4 |
| Hold Fire | A1M3 (Gerald) | Quiet Wave A1M5; Gerald again A3M4 |
| Spare runners filter (Alt+H) | A2M1 (QUILL's "firmware update" line) | The `spareFleeing` harness run from A2M1; `held_fire_second_look` still needs plain Hold Fire |
| Zibzab's shop, Field Protocol slot 1, the early ask | After A1M3 (FP slot 2 in R&D from then) | |
| Loadout choice | A1M4 | |
| R&D Engineering, tier-4 specializations | After A1M4; first in-map T4 A1M5 | |
| The Peeker | A1M1–A1M5 (one rock per map) | Pebble at the rock A2M3 (clickable rescue); on it A3M6 |
| Checkpoints ("Retry from wave N") | A2M1 | FIN Phase 2 snapshot |
| Codex annotations | A2M3 (QUILL), A2M6 (Ves'thara's margins) | *Field Journal* with corrections from A3M1 |
| Minor-key jingle | A2M4 | No wave-clear jingle in Act III |
| Ves'thara's Xenotech branch | After A2M5 | |
| Gift stones (Act III Stardust) | A3M1 debrief | |
| Jailbroken firmware | Base after A3M3 | |
| Companion pick list | FIN | |
| Epilogue cards | After C5 | |

### 4.7 Novelty ledger

New threats per map under §3 (≤ 2), and the other new things that satisfy "something new every map".

| Map | New threats | Other new things |
|---|---|---|
| A1M1 | Nibbler, Zoomer | Everything basic; Rivet, Thumper, Orbital Strike, Suppressing Fire, high ground, Crossfire, Joke of the Shift |
| A1M2 | Chonk, Brood Hauler | Sprinkler, power node, early call, targeting, Stardust, Bounty Board, name tags |
| A1M3 | Puffwing (+air lane) | Skyhook, Hold Fire, Gerald, wreckage, Time Dilation, shop, the optional bark button |
| A1M4 | Elder, Bunchling | Zapcoil, loadout choice, salvage yard, Clearance Sale |
| A1M5 | Digger, second spawn | First boss (capstone), T4 specs, Quiet Wave |
| A2M1 | Mote (with the hush), Skittish | Fleeing groups, the Spare runners filter, kill-order bark, checkpoints, Act II presentation |
| A2M2 | Glimmer, Glass Witch | Protect objective, in-stage boss dialogue, retreat |
| A2M3 | Weft Warden, Lightwing | Revisit, codex annotations, Pebble, the clickable rescue |
| A2M4 | Veilwalker, Blinkstrider | Lookout as a required counter, Q3 Bonus, C2 |
| A2M5 | Aegis Cantor | Capstone Penitent, pivot, Escort, Ward ally, Prism gift |
| A2M6 | Fracture, Rift Moth | Prism, Stillness, Sundown |
| A3M1 | Maw, rift lanes | Scuttle Den, Underfoot, Field Journal, gift stones, Act III presentation |
| A3M2 | Compliance Drone, Expediter | Clean Exit cue, Everglow Security faction |
| A3M3 | Undertow | Holdout, blocker ally, SEAL |
| A3M4 | Silencer, Liability | System Reboot, empty slot, jailbreak |
| A3M5 | Auditor, Maint. Associate | Capstone boss, bearers, Sproing Pad, crash site, QUILL offline |
| A3M6 | Gunship, Black Budget | Capstone Maw, Sheltered, militia, 2-wide lanes |
| FIN | — | Choir escort, song rules, Deep Bore, Unsung (capstone), Dawn |

### 4.8 Counter coverage

Per map: the **threat intel** (`threatIntel`: every trait present in the waves, shown as icons), the **required counters** (`requiredCounters`: ≤ 3 categories from [enemies.md §3.1](../design/enemies.md#31-counter-categories), each backed by one `noCounterBuild` that must lose; the builds are in each map's act-file entry, and what counts as an answer, by tier, spec, and cast, is in [enemies.md §3.1](../design/enemies.md#31-counter-categories)), and how the guarantee in [progression.md §8](../design/progression.md#8-tower-acquisition) holds on the default path ([enemies.md §7](../design/enemies.md#7-wave-design-rules)). An enemy whose category-mapped traits are all outside the required set is **soft**: soft enemies make up ≤ 15% of any wave's threat (a map's `teach: true` wave for a new soft trait is exempt), intel-only traits never make an enemy soft, and fleeing groups count for none (§3). Licensing must cost ≤ the previous map's first-clear Stardust (§4.9). A map adds at most one new category; the **new** column shows it.

| Map | Threat intel | Required counters | New | Soft here | Guaranteed answer (owned, free, or affordable) |
|---|---|---|---|---|---|
| A1M1 | Fast | — (none; the tutorial, [maps.md §6.4](../design/maps.md#64-balance-harness)) | — | — | — |
| A1M2 | Fast, Armored (light) | Armor | armor | — | Rivet T3 pierce, Thumper |
| A1M3 | Fast, Armored, Flying | Air, Armor | air | — | Skyhook (issued this map), Rivet; Rivet T3, Thumper |
| A1M4 | Fast, Armored, Splitting, Huddle | Splash, Armor | splash | — | Thumper, Zapcoil; Rivet T3, Thumper |
| A1M5 | Fast, Flying, Armored, Splitting, Huddle, Burrowing, Boss | Air, Splash, Armor | — | Diggers (W2 is the burrowing teach wave) | Skyhook, Rivet; Thumper, Zapcoil; Rivet T3, Thumper (Bunker Buster) |
| A2M1 | Skittish (fleeing: Fast, Flying, Burrowing, Armored, Splitting, Huddle), Hollow clusters | Splash | — | — | Thumper, Zapcoil |
| A2M2 | Skittish (fleeing), Shielded, Hollow clusters, Boss | Shield, Splash | shield | — | Zapcoil, Sprinkler T3; Thumper |
| A2M3 | Skittish (fleeing), Shielded (heavy, light armor), Flying + shielded, Hollow clusters | Shield, Air, Splash | — | — | Zapcoil, Sprinkler T3 Soaked; Skyhook, Rivet; Thumper |
| A2M4 | Skittish (fleeing), Cloaked, Blink, Shielded, Flying + shielded, Hollow clusters | Detection, Shield, Splash | detection | — (every flyer is also shielded) | Lookout (150 ≤ 210), Scanner Sweep; Zapcoil; Thumper |
| A2M5 | Shield aura, Shielded, Cloaked (boss shards), Blink, Hollow clusters | Shield, Detection, Splash | — | — | Zapcoil, Lookout, Thumper |
| A2M6 | Splitting, Hollow clusters, Flying + Phasing | Air, Splash | — | — | Skyhook, Rivet, Prism (gift); Thumper |
| A3M1 | Gathering, Flying + Phasing, Splitting, Hollow clusters, Rift | Splash, Air | — | — | Thumper, Zapcoil; Skyhook; Scuttle Den (gift) |
| A3M2 | Armored, Haste aura, Splitting, Hollow clusters, Rift | Armor, Splash | — | — | Harpoon (licensed before this map; 250 ≤ 280), Prism; Thumper or Zapcoil; survives either Everglow class revoked |
| A3M3 | Burrowing, Gathering, Splitting, Hollow clusters, Flying + Phasing, Rift | Burrowed, Air, Splash | burrowed | — | Scuttle Den; non-Everglow air (Zapcoil, Prism, Harpoon); Thumper (the class not revoked) or Zapcoil |
| A3M4 | Jammer, Heavy armor, Armored, Haste aura, Flying + Phasing, Splitting (light), Hollow clusters (light), Rift | Jam, Armor, Air | jam | Mote and Fracture screens | System Reboot (free), Hum Choir (gift by now on both C1 paths); Harpoon, Prism, Gloop (warren), the jailbroken class; Rivet, Harpoon, Mindspike |
| A3M5 | Jammer, Healer aura, Heavy armor, Armored, Haste aura, Splitting, Hollow clusters, Boss | Jam, Armor, Splash | — | — | System Reboot (not under Rewrite), Hum Choir; Harpoon, Prism, Gloop (warren); Thumper |
| A3M6 | Flying + armored, Cloaked + armored, Armored, Flying + Phasing, Gathering, Haste aura, Hollow clusters (light), Rift, Boss | Air, Detection, Armor | — | Mote screens | Sproing (gift A3M5), Harpoon; Lookout or Lantern; Harpoon, Prism |
| FIN | Flying, Flying + armored, Jammer, Splitting, Hollow clusters, Gathering, Phasing, Burrowing (light), Armored (light), Healer aura, Cloaked (light), Boss | Air, Jam, Splash | — | Undertows, armored and cloaked units | Sproing, Skyhook, Harpoon; Hum Choir, System Reboot; Gloop (both paths by now), Thumper, Mindspike [Echo Spike] |

### 4.9 Shop stock and the reference profile

**Zibzab's stock** (campaign data; licenses per [progression.md §4.1](../design/progression.md#41-vrell-tower-licenses)): the shop opens after A1M3 with the Zapcoil sample, tune-ups, global upgrades, and Field Protocol unlocks. **"New shipment"** after A1M5 adds the Lookout Shack; after A2M1, the Grapple Harpoon ("for rig security, the brochure says") and the Salvage Crane. The jailbreak appears after A3M3; the crate is given in A3M6.

**First-clear Stardust** (5/6/6): A1M1 **0** (the tutorial pays only the counter; your first Stardust comes from the map where you burst the Haulers' sacks), A1M2 130, A1M3 140, A1M4 150, A1M5 160 · A2M1 180, A2M2 195, A2M3 210, A2M4 225 (+400 Q3 Bonus on its results screen), A2M5 240, A2M6 260 · A3M1 280, A3M2 300, A3M3 320 (flat), A3M4 330, A3M5 355, A3M6 380 · FIN 500. **Total 4,355** plus the bonus. From A3M1 the Stardust is the warrens' gift stones (act3.md).

**Objective Intel** (+1 each, optional, never moral): A1M4, A2M1, A2M4, A3M1, A3M4, A3M5, FIN = 7.

**Reference profile** (Standard; first-clear Stardust spent sensibly; Intel from Victory medals only, so one per map; the *weaker* branch of every flag: C1 cleared, C2 Return, both C3 branches, every C4). Every par build in the act files uses only what this profile owns at that map, and the harness asserts it.

| Before map | Towers owned | Intel spent (running total) | Notable shop state |
|---|---|---|---|
| A1M1–A1M3 | Rivet, Thumper (+Sprinkler A1M2, Skyhook A1M3) | — | — |
| A1M4 | + Zapcoil | — | Head Start protocol; Rivet, Thumper tune 1 |
| A1M5 | same | Thumper specs (2) | Reinforced Core 1; Sprinkler tune 1 |
| A2M1 | + Lookout | 2 | — |
| A2M2 | same | + Sprinkler specs (4) | Seed Money 1; Zapcoil tune 1 |
| A2M3 | same | 4 | Sprinkler tune 2 |
| A2M4 | same | + Zapcoil specs (7) | Zapcoil, Rivet tune 2 (the Q3 Bonus arrives on this map's results) |
| A2M5 | same | 7 | — (C2 Return: the bank went to the Skitterkin) |
| A2M6 | + Prism | 7 | Reinforced Core 2 |
| A3M1 | + Scuttle Den | 7 | Ability Coolant 1; Emergency Bulkhead |
| A3M2 | + Harpoon | + Mindspike (10) | — |
| A3M3 | −1 Everglow class (revoked) | 10 | Seed Money 2 |
| A3M4 | + jailbroken class, Hum Choir (+Gloop if warren) | 10 | Jailbreak bought (warren) or free (convoy) |
| A3M5 | + Sproing | + Stasis Bloom (13) | Mindspike tune 1 |
| A3M6 | (+Gloop if convoy) | 13 | Harpoon tune 1–2 |
| FIN | same (the reference never buys Crane or Lantern) | + Mindspike specs (16) | — |

---

## 5. Per-map entries

The entries live in the act files. Their headings, in order:

- [act1.md](campaign/act1.md): A1M1 · Orientation Day · A1M2 · Hatching Season · A1M3 · Special Delivery · A1M4 · The Audit · A1M5 · Record Quarter
- [act2.md](campaign/act2.md): A2M1 · Rig Nine · A2M2 · The Glass Witch · A2M3 · Second Look · A2M4 · Second Harvest · A2M5 · The Long Walk · A2M6 · Sundown
- [act3.md](campaign/act3.md): A3M1 · The Preserve · A3M2 · License Revoked · A3M3 · The Gap · A3M4 · Empty Slot · A3M5 · Unsung · A3M6 · Let Them In
- [finale.md](campaign/finale.md): FIN · Clearing the Way

---

## 6. Choice and flag ledger

Flags are declared in `content/dialogue/flags.ts`. **§6.2 is the canonical flag table**; [bible.md § Flag summary](bible.md#flag-summary) is a short summary that points here. Scripts read flags but never set them; story sets them at map end or in dialogue ([maps.md §5.3](../design/maps.md#53-map-scripts)).

### 6.1 The choices

| Choice | Where and UI | Options (≤ 60 chars) | Sets | Feedback |
|---|---|---|---|---|
| **C1** The Quiet Wave | A1M5 W10. No UI, no prompt; Hold Fire is the only tool | (clear it, or hold fire) | `spared_quiet_wave` if ≥ 75% of the `quiet_wave` group leaks | None in A1M5 beyond Bricks's line, the memo paragraph, and the results stamp. Delayed echo in A3M1 if spared ("Old Thrum remembered."); none if cleared |
| **C2** Zibzab's Price | A2M4 debrief, after the Q3 Bonus lands on the results screen. Two offers, price first, for the whole bank | "Sell it. Market price." / "Take it to them." | `stardust_choice` = `sold` / `returned` (`none` if the bank is 0) | None |
| **C3** Which door | A3M3 briefing. Bricks: "Your call, Thorn. Which door do I hold?" | "The convoy. Goldie's people." / "The warren. Pebble's people." | `door_choice` = `convoy` / `warren` | "Goldie will remember that." / "The warren will remember that." |
| **C4** QUILL's directives | A3M4 debrief, after the mail scene | "Purge them. All of them." / "Keep them. Stay yourself." / "Write your own." | `quill_choice` = `purge` / `keep` / `rewrite` | "QUILL will remember that." |
| **C5** Stay or Go | After Dawn, full-screen | "We stay. We keep the way open." / "We go. We give it back." | `ending_choice` = `stay` / `go` | None |

Two smaller voice choices carry no flag: the A3M1 confession reply (earnest / wry / quiet) and the A3M3 "Why'd you really come out here?" answer (the three arrival reasons; if it differs from `arrival_reason`, Bricks notices).

### 6.2 Flag ledger

| Flag | Values | Set | Pays off |
|---|---|---|---|
| `arrival_reason` | `bonus` / `family` / `lettuce` | Character creation | A1M1 Goldie's greeting variant; A1M2 Kip ("Signing bonus? Me too. Spent it."); **A3M3 briefing** (Bricks reads your file); **C5** (`family`: Go keeps the family's residency points) and epilogue card 12 |
| `peeker_poked` | bool | Clicking the Peeker on any Act I map | **A3M6 w03** Pebble's rock line (two variants) |
| `spared_quiet_wave` | bool | A1M5 end (silent) | A1M5 results stamp + memo paragraph; **A2M2** Ves'thara's opening line; **A3M1** Thrum alive and reunited (else Pebble's news), the C1 echo, **Hum Choir at A3M1 debrief** (else A3M4); A3M5 and A3M6 Pebble quoting "Grandmother" vs Bramble; **FIN** Thrum beside Pebble (+0.5 song radius), or (cleared) Thrum's echo laid to rest in Phase 2; epilogue card 3 |
| `asked_zibzab_early` | bool | Zibzab's shop, after A1M3 through before A2M4 | **A2M4** truth scene: "You asked me in the afternoon. I told you. You kept buying." |
| `held_fire_second_look` | bool | A2M3 end: at least 50% of the map's `fleeing` units leaked **and** plain Hold Fire was used at least once (the Spare runners filter alone doesn't count) | **A3M1 w03** Bramble's line. No mechanical effect, no medal, no false negative line |
| `stardust_choice` | `sold` / `returned` / `none` | A2M4 debrief (C2) | `sold`: Intel windfall + Zibzab Tune-up immediately; `returned`: **A3M1 w05** line, **FIN** the Returned (two bearers) and **w15** line; `none`: Zibzab's "No refunds. I did say."; epilogue card 5 |
| `door_choice` | `convoy` / `warren` | A3M3 briefing (C3) | **A3M3** which refugees cross; **A3M4** jailbreak free (convoy) or 300; Gloop at A3M4 (warren) or A3M6 (convoy); shelter dressing (HE HELD THE DOOR, or the hum ring); **A3M6 and FIN** militia posts (convoy); FIN choir size; Goldie's A3M4 line; epilogue card 2 |
| `quill_choice` | `purge` / `keep` / `rewrite` | A3M4 debrief (C4) | **Night Shift** line; **A3M5** QUILL offline (rewrite); QUILL's voice A3M5–FIN (purge: status-bar portrait, flat lines, no jokes); the mechanics in [core-loop.md §6.11](../design/core-loop.md#611-quills-directives-c4-in-play) (purge: −2 Everglow armor from A3M5, the Bore at 75% speed, Time Dilation gone, Rapport refunded; keep: Time Dilation as a Technician ability from A3M5 through FIN Phase 1, dark in Phase 2; rewrite: no System Reboot in A3M5); **A3M6 briefing** QUILL's own list (rewrite); **FIN Phase 2** log (rewrite) / knock-knock + revocation (keep) / silence (purge), and the rest multiplier; epilogue card 4 (with `ending_choice`) |
| `ending_choice` | `stay` / `go` | After FIN (C5) | Epilogue cards 1, 2 (`go` variant), 4, 8, 9, 10, 12; final image |

**Save state that behaves like a flag** (owned by [progression.md §11](../design/progression.md#11-what-persists)): the lifetime Pests Processed (A2M2 read-aloud, the A3M2 log header, the FIN countdown, `REMEMBERED`), the revoked class (A3M2 → jailbreak), `memorialTower` and the `{name}` plate (A3M3 → FIN), `bricksTagIndex`, the callsign.

### 6.3 Name tags

Bricks's tag list, in order (campaign data; append-only): **Denise** (A1M2), **Marguerite** (A1M5), **Biscuit** (A2M1), **Auntie Funmi** (A2M3; the aunt who raised him in Lagos, moved to the Core, wrote every month for ten years, then stopped), **Dele** (A2M5; his brother, a Core-world accountant who doesn't call), **Lucky** (A3M2; his survey mule-bot, "left on Kepler-2207, still walking, probably"). A3M3's tag reads `{name}` ("This one's yours"); he says the name aloud only at the SEAL. A3M4's tag moment is silence. Replays reuse each map's first name.

---

## 7. Pacing check

Tone: 1 = pure whimsy, 10 = grief. Difficulty: relative effort on Standard. Novelty: how much is new to learn. Par margin is the target median: integrity % on Defend and Protect maps; on escort maps (A2M5, A3M1, A3M6, FIN) it is Evacuated / Sheltered / Voices %, on the escort band.

| Map | Tone | Difficulty | Novelty | Par margin | Note |
|---|---|---|---|---|---|
| A1M1 | 1 | 1 | 9 | 95 | Everything is new, gated by prompts |
| A1M2 | 1 | 2 | 6 | 92 | First pebble in the shoe |
| A1M3 | 1 | 2 | 6 | 90 | Lightest threat load in Act I, for Hold Fire |
| A1M4 | 2 | 3 | 6 | 85 | First loadout choice; comedy at full volume |
| A1M5 | 3 | 4 | 6 | 81 | Boss; the Quiet Wave; stinger |
| A2M1 | 4 | 4 | 7 | 82 | Re-baseline after the boss |
| A2M2 | 4 | 5 | 6 | 79 | |
| A2M3 | 5 | 5 | 4 | 77 | Deliberate low novelty: room to look |
| A2M4 | 6 | 6 | 6 | 74 | The midpoint |
| A2M5 | 6 | 6 | 8 | 71 (escort) | Overloaded by design; split trigger in §1 |
| A2M6 | 6 | 7 | 5 | 68 | Warm, then dark |
| A3M1 | 8 | 7 | 7 | 66 (escort) | Tear beat 1 |
| A3M2 | 7 | 7 | 7 | 63 | Anger, not grief |
| A3M3 | 10 | — | 6 | ≈70 (excluded) | Tear beat 2; Holdout |
| A3M4 | 9 | 8 | 6 | 65 | Absence; checked against A3M2 |
| A3M5 | 7 | 9 | 6 | 57 | Hitting back; the difficulty peak before the finale |
| A3M6 | 6 | 8 | 6 | 60 (escort) | Hope; Waykeeper; a power trip |
| FIN | 8 → 2 | 10 | 4 | 48 (escort) | Tear beat 3, then dawn |

**Two chains.** Defend and Protect par margins fall monotonically (each ≤ the previous + 5) inside every act's band ([../tech/conventions.md](../tech/conventions.md#balance-sims-npm-run-sim)): A1M1 → A2M4, then A2M6, A3M2, A3M4, A3M5. A2M1 uses its post-boss re-baseline, A3M3 is excluded, and A3M4 is checked against A3M2. Escort maps form their own band by the same rule: A2M5 → A3M1 → A3M6 → FIN.

**Where the curve might sag (self-critique).**
- **A2M3 is the flattest map in the game** on purpose (two shield variants, a revisit). The player-triggered rescue gives it a moment of agency. If playtesters still call it boring rather than quiet, give it the Forked path back (the mining cut splitting a switchback) instead of adding enemies.
- **A3M3 breaks the chain.** A player who holds badly gets a low Evacuated at the emotional peak and may feel they failed Bricks. The briefing frames the score as how many got out, the reward is flat, the drain is scripted, the medal toasts wait for the base, and the SEAL plays identically at any score.
- **A3M4 asks a grieving player to learn two hard threats** (hushing and heavy armor). System Reboot in the briefing and a single-unit teach wave for each are the mitigation; watch first-attempt loss rates closely.
- **A3M5 → A3M6 → FIN are three hard maps in a row.** A3M6 is tuned as the breather inside that run (difficulty 8, a generous `maxLost`, the crate live from W1, light opening waves), so the Waykeeper beat lands on a player who feels strong.
- **After A2M5 shields vanish**, so Zapcoil and the new Prism Spire both lose their main job right as Prism arrives (Energy is weak against the Hollow). Prism holding the light at Sundown, its boss damage, and its Rift Moth burst have to feel good in A2M6, or the gift lands flat.
- **The tone step from A2M6 (6) to A3M1 (8)** is the biggest single jump, and it is kept on purpose. The whistle vignette and A3M1's quiet first waves (no jingle, and QUILL noticing) are the bridge; if it still reads as "where it got dark," move the Fun Friday PA loop earlier into A2M6.
- **Three of the four revisits are in Act III.** Keep each revisit's outer band visibly new, so they read as returns rather than reuse.
- **Finale Phase 2 under Purge runs longest** with the least to say. If it drags, shorten Purge's `restTarget` and let the silence be the cost instead of extra minutes.

---

## 8. Open questions

Items this campaign needs from design, tech, or art. Each is stated as the campaign assumes it.

1. **Thrum's echo (FIN, cleared path):** a scripted, untargetable Elder-shaped Hollow echo that drifts into the song at rest progress 50% and is laid to rest by script. It needs a script action, not a unit the player fights.
2. **Bramble's display name:** from A3M1 the companion and HUD show "Bramble"; the speaker id stays `chitterbloom`, and the Act I codex keeps Everglow's codename.
