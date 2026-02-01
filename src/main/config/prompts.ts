/**
 * Prompt Loading Module
 *
 * Loads system prompts from markdown files for better editing experience.
 * Prompts are split into two layers:
 * - Base system prompt: Always applied, not user-editable (tool usage, formatting)
 * - Agent instructions: Editable, will become per-agent in custom-agents feature
 *
 * @see docs/backlog/custom-agents.md - Layered prompts architecture
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const PROMPTS_DIR = join(__dirname, 'prompts')

/**
 * Fallback base system prompt if file cannot be read
 */
const FALLBACK_BASE_PROMPT = `When you use a tool, you will receive its result.
IMPORTANT: Always use the tool result to formulate your final answer.
If a tool returns data, include that data in your response to the user.
Do not say you lack information if a tool has already provided it.

## Response Formatting
Format all responses using markdown for readability.`

/**
 * Fallback agent instructions if file cannot be read
 */
const FALLBACK_AGENT_INSTRUCTIONS = 'You are a helpful assistant with access to tools.'

/**
 * Read a prompt file, returning fallback if file cannot be read
 */
function readPromptFile(filename: string, fallback: string): string {
  try {
    const content = readFileSync(join(PROMPTS_DIR, filename), 'utf-8')
    console.log(`[Prompts] Loaded ${filename}`)
    return content.trim()
  } catch (error) {
    console.warn(`[Prompts] Could not read ${filename}, using fallback:`, error)
    return fallback
  }
}

/**
 * Get the base system prompt (hardcoded layer)
 * Contains tool usage rules and response formatting guidelines
 */
export function getBaseSystemPrompt(): string {
  return readPromptFile('base-system.md', FALLBACK_BASE_PROMPT)
}

/**
 * Get default agent instructions (editable layer)
 * Will become per-agent when custom-agents feature is implemented
 */
export function getDefaultAgentInstructions(): string {
  return readPromptFile('default-agent.md', FALLBACK_AGENT_INSTRUCTIONS)
}

/**
 * Get the full system prompt (base + agent instructions concatenated)
 * This is what gets passed to the LLM
 */
export function getFullSystemPrompt(): string {
  const base = getBaseSystemPrompt()
  const agent = getDefaultAgentInstructions()
  return `${base}\n\n${agent}`
}
