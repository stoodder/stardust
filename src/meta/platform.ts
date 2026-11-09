// The few Web platform primitives the export codec needs: UTF-8 text coding and raw-deflate
// streams. They exist in every target browser and in Node 22 (so Vitest runs the real codec),
// but meta/ is type-checked without the DOM lib, so they're looked up here behind narrow
// structural types instead of being declared globally (which would leak them into the sim).

interface ByteReader {
  read(): Promise<{ done: boolean; value?: Uint8Array }>;
  cancel(reason?: unknown): Promise<void>;
}
interface ByteWriter {
  write(chunk: Uint8Array): Promise<void>;
  close(): Promise<void>;
}
interface ByteTransform {
  readonly readable: { getReader(): ByteReader };
  readonly writable: { getWriter(): ByteWriter };
}

export interface WebCodec {
  readonly TextEncoder: new () => { encode(text: string): Uint8Array };
  readonly TextDecoder: new (
    label: 'utf-8',
    options: { fatal: boolean },
  ) => { decode(bytes: Uint8Array): string };
  readonly CompressionStream: new (format: 'deflate-raw') => ByteTransform;
  readonly DecompressionStream: new (format: 'deflate-raw') => ByteTransform;
}

/** The platform's codec primitives. Throws if the runtime lacks one (no target runtime does). */
export function webCodec(): WebCodec {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- feature lookup; each member is checked below
  const g = globalThis as unknown as Partial<WebCodec>;
  const { TextEncoder, TextDecoder, CompressionStream, DecompressionStream } = g;
  if (!TextEncoder || !TextDecoder || !CompressionStream || !DecompressionStream) {
    throw new Error('this runtime lacks TextEncoder/TextDecoder or (De)CompressionStream');
  }
  return { TextEncoder, TextDecoder, CompressionStream, DecompressionStream };
}

/** Pipes `bytes` through a transform, stopping (and returning null) past `maxBytes` of output. */
export async function pipeCapped(
  transform: ByteTransform,
  bytes: Uint8Array,
  maxBytes: number,
): Promise<Uint8Array | null> {
  const writer = transform.writable.getWriter();
  // Write and read concurrently: awaiting the write first can deadlock on backpressure. A failed
  // or cancelled write surfaces through the reader, so its own rejection is dropped here.
  const writing = writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => undefined);
  const reader = transform.readable.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    // oxlint-disable-next-line no-await-in-loop -- a stream is read chunk by chunk, in order
    const { done, value } = await reader.read();
    if (done) break;
    if (value === undefined) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      // oxlint-disable-next-line no-await-in-loop -- leaves the loop right after
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  await writing;
  const out = new Uint8Array(total);
  let at = 0;
  for (const chunk of chunks) {
    out.set(chunk, at);
    at += chunk.byteLength;
  }
  return out;
}
