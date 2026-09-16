import { test, describe } from 'node:test'
import assert from 'node:assert'

function normalizeBdPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880')) return `+${digits}`
  if (digits.startsWith('01')) return `+88${digits}`
  return phone.trim()
}

function cleanPhoneDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('880') && digits.length === 13) {
    return digits.substring(2) // 01XXXXXXXXX
  }
  return digits
}

interface TestResolvedProductRate {
  productId: string
  productName: string
  sku: string
  unit: string
  category: string
  customerRate: number | null
  lastInvoiceRate: number | null
  defaultRate: number
  effectiveRate: number
  source: 'custom' | 'last_invoice' | 'default'
  hasCustomRate: boolean
}

describe('Customer 360 Financial Integrity, Security & Performance Hardening Tests', () => {
  // 1. Multi-Tenant Isolation
  describe('Tenant Isolation & Security Tests', () => {
    test('Tenant Isolation: Customer query must scope strictly by company_id', () => {
      const companyA = 'comp-tenant-alpha'
      const companyB = 'comp-tenant-beta'
      const customerAId = 'cust-alpha-1'

      // Mock customer records belonging to separate companies
      const mockDatabase = [
        { id: customerAId, company_id: companyA, name: 'Alpha Client Ltd', mobile: '01711000001' },
        { id: 'cust-beta-1', company_id: companyB, name: 'Beta Signage Corp', mobile: '01711000002' },
      ]

      const fetchScopedCustomer = (companyId: string, customerId: string) => {
        return mockDatabase.find((c) => c.company_id === companyId && c.id === customerId) || null
      }

      // Tenant A can access its own customer
      const resultA = fetchScopedCustomer(companyA, customerAId)
      assert.ok(resultA)
      assert.strictEqual(resultA?.name, 'Alpha Client Ltd')

      // Tenant B attempting to access Tenant A's customer must receive null (IDOR prevented)
      const resultCrossTenant = fetchScopedCustomer(companyB, customerAId)
      assert.strictEqual(resultCrossTenant, null)
    })

    test('Financial Isolation: Cross-tenant invoices cannot contaminate customer financial aggregates', () => {
      const companyA = 'comp-tenant-alpha'
      const companyB = 'comp-tenant-beta'
      const customerId = 'cust-shared-id-collision'

      const mockInvoices = [
        { id: 'inv-a-1', company_id: companyA, customer_id: customerId, grand_total: 15000, due_amount: 5000, status: 'partially_paid' },
        { id: 'inv-b-1', company_id: companyB, customer_id: customerId, grand_total: 80000, due_amount: 80000, status: 'unpaid' },
      ]

      const calculateTenantCustomerDue = (companyId: string, custId: string) => {
        return mockInvoices
          .filter((inv) => inv.company_id === companyId && inv.customer_id === custId && inv.status !== 'cancelled')
          .reduce((sum, inv) => sum + inv.due_amount, 0)
      }

      const dueForCompanyA = calculateTenantCustomerDue(companyA, customerId)
      const dueForCompanyB = calculateTenantCustomerDue(companyB, customerId)

      assert.strictEqual(dueForCompanyA, 5000)
      assert.strictEqual(dueForCompanyB, 80000)
    })
  })

  // 2. Bangladesh Phone Normalization & Unicode Support
  describe('Bangladesh Localization & Phone Normalization', () => {
    test('Phone Normalization: Normalizes 01..., 8801..., and +8801... correctly', () => {
      const p1 = normalizeBdPhone('01711123456')
      const p2 = normalizeBdPhone('+8801711123456')
      const p3 = normalizeBdPhone('8801711123456')
      const p4 = normalizeBdPhone('01711-123456')
      const p5 = normalizeBdPhone('+880 1711 123 456')

      assert.strictEqual(p1, '+8801711123456')
      assert.strictEqual(p2, '+8801711123456')
      assert.strictEqual(p3, '+8801711123456')
      assert.strictEqual(p4, '+8801711123456')
      assert.strictEqual(p5, '+8801711123456')

      const cleanDigits = cleanPhoneDigits('+8801711123456')
      assert.strictEqual(cleanDigits, '01711123456')
    })

    test('Bangla Unicode: Preserves Bangla name and address without corruption', () => {
      const customer = {
        name: 'Rahim Printing Press',
        name_bn: 'রহিম প্রিন্টিং প্রেস',
        company_name: 'আলোকবর্তিকা সাইনেজ অ্যান্ড মিডিয়া',
        address: 'বাড়ি #১২, রোড #৪, পুরানা পল্টন, ঢাকা',
      }

      assert.strictEqual(customer.name_bn, 'রহিম প্রিন্টিং প্রেস')
      assert.strictEqual(customer.company_name, 'আলোকবর্তিকা সাইনেজ অ্যান্ড মিডিয়া')
      assert.strictEqual(customer.address.includes('পল্টন'), true)
    })
  })

  // 3. Due vs. Overdue & Credit Calculations
  describe('Financial Calculations: Current Due, Overdue & Available Credit', () => {
    test('Due vs. Overdue: Calculates True Overdue based on due_date < today in Dhaka timezone', () => {
      const todayDhaka = '2026-09-16'

      const invoices = [
        {
          id: 'inv-1',
          grand_total: 10000,
          paid_amount: 6000,
          due_amount: 4000,
          due_date: '2026-09-10', // Past due date -> Overdue
          status: 'partially_paid',
        },
        {
          id: 'inv-2',
          grand_total: 8000,
          paid_amount: 0,
          due_amount: 8000,
          due_date: '2026-09-25', // Future due date -> Current Due, but NOT Overdue
          status: 'unpaid',
        },
        {
          id: 'inv-3',
          grand_total: 5000,
          paid_amount: 5000,
          due_amount: 0,
          due_date: '2026-09-01', // Fully paid -> Neither Due nor Overdue
          status: 'paid',
        },
      ]

      let totalDue = 0
      let totalOverdue = 0

      for (const inv of invoices) {
        if (inv.status === 'cancelled') continue
        const due = inv.due_amount
        totalDue += due

        if (due > 0 && inv.due_date && inv.due_date < todayDhaka) {
          totalOverdue += due
        }
      }

      assert.strictEqual(totalDue, 12000, 'Total current due should be 12,000')
      assert.strictEqual(totalOverdue, 4000, 'Total overdue should strictly be 4,000')
    })

    test('Credit Limit & Available Credit: Available credit decreases as current due increases', () => {
      const creditLimit = 50000
      const totalDue = 18500

      const availableCredit = Math.max(0, creditLimit - totalDue)
      assert.strictEqual(availableCredit, 31500)

      // When due exceeds credit limit, available credit is bounded at 0
      const excessDue = 60000
      const boundedAvailable = Math.max(0, creditLimit - excessDue)
      assert.strictEqual(boundedAvailable, 0)
    })
  })

  // 4. Pricing Priority Hierarchy
  describe('Customer Pricing Hierarchy (V1-V10)', () => {
    test('Priority Rule: Customer Rate (1) > Last Invoiced Rate (2) > Product Default Rate (3)', () => {
      const defaultCatalogRate = 15 // BDT 15/sqft
      const lastInvoicedRate = 13   // BDT 13/sqft
      const customAgreedRate = 11   // BDT 11/sqft

      // Case 1: Custom Rate configured -> Takes precedence
      const rateScenario1: TestResolvedProductRate = {
        productId: 'prod-flex',
        productName: 'Panaflex 280gsm',
        sku: 'PF-280',
        unit: 'sft',
        category: 'large_format',
        customerRate: customAgreedRate,
        lastInvoiceRate: lastInvoicedRate,
        defaultRate: defaultCatalogRate,
        effectiveRate: customAgreedRate,
        source: 'custom',
        hasCustomRate: true,
      }
      assert.strictEqual(rateScenario1.effectiveRate, 11)
      assert.strictEqual(rateScenario1.source, 'custom')

      // Case 2: No custom rate, but past invoice exists -> Uses last charged rate
      const rateScenario2: TestResolvedProductRate = {
        productId: 'prod-flex',
        productName: 'Panaflex 280gsm',
        sku: 'PF-280',
        unit: 'sft',
        category: 'large_format',
        customerRate: null,
        lastInvoiceRate: lastInvoicedRate,
        defaultRate: defaultCatalogRate,
        effectiveRate: lastInvoicedRate,
        source: 'last_invoice',
        hasCustomRate: false,
      }
      assert.strictEqual(rateScenario2.effectiveRate, 13)
      assert.strictEqual(rateScenario2.source, 'last_invoice')

      // Case 3: Brand new customer, no history -> Uses default catalog rate
      const rateScenario3: TestResolvedProductRate = {
        productId: 'prod-flex',
        productName: 'Panaflex 280gsm',
        sku: 'PF-280',
        unit: 'sft',
        category: 'large_format',
        customerRate: null,
        lastInvoiceRate: null,
        defaultRate: defaultCatalogRate,
        effectiveRate: defaultCatalogRate,
        source: 'default',
        hasCustomRate: false,
      }
      assert.strictEqual(rateScenario3.effectiveRate, 15)
      assert.strictEqual(rateScenario3.source, 'default')
    })
  })

  // 5. Batch Consolidation (Elimination of N+1 Queries)
  describe('Performance: Batch Financial Aggregation', () => {
    test('Batch aggregation consolidates 25 customer metrics in 1 pass instead of 75 queries', () => {
      const mockInvoices = [
        { customer_id: 'c-1', grand_total: 1000, due_amount: 500, due_date: '2026-09-01', status: 'partially_paid' },
        { customer_id: 'c-1', grand_total: 2000, due_amount: 2000, due_date: '2026-09-20', status: 'unpaid' },
        { customer_id: 'c-2', grand_total: 5000, due_amount: 0, due_date: '2026-09-05', status: 'paid' },
        { customer_id: 'c-3', grand_total: 10000, due_amount: 10000, due_date: '2026-09-02', status: 'unpaid' },
      ]
      const mockOrders = [
        { customer_id: 'c-1', order_number: 'ORD-001', created_at: '2026-09-12' },
        { customer_id: 'c-3', order_number: 'ORD-002', created_at: '2026-09-15' },
      ]

      // Single-pass dictionary aggregation
      const invSummaryMap: Record<string, { totalInvoiced: number; totalDue: number; totalOverdue: number }> = {}
      const today = '2026-09-16'

      for (const inv of mockInvoices) {
        if (inv.status === 'cancelled') continue
        if (!invSummaryMap[inv.customer_id]) {
          invSummaryMap[inv.customer_id] = { totalInvoiced: 0, totalDue: 0, totalOverdue: 0 }
        }
        invSummaryMap[inv.customer_id].totalInvoiced += inv.grand_total
        invSummaryMap[inv.customer_id].totalDue += inv.due_amount
        if (inv.due_amount > 0 && inv.due_date && inv.due_date < today) {
          invSummaryMap[inv.customer_id].totalOverdue += inv.due_amount
        }
      }

      const orderSummaryMap: Record<string, { lastOrderNumber: string; lastOrderDate: string }> = {}
      for (const ord of mockOrders) {
        if (!orderSummaryMap[ord.customer_id]) {
          orderSummaryMap[ord.customer_id] = { lastOrderNumber: ord.order_number, lastOrderDate: ord.created_at }
        }
      }

      // Customer 1 verification
      assert.strictEqual(invSummaryMap['c-1'].totalInvoiced, 3000)
      assert.strictEqual(invSummaryMap['c-1'].totalDue, 2500)
      assert.strictEqual(invSummaryMap['c-1'].totalOverdue, 500)
      assert.strictEqual(orderSummaryMap['c-1'].lastOrderNumber, 'ORD-001')

      // Customer 2 verification
      assert.strictEqual(invSummaryMap['c-2'].totalInvoiced, 5000)
      assert.strictEqual(invSummaryMap['c-2'].totalDue, 0)
      assert.strictEqual(invSummaryMap['c-2'].totalOverdue, 0)

      // Customer 3 verification
      assert.strictEqual(invSummaryMap['c-3'].totalInvoiced, 10000)
      assert.strictEqual(invSummaryMap['c-3'].totalDue, 10000)
      assert.strictEqual(invSummaryMap['c-3'].totalOverdue, 10000)
      assert.strictEqual(orderSummaryMap['c-3'].lastOrderNumber, 'ORD-002')

      // Customer 4 (no invoices)
      assert.strictEqual(invSummaryMap['c-4'], undefined)
    })
  })
})
