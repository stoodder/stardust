import { describe, expect, it } from 'vitest';
import { createBus } from './bus.ts';

type Ev = { type: 'a'; n: number } | { type: 'b'; s: string };

describe('createBus', () => {
  it('delivers events to handlers of their type, in subscription order', () => {
    const bus = createBus<Ev>();
    const seen: string[] = [];
    bus.on('a', (e) => seen.push(`a1:${e.n}`));
    bus.on('b', (e) => seen.push(`b:${e.s}`));
    bus.on('a', (e) => seen.push(`a2:${e.n}`));
    bus.emit({ type: 'a', n: 1 });
    bus.emit({ type: 'b', s: 'x' });
    expect(seen).toEqual(['a1:1', 'a2:1', 'b:x']);
  });

  it('off and the returned unsubscribe remove one handler', () => {
    const bus = createBus<Ev>();
    let count = 0;
    const h = (): void => {
      count++;
    };
    const unsubscribe = bus.on('a', h);
    bus.on('a', h);
    unsubscribe();
    bus.emit({ type: 'a', n: 0 });
    expect(count).toBe(1);
    bus.off('a', h);
    bus.emit({ type: 'a', n: 0 });
    expect(count).toBe(1);
  });

  it('ignores events nobody listens to, and clear removes everything', () => {
    const bus = createBus<Ev>();
    let count = 0;
    bus.on('b', () => count++);
    bus.emit({ type: 'a', n: 0 });
    bus.clear();
    bus.emit({ type: 'b', s: '' });
    expect(count).toBe(0);
  });
});
