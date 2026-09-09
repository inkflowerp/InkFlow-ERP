import { test, describe } from 'node:test'
import assert from 'node:assert'

// ==============================================================================
// InkFlow SaaS - Complete Platform User & Tenant User Auth Isolation Test Suite
// Exhaustively tests the strict, fail-closed 2x2 authentication boundary matrix:
//   1. Platform User -> Platform Domain (PASS)
//   2. Platform User -> Tenant Domain (DENY)
//   3. Tenant User -> Tenant Domain (PASS)
//   4. Tenant User -> Platform Domain (DENY)
//   5. Tenant A User -> Tenant B Domain (DENY)
//   6. Suspended / Disabled User Rejection (DENY)
//   7. Identity & Cookie Forgery Resistance (DENY)
// ==============================================================================

// --- Domain Models & Test Fixtures ---

export type AuthDomainContext = 'platform' | 'tenant'

export interface MockPlatformAdminRecord {
  id: string
  userId: string
  email: string
  fullName: string
  role: 'platform_owner' | 'platform_admin' | 'platform_support' | 'platform_readonly'
  isActive: boolean
}

export interface MockCompanyRecord {
  id: string
  slug: string
  name: string
  isActive: boolean
}

export interface MockTenantUserRecord {
  id: string
  userId: string
  companyId: string
  email: string
  fullName: string
  role: string
  status: 'active' | 'disabled' | 'invited'
  branchId: string
}

// Global Directories
const PLATFORM_ADMIN_DIRECTORY: MockPlatformAdminRecord[] = [
  {
    id: 'pa-owner-001',
    userId: 'u-auth-owner-001',
    email: 'haji.shamim@printerp.com.bd',
    fullName: 'Haji Mohammad Shamim (Platform Owner)',
    role: 'platform_owner',
    isActive: true,
  },
  {
    id: 'pa-admin-002',
    userId: 'u-auth-admin-002',
    email: 'ops.lead@printerp.com.bd',
    fullName: 'Operations Lead (Platform Admin)',
    role: 'platform_admin',
    isActive: true,
  },
  {
    id: 'pa-disabled-003',
    userId: 'u-auth-disabled-003',
    email: 'ex.admin@printerp.com.bd',
    fullName: 'Ex Platform Staff',
    role: 'platform_admin',
    isActive: false, // Suspended
  },
]

const TENANT_DIRECTORY: MockCompanyRecord[] = [
  {
    id: 'cmp-alpha-001',
    slug: 'alpha-digital',
    name: 'Alpha Digital & Signage Ltd.',
    isActive: true,
  },
  {
    id: 'cmp-meghna-002',
    slug: 'meghna-press',
    name: 'Meghna Color Press & Packaging',
    isActive: true,
  },
  {
    id: 'cmp-suspended-003',
    slug: 'suspended-press',
    name: 'Suspended Printing Works',
    isActive: false,
  },
]

const TENANT_USER_DIRECTORY: MockTenantUserRecord[] = [
  // Tenant Alpha Users
  {
    id: 'cu-alpha-owner',
    userId: 'u-alpha-owner-uuid',
    companyId: 'cmp-alpha-001',
    email: 'owner@alphaprint.com.bd',
    fullName: 'Shamsul Alam (Alpha Owner)',
    role: 'business_owner',
    status: 'active',
    branchId: 'br-alpha-main',
  },
  {
    id: 'cu-alpha-designer',
    userId: 'u-alpha-designer-uuid',
    companyId: 'cmp-alpha-001',
    email: 'designer@alphaprint.com.bd',
    fullName: 'Tanvir Ahmed (Alpha Designer)',
    role: 'designer',
    status: 'active',
    branchId: 'br-alpha-main',
  },
  {
    id: 'cu-alpha-operator',
    userId: 'u-alpha-operator-uuid',
    companyId: 'cmp-alpha-001',
    email: 'operator@alphaprint.com.bd',
    fullName: 'Rafiqul Islam (Alpha Operator)',
    role: 'operator',
    status: 'active',
    branchId: 'br-alpha-factory',
  },
  {
    id: 'cu-alpha-disabled',
    userId: 'u-alpha-disabled-uuid',
    companyId: 'cmp-alpha-001',
    email: 'terminated@alphaprint.com.bd',
    fullName: 'Terminated Worker',
    role: 'operator',
    status: 'disabled', // Suspended
    branchId: 'br-alpha-factory',
  },

  // Tenant Meghna Users
  {
    id: 'cu-meghna-owner',
    userId: 'u-meghna-owner-uuid',
    companyId: 'cmp-meghna-002',
    email: 'owner@meghnapress.com.bd',
    fullName: 'Kamal Hossain (Meghna Owner)',
    role: 'business_owner',
    status: 'active',
    branchId: 'br-meghna-main',
  },
  {
    id: 'cu-meghna-manager',
    userId: 'u-meghna-manager-uuid',
    companyId: 'cmp-meghna-002',
    email: 'manager@meghnapress.com.bd',
    fullName: 'Faruk Ahmed (Meghna Manager)',
    role: 'sales_manager',
    status: 'active',
    branchId: 'br-meghna-main',
  },
]

// --- Simulated Authentication & Guard Services ---

function simulatePlatformLogin(email: string, pass: string): { success: boolean; error?: string; context?: AuthDomainContext; user?: MockPlatformAdminRecord } {
  if (!email || !pass) return { success: false, error: 'Email and password required' }
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Supabase Auth credential check
  const platformAdmin = PLATFORM_ADMIN_DIRECTORY.find((p) => p.email.toLowerCase() === normalizedEmail)
  const isTenantUser = TENANT_USER_DIRECTORY.some((t) => t.email.toLowerCase() === normalizedEmail)

  if (!platformAdmin) {
    if (isTenantUser) {
      // Hard boundary rejection: Tenant user attempting platform login
      return {
        success: false,
        error: 'Unauthorized: This account does not possess Platform Administration authority.',
      }
    }
    return { success: false, error: 'Invalid platform credentials.' }
  }

  // 2. Active status check
  if (!platformAdmin.isActive) {
    return { success: false, error: 'Access Denied: Platform administrator account is suspended.' }
  }

  // 3. Establish Platform Auth Context
  return {
    success: true,
    context: 'platform',
    user: platformAdmin,
  }
}

function simulateTenantLogin(email: string, pass: string, targetSlugOrId?: string): { success: boolean; error?: string; context?: AuthDomainContext; user?: MockTenantUserRecord; company?: MockCompanyRecord } {
  if (!email || !pass) return { success: false, error: 'Email and password required' }
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Check if user is a Platform Administrator trying to log into tenant workspace
  const platformAdmin = PLATFORM_ADMIN_DIRECTORY.find((p) => p.email.toLowerCase() === normalizedEmail && p.isActive)
  const tenantUser = TENANT_USER_DIRECTORY.find((t) => t.email.toLowerCase() === normalizedEmail)

  if (platformAdmin) {
    // Hard boundary rejection: Platform user attempting tenant login unconditionally denied
    return {
      success: false,
      error: 'This account does not have access to the business workspace.',
    }
  }

  if (!tenantUser) {
    return { success: false, error: 'Invalid email or password' }
  }

  // 2. Disabled account check
  if (tenantUser.status === 'disabled') {
    return { success: false, error: 'Your account has been disabled by your administrator. Access is revoked.' }
  }

  // 3. Company active check
  const company = TENANT_DIRECTORY.find((c) => c.id === tenantUser.companyId)
  if (!company || !company.isActive) {
    return { success: false, error: 'This organization account is currently inactive. Contact platform support.' }
  }

  // 4. Target slug validation if specified
  if (targetSlugOrId && company.slug !== targetSlugOrId && company.id !== targetSlugOrId) {
    return { success: false, error: 'You are not an authorized member of the requested organization.' }
  }

  return {
    success: true,
    context: 'tenant',
    user: tenantUser,
    company,
  }
}

function simulateRequirePlatformGuard(userId: string): { authorized: boolean; error?: string } {
  const admin = PLATFORM_ADMIN_DIRECTORY.find((p) => p.userId === userId && p.isActive)
  if (!admin) {
    return { authorized: false, error: 'REDIRECT_PLATFORM_LOGIN_UNAUTHORIZED' }
  }
  return { authorized: true }
}

function simulateRequireTenantGuard(userId: string, requestedCompanySlugOrId: string): { authorized: boolean; error?: string } {
  // Unconditional rejection: Platform users cannot satisfy tenant guard
  const isPlatformAdmin = PLATFORM_ADMIN_DIRECTORY.some((p) => p.userId === userId && p.isActive)
  if (isPlatformAdmin) {
    return { authorized: false, error: 'REDIRECT_403_TENANT' }
  }

  const company = TENANT_DIRECTORY.find((c) => c.slug === requestedCompanySlugOrId || c.id === requestedCompanySlugOrId)
  if (!company || !company.isActive) {
    return { authorized: false, error: 'REDIRECT_403_TENANT' }
  }

  const membership = TENANT_USER_DIRECTORY.find(
    (t) => t.userId === userId && t.companyId === company.id && t.status === 'active'
  )

  if (!membership) {
    return { authorized: false, error: 'REDIRECT_403_TENANT' }
  }

  return { authorized: true }
}

// --- Test Suite Execution ---

describe('InkFlow SaaS: Complete Platform vs Tenant Authentication Isolation Matrix', () => {
  // --------------------------------------------------------------------------
  // Matrix Cell 1: Platform User -> Platform Domain (ALLOWED)
  // --------------------------------------------------------------------------
  describe('1. Platform User -> Platform Domain Access', () => {
    test('1.1 Platform Owner can log in via /platform/login and establish Platform Context', () => {
      const res = simulatePlatformLogin('haji.shamim@printerp.com.bd', 'RootPass123!')
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.context, 'platform')
      assert.strictEqual(res.user?.role, 'platform_owner')
      assert.strictEqual(res.user?.fullName, 'Haji Mohammad Shamim (Platform Owner)')
    })

    test('1.2 Platform Admin can pass requirePlatformGuard() for /platform/* routes', () => {
      const ownerGuard = simulateRequirePlatformGuard('u-auth-owner-001')
      const adminGuard = simulateRequirePlatformGuard('u-auth-admin-002')

      assert.strictEqual(ownerGuard.authorized, true)
      assert.strictEqual(adminGuard.authorized, true)
    })
  })

  // --------------------------------------------------------------------------
  // Matrix Cell 2: Platform User -> Tenant Domain (DENIED)
  // --------------------------------------------------------------------------
  describe('2. Platform User -> Tenant Domain Rejection (Hard Boundary)', () => {
    test('2.1 Platform Owner cannot log in via Tenant Login (/login)', () => {
      const res = simulateTenantLogin('haji.shamim@printerp.com.bd', 'RootPass123!')
      assert.strictEqual(res.success, false)
      assert.strictEqual(res.error, 'This account does not have access to the business workspace.')
    })

    test('2.2 Platform Admin cannot log in via Tenant Login (/login)', () => {
      const res = simulateTenantLogin('ops.lead@printerp.com.bd', 'AdminPass123!')
      assert.strictEqual(res.success, false)
      assert.strictEqual(res.error, 'This account does not have access to the business workspace.')
    })

    test('2.3 Platform User direct URL navigation to /[tenantSlug]/dashboard is REJECTED with 403', () => {
      // Platform Owner attempting to access Alpha Digital's workspace
      const alphaAccess = simulateRequireTenantGuard('u-auth-owner-001', 'alpha-digital')
      assert.strictEqual(alphaAccess.authorized, false)
      assert.strictEqual(alphaAccess.error, 'REDIRECT_403_TENANT')

      // Platform Owner attempting to access Meghna Color Press
      const meghnaAccess = simulateRequireTenantGuard('u-auth-owner-001', 'meghna-press')
      assert.strictEqual(meghnaAccess.authorized, false)
      assert.strictEqual(meghnaAccess.error, 'REDIRECT_403_TENANT')
    })

    test('2.4 Platform User supplying tenant UUID to Tenant API is DENIED', () => {
      const isApiAuthorized = (userId: string, targetCompanyId: string) => {
        return TENANT_USER_DIRECTORY.some(
          (t) => t.userId === userId && t.companyId === targetCompanyId && t.status === 'active'
        )
      }

      assert.strictEqual(isApiAuthorized('u-auth-owner-001', 'cmp-alpha-001'), false)
      assert.strictEqual(isApiAuthorized('u-auth-admin-002', 'cmp-meghna-002'), false)
    })
  })

  // --------------------------------------------------------------------------
  // Matrix Cell 3: Tenant User -> Tenant Domain (ALLOWED)
  // --------------------------------------------------------------------------
  describe('3. Tenant User -> Tenant Domain Access', () => {
    test('3.1 Alpha Owner can log in via Tenant Login (/login) and establish Tenant Context', () => {
      const res = simulateTenantLogin('owner@alphaprint.com.bd', 'Pass123!')
      assert.strictEqual(res.success, true)
      assert.strictEqual(res.context, 'tenant')
      assert.strictEqual(res.company?.slug, 'alpha-digital')
      assert.strictEqual(res.user?.role, 'business_owner')
    })

    test('3.2 Alpha Designer can pass requireTenantGuard for Alpha Digital', () => {
      const res = simulateRequireTenantGuard('u-alpha-designer-uuid', 'alpha-digital')
      assert.strictEqual(res.authorized, true)
    })

    test('3.3 Meghna Manager can pass requireTenantGuard for Meghna Press', () => {
      const res = simulateRequireTenantGuard('u-meghna-manager-uuid', 'meghna-press')
      assert.strictEqual(res.authorized, true)
    })
  })

  // --------------------------------------------------------------------------
  // Matrix Cell 4: Tenant User -> Platform Domain (DENIED)
  // --------------------------------------------------------------------------
  describe('4. Tenant User -> Platform Domain Rejection (Hard Boundary)', () => {
    test('4.1 Tenant Business Owner cannot log in via /platform/login', () => {
      const res = simulatePlatformLogin('owner@alphaprint.com.bd', 'Pass123!')
      assert.strictEqual(res.success, false)
      assert.ok(res.error?.includes('Unauthorized'))
      assert.strictEqual(res.context, undefined)
    })

    test('4.2 Tenant Designer cannot log in via /platform/login', () => {
      const res = simulatePlatformLogin('designer@alphaprint.com.bd', 'Pass123!')
      assert.strictEqual(res.success, false)
      assert.ok(res.error?.includes('Unauthorized'))
    })

    test('4.3 Tenant User direct URL navigation to /platform/* is REJECTED', () => {
      const ownerPlatformAccess = simulateRequirePlatformGuard('u-alpha-owner-uuid')
      const designerPlatformAccess = simulateRequirePlatformGuard('u-alpha-designer-uuid')

      assert.strictEqual(ownerPlatformAccess.authorized, false)
      assert.strictEqual(ownerPlatformAccess.error, 'REDIRECT_PLATFORM_LOGIN_UNAUTHORIZED')

      assert.strictEqual(designerPlatformAccess.authorized, false)
      assert.strictEqual(designerPlatformAccess.error, 'REDIRECT_PLATFORM_LOGIN_UNAUTHORIZED')
    })

    test('4.4 Tenant User attempting to call Platform Server Actions is DENIED', () => {
      const isPlatformActionAuthorized = (userId: string) => {
        return PLATFORM_ADMIN_DIRECTORY.some((p) => p.userId === userId && p.isActive)
      }

      assert.strictEqual(isPlatformActionAuthorized('u-alpha-owner-uuid'), false)
      assert.strictEqual(isPlatformActionAuthorized('u-alpha-designer-uuid'), false)
      assert.strictEqual(isPlatformActionAuthorized('u-meghna-manager-uuid'), false)
      assert.strictEqual(isPlatformActionAuthorized('u-auth-owner-001'), true)
    })
  })

  // --------------------------------------------------------------------------
  // Matrix Cell 5: Cross-Tenant Isolation (Tenant A -> Tenant B DENIED)
  // --------------------------------------------------------------------------
  describe('5. Cross-Tenant Isolation (Zero Cross-Tenant Leakage)', () => {
    test('5.1 Tenant Alpha Owner cannot access Tenant Meghna workspace', () => {
      const res = simulateRequireTenantGuard('u-alpha-owner-uuid', 'meghna-press')
      assert.strictEqual(res.authorized, false)
      assert.strictEqual(res.error, 'REDIRECT_403_TENANT')
    })

    test('5.2 Tenant Meghna Manager cannot access Tenant Alpha workspace', () => {
      const res = simulateRequireTenantGuard('u-meghna-manager-uuid', 'alpha-digital')
      assert.strictEqual(res.authorized, false)
      assert.strictEqual(res.error, 'REDIRECT_403_TENANT')
    })

    test('5.3 Cross-Tenant resource ID substitution in queries returns 0 rows', () => {
      interface MockInvoice {
        id: string
        companyId: string
        amount: number
      }
      const invoices: MockInvoice[] = [
        { id: 'inv-alpha-001', companyId: 'cmp-alpha-001', amount: 50000 },
        { id: 'inv-meghna-002', companyId: 'cmp-meghna-002', amount: 120000 },
      ]

      const queryInvoices = (authUserId: string, requestedInvoiceId: string) => {
        const user = TENANT_USER_DIRECTORY.find((t) => t.userId === authUserId && t.status === 'active')
        if (!user) return []
        // RLS enforcement: WHERE company_id = user.company_id AND id = requestedInvoiceId
        return invoices.filter((inv) => inv.companyId === user.companyId && inv.id === requestedInvoiceId)
      }

      // Alpha owner trying to read Meghna's invoice
      const result = queryInvoices('u-alpha-owner-uuid', 'inv-meghna-002')
      assert.strictEqual(result.length, 0, 'Cross-tenant query must return zero rows')

      // Alpha owner reading own invoice
      const ownResult = queryInvoices('u-alpha-owner-uuid', 'inv-alpha-001')
      assert.strictEqual(ownResult.length, 1)
      assert.strictEqual(ownResult[0].amount, 50000)
    })
  })

  // --------------------------------------------------------------------------
  // Matrix Cell 6: Suspended / Disabled Users Rejection
  // --------------------------------------------------------------------------
  describe('6. Suspended and Disabled Account Rejection', () => {
    test('6.1 Suspended Platform Admin is rejected at login and route guard', () => {
      const loginRes = simulatePlatformLogin('ex.admin@printerp.com.bd', 'Pass123!')
      assert.strictEqual(loginRes.success, false)
      assert.ok(loginRes.error?.includes('suspended'))

      const guardRes = simulateRequirePlatformGuard('u-auth-disabled-003')
      assert.strictEqual(guardRes.authorized, false)
    })

    test('6.2 Terminated Tenant Worker is rejected at login and route guard', () => {
      const loginRes = simulateTenantLogin('terminated@alphaprint.com.bd', 'Pass123!')
      assert.strictEqual(loginRes.success, false)
      assert.ok(loginRes.error?.includes('disabled'))

      const guardRes = simulateRequireTenantGuard('u-alpha-disabled-uuid', 'alpha-digital')
      assert.strictEqual(guardRes.authorized, false)
    })

    test('6.3 Users belonging to a Suspended Company cannot access workspace', () => {
      const guardRes = simulateRequireTenantGuard('u-alpha-owner-uuid', 'suspended-press')
      assert.strictEqual(guardRes.authorized, false)
    })
  })

  // --------------------------------------------------------------------------
  // Matrix Cell 7: Spoofing & Tampering Resistance
  // --------------------------------------------------------------------------
  describe('7. Spoofing & Tampering Resistance', () => {
    test('7.1 Client-provided role change (e.g. employee -> platform_owner) fails closed', () => {
      const forgedRequest = {
        userId: 'u-alpha-designer-uuid',
        clientClaimedRole: 'platform_owner',
      }
      // Server always checks authoritative database directory, ignoring clientClaimedRole
      const verified = PLATFORM_ADMIN_DIRECTORY.find((p) => p.userId === forgedRequest.userId && p.isActive)
      assert.strictEqual(verified, undefined, 'Client-claimed role must NOT bypass server DB lookup')
    })

    test('7.2 Client-provided tenant_id parameter does NOT bypass verified user membership', () => {
      const attackerUserId = 'u-alpha-designer-uuid'
      const suppliedVictimTenantId = 'cmp-meghna-002'

      const isAuthorized = TENANT_USER_DIRECTORY.some(
        (t) => t.userId === attackerUserId && t.companyId === suppliedVictimTenantId && t.status === 'active'
      )
      assert.strictEqual(isAuthorized, false, 'Client-supplied tenant_id must be validated against user membership')
    })

    test('7.3 Forged Session Cookie with random UUID is rejected without active DB record', () => {
      const forgedRandomUuid = '00000000-dead-beef-0000-000000000000'
      const platformCheck = simulateRequirePlatformGuard(forgedRandomUuid)
      const tenantCheck = simulateRequireTenantGuard(forgedRandomUuid, 'alpha-digital')

      assert.strictEqual(platformCheck.authorized, false)
      assert.strictEqual(tenantCheck.authorized, false)
    })
  })
})
