# Deployment Model

## Distribution

- **Package Format**: .app (macOS), .exe installer (Windows), .AppImage (Linux)
- **Initial Download**: ~500MB-1GB (includes Neo4j server, app code)
- **Installation**: Drag-and-drop or installer, minimal configuration
- **Prerequisites**: Ollama must be installed separately (`brew install ollama`)
- **Updates**: Download only changed components, not entire package

## User Data Location

- **macOS**: `~/Library/Application Support/Cortex/`
- **Windows**: `%APPDATA%\Cortex\`
- **Linux**: `~/.config/Cortex/`

Contains:
- Neo4j database files
- Application settings and logs
- Cached external data

**Ollama Location (System-wide):**
- **macOS**: `~/.ollama/models`
- **Windows**: `%USERPROFILE%\.ollama\models`
- **Linux**: `~/.ollama/models`

Models shared across all applications using Ollama.

## Vault Location

- User selects Obsidian vault location on first launch
- Application monitors vault for changes
- Rebuilds graph index on structural changes
