# Campaign, Act I: Pest Control

The five Act I maps, A1M1–A1M5, during the Long Afternoon. The campaign overview, introduction schedule, flag ledger, and pacing check are in [../campaign.md](../campaign.md). The beats come from [bible.md §6](../bible.md#6-the-arc-act-by-act), the voice rules from [style-guide.md §2](../style-guide.md#2-voice-by-act). Every sample line fits the style guide's limits (dialogue ≤ 120 characters, barks ≤ 80) after worst-case token substitution.

**Entry format** (all four act files): hook · facts · story purpose · layout · waves · story delivery · medals · rewards · par build. Wave lists are themes, not data: **[T]** = teach, **[X]** = test, **[C]** = combine. Radio lines are between-wave scenes (`<map>_wNN`); barks are pool samples keyed to [core-loop.md §6.3](../../design/core-loop.md#63-barks). Each map's threat intel and required counters are in [../campaign.md §4.8](../campaign.md#48-counter-coverage); par margins follow [../campaign.md §7](../campaign.md#7-pacing-check).

**Act I presentation:** results line `PESTS PROCESSED: {n} ★ Top 5% of Technicians!`, loading tips "Remember: a clean perimeter is a happy perimeter!", Evie billboards `beaming`, confetti pops, Tidybots after every wave.

**Joke of the Shift.** On every Act I map one QUILL radio slot is the **Joke of the Shift** ([core-loop.md §6.10](../../design/core-loop.md#610-joke-of-the-shift-and-the-optional-bark-button)): a pre-approved Morale Module joke (QUILL has fifty), told with total sincerity and ending "...That's the joke." Someone fact-checks it: Bricks, except at the audit, where Prim does. Every one is a planted seed in the joke-to-tragedy ledger ([bible.md §8](../bible.md#joke-to-tragedy-ledger)):

| Map | The joke | It pays off |
|---|---|---|
| A1M1 | The lettuce crossing the road ("It was scheduled to") | Pebble's version in A3M4 ("It was going home.") |
| A1M2 | The scarecrow, outstanding in his field (and real, on Terrace 2) | Still standing in A2M3; Pebble's version in Night Shift; QUILL's Purge epilogue card |
| A1M3 | The knock-knock: "Lettuce in, it's cold out here!" (optional **Who's there?** button); Bricks: "It's a dome. It's always twenty-two degrees." | A2M6 (QUILL forgets it); Pebble at the open dome door in A3M6, when it really is cold; "Not Everglow." under C4 Keep |
| A1M4 | The auditor measuring the road ("6.2 meters." Prim: "6.1."); "contractually obligated... not to land one. That's a loophole!" | The A2M6 loophole confession; the Morale Module is Directive 2 (A3M2) |
| A1M5 | "Why did the pest cross the perimeter? It didn't." | The Quiet Wave, the same day, if you let them cross |

---

## A1M1 · Orientation Day

*Your first shift: keep the adorable pests out of the lettuce.*

- **Facts:** Dome Row · `act1` · Defend · 14×10, 10 buildable (1 high ground) · 7 waves · **350 credits**, 25 s countdowns · companion Bricks (Suppressing Fire) + Bricks ally post by the core · Technician Orbital Strike · loadout screen skipped (Rivet + Thumper; `towerUnlockWave: { thumper: 3 }`, so Thumper's build button unlocks when **W3's countdown starts**, the build phase before W3).
- **Story purpose:** Arrival. Plant the counter, the jingle, "Logging it," the north-to-south path, the Tidybots, the Peeker, Goldie and Duchess, and QUILL's Joke of the Shift. **Target: delight.** The player should like everyone by the end of the shift.

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

Dressing: Evie billboards (`beaming`), Goldie's Dome 1 with Duchess in the window, sprinklers ticking, a sign reading "PESTS PROCESSED THIS QUARTER: 38% MORE!"

**Waves.** 1 Nibblers ×6 [T: build] · 2 Nibblers ×10 [T: upgrade; high-ground prompt] · 3 Nibbler clumps ×12 [T: Thumper unlocks, Crossfire] · 4 Zoomers ×4 [T: fast; Suppressing Fire prompt] · 5 Nibblers ×8 + Zoomers ×4 [X; Orbital Strike prompt] · 6 Zoomer rush ×10 [X] · 7 Nibblers ×20 + Zoomers ×8 [X].

**Wave data** (A1M1 is the M1 map, so its waves are fully specified; the data is [`src/content/maps/a1_m01/waves.ts`](../../../src/content/maps/a1_m01/waves.ts)). A **clump** is a group of 4 Nibblers at 0.25 s spacing, with 3 s between one clump's last spawn and the next clump's first (so clumps start 3.75 s apart). Other groups use the enemy's default spacing (Nibbler 0.8 s, Zoomer 0.5 s; [enemies.md §5](../../design/enemies.md#5-roster)). `delaySec` is measured from the wave's start. Every route is the one road; every countdown is the Act I 25 s.

| Wave | Groups (`enemy` ×`count` @ `intervalSec`, `delaySec`) | Total |
|---|---|---|
| W1 | Nibbler ×6 @ 0.8, 0 | 6 |
| W2 | Nibbler ×10 @ 0.8, 0 | 10 |
| W3 | Nibbler ×4 @ 0.25, 0 · ×4 @ 0.25, 3.75 · ×4 @ 0.25, 7.5 | 12 |
| W4 | Zoomer ×4 @ 0.5, 0 | 4 |
| W5 | Nibbler ×4 @ 0.25, 0 · Nibbler ×4 @ 0.25, 3.75 · Zoomer ×4 @ 0.5, 7.5 | 12 |
| W6 | Zoomer ×10 @ 0.5, 0 | 10 |
| W7 | Nibbler ×4 @ 0.25 at 0, 3.75, 7.5, 11.25, and 15.0 (five clumps) · Zoomer ×4 @ 0.5, 5.5 · Zoomer ×4 @ 0.5, 13.0 | 28 |

The W7 Zoomer groups slot into the gaps after the second and fourth clumps. A1M1 has no teach-flagged waves: with no required counters it has no soft enemies to exempt.

**Story delivery.**
- *Before:* character creation (the onboarding form), then memo `memo_a1_00` *WELCOME TO THE GARDENS!* (grants Orbital Strike; small print per [style-guide.md §6.1](../style-guide.md#61-everglow-memos)).
- *Briefing:* QUILL introduces itself; Bricks names you; a choice (earnest / wry / quiet, [characters.md](../characters.md#the-protagonist)'s A1M1 set).
  - QUILL: "Hello, Technician! I'm QUILL, your Quantified Unified Integrated Logistics & Lethality assistant. I love my job!"
  - Bricks: "Name's Okonkwo. Sergeant. I'll call you Sprout, 'cause you're green and you work with lettuce."
  - QUILL (threat intel): "Today's forecast: Nibblers, with a chance of Zoomers!"
- *Radio:*
  - w02 Bricks: "Turrets go on the pads. Bugs go on the path. Nothing goes on the path but bugs and bad decisions."
  - w03 QUILL: "New hardware! Put the mortar beside your Rivet. They like each other. It's called Crossfire!"
  - w04 Goldie: "Oh! You're the new tech! Want to meet Duchess? She's a butterhead. She's shy. Don't look directly at her."
    - (if `arrival_reason = lettuce`, in place of the line above) Goldie: "You're the one who wrote 'lettuce' on the form! I cried. Meet Duchess. She's shy. Don't look directly at her."
  - w05 Bricks: "Fast ones. Lay my Suppressing Fire across the road. That's what it's for."
  - w06 (Joke of the Shift) QUILL: "Time for Joke of the Shift! I'm contractually obligated to tell one. Fifty are pre-approved!" · QUILL: "Why did the lettuce cross the road? It was scheduled to. Logistics Route 4, Tuesdays. ...That's the joke." · Bricks: "It's Wednesday."
  - w07 Bricks: "If that jingle plays one more time I'm filing a grievance. With God. Cc'ing HR."
- *Barks:* QUILL `first_leak` (once per campaign): "Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)" · QUILL `wave_cleared`: "(singing along) Ev-er-glow, Ev-er-glow!" · Bricks `wave_cleared`: "That jingle. Every time." · QUILL `perfect_wave`: "Perfect wave! I'd give you a sticker, but stickers are Tier 2."
- *Debrief:* Bricks: "Not bad, Sprout." · "Don't name things on day one. You get attached." (He names one tomorrow.)
- *Codex:* Nibbler, Zoomer, Rivet, Thumper, Tidybot, Everglow Gardens, Orbital Strike (small print: "Uplink access contingent on Q2 extraction targets").
- *Memo after:* `memo_a1_01` *Q2 Results: Pest Losses Down 38%!* (small print: "Lettuce loss figures pending Accounting review.")

**Medals.** Victory · Perfect Core · **Teamwork Makes the Dream Work™:** win with a Crossfire link active (evaluated at the moment of victory).
**Rewards.** Stardust 0 · Intel 3.
**Par build.** Loadout Rivet + Thumper. Each step runs in the build phase before its wave, as soon as it's affordable ([conventions.md § Balance sims](../../tech/conventions.md#balance-sims-npm-run-sim)); the data is [`src/content/maps/a1_m01/builds.ts`](../../../src/content/maps/a1_m01/builds.ts).

| Wave | Par | Rivet-only (`altBuilds.rivet_only`) |
|---|---|---|
| W1 | Rivet on the greenhouse roof (7,2) | same |
| W2 | Upgrade the roof Rivet to T2 | same |
| W3 | Rivet (10,4), then Thumper (10,5): the Crossfire pair | Rivet (10,4), then Rivet (10,5) |
| W5 | Upgrade the roof Rivet to T3; Orbital Strike on the road's first corner (4,3), 2.4 s into the wave (it lands on the first clump) | same |
| W7 | Thumper (3,5); Orbital Strike on (4,3), 2.4 s in | Rivet (3,5); the same strike |

Orbital Strike on the W5 and W7 clumps; Suppressing Fire on W6. Target margin 95. If every pest dies, the bank at the start of each build phase under par is 350, 292, 270, 113, 165, 95, 179 (W1–W7). So the second Thumper waits for **W7**: with 95 banked before W6, it would become affordable only after about 8 of W6's 10 Zoomers die, too late to matter there. These timings are provisional until T107's balance tuning. **No required counters** ([maps.md §6.4](../../design/maps.md#64-balance-harness)): the tutorial never punishes a player who skips the Thumper, so there are no `noCounterBuilds`, and Splash first becomes required at A1M4. The harness runs: do-nothing loses; par wins inside the band; the **Rivet-only** build wins at a lower margin than par; `alwaysCallEarly`.

**The M1 cut** ([D004](../../decisions.md#d004--2026-11-08--m1-scope-the-m1-cut)). M1 tunes this par **without Crossfire (links), medals, Suppressing Fire, or the Bricks ally**, and re-tunes it when they land. Until T202 the W3 Crossfire teach is cosmetic: QUILL's line plays and nothing links, and the Teamwork medal isn't evaluated. M1's Sprinkler (sim-tested, not placed here) applies **Chilled only**; Soaked is left out until a map needs it.

## A1M2 · Hatching Season

*Big, slow Brood Haulers waddle down the terraces with glittering sacks. High bounty!*

- **Facts:** The Terraces (north slope) · `act1` · Defend · 14×10, 11 buildable (1 high ground irrigation tower, 1 power node pump station) · 8 waves · 300 credits · companion Bricks · Technician Orbital Strike.
- **Story purpose:** Plant the Haulers, the leaderboard, Kip, tower names, the pension, policy placement, and the scarecrow; the Peeker's rock sits at a warren mouth. **Target: delight, with the first pebble in the shoe** (the tiny shapes running *back* from a burst sack).

**Layout.** Long switchbacks down three terraces from a north spawn to a gate core at the south edge. Long and slow by design, so Sprinkler + Thumper shine. The pump station (power node) sits at the second switchback; Extraction Rig 3 (decor) sits beside one pad and the housing block beside another, so QUILL's "(Per policy.)" suggestion is visible. A scarecrow in a faded Everglow cap stands on Terrace 2 (decor) with an *Employee of the Month* badge pinned to it. The Peeker's rock is at a warren mouth halfway down the east side. This is the layout A2M3 revisits: keep the west two-thirds clean of anything Act I–specific so the scars read.

**Waves.** 1 Nibblers · 2 Nibblers + Zoomers [early-call prompt] · 3 Chonks ×2 [T: armor plink; Strong targeting] · 4 Chonks + Nibbler swarm [X; Sitting Ducks] · 5 one Brood Hauler, alone [T] · 6 Zoomer rush + Chonks [X: early call] · 7 Haulers ×2 + Nibblers [X] · 8 Haulers ×3 + Chonks + Zoomers [X].

**Story delivery.**
- *Briefing:* QUILL: "Sensors show something big and sparkly on the terraces. Sparkly is good! Usually!" · Bricks: "Hatching season. Everything's out and about. Keep your eyes on the path, Sprout."
- *Radio:*
  - w02 Kip: "Kip Vandermeer. 'The Exterminator.' Number one on the Bounty Board, three quarters running. Don't get comfy at two."
  - w03 QUILL: "Suggested build site: beside Extraction Rig 3. (Per policy.) The housing block will be fine. Probably!"
  - First `wave_cleared` (name tag) Bricks: "That one's Denise. After my first wife. Keeps her distance, fires on schedule, never calls."
  - w04 (Joke of the Shift) QUILL: "Joke of the Shift! Why did the scarecrow get Employee of the Month? He was outstanding in his field." · QUILL: "That's the joke. He's real, by the way. Terrace 2. He's been out there since 2349. I worry about him." · Bricks: "Fewer complaints than Kip."
  - w05 Kip: "Pro tip: Brood Haulers. Big bounty, slow, never shoot back. I hold the record. 'Most Haulers, Before Lunch.'"
  - w07 Bricks: "Four hundred and twelve days to pension. Then it's me, a hammock, and a planet with zero bugs on it."
- *Barks:* Bricks `enemy_killed` hauler: "Strong targeting on the big ones." · QUILL `enemy_killed` hauler: "Sack ruptured! Glitter everywhere! Tidybots are on it!" · Bricks `tower_sold` (tagged): "You sold Denise. ...Fair. She'd have done the same."
- *Debrief:* Kip: "Nice wave, Sprout! For a two." · Kip: "New record, by the way. 'Most Records Set, Terraces Division.' I made the division." · (if `arrival_reason = bonus`) Kip: "Signing bonus? Me too. Spent it." · The results screen pays Stardust for the first time.
- *Codex:* Chonk, Brood Hauler (original, [style-guide.md §6.2](../style-guide.md#62-codex-entries)), Frostline Sprinkler, Pest Bounty Board, Stardust ("Everglow's premium mineral! Responsibly sourced!"), Rig 3, the Terrace 2 scarecrow ("Employee of the Month, 144 months running").
- *Memo after:* `memo_a1_02` *Introducing the Pest Bounty Board!* (small print: "Bounties funded by Reclamation Facility 2, a sustainability success story!")

**Medals.** Victory · Perfect Core · **Aim for the Sack!:** no Brood Hauler gets past the pump station. (It is in the codex's voice on purpose; its icon stays on the star map for the rest of the game.)
**Rewards.** Stardust 130 · Intel 3.
**Par build.** Rivet, Thumper, Sprinkler (fourth slot empty: the player owns three). Sprinkler on the power node with Thumper adjacent (Sitting Ducks); Rivet T3 on the irrigation tower set to Strong for W5 onward; second Thumper at the bottom switchback. Orbital Strike on each Hauler pair. Target 92. `noCounterBuilds` (one per required counter, by category, [enemies.md §3.1](../../design/enemies.md#31-counter-categories)): **no-armor**, Rivets held below T3 (no pierce) + Sprinkler, no Thumper (light armor's Act I answer), must lose by W6.

## A1M3 · Special Delivery

*Gerald the mail drone flies the path. Gerald is not a pest. Do NOT shoot Gerald.*

- **Facts:** Mail Road · `act1` · Defend; Gerald is a neutral air unit on three passes · 14×10, 11 buildable + 3 wreckage (crashed delivery drones) · 8 waves · 310 credits · companion QUILL (Time Dilation) · Technician Orbital Strike.
- **Story purpose:** Teach Hold Fire as a joke, rehearse the single-button grammar with the knock-knock, bring Bricks's rejected form, deliver Zibzab and the early ask. **Target: slapstick and warmth.** Lowest threat load in Act I, so Hold Fire gets the room.

**Layout.** A straight-ish mail road from a north spawn with one long hairpin; the air lane (dotted) cuts diagonally across the hairpin. Three wreckage tiles are crashed delivery drones in Gerald's livery; one hides a pad near the hairpin. Zibzab's shell-shop clanks onto a decor patch beside the road at W6 and stays as dressing. The Peeker's rock is behind a fallen mailbox.

**Waves.** 1 Nibblers + Gerald pass 1 [T: Hold Fire (all); the button pulses] · 2 Zoomers [salvage-drone prompt] · 3 Puffwings ×4 [T: air lane, Skyhook] · 4 Chonks + Gerald pass 2 [X: hold fire on single towers] · 5 Puffwing flock ×10 [X; Time Dilation prompt] · 6 Haulers + Puffwings · 7 mixed + Gerald pass 3 (carrying the form) · 8 mixed + big flock.

**Story delivery.**
- *Briefing:* QUILL: "Today's route includes Gerald. Gerald is the mail. Gerald has right of way."
- *Radio:*
  - w02 QUILL: "Rerouting Gerald requires Form 88-B. Form 88-B must be delivered by mail. I've asked Gerald." · QUILL (on the wreckage): "Gerald's colleagues. Gerald doesn't like to talk about it."
  - w04 (Joke of the Shift, with the optional **Who's there?** button) QUILL: "Joke of the Shift! It's a knock-knock. Your line is 'Who's there?' There's a button. Knock knock."
    - (pressed) QUILL: "Lettuce. ...Now you say 'Lettuce who.' I'll do it. Lettuce who? Lettuce in, it's cold out here!"
    - (ignored) QUILL: "No answer. I'll log it as 'nobody home.' ...That's also a joke! Two for one."
    - Bricks: "It's a dome. It's always twenty-two degrees."
  - w06 Zibzab (arrival): "Price first: forty stardust. Then the product: a very good gun. Zibzab does not lie. Lying is bad for repeat business."
  - w07 Zibzab: "No refunds, no regrets! It's on the shell. Right there. Next to the other thing I won't refund."
  - w08 Bricks (after Gerald's pass 3): "Pension form. Rejected. 'Missing signature.' I signed it. Twice. In pen."
- *Barks:* QUILL (Gerald hit): "Do NOT shoot Gerald. Gerald is the mail." / "Hold Fire, please, Technician. He's doing his best." · Gerald (status text, after a hit): "DELIVERY: ATTEMPTED. RECIPIENT: ARMED." · QUILL `hold_fire_used`: "Thank you! Gerald thanks you. Gerald can't talk." · QUILL `new_enemy` puffwing: "Flying pests! They're fluffy. Don't let that stop you!"
- *Base:* the shop opens; the Zapcoil sample ("Price first: your next visit. First one's on me. Zibzab is patient."); the optional question "Where does stardust come from?" (sets `asked_zibzab_early`; available until A2M3). Asked, Zibzab answers plainly ([characters.md](../characters.md#zibzab)'s Act I lines).
- *Codex:* Puffwing, Skyhook, Gerald ("Do not target. Do not reroute without Form 88-B."), Form 88-B, Zibzab, Vrell, Hold Fire.
- *Memo after:* `memo_a1_03` *Mandatory Fun Friday Is Back! (Attendance Optional) (Required)* (small print: "Mail-drone incidents must be reported on Form 88-B.")

**Medals.** Victory · Perfect Core · **Return to Sender:** Gerald is never hit.
**Rewards.** Stardust 140 · Intel 3.
**Par build.** Rivet, Thumper, Sprinkler, Skyhook (all four owned). Skyhook ×2 under the air lane; Rivet T3 (pierce) on Strong at the hairpin for the W4 Chonks and W6 Haulers; Hold Fire (all) toggled for each Gerald pass in the script; clear the hairpin wreckage at W2. Time Dilation on W5. Target 90. `noCounterBuilds`: **no-air**, Thumper + Sprinkler, with Rivets only where they can't reach the air lane (must lose by W6); **no-armor**, Rivets held below T3 + Sprinkler + Skyhook, no Thumper (must lose by W6).

## A1M4 · The Audit

*Compliance Officer Prim is auditing you. Smile. Sterling has your back.*

- **Facts:** Admin Plaza · `act1` · Defend · 14×10, 12 buildable + 5 wreckage (salvage yard: toppled lettuce carts, one hiding a power node) · 9 waves · 320 credits · companion Zibzab (Clearance Sale) · Technician Orbital Strike · **first loadout choice** (five types owned).
- **Story purpose:** Sterling defends you and signs off your tiers (earned trust, with small print); Elders slow the swarm; Goldie's lettuce math; "buffer populations" in a memo; Zibzab plants the question of QUILL's honesty. **Target: comedy at full volume, with Sterling at her most likable.**

**Layout.** A U-shaped road around the plaza fountain under three giant Evie billboards, entering north-west and leaving south-east through the plaza gate (core). The audit podium (decor) faces the path; Prim hovers there all map. Five wreckage carts ring the fountain; the power node is under the cart nearest the podium. The Peeker's rock is a planter by the fountain. A3M2 revisits this plaza: the podium, billboards, and fountain must be landmark-clear.

**Waves.** 1 Nibblers [Clearance Sale prompt] · 2 Bunchlings ×3 [T: splitting] · 3 Bunchlings + Zoomers [X] · 4 one Elder + 6 huddled Nibblers [T: huddle; splash] · 5 Chonks + Bunchlings · 6 Elders ×2 + Bunchlings [X] · 7 Haulers ×2 + Elder · 8 Zoomer flood + Bunchlings · 9 Elders ×3 with big huddles + Haulers [X].

**Story delivery.**
- *Briefing:* Prim: "Compliance Officer Prim. Audit 2361-Q2-447. Please continue working. I will be watching your face." · Sterling: "Smiling is mandatory! (Kidding! It's in your contract, though.)" · Prim: "Smiling detected at 61% of mandated sincerity."
- *Radio:*
  - w03 (Joke of the Shift) QUILL: "Joke of the Shift, for the audit! Why did the auditor cross the road? To measure it. 6.2 meters. ...That's the joke." · Prim: "6.1." · QUILL: "I'm contractually obligated to tell a joke every shift. Not to land one. That's a loophole!"
  - w04 Sterling: "Auditor Prim, Four-Forty-Seven is the best technician on this rock. Dock {their} pay and you'll have to dock mine."
  - w05 Zibzab: "Your grid says 'per policy' like I say 'price first.' Difference is, I always tell you the price."
  - w06 Goldie: "Memo says pests ate forty percent of the crop. Weird! I count every head. They walked right past Duchess."
  - w07 Prim: "Observation: Technician has blinked 1,140 times this shift. Recommended maximum: 900. Noted."
  - w08 Sterling: "Tier approvals are on me, Four-Forty-Seven. My signature, my risk!"
- *Barks:* Zibzab `map_start`: "Clearance Sale! Everything must go. Not you. You're not for sale. Yet." · Zibzab `tower_built` (Zapcoil): "Ten percent better than new. Honestly, eight. The ten is marketing." · QUILL `new_enemy` elder: "Elder! Slow, old, and in the way. Clear it first for efficiency!"
- *Debrief:* Sterling: "Prim filed a report. I filed it under 'recycling.' Super!" · Kip: "Audited, huh? I hold that record. 'Fewest Blinks Under Audit.' Prim didn't count them. I did." · Sterling's sign-off opens R&D Engineering (specializations).
- *Codex:* Elder (original, citing "Survey 2346, Okonkwo"), Bunchling, Zapcoil, Admin Plaza, Evie, Compliance Officer Prim, the Smile Audit.
- *Memo after:* `memo_a1_04` *Buffer Populations and You: A Quick FAQ!* (body about "wildlife management" that says nothing; small print: "Tier approvals contingent on Q3 extraction targets.")

**Medals.** Victory · Perfect Core · **Asset Recovery:** clear all 5 wreckage tiles. **Objective Intel +1, Clean Audit:** sell no tower after its build phase (a misclick-grace refund doesn't count as a sale).
**Rewards.** Stardust 150 · Intel 3 (+1).
**Par build.** Rivet, Thumper, Sprinkler, Zapcoil (no flyers in the intel, so Skyhook stays home: the lesson). Thumper ×3 at the fountain bends for huddles; Sprinkler + Zapcoil adjacent (Conductive); clear the podium cart by W3 and put Thumper on the node. Clearance Sale on W4 and W8 upgrades. Target 87. **Alt builds** (≤ 2 towers shared with par, each must win with ≥ 20%; the only owned tower outside par is Skyhook, so each alt carries it, idle on a map with no flyers): Skyhook + Thumper + Zapcoil (Zapcoil chains on the huddles, Thumper takes the Chonks and Haulers); Thumper + Sprinkler + Skyhook (Sprinkler slows the huddles into the fountain bend for Thumper ×3). `noCounterBuilds`: **no-splash**, Rivet + Sprinkler + Skyhook, no Thumper or Zapcoil (must lose by W6); **no-armor**, Rivets held below T3 + Sprinkler + Skyhook + Zapcoil, no Thumper (must lose by W6).

## A1M5 · Record Quarter

*It's the Spring Surge, the Quarterly Results party is on, and something big is coming down the north road.*

- **Facts:** Northern Gate · `act1` (party dressing: banners, hats, a confetti cannon) · Defend + boss · 14×10, 12 buildable (2 high ground, 1 power node) · 10 waves · 350 credits · **second spawn** opens W3 · companion Bricks + Bricks ally post by the gate · Technician Orbital Strike.
- **Story purpose:** Act I's comedy peak and its one crack: the boss who is driven off with her young, then the **Quiet Wave (C1)**, then the stinger. **Target: triumph, then a held breath.**

**Layout.** Two roads from the north edge (the Spires road, west, and a warren track, north-east) merge at the colony's north gate before the core at the south edge. The banner line (a strip of party bunting across the merged road two-thirds of the way down) marks the Challenge. The party tent is decor beside the core. The Peeker's rock is on the warren track, closer than ever.

**Waves.** 1 Nibblers (west) · 2 Diggers ×3 [T: burrowing, "not a hard requirement"; the wave is `teach: true`, because Burrowing is a soft trait here] · 3 east spawn opens: Zoomers + Nibblers [T: second spawn] · 4 Bunchlings with a few Diggers, both roads [X; the Diggers stay ≤ 15% of the wave's threat] · 5 Elder + Haulers · 6 Puffwings + Chonks · 7 mixed, both roads [X] · 8 the Spring Surge (largest Act I wave) · 9 **Matriarch Chitterbloom** (west road; sneezes Nibblers; burrows and surfaces with a Bunchling; panics and huddles her young; `driveOff` at 0%) · 10 **the Quiet Wave:** Old Thrum leading six younglings, east road, no NEW badge, no prompt ([enemies.md §5.1](../../design/enemies.md#51-skitterkin-body-organic)).

**Story delivery.**
- *Briefing:* Sterling's party memo; QUILL in a party hat: "I'm wearing a hat! Don't check the budget code." · QUILL (the boss hint): "Sensors show something big under the north road. Probably a party surprise!"
- *Radio:*
  - w03 Bricks: "Second road's open. Watch both. You've got two eyes. Use both of 'em."
  - w04 (Joke of the Shift) QUILL: "Joke of the Shift, party edition! Why did the pest cross the perimeter? It didn't. You're very good at your job!" · QUILL: "...That's the joke. It's also a compliment. I'm allowed to combine them. I checked." · Bricks: "It's a good hat, QUILL."
  - w05 Sterling: "Q2 pest losses down 38%! Lettuce losses: Accounting is still working on that number!"
  - w07 Bricks: "Four hundred even. Round number. Don't like round numbers."
  - w09 (boss cue) QUILL: "That's not a surprise. That's a Matriarch. Codename: CHITTERBLOOM."
- *Quiet Wave (cue at W10 start):* Bricks: "Clear it, Sprout." Then Bricks's ally unit **lowers his cannon** and stays lowered for the wave: a silent tell, never mentioned (allies never target `quiet_wave`, `youngling`, or `fleeing` units). · Sterling: "Let's finish strong, Four-Forty-Seven!" Then nothing. At map end, if spared: Bricks: "...Sprout." then "Yeah. Okay." If cleared: Bricks: "Good work."
- *Barks:* QUILL `boss_phase` 3: "She's panicking! Panicking is ninety percent of being driven off!" · Bricks `not_firing` (W10 only, once): "...You okay, Sprout?" · QUILL `wave_cleared` (boss): "Driven off! Not processed. Is that allowed? Logging it."
- *Full-screen scene* `a1_m05_scene_party` (≤ 20 lines; the confetti, the record counter):
  - Sterling: "RECORD QUARTER! Top five percent, Four-Forty-Seven! I didn't check. I don't have to. I believe in you!"
  - Kip: "Rematch. Next quarter. I'm inventing a category."
  - Goldie: "Duchess has a party hat! It's a thimble. She's thrilled. You can tell because she's lettuce."
  - Zibzab: "Price first: party hats, two stardust. Honestly, one. The other one is the party."
  - QUILL: "Everyone's wearing a hat. This is the best day in my whole log!"
  - Goldie: "Dance, Sergeant!" · Bricks: "I don't dance." · Goldie: "You're tapping." · Bricks: "That's a muscle condition."
- *Stinger:* `a1_m05_scene_stinger`: Rig Nine stops answering; six frames of something the wrong shape. QUILL: "Probably a smudge! Logging it."
- *Results:* the counter with ★; if spared, a red **CONTAINMENT LAPSE** stamp (story-only).
- *Codex:* Digger, Matriarch Chitterbloom (original: "Codename CHITTERBLOOM. Big! Grumpy! Lays pests! ★★★★★"), Northern Gate, Rig Nine (one line, "status: answering").
- *Memo after:* `memo_a1_05` *Record Quarter! You're Top 5%!* If spared, a second paragraph: *Performance Note: Containment Lapse* (no consequence).

**Medals.** Victory · Perfect Core (Quiet Wave leaks exempt) · **Party Pooper Prevention:** drive the Matriarch off before she reaches the banner line. No medal can reference the Quiet Wave.
**Rewards.** Stardust 160 · Intel 3.
**Par build.** Rivet, Thumper (Cluster spec), Sprinkler, Skyhook. Thumper ×2 and Sprinkler at the merge (Sitting Ducks); Rivet T3 on each high ground; one Skyhook at the merge for W6. First T4: Cluster Thumper by W8. Orbital Strike + Suppressing Fire on the boss's phase 3. Target 84. **Alt builds:** Rivet + Skyhook + Zapcoil (Rivet T3 for the Haulers; Zapcoil chains through the boss's sneezed young; Skyhook ×2 on the flock); Thumper (Bunker Buster) + Zapcoil + Skyhook (a dedicated air answer: Skyhook under the W6 lane, Zapcoil on the merge, the Bunker Buster for the armor). **Story variants** (harness): par with Hold Fire (all) during W10 must still win (Quiet Wave all leaks ≤ 2 integrity) and must end with `spared_quiet_wave = true`; par clearing W10 must win. `noCounterBuilds`: **no-air**, Thumper (Cluster and Bunker Buster) + Sprinkler, no tower that can reach the air lane (must lose by W7); **no-splash**, Rivet + Sprinkler + Skyhook, no Thumper or Zapcoil (must lose by W7); **no-armor**, Zapcoil + Sprinkler + Skyhook with Rivets held below T3, no Thumper (must lose by W7).
