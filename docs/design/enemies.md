# Enemies

Combat resolution (damage types, the damage/defense matrix, status effects), enemy defense traits and their counters, tower disabling, the enemy roster by faction, bosses, and wave design rules.

> **Numbers:** every number in this doc is a **first-pass tuning value** unless it is labeled a **rule**. Tuning values live in data files (`enemies` data). Once the content files exist, they become the home for exact numbers, and this doc keeps roles, rules, and target ranges (see [../tech/architecture.md](../tech/architecture.md)).
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

Only four cells deviate from 1.0, on purpose (readability). They carry story: Ves'thara's towers struggle against her own people and badly against Sterling's machines (so Psionic's armor-ignore never makes Mindspike the answer to Everglow armor), and they are the best weapon against the Hollow.

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
- **Shields** sit on top of HP and have their own bar. Shielded enemies regenerate `shieldRegen` per second after `shieldDelay` seconds without shield damage, unless the data says they don't.
- **Splash** hits every enemy whose center is inside the radius for full damage (no falloff, for readability).
- **DoT** (damage over time) ticks every 0.25 s and **bypasses armor** but not shields.
- **Beams are not DoT.** A beam (Prism Spire, the Lantern's light-beam) deals its damage per second in beam ticks of `tickLength` seconds (default 0.25 s; `raw = dps × tickLength`), and armor applies to each tick at `effArmor × tickLength`. So armor subtracts from a beam's *damage per second* rather than from each tiny tick, and the 20% floor still applies per tick.

### 2.4 Status effects

| Status | Effect | Stacking / limits | Bosses |
|---|---|---|---|
| **Chilled X%** | Move speed × (1 − X). | Only the strongest source applies, except swarmling chills, which stack with each other to 30% and then count as one source. **Cap 70%.** | Half strength, except a Chilled 50% converted from Pin or Stasis, which is already boss strength and isn't halved again |
| **Soaked** | +25% Energy damage taken, and Kinetic and Explosive hits strip its shields at ×0.8 instead of ×0.5 (2.1). | Refreshes duration. | Normal |
| **Corroded** | −1 armor per stack (armor can't go below 0). | Stacks up to the applying tower's max. Each stack lasts 5 s and refreshes on a new hit. | Normal |
| **Marked X%** | +X% damage taken from all sources. | Highest only. | Normal |
| **Pinned** | Movement stops. A pinned flyer is **grounded**: ground-only towers can hit it. | After a Pin ends, the target is immune to Pin for 1 s. | Converted to Chilled 50% for the same duration |
| **Stasis** | Frozen in place. Still takes damage. **Interrupts** abilities. | After Stasis ends, immune to Stasis for **2× the duration** of the Stasis just applied (a 1.5 s Stasis gives 3 s of immunity). | Converted to Chilled 50% |
| **Lulled** | Ability cooldowns run ×1.5 longer (tick at 2/3 speed). | While inside a Lullaby radius; doesn't stack. | ×1.25 (half strength) |
| **Unnerved** | −20% speed. **Interrupts and blocks** active abilities. | Refreshes duration. | Interrupt only (no slow) |
| **Revealed** | A cloaked enemy can be targeted. | While inside a detection radius, plus any linger time. | n/a |
| **Haste X%** (enemy aura) | Move speed × (1 + X). | Highest only. **Cap +50%.** | Normal |

**Speed rule:** `speed = base × (1 − chill) × (1 + haste)`. Speed is 0 while Pinned or in Stasis.

**Interrupt rule:** an interrupted ability (a blink, burrow, gather, jam, or heal pulse) is cancelled, even mid-tell, and its cooldown restarts from zero.

### 2.5 Detection

- **Cloaked** enemies are invisible to towers. **Rule:** an undetected cloaked enemy is untouchable: no targeting, splash, auras, or links affect it. The *player* still sees a faint shimmer, so they know it's there (readability). It still leaks normally.
- An enemy is **Revealed** while inside the detection radius of a detector (Lookout Shack, Seer's Lantern) or a Scanner Sweep, plus any linger time. Revealed enemies can be targeted by every tower.

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
| **Fast** | `fast` | Moves well above the normal pace (Zoomer 2.0 tiles/s). | A lean, streaking sprite | Slows (Sprinkler, Stasis Bloom, Suppressing Fire); damage early on the route |
| **Flying** | `flying` | Uses air lanes; only A towers can hit it. | Shadow on the ground; dotted air lane | Skyhook, Sproing Pad, Rivet, Zapcoil, Harpoon, Prism, Mindspike, Cloudburst; Pin to ground it |
| **Burrowing** | `burrower` *(new)* | Periodically digs in (untargetable) and moves underground. | Dirt spray 0.8 s before; a ripple trail underground | Kill it before it digs; Stasis or Unnerved blocks the dig; Truthlight; Scuttle Den and Underfoot hit it underground |
| **Splitting** | `splitter` | Spawns smaller enemies on death. | Visibly "packed" sprite with bulges | Splash; Chilled zones near the death point; overkill doesn't help, so plan for the children |
| **Healer aura** | `healer` | Restores HP of allies nearby. | Green pulses | Focus it with Strong targeting or Railspike; Unnerved interrupts the pulse |
| **Shield-recharge aura** | `shield_aura` *(new)* | Restores allies' shields. | Blue-white chime pulses | Energy splash; kill it first; Corrosive Kiss slows shield regen |
| **Haste aura** | `haste_aura` *(new)* | Speeds up allies nearby. | Speed lines, a metronome tick | Kill it first; strong slows (the speed rule caps haste) |
| **Blink (phase-shift)** | `blink` *(new)* | Teleports forward along the path. | A 0.8 s shimmer and an afterimage at the destination | Stasis or Unnerved interrupts; Truthlight blocks it; place damage later on the route |
| **Phasing** | `phasing` *(new)* | Briefly untargetable (flyers). | A 0.5 s flicker | Burst damage between phases; Truthlight |
| **Gathering** | `consumer` *(new)* | Draws nearby Hollow pieces and fleeing Skitterkin into itself to grow (grief gathering more grief; see §5.4 for what it may take). | Inward-pulling tendrils for 1 s | Kill the small enemies first, or burst the gatherer; interrupt; Gravity Well to separate them |
| **Jammer** (story name for the Hollow's version: *hushing*) | `disabler` | Briefly disables towers (section 4). | An expanding ring or a tendril, at least 1.5 s | Interrupt during the tell, Hum Choir (shorter jams; Rally Chorus: immunity), System Reboot, spacing towers out |
| **Skittish** | `skittish` *(new)* | When an ally within 2 tiles dies, gains Haste 40% for 1.5 s (under the 50% haste cap). | Ears flatten, a panic squeak | Slows, and kill groups with splash rather than one at a time |
| **Huddle** | `huddle` *(new)* | Allies within 1.5 tiles match the leader's pace and regenerate. | Allies cluster tightly around it | Splash loves clusters; kill the leader to scatter them |

Other art tell ids used by the roster: `carrier` (Brood Hauler), `boss`, `hollow`, and `heavy` (a Hollow unit that has hushed someone under the hush rule, §5.4). The tell vocabulary is owned by [../art/art-direction.md §8](../art/art-direction.md#8-readability-and-enemy-ability-tells). Ids marked *(new)* are proposed additions to that vocabulary.

### 3.1 Counter categories

**This table is the canonical trait → counter-category map** (it is rule data, `rules.ts`). A map's `requiredCounters` are drawn from these categories ([maps.md §6.3](maps.md#63-one-new-thing-per-map)), and the **Answers** column is what a category's no-counter build must leave out ([maps.md §6.1](maps.md#61-per-act-targets)).

| Category | Traits | Answers (every tower, spec, link, and Technician ability here; a no-counter build excludes all of them) |
|---|---|---|
| **armor** | Armored (light and heavy) | Harpoon; Rivet T3+ and Railspike (armor pierce, ignore armor); Skyhook [Seeker Swarm]; Prism Spire; Corroded sources (Gloop, Thumper [Bunker Buster], Acid Rain, Sticky Flak); Psionic (Mindspike) where the armored units are Hollow or Aelari, never against Everglow. Against light armor (Acts I–II), also Thumper |
| **shield** | Shielded, Shield-recharge aura (`shield_aura`) | Every Energy source (Zapcoil, Prism Spire) and every Soaked source (Sprinkler T3+, Cloudburst, the Conductive link) |
| **detection** | Cloaked | Lookout Shack, Seer's Lantern, Scanner Sweep |
| **air** | Flying | Every tower that can hit air on that air lane (Skyhook, Rivet, Zapcoil, Harpoon, Prism, Mindspike, Lantern, Sproing, Cloudburst, Brave Hearts), and every Pin that grounds flyers there |
| **burrowed** | Burrowing | Scuttle Den, Underfoot, Stasis Bloom, Lantern [Truthlight], Mindspike [Dread] (Unnerved blocks the dig) |
| **splash** | Splitting, Huddle, clustered groups (Mote clusters) | Every splash, chain, or multi-target attack ([towers.md §2.1](towers.md#21-role-coverage)'s Splash row, plus Skyhook against air clusters) |
| **jam** | Jammer | Hum Choir, System Reboot, and tell interrupters (Stasis Bloom, Flash Freeze, Dread, Stillness) |
| *intel-only* | Fast, Blink, Phasing, Skittish, Haste aura, Healer aura, Gathering; also the `boss` and rift-lane icons | None: shown in the threat intel, never a required counter, and exempt from the soft-trait rule |

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
- **Wave-design limit:** in par play ([maps.md §6.4](maps.md#64-balance-harness)), no more than **25%** of the player's towers should be jammed at the same moment.

---

## 5. Roster

Columns: **HP**, **Armor**, **Shield** (`max / regen per s / delay s`), **Spd** (tiles/s), **Leak** (core damage), **Bounty** (credits), **Layer**. All numbers are first-pass tuning values.

**Roster total: 27 enemy types** (8 + 6 + 7 + 6), plus the bosses in section 6.

**Spawn spacing.** Each enemy has a default spawn interval within a wave group (wave data may override it per group): Nibbler **0.8 s**, Zoomer **0.5 s**. Other types are set when their first wave is authored.

### 5.1 Skitterkin (body: Organic)

Round, fuzzy, squeaky, and harmless-looking. **They never attack anything; they only run.** In Act I they look silly (pratfalls, waddles, confetti pops). From Act II they look *panicked*, glance backward, and carry young. In Act III some of them are your allies, and the escort missions put them on the path again, this time walking to safety ([maps.md §5](maps.md#5-map-modifiers-and-objective-variants)).

| ID | Name | HP | Armor | Shield | Spd | Leak | Bounty | Layer | Traits | Recommended act |
|---|---|---|---|---|---|---|---|---|---|---|
| `nibbler` | **Nibbler** | 30 | 0 | — | 1.0 | 1 | 3 | G | — | Act I start |
| `zoomer` | **Zoomer** | 20 | 0 | — | 2.0 | 1 | 4 | G | Fast | Act I early |
| `chonk` | **Chonk** | 180 | 2 | — | 0.6 | 2 | 12 | G | Light armor, tanky | Act I early |
| `puffwing` | **Puffwing** | 40 | 0 | — | 1.1 | 1 | 5 | A | Flying (fluffy gliders) | Act I mid |
| `bunchling` | **Bunchling** | 60 | 0 | — | 0.9 | 1 | 5 | G | Splitting: 3 Nibblers on death | Act I mid |
| `digger` | **Digger** | 70 | 1 | — | 0.9 | 1 | 7 | G | Burrowing: every 6 s digs in for 2 s at 1.5× speed | Act I late |
| `elder` | **Elder** | 160 | 2 | — | 0.6 | 2 | 12 | G | Huddle: allies within 1.5 move at its pace and regenerate 4 HP/s | Act I late |
| `hauler` | **Brood Hauler** | 300 | 6 | — | 0.7 | 3 | 15 | G | Armored shell, carries a glittering sack (see below) | Act I late |

- **Skittish** is a *wave modifier*, not a unit. From Act II, Skitterkin waves can carry the Skittish trait (section 3). It reads as fear: they're being chased.
- **Fleeing Skitterkin** (A2M1 on), the runners ahead of the Hollow in mixed waves: their rules live in [§5.4 Fleeing Skitterkin](#fleeing-skitterkin).
- **No Skitterkin unit has an attack, an aura that harms, or any effect on towers (rule).** Their traits only change how they move.
- **Brood Hauler, the dramatic-irony unit.** In Act I its codex reads "Carries stolen stardust. High bounty!" When it dies, its sack bursts in a puff of glitter, and a few tiny shapes scurry *back the way they came* into the brush. They are non-hostile, untargetable, and cost no leak. Attentive players notice. From Act II the sack is visibly a cluster of young and the codex entry is rewritten (the codex lines are owned by the story docs). Its behavior never changes; only the player's understanding does. In A3M5 and the finale, Haulers return on the path as **friendly bearers** (an `allies` unit, not an enemy) carrying the vats' unsung dead home ([maps.md §5.4](maps.md#54-allies-on-the-map)).
- **Elder.** In Act I it reads as a slow, grumpy boss-lady. On re-read, it is protecting the young by holding the group to its pace.
- **The Quiet Wave (A1M5, choice C1).** A wave group tagged `quiet_wave` made of existing units: one `elder` (Old Thrum) leading 5–8 `nibbler`s with the **`youngling` wave modifier** (speed ×0.5, leak 0 each, bounty 0, the art's small `youngling` sprite variant, and they never get Skittish). Thrum keeps her normal leak 2, so the whole wave leaking costs at most 2 integrity. It arrives after the boss is driven off, with no preview badge beyond the normal icons and no prompt. Tracking and medal rules are in [core-loop.md §2.7](core-loop.md#27-hold-fire).
- **Youngling modifier.** The same `youngling` modifier is reused for non-hostile young in later mixed waves and escorts. Younglings never count toward medals, and the Peeker ([core-loop.md §6.9](core-loop.md#69-the-peeker)) uses the same sprite.
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
| `fracture` | **Fracture** | 200 | 0 | — | 0.9 | 2 | 8 | G | Splitting: 2 Shards (80 HP, speed 1.1) → each splits into 2 Motes | Act III early |
| `maw` | **Maw** | 400 | 2 | — | 0.7 | 2 (+1 per absorb) | 20 (+3 per Hollow absorb only) | G | **Gathering** (`consumer`): every 4 s, after a 1 s tendril tell, draws in the nearest eligible unit within 1 tile (§5.4: Hollow, or at most one Skitterkin; never a boss), adding that unit's current HP to its own HP and max HP and growing 10% in size. Max 5 absorbs. | Act III early |
| `riftmoth` | **Rift Moth** | 120 | 0 | — | 1.2 | 1 | 10 | A | Flying; Phasing: untargetable for 1.5 s every 5 s (0.5 s flicker tell) | Act III mid |
| `undertow` | **Undertow** | 350 | 5 | — | 0.8 | 2 | 18 | G | Burrowing: every 7 s digs in for 3 s, with a visible ripple trail | Act III mid |
| `silencer` | **Silencer** | 260 | 4 | — | 0.8 | 2 | 22 | G | **Jammer:** every 12 s, targets a **Hum Choir** within 2.5 tiles if there is one (else the highest-tier tower; ties: lowest entity id), skipping jam-immune towers (§4), with a 2 s creeping-tendril tell, then jams it for 4 s | Act III mid–late |

#### Fleeing Skitterkin

**This is the one home for the fleeing rules** (A2M1 on). Skitterkin groups tagged `fleeing` are the runners in mixed waves: they carry the Skittish modifier and spawn 2–4 s before the Hollow group on the same route (§7).

- **Rules:** they **leak for 0** integrity, pay a **bounty of 1** if killed, count as **0 threat** ([maps.md §6.2](maps.md#62-threat-budget-planning-tool)), and are **medal-exempt** ([core-loop.md §2.7](core-loop.md#27-hold-fire)). Allies never target them ([maps.md §5.4](maps.md#54-allies-on-the-map)).
- The **Spare runners** filter ([core-loop.md § Spare runners](core-loop.md#spare-runners)) stops towers from picking them as targets, so sparing them is free in play. The skill play is killing the Hollow before it reaches them.
- A Hollow unit that reaches one hushes it (the hush rule, next). QUILL notices when the player kills one (`skitterkin_killed_ahead`, [core-loop.md §6.3](core-loop.md#63-barks)).

#### The hush rule

**This is the one home for the hush rule; it applies on every map.**

- A non-boss Hollow unit that reaches a hushable unit (a `fleeing` Skitterkin enemy, or an escort refugee, bearer, or singer) stops for the **0.5 s** hush tell, and that unit is removed (no leak, no bounty, not counted as processed).
- **Each non-boss Hollow unit can hush at most one.** Hushing **heals it to full HP and raises its base speed by 15%**, applied to `base` before chill and haste (the speed rule in §2.4 becomes `base × 1.15 × (1 − chill) × (1 + haste)`). It becomes visibly **Heavy** (a darker, swollen variant; tell id `heavy`, §3), then carries on along its route to the exit, ignoring every other hushable unit. A Heavy unit that reaches an escort's safe exit still costs one sheltered refugee, like any enemy ([maps.md §5.2](maps.md#52-objective-variants)).
- So feeding the Hollow a refugee or a fleeing unit never slows it down for long: it costs the 0.5 s tell and hands back a full-health, faster enemy.
- Exceptions: a Maw's one hush is a gather instead (it grows rather than turning Heavy; Gathering above), Bricks at the Gap blocks and is worn down on a timeline, Pebble can't be hushed, and bosses follow their own scripts (§6).
- Tune mixed waves and escorts with this rule on in the harness ([maps.md §6.4](maps.md#64-balance-harness)).

---

## 6. Bosses

**Rules for all bosses:**
- Pinned and Stasis become **Chilled 50%**; that converted chill is already boss strength and is **not halved again**. Other Chilled effects work at half strength, and so does Lulled (×1.25). Unnerved interrupts but doesn't slow.
- Health bar with **phase markers**. Each phase transition has a telegraph and at most **2 s** of invulnerability (shown clearly).
- Every boss ability has a tell of at least **1.5 s**.
- **A leaking boss drains all remaining integrity**, and a boss reaching an Escort map's safe exit is a defeat ([core-loop.md §2.9](core-loop.md#29-core-integrity-lose-condition)). Bosses never use the hush rule's one-hush limit; their scripts say what they do.
- Bounty 0; the wave clear bonus for a boss wave is tripled.
- Names marked *working name* may be changed by the story docs. Where the story gives a boss a different in-fiction name, the table shows both; dialogue and codex use the story name.
- **Bosses can end without dying** (§6.1): Chitterbloom is driven off, Ves'thara retreats, the Penitent pivots, and the Unsung is laid to rest. None of those endings counts as a leak.

| Boss | Faction / body | Map (story) | Stats | Phases |
|---|---|---|---|---|
| **Matriarch Chitterbloom** (`chitterbloom`; Everglow's codename. Her real name is **Bramble**, used from A3M1) | Skitterkin / Organic | A1M5 | HP 2500, armor 2, speed 0.4 | **1 (100–60%):** waddles forward and sneezes out 2 Nibblers every 5 s. **2 (60–25%):** burrows twice (3 s each) and surfaces with a Bunchling. **3 (25–0%):** panics: Haste 50% and constant Huddle-heal on nearby young. **End at 0%: `driveOff`.** She is never killed: she turns and flees off the map edge with her brood. She returns in A3M1 as an ally who grants **Underfoot** ([core-loop.md §3.2](core-loop.md#32-ability-roster)). The Quiet Wave follows her. |
| **The Glass Witch** (`glass_witch`) *(working name; Ves'thara's lumenglass avatar)* | Aelari / Crystalline | A2M2 | HP 1800, shield 1200 (regen 30/s, delay 4), speed 0.5 | Walks the **rig branch** of a Protect-the-asset map ([maps.md §5.2](maps.md#52-objective-variants)): she only ever targets the extraction rigs. **1:** Cantor-style shield pulse every 8 s. **2 (70%):** blinks 2.5 tiles every 7 s (1.5 s tell); in-stage cue (she reads your counter aloud). **End at 40%: `retreat`.** |
| **Sunderglass Penitent** (`sunderglass_penitent`) | Aelari / Crystalline | A2M5 | HP 3500, shield 2500 (regen 40/s, delay 4), speed 0.35 | **1:** marches behind a shield wall and periodically emits a Cantor-style recharge pulse. **2 (shield broken):** splits off 3 cloaked Glimmer-shards that must be revealed and killed to stop its shield re-forming. **End at 50%, or when the scripted Hollow surge wave starts if that comes first: `pivot`** (§6.1). The Penitent kneels over the refugees and becomes a ward ally, and the map becomes an Escort. (Phase 3, blinking 3 tiles every 8 s, is used only if A2M5 is split and the boss fight gets its own map.) |
| **"Shareholder Value"** Executive Assault Platform (`shareholder_value`) | Everglow / Mechanical | A3M5 (piloted by Sterling by remote) | HP 9000, armor 15, speed 0.3 | **1:** advances and deploys Compliance Drones from its hangar. **2 (66%):** **Hostile Takeover:** a 3 s visible targeting laser, then jams the `min(2, floor(0.25 × towers placed))` highest-tier towers for 4 s (jam rules apply; the formula keeps it inside the 25% limit). **3 (33%):** jettisons its plating (armor 0, Haste 40%) while PA lines turn frantic. In-stage cues at each phase (Sterling defending her throughput). |
| **The Gathering Maw** (`gathering_maw`) | Hollow / Void | A3M6 | HP 12000, armor 4, speed 0.3 | Comes up the road *behind* the sheltering Skitterkin. **1:** gathers eligible units (§5.4) within 2 tiles every 5 s (with tell) and grows. **2 (50%):** splits into 3 Maws (each with 20% of max HP). **3:** the survivors merge into one again, enraged (Haste 30%). |
| **The Unmaking** (`unsung`) *(design's working name; story name: **the Unsung**)* | Hollow / Void | Finale, Phase 2 | HP 30000 across phases | Fought at the mouth of the Deep Halls while the choir sings ([maps.md §5.5](maps.md#55-the-leaving-song-finale-rules)). **1 (100–75%):** gathers. **2 (75–50%):** splits. **3 (50–25%):** phases and burrows. **4 (25% and below), the Song:** its HP can't fall below 1%; it brings Silencer adds (hushing). **End: `layToRest`**, scripted to the countdown: when the song's rest progress reaches 100%, it joins the song instead of fighting, and Dawn begins. Damage dealt to it inside the song radius feeds rest progress. |

### 6.1 Boss scripting

Boss behavior that the story needs is **data on the boss's map** (map script triggers and actions, [../tech/story-runtime.md § Map scripts](../tech/story-runtime.md#map-scripts-story-driven-sim-changes)), not special-case code.

| Hook | Rule |
|---|---|
| **In-stage dialogue** | Triggers on boss HP thresholds or phase changes emit script cues (≤ 4 lines, [../story/style-guide.md §4](../story/style-guide.md#4-where-story-is-delivered)). They never pause the game unless the cue is marked as a brief pause. Used in A2M2, A2M5, and A3M5. |
| **`driveOff`** (at 0% HP) | The boss becomes untargetable (a visible "retreating" state), runs to the nearest map-edge exit at its base speed over at most 4 s, and leaves. Any of its spawned young still on the path leave with it. No leak, no death effect. The wave resolves and pays the tripled boss bonus. |
| **`retreat`** (at a set HP %) | Same as `driveOff`, triggered at the threshold instead of at 0. The boss's remaining wave groups still spawn. |
| **`pivot`** (at a set HP % or trigger) | Every hostile unit of the boss's faction stands down: it stops, fades out over 1 s, and is removed (no leak, no bounty). The boss becomes a stationary **ward ally** at its position (Hollow units inside its 2.5-tile radius are Chilled 40%). The map's objective switches as the trigger's actions specify (A2M5: Defend becomes Escort, the meter is relabeled **Evacuated**, and refugee groups start spawning). The briefing must foreshadow it. |
| **`layToRest`** | The boss ends when the song's rest progress reaches 100% (finale only). |

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
4. **A2M5 pivot timing.** Is "50% HP or the surge wave, whichever first" readable, or should the pivot be purely wave-timed so it never depends on DPS?
