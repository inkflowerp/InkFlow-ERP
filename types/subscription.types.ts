// ==============================================================================
// InkFlow ERP SaaS - Subscription 360 Canonical Domain Types
// Fully typed models for Plans, Versioning, Feature Catalog, Entitlements,
// State Machine, SaaS Invoices, Usage Metering, and Revenue Analytics.
// ==============================================================================

export const UNLIMITED_LIMIT = -1

export function isUnlimited(val?: number | null): boolean {
  if (val === undefined || val === null) return false
  return val <= 0 || val >= 99999 || val === UNLIMITED_LIMIT
}

export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'

export type PlanCode = 'trial' | 'starter' | 'business' | 'enterprise'

export type SubscriptionStatus =
  | 'trial'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired'

export interface TenantAccountTypeMeta {
  type: TenantAccountType
  nameEn: string
  nameBn: string
  badgeTextEn: string
  badgeTextBn: string
  color: string
  badgeClass: string
  priceMonthly: number
  priceYearly: number
  maxUsers: number
  maxBranches: number
  descriptionEn: string
  descriptionBn: string
}

export function resolveTenantAccountType(
  subscription?: { status?: SubscriptionStatus | string; plan_code?: PlanCode | string } | null
): TenantAccountType {
  if (!subscription) return 'trial'
  if (subscription.status === 'trial' || subscription.status === 'trialing' || subscription.plan_code === 'trial') return 'trial'
  if (subscription.plan_code === 'enterprise') return 'enterprise'
  if (subscription.plan_code === 'business') return 'business'
  if (subscription.plan_code === 'starter') return 'starter'
  return 'starter'
}

export interface ResolvedSubscriptionState {
  planCode: PlanCode
  planName: string
  planNameBn: string
  status: SubscriptionStatus
  badgeTextEn: string
  badgeTextBn: string
  isTrial: boolean
  isSuspended: boolean
  isPastDue: boolean
  isGracePeriod: boolean
}

export function resolveSubscriptionPlan(
  subscription?: {
    status?: SubscriptionStatus | string
    plan_code?: PlanCode | string
    plan_name?: string
    plan_name_bn?: string
    plan_id?: string
  } | null,
  plans?: SubscriptionPlanRecord[]
): ResolvedSubscriptionState {
  if (!subscription) {
    const trialPlan = plans?.find((p) => p.code === 'trial')
    return {
      planCode: 'trial',
      planName: trialPlan?.name || 'Free Trial',
      planNameBn: trialPlan?.name_bn || 'ফ্রি ট্রায়াল',
      status: 'trial',
      badgeTextEn: 'Trial',
      badgeTextBn: 'ফ্রি ট্রায়াল',
      isTrial: true,
      isSuspended: false,
      isPastDue: false,
      isGracePeriod: false,
    }
  }

  const isTrial = subscription.status === 'trial' || subscription.status === 'trialing' || subscription.plan_code === 'trial'
  const isSuspended = subscription.status === 'suspended'
  const isPastDue = subscription.status === 'past_due'
  const isGracePeriod = subscription.status === 'grace_period'

  if (isTrial) {
    const trialPlan = plans?.find((p) => p.code === 'trial' || p.id === subscription.plan_id)
    return {
      planCode: 'trial',
      planName: subscription.plan_name || trialPlan?.name || 'Free Trial',
      planNameBn: subscription.plan_name_bn || trialPlan?.name_bn || 'ফ্রি ট্রায়াল',
      status: (subscription.status as SubscriptionStatus) || 'trial',
      badgeTextEn: 'Trial',
      badgeTextBn: 'ফ্রি ট্রায়াল',
      isTrial: true,
      isSuspended,
      isPastDue,
      isGracePeriod: false,
    }
  }

  const code: PlanCode =
    subscription.plan_code === 'enterprise'
      ? 'enterprise'
      : subscription.plan_code === 'business'
      ? 'business'
      : 'starter'

  const matchedPlan = plans?.find((p) => p.code === code || p.id === subscription.plan_id)

  const names: Record<PlanCode, { en: string; bn: string }> = {
    trial: { en: 'Free Trial', bn: 'ফ্রি ট্রায়াল' },
    starter: { en: 'Starter Plan', bn: 'স্টার্টার প্ল্যান' },
    business: { en: 'Business Plan', bn: 'বিজনেস প্ল্যান' },
    enterprise: { en: 'Enterprise Plan', bn: 'এন্টারপ্রাইজ প্ল্যান' },
  }

  return {
    planCode: code,
    planName: subscription.plan_name || matchedPlan?.name || names[code].en,
    planNameBn: subscription.plan_name_bn || matchedPlan?.name_bn || names[code].bn,
    status: (subscription.status as SubscriptionStatus) || 'active',
    badgeTextEn: matchedPlan?.name ? matchedPlan.name.replace(/ Plan$/i, '') : (code.charAt(0).toUpperCase() + code.slice(1)),
    badgeTextBn: subscription.plan_name_bn || matchedPlan?.name_bn || names[code].bn,
    isTrial: false,
    isSuspended,
    isPastDue,
    isGracePeriod,
  }
}

export type BillingInterval = 'monthly' | 'yearly'

export type PaymentGatewayType =
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'sslcommerz'
  | 'uddoktapay'
  | 'stripe'
  | 'bank_wire'
  | 'manual'
  | 'credit'
  | 'mock'

export type FeatureCategory =
  | 'sales'
  | 'production'
  | 'inventory'
  | 'management'
  | 'finance'
  | 'communication'
  | 'advanced'
  | 'system'

export type EntitlementType = 'boolean' | 'numeric' | 'usage' | 'unlimited'

export type FeatureCode =
  | 'basic_sales'
  | 'basic_customers'
  | 'quotation_pdf'
  | 'delivery_challan'
  | 'multi_department'
  | 'inventory'
  | 'inventory_rolls'
  | 'production'
  | 'production_kanban'
  | 'reports'
  | 'reports_analytics'
  | 'hr'
  | 'hr_payroll'
  | 'job_costing'
  | 'whatsapp_notifications'
  | 'sms_notifications'
  | 'multi_branch'
  | 'machinery'
  | 'attendance_qr'
  | 'advanced_analytics'
  | 'advanced_permissions'
  | 'custom_workflows'
  | 'api_access'
  | 'priority_support'

export interface FeatureCatalogRecord {
  id: string
  key: FeatureCode | string
  name_en: string
  name_bn: string
  description_en?: string | null
  description_bn?: string | null
  category: FeatureCategory
  entitlement_type: EntitlementType
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export type ConfigurableLimitType =
  | 'max_users'
  | 'max_branches'
  | 'storage_gb'
  | 'monthly_orders'
  | 'max_customers'
  | 'max_products'

export type CustomLimitsOverride = Partial<Record<ConfigurableLimitType, number>> & {
  expires_at?: string | null
  reason?: string | null
  granted_by?: string | null
  granted_at?: string | null
  is_active?: boolean
  feature_overrides?: Partial<Record<FeatureCode, boolean>>
  feature_expires_at?: string | null
}

export interface AuditableOverrideRecord {
  id?: string
  company_id: string
  resource_type: ConfigurableLimitType | 'feature'
  feature_code?: FeatureCode | null
  original_value: number | boolean
  overridden_value: number | boolean
  reason: string
  created_by?: string | null
  created_at: string
  expires_at?: string | null
  is_active: boolean
}

export interface OverLimitItem {
  resource: ConfigurableLimitType
  label: string
  currentUsage: number
  allowedLimit: number
  excessCount: number
  remediationNote: string
}

export interface OverLimitSummary {
  isOverLimit: boolean
  exceededItems: OverLimitItem[]
  suggestedAction: string
}

export type OveragePolicy = 'block' | 'warn' | 'allow_charge'

export interface SubscriptionPlanRecord {
  id: string
  code: PlanCode
  name: string
  name_bn: string
  description?: string | null
  price_monthly: number
  price_yearly: number
  currency?: string
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  features: FeatureCode[]
  trial_days?: number
  trial_eligible?: boolean
  setup_fee?: number
  version?: number
  is_latest?: boolean
  soft_limits?: { warning_threshold_pct?: number; [key: string]: any }
  hard_limits?: Record<string, number>
  overage_policy?: OveragePolicy
  is_active: boolean
  is_public?: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface PlanVersionRecord {
  id: string
  plan_id: string
  version: number
  code: string
  name: string
  name_bn?: string | null
  price_monthly: number
  price_yearly: number
  currency: string
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  features: string[]
  soft_limits?: Record<string, any>
  hard_limits?: Record<string, any>
  overage_policy: string
  change_summary?: string | null
  created_by?: string | null
  created_at: string
}

export interface CompanySubscriptionRecord {
  id: string
  company_id: string
  plan_id: string
  plan_code: PlanCode
  plan_name?: string
  plan_name_bn?: string
  plan_version?: number
  status: SubscriptionStatus
  billing_interval: BillingInterval
  current_period_start: string
  current_period_end: string
  trial_ends_at?: string | null
  cancelled_at?: string | null
  cancel_at_period_end?: boolean
  next_plan_id?: string | null
  change_effective_at?: string | null
  grace_period_ends_at?: string | null
  started_at?: string
  payment_method_type?: PaymentGatewayType | null
  last_payment_reference?: string | null
  custom_limits_override?: CustomLimitsOverride | null
}

export type SubscriptionEventType =
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
  | 'CREDIT_ADJUSTMENT'

export interface SubscriptionEventRecord {
  id: string
  subscription_id?: string | null
  company_id: string
  previous_plan_code?: string | null
  new_plan_code?: string | null
  previous_status?: string | null
  new_status?: string | null
  event_type: SubscriptionEventType
  reason?: string | null
  transaction_id?: string | null
  amount?: number | null
  currency: string
  effective_at: string
  performed_by?: string | null
  metadata?: Record<string, any>
  created_at: string
}

export interface TenantResourceUsage {
  users_count: number
  users_limit: number
  branches_count: number
  branches_limit: number
  storage_used_gb: number
  storage_limit_gb: number
  orders_this_month: number
  orders_limit: number
  customers_count: number
  customers_limit: number
  products_count: number
  products_limit: number
}

export interface TenantEntitlements {
  companyId: string
  companyName: string
  companySlug: string
  planCode: PlanCode
  planName: string
  planNameBn: string
  planVersion: number
  status: SubscriptionStatus
  isTrial: boolean
  isSuspended: boolean
  isPastDue: boolean
  isGracePeriod: boolean
  isTrialExpired: boolean
  daysRemainingInTrial: number
  trialProgressPercent: number
  billingInterval: BillingInterval
  currentPeriodStart: string
  currentPeriodEnd: string
  nextPlanCode?: PlanCode | null
  nextPlanEffectiveAt?: string | null
  cancelAtPeriodEnd: boolean
  features: FeatureCode[]
  usage: TenantResourceUsage
  availablePaymentGateways: PaymentGatewayType[]
}

export interface SubscriptionCheckoutInput {
  companyId: string
  planCode: PlanCode
  interval: BillingInterval
  gatewayProvider: PaymentGatewayType
  customerName?: string
  customerPhone?: string
  customerEmail?: string
  successUrl?: string
  cancelUrl?: string
}

export interface SubscriptionCheckoutResult {
  success: boolean
  internalTrxId?: string
  checkoutUrl?: string
  requiresRedirect?: boolean
  instructions?: string[]
  accountNumber?: string
  amount?: number
  currency?: string
  error?: string
}

export interface SubscriptionVerificationResult {
  success: boolean
  status: 'paid' | 'pending' | 'failed'
  planCode?: PlanCode
  billingInterval?: BillingInterval
  paidAmount?: number
  currency?: string
  subscriptionId?: string
  invoiceId?: string
  error?: string
}

export interface PlatformSubscriptionItem {
  id: string
  company_id: string
  company_name: string
  company_slug: string
  plan_code: PlanCode
  status: SubscriptionStatus
  billing_interval: BillingInterval
  monthly_rate: number
  created_at: string
  next_billing_date: string
  payment_method_type?: PaymentGatewayType
  last_payment_reference?: string
  custom_limits_override?: CustomLimitsOverride | null
}

export interface CreatePlanInput {
  code: PlanCode
  name: string
  name_bn: string
  description: string
  price_monthly: number
  price_yearly: number
  currency?: string
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  features: FeatureCode[]
  trial_days?: number
  trial_eligible?: boolean
  setup_fee?: number
  is_active?: boolean
  is_public?: boolean
  sort_order?: number
}

// -----------------------------------------------------------------------------
// Dedicated SaaS Subscription Invoices (Strict Separation from Customer Sales Invoices)
// -----------------------------------------------------------------------------

export type SaasInvoiceStatus = 'draft' | 'unpaid' | 'paid' | 'overdue' | 'void' | 'waived'

export type SaasInvoiceItemType =
  | 'plan_fee'
  | 'proration_credit'
  | 'user_addon'
  | 'branch_addon'
  | 'storage_addon'
  | 'discount'
  | 'vat'

export interface SaasSubscriptionInvoiceItemRecord {
  id: string
  invoice_id: string
  description: string
  item_type: SaasInvoiceItemType
  quantity: number
  unit_price: number
  total_price: number
  created_at: string
}

export interface SaasSubscriptionInvoiceRecord {
  id: string
  company_id: string
  subscription_id?: string | null
  invoice_number: string
  plan_id?: string | null
  plan_code: PlanCode | string
  plan_name: string
  plan_version: number
  billing_interval: BillingInterval
  billing_period_start: string
  billing_period_end: string
  subtotal: number
  discount_amount: number
  tax_amount: number
  total_amount: number
  currency: string
  due_date: string
  status: SaasInvoiceStatus
  payment_method?: PaymentGatewayType | string | null
  gateway_transaction_id?: string | null
  paid_at?: string | null
  notes?: string | null
  items?: SaasSubscriptionInvoiceItemRecord[]
  created_at: string
  updated_at: string
}

export interface SubscriptionInvoiceRecord {
  id: string
  invoice_number: string
  company_id: string
  plan_name: string
  billing_interval: BillingInterval
  amount: number
  status: 'paid' | 'pending' | 'failed'
  payment_method: PaymentGatewayType
  transaction_ref: string
  billing_date: string
  due_date: string
  receipt_url?: string
}

export interface SaasTenantStorageUsageRecord {
  id: string
  company_id: string
  total_bytes_used: number
  total_files_count: number
  artwork_bytes: number
  invoices_bytes: number
  receipts_bytes: number
  documents_bytes: number
  last_calculated_at: string
  updated_at: string
}

export interface SaasRevenueOverview {
  mrr: number
  arr: number
  arpu: number
  activeSubscriptionsCount: number
  trialSubscriptionsCount: number
  pastDueSubscriptionsCount: number
  gracePeriodSubscriptionsCount: number
  suspendedSubscriptionsCount: number
  cancelledSubscriptionsCount: number
  churnRatePct: number
  trialConversionRatePct: number
  collectionRatePct: number
  totalRevenueBdt: number
  planDistribution: {
    starter: number
    business: number
    enterprise: number
    trial: number
  }
}
