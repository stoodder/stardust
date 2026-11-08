# Progression

Meta currencies, medals, Zibzab's shop, Field Protocols (meta perks), veteran modifiers, the R&D tree, tower acquisition, difficulty settings, and pacing targets.

> **Numbers:** every number in this doc is a **first-pass tuning value** unless it is labeled a **rule**. Tuning values live in data files (`upgrades`, `shop`, `research` data). Once the content files exist, they become the home for exact numbers, and this doc keeps roles, rules, and target ranges (see [../tech/architecture.md](../tech/architecture.md)).
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

**What Stardust is, in the fiction:** the crystallized remains of the Skitterkin dead. The Stardust the player earns is literally made from the "pests" they process: Tidybots haul the bodies to Second Harvest, where they are crystallized unsung ([../story/bible.md §3](../story/bible.md#what-stardust-really-is)). The player learns this in A2M4 (or from A1M3, if they ask Zibzab). **Rule:** the currency stays fully usable after the reveal, because the story's moral is that the dead don't mind being useful, they mind being forgotten. The game never penalizes spending it; C2 (§2.1) is the one place the player can choose to give some back. The Stardust icon's shimmer follows the act ramp in [../art/art-direction.md §2](../art/art-direction.md#stardust-shimmer).

---

## 2. Earning Stardust

Each map has a `stardust` value in its data (its **first-clear reward**).

| Situation | Stardust awarded |
|---|---|
| **First victory** on a map | `stardust` (100%) |
| **Replay victory** (already won before) | `0.4 × stardust × (1 + Σ veteranBonus)` ([§6](#6-veteran-modifiers-replays)) |
| **Defeat** (any attempt) | `0.25 × stardust × (wavesResolved / totalWaves)`, rounded. This is D001's "keep a small share." |
| **Holdout maps** ([maps.md §5](maps.md#5-map-modifiers-and-objective-variants)) | Treated as a victory at the end; the reward scales with performance (campaign data) |

**Recommended first-clear values by act:**

| Act | Maps (approx.) | `stardust` per map | Act total (approx.) |
|---|---|---|---|
| I | 6 | 100–160 | ~780 |
| II | 5 | 180–260 | ~1,100 |
| III | 5 | 280–380 | ~1,650 |
| Finale | 1 | 500 | 500 |
| **Campaign** | ~17 | | **~4,000** |

### 2.1 Story hooks

| Hook | When | Rule |
|---|---|---|
| **Q3 Performance Bonus** | Delivered with the memo before A2M4 ([core-loop.md §6.4](core-loop.md#64-halcyon-inbox-memos)) | A scripted grant of **400 Stardust** (tuning value: about 1.5× A2M4's first-clear), so the bank is full when Zibzab tells the truth. Granted once per save. |
| **C2: Zibzab's Price** | The A2M4 debrief, before the base opens | Two offers, price first, both for the whole bank (the Stardust balance at that moment). **Sell:** Zibzab trades it on the Vrell market; the bank goes to 0 and he pays an **Intel windfall** of `clamp(floor(bank / 75), 4, 10)` plus the exclusive **Zibzab Tune-up** ("Ten percent. Honestly, eight."): +8% damage for every Vrell tower, permanently. **Return:** he carries it to the Skitterkin at cost; the bank goes to 0, his handling fee is an IOU in his ledger that is never cashed, and the finale gains **the Returned** ([maps.md §5.5](maps.md#55-the-leaving-song-finale-rules)). If the bank is 0, there is nothing to trade: `stardust_choice = none` ("No refunds. I did say."). Sets `stardust_choice`. Neither option is wrong, and both options' rewards stay inside the meta power cap (§10). |
| **Jailbroken firmware** | Base, after A3M3 | 300 Stardust, or free under `door_choice = convoy` ([towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)) |
| **Zibzab's crate** | A3M6 ("Price first: nothing.") | A one-time free grant; its contents are campaign data. The only time Zibzab gives anything for nothing |

---

## 3. Medals and Intel

Every campaign map has **3 medals**. Each medal awards Intel **the first time** it is earned.

| Medal | Condition | Intel |
|---|---|---|
| **Victory** | Win the map. | 1 |
| **Perfect Core** | Win without losing any core integrity (no leaks). On Escort maps: every refugee saved. **Leaks from medal-exempt groups (the Quiet Wave) never count** ([core-loop.md §2.7](core-loop.md#27-hold-fire)). | 1 |
| **Challenge** | A map-specific condition, written in the map data and shown in the briefing. | 1 |

- Medals can be earned in separate runs (Kingdom Rush style). A single run can earn all three.
- **Challenge medal guidelines:** it should teach or reward a *skill* the map is about, never demand a grind. Good examples: "Win using no Explosive towers," "Clear all 4 wreckage tiles," "Call 6 waves early," "Let no Brood Hauler reach the Hollow side of the map" (story-flavored), and "Win with only 3 tower types." Bad examples: anything that needs a specific shop purchase, anything luck-based, or anything that requires holding fire on a story wave (that choice must stay free; see [core-loop.md §2.7](core-loop.md#27-hold-fire)).
- **Objective Intel:** some story maps award +1–2 Intel for an optional objective (campaign data). Budget: about 8 across the campaign.
- **Veteran medal:** the first victory on a map with veteran modifiers totalling **≥ +100%** awards +1 Intel and a badge ([§6](#6-veteran-modifiers-replays)).

**Intel supply (approx.):** 51 from medals (17 × 3) + ~8 objectives = **~59 in the campaign**, plus up to 17 from veteran medals and more from post-game challenge maps.

---

## 4. Zibzab's shop (Stardust)

Zibzab's shop opens in A1M3, when he arrives. Item names carry Zibzab's voice, in his "price first" format ("Price first: 60 stardust. Barely-Dented Hull Plating! One previous owner, who barely exploded."). Final copy belongs to the [story style guide](../story/style-guide.md#63-shop-copy-zibzab).

- **The open question.** From A1M3 until A2M4 the shop carries one extra item, **"Where does stardust come from?"**, priced "you won't like it, and you can't return it." Asking costs nothing, plays his answer, and sets `asked_zibzab_early`. The item disappears once asked, or at A2M4 when he tells everyone.
- **Prices don't change with the story,** with the exceptions in §2.1. Zibzab's "demand is up" is a line, not a markup.

### 4.1 Vrell tower licenses

| Tower | Price | Note |
|---|---|---|
| Zapcoil | **0 Stardust** (sample) | "Price first: your next visit. First one's on me. Zibzab is patient." Given the moment the shop opens. It is the guaranteed shield counter. (Zibzab never says "free," and "friend" is reserved for A3M6; [../story/style-guide.md §6.3](../story/style-guide.md#63-shop-copy-zibzab).) |
| Salvage Crane | 200 | |
| Lookout Shack | 150 | Kept cheap: it is a guaranteed detection counter ([§8](#8-tower-acquisition)). |
| Grapple Harpoon | 250 | |

### 4.2 Tune-ups (per tower)

Every tower has 3 tune-up ranks, bought in order:

| Rank | Effect | Price |
|---|---|---|
| 1 | +5% damage (support towers: +5% aura strength; Crane: +5% income) | 40 |
| 2 | −5% build and upgrade cost | 80 |
| 3 | +5% range (support towers: +5% radius) | 140 |

That is 260 Stardust per tower and ~4,160 for all 16. Players are expected to tune their favorites, not everything.

### 4.3 Global upgrades

| Upgrade | Per rank | Ranks | Prices |
|---|---|---|---|
| **Reinforced Core** | +2 core integrity | 3 | 120 / 200 / 300 |
| **Seed Money** | +25 starting credits | 4 | 80 / 120 / 180 / 260 |
| **Salvage Rights** | +25% wreckage salvage | 2 | 60 / 120 |
| **Resale Value** | Sell refund 70% → 75% → 80% | 2 | 100 / 200 |
| **Ability Coolant** | −5% commander ability cooldowns | 3 | 100 / 160 / 240 |
| **Bounty Hunter** | +5% kill bounties | 2 | 150 / 250 |

### 4.4 Field Protocol unlocks

Each Field Protocol ([§5](#5-field-protocols-meta-perks)) costs 100–200 Stardust to unlock. Some are granted by story instead.

**Total Stardust sink:** ~9,000, against ~4,000 from first clears. A first-pass player buys roughly 45% of the catalog. Replays and veteran runs fill in the rest.

---

## 5. Field Protocols (meta perks)

Field Protocols are loadout perks: rule-benders chosen before each map, separate from the 4 towers. **Rule:** they never add a fifth tower type.

- **Slots:** 1 slot when Zibzab's shop opens. Slot 2 costs 4 Intel and slot 3 costs 6 Intel in R&D.
- Protocols can be swapped freely between maps. There is no respec cost.

| Protocol | Effect | Unlock |
|---|---|---|
| **Head Start** | +100 starting credits | 100 Stardust |
| **Rapid Deploy** | Your first tower each map costs nothing (T1 only) | 120 Stardust |
| **Emergency Bulkhead** | Absorbs the first 5 integrity lost to leaks (once per map) | 150 Stardust |
| **Salvage Expert** | Wreckage clears 2× faster | 100 Stardust |
| **Linked Up** | Synergy link bonuses +50% | 200 Stardust |
| **Specialist** | Choose one tower type: its tier-4 cost −25% | 150 Stardust |
| **Early Bird** | Early wave call bonus +50% | 120 Stardust |
| **High Ground Training** | High ground range bonus 25% → 40% | 150 Stardust |
| **Bounty Board** | +10% kill bounties | 150 Stardust |
| **Ready Room** | Commander abilities start each map with 0 cooldown *and* refresh 15% faster | 180 Stardust |

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

### 7.1 Engineering: specializations

| Item | Cost | Prerequisite |
|---|---|---|
| Halcyon tower spec (A or B, each) | 2 Intel | Tower owned |
| Vrell, Aelari, or Skitterkin tower spec (A or B, each) | 3 Intel | Tower owned |

There are 32 specializations: 8 × 2 + 24 × 3 = **88 Intel** for all of them.

### 7.2 Xenotech: Aelari attunement

| Item | Cost | Prerequisite |
|---|---|---|
| Prism Spire | **free** (granted when Ves'thara joins) | Story |
| Mindspike Obelisk | 3 Intel | Prism Spire owned |
| Seer's Lantern | 3 Intel | Prism Spire owned |
| Stasis Bloom | 3 Intel | Prism Spire owned, and campaign availability |

### 7.3 Command: abilities and protocols

| Item | Cost | Notes |
|---|---|---|
| Scanner Sweep (Technician ability) | 2 Intel | Recommended availability: Act II early |
| System Reboot (Technician ability) | **free** (QUILL patches it in) | Granted by story before the first jammer ([enemies.md §4](enemies.md#4-tower-disabling-jamming)) |
| Field Protocol slot 2 | 4 Intel | |
| Field Protocol slot 3 | 6 Intel | |
| Orbital Strike Mk II | 2 Intel | Radius 1.5 → 2.0. **Refunded** when the uplink is revoked in A3M2 |
| Companion Rapport (per companion) | 2 Intel | Their ability's cooldown −15%. Unlocks companion-specific barks. Rapport bought for Bricks carries over to inherited Suppressing Fire; Rapport bought for QUILL is refunded under C4 Purge |

**Total R&D sink:** ~115 Intel, against ~59 in the campaign. A campaign player unlocks roughly half, so **specializations are a meaningful choice**. Post-game content fills in the rest.

---

## 8. Tower acquisition

| Faction | How towers are acquired | Currency |
|---|---|---|
| Halcyon | **Issued** free when the campaign makes them available | — |
| Vrell | Zapcoil free; the others licensed at Zibzab's shop | Stardust |
| Aelari | Prism Spire free from Ves'thara; the others attuned in R&D | Intel |
| Skitterkin | **Always given, never sold** (schedule below) | — |

**Story-timed gifts** ([../story/bible.md §12](../story/bible.md#12-mechanics-the-story-needs); [campaign.md](../story/campaign.md) is authoritative for exact maps):

| Gift | Default timing | Moved by |
|---|---|---|
| Prism Spire | When Ves'thara joins (A2M5) | — |
| Brood Burrow | A3M1 (the first Skitterkin gift) | — |
| Hum Choir | Its campaign slot (Act III mid) | **A3M1** if `spared_quiet_wave` |
| One more Skitterkin tower (campaign picks Gloop Spitter or Sproing Pad) | Its campaign slot | **Early** (the map after A3M3) under `door_choice = warren`; **late** (two maps after its slot) under `convoy` |
| Zibzab Tune-up | — | Only under `stardust_choice = sold` (§2.1) |
| Jailbroken Halcyon class | — | Replaces the class revoked in A3M2 (§2.1) |

Moving a gift must never break the counter coverage guarantee below on any branch.

**Counter coverage guarantee (rule):** for every defense trait in a map's threat intel, the player already owns a counter, or can get one for free at that point, or can license one for no more than the previous map's first-clear Stardust. Current coverage:

| Trait | Guaranteed counter (default path) |
|---|---|
| Flying | Skyhook Flak, Rivet (issued) |
| Shielded | Zapcoil (free sample); Sprinkler T3 Soaked |
| Armored (light, Act I–II) | Rivet T3 armor pierce; Thumper splash |
| Armored (heavy, Act III) | Gloop Spitter (gift, Corroded); Harpoon (licensed) |
| Cloaked | Lookout Shack (150 Stardust); Scanner Sweep |
| Burrowing (Act I) | Not a hard requirement (it is only brief); kill-timing and slows |
| Burrowing (Act III) | Brood Burrow (gift); Stasis Bloom |
| Jammer | Hum Choir (gift); System Reboot (free, A3M4) |

**Revoked classes count as unowned** from the A3M2 cue until the jailbreak, so every map in that window must pass the guarantee without them ([towers.md §9](towers.md#9-rules-for-story-driven-tower-changes)).

---

## 9. Difficulty settings

| Setting | Changes | Rewards |
|---|---|---|
| **Story** | Enemies −30% HP and shields, +50% starting credits, core integrity 30, countdowns +50% | Full Stardust and all medals. No penalty for choosing comfort. |
| **Standard** (default) | As designed | Full |
| **Veteran modifiers** | Opt-in per replay (§6) | Bonus Stardust, Veteran medal |

The player can change between Story and Standard at any time between maps.

---

## 10. Pacing targets and tuning assumptions

- **Rule (fair challenge, vision pillar 5):** on **Standard**, every campaign map must be winnable by a player who has (a) spent all first-clear Stardust reasonably, (b) **no replays**, and (c) Intel from **Victory medals only**. Each map's data stores this as a **reference profile** (owned towers, specs, and shop ranks at that point). The balance harness uses it ([maps.md §6.4](maps.md#64-balance-harness)).
- **Meta power cap:** the full shop and tune-up catalog should add no more than about **+20–25% effective power** over the reference profile. Grinding helps, but it never trivializes a map.
- **Unlock cadence:** something new (a tower, spec, ability, protocol, or slot) should be within reach after almost every map. A first-pass player should never go two maps without a meaningful purchase.
- **Intel scarcity:** with ~1 Intel per map from Victory alone, a Victory-only player unlocks about one specialization every 2–3 maps. Players who chase medals unlock about one per map.

---

## 11. What persists

Persisted per save: the profile (name, pronouns, callsign, `arrival_reason`), Stardust, Intel, owned towers, revoked and jailbroken classes, owned and revoked abilities, R&D unlocks, shop ranks, Field Protocols, medals per map, veteran records, the lifetime **Pests Processed** counter ([core-loop.md §6.2](core-loop.md#62-results-screen-and-the-lifetime-counter)), story flags and seen scenes, read memos and codex versions, Bricks's tag index and memorial tower, loadout presets, and settings. The format and export/import codes are owned by [../tech/architecture.md](../tech/architecture.md#5-save-system).

---

## Open questions

1. **Story difficulty awarding all medals** keeps it friendly, but it lets players farm Intel on easy mode. Is that acceptable for a single-player game? (Recommendation: yes.)
2. Should **Intel unlock a few towers** too (beyond Aelari), to honor D001's "Intel gates major unlocks such as new towers" more strongly, or is Aelari attunement enough?
3. **Defeat Stardust (25%)**: is "keep a small share" generous enough to make a loss feel like progress?
4. Is the **Veteran medal threshold** (+100%) right, and should veteran records show on the star map?
5. Do **Field Protocols** need limits per act (for example Linked Up is too strong early)?
6. **C2 balance.** Both options spend the whole bank; Sell returns 4–10 Intel plus a permanent Vrell buff. Is Return's finale boon felt enough that players who are behind on upgrades still consider it? It must never be required to beat the finale.
7. **Farming the bonus.** Replays don't re-grant the Q3 Bonus, but a player could hoard Stardust before A2M4 to inflate the Sell windfall. The clamp at 10 Intel caps it; confirm that's enough.
