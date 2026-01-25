const js = require('@eslint/js')
const tseslint = require('@typescript-eslint/eslint-plugin')
const tsparser = require('@typescript-eslint/parser')
const react = require('eslint-plugin-react')
const reactHooks = require('eslint-plugin-react-hooks')
const betterTailwindcss = require('eslint-plugin-better-tailwindcss')
const globals = require('globals')

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.node,
        ...globals.browser,
        ...globals.es2021
      }
    },
    plugins: {
      '@typescript-eslint': tseslint,
      react: react,
      'react-hooks': reactHooks,
      'better-tailwindcss': betterTailwindcss
    },
    settings: {
      react: {
        version: 'detect'
      }
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-undef': 'off', // TypeScript handles this
      // Enforce multiline className formatting for readability
      'better-tailwindcss/enforce-consistent-line-wrapping': [
        'warn',
        {
          printWidth: 100, // Break lines after 100 characters
          classesPerLine: 0, // No limit on classes per line (use printWidth instead)
          group: 'newLine', // Put each logical group on a new line
          preferSingleLine: false, // Always break long classNames
          indent: 2 // 2 spaces indentation
        }
      ]
    }
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node
      },
      sourceType: 'commonjs'
    },
    rules: {
      'no-undef': 'off' // CommonJS files use require/module.exports
    }
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'dist-electron/**']
  }
]
