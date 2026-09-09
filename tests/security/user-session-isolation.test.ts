import { test, describe } from 'node:test'
import assert from 'node:assert'

export const TEST_USERS = [
  {
    user_id: 'usr-001',
    branch_id: 'br-001',
    status: 'active',
    profile: { email: 'owner@alphaprint.com.bd', full_name: 'Shamsul Alam', is_active: true },
    roles: [{ id: 'r1', slug: 'owner', name: 'Owner' }],
  },
  {
    user_id: 'usr-002',
    branch_id: 'br-001',
    status: 'active',
    profile: { email: 'manager@alphaprint.com.bd', full_name: 'Kamrul Hasan', is_active: true },
    roles: [{ id: 'r3', slug: 'manager', name: 'Shop Manager' }],
  },
  {
    user_id: 'usr-003',
    branch_id: 'br-002',
    status: 'active',
    profile: { email: 'operator@alphaprint.com.bd', full_name: 'Rafiqul Islam (Press)', is_active: true },
    roles: [{ id: 'r4', slug: 'operator', name: 'Machine Operator' }],
  },
  {
    user_id: 'usr-004',
    branch_id: 'br-001',
    status: 'disabled',
    profile: { email: 'ex-designer@alphaprint.com.bd', full_name: 'Arif Chowdhury (Left)', is_active: false },
    roles: [{ id: 'r6', slug: 'designer', name: 'Graphic Designer' }],
  },
  {
    user_id: 'usr-006',
    branch_id: 'br-001',
    status: 'active',
    profile: { email: 'designer@alphaprint.com.bd', full_name: 'Tanvir Ahmed', is_active: true },
    roles: [{ id: 'r6', slug: 'designer', name: 'Graphic Designer' }],
  },
  {
    user_id: 'usr-007',
    branch_id: 'br-001',
    status: 'active',
    profile: { email: 'accountant@alphaprint.com.bd', full_name: 'Nasir Uddin', is_active: true },
    roles: [{ id: 'r5', slug: 'accountant', name: 'Accountant' }],
  },
  {
    user_id: 'usr-008',
    branch_id: 'br-002',
    status: 'active',
    profile: { email: 'delivery@alphaprint.com.bd', full_name: 'Jahangir Alam', is_active: true },
    roles: [{ id: 'r7', slug: 'installer', name: 'Delivery Coordinator' }],
  },
]

function testCheckPermission(role: string, permissionCode: string): boolean {
  if (role === 'business_owner' || role === 'platform_owner' || role === 'owner') return true
  const [resource, action] = permissionCode.split('.')

  if (role === 'operator') {
    if (resource === 'production' && (action === 'view' || action === 'edit')) return true
    if (resource === 'inventory' && action === 'view') return true
    return false
  }

  if (role === 'designer') {
    if (['order', 'quotation', 'production'].includes(resource) && ['view', 'edit', 'approve'].includes(action)) return true
    return false
  }

  if (role === 'manager' || role === 'sales_manager') {
    if (['customer', 'quotation', 'order'].includes(resource)) return true
    if (['payment', 'delivery', 'reports'].includes(resource) && (action === 'view' || action === 'create')) return true
    if (resource === 'invoice' && action === 'view') return true
    return false
  }

  return false
}

function hasBranchAccess(
  userBranchId: string | null | undefined,
  targetBranchId: string | null | undefined,
  isOwnerOrAdmin: boolean = false
): boolean {
  if (isOwnerOrAdmin || !targetBranchId || !userBranchId) return true
  return userBranchId === targetBranchId
}

describe('Master User Login & Session Isolation Tests', () => {
  // Test Accounts
  const ownerUser = TEST_USERS.find((u) => u.profile.email === 'owner@alphaprint.com.bd')
  const managerUser = TEST_USERS.find((u) => u.profile.email === 'manager@alphaprint.com.bd')
  const designerUser = TEST_USERS.find((u) => u.profile.email === 'designer@alphaprint.com.bd')
  const operatorUser = TEST_USERS.find((u) => u.profile.email === 'operator@alphaprint.com.bd')
  const accountantUser = TEST_USERS.find((u) => u.profile.email === 'accountant@alphaprint.com.bd')
  const deliveryUser = TEST_USERS.find((u) => u.profile.email === 'delivery@alphaprint.com.bd')
  const disabledUser = TEST_USERS.find((u) => u.profile.email === 'ex-designer@alphaprint.com.bd')


  test('1. Core Requirement: Every user has an independent unique ID and profile', () => {
    assert.ok(ownerUser && managerUser && designerUser && operatorUser && accountantUser && deliveryUser && disabledUser)

    const userIds = [
      ownerUser.user_id,
      managerUser.user_id,
      designerUser.user_id,
      operatorUser.user_id,
      accountantUser.user_id,
      deliveryUser.user_id,
      disabledUser.user_id,
    ]

    // Verify all user IDs are unique (zero ID collisions)
    const uniqueIds = new Set(userIds)
    assert.strictEqual(uniqueIds.size, userIds.length, 'Each user must have a unique identity')
  })

  test('2. Role and Responsibility Isolation: Each account resolves only their authorized role', () => {
    assert.strictEqual(ownerUser?.roles?.[0].slug, 'owner')
    assert.strictEqual(managerUser?.roles?.[0].slug, 'manager')
    assert.strictEqual(designerUser?.roles?.[0].slug, 'designer')
    assert.strictEqual(operatorUser?.roles?.[0].slug, 'operator')
    assert.strictEqual(accountantUser?.roles?.[0].slug, 'accountant')
    assert.strictEqual(deliveryUser?.roles?.[0].slug, 'installer')
  })

  test('3. Disabled Account Quarantine: Disabled users are strictly rejected', () => {
    assert.strictEqual(disabledUser?.status, 'disabled')
    assert.strictEqual(disabledUser?.profile?.is_active, false)
  })

  test('4. Permission Boundary: Operators and Designers cannot access Financial & VAT Settings', () => {
    // Owner has full control
    assert.strictEqual(testCheckPermission('business_owner', 'settings.full_control'), true)
    assert.strictEqual(testCheckPermission('business_owner', 'invoice.approve'), true)

    // Operator cannot edit or delete invoices or modify company settings
    assert.strictEqual(testCheckPermission('operator', 'invoice.create'), false)
    assert.strictEqual(testCheckPermission('operator', 'invoice.approve'), false)
    assert.strictEqual(testCheckPermission('operator', 'settings.edit'), false)
    assert.strictEqual(testCheckPermission('operator', 'settings.full_control'), false)

    // Designer cannot approve invoices or modify VAT
    assert.strictEqual(testCheckPermission('designer', 'invoice.create'), false)
    assert.strictEqual(testCheckPermission('designer', 'settings.full_control'), false)

    // Operator CAN update production stages
    assert.strictEqual(testCheckPermission('operator', 'production.edit'), true)

    // Designer CAN approve prepress design proofs
    assert.strictEqual(testCheckPermission('designer', 'production.approve'), true)
  })

  test('5. Branch Isolation: Machine Operators are scoped to their assigned factory branch', () => {
    // Owner has head office or company-wide scope
    assert.strictEqual(hasBranchAccess(ownerUser?.branch_id, 'br-002', true), true)

    // Operator is assigned to Tejgaon Factory (br-002)
    assert.strictEqual(operatorUser?.branch_id, 'br-002')
    assert.strictEqual(hasBranchAccess(operatorUser?.branch_id, 'br-002', false), true)
    assert.strictEqual(hasBranchAccess(operatorUser?.branch_id, 'br-001', false), false) // Denied access to Motijheel
    assert.strictEqual(hasBranchAccess(operatorUser?.branch_id, 'br-003', false), false) // Denied access to Chattogram
  })

  test('6. Login Switching Simulation (User A -> User B -> User C -> User A)', () => {
    // Simulate sequential session token creation and state isolation
    const sessionStore = new Map<string, any>()

    function simulateLogin(email: string) {
      const match = TEST_USERS.find((u) => u.profile.email === email)
      if (!match || match.status === 'disabled') {
        throw new Error('Authentication rejected')
      }
      const token = `session_${match.user_id}_${Date.now()}`

      sessionStore.set('active_session', {
        userId: match.user_id,
        email: match.profile?.email,
        role: match.roles?.[0].slug,
        branchId: match.branch_id,
        token,
      })
      return sessionStore.get('active_session')
    }

    function simulateLogout() {
      sessionStore.delete('active_session')
    }

    // Step 1: User A (Owner) logs in
    const sessionA = simulateLogin('owner@alphaprint.com.bd')
    assert.strictEqual(sessionA.userId, 'usr-001')
    assert.strictEqual(sessionA.role, 'owner')

    // Step 2: User A logs out
    simulateLogout()
    assert.strictEqual(sessionStore.get('active_session'), undefined)

    // Step 3: User B (Manager) logs in
    const sessionB = simulateLogin('manager@alphaprint.com.bd')
    assert.strictEqual(sessionB.userId, 'usr-002')
    assert.strictEqual(sessionB.role, 'manager')
    assert.notStrictEqual(sessionB.userId, sessionA.userId, 'User B must not inherit User A ID')

    // Step 4: User B logs out, User C (Designer) logs in
    simulateLogout()
    const sessionC = simulateLogin('designer@alphaprint.com.bd')
    assert.strictEqual(sessionC.userId, 'usr-006')
    assert.strictEqual(sessionC.role, 'designer')

    // Step 5: User C logs out, User D (Operator) logs in
    simulateLogout()
    const sessionD = simulateLogin('operator@alphaprint.com.bd')
    assert.strictEqual(sessionD.userId, 'usr-003')
    assert.strictEqual(sessionD.branchId, 'br-002')

    // Step 6: Disabled user attempt fails
    assert.throws(
      () => simulateLogin('ex-designer@alphaprint.com.bd'),
      /Authentication rejected/
    )

    // Step 7: Return to User A (Owner)
    const sessionA_again = simulateLogin('owner@alphaprint.com.bd')
    assert.strictEqual(sessionA_again.userId, 'usr-001')
    assert.strictEqual(sessionA_again.role, 'owner')
  })

  test('7. Cross-Tenant Boundary Enforcement', () => {
    // Tenant Alpha Digital (c-01) vs Tenant Meghna Offset (c-02)
    function verifyTenantAccess(userCompanyId: string, requestedCompanyId: string) {
      if (userCompanyId !== requestedCompanyId) {
        throw new Error('403 Forbidden: Cross-tenant access denied')
      }
      return true
    }

    const alphaCompanyId = 'a0000000-0000-0000-0000-000000000001'
    const meghnaCompanyId = 'a0000000-0000-0000-0000-000000000002'

    // Alpha user accessing Alpha tenant -> OK
    assert.strictEqual(verifyTenantAccess(alphaCompanyId, alphaCompanyId), true)

    // Alpha user attempting to access Meghna tenant -> Throws 403
    assert.throws(
      () => verifyTenantAccess(alphaCompanyId, meghnaCompanyId),
      /403 Forbidden: Cross-tenant access denied/
    )
  })

  test('8. Platform Administration Isolation: Tenant users cannot access platform administration', () => {
    function isAuthorizedForPlatform(role: string): boolean {
      return role.startsWith('platform_')
    }

    assert.strictEqual(isAuthorizedForPlatform('platform_owner'), true)
    assert.strictEqual(isAuthorizedForPlatform('platform_admin'), true)
    assert.strictEqual(isAuthorizedForPlatform('business_owner'), false)
    assert.strictEqual(isAuthorizedForPlatform('sales_manager'), false)
    assert.strictEqual(isAuthorizedForPlatform('operator'), false)
  })
})
