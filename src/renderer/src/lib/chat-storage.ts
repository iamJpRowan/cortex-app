/**
 * localStorage keys for chat view persistence.
 * Namespace: cortex.chat.*
 *
 * @see docs/development/ui-state-persistence.md
 */
export const CHAT_LAST_ACTIVE_KEY = 'cortex.chat.lastActiveConversationId'
export const CHAT_DRAFT_KEY_PREFIX = 'cortex.chat.draft.'
export const CHAT_LAST_VIEWED_KEY_PREFIX = 'cortex.chat.lastViewed.'
export const CHAT_SIDEBAR_WIDTH_KEY = 'cortex.chat.sidebarWidth'

const LEGACY_LAST_ACTIVE = 'cortex.lastActiveConversationId'
const LEGACY_DRAFT_PREFIX = 'cortex.draft.'
const LEGACY_LAST_VIEWED_PREFIX = 'cortex.lastViewed.'
const LEGACY_SIDEBAR_WIDTH = 'cortex.chatSidebarWidth'

/**
 * One-time migration from legacy keys to cortex.chat.* namespace.
 * Call once at app init.
 */
export function migrateChatStorage(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const last = localStorage.getItem(LEGACY_LAST_ACTIVE)
    if (last && !localStorage.getItem(CHAT_LAST_ACTIVE_KEY)) {
      localStorage.setItem(CHAT_LAST_ACTIVE_KEY, last)
      localStorage.removeItem(LEGACY_LAST_ACTIVE)
    }
    const width = localStorage.getItem(LEGACY_SIDEBAR_WIDTH)
    if (width && !localStorage.getItem(CHAT_SIDEBAR_WIDTH_KEY)) {
      localStorage.setItem(CHAT_SIDEBAR_WIDTH_KEY, width)
      localStorage.removeItem(LEGACY_SIDEBAR_WIDTH)
    }
    const keysToMigrate: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (
        k &&
        (k.startsWith(LEGACY_DRAFT_PREFIX) || k.startsWith(LEGACY_LAST_VIEWED_PREFIX))
      ) {
        keysToMigrate.push(k)
      }
    }
    for (const k of keysToMigrate) {
      if (k.startsWith(LEGACY_DRAFT_PREFIX)) {
        const id = k.slice(LEGACY_DRAFT_PREFIX.length)
        const newKey = CHAT_DRAFT_KEY_PREFIX + id
        if (!localStorage.getItem(newKey)) {
          const v = localStorage.getItem(k)
          if (v !== null) {
            localStorage.setItem(newKey, v)
            localStorage.removeItem(k)
          }
        }
      } else if (k.startsWith(LEGACY_LAST_VIEWED_PREFIX)) {
        const id = k.slice(LEGACY_LAST_VIEWED_PREFIX.length)
        const newKey = CHAT_LAST_VIEWED_KEY_PREFIX + id
        if (!localStorage.getItem(newKey)) {
          const v = localStorage.getItem(k)
          if (v !== null) {
            localStorage.setItem(newKey, v)
            localStorage.removeItem(k)
          }
        }
      }
    }
  } catch {
    // Ignore migration errors
  }
}
