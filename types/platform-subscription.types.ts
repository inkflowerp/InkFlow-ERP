// ==============================================================================
// InkFlow / PrintERP SaaS - Platform Owner Subscription & Billing Types
// Strict architectural separation from Tenant billing models.
// ==============================================================================

export type PlatformSubscriptionStatus =
  | 'TRIALING'
  | 'PENDING_PAYMENT'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'GRACE_PERIOD'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'SUSPENDED'

export type PlatformBillingCycle = 'monthly' | 'yearly'

export type PlatformFeatureCode =
  | 'multi_tenant'
  | 'basic_analytics'
  | 'advanced_analytics'
  | 'automated_backups'
  | 'email_gateway'
  | 'sms_gateway'
  | 'whatsapp_gateway'
  | 'telegram_bot'
  | 'custom_domains'
  | 'api_gateway'
  | 'audit_ledger'
  | 'white_label'
  | 'priority_sla_99_9'
  | 'dedicated_compute'
  | 'custom_billing_rules'
  | 'dedicated_database'
  | 'source_escrow'
  | 'vip_support_24_7'

export interface PlatformSaasPlanRecord {
  id: string
  name: string
  slug: string
  description?: string | null
  monthly_price: number
  yearly_price: number
  currency: string
  trial_days: number
  features: string[]
  limits: {
    max_tenants?: number
    max_total_users?: number
    storage_gb?: number
    monthly_api_calls?: number
    [key: string]: number | undefined
  }
  is_active: boolean
  is_public: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface PlatformSubscriptionRecord {
  id: string
  platform_account_id: string
  plan_id: string
  plan?: PlatformSaasPlanRecord | null
  status: PlatformSubscriptionStatus
  billing_cycle: PlatformBillingCycle
  started_at: string
  current_period_start: string
  current_period_end: string
  trial_start?: string | null
  trial_end?: string | null
  grace_period_end?: string | null
  cancelled_at?: string | null
  cancel_at_period_end: boolean
  previous_plan_id?: string | null
  next_plan_id?: string | null
  next_plan?: PlatformSaasPlanRecord | null
  change_effective_at?: string | null
  provider?: string | null
  provider_customer_id?: string | null
  provider_subscription_id?: string | null
  metadata?: Record<string, any>
  created_at?: string
  updated_at?: string
}

export interface PlatformBillingTransactionRecord {
  id: string
  billing_context: 'PLATFORM'
  platform_account_id: string
  subscription_id?: string | null
  plan_id?: string | null
  plan?: PlatformSaasPlanRecord | null
  invoice_id?: string | null
  gateway_integration_id?: string | null
  provider: string
  transaction_type: 'SUBSCRIPTION_PURCHASE' | 'PLAN_UPGRADE' | 'PLAN_DOWNGRADE' | 'SUBSCRIPTION_RENEWAL' | 'REFUND'
  amount: number
  currency: string
  internal_trx_id: string
  provider_trx_id?: string | null
  payment_status: 'initiated' | 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded' | 'expired'
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  payment_url?: string | null
  failure_reason?: string | null
  callback_payload?: Record<string, any> | null
  webhook_payload?: Record<string, any> | null
  verification_payload?: Record<string, any> | null
  initiated_at: string
  completed_at?: string | null
  created_at: string
  updated_at: string
}

export interface PlatformSubscriptionEventRecord {
  id: string
  subscription_id: string
  platform_account_id: string
  event_type:
    | 'TRIAL_STARTED'
    | 'TRIAL_EXTENDED'
    | 'SUBSCRIPTION_CREATED'
    | 'PLAN_UPGRADED'
    | 'PLAN_DOWNGRADED'
    | 'RENEWED'
    | 'PAYMENT_PENDING'
    | 'PAYMENT_VERIFIED'
    | 'PAYMENT_FAILED'
    | 'CANCELLED'
    | 'REACTIVATED'
    | 'EXPIRED'
    | 'SUSPENDED'
    | 'REFUND_REQUESTED'
    | 'REFUND_COMPLETED'
  previous_plan_id?: string | null
  new_plan_id?: string | null
  previous_status?: string | null
  new_status?: string | null
  reason?: string | null
  transaction_id?: string | null
  performed_by?: string | null
  effective_date?: string | null
  metadata?: Record<string, any>
  created_at: string
}

export interface PlatformWebhookEventRecord {
  id: string
  provider: string
  event_id?: string | null
  event_type: string
  transaction_id?: string | null
  billing_context: 'PLATFORM'
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  processed: boolean
  processed_at?: string | null
  failure_reason?: string | null
  payload: Record<string, any>
  created_at: string
}

export interface PlatformEntitlementSummary {
  platform_account_id: string
  plan_slug: string
  plan_name: string
  status: PlatformSubscriptionStatus
  billing_cycle: PlatformBillingCycle
  current_period_end: string
  days_remaining: number
  is_trial: boolean
  is_past_due: boolean
  is_expired: boolean
  features: string[]
  limits: {
    max_tenants: number
    max_total_users: number
    storage_gb: number
    monthly_api_calls: number
  }
  usage: {
    tenants_count: number
    users_count: number
    storage_gb: number
    api_calls_this_month: number
  }
}

export interface PlatformReconciliationItem {
  internal_trx_id: string
  provider_trx_id?: string | null
  provider: string
  billing_context: 'PLATFORM'
  plan_name: string
  expected_amount: number
  paid_amount: number
  currency: string
  payment_status: string
  verification_status: 'UNVERIFIED' | 'VERIFIED' | 'REJECTED'
  subscription_status: PlatformSubscriptionStatus
  created_at: string
  is_mismatched: boolean
  mismatch_reason?: string | null
}
