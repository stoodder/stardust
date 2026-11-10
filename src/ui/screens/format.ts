// Number formatting for screen copy. Locale-independent on purpose: the counter always reads
// "1,234,567" (story-runtime.md § Text substitution, `{pests_processed}`).

/** A non-negative integer with comma thousands separators ("1,234,567"). */
export function formatCount(n: number): string {
  const whole = Math.max(0, Math.trunc(n));
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
