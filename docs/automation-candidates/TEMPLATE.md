[Docs](../README.md) / [Automation Candidates](./README.md) / Automation Candidate Template

# Automation Candidate Template

Use this template when documenting automation opportunities discovered during Phase 4 of the use case workflow.

---

## Automation Candidate: [Descriptive Name]

**Use Case:** [Which use case document this relates to]

**Trigger:** [Daily/Weekly/Monthly/Event-driven/On-demand/Threshold-based]

**Description:**
[What would this automation do? Be specific about the actions it would take.]

**Value:**
[Why is this worth automating? What problem does it solve or what benefit does it provide?]

**Frequency/Conditions:**
[How often should this run, or what conditions trigger it?]

**Prerequisites:**
[What data, infrastructure, or other features need to exist first?]

**Dependencies:**
[What other automations or systems does this rely on?]

**Input Data Required:**
[What data does the automation need access to?]

**Expected Output:**
[What does this automation produce? Notifications, file updates, insights?]

**Observed in:**
[Links to chat sessions, devlogs, or features where this pattern was noticed]

**Estimated Effort:**
[Small/Medium/Large - rough complexity estimate]

**Priority:**
[Low/Medium/High - based on value and frequency of manual work]

**Notes:**
[Any additional context, edge cases, or considerations]

---

## Example Format

## Automation Candidate: Weekly Relationship Maintenance Suggestions

**Use Case:** Person File Enhancement

**Trigger:** Weekly (Sunday evenings)

**Description:**
Analyze interaction history with all people in the graph and identify relationships that haven't had recent contact but have historically been important. Generate personalized suggestions for reconnecting.

**Value:**
Helps maintain important relationships that might otherwise drift due to busy schedules. Reduces mental overhead of remembering to check in with people.

**Frequency/Conditions:**
- Runs every Sunday at 6pm
- Only suggests people not contacted in 30+ days
- Filters to relationships marked as "important" or with 5+ interactions in past year

**Prerequisites:**
- Person files with relationship metadata
- Interaction history from multiple sources (messages, calls, meetings)
- Classification of relationship importance

**Dependencies:**
- Email/messaging platform integration for interaction tracking
- Calendar integration for meeting history

**Input Data Required:**
- Full interaction history per person
- Relationship strength indicators
- User's stated relationship priorities

**Expected Output:**
- Weekly digest with 3-5 reconnection suggestions
- Context about last interaction and shared interests
- Optional: Draft message suggestions

**Observed in:**
- Chat session 2024-12-23 exploring person timelines
- Repeated manual queries: "Who haven't I talked to lately?"

**Estimated Effort:** Medium
- Requires pattern recognition logic
- Needs notification system
- Relationship scoring algorithm

**Priority:** Medium
- High value for maintaining relationships
- Manual process is tedious but infrequent

**Notes:**
- Should be configurable (time, frequency, relationship types)
- Respect user's privacy settings (no auto-sending messages)
- Allow user to mark relationships as "don't remind"
