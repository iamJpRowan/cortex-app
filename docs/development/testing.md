[Docs](../README.md) / [Development](./README.md) / Testing Strategy

# Testing Strategy

## Unit Tests (Vitest)

```typescript
// src/main/vault/operations.test.ts
import { describe, it, expect } from 'vitest'
import { readPersonFile } from './operations'

describe('Vault Operations', () => {
  it('reads person file correctly', async () => {
    const person = await readPersonFile('John Doe')
    expect(person.name).toBe('John Doe')
  })
})
```

## Integration Tests

```typescript
// src/main/neo4j/queries.integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { startNeo4j, stopNeo4j } from './embedded'
import { getPersonOccurrences } from './queries'

describe('Neo4j Queries', () => {
  let driver
  
  beforeAll(async () => {
    driver = await startNeo4j()
  })
  
  afterAll(async () => {
    await stopNeo4j(driver)
  })
  
  it('fetches person occurrences', async () => {
    const occurrences = await getPersonOccurrences('John Doe')
    expect(occurrences).toHaveLength(5)
  })
})
```

## Running Tests

```bash
npm test              # Run all tests
npm test -- --watch   # Watch mode
npm test -- --coverage # Coverage report
```

## Pre-commit Checks

Before committing, the project automatically runs type checking via a git pre-commit hook:

```bash
# Manual type check (runs automatically on commit)
npm run type-check

# Or use the precommit script
npm run precommit
```

**What gets checked:**
- TypeScript compilation errors
- Type mismatches
- Missing type definitions

**If type check fails:**
- The commit will be blocked
- Fix the TypeScript errors
- Try committing again

**To skip the hook (not recommended):**
```bash
git commit --no-verify
```

**Note:** The `.husky/` directory is committed to git so all developers get the same pre-commit checks.
