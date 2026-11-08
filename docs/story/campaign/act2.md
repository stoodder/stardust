# Campaign, Act II: First Contact

The six Act II maps, A2M1–A2M6, during the Long Dusk. The campaign overview, introduction schedule, flag ledger, and pacing check are in [../campaign.md](../campaign.md); the entry format is described at the top of [act1.md](act1.md).

**Act II presentation from A2M1:** results line `Pests processed: {n}.` (no star), loading tips "Remember: a clean perimeter.", Evie billboards `peeling`, Skitterkin deaths without confetti, Tidybots still on. Sterling gets at least one between-wave line on every Act II map, and Pebble and Bricks share at least one exchange on every map from A2M3 to A3M3.

**Fleeing Skitterkin (summary).** From A2M1 every Skitterkin enemy group is Skittish and `fleeing`: it leaks for 0, is medal-exempt, pays a bounty of 1, and a Hollow unit that hushes one turns Heavy. The rules live in [enemies.md § Fleeing Skitterkin](../../design/enemies.md#fleeing-skitterkin) and [§ The hush rule](../../design/enemies.md#the-hush-rule); the [Spare runners](../../design/core-loop.md#spare-runners) filter (Alt+H) keeps towers from picking them.

**Checkpoints from Act II:** a loss offers "Retry from wave N" at the last 5-wave snapshot; using one forfeits Perfect and Challenge medals for that run ([core-loop.md](../../design/core-loop.md)).

---

## A2M1 · Rig Nine

*Rig Nine stopped answering. Go take a peek. Minor operational hiccup!*

- **Facts:** The Diggings · `act2.gold` · Defend · 18×12, 13 buildable (2 high ground on canyon ledges, 1 stardust-conduit power node) + 2 "crew log" wreckage · 10 waves · 420 credits · two spawns (the Spires road for Skitterkin; Rig Nine's bore mouth for the Hollow) · companion Bricks · Technician Orbital Strike.
- **Story purpose:** Pay the stinger; plant hushing and "they're running from it" without anyone saying so. **Target: curiosity curdling to unease.** First Hollow, first mixed waves, first fleeing groups.

**Layout.** Two northern entries (road north-west, bore mouth north-east) merge mid-map and run south through the rig yard to the outpost lift (core). Broken mining rigs are the wreckage; two are marked "crew logs." The hushed crew sit outside their hut (decor) beside the path, staring at nothing, unharmed and unreachable by anything. The north-east edge (toward the Halls) is visibly darker than the rest.

**Waves.** 1 Nibblers + Zoomers, fleeing [T: Skittish; nothing follows them yet] · 2 Puffwings + Diggers, fleeing · 3 a fleeing group, then Motes ×6 behind it on the same road [T: Mote; the hush and the **Heavy** tell] · 4 Haulers fleeing + Motes ×8 [X: shoot the Hollow, not the runners] · 5 an Elder with younglings + Motes · 6 Mote cluster ×12 [X: splash] · 7 Bunchlings fleeing + Motes, both roads · 8 mixed · 9 Motes ×20 from the bore [X] · 10 everything, both roads.

**Story delivery.**
- *Briefing:* Sterling: "Minor operational hiccup at Rig Nine! Super minor. Hiccup-sized. Go take a peek, Four-Forty-Seven!" · Bricks: "Rig crew's been quiet four days. Quiet's not a status, Sprout. Quiet's a symptom." · QUILL (the filter, before W1): "Firmware update! New filter: Spare runners, Alt+H. Runners pay one credit now. Not worth the ammo!"
- *Radio:*
  - w02 QUILL: "They're moving faster than usual. And they keep looking back. Logging it."
  - w04 Bricks (crew found): "They're breathing. They just don't know their names. Sweet moons."
  - w06 QUILL (log recovered, or here if not): "The crew called it 'the hollow.' Lower case. I don't know why that's worse."
  - w07 Sterling: "Love the field report! I'm calling it a hiccup in my report too. Consistency!"
  - w08 Bricks: "Three hundred ninety-six days. Saying it out loud. Helps."
- *Barks:* QUILL `skitterkin_killed_ahead`: "That one was running. From it." · QUILL `skitterkin_hushed` (the first hush on a map): "It caught one. It's heavier now. Faster. ...Logging it." · QUILL `new_enemy` mote: "Unknown signature. It isn't on any list. I've checked every list." · Bricks `wave_cleared`: "Jingle sounds different out here." (A2M4 makes it minor; here it only *feels* off.)
- *Codex:* Mote (original: "Rig Nine Atmospheric Event. Not dangerous! [REDACTED]"), Rig Nine, the Diggings, "Hushed" (wellness-event classification).
- *Memo after:* `memo_a2_01` *Rig Nine: A Minor Operational Hiccup!* (small print: "Rig crew wellness events are covered under Plan B.")

**Medals.** Victory · Perfect Core · **Hiccup Contained:** no Hollow unit leaks. **Objective Intel +1, Crew Logs:** clear both log wreckage tiles (unlocks the crew-log codex entry).
**Rewards.** Stardust 180 · Intel 3 (+1).
**Par build.** Rivet, Thumper, Sprinkler (Cloudburst not yet), Zapcoil. Thumper ×2 + Sprinkler at the merge; Zapcoil chains for clusters; Rivet on a ledge. Par uses plain targeting (it shoots any runner its priorities pick) and kills Motes before they reach the runners; the harness's `spareFleeing` run is par with Spare runners on for every tower, and must end within 5 points of it. Target 82 (re-baselines after the boss). **Alt builds:** Thumper + Zapcoil + Skyhook + Lookout; Thumper + Rivet + Skyhook + Lookout. `noCounterBuilds`: **no-splash**, Rivet + Sprinkler + Skyhook + Lookout, no Thumper or Zapcoil (must lose by W7).

## A2M2 · The Glass Witch

*Someone is shattering the extraction rigs, and only the rigs.*

- **Facts:** Ridge Rigs · `act2.gold` · **Protect the asset** (two extraction rigs on the rig branch, own integrity 10) · 18×12, 14 buildable (2 Aelari thread-glass outcrops as high ground, 1 conduit node) · 11 waves · 450 credits · main road (fleeing Skitterkin and Motes to the ridge relay core) + rig branch (Aelari to the rigs) · companion QUILL (Time Dilation) · Technician Orbital Strike.
- **Story purpose:** Ves'thara's first appearance, her targets, her grievance, the C1 variant line; the callsign **Thorn**. QUILL as companion on the map where you defend rigs is the fair-play joke: its "(Per policy.)" suggestions are, for once, correct. **Target: intrigue; the first voice that refuses to joke.**

**Layout.** The main road runs north to south along a ridge. At the top a branch peels east along a ledge to Rigs 7 and 8 at the map's east edge. Aelari constructs only ever take the branch. Habitat domes sit untouched on the west side all map; the camera frames them so the player can notice she never goes near them.

**Waves.** 1 Skitterkin, fleeing · 2 Glimmers ×4 on the branch [T: shields; Zapcoil] · 3 fleeing Skitterkin + Motes · 4 Glimmers ×8 + Skitterkin [X] · 5 Glimmer column + Motes [X] · 6 Mote cluster + fleeing Haulers · 7 Glimmers + Motes · 8 mixed, both routes · 9 Glimmers + Motes · 10 big mixed · 11 **the Glass Witch** on the branch (shield pulse; blink from 70%; in-stage cue at 70%; `retreat` at 40%, which resolves the wave and wins the map).

**Story delivery.**
- *Briefing:* Sterling: "Vandalism at the ridge rigs! That's the word. Vandalism. Write it on everything!" · QUILL (threat intel): "Shielded signatures. Your Zapcoil was free. It is about to earn it."
- *Radio:*
  - w03 QUILL: "Rig integrity is my top priority. (Per policy.) Your integrity is also a priority. A close second."
  - w06 Bricks (cue): "Whoever it is, they're not touching the domes. Not once. That's a choice."
  - w09 Sterling: "Insurers say 'vandalism.' Legal says 'vandalism.' So it's vandalism. Super!"
- *Boss cues:* at spawn, if `spared_quiet_wave`: Ves'thara: "You let the small ones walk, once. I saw. It is why I have not struck you." · At 70%: "You are the Counter. {pests_processed}. I have watched you count." · At 55%: "I do not strike your homes, Counter. Look at what I strike. Ask yourself why it bleeds light." · At retreat: "Keep shooting. You are very good at it. That has never been the question."
- *Barks:* QUILL `perfect_wave`: "Both rigs intact! (Per policy.) Also, you're intact. Also good." · QUILL `new_enemy` glimmer: "Shielded! Energy breaks shields. Zapcoils are energy. You see where I'm going."
- *Debrief:* Bricks: "Sprout's grown some thorns. Thorn. That's you now. Don't let it go to your head." (callsign → Thorn).
- *Codex:* Glimmer, the Glass Witch (original: "Unidentified vandal. Probably sad! Report sightings to Security."), lumenglass ("woven glass, origin unknown, humming"), Aelari (heavily redacted).
- *Memo after:* `memo_a2_02` *Re: Incident 2361-A. Please Use "Vandalism" in All Correspondence!*, plus a KFA form (`kfa`): *First Contact Incident 2361-A, filed, pending.*

**Medals.** Victory · Perfect (core and rigs undamaged) · **Glass Half Empty:** force her retreat before she blinks three times.
**Rewards.** Stardust 195 · Intel 3.
**Par build.** Zapcoil, Sprinkler (Cloudburst), Thumper, Rivet. Zapcoil ×2 + Sprinkler adjacent (Conductive, Soaked) on the branch ledge; Thumper + Rivet on the main road (Crossfire). Time Dilation and Orbital Strike on the Witch after her first pulse. Target 79. **Alt builds:** Zapcoil + Rivet + Skyhook + Lookout; Sprinkler (Soaked) + Thumper + Skyhook + Lookout (Kinetic and Explosive into Soaked shields). `noCounterBuilds`: **no-shield**, Thumper + Rivet + Skyhook + Lookout, no Energy and no Soaked (must lose by W8); **no-splash**, Rivet + Sprinkler (Soaked) + Skyhook + Lookout, no Thumper or Zapcoil (the Mote clusters; must lose by W8).

## A2M3 · Second Look

*The terraces again, at dusk. Same road. Everything on it is running south.*

- **Facts:** The Terraces at dusk · `act2.gold` → `act2.dusk` across the waves · Defend · **revisit of A1M2**, 18×12 with A1M2's 14×10 centred (offset 2, 1); the new band holds a strip mine on the east · 15 buildable (A1M2's 11, unchanged, plus 4 on the strip-mine benches) · 11 waves · 460 credits · air lane over the strip mine · companion Bricks · Technician Orbital Strike.
- **Story purpose:** **Where the player understands** (twist layer 1, by sight). The Haulers' cargo is visible; Pebble at the Peeker's rock, rescued by the player's own click; QUILL's first disobedience; the pension voided. **Target: recognition. Not darkness: seeing.** Threat novelty stays modest (two shield variants) so the player has room to look.

**Layout and revisit dressing.** The same switchbacks and pump station as A1M2. Grey mining cuts slice across two terraces (through decor, never a pad); exposed warrens with eggs line the path; the soil is grey-streaked; Rig 3 is now a strip mine filling the east band, where Ves'thara's constructs strike. The scarecrow still stands on Terrace 2, badge faded, while everything streams past him. The Peeker's rock is still at the warren mouth; from W5 it holds Pebble and shows the clickable highlight ([core-loop.md §6.9](../../design/core-loop.md#69-the-peeker)). Skitterkin glance backward as they run. Evie billboard peeling.

**Waves.** 1 Skitterkin families with younglings in tow, fleeing · 2 Glimmers on the strip mine · 3 Haulers fleeing (sacks visibly young) · 4 one Weft Warden + Glimmers [T: heavy shield; Soaked + Zapcoil] · 5 fleeing Skitterkin + Motes [the rock lights up] · 6 Lightwings ×4 over the strip mine [T: flying shields] · 7 Wardens ×2 + Lightwings [X] · 8 Elders with younglings + Motes · 9 big Aelari wave · 10 Hollow push, both routes · 11 everything.

**Story delivery.**
- *Briefing:* Bricks: "Same terraces. Different day. Keep your eyes on the path, Thorn."
- *Radio:*
  - w02 Bricks: "Don't look at the eggs, Thorn. Look at the path. ...I said look at the path."
  - w04 QUILL: "Per policy, I am required to classify those as 'cargo.' I would like the record to show that I hesitated."
  - w06 Sterling: "Love the thoroughness, Four-Forty-Seven! Maybe a little less looking, a little more processing?"
  - w07 (after the rescue) Bricks: "You keep following me. Pebble. That's you. It's a rock thing." · QUILL: "Naming a pest violates Handbook Section 12.4. ...I've decided not to log it. I don't know why I said that out loud."
  - w09 Goldie: "There's grey creeping into Dome 3's soil. Plants know when something's wrong. People take longer."
- *Rescue cue* `a2_m03_cue_pebble` (player-triggered by clicking the rock; fallback when W6 is cleared; a brief pause): Pebble: "(squeak)" · Bricks: "Small Fry. On your own? ...Pocket's got room. Just till we find her folks." · Pebble: "(squeak, smaller)"
- *Barks:* Bricks `not_firing`: "...You okay, Thorn?" · Bricks `wave_cleared` (after the rescue): "She's not a pest, she's a passenger. Don't make it weird." · QUILL `skitterkin_killed_ahead`: "Logged. ...I'm logging the small ones separately now."
- *Codex:* annotations begin. Brood Hauler annotated (QUILL's half), Weft Warden, Lightwing, a "Pebble" entry QUILL refuses to file ("Entry withheld.").
- *Debrief:* Bricks reads the memo: "'Pension Restructuring Opportunity.' Nineteen years, restructured into a coupon. Ha."
- *Memo after:* `memo_a2_03` *Pension Restructuring Opportunity!* (to Okonkwo, cc you).

**Medals.** Victory · Perfect Core · **Clear Skies:** no Lightwing leaks. (No medal rewards or punishes sparing anyone.)
**Rewards.** Stardust 210 · Intel 3. **Sets** `held_fire_second_look` when at least 50% of the map's `fleeing` units leaked **and** plain Hold Fire was used at least once; the Spare runners filter alone doesn't count ([core-loop.md §2.7](../../design/core-loop.md#27-hold-fire)).
**Par build.** Zapcoil, Sprinkler (Cloudburst), Rivet, Skyhook. Zapcoil + Sprinkler on the pump station (Conductive, Soaked for the Wardens); Zapcoil + Rivet + Skyhook under the air lane. Target 77. **Alt builds:** Zapcoil + Thumper + Lookout (Zapcoil ×3 for shields and air); Sprinkler (Soaked) + Zapcoil + Thumper + Lookout (one Zapcoil on the Wardens and the Lightwings, Thumper into Soaked shields). `noCounterBuilds`: **no-shield**, Rivet + Thumper + Skyhook + Lookout, no Energy and no Soaked (must lose by W8); **no-air**, Zapcoil + Sprinkler (no Cloudburst) + Thumper + Lookout, none of them in reach of the air lane (must lose by W8); **no-splash**, Rivet + Sprinkler (Soaked) + Skyhook + Lookout, no Zapcoil or Thumper (must lose by W8).

## A2M4 · Second Harvest

*Kip's new plant smells like burnt sugar. The Tidybots unload here. Ask Zibzab where stardust comes from.*

- **Facts:** Reclamation Facility 2 · `act2.dusk` · Defend (the plant's control core) · 18×12, 15 buildable (2 catwalk high ground, 1 conduit node) + intake wreckage · 12 waves · 480 credits · one road through the intake yard plus an air lane over the vats · companion Zibzab (Clearance Sale) · Technician Orbital Strike or Scanner Sweep.
- **Story purpose:** **The midpoint** (twist layer 2, told plainly by Zibzab). Pays the Tidybots, the counter, the currency, the early ask. You keep defending the plant after you know, because the Hollow is drawn to the vats, and the last killable Skitterkin of the campaign are in the waves after the truth. **Target: "I know, and I'm still doing it."**

**Layout.** The road enters north, loops through the intake yard past Intake B (where Tidybots unload after every wave, in full view), and ends at the control core in the south. The big vats glow **violet** (unsung) in the middle of the map; natural seams on the north cliff glow gold. Ves'thara's scouts walk the same road toward the core: she is learning this as you are. A3M5 revisits this map: the vats, Intake B, and the control core are the landmarks.

**Waves.** 1 Skitterkin, fleeing · 2 Motes drawn toward the vats · 3 Veilwalkers ×2 [T: cloak; Lookout, Scanner Sweep] · 4 fleeing Skitterkin + Motes · *(cue: the truth scene)* · 5 Mote cluster · 6 Blinkstriders ×3 [T: blink; depth placement] · 7 Veilwalkers + Glimmers [X] · 8 Lightwings + Wardens · 9 Blinkstriders + Veilwalkers [X] · 10 Hollow surge at the vats, with fleeing Skitterkin ahead · 11 cloak + blink mixed [X] · 12 everything.

**Story delivery.**
- *Briefing (the tour):* Kip: "Promoted! Reclamation Lead. Big vats, great benefits. Smells like burnt sugar, honestly. You get used to it." · Kip: "Youngest Reclamation Lead ever. Also the first ever. A record's a record." · Kip: "So the intake goes to the vats, and the vats—" · QUILL (`policy`): "(Per policy.) Reclamation details are confidential." · QUILL (the surprise hint): "Something under the vats is listening."
- *Full-screen scene* `a2_m04_scene_truth` (after W4): the player asks Zibzab.
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
- *Debrief:* Sterling: "Reclamation is a sustainability initiative, Four-Forty-Seven! Nothing on Tumble IV goes to waste. Isn't that beautiful?" · then "Let's call it the Humane Relocation Pilot. My budget, my risk. Just trust me, okay?" Then **C2**, Zibzab's offer (the options are in [../campaign.md §6.1](../campaign.md#61-the-choices)):
  - Zibzab: "Price first. Two offers. I sell your stardust at market. Or I carry it home, at cost, plus my fee."
  - Zibzab: "Neither one is wrong. The dead don't mind being useful. They mind being forgotten."
- *Base:* Bricks hands Pebble over at Dome 3: "She's yours tonight, Goldie. She bites." · Pebble: "(squeak) Only a little." · Goldie takes her in: "She can sleep in the butterheads. She doesn't eat them. She just... sits in them. Like a little egg."
- *Codex:* Second Harvest (original: "A sustainability success story!"), Veilwalker, Blinkstrider, Tidybot annotated, Stardust annotated, Kip Act II portrait.
- *Memo after:* `memo_a2_05` *Humane Relocation Pilot: Next Steps!* (small print: "Preserve capacity planned per Protocol BP-2359.")

**Medals.** Victory · Perfect Core · **Nothing Unseen:** every Veilwalker is revealed before it passes Intake B. **Objective Intel +1, Intake Manifest:** clear the intake wreckage (unlocks the manifest codex entry: tonnages, no names).
**Rewards.** Stardust 225, plus the 400 Q3 Bonus on the results screen · Intel 3 (+1) · C2 Sell adds 3–8 Intel ([progression.md §2.1](../../design/progression.md#21-story-hooks)).
**Par build.** Lookout, Rivet, Zapcoil (Overload; its specs are bought just before this map), Sprinkler. Lookout + Rivet adjacent (Overwatch) at the yard entrance; Zapcoil (Overload) at the vats for the Mote clusters; Rivet + Zapcoil deep on the route so blinkers land in fire. Target 74. **Alt builds:** Lookout + Zapcoil + Skyhook + Thumper; Lookout + Sprinkler (Soaked) + Skyhook + Thumper. `noCounterBuilds`: **no-detection**, Rivet + Zapcoil + Sprinkler + Thumper, no Lookout and no Scanner Sweep (must lose by W8); **no-shield**, Lookout + Rivet + Thumper + Skyhook, no Energy and no Soaked (must lose by W8); **no-splash**, Lookout + Rivet + Sprinkler (Soaked) + Skyhook, no Zapcoil or Thumper (must lose by W8).

## A2M5 · The Long Walk

*Ves'thara comes for the Preserve Road in a glass giant. Then the Hollow comes for everyone on it.*

- **Facts:** Preserve Road · `act2.dusk` · **Defend → Escort pivot** · 18×12, 15 buildable · 12 waves (5 before the pivot, 7 after) · 500 credits · one road to the Preserve gate (the core before the pivot, the **safe exit** after), plus a Hollow spawn on the rig road that opens at the pivot · companion Bricks · Technician Orbital Strike.
- **Story purpose:** **Ves'thara's turn:** a boss fight with arguing, a Hollow surge, her shield and her Hollow-touch, the escort, "Not there. Never there." **Target: alliance under fire, and a wrong place to go.** Busiest story map in Act II; the escort is taught gently here and tested in A3M1.

**Layout.** A long road from the north-west to the Preserve gate in the south-east, between Everglow relocation fencing. Before the pivot the core is the relocation checkpoint at the gate. At the pivot the Penitent kneels mid-road and becomes the **Ward** ally; refugee groups (6 each, walking 0.7 tiles/s) start from the north-west and walk to the gate. Behind the gate, the Preserve's fenced basin is visible and too quiet.

**Waves.** 1 Glimmers + one Aegis Cantor [T: shield aura; kill it first] · 2 Wardens + Cantor [X] · 3 Blinkstriders + Veilwalkers [C] · 4 Lightwings + Cantors [X] · 5 **Sunderglass Penitent** (shield wall, recharge pulse; cloaked shards when its shield breaks; `pivot` at 50% or when W6 starts) · *pivot:* Aelari stand down, objective becomes Escort, meter relabels **Evacuated** · 6 the surge: Motes ×12 from the rig road toward the first refugee group [T: escort, gently; generous `maxLost`] · 7 Motes + second group · 8 Mote clusters from both ends · 9 larger Mote clusters, one ahead of the group · 10 Motes ×20 · 11 two groups at once · 12 last group + the largest surge.

**Story delivery.**
- *Briefing:* Bricks: "Relocation pilot. We walk 'em to the Preserve. Sterling's budget, Sterling's risk." · QUILL (pivot foreshadow): "Hollow readings rising behind the rig road. They may arrive during the engagement."
- *Boss cues:* Ves'thara: "Everglow builds a road to a pen and calls it relocation. I will break the road." · Ves'thara (shield breaks): "You count them, Counter. I carry them. One of us will have to stop." · Bricks: "She's not wrong about the road, Thorn. Doesn't mean she gets it."
- *Pivot cue* `a2_m05_cue_pivot` (brief pause): Ves'thara: "Run, small ones. I will be the wall. Counter, if you have ever been sorry, be sorry now, and help me." · PA (Everglow Ops): "Mixed hostile contact. Area clearance authorized." · Bricks: "Radio's bad. Can't hear the order. Funny, that. Get those little ones moving."
- *Radio:*
  - w08 QUILL: "Evacuated is a number I like. I don't know if I'm allowed to like numbers."
  - w10 Sterling: "Love the initiative! The Preserve has plenty of room. Plenty!"
  - w11 Bricks: "Pebble's in my pocket. Don't tell Goldie. She thinks it's unsanitary." · Pebble: "(squeak) I am very sanitary."
- *Barks:* Bricks `ally_hushed`: "Lost one. Keep the rest moving." · QUILL `low_integrity`: "Too many. Too many on the road."
- *Debrief:* Ves'thara, her threads fraying grey at the wrist: "Not there. Never there." · Bricks: "Then where?" · (silence, 2 s) · Ves'thara gives Prism Spire; R&D's Xenotech branch opens under her.
- *Codex:* Aegis Cantor, Sunderglass Penitent, the Preserve (original: "Humane Relocation Preserve: a forever home!"), Ves'thara (first entry).
- *Memo after:* `memo_a2_06` *Long Night Readiness: Stay Positive!* Sterling's one real-looking favour: "Goldie's shelter request? APPROVED! Concrete's on me, Four-Forty-Seven. Stay cozy!" (small print: "Shelter costs deducted from colonist wages in 48 easy installments.") The shelters are where A3M4 is fought.

**Medals.** Victory · Perfect (no refugee lost) · **Kneel:** force the pivot by breaking the Penitent to 50% before W6 starts.
**Rewards.** Stardust 240 · Intel 3. Prism Spire. Mindspike and Lantern attunable.
**Par build.** Zapcoil (Overload), Lookout, Rivet, Thumper. Zapcoil + Lookout mid-road for Cantors and the cloaked shards; Thumper ×2 near the Ward for the Mote surges after the pivot. The Ward's chill does real work; the harness must see it. Target 71 (Evacuated %, on the escort band). **Alt builds:** Lookout + Zapcoil + Sprinkler + Skyhook; Lookout + Sprinkler (Soaked) + Thumper + Skyhook. `noCounterBuilds`: **no-detection**, Zapcoil + Rivet + Thumper + Sprinkler, no Lookout and no Scanner Sweep (the shards keep the shield up; must lose before the pivot or right after); **no-shield**, Lookout + Rivet + Thumper + Skyhook, no Energy and no Soaked (the Cantor waves leak through; must lose by W5); **no-splash**, Lookout + Rivet + Sprinkler (Soaked) + Skyhook, no Zapcoil or Thumper (the post-pivot Mote surges pass `maxLost`; must lose by W8).

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
- *Codex:* Fracture, Rift Moth, Prism Spire, the Long Night; Ves'thara's margin notes appear on earlier entries (Brood Hauler: "They are carrying their children away from what you made.").
- *Memo after:* none from Sterling. The PA's shift-change jingle plays once over the dark, in minor.

**Medals.** Victory · Perfect Core · **Before the Dark:** no leaks in the last three waves.
**Rewards.** Stardust 260 · Intel 3.
**Par build.** Prism, Thumper (Cluster), Skyhook, Rivet. Thumper ×2 at the inner merge for Fracture splits; Skyhook ×2 under the air lane; Prism on the watchtower, holding the light over the merge for the late surges. Stillness on Rift Moth flocks. Target 68. **Alt builds:** Prism + Thumper + Zapcoil + Sprinkler (Cloudburst); Rivet + Skyhook + Zapcoil + Lookout. `noCounterBuilds`: **no-splash**, Prism + Rivet + Skyhook + Sprinkler, no Thumper or Zapcoil (must lose by W9 to Fracture children); **no-air**, Thumper (Cluster) + Sprinkler (no Cloudburst) + Lookout, nothing in reach of the air lane (must lose by W10).
