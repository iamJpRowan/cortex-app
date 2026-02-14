/**
 * Title generator for chat conversations.
 *
 * Uses a small local Ollama model to generate a short title from the first
 * user message. Always uses a local model for speed and privacy.
 */

import { HumanMessage } from '@langchain/core/messages'
import { providerRegistry } from './providers/registry'
import { getProviderConfigWithDecryptedKeys } from './providers/secure-config'
import { getSettingsService } from '@main/services/settings'

/** Prefer smallest local model for speed; fallback chain. */
const TITLE_MODEL_IDS = [
  'ollama:llama3.2:1b',
  'ollama:llama3.2:3b',
  'ollama:mistral-nemo:latest',
  'ollama:llama3.1:8b',
]

const MAX_TITLE_LENGTH = 60

/** Extract plain text from message content (string or content-block array). */
function messageContentToString(content: unknown): string {
  if (content == null) return ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const block of content) {
      if (
        block &&
        typeof block === 'object' &&
        'text' in block &&
        typeof (block as { text: unknown }).text === 'string'
      ) {
        parts.push((block as { text: string }).text)
      }
    }
    return parts.join('')
  }
  return JSON.stringify(content)
}

function getProviderConfig(providerId: string): unknown {
  const providers = getSettingsService().get('llm.providers') ?? {}
  const raw = providers[providerId]
  const rawObj =
    typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : undefined
  return getProviderConfigWithDecryptedKeys(rawObj)
}

/**
 * Sanitize and truncate the model's title response.
 */
function sanitizeTitle(raw: string): string {
  return raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\.+$/, '')
    .slice(0, MAX_TITLE_LENGTH)
    .trim()
}

/**
 * Generate a short title for a chat based on the first user message.
 * Uses a small local Ollama model for speed and privacy.
 *
 * @param userMessage The first user message (prompt)
 * @returns Generated title, or null if generation fails
 */
export async function generateChatTitle(userMessage: string): Promise<string | null> {
  const trimmed = userMessage.trim()
  if (!trimmed) return null

  for (const prefixedId of TITLE_MODEL_IDS) {
    try {
      const getConfig = (id: string) => getProviderConfig(id)
      const llm = await providerRegistry.getLLM(prefixedId, getConfig)

      const prompt = `Generate a short title (3-8 words) for a chat that starts with this message. Reply with ONLY the title, no quotes or punctuation.

Message: ${trimmed.slice(0, 500)}`

      const response = await llm.invoke([new HumanMessage(prompt)])
      const content = messageContentToString(response.content)

      const title = sanitizeTitle(content)
      if (title.length >= 2) {
        console.log(`[TitleGenerator] Generated: "${title}"`)
        return title
      }
    } catch (err) {
      console.warn(`[TitleGenerator] Model ${prefixedId} failed:`, err)
      continue
    }
  }

  console.warn('[TitleGenerator] All models failed, keeping default title')
  return null
}
