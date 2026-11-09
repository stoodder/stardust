// SD export/import codes (meta-runtime.md § Export and import codes):
//   SD<v>-<base64url(deflate-raw(save JSON))>-<checksum>
// `<v>` is the save's schema version and `<checksum>` is 4 lowercase hex digits: the low 16 bits
// of FNV-1a over everything before the last '-'. Import is hostile-input safe: the code length is
// capped before any work, the checksum and version are checked before decompressing, and the
// decompressed size is capped while streaming (a decompression bomb stops at the cap).
import { fnv1a32 } from '../shared/hash.ts';
import { pipeCapped, webCodec } from './platform.ts';
import type { SaveProblemCode } from './save.ts';
import { MAX_SAVE_JSON_CHARS, decodeEnvelope, serializeSave } from './save.ts';
import type { KnownIds, SaveData } from './saveData.ts';
import { LIVE_KNOWN_IDS, SAVE_VERSION } from './saveData.ts';
import { isPlainRecord, validateSave } from './validate.ts';

export const CODE_LIMITS = {
  /** Longest pasted code accepted, before whitespace is stripped. */
  maxCodeChars: 64 * 1024,
  /** Largest decompressed payload, in bytes. */
  maxJsonBytes: MAX_SAVE_JSON_CHARS,
} as const;

const CODE_SHAPE = /^SD(0|[1-9]\d{0,5})-([A-Za-z0-9_-]+)-([0-9a-f]{4})$/;

export type ImportProblemCode =
  'too_large' | 'format' | 'checksum' | 'corrupt' | Exclude<SaveProblemCode, 'missing'>;

export type ImportResult =
  | { ok: true; save: SaveData; savedAt: number; migratedFrom: number | null }
  | { ok: false; code: ImportProblemCode; message: string; errors: readonly string[] };

/** The 4-hex-digit checksum of a code's head (`SD<v>-<body>`). */
export function codeChecksum(head: string): string {
  return (fnv1a32(head) & 0xffff).toString(16).padStart(4, '0');
}

/** Encodes a valid save as an SD code. Throws on an invalid save (a caller bug, not player input). */
export async function exportCode(
  data: SaveData,
  savedAt: number,
  known: KnownIds = LIVE_KNOWN_IDS,
): Promise<string> {
  const checked = validateSave(data, known);
  if (!checked.ok) throw new Error(`exportCode: invalid save: ${checked.errors.join('; ')}`);
  const web = webCodec();
  const json = new web.TextEncoder().encode(serializeSave(checked.value, savedAt));
  const packed = await pipeCapped(new web.CompressionStream('deflate-raw'), json, Infinity);
  if (packed === null) throw new Error('exportCode: compression failed');
  const head = `SD${SAVE_VERSION}-${toBase64Url(packed)}`;
  return `${head}-${codeChecksum(head)}`;
}

function fail(
  code: ImportProblemCode,
  message: string,
  errors: readonly string[] = [],
): ImportResult {
  return { ok: false, code, message, errors };
}

/**
 * Decodes an SD code into a migrated, validated save. Never throws on bad input. The caller
 * confirms with the player before writing the result to a slot.
 */
export async function importCode(
  input: string,
  known: KnownIds = LIVE_KNOWN_IDS,
): Promise<ImportResult> {
  if (input.length > CODE_LIMITS.maxCodeChars) {
    return fail('too_large', `codes are at most ${CODE_LIMITS.maxCodeChars} characters`);
  }
  const code = input.replace(/\s+/g, '');
  const match = CODE_SHAPE.exec(code);
  if (match === null) return fail('format', 'this is not a Stardust save code');
  const [, versionText = '', body = '', checksum = ''] = match;
  const head = code.slice(0, code.length - checksum.length - 1);
  if (codeChecksum(head) !== checksum) {
    return fail('checksum', 'the code is damaged (checksum mismatch); copy it again in full');
  }
  const version = Number(versionText);
  if (version > SAVE_VERSION) {
    return fail(
      'too_new',
      `this code is version ${version}, made by a newer build (this build reads up to ${SAVE_VERSION})`,
    );
  }
  const packed = fromBase64Url(body);
  if (packed === null) return fail('format', 'the code body is not valid base64url');

  let text: string;
  try {
    const web = webCodec();
    const json = await pipeCapped(
      new web.DecompressionStream('deflate-raw'),
      packed,
      CODE_LIMITS.maxJsonBytes,
    );
    if (json === null) {
      return fail('too_large', `the code unpacks to more than ${CODE_LIMITS.maxJsonBytes} bytes`);
    }
    text = new web.TextDecoder('utf-8', { fatal: true }).decode(json);
  } catch {
    return fail('corrupt', 'the code is damaged (it does not unpack)');
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return fail('json', 'the code is damaged (its data is not JSON)');
  }
  const v: unknown = isPlainRecord(raw) ? raw['v'] : undefined;
  if (v !== version) {
    return fail(
      'format',
      `the code's prefix says version ${version} but its data says ${String(v)}`,
    );
  }
  const decoded = decodeEnvelope(raw, known);
  if (!decoded.ok) {
    const p = decoded.problem;
    return fail(p.code === 'missing' ? 'invalid' : p.code, p.message, p.errors);
  }
  return {
    ok: true,
    save: decoded.envelope.data,
    savedAt: decoded.envelope.savedAt,
    migratedFrom: decoded.migratedFrom,
  };
}

// ── base64url (RFC 4648 §5, no padding) ──────────────────────────────────────────────────────

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const DECODE = new Map<string, number>(ALPHABET.split('').map((ch, i) => [ch, i]));

export function toBase64Url(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i] ?? 0;
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    const n = (b0 << 16) | (b1 << 8) | b2;
    const chars = Math.min(4, Math.ceil(((bytes.length - i) * 8) / 6));
    for (let k = 0; k < chars; k++) out += ALPHABET.charAt((n >>> (18 - 6 * k)) & 63);
  }
  return out;
}

/** Decodes unpadded base64url; null on a bad length, a foreign character, or nonzero tail bits. */
export function fromBase64Url(text: string): Uint8Array | null {
  if (text.length % 4 === 1) return null;
  const out = new Uint8Array(Math.floor((text.length * 6) / 8));
  let acc = 0;
  let bits = 0;
  let at = 0;
  for (let i = 0; i < text.length; i++) {
    const v = DECODE.get(text.charAt(i));
    if (v === undefined) return null;
    acc = ((acc << 6) | v) & 0xffffff;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (acc >>> bits) & 0xff;
    }
  }
  if (bits > 0 && (acc & ((1 << bits) - 1)) !== 0) return null;
  return out;
}
