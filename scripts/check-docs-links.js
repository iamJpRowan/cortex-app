#!/usr/bin/env node

/**
 * Check that relative links in docs/*.md resolve to existing files.
 * Run: npm run check:docs-links  (or node scripts/check-docs-links.js)
 * Exits 0 if all links resolve, 1 if any are broken.
 *
 * Used in pre-commit when any staged file is under docs/. Safe to add to CI.
 *
 * Known intentional/missing links (excluded from failure):
 * - TEMPLATE.md → ../other-item.md (placeholder for new backlog items)
 * - ui-layout-framework.md → basic-layout-structure.md (prerequisite doc TBD)
 * - 2025-01-21 devlog → langchain-integration.md (archived backlog item)
 */

const fs = require('fs')
const path = require('path')

const DOCS_DIR = path.resolve(__dirname, '../docs')

// Pairs of (source file path relative to cwd, link href) to ignore
const IGNORE = [
  ['docs/product/backlog/TEMPLATE.md', '../other-item.md'],
  ['docs/product/backlog/ui-layout-framework.md', './basic-layout-structure.md'],
  [
    'docs/product/devlogs/2025-01-21-langchain-integration.md',
    '../backlog/langchain-integration.md',
  ],
]

function* walkMd(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '.git') yield* walkMd(full)
    } else if (e.isFile() && e.name.endsWith('.md')) {
      yield full
    }
  }
}

// Match ](path) or ](path "title") — capture the path
const LINK_RE = /\]\(([^)]+)\)/g

function checkFile(filePath) {
  const dir = path.dirname(filePath)
  const root = path.relative(DOCS_DIR, dir)
  const content = fs.readFileSync(filePath, 'utf8')
  const issues = []
  let m
  LINK_RE.lastIndex = 0
  while ((m = LINK_RE.exec(content)) !== null) {
    const href = m[1].trim().replace(/\s+["'].*$/, '') // drop "title" or 'title'
    if (
      href.startsWith('#') ||
      href.startsWith('http://') ||
      href.startsWith('https://') ||
      href.startsWith('mailto:')
    )
      continue
    const [filePart] = href.split('#')
    if (!filePart) continue
    const target = path.resolve(dir, filePart)
    const rel = path.relative(process.cwd(), target)
    if (!fs.existsSync(target)) {
      const from = path.relative(process.cwd(), filePath)
      const ignored = IGNORE.some(
        ([f, h]) => from === f && (filePart === h || filePart === h.replace('./', ''))
      )
      if (!ignored) issues.push({ from, href: filePart, resolved: rel })
    }
  }
  return issues
}

let total = 0
const byFile = new Map()

for (const fp of walkMd(DOCS_DIR)) {
  const issues = checkFile(fp)
  if (issues.length) {
    byFile.set(fp, issues)
    total += issues.length
  }
}

if (total === 0) {
  console.log('Docs link check: all relative links resolve.')
  process.exit(0)
}

console.error('Docs link check: broken relative links:\n')
for (const [file, issues] of byFile) {
  const short = path.relative(process.cwd(), file)
  for (const { href, resolved } of issues) {
    console.error(`  ${short}`)
    console.error(`    → ${href}`)
    console.error(`    (resolved: ${resolved})`)
  }
}
console.error(`\nTotal: ${total} broken link(s)`)
process.exit(1)
