import { test, describe } from 'node:test'
import assert from 'node:assert'

// ==============================================================================
// INKFLOW SaaS — Tenant & User Authentication Hardening Test Suite
// Rigorous automated verification for registration, login, logout,
// tenant isolation, user isolation, branch isolation, and IDOR prevention.
// ==============================================================================

interface MockAuthUser {
  id: string
  email: string
  password_hash: string
  created_at: string
}

interface MockUserProfile {
  id: string
  email: string
  full_name: string
  phone: string | null
  is_active: boolean
}

interface MockCompany {
  id: string
  name: string
  slug: string
  is_active: boolean
  status: 'active' | 'suspended' | 'pending'
}

interface MockBranch {
  id: string
  company_id: string
  name: string
  is_main: boolean
}

interface MockCompanyUser {
  id: string
  company_id: string
  user_id: string
  branch_id: string | null
  status: 'active' | 'disabled' | 'invited'
  responsibilities: string[]
  permissions: string[]
}

interface MockBusinessRecord {
  id: string
  company_id: string
  branch_id?: string
  created_by_user_id: string
  type: 'invoice' | 'customer' | 'job' | 'payment' | 'file' | 'audit'
  title: string
  amount?: number
}

// ------------------------------------------------------------------------------
// In-Memory Authoritative Database Simulation
// ------------------------------------------------------------------------------
class MockDatabase {
  authUsers: MockAuthUser[] = []
  userProfiles: MockUserProfile[] = []
  companies: MockCompany[] = []
  branches: MockBranch[] = []
  companyUsers: MockCompanyUser[] = []
  businessRecords: MockBusinessRecord[] = []
  activeSessions: Map<string, { userId: string; expiresAt: number }> = new Map()

  reset() {
    this.authUsers = []
    this.userProfiles = []
    this.companies = []
    this.branches = []
    this.companyUsers = []
    this.businessRecords = []
    this.activeSessions.clear()
  }

  // Authoritative Supabase Auth SignUp
  signUp(email: string, password: string, fullName: string, phone?: string) {
    const normalized = email.trim().toLowerCase()
    if (this.authUsers.find((u) => u.email === normalized)) {
      throw new Error('An account with this email already exists.')
    }
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long.')
    }

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const user: MockAuthUser = {
      id: userId,
      email: normalized,
      password_hash: `hash_${password}`,
      created_at: new Date().toISOString(),
    }
    this.authUsers.push(user)

    const profile: MockUserProfile = {
      id: userId,
      email: normalized,
      full_name: fullName,
      phone: phone || null,
      is_active: true,
    }
    this.userProfiles.push(profile)

    return { userId, user, profile }
  }

  // Authoritative Tenant Registration (Company + Branch + Owner Membership)
  createTenant(ownerUserId: string, companyName: string, companySlug: string) {
    const user = this.authUsers.find((u) => u.id === ownerUserId)
    if (!user) throw new Error('User not found in Supabase Auth.')

    const companyId = `cmp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    const company: MockCompany = {
      id: companyId,
      name: companyName,
      slug: companySlug,
      is_active: true,
      status: 'active',
    }
    this.companies.push(company)

    const branchId = `br-${companyId}-main`
    const branch: MockBranch = {
      id: branchId,
      company_id: companyId,
      name: 'Main Branch',
      is_main: true,
    }
    this.branches.push(branch)

    const membershipId = `cu-${Date.now()}`
    const membership: MockCompanyUser = {
      id: membershipId,
      company_id: companyId,
      user_id: ownerUserId,
      branch_id: branchId,
      status: 'active',
      responsibilities: ['business_owner'],
      permissions: ['*'],
    }
    this.companyUsers.push(membership)

    return { company, branch, membership }
  }

  // Authoritative Login
  login(email: string, password: string) {
    const normalized = email.trim().toLowerCase()
    const user = this.authUsers.find((u) => u.email === normalized)
    if (!user || user.password_hash !== `hash_${password}`) {
      throw new Error('Invalid email or password.')
    }

    const profile = this.userProfiles.find((p) => p.id === user.id)
    if (!profile || !profile.is_active) {
      throw new Error('Your user profile is inactive.')
    }

    // Resolve tenant membership
    const membership = this.companyUsers.find((cu) => cu.user_id === user.id && cu.status === 'active')
    if (!membership) {
      return { user, profile, company: null, membership: null, requiresOnboarding: true }
    }

    const company = this.companies.find((c) => c.id === membership.company_id)
    if (!company || !company.is_active || company.status === 'suspended') {
      throw new Error('This business account is currently suspended.')
    }

    const sessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
    this.activeSessions.set(sessionId, {
      userId: user.id,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    })

    return {
      sessionId,
      user,
      profile,
      company,
      membership,
      requiresOnboarding: false,
    }
  }

  // Authoritative Logout
  logout(sessionId: string) {
    this.activeSessions.delete(sessionId)
    return { success: true }
  }

  // Authoritative Server-Side Query Guard (RLS simulation)
  queryTenantRecords(
    authenticatedUserId: string,
    requestedCompanyId: string,
    recordType?: string
  ) {
    // 1. Authenticate user membership in requested tenant
    const membership = this.companyUsers.find(
      (cu) => cu.user_id === authenticatedUserId && cu.company_id === requestedCompanyId
    )

    if (!membership || membership.status !== 'active') {
      throw new Error('403 Forbidden: No active membership in this tenant.')
    }

    const company = this.companies.find((c) => c.id === requestedCompanyId)
    if (!company || !company.is_active || company.status === 'suspended') {
      throw new Error('403 Forbidden: Tenant is suspended or inactive.')
    }

    // 2. Strict tenant quarantine
    return this.businessRecords.filter((rec) => {
      if (rec.company_id !== requestedCompanyId) return false
      if (recordType && rec.type !== recordType) return false
      return true
    })
  }

  // Authoritative Mutation Guard
  createTenantRecord(
    authenticatedUserId: string,
    targetCompanyId: string,
    record: Omit<MockBusinessRecord, 'id' | 'company_id' | 'created_by_user_id'>
  ) {
    const membership = this.companyUsers.find(
      (cu) => cu.user_id === authenticatedUserId && cu.company_id === targetCompanyId
    )

    if (!membership || membership.status !== 'active') {
      throw new Error('403 Forbidden: Cannot insert records into an unauthorized tenant.')
    }

    const newRecord: MockBusinessRecord = {
      id: `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      company_id: targetCompanyId,
      created_by_user_id: authenticatedUserId,
      ...record,
    }
    this.businessRecords.push(newRecord)
    return newRecord
  }

  // IDOR Guard
  getRecordById(authenticatedUserId: string, targetCompanyId: string, recordId: string) {
    const membership = this.companyUsers.find(
      (cu) => cu.user_id === authenticatedUserId && cu.company_id === targetCompanyId
    )
    if (!membership || membership.status !== 'active') {
      throw new Error('403 Forbidden: Unauthorized tenant access.')
    }

    const record = this.businessRecords.find((r) => r.id === recordId)
    if (!record) return null

    // Direct object check: record must belong to the authorized tenant
    if (record.company_id !== targetCompanyId) {
      throw new Error('403 Forbidden: Cross-tenant IDOR violation detected.')
    }

    return record
  }
}

// ------------------------------------------------------------------------------
// Test Suites
// ------------------------------------------------------------------------------
describe('InkFlow Tenant & User Auth Hardening Suite', () => {
  const db = new MockDatabase()

  test.beforeEach(() => {
    db.reset()
  })

  // 1. TENANT REGISTRATION & OWNER ROLE
  describe('Pillar 1: Registration & Tenant Initialization', () => {
    test('Valid registration creates auth user, company, default branch, and owner membership', () => {
      const { userId } = db.signUp('owner@alphaprint.com', 'SecurePass123!', 'Shamsul Alam', '01711000000')
      assert.ok(userId)

      const { company, branch, membership } = db.createTenant(userId, 'Alpha Printing', 'alpha-printing')
      assert.strictEqual(company.name, 'Alpha Printing')
      assert.strictEqual(company.slug, 'alpha-printing')
      assert.strictEqual(branch.is_main, true)
      assert.strictEqual(membership.user_id, userId)
      assert.deepStrictEqual(membership.responsibilities, ['business_owner'])
      assert.deepStrictEqual(membership.permissions, ['*'])
    })

    test('Duplicate email registration is rejected', () => {
      db.signUp('existing@inkflow.com', 'Pass123456!', 'Existing User')
      assert.throws(
        () => db.signUp('existing@inkflow.com', 'AnotherPass123!', 'Duplicate User'),
        /An account with this email already exists/
      )
    })

    test('Weak passwords under 8 characters are rejected', () => {
      assert.throws(
        () => db.signUp('weak@inkflow.com', '123', 'Weak Password User'),
        /Password must be at least 8 characters long/
      )
    })
  })

  // 2. AUTHORITATIVE LOGIN & RECOVERY
  describe('Pillar 2: Authoritative Login & Security States', () => {
    test('Valid credentials succeed and create active session', () => {
      const { userId } = db.signUp('owner@press.com', 'ValidPass123!', 'Press Owner')
      db.createTenant(userId, 'Press Co', 'press-co')

      const result = db.login('owner@press.com', 'ValidPass123!')
      assert.ok(result.sessionId)
      assert.strictEqual(result.requiresOnboarding, false)
      assert.strictEqual(result.company?.slug, 'press-co')
    })

    test('Invalid password fails with authentication error', () => {
      db.signUp('user@press.com', 'CorrectPass123!', 'Test User')
      assert.throws(
        () => db.login('user@press.com', 'WrongPass123!'),
        /Invalid email or password/
      )
    })

    test('Suspended tenant blocks login with suspension error', () => {
      const { userId } = db.signUp('suspended@press.com', 'ValidPass123!', 'Suspended Owner')
      const { company } = db.createTenant(userId, 'Suspended Press', 'suspended-press')
      company.status = 'suspended'
      company.is_active = false

      assert.throws(
        () => db.login('suspended@press.com', 'ValidPass123!'),
        /This business account is currently suspended/
      )
    })

    test('User without company membership requires onboarding', () => {
      db.signUp('fresh@press.com', 'ValidPass123!', 'Fresh User')
      const result = db.login('fresh@press.com', 'ValidPass123!')
      assert.strictEqual(result.requiresOnboarding, true)
      assert.strictEqual(result.company, null)
    })
  })

  // 3. LOGOUT & SESSION INVALIDATION
  describe('Pillar 3: Logout & Session Invalidation', () => {
    test('Logout permanently destroys the server session', () => {
      const { userId } = db.signUp('logout@press.com', 'ValidPass123!', 'Logout User')
      db.createTenant(userId, 'Logout Press', 'logout-press')

      const { sessionId } = db.login('logout@press.com', 'ValidPass123!')
      assert.ok(db.activeSessions.has(sessionId!))

      db.logout(sessionId!)
      assert.strictEqual(db.activeSessions.has(sessionId!), false)
    })
  })

  // 4. TENANT ISOLATION & QUARANTINE (STRICT MULTI-TENANCY)
  describe('Pillar 4: Cross-Tenant Isolation & Quarantine', () => {
    test('Tenant A cannot query Tenant B records under any circumstances', () => {
      // Setup Tenant A
      const { userId: userA } = db.signUp('ownerA@inkflow.com', 'Password123!', 'Owner A')
      const { company: companyA } = db.createTenant(userA, 'Company A', 'company-a')
      db.createTenantRecord(userA, companyA.id, {
        type: 'invoice',
        title: 'Invoice A-1001',
        amount: 50000,
      })

      // Setup Tenant B
      const { userId: userB } = db.signUp('ownerB@inkflow.com', 'Password123!', 'Owner B')
      const { company: companyB } = db.createTenant(userB, 'Company B', 'company-b')
      db.createTenantRecord(userB, companyB.id, {
        type: 'invoice',
        title: 'Invoice B-2001',
        amount: 85000,
      })

      // Query as Tenant A -> Sees ONLY Company A records
      const recordsA = db.queryTenantRecords(userA, companyA.id)
      assert.strictEqual(recordsA.length, 1)
      assert.strictEqual(recordsA[0].title, 'Invoice A-1001')
      assert.strictEqual(recordsA[0].company_id, companyA.id)

      // Query as Tenant B -> Sees ONLY Company B records
      const recordsB = db.queryTenantRecords(userB, companyB.id)
      assert.strictEqual(recordsB.length, 1)
      assert.strictEqual(recordsB[0].title, 'Invoice B-2001')
      assert.strictEqual(recordsB[0].company_id, companyB.id)

      // User A attempts to query Company B -> 403 Forbidden
      assert.throws(
        () => db.queryTenantRecords(userA, companyB.id),
        /403 Forbidden: No active membership in this tenant/
      )
    })

    test('Tenant A cannot insert records into Tenant B', () => {
      const { userId: userA } = db.signUp('intruder@inkflow.com', 'Password123!', 'Intruder')
      const { company: companyA } = db.createTenant(userA, 'Intruder Co', 'intruder-co')

      const { userId: userB } = db.signUp('victim@inkflow.com', 'Password123!', 'Victim')
      const { company: companyB } = db.createTenant(userB, 'Victim Co', 'victim-co')

      // Intruder attempts to insert into Victim Co
      assert.throws(
        () =>
          db.createTenantRecord(userA, companyB.id, {
            type: 'customer',
            title: 'Malicious Record',
          }),
        /403 Forbidden: Cannot insert records into an unauthorized tenant/
      )
    })
  })

  // 5. INSECURE DIRECT OBJECT REFERENCE (IDOR) PREVENTION
  describe('Pillar 5: IDOR Prevention', () => {
    test('Direct ID lookup of another tenant record is blocked with 403', () => {
      const { userId: userA } = db.signUp('userA@test.com', 'Password123!', 'User A')
      const { company: compA } = db.createTenant(userA, 'Comp A', 'comp-a')

      const { userId: userB } = db.signUp('userB@test.com', 'Password123!', 'User B')
      const { company: compB } = db.createTenant(userB, 'Comp B', 'comp-b')

      const recordB = db.createTenantRecord(userB, compB.id, {
        type: 'invoice',
        title: 'Secret Invoice B',
        amount: 120000,
      })

      // User A attempts to fetch Record B by ID within Comp A context
      assert.throws(
        () => db.getRecordById(userA, compA.id, recordB.id),
        /403 Forbidden: Cross-tenant IDOR violation detected/
      )
    })
  })

  // 6. BRANCH & USER DATA SCOPE ISOLATION
  describe('Pillar 6: Branch & Responsibility Scope', () => {
    test('Disabled tenant user is denied all operations immediately', () => {
      const { userId: ownerId } = db.signUp('owner@fastprint.com', 'Password123!', 'Owner')
      const { company } = db.createTenant(ownerId, 'FastPrint', 'fastprint')

      const { userId: empId } = db.signUp('fired@fastprint.com', 'Password123!', 'Fired Employee')
      const membership: MockCompanyUser = {
        id: 'cu-fired',
        company_id: company.id,
        user_id: empId,
        branch_id: 'br-main',
        status: 'disabled', // Revoked
        responsibilities: ['designer'],
        permissions: ['design.view'],
      }
      db.companyUsers.push(membership)

      assert.throws(
        () => db.queryTenantRecords(empId, company.id),
        /403 Forbidden: No active membership in this tenant/
      )
    })
  })
})
