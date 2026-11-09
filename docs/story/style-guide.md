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
| **Results screen** | "PESTS PROCESSED: {n} ★ Top 5%!" | "Pests processed: {n}." | "Evacuated: {n}." / "Held." / "Sheltered: {n}." | "REMEMBERED: {n}" |
| **Loading tips** | "Remember: a clean perimeter is a happy perimeter!" | "Remember: a clean perimeter." | "Remember." | Post-game: "Remember them." |
| **Codex** | *Pest Field Guide*: smug PR copy, redactions, bounty stars | Annotations: QUILL unredacts; Ves'thara writes in the margins | *Field Journal*: original and corrected entries side by side | — |

**Act I rules.** It's a comedy, and every joke is a planted seed. Nobody is a person yet; the Skitterkin are "pests," squeaky and cartoonish (the Kingdom Rush contract). The darkness exists only as background facts the player can notice: the path direction, the Tidybots, the Peeker, "(Per policy.)" One crack is allowed, at the very end (the Quiet Wave and the camera frame), and it stays quiet.

**Act I system copy (the M1 HUD and results).** Everglow's voice, brief, never scolding; the code homes are `src/ui/screens/Results.tsx`, `src/ui/hud/index.tsx`, and `src/app/hud.ts`.
- **Results:** kicker "Shift report · Exemplary!" (win) or "Shift report · Incident logged" (loss); headline "PERIMETER SECURED!" or "MINOR OPERATIONAL HICCUP" (the euphemism dictionary's word for a disaster); the counter "PESTS PROCESSED: {n} ★ Top 5% of Technicians!" (this run) and under it "Career total: {n}" (the lifetime count); the debrief (the map's act-file debrief lines, verbatim, under the speaker's name plate; D028; a loss shows the map's supportive "(on a loss)" line instead); buttons Retry and Continue (Title outside a campaign; Shift board after a loss), plus "Change loadout" where the map offers the loadout screen.
- **Results payroll** (what the run paid, headed "Payroll"; amounts read "+{n} Stardust" / "+{n} Intel"): the Stardust line is "Shift bonus" (first win), "Overtime bonus" (a replay win), or "Effort stipend · {w}/{W} waves" (a loss), and a 0-Stardust training map adds "· Training shifts are unpaid!" to a win's line. A loss on a cleared shift reads "Effort stipend · Shift already cleared!" (it pays 0, said cheerfully, never as a scolding). On a win the map's medals follow by name: a first-time medal tagged "NEW!" with its Intel, one held already "On file", one not earned "Next time!". Title: "Start shift" and "EVERGLOW · Brighter Every Day!".
- **Briefing:** the heading "Shift briefing" and the button "Clock in". The threat-intel strip reads "Required: {Counter}" ("Required: Armor") with the owned towers that answer it, or "Nothing owned answers it yet"; each medal shows "On file" once earned. The medal lines say what earns them in plain words: "Win the shift." (Victory), "Win with no leaks." (Perfect Core), and the Challenge's own line.
- **HUD notices:** "Not enough credits", "{Tower} ships at wave {n}" (a held-back tower; "{Tower} locked" with no wave), "Can't build there", "Uplink recharging" (the Orbital Strike's cooldown), "Can't target there", "Max tier", "Wave in progress", "No waves left", "Not online yet". While paused: "PAUSED". As a wave starts: "WAVE {n}".
- **HUD labels:** "Start" / "Call +{n}" (the early-call bonus), "Ready", "Pick a target · Esc cancels", the tower panel's stat line ("8 dmg · 2/s · range 3") and "Next: +3 dmg", the strike's tooltip "200 damage in an area after 1 s. Recharges 45 s.", and the upgrade teach's hint "Click a turret to upgrade it (U)" (from W2's countdown until the first upgrade; D028). At tier 3 the panel heads its two spec cards "Specialize: pick one"; a locked pair says when it opens ("Engineering unlocks after Shift 4"). The aim hint adds "Enter fires" while the keyboard cursor shows. The medal tracker's tooltip on a forfeited medal is "Next time!" (never a scold).
- **Fire control** (the bottom-left group): the master switch reads "Hold" / "Held" ("Hold fire, all turrets (Shift+H)"); the tower panel's toggle reads "Hold fire" / "Holding fire". H with nothing selected says "Pick a turret first · Shift+H holds all". Once spare runners unlock, "Spare" / "Sparing" ("Spare runners, all turrets (Alt+H)") and the panel's "Spare runners" / "Sparing runners". The word changes with the state, not only the color.
- **Text in Silkscreen** never shows "&" (the font draws it like "$"): the text pipeline writes "and", and the base's R&D tab reads "Research" (D059).
- **Radio (M1):** the map's radio lines and barks from its act file, verbatim, with the speaker's name plate (QUILL, Bricks, Goldie, Kip). A reply lands a short beat after its cue and shows under it (Bricks's "It's Wednesday." on QUILL's punchline; D028). Two system-driven slots (D059), both written as cheerful help, never as blame: QUILL's `enemy_leaked` line for the first leak of a given enemy (A1M2's first Hauler through the gate), and QUILL's once-per-shift `bank_nudge` when a build phase opens with 250+ credits unspent.

**Act II rules.** The jokes keep coming and start landing wrong. Characters notice and stop finishing sentences. Satire turns creepy through *content*, not tone: Sterling's memos sound exactly the same and say worse things. Ves'thara is the first voice that refuses to joke at all. Each map lowers the dials a little.

**Act III rules.** Humor survives only as care: Pebble mangling QUILL's jokes, Bricks being gruff at a teacup-sized child, Goldie's lettuce in the evacuation trucks. Use silence as a line (§5.6). No corporate voice except Sterling, who never changes. Specific, concrete details carry the grief ("He stopped counting the days.").

**Finale rules.** Everything comes back: the jingle, the counter, the name, the callsign, the joke. Sincerity is allowed now because it was earned. Keep lines short in Phase 2, where the song is doing the talking.

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
| **Environmental** | On the map | — | — | Art and maps | Evie billboards, mining scars, the Peeker, Tidybots, memorial wreckage, path direction ([../design/maps.md §7](../design/maps.md#7-storytelling-with-the-map)) |
| **Enemy design** | Behavior, motion, and death effects | — | — | Design and art | Frightened versus hungry movement; Haulers' sacks; the death-tone ramp ([../design/enemies.md](../design/enemies.md)) |
| **Epilogue cards** | Over the credits | ≤ 240 chars each | Yes | Narrator | Modular, chosen by flags ([bible.md §10](bible.md#10-endings)) |

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
| `sterling` | — | She has no extra. Her five expressions change only the eyes and brows; the smile is identical in all of them | — |

Portrait *variants* are chosen by flags or act, not by expression: Ves'thara's fraying threads, Kip's coat, QUILL's Purge status bar, and the player's visor reflections.

### 5.3 IDs

Snake_case, following [../tech/conventions.md](../tech/conventions.md):
- **Scenes:** `<map_id>_<slot>`. Slots are `brief`, `w<NN>` (radio before wave NN), `cue_<name>`, `debrief`, and `scene_<name>`. Examples: `a1_m01_brief`, `a1_m05_w08`, `a3_m03_cue_seal`, `a2_m04_debrief`.
- **Barks:** pools in `barks/<trigger>.ts`. Bark IDs are `<speaker>_<trigger>_a<act>_<nn>`, for example `bricks_idle_fire_a1_01`.
- **Codex:** `codex_<entry>` with versions `original`, `annotated`, and `corrected`.
- **Memos:** `memo_a<act>_<nn>`.
- **Epilogue cards:** `epi_<topic>_<variant>`, for example `epi_quill_rewrite`.
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
- **QUILL's tell:** any line driven by a directive starts with "(Per policy.)" or ends with it, uses expression `policy`, and is the only use of that expression.
- **Forms:** speaker `kfa` or `system`, set in form styling, with numbered clauses.

### 5.7 Choices

- 2–3 options, each ≤ 60 characters. Tone tags for writers are `earnest`, `wry`, and `quiet`. Each choice node lists the flags it sets.
- C2–C5 are presented as dialogue choices ([bible.md §9](bible.md#9-the-choices)). **C1 is never presented as a choice.** No UI, no prompt, and no "QUILL will remember that." It is just Hold Fire and a quiet wave.
- Show "{Speaker} will remember that." feedback only for C3 and C4, and the delayed C1 echo in A3M1 ("Old Thrum remembered.", spared only; the cleared path gets no echo). Never for C2 or C5. Feedback is grace, never accusation.
- Don't preview payoffs in the option text. The player chooses *what*, not *which reward*.

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

Sample subject lines: *Mandatory Fun Friday Is Back! (Attendance Optional) (Required)* · *Q2 Results: Pest Losses Down 38%!* · *Buffer Populations and You: A Quick FAQ!* (A1M4; the body is about "wildlife management" and says nothing) · *Pension Restructuring Opportunity!* (A2M3) · *Re: Incident 2361-A. Please Use "Vandalism" in All Correspondence!* (A2M2) · *Long Night Readiness: Stay Positive!* (A2M6) · *We'll Get Through This Together!* (A3M1; sincere-sounding, with incriminating small print) · *Your Access Has Been Updated* (A3M2, automated, the first memo with no exclamation point).

### 6.2 Codex entries

Three versions per entry, unlocked by story flags. The Act III *Field Journal* shows the original and the corrected version side by side, so the text the player laughed at becomes the evidence.

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

**The catalog's copy lives in [`src/content/upgrades/copy.ts`](../../src/content/upgrades/copy.ts)** (its one home; `copy.test.ts` checks these rules). Zibzab writes the line for every shop item: the global upgrades, the tune-ups, and the Field Protocols.
- **The price is true.** He never lies, so every price he names is that rank's. A ranked item names the first rank's price, then the next ones ("then 200, then 300") or says it climbs ("and it goes up", "rising").
- **The pitch is true too.** It may be vague, never wrong: the Thumper tune-up's line names its three ranks, in order.
- **It holds in every act.** The base shows the same catalog line from A1M4 to the finale, so catalog copy uses **no exclamation points** (Act III's budget, §2; his spoken patter, like the example above, follows its act's budget instead) and no protected word (§3). His Act I warmth and the seeds go in the content instead: "pest" in quotes as Everglow's word (he sells to everyone), the shell as his house, Kip's bought talent.

### 6.4 R&D copy (QUILL)

QUILL writes one line per R&D item, ≤ 100 characters, in [`src/content/upgrades/copy.ts`](../../src/content/upgrades/copy.ts) with Zibzab's. It is QUILL's Act I voice without the exclamation points (the copy shows in every act, and QUILL loses them after A3M2): precise numbers, a sincere aside, and "(Per policy.)" on any line a directive drives (§5.6), like Mk II's reminder that the uplink is a privilege (it is revoked in A3M2). Its lines can seed its arc so long as they say nothing early: the protocol slot's line wishes it could choose its own policies (C4 Rewrite). Under C4 Rewrite, R&D shows no QUILL text during A3M5's offline stretch ([../design/progression.md §7](../design/progression.md#7-rd-tree-intel)).

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
