// The SEAL's rules in the app (app/forcedInput.ts; T614): the button arms after 700 ms and then
// only takes a fresh key-down or pointer-down; the keys go through the lock (Enter/Space press,
// Esc/M/Tab pass, game keys are held back, a menu or scene takes everything); the waiting line's
// clock runs on real time only while the screen shows, plays its scene once after 20 s, and stops
// under the pause menu; the hum strikes as it shows and every HUM_EVERY_MS; and on the Holdout dev
// range the HUD follows the sim's pending input, the press ends the map won, and unbinding clears.
import { afterEach, describe, expect, it } from 'vitest';
import { battleConfig } from './battleSetup.ts';
import { createSim } from '../sim/index.ts';
import { forcedInput, forcedInputArmed } from '../ui/hud/forcedInputState.ts';
import { createHost } from './host.ts';
import {
  ARM_DELAY_MS,
  HUM_EVERY_MS,
  WAIT_LINE_MS,
  bindForcedInput,
  currentSeal,
  pressAccepted,
  pressForcedInput,
  sealKey,
  startSeal,
  waitSceneId,
  type SealDeps,
} from './forcedInput.ts';

/** A hand-cranked clock and the deps over it (timers fire as `advance` passes them). */
function fakeWorld() {
  let now = 1000;
  let nextId = 1;
  const timers = new Map<number, { at: number; fn: () => void; every: number | null }>();
  const log: string[] = [];
  let runs = true;
  const deps: SealDeps = {
    now: () => now,
    setTimeout(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn, every: null });
      return id;
    },
    clearTimeout: (id) => void timers.delete(id as number),
    setInterval(fn, ms) {
      const id = nextId++;
      timers.set(id, { at: now + ms, fn, every: ms });
      return id;
    },
    clearInterval: (id) => void timers.delete(id as number),
    playWaitLine: (map, input) => log.push(`line ${map} ${input}`),
    hum: () => log.push('hum'),
    press: (input) => log.push(`press ${input}`),
    clockRuns: () => runs,
  };
  const advance = (ms: number): void => {
    const end = now + ms;
    for (;;) {
      let due: [number, { at: number; fn: () => void; every: number | null }] | null = null;
      for (const entry of timers)
        if (entry[1].at <= end && (due === null || entry[1].at < due[1].at)) due = entry;
      if (due === null) break;
      const [id, t] = due;
      now = t.at;
      if (t.every === null) timers.delete(id);
      else t.at += t.every;
      t.fn();
    }
    now = end;
  };
  return {
    deps,
    log,
    advance,
    setRuns: (r: boolean) => {
      runs = r;
    },
    timers: () => timers.size,
  };
}

afterEach(() => {
  forcedInput.value = null;
  forcedInputArmed.value = false;
});

describe('pressAccepted: armed after 700 ms, then only a fresh down', () => {
  const shownAt = 0;
  it('a down before the button armed never presses, even released after', () => {
    expect(pressAccepted({ shownAt, downAt: ARM_DELAY_MS - 1, now: 5000 })).toBe(false);
    expect(pressAccepted({ shownAt, downAt: ARM_DELAY_MS, now: ARM_DELAY_MS })).toBe(true);
  });
  it("a key's auto-repeat never presses", () => {
    expect(pressAccepted({ shownAt, downAt: 3000, now: 3000, repeat: true })).toBe(false);
  });
  it("a click with no down behind it (a screen reader's) presses once armed", () => {
    expect(pressAccepted({ shownAt, downAt: null, now: ARM_DELAY_MS - 1 })).toBe(false);
    expect(pressAccepted({ shownAt, downAt: null, now: ARM_DELAY_MS })).toBe(true);
  });
});

const key = (code: string, mods: Partial<KeyboardEvent> = {}) => ({
  code,
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  ...mods,
});

describe('sealKey: the lock on the keys', () => {
  const free = { menuOrScene: false, onOther: false };
  it('Enter and Space press; on the Menu or the speaker they are that button’s own', () => {
    for (const c of ['Enter', 'NumpadEnter', 'Space']) {
      expect(sealKey(key(c), free)).toBe('press');
      expect(sealKey(key(c), { menuOrScene: false, onOther: true })).toBe('native');
    }
  });
  it('Esc (the pause menu), M (mute), Tab, and browser keys pass', () => {
    for (const c of ['Escape', 'KeyM', 'Tab', 'F5', 'F12'])
      expect(sealKey(key(c), free)).toBe('pass');
    expect(sealKey(key('KeyR', { ctrlKey: true }), free)).toBe('pass');
  });
  it('every game key is held back', () => {
    for (const c of ['KeyW', 'KeyF', 'KeyQ', 'KeyH', 'Digit1', 'ArrowLeft', 'KeyU', 'KeyS']) {
      expect(sealKey(key(c), free)).toBe('block');
    }
  });
  it('with the pause menu or a scene open, every key is theirs', () => {
    for (const c of ['Enter', 'Space', 'KeyW', 'Escape']) {
      expect(sealKey(key(c), { menuOrScene: true, onOther: false })).toBe('pass');
    }
  });
});

describe('startSeal: arming, the waiting line, and the hum', () => {
  it('arms after ARM_DELAY_MS; a press before, or from a down before, does nothing', () => {
    const w = fakeWorld();
    const seal = startSeal('a3_m03', 'seal', w.deps);
    expect(forcedInputArmed.value).toBe(false);
    expect(seal.keyPress(false)).toBe(false);
    seal.pointerDown();
    w.advance(ARM_DELAY_MS);
    expect(forcedInputArmed.value).toBe(true);
    // The click whose pointer went down before it armed.
    expect(seal.click()).toBe(false);
    expect(seal.keyPress(true)).toBe(false);
    expect(w.log.filter((l) => l.startsWith('press'))).toEqual([]);
    seal.pointerDown();
    expect(seal.click()).toBe(true);
    // Once: a second press issues nothing more.
    expect(seal.keyPress(false)).toBe(false);
    expect(w.log.filter((l) => l.startsWith('press'))).toEqual(['press seal']);
    seal.stop();
    expect(forcedInputArmed.value).toBe(false);
  });

  it('a fresh key-down after arming presses', () => {
    const w = fakeWorld();
    const seal = startSeal('a3_m03', 'seal', w.deps);
    w.advance(ARM_DELAY_MS + 50);
    expect(seal.keyPress(false)).toBe(true);
    seal.stop();
  });

  it('plays the waiting line once, WAIT_LINE_MS of real time after it shows', () => {
    const w = fakeWorld();
    const seal = startSeal('a3_m03', 'seal', w.deps);
    w.advance(WAIT_LINE_MS - 1);
    expect(w.log).not.toContain('line a3_m03 seal');
    w.advance(1);
    expect(w.log.filter((l) => l.startsWith('line'))).toEqual(['line a3_m03 seal']);
    expect(seal.waited).toBe(true);
    w.advance(WAIT_LINE_MS * 3);
    seal.clockChanged();
    expect(w.log.filter((l) => l.startsWith('line'))).toHaveLength(1);
    seal.stop();
  });

  it('the clock stops under the pause menu (or a hidden tab) and resumes where it was', () => {
    const w = fakeWorld();
    const seal = startSeal('a3_m03', 'seal', w.deps);
    w.advance(15_000);
    w.setRuns(false);
    seal.clockChanged();
    w.advance(60_000);
    expect(seal.waitedMs()).toBe(15_000);
    expect(w.log).not.toContain('line a3_m03 seal');
    w.setRuns(true);
    seal.clockChanged();
    w.advance(4_999);
    expect(w.log).not.toContain('line a3_m03 seal');
    w.advance(1);
    expect(w.log).toContain('line a3_m03 seal');
    seal.stop();
  });

  it('a press before 20 s means the line never plays; stop clears every timer', () => {
    const w = fakeWorld();
    const seal = startSeal('a3_m03', 'seal', w.deps);
    w.advance(ARM_DELAY_MS);
    seal.keyPress(false);
    seal.stop();
    expect(w.timers()).toBe(0);
    w.advance(WAIT_LINE_MS * 2);
    expect(w.log).not.toContain('line a3_m03 seal');
  });

  it('the hum strikes as it shows and every HUM_EVERY_MS until it stops', () => {
    const w = fakeWorld();
    const seal = startSeal('a3_m03', 'seal', w.deps);
    expect(w.log.filter((l) => l === 'hum')).toHaveLength(1);
    w.advance(HUM_EVERY_MS * 3);
    expect(w.log.filter((l) => l === 'hum')).toHaveLength(4);
    seal.stop();
    w.advance(HUM_EVERY_MS * 3);
    expect(w.log.filter((l) => l === 'hum')).toHaveLength(4);
  });

  it("the waiting line's scene is the map's `<map>_cue_<input>_wait`", () => {
    expect(waitSceneId('a3_m03', 'seal')).toBe('a3_m03_cue_seal_wait');
  });
});

describe('bindForcedInput on the Holdout dev range', () => {
  it('follows the pending input, presses through the sim once armed, and ends the map won', () => {
    const cfg = { ...battleConfig('dev_holdout', 1), scriptFlags: { door_choice: 'convoy' } };
    const host = createHost(createSim(cfg));
    const w = fakeWorld();
    const deps: SealDeps = {
      ...w.deps,
      press: (id) => host.sim.enqueue({ type: 'scriptInput', id }),
    };
    const off = bindForcedInput(host, deps);
    expect(forcedInput.value).toBeNull();
    host.sim.enqueue({ type: 'callWave' });
    for (let t = 0; t < 60 * 600 && host.sim.state.pendingInput === null; t++) {
      if (host.sim.state.schedule.phase === 'countdown') host.sim.enqueue({ type: 'callWave' });
      host.fastForward(1);
    }
    expect(host.sim.state.pendingInput).toBe('seal');
    expect(forcedInput.value).toBe('seal');
    expect(currentSeal()?.input).toBe('seal');
    // Not armed yet: a screen reader's click does nothing.
    expect(pressForcedInput()).toBe(false);
    w.advance(ARM_DELAY_MS);
    expect(pressForcedInput()).toBe(true);
    host.fastForward(1);
    expect(host.sim.state.outcome).toBe('won');
    expect(forcedInput.value).toBeNull();
    expect(currentSeal()).toBeNull();
    off();
  });

  it('binds onto an input already pending, and unbinding clears it', () => {
    const cfg = { ...battleConfig('dev_holdout', 1), scriptFlags: { door_choice: 'convoy' } };
    const host = createHost(createSim(cfg));
    host.sim.enqueue({ type: 'callWave' });
    for (let t = 0; t < 60 * 600 && host.sim.state.pendingInput === null; t++) {
      if (host.sim.state.schedule.phase === 'countdown') host.sim.enqueue({ type: 'callWave' });
      host.fastForward(1);
    }
    const w = fakeWorld();
    const off = bindForcedInput(host, w.deps);
    expect(forcedInput.value).toBe('seal');
    off();
    expect(forcedInput.value).toBeNull();
    expect(forcedInputArmed.value).toBe(false);
    expect(w.timers()).toBe(0);
  });
});
