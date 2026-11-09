// A speaker's colour as CSS (speakers.ts names master palette colours; theme.css defines tokens).
import { colorVar } from '../color.ts';

/** `color` as a CSS colour, white where the theme has no token for it yet. */
export function plateColor(color: string): string {
  return `${colorVar(color).slice(0, -1)}, var(--sd-white-1))`;
}
