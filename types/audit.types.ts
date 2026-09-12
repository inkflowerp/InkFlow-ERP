// ==============================================================================
// PrintERP SaaS - Phase 22: Security, Audit and Data Integrity Types
// ==============================================================================

/**
 * 15 Required Audit Event Action Codes
 */
export const AUDIT_ACTIONS = {
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  USER_CREATE: 'user.create',
  PERMISSION_CHANGE: 'permission.change',
  CUSTOMER_EDIT: 'customer.edit',
  QUOTATION_EDIT: 'quotation.edit',
  PRICE_OVERRIDE: 'pricing.price_override',
  ORDER_CANCEL: 'order.cancel',
  INVOICE_CREATE: 'invoice.create',
  PAYMENT_RECORD: 'payment.record',
  EXPENSE_RECORD: 'expense.record',
  INVENTORY_ADJUSTMENT: 'inventory.adjustment',
  PAYROLL_APPROVE: 'payroll.approve',
  SETTINGS_CHANGE: 'settings.change',
  SUBSCRIPTION_CHANGE: 'subscription.change',
  AUTH_VERIFY_REQUEST: 'auth.verify_request',
  AUTH_VERIFY_SUCCESS: 'auth.verify_success',
  AUTH_VERIFY_FAILURE: 'auth.verify_failure',
  AUTH_PASSWORD_RESET_REQUEST: 'auth.password_reset_request',
  AUTH_PASSWORD_RESET_SUCCESS: 'auth.password_reset_success',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_LOCKOUT: 'auth.lockout',
} as const

export type AuditActionCode = typeof AUDIT_ACTIONS[keyof typeof AUDIT_ACTIONS]

export type AuditEntityDomain =
  | 'auth'
  | 'user'
  | 'customer'
  | 'quotation'
  | 'order'
  | 'invoice'
  | 'payment'
  | 'expense'
  | 'inventory'
  | 'payroll'
  | 'settings'
  | 'subscription'

export interface DeviceMetadata {
  browser?: string
  os?: string
  device_type?: 'desktop' | 'mobile' | 'tablet' | 'bot'
  user_agent?: string
  session_id?: string
  geo_city?: string
  geo_country?: string
}

export interface AuditLogEntry {
  id: string
  company_id: string
  user_id?: string | null
  user_email?: string | null
  action: AuditActionCode | string
  entity: AuditEntityDomain | string
  entity_id?: string | null
  previous_value?: Record<string, any> | null
  new_value?: Record<string, any> | null
  timestamp: string
  ip_address?: string | null
  device_metadata?: DeviceMetadata | null
  description?: string
}

/**
 * Financial Anti-Deletion Integrity Types
 */
export type FinancialIntegrityMode = 'void' | 'cancel' | 'reverse' | 'adjust'

export interface PaymentAdjustmentRecord {
  id: string
  company_id: string
  payment_id: string
  receipt_number: string
  type: 'reversal' | 'adjustment'
  original_amount: number
  adjusted_amount: number
  difference_amount: number
  reason: string
  authorized_by_id?: string | null
  authorized_by_name: string
  created_at: string
}

export interface FinancialActionInput {
  company_id: string
  entity_id: string
  action_type: FinancialIntegrityMode
  reason: string
  authorized_by_name: string
  adjust_amount?: number
  metadata?: Record<string, any>
}
