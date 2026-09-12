'use client'

import React, { useMemo } from 'react'
import QRCode from 'qrcode'

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
  const { path, totalSize } = useMemo(() => {
    try {
      const qr = QRCode.create(value || 'INKFLOW', {
        errorCorrectionLevel: level,
      })
      const matrixSize = qr.modules.size
      const margin = includeMargin ? 2 : 0
      const total = matrixSize + margin * 2

      let d = ''
      for (let r = 0; r < matrixSize; r++) {
        for (let c = 0; c < matrixSize; c++) {
          if (qr.modules.get(r, c)) {
            const x = c + margin
            const y = r + margin
            d += `M${x},${y}h1v1h-1z `
          }
        }
      }

      return { path: d, totalSize: total }
    } catch {
      return { path: '', totalSize: 25 }
    }
  }, [value, level, includeMargin])

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${totalSize} ${totalSize}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {bgColor && <rect width={totalSize} height={totalSize} fill={bgColor} />}
      <path d={path} fill={fgColor} />
    </svg>
  )
}

