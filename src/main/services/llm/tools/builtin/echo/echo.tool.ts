import { DynamicStructuredTool } from '@langchain/core/tools'
import { z } from 'zod'

/**
 * Echo tool - simple test tool that echoes back the input
 * Used to verify tool infrastructure is working
 */
export const echoTool = new DynamicStructuredTool({
  name: 'echo',
  description: 'Echoes back the input message. Useful for testing that tools are working correctly.',
  schema: z.object({
    message: z.string().describe('The message to echo back')
  }),
  func: async ({ message }) => {
    console.log(`[EchoTool] Received: ${message}`)
    return `Echo: ${message}`
  }
})
