# Meta Runtime

How meta progression and saves work in code: `src/meta/`, what happens at run end, the story transactions, and the save system. The module layout is in [architecture.md](architecture.md); the rules (currencies, shop, R&D, medals, pacing) are owned by [design/progression.md](../design/progression.md). Story state that lives in the save is described in [story-runtime.md](story-runtime.md).

**Built so far (M2).** The save core (T203a): `KeyValueStore`, `SaveData` v1, migrations, validation, slots with `:bak`, the SD export/import codec, and the dev saves, all described under [Save system](#save-system). Modifiers, pools, run end, rewards, purchases, and the story transactions are not built yet ([tasks.md](../../tasks.md)), and A1M1's reference profile is still empty.

---

## Meta (`src/meta/`)

Progression, currencies (Stardust and Intel, D001 #6), the shop, R&D, medals, and unlocks. Persistence goes through a `KeyValueStore` interface (a localStorage adapter in the browser, in-memory in tests).

Meta turns a save into the inputs of a run:
- **Modifiers.** `meta/modifiers.ts` turns owned upgrades, protocols, and difficulty into `SimConfig.modifiers`. It's a pure function over an ownership record, so `src/balance/profile.ts` calls the same function on a map's `referenceProfile` ([architecture.md § Sim public API](architecture.md#sim-public-api)).
- **Pools.** The available loadout pool (owned minus revoked), the ability pool (owned minus revoked, minus the map's `lockedAbilities` whose condition holds), the companion (or the finale's pick list), and `scriptFlags`.
- **Availability.** Every shop and R&D item has `availableAfter: MapId | null` in `content/upgrades/` ([design/progression.md](../design/progression.md)). An item shows in the shop or tree only once that map is completed. One Engineering purchase unlocks **both** tier-4 specializations of a tower, so the save stores tower ids, not spec ids.
- **The loadout screen** is skipped when the player owns at most 4 tower types and has no protocol or ability choice to make ([design/core-loop.md §1](../design/core-loop.md#1-session-loop-between-maps)).

## Run end

On win, loss, retry, or quit to menu, in this order:
1. Add `stats.skitterkinKilled` to `save.stats.pestsProcessed`.
2. Apply story run-end flag rules ([story-runtime.md § Flags](story-runtime.md#flags)).
3. Copy `revoked` towers and abilities.
4. Record medals. Leaks counted in `medalExemptLeaks` (`quiet_wave`, `fleeing`, and `youngling` units) never break Perfect Core. A run with `usedCheckpoint` ([architecture.md § Checkpoints](architecture.md#checkpoints)) can earn Victory but not Perfect or Challenge.
5. Pay rewards by the table in [design/progression.md](../design/progression.md) §2: first-clear Stardust is the map's flat `stardust` value (A3M3 included), plus medal and objective Intel. **Defeat payouts can't be farmed:** a defeat on a map already completed pays 0 Stardust, and after a checkpoint retry `wavesResolved` counts only the waves resolved in this attempt from the run's `resumedFromWave` on ([architecture.md § Checkpoints](architecture.md#checkpoints)).
6. Run the map's story transactions (below), then save.

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
| When | After map results, purchases, story choices, and settings changes. Never mid-map; a map in progress isn't saved (checkpoints are in memory). Replaying a map is cheap and matches "failing has no penalty". |

**SaveData v1.** The canonical type is `src/meta/saveData.ts`; the progression fields come from [design/progression.md § 11](../design/progression.md#11-what-persists). In outline:

```ts
interface SaveData {
  profile: null;                        // until character creation (T306, D031); see below
  campaign: { maps: Partial<Record<MapId, { completed: boolean; medals: MedalId[]; bestMeter: number }>> };
  currencies: { stardust: number; intel: number };
  unlocks: {
    towers: TowerId[];
    specs: TowerId[];                   // towers whose tier-4 pair is unlocked (one purchase, both specs)
    revokedTowers: TowerId[];           // A3M2 until the jailbreak
    jailbroken: TowerId[];              // drawn with the jailbroken palette
    abilities: AbilityId[]; revokedAbilities: AbilityId[];
  };
  upgrades: Partial<Record<UpgradeId, number>>;  // owned ranks (≥ 1), including the C2 Zibzab Tune-up
  story: {
    flags: Partial<Record<StoryFlagId, FlagValue>>;  // StoryFlagId is ScriptFlagId until content/dialogue/flags.ts
    seen: SceneId[];                    // scenes played (skippable on replay)
    memosRead: MemoId[]; memosDelivered: MemoId[];
    codex: Record<CodexId, ('original' | 'annotated' | 'corrected')[]>;
    bricksTagIndex: number;             // next name in Bricks's tag list
    memorialTower: TowerId | null;      // the A3M3 {name} turret's type
    granted: string[];                  // one-time grants already applied (q3_bonus, gifts, crate)
  };
  stats: { pestsProcessed: number; runs: number };
}
```

- **The profile** becomes `{ name, pronouns: 'she' | 'he' | 'they', callsign: 'sprout' | 'thorn' | 'waykeeper', arrivalReason: 'bonus' | 'family' | 'lettuce' }` with character creation (name rules in [design/core-loop.md §6.1](../design/core-loop.md#61-character-creation-and-callsigns)). That is a schema bump with a migration.
- **A new save** (`createNewSave()`) owns Rivet and Thumper (issued for A1M1) and Orbital Strike. Orbital Strike is the welcome memo's gift; until the memo exists, a new save grants it directly (D031). Everything else is empty or 0.
- Fields the design persists that v1 doesn't hold yet (veteran records, loadout presets, Field Protocol choices) arrive with their features, each as a schema bump.

### Validation

Saves are untrusted input: a pasted code or a hand-edited localStorage value. `validateSave(x, known = LIVE_KNOWN_IDS)` (`src/meta/validate.ts`) is strict and returns either a freshly built copy (no shared references, nothing outside the schema) or every error (up to 20), each with its field path, such as `data.currencies.intel: expected an integer in [0, 1000000000], got -3`. It checks:
- **Shape:** every object is a plain object with exactly the schema's keys (missing and unknown keys both fail); `profile` is `null`.
- **Ids:** towers, abilities, maps, upgrades, and story flags must exist in the live registries (`LIVE_KNOWN_IDS`; upgrades are empty until the catalog lands). Ids with no registry yet (scenes, memos, codex entries, grants, medals, string flag values) must be lowercase snake_case starting with a letter, which also rules out `__proto__`. Lists hold no duplicates.
- **Numbers:** non-negative safe integers, with bounds no real save approaches (currencies ≤ 10⁹, meter ≤ 10⁶, upgrade ranks 1–10). Flag values are booleans, integers, or ids.
- **Cross-field rules:** `specs`, `revokedTowers`, and `jailbroken` are subsets of `towers`; `revokedAbilities` of `abilities`; a map has at most 3 medals, and any medal means the map is `completed`.

### Versioning and migrations

- `SAVE_VERSION` is an integer (now **1**). `src/meta/migrations.ts` exports `migrations: Record<number, (old: unknown) => unknown>`, where `migrations[n]` upgrades the `data` of version `n` to `n + 1`. A migration reshapes what it recognizes and passes anything else through for validation to reject.
- Loading parses the JSON, applies migrations in sequence to the current version, then validates. A version above `SAVE_VERSION` is `too_new` (a newer build wrote it). **Version 0** is the pre-release draft of the format (v1 without `stats`); no build wrote it, and it exists so the framework is tested from the start.
- Migrations are never deleted or edited after release. Each schema bump adds a fixture `src/meta/__fixtures__/save.v<n>.json`, and `migrations.test.ts` checks there is one fixture per version, then migrates every fixture to the current version and validates it.

### Loading and writing slots

`src/meta/save.ts`. **Never silently wipe a save.**
- `loadSlot(store, slot)` never writes. It returns `empty`; `ok` with the save, its `savedAt`, `source: 'main' | 'bak'`, and `migratedFrom`; or `unreadable`. When the main key fails (bad JSON, bad version, failed validation, or missing while a backup exists) it falls back to `:bak`, and reports the main key's problem and raw text so the app can offer "save could not be loaded; export raw data?". `unreadable` carries both raw values and both problems.
- `writeSlot(store, slot, data, savedAt)` validates first and never writes an invalid save. It rotates the old main value into `:bak` **only if that value is itself readable**, so a corrupt main never replaces a good backup. Then it writes the main key and `lastSlot`. A storage error (quota) comes back as `{ ok: false, code: 'storage' }`, not a throw.
- `listSlots`, `deleteSlot` (the main key and its backup; an explicit player action), and `getLastSlot` complete the slot API.

### Export and import codes

`src/meta/codec.ts`. A code is `SD<v>-<body>-<checksum>`:
- `<v>` is the save's schema version. `<body>` is `base64url(deflate-raw(envelope JSON))`, unpadded (RFC 4648 §5). `<checksum>` is 4 lowercase hex digits: the low 16 bits of `fnv1a32` (`src/shared/hash.ts`) over everything before the last `-`. Example: `SD1-TVA9T8QwDP0v…-a3f9`. A new save is about 0.5 KB of JSON and about 400 characters as a code, which pastes fine.
- **Export** (`exportCode(data, savedAt)`) validates the save first and throws on an invalid one (a caller bug, not player input).
- **Import** (`importCode(text)`) never throws on bad input. In order: cap the pasted text at **64 KB**; strip whitespace (pasting adds line breaks); check the shape (`format`), the checksum (`checksum`), and that the version isn't newer than this build (`too_new`), all before decompressing; decompress while counting bytes and stop at **512 KB** (`too_large`, which stops decompression bombs); decode strict UTF-8 (`corrupt` on failure, as for a body that doesn't inflate); parse (`json`); check the prefix version matches the envelope's `v` (`format`); then migrate and validate (`invalid`, with the schema errors). The app confirms with the player before writing the result to a slot.
- `CompressionStream` and `TextEncoder` exist in every target browser and in Node 22, so Vitest runs the real codec. `meta/` is type-checked with the pure modules (no DOM lib), so `src/meta/platform.ts` looks the primitives up behind narrow structural types instead of declaring them globally.

### Dev saves

`src/meta/__fixtures__/devSaves.ts` exports `DEV_SAVES`, which the test-only `?save=<id>` hook loads (D031) so smoke tests and the owner can reach gated systems. Each entry has a `description` and a `build()` that returns a fresh `SaveData` built from the live registries, so it stays valid as content lands; `devSaves.test.ts` validates every one and round-trips it through a code.

| Id | Holds |
|---|---|
| `fresh` | `createNewSave()` |
| `after_a1m1` | A1M1 won with all three medals: 3 Intel, 0 Stardust; the Sprinkler issued for A1M2 |
| `mid_m2` | `after_a1m1` plus the second campaign map won (Victory only) and its Stardust and Intel banked, once that map is in `CAMPAIGN` |
| `all_unlocked` | Every campaign map won with every medal; every registered tower, spec unlock, and ability; 99,999 Stardust and 999 Intel |

Medal ids in the dev saves use `victory`, `perfect_core`, and the map's Challenge id (or `challenge` if its data has none) until the medal id convention is fixed.

---

## Open questions

1. **Pests Processed on quit.** The count is added at run end, so closing the tab mid-map loses that run's kills. Flush on `pagehide` (a save write mid-map, which the save rules otherwise forbid), or accept the loss? (Related: [architecture.md, open question 1](architecture.md#open-questions).)
2. **Custom pronouns.** `PronounSet` supports any five forms plus an agreement, but the save stores only three ids. Adding custom sets later needs a save migration and a name-entry-style form.
