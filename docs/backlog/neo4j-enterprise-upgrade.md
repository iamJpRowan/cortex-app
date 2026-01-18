[Docs](../README.md) / [Backlog](./README.md) / Neo4j Enterprise Edition Upgrade

# Neo4j Enterprise Edition Upgrade

## Goal

Upgrade from Neo4j Community Edition to Enterprise Edition to leverage native multi-database support, eliminating the need for data directory switching and Neo4j restarts when changing Knowledge Graphs.

## Constraints and Requirements

### Prerequisites
- Neo4j Enterprise Edition license
- Existing multi-knowledge graph implementation complete (Community Edition workaround)
- All Knowledge Graphs must be migrated to Enterprise database format

### Functional Requirements
- Replace data directory switching with native database operations
- Use `CREATE DATABASE` and `DROP DATABASE` Cypher commands
- Switch graphs via session `database` parameter (no restart required)
- Migrate existing Community Edition data directories to Enterprise databases
- Maintain backward compatibility during migration

### Non-Functional Requirements
- Zero downtime migration path
- Preserve all existing Knowledge Graph data
- Maintain existing UI/UX (no user-facing changes)
- Performance improvement: instant graph switching (no restart delay)

## Approach

### Service Layer Changes
- **Neo4j Service:** Remove data directory switching, add `createDatabase()` and `deleteDatabase()` Cypher commands
- **Knowledge Graph Service:** Update to use database names instead of data directory paths
- **Migration:** Script to convert existing data directories to Enterprise databases

### Key Simplifications
- Remove `NEO4J_DATA` environment variable switching
- Remove Neo4j stop/restart logic
- Use `driver.session({ database: 'db-name' })` for graph switching
- Optional: Leverage Enterprise user/role management for better security

## Architectural Choices

- Single Neo4j instance with multiple databases (vs. multiple data directories)
- Database names map 1:1 with Knowledge Graph IDs
- Migration preserves all metadata and credentials
- UI remains unchanged (implementation detail only)

## Success Criteria

- All existing Knowledge Graphs accessible as Enterprise databases
- Graph switching is instant (no restart delay)
- No data loss during migration
- Existing UI/UX unchanged
- Performance improvement measurable

## Notes

- Enterprise Edition provides native multi-database support
- Migration is one-time operation
- Consider Enterprise user/role features for enhanced security (optional)
- License cost vs. performance/UX benefits trade-off
