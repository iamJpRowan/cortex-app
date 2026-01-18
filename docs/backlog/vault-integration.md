# Vault Configuration and Data Integration

## Goal

Enable Cortex to work with real Obsidian vault data by configuring the vault path and establishing the connection workflow. This feature focuses on configuration and verification rather than automated sync - users will manually sync their vault data to Neo4j using the existing obsidian-graphdb-sync plugin. The app should be able to query and verify that real vault data is available in the embedded Neo4j instance.

## Constraints and Requirements

### Prerequisites
- Step 2 complete (Neo4j server running and accessible)
- Obsidian vault with existing data
- obsidian-graphdb-sync plugin installed in Obsidian
- User has ability to run manual sync from Obsidian

### Functional Requirements
- Configure vault path via environment variable
- Load vault path during app initialization
- Validate vault path exists (optional, but helpful)
- Provide clear documentation for manual sync process
- Add test query capability to verify real vault data is present
- Display sample data from vault (e.g., Person nodes)

### Configuration Requirements
- Vault path stored in `.env` file (not committed to git)
- `.env.template` file provided as example
- Environment variable: `VAULT_PATH`
- App should fail gracefully if path not configured (with helpful message)

### Integration Requirements
- Manual sync process documented clearly
- Connection details for obsidian-graphdb-sync plugin specified
- Test queries should work against real vault data structure
- Should handle empty database gracefully (no data synced yet)

### Non-Functional Requirements
- No automated sync in Phase 0 (manual process only)
- No file operations on vault (read-only verification)
- Configuration should be simple and clear
- Documentation should be comprehensive but concise

## Approach

### Configuration Management
- Use `dotenv` package to load environment variables
- Load configuration early in main process startup
- Validate vault path exists (optional check)
- Provide clear error if path not configured
- Create `.env.template` for user reference

### Documentation
- Create manual sync instructions document
- Include prerequisites, step-by-step process, and verification steps
- Document connection settings for obsidian-graphdb-sync plugin
- Provide example queries for testing vault data

### Test Query Integration
- Add new IPC handler for vault data queries
- Query real data structure (e.g., Person nodes)
- Return sample results with count information
- Add UI button to test vault data (extends TestPanel)
- Display results in readable format

### Data Verification
- Test queries should check for expected node types (Person, etc.)
- Return sample data to confirm sync worked
- Handle empty results gracefully (no data synced yet)
- Provide helpful messages if no data found

## Architectural Choices

### Environment Configuration
- Use standard `.env` file pattern (not Electron-specific config)
- Load via `dotenv` in main process only
- No renderer process access to vault path (security boundary)
- Template file helps users configure correctly

### Manual Sync Strategy
- Rely on existing obsidian-graphdb-sync plugin
- App provides Neo4j server; plugin handles sync
- No sync automation in Phase 0 (keeps scope manageable)
- Clear documentation bridges the gap

### Query Pattern
- Use simple Cypher queries to verify data presence
- Query common node types (Person, File, etc.)
- Return limited results for display (e.g., 5-10 items)
- Include count information for context

### Error Handling
- Graceful handling if vault path not configured
- Clear messages if no data found (sync not run yet)
- Distinguish between "no config" and "no data" scenarios
- Provide actionable guidance in error messages

### Dependencies
- **Requires:** Step 2 (Neo4j server), Step 4 (Test UI for button)
- **Uses:** Environment variable pattern, existing IPC structure
- **Enables:** Phase 1 features that work with real vault data
- **External:** obsidian-graphdb-sync plugin (user responsibility)

## Success Criteria

- Vault path can be configured via `.env` file
- App loads and validates vault path on startup
- Manual sync documentation is clear and complete
- User can successfully sync vault data to Neo4j
- Test query returns real vault data (Person nodes, etc.)
- UI displays sample data correctly
- App handles missing configuration gracefully
- App handles empty database gracefully

## Notes

- This is configuration and verification only - no file operations yet
- Manual sync keeps Phase 0 scope manageable
- Future phases can add automated sync if needed
- Vault path is for reference/documentation in Phase 0
- Real file operations come in Phase 1
- Test queries assume standard obsidian-graphdb-sync node structure
- Connection details (host, port, credentials) match embedded Neo4j settings
