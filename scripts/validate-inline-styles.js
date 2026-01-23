#!/usr/bin/env node

/**
 * Inline Style Validation Script
 * 
 * Checks for direct style manipulation that should use CSS classes instead.
 * 
 * This script warns about direct style manipulation (e.g., element.style.width = '48px')
 * which can make code harder to maintain and test. Prefer CSS classes when possible.
 * 
 * Allowed patterns:
 * - Style manipulation for dynamic values that can't be expressed in CSS (e.g., calculated widths)
 * - Style manipulation for transitions that require inline styles (e.g., width transitions)
 * - Style manipulation in utility functions or helpers
 * 
 * Disallowed patterns (warnings, not errors):
 * - Direct style manipulation for static values that could use classes
 * - Style manipulation without comments explaining why inline is necessary
 */

const fs = require('fs')

// Patterns to detect direct style manipulation
const INLINE_STYLE_PATTERNS = [
  // element.style.property = value
  /\.style\.\w+\s*=\s*["'][^"']+["']/g,
  // element.style.cssText = ...
  /\.style\.cssText\s*=/g,
  // setAttribute('style', ...)
  /setAttribute\(["']style["']/g,
]

// Allowed contexts (where inline styles are acceptable)
const ALLOWED_CONTEXTS = [
  // Comments explaining why inline is needed
  /\/\/.*(?:transition|animation|dynamic|calculated|computed)/i,
  /\/\*.*(?:transition|animation|dynamic|calculated|computed).*\*\//i,
  // Width/height for transitions (common pattern)
  /\.style\.(?:width|height)\s*=\s*["'][\d]+px["']/,
  // String literals (not actual usage)
  /['"`][^'"`]*['"`]/,
]

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /dist/,
  /dist-electron/,
  /\.d\.ts$/,
  // Validation scripts
  /validate-.*\.js$/,
  // Test files (may need inline styles for testing)
  /\.test\.(ts|tsx|js|jsx)$/,
  /\.spec\.(ts|tsx|js|jsx)$/,
]

function isInAllowedContext(line, matchIndex, filePath) {
  // Check if match is in a comment explaining why
  for (const pattern of ALLOWED_CONTEXTS) {
    const matches = [...line.matchAll(new RegExp(pattern.source, 'g'))]
    for (const m of matches) {
      if (matchIndex >= m.index && matchIndex < m.index + m[0].length) {
        return true
      }
    }
  }

  // Check if there's a comment on the same or previous line explaining why
  return false
}

function shouldIgnoreFile(filePath) {
  return IGNORE_PATTERNS.some(pattern => pattern.test(filePath))
}

function checkFile(filePath) {
  if (shouldIgnoreFile(filePath)) {
    return { warnings: [] }
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const warnings = []

  lines.forEach((line, lineNum) => {
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return
    }

    // Check for inline style manipulation
    INLINE_STYLE_PATTERNS.forEach(pattern => {
      const matches = [...line.matchAll(pattern)]
      matches.forEach(match => {
        const matchIndex = match.index
        if (!isInAllowedContext(line, matchIndex, filePath)) {
          const value = match[0]
          
          // Check if there's a comment nearby explaining why
          const prevLine = lineNum > 0 ? lines[lineNum - 1] : ''
          const hasExplanation = prevLine.includes('//') && 
            (prevLine.includes('transition') || prevLine.includes('dynamic') || 
             prevLine.includes('calculated') || prevLine.includes('inline'))
          
          if (!hasExplanation) {
            warnings.push({
              file: filePath,
              line: lineNum + 1,
              column: matchIndex + 1,
              message: `Direct style manipulation found. Consider using CSS classes instead. If inline is necessary, add a comment explaining why.`,
              value: value,
              code: line.trim(),
            })
          }
        }
      })
    })
  })

  return { warnings }
}

function main() {
  const filesToCheck = process.argv.slice(2)
  
  if (filesToCheck.length === 0) {
    console.error('Usage: node validate-inline-styles.js <file1> [file2] ...')
    process.exit(1)
  }

  let totalWarnings = 0

  filesToCheck.forEach(file => {
    if (!fs.existsSync(file)) {
      console.warn(`Warning: File not found: ${file}`)
      return
    }

    const { warnings } = checkFile(file)
    
    warnings.forEach(warn => {
      console.warn(`\n⚠️  ${warn.file}:${warn.line}:${warn.column}`)
      console.warn(`   ${warn.message}`)
      console.warn(`   Line: ${warn.code}`)
      totalWarnings++
    })
  })

  if (totalWarnings > 0) {
    console.warn(`\n\n⚠️  Found ${totalWarnings} warning(s)`)
    console.warn('Consider using CSS classes instead of direct style manipulation.')
    console.warn('If inline styles are necessary (e.g., for transitions), add a comment explaining why.')
    // Don't fail the build for warnings, just inform
  } else {
    console.log('\n✅ All inline style checks passed!')
  }
}

main()
