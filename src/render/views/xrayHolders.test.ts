// T664: two ally views showing the same frame share one x-ray texture; one freeing it leaves it
// for the other, and the last to let go removes it.
import { describe, expect, it } from 'vitest';
import { holdXray, releaseXray } from './xrayHolders.ts';

function fakeTextures(): {
  exists(k: string): boolean;
  remove(k: string): void;
  keys: Set<string>;
} {
  const keys = new Set<string>();
  return { keys, exists: (k) => keys.has(k), remove: (k) => keys.delete(k) };
}

describe('x-ray texture sharing', () => {
  it('removes a shared texture only when its last holder lets go', () => {
    const t = fakeTextures();
    t.keys.add('overlay.xray.a');
    holdXray(t, 'overlay.xray.a');
    holdXray(t, 'overlay.xray.a');
    releaseXray(t, 'overlay.xray.a');
    expect(t.exists('overlay.xray.a')).toBe(true);
    releaseXray(t, 'overlay.xray.a');
    expect(t.exists('overlay.xray.a')).toBe(false);
  });

  it('keeps each texture manager apart, and frees an unheld key at once', () => {
    const a = fakeTextures();
    const b = fakeTextures();
    a.keys.add('k');
    b.keys.add('k');
    holdXray(a, 'k');
    holdXray(b, 'k');
    releaseXray(b, 'k');
    expect([a.exists('k'), b.exists('k')]).toEqual([true, false]);
    const c = fakeTextures();
    c.keys.add('k');
    releaseXray(c, 'k');
    expect(c.exists('k')).toBe(false);
  });
});
