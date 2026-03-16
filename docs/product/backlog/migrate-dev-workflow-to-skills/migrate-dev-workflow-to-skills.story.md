---
type: story
title: Migrate dev workflow to skills
status: in progress
summary: Replace Beads + runner script with Claude skills and agent-native orchestration using a recursive Story → Task hierarchy.
themes: []
children:
  - "[[new-backlog-structure.story.md]]"
  - "[[build-skills.story.md]]"
---

# Migrate dev workflow to skills

## Goal

Replace the Beads task-tracking tool and external runner script with a fully Claude-native development workflow. Work items are organized as **Stories** that nest recursively — a story either contains child stories (when scope is too large for one PR) or tasks (when it maps to a single PR). All orchestration moves into Claude skills. The end state is that a leaf story (one with tasks, no children) can be handed to `/work`, which drives all tasks to completion and opens a PR with no external tooling required.


##  Related Stories

### [[new-backlog-structure.story.md]]
Restructure the backlog to make stories and tasks that can be managed inside of Obsidian

### [[build-skills.story]] 
Build Claude skills based on the current agent workflow documents


## References

- [[how-we-work]]
- [[README]]
- [[decompose-backlog-item]]
- [[work-backlog-item]]
- [[create-pr-message]]
- [[refine-backlog-item]]
- [[prepare-to-commit]]
- [[commit]]
