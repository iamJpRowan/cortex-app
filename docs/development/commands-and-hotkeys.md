[Docs](../README.md) / [Development](./README.md) / Commands and Hotkeys

# Commands and Hotkeys

This guide explains how to add **commands** (visible in the command palette) and **hotkeys** (app-level keyboard shortcuts) in Cortex.

## Overview

- **Commands** appear in the command palette (Cmd+K / Ctrl+K). Users search and run them from there.
- **Hotkeys** are keyboard shortcuts that trigger actions when the app window is focused. Some actions are both a command and a hotkey (e.g. Open Settings).
- The command palette shortcut is provided by [kbar](https://github.com/timc1/kbar); other shortcuts are registered in `src/renderer/src/lib/hotkeys.ts` and can be driven by settings.

---

## How to Register a Command

Commands are defined in the command registry and consumed by the command palette.

### Where

- **Registry**: `src/renderer/src/lib/commands.ts` — `getCommands(deps)` returns an array of kbar `Action` objects.
- **Usage**: `src/renderer/src/components/CommandPalette.tsx` calls `getCommands({ navigate })` and passes the result to kbar.

### Command shape (kbar Action)

Each command is an object with:

| Field      | Required | Description |
|-----------|----------|-------------|
| `id`      | Yes      | Unique string (e.g. `'nav-settings'`). |
| `name`    | Yes      | Label shown in the palette. |
| `keywords`| Yes      | Space-separated or string[] — used for search. |
| `section` | No       | Group title (e.g. `'Navigation'`, `'Theme'`). |
| `perform` | Yes      | `() => void` — runs when the command is executed. |
| `shortcut`| No       | Display-only shortcut hint (e.g. `['mod', ',']`). |

### Dependencies

`getCommands(deps)` receives `CommandDependencies`:

```ts
export interface CommandDependencies {
  navigate: (path: string) => void
}
```

To add a command that needs more (e.g. a callback), extend this interface and pass the new dependency from `CommandPalette` when calling `getCommands()`.

### Steps to add a command

1. Open `src/renderer/src/lib/commands.ts`.
2. Add a new object to the array returned by `getCommands()`:

   ```ts
   {
     id: 'nav-my-view',
     name: 'My View',
     keywords: 'my view custom',
     section: 'Navigation',
     perform: () => navigate('/my-view'),
   }
   ```

3. If the command needs a new dependency (e.g. `openDialog`), add it to `CommandDependencies`, pass it from `CommandPalette` into `getCommands()`, and use it inside `perform`.

The command palette is wired in `App.tsx`: `CommandPalette` wraps `AppContent`, and kbar handles Cmd+K / Ctrl+K to open it.

---

## How to Register a Hotkey

Hotkeys are app-level shortcuts that run when the window is focused. There are two patterns: **settings-driven** (user-configurable later) and **fixed** (code-only).

### Shortcut format

Strings like `"Cmd+K"` or `"Ctrl+,"`:

- **Modifier**: `Cmd` / `Meta` (macOS) or `Ctrl` / `Control` (Windows/Linux).
- **Key**: single character or name (e.g. `K`, `,`, `Enter`, `Escape`).

Only one modifier is supported per shortcut; `Shift` and `Alt` are not used in the parser.

### A. Settings-driven hotkey

Use this when the shortcut should come from settings (and eventually from the settings UI).

1. **Add a default** in the main process:
   - In `src/main/services/settings.ts`, add the key to `SettingsDefaults` and `DEFAULTS`, e.g.:
     ```ts
     'hotkeys.settings': string
     // in DEFAULTS:
     'hotkeys.settings': process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
     ```

2. **Register in the hotkeys layer**:
   - In `src/renderer/src/lib/hotkeys.ts`, extend `initHotkeys(actions)` to accept the new action (e.g. `openSettings: () => void`).
   - In the same function, read the setting (e.g. `settings['hotkeys.settings']`), then call `registerHotkey(shortcut, actions.openSettings)`.
   - Subscribe to `settings:on-change` for that key and re-run that registration when it changes (see existing `hotkeys.settings` handling).

3. **Wire the action in the app**:
   - In `App.tsx` (or wherever `initHotkeys` is called), pass the implementation, e.g. `openSettings: () => navigate('/settings')`.

Today, `initHotkeys` is called from `AppContent` in `App.tsx`; its cleanup is run on unmount.

### B. Fixed hotkey (not from settings)

Use this when the shortcut is not configurable and will not be stored in settings.

1. Where you have a component lifecycle (e.g. a top-level component with `useEffect`), call:
   ```ts
   import { registerHotkey } from '@/lib/hotkeys'
   // inside useEffect:
   const cleanup = registerHotkey('Cmd+B', () => { /* toggle sidebar */ })
   return () => cleanup()
   ```
2. `registerHotkey(shortcut, action)` returns a function that unregisters that hotkey; call it on cleanup.

You can do this in the same place `initHotkeys` is used, or in another component that mounts for the whole app. Avoid registering the same shortcut in more than one place.

---

## How Commands and Hotkeys Relate

- **Commands** = palette only. The user opens the palette (Cmd+K) and chooses an action.
- **Hotkeys** = direct shortcuts. No palette; the key runs the action.
- **Same action, both** — e.g. “Open Settings” is a command (“Settings” in the palette) and a hotkey (Cmd+,). Implement by:
  - Adding a command in `getCommands()` whose `perform` does the same thing as the hotkey action.
  - Registering that action in `initHotkeys()` (or via `registerHotkey()`) for the desired shortcut.

The **command palette shortcut** (Cmd+K / Ctrl+K) is bound by kbar, not by `hotkeys.ts`. The value `hotkeys.commandPalette` in settings is for display/future configuration; changing it does not change kbar’s binding today.

---

## Reference

### Settings keys for hotkeys

Defined in `src/main/services/settings.ts`:

| Key                     | Default (macOS) | Default (Win/Linux) | Meaning |
|-------------------------|-----------------|----------------------|---------|
| `hotkeys.commandPalette`| `'Cmd+K'`       | `'Ctrl+K'`           | Command palette (display/future use; kbar owns the binding). |
| `hotkeys.settings`      | `'Cmd+,'`       | `'Ctrl+,'`           | Open Settings. |

Defaults are in `DEFAULTS`; add new keys there and in `SettingsDefaults` when you add settings-driven hotkeys.

### Current commands

From `getCommands()` in `src/renderer/src/lib/commands.ts`:

| id            | name                       | section     |
|---------------|----------------------------|------------|
| `nav-home`    | Home                       | Navigation |
| `nav-settings`| Settings                   | Navigation |
| `theme-toggle`| Toggle Light / Dark Theme  | Theme      |

### Current hotkeys

| Shortcut   | Action            | Implemented in |
|------------|-------------------|----------------|
| Cmd+K / Ctrl+K | Open command palette | kbar (CommandPalette) |
| Cmd+, / Ctrl+, | Open Settings        | `initHotkeys()` → `hotkeys.settings` |

### Files

| Purpose                         | File |
|---------------------------------|------|
| Command definitions             | `src/renderer/src/lib/commands.ts` |
| Command palette UI + kbar       | `src/renderer/src/components/CommandPalette.tsx` |
| Hotkey registration & init     | `src/renderer/src/lib/hotkeys.ts` |
| Hotkey wiring in app           | `src/renderer/src/App.tsx` (`AppContent` → `initHotkeys`) |
| Settings schema & hotkey defaults | `src/main/services/settings.ts` |
