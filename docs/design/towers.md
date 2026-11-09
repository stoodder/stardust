# Towers

The tower roster, roles, upgrade paths, stacking rules, targeting, and adjacency synergies ("links").

> **Numbers ([D019](../decisions.md#d019--2026-11-09--t105c-content-data-first-pass-numbers)):** a tower with a data file in [`src/content/towers/`](../../src/content/towers/) (Rivet, Thumper, Sprinkler, Skyhook, Zapcoil) has its exact numbers there, and this doc keeps its role, rules, and target ranges ("about", "~"). A tower or specialization with no data yet keeps its **first-pass numbers** here, its only home, until its data lands and they move. A number labeled a **rule** is a rule wherever it sits.
>
> **Ordering:** each tower lists a *recommended* act of introduction. [../story/campaign.md](../story/campaign.md) is **authoritative** for when each tower actually appears and unlocks.

Related docs: [enemies.md §2](enemies.md#2-combat-resolution) (damage types, the damage/defense matrix, and status effects; this doc does not repeat them) · [core-loop.md](core-loop.md) (credits, build/sell rules, commander abilities) · [progression.md](progression.md) (how towers, specializations, and permanent boosts are unlocked) · [maps.md](maps.md) (buildable tiles, high ground, power nodes).

---

## 1. Design principles

1. **One clear job per tower; the specialization flips or sharpens it.** A player should be able to say what a tower is *for* after one look.
2. **Factions carry the story.** The roster is split into four factions of four towers each. You start with corporate kit, buy junk from a Vrell trader, are trusted with Aelari crystal, and are finally *given* homes by the creatures you spent Act I shooting. The Skitterkin towers are the emotional payoff of the campaign, so they get the most warmth and personality (section 8).
3. **Cover every counter more than once.** Each defense trait in [enemies.md](enemies.md) has at least two tower answers, from at least two factions, so loadouts are puzzles rather than mandatory picks.
4. **Rule: towers are never damaged or destroyed by enemies.** A few late enemies can briefly **Jam** (disable) towers ([enemies.md §4](enemies.md#4-tower-disabling-jamming)). Hum Choir (shorter jams; immunity with its Rally Chorus specialization) and the System Reboot ability are the counters.
5. **Cross-faction links are the strongest story signal.** Most synergy links (section 6) pair towers from different factions. Alliances literally make you stronger.

---

## 2. Roster overview

Targets: **G** = ground, **A** = air. Damage types and their effects are defined in [enemies.md §2.1](enemies.md#21-damage-types). **T1 price** is a band (target): **Low** about 90–100 credits, **Mid** 110–130, **High** 140–160; the exact price is the tower's data file, or its §7 entry while it has none.

| # | ID | Tower | Faction | Role | Damage | Targets | T1 price | Recommended act | Acquired by |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `rivet` | **Rivet Autoturret** | Everglow | Single-target DPS (generalist) | Kinetic | G+A | Low | Act I start | Issued (free) |
| 2 | `thumper` | **Thumper Mortar** | Everglow | Splash | Explosive | G | Mid | Act I early | Issued |
| 3 | `sprinkler` | **Frostline Sprinkler** | Everglow | Slow / control | Kinetic (tiny) | G (A with spec B) | Low | Act I early | Issued |
| 4 | `skyhook` | **Skyhook Flak Battery** | Everglow | Anti-air splash | Explosive | A only | Mid | Act I mid | Issued |
| 5 | `crane` | **Salvage Crane** | Vrell | Economy | none (Kinetic with spec B) | G (spec B) | High | Act II early | Zibzab, Stardust |
| 6 | `zapcoil` | **Zapcoil** | Vrell | Anti-shield chain | Energy | G+A | Mid | Act I late | Zibzab, free sample |
| 7 | `harpoon` | **Grapple Harpoon** | Vrell | Anti-armor; grounds flyers (spec B) | Kinetic, high per hit | G+A | High | Act II early | Zibzab, Stardust |
| 8 | `lookout` | **Lookout Shack** | Vrell | Detection + support (range) | none | — | Low | Act II early | Zibzab, Stardust |
| 9 | `prism` | **Prism Spire** | Aelari | Ramping beam (anti-shield, boss killer) | Energy | G+A | High | Act II mid | Ves'thara, gift (A2M5) |
| 10 | `mindspike` | **Mindspike Obelisk** | Aelari | Armor-ignoring DPS; anti-Hollow | Psionic | G+A | High | Act II late | R&D attunement, Intel |
| 11 | `lantern` | **Seer's Lantern** | Aelari | Detection + debuff (Mark) | Psionic (tiny) | G+A | Mid | Act II late | R&D attunement, Intel |
| 12 | `bloom` | **Stasis Bloom** | Aelari | Hard control; interrupts abilities | none | G+A | High | Act III early | R&D attunement, Intel |
| 13 | `burrow` | **Scuttle Den** | Skitterkin | DoT swarm; hits burrowed enemies | Kinetic DoT | G (A with spec B) | High | Act III early | Gift (A3M1) |
| 14 | `choir` | **Hum Choir** | Skitterkin | Support (damage aura, jam protection) | none | — | Mid | Act III early–mid | Gift (A3M1 if C1 spared; otherwise A3M4) |
| 15 | `gloop` | **Gloop Spitter** | Skitterkin | Splash + armor shred | Explosive | G | Mid | Act III mid | Gift |
| 16 | `sproing` | **Sproing Pad** | Skitterkin | Anti-air; grounds flyers | Kinetic | G+A (air first) | Mid | Act III mid–late | Gift |

Acquisition rules and the story-timed gift schedule are in [progression.md §8](progression.md#8-tower-acquisition).

### 2.1 Role coverage

| Need | Towers that answer it (spec in brackets when only a specialization does) |
|---|---|
| Single-target DPS | Rivet, Harpoon, Mindspike, Prism, Rivet [Railspike] |
| Splash / swarm clear | Thumper, Gloop, Zapcoil, Rivet [Rivet Storm], Mindspike [Echo Spike], Sproing Pad [Big Bonk] |
| Slow / control | Sprinkler, Stasis Bloom, Scuttle Den, Mindspike [Dread], Hum Choir [Lullaby] (slows enemy abilities, not movement) |
| Anti-air | Skyhook, Sproing Pad, Rivet, Zapcoil, Harpoon, Prism, Mindspike, Sprinkler [Cloudburst] |
| Detection (cloaked) | Lookout Shack, Seer's Lantern, *Scanner Sweep ability* |
| Anti-shield | Zapcoil, Prism Spire, Sprinkler (Soaked status, T3) |
| Anti-armor | Harpoon, Prism Spire (its beam's armor applies per second, so it beats heavy armor), Gloop (shred), Rivet T3+ (pierce), Rivet [Railspike], Skyhook [Seeker Swarm] (pierce), Thumper [Bunker Buster], Thumper against light armor (Acts I–II), Mindspike (not against Everglow machines, ×0.35) |
| Burrowed enemies | Scuttle Den, Underfoot ability, Stasis Bloom (prevents burrowing), Seer's Lantern [Truthlight] |
| Support / buffer | Lookout Shack (range or fire rate), Hum Choir (damage, jam protection), Seer's Lantern (Mark) |
| Economy | Salvage Crane |
| Jam protection | Hum Choir (shorter jams; immunity only with [Rally Chorus]), *System Reboot ability* |

Which of these count as a **counter answer**, at which tier or spec and on which maps, is owned by [enemies.md §3.1](enemies.md#31-counter-categories).

---

## 3. Upgrades and specializations

### 3.1 In-map tiers (credits; reset every map)

- **Rule:** tiers 1 → 2 → 3 are linear. At **tier 4** the player picks **one of two specializations (A or B)**. The choice is permanent for that tower in that map. Another tower of the same type can take the other specialization.
- **Rule:** a tower's specializations are offered only once they are unlocked in R&D, and **one purchase unlocks both A and B** for that tower ([progression.md §7.1](progression.md#71-engineering-specializations)), so the in-map A/B choice is always a real choice. Locked specializations show a lock icon and the unlock cost, so the player learns what exists.
- **Cost curve (default; per-tower overrides allowed):** T2 = 0.8 × T1, T3 = 1.5 × T1, T4 = 3.0 × T1. A fully upgraded tower costs about 6.3 × its T1 price.
- **Power curve target:** T2 ≈ 1.4 × T1 effectiveness, T3 ≈ 2.0 × T1 plus a new property, T4 ≈ 3.5–4 × T1 *in its niche* and often weaker outside it. Credit efficiency falls with tier on purpose: limited pads make upgrading worthwhile anyway.

### 3.2 Permanent upgrades (meta; between maps)

Permanent upgrades never replace in-map tiers. They come in two kinds, both defined in [progression.md](progression.md):

- **Specialization unlocks** (Intel, R&D).
- **Tune-ups**: small passive boosts per tower (Stardust, Zibzab's shop), such as +5% damage or −5% build cost, up to 3 ranks per tower.

---

## 4. Stat modifiers and stacking

**Rule (stacking formula):**

```
stat_final = (stat_tier + Σ flat_bonuses) × (1 + Σ percent_bonuses)
```

- `stat_tier` is the tower's stat at its current tier (or specialization).
- **Flat bonuses** (for example "+0.5 range" from a link) add first.
- **Percent bonuses** for the same stat **add together**. Sources: shop tune-ups, synergy links, support auras, tiles (high ground, power node), Field Protocols.
- **Auras of the same kind do not stack**: a tower inside two Hum Choir auras gets only the stronger one. Different aura kinds (Hum Choir damage plus Lookout range) do stack. **The Lookout Shack's adjacency bonus is an aura kind** (range, or fire rate with Overclock Rig): a tower next to two Lookouts gets only the stronger bonus. A support tower is never covered by its own aura.
- **Caps (rule):** total percent bonus is capped at **+150% damage, +100% fire rate, +60% range**. The caps, aura kinds, and tile bonuses are rule data in [`src/content/rules.ts`](../../src/content/rules.ts).
- Effects on *enemies* (Mark, Soaked, Corroded) are applied in the damage pipeline in [enemies.md §2.3](enemies.md#23-damage-pipeline), not here.
- **Jammed** towers have fire rate 0 and provide no auras or links while jammed.

Tile bonuses ([maps.md §3](maps.md#3-tile-types)): **high ground +25% range**, **power node +20% fire rate** (for support towers without a fire rate: +20% aura strength).

**As built** (the sim's side is [architecture.md § Sim public API](../tech/architecture.md#sim-public-api)):
- **Conditional bonuses** (a link's "+20% damage vs Chilled") add to the damage percent before the cap, against an enemy that has the status when the hit lands. A shell checks each victim on impact.
- **Fire rate** is simulated in whole ticks: the bonus applies to the tier's simulated rate, which then rounds back to a whole-tick period. +10% on a 2/s Rivet fires every 27 ticks (2.22/s).
- Permanent tune-ups (`towerStat` modifiers) add to the same per-stat totals as links, auras, and tiles, so they share the caps.

---

## 5. Targeting

- Priorities: **First** (least remaining route distance to the core), **Last**, **Strong** (highest current HP + shield), **Close** (nearest to the tower). The player can change priority at any time, including while paused.
- **Range (rule):** a target is in range when `minRange < distance ≤ range`. Minimum range is exclusive: an enemy exactly at the minimum can't be hit.
- **Tie-break (rule, for determinism):** First, then the lowest entity ID.
- Towers **never** target enemies that are undetected-cloaked, burrowed, phased, or in a layer the tower can't hit (for example a ground-only tower and a flyer that isn't Pinned).
- **Retargeting:** a tower picks its target by priority each time it's ready to fire. Between shots it keeps its current target while that target stays in range.
- **Beam stickiness:** the Prism Spire keeps its target until the target dies or leaves range, regardless of priority, because ramp-up is its whole point.
- **Delivery.** Each attack is **hitscan** (damage lands the tick it fires; the Rivet), a **projectile** with a flight time (the Thumper's lobbed shells; the Skyhook's flak, a straight shot that bursts at the intercept point: where its target will be when it arrives, at the target's current speed, fixed when it fires; not homing), or a **beam** (the Prism Spire and the Lantern's light-beam; beams are not DoT, and armor applies per beam tick: [enemies.md §2.3](enemies.md#23-damage-pipeline)). Each tower's delivery is set in its data.
- **Lead targeting (artillery).** A tower whose shells land after a delay (Thumper) aims at where its target will be along its route after the flight time, at the target's current speed. The impact point is fixed when it fires, so a target that speeds up, slows, or blinks can dodge. The splash hits only the layers the tower targets (a Thumper shell never hits flyers).
- Defaults are listed in each tower's entry. Support towers have no targeting.

---

## 6. Synergy links (adjacency)

Links make the 4-tower loadout a spatial puzzle: *which* four towers, and *where* they sit relative to each other.

### 6.1 Rules

- **Adjacency (rule):** two towers are adjacent if their tiles share an edge **or a corner** (8-neighborhood on the logical grid).
- A link is **active** when both partner towers are built (any tier) and neither is Jammed. Holding fire does not break links.
- **Each link type counts once per tower.** A Rivet touching two Thumpers gets Crossfire once.
- A tower can have several *different* active links (each tower has 2–3 possible partners by design). Their bonuses add under the stacking formula (section 4).
- Links are **flat**: they don't scale with tier (first pass). The Linked Up protocol scales every link bonus by ×1.5.
- **Data:** links live in [`src/content/links/`](../../src/content/links/) (Crossfire, Sitting Ducks, and Conductive so far), the one home of who links with whom. A partner's conditional bonus is a `vsStatus` damage percent, and a tower takes at most one (no link here gives a tower two). A partner can also take `chainJumps` (whole jumps; Linked Up scales them, rounding down) and `soakedSec` (a Soak its hits apply at any tier; the duration doesn't scale). Conductive's Soak lasts as long as the Sprinkler's tier-3 Soak is designed to (3 s). The sim emits `LinkFormed` / `LinkBroken` per adjacent pair and counts each link's uptime.
- **Readability:** active links show as a soft animated tether between the towers, in a color per link. The loadout screen lists which links the chosen four can form. The tower panel lists active links.

### 6.2 Link table

Crossfire, Sitting Ducks, and Conductive are built: their exact values are their files in `src/content/links/`, and their rows give the intent. The other rows are first-pass numbers.

| Link | Partners | Effect | Available from (recommended) | Faction mix |
|---|---|---|---|---|
| **Crossfire** | Rivet + Thumper | Both fire faster (about +10%). | Act I early (the teaching link) | Everglow + Everglow |
| **Sitting Ducks** | Thumper + Sprinkler | Thumper deals more damage to Chilled enemies (about +20%). Sprinkler's radius grows a little. | Act I early | Everglow + Everglow |
| **Conductive** | Sprinkler + Zapcoil | Zapcoil gains chain jumps (+2). Sprinkler applies Soaked from tier 1. | Act I late | Everglow + Vrell |
| **Overwatch** | Rivet + Lookout | Rivet +15% damage. Lookout +0.5 detection radius. | Act II early | Everglow + Vrell |
| **Skywatch** | Skyhook + Lookout | Skyhook +20% range. Lookout +0.5 detection radius. | Act II early | Everglow + Vrell |
| **Reel It In** | Crane + Harpoon | Harpoon kills give +3 credits. Harpoon +10% fire rate. | Act II early | Vrell + Vrell |
| **Resonance** | Zapcoil + Prism | Both +20% damage vs shields. | Act II mid | Vrell + Aelari |
| **Lightsong** | Prism + Lantern | Prism ramps 30% faster. Lantern Mark +5%. | Act II late | Aelari + Aelari |
| **Pinned Down** | Harpoon + Bloom | Harpoon +30% damage vs Chilled or Stasis enemies. Bloom +0.3 radius. | Act III early | Vrell + Aelari |
| **Stillmind** | Mindspike + Bloom | Mindspike +25% damage vs Chilled or Stasis enemies. Bloom pulse cooldown −1 s. | Act III early | Aelari + Aelari |
| **Splash Zone** | Sprinkler + Burrow | Swarmlings +30% move speed and +1 s latch. Sprinkler +0.3 radius. | Act III early | Everglow + Skitterkin |
| **Finders Keepers** | Crane + Burrow | Burrow +1 swarmling. Swarmling kills give +1 credit. | Act III early | Vrell + Skitterkin |
| **Harmony** | Mindspike + Choir | Mindspike hits 1 extra target. Choir aura +0.5 radius. | Act III early–mid | Aelari + Skitterkin |
| **Acid Rain** | Thumper + Gloop | Thumper shells apply 1 Corroded stack. Gloop +0.5 range. | Act III mid | Everglow + Skitterkin |
| **Sticky Flak** | Skyhook + Gloop | Skyhook bursts apply 1 Corroded stack. Gloop +10% fire rate. | Act III mid | Everglow + Skitterkin |
| **Lookie Here** | Lantern + Sproing | Sproing Pad +0.5 range and prefers Marked targets. Lantern +0.5 detection radius. | Act III mid–late | Aelari + Skitterkin |
| **Bounce Chorus** | Sproing + Choir | Sproing Pad Pin +0.5 s. Choir aura +5% damage. | Act III mid–late | Skitterkin + Skitterkin |

Every tower has 2 or 3 link partners. Eleven of the 17 links are cross-faction. The same-faction links are mostly early teaching links (Crossfire, Sitting Ducks) or flavor pairs. The Aelari + Skitterkin link **Harmony** is the "former enemies, now family" beat in mechanical form.

---

## 7. Tower details

Format: **T1** is the base. Each later tier lists only what changes. DPS figures ignore armor and shields.

**Where the exact numbers live** (D019). The five towers built so far, Rivet, Thumper, Sprinkler, Skyhook, and Zapcoil, have their tiers 1–3 in [`src/content/towers/`](../../src/content/towers/) (`rivet.ts`, `thumper.ts`, `sprinkler.ts`, `skyhook.ts`, `zapcoil.ts`), and the Rivet and Thumper specializations are there too. Their entries below give each tier's job and target ranges, not the numbers. **Specs not built yet** (the Sprinkler's, Skyhook's, and Zapcoil's, deferred to M4 by [D064](../decisions.md#d064--2026-11-09--m3-scope-the-m3-cut): they need homing, charge, Soaked, and Stasis) and **every other tower** keep their first-pass numbers here, with a T4 cost on the default curve unless stated. Engineering lists those towers' spec unlocks as "Arrives in a later shipment" ([progression.md §7.1](progression.md#71-engineering-specializations)).

**Specializations as built** (the `specialize` command, `src/sim/specialize.ts`):
- **The command.** A tower specializes only at tier 3, once its pair is unlocked (`SimConfig.specsUnlocked`). It pays the spec's cost after `towerCost` modifiers (tune-ups and Specialist both apply), and the cost joins `invested`, so the sell value counts it. The choice is permanent (`alreadySpecialized`; upgrading stays `maxTier`). The new stats apply at once, and the cooldown carries over.
- **Priority.** A spec whose default priority differs from tier 3's (Railspike's Strong) switches the tower to it. Otherwise the player's chosen priority stays.
- **Rivet Storm's spin-up** restarts on specializing, even mid-fight, then runs from acquiring a target after having none (section 5). Its spin-up and whole-tick fire period are in `rivet.ts`.
- **Cluster Thumper's bomblets.** After the shell's own splash, its bomblets fly a short way from the impact point. Each lands at a point drawn uniformly within the scatter radius (seeded, so replays match) as its own small splash. Bomblets hit the shell's layers, apply the shell's effects, take the tower's damage bonuses (links included) fixed at fire time, and still land if the tower is sold. They don't scatter again. Count, damage, radii, and flight time: `thumper.ts`.
- **Bunker Buster's Corroded** is applied at its max stacks, so each shell refreshes the stacks rather than adding more.

### Everglow towers

Corporate-issue perimeter kit with cheerful product names, safety stickers, and warranty-void warnings. They are reliable and readable, and they make up the starting kit. In A3M2 Sterling revokes the player's Corporate Tower License for one Everglow class mid-wave, and it comes back in A3M4 as jailbroken firmware (section 9).

#### Rivet Autoturret (`rivet`), "Everglow RV-1: Perimeter Peace of Mind™"
- **T1:** the cheap generalist: Kinetic, single target, **hitscan**, G+A, about 15–20 DPS at short range (about 3 tiles). Default: First.
- **T2:** a damage step.
- **T3:** fires faster and gains **armor pierce**, enough that it answers Act I's armor ([enemies.md §3.1](enemies.md#31-counter-categories)).
- **A: Rivet Storm:** minigun. A very high fire rate after a short spin-up, low damage per shot, and no pierce. A swarm shredder, poor against armor.
- **B: Railspike:** sniper. One huge shot every couple of seconds at long range (about double T3's), **ignoring all armor**. Default: Strong.
- **Links:** Crossfire (Thumper), Overwatch (Lookout).

#### Thumper Mortar (`thumper`), "Everglow TM-4: Because Pests Hate Surprises"
- **T1:** lobbed Explosive splash (radius about 1 tile), G only: a slow shell (about one every 2 s) that hits everything it lands on. Medium range with a **minimum range** (exclusive), so an enemy at its foot is safe. Shells take under a second to land and use **lead targeting**: each aims at the target's predicted route position after the flight time, fixed when it fires (section 5). Default: First.
- **T2:** a damage step.
- **T3:** a wider splash and a slightly faster fire rate.
- **A: Cluster Thumper:** each shell also scatters a handful of small bomblets around the impact. Built for clumps.
- **B: Bunker Buster:** a heavy, narrow, slower shell that applies Corroded stacks. Built for armor.
- **Links:** Crossfire (Rivet), Sitting Ducks (Sprinkler), Acid Rain (Gloop).

#### Frostline Sprinkler (`sprinkler`), "AquaGuard irrigation head, *creatively* repurposed"
- **T1:** a `pulse` with no target: about once a second it hits every ground enemy within about 2 tiles for a token Kinetic hit plus a short **Chilled** (about 25%). G only.
- **T2:** a stronger chill and a wider radius.
- **T3:** a stronger chill again (about 35%). By design it also applies **Soaked** for 3 s (more Energy damage, and Kinetic and Explosive bite harder into shields; [enemies.md §2.4](enemies.md#24-status-effects)); that Soak isn't in its data yet (T321, M4), so today Soaked's only source is the Conductive link (section 6).
- **A: Flash Freeze (270; M4):** every 8 s, puts all enemies in radius into **Stasis** for 1.0 s (bosses: Chilled 50% instead).
- **B: Cloudburst (270; M4):** radius 2.8 and **now also hits air**; flyers are Chilled and Soaked.
- **Links:** Sitting Ducks (Thumper), Conductive (Zapcoil), Splash Zone (Burrow).

#### Skyhook Flak Battery (`skyhook`), "Everglow SK-2: Keep Your Skies Corporate"
- **T1:** flak, **air only**: a fast straight shot (not homing) that bursts at the intercept point (section 5) in a splash of under a tile, so a burst catches two or three flyers of a close flock. About one shot a second at medium range. Default: First.
- **T2:** a damage step.
- **T3:** fires faster and reaches a little further.
- **A: Flak Curtain (330; M4):** 3.0 shots/s, 12 damage, splash 1.2. Built for flocks.
- **B: Seeker Swarm (330; M4):** volleys of 4 homing missiles, 25 damage each, armor pierce 4, range 5.0. Default: Strong. Built for armored gunships.
- **Links:** Skywatch (Lookout), Sticky Flak (Gloop).

### Vrell towers

"Zibzab's Genuine Pre-Owned Defensive Solutions." Jury-rigged from scrap, with four-armed ergonomics, mismatched paint, and price tags still attached. Clever, tricky, a little unreliable-looking but never unreliable in play.

#### Salvage Crane (`crane`)
- Licensed from Zibzab after A2M1, so it debuts on longer Act II maps where economy has time to pay back.
- **T1 (150):** no attack. **+10 credits** each time a wave resolves. Kills by *any* tower within radius 2.5 give **+1 credit**. Clears wreckage within 2.5 tiles at double speed with +25% salvage.
- **T2 (120):** +18 per wave.
- **T3 (225):** +28 per wave, +2 credits per kill in radius.
- **A: Haggler's Stall (450):** also pays **interest**: +2% of banked credits when each wave resolves (capped at +40 per wave).
- **B: Magnet Crane (450):** gains an attack. Every 6 s it grabs a Mechanical or armored ground enemy in radius 2.5, lifts it (Pinned 1.5 s), and slams it for 150 Kinetic. Economy effects are kept. Shines against Everglow security in Act III.
- **Design target:** a T1 Crane built on wave 1 pays for itself by about wave 8 on a typical map. It's a greed choice that costs a loadout slot.
- **Links:** Reel It In (Harpoon), Finders Keepers (Burrow).

#### Zapcoil (`zapcoil`)
- **T1:** an Energy arc, G+A, about one shot a second at short range, that **chains to 3 targets** (a short jump range, each jump weaker by a fixed share). Default: First. In data, `jumps` counts the jumps after the first hit (2 here).
- **The chain as built:** each jump goes from the last enemy struck to the nearest enemy this shot hasn't struck within jump range (ties: the lowest uid), on the layers the tier hits, and stops early when there's none. The falloff compounds (each hit is the last one's share), so long Conductive chains never reach 0. Jumps skip neutral units and land on spared runners, as splash does. A neutral first target plinks and the arc still jumps on. The full rules are [`src/sim/attacks/chain.ts`](../../src/sim/attacks/chain.ts)'s header.
- **T2:** a damage step.
- **T3:** chains to one more target and fires a little faster.
- **A: Overload Coil (360; M4):** chains to 8, −10% per jump.
- **B: Capacitor Bank (360; M4):** charges for 4 s, then discharges 250 Energy into one target plus 50% to enemies within 1 tile. Default: Strong.
- **Links:** Conductive (Sprinkler), Resonance (Prism).

#### Grapple Harpoon (`harpoon`)
- **T1 (150):** 40 Kinetic, 0.4 shots/s, range 4.0, **armor pierce 4**, single target, G+A. Default: Strong.
- **T2 (120):** damage 55.
- **T3 (225):** armor pierce 8, 0.5 shots/s.
- **A: Skewer (450):** the harpoon pierces through every enemy in a 5-tile line for 70 damage each.
- **B: Tether (450):** 80 damage, and the target is **Pinned 2.5 s**. A pinned flyer is grounded and can be hit by ground-only towers. Bosses are Chilled 50% for 2.5 s instead.
- **Links:** Reel It In (Crane), Pinned Down (Bloom).

#### Lookout Shack (`lookout`)
- **T1 (100):** no attack. **Detection radius 2.5** (reveals cloaked enemies; [enemies.md §2.5](enemies.md#25-detection)). Adjacent towers +10% range (an aura kind: two Lookouts don't stack, section 4).
- **T2 (80):** detection 3.0, adjacent +15% range.
- **T3 (150):** detection 3.5, revealed enemies stay revealed 2 s after leaving the radius, adjacent +20% range.
- **A: Crow's Nest (300):** detection 5.0, adjacent +25% range, revealed enemies take +10% damage (a Mark-type effect; doesn't stack with Mark).
- **B: Overclock Rig (300):** detection stays 3.5. Adjacent towers get **+20% fire rate** *instead of* range.
- **Links:** Overwatch (Rivet), Skywatch (Skyhook).

### Aelari towers

Elegant floating crystal lattices that chime when they fire, attuned for the player by Ves'thara. Precise and powerful, but psionic towers struggle against mindless machines ([enemies.md §2.2](enemies.md#22-damage-vs-body-matrix)). That is a deliberate Act III tension once Everglow's drones turn hostile.

#### Prism Spire (`prism`)
- **T1 (160):** continuous beam, 12 Energy/s, **ramping +50% per second** on the same target up to ×4 (48/s). Range 3.0, G+A. Retargeting resets the ramp. A beam, not a DoT: armor applies per beam tick ([enemies.md §2.3](enemies.md#23-damage-pipeline)). Default: Strong (sticky; see section 5).
- **Light source at Sundown.** While its beam is active, a Prism Spire pushes back the darkness overlay in radius 2.0, so towers within it keep their full range ([maps.md §5.1](maps.md#51-layout-and-event-modifiers)). Ves'thara: "I will hold the light."
- **T2 (130):** base 16/s.
- **T3 (240):** ramp cap ×5, range 3.5.
- **A: Refractor (480):** splits into 3 beams on 3 targets, ramp cap ×3.
- **B: Sunlance (480):** ramps +100% per second, cap ×10 (up to 160/s). The boss killer.
- **Links:** Resonance (Zapcoil), Lightsong (Lantern).

#### Mindspike Obelisk (`mindspike`)
- **T1 (150):** 18 Psionic, 0.8 shots/s, range 3.0, single target, G+A. Psionic **ignores armor**. Default: First.
- **T2 (120):** damage 26.
- **T3 (225):** damage 34, 1.0 shots/s.
- **A: Echo Spike (450):** each hit echoes 50% damage to all enemies within 1.2 tiles of the target.
- **B: Dread (450):** damage 50. Hit enemies are **Unnerved** for 1.5 s (−20% speed, active abilities interrupted and blocked).
- **Links:** Harmony (Choir), Stillmind (Bloom).

#### Seer's Lantern (`lantern`)
- **T1 (120):** **detection radius 3.0**. A thin light-beam deals 4 Psionic/s to one target and applies **Mark +15%** (more damage taken from all sources). G+A. Default: Strong.
- **T2 (95):** Mark +20%, detection 3.5.
- **T3 (180):** marks 2 targets at once.
- **A: All-Seeing (360):** marks *every* enemy within radius 3.5 at +15%.
- **B: Truthlight (360):** one target is Marked +35% and **cannot cloak, blink, phase, or burrow** while marked.
- **Links:** Lightsong (Prism), Lookie Here (Sproing).

#### Stasis Bloom (`bloom`)
- **T1 (140):** a field of radius 2.0 applies **Chilled 30%**. Every 10 s it pulses: **Stasis 1.5 s** on every enemy in the field. Stasis interrupts and blocks active abilities. G+A.
- **T2 (110):** pulse every 8 s.
- **T3 (210):** radius 2.5, Stasis 2.0 s.
- **A: Gravity Well (420):** each pulse also pulls enemies **back 1.5 tiles** along their route (each enemy at most once every 20 s; bosses immune).
- **B: Timeless Garden (420):** field Chilled 45%, pulse every 6 s.
- **Links:** Pinned Down (Harpoon), Stillmind (Mindspike).

### Skitterkin towers

Gifts from the warrens after the refugee reveal. **They are not purchased; they are given.** Each tower is a *home*: a mound, a nest, a hollow log, with Skitterkin living in it. See section 8 for their personality rules.

#### Scuttle Den (`burrow`)
A warren mound where refugee families shelter. The young-adult "swarmlings" dash out to defend it.
- **T1 (140):** 3 swarmlings, range 2.5. Each swarmling runs out, **latches** onto a ground enemy (including **burrowed** enemies, since Skitterkin can follow anything underground) for 4 s, dealing 5 Kinetic/s (DoT; bypasses armor) and Chilled 10% (stacks to 30% from several swarmlings). Then it runs home and rests 3 s. Swarmlings can't be harmed; they always come home.
- **T2 (110):** 4 swarmlings.
- **T3 (210):** 8 Kinetic/s, latch 5 s.
- **A: Big Family (420):** 7 swarmlings.
- **B: Brave Hearts (420):** 3 Champions: 20/s each, Chilled 15% each, and they **leap onto flyers** too.
- **Links:** Splash Zone (Sprinkler), Finders Keepers (Crane).

#### Hum Choir (`choir`)
A ring of elder Skitterkin humming in harmony. Their song steadies machines and minds. If the Quiet Wave was spared (C1), Old Thrum is in the ring, and the gift arrives early, in A3M1.
- **T1 (130):** aura radius 1.5 (covers adjacent tiles): towers inside get **+10% damage**, and **Jammed durations are halved**. **No Choir aura covers any Choir**, its own or another Choir's, and **Silencers target a Choir first** (skipping jam-immune towers; [enemies.md §5.4](enemies.md#54-the-hollow-body-void)), so where it stands is a decision.
- **T2 (100):** +15% damage, aura radius 2.0.
- **T3 (195):** +20% damage, and Jammed durations inside are cut by **75%** (not immunity).
- **A: Lullaby (390):** also soothes enemies within radius 2.5: their ability cooldowns run **×1.5 longer** (Lulled; [enemies.md §2.4](enemies.md#24-status-effects)).
- **B: Rally Chorus (390):** +30% damage and +10% fire rate, and towers inside are **immune to Jammed**.
- **Audio:** the Choir's hum layers into the procedural music as a harmony line that carries "Everglow Bright" (the Leaving Song), so the motif plays wherever a Choir stands ([../tech/architecture.md § Audio](../tech/architecture.md#audio-srcaudio-m2)).
- **Links:** Harmony (Mindspike), Bounce Chorus (Sproing).

#### Gloop Spitter (`gloop`)
A big, round, happy Skitterkin (an ex-Chonk, recognizably) who spits sticky acid.
- **T1 (120):** 12 Explosive, splash 1.0, 0.6 shots/s, range 3.0, G only. Each hit applies 1 **Corroded** stack (−1 armor per stack, max 5 stacks, 5 s that refresh on hit). Default: Strong.
- **T2 (95):** damage 16, max 6 stacks.
- **T3 (180):** 2 stacks per hit, max 8.
- **A: Big Glorp (360):** leaves a puddle for 3 s: Chilled 25% and 10/s acid (Kinetic DoT; bypasses armor).
- **B: Corrosive Kiss (360):** 3 stacks per hit, max 12. Corroded enemies also regenerate shields 50% slower.
- **Links:** Acid Rain (Thumper), Sticky Flak (Skyhook).

#### Sproing Pad (`sproing`)
A springy mushroom pad with a fearless leaper (a grown-up Puffwing-chaser) who boings into the sky.
- **T1 (130):** the leaper bonks one target for 25 Kinetic, 0.5 leaps/s, range 3.0, G+A, **always prefers flyers** when any are in range. A bonked flyer is **Pinned 1.5 s** (grounded; hittable by ground towers). Bosses: Chilled 50% instead.
- **T2 (105):** damage 35.
- **T3 (195):** Pin 2.0 s, 0.6 leaps/s.
- **A: Sky Bouncers (390):** 2 leapers.
- **B: Big Bonk (390):** 90 damage with a 0.8 splash on landing.
- **Links:** Lookie Here (Lantern), Bounce Chorus (Choir).

---

## 8. Presentation and personality

| Faction | Look | Sound | Idle behavior |
|---|---|---|---|
| Everglow | Clean white-and-teal plastics, safety stripes, logo decals | Crisp clicks, cheerful startup chimes | Scanning sweeps; a tiny "SATISFACTION GUARANTEED" light |
| Vrell | Rusted, patched, mismatched, four-handed levers | Clanks, wheezes, the odd kazoo-like vent | Parts jiggle, smoke puffs, a price tag swings |
| Aelari | Floating crystal facets, soft inner glow | Glass chimes, sustained tones | Slow rotation, light pulses in time with the music |
| Skitterkin | Mounds, moss, woven grass, little lanterns | Squeaks, chirps, hums (the same voices as the Act I enemies) | Residents peek out, wave at adjacent towers, nap between waves, cheer on kills, and do a head-count chirp when swarmlings return |

**Skitterkin warmth rules (design intent):**
- Reuse the Act I enemy silhouettes and squeaks *on purpose*. The player recognizes the Nibbler they shot in map 1, now waving from a burrow.
- Skitterkin towers react to their neighbors: they wave at linked towers, huddle closer when a Hollow unit passes, and celebrate a perfect wave.
- Their units never die. Swarmlings and leapers always return home, and **the Hollow never hushes or gathers them** (story rule, [../story/races.md](../story/races.md#skitterkin)). The game never asks the player to spend Skitterkin lives as ammunition, and it never punishes the player for trusting their allies.
- In dialogue the gifts are called Pebble's friends.
- When the map is won, the residents come out for a small celebration on the results screen.

Element shapes, palettes, and sprite specs are owned by [../art/art-direction.md](../art/art-direction.md).

### Bricks's name tags

On every map from A1M2 where Bricks is the companion, he names one of the player's turrets ([../story/characters.md](../story/characters.md#sgt-ikenna-bricks-okonkwo)).
- **When:** at the first `wave_cleared` of the map, through a radio line ("That one's Denise. After my first wife...").
- **Which tower:** the player's **earliest-built attacking tower still standing** (ties: lowest entity id). Support towers are skipped.
- **Name:** the next unused name from Bricks's list in the dialogue data (Denise, Marguerite, Biscuit, ...). The campaign remembers the list position (`bricksTagIndex` in the save), so names don't repeat across maps; replays reuse that map's first name.
- **Display:** a small cosmetic plate over the tower in the in-world bitmap font, shown while the tower stands. Selling a tagged tower removes the tag and fires the `tower_sold` bark with a `tagged` condition. Tags never affect play.
- **A3M3:** the tag is **`{name}`**, the player's name, on the **last tower the player builds before the SEAL** (if none is built after the tagging cue, the most recently built attacking tower). Its tower type is saved as `memorialTower`, and its wreck becomes the memorial on the finale route ([maps.md §3](maps.md#3-tile-types)).

---

## 9. Rules for story-driven tower changes

The story adds towers as gifts ([progression.md §8](progression.md#8-tower-acquisition)) and removes one class twice. **General rules:**
- A tower class removed *mid-map* by a scripted event powers down every tower of that class and refunds **100%** of their invested credits instantly, so the player can rebuild with the rest of their loadout. The map must be tuned for the event (the balance harness runs it), and the briefing must foreshadow it.
- The removal must be **attributable on screen**: the script cue shows who did it (Sterling's portrait, or QUILL's), and the powered-down towers show a "LICENSE REVOKED" stamp for 1 s before they fold away. The player must lose something they built, and know who took it.
- Between maps, any removed tower must have a replacement path, so the player is never left without a counter (the counter guarantee in [progression.md §8](progression.md#8-tower-acquisition) treats a revoked class as unowned).

**A3M2, Sterling revokes the Corporate Tower License (mid-wave).**
- **Which class:** the Everglow class with **the most credits invested** at the moment of the cue. Ties: the most towers placed, then the earliest slot in the loadout. If the player has no Everglow towers placed, the first Everglow class in their loadout is revoked (they lose less, and that's fine). If the loadout has no Everglow class, the first Everglow class they own is revoked at map end instead, with no mid-map effect.
- **When:** a script cue partway through a mid-map wave (map data), in the same cue as the Orbital Strike revocation ([core-loop.md §2.11](core-loop.md#211-scripted-moments)).
- **After:** the class can't be built for the rest of A3M2, and from A3M3 it shows in the loadout screen greyed out with a REVOKED stamp until the jailbreak.

**A3M4, jailbroken firmware.** Zibzab sells the jailbreak in the base after A3M3 ("Price first: three hundred. Yes, now."): **300 Stardust**, or **free under `door_choice = convoy`** (Goldie's engineers do it). It restores the revoked class with **identical stats and specs**, drawn with the `everglow.jailbroken` palette (logo plate scratched out, a Vrell patch; [../art/art-direction.md §4](../art/art-direction.md#faction-rules)). Tune-ups and specialization unlocks bought before the revocation carry over. **Rule:** A3M3 must pass the counter guarantee without the revoked class, whichever class it is (the harness checks each possible class).

**Finale, QUILL's Directive 0 (only under `quill_choice = keep`).** When the choir enters the Halls, QUILL revokes one tower class by the same selection rule, applied to *all* the player's classes, with the same 100% refund. The "Who's there?" forced input follows; pressing it restores the class (the player rebuilds with the refunded credits). See [maps.md §5.5](maps.md#55-the-leaving-song-finale-rules).

---

## 10. Data shape (for implementers)

The type is `TowerDef` (tiers, specializations, attack delivery, effects, sprites) in [`src/content/types.ts`](../../src/content/types.ts) (overview: [architecture.md § Data shapes](../tech/architecture.md#data-shapes)). This doc's tables are the human-readable spec those types encode: the roster (section 2), tiers and specs (sections 3 and 7), stacking (section 4), targeting and delivery (section 5), and links (section 6).

---

## Open questions

1. **Vrell license prices** (Stardust) vs **Aelari attunement** (Intel): is it confusing that two factions unlock through different currencies? It makes D001's "grind path vs mastery path" concrete, but it needs a clear shop UI.
2. **Railspike range 6.0** may cover most of a small map. Check it against map sizes in [maps.md §6](maps.md#6-difficulty-curve).
3. **Gravity Well** pushback can be degenerate when stacked. The once-per-20-s-per-enemy rule needs balance-harness testing.
4. Should **links scale with tier** (for example +50% at T3+)? Flat is simpler; scaling rewards investment.
5. Is 16 towers enough for post-game variety, or should challenge maps add **variant towers** (for example a Hollow-tainted tower in the post-game)?
6. **Name tag timing.** Is the first wave clear early enough for the tag to register before the player starts selling and rebuilding?
