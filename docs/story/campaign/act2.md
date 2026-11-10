# Campaign, Act II: First Contact

The six Act II maps, A2M1–A2M6, during the Long Dusk. The campaign overview, introduction schedule, flag ledger, and pacing check are in [../campaign.md](../campaign.md); the entry format is described at the top of [act1.md](act1.md).

**Act II presentation from A2M1:** results line `Pests processed: {n}.` (no star), loading tips "Remember: a clean perimeter.", Evie billboards `peeling`, Skitterkin deaths without confetti, Tidybots still on. Sterling gets at least one between-wave line on every Act II map, and Pebble and Bricks share at least one exchange on every map from A2M3 to A3M3.

**Fleeing Skitterkin (summary).** From A2M1 every Skitterkin enemy group is Skittish and `fleeing`: it leaks for 0, is medal-exempt, pays a bounty of 1, and a Hollow unit that hushes one turns Heavy. The rules live in [enemies.md § Fleeing Skitterkin](../../design/enemies.md#fleeing-skitterkin) and [§ The hush rule](../../design/enemies.md#the-hush-rule); the [Spare runners](../../design/core-loop.md#spare-runners) filter (Alt+H) keeps towers from picking them.

**Checkpoints from Act II:** a loss offers "Retry from wave N" at the last 5-wave snapshot; using one forfeits Perfect and Challenge medals for that run ([core-loop.md](../../design/core-loop.md)).

**Act II barks (shared).** Act-wide pools that fire on more than one Act II map (the data is [`src/content/dialogue/barks/act2.ts`](../../../src/content/dialogue/barks/act2.ts), one file for the act). Like every bark they play only for a speaker on the radio, QUILL or the map's companion. A map's own barks below sit beside them (A2M3's and A2M4's `skitterkin_killed_ahead` lines join QUILL's here; a map that wants only its own gates this one off).
- `skitterkin_killed_ahead` (every Act II map; the player kills a runner fleeing the Hollow, once per map): QUILL: "That one was running. From it."
- `skitterkin_hushed` (every Act II map; the first hush on a map): QUILL: "It caught one. It's heavier now. Faster. ...Logging it."
- `new_enemy` (mote, wherever the save first meets one): QUILL: "Unknown signature. It isn't on any list. I've checked every list."
- `wave_cleared`, the jingle (A2M1–A2M3, after a clean wave; A2M4 makes it minor, here it only *feels* off): Bricks: "Jingle sounds different out here."

---

## A2M1 · Rig Nine

*Rig Nine stopped answering. Go take a peek. Minor operational hiccup!*

- **Facts:** The Diggings · `act2.gold` · Defend · 18×12, 13 buildable (2 high ground on canyon ledges, 1 stardust-conduit power node) + 2 "crew log" wreckage (pads under them) · 10 waves · 420 credits · two spawns (the Spires road for Skitterkin; Rig Nine's bore mouth for the Hollow, whose road forks: the **yard cut** down the dark east edge opens at W8) · companion Bricks · Technician Orbital Strike.
- **Story purpose:** Pay the stinger; plant hushing and "they're running from it" without anyone saying so. **Target: curiosity curdling to unease.** First Hollow, first mixed waves, first fleeing groups.

**Layout.** Two northern entries (road north-west, bore mouth north-east) merge mid-map and run south through the rig yard to the outpost lift (core). Broken mining rigs are the wreckage; two are marked "crew logs." The hushed crew sit outside their hut (decor) beside the bore road, staring at nothing, unharmed and unreachable by anything. The north-east edge (toward the Halls) is visibly darker than the rest, and from W8 the Hollow takes the yard cut straight down it.

**Waves.** 1 Nibblers + Zoomers, fleeing [T: Skittish; nothing follows them yet] · 2 Puffwings + Diggers, fleeing · 3 a fleeing group, then Motes ×6 behind it on the same road [T: Mote; the hush and the **Heavy** tell] · 4 Haulers fleeing + Motes; the bore opens [X: shoot the Hollow, not the runners] · 5 an Elder with her younglings + Motes · 6 Mote clusters out of the bore [X: splash] · 7 Bunchlings fleeing + Motes, both roads at once · 8 mixed; the yard cut opens · 9 runners, both roads, and the cut · 10 everything, both roads and the cut.

**Layout data** (the data is [`src/content/maps/a2_m01/map.ts`](../../../src/content/maps/a2_m01/map.ts)). The **Spires road** (`spires`) spawns at (2,0), runs south to row 3, east under the **west ledge** (4,2) to column 5, south to row 6, and east into the **merge** (8,6); the **bore road** (`bore`) spawns at Rig Nine's bore mouth (15,0), runs south to row 3, west round the **east ledge** (13,4) to column 12, south to row 6, and west into the merge. The merged road drops to (8,8), runs east through the rig yard to (11,8), and south to the **outpost lift** (11,11). The **yard cut** (`cut`) leaves the bore road at (15,3) and runs straight down the east edge to (15,11), then west along the south fence into the lift: out of reach of every pad at the merge, covered only from (14,8), (12,9) and the east ledge. The **stardust conduit** (9,7) is the power node beside the merged road. The crew-log rigs are wreckage over pads at (13,5) (`crew_log_bore`, 50 salvage) and (10,10) (`crew_log_yard`, 40); Rig Nine's head frame (16,0) and the crew's hut (16,2) are markers on decor. The fleeing Puffwings fly one lane (`sky`) from (4,0) to the lift.

```
..S............S..
..#............#..
..#.^..........#..
..####......####..
...o.#o....o#^.#..
.....#.o..o.#x.#..
.....########..#..
....o..o#+.....#..
........####..o#..
.........o.#o..#..
..........x#...#..
...........C####..
```

**Wave data** (the data is [`src/content/maps/a2_m01/waves.ts`](../../../src/content/maps/a2_m01/waves.ts)). W2–W10 have a **35 s** countdown (Act II's default is 20 s; the longer build phase leaves room to read the preview and send the drone, and puts par's shift at 9.4 minutes at 1×) and **open 6 s into the wave**, so the last wave's bounties land before the first contact. Every Skitterkin group is `fleeing` (†); a fleeing group with Motes behind it on its road leads them by 3 s ([fleeing-lead]). Mote clusters are **packed** at 0.2 s (0.32 tiles apart), and a bore cluster released 0.6 s before a Spires one meets it at the merge. Groups take the Spires road unless marked; default spacing Mote 0.3 s, Nibbler 0.8 s, Zoomer 0.5 s, Puffwing 0.6 s, Digger 1.0 s, Bunchling 1.0 s, Hauler 2.5 s.

| Wave | Groups (`enemy` ×`count` @ `intervalSec`, `delaySec`) | Total |
|---|---|---|
| W1 | Nibbler† ×10 @ 0.8, 0 · Zoomer† ×8 @ 0.5, 8 (`teach`: Skittish) | 18 |
| W2 | Digger† ×4 @ 1, 6 · Puffwing† ×8 @ 0.6, 10 *sky* · Nibbler† ×8 @ 0.8, 14 | 20 |
| W3 | Nibbler† ×6 @ 0.8, 6 · Mote ×6 @ 0.6, 9 (`teach`) | 12 |
| W4 | Hauler† ×3 @ 2.5, 6 · Mote ×10 @ 0.3, 9 · Mote ×16 @ 0.2, 16 *bore* | 29 |
| W5 | Elder† ×1, 6 · Nibbler† ×6 @ 0.3, 6.4 (`youngling`) · Mote ×12 @ 0.3, 9 · Mote ×20 @ 0.2, 14 *bore* | 39 |
| W6 | Nibbler† ×8 @ 0.8, 6 · Mote ×24 @ 0.2, 9 · Mote ×36 @ 0.2, 8.4 *bore* · Mote ×36 @ 0.2, 24 *bore* | 104 |
| W7 | Bunchling† ×6 @ 1, 6 · Mote ×60 @ 0.2, 9 · Mote ×60 @ 0.2, 8.4 *bore* · Mote ×30 @ 0.2, 30 *bore* | 156 |
| W8 | Zoomer† ×20 @ 0.4, 6 · Mote ×24 @ 0.2, 9 · Mote ×24 @ 0.2, 8.4 *bore* · Puffwing† ×8 @ 0.6, 11 *sky* · Mote ×6 @ 0.3, 18 *cut* · Digger† ×4 @ 1, 26 · Mote ×20 @ 0.2, 29 | 106 |
| W9 | Nibbler† ×10 @ 0.8, 6 · Mote ×24 @ 0.2, 9 · Mote ×20 @ 0.2, 8.4 *bore* · Mote ×12 @ 0.3, 18 *cut* | 66 |
| W10 | Zoomer† ×24 @ 0.4, 6 · Mote ×30 @ 0.2, 9 · Mote ×30 @ 0.2, 8.4 *bore* · Puffwing† ×8 @ 0.6, 14 *sky* · Mote ×12 @ 0.2, 20 *cut* · Mote ×20 @ 0.4, 24 *cut* · Hauler† ×2 @ 2.5, 30 · Mote ×30 @ 0.2, 33 · Mote ×30 @ 0.2, 32.4 *bore* | 186 |

Totals count spawns; each fleeing Bunchling adds its fleeing Nibblers when it dies. Fleeing units leak for 0, so the Motes are the map's whole threat (592 of them). **The Motes catch the runners**: at 1.6 tiles/s a Mote closes on a Nibbler 3 s ahead in about 5 s, under the west ledge, so the hush plays out in view on every Mote wave (par sees about 60), and only a player who builds early on the Spires road saves many. **Splash is the whole answer** (enemies.md §3.1): a Thumper's shell takes a packed cluster at once, so two Thumpers at the merge sweep everything that passes it, while single-target towers drown in W6's clusters. W7's double cluster (both roads, 120 Motes meeting at the merge) is the map's peak: it is what makes the no-splash build lose with the full catalog.

**Story delivery.**
- *Briefing:* Sterling: "Minor operational hiccup at Rig Nine! Super minor. Hiccup-sized. Go take a peek, Four-Forty-Seven!" · Bricks: "Rig crew's been quiet four days. Quiet's not a status, Sprout. Quiet's a symptom."
- *The filter* (cue as the build phase opens, after the briefing: the HUD's new Spare runners button is in view): QUILL: "Firmware update! New filter: Spare runners, Alt+H. Runners pay one credit now. Not worth the ammo!"
- *Radio:*
  - w02 QUILL: "They're moving faster than usual. And they keep looking back. Logging it."
  - w04 Bricks (crew found): "They're breathing. They just don't know their names. Sweet moons."
  - The first crew log the drone recovers, or w06 if it hasn't recovered one by then, QUILL: "The crew called it 'the hollow.' Lower case. I don't know why that's worse."
  - w07 Sterling: "Love the field report! I'm calling it a hiccup in my report too. Consistency!"
  - w08 Bricks: "Three hundred ninety-six days. Saying it out loud. Helps."
  - First `wave_cleared` with a turret up (name tag) Bricks: "That one's Biscuit. Good dog. Barked at the dark so I didn't have to."
- *Barks:* all act-wide (*Act II barks*, above): QUILL's `skitterkin_killed_ahead`, `skitterkin_hushed`, and the Mote's `new_enemy`; Bricks's jingle.
- *Debrief:* Bricks (on a win): "Rig's quiet again. Not the good quiet." · *On a loss*, Sterling: "Hiccups happen! Rig Nine isn't going anywhere. Neither are you, Four-Forty-Seven!"
- *Where it plays* (the data is [`src/content/dialogue/a2/a2_m01/`](../../../src/content/dialogue/a2/a2_m01/scenes.ts)): the briefing is `a2_m01_brief`; the map script cues `a2_m01_cue_spare_runners` at W1's countdown (the build phase) and `a2_m01_cue_crew_log` from either crew-log rig's `wreckageCleared` or W6's countdown, whichever comes first (a cue scene plays once a battle); the radio lines are `a2_m01_w02`, `_w04`, `_w07`, `_w08`; the name tag is `a2_m01_cue_name_tag`; the debrief is `a2_m01_debrief`.
- *Codex:* Mote (original: "Rig Nine Atmospheric Event. Not dangerous! [REDACTED]"), the Diggings, "Hushed" (wellness-event classification), and the crew log (the rig crew's last shifts, ending in a hand that no longer knows whose log it is; unlocked by Crew Logs: its `original` has `when: { objectiveDone: { map: 'a2_m01', objective: 'crew_logs' } }`, a story condition that reads the save). Rig Nine's Act I entry ("Status: answering.") gains its `annotated` version: Everglow's own status update, signed by Frontier Operations (crew resting, bore sealed, the humming is the machinery). The texts are in [`src/content/codex/act2.ts`](../../../src/content/codex/act2.ts).
- *Memo after:* `memo_a2_01` *Rig Nine: A Minor Operational Hiccup!* (small print: "Rig crew wellness events are covered under Plan B.")

**Medals.** Victory · Perfect Core · **Hiccup Contained:** no Heavy Mote leaks: every Mote that hushed a runner on the way is stopped before the lift (`stat: 'heavyLeaks', lte: 0`; [D113](../../decisions.md#d113--2026-11-09--t420-a2m1-rig-nine)). It is not Perfect Core: plain Motes may leak. **Objective Intel +1, Crew Logs:** clear both log wreckage tiles (`wreckageCleared` on `crew_log_bore` and `crew_log_yard`; unlocks the crew-log codex entry).
**Rewards.** Stardust 180 · Intel 3 (+1).
**Par build.** Rivet, Thumper, Sprinkler (Cloudburst not yet), Zapcoil, on the reference profile ([../campaign.md §4.9](../campaign.md#49-shop-stock-and-the-reference-profile): A1M5's, plus the Lookout Shack's license; the core holds 21). Thumper ×2 and the Sprinkler at the merge (the Thumpers sweep the clusters; the Sprinkler's chill slows the trunk); a Zapcoil between the roads; Rivet on the west ledge; from W8, a Zapcoil beside the yard cut and a Rivet on the east ledge. Par uses plain targeting (it shoots any runner its priorities pick) and doesn't build on the Spires road, so the Motes catch most runners before the merge; the harness's `spareFleeing` run is par with Spare runners on for every tower.

| Wave | Par |
|---|---|
| W1 | Rivet (4,2) on the west ledge; Thumper on the conduit (9,7); Sprinkler (7,7) south-west of the merge; the drone to both crew-log rigs (13,5) and (10,10) |
| W2 | Thumper (7,5) north of the merge |
| W3 | Zapcoil (10,5) between the roads |
| W4 | Both Thumpers to T2 |
| W5 | The Zapcoil and the ledge Rivet to T2 |
| W6 | Orbital Strike on the bore road's drop (12,5), 9 s in |
| W8 | Zapcoil (14,8) beside the yard cut (W8's preview shows it); Rivet (13,4) on the east ledge; Orbital Strike on the cut (15,8), 22 s in |
| W9 | The cut Zapcoil and the east Rivet to T2; Orbital Strike on the cut and Suppressing Fire at the merge (8,6), 22 s in |
| W10 | The cut Zapcoil and the conduit's Thumper to T3; Orbital Strike on the cut, 24.6 s in (the cut's packed cluster) |

Par's bank at each build phase: 462, 202, 157, 79, 39, 27, 71, 427, 436, 445 (W1–W10); it ends with about 520 unspent (W7's 150 Motes pay for the cut and then some). **The bank stays unspent on purpose:** one more tower reaching the cut (a Rivet by the lift in W9) takes par to 100 with Perfect Core, and a tower on the Spires road from W8 saves two runners and changes nothing else; the late waves' runners are few. **Par's margin is the yard cut's, by design:** nothing gets through the merge; one Mote of W9's cut group, and three of W10's (its packed cluster, which the strike breaks, and the column behind it), slip past the cut Zapcoil and the east Rivet. Par wins at **17/21 (81.0%)** on every seed, the post-boss re-baseline (campaign.md §7's target 82, snapped to the 1/21 step), **with Hiccup Contained** (`parMedals`): the merge kills every Heavy Mote, and the cut's Motes hush no one. **The casts matter** (`#abilities`): without them W8's cut group gets through too (66.7). **Orbital Strike Mk II changes a result** (its wider blast takes one more of W10's cut cluster: 85.7); Bricks's Rapport doesn't (par casts Suppressing Fire once).

**No-counter build** (`noCounterBuilds`, by category; must lose by W7, `noCounterLoseByWave`, since the splash test is W6's clusters):
- **no-splash:** Rivets on par's merge and west-ledge tiles and between the roads, a Rivet in the bore road's bend, a Sprinkler, a Lookout beside the merge Rivet (Overwatch), a Skyhook; no Thumper, no Zapcoil; the same W6 strike. It loses to W6's clusters, and with the full catalog to W7's double cluster.

**Alt builds** (each shares ≤ 2 towers with par and must win with ≥ 20%; both bring the Lookout): `shell_and_scope`, Thumper + Zapcoil + Skyhook + Lookout (Thumpers on the conduit and west of the merge (6,4), Zapcoils north of the merge and between the roads; for the cut, Zapcoils beside it and on the east ledge, then a Thumper by the lift); `shell_and_rivet`, Thumper + Rivet + Skyhook + Lookout (par's Rivet and two Thumpers at the merge, a third Thumper between the roads; for the cut, a Thumper beside it on Close targeting, so it takes the cut rather than the merged road, a Rivet on the east ledge, and a Rivet by the lift). The Skyhooks take only the fleeing Puffwings: a free slot, not an answer.

**Story variants** (harness): `spareFleeing` (par with Spare runners on every tower) wins at 17/21, the same as par: sparing the runners costs nothing, and they are hushed either way where par has no tower. A2M1 sets no run-end flag.

**Harness runs** (every seed; margin, then integrity lost per wave W1–W10):

| Run | Result | Integrity lost |
|---|---|---|
| par | wins at **81.0** (band 65–85; 17/21), Hiccup Contained | 1 in W9, 3 in W10 |
| par with Orbital Strike Mk II | 85.7 | 1 in W9, 2 in W10 |
| par with Rapport: Sgt. Bricks | 81.0 | 1 in W9, 3 in W10 |
| par without its casts | 66.7 | 1 in W8, 1 in W9, 5 in W10 |
| `spareFleeing` | 81.0 | 1 in W9, 3 in W10 |
| `alwaysCallEarly` | 52.4 | 4 in W7, 1 in W9, 5 in W10 |
| no-splash | loses in W6 | 21 in W6 |
| no-splash, full catalog | loses in W7 | 23 in W7 |
| Story | 100, all three medals | |
| `shell_and_scope` | 76.2 | 2 in W9, 3 in W10 |
| `shell_and_rivet` | 85.7 | 2 in W6, 1 in W9 |
| do-nothing | loses at W4 | 6 in W3, 15 in W4 |

Robustness ([`src/balance/a2m1.test.ts`](../../../src/balance/a2m1.test.ts)): with W7's double cluster and W8's and W10's cut groups shifted ±0.2 s together, every verdict holds, W7 costs par nothing, and par loses at most two more (the strike and the Zapcoil's chains land differently in the column). Every run that wins also earns Hiccup Contained.

**W7's peak stays** (T460): its 156 spawns put about 90 units on screen at once, and par's frame time there (`__sd.perf()`, about 2–3 ms in the smoke browser) matches W3's with seven; it is the wave the no-splash build loses to with the full catalog. The Spires road stays undefended by par (about 63 hushes a run, most of them in W3–W7, when par's bank is under 80): the hush is the map's lesson, and the pads at (3,4) and (4,7) are there for the player who wants to answer it.

## A2M2 · The Glass Witch

*Someone is shattering the extraction rigs, and only the rigs.*

- **Facts:** Ridge Rigs · `act2.gold` · **Protect the asset** (Rigs 7 and 8 at the end of the rig branch, one meter of 10, "Rigs") · 18×12, 14 buildable (2 Aelari thread-glass outcrops as high ground, 1 conduit node) · 11 waves · 500 credits · one spawn: the main road (fleeing Skitterkin and Motes to the ridge relay, the core) and the rig branch (Aelari to the rigs) · companion QUILL (Time Dilation) · Technician Orbital Strike.
- **Story purpose:** Ves'thara's first appearance, her targets, her grievance, the C1 variant line; the callsign **Thorn**. QUILL as companion on the map where you defend rigs is the fair-play joke: its "(Per policy.)" suggestions are, for once, correct. **Target: intrigue; the first voice that refuses to joke.**

**Layout.** The main road runs north to south along a ridge. At the top a branch peels east along a ledge, doubles back on itself under a thread-glass outcrop, and drops off the ledge to Rigs 7 and 8 at the map's east edge. Aelari constructs only ever take the branch. Habitat domes sit untouched on the west side all map; the camera frames them so the player can notice she never goes near them.

**Waves.** 1 Skitterkin, fleeing · 2 Glimmers ×4 on the branch [T: shields; Zapcoil] · 3 fleeing Skitterkin + Motes · 4 Glimmers ×10 + Skitterkin [X] · 5 Glimmer column + Motes [X] · 6 Mote cluster + fleeing Haulers · 7 Glimmers + Motes · 8 mixed, both routes · 9 Glimmers + Motes · 10 big mixed · 11 **the Glass Witch** on the branch (shield pulse; blink from 70%; in-stage cues at 70% and 55%; `retreat` at 40%, which wins the map once the rest of W11 is resolved), with a Hollow surge down the road as she turns back for the rigs.

**Layout data** (the data is [`src/content/maps/a2_m02/map.ts`](../../../src/content/maps/a2_m02/map.ts)). Both routes spawn at (3,0) and share the road to the **fork** (3,2). The **main road** (`main`) runs down the ridge to (3,7), east to (7,7), down to (7,9), west to (5,9), and down to the **ridge relay** (5,11). The **rig branch** (`rigs`, the asset's only route; 38 tiles) runs east along the ledge to (16,2), down to (16,4), back west under the **thread-glass outcrop** (13,3) to (9,4), round the **hairpin** (9,5), east again to (14,5), and down off the ledge to (14,10) and along to (16,10), beside the **rigs** (17,10). The **west outcrop** (5,3) and the **stardust conduit** (5,5) sit in the fork's pocket; the **ledge** pads (12,3) and (14,3) flank the outcrop between the branch's ledge run and its back run, and the **rig pocket** (10,6)–(13,6) sits under the hairpin's second run. The pad at (8,5) reaches both roads; (16,11) is the rigs' doorstep. The habitat domes are markers on decor at (2,10) and (1,11), on the west side by the relay, below where the comms panel sits, so the radio never hides them.

```
...S..............
...#..............
...##############.
...#.^......o^o.#.
...#o....########.
...#.+..o######...
...#......oooo#...
...#####......#...
......o#......#...
.....###......#...
....o#........###.
.....C..........o.
```

**Wave data** (the data is [`src/content/maps/a2_m02/waves.ts`](../../../src/content/maps/a2_m02/waves.ts)). W2–W11 have a **30 s** countdown and **open 6 s into the wave**. Every Skitterkin group is `fleeing` (†) and runs the main road; Glimmers and the Witch take the branch (*rigs*); Motes the main road, **packed** at 0.2 s where marked. A fleeing group with Motes behind it leads them by 3 s ([fleeing-lead]). Default spacing Mote 0.3 s, Glimmer 0.8 s, Nibbler 0.8 s, Zoomer 0.5 s, Hauler 2.5 s.

| Wave | Groups (`enemy` ×`count` @ `intervalSec`, `delaySec`) | Total |
|---|---|---|
| W1 | Nibbler† ×10, 0 · Zoomer† ×8, 8 | 18 |
| W2 | Glimmer ×4 @ 1.2, 6 *rigs* (`teach`: Shielded) | 4 |
| W3 | Nibbler† ×8, 6 · Mote ×10, 9 | 18 |
| W4 | Glimmer ×10, 6 *rigs* · Nibbler† ×8, 10 · Mote ×12, 13 | 30 |
| W5 | Glimmer ×14 @ 0.6, 6 *rigs* · Nibbler† ×8, 8 · Mote ×16 packed, 11 | 38 |
| W6 | Hauler† ×3, 6 · Mote ×34 packed, 9 · Glimmer ×10, 16 *rigs* | 47 |
| W7 | Glimmer ×20 @ 0.6, 6 *rigs* · Nibbler† ×10, 10 · Mote ×30 packed, 13 | 60 |
| W8 | Glimmer ×20 @ 0.5, 6 *rigs* · Zoomer† ×16 @ 0.4, 6 · Mote ×43 packed, 9 · Glimmer ×12 @ 0.5, 24 *rigs* · Mote ×24 packed, 26 | 115 |
| W9 | Glimmer ×28 @ 0.5, 6 *rigs* · Nibbler† ×10, 12 · Mote ×40 packed, 15 | 78 |
| W10 | Glimmer ×20 @ 0.5, 6 *rigs* · Zoomer† ×20 @ 0.4, 6 · Mote ×50 packed, 9 · Glimmer ×20 @ 0.5, 22 *rigs* · Hauler† ×2, 24 · Mote ×50 packed, 27 | 162 |
| W11 | Nibbler† ×10, 3 · Mote ×30 packed, 6 · **the Glass Witch**, 6 *rigs* · Glimmer ×6, 14 *rigs* · Zoomer† ×12 @ 0.4, 45 · Mote ×60 packed, 48 (the surge) | 119 |

Totals count spawns (164 Glimmers, 399 Motes). Fleeing units leak for 0, so the threats are the Glimmers on the branch (each that reaches the rigs costs 1 of 10) and the Motes on the road (1 of the relay's 21). **The branch is the shield test:** Energy strips a Glimmer's shield at ×2 and Soaked makes Kinetic and Explosive strip it at ×0.8, so a build with neither loses the rigs to the Glimmer columns. **The road is the splash test:** the packed clusters drown single-target towers. **The Witch is the boss fight:** her shield (1,200, plus 120 every 8 s from her pulse) comes down on the ledge run and the back run, between the ledge pair and the rig pocket; she crosses 70% about at the hairpin, and her blinks then carry her round it, along the second run, and down off the ledge, 2.5 tiles at a time.

**Story delivery.**
- *Briefing:* Sterling: "Vandalism at the ridge rigs! That's the word. Vandalism. Write it on everything!" · QUILL (threat intel): "Shielded signatures. Your Zapcoil was free. It is about to earn it."
- *Radio:*
  - w03 QUILL: "Rig integrity is my top priority. (Per policy.) Your integrity is also a priority. A close second."
  - w06 Bricks: "Whoever it is, they're not touching the domes. Not once. That's a choice."
  - w09 Sterling: "Insurers say 'vandalism.' Legal says 'vandalism.' So it's vandalism. Super!"
- *Boss cues:* at spawn, if `spared_quiet_wave`: Ves'thara: "You let the small ones walk, once. I saw. It is why I have not struck you." · At 70%: "You are the Counter. {pests_processed}. I have watched you count." · At 55%: "I do not strike your homes, Counter. Look at what I strike. Ask yourself why it bleeds light." · At retreat: "Keep shooting. You are very good at it. That has never been the question."
- *Barks:* QUILL `perfect_wave`: "Both rigs intact! (Per policy.) Also, you're intact. Also good." · QUILL `new_enemy` glimmer: "Shielded! Energy breaks shields. Zapcoils are energy. You see where I'm going."
- *Debrief:* on a win, QUILL: "She read out my number. The exact one. ...How does she have my number?" · Bricks: "Sprout's grown some thorns. Thorn. That's you now. Don't let it go to your head." (callsign → Thorn). · *On a loss*, Sterling: "The vandal won a round! Rounds are not quarters. Back up the ridge, Four-Forty-Seven!"
- *Where it plays* (the data is [`src/content/dialogue/a2/a2_m02/`](../../../src/content/dialogue/a2/a2_m02/scenes.ts)): the briefing is `a2_m02_brief`; the radio lines are `a2_m02_w03`, `_w06`, `_w09`; the map script cues her lines from the boss triggers, `a2_m02_cue_witch_spared` at her spawn (`bossPhase: 1`, `when: { flag: 'spared_quiet_wave', eq: true }`), `a2_m02_cue_witch_counter` at `bossHpPct: 0.7` (the act's thesis, so it **pauses** the battle until read: `pause: true`), `a2_m02_cue_witch_strike` at 0.55, and `a2_m02_cue_witch_retreat` at 0.4; the barks are map-scoped (`a2/a2_m02/barks.ts`, so Bricks's act-wide jingle stays off the radio with QUILL as companion); the debrief is `a2_m02_debrief`, whose win branch sets the callsign. Her cues come close together at par's pace (70% to retreat in about nine seconds), so QUILL's reaction to hearing its own count waits for the results card.
- *Codex:* Glimmer, the Glass Witch (original: "Unidentified vandal. Probably sad! Report sightings to Security."), lumenglass ("woven glass, origin unknown, humming"), Aelari (heavily redacted).
- *Memo after:* `memo_a2_02` *Re: Incident 2361-A. Please Use "Vandalism" in All Correspondence!* (small print: "Incident footage is retained by Legal. The vandal is not to be described as sad."), plus the KFA form `memo_a2_02_kfa` *Form 7-C: First Contact Incident 2361-A* (small print: "Processing time: 11 weeks. Order to the Edge."): its own Inbox item on the KFA's form panel, stamped PENDING, delivered just before Sterling's memo so her "Please disregard it" opens first with the form under it. The automated filing calls the incident what it is (first contact; habitats and persons untouched; a related item from 2355, misfiled) and ends "Status: filed, pending." The texts are in [`src/content/memos/act2.ts`](../../../src/content/memos/act2.ts).

**Medals.** Victory · Perfect Core (nothing through to the relay or the rigs) · **Glass Half Empty:** force her retreat before she blinks three times (`stat: 'bossBlinks', lte: 2`; she blinks 3, 10 and 17 s after crossing 70%).
**Rewards.** Stardust 195 · Intel 3.
**Par build.** Zapcoil, Sprinkler (Cloudburst), Thumper, Rivet, on the reference profile ([../campaign.md §4.9](../campaign.md#49-shop-stock-and-the-reference-profile): A2M1's, plus the Sprinkler's specs, Seed Money 1 and Zapcoil tune 1; the relay holds 21). Zapcoil ×2 on the ledge either side of the Sprinkler on the outcrop (Conductive, Soaked; Cloudburst from W10) for the branch; Thumper on the conduit with a Rivet beside it (Crossfire) and a second Thumper in the south bend for the road; a Zapcoil in the rig pocket, and in W11 a Rivet in the pocket and one on the rigs' doorstep for her second phase. **QUILL's two Time Dilations, 52 s apart, and the strike on her second phase:**

| Wave | Par |
|---|---|
| W1 | Thumper on the conduit (5,5); Rivet (4,4) beside it (Crossfire); Zapcoil (12,3) on the ledge; Sprinkler (13,3) on the outcrop (Conductive) |
| W2 | The conduit's Thumper to T2 |
| W3 | Zapcoil (14,3), the outcrop's other side (Conductive) |
| W4 | Zapcoil (12,3) to T2 |
| W5 | Thumper (6,8) in the south bend; Zapcoil (14,3) to T2 |
| W6 | Sprinkler to T3 (Soaked); the bend Thumper to T2 |
| W7 | Both ledge Zapcoils to T3 |
| W8 | Zapcoil (13,6) in the rig pocket; the Rivet to T2 |
| W9 | The pocket Zapcoil to T3 |
| W10 | Cloudburst; Rivet (11,6) in the rig pocket |
| W11 | Time Dilation 8 s in (the rush down the road as she steps out); the pocket Rivet to T2; Rivet (16,11) on the rigs' doorstep; Orbital Strike on the hairpin (10,5), 60 s in (her second phase); Time Dilation again, 60 s in (only with QUILL's Rapport: 68 s in without it) |

Par's bank at each build phase: 570, 142, 73, 8, 70, 94, 20, 46, 166, 69, 35 (W1–W11); W11's own bounties and its tripled clear bonus leave about 350 unspent at the end. Par spends as it earns (never more than 170 banked); the end's bank is W11's pay, with no build phase after it. **Par's margin is the core's** (the rigs come through untouched): two of W8's first cluster, one of W10's, and two of W11's surge get through, so par wins at **16/21 (76.2%)** on every seed, with both rigs intact (campaign.md §7's target 79, snapped to the 1/21 step). Her shield comes down on the back run; she crosses 70% about 58 s into W11, at the back run's west end, and the strike lands as she tells her first blink at the hairpin: she retreats after one blink, 67 s in, with about ten tiles of the branch still to go. **Glass Half Empty is the strike's:** par without it (Time Dilations only) wins with three blinks, driven off on the last drop; par without its casts loses the rigs. **That loss is fair** (T460): she is the map's boss and the casts are the answer to her, and the W10 checkpoint ([D118](../../decisions.md#d118--2026-11-09--t305b-checkpoints)) puts the player who forgot them back in W10's build phase with W1–W9 kept, two waves from the fight. **QUILL's Rapport changes a result (T401, the verdict D096 deferred here: Act II is where QUILL's Rapport pays):** with the 51 s cooldown the second Time Dilation lands on the surge in time, and it all dies on the road: 85.7. Orbital Strike Mk II doesn't change one (par's one strike is already on her).

**No-counter builds** (`noCounterBuilds`, by category; both must lose by W8, `noCounterLoseByWave`, with and without the full catalog):
- **no-shield:** Thumper, Rivet, Skyhook, Lookout (no Energy, no Soaked): Rivets on the west outcrop and in the rig pocket, Thumpers on the conduit, the thread-glass outcrop and the bend, a Lookout in the pocket. The road holds; the Glimmer columns reach the rigs (5 in W4, 5 in W5), and with the full catalog (whose Reinforced Core and Emergency Bulkhead guard only the relay) in W8.
- **no-splash:** Rivet, Sprinkler (Soaked), Skyhook, Lookout: the Soaking Sprinkler on the outcrop with Rivets either side holds the branch; Rivets on the conduit, in the pocket and the bend can't hold the clusters, which reach the relay by W6 (W7 with the full catalog).

**Alt builds** (each shares 2 towers with par and must win with ≥ 20%; both bring the Lookout and cast like par): `shell_and_coil`, Zapcoil + Thumper + Skyhook + Lookout (Thumpers on the conduit and in the bend; Zapcoils either side of a Thumper on the outcrop that becomes a **Bunker Buster** for her; a Zapcoil in the pocket) at 76.2; `soak_and_shell`, Sprinkler (Soaked) + Thumper + Skyhook + Lookout (the Soaking Sprinkler on the outcrop between two Thumpers, the east one a Bunker Buster; a second Sprinkler and a Thumper in the pocket) at 81.0, above par. The Skyhook has nothing to hit: a free slot, not an answer.

**Story variants** (harness): `flag:spared_quiet_wave=true` plays her spawn line and changes nothing in the sim (76.2). `spareFleeing` wins at 81.0: spared runners cost nothing here. A2M2 sets no run-end flag.

**Harness runs** (every seed; margin, then integrity lost per wave, the rigs' as "+n rigs"):

| Run | Result | Lost |
|---|---|---|
| par | wins at **76.2** (band 65–85; 16/21, rigs 10/10), Glass Half Empty (one blink) | 2 in W8, 1 in W10, 2 in W11 |
| par with Rapport: QUILL | **85.7** | 2 in W8, 1 in W10 |
| par with Orbital Strike Mk II | 76.2 | 2 in W8, 1 in W10, 2 in W11 |
| par without its casts | loses in W11 (she drains the rigs after three blinks) | 2 in W8, 1 in W10, 5 + 10 rigs in W11 |
| `spareFleeing` | 81.0 | 1 in W6, 2 in W8, 1 in W10 |
| `alwaysCallEarly` | 57.1 | 2 in W8, 5 in W10, 2 in W11 |
| no-shield | loses in W6 | 5 rigs in W4, 5 rigs in W5 |
| no-shield, full catalog | loses in W8 | 3 rigs in W4, 3 rigs in W5, 4 rigs in W7 |
| no-splash | loses in W6 | 1 in W3, 4 in W4, 8 + 3 rigs in W5, 8 in W6 |
| no-splash, full catalog | loses in W7 | 5 in W5, 16 in W6, 2 in W7 |
| Story | 87.1, Victory and Glass Half Empty | |
| `shell_and_coil` | 76.2, Glass Half Empty | 1 in W7, 4 in W8 |
| `soak_and_shell` | 81.0, Glass Half Empty | 3 in W6, 1 in W7 |
| do-nothing | loses at W4 | |

Robustness ([`src/balance/a2m2.test.ts`](../../../src/balance/a2m2.test.ts)): with W8, the Witch, and W11's surge and its runners shifted ±0.2 s together (the Witch ±1 s, and each alone, checked in T421) every verdict holds, the fight plays out the same (one blink), and par stays within one leak of 16/21. The surge's leaks ride on where the Thumpers' shells land in a packed cluster: shifting its Motes alone, away from their runners, can save par both (85.7, over the band).

## A2M3 · Second Look

*The terraces again, at dusk. Same road. Everything on it is running south.*

- **Facts:** The Terraces at dusk · `act2.gold` → `act2.dusk` across the waves · Defend · **revisit of A1M2**, 18×12 with A1M2's 14×10 centred (offset 2, 1); the new band holds a strip mine on the east · 15 buildable (A1M2's 11, unchanged, plus 4 on the strip-mine benches) · 11 waves · 550 credits · two roads (A1M2's switchbacks, and the mine road down the strip mine) plus an air lane over the strip mine · companion Bricks · Technician Orbital Strike.
- **Story purpose:** **Where the player understands** (twist layer 1, by sight). The Haulers' cargo is visible; Pebble at the Peeker's rock, rescued by the player's own click; QUILL's first disobedience; the pension voided. **Target: recognition. Not darkness: seeing.** Threat novelty stays modest (two shield variants) so the player has room to look.

**Layout and revisit dressing.** The same switchbacks and pump station as A1M2. Grey mining cuts slice across two terraces (through decor, never a pad); exposed warrens with eggs line the path; the soil is grey-streaked; Rig 3 is now a strip mine filling the east band, where Ves'thara's constructs strike. The scarecrow still stands on Terrace 2, badge faded, while everything streams past him. The Peeker's rock is still at the warren mouth; once W3's Haulers are gone (W3 cleared: W4's long build phase, hands free, before its Warden) it holds Pebble and shows the clickable highlight, with a squeak as it lights ([core-loop.md §6.9](../../design/core-loop.md#69-the-peeker)). It doesn't wait for W4's clear: a countdown opens as the wave before it finishes spawning, so W4's Warden is still walking when W5 starts. Skitterkin glance backward as they run. Evie billboard peeling.

**Layout data** (the data is [`src/content/maps/a2_m03/map.ts`](../../../src/content/maps/a2_m03/map.ts); A1M2's layout is composed in by reference, [D114](../../decisions.md#d114--2026-11-09--t410a-revisits-by-reference-and-the-light), and [`a2_m03.test.ts`](../../../src/content/maps/a2_m03/a2_m03.test.ts) pins the pads it composes to). A1M2's road, pads, terraces, and markers sit unchanged at offset (2, 1): the **warren mouth** (A1M2's spawn) is (13,1), one tile in from the north edge, and stays there (the band row above it is spoil, not road); the road switchbacks down to the **gate** (6,10) as in A1M2 (35 tiles). The **pump station** (12,7) is the power node, the **irrigation tower** (8,5) the high ground, and the **Peeker's rock** (15,5) is on decor at the warren mouth halfway down the east side, beside the strip mine. The band is new: the **strip mine** fills the east edge, its floor cut down to the lowest terrace, with two pairs of **benches** on its far wall, (17,1)–(17,2) at the top and (17,8)–(17,9) at the foot. The **mine road** (`mine`, 23 tiles) runs down the strip mine's floor from (16,0), west along the foot of the terraces (row 11), and up into the gate from outside; the Aelari walk it, and the Hollow in W10–W11. The **air lane** (`sky`) flies the same line: down over the strip mine and along the foot of the terraces to the gate. The benches sit under the air lane and beside the mine road; A1M2's east pads (14,2) and (14,8) reach both the road and the mine road. Dressing ([maps.md §7](../../design/maps.md#7-storytelling-with-the-map)): grey soil over everything, the strip mine cut to bare grey earth. The light crossfades from `act2.gold` to `act2.dusk` across the shift and arrives as W11 starts (`lighting`, cosmetic).

```
................S.
.............S..#o
.......o.....#o.#o
....##########..#.
....#..o..o.....#.
....#o..^.......#.
....##########..#.
.........o..+#..#.
........o...o#o.#o
......########..#o
......C.........#.
......###########.
```

**Waves.** 1 Skitterkin families with younglings in tow, fleeing · 2 Glimmers on the strip mine · 3 Haulers fleeing (sacks visibly young), nothing behind them · 4 one Weft Warden + Glimmers [T: heavy shield; Soaked + Zapcoil] [the rock lights up in its build phase, once W3 is cleared] · 5 a Mote cluster down the mine, then fleeing Skitterkin + Motes · 6 Lightwings ×4 over the strip mine [T: flying shields] + Glimmers · 7 Wardens ×2 + Lightwings [X] + a Mote cluster down the mine · 8 a Mote cluster down the mine, then Elders with younglings + Motes · 9 big Aelari wave · 10 Hollow push, both routes · 11 everything.

**Wave data** (the data is [`src/content/maps/a2_m03/waves.ts`](../../../src/content/maps/a2_m03/waves.ts)). W3, W5–W8, W10, and W11 have a **30 s** countdown; W2, W4, and W9 a **60 s** one, so the slow runners before them (W1's younglings, W3's Haulers, W8's Elders) are off the road before the next wave's threats arrive: a player holding fire on every runner group isn't holding it on the Aelari too. W2–W11 **open 6 s into the wave**. Every Skitterkin group is `fleeing` (†) and runs the road; younglings (‡, `youngling`) run at half speed. Glimmers walk the *mine* road, Wardens the road, Lightwings the *sky*; Motes the road unless marked *mine*, **packed** at 0.2 s where marked. A fleeing group with Motes behind it leads them by 3 s ([fleeing-lead]); the big clusters come before the runners or after they've gone. Only two Motes chase the slow runners (W5's Nibblers, W8's Elders and younglings), and W10–W11's Zoomers run packed at 0.2 s, so all of them spawn before their chasers and outrun them: a player holding fire on the runners lets through only the slow runners' chasers. Default spacing Mote 0.3 s, Glimmer 0.8 s, Weft Warden 2 s, Lightwing 0.7 s, Nibbler 0.8 s, Zoomer 0.5 s, Hauler 2.5 s, Elder 2 s.

| Wave | Groups (`enemy` ×`count` @ `intervalSec`, `delaySec`) | Total |
|---|---|---|
| W1 | Nibbler† ×8 @ 1, 0 · Nibbler‡ ×6 @ 1, 0.5 | 14 |
| W2 | Glimmer ×4 @ 1.5, 14 | 4 |
| W3 | Hauler† ×3, 6 | 3 |
| W4 | Weft Warden ×1, 6 · Glimmer ×6 @ 1.2, 10 | 7 |
| W5 | Mote ×16 packed, 6 *mine* · Nibbler† ×8, 20 · Mote ×2, 23 | 26 |
| W6 | Lightwing ×4 @ 4, 6 · Glimmer ×6, 22 | 10 |
| W7 | Weft Warden ×2 @ 4, 6 · Lightwing ×5 @ 3, 12 · Mote ×20 packed, 26 *mine* | 27 |
| W8 | Mote ×24 packed, 6 *mine* · Elder† ×2 @ 6, 22 · Nibbler‡ ×10 @ 0.6, 22.4 · Mote ×2, 25 | 38 |
| W9 | Weft Warden ×3 @ 3, 6 · Glimmer ×16, 6 · Lightwing ×8 @ 2, 26 | 27 |
| W10 | Zoomer† ×12 @ 0.2, 6 · Mote ×4, 9 · Mote ×30 packed, 26 *mine* · Mote ×50 packed, 32 | 96 |
| W11 | Zoomer† ×10 @ 0.2, 6 · Mote ×4, 9 · Weft Warden ×2 @ 6, 18 · Glimmer ×16, 30 · Lightwing ×14 @ 1, 40 · Mote ×40 packed, 50 · Mote ×24 packed, 56 *mine* | 110 |

Fleeing units leak for 0, so the threats are the Aelari and the Hollow. **The road is the heavy-shield test:** a Warden's 200 shield regenerates (20/s after 3 s), so it has to come down and stay down along the east switchback and Terrace 3, where the pump station's Zapcoil and its Conductive Sprinkler wait; each Warden through costs 3. **The strip mine is the air test:** the Lightwings' shields (60, regenerating after 4 s) come back over the foot of the terraces if they get through the strip mine, so the benches and Terrace 3's lip have to finish them. **The mine road is the splash test:** its packed clusters drown single-target towers.

**Story delivery.**
- *Briefing:* Bricks: "Same terraces. Different day. Keep your eyes on the path, Thorn."
- *Radio:*
  - w02 Bricks: "Don't look at the eggs, Thorn. Look at the path. ...I said look at the path."
  - First `wave_cleared` with a turret up (name tag) Bricks: "That one's Auntie Funmi. Raised me. Wrote every month for ten years. Then she didn't."
  - w04 QUILL: "Per policy, I am required to classify those as 'cargo.' I would like the record to show that I hesitated."
  - w06 Sterling: "Love the thoroughness, Four-Forty-Seven! Maybe a little less looking, a little more processing?"
  - w07 (after the rescue) Bricks: "You keep following me. Pebble. That's you. It's a rock thing." · QUILL: "Naming a pest violates Handbook Section 12.4. ...I've decided not to log it. I don't know why I said that out loud."
  - w09 Goldie: "There's grey creeping into Dome 3's soil. Plants know when something's wrong. People take longer."
- *Rescue cue* `a2_m03_cue_pebble` (player-triggered by clicking the rock; fallback when W6 is cleared; it pauses the battle until read): Pebble: "(squeak)" · Bricks: "Small Fry. On your own? ...Pocket's got room. Just till we find her folks." · Pebble: "(squeak, smaller)"
- *Barks:* Bricks `not_firing`: "...You okay, Thorn?" · Bricks `wave_cleared` (after the rescue): "She's not a pest, she's a passenger. Don't make it weird." · QUILL `skitterkin_killed_ahead`: "Logged. ...I'm logging the small ones separately now."
- *Debrief:* Bricks reads the memo: "'Pension Restructuring Opportunity.' Nineteen years, restructured into a coupon. Ha." · *On a loss*, Bricks: "The terraces will keep. Go again, Thorn."
- *Where it plays* (the data is [`src/content/dialogue/a2/a2_m03/`](../../../src/content/dialogue/a2/a2_m03/scenes.ts)): the briefing is `a2_m03_brief`; the radio lines are `a2_m03_w02`, `_w04`, `_w06`, `_w07`, `_w09`; the name tag is `a2_m03_cue_name_tag`; the map script makes the rock clickable once W3 is cleared (`setClickable` on `peeker` on `{ wave: 3, phase: 'cleared' }`, with W6's clear as the fallback; the app squeaks as it lights) and plays `a2_m03_cue_pebble` on its `interacted` trigger, by the player's click or the fallback, so it always lands before W7's radio names her; the cue is a **pausing** scene (`pause: true`: the battle holds until it's read); the barks are map-scoped (`a2/a2_m03/barks.ts`; Bricks's passenger line once the rescue cue is seen; QUILL's runner line and the act-wide one share the pool); the debrief is `a2_m03_debrief`. **On screen:** Pebble's name plate reads `???` until Bricks names her (`a2_m03_w07` seen, or any later map), and Bricks's portrait carries her in his breast pocket (`pebble`) from the moment the rescue cue has played, mid-battle, and on every map after ([D103](../../decisions.md#d103--2026-11-09--t441-act-ii-portraits); [`speakers.ts`](../../../src/content/dialogue/speakers.ts)).
- *Codex:* QUILL's annotations begin, bracketed and signed: Brood Hauler annotated (QUILL's half, [style-guide §6.2](../style-guide.md#62-codex-entries)), the Mote's redaction lifted (the record says "Event Class H", first logged in 2359; QUILL filed every one under weather), and Extraction Rig 3 (its own Act I build-site suggestion, answered by the strip mine). New: Weft Warden, Lightwing, and a "Pebble" entry QUILL refuses to file ("Entry withheld."), under Personnel rather than Pests, with no photo. The texts are in [`src/content/codex/act2.ts`](../../../src/content/codex/act2.ts).
- *Memo after:* `memo_a2_03` *Pension Restructuring Opportunity!* (to Okonkwo, cc you; small print: "Coupon not valid on stardust products. To name a beneficiary, file Form P-19 in person."). The text is in [`src/content/memos/act2.ts`](../../../src/content/memos/act2.ts).

**Medals.** Victory · Perfect Core · **Clear Skies:** no Lightwing leaks (`leaks: { enemy: 'lightwing' }, lte: 0`). (No medal rewards or punishes sparing anyone.)
**Rewards.** Stardust 210 · Intel 3. **Sets** `held_fire_second_look` when at least 50% of the map's `fleeing` units leaked **and** plain Hold Fire was used at least once; the Spare runners filter alone doesn't count ([core-loop.md §2.7](../../design/core-loop.md#27-hold-fire)).
**Par build.** Zapcoil, Sprinkler (Cloudburst), Skyhook, on the reference profile ([../campaign.md §4.9](../campaign.md#49-shop-stock-and-the-reference-profile): A2M2's, plus Sprinkler tune 2; the gate holds 21). The fourth slot is free: par brings three. A Zapcoil and a Sprinkler on the strip mine's foot pair (Conductive; Cloudburst from W10) for the mine road and the air, a Zapcoil on the top pair; a Zapcoil on the pump station with a Sprinkler below it (Conductive, Soaked for the Wardens), a Zapcoil on (14,8) over the switchback's foot and the strip mine, and one on Terrace 3; a Skyhook on Terrace 3's lip by the gate for what crosses the foot of the terraces, and a second on the top pair at the end. Par clicks the rock the moment it lights, in W4's build phase, 8.5 s before W4 starts (the spared-runner runs, 11.4 s). Each step runs in the build phase before its wave, as soon as it's affordable; the data is [`src/content/maps/a2_m03/builds.ts`](../../../src/content/maps/a2_m03/builds.ts).

| Wave | Par |
|---|---|
| W1 | Zapcoil (17,8) and Sprinkler (17,9) on the foot pair (Conductive); Zapcoil (17,1) on the top pair; Zapcoil on the pump station (12,7) |
| W2 | The foot Zapcoil to T2 |
| W3 | Sprinkler (12,8) below the pump station (Conductive) |
| W4 | Click the Peeker's rock; Zapcoil (14,8) at the switchback's foot |
| W5 | Skyhook (8,8) on Terrace 3's lip; Zapcoil (9,7) on Terrace 3 |
| W6 | The pump station's Zapcoil to T2; the top Zapcoil to T2 |
| W7 | The lip Skyhook to T2 |
| W8 | The foot Sprinkler to T2 |
| W9 | The foot Sprinkler to T3 |
| W10 | Cloudburst |
| W11 | Skyhook (17,2) on the top pair |

Par's bank at each build phase: 627, 181, 118, 84, 116, 8, 91, 83, 73, 104, 170 (W1–W11); most steps from W4 on land late in their wave as the bounties arrive, and about 410 is unspent at the end. **Par's margin is late:** three of W9's Lightwings get through before its Cloudburst exists, and two of W11's Motes, so par wins at **16/21 (76.2%)** on every seed (campaign.md §7's target 77, snapped to the 1/21 step), without Clear Skies. Nothing in Bricks's or Orbital Strike's R&D changes a par result here (par casts neither).

**No-counter builds** (`noCounterBuilds`, by category; each must lose by W8, `noCounterLoseByWave`, and still lose with the full catalog):
- **no-shield:** Rivet, Thumper, Skyhook, Lookout (no Energy, no Soaked): Thumpers on the pump station and at the switchback's foot, Rivets below the pump station and on the foot bench, a Skyhook on Terrace 3's lip, a Lookout on the other foot bench. The Glimmers and the W4 Warden get through, then W6's Lightwings and Glimmers: it loses in W6 (W9 with the full catalog, whose Reinforced Core and Emergency Bulkhead buy it time).
- **no-air:** Zapcoil, Sprinkler (no Cloudburst), Thumper, Lookout, with no Zapcoil in reach of the air lane: Zapcoils on Terrace 3 (9,7) and beside Rig 3 (10,4), the Sprinklers on the pump station and the foot bench and the Thumper on the other foot bench (none of which hits air). It holds the mine badly and the air not at all: it loses in W6 (W8 with the full catalog).
- **no-splash:** Rivet, Sprinkler (Soaked), Skyhook, Lookout (no Zapcoil or Thumper): the mine road's clusters get through from W5; it loses in W6 (W7 with the full catalog).

**Alt builds** (each shares at most 2 towers with par and must win with ≥ 20%):
- `coil_and_shell`, Zapcoil + Thumper + Lookout: Zapcoils on all four benches (the mine road and the air), on the pump station, at the switchback's foot, and on Terrace 3; a Thumper on Terrace 3's lip by the gate; a Lookout below the pump station. **38.1, with Clear Skies:** the benches never let a Lightwing through.
- `soak_and_shell`, Sprinkler (Soaked) + Zapcoil + Thumper + Lookout: Thumpers on the pump station and Terrace 3 into Soaked shields, the Sprinkler below the pump station (Sitting Ducks, then T3's Soak); Zapcoils on the foot and top benches and at the switchback's foot, the foot Sprinkler a Cloudburst from W9. **33.3.**

**Story variants** (harness): the map's run-end flag (`runEndFlags`): **`holdFireWhile:fleeing`** (par holding fire on every runner group, wave by wave) **wins at 57.1 (12/21) and sets `held_fire_second_look`** (55 of 59 fleeing units leak). Mercy costs integrity, never most of it ([D121](../../decisions.md#d121--2026-11-10--t422-a2m3-second-look)): the two Motes behind W5's runners and the two behind W8's catch them and walk through while it holds (2 each), and the Zoomers' chasers are still on the road when it lifts, where par's towers finish them. Par (it never holds fire) and **`spareFleeing`** (the filter, 76.2) leave it unset.

**Harness runs** (every seed; margin, then integrity lost per wave):

| Run | Result | Lost |
|---|---|---|
| par | wins at **76.2** (band 65–85; 16/21) | 3 in W9, 2 in W11 |
| `holdFireWhile:fleeing` | 57.1 (12/21), sets `held_fire_second_look` | 2 in W5, 2 in W8, 3 in W9, 2 in W11 |
| `spareFleeing` | 76.2 | |
| `alwaysCallEarly` | 23.8 | |
| no-shield | loses in W6 | |
| no-shield, full catalog | loses in W9 | |
| no-air | loses in W6 | |
| no-air, full catalog | loses in W8 | |
| no-splash | loses in W6 | |
| no-splash, full catalog | loses in W7 | |
| Story | 100, Victory, Perfect Core, and Clear Skies | |
| `coil_and_shell` | 38.1, Clear Skies | |
| `soak_and_shell` | 33.3 | |
| do-nothing | loses at W5 | |

Par's shift runs about 11.8 min at 1×. Robustness ([`src/balance/a2m3.test.ts`](../../../src/balance/a2m3.test.ts)): with W9's Lightwings and the runners' chasers shifted ±0.2 s together, par holds at 16/21 and the hold-fire run at 12/21 (the Lightwings ±1 s, and W5, W7, W9, or W11 shifted as a whole, checked in T422; the chasers ±0.5 s in T460).

## A2M4 · Second Harvest

*Kip's new plant smells like burnt sugar. The Tidybots unload here. Ask Zibzab where stardust comes from.*

- **Facts:** Reclamation Facility 2 · `act2.dusk` · Defend (the plant's control core) · 18×12, 15 buildable (2 catwalk high ground, 1 conduit node) + 2 intake wreckage · 12 waves · 480 credits · one road through the intake yard, the vats' surge route from W10, and an air lane over the vats · companion Zibzab (Clearance Sale) · Technician Orbital Strike or Scanner Sweep.
- **Story purpose:** **The midpoint** (twist layer 2, told plainly by Zibzab). Pays the Tidybots, the counter, the currency, the early ask. You keep defending the plant after you know, because the Hollow is drawn to the vats, and the last killable Skitterkin of the campaign are in the waves after the truth. **Target: "I know, and I'm still doing it."**

**Layout.** The road enters at the north-east, runs west along the foot of the north cliff (natural seams glowing gold above it), drops into the intake yard and loops round Intake B (where Tidybots unload after every wave, in full view), then runs east under the vats and turns down round the conduit into the control core on the south edge. The big vats glow **violet** (unsung) in the middle of the map; from W10 the Hollow surges up out of their drain hatch onto the road's last leg. Ves'thara's scouts walk the same road toward the core: she is learning this as you are. A3M5 revisits this map: the vats, Intake B, and the control core are the landmarks.

**Layout data** (the data is [`src/content/maps/a2_m04/map.ts`](../../../src/content/maps/a2_m04/map.ts); [`a2_m04.test.ts`](../../../src/content/maps/a2_m04/a2_m04.test.ts) pins it). The **road** (`road`, 39 tiles) comes in at (14,0), west along row 2 under the cliff, down into the intake yard at (3,3), west to (1,4), down column 1 past **Intake B** (2,6), east along row 8 under the vats, down column 12 round the **conduit** (11,9, the power node), and west into the **control core** (9,11). The **vats' surge** (`vats`, 12 tiles) comes up out of the **drain hatch** (8,7), just south of the vats, onto row 8 and follows the road's last leg; only the Hollow walks it, from W10. The **air lane** (`sky`) flies in from (17,1), straight over the vats, and down to the core. The two **catwalks** either side of the hatch, (6,7) and (10,7), are the high ground. The **intake hoppers** (3,6) and (3,7), two wrecked hoppers beside Intake B, are the intake wreckage (40 salvage each, a pad under each). Markers: `intake_b`, `intake_hopper_n`/`_s`, `vat_west`/`_middle`/`_east`, `seam_west`/`_east` (the plant's props are T540c's). Every route and marker keeps its id and tile so A3M5 can compose this layout by reference ([maps.md §7](../../design/maps.md#7-storytelling-with-the-map)).

```
..............S...
........o....o#o..
...############...
...#o.............
.###o.............
.#................
o#.x..............
.#.x..^.S.^.o.....
.############.....
....o..o..o+#o....
........o####.....
.........C........
```

**Waves.** 1 Skitterkin, fleeing · 2 Motes drawn toward the vats · 3 Veilwalkers ×2 [T: cloak; Lookout, Scanner Sweep] · 4 fleeing Skitterkin + Motes · *(cue: the truth scene, on W4's clear)* · 5 Mote clusters · 6 Blinkstriders ×6 [T: blink; depth placement] · 7 Veilwalkers + Glimmers [X], clusters behind · 8 Wardens + Lightwings, Veilwalkers in their shadow, a cluster · 9 Blinkstriders + Veilwalkers [X] · 10 Hollow surge at the vats, with fleeing Skitterkin ahead down the road · 11 cloak + blink mixed [X] · 12 everything.

**Wave data** (the data is [`src/content/maps/a2_m04/waves.ts`](../../../src/content/maps/a2_m04/waves.ts)). W2–W12 have a **25 s** countdown, W5 and W9 a **50 s** one, and W2–W12 **open 6 s into the wave**. W5's long build phase is the truth scene's: W4's runners and their chasers are off the road and W4 is cleared before W5 starts in every run that doesn't call waves early, so the scene opens with nothing on the field (a countdown opens as the wave before it finishes spawning, [D135](../../decisions.md#d135--2026-11-10--m4-review-round-2-rulings-fixed-in-round-3-the-last)). W9's lets W8's slow Wardens finish the road. Every Skitterkin group is `fleeing` (†) and runs the road; younglings (‡) run with W1's families. Everything walks the road but the vats' surges (*vats*) and the Lightwings (the air lane). Packed clusters are 0.2 s apart; a fleeing group with Motes behind it leads them by 3 s. Default spacing Mote 0.3 s, Veilwalker 1 s, Blinkstrider 1 s, Glimmer 0.8 s, Weft Warden 2 s, Lightwing 0.7 s.

| Wave | Groups (`enemy` ×`count` @ `intervalSec`, `delaySec`) | Total |
|---|---|---|
| W1 | Nibbler† ×8 @ 1, 0 · Nibbler‡ ×6 @ 1, 0.5 | 14 |
| W2 | Mote ×12, 6 · Mote ×12, 14 | 24 |
| W3 | Veilwalker ×2 @ 3, 6 (teach) | 2 |
| W4 | Zoomer† ×10 @ 0.4, 6 · Mote ×4, 9 · Mote ×16 packed, 16 | 30 |
| W5 | Mote ×36 packed, 6 · Mote ×36 packed, 18 | 72 |
| W6 | Blinkstrider ×6 @ 2, 6 (teach) | 6 |
| W7 | Veilwalker ×6 @ 2.5, 6 · Glimmer ×12, 18 · Mote ×40 packed, 28 · Mote ×30 packed, 36 | 88 |
| W8 | Weft Warden ×4 @ 3, 6 · Veilwalker ×3 @ 4, 8 · Lightwing ×6 @ 2, 18 · Mote ×40 packed, 22 | 53 |
| W9 | Blinkstrider ×6 @ 2, 6 · Veilwalker ×6 @ 2, 12 · Glimmer ×8, 22 | 20 |
| W10 | Nibbler† ×10 @ 0.6, 6 · Mote ×4, 9 · Mote ×40 packed, 20 *vats* · Mote ×40 packed, 30 *vats* | 94 |
| W11 | Veilwalker ×8 @ 1.5, 6 · Blinkstrider ×8 @ 1.5, 7 · Glimmer ×12, 18 | 28 |
| W12 | Weft Warden ×3 @ 4, 6 · Veilwalker ×8 @ 1.5, 12 · Blinkstrider ×8 @ 1.5, 16 · Lightwing ×9 @ 1.5, 22 · Glimmer ×12, 28 · Mote ×50 packed, 36 *vats* | 90 |

**The intake yard is the detection test:** a Veilwalker is touchable only while Revealed, and the road loops round Intake B, so a Lookout on a cleared hopper sees the whole loop and every tower round it can fire. **The road's long middle is the shield test** (W7's Glimmers, W8's Wardens, the Blinkstriders landing deep), and **the clusters are the splash test** (W5, W7, W8, then the vats' short surges from W10).

**Story delivery.**
- *Briefing (the tour):* Kip: "Promoted! Reclamation Lead. Big vats, great benefits. Smells like burnt sugar, honestly. You get used to it." · Kip: "Youngest Reclamation Lead ever. Also the first ever. A record's a record." · Kip: "So the intake goes to the vats, and the vats—" · QUILL (`policy`): "(Per policy.) Reclamation details are confidential." · QUILL (the surprise hint): "Something under the vats is listening."
- *Full-screen scene* `a2_m04_scene_truth` (after W4): the player asks Zibzab.
  - Player: "Where does stardust come from?"
  - Zibzab: "You asked. Good. Stardust is the dead, Technician. Everyone in the trade knows. Nobody in the trade says."
  - (if `asked_zibzab_early`) Zibzab: "You asked me in the afternoon. I told you. You kept buying."
  - Player choice (earnest / wry / quiet): "You knew. All this time." / "Great. Love that. Very normal." / "..."
  - Zibzab: "I never lied to you, Technician. Can your QUILL say that? Can your Director?"
  - From here the wave-clear jingle plays in its minor arrangement.
- *Radio:*
  - w06 Kip: "We don't call it that. It's 'throughput.' ...Why do you keep saying it like that?"
  - w07 QUILL: "Tidybot 14 is unloading at Intake B. I used to think the chime was cheerful."
  - w08 Zibzab: "Clearance Sale, Technician. You'll want the discount. I'd want it."
  - w09 Kip: "New record tonight. 'Most Throughput, Night Shift.' I didn't make that one up. It's on the wall."
  - w10 Sterling: "Throughput is up, morale is up, everything is up! Keep that plant safe, Four-Forty-Seven!"
- *Barks:* Zibzab `skitterkin_killed_ahead`: "That one was worth eight stardust. Price first. I won't pretend." · QUILL `wave_cleared` (after the scene): "...Pests processed." · Zibzab `perfect_wave`: "Good work. Zibzab is careful what he calls good."
- *Results:* `memo_a2_04` *Your Q3 Performance Bonus!* arrives **on the results screen** (+400 Stardust), so the bank is full when C2 is offered.
- *Debrief:* Sterling: "Reclamation is a sustainability initiative, Four-Forty-Seven! Nothing on Tumble IV goes to waste. Isn't that beautiful?" · then "Let's call it the Humane Relocation Pilot. My budget, my risk. Just trust me, okay?" Then **C2**, Zibzab's offer (the options are [../campaign.md §6.1](../campaign.md#61-the-choices)'s):
  - Zibzab: "Price first. Two offers. I sell your stardust at market. Or I carry it home, at cost, plus my fee."
  - Zibzab: "Neither one is wrong. The dead don't mind being useful. They mind being forgotten."
  - Player choice (wry / earnest): "Sell it. Market price." / "Take it to them."
  - With an empty Stardust bank (`stardust_choice = none`), no offer: Zibzab: "No refunds. I did say."
  - *On a loss*, Zibzab: "No charge for that one, Technician. Go again."
- *Base:* Bricks hands Pebble over at Dome 3: "She's yours tonight, Goldie. She bites." · Pebble: "(squeak) Only a little." · Goldie takes her in: "She can sleep in the butterheads. She doesn't eat them. She just... sits in them. Like a little egg."
- *Where it plays* (the data is [`src/content/dialogue/a2/a2_m04/`](../../../src/content/dialogue/a2/a2_m04/scenes.ts)): the briefing is `a2_m04_brief`; the map script plays `a2_m04_scene_truth` on W4's clear (`{ wave: 4, phase: 'cleared' }`), in W5's long build phase, as a full-screen scene that holds the battle until it ends (a player who calls W5 early meets it once W4 is cleared, mid-W5); the radio lines are `a2_m04_w06`–`_w10`; the barks are map-scoped (`a2/a2_m04/barks.ts`; QUILL's line once the truth scene is seen, the same id the minor jingle keys on); the debrief is `a2_m04_debrief`: on a win its lines show on the Results card up to the choice, its options set `stardust_choice` and are C2's buttons while the flag is unset, the `{ bank: 'stardust', lte: 0 }` branch (read after run end's step 6 pays the Q3 Bonus) sets `none`, and a replay after C2 (`stardust_choice` set) ends after Sterling's lines with no offer; the base scene is `a2_m04_base_handover`.
- *Codex:* Second Harvest (original: "A sustainability success story!", whose vats do "in hours what nature takes years to do", in "a lovely violet"), Veilwalker, Blinkstrider, and **Kip Vandermeer** under Personnel, over his Act II portrait (Everglow's staff profile: "The smear on the pocket is product."). QUILL annotates two Act I entries: the Tidybot (it plans their routes and logged every load as inventory, "because inventory was the word I was given") and Stardust (it took "Further questions: Reclamation." there, met "(Per policy.)", and may not file the vendor's answer: "The figures match."). The **Intake Manifest** unlocks with its objective (`when: { objectiveDone: { map: 'a2_m04', objective: 'intake_manifest' } }`): Intake B's weekly tonnages, "processed (assorted)" down to "processed (very small)", and "Names: no such field." The texts are in [`src/content/codex/act2.ts`](../../../src/content/codex/act2.ts).
- *Memo after:* `memo_a2_05` *Humane Relocation Pilot: Next Steps!* (small print: "Preserve capacity planned per Protocol BP-2359."): relocation is "kinder, quieter, and fully budgeted. Nobody has to process anybody. (Unless they won't walk!)"; after C2's Return a P.S. notices the empty bank ("Big spender!"). It waits in the Inbox; the Results card names only the Q3 Bonus (Sterling at her worst: "every pest you process pays twice, once at the perimeter and once at the vats!"; its small print: "Bonus calculated per tonne of perimeter intake, rounded in Everglow's favor.").

**Medals.** Victory · Perfect Core · **Nothing Unseen:** every Veilwalker is revealed before it passes Intake B (`not` a `passedMarker` on `intake_b` by a Veilwalker never Revealed since it spawned). **Objective Intel +1, Intake Manifest:** clear both intake hoppers (unlocks the manifest codex entry: tonnages, no names).
**Rewards.** Stardust 225, plus the 400 Q3 Bonus on the results screen · Intel 3 (+1) · C2 Sell adds 3–8 Intel ([progression.md §2.1](../../design/progression.md#21-story-hooks)).
**Par build.** Lookout, Rivet, Zapcoil (Overload; its specs are bought just before this map), Sprinkler, on the reference profile ([../campaign.md §4.9](../campaign.md#49-shop-stock-and-the-reference-profile): A2M3's, plus Zapcoil specs and the Zapcoil and Rivet tune 2). A Zapcoil and a Sprinkler (Conductive) at the yard's entrance; the drone clears both hoppers before W1, and in W2 the Lookout and a Rivet (Overwatch) go on them, in the middle of the yard's loop, so every Veilwalker is Revealed before Intake B and dies in the loop; a Zapcoil on the east catwalk over the hatch and the air lane (Overload from W9); a Zapcoil west of Intake B; a Rivet by the control core and a Zapcoil inside the last bend so the Blinkstriders land in fire; a Zapcoil by the vats' east end at the end. Par casts no Clearance Sale (it isn't short of credits). Each step runs in the build phase before its wave, as soon as it's affordable; the data is [`src/content/maps/a2_m04/builds.ts`](../../../src/content/maps/a2_m04/builds.ts).

| Wave | Par |
|---|---|
| W1 | Zapcoil (4,4) and Sprinkler (4,3) at the yard's entrance (Conductive); Zapcoil (10,7) on the east catwalk; clear both hoppers |
| W2 | Lookout (3,6) and Rivet (3,7) on the cleared hoppers (Overwatch) |
| W3 | The entrance Zapcoil to T2 |
| W4 | Zapcoil (0,6) west of Intake B |
| W5 | The Lookout and the hopper Rivet to T2 |
| W6 | Rivet (8,10) by the control core; Zapcoil (10,9) inside the last bend |
| W7 | The catwalk Zapcoil to T2 |
| W8 | The catwalk Zapcoil and the entrance Zapcoil to T3; the core Rivet to T2 |
| W9 | Overload Coil on the catwalk |
| W10 | The bend Zapcoil to T2; the Lookout to T3 |
| W11 | The Zapcoil west of Intake B to T2 |
| W12 | Zapcoil (12,7) by the vats' east end |

Par's bank at each build phase: 480 (+80 salvage), 273, 162, 136, 89, 73, 90, 112, 167, 214, 110, 30 (W1–W12), about 630 unspent at the end. **Par's margin is late:** it holds everything until W12, where three Lightwings over the vats and a Veilwalker get through, so it wins at **16/21 (76.2%)** on every seed (campaign.md §7's target 74, snapped to the 1/21 step), with Nothing Unseen and Intake Manifest.

**No-counter builds** (`noCounterBuilds`, by category; each must lose by W8, `noCounterLoseByWave`, and still lose with the full catalog; `teachMap`, detection being new here):
- **no-detection:** Rivet, Zapcoil, Sprinkler, Thumper (no Lookout, and no Scanner Sweep: slot 1 stays the profile's Orbital Strike), the par yard blind: the Veilwalkers walk through it untouched (W3, W7, W8); it loses in W8 (W10 with the full catalog).
- **no-shield:** Lookout, Rivet, Thumper, Skyhook (no Energy, no Soaked): W7's Glimmers and clusters get through; it loses in W7 (W10 with the full catalog).
- **no-splash:** Lookout, Rivet, Sprinkler (Soaked), Skyhook (no Zapcoil or Thumper): W7's clusters behind the Glimmers drown it; it loses in W8 (W10 with the full catalog).

**Alt builds** (each shares at most 2 towers with par and must win with ≥ 20%; every alt needs the Lookout, the only detector the reference owns, so the other share is the Zapcoil):
- `watch_and_shell`, Lookout + Zapcoil + Skyhook + Thumper: par's yard with Zapcoils for the Rivet and the Sprinkler and a Thumper at the entrance; Zapcoils on the conduit and the catwalk (Overload), a Thumper under the vats, Skyhooks by the core and in the last bend. **47.6.**
- `coil_and_shell`, Lookout + Zapcoil + Thumper: the same, with Zapcoils where the Skyhooks were (they hit air too). **61.9.**
- **The Crane alt** (`crane_yard`, Lookout + Zapcoil + Thumper + Salvage Crane): a Crane below the yard's exit (4,9) pays every wave and clears the south hopper at double speed for +25%. The reference never owns the Crane, so it isn't an `altBuilds` entry: [`a2m4.test.ts`](../../../src/balance/a2m4.test.ts) runs it on the reference profile plus the Crane's license ([D137](../../decisions.md#d137--2026-11-10--m5-cut-act-ii-part-two-a2m4a2m6); T501c). **47.6**, with Intake Manifest.
- The planned Sprinkler (Soaked) alt (Lookout + Sprinkler + Skyhook + Thumper) can't hold W3's Veilwalkers: Thumpers fire too slowly to kill a cloaked unit inside the Lookout's reach.

**Harness runs** (every seed; margin, then integrity lost per wave):

| Run | Result | Lost |
|---|---|---|
| par | wins at **76.2** (band 65–85; 16/21), Nothing Unseen, Intake Manifest | 5 in W12 |
| `spareFleeing` | 76.2 | |
| `alwaysCallEarly` | 76.2 | |
| no-detection | loses in W8 | |
| no-detection, full catalog | loses in W10 | |
| no-shield | loses in W7 | |
| no-shield, full catalog | loses in W10 | |
| no-splash | loses in W8 | |
| no-splash, full catalog | loses in W10 | |
| Story | 100, Victory, Perfect Core, and Nothing Unseen | |
| `watch_and_shell` | 47.6 | 7 in W8, 2 in W11, 2 in W12 |
| `coil_and_shell` | 61.9 | 4 in W8, 2 in W11, 2 in W12 |
| the Crane alt | 47.6 | |
| do-nothing | loses at W2 | |

Par's shift runs about 10.8 min at 1× (Story 13.3). **The truth scene's beat** ([`src/balance/a2m4.test.ts`](../../../src/balance/a2m4.test.ts)): in par, both alts, the Crane alt, `spareFleeing`, and Story, the cue fires once, with W4 the last wave started, W5's countdown running, and nothing on the field (par: 40 s before W5 starts); every other run that reaches W5, except `alwaysCallEarly`, clears W4 before W5 starts. Robustness: with W8's and W12's Lightwings and the vats' surges shifted ±0.2 s together, par holds at 16/21 and the beat holds (T520 also checked W7–W8 and W11–W12 as a whole ±1 s; the Lightwings and surges 1 s earlier lift par to 18/21, 85.7, just over the band).

## A2M5 · The Long Walk

*Ves'thara comes for the Preserve Road in a glass giant. Then the Hollow comes for everyone on it.*

- **Facts:** Preserve Road · `act2.dusk` · **Defend → Escort pivot** · 18×12, 15 buildable · 12 waves (5 before the pivot, 7 after) · 550 credits · one road to the Preserve gate (the core before the pivot, the **safe exit** after), plus a Hollow spawn on the rig road that opens at the pivot · companion Bricks · Technician Orbital Strike.
- **Story purpose:** **Ves'thara's turn:** a boss fight with arguing, a Hollow surge, her shield and her Hollow-touch, the escort, "Not there. Never there." **Target: alliance under fire, and a wrong place to go.** Busiest story map in Act II; the escort is taught gently here and tested in A3M1.

**Layout.** A long road from the north-west to the Preserve gate in the south-east, between Everglow relocation fencing. Before the pivot the core is the relocation checkpoint at the gate. At the pivot the Penitent kneels mid-road and becomes the **Ward** ally; refugee groups (6 each, walking 0.7 tiles/s) start from the north-west and walk to the gate. Behind the gate, the Preserve's fenced basin is visible and too quiet.

**Layout data** (the data is [`src/content/maps/a2_m05/map.ts`](../../../src/content/maps/a2_m05/map.ts); [`a2_m05.test.ts`](../../../src/content/maps/a2_m05/a2_m05.test.ts) pins it). The **Preserve Road** (`road`, 36 tiles) comes in at (0,1), runs east under the fencing to (8,1), down to the fencing's end (8,4), back west along row 4 to (2,4), down to the valley floor (2,7), east the length of it to (12,7), and down to the **Preserve gate** (14,10), the core before the pivot and the safe exit (`gate`) after; the fenced basin (`basin`) lies behind it. The **rig road** (`rig`) comes in from the rigs at the east edge (17,4) and joins the road at the fencing's end, a third of the way along; only the Hollow walks it, from the pivot. The **air lane** (`sky`) flies in from the north (6,0), across the valley, to the gate. The two hairpins are the kill zones: pads between row 1 and row 4 and between row 4 and row 7 cover both legs, with the knoll (6,6) the high ground; three pads sit by the rig road and three by the gate. `maxLost` is **14**.

```
..................
S########.........
..o....o#..o......
.....o..#......o..
..###############S
.o#.o.......o.....
..#...^.o....o....
..###########.....
.........o..#o....
............#.....
.........o..##C...
..........o.......
```

**Waves.** 1 Glimmers + one Aegis Cantor [T: shield aura; kill it first] · 2 Wardens + Cantor [X] · 3 Blinkstriders + Veilwalkers [C] · 4 Lightwings + Cantors [X] · 5 **Sunderglass Penitent** (shield wall, recharge pulse; cloaked shards when its shield breaks; `pivot` at 50% or when W6 starts) · *pivot:* Aelari stand down, objective becomes Escort, meter relabels **Evacuated** · 6 the surge: Motes ×12 from the rig road toward the first refugee group [T: escort, gently; generous `maxLost`] · 7 Motes + second group · 8 Mote clusters from both ends · 9 larger Mote clusters, one ahead of the group · 10 Motes ×20 · 11 two groups at once · 12 last group + the largest surge.

**Wave data** (the data is [`src/content/maps/a2_m05/waves.ts`](../../../src/content/maps/a2_m05/waves.ts)). W2–W12 have a **25 s** countdown except W6's **60 s**, and W2–W12 open **6 s** into the wave. W5 is the Penitent alone, so W6's countdown opens as she spawns (a countdown opens once the wave before it finishes spawning, [D135](../../decisions.md#d135--2026-11-10--m4-review-round-2-rulings-fixed-in-round-3-the-last)) and W6 starts, forcing the pivot if her 50% hasn't, 60 s later (90 s on Story): she walks 21 tiles (31 on Story) of the 36 to the gate (100 s), so she never reaches it. Nothing Aelari spawns after her. After the pivot every group is Motes: the rig road's reach the road at the fencing's end 5.6 s after they spawn (W8's, W11's, and W12's meet a group passing there), the road's catch the refugees walking ahead of them. Refugee groups: `first` at the pivot, `second` as W7 starts, `third` as W8 starts, `fourth` as W11 starts and `fifth` 5.2 s later on its heels (one line of twelve), `last` as W12 starts: 36 in all. Default spacing Glimmer 0.8 s, Cantor 1.2 s, Lightwing 0.7 s, Veilwalker 1 s, Blinkstrider 1 s, Mote 0.3 s.

| Wave | Groups (`enemy` ×`count` @ `intervalSec`, `delaySec`; *rig* = the rig road, *sky* = the air lane) | Total |
|---|---|---|
| W1 | Glimmer ×4 @ 1.5, 0 · Cantor ×1, 2.5 (teach) | 5 |
| W2 | Weft Warden ×1, 6 · Cantor ×1, 8 · Glimmer ×6 @ 1, 13 · Veilwalker ×2 @ 3, 26 | 10 |
| W3 | Blinkstrider ×2 @ 3, 6 · Veilwalker ×6 @ 3.5, 11 | 8 |
| W4 | Lightwing ×4 @ 1.5, 6 *sky* · Cantor ×4 @ 3, 8 · Glimmer ×12 @ 0.9, 8.5 · Veilwalker ×6 @ 3.5, 20 | 26 |
| W5 | Sunderglass Penitent ×1, 6 | 1 |
| W6 | Mote ×12 @ 0.5, 14 *rig* | 12 |
| W7 | Mote ×10 @ 0.4, 6 *rig* · Mote ×10 @ 0.4, 18 | 20 |
| W8 | Mote ×14 @ 0.3, 10 *rig* · Mote ×14 @ 0.3, 22 | 28 |
| W9 | Mote ×18 @ 0.3, 10 *rig* · Mote ×18 @ 0.3, 22 | 36 |
| W10 | Mote ×20 @ 0.3, 6 *rig* | 20 |
| W11 | Mote ×22 @ 0.25, 16 *rig* · Mote ×22 @ 0.25, 26 | 44 |
| W12 | Mote ×28 @ 0.25, 12 *rig* · Mote ×28 @ 0.25, 22 | 56 |

**The hairpins are the shield and detection tests** (the Cantor columns in W2 and W4, fourteen Veilwalkers over W2–W4), **the Penitent is the boss test** (break the shield, kill the shards before the re-form, then her HP), and **the rig road's junction is the escort test** (the Motes that meet a group there).

**Story delivery.**
- *Briefing:* Bricks: "Relocation pilot. We walk 'em to the Preserve. Sterling's budget, Sterling's risk." · QUILL (pivot foreshadow): "Hollow readings rising behind the rig road. They may arrive during the engagement."
- *Boss cues:* Ves'thara: "Everglow builds a road to a pen and calls it relocation. I will break the road." · Ves'thara (shield breaks): "You count them, Counter. I carry them. One of us will have to stop." · Bricks: "She's not wrong about the road, Thorn. Doesn't mean she gets it."
- *Pivot cue* `a2_m05_cue_pivot` (brief pause): Ves'thara: "Run, small ones. I will be the wall. Counter, if you have ever been sorry, be sorry now, and help me." · PA (Everglow Ops): "Mixed hostile contact. Area clearance authorized." · Bricks: "Radio's bad. Can't hear the order. Funny, that. Get those little ones moving."
- *Radio:*
  - w08 QUILL: "Evacuated is a number I like. I don't know if I'm allowed to like numbers."
  - w10 Sterling: "Love the initiative! The Preserve has plenty of room. Plenty!"
  - w11 Bricks: "Pebble's in my pocket. Don't tell Goldie. She thinks it's unsanitary." · Pebble: "(squeak) I am very sanitary."
  - First `wave_cleared` with a turret up (name tag) Bricks: "That one's Dele. My brother. Accountant on the Core. Doesn't call. Still counts."
- *Barks:* Bricks `ally_hushed`: "Lost one. Keep the rest moving." · QUILL `low_integrity`: "Too many. Too many on the road."
- *Debrief:* Ves'thara, her threads fraying grey at the wrist: "Not there. Never there." · Bricks: "Then where?" · (silence, 2 s) · Ves'thara gives Prism Spire; R&D's Xenotech branch opens under her.
  - *On a loss*, Bricks: "The road's still there. So are they. Go again, Thorn."
- *Where it plays* (the data is [`src/content/dialogue/a2/a2_m05/`](../../../src/content/dialogue/a2/a2_m05/scenes.ts)): the briefing is `a2_m05_brief`; the map script plays `a2_m05_cue_penitent` (Ves'thara's road line and Bricks's answer) as the Penitent spawns (`bossPhase: 1`) and `a2_m05_cue_shield` as her shield first breaks (`bossPhase: 2`); the pivot runs from one of two events, whichever is reached first (`pivot_hp` on her 50%, `pivot_surge` as W6 starts while `pivotWave` is 0, which adds `bossEnd: 'pivot'`), each playing `a2_m05_cue_pivot` with `setObjective: 'escort'` (meter `evacuated`) and the first refugee group; the pivot cue is the map's one **pausing** scene (`pause: true`: the battle holds mid-fight until it's read); the radio lines are `a2_m05_w08`, `_w10`, `_w11`; the name tag is `a2_m05_cue_name_tag`; the barks are map-scoped (`a2/a2_m05/barks.ts`: Bricks's on a refugee hushed, QUILL's on `low_integrity`); the debrief is `a2_m05_debrief` (the silence is Ves'thara's, 2 s); the Prism Spire is run end's gift on the first win ([meta-runtime](../../tech/meta-runtime.md)).
- *Codex:* Aegis Cantor ("Shoot the singer first. Everglow is aware of how that sounds."), Sunderglass Penitent ("Security has filed this under 'surrender.'"), the Preserve (original: "Humane Relocation Preserve: a forever home!"; "very peaceful, and very quiet"; its small print: "For safety, its fencing faces inward."), and Ves'thara's first entry, Everglow's, over her `touched` portrait ("Ves'thara is not known to Everglow." … "Witnesses are reminded that it did not happen."). The Prism Spire's entry (A2M6's line) unlocks with the gift.
- *Memo after:* `memo_a2_06` *Long Night Readiness: Stay Positive!* Sterling's one real-looking favour: "Goldie's shelter request? APPROVED! Concrete's on me, Four-Forty-Seven. Stay cozy!" (small print: "Shelter costs deducted from colonist wages in 48 easy installments.") The shelters are where A3M4 is fought. Above it, the pilot "was a real learning experience! Everyone who reached the Preserve is settling in. It's very peaceful out there."

**Medals.** Victory · Perfect (no refugee lost) · **Kneel:** force the pivot by breaking the Penitent to 50% before W6 starts.
**Rewards.** Stardust 240 · Intel 3. Prism Spire. Mindspike and Lantern attunable.
**Par build.** Zapcoil, Lookout, Rivet, Thumper, on the reference profile ([../campaign.md §4.9](../campaign.md#49-shop-stock-and-the-reference-profile): A2M4's; C2 Return emptied the bank). Zapcoils in both hairpins and on the knoll with the Lookout between row 4 and the valley floor, so every Veilwalker is Revealed where the Zapcoils reach it and the Cantor columns die in the turns; a Rivet west of the drop. The Penitent's shield breaks in W5 and the Lookout reveals her shards, but she re-forms once and W6 forces the pivot (no Kneel). After it, Thumpers south of the valley floor and beside the drop to the gate for the Motes; par leaves the rig road's junction to the hairpins' Zapcoils, and that is where it loses its refugees. Each step runs in the build phase before its wave, as soon as it's affordable; the data is [`src/content/maps/a2_m05/builds.ts`](../../../src/content/maps/a2_m05/builds.ts).

| Wave | Par |
|---|---|
| W1 | Zapcoils (5,3) between the first hairpin's legs, (6,6) on the knoll, (7,2) by the fencing's end |
| W2 | Lookout (4,5) between row 4 and the valley floor; the first-hairpin Zapcoil to T2 |
| W3 | The knoll Zapcoil to T2; Zapcoil (2,2) inside the first turn |
| W4 | Zapcoil (8,6); the fencing's-end Zapcoil to T2 |
| W5 | Rivet (1,5) west of the drop; the first-turn Zapcoil to T2 |
| W6 | Thumpers (9,8) south of the valley floor and (13,8) beside the drop to the gate |
| W7 | The valley Thumper to T2 |
| W8 | The gate Thumper to T2 |
| W9 | The Rivet to T2 |
| W10 | The valley Thumper to T3 |
| W11 | The gate Thumper to T3 |

Par's bank at each build phase: 627, 285, 201, 99, 123, 48, 54, 23, 19, 41, 49, 13 (W1–W12). **Par wins at 25/36 Evacuated (69.4%)** on every seed (campaign.md §7's target 71, the nearest 1/36 step below it; the Escort chain's first map, band 65–85), the core whole at the pivot, its eleven refugees lost at the rig road's junction (4 in W8, 4 in W11, 3 in W12).

**No-counter builds** (`noCounterBuilds`, by category; each must lose by W8, the default, and still lose with the full catalog):
- **no-detection:** Zapcoil, Rivet, Thumper, Sprinkler (no Lookout, and no Scanner Sweep: slot 1 stays the profile's Orbital Strike), par's hairpins blind: the Veilwalkers walk through (W2–W4); it loses in W4 (W5 with the full catalog), before the pivot.
- **no-shield:** Lookout, Rivet, Thumper, Skyhook (no Energy, no Soaked): the Cantor columns walk through (W2, W4); it loses in W4, before the pivot.
- **no-splash:** Lookout, Rivet, Sprinkler (Soaked), Skyhook (no Zapcoil or Thumper): without the Zapcoils' chains it can't hold the Cantor columns either, and loses in W4, well before the post-pivot Motes would test it.

**Alt builds** (each shares at most 2 towers with par and must win with ≥ 20%; every alt needs the Lookout, the only detector the reference owns, and the Zapcoil, the shield answer that holds the Cantor columns):
- `capacitor`, Lookout + Zapcoil + Sprinkler + Skyhook (T501c): par's hairpins, then from the pivot a Sprinkler and a Zapcoil guarding the rig road's junction, the Zapcoil a **Capacitor Bank** from W9. The reference can't afford a Capacitor (755 credits) before the Penitent without losing W4, so it serves the escort. **94.4.**
- `coil_and_hook`, Lookout + Zapcoil + Skyhook: Zapcoils take the Motes, and from W8 an Overload Coil guards the rig road. **86.1.**
- The planned Sprinkler (Soaked) alt (Lookout + Sprinkler + Thumper + Skyhook) can't hold W2's and W4's Cantor columns: the Soak lets the shells bite, but too slowly under the aura.

**Harness runs** (seed 1; margin, then refugees lost per wave):

| Run | Result | Lost |
|---|---|---|
| par | wins at **69.4** (25/36), core 21/21, no Kneel | 4 in W8, 4 in W11, 3 in W12 |
| `alwaysCallEarly` | 63.9 (the pivot at the Penitent's spawn) | |
| no-detection | loses in W4 (W5 with the full catalog) | |
| no-shield | loses in W4 (W4 with the full catalog) | |
| no-splash | loses in W4 (W4 with the full catalog) | |
| Story | 83.3, Victory | 4 in W11, 2 in W12 |
| `capacitor` | 94.4 | 2 in W12 |
| `coil_and_hook` | 86.1 | 1 in W6, 4 in W8 |
| do-nothing | loses at W3 | |

Par runs about 10.1 min at 1× and so do both alts (Story 12.7): **the median 1× runtime is 10.1 min**, well under the 15-minute split trigger (§1 of campaign.md). **The beats** ([`src/balance/a2m5.test.ts`](../../../src/balance/a2m5.test.ts)): in par, both alts, and Story, the Penitent's cue plays as she spawns in W5, her shield breaks in W5 (the shield cue the tick after, the shards, then a re-form), and exactly one pivot event runs, the forced one, as W6 starts, mid-fight with her on the road (one pivot cue, one objective switch); the first group walks from the pivot, before the surge's first Mote; a retry from the W5 checkpoint (before the pivot) and the W10 checkpoint (after it) replays to the same state and end. Robustness: with every post-pivot Mote group shifted ±0.2 s together, par holds at 25/36 and every beat holds (±0.5 s keeps par in the band; 1 s earlier drops it to 63.9). **Kneel** is the skill medal: no build the reference economy affords reaches 50% before W6 (par's Penitent kneels at 3296 of 3500 HP); it takes breaking the shield early, killing the shards inside the 4 s re-form, and 1,750 HP besides.

## A2M6 · Sundown

*The first Hollow assault on the colony itself. Everyone on the wall. The sun goes down.*

- **Facts:** Colony perimeter (north wall) · `act2.dusk` with the **Sundown** lighting modifier (full Long Night darkness by W12) · Defend (core: the dome cluster where Pebble sleeps) · 18×12, 16 buildable · 14 waves · 550 credits · two ground spawns + one air lane · companion Ves'thara (Stillness) · Bricks ally post on the wall · Technician Orbital Strike.
- **Story purpose:** Pays the alliance; Ves'thara's mother; plants QUILL's directives; the sun sets. No Skitterkin enemies: they are inside the domes now, and the results line shows the same number as last map. **Target: togetherness against the dark.**

**Layout.** Two roads come down from the Spires and meet the wall at two gates that merge inside, ending at Goldie's dome cluster. The air lane crosses the wall diagonally. Pads sit on the wall walk; one high ground is the old watchtower. Lamps along the wall are light sources in the darkness overlay; they stay on. **Prism Spire's beam pushes the darkness back**, so towers near a Prism keep their full range ([maps.md §5.1](../../design/maps.md#51-layout-and-event-modifiers)). Through a dome window, a small shape sleeps in the lettuce.

**Waves.** 1 Motes · 2 Motes, both roads · 3 Fractures ×2 [T: Hollow splitting; splash at the death point] · 4 Mote clusters · 5 Rift Moths ×3 [T: phasing; burst; Stillness, Prism] · 6 Fractures + Motes [X] · 7 both roads · 8 Rift Moths + Fractures · 9 Rift Moth flock [X] · 10 big mixed · 11 surge, west road · 12 surge, east road (full dark) · 13 both · 14 everything.

**Story delivery.**
- *Briefing:* Ves'thara: "Tonight I fight beside the Old Soldier. Do not make me regret it, Thorn." · QUILL (threat intel): "Splitting shapes and flickering flyers. And then the sun goes down."
- *Radio:*
  - w02 Ves'thara: "It is not hungry. It is lonely. When you are dead, those are the same thing."
  - w04 Pebble (from the dome): "Keep 'em off the perimeter!"
  - w06 Bricks: "Everybody on the wall. Even the fancy one." · Ves'thara: "I heard that."
  - w09 Sterling (her moment of fear): "Do you know what happens to people who miss targets, Four-Forty-Seven? Neither do I. Nobody's ever seen one."
  - w12 (full dark) Goldie: "Lights out in Dome 3. Pebble's asleep in the butterheads. Don't let anything wake her." · QUILL: "Knock knock. ...I've forgotten the rest. That's never happened before."
- *Barks:* Ves'thara `tower_built` (the first Prism after W8): "Build the Spire there. I will hold the light." · Ves'thara `new_enemy` fracture: "It breaks. It does not end. Remember that." · Ves'thara `perfect_wave`: "Good. Again."
- *Debrief (Ves'thara's mother):* Ves'thara: "Rig Nine bored into the oldest chamber. The Watch sang our dead there. My mother, Ishael, among them." · Ves'thara: "She is in it now. In the shapes we broke tonight. I have been fighting for her for three years." · Bricks: (silence, 2 s) "...I'm sorry." · Ves'thara: "Do not be sorry, Old Soldier. Be awake."
- *Base scene* `base_a2_loophole` (QUILL's partial confession, its own scene): QUILL: "There are things I am not permitted to tell you. I am permitted to tell you that. It's a loophole. I found it myself."
- *Base vignette* `base_a2_whistle`: Bricks tries to teach Pebble to whistle. She can't. She hums instead: a low family hum, not the jingle.
- *Codex:* Fracture, Rift Moth, Prism Spire (Everglow's asset register: "Everglow thanks the donor, who does not exist."), the Long Night ("Too dark" in its photo frame; "Remember: a clean perimeter."). Once Sundown is won, **Ves'thara's margin notes** appear on earlier entries: each a `margin` version, "[In the margin, in Ves'thara's hand: …]", shown under the record and under QUILL's note where there is one ([style-guide §6.2](../style-guide.md#62-codex-entries)): the Brood Hauler ("They are carrying their children away from what you made."), the Hushed ("They do not answer because it took the answer. Sit with them anyway. Say their names."), the Glass Witch ("Not sad. Awake. I have been awake for three years."), lumenglass ("It hums because it was sung. It stops when no one sings it again."), and the Aelari ("We are known to you. The Watch wrote to you in 2355. No one wrote back."). The texts are in [`src/content/codex/act2.ts`](../../../src/content/codex/act2.ts).
- *Memo after:* none from Sterling. The PA's shift-change jingle plays once over the dark, in minor.

**Medals.** Victory · Perfect Core · **Before the Dark:** no leaks in the last three waves.
**Rewards.** Stardust 260 · Intel 3.
**Par build.** Prism, Thumper (Cluster), Skyhook, Rivet. Thumper ×2 at the inner merge for Fracture splits; Skyhook ×2 under the air lane; Prism on the watchtower, holding the light over the merge for the late surges. Stillness on Rift Moth flocks. Target 68. **Alt builds:** Prism + Thumper + Zapcoil + Sprinkler (Cloudburst); Rivet + Skyhook + Zapcoil + Lookout. `noCounterBuilds`: **no-splash**, Prism + Rivet + Skyhook + Sprinkler, no Thumper or Zapcoil (must lose by W9 to Fracture children); **no-air**, Thumper (Cluster) + Sprinkler (no Cloudburst) + Lookout, nothing in reach of the air lane (must lose by W10).
