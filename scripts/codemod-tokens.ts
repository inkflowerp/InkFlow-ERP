// ==============================================================================
// InkFlow ERP SaaS - Full Spectrum Semantic Token Codemod
// Eliminates all raw Tailwind palette classes, gradients, and sub-12px sizes
// ==============================================================================

import fs from 'fs'
import path from 'path'

const TARGET_DIRS = ['app', 'components']

interface Rule {
  pattern: RegExp
  replacement: string
}

const RULES: Rule[] = [
  // 1. Text sizes (eliminate sub-12px)
  { pattern: /\btext-\[(?:[0-9]|10|11)px\]\b/g, replacement: 'text-xs' },
  { pattern: /\btext-3xs\b/g, replacement: 'text-xs' },
  { pattern: /\btext-2xs\b/g, replacement: 'text-xs' },

  // 2. White / Black (preserve print overrides)
  { pattern: /(?<!print:)\bbg-white\b/g, replacement: 'bg-card' },
  { pattern: /(?<!print:)\btext-black\b/g, replacement: 'text-foreground' },
  { pattern: /\bbg-black\b(?!\/)/g, replacement: 'bg-card' },

  // 3. Remove decorative gradients and glows per Invariant 2
  { pattern: /\bbg-gradient-to-[a-z]+(?:-[a-z]+)?\b/g, replacement: '' },
  { pattern: /\bfrom-[a-z]+-\d+(?:\/\d+)?\b/g, replacement: '' },
  { pattern: /\bto-[a-z]+-\d+(?:\/\d+)?\b/g, replacement: '' },
  { pattern: /\bvia-[a-z]+-\d+(?:\/\d+)?\b/g, replacement: '' },

  // 4. Focus & Rings
  { pattern: /\b(?:focus:)?ring-(slate|zinc|gray|neutral|red|blue|indigo|emerald|amber|orange|purple|cyan|teal|green|rose|yellow)-\d+\b/g, replacement: 'focus:ring-ring' },

  // 5. Borders
  { pattern: /\b(?:dark:)?border-(emerald|green|teal)-\d+\b/g, replacement: 'border-success-border' },
  { pattern: /\b(?:dark:)?border-(amber|yellow|orange)-\d+\b/g, replacement: 'border-warning-border' },
  { pattern: /\b(?:dark:)?border-(red|rose)-\d+\b/g, replacement: 'border-danger-border' },
  { pattern: /\b(?:dark:)?border-(blue|cyan|indigo|purple|sky|violet)-\d+\b/g, replacement: 'border-border' },
  { pattern: /\b(?:dark:)?border-(slate|zinc|gray|neutral)-(100|200|400|500|600|700|800|900)\b/g, replacement: 'border-border' },
  { pattern: /\b(?:dark:)?border-(slate|zinc|gray|neutral)-300\b/g, replacement: 'border-input' },

  // 6. Text Colors
  { pattern: /\b(?:dark:)?text-(emerald|green|teal)-\d+\b/g, replacement: 'text-success' },
  { pattern: /\b(?:dark:)?text-(amber|yellow|orange)-\d+\b/g, replacement: 'text-warning' },
  { pattern: /\b(?:dark:)?text-(red|rose)-\d+\b/g, replacement: 'text-destructive' },
  { pattern: /\b(?:dark:)?text-(blue|cyan|indigo|purple|sky|violet)-\d+\b/g, replacement: 'text-primary' },
  { pattern: /\b(?:dark:)?text-(slate|zinc|gray|neutral)-(100|200|300|800|900)\b/g, replacement: 'text-foreground' },
  { pattern: /\b(?:dark:)?text-(slate|zinc|gray|neutral)-(400|500|600|700)\b/g, replacement: 'text-muted-foreground' },
  { pattern: /\bhover:text-(slate|zinc|gray|neutral)-\d+\b/g, replacement: 'hover:text-foreground' },

  // 7. Backgrounds: Status & Surfaces
  { pattern: /\b(?:dark:)?bg-(emerald|green|teal)-(?:50|100|950(?:\/\d+)?)\b/g, replacement: 'bg-success-surface' },
  { pattern: /\b(?:dark:)?bg-(amber|yellow|orange)-(?:50|100|950(?:\/\d+)?)\b/g, replacement: 'bg-warning-surface' },
  { pattern: /\b(?:dark:)?bg-(red|rose)-(?:50|100|950(?:\/\d+)?)\b/g, replacement: 'bg-danger-surface' },
  { pattern: /\b(?:dark:)?bg-(blue|cyan|indigo|purple|sky|violet)-(?:50|100|950(?:\/\d+)?)\b/g, replacement: 'bg-primary/10' },

  { pattern: /\b(?:dark:)?bg-(emerald|green|teal)-(?:200|300|400|500|600|700|800|900)\b/g, replacement: 'bg-success' },
  { pattern: /\b(?:dark:)?bg-(amber|yellow|orange)-(?:200|300|400|500|600|700|800|900)\b/g, replacement: 'bg-warning' },
  { pattern: /\b(?:dark:)?bg-(red|rose)-(?:200|300|400|500|600|700|800|900)\b/g, replacement: 'bg-destructive' },
  { pattern: /\b(?:dark:)?bg-(blue|cyan|indigo|purple|sky|violet)-(?:200|300|400|500|600|700|800|900)\b/g, replacement: 'bg-primary' },

  { pattern: /\b(?:dark:)?bg-(slate|zinc|gray|neutral)-(?:50|100|200)\b/g, replacement: 'bg-muted' },
  { pattern: /\b(?:dark:)?bg-(slate|zinc|gray|neutral)-(?:800|900)\b/g, replacement: 'bg-card' },
  { pattern: /\b(?:dark:)?bg-(slate|zinc|gray|neutral)-950\b/g, replacement: 'bg-background' },
  { pattern: /\bhover:bg-(slate|zinc|gray|neutral)-\d+(?:\/\d+)?\b/g, replacement: 'hover:bg-muted' },

  // 8. Arbitrary Hex in classes
  { pattern: /\b(?:dark:)?bg-\[#(?:080B16|0b1024|04060c|090d16|0f172a)\]/gi, replacement: 'bg-card' },
  { pattern: /\b(?:dark:)?text-\[#(?:ffffff|fff|f8fafc)\]/gi, replacement: 'text-foreground' },
  { pattern: /\b(?:dark:)?border-\[#(?:1e293b|334155|e2e8f0)\]/gi, replacement: 'border-border' },
]

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules' && entry.name !== '.next' && entry.name !== 'coverage' && entry.name !== 'tests') {
        getAllFiles(fullPath, fileList)
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

export function runCodemod() {
  console.log('--- Running Full-Spectrum Semantic Token Codemod ---')
  let totalModifications = 0
  let filesModified = 0

  for (const targetDir of TARGET_DIRS) {
    const rootDir = path.resolve(process.cwd(), targetDir)
    const files = getAllFiles(rootDir)
    console.log(`Scanning ${targetDir}: ${files.length} TypeScript files`)

    for (const file of files) {
      // Skip allowlisted physical print / QR / CMYK swatch files
      if (file.includes('cmyk') || file.includes('pdf') || file.includes('qr-')) {
        continue
      }

      const content = fs.readFileSync(file, 'utf-8')
      let newContent = content
      let fileMods = 0

      for (const rule of RULES) {
        const matches = newContent.match(rule.pattern)
        if (matches) {
          fileMods += matches.length
          newContent = newContent.replace(rule.pattern, rule.replacement)
        }
      }

      // Clean up accidental duplicate spaces inside class strings
      newContent = newContent.replace(/(className=["'`][^"'`]*?)\s{2,}([^"'`]*?["'`])/g, '$1 $2')

      if (newContent !== content) {
        fs.writeFileSync(file, newContent, 'utf-8')
        filesModified++
        totalModifications += fileMods
      }
    }
  }

  console.log(`\nCodemod Complete:`)
  console.log(`- Total Files Modified: ${filesModified}`)
  console.log(`- Total Token Replacements: ${totalModifications}`)
}

if (process.argv[1]?.includes('codemod-tokens')) {
  runCodemod()
}
