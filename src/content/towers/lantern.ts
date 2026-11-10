// Seer's Lantern (design/towers.md § 7): attuned in R&D after A2M5 (Xenotech, 3 Intel;
// upgrades/access.ts), Aelari, ground and air. Detection radius 3.0, and a thin light-beam that
// deals 4 Psionic/s to one target and Marks it +15% (more damage from every source; highest Mark
// only). T2 Mark +20%, detection 3.5; T3 marks 2 targets at once (two beams). All-Seeing: marks
// every enemy within 3.5 at +15% (and keeps T3's two beams). Truthlight: one beam, its target
// Marked +35% and unable to cloak, blink, phase, or burrow while Marked (`noEvade`). Default Strong.
//
// Live since T508. The beam is sim/attacks/beam.ts (no ramp: `damage` per second in 0.25 s beam
// ticks, each landing the tier's Mark); its range is the detection radius. A Mark outlasts the
// last beam tick by 1 s (so a held beam keeps it up, and it lapses 1 s after the beam moves on);
// All-Seeing's area Mark is sim/systems/markArea.ts (AREA_MARK_SEC, the same 1 s); Truthlight's
// `noEvade` is systems/status.ts `evadeBlocked` and systems/detection.ts. Lightsong (the Prism)
// adds +5% to every Mark it lands. Sprites: content/sprites/towers/lantern.ts (T540b).
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
    a: { name: 'All-Seeing', cost: 360, markArea: { radiusTiles: 3.5, pct: 0.15 } },
    b: {
      name: 'Truthlight',
      cost: 360,
      attack: { beams: 1 },
      effects: [{ status: 'marked', pct: 0.35, durationSec: 1, noEvade: true }],
    },
  },
});
