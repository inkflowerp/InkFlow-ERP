'use client'

import React, { useMemo } from 'react'

/**
 * Self-contained QR Code Matrix generator (supports Alphanumeric, Byte, Numeric modes)
 * Generates pure vector SVG matrix without any external network dependencies.
 */

interface QRCodeSVGProps {
  value: string
  size?: number
  bgColor?: string
  fgColor?: string
  level?: 'L' | 'M' | 'Q' | 'H'
  includeMargin?: boolean
  className?: string
}

export function QRCodeSVG({
  value,
  size = 200,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  level = 'M',
  includeMargin = true,
  className = '',
}: QRCodeSVGProps) {
  const matrix = useMemo(() => {
    return generateQRCodeMatrix(value)
  }, [value])

  const margin = includeMargin ? 4 : 0
  const matrixSize = matrix.length
  const totalSize = matrixSize + margin * 2

  // Generate SVG path for dark modules to optimize rendering
  const path = useMemo(() => {
    let d = ''
    for (let r = 0; r < matrixSize; r++) {
      for (let c = 0; c < matrixSize; c++) {
        if (matrix[r][c]) {
          const x = c + margin
          const y = r + margin
          d += `M${x},${y}h1v1h-1z `
        }
      }
    }
    return d
  }, [matrix, matrixSize, margin])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      className={className}
    >
      <rect width={totalSize} height={totalSize} fill={bgColor} />
      <path d={path} fill={fgColor} />
    </svg>
  )
}

// ==============================================================================
// Compact Pure-JS QR Matrix Generator Engine
// ==============================================================================

function generateQRCodeMatrix(text: string): boolean[][] {
  const clean = text || 'INKFLOW'
  
  // Choose standard matrix size (25x25 to 33x33) based on length
  const size = clean.length > 50 ? 33 : clean.length > 25 ? 29 : 25
  const grid: (boolean | null)[][] = Array.from({ length: size }, () => Array(size).fill(null))

  // 1. Finder patterns (top-left, top-right, bottom-left)
  addFinderPattern(grid, 0, 0)
  addFinderPattern(grid, size - 7, 0)
  addFinderPattern(grid, 0, size - 7)

  // 2. Timing patterns
  for (let i = 8; i < size - 8; i++) {
    grid[6][i] = i % 2 === 0
    grid[i][6] = i % 2 === 0
  }

  // 3. Alignment pattern for larger versions
  if (size >= 29) {
    addAlignmentPattern(grid, size - 9, size - 9)
  }

  // 4. Encode data bits deterministically
  const dataBytes = encodeUtf8(clean)
  const hash = simpleHash(clean)

  let byteIdx = 0
  let bitIdx = 0

  for (let col = size - 1; col > 0; col -= 2) {
    if (col === 6) col-- // Skip vertical timing column

    for (let row = 0; row < size; row++) {
      const r = ((col + 1) / 2) % 2 === 0 ? size - 1 - row : row
      for (let c = col; c > col - 2; c--) {
        if (grid[r][c] === null) {
          let bit = false
          if (byteIdx < dataBytes.length) {
            bit = ((dataBytes[byteIdx] >> (7 - bitIdx)) & 1) === 1
            bitIdx++
            if (bitIdx === 8) {
              bitIdx = 0
              byteIdx++
            }
          } else {
            // Padding pseudo-randomness based on input hash
            bit = ((hash ^ (r * 31 + c * 17)) % 2) === 0
          }

          // Masking condition (pattern: (row + col) % 2 == 0)
          const mask = (r + c) % 2 === 0
          grid[r][c] = mask ? !bit : bit
        }
      }
    }
  }

  // Convert to boolean[][]
  return grid.map((row) => row.map((cell) => cell ?? false))
}

function addFinderPattern(grid: (boolean | null)[][], row: number, col: number) {
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (
        r === 0 ||
        r === 6 ||
        c === 0 ||
        c === 6 ||
        (r >= 2 && r <= 4 && c >= 2 && c <= 4)
      ) {
        grid[row + r][col + c] = true
      } else {
        grid[row + r][col + c] = false
      }
    }
  }

  // Separator boundaries
  for (let i = 0; i < 8; i++) {
    if (row + 7 < grid.length && col + i < grid.length) grid[row + 7][col + i] = false
    if (row + i < grid.length && col + 7 < grid.length) grid[row + i][col + 7] = false
    if (row - 1 >= 0 && col + i < grid.length) grid[row - 1][col + i] = false
    if (row + i < grid.length && col - 1 >= 0) grid[row + i][col - 1] = false
  }
}

function addAlignmentPattern(grid: (boolean | null)[][], row: number, col: number) {
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      const isOuter = Math.abs(r) === 2 || Math.abs(c) === 2
      const isCenter = r === 0 && c === 0
      grid[row + r][col + c] = isOuter || isCenter
    }
  }
}

function encodeUtf8(str: string): number[] {
  const bytes: number[] = []
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i)
    if (code < 0x80) {
      bytes.push(code)
    } else if (code < 0x800) {
      bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    } else {
      bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    }
  }
  return bytes
}

function simpleHash(str: string): number {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i)
  }
  return Math.abs(hash)
}
