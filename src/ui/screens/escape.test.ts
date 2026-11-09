import { describe, expect, it } from 'vitest';
import { pushEscape, runEscape } from './escape.ts';

describe('menu Esc handlers', () => {
  it('runs the newest first and falls through when it has nothing to close', () => {
    const seen: string[] = [];
    const offScreen = pushEscape(() => {
      seen.push('screen');
      return true;
    });
    let panelOpen = true;
    const offPanel = pushEscape(() => {
      seen.push('panel');
      if (!panelOpen) return false;
      panelOpen = false;
      return true;
    });
    expect(runEscape()).toBe(true);
    expect(seen).toEqual(['panel']);
    expect(runEscape()).toBe(true);
    expect(seen).toEqual(['panel', 'panel', 'screen']);
    offPanel();
    offScreen();
    expect(runEscape()).toBe(false);
  });
});
