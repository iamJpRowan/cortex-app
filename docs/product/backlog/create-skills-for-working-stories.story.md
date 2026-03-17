---
type: story
title: Create Skills for Working Stories
status: in progress
summary: Build /work-story, /refine-story, and /work-task skills that automate the full lifecycle from story validation through task execution to PR creation.
themes: ['developer-experience']
devlogs: [2026-03-17-create-skills-for-working-stories]
---

[Docs](../../README.md) / [Product](../README.md) / [Backlog](./README.md) / Create Skills for Working Stories

# Create Skills for Working Stories

## Goal

Replace the current manual agent workflow (read workflow doc, follow steps, use judgment) with three Claude Code skills that automate the end-to-end story-working loop:

- **`/work-story`** — entry point; validates a story is ready to be worked, decomposes it into tasks (inline in the story file), creates a dedicated worktree/branch, and drives each task to completion via `/work-task` subagents.
- **`/refine-story`** — structured conversation that brings a `planned` story up to the readiness bar required for autonomous work.
- **`/work-task`** — subagent worker that receives a single task's context, implements it, writes to the shared devlog, commits, and pushes.

The combined effect: the user invokes `/work-story path/to/story.story.md`, approves the task breakdown, and the agent does the rest — including worktree setup, implementation, devlog maintenance, and PR creation.

## Prerequisites / Dependencies

No blocking story dependencies. Skills are self-contained files in `.claude/skills/`. They build on existing workflow docs (`work-backlog-item.md`, `decompose-backlog-item.md`, `refine-backlog-item.md`) rather than replacing them.

## Requirements and constraints

### 1. `/refine-story` skill

1. Accept a story file path as argument (e.g. `/refine-story docs/product/backlog/my-story.story.md`).
2. Read the story file and all wikilinked documents in body and frontmatter; flag any broken links before proceeding.
3. Evaluate each **readiness criterion** (see §Readiness criteria below) and report which are satisfied and which are missing.
4. For each missing criterion, ask the user one focused question at a time. Do not ask about multiple things in one turn.
5. Update the story file in place as the user provides answers — keep the doc as state.
6. When all criteria are met, confirm — do not change the story's status.

### 2. `/work-story` skill

1. Accept a story file path as argument.
2. **Validate linked documents.** Read all wikilinks in body and frontmatter. For each broken link, attempt to fix it (file renamed, moved, etc.) or flag it to the user with a suggested resolution. Do not proceed until all links resolve.
3. **Evaluate readiness.** Check all readiness criteria (§Readiness criteria). If any fail, explain what's missing and offer to invoke `/refine-story`. Do not proceed to task breakdown until all criteria pass.
4. **Create worktree and branch.** Branch name: `claude/<story-slug>`. Worktree at `.claude/worktrees/<story-slug>`. All subsequent work happens in this worktree.
5. **Create devlog.** `docs/product/devlogs/YYYY-MM-DD-<story-slug>.md` with the story slug in `related_backlog`. Update the story's `devlogs` frontmatter to point to it.
6. **Decompose into tasks.** Write a `## Tasks` section into the story file. Each task is a structured entry (see §Task format below). Present the full task breakdown to the user for approval before beginning any implementation.
7. **Commit setup.** After user approval of the task breakdown, commit the story file and devlog changes before beginning any implementation. Push to remote.
8. **Work tasks sequentially.** Spawn a `/work-task` subagent for each task in order, passing: story file path, task index/title, devlog path, worktree path. Wait for each subagent to complete before starting the next (tasks may have dependencies).
9. **Create PR.** When all tasks are complete, set the story's frontmatter status to `ready to review`, then open a pull request targeting `main` with the story title, a summary from the devlog, and test steps derived from the story's success criteria.

### 3. `/work-task` skill (subagent)

1. Receive context: story file path, task identifier (heading title, e.g. "Task 1: Create `/refine-story` command"), devlog path. All paths are in the worktree.
2. Read the story file to get goal, requirements, and success criteria. Locate the task entry by its heading in the `## Tasks` section to get scope, acceptance criteria, and references. Read the devlog for existing decisions and approach.
3. Implement the task. Follow the same principles as `work-backlog-item.md`: functionality first, use existing patterns, prefer reuse over new abstractions.
4. Record approach and any decisions in the devlog before and during implementation.
5. When the task is testable, mark it complete in the story's `## Tasks` section.
6. Run `/prepare-to-commit` then `/commit`. Push after every task.
7. If implementation reveals something that materially changes the overall approach, stop, update the devlog with a `## Blocked` note, and surface to the user (do not silently skip or work around).

### Readiness criteria

A story is ready to be worked autonomously based on content quality, not status. `/work-story` checks all of the following before proceeding:

1. **No broken wikilinks** — every file referenced in body or frontmatter exists.
2. **Goal is specific** — describes the concrete user-visible outcome, not a vague intent. No placeholder text.
3. **Requirements are numbered and unambiguous** — each requirement is specific enough that an agent can make implementation decisions without asking "what does that mean?". No TODO or TBD items.
4. **Success criteria are testable** — each criterion is verifiable with a binary pass/fail check. "User can see X" is testable; "X should feel fast" is not.
5. **Dependencies are scoped** — all `depends_on` stories are either `completed` or the story explicitly documents which parts are needed and confirms those parts are complete.
6. **UI references present when needed** — if the story includes UI work, the Requirements section references `[[ui-guide]]` and `[[design/README]]`.

Readiness is evaluated from content only — status is not a gate. Any story at any status can be worked or refined if its content passes these criteria.

### Task format (inline in story file)

Tasks live in a `## Tasks` section appended to the story file during decomposition. Each task is a level-3 heading with a status badge and structured body:

```markdown
## Tasks

### Task 1: <title> — `pending`

**Scope:** What this task covers — specific enough to implement without reading beyond the story file.

**Acceptance criteria:**

- [ ] Criterion one
- [ ] Criterion two

**References:** Minimal set of files/docs this task needs.
```

Status values: `pending` → `in-progress` → `complete` | `blocked`.

Tasks must be:

- Completable in a single agent session (~10–30 min of agent work).
- Ordered so that each task's dependencies are complete before it begins.
- Sized to deliver a meaningful, testable unit of progress (not a single rename; not a full subsystem).

### Out of scope

- Parallelizing `/work-task` invocations. Tasks run sequentially for this first iteration; parallel execution is a future optimization.
- Any changes to the existing workflow docs (`refine-backlog-item.md`, `decompose-backlog-item.md`, `work-backlog-item.md`). The skills operate alongside these docs, not as replacements.
- Automated testing of the skills themselves.

## Success criteria

- `/refine-story docs/product/backlog/some-story.story.md` reads the story, identifies missing readiness criteria, asks targeted questions, updates the file, and confirms when all criteria are met (story status unchanged).
- `/work-story docs/product/backlog/some-story.story.md` on a ready story: validates links, evaluates readiness (passes), creates a worktree and branch, creates a devlog, proposes a `## Tasks` section, and waits for user approval before working.
- After user approval, `/work-story` spawns `/work-task` for each task in order. Each task is implemented, committed, and pushed before the next begins.
- The devlog is created before any implementation begins and is updated by each `/work-task` subagent with approach, decisions, and completion notes.
- `/work-story` on a story that fails content readiness checks explains what is missing and offers to invoke `/refine-story` instead of proceeding.
- On a story with broken wikilinks, `/work-story` attempts to fix them or flags them with a specific resolution suggestion before halting.
- When all tasks complete, a PR is opened targeting `main` with title, summary, and test steps.

## References

- [[work-backlog-item]] — Existing workflow this skill automates; source of truth for task execution behavior.
- [[decompose-backlog-item]] — Decomposition rules; inline task format is a variation of the task-files approach.
- [[refine-backlog-item]] — Definition of "refined" and the refinement process; `/refine-story` implements this as a skill.
- [[how-we-work]] — Backlog lifecycle, status values, and the Theme → Story → Task hierarchy.
- [[TEMPLATE.story.md]] — Story file format including frontmatter fields and status values.

## Tasks

### Task 1: Create `/refine-story` command — `complete`

**Scope:** Create `.claude/commands/refine-story.md`. The command accepts a story file path as `$ARGUMENTS`, reads the story and all wikilinked docs, flags broken links, evaluates all 6 readiness criteria (from the story spec), and for each failing criterion asks the user one focused question at a time. Updates the story file in place as the user answers. When all criteria pass, sets `status: refined` in frontmatter and confirms. Does not proceed to implementation — this is a pure refinement conversation skill.

**Acceptance criteria:**

- [ ] File exists at `.claude/commands/refine-story.md` with correct frontmatter (`name`, `description`, `allowed-tools`)
- [ ] Command reads story path from `$ARGUMENTS`
- [ ] Evaluates all 6 readiness criteria defined in the story spec
- [ ] Reports which criteria pass and which fail before asking questions
- [ ] Asks exactly one question per turn for each failing criterion
- [ ] Updates story file in place as answers are received
- [ ] Confirms all criteria are met; does not change story status

**References:**

- `docs/agents/refine-backlog-item.md`
- `docs/product/backlog/create-skills-for-working-stories.story.md` (§Readiness criteria, §Requirements 1)
- `.claude/commands/plan-milestone.md` (command format reference)

---

### Task 2: Create `/work-story` command — `complete`

**Scope:** Create `.claude/commands/work-story.md`. The command accepts a story file path as `$ARGUMENTS` and implements the full orchestration flow: validate wikilinks (attempt auto-fix or flag), check all 6 readiness criteria (offer `/refine-story` if any fail), create a git worktree + branch (`claude/<story-slug>` / `.claude/worktrees/<story-slug>`), create a devlog (`docs/product/devlogs/YYYY-MM-DD-<story-slug>.md`), update the story's `devlogs` frontmatter, decompose into a `## Tasks` section inline in the story file, present the task breakdown to the user for approval, then on approval spawn `/work-task` subagents sequentially for each task, and finally open a PR.

**Acceptance criteria:**

- [ ] File exists at `.claude/commands/work-story.md` with correct frontmatter
- [ ] Reads story path from `$ARGUMENTS`
- [ ] Validates wikilinks; attempts auto-fix before flagging to user
- [ ] Evaluates all 6 readiness criteria; offers `/refine-story` if any fail
- [ ] Creates worktree at `.claude/worktrees/<story-slug>` on branch `claude/<story-slug>`
- [ ] Creates devlog with correct frontmatter and updates story's `devlogs` field
- [ ] Writes `## Tasks` section to story file following the task format from the story spec
- [ ] Presents full task breakdown and waits for user approval before implementation
- [ ] Commits story file + devlog changes and pushes after user approval, before first task
- [ ] Spawns `/work-task` for each task sequentially after approval
- [ ] Sets story status to `ready to review` before opening PR
- [ ] Opens a PR targeting `main` with title, devlog summary, and test steps from success criteria

**References:**

- `docs/agents/work-backlog-item.md`
- `docs/agents/decompose-backlog-item.md`
- `docs/product/backlog/create-skills-for-working-stories.story.md` (§Requirements 2, §Task format, §Readiness criteria)
- `.claude/commands/plan-milestone.md` (command format reference)

---

### Task 3: Create `/work-task` command — `complete`

**Scope:** Create `.claude/commands/work-task.md`. This is the subagent worker invoked by `/work-story` for each individual task. It receives story file path, task identifier (e.g. "Task 1: Create `/refine-story` command"), and devlog path as `$ARGUMENTS`. Tasks are inline entries in the story's `## Tasks` section — there are no separate task files. The command reads the full story file to get goal, requirements, and success criteria, then locates the specific task entry by its heading to get scope, acceptance criteria, and references. It implements the task, records approach/decisions in the devlog, marks the task `complete` in the `## Tasks` section, runs `/prepare-to-commit` then `/commit`, and pushes. If implementation reveals something that materially changes the overall approach, it marks the task `blocked`, adds a `## Blocked` note in the devlog, and surfaces the issue rather than silently continuing.

**Acceptance criteria:**

- [ ] File exists at `.claude/commands/work-task.md` with correct frontmatter
- [ ] Reads story path, task identifier, and devlog path from `$ARGUMENTS`
- [ ] Reads the full story file for goal/requirements/success criteria, then locates the task entry by heading in `## Tasks`
- [ ] Records approach in devlog before implementation begins
- [ ] Sets task status to `in-progress` at start, `complete` on finish
- [ ] Invokes `/prepare-to-commit` then `/commit` and pushes after task completion
- [ ] On material blocker: sets task to `blocked`, adds `## Blocked` note to devlog, surfaces to user

**References:**

- `docs/agents/work-backlog-item.md`
- `docs/product/backlog/create-skills-for-working-stories.story.md` (§Requirements 3)
- `.claude/commands/prepare-to-commit.md`, `.claude/commands/commit.md`
