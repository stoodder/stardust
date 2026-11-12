# Story Style Guide

How Stardust's words are written: voice rules per act, comedy rules, where story is delivered, the dialogue format the data files must support, and content guidelines. *What* happens is in [bible.md](bible.md); *who* says it is in [characters.md](characters.md). The TypeScript types for dialogue live in `content/dialogue/types.ts` and must map one-to-one onto the format in §5 ([../tech/story-runtime.md](../tech/story-runtime.md), [../tech/conventions.md](../tech/conventions.md)).

---

## 1. The ten rules

1. **Character first.** Every line should be one only that character would say. If you could swap the speaker ID without changing the words, rewrite it.
2. **Short beats long.** This is a tower defense game. The player is building while they read. One line that proves the game noticed is worth a page of lore.
3. **Specific beats general.** Use a form number, a day count, a lettuce's name. "Form 88-B" is funny; "paperwork" isn't. "412 days" hurts later; "almost retired" never will.
4. **Recontextualize, don't replace.** Later acts reuse Act I material (the same words, jingle, and jokes) so that it means something new. Never explain a callback. If the player doesn't catch it, the scene still has to work.
5. **One reveal per scene, at most two per map, never the same shape,** each from its designated voice ([bible.md §5](bible.md#5-the-secrets-and-the-twist-structure)). A second reveal on a map gets its own scene and a different delivery (A2M6: Ves'thara tells, then QUILL confesses in the base).
6. **Don't say the twist before the player sees it.** See the protected-words list in §3.
7. **Never tell the player what to feel.** No narrator says "tragically." No character says "this is so sad." Let the counter, the silence, and the hum do it.
8. **Never absolve, never scold.** No line says "you couldn't have known," and no line shames the player. Characters argue about guilt with each other. The player decides what they think.
9. **The corp is the moral center of the wrong.** The Hollow is a consequence, the Aelari are a warning, and the Skitterkin are never to blame. Any line that makes the Hollow "the real villain" is off-model.
10. **End on hope that costs something.** Hope in this game is a choice people make with their eyes open, never a reset.

---

## 2. Voice by act

Tone moves on several slow dials at once, a little every map ([../research/emotional-storytelling.md §2](../research/emotional-storytelling.md#2-shifting-tone-from-whimsical-to-serious-without-whiplash)). Playtest check: players should be able to name "the map where I *understood*," never "the map where it got dark."

| Dial | Act I · Pest Control | Act II · First Contact | Act III · The Quiet | Finale · Clearing the Way |
|---|---|---|---|---|
| **Overall voice** | Bright, quick, punchy, satirical | Same voices, fewer jokes landing; questions left unanswered | Plain words, short sentences, room for silence | Warm, sincere, earned; callbacks in full |
| **Humor source** | World tone: memos, QUILL's Joke of the Shift, slapstick pops, Bricks's deadpan, Zibzab's honesty, Kip's invented records | Jokes that trail off or curdle; gallows humor starts | Only between people who care about each other | One returning laugh (Pebble, QUILL, Zibzab's fee) |
| **Exclamation-point budget** | Anyone except Bricks and Ves'thara | Sterling freely; QUILL, Kip, and Goldie sparingly; Zibzab in patter | **Sterling and Pebble only** | Pebble, Sterling's last line, the final lyric |
| **Sentence length (typical)** | 8–14 words | 8–14 words, more ellipses | 4–10 words | Any; let a few lines run long |
| **Memos** | Cheerful satire, puns, wellness tips | The same template, with creepier contents | Terse, then automated ("Your access has been updated.") | None, except Sterling's farewell |
| **Barks** | Playful reactions, puns, praise | Uneasy reactions; QUILL notices things | Clipped tactics, worry, care | The song is the bark |
| **Results screen** | "PESTS PROCESSED: {n} ★ Top 5%!" | "Pests processed: {n}." | "Evacuated: {n}." / "Sheltered: {n}." / A3M5's "Carried: {n} of {total}." (none on a map with no meter); the Holdout's card "Held." | "PESTS PROCESSED: 0" (the epilogue flips it to "REMEMBERED: {n}") |
| **Loading tips** | "Remember: a clean perimeter is a happy perimeter!" | "Remember: a clean perimeter." | "Remember." | Post-game: "Remember them." |
| **Codex** | *Pest Field Guide*: smug PR copy, redactions, bounty stars | Annotations: QUILL unredacts; Ves'thara writes in the margins | *Field Journal*: original and corrected entries side by side | — |

**Act I rules.** It's a comedy, and every joke is a planted seed. Nobody is a person yet; the Skitterkin are "pests," squeaky and cartoonish (the Kingdom Rush contract). The darkness exists only as background facts the player can notice: the path direction, the Tidybots, the Peeker, "(Per policy.)" One crack is allowed, at the very end (the Quiet Wave and the camera frame), and it stays quiet.

**Act I system copy (the M1 HUD and results).** Everglow's voice, brief, never scolding; the code homes are `src/ui/screens/Results.tsx` (its kicker, headline, and the Title's tip in `src/ui/screens/presentationText.ts`; its counter line in `src/story/counter.ts`), the components in `src/ui/hud/`, and `src/app/hudText.ts`.
- **Results:** kicker "Shift report · Exemplary!" (win) or "Shift report · Incident logged" (loss); headline "PERIMETER SECURED!" or "MINOR OPERATIONAL HICCUP" (the euphemism dictionary's word for a disaster); the counter "PESTS PROCESSED: {n} ★ Top 5% of Technicians!" (this run) and under it "Career total: {n}" (the lifetime count); the debrief (the map's act-file debrief lines, verbatim, under the speaker's name plate; D028; a loss shows the map's supportive "(on a loss)" line instead); buttons Retry and Continue (Title outside a campaign; Shift board after a loss), plus "Change loadout" where the map offers the loadout screen.
- **Results payroll** (what the run paid, headed "Payroll"; amounts read "+{n} Stardust" / "+{n} Intel"): the Stardust line is "Shift bonus" (first win), "Overtime bonus" (a replay win), or "Effort stipend · {w}/{W} waves" (a loss), and a 0-Stardust training map adds "· Training shifts are unpaid!" to a win's line. A loss on a cleared shift reads "Effort stipend · Shift already cleared!" (it pays 0, said cheerfully, never as a scolding). The save's first Stardust is tagged "FIRST PAYDAY!" on its line, and only that once, while the shop is still locked, does "Banked for Zibzab's shop. Opens after Special Delivery." show under it. On a win the map's medals follow by name, then its optional objectives by name (Clean Audit), each the same way: a first-time one tagged "NEW!" with its Intel, one held already "On file", one not earned "Next time!". The card's line "Career total: {n}" ticks up with the counter. Title: "Start shift" and "EVERGLOW · Brighter Every Day!".
- **Results stamps** (story-only, red, askew beside the headline; core-loop §6.2): A1M5's "CONTAINMENT LAPSE" when that run spared the Quiet Wave ([campaign.md §6.1](campaign.md#61-the-choices)). Stamps are ASCII capitals, at most 20 characters.
- **Pause menu** (Esc with nothing to cancel, or the HUD's Menu button, "Menu (Esc)"): the heading "Shift paused", the buttons "Resume", "Retry shift", and "Quit to base" ("Quit to Shift board" before the base opens, "Quit to Title" outside a campaign), and under them "Leaving files the shift as an incident. Pests still count!" (it never scolds the player for leaving).
- **Briefing:** the heading "Shift briefing" and the button "Clock in". The threat-intel strip names each threat as campaign.md §4.8 does ("Fast", "Armored", "Hollow clusters" for the Motes' clusters); runners (`fleeing` groups) are never threats: one "Skittish" chip stands for them all, its tooltip "Runners: {their traits, lower case, comma-separated, as adjectives} · They don't hurt the core." ("Runners: fast, huddled · They don't hurt the core."), and a trait only runners bring isn't listed and reads "Required: {Counter}" ("Required: Armor") with the owned towers that answer it, or "Nothing owned answers it yet"; each medal shows "On file" once earned. The map's optional objectives follow the medals: the name, its one-line description, and "+{n} Intel" ("Crew Logs · Clear both crew-log rigs. · +1 Intel"), or "On file" once the save holds it. The medal lines say what earns them in plain words: "Win the shift." (Victory), "Win with no leaks." (Perfect Core), and the Challenge's own line.
- **HUD notices:** "Not enough credits", "{Tower} ships at wave {n}" (a held-back tower; "{Tower} locked" with no wave), "Can't build there", "Uplink recharging" (the Orbital Strike's cooldown), "Can't target there", "Max tier", "Wave in progress", "No waves left", "Not online yet", "Click it (no tower armed) to send the drone" (an armed click on wreckage), and "This one comes in its own time" (W while the next wave is the Quiet Wave, which can't be called early). While paused: "PAUSED" (not while a pausing panel or full-screen scene holds the battle: the scene says so). As a wave starts: "WAVE {n}".
- **HUD labels:** "Start" / "Call +{n}" (the early-call bonus), "Ready", "Pick a target · Esc cancels", the tower panel's stat line ("8 dmg · 2/s · range 3"; a shell or flak burst adds its radius, "· splash 0.8", Flak Curtain's included) and "Next: +3 dmg", the strike's tooltip "200 damage in an area after 1 s. Recharges 45 s.", and the upgrade teach's hint "Click a turret to upgrade it (U)" (from W2's countdown until the first upgrade; D028). At tier 3 the panel heads its two spec cards "Specialize: pick one"; a locked pair says when it opens, naming the map as the base's hints do ("Engineering unlocks after The Audit"). A spawn carrying an "incoming" flag reads to the tile cursor as "…, incoming flag. Enter starts wave 1." ("Enter calls wave {n}." in a countdown). The aim hint adds "Enter fires" while the keyboard cursor shows. The medal tracker's tooltip on a forfeited medal is "Next time!" (never a scold).
- **Fire control** (the bottom-left group): the master switch reads "Hold" / "Held" ("Hold fire, all turrets (Shift+H)"); the tower panel's toggle reads "Hold fire" / "Holding fire". H with nothing selected says "Pick a turret first · Shift+H holds all". Once spare runners unlock, "Spare" / "Sparing" ("Spare runners, all turrets (Alt+H)") and the panel's "Spare runners" / "Sparing runners"; on A2M1, until it's won, the teach's hint "New filter: Spare runners" with its Alt+H badge (QUILL's cue line in the HUD's words; it says how, never what to do with the runners). The word changes with the state, not only the color.
- **Act I HUD (T312c):** the name plate "JPT-1 · {callsign}" (system copy, like the Shift board's); Clearance Sale's tag "SALE -40% x3" and Rapid Deploy's "FREE" price; an ability slot's wave cooldown "3 waves" (a press on it says "Clearance Sale: Ready in 3 waves") and Ready Room's "FREE"; the wave preview's "NEW" tag, and a neutral's "MAIL" tag with the hold-fire glyph (Gerald; never "NEW" or "AIR"); the salvage teach's hint "Click wreckage to send the salvage drone" (any map with wreckage, from W2's countdown until the drone is first sent, or for two waves); the Time Dilation teach's hint "Time Dilation slows the flock" with the slot's key (A1M3, as the flock comes in reach, until it's first cast); the Hold Fire teach's hint while Gerald flies, "Gerald is the mail. Hold fire" (Shift+H), and on his second pass, which Bricks's radio line asks to be held turret by turret, "Gerald is the mail. Hold fire: H one, Shift+H all": QUILL's request in the HUD's words, never a scold; an objective's tooltip is its own description, or "Next time!" once this run can't do it. HUD text is ASCII ("-" and "x", not "−" and "×"), since Silkscreen has neither.
- **Character creation:** the intake form's copy lives in [campaign/act1.md § Character creation](campaign/act1.md#character-creation--new-hire-intake). Settings' **Your file** section edits the name and pronouns ("Update file"; on success "Filed! Your name tag is being reprinted."), shows the callsign and the reason ("· final") read-only, and says "Load a campaign to update your file." without a save. The Shift board shows "JPT-1 {name} · #ED-447" under its heading: system copy, so it doesn't break the `{name}` rule for NPCs (§3).
- **Checkpoints** (Act II on; core-loop §2.12): as one is taken, a small HUD cue "Checkpoint · Wave {n}" for 3 s; after a loss, Results leads with "Retry from wave {n}" (beside "Retry"); the resumed battle opens paused with the notice "Resumed before wave {n}. Unpause when ready. Perfect Core and the Challenge need a shift from wave 1."; a retry that can't be restored lands on the campaign screen with "That checkpoint couldn't be restored. The shift is safe to play again from wave 1."; a loss after a resume pays "Effort stipend · {w}/{W} waves since wave {n}"; a win after one explains its medals under the payroll: "Resumed from wave {n}: Perfect Core and the Challenge need a shift from wave 1." (a fact, never a scold).
- **Base shelves** (Research, Shop, Engineering, and Xenotech; `src/ui/screens/Shelf.tsx` and `storeText.ts`): a locked tab or pane reads "Opens after {map}" ("Opens after Special Delivery"), and an item not stocked yet "Arrives after {map}". A map the player can't see yet is named by its position, never by its name: "Shift {n}", or "Shift {n} (coming soon)" while its content isn't built. The player sees Act I's maps (the Shift board lists them all) and, from Act II, the maps the star map shows (the won ones and the frontier). The Shift board ends on one dimmed, padlocked row for Shift 6 that never names its map, so the board never dead-ends: "Shift 6 · Coming soon" while A2M1 isn't built, and "Shift 6 · Locked" once it is; after A1M5 the star map names Rig Nine. A tune-up or spec unlock for a tower not owned reads "Needs the {Tower}"; a spec unlock whose specs haven't shipped yet reads "Arrives in a later shipment" (D064); a bought one reads "Owned". The **Xenotech** tab is Ves'thara's and stays hidden (no padlock, no hint) until A2M5 is won, then wears a NEW tag until first opened; its gift row reads "Given: Prism Spire" (as Results does), and an attunement whose tower needs the Prism reads "Needs the Prism Spire" until it's owned.
- **Sector map** (the star map, the campaign screen once A1M5 is won; [design/core-loop.md §1.1](../design/core-loop.md#11-the-star-map)): the header's kicker "Everglow · Perimeter Ops · Slot {n}" ("· Dev save" for a dev save), the heading "Sector map", and "JPT-1 {name} · #ED-447" under it; the banks as on the Shift board. The first time a save opens it, a notice: "Access upgraded! Perimeter Ops now covers the whole valley." The node panel: the kicker "Shift {n} · {place}" ("Shift 6 · The Diggings"; the place is campaign.md §2's biome column), the map's name, its state ("Next up", "Cleared", or "Coming soon"), its **tagline** (the italic line under the map's heading in its act file, verbatim: "Rig Nine stopped answering. Go take a peek. Minor operational hiccup!"), the briefing strip's threat names and "Required: {Counter}", the medals by name (an earned one "On file"), the optional objectives by name, and the button "Start" or "Replay" (named "Start Rig Nine", "Replay Orientation Day" for screen readers, as on the Shift board). A teaser shows only its kicker, name, "Coming soon", and tagline (after A2M3: *Second Harvest*, whose tagline ends "Ask Zibzab where stardust comes from."). Footer: "Title", "Settings", "Base". The chart's labels: "The Spires", "Everglow Gardens", "Surge corridor" (from A2M5 won: "The Long Walk", with "Surge corridor" struck through above it), and "No survey data" over the north band; the Deep Halls are unlabeled until a map has named them. For screen readers the chart is "Sector map of the valley: the colony in the south, the Spires in the north", and a node is "Shift {n}, {name}, {place}. {State}. {k} of 3 medals." (a teaser: "Shift {n}, {name}, {place}. Coming soon. {tagline}"). In star map mode every button that read "Shift board" reads "Sector map" (the Base's way back, the loadout screen's back, Results after a loss, and the pause menu's "Quit to Sector map" where it would name it). No string on the screen names a map the star map doesn't show.
- **Pest Bounty Board** (the base's "Bounty" tab, Acts I–II; [design/core-loop.md §6.6](../design/core-loop.md#66-the-pest-bounty-board)): Everglow PR, cheerful, the same in both acts (the satire is in the content: from A2M4 Kip is "on assignment: Reclamation"). Heading "Pest Bounty Board", "Quarter to date"; rows "#{rank}", the name, a note, and the score: "K. Vandermeer" ("The Exterminator · three quarters running", from A2M4 "(on assignment: Reclamation)"), "JPT-1 {name}" ("You!"), "M. Haddad" ("Dome 3 · nights"), "P. Lindqvist" ("Terraces · on leave"), "Tidybot 4" ("Honorary"); the foot line "Top score at quarter end wins a framed certificate. Ties are settled by Kip." (the certificate is `memo_a1_02`'s; the ties are the codex entry's).
- **Text in Silkscreen** never shows "&" (the font draws it like "$"): the text pipeline writes "and", and the base's R&D tab reads "Research" (D059).
- **Radio (M1):** the map's radio lines and barks from its act file, verbatim, with the speaker's name plate (QUILL, Bricks, Goldie, Kip). A reply lands a short beat after its cue and shows under it (Bricks's "It's Wednesday." on QUILL's punchline; D028). Two system-driven slots (D059), both written as cheerful help, never as blame: QUILL's `enemy_leaked` line for the first leak of a given enemy (A1M2's first Hauler through the gate), and QUILL's once-per-shift `bank_nudge` when a build phase opens with credits sitting unspent ([core-loop.md §6.3](../design/core-loop.md#63-barks)), which plays on its own after the countdown's lines and never as a reply to them (D061). A map may also carry a `tower_issued` line for a tower Everglow issues it: it plays as the shift starts, the first time the save brings that tower into a battle, and introduces the tower and its link (QUILL's Sprinkler line on A1M2).
- **Full-screen staging** (A1M5; what it looks like is [art-direction.md § Dialogue presentation](../art/art-direction.md#dialogue-presentation)): the party's record counter reads "Quarterly results", "Pests processed: {n}", and "New record!" as it lands; the stinger's camera feed shows only its own display, drawn in the sprite ("RIG 9 · CAM 2", "LIVE", then "NO SIGNAL"), and its screen-reader label is "Rig 9, camera 2, live: static, a shape for half a second, then no signal" (a shape, never a name, as Act I's Hollow rule asks).

**Act II rules.** The jokes keep coming and start landing wrong. Characters notice and stop finishing sentences. Satire turns creepy through *content*, not tone: Sterling's memos sound exactly the same and say worse things. Ves'thara is the first voice that refuses to joke at all. Each map lowers the dials a little.

**Act II system copy (Results and the Title; the presentation dials, [core-loop.md §6.7](../design/core-loop.md#67-per-act-presentation-dials)).** The copy reads each map's dials, never its act. Everglow's system voice keeps its words (*curdle by repetition*, §3); what goes is the card's one cheer.
- **C2 (Zibzab's Price)**, on A2M4's card and, if never answered there, on its panel at the base: the stake heads it, "The whole bank: {n} Stardust"; under each option what it pays, Sell's "+{n} Intel · Zibzab Tune-up" and Return's "Fee: an IOU" (the payroll row's own words); the base panel closes on "Continue". Never a verdict (D138).
- **Tower cards** (the loadout and the shelves) add a note where a tower's name could mislead: the Seer's Lantern's "Detection and Mark. Doesn't light the dark" (`towerRoleText`, D138).
- **Results:** kicker "Shift report · Filed" (win; the loss's "Shift report · Incident logged" is unchanged); the headline stays "PERIMETER SECURED!" or "MINOR OPERATIONAL HICCUP"; the counter is the table's "Pests processed: {n}." with no star and no brag, and "Career total: {n}" beside it. Screen readers hear the line as written (Act I's reads "PESTS PROCESSED: {n}, Top 5% of Technicians!", no star). Act III's kicker is its own (below), and the finale's follows it until M8.
- **Act II HUD (M5; `src/app/hudText.ts`, `src/ui/hud/`):** the Escort meter reads its label ("Evacuated"), "of {total}" under it, and "Lost" with its pips (or "{lost}/{maxLost}" in words); its screen-reader name is "Evacuated {n} of {total}, lost {lost}/{maxLost}", plus ", few left" with the alarm. On an Escort the medal is named "Perfect" (no core to keep) and its row reads "Win with no refugee lost." (A2M5, which pivots: "No leaks, then no refugee lost."). The tower panel: a beam's "{n} dmg/s" and "ramp ×{cap} in {s} s", the "Ramp ×{now}" row, "Next: +4 dmg/s · ramp ×5 in 8 s"; Sundown's "-{n}% range (dark)" and "Lit: full range"; spec traits "{n} beams" (and "1 beam" where a spec gives one up, Truthlight), "echo {p}%" and "{r} tiles", "Unnerves {s} s", "Mark +{p}%", "no evading", "detect {r}", "Marks all in {r} +{p}%". The next-wave preview's Escort chip: "+{n} walking" (screen readers: "{n} refugees walking"). The relabel holds the old meter's number beside the struck label, or "—". The threat strip writes the auras in sentence case ("Shield aura"). A debrief's silence (§5.6) shows on Results as a quiet "…" in the speaker's colour, with no name plate.
- **Title tip:** the loading tip of the slot Continue opens, by its next map (Act II's "Remember: a clean perimeter." from A1M5 won; the post-game's "Remember them." once the finale is won); Act I's with no save.

**Act III rules.** Humor survives only as care: Pebble mangling QUILL's jokes, Bricks being gruff at a teacup-sized child, Goldie's lettuce in the evacuation trucks. Use silence as a line (§5.6). No corporate voice except Sterling, who never changes. Specific, concrete details carry the grief ("He stopped counting the days.").

**Act III system copy (the presentation dials from A3M1, and the finale's).** Everglow's system voice keeps its words but has no exclamation points left to spend (the table's budget: Sterling and Pebble only), so its cheer ends on a period instead (*curdle by repetition*, §3). The rule is `spent` in `src/ui/screens/presentationText.ts`.
- **Results:** kicker "Shift report · Auto-filed", on a win and a loss alike (nobody files it any more; the headline still tells them apart); headline "PERIMETER SECURED." (a period, not the old "!") or "MINOR OPERATIONAL HICCUP"; the counter line is the map's meter ("Evacuated: {n}.", "Sheltered: {n}.", A3M5's bearers "Carried: {n} of {total}."), with no star, brag, or career line, and a map with no meter (Defend, a Protect map with no bearers) has no counter line at all ("Held." is only the Held card's headline). The medal and objective rows mark a first-time one "New" and one not earned "Next time." (never "NEW!" or "Next time!"). On a map that is or turns an Escort (A3M1; A2M5, named so from the briefing on), on A3M5, whose asset is its bearers, and on the finale's choir map (no singer hushed), Perfect Core is named plain "Perfect", as the act files list it.
- **Results payroll (gift stones):** the payroll is headed "Given", and its Stardust line reads "Gift stones" beside the warm-gold stone; a loss adds "· {w}/{W} waves", and a loss on a map already cleared "· Walked before". A3M2's Clean Exit adds its refund row ("Refunded · Orbital Strike Mk II", "+2 Intel") and, under the payroll, "Revoked: {Tower}, Orbital Strike", plain, never a verdict.
- **The Held card (A3M3):** the headline "Held." and the sub-line "Evacuated: {n}." and nothing else but the way on ("Continue"): no kicker, no stats, no payroll, no debrief (core-loop §6.2).
- **The SEAL (A3M3; core-loop §2.11):** one button, its label the input's name in capitals, "SEAL"; a screen reader hears "SEAL, not yet" until it arms, then "SEAL". No other words on the screen: Bricks's lines are the radio's.
- **The Asset Yield Log** (A3M2's `a3_m02_scene_confession`, after Results; act3.md § A3M2): the header "ASSET YIELD LOG · ENTRIES: 41,206 + {pests_processed}" (the lifetime count, comma-grouped); each entry "{nnn,nnn}  D{dddd} {hh:mm:ss}  TILE {cc,rr}  YIELD 0.{nn}  #ED-{nnn}", the others' under other technicians' numbers (never Bricks's #ED-112), every one after the 41,206 under "#ED-447"; its screen-reader label "Asset Yield Log, 41,206 entries from before you arrived, then {n} logged under #ED-447, each lit as it scrolls past." The directives that follow are the scene's `system` lines.
- **Title tip:** "Remember." (the table's).
- **Codex:** titled *Field Journal* (its list reads "Field Journal {n}/{total}").
- **Wave preview under QUILL's lockout** (A3M2 from W8): where the next wave's groups would be, the lockout's "ACCESS RESTRICTED" and QUILL's leak line for that wave, verbatim from its radio (its cough, "Ahem."), until the wave starts, under its name ("QUILL"; a screen reader hears "QUILL: {line}").
- **QUILL offline** (A3M5 under C4 Rewrite; core-loop §2.11): nothing is written for the silence. Every QUILL line on the map (briefing, radio, cues, barks) is skipped by the runtime, so author the map's QUILL lines as usual and give `system` the threat intel under the `rewrite` branch. At the base, from C4 until A3M5 is won, Research shows its items with no QUILL copy, no intro, and no thanks.
- **Gerald's status text** (`gerald`, A3M4's "DELIVERY: COMPLETE."): a drone's readout, capitals and a full stop, shown in teal beside his icon; never speech.
- **Act III HUD** (M6; `src/app/hudText.ts`, `src/ui/hud/`): the trackers' tooltips say "{Medal}: Next time." for one this run can't earn (`nextTimeMark`, Results' mark). The Holdout's meter is "Evacuated" over "of {total}" and nothing else (no "Lost" row); its screen-reader name "Evacuated {n} of {total}", plus ", many lost" past the low mark. The objective tracker's row for a group (A3M1's The Matriarch's Young) adds "+{n}" while that many of the column walk, heard as ", {n} on the road". Revoked slots say it with their stamps ("LICENSE / REVOKED", "UPLINK / REVOKED"; the art); the notices stay "License revoked" and "Uplink revoked", and QUILL's slot under its lockout reads "Locked out". The loadout screen's revoked cards read the same: the class "License revoked" under its stamp, the Orbital Strike "Uplink revoked"; a core-only protocol on a map with no core reads "No core on this shift", and once the screen has benched it for another, "Benched: no core on this shift" (D143, D144; no "!"). Aiming Underfoot says "Pick a path tile". The tower panel's lines for the M6 towers: the Den "{n} swarmlings · {d} dmg/s each · range {r} · latch {s} s · Chilled {p}% · ×2.5 burrowed" ("Champions", "· air too" for Brave Hearts; "Next: +1 swarmling", "latch +1 s"); the Choir "+{p}% damage in {r}" and Lullaby's "Lulls in {r}" ("Next: +5% damage · +0.5 reach"); the Bloom "field {r} · Chilled {p}% · Stasis {s} s every {t} s" and Gravity Well's "pulls 1.5 (20 s)" ("Next: pulse 2 s sooner", "+0.5 field · Stasis +0.5 s"). The automated memos' letterhead (from A3M2) is branded "Everglow Automated Systems", with no sun.
- **Act III part two's screens** (M7, T714; `src/ui/screens/`): the copy follows the Act III rules (no system "!"). Gerald's papers carry only what act3.md gives them (Form P-19, "Nomination of Beneficiary", "Sgt. I. Okonkwo", "19 years", the beneficiary, a RECEIVED stamp; the key's slip in Bricks's words; Kip's slip only `R2-0001`). C4 answered on the card shows the answer and "QUILL will remember that." as C3's does. Zibzab's crate: "Zibzab's crate", then "Every tune-up rank your Vrell turrets were missing, installed at no cost." (or "Your Vrell turrets are fully tuned already. Pick one Field Protocol instead."; with nothing left, "You own everything it could hold. The sticker was the point."), the sticker "No refunds", and "Take the crate". The jailbreak asks first: "Brings back the {class} on jailbroken firmware: the same stats and specs, the Everglow plate scratched out, a Vrell patch on." over the price line, price first ("Free: Goldie's engineers did the work." or "Price first: 300 Stardust."), and "Not now" / "Jailbreak it". The stages' screen-reader labels describe what is drawn (the envelope and its papers, the room and the lamp warming, Dome 1 and "Callsign: Waykeeper, written over Thorn.").

**Finale rules.** Everything comes back: the jingle, the counter, the name, the callsign, the joke. Sincerity is allowed now because it was earned. Keep lines short in Phase 2, where the song is doing the talking.

**Finale system copy** (the Act III rule holds: no system "!"). The HUD: "Voices" with its Hushed pips, "HALTED" while the choir is halted, "Pests processed" counting down under the boss bar, and "Suspended by Directive 0" on the dark Time Dilation (core-loop §2.10). The phase banners: "The Descent" over W1's "Wave 1", and "The Halls" over "The Leaving Song" as Phase 2 begins: the boss bar above already names the Unsung, so the banner names what the choir does, by the name Pebble gave the song in A3M1. Results: "PESTS PROCESSED: 0" as the won card's headline (the counter as Dawn left it, on the dawn gradient; the card never says "REMEMBERED", so the epilogue's flip is the first time the word is shown), the medal "Perfect" (no singer hushed), and the row "Voices held", "{n} of {N}" (core-loop §6.2), with Continue alone. The close: "PESTS PROCESSED: 0" flipping to "REMEMBERED: {n}", and Stay's final image "PERIMETER STATUS: OPEN" (core-loop §6.8). The Title, with the finale's run saved: "Resume the Long Walk", and on the field "The Long Walk resumes at {place}. Unpause when ready." (core-loop §2.12). Under Keep, QUILL's rebuild word after the knock-knock shows under PAUSED, plated QUILL and in QUILL's voice, not the system's: warm, never a scolding, and naming no key, so a mouse player isn't told one; it goes at the player's own press (the line is in [finale.md § FIN](campaign/finale.md#fin--clearing-the-way), *Phase 2 cues*).

**Post-game system copy** (T863; the Act III rule holds: no system "!"). The post-game is QUILL's sim deck (D156): drills, none of it real, nobody counted. The Sector map at dawn: the plate's heading "QUILL's sim deck" and under it "Drills only. None of it is real, and nobody is counted.", its rows "Endless" or "Challenge" over the map's name, and "Watch the epilogue"; Endless (*The Long Shift*): its panel kicker "Endless · Dome Row at dawn", its tagline "Dome Row, rebuilt in the sim. The shift never ends. Hold as many waves as you can.", "Seed", "New seed", "No run on this seed yet." / "Best on this seed: {n} waves.", "Your best: {n} waves, seed {s}.", and "A seed is a whole number." for a bad entry; a challenge's kicker "Challenge · {place}", "New" or "Cleared", its rule's tagline, and "Medals here pay Intel."; under Stay the colony's label "Wayside" (Everglow's "Everglow Gardens" struck above it). The HUD's Endless line: "Warm-up", "Needs {counters}", "Then +{counters}". The Endless score screen: "Endless · The Long Shift", "{n} waves held." (or "Every wave held." once a run holds them all), "Seed {s} · New best." or "· Best on this seed: {n} waves." (left out while the records list shows that seed), "Best runs" (only when the records hold another seed), and "Run it again", "New seed", "Sector map". The plate's words and the map names are `content/postGame.ts`'s; the name "The Open Perimeter" belongs to Ending A alone ([bible.md §10](bible.md#ending-a-default-the-open-perimeter-stay)).

---

## 3. Comedy rules

1. **Character-driven, never generic.** Each character has a joke engine: Sterling's toxic positivity, QUILL's sincere dad jokes about policy, logistics, and lettuce, Bricks's deadpan (he fact-checks QUILL's jokes: "It's Wednesday.") and tower names, Zibzab's ruthless honesty, Goldie's lettuce devotion, Kip's records in categories he invented ("'Most Records Set, Terraces Division.' I made the division."), Prim's measurements, and Everglow's euphemism dictionary ([races.md](races.md#everglow-dynamics)). Write jokes from inside the engine.
2. **Punch up.** Satirize Everglow, bureaucracy, positivity culture, and quarterly targets. Never make a joke at the expense of Skitterkin suffering, the dead, or grief. Slapstick on enemies (pops, pratfalls, confetti) belongs to Act I only, and thins out across Act II.
3. **Every running gag is a loaded gun.** Register every recurring Act I gag in the joke-to-tragedy ledger ([bible.md §8](bible.md#joke-to-tragedy-ledger)) with a planned callback. A gag with no callback isn't a running gag; cut it or give it one.
4. **Specificity is the punchline.** Use numbers, form numbers, names, and exact percentages ("Smiling detected at 61% of mandated sincerity").
5. **No pop-culture references, memes, internet slang, or fourth-wall winks.** The world must stay sealed so the late game can hurt. (Handbook §12.4 and Form 88-B are in-world, so they're fine.)
6. **Rule of three, with the third time changed.** A gag appears in Act I, curdles in Act II, and turns in Act III. Example: Bricks's pension count, then the voided pension, then "stopped counting."
7. **Curdle by repetition, not replacement.** The Act II version of a joke uses the same words as Act I. What changes is what the player knows.
8. **Gallows humor is a character choice.** In Act III a joke means a character is coping. Let other characters react to it.
9. **One joke may live inside a tear beat, and only if it makes the beat hurt more.** Canon example: Bricks at the SEAL, "Kid. It's okay. Turns out I like this song." (He hated the jingle for the whole game.) No other jokes go in the three tear beats.
10. **QUILL's jokes are bad on purpose.** A QUILL joke is a pun or dad joke followed by "...That's the joke." In Act I it is the scheduled **Joke of the Shift** (one per map, fifty pre-approved by the Morale Module), and Bricks's flat reply is the laugh. Never make QUILL actually witty in Act I; its sincerity is the joke. Its Act III jokes are still bad, and that's what makes them brave.

**Protected words (never say them early):**

| Word or fact | Not before | Except |
|---|---|---|
| "refugee," or Skitterkin "fleeing" stated as fact | A2M3 | QUILL's "(Toward... the wilderness? Odd.)" observations |
| Stardust is the dead | A2M4 | Zibzab, if asked from A1M3 (`asked_zibzab_early`) |
| "Hollow" | A2M1 | Act I says "something on camera," "a smudge," or "Rig Nine isn't answering" |
| The jingle called "the Leaving Song" | A3M1 | — |
| The player's `{name}` from any NPC | A3M3 (Bricks, at the SEAL) | Never from Sterling. Bricks's A3M3 turret tag may *show* `{name}` a few waves earlier, because he wrote it before he said it |
| QUILL's directives by number | A3M2 | — |
| "Buffer" explained | A3M2 | Memos may use "buffer populations" from A1M4 with no explanation |

---

## 4. Where story is delivered

Story rides on channels that respect play. **Build-phase barks never pause the game; full-screen scenes do** (see [../tech/story-runtime.md](../tech/story-runtime.md)). **Key beats never live only on skippable radio:** a reveal or a turn goes in a script cue, a scene, the debrief, or the base.

| Channel | When | Length limit | Pauses? | Who | Notes |
|---|---|---|---|---|---|
| **Pre-map briefing** | Before the loadout | ≤ 8 lines | Yes (menu) | Companion, QUILL, a memo | Must include the threat intel hint ([../design/core-loop.md](../design/core-loop.md)) and foreshadow scripted events (for example the A3M2 revocation: "Sterling's on the line. She sounds... cheerful.") |
| **Between-wave radio** | The build phase between waves | 1–3 lines | **No** | Portrait plus text | Skippable, never blocking. Most map-specific story lives here. A line may carry one optional reply button, such as the knock-knock's "Who's there?" ([../design/core-loop.md §6.10](../design/core-loop.md#610-joke-of-the-shift-and-the-optional-bark-button)) |
| **In-wave barks** | Triggered by game state | 1 line | **No** | Any present speaker | Keyed to the bark matrix (§5.5) |
| **Mid-map script cue** | A scripted event (boss phase, pivot, revocation) or a player click on a world object (the A2M3 rock) | ≤ 4 lines | Optional brief pause | Any | Boss in-stage dialogue (Ves'thara arguing while you fight) uses this |
| **Full-screen scene** | About one per act, plus climaxes | ≤ 20 lines | Yes | Portraits, staged | A1M5 party, A2M4 truth, A3M1 song, A3M2 log, Dawn |
| **Debrief** | After results | ≤ 6 lines | Yes (menu) | Companion or NPC | Where C2 and C4 are offered |
| **Base conversations** | In the base hub | ≤ 8 lines per topic | Yes | Zibzab (shop), QUILL (R&D), others | Optional depth, including the `asked_zibzab_early` question. Story beats that need their own room are mandatory base scenes: QUILL's loophole (A2M6), Bricks's confession (after A3M1), Night Shift (after C4) |
| **Codex** | Unlocked by encounters and flags | ≤ 600 chars per version | — | PR, then QUILL, then Ves'thara | Optional depth; never required context (§6.2) |
| **Everglow Inbox (memos)** | Between maps | Body ≤ 600 chars, small print ≤ 140 | — | Everglow | §6.1 |
| **Results screen** | After each map | One headline, one sub-line | — | System | The counter's per-act labels (§2) |
| **Loading tips** | Loading screens | ≤ 80 chars | — | System | Erode by act (§2) |
| **Shop copy** | Zibzab's shop | Item description ≤ 100 chars | — | Zibzab | "Price first" format: cost clause, then pitch, then honest correction (§6.3) |
| **R&D copy** | QUILL's R&D lab | Item description ≤ 100 chars | — | QUILL | One line per item (§6.4) |
| **Xenotech copy** | Ves'thara's shelf (after A2M5) | Item description ≤ 100 chars | — | Ves'thara | One line per item, no price, no contractions (§6.5) |
| **Environmental** | On the map | — | — | Art and maps | Evie billboards, mining scars, the Peeker, Tidybots, memorial wreckage, path direction ([../design/maps.md §7](../design/maps.md#7-storytelling-with-the-map)) |
| **Enemy design** | Behavior, motion, and death effects | — | — | Design and art | Frightened versus hungry movement; Haulers' sacks; the death-tone ramp ([../design/enemies.md](../design/enemies.md)) |
| **Epilogue cards** | One at a time, before the counter and the credits ([core-loop §6.8](../design/core-loop.md#68-ending-choice-and-epilogue-cards)) | ≤ 240 chars each | Yes | Narrator | Modular, chosen by flags ([bible.md §10](bible.md#10-endings)) |

**Narrative budget targets:** about 200–400 barks across the campaign, 1–3 radio lines between most waves, one full-screen scene per act plus the climaxes, and one memo per map.

---

## 5. Dialogue format conventions

This section defines what the dialogue data must express. Field names match the runner's node kinds in [../tech/story-runtime.md](../tech/story-runtime.md#dialogue-runner): `line` (speaker, expression, text), `choice`, `branch`, `set`, and `end`.

### 5.1 Speaker IDs

| ID | Speaker | Portrait |
|---|---|---|
| `player` | The protagonist | Helmet, visor down (reflection variants) |
| `bricks` | Sgt. Ikenna "Bricks" Okonkwo | Standard 48×48 |
| `quill` | QUILL | Comms screen (scanline) |
| `sterling` | Director Joy Sterling | Standard (fixed smile; only the eyes change) |
| `zibzab` | Zibzab | Standard |
| `vesthara` | Ves'thara | Standard; frayed (Hollow-touched) variant from A2M5; dawn variant |
| `pebble` | Pebble | Standard |
| `goldie` | Marigold "Goldie" Pak | Standard |
| `kip` | Kip Vandermeer | Standard; Act II and Act III variants |
| `thrum` | Old Thrum | Standard |
| `chitterbloom` | Bramble (Everglow's codename: Matriarch Chitterbloom). Displayed as "Bramble" from A3M1 | Standard (large) |
| `prim` | Compliance Officer Prim | Comms screen |
| `gerald` | Gerald the mail drone | Icon only; status text |
| `pa` | Everglow public address | None (text with a speaker icon) |
| `kfa` | Kepler Frontier Authority forms | None (form styling) |
| `hollow` | The Hollow | **None.** Distorted text only (§5.6) |
| `narrator` | Epilogue cards and scene captions | None |
| `system` | UI and results copy | None |

New speakers need an entry here and in [characters.md](characters.md).

### 5.2 Expressions

Every portrait has the five base expressions from [../art/art-direction.md](../art/art-direction.md#5-portraits-and-icons): `neutral`, `happy`, `worried`, `angry`, and `sad`. If a line names no expression, it uses `neutral`. **Proposed character extras** (for art to confirm; until then, fall back to the base expression in parentheses):

| Speaker | Extra | Used for | Fallback |
|---|---|---|---|
| `quill` | `policy` | Every directive-driven line: a one-frame yellow flash and a flat mouth. This is the fair-play tell, so it must never be skipped | `neutral` |
| `pebble` | `singing` | The Leaving Song (eyes closed, round mouth) | `happy` |
| `thrum` | `singing` | The Leaving Song, humming along with Pebble in A3M1 (eyes closed, round mouth, her shell's seams lit) | `happy` |
| `vesthara` | `laugh` | Her one laugh, in Night Shift after A3M4 (short, surprised; brows up, eyes squeezed shut, lit) | `happy` |
| `sterling` | — | She has no extra. Her five expressions change only the eyes and brows; the smile is identical in all of them | — |

Portrait *variants* are chosen by flags or act, not by expression: Ves'thara's fraying threads, Kip's coat (and, from A3M5, his pin gone), QUILL's Purge status bar, Sterling's live feed on A3M5 (she flies "Shareholder Value" by remote), and the player's visor reflections. Under Purge QUILL keeps its expressions but loses the `policy` tell (no directives, no flash), and a silence of his blinks the status bar: write his Purge lines flat, and his "no line" as a silence.

### 5.3 IDs

Snake_case, following [../tech/conventions.md](../tech/conventions.md):
- **Scenes:** `<map_id>_<slot>`. Slots are `brief`, `w<NN>` (radio before wave NN, from `w01`), `cue_<name>`, `debrief`, `scene_<name>` (full-screen), and `base_<name>` (a base conversation topic). Examples: `a1_m01_brief`, `a1_m05_w08`, `a3_m03_cue_seal`, `a2_m04_debrief`, `a1_m05_scene_party`, `a1_m03_base_stardust`.
- **Labels:** any node may carry a `label` (snake_case, unique within its scene). A choice option's `goto` and a branch's `goto` and `else` name one; without one, play continues with the next node.
- **Barks:** pools in `barks/<trigger>.ts`. Bark IDs are `<speaker>_<trigger>_a<act>_<nn>`, for example `bricks_idle_fire_a1_01`.
- **Codex:** `codex_<entry>` with versions `original`, `annotated`, `margin` (Ves'thara's notes), and `corrected`.
- **Memos:** `memo_a<act>_<nn>`, and `memo_fin_<nn>` for the finale's (Sterling's farewell, `memo_fin_01`); a form that arrives with a memo is `memo_a<act>_<nn>_<form>` (`memo_a2_02_kfa`).
- **Epilogue cards:** no id of their own: a card is its slot and its condition (`EpilogueCardDef` in `content/dialogue/epilogue.ts`; the words are `content/dialogue/fin/epilogue.ts`).
- **Flags:** declared in `content/dialogue/flags.ts`. The canon story flags are listed in [bible.md §9](bible.md#flag-summary).

### 5.4 Text, tokens, and length

**Length limits** are measured *after* substitution at worst case:

| Kind | Hard limit | Target |
|---|---|---|
| Dialogue line | **120 chars** | ≤ 90 |
| Bark | **80 chars** | ≤ 60 |
| Choice option | **60 chars** | ≤ 40 |

Worst cases for measuring: `{name}` counts as 16 characters (the name-entry maximum), `{callsign}` as 9 ("Waykeeper"), and `{pests_processed}` as 9 (for example "1,234,567"). If a thought doesn't fit, split it into two lines; don't cram it.

**Tokens** (resolved by `story/text.ts`; full spec in [story-runtime.md](../tech/story-runtime.md#text-substitution)):

| Token | Resolves to |
|---|---|
| `{name}` | The player's chosen name. **Restricted:** see the protected-words table in §3 |
| `{callsign}` | The current callsign: Sprout, Thorn, or Waykeeper |
| `{they}` `{them}` `{their}` | The player's pronouns (subject, object, possessive) |
| `{theirs}` `{themself}` | The possessive pronoun and the reflexive |
| `{They}` `{Them}` `{Their}` | Capitalized forms |
| `{v:are\|is}` | Verb agreement: the first form for they/them, the second for she/he. Example: `"{They} {v:are\|is} the best tech I have."` |
| `{pests_processed}` | The lifetime counter, with thousands separators |
| `{evacuated}` | The current map's Evacuated, Sheltered, or Held count |
| `{glyph:sun}` | The Evie sun glyph in the pixel font (memo sign-offs) |

**Pronoun rule:** NPCs mostly speak *to* the player, so they say "you." Third-person references come up when NPCs talk *about* the player (Sterling to Prim, Bricks to Pebble, epilogue cards). Write those with tokens, and prefer phrasings that avoid verb agreement when it's easy.

**Typography:** use plain text. `*word*` marks emphasis, at most once per line, rendered as italic. CAPS are for Sterling's ENTHUSIASM, QUILL's warnings ("Do NOT shoot Gerald"), and system copy only. Use an ellipsis (`...`) for trailing off and an em dash (`—`) for interruption. Spell out numbers in speech when a character would say them ("four hundred and twelve days"); use numerals in UI, memos, and forms.

### 5.5 Barks

Barks are keyed to the trigger events in [../tech/story-runtime.md](../tech/story-runtime.md#barks): first leak, perfect wave, tower sold, low integrity, a specific enemy type killed, Hold Fire used, the player idle or **not firing at Skitterkin for N seconds**, a new enemy, a boss phase, and choice flags.
- Each bark has a **speaker**, a **trigger**, an optional **condition** (act, flags, map), and a **cooldown**. Pools are drawn at random with no repeats until the pool is exhausted.
- **Priority:** script cues, then boss lines, then a first-time trigger, then repeat triggers. At most one bark per 6 seconds of sim time unless it comes from a script cue.
- **Presence:** only characters on the radio this map may bark. That means QUILL plus the companion; others need a script cue.
- **One optional reply button** may ride on a bark or radio line ([../design/core-loop.md §6.10](../design/core-loop.md#610-joke-of-the-shift-and-the-optional-bark-button)). Author the reply line and the ignored line; both must work.
- **Silence is a bark.** After A3M3, a bark slot that would have gone to Bricks plays nothing, with his portrait frame dark for the duration. Author these explicitly as `silence` lines (§5.6).

### 5.6 Special line kinds (authoring conventions)

- **Silence:** a `line` with `text: ""` and an explicit duration. It shows the speaker's frame (dark, for Bricks after A3M3) with no text. Use it sparingly; it is one of the strongest tools in the game.
- **Hums and squeaks:** a parenthetical in text: `(hum, six notes)`, `(squeak)`. Skitterkin raw speech never gets translated subtitles in the same line; a translator speaks on the next line.
- **The Hollow:** speaker `hollow` and no portrait. Text is only *fragments of things it has consumed*, rendered with the distortion style (dropped letters, misregistered glyphs): `...brigh— every...`, `...logg...`. It never has an original line of its own.
- **QUILL's tell:** any line driven by a directive starts with "(Per policy.)" or ends with it, uses expression `policy`, and is the only use of that expression. A thought with the tell in its middle is split into two lines at the tell, words unchanged: the directive line ends with it (and flashes), and the line after it is QUILL's own (A1M2's "Suggested build site: beside Extraction Rig 3. (Per policy.)" · "The housing block will be fine. Probably!").
- **Forms:** speaker `kfa` or `system`, set in form styling, with numbered clauses.
- **A plate before a name:** a line may carry `plateAs` (1–16 characters) to show another name on its plate, for a speaker the player doesn't know by name yet: Bramble's first A3M1 line is plated "The Matriarch" until Pebble says "Her name is Bramble." Only the plate changes; the portrait and voice stay the speaker's.

### 5.7 Choices

- 2–3 options, each ≤ 60 characters. Tone tags for writers are `earnest`, `wry`, and `quiet`. Each choice node lists the flags it sets.
- C2–C5 are presented as dialogue choices ([bible.md §9](bible.md#9-the-choices)). **C1 is never presented as a choice.** No UI, no prompt, and no "QUILL will remember that." It is just Hold Fire and a quiet wave.
- Show "{Speaker} will remember that." feedback only for C3 and C4, and the delayed C1 echo in A3M1 ("Old Thrum remembered.", spared only; the cleared path gets no echo). Never for C2 or C5. Feedback is grace, never accusation.
- Don't preview payoffs in the option text. The player chooses *what*, not *which reward*.
- **Locked story choices** (C3's door, C4's directives, C5's ending, and any choice in the same scene) take no press for 700 ms, then answer to their numbered badges, or an arrow onto an option and Enter. A one-line keys hint sits under them, in words because Silkscreen has no arrow glyphs: "Keys: 1 or 2, or arrows and Enter" (`choiceKeysHint`, [`ui/dialogue/choiceLock.ts`](../../src/ui/dialogue/choiceLock.ts)). A screen reader hears the hint as the group's description. The lock's rules are in [story-runtime.md § Dialogue in play](../tech/story-runtime.md#dialogue-in-play).
- **Faces beside an answer** (C5 only): the voices who asked for it sit beside it as small faces, Pebble and Ves'thara by Stay and Bramble by Go (`ENDING_VOICES`, [`app/dialogue.ts`](../../src/app/dialogue.ts)), each with the face and plate of their last line in the scene. A screen reader hears the names after the answer: "We stay. We keep the way open. (Pebble, Ves'thara)". The faces show who asked, never what an answer pays.

### 5.8 Example (authoring shape)

A sketch only; the real types are in `content/dialogue/types.ts`.

```ts
// src/content/dialogue/a3/a3_m03_cue_seal.ts
export const a3_m03_cue_seal = defineScene([
  { kind: 'line', speaker: 'bricks', expression: 'sad', text: "That's all we're getting through." },
  { kind: 'line', speaker: 'bricks', expression: 'neutral', text: '(hum, six notes, slow)' },
  { kind: 'line', speaker: 'pebble', expression: 'singing', text: '(hum, six notes, along)' },
  { kind: 'line', speaker: 'bricks', expression: 'neutral', text: 'Do it, {name}.' },
  // The UI locks to a single SEAL button here (bible.md §12, item 8).
  { kind: 'end' },
]);
```

---

## 6. Special formats

### 6.1 Everglow memos

From, To, Subject, body, sign-off, and **small print**. The small print is where the fair-play clues live. Subject lines are cheerful in every act.

The memo texts' home is their content file ([`src/content/memos/act1.ts`](../../src/content/memos/act1.ts) for Act I, [`act2.ts`](../../src/content/memos/act2.ts) for Act II, [`act3.ts`](../../src/content/memos/act3.ts) for Act III, [`finale.ts`](../../src/content/memos/finale.ts) for Sterling's farewell), the way the item copy lives in `copy.ts`; the act files give each memo's subject and small print, and the sample below is `memo_a1_00`, verbatim.

```
FROM: Director Joy Sterling, Frontier Operations
TO:   Employee #ED-447 (Junior Perimeter Technician)
RE:   WELCOME TO THE GARDENS! {glyph:sun}

You're going to LOVE it here! That's not a prediction, it's a target! Your Orbital
Strike uplink is a little something from me to you. Use it in good health!

Stay Everglow! {glyph:sun} — Joy

Small print: Uplink access contingent on Q2 extraction targets. Pests are not to be
named (Handbook §12.4; see: Mr. Fluffington).
```

**Forms.** A KFA form that arrives with a memo is its own Inbox item, set on the KFA's off-white form panel with a stamp in a box at its foot (`format: 'form'`, `stamp`). It speaks the KFA's dialect ([races.md](races.md#the-kepler-frontier-authority-kfa): numbered clauses, passive voice, "the undersigned"), never Everglow's: no exclamation points, no sun, and it calls things what they are. Its From, To, Subject, small print, and sign-off follow the memo layout. A2M2's *Form 7-C: First Contact Incident 2361-A* is the first; it is delivered just before Sterling's memo asking everyone to disregard it, so hers opens first with the form under it.

Sample subject lines: *Mandatory Fun Friday Is Back! (Attendance Optional) (Required)* · *Q2 Results: Pest Losses Down 38%!* · *Buffer Populations and You: A Quick FAQ!* (A1M4; the body is about "wildlife management" and says nothing) · *Pension Restructuring Opportunity!* (A2M3) · *Re: Incident 2361-A. Please Use "Vandalism" in All Correspondence!* (A2M2) · *Long Night Readiness: Stay Positive!* (A2M6) · *We'll Get Through This Together!* (A3M1; sincere-sounding, with incriminating small print) · *Your Access Has Been Updated* (A3M2, automated, the first memo with no exclamation point).

### 6.2 Codex entries

Up to four versions per entry, each unlocked by story progress or flags: the `original`, QUILL's (or Everglow's) `annotated` note, Ves'thara's `margin` note (from A2M6), and Act III's `corrected` text. The Act III *Field Journal* shows the original and the corrected version side by side, so the text the player laughed at becomes the evidence.

The entry texts' home is their content file ([`src/content/codex/act1.ts`](../../src/content/codex/act1.ts) for Act I's originals, [`act2.ts`](../../src/content/codex/act2.ts) for Act II's entries and the annotations Act II adds to earlier ones, [`act3.ts`](../../src/content/codex/act3.ts) for the Field Journal's entries and the corrections Act III adds, [`finale.ts`](../../src/content/codex/finale.ts) for its last pages); the act files list which entries each map unlocks, and the quotes below and in the act files appear there verbatim.

**Annotations on screen.** An annotated version's text is the note alone, bracketed and signed; the codex shows it under the original it annotates, the original dimmed, so the record and what was written on it read together. Everglow annotates first (A2M1: Rig Nine's status update, signed by Frontier Operations, covering up); QUILL's annotations begin at A2M3 and correct the record in its own voice: what it logged, what it was told to call it, what it now isn't sure of. An entry QUILL won't file reads "[QUILL: Entry withheld.]" with "Withheld" in its photo frame (A2M3's "Pebble", filed under Personnel, not Pests). Ves'thara's margin notes, unlocked when A2M6 is won, are their own version (`margin`) with their own NEW badge, shown under QUILL's note on the same record, bracketed and led by "In the margin, in Ves'thara's hand:" (the Brood Hauler's below).

> **BROOD HAULER**
> *Original (Pest Field Guide, Everglow PR):* "Big, slow, and greedy! Carries stolen stardust. High bounty! Do not inspect cargo. Handling tip: aim for the sack! ★★★"
> *Annotated (Act II):* "[QUILL: Cargo inspected. Contents: young. I would like the record to show that I hesitated.] [In the margin, in Ves'thara's hand: They are carrying their children away from what you made.]"
> *Corrected (Field Journal):* "An adult who carries the warren's youngest on the Long Walk. The shell is armor for the young, not against you. Skitterkin say a Hauler 'carries the morning.'"

> **ELDER**
> *Original:* "Slow, old, and in the way. Slows the whole swarm! Clear it first for efficiency! (Vocalizations non-linguistic per Survey 2346, Okonkwo.)"
> *Corrected:* "Keeps the group at the pace of its slowest member so no one is left behind. The vocalizations are linguistic. (Amended Survey 2346, Okonkwo: 'Correction: they were singing.')"

Codex rules: the original voice is smug Everglow PR with bounty stars and the euphemism dictionary. Annotations are bracketed and signed. Corrections are plain, precise, and kind. Codex text is **optional depth**; a player who never opens the codex must still be able to follow the story.

### 6.3 Shop copy (Zibzab)

Format: **Price first: <cost>. <Pitch>. <Honest correction>.** He never says "free." The free Zapcoil sample's line is *"Price first: your next visit. First one's on me. Zibzab is patient."* That replaces "First one's free, friend!" in [../design/progression.md](../design/progression.md); "friend" is reserved for A3M6. Example item: *"Price first: 60 stardust. Barely-Dented Hull Plating! One previous owner, who barely exploded. Honestly? He exploded a normal amount."*

**The catalog's copy lives in [`src/content/upgrades/copy.ts`](../../src/content/upgrades/copy.ts)** (its one home; `copy.test.ts` checks these rules). Zibzab writes the line for every shop item: the global upgrades, the tune-ups, the Field Protocols, and the jailbreak (the Firmware row after A3M3; its A3M4 line from [characters.md](characters.md), and under the convoy, where it costs nothing, a line that still prices first and says "already paid", never "free" or A3M6's "Price first: nothing.").
- **The price is true.** He never lies, so every price he names is that rank's. A ranked item names the first rank's price, then the next ones ("then 200, then 300") or says it climbs ("and it goes up", "rising").
- **The pitch is true too.** It may be vague, never wrong: the Thumper tune-up's line names its three ranks, in order.
- **It holds in every act.** The base shows the same catalog line from A1M4 to the finale, so catalog copy uses **no exclamation points** (Act III's budget, §2; his spoken patter, like the example above, follows its act's budget instead) and no protected word (§3). His Act I warmth and the seeds go in the content instead: "pest" in quotes as Everglow's word (he sells to everyone), the shell as his house, Kip's bought talent.

### 6.4 R&D copy (QUILL)

QUILL writes one line per R&D item, ≤ 100 characters, in [`src/content/upgrades/copy.ts`](../../src/content/upgrades/copy.ts) with Zibzab's. It is QUILL's Act I voice without the exclamation points (the copy shows in every act, and QUILL loses them after A3M2): precise numbers, a sincere aside, and "(Per policy.)" on any line a directive drives (§5.6), like Mk II's reminder that the uplink is a privilege (it is revoked in A3M2). Its lines can seed its arc so long as they say nothing early: the protocol slot's line wishes it could choose its own policies (C4 Rewrite). Under C4 Rewrite, R&D shows no QUILL text during A3M5's offline stretch ([../design/progression.md §7](../design/progression.md#7-rd-tree-intel)).

### 6.5 Xenotech copy (Ves'thara)

Ves'thara writes the Xenotech shelf's lines (her gift's row and each attunement), ≤ 100 characters, in [`src/content/upgrades/copy.ts`](../../src/content/upgrades/copy.ts) with the others (`copy.test.ts` checks these rules). Her voice is [characters.md](characters.md)'s: spare and grave, formal, **no contractions**, images of light, glass, and memory. She **never names a price** (the shelf does) and **never says "stardust"**: she takes none (it is the dead), which is why the Aelari tune-ups stay on Zibzab's shelf for Stardust and their specializations in Engineering. No exclamation points, as for every catalog line. A line may say what a tower is for, in words that hold in every act: the Seer's Lantern's ends "Bring it when they do" (what hides, and what digs), since its role starts with Act III's burrowers and cloaks.

---

## 7. Names and pronouns

- **Sterling** uses "Four-Forty-Seven" in every scene, the epilogue, and her reference letter.
- **Bricks** uses the callsign (Sprout, then Thorn), later "kid," and `{name}` once, at the A3M3 SEAL.
- **QUILL** uses "Technician," later the callsign. Under C4 Rewrite it may use `{name}` in its epilogue card.
- **Ves'thara** uses "Counter," then Thorn, then Waykeeper.
- **Zibzab** uses "Technician" or "Valued Customer," and "friend" once (A3M6).
- **Pebble** uses "the tall one," then Waykeeper, and `{name}` once (finale).
- **Never hard-code** the protagonist's name, pronouns, or callsign (conventions.md).

---

## 8. Content guidelines

**Audience:** teens and up (aim for an ESRB T / PEGI 12 equivalent). The game should be emotional but never gratuitous.

- **Violence is stylized and bloodless.** Skitterkin deaths go from cartoon pops and confetti (I), to a pop and a squeak (II), to a brief, still body that fades (III), following the death-tone ramp in [../design/enemies.md](../design/enemies.md). There is no blood, dismemberment, or piled bodies. Hollow grabs on escort maps are a squeak, a struggle, and a vanish, never anything shown.
- **The processing is never shown.** Second Harvest appears through its exterior, the glowing vats, Tidybots unloading, the ledger's numbers, and people's faces. That is enough. Implication beats depiction.
- **No real profanity.** Use invented oaths: "Crater it," "Sweet moons." No slurs. No sexual content. Bricks's ex-wife jokes are affectionate and self-deprecating, never bitter or demeaning.
- **Death and sacrifice.** Bricks's death is chosen, protective, and on-theme; it is never framed as escape or despair. No character takes their own life or is framed as wanting to. QUILL never deletes itself. Characters in danger can be frightened, but grief is always treated with respect.
- **Children.** Pebble can be in peril and frightened. She is never harmed on screen, and she survives every branch.
- **Horror is dread, not gore.** The Hollow is wrongness, silence, and memory loss. Hushed people are dazed and blank, never disfigured.
- **Real-world groups.** No real nationality, religion, culture, or group is mocked. Characters' heritage is specific and respected (Bricks's Lagos childhood and jollof, Goldie's family names) and is never the joke. There are no accents in text.
- **The player is never forced to be cruel.** Options can be by-the-book or complicit, never sadistic. The harm the player does in Act I comes from the job, not from cruelty, which is exactly what the story is about.
- **Flashing and audio.** Hollow glitches and the SEAL moment must respect the reduced-motion and photosensitivity settings (accessibility backlog item in `tasks.md`).

---

## 9. Writer's checklist

Before a scene goes in:
- [ ] Every line is under its length limit after worst-case token substitution.
- [ ] Every line sounds like its speaker and only its speaker.
- [ ] The scene respects the act's exclamation-point budget and humor source.
- [ ] No protected word is used early (§3).
- [ ] At most one reveal, from the designated voice.
- [ ] Any new running gag is registered in the ledger with a callback.
- [ ] QUILL's directive lines use "(Per policy.)" and the `policy` expression.
- [ ] Choices don't preview their rewards; C1 has no UI at all.
- [ ] Nothing in the scene absolves or scolds the player.
- [ ] It works for a player who skipped every codex entry.
