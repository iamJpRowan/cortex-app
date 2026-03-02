#!/usr/bin/env node

/**
 * Build product docs (dynamic content only)
 *
 * Reads YAML frontmatter from docs/product/backlog/*.md, archive/*.md, and docs/product/themes/*.md.
 * Writes: docs/product/backlog/README.md, docs/product/themes/README.md, and the generated block
 * in docs/product/README.md. Updates "## Backlog items" in theme docs. No body parsing.
 * Run: npm run build:product-docs; also runs in predev and pre-commit.
 */

const fs = require('fs')
const path = require('path')

const BACKLOG_DIR = path.resolve(__dirname, '../docs/product/backlog')
const ARCHIVE_DIR = path.join(BACKLOG_DIR, 'archive')
const THEMES_DIR = path.resolve(__dirname, '../docs/product/themes')
const PRODUCT_DIR = path.resolve(__dirname, '../docs/product')
const OUT_BACKLOG_README = path.join(BACKLOG_DIR, 'README.md')
const OUT_THEMES_README = path.join(THEMES_DIR, 'README.md')
const OUT_PRODUCT_README = path.join(PRODUCT_DIR, 'README.md')

// Active = Kanban columns (ready to test | in progress | designing). Inactive = next, soon, considering (display order).
const ACTIONABLE_STATUSES = ['ready to test', 'in progress', 'designing']
const ACTIONABLE_COLUMNS = ['ready to test', 'in progress', 'designing']
const INACTIVE_STATUSES = ['next', 'soon', 'considering']
const INACTIVE_TABLE_ORDER = ['next', 'soon', 'considering']
// Order for themes README table (current items only)
const STATUS_TABLE_ORDER = [...ACTIONABLE_STATUSES, ...INACTIVE_STATUSES]

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
]

function slugToTitleCase(slug) {
  if (!slug || typeof slug !== 'string') return slug
  return slug
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function formatDevlogTitle(devlogId) {
  if (!devlogId || typeof devlogId !== 'string') return devlogId
  const m = devlogId.match(/^(\d{4})-(\d{2})-(\d{2})(?:-(.*))?$/)
  if (!m) return slugToTitleCase(devlogId)
  const [, _year, month, day, rest] = m
  const mon = MONTH_NAMES[parseInt(month, 10) - 1] || month
  const d = parseInt(day, 10)
  const datePart = `${mon} ${d}`
  if (!rest) return datePart
  return `${datePart} ${slugToTitleCase(rest)}`
}

function parseFrontmatterOnly(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return null
  const fm = match[1]
  const out = { status: '', themes: [], summary: '', depends_on: [] }
  for (const line of fm.split('\n')) {
    const s = line.match(/^status:\s*["']?([^"'\n]+)["']?/)
    const t = line.match(/^themes:\s*\[([^\]]*)\]/)
    const sum = line.match(/^summary:\s*["']?([^"'\n]+)["']?/)
    const d = line.match(/^depends_on:\s*\[([^\]]*)\]/)
    const dev = line.match(/^devlogs:\s*\[([^\]]*)\]/)
    const rel = line.match(/^related_devlogs:\s*\[([^\]]*)\]/)
    const da = line.match(/^date_archived:\s*["']?([^"'\n]+)["']?/)
    if (s) out.status = s[1].trim().toLowerCase()
    if (t) out.themes = t[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, ''))
    if (sum) out.summary = sum[1].trim()
    if (d) out.depends_on = d[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, ''))
    if (dev)
      out.devlogs = dev[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, ''))
    if (rel)
      out.devlogs = (out.devlogs || []).concat(
        rel[1].split(',').map(x => x.trim().replace(/^["']|["']$/g, ''))
      )
    if (da) out.date_archived = da[1].trim()
  }
  return out
}

function parseThemeFrontmatter(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return { summary: '' }
  const fm = match[1]
  let summary = ''
  for (const line of fm.split('\n')) {
    const sum = line.match(/^summary:\s*["']?([^"'\n]+)["']?/)
    if (sum) summary = sum[1].trim()
  }
  return { summary }
}

function collectCurrentItems() {
  const items = []
  const entries = fs.readdirSync(BACKLOG_DIR, { withFileTypes: true })
  for (const ent of entries) {
    if (
      ent.name === 'README.md' ||
      ent.name === 'TEMPLATE.md' ||
      !ent.name.endsWith('.md')
    )
      continue
    if (ent.isDirectory()) continue
    const filePath = path.join(BACKLOG_DIR, ent.name)
    const meta = parseFrontmatterOnly(filePath)
    const slug = ent.name.replace(/\.md$/, '')
    items.push({
      slug,
      link: `./${ent.name}`,
      status: (meta && meta.status) || 'considering',
      themes: (meta && meta.themes) || [],
      summary: (meta && meta.summary) || '—',
      depends_on: (meta && meta.depends_on) || [],
      devlogs: (meta && meta.devlogs) || [],
    })
  }
  return items
}

function collectArchiveItems() {
  if (!fs.existsSync(ARCHIVE_DIR)) return []
  const items = []
  const entries = fs.readdirSync(ARCHIVE_DIR, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === 'README.md' || !ent.name.endsWith('.md')) continue
    if (!ent.isFile()) continue
    const filePath = path.join(ARCHIVE_DIR, ent.name)
    const meta = parseFrontmatterOnly(filePath)
    const slug = ent.name.replace(/\.md$/, '')
    items.push({
      slug,
      link: `./archive/${ent.name}`,
      status: (meta && meta.status) || 'completed',
      summary: (meta && meta.summary) || '—',
      date_archived: (meta && meta.date_archived) || '',
    })
  }
  items.sort((a, b) =>
    a.date_archived > b.date_archived ? -1 : a.date_archived < b.date_archived ? 1 : 0
  )
  return items
}

function collectThemeSummaries() {
  const out = {}
  if (!fs.existsSync(THEMES_DIR)) return out
  const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === 'README.md' || !ent.name.endsWith('.md')) continue
    if (!ent.isFile()) continue
    const themeId = ent.name.replace(/\.md$/, '')
    const filePath = path.join(THEMES_DIR, ent.name)
    const { summary } = parseThemeFrontmatter(filePath)
    out[themeId] = summary || themeId
  }
  return out
}

/** linkBase: optional prefix for item links (e.g. './backlog/' when building from product README). */
function buildActionableTable(items, linkBase = '') {
  const list = items.filter(it => ACTIONABLE_STATUSES.includes(it.status))
  if (list.length === 0) return ''
  const byStatus = {}
  for (const col of ACTIONABLE_COLUMNS)
    byStatus[col] = list.filter(it => it.status === col)
  const header =
    '| ' +
    ACTIONABLE_COLUMNS.join(' | ') +
    ' |\n|' +
    ACTIONABLE_COLUMNS.map(() => '--------').join('|') +
    '|\n'
  const itemLink = it => (linkBase ? linkBase + it.slug + '.md' : it.link)
  const devlogLinkBase = linkBase === './backlog/' ? './devlogs/' : '../devlogs/'
  function cellContent(entryList) {
    if (!entryList || entryList.length === 0) return '—'
    return entryList
      .map(it => {
        const devlogLinks =
          it.devlogs && it.devlogs.length
            ? ' ' +
              it.devlogs
                .map(id => `[${formatDevlogTitle(id)}](${devlogLinkBase}${id}.md)`)
                .join('<br>')
            : ''
        const summary = (it.summary || '').trim()
        const period = summary.endsWith('.') ? '' : '.'
        return `**[${slugToTitleCase(it.slug)}](${itemLink(it)})** — ${summary}${period}${devlogLinks}`
      })
      .join('<br><br>')
  }
  const row = ACTIONABLE_COLUMNS.map(c => cellContent(byStatus[c])).join(' | ')
  return header + '| ' + row + ' |\n'
}

function buildConsideringTableForStatus(items, status) {
  const list = items.filter(it => it.status === status)
  const header = '| Item | Summary |\n|------|--------|\n'
  if (list.length === 0) return header + '| *None* | — |\n'
  let table = header
  for (const it of list) {
    table += `| [${slugToTitleCase(it.slug)}](${it.link}) | ${it.summary} |\n`
  }
  return table
}

function buildInactiveTables(items) {
  const list = items.filter(it => INACTIVE_STATUSES.includes(it.status))
  const parts = []
  for (const status of INACTIVE_TABLE_ORDER) {
    const statusList = list.filter(it => it.status === status)
    if (statusList.length === 0) continue
    const sectionTitle = status.charAt(0).toUpperCase() + status.slice(1)
    parts.push(`## ${sectionTitle}\n\n`)
    parts.push(buildConsideringTableForStatus(list, status))
    parts.push('\n')
  }
  return parts.join('')
}

function buildArchivedTable(archiveItems) {
  if (archiveItems.length === 0) return ''
  let table = '| Item | Summary |\n|------|--------|\n'
  for (const it of archiveItems) {
    const prefix = `[\`${it.status}\`] `
    table += `| ${prefix}[${slugToTitleCase(it.slug)}](${it.link}) | ${it.summary} |\n`
  }
  return table
}

function buildBacklogReadme(currentItems, archiveItems) {
  const intro = `[Docs](../../README.md) / [Product](../README.md) / Backlog

# Backlog

Backlog view — generated from frontmatter. Structure and frontmatter: [TEMPLATE.md](./TEMPLATE.md). Order: [Product README](../README.md#roadmap). Themes: [themes](../themes/README.md).

`
  const actionable = buildActionableTable(currentItems)
  const actionableSection = actionable ? `## Active\n\n${actionable}` : ''
  const inactive = buildInactiveTables(currentItems)
  const archived = buildArchivedTable(archiveItems)
  const archivedSection = archived
    ? `## Archived

Items in [archive](./archive/), sorted by \`date_archived\` (newest first). Archive is just a directory; no separate index.

${archived}`
    : ''
  const footer = `
*Generated by \`npm run build:product-docs\` (frontmatter only).*
`
  return [intro, actionableSection, inactive, archivedSection, footer]
    .filter(Boolean)
    .join('\n')
}

/** Theme doc: Backlog items section (Active 3-col + Next, Soon, Considering). */
function buildThemeBacklogContent(themeItems) {
  const linkPath = slug => `../backlog/${slug}.md`
  const parts = []
  const activeItems = themeItems.filter(it => ACTIONABLE_STATUSES.includes(it.status))
  if (activeItems.length > 0) {
    const byStatus = {}
    for (const col of ACTIONABLE_COLUMNS)
      byStatus[col] = activeItems.filter(it => it.status === col)
    const header =
      '| ' +
      ACTIONABLE_COLUMNS.join(' | ') +
      ' |\n|' +
      ACTIONABLE_COLUMNS.map(() => '--------').join('|') +
      '|\n'
    function cell(entryList) {
      if (!entryList || entryList.length === 0) return '—'
      return entryList
        .map(it => `[${slugToTitleCase(it.slug)}](${linkPath(it.slug)}) — ${it.summary}`)
        .join('<br><br>')
    }
    const row = ACTIONABLE_COLUMNS.map(c => cell(byStatus[c])).join(' | ')
    parts.push('## Active\n\n')
    parts.push(header + '| ' + row + ' |\n\n')
  }
  for (const status of INACTIVE_TABLE_ORDER) {
    const list = themeItems.filter(it => it.status === status)
    if (list.length === 0) continue
    const sectionTitle = status.charAt(0).toUpperCase() + status.slice(1)
    parts.push(`## ${sectionTitle}\n\n`)
    parts.push('| Item | Summary |\n|------|--------|\n')
    for (const it of list) {
      parts.push(
        `| [${slugToTitleCase(it.slug)}](${linkPath(it.slug)}) | ${it.summary} |\n`
      )
    }
    parts.push('\n')
  }
  return parts.join('')
}

function updateThemeDocs(currentItems) {
  if (!fs.existsSync(THEMES_DIR)) return
  const entries = fs.readdirSync(THEMES_DIR, { withFileTypes: true })
  for (const ent of entries) {
    if (ent.name === 'README.md' || !ent.name.endsWith('.md')) continue
    if (!ent.isFile()) continue
    const themeId = ent.name.replace(/\.md$/, '')
    const filePath = path.join(THEMES_DIR, ent.name)
    const items = currentItems.filter(it => (it.themes || []).includes(themeId))
    const tablesContent = buildThemeBacklogContent(items)
    const generated = `## Backlog items

Generated from frontmatter \`themes: [${themeId}, ...]\`. Do not edit by hand.

${tablesContent}
`
    let content = fs.readFileSync(filePath, 'utf8')
    const idx = content.indexOf('## Backlog items')
    if (idx === -1) {
      content = content.trimEnd() + '\n\n' + generated
    } else {
      content = content.slice(0, idx) + generated
    }
    fs.writeFileSync(filePath, content, 'utf8')
    console.log('Updated theme:', ent.name)
  }
}

/** Themes README: per theme, summary + table (Item | Summary | Status) ordered by status. */
function buildThemesReadme(currentItems, themeSummaries) {
  const intro = `[Docs](../README.md) / [Product](../README.md) / Themes

# Themes

Themes group backlog items by outcome or technical area. **Theme ID = theme file name** (without \`.md\`). Backlog items use \`themes: [id1, id2]\` in frontmatter; theme docs list items (bi-directional). Create themes when [defining core concepts](../../development/agents/defining-core-concepts.md).

`
  const themeIds = Object.keys(themeSummaries).sort()
  const parts = [intro]
  for (const themeId of themeIds) {
    const summary = themeSummaries[themeId] || themeId
    const items = currentItems.filter(it => (it.themes || []).includes(themeId))
    const sorted = items.slice().sort((a, b) => {
      const ia = STATUS_TABLE_ORDER.indexOf(a.status)
      const ib = STATUS_TABLE_ORDER.indexOf(b.status)
      if (ia !== ib) return ia - ib
      return (a.slug || '').localeCompare(b.slug || '')
    })
    parts.push(`### ${themeId}\n\n`)
    parts.push(`${summary}\n\n`)
    parts.push('| Item | Summary | Status |\n|------|--------|--------|\n')
    if (sorted.length === 0) {
      parts.push('| *None* | — | — |\n')
    } else {
      for (const it of sorted) {
        parts.push(
          `| [${slugToTitleCase(it.slug)}](../backlog/${it.slug}.md) | ${it.summary} | ${it.status} |\n`
        )
      }
    }
    parts.push('\n')
  }
  parts.push(`*Generated by \`npm run build:product-docs\` (frontmatter only).*\n`)
  return parts.join('')
}

/** Product README generated block: Active table + Themes list. */
function buildProductReadmeBlock(currentItems, themeSummaries) {
  const parts = []
  const actionable = buildActionableTable(currentItems, './backlog/')
  if (actionable) {
    parts.push('## Active\n\n')
    parts.push(actionable)
    parts.push('\n')
  }
  parts.push('## Themes\n\n')
  const themeIds = Object.keys(themeSummaries).sort()
  for (const themeId of themeIds) {
    const summary = themeSummaries[themeId] || themeId
    parts.push(`- **[${themeId}](./themes/${themeId}.md)** — ${summary}\n`)
  }
  return parts.join('')
}

function updateProductReadme(currentItems, themeSummaries) {
  const block = buildProductReadmeBlock(currentItems, themeSummaries)
  let content = fs.readFileSync(OUT_PRODUCT_README, 'utf8')
  const start = content.indexOf('<!-- generated -->')
  const end = content.indexOf('<!-- /generated -->')
  if (start === -1 || end === -1 || end <= start) {
    console.warn(
      'Product README: no <!-- generated -->...<!-- /generated --> block found; skipping.'
    )
    return
  }
  const before = content.slice(0, start + '<!-- generated -->'.length)
  const after = content.slice(end)
  content = before + '\n\n' + block + '\n\n' + after
  fs.writeFileSync(OUT_PRODUCT_README, content, 'utf8')
  console.log('Updated product README generated block')
}

function main() {
  const currentItems = collectCurrentItems()
  const archiveItems = collectArchiveItems()
  const themeSummaries = collectThemeSummaries()

  fs.writeFileSync(
    OUT_BACKLOG_README,
    buildBacklogReadme(currentItems, archiveItems),
    'utf8'
  )
  console.log('Wrote', OUT_BACKLOG_README)

  fs.writeFileSync(
    OUT_THEMES_README,
    buildThemesReadme(currentItems, themeSummaries),
    'utf8'
  )
  console.log('Wrote', OUT_THEMES_README)

  updateThemeDocs(currentItems)
  updateProductReadme(currentItems, themeSummaries)
}

main()
