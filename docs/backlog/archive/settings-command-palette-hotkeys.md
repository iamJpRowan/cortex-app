---
status: completed
completed_date: 2025-01-25
---

[Docs](../../README.md) / [Backlog](../README.md) / Archive / Settings, Command Palette & Hotkeys

# Settings, Command Palette & Hotkeys

## Implementation status

Phases 1–6 are implemented. For adding new commands or hotkeys, see **[Commands and Hotkeys](../../development/commands-and-hotkeys.md)** in the development guide. For adding new settings, see **[Settings](../../development/settings.md)**.

## Goal

Implement a comprehensive settings system with JSON file storage (editable via UI and file), a command palette for quick actions, and app-level hotkey support. Migrate theme management from localStorage to the settings system. Establish patterns that support future extensibility for user-configurable hotkeys and additional settings.

## Key Capabilities

### Settings System
- **JSON File Storage**: Settings stored in `userData/settings.json` (editable via UI and file)
- **Override-Only Storage**: JSON file only contains settings that differ from defaults (like VSCode)
- **Defaults in Code**: Default values defined in main process code, merged with file overrides
- **Dot Notation Keys**: Use flat structure with dot notation (e.g., `appearance.theme`, `editor.fontSize`) instead of nested objects
- **Bidirectional Sync**: Changes in UI update JSON file, changes in JSON file update UI (file watching)
- **Merging Logic**: Settings service merges `{ ...defaults, ...fileOverrides }` to get current values
- **Schema Validation**: Validate settings against schema with sensible defaults
- **File Watching**: Watch settings.json for external changes and sync to UI
- **Theme Migration**: Migrate theme from localStorage to settings.json (no backward compatibility)

### Command Palette (Kbar)
- **Basic Implementation**: Core command palette with room to grow
- **Command Registration**: Static command registration initially (extensible to dynamic)
- **Command Categories**: Group commands by category (Settings, Navigation, Actions)
- **Keyboard Shortcut**: Cmd+K (Mac) / Ctrl+K (Windows/Linux) to open
- **Search**: Filter commands by name/description
- **Initial Commands**: Open Settings, Change Theme, Navigate to views

### Hotkeys
- **App-Level Shortcuts**: Register app-wide keyboard shortcuts (work when app window is focused)
- **Fixed Initially**: Hardcoded shortcuts for core actions
- **Path to Configuration**: Architecture supports future user-configurable hotkeys
- **Core Shortcuts**:
  - `Cmd+K` / `Ctrl+K`: Open command palette
  - `Cmd+,` / `Ctrl+,`: Open settings
  - `Cmd+B` / `Ctrl+B`: Toggle sidebar (future)
- **Storage**: Hotkey bindings stored in settings.json (prepared for future UI configuration)

## Implementation Approach

### Phase 1: Settings Service (Main Process)
1. Create settings service (`src/main/services/settings.ts`)
   - Define defaults schema in code (all possible settings with default values)
   - Read overrides from `settings.json` from `app.getPath('userData')`
   - Merge defaults with file overrides: `currentSettings = { ...defaults, ...fileOverrides }`
   - Implement dot notation key parsing (e.g., `appearance.theme` → `{ appearance: { theme: value } }`)
   - When saving: only write values that differ from defaults (remove keys that match defaults)
   - File watching for external changes
   - Emit events on changes
2. Create settings IPC handlers (`src/main/ipc/settings.ts`)
   - `settings:get` - Get all settings (merged view) or specific key
   - `settings:set` - Set setting value (dot notation key), only writes if different from default
   - `settings:get-file-path` - Get path to settings.json (for "Open in Editor")
   - `settings:on-change` - Subscribe to settings changes
3. Update preload and API types
   - Add settings API to preload
   - Add TypeScript types for settings API

### Phase 2: Settings UI Component
1. Create settings view component (`src/renderer/src/components/SettingsView.tsx`)
   - Form-based settings UI (not raw JSON editor)
   - Settings list/table UI with form controls
   - Theme selector (dropdown: light/dark/system) as first setting
   - Display current values (merged view: defaults + overrides)
   - Form controls for each setting (dropdowns, toggles, inputs as appropriate)
   - "Open in Editor" button (opens settings.json in user's default editor)
   - File path display
   - Note: Raw JSON editor component deferred until text editor is available
2. Integrate settings view into app
   - Add settings as a standard main content area view
   - Connect sidebar Settings button to settings view
   - Settings view renders in main content area (not a Sheet/panel)

### Phase 3: Theme Migration
1. Update theme system (`src/renderer/src/lib/theme.ts`)
   - Remove localStorage usage
   - Use settings API instead
   - Migrate existing localStorage theme to settings.json on first run
   - Update `initTheme()` to read from settings
   - Update `setTheme()` to write to settings
2. Remove backward compatibility
   - Remove localStorage fallback
   - Clean up old theme storage code

### Phase 4: Command Palette (Kbar)
1. Install and set up Kbar
   - Install `kbar` package
   - Create Kbar provider wrapper (`src/renderer/src/components/CommandPalette.tsx`)
   - Set up KBarProvider in App root
2. Create command registry
   - Define command interface
   - Create initial commands:
     - Open Settings
     - Change Theme (light/dark/system)
     - Navigate to Home
     - Navigate to Chat
     - Navigate to Graph
   - Group commands by category
3. Integrate command palette
   - Render Kbar component
   - Add keyboard shortcut handler
   - Style to match app design

### Phase 5: Hotkeys System
1. Create hotkeys service (`src/renderer/src/lib/hotkeys.ts`)
   - Register app-level shortcuts (work when app window is focused)
   - Handle keyboard events
   - Map shortcuts to actions
   - Support Cmd (Mac) vs Ctrl (Windows/Linux)
2. Register core hotkeys
   - `Cmd+K` / `Ctrl+K`: Open command palette
   - `Cmd+,` / `Ctrl+,`: Open settings
3. Store hotkey bindings in settings
   - Add `hotkeys.*` keys to settings schema
   - Prepare structure for future UI configuration
   - Read hotkey bindings from settings

### Phase 6: Integration & Polish
1. Connect all pieces
   - Settings changes update UI
   - Command palette commands trigger actions
   - Hotkeys trigger commands
   - File watching updates UI
2. Add "Open in Editor" functionality
   - IPC handler to open settings.json in default editor
   - Button in settings UI
3. Error handling
   - Handle invalid JSON in settings file
   - Handle file permission errors
   - Handle schema validation errors
4. Documentation
   - Document settings schema
   - Document available commands
   - Document hotkey bindings

## Constraints and Requirements

### Technical Constraints
- Settings file must be valid JSON (no JSON5/YAML initially)
- Dot notation keys must be parsed correctly
- File watching must be efficient (debounce if needed)
- Settings must persist across app restarts
- IPC handlers must validate inputs
- Hotkeys must work when app window is focused (standard app-level shortcuts, not system-wide)

### Functional Requirements
- Settings editable via form-based UI (dropdowns, toggles, inputs) and JSON file (external editor)
- Settings file only contains overrides (values differing from defaults)
- Settings UI shows merged view (defaults + overrides)
- Changes in JSON file must reflect in UI (file watching)
- Changes in UI must update JSON file immediately (only if different from default)
- "Open in Editor" button opens settings.json in user's default editor
- New settings can be added to defaults without requiring file updates
- Theme must work immediately after migration
- Command palette must be searchable and keyboard navigable
- Hotkeys must not conflict with system shortcuts
- Settings file must have sensible defaults if missing or invalid
- Note: Raw JSON editor component in UI deferred until text editor is available

### Future Extensibility
- **User-Configurable Hotkeys**: Settings structure supports hotkey configuration (stored as `hotkeys.*` keys)
- **Dynamic Commands**: Command registry can be extended for plugin-provided commands
- **Settings Categories**: UI can be extended to group settings by category
- **Settings Validation**: Schema validation can be extended for new settings
- **Settings Migration**: Structure supports versioning and migration

## Architectural Choices

### Settings Storage
- **Location**: `app.getPath('userData') + '/settings.json'`
- **Format**: JSON (valid, parseable)
- **Structure**: Flat keys with dot notation (e.g., `appearance.theme: 'dark'`)
- **Override-Only**: File only contains settings that differ from defaults (like VSCode)
- **Defaults**: Defined in main process code, never written to file
- **Merging**: Settings service merges `{ ...defaults, ...fileOverrides }` to get current values
- **Saving Logic**: When saving, only write values that differ from defaults (removes keys matching defaults)
- **Watching**: Use Node.js `fs.watch` or `chokidar` for file watching

### Dot Notation Parsing
- Parse `appearance.theme` into nested object: `{ appearance: { theme: value } }`
- Flatten nested object back to dot notation for storage
- Support nested keys of arbitrary depth

### Settings Schema
```typescript
interface Settings {
  'appearance.theme': 'light' | 'dark' | 'system'
  'hotkeys.commandPalette': string  // e.g., 'Cmd+K'
  'hotkeys.settings': string        // e.g., 'Cmd+,'
  // Future settings can be added here
}
```

### Command Palette
- Use Kbar library for core functionality
- Commands defined statically initially
- Command structure:
  ```typescript
  interface Command {
    id: string
    name: string
    shortcut?: string
    keywords?: string[]
    perform: () => void
    section?: string
  }
  ```

### Hotkeys
- Register in renderer process (app-level shortcuts when window is focused)
- Use Electron's keyboard event handling
- Map platform-specific modifiers (Cmd vs Ctrl)
- Shortcuts work when app window is focused (not system-wide)
- Store bindings in settings.json under `hotkeys.*` keys
- Architecture supports future UI for reconfiguration

### IPC Pattern
- Follow existing IPC naming convention: `settings:*`
- Return consistent response format: `{ success: boolean, data?: any, error?: string }`
- Validate all inputs in main process
- Emit events for settings changes

## Success Criteria

1. ✅ Settings service reads/writes `settings.json` correctly
2. ✅ Settings file only contains overrides (values differing from defaults)
3. ✅ Settings service merges defaults with file overrides correctly
4. ✅ Settings support dot notation keys (e.g., `appearance.theme`)
5. ✅ Settings UI displays merged view (defaults + overrides)
6. ✅ Settings UI only writes overrides to file (removes keys matching defaults)
7. ✅ Settings file is editable externally and changes reflect in UI
8. ✅ New settings can be added to defaults without requiring file updates
9. ✅ Theme migrated from localStorage to settings.json
10. ✅ Theme works correctly after migration
11. ✅ Command palette opens with Cmd+K / Ctrl+K
12. ✅ Command palette shows initial commands (Settings, Theme, Navigation)
13. ✅ Commands execute correctly
14. ✅ Hotkeys register and trigger actions
15. ✅ Core hotkeys work (Cmd+K for palette, Cmd+, for settings)
16. ✅ Settings file has sensible defaults if missing/invalid
17. ✅ File watching updates UI when settings.json changes externally
18. ✅ "Open in Editor" button opens settings.json
19. ✅ No localStorage theme code remains
20. ✅ Settings structure supports future hotkey configuration

## Notes

### Settings File Location
- **macOS**: `~/Library/Application Support/Cortex/settings.json`
- **Windows**: `%APPDATA%\Cortex\settings.json`
- **Linux**: `~/.config/Cortex/settings.json`

### Override-Only Example

**Defaults (defined in code):**
```typescript
const defaults = {
  'appearance.theme': 'system',
  'hotkeys.commandPalette': 'Cmd+K',
  'hotkeys.settings': 'Cmd+,'
}
```

**User's settings.json (only overrides):**
```json
{
  "appearance.theme": "dark"
}
```
(Only contains `appearance.theme` because user changed it from default `'system'` to `'dark'`)

**Merged result (what UI sees):**
```typescript
{
  'appearance.theme': 'dark',        // from file (override)
  'hotkeys.commandPalette': 'Cmd+K', // from defaults
  'hotkeys.settings': 'Cmd+,'        // from defaults
}
```

**Dot Notation Parsing:**
Internally, `appearance.theme` is parsed into nested object structure for easier manipulation:
```json
{
  "appearance": {
    "theme": "dark"
  }
}
```
But stored in file as flat dot notation: `"appearance.theme": "dark"`

### Future Enhancements
- **Raw JSON Editor**: In-app JSON editor component for direct settings.json editing (deferred until text editor component is available)
- User-configurable hotkeys UI
- Settings search/filter
- Settings import/export
- Settings validation UI
- Command palette plugin API
- Nested command groups in palette
- Command aliases
- Settings categories/tabs in UI

### Related Backlog Items
- **[Configuration System](../configuration-system.md)** - This is a user-facing subset focused on UI preferences. The full configuration system would handle service-level configs (LLM, tools, etc.)
