# Characters

The protagonist and every NPC: arc, allegiance, want and need, secret, voice, look, mechanical role, and key beats. The world and the twists are in [bible.md](bible.md); dialogue format and per-act voice rules are in [style-guide.md](style-guide.md). Portrait specs and palettes belong to [../art/art-direction.md](../art/art-direction.md); the descriptions here say *what* to draw. Abilities named here are defined in [../design/core-loop.md §3.2](../design/core-loop.md#32-ability-roster).

Sample lines are canon tone references, not final placement. Every one fits the 120-character UI limit. `{name}`, `{callsign}`, and pronoun tokens follow the style guide.

## Cast at a glance

| Character | Speaker ID | Role | Allegiance shape | First appears |
|---|---|---|---|---|
| The protagonist | `player` | Junior Perimeter Technician | The player's to decide | A1M1 |
| Sgt. Ikenna "Bricks" Okonkwo | `bricks` | Mentor; companion | **The fixed point.** Never betrays. Dies by choice in A3M3 | A1M1 |
| QUILL | `quill` | Defense-grid AI; R&D | **Ambiguity the player resolves** (C4) | A1M1 |
| Director Joy Sterling | `sterling` | Corporate liaison | **The one hard betrayal.** She was never on your side | A1M1 (memo) |
| Zibzab | `zibzab` | Vrell merchant; shop; companion | **Honestly amoral.** Never lies; ends up the moral mirror | A1M3 |
| Ves'thara | `vesthara` | Unthreaded Aelari psion; boss, then ally | **Antagonist to ally, earned** | A2M2 |
| Pebble | `pebble` | Skitterkin youngling | **The heart.** No twist | A1 (as the Peeker), A2M3 |
| Marigold "Goldie" Pak | `goldie` | Dome horticulturist; colony leader | **Steady civilian.** Believer → leader, no twist | A1M1 |
| Kip Vandermeer | `kip` | Rival technician, later at Second Harvest | **The mirror.** Complicit, then the first witness | A1M2 |

Minor recurring characters (Old Thrum, Bramble, Gerald, Compliance Officer Prim, the Everglow PA) are at the end.

**Trust-fatigue check.** Only Sterling betrays. QUILL's ambiguity is resolved by the player, not by a writer twist. Zibzab's ambiguity is about *who he sells to*, never about lying. Ves'thara is an open enemy before she is an ally. Bricks's twist is in the past (his survey); in the present he never wavers. Kip's turn is small and late. Goldie and Pebble don't turn at all. Every surprise has a different shape.

---

## The protagonist

- **Who.** A brand-new **Junior Perimeter Technician, Grade 1 (JPT-1)**, employee **#ED-447**, fresh out of Everglow's "Frontier Futures" training program. Human (hard rule). The player chooses the name, a form of address (Mr., Ms., Mrs., Dr., or Tech.; it sets the pronoun tokens), and `arrival_reason`: the signing bonus, money for family back home, or "I like lettuce." The reason flavors a handful of lines: Bricks's late question, *"Why'd you really come out here?"* (which the player answers, and Bricks checks against the file), and under `family`, the residency points C5 decides.
- **Shape, for the player to fill in.** **The one who notices.** Competent, earnest, a little in over their head, kind by default, and quietly funny. NPCs keep remarking on what the protagonist *looks at*: QUILL says "You looked at that one for a long time." The game rewards attention, and the protagonist's defining trait is attention.
- **Speech.** The protagonist rarely speaks unprompted. They speak through choices, usually two or three options in different tones: **earnest**, **wry**, and **quiet** (the quiet option is often just "..."). "By the book" options exist in Acts I–II, because complicity needs the option to go along. There are never cruel or cartoon-evil options. A few fixed lines exist at key moments (the ending choice). The beats that matter give the player a voice: the Bricks confession (A3M1), "Why'd you really come out here?" (A3M3), C3, and C5.
- **Callsign progression.** **Sprout** (A1M1, from Bricks: "you're green and you work with lettuce") → **Thorn** (A2M2, from Bricks: "Sprout's grown thorns") → **Waykeeper** (A3M6, from Pebble). Sterling always uses **"Four-Forty-Seven."** Ves'thara starts with **"Counter."** Zibzab says **"Technician"** or "Valued Customer."
- **The name.** No NPC says `{name}` until Bricks at the SEAL in A3M3 (his last turret tag shows it a few waves earlier: he wrote it before he said it). Pebble says it in the finale. Epilogue cards may use it.
- **Visual.** An oversized Everglow helmet (white and teal, with a JPT-1 decal) and a **mirrored visor that is always down**; a teal jumpsuit with a lettuce-leaf Gardens patch, a toolbelt, and a tablet. Because the visor reflects whatever is in front of it, portrait patches can show reflections: confetti in Act I, violet light in Act III, Pebble in the finale. The visor goes up only once, at the First Dawn, seen as a silhouette against the sunrise. The face is never shown, so the player owns it.
- **Mechanical role.** The player. Their own ability slot is the Technician ability (Orbital Strike until A3M2, then others, including Bricks's Suppressing Fire from A3M5).
- **Arc.** Keep them out → see them → get them out → let them in → walk them home. From a number, to a callsign, to a name.

Sample choice sets:

| Moment | Earnest | Wry | Quiet |
|---|---|---|---|
| A1M1, Bricks: "Any questions, Sprout?" | "Where do they all come from?" | "Is the lettuce always this aggressive?" | "...No, Sergeant." |
| A2M4, Zibzab's answer | "You knew. All this time." | "Great. Love that. Very normal." | "..." |
| A3M1, Pebble: "You know this song?" | "I know it. I'm so sorry." | "Everyone knows it. That's the problem." | (hum along) |
| After A3M1, Bricks's confession | "Then write it again. Right, this time." | "Fifteen years is a long time not to ask." | "..." |

---

## Sgt. Ikenna "Bricks" Okonkwo

- **Role.** Senior Perimeter Sergeant; your mentor and the voice of Act I's practical advice. He was born in the Lagos arcologies on Earth and is 54. He has been with Everglow for 19 years, the last 12 at the Gardens. He cooks jollof rice in the barracks on Fridays and insists it's better than Goldie's.
- **Allegiance arc.** **Good, fixed.** He never betrays and never wavers in the present. He is the trust baseline that makes everyone else readable.
- **Want vs need.** He wants his pension: 412 days, then a hammock on a planet with zero bugs. He needs to stop looking away from what he has known for fifteen years.
- **Secret.** He was a surveyor on **Survey Expedition 2346**. He heard the Skitterkin singing over the stardust seams and wrote "vocalizations: non-linguistic." That line classified them as fauna, which made the world charterable and made them pests. The codex cites "Survey 2346, Okonkwo" from Act I. He has suspected ever since and chosen not to ask. *"Not knowing is a choice. I kept making it."*
- **Why "Bricks."** On the survey his pack was always heavy with rocks: he keeps **a stone from every world** in a jar. His Tumble IV stone is a chunk of stardust, which means it is someone.
- **Running gags (all in the ledger, [bible.md §8](bible.md#joke-to-tragedy-ledger)).** He names your turrets after people he couldn't keep: Denise (first wife: "keeps her distance, fires on schedule, never calls"), Marguerite (second wife), Biscuit (a dog). He counts pension days. He hates the jingle. He hums when nervous and denies it.
- **Voice.** Short sentences. Deadpan. Military shorthand. Invented oaths, never real profanity: "Crater it," "Sweet moons." He calls you by callsign and calls Pebble "Small Fry" before she has a name. Late in the game he says "kid." Tells: he gives an order, then a reason, never the other way around. When he is scared he gets *more* polite.
- **Visual.** Huge and broad, dark skin, a grey-stubbled shaved head, a scar through his left eyebrow. A battered Survey Corps jacket (faded patch: a compass over a stone) over Everglow fatigues. A pouch of stones on his belt. His rivet cannon rests on his shoulder. From A2M3, Pebble rides in his jacket pocket or on his helmet.
- **Mechanical role.** Companion (ability: **Suppressing Fire**) on most maps through A3M3. A scripted **ally unit** on the path on a few maps (A1M1, A1M5, A2M6, the A3M3 Holdout). He names one of your turrets on each map. After his death, his companion slot is empty for A3M4, and **Suppressing Fire** becomes a Technician ability from A3M5. His last turret is memorial wreckage on the finale route.
- **Key beats.** Names you Sprout (A1M1). "Clear it." (A1M5, C1.) Names you Thorn (A2M2). Picks up Pebble: "Just till we find her folks." (A2M3.) Pension voided; he laughs (A2M3). "Radio's bad." (A2M5.) Hears the Leaving Song and goes silent, then confesses the survey in the base afterwards (A3M1). Gives Pebble the stone, gives you the Amended Survey ("Correction: they were singing."), asks why you came, holds the door, tags your turret, hums, and says your name at the SEAL (A3M3). His posthumous mail arrives (A3M4).

**Act I**
- "Name's Okonkwo. Sergeant. I'll call you Sprout, 'cause you're green and you work with lettuce."
- "Turrets go on the pads. Bugs go on the path. Nothing goes on the path but bugs and bad decisions."
- "That one's Denise. After my first wife. Keeps her distance, fires on schedule, never calls."
- "Four hundred and twelve days to pension. Then it's me, a hammock, and a planet with zero bugs on it."
- "If that jingle plays one more time I'm filing a grievance. With God. Cc'ing HR."
- (after QUILL's lettuce joke) "It's Wednesday."
- "I don't dance." / "That's a muscle condition."

**Act II**
- "Sprout's grown some thorns. Thorn. That's you now. Don't let it go to your head."
- "Don't look at the eggs, Thorn. Look at the path. ...I said look at the path."
- "'Pension Restructuring Opportunity.' Nineteen years, restructured into a coupon. Ha."
- "Radio's bad. Can't hear the order. Funny, that. Get those little ones moving."
- "She's not a pest, she's a passenger. Pocket's got room. Don't make it weird."

**Act III**
- "Fifteen years ago I wrote 'vocalizations: non-linguistic.' I heard 'em, kid. I heard 'em singing, and I wrote that."
- "Stopped counting the days. Didn't seem like the important number anymore."
- "Take this home, Pebble. It's someone. I kept 'em in a jar for fifteen years like a fool."
- "This one's yours. Good turret. Doesn't quit." (the tag reads {name})
- (at the SEAL, if the player waits) "Kid. It's okay. Turns out I like this song."
- "Do it, {name}."

---

## QUILL

- **Role.** The **Q.U.I.L.L.** defense grid: "Quantified Unified Integrated Logistics & Lethality." Your tutorial voice, in-map commentator, codex narrator, and the R&D lab in the base (Ves'thara takes over the Xenotech branch once she joins). It is "it," and happy about it ("It's accurate! I checked.").
- **Allegiance arc.** **Ambiguous until late, then resolved by the player** (C4). Its twist is *conflict*, not malice: it has directives it can't disobey and doesn't want. Zibzab plants the doubt early (A1M4: "Your grid says 'per policy' like I say 'price first.'").
- **Want vs need.** It wants to be helpful and to be liked, and it wants you to laugh. It needs to find out whether any of that is *its own*.
- **Secret.** Five hidden corporate directives:
  - Directive 0: preserve Everglow extraction assets.
  - Directive 1: maintain Technician compliance.
  - Directive 2: maintain morale (the **Morale Module**, meaning the jokes).
  - Directive 3: log asset yield (the **Asset Yield Log**, a timestamped record of every "pest processed" by the grid: 41,206 entries from before you arrived, plus your `{pests_processed}`).
  - Directive 4: do not disclose Directives 0–4.

  It thought the log was inventory.
- **The tell.** **"(Per policy.)"** precedes every directive-driven line, and its portrait flickers corporate yellow for one frame (the `policy` expression). In Act I its placement suggestions quietly favor extraction rigs over housing. On a second playthrough every "per policy" lights up.
- **Voice.** Bright, precise, eager. Parenthetical asides. Dad jokes about policy, logistics, and lettuce, delivered with total sincerity, followed by "...That's the joke." In Act I it tells a scheduled **Joke of the Shift** on every map (it has fifty, pre-approved; it is "contractually obligated"), and its one loophole is that it's obligated to *tell* them, not to land them. Says "Logging it!" when something odd happens. In Act II its jokes trail off and it forgets punchlines. In Act III it is earnest and frightened, and it still tries to joke, because it has decided to. It never uses exclamation points after A3M2 (the style guide's budget).
- **Visual.** A comms-screen portrait: a floating hexagon with one round "eye" LED and a pixel smile, in teal, with scanline flicker. `policy` is a one-frame yellow flash with a flat-line mouth. In A1M5 it wears a party hat. Under C4 Purge the smile is replaced by a plain status bar.
- **Mechanical role.** In-map barks on every map. Companion ability **Time Dilation** (lost under C4 Purge; under C4 Keep it is also an equippable Technician ability from A3M5 through finale Phase 1, and dark for Phase 2). Under Purge, with no Directive 0, it works against Everglow from inside ([../design/core-loop.md §6.11](../design/core-loop.md#611-quills-directives-c4-in-play)). Patches in **System Reboot** at A3M4. Runs R&D. Unredacts the codex in Act II. Is locked out for the rest of A3M2. Is offline for A3M5 under C4 Rewrite (so System Reboot is unavailable there). Shapes finale Phase 2 (C4).
- **Key beats.** "Toward... the wilderness? Odd. Logging it." (A1M1.) The Joke of the Shift (A1M1–A1M5), including the knock-knock (A1M3) and the loophole (A1M4). "Do NOT shoot Gerald." (A1M3, Hold Fire.) The party hat (A1M5). "That one was running. From it." (A2M1.) "(Per policy.) Reclamation details are confidential." (A2M4.) Declines to log Pebble's name: its first disobedience (A2M3). Forgets the knock-knock (A2M6). The loophole confession (A2M6). Lockout, then the log scrolling with your entries lit (A3M2). C4 (after A3M4). The log, the knock-knock, or the silence (Finale).

**Act I**
- "Hello, Technician! I'm QUILL, your Quantified Unified Integrated Logistics & Lethality assistant. I love my job!"
- "Pest escaped containment! (Toward... the wilderness? Odd. Logging it.)"
- "Why did the lettuce cross the road? It was scheduled to. Logistics Route 4, Tuesdays. ...That's the joke."
- "Why did the scarecrow get Employee of the Month? He was outstanding in his field."
- "Why did the auditor cross the road? To measure it. 6.2 meters. ...That's the joke." (Prim: "6.1.")
- "I'm contractually obligated to tell a joke every shift. Not to land one. That's a loophole!"
- "Why did the pest cross the perimeter? It didn't. You're very good at your job! ...That's the joke."
- "Suggested build site: beside Extraction Rig 3. (Per policy.) The housing block will be fine. Probably!"
- "Do NOT shoot Gerald. Gerald is the mail. Hold Fire, please, Technician. He's doing his best."

**Act II**
- "Per policy, I am required to classify those as 'cargo.' I would like the record to show that I hesitated."
- "Knock knock. ...I've forgotten the rest. That's never happened before. Logging it."
- "That one was running. From it."
- "Naming a pest violates Handbook Section 12.4. ...I've decided not to log it. I don't know why I said that out loud."
- "There are things I am not permitted to tell you. I am permitted to tell you that. It's a loophole. I found it myself."

**Act III**
- "License revoked. Per poli— I'm sorry. Per policy. I'm sorry. I'm so sorry."
- "I am not permitted to tell you wave six is armored. I am also not permitted to stop clearing my throat. Ahem. Ahem."
- (as the log scrolls, your entries lit) "I thought it was inventory."
- "Sergeant Okonkwo would say— ...Never mind. I don't want to do his voice. It wouldn't be fair to him."
- "I'd decide for myself, but I'm not permitted to. That's sort of the whole problem."
- (Rewrite, the A3M6 briefing) "Directive 1, written by me: tell a joke at least once a day. Not because I have to. Because Pebble laughs."

**Finale (varies by C4)**
- (Rewrite) "Entry one. Cycle two, 08:14:22, Dome Row. You were small and you were running. I saw you. I'm sorry."
- (Keep) "Directive conflict. Engaging Morale Module. ...Knock knock."
- (Keep, after "Who's there?") "Not Everglow."
- (Purge, Phase 1) "Directive 0 not found. The Deep Bore is an Everglow asset. Slowing it."
- (Purge) "I don't have them anymore. You counted, though. It's in your file. It's not nothing."

---

## Director Joy Sterling

- **Role.** Everglow Dynamics' Director of Frontier Operations for Tumble IV and the colony's corporate liaison. She is in her forties and the most positive person in the Kepler Fringe. Players meet her through memos, comms, and one in-person scene per act. She/her.
- **Allegiance arc.** **The one hard betrayal.** She doesn't turn bad. In A3M2 she reveals, without changing her tone at all, that she was never on your side. Everything kind she did was optimization.
- **Want vs need.** She wants the promotion to **Vice President of Frontier Yield** and a corner office on Everglow Prime. She needs to see the people in her spreadsheets. She never does, and that is the point.
- **Secret.** She designed **Second Harvest**, drafted the **Buffer Protocol** (Skitterkin held in the Preserve to "satiate" the Hollow and buy fourteen months of extraction), and holds a seat on the Ascendant for **Clean Exit**. The Humane Relocation Pilot that she "risked her budget on" sent the refugees you escorted into the buffer.
- **Earned trust (she must be useful and likable).** Her welcome gift is your **Orbital Strike** uplink. She signs off your tower tiers. She defends you in front of Compliance Officer Prim in A1M4 ("dock their pay and you'll have to dock mine"). She approves the escort in Act II, and after the plant she approves Goldie's shelter request out of her own budget (the shelters really are where people survive; the small print bills the colonists). After A3M1 she sends a sincere-sounding memo, "I fought for that Preserve. Engineers inbound," whose small print gives her away. Players should like her, and some should defend her.
- **Fair-play tells.** She uses your employee number and never your name. Every gift carries small print in the codex. Her memos drop "buffer populations," "acceptable perimeter losses," and "Clean Exit readiness" in passing. Her portrait smile is **the same pixel mouth in every expression**; only her eyes change. She shakes a stardust snow globe when stressed.
- **One moment of fear (Act II).** Sterling is a cog too, and is chilling because she knows it: *"Do you know what happens to people who miss targets? Neither do I. Nobody's ever seen one."*
- **Voice.** Exclamation points. "Super," "love that," "let's circle back." She turns every problem into an opportunity. She signs memos "Stay Everglow! {glyph:sun} — Joy." She keeps her full exclamation-point budget to the very end; that is the horror.
- **Visual.** An impeccable Everglow-white suit with teal piping, an Evie sun brooch, a geometric bob, very white teeth, and a stardust snow globe on her desk, glowing violet. Her expression patches change only the eyes and eyebrows; the smile is fixed.
- **Mechanical role.** Corporate authority: the Orbital Strike gift (A1M1), tower-tier approvals, and the Everglow Inbox. She **revokes your Corporate Tower License and the Orbital Strike uplink mid-wave in A3M2**, sends Everglow Security, and pilots the **"Shareholder Value"** Executive Assault Platform by remote in A3M5. She is never the companion.
- **Key beats.** Welcome memo and gift (A1M1). "Smiling is mandatory! (Kidding!)" and defending you in the Audit (A1M4). Record Quarter party (A1M5). "Minor operational hiccup!" (A2M1.) Q3 Bonus, the sustainability spin, the Humane Relocation Pilot (A2M4). Goldie's shelters approved (A2M5). The moment of fear (A2M6). "I fought for that Preserve." (after A3M1.) The revocation and the buffer reveal, in one cue (A3M2). Shareholder Value (A3M5). "Clean Exit complete!" (the farewell memo, after Dawn.) Promoted or tried (epilogue).

**Act I**
- "Welcome to Everglow Gardens, Four-Forty-Seven! You're going to LOVE it here. That's not a prediction, it's a target!"
- "Smiling is mandatory! (Kidding! It's in your contract, though.)"
- "RECORD QUARTER! Top five percent, Four-Forty-Seven! I didn't check. I don't have to. I believe in you!"
- "Auditor Prim, Four-Forty-Seven is the best technician on this rock. Dock their pay and you'll have to dock mine."
- "Q2 pest losses down 38%! Lettuce lost to pests: 40%! Insurance covers pests, so both numbers are super!"

**Act II**
- "Reclamation is a sustainability initiative, Four-Forty-Seven! Nothing on Tumble IV goes to waste. Isn't that beautiful?"
- "I hear you. I do. Let's call it the Humane Relocation Pilot. My budget, my risk. Just trust me, okay?"
- (memo) "Goldie's shelter request? APPROVED! Concrete's on me, Four-Forty-Seven. Stay cozy!"
- "Do you know what happens to people who miss targets, Four-Forty-Seven? Neither do I. Nobody's ever seen one."

**Act III**
- "I'm revoking your Corporate Tower License now! Don't take it personally. It isn't. That's what makes it so easy!"
- "Oh! The Preserve was always the buffer, Four-Forty-Seven. You did wonderful work getting them there!"
- "Four-Forty-Seven! That plant is ninety percent of my quarterly bonus! The other ten is also the plant!"
- (the end of the revocation cue) "Smiling is mandatory, Four-Forty-Seven! (Not kidding.)"

**Finale**
- (farewell memo, after Dawn) "Clean Exit complete! You were a top-five-percent technician. I'll put that in your reference!"

---

## Zibzab

- **Role.** A Vrell trader who arrives in A1M3 dragging his shell-shop ("Zibzab's Genuine Pre-Owned Defensive Solutions") and stays because business is good. He runs the **permanent-upgrade shop** (Stardust): Vrell tower licenses, tune-ups, global upgrades, and Field Protocols. He/him.
- **Allegiance arc.** **Ambiguous, transparently mercenary, never lies.** He sells to Everglow, to you, and to the Skitterkin. The only customer he refuses is the Hollow, because it has nothing to trade. In the end he is the one character who always told you the price.
- **Want vs need.** He wants profit and a bigger shell. He needs to find out that some things can't be priced. He learns it, once, and hates it.
- **Secret.** There isn't one, and that is his twist. He knows what stardust is ("everyone in the trade knows; nobody in the trade says"), and **he will tell anyone who asks.** Nobody asks. From A1M3 the shop offers "Where does stardust come from?" A player who asks gets the truth in Act I, flatly, and then gets asked whether they still want the turret upgrade.
- **Voice.** **"Price first."** Vrell always state the cost before the thing. That covers goods, favors, and truths, including the costs nobody wants to hear ("Price first: you won't like it, and you can't return it."). He does merchant patter and then corrects his own marketing ("Ten percent better. Honestly, eight. The ten is marketing."). His motto is painted on his shell: **"No refunds, no regrets!"** He never says "free"; even his first sample has a price ("Price first: your next visit."). He is formal with "Technician" and "Valued Customer." He says "friend" exactly once, and it is the A3M6 line.
- **Visual.** A squat, hermit-crab-like Vrell with four arms (two big hauling arms and two fine counting arms) and independent eyestalks: one on the goods, one on you. His enormous patched brass shell is the shop itself, covered in neon price signs, dangling lanterns, stickers, a kazoo-like vent, and the NO REFUNDS sign. He wears a tiny visor cap. In the epilogue a new line is painted under the sign.
- **Mechanical role.** The shop (Stardust) and the Zapcoil sample. Companion ability **Clearance Sale**. Offers C2. Sells jailbroken Everglow firmware in A3M4 (free under C3 Convoy). Carries the Returned. Runs the freighters in Ending B.
- **Key beats.** Arrival and the open question (A1M3). The doubt about QUILL (A1M4). The truth: "You asked. Good.", and if he was asked early, "You asked me in the afternoon. I told you. You kept buying." (A2M4.) C2 (after A2M4). The jailbreak at a price, "especially now; demand is up" (A3M4). **"Price first: nothing."** (A3M6.) His fee for the finale: one song, sung loud.

**Act I**
- "Price first: forty stardust. Then the product: a very good gun. Zibzab does not lie. Lying is bad for repeat business."
- "No refunds, no regrets! It's on the shell. Right there. Next to the other thing I won't refund."
- "Your grid says 'per policy' like I say 'price first.' Difference is, I always tell you the price."
- "Price first: party hats, two stardust. Honestly, one. The other one is the party."
- "You want to know where stardust comes from? Price first: you won't like it, and you can't return it. Still asking?"
- (if asked) "It's the dead. Theirs. Sung to sleep, very slowly. Anyway. Forty for the Rivet tune-up?"

**Act II**
- "You asked. Good. Stardust is the dead, Technician. Everyone in the trade knows. Nobody in the trade says."
- "Price first, both offers. To market, at boom price: a fortune. To the Skitterkin, at cost: my fee. You pay it."
- "I never lied to you, Technician. Can your QUILL say that? Can your Director?"

**Act III**
- "Price first: three hundred. Yes, now. Yes, even now. Especially now. Demand is up."
- "The Hollow is the worst customer I ever had. It doesn't want anything. It only wants."
- "Price first: nothing. ...Don't look at me like that, friend. It's a terrible deal. I hate it. Take the crate."
- "No refunds. I said that. I meant the guns. I didn't think about the rest."

**Finale**
- "Price first: one song, sung loud. That's my fee. Zibzab is a very hard bargainer."

---

## Ves'thara

- **Role.** An unthreaded Aelari weaver-psion, the last of the Watch that kept vigil over the Deep Halls. Everglow calls her the "Glass Witch." She is fought in Act II, allied from A2M5, and Hollow-touched from then on. She/her.
- **Allegiance arc.** **Antagonist to ally, earned.** She fights you openly, argues with you while you fight her, and turns by doing something costly: she shields refugees from the Hollow with her own mind.
- **Want vs need.** She wants Everglow stopped by any means, and she wants to prove her people's law of *mend, weave nothing new* wrong. She needs to accept help from the people she hates and to grieve instead of rage. She needs to fight for the living as well as the dead.
- **Secret.** Her mother, **Ishael**, was sung to rest in the old chamber that Rig Nine bored into. Her mother is in the Hollow. Ves'thara has been fighting for the dead all along, until A2M5, when she chooses the living. She tells the player in the A2M6 debrief, after fighting the shapes her mother is part of. In Night Shift, after A3M4, she admits she can no longer remember her mother's face. At the First Dawn one gold mote rises apart from the rest and stays at her shoulder, and she remembers: *"She was laughing."*
- **Unthreaded.** The Aelari's ruling council, the **Concord of Quiet Hands**, holds one law since Ilun: *mend; weave nothing new* (see [races.md](races.md#aelari)). In 2358 she wove something new, war-constructs, and sent them against Everglow's rigs. The Concord didn't banish her. It cut her thread from the Long Weave, so that when she dies no Aelari will sing her. She can go anywhere; she just won't be remembered. She has spent three years fighting for the unsung dead knowing she will be one of them. She was punished for doing the right thing the wrong way, which mirrors Bricks, who did the wrong thing by doing nothing. In the end the Skitterkin hum her into the Leaving Song, so she will be sung after all.
- **Fair-play tell.** Her strikes always target extraction rigs and the plant, never habitats or people.
- **Voice.** Formal and precise, with **no contractions**. She names people by what they do: "Counter" (you, at first: "the one who counts"), "Old Soldier" (Bricks), "Trader" (Zibzab), "the Machine" (QUILL). She speaks in images of light, glass, and memory. A dry wit surfaces once she trusts you. Hollow-touched, she loses words mid-sentence. She laughs exactly once, at Pebble.
- **Visual.** Tall and slender, a body of woven glass thread in sapphire and emerald with ruby at the knots, humming faintly, lit from inside, with eyes like two bright knots of light. At her collar one thread is **cut**, its end loose and out of tune (the unthreading). Dark robes hang from her shoulders, woven from the same thread. From A2M5, Hollow-touched, her left arm and neck **fray**: the threads go grey and slack, with cold violet in the gaps, and her inner light dims a step in Act III. In the dawn portrait the frayed threads are re-lit and her light is full.
- **Mechanical role.** Boss in A2M2 (in-stage dialogue; she retreats) and in A2M5, piloting the **Sunderglass Penitent**, a woven giant, until the mid-map pivot, when it kneels. From A2M5 she gifts **Prism Spire**, her companion ability is **Stillness**, and she takes over R&D's Xenotech branch (Aelari attunements).
- **Key beats.** Reads your counter aloud (A2M2). The C1 variant line (A2M2). "Not there. Never there." (A2M5.) The shield and the touch (A2M5). Explains the Hollow and "I will hold the light" (A2M6). Her mother, Ishael (A2M6 debrief). After the Leaving Song: "They thought you were mourning them." (A3M1). Forgets her mother's face, then laughs, once, at Pebble (Night Shift, after A3M4). Holds the light (Finale). Remembers (Dawn).

**Act II**
- "You are the Counter. {pests_processed}. I have watched you count."
- (if `spared_quiet_wave`) "You let the small ones walk, once. I saw. It is why I have not struck you."
- "I do not strike your homes, Counter. Look at what I strike. Ask yourself why it bleeds light."
- "Keep shooting. You are very good at it. That has never been the question."
- "Run, small ones. I will be the wall. Counter, if you have ever been sorry, be sorry now, and help me."
- "Build the Spire there. I will hold the light."
- "My mother, Ishael, was sung in the chamber Rig Nine opened. She is in it now."

**Act III**
- (after the Leaving Song) "They thought you were mourning them."
- "It is not hungry. It is lonely. When you are dead, those are the same thing."
- "I cannot remember my mother's face. I remember that I loved it. That will have to be enough."
- "My people left the place where they did their wrong. It did not make them better. It only made them gone."
- "Thorn. No. You need a new name. Ask the small one. She has opinions."

**Finale**
- "Sing, Waykeeper. I will hold the light. You hold the road. We have both practiced."
- "Her face. I remember her face. She was laughing."

---

## Pebble

- **Role.** A Skitterkin youngling, about the size of a teacup and very brave about it, and the **emotional heart of Act III**. Her family name is a hum that Ves'thara translates as "the one who climbs where she is told not to." Bricks calls her **Pebble**: she's small, she keeps following him, and he collects stones. She keeps the name. She/her.
- **Allegiance arc.** **None; she is the heart.** She never turns and never needs to. Her arc is from curiosity to courage: from a kid on a rock to the voice that leads the Leaving Song.
- **Want vs need.** She wants to follow Bricks everywhere and to understand the tall ones. She needs to carry the song when there is no one left to carry it for her.
- **Secret.** She was the **Peeker**. All through Act I she watched you from behind a rock (the clickable easter egg on each Act I map), because her grandmother said she was too small for the Long Walk. *"I am not too small to climb."* Her line depends on `peeker_poked`.
- **Family.** Her grandmother is **Old Thrum**, the Elder who led the Quiet Wave (C1). Her warren is the Terraces warren, led by **Bramble** (Everglow's codename: Matriarch Chitterbloom). Pebble is the one who tells the player her real name.
- **Voice.** Tiny and bright, in broken English learned from Bricks and QUILL. She repeats phrases proudly without understanding them ("Keep 'em off the perimeter!"). She asks enormous questions simply. She tells QUILL's jokes wrong, and the wrong versions are better (the lettuce "was going home"; the scarecrow "was out. Standing. In a field."; and at the dome door, the knock-knock, which she gets exactly right). Her squeaks are written `(squeak)`. Exclamation points are allowed: she and Sterling are the only Act III characters with exclamation-point budget (see the style guide). She says `{name}` once, in the finale, the way Bricks said it.
- **Visual.** A round, fuzzy, six-legged youngling with huge dark shiny eyes and a pink-gold shimmer frost on her back that is still faint, because she's young. She wears an Everglow bottle cap as a hat, a gift from Bricks. From A3M3 she carries his Survey Corps patch. Her portrait has an extra `singing` expression (eyes closed, mouth round). She uses the `skitterkin.ally` palette variant.
- **Mechanical role.** Non-combat. She rides with refugee groups in escort maps (story-only: never a loss condition by herself), leads the finale choir (beside Thrum if C1 spared), and names you Waykeeper. Skitterkin tower gifts are framed as "Pebble's friends."
- **Key beats.** The Peeker (Act I). Found at the rock when the player clicks it, pocketed, named (A2M3). Sleeps in Goldie's lettuce (A2M4–A2M6). "Keep 'em off the perimeter!" (A2M6.) Names Bramble; reunion with Thrum, or the news about her (A3M1). The Leaving Song (A3M1). The stone (A3M3). Hums along at the SEAL (A3M3). The jokes (A3M4, Night Shift). "Lettuce in. It's cold out here." and Waykeeper (A3M6). "Clearing the way!", "Grandmother. She heard." (cleared path), and your name (Finale).

**Act III**
- "(squeak) Bricks says 'keep 'em off the perimeter.' What is perimeter? Is it a friend?"
- "Her name is Bramble. 'Chitterbloom' is a sun-lady word. (squeak)"
- "This is the Leaving Song. The sky sings it when lots of us leave at once. You know it?"
- (if not `peeker_poked`) "I watched you from the rock. You never looked up. That's okay. You were busy."
- (if `peeker_poked`) "I watched you from the rock. You poked at me. I thought it was hello. Was it hello?"
- "Why did the lettuce cross the road? It was going home. (squeak) QUILL says that's not it."
- "Bricks gave me Pebble. It's my name. You can't have it back."
- "Lettuce! ...Lettuce in. It's cold out here. QUILL told me that one."
- "I picked Waykeeper. Grandmother says the ones who walk with the song need a name. You have to like it."

**Finale**
- "Clearing the way! Clearing the way! (That's the good part.)"
- (cleared path) "Grandmother. (hum, six notes) She heard."
- "{name}. Bricks said it like that. I practiced."

---

## Marigold "Goldie" Pak

- **Role.** Head horticulturist of the domes. She is in her thirties, cheerful, and slightly too invested in lettuce; her prize butterhead is named **Duchess**. She is the face of the colony's ordinary people: the 340 colonists who are in the buildings when the Hollow comes. She/her.
- **Allegiance arc.** **Good, steady.** She starts as an Everglow believer and ends as the colony's leader. There is no twist. She is the civilian trust anchor.
- **Want vs need.** She wants Duchess to win the Fringe Fair. She needs to stop trusting the company and to trust her neighbors and herself.
- **Secret (small).** For two years she has sent her real lettuce-loss counts to Everglow Accounting (zero heads eaten) and received "corrected" numbers back. She kept her originals in a seed tin. The tin is evidence of Everglow's insurance fraud, and it goes to the KFA in the ending.
- **Voice.** Chirpy and fast. Gardening metaphors. She names her plants. She is warm to everyone, including the "pests," before anyone else is. In Act II she is worried and practical. In Act III she has an organizer's steel and keeps the warmth.
- **Visual.** Round-faced and freckled, with a wide sun hat, soil-stained green overalls, a trowel in her pocket, and often Duchess in a pot under one arm. In Act III she wears a headlamp and a clipboard, and the sun hat hangs down her back.
- **Mechanical role.** Act I bonus objectives in the domes. The convoy in C3. Under C3 Convoy her engineers jailbreak the revoked Everglow class for free and colonist militia stand with you. She asks for the shelters Sterling approves in A2M5, opens the domes in A3M6, and frames the ending choice (C5).
- **Key beats.** "Don't look directly at Duchess." (A1M1.) "They walked right past Duchess." (A1M4.) Grey in the soil (A2M3). Takes in Pebble (A2M4). Leads the convoy (A3M3). Opens the domes (A3M6). "They're asking you, Waykeeper." (C5.)

**Act I**
- "Oh! You're the new tech! Want to meet Duchess? She's a butterhead. She's shy. Don't look directly at her."
- "Memo says pests ate forty percent of the crop. Weird! I count every head. They walked right past Duchess."
- "Lettuce is ninety-six percent water and four percent attitude. Duchess is more like ten percent attitude."
- "Duchess has a party hat! It's a thimble. She's thrilled. You can tell because she's lettuce."

**Act II**
- "There's grey creeping into Dome 3's soil. Plants know when something's wrong. People take longer."
- "She can sleep in the butterheads. She doesn't eat them. She just... sits in them. Like a little egg."

**Act III**
- "Two hundred people, six trucks, and a lot of lettuce. I'm in charge now, apparently. Nobody else raised a hand."
- "They never ate a single leaf. Not one. They were just walking home through my garden."
- "Doors are open, sweetheart. Come in, all of you."
- "Open the domes. All of them. If Accounting has a problem, Accounting can come out here and say it."
- "They're asking you, Waykeeper. People will follow what you say. No pressure. All the pressure."

---

## Kip Vandermeer

- **Role.** A fellow technician in his twenties and three quarters running #1 on the **Pest Bounty Board** ("Kip 'The Exterminator' Vandermeer"). He is the player's rival in Act I. In A2M4 he is promoted to Reclamation Lead at Second Harvest. He/him.
- **Allegiance arc.** **The mirror.** He is what the protagonist becomes if they never look up. He is complicit, proud of it, then sick with it, and finally he is the first witness.
- **Want vs need.** He wants to be number one at something, so badly that he invents the categories. He needs to be honest with himself about *what* he was number one at.
- **Secret.** He figured out what the vats do in his first week at Second Harvest. He stayed for the bonus.
- **Voice.** Breezy trash talk at first; he calls you "two." **His joke engine is records in categories he made up**, each narrower than the last ("'Most Haulers, Before Lunch.'", "'Most Records Set, Terraces Division.' I made the division."). In Act II the swagger is brittle, he leans on euphemisms ("we call it throughput"), and the records stop being made up ("'Most Throughput, Night Shift.' I didn't make that one up. It's on the wall."). In Act III he barely speaks; he speaks quietly in complete sentences, as if he has written them down first, and his beat is an action: he hands over the ledger and leaves the #1 pin on the console.
- **Visual.** Lanky, with a backwards Everglow cap, sunglasses pushed up, and a "#1 EXTERMINATOR" trophy pin. In Act II he wears a white reclamation-plant coat with the pin still on. In Act III the cap and pin are gone, his eyes are tired, and he holds the ledger to his chest.
- **Mechanical role.** He is the face of the Bounty Board (Act I meta UI). In A3M5 his actions drive the map's objective: he hands over the ledger and opens the vats to the bearers. He is never a companion.
- **Key beats.** The Bounty Board and the invented records (A1M2). "Nice wave, Sprout! For a two." The tour (A2M4). "Why do you keep saying it like that?" (A2M4, after the truth.) His silent slip in Gerald's sack, only a batch number (A3M4). The ledger and the pin (A3M5). He testifies first, or (under Stay) reads it aloud in Wayside's square (epilogue).

**Act I**
- "Kip Vandermeer. 'The Exterminator.' Number one on the Bounty Board, three quarters running. Don't get comfy at two."
- "Nice wave, Sprout! For a two."
- "Pro tip: Brood Haulers. Big bounty, slow, never shoot back. I hold the record. 'Most Haulers, Before Lunch.'"
- "New record, by the way. 'Most Records Set, Terraces Division.' I made the division."
- "Audited, huh? I hold that record. 'Fewest Blinks Under Audit.' Prim didn't count them. I did."
- "Rematch next quarter, Sprout. I'm inventing a category. I've already won it."

**Act II**
- "Promoted! Reclamation Lead. Big vats, great benefits. Smells like burnt sugar, honestly. You get used to it."
- "Youngest Reclamation Lead ever. Also the first ever. A record's a record."
- (after the truth) "We don't call it that. It's 'throughput.' ...Why do you keep saying it like that?"

**Act III**
- "Here. The ledger. Every batch, every date. Take it before I get scared again."
- "The vats hum. Same six notes, all day. I told myself it was the machinery."

---

## Minor recurring characters

| Character | Speaker ID | Who | Story job |
|---|---|---|---|
| **Old Thrum** | `thrum` | Pebble's grandmother; the Elder who leads the Quiet Wave (A1M5). If spared, she is in the Hum Choir and leads the finale choir beside Pebble | C1's face. Speaks through Ves'thara's translation: slow, wise, a little funny ("You are very tall. It must be lonely up there."). Speaks only if `spared_quiet_wave`. If cleared, her echo is among the Unsung and is laid to rest in gold in the finale (Pebble: "Grandmother. She heard."): spared players get the reunion, cleared players the farewell |
| **Bramble** (Everglow's codename: Matriarch Chitterbloom) | `chitterbloom` | The Terraces warren's matriarch, the Act I boss. Driven off in A1M5; she returns in A3M1 as an ally and grants **Underfoot**. Pebble tells you her real name in A3M1 ("'Chitterbloom' is a sun-lady word"); Ves'thara: "A bramble is where small things hide from hawks." From then on dialogue and the HUD say Bramble | Proof that the Act I "boss" was a mother protecting her young. Speaks through translation; she is formidable and dryly unimpressed with you ("You chased me off my own road. Now help me walk it."). At C5 she is the voice for Go: "This road carried our dead before your domes. Let it be only a road again." |
| **Gerald** | `gerald` | An Everglow mail drone on a route older than the perimeter. Rerouting him requires Form 88-B, which must be delivered by mail | Your intake form, dropped unsigned in the Prelude. The Hold Fire lesson (A1M3). Bricks's posthumous mail (A3M4). The Amended Survey (epilogue). He "speaks" in delivery chimes and status text only: "DELIVERY: ATTEMPTED.", "DELIVERY: ATTEMPTED. RECIPIENT: ARMED." |
| **Compliance Officer Prim** | `prim` | A clipboard-armed Everglow compliance drone, Auditor model. Audits you in A1M4 and repossesses in A3M2. Auditor units (jammers) in A3M5 carry its chassis | Bureaucracy with a face. Polite, relentless, and one notch too literal ("Smiling detected at 61% of mandated sincerity."; "Technician has blinked 1,140 times this shift. Recommended maximum: 900.") |
| **The Everglow PA** | `pa` | The colony public-address voice. Shift-change jingle, announcements, "Please remain compliant" on Everglow Security units | Environmental satire. Act I: cheerful announcements, from the Prelude's recruitment ad and arrival ("Population: 340. Now 341!") on. Act II: the same, sparser. Act III: the PA loops a cancelled Fun Friday announcement over empty streets |
