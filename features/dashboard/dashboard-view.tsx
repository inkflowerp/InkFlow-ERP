'use client'

import React, { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  TrendingUp,
  Printer,
  FileSpreadsheet,
  Truck,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Receipt,
  Users,
  CreditCard,
  Building,
  FileText,
  Percent,
  Sparkles,
  Play,
  Check,
  Phone,
  BarChart3,
  ShieldCheck,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  MoreHorizontal,
  X,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { DashboardChartsSkeleton } from './dashboard-charts'

const DashboardCharts = dynamic(
  () => import('./dashboard-charts').then((mod) => mod.DashboardCharts),
  { ssr: false, loading: () => <DashboardChartsSkeleton /> }
)

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { DateDisplay } from '@/components/shared/date-display'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import { TrialDashboardCard } from '@/components/subscriptions/trial-dashboard-card'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'

import { ColumnDef } from '@/types/common.types'
import { toBengaliNumerals, formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import {
  getAllowedQuickActions,
  getDashboardMetrics,
  getNeedsAttentionItems,
  getMyWorkItems,
  filterItemsByScope,
  QuickActionItem,
  MyWorkItem,
} from '@/lib/dashboard/dashboard-engine'

import { CustomerRecord } from '@/types/crm.types'
import { SalesOrderRecord, JobOrderRecord } from '@/types/order.types'
import { ExpenseRecord } from '@/types/accounting.types'
import { PaymentRecord, InvoiceRecord } from '@/types/billing.types'
import { MaterialRecord } from '@/types/inventory.types'
import { ProductionJobRecord } from '@/types/production.types'
import { DesignJobRecord } from '@/types/design.types'
import { DeliveryChallanRecord } from '@/types/logistics.types'
import { cn } from '@/lib/utils'

const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp,
  Printer,
  FileSpreadsheet,
  Truck,
  Plus,
  AlertTriangle,
  AlertCircle,
  Clock,
  CheckCircle2,
  DollarSign,
  Package,
  Layers,
  Receipt,
  Users,
  CreditCard,
  Building,
  FileText,
  Percent,
  Sparkles,
  BarChart3,
  ShieldCheck,
}

interface TableOrderRecord extends Record<string, unknown> {
  id: string
  code: string
  customerName: string
  customerNameBn: string
  product: string
  productBn: string
  specs: string
  status: string
  amount: number
  date: string
}

export function DashboardView() {
  const router = useRouter()
  const { company, currentUser, currentRole, currentBranch } = useTenant()
  const { userCtx, can, isOwner, isSales, isDesigner, isOperator, isAccountant, isDelivery } = usePermissions()
  const { locale, tBilingual } = useI18n()

  const slug = company?.slug || 'my-company'
  const canSeeFinancials = isOwner || isSales || isAccountant || can('view', 'invoices') || can('view', 'reports')

  // Live Data Stores
  const [orders, , orderHelpers] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customers, , custHelpers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [payments] = useDataStore<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [])
  const [expenses] = useDataStore<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, [])
  const [materials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [])
  const [productionJobs, , prodHelpers] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])
  const [designJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [deliveryChallans, , deliveryHelpers] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [])

  // State Management
  const [activeModal, setActiveModal] = useState<string | null>(null)
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)
  const [errorState, setErrorState] = useState<string | null>(null)
  const [activeWorkItem, setActiveWorkItem] = useState<MyWorkItem | null>(null)

  // Quick Action Forms State
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerLimit, setCustomerLimit] = useState('50000')

  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [paymentAmount, setPaymentAmount] = useState('')
  const [payMethod, setPayMethod] = useState<'cash' | 'bkash' | 'nagad' | 'bank_transfer' | 'cheque'>('cash')

  const [expenseTitle, setExpenseTitle] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [expenseCategory, setExpenseCategory] = useState('maintenance')

  const [materialName, setMaterialName] = useState('')
  const [materialQty, setMaterialQty] = useState('')

  const [problemDescription, setProblemDescription] = useState('')
  const [problemSeverity, setProblemSeverity] = useState('rework')

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  // Dashboard Data Aggregation
  const rawData = useMemo(() => ({
    orders,
    productionJobs,
    designJobs,
    customers,
    invoices,
    payments,
    expenses,
    materials,
    deliveryChallans,
  }), [orders, productionJobs, designJobs, customers, invoices, payments, expenses, materials, deliveryChallans])

  // Resolved Authorized Engine Elements
  const quickActions = useMemo(() => {
    return getAllowedQuickActions(userCtx)
  }, [userCtx])

  const metrics = useMemo(() => {
    return getDashboardMetrics(userCtx, rawData, currentBranch?.id)
  }, [userCtx, rawData, currentBranch?.id])

  const attentionItems = useMemo(() => {
    return getNeedsAttentionItems(userCtx, rawData, currentBranch?.id)
  }, [userCtx, rawData, currentBranch?.id])

  const myWorkItems = useMemo(() => {
    return getMyWorkItems(userCtx, rawData, currentBranch?.id)
  }, [userCtx, rawData, currentBranch?.id])

  const authorizedOrders = useMemo(() => {
    return filterItemsByScope(orders || [], userCtx, 'orders', currentBranch?.id)
  }, [orders, userCtx, currentBranch?.id])

  // Quick Action Handlers
  const handleExecuteQuickAction = (qa: QuickActionItem) => {
    setIsMoreActionsOpen(false)
    if (qa.actionType === 'modal') {
      setActiveModal(qa.target)
    } else if (qa.actionType === 'route') {
      const fullRoute = qa.target.startsWith('/') ? `/${slug}${qa.target}` : `/${slug}/${qa.target}`
      router.push(fullRoute)
    }
  }

  // Fast 1-2 Tap Work Item Operations
  const handleWorkItemAction = (item: MyWorkItem, actionType: string) => {
    if (actionType === 'start_job') {
      prodHelpers.updateItem<ProductionJobRecord>(item.id, {
        status: 'in_progress',
        stage: 'printing',
      })
      showNotification(`Started print run for ${item.code} (${item.titleEn}).`)
    } else if (actionType === 'complete_job') {
      prodHelpers.updateItem<ProductionJobRecord>(item.id, {
        status: 'completed',
        stage: 'finishing',
      })
      showNotification(`Marked ${item.code} as completed! QC and dispatch notified.`)
    } else if (actionType === 'report_problem') {
      setActiveWorkItem(item)
      setActiveModal('report_problem')
    } else if (actionType === 'open_design') {
      router.push(`/${slug}/design`)
    } else if (actionType === 'send_proof') {
      showNotification(`WhatsApp proof preview sent to ${item.customerName}.`)
    } else if (actionType === 'dispatch_delivery') {
      deliveryHelpers.updateItem<DeliveryChallanRecord>(item.id, { status: 'out_for_delivery' })
      showNotification(`Dispatched Challan ${item.code} for delivery.`)
    } else if (actionType === 'confirm_delivered') {
      deliveryHelpers.updateItem<DeliveryChallanRecord>(item.id, { status: 'delivered' })
      showNotification(`Challan ${item.code} confirmed delivered to ${item.customerName}!`)
    } else if (actionType === 'call_client') {
      showNotification(`Dialing client for ${item.code}...`)
    }
  }

  // Modal Submissions
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) return
    const companyId = company?.id || 'co-main'
    const newCust: CustomerRecord = {
      id: `cust-${Date.now()}`,
      company_id: companyId,
      name: customerName.trim(),
      name_bn: customerName.trim(),
      mobile: customerPhone.trim(),
      email: null,
      customer_type: 'corporate',
      credit_limit: parseFloat(customerLimit) || 0,
      payment_terms: 'net_30',
      tags: ['New Client'],
      is_active: true,
      total_orders_count: 0,
      total_orders_amount: 0,
      total_due_balance: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    custHelpers.addItem(newCust)
    setActiveModal(null)
    setCustomerName('')
    setCustomerPhone('')
    showNotification(`Customer '${customerName}' registered successfully!`)
  }

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(paymentAmount) || 0
    if (amt <= 0) return
    const custId = selectedCustomerId || customers?.[0]?.id
    const cust = (customers || []).find((c) => c.id === custId)
    if (!cust) {
      showNotification('Please select or register a customer first.')
      return
    }
    PrintERPDataStore.recordPaymentCollection({
      amount: amt,
      customerId: cust.id,
      paymentMethod: payMethod,
      notes: 'Direct payment recorded from dashboard quick actions',
      receivedByName: currentUser?.profile?.full_name || 'Accounts Staff',
    })
    setActiveModal(null)
    setPaymentAmount('')
    setSelectedCustomerId('')
    showNotification(`Payment of ৳ ${formatBDT(amt)} received from ${cust.name}!`)
  }

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const amt = parseFloat(expenseAmount) || 0
    if (amt <= 0 || !expenseTitle.trim()) return
    const expNum = `EXP-${Date.now().toString().slice(-4)}`
    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      company_id: company?.id || 'co-main',
      expense_number: expNum,
      expense_date: new Date().toISOString().split('T')[0],
      category: (expenseCategory as any) || 'maintenance',
      amount: amt,
      payment_method: 'cash',
      vendor_name: null,
      description: expenseTitle.trim(),
      branch_name: currentBranch?.name || 'Main Branch',
      recorded_by_name: currentUser?.profile?.full_name || 'Staff',
      created_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<ExpenseRecord>(STORAGE_KEYS.EXPENSES, newExp)
    setActiveModal(null)
    setExpenseTitle('')
    setExpenseAmount('')
    showNotification(`Expense '${expenseTitle}' (৳ ${formatBDT(amt)}) logged successfully!`)
  }

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialName.trim()) return
    const newMat: MaterialRecord = {
      id: `mat-${Date.now()}`,
      company_id: company?.id || 'co-main',
      sku: `MAT-${Date.now().toString().slice(-4)}`,
      name: materialName.trim(),
      name_bn: materialName.trim(),
      category: 'rigid_sheet',
      unit: 'sft',
      is_roll: false,
      current_stock: parseFloat(materialQty) || 0,
      min_stock_level: 50,
      last_purchase_price: 0,
      average_cost: 0,
      manual_cost: 0,
      valuation_method: 'average_cost',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    PrintERPDataStore.addItem<MaterialRecord>(STORAGE_KEYS.MATERIALS, newMat)
    setActiveModal(null)
    setMaterialName('')
    setMaterialQty('')
    showNotification(`Stock entry for ${materialName} saved!`)
  }

  const handleReportProblem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!problemDescription.trim()) return
    if (activeWorkItem) {
      prodHelpers.updateItem<ProductionJobRecord>(activeWorkItem.id, {
        has_rework: true,
        priority: 'very_urgent',
      })
      showNotification(`Incident reported for ${activeWorkItem.code}. Supervisor notified.`)
    }
    setActiveModal(null)
    setProblemDescription('')
    setActiveWorkItem(null)
  }

  const num = (v: number | string) => (locale === 'bn' ? toBengaliNumerals(v) : v)

  // Recent Table Data
  const recentOrdersData: TableOrderRecord[] = authorizedOrders.slice(0, 8).map((o) => {
    const firstItem = o.items?.[0]
    const specStr = firstItem
      ? `${firstItem.width || 0}×${firstItem.height || 0} ${firstItem.unit || 'sft'} (${o.items?.length || 1} items)`
      : `${o.items?.length || 0} items`

    return {
      id: o.id,
      code: o.order_number || o.id.slice(0, 8).toUpperCase(),
      customerName: o.customer_name || 'Customer',
      customerNameBn: o.customer_name || 'গ্রাহক',
      product: firstItem?.item_name || 'Print Order',
      productBn: firstItem?.item_name || 'প্রিন্ট অর্ডার',
      specs: specStr,
      status: o.status,
      amount: o.final_price || 0,
      date: o.created_at || new Date().toISOString(),
    }
  })

  const columns: ColumnDef<TableOrderRecord>[] = [
    {
      key: 'code',
      header: 'Order Code',
      headerBn: 'অর্ডার কোড',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
          {row.code}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Client / Brand',
      headerBn: 'গ্রাহক / প্রতিষ্ঠান',
      sortable: true,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">
            {tBilingual(row.customerName, row.customerNameBn)}
          </span>
          <span className="text-[11px] text-slate-400">{row.specs}</span>
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Printing Item',
      headerBn: 'আইটেম বিবরণ',
      render: (row) => (
        <span className="text-xs text-slate-700 dark:text-slate-300">
          {tBilingual(row.product, row.productBn)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      headerBn: 'অবস্থা',
      sortable: true,
      render: (row) => <StatusBadge status={row.status} />,
    },
    ...(canSeeFinancials
      ? [
          {
            key: 'amount' as const,
            header: 'Amount',
            headerBn: 'টাকার পরিমাণ',
            sortable: true,
            render: (row: TableOrderRecord) => (
              <CurrencyDisplay amount={row.amount} className="text-xs font-bold" />
            ),
          },
        ]
      : []),
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (row) => <DateDisplay date={row.date} className="text-xs" />,
    },
  ]

  const userDisplayName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : 'Team Member'

  const activeResponsibilities = userCtx.responsibilities && userCtx.responsibilities.length > 0
    ? userCtx.responsibilities
    : [userCtx.primaryRole || currentRole || 'general_staff']

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER BANNER (Mobile-First, Bilingual) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-900 p-5 sm:p-6 text-white shadow-xl shadow-blue-900/10">
        <div className="space-y-1.5 min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-cyan-300 backdrop-blur-xs" suppressHydrationWarning>
            <Sparkles className="h-3 w-3 shrink-0" />
            <span className="truncate" suppressHydrationWarning>
              {company ? tBilingual(company.name, company.name_bn || company.name) : 'PrintERP Organization'}
              {currentBranch ? ` • ${currentBranch.name.split('(')[0].trim()}` : ''}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight bangla-text leading-tight" suppressHydrationWarning>
            {tBilingual('Welcome back,', 'স্বাগতম,')} {userDisplayName}
          </h1>

          <p className="text-xs sm:text-sm text-slate-200 bangla-text">
            {tBilingual(
              'Real-time operational dashboard tailored to your active responsibilities.',
              'আপনার দায়িত্ব ও পারমিশন অনুযায়ী ব্যক্তিগতকৃত লাইভ ড্যাশবোর্ড।'
            )}
          </p>
        </div>

        <div className="flex flex-wrap md:flex-col md:items-end gap-1.5 shrink-0">
          <div className="flex flex-wrap items-center gap-1">
            {activeResponsibilities.map((resp) => (
              <Badge
                key={resp}
                variant="outline"
                className="bg-white/10 text-white border-white/20 text-[10px] sm:text-xs py-0.5 capitalize bangla-text"
              >
                {resp.replace('_', ' ')}
              </Badge>
            ))}
          </div>
          <span className="text-[11px] text-slate-300 font-medium" suppressHydrationWarning>
            {new Date().toLocaleDateString(locale === 'bn' ? 'bn-BD' : 'en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Notification Toast Feedback */}
      {notification && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-sm animate-in fade-in-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 text-emerald-600 hover:text-emerald-800 cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error State with Retry Button */}
      {errorState && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span>{errorState}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setErrorState(null)
              orderHelpers.reload()
            }}
            className="h-8 text-xs bg-white text-red-700 border-red-200"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {tBilingual('Retry', 'পুনরায় চেষ্টা')}
          </Button>
        </div>
      )}

      {/* Free Trial Upgrade Notice Card */}
      <TrialDashboardCard />

      {/* 2. PRIORITIZED QUICK ACTIONS HUB (Mobile-First, Large Touch Targets min 44px) */}
      <Card className="p-4 border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
              {tBilingual('Quick Operations', 'দ্রুত কাজ ও এন্ট্রি')}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 bangla-text hidden sm:inline">
            {tBilingual('1-2 tap direct actions', '১-২ ক্লিকে দ্রুত সম্পাদন')}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-2.5">
          {quickActions.primaryActions.map((qa) => {
            const Icon = ICON_MAP[qa.icon] || Plus
            return (
              <Button
                key={qa.id}
                type="button"
                variant="outline"
                onClick={() => handleExecuteQuickAction(qa)}
                className="h-11 sm:h-12 px-2.5 flex items-center justify-start gap-2 text-xs font-bold border-slate-200 dark:border-slate-800 hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px] text-left"
              >
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shrink-0">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="truncate bangla-text leading-tight">
                  {tBilingual(qa.labelEn, qa.labelBn)}
                </span>
              </Button>
            )
          })}

          {quickActions.secondaryActions.length > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsMoreActionsOpen(true)}
              className="h-11 sm:h-12 px-2.5 flex items-center justify-center gap-2 text-xs font-bold border-dashed border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
            >
              <MoreHorizontal className="h-4 w-4 text-slate-500" />
              <span className="bangla-text">{tBilingual('More Actions', 'অন্যান্য কাজ')}</span>
            </Button>
          )}
        </div>
      </Card>

      {/* 3. NEEDS ATTENTION BAR (Action Required: Delays, Approvals, Revisions) */}
      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
              {tBilingual('Needs Attention', 'জরুরি মনোযোগ প্রয়োজন')}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {attentionItems.map((item) => (
              <div
                key={item.id}
                className={cn(
                  'p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs transition-colors',
                  item.severity === 'urgent'
                    ? 'bg-red-50/70 border-red-200 dark:bg-red-950/20 dark:border-red-900/60'
                    : 'bg-amber-50/70 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/60'
                )}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full shrink-0',
                        item.severity === 'urgent' ? 'bg-red-600' : 'bg-amber-600'
                      )}
                    />
                    <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100 bangla-text">
                      {tBilingual(item.titleEn, item.titleBn)}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 bangla-text pl-4">
                    {tBilingual(item.subtitleEn, item.subtitleBn)}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (item.actionType === 'route') {
                      router.push(`/${slug}${item.actionTarget}`)
                    } else if (item.actionType === 'modal') {
                      setActiveModal(item.actionTarget)
                    }
                  }}
                  className={cn(
                    'h-9 text-xs font-bold shrink-0 min-h-[36px] bangla-text',
                    item.severity === 'urgent'
                      ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                      : 'bg-amber-600 text-white hover:bg-amber-700 border-amber-600'
                  )}
                >
                  <span>{tBilingual(item.actionLabelEn, item.actionLabelBn)}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TODAY AT A GLANCE (Scope-Filtered Metric Cards) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="h-4 w-4 text-blue-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
            {tBilingual("Today at a Glance", 'আজকের সার্বিক চিত্র')}
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {metrics.map((m) => {
            const Icon = ICON_MAP[m.icon] || Sparkles
            return (
              <Card
                key={m.id}
                className={cn(
                  'p-4 border-slate-200/80 shadow-xs dark:border-slate-800 transition-all hover:shadow-md',
                  m.colorVariant === 'danger' && 'border-l-4 border-l-red-500',
                  m.colorVariant === 'success' && 'border-l-4 border-l-emerald-500',
                  m.colorVariant === 'warning' && 'border-l-4 border-l-amber-500',
                  m.colorVariant === 'info' && 'border-l-4 border-l-blue-500',
                  m.colorVariant === 'purple' && 'border-l-4 border-l-purple-500'
                )}
              >
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                  <span className="bangla-text truncate">{tBilingual(m.labelEn, m.labelBn)}</span>
                  <Icon className="h-4 w-4 text-slate-400 shrink-0" />
                </div>

                <div className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white mt-1.5 flex items-baseline gap-1" suppressHydrationWarning>
                  {typeof m.value === 'number' ? (
                    m.unitEn === 'BDT' ? (
                      <CurrencyDisplay amount={m.value} />
                    ) : (
                      <span suppressHydrationWarning>{num(m.value)}</span>
                    )
                  ) : (
                    <span suppressHydrationWarning>{num(m.value)}</span>
                  )}
                  {m.unitEn && m.unitEn !== 'BDT' && (
                    <span className="text-xs font-semibold text-slate-400 bangla-text" suppressHydrationWarning>
                      {tBilingual(m.unitEn, m.unitBn || m.unitEn)}
                    </span>
                  )}
                </div>

                {(m.changeTextEn || m.subtitleEn) && (
                  <div
                    className={cn(
                      'text-[11px] mt-1 font-medium bangla-text truncate',
                      m.changeType === 'positive'
                        ? 'text-emerald-600'
                        : m.changeType === 'negative'
                        ? 'text-red-600'
                        : 'text-slate-400'
                    )}
                  >
                    {m.changeTextEn && (
                      <span className="inline-flex items-center gap-0.5">
                        <ArrowUpRight className="h-3 w-3" />
                        {tBilingual(m.changeTextEn, m.changeTextBn || m.changeTextEn)}
                      </span>
                    )}
                    {!m.changeTextEn && m.subtitleEn && (
                      <span>{tBilingual(m.subtitleEn, m.subtitleBn || m.subtitleEn)}</span>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* 5. MY WORK / TODAY'S ACTIVE WORK (Operators, Designers, Delivery Field Workers) */}
      {myWorkItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-purple-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 bangla-text">
                {tBilingual("My Work Queue & Shift Tasks", 'আমার দায়িত্বপ্রাপ্ত কাজের তালিকা')}
              </h2>
            </div>
            <span className="text-xs text-slate-400 bangla-text">
              {num(myWorkItems.length)} {tBilingual('Active Items', 'টি কাজ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {myWorkItems.map((item) => (
              <Card
                key={item.id}
                className="p-4 border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-3 bg-white dark:bg-slate-900"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">
                      {item.code}
                    </span>
                    <Badge
                      variant={
                        item.status === 'in_progress' || item.status === 'printing'
                          ? 'default'
                          : item.status === 'completed'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={cn(
                        'text-[10px] py-0 h-4 bangla-text',
                        (item.status === 'in_progress' || item.status === 'printing') &&
                          'bg-purple-600 text-white font-bold animate-pulse'
                      )}
                    >
                      {tBilingual(item.statusLabelEn, item.statusLabelBn)}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 bangla-text line-clamp-1">
                    {tBilingual(item.titleEn, item.titleBn)}
                  </h3>

                  <p className="text-xs text-slate-600 dark:text-slate-300 bangla-text">
                    <strong className="text-slate-800 dark:text-slate-200">{item.customerName}</strong>
                  </p>

                  <p className="text-[11px] text-slate-400 font-mono">{item.specs}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {item.deadline}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.secondaryActionLabelEn && item.secondaryActionType && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleWorkItemAction(item, item.secondaryActionType!)}
                        className="h-8 px-2 text-[11px] font-semibold text-slate-600 dark:text-slate-300 min-h-[36px] bangla-text cursor-pointer"
                      >
                        {tBilingual(item.secondaryActionLabelEn, item.secondaryActionLabelBn || item.secondaryActionLabelEn)}
                      </Button>
                    )}

                    {item.primaryActionLabelEn && item.primaryActionType && (
                      <Button
                        size="sm"
                        onClick={() => handleWorkItemAction(item, item.primaryActionType!)}
                        className={cn(
                          'h-8 px-3 text-xs font-bold shadow-xs min-h-[36px] bangla-text cursor-pointer',
                          item.primaryActionType === 'complete_job' || item.primaryActionType === 'confirm_delivered'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-blue-600 hover:bg-blue-700 text-white'
                        )}
                      >
                        {item.primaryActionType === 'start_job' && <Play className="h-3 w-3 mr-1" />}
                        {(item.primaryActionType === 'complete_job' || item.primaryActionType === 'confirm_delivered') && (
                          <Check className="h-3 w-3 mr-1" />
                        )}
                        <span>{tBilingual(item.primaryActionLabelEn, item.primaryActionLabelBn || item.primaryActionLabelEn)}</span>
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* 6. CHARTS & ANALYTICS (Only for Financial Roles / Reports Permitted) */}
      {canSeeFinancials && <DashboardCharts />}

      {/* 7. LIVE RECENT JOB ORDERS TABLE (Scope-Filtered) */}
      <Card className="border-slate-200/90 dark:border-slate-800 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold bangla-text">
                {tBilingual('Recent Operational Orders & Job Tickets', 'সাম্প্রতিক জব ও কাজের টিকিট')}
              </CardTitle>
              <CardDescription className="text-xs bangla-text">
                {tBilingual('Scoped to your authorized branch and departments', 'আপনার অনুমোদিত শাখা ও ডিপার্টমেন্টের ডাটা')}
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push(`/${slug}/orders`)}
              className="text-xs bangla-text min-h-[36px] cursor-pointer"
            >
              {tBilingual('View All Orders', 'সকল অর্ডার দেখুন')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          {recentOrdersData.length > 0 ? (
            <DataTable<TableOrderRecord>
              columns={columns}
              data={recentOrdersData}
              keyExtractor={(row) => row.id}
              onRowClick={(row) => router.push(`/${slug}/orders/${row.id}`)}
            />
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-slate-500 bangla-text">
                {tBilingual('No active work orders found for your account scope.', 'আপনার জন্য কোনো চলতি অর্ডার নেই।')}
              </p>
              {can('create', 'orders') && (
                <Button
                  size="sm"
                  onClick={() => setActiveModal('work_order')}
                  className="bg-blue-600 hover:bg-blue-700 text-xs font-bold bangla-text"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  {tBilingual('+ Create New Work Order', '+ নতুন অর্ডার তৈরি করুন')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* QUICK ACTION MODALS                                                       */}
      {/* ========================================================================= */}

      {/* 1. Modal: Work Order (Integrated with Customer Autocomplete & Dual Save Actions) */}
      <WorkOrderModal
        isOpen={activeModal === 'work_order'}
        onClose={() => setActiveModal(null)}
        onSuccess={(savedOrder, sentToManager) => {
          setActiveModal(null)
          orderHelpers.reload()
          showNotification(
            sentToManager
              ? `Work Order #${savedOrder.order_number} saved & Invoice Request sent to Manager!`
              : `Work Order #${savedOrder.order_number} registered successfully!`
          )
        }}
        companyId={company?.id}
      />

      {/* 2. Modal: New Customer */}
      <ModalDialog
        open={activeModal === 'customer'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Add New Customer Profile"
        description="Register a corporate client, advertising agency, or retail walk-in buyer."
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="custName" required>Customer / Company Name</Label>
            <Input
              id="custName"
              placeholder="e.g. Acme Advertising Ltd."
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="custPhone" required>Phone / Mobile</Label>
              <Input
                id="custPhone"
                placeholder="01711-XXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="custLimit">Credit Limit (৳ BDT)</Label>
              <Input
                id="custLimit"
                type="number"
                value={customerLimit}
                onChange={(e) => setCustomerLimit(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Customer</Button>
          </div>
        </form>
      </ModalDialog>

      {/* 3. Modal: Record Payment / Money Receipt */}
      <ModalDialog
        open={activeModal === 'payment'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Record Payment / Money Receipt"
        description="Receive customer payment via Cash, bKash, Nagad, or Bank Transfer."
      >
        <form onSubmit={handleRecordPayment} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="payCust" required>Select Customer</Label>
            <select
              id="payCust"
              value={selectedCustomerId || customers?.[0]?.id || ''}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              {(customers || []).length === 0 ? (
                <option value="">No customers found - please add a customer first</option>
              ) : (
                (customers || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (Due: ৳ {formatBDT(c.total_due_balance || 0)})
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="payAmount" required>Amount (৳ BDT)</Label>
              <Input
                id="payAmount"
                type="number"
                placeholder="e.g. 25000"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="payMethod">Payment Method</Label>
              <select
                id="payMethod"
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="cash">Cash Counter</option>
                <option value="bkash">bKash Merchant</option>
                <option value="nagad">Nagad</option>
                <option value="bank_transfer">Bank Deposit / Cheque</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Issue Money Receipt</Button>
          </div>
        </form>
      </ModalDialog>

      {/* 4. Modal: Add Expense */}
      <ModalDialog
        open={activeModal === 'expense'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Add Shop Floor Expense"
        description="Record press electricity, ink purchase, machine maintenance, or refreshments."
      >
        <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="expTitle" required>Expense Description</Label>
            <Input
              id="expTitle"
              placeholder="e.g. Machine Solvent Cleaner & Wipes"
              value={expenseTitle}
              onChange={(e) => setExpenseTitle(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expAmount" required>Amount (৳ BDT)</Label>
              <Input
                id="expAmount"
                type="number"
                placeholder="3500"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expCategory">Category</Label>
              <select
                id="expCategory"
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="maintenance">Machine Maintenance</option>
                <option value="electricity">Factory Utilities / Electricity</option>
                <option value="transport">Transport / Van Fare</option>
                <option value="tea_snacks">Staff Overtime / Refreshment</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Record Expense</Button>
          </div>
        </form>
      </ModalDialog>

      {/* 5. Modal: Add Material / Media Stock */}
      <ModalDialog
        open={activeModal === 'material'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Add Material to Inventory"
        description="Log new flex rolls or media sheets received from vendor."
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="matName" required>Material Name & Spec</Label>
            <Input
              id="matName"
              placeholder="e.g. Star Flex 320gsm (10ft roll)"
              value={materialName}
              onChange={(e) => setMaterialName(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="matQty" required>Quantity (Rolls / Sheets / Sft)</Label>
              <Input
                id="matQty"
                placeholder="500"
                value={materialQty}
                onChange={(e) => setMaterialQty(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="matSupplier">Vendor</Label>
              <select id="matSupplier" className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs">
                <option>Bangla Plastic & Media Ltd.</option>
                <option>Dhaka Acrylic Center</option>
                <option>Karnafuli Paper Mills</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">Save Inventory</Button>
          </div>
        </form>
      </ModalDialog>

      {/* 6. Modal: Report Problem / Scrap */}
      <ModalDialog
        open={activeModal === 'report_problem'}
        onOpenChange={(open) => !open && setActiveModal(null)}
        title="Report Machine Floor Problem / Rework"
        description={`Log media head strike, ink shortage, or scrap for ${activeWorkItem?.code || 'print run'}.`}
      >
        <form onSubmit={handleReportProblem} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="probType" required>Issue Type</Label>
            <select
              id="probType"
              value={problemSeverity}
              onChange={(e) => setProblemSeverity(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            >
              <option value="rework">Media Head Strike / Reprint Needed</option>
              <option value="color_mismatch">Color Calibration / ICC Profile Mismatch</option>
              <option value="ink_out">Ink Cartridge Empty</option>
              <option value="machine_jam">Roll Feed Jam / Mechanical Fault</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="probDesc" required>Problem Description & Action Needed</Label>
            <Input
              id="probDesc"
              placeholder="e.g. Banding on Cyan head after 8ft run"
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setActiveModal(null)}>Cancel</Button>
            <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white">Dispatch Alert</Button>
          </div>
        </form>
      </ModalDialog>

      {/* 7. Modal: More Quick Actions Drawer / Dialog */}
      <ModalDialog
        open={isMoreActionsOpen}
        onOpenChange={(open) => !open && setIsMoreActionsOpen(false)}
        title="All Authorized Quick Actions"
        description="Select any operational shortcut available for your role."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
          {quickActions.allAllowedActions.map((qa) => {
            const Icon = ICON_MAP[qa.icon] || Plus
            return (
              <Button
                key={qa.id}
                type="button"
                variant="outline"
                onClick={() => handleExecuteQuickAction(qa)}
                className="h-12 px-3 flex items-center justify-between text-xs font-bold border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer min-h-[44px]"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-slate-800 dark:text-blue-400 shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="truncate bangla-text">{tBilingual(qa.labelEn, qa.labelBn)}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              </Button>
            )
          })}
        </div>
      </ModalDialog>
    </div>
  )
}
