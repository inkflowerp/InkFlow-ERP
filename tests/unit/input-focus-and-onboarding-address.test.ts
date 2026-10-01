import test from 'node:test'
import assert from 'node:assert/strict'
import { onboardingSchema } from '../../features/tenant/tenant.schemas.ts'

test('Onboarding Address and Input Focus Stability Tests', async (t) => {
  await t.test('1. Onboarding schema validates street address minimum length (3 chars)', () => {
    // 0 characters (empty)
    const emptyResult = onboardingSchema.safeParse({
      name: 'Print Press Ltd',
      slug: 'print-press',
      business_type: 'digital_printing',
      phone: '01711223344',
      email: 'info@printpress.com.bd',
      division_id: 1,
      district_id: 1,
      address: '',
      currency: 'BDT',
      default_language: 'bn',
      owner_name: 'Shamim Hossain',
      owner_email: 'shamim@printpress.com.bd',
      owner_phone: '01711223344',
    })
    assert.strictEqual(emptyResult.success, false)
    if (!emptyResult.success) {
      const issue = emptyResult.error.issues.find((i) => i.path.includes('address'))
      assert.strictEqual(issue?.message, 'Street address is required')
    }

    // 1 character ('P') -> still invalid
    const char1Result = onboardingSchema.safeParse({
      name: 'Print Press Ltd',
      slug: 'print-press',
      business_type: 'digital_printing',
      phone: '01711223344',
      email: 'info@printpress.com.bd',
      division_id: 1,
      district_id: 1,
      address: 'P',
      currency: 'BDT',
      default_language: 'bn',
      owner_name: 'Shamim Hossain',
      owner_email: 'shamim@printpress.com.bd',
      owner_phone: '01711223344',
    })
    assert.strictEqual(char1Result.success, false)

    // 2 characters ('Pl') -> still invalid
    const char2Result = onboardingSchema.safeParse({
      name: 'Print Press Ltd',
      slug: 'print-press',
      business_type: 'digital_printing',
      phone: '01711223344',
      email: 'info@printpress.com.bd',
      division_id: 1,
      district_id: 1,
      address: 'Pl',
      currency: 'BDT',
      default_language: 'bn',
      owner_name: 'Shamim Hossain',
      owner_email: 'shamim@printpress.com.bd',
      owner_phone: '01711223344',
    })
    assert.strictEqual(char2Result.success, false)

    // 3 characters ('Plo') -> becomes valid! Error is cleared!
    const char3Result = onboardingSchema.safeParse({
      name: 'Print Press Ltd',
      slug: 'print-press',
      business_type: 'digital_printing',
      phone: '01711223344',
      email: 'info@printpress.com.bd',
      division_id: 1,
      district_id: 1,
      address: 'Plo',
      currency: 'BDT',
      default_language: 'bn',
      owner_name: 'Shamim Hossain',
      owner_email: 'shamim@printpress.com.bd',
      owner_phone: '01711223344',
    })
    assert.strictEqual(char3Result.success, true)
  })

  await t.test('2. Input wrapper determination logic remains stable across error transitions', () => {
    // Helper simulating Input wrapper determination logic
    function shouldWrap(rawProps: Record<string, any>, previousWrapped: boolean): boolean {
      if (previousWrapped) return true // Stable once wrapped!
      return Boolean(rawProps.icon || rawProps.rightElement || ('error' in rawProps) || rawProps.error)
    }

    // Step A: Initially passed with error="Street address is required"
    let wrapped = shouldWrap({ error: 'Street address is required', value: 'Pl' }, false)
    assert.strictEqual(wrapped, true, 'Must wrap when error is present')

    // Step B: User types 3rd character. Error becomes undefined, but error prop is still passed by react-hook-form
    wrapped = shouldWrap({ error: undefined, value: 'Plot 12' }, wrapped)
    assert.strictEqual(
      wrapped,
      true,
      'Must maintain wrapper when error transitions to undefined so DOM does not unmount and lose focus'
    )

    // Step C: Bare input without error or icon prop
    const bareWrapped = shouldWrap({ value: '100', placeholder: '0' }, false)
    assert.strictEqual(bareWrapped, false, 'Bare inputs without error prop should not be forced into wrapper')
  })
})
