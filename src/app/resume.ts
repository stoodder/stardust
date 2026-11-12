// The finale's persisted run (D154; T809; architecture.md § Checkpoints): a 20–25 minute run that
// survives a closed tab. As the finale reaches a checkpoint (every wave checkpoint, and the Halls
// at Phase 2's start) the router writes it to the save's `pendingRun`: the map, seed, loadout and
// companion locked in, the checkpoint, the command log before it, the kills already filed, and
// `configHash`, the fingerprint of the config it ran on. Continue on the Title then offers "Resume
// the Long Walk": the save rebuilds the same config (app/battleSetup.ts, with the run's own loadout
// fixed), and the run replays to the checkpoint as a retry does (app/checkpoints.ts), as the same
// run (a reload is not a retry: it keeps the medals the run could still earn). A save that now
// builds another config (a purchase or a setting changed since) is refused with RESUME_REFUSED,
// and the pending run is dropped. Any end of the finale run (won, lost, abandoned) drops it, and so
// does a fresh start of the finale. Other maps keep their checkpoints in memory only.
import type { CompanionId, IdSpace, MapId } from '../content/types.ts';
import type { PendingRun, SaveData } from '../meta/index.ts';
import { CAMPAIGN } from '../content/campaign.ts';
import { fnv1a32 } from '../shared/hash.ts';
import type { CommandLogEntry, SimConfig } from '../sim/index.ts';
import { battleConfig } from './battleSetup.ts';
import type { Checkpoint, Resume } from './checkpoints.ts';

/** The Title's button for a save with the finale's run pending (finale.md: the Long Walk). */
export const RESUME_LABEL = 'Resume the Long Walk';

/** The Shift board's notice when the pending run's save now builds another config. */
export const RESUME_REFUSED =
  "The Long Walk couldn't pick up where it was: this save has changed since (a purchase or a " +
  'setting). The walk starts again from the gate.';

/**
 * The notice a reload opens with, paused at its checkpoint (`place`: "wave 10", "the Halls");
 * `retried`: the run was a checkpoint retry before the tab closed, so its medals stay dim.
 */
export function reloadedNotice(place: string, retried = false): string {
  const why = retried ? ' Perfect Core and the Challenge need a shift from wave 1.' : '';
  return `The Long Walk resumes at ${place}. Unpause when ready.${why}`;
}

/** Whether a map persists its latest checkpoint to the save: the campaign's finale only (D154). */
export function persistsCheckpoints(map: { readonly id: string; readonly act: unknown }): boolean {
  const campaign: readonly string[] = CAMPAIGN;
  return map.act === 'finale' && campaign.includes(map.id);
}

/** A value's JSON with every object's keys sorted, so equal configs print alike. */
function stableJson(x: unknown): string {
  return JSON.stringify(x, (_key, value: unknown) => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(value).sort()) out[k] = (value as Record<string, unknown>)[k];
    return out;
  });
}

/**
 * The config's fingerprint (`PendingRun.configHash`): 8 lowercase hex digits of FNV-1a over
 * everything the run's replay depends on (the config's own fields, and its map as compiled), so a
 * save whose purchases, protocols, difficulty, story flags, or content changed since reads apart.
 */
export function configHash(cfg: SimConfig<IdSpace>): string {
  const { content, ...own } = cfg;
  const map = Object.hasOwn(content.maps, cfg.mapId) ? content.maps[cfg.mapId] : null;
  return fnv1a32(stableJson({ own, map })).toString(16).padStart(8, '0');
}

/**
 * The run to persist at `checkpoint` (the latest one taken): its config's map, seed, loadout, and
 * companion; the checkpoint and its share of `log`; `killsBefore` (`Host.killsBefore`); and the
 * checkpoint a retry before it resumed from (`retriedFrom`, `Host.resumedFrom`), or none.
 */
export function pendingRunOf(
  cfg: SimConfig<IdSpace>,
  checkpoint: Checkpoint,
  log: readonly CommandLogEntry<IdSpace>[],
  killsBefore: number,
  retriedFrom: Checkpoint | null,
): PendingRun {
  const { label, wave, tick, commandCount } = checkpoint;
  return {
    map: cfg.mapId as MapId,
    seed: cfg.seed,
    loadout: {
      towers: [...cfg.loadout] as PendingRun['loadout']['towers'],
      ability: cfg.abilities.slot1 as PendingRun['loadout']['ability'],
    },
    companion: cfg.companion,
    checkpoint: { ...(label === undefined ? {} : { label }), wave, tick, commandCount },
    // The log is plain data (sim commands), as validateEndgame checks it field by field.
    log: log.slice(0, commandCount) as PendingRun['log'],
    killsBefore,
    configHash: configHash(cfg),
    ...(retriedFrom === null
      ? {}
      : {
          retriedFrom: {
            ...(retriedFrom.label === undefined ? {} : { label: retriedFrom.label }),
            wave: retriedFrom.wave,
            tick: retriedFrom.tick,
            commandCount: retriedFrom.commandCount,
          },
        }),
  };
}

/** A pending run, ready to replay: its rebuilt config and the resume. */
export interface PendingResume {
  readonly cfg: SimConfig<IdSpace>;
  readonly resume: Resume<IdSpace>;
}

/**
 * Rebuilds `save`'s pending run (null without one): the config from the save with the run's own
 * loadout and companion fixed, checked against `configHash`. Returns `'changed'` when the save now
 * builds another config (or no longer builds one at all), which the caller refuses.
 */
export function pendingResume(save: SaveData): PendingResume | 'changed' | null {
  const run = save.pendingRun;
  if (run === undefined) return null;
  let cfg: SimConfig<IdSpace>;
  try {
    cfg = battleConfig(run.map, run.seed, save, {
      towers: run.loadout.towers,
      ability: run.loadout.ability,
      companion: run.companion as CompanionId | null,
    });
  } catch {
    return 'changed';
  }
  if (configHash(cfg) !== run.configHash) return 'changed';
  const checkpoint: Checkpoint = run.checkpoint;
  return {
    cfg,
    resume: {
      checkpoint,
      log: run.log as readonly CommandLogEntry<IdSpace>[],
      retriedFrom: run.retriedFrom ?? null,
      killsBefore: run.killsBefore,
    },
  };
}

/** `save` with `run` as its pending run (or none, for null). */
export function withPendingRun(save: SaveData, run: PendingRun | null): SaveData {
  if (run === null) {
    if (save.pendingRun === undefined) return save;
    const { pendingRun: _dropped, ...rest } = save;
    return rest;
  }
  return { ...save, pendingRun: run };
}
