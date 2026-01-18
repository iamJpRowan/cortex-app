[Docs](../README.md) / [Development](./README.md) / Code Style and Conventions

# Code Style and Conventions

## File Naming
- **Components**: PascalCase (e.g., `PersonCard.tsx`)
- **Utilities**: camelCase (e.g., `formatDate.ts`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `API_ENDPOINTS.ts`)

## Directory Naming
- **kebab-case** for all directories (e.g., `person-details/`, `vault-operations/`)

## Component Organization
- Colocate components with their tests and GraphQL queries
- Keep what changes together, together
- Reduces cognitive load and makes refactoring safer

## GraphQL
- TypeScript files with `gql` tagged templates
- Colocate queries with components that use them
