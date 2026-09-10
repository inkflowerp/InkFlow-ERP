// ==============================================================================
// PrintERP SaaS - Phone Number Utilities (Bangladesh & International E.164)
// Handles +880, 880, and domestic 01XXXXXXXXX formats for carriers (GP, Robi, BL, Teletalk)
// ==============================================================================

/**
 * Normalizes a Bangladeshi or international phone number to E.164 (+880...) or standard 880... format
 */
export function normalizeBdPhoneNumber(rawPhone: string, includePlus: boolean = false): {
  isValid: boolean
  formatted: string
  operator?: string
  error?: string
} {
  if (!rawPhone) {
    return { isValid: false, formatted: '', error: 'Phone number cannot be empty' }
  }

  // Strip spaces, hyphens, parentheses, and non-digit/non-plus chars
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)]/g, '')

  // Handle + prefix
  const hasPlus = cleaned.startsWith('+')
  if (hasPlus) {
    cleaned = cleaned.substring(1)
  }

  // BD phone numbers typically start with 880 or 0
  // Standard domestic format is 11 digits starting with 013, 014, 015, 016, 017, 018, 019
  if (cleaned.startsWith('880')) {
    cleaned = cleaned.substring(3)
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1)
  }

  // Now cleaned should be 10 digits starting with 1[3-9]
  const bdPattern = /^1[3-9]\d{8}$/
  if (bdPattern.test(cleaned)) {
    const prefix = cleaned.substring(0, 2)
    let operator = 'Other Carrier'
    switch (prefix) {
      case '17':
      case '13':
        operator = 'Grameenphone'
        break
      case '18':
        operator = 'Robi'
        break
      case '16':
        operator = 'Airtel'
        break
      case '19':
      case '14':
        operator = 'Banglalink'
        break
      case '15':
        operator = 'Teletalk'
        break
    }

    const fullDigits = `880${cleaned}`
    return {
      isValid: true,
      formatted: includePlus ? `+${fullDigits}` : fullDigits,
      operator,
    }
  }

  // Non-BD International fallback check (must have 7 to 15 digits)
  const intlPattern = /^\d{7,15}$/
  if (intlPattern.test(cleaned)) {
    return {
      isValid: true,
      formatted: includePlus ? `+${cleaned}` : cleaned,
      operator: 'International Destination',
    }
  }

  return {
    isValid: false,
    formatted: rawPhone,
    error: 'Invalid Bangladeshi or international mobile number. Must be 11 digits (e.g. 017XXXXXXXX).',
  }
}

/**
 * Validates whether an email address is syntactically valid
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}
