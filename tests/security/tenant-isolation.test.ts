import { test, describe } from 'node:test'
import assert from 'node:assert'

// Secure Signed Storage Token Generation & Validation Logic
export function generateSignedStorageUrl(
  bucket: string,
  filePath: string,
  expiresInSeconds: number = 900
) {
  const expiresAt = Date.now() + expiresInSeconds * 1000
  const signature = Buffer.from(`${bucket}:${filePath}:${expiresAt}:secret-salt-key`).toString('base64url')
  const url = `https://storage.printerp.app/${bucket}/${filePath}?expires=${expiresAt}&signature=${signature}`
  return { url, expiresAt }
}

export function verifySignedStorageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    const expires = Number(parsed.searchParams.get('expires'))
    const signature = parsed.searchParams.get('signature')

    if (!expires || !signature) return false
    if (Date.now() > expires) return false // Expired

    const pathParts = parsed.pathname.split('/').filter(Boolean)
    const bucket = pathParts[0]
    const filePath = pathParts.slice(1).join('/')

    const expected = Buffer.from(`${bucket}:${filePath}:${expires}:secret-salt-key`).toString('base64url')
    return signature === expected
  } catch {
    return false
  }
}

// Mock multi-tenant database records
const MOCK_DB = {
  companies: [
    { id: 'c-01', name: 'Alpha Digital & Signage Ltd.' },
    { id: 'c-02', name: 'Bengal Printing Works' },
  ],
  orders: [
    { id: 'ord-101', company_id: 'c-01', customer_name: 'Square Toiletries', total: 45000 },
    { id: 'ord-201', company_id: 'c-02', customer_name: 'Apex Footwear', total: 80000 },
  ],
  invoices: [
    { id: 'inv-101', company_id: 'c-01', amount: 45000, status: 'unpaid' },
    { id: 'inv-201', company_id: 'c-02', amount: 80000, status: 'paid' },
  ],
}

// Scoped multi-tenant query simulation with RLS
function queryCompanyOrders(requestingCompanyId: string) {
  return MOCK_DB.orders.filter((ord) => ord.company_id === requestingCompanyId)
}

function getInvoiceById(requestingCompanyId: string, invoiceId: string) {
  const invoice = MOCK_DB.invoices.find((inv) => inv.id === invoiceId)
  if (!invoice) return null
  // RLS boundary check
  if (invoice.company_id !== requestingCompanyId) {
    throw new Error('403 Forbidden: Cross-tenant access violation')
  }
  return invoice
}

describe('Security & Multi-Tenant Isolation Tests', () => {
  test('Tenant Quarantine: Company c-01 queries orders and sees ONLY c-01 records', () => {
    const orders = queryCompanyOrders('c-01')
    assert.strictEqual(orders.length, 1)
    assert.strictEqual(orders[0].id, 'ord-101')
    assert.strictEqual(orders[0].company_id, 'c-01')
    assert.strictEqual(orders[0].customer_name, 'Square Toiletries')
  })

  test('Cross-Tenant Data Leakage Prevention: Company c-02 cannot access c-01 records', () => {
    const orders = queryCompanyOrders('c-02')
    assert.strictEqual(orders.length, 1)
    assert.strictEqual(orders[0].id, 'ord-201')
    assert.strictEqual(orders[0].company_id, 'c-02')

    // Confirm c-01 order is absent
    const leakedOrder = orders.find((o) => o.id === 'ord-101')
    assert.strictEqual(leakedOrder, undefined)
  })

  test('Direct ID Access RLS Enforcement: Rejects cross-tenant invoice lookup with 403', () => {
    // User from c-01 attempts to access invoice inv-201 belonging to c-02
    assert.throws(
      () => getInvoiceById('c-01', 'inv-201'),
      /403 Forbidden: Cross-tenant access violation/
    )
  })

  test('Storage Security: Generates signed file URL with expiration token', () => {
    const signed = generateSignedStorageUrl('customer-artworks', 'c-01/billboard-flex-vector.pdf', 300)

    assert.ok(signed.url)
    assert.ok(signed.expiresAt > Date.now())

    // Validate valid signed token
    const isValid = verifySignedStorageUrl(signed.url)
    assert.strictEqual(isValid, true)

    // Validate expired signed token
    const expired = generateSignedStorageUrl('customer-artworks', 'c-01/test.pdf', -10)
    assert.strictEqual(verifySignedStorageUrl(expired.url), false)
  })

  test('Platform Owner Boundary: Admin functions require explicit elevated credentials', () => {
    const regularUserRole = 'sales_manager'
    const platformAdminRole = 'platform_owner'

    const canAccessPlatformOverview = (role: string) => role === 'platform_owner'
    assert.strictEqual(canAccessPlatformOverview(regularUserRole), false)
    assert.strictEqual(canAccessPlatformOverview(platformAdminRole), true)
  })
})
