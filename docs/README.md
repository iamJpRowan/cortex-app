# Documentation

Welcome to the Cortex documentation. This directory contains all documentation for the project, organized by topic.

## Quick Navigation

- [Getting Started](#getting-started)
- [Architecture](./architecture/README.md)
- [Development](./development/README.md)
- [Agents](./agents/README.md)
- [Backlog](./backlog/README.md)
- [Automation Candidates](./automation-candidates/README.md)
- [Devlogs](./devlogs/README.md)

## Where to Start

**New to Cortex?**
1. Start with [VISION.md](./VISION.md) to understand what Cortex is
2. Read [Architecture](./architecture/README.md) for high-level design
3. Follow [Development Setup](./development/setup.md) to get running
4. Review [Development Patterns](./development/patterns.md) for coding patterns

**Implementing a Feature?**
1. Review [Use Case Workflow](./development/use-case-workflow.md)
2. Check [Feature Development](./development/feature-development.md)
3. Consult [Guardrails](./development/guardrails.md) for constraints

**Working with AI Agents?**
1. Read [Agents Guide](./agents/README.md)
2. Follow [Conversation Workflow](./agents/conversation-workflow.md)
3. Reference [Common Pitfalls](./agents/common-pitfalls.md)

## Quick Reference

**Common Tasks:**
- [Run the app](./development/workflow.md#running-the-application) - Start development server
- [Add a feature](./development/use-case-workflow.md) - Four-phase implementation workflow
- [Test changes](./development/testing.md) - Testing strategies
- [Build for production](./development/build.md) - Create distribution package

**Key Concepts:**
- [Local-first architecture](./architecture/principles.md#1-local-first-data-sovereignty) - Core design principle
- [ELT data flow](./architecture/data-flow.md) - Data architecture pattern
- [IPC patterns](./development/patterns.md#ipc-communication) - Inter-process communication
- [Vanilla JSX](./development/patterns.md#working-with-jsx-no-react) - UI without React
