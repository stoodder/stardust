// FIN Phase 2 (the Unsung) and Phase 3 (Dawn), as tuned (T821; story/campaign/finale.md § FIN,
// design/maps.md § 5.5): the song's countdown at ~3 min under Keep and inside ±30% of it under the
// other C4 answers (#18, judged by the harness too), every add wave walking in before Dawn, Dawn
// winning the map exactly 8 s after it breaks, Thrum's echo at rest progress 50% (cleared only) and
// Pebble's "She heard" as it reaches the song, Directive 0 under Keep (revoke, lock, "Who's
// there?", restore, and par rebuilding the class; a human's slower rebuild still survivable), the
// trickle alone ending the phase inside twice its target, D154 Fork 2's pinned cost (no burrow
// answer ends ≥ 10 Voices under par), Laid to Rest (a deliberate Halls-ring Phase 2 earns it, par
// doesn't; T874), and par's whole run under 25 minutes at 1×.
import { describe, expect, it } from 'vitest';
import { compileContent } from '../content/compile.ts';
import type { CompiledBuild } from '../content/compiled.ts';
import { RAW_CONTENT } from '../content/registry.ts';
import { PADS } from '../content/maps/fin_m01/builds.ts';
import { DAWN_SEC, DIRECTIVE_0_SEC, THRUM_ECHO } from '../content/maps/fin_m01/map.ts';
import { createBuildExecutor, createSim, runHeadless, type SimEvent } from '../sim/index.ts';
import { flagsFor, marginOf } from './checks.ts';
import { buildFor } from './harness.ts';
import { referenceRunProfile, runConfig } from './profile.ts';
import { HARNESS_TEST_TIMEOUT_MS } from './rules.ts';
import { SONG_TARGET_SEC, SONG_TOLERANCE, songSeconds } from './songChecks.ts';

const TICK_HZ = 60;
const content = compileContent(RAW_CONTENT);
const map = content.maps.fin_m01;
/** Whether two tiles are the same. */
const sameTile = (t: readonly [number, number], u: readonly [number, number]): boolean =>
  t[0] === u[0] && t[1] === u[1];
/** Par's Phase 2 tier and spec on the west ledge, and its Halls Choir's upgrades (the ring moves them). */
const ledgeOrChoirLate = (s: CompiledBuild['steps'][number]): boolean =>
  s.wave >= 19 &&
  (s.kind === 'upgrade' || s.kind === 'specialize') &&
  (sameTile(s.tile, PADS.LEDGE_W) || sameTile(s.tile, PADS.HALLS_E));
/** A3M6's par Sheltered % (balance/a3m6.test.ts): the escort chain's previous map. */
const A3M6_PAR_PCT = (32 / 54) * 100;

function config(label: string, build?: CompiledBuild) {
  const b = build ?? buildFor(label, map, content)!;
  const flags = flagsFor(label, map) ?? {};
  const profile = referenceRunProfile(map, content, 'standard', undefined, flags);
  return { b, cfg: runConfig(content, map, b, profile, 1, flags) };
}

function headless(label: string, build?: CompiledBuild) {
  const { b, cfg } = config(label, build);
  return runHeadless(cfg, b);
}

/** Plays `label` tick by tick, logging every event with its tick; `hold` skips the executor. */
function played(label: string, hold: (tick: number) => boolean = () => false) {
  const { b, cfg } = config(label);
  const sim = createSim(cfg);
  const exec = createBuildExecutor(sim, b);
  const st = sim.state;
  const log: { e: SimEvent; tick: number; p: number }[] = [];
  const out: SimEvent[] = [];
  while (st.outcome === 'playing' && st.tick < TICK_HZ * 60 * 30) {
    if (!hold(st.tick)) exec.beforeTick();
    sim.step();
    out.length = 0;
    sim.drainEvents(out);
    for (const e of out) log.push({ e, tick: st.tick, p: st.restPoints / st.restTarget });
  }
  const at = (type: SimEvent['type'], pred: (e: SimEvent) => boolean = () => true) =>
    log.find((x) => x.e.type === type && pred(x.e))?.tick ?? -1;
  return { sim, exec, log, at };
}

describe('FIN Phase 2 and Dawn', { timeout: HARNESS_TEST_TIMEOUT_MS * 2 }, () => {
  const c4 = {
    keep: headless('flag:quill_choice=keep'),
    purge: headless('flag:quill_choice=purge'),
    rewrite: headless('flag:quill_choice=rewrite'),
  };

  it('#18: ~3 min under Keep, Purge and Rewrite within ±30% of it, every add wave before Dawn', () => {
    const keep = songSeconds(c4.keep)!;
    expect(Math.abs(keep / SONG_TARGET_SEC - 1)).toBeLessThanOrEqual(0.05); // 171–189 s
    for (const [name, r] of Object.entries(c4)) {
      expect(r.outcome, name).toBe('won');
      const sec = songSeconds(r)!;
      expect(Math.abs(sec / keep - 1), name).toBeLessThanOrEqual(SONG_TOLERANCE);
      // All 26 waves walked in before Dawn (none is cut by the phase ending; `inPhase`).
      expect(r.waves.every((w) => w.startTick >= 0 && w.startTick < r.phaseStartTick[3]!)).toBe(
        true,
      );
    }
    expect(songSeconds(c4.purge)! / keep).toBeGreaterThan(1.15); // Purge's longer song, felt
    expect(songSeconds(c4.rewrite)! / keep).toBeLessThan(0.9); // Rewrite's log, felt
  });

  it('Dawn wins the map 8 s after it breaks, the hushed awake and the score kept', () => {
    for (const r of Object.values(c4)) {
      // The win's tick is 8 s after Dawn's; `ticks` counts that tick too.
      expect(r.ticks - r.phaseStartTick[3]!).toBe(DAWN_SEC * TICK_HZ + 1);
      expect(r.voices).toBe(r.choirSize); // every hushed singer sings again
      expect(r.stats.voicesMin).toBeLessThan(r.choirSize); // the margin reads the low point
    }
  });

  it('the trickle alone ends Phase 2 inside twice its target under Keep', () => {
    const song = map.song!;
    const keepMul = song.multipliers.find((m) => m.value === 'keep')!.mul;
    const trickleSec = song.restTarget / (song.restPerTick * TICK_HZ * keepMul);
    expect(trickleSec).toBeLessThanOrEqual(2 * SONG_TARGET_SEC);
    expect(trickleSec).toBeGreaterThan(SONG_TARGET_SEC); // the kills and the Unsung still count
  });

  it("Thrum's echo at rest progress 50% when she was cleared; Pebble's line as it arrives", () => {
    const cleared = played('flag:spared_quiet_wave=false');
    const spawned = cleared.log.find(
      (x) => x.e.type === 'AllySpawned' && 'kind' in x.e && x.e.kind === 'echo',
    );
    expect(spawned).toBeDefined();
    const arrived = cleared.at('EchoArrived');
    const cue = cleared.at('ScriptCue', (e) => 'cueId' in e && e.cueId === 'fin_m01_cue_echo');
    // It rises out of the Unsung, which the song holds at its edge: inside the song at once.
    expect(arrived).toBeGreaterThanOrEqual(spawned!.tick);
    expect(cue).toBe(arrived + 1);
    expect(cleared.sim.state.echoesArrived).toEqual([THRUM_ECHO]);
    // Spawned as rest progress crosses 50% (the trigger reads the last tick's progress).
    expect(spawned!.p).toBeGreaterThanOrEqual(0.5);
    expect(spawned!.p).toBeLessThan(0.52);
    const spared = played('flag:spared_quiet_wave=true');
    expect(spared.at('EchoArrived')).toBe(-1);
  });

  it('Directive 0 under Keep: revoked, locked, asked, restored, rebuilt; a slow rebuild survives', () => {
    const keep = played('flag:quill_choice=keep');
    const p2 = keep.at('PhaseChanged', (e) => 'phase' in e && e.phase === 2);
    const revoked = keep.at('ClassRevoked');
    expect(revoked).toBe(p2 + DIRECTIVE_0_SEC * TICK_HZ);
    expect(keep.at('AbilityLocked', (e) => 'on' in e && e.on)).toBe(revoked);
    expect(keep.at('ForcedInputRequested')).toBe(revoked);
    const restored = keep.at('ClassRestored');
    expect(restored).toBeGreaterThan(revoked);
    expect(keep.exec.rebuilt.length).toBeGreaterThan(0);
    expect(keep.exec.rebuilt.every((r) => r.error === null)).toBe(true);
    expect(keep.sim.state.outcome).toBe('won');
    expect(keep.sim.state.revoked.towers).toEqual([]); // no stamp left at the end
    // A human presses after the knock types (the forced input freezes the sim meanwhile, so that
    // costs no sim time), then rebuilds the class over ~15 s: still won, within 2 singers.
    const slow = played(
      'flag:quill_choice=keep',
      (t) => restored > 0 && t > restored && t <= restored + 15 * TICK_HZ,
    );
    expect(slow.sim.state.outcome).toBe('won');
    expect(keep.sim.state.stats.voicesMin - slow.sim.state.stats.voicesMin).toBeLessThanOrEqual(2);
  });

  it('Fork 2: with no burrow answer (no Den, no Dread) par ends ≥ 10 Voices under par', () => {
    const par = map.builds.parBuild;
    const noBurrow: CompiledBuild = {
      ...par,
      loadout: par.loadout.map((t) => (t === 'burrow' ? 'gloop' : t)),
      steps: par.steps.map((s) =>
        s.kind === 'build' && s.tower === 'burrow'
          ? { ...s, tower: 'gloop' }
          : s.kind === 'specialize' && s.spec === 'b'
            ? { ...s, spec: 'a' as const }
            : s,
      ),
    };
    const base = headless('par');
    const cost = headless('par', noBurrow);
    expect(cost.outcome).toBe('won');
    expect(marginOf(base) - marginOf(cost)).toBeGreaterThanOrEqual(10);
  });

  it("Laid to Rest: the Halls ring earns it, par (the west ledge's Echo Spike) does not", () => {
    // Par's Phase 2 spent on the Hum Choir at the Halls (tier 3 by W20) instead of the west
    // ledge's tier 3 and Echo Spike, whose echoes break the Hollow up the descent, outside the song.
    const par = map.builds.parBuild;
    const ring: CompiledBuild = {
      ...par,
      steps: par.steps.flatMap((s) =>
        ledgeOrChoirLate(s)
          ? []
          : s.wave === 19 && s.kind === 'upgrade' && sameTile(s.tile, PADS.CORNER)
            ? [s, { ...s, tile: PADS.HALLS_E }, { ...s, wave: 20, tile: PADS.HALLS_E }]
            : [s],
      ),
    };
    const plain = headless('par');
    const ringed = headless('par', ring);
    expect(plain.medals.challenge).toBe('forfeited');
    expect(ringed.outcome).toBe('won');
    expect(ringed.medals.challenge).toBe('earned');
    expect(marginOf(ringed)).toBe(marginOf(plain)); // the choice costs no singer
  });

  it('par closes the escort chain (≤ A3M6 + 5) and plays under 25 minutes at 1×', () => {
    const par = headless('par');
    expect(marginOf(par)).toBeLessThanOrEqual(A3M6_PAR_PCT + 5);
    expect(par.ticks / (TICK_HZ * 60)).toBeLessThan(25);
  });
});
