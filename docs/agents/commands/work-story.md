---
name: work-story
description: Orchestrate end-to-end story implementation. Validates readiness, creates the story branch in the main worktree for interactive planning, decomposes into tasks, waits for user approval, then creates an ephemeral agent worktree and drives each task via /work-task subagents, opens a PR, and removes the worktree.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash, Agent
---

Story to work: `$ARGUMENTS`

## Your task

Drive the story at the path above from readiness validation through to an open PR. This command is the orchestrator — it does not implement features directly; it delegates each task to a `/work-task` subagent.

The story file and devlog are the source of truth. Keep chat responses minimal; do the work in the files.

## Process

### Step 1: Validate wikilinks

Read the story file. Identify all wikilinks in the body and frontmatter (format: `[[slug]]` or `[[slug|Display Text]]`).

For each wikilink, attempt to resolve it to an actual file:
- `docs/agents/<slug>.md`
- `docs/product/backlog/<slug>.story.md`
- `docs/product/backlog/<slug>.md`
- Glob `docs/**/<slug>.md`

**For each broken link:**
1. Try to fix it automatically — check if the file was renamed or moved (glob for the slug with partial matches).
2. If auto-fixable, update the wikilink in the story file and note the fix.
3. If not auto-fixable, flag it to the user with a specific suggested resolution (e.g., "This file no longer exists — did you mean `[[new-slug]]`?").

Do not proceed to Step 2 until all links resolve.

### Step 2: Evaluate readiness

Check all 6 readiness criteria against the story content:

1. **No broken wikilinks** — resolved in Step 1.
2. **Goal is specific** — concrete user-visible outcome, no placeholder text.
3. **Requirements are numbered and unambiguous** — no TODO/TBD items; each is implementable without guessing.
4. **Success criteria are testable** — each is a binary pass/fail check.
5. **Dependencies are scoped** — all `depends_on` stories are `completed`, or the needed parts are confirmed complete.
6. **UI references present when needed** — if the story has UI work, Requirements references `[[ui-guide]]` and `[[design/README]]`.

If any criteria fail, explain what is missing and offer: "Would you like me to invoke `/refine-story` to address these?" Do not proceed to Step 3 until all criteria pass.

### Step 3: Derive the story slug

Extract the story slug from the file path (the filename without `.story.md`). For example:
- `docs/product/backlog/my-feature.story.md` → slug is `my-feature`

### Step 4: Create branch in main worktree

Create the story branch and check it out in the **main worktree** (not a separate worktree yet). This keeps the main worktree on the story branch during the interactive planning phase so the user can review docs in Obsidian.

```bash
git checkout -b claude/<story-slug>
```

All file operations in Steps 5–7 happen in the main worktree on this branch.

If the branch already exists, check whether work is in progress and surface that to the user before proceeding.

### Step 5: Create devlog

Create `docs/product/devlogs/YYYY-MM-DD-<story-slug>.md` inside the worktree using today's date. Use this frontmatter:

```markdown
---
date: YYYY-MM-DD
developer:
agent: Claude
model: claude-sonnet-4-6
tags: []
related_backlog: ["[[<story-slug>]]"]
related_files: []
related_issues: []
related_devlogs: []
session_duration:
iterations:
outcome: in-progress
---

# Context

<One paragraph summarising the story goal and what this implementation session covers.>

# Approach

<High-level plan for how the tasks will be implemented. Record any key decisions before the first task begins.>

# Outcome

_To be filled as tasks complete._
```

Then update the story file's frontmatter to add `devlogs: [YYYY-MM-DD-<story-slug>]`.

### Step 6: Decompose into tasks

Analyse the story's Goal, Requirements, and Success criteria and write a `## Tasks` section at the end of the story file (inside the worktree). Use this format for each task:

```markdown
## Tasks

### Task N: <title> — `pending`

**Scope:** What this task covers — specific enough to implement without reading beyond the story file.

**Acceptance criteria:**
- [ ] Criterion one
- [ ] Criterion two

**References:** Minimal set of files/docs this task needs.
```

Task sizing rules:
- Each task is completable in a single agent session (~10–30 min of work).
- Tasks are ordered so each task's dependencies are complete before it begins.
- Each task delivers a meaningful, testable unit of progress.
- No task file already exists for this story — tasks are always inline in the story file.

### Step 7: Present for approval

Output the full task breakdown in chat and wait for the user to approve before proceeding. Do not spawn any `/work-task` subagents yet.

Present as:

> Here is the proposed task breakdown for **<Story Title>**:
>
> **Task 1: <title>** — <one-line scope summary>
> **Task 2: <title>** — <one-line scope summary>
> ...
>
> Shall I proceed with implementation?

### Step 8: Hand off to agent worktree (after approval)

Once the user approves, transition from the interactive phase to the automated implementation phase:

1. Set the story's frontmatter `status` to `in progress` if it is not already.

2. Commit the planning files in the main worktree:
```bash
git add docs/product/backlog/<story-slug>.story.md docs/product/devlogs/YYYY-MM-DD-<story-slug>.md
git commit -m "docs(<scope>): set up tasks and devlog for <story-slug>"
git push -u origin claude/<story-slug>
```

3. Switch the main worktree back to `main` (Git requires a branch to be checked out in at most one worktree at a time):
```bash
git checkout main
```

4. Create the agent worktree on the story branch:
```bash
git worktree add .claude/worktrees/<story-slug> claude/<story-slug>
```

All subsequent file operations happen inside `.claude/worktrees/<story-slug>/`. Adjust all paths accordingly.

### Step 9: Work tasks sequentially

For each pending task in the `## Tasks` section, in order:

1. Spawn a `/work-task` subagent, passing as its arguments:
   ```
   <worktree-path>/docs/product/backlog/<story-slug>.story.md "Task N: <title>" <worktree-path>/docs/product/devlogs/YYYY-MM-DD-<story-slug>.md
   ```
2. Wait for the subagent to complete before starting the next task.
3. If a task comes back `blocked`, surface the blocker to the user and stop. Do not proceed to subsequent tasks.

### Step 10: Open PR

When all tasks are `complete`:

1. Set the story's frontmatter `status` to `ready to review`.
2. Commit: `git add` the story file, `git commit -m "docs(<scope>): mark <story-slug> ready to review"`, `git push`.
3. Open a pull request targeting `main`:
   - **Title:** the story's `title` field from frontmatter
   - **Body:** summary from the devlog's `# Outcome` section, plus a `## Test steps` section derived from the story's `## Success criteria`

```bash
gh pr create --title "<story title>" --body "$(cat <<'PRBODY'
## Summary
<devlog Outcome content>

## Test steps
<numbered list from story success criteria>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
PRBODY
)"
```

### Step 11: Remove agent worktree

After the PR is open, remove the agent worktree. The user will check out the story branch in the main worktree to review and test.

```bash
git worktree remove .claude/worktrees/<story-slug>
```

Output the PR URL and the checkout command for the user:

> PR is open: <url>
> To review: `git checkout claude/<story-slug>`

## Constraints

- Do not implement any feature code in this command. All implementation is delegated to `/work-task`.
- Do not begin task work before the user approves the breakdown.
- Do not skip the setup commit.
- All file operations after worktree creation happen inside the worktree path.
