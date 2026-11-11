# Enemies

Combat resolution (damage types, the damage/defense matrix, status effects), enemy defense traits and their counters, tower disabling, the enemy roster by faction, bosses, and wave design rules.

> **Numbers ([D019](../decisions.md#d019--2026-11-09--t105c-content-data-first-pass-numbers)):** an enemy with a data file in [`src/content/enemies/`](../../src/content/enemies/) (all of Act I's) has its exact numbers there, and this doc keeps its role, rules, and target ranges. An enemy with no data yet (Acts II–III) keeps its **first-pass numbers** here, its only home, until its data lands and they move. Combat rules and their constants (labeled **rule**) live here, with their data form in [`src/content/rules.ts`](../../src/content/rules.ts).
>
> **Ordering:** each enemy lists a *recommended* act of introduction. [../story/campaign.md](../story/campaign.md) is **authoritative** for when each enemy actually appears.
>
> **This doc is the single home for combat math.** [towers.md](towers.md) and [core-loop.md](core-loop.md) link here rather than restating it.

Units: distances in **tiles** (logical grid), speeds in **tiles per second**, times in **sim seconds** at 1x.

---

## 1. Design principles

1. **Every ability has a tell and a counter (rule).** The tell is visual and audible, and comes before the effect. The counter is named in the codex the first time the enemy appears (vision pillar 3).
2. **Enemies are characters.** How a unit moves, what it carries, and what it ignores tells its story with no text ([../research/emotional-storytelling.md §4](../research/emotional-storytelling.md#4-delivering-story-in-a-genre-with-little-room-for-it)).
3. **Enemies never attack towers (hard rule).** A few late enemies can briefly **Jam** a tower (section 4). They never damage or destroy one.
4. **Each faction has a defensive identity**, so the loadout puzzle changes by act: Skitterkin are *many* and *slippery*, Aelari are *shielded* and *tricky*, Everglow security is *armored* and *mechanical*, and the Hollow are *wrong*: they split, gather, phase, and hush (jam).
5. **Lore is the story's.** What each faction *is* lives in [../story/races.md](../story/races.md); this doc only says how it plays. Two story rules bind every unit here: **Skitterkin never attack anything**, and **the Hollow attacks anything that isn't a tower** (fleeing Skitterkin, refugees, scripted allies), never towers themselves.

---

## 2. Combat resolution

### 2.1 Damage types

| Type | Sources (examples) | vs Shields | vs Armor | Notes |
|---|---|---|---|---|
| **Kinetic** | Rivet, Harpoon, Sproing Pad, swarmling and acid DoT | ×0.5 (×0.8 vs a Soaked target) | Normal (flat reduction per hit) | The all-rounder. High per-hit Kinetic (Harpoon, Railspike) beats armor. |
| **Explosive** | Thumper, Skyhook, Gloop | ×0.5 (×0.8 vs a Soaked target) | Normal, applied to *each* enemy hit | Splash. Weak per hit against heavy armor unless paired with Corroded. |
| **Energy** | Zapcoil, Prism Spire | **×2.0** | Normal | The shield-breaker. Weak against the Hollow (see 2.2). |
| **Psionic** | Mindspike, Seer's Lantern | ×1.0 | **Ignores armor** | Strong against the Hollow, weak against machines (see 2.2). |

### 2.2 Damage vs body matrix

Every enemy has one **body class**. The multiplier applies to damage before shields and armor.

| Damage ↓ / Body → | Organic (Skitterkin) | Crystalline (Aelari) | Mechanical (Everglow) | Void (Hollow) |
|---|---|---|---|---|
| Kinetic | 1.0 | 1.0 | 1.0 | 1.0 |
| Explosive | 1.0 | 1.0 | 1.0 | 1.0 |
| Energy | 1.0 | 1.0 | 1.0 | **0.75** (light passes through what isn't there) |
| Psionic | 1.0 | **0.75** (a kindred mind resists) | **0.35** (no mind to touch) | **1.5** (it is made of minds: echoes of the unmourned dead) |

The matrix's data form is `BODY_MULT` in [`src/content/rules.ts`](../../src/content/rules.ts), with the shield multipliers (2.1) beside it. Only four cells deviate from 1.0, on purpose (readability). They carry story: Ves'thara's towers struggle against her own people and badly against Sterling's machines (so Psionic's armor-ignore never makes Mindspike the answer to Everglow armor), and they are the best weapon against the Hollow.

**"Void" is a mechanical label, not lore.** The body class `void` means *absence*: Hollow shapes are made of what is missing, the lonely echoes of dead who were never sung ([../story/bible.md](../story/bible.md#the-hollow)). It is not a machine, nanite, or cosmic intelligence.

### 2.3 Damage pipeline

**Rule:** every hit (and every DoT tick) resolves in this order.

```
raw = baseDamage                                   // already includes tower % buffs (towers.md §4)
raw *= bodyMult[type][body]                        // 2.2
raw *= 1 + markBonus                               // highest Mark only (2.4)
if type == Energy and target.soaked: raw *= 1.25   // Soaked (2.4)

if target.shield > 0:                              // shields absorb first
    m = shieldMult[type]                           // 2.1
    if target.soaked and type in (Kinetic, Explosive): m = 0.8
    s = raw * m
    if s <= target.shield:
        target.shield -= s; return                 // fully absorbed
    raw = (s - target.shield) / m                  // overflow converts back to raw
    target.shield = 0

if type == Psionic or hit.isDoT: effArmor = 0
else: effArmor = max(0, target.armor - corrodedStacks - hit.pierce)
if hit.isBeam: effArmor *= hit.tickLength          // beams: armor per second, prorated per tick
damage = max(raw * 0.2, raw - effArmor)            // armor floor: at least 20% gets through
target.hp -= damage
```

- **Armor** is a flat reduction per hit. Rule of thumb: armor 4 halves an 8-damage Rivet shot, and armor 12 reduces it to the 20% floor.
- **Shields** sit on top of HP and have their own bar. Shielded enemies regenerate `shieldRegen` per second after `shieldDelay` seconds without being hit (a hit on a broken shield also restarts the delay, so it stays down under fire), unless the data says they don't.
- **Splash** hits every enemy whose center is inside the radius for full damage (no falloff, for readability).
- **On-hit statuses land after the hit's damage**, so a status never boosts the hit that applies it (a Soaking shot doesn't get its own +25%).
- **DoT** (damage over time) ticks every 0.25 s and **bypasses armor** but not shields.
- **Beams are not DoT.** A beam (Prism Spire, the Lantern's light-beam) deals its damage per second in beam ticks of `tickLength` seconds (default 0.25 s; `raw = dps × tickLength`), and armor applies to each tick at `effArmor × tickLength`. So armor subtracts from a beam's *damage per second* rather than from each tiny tick, and the 20% floor still applies per tick.

### 2.4 Status effects

| Status | Effect | Stacking / limits | Bosses |
|---|---|---|---|
| **Chilled X%** | Move speed × (1 − X). | Only the strongest source applies (a weaker chill while a stronger one runs does nothing; an equal one extends it), except swarmling chills, which stack with each other to 30% and then count as one source. **Cap 70%.** | Half strength, except a Chilled 50% converted from Pin or Stasis, which is already boss strength and isn't halved again |
| **Soaked** | +25% Energy damage taken, and Kinetic and Explosive hits strip its shields at ×0.8 instead of ×0.5 (2.1). | Refreshes duration. | Normal |
| **Corroded** | −1 armor per stack (armor can't go below 0). A Corroded from **Corrosive Kiss** also halves every shield the unit regains: its own regeneration, a shield aura's, and a shield pulse's (not a boss's shield re-forming). | Stacks up to the applying tower's max. Each stack lasts 5 s and refreshes on a new hit. The shield slow keeps the strongest source and ends with the stacks; a plain Corroded refreshing them never lifts it. | Normal |
| **Marked X%** | +X% damage taken from all sources. | Highest only. | Normal |
| **Pinned** | Movement stops. A pinned flyer is **grounded**: ground-only towers can hit it. | After a Pin ends, the target is immune to Pin for 1 s. | Converted to Chilled 50% for the same duration |
| **Stasis** | Frozen in place. Still takes damage. **Interrupts** abilities. | Never stacks or extends: a Stasis lands only on a unit neither in Stasis nor immune. After Stasis ends, immune to Stasis for **2× the duration** of the Stasis just applied (a 1.5 s Stasis gives 3 s of immunity). | Converted to Chilled 50% for the same duration (no interrupt, no immunity) |
| **Lulled** | Ability cooldowns run ×1.5 longer (tick at 2/3 speed). | While inside a Lullaby radius; doesn't stack. | ×1.25 (half strength) |
| **Unnerved** | −20% speed. **Interrupts and blocks** active abilities. | Refreshes duration. | Interrupt only (no slow) |
| **Revealed** | A cloaked enemy can be targeted. | While inside a detection radius, plus any linger time. | n/a |
| **Haste X%** (enemy aura) | Move speed × (1 + X). | Highest only. **Cap +50%.** | Normal |

**Speed rule:** `speed = base × (1 − chill) × (1 − unnerved) × (1 + haste)`, where `unnerved` is 0.2 on an Unnerved non-boss and 0 otherwise (its own factor, outside the chill cap: Unnerved isn't a chill source, so it never competes with the strongest chill). Speed is 0 while Pinned or in Stasis. The caps, immunity times, and the speed rule are rule data in [`src/content/rules.ts`](../../src/content/rules.ts).

**Interrupt rule:** an interrupted ability (a blink, burrow, gather, jam, hush, or shield pulse) is cancelled, even mid-tell, and its cooldown restarts from zero.

**Stasis as built (T407a;** [`src/sim/systems/status.ts`](../../src/sim/systems/status.ts)**):** `applyStasis` is the one way in (on-hit effects route to it). Its sources: Flash Freeze's burst, Stillness's area (T507), and the Stasis Bloom's pulse (T608). A Stasis lasts its duration counting the tick it lands, and its immunity counts down only once it's over. Speed is 0 in Stasis, so a huddle leader in Stasis holds its huddle still too (the huddle follows the leader's pace, §3). **The interrupt hook** is `isInterrupted(e)` (Stasis on a non-boss; Unnerved on any unit): every enemy ability with a tell asks it each tick, so Stasis cancels a shield pulse's or a blink's tell, a Digger's dig tell (its surface stretch restarts), and a Hollow unit's hush (it can't start one, and one under way lets the runner go with the hush unspent). On screen a frozen unit's anim holds its frame under a pale ice tint (the crystal outline is T430a's).

**Pulled back as built (T608;** [`src/sim/systems/fields.ts`](../../src/sim/systems/fields.ts)**):** Gravity Well, the Stasis Bloom's spec A, moves a unit back along its route instead of giving it a status. Each pulse pulls every unit in its field back 1.5 tiles, a flyer along its air lane, never past the route's start. A pulled unit is immune to any Bloom's pull for 20 s (`Enemy.pullImmuneTicks`, counted down by the status pass), so stacked Wells can't juggle it. A boss is never pulled. A pull interrupts nothing by itself (the pulse's Stasis does that). A Maw's tell is lost when the pull carries its held unit out of reach (§3, *How gathering runs*), and a unit Bricks holds is let go and walks back to him. The numbers and the field's rules are [towers.md § Stasis Bloom](towers.md#stasis-bloom-bloom).

**Unnerved as built (T507;** [`src/sim/systems/status.ts`](../../src/sim/systems/status.ts)**):** `applyUnnerved` is the one way in (Mindspike [Dread]'s hits, 1.5 s, after the hit's damage). It lasts its duration counting the tick it lands; a new Unnerved refreshes it to the longer of what's left and the new duration, with no immunity. While it lasts, `isInterrupted` holds **on any unit, a boss too**: Unnerved is the only status that interrupts a boss's tells (the Glass Witch's and the Penitent's shield pulses, her blink, and the Chitterbloom's sneeze and dig: each restarts its timer from zero, T508), and it cancels a phasing tell (D137) and a hush like Stasis does. A non-boss also moves 20% slower (`UNNERVED_SLOW`, the speed rule above); a boss isn't slowed (§6). A link's `vsStatus` bonus can name it (status bit `unnerved`). On screen an Unnerved unit wears a wobbling violet squiggle over its head (T530a adds the 1 px jitter).

**Lulled as built (T607;** [`src/sim/systems/status.ts`](../../src/sim/systems/status.ts)**):** the status pass sets `lulled` on every unit inside a Lullaby's radius each tick (the Hum Choir's spec A, 2.5 tiles centre to centre, × its radius tune-up), both layers, never a neutral unit and never one nothing reaches (burrowed, Phased, leaving, or cloaked and unrevealed: the cloak's "no auras", §2.5). A cooldown runs ×1.5 longer in whole ticks: while Lulled, every ability's wait holds still on one tick in 3 (a boss's on one in 5, ×1.25), on a beat that restarts when the unit leaves the radius. **It stretches the wait before a tell, never the tell or a duration:** a Digger's surface stretch, a shield pulse, a blink, a phase's solid stretch, a boss's sneezes and digs, and a Maw's gather. An aura (a haste ring, a shield aura, a huddle) has no cooldown, so it isn't touched, nor is a hush (contact, no timer) or a shield's regeneration. Lulled interrupts nothing. On screen a Lulled unit wears a small blue note over its head, beside Unnerved's squiggle.

**Marked as built (T508;** [`src/sim/systems/status.ts`](../../src/sim/systems/status.ts)**):** a tower's Mark goes in through `applyMarked` (a tier's `marked` effect, a link's extra, an area Mark); the highest-only rule is `applyMark` in `combat/damage.ts`, which Crow's Nest's reveal Mark shares. A Mark with `noEvade` (Truthlight) also sets `noEvadeTicks` to its duration, whichever Mark wins on strength, on any unit, a boss too. While it lasts, the **evade hook** `evadeBlocked` (the interrupt hook, or `noEvadeTicks`) holds: the evasive abilities ask it in place of `isInterrupted` (a blink, a phase, a unit's dig, a boss's dig), so each is cancelled as an interrupt would cancel it, and the detection system keeps a cloaked unit Revealed. It isn't an interrupt: a pulse, a hush, or a sneeze goes on. The Lantern's numbers and its area Mark are [towers.md § Seer's Lantern](towers.md#seers-lantern-lantern). On screen a Marked unit wears a small pink eye beside its head, and one that can't evade a filled gold-and-white eye (`render/views/MarkView.ts`).

**Pinned as built (T408;** [`src/sim/systems/status.ts`](../../src/sim/systems/status.ts)**):** `applyPin` is the one way in (Tether's hit and Magnet Crane's slam, on landing). A Pin lasts its duration counting the tick it lands, never extends or stacks (it lands only on a unit neither pinned nor immune), and leaves 1 s of immunity from when it ends. Speed is 0 while Pinned (a pinned huddle leader holds its huddle). A pinned flyer is grounded: every tower that hits ground can target it, splash it, and chain to it while the Pin holds (allies too), and it still flies its lane once freed. **A Pin interrupts nothing** (the interrupt rule is Stasis's and Unnerved's): a pinned unit's pulse, dig, hush, or blink goes on (a blink still jumps it along its route). A boss takes Chilled 50% for the same duration, with no immunity. On screen a pinned unit is roped to a stake beside it, and a pinned flyer's rope runs straight down to a stake at its ground point.

### 2.5 Detection

- **Cloaked** enemies are invisible to towers. **Rule:** an undetected cloaked enemy is untouchable: no targeting, splash, auras, or links affect it. The *player* still sees a faint shimmer, so they know it's there (readability). It still leaks normally.
- An enemy is **Revealed** while inside the detection radius of a detector (Lookout Shack, Seer's Lantern) or a Scanner Sweep, plus any linger time. Revealed enemies can be targeted by every tower.
- **As built (T406;** [`src/sim/systems/detection.ts`](../../src/sim/systems/detection.ts)**):** "untouchable" means nothing the player sends reaches it: no tower targets it, no splash, chain, or on-hit status lands, Orbital Strike and Suppressing Fire's ticks deal it nothing, and a Suppressing Fire segment doesn't slow it. Time Dilation still slows it (map-wide, never aimed; it slows burrowed units too), and enemy-side effects (a shield pulse or aura) still reach it. A unit stays Revealed for the tick after it leaves a radius, plus the detector's linger; a Scanner Sweep zone reveals whatever stands in it each tick of its 10 s. On screen an unrevealed cloaked unit draws faint, its alpha stepping on the 3 Hz shimmer cycle (steady under reduced motion), and draws whole once Revealed.

### 2.6 Movement layers

| Layer | Who | Targetable by |
|---|---|---|
| **Ground** | Most enemies; they follow ground paths ([maps.md §4](maps.md#4-paths-and-air-lanes)) | Towers with G |
| **Air** | Flyers; they follow air lanes and ignore ground paths | Towers with A, or ground towers once the flyer is Pinned |
| **Burrowed** | Burrowers while underground; they keep moving along their path | Scuttle Den swarmlings and the Underfoot ability only |
| **Phased** | Phasing enemies mid-phase | Nothing |

---

## 3. Defense traits and counters

| Trait | Art tell id | What it does | Tell | Counters |
|---|---|---|---|---|
| **Armored** | `armored` | Flat damage reduction per hit (2.3). | Chunky plates; "plink" sparks on weak hits | High per-hit Kinetic (Harpoon, Railspike); armor pierce; **Prism Spire** (a beam: armor subtracts per second, not per tick, 2.3); Corroded (Gloop, Bunker Buster, Acid Rain / Sticky Flak links); Psionic against armored Hollow and Aelari (not Everglow machines, ×0.35) |
| **Shielded** | `shielded` (+ `regen` if it regenerates) | A separate regenerating bar on top of HP. | A bubble with a second bar; ripples when hit | Energy (Zapcoil, Prism); Soaked (which also lets Kinetic and Explosive bite); Resonance link; sustained damage to beat regen. High per-hit Kinetic (Harpoon) is not a shield answer |
| **Cloaked** | `stealth` | Untouchable unless Revealed. | Shimmer outline; footsteps sound | Lookout Shack, Seer's Lantern, Scanner Sweep |
| **Fast** | `fast` | Moves well above the normal pace (the Zoomer runs about twice a Nibbler's). | A lean, streaking sprite | Slows (Sprinkler, Stasis Bloom, Suppressing Fire); damage early on the route |
| **Flying** | `flying` | Uses air lanes; only A towers can hit it. | Shadow on the ground; dotted air lane | Skyhook, Sproing Pad, Rivet, Zapcoil, Harpoon, Prism, Mindspike, Cloudburst; Pin to ground it |
| **Burrowing** | `burrower` *(new)* | Periodically digs in (untargetable) and moves underground. | Dirt spray 0.8 s before; a ripple trail underground | Kill it before it digs; Stasis or Unnerved blocks the dig; Truthlight; Scuttle Den and Underfoot hit it underground |
| **Splitting** | `splitter` | Spawns smaller enemies on death. | Visibly "packed" sprite with bulges | Splash; Chilled zones near the death point; overkill doesn't help, so plan for the children |
| **Healer aura** | `healer` | Restores HP of allies nearby, continuously. | A green ring that pulses; a ✚ on each unit it mends | Kill it first: Strong targeting, Harpoon, Railspike; out-damage it (no tell, so nothing interrupts it) |
| **Shield-recharge aura** | `shield_aura` *(new)* | Restores allies' shields, continuously. | A dashed blue ring round the source, always on | Energy splash; kill it first; Corrosive Kiss halves what it restores to Corroded units (2.4) |
| **Haste aura** | `haste_aura` *(new)* | Speeds up allies nearby. | Speed lines, a metronome tick | Kill it first; strong slows (the speed rule caps haste) |
| **Blink (phase-shift)** | `blink` *(new)* | Teleports forward along the path. | A 0.8 s shimmer and an afterimage at the destination | Stasis or Unnerved interrupts; Truthlight blocks it; place damage later on the route |
| **Phasing** | `phasing` *(new)* | Briefly untargetable (flyers). | A 0.5 s flicker | Burst damage between phases; Truthlight |
| **Gathering** | `consumer` *(new)* | Draws nearby Hollow pieces and fleeing Skitterkin into itself to grow (grief gathering more grief; see §5.4 for what it may take). | Inward-pulling tendrils for 1 s | Kill the small enemies first, or burst the gatherer; interrupt; Gravity Well to separate them |
| **Jammer** (story name for the Hollow's version: *hushing*) | `disabler` | Briefly disables towers (section 4). | An expanding ring or a tendril, at least 1.5 s | Interrupt during the tell, Hum Choir (shorter jams; Rally Chorus: immunity), System Reboot, spacing towers out |
| **Skittish** | `skittish` *(new)* | The `fleeing` modifier, not an enemy's own trait: a `fleeing` Skitterkin group brings it ([D101](../decisions.md#d101--2026-11-09--m4-cut-act-ii-part-one)). When a Skitterkin within 2 tiles (a straight line) is killed or hushed (same layer or not; a leak is no loss), gains Haste 40% for 1.5 s (under the 50% haste cap); another loss meanwhile starts the 1.5 s over. | Ears flatten, a panic squeak | Slows, and kill groups with splash rather than one at a time |
| **Huddle** | `huddle` *(new)* | Allies within 1.5 tiles match the leader's pace and regenerate. | Allies cluster tightly around it | Splash loves clusters; kill the leader to scatter them |
| **Clustered** (intel: "Hollow clusters") | `hollow` | Comes in packed clusters (the Mote: 6–12 at a time). No ability of its own: the trait says the group is a splash problem, so a map can require splash for it and the briefing shows it ([D101](../decisions.md#d101--2026-11-09--m4-cut-act-ii-part-one)). | The Hollow look itself: a knot of wrong-edged shapes | Splash, chains, and multi-target attacks |

**How the Act I abilities run (rules).** The numbers are each unit's data ([`src/content/enemies/`](../../src/content/enemies/)); the sim is `src/sim/enemyAbilities/`.
- **Burrowing.** "Every N s for D s" is the cycle's period: the unit walks N − D s on the surface, the last part of it showing the tell, then is underground for D s at its burrow speed, then surfaces. A fresh spawn starts at the top of a surface stretch. Underground it follows its path and leaks normally, but no targeting, hit, splash, or status reaches it except the burrowed answers (§2.6). Stasis and Unnerved block the dig (§2.4): Stasis since T407a (Flash Freeze, whose 1 s every 8 s isn't a burrowed answer), Unnerved since T507 (Mindspike [Dread], attuned after A2M5); the burrowed answers arrive with their towers, and also need hits to reach a burrowed unit. **So no Act I tower answers burrowing:** the Digger is threat intel in Act I, never a required counter (`burrowed` first becomes requirable with Act II's answers; [D073](../decisions.md#d073--2026-11-09--t304c-split-huddle-burrow-and-chitterbloom)).
- **Splitting.** Only a **kill** splits: a splitter that leaks, or leaves with a driven-off boss, releases nothing. The children join the parent's wave (it resolves only once they're gone) with its wave tags and full HP; the first lands where the parent died and each next one 0.25 tiles behind it (`BROOD_SPREAD_TILES`; a boss's young are placed the same way).
- **Huddle.** Each tick a leader gathers every ally within its radius: a live, non-burrowed ground unit of its faction that isn't a leader, a boss, or neutral, one huddle per unit. The ally regenerates (up to full HP) and moves at the leader's current pace (its chill included) when that's **slower** than its own: a huddle holds the group back and never speeds anyone up. The leader doesn't regenerate.

**How the shield pulse runs (rule; T403).** One module (`src/sim/enemyAbilities/pulse.ts`) runs a unit's own pulse (`pulse` in its data) and a boss phase's (the Glass Witch's, D101; the Sunderglass Penitent's phase 1, T506). The Aegis Cantor's recharge is a continuous aura, not a pulse ([D137](../decisions.md#d137--2026-11-10--m5-cut-act-ii-part-two-a2m4a2m6); its rule is below).
- **Timing.** The first pulse comes one period after the unit spawns. The last `tellSec` of each period is the tell (the ring and chime; the Witch's is 1.5 s, §6). A boss's pulse timer waits while it's invulnerable between phases and carries on across a phase change.
- **What it restores.** When the timer runs out it restores its `shield` amount to itself and to every live unit **of its faction with a shield** whose centre is within `radiusTiles`, flyers included, never past each unit's own max. A leaving, burrowed, or Phased unit gets nothing (nothing reaches it, §2.6). A pulse refills; it doesn't restart anyone's regen delay. On Story difficulty the amount scales with the enemies' shield modifier, like every shield (the Witch's 120 becomes 84).
- **Interrupts (§2.4).** Stasis on a non-boss cancels a pulse mid-tell and stops a tell from starting; either way its cooldown restarts from zero. Unnerved does the same, on a boss too (T507). A boss is never in Stasis (it converts to Chilled 50%), so nothing but Unnerved interrupts the Witch's pulse.
- **Story difficulty** scales the amount with the shield (−30%), so a pulse restores the same share of a weaker shield.

**How blink runs (rule; T404).** One module (`src/sim/enemyAbilities/blink.ts`) runs a unit's own blink (`blink` in its data: M5's Blinkstrider) and a boss phase's (the Glass Witch's phase 2).
- **Timing.** A unit's first blink comes one period after it spawns. A boss phase's first tell starts as soon as the phase does (after the phase change's invulnerability), so the new move shows itself at once; the timer then runs one period per blink and carries across a phase change that keeps the blink. The last `tellSec` of each period is the tell. A boss's timer waits while it's invulnerable between phases.
- **The tell and the jump.** The unit **holds still through its tell**, so the landing it shows (`tiles` further along its route) is exactly where it appears; then it moves that far along the route at once (around corners, never off the route: a landing past the end clamps to the end, and a unit blinked onto the end leaks as it moves that tick; a boss's leak drains whatever it reaches, the core or a Protect map's asset). A leaving unit doesn't blink, so a boss's ending cancels a tell under way.
- **Interrupts (§2.4).** While a status interrupts the unit (`isInterrupted` in `src/sim/systems/status.ts`: Stasis on a non-boss; Unnerved on any unit), a tell can't start or go on, and the cooldown restarts from zero. A boss's Stasis converts to Chilled 50%, which interrupts nothing (D101).
- **Counting.** A boss's completed blinks count in the run stat `bossBlinks` (A2M2's Glass Half Empty: `{ stat: 'bossBlinks', lte: 2 }`). Story difficulty changes no blink number.

**How the shield aura runs (rule; T502).** One module (`src/sim/enemyAbilities/shieldAura.ts`) runs a unit's `shieldAura` (the Aegis Cantor's: 15 shield/s within 2 tiles), once a tick for every unit at once, last in the abilities system.
- **Continuous.** No timer, no tell, no event: every tick, every ally in reach regains `shieldPerSec`/60, never past its own max. On screen the source wears a dashed blue ring at the aura's radius, its dashes crawling, while it projects.
- **Who.** The source projects while it's alive and not leaving, burrowed or Phased (a Cantor that stands down projects nothing). It reaches every live unit **of its faction with a shield** whose centre is within the radius, flyers and unrevealed cloaked units included, but **not itself** (a Cantor is recharged only by another Cantor), **not a boss** (a boss's shield belongs to its phases: the Penitent's broken shield), and not a neutral, leaving, burrowed or Phased unit (`layers.ts` `outOfReach`).
- **Stacking.** Auras of one kind don't stack ([towers.md §4](towers.md#4-stat-modifiers-and-stacking)'s rule, as Haste's "highest only"): a unit inside two Cantors' rings regains the strongest rate, once.
- **Under fire.** The regen delay doesn't stop it and it doesn't touch the delay: the aura refills a shield that's being hit, which is why the answer is to kill the Cantor first or out-damage it with Energy. The unit's own regeneration still waits out its delay, and the two add up once both run. A shield pulse (the Witch's, the Penitent's) lands on top of it, under the same max.
- **Interrupts.** None: Stasis and Unnerved cancel abilities with a tell (§2.4), and an aura has none; a Pin changes nothing either.
- **Story difficulty** scales the rate with the shield (−30%: 10.5/s), so it restores the same share of a weaker shield.

**How the haste aura runs (rule; T603).** One module (`src/sim/enemyAbilities/hasteAura.ts`) runs a unit's `hasteAura` (the Expediter's: +30% speed within 2 tiles), once a tick for every unit at once, last in the abilities system, so movement reads this tick's value (`Enemy.auraHastePct`).
- **Continuous.** No timer, no tell, no event, like the shield aura: every tick, every ally in reach has Haste at the aura's rate, and it ends the tick the unit leaves the ring or the source dies.
- **Who.** The source projects while it's alive and not leaving, burrowed or Phased. It reaches every live unit **of its faction** whose centre is within the radius, flyers and unrevealed cloaked units included, but **not itself** (an Expediter is hasted only by another Expediter), **not a boss** (a boss's pace belongs to its phases: "Shareholder Value"'s jettison haste is its own), and not a neutral, leaving, burrowed or Phased unit.
- **Stacking.** Highest only, under the 50% cap (§2.4): a unit inside two rings has the strongest rate, once. No other haste meets an aura (Skittish is a fleeing Skitterkin's and no Skitterkin projects one; a boss is never in one).
- **Speed.** Movement multiplies it in: `base × (1 − chill) × (1 − unnerved) × (1 + haste)` (§2.4), so a slow still bites a hasted unit, and Stasis or a Pin still holds it at 0. A drone beside an Expediter walks 1.3 tiles/s, faster than the Expediter's own 1.1, so the drones it catches pull ahead to the ring's front edge.
- **Interrupts.** None (an aura has no tell, §2.4); an Expediter in Stasis or Pinned still hastes.
- **Story difficulty** changes no haste number.
- **On screen** (`render/views/EverglowView.ts`, `everglowLook.ts`): a solid `orange.3` ring at the radius round the source, under the units, beating like a metronome (2 beats a second on sim time; steady under reduced motion), and a double chevron behind the source and every unit it hastes, pointing the way each walks, over the dark. The exact look, by day and at night, is [art-direction.md §7](../art/art-direction.md#attack-and-ability-effects).

**How the healer aura runs (rule; T703).** One module (`src/sim/enemyAbilities/healAura.ts`) runs a unit's `healAura` (the Maintenance Associate's: 12 HP/s to Mechanical allies within 1.5 tiles), once a tick for every unit at once, last in the abilities system, so a unit is mended before the towers fire.
- **Continuous.** No timer, no tell, no event, like the shield and haste auras: every tick, every ally in reach regains `hpPerSec`/60, never past its max HP (its def's HP plus any a Maw's absorbs added).
- **Who.** The source projects while it's alive and not leaving, burrowed or Phased. It reaches every live unit **of its faction with the aura's body** (Mechanical) whose centre is within the radius, flyers and unrevealed cloaked units included, but **not itself** (an Associate is mended only by another Associate), **not a boss** ("Shareholder Value" is never mended), and not a neutral, leaving, burrowed or Phased unit. It never revives a dead unit.
- **Stacking.** Auras of one kind don't stack: a unit inside two Associates' rings regains the strongest rate, once.
- **Interrupts.** None (an aura has no tell, §2.4): an Associate in Stasis, Pinned, Unnerved or Lulled still mends. The answer is to kill it first, or to out-damage 12 HP/s.
- **Story difficulty** scales the rate with HP (−30%: 8.4/s), so it mends the same share of a weaker unit.
- **On screen** (`render/views/HealAuraView.ts`, `healLook.ts`; T740a and T730a polish them): a solid `green.3` ring at the radius round the source (over an `ink.0` under-stroke), and once a second a `green.4` pulse ring expanding from a quarter of the radius out to it (none under reduced motion); every unit it is mending wears a small green ✚ (a `white.1` heart, an `ink.0` rim) at the top left of its body until it's whole.

**How phasing runs (rule; T503).** One module (`src/sim/enemyAbilities/phase.ts`) runs a unit's `phase` (the Rift Moth's: Phased 1.5 s every 5 s after a 0.5 s tell), in ticks, so it's deterministic.
- **The cycle.** "Phased D s every N s" is the period: the unit is solid for N − D s (the Moth's 3.5 s), the last `tellSec` of it showing the tell, then Phased for D s, then solid again. A fresh spawn starts at the top of a solid stretch, so a Moth tells 3 s after it spawns and phases at 3.5 s, 8.5 s, 13.5 s. It keeps moving through the tell and while Phased.
- **Phased** is the movement layer of §2.6: no tower, ally, splash, chain, on-hit status, or ability hit reaches it (the cloak's "untouchable", §2.5), and, unlike a cloak, neither does its own side's shield pulse or aura (the burrowed rule; `layers.ts` `outOfReach`). Time Dilation still slows it (map-wide, never aimed). It follows its route and leaks normally.
- **Interrupts (§2.4; [D137](../decisions.md#d137--2026-11-10--m5-cut-act-ii-part-two-a2m4a2m6)).** While `isInterrupted` holds (Stasis on a non-boss; Unnerved), the tell can't start or go on: the phase is cancelled, even mid-tell, and the solid stretch restarts from zero. Nothing interrupts a unit already Phased, since no status can reach it. Truthlight (the Seer's Lantern, T508) stops a unit phasing the same way while its Mark lasts ([towers.md § Seer's Lantern](towers.md#seers-lantern-lantern)).
- **Events and look.** `PhaseShift` reports the tell, the phase in and out, and an interrupt. On screen the tell flickers the body whole and dithered (the 3 Hz tell step; whole under reduced motion) over a broken `teal.4` ring at its ground point, and a Phased unit is a faint dithered ghost over a steady ring. Story difficulty changes no phase number.

**How gathering runs (rule; T602).** One module (`src/sim/enemyAbilities/gather.ts`) runs a unit's `gather` (the Maw's: every 4 s, a 1 s tell, within 1 tile, max 5), once a tick for every unit at once, after the hush rule and the huddles, in ticks, so it's deterministic.
- **The cycle.** "Every N s, after a T s tell" is the period, as for a pulse: a fresh Maw's first gather comes one period after it spawns. With T s left it is **ready**: it starts its tell on the nearest eligible unit in reach, or waits, ready, until one comes in reach; the tell runs T s, then it gathers and the period starts over (so a Maw among its pieces gathers every 4 s). A Maw with 5 absorbs is full and never tells again.
- **Who.** A live non-boss, non-neutral **Hollow** unit, but never another Maw (a gatherer never takes a gatherer); or, while it hasn't taken one, **one Skitterkin**: a `fleeing` Skitterkin enemy or an escort refugee, exactly the units the hush rule may take (never Pebble, never a Skitterkin tower's swarmlings or leapers). Never an Everglow or Aelari unit, never a boss, never a non-fleeing Skitterkin. On **its own layer** (a ground Maw never reaches a Rift Moth) and in reach (not burrowed, Phased, leaving, or standing down), within the radius, measured as the hush rule's contact is (along the route when both walk the same one, else a straight line). Two Maws never take the same unit: the hush rule's matching (each unit goes to its nearest ready Maw, each Maw takes its nearest such unit, ties to the lower id), so slot order never decides.
- **The tell** (`GatherTell`): the tendrils hold **both still** for its 1 s, as a hush tell does. A tell on a Skitterkin is the Maw's one hush, held as the hush rule's pair, so no other Hollow unit hushes that runner or refugee meanwhile.
- **Interrupts (§2.4).** While `isInterrupted` holds (Stasis on a Maw; Unnerved), a tell can't start or go on, and the cooldown restarts from zero. Gathering isn't evasive, so a Truthlight Mark doesn't stop it. A tell is also lost, with the same restart, when its unit dies, leaks, is evacuated, or goes out of reach or out of the radius mid-tell (a Gravity Well's pull, T608): killing the held unit buys a whole period.
- **The gather** (`Gathered`). The unit is removed: no kill, leak, or bounty, not Pests Processed, and a Fracture or Shard gathered whole never splits. Its **current HP** goes to the Maw's HP and max HP (a refugee has no HP in the sim, so it adds none). Each absorb adds **+1 leak** and **+10% size**, each Hollow absorb **+3 bounty** (the roster row). A Skitterkin is its one hush: it grows instead of turning Heavy, the runners near a gathered fleeing unit bolt (Skittish), and a gathered refugee is **lost**, its group's loss, counted in `stats.refugeesGathered` (A3M1's Nothing Gathered).
- **No balloon.** The 5-absorb cap bounds a Maw among Fractures and their Shards at 400 HP plus five units' HP (a test).
- **Story difficulty** changes no gather number; the HP it takes is already the run's.
- **On screen** (`render/views/HollowView.ts`, `gatherLook.ts`): during the tell a cold `violet.4` noose closes on the held unit with three tendrils to the Maw's body, a bead riding each as the tell's clock and a white snap at its end, and the Maw plays its `tell` pose; its body is one sprite per absorb, and each absorb pulses a gulp ring (no ring stands on the ground). The exact look is [art-direction.md §7](../art/art-direction.md#attack-and-ability-effects).

Other art tell ids used by the roster: `carrier` (Brood Hauler), `boss`, `hollow`, and `heavy` (a Hollow unit that has hushed someone under the hush rule, §5.4). The tell vocabulary is owned by [../art/art-direction.md §8](../art/art-direction.md#8-readability-and-enemy-ability-tells). Ids marked *(new)* are proposed additions to that vocabulary.

### 3.1 Counter categories

**This table is the human-readable trait → counter-category map.** Its data form is `TRAIT_COUNTER` and `COUNTER_ANSWERS` in [`src/content/rules.ts`](../../src/content/rules.ts), which validation reads; change them together. A map's `requiredCounters` are drawn from these categories ([maps.md §6.3](maps.md#63-one-new-thing-per-map)), and the **Answers** column is what a category's no-counter build must leave out ([maps.md §6.1](maps.md#61-per-act-targets)).

| Category | Traits | Answers (every tower, tier, spec, link, and commander ability here; a no-counter build excludes all of them) |
|---|---|---|
| **armor** | Armored (light and heavy) | Harpoon; Rivet T3+ and Railspike (armor pierce, ignore armor); Skyhook [Seeker Swarm] where the armored units fly; Prism Spire; Corroded sources (Gloop, Thumper [Bunker Buster], Acid Rain, Sticky Flak); Psionic (Mindspike) where the armored units are Hollow or Aelari, never against Everglow. Against light armor (Acts I–II), also Thumper |
| **shield** | Shielded, Shield-recharge aura (`shield_aura`) | Every Energy source (Zapcoil, Prism Spire) and every Soaked source (Sprinkler T3+, Cloudburst, the Conductive link) |
| **detection** | Cloaked | Lookout Shack, Seer's Lantern, Scanner Sweep |
| **air** | Flying | Every tower that can hit air on that air lane (Skyhook, Rivet, Zapcoil, Harpoon, Prism, Mindspike, Lantern, Sproing, Cloudburst, Brave Hearts), and every Pin that grounds flyers there |
| **burrowed** | Burrowing | Scuttle Den, Underfoot, Stasis Bloom, Lantern [Truthlight], Mindspike [Dread] (Unnerved blocks the dig) |
| **splash** | Splitting, Huddle, Clustered (Mote clusters), Gathering | Every splash, chain, or multi-target attack ([towers.md §2.1](towers.md#21-role-coverage)'s Splash row: Thumper, Gloop, Zapcoil, Rivet [Rivet Storm], Mindspike [Echo Spike], Sproing [Big Bonk], Harpoon [Skewer]), plus Skyhook where the map's splash-category enemies fly |
| **jam** | Jammer | Hum Choir, System Reboot, and tell interrupters (Stasis Bloom, Flash Freeze, Dread, Stillness) |
| *intel-only* | Fast, Blink, Phasing, Skittish, Haste aura, Healer aura; also the `boss` entry (not a trait: a map lists it in `threatIntel` when a boss walks its waves) and the rift-lane icon | None: shown in the threat intel, never a required counter, and exempt from the soft-trait rule |

**How a build carries an answer (rule).** The validator and the balance harness judge each build by what it actually reaches, in one model that the loadout screen's answers share (`src/content/counterAnswers.ts`):
- **Tiers and specs.** A tower answers only once it reaches the tier or spec the table names. A Rivet held at T2 isn't an armor answer; one that passes T3 is, even on its way to Rivet Storm (which drops the pierce). A loadout tower the build never builds counts at T1.
- **Map conditions.** Thumper answers armor only on Act I–II maps (light armor). Mindspike answers armor only when a Hollow or Aelari unit on the map is armored. Skyhook answers splash only when a splash-category enemy on the map flies, and armor (as Seeker Swarm) only when an armored enemy on the map flies: it hits air only.
- **Placement.** A placed tower answers a category only where it can reach that category's enemies: one of its placements must lie within reach of a route those enemies take (the tile's distance to the route's polyline ≤ the longest attack range the tower reaches, ×1.25 on high ground, plus 0.5 tiles of slack for the small range bonuses the model doesn't track, `REACH_SLACK_TILES`). So a no-air build may keep Rivets, as long as none can reach the air lane (A1M3's). A loadout tower the build never places, and a tower with no attack range, still count (they could go anywhere); neutral units (Gerald) are in no category ([D079](../decisions.md#d079--2026-11-09--t313-harness-extensions-for-act-i)).
- **Links** need both partners, and every link answer here (Acid Rain, Sticky Flak, Conductive) pairs a tower with Gloop or Zapcoil, which answer on their own.
- **Abilities, from either slot, count only when the build casts them.** So a no-counter build may keep a map's fixed companion in slot 2 if it never uses the ability (A3M5's no-jam build). An ability answers only through the effect this table lists it for: revealing (Scanner Sweep), hitting underground (Underfoot), or clearing or interrupting jams (System Reboot, Stillness). **A cooldown hit never answers a category by its damage.** Orbital Strike isn't an armor or splash answer, Suppressing Fire isn't an armor answer ([core-loop.md §3.2](core-loop.md#32-ability-roster)), and Underfoot isn't a splash answer. The harness's no-counter runs still cast them, so a strike that could replace a counter fails assertion #5.

- **Soft enemies (rule).** An enemy is **soft** on a map only if it carries a trait whose category the map doesn't require **and none** of its traits maps to one of the map's `requiredCounters`. Intel-only traits never make an enemy soft. Soft enemies make up at most 15% of any wave's threat ([maps.md §6.2](maps.md#62-threat-budget-planning-tool)).
- Bosses are judged by their traits like any other enemy.

---

## 4. Tower disabling (Jamming)

Per D001, a *few late-game* enemies may **briefly disable** towers. This is the only way enemies interact with towers.

**Rules:**
- **Sources (exhaustive list):** Everglow **Auditor**, Hollow **Silencer**, and the **"Shareholder Value"** boss. Adding a new jammer requires a decision entry in [../decisions.md](../decisions.md).
- **Duration:** at most **4 s** per jam.
- **Tell:** at least **1.5 s** (this doc owns the gameplay timing; the 0.75 s minimum in the art doc's tell section should be raised to match), with a distinct visual (Auditor: an expanding orange ring; Silencer: a black tendril creeping toward the tower) and a distinct sound.
- **Post-jam immunity:** a tower can't be jammed again for **6 s** after a jam ends.
- **Targeting (rule):** a jammer that picks a single target (the Silencer) skips jam-immune towers when choosing it (post-jam immunity, Rally Chorus, System Reboot).
- **Jammed state:** the tower doesn't fire, and its auras and links switch off. It shows static, sparks, and a countdown ring. Nothing else happens to it.
- **Counters:** interrupt the jammer during its tell (Stasis, Unnerved), kill it first, **Hum Choir** (halves the duration at T1–T2, cuts it by 75% at T3, and gives immunity only with its Rally Chorus specialization; no Choir aura ever protects a Choir, its own or another's), the **System Reboot** ability, and placement (jammers have short reach, so key towers can sit out of it). [towers.md §7](towers.md#hum-choir-choir) has the numbers.
- **Introduction rule:** jamming never appears before the player has access to at least one counter beyond "kill it" (Hum Choir or System Reboot). A jammer's first appearance is a teaching wave with a single jammer and a codex popup.
- **Story placement:** Silencers debut in A3M4, on the map where QUILL patches in **System Reboot** before the first jam; Auditors debut in A3M5; "Shareholder Value" is the A3M5 boss. Dialogue and codex call a Silencer's jam *hushing* ("the towers went quiet"); UI labels stay "Jammed" for readability.
- The jam limits and the jammer list are rule data in [`src/content/rules.ts`](../../src/content/rules.ts).
- **Wave-design limit:** in par play ([maps.md §6.4](maps.md#64-balance-harness)), no more than **25%** of the player's towers should be jammed at the same moment.

---

## 5. Roster

**Roster total: 27 enemy types** (8 + 6 + 7 + 6), plus the bosses in section 6.

**Where the exact numbers live** (D019). Every Act I unit (the eight Skitterkin below and Matriarch Chitterbloom) is built: its HP, armor, speed, leak, bounty, spawn interval, and ability numbers are in its data file in [`src/content/enemies/`](../../src/content/enemies/), and its row gives its role and target bands. Act II's Aelari line units (Glimmer, Weft Warden, Lightwing; T403) are built too: their §5.2 rows match their data files, which win if the two ever differ (`src/sim/aelari.test.ts` checks them). The rest of the Act II–III tables (§5.2–5.4) are still first-pass numbers, their only home until their data lands. Columns there: **HP**, **Armor**, **Shield** (`max / regen per s / delay s`), **Spd** (tiles/s), **Leak** (core damage), **Bounty** (credits), **Layer**.

**Spawn spacing.** Each enemy has a default spawn interval within a wave group (`spawnIntervalSec`; wave data may override it per group), set in its data file. Flocks spawn close, so a flak burst catches two or three.

**Gerald** (`gerald.ts`) is a neutral unit, not part of the roster ([core-loop.md §2.7](core-loop.md#27-hold-fire)): an air unit that flies the ground path, faster than a Nibbler so First-targeting towers pick him, and he brings no trait, threat, or novelty to a map's validation.

### 5.1 Skitterkin (body: Organic)

Round, fuzzy, squeaky, and harmless-looking. **They never attack anything; they only run.** In Act I they look silly (pratfalls, waddles, confetti pops). From Act II they look *panicked*, glance backward, and carry young. In Act III some of them are your allies, and the escort missions put them on the path again, this time walking to safety ([maps.md §5](maps.md#5-map-modifiers-and-objective-variants)).

Bands (targets): **Toughness** fodder (HP 20–40), light (60–90), tank (150–200, light armor 1–2), heavy (300+, heavy armor); **Pace** slow (0.6–0.7 tiles/s), normal (0.9–1.1), fast (about 2). Small units leak 1 and big ones 2–3 ([core-loop.md §2.9](core-loop.md#29-core-integrity-lose-condition)); bounty grows with toughness.

| ID | Name | Role | Toughness | Pace | Layer | Traits | Recommended act |
|---|---|---|---|---|---|---|---|
| `nibbler` | **Nibbler** | The baseline pest; split children and boss sneezes are Nibblers | Fodder | Normal | G | — | Act I start |
| `zoomer` | **Zoomer** | Rushes; punishes a slow start | Fodder | Fast | G | Fast | Act I early |
| `chonk` | **Chonk** | Soaks shots; teaches armor | Tank | Slow | G | Light armor | Act I early |
| `puffwing` | **Puffwing** | Flocks of fluffy gliders on air lanes; teaches air | Fodder | Normal | A | Flying | Act I mid |
| `bunchling` | **Bunchling** | Pops into several Nibblers on a kill; teaches splash | Light | Normal | G | Splitting | Act I mid |
| `digger` | **Digger** | Digs in for a moment on a cycle, faster underground; intel only in Act I (§3) | Light (armor 1) | Normal | G | Burrowing, light armor | Act I late |
| `elder` | **Elder** | Holds nearby allies to its pace and heals them; a convoy leader | Tank | Slow | G | Huddle, light armor | Act I late |
| `hauler` | **Brood Hauler** | Armored shell, carries a glittering sack (see below); Act I's armor exam | Heavy | Slow | G | Heavy armor | Act I late |

- **Skittish** is a *wave modifier*, not a unit. From Act II, Skitterkin waves can carry the Skittish trait (section 3). It reads as fear: they're being chased.
- **Fleeing Skitterkin** (A2M1 on), the runners ahead of the Hollow in mixed waves: their rules live in [§5.4 Fleeing Skitterkin](#fleeing-skitterkin).
- **No Skitterkin unit has an attack, an aura that harms, or any effect on towers (rule).** Their traits only change how they move.
- **Brood Hauler, the dramatic-irony unit.** In Act I its codex reads "Carries stolen stardust. High bounty!" When it dies, its sack bursts in a puff of glitter, and a few tiny shapes scurry *back the way they came* into the brush. They are non-hostile, untargetable, and cost no leak (their count is data; the sim only announces the burst, `SackBurst`, and never makes them units). Attentive players notice. Its armor is heavy for Act I on purpose: high enough that a Rivet below T3 hits it at the 20% floor, so the Thumper and the T3 Rivet's pierce are what A1M2's required armor counter means. From Act II the sack is visibly a cluster of young and the codex entry is rewritten (the codex lines are owned by the story docs). Its behavior never changes; only the player's understanding does. In A3M5 and the finale, Haulers return on the path as **friendly bearers** (an `allies` unit, not an enemy) carrying the vats' unsung dead home ([maps.md §5.4](maps.md#54-allies-on-the-map)).
- **Elder.** In Act I it reads as a slow, grumpy boss-lady. On re-read, it is protecting the young by holding the group to its pace.
- **The Quiet Wave (A1M5, choice C1).** A wave group tagged `quiet_wave` made of existing units: one `elder` (Old Thrum) leading 5–8 `nibbler`s with the **`youngling` wave modifier** (speed ×0.5, leak 0 each, bounty 0, the art's small `youngling` sprite variant, and they never get Skittish). Thrum keeps her normal leak 2, so the whole wave leaking costs at most 2 integrity. It arrives after the boss is driven off, with no preview badge beyond the normal icons and no prompt. Tracking and medal rules are in [core-loop.md §2.7](core-loop.md#27-hold-fire).
- **Youngling modifier.** The same `youngling` modifier is reused for non-hostile young in later mixed waves and escorts. In data it is a **wave tag** (`WaveTag`, like `fleeing` and `quiet_wave`) on the group, not an enemy trait or a unit of its own: it changes existing units for that group only, adds nothing to the threat intel, and maps to no counter category. Younglings never count toward medals, and the Peeker ([core-loop.md §6.9](core-loop.md#69-the-peeker)) uses the same sprite.
- **Path direction (story rule):** Skitterkin spawns sit on the side facing the Hollow's region, and their exits lead past the colony into the wilderness. They were always going *through*, not *to* (research §1). [maps.md §7](maps.md#7-storytelling-with-the-map) owns this rule for map layout.

### 5.2 Aelari (body: Crystalline)

Elegant crystal constructs piloted by distant Aelari minds. They glide rather than walk, in formation, with geometric precision, and they chime when hit. The faction identity is **shields and trickery**.

| ID | Name | HP | Armor | Shield | Spd | Leak | Bounty | Layer | Traits | Recommended act |
|---|---|---|---|---|---|---|---|---|---|---|
| `glimmer` | **Glimmer** | 60 | 0 | 40 / 10 / 3 | 1.1 | 1 | 6 | G | Shielded | Act II start |
| `weft_warden` | **Weft Warden** | 250 | 3 | 200 / 20 / 3 | 0.6 | 3 | 18 | G | Heavy shield, light armor | Act II early |
| `veilwalker` | **Veilwalker** | 90 | 0 | 30 / 10 / 3 | 1.0 | 2 | 10 | G | Cloaked | Act II early |
| `lightwing` | **Lightwing** | 60 | 0 | 60 / 10 / 4 | 1.3 | 1 | 8 | A | Flying, shielded | Act II mid |
| `blinkstrider` | **Blinkstrider** | 110 | 0 | 50 / 10 / 3 | 1.0 | 2 | 10 | G | Blink: 2.5 tiles forward every 6 s (0.8 s tell) | Act II mid |
| `cantor` | **Aegis Cantor** | 150 | 0 | 100 / 15 / 3 | 0.8 | 2 | 14 | G | Shield-recharge aura: allies within 2 regain 15 shield/s | Act II late |

### 5.3 Everglow Security (body: Mechanical)

Corporate, cold, and spotless. They arrive in A3M2, when Clean Exit sends Compliance Drones walking the path to repossess the colony core (a leak is a repossession). Remote-operated drones and walkers: **Everglow doesn't risk staff; it sends product** (Director Joy Sterling, she/her, gives the orders). (This also keeps the player from gunning down humans, which protects the hopeful ending.) The units broadcast polite PA lines ("Please remain compliant"), and their death effects are clean shutdowns with a falling price tag. The faction identity is **armor**, plus support machines, and psionic damage does only about a third against them (×0.35, §2.2). Under C4 Purge they spawn with −2 armor from A3M5 on ([core-loop.md §6.11](core-loop.md#611-quills-directives-c4-in-play)).

| ID | Name | HP | Armor | Shield | Spd | Leak | Bounty | Layer | Traits | Recommended act |
|---|---|---|---|---|---|---|---|---|---|---|
| `compliance` | **Compliance Drone** | 120 | 4 | — | 1.0 | 1 | 6 | G | Armored | Act III early |
| `expediter` | **Expediter** | 150 | 3 | — | 1.1 | 1 | 12 | G | Haste aura: allies within 2 get +30% speed | Act III early |
| `associate` | **Maintenance Associate** | 160 | 3 | — | 0.9 | 1 | 14 | G | Healer aura: Mechanical allies within 1.5 regain 12 HP/s | Act III early |
| `liability` | **Liability-Class Enforcer** | 600 | 12 | — | 0.5 | 4 | 30 | G | Heavy armor | Act III early–mid |
| `auditor` | **Auditor** | 220 | 6 | — | 0.8 | 2 | 20 | G | **Jammer:** every 10 s, a 2 s ring tell, then jams towers within 2 tiles for 3 s | Act III mid |
| `gunship` | **Asset Recovery Gunship** | 300 | 8 | — | 0.8 | 3 | 22 | A | Flying, armored | Act III mid |
| `blackbudget` | **Black Budget Operative** | 200 | 6 | — | 1.0 | 2 | 18 | G | Cloaked, armored | Act III mid |

**As built (T703).** The Maintenance Associate, the Liability-Class Enforcer, the Asset Recovery Gunship and the Black Budget Operative are their rows (`src/content/enemies/associate.ts`, `liability.ts`, `gunship.ts`, `blackbudget.ts`), spawning 1.5 s, 2.5 s, 2.0 s and 1.5 s apart in a group. The Associate's aura is the rule in §3; the other three need no new system (the Gunship flies an air lane, the Operative's cloak is §2.5's). Prim's PA greets each the first time the save meets it ([act3.md § Act III barks](../story/campaign/act3.md)). **C4 Purge** is a run modifier, `{ kind: 'enemyStat', stat: 'armor', faction: 'everglow', flat: -2 }` (`src/sim/factionArmor.ts`): every unit of the faction, a boss and the units it launches included, spawns with its armor −2 (never below 0; Corroded and armor pierce subtract from that as usual), and its def carries `openPanel`, which render draws as a maintenance hatch hanging open off its flank with a blinking `orange.4` spark (`HealAuraView`; T740a draws it into the sprites).

**As built (T603).** The Compliance Drone and the Expediter are their rows (`src/content/enemies/compliance.ts`, `expediter.ts`), spawning 1.0 s and 1.5 s apart in a group; the Expediter's aura is the rule above. A leak costs its `leak` like any unit's (on A3M2 that is the repossession). Their PA is Compliance Officer Prim's voice: on a map whose waves send Everglow Security, Prim is on the radio, and a wave that sends them says `everglow` on its `wave_start` and `wave_cleared`, so her bark waits for one ([core-loop.md §6.3](core-loop.md#63-barks)). Every Everglow Security unit dies in a **shutdown** (`render/views/deathLook.ts`), in every act: no pop, no debris; an old-monitor power-off line at its body collapses to a dot and winks out, and a white price tag on its string drops to the ground and fades (`EverglowView`, with the `fx.power_off` and `fx.price_tag` sprites). How the units look is [art-direction.md §6](../art/art-direction.md#6-story-and-world-sprites)'s Everglow Security row.

### 5.4 The Hollow (body: Void)

**The unmourned dead.** Stardust is the Skitterkin's sung dead; ripping it out of the Deep Halls unsung, burning it, or force-crystallizing it in Second Harvest's vats leaves lonely echoes that run together into one hungry absence. The Hollow is that absence: grief with no one to mourn it, made by Everglow's mining (full lore: [../story/bible.md](../story/bible.md#the-hollow), [../story/races.md](../story/races.md#the-hollow)). It is the consequence, not the villain, and it can't be killed, only scattered or laid to rest.

**How that plays:**
- **Wrong in every channel.** Silhouettes have the wrong number of edges (mostly Skitterkin shapes, some Aelari, a few no one recognizes), they move in stutters and frame-skips, they render in the reserved Hollow palette ([../art/art-direction.md §4](../art/art-direction.md#4-faction-visual-language)), and nearby music and sound effects drop out. Near them the jingle is heard *hummed wrong* (audio).
- **Hungry, not frightened.** Hollow units go for the living: they **hush** fleeing Skitterkin in mixed waves, refugees and choir singers on escort maps, and scripted allies such as Bricks at the Gap (who blocks them and is worn down rather than hushed, on a scripted timeline) ([maps.md §5.2](maps.md#52-objective-variants), [§5.4](maps.md#54-allies-on-the-map)). Hushing is shown as a squeak, a struggle, and a vanish, never anything worse ([../story/style-guide.md §8](../story/style-guide.md#8-content-guidelines)). The player should feel the difference between "frightened" movement and "hungry" movement without reading a word.
- **Hushing** follows the hush rule below, on every map.
- **Gathering (the `consumer` trait).** A Maw may draw in other non-boss **Hollow** units (pieces rejoining) and, within the hush rule's limit, **one** Skitterkin enemy or refugee (the hushed becoming part of it; that gather is the Maw's one hush, and it grows by the gathering rule instead of turning Heavy). It never takes Everglow or Aelari units (no echo to take), never a boss, and **never a Skitterkin tower's units** (swarmlings and leapers always come home; [towers.md §8](towers.md#8-presentation-and-personality)). A gathered Skitterkin doesn't count toward Pests Processed.
- **Scattering and rest.** Through Act III, a destroyed Hollow unit simply leaves the fight: it unravels into cold-violet motes that drift away (presentation only). In the finale, units broken outside the choir's song **scatter and re-form**, and units broken inside it are **laid to rest**; those rules live in [maps.md §5.5](maps.md#55-the-leaving-song-finale-rules).
- **Identity:** splitting, gathering, phasing, and hushing (jamming). Weak to Psionic, resistant to Energy. They can use **rift lanes**, ground routes that cut through terrain where no path should be ([maps.md §4](maps.md#4-paths-and-air-lanes)).
- **First appearance:** A2M1 (Rig Nine), where Skitterkin flee *ahead* of the first Motes. Act I may show only the six-frame camera glimpse, never a unit.

| ID | Name | HP | Armor | Shield | Spd | Leak | Bounty | Layer | Traits | Recommended act |
|---|---|---|---|---|---|---|---|---|---|---|
| `mote` | **Mote** | 25 | 0 | — | 1.6 | 1 | 2 | G | Comes in clusters of 6–12; can use rift lanes | Act II start (A2M1, first Hollow), Act III |
| `fracture` | **Fracture** | 200 | 0 | — | 0.9 | 2 | 8 | G | Splitting: 2 Shards (`fracture_shard`: 80 HP, no armor, speed 1.1, leak 1, bounty 4, Clustered) → each splits into 2 Motes. A whole Fracture pays 24 | Act II end (A2M6), Act III |
| `maw` | **Maw** | 400 | 2 | — | 0.7 | 2 (+1 per absorb) | 20 (+3 per Hollow absorb only) | G | **Armored**; **Gathering** (`consumer`): every 4 s, after a 1 s tendril tell, draws in the nearest eligible unit within 1 tile (§5.4: Hollow, or at most one Skitterkin; never a boss), adding that unit's current HP to its own HP and max HP and growing 10% in size. Max 5 absorbs. | Act III early |
| `riftmoth` | **Rift Moth** | 120 | 0 | — | 1.2 | 1 | 10 | A | Flying; Phasing: untargetable for 1.5 s every 5 s (0.5 s flicker tell) | Act II end (A2M6), Act III |
| `undertow` | **Undertow** | 350 | 5 | — | 0.8 | 2 | 18 | G | Burrowing: every 7 s digs in for 3 s, with a visible ripple trail | Act III mid |
| `silencer` | **Silencer** | 260 | 4 | — | 0.8 | 2 | 22 | G | **Jammer:** every 12 s, targets a **Hum Choir** within 2.5 tiles if there is one (else the highest-tier tower; ties: lowest entity id), skipping jam-immune towers (§4), with a 2 s creeping-tendril tell, then jams it for 4 s | Act III mid–late |

**As built (T602).** The Maw is its row and the gathering rule above (`src/content/enemies/maw.ts`), 2.0 s apart in a group. The Undertow is its row on the burrow rule (§3: 4 s up, the last 0.8 s the dirt-spray tell, 3 s under at its own pace; `undertow.ts`), 1.5 s apart in a group; underground it plays its own `under` pose and leaves a trail of ripples on the ground behind it along its route (`HollowView`; the Digger keeps its mound). Rift lanes run in `src/sim/rifts.ts` ([maps.md §4](maps.md#4-paths-and-air-lanes)). How the units look, the Maw's growth steps included, is [art-direction.md §6](../art/art-direction.md#6-story-and-world-sprites)'s Maw and Undertow rows.

#### Fleeing Skitterkin

**This is the one home for the fleeing rules** (A2M1 on). Skitterkin groups tagged `fleeing` are the runners in mixed waves: they carry the Skittish modifier and spawn 2–4 s before the Hollow group on the same route (§7; content validation `[fleeing-lead]` holds every fleeing group in a wave with hushing units on its route to it). A fleeing group with nothing behind it yet (A2M1's first waves) is fine.

- **Rules:** they **leak for 0** integrity, pay a **bounty of 1** if killed, count as **0 threat** ([maps.md §6.2](maps.md#62-threat-budget-planning-tool)), and are **medal-exempt** ([core-loop.md §2.7](core-loop.md#27-hold-fire)). Allies never target them ([maps.md §5.4](maps.md#54-allies-on-the-map)).
- The **Spare runners** filter ([core-loop.md § Spare runners](core-loop.md#spare-runners)) stops towers from picking them as targets, so sparing them is free in play. The skill play is killing the Hollow before it reaches them.
- A Hollow unit that reaches one hushes it (the hush rule, next). QUILL notices when the player kills one (`skitterkin_killed_ahead`, [core-loop.md §6.3](core-loop.md#63-barks)).

#### The hush rule

**This is the one home for the hush rule; it applies on every map.**

- A non-boss Hollow unit that reaches a hushable unit (a `fleeing` Skitterkin enemy, or an escort refugee, bearer, or singer) stops for the **0.5 s** hush tell, and that unit is removed (no leak, no bounty, not counted as processed).
- **Contact (rule, [D101](../decisions.md#d101--2026-11-09--m4-cut-act-ii-part-one)):** the two are on the **same layer** (a ground Hollow unit never hushes a flyer, and an air one never hushes a walker) and within **0.4 tiles**, measured along the route when both walk the same one and in a straight line when they don't (where two roads merge). A unit out of reach (burrowed, Phased, or leaving) touches no one, Hollow or victim: a Hollow unit that digs in, phases, or leaves mid-tell lets its victim go with the hush unspent.
- **The tell (rule):** the Hollow unit and its victim both stand still for the 0.5 s. Towers may still shoot either: if the victim dies or leaks first, the Hollow unit walks on with its hush unspent; if the Hollow unit dies, the victim runs on. Two Hollow units never take the same victim: each victim goes to its nearest free Hollow unit and each Hollow unit takes its nearest such victim (ties to the earlier-spawned unit), so the outcome never depends on processing order; a unit left out tries again a moment later.
- A hushed Skitterkin counts as a loss for **Skittish** (§3): the runners within 2 tiles bolt.
- **Each non-boss Hollow unit can hush at most one.** Hushing **heals it to full HP and raises its base speed by 15%**, applied to `base` before chill and haste (the speed rule in §2.4 becomes `base × 1.15 × (1 − chill) × (1 + haste)`). It becomes visibly **Heavy** (a darker, swollen variant; tell id `heavy`, §3), then carries on along its route to the exit, ignoring every other hushable unit. A Heavy unit that reaches an escort's safe exit still costs one sheltered refugee, like any enemy ([maps.md §5.2](maps.md#52-objective-variants)).
- So feeding the Hollow a refugee or a fleeing unit never slows it down for long: it costs the 0.5 s tell and hands back a full-health, faster enemy.
- Exceptions: a Maw's one hush is a gather instead (it grows rather than turning Heavy; Gathering above), Bricks at the Gap blocks and is worn down on a timeline, Pebble can't be hushed, and bosses follow their own scripts (§6).
- Tune mixed waves and escorts with this rule on in the harness ([maps.md §6.4](maps.md#64-balance-harness)).

---

## 6. Bosses

**Rules for all bosses:**
- Pinned and Stasis become **Chilled 50%**; that converted chill is already boss strength and is **not halved again**. Other Chilled effects work at half strength, and so does Lulled (×1.25). Unnerved interrupts but doesn't slow.
- Health bar with **phase markers**. Each phase transition has a telegraph and at most **2 s** of invulnerability (shown clearly). **As built:** damage that reaches the next phase's threshold stops there, so no burst skips a phase; the new phase starts with **1.5 s** of invulnerability (still targetable: shots plink off), during which its ability timers wait. Phase 1 starts as the boss spawns.
- Every boss ability has a tell of at least **1.5 s**. As built, each sneeze and each dig tells for exactly 1.5 s (a rule, `BOSS_ABILITY_TELL_SEC`, not per-boss data); surfacing has no tell.
- **A leaking boss drains all remaining integrity**, and a boss reaching an Escort map's safe exit is a defeat ([core-loop.md §2.9](core-loop.md#29-core-integrity-lose-condition)). Bosses never use the hush rule's one-hush limit; their scripts say what they do.
- Bounty 0; the wave clear bonus for a boss wave is tripled ([core-loop.md §2.3](core-loop.md#23-credits-the-in-map-currency)).
- Names marked *working name* may be changed by the story docs. Where the story gives a boss a different in-fiction name, the table shows both; dialogue and codex use the story name.
- **Bosses can end without dying** (§6.1): Chitterbloom is driven off, Ves'thara retreats, the Penitent pivots, and the Unsung is laid to rest. None of those endings counts as a leak.

| Boss | Faction / body | Map (story) | Stats | Phases |
|---|---|---|---|---|
| **Matriarch Chitterbloom** (`chitterbloom`; Everglow's codename. Her real name is **Bramble**, used from A3M1) | Skitterkin / Organic | A1M5 | A long fight (target 2,000–3,000 HP), light armor, very slow; exact numbers and phase thresholds in `chitterbloom.ts` | **1 (to about 60%):** waddles forward and sneezes out a pair of Nibblers every few seconds. **2 (to about 25%):** burrows twice and surfaces each time with a Bunchling. **3:** panics: a strong Haste and a constant Huddle-heal on nearby young (the Huddle rule in §3, at the Elder's radius and rate). **End at 0%: `driveOff`.** As built: the first sneeze comes one sneeze period into the fight; her first dig 4 s into phase 2 (after the telegraph) and the second 4 s after she surfaces; she keeps her pace underground; once both burrows are done she does nothing more in phase 2. Her burrows are boss behaviour, not the Burrowing trait: her intel shows the `boss` icon. She is never killed: she turns and flees off the map edge with her brood. She returns in A3M1 as an ally who grants **Underfoot** ([core-loop.md §3.2](core-loop.md#32-ability-roster)). The Quiet Wave follows her. |
| **The Glass Witch** (`glass_witch`) *(working name; Ves'thara's lumenglass avatar)* | Aelari / Crystalline | A2M2 | HP 1800, shield 1200 (regen 30/s, delay 4), speed 0.5 | Walks the **rig branch** of a Protect-the-asset map ([maps.md §5.2](maps.md#52-objective-variants)): she only ever targets the extraction rigs. **1:** Cantor-style shield pulse every 8 s (restores 120 shield to her and Aelari within 2 tiles, 1.5 s tell). **2 (70%):** keeps the pulse and blinks 2.5 tiles every 7 s (1.5 s tell, holding still; the first tell starts with the phase, so she blinks 3, 10, and 17 s after crossing 70%); in-stage cue (she reads your counter aloud). **End at 40%: `retreat`.** As built, her blinks are boss behaviour, not the Blink trait (her intel shows the `boss` icon); she leaks along the rig branch, so a leak drains the asset. |
| **Sunderglass Penitent** (`sunderglass_penitent`) | Aelari / Crystalline | A2M5 | HP 1200, shield 600 (regen 40/s, delay 4), speed 0.2 | **1:** marches behind a shield wall and emits a Cantor-style recharge pulse: every 8 s (1.5 s tell), 60 shield (a tenth of its own) to itself and every Aelari within 2 tiles. **2 (shield broken):** the moment its shield first breaks (not at an HP share), it sheds 3 cloaked **Glimmer-shards** onto the road, spread along it 0.6 tiles behind her, at her, and 0.6 ahead (`spreadTiles`, D138: pieces to find, not hidden in her sprite) (`glimmer_shard`: 60 HP, no armor or shield, speed 0.2 so they walk with it, leak 1, bounty 3). While any shard lives, its shield re-forms to full 4 s after each break ([D137](../decisions.md#d137--2026-11-10--m5-cut-act-ii-part-two-a2m4a2m6)); with all three dead it doesn't. Phase 2 has no pulse. **End at 50%, or when the scripted Hollow surge wave starts if that comes first: `pivot`** (§6.1). The Penitent kneels over the refugees and becomes the Ward, and the map becomes an Escort. As built, see *How the shield-broken phase and the pivot run* below. (Phase 3, blinking 3 tiles every 8 s, is used only if A2M5 is split and the boss fight gets its own map.) Tuned for A2M5's curve (T560, [D137](../decisions.md#d137--2026-11-10--m5-cut-act-ii-part-two-a2m4a2m6)): every Standard reference build breaks the shield in W5, and she walks about 12 tiles in the 60 s before W6, so a forced pivot kneels her at the end of the fencing with the rig road's junction inside her Ward's ring. Kneel takes revealing the shards on her first leg and killing them on the break (a skilled build earns it in W5 with 10–15 s to spare, D138; par doesn't), so the pivot cue doesn't always come at W6: a fast player sees it in W5. W6 can't be called early (`noCall`), so her fight always plays. |
| **"Shareholder Value"** Executive Assault Platform (`shareholder_value`) | Everglow / Mechanical | A3M5 (piloted by Sterling by remote) | HP 9000, armor 15, speed 0.3 | **1:** advances and deploys Compliance Drones from its hangar. **2 (66%):** **Hostile Takeover:** a 3 s visible targeting laser, then jams the `min(2, floor(0.25 × towers placed))` highest-tier towers for 4 s (jam rules apply; the formula keeps it inside the 25% limit). **3 (33%):** jettisons its plating (armor 0, Haste 40%) while PA lines turn frantic. In-stage cues at each phase (Sterling defending her throughput). |
| **The Gathering Maw** (`gathering_maw`) | Hollow / Void | A3M6 | HP 12000, armor 4, speed 0.3 | Comes up the road *behind* the sheltering Skitterkin. **1:** gathers eligible units (§5.4) within 2 tiles every 5 s (with tell) and grows. **2 (50%):** splits into 3 Maws (each with 20% of max HP). **3:** the survivors merge into one again, enraged (Haste 30%). |
| **The Unmaking** (`unsung`) *(design's working name; story name: **the Unsung**)* | Hollow / Void | Finale, Phase 2 | HP 30000 across phases | Fought at the mouth of the Deep Halls while the choir sings ([maps.md §5.5](maps.md#55-the-leaving-song-finale-rules)). **1 (100–75%):** gathers. **2 (75–50%):** splits. **3 (50–25%):** phases and burrows. **4 (25% and below), the Song:** its HP can't fall below 1%; it brings Silencer adds (hushing). **End: `layToRest`**, scripted to the countdown: when the song's rest progress reaches 100%, it joins the song instead of fighting, and Dawn begins. Damage dealt to it inside the song radius feeds rest progress. |

### 6.1 Boss scripting

Boss behavior that the story needs is **data on the boss's map** (map script triggers and actions, [../tech/story-runtime.md § Map scripts](../tech/story-runtime.md#map-scripts-story-driven-sim-changes)), not special-case code.

| Hook | Rule |
|---|---|
| **In-stage dialogue** | Triggers on boss HP thresholds or phase changes emit script cues (≤ 4 lines, [../story/style-guide.md §4](../story/style-guide.md#4-where-story-is-delivered)). They never pause the game unless the cue is marked as a brief pause. Used in A2M2, A2M5, and A3M5. |
| **`driveOff`** (at 0% HP) | The boss becomes untargetable (a visible "retreating" state), runs straight to the nearest map edge at its base speed (faster if that wouldn't get it out within 4 s), and leaves. Its brood leaves with it the same way: **every other unit of the boss's wave still on the map** (her young, and anything that spawned with her; put units that must stay in another wave). No leak, no death effect, no bounty. The wave resolves once they're all off the map and pays the tripled boss bonus. |
| **`retreat`** (at a set HP %) | Same as `driveOff`, triggered at the threshold instead of at 0, but the boss leaves alone. The boss's remaining wave groups still spawn. |
| **`pivot`** (at a set HP % or trigger) | Every hostile unit of the boss's faction stands down: it stops, fades out over 1 s, and is removed (no leak, no bounty). The boss becomes a stationary **ward ally** at its position (Hollow units inside its 2.5-tile radius are Chilled 40%). The map's objective switches as the trigger's actions specify (A2M5: Defend becomes Escort, the meter is relabeled **Evacuated**, and refugee groups start spawning). The briefing must foreshadow it. A2M5 pivots at the Penitent's 50% or when W6 starts, whichever comes first (D137), so forcing it early is a skill medal (Kneel). |
| **`layToRest`** | The boss ends when the song's rest progress reaches 100% (finale only). |

**Script hooks (as built).** Triggers: `bossPhase: N` (a live boss is in phase N or later; phase 1 fires as it spawns) and `bossHpPct: p` (a live boss, of the `boss` id if given, is at or below that share of its HP; `p` is a share in (0, 1), so 0.55, never 55). A boss's HP stops exactly at its ending's threshold, so `bossHpPct` at `endAtPct` cues its retreat or pivot (A2M2's cues: `bossPhase: 1` with the C1 `when` at spawn, then `bossHpPct` 0.7, 0.55, and 0.4); a pivoting boss stays live through its 1 s stand-down, so the trigger still sees it. Both fire on the tick after the change. The action `bossEnd: 'driveOff' | 'retreat' | 'pivot'` starts every live boss's ending at once, whatever its HP; with no boss on the map the event is spent. `standDown: <faction>` stands that faction's live hostile units down without a boss. The sim refuses `layToRest`, as an action or a boss's `ending`, until the finale (`enemy.boss.layToRest` in `src/sim/gates.ts`).

**"Whichever comes first" in data (A2M5; `dev_penitent` in `src/render/__fixtures__/devBattle.ts` is the worked example).** Two events carry the same objective actions (`setObjective` and `spawnAllies`, plus the cue): one on `bossHpPct` at the boss's `endAtPct` (its own `pivot` ending ran), and one on the surge wave's `start` with `when: { stat: 'pivotWave', lte: 0 }` that adds `bossEnd: 'pivot'` first. Whichever is reached first runs; the other is spent (a forced pivot leaves the boss above 50% and immune, and an earlier pivot has set `pivotWave`). **Kneel** is `{ stat: 'pivotWave', gte: 1, lte: 5 }`.

**How the shield-broken phase and the pivot run (rule; T506).** The modules are `src/sim/enemyAbilities/shieldBroken.ts` and `pivot.ts`; the Ward is `src/sim/systems/allies.ts`.
- **The break.** A shield-broken phase (`fromPct: 'shieldBroken'`) is never reached by HP: HP thresholds skip it, and the boss's HP runs on to its ending. The tick after a hit takes the shield to 0, the phase begins (BossPhase) with **no** invulnerability: the shattered shield is the telegraph, and the window is the player's. Its shards spawn along its route about it, evenly from `spreadTiles` behind to `spreadTiles` ahead (the Penitent's 0.6; D138), into its wave (it resolves only once they're gone), each carrying the boss's uid.
- **The re-form.** Each break in that phase while a shard lives starts a 4 s clock from the breaking hit. It runs through everything (fire, Stasis, the boss's own timers), and when it runs out with a shard alive the shield is full again (ShieldReformed). A shard that died, leaked, or stood down doesn't count; with all three gone the shield only regenerates by its own rule. The shards come once, at the first break.
- **Standing down.** A unit standing down holds still, can't be targeted or reached (it is `leaving`), uses no ability, and is removed 1 s later (StoodDown as it begins; the body fades down the alpha ladder). It never leaks, pays nothing, isn't a kill (no split, no Skittish loss), and books against its wave, which resolves and pays its clear bonus once the rest of it is gone (tripled for the boss's wave). Neutral units of the faction stay.
- **The pivot.** BossEnded `pivot`; `stats.pivotWave` records the wave (first pivot only); the boss's faction stands down, the boss included; the boss's `ward` spawns where it stood: an ally of kind `ward` (stationary, never hurt, no attack, never a refugee). A boss with no `ward` only stands down. A boss that is already leaving ignores a second ending.
- **The Ward.** Each tick, every live Hollow unit (any layer) within its radius that an ally could reach (not burrowed, Phased, leaving, or cloaked and unrevealed) is Chilled 40% for the next movement tick, so it holds exactly while the unit stays inside (the strongest chill wins; a Hollow boss takes half). On screen the Ward is the boss's body in its `kneel` pose, fading in over the stand-down's second, with a steady `blue.3` ring at its radius (`render/views/WardView.ts`).
- **Story difficulty** scales the Penitent's shield and pulse like every shield; no shard, re-form, or Ward number changes.

---

## 7. Wave design rules

- **Teach → test → twist.** A new enemy first appears alone or in a small, slow group, with a "NEW" badge and a codex popup (the teach wave). Later waves combine it with known threats (test). A later map mixes it with a new modifier (twist).
- **Threat intel vs required counters (rule).** Map data lists two things ([maps.md §6.3](maps.md#63-one-new-thing-per-map)):
  - **`threatIntel`**: every defense trait present in the map's waves, shown as briefing icons ([core-loop.md §1](core-loop.md#1-session-loop-between-maps)). It is always complete and accurate.
  - **`requiredCounters`**: at most **3** counter categories (§3.1; for example Air + Shield + Detection) the map actually demands. Each one is backed by exactly one no-counter build (`noCounterBuilds`) that omits every answer in that category and must lose. The 4th loadout slot is always the player's free choice.
  - **Soft enemies** (§3.1) may make up at most **15%** of any wave's threat ([maps.md §6.2](maps.md#62-threat-budget-planning-tool)), so they can flavor a wave but never decide it.
  - A map adds at most **one new required-counter category** compared with every earlier map.
- **Mixed waves tell the story.** From A2M1, Skitterkin flee *ahead of* Hollow units in the same wave: `fleeing` groups that spawn 2–4 s before the Hollow on the same route, leak for 0, and pay 1 ([§5.4 Fleeing Skitterkin](#fleeing-skitterkin)).
- **Wave tags.** A wave group may carry story tags (for example `quiet_wave`, `fleeing`) that the sim tracks for flags, barks, and medal exemptions ([core-loop.md §2.7](core-loop.md#27-hold-fire)).
- **Act identities:** Act I waves are mostly Skitterkin swarms with one new trait per map. Act II waves center on Aelari shields and trickery, with Skittish Skitterkin. Act III waves are Everglow armor plus Hollow chaos, often from multiple spawns. The finale uses everything.
- **Jammers:** see section 4 for limits.

---

## 8. Death and feedback by act

Tone shifts through feedback, following the research doc's tone table ([../research/emotional-storytelling.md §2](../research/emotional-storytelling.md#2-shifting-tone-from-whimsical-to-serious-without-whiplash)):

| Act | Skitterkin death | Other factions |
|---|---|---|
| I | A comic "pop" with confetti and a squeak | n/a |
| II | A pop, then a small, sad squeak; no confetti | Aelari constructs shatter into chiming shards |
| III | No confetti. A few frames of a still body that lingers briefly (no Tidybots come for it) | Everglow: a clean shutdown and a falling price tag. Hollow: they unravel into static and cold-violet motes with no sound (the silence is the effect) |
| Finale | Skitterkin are allies; none die | Hollow laid to rest: warm-gold motes rise ([maps.md §5.5](maps.md#55-the-leaving-song-finale-rules)). Hollow scattered: violet motes drift back |

In Acts I–II, **Tidybots** (cheerful cleanup drones) hover in after each wave resolves and vacuum up the remains with a chime. They never appear in Act III ([../art/art-direction.md §7](../art/art-direction.md#7-vfx)).

---

## Open questions

1. **Explosive vs Crystalline.** Should Explosive get ×1.25 against Crystalline, to give splash a role in Act II after shields break? It would be a fifth deviation in the matrix (a readability cost).
2. **Overflow conversion** in the shield step (overflow returns to raw at the inverse multiplier) is accurate but subtle. The simpler alternative is "overflow is lost." Accuracy feels fairer; confirm.
3. **Elder's Huddle** makes splash very strong against Skitterkin. Is that intended as a "learn splash" lesson in Act I, or is it too punishing in Act II?
