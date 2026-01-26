import neo4j, { Driver } from 'neo4j-driver'
import { spawn, ChildProcess, execSync } from 'child_process'
import path from 'path'
import { app } from 'electron'
import fs from 'fs'

let neo4jProcess: ChildProcess | null = null
let driver: Driver | null = null

const NEO4J_BOLT_PORT = 7687
const NEO4J_HTTP_PORT = 7474
const USERNAME = 'neo4j'
const PASSWORD = 'cortex-dev-password'

/**
 * Check if Java is available and compatible
 */
function checkJava(): { available: boolean; error?: string; warning?: string } {
  try {
    const versionOutput = execSync('java -version', { encoding: 'utf8', stdio: 'pipe' })
    const versionMatch = versionOutput.match(/version "(\d+)\.(\d+)\.(\d+)/)

    if (versionMatch) {
      const majorVersion = parseInt(versionMatch[1], 10)

      // Neo4j 5.x requires Java 17 or 21 (not 11, not 25+)
      if (majorVersion < 17) {
        return {
          available: false,
          error:
            `Java ${majorVersion} is not supported. Neo4j 5.x requires Java 17 or 21.\n` +
            `Please install Java 17 or 21:\n` +
            `  macOS: brew install --cask temurin@17\n` +
            `  Linux: sudo apt install openjdk-17-jre\n` +
            `  Windows: Download Java 17 from https://adoptium.net/`,
        }
      }

      if (majorVersion > 21) {
        console.warn(
          `[Neo4j] Java ${majorVersion} is not officially supported. Neo4j recommends Java 17 or 21.`
        )
        return { available: true }
      }

      if (majorVersion === 17 || majorVersion === 21) {
        return { available: true }
      }
    }

    return { available: true }
  } catch {
    const platform = process.platform
    let installInstructions = ''

    if (platform === 'darwin') {
      installInstructions = 'brew install --cask temurin@17'
    } else if (platform === 'linux') {
      installInstructions = 'sudo apt install openjdk-17-jre'
    } else if (platform === 'win32') {
      installInstructions = 'Download Java 17 from https://adoptium.net/'
    }

    return {
      available: false,
      error:
        `Java Runtime Environment (JRE) 17 or 21 is required but not found.\n` +
        `Please install Java:\n  ${installInstructions}`,
    }
  }
}

/**
 * Get the path to Neo4j installation
 * Uses Electron's resource path APIs for proper cross-platform support
 */
function getNeo4jPath(): string {
  if (app.isPackaged) {
    // Production: Neo4j is in extraResources
    return path.join(process.resourcesPath, 'neo4j')
  } else {
    // Development: Neo4j is in project root resources/
    // __dirname points to dist-electron/main, go up 2 levels to project root
    const projectRoot = path.resolve(__dirname, '../..')
    return path.join(projectRoot, 'resources', 'neo4j')
  }
}

export async function startNeo4j(): Promise<Driver> {
  // Check Java first
  const javaCheck = checkJava()
  if (!javaCheck.available) {
    throw new Error(javaCheck.error || 'Java Runtime Environment is required')
  }

  if (javaCheck.warning) {
    console.warn(`[Neo4j] ${javaCheck.warning}`)
  }

  // Get Neo4j path
  const neo4jPath = getNeo4jPath()
  const dataPath = path.join(app.getPath('userData'), 'neo4j-data')

  // Check if Neo4j exists
  const binPath = path.join(neo4jPath, 'bin', 'neo4j')
  if (!fs.existsSync(binPath)) {
    const setupInstructions = app.isPackaged
      ? 'Neo4j server is missing from the app bundle. Please reinstall the application.'
      : 'Neo4j server not found. Run: npm run setup'

    throw new Error(`Neo4j binary not found at ${binPath}.\n${setupInstructions}`)
  }

  // Ensure data directory exists
  if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath, { recursive: true })
  }

  // Check if Neo4j is already running before trying to start
  try {
    const testDriver = neo4j.driver(
      `bolt://127.0.0.1:${NEO4J_BOLT_PORT}`,
      neo4j.auth.basic(USERNAME, PASSWORD)
    )
    await testDriver.verifyConnectivity()
    console.log('[Neo4j] Already running, connecting to existing instance')
    driver = testDriver
    return driver
  } catch {
    // Not running, continue to start it
    console.log('[Neo4j] Starting new instance...')
  }

  // Set password using neo4j-admin (canonical way)
  // This must be done BEFORE starting Neo4j
  const adminBinPath = path.join(neo4jPath, 'bin', 'neo4j-admin')
  try {
    execSync(`"${adminBinPath}" dbms set-initial-password ${PASSWORD}`, {
      env: {
        ...process.env,
        NEO4J_HOME: neo4jPath,
        NEO4J_DATA: dataPath,
      },
      stdio: 'pipe',
    })
    console.log('[Neo4j] Password set via neo4j-admin')
  } catch {
    // If password was already set, this may fail - that's OK, we'll use existing password
    // For fresh databases, NEO4J_AUTH will set it on first start
    console.log(
      '[Neo4j] Using NEO4J_AUTH for password (first run or password already set)'
    )
  }

  // Start Neo4j server
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NEO4J_HOME: neo4jPath,
    NEO4J_DATA: dataPath,
    NEO4J_AUTH: `${USERNAME}/${PASSWORD}`, // Fallback for first run
    NEO4J_server_bolt_listen__address: `127.0.0.1:${NEO4J_BOLT_PORT}`,
    NEO4J_server_http_listen__address: `127.0.0.1:${NEO4J_HTTP_PORT}`,
  }

  // Track Neo4j startup state via stdout events (event-driven)
  let boltEnabled = false
  let serverStarted = false
  let spawnError: Error | null = null

  // Start Neo4j server
  neo4jProcess = spawn(binPath, ['console'], { env })

  // Handle stderr (log errors)
  neo4jProcess.stderr?.on('data', data => {
    const output = data.toString()
    if (output.includes('already running')) {
      // Kill the failed spawn attempt
      if (neo4jProcess) {
        neo4jProcess.kill()
        neo4jProcess = null
      }
      spawnError = new Error(
        'Neo4j is already running. This usually happens if you restarted the app too quickly.\n' +
          'Please wait a few seconds for Neo4j to fully shut down, or kill it manually:\n' +
          '  pkill -f neo4j\n' +
          'Then run "npm run dev" again.'
      )
    } else {
      console.error('[Neo4j Error]', output)
    }
  })

  neo4jProcess.stdout?.on('data', data => {
    const output = data.toString()
    console.log('[Neo4j]', output)

    // Track when Bolt is enabled
    if (output.includes('Bolt enabled on')) {
      boltEnabled = true
    }

    // Track when server is fully started
    if (output.includes('Started.')) {
      serverStarted = true
    }
  })

  // Check for spawn error after a brief moment (only if error detected)
  // Note: We use a short delay here instead of a more deterministic approach (like polling
  // the port or waiting for process exit events) because:
  // 1. This error case is rare (only happens on quick restart after Ctrl+C)
  // 2. A deterministic approach would add complexity (polling, process tracking, etc.)
  // 3. The delay is minimal (500ms) and only occurs in the error path
  // 4. The error message provides clear instructions for the developer
  // If this becomes a common issue, we could implement port polling or process exit detection
  // Only wait if we haven't detected an error yet (give stderr time to report "already running")
  if (!spawnError) {
    await new Promise(resolve => setTimeout(resolve, 500))
    // Check again after the delay
    if (spawnError) {
      throw spawnError
    }
  } else {
    // Error detected immediately, throw it
    throw spawnError
  }

  // Check if process was killed (shouldn't happen, but safety check)
  if (!neo4jProcess) {
    throw new Error('Neo4j process was terminated unexpectedly')
  }

  // Check if process exited immediately
  if (
    neo4jProcess.killed ||
    (neo4jProcess.exitCode !== null && neo4jProcess.exitCode !== 0)
  ) {
    throw new Error(
      `Neo4j process exited with code ${neo4jProcess.exitCode}. Check the error logs above.`
    )
  }

  // Wait for Neo4j to report ready (event-driven, waits for "Started" message)
  await waitForNeo4jReady(() => boltEnabled && serverStarted)

  // Create driver and verify connection
  // Use 127.0.0.1 instead of localhost to avoid IPv6/IPv4 resolution issues
  driver = neo4j.driver(
    `bolt://127.0.0.1:${NEO4J_BOLT_PORT}`,
    neo4j.auth.basic(USERNAME, PASSWORD)
  )

  await driver.verifyConnectivity()
  console.log('[Neo4j] Connected successfully')

  return driver
}

async function waitForNeo4jReady(
  isReady: () => boolean,
  maxWaitSeconds = 60
): Promise<void> {
  const startTime = Date.now()
  while (!isReady() && Date.now() - startTime < maxWaitSeconds * 1000) {
    // Check if process is still running
    if (neo4jProcess && neo4jProcess.killed) {
      throw new Error('Neo4j process was killed before it could start')
    }
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  if (!isReady()) {
    throw new Error(
      `Neo4j did not report ready status within ${maxWaitSeconds} seconds.\n` +
        `Check the console logs above for error details.`
    )
  }
}

export async function stopNeo4j(): Promise<void> {
  if (driver) {
    await driver.close()
    driver = null
  }

  if (neo4jProcess) {
    // Send SIGTERM first for graceful shutdown
    neo4jProcess.kill('SIGTERM')

    // Wait for graceful shutdown, then force kill if needed
    await new Promise<void>(resolve => {
      const timeout = setTimeout(() => {
        if (neo4jProcess) {
          neo4jProcess.kill('SIGKILL')
        }
        resolve()
      }, 5000)

      neo4jProcess?.on('exit', () => {
        clearTimeout(timeout)
        resolve()
      })
    })

    neo4jProcess = null
  }
}

export function getDriver(): Driver {
  if (!driver) {
    throw new Error('Neo4j driver not initialized')
  }
  return driver
}
