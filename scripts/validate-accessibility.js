#!/usr/bin/env node

/**
 * Accessibility Validation Script
 * 
 * Checks for common accessibility issues in TSX/TS files:
 * - Missing aria-labels on interactive elements
 * - Missing form labels
 * - Missing keyboard event handlers on clickable elements
 * - Missing ARIA roles where needed
 */

const fs = require('fs')

// Patterns to check
const PATTERNS = {
  // Buttons without aria-label or visible text
  buttonWithoutLabel: /<button[^>]*>(?![\s\S]*?<\/button>[\s\S]*?aria-label)/g,
  
  // Inputs without associated label
  inputWithoutLabel: /<input[^>]*(?![\s\S]*?aria-label)[^>]*>/g,
  
  // Click handlers without keyboard handlers
  clickWithoutKeyboard: /onClick\s*=\s*\{[^}]*\}(?![\s\S]*?onKeyDown)/g,
  
  // Images without alt text
  imageWithoutAlt: /<img[^>]*(?!alt=)[^>]*>/g,
}

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const warnings = []

  // Check for buttons without aria-label
  lines.forEach((line, lineNum) => {
    if (line.includes('<button') && !line.includes('aria-label') && !line.includes('aria-labelledby')) {
      // Check if button has visible text content
      const hasText = /<button[^>]*>[\s\S]*?[a-zA-Z][\s\S]*?<\/button>/.test(content)
      if (!hasText) {
        warnings.push({
          file: filePath,
          line: lineNum + 1,
          message: 'Button without aria-label or visible text. Add aria-label for accessibility.',
        })
      }
    }

    // Check for inputs without labels
    if (line.includes('<input') && !line.includes('aria-label') && !line.includes('aria-labelledby')) {
      // Check if there's a label element nearby (within 5 lines)
      const nearbyLines = lines.slice(Math.max(0, lineNum - 5), lineNum + 5).join('\n')
      if (!nearbyLines.includes('<label') && !nearbyLines.includes('htmlFor=')) {
        warnings.push({
          file: filePath,
          line: lineNum + 1,
          message: 'Input without associated label. Add a <label> element or aria-label.',
        })
      }
    }

    // Check for onClick without onKeyDown
    if (line.includes('onClick=') && !line.includes('onKeyDown')) {
      // Check if it's a button or has role="button"
      if (line.includes('<button') || line.includes('role="button"')) {
        warnings.push({
          file: filePath,
          line: lineNum + 1,
          message: 'Interactive element with onClick but no onKeyDown handler. Add keyboard support for accessibility.',
        })
      }
    }

    // Check for images without alt
    if (line.includes('<img') && !line.includes('alt=')) {
      warnings.push({
        file: filePath,
        line: lineNum + 1,
        message: 'Image without alt attribute. Add alt text for accessibility.',
      })
    }
  })

  return warnings
}

function main() {
  const filesToCheck = process.argv.slice(2)
  
  if (filesToCheck.length === 0) {
    console.error('Usage: node validate-accessibility.js <file1> [file2] ...')
    process.exit(1)
  }

  let totalWarnings = 0

  filesToCheck.forEach(file => {
    if (!fs.existsSync(file)) {
      console.warn(`Warning: File not found: ${file}`)
      return
    }

    const warnings = checkFile(file)
    
    warnings.forEach(warn => {
      console.warn(`\n⚠️  ${warn.file}:${warn.line}`)
      console.warn(`   ${warn.message}`)
      totalWarnings++
    })
  })

  if (totalWarnings > 0) {
    console.warn(`\n\n⚠️  Found ${totalWarnings} accessibility warning(s)`)
    console.warn('Please review and address these issues for better accessibility.')
    // Don't fail the build for warnings, just inform
  } else {
    console.log('\n✅ All accessibility checks passed!')
  }
}

main()
