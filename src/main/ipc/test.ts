import { ipcMain } from 'electron'
import { getDriver } from '../services/neo4j'

export function registerTestHandlers() {
  ipcMain.handle('test:neo4j-query', async () => {
    const driver = getDriver()
    const session = driver.session()
    
    try {
      const result = await session.run('RETURN "Neo4j connected!" AS message')
      return {
        success: true,
        message: result.records[0].get('message')
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    } finally {
      await session.close()
    }
  })
}
