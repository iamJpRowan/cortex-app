/**
 * Shared file-backed config watcher for settings, modes, and future file-based config.
 * Registers paths (file or directory), debounces disk events, and emits a single
 * "changed" event per domain so consumers can refetch. No config content is sent.
 * @see docs/development/file-backed-config-watcher.md
 */

import fs from 'fs'
import path from 'path'
import { EventEmitter } from 'events'

export type UserConfigWatcherOptions = {
  /** Debounce delay in ms (default 500). */
  debounceMs?: number
}

type DomainEntry = {
  path: string
  /** Directory we actually watch (parent of file, or path itself if directory). */
  watchDir: string
  /** When path is a file: basename to filter events. */
  watchFile?: string
  debounceMs: number
  debounceTimer: NodeJS.Timeout | null
  watcher: fs.FSWatcher | null
}

const DEFAULT_DEBOUNCE_MS = 500

class UserConfigWatcherService extends EventEmitter {
  private domains = new Map<string, DomainEntry>()

  /**
   * Register a domain to watch. path can be a file or directory.
   * Emits "changed" with { domain } when the path (or any file in it) changes on disk.
   */
  register(
    domainId: string,
    fileOrDirPath: string,
    options?: UserConfigWatcherOptions
  ): void {
    this.unregister(domainId)

    const debounceMs = options?.debounceMs ?? DEFAULT_DEBOUNCE_MS
    const resolved = path.resolve(fileOrDirPath)
    let watchDir: string
    let watchFile: string | undefined

    try {
      const stat = fs.statSync(resolved)
      if (stat.isDirectory()) {
        watchDir = resolved
      } else {
        watchDir = path.dirname(resolved)
        watchFile = path.basename(resolved)
      }
    } catch {
      // Path may not exist yet (e.g. first run); still register so watcher starts when dir exists
      if (resolved.endsWith(path.sep) || !path.extname(resolved)) {
        watchDir = resolved
      } else {
        watchDir = path.dirname(resolved)
        watchFile = path.basename(resolved)
      }
    }

    const entry: DomainEntry = {
      path: resolved,
      watchDir,
      watchFile,
      debounceMs,
      debounceTimer: null,
      watcher: null,
    }

    try {
      if (!fs.existsSync(watchDir)) {
        fs.mkdirSync(watchDir, { recursive: true })
      }
      entry.watcher = fs.watch(watchDir, (eventType, filename) => {
        if (watchFile && filename !== watchFile) return
        if (eventType !== 'change' && eventType !== 'rename') return

        if (entry.debounceTimer) clearTimeout(entry.debounceTimer)
        entry.debounceTimer = setTimeout(() => {
          entry.debounceTimer = null
          this.emit('changed', { domain: domainId })
        }, debounceMs)
      })
      this.domains.set(domainId, entry)
    } catch (error) {
      console.error(
        `[UserConfigWatcher] Failed to watch "${domainId}" at ${watchDir}:`,
        error
      )
    }
  }

  /** Stop watching a domain. */
  unregister(domainId: string): void {
    const entry = this.domains.get(domainId)
    if (!entry) return
    if (entry.debounceTimer) {
      clearTimeout(entry.debounceTimer)
      entry.debounceTimer = null
    }
    if (entry.watcher) {
      entry.watcher.close()
      entry.watcher = null
    }
    this.domains.delete(domainId)
  }

  /** Stop all watchers. */
  stop(): void {
    for (const domainId of this.domains.keys()) {
      this.unregister(domainId)
    }
  }
}

let instance: UserConfigWatcherService | null = null

export function getUserConfigWatcher(): UserConfigWatcherService {
  if (!instance) {
    instance = new UserConfigWatcherService()
  }
  return instance
}
