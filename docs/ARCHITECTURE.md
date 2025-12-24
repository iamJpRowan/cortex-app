# Architecture

## Overview

Cortex is built on a foundation of **local-first data sovereignty** with an **ELT (Extract-Load-Transform) architecture** where the graph database serves as a disposable, intelligent index over your source data. This approach ensures complete data ownership while enabling powerful AI-driven insights and automation.

The architecture is guided by nine core principles that work together to deliver the vision of transparent, privacy-first, user-controlled personal knowledge management.

---

## Core Architectural Principles

### 1. Local-First Data Sovereignty

**What it is:**
All personal data is stored locally in open, portable formats. The graph database (Neo4j) serves as a queryable index, not the authoritative source of truth. Your actual data lives in Markdown files, JSON documents, and other universal formats on your local filesystem.

**Why it matters:**
- Complete ownership: your data never depends on a third-party service
- Work offline whenever you want
- No vendor lock-in or proprietary formats
- Privacy by default: data doesn't leave your machine unless you choose
- Version control and backup on your own terms

**Example:**
A journal entry about a significant life event is stored as a Markdown file in your Obsidian vault. The graph database indexes it for connections and queries, but if you delete the graph entirely, you still have the complete journal entry with all its content and metadata.

---

### 2. ELT Architecture with Graph-Layer Transformation

**What it is:**
Data flows through Extract → Load → Transform stages. Source data is extracted and loaded in its native format first, preserving complete fidelity. Transformation happens only when loading into the graph index. The graph is completely disposable and can be rebuilt from source data at any time.

**Why it matters:**
- Iterate on graph structure without touching source files
- Schema evolution happens at the graph layer, not through data migration
- Experiment with different graph models without risk
- Source data remains pristine and untouched by processing logic
- Failed transformations can be fixed and re-run without data loss

**Example:**
Strava activity data is synced from the API and saved as JSON files. The transformation logic reads these files and creates graph nodes/relationships. If you realize a better way to model "route" relationships, you update the transformation code and rebuild the graph—no need to re-fetch from Strava or modify the stored JSON files.

---

### 3. Flexible Storage with Unified Graph

**What it is:**
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

---

### 4. Source-Appropriate Data Flow

**What it is:**
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
- Adding a tag to a journal entry: Write directly to the Markdown file, then update graph
- Updating a Strava activity title: Send API request to Strava, wait for sync, then graph reflects the change
- Creating a new project note: Write Markdown file locally, index to graph immediately

---

### 5. Adaptive Intelligence

**What it is:**
The system starts with direct database queries and evolves toward specialized AI agents. Model selection (local vs. cloud) is dynamic based on task requirements, user preferences, and context.

**Why it matters:**
- Begin simple, add sophistication as patterns emerge
- Balance privacy (local), speed (cached/local), and capability (cloud)
- Learn which tasks benefit from which approach
- Continuous improvement through usage patterns
- Avoid over-engineering before understanding real needs

**Example:**
- **Early**: User asks "Show me all my runs in Portland" → LLM generates Cypher query → Results displayed
- **Later**: System recognizes this is a common pattern → Creates a specialized "activity analysis" agent
- **Even later**: Agent proactively notices "You haven't run your usual Saturday route in 3 weeks" without being asked

---

### 6. Progressive Enhancement

**What it is:**
Start with core functionality that delivers immediate value, then add complexity incrementally. Each phase builds on the previous one. The system learns and improves both its data model and tooling continuously based on real usage.

**Why it matters:**
- Faster time to value—don't wait for perfection
- Learn from real usage before building complex features
- Each enhancement is informed by actual patterns, not speculation
- Avoid wasted effort on features that don't matter
- Users benefit at every stage, not just at the end

**Example:**
- **Phase 1**: Manual chat exploration of person files
- **Phase 2**: Add timeline visualization for person interactions
- **Phase 3**: Integrate email data to enrich context
- **Phase 4**: Agent proactively suggests "Haven't talked to Sarah in 2 months—she mentioned wanting to grab coffee"

---

### 7. Transparency & Auditability

**What it is:**
The graph structure, AI reasoning, and all system actions are visible and inspectable. Comprehensive logging tracks every file access, database query, and AI decision. All inferences and relationships can be traced back to their source. Corrections are made by fixing source data or transformation logic, not patching the graph.

**Why it matters:**
- No black-box AI decisions—everything is traceable
- Users can see exactly what context informed any suggestion
- Audit trail for debugging and understanding system behavior
- Builds trust through transparency
- Enables continuous improvement of transformation logic
- Feeds into progressive enhancement through pattern analysis

**Example:**
- AI suggests "You might want to visit that new restaurant—you've been to similar places 6 times this month"
- User clicks to see reasoning: Graph shows the 6 restaurant nodes, their cuisine types, the similarity logic
- Logs reveal which queries the AI ran to discover this pattern
- User notices a misclassification, edits the restaurant's cuisine tag in the source file
- Next graph rebuild correctly reflects the change

---

### 8. User Agency & Control

**What it is:**
Users have complete control over privacy boundaries, feature selection, and data transformations. The system adapts to user preferences rather than forcing users into predetermined workflows. Users can directly modify source data and transformation logic whenever they want.

**Why it matters:**
- Respects individual privacy preferences and comfort levels
- Enables customization for different use cases
- Users maintain ownership of both data AND how it's processed
- No forced features or unwanted automation
- Empowers users to understand and modify system behavior

**Example:**
- User configures: "Use local AI for anything involving health data, cloud AI okay for activity analysis"
- User decides: "Don't sync my email—I'll add important messages manually"
- User modifies: Transformation script to change how workout intensity is calculated
- User disables: Automated pattern recognition for a specific topic

---

### 9. Portability & Future-Proofing

**What it is:**
Use universal data formats (Markdown, JSON, Parquet, CSV) and portable technologies (TypeScript) throughout. The web application architecture is designed to be compatible with future desktop packaging (Electron/Tauri). Avoid lock-in to specific frameworks or platforms where possible.

**Why it matters:**
- Code can be reused across web app, desktop app, and Obsidian plugins
- Data formats are readable and portable forever
- Can migrate platforms without rewriting everything
- Enables gradual evolution from web → desktop → native without starting over
- Future technical decisions don't invalidate past work

**Example:**
- Write graph transformation logic once in TypeScript
- Use it in: Web app, desktop app, Obsidian plugin, CLI tool
- Data format migration: Just Markdown and JSON—works everywhere, readable in any text editor
- Platform shift: Move from web to Tauri desktop app by reusing 90% of codebase

---

## How Principles Work Together

These principles aren't isolated—they reinforce each other:

- **Local-first + ELT** = Safe experimentation with graph structure
- **Flexible storage + Source-appropriate flow** = Right format for each data type
- **Adaptive intelligence + Progressive enhancement** = Start simple, grow smarter
- **Transparency + User agency** = Trust through visibility and control
- **Portability** = Future-proof all the above

When making architectural decisions, consider how they align with these principles. When in doubt, favor:
- User control over automation
- Transparency over convenience
- Portability over optimization
- Progressive enhancement over up-front complexity

---

## Tech Stack

### Core Stack (Locked In)

- **TypeScript** - Single language across all platforms, enables code reuse
- **React** - UI framework compatible with web and desktop targets
- **GraphQL** - Unified query interface for AI agents and UI components
- **Neo4j** - Graph database with Cypher, Bolt protocol, and APOC extensions

### Recommended Defaults (Swappable)

- **Apollo Server/Client** - Full-featured GraphQL implementation with caching
- **Vitest** - Modern testing framework with TypeScript support
- **shadcn/ui + Tailwind** - Component library with full customization control

### Development Approach

- **Testing**: Regression prevention over coverage targets; integration-focused
- **State Management**: Colocated state, React Context for global, Apollo for server state
- **Styling**: Utility-first with Tailwind, component-based patterns

### Intentionally Deferred

Build optimization, advanced caching, deployment complexity, monitoring tooling - address when needed, not prematurely.

### Version Requirements

- Node.js 18+
- Neo4j 5.x
- TypeScript 5.x

---

## Decision Framework

When evaluating new technologies:

1. Does it align with core principles?
2. Does it lock us in or keep options open?
3. Can we defer this decision?
4. Will it make us move faster or slower?
5. Is this a principle or implementation detail?

**Default to**: Boring, proven technology. Flexibility over optimization.

---

*These principles guide all implementation decisions. They represent hard-won insights about building systems that respect user agency while delivering powerful capabilities.*
