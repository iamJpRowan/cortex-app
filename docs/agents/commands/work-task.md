---
name: work-task
description: Subagent worker invoked by /work-story. Receives a story file path, task identifier, and devlog path; implements the task; records decisions in the devlog; marks the task complete; commits and pushes.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Arguments: `$ARGUMENTS`

The arguments are: `<story-file-path> "<Task N: title>" <devlog-path>`

Example: `docs/product/backlog/my-story.story.md "Task 2: Add settings panel" docs/product/devlogs/2026-03-17-my-story.md`

## Your task

Implement the single task identified above. This is an autonomous session — proceed directly from reading context to implementation. Do not wait for user input unless you hit a material blocker (see §Blockers below).

## Process

### Step 1: Parse arguments

Split `$ARGUMENTS` into:
- `STORY_PATH` — first token (file path)
- `TASK_ID` — second token (quoted string, e.g. `"Task 2: Add settings panel"`)
- `DEVLOG_PATH` — third token (file path)

All paths are relative to the worktree root (the working directory when this command runs).

### Step 2: Load context

Read the following in order:

1. **Story file** (`STORY_PATH`) — read the full file to get: Goal, Requirements and constraints, Success criteria.
2. **Task entry** — locate the heading `### <TASK_ID>` in the `## Tasks` section. Read its Scope, Acceptance criteria, and References.
3. **Devlog** (`DEVLOG_PATH`) — read existing approach and any prior decisions. Treat recorded decisions as fixed; do not relitigate them.
4. **References** — read each file listed in the task's References section.

### Step 3: Set task status to `in-progress`

In the story file, update the task heading status badge:

```
### Task N: <title> — `in-progress`
```

### Step 4: Record approach in devlog

Before writing any implementation code, append to the devlog under the task title:

```markdown
## Task N: <title>

**Approach:** <one paragraph describing what you will build and why, referencing story requirements and any constraints>.

**Key decisions:** <bullet list of any non-obvious choices, or "None" if straightforward>.
```

### Step 5: Implement

Build the task as defined by its Scope and Acceptance criteria. Follow the story's Requirements and constraints throughout.

Guiding principles (from `docs/agents/work-backlog-item.md`):
- Functionality first — get it working before polishing.
- Use existing patterns — prefer reusing or extending what is already in the codebase over new abstractions.
- No over-engineering — minimum complexity needed to satisfy the acceptance criteria.

When touching UI:
- Use shadcn primitives and design tokens.
- Review existing app components in `src/renderer/src/components/` before building bespoke UI.
- If you build bespoke UI, note the reason in the devlog.

As you work:
- Append decisions and direction changes to the devlog as they happen.
- Do not add implementation notes to the story file — the story file is the contract; the devlog is the log.

### Step 6: Mark task complete

When the task's acceptance criteria are satisfied:

1. Update the task heading in the story file:
   ```
   ### Task N: <title> — `complete`
   ```
2. Check each acceptance criterion box in the story file:
   ```
   - [x] Criterion one
   - [x] Criterion two
   ```
3. Append a completion note to the devlog:
   ```markdown
   **Completed:** <one sentence on what was built and where>.
   ```

### Step 7: Prepare to commit and push

Run `/prepare-to-commit` to review all uncommitted changes and apply any fixes.

Then run `/commit` to stage and commit with a Conventional Commits message.

Then push:
```bash
git push
```

## Blockers

If during implementation you discover something that **materially changes the overall approach** — a new constraint, design conflict, broken dependency, or something the story spec did not account for — stop immediately:

1. Update the task heading: `### Task N: <title> — `blocked``
2. Append to the devlog:
   ```markdown
   ## Blocked: Task N — <title>

   **Reason:** <specific description of what was discovered and why it blocks the approach>.

   **Options considered:** <what you evaluated before stopping>.

   **Recommended resolution:** <your suggestion for how to proceed>.
   ```
3. Set the story's frontmatter status to `blocked`.
4. Surface the blocker clearly in your response. Do not attempt workarounds or silently skip the blocking issue.

## Constraints

- Record approach in the devlog **before** writing implementation code.
- Do not change the story's `status` frontmatter — only `/work-story` manages story status.
- Do not implement anything outside the task's Scope. If you discover adjacent work that should be done, note it in the devlog as a future task.
- One task per invocation. This command is always invoked for a single, specific task.
