[Docs](../README.md) / [Development](./README.md) / Use Case Workflow Guide

# Use Case Workflow Guide

## Introduction

### Purpose

This document guides the implementation of individual features from the use case idea library. Use case documents (in `/Use Cases/`) contain collections of potential enhancements - chat queries, UI components, data integrations, and automation opportunities. This workflow shows how to take ONE specific example and implement it end-to-end in the Electron desktop application.

**Who uses this:**
- You, when implementing features incrementally
- AI agents working with you on feature development

**How it fits with other documentation:**
- **Use Case documents**: Idea repositories - what could be built
- **This document**: Implementation workflow - how to build one thing at a time
- **[DEVELOPMENT.md](./DEVELOPMENT.md)**: Practical setup and tooling - how to run and configure
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Principles and decisions - why things are built this way
- **[AGENTS.md](./AGENTS.md)**: AI agent collaboration patterns

### How to Use This Guide

**Starting point:**
Begin each feature with: "I want to implement [specific example] from [use case document]"

Example: "I want to implement 'Show me all interactions with Sarah last month' from Person File Enhancement"

**Expectations:**
- Work through phases sequentially, not all at once
- Each phase produces a complete, working increment
- Pause at decision points for human confirmation
- Not every feature needs all four phases

**Key principles:**
- **One feature at a time** - Don't try to implement entire use case at once
- **Vertical slice** - Touch all necessary layers (main process, IPC, renderer, data)
- **Manual proof first** - Demonstrate value before building automation
- **AI asks, not assumes** - When uncertain, pause and clarify

**What this is NOT:**
- Not a waterfall process - iterate within phases as needed
- Not required to complete all 4 phases for every feature
- Not prescriptive about which use case to work on when
- Not a substitute for architectural judgment

---

## The Four-Phase Pattern

### Overview of the Cycle

Each feature follows this progression:

**Phase 1: Chat Exploration** → **Phase 2: Bespoke UI** → **Phase 3: Data Integration** → **Phase 4: Automation Documentation**

**Why this sequence:**
- Prove value manually before building complexity
- Learn about data and graph structure through exploration
- UI emerges from understanding the insight, not speculation
- Integration only when external data proves necessary
- Automation only after manual patterns are proven valuable

### What Happens in Each Phase

**Phase 1: Chat Exploration (Always Required)**
Make the query work conversationally. LLM (via embedded Ollama) generates Cypher, executes via main process, results are useful.

**Phase 2: Bespoke UI Component (Usually Required)**
Visualize results beyond chat interface. Build the specific JSX component that makes this insight clear and actionable.

**Phase 3: Data Integration (Conditional)**
Enrich with external data sources only if needed for this specific feature. Follow ELT pattern, respect source-appropriate flow.

**Phase 4: Automation Documentation (Observational)**
Capture what could eventually be automated. Document the pattern, don't build it yet.

### Phase Dependencies

- **Phase 1** is always required - foundation for everything else
- **Phase 2** usually follows - better UX than chat alone for most insights
- **Phase 3** is conditional - only proceed if external data enriches this specific feature
- **Phase 4** is observational - always capture opportunities, rarely build immediately

### Iteration Within Phases

Each phase may take multiple cycles to refine:
- Don't rush to the next phase
- Make the current phase solid before moving forward
- It's okay to go back to earlier phases when you learn something new
- "Complete enough to learn from" beats "perfect"

---

## Phase 1: Chat Exploration

### Principles

- Start with the simplest version of the query
- Focus on getting LLM → Cypher → Neo4j → results working via IPC
- Identify graph structure gaps early
- Document what's hard for the LLM to navigate
- Test edge cases (no results, multiple results, missing data)

### Implementation Steps

**1. Define the User Intent**

Articulate what the user wants to accomplish in natural language.

*Example: "Show me all interactions with Sarah last month"*

**2. Create Main Process Query Handler**

Add IPC handler that receives natural language, converts to Cypher via LLM, executes query.

```typescript
// src/main/ipc/chat.ts
ipcMain.handle('chat:query', async (_, userMessage: string) => {
  // Use embedded Ollama to generate Cypher
  const cypher = await generateCypherFromIntent(userMessage)
  
  // Execute against embedded Neo4j
  const session = neo4jDriver.session()
  try {
    const result = await session.run(cypher)
    return {
      query: cypher,
      results: result.records.map(r => r.toObject())
    }
  } finally {
    await session.close()
  }
})
```

**3. Build Simple Chat UI**

Create JSX component for chat interaction in renderer process.

```typescript
// src/renderer/components/Chat.tsx
function Chat() {
  const messages: Message[] = []
  
  async function handleSubmit(userInput: string) {
    messages.push({ role: 'user', content: userInput })
    renderMessages()
    
    const response = await window.api.chat.query(userInput)
    messages.push({ role: 'assistant', content: formatResults(response) })
    renderMessages()
  }
  
  return (
    <div className="flex flex-col h-full">
      <div id="messages" className="flex-1 overflow-y-auto p-4">
        {/* Messages rendered here */}
      </div>
      <ChatInput onSubmit={handleSubmit} />
    </div>
  )
}
```

**4. Test Query Variations**

Try different phrasings, edge cases, ambiguous requests:
- "Show interactions with Sarah last month"
- "What did I do with Sarah recently?"
- "Sarah activities"
- "Sarah" (too vague - should ask for clarification)

**5. Refine LLM Instructions**

Based on what works/doesn't work, update system prompt for Cypher generation:
- Add examples of successful conversions
- Document graph schema patterns LLM should know
- Add validation rules for generated queries

**6. Document Query Patterns**

Capture what you learned:
- Which phrasings work well
- What graph relationships were navigated
- Where schema improvements would help
- Performance considerations

### Success Criteria

- [ ] Natural language query converts to valid Cypher
- [ ] Query executes successfully against embedded Neo4j
- [ ] Results are accurate and useful
- [ ] Edge cases are handled gracefully
- [ ] Performance is acceptable (< 2 seconds for typical query)

### Common Challenges

**Challenge: LLM generates invalid Cypher**
- Review system prompt for clarity
- Add more examples to prompt
- Validate queries before execution
- Log failures for pattern analysis

**Challenge: Results are incomplete**
- Check graph structure - are relationships missing?
- Consider if data integration (Phase 3) is needed
- Update transformation logic if source data is complete

**Challenge: Query is too slow**
- Add Neo4j indexes on frequently queried properties
- Optimize Cypher query structure
- Consider caching for repeated queries

---

## Phase 2: Bespoke UI Component

### Principles

- Design for the specific insight, not generic CRUD
- Use visualizations when they clarify better than text
- Keep interactions intuitive and focused
- Follow Electron desktop UX patterns

### Implementation Steps

**1. Identify Visualization Type**

Based on the data and insight, choose appropriate visualization:
- **Timeline**: Sequential events (occurrences, activities)
- **Network graph**: Relationships between entities (person connections)
- **Map**: Location-based data (places visited)
- **Stats dashboard**: Metrics and aggregations
- **List with rich detail**: Structured records with context
- **Combination**: Multiple views for different aspects

*Example for "Sarah interactions": Timeline with occurrence cards*

**2. Create Component Structure**

Build JSX component in renderer process:

```typescript
// src/renderer/components/PersonInteractionTimeline.tsx
interface TimelineEntry {
  date: string
  type: string
  title: string
  participants: string[]
}

function PersonInteractionTimeline({ personName }: { personName: string }) {
  const [entries, setEntries] = useState<TimelineEntry[]>([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadInteractions()
  }, [personName])
  
  async function loadInteractions() {
    setLoading(true)
    const data = await window.api.person.getInteractionTimeline(personName)
    setEntries(data)
    setLoading(false)
  }
  
  if (loading) return <LoadingSpinner />
  
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-2xl font-bold">Interactions with {personName}</h2>
      <div className="space-y-2">
        {entries.map(entry => (
          <TimelineCard key={entry.date} entry={entry} />
        ))}
      </div>
    </div>
  )
}
```

**3. Add IPC Handler for Component Data**

Create specific handler for this UI's data needs:

```typescript
// src/main/ipc/person.ts
ipcMain.handle('person:get-interaction-timeline', async (_, personName: string) => {
  const session = neo4jDriver.session()
  try {
    const result = await session.run(`
      MATCH (p:Person {name: $name})-[r:ATTENDED]->(o:Occurrence)
      WHERE o.date >= date() - duration('P1M')
      RETURN o.date, o.title, o.type
      ORDER BY o.date DESC
    `, { name: personName })
    
    return result.records.map(r => ({
      date: r.get('o.date'),
      title: r.get('o.title'),
      type: r.get('o.type')
    }))
  } finally {
    await session.close()
  }
})
```

**4. Style with Tailwind**

Apply utility classes for visual polish:

```typescript
function TimelineCard({ entry }: { entry: TimelineEntry }) {
  return (
    <div className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 cursor-pointer">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{entry.title}</h3>
          <p className="text-sm text-gray-600">{entry.type}</p>
        </div>
        <span className="text-sm text-gray-500">{formatDate(entry.date)}</span>
      </div>
    </div>
  )
}
```

**5. Add Interactions**

Enable user actions on the visualization:
- Click to view full occurrence details
- Filter by occurrence type
- Adjust time range
- Export data

**6. Test UX Flow**

Walk through common scenarios:
- What happens with no data?
- How does it handle many results (100+)?
- Is loading state clear?
- Are errors handled gracefully?

### Success Criteria

- [ ] Component renders data clearly
- [ ] Interactions feel natural and responsive
- [ ] Loading and error states are handled
- [ ] Performance is good even with lots of data
- [ ] Styling matches overall app aesthetic
- [ ] Component is reusable for similar use cases

### Common Challenges

**Challenge: Too much data to render at once**
- Implement virtual scrolling
- Add pagination
- Filter/group data by default
- Progressive loading as user scrolls

**Challenge: Component becomes too complex**
- Break into smaller sub-components
- Move logic to main process
- Simplify the visualization approach

**Challenge: Slow to load**
- Optimize Neo4j query
- Cache results in main process state
- Load incrementally (show partial results immediately)

---

## Phase 3: Data Integration

### Principles

- Only integrate when internal data is insufficient
- Follow ELT pattern (Extract → Load → Transform)
- Respect source-appropriate data flow
- Use "Would I want to reference this in my Notes?" heuristic

### When to Enter Phase 3

Ask: "Does this feature need external data to be valuable?"

**Proceed if:**
- Insight requires data not in vault (e.g., Strava metrics, GitHub commits)
- Enhancement depends on real-time external state
- Correlation with external platform adds value

**Skip if:**
- Vault data is sufficient
- External data would be "nice to have" but not essential
- Integration complexity outweighs benefit

### Implementation Steps

**1. Choose Storage Format**

**Markdown + YAML Frontmatter (Text-heavy, referenceable):**
- Events worth remembering
- Activities with narrative content
- Documents you'd link in notes

**JSON/CSV/Parquet (Data-only, high-volume):**
- Metrics and measurements
- Logs and continuous streams
- Raw data feeds

*Example: Strava run with reflection note → Markdown. Strava raw GPS data → JSON*

**2. Build API Client**

Create integration client in main process:

```typescript
// src/main/integrations/strava.ts
export class StravaClient {
  async fetchActivities(since: Date): Promise<Activity[]> {
    const response = await fetch(
      `https://www.strava.com/api/v3/athlete/activities?after=${since.getTime() / 1000}`,
      { headers: { Authorization: `Bearer ${this.accessToken}` } }
    )
    return response.json()
  }
}
```

**3. Implement Sync Logic**

Handle incremental sync, conflict resolution:

```typescript
// src/main/sync/strava-sync.ts
export async function syncStravaActivities() {
  const lastSync = await getLastSyncTime('strava')
  const activities = await stravaClient.fetchActivities(lastSync)
  
  for (const activity of activities) {
    const filePath = path.join(dataDir, 'strava', `${activity.id}.json`)
    await fs.writeFile(filePath, JSON.stringify(activity, null, 2))
  }
  
  await setLastSyncTime('strava', new Date())
  await rebuildGraphFromSource('strava')
}
```

**4. Transform to Graph**

Add transformation logic for graph loading:

```typescript
// src/main/graph/transformers/strava.ts
export async function transformStravaToGraph(activityPath: string) {
  const activity = JSON.parse(await fs.readFile(activityPath, 'utf-8'))
  
  const session = neo4jDriver.session()
  try {
    await session.run(`
      MERGE (a:Activity {id: $id, source: 'strava'})
      SET a.name = $name,
          a.type = $type,
          a.distance = $distance,
          a.duration = $duration
    `, {
      id: activity.id,
      name: activity.name,
      type: activity.type,
      distance: activity.distance,
      duration: activity.moving_time
    })
  } finally {
    await session.close()
  }
}
```

**5. Handle Multi-Source Resolution**

If entity exists in multiple sources, merge in graph:

```typescript
// A run exists in both Strava and Garmin
await session.run(`
  MATCH (a1:Activity {source: 'strava', external_id: $stravaId})
  MATCH (a2:Activity {source: 'garmin', external_id: $garminId})
  WHERE a1.start_time = a2.start_time
  MERGE (a:Activity {id: $mergedId})
  SET a += a1, a.sources = ['strava', 'garmin']
  DELETE a1, a2
`)
```

**6. Add UI for Integration Status**

Show sync status, trigger manual sync:

```typescript
// src/renderer/components/IntegrationStatus.tsx
function IntegrationStatus({ integration }: { integration: string }) {
  const [status, setStatus] = useState<SyncStatus | null>(null)
  
  useEffect(() => {
    window.api.integrations.getStatus(integration).then(setStatus)
  }, [integration])
  
  async function handleSync() {
    await window.api.integrations.sync(integration)
    // Refresh status
  }
  
  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">{integration}</h3>
      <p>Last sync: {status?.lastSync}</p>
      <button onClick={handleSync}>Sync Now</button>
    </div>
  )
}
```

### Success Criteria

- [ ] Data syncs successfully from external source
- [ ] Storage format matches heuristic (MD vs JSON)
- [ ] Graph transformation creates correct relationships
- [ ] Multi-source entities are resolved properly
- [ ] Sync is incremental (doesn't re-fetch everything)
- [ ] Errors are handled and reported clearly

### Common Challenges

**Challenge: API rate limits**
- Implement exponential backoff
- Cache responses when possible
- Sync in smaller batches

**Challenge: Schema changes in external API**
- Version transformation logic
- Handle missing fields gracefully
- Log schema mismatches for review

**Challenge: Sync takes too long**
- Run sync in background
- Show progress in UI
- Allow cancellation

---

## Phase 4: Automation Documentation

### Principles

- Capture automation opportunities, don't build yet
- Wait until multiple similar patterns emerge
- Document enough detail to implement later
- Prioritize by value and repetitiveness

### When to Document Automation

**After manual pattern is proven:**
- You've done this manually 3+ times
- The steps are consistent and predictable
- Value is clear and immediate
- Risk of automation failure is low

**Examples of automation candidates:**
- Daily: "Summarize interactions with people I haven't seen in 30+ days"
- Weekly: "Identify occurrence files missing location tags"
- Monthly: "Generate statistics on activity types and locations"

### Documentation Template

Use the template in `/automation-candidates/TEMPLATE.md`:

```markdown
# [Automation Name]

## Trigger
When this automation should run (schedule, event, condition)

## Input Requirements
What data/context is needed

## Process Steps
Detailed steps the automation would execute

## Output
What gets created/updated/sent

## Success Criteria
How to verify it worked correctly

## Failure Handling
What to do if something goes wrong

## Value Proposition
Why this is worth automating

## Implementation Estimate
Rough complexity (hours/days)
```

### Creating Automation Candidate

**1. Identify the Pattern**

After manually performing a task multiple times, recognize it's automatable.

*Example: Every week you run a query to find people you haven't seen recently, then create a reminder*

**2. Document Current Manual Process**

Write down exactly what you do:
1. Query graph for people with no recent occurrences
2. Filter out people you don't need to see regularly
3. Create occurrence drafts for catchup coffees
4. Add to task list

**3. Define Automation Trigger**

When should this run?
- Schedule: Every Monday at 9am
- Event: When new occurrence is created
- Condition: When person count drops below threshold

**4. Specify Agent Behavior**

What should the AI agent do?
- Query for data
- Apply business logic (filters, prioritization)
- Generate content (draft files, summaries)
- Send notifications or create tasks

**5. Plan Human Review Points**

Where does human judgment matter?
- Approve before sending notifications
- Review generated content before committing
- Confirm before expensive operations

**6. Save to `/automation-candidates/`**

File it for future implementation.

### Success Criteria

- [ ] Automation candidate is clearly documented
- [ ] Manual pattern has been performed 3+ times
- [ ] Value is articulated and measurable
- [ ] Risks and failure modes are identified
- [ ] Implementation estimate is reasonable

### Common Challenges

**Challenge: Automation scope creep**
- Keep scope narrow and focused
- One automation per candidate document
- Combine similar automations only if truly identical

**Challenge: Unclear value**
- Estimate time saved per run
- Calculate frequency of running
- Compare to implementation cost

---

## Example: Complete Feature Implementation

### Feature: "Show Weekly Activity Summary"

**Phase 1: Chat Exploration**

*User Query: "What did I do last week?"*

1. Build IPC handler for chat queries
2. Use Ollama to convert to Cypher:
   ```cypher
   MATCH (o:Occurrence)
   WHERE o.date >= date() - duration('P7D')
   RETURN o.date, o.title, o.type
   ORDER BY o.date DESC
   ```
3. Return results in chat
4. Test variations: "last week", "this week", "past 7 days"
5. Refine LLM instructions for date parsing

**Phase 2: Bespoke UI Component**

1. Design: Timeline view with day headers
2. Create `WeeklySummary.tsx` component
3. Add IPC handler: `stats:get-weekly-summary`
4. Implement grouping by day logic in main process
5. Style with Tailwind: clean day separators, occurrence cards
6. Add filters: by type, by person, by location

**Phase 3: Data Integration (Conditional)**

*Question: Does this need external data?*
- If only showing vault occurrences: Skip Phase 3
- If enriching with Strava activities: Proceed

1. Sync Strava activities to JSON files
2. Transform to graph: Activities linked to dates
3. Update UI to show both occurrences and activities
4. Merge display logic for unified timeline

**Phase 4: Automation Documentation**

*Observation: This is run every Monday morning*

Document automation candidate:
- **Trigger**: Every Monday at 8am
- **Process**: Generate weekly summary, send notification
- **Output**: Notification with summary + link to full view
- **Value**: Saves 2 minutes every week, improves weekly planning

---

## Decision Trees

### Should I Build a UI Component?

```
Is this insight hard to understand from chat text alone?
├─ YES → Proceed to Phase 2
└─ NO → Does this get used frequently?
    ├─ YES → Proceed to Phase 2 (convenience)
    └─ NO → Stay in Phase 1 (chat is sufficient)
```

### Should I Integrate External Data?

```
Is the feature valuable with only vault data?
├─ YES → Skip Phase 3 (vault data is sufficient)
└─ NO → Is external data available via API?
    ├─ YES → Proceed to Phase 3
    └─ NO → Either find alternative or skip feature
```

### Should I Build Automation Now?

```
Have I done this manually 3+ times?
├─ NO → Document candidate, continue manually
└─ YES → Is the pattern consistent?
    ├─ NO → Document candidate, continue manually
    └─ YES → Is failure risk low?
        ├─ NO → Document candidate, continue manually
        └─ YES → Consider building automation
```

---

## Tips for Success

### Start Small
- Pick the simplest version of a feature
- Get it working end-to-end
- Add complexity incrementally

### Embrace Iteration
- Perfect is the enemy of done
- Ship working version, improve based on usage
- It's okay to revisit earlier phases

### Document as You Go
- Capture learnings immediately
- Note what worked / what didn't
- Update this guide when patterns emerge

### Leverage AI Effectively
- Be specific about what you want
- Review AI-generated code carefully
- Pair AI code generation with human architectural thinking

### Respect Phase Boundaries
- Don't skip phases
- Complete current phase before moving forward
- Pause when you hit decision points

---

*This workflow guide is a living document. Update it as implementation patterns evolve and new best practices emerge.*
