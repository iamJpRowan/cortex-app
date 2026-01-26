import { ipcMain } from 'electron'
import { getDriver } from '../services/neo4j'
import { testQuery, listModels, getDefaultModel } from '../services/ollama'

export function registerTestHandlers() {
  ipcMain.handle('test:neo4j-query', async () => {
    const driver = getDriver()
    const session = driver.session()

    try {
      const result = await session.run('RETURN "Neo4j connected!" AS message')
      return {
        success: true,
        message: result.records[0].get('message'),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      await session.close()
    }
  })

  ipcMain.handle('test:ollama-query', async (_event, prompt?: string) => {
    return await testQuery(prompt)
  })

  ipcMain.handle('test:ollama-list-models', async () => {
    try {
      const models = await listModels()
      return {
        success: true,
        models,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  ipcMain.handle('test:ollama-get-default-model', async () => {
    const model = getDefaultModel()
    return {
      success: model !== null,
      model: model || null,
    }
  })
}
