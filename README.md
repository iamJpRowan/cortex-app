# Project Cortex

AI-powered personal knowledge management system that integrates all your data—conversations, activities, health metrics, projects—into a unified, privacy-first platform you control.

## Quick Links

- [Vision & User Guide](docs/VISION.md) - What Cortex is and why it exists
- [Architecture](docs/ARCHITECTURE.md) - Technical principles and design decisions
- [Development Setup](docs/DEVELOPMENT.md) - How to get started and run locally
- [Use Case Workflow](docs/USE_CASE_WORKFLOW.md) - How to implement features incrementally
- [AI Agents](docs/AGENTS.md) - Collaboration workflow for AI agents
- [Contributing](CONTRIBUTING.md) - Guidelines for developers and AI agents

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp env.template .env
   ```
   Edit `.env` with your Neo4j password and vault path.

3. **Start development:**
   ```bash
   npm run dev
   ```

4. **Open the app:**
   Navigate to http://localhost:3000

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for detailed setup instructions.

## What Makes Cortex Different

**Complete Data Ownership**: All your data in open formats (Markdown, JSON) on your machine. No vendor lock-in, ever.

**Privacy by Default**: AI processing happens locally. You decide what (if anything) uses cloud services.

**Transparent Intelligence**: See exactly what the AI knows and how it reached conclusions. Correct misunderstandings at the source.

**Progressive Enhancement**: Start simple, grow smarter. Manual exploration → Working features → Eventual automation.

## Project Status

**Current Phase**: Foundational infrastructure setup

Building the complete tech stack needed to support any use case, then proving it works with incremental feature implementations.

See [Development Setup](docs/DEVELOPMENT.md) for current status and next steps.

## Documentation Overview

- **[VISION.md](docs/VISION.md)**: End-user perspective - what you get from Cortex
- **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**: Core principles guiding all technical decisions
- **[DEVELOPMENT.md](docs/DEVELOPMENT.md)**: Practical setup, tooling, and conventions
- **[USE_CASE_WORKFLOW.md](docs/USE_CASE_WORKFLOW.md)**: Step-by-step guide for implementing features
- **[AGENTS.md](docs/AGENTS.md)**: How AI agents should collaborate with developers
- **[CONTRIBUTING.md](CONTRIBUTING.md)**: How to work on Cortex (humans and AI agents)

## License

[TODO: Add license once determined]
