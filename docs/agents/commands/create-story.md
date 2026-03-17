---
name: create-story
description: Scaffold a new planned story in the backlog. Can be invoked by the user or by an agent (e.g. from within /plan-milestone).
allowed-tools: Read, Write, Glob, Grep, WebSearch
---

Scaffold a new `planned` story in the backlog.

## Behavior

Ask only what is needed. If invoked by an agent with context already provided, use that context and only ask for what is genuinely missing.

## Process

### 1. Gather context

**If invoked by the user directly**, ask up to 3 questions in one message:

1. What is the capability or feature this story delivers?
2. Which milestone(s) does it belong to? (glob `docs/product/milestones/*.milestone.md` and offer matches)
3. Are there any stories this depends on, or that depend on it?

**If invoked by an agent** with a title, description, and milestone already provided: skip to step 2 using that context. Ask only if critical information is missing.

### 2. Research

Before writing the file:

- **Glob** `**/*.story.md` and check for existing stories that overlap or could be `depends_on` candidates
- **Grep** `docs/development/architecture/` for concept docs that the story might `implement`
- **WebSearch** (optional but recommended) for prior art on the feature — use findings to improve the requirements stub

If the story clearly depends on an unsettled concept (no architecture doc exists), note it in the story body and recommend `defining-core-concepts` before refining.

### 3. Create the story file

Create `docs/product/backlog/<slug>.story.md` using `docs/product/backlog/TEMPLATE.story.md`.

Populate all known frontmatter:

```yaml
type: story
title: <title>
alias: <title>
status: planned
summary: <one-line description>
themes: []           # fill in if known
milestones:
  - "[[milestone-slug]]"   # from step 1
depends_on:          # from research + user input
  - "[[slug.story.md]]"
# implements: "[[path/to/concept]]"   # if architecture doc found
```

Write a body with at minimum:

```markdown
## Goal

<What this story achieves — 2–4 sentences>

## Requirements and constraints

_To be refined. Known constraints:_
- <any constraints already known>

## Success criteria

_To be refined. Initial criteria:_
- <any obvious success conditions>
```

### 4. Finish

Confirm in one message:

> Story created at `docs/product/backlog/<slug>.story.md` with status `planned`.
>
> Next steps:
> - `/refine-story` — flesh out requirements and success criteria
> - Return to `/plan-milestone` — if this was created to fill a gap in a milestone

Do not write more than this in chat.

---

## Recommended follow-on actions

| When | Action |
|---|---|
| Always (when invoked by user) | Offer `/refine-story` to flesh out requirements in the same session |
| Story touches an unsettled concept | Recommend `defining-core-concepts` before refining |
| Created as gap fill during planning | Return context to `/plan-milestone` so it can link the new story |

## Constraints

- Status is always `planned` on creation — never `refined` or beyond
- Do not write task files; task decomposition happens in `/work-story`
- Keep the body minimal — stub sections only; full requirements come from `/refine-story`
