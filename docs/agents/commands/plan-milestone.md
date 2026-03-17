---
name: plan-milestone
description: Define a target capability as a milestone, map it to existing backlog stories, and flag gaps.
allowed-tools: Read, Write, Edit, Glob, Grep, WebSearch
---

Plan a new milestone by creating a milestone file that defines a target capability and maps it to existing backlog stories.

## Behavior

The milestone file is the primary output. Keep chat responses minimal — do the work in the file, not the conversation.

## Process

### 1. Gather the goal

If the user has not stated a target capability, ask one question:

> What capability should this milestone deliver? (e.g. "the app can read and write files in a connected folder")

Do not ask more than one question before proceeding.

### 2. Research before writing

Before creating the file:

- **Glob** `**/*.story.md` and review relevant stories — do not rely on memory
- **Read** relevant architecture/concept docs in `docs/development/architecture/` and `docs/product/` that relate to the capability
- **WebSearch** (optional but recommended) for prior art or similar product features — use findings to sharpen the goal statement and identify scope edges

If the milestone touches a concept that is not yet settled in the architecture docs, note it in the file (see step 4) and recommend `defining-core-concepts` before proceeding further.

### 3. Create the milestone file

Create `docs/product/milestones/<slug>.milestone.md` using `docs/product/milestones/TEMPLATE.milestone.md` as the template.

- **Slug:** kebab-case of the goal title (e.g. `app-reads-and-writes-files`)
- **Status:** `considering` until the user confirms the milestone is active
- Fill in `## Goal` with a clear, concrete description of the target capability

### 4. Populate `## Stories`

For each existing story that belongs to this milestone:

```
### [[slug.story|Story Title]]
Summary of what this story delivers.

> **Milestone notes:** Any context from this milestone planning session that the story author should know — scope clarifications, priority changes, dependencies discovered, or open questions.
```

- Mark optional stories with `(optional)` after the title
- List child stories as bullets under their parent
- Order stories by dependency (blocked stories come after what they depend on)

For any capability needed but **not yet covered by an existing story**, add a gap placeholder:

```
> **Story needed:** Title — one-line description of what needs to be built.
```

After writing the file, offer to invoke `/create-story` for each gap found. Do not create story files yourself.

### 5. Finish

Output one message pointing to the file:

> Milestone file created at `docs/product/milestones/<slug>.milestone.md`. Review it and let me know if you'd like to create stories for any gaps, or if any scope should change.

Do not summarize the contents of the milestone in chat.

---

## Recommended follow-on actions

| When | Action |
|---|---|
| Gap stories identified | Invoke `/create-story` for each |
| Milestone touches an unsettled concept | Use `defining-core-concepts` workflow first |
| Goal is confirmed and stories are refined | Use `/refine-story` on each `planned` story |

## Constraints

- **Never** create or modify story files during this command
- All substantive output goes in the milestone file, not chat
- Wikilinks follow the project convention: `[[slug.story|Display Title]]` for stories, `[[slug.milestone|Display Title]]` for milestones
