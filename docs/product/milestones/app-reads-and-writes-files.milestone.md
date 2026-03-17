---
type: milestone
title: App Reads and Writes Files
alias: App Reads and Writes Files
status: in progress
summary: The app can connect to a local folder, agents can read/write files with permissions, and the user can view/edit markdown and see diffs of agent changes.
---

[Docs](../../README.md) / [Product](../README.md) / [Milestones](./) / App Reads and Writes Files

# App Reads and Writes Files

## Goal

The app can connect to a local folder (e.g. the project repo), agents can read and write files via connection-scoped tools with user-controlled permissions, and the user can view and edit markdown files and see diffs of agent changes — all within the app.

## Stories

### [[tool-permission-system.story|Tooling Permission System]] 
Foundational tool definitions and user-controlled permissions (modes, runtime approval). Critical for trust and extensibility.
- [[tool-permission-runtime-approval.story|Runtime Approval]] - Functionality to prompt user for permission

### [[connections-foundation.story|Connections Foundation]]
Registration, connection instance store, and wiring so modes and agents can use connection-scoped tools.

### [[local-folder-connection-type.story|Local Folder Connection Type]]
First connection type Local Folder (path = all subfolders/files); agent tools list_directory, read_file, write_file.

### [[markdown-viewer-editor.story|Markdown Viewer/Editor]] (OPTIONAL)
View and edit markdown files from a connected local folder within the app.

### [[diff-viewer.story|Diff Viewer]] (OPTIONAL)
View diffs of changes agents make to files in a connected local folder.
