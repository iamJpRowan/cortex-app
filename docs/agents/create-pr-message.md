[Docs](../README.md) / [Agents](./README.md) / Create PR message

# Create PR message

**Intent:** When all tasks in a story are complete, produce a PR body with a clear summary and concrete test steps, then open the PR. This workflow is **invoked by `/work`** when it detects all tasks in the current story are checked off.

## Context

You run on the branch for this story (`backlog/<epic-slug>-<story-slug>` or `backlog/<slug>` for single-story epics).

## Inputs

You will be given:

- **Story document path** — Path to the story doc (e.g. `docs/product/backlog/<slug>.md`).

## Process

1. **Read the story doc and devlog(s)** — Load the story doc and the devlog(s) in its `devlogs` frontmatter. Use them to understand what was built and how.

2. **Open the PR** — Run `gh pr create` with a body containing:
   - A short summary (2–3 sentences) of what was built and why.
   - A **"How to test"** section with concrete, numbered steps: how to run the app, where to navigate, what to interact with, and what to expect.
   - Links to the relevant devlog(s).

3. **Report the PR URL** — Return the PR URL to the `/work` skill so it can be surfaced to the user.

## Do not

- Change product code, commit files, or modify the story doc.
- Work on other stories or epics.

## See also

- [Agents guide](./README.md) — Full lifecycle and hierarchy
- [work-backlog-item](./work-backlog-item.md) — How implementation tasks are worked
