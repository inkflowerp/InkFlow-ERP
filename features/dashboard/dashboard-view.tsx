'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getOwnerDashboardDataAction } from '@/actions/dashboard.actions'
import type { OwnerDashboardSnapshot } from '@/services/dashboard.service'
import { useRealtimeSync } from '@/hooks/use-realtime-sync'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useToast } from '@/components/shared/toast-feedback'
import {
 TrendingUp,
 Printer,
 Plus,
 AlertTriangle,
 AlertCircle,
 Clock,
 Sparkles,
 Play,
 Check,
 ChevronRight,
 RefreshCw,
} from 'lucide-react'
import dynamic from 'next/dynamic'
import { DashboardChartsSkeleton } from './dashboard-charts'

const DashboardCharts = dynamic(
  () => import('./dashboard-charts').then((mod) => mod.DashboardCharts),
  { ssr: false, loading: () => <DashboardChartsSkeleton /> }
)

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DataTable } from '@/components/shared/data-table'
import { StatusBadge } from '@/components/shared/status-badge'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { DateDisplay } from '@/components/shared/date-display'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'
import { KpiCard, KpiGrid, KpiColorVariant } from '@/components/shared/kpi-card'
import { TrialDashboardCard } from '@/components/subscriptions/trial-dashboard-card'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'

import { ColumnDef } from '@/types/common.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { OwnerDashboard } from '@/components/dashboard/roles/owner-dashboard'
import { SalesDashboard } from '@/components/dashboard/roles/sales-dashboard'
import { DesignerDashboard } from '@/components/dashboard/roles/designer-dashboard'
import { OperatorDashboard } from '@/components/dashboard/roles/operator-dashboard'
import { StoreDashboard } from '@/components/dashboard/roles/store-dashboard'
import { DeliveryDashboard } from '@/components/dashboard/roles/delivery-dashboard'
import { BranchManagerDashboard } from '@/components/dashboard/roles/branch-manager-dashboard'
import { NewWorkWizard } from '@/components/orders/new-work-wizard'
import { PrintFlowDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
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
import { SalesOrderRecord } from '@/types/order.types'
import { ExpenseRecord } from '@/types/accounting.types'
import { PaymentRecord, InvoiceRecord } from '@/types/billing.types'
import { MaterialRecord } from '@/types/inventory.types'
import { ProductionJobRecord, ProductionTaskRecord } from '@/types/production.types'
import { DesignJobRecord } from '@/types/design.types'
import { DeliveryChallanRecord } from '@/types/logistics.types'
import { QuotationRecord } from '@/types/quotation.types'
import { cn } from '@/lib/utils'

import { DashboardHeader } from './dashboard-header'
import { DashboardQuickActions, ICON_MAP } from './dashboard-quick-actions'
import { DashboardModals } from './dashboard-modals'

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

export interface DashboardViewProps {
 initialSnapshot?: OwnerDashboardSnapshot | null
 tenantSlug?: string
}

export function DashboardView({ initialSnapshot = null, tenantSlug }: DashboardViewProps = {}) {
 const router = useRouter()
 const pathname = usePathname()
 const { company, currentUser, currentRole, currentBranch } = useTenant()
 const { userCtx, can, isOwner, isBranchManager, isSales, isDesigner, isOperator, isAccountant, isDelivery, isStore, activeRole, activeResponsibilities, isMultiRole } = usePermissions()
 const { locale, tBilingual } = useI18n()

 const slug = company?.slug || tenantSlug || ''
 const canSeeFinancials = isOwner || isBranchManager || isSales || isAccountant || can('view', 'invoices') || can('view', 'reports')

  // Multi-Responsibility active workspace selection state
 const [selectedRoleWorkspace, setSelectedRoleWorkspace] = useState<string | null>(null)


  // Live Data Stores
 const [orders, , orderHelpers] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [], slug)
 const [customers, , custHelpers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [], slug)
 const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [], slug)
 const [payments] = useDataStore<PaymentRecord[]>(STORAGE_KEYS.PAYMENTS, [], slug)
 const [expenses] = useDataStore<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, [], slug)
 const [materials] = useDataStore<MaterialRecord[]>(STORAGE_KEYS.MATERIALS, [], slug)
 const [productionJobs, , prodHelpers] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [], slug)
 const [designJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [], slug)
 const [deliveryChallans, , deliveryHelpers] = useDataStore<DeliveryChallanRecord[]>(STORAGE_KEYS.DELIVERY_CHALLANS, [], slug)
 const [quotations] = useDataStore<QuotationRecord[]>(STORAGE_KEYS.QUOTATIONS, [], slug)

  // State Management
 const [activeModal, setActiveModal] = useState<string | null>(null)
 const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false)
 const [activeWorkItem, setActiveWorkItem] = useState<MyWorkItem | null>(null)
 const { showToast } = useToast()

  // Owner Snapshot & Realtime State with Zero Hydration Mismatch
 const [ownerSnapshot, setOwnerSnapshot] = useState<OwnerDashboardSnapshot | null>(initialSnapshot)
 const [isLoadingOwner, setIsLoadingOwner] = useState(!initialSnapshot)
 const [isUpdatingOwner, setIsUpdatingOwner] = useState(false)
 const [ownerError, setOwnerError] = useState<string | null>(null)
 const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>(undefined)

 const { lastEventTime } = useRealtimeSync(company?.id)

  // Hydrate from localStorage cache on client if initialSnapshot was null on SSR
 useEffect(() => {
 if (!ownerSnapshot && typeof window !== 'undefined') {
 try {
 const cached = PrintFlowDataStore.get<OwnerDashboardSnapshot | null>('printflow_dashboard_snapshot_cache' as any, slug)
 if (cached && cached.companyId && company?.id && cached.companyId === company.id) {
 setOwnerSnapshot(cached)
 setIsLoadingOwner(false)
        }
      } catch {}
    }
  }, [company?.id, ownerSnapshot, slug])

 const fetchOwnerSnapshot = useCallback(async (isBackground = false) => {
 if (!isOwner) return
 if (!isBackground && !ownerSnapshot) {
 setIsLoadingOwner(true)
    } else {
 setIsUpdatingOwner(true)
    }
 setOwnerError(null)
 try {
 const res = await getOwnerDashboardDataAction(currentBranch?.id)
 if (res.success && res.data) {
 setOwnerSnapshot(res.data)
 try {
 PrintFlowDataStore.set('printflow_dashboard_snapshot_cache' as any, res.data, true, slug)
        } catch {}
      } else {
 if (!ownerSnapshot) {
 setOwnerError(res.error || 'Failed to fetch business owner metrics.')
        }
      }
    } catch (err: any) {
 if (!ownerSnapshot) {
 setOwnerError(err?.message || 'Unexpected network error loading dashboard snapshot.')
      }
    } finally {
 setIsLoadingOwner(false)
 setIsUpdatingOwner(false)
    }
  }, [isOwner, currentBranch, ownerSnapshot])

 useEffect(() => {
 if (isOwner) {
 fetchOwnerSnapshot(!ownerSnapshot ? false : true)
    }
  }, [isOwner, company?.id, currentBranch?.id])

 useEffect(() => {
 if (!isOwner) return

 let timer: NodeJS.Timeout | null = null
 const scheduleRefresh = () => {
 if (timer) clearTimeout(timer)
 timer = setTimeout(() => {
 fetchOwnerSnapshot(true)
      }, 400)
    }

 if (lastEventTime) {
 scheduleRefresh()
    }

 if (typeof window !== 'undefined') {
 window.addEventListener('printflow_table_synced', scheduleRefresh)
 window.addEventListener('printflow_data_sync', scheduleRefresh)
 return () => {
 if (timer) clearTimeout(timer)
 window.removeEventListener('printflow_table_synced', scheduleRefresh)
 window.removeEventListener('printflow_data_sync', scheduleRefresh)
      }
    }

 return () => {
 if (timer) clearTimeout(timer)
    }
  }, [isOwner, lastEventTime, fetchOwnerSnapshot])

 const showNotification = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
 showToast({ type, title: msg, titleBn: msg })
  }, [showToast])

  // Dashboard Data Aggregation
 const rawData = useMemo(() => ({
 orders: Array.isArray(orders) ? orders : [],
 productionJobs: Array.isArray(productionJobs) ? productionJobs : [],
 designJobs: Array.isArray(designJobs) ? designJobs : [],
 customers: Array.isArray(customers) ? customers : [],
 invoices: Array.isArray(invoices) ? invoices : [],
 payments: Array.isArray(payments) ? payments : [],
 expenses: Array.isArray(expenses) ? expenses : [],
 materials: Array.isArray(materials) ? materials : [],
 deliveryChallans: Array.isArray(deliveryChallans) ? deliveryChallans : [],
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
 const fullRoute = getTenantNavHref(qa.target, pathname, slug)
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
 router.push(getTenantNavHref('/design', pathname, slug))
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

 const num = (v: number | string) => (typeof v === 'number' ? v.toLocaleString() : v)

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
        <span className="tabular-nums text-xs font-bold text-blue-600 dark:text-blue-400">
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
          <span className="font-semibold text-foreground bangla-text">
            {tBilingual(row.customerName, row.customerNameBn)}
          </span>
          <span className="text-xs text-muted-foreground">{row.specs}</span>
        </div>
      ),
    },
    {
 key: 'product',
 header: 'Printing Item',
 headerBn: 'আইটেম বিবরণ',
 render: (row) => (
        <span className="text-xs text-foreground">
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
              <CurrencyDisplay amount={row.amount} className="text-xs font-bold"/>
            ),
          },
        ]
      : []),
    {
 key: 'date',
 header: 'Date',
 sortable: true,
 render: (row) => <DateDisplay date={row.date} className="text-xs"/>,
    },
  ]

 const userDisplayName = currentUser?.profile?.full_name
    ? tBilingual(currentUser.profile.full_name, currentUser.profile.full_name_bn || currentUser.profile.full_name)
    : 'Team Member'

 const convertedTasks: ProductionTaskRecord[] = useMemo(() => {
 return (productionJobs || []).map((job) => ({
 id: job.id,
 company_id: job.company_id || '',
 task_number: job.production_job_number,
 production_job_id: job.id,
 task_type: (job.department as any) || 'printing',
 task_name: job.product_name,
 status: (job.status as any) || 'queued',
 priority: (job.priority as any) || 'normal',
 assigned_to: job.assigned_workers?.[0] || '',
 assigned_to_name: job.assigned_workers?.[0] || 'Unassigned',
 target_quantity: job.quantity,
 completed_quantity: job.status === 'completed' ? job.quantity : 0,
 material_spec: job.material_spec,
 dimensions_spec: job.dimensions_spec,
 created_at: job.created_at,
 updated_at: job.updated_at,
 deadline: job.deadline,
    } as unknown as ProductionTaskRecord))
  }, [productionJobs])

 const totalReceivableDue = useMemo(() => {
 return (invoices || []).reduce((sum, inv) => sum + (inv.due_amount || 0), 0)
  }, [invoices])

 const todaySales = useMemo(() => {
 const todayStr = new Date().toISOString().split('T')[0]
 return (orders || [])
      .filter((o) => o.created_at?.startsWith(todayStr))
      .reduce((sum, o) => sum + (o.final_price || 0), 0)
  }, [orders])

 const readyDeliveriesCount = useMemo(() => {
 return (deliveryChallans || []).filter((d) => d.status === 'scheduled' || d.status === 'assigned').length
  }, [deliveryChallans])

  // Role-Specific Operational Dashboard Workspaces for Staff
 const availableWorkspaces = useMemo(() => {
 const list: { id: string; label: string; labelBn: string; icon: string }[] = []
 if (isBranchManager) list.push({ id: 'branch_manager', label: 'Branch Management', labelBn: 'ব্রাঞ্চ ড্যাশবোর্ড', icon: '🏢' })
 if (isSales) list.push({ id: 'sales', label: 'Sales & Orders', labelBn: 'সেলস ও অর্ডার', icon: '💼' })
 if (isDesigner) list.push({ id: 'designer', label: 'Design Workbench', labelBn: 'ডিজাইন প্যানেল', icon: '🎨' })
 if (isOperator) list.push({ id: 'operator', label: 'Shop Floor Terminal', labelBn: 'অপারেটর টার্মিনাল', icon: '⚙️' })
 if (isDelivery) list.push({ id: 'delivery', label: 'Delivery & Challans', labelBn: 'ডেলিভারি ও চালান', icon: '🚚' })
 if (isStore) list.push({ id: 'store', label: 'Inventory & Store', labelBn: 'স্টোর ও কাঁচামাল', icon: '📦' })
 return list
  }, [isBranchManager, isSales, isDesigner, isOperator, isDelivery, isStore])

 const activeWorkspaceId = selectedRoleWorkspace || availableWorkspaces[0]?.id

  // 1. Business Owner Executive Control Center Dispatch
 if (isOwner) {
 if (isLoadingOwner && !ownerSnapshot) {
 return (
        <div className="space-y-6 pb-12 animate-pulse">
          {/* Header Skeleton */}
          <div className="rounded-xl bg-card border border-border shadow-xs p-5 sm:p-6">
            <div className="h-4 w-40 bg-card/20 rounded-full mb-3"/>
            <div className="h-8 w-64 bg-card/30 rounded-lg mb-2"/>
            <div className="h-4 w-96 bg-card/20 rounded-md"/>
          </div>

          {/* 4 KPIs Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[72px] rounded-xl bg-muted border border-border p-3"/>
            ))}
          </div>

          {/* Needs Attention & Production Feed Skeletons */}
          <div className="h-48 rounded-xl bg-muted border border-border p-4"/>
          <div className="h-64 rounded-xl bg-muted border border-border p-4"/>
        </div>
      )
    }

 if (ownerError && !ownerSnapshot) {
 return (
        <div className="space-y-6 pb-12">
          <Card className="p-8 border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/20 text-center">
            <div className="inline-flex p-3 rounded-full bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 mb-4">
              <AlertCircle className="h-8 w-8"/>
            </div>
            <h2 className="text-lg font-bold text-foreground bangla-text mb-1">
              {tBilingual('Unable to load business dashboard', 'ড্যাশবোর্ড তথ্য লোড করা যায়নি')}
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto bangla-text">
              {ownerError}
            </p>
            <Button
 onClick={() => fetchOwnerSnapshot(false)}
 className="bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer">
              <RefreshCw className="h-4 w-4 mr-2"/>
              {tBilingual('Retry Loading', 'পুনরায় চেষ্টা করুন')}
            </Button>
          </Card>
        </div>
      )
    }

 if (!ownerSnapshot) {
 return (
        <div className="space-y-6 pb-12 animate-pulse">
          {/* Header Skeleton */}
          <div className="rounded-xl bg-card border border-border shadow-xs p-5 sm:p-6">
            <div className="h-4 w-40 bg-card/20 rounded-full mb-3"/>
            <div className="h-8 w-64 bg-card/30 rounded-lg mb-2"/>
            <div className="h-4 w-96 bg-card/20 rounded-md"/>
          </div>

          {/* 4 KPIs Skeleton */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-[72px] rounded-xl bg-muted border border-border p-3"/>
            ))}
          </div>

          {/* Needs Attention & Production Feed Skeletons */}
          <div className="h-48 rounded-xl bg-muted border border-border p-4"/>
          <div className="h-64 rounded-xl bg-muted border border-border p-4"/>
        </div>
      )
    }

 return (
      <div className="space-y-6">
        <OwnerDashboard
 data={ownerSnapshot}
 onOpenNewWork={() => setActiveModal('new_work')}
 onOpenPaymentModal={(invId) => {
 setSelectedInvoiceId(invId)
 setActiveModal('record_payment')
          }}
 onRefresh={() => fetchOwnerSnapshot(false)}
 isUpdating={isUpdatingOwner}
        />

        {/* Executive Modals */}
        {activeModal === 'new_work' && (
          <NewWorkWizard
 isOpen={true}
 isInlineModal={true}
 onClose={() => setActiveModal(null)}
 onSuccess={() => {
 setActiveModal(null)
 fetchOwnerSnapshot(true)
            }}
          />
        )}

        {activeModal === 'record_payment' && (
          <RecordPaymentModal
 open={true}
 preselectedInvoiceId={selectedInvoiceId}
 onOpenChange={(open) => {
 if (!open) {
 setActiveModal(null)
 setSelectedInvoiceId(undefined)
              }
            }}
 onPaymentRecorded={() => {
 setActiveModal(null)
 setSelectedInvoiceId(undefined)
 fetchOwnerSnapshot(true)
            }}
          />
        )}
      </div>
    )
  }



 if (!isOwner && availableWorkspaces.length > 0 && activeWorkspaceId) {
 const renderWorkspaceSwitcher = () => {
 if (availableWorkspaces.length <= 1) return null
 return (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-card border border-border shadow-sm">
          <div className="flex items-center gap-2">
            <Badge variant="outline"className="bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs gap-1.5 border-blue-200 py-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse"/>
              {tBilingual('Multi-Responsibility Workspace', 'বহুমুখী দায়িত্ব কর্মক্ষেত্র')}
            </Badge>
            <span className="text-xs text-muted-foreground hidden md:inline">
              {tBilingual('Switch active role view:', 'বর্তমান প্যানেল পরিবর্তন করুন:')}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {availableWorkspaces.map((ws) => (
              <Button
 key={ws.id}
 size="sm"variant={activeWorkspaceId === ws.id ? 'default' : 'outline'}
 className={cn(
                  'h-8 text-xs font-semibold gap-1.5 transition-all cursor-pointer',
 activeWorkspaceId === ws.id
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs'
                    : 'hover:bg-muted text-foreground '
                )}
 onClick={() => setSelectedRoleWorkspace(ws.id)}
              >
                <span>{ws.icon}</span>
                <span>{tBilingual(ws.label, ws.labelBn)}</span>
              </Button>
            ))}
          </div>
        </div>
      )
    }

 if (activeWorkspaceId === 'branch_manager') {
 return (
        <div className="space-y-6">
          {renderWorkspaceSwitcher()}
          <BranchManagerDashboard
 branch={currentBranch}
 orders={orders}
 invoices={invoices}
 payments={payments}
 tasks={convertedTasks}
 onOpenNewWork={() => setActiveModal('new_work')}
 onOpenPaymentModal={() => setActiveModal('record_payment')}
 onRefresh={orderHelpers.reload}
          />
          {activeModal === 'new_work' && (
            <NewWorkWizard
 isOpen={true}
 isInlineModal={true}
 onClose={() => setActiveModal(null)}
 onSuccess={() => {
 setActiveModal(null)
 orderHelpers.reload()
              }}
            />
          )}
          {activeModal === 'record_payment' && (
            <RecordPaymentModal
 open={true}
 onOpenChange={(open) => !open && setActiveModal(null)}
 onPaymentRecorded={() => {
 setActiveModal(null)
 orderHelpers.reload()
              }}
            />
          )}
        </div>
      )
    }

 if (activeWorkspaceId === 'operator') {
 return (
        <div className="space-y-6">
          {renderWorkspaceSwitcher()}
          <OperatorDashboard tasks={convertedTasks} onRefresh={orderHelpers.reload} />
          {activeModal === 'new_work' && (
            <NewWorkWizard
 isOpen={true}
 isInlineModal={true}
 onClose={() => setActiveModal(null)}
 onSuccess={() => {
 setActiveModal(null)
 orderHelpers.reload()
              }}
            />
          )}
        </div>
      )
    }

 if (activeWorkspaceId === 'designer') {
 return (
        <div className="space-y-6">
          {renderWorkspaceSwitcher()}
          <DesignerDashboard tasks={convertedTasks} onRefresh={orderHelpers.reload} />
        </div>
      )
    }

 if (activeWorkspaceId === 'sales') {
 return (
        <div className="space-y-6">
          {renderWorkspaceSwitcher()}
          <SalesDashboard
 metrics={{
 pendingQuotations: (quotations || []).filter((q) => q.status === 'draft' || q.status === 'sent').length,
 unpaidInvoicesCount: (invoices || []).filter((i) => i.status === 'unpaid').length,
 unpaidDuesTotal: totalReceivableDue,
 todaySales: todaySales,
 customerFollowupsCount: (customers || []).length,
            }}
 tasks={convertedTasks}
 onOpenNewWork={() => setActiveModal('new_work')}
 onOpenPaymentModal={() => setActiveModal('record_payment')}
 onRefresh={orderHelpers.reload}
          />
          {activeModal === 'new_work' && (
            <NewWorkWizard
 isOpen={true}
 isInlineModal={true}
 onClose={() => setActiveModal(null)}
 onSuccess={() => {
 setActiveModal(null)
 orderHelpers.reload()
              }}
            />
          )}
          {activeModal === 'record_payment' && (
            <RecordPaymentModal
 open={true}
 onOpenChange={(open) => !open && setActiveModal(null)}
 onPaymentRecorded={() => {
 setActiveModal(null)
 orderHelpers.reload()
              }}
            />
          )}
        </div>
      )
    }

 if (activeWorkspaceId === 'delivery') {
 return (
        <div className="space-y-6">
          {renderWorkspaceSwitcher()}
          <DeliveryDashboard
 metrics={{
 readyForDispatchCount: readyDeliveriesCount,
 outForDeliveryCount: (deliveryChallans || []).filter((d) => d.status === 'out_for_delivery' || (d as any).status === 'in_transit').length,
 deliveredTodayCount: (deliveryChallans || []).filter((d) => d.status === 'delivered').length,
 cashCollectedCount: 0,
            }}
 onRefresh={orderHelpers.reload}
          />
        </div>
      )
    }

 if (activeWorkspaceId === 'store') {
 const lowStock = (materials || []).filter((m) => (m.current_stock || 0) <= (m.min_stock_level || 10)).length
 return (
        <div className="space-y-6">
          {renderWorkspaceSwitcher()}
          <StoreDashboard
 metrics={{
 lowStockCount: lowStock,
 pendingRequisitionsCount: 0,
 todayIssuesCount: (productionJobs || []).filter((p) => p.status === 'in_progress').length,
 todayReceivedCount: 0,
            }}
 onRefresh={orderHelpers.reload}
          />
        </div>
      )
    }
  }


 return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP HEADER BANNER (Mobile-First, Bilingual) */}
      <DashboardHeader
 companyName={company?.name}
 companyNameBn={company?.name_bn}
 branchName={currentBranch?.name}
 userDisplayName={userDisplayName}
 activeResponsibilities={activeResponsibilities}
      />

      {/* Free Trial Upgrade Notice Card */}
      <TrialDashboardCard />

      {/* 2. PRIORITIZED QUICK ACTIONS HUB (Mobile-First, Large Touch Targets min 44px) */}
      <DashboardQuickActions
 primaryActions={quickActions.primaryActions}
 hasSecondaryActions={quickActions.secondaryActions.length > 0}
 onExecuteAction={handleExecuteQuickAction}
 onOpenMoreActions={() => setIsMoreActionsOpen(true)}
      />

      {/* 3. NEEDS ATTENTION BAR (Action Required: Delays, Approvals, Revisions) */}
      {attentionItems.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1">
            <AlertTriangle className="h-4 w-4 text-amber-500"/>
            <h2 className="text-xs font-bold uppercase tracking-wider text-foreground bangla-text">
              {tBilingual('Needs Attention', 'জরুরি মনোযোগ')}
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
                    <h3 className="font-bold text-xs sm:text-sm text-foreground bangla-text">
                      {tBilingual(item.titleEn, item.titleBn)}
                    </h3>
                  </div>
                  <p className="text-xs text-muted-foreground bangla-text pl-4">
                    {tBilingual(item.subtitleEn, item.subtitleBn)}
                  </p>
                </div>

                <Button
 size="sm"variant="outline"onClick={() => {
 if (item.actionType === 'route') {
 const fullRoute = getTenantNavHref(item.actionTarget, pathname, slug)
 router.push(fullRoute)
                    } else if (item.actionType === 'modal') {
 setActiveModal(item.actionTarget)
                    }
                  }}
 className={cn(
                    'h-9 text-xs font-bold shrink-0 min-h-[36px] bangla-text cursor-pointer',
 item.severity === 'urgent'
                      ? 'bg-red-600 text-white hover:bg-red-700 border-red-600'
                      : 'bg-amber-600 text-white hover:bg-amber-700 border-amber-600'
                  )}
                >
                  <span>{tBilingual(item.actionLabelEn, item.actionLabelBn)}</span>
                  <ChevronRight className="h-3.5 w-3.5 ml-1"/>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4. TODAY AT A GLANCE (Scope-Filtered Metric Cards) */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp className="h-4 w-4 text-blue-600"/>
          <h2 className="text-xs font-bold uppercase tracking-wider text-foreground bangla-text">
            {tBilingual("Today's Overview", 'আজকের সার্বিক হিসাব')}
          </h2>
        </div>

        <KpiGrid columns={4}>
          {metrics.map((m) => {
 const Icon = ICON_MAP[m.icon] || Sparkles
 return (
              <KpiCard
 key={m.id}
 titleEn={m.labelEn}
 titleBn={m.labelBn}
 value={m.value}
 unitEn={m.unitEn}
 unitBn={m.unitBn}
 isCurrency={m.unitEn === 'BDT'}
 icon={Icon}
 colorVariant={(m.colorVariant as KpiColorVariant) || 'primary'}
 trend={
 m.changeTextEn
                    ? {
 value: m.changeTextEn,
 direction:
 m.changeType === 'positive'
                            ? 'up'
                            : m.changeType === 'negative'
                            ? 'down'
                            : 'neutral',
                      }
                    : undefined
                }
 subtitleEn={!m.changeTextEn ? m.subtitleEn : undefined}
 subtitleBn={!m.changeTextEn ? m.subtitleBn : undefined}
              />
            )
          })}
        </KpiGrid>
      </div>

      {/* 5. MY WORK / TODAY'S ACTIVE WORK (Operators, Designers, Delivery Field Workers) */}
      {myWorkItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Printer className="h-4 w-4 text-purple-600"/>
              <h2 className="text-xs font-bold uppercase tracking-wider text-foreground bangla-text">
                {tBilingual("My Work Queue & Shift Tasks", 'আমার দায়িত্বপ্রাপ্ত কাজের তালিকা')}
              </h2>
            </div>
            <span className="text-xs text-muted-foreground bangla-text">
              {num(myWorkItems.length)} {tBilingual('Active Items', 'টি কাজ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {myWorkItems.map((item) => (
              <Card
 key={item.id}
 className="p-4 border-border shadow-xs flex flex-col justify-between gap-3 bg-card">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="tabular-nums text-xs font-bold text-blue-600 dark:text-blue-400">
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
                        'text-xs py-0.5 px-2 h-5 bangla-text',
                        (item.status === 'in_progress' || item.status === 'printing') &&
                          'bg-purple-600 text-white font-bold animate-pulse'
                      )}
                    >
                      {tBilingual(item.statusLabelEn, item.statusLabelBn)}
                    </Badge>
                  </div>

                  <h3 className="font-bold text-sm text-foreground bangla-text line-clamp-1">
                    {tBilingual(item.titleEn, item.titleBn)}
                  </h3>

                  <p className="text-xs text-muted-foreground bangla-text">
                    <strong className="text-foreground">{item.customerName}</strong>
                  </p>

                  <p className="text-xs text-muted-foreground tabular-nums">{item.specs}</p>
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5"/>
                    {item.deadline}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {item.secondaryActionLabelEn && item.secondaryActionType && (
                      <Button
 size="sm"variant="ghost"onClick={() => handleWorkItemAction(item, item.secondaryActionType!)}
 className="h-8 px-2.5 text-xs font-semibold text-muted-foreground min-h-[36px] bangla-text cursor-pointer">
                        {tBilingual(item.secondaryActionLabelEn, item.secondaryActionLabelBn || item.secondaryActionLabelEn)}
                      </Button>
                    )}

                    {item.primaryActionLabelEn && item.primaryActionType && (
                      <Button
 size="sm"onClick={() => handleWorkItemAction(item, item.primaryActionType!)}
 className={cn(
                          'h-8 px-3 text-xs font-bold shadow-xs min-h-[36px] bangla-text cursor-pointer',
 item.primaryActionType === 'complete_job' || item.primaryActionType === 'confirm_delivered'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        )}
                      >
                        {item.primaryActionType === 'start_job' && <Play className="h-3 w-3 mr-1"/>}
                        {(item.primaryActionType === 'complete_job' || item.primaryActionType === 'confirm_delivered') && (
                          <Check className="h-3 w-3 mr-1"/>
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
      <Card className="border-border shadow-xs">
        <CardHeader className="pb-3 border-b border-border">
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
 size="sm"variant="outline"onClick={() => router.push(getTenantNavHref('/orders', pathname, slug))}
 className="text-xs bangla-text min-h-[36px] cursor-pointer">
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
 onRowClick={(row) => router.push(getTenantNavHref(`/orders/${row.id}`, pathname, slug))}
            />
          ) : (
            <div className="p-8 text-center space-y-2">
              <p className="text-xs text-muted-foreground bangla-text">
                {tBilingual('No active work orders found for your account scope.', 'আপনার জন্য কোনো চলতি অর্ডার নেই।')}
              </p>
              {can('create', 'orders') && (
                <Button
 size="sm"onClick={() => setActiveModal('work_order')}
 className="bg-blue-600 hover:bg-blue-700 text-xs font-bold bangla-text">
                  <Plus className="h-3.5 w-3.5 mr-1"/>
                  {tBilingual('+ Create New Work Order', '+ নতুন অর্ডার তৈরি করুন')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals & Dialogs */}
      <DashboardModals
 activeModal={activeModal}
 onCloseModal={() => {
 setActiveModal(null)
 setActiveWorkItem(null)
        }}
 isMoreActionsOpen={isMoreActionsOpen}
 onCloseMoreActions={() => setIsMoreActionsOpen(false)}
 onExecuteQuickAction={handleExecuteQuickAction}
 allAllowedActions={quickActions.allAllowedActions}
 companyId={company?.id}
 currentBranchName={currentBranch?.name}
 currentUserName={currentUser?.profile?.full_name}
 activeWorkItem={activeWorkItem}
 onWorkOrderSuccess={(savedOrder, sentToManager) => {
 orderHelpers.reload()
 showNotification(
 sentToManager
              ? `Work Order #${savedOrder.order_number} saved & Invoice Request sent to Manager!`
              : `Work Order #${savedOrder.order_number} registered successfully!`
          )
        }}
 onCustomerAdded={(name) => {
 custHelpers.reload()
 showNotification(`Customer '${name}' registered successfully!`)
        }}
 onExpenseAdded={(title, amt) => {
 showNotification(`Expense '${title}' (${formatBDT(amt)}) logged successfully!`)
        }}
 onMaterialAdded={(name) => {
 showNotification(`Stock entry for ${name} saved!`)
        }}
 onProblemReported={(workCode) => {
 prodHelpers.reload()
 showNotification(`Incident reported for ${workCode}. Supervisor notified.`)
        }}
      />
    </div>
  )
}
