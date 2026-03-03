---
title: Key Concepts
summary: Details regarding the core concepts that the Cortex app is comprised of.
---

# Key Concepts

## Connections (planned)

**Planned.** Connections are not yet available in the app. The following describes how they are intended to work once implemented.

A **connection** is a **data source** you can connect to the app—for example a folder on your computer or a cloud service (e.g. Slack, Google Drive). The app can read from and write to a connection so that agents can use that data (within the permissions you set) and so that data from different sources can be brought together into your knowledge graph.

You would create **connection instances** (e.g. “My Project Folder”, “Work Slack”) and control what agents can do per connection in your **permission mode** (allow, ask, or deny read/write per connection type and per instance). The first connection type we plan to support is **Local Folder**: a folder on your system, including all subfolders and files, with agent tools to list, read, and write files within that folder.
