// The HUD's words for things the app also says (screen-reader announcements; D059).
import type { TargetPriority } from '../../content/types.ts';

/** Each targeting priority's name in the tower panel and its announcement. */
export const PRIORITY_LABEL: Readonly<Record<TargetPriority, string>> = {
  first: 'First',
  last: 'Last',
  strong: 'Strong',
  close: 'Close',
};
