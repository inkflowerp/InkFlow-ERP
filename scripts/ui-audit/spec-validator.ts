import fs from 'fs'
import path from 'path'
import type { AuditViolation } from './types.ts'

export class SpecValidator {
  private spec: any

  constructor() {
    const specPath = path.resolve(process.cwd(), 'design-spec.json')
    if (fs.existsSync(specPath)) {
      this.spec = JSON.parse(fs.readFileSync(specPath, 'utf8'))
    } else {
      throw new Error(`design-spec.json not found at ${specPath}`)
    }
  }

  // Parse rgb(r, g, b) or rgba(r, g, b, a) to [r, g, b]
  private parseRgb(colorStr: string): [number, number, number] | null {
    if (!colorStr || colorStr === 'transparent' || colorStr === 'inherit') return null
    const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
    if (!match) return null
    if (match[4] !== undefined && parseFloat(match[4]) === 0) return null
    return [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10)]
  }

  // Calculate Relative Luminance according to WCAG 2.1
  private getLuminance(r: number, g: number, b: number): number {
    const a = [r, g, b].map((v) => {
      v /= 255
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
    })
    return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722
  }

  // Calculate Contrast Ratio between two rgb strings
  public getContrastRatio(fgStr: string, bgStr: string): number {
    const fg = this.parseRgb(fgStr)
    const bg = this.parseRgb(bgStr)
    if (!fg || !bg) return 21 // Fallback if transparent/inherit

    const l1 = this.getLuminance(fg[0], fg[1], fg[2])
    const l2 = this.getLuminance(bg[0], bg[1], bg[2])

    const lighter = Math.max(l1, l2)
    const darker = Math.min(l1, l2)

    return (lighter + 0.05) / (darker + 0.05)
  }

  // Check WCAG AA compliance (4.5 for regular text, 3.0 for large text)
  public checkContrast(fgStr: string, bgStr: string, fontSizePx: number, isBold: boolean): { ratio: number; pass: boolean } {
    const ratio = this.getContrastRatio(fgStr, bgStr)
    const isLargeText = fontSizePx >= 18 || (fontSizePx >= 14 && isBold)
    const threshold = isLargeText ? 3.0 : 4.5
    return {
      ratio: Math.round(ratio * 100) / 100,
      pass: ratio >= threshold,
    }
  }

  // Validate font size against allowed scale
  public isValidFontSize(sizeStr: string): boolean {
    const px = parseFloat(sizeStr)
    if (isNaN(px)) return true
    // Scale: 11px (2xs), 12px (xs), 14px (sm), 16px (base), 18px (lg), 20px (xl), 24px (2xl), 30px (3xl)
    const validSizes = [11, 12, 14, 16, 18, 20, 24, 30, 36, 48]
    // Allow minor subpixel rounding tolerance (0.5px)
    return validSizes.some((s) => Math.abs(s - px) <= 0.5)
  }

  // Check for forbidden gradient backgrounds
  public hasGradient(bgImageStr: string): boolean {
    if (!bgImageStr || bgImageStr === 'none') return false
    return bgImageStr.includes('linear-gradient') || bgImageStr.includes('radial-gradient')
  }

  // Validate border width (Must be 0px or 1px, or 2px focus ring)
  public isValidBorderWidth(borderWidthStr: string): boolean {
    const px = parseFloat(borderWidthStr)
    if (isNaN(px)) return true
    return px <= 1.05 || px === 2 // 0px, 1px, or 2px focus ring
  }
}
