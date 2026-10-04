// ==============================================================================
// InkFlow ERP SaaS - UI Audit CI Gate & Strict Linter (Requirement 10)
// ==============================================================================

import fs from 'fs'
import path from 'path'

export interface Violation {
  file: string
  line: number
  type:
    | 'raw_palette'
    | 'raw_white_black'
    | 'raw_hex'
    | 'sub12px_font'
    | 'page_max_width_bypass'
    | 'button_missing_aria'
    | 'image_missing_alt'
  message: string
  snippet: string
}

const TARGET_DIRS = ['app', 'components']

// 1. Raw Tailwind palette classes (e.g. bg-slate-500, text-red-600)
const RAW_PALETTE_REGEX =
  /\b(bg|text|border|ring)-(slate|zinc|gray|neutral|red|blue|indigo|emerald|amber|orange|purple|cyan|teal|green|rose|yellow)-\d+\b/

// 2. Raw white/black outside print stylesheets
const RAW_WHITE_BLACK_REGEX = /(?<!print:)\b(bg-white|text-black)\b/

// 3. Raw Hex color values in TSX/TS:
// Matches Tailwind arbitrary hex classes bg-[#...], attributes color="#...", or quoted hex '#...'
const COLOR_HEX_REGEX =
  /(?:(?:bg|text|border|ring|fill|stroke|from|to|via)-\[#(?:[0-9a-fA-F]{3}){1,2}\]|(?:color|fill|stroke|bgColor|fgColor|stopColor|background|backgroundColor|borderColor)\s*[:=]\s*["']#(?:[0-9a-fA-F]{3}){1,2}["']|['"]#(?:[0-9a-fA-F]{3}){1,2}['"])/

// 4. Sub-12px Font (<12px)
const SUB_12PX_REGEX = /(?:text-\[(?:[0-9]|10|11)px\]|\btext-2xs\b)/

// 5. Raw max-w on pages outside PageContainer
const PAGE_MAX_WIDTH_REGEX = /<div[^>]*className=["'][^"']*\b(max-w-(?:3xl|4xl|5xl|6xl|7xl))\b[^"']*["']>/

function getAllFiles(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) return fileList
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (
        entry.name !== 'node_modules' &&
        entry.name !== '.next' &&
        entry.name !== 'coverage' &&
        entry.name !== 'tests'
      ) {
        getAllFiles(fullPath, fileList)
      }
    } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
      fileList.push(fullPath)
    }
  }
  return fileList
}

export function runAuditGate(): { violations: Violation[]; filesScanned: number } {
  const violations: Violation[] = []
  let filesScanned = 0

  const allowlistPath = path.resolve(process.cwd(), 'config/ui-audit-allowlist.json')
  let allowlist: any = { allowedHex: [], allowedPaletteClasses: [] }
  if (fs.existsSync(allowlistPath)) {
    try {
      allowlist = JSON.parse(fs.readFileSync(allowlistPath, 'utf-8'))
    } catch (_) {}
  }

  for (const targetDir of TARGET_DIRS) {
    const dir = path.resolve(process.cwd(), targetDir)
    const files = getAllFiles(dir)
    filesScanned += files.length

    for (const file of files) {
      const relPath = path.relative(process.cwd(), file).replace(/\\/g, '/')
      const isPage = relPath.startsWith('app/') && relPath.endsWith('page.tsx')

      const isCmykAllowed =
        relPath.includes('cmyk') || relPath.includes('swatch') || relPath.includes('color-bar')
      const isQrAllowed = relPath.includes('qr-') || relPath.includes('qrcode')
      const isPdfPrintAllowed = relPath.includes('/pdf/') || relPath.includes('print-')

      const content = fs.readFileSync(file, 'utf-8')
      const lines = content.split('\n')

      lines.forEach((line, idx) => {
        const lineNum = idx + 1
        const trimmed = line.trim()

        // Skip comments and imports
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('import ')
        ) {
          return
        }

        // 1. Raw Palette Classes
        const paletteMatch = line.match(RAW_PALETTE_REGEX)
        if (paletteMatch) {
          const isPaletteAllowed = allowlist.allowedPaletteClasses?.some((ap: any) =>
            line.includes(ap.class)
          )
          if (!isPaletteAllowed) {
            violations.push({
              file: relPath,
              line: lineNum,
              type: 'raw_palette',
              message: `Found raw palette class: "${paletteMatch[0]}". Must use semantic tokens (e.g. bg-muted, text-primary, text-destructive).`,
              snippet: trimmed.slice(0, 100),
            })
          }
        }

        // 2. Raw bg-white or text-black
        const whiteBlackMatch = line.match(RAW_WHITE_BLACK_REGEX)
        if (whiteBlackMatch && !isPdfPrintAllowed && !isQrAllowed) {
          const isAllowed = allowlist.allowedPaletteClasses?.some((ap: any) =>
            line.includes(ap.class)
          )
          if (!isAllowed) {
            violations.push({
              file: relPath,
              line: lineNum,
              type: 'raw_white_black',
              message: `Found raw "${whiteBlackMatch[0]}". Must use "bg-card" or "text-foreground".`,
              snippet: trimmed.slice(0, 100),
            })
          }
        }

        // 3. Raw Hex values in TSX
        if (file.endsWith('.tsx') && !isCmykAllowed && !isQrAllowed && !isPdfPrintAllowed) {
          const hexMatch = line.match(COLOR_HEX_REGEX)
          if (hexMatch) {
            const isHexAllowed = allowlist.allowedHex?.some((ah: any) => {
              const patternMatches = !ah.pattern || new RegExp(ah.pattern, 'i').test(relPath)
              if (!patternMatches) return false
              return ah.hex?.some((h: string) => line.toLowerCase().includes(h.toLowerCase()))
            })
            if (!isHexAllowed) {
              violations.push({
                file: relPath,
                line: lineNum,
                type: 'raw_hex',
                message: `Found raw hex color: "${hexMatch[0]}". Must use semantic CSS variable token or be registered in allowlist with rationale.`,
                snippet: trimmed.slice(0, 100),
              })
            }
          }
        }

        // 4. Sub-12px Font (<12px)
        const sub12Match = line.match(SUB_12PX_REGEX)
        if (sub12Match) {
          violations.push({
            file: relPath,
            line: lineNum,
            type: 'sub12px_font',
            message: `Found sub-12px font size: "${sub12Match[0]}". System minimum is 12px (text-xs).`,
            snippet: trimmed.slice(0, 100),
          })
        }

        // 5. Ad-hoc max-w on page outside PageContainer
        if (isPage) {
          const pageMaxWidthMatch = line.match(PAGE_MAX_WIDTH_REGEX)
          if (
            pageMaxWidthMatch &&
            !line.includes('modal') &&
            !line.includes('dialog') &&
            !line.includes('truncate') &&
            !line.includes('input')
          ) {
            violations.push({
              file: relPath,
              line: lineNum,
              type: 'page_max_width_bypass',
              message: `Found ad-hoc page wrapper with "${pageMaxWidthMatch[1]}". Must use <PageContainer size="default|wide|narrow|full"> for layout consistency.`,
              snippet: trimmed.slice(0, 100),
            })
          }
        }

        // 6. Icon-only button without aria-label
        if (file.endsWith('.tsx') && line.includes('size="icon"')) {
          const contextSnippet = lines.slice(Math.max(0, idx - 2), Math.min(lines.length, idx + 6)).join('\n')
          if (!contextSnippet.includes('aria-label') && !contextSnippet.includes('title')) {
            violations.push({
              file: relPath,
              line: lineNum,
              type: 'button_missing_aria',
              message: 'Icon-only button missing "aria-label" or "title" attribute for accessibility.',
              snippet: trimmed.slice(0, 100),
            })
          }
        }

        // 7. Image missing alt attribute
        if (file.endsWith('.tsx') && line.includes('<img ') && !line.includes('alt=')) {
          violations.push({
            file: relPath,
            line: lineNum,
            type: 'image_missing_alt',
            message: 'Image element <img> is missing an "alt" attribute for screen reader accessibility.',
            snippet: trimmed.slice(0, 100),
          })
        }
      })
    }
  }

  return { violations, filesScanned }
}

if (process.argv[1]?.includes('audit-scanner')) {
  console.log('--- Scanning InkFlow ERP Codebase for UI Consistency Violations ---')
  const { violations, filesScanned } = runAuditGate()
  console.log(`Scanned: ${filesScanned} files`)
  console.log(`Violations Found: ${violations.length}`)

  const byType: Record<string, number> = {}
  for (const v of violations) {
    byType[v.type] = (byType[v.type] || 0) + 1
  }
  console.table(byType)

  if (violations.length > 0) {
    console.log('\nViolations List:')
    violations.slice(0, 20).forEach((v) => {
      console.log(`[${v.type}] ${v.file}:${v.line} - ${v.message}\n  "${v.snippet}"`)
    })
    process.exit(1)
  } else {
    console.log('✅ UI AUDIT PASSED: 0 violations detected across entire codebase!')
    process.exit(0)
  }
}
