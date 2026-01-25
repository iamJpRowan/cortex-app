---
date: 2025-01-24
developer: Jp Rowan
agent: Auto (Cursor)
model: claude-sonnet-4.5
tags: [react, shadcn-ui, migration, electron, typescript, eslint, frameless-window, ui-components]
related_files:
  - docs/backlog/react-shadcn-migration.md
  - src/renderer/src/App.tsx
  - src/renderer/src/components/TitleBar.tsx
  - src/renderer/src/components/ui/button.tsx
  - src/renderer/src/lib/utils.ts
  - src/main/index.ts
  - src/main/ipc/window.ts
  - src/preload/index.ts
  - src/renderer/src/types/api.d.ts
  - components.json
  - eslint.config.cjs
  - electron.vite.config.ts
  - tsconfig.json
  - src/renderer/src/main.css
related_issues: []
related_devlogs: []
session_duration: ~6 hours
iterations: 3 phases with incremental testing and cleanup
outcome: Complete migration to React + shadcn/ui with frameless window, all linting errors resolved, ESLint integrated into pre-commit hooks
---

[Docs](../README.md) / [Devlogs](./README.md) / React + shadcn/ui Migration

# Context

Cortex was built with vanilla JSX using a custom `createElement` implementation. While functional, this approach had limitations:
- No access to React ecosystem (data visualization libraries, testing tools, etc.)
- Manual component state management via closures
- No component library for faster development
- Custom JSX runtime added complexity

The goal was to migrate to React + shadcn/ui to enable faster development, access to the React ecosystem, and a more maintainable codebase while preserving the existing design system and Electron architecture.

# Problem

Several challenges needed addressing:

1. **Migration Strategy**: How to migrate from vanilla JSX to React without breaking existing functionality
2. **Design Token Integration**: How to map shadcn/ui's expected tokens to our semantic design token system
3. **Component Library Choice**: shadcn/ui was chosen for its copy-paste approach, Tailwind styling, and customization flexibility
4. **Frameless Window**: Implementing custom window controls for Electron's frameless window
5. **Platform Support**: Deciding whether to implement Windows/Linux controls immediately or defer until testing available
6. **Linting Setup**: Migrating to ESLint v9's new flat config format while maintaining React support

# Solution

## Phase 1: React Setup

**Dependencies & Configuration:**
- Installed React 19.2.3, ReactDOM, and TypeScript types
- Updated `tsconfig.json`: Changed `jsx` from `"react"` with custom factories to `"react-jsx"` (automatic runtime)
- Added `@vitejs/plugin-react` to Vite renderer config
- Renamed `main.ts` to `main.tsx` and updated to use React 18's `createRoot`

**Cleanup:**
- Removed `lib/jsx.ts` and `jsx.d.ts` (vanilla JSX implementation)
- Removed old vanilla JSX components (Layout, LeftSidebar, CenterArea, etc.)
- Updated validation scripts to allow Tailwind utilities (`duration-*`, `ease-*`, `p-*`, `m-*`, etc.)

**Linting:**
- Installed ESLint with React plugins (`eslint-plugin-react`, `eslint-plugin-react-hooks`)
- Created initial `.eslintrc.json` (later migrated to flat config)

## Phase 2: shadcn/ui Setup

**Initialization:**
- Created `components.json` with configuration for Electron + Vite + React
- Set components directory to `src/renderer/src/components/ui/`
- Configured aliases to use relative paths (shadcn CLI doesn't understand TypeScript path aliases)

**Design Token Mapping:**
- Added shadcn token mappings to `main.css` for all themes (light, dark, system preference)
- Key mappings:
  - `--background` → `--color-bg-primary`
  - `--foreground` → `--color-text-primary`
  - `--primary` → `--color-base-900` (grayscale, not accent)
  - `--radius` → `--radius-base`
- Preserved semantic token system while making shadcn components work seamlessly

**Utilities:**
- Created `lib/utils.ts` with `cn()` helper (clsx + tailwind-merge)
- Installed `clsx` and `tailwind-merge` dependencies
- Installed initial shadcn button component

**Path Aliases:**
- Configured `@/` alias in both Vite (`electron.vite.config.ts`) and TypeScript (`tsconfig.json`)
- Both point to `./src/renderer/src` for consistency

## Phase 3: Frameless Window (macOS)

**Window Configuration:**
- Updated `BrowserWindow` with `frame: false` and `titleBarStyle: 'hiddenInset'`
- `hiddenInset` provides native macOS traffic light controls while allowing custom title bar

**IPC Handlers:**
- Created `src/main/ipc/window.ts` with handlers for:
  - `window:close` - Close window
  - `window:minimize` - Minimize window
  - `window:maximize` - Toggle maximize/restore
  - `window:isMaximized` - Get current state
  - Window state change events (`window:maximized`, `window:unmaximized`)

**TitleBar Component:**
- Created React component with draggable title bar (`WebkitAppRegion: 'drag'`)
- Positioned title with `pl-20` (80px) to avoid overlapping native macOS traffic light buttons
- Platform-aware: Only shows custom controls on Windows/Linux (deferred until testing available)

**Decision: macOS-Only Implementation**
- Removed Windows/Linux window controls code since testing wasn't available
- Kept IPC handlers and API types for future implementation
- Added TODO comments for when cross-platform testing becomes available

## Cleanup & Linting

**ESLint Migration:**
- Migrated from `.eslintrc.json` to `eslint.config.cjs` (ESLint v9 flat config)
- Added proper Node.js and browser globals
- Configured React and TypeScript plugins

**Linting Errors Fixed:**
- Removed unused imports (`initializeOllama`, `app`)
- Removed unused error variables in catch blocks
- Replaced all `any` types with `unknown` or proper types:
  - `Record<string, any>` → `Record<string, unknown>`
  - Error type casting improved with proper intersection types
- Fixed TypeScript errors from type changes

**Pre-commit Integration:**
- Added `eslint --fix` to `.lintstagedrc.json` as first step for `*.{ts,tsx}` files
- ESLint now runs automatically on staged files before commit

# Outcome

**What Works Now:**
- ✅ React 19 + ReactDOM fully integrated
- ✅ shadcn/ui initialized and configured
- ✅ Design tokens mapped to shadcn components
- ✅ Frameless window with native macOS traffic lights
- ✅ Draggable title bar
- ✅ All linting errors resolved
- ✅ ESLint integrated into pre-commit hooks
- ✅ TypeScript compilation passes
- ✅ Validation scripts updated for Tailwind utilities

**Component Status:**
- Button component installed and working
- TitleBar component functional
- Ready for Phase 4: Layout structure implementation

**Code Quality:**
- All files pass ESLint with 0 errors
- TypeScript strict mode passes
- Pre-commit hooks validate code automatically

# Notes

**Key Decisions:**

1. **Design Token Strategy**: Kept only color tokens, removed spacing/typography/transitions. Rationale: Tailwind provides these scales out of the box, custom tokens add complexity without clear benefit.

2. **Primary Color = Grayscale**: Mapped shadcn's `--primary` to `--color-base-900` (grayscale) instead of accent colors. This maintains the monochromatic aesthetic while allowing shadcn components to work.

3. **macOS-Only Window Controls**: Deferred Windows/Linux implementation until testing available. Better to have working, tested code than untested cross-platform code.

4. **Path Alias Configuration**: Used relative paths in `components.json` because shadcn CLI doesn't understand TypeScript path aliases. TypeScript and Vite still use `@/` alias for imports.

**Challenges Encountered:**

1. **Path Alias Mismatch**: shadcn CLI created components with absolute paths instead of using aliases. Fixed by updating `components.json` to use relative paths.

2. **ESLint v9 Migration**: Required learning new flat config format and proper globals configuration. The migration was necessary because ESLint v9 no longer supports `.eslintrc.*` files by default.

3. **Type Safety**: Replacing `any` types required careful type casting, especially for error objects with custom properties (like Ollama errors with `status_code`).

**Future Work:**

- Phase 4: Implement layout structure (LeftSidebar, RightSidebar, CenterArea, TabContainer)
- Windows/Linux window controls when testing available
- Additional shadcn components as needed (Card, Input, Select, etc.)
- Consider adding React Testing Library for component tests

**Lessons Learned:**

- Testing platform-specific features is crucial before committing code
- Removing untested code paths improves maintainability
- ESLint migration requires understanding both old and new config formats
- shadcn CLI path resolution differs from TypeScript/Vite path resolution
