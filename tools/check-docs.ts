// Docs check: relative links resolve, #anchors match headings, docs/README.md indexes every doc.
// Plain Node (>=22.18, native type stripping), no dependencies. Spec: docs/tech/conventions.md#docs-check-npm-run-check-docs
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : name.endsWith('.md') ? [p] : [];
  });
}

/** Strip fenced code blocks (headings inside them aren't real). */
function stripFences(md: string): string {
  return md.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
}
/** Also strip inline code so example links aren't checked. */
function stripCode(md: string): string {
  return stripFences(md).replace(/`[^`\n]*`/g, '');
}

/** GitHub-style heading slug. */
function slug(heading: string): string {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

const anchorCache = new Map<string, Set<string>>();
function anchorsOf(file: string): Set<string> {
  let set = anchorCache.get(file);
  if (set) return set;
  set = new Set();
  const counts = new Map<string, number>();
  for (const m of stripFences(readFileSync(file, 'utf8')).matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(m[1]);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    set.add(n === 0 ? base : `${base}-${n}`);
  }
  anchorCache.set(file, set);
  return set;
}

const files = [
  ...walk(join(ROOT, 'docs')),
  join(ROOT, 'CLAUDE.md'),
  join(ROOT, 'tasks.md'),
  ...walk(join(ROOT, '.claude', 'agents')),
].filter(existsSync);

const errors: string[] = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  const body = stripCode(readFileSync(file, 'utf8'));
  for (const m of body.matchAll(/\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const target = m[1];
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // external (http:, mailto:, ...)
    const [pathPart, anchor] = target.split('#');
    const targetFile = pathPart ? resolve(dirname(file), decodeURIComponent(pathPart)) : file;
    if (!existsSync(targetFile)) {
      errors.push(`${rel}: broken link → ${target}`);
      continue;
    }
    if (anchor && targetFile.endsWith('.md') && !anchorsOf(targetFile).has(anchor.toLowerCase())) {
      errors.push(`${rel}: missing anchor → ${target}`);
    }
  }
}

// docs/README.md must list every doc under docs/ (and only existing ones — covered by link check).
const readme = join(ROOT, 'docs', 'README.md');
if (!existsSync(readme)) {
  errors.push('docs/README.md is missing');
} else {
  const listed = new Set(
    [...stripCode(readFileSync(readme, 'utf8')).matchAll(/\]\(([^)#\s]+)/g)].map((m) =>
      resolve(dirname(readme), m[1]),
    ),
  );
  for (const doc of walk(join(ROOT, 'docs'))) {
    if (doc !== readme && !listed.has(doc)) errors.push(`docs/README.md does not list ${relative(ROOT, doc)}`);
  }
}

if (errors.length) {
  console.error(`check:docs — ${errors.length} problem(s):\n` + errors.map((e) => `  ✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`check:docs — OK (${files.length} files)`);
