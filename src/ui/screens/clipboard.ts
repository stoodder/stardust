// Copying a code or raw save data to the clipboard. The Clipboard API can be missing or refused
// (insecure origin, permissions, headless browsers), so this never throws: false means the
// player copies it by hand from the selected field.

/** Copies `text`; resolves true on success. */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined' || navigator.clipboard === undefined) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
