# Test UI Panel Enhancement

## Goal

Extend the existing test panel UI to provide comprehensive testing capabilities for both Neo4j and Ollama services. The panel should allow users to verify connectivity, test queries, and view results for each service individually or together. This provides a unified interface for validating the full stack integration during Phase 0 development.

## Constraints and Requirements

### Prerequisites
- Step 2 complete (Neo4j integration with test handler)
- Step 3 complete (Ollama integration with test handlers)
- Existing TestPanel component already renders basic Neo4j test button

### Functional Requirements
- Display buttons for testing each service individually (Neo4j, Ollama)
- Provide button to list available Ollama models
- Include "Test Full Stack" button that runs both services sequentially
- Show status messages with appropriate visual feedback (info, success, error states)
- Display results clearly with service identification and model information
- Handle loading states during async operations

### UI/UX Requirements
- Use existing Tailwind CSS styling patterns
- Follow vanilla JSX component structure (no React)
- Maintain consistent button styling and spacing
- Use color-coded status messages (blue for info, green for success, red for errors)
- Provide clear visual feedback during async operations

### Non-Functional Requirements
- Must work with existing IPC communication pattern
- Should handle errors gracefully without breaking UI
- Status updates should be immediate and clear
- Sequential operations (like "Test Full Stack") should have appropriate delays between calls

## Approach

### Component Extension
- Extend existing `TestPanel` component in `src/renderer/src/components/TestPanel.tsx`
- Add additional test functions for Ollama operations
- Enhance status display to handle multiple service results
- Add sequential test execution for full stack verification

### Status Management
- Maintain single status display element (ref-based)
- Update status with appropriate type (info, success, error)
- Include service name and relevant details in status messages
- Show loading states during async operations

### API Integration
- Use existing `window.api.test` methods
- Add handlers for: `ollamaQuery()`, `listModels()`
- Follow established error handling pattern (check `result.success`)
- Display model information when available

### Visual Design
- Use Tailwind utility classes for styling
- Maintain consistent button layout and spacing
- Color scheme: Blue (Neo4j), Green (Ollama), Purple (List Models), Indigo (Full Stack)
- Status area with border and background colors matching message type

## Architectural Choices

### Component Structure
- Vanilla JSX component (no React hooks or state management)
- Closure-based state for status element reference
- Event handler functions defined within component scope
- Direct DOM manipulation via refs (following existing pattern)

### Styling Approach
- Tailwind CSS utility classes only
- No custom CSS files needed
- Color scheme matches service identity (blue=Neo4j, green=Ollama)
- Responsive layout with max-width container

### Error Handling
- Try-catch blocks around async operations
- Display error messages in status area
- Don't throw errors to avoid breaking UI
- Show user-friendly error messages from API responses

### Sequential Operations
- "Test Full Stack" runs Neo4j test first, then Ollama
- Small delay between operations for clarity
- Each operation updates status independently
- Final status shows combined result

### Dependencies
- **Requires:** Step 2 (Neo4j test handler), Step 3 (Ollama test handlers)
- **Uses:** Existing IPC pattern, vanilla JSX runtime, Tailwind CSS
- **Enables:** Step 5 (can add vault data test button later)

## Success Criteria

- UI renders with all four test buttons (Neo4j, Ollama, List Models, Full Stack)
- Each button executes corresponding test and displays results
- Status messages show appropriate colors and content
- Loading states are clear during async operations
- Error states display helpful messages
- "Test Full Stack" runs both tests sequentially with appropriate feedback
- UI remains responsive and doesn't break on errors

## Notes

- This extends the existing TestPanel component, not a complete rewrite
- The component uses imperative DOM updates (refs) rather than reactive state
- Status display is single-element to keep UI simple
- Button layout is vertical stack for clarity
- Future enhancements could include: query history, result persistence, more detailed error information
