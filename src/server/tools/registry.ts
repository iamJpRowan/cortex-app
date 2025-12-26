import type { Tool } from './types.js';

/**
 * Global tool registry - tools register themselves here
 */
class ToolRegistry {
  private tools = new Map<string, Tool>();

  /**
   * Register a tool - makes it available to planning and execution
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get tool descriptions for planning prompts
   */
  getToolDescriptions(): string {
    return this.getAll()
      .map(tool => {
        const params = tool.parameters
          ? ` (parameters: ${Object.keys(tool.parameters).join(', ')})`
          : '';
        return `- ${tool.name}: ${tool.description}${params}`;
      })
      .join('\n');
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();



