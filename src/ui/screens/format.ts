// Number formatting for screen copy. Locale-independent on purpose: the counter always reads
// "1,234,567" (story-runtime.md § Text substitution, `{pests_processed}`).

/** A non-negative integer with comma thousands separators ("1,234,567"). */
export function formatCount(n: number): string {
  const whole = Math.max(0, Math.trunc(n));
  return String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * The Act I results counter line (story/style-guide.md §2, design/core-loop.md §6.2). The per-act
 * lines arrive with the presentation dials (`content/presentation.ts`) once M1's single act grows.
 */
export function pestsProcessedLine(n: number): string {
  return `PESTS PROCESSED: ${formatCount(n)} ★ Top 5% of Technicians!`;
}
