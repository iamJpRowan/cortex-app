import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

function userDocsWatch() {
  const docsDir = resolve(__dirname, 'docs/user')
  const buildScript = resolve(__dirname, 'scripts/build-user-docs.js')

  function runBuild() {
    spawnSync('node', [buildScript], { stdio: 'inherit', cwd: __dirname })
  }

  function isUserDocPath(p: string) {
    const normalized = p.replace(/\\/g, '/')
    return normalized.includes('docs/user')
  }

  return {
    name: 'user-docs-watch',
    configureServer(server) {
      server.watcher.add(docsDir)
      server.watcher.on('change', p => {
        if (isUserDocPath(p)) runBuild()
      })
      server.watcher.on('add', p => {
        if (isUserDocPath(p)) runBuild()
      })
      server.watcher.on('unlink', p => {
        if (isUserDocPath(p)) runBuild()
      })
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@main': resolve(__dirname, 'src/main'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: 'dist-electron/main',
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
    build: {
      outDir: 'dist-electron/preload',
    },
  },
  renderer: {
    plugins: [react(), userDocsWatch()],
    resolve: {
      alias: {
        '@': resolve(__dirname, './src/renderer/src'),
        '@shared': resolve(__dirname, 'src/shared'),
      },
    },
  },
})
