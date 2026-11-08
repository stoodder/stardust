# Meta Runtime

How meta progression and saves work in code: `src/meta/`, what happens at run end, the story transactions, and the save system. The module layout is in [architecture.md](architecture.md); the rules (currencies, shop, R&D, medals, pacing) are owned by [design/progression.md](../design/progression.md). Story state that lives in the save is described in [story-runtime.md](story-runtime.md).

**Not in M1.** M1 has no meta module: no saves, currencies, or medals, and A1M1's reference profile is empty ([architecture.md, M1 subset](architecture.md#architecture)).

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
| Storage | `localStorage`, behind `KeyValueStore` |
| Keys | `stardust:slot:1`…`3` (campaign saves), `stardust:slot:N:bak` (the previous good write), `stardust:settings`, `stardust:lastSlot` |
| Format | JSON: `{ v: <schemaVersion>, savedAt, data: SaveData }` |
| When | After map results, purchases, story choices, and settings changes. Never mid-map; a map in progress isn't saved (checkpoints are in memory). Replaying a map is cheap and matches "failing has no penalty". |

**SaveData** (sketch; the progression fields come from design/progression.md):

```ts
interface SaveData {
  profile: {
    name: string;                       // 1–16 chars, charset in design/core-loop.md §6.1
    pronouns: 'she' | 'he' | 'they';    // PronounSet id
    callsign: 'sprout' | 'thorn' | 'waykeeper';
    arrivalReason: 'bonus' | 'family' | 'lettuce';
  };
  campaign: { maps: Record<MapId, { completed: boolean; medals: MedalId[]; bestMeter: number }>; };
  currencies: { stardust: number; intel: number };
  unlocks: {
    towers: TowerId[];
    specs: TowerId[];                   // towers whose tier-4 pair is unlocked (one purchase, both specs)
    revokedTowers: TowerId[];           // A3M2 until the jailbreak
    jailbroken: TowerId[];              // drawn with the jailbroken palette
    abilities: AbilityId[]; revokedAbilities: AbilityId[];
  };
  upgrades: Record<UpgradeId, number>;  // includes the C2 Zibzab Tune-up
  story: {
    flags: Partial<StoryFlags>;         // typed from content/dialogue/flags.ts
    seen: SceneId[];                    // scenes played (skippable on replay)
    memosRead: MemoId[]; memosDelivered: MemoId[];
    codex: Record<CodexId, ('original' | 'annotated' | 'corrected')[]>;
    bricksTagIndex: number;             // next name in Bricks's tag list
    memorialTower: TowerId | null;      // the A3M3 {name} turret's type
    granted: string[];                  // one-time grants already applied (q3_bonus, gifts, crate)
  };
  stats: { pestsProcessed: number; runs: number; /* … */ };
}
```

### Versioning and migrations

- `SAVE_VERSION` is an integer. `src/meta/migrations.ts` exports `migrations: Record<number, (old: unknown) => unknown>`, where `migrations[n]` upgrades version `n` to `n + 1`.
- Loading parses JSON, applies migrations in sequence to the current version, then `validateSave()`. If validation fails it falls back to the `:bak` key, then to a clear "save could not be loaded; export raw data?" prompt. **Never silently wipe a save.**
- Migrations are never deleted or edited after release. Each schema bump adds a fixture `src/meta/__fixtures__/save.v<n>.json`, and a test migrates every fixture to the current version and validates it.

### Export and import codes

- Export: `JSON → deflate-raw (CompressionStream) → base64url`, with the prefix `SD<v>-` and a 4-character checksum suffix. Example: `SD1-eNqrVkrLz…-a3f9`. A typical save is about 1–2 KB of text, which pastes fine.
- Import: check the prefix and checksum, cap the input at 64 KB and the decompressed size at 512 KB (to block decompression bombs), parse, migrate, validate, then confirm with the player before overwriting a slot.
- `CompressionStream` is available in all target browsers and in Node 22, so the codec is testable in Vitest.

---

## Open questions

1. **Pests Processed on quit.** The count is added at run end, so closing the tab mid-map loses that run's kills. Flush on `pagehide` (a save write mid-map, which the save rules otherwise forbid), or accept the loss? (Related: [architecture.md, open question 1](architecture.md#open-questions).)
2. **Custom pronouns.** `PronounSet` supports any five forms plus an agreement, but the save stores only three ids. Adding custom sets later needs a save migration and a name-entry-style form.
