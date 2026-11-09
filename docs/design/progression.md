# Progression

Meta currencies, medals, Zibzab's shop, Field Protocols (meta perks), veteran modifiers, the R&D tree, tower acquisition, difficulty settings, and pacing targets.

> **Numbers:** every number in this doc is a **first-pass tuning value** unless it is labeled a **rule**. Once the content files exist, they become the home for exact numbers, and this doc keeps roles, rules, and target ranges (see [../tech/architecture.md](../tech/architecture.md)).
>
> **As built:** the catalog is [`src/content/upgrades/`](../../src/content/upgrades/index.ts): `shop.ts` (§4.3), `tuneUps.ts` (§4.2), `protocols.ts` (§5), `rnd.ts` (§7.3 Command), and `access.ts` (§8 tower and ability access, §7.1 Engineering prices). Each item names its `availableAfter` map on the campaign plan (`src/content/campaign.ts`) and grants sim modifiers. Rapport is in for Bricks (after A1M1) and QUILL (after A1M3). Zapcoil's and the Lookout's licenses are in (the Lookout's since T406, 150 after A1M5), and so is Scanner Sweep, sold on R&D Command's shelf after its upgrades (T406; owning it adds it to the loadout's slot-1 pool). Zapcoil's sample: a license priced 0 is given the moment it's stocked ([`src/meta/issued.ts`](../../src/meta/issued.ts)), and the shop lists it, owned, under *Licenses*. The other Vrell licenses, Aelari attunements, System Reboot, the other three Rapports, and the Zibzab Tune-up join with their towers and abilities. The open question is a row above the shop's groups that plays Zibzab's scene ([act1.md § A1M3](../story/campaign/act1.md#a1m3--special-delivery), *Base*); the first base visit with the shop open lands on the Shop tab for his arrival. Field Protocols are equipped on the loadout screen, under the tower grid (§5; [core-loop.md §1](core-loop.md#1-session-loop-between-maps)): one save-wide set, swapped freely, that the battle takes as modifiers. The §10 purchasable-profiles rule is the `[purchasable]` validator ([`validatePurchasable.ts`](../../src/content/validatePurchasable.ts)); `upgrades/reference.ts` holds the reference economy it assumes (1 Intel per map, the bank reset at A2M4's C2 Return). The run-end payouts (§2 Stardust, §3 medal Intel) are [`src/meta/rewards.ts`](../../src/meta/rewards.ts) (`REWARD_RULES`); the order they run in is [meta-runtime.md § Run end](../tech/meta-runtime.md#run-end). The buy rules (stocked, next rank, affordable) are [`src/meta/purchase.ts`](../../src/meta/purchase.ts) ([meta-runtime.md § Purchases](../tech/meta-runtime.md#purchases)).
>
> **Ordering:** [../story/campaign.md](../story/campaign.md) is **authoritative** for when shops, towers, and abilities unlock. This doc defines *what* they are and what they cost.

Related docs: [core-loop.md](core-loop.md) (credits, the in-map currency) · [towers.md](towers.md) (towers, tune-up targets, specializations) · [enemies.md](enemies.md) (the counters this doc guarantees access to) · [../decisions.md](../decisions.md) (D001 #6 currencies, D001 #7 failure).

---

## 1. Currencies

| Currency | Scope | Earned from | Spent on | Feel |
|---|---|---|---|---|
| **Credits** | In-map only; reset every map | Kills, wave clears, early calls, wreckage | Building, upgrading, specializations | Tactical. Defined in [core-loop.md §2.3](core-loop.md#23-credits-the-in-map-currency). |
| **Stardust** | Meta, common | Every map attempt (2) | **Zibzab's shop** (4): Vrell licenses, tune-ups, global upgrades, Field Protocol unlocks | The grind path. Replaying always helps a bit. |
| **Intel** | Meta, rare | Medals and objectives (3) | **R&D** (7): specializations, Aelari attunement, Command upgrades, Field Protocol slots | The mastery path. Playing well unlocks *options*, not raw power. |

**Rule (D001):** Stardust buys *power*; Intel buys *options*. Nothing costs both.

**What Stardust is, in the fiction:** the crystallized remains of the Skitterkin dead ([../story/bible.md §3](../story/bible.md#what-stardust-really-is)). Where the player's Stardust comes from changes by act; the payout mechanics (§2) don't:

| Act | In-fiction source |
|---|---|
| I | Everglow pays it out as a performance bonus, "Everglow's premium mineral." It is made from the "pests" the player processes: Tidybots haul the bodies to Second Harvest, where they are crystallized unsung. |
| II | The same, until the player learns the truth in A2M4 (or from A1M3, if they ask Zibzab). C2 (§2.1) follows the reveal. |
| III and finale | From A3M1, the warrens **give** it: sung, warm-gold stones offered to the one who walks with them. The currency becomes trust, not harvest. Everglow pays nothing any more. |

**Rule:** the currency stays fully usable after the reveal, because the story's moral is that the dead don't mind being useful, they mind being forgotten. The game never penalizes spending it; C2 (§2.1) is the one place the player can choose to give some back. The Stardust icon's shimmer follows the act ramp in [../art/art-direction.md §2](../art/art-direction.md#stardust-shimmer) (warm gold from Act III).

---

## 2. Earning Stardust

Each map has a `stardust` value in its data (its **first-clear reward**).

| Situation | Stardust awarded |
|---|---|
| **First victory** on a map | `stardust` (100%) |
| **Replay victory** (already won before) | `0.4 × stardust × (1 + Σ veteranBonus)` ([§6](#6-veteran-modifiers-replays)) |
| **Defeat** on a map not yet won | `0.25 × stardust × (wavesResolved / totalWaves)`, rounded. This is D001's "keep a small share." **No farming (rule):** after a checkpoint retry, `wavesResolved` counts only the waves resolved in this attempt beyond the checkpoint ([core-loop.md §2.12](core-loop.md#212-checkpoints)). |
| **Defeat** on a map already won | 0 |
| **Holdout maps** ([maps.md §5.2](maps.md#52-objective-variants)) | Treated as a victory at the end, and paid as a **flat** `stardust` that never scales with Evacuated (A3M3: 320), so the score is never a price on what happened at the door |

**First-clear values** are campaign data, listed per map in [../story/campaign.md §4.9](../story/campaign.md#49-shop-stock-and-the-reference-profile). Act totals:

| Act | Maps | `stardust` per map | Act total |
|---|---|---|---|
| I | 5 | 0 (A1M1, the tutorial) to 160 | 580 |
| II | 6 | 180–260 | 1,310 |
| III | 6 | 280–380 | 1,965 |
| Finale | 1 | 500 | 500 |
| **Campaign** | 18 | | **4,355** (plus the 400 Q3 Bonus) |

### 2.1 Story hooks

| Hook | When | Rule |
|---|---|---|
| **Q3 Performance Bonus** | Paid on **A2M4's results screen**, alongside its first-clear reward; its memo arrives on that results screen too ([core-loop.md §6.4](core-loop.md#64-everglow-inbox-memos)) | A scripted grant of **400 Stardust** (tuning value: about 1.8× A2M4's first-clear). It lands just before the debrief, so C2 weighs the full bank. Granted once per save, on the first victory. |
| **C2: Zibzab's Price** | The A2M4 debrief, before the base opens | Two offers, price first, both for the whole bank (the Stardust balance at that moment). **Sell:** Zibzab trades it on the Vrell market; the bank goes to 0 and he pays an **Intel windfall** of `clamp(floor(bank / 150), 3, 8)` plus the exclusive **Zibzab Tune-up** ("Ten percent. Honestly, eight."): +8% damage for every Vrell tower, permanently. **Return:** he carries it to the Skitterkin at cost; the bank goes to 0, his handling fee is an IOU in his ledger that is never cashed, and the finale gains **the Returned** ([maps.md §5.5](maps.md#55-the-leaving-song-finale-rules)). If the bank is 0, there is nothing to trade: `stardust_choice = none` ("No refunds. I did say."). Sets `stardust_choice`. Neither option is wrong, and both options' rewards stay inside the meta power cap (§10). |
| **Jailbroken firmware** | Base, after A3M3 | 300 Stardust, or free under `door_choice = convoy` ([towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)). A3M3's flat 320 keeps it affordable on every path |
| **Zibzab's crate** | A3M6 ("Price first: nothing.") | A one-time free grant; its contents are campaign data. The only time Zibzab gives anything for nothing |

---

## 3. Medals and Intel

Every campaign map has **3 medals**. Each medal awards Intel **the first time** it is earned.

| Medal | Condition | Intel |
|---|---|---|
| **Victory** | Win the map. | 1 |
| **Perfect Core** | Win without losing any core integrity (no leaks). On Escort maps: every refugee saved. **Leaks from medal-exempt units (the Quiet Wave, younglings, fleeing Skitterkin) never count** ([core-loop.md §2.7](core-loop.md#27-hold-fire)). | 1 |
| **Challenge** | A map-specific condition, written in the map data (`ConditionDef`) and shown in the briefing. | 1 |

- Medals can be earned in separate runs (Kingdom Rush style). A single run can earn all three. A run resumed from a checkpoint can't earn Perfect Core or the Challenge medal ([core-loop.md §2.12](core-loop.md#212-checkpoints)).
- **Evaluation (rule):** a Challenge condition about a state ("win with a Crossfire link active") is evaluated **at the moment of victory**; a condition about events ("Gerald is never hit") is checked over the whole run.
- **Challenge medal guidelines:** it should teach or reward a *skill* the map is about, never demand a grind. Good examples: "Win using no Explosive towers," "Clear all 4 wreckage tiles," "Call 6 waves early," "Let no Brood Hauler reach the Hollow side of the map" (story-flavored), and "Win with only 3 tower types." Bad examples: anything that needs a specific shop purchase, anything luck-based, or anything that requires holding fire on a story wave (that choice must stay free; see [core-loop.md §2.7](core-loop.md#27-hold-fire)).
- **Objective Intel:** some story maps award +1 Intel for an optional objective (map data `objectives`, which use the same `ConditionDef` grammar as Challenge medals; [maps.md §9](maps.md#9-map-data-shape-for-implementers)). Budget: 7 across the campaign (campaign data).
- **Veteran medal:** the first victory on a map with veteran modifiers totalling **≥ +100%** awards +1 Intel and a badge ([§6](#6-veteran-modifiers-replays)).

**Intel supply:** 54 from medals (18 maps × 3) + 7 objectives = **61 in the campaign**, plus 3–8 from C2 Sell (§2.1), up to 18 from veteran medals, and more from post-game challenge maps.

---

## 4. Zibzab's shop (Stardust)

Zibzab's shop opens after A1M3, when he arrives. Item names carry Zibzab's voice, in his "price first" format ("Price first: 60 stardust. Barely-Dented Hull Plating! One previous owner, who barely exploded."). Final copy belongs to the [story style guide](../story/style-guide.md#63-shop-copy-zibzab).

- **The open question.** From A1M3 until A2M4 the shop carries one extra item, **"Where does stardust come from?"**, priced "you won't like it, and you can't return it." Asking costs nothing, plays his answer, and sets `asked_zibzab_early`. The item disappears once asked, or at A2M4 when he tells everyone.
- **Prices don't change with the story,** with the exceptions in §2.1. Zibzab's "demand is up" is a line, not a markup.

### 4.1 Vrell tower licenses

| Tower | Price | Stocked (`availableAfter`) | Note |
|---|---|---|---|
| Zapcoil | **0 Stardust** (sample) | A1M3 (the shop opens) | "Price first: your next visit. First one's on me. Zibzab is patient." Given the moment the shop opens. It is the guaranteed shield counter. (Zibzab never says "free," and "friend" is reserved for A3M6; [../story/style-guide.md §6.3](../story/style-guide.md#63-shop-copy-zibzab).) |
| Lookout Shack | 150 | A1M5 ("New shipment") | Kept cheap: it is a guaranteed detection counter ([§8](#8-tower-acquisition)). |
| Salvage Crane | 200 | A2M1 | Arrives with Act II's longer maps, where economy has time to pay back. |
| Grapple Harpoon | 250 | A2M1 | A guaranteed heavy-armor counter (§8). |

### 4.2 Tune-ups (per tower)

Every tower has 3 tune-up ranks, bought in order. **Rule:** a tower's tune-up can be bought only once the tower is owned (the shop lists it with "Needs the <tower>" until then).

| Rank | Effect | Price |
|---|---|---|
| 1 | +5% damage (support towers: +5% aura strength; Crane: +5% income) | 40 |
| 2 | −5% build and upgrade cost | 80 |
| 3 | +5% range (support towers: +5% radius) | 140 |

That is 260 Stardust per tower and ~4,160 for all 16. Players are expected to tune their favorites, not everything.

**As built:** a support tower's ranks 1 and 3 are the `supportStat` grant (T406; the Lookout Shack's: aura strength adds to its auras as a power node's +20% does, and radius scales its detection and aura radii). The Crane's income rank waits for its task (T408).

### 4.3 Global upgrades

| Upgrade | Per rank | Ranks | Prices |
|---|---|---|---|
| **Reinforced Core** | +1 core integrity (max +3) | 3 | 120 / 200 / 300 |
| **Seed Money** | +4% starting credits | 4 | 80 / 120 / 180 / 260 |
| **Salvage Rights** | +25% wreckage salvage | 2 | 60 / 120 |
| **Resale Value** | Sell refund 70% → 75% → 80% | 2 | 100 / 200 |
| **Ability Coolant** | −5% commander ability cooldowns | 3 | 100 / 160 / 240 |
| **Bounty Hunter** | +5% kill bounties | 2 | 150 / 250 |

### 4.4 Field Protocol unlocks

Each Field Protocol ([§5](#5-field-protocols-meta-perks)) costs 100–200 Stardust to unlock. Some are granted by story instead.

**Total Stardust sink:** about 9,100 (tune-ups 4,160, licenses 600, global upgrades 2,640, Field Protocols 1,420, the jailbreak 300), against 4,355 from first clears plus the 400 Q3 Bonus. A first-pass player buys roughly half the catalog (less after C2's whole-bank trade). Replays and veteran runs fill in the rest.

---

## 5. Field Protocols (meta perks)

Field Protocols are loadout perks: rule-benders chosen before each map, separate from the 4 towers. **Rule:** they never add a fifth tower type.

- **Slots:** 1 slot when Zibzab's shop opens (after A1M3). Slot 2 costs 4 Intel and slot 3 costs 6 Intel in R&D (§7.3).
- Protocols can be swapped freely between maps. There is no respec cost.

| Protocol | Effect | Unlock |
|---|---|---|
| **Head Start** | +10% starting credits | 100 Stardust |
| **Rapid Deploy** | Your first tower each map costs nothing (T1 only) | 120 Stardust |
| **Emergency Bulkhead** | Absorbs the first 5 integrity lost to leaks (once per map) | 150 Stardust |
| **Salvage Expert** | Wreckage clears 2× faster | 100 Stardust |
| **Linked Up** | Synergy link bonuses +50% | 200 Stardust |
| **Specialist** | Choose one tower type: its tier-4 cost −25% | 150 Stardust |
| **Early Bird** | Early wave call bonus +50% | 120 Stardust |
| **High Ground Training** | High ground range bonus 25% → 40% | 150 Stardust |
| **Bounty Board** | +10% kill bounties | 150 Stardust |
| **Ready Room** | +1 extra use of each commander ability on wave 1: the first use during wave 1 doesn't start its cooldown | 180 Stardust |

**Rules for the two rule-benders:**
- **Rapid Deploy** makes the run's first build free, at tier 1 only (upgrades always cost). A free tower refunds nothing when sold, and building another tower afterwards pays full price. The free build doesn't spend a Clearance Sale charge ([core-loop.md § 3.2](core-loop.md#32-ability-roster)).
- **Ready Room**'s "during wave 1" runs from wave 1's start until wave 2 starts (the build phase before wave 1 doesn't count). Each slot gets its own free cast, and it covers a cooldown counted in waves too: two Clearance Sales in wave 1 are possible.

---

## 6. Veteran modifiers (replays)

Veteran modifiers unlock on a map once its Victory medal is earned. The player stacks any combination. Stardust bonuses **add**.

| Modifier | Effect | Stardust bonus |
|---|---|---|
| **Hardened Hides** | Enemies +40% HP and shields | +40% |
| **Double Time** | Enemies +20% speed | +30% |
| **Lean Budget** | −30% starting credits, −20% bounties | +30% |
| **Glass Core** | Core integrity 5 | +40% |
| **Radio Silence** | No commander abilities | +25% |
| **Short-Handed** | Loadout limited to 3 tower types | +40% |
| **No Protocols** | Field Protocols disabled | +15% |
| **Rush Hour** | Wave countdowns −50% | +20% |

Example: Hardened Hides + Glass Core + Short-Handed = +120%, so a replay victory pays `0.4 × stardust × 2.2` and earns the Veteran medal (+1 Intel, once).

Post-game, **challenge maps** and **endless mode** reuse these modifiers ([maps.md §8](maps.md#8-post-game-maps)).

---

## 7. R&D tree (Intel)

R&D is run by QUILL in the base. Ves'thara takes over the Xenotech branch when she joins (A2M5). Under C4 Rewrite, R&D still works during A3M5's offline stretch but shows no QUILL tip text ([core-loop.md §2.11](core-loop.md#211-scripted-moments)). It has three branches. **Rule:** R&D unlocks are permanent and never need a respec, because they add options rather than forcing exclusive choices.

**Availability (rule).** Every R&D item has an `availableAfter` map in its data: it can't be bought until that map is won, and until then its branch lists it greyed out with "Arrives after <map>", so each branch opens with only a few items for sale. Branches open in this order: **Command after A1M1** (offering only Orbital Strike Mk II and Companion Rapport at first), **Engineering after A1M4** (Sterling signs off your tier approvals), **Xenotech after A2M5** (Ves'thara joins).

### 7.1 Engineering: specializations

**One purchase unlocks both specializations (A and B) of a tower**, so the in-map tier-4 pick is always a real choice between the two ([towers.md §3.1](towers.md#31-in-map-tiers-credits-reset-every-map)).

| Item | Cost | Prerequisite | Available after |
|---|---|---|---|
| Everglow tower specs (A and B) | 2 Intel | Tower owned | A1M4 |
| Vrell, Aelari, or Skitterkin tower specs (A and B) | 3 Intel | Tower owned | A1M4 |

There are 16 spec unlocks: 4 × 2 + 12 × 3 = **44 Intel** for all of them.

**As built:** only the Rivet and Thumper specs exist. The Sprinkler, Skyhook, and Zapcoil specs are deferred to M4 ([D064](../decisions.md#d064--2026-11-09--m3-scope-the-m3-cut); the reference profile buys none before A2M2), so Engineering lists their unlocks as "Arrives in a later shipment" and they can't be bought (`no_specs`, [../tech/meta-runtime.md § Purchases](../tech/meta-runtime.md#purchases)).

### 7.2 Xenotech: Aelari attunement

| Item | Cost | Prerequisite | Available after |
|---|---|---|---|
| Prism Spire | **free** (granted when Ves'thara joins) | Story | A2M5 |
| Mindspike Obelisk | 3 Intel | Prism Spire owned | A2M5 |
| Seer's Lantern | 3 Intel | Prism Spire owned | A2M5 |
| Stasis Bloom | 3 Intel | Prism Spire owned | A3M1 |

### 7.3 Command: abilities and protocols

| Item | Cost | Available after | Notes |
|---|---|---|---|
| Orbital Strike Mk II | 2 Intel | A1M1 | Radius 1.5 → 2.0. **Refunded** when the uplink is revoked in A3M2 |
| Companion Rapport (per companion) | 2 Intel | A1M1 (for each companion once met) | Their ability's cooldown −15%. Unlocks companion-specific barks. Rapport bought for Bricks carries over to inherited Suppressing Fire; Rapport bought for QUILL is refunded under C4 Purge |
| Field Protocol slot 2 | 4 Intel | A1M3 | |
| Field Protocol slot 3 | 6 Intel | A1M3 | |
| Scanner Sweep (Technician ability) | 2 Intel | A2M1 | Ahead of the first cloaked enemies (A2M4) |
| System Reboot (Technician ability) | **free** (QUILL patches it in) | A3M3 | Granted by story in A3M4's briefing, before the first jammer ([enemies.md §4](enemies.md#4-tower-disabling-jamming)). Unavailable in A3M5 under C4 Rewrite ([core-loop.md §6.11](core-loop.md#611-quills-directives-c4-in-play)) |

**Total R&D sink:** about **77 Intel** (specs 44, attunement 9, Command 24 with Rapport for all five companions), against **61** in the campaign (plus 3–8 under C2 Sell). A campaign player unlocks roughly four-fifths of it, so **which towers get their specs is a meaningful choice**. Post-game content fills in the rest.

---

## 8. Tower acquisition

| Faction | How towers are acquired | Currency |
|---|---|---|
| Everglow | **Issued** free when the campaign makes them available | — |
| Vrell | Zapcoil free; the others licensed at Zibzab's shop | Stardust |
| Aelari | Prism Spire free from Ves'thara; the others attuned in R&D | Intel |
| Skitterkin | **Always given, never sold** (schedule below) | — |

**Story-timed gifts.** Exact maps are campaign data ([../story/campaign.md §4.1](../story/campaign.md#41-towers-and-specialization-access)). The design rules:

- Prism Spire arrives when Ves'thara joins; Scuttle Den is the first Skitterkin gift (A3M1).
- **Flag-moved gifts:** Hum Choir comes early under `spared_quiet_wave`; Gloop Spitter is the C3 gift, early under `door_choice = warren` and later under `convoy`; the Zibzab Tune-up exists only under `stardust_choice = sold` (§2.1); the jailbroken Everglow class replaces the one revoked in A3M2 (§2.1).
- Moving a gift must never break the counter coverage guarantee below on any branch.

**Counter coverage guarantee (rule):** for every category in a map's `requiredCounters` ([maps.md §6.3](maps.md#63-one-new-thing-per-map)), the player already owns a counter, or can get one for free at that point, or can license one for no more than the previous map's first-clear Stardust. Soft traits (in the threat intel but not required) need no guarantee. The categories and what answers each are defined in [enemies.md §3.1](enemies.md#31-counter-categories). Current coverage on the default path, using only purchases and story grants, never flag-dependent gifts:

| Counter category | Guaranteed counter (default path) |
|---|---|
| Splash | Thumper (issued); Zapcoil chains (free sample) |
| Air | Skyhook Flak, Rivet (issued) |
| Shield | Zapcoil (free sample); Sprinkler T3 Soaked (its Soak lands with M4, T321; the Conductive link Soaks today) |
| Armor (light, Acts I–II) | Rivet T3 armor pierce; Thumper splash |
| Armor (heavy, Act III) | **Grapple Harpoon** (licensed after A2M1, 250) and **Prism Spire** (gift, A2M5; its beam's armor applies per second). Mindspike Obelisk answers armored Hollow only: at ×0.35 it is no answer to Everglow armor. Gloop Spitter is a C3 bonus, not the guarantee |
| Detection | Lookout Shack (150 Stardust, after A1M5); Scanner Sweep (2 Intel, after A2M1) |
| Burrowed (Act III) | Scuttle Den (gift, A3M1); Stasis Bloom (attuned after A3M1) |
| Jam | System Reboot (free, A3M4; not in A3M5 under C4 Rewrite); Hum Choir (a gift by A3M4 on both C1 paths, so jamming stays covered under Rewrite) |

Act I burrowing is never a required counter (it is only brief; kill-timing and slows handle it).

**Revoked classes count as unowned** from the A3M2 cue until the jailbreak, so every map in that window must pass the guarantee without them ([towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)).

---

## 9. Difficulty settings

| Setting | Changes | Rewards |
|---|---|---|
| **Story** | Enemies −30% HP and shields, +50% starting credits, core integrity 30, countdowns +50% | Full Stardust and all medals. No penalty for choosing comfort. |
| **Standard** (default) | As designed | Full |
| **Veteran modifiers** | Opt-in per replay (§6) | Bonus Stardust, Veteran medal |

The player can change between Story and Standard at any time between maps.

**As built:** difficulty reaches the sim as modifiers (`DIFFICULTY_MODIFIERS` in [`src/meta/modifiers.ts`](../../src/meta/modifiers.ts); [../tech/meta-runtime.md § Meta](../tech/meta-runtime.md#meta-srcmeta)), stacking with purchases by the usual formula: Story's +50% starting credits adds to Seed Money's and Head Start's percentages, and Reinforced Core's ranks add to Story's 30. Enemy HP and shields scale as each unit spawns; a shield's regeneration (and a shield pulse's amount, [enemies.md § 3](enemies.md#3-defense-traits-and-counters)) scales with it, so a weaker shield refills in the same time.

---

## 10. Pacing targets and tuning assumptions

- **Rule (fair challenge, vision pillar 5):** on **Standard**, every campaign map must be winnable by a player who has (a) spent all first-clear Stardust reasonably, (b) **no replays**, and (c) Intel from **Victory medals only** (1 per map won), taking the *weaker* branch of every story flag. Each map's data stores this as a **reference profile** (owned towers, spec unlocks, and shop ranks at that point; the per-map table is in [../story/campaign.md §4.9](../story/campaign.md#49-shop-stock-and-the-reference-profile)). The balance harness uses it ([maps.md §6.4](maps.md#64-balance-harness)).
- **Rule (purchasable profiles):** every reference profile must be affordable on its own timeline: cumulative Stardust and Intel spent by each map ≤ what the earlier maps paid, and every item bought only after its `availableAfter` map. Every par build must use only what its reference profile owns (towers, spec unlocks, abilities). The harness asserts both.
- **Meta power cap:** the full shop and tune-up catalog should add no more than about **+20–25% effective power** over the reference profile. Grinding helps, but it never trivializes a map. **Rule:** a profile that owns the **full catalog** (every tune-up, global upgrade, protocol, and slot, equipping Head Start, Emergency Bulkhead, and Linked Up) running any of a map's `noCounterBuilds` must still lose; meta power never substitutes for a counter.
- **Unlock cadence:** something new (a tower, spec, ability, protocol, or slot) should be within reach after almost every map. A first-pass player should never go two maps without a meaningful purchase.
- **Intel scarcity:** with 1 Intel per map from Victory alone, a Victory-only player unlocks one tower's specializations every 2–3 maps. Players who chase medals unlock about one per map.

---

## 11. What persists

Persisted per save: the profile (name, pronouns, callsign, `arrival_reason`), Stardust, Intel, owned towers, revoked and jailbroken classes, owned and revoked abilities, R&D unlocks, shop ranks, Field Protocols, medals per map, veteran records, the lifetime **Pests Processed** counter ([core-loop.md §6.2](core-loop.md#62-results-screen-and-the-lifetime-counter)), story flags and seen scenes, read memos and codex versions, Bricks's tag index and memorial tower, loadout presets, and settings. The format and export/import codes are owned by [../tech/meta-runtime.md](../tech/meta-runtime.md#save-system).

---

## Open questions

1. **Story difficulty awarding all medals** keeps it friendly, but it lets players farm Intel on easy mode. Is that acceptable for a single-player game? (Recommendation: yes.)
2. Should **Intel unlock a few towers** too (beyond Aelari), to honor D001's "Intel gates major unlocks such as new towers" more strongly, or is Aelari attunement enough?
3. **Defeat Stardust (25%)**: is "keep a small share" generous enough to make a loss feel like progress?
4. Is the **Veteran medal threshold** (+100%) right, and should veteran records show on the star map?
5. Do **Field Protocols** need limits per act (for example Linked Up is too strong early)?
6. **C2 balance.** Both options spend the whole bank; Sell returns 3–8 Intel plus a permanent Vrell buff. Is Return's finale boon felt enough that players who are behind on upgrades still consider it? It must never be required to beat the finale.
7. **Farming the bonus.** Replays don't re-grant the Q3 Bonus, but a player could hoard Stardust (or replay for it) before A2M4 to inflate the Sell windfall. The clamp at 8 Intel caps it; confirm that's enough.
