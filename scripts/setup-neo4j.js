#!/usr/bin/env node

/**
 * Setup script to download and extract Neo4j Community Server
 * This script automates the manual download step for developers
 */

const fs = require('fs')
const path = require('path')
const https = require('https')
const { execSync } = require('child_process')
const { createWriteStream } = require('fs')
const { pipeline } = require('stream/promises')

const NEO4J_VERSION = '5.22.0'
const NEO4J_URL = `https://dist.neo4j.org/neo4j-community-${NEO4J_VERSION}-unix.tar.gz`
const RESOURCES_DIR = path.join(__dirname, '..', 'resources')
const NEO4J_DIR = path.join(RESOURCES_DIR, 'neo4j')
const NEO4J_BIN = path.join(NEO4J_DIR, 'bin', 'neo4j')
const TMP_FILE = path.join(__dirname, '..', 'tmp-neo4j.tar.gz')

// Platform detection
const platform = process.platform
const arch = process.arch

function log(message) {
  console.log(`[setup-neo4j] ${message}`)
}

function error(message) {
  console.error(`[setup-neo4j] ERROR: ${message}`)
  process.exit(1)
}

function checkJava() {
  try {
    const version = execSync('java -version', { encoding: 'utf8', stdio: 'pipe' })
    log('Java found')
    return true
  } catch (err) {
    return false
  }
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    log(`Downloading ${url}...`)
    const file = createWriteStream(dest)
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Follow redirect
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject)
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`))
        return
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10)
      let downloaded = 0
      
      response.on('data', (chunk) => {
        downloaded += chunk.length
        const percent = ((downloaded / totalSize) * 100).toFixed(1)
        process.stdout.write(`\r[setup-neo4j] Progress: ${percent}%`)
      })
      
      response.pipe(file)
      
      file.on('finish', () => {
        file.close()
        console.log() // New line after progress
        resolve()
      })
      
      file.on('error', reject)
    }).on('error', reject)
  })
}

async function extractTarGz(tarPath, extractDir) {
  log('Extracting Neo4j...')
  try {
    // Create extract directory
    if (!fs.existsSync(extractDir)) {
      fs.mkdirSync(extractDir, { recursive: true })
    }
    
    // Extract using tar (works on macOS/Linux)
    execSync(`tar -xzf "${tarPath}" -C "${extractDir}"`, { stdio: 'inherit' })
    
    // Move extracted folder to neo4j directory
    const extractedDir = path.join(extractDir, `neo4j-community-${NEO4J_VERSION}`)
    if (fs.existsSync(extractedDir)) {
      const finalDir = path.join(extractDir, 'neo4j')
      if (fs.existsSync(finalDir)) {
        fs.rmSync(finalDir, { recursive: true, force: true })
      }
      fs.renameSync(extractedDir, finalDir)
    }
    
    // Make binary executable
    if (fs.existsSync(NEO4J_BIN)) {
      fs.chmodSync(NEO4J_BIN, 0o755)
    }
    
    log('Extraction complete')
  } catch (err) {
    error(`Failed to extract: ${err.message}`)
  }
}

async function main() {
  log('Starting Neo4j setup...')
  
  // Check if already installed
  if (fs.existsSync(NEO4J_BIN)) {
    log('Neo4j already installed, skipping download')
    return
  }
  
  // Check Java
  if (!checkJava()) {
    error(
      'Java Runtime Environment (JRE) 11+ is required but not found.\n' +
      'Please install Java:\n' +
      '  macOS: brew install --cask temurin\n' +
      '  Linux: sudo apt install openjdk-11-jre\n' +
      '  Windows: Download from https://adoptium.net/'
    )
  }
  
  // Check platform support
  if (platform !== 'darwin' && platform !== 'linux') {
    error(`Platform ${platform} is not yet supported. Please download Neo4j manually.`)
  }
  
  // Create resources directory
  if (!fs.existsSync(RESOURCES_DIR)) {
    fs.mkdirSync(RESOURCES_DIR, { recursive: true })
  }
  
  try {
    // Download
    await downloadFile(NEO4J_URL, TMP_FILE)
    
    // Extract
    await extractTarGz(TMP_FILE, RESOURCES_DIR)
    
    // Cleanup
    if (fs.existsSync(TMP_FILE)) {
      fs.unlinkSync(TMP_FILE)
    }
    
    // Verify
    if (fs.existsSync(NEO4J_BIN)) {
      log(`✓ Neo4j ${NEO4J_VERSION} installed successfully at ${NEO4J_DIR}`)
    } else {
      error('Neo4j binary not found after installation')
    }
  } catch (err) {
    // Cleanup on error
    if (fs.existsSync(TMP_FILE)) {
      fs.unlinkSync(TMP_FILE)
    }
    error(err.message)
  }
}

main().catch((err) => {
  error(err.message)
})
