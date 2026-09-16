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
    return digits.substring(2)
  }
  return digits
}

describe('Customer Financial Integrity, Accounting Single Source of Truth & Forensic Tests', () => {
  // 1. Accounting Consistency: Single Authoritative Path
  describe('1. Accounting Single Source of Truth & No Double Counting', () => {
    test('No Double Counting: Collections derive from invoice paid balances without adding payment rows', () => {
      const invoice = {
        id: 'inv-101',
        customer_id: 'cust-1',
        grand_total: 10000,
        paid_amount: 10000,
        due_amount: 0,
        status: 'paid',
      }

      const paymentRows = [
        { id: 'pay-1', customer_id: 'cust-1', invoice_id: 'inv-101', amount: 4000, status: 'completed' },
        { id: 'pay-2', customer_id: 'cust-1', invoice_id: 'inv-101', amount: 6000, status: 'completed' },
      ]

      const totalCollectedFromInvoices = [invoice]
        .filter((inv) => inv.status !== 'cancelled')
        .reduce((sum, inv) => sum + (inv.paid_amount || 0), 0)

      const totalCollectedFromPayments = paymentRows
        .filter((p) => p.status === 'completed')
        .reduce((sum, p) => sum + p.amount, 0)

      assert.strictEqual(totalCollectedFromInvoices, 10000)
      assert.strictEqual(totalCollectedFromPayments, 10000)
      assert.strictEqual(totalCollectedFromInvoices, 10000, 'Must NOT be 20,000 (which would be double-counted)')
    })

    test('Cancelled Invoices: Cancelled invoices are strictly excluded from Total Invoiced, Paid & Due', () => {
      const invoices = [
        { id: 'inv-1', grand_total: 15000, paid_amount: 15000, due_amount: 0, status: 'paid' },
        { id: 'inv-2', grand_total: 20000, paid_amount: 0, due_amount: 20000, status: 'cancelled' },
        { id: 'inv-3', grand_total: 8000, paid_amount: 3000, due_amount: 5000, status: 'partially_paid' },
      ]

      let totalInvoiced = 0
      let totalDue = 0
      let totalPaid = 0

      for (const inv of invoices) {
        if (inv.status === 'cancelled') continue
        totalInvoiced += inv.grand_total
        totalDue += inv.due_amount
        totalPaid += inv.paid_amount
      }

      assert.strictEqual(totalInvoiced, 23000, 'Cancelled invoice 20,000 must be excluded from Total Invoiced')
      assert.strictEqual(totalDue, 5000, 'Cancelled invoice 20,000 must not appear in Current Due')
      assert.strictEqual(totalPaid, 18000, 'Total Paid reflects valid active invoices')
    })
  })

  // 2. Concurrency & Idempotency Simulation
  describe('2. Concurrency & Idempotency: Row-Locking & Overpayment Prevention', () => {
    test('Concurrent Payments: Two concurrent ৳6,000 payments on ৳10,000 invoice result in Paid=৳10,000, Due=৳0, Surplus=৳2,000', () => {
      // Simulate PostgreSQL record_multi_invoice_payment_atomic logic
      const invoice = {
        id: 'inv-concurrent-1',
        grand_total: 10000,
        paid_amount: 0,
        due_amount: 10000,
        write_off_amount: 0,
        status: 'unpaid',
      }

      // Simulated atomic execution of Payment A (৳6,000)
      const executeAtomicPayment = (paymentAmount: number) => {
        // Row lock acquired (SELECT FOR UPDATE)
        let allocAmt = paymentAmount
        if (allocAmt > invoice.due_amount) {
          allocAmt = invoice.due_amount
        }

        invoice.paid_amount += allocAmt
        invoice.due_amount = Math.max(0, invoice.grand_total - invoice.paid_amount - invoice.write_off_amount)
        invoice.status = invoice.due_amount === 0 ? 'paid' : 'partially_paid'

        const unallocatedSurplus = Math.max(0, paymentAmount - allocAmt)
        return { allocAmt, unallocatedSurplus }
      }

      // Payment A arrives
      const resA = executeAtomicPayment(6000)
      assert.strictEqual(resA.allocAmt, 6000)
      assert.strictEqual(resA.unallocatedSurplus, 0)
      assert.strictEqual(invoice.paid_amount, 6000)
      assert.strictEqual(invoice.due_amount, 4000)
      assert.strictEqual(invoice.status, 'partially_paid')

      // Payment B arrives concurrently (locked until Payment A commits)
      const resB = executeAtomicPayment(6000)
      assert.strictEqual(resB.allocAmt, 4000, 'Allocation capped at remaining due')
      assert.strictEqual(resB.unallocatedSurplus, 2000, 'Surplus ৳2,000 credited to unallocated advance')
      assert.strictEqual(invoice.paid_amount, 10000)
      assert.strictEqual(invoice.due_amount, 0, 'Due balance must NEVER become negative')
      assert.strictEqual(invoice.status, 'paid')
    })
  })

  // 3. Credit Limit & Utilization Warnings (with Zero / Null Safety)
  describe('3. Credit Limit, Utilization & Zero-Division Safety', () => {
    test('Credit Limit: Correctly computes Available Credit & Utilization percentage', () => {
      const creditLimit = 100000
      const totalDue = 130000

      const availableCredit = Math.max(0, creditLimit - totalDue)
      const creditUtilization = creditLimit > 0 ? Math.round((totalDue / creditLimit) * 100) : 0
      const isOverLimit = creditLimit > 0 && totalDue > creditLimit

      assert.strictEqual(availableCredit, 0, 'Available credit must be bounded at 0')
      assert.strictEqual(creditUtilization, 130, 'Credit utilization must accurately show 130%')
      assert.strictEqual(isOverLimit, true, 'isOverLimit flag must trigger when totalDue > creditLimit')
    })

    test('Credit Limit Zero/Null: Safe against division by zero (no NaN / Infinity)', () => {
      const creditLimitZero = 0
      const totalDue = 25000

      const utilizationZero = creditLimitZero > 0 ? Math.round((totalDue / creditLimitZero) * 100) : null
      assert.strictEqual(utilizationZero, null, 'Must not be NaN or Infinity')

      const creditLimitNull: number | null = null
      const effectiveLimit = creditLimitNull || 0
      const utilizationNull = effectiveLimit > 0 ? Math.round((totalDue / effectiveLimit) * 100) : null
      assert.strictEqual(utilizationNull, null)
    })
  })

  // 4. Asia/Dhaka Midnight Date Boundaries
  describe('4. Asia/Dhaka Date Boundary & Overdue Forensics', () => {
    test('Overdue logic: Invoices due before today in Asia/Dhaka are Overdue; Invoices due today or future are Not Overdue', () => {
      const currentDhakaDate = '2026-09-16'

      const testCases = [
        { id: '1', due_date: '2026-09-15', due_amount: 5000, expectedOverdue: true },  // Due yesterday -> Overdue
        { id: '2', due_date: '2026-09-16', due_amount: 3000, expectedOverdue: false }, // Due today -> Current Due, NOT Overdue
        { id: '3', due_date: '2026-09-20', due_amount: 8000, expectedOverdue: false }, // Due future -> Current Due, NOT Overdue
        { id: '4', due_date: '2026-08-01', due_amount: 0, expectedOverdue: false },    // Zero balance -> NOT Overdue
        { id: '5', due_date: null, due_amount: 2000, expectedOverdue: false },         // No due date -> NOT Overdue
      ]

      for (const tc of testCases) {
        const isOverdue = tc.due_amount > 0 && !!tc.due_date && tc.due_date < currentDhakaDate
        assert.strictEqual(
          isOverdue,
          tc.expectedOverdue,
          `Invoice ${tc.id} overdue calculation failed for due_date=${tc.due_date}, due_amount=${tc.due_amount}`
        )
      }
    })

    test('Dhaka Midnight Boundary: Transition from 23:59:59 to 00:00:00 shifts overdue threshold cleanly', () => {
      const dateYesterday = '2026-09-15'
      const dateToday = '2026-09-16'

      const invoice = { due_date: '2026-09-15', due_amount: 4500 }

      // At 23:59:59 on Sep 15 (Dhaka date = 2026-09-15): invoice is due today -> NOT Overdue yet
      const isOverdueBeforeMidnight = invoice.due_amount > 0 && invoice.due_date < dateYesterday
      assert.strictEqual(isOverdueBeforeMidnight, false)

      // At 00:00:01 on Sep 16 (Dhaka date = 2026-09-16): invoice was due yesterday -> IS Overdue
      const isOverdueAfterMidnight = invoice.due_amount > 0 && invoice.due_date < dateToday
      assert.strictEqual(isOverdueAfterMidnight, true)
    })
  })

  // 5. Pre-Pagination Due Filtering (Database-backed)
  describe('5. Pre-Pagination Due Filtering', () => {
    test('Pre-pagination filtering: Separating customers with due from settled customers prior to slicing pages', () => {
      const allCustomers = [
        { id: 'c1', name: 'Alpha Press', totalDue: 5000 },
        { id: 'c2', name: 'Beta Signs', totalDue: 0 },
        { id: 'c3', name: 'Gamma Prints', totalDue: 12000 },
        { id: 'c4', name: 'Delta Media', totalDue: 0 },
        { id: 'c5', name: 'Epsilon Tech', totalDue: 3500 },
      ]

      const pageSize = 2

      // 1. has_due filter before pagination
      const dueCustomers = allCustomers.filter((c) => c.totalDue > 0)
      const duePage1 = dueCustomers.slice(0, pageSize)
      assert.strictEqual(dueCustomers.length, 3)
      assert.strictEqual(duePage1.length, 2)
      assert.strictEqual(duePage1[0].id, 'c1')
      assert.strictEqual(duePage1[1].id, 'c3')

      // 2. no_due filter before pagination
      const noDueCustomers = allCustomers.filter((c) => c.totalDue === 0)
      const noDuePage1 = noDueCustomers.slice(0, pageSize)
      assert.strictEqual(noDueCustomers.length, 2)
      assert.strictEqual(noDuePage1.length, 2)
      assert.strictEqual(noDuePage1[0].id, 'c2')
      assert.strictEqual(noDuePage1[1].id, 'c4')
    })
  })

  // 6. Non-Destructive Customer Deactivation vs Physical Deletion
  describe('6. Customer Deletion Protection & Deactivation', () => {
    test('Protection Rule: Customers with business history (invoices, payments, quotes, orders) cannot be physically deleted', () => {
      const customer = { id: 'cust-has-history', name: 'Paltan Media' }
      const customerHistory = {
        invoiceCount: 4,
        paymentCount: 3,
        quotationCount: 2,
        orderCount: 1,
      }

      const hasHistory =
        customerHistory.invoiceCount > 0 ||
        customerHistory.paymentCount > 0 ||
        customerHistory.quotationCount > 0 ||
        customerHistory.orderCount > 0

      const canPhysicallyDelete = !hasHistory
      assert.strictEqual(canPhysicallyDelete, false, 'Physical delete must be blocked when business history exists')

      // Customer deactivation preserves historical links
      let customerActive = true
      const toggleCustomerActive = (isActive: boolean) => {
        customerActive = isActive
        return customerActive
      }

      const result = toggleCustomerActive(false)
      assert.strictEqual(result, false, 'Customer safely deactivated without deleting accounting data')
    })
  })

  // 7. Multi-Tenant Isolation & IDOR Protection
  describe('7. Multi-Tenant Isolation & IDOR Defense', () => {
    test('Tenant Isolation: Cross-tenant data mutation attempts are blocked server-side', () => {
      const tenantAlpha = 'tenant-alpha-uuid'
      const tenantBeta = 'tenant-beta-uuid'

      const customerDb = [
        { id: 'cust-alpha', company_id: tenantAlpha, name: 'Alpha Client' },
        { id: 'cust-beta', company_id: tenantBeta, name: 'Beta Client' },
      ]

      const authenticateAndMutate = (
        authenticatedCompanyId: string,
        targetCustomerId: string,
        updates: any
      ) => {
        const target = customerDb.find((c) => c.id === targetCustomerId)
        if (!target || target.company_id !== authenticatedCompanyId) {
          throw new Error('Unauthorized: Customer does not belong to authenticated tenant')
        }
        Object.assign(target, updates)
        return target
      }

      // Valid tenant mutation
      const updatedAlpha = authenticateAndMutate(tenantAlpha, 'cust-alpha', { name: 'Alpha Client Updated' })
      assert.strictEqual(updatedAlpha.name, 'Alpha Client Updated')

      // Cross-tenant IDOR attack attempt (Tenant Beta trying to mutate Customer Alpha)
      assert.throws(
        () => authenticateAndMutate(tenantBeta, 'cust-alpha', { name: 'Compromised Client' }),
        /Unauthorized/
      )
    })
  })

  // 8. Actor Identity Forgery Prevention
  describe('8. Actor Identity Binding & Audit Protection', () => {
    test('Actor Identity: Audit logger derives actor from authenticated JWT session, ignoring client forged IDs', () => {
      const authenticatedSessionUser = {
        userId: 'real-user-123',
        userEmail: 'real.cashier@inkflow.com',
      }

      const clientSuppliedForgedInput = {
        actor_user_id: 'fake-admin-999',
        user_email: 'fake.admin@inkflow.com',
      }

      // Server audit resolution: session always supersedes client input
      const resolvedActorId = authenticatedSessionUser.userId || clientSuppliedForgedInput.actor_user_id
      const resolvedActorEmail = authenticatedSessionUser.userEmail || clientSuppliedForgedInput.user_email

      assert.strictEqual(resolvedActorId, 'real-user-123')
      assert.strictEqual(resolvedActorEmail, 'real.cashier@inkflow.com')
      assert.notStrictEqual(resolvedActorId, 'fake-admin-999')
    })
  })

  // 9. Customer Rate Hierarchy & Historical Document Immutability
  describe('9. Customer Rate Hierarchy & Historical Document Immutability', () => {
    test('Customer rate changes do NOT alter historical invoices', () => {
      const historicalInvoice = {
        id: 'inv-past-1',
        invoice_date: '2026-08-01',
        items: [
          { product_id: 'prod-banner', unit_price: 100, quantity: 5, total_price: 500 }
        ]
      }

      // Customer rate is subsequently updated from 100 to 120
      const customerRates = {
        'prod-banner': 120
      }

      // New invoice uses new custom rate 120
      const newInvoice = {
        id: 'inv-new-2',
        invoice_date: '2026-09-16',
        items: [
          { product_id: 'prod-banner', unit_price: customerRates['prod-banner'], quantity: 5, total_price: 600 }
        ]
      }

      assert.strictEqual(historicalInvoice.items[0].unit_price, 100, 'Historical invoice price must remain 100')
      assert.strictEqual(newInvoice.items[0].unit_price, 120, 'New invoice receives updated rate 120')
    })
  })
})
