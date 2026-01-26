---
date: 2025-01-25
developer: Jp Rowan
agent: Auto (Cursor)
model: claude-sonnet-4.5
tags: [settings, command-palette, hotkeys, kbar, electron, preferences]
related_files:
  - src/main/services/settings.ts
  - src/main/ipc/settings.ts
  - src/preload/index.ts
  - src/renderer/src/types/api.d.ts
  - src/renderer/src/components/SettingsView.tsx
  - src/renderer/src/components/CommandPalette.tsx
  - src/renderer/src/lib/commands.ts
  - src/renderer/src/lib/hotkeys.ts
  - src/renderer/src/lib/theme.ts
  - src/renderer/src/App.tsx
  - docs/development/commands-and-hotkeys.md
  - docs/development/settings.md
  - docs/backlog/archive/settings-command-palette-hotkeys.md
related_issues: []
related_devlogs:
  - 2025-01-25-sidebar-layout-implementation.md
  - 2025-01-24-react-shadcn-migration.md
session_duration: Multiple sessions across Phases 1–6
iterations: Phased implementation per backlog; theme migrated to settings (one-time migration from localStorage); configurable hotkey UI deferred
outcome: Full settings system, command palette (Kbar), app-level hotkeys, and developer documentation for adding commands/hotkeys
---

[Docs](../README.md) / [Devlogs](./README.md) / Settings, Command Palette & Hotkeys

# Context

Cortex needed a user-facing settings system, quick-access command palette, and app-level keyboard shortcuts. The backlog item [**Settings, Command Palette & Hotkeys**](../backlog/archive/settings-command-palette-hotkeys.md) defined six phases: a settings service with JSON file storage, settings UI, theme handling, command palette (Kbar), hotkeys reading from settings, and integration plus documentation.

Goals included:
- **Settings**: Override-only JSON at `userData/settings.json`, defaults in code, file watching, bidirectional sync
- **Command palette**: Cmd+K / Ctrl+K to open, searchable commands (Home, Settings, Toggle Theme)
- **Hotkeys**: App-level shortcuts when the window is focused, with bindings stored in settings and a path to future user configuration

# Problem

Several design and implementation choices had to be settled:

1. **Settings shape**: Dot-notation keys (`appearance.theme`, `hotkeys.settings`) with defaults in the main process and override-only file writes
2. **Theme vs settings**: Whether to migrate theme from localStorage into settings immediately or keep it in localStorage and sync only when `appearance.theme` changes in settings
3. **Settings flicker**: Avoiding theme re-application on every settings load, which caused visible flicker
4. **Command palette scope**: Which commands to ship (Home, Settings, Toggle Theme); Chat/Graph were removed from routes and from the palette
5. **Hotkey wiring**: Which shortcuts live in kbar (command palette open) vs in the hotkeys layer (e.g. Open Settings), and how to re-register when settings change
6. **Documentation**: How to register new commands and hotkeys so future work doesn’t require tracing the whole codebase

# Solution

Implementation followed the backlog phases. Decisions and patterns are summarized below.

## Phase 1: Settings Service (Main Process)

- **`src/main/services/settings.ts`**: Singleton with `SettingsDefaults` and `DEFAULTS` for `appearance.theme`, `hotkeys.commandPalette`, `hotkeys.settings`. Override-only file I/O: only keys that differ from defaults are written; the file is never trimmed of other keys. Uses `fs.watch` for file changes and extends `EventEmitter` to notify listeners. Invalid JSON or missing file yields empty overrides and fallback to defaults.
- **`src/main/ipc/settings.ts`**: Handlers `settings:get`, `settings:set`, `settings:get-file-path`, `settings:open-in-editor`, and `settings:on-change` (subscribe to settings changes). All go through the settings service.
- **Preload + types**: Settings API exposed under `window.api.settings`; types in `src/renderer/src/types/api.d.ts`.

## Phase 2: Settings UI and Router

- **`SettingsView.tsx`**: Form UI for theme (Sun/Moon/Monitor) and read-only hotkey labels. “Open in Editor” and settings file path. Uses settings API for get/set and change subscription.
- **Router**: `HashRouter` with routes `/` and `/settings`. Chat and Graph routes removed.
- **`AppSidebar`**: Navigation to Home and Settings only.

## Phase 3: Theme

- **Theme in settings**: Theme is persisted as `appearance.theme` in `settings.json`. `theme.ts` reads and writes via the settings API; no localStorage.
- **One-time migration**: On first run after the change, if settings have no theme override, `initTheme()` reads the legacy `cortex-theme` from localStorage, writes it to settings, then removes the localStorage key.
- **Flicker fix**: `loadSettings()` (and equivalent “load and apply” paths) do **not** call `setTheme()`. Theme is applied only at app init (`initTheme`) and when the user or file change updates `appearance.theme`.
- **Sync**: `initTheme()` loads from settings, subscribes to `settings:on-change` for `appearance.theme`, and applies on change. `setTheme()` updates an in-memory cache, applies, and calls `settings.set('appearance.theme', value)`.

## Phase 4: Command Palette (Kbar)

- **`src/renderer/src/lib/commands.ts`**: `getCommands({ navigate })` returns kbar `Action[]`. Commands: Home, Settings, Toggle Light / Dark Theme. Sections: Navigation, Theme. Dependencies are explicit so new commands can get `navigate` or other callbacks.
- **`CommandPalette.tsx`**: Wraps app content in `KBarProvider`; uses `useNavigate()` and passes `getCommands({ navigate })` as actions. Renders KBar portal, search, and custom result styling. Cmd+K / Ctrl+K is provided by kbar.
- **App**: `CommandPalette` wraps `AppContent` inside `HashRouter`.

## Phase 5: Hotkeys

- **`src/renderer/src/lib/hotkeys.ts`**: Shortcut format `"Cmd+K"` / `"Ctrl+,"`. Parser supports Cmd/Meta and Ctrl/Control. `registerHotkey(shortcut, action)` adds a `keydown` listener and returns an unregister function. `initHotkeys({ openSettings })` reads `hotkeys.settings` from the settings API, registers that shortcut, and subscribes to `settings:on-change` for `hotkeys.settings` to re-register when the binding changes.
- **App**: `AppContent` runs `initHotkeys({ openSettings: () => navigate('/settings') })` in a `useEffect` and uses the returned cleanup on unmount. Cmd+K stays with kbar; Cmd+, / Ctrl+, opens Settings from settings.

## Phase 6: Integration and Documentation

- **Open in Editor**: Implemented via IPC and button in Settings UI.
- **Documentation**: Added **`docs/development/commands-and-hotkeys.md`** describing how to register a command (in `commands.ts`, deps, kbar shape) and how to register a hotkey (settings-driven vs fixed, shortcut format, `initHotkeys` vs `registerHotkey`). Includes reference tables for settings keys, current commands, and current hotkeys. Linked from `docs/development/README.md`.
- **Backlog**: `docs/backlog/settings-command-palette-hotkeys.md` updated with an “Implementation status” note that Phases 1–6 are done and points to the commands-and-hotkeys dev doc.

# Outcome

## What Works Now

- **Settings**: JSON at `userData/settings.json`, override-only writes, file watching, IPC get/set/on-change, Open in Editor.
- **Settings UI**: Theme selector and read-only hotkey display; file path and Open in Editor.
- **Theme**: Stored in settings (`appearance.theme`); applied at init and when `appearance.theme` changes (UI or file). One-time migration from localStorage on first run. No flicker from settings load.
- **Command palette**: Cmd+K / Ctrl+K opens palette; Home, Settings, Toggle Theme; search and sections.
- **Hotkeys**: Cmd+, / Ctrl+, opens Settings; binding comes from `hotkeys.settings` and updates when that setting changes.
- **Docs**: Clear instructions for adding commands and hotkeys in `docs/development/commands-and-hotkeys.md`.

## Key Files

| Purpose | File |
|--------|------|
| Settings service + defaults | `src/main/services/settings.ts` |
| Settings IPC | `src/main/ipc/settings.ts` |
| Preload / API types | `src/preload/index.ts`, `src/renderer/src/types/api.d.ts` |
| Settings UI | `src/renderer/src/components/SettingsView.tsx` |
| Command definitions | `src/renderer/src/lib/commands.ts` |
| Command palette | `src/renderer/src/components/CommandPalette.tsx` |
| Hotkeys | `src/renderer/src/lib/hotkeys.ts` |
| Theme (settings) | `src/renderer/src/lib/theme.ts` |
| App wiring | `src/renderer/src/App.tsx` |
| How to add commands/hotkeys | `docs/development/commands-and-hotkeys.md` |

## Technical Decisions

1. **Override-only settings**: File keeps only overrides; defaults live in code. Reduces file churn and keeps schema in one place.
2. **Theme in settings**: Theme is the single source of truth in `appearance.theme`; one-time migration from localStorage preserves existing user preference.
3. **No setTheme in loadSettings**: Prevents theme flicker when reopening settings or when file watcher fires.
4. **Kbar for palette, hotkeys.ts for rest**: Cmd+K is kbar’s concern; `hotkeys.commandPalette` in settings is for display/future config. Other shortcuts go through `hotkeys.ts` and, when configurable, through `initHotkeys` and settings.
5. **Dedicated dev doc**: Single place for “how do I add a command/hotkey?” so the backlog stays high-level and the implementation stays discoverable.

# Notes

## Gotchas

- **Command palette shortcut**: Bound by kbar. Changing `hotkeys.commandPalette` in settings does not change kbar’s shortcut today.
- **initHotkeys cleanup**: Must be called from a component that stays mounted (e.g. `AppContent`) and cleanup must run on unmount so listeners and settings subscriptions are released.

## Deferred / Future

- **User-configurable hotkeys UI**: HotkeyInput component and editable hotkey fields in SettingsView; settings schema and `initHotkeys` already support new `hotkeys.*` keys.
- **Cmd+B toggle sidebar**: Not implemented; documented as future in backlog. Would be a new `hotkeys.sidebar` (or similar) plus a fixed or settings-driven registration in `initHotkeys` or a dedicated effect.

## Related Work

- **Backlog item**: [Settings, Command Palette & Hotkeys](../backlog/archive/settings-command-palette-hotkeys.md) (archived, completed 2025-01-25).
- Sidebar layout (same-day devlog) provides the navigation surface that Settings and Home use.
- React/shadcn migration supplies the components and patterns used in SettingsView and the rest of the app.
