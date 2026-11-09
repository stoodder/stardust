import { describe, expect, it } from 'vitest';
import { ALT_BINDINGS, BINDINGS, bindingFor, SHIFT_BINDINGS } from './keys.ts';
import {
  toggleHoldFireAll,
  toggleHoldFireSelected,
  toggleSpareRunnersAll,
} from './commands.ts';

const key = (code: string, mods: { shift?: boolean; alt?: boolean; ctrl?: boolean } = {}) => ({
  code,
  shiftKey: mods.shift ?? false,
  altKey: mods.alt ?? false,
  ctrlKey: mods.ctrl ?? false,
  metaKey: false,
});

describe('bindingFor: the Hold Fire keys (core-loop §4)', () => {
  it('H holds the selected tower, Shift+H every tower, Alt+H spares runners on every tower', () => {
    expect(bindingFor(key('KeyH'))).toBe(toggleHoldFireSelected);
    expect(bindingFor(key('KeyH', { shift: true }))).toBe(toggleHoldFireAll);
    expect(bindingFor(key('KeyH', { alt: true }))).toBe(toggleSpareRunnersAll);
  });

  it('Shift with no chord of its own acts as the plain key; Alt with none does nothing', () => {
    expect(bindingFor(key('KeyU', { shift: true }))).toBe(BINDINGS.KeyU);
    expect(bindingFor(key('Space', { shift: true }))).toBe(BINDINGS.Space);
    expect(bindingFor(key('KeyU', { alt: true }))).toBeNull();
    expect(bindingFor(key('Enter', { alt: true }))).toBeNull();
  });

  it('leaves Ctrl chords to the browser', () => {
    expect(bindingFor(key('KeyH', { ctrl: true }))).toBeNull();
    expect(bindingFor(key('KeyH', { ctrl: true, shift: true }))).toBeNull();
  });

  it('every chord key also has a plain binding or is Alt-only by design', () => {
    for (const code of Object.keys(SHIFT_BINDINGS)) expect(Object.hasOwn(BINDINGS, code)).toBe(true);
    expect(Object.keys(ALT_BINDINGS)).toEqual(['KeyH']);
  });
});
