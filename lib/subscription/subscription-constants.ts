// ==============================================================================
// PrintERP SaaS - Subscription Plan Constants & Pure Utility Functions
// Client-Safe: Zero Node.js or Database Server Dependencies
// ==============================================================================

import type {
  SubscriptionPlanRecord,
  CompanySubscriptionRecord,
  TenantResourceUsage,
  PlatformSubscriptionItem,
  FeatureCode,
  PlanCode,
  ConfigurableLimitType,
  CustomLimitsOverride,
  SubscriptionInvoiceRecord,
  TenantAccountType,
  TenantAccountTypeMeta,
} from '../../types/subscription.types.ts'
import { PrintERPDataStore, STORAGE_KEYS } from '../db/data-store.ts'

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

export const DEMO_TENANT_SUBSCRIPTION = DEFAULT_TENANT_SUBSCRIPTION

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

export const DEMO_PLATFORM_SUBSCRIPTIONS: PlatformSubscriptionItem[] = []
export const DEMO_SUBSCRIPTION_INVOICES: SubscriptionInvoiceRecord[] = []

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

  const isCoMatch = (item: any) => {
    if (!item) return false
    if (!item.company_id) return true
    if (item.company_id === companyId) return true
    if (companyId === 'default' || companyId === 'co-main') {
      return item.company_id === 'default' || item.company_id === 'co-main' || item.company_id === 'c-01'
    }
    return false
  }

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

  let activePlan = plan
  if (!activePlan) {
    if (typeof window !== 'undefined') {
      try {
        const storedPlans = PrintERPDataStore.get<SubscriptionPlanRecord[]>(STORAGE_KEYS.PLATFORM_PLANS) || DEFAULT_PLANS
        const storedSubs = PrintERPDataStore.get<Record<string, CompanySubscriptionRecord>>(STORAGE_KEYS.COMPANY_SUBSCRIPTIONS)
        const compSub = storedSubs?.[companyId]

        if (compSub && storedPlans.length > 0) {
          activePlan =
            storedPlans.find((p) => p.id === compSub.plan_id || p.code === compSub.plan_code) ||
            storedPlans.find((p) => p.code === 'trial') ||
            storedPlans[0]
        } else if (storedPlans && storedPlans.length > 0) {
          activePlan = storedPlans.find((p) => p.code === 'trial') || storedPlans[0]
        }
      } catch {}
    }
  }
  if (!activePlan) {
    activePlan = DEFAULT_TRIAL_PLAN
  }
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

export function getMinimumPlanForFeature(
  feature: FeatureCode,
  plans: SubscriptionPlanRecord[] = DEFAULT_PLANS
): SubscriptionPlanRecord {
  const matchingPlan = [...plans]
    .filter((p) => p.code !== 'trial' && p.is_active !== false && Array.isArray(p.features) && p.features.includes(feature))
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.price_monthly - b.price_monthly)[0]

  if (matchingPlan) return matchingPlan

  const meta = FEATURE_METADATA[feature]
  const targetCode = meta ? meta.minPlan : 'enterprise'
  return plans.find((p) => p.code === targetCode) || plans.find((p) => p.code === 'business') || DEFAULT_PLANS[1]
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

const BENGALI_DIGITS_MAP: Record<string, string> = {
  '0': '০',
  '1': '১',
  '2': '২',
  '3': '৩',
  '4': '৪',
  '5': '৫',
  '6': '৬',
  '7': '৭',
  '8': '৮',
  '9': '৯',
}

export function toBengaliDigits(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return ''
  return String(num)
    .split('')
    .map((char) => BENGALI_DIGITS_MAP[char] || char)
    .join('')
}

export interface SubscriptionExpiryCountdown {
  totalMs: number
  days: number
  hours: number
  minutes: number
  seconds: number
  isExpired: boolean
  formattedEn: string
  formattedBn: string
  statusBadgeEn: string
  statusBadgeBn: string
}

export function getSubscriptionTimeRemaining(expiryDateIso?: string | null): SubscriptionExpiryCountdown {
  if (!expiryDateIso) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formattedEn: 'Expired',
      formattedBn: 'মেয়াদ শেষ',
      statusBadgeEn: 'Expired',
      statusBadgeBn: 'মেয়াদ শেষ',
    }
  }

  const targetTime = new Date(expiryDateIso).getTime()
  if (isNaN(targetTime)) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formattedEn: 'Expired',
      formattedBn: 'মেয়াদ শেষ',
      statusBadgeEn: 'Expired',
      statusBadgeBn: 'মেয়াদ শেষ',
    }
  }

  const diff = targetTime - Date.now()

  if (diff <= 0) {
    return {
      totalMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      formattedEn: 'Expired',
      formattedBn: 'মেয়াদ শেষ',
      statusBadgeEn: 'Expired',
      statusBadgeBn: 'মেয়াদ শেষ',
    }
  }

  const totalSeconds = Math.floor(diff / 1000)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const totalDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))

  let formattedEn = ''
  let formattedBn = ''

  if (days > 0) {
    formattedEn = `${days}d ${hours}h left`
    formattedBn = `${toBengaliDigits(days)} দিন ${toBengaliDigits(hours)} ঘণ্টা বাকি`
  } else if (hours > 0) {
    formattedEn = `${hours}h ${minutes}m left`
    formattedBn = `${toBengaliDigits(hours)} ঘণ্টা ${toBengaliDigits(minutes)} মিনিট বাকি`
  } else {
    formattedEn = `${minutes}m ${seconds}s left`
    formattedBn = `${toBengaliDigits(minutes)} মিনিট ${toBengaliDigits(seconds)} সেকেন্ড বাকি`
  }

  return {
    totalMs: diff,
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    formattedEn,
    formattedBn,
    statusBadgeEn: days > 0 ? `${totalDays}d left` : hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m ${seconds}s left`,
    statusBadgeBn: days > 0 ? `${toBengaliDigits(totalDays)} দিন বাকি` : hours > 0 ? `${toBengaliDigits(hours)} ঘণ্টা ${toBengaliDigits(minutes)} মি. বাকি` : `${toBengaliDigits(minutes)} মি. বাকি`,
  }
}

export function getTrialDaysRemaining(trialEndsAt?: string | null): number {
  if (!trialEndsAt) return 0
  const time = new Date(trialEndsAt).getTime()
  if (isNaN(time)) return 0
  const diff = time - Date.now()
  if (diff <= 0) return 0
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function checkResourceLimit(
  limitType: ConfigurableLimitType,
  currentCount: number,
  plan: SubscriptionPlanRecord,
  override?: CustomLimitsOverride | null
): {
  allowed: boolean
  limit: number
  current: number
  exceeded: boolean
  warning: boolean
  percentage: number
} {
  const effectiveLimit = override?.[limitType] ?? plan[limitType]

  // Negative, zero, or >= 99999 represents unlimited capacity
  if (effectiveLimit <= 0 || effectiveLimit >= 99999) {
    return {
      allowed: true,
      limit: effectiveLimit,
      current: currentCount,
      exceeded: false,
      warning: false,
      percentage: 0,
    }
  }

  const percentage = Math.round((currentCount / effectiveLimit) * 100)
  const exceeded = currentCount >= effectiveLimit

  return {
    allowed: !exceeded,
    limit: effectiveLimit,
    current: currentCount,
    exceeded,
    warning: percentage >= 80 && currentCount < effectiveLimit,
    percentage: Math.min(100, percentage),
  }
}
