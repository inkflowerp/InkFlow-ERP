// ==============================================================================
// PrintERP SaaS - Personalized Dashboard & Quick Action Engine
// Authorizes, calculates, and renders personalized dashboard metrics,
// tasks, attention items, and prioritized quick actions based on:
// Authenticated User, Tenant, Branch, Responsibilities (Multi-Role),
// Permissions, Data Scope, and Live Operational Workflow State.
// ==============================================================================

import {
  PrimaryRole,
  ResponsibilitySlug,
  PermissionModule,
  PermissionAction,
  DataScope,
} from '@/types/rbac.types'
import {
  UserPermissionContext,
  checkPermission,
  getEffectiveDataScope,
  extractResponsibilities,
  checkDataScopeAccess,
} from '@/lib/auth/rbac.client'
import { CustomerRecord } from '@/types/crm.types'
import { SalesOrderRecord, JobOrderRecord } from '@/types/order.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { ProductionJobRecord } from '@/types/production.types'
import { DesignJobRecord } from '@/types/design.types'
import { DeliveryChallanRecord } from '@/types/logistics.types'
import { MaterialRecord } from '@/types/inventory.types'
import { ExpenseRecord } from '@/types/accounting.types'

export interface DashboardMetricItem {
  id: string
  labelEn: string
  labelBn: string
  value: string | number
  unitEn?: string
  unitBn?: string
  changeTextEn?: string
  changeTextBn?: string
  changeType?: 'positive' | 'negative' | 'neutral'
  subtitleEn?: string
  subtitleBn?: string
  colorVariant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'amber'
  icon: string
  href?: string
  requiresPermission?: string
}

export interface QuickActionItem {
  id: string
  labelEn: string
  labelBn: string
  icon: string
  actionType: 'modal' | 'route'
  target: string
  requiredPermission: string
  responsibilities: ResponsibilitySlug[]
  priority: number // Lower number = higher priority
  mobilePriority: number // Priority rank on mobile devices
  badgeEn?: string
  badgeBn?: string
  colorVariant?: 'blue' | 'purple' | 'emerald' | 'indigo' | 'amber' | 'teal' | 'red' | 'cyan'
}

export interface AttentionItem {
  id: string
  titleEn: string
  titleBn: string
  subtitleEn: string
  subtitleBn: string
  severity: 'urgent' | 'warning' | 'info'
  actionLabelEn: string
  actionLabelBn: string
  actionType: 'route' | 'modal' | 'event'
  actionTarget: string
  metadata?: Record<string, unknown>
}

export interface MyWorkItem {
  id: string
  code: string
  titleEn: string
  titleBn: string
  customerName: string
  type: 'design' | 'production' | 'delivery' | 'sales' | 'finishing' | 'fabrication' | 'store'
  status: string
  statusLabelEn: string
  statusLabelBn: string
  specs: string
  deadline?: string
  startedAt?: string
  priority?: 'normal' | 'urgent' | 'very_urgent'
  primaryActionLabelEn?: string
  primaryActionLabelBn?: string
  primaryActionType?: string
  secondaryActionLabelEn?: string
  secondaryActionLabelBn?: string
  secondaryActionType?: string
  assignedTo?: string
  rawRecord?: unknown
}

export interface DashboardRawData {
  orders?: SalesOrderRecord[]
  jobOrders?: JobOrderRecord[]
  productionJobs?: ProductionJobRecord[]
  designJobs?: DesignJobRecord[]
  customers?: CustomerRecord[]
  invoices?: InvoiceRecord[]
  payments?: PaymentRecord[]
  expenses?: ExpenseRecord[]
  materials?: MaterialRecord[]
  deliveryChallans?: DeliveryChallanRecord[]
}

// Master list of all possible quick actions in PrintERP
export const MASTER_QUICK_ACTIONS: QuickActionItem[] = [
  // 1. Work Order / Design Creation
  {
    id: 'add_work_order',
    labelEn: '+ Add Work Order',
    labelBn: '+ নতুন ওয়ার্ক অর্ডার',
    icon: 'FileSpreadsheet',
    actionType: 'modal',
    target: 'work_order',
    requiredPermission: 'orders.create',
    responsibilities: ['designer', 'sales_manager', 'business_owner'],
    priority: 1,
    mobilePriority: 1,
    colorVariant: 'indigo',
  },
  // 2. New Customer
  {
    id: 'new_customer',
    labelEn: '+ New Customer',
    labelBn: '+ নতুন গ্রাহক',
    icon: 'Users',
    actionType: 'modal',
    target: 'customer',
    requiredPermission: 'customers.create',
    responsibilities: ['sales_manager', 'business_owner', 'accountant'],
    priority: 2,
    mobilePriority: 2,
    colorVariant: 'blue',
  },
  // 3. New Quotation
  {
    id: 'new_quotation',
    labelEn: '+ Quotation',
    labelBn: '+ কোটেশন তৈরি',
    icon: 'FileText',
    actionType: 'route',
    target: '/quotations',
    requiredPermission: 'quotations.create',
    responsibilities: ['sales_manager', 'business_owner'],
    priority: 3,
    mobilePriority: 3,
    colorVariant: 'purple',
  },
  // 4. Record Payment
  {
    id: 'record_payment',
    labelEn: 'Record Payment (MR)',
    labelBn: 'পেমেন্ট গ্রহণ (মানি রসিদ)',
    icon: 'Receipt',
    actionType: 'modal',
    target: 'payment',
    requiredPermission: 'payments.create',
    responsibilities: ['accountant', 'business_owner', 'sales_manager'],
    priority: 4,
    mobilePriority: 4,
    colorVariant: 'emerald',
  },
  // 5. Create Commercial Invoice
  {
    id: 'create_invoice',
    labelEn: '+ Create Invoice',
    labelBn: '+ ইনভয়েস তৈরি',
    icon: 'FileText',
    actionType: 'route',
    target: '/billing?action=create',
    requiredPermission: 'invoices.create',
    responsibilities: ['sales_manager', 'accountant', 'business_owner'],
    priority: 5,
    mobilePriority: 5,
    colorVariant: 'blue',
  },
  // 6. Machine Floor Actions (Operator)
  {
    id: 'operator_my_jobs',
    labelEn: 'My Print Queue',
    labelBn: 'মেশিন কিউ',
    icon: 'Printer',
    actionType: 'route',
    target: '/operator',
    requiredPermission: 'production.view',
    responsibilities: ['operator', 'production_manager'],
    priority: 1,
    mobilePriority: 1,
    colorVariant: 'purple',
  },
  {
    id: 'operator_report_problem',
    labelEn: 'Report Issue / Scrap',
    labelBn: 'সমস্যা / ছাঁটাই রিপোর্ট',
    icon: 'AlertTriangle',
    actionType: 'modal',
    target: 'report_problem',
    requiredPermission: 'production.edit',
    responsibilities: ['operator', 'production_manager'],
    priority: 3,
    mobilePriority: 3,
    colorVariant: 'red',
  },
  // 7. Production Management
  {
    id: 'production_board',
    labelEn: 'Production Board',
    labelBn: 'প্রোডাকশন বোর্ড',
    icon: 'Layers',
    actionType: 'route',
    target: '/production',
    requiredPermission: 'production.view',
    responsibilities: ['production_manager', 'business_owner'],
    priority: 2,
    mobilePriority: 2,
    colorVariant: 'purple',
  },
  {
    id: 'add_material_stock',
    labelEn: '+ Add Stock / Media',
    labelBn: '+ নতুন কাঁচামাল স্টক',
    icon: 'Package',
    actionType: 'modal',
    target: 'material',
    requiredPermission: 'inventory.create',
    responsibilities: ['store_manager', 'production_manager', 'business_owner'],
    priority: 4,
    mobilePriority: 4,
    colorVariant: 'teal',
  },
  // 8. Delivery Logistics Actions
  {
    id: 'delivery_board',
    labelEn: 'Delivery Board',
    labelBn: 'ডেলিভারি বোর্ড',
    icon: 'Truck',
    actionType: 'route',
    target: '/delivery',
    requiredPermission: 'delivery.view',
    responsibilities: ['delivery_coordinator', 'sales_manager', 'business_owner'],
    priority: 3,
    mobilePriority: 3,
    colorVariant: 'amber',
  },
  {
    id: 'create_challan',
    labelEn: '+ Create Challan',
    labelBn: '+ ডেলিভারি চালান',
    icon: 'Truck',
    actionType: 'route',
    target: '/delivery',
    requiredPermission: 'delivery.create',
    responsibilities: ['delivery_coordinator', 'sales_manager', 'business_owner'],
    priority: 5,
    mobilePriority: 5,
    colorVariant: 'amber',
  },
  // 9. Financial Expenses & Accounting
  {
    id: 'add_expense',
    labelEn: '+ Add Expense',
    labelBn: '+ খরচ এন্ট্রি',
    icon: 'DollarSign',
    actionType: 'modal',
    target: 'expense',
    requiredPermission: 'payments.create',
    responsibilities: ['accountant', 'business_owner'],
    priority: 6,
    mobilePriority: 6,
    colorVariant: 'red',
  },
  {
    id: 'due_list',
    labelEn: 'Receivables / Due List',
    labelBn: 'বাকি তালিকা',
    icon: 'CreditCard',
    actionType: 'route',
    target: '/billing?tab=due',
    requiredPermission: 'invoices.view',
    responsibilities: ['accountant', 'sales_manager', 'business_owner'],
    priority: 7,
    mobilePriority: 7,
    colorVariant: 'red',
  },
  // 10. Reports & Settings
  {
    id: 'view_reports',
    labelEn: 'Business Reports',
    labelBn: 'রিপোর্ট ও অ্যানালিটিক্স',
    icon: 'BarChart3',
    actionType: 'route',
    target: '/reports',
    requiredPermission: 'reports.view',
    responsibilities: ['business_owner', 'accountant'],
    priority: 8,
    mobilePriority: 8,
    colorVariant: 'blue',
  },
  {
    id: 'manage_users',
    labelEn: 'Users & Permissions',
    labelBn: 'ইউজার ও এক্সেস',
    icon: 'ShieldCheck',
    actionType: 'route',
    target: '/settings/users',
    requiredPermission: 'settings.manage',
    responsibilities: ['business_owner'],
    priority: 9,
    mobilePriority: 9,
    colorVariant: 'purple',
  },
]

/**
 * Resolves allowed, authorized, and prioritized quick actions for a user.
 * Merges actions across all active responsibilities, avoiding duplicates.
 */
export function getAllowedQuickActions(
  userCtx: UserPermissionContext,
  options?: {
    isMobile?: boolean
    maxCount?: number
  }
): {
  primaryActions: QuickActionItem[]
  secondaryActions: QuickActionItem[]
  allAllowedActions: QuickActionItem[]
} {
  const isMobile = options?.isMobile ?? false
  const userResponsibilities = extractResponsibilities(userCtx)
  const isOwner =
    userCtx.isOwner ||
    userCtx.primaryRole === 'business_owner' ||
    userCtx.primaryRole === 'platform_owner' ||
    userResponsibilities.includes('business_owner')

  // Filter actions by responsibility and permission
  const allowed = MASTER_QUICK_ACTIONS.filter((action) => {
    // 1. Responsibility match: action matches any of user's active responsibilities OR user is Owner
    const respMatch =
      isOwner ||
      action.responsibilities.some((r) => userResponsibilities.includes(r))

    if (!respMatch) return false

    // 2. Permission check: user has required permission
    const hasPerm = checkPermission(userCtx, action.requiredPermission)
    return hasPerm
  })

  // Sort by priority (or mobile priority if mobile)
  const sorted = [...allowed].sort((a, b) => {
    if (isMobile) {
      return (a.mobilePriority || a.priority) - (b.mobilePriority || b.priority)
    }
    return a.priority - b.priority
  })

  // Split into primary (featured) and secondary (accessible in More)
  const primaryLimit = isMobile ? (options?.maxCount ?? 4) : (options?.maxCount ?? 6)
  const primaryActions = sorted.slice(0, primaryLimit)
  const secondaryActions = sorted.slice(primaryLimit)

  return {
    primaryActions,
    secondaryActions,
    allAllowedActions: sorted,
  }
}

/**
 * Filter items by user data scope and branch
 */
export function filterItemsByScope<T extends Record<string, any>>(
  items: T[],
  userCtx: UserPermissionContext,
  moduleName: PermissionModule,
  branchId?: string | null
): T[] {
  if (!Array.isArray(items) || items.length === 0) return []

  const isOwner =
    userCtx.isOwner ||
    userCtx.primaryRole === 'business_owner' ||
    userCtx.primaryRole === 'platform_owner' ||
    userCtx.responsibilities?.includes('business_owner')

  const scope = getEffectiveDataScope(userCtx, moduleName)
  const userFullNames = [
    userCtx.userId,
    userCtx.role,
    userCtx.primaryRole,
  ].filter(Boolean)

  return items.filter((item) => {
    // Branch filter
    if (
      branchId &&
      item.branch_id &&
      item.branch_id !== branchId &&
      !isOwner
    ) {
      return false
    }

    if (isOwner || scope === 'company') {
      return true
    }

    // Context check for own / assigned / department
    const recordOwnerId = item.customer_id || item.user_id || item.created_by || item.salesperson_name
    const recordAssigneeId =
      item.assigned_employee_name ||
      item.designer_name ||
      (Array.isArray(item.assigned_workers) ? item.assigned_workers[0] : null)
    const recordDepartment = item.assigned_department || item.department

    return checkDataScopeAccess(scope, {
      userId: userCtx.userId || '',
      userDepartment: userCtx.role || null,
      userBranchId: branchId || null,
      recordOwnerId,
      recordAssigneeId,
      recordDepartment,
      isOwnerOrAdmin: isOwner,
    })
  })
}

/**
 * Computes personalized, permission-guarded dashboard metric cards
 */
export function getDashboardMetrics(
  userCtx: UserPermissionContext,
  data: DashboardRawData,
  branchId?: string | null
): DashboardMetricItem[] {
  const responsibilities = extractResponsibilities(userCtx)
  const metrics: DashboardMetricItem[] = []

  const canViewFinances =
    checkPermission(userCtx, 'invoices.view') ||
    checkPermission(userCtx, 'payments.view') ||
    checkPermission(userCtx, 'reports.view')

  const canViewOrders = checkPermission(userCtx, 'orders.view')
  const canViewDesign = checkPermission(userCtx, 'design.view')
  const canViewProduction = checkPermission(userCtx, 'production.view')
  const canViewDelivery = checkPermission(userCtx, 'delivery.view')
  const canViewInventory = checkPermission(userCtx, 'inventory.view')

  const orders = filterItemsByScope(data.orders || [], userCtx, 'orders', branchId)
  const invoices = filterItemsByScope(data.invoices || [], userCtx, 'invoices', branchId)
  const payments = filterItemsByScope(data.payments || [], userCtx, 'payments', branchId)
  const productionJobs = filterItemsByScope(data.productionJobs || [], userCtx, 'production', branchId)
  const designJobs = filterItemsByScope(data.designJobs || [], userCtx, 'design', branchId)
  const deliveryChallans = filterItemsByScope(data.deliveryChallans || [], userCtx, 'delivery', branchId)
  const materials = filterItemsByScope(data.materials || [], userCtx, 'inventory', branchId)

  // 1. FINANCIAL METRICS (Only for Authorized Financial Roles: Owner, Manager, Accounts, Sales)
  if (canViewFinances) {
    const today = new Date().toISOString().split('T')[0]

    // Calculate today's sales and collection
    const todayOrders = orders.filter((o) => o.order_date === today || o.created_at?.startsWith(today))
    const todaySales = todayOrders.reduce((sum, o) => sum + (o.final_price || 0), 0)

    const todayPayments = payments.filter((p) => p.payment_date === today || p.created_at?.startsWith(today))
    const todayCollection = todayPayments.reduce((sum, p) => sum + (p.amount || 0), 0)

    const totalDue = orders.reduce((sum, o) => sum + (o.due_amount || 0), 0)

    metrics.push({
      id: 'today_sales',
      labelEn: "Today's Sales",
      labelBn: 'আজকের সেলস',
      value: todaySales,
      unitEn: 'BDT',
      unitBn: 'টাকা',
      subtitleEn: `${todayOrders.length} order(s) today`,
      subtitleBn: `আজকে ${todayOrders.length}টি অর্ডার`,
      icon: 'TrendingUp',
      colorVariant: 'success',
      requiresPermission: 'orders.view',
    })

    metrics.push({
      id: 'today_collection',
      labelEn: "Today's Collection",
      labelBn: 'আজকের আদায়',
      value: todayCollection,
      unitEn: 'BDT',
      unitBn: 'টাকা',
      subtitleEn: `${todayPayments.length} collection(s) today`,
      subtitleBn: `আজকে ${todayPayments.length}টি জমা`,
      icon: 'Receipt',
      colorVariant: 'success',
      requiresPermission: 'payments.view',
    })

    metrics.push({
      id: 'total_due',
      labelEn: 'Total Receivable',
      labelBn: 'মোট বাকি টাকা',
      value: totalDue,
      unitEn: 'BDT',
      unitBn: 'টাকা',
      subtitleEn: 'Customer accounts pending',
      subtitleBn: 'গ্রাহক বকেয়া হিসাব',
      icon: 'AlertCircle',
      colorVariant: totalDue > 0 ? 'danger' : 'default',
      requiresPermission: 'invoices.view',
    })
  }

  // 2. DESIGNER METRICS (Designer responsibility or multi-role with design)
  if (canViewDesign && (responsibilities.includes('designer') || responsibilities.includes('business_owner'))) {
    const activeDesigns = designJobs.filter((d) => d.status !== 'approved')
    const waitingApproval = designJobs.filter((d) => d.status === 'customer_approval')
    const approvedToday = designJobs.filter((d) => d.status === 'approved')

    metrics.push({
      id: 'active_designs',
      labelEn: 'Active Design Jobs',
      labelBn: 'চলতি ডিজাইন কাজ',
      value: activeDesigns.length,
      subtitleEn: 'Assigned artwork queue',
      subtitleBn: 'বরাদ্দকৃত আর্টওয়ার্ক কিউ',
      icon: 'Layers',
      colorVariant: 'info',
      requiresPermission: 'design.view',
    })

    metrics.push({
      id: 'waiting_approval',
      labelEn: 'Waiting Customer Approval',
      labelBn: 'গ্রাহক অনুমোদনের অপেক্ষায়',
      value: waitingApproval.length,
      subtitleEn: 'Proofs sent to clients',
      subtitleBn: 'প্রুফ পাঠানো হয়েছে',
      icon: 'Clock',
      colorVariant: 'amber',
      requiresPermission: 'design.view',
    })

    metrics.push({
      id: 'approved_today',
      labelEn: 'Approved Today',
      labelBn: 'আজকের অনুমোদিত ফাইল',
      value: approvedToday.length,
      subtitleEn: 'Ready for Press & RIP',
      subtitleBn: 'প্রেস ও আরআইপিতে প্রস্তুত',
      icon: 'CheckCircle2',
      colorVariant: 'success',
      requiresPermission: 'design.view',
    })
  }

  // 3. PRODUCTION & OPERATOR METRICS
  if (canViewProduction) {
    const queuedJobs = productionJobs.filter((p) => p.status === 'queued')
    const inProgressJobs = productionJobs.filter((p) => p.status === 'in_progress')
    const completedJobs = productionJobs.filter((p) => p.status === 'completed')

    metrics.push({
      id: 'production_queue',
      labelEn: 'Production Queue',
      labelBn: 'মেশিন কিউ',
      value: queuedJobs.length + inProgressJobs.length,
      subtitleEn: 'Active print runs',
      subtitleBn: 'চলতি প্রিন্টিং রান',
      icon: 'Printer',
      colorVariant: 'purple',
      requiresPermission: 'production.view',
    })

    metrics.push({
      id: 'production_output',
      labelEn: "Today's Completed Output",
      labelBn: 'আজকের মোট আউটপুট',
      value: completedJobs.length,
      unitEn: 'jobs',
      unitBn: 'টি কাজ',
      subtitleEn: 'Completed print runs',
      subtitleBn: 'সম্পন্ন হওয়া প্রিন্টিং কাজ',
      icon: 'TrendingUp',
      colorVariant: 'success',
      requiresPermission: 'production.view',
    })
  }

  // 4. DELIVERY METRICS
  if (canViewDelivery && (responsibilities.includes('delivery_coordinator') || responsibilities.includes('business_owner') || responsibilities.includes('sales_manager'))) {
    const readyChallans = deliveryChallans.filter((c) => c.status === 'assigned' || c.status === 'scheduled')
    const inTransit = deliveryChallans.filter((c) => c.status === 'out_for_delivery')

    metrics.push({
      id: 'ready_dispatch',
      labelEn: 'Ready for Dispatch',
      labelBn: 'ডেলিভারির জন্য প্রস্তুত',
      value: readyChallans.length,
      subtitleEn: 'QC passed & packed',
      subtitleBn: 'কিউসি সম্পন্ন ও প্যাকেটজাত',
      icon: 'Truck',
      colorVariant: 'info',
      requiresPermission: 'delivery.view',
    })

    metrics.push({
      id: 'in_transit',
      labelEn: 'In-Transit En Route',
      labelBn: 'গাড়িতে রাস্তায় আছে',
      value: inTransit.length,
      subtitleEn: 'Dispatched vehicles',
      subtitleBn: 'রাস্তায় চলমান ডেলিভারি',
      icon: 'Clock',
      colorVariant: 'amber',
      requiresPermission: 'delivery.view',
    })
  }

  // 5. INVENTORY LOW-STOCK METRICS
  if (canViewInventory && (responsibilities.includes('store_manager') || responsibilities.includes('business_owner') || responsibilities.includes('production_manager'))) {
    const lowStock = materials.filter((m) => (m.current_stock || 0) <= (m.min_stock_level || 10))

    metrics.push({
      id: 'low_stock_alerts',
      labelEn: 'Low Stock Alerts',
      labelBn: 'স্টক সতর্কতা',
      value: lowStock.length,
      subtitleEn: 'Items below reorder level',
      subtitleBn: 'রিঅর্ডার মাত্রার নিচে',
      icon: 'AlertTriangle',
      colorVariant: lowStock.length > 0 ? 'warning' : 'default',
      requiresPermission: 'inventory.view',
    })
  }

  // Deduplicate metrics by ID
  const seen = new Set<string>()
  return metrics.filter((m) => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

/**
 * Computes high-priority actionable items that need user attention.
 */
export function getNeedsAttentionItems(
  userCtx: UserPermissionContext,
  data: DashboardRawData,
  branchId?: string | null
): AttentionItem[] {
  const items: AttentionItem[] = []
  const responsibilities = extractResponsibilities(userCtx)

  const canViewFinances = checkPermission(userCtx, 'invoices.view')
  const canViewOrders = checkPermission(userCtx, 'orders.view')
  const canViewDesign = checkPermission(userCtx, 'design.view')
  const canViewProduction = checkPermission(userCtx, 'production.view')
  const canViewInventory = checkPermission(userCtx, 'inventory.view')
  const canViewDelivery = checkPermission(userCtx, 'delivery.view')

  // 1. Delayed Production Jobs
  if (canViewProduction) {
    const prodJobs = filterItemsByScope(data.productionJobs || [], userCtx, 'production', branchId)
    const delayedJobs = prodJobs.filter((p) => p.has_rework || p.priority === 'very_urgent')

    if (delayedJobs.length > 0) {
      items.push({
        id: 'delayed_production_jobs',
        titleEn: `${delayedJobs.length} Urgent / Delayed Print Job(s)`,
        titleBn: `${delayedJobs.length}টি জরুরি / বিলম্বিত প্রিন্টিং কাজ`,
        subtitleEn: 'Exceeded promised delivery turnaround on the machine floor.',
        subtitleBn: 'মেশিন ফ্লোরে নির্ধারিত সময়সীমা অতিক্রম করেছে।',
        severity: 'urgent',
        actionLabelEn: 'Open Machine Floor',
        actionLabelBn: 'মেশিন ফ্লোর দেখুন',
        actionType: 'route',
        actionTarget: '/production',
      })
    }
  }

  // 2. Invoice Requests / Pending billing orders
  if (canViewFinances && (responsibilities.includes('sales_manager') || responsibilities.includes('business_owner') || responsibilities.includes('accountant'))) {
    const ordersNeedingInvoice = filterItemsByScope(data.orders || [], userCtx, 'orders', branchId)
      .filter((o) => o.status === 'confirmed' && o.due_amount > 0)

    if (ordersNeedingInvoice.length > 0) {
      items.push({
        id: 'invoice_requests_pending',
        titleEn: `${ordersNeedingInvoice.length} Order(s) Awaiting Invoice / Payment`,
        titleBn: `${ordersNeedingInvoice.length}টি অর্ডারে ইনভয়েস/বিলিং বাকি`,
        subtitleEn: 'Confirmed orders requiring billing invoices.',
        subtitleBn: 'কনফার্ম হওয়া অর্ডারে অফিসিয়াল ইনভয়েস তৈরি প্রয়োজন।',
        severity: 'warning',
        actionLabelEn: 'Process Invoices',
        actionLabelBn: 'ইনভয়েস করুন',
        actionType: 'route',
        actionTarget: '/billing',
      })
    }
  }

  // 3. Design Revisions
  if (canViewDesign && (responsibilities.includes('designer') || responsibilities.includes('business_owner'))) {
    const designJobs = filterItemsByScope(data.designJobs || [], userCtx, 'design', branchId)
    const revisions = designJobs.filter((d) => d.status === 'revision' || (d.revision_count || 0) > 0)

    if (revisions.length > 0) {
      items.push({
        id: 'design_revisions_pending',
        titleEn: `${revisions.length} Design Proof Revision(s) Requested`,
        titleBn: `${revisions.length}টি ডিজাইন সংশোধনের অনুরোধ এসেছে`,
        subtitleEn: 'Clients provided feedback on submitted proofs.',
        subtitleBn: 'গ্রাহক প্রুফে পরিবর্তনের মন্তব্য দিয়েছেন।',
        severity: 'warning',
        actionLabelEn: 'Open Creative Studio',
        actionLabelBn: 'ডিজাইন স্টুডিও খুলুন',
        actionType: 'route',
        actionTarget: '/design',
      })
    }
  }

  // 4. Low Stock Critical Reorder
  if (canViewInventory && (responsibilities.includes('store_manager') || responsibilities.includes('business_owner'))) {
    const lowStock = filterItemsByScope(data.materials || [], userCtx, 'inventory', branchId)
      .filter((m) => (m.current_stock || 0) <= (m.min_stock_level || 10))

    if (lowStock.length > 0) {
      items.push({
        id: 'low_stock_critical',
        titleEn: `${lowStock.length} Item(s) Below Minimum Stock Level`,
        titleBn: `${lowStock.length}টি আইটেম সর্বনিম্ন স্টকের নিচে`,
        subtitleEn: `${lowStock.slice(0, 2).map((m) => m.name).join(', ')} require reordering.`,
        subtitleBn: 'কারখানার জরুরি রিজার্ভ লেভেলের নিচে নেমে গেছে।',
        severity: 'warning',
        actionLabelEn: 'View Inventory',
        actionLabelBn: 'স্টক দেখুন',
        actionType: 'route',
        actionTarget: '/inventory',
      })
    }
  }

  // 5. Overdue Customer Invoices
  if (canViewFinances && (responsibilities.includes('accountant') || responsibilities.includes('business_owner'))) {
    const invoices = filterItemsByScope(data.invoices || [], userCtx, 'invoices', branchId)
    const overdueInvoices = invoices.filter((i) => i.status === 'overdue' || (i.due_amount > 0 && i.due_date && new Date(i.due_date) < new Date()))

    if (overdueInvoices.length > 0) {
      const overdueTotal = overdueInvoices.reduce((sum, i) => sum + (i.due_amount || 0), 0)
      items.push({
        id: 'overdue_receivables',
        titleEn: `${overdueInvoices.length} Overdue Account(s) Past Payment Term`,
        titleBn: `${overdueInvoices.length}টি একাউন্টের বাকির মেয়াদ উত্তীর্ণ`,
        subtitleEn: `Total outstanding ৳ ${overdueTotal.toLocaleString()} exceeds billing term.`,
        subtitleBn: `মোট ৳ ${overdueTotal.toLocaleString()} বাকির মেয়াদ অতিক্রম করেছে।`,
        severity: 'urgent',
        actionLabelEn: 'View Due List',
        actionLabelBn: 'বাকি তালিকা দেখুন',
        actionType: 'route',
        actionTarget: '/billing?tab=due',
      })
    }
  }

  return items
}

/**
 * Computes actionable "My Work" items for operators, designers, sales reps, and field delivery workers.
 */
export function getMyWorkItems(
  userCtx: UserPermissionContext,
  data: DashboardRawData,
  branchId?: string | null
): MyWorkItem[] {
  const responsibilities = extractResponsibilities(userCtx)
  const workList: MyWorkItem[] = []

  // 1. MACHINE OPERATOR WORK ITEMS (Large touch cards with Start / Complete / Report)
  if (responsibilities.includes('operator') || responsibilities.includes('production_manager')) {
    const prodJobs = filterItemsByScope(data.productionJobs || [], userCtx, 'production', branchId)

    for (const pj of prodJobs.slice(0, 6)) {
      const isRunning = pj.status === 'in_progress'
      workList.push({
        id: pj.id,
        code: pj.production_job_number || pj.id.slice(0, 8).toUpperCase(),
        titleEn: pj.product_name || 'Print Job',
        titleBn: pj.product_name || 'প্রিন্ট কাজ',
        customerName: pj.customer_name || 'Customer',
        type: 'production',
        status: pj.status,
        statusLabelEn: isRunning ? 'In Progress' : pj.status === 'completed' ? 'Completed' : 'Queued',
        statusLabelBn: isRunning ? 'প্রিন্টিং চলছে' : pj.status === 'completed' ? 'সম্পন্ন' : 'সারিবদ্ধ',
        specs: `${pj.dimensions_spec || ''} ${pj.material_spec ? `• ${pj.material_spec}` : ''} (Qty: ${pj.quantity || 1})`.trim(),
        deadline: pj.deadline || 'Pending',
        startedAt: isRunning ? pj.created_at : undefined,
        priority: pj.priority || 'normal',
        primaryActionLabelEn: isRunning ? 'Complete Job' : 'Start Job',
        primaryActionLabelBn: isRunning ? 'কাজ সম্পন্ন' : 'কাজ শুরু করুন',
        primaryActionType: isRunning ? 'complete_job' : 'start_job',
        secondaryActionLabelEn: 'Report Issue',
        secondaryActionLabelBn: 'সমস্যা জানান',
        secondaryActionType: 'report_problem',
        rawRecord: pj,
      })
    }
  }

  // 2. DESIGNER WORK ITEMS
  if (responsibilities.includes('designer')) {
    const designJobs = filterItemsByScope(data.designJobs || [], userCtx, 'design', branchId)

    for (const dj of designJobs.slice(0, 6)) {
      workList.push({
        id: dj.id,
        code: dj.design_number || dj.id.slice(0, 8).toUpperCase(),
        titleEn: dj.title || 'Artwork & Proofing',
        titleBn: dj.title || 'আর্টওয়ার্ক ও প্রুফিং',
        customerName: dj.customer_name || 'Customer',
        type: 'design',
        status: dj.status,
        statusLabelEn: dj.status === 'customer_approval' ? 'Approval Sent' : dj.status === 'revision' ? 'Revision' : 'Designing',
        statusLabelBn: dj.status === 'customer_approval' ? 'অনুমোদন বাকি' : dj.status === 'revision' ? 'সংশোধন' : 'ডিজাইন চলছে',
        specs: dj.dimensions_spec || 'Artwork',
        deadline: dj.deadline || 'Pending',
        priority: dj.priority || 'normal',
        primaryActionLabelEn: 'Open Canvas',
        primaryActionLabelBn: 'ডিজাইন খুলুন',
        primaryActionType: 'open_design',
        secondaryActionLabelEn: 'WhatsApp Proof',
        secondaryActionLabelBn: 'হোয়াটসঅ্যাপ প্রুফ',
        secondaryActionType: 'send_proof',
        rawRecord: dj,
      })
    }
  }

  // 3. DELIVERY WORK ITEMS
  if (responsibilities.includes('delivery_coordinator')) {
    const challans = filterItemsByScope(data.deliveryChallans || [], userCtx, 'delivery', branchId)

    for (const ch of challans.slice(0, 4)) {
      const isOut = ch.status === 'out_for_delivery'
      workList.push({
        id: ch.id,
        code: ch.challan_number || ch.id.slice(0, 8).toUpperCase(),
        titleEn: 'Order Dispatch & Delivery',
        titleBn: 'অর্ডার চালান ও ডেলিভারি',
        customerName: ch.customer_name || 'Customer',
        type: 'delivery',
        status: ch.status,
        statusLabelEn: isOut ? 'En Route' : ch.status === 'delivered' ? 'Delivered' : 'Ready',
        statusLabelBn: isOut ? 'গাড়িতে রাস্তায় আছে' : ch.status === 'delivered' ? 'ডেলিভার্ড' : 'প্রস্তুত',
        specs: `${ch.delivery_address || 'Standard Delivery'}`,
        deadline: 'Today',
        priority: 'normal',
        primaryActionLabelEn: isOut ? 'Confirm Delivery' : 'Start Delivery',
        primaryActionLabelBn: isOut ? 'ডেলিভারি সম্পন্ন' : 'গাড়ি রওনা',
        primaryActionType: isOut ? 'confirm_delivered' : 'dispatch_delivery',
        secondaryActionLabelEn: 'Call Client',
        secondaryActionLabelBn: 'কল করুন',
        secondaryActionType: 'call_client',
        rawRecord: ch,
      })
    }
  }

  return workList
}
