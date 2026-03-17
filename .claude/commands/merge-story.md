---
name: merge-story
description: Merge an approved story PR into main. Marks the story completed, archives the story file, squash-merges the PR, deletes the branch, and returns the main worktree to main.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

Story to merge: `$ARGUMENTS`

## Your task

Close out a reviewed and approved story. This command does not implement anything — it finalises the story lifecycle after the user has verified the work.

## Process

### Step 0: Resolve story path

If `$ARGUMENTS` is empty, ask the user:

> Which story are you merging? Please provide the path to the story file (e.g. `docs/product/backlog/my-feature.story.md`).

Wait for their reply before proceeding.

### Step 1: Read story and confirm state

Read the story file. Confirm:
- `status` is `ready to review`
- There is an open PR for the current branch (`gh pr view`)

If the status is not `ready to review` or there is no open PR, surface this to the user and ask how to proceed. Do not continue automatically.

### Step 2: Update story frontmatter

Edit the story file to:
1. Set `status: completed`
2. Add `date_archived: YYYY-MM-DD` (today's date)

### Step 3: Add "Why archived" note

Immediately after the breadcrumb line at the top of the story body, add:

```markdown
**Why archived:** Implemented. <one sentence summary of what was built, drawn from the story's Goal or devlog Outcome>.
```

### Step 4: Archive the story file

Move the story file into the archive directory:

```bash
git mv docs/product/backlog/<slug>.story.md docs/product/backlog/archive/<slug>.story.md
```

### Step 5: Commit and push

```bash
git add docs/product/backlog/archive/<slug>.story.md
git commit -m "docs(backlog): archive <slug> as completed"
git push
```

### Step 6: Squash-merge the PR

```bash
gh pr merge --squash --delete-branch
```

This merges the PR into main and deletes the remote branch in one step.

### Step 7: Return main worktree to main and clean up

```bash
git checkout main
git pull
git branch -d claude/<slug>
```

If the local branch cannot be deleted with `-d` (not fully merged warning due to squash), use `-D`:

```bash
git branch -D claude/<slug>
```

### Step 8: Confirm

Output a brief summary:

> **Done.** `<story title>` merged and archived.
> - PR squash-merged into main
> - Branch `claude/<slug>` deleted (local + remote)
> - Story archived at `docs/product/backlog/archive/<slug>.story.md`

## Constraints

- Do not merge if there is no open PR or the story is not `ready to review`.
- Always squash-merge — never a regular merge commit.
- Archive happens on the branch before merging, so the archived file lands in main via the squash commit.
