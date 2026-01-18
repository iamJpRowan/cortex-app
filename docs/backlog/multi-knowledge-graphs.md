[Docs](../README.md) / [Backlog](./README.md) / Multi-Knowledge Graph Support

# Multi-Knowledge Graph Support

## Goal

Enable users to create and manage multiple Neo4j databases (called "Knowledge Graphs") within a single Cortex application instance. Users can create new graphs, switch between them, and the app will automatically reopen the last active graph on startup. Each Knowledge Graph has its own isolated data and credentials, allowing users to organize different knowledge domains separately.

## Constraints and Requirements

### Prerequisites
- Neo4j Community Edition (which only supports one database per instance)
- Existing Neo4j service integration complete
- OS-level keychain access for secure password storage

### Functional Requirements
- **Create Knowledge Graphs:** User can create new graphs with a display name and password
- **Auto-reopen:** Last active graph automatically opens on app startup
- **Graph Selection:** User can select/create graph on first launch or when no graph is active
- **Switch Graphs:** User can switch between graphs 
- **Password Management:** Set password on creation, update password (user provides new password), but never reveal current password
- **Delete Graphs:** User can delete any graph, including deleting all graphs

### UI/UX Requirements
- Single-page Knowledge Graph Manager on first launch or when no graph selected
- All operations (create, open, update password, delete) handled inline on single page
- No separate dialogs or modals - everything appears inline
- Back button in TestPanel to return to graph selection page
- Native Electron File menu with single "Open" option to navigate back to selection page
- Create form appears inline when "Create New" is clicked
- Update password form appears inline when button clicked (user provides new password)
- Delete confirmation appears inline

### Non-Functional Requirements
- Passwords stored securely in OS keychain, never in plaintext
- Graph switching requires Neo4j restart with different data directory.  
- Each graph has isolated data directory
- Metadata stored in JSON file (no passwords in metadata)
- Graceful handling of missing keychain entries or corrupted metadata

## Approach

### Architecture: Separate Data Directories

Since Neo4j Community Edition only supports one database per instance, we use separate data directories per Knowledge Graph:
- Each Knowledge Graph = separate Neo4j data directory
- Single Neo4j server process
- Switch graphs by changing `NEO4J_DATA` environment variable
- Stop/restart Neo4j when switching graphs

### Storage Structure

```
userData/
  neo4j-data/              # Base directory
    kg-001/                # Knowledge Graph 1
      data/
        databases/
        dbms/
          auth.ini         # Neo4j password hash
    kg-002/                # Knowledge Graph 2
      data/
        databases/
        dbms/
          auth.ini
  knowledge-graphs.json    # App metadata (no passwords)
```

### Metadata Schema

```typescript
{
  "knowledgeGraphs": [
    {
      "id": "kg-001",                    // Auto-generated UUID
      "name": "Personal Knowledge",       // User-provided display name
      "dataDirectory": "kg-001",         // Auto-generated, sanitized
      "username": "neo4j",                // Always 'neo4j' for Community Edition
      "createdAt": "2025-01-12T10:00:00Z",
      "lastOpenedAt": "2025-01-12T15:30:00Z"
    }
  ],
  "lastActiveGraphId": "kg-001"          // For auto-reopen on app start
}
```

### Credential Management

**Password Storage:**
- Passwords stored in OS keychain using `keytar` package
- Key: `cortex-app`, Service: `kg-{graphId}`
- Never stored in JSON metadata
- Never displayed in UI

**Password Operations:**
- **Set Password:** On graph creation, user sets password
- **Update Password:** User can update password by providing new password (updates Neo4j and keychain)
- **Never Reveal:** Current password is never displayed or accessible

**For External Tools:**
- Users can update password to a known value for external tool access
- Connection details: `bolt://127.0.0.1:7687`, username: `neo4j`
- Password must be updated if needed (current password never revealed)

### Service Layer

**Knowledge Graph Management Service** (`src/main/services/knowledge-graphs.ts`):
- CRUD operations for graph metadata
- Load/save `knowledge-graphs.json`
- Track last active graph
- Generate unique IDs and sanitized database names
- Interface with OS keychain for password operations

**Updated Neo4j Service** (`src/main/services/neo4j.ts`):
- Accept `dataDirectory` parameter
- Switch data directories by changing `NEO4J_DATA` env var
- Stop/restart Neo4j when switching graphs
- Set passwords via `neo4j-admin dbms set-initial-password` before first start

### IPC Handlers

Create `src/main/ipc/knowledge-graphs.ts`:
- `knowledge-graphs:list` - Get all graphs
- `knowledge-graphs:create` - Create new graph (name, password)
- `knowledge-graphs:open` - Switch to a graph
- `knowledge-graphs:get-current` - Get currently active graph
- `knowledge-graphs:update-password` - Update password for a graph (user provides new password)
- `knowledge-graphs:delete` - Delete a graph

**Native Menu Integration:**
- Create File menu in main process (`src/main/menu.ts` or similar)
- Menu items trigger IPC handlers or direct service calls
- Menu updates when graph changes (listen to IPC events or state changes)
- Use Electron's `Menu.setApplicationMenu()` API

### UI Components

**Knowledge Graph Manager** (`src/renderer/src/components/KnowledgeGraphManager.tsx`):
- Single-page component that handles all operations inline
- Full-screen page shown when no graph selected
- State management: `showCreateForm`, `updatingPasswordGraphId`, `deletingGraphId`
- **Create New:** Button toggles inline form (name + password fields)
- **Graph List:** Each graph shows name with buttons: [Open] [Update Password] [Delete]
- **Update Password:** Inline form appears when button clicked (new password input field)
- **Delete:** Inline confirmation appears when button clicked
- **Open:** Switches to TestPanel UI
- All operations happen inline - no separate dialogs or modals
- Replaces main app interface until a graph is selected

**TestPanel Enhancement** (`src/renderer/src/components/TestPanel.tsx`):
- Add "Back to Graph Selection" button at top
- Button navigates back to Knowledge Graph Manager page
- Existing test functionality remains unchanged

### Native Menu Integration

**File Menu** (created in main process using Electron Menu API):
- Single menu item: "Open Knowledge Graph..." 
- Navigates back to Knowledge Graph Manager selection page
- Available when a graph is active
- Uses standard keyboard shortcut (Cmd+O on macOS)
- Simple, minimal menu - all other operations handled in UI

### App Startup Flow

1. Start Neo4j server (if not running)
2. Check for `knowledge-graphs.json`
3. If exists and has `lastActiveGraphId`:
   - Load password from keychain
   - Switch Neo4j to that graph's data directory
   - Connect and open that graph
   - Show TestPanel interface
4. If no graphs exist:
   - Show Knowledge Graph Manager page (full-screen)
5. If graphs exist but none selected:
   - Show Knowledge Graph Manager page (full-screen)

**App Component Logic:**
- Conditionally render: `currentGraph ? TestPanel() : KnowledgeGraphManager()`
- Knowledge Graph Manager handles all operations (create, open, update password, delete) inline
- After opening a graph, app transitions to TestPanel
- TestPanel has "Back" button to return to Knowledge Graph Manager
- File menu "Open" option also returns to Knowledge Graph Manager

## Architectural Choices

### Database Naming
- Auto-generated from user-provided name (sanitized + UUID suffix)
- Format: `kg_{sanitized_name}_{uuid}`
- Ensures uniqueness and avoids special character issues

### Credential Security
- OS keychain for password storage (encrypted by OS)
- Never store passwords in JSON or plaintext files
- Never display current password in UI
- Only show password once after reset (with copy option)

### Graph Switching
- Requires Neo4j process stop/restart
- Change `NEO4J_DATA` environment variable
- Reconnect with graph-specific credentials
- May have brief delay during switch

### Password Management
- Set password on creation (required, user provides)
- Update password available (user provides new password)
- Current password never accessible or displayed
- For external tools: user must update to known password if needed

### Data Isolation
- Each graph has completely separate data directory
- No data sharing between graphs
- Deleting a graph removes its entire data directory
- No cross-graph queries possible

### Dependencies
- **Requires:** Existing Neo4j service integration
- **Requires:** `keytar` package for OS keychain access
- **Enables:** Future features that can work with multiple knowledge domains
- **Future:** Could support graph export/import, graph-specific settings

## Success Criteria

- User can create a new Knowledge Graph with name and password (inline form on single page)
- App automatically reopens last active graph on startup
- Single-page Knowledge Graph Manager handles all operations (create, open, reset, delete)
- All operations appear inline - no separate dialogs or modals
- TestPanel has "Back to Graph Selection" button
- File menu has single "Open" option to return to selection page
- Each graph has isolated data (no cross-contamination)
- Passwords are stored securely and never displayed
- User can update password inline (provides new password)
- User can delete graphs inline (including all graphs)
- Graph switching works reliably (stop/restart Neo4j with new data directory)
- Graceful handling of missing graphs, corrupted metadata, or keychain errors

## Implementation Steps

High-level implementation order (each step is independently testable and commit-ready):

1. **Knowledge Graph Service** - Metadata CRUD operations, JSON storage, ID generation
2. **Keychain Integration** - Password storage/retrieval using OS keychain
3. **Neo4j Data Directory Switching** - Support multiple data directories, switch between them
4. **Password Setting** - Set initial passwords via neo4j-admin for new directories
5. **Service Integration** - Connect graph creation to Neo4j setup (directory + password)
6. **IPC Handlers** - Expose all operations to renderer process
7. **Knowledge Graph Manager UI** - Single-page component with inline operations
8. **App Integration** - Conditional rendering (Manager vs TestPanel), auto-open last graph
9. **TestPanel Back Button** - Navigation back to graph selection
10. **Native File Menu** - "Open Knowledge Graph..." menu item

## Notes

- This approach works around Neo4j Community Edition's single-database limitation
- Graph switching requires Neo4j restart, which may cause brief delay
- Password update allows users to change password if forgotten (user provides new password)
- For external tools, users should update password to a known value
- Future enhancements could include: graph export/import, graph templates, graph-specific settings, rename graphs
- Consider adding confirmation dialogs for destructive operations (delete graph)
- May want to add graph metadata (description, tags) in future iterations
