// ==============================================================================
// InkFlow ERP - Universal Auth Identifier Normalizer & Parser
// Handles flexible, duplicate-free multi-identifier login: Email, Phone & Username
// Standardized across Bangladeshi & International formats
// ==============================================================================

export interface NormalizedPhoneVariants {
  raw: string
  digitsOnly: string
  local: string           // e.g. 017XXXXXXXX (11 digits for BD)
  localFormat: string     // Alias for local
  international: string   // e.g. +88017XXXXXXXX
  internationalFormat: string // Alias for international
  noPlus: string          // e.g. 88017XXXXXXXX
  candidates: string[]    // All representations to query against DB in single .in()
  isBangladeshi: boolean
}

export type LoginIdentifierType = 'email' | 'phone' | 'username'

export interface ClassifiedIdentifier {
  type: LoginIdentifierType
  raw: string
  normalized: string
  phoneVariants?: NormalizedPhoneVariants | null
}

/**
 * Normalizes and parses phone numbers supporting Bangladeshi standards
 * (01XXXXXXXXX, +8801XXXXXXXXX, 8801XXXXXXXXX) and international formats.
 */
export function parseAndNormalizePhone(input?: string | null): NormalizedPhoneVariants | null {
  if (!input) return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Extract all digits while preserving leading plus if present
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')

  if (!digits || digits.length < 7) return null

  // Case A: Standard Bangladeshi local number (11 digits starting with 01)
  if (digits.length === 11 && digits.startsWith('01')) {
    const local = digits
    const international = `+88${digits}`
    const noPlus = `88${digits}`
    return {
      raw: trimmed,
      digitsOnly: digits,
      local,
      localFormat: local,
      international,
      internationalFormat: international,
      noPlus,
      candidates: Array.from(new Set([local, international, noPlus, trimmed, digits])),
      isBangladeshi: true,
    }
  }

  // Case B: Bangladeshi number with country code 880 (13 digits starting with 8801)
  if (digits.length === 13 && digits.startsWith('8801')) {
    const local = digits.slice(2) // 01XXXXXXXXX
    const international = `+${digits}`
    const noPlus = digits
    return {
      raw: trimmed,
      digitsOnly: digits,
      local,
      localFormat: local,
      international,
      internationalFormat: international,
      noPlus,
      candidates: Array.from(new Set([local, international, noPlus, trimmed, digits])),
      isBangladeshi: true,
    }
  }

  // Case C: Standard Bangladeshi 10-digit number without leading 0 (e.g. 17XXXXXXXX)
  if (digits.length === 10 && digits.startsWith('1')) {
    const local = `0${digits}`
    const international = `+880${digits}`
    const noPlus = `880${digits}`
    return {
      raw: trimmed,
      digitsOnly: digits,
      local,
      localFormat: local,
      international,
      internationalFormat: international,
      noPlus,
      candidates: Array.from(new Set([local, international, noPlus, trimmed, digits])),
      isBangladeshi: true,
    }
  }

  // Case D: General International or generic phone number
  const international = hasPlus ? `+${digits}` : `+${digits}`
  const local = digits
  return {
    raw: trimmed,
    digitsOnly: digits,
    local,
    localFormat: local,
    international,
    internationalFormat: international,
    noPlus: digits,
    candidates: Array.from(new Set([trimmed, digits, international, local])),
    isBangladeshi: false,
  }
}

/**
 * Classifies an incoming login identifier (from email/username/mobile input)
 * into its primary type: 'email' | 'phone' | 'username'.
 */
export function classifyLoginIdentifier(input: string): ClassifiedIdentifier {
  const trimmed = (input || '').trim()
  const lower = trimmed.toLowerCase()

  // 1. If it contains '@', it is definitively an email
  if (trimmed.includes('@')) {
    return {
      type: 'email',
      raw: trimmed,
      normalized: lower,
    }
  }

  // 2. Check if it matches a phone number pattern:
  // e.g., starts with +, starts with 01, digits-only, or contains phone formatting like spaces/dashes
  const digitsCount = trimmed.replace(/\D/g, '').length
  const isLikelyPhone =
    trimmed.startsWith('+') ||
    trimmed.startsWith('01') ||
    (digitsCount >= 10 && /^[+0-9\s\-()]+$/.test(trimmed))

  if (isLikelyPhone) {
    const phone = parseAndNormalizePhone(trimmed)
    if (phone) {
      return {
        type: 'phone',
        raw: trimmed,
        normalized: phone.local,
        phoneVariants: phone,
      }
    }
  }

  // 3. Otherwise, treat as username or employee badge ID
  return {
    type: 'username',
    raw: trimmed,
    normalized: lower,
  }
}

/**
 * Validates a username format: 3-30 chars, alphanumeric, underscores, hyphens, dots.
 */
export function isValidUsernameFormat(username: string): { valid: boolean; reason?: string } {
  const clean = username.trim()
  if (clean.length < 3) {
    return { valid: false, reason: 'Username must be at least 3 characters long.' }
  }
  if (clean.length > 30) {
    return { valid: false, reason: 'Username must not exceed 30 characters.' }
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(clean)) {
    return { valid: false, reason: 'Username can only contain letters, numbers, underscores, hyphens, and periods.' }
  }
  if (/^[-._]|[-._]$/.test(clean)) {
    return { valid: false, reason: 'Username cannot start or end with a special character.' }
  }
  return { valid: true }
}

/**
 * Sanitizes a username to clean lowercased form.
 */
export function sanitizeUsername(username: string): string {
  return username
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9_.-]/g, '')
    .replace(/\.{2,}/g, '.')
    .replace(/^[-._]+|[-._]+$/g, '')
}

/**
 * Generates a clean, valid username [a-z0-9_.-] (3-30 chars).
 * If name contains Bengali or non-ASCII characters that leave < 3 characters,
 * falls back to employee badge number, phone digits, or a random safe suffix.
 */
export function generateSafeEmployeeUsername(
  name?: string | null,
  employeeIdNumber?: string | null,
  phone?: string | null
): string {
  if (name) {
    const fromName = sanitizeUsername(name)
    if (fromName.length >= 3 && fromName.length <= 30) {
      return fromName
    }
  }

  if (employeeIdNumber) {
    const cleanId = employeeIdNumber.toLowerCase().replace(/[^a-z0-9]/g, '')
    if (cleanId.length >= 2) {
      const candidate = cleanId.startsWith('emp') ? cleanId : `emp_${cleanId}`
      if (candidate.length >= 3 && candidate.length <= 30) return candidate
      if (candidate.length > 30) return candidate.slice(0, 30)
    }
  }

  if (phone) {
    const digits = phone.replace(/\D/g, '')
    if (digits.length >= 4) {
      return `emp.${digits.slice(-6)}`
    }
  }

  const rnd = Math.floor(1000 + Math.random() * 9000)
  return `emp_${rnd}`
}

