// ==============================================================================
// PrintFlow - Security File Validation & Sanitization Module
// Hardens upload boundaries against executable injection, directory traversal,
// and unauthorized mime/extensions. Pure utility suitable for server and tests.
// ==============================================================================

export const MAX_DESIGN_FILE_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

export const DANGEROUS_EXECUTABLE_EXTENSIONS = [
  'exe', 'bat', 'cmd', 'sh', 'php', 'js', 'vbs', 'msi', 'jar', 'com', 'scr', 'pif', 'ps1', 'apk'
]

export const ALLOWED_DESIGN_EXTENSIONS = [
  'pdf', 'ai', 'psd', 'eps', 'tiff', 'tif', 'png', 'jpg', 'jpeg', 'svg'
]

/**
 * Safe filename sanitization: prevents path traversal, strips null bytes, prevents executable injection.
 */
export function sanitizeVirusSafeFileName(originalName: string): string {
  let base = originalName.replace(/[\/\\]/g, '_').replace(/\0/g, '')
  base = base.replace(/^\.+/, '')
  const dotIndex = base.lastIndexOf('.')
  if (dotIndex === -1) {
    throw new Error('File must have a valid extension.')
  }
  const ext = base.substring(dotIndex + 1).toLowerCase()
  const name = base.substring(0, dotIndex).replace(/[^a-zA-Z0-9_-]/g, '_')

  if (DANGEROUS_EXECUTABLE_EXTENSIONS.includes(ext)) {
    throw new Error(`File upload rejected: Dangerous executable extension .${ext} is prohibited.`)
  }

  if (!ALLOWED_DESIGN_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file format (.${ext}). Only PDF, AI, PSD, EPS, TIFF, PNG, SVG, and JPEG files are permitted.`)
  }

  return `${name || 'artwork'}.${ext}`
}
