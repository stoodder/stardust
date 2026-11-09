// A1M2 waves: docs/story/campaign/act1.md § A1M2, Wave data. One route ('road'); every countdown
// is the Act I default (25 s). Groups without an `intervalSec` use the enemy's default spacing
// (Nibbler 0.8 s, Zoomer 0.5 s, Chonk 1.5 s, Hauler 2.5 s).
import { defineWaves } from '../../define.ts';
import type { EnemyId, WaveGroup } from '../../types.ts';

const ROUTE = 'road';
/**
 * W7–W8 release their Haulers one at a time, this far apart: longer than a strike's radius covers
 * and, across a wave, longer than its cooldown, so the Orbital Strike can't stand in for an armor
 * answer (D049).
 */
const HAULER_GAP = 12;

/** `count` of `enemy`, starting `delaySec` into the wave, `intervalSec` apart (default spacing). */
function g(enemy: EnemyId, count: number, delaySec = 0, intervalSec?: number): WaveGroup {
  return {
    enemy,
    count,
    delaySec,
    route: ROUTE,
    ...(intervalSec === undefined ? {} : { intervalSec }),
  };
}

export const waves = defineWaves([
  // W1 · Nibblers
  { groups: [g('nibbler', 10, 0, 0.7)] },
  // W2 · Nibblers + Zoomers; the early-call prompt
  { groups: [g('nibbler', 10), g('zoomer', 10, 5)] },
  // W3 · two Chonks [T: armor plink; Strong targeting]
  { groups: [g('chonk', 2, 0, 3)] },
  // W4 · Chonks + a Nibbler swarm [X; Sitting Ducks]
  { groups: [g('chonk', 3, 0, 2), g('nibbler', 16, 2, 0.3)] },
  // W5 · one Brood Hauler, alone [T]
  { groups: [g('hauler', 1)] },
  // W6 · a Zoomer rush + Chonks [X: early call]
  { groups: [g('zoomer', 24, 0, 0.5), g('chonk', 4, 4, 2)] },
  // W7 · Haulers + Nibblers [X]: five Haulers, one every 12 s
  { groups: [g('hauler', 5, 0, HAULER_GAP), g('nibbler', 20, 3, 0.4)] },
  // W8 · Haulers + Chonks + Zoomers [X]: six Haulers, one every 12 s
  { groups: [g('hauler', 6, 0, HAULER_GAP), g('chonk', 4, 6, 2), g('zoomer', 20, 10, 0.4)] },
]);
