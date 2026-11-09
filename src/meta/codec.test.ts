import { describe, expect, it } from 'vitest';
import saveV0 from './__fixtures__/save.v0.json' with { type: 'json' };
import {
  CODE_LIMITS,
  codeChecksum,
  exportCode,
  fromBase64Url,
  importCode,
  toBase64Url,
} from './codec.ts';
import { pipeCapped, webCodec } from './platform.ts';
import { serializeSave } from './save.ts';
import type { SaveData } from './saveData.ts';
import { createNewSave } from './saveData.ts';

/** Packs arbitrary bytes into a well-formed code (valid checksum), whatever they contain. */
async function packCode(version: number, payload: Uint8Array | string): Promise<string> {
  const web = webCodec();
  const bytes = typeof payload === 'string' ? new web.TextEncoder().encode(payload) : payload;
  const packed = await pipeCapped(new web.CompressionStream('deflate-raw'), bytes, Infinity);
  if (packed === null) throw new Error('compression failed');
  return withChecksum(`SD${version}-${toBase64Url(packed)}`);
}

function withChecksum(head: string): string {
  return `${head}-${codeChecksum(head)}`;
}

function sample(): SaveData {
  const save = createNewSave();
  save.campaign.maps.a1_m01 = {
    completed: true,
    medals: ['victory', 'perfect_core'],
    bestMeter: 20,
  };
  save.currencies = { stardust: 130, intel: 4 };
  save.unlocks.towers.push('sprinkler');
  save.story.codex = { nibbler: ['original'] };
  save.stats = { pestsProcessed: 321, runs: 4 };
  return save;
}

async function importError(code: string): Promise<string> {
  const r = await importCode(code);
  return r.ok ? 'ok' : r.code;
}

describe('SD export/import codes', () => {
  it('round-trips a save losslessly', async () => {
    const code = await exportCode(sample(), 1_793_000_000_000);
    expect(code).toMatch(/^SD1-[A-Za-z0-9_-]+-[0-9a-f]{4}$/);
    expect(await importCode(code)).toEqual({
      ok: true,
      save: sample(),
      savedAt: 1_793_000_000_000,
      migratedFrom: null,
    });
  });

  it('keeps a typical code short enough to paste', async () => {
    expect((await exportCode(sample(), 0)).length).toBeLessThan(1000);
  });

  it('tolerates whitespace and line breaks from pasting', async () => {
    const code = await exportCode(sample(), 5);
    const pasted = `  ${code.slice(0, 20)}\n${code.slice(20, 40)} \r\n${code.slice(40)}\t`;
    expect((await importCode(pasted)).ok).toBe(true);
  });

  it('refuses to export an invalid save', async () => {
    const bad = createNewSave();
    bad.currencies.intel = -1;
    await expect(exportCode(bad, 0)).rejects.toThrow(/data\.currencies\.intel/);
  });

  it('rejects text that is not a code', async () => {
    const texts = ['', 'hello', 'SD1-abc', 'SD1-ab$c-1234', 'XX1-abcd-1234', 'SD01-abcd-1234'];
    const codes = await Promise.all(texts.map(importError));
    expect(codes).toEqual(texts.map(() => 'format'));
  });

  it('rejects a bad checksum', async () => {
    const code = await exportCode(sample(), 0);
    const last = code.at(-1) === '0' ? '1' : '0';
    expect(await importError(code.slice(0, -1) + last)).toBe('checksum');
    // A changed body with the old checksum fails too.
    const body = code.charAt(10) === 'A' ? 'B' : 'A';
    expect(await importError(code.slice(0, 10) + body + code.slice(11))).toBe('checksum');
  });

  it('rejects an unknown (newer) version before unpacking', async () => {
    const code = await packCode(2, serializeSave(sample(), 0).replace('"v":1', '"v":2'));
    expect(await importCode(code)).toMatchObject({ ok: false, code: 'too_new' });
  });

  it('migrates an old-version code', async () => {
    const r = await importCode(await packCode(0, JSON.stringify(saveV0)));
    expect(r).toMatchObject({ ok: true, migratedFrom: 0 });
    if (r.ok) expect(r.save.stats).toEqual({ pestsProcessed: 0, runs: 0 });
  });

  it('rejects a prefix that disagrees with the data version', async () => {
    expect(await importError(await packCode(1, JSON.stringify(saveV0)))).toBe('format');
  });

  it('caps the pasted code length before any work', async () => {
    const huge = `SD1-${'A'.repeat(CODE_LIMITS.maxCodeChars)}-0000`;
    expect(await importCode(huge)).toMatchObject({ ok: false, code: 'too_large' });
  });

  it('stops a decompression bomb at the unpacked-size cap', async () => {
    const bomb = new Uint8Array(CODE_LIMITS.maxJsonBytes * 8).fill(0x20);
    const code = await packCode(1, bomb);
    expect(code.length).toBeLessThan(CODE_LIMITS.maxCodeChars);
    expect(await importCode(code)).toMatchObject({ ok: false, code: 'too_large' });
  });

  it('unpacks a payload of exactly the cap', async () => {
    const atCap = new Uint8Array(CODE_LIMITS.maxJsonBytes).fill(0x20);
    // Whitespace JSON is not a save, but it unpacks: the failure is the parse, not the cap.
    expect(await importError(await packCode(1, atCap))).toBe('json');
  });

  it('rejects a body that does not unpack, or unpacks to bad UTF-8', async () => {
    const junk = withChecksum(`SD1-${toBase64Url(new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x00]))}`);
    expect(await importError(junk)).toBe('corrupt');
    expect(await importError(await packCode(1, new Uint8Array([0x7b, 0xff, 0xfe])))).toBe(
      'corrupt',
    );
  });

  it('rejects a body that is not base64url', async () => {
    expect(await importError(withChecksum('SD1-A'))).toBe('format');
  });

  it('rejects unpacked text that is not JSON', async () => {
    expect(await importError(await packCode(1, 'not json'))).toBe('json');
  });

  it('rejects well-formed codes whose save is malformed, with the schema errors', async () => {
    const tampered = serializeSave(sample(), 0).replace('"intel":4', '"intel":-4');
    const r = await importCode(await packCode(1, tampered));
    expect(r).toMatchObject({ ok: false, code: 'invalid' });
    if (!r.ok) expect(r.errors.join()).toContain('save.data.currencies.intel');
  });
});

describe('base64url', () => {
  it('round-trips every length and byte value', () => {
    for (let n = 0; n < 40; n++) {
      const bytes = Uint8Array.from({ length: n }, (_, i) => (i * 97 + n * 31) & 0xff);
      const text = toBase64Url(bytes);
      expect(text).toMatch(/^[A-Za-z0-9_-]*$/);
      expect(text.length).toBe(Math.ceil((n * 8) / 6));
      expect(fromBase64Url(text)).toEqual(bytes);
    }
    const all = Uint8Array.from({ length: 256 }, (_, i) => i);
    expect(fromBase64Url(toBase64Url(all))).toEqual(all);
  });

  it('rejects bad lengths, foreign characters, and nonzero tail bits', () => {
    expect(fromBase64Url('A')).toBeNull();
    expect(fromBase64Url('AB+C')).toBeNull();
    expect(fromBase64Url('AB=')).toBeNull();
    expect(fromBase64Url('AB')).toBeNull(); // 'B' leaves tail bits set
    expect(fromBase64Url('AA')).toEqual(new Uint8Array([0]));
  });
});
