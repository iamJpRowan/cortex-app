/**
 * User documentation API.
 * Content is built from docs/user/*.md by scripts/build-user-docs.js.
 */

import {
  getDocBody,
  getDocSummary,
  getDocSectionContent,
  userDocsManifest,
  userDocSlugs,
  type UserDocManifest,
  type UserDocManifestEntry,
} from './user-docs.generated'

export type { UserDocManifest, UserDocManifestEntry }
export { userDocsManifest, userDocSlugs }

/** Full markdown body for a doc. */
export { getDocBody }

/** Short summary for tooltips (from frontmatter). */
export { getDocSummary }

/** Section content (markdown) for a doc. */
export { getDocSectionContent }

/** Full doc metadata and body for display. */
export function getDoc(
  slug: string
): { title: string; summary: string; body: string } | undefined {
  const entry = userDocsManifest[slug]
  const body = getDocBody(slug)
  if (!entry || body === undefined) return undefined
  return { title: entry.title, summary: entry.summary, body }
}
