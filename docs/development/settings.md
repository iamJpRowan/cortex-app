[Docs](../README.md) / [Development](./README.md) / Settings

# Creating a New Setting

This guide explains how to add a new user-facing setting that is stored in `settings.json`, editable via the Settings UI and by editing the file, and syncs bidirectionally.

## Overview

- **Storage**: Settings live in `userData/settings.json`. The file uses **override-only** semantics: only values that differ from defaults are written. Defaults are defined in code in the main process.
- **Keys**: Flat dot-notation keys (e.g. `appearance.theme`, `editor.fontSize`). All keys and defaults are declared in the settings service.
- **Renderer API**: `window.api.settings.get()`, `window.api.settings.set(key, value)`, `window.api.settings.onChange(callback)`.

## Steps to Add a New Setting

### 1. Add to the main process schema and defaults

In **`src/main/services/settings.ts`**:

1. **Extend `SettingsDefaults`** with the new key and its type:

   ```ts
   export interface SettingsDefaults {
     'appearance.theme': 'light' | 'dark' | 'system'
     'hotkeys.commandPalette': string
     'hotkeys.settings': string
     'editor.fontSize': number  // example
   }
   ```

2. **Add a default in `DEFAULTS`**:

   ```ts
   const DEFAULTS: SettingsDefaults = {
     'appearance.theme': 'system',
     'hotkeys.commandPalette': process.platform === 'darwin' ? 'Cmd+K' : 'Ctrl+K',
     'hotkeys.settings': process.platform === 'darwin' ? 'Cmd+,' : 'Ctrl+,',
     'editor.fontSize': 14,
   }
   ```

No other main-process code changes are needed. The existing IPC and file I/O use `SettingsDefaults` and `DEFAULTS`; new keys are validated and merged automatically.

### 2. Use the setting in the renderer

From any renderer code (component or lib):

- **Read**: `const result = await window.api.settings.get()` then use `(result.data as YourSettings)['your.key']`, or `await window.api.settings.get('your.key')` for a single key.
- **Write**: `await window.api.settings.set('your.key', value)`.
- **React to changes** (e.g. file edited externally): `window.api.settings.onChange(data => { if (data.key === 'your.key') { ... } })`.

Types for `window.api` are in **`src/renderer/src/types/api.d.ts`**. The settings API is generic (`data?: unknown`); keep a shared interface (e.g. in the component that uses it) or cast when you use the result.

### 3. (Optional) Expose the setting in the Settings UI

In **`src/renderer/src/components/SettingsView.tsx`**:

1. **Add the key to the local `Settings` interface** (and to any place you cast `result.data`):

   ```ts
   interface Settings {
     'appearance.theme': Theme
     'hotkeys.commandPalette': string
     'hotkeys.settings': string
     'editor.fontSize': number
   }
   ```

2. **Handle external updates** in the existing `onChange` effect: if your setting must trigger non-UI behavior when changed externally (e.g. file edit), add a branch:

   ```ts
   if (data.key === 'editor.fontSize') {
     // e.g. update app font size
   }
   ```

3. **Add a control and handler** in the JSX:
   - Add a controlled input (e.g. `Input`, `Select`, or a number input) bound to `settings['editor.fontSize']`.
   - On change, call `window.api.settings.set('editor.fontSize', value)` and update local state: `setSettings({ ...settings, 'editor.fontSize': value })`.

4. **Avoid feedback loops**: If changing this setting triggers more logic (e.g. theme triggers `setTheme`), do not call `settings.set` again from inside an `onChange` listener for that key. Prefer a single write from the user action, and in `onChange` only apply the new value (e.g. update DOM or state, but do not write back to settings).

## Conventions

- **Key shape**: Use a short category prefix and a dot: `category.name` (e.g. `appearance.theme`, `hotkeys.settings`).
- **Defaults**: Every key in `SettingsDefaults` must have a value in `DEFAULTS`. Use platform-specific defaults only when needed (e.g. hotkeys).
- **Override-only**: The settings file is not a full snapshot; it only contains overrides. Adding a new key with a default does not require users to change their file.
- **Types**: Keep the TypeScript type for the new key in sync with `SettingsDefaults` and with any renderer `Settings` interface you use.

## Files to Touch

| Step           | File |
|----------------|------|
| Schema/defaults| `src/main/services/settings.ts` |
| Types (if used)| `src/renderer/src/types/api.d.ts` (only if you extend the API shape; settings `data` is generic) |
| Settings UI    | `src/renderer/src/components/SettingsView.tsx` |
| Consumer logic | Any component or lib that reads/writes or subscribes to the new key |

## Related

- **[Commands and Hotkeys](./commands-and-hotkeys.md)** — For adding commands and hotkeys that can be driven by settings (e.g. `hotkeys.*`).
- Settings file location and override semantics are described in the backlog item **[Settings, Command Palette & Hotkeys](../backlog/archive/settings-command-palette-hotkeys.md)** (archived).
