// The router's content gate (app/contentGate.ts; T802): a call whose content has loaded goes
// straight through, synchronously; a battle waits for the battle renderer first.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Router } from './router.ts';

const renderer = vi.hoisted(() => ({
  loaded: false,
  pending: null as Promise<void> | null,
  resolve: null as (() => void) | null,
}));

vi.mock('./battleRenderer.ts', () => ({
  battleRendererLoaded: () => renderer.loaded,
  loadBattleRenderer: () => {
    if (renderer.loaded) return Promise.resolve();
    renderer.pending ??= new Promise<void>((resolve) => {
      renderer.resolve = () => {
        renderer.loaded = true;
        resolve();
      };
    });
    return renderer.pending;
  },
}));

const { gateRouter } = await import('./contentGate.ts');

/** A router that records the calls that reach it. */
function fakeRouter(calls: string[]): Router {
  const done = (what: string): Promise<void> => {
    calls.push(what);
    return Promise.resolve();
  };
  return {
    battle: null,
    goto: (id) => done(`goto ${id}`),
    play: (r) => done(`play ${r.mapId ?? ''}`),
    retry: () => done('retry'),
    retryFromCheckpoint: () => done('retryFromCheckpoint'),
    resumePending: () => done('resumePending'),
    endRun: (o) => done(`endRun ${o}`),
    flushResults: () => done('flushResults'),
    abandon: () => {
      calls.push('abandon');
    },
    presentResults: () => done('presentResults'),
    closeSettings: () => done('closeSettings'),
  };
}

describe('the content gate', () => {
  beforeEach(() => {
    renderer.loaded = false;
    renderer.pending = null;
    renderer.resolve = null;
  });

  it('passes a menu straight through when its acts are in (every act is, in tests)', () => {
    const calls: string[] = [];
    const gate = gateRouter(fakeRouter(calls));
    void gate.goto('title');
    void gate.goto('settings');
    expect(calls).toEqual(['goto title', 'goto settings']);
  });

  it('holds a battle until the renderer has loaded, then starts it', async () => {
    const calls: string[] = [];
    const gate = gateRouter(fakeRouter(calls), { mapId: 'a1_m01' });
    const started = gate.goto('battle');
    const played = gate.play({ mapId: 'a1_m02' });
    await Promise.resolve();
    expect(calls).toEqual([]);
    renderer.resolve?.();
    await Promise.all([started, played]);
    expect(calls).toEqual(['goto battle', 'play a1_m02']);
    // Loaded now: the next battle goes straight through.
    void gate.retry();
    expect(calls.at(-1)).toBe('retry');
  });

  it('gates a post-game map (a challenge, Endless) on every act, the finale included (T862)', async () => {
    const { battleActs } = await import('./contentGate.ts');
    // Their maps register with the finale's chunk (content/acts/fin.ts), so a `?map=ch_m01` boot
    // waits for it, as a dev map waits for every act.
    for (const id of ['ch_m01', 'ch_m02', 'ch_m03', 'end_m01']) {
      expect(battleActs(null, id)).toBe('finale');
    }
    expect(battleActs(null, 'a1_m01')).toBe(2);
  });

  it('never holds the calls that only finish a run', () => {
    const calls: string[] = [];
    const gate = gateRouter(fakeRouter(calls));
    void gate.endRun('won');
    void gate.flushResults();
    gate.abandon();
    expect(calls).toEqual(['endRun won', 'flushResults', 'abandon']);
  });
});
