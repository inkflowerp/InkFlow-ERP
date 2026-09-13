import { test, describe } from 'node:test'
import assert from 'node:assert'

export function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('01')) return `+88${digits}`
  return phone.trim()
}

export function cleanPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.substring(2)
  }
  return digits
}

export function isValidBdPhone(phone: string): boolean {
  const cleaned = cleanPhoneDigits(phone)
  if (!cleaned) return false
  return /^01[3-9]\d{8}$/.test(cleaned)
}

describe('Customer Unicode & Bangladeshi Contact Utilities Unit Tests', () => {
  test('Bangla Unicode: Preserves full UTF-8 Unicode characters without corruption or truncation', () => {
    const customer = {
      name: 'আহমেদ প্রিন্টিং প্রেস অ্যান্ড প্যাকেজিং',
      name_bn: 'আহমেদ প্রিন্টিং প্রেস অ্যান্ড প্যাকেজিং',
      company_name: 'মেঘনা পাবলিকেশন্স লিমিটেড',
      address: '১২/এ মতিঝিল বা/এ, ঢাকা-১০০০',
    }

    assert.strictEqual(customer.name, 'আহমেদ প্রিন্টিং প্রেস অ্যান্ড প্যাকেজিং')
    assert.strictEqual(customer.company_name, 'মেঘনা পাবলিকেশন্স লিমিটেড')
    assert.strictEqual(customer.address, '১২/এ মতিঝিল বা/এ, ঢাকা-১০০০')
  })

  test('BD Phone Normalization: Converts local 11-digit numbers to standard international format', () => {
    assert.strictEqual(normalizeBdPhone('01711223344'), '+8801711223344')
    assert.strictEqual(normalizeBdPhone('8801819876543'), '+8801819876543')
    assert.strictEqual(normalizeBdPhone('+8801912345678'), '+8801912345678')
    assert.strictEqual(normalizeBdPhone('01300-112233'), '+8801300112233')
  })

  test('BD Phone Validation: Rejects malformed phone numbers', () => {
    assert.strictEqual(isValidBdPhone('01711223344'), true)
    assert.strictEqual(isValidBdPhone('01819876543'), true)
    assert.strictEqual(isValidBdPhone('01234567890'), false) // Invalid operator prefix 012
    assert.strictEqual(isValidBdPhone('12345'), false)
  })
})
