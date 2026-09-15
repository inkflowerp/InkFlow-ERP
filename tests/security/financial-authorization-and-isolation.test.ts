import { test, describe } from 'node:test'
import assert from 'node:assert'

// Types for security authorization model
interface SimulatedUserContext {
  userId: string
  userEmail: string
  fullName: string
  companyId: string
  companySlug: string
  companyRole: 'business_owner' | 'manager' | 'designer' | 'salesperson' | 'operator'
  primaryRole: string
  branchId?: string
  dataScope?: 'own' | 'assigned' | 'branch' | 'selected_branches' | 'all_branches' | 'company'
  allowedBranchIds?: string[]
  permissions: string[]
}

interface SimulatedInvoice {
  id: string
  company_id: string
  branch_id?: string
  invoice_number: string
  customer_id: string
  customer_name: string
  grand_total: number
  paid_amount: number
  due_amount: number
  write_off_amount: number
  status: 'unpaid' | 'partially_paid' | 'paid' | 'written_off' | 'cancelled'
  salesperson_id: string
}

interface SimulatedPayment {
  id: string
  company_id: string
  branch_id?: string
  receipt_number: string
  customer_id: string
  amount: number
  unallocated_amount: number
  idempotency_key?: string
  actor_user_id: string
  allocations: { invoice_id: string; amount: number }[]
}

interface SimulatedWriteOff {
  id: string
  company_id: string
  invoice_id: string
  amount: number
  reason: string
  actor_user_id: string
}

// Security Authorizer simulating InkFlow Server-Authoritative Pipeline
class FinancialSecurityAuthorizer {
  /**
   * Server-authoritative tenant resolution:
   * Rejects client-supplied companyId if it doesn't match authenticated session
   */
  static resolveAuthorizedTenant(
    userSession: SimulatedUserContext | null,
    clientSuppliedCompanyId?: string
  ): { authorized: boolean; companyId?: string; error?: string } {
    if (!userSession) {
      return { authorized: false, error: 'Unauthorized: No authenticated session.' }
    }

    if (clientSuppliedCompanyId && clientSuppliedCompanyId !== userSession.companyId) {
      // Rejects forged companyId passed from browser
      return { authorized: false, error: 'Unauthorized: Cross-tenant access forbidden.' }
    }

    return { authorized: true, companyId: userSession.companyId }
  }

  /**
   * Authorizes invoice lookup:
   * Enforces company ownership and branch/data scope
   */
  static authorizeInvoiceRead(
    user: SimulatedUserContext,
    invoice: SimulatedInvoice
  ): { allowed: boolean; error?: string } {
    if (invoice.company_id !== user.companyId) {
      return { allowed: false, error: 'Access Denied: Invoice belongs to another tenant.' }
    }

    if (user.companyRole !== 'business_owner') {
      const scope = user.dataScope || 'branch'
      if (scope === 'own' && invoice.salesperson_id !== user.userId) {
        return { allowed: false, error: 'Access Denied: User only has access to own invoices.' }
      }
      if (scope === 'branch' && invoice.branch_id && invoice.branch_id !== user.branchId) {
        return { allowed: false, error: 'Access Denied: Invoice belongs to another branch.' }
      }
      if (scope === 'selected_branches' && invoice.branch_id && !user.allowedBranchIds?.includes(invoice.branch_id)) {
        return { allowed: false, error: 'Access Denied: Invoice branch not in authorized branches.' }
      }
    }

    return { allowed: true }
  }

  /**
   * Authorizes payment recording & allocation:
   * Enforces tenant ownership across all target invoices and idempotency boundary
   */
  static authorizePaymentAllocation(
    user: SimulatedUserContext,
    paymentInput: {
      customerId: string
      amount: number
      allocations: { invoiceId: string; amount: number }[]
      idempotencyKey?: string
      clientSuppliedActorId?: string
    },
    invoicesDb: Map<string, SimulatedInvoice>,
    existingPayments: SimulatedPayment[]
  ): { allowed: boolean; effectiveActorId: string; error?: string } {
    // 1. Permission check
    const canPay =
      user.companyRole === 'business_owner' ||
      user.permissions.includes('payment.create') ||
      user.permissions.includes('payments.create') ||
      user.permissions.includes('billing.create')

    if (!canPay) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Unauthorized: Missing payment recording permission.' }
    }

    // 2. Validate all invoice allocations belong strictly to user's company
    for (const alloc of paymentInput.allocations) {
      const inv = invoicesDb.get(alloc.invoiceId)
      if (!inv) {
        return { allowed: false, effectiveActorId: user.userId, error: `Invoice ${alloc.invoiceId} not found.` }
      }
      if (inv.company_id !== user.companyId) {
        return { allowed: false, effectiveActorId: user.userId, error: 'Security Violation: Cannot allocate payment to another tenant invoice.' }
      }
      if (inv.status === 'cancelled') {
        return { allowed: false, effectiveActorId: user.userId, error: 'Cannot allocate payment to cancelled invoice.' }
      }
    }

    // 3. Authoritative actor identity resolution (clientSuppliedActorId is IGNORED)
    const effectiveActorId = user.userId

    // 4. Idempotency Check (strictly scoped to companyId + idempotencyKey)
    if (paymentInput.idempotencyKey) {
      const replay = existingPayments.find(
        (p) => p.company_id === user.companyId && p.idempotency_key === paymentInput.idempotencyKey
      )
      if (replay) {
        return { allowed: true, effectiveActorId, error: 'IDEMPOTENT_REPLAY' }
      }
    }

    return { allowed: true, effectiveActorId }
  }

  /**
   * Authorizes write-off:
   * Validates tenant ownership, permission, and amount bounds
   */
  static authorizeWriteOff(
    user: SimulatedUserContext,
    invoice: SimulatedInvoice,
    amount: number,
    reason: string
  ): { allowed: boolean; effectiveActorId: string; error?: string } {
    if (invoice.company_id !== user.companyId) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Security Violation: Cannot write off another tenant invoice.' }
    }

    const canWriteOff =
      user.companyRole === 'business_owner' ||
      user.permissions.includes('finance.writeoff') ||
      user.permissions.includes('invoices.edit') ||
      user.permissions.includes('billing.edit')

    if (!canWriteOff) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Unauthorized: Missing write-off permission.' }
    }

    if (amount <= 0 || amount > invoice.due_amount) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Invalid write-off amount.' }
    }

    if (!reason || !reason.trim()) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Business reason required for write-off.' }
    }

    return { allowed: true, effectiveActorId: user.userId }
  }

  /**
   * Authorizes invoice cancellation:
   * Validates company ownership, state machine rules, and actor identity
   */
  static authorizeCancellation(
    user: SimulatedUserContext,
    invoice: SimulatedInvoice,
    reason: string
  ): { allowed: boolean; effectiveActorId: string; error?: string } {
    if (invoice.company_id !== user.companyId) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Security Violation: Cannot cancel another tenant invoice.' }
    }

    const canCancel =
      user.companyRole === 'business_owner' ||
      user.permissions.includes('invoices.cancel') ||
      user.permissions.includes('invoices.delete') ||
      user.permissions.includes('billing.edit')

    if (!canCancel) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Unauthorized: Missing invoice cancellation permission.' }
    }

    if (invoice.status === 'cancelled') {
      return { allowed: false, effectiveActorId: user.userId, error: 'Invoice is already cancelled.' }
    }

    if (invoice.status === 'paid' || invoice.paid_amount > 0) {
      return { allowed: false, effectiveActorId: user.userId, error: 'Cannot cancel invoice with recorded payments.' }
    }

    return { allowed: true, effectiveActorId: user.userId }
  }
}

// ==========================================
// TEST SUITE: FINANCIAL AUTHORIZATION & ISOLATION
// ==========================================

describe('InkFlow ERP — Financial Authorization, Admin Client & Tenant Isolation Forensic Tests', () => {
  // Setup simulated tenants and users
  const tenantA: { id: string; slug: string } = { id: 'company-a-uuid', slug: 'tenant-a' }
  const tenantB: { id: string; slug: string } = { id: 'company-b-uuid', slug: 'tenant-b' }

  const userA_Owner: SimulatedUserContext = {
    userId: 'user-a-owner-uuid',
    userEmail: 'owner@tenant-a.com',
    fullName: 'Tenant A Owner',
    companyId: tenantA.id,
    companySlug: tenantA.slug,
    companyRole: 'business_owner',
    primaryRole: 'business_owner',
    permissions: ['*'],
  }

  const userA_Salesperson: SimulatedUserContext = {
    userId: 'user-a-sales-uuid',
    userEmail: 'sales@tenant-a.com',
    fullName: 'Tenant A Salesperson',
    companyId: tenantA.id,
    companySlug: tenantA.slug,
    companyRole: 'salesperson',
    primaryRole: 'salesperson',
    branchId: 'branch-a1-uuid',
    dataScope: 'own',
    permissions: ['invoices.view', 'invoices.create', 'payment.create'],
  }

  const userA_BranchManager: SimulatedUserContext = {
    userId: 'user-a-mgr-uuid',
    userEmail: 'mgr@tenant-a.com',
    fullName: 'Tenant A Branch Manager',
    companyId: tenantA.id,
    companySlug: tenantA.slug,
    companyRole: 'manager',
    primaryRole: 'manager',
    branchId: 'branch-a1-uuid',
    dataScope: 'branch',
    permissions: ['invoices.view', 'invoices.create', 'invoices.edit', 'invoices.cancel', 'finance.writeoff', 'payment.create'],
  }

  const userB_Owner: SimulatedUserContext = {
    userId: 'user-b-owner-uuid',
    userEmail: 'owner@tenant-b.com',
    fullName: 'Tenant B Owner',
    companyId: tenantB.id,
    companySlug: tenantB.slug,
    companyRole: 'business_owner',
    primaryRole: 'business_owner',
    permissions: ['*'],
  }

  const invoiceA1: SimulatedInvoice = {
    id: 'inv-a1-uuid',
    company_id: tenantA.id,
    branch_id: 'branch-a1-uuid',
    invoice_number: 'INV-2026-0001',
    customer_id: 'cust-a1-uuid',
    customer_name: 'Customer A1',
    grand_total: 50000,
    paid_amount: 10000,
    due_amount: 40000,
    write_off_amount: 0,
    status: 'partially_paid',
    salesperson_id: userA_Salesperson.userId,
  }

  const invoiceA2_Branch2: SimulatedInvoice = {
    id: 'inv-a2-uuid',
    company_id: tenantA.id,
    branch_id: 'branch-a2-uuid',
    invoice_number: 'INV-2026-0002',
    customer_id: 'cust-a2-uuid',
    customer_name: 'Customer A2',
    grand_total: 30000,
    paid_amount: 0,
    due_amount: 30000,
    write_off_amount: 0,
    status: 'unpaid',
    salesperson_id: 'other-sales-uuid',
  }

  const invoiceB1: SimulatedInvoice = {
    id: 'inv-b1-uuid',
    company_id: tenantB.id,
    branch_id: 'branch-b1-uuid',
    invoice_number: 'INV-2026-9001',
    customer_id: 'cust-b1-uuid',
    customer_name: 'Customer B1',
    grand_total: 100000,
    paid_amount: 0,
    due_amount: 100000,
    write_off_amount: 0,
    status: 'unpaid',
    salesperson_id: 'sales-b-uuid',
  }

  const invoicesDb = new Map<string, SimulatedInvoice>([
    [invoiceA1.id, invoiceA1],
    [invoiceA2_Branch2.id, invoiceA2_Branch2],
    [invoiceB1.id, invoiceB1],
  ])

  // 1. CROSS-TENANT READ ISOLATION
  test('1. Cross-Tenant Read: User A cannot read Tenant B invoice', () => {
    const res = FinancialSecurityAuthorizer.authorizeInvoiceRead(userA_Owner, invoiceB1)
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Invoice belongs to another tenant'))
  })

  // 2. FORGED COMPANY_ID REJECTION
  test('2. Forged Company ID: Server action rejects client-supplied companyId mismatch', () => {
    // User A passes Tenant B's companyId in request parameter
    const res = FinancialSecurityAuthorizer.resolveAuthorizedTenant(userA_Owner, tenantB.id)
    assert.strictEqual(res.authorized, false)
    assert.ok(res.error?.includes('Cross-tenant access forbidden'))
  })

  // 3. UNAUTHENTICATED CALL REJECTION (FAIL CLOSED)
  test('3. Unauthenticated Fail Closed: Null session immediately rejected', () => {
    const res = FinancialSecurityAuthorizer.resolveAuthorizedTenant(null, tenantA.id)
    assert.strictEqual(res.authorized, false)
    assert.ok(res.error?.includes('No authenticated session'))
  })

  // 4. CROSS-TENANT PAYMENT MUTATION REJECTION
  test('4. Cross-Tenant Payment: User A cannot record payment against Tenant B invoice', () => {
    const res = FinancialSecurityAuthorizer.authorizePaymentAllocation(
      userA_Owner,
      {
        customerId: 'cust-b1-uuid',
        amount: 25000,
        allocations: [{ invoiceId: invoiceB1.id, amount: 25000 }],
        idempotencyKey: 'idem-test-1',
      },
      invoicesDb,
      []
    )
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Cannot allocate payment to another tenant invoice'))
  })

  // 5. CROSS-TENANT WRITE-OFF REJECTION
  test('5. Cross-Tenant Write-Off: User A cannot write off Tenant B invoice', () => {
    const res = FinancialSecurityAuthorizer.authorizeWriteOff(
      userA_Owner,
      invoiceB1,
      10000,
      'Unauthorized waiver attempt'
    )
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Cannot write off another tenant invoice'))
  })

  // 6. CROSS-TENANT CANCELLATION REJECTION
  test('6. Cross-Tenant Cancellation: User A cannot cancel Tenant B invoice', () => {
    const res = FinancialSecurityAuthorizer.authorizeCancellation(
      userA_Owner,
      invoiceB1,
      'Unauthorized cancel attempt'
    )
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Cannot cancel another tenant invoice'))
  })

  // 7. ACTOR SPOOFING PREVENTION
  test('7. Actor Spoofing Prevention: Effective actor is always derived from authenticated session', () => {
    const spoofedActorId = 'victim-user-uuid'
    const res = FinancialSecurityAuthorizer.authorizePaymentAllocation(
      userA_Owner,
      {
        customerId: 'cust-a1-uuid',
        amount: 5000,
        allocations: [{ invoiceId: invoiceA1.id, amount: 5000 }],
        clientSuppliedActorId: spoofedActorId,
      },
      invoicesDb,
      []
    )
    assert.strictEqual(res.allowed, true)
    // Absolute rule: effective actor must match userA_Owner.userId, NOT the spoofed parameter
    assert.strictEqual(res.effectiveActorId, userA_Owner.userId)
    assert.notStrictEqual(res.effectiveActorId, spoofedActorId)
  })

  // 8. IDEMPOTENCY KEY SCOPED STRICTLY TO TENANT
  test('8. Idempotency Tenant Scoping: Identical key in Tenant A does not collide with Tenant B', () => {
    const existingPayments: SimulatedPayment[] = [
      {
        id: 'pay-a1-uuid',
        company_id: tenantA.id,
        receipt_number: 'REC-001',
        customer_id: 'cust-a1-uuid',
        amount: 10000,
        unallocated_amount: 0,
        idempotency_key: 'idem-shared-123',
        actor_user_id: userA_Owner.userId,
        allocations: [],
      },
    ]

    // 1. User A replaying same key gets idempotent replay
    const resA = FinancialSecurityAuthorizer.authorizePaymentAllocation(
      userA_Owner,
      {
        customerId: 'cust-a1-uuid',
        amount: 10000,
        allocations: [],
        idempotencyKey: 'idem-shared-123',
      },
      invoicesDb,
      existingPayments
    )
    assert.strictEqual(resA.allowed, true)
    assert.strictEqual(resA.error, 'IDEMPOTENT_REPLAY')

    // 2. User B using same key string is NOT replayed and proceeds cleanly for Tenant B
    const resB = FinancialSecurityAuthorizer.authorizePaymentAllocation(
      userB_Owner,
      {
        customerId: 'cust-b1-uuid',
        amount: 20000,
        allocations: [{ invoiceId: invoiceB1.id, amount: 20000 }],
        idempotencyKey: 'idem-shared-123',
      },
      invoicesDb,
      existingPayments
    )
    assert.strictEqual(resB.allowed, true)
    assert.strictEqual(resB.error, undefined) // Not treated as replay for Tenant B!
  })

  // 9. DATA SCOPE ENFORCEMENT (OWN VS OTHER SALESPERSON)
  test('9. Data Scope "Own": Salesperson cannot read invoices created by other staff', () => {
    // invoiceA2 was created by other-sales-uuid
    const res = FinancialSecurityAuthorizer.authorizeInvoiceRead(userA_Salesperson, invoiceA2_Branch2)
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('User only has access to own invoices'))
  })

  // 10. BRANCH ISOLATION ENFORCEMENT
  test('10. Branch Isolation: Branch Manager of Branch 1 cannot access Branch 2 invoice', () => {
    // invoiceA2 is in branch-a2-uuid, while manager is in branch-a1-uuid
    const res = FinancialSecurityAuthorizer.authorizeInvoiceRead(userA_BranchManager, invoiceA2_Branch2)
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Invoice belongs to another branch'))
  })

  // 11. CANCELLATION STATE MACHINE
  test('11. Cancellation State Machine: Cannot cancel invoice with recorded payments', () => {
    // invoiceA1 has paid_amount = 10000
    const res = FinancialSecurityAuthorizer.authorizeCancellation(
      userA_Owner,
      invoiceA1,
      'Attempt cancel paid invoice'
    )
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Cannot cancel invoice with recorded payments'))
  })

  // 12. WRITE-OFF AMOUNT BOUNDARY
  test('12. Write-Off Bounds: Cannot write off more than outstanding due', () => {
    // invoiceA1 due_amount = 40000
    const res = FinancialSecurityAuthorizer.authorizeWriteOff(
      userA_Owner,
      invoiceA1,
      50000, // Exceeds due balance
      'Excessive write off'
    )
    assert.strictEqual(res.allowed, false)
    assert.ok(res.error?.includes('Invalid write-off amount'))
  })
})
