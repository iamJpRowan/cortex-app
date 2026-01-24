#!/usr/bin/env node

/**
 * Transition Token Validation Script
 * 
 * Checks for hardcoded transition values that should use design tokens instead.
 * 
 * Allowed patterns:
 * - CSS variables: var(--transition-*)
 * - Design token definitions in main.css
 * - Reduced motion overrides (0.01ms)
 * - Tailwind transition utilities: duration-*, delay-*, ease-* (in className)
 * 
 * Disallowed patterns:
 * - Hardcoded durations in CSS: 300ms, etc. (use Tailwind utilities or tokens)
 * - Hardcoded easing in CSS: ease-in-out, cubic-bezier(...), etc. (use Tailwind utilities or tokens)
 * - Hardcoded transition properties: transition: all 300ms ease-in-out
 */

const fs = require('fs')

// Patterns to detect hardcoded transition values
const HARDCODED_TRANSITION_PATTERNS = [
  // Hardcoded transition durations in CSS (allow Tailwind utilities in className)
  /transition[^:]*:\s*[^;]*(?:\d+\.?\d*ms|\d+\.?\d*s)(?!\s*var\(--transition)/gi,
  // Hardcoded easing functions in CSS (allow Tailwind utilities in className)
  /transition[^:]*:\s*[^;]*(?:ease|ease-in|ease-out|ease-in-out|cubic-bezier\([^)]+\))(?!\s*var\(--transition)/gi,
  // Direct style manipulation with transition values
  /\.style\.(?:transition|transitionDuration|transitionTimingFunction)\s*=\s*["'][^"']*(?:\d+ms|ease|cubic-bezier)/gi,
]

// Allowed contexts (where hardcoded values are OK)
const ALLOWED_CONTEXTS = [
  // Design token definitions
  /--transition-[^:]+:\s*[^;]+/,
  // Comments
  /\/\*[\s\S]*?\*\//,
  /\/\/.*/,
  // String literals in code (not actual usage)
  /['"`][^'"`]*['"`]/,
  // Reduced motion (accessibility override) - allow 0.01ms for prefers-reduced-motion
  /0\.01ms/,
  // Reduced motion media query context
  /@media.*prefers-reduced-motion/,
  // main.css token definitions
  /main\.css/,
]

// Files to ignore
const IGNORE_PATTERNS = [
  /node_modules/,
  /dist/,
  /dist-electron/,
  /\.d\.ts$/,
  // Validation scripts themselves
  /validate-.*\.js$/,
]

function isInAllowedContext(line, matchIndex, filePath) {
  // Always allow in main.css (token definitions and reduced motion)
  if (filePath.includes('main.css')) {
    // Allow token definitions
    if (line.trim().startsWith('--') || line.includes('var(--transition')) {
      return true
    }
    // Allow reduced motion overrides (0.01ms)
    if (line.includes('0.01ms') || line.includes('prefers-reduced-motion')) {
      return true
    }
  }

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
    // Skip comments
    if (line.trim().startsWith('//') || line.trim().startsWith('/*')) {
      return
    }

    // Allow Tailwind transition utilities in className (duration-*, delay-*, ease-*)
    if (line.includes('className') && (line.includes('duration-') || line.includes('delay-') || line.includes('ease-'))) {
      return
    }

    // Check for hardcoded transition values
    HARDCODED_TRANSITION_PATTERNS.forEach(pattern => {
      const matches = [...line.matchAll(pattern)]
      matches.forEach(match => {
        const matchIndex = match.index
        if (!isInAllowedContext(line, matchIndex, filePath)) {
          const value = match[0]
          
          // Check if it's already using a design token
          if (line.includes('var(--transition')) {
            return
          }
          
          // Check if it's in a design token definition
          if (line.includes('--transition-')) {
            return
          }
          
          errors.push({
            file: filePath,
            line: lineNum + 1,
            column: matchIndex + 1,
            message: `Hardcoded transition value found. Use Tailwind utilities (duration-*, ease-*) or design tokens (var(--transition-*)) instead.`,
            value: value,
            code: line.trim(),
          })
        }
      })
    })
  })

  return { errors, warnings }
}

function main() {
  const filesToCheck = process.argv.slice(2)
  
  if (filesToCheck.length === 0) {
    console.error('Usage: node validate-transitions.js <file1> [file2] ...')
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
    console.error('Please use design tokens (var(--transition-*)) instead of hardcoded transition values.')
    process.exit(1)
  }

  if (totalWarnings > 0) {
    console.warn(`\n\n⚠️  Found ${totalWarnings} warning(s)`)
  } else {
    console.log('\n✅ All transition token checks passed!')
  }
}

main()
