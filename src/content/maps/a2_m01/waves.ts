// A2M1 waves: docs/story/campaign/act2.md § A2M1, Waves. Routes: `spires` (the north-west road,
// where the Skitterkin run from), `bore` (out of Rig Nine's bore mouth, north-east: the Hollow's
// road), and `sky` (the air lane, for the fleeing Puffwings). Every Skitterkin group is `fleeing`
// (Skittish, leak 0, bounty 1, medal-exempt), so the Motes are the only threat; a fleeing group on
// a road with Motes behind it leads them by FLEE_LEAD seconds ([fleeing-lead]). Countdowns are the
// Act II default (20 s). Groups without an `intervalSec` use the enemy's default spacing (Mote
// 0.3 s, Nibbler 0.8 s, Zoomer 0.5 s, Puffwing 0.6 s, Digger 1.0 s, Bunchling 1.0 s, Hauler 2.5 s).
import { defineWaves } from '../../define.ts';
import type { EnemyId, RouteId, WaveGroup, WaveTag } from '../../types.ts';

/** `count` of `enemy` on `route`, starting `delaySec` into the wave, `intervalSec` apart. */
function g(
  enemy: EnemyId,
  count: number,
  route: RouteId,
  delaySec = 0,
  intervalSec?: number,
  tags?: readonly WaveTag[],
): WaveGroup {
  return {
    enemy,
    count,
    route,
    delaySec,
    ...(intervalSec === undefined ? {} : { intervalSec }),
    ...(tags === undefined ? {} : { tags }),
  };
}

const FLEEING: readonly WaveTag[] = ['fleeing'];

/** Fleeing Skitterkin: `count` of `enemy` on `route` (the runners). */
const run = (
  enemy: EnemyId,
  count: number,
  route: RouteId,
  delaySec: number,
  intervalSec?: number,
): WaveGroup => g(enemy, count, route, delaySec, intervalSec, FLEEING);

/** A Mote cluster: `count` Motes on `route`, `intervalSec` apart (default 0.3 s, packed). */
const motes = (count: number, route: RouteId, delaySec: number, intervalSec?: number): WaveGroup =>
  g('mote', count, route, delaySec, intervalSec);

/**
 * How far the runners lead the Motes that chase them on the same road (enemies.md § 7: 2–4 s).
 * At 1.6 tiles/s a Mote closes on a 1.0 tiles/s Nibbler 3 s ahead in about 5 s, a third of the
 * way down the Spires road: par's west towers meet the Motes there.
 */
export const FLEE_LEAD = 3;
/**
 * W2–W10 open this long after they start: the last wave's bounties land before the first contact,
 * so a player who calls waves early isn't buying turrets mid-fight (the harness's early-call check).
 */
export const OPEN = 6;

/** A packed cluster's spacing (seconds): 0.32 tiles apart at a Mote's 1.6 tiles/s. */
export const PACKED = 0.3;
/**
 * A bore cluster released this long before a Spires one reaches the merge with it: the bore road
 * is a tile longer to the merge (13 vs 12 tiles; 0.6 s at a Mote's pace).
 */
export const BORE_HEAD = 0.6;

export const waves = defineWaves([
  // W1 · Nibblers + Zoomers, fleeing [T: Skittish; nothing follows them yet]
  {
    teach: true,
    groups: [run('nibbler', 10, 'spires', 0), run('zoomer', 8, 'spires', 8)],
  },
  // W2 · Puffwings + Diggers, fleeing ("They keep looking back.")
  {
    groups: [
      run('digger', 4, 'spires', OPEN),
      run('puffwing', 8, 'sky', OPEN + 4),
      run('nibbler', 8, 'spires', OPEN + 8),
    ],
  },
  // W3 · a fleeing group, then Motes ×6 behind it on the same road [T: Mote; the hush, Heavy]
  {
    groups: [
      run('nibbler', 6, 'spires', OPEN),
      { ...motes(6, 'spires', OPEN + FLEE_LEAD, 0.6), teach: true },
    ],
  },
  // W4 · Haulers fleeing + Motes [X: shoot the Hollow, not the runners]; the bore opens
  {
    groups: [
      run('hauler', 3, 'spires', OPEN),
      motes(10, 'spires', OPEN + FLEE_LEAD),
      motes(16, 'bore', OPEN + 10, PACKED),
    ],
  },
  // W5 · an Elder with her younglings + Motes, on both roads
  {
    groups: [
      run('elder', 1, 'spires', OPEN),
      g('nibbler', 6, 'spires', OPEN + 0.4, 0.3, ['fleeing', 'youngling']),
      motes(12, 'spires', OPEN + FLEE_LEAD),
      motes(20, 'bore', OPEN + 8, PACKED),
    ],
  },
  // W6 · Mote clusters out of the bore [X: splash], meeting runners and their chasers at the merge
  {
    groups: [
      run('nibbler', 8, 'spires', OPEN),
      motes(24, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(36, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      motes(36, 'bore', OPEN + 18, PACKED),
    ],
  },
  // W7 · Bunchlings fleeing + Motes, both roads
  {
    groups: [
      run('bunchling', 6, 'spires', OPEN),
      motes(50, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(50, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      motes(30, 'bore', OPEN + 24, PACKED),
    ],
  },
  // W8 · mixed: Zoomers and Diggers fleeing down the Spires road, Puffwings overhead, Motes
  {
    groups: [
      run('zoomer', 10, 'spires', OPEN),
      motes(16, 'spires', OPEN + FLEE_LEAD, PACKED),
      run('puffwing', 8, 'sky', OPEN + 5),
      motes(24, 'bore', OPEN + 10, PACKED),
      run('digger', 4, 'spires', OPEN + 16),
      motes(20, 'spires', OPEN + 16 + FLEE_LEAD, PACKED),
      motes(24, 'bore', OPEN + 16 + FLEE_LEAD - BORE_HEAD, PACKED),
    ],
  },
  // W9 · Motes ×40 from the bore [X], too long for one strike, with runners on the Spires road
  {
    groups: [
      run('nibbler', 8, 'spires', OPEN),
      motes(16, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(40, 'bore', OPEN + 8, PACKED),
    ],
  },
  // W10 · everything, both roads
  {
    groups: [
      run('hauler', 2, 'spires', OPEN),
      motes(40, 'spires', OPEN + FLEE_LEAD, PACKED),
      motes(40, 'bore', OPEN + FLEE_LEAD - BORE_HEAD, PACKED),
      run('puffwing', 8, 'sky', OPEN + 8),
      run('bunchling', 6, 'spires', OPEN + 20),
      motes(40, 'spires', OPEN + 20 + FLEE_LEAD, PACKED),
      motes(50, 'bore', OPEN + 20 + FLEE_LEAD - BORE_HEAD, PACKED),
    ],
  },
]);
