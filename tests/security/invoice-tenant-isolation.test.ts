import { test, describe } from 'node:test'
import assert from 'node:assert'

/**
 * Server-side Multi-tenant Isolation Simulator
 */
export function validateTenantInvoiceAccess(params: {
  authenticatedTenantId: string
  authenticatedPermissions: string[]
  requestedTenantId: string
  targetCustomerId?: string
  customerTenantId?: string
}): { allowed: boolean; error?: string } {
  // Check 1: Tenant Context Match
  if (params.authenticatedTenantId !== params.requestedTenantId) {
    return {
      allowed: false,
      error: 'Access Denied: Cross-tenant operation strictly forbidden.',
    }
  }

  // Check 2: Customer Multi-tenant Ownership
  if (params.customerTenantId && params.customerTenantId !== params.authenticatedTenantId) {
    return {
      allowed: false,
      error: 'Access Denied: Customer belongs to another company.',
    }
  }

  // Check 3: Permission Check
  const hasPerm =
    params.authenticatedPermissions.includes('invoice.create') ||
    params.authenticatedPermissions.includes('invoices.create') ||
    params.authenticatedPermissions.includes('commercial.manage') ||
    params.authenticatedPermissions.includes('business_owner')

  if (!hasPerm) {
    return {
      allowed: false,
      error: 'Unauthorized: Missing invoices.create permission.',
    }
  }

  return { allowed: true }
}

describe('Invoice Multi-Tenant Isolation & Security', () => {
  test('allows invoice creation for authenticated tenant with proper permissions', () => {
    const res = validateTenantInvoiceAccess({
      authenticatedTenantId: 'c-alpha',
      authenticatedPermissions: ['invoices.create', 'invoices.view'],
      requestedTenantId: 'c-alpha',
      customerTenantId: 'c-alpha',
    })

    assert.strictEqual(res.allowed, true)
    assert.strictEqual(res.error, undefined)
  })

  test('blocks cross-tenant customer manipulation', () => {
    const res = validateTenantInvoiceAccess({
      authenticatedTenantId: 'c-alpha',
      authenticatedPermissions: ['invoices.create'],
      requestedTenantId: 'c-alpha',
      customerTenantId: 'c-beta', // Attempting to link c-beta customer to c-alpha invoice
    })

    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Customer belongs to another company'))
  })

  test('blocks cross-tenant request parameter tampering', () => {
    const res = validateTenantInvoiceAccess({
      authenticatedTenantId: 'c-alpha',
      authenticatedPermissions: ['invoices.create'],
      requestedTenantId: 'c-beta', // Tampered header/param
    })

    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Cross-tenant operation strictly forbidden'))
  })

  test('blocks invoice creation if user lacks invoice creation permission', () => {
    const res = validateTenantInvoiceAccess({
      authenticatedTenantId: 'c-alpha',
      authenticatedPermissions: ['operator.view'], // read-only machine operator
      requestedTenantId: 'c-alpha',
      customerTenantId: 'c-alpha',
    })

    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Unauthorized'))
  })
})
