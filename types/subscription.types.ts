export type TenantAccountType = 'trial' | 'starter' | 'business' | 'enterprise'

export type PlanCode = 'starter' | 'business' | 'enterprise'

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
  if (subscription.status === 'trial') return 'trial'
  if (subscription.plan_code === 'enterprise') return 'enterprise'
  if (subscription.plan_code === 'business') return 'business'
  if (subscription.plan_code === 'starter') return 'starter'
  return 'starter'
}

export type BillingInterval = 'monthly' | 'yearly'

export type PaymentGatewayType =
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'sslcommerz'
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
  is_active: boolean
  sort_order: number
}

export interface CompanySubscriptionRecord {
  id: string
  company_id: string
  plan_id: string
  plan_code: PlanCode
  status: SubscriptionStatus
  billing_interval: BillingInterval
  current_period_start: string
  current_period_end: string
  trial_ends_at?: string | null
  cancelled_at?: string | null
  payment_method_type?: PaymentGatewayType | null
  last_payment_reference?: string | null
  custom_limits_override?: CustomLimitsOverride | null
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
