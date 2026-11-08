# Stardust Docs — Index

Start here. For how to work, see `/CLAUDE.md`. **Don't read everything:** the docs total about 100k words. Use the reading paths below to find what your task needs.

## Reading paths

Always read `CLAUDE.md`, your task in `tasks.md`, and `decisions.md` first. Then:

| Task kind | Read | Skip |
|---|---|---|
| **M1 (any task)** | [tech/architecture.md](tech/architecture.md) top note *M1 subset* for scope, plus `decisions.md` D004 (the M1 cut). Then your lane's row below (Sim / Maps / Rendering / UI / Harness). A1M1's layout, waves, credits, and par build live in [story/campaign/act1.md § A1M1](story/campaign/act1.md#a1m1--orientation-day), and its threat intel is in [story/campaign.md](story/campaign.md) §4.8 | progression, meta-runtime, the rest of story/, and story-runtime except its *Not in M1* line |
| **Sim / combat / economy** | architecture §2–3; [tech/conventions.md](tech/conventions.md) (style, testing, test loop); [design/core-loop.md](design/core-loop.md) §2; [design/enemies.md](design/enemies.md) §2 (combat math) and the rows you're implementing; [design/towers.md](design/towers.md) the rows you're implementing | art, story |
| **Maps / content data** | architecture §3 *Data shapes*; conventions *Recipes*; [design/maps.md](design/maps.md); [story/campaign.md](story/campaign.md) §4.8 (threat intel / required counters) and §4.9 (reference profiles); the map's entry in its act file under `story/campaign/`; [tech/story-runtime.md § Map scripts](tech/story-runtime.md#map-scripts-story-driven-sim-changes) for `events` | the other act files |
| **Balance harness** | conventions *The test loop*; maps.md §6; [design/progression.md](design/progression.md) §10 (profile rules); [story/campaign.md](story/campaign.md) §4.8–4.9 (per-map counters and the reference profile); the map's par/alt builds in its act file | the rest of story |
| **Rendering / sprites** | [art/tech-spec.md](art/tech-spec.md); [art/art-direction.md](art/art-direction.md) §2, §4, §7–8; architecture §4 *Rendering* | story, progression |
| **UI / HUD / menus** | architecture §4 *UI: DOM overlay*; art-direction §9; core-loop §4 | story (except the screen's own strings) |
| **Meta / saves / shop** | [tech/meta-runtime.md](tech/meta-runtime.md); progression.md | art |
| **Dialogue / story systems** | [tech/story-runtime.md](tech/story-runtime.md); [story/style-guide.md](story/style-guide.md); core-loop §6 | — |
| **Writing story content for a map** | [story/bible.md](story/bible.md) (the relevant act); [story/characters.md](story/characters.md) (the speakers); style-guide; the map's act file | tech, art |
| **Review: story angles** | all of `story/`; research | tech |

## Foundation
- [vision.md](vision.md): pitch, pillars, tone ramp, scope, non-goals
- [decisions.md](decisions.md): decision log (why things are the way they are)

## Story (`story/`)
- [story/bible.md](story/bible.md): premise, world, themes, the secrets, act-by-act arc, choices, endings
- [story/characters.md](story/characters.md): protagonist and NPCs, with arcs, voices, and allegiance
- [story/races.md](story/races.md): the races and factions of the setting
- [story/style-guide.md](story/style-guide.md): writing voice, comedy rules, dialogue format, tone per act
- [story/campaign.md](story/campaign.md): campaign overview: map table, introduction schedule, choice/flag ledger, pacing
  - [story/campaign/act1.md](story/campaign/act1.md): Act I map entries (A1M1–A1M5)
  - [story/campaign/act2.md](story/campaign/act2.md): Act II map entries (A2M1–A2M6)
  - [story/campaign/act3.md](story/campaign/act3.md): Act III map entries (A3M1–A3M6)
  - [story/campaign/finale.md](story/campaign/finale.md): the finale

## Design (`design/`)
- [design/core-loop.md](design/core-loop.md): the session loop, the in-map loop, win/lose, economy, story-facing systems
- [design/towers.md](design/towers.md): tower roster, roles, upgrade paths, stacking, and synergies
- [design/enemies.md](design/enemies.md): combat math, enemy roster, abilities, counters, and bosses
- [design/progression.md](design/progression.md): currencies, permanent upgrades, unlocks, medals
- [design/maps.md](design/maps.md): grid rules, tile types, objectives, map scripts, difficulty curve, harness rules

## Art (`art/`)
- [art/art-direction.md](art/art-direction.md): the look, palettes per act, faction visual language, VFX, tells, UI style
- [art/tech-spec.md](art/tech-spec.md): isometric spec and the code-generated pixel-art format

## Tech (`tech/`)
- [tech/architecture.md](tech/architecture.md): stack, sim/render split, data shapes, modules, build and deploy (starts with the M1 subset)
- [tech/conventions.md](tech/conventions.md): code style, recipes, the test loop, testing, performance
- [tech/story-runtime.md](tech/story-runtime.md): map scripts, dialogue runner, conditions, flags, text tokens, barks
- [tech/meta-runtime.md](tech/meta-runtime.md): meta progression runtime, run end, save system

## Research (`research/`)
- [research/emotional-storytelling.md](research/emotional-storytelling.md): what makes game stories emotional, and how Stardust applies it (background; the story docs win where they differ)
