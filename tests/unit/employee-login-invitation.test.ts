// ==============================================================================
// PrintERP / InkFlow SaaS - Unit Tests: Employee Login & Invitation Lifecycle
// Tests flexible login identifiers (email, username, mobile), invitation link
// token generation, verification, and portal credential state transitions.
// ==============================================================================

import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { loginSchema } from '../../features/auth/auth.schemas.ts'
import { AuthEmailService } from '../../services/auth-email.service.ts'
import {
  parseAndNormalizePhone,
  classifyLoginIdentifier,
  isValidUsernameFormat,
  sanitizeUsername,
  generateSafeEmployeeUsername,
} from '../../lib/auth/identifier-helper.ts'
import { AuthService } from '../../services/auth.service.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../../lib/db/data-store.ts'

describe('Employee Login & Invitation Lifecycle Unit Tests', () => {
  describe('1. Flexible Login Identifier Schema Validation', () => {
    it('accepts standard corporate and personal emails', () => {
      const emailResult = loginSchema.safeParse({
        email: 'rahim.designer@printshop.com.bd',
        password: 'securePassword123',
      })
      assert.strictEqual(emailResult.success, true)
    })

    it('accepts usernames for floor operators and technicians', () => {
      const usernameResult = loginSchema.safeParse({
        email: 'rahim_operator',
        password: 'securePassword123',
      })
      assert.strictEqual(usernameResult.success, true)
      if (usernameResult.success) {
        assert.strictEqual(usernameResult.data.email, 'rahim_operator')
      }
    })

    it('accepts Bangladeshi mobile numbers as login identifiers', () => {
      const mobileResult = loginSchema.safeParse({
        email: '01711223344',
        password: 'securePassword123',
      })
      assert.strictEqual(mobileResult.success, true)
      if (mobileResult.success) {
        assert.strictEqual(mobileResult.data.email, '01711223344')
      }
    })

    it('accepts employee ID badges as login identifiers', () => {
      const idResult = loginSchema.safeParse({
        email: 'EMP-2026-0042',
        password: 'securePassword123',
      })
      assert.strictEqual(idResult.success, true)
    })

    it('rejects empty or whitespace-only login identifiers', () => {
      const emptyResult = loginSchema.safeParse({
        email: '   ',
        password: 'securePassword123',
      })
      assert.strictEqual(emptyResult.success, false)
    })

    it('rejects passwords shorter than 6 characters', () => {
      const shortPassResult = loginSchema.safeParse({
        email: 'employee@printshop.com',
        password: '123',
      })
      assert.strictEqual(shortPassResult.success, false)
    })
  })

  describe('2. Employee Invitation Link & Token Lifecycle', () => {
    it('generates cryptographic 7-day invitation token', async () => {
      const employeeEmail = 'rahim.print@example.com'
      const record = await AuthEmailService.createVerificationRecord({
        email: employeeEmail,
        purpose: 'invitation',
        ttlSeconds: 7 * 24 * 60 * 60, // 7 days
      })

      assert.ok(!('error' in record), 'Verification record should be created successfully')
      assert.strictEqual(record.token.length, 64, 'Token must be a 64-char hex string')
      assert.strictEqual(record.otp.length, 6, 'Should also supply backup 6-digit PIN')

      // Verify token immediately
      const verifyResult = await AuthEmailService.verifyToken(record.token, employeeEmail, 'invitation')
      assert.strictEqual(verifyResult.success, true)
      assert.strictEqual(verifyResult.email, employeeEmail)

      // Verify token cannot be re-used (single-use guarantee)
      const reuseResult = await AuthEmailService.verifyToken(record.token, employeeEmail, 'invitation')
      assert.strictEqual(reuseResult.success, false)
    })

    it('dispatches invitation email with valid accept_link and company details', async () => {
      const employeeEmail = 'designer.karim@inkflow.com'
      const dispatchResult = await AuthEmailService.sendUserInvitationEmail({
        email: employeeEmail,
        userName: 'Karim Ullah',
        companyName: 'Dhaka Digital Sign & Print',
        roleName: 'Graphic Designer',
        invitedByName: 'Managing Director',
        tenantId: 'tenant-dhaka-print-001',
        inviteUrl: 'http://localhost:3000/auth/verify?token=test_invite_token_1234567890abcdef1234567890abcdef&email=designer.karim%40inkflow.com&purpose=invitation',
      })

      assert.strictEqual(dispatchResult.success, true, 'Email dispatch must succeed')
      assert.strictEqual(dispatchResult.status, 'sent', 'Email status must be sent')
    })
  })

  describe('3. Phone Normalization & Candidate Generation', () => {
    it('normalizes local 11-digit Bangladeshi mobile numbers', () => {
      const parsed = parseAndNormalizePhone('01712345678')
      assert.ok(parsed)
      assert.strictEqual(parsed.isBangladeshi, true)
      assert.strictEqual(parsed.localFormat, '01712345678')
      assert.strictEqual(parsed.internationalFormat, '+8801712345678')
      assert.ok(parsed.candidates.includes('01712345678'))
      assert.ok(parsed.candidates.includes('+8801712345678'))
      assert.ok(parsed.candidates.includes('8801712345678'))
    })

    it('normalizes international format with dashes and spaces', () => {
      const parsed = parseAndNormalizePhone('+880 1812-345678')
      assert.ok(parsed)
      assert.strictEqual(parsed.isBangladeshi, true)
      assert.strictEqual(parsed.localFormat, '01812345678')
      assert.strictEqual(parsed.internationalFormat, '+8801812345678')
    })

    it('handles non-Bangladeshi international numbers', () => {
      const parsed = parseAndNormalizePhone('+1-555-0199')
      assert.ok(parsed)
      assert.strictEqual(parsed.isBangladeshi, false)
      assert.ok(parsed.candidates.includes('+15550199'))
    })

    it('returns null for completely invalid phone numbers', () => {
      const parsed = parseAndNormalizePhone('not_a_phone')
      assert.strictEqual(parsed, null)
    })
  })

  describe('4. Identifier Classification & Sanitization', () => {
    it('classifies email addresses correctly', () => {
      const result = classifyLoginIdentifier('User.Name@Company.com')
      assert.strictEqual(result.type, 'email')
      assert.strictEqual(result.normalized, 'user.name@company.com')
    })

    it('classifies local and international phone numbers correctly', () => {
      const local = classifyLoginIdentifier('01712345678')
      assert.strictEqual(local.type, 'phone')
      assert.ok(local.phoneVariants)

      const intl = classifyLoginIdentifier('+8801712345678')
      assert.strictEqual(intl.type, 'phone')
      assert.ok(intl.phoneVariants)
    })

    it('classifies usernames and badge numbers correctly', () => {
      const user = classifyLoginIdentifier('Rahim_Operator')
      assert.strictEqual(user.type, 'username')
      assert.strictEqual(user.normalized, 'rahim_operator')

      const badge = classifyLoginIdentifier('EMP-2026-0042')
      assert.strictEqual(badge.type, 'username')
    })

    it('validates username formatting rules', () => {
      assert.strictEqual(isValidUsernameFormat('rahim_123').valid, true)
      assert.strictEqual(isValidUsernameFormat('rahim.operator').valid, true)
      assert.strictEqual(isValidUsernameFormat('ab').valid, false) // < 3 chars
      assert.strictEqual(isValidUsernameFormat('a'.repeat(35)).valid, false) // > 30 chars
      assert.strictEqual(isValidUsernameFormat('user@name').valid, false) // contains @
    })

    it('sanitizes display names into valid username handles', () => {
      assert.strictEqual(sanitizeUsername(' Rahim  Ullah '), 'rahim.ullah')
      assert.strictEqual(sanitizeUsername('MD. Shamsul Alam'), 'md.shamsul.alam')
    })

    it('generates safe usernames for English and non-ASCII (Bengali) names', () => {
      // Standard English name
      const enUser = generateSafeEmployeeUsername('Rahim Uddin', 'EMP-001', '01712345678')
      assert.strictEqual(enUser, 'rahim.uddin')
      assert.strictEqual(isValidUsernameFormat(enUser).valid, true)

      // Bengali name with badge ID
      const bnUserWithId = generateSafeEmployeeUsername('রহিম উদ্দিন', 'EMP-042', '01712345678')
      assert.strictEqual(bnUserWithId, 'emp042')
      assert.strictEqual(isValidUsernameFormat(bnUserWithId).valid, true)

      // Bengali name without badge ID, uses mobile digits
      const bnUserWithPhone = generateSafeEmployeeUsername('করিম শেখ', undefined, '01819988776')
      assert.strictEqual(bnUserWithPhone, 'emp.988776')
      assert.strictEqual(isValidUsernameFormat(bnUserWithPhone).valid, true)
    })
  })

  describe('5. Duplicate Prevention & Uniqueness Validation', () => {
    const originalEmployees = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
    const originalUsers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []

    before(() => {
      // Seed test data in PrintERPDataStore
      PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, [
        {
          id: 'emp-uniq-1',
          name: 'Rahim Khan',
          email: 'rahim@printbd.com',
          mobile: '01711223344',
          employee_id_number: 'EMP-001',
          portal_credentials: {
            username: 'rahim.op',
            email: 'rahim@printbd.com',
          },
        },
      ])

      PrintERPDataStore.set(STORAGE_KEYS.REGISTERED_USERS, [
        {
          id: 'usr-uniq-1',
          full_name: 'Karim Owner',
          email: 'karim@owner.com',
          phone: '01811223344',
          username: 'karim.boss',
        },
      ])
    })

    after(() => {
      PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, originalEmployees)
      PrintERPDataStore.set(STORAGE_KEYS.REGISTERED_USERS, originalUsers)
    })

    it('detects duplicate email in employee records', async () => {
      const res = await AuthService.validateIdentifierUniqueness({
        email: 'rahim@printbd.com',
      })
      assert.strictEqual(res.available, false)
      assert.strictEqual(res.conflictField, 'email')
      assert.ok(res.error)
      assert.ok(res.errorBn)
    })

    it('detects duplicate email in user accounts', async () => {
      const res = await AuthService.validateIdentifierUniqueness({
        email: 'karim@owner.com',
      })
      assert.strictEqual(res.available, false)
      assert.strictEqual(res.conflictField, 'email')
    })

    it('detects duplicate username in employee portal credentials', async () => {
      const res = await AuthService.validateIdentifierUniqueness({
        username: 'rahim.op',
      })
      assert.strictEqual(res.available, false)
      assert.strictEqual(res.conflictField, 'username')
    })

    it('detects duplicate username in registered user profiles', async () => {
      const res = await AuthService.validateIdentifierUniqueness({
        username: 'karim.boss',
      })
      assert.strictEqual(res.available, false)
      assert.strictEqual(res.conflictField, 'username')
    })

    it('detects duplicate mobile number across format variations', async () => {
      // Seeded as '01711223344', query with international '+8801711223344'
      const res = await AuthService.validateIdentifierUniqueness({
        phone: '+8801711223344',
      })
      assert.strictEqual(res.available, false)
      assert.strictEqual(res.conflictField, 'phone')
    })

    it('allows self-update when excludeEmployeeId or excludeUserId is provided', async () => {
      const res = await AuthService.validateIdentifierUniqueness({
        email: 'rahim@printbd.com',
        username: 'rahim.op',
        phone: '01711223344',
        excludeEmployeeId: 'emp-uniq-1',
      })
      assert.strictEqual(res.available, true)
    })

    it('approves completely unique credentials', async () => {
      const res = await AuthService.validateIdentifierUniqueness({
        email: 'fresh.unique@company.com',
        username: 'fresh.unique.op',
        phone: '01999887766',
      })
      assert.strictEqual(res.available, true)
    })
  })

  describe('6. Multi-Identifier Login Resolution', () => {
    const originalEmployees = PrintERPDataStore.get<any[]>(STORAGE_KEYS.EMPLOYEES) || []
    const originalUsers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.REGISTERED_USERS) || []

    before(() => {
      PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, [
        {
          id: 'emp-res-1',
          name: 'Tariq Operator',
          email: 'tariq@printworks.com',
          mobile: '01755112233',
          employee_id_number: 'EMP-999',
          portal_credentials: {
            username: 'tariq.print',
            email: 'tariq@printworks.com',
          },
        },
      ])

      PrintERPDataStore.set(STORAGE_KEYS.REGISTERED_USERS, [
        {
          id: 'usr-res-1',
          full_name: 'Farhana Manager',
          email: 'farhana@printworks.com',
          phone: '01855112233',
          username: 'farhana.mgr',
        },
      ])
    })

    after(() => {
      PrintERPDataStore.set(STORAGE_KEYS.EMPLOYEES, originalEmployees)
      PrintERPDataStore.set(STORAGE_KEYS.REGISTERED_USERS, originalUsers)
    })

    it('resolves direct email to normalized lowercase email', async () => {
      const email = await AuthService.resolveLoginEmail('Tariq@PrintWorks.com')
      assert.strictEqual(email, 'tariq@printworks.com')
    })

    it('resolves employee username to registered auth email', async () => {
      const email = await AuthService.resolveLoginEmail('tariq.print')
      assert.strictEqual(email, 'tariq@printworks.com')
    })

    it('resolves user profile username to registered auth email', async () => {
      const email = await AuthService.resolveLoginEmail('farhana.mgr')
      assert.strictEqual(email, 'farhana@printworks.com')
    })

    it('resolves employee mobile number to registered auth email', async () => {
      const emailFromLocal = await AuthService.resolveLoginEmail('01755112233')
      assert.strictEqual(emailFromLocal, 'tariq@printworks.com')

      const emailFromIntl = await AuthService.resolveLoginEmail('+8801755112233')
      assert.strictEqual(emailFromIntl, 'tariq@printworks.com')
    })

    it('resolves user profile mobile number to registered auth email', async () => {
      const email = await AuthService.resolveLoginEmail('01855112233')
      assert.strictEqual(email, 'farhana@printworks.com')
    })

    it('resolves employee ID badge to registered auth email', async () => {
      const email = await AuthService.resolveLoginEmail('EMP-999')
      assert.strictEqual(email, 'tariq@printworks.com')
    })
  })
})
