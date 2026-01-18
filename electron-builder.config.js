/**
 * Electron Builder configuration for packaging the app
 * Handles bundling Neo4j server and other resources
 */

module.exports = {
  appId: 'com.cortex.app',
  productName: 'Cortex',
  directories: {
    output: 'dist',
    buildResources: 'build'
  },
  files: [
    'dist-electron/**/*',
    'out/**/*',
    'package.json'
  ],
  extraResources: [
    {
      from: 'resources/neo4j',
      to: 'neo4j',
      filter: ['**/*']
    }
  ],
  mac: {
    category: 'public.app-category.productivity',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'build/icon.icns'
  },
  win: {
    target: [
      {
        target: 'nsis',
        arch: ['x64', 'ia32']
      }
    ],
    icon: 'build/icon.ico'
  },
  linux: {
    target: [
      {
        target: 'AppImage',
        arch: ['x64']
      }
    ],
    category: 'Utility',
    icon: 'build/icon.png'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}
