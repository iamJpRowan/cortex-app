[Docs](../README.md) / [Design](./README.md) / UI Terminology

# UI Terminology

This document establishes consistent terminology for UI elements in Cortex, aligned with industry standards and best practices.

## Core Layout Terms

### Sidebar

A **vertical area** along the left or right edge of the window, used for navigation, tool palettes, or auxiliary content that supports the main area.

**Properties:**
- Collapsible (can be hidden/shown)
- Resizable (user can adjust width)
- Persistent state (remembers collapsed/resized state)
- Can contain multiple panels

**Examples:**
- `LeftSidebar` - Navigation, component library, tool palette
- `RightSidebar` - Properties panel, inspector, details view

**Usage:**
```tsx
<LeftSidebar>
  <NavigationPanel />
  <ComponentLibraryPanel />
</LeftSidebar>
```

### Panel

A **distinct region** within a sidebar or center area that groups related content, tools, or functionality. Panels are substantial UI regions that remain visible or can be docked.

**Properties:**
- Can be nested within sidebars
- Movable (can be reordered within sidebar)
- Collapsible (can be minimized)
- Can contain components and widgets

**Examples:**
- `NavigationPanel` - File/project navigation
- `PropertiesPanel` - Property editor for selected items
- `ComponentLibraryPanel` - Browse available components/widgets
- `InspectorPanel` - Debug/inspection tools

**Usage:**
```tsx
<RightSidebar>
  <PropertiesPanel />
  <InspectorPanel />
</RightSidebar>
```

### View

The **content displayed** in a tab or main workspace area. Views represent what the user sees and interacts with - the actual content, not the container structure.

**Properties:**
- Switchable (can switch between different views)
- Persistent (can be saved/loaded)
- Can be displayed in tabs
- Content-focused (represents data/functionality)

**Examples:**
- `ChatView` - Chat interface with conversation history
- `GraphView` - Knowledge graph visualization
- `SettingsView` - Application settings
- `EditorView` - Document editor

**Usage:**
```tsx
<TabContainer>
  <Tab label="Chat">
    <ChatView />
  </Tab>
  <Tab label="Graph">
    <GraphView />
  </Tab>
</TabContainer>
```

### Component

A **reusable UI building block** that combines structure, styling, and behavior. Components are modular units that can be composed to build larger interfaces.

**Properties:**
- Composable (can be combined with other components)
- Reusable (used in multiple places)
- Encapsulated (has its own state and behavior)
- Follows component lifecycle patterns

**Examples:**
- `Button` - Interactive button element
- `Card` - Container with styling
- `StatusMessage` - Status/notification display
- `Input` - Form input field

**Usage:**
```tsx
<Card>
  <StatusMessage type="success">Saved!</StatusMessage>
  <Button onClick={handleAction}>Click me</Button>
</Card>
```

**File Organization:**
- Components live in `src/renderer/src/components/`
- Use PascalCase naming: `PersonCard.tsx`, `StatusMessage.tsx`

### Widget

A **small, draggable, composable UI element** that can be assembled by users to build custom views. Widgets are typically smaller than full panels and are designed for user customization.

**Properties:**
- Draggable (can be moved via drag-and-drop)
- Droppable (can be placed in drop zones)
- Configurable (user can customize settings)
- Plugin-provided (can come from plugins)

**Examples:**
- `DataWidget` - Display data in various formats
- `ChartWidget` - Visualize data as charts
- `NoteWidget` - Quick note-taking widget
- `TimerWidget` - Countdown/timer display

**Usage:**
```tsx
// Widgets can be dragged from library to sidebars or center area
<ComponentLibraryPanel>
  <WidgetCard widget={DataWidget} />
  <WidgetCard widget={ChartWidget} />
</ComponentLibraryPanel>

// User-assembled view with widgets
<CustomView>
  <DataWidget config={userConfig} />
  <ChartWidget config={userConfig} />
</CustomView>
```

## Layout Hierarchy

```
Window
  ├── LeftSidebar
  │   └── Panel (e.g., NavigationPanel)
  │       └── Component/Widget
  ├── CenterArea (Main Content)
  │   └── TabContainer
  │       └── Tab
  │           └── View (e.g., ChatView)
  │               └── Component/Widget
  └── RightSidebar
      └── Panel (e.g., PropertiesPanel)
          └── Component/Widget
```

## File Organization

```
src/renderer/src/
  ├── components/     # Reusable UI components (Button, Card, Input, etc.)
  ├── panels/         # Panel components (NavigationPanel, PropertiesPanel, etc.)
  ├── views/          # View components (ChatView, GraphView, etc.)
  └── widgets/        # Widget components (DataWidget, ChartWidget, etc.)
```

## Naming Conventions

- **Sidebars**: `LeftSidebar`, `RightSidebar`
- **Panels**: `[Purpose]Panel` (e.g., `NavigationPanel`, `PropertiesPanel`)
- **Views**: `[Purpose]View` (e.g., `ChatView`, `GraphView`)
- **Components**: `[Purpose]` (e.g., `Button`, `Card`, `StatusMessage`)
- **Widgets**: `[Purpose]Widget` (e.g., `DataWidget`, `ChartWidget`)

## See Also

- [UI Guide](./ui-guide.md) - Component usage patterns and styling
- [Design Tokens](./design-tokens.md) - Visual design system
- [Accessibility](./accessibility.md) - Accessibility patterns
