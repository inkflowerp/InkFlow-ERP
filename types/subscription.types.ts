export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'

export type PlanCode = 'trial' | 'starter' | 'business' | 'enterprise'

export type SubscriptionStatus =
  | 'trial'
  | 'active'
  | 'past_due'
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
  subscription?: { status?: SubscriptionStatus; plan_code?: PlanCode } | null
): TenantAccountType {
  if (!subscription) return 'trial'
  if (subscription.status === 'trial' || subscription.plan_code === 'trial') return 'trial'
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
}

export function resolveSubscriptionPlan(
  subscription?: {
    status?: SubscriptionStatus
    plan_code?: PlanCode
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
    }
  }

  const isTrial = subscription.status === 'trial' || subscription.plan_code === 'trial'
  const isSuspended = subscription.status === 'suspended'
  const isPastDue = subscription.status === 'past_due'

  if (isTrial) {
    const trialPlan = plans?.find((p) => p.code === 'trial' || p.id === subscription.plan_id)
    return {
      planCode: 'trial',
      planName: subscription.plan_name || trialPlan?.name || 'Free Trial',
      planNameBn: subscription.plan_name_bn || trialPlan?.name_bn || 'ফ্রি ট্রায়াল',
      status: subscription.status || 'trial',
      badgeTextEn: 'Trial',
      badgeTextBn: 'ফ্রি ট্রায়াল',
      isTrial: true,
      isSuspended,
      isPastDue,
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
    status: subscription.status || 'active',
    badgeTextEn: matchedPlan?.name ? matchedPlan.name.replace(/ Plan$/i, '') : (code.charAt(0).toUpperCase() + code.slice(1)),
    badgeTextBn: subscription.plan_name_bn || matchedPlan?.name_bn || names[code].bn,
    isTrial: false,
    isSuspended,
    isPastDue,
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
  | 'mock'

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
  | 'multi_branch'
  | 'advanced_analytics'
  | 'advanced_permissions'
  | 'custom_workflows'
  | 'api_access'
  | 'priority_support'

export type ConfigurableLimitType =
  | 'max_users'
  | 'max_branches'
  | 'storage_gb'
  | 'monthly_orders'
  | 'max_customers'
  | 'max_products'

export type CustomLimitsOverride = Partial<Record<ConfigurableLimitType, number>>

export interface SubscriptionPlanRecord {
  id: string
  code: PlanCode
  name: string
  name_bn: string
  description?: string | null
  price_monthly: number
  price_yearly: number
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  features: FeatureCode[]
  trial_days?: number
  is_active: boolean
  sort_order: number
}

export interface CompanySubscriptionRecord {
  id: string
  company_id: string
  plan_id: string
  plan_code: PlanCode
  plan_name?: string
  plan_name_bn?: string
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

export interface SubscriptionEventRecord {
  id: string
  subscription_id: string
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
  status: SubscriptionStatus
  isTrial: boolean
  isSuspended: boolean
  isPastDue: boolean
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
  max_users: number
  max_branches: number
  storage_gb: number
  monthly_orders: number
  max_customers: number
  max_products: number
  features: FeatureCode[]
  trial_days?: number
  is_active?: boolean
  sort_order?: number
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
