---
name: refine-story
description: Refine a story until it meets all readiness criteria for autonomous implementation. Reads the story, evaluates content quality, asks one focused question per failing criterion, and updates the story file in place.
allowed-tools: Read, Write, Edit, Glob, Grep
---

Story to refine: `$ARGUMENTS`

## Your task

Bring the story above to a point where an agent can implement it autonomously without asking clarifying questions. The story file is the source of truth — update it in place as answers are provided. Keep chat brief; do the work in the file.

**Do not change the story's status.** Refinement is a content improvement pass, not a lifecycle transition.

## Process

### 1. Read and load context

Read the story file. Identify all wikilinks in the body and frontmatter (format: `[[slug]]` or `[[slug|Display Text]]`).

For each wikilink, attempt to resolve it to an actual file by checking in order:
- `docs/agents/<slug>.md`
- `docs/product/backlog/<slug>.story.md`
- `docs/product/backlog/<slug>.md`
- Glob `docs/**/<slug>.md`

If any wikilink cannot be resolved, list the broken links and ask the user how to resolve each one before proceeding. Do not evaluate readiness criteria until all links resolve or the user explicitly says to skip them.

### 2. Evaluate readiness criteria

Check all 6 criteria against the current story content and report results before asking any questions:

```
Readiness check for <story title>:
✓/✗  1. No broken wikilinks
✓/✗  2. Goal is specific
✓/✗  3. Requirements are numbered and unambiguous
✓/✗  4. Success criteria are testable
✓/✗  5. Dependencies are scoped
✓/✗  6. UI references present (if needed)
```

For each ✗, include a one-line reason.

If all 6 pass, confirm: "All readiness criteria are met. This story is ready to work." Stop here.

### 3. Address failing criteria one at a time

Work through each failing criterion in order. For each one:

1. Ask **one focused question** about that criterion only. Do not bundle multiple criteria into one question.
2. Wait for the user's answer.
3. Update the story file immediately with the answer — write into the appropriate section (Goal, Requirements, Success criteria, etc.). Prefer editing existing content over appending.
4. Move to the next failing criterion.

After addressing all failing criteria, re-evaluate all 6 and report the updated results. If any still fail, continue the loop.

## Readiness criteria

**1. No broken wikilinks** — every file referenced in body or frontmatter exists.

**2. Goal is specific** — describes the concrete user-visible outcome, not a vague intent. No placeholder text. Ask: *"What is the specific outcome a user will observe when this story is done?"*

**3. Requirements are numbered and unambiguous** — each requirement is specific enough that an agent can make implementation decisions without asking "what does that mean?". No TODO or TBD items. Ask: *"Which requirement is unclear, and what decision would an agent need to make to implement it?"*

**4. Success criteria are testable** — each criterion is verifiable with a binary pass/fail check. "User can see X" is testable; "X should feel fast" is not. Ask: *"How would you verify each criterion with a concrete pass/fail check?"*

**5. Dependencies are scoped** — all `depends_on` stories are either `completed` or the story explicitly documents which parts are needed and confirms those parts are complete. If there are no dependencies, this passes automatically. Ask: *"Which parts of the dependency does this story actually need, and are those parts already complete?"*

**6. UI references present when needed** — if the story includes UI work, the Requirements section references `[[ui-guide]]` and `[[design/README]]`. If the story has no UI work, this passes automatically. Ask: *"Does this story include any UI changes? If so, I'll add the required design doc references."*

## Constraints

- One question per turn. Never ask about two criteria in the same message.
- Update the file immediately after each answer. Do not batch updates.
- Do not change `status` in frontmatter.
- Do not add implementation details — refinement defines the contract, not the approach.
