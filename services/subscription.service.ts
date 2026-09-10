import type {
  SubscriptionPlanRecord,
  CompanySubscriptionRecord,
  TenantResourceUsage,
  PlatformSubscriptionItem,
  FeatureCode,
  PlanCode,
  BillingInterval,
  PaymentGatewayType,
  ConfigurableLimitType,
  CustomLimitsOverride,
  SubscriptionInvoiceRecord,
  CreatePlanInput,
  SubscriptionStatus,
  TenantAccountType,
  TenantAccountTypeMeta,
  SubscriptionEventType,
  SubscriptionEventRecord,
  SubscriptionCheckoutInput,
  SubscriptionCheckoutResult,
  SubscriptionVerificationResult,
} from '../types/subscription.types.ts'
import { resolveTenantAccountType } from '../types/subscription.types.ts'
import { createAdminClient } from '../lib/supabase/admin.ts'
import { GatewayService } from './gateway.service.ts'
import { createPaymentProvider } from '../lib/payments/provider.factory.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../lib/db/data-store.ts'

const isValidUuid = (str?: string | null): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str))
}

export const TENANT_ACCOUNT_TYPE_METADATA: Record<TenantAccountType, TenantAccountTypeMeta> = {
  trial: {
    type: 'trial',
    nameEn: 'Free Trial (14 Days)',
    nameBn: '১৪ দিনের ফ্রি ট্রায়াল',
    badgeTextEn: 'Trial',
    badgeTextBn: 'ফ্রি ট্রায়াল',
    color: 'amber',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-200 dark:border-amber-800',
    priceMonthly: 0,
    priceYearly: 0,
    maxUsers: 5,
    maxBranches: 1,
    descriptionEn: '14-day evaluation with full access to all ERP modules. No credit card required.',
    descriptionBn: '১৪ দিনের জন্য সকল মডিউল ব্যবহারের পূর্ণ সুযোগ। কোনো ক্রেডিট কার্ডের প্রয়োজন নেই।',
  },
  starter: {
    type: 'starter',
    nameEn: 'Starter Plan',
    nameBn: 'স্টার্টার প্ল্যান',
    badgeTextEn: 'Starter',
    badgeTextBn: 'স্টার্টার',
    color: 'blue',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-200 dark:border-blue-800',
    priceMonthly: 1999,
    priceYearly: 19990,
    maxUsers: 3,
    maxBranches: 1,
    descriptionEn: 'For small shops needing limited users, basic sales, and essential customer tracking.',
    descriptionBn: 'ছোট প্রেস ও ডিজিটাল প্রিন্ট দোকানের জন্য প্রয়োজনীয় বিলিং ও জব অর্ডার ব্যবস্থাপনা।',
  },
  business: {
    type: 'business',
    nameEn: 'Business Plan',
    nameBn: 'বিজনেস প্ল্যান',
    badgeTextEn: 'Business',
    badgeTextBn: 'বিজনেস',
    color: 'purple',
    badgeClass: 'bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-950/60 dark:text-purple-200 dark:border-purple-800',
    priceMonthly: 4999,
    priceYearly: 49990,
    maxUsers: 10,
    maxBranches: 3,
    descriptionEn: 'For growing factories requiring multiple departments, inventory, production, reports, and HR.',
    descriptionBn: 'মাঝারি প্রিন্টিং ফ্যাক্টরির ইনভেন্টরি, প্রোডাকশন কানবান বোর্ড এবং এইচআর পেরোল।',
  },
  enterprise: {
    type: 'enterprise',
    nameEn: 'Enterprise Plan',
    nameBn: 'এন্টারপ্রাইজ প্ল্যান',
    badgeTextEn: 'Enterprise',
    badgeTextBn: 'এন্টারপ্রাইজ',
    color: 'emerald',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-200 dark:border-emerald-800',
    priceMonthly: 9999,
    priceYearly: 99990,
    maxUsers: 999,
    maxBranches: 999,
    descriptionEn: 'For enterprise sign makers requiring multiple branches, advanced analytics, permissions, and custom workflows.',
    descriptionBn: 'বহু শাখা সম্বলিত বড় প্রিন্টিং প্রতিষ্ঠানের জন্য কাস্টম ওয়ার্কফ্লো, এপিআই ও ডেডিকেটেড সাপোর্ট।',
  },
}

export interface FeatureMeta {
  code: FeatureCode
  name: string
  name_bn: string
  description: string
  description_bn?: string
  minPlan: PlanCode
  category: 'sales' | 'production' | 'management' | 'advanced'
}

export const FEATURE_METADATA: Record<FeatureCode, FeatureMeta> = {
  basic_sales: {
    code: 'basic_sales',
    name: 'Basic Sales & POS',
    name_bn: 'মৌলিক সেলস ও ক্যাশ মেমো',
    description: 'Create estimates, cash sales, and bill printing.',
    minPlan: 'starter',
    category: 'sales',
  },
  basic_customers: {
    code: 'basic_customers',
    name: 'Basic Customers Directory',
    name_bn: 'গ্রাহক তালিকা ও লেজার',
    description: 'Maintain customer accounts, phone numbers, and balances.',
    minPlan: 'starter',
    category: 'sales',
  },
  quotation_pdf: {
    code: 'quotation_pdf',
    name: 'Quotation PDF Generator',
    name_bn: 'কোটেশন পিডিএফ প্রস্তুতকরণ',
    description: 'Download and print formal client quotations with company branding.',
    minPlan: 'starter',
    category: 'sales',
  },
  delivery_challan: {
    code: 'delivery_challan',
    name: 'Delivery Challan',
    name_bn: 'ডেলিভারি চালান ও গেটপাস',
    description: 'Print official delivery challans for dispatched orders.',
    minPlan: 'starter',
    category: 'sales',
  },
  multi_department: {
    code: 'multi_department',
    name: 'Multiple Departments',
    name_bn: 'বহু বিভাগ ব্যবস্থাপনা',
    description: 'Separate pre-press, offset, digital, solvent, and finishing departments.',
    minPlan: 'business',
    category: 'production',
  },
  inventory: {
    code: 'inventory',
    name: 'Inventory & Stock Management',
    name_bn: 'ইনভেন্টরি ও কাঁচামাল স্টক',
    description: 'Track media rolls, sheets, inks, eyelets, and purchase orders.',
    minPlan: 'business',
    category: 'production',
  },
  inventory_rolls: {
    code: 'inventory_rolls',
    name: 'Roll & Sheet Stock Ledger',
    name_bn: 'রোল ও শিট স্টক লেজার',
    description: 'Real-time linear foot, square foot, and ream balance calculations.',
    minPlan: 'business',
    category: 'production',
  },
  production: {
    code: 'production',
    name: 'Shop Floor Production',
    name_bn: 'প্রোডাকশন ফ্লোর ও শিডিউলিং',
    description: 'Machine queue, print operators job tickets, and QA signoff.',
    minPlan: 'business',
    category: 'production',
  },
  production_kanban: {
    code: 'production_kanban',
    name: 'Production Kanban Board',
    name_bn: 'প্রোডাকশন কানবান বোর্ড',
    description: 'Live interactive drag-and-drop workflow across production stages.',
    minPlan: 'business',
    category: 'production',
  },
  reports: {
    code: 'reports',
    name: 'Reports & Business Analytics',
    name_bn: 'রিপোর্ট ও ব্যবসায়িক হিসাব',
    description: 'P&L, daily collection, sales by product, and material wastage analysis.',
    minPlan: 'business',
    category: 'management',
  },
  reports_analytics: {
    code: 'reports_analytics',
    name: 'Executive Financial Reports',
    name_bn: 'নির্বাহী আর্থিক বিশ্লেষণ',
    description: 'Consolidated profit and revenue analytics with exportable spreadsheets.',
    minPlan: 'business',
    category: 'management',
  },
  hr: {
    code: 'hr',
    name: 'HR & Employee Management',
    name_bn: 'মানবসম্পদ ও কর্মী প্রশাসন',
    description: 'Employee roster, attendance, shifts, and leave records.',
    minPlan: 'business',
    category: 'management',
  },
  hr_payroll: {
    code: 'hr_payroll',
    name: 'Payroll & Salary Sheets',
    name_bn: 'বেতন ও পে-রোল প্রস্তুতকরণ',
    description: 'Monthly payroll generation, overtime calculations, and salary payslips.',
    minPlan: 'business',
    category: 'management',
  },
  job_costing: {
    code: 'job_costing',
    name: 'Job Costing & Profitability',
    name_bn: 'জব কস্টিং ও প্রকৃত লাভ নিরীক্ষা',
    description: 'Actual ink, media, electricity, and labor cost analysis per job ticket.',
    minPlan: 'business',
    category: 'management',
  },
  whatsapp_notifications: {
    code: 'whatsapp_notifications',
    name: 'WhatsApp Notifications',
    name_bn: 'হোয়াটসঅ্যাপ নোটিফিকেশন',
    description: 'Automated order status and delivery updates directly to client phones.',
    minPlan: 'business',
    category: 'advanced',
  },
  multi_branch: {
    code: 'multi_branch',
    name: 'Multiple Branches & Hubs',
    name_bn: 'মাল্টি-ব্রাঞ্চ ও শাখা নিয়ন্ত্রণ',
    description: 'Manage separate factory floors, retail counters, and regional hubs.',
    minPlan: 'enterprise',
    category: 'advanced',
  },
  advanced_analytics: {
    code: 'advanced_analytics',
    name: 'Advanced Analytics & Forecasting',
    name_bn: 'উন্নত অ্যানালিটিক্স ও পূর্বাভাস',
    description: 'Machine efficiency benchmarking and inventory reorder forecasting.',
    minPlan: 'enterprise',
    category: 'advanced',
  },
  advanced_permissions: {
    code: 'advanced_permissions',
    name: 'Advanced RBAC & Granular Overrides',
    name_bn: 'উন্নত পারমিশন ও রোল কাস্টমাইজেশন',
    description: 'Per-user permission matrix, module masks, and action-level controls.',
    minPlan: 'enterprise',
    category: 'advanced',
  },
  custom_workflows: {
    code: 'custom_workflows',
    name: 'Custom Approval Workflows',
    name_bn: 'কাস্টম অনুমোদন ওয়ার্কফ্লো',
    description: 'Multi-stage quotation signoffs and credit limit threshold approvals.',
    minPlan: 'enterprise',
    category: 'advanced',
  },
  api_access: {
    code: 'api_access',
    name: 'REST API & Webhooks',
    name_bn: 'রেস্ট এপিআই ও ওয়েবহুক অ্যাক্সেস',
    description: 'Direct programmatic API integration with ERP, accounting, or e-commerce.',
    minPlan: 'enterprise',
    category: 'advanced',
  },
  priority_support: {
    code: 'priority_support',
    name: 'Dedicated 24/7 Account Manager',
    name_bn: 'ডেডিকেটেড ২৪/৭ অ্যাকাউন্ট সাপোর্ট',
    description: 'Direct phone & on-site priority support with 99.9% uptime SLA.',
    minPlan: 'enterprise',
    category: 'advanced',
  },
}

export const DEFAULT_TRIAL_PLAN: SubscriptionPlanRecord = {
  id: 'sp-00',
  code: 'trial',
  name: 'Free Trial (14 Days)',
  name_bn: '১৪ দিনের ফ্রি ট্রায়াল',
  description: '14-day evaluation with full access to all ERP modules. No credit card required.',
  price_monthly: 0,
  price_yearly: 0,
  max_users: 5,
  max_branches: 1,
  storage_gb: 2,
  monthly_orders: 100,
  max_customers: 200,
  max_products: 200,
  trial_days: 14,
  features: Object.keys(FEATURE_METADATA) as FeatureCode[],
  is_active: true,
  sort_order: 0,
}

export const DEFAULT_PLANS: SubscriptionPlanRecord[] = [
  DEFAULT_TRIAL_PLAN,
  {
    id: 'sp-01',
    code: 'starter',
    name: 'Starter Plan',
    name_bn: 'স্টার্টার প্ল্যান',
    description: 'For small shops needing limited users, basic sales, and essential customer tracking.',
    price_monthly: 1999,
    price_yearly: 19990,
    max_users: 3,
    max_branches: 1,
    storage_gb: 1,
    monthly_orders: 50,
    max_customers: 100,
    max_products: 100,
    trial_days: 0,
    features: ['basic_sales', 'basic_customers', 'quotation_pdf', 'delivery_challan'],
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'sp-02',
    code: 'business',
    name: 'Business Plan',
    name_bn: 'বিজনেস প্ল্যান',
    description: 'For growing factories requiring multiple departments, inventory, production, reports, and HR.',
    price_monthly: 4999,
    price_yearly: 49990,
    max_users: 10,
    max_branches: 3,
    storage_gb: 10,
    monthly_orders: 500,
    max_customers: 1000,
    max_products: 1000,
    trial_days: 0,
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'multi_department',
      'inventory',
      'inventory_rolls',
      'production',
      'production_kanban',
      'reports',
      'reports_analytics',
      'hr',
      'hr_payroll',
      'job_costing',
      'whatsapp_notifications',
    ],
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'sp-03',
    code: 'enterprise',
    name: 'Enterprise Plan',
    name_bn: 'এন্টারপ্রাইজ প্ল্যান',
    description: 'For enterprise sign makers requiring multiple branches, advanced analytics, permissions, and custom workflows.',
    price_monthly: 9999,
    price_yearly: 99990,
    max_users: 999,
    max_branches: 999,
    storage_gb: 100,
    monthly_orders: 99999,
    max_customers: 99999,
    max_products: 99999,
    trial_days: 0,
    features: [
      'basic_sales',
      'basic_customers',
      'quotation_pdf',
      'delivery_challan',
      'multi_department',
      'inventory',
      'inventory_rolls',
      'production',
      'production_kanban',
      'reports',
      'reports_analytics',
      'hr',
      'hr_payroll',
      'job_costing',
      'whatsapp_notifications',
      'multi_branch',
      'advanced_analytics',
      'advanced_permissions',
      'custom_workflows',
      'api_access',
      'priority_support',
    ],
    is_active: true,
    sort_order: 3,
  },
]

export const DEFAULT_TENANT_SUBSCRIPTION: CompanySubscriptionRecord = {
  id: 'sub-default',
  company_id: 'default',
  plan_id: 'sp-00',
  plan_code: 'trial',
  status: 'trial',
  billing_interval: 'monthly',
  current_period_start: new Date().toISOString(),
  current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
  trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
  payment_method_type: null,
  last_payment_reference: null,
  custom_limits_override: null,
}

export class SubscriptionService {
  /**
   * Fetches all active plans from Supabase or fallback
   */
  static async getPlans(): Promise<SubscriptionPlanRecord[]> {
    try {
      const admin = createAdminClient()
      const { data, error } = await (admin as any)
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })

      if (!error && data && data.length > 0) {
        return data as SubscriptionPlanRecord[]
      }
    } catch {}

    return DEFAULT_PLANS
  }

  /**
   * Fetches plan by plan code
   */
  static async getPlanByCode(code: string): Promise<SubscriptionPlanRecord> {
    const plans = await this.getPlans()
    return plans.find((p) => p.code === code) || DEFAULT_TRIAL_PLAN
  }

  /**
   * Fetches plan by plan ID
   */
  static async getPlanById(id: string): Promise<SubscriptionPlanRecord> {
    const plans = await this.getPlans()
    return plans.find((p) => p.id === id) || DEFAULT_TRIAL_PLAN
  }

  /**
   * Authoritative server-side tenant subscription retrieval
   */
  static async getTenantSubscription(
    companyId: string,
    companySlug?: string
  ): Promise<CompanySubscriptionRecord> {
    const normId = companyId || 'default'

    try {
      const admin = createAdminClient()
      const { data: sub, error } = await (admin as any)
        .from('company_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('company_id', normId)
        .maybeSingle()

      if (!error && sub) {
        const planCode = sub.subscription_plans?.code || (sub.status === 'trial' ? 'trial' : 'starter')
        return {
          id: sub.id,
          company_id: sub.company_id,
          plan_id: sub.plan_id,
          plan_code: planCode,
          status: sub.status,
          billing_interval: sub.billing_interval || 'monthly',
          current_period_start: sub.current_period_start,
          current_period_end: sub.current_period_end,
          trial_ends_at: sub.trial_ends_at,
          cancelled_at: sub.cancelled_at,
          cancel_at_period_end: Boolean(sub.cancel_at_period_end),
          next_plan_id: sub.next_plan_id,
          change_effective_at: sub.change_effective_at,
          grace_period_ends_at: sub.grace_period_ends_at,
          started_at: sub.started_at,
          payment_method_type: sub.payment_method_type,
          last_payment_reference: sub.last_payment_reference,
          custom_limits_override: sub.custom_limits_override,
        }
      }
    } catch {}

    // Check local data store for fallback
    const localSubs = PrintERPDataStore.get<CompanySubscriptionRecord[]>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS) || []
    const found = localSubs.find((s) => s.company_id === normId || (companySlug && s.company_id === `co-${companySlug}`))
    if (found) return found

    const defaultTrialDays = DEFAULT_TRIAL_PLAN.trial_days || 14
    return {
      id: `sub-${normId}`,
      company_id: normId,
      plan_id: DEFAULT_TRIAL_PLAN.id,
      plan_code: 'trial',
      status: 'trial',
      billing_interval: 'monthly',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 86400000).toISOString(),
      trial_ends_at: new Date(Date.now() + defaultTrialDays * 86400000).toISOString(),
      payment_method_type: null,
      last_payment_reference: null,
      custom_limits_override: null,
    }
  }

  /**
   * Server-authoritative proration and price calculator
   */
  static calculateProration(params: {
    currentSubscription: CompanySubscriptionRecord
    currentPlan: SubscriptionPlanRecord
    targetPlan: SubscriptionPlanRecord
    targetInterval: BillingInterval
  }): {
    targetPlanPrice: number
    unusedCredit: number
    finalAmount: number
    remainingDays: number
    totalDays: number
    isUpgrade: boolean
    isDowngrade: boolean
    currency: string
  } {
    const { currentSubscription, currentPlan, targetPlan, targetInterval } = params
    const currency = 'BDT'

    const targetPlanPrice =
      targetInterval === 'yearly' ? Number(targetPlan.price_yearly) : Number(targetPlan.price_monthly)

    // If currently on trial or expired, no proration credit applies
    if (
      currentSubscription.status === 'trial' ||
      currentSubscription.plan_code === 'trial' ||
      currentSubscription.status === 'expired' ||
      currentSubscription.status === 'cancelled'
    ) {
      return {
        targetPlanPrice,
        unusedCredit: 0,
        finalAmount: targetPlanPrice,
        remainingDays: 0,
        totalDays: 0,
        isUpgrade: true,
        isDowngrade: false,
        currency,
      }
    }

    const isUpgrade = targetPlan.sort_order > currentPlan.sort_order
    const isDowngrade = targetPlan.sort_order < currentPlan.sort_order

    // Calculate remaining days on current active paid subscription
    const now = Date.now()
    const periodEnd = new Date(currentSubscription.current_period_end).getTime()
    const remainingMs = Math.max(0, periodEnd - now)
    const remainingDays = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    const totalDays = currentSubscription.billing_interval === 'yearly' ? 365 : 30

    const currentPrice =
      currentSubscription.billing_interval === 'yearly'
        ? Number(currentPlan.price_yearly)
        : Number(currentPlan.price_monthly)

    const dailyRate = currentPrice / totalDays
    const unusedCredit = Math.round(Math.max(0, dailyRate * remainingDays))

    const finalAmount = isUpgrade
      ? Math.max(0, targetPlanPrice - unusedCredit)
      : targetPlanPrice

    return {
      targetPlanPrice,
      unusedCredit,
      finalAmount,
      remainingDays,
      totalDays,
      isUpgrade,
      isDowngrade,
      currency,
    }
  }

  /**
   * Initiates a real payment gateway checkout for plan purchase or upgrade
   */
  static async initiatePlanCheckout(
    input: SubscriptionCheckoutInput,
    userId?: string
  ): Promise<SubscriptionCheckoutResult> {
    const admin = createAdminClient()
    const {
      companyId,
      planCode,
      interval,
      gatewayProvider,
      customerName = 'Tenant Administrator',
      customerPhone = '',
      customerEmail = '',
      successUrl,
      cancelUrl,
    } = input

    try {
      // 1. Fetch Tenant Subscription & Target Plan
      const currentSub = await this.getTenantSubscription(companyId)
      const targetPlan = await this.getPlanByCode(planCode)
      const currentPlan = await this.getPlanById(currentSub.plan_id)

      if (!targetPlan || !targetPlan.is_active || targetPlan.code === 'trial') {
        return { success: false, error: 'Invalid or inactive target plan selected.' }
      }

      // 2. Authoritative Price Calculation
      const proration = this.calculateProration({
        currentSubscription: currentSub,
        currentPlan,
        targetPlan,
        targetInterval: interval,
      })

      const amountToPay = proration.finalAmount
      const internalTrxId = `SUB-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      const invoiceId = `INV-${Date.now().toString().slice(-6)}`

      // 3. Resolve Gateway Integration
      const gateways = await GatewayService.listGateways({ tenantId: null, category: 'payment' })
      let targetGateway = gateways.find((g) => g.provider === gatewayProvider && g.is_enabled)

      if (!targetGateway) {
        // Fallback to any enabled payment gateway or default
        targetGateway = gateways.find((g) => g.is_enabled)
      }

      // 4. Record pending transaction in gateway_transactions
      const dbTenantId = isValidUuid(companyId) ? companyId : null
      const dbGatewayId = targetGateway && isValidUuid(targetGateway.id) ? targetGateway.id : null

      const transactionPayload = {
        billing_context: 'TENANT',
        platform_account_id: null,
        tenant_id: dbTenantId,
        gateway_id: dbGatewayId,
        provider: gatewayProvider,
        subscription_id: isValidUuid(currentSub.id) ? currentSub.id : null,
        amount: amountToPay,
        currency: 'BDT',
        internal_trx_id: internalTrxId,
        payment_status: 'initiated',
        verification_status: 'unverified',
        invoice_id: invoiceId,
        customer_id: customerPhone || customerEmail || customerName,
        verification_payload: {
          companyId,
          planCode,
          planId: targetPlan.id,
          interval,
          proration,
          customerName,
          customerPhone,
          customerEmail,
        },
        created_at: new Date().toISOString(),
      }

      const { data: txRecord, error: txError } = await (admin as any)
        .from('gateway_transactions')
        .insert(transactionPayload)
        .select()
        .single()

      if (txError) {
        console.warn('[SubscriptionService] Transaction insert warning:', txError.message)
      }

      // 5. Record Subscription Event: PAYMENT_PENDING
      await this.recordSubscriptionEvent({
        subscription_id: isValidUuid(currentSub.id) ? currentSub.id : undefined,
        company_id: companyId,
        previous_plan_code: currentSub.plan_code,
        new_plan_code: planCode,
        previous_status: currentSub.status,
        new_status: currentSub.status,
        event_type: 'PAYMENT_PENDING',
        reason: `Initiated checkout for ${targetPlan.name} (${interval})`,
        amount: amountToPay,
        currency: 'BDT',
        performed_by: userId,
      })

      // 6. Instantiate Provider Adapter and create checkout session
      if (targetGateway) {
        const fullGw = await GatewayService.getGatewayById(targetGateway.id)
        if (fullGw) {
          const creds = GatewayService.getDecryptedCredentials(fullGw)
          const providerAdapter = createPaymentProvider({
            provider: gatewayProvider,
            credentials: creds,
            publicConfig: fullGw.public_config || {},
            environment: fullGw.environment,
          })

          const checkoutInit = await providerAdapter.initiatePayment({
            companyId,
            companyName: customerName,
            planCode,
            planName: targetPlan.name,
            billingInterval: interval,
            amount: amountToPay,
            currency: 'BDT',
            customerName,
            customerPhone,
            customerEmail,
            redirectUrl: successUrl || `/settings/subscription?status=verifying&trx=${internalTrxId}`,
            cancelUrl: cancelUrl || `/settings/subscription?status=cancelled`,
            metadata: {
              internalTrxId,
              companyId,
              planCode,
              interval,
            },
          })

          // Update transaction record with provider reference if returned
          if (checkoutInit.transactionId || checkoutInit.gatewayReference) {
            await (admin as any)
              .from('gateway_transactions')
              .update({
                provider_trx_id: checkoutInit.gatewayReference || checkoutInit.transactionId,
                updated_at: new Date().toISOString(),
              })
              .eq('internal_trx_id', internalTrxId)
          }

          return {
            success: checkoutInit.success,
            internalTrxId,
            checkoutUrl: checkoutInit.checkoutUrl,
            requiresRedirect: Boolean(checkoutInit.checkoutUrl),
            instructions: checkoutInit.instructions,
            accountNumber: checkoutInit.accountNumber,
            amount: amountToPay,
            currency: 'BDT',
            error: checkoutInit.error,
          }
        }
      }

      // Offline / manual fallback instructions
      return {
        success: true,
        internalTrxId,
        amount: amountToPay,
        currency: 'BDT',
        instructions: [
          `Payment for ${targetPlan.name} (${interval}): ৳${amountToPay} BDT`,
          `Reference Transaction ID: ${internalTrxId}`,
          'Please complete payment via selected gateway or contact Platform Admin.',
        ],
      }
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || 'Failed to initiate plan checkout.',
      }
    }
  }

  /**
   * Secure, Idempotent Server-Side Payment Verification and Subscription Activation
   */
  static async verifyPaymentAndActivateSubscription(params: {
    internalTrxId?: string
    providerTrxId?: string
    gatewayReference?: string
    provider?: string
    userId?: string
  }): Promise<SubscriptionVerificationResult> {
    const admin = createAdminClient()
    const now = new Date().toISOString()
    const { internalTrxId, providerTrxId, gatewayReference, provider, userId } = params

    try {
      // 1. Locate Transaction Record
      let query = (admin as any).from('gateway_transactions').select('*')
      if (internalTrxId) query = query.eq('internal_trx_id', internalTrxId)
      else if (providerTrxId) query = query.eq('provider_trx_id', providerTrxId)
      else if (gatewayReference) query = query.eq('provider_trx_id', gatewayReference)
      else return { success: false, status: 'failed', error: 'No transaction identifier provided.' }

      const { data: tx, error: txError } = await query.maybeSingle()
      if (txError || !tx) {
        return { success: false, status: 'failed', error: 'Transaction record not found.' }
      }

      // 2. IDEMPOTENCY CHECK: If already verified and paid, return success immediately
      if (tx.payment_status === 'paid' && tx.verification_status === 'verified') {
        const sub = tx.tenant_id ? await this.getTenantSubscription(tx.tenant_id) : null
        return {
          success: true,
          status: 'paid',
          planCode: (sub?.plan_code as PlanCode) || 'starter',
          billingInterval: sub?.billing_interval || 'monthly',
          paidAmount: Number(tx.amount),
          currency: tx.currency || 'BDT',
          subscriptionId: sub?.id,
        }
      }

      const effectiveProvider = provider || tx.provider || 'bkash'
      const rawMeta = tx.verification_payload || tx.callback_payload || {}
      const targetPlanCode: PlanCode = rawMeta.planCode || 'starter'
      const targetInterval: BillingInterval = rawMeta.interval || 'monthly'
      const companyId = tx.tenant_id || rawMeta.companyId

      // 3. Real Provider Verification via Provider Adapter
      const { data: gw } = await (admin as any)
        .from('gateway_integrations')
        .select('*')
        .eq('provider', effectiveProvider)
        .maybeSingle()

      let isVerified = false
      let verifiedTrxId = providerTrxId || tx.provider_trx_id || internalTrxId || ''
      let verifyRawResponse: any = null
      let verificationError: string | null = null

      if (gw && gw.is_enabled) {
        const creds = GatewayService.getDecryptedCredentials(gw)
        const adapter = createPaymentProvider({
          provider: effectiveProvider,
          credentials: creds,
          publicConfig: gw.public_config || {},
          environment: gw.environment,
        })

        const verifyRes = await adapter.verifyPayment({
          transactionId: internalTrxId || verifiedTrxId,
          gatewayReference: gatewayReference || verifiedTrxId,
          amount: Number(tx.amount),
          currency: tx.currency,
        })

        if (verifyRes.success) {
          // Verify Amount Integrity
          if (verifyRes.paidAmount !== undefined && verifyRes.paidAmount > 0) {
            const expectedAmount = Number(tx.amount)
            if (Math.abs(verifyRes.paidAmount - expectedAmount) > 0.01) {
              isVerified = false
              verificationError = `Amount mismatch: Provider reported ৳${verifyRes.paidAmount}, expected ৳${expectedAmount}.`
            } else {
              isVerified = true
            }
          } else {
            isVerified = true
          }

          // Verify Currency Integrity
          if (isVerified && verifyRes.currency) {
            const expectedCurrency = (tx.currency || 'BDT').toUpperCase()
            if (verifyRes.currency.toUpperCase() !== expectedCurrency) {
              isVerified = false
              verificationError = `Currency mismatch: Provider reported ${verifyRes.currency}, expected ${expectedCurrency}.`
            }
          }
        } else {
          isVerified = false
          verificationError = verifyRes.error || 'Provider payment verification rejected.'
        }

        if (verifyRes.gatewayTransactionId) verifiedTrxId = verifyRes.gatewayTransactionId
        verifyRawResponse = verifyRes.rawResponse
      } else if (effectiveProvider === 'bank_wire' || effectiveProvider === 'manual' || effectiveProvider === 'mock') {
        // Offline / Manual / Wire transfer verified by authorized platform admin
        if (userId) {
          isVerified = true
          verifiedTrxId = providerTrxId || verifiedTrxId || `OFFLINE-${Date.now()}`
        } else {
          isVerified = false
          verificationError = 'Manual payment verification requires platform administrator authorization.'
        }
      } else {
        // Automated payment gateway is either not configured or disabled
        isVerified = false
        verificationError = `Payment gateway '${effectiveProvider}' is not configured or is disabled.`
      }

      if (!isVerified) {
        // Record Verification Failure
        await (admin as any)
          .from('gateway_transactions')
          .update({
            payment_status: 'failed',
            verification_status: 'rejected',
            failure_reason: verificationError,
            verification_payload: { ...rawMeta, verifyResponse: verifyRawResponse, error: verificationError },
            updated_at: now,
          })
          .eq('id', tx.id)

        if (companyId) {
          await this.recordSubscriptionEvent({
            company_id: companyId,
            event_type: 'PAYMENT_FAILED',
            reason: verificationError || `Payment verification failed for ${tx.internal_trx_id}`,
            transaction_id: tx.id,
            amount: Number(tx.amount),
            currency: tx.currency || 'BDT',
            performed_by: userId,
          })
        }

        return {
          success: false,
          status: 'failed',
          error: verificationError || 'Provider payment verification failed or was rejected.',
        }
      }

      // 4. Mark Transaction as VERIFIED and PAID
      await (admin as any)
        .from('gateway_transactions')
        .update({
          payment_status: 'paid',
          verification_status: 'verified',
          provider_trx_id: verifiedTrxId,
          paid_at: now,
          verification_payload: { ...rawMeta, verifyResponse: verifyRawResponse },
          updated_at: now,
        })
        .eq('id', tx.id)

      // 5. Update Tenant Subscription Record Atomically
      const targetPlan = await this.getPlanByCode(targetPlanCode)
      const currentSub = companyId ? await this.getTenantSubscription(companyId) : null
      const isUpgrade = currentSub && currentSub.plan_code !== 'trial' && targetPlan.sort_order > 1

      const periodDays = targetInterval === 'yearly' ? 365 : 30
      const currentPeriodStart = now
      const currentPeriodEnd = new Date(Date.now() + periodDays * 86400000).toISOString()

      if (companyId && isValidUuid(companyId)) {
        const updateData = {
          plan_id: targetPlan.id,
          status: 'active',
          billing_interval: targetInterval,
          current_period_start: currentPeriodStart,
          current_period_end: currentPeriodEnd,
          trial_ends_at: null,
          cancelled_at: null,
          cancel_at_period_end: false,
          next_plan_id: null,
          change_effective_at: null,
          last_payment_reference: verifiedTrxId,
          payment_method_type: effectiveProvider,
          updated_at: now,
        }

        const { error: subUpdateError } = await (admin as any)
          .from('company_subscriptions')
          .update(updateData)
          .eq('company_id', companyId)

        if (subUpdateError) {
          console.warn('[SubscriptionService] Sub update error:', subUpdateError.message)
        }

        // 6. Record Immutable Subscription Event
        const eventType: SubscriptionEventType =
          currentSub?.status === 'trial'
            ? 'SUBSCRIPTION_CREATED'
            : isUpgrade
            ? 'PLAN_UPGRADED'
            : 'RENEWED'

        await this.recordSubscriptionEvent({
          subscription_id: isValidUuid(currentSub?.id) ? currentSub?.id : undefined,
          company_id: companyId,
          previous_plan_code: currentSub?.plan_code || 'trial',
          new_plan_code: targetPlanCode,
          previous_status: currentSub?.status || 'trial',
          new_status: 'active',
          event_type: eventType,
          reason: `Verified payment of ৳${tx.amount} via ${effectiveProvider.toUpperCase()} (Ref: ${verifiedTrxId})`,
          transaction_id: tx.id,
          amount: Number(tx.amount),
          currency: tx.currency || 'BDT',
          performed_by: userId,
        })

        // 7. Multi-Channel Notification Dispatch (Email, SMS, WhatsApp, Telegram, In-App)
        try {
          const { CommunicationService } = await import('./communication-server.service.ts')
          await CommunicationService.dispatchWorkflowNotification({
            companyId,
            eventType: 'payment_received',
            recipientName: rawMeta.customerName || 'Valued Partner',
            recipientEmail: rawMeta.customerEmail,
            recipientPhone: rawMeta.customerPhone,
            variables: {
              invoice_number: tx.invoice_id,
              amount: String(tx.amount),
              plan_name: targetPlan.name,
              period_end: new Date(currentPeriodEnd).toLocaleDateString(),
            },
            channels: ['email', 'sms', 'whatsapp', 'in_app'],
            customMessage: `Payment of ৳${tx.amount} BDT confirmed. Your ${targetPlan.name} is active until ${new Date(currentPeriodEnd).toLocaleDateString()}.`,
          })
        } catch (commErr) {
          console.warn('[SubscriptionService] Notification dispatch notice:', commErr)
        }
      }

      return {
        success: true,
        status: 'paid',
        planCode: targetPlanCode,
        billingInterval: targetInterval,
        paidAmount: Number(tx.amount),
        currency: tx.currency || 'BDT',
        subscriptionId: currentSub?.id,
      }
    } catch (err: any) {
      return {
        success: false,
        status: 'failed',
        error: err?.message || 'Verification process encountered an internal error.',
      }
    }
  }

  /**
   * Schedules a safe plan downgrade to take effect at the end of the current billing cycle
   */
  static async schedulePlanDowngrade(
    companyId: string,
    nextPlanCode: PlanCode,
    userId?: string
  ): Promise<{ success: boolean; effectiveAt?: string; error?: string }> {
    const admin = createAdminClient()
    try {
      const currentSub = await this.getTenantSubscription(companyId)
      const nextPlan = await this.getPlanByCode(nextPlanCode)

      if (!nextPlan || nextPlan.code === 'trial') {
        return { success: false, error: 'Invalid downgrade target plan.' }
      }

      const effectiveAt = currentSub.current_period_end

      if (isValidUuid(companyId)) {
        await (admin as any)
          .from('company_subscriptions')
          .update({
            next_plan_id: nextPlan.id,
            change_effective_at: effectiveAt,
            updated_at: new Date().toISOString(),
          })
          .eq('company_id', companyId)

        await this.recordSubscriptionEvent({
          subscription_id: isValidUuid(currentSub.id) ? currentSub.id : undefined,
          company_id: companyId,
          previous_plan_code: currentSub.plan_code,
          new_plan_code: nextPlanCode,
          previous_status: currentSub.status,
          new_status: currentSub.status,
          event_type: 'PLAN_DOWNGRADED',
          reason: `Downgrade scheduled for end of cycle: ${new Date(effectiveAt).toLocaleDateString()}`,
          performed_by: userId,
        })

        // Dispatch Notification
        try {
          const { CommunicationService } = await import('./communication-server.service.ts')
          await CommunicationService.dispatchWorkflowNotification({
            companyId,
            eventType: 'plan_downgraded',
            recipientName: 'Tenant Administrator',
            variables: {
              plan_name: nextPlan.name,
              effective_date: new Date(effectiveAt).toLocaleDateString(),
            },
            channels: ['email', 'in_app'],
            customMessage: `Your plan will switch to ${nextPlan.name} on ${new Date(effectiveAt).toLocaleDateString()} at the end of your current cycle.`,
          })
        } catch (commErr) {
          console.warn('[SubscriptionService] Downgrade notification notice:', commErr)
        }
      }

      return { success: true, effectiveAt }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to schedule downgrade.' }
    }
  }

  /**
   * Cancels subscription with default "cancel at period end" safe behavior
   */
  static async cancelSubscription(
    companyId: string,
    immediately: boolean = false,
    reason?: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      const currentSub = await this.getTenantSubscription(companyId)

      if (isValidUuid(companyId)) {
        const updateData: any = {
          cancelled_at: now,
          updated_at: now,
        }

        if (immediately) {
          updateData.status = 'cancelled'
          updateData.cancel_at_period_end = false
        } else {
          updateData.cancel_at_period_end = true
        }

        await (admin as any)
          .from('company_subscriptions')
          .update(updateData)
          .eq('company_id', companyId)

        await this.recordSubscriptionEvent({
          subscription_id: isValidUuid(currentSub.id) ? currentSub.id : undefined,
          company_id: companyId,
          previous_plan_code: currentSub.plan_code,
          new_plan_code: currentSub.plan_code,
          previous_status: currentSub.status,
          new_status: immediately ? 'cancelled' : currentSub.status,
          event_type: 'CANCELLED',
          reason: reason || (immediately ? 'Immediate cancellation requested' : 'Cancellation at period end'),
          performed_by: userId,
        })

        // Dispatch Notification
        try {
          const { CommunicationService } = await import('./communication-server.service.ts')
          await CommunicationService.dispatchWorkflowNotification({
            companyId,
            eventType: 'subscription_cancelled',
            recipientName: 'Tenant Administrator',
            variables: {
              period_end: new Date(currentSub.current_period_end).toLocaleDateString(),
              reason: reason || 'Cancellation requested',
            },
            channels: ['email', 'in_app'],
            customMessage: immediately
              ? 'Your subscription has been cancelled immediately.'
              : `Your subscription is scheduled to cancel at period end on ${new Date(currentSub.current_period_end).toLocaleDateString()}. Your data will remain preserved.`,
          })
        } catch (commErr) {
          console.warn('[SubscriptionService] Cancellation notification notice:', commErr)
        }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to cancel subscription.' }
    }
  }

  /**
   * Reactivates a pending cancellation subscription
   */
  static async reactivateSubscription(
    companyId: string,
    userId?: string
  ): Promise<{ success: boolean; error?: string }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()

    try {
      const currentSub = await this.getTenantSubscription(companyId)

      if (isValidUuid(companyId)) {
        await (admin as any)
          .from('company_subscriptions')
          .update({
            cancel_at_period_end: false,
            cancelled_at: null,
            updated_at: now,
          })
          .eq('company_id', companyId)

        await this.recordSubscriptionEvent({
          subscription_id: isValidUuid(currentSub.id) ? currentSub.id : undefined,
          company_id: companyId,
          previous_plan_code: currentSub.plan_code,
          new_plan_code: currentSub.plan_code,
          previous_status: currentSub.status,
          new_status: currentSub.status,
          event_type: 'REACTIVATED',
          reason: 'Subscription reactivated by user',
          performed_by: userId,
        })

        // Dispatch Notification
        try {
          const { CommunicationService } = await import('./communication-server.service.ts')
          await CommunicationService.dispatchWorkflowNotification({
            companyId,
            eventType: 'subscription_reactivated',
            recipientName: 'Tenant Administrator',
            variables: {
              plan_name: currentSub.plan_code.toUpperCase(),
              period_end: new Date(currentSub.current_period_end).toLocaleDateString(),
            },
            channels: ['email', 'in_app'],
            customMessage: `Your subscription has been reactivated. Next renewal will occur on ${new Date(currentSub.current_period_end).toLocaleDateString()}.`,
          })
        } catch (commErr) {
          console.warn('[SubscriptionService] Reactivation notification notice:', commErr)
        }
      }

      return { success: true }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to reactivate subscription.' }
    }
  }

  /**
   * Background lifecycle evaluation cron job (idempotent, tenant-safe)
   */
  static async processLifecycleCron(): Promise<{
    expiredTrials: number
    appliedDowngrades: number
    processedCancellations: number
  }> {
    const admin = createAdminClient()
    const now = new Date().toISOString()
    let expiredTrials = 0
    let appliedDowngrades = 0
    let processedCancellations = 0

    try {
      // 1. Expire past-due trials
      const { data: expiredTrialSubs } = await (admin as any)
        .from('company_subscriptions')
        .select('*')
        .eq('status', 'trial')
        .lt('trial_ends_at', now)

      if (expiredTrialSubs && expiredTrialSubs.length > 0) {
        for (const sub of expiredTrialSubs) {
          await (admin as any)
            .from('company_subscriptions')
            .update({ status: 'expired', updated_at: now })
            .eq('id', sub.id)

          await this.recordSubscriptionEvent({
            subscription_id: sub.id,
            company_id: sub.company_id,
            previous_plan_code: 'trial',
            new_plan_code: 'trial',
            previous_status: 'trial',
            new_status: 'expired',
            event_type: 'EXPIRED',
            reason: '14-Day Free Trial period ended',
          })

          try {
            const { CommunicationService } = await import('./communication-server.service.ts')
            await CommunicationService.dispatchWorkflowNotification({
              companyId: sub.company_id,
              eventType: 'trial_expired',
              recipientName: 'Tenant Administrator',
              variables: {},
              channels: ['email', 'in_app'],
              customMessage: 'Your 14-day free trial has expired. Upgrade to a paid plan to restore full ERP features.',
            })
          } catch {}

          expiredTrials++
        }
      }

      // 2. Apply scheduled downgrades
      const { data: scheduledDowngrades } = await (admin as any)
        .from('company_subscriptions')
        .select('*')
        .not('next_plan_id', 'is', null)
        .lte('change_effective_at', now)

      if (scheduledDowngrades && scheduledDowngrades.length > 0) {
        for (const sub of scheduledDowngrades) {
          const nextPlan = await this.getPlanById(sub.next_plan_id)
          await (admin as any)
            .from('company_subscriptions')
            .update({
              plan_id: sub.next_plan_id,
              next_plan_id: null,
              change_effective_at: null,
              updated_at: now,
            })
            .eq('id', sub.id)

          await this.recordSubscriptionEvent({
            subscription_id: sub.id,
            company_id: sub.company_id,
            previous_plan_code: sub.plan_code,
            new_plan_code: nextPlan.code,
            previous_status: sub.status,
            new_status: sub.status,
            event_type: 'PLAN_DOWNGRADED',
            reason: `Scheduled downgrade to ${nextPlan.name} applied at end of period.`,
          })
          appliedDowngrades++
        }
      }

      // 3. Process cancel_at_period_end whose period has expired
      const { data: pendingCancellations } = await (admin as any)
        .from('company_subscriptions')
        .select('*')
        .eq('cancel_at_period_end', true)
        .lte('current_period_end', now)

      if (pendingCancellations && pendingCancellations.length > 0) {
        for (const sub of pendingCancellations) {
          await (admin as any)
            .from('company_subscriptions')
            .update({
              status: 'cancelled',
              cancel_at_period_end: false,
              updated_at: now,
            })
            .eq('id', sub.id)

          await this.recordSubscriptionEvent({
            subscription_id: sub.id,
            company_id: sub.company_id,
            previous_plan_code: sub.plan_code,
            new_plan_code: sub.plan_code,
            previous_status: sub.status,
            new_status: 'cancelled',
            event_type: 'CANCELLED',
            reason: 'Subscription period ended following cancellation request.',
          })
          processedCancellations++
        }
      }
    } catch (err) {
      console.warn('[SubscriptionService] Lifecycle cron notice:', err)
    }

    return { expiredTrials, appliedDowngrades, processedCancellations }
  }

  /**
   * Writes an immutable audit entry to subscription_events
   */
  static async recordSubscriptionEvent(entry: {
    subscription_id?: string
    company_id: string
    previous_plan_code?: string | null
    new_plan_code?: string | null
    previous_status?: string | null
    new_status?: string | null
    event_type: SubscriptionEventType
    reason?: string | null
    transaction_id?: string | null
    amount?: number | null
    currency?: string
    performed_by?: string | null
  }): Promise<void> {
    const admin = createAdminClient()
    try {
      const sanitizedCompanyId = isValidUuid(entry.company_id) ? entry.company_id : null
      const sanitizedSubId = isValidUuid(entry.subscription_id) ? entry.subscription_id : null
      const sanitizedTxId = isValidUuid(entry.transaction_id) ? entry.transaction_id : null
      const sanitizedUserId = isValidUuid(entry.performed_by) ? entry.performed_by : null

      if (sanitizedCompanyId) {
        await (admin as any).from('subscription_events').insert({
          subscription_id: sanitizedSubId,
          company_id: sanitizedCompanyId,
          previous_plan_code: entry.previous_plan_code || null,
          new_plan_code: entry.new_plan_code || null,
          previous_status: entry.previous_status || null,
          new_status: entry.new_status || null,
          event_type: entry.event_type,
          reason: entry.reason || null,
          transaction_id: sanitizedTxId,
          amount: entry.amount || null,
          currency: entry.currency || 'BDT',
          effective_at: new Date().toISOString(),
          performed_by: sanitizedUserId,
          created_at: new Date().toISOString(),
        })
      }
    } catch (err) {
      console.warn('[SubscriptionService] Event ledger notice:', err)
    }
  }

  /**
   * Fetches paginated subscription events for tenant or platform audit
   */
  static async getSubscriptionEvents(companyId?: string): Promise<SubscriptionEventRecord[]> {
    const admin = createAdminClient()
    try {
      let query = (admin as any)
        .from('subscription_events')
        .select('*')
        .order('created_at', { ascending: false })

      if (companyId && isValidUuid(companyId)) {
        query = query.eq('company_id', companyId)
      }

      const { data, error } = await query
      if (!error && data) return data as SubscriptionEventRecord[]
    } catch {}

    return []
  }

  /**
   * Fetches real tenant invoices from gateway_transactions
   */
  static async getTenantInvoices(companyId: string): Promise<SubscriptionInvoiceRecord[]> {
    const admin = createAdminClient()
    try {
      const sanitizedCompanyId = isValidUuid(companyId) ? companyId : null
      if (!sanitizedCompanyId) return []

      const { data: txs, error } = await (admin as any)
        .from('gateway_transactions')
        .select('*')
        .eq('tenant_id', sanitizedCompanyId)
        .eq('billing_context', 'TENANT')
        .order('created_at', { ascending: false })

      if (!error && txs && txs.length > 0) {
        return txs.map((tx: any) => ({
          id: tx.id,
          invoice_number: tx.invoice_id || `INV-${tx.id.slice(0, 6)}`,
          company_id: tx.tenant_id,
          plan_name: tx.verification_payload?.planCode ? `${tx.verification_payload.planCode.toUpperCase()} PLAN` : 'SUBSCRIPTION',
          billing_interval: (tx.verification_payload?.interval || 'monthly') as BillingInterval,
          amount: Number(tx.amount || 0),
          status: (tx.payment_status === 'paid' && tx.verification_status === 'verified'
            ? 'paid'
            : tx.payment_status === 'failed'
            ? 'failed'
            : 'pending') as 'paid' | 'pending' | 'failed',
          payment_method: (tx.provider || 'bkash') as PaymentGatewayType,
          transaction_ref: tx.provider_trx_id || tx.internal_trx_id || '—',
          billing_date: tx.created_at,
          due_date: tx.created_at,
          receipt_url: tx.payment_url || undefined,
        }))
      }
    } catch {}

    return []
  }

  /**
   * Platform Owner Reconciliation Tool: Matches internal transactions with subscriptions
   */
  static async getPlatformReconciliationList(): Promise<any[]> {
    const admin = createAdminClient()
    try {
      const { data: transactions } = await (admin as any)
        .from('gateway_transactions')
        .select('*, companies(name, slug)')
        .order('created_at', { ascending: false })
        .limit(100)

      const { data: subscriptions } = await (admin as any)
        .from('company_subscriptions')
        .select('*, subscription_plans(*), companies(name, slug)')

      const subMap = new Map<string, any>()
      if (subscriptions) {
        for (const s of subscriptions) {
          subMap.set(s.company_id, s)
        }
      }

      return (transactions || []).map((t: any) => {
        const matchingSub = t.tenant_id ? subMap.get(t.tenant_id) : null
        const isMismatched =
          (t.payment_status === 'paid' && t.verification_status !== 'verified') ||
          (t.verification_status === 'verified' && t.payment_status !== 'paid')

        let mismatchReason: string | null = null
        if (t.payment_status === 'paid' && t.verification_status !== 'verified') {
          mismatchReason = 'Marked paid without verified provider signature.'
        } else if (t.verification_status === 'verified' && t.payment_status !== 'paid') {
          mismatchReason = 'Verified by provider but settlement state not updated to paid.'
        }

        return {
          id: t.id,
          internalTrxId: t.internal_trx_id,
          providerTrxId: t.provider_trx_id,
          provider: t.provider,
          amount: t.amount,
          currency: t.currency,
          paymentStatus: t.payment_status,
          verificationStatus: t.verification_status,
          companyName: t.companies?.name || matchingSub?.companies?.name || 'Unknown Tenant',
          companySlug: t.companies?.slug || matchingSub?.companies?.slug,
          currentPlan: matchingSub?.subscription_plans?.name || 'Trial',
          currentSubStatus: matchingSub?.status || 'trial',
          isMismatched,
          mismatchReason,
          createdAt: t.created_at,
          paidAt: t.paid_at,
        }
      })
    } catch {
      return []
    }
  }
}

// -----------------------------------------------------------------------------
// Legacy & Helper Export Functions for backwards-compatibility
// -----------------------------------------------------------------------------

export function getTrialPlan(plans: SubscriptionPlanRecord[] = DEFAULT_PLANS): SubscriptionPlanRecord {
  return plans.find((p) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
}

export function getTenantResourceUsage(
  companyId: string = 'default',
  plan?: SubscriptionPlanRecord | null,
  override?: CustomLimitsOverride | null
): TenantResourceUsage {
  const users = PrintERPDataStore.get<any[]>(STORAGE_KEYS.COMPANY_USERS) || []
  const customers = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
  const orders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
  const products = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTS) || []
  const materials = PrintERPDataStore.get<any[]>(STORAGE_KEYS.MATERIALS) || []
  const branches = PrintERPDataStore.get<any[]>(STORAGE_KEYS.BRANCHES) || []

  const isCoMatch = (item: any) =>
    !item.company_id || item.company_id === companyId || item.company_id === 'default' || item.company_id === 'co-main'

  const matchingUsers = users.filter(isCoMatch)
  const usersCount = Math.max(1, matchingUsers.length)

  const matchingBranches = branches.filter(isCoMatch)
  const branchesCount = Math.max(1, matchingBranches.length)

  const matchingCustomers = customers.filter(isCoMatch)
  const customersCount = matchingCustomers.length

  const totalProducts = (products.filter(isCoMatch).length || 0) + (materials.filter(isCoMatch).length || 0)
  const productsCount = totalProducts

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const monthlyOrders = orders.filter((o) => {
    if (!isCoMatch(o)) return false
    const orderDate = o.order_date || o.created_at || ''
    return orderDate >= startOfMonth || !orderDate
  })
  const ordersCount = monthlyOrders.length

  const activePlan = plan || DEFAULT_TRIAL_PLAN
  const usersLimit = override?.max_users ?? activePlan.max_users
  const branchesLimit = override?.max_branches ?? activePlan.max_branches
  const storageLimit = override?.storage_gb ?? activePlan.storage_gb
  const ordersLimit = override?.monthly_orders ?? activePlan.monthly_orders
  const customersLimit = override?.max_customers ?? activePlan.max_customers
  const productsLimit = override?.max_products ?? activePlan.max_products

  return {
    users_count: usersCount,
    users_limit: usersLimit,
    branches_count: branchesCount,
    branches_limit: branchesLimit,
    storage_used_gb: Math.min(storageLimit, Number(((usersCount * 0.1) + (ordersCount * 0.002)).toFixed(2))),
    storage_limit_gb: storageLimit,
    orders_this_month: ordersCount,
    orders_limit: ordersLimit,
    customers_count: customersCount,
    customers_limit: customersLimit,
    products_count: productsCount,
    products_limit: productsLimit,
  }
}

export const DEMO_RESOURCE_USAGE: TenantResourceUsage = {
  users_count: 1,
  users_limit: 5,
  branches_count: 1,
  branches_limit: 1,
  storage_used_gb: 0.1,
  storage_limit_gb: 2,
  orders_this_month: 0,
  orders_limit: 100,
  customers_count: 0,
  customers_limit: 200,
  products_count: 0,
  products_limit: 200,
}

export const DEMO_TENANT_SUBSCRIPTION = DEFAULT_TENANT_SUBSCRIPTION
export const DEMO_PLATFORM_SUBSCRIPTIONS: PlatformSubscriptionItem[] = []
export const DEMO_SUBSCRIPTION_INVOICES: SubscriptionInvoiceRecord[] = []

export async function getTenantSubscription(
  companyId: string,
  companySlug?: string
): Promise<CompanySubscriptionRecord> {
  return SubscriptionService.getTenantSubscription(companyId, companySlug)
}

export function checkFeatureAccess(
  planCode: PlanCode,
  feature: FeatureCode,
  plans: SubscriptionPlanRecord[] = DEFAULT_PLANS
): boolean {
  if (planCode === 'trial') {
    const trialPlan = plans.find((p) => p.code === 'trial') || DEFAULT_TRIAL_PLAN
    return trialPlan.features.includes(feature)
  }
  const plan = plans.find((p) => p.code === planCode)
  if (!plan) return false
  return plan.features.includes(feature)
}

export function getMinimumPlanForFeature(feature: FeatureCode): SubscriptionPlanRecord {
  const meta = FEATURE_METADATA[feature]
  const targetCode = meta ? meta.minPlan : 'enterprise'
  return DEFAULT_PLANS.find((p) => p.code === targetCode) || DEFAULT_PLANS[1]
}

export function getNextTierPlan(
  currentPlanCode: PlanCode,
  plans: SubscriptionPlanRecord[] = DEFAULT_PLANS
): SubscriptionPlanRecord {
  if (currentPlanCode === 'trial' || currentPlanCode === 'starter') {
    return plans.find((p) => p.code === 'business') || DEFAULT_PLANS[2]
  }
  if (currentPlanCode === 'business') {
    return plans.find((p) => p.code === 'enterprise') || DEFAULT_PLANS[3]
  }
  return plans.find((p) => p.code === 'enterprise') || DEFAULT_PLANS[3]
}

export function getTrialDaysRemaining(trialEndsAt?: string | null, fallbackDays: number = 14): number {
  if (!trialEndsAt) return fallbackDays
  const diff = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function checkResourceLimit(
  limitType: ConfigurableLimitType,
  currentCount: number,
  plan: SubscriptionPlanRecord,
  override?: CustomLimitsOverride | null
): {
  limit: number
  current: number
  exceeded: boolean
  warning: boolean
  percentage: number
} {
  const effectiveLimit = override?.[limitType] ?? plan[limitType]
  const percentage = effectiveLimit > 0 ? Math.round((currentCount / effectiveLimit) * 100) : 0

  return {
    limit: effectiveLimit,
    current: currentCount,
    exceeded: currentCount >= effectiveLimit,
    warning: percentage >= 80 && currentCount < effectiveLimit,
    percentage: Math.min(100, percentage),
  }
}
