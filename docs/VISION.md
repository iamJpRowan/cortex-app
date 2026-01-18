[Docs](./README.md) / Vision & User Guide

# Vision & User Guide

## What is Cortex?

Cortex is an AI-powered personal knowledge management system that transforms how you interact with your own data. It connects all your personal information (conversations, health metrics, activities, projects, places, and experiences) into a unified, intelligent platform that helps you understand patterns, surface insights, and maintain meaningful context across your entire digital life.

## Core Benefits

### Own Your Data Completely
- All data stored locally in human-readable formats (Markdown, JSON)
- Never locked into proprietary systems or cloud services
- Full control over what stays private and what you choose to share
- Your knowledge base travels with you, forever

### Privacy-First Intelligence
- AI processing happens locally on your machine by default
- You decide which tasks can use cloud AI based on your own privacy preferences
- Sensitive personal data never leaves your control unless you explicitly choose otherwise
- Flexibility to balance privacy, speed, and capability for each use case

### Active Knowledge Management
- Beyond passive storage, the system proactively surfaces patterns and connections
- AI agents notice insights you might miss and bring them to your attention
- User-driven exploration through natural language chat and visual interfaces
- Both modes working together: ask questions AND receive unprompted discoveries

### Transparent AI Understanding
- The graph database makes the AI's "mental model" visible and inspectable
- See exactly what relationships and context informed any suggestion
- Audit how the AI understands your data
- Correct misunderstandings by fixing source data or transformation logic
- No black-box AI decisions, everything is traceable and editable

## How It Works

### Local-First Architecture
Cortex is built on a foundation of **local-first computing**. Your data lives in open, portable formats on your own machine. The graph database acts as an intelligent index, completely disposable and rebuildable from your source files. 

This means:
- Work offline whenever you want
- Complete data sovereignty
- Version control and backup on your terms
- No vendor lock-in, ever

### Intelligent Data Integration
The system connects multiple data sources while respecting the nature of each:
- **Local data** (notes, journals, documents) → Direct local storage
- **External services** (Strava, GitHub, health apps) → Sync to local, then index
- **The Integration Heuristic**: "Would I want to reference this in my Notes?"
  - Yes → Create a Markdown file (meaningful events, insights)
  - No → Store as structured data (metrics, logs, continuous streams)

### Flexible AI Processing
By default, AI analysis runs locally to preserve privacy. You have full control to:
- Keep sensitive data processing entirely local
- Use cloud AI for specific tasks where you want more capability or speed
- Define your own boundaries based on your use cases and comfort level
- Change these preferences at any time

### Progressive Evolution
Cortex starts simple and grows smarter over time:
- Begin with manual exploration through chat and visual interfaces
- System learns which patterns you care about
- Agents gradually automate repetitive insights
- Both the data model and the tooling improve continuously through use

## The Bigger Vision

Beyond being a personal knowledge tool, Cortex represents a new approach to AI-augmented development. The long-term goal is a system where:
- AI agents become co-developers, not just assistants
- New features emerge from conversational guidance
- The system improves its own architecture over time
- You focus on "what" and "why" while AI handles "how"

But first, we build an excellent manual experience that proves the value, then we automate what works.

---

*This vision guides all architectural and implementation decisions. When in doubt, return to these principles: data ownership, privacy by default, user agency, and transparent intelligence.*
