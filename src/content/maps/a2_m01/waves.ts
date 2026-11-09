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
  // W4 · Haulers fleeing + Motes ×8 [X: shoot the Hollow, not the runners]; the bore opens
  {
    groups: [
      run('hauler', 3, 'spires', OPEN),
      motes(8, 'spires', OPEN + FLEE_LEAD),
      motes(14, 'bore', OPEN + 8),
    ],
  },
  // W5 · an Elder with her younglings + Motes, on both roads
  {
    groups: [
      run('elder', 1, 'spires', OPEN),
      g('nibbler', 6, 'spires', OPEN + 0.4, 0.3, ['fleeing', 'youngling']),
      motes(10, 'spires', OPEN + FLEE_LEAD),
      motes(16, 'bore', OPEN + 8),
    ],
  },
  // W6 · a Mote cluster ×12 out of the bore [X: splash], runners and their chasers, another cluster
  {
    groups: [
      motes(20, 'bore', OPEN),
      run('nibbler', 8, 'spires', OPEN + 2),
      motes(12, 'spires', OPEN + 2 + FLEE_LEAD),
      motes(20, 'bore', OPEN + 14),
    ],
  },
  // W7 · Bunchlings fleeing + Motes, both roads
  {
    groups: [
      run('bunchling', 6, 'spires', OPEN),
      motes(16, 'spires', OPEN + FLEE_LEAD),
      motes(20, 'bore', OPEN + 4),
      motes(20, 'bore', OPEN + 16),
    ],
  },
  // W8 · mixed: Zoomers and Diggers fleeing down the Spires road, Puffwings overhead, Motes
  {
    groups: [
      run('zoomer', 10, 'spires', OPEN),
      motes(8, 'spires', OPEN + FLEE_LEAD),
      run('puffwing', 8, 'sky', OPEN + 5),
      motes(14, 'bore', OPEN + 10),
      run('digger', 4, 'spires', OPEN + 14),
      motes(10, 'spires', OPEN + 14 + FLEE_LEAD),
    ],
  },
  // W9 · Motes ×20 from the bore [X], too long for one strike, with runners on the Spires road
  {
    groups: [
      run('nibbler', 8, 'spires', OPEN),
      motes(8, 'spires', OPEN + FLEE_LEAD),
      motes(20, 'bore', OPEN + 8),
    ],
  },
  // W10 · everything, both roads
  {
    groups: [
      run('hauler', 2, 'spires', OPEN),
      motes(10, 'spires', OPEN + FLEE_LEAD),
      motes(14, 'bore', OPEN + 4),
      run('puffwing', 8, 'sky', OPEN + 8),
      run('bunchling', 6, 'spires', OPEN + 14),
      motes(12, 'spires', OPEN + 14 + FLEE_LEAD),
      motes(16, 'bore', OPEN + 20),
    ],
  },
]);
