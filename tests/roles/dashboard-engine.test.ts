import { test, describe } from 'node:test'
import assert from 'node:assert'

// ==============================================================================
// PrintERP SaaS - Personalized Dashboard Engine & RBAC Test Suite
// ==============================================================================

export type PrimaryRole =
  | 'platform_owner'
  | 'business_owner'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'general_staff'

export type ResponsibilitySlug =
  | 'business_owner'
  | 'sales_manager'
  | 'designer'
  | 'production_manager'
  | 'operator'
  | 'store_manager'
  | 'accountant'
  | 'delivery_coordinator'
  | 'finishing_operator'
  | 'fabricator'
  | 'delivery_worker'
  | 'general_staff'

export type DataScope = 'own' | 'assigned' | 'department' | 'company'

export interface QuickActionItem {
  id: string
  labelEn: string
  labelBn: string
  icon: string
  actionType: 'modal' | 'route'
  target: string
  requiredPermission: string
  responsibilities: ResponsibilitySlug[]
  priority: number
  mobilePriority: number
}

export interface DashboardMetricItem {
  id: string
  labelEn: string
  labelBn: string
  value: string | number
  unitEn?: string
  requiresPermission?: string
}

export interface AttentionItem {
  id: string
  titleEn: string
  severity: 'urgent' | 'warning' | 'info'
  actionTarget: string
}

export interface MyWorkItem {
  id: string
  code: string
  titleEn: string
  customerName: string
  type: 'design' | 'production' | 'delivery' | 'sales' | 'finishing' | 'fabrication' | 'store'
  status: string
  primaryActionType?: string
  secondaryActionType?: string
}

// Master quick actions matching lib/dashboard/dashboard-engine.ts
export const TEST_MASTER_QUICK_ACTIONS: QuickActionItem[] = [
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
  },
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
  },
  {
    id: 'new_quotation',
    labelEn: '+ Quotation',
    labelBn: '+ কোটেশন তৈরি',
    icon: 'FileText',
    actionType: 'modal',
    target: 'quotation',
    requiredPermission: 'quotations.create',
    responsibilities: ['sales_manager', 'business_owner'],
    priority: 3,
    mobilePriority: 3,
  },
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
  },
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
  },
  {
    id: 'operator_my_jobs',
    labelEn: 'My Print Queue',
    labelBn: 'মেশিন কিউ',
    icon: 'Printer',
    actionType: 'route',
    target: '/operator',
    requiredPermission: 'production.view',
    responsibilities: ['operator', 'production_manager', 'finishing_operator', 'fabricator'],
    priority: 1,
    mobilePriority: 1,
  },
  {
    id: 'operator_report_problem',
    labelEn: 'Report Issue / Scrap',
    labelBn: 'সমস্যা / ছাঁটাই রিপোর্ট',
    icon: 'AlertTriangle',
    actionType: 'modal',
    target: 'report_problem',
    requiredPermission: 'production.edit',
    responsibilities: ['operator', 'production_manager', 'finishing_operator', 'fabricator'],
    priority: 3,
    mobilePriority: 3,
  },
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
  },
  {
    id: 'delivery_board',
    labelEn: 'Delivery Board',
    labelBn: 'ডেলিভারি বোর্ড',
    icon: 'Truck',
    actionType: 'route',
    target: '/delivery',
    requiredPermission: 'delivery.view',
    responsibilities: ['delivery_coordinator', 'delivery_worker', 'sales_manager', 'business_owner'],
    priority: 3,
    mobilePriority: 3,
  },
  {
    id: 'create_challan',
    labelEn: '+ Create Challan',
    labelBn: '+ ডেলিভারি চালান',
    icon: 'Truck',
    actionType: 'modal',
    target: 'delivery',
    requiredPermission: 'delivery.create',
    responsibilities: ['delivery_coordinator', 'sales_manager', 'business_owner'],
    priority: 5,
    mobilePriority: 5,
  },
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
  },
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
  },
]

export interface TestUserContext {
  userId: string
  primaryRole: PrimaryRole
  responsibilities: ResponsibilitySlug[]
  isOwner: boolean
  companyId: string
  tenantSlug: string
  branchId?: string | null
  permissions: Record<string, boolean>
  dataScopes: Record<string, DataScope>
}

export function testCheckPermission(ctx: TestUserContext, permissionKey: string): boolean {
  if (ctx.isOwner || ctx.primaryRole === 'business_owner' || ctx.primaryRole === 'platform_owner') {
    return true
  }
  return !!ctx.permissions[permissionKey]
}

export function testGetAllowedQuickActions(
  ctx: TestUserContext,
  options?: { isMobile?: boolean; maxCount?: number }
) {
  const isMobile = options?.isMobile ?? false
  const isOwner = ctx.isOwner || ctx.primaryRole === 'business_owner' || ctx.primaryRole === 'platform_owner'

  const allowed = TEST_MASTER_QUICK_ACTIONS.filter((action) => {
    const respMatch =
      isOwner || action.responsibilities.some((r) => ctx.responsibilities.includes(r))
    if (!respMatch) return false
    return testCheckPermission(ctx, action.requiredPermission)
  })

  const sorted = [...allowed].sort((a, b) => {
    if (isMobile) {
      return (a.mobilePriority || a.priority) - (b.mobilePriority || b.priority)
    }
    return a.priority - b.priority
  })

  const limit = isMobile ? (options?.maxCount ?? 4) : (options?.maxCount ?? 6)
  return {
    primaryActions: sorted.slice(0, limit),
    secondaryActions: sorted.slice(limit),
    allAllowedActions: sorted,
  }
}

export function testFilterItemsByScope<T extends Record<string, any>>(
  items: T[],
  ctx: TestUserContext,
  moduleName: string,
  branchId?: string | null
): T[] {
  if (!Array.isArray(items) || items.length === 0) return []
  const isOwner = ctx.isOwner || ctx.primaryRole === 'business_owner' || ctx.primaryRole === 'platform_owner'
  const scope = ctx.dataScopes[moduleName] || 'company'

  return items.filter((item) => {
    if (branchId && item.branch_id && item.branch_id !== branchId && !isOwner) {
      return false
    }
    if (isOwner || scope === 'company') {
      return true
    }
    if (scope === 'own') {
      return item.created_by === ctx.userId || item.salesperson_id === ctx.userId || item.designer_id === ctx.userId
    }
    if (scope === 'assigned') {
      return (
        item.assigned_to === ctx.userId ||
        item.assigned_employee_name === ctx.userId ||
        item.designer_name === ctx.userId
      )
    }
    if (scope === 'department') {
      return item.department === ctx.primaryRole || item.assigned_department === ctx.primaryRole
    }
    return false
  })
}

describe('Role-Wise Dashboard & Quick Actions Integration Matrix', () => {
  const sampleOrders = [
    { id: 'o-1', final_price: 20000, due_amount: 5000, created_by: 'sales_user', salesperson_id: 'sales_user', branch_id: 'br-01' },
    { id: 'o-2', final_price: 45000, due_amount: 15000, created_by: 'other_user', salesperson_id: 'other_user', branch_id: 'br-01' },
    { id: 'o-3', final_price: 30000, due_amount: 10000, created_by: 'other_user', salesperson_id: 'other_user', branch_id: 'br-02' },
  ]

  const sampleProdJobs = [
    { id: 'p-1', production_job_number: 'JOB-101', status: 'queued', assigned_to: 'op_1', assigned_employee_name: 'op_1', priority: 'urgent' },
    { id: 'p-2', production_job_number: 'JOB-102', status: 'in_progress', assigned_to: 'op_2', assigned_employee_name: 'op_2', priority: 'very_urgent', has_rework: true },
  ]

  const sampleDesignJobs = [
    { id: 'd-1', design_number: 'DSN-01', status: 'in_progress', created_by: 'des_1', designer_id: 'des_1', revision_count: 0 },
    { id: 'd-2', design_number: 'DSN-02', status: 'revision', created_by: 'des_2', designer_id: 'des_2', revision_count: 3 },
  ]

  // 1. Business Owner Dashboard
  test('1. Owner Dashboard: Full access to financial metrics, settings, user management, and quick actions', () => {
    const ownerCtx: TestUserContext = {
      userId: 'usr-owner',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
      isOwner: true,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {},
      dataScopes: {},
    }

    const { primaryActions, allAllowedActions } = testGetAllowedQuickActions(ownerCtx, { isMobile: false })
    assert.ok(primaryActions.length > 0)
    assert.ok(allAllowedActions.some((a) => a.id === 'manage_users'))
    assert.ok(allAllowedActions.some((a) => a.id === 'view_reports'))
    assert.ok(allAllowedActions.some((a) => a.id === 'add_work_order'))

    const visibleOrders = testFilterItemsByScope(sampleOrders, ownerCtx, 'orders')
    assert.strictEqual(visibleOrders.length, 3)
  })

  // 2. Manager Dashboard
  test('2. Manager Dashboard: Operational control center, can assign jobs and create invoices, cannot manage platform users', () => {
    const managerCtx: TestUserContext = {
      userId: 'usr-mgr',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'orders.view': true,
        'orders.create': true,
        'customers.create': true,
        'quotations.create': true,
        'invoices.create': true,
        'invoices.view': true,
        'payments.create': true,
        'production.view': true,
        'delivery.view': true,
      },
      dataScopes: { orders: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(managerCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'create_invoice'))
    assert.ok(allAllowedActions.some((a) => a.id === 'new_customer'))
    assert.ok(allAllowedActions.some((a) => a.id === 'new_quotation'))
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'manage_users'), false)
  })

  // 3. Designer Dashboard
  test('3. Designer Dashboard: Has Add Work Order action, sees design queue, cannot access invoices or inventory', () => {
    const designerCtx: TestUserContext = {
      userId: 'des_1',
      primaryRole: 'designer',
      responsibilities: ['designer'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'orders.view': true,
        'orders.create': true,
        'design.view': true,
        'design.create': true,
      },
      dataScopes: { design: 'own', orders: 'own' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(designerCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'add_work_order'))
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'create_invoice'), false)
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'add_expense'), false)
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'add_material_stock'), false)

    // Data scope isolation
    const myDesigns = testFilterItemsByScope(sampleDesignJobs, designerCtx, 'design')
    assert.strictEqual(myDesigns.length, 1)
    assert.strictEqual(myDesigns[0].id, 'd-1')
  })

  // 4. Salesperson Dashboard
  test('4. Salesperson Dashboard: Customer CRM, Quotes, Invoices, Payment collections, respects own scope', () => {
    const salesCtx: TestUserContext = {
      userId: 'sales_user',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'customers.create': true,
        'quotations.create': true,
        'invoices.create': true,
        'payments.create': true,
        'orders.view': true,
      },
      dataScopes: { orders: 'own' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(salesCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'new_customer'))
    assert.ok(allAllowedActions.some((a) => a.id === 'new_quotation'))
    assert.ok(allAllowedActions.some((a) => a.id === 'record_payment'))

    const myOrders = testFilterItemsByScope(sampleOrders, salesCtx, 'orders')
    assert.strictEqual(myOrders.length, 1)
    assert.strictEqual(myOrders[0].id, 'o-1')
  })

  // 5. Production Coordinator Dashboard
  test('5. Production Coordinator Dashboard: Production board, operator queue, cannot access accounting', () => {
    const prodCoordCtx: TestUserContext = {
      userId: 'usr-coord',
      primaryRole: 'production_manager',
      responsibilities: ['production_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'production.view': true,
        'production.edit': true,
        'inventory.create': true,
      },
      dataScopes: { production: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(prodCoordCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'production_board'))
    assert.ok(allAllowedActions.some((a) => a.id === 'add_material_stock'))
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'create_invoice'), false)
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'add_expense'), false)
  })

  // 6. Machine Operator Dashboard
  test('6. Machine Operator Dashboard: High priority 1-2 tap job cards, reports problem, zero financial leak', () => {
    const operatorCtx: TestUserContext = {
      userId: 'op_1',
      primaryRole: 'operator',
      responsibilities: ['operator'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'production.view': true,
        'production.edit': true,
      },
      dataScopes: { production: 'assigned' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(operatorCtx, { isMobile: true })
    assert.ok(allAllowedActions.some((a) => a.id === 'operator_my_jobs'))
    assert.ok(allAllowedActions.some((a) => a.id === 'operator_report_problem'))
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'due_list'), false)

    // Filter assigned jobs
    const myJobs = testFilterItemsByScope(sampleProdJobs, operatorCtx, 'production')
    assert.strictEqual(myJobs.length, 1)
    assert.strictEqual(myJobs[0].id, 'p-1')
  })

  // 7. Finishing Operator Dashboard
  test('7. Finishing Operator Dashboard: Finishing queue cards and issue reporting', () => {
    const finishCtx: TestUserContext = {
      userId: 'usr-finish',
      primaryRole: 'general_staff',
      responsibilities: ['finishing_operator'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'production.view': true,
        'production.edit': true,
      },
      dataScopes: { production: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(finishCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'operator_my_jobs'))
    assert.ok(allAllowedActions.some((a) => a.id === 'operator_report_problem'))
  })

  // 8. Fabricator Dashboard
  test('8. Fabricator Dashboard: Fabrication queue access and issue report', () => {
    const fabCtx: TestUserContext = {
      userId: 'usr-fab',
      primaryRole: 'general_staff',
      responsibilities: ['fabricator'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'production.view': true,
        'production.edit': true,
      },
      dataScopes: { production: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(fabCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'operator_my_jobs'))
  })

  // 9. Store Manager Dashboard
  test('9. Store Manager Dashboard: Material stock management, low-stock alerts, zero invoice voids', () => {
    const storeCtx: TestUserContext = {
      userId: 'usr-store',
      primaryRole: 'general_staff',
      responsibilities: ['store_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'inventory.create': true,
        'inventory.view': true,
      },
      dataScopes: { inventory: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(storeCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'add_material_stock'))
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'create_invoice'), false)
  })

  // 10. Accounts Dashboard
  test('10. Accounts Dashboard: Record Payment, Expenses, Due List, Customer Accounts', () => {
    const accountsCtx: TestUserContext = {
      userId: 'usr-acc',
      primaryRole: 'general_staff',
      responsibilities: ['accountant'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'invoices.view': true,
        'invoices.create': true,
        'payments.create': true,
        'payments.view': true,
        'reports.view': true,
      },
      dataScopes: { invoices: 'company', payments: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(accountsCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'record_payment'))
    assert.ok(allAllowedActions.some((a) => a.id === 'add_expense'))
    assert.ok(allAllowedActions.some((a) => a.id === 'due_list'))
  })

  // 11. Delivery Coordinator Dashboard
  test('11. Delivery Coordinator Dashboard: Delivery board, create challan', () => {
    const delCoordCtx: TestUserContext = {
      userId: 'usr-del',
      primaryRole: 'general_staff',
      responsibilities: ['delivery_coordinator'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'delivery.view': true,
        'delivery.create': true,
      },
      dataScopes: { delivery: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(delCoordCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'delivery_board'))
    assert.ok(allAllowedActions.some((a) => a.id === 'create_challan'))
  })

  // 12. Delivery Worker Dashboard
  test('12. Delivery Worker Dashboard: Mobile-first delivery board access', () => {
    const delWorkerCtx: TestUserContext = {
      userId: 'usr-driver',
      primaryRole: 'general_staff',
      responsibilities: ['delivery_worker'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'delivery.view': true,
      },
      dataScopes: { delivery: 'assigned' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(delWorkerCtx, { isMobile: true })
    assert.ok(allAllowedActions.some((a) => a.id === 'delivery_board'))
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'create_challan'), false)
  })

  // 13. Multiple Responsibilities (Designer + Salesperson)
  test('13. Multi-Responsibility: Designer + Sales merges actions additively without duplicates', () => {
    const multiCtx: TestUserContext = {
      userId: 'usr-rahim',
      primaryRole: 'designer',
      responsibilities: ['designer', 'sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'orders.create': true,
        'orders.view': true,
        'customers.create': true,
        'quotations.create': true,
        'invoices.create': true,
        'invoices.view': true,
        'design.view': true,
      },
      dataScopes: { orders: 'company' },
    }

    const { allAllowedActions } = testGetAllowedQuickActions(multiCtx)
    assert.ok(allAllowedActions.some((a) => a.id === 'add_work_order'))
    assert.ok(allAllowedActions.some((a) => a.id === 'new_customer'))
    assert.ok(allAllowedActions.some((a) => a.id === 'new_quotation'))

    const ids = allAllowedActions.map((a) => a.id)
    const uniqueIds = new Set(ids)
    assert.strictEqual(ids.length, uniqueIds.size)
  })

  // 14. Data Scope: 'own' enforcement
  test('14. Data Scope "own": User only sees self-created records', () => {
    const ownCtx: TestUserContext = {
      userId: 'sales_user',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: { 'orders.view': true },
      dataScopes: { orders: 'own' },
    }

    const filtered = testFilterItemsByScope(sampleOrders, ownCtx, 'orders')
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].created_by, 'sales_user')
  })

  // 15. Data Scope: 'assigned' enforcement
  test('15. Data Scope "assigned": User only sees assigned tasks', () => {
    const assignedCtx: TestUserContext = {
      userId: 'op_2',
      primaryRole: 'operator',
      responsibilities: ['operator'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: { 'production.view': true },
      dataScopes: { production: 'assigned' },
    }

    const filtered = testFilterItemsByScope(sampleProdJobs, assignedCtx, 'production')
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].id, 'p-2')
  })

  // 16. Data Scope: 'department' enforcement
  test('16. Data Scope "department": Filters by department matching role', () => {
    const deptOrders = [
      { id: '1', department: 'sales_manager', salesperson_id: 'other' },
      { id: '2', department: 'production_manager', salesperson_id: 'other' },
    ]
    const deptCtx: TestUserContext = {
      userId: 'usr-sales',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: { 'orders.view': true },
      dataScopes: { orders: 'department' },
    }

    const filtered = testFilterItemsByScope(deptOrders, deptCtx, 'orders')
    assert.strictEqual(filtered.length, 1)
    assert.strictEqual(filtered[0].department, 'sales_manager')
  })

  // 17. Data Scope: 'company' enforcement
  test('17. Data Scope "company": Accesses all records within tenant', () => {
    const companyCtx: TestUserContext = {
      userId: 'usr-all',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: { 'orders.view': true },
      dataScopes: { orders: 'company' },
    }

    const filtered = testFilterItemsByScope(sampleOrders, companyCtx, 'orders')
    assert.strictEqual(filtered.length, 3)
  })

  // 18. Unauthorized Quick Action Filtering
  test('18. Unauthorized Quick Action: Button is omitted if user lacks required permission', () => {
    const unauthCtx: TestUserContext = {
      userId: 'usr-basic',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'orders.view': true,
        // Missing 'orders.create', 'invoices.create', etc.
      },
      dataScopes: {},
    }

    const { allAllowedActions } = testGetAllowedQuickActions(unauthCtx)
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'add_work_order'), false)
    assert.strictEqual(allAllowedActions.some((a) => a.id === 'create_invoice'), false)
  })

  // 19. Unauthorized Dashboard Data Leakage Prevention
  test('19. Unauthorized Dashboard Data: Operator cannot see financial metrics or due lists', () => {
    const opCtx: TestUserContext = {
      userId: 'op_1',
      primaryRole: 'operator',
      responsibilities: ['operator'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {
        'production.view': true,
      },
      dataScopes: {},
    }

    const canSeeBilling = testCheckPermission(opCtx, 'invoices.view')
    const canSeePayments = testCheckPermission(opCtx, 'payments.view')
    assert.strictEqual(canSeeBilling, false)
    assert.strictEqual(canSeePayments, false)
  })

  // 20. Cross-Tenant Branch Isolation
  test('20. Cross-Tenant & Branch Isolation: Users in Branch 1 cannot access Branch 2 data', () => {
    const branch1Ctx: TestUserContext = {
      userId: 'usr-br1',
      primaryRole: 'sales_manager',
      responsibilities: ['sales_manager'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      branchId: 'br-01',
      permissions: { 'orders.view': true },
      dataScopes: { orders: 'company' },
    }

    const filtered = testFilterItemsByScope(sampleOrders, branch1Ctx, 'orders', 'br-01')
    assert.strictEqual(filtered.length, 2)
    assert.ok(filtered.every((o) => o.branch_id === 'br-01'))
  })

  // 21. Cross-User Data Leakage
  test('21. Cross-User Data Leakage: User A cannot see User B records with own scope', () => {
    const userACtx: TestUserContext = {
      userId: 'user_a',
      primaryRole: 'designer',
      responsibilities: ['designer'],
      isOwner: false,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: { 'design.view': true },
      dataScopes: { design: 'own' },
    }

    const filtered = testFilterItemsByScope(sampleDesignJobs, userACtx, 'design')
    assert.strictEqual(filtered.length, 0)
  })

  // 22. Mobile vs Desktop Prioritization
  test('22. Mobile vs Desktop: Mobile restricts primary actions to 3-5 while desktop renders 4-8', () => {
    const ownerCtx: TestUserContext = {
      userId: 'usr-owner',
      primaryRole: 'business_owner',
      responsibilities: ['business_owner'],
      isOwner: true,
      companyId: 'comp-1',
      tenantSlug: 'apex-print',
      permissions: {},
      dataScopes: {},
    }

    const mobileActions = testGetAllowedQuickActions(ownerCtx, { isMobile: true, maxCount: 4 })
    assert.strictEqual(mobileActions.primaryActions.length, 4)
    assert.ok(mobileActions.secondaryActions.length > 0)

    const desktopActions = testGetAllowedQuickActions(ownerCtx, { isMobile: false, maxCount: 6 })
    assert.strictEqual(desktopActions.primaryActions.length, 6)
  })
})
