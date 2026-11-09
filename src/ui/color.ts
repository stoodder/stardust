// Master palette names as CSS color tokens (theme.css defines `--sd-<ramp>-<step>` for each).

/** A colour token for a master palette name (`teal.4` → `var(--sd-teal-4)`). */
export function colorVar(name: string): string {
  return `var(--sd-${name.replaceAll('.', '-')})`;
}
