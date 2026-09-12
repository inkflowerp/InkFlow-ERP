// ==============================================================================
// InkFlow SaaS - Enterprise Audit Logging Service
// Authoritative Supabase Database Audit Trail & Metadata
// ==============================================================================

import { AuditRepository } from '../lib/repositories/audit.repository.ts'
import { AUDIT_ACTIONS } from '../types/audit.types.ts'
import type {
  AuditLogEntry,
  AuditActionCode,
  AuditEntityDomain,
  DeviceMetadata,
} from '../types/audit.types.ts'
import type { ApiResponse } from '../types/common.types.ts'

export class AuditService {
  /**
   * Universal audit logger: captures action, diff, timestamp, and device metadata via Supabase
   */
  static async logEvent(
    companyId: string,
    userId: string | null,
    userEmail: string | null,
    action: AuditActionCode | string,
    entity: AuditEntityDomain | string,
    entityId: string | null,
    previousValue: Record<string, any> | null = null,
    newValue: Record<string, any> | null = null,
    description?: string,
    deviceMetadata?: DeviceMetadata | null
  ): Promise<AuditLogEntry> {
    if (!companyId) {
      console.warn('[AuditService] Skipping logEvent without companyId')
      return {} as AuditLogEntry
    }

    return await AuditRepository.logEvent({
      companyId,
      userId,
      userEmail,
      action,
      entity,
      entityId,
      previousValue,
      newValue,
      description,
      ipAddress: null, // Do not fabricate fake IP addresses
      deviceMetadata: deviceMetadata || null,
    })
  }

  // 1. Auth: Login
  static async trackLogin(
    companyId: string,
    userId: string,
    userEmail: string,
    meta?: DeviceMetadata
  ) {
    return this.logEvent(
      companyId,
      userId,
      userEmail,
      AUDIT_ACTIONS.AUTH_LOGIN,
      'auth',
      userId,
      null,
      { session_state: 'authenticated' },
      `User ${userEmail} logged in`,
      meta
    )
  }

  // 2. Auth: Logout
  static async trackLogout(
    companyId: string,
    userId: string,
    userEmail: string,
    meta?: DeviceMetadata
  ) {
    return this.logEvent(
      companyId,
      userId,
      userEmail,
      AUDIT_ACTIONS.AUTH_LOGOUT,
      'auth',
      userId,
      { session_state: 'authenticated' },
      { session_state: 'terminated' },
      `User ${userEmail} logged out`,
      meta
    )
  }

  // 3. User Creation
  static async trackUserCreation(
    companyId: string,
    actorId: string,
    actorEmail: string,
    newUser: Record<string, any>
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.USER_CREATE,
      'user',
      newUser.id,
      null,
      newUser,
      `Created new user: ${newUser.email} (${newUser.role})`
    )
  }

  // 4. Permission Change
  static async trackPermissionChange(
    companyId: string,
    actorId: string,
    actorEmail: string,
    targetUserId: string,
    prevPerms: Record<string, any>,
    newPerms: Record<string, any>
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.PERMISSION_CHANGE,
      'user',
      targetUserId,
      prevPerms,
      newPerms,
      `Modified permissions for user ${targetUserId}`
    )
  }

  // 5. Customer Edit
  static async trackCustomerEdit(
    companyId: string,
    actorId: string,
    actorEmail: string,
    customerId: string,
    prevCustomer: Record<string, any>,
    newCustomer: Record<string, any>
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.CUSTOMER_EDIT,
      'customer',
      customerId,
      prevCustomer,
      newCustomer,
      `Updated customer profile: ${newCustomer.name || customerId}`
    )
  }

  // 6. Quotation Edit
  static async trackQuotationEdit(
    companyId: string,
    actorId: string,
    actorEmail: string,
    quotationId: string,
    prevQuote: Record<string, any>,
    newQuote: Record<string, any>
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.QUOTATION_EDIT,
      'quotation',
      quotationId,
      prevQuote,
      newQuote,
      `Edited quotation ${quotationId} details`
    )
  }

  // 7. Price Override
  static async trackPriceOverride(
    companyId: string,
    actorId: string,
    actorEmail: string,
    referenceId: string,
    standardPrice: number,
    approvedPrice: number,
    reason: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.PRICE_OVERRIDE,
      'quotation',
      referenceId,
      { standard_price: standardPrice },
      { approved_price: approvedPrice, discount_bdt: standardPrice - approvedPrice, reason },
      `Authorized price override: ৳${standardPrice} ➔ ৳${approvedPrice} (${reason})`
    )
  }

  // 8. Order Cancellation
  static async trackOrderCancel(
    companyId: string,
    actorId: string,
    actorEmail: string,
    orderId: string,
    reason: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.ORDER_CANCEL,
      'order',
      orderId,
      { status: 'active' },
      { status: 'cancelled', reason },
      `Cancelled Job Order ${orderId}: ${reason}`
    )
  }

  // 9. Invoice Creation
  static async trackInvoiceCreate(
    companyId: string,
    actorId: string,
    actorEmail: string,
    invoiceId: string,
    invoiceNumber: string,
    amount: number,
    customer: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.INVOICE_CREATE,
      'invoice',
      invoiceId,
      null,
      { invoice_number: invoiceNumber, amount, customer },
      `Generated Invoice ${invoiceNumber} for ৳${amount.toLocaleString()}`
    )
  }

  // 10. Payment Record
  static async trackPayment(
    companyId: string,
    actorId: string,
    actorEmail: string,
    paymentId: string,
    receiptNumber: string,
    amount: number,
    method: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.PAYMENT_RECORD,
      'payment',
      paymentId,
      null,
      { receipt_number: receiptNumber, amount, method },
      `Recorded payment of ৳${amount.toLocaleString()} via ${method.toUpperCase()} (MR: ${receiptNumber})`
    )
  }

  // 11. Expense Record
  static async trackExpense(
    companyId: string,
    actorId: string,
    actorEmail: string,
    expenseId: string,
    category: string,
    amount: number,
    purpose: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.EXPENSE_RECORD,
      'expense',
      expenseId,
      null,
      { category, amount, purpose },
      `Recorded expense of ৳${amount.toLocaleString()} for ${purpose}`
    )
  }

  // 12. Inventory Adjustment
  static async trackInventoryAdjustment(
    companyId: string,
    actorId: string,
    actorEmail: string,
    materialId: string,
    prevStock: number,
    newStock: number,
    reason: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.INVENTORY_ADJUSTMENT,
      'inventory',
      materialId,
      { current_stock: prevStock },
      { current_stock: newStock, change: newStock - prevStock, reason },
      `Inventory adjustment on ${materialId}: ${prevStock} ➔ ${newStock} (${reason})`
    )
  }

  // 13. Payroll Approval
  static async trackPayrollApproval(
    companyId: string,
    actorId: string,
    actorEmail: string,
    month: string,
    totalPayout: number,
    employeeCount: number
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.PAYROLL_APPROVE,
      'payroll',
      month,
      { status: 'draft' },
      { status: 'approved', month, total_payout: totalPayout, employee_count: employeeCount },
      `Approved payroll for ${month}: ৳${totalPayout.toLocaleString()} across ${employeeCount} employees`
    )
  }

  // 14. Settings Change
  static async trackSettingsChange(
    companyId: string,
    actorId: string,
    actorEmail: string,
    settingKey: string,
    prevSettings: Record<string, any>,
    newSettings: Record<string, any>
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.SETTINGS_CHANGE,
      'settings',
      settingKey,
      prevSettings,
      newSettings,
      `Updated company settings: ${settingKey}`
    )
  }

  // 15. Subscription Change
  static async trackSubscriptionChange(
    companyId: string,
    actorId: string,
    actorEmail: string,
    oldPlan: string,
    newPlan: string,
    billingInterval: string
  ) {
    return this.logEvent(
      companyId,
      actorId,
      actorEmail,
      AUDIT_ACTIONS.SUBSCRIPTION_CHANGE,
      'subscription',
      companyId,
      { plan: oldPlan },
      { plan: newPlan, billing_interval: billingInterval },
      `Subscription changed from ${oldPlan.toUpperCase()} to ${newPlan.toUpperCase()} (${billingInterval})`
    )
  }

  // 16. Auth: Registration Initiated & Verification Email Sent
  static async trackAuthVerificationSent(
    email: string,
    purpose: string,
    userId?: string | null,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      userId || null,
      email,
      AUDIT_ACTIONS.AUTH_VERIFY_REQUEST,
      'auth',
      userId || null,
      null,
      { purpose },
      `Verification email dispatched for ${email} (${purpose})`
    )
  }

  // 17. Auth: Verification Success
  static async trackAuthVerificationSuccess(
    email: string,
    purpose: string,
    userId?: string | null,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      userId || null,
      email,
      AUDIT_ACTIONS.AUTH_VERIFY_SUCCESS,
      'auth',
      userId || null,
      { status: 'unverified' },
      { status: 'verified', purpose },
      `Successfully verified ${purpose} for ${email}`
    )
  }

  // 18. Auth: Verification Failure / Lockout
  static async trackAuthVerificationFailure(
    email: string,
    purpose: string,
    reason: string,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      null,
      email,
      AUDIT_ACTIONS.AUTH_VERIFY_FAILURE,
      'auth',
      null,
      null,
      { purpose, reason },
      `Failed verification for ${email} (${purpose}): ${reason}`
    )
  }

  // 19. Auth: Password Reset Requested
  static async trackPasswordResetRequested(
    email: string,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      null,
      email,
      AUDIT_ACTIONS.AUTH_PASSWORD_RESET_REQUEST,
      'auth',
      null,
      null,
      { event: 'password_reset_requested' },
      `Password reset instructions requested for ${email}`
    )
  }

  // 20. Auth: Password Reset Verified
  static async trackPasswordResetVerified(
    email: string,
    userId?: string | null,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      userId || null,
      email,
      AUDIT_ACTIONS.AUTH_PASSWORD_RESET_SUCCESS,
      'auth',
      userId || null,
      null,
      { event: 'password_reset_token_issued' },
      `Password reset authorization issued for ${email}`
    )
  }

  // 21. Auth: Password Changed
  static async trackPasswordChanged(
    email: string,
    userId?: string | null,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      userId || null,
      email,
      AUDIT_ACTIONS.AUTH_PASSWORD_CHANGE,
      'auth',
      userId || null,
      null,
      { status: 'password_updated' },
      `Password successfully changed for ${email}`
    )
  }

  // 22. Auth: Excessive Failed Attempts Lockout
  static async trackAuthLockout(
    email: string,
    purpose: string,
    companyId: string = 'platform'
  ) {
    return this.logEvent(
      companyId,
      null,
      email,
      AUDIT_ACTIONS.AUTH_LOCKOUT,
      'auth',
      null,
      null,
      { purpose, status: 'locked_out' },
      `Account verification locked out due to excessive failed attempts for ${email} (${purpose})`
    )
  }

  /**
   * Fetch audit logs for a company from Supabase
   */
  static async getAuditLogs(
    companyId: string,
    query?: string,
    action?: string,
    entity?: string
  ): Promise<ApiResponse<AuditLogEntry[]>> {
    try {
      if (!companyId) {
        return { success: false, error: 'Company ID is required' }
      }
      let logs = await AuditRepository.getLogs(companyId, {
        action: action && action !== 'all' ? action : undefined,
        entity: entity && entity !== 'all' ? entity : undefined,
      })

      if (query && query.trim()) {
        const q = query.toLowerCase().trim()
        logs = logs.filter(
          (l) =>
            l.action.toLowerCase().includes(q) ||
            l.entity.toLowerCase().includes(q) ||
            (l.user_email && l.user_email.toLowerCase().includes(q)) ||
            (l.description && l.description.toLowerCase().includes(q)) ||
            (l.entity_id && l.entity_id.toLowerCase().includes(q))
        )
      }

      return { success: true, data: logs }
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to fetch audit logs' }
    }
  }
}

