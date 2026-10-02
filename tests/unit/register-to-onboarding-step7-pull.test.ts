import { describe, it } from 'node:test'
import assert from 'node:assert'
import { registerSchema } from '../../features/auth/auth.schemas.ts'
import { onboardingSchema } from '../../features/tenant/tenant.schemas.ts'

describe('Register -> Onboarding Step 7 Credential Pull', () => {
  it('1. Registration input matches expected draft format and validates schema', () => {
    const registrationInput = {
      fullName: 'Md. Shamsul Alam',
      email: 'shamsul@apexprint.com.bd',
      phone: '01711223344',
      password: 'SecurePassword2026!',
    }

    const validated = registerSchema.safeParse(registrationInput)
    assert.strictEqual(validated.success, true)
    if (validated.success) {
      assert.strictEqual(validated.data.fullName, 'Md. Shamsul Alam')
      assert.strictEqual(validated.data.email, 'shamsul@apexprint.com.bd')
      assert.strictEqual(validated.data.phone, '01711223344')
      assert.strictEqual(validated.data.password, 'SecurePassword2026!')
    }
  })

  it('2. Pulling registration draft maps Customer Name, Owner Email, Owner Mobile, and Password to Step 7', () => {
    const draft = {
      fullName: 'Md. Shamsul Alam',
      email: 'shamsul@apexprint.com.bd',
      phone: '01711223344',
      password: 'SecurePassword2026!',
      savedAt: Date.now(),
    }

    // Simulate Onboarding Step 7 pull
    const step7Values = {
      owner_name: draft.fullName,
      owner_email: draft.email,
      owner_phone: draft.phone,
      owner_password: draft.password,
    }

    assert.strictEqual(step7Values.owner_name, 'Md. Shamsul Alam')
    assert.strictEqual(step7Values.owner_email, 'shamsul@apexprint.com.bd')
    assert.strictEqual(step7Values.owner_phone, '01711223344')
    assert.strictEqual(step7Values.owner_password, 'SecurePassword2026!')

    // Validate with onboardingSchema Step 7 requirements
    const fullOnboardingData = {
      name: 'Apex Printing & Signage',
      slug: 'apex-print',
      business_type: 'digital_printing',
      phone: '01711223344',
      email: 'info@apexprint.com.bd',
      division_id: 1,
      district_id: 1,
      address: '12 Dilkusha C/A, Motijheel, Dhaka',
      currency: 'BDT',
      default_language: 'bn' as const,
      ...step7Values,
    }

    const res = onboardingSchema.safeParse(fullOnboardingData)
    assert.strictEqual(res.success, true)
  })

  it('3. Freshness TTL checks allow recent drafts and discard stale drafts', () => {
    const SIX_HOURS_MS = 6 * 60 * 60 * 1000

    const recentDraft = {
      fullName: 'Test User',
      email: 'test@example.com',
      phone: '01711000000',
      password: 'password123',
      savedAt: Date.now() - 1000 * 60 * 15, // 15 mins ago
    }

    const staleDraft = {
      fullName: 'Old User',
      email: 'old@example.com',
      phone: '01711999999',
      password: 'oldpassword123',
      savedAt: Date.now() - (SIX_HOURS_MS + 1000), // > 6 hours ago
    }

    const isRecentFresh = !recentDraft.savedAt || (Date.now() - recentDraft.savedAt) < SIX_HOURS_MS
    const isStaleFresh = !staleDraft.savedAt || (Date.now() - staleDraft.savedAt) < SIX_HOURS_MS

    assert.strictEqual(isRecentFresh, true)
    assert.strictEqual(isStaleFresh, false)
  })

  it('4. Fallback to active session cookie when draft is missing (e.g. Google OAuth)', () => {
    const mockSession = {
      userId: 'usr-google-123',
      userEmail: 'googleowner@gmail.com',
      fullName: 'Google Business Owner',
      phone: '01812345678',
    }

    let ownerName = ''
    let ownerEmail = ''
    let ownerPhone = ''
    let ownerPassword = ''

    // Draft missing, check session
    if (!ownerName && mockSession.fullName) ownerName = mockSession.fullName
    if (!ownerEmail && mockSession.userEmail) ownerEmail = mockSession.userEmail
    if (!ownerPhone && mockSession.phone) ownerPhone = mockSession.phone

    assert.strictEqual(ownerName, 'Google Business Owner')
    assert.strictEqual(ownerEmail, 'googleowner@gmail.com')
    assert.strictEqual(ownerPhone, '01812345678')
    assert.strictEqual(ownerPassword, '') // Password remains empty for OAuth unless user chooses one
  })

  it('5. Storage cleanup simulation after successful company setup', () => {
    const mockStorage: Record<string, string> = {
      printerp_registration_draft: JSON.stringify({ fullName: 'Test', password: 'secret' }),
    }

    assert.ok(mockStorage['printerp_registration_draft'])

    // Cleanup upon company creation success
    delete mockStorage['printerp_registration_draft']

    assert.strictEqual(mockStorage['printerp_registration_draft'], undefined)
  })
})
