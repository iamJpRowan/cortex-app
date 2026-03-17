[Docs](../README.md) / [Agents](./README.md) / Decompose backlog item

# Decompose backlog item

**Intent:** Take a `refined` story and decompose it — either into child stories or into task files. Fully automated; no human turn required. Apply the decision rule below to determine which output is appropriate.

---

## The decision rule

**Create child stories when:**
- Delivering the story would require more than one PR.
- There are distinct phases or aspects that each benefit from separate review before the next begins.

**Create task files when:**
- The story maps to a single PR.
- All tasks share the same context, references, and implementation domain.

A story never has both child stories and task files. Decompose until every leaf story maps to exactly one PR.

---

## Creating child stories

1. **Read the story.** Load `<slug>.story.md` and all referenced docs. Understand the goal, requirements, success criteria, and constraints.

2. **Promote the story to a folder.** If the story is currently a flat file (`<slug>.story.md`), create the `<slug>/` directory and move the file into it as `<slug>/<slug>.story.md`.

3. **Create a child story file per phase or aspect.** For each `## Phase N: Title` or distinct aspect, create `<slug>/<child-slug>.story.md` (flat inside the parent folder). Each child story file must include:
   - **Frontmatter:** `type: story`, `title`, `status: planned`, `summary`, `parent: <parent-slug>.story.md`.
   - **Goal** — What this child story delivers (scoped to this phase/aspect only).
   - **Out of scope** — What it explicitly does not cover.
   - **Success criteria** — Concrete and testable; derived from the parent's criteria for this scope.
   - **References** — The subset of the parent's references that apply to this child.

4. **Update the parent story.** Add `children: [child-slug-1.story.md, child-slug-2.story.md]` to frontmatter in dependency order. Set parent status to `ready`.

5. **Pause for review.** After creating child stories, surface them to the user for scope validation before decomposing any child into tasks. Children start at `planned` — each is refined and decomposed separately.

---

## Creating task files

1. **Read the story.** Load `<slug>.story.md` and all referenced docs.

2. **Promote the story to a folder.** If the story is currently a flat file (`<slug>.story.md`), create the `<slug>/` directory and move the file into it as `<slug>/<slug>.story.md`.

3. **Create a task file per unit of work.** Name files `NN-slug.task.md` with a zero-padded numeric prefix for ordering (`01-`, `02-`, etc.). Each task file follows [TEMPLATE.task.md](../../product/backlog/TEMPLATE.task.md):

   ```markdown
   ---
   type: task
   title: <title>
   status: pending
   story: <parent-slug>.story.md
   depends_on: []
   ---

   # Task: <title>

   ## Scope
   What this task covers — specific enough to implement without reading anything beyond
   this file and its listed references.

   ## Acceptance criteria
   How to verify the task is complete.

   ## References
   - path/to/relevant/doc.md
   ```

   - Tasks must be completable in a single agent session (~10–30 minutes of agent work).
   - Use `depends_on` for tasks that must complete before this one can start (filenames including `.task.md`).
   - References in each task file are the minimal set needed — not the full story reference list.

4. **Update the story.** Set status to `ready` in the story file's frontmatter.

---

## Task sizing guidance

- **Too big:** If a task requires work across multiple domains (e.g. backend + frontend + docs), or would take more than one agent session, split it into two task files.
- **Too small:** If a task is just a rename or a single import, merge it into an adjacent task. A task should deliver a meaningful, testable unit of progress.
- **UI tasks:** No need to separate behavior from UI for review gating. All review happens at the leaf story PR. Focus task boundaries on logical units of work.

## See also

- [Agents guide](./README.md) — Backlog lifecycle and hierarchy
- [refine-backlog-item](./refine-backlog-item.md) — Produces `refined` stories ready for decomposition
- [work-backlog-item](./work-backlog-item.md) — How agents execute individual tasks
- [TEMPLATE.task.md](../../product/backlog/TEMPLATE.task.md) — Task file format
