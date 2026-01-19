[Docs](../README.md) / [Architecture](./README.md) / Deployment Model

# Deployment Model

## Distribution

- **Package Format**: .app (macOS), .exe installer (Windows), .AppImage (Linux)
- **Initial Download**: ~500MB-1GB (includes Neo4j server, app code)
- **Installation**: Drag-and-drop or installer, minimal configuration
- **Ollama Setup**: App auto-detects existing installation or guides through automated setup on first launch
- **Updates**: Download only changed components, not entire package

## User Data Location

**Application Internal Data** (fixed location):
- **macOS**: `~/Library/Application Support/Cortex/`
- **Windows**: `%APPDATA%\Cortex\`
- **Linux**: `~/.config/Cortex/`

Contains:
- Neo4j database files
- SQLite conversation history and audit logs
- Plugin manifests and code
- Application settings and logs

**User Content Data** (user-configurable):
- User chooses storage location(s) when a new source is setup
- Contains notes, documents, synced external data
- Can integrate with existing Obsidian vault (optional)

**Ollama Models** (system-wide, shared):
- **macOS**: `~/.ollama/models`
- **Windows**: `%USERPROFILE%\.ollama\models`
- **Linux**: `~/.ollama/models`

Models shared across all applications using Ollama.
