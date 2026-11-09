# Meta Runtime

How meta progression and saves work in code: `src/meta/`, what happens at run end, the story transactions, and the save system. The module layout is in [architecture.md](architecture.md); the rules (currencies, shop, R&D, medals, pacing) are owned by [design/progression.md](../design/progression.md). Story state that lives in the save is described in [story-runtime.md](story-runtime.md).

**Built so far.** The save core (T203a): `KeyValueStore`, `SaveData` (now v2, T300b), migrations, validation, slots with `:bak`, the SD export/import codec, and the dev saves, all described under [Save system](#save-system). Campaign progress and gating (T209): the Shift board and when each between-map system opens, under [Progress and gating](#progress-and-gating); the app's save session and screens are in [architecture.md § Rendering](architecture.md#rendering) and [§ UI: DOM overlay](architecture.md#ui-dom-overlay). Modifiers and pools (T204b), and the loadout's rules, presets, and protocol picker (T201, T308), under [Meta](#meta-srcmeta). Run end and rewards (T204c), with its story flag step (T206b), its story unlocks (T303), objective Intel (T304f), and leaving mid-map as a loss (T316), under [Run end](#run-end). Purchases at the base (T204d), with the Zapcoil sample and Zibzab's open question (T308), under [Purchases](#purchases). The story transactions wait for their maps (the first is A2M4's, M4).

---

## Meta (`src/meta/`)

Progression, currencies (Stardust and Intel, D001 #6), the shop, R&D, medals, and unlocks. Persistence goes through a `KeyValueStore` interface (a localStorage adapter in the browser, in-memory in tests).

Meta turns a save into the inputs of a run:
- **Modifiers.** `meta/modifiers.ts` turns owned upgrades, equipped protocols, and difficulty into `SimConfig.modifiers`. `metaModifiers(loadout, catalog)` is a pure function over a `MetaLoadout` (owned ranks, equipped protocols, the Specialist pick, difficulty), so `src/balance/profile.ts` calls the same function on a map's `referenceProfile` and on the full-catalog profile ([architecture.md § Sim public API](architecture.md#sim-public-api)).
  - **Each grant is one modifier.** Owning rank *n* adds the grants of ranks 1..*n* (`content/upgrades/`), each with `source: '<kind>:<id>'` (`shop:seed_money`, `rnd:orbital_strike_mk2`, `protocol:linked_up`); the sim's stacking formula adds them up. A protocol with `choice: 'tower'` (Specialist) gets its pick in place of the grant's `'*'` tower.
  - **Order:** upgrades in catalog order, then protocols in slot order, then the difficulty's modifiers (`DIFFICULTY_MODIFIERS`; Story's are in [design/progression.md § 9](../design/progression.md#9-difficulty-settings), all sourced `difficulty:story`).
  - **Refused, not ignored:** an unknown upgrade or protocol, a rank outside the item's ranks, a protocol equipped twice, more protocols than slots (`protocolSlots`: 1 plus R&D's slots), or a Specialist with no pick throws.
  - The game's call is `app/battleSetup.ts` `simulatedSaveModifiers`: `metaModifiers` over the save's ranks, its equipped protocols (`equippedProtocols` in `meta/loadout.ts`: `loadouts.protocols` fitted to what it owns and its slots, so a stale list never fails a battle start), and its difficulty, less what the sim still refuses, so a save ahead of the sim plays. `saveModifiers(save)` is ranks and difficulty only (no protocols).
- **Pools** (`meta/pools.ts`): `towerPool` and `abilityPool` (owned minus revoked, minus any the sim still refuses, `towerRefusal` / `abilityRefusal` in `sim/gates.ts`, so a save ahead of the sim plays; the loadout screen's offer), `protocolPool` (owned), and `protocolSlotCount` (0 before the shop opens, then 1 plus R&D's). Story flags reach runs as `scriptFlags` (`app/battleSetup.ts`, [story-runtime.md § Map scripts](story-runtime.md#map-scripts-story-driven-sim-changes)). Still to come: the map's `lockedAbilities` whose condition holds leave the ability pool, and the companion (or the finale's pick list) joins the pools.
- **Availability.** Every shop and R&D item has `availableAfter: MapId | null` in `content/upgrades/` ([design/progression.md](../design/progression.md)). An item is stocked (buyable) once that map is completed; until then its pane lists it greyed out as "Arrives after <map>" ([Purchases](#purchases)). One Engineering purchase unlocks **both** tier-4 specializations of a tower, so the save stores tower ids, not spec ids.
- **The loadout** (`meta/loadout.ts`, T201; the screen is [design/core-loop.md §1](../design/core-loop.md#1-session-loop-between-maps)), pure functions over a `SaveData`:
  - **The skip rule.** `loadoutPools(save)` is the tower, ability, and protocol pools, and the protocol slots. `hasLoadoutChoice` is true with more than `MAX_LOADOUT` (4) tower types, more than one Technician ability, or a protocol to equip (a slot and an owned protocol, `hasProtocolChoice`). The finale's companion pick joins the rule with the finale (M5). `showsLoadoutScreen(save, devUnlocks)` is that choice plus the `loadout` system being open ([Progress and gating](#progress-and-gating)). Otherwise the map starts with everything owned.
  - **A pick** is 1 to 4 distinct pool towers, in build-slot order (the order the player picked them), plus the slot-1 ability (null only while the save owns none). `pickProblems` lists what's wrong with one. `toggleTower` drops a picked tower, so the rest move up a slot, or appends one while there's room. `fitPick` cuts a stale pick down to the pools.
  - **Presets** (`SaveData.loadouts`): `withPreset(save, map, pick)` stores the pick as that map's preset and as `last`. `initialPick` starts the screen from the map's preset, else `last`, else the default (`app/battleSetup.ts` `defaultPick`: every pool tower up to four, par towers first, and the par build's ability if owned), each fitted to the pools. `resolveLoadout` gives the battle its towers and ability. That's the map's preset while the save has a choice and the preset still fits the pools; otherwise it's the default. The screen writes the preset before the battle starts, so a retry keeps the loadout.
  - **Field Protocols** (T308): the screen's pick carries the protocols to equip (`equip`), and `withPreset` equips them save-wide with `withProtocols`, which refuses what `protocolProblems` names (unowned, repeated, over the slots, or Specialist without an owned tower). `toggleProtocol` turns one on while a slot is free, and with one full slot swaps it in. `fitProtocols` cuts a stale list down; `equippedProtocols(save)` is that for the battle.
  - **Counters and links.** `mapCounters(map)` is the categories the map's threat intel calls for (`TRAIT_COUNTER`) plus its required ones. `towerAnswers(tower, specsOwned, map)` says how a tower answers each one, by its easiest route: from tier 1, from a tier (Rivet T3), or as a tier-4 spec, which needs the save's Engineering unlock. It uses `COUNTER_ANSWERS` through `content/counterAnswers.ts`, so the screen and the harness agree. `uncoveredCounters(pick, save, map)` lists the required counters that no picked tower, the picked ability, or the companion's ability answers. `linksAmong(towers, links)` lists the links a set of towers can form.

## Issued towers

`src/meta/issued.ts`. Everglow issues some towers free when the campaign reaches them ([design/progression.md § 8](../design/progression.md); the schedule is [story/campaign.md § 4.1](../story/campaign.md#41-towers-and-specialization-access)). Their one home is `TOWER_ACCESS` in `content/upgrades/access.ts`: a tower with `how: 'issued'` is owned once its `availableAfter` map is won (null: from the start). Rivet and Thumper are issued from the start (`STARTING_TOWERS`, which a test keeps equal to the null rows); the Sprinkler is issued after A1M1, for A1M2.
- `issuedTowers(save)` lists the issued towers a save should own by now; `withIssuedTowers(save)` appends the missing ones to `unlocks.towers` (returning the same save when none is missing). Gifts and licenses are story transactions and purchases, never issued.
- **When:** at run end (the win that opens the next map; [Run end](#run-end)), and whenever the app takes a save into play (`app/save.ts`: opening a slot, importing a code, a dev save), so a save written before a tower was issued catches up. The catch-up is written with the save's next write.

## Purchases

`src/meta/purchase.ts`, pure functions over a `SaveData`; the base's panes show them (R&D Command, Zibzab's shop, and Engineering; [architecture.md § UI: DOM overlay](architecture.md#ui-dom-overlay)).

- **Items** (`PurchaseItem`): an `upgrade` (a ranked shop or R&D upgrade; buying it buys the next rank), a `protocol` (a Field Protocol unlock, bought once), a `license` (a Vrell tower, from `TOWER_ACCESS`'s `how: 'license'` rows, bought once; stocked no earlier than the shop), or `specs` (a tower's Engineering unlock, bought once; priced by its faction from `ENGINEERING`). Aelari attunements and Scanner Sweep join with their towers and ability. A license priced 0 (the Zapcoil sample) is given rather than sold: `meta/issued.ts` hands it over with the issued towers once it's stocked, so the shop shows it owned.
- **Can it be bought?** `offerFor(save, item, devUnlocks)` returns the `Offer` (price, currency, ranks owned and in all, the next rank's grants, `availableAfter`) with a `refusal`, checked in this order: `unknown` (not in the catalog), `pane_locked` (the item's system isn't open: `isSystemUnlocked`), `not_stocked` (its `availableAfter` map isn't won), `not_owned` (a tune-up or spec unlock for a tower the save doesn't own), `no_specs` (a tower with no tier-4 specs yet), `maxed` (every rank owned, or the one-time item owned), `short` (the bank is short of the price); null means it can be bought.
- **Buying** (`buy`) returns a new save (the input is untouched) with the price deducted (the bank clamped to `[0, SAVE_LIMITS.currency]`, `clampCurrency`) and the item recorded: the upgrade's rank + 1 in `upgrades`, the protocol in `unlocks.protocols`, a licensed tower in `unlocks.towers`, or the tower in `unlocks.specs` (the battle config's `specsUnlocked`). A refusal comes back as `{ ok: false, reason, message }`.
- **Shelves** (`shelf(save, pane, devUnlocks)`): a pane's offers in a fixed order (R&D's upgrades; the shop's licenses, then global upgrades, then tune-ups, then protocols; Engineering's towers with specs, then the registered towers whose specs ship later, refused `no_specs` and shown as "Arrives in a later shipment", D064), each group sorted by arrival on the campaign, then entry price, then name.
- **The open question** (`openQuestionOffered`): the shop's "Where does stardust come from?" row shows from the shop's opening until `asked_zibzab_early` is set or A2M4 has a record (`OPEN_QUESTION_UNTIL`). It's no purchase: the app plays its base scene ([story-runtime.md](story-runtime.md)), whose answer sets the flag.
- **The dev override:** a pane that `devUnlocks` opens is also fully stocked, so `?test=1&save=` reaches items whose maps don't exist yet.
- **The app** (`app/save.ts` `purchase`) buys for the save in play and writes the slot at once. A failed write keeps the purchase for the session and says so.

## Progress and gating

`src/meta/progress.ts`, pure functions over a `SaveData`. The campaign's order and map names are `CAMPAIGN_PLAN` in `content/campaign.ts`, which lists maps whose content isn't built yet; `CAMPAIGN` is its registered part.

- **Systems** (`MetaSystem`): `base`, `rnd`, `shop`, `engineering`, `xenotech`, `loadout`, `spareRunners`. Each opens once one campaign map is won (`SYSTEM_UNLOCKS`, from [story/campaign.md § 4.6](../story/campaign.md#46-systems)): the base and R&D Command after A1M1; Zibzab's shop after A1M3, and the loadout screen with it (it's first shown at A1M4); Engineering after A1M4; the spare-runners filter with A1M5 won (it debuts in A2M1); Xenotech after A2M5. `isSystemUnlocked(save, system, devUnlocks)` answers it, and `unlockHint(system)` gives a locked pane's line. It names a map only while the Shift board lists it ("Opens after Special Delivery"); a later map is its position, "Opens after Shift 10 (coming soon)" (`mapMilestone`), so the copy never names a map the player can't see.
- **The dev override** (D031, D032): a dev save may carry `devUnlocks` (a list of systems) in `__fixtures__/devSaves.ts`, never in `SaveData`, so no stored save or import code can hold it. The app passes it only for a save loaded through `?test=1&save=<id>`. `all_unlocked` opens every system.
- **The Shift board** (`shiftBoard(save)`): the first `SHIFT_BOARD_SIZE` campaign maps in order, each `won`, `open` (the first map, or the one after a won map), `locked`, or `coming_soon` (not registered yet), with its medals. `SHIFT_BOARD_SIZE` is derived, not set: `CAMPAIGN_PLAN` up to its last registered map (Act I's five today), so a map joins the board, and the gating copy starts naming it, the moment its folder is registered; only an unregistered gap before it shows `coming_soon`. `nextShift` picks the first open one, else the last won one (with all of Act I won, A1M5 is offered as a replay; nothing looks for a sixth map).

## Run end

On win, loss, retry, or quit to menu, in this order:
1. Add `stats.skitterkinKilled` to `save.stats.pestsProcessed`.
2. Apply story run-end flag rules ([story-runtime.md § Flags](story-runtime.md#flags)).
3. Copy `revoked` towers and abilities.
4. Record medals: the sim has already settled them (`earnedMedalIds(state, map)`; [architecture.md § Medals](architecture.md#medals)), so medal-exempt leaks never broke Perfect Core. A run with `usedCheckpoint` ([architecture.md § Checkpoints](architecture.md#checkpoints)) can earn Victory but not Perfect or Challenge.
5. Pay rewards by the table in [design/progression.md](../design/progression.md) §2: first-clear Stardust is the map's flat `stardust` value (A3M3 included), plus medal and objective Intel. **Defeat payouts can't be farmed:** a defeat on a map already completed pays 0 Stardust, and after a checkpoint retry `wavesResolved` counts only the waves resolved in this attempt from the run's `resumedFromWave` on ([architecture.md § Checkpoints](architecture.md#checkpoints)).
6. Run the map's story transactions (below).
7. Grant the towers the win issues for the next map ([Issued towers](#issued-towers)), then save.
8. Story unlocks: the enemies the run met join the seen list, the memos now due are delivered with their gifts, and the codex versions now unlocked are added ([story-runtime.md § Other story systems](story-runtime.md#other-story-systems)).

**As built (T204c).** `runEnd(save, input)` (`src/meta/runEnd.ts`) is pure: it returns a new save and a `RunEndSummary`, and never touches storage or the clock. Its `RunEndInput` is the map id, the outcome, the map's `stardust` and wave count, the waves resolved, the earned medal ids, the run's `skitterkinKilled`, the final meter, an optional veteran bonus (0 until veteran modifiers exist), the run's `stats` (the router passes `state.stats`; without them no flag rule applies), and the optional objectives the sim settled as done with each one's `intel` (`completedObjectives`, T304f).
- **Step 1** adds the kills on every outcome, and the run also adds 1 to `stats.runs`.
- **Step 2** (T206b): on the run that first wins the map, `runEndFlags` (`src/story/flags.ts`) evaluates the map's run-end rules over `stats` and merges the flags they set into `story.flags`; losses and replays set none ([story-runtime.md § Flags](story-runtime.md#flags)). The summary lists them (`flags`); Results doesn't show them, since C1 is silent.
- **Step 4:** a win appends each earned medal the map's record doesn't hold yet; a loss records none. A won map's record is `completed` with `bestMeter` as the best of the old one and this run's meter. A loss on a map with no record leaves `{ completed: false, medals: [], bestMeter: 0 }` (the map has been played to an end), and a loss never changes an existing record. A win also appends each completed objective the record doesn't hold to its `objectives` list (absent until the first, so older saves need no migration); a loss records none.
- **Step 5** (`src/meta/rewards.ts`, rates in `REWARD_RULES`; the new banks are clamped to `[0, SAVE_LIMITS.currency]`, so a run end never writes a save validation refuses): `stardustPayout` returns the amount with its `source`: `first_clear` (the full value), `replay` (`round(0.4 × stardust × (1 + veteranBonus))`), `defeat` on a map not yet won (`round(0.25 × stardust × wavesResolved / waveCount)`, with the waves clamped to the map), or `defeat_replay` (0). `medalPayout` pays `medalIntel` (1) per medal the record didn't hold, so a medal pays its Intel once, and `objectivePayout` pays each completed objective's `intel` the same way (the summary lists both, `medals` and `objectives`; `intel` is their sum). Difficulty never changes a payout ([progression.md § 9](../design/progression.md#9-difficulty-settings)). The summary's `firstPayday` is true for a win that pays Stardust while `story.seen` lacks `results_first_payday` (`FIRST_PAYDAY_SEEN_ID`); the router adds that id when a Results card shows the payday (T235, D097). It is never read from the bank, so an abandoned run's defeat stipend can't use it up. A save from before the id existed (pre-M3, or an M3 build before D097) catches up when it is read (`decodeEnvelope`: load and import): `withFirstPaydayCaughtUp` adds the id if the save has won a map that pays Stardust, since that win already showed a payday (D098). The dev saves past A1M2 carry it the same way.
- **Step 7:** `withIssuedTowers`; the summary lists what it granted (`issued`, the Sprinkler on A1M1's first win), which Results names.
- **Step 8** (T303, `meta/story.ts` `withStoryUnlocks`): after step 7, so an issued tower's codex entry unlocks with it. The enemies met are the types that actually spawned (`RunEndInput.met`, the router's list of `EnemySpawned` enemies; D097), so quitting before a wave never spends its NEW badge, first bark, or codex entry. Without `met` (tests, the results fixture), `enemiesMet` estimates them from the map: every wave on a win, the waves resolved plus the one under way on a loss. The summary lists the memos delivered (`memos`) and the codex entries that gained a version (`codex`).
- **Not yet:** step 3 waits for revocation (A3M2; the sim has no revoked state yet), step 6 for the story transactions (the first is A2M4's, M5), and checkpoints and their anti-farming clause for Act II (T305b; the clause is a TODO in `stardustPayout`). `RunEndInput` already carries the run's `usedCheckpoint` and `resumedFromWave` (both optional: false and null), which nothing reads yet. Each is marked in the code.
- **The app** (`app/router.ts` → `app/save.ts` `recordRun`) calls it once per battle when the map ends (`MapWon` or `MapLost`), writes the result to the save's slot, and gives the summary to Results ([architecture.md § Rendering](architecture.md#rendering)). It returns the summary with `writeFailed` (null, or the "Records couldn't file that" message: the run holds for this session only, and Results says so) and `stardustNote` (where the Stardust goes while Zibzab's shop is still locked: "Banked for Zibzab's shop. Opens after Special Delivery."). A battle outside a campaign (the `?map=` dev battle) records nothing. **Retry or quit mid-map** (the pause menu's Retry shift and Quit, T316; `router.abandon()`) ends the run here too, as a **loss**: the same order and payouts as losing at that point (the kills count, `stats.runs` grows, a map not yet won pays the defeat stipend for the waves resolved, and nothing else is recorded), with no Results card. Closing the tab mid-map still ends no run (open question 1).

## Story transactions

Named meta operations, so they're testable and idempotent (each records itself in `story.granted`):
- `grantQ3Bonus` (+400 Stardust), paid on **A2M4's results screen**.
- `resolveC2(choice)`: Sell (bank → 0, Intel windfall, Zibzab Tune-up), Return (bank → 0), or none.
- `buyJailbreak` (price 0 under `door_choice = convoy`).
- `inheritAbility(abilityId)`: a companion ability becomes an equippable Technician ability. `suppressing_fire` at the end of A3M4; `time_dilation` under C4 Keep (from A3M5 through finale Phase 1; the finale's Keep script revokes it for Phase 2).
- `resolveC4(choice)`: Keep calls `inheritAbility('time_dilation')`; Purge removes QUILL from the finale pick list and refunds the Intel spent on QUILL's Companion Rapport. The rules are in [design/core-loop.md](../design/core-loop.md) §6.11.
- `revokeAbility` (refunding Orbital Strike Mk II Intel).
- `grantGift(towerId)`.
- `openCrate()`: Zibzab's A3M6 crate, applied when the A3M6 briefing ends (so it's live from W1), not at run end. Its contents are campaign data ([story/campaign/act3.md](../story/campaign/act3.md), A3M6).

---

## Save system

| Item | Decision |
|---|---|
| Storage | `localStorage`, behind `KeyValueStore` (`src/meta/store.ts`: `get`, `set`, `remove`; `set` may throw). The browser adapter lives in `app/`; tests use `MemoryStore`. |
| Keys | `stardust:slot:1`…`3` (campaign saves), `stardust:slot:N:bak` (the previous good write), `stardust:settings` (owned by app settings), `stardust:lastSlot` (written by every slot write). All in `SAVE_KEYS`. |
| Format | JSON: `{ v: <schemaVersion>, savedAt, data: SaveData }`. `savedAt` is epoch milliseconds from the caller's clock; meta never reads the clock. Stored text over 512 KB is refused on read and write. |
| When | After map results, purchases, story choices, and settings changes, plus a one-time hint marked seen (`seenHints`) as a battle starts or the upgrade teach first shows. A map in progress is never saved (checkpoints are in memory). Replaying a map is cheap and matches "failing has no penalty". |

**SaveData v2.** The canonical type is `src/meta/saveData.ts`; the progression fields come from [design/progression.md § 11](../design/progression.md#11-what-persists). In outline:

```ts
interface SaveData {
  profile: PlayerProfile | null;        // { name, pronouns: 'she' | 'he' | 'they', callsign: 'sprout' | 'thorn' | 'waykeeper' }; null until the intake (T306)
  campaign: {
    maps: Partial<Record<MapId, { completed: boolean; medals: MedalId[]; bestMeter: number; objectives?: string[] }>>;
    seenEnemies: EnemyId[];             // enemy types met in a run (run end, step 8): codex unlocks, the NEW badge, `new_enemy`
  };
  currencies: { stardust: number; intel: number };
  unlocks: {
    towers: TowerId[];
    specs: TowerId[];                   // towers whose tier-4 pair is unlocked (one purchase, both specs)
    revokedTowers: TowerId[];           // A3M2 until the jailbreak
    jailbroken: TowerId[];              // drawn with the jailbroken palette
    abilities: AbilityId[]; revokedAbilities: AbilityId[];
    protocols: ProtocolId[];            // Field Protocols owned (progression.md § 4.4)
  };
  upgrades: Partial<Record<UpgradeId, number>>;  // owned ranks (≥ 1), including the C2 Zibzab Tune-up
  story: {
    flags: Partial<Record<StoryFlagId, FlagValue>>;  // StoryFlagId = FlagId (content/dialogue/flags.ts)
    seen: (SceneId | BarkId)[];         // scenes played (skippable on replay), once-per-campaign barks, codex versions read (`codex_<entry>__<version>`)
    memosRead: MemoId[];                // a subset of memosDelivered; unread = delivered − read
    memosDelivered: MemoId[];           // in delivery order; a memo's gift is granted on delivery
    codex: Record<CodexId, ('original' | 'annotated' | 'corrected')[]>;
    bricksTagIndex: number;             // next name in Bricks's tag list (campaign.md § 6.3)
    memorialTower: TowerId | null;      // the A3M3 {name} turret's type
    granted: string[];                  // one-time grants already applied (q3_bonus, gifts, crate)
  };
  stats: { pestsProcessed: number; runs: number };
  settings: { difficulty: 'standard' | 'story' };  // per campaign, changeable between maps (progression.md § 9)
  loadouts: {                           // the loadout screen (T201, meta/loadout.ts) and the protocol picker (T308)
    last: LoadoutPreset | null;         // the last one locked in on any map
    byMap: Partial<Record<MapId, LoadoutPreset>>;  // the last one locked in on each map
    protocols: ProtocolId[];            // equipped Field Protocols, save-wide, in slot order
    protocolPicks: Partial<Record<ProtocolId, TowerId>>;  // Specialist's tower
  };
  seenHints: HintId[];                  // one-time hints already shown (meta/hints.ts; D061)
}
type HintId = 'upgrade' | `new:${TowerId}`;  // the upgrade teach; a newly issued tower's first battle
interface LoadoutPreset { towers: TowerId[]; ability: AbilityId | null }  // 1–4 distinct towers, in build-slot order
```

- **The profile** is filled in by character creation (T306; name rules in [design/core-loop.md §6.1](../design/core-loop.md#61-character-creation-and-callsigns), `isValidPlayerName` in [`content/dialogue/profile.ts`](../../src/content/dialogue/profile.ts)). New game writes the save only when the intake form is signed, so a new campaign starts with its profile. It is null for every save written before v2 (and for a new game under `?test=1`, which skips the intake), so the intake runs first when Continue, Load, or Import opens such a save (`app/navigation.ts`, `app/profile.ts`). The same intake sets the `arrival_reason` flag, which is that choice's one home, so story conditions read it like any flag.
- **Equipped protocols** are save-wide, not per preset: protocols are swapped freely between maps ([progression.md § 5](../design/progression.md#5-field-protocols-meta-perks)). The loadout screen's protocol picker sets them ([Meta](#meta-srcmeta), *Field Protocols*).
- **A new save** (`createNewSave()`) owns Rivet and Thumper (issued for A1M1) and has the welcome memo `memo_a1_00` delivered, unread, with its gift, the Orbital Strike uplink (`story.granted` holds `memo_a1_00`). Everything else is empty or 0. A save from before the memo existed already owns the strike, and catches up on the memo, without a second grant, when it next reaches run end or the base.
- **One-time hints** (`src/meta/hints.ts`, D061): `upgrade` is the upgrade teach, shown once per save (the HUD marks it the first time it shows). `new:<tower>` marks a newly issued tower's first battle: a tower Everglow issues after a map (`TOWER_ACCESS` `how: 'issued'` with an `availableAfter`, so never the starting kit) is new in every battle the save brings it into until one starts (`newlyIssuedTowers`). That battle shows a NEW tag on its build slot and plays its `issued` radio line (the Sprinkler on A1M2), and marks the hint as it starts. `app/save.ts` reads and writes them for the save in play (`hintShown`, `newTowersIn`, `markHintsShown`, `markNewTowersShown`).
- **Each schema bump** comes with a migration and a fixture ([Versioning and migrations](#versioning-and-migrations)). v1 was M2's save, frozen when M2 shipped; v2 (M3) adds the profile, seen enemies, and equipped protocols. Veteran records arrive with their feature as a later bump.

### Validation

Saves are untrusted input: a pasted code or a hand-edited localStorage value. `validateSave(x, known = LIVE_KNOWN_IDS)` (`src/meta/validate.ts`) is strict and returns either a freshly built copy (no shared references, nothing outside the schema) or every error (up to 20), each with its field path, such as `data.currencies.intel: expected an integer in [0, 1000000000], got -3`. It checks:
- **Shape:** every object is a plain object with exactly the schema's keys (missing and unknown keys both fail). `profile` is null or a valid name (`isValidPlayerName`), a pronoun id, and a callsign id. A hint is `upgrade` or `new:` plus a known tower id (`hintIds`).
- **Ids:** towers, enemies, abilities, maps, upgrades, protocols, and story flags must exist in the live registries (`LIVE_KNOWN_IDS`; upgrades and protocols come from `content/upgrades/`), and the difficulty is one of `DIFFICULTIES`. Scenes, memos, codex entries, grants, and medals are checked by shape only (lowercase snake_case starting with a letter, which also rules out `__proto__`), so a renamed or not-yet-registered content id never makes a save unreadable. Lists hold no duplicates.
- **Flag values** (T218): each saved flag holds one of that flag's declared `values` (`KnownIds.flagValues`, from `FLAGS`), so `door_choice` is `convoy` or `warren` and a boolean flag is a boolean.
- **Numbers:** non-negative safe integers, with bounds no real save approaches (currencies ≤ 10⁹, meter ≤ 10⁶). An upgrade's rank is 1 to that item's own rank count (`KnownIds.upgradeRanks`, from the catalog; never above 10), so a hostile code can't pass validation and then crash every battle start in `metaModifiers`.
- **Cross-field rules:** `specs`, `revokedTowers`, and `jailbroken` are subsets of `towers`; `revokedAbilities` of `abilities`; `memosRead` of `memosDelivered`; a map has at most 3 medals, and any medal means the map is `completed`. Equipped protocols follow the rules `metaModifiers` refuses (so, like ranks, a valid save never fails a battle start): owned, distinct, no more than `protocolSlots` over the save's upgrades, and a pick (an owned tower) for exactly the equipped protocols that take one. A loadout preset holds 1–4 distinct owned towers and an owned ability (or null), keyed by a known map. A revoked one is allowed, because a preset can predate the revocation, and `meta/loadout.ts` drops it when it reads the preset.

### Versioning and migrations

- `SAVE_VERSION` is an integer (now **2**). `src/meta/migrations.ts` exports `migrations: Record<number, (old: unknown) => unknown>`, where `migrations[n]` upgrades the `data` of version `n` to `n + 1`. A migration reshapes what it recognizes and passes anything else through for validation to reject.
- Loading parses the JSON, applies migrations in sequence to the current version, then validates. A version above `SAVE_VERSION` is `too_new` (a newer build wrote it). **Version 0** is the pre-release draft of the format (v1 without `stats`, `settings`, `loadouts`, and `unlocks.protocols`); no build wrote it, and it exists so the framework is tested from the start. **v1 → v2** keeps an M2 save whole and adds M3's fields: the profile stays null (the intake runs on Continue), `campaign.seenEnemies` is seeded with the enemies of each M2 map the save has a record for (a table frozen in the migration, so A1M3 never badges a Nibbler as NEW), `loadouts.protocols` and `protocolPicks` start empty, and a missing `seenHints` becomes `[]`.
- Migrations are never deleted or edited after release. Each schema bump adds a fixture `src/meta/__fixtures__/save.v<n>.json`, and `migrations.test.ts` checks there is one fixture per version, then migrates every fixture to the current version and validates it. Codes exported by shipped builds are kept in `__fixtures__/codes.ts` (`SD1_CODE`, from M2) and must import into every later build.

### Loading and writing slots

`src/meta/save.ts`. **Never silently wipe a save.**
- `loadSlot(store, slot)` never writes. It returns `empty`; `ok` with the save, its `savedAt`, `source: 'main' | 'bak'`, and `migratedFrom`; or `unreadable`. When the main key fails (bad JSON, bad version, failed validation, or missing while a backup exists) it falls back to `:bak`, and reports the main key's problem and raw text so the app can offer "save could not be loaded; export raw data?". `unreadable` carries both raw values and both problems.
- `writeSlot(store, slot, data, savedAt)` validates first and never writes an invalid save. It rotates the old main value into `:bak` **only if that value is itself readable**, so a corrupt main never replaces a good backup. Then it writes the main key and `lastSlot`. A storage error (quota) comes back as `{ ok: false, code: 'storage' }`, not a throw.
- `listSlots`, `deleteSlot` (the main key and its backup; an explicit player action), and `getLastSlot` complete the slot API.

### Export and import codes

`src/meta/codec.ts`. A code is `SD<v>-<body>-<checksum>`:
- `<v>` is the save's schema version. `<body>` is `base64url(deflate-raw(envelope JSON))`, unpadded (RFC 4648 §5). `<checksum>` is 4 lowercase hex digits: the low 16 bits of `fnv1a32` (`src/shared/hash.ts`) over everything before the last `-`. Example: `SD2-TVA9T8QwDP0v…-a3f9`. An older version's code imports through the migrations. A new save is about 0.5 KB of JSON and about 400 characters as a code, which pastes fine.
- **Export** (`exportCode(data, savedAt)`) validates the save first and throws on an invalid one (a caller bug, not player input).
- **Import** (`importCode(text)`) never throws on bad input. In order: cap the pasted text at **64 KB**; strip whitespace (pasting adds line breaks); check the shape (`format`), the checksum (`checksum`), and that the version isn't newer than this build (`too_new`), all before decompressing; decompress while counting bytes and stop at **512 KB** (`too_large`, which stops decompression bombs); decode strict UTF-8 (`corrupt` on failure, as for a body that doesn't inflate); parse (`json`); check the prefix version matches the envelope's `v` (`format`); then migrate and validate (`invalid`, with the schema errors). The app confirms with the player before writing the result to a slot.
- `CompressionStream` and `TextEncoder` exist in every target browser and in Node 22, so Vitest runs the real codec. `meta/` is type-checked with the pure modules (no DOM lib), so `src/meta/platform.ts` looks the primitives up behind narrow structural types instead of declaring them globally.

### Dev saves

`src/meta/__fixtures__/devSaves.ts` exports `DEV_SAVES`, which the test-only `?save=<id>` hook loads (D031) so smoke tests and the owner can reach gated systems. Each entry has a `description` and a `build()` that returns a fresh `SaveData` built from the live registries, so it stays valid as content lands: a map, tower, memo, or codex entry that isn't registered yet is left out (no record, no payout) until it is; `devSaves.test.ts` validates every one and round-trips it through a code.

| Id | Holds |
|---|---|
| `fresh` | `createNewSave()` |
| `after_a1m1` | A1M1 won with all three medals: 3 Intel, 0 Stardust; the Sprinkler issued for A1M2 |
| `mid_m2` | `after_a1m1` with Orbital Strike Mk II bought (2 of its 3 Intel), plus A1M2 won (Victory only) and its Stardust and Intel banked |
| `after_a1m3` | Act I through A1M3 on the reference profile ([campaign.md § 4.9](../story/campaign.md#49-shop-stock-and-the-reference-profile)): the intake done (`Dev Tech`, they/them, Sprout, `arrival_reason = lettuce`), each map won with Victory and its payout banked, the issued towers plus the Zapcoil sample, Act I's memos delivered (all but the newest read), Bricks's tag index 1 |
| `after_a1m4` | `after_a1m3`, then Head Start bought and equipped, Rivet and Thumper tune 1, and A1M4 won |
| `after_a1m5` | `after_a1m4`, then Thumper specs, Reinforced Core 1, Sprinkler tune 1, and A1M5 won with the Quiet Wave spared (`spared_quiet_wave = true`, so the stamp and the memo paragraph have a save to show on); tag index 2 |
| `after_a1m5_ref` | The reference profile into A2M1: `after_a1m5` with the weaker C1 branch (`spared_quiet_wave = false`), then the Lookout license bought through the shop's `buy` (skipped until the shop stocks it, once T406 lifts the Lookout's stub gate), and the story caught up as entering the base would (`withStoryUnlocks`; every memo but the newest read) |
| `after_a2m1` | `after_a1m5_ref`, then A2M1 won (Victory) with its Stardust and Intel banked and its enemies seen; Biscuit's tag (index 3) |
| `after_a2m2` | `after_a2m1`, then Sprinkler specs, Seed Money 1, and Zapcoil tune 1 bought and A2M2 won; the callsign Thorn |
| `after_a2m3` | `after_a2m2`, then Sprinkler tune 2 bought and A2M3 won with `held_fire_second_look = false` (the weaker branch); Auntie Funmi's tag (index 4) |
| `all_unlocked` | Every campaign map won with every medal; every registered tower, spec unlock, ability, and protocol; every upgrade at its top rank; 99,999 Stardust and 999 Intel; the intake done (`Dev Tech`, `lettuce`) with the callsign and tag index the wins give, and every memo due delivered and read (so no NEW badge); `devUnlocks` opens every system ([Progress and gating](#progress-and-gating)) |

The Act II saves follow [campaign.md § 4.9](../story/campaign.md#49-shop-stock-and-the-reference-profile)'s rows. An Act II map that isn't registered yet is skipped with the purchases made for it, so until A2M1–A2M3 land those three saves equal `after_a1m5_ref`. A purchase whose content hasn't landed (a tower not on the shelf yet, a tower with no specs yet) is skipped; any other refusal throws, so a broken fixture fails `devSaves.test.ts`.

Medal ids are `victory`, `perfect_core`, and the map's Challenge id (`mapMedalIds` in `sim/medals.ts`); every campaign map has a Challenge, and the dev saves fall back to `challenge` only for a map whose data has none.

---

## Open questions

1. **Pests Processed on quit.** The count is added at run end, so closing the tab mid-map loses that run's kills. Flush on `pagehide` (a save write mid-map, which the save rules otherwise forbid), or accept the loss? (Related: [architecture.md, open question 1](architecture.md#open-questions).)
2. **Custom pronouns.** `PronounSet` supports any five forms plus an agreement, but the save stores only three ids. Adding custom sets later needs a save migration and a name-entry-style form.
