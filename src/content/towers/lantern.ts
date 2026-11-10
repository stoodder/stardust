// Seer's Lantern (design/towers.md § 7): attuned in R&D after A2M5 (Xenotech, 3 Intel;
// upgrades/access.ts), Aelari, ground and air. Detection radius 3.0, and a thin light-beam that
// deals 4 Psionic/s to one target and Marks it +15% (more damage from every source; highest Mark
// only). T2 Mark +20%, detection 3.5; T3 marks 2 targets at once (two beams). All-Seeing: marks
// every enemy within 3.5 at +15%. Truthlight: one target Marked +35% that can't cloak, blink, phase,
// or burrow while Marked (`noEvade`). Default Strong.
//
// A stub registered ahead of its task (T500a; the cut lever, D137): T508 confirms the numbers, runs
// the Mark beam, All-Seeing, and Truthlight, and lifts it from towers/index.ts STUB_TOWER_TASKS.
// Not in the docs, so T508 settles them: the beam's range (here its detection radius) and how
// long a Mark outlasts the beam (here 1 s). Sprites: placeholders under their final ids (T540b).
import { DEFAULT_BEAM_TICK_SEC } from '../rules.ts';
import { defineTower } from '../define.ts';

export const lantern = defineTower({
  id: 'lantern',
  name: "Seer's Lantern",
  faction: 'aelari',
  role: 'Detection and Mark',
  sprites: { base: 'tower.lantern', head: 'tower.lantern_head', icon: 'icon.tower.lantern' },
  tiers: [
    {
      cost: 120,
      targets: { ground: true, air: true },
      defaultPriority: 'strong',
      detect: { radiusTiles: 3 },
      attack: {
        kind: 'beam',
        type: 'psionic',
        damage: 4,
        ratePerSec: 1 / DEFAULT_BEAM_TICK_SEC,
        rangeTiles: 3,
        tickSec: DEFAULT_BEAM_TICK_SEC,
      },
      effects: [{ status: 'marked', pct: 0.15, durationSec: 1 }],
    },
    {
      cost: 95,
      detect: { radiusTiles: 3.5 },
      attack: { rangeTiles: 3.5 },
      effects: [{ status: 'marked', pct: 0.2, durationSec: 1 }],
    },
    { cost: 180, attack: { beams: 2 } },
  ],
  specs: {
    a: {
      name: 'All-Seeing',
      cost: 360,
      attack: { beams: 1 },
      markArea: { radiusTiles: 3.5, pct: 0.15 },
    },
    b: {
      name: 'Truthlight',
      cost: 360,
      attack: { beams: 1 },
      effects: [{ status: 'marked', pct: 0.35, durationSec: 1, noEvade: true }],
    },
  },
});
