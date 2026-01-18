[Docs](../README.md) / [Agents](./README.md) / Development Checklists

# Development Checklists

## Adding New IPC Handler
- [ ] Define TypeScript types for inputs/outputs
- [ ] Implement handler in main process
- [ ] Add input validation
- [ ] Add error handling
- [ ] Expose via preload script
- [ ] Add TypeScript definitions for renderer
- [ ] Write unit tests
- [ ] Test from renderer UI
- [ ] Document in appropriate file

## Creating New UI Component
- [ ] Define component props interface
- [ ] Implement JSX component function
- [ ] Add Tailwind classes for styling
- [ ] Attach event handlers
- [ ] Handle loading/error states
- [ ] Write component tests
- [ ] Integrate into parent component
- [ ] Test in running application

## Adding External Data Integration
- [ ] Define data storage format (MD vs JSON)
- [ ] Implement API client
- [ ] Create sync logic
- [ ] Add graph transformation
- [ ] Implement IPC handlers for UI access
- [ ] Create UI components for display
- [ ] Add error handling and retry logic
- [ ] Document integration approach
