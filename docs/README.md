# Documentation

Welcome to the Cortex documentation. This directory is organized by **purpose**: user, development, and product.

## Quick Navigation

- [User documentation](./user/vision.md) — What is Cortex?, Getting Started (also in-app under Help)
- [Development](./development/README.md) — Architecture, design, how to build (setup, features, guardrails, agents workflows)
- [Product](./product/README.md) — Roadmap, backlog, devlogs, themes

## Where to Start

**New to Cortex?**
1. Start with [What is Cortex?](./user/vision.md) (user docs; also in-app under Help)
2. Read [Architecture](./development/architecture/README.md) for high-level design
3. Follow [Development Setup](./development/getting-started/setup.md) to get running
4. Review [Feature Development](./development/development-patterns/feature-development.md) and [Development Guide](./development/README.md) for coding patterns

**Implementing a feature?**
1. Check the [roadmap](./product/README.md#roadmap) for **current focus** (what to work on now)
2. Follow [work-backlog-item](./development/agents/work-backlog-item.md) for that item
3. Consult [Feature Development](./development/development-patterns/feature-development.md) and [Guardrails](./development/quality-and-release/guardrails.md) for patterns and constraints

**Working with AI Agents?**
1. Read [Agents Guide](./development/agents/README.md) for generic instructions and workflow-based conversations

## Quick Reference

**Common Tasks:**
- [Run the app](./development/getting-started/workflow.md#running-the-application) - Start development server
- [Add a feature](./development/development-patterns/feature-development.md) - Feature implementation workflow
- [Test changes](./development/quality-and-release/testing.md) - Testing strategies
- [Build for production](./development/quality-and-release/build.md) - Create distribution package

**Key Concepts:**
- [Local-first architecture](./development/architecture/principles.md#1-local-first-data-sovereignty) - Core design principle
- [ELT data flow](./development/architecture/data-flow.md) - Data architecture pattern
- [IPC and Electron](./development/development-patterns/electron-guidance.md) - Inter-process communication and main process patterns
- [React UI](./development/design/ui-guide.md) - Components (shadcn/ui + Tailwind)
