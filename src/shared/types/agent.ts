/**
 * Agent Type Definitions
 *
 * Defines the Agent interface used throughout the application.
 * This type is designed to be forward-compatible with the Custom Agents
 * backlog item, matching the frontmatter schema defined there.
 *
 * @see docs/product/backlog/custom-agents.md
 */

/**
 * Tool permission configuration for an agent.
 * Defines which tools the agent can use and how.
 *
 * Permission levels:
 * - allow: Tool is available without prompts
 * - ask: Tool requires human approval before each use
 * - deny: Tool is never available to the agent
 *
 * Agent permissions intersect with global permissions (principle of least privilege).
 * An agent cannot grant permissions that are globally denied.
 */
export interface AgentToolPermissions {
  /** Tools this agent can use without prompts */
  allow?: string[]
  /** Tools requiring human approval (human-in-the-loop) */
  ask?: string[]
  /** Tools explicitly denied for this agent */
  deny?: string[]
}

/**
 * Agent configuration interface.
 *
 * Represents an AI agent with its configuration, instructions, and permissions.
 * Designed to match the Custom Agents frontmatter schema for seamless integration.
 */
export interface Agent {
  /** Unique identifier for the agent (required) */
  id: string

  /** User-defined display name (required) */
  name: string

  /** Optional description of the agent's purpose */
  description?: string

  /** System prompt / instructions for the agent (markdown body in Custom Agents) */
  instructions?: string

  /** Default model preference (optional, inherits global default if not set) */
  model?: string

  /** Tool permissions scoped to this agent */
  tools?: AgentToolPermissions

  // Future fields (defined in Custom Agents backlog, added here for reference):
  // version?: string           // For marketplace/sharing
  // accentColor?: string       // Hex color for UI theming
  // icon?: string              // Icon name from app icon system
  // temperature?: number       // Temperature setting
  // memory?: AgentMemoryConfig // Memory configuration
}

/**
 * Default agent used when no specific agent is selected.
 * This provides sensible defaults while allowing full customization.
 */
export const DEFAULT_AGENT: Agent = {
  id: 'default',
  name: 'Assistant',
  description: 'General-purpose AI assistant',
}
