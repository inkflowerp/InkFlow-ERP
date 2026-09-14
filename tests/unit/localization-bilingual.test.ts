import { test, describe } from 'node:test'
import assert from 'node:assert'
import {
  formatBDT,
  toBengaliNumerals,
  formatLakhCrore,
  formatDate,
  formatTime,
  formatDateTime,
  normalizeBdPhone,
  formatDimensions,
  getLocalDate,
} from '../../lib/formatters.ts'
import { LocalizationService } from '../../services/localization.service.ts'

describe('Localization & Bilingual Formatters Unit Tests (V7)', () => {
  test('converts English numbers to Bengali numerals reliably', () => {
    assert.strictEqual(toBengaliNumerals(1234567890), '১২৩৪৫৬৭৮৯০')
    assert.strictEqual(toBengaliNumerals('INV-2026-0001'), 'INV-২০২৬-০০০১')
  })

  test('formats BDT currency with South Asian Lakh and Crore commas in English and Bengali', () => {
    // 1 Crore 25 Lakh 50 Thousand
    const amount = 12550000.5
    const enFormat = formatBDT(amount, { showDecimals: true })
    const bnFormat = formatBDT(amount, { useBengaliNumerals: true, showDecimals: true })

    assert.strictEqual(enFormat, '৳\u00A01,25,50,000.50')
    assert.strictEqual(bnFormat, '৳\u00A0১,২৫,৫০,০০০.৫০')
  })

  test('normalizes various Bangladesh telephone formats to standard +880 international format', () => {
    assert.strictEqual(normalizeBdPhone('01711223344'), '+8801711223344')
    assert.strictEqual(normalizeBdPhone('8801711223344'), '+8801711223344')
    assert.strictEqual(normalizeBdPhone('+8801711223344'), '+8801711223344')
    assert.strictEqual(normalizeBdPhone('01812-345678'), '+8801812345678')
  })

  test('formats dates and times localized in Asia/Dhaka Bangladesh timezone', () => {
    const isoDate = '2026-09-14T06:00:00.000Z' // 12:00 PM BST (UTC+6)
    const localDate = getLocalDate(isoDate)
    assert.strictEqual(localDate, '2026-09-14')

    const formattedEn = formatDate(isoDate, 'en')
    assert.ok(formattedEn.includes('2026'))

    const formattedTime = formatTime(isoDate, 'en')
    assert.strictEqual(formattedTime, '12:00 PM')

    // Verify dateStyle and timeStyle options do not throw TypeError: Invalid option
    const formattedWithStyles = formatDate(isoDate, 'en', { dateStyle: 'medium', timeStyle: 'short' } as any)
    assert.ok(typeof formattedWithStyles === 'string' && formattedWithStyles.length > 0)

    const formattedDateTimeResult = formatDateTime(isoDate, 'en')
    assert.ok(formattedDateTimeResult.includes('2026') && formattedDateTimeResult.includes('12:00'))
  })

  test('formats dimensions and area calculations in English and Bengali', () => {
    const dimEn = formatDimensions(10, 4, 'ft', 'en')
    const dimBn = formatDimensions(10, 4, 'ft', 'bn')

    assert.strictEqual(dimEn, '10 ft × 4 ft = 40.00 sq.ft')
    assert.strictEqual(dimBn, '১০ ফুট × ৪ ফুট = ৪০.০০ বর্গফুট')
  })

  test('formats hierarchical Bangladesh structured address correctly', () => {
    const addr = {
      division_name: 'Dhaka',
      division_name_bn: 'ঢাকা',
      district_name: 'Dhaka',
      district_name_bn: 'ঢাকা',
      upazila_name: 'Banani',
      upazila_name_bn: 'বনানী',
      area: 'Block B',
      post_code: '1213',
      full_address: 'House 12, Road 4, Banani, Dhaka',
    }

    const formattedEn = LocalizationService.formatAddress(addr, 'en')
    assert.strictEqual(formattedEn, 'House 12, Road 4, Banani, Dhaka')

    const formattedBn = LocalizationService.formatAddress(addr, 'bn')
    assert.strictEqual(formattedBn, 'Block B, বনানী, ঢাকা, ঢাকা, ১২১৩')
  })
})
