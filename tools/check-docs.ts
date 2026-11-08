// Docs check: relative links resolve, #anchors match headings, docs/README.md indexes every doc.
// Plain Node (>=22.6 via --experimental-strip-types; native from 22.18), no dependencies.
// Spec: docs/tech/conventions.md#docs-check-npm-run-checkdocs
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

/** Remove fenced code blocks (up to 3 spaces of indent; closes on a fence of the same char, at least as long). */
function stripFences(md: string): string {
  const out: string[] = [];
  let fence: { ch: string; len: number } | null = null;
  for (const line of md.split('\n')) {
    const m = /^ {0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      if (m && m[1][0] === fence.ch && m[1].length >= fence.len && line.trim() === m[1]) fence = null;
      out.push('');
    } else if (m) {
      fence = { ch: m[1][0], len: m[1].length };
      out.push('');
    } else {
      out.push(line);
    }
  }
  return out.join('\n');
}

/** Remove inline code spans of any backtick-run length. */
function stripInline(md: string): string {
  return md.replace(/(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)/g, '');
}

/** GitHub-style heading slug. Link syntax reduces to its text; marks (\p{M}) are kept. */
function slug(heading: string): string {
  return heading
    .trim()
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

const anchorCache = new Map<string, Set<string>>();
function anchorsOf(file: string): Set<string> {
  let set = anchorCache.get(file);
  if (set) return set;
  set = new Set();
  const counts = new Map<string, number>();
  for (const m of stripFences(readFileSync(file, 'utf8')).matchAll(/^ {0,3}#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slug(m[1]);
    const n = counts.get(base) ?? 0;
    counts.set(base, n + 1);
    set.add(n === 0 ? base : `${base}-${n}`);
  }
  anchorCache.set(file, set);
  return set;
}

/** Every link target in a doc: inline [t](u), reference definitions [r]: u, and <autolinks>. */
function linkTargets(body: string): string[] {
  const targets: string[] = [];
  for (const m of body.matchAll(/\[[^\]]*\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g)) targets.push(m[1]);
  for (const m of body.matchAll(/^ {0,3}\[[^\]]+\]:\s*<?(\S+?)>?(?:\s+["'(].*)?$/gm)) targets.push(m[1]);
  for (const m of body.matchAll(/<([^\s<>]+\.md(?:#[^\s<>]*)?)>/g)) targets.push(m[1]);
  return targets;
}

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
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
  const body = stripInline(stripFences(readFileSync(file, 'utf8')));
  for (const target of linkTargets(body)) {
    if (/^[a-z][a-z0-9+.-]*:/i.test(target)) continue; // external (http:, mailto:, ...)
    const hash = target.indexOf('#');
    const pathPart = hash === -1 ? target : target.slice(0, hash);
    const anchor = hash === -1 ? '' : target.slice(hash + 1);
    const decoded = safeDecode(pathPart);
    if (decoded === null) {
      errors.push(`${rel}: malformed link → ${target}`);
      continue;
    }
    // Root-relative links (/CLAUDE.md) resolve against the repo root, as on GitHub.
    const base = decoded.startsWith('/') ? ROOT : dirname(file);
    const targetFile = decoded ? resolve(base, decoded.replace(/^\/+/, '')) : file;
    if (!existsSync(targetFile)) {
      errors.push(`${rel}: broken link → ${target}`);
      continue;
    }
    if (anchor && targetFile.endsWith('.md') && !anchorsOf(targetFile).has(anchor.toLowerCase())) {
      errors.push(`${rel}: missing anchor → ${target}`);
    }
  }
}

// docs/README.md must list every doc under docs/ (listed-but-missing is covered by the link check).
const readme = join(ROOT, 'docs', 'README.md');
if (!existsSync(readme)) {
  errors.push('docs/README.md is missing');
} else {
  const listed = new Set(
    linkTargets(stripInline(stripFences(readFileSync(readme, 'utf8'))))
      .map((t) => t.split('#')[0])
      .filter(Boolean)
      .map((t) => resolve(dirname(readme), t)),
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
