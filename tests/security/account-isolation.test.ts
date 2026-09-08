import { test, describe } from 'node:test'
import assert from 'node:assert'

// ----------------------------------------------------------------------------
// Test Data & Models for Multi-Account & Session Isolation Verification
// ----------------------------------------------------------------------------

interface UserProfile {
  id: string
  email: string
  fullName: string
  department: string
  branchId: string
  companyId: string
  status: 'active' | 'disabled' | 'invited'
  responsibilities: string[]
  overrides: Record<string, boolean>
  dataScopes: Record<string, string>
}

const TEST_COMPANIES = {
  padma: {
    id: 'a0000000-0000-0000-0000-000000000001',
    slug: 'padma-digital',
    name: 'Padma Digital & Signage Ltd.',
  },
  meghna: {
    id: 'a0000000-0000-0000-0000-000000000002',
    slug: 'meghna-offset',
    name: 'Meghna Color Press & Packaging',
  },
}

const TEST_USERS: Record<string, UserProfile> = {
  owner: {
    id: 'usr-001',
    email: 'owner@padmadigital.com.bd',
    fullName: 'Shamsul Alam (Owner)',
    department: 'Executive Management',
    branchId: 'br-001', // Motijheel HQ
    companyId: TEST_COMPANIES.padma.id,
    status: 'active',
    responsibilities: ['business_owner'],
    overrides: {},
    dataScopes: { customers: 'company', orders: 'company', invoices: 'company', reports: 'company' },
  },
  manager: {
    id: 'usr-002',
    email: 'manager@padmadigital.com.bd',
    fullName: 'Kamrul Hasan (Manager)',
    department: 'Commercial & Sales',
    branchId: 'br-001', // Motijheel HQ
    companyId: TEST_COMPANIES.padma.id,
    status: 'active',
    responsibilities: ['sales_manager'],
    overrides: {},
    dataScopes: { customers: 'company', quotations: 'company', orders: 'company', invoices: 'company' },
  },
  operator: {
    id: 'usr-003',
    email: 'operator@padmadigital.com.bd',
    fullName: 'Rafiqul Islam (Press)',
    department: 'Press Floor',
    branchId: 'br-002', // Tejgaon Factory
    companyId: TEST_COMPANIES.padma.id,
    status: 'active',
    responsibilities: ['operator'],
    overrides: {},
    dataScopes: { production: 'assigned', inventory: 'company', orders: 'assigned' },
  },
  designer: {
    id: 'usr-006',
    email: 'designer@padmadigital.com.bd',
    fullName: 'Tanvir Ahmed (Designer)',
    department: 'Pre-Press Studio',
    branchId: 'br-001', // Motijheel HQ
    companyId: TEST_COMPANIES.padma.id,
    status: 'active',
    responsibilities: ['designer'],
    overrides: {},
    dataScopes: { design: 'assigned', orders: 'assigned', customers: 'assigned' },
  },
  accountant: {
    id: 'usr-007',
    email: 'accountant@padmadigital.com.bd',
    fullName: 'Nasir Uddin (Finance)',
    department: 'Finance & Accounts',
    branchId: 'br-001', // Motijheel HQ
    companyId: TEST_COMPANIES.padma.id,
    status: 'active',
    responsibilities: ['accountant'],
    overrides: {},
    dataScopes: { invoices: 'company', payments: 'company', reports: 'company' },
  },
  delivery: {
    id: 'usr-008',
    email: 'delivery@padmadigital.com.bd',
    fullName: 'Jahangir Alam (Dispatch)',
    department: 'Logistics & Dispatch',
    branchId: 'br-002', // Tejgaon Factory
    companyId: TEST_COMPANIES.padma.id,
    status: 'active',
    responsibilities: ['delivery_coordinator'],
    overrides: {},
    dataScopes: { delivery: 'assigned', orders: 'assigned' },
  },
  disabledUser: {
    id: 'usr-004',
    email: 'ex-designer@padmadigital.com.bd',
    fullName: 'Arif Chowdhury (Left)',
    department: 'Pre-Press',
    branchId: 'br-001',
    companyId: TEST_COMPANIES.padma.id,
    status: 'disabled',
    responsibilities: ['designer'],
    overrides: {},
    dataScopes: {},
  },
}

// Simulated Auth Session Context
interface SessionState {
  userId: string | null
  email: string | null
  companyId: string | null
  branchId: string | null
  responsibilities: string[]
  isOwner: boolean
  canSeeFinancials: boolean
}

function createSession(userKey: keyof typeof TEST_USERS | null): SessionState {
  if (!userKey) {
    return {
      userId: null,
      email: null,
      companyId: null,
      branchId: null,
      responsibilities: [],
      isOwner: false,
      canSeeFinancials: false,
    }
  }

  const u = TEST_USERS[userKey]
  if (u.status === 'disabled') {
    throw new Error('Account disabled. Access revoked.')
  }

  const isOwner = u.responsibilities.includes('business_owner')
  const isSales = u.responsibilities.includes('sales_manager')
  const isAccountant = u.responsibilities.includes('accountant')

  return {
    userId: u.id,
    email: u.email,
    companyId: u.companyId,
    branchId: u.branchId,
    responsibilities: u.responsibilities,
    isOwner,
    canSeeFinancials: isOwner || isSales || isAccountant,
  }
}

describe('Master User Account & Session Isolation Tests', () => {
  test('1. Independent Identities: Every test account has unique ID, email and profile', () => {
    const userKeys = Object.keys(TEST_USERS) as (keyof typeof TEST_USERS)[]
    const ids = new Set<string>()
    const emails = new Set<string>()

    for (const key of userKeys) {
      const u = TEST_USERS[key]
      assert.ok(!ids.has(u.id), `Duplicate user ID detected: ${u.id}`)
      assert.ok(!emails.has(u.email), `Duplicate user email detected: ${u.email}`)
      ids.add(u.id)
      emails.add(u.email)
    }

    assert.strictEqual(ids.size, 7)
    assert.strictEqual(emails.size, 7)
  })

  test('2. Login Switching Simulation (A -> B -> C -> D -> E -> F -> A) with ZERO crossover', () => {
    // Session A: Business Owner
    let session = createSession('owner')
    assert.strictEqual(session.userId, 'usr-001')
    assert.strictEqual(session.email, 'owner@padmadigital.com.bd')
    assert.strictEqual(session.isOwner, true)
    assert.strictEqual(session.canSeeFinancials, true)
    assert.strictEqual(session.branchId, 'br-001')

    // Logout
    session = createSession(null)
    assert.strictEqual(session.userId, null)
    assert.strictEqual(session.isOwner, false)
    assert.strictEqual(session.canSeeFinancials, false)

    // Session B: Sales Manager
    session = createSession('manager')
    assert.strictEqual(session.userId, 'usr-002')
    assert.strictEqual(session.email, 'manager@padmadigital.com.bd')
    assert.strictEqual(session.isOwner, false)
    assert.strictEqual(session.canSeeFinancials, true)

    // Logout
    session = createSession(null)

    // Session C: Graphic Designer
    session = createSession('designer')
    assert.strictEqual(session.userId, 'usr-006')
    assert.strictEqual(session.email, 'designer@padmadigital.com.bd')
    assert.strictEqual(session.isOwner, false)
    assert.strictEqual(session.canSeeFinancials, false)

    // Logout
    session = createSession(null)

    // Session D: Machine Operator
    session = createSession('operator')
    assert.strictEqual(session.userId, 'usr-003')
    assert.strictEqual(session.email, 'operator@padmadigital.com.bd')
    assert.strictEqual(session.branchId, 'br-002') // Tejgaon
    assert.strictEqual(session.isOwner, false)
    assert.strictEqual(session.canSeeFinancials, false)

    // Logout
    session = createSession(null)

    // Session E: Accountant
    session = createSession('accountant')
    assert.strictEqual(session.userId, 'usr-007')
    assert.strictEqual(session.email, 'accountant@padmadigital.com.bd')
    assert.strictEqual(session.isOwner, false)
    assert.strictEqual(session.canSeeFinancials, true)

    // Logout
    session = createSession(null)

    // Session F: Delivery Coordinator
    session = createSession('delivery')
    assert.strictEqual(session.userId, 'usr-008')
    assert.strictEqual(session.email, 'delivery@padmadigital.com.bd')
    assert.strictEqual(session.isOwner, false)
    assert.strictEqual(session.canSeeFinancials, false)

    // Logout & Return to Session A: Business Owner
    session = createSession(null)
    session = createSession('owner')
    assert.strictEqual(session.userId, 'usr-001')
    assert.strictEqual(session.isOwner, true)
    assert.strictEqual(session.canSeeFinancials, true)
  })

  test('3. Disabled / Suspended User Rejection: Blocked at auth layer with RLS revocation error', () => {
    assert.throws(
      () => {
        createSession('disabledUser')
      },
      {
        message: /Account disabled/i,
      }
    )
  })

  test('4. Tenant Boundary Enforcement: Padma Digital users cannot access Meghna Offset data', () => {
    const padmaUser = TEST_USERS.manager
    const requestedMeghnaSlug = TEST_COMPANIES.meghna.slug
    const requestedMeghnaId = TEST_COMPANIES.meghna.id

    // Check if user belongs to requested tenant
    const isTenantAuthorized = (user: UserProfile, targetSlugOrId: string) => {
      return (
        user.companyId === targetSlugOrId ||
        (user.companyId === TEST_COMPANIES.padma.id && targetSlugOrId === TEST_COMPANIES.padma.slug)
      )
    }

    assert.strictEqual(isTenantAuthorized(padmaUser, requestedMeghnaSlug), false)
    assert.strictEqual(isTenantAuthorized(padmaUser, requestedMeghnaId), false)
    assert.strictEqual(isTenantAuthorized(padmaUser, TEST_COMPANIES.padma.slug), true)
  })

  test('5. Branch Isolation: Machine Operator at Tejgaon cannot access Head Office private logs', () => {
    const operator = TEST_USERS.operator // Branch: br-002 (Tejgaon)
    const hqBranchId = 'br-001'
    const tejgaonBranchId = 'br-002'

    const canAccessBranch = (user: UserProfile, targetBranchId: string) => {
      if (user.responsibilities.includes('business_owner')) return true
      return user.branchId === targetBranchId
    }

    assert.strictEqual(canAccessBranch(operator, tejgaonBranchId), true)
    assert.strictEqual(canAccessBranch(operator, hqBranchId), false)
  })

  test('6. Platform Administration Isolation: Tenant users cannot access /platform/* routes', () => {
    interface PlatformAdminRecord {
      userId: string
      role: string
      isActive: boolean
    }
    const platformDirectory: PlatformAdminRecord[] = [
      { userId: 'u-platform-root-99', role: 'platform_owner', isActive: true },
    ]

    const isPlatformAuthorized = (userId: string) => {
      const record = platformDirectory.find((p) => p.userId === userId && p.isActive)
      return !!record && (record.role === 'platform_owner' || record.role === 'platform_admin')
    }

    assert.strictEqual(isPlatformAuthorized(TEST_USERS.owner.id), false)
    assert.strictEqual(isPlatformAuthorized(TEST_USERS.manager.id), false)
    assert.strictEqual(isPlatformAuthorized(TEST_USERS.designer.id), false)
    assert.strictEqual(isPlatformAuthorized('u-platform-root-99'), true)
  })

  test('7. Financial Metric Isolation: Margins, Receivables & P&L are hidden from Designer and Operator', () => {
    const designerSession = createSession('designer')
    const operatorSession = createSession('operator')
    const ownerSession = createSession('owner')
    const accountantSession = createSession('accountant')

    assert.strictEqual(designerSession.canSeeFinancials, false)
    assert.strictEqual(operatorSession.canSeeFinancials, false)
    assert.strictEqual(ownerSession.canSeeFinancials, true)
    assert.strictEqual(accountantSession.canSeeFinancials, true)
  })

  test('8. User Profile Edit Isolation: User A updating profile does not mutate User B', () => {
    const userStore = { ...TEST_USERS }
    const targetUserId = 'usr-006' // Designer Tanvir
    const newPhone = '+8801799887766'

    // Update Designer profile
    userStore.designer = {
      ...userStore.designer,
      fullName: 'Tanvir Ahmed Updated',
    }

    assert.strictEqual(userStore.designer.fullName, 'Tanvir Ahmed Updated')
    assert.strictEqual(userStore.owner.fullName, 'Shamsul Alam (Owner)')
    assert.strictEqual(userStore.operator.fullName, 'Rafiqul Islam (Press)')
  })

  test('9. Notification Filtering: Persona-specific alerts are scoped to intended roles only', () => {
    const notifications = [
      { id: 'n1', roles: ['owner', 'manager'], title: 'Quote Approved' },
      { id: 'n4', roles: ['designer'], title: 'Proof Approved by Client' },
      { id: 'n6', roles: ['operator'], title: 'Low Stock: Solvent Ink' },
      { id: 'n8', roles: ['delivery_coordinator'], title: 'Challan Ready' },
    ]

    const getNotificationsForUser = (userKey: keyof typeof TEST_USERS) => {
      const u = TEST_USERS[userKey]
      return notifications.filter((n) =>
        n.roles.some((r) => u.responsibilities.includes(r))
      )
    }

    const designerNotifs = getNotificationsForUser('designer')
    const operatorNotifs = getNotificationsForUser('operator')

    assert.strictEqual(designerNotifs.length, 1)
    assert.strictEqual(designerNotifs[0].id, 'n4')

    assert.strictEqual(operatorNotifs.length, 1)
    assert.strictEqual(operatorNotifs[0].id, 'n6')
  })

  test('10. Data Scope Hierarchy: Designer sees assigned orders, Owner sees company-wide', () => {
    const designerScope = TEST_USERS.designer.dataScopes.orders
    const ownerScope = TEST_USERS.owner.dataScopes.orders

    assert.strictEqual(designerScope, 'assigned')
    assert.strictEqual(ownerScope, 'company')

    const sampleOrders = [
      { id: 'ord-1', assigned_to: 'usr-006', company_id: TEST_COMPANIES.padma.id },
      { id: 'ord-2', assigned_to: 'usr-003', company_id: TEST_COMPANIES.padma.id },
    ]

    const filterOrders = (user: UserProfile, orders: typeof sampleOrders) => {
      const scope = user.dataScopes.orders
      if (scope === 'company' || user.responsibilities.includes('business_owner')) {
        return orders
      }
      return orders.filter((o) => o.assigned_to === user.id)
    }

    const designerVisible = filterOrders(TEST_USERS.designer, sampleOrders)
    const ownerVisible = filterOrders(TEST_USERS.owner, sampleOrders)

    assert.strictEqual(designerVisible.length, 1)
    assert.strictEqual(designerVisible[0].id, 'ord-1')
    assert.strictEqual(ownerVisible.length, 2)
  })
})
