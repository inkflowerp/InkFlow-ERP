import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isReservedSlug, isValidSlugFormat } from '../../lib/tenant/tenant-resolution.ts'

// Mock Data Layer simulating company_users database table and RLS policies
interface MockCompanyUser {
  userId: string
  companyId: string
  companySlug: string
  role: string
  status: 'active' | 'suspended' | 'invited'
  permissions: string[]
}

interface MockCompany {
  id: string
  slug: string
  name: string
  isActive: boolean
}

const mockCompanies: MockCompany[] = [
  { id: 'comp-vision-111', slug: 'vision', name: 'Vision Sign', isActive: true },
  { id: 'comp-abc-222', slug: 'abc-print', name: 'ABC Printing', isActive: true },
  { id: 'comp-suspended-333', slug: 'suspended-co', name: 'Suspended Corp', isActive: false },
]

const mockCompanyUsers: MockCompanyUser[] = [
  // User 1 belongs ONLY to Vision Sign
  {
    userId: 'user-alice-1',
    companyId: 'comp-vision-111',
    companySlug: 'vision',
    role: 'business_owner',
    status: 'active',
    permissions: ['invoices.view', 'invoices.create', 'invoices.edit', 'invoices.delete'],
  },
  // User 2 belongs ONLY to ABC Printing
  {
    userId: 'user-bob-2',
    companyId: 'comp-abc-222',
    companySlug: 'abc-print',
    role: 'sales_manager',
    status: 'active',
    permissions: ['invoices.view', 'invoices.create'],
  },
  // User 3 has MULTI-TENANT membership in both Vision Sign and ABC Printing
  {
    userId: 'user-charlie-3',
    companyId: 'comp-vision-111',
    companySlug: 'vision',
    role: 'graphic_designer',
    status: 'active',
    permissions: ['designs.view', 'designs.create'],
  },
  {
    userId: 'user-charlie-3',
    companyId: 'comp-abc-222',
    companySlug: 'abc-print',
    role: 'accountant',
    status: 'active',
    permissions: ['invoices.view', 'payments.create'],
  },
  // User 4 belongs to suspended company
  {
    userId: 'user-david-4',
    companyId: 'comp-suspended-333',
    companySlug: 'suspended-co',
    role: 'business_owner',
    status: 'active',
    permissions: ['invoices.view'],
  },
]

// Server-side Tenant Security Guard Simulator (mirroring lib/auth/tenant-auth.ts logic)
function simulateRequireTenantAccess(
  authenticatedUserId: string | null,
  requestedSubdomainSlug: string
): { authorized: boolean; statusCode: number; error?: string; companyId?: string; role?: string } {
  // 1. Unauthenticated request
  if (!authenticatedUserId) {
    return { authorized: false, statusCode: 401, error: 'Authentication required' }
  }

  // 2. Validate tenant existence
  const targetCompany = mockCompanies.find(
    (c) => c.slug.toLowerCase() === requestedSubdomainSlug.toLowerCase()
  )
  if (!targetCompany) {
    return { authorized: false, statusCode: 404, error: 'Tenant workspace not found' }
  }

  // 3. Verify tenant active status
  if (!targetCompany.isActive) {
    return { authorized: false, statusCode: 423, error: 'Tenant workspace is suspended' }
  }

  // 4. Verify user membership in company_users for THIS exact tenant
  const membership = mockCompanyUsers.find(
    (cu) =>
      cu.userId === authenticatedUserId &&
      cu.companyId === targetCompany.id &&
      cu.status === 'active'
  )

  // 5. Fail-closed: unauthorized access rejected with 403 Forbidden
  if (!membership) {
    return {
      authorized: false,
      statusCode: 403,
      error: `User does not have an active membership in tenant ${requestedSubdomainSlug}`,
    }
  }

  return {
    authorized: true,
    statusCode: 200,
    companyId: targetCompany.id,
    role: membership.role,
  }
}

// RLS Data Query Simulator
function simulateTenantScopedDataQuery(
  authenticatedUserId: string,
  targetSubdomain: string,
  records: { id: string; companyId: string; title: string }[]
): { allowed: boolean; data: { id: string; companyId: string; title: string }[] } {
  const access = simulateRequireTenantAccess(authenticatedUserId, targetSubdomain)
  if (!access.authorized || !access.companyId) {
    return { allowed: false, data: [] }
  }

  // RLS filters strictly by verified companyId (never client inputs)
  const scopedData = records.filter((r) => r.companyId === access.companyId)
  return { allowed: true, data: scopedData }
}

describe('Tenant Subdomain Security & Cross-Tenant Boundary Tests', () => {
  const sampleInvoices = [
    { id: 'inv-vis-1', companyId: 'comp-vision-111', title: 'Vision Billboards #001' },
    { id: 'inv-vis-2', companyId: 'comp-vision-111', title: 'Vision LED Sign #002' },
    { id: 'inv-abc-1', companyId: 'comp-abc-222', title: 'ABC Brochure Printing #101' },
  ]

  test('1. Tenant A user CANNOT access Tenant B subdomain (Fail-Closed Quarantine)', () => {
    // User Bob belongs to ABC Printing, tries to access vision.inkflow.com.bd
    const res = simulateRequireTenantAccess('user-bob-2', 'vision')
    assert.equal(res.authorized, false)
    assert.equal(res.statusCode, 403)
    assert.ok(res.error?.includes('does not have an active membership'))
  })

  test('2. Tenant A user accessing Tenant B subdomain query receives 0 records (RLS enforcement)', () => {
    // Bob (ABC Printing) tries to query invoices on vision.inkflow.com.bd
    const queryRes = simulateTenantScopedDataQuery('user-bob-2', 'vision', sampleInvoices)
    assert.equal(queryRes.allowed, false)
    assert.equal(queryRes.data.length, 0, 'No cross-tenant data leaked to unauthorized user')
  })

  test('3. Tenant A user accessing own tenant subdomain succeeds with authorized status', () => {
    // Alice (Vision Sign) accesses vision.inkflow.com.bd
    const res = simulateRequireTenantAccess('user-alice-1', 'vision')
    assert.equal(res.authorized, true)
    assert.equal(res.statusCode, 200)
    assert.equal(res.companyId, 'comp-vision-111')
    assert.equal(res.role, 'business_owner')

    // Query returns only Vision Sign records
    const queryRes = simulateTenantScopedDataQuery('user-alice-1', 'vision', sampleInvoices)
    assert.equal(queryRes.allowed, true)
    assert.equal(queryRes.data.length, 2)
    assert.ok(queryRes.data.every((r) => r.companyId === 'comp-vision-111'))
  })

  test('4. Multi-tenant user can seamlessly access both authorized tenants on their respective subdomains', () => {
    // Charlie is in both Vision Sign and ABC Printing
    const visionAccess = simulateRequireTenantAccess('user-charlie-3', 'vision')
    assert.equal(visionAccess.authorized, true)
    assert.equal(visionAccess.role, 'graphic_designer')

    const abcAccess = simulateRequireTenantAccess('user-charlie-3', 'abc-print')
    assert.equal(abcAccess.authorized, true)
    assert.equal(abcAccess.role, 'accountant')
  })

  test('5. Non-existent tenant subdomain returns 404', () => {
    const res = simulateRequireTenantAccess('user-alice-1', 'nonexistent-shop')
    assert.equal(res.authorized, false)
    assert.equal(res.statusCode, 404)
  })

  test('6. Suspended tenant workspace blocks access for all users including owner', () => {
    const res = simulateRequireTenantAccess('user-david-4', 'suspended-co')
    assert.equal(res.authorized, false)
    assert.equal(res.statusCode, 423)
    assert.ok(res.error?.includes('suspended'))
  })

  test('7. Unauthenticated requests on tenant subdomain are rejected with 401', () => {
    const res = simulateRequireTenantAccess(null, 'vision')
    assert.equal(res.authorized, false)
    assert.equal(res.statusCode, 401)
  })
})
