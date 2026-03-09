[Docs](../../README.md) / [Development](../README.md) / [Agents](./README.md) / Set backlog item ready for review

# Set backlog item ready for review

**Intent:** When all Beads tasks for a backlog item (epic) are closed, prepare the backlog document so the user can review the full deliverable. Add a Review summary and set status to `ready for review`. Do **not** implement code, set the item to `completed`, or archive it — the user does that after review.

This workflow is invoked by the **runner** when it detects an epic has all children closed. The agent's job is only what this document describes.

## Inputs

You will be given:

- **Epic ID** — The Beads epic whose tasks are all closed.
- **Backlog document path** — Path to the backlog item file (e.g. `docs/product/backlog/<slug>.md`).

Use these to scope your work; do not work on other items.

## Process

1. **Open the backlog doc and linked devlogs** — Read the backlog item and the devlog(s) listed in its `devlogs` frontmatter. Use them to summarize what was built.

2. **Add or update the Review summary** — In the backlog document, add or update a **Review summary** section (e.g. `## Review summary`). Include:
   - A short summary (1–2 paragraphs) of what was built and why.
   - A bullet list of **steps to test and validate** (how to run, where to look in the UI, what to expect).
   - Links to the devlog(s) and any key code areas.

   Alternatively, you may create a companion file at `docs/product/backlog/review/<slug>.md` with the same content and link to it from the backlog doc. Prefer updating the backlog doc in place unless the summary is very long.

3. **Set backlog status** — In the backlog document's YAML frontmatter, set `status: ready for review`. This signals to the user (and to the runner) that the item is ready for human review and that this workflow need not run again for this epic.

4. **Optional: label the epic** — To avoid duplicate runs, you may add a label to the epic, e.g. `bd label add <epic-id> ready-for-review-done`. The primary idempotency signal is the backlog doc status.

## Do not

- Change or add product code.
- Set the backlog item to `completed` or move it to archive. Only the user does that after testing and approval.
- Push to remote or create a PR. The **runner** handles pushing the branch and creating a PR with the review summary after this workflow completes.
- Work on other backlog items or tasks.

## See also

- [work-backlog-item](./work-backlog-item.md) — How implementation tasks are worked
- [Backlog TEMPLATE](../../product/backlog/TEMPLATE.md) — Backlog structure and status values
- [Devlogs README](../../product/devlogs/README.md) — Devlog format and linking
