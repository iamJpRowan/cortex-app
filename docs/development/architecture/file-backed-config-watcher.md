# File-backed config watcher

Shared service for config that lives in files or directories (e.g. `settings.json`, `userData/modes/*.json`). When those paths change on disk—including edits from an external editor—the app refreshes without switching tabs or triggering an in-app action.

## How it works

- **UserConfigWatcher** (`src/main/services/user-config-watcher.ts`) is a singleton that:
  - **Registers** domains with a path (file or directory) and optional debounce.
  - Uses `fs.watch` on the path (or its parent directory for a single file), debounces events, then emits **`changed`** with `{ domain: string }` only. No config content is sent.
- **Main process**: Each feature that owns file-backed config registers its domain at startup and reacts to `changed`:
  - **settings** — Registered with the settings file path. On `changed('settings')`, the settings service calls `reloadFromFile()`, then emits its existing key-level `change` events so IPC and renderer stay unchanged.
  - **modes** — Registered with `getModesDir()`. On `changed('modes')`, main sends `user-config:changed` to the renderer; the renderer refetches modes and refreshes the Agents tab and mode editor.
- **Renderer**: Subscribes via `window.api.userConfig.onChange(callback)`. The callback receives `{ domain }`; components that care about a domain (e.g. `modes`) refetch and update UI.

## Adding a new file-backed config domain

1. **Main: register the domain**  
   In `src/main/index.ts` (or a single place that runs after app is ready), after existing `userConfigWatcher.register(...)` calls:

   ```ts
   userConfigWatcher.register('yourDomain', pathToFileOrDir, { debounceMs: 500 })
   ```

2. **Main: react to changes**  
   - If this config has its own service (like settings), subscribe to `getUserConfigWatcher().on('changed', (data) => { if (data.domain === 'yourDomain') yourService.reloadFromFile() })` (e.g. in `index.ts` next to the settings reload).
   - The existing subscription in `ipc/settings.ts` already forwards **all** domains to the renderer as `user-config:changed`. No change needed for the renderer to receive `{ domain: 'yourDomain' }`.

3. **Renderer: refetch when notified**  
   In the component that displays or edits this config:

   ```ts
   React.useEffect(() => {
     if (!window.api?.userConfig?.onChange) return
     const unsubscribe = window.api.userConfig.onChange((data: { domain: string }) => {
       if (data.domain === 'yourDomain') loadYourConfig()
     })
     return unsubscribe
   }, [loadYourConfig])
   ```

## Conventions

- **Domain id**: Use a short, unique string (e.g. `'settings'`, `'modes'`, `'customAgents'`). Same id is used in main (register + subscription) and renderer (onChange).
- **Path**: Can be a file or directory. For a file, the watcher watches the parent directory and filters by filename. For a directory, any change under it triggers one debounced event per domain.
- **Debounce**: Default 500 ms. Override with `{ debounceMs }` in `register()` if needed.
- **No config in the event**: The watcher only signals “something changed.” Consumers refetch via their existing APIs (e.g. `modes:listAll`, `settings:get`).

## Related

- Tool permission system: [Phase 7](../../product/backlog/tool-permission-system.md#phase-7-shared-user-config--file-watcher-next) (shared user-config / file watcher).
- Settings: [settings.md](../feature-guides/settings.md)
