[Docs](../README.md) / [Architecture](./README.md) / Data Flow Architecture

# Data Flow Architecture

## ELT Architecture with Graph-Layer Transformation

Data flows through Extract → Load → Transform stages. Source data is extracted and loaded in its native format first, preserving complete fidelity. Transformation happens only when loading into the embedded graph. The graph is completely disposable and can be rebuilt from source data at any time.

**Why it matters:**
- Iterate on graph structure without touching source files
- Schema evolution happens at the graph layer, not through data migration
- Experiment with different graph models without risk
- Source data remains pristine and untouched by processing logic
- Failed transformations can be fixed and re-run without data loss

**Example:**
Strava activity data is synced from the API and saved as JSON files in your vault data directory. The transformation logic reads these files and creates graph nodes/relationships in embedded Neo4j. If you realize a better way to model "route" relationships, you update the transformation code and rebuild the graph—no need to re-fetch from Strava or modify the stored JSON files.

## Flexible Storage with Unified Graph

Not all data belongs in Markdown files. The system uses different storage formats based on content characteristics:
- **Markdown with YAML frontmatter**: Text-heavy content you'd want to reference in notes
- **JSON/Parquet/CSV**: High-volume, data-only content (metrics, logs, continuous streams)

**The Integration Heuristic**: "Would I want to reference this in my Notes?"
- **Yes** → Create Markdown file (meaningful events, insights, reflections)
- **No** → Store as structured data (raw metrics, automated logs)

**Multi-source entity resolution**: A single graph node can reference data from multiple sources.

**Why it matters:**
- Right storage format for the right type of data
- Keeps vault navigable and meaningful
- Prevents clutter from high-volume automated data
- Enables rich cross-referencing in the graph
- Single unified view even when data comes from multiple sources

**Example:**
- **Markdown**: A note about a memorable long run, including your thoughts and photos
- **JSON**: 500 Strava activities with GPS coordinates and heart rate data
- **Graph**: Both represented as "Activity" nodes, linked to routes, people, and places
- **Multi-source**: A run tracked in both Strava and Garmin appears as one activity node in the graph, with the node referencing both data sources

## Source-Appropriate Data Flow

Different types of data have different authoritative sources and require different write paths:

- **Local-origin data** (Obsidian files, local code repos):
  - Direct local writes → Graph index
  
- **External SaaS data** (Strava, GitHub, health apps):
  - API write → Source platform → Sync to local → Graph index
  - Local copies are read-only caches

**Why it matters:**
- Respects where data truly "lives"
- Prevents sync conflicts and data loss
- Maintains clear understanding of data ownership
- Enables proper bidirectional sync when needed

**Example:**
- Adding a tag to a journal entry: Main process writes directly to the Markdown file, then updates graph
- Updating a Strava activity title: Send API request to Strava, wait for sync, then graph reflects the change
- Creating a new project note: Write Markdown file locally via main process, index to graph immediately
