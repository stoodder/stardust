// The text pipeline's one substitution for Silkscreen (D059): Silkscreen draws "&" like "$", so
// QUILL's first line read "Logistics $ Lethality". Every player-facing string the UI draws goes
// through `silkText` on its way to the screen (the HUD's briefing, notices, and radio; Results'
// debrief; the shelves; the loadout screen; the Shift board), so "&" always reads "and".

/** `text` as Silkscreen should draw it: each "&" becomes "and" ("R&D" → "R and D"). */
export function silkText(text: string): string {
  return text.includes('&') ? text.replace(/ *& */g, ' and ') : text;
}
