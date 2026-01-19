#!/usr/bin/env node

/**
 * Design Token Validation Script
 * 
 * Checks for hardcoded color and spacing values that should use design tokens instead.
 * 
 * Allowed patterns:
 * - CSS variables: var(--color-*), var(--space-*), etc.
 * - Tailwind semantic classes: bg-bg-primary, text-text-primary, etc.
 * - Component classes: btn-primary, card-padded, etc.
 * 
 * Disallowed patterns:
 * - Hardcoded hex colors: #ffffff, #000000, etc.
 * - Hardcoded rgb/rgba colors: rgb(255, 255, 255), etc.
 * - Hardcoded spacing: 16px, 1rem (unless in design token definitions)
 */

const fs = require('fs')
const path = require('path')

// Patterns to detect hardcoded values
const HARDCODED_COLOR_PATTERNS = [
  // Hex colors in CSS properties (not in comments or strings)
  /(?:color|background|border|outline)[^:]*:\s*#[0-9a-fA-F]{3,6}/gi,
  // RGB/RGBA colors in CSS properties
  /(?:color|background|border|outline)[^:]*:\s*rgba?\([^)]+\)/gi,
]

// Patterns to detect hardcoded spacing in inline styles or CSS
const HARDCODED_SPACING_PATTERNS = [
  // Pixel/rem values in padding/margin properties
  /(?:padding|margin|gap|top|right|bottom|left|width|height)[^:]*:\s*\d+\.?\d*(?:px|rem)/gi,
]

// Files to check
const FILES_TO_CHECK = [
  'src/renderer/src/**/*.tsx',
  'src/renderer/src/**/*.ts',
  'src/renderer/src/**/*.css',
]

// Allowed contexts (where hardcoded values are OK)
const ALLOWED_CONTEXTS = [
  // Design token definitions
  /--(color|space|font|radius|z)-[^:]+:\s*[^;]+/,
  // Comments
  /\/\*[\s\S]*?\*\//,
  // String literals in code
  /['"`][^'"`]*['"`]/,
]

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /dist/,
  /dist-electron/,
  /\.d\.ts$/,
  // Design token definitions are allowed
  /main\.css$/,
]

function isInAllowedContext(line, matchIndex) {
  // Check if match is in a comment or string
  for (const pattern of ALLOWED_CONTEXTS) {
    const matches = [...line.matchAll(new RegExp(pattern.source, 'g'))]
    for (const m of matches) {
      if (matchIndex >= m.index && matchIndex < m.index + m[0].length) {
        return true
      }
    }
  }
  return false
}

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath))
}

function checkFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return { errors: [], warnings: [] }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const errors = []
  const warnings = []

  lines.forEach((line, lineNum) => {
    // Skip design token definitions in main.css
    if (filePath.includes('main.css')) {
      // Allow design token definitions
      if (line.trim().startsWith('--') || line.includes('var(--')) {
        return
      }
      // Allow comments
      if (line.trim().startsWith('/*') || line.trim().startsWith('//')) {
        return
      }
    }

    // Skip comments
    if (line.trim().startsWith('//') || line.includes('/*')) {
      return
    }

    // Check for hardcoded colors in CSS properties
    HARDCODED_COLOR_PATTERNS.forEach(pattern => {
      const matches = [...line.matchAll(pattern)]
      matches.forEach(match => {
        const matchIndex = match.index
        if (!isInAllowedContext(line, matchIndex)) {
          const value = match[0]
          
          // Check if it's already using a design token
          if (line.includes('var(--color-') || line.includes('var(--bg-') || line.includes('var(--border-')) {
            return
          }
          
          // Check if it's in a design token definition
          if (line.includes('--color-') || line.includes('--space-')) {
            return
          }
          
          errors.push({
            file: filePath,
            line: lineNum + 1,
            column: matchIndex + 1,
            message: `Hardcoded color value found. Use design tokens (var(--color-*) or semantic Tailwind classes) instead.`,
            value: value,
            code: line.trim(),
          })
        }
      })
    })

    // Check for hardcoded spacing in inline styles (TSX/TS files)
    if ((filePath.endsWith('.tsx') || filePath.endsWith('.ts')) && line.includes('style=')) {
      HARDCODED_SPACING_PATTERNS.forEach(pattern => {
        const matches = [...line.matchAll(pattern)]
        matches.forEach(match => {
          const matchIndex = match.index
          if (!isInAllowedContext(line, matchIndex)) {
            const value = match[0]
            
            // Allow in className strings (Tailwind handles spacing)
            if (line.includes('className')) {
              return
            }
            
            warnings.push({
              file: filePath,
              line: lineNum + 1,
              column: matchIndex + 1,
              message: `Hardcoded spacing in inline style found. Consider using Tailwind spacing utilities or design tokens.`,
              value: value,
              code: line.trim(),
            })
          }
        })
      })
    }
  })

  return { errors, warnings }
}

function main() {
  const filesToCheck = process.argv.slice(2)
  
  if (filesToCheck.length === 0) {
    console.error('Usage: node validate-design-tokens.js <file1> [file2] ...')
    process.exit(1)
  }

  let totalErrors = 0
  let totalWarnings = 0

  filesToCheck.forEach(file => {
    if (!fs.existsSync(file)) {
      console.warn(`Warning: File not found: ${file}`)
      return
    }

    const { errors, warnings } = checkFile(file)
    
    errors.forEach(err => {
      console.error(`\n❌ ${err.file}:${err.line}:${err.column}`)
      console.error(`   ${err.message}`)
      console.error(`   Line: ${err.code}`)
      totalErrors++
    })

    warnings.forEach(warn => {
      console.warn(`\n⚠️  ${warn.file}:${warn.line}:${warn.column}`)
      console.warn(`   ${warn.message}`)
      totalWarnings++
    })
  })

  if (totalErrors > 0) {
    console.error(`\n\n❌ Found ${totalErrors} error(s) and ${totalWarnings} warning(s)`)
    console.error('Please use design tokens instead of hardcoded values.')
    process.exit(1)
  }

  if (totalWarnings > 0) {
    console.warn(`\n\n⚠️  Found ${totalWarnings} warning(s)`)
  } else {
    console.log('\n✅ All design token checks passed!')
  }
}

main()
