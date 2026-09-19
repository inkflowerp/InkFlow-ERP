'use client'

import React, { useState, useTransition, useMemo } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  Palette,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  Unlock,
  Layers,
  Sparkles,
  ExternalLink,
  Flame,
  AlertTriangle,
  User,
  Filter,
  Kanban,
  List,
  FileCode,
  FileCheck2,
  Receipt,
  Send,
  Printer,
  ChevronRight,
  Upload,
  MessageSquare,
  History,
  Eye,
  RefreshCw,
  Check,
  X,
  SlidersHorizontal,
  Bell,
  CheckSquare,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { getFormatBadgeColor, isRenderableFormat, formatBDT } from '@/lib/formatters'
import type {
  DesignJobRecord,
  DesignStatus,
  DesignPriority,
  DesignFormat,
  DesignVersionRecord,
  DesignFeedbackRecord,
} from '@/types/design.types'
import type { InvoiceRecord } from '@/types/billing.types'
import type { InvoiceRequestRecord } from '@/types/workflow.types'
import type { SalesOrderRecord } from '@/types/order.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { CustomerRecord } from '@/types/crm.types'
import { WorkOrderModal } from '@/components/shared/work-order-modal'
import {
  markDesignReadyAction,
  updateDesignVersionApprovalAction,
  addDesignVersionAction,
  sendToPrintOperatorAction,
} from '@/actions/design.actions'
import { createInvoiceRequestAction } from '@/actions/invoice-request.actions'
import { cn } from '@/lib/utils'

type WorkbenchTab =
  | 'dashboard'
  | 'my_work'
  | 'work_orders'
  | 'customer_approvals'
  | 'design_versions'
  | 'tasks'
  | 'notifications'

type MyWorkSubFilter =
  | 'all'
  | 'new'
  | 'designing'
  | 'awaiting_approval'
  | 'revision'
  | 'invoice_requested'
  | 'ready_for_production'

export default function DesignerWorkbenchPage() {
  const params = useParams()
  const router = useRouter()
  const { company, currentUser } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id || 'c-01'

  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('my_work')
  const [workFilter, setWorkFilter] = useState<MyWorkSubFilter>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [intakeFilter, setIntakeFilter] = useState<string>('all')

  // Datastore hooks
  const [jobs, setJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [invoiceRequests] = useDataStore<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS, [])
  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [notifications] = useDataStore<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [])

  // Modals state
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<DesignJobRecord | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isRequestInvoiceModalOpen, setIsRequestInvoiceModalOpen] = useState(false)
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null)

  // Version upload form
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadFormat, setUploadFormat] = useState<DesignFormat>('ai')
  const [uploadNotes, setUploadNotes] = useState('')

  // Approval form
  const [approverName, setApproverName] = useState('')
  const [approvalNotes, setApprovalNotes] = useState('')

  // Feedback form
  const [feedbackText, setFeedbackText] = useState('')

  // Invoice request form
  const [reqNotes, setReqNotes] = useState('')
  const [reqEstAmount, setReqEstAmount] = useState<number>(5000)

  const showNotification = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotificationMsg({ text, type })
    setTimeout(() => setNotificationMsg(null), 4000)
  }

  // Tenant-scoped jobs
  const tenantJobs = useMemo(() => {
    return (jobs || []).filter((j) => !j.company_id || j.company_id === companyId)
  }, [jobs, companyId])

  // Tenant-scoped invoice requests
  const tenantRequests = useMemo(() => {
    return (invoiceRequests || []).filter((r) => !r.company_id || r.company_id === companyId)
  }, [invoiceRequests, companyId])

  // Operational KPIs
  const kpiStats = useMemo(() => {
    const newCount = tenantJobs.filter((j) => j.status === 'received').length
    const designingCount = tenantJobs.filter((j) => j.status === 'designing' || j.status === 'in_progress').length
    const approvalCount = tenantJobs.filter((j) => j.status === 'customer_approval').length
    const revisionCount = tenantJobs.filter((j) => j.status === 'revision').length
    const invoiceRequestedCount = tenantJobs.filter((j) => j.commercial_status === 'invoice_requested').length
    const readyProdCount = tenantJobs.filter(
      (j) =>
        (j.status === 'approved' || j.is_locked) &&
        (j.commercial_status === 'invoice_created' || Boolean(j.invoice_id))
    ).length

    const todayStr = new Date().toISOString().split('T')[0]
    const dueTodayCount = tenantJobs.filter((j) => j.deadline && j.deadline.startsWith(todayStr)).length

    return {
      newCount,
      designingCount,
      approvalCount,
      revisionCount,
      invoiceRequestedCount,
      readyProdCount,
      dueTodayCount,
    }
  }, [tenantJobs])

  // Filtered jobs based on active tab, sub-filter, search, and priority
  const filteredJobs = useMemo(() => {
    return tenantJobs.filter((job) => {
      // Search
      if (search.trim()) {
        const q = search.toLowerCase()
        const match =
          job.design_number.toLowerCase().includes(q) ||
          job.title.toLowerCase().includes(q) ||
          job.customer_name.toLowerCase().includes(q) ||
          job.designer_name.toLowerCase().includes(q) ||
          (job.order_number && job.order_number.toLowerCase().includes(q)) ||
          (job.invoice_number && job.invoice_number.toLowerCase().includes(q))
        if (!match) return false
      }

      // Priority filter
      if (priorityFilter !== 'all' && job.priority !== priorityFilter) {
        return false
      }

      // Intake source filter
      if (intakeFilter !== 'all') {
        const source = job.intake_source || 'direct_customer'
        if (source !== intakeFilter) return false
      }

      // Tab / Subfilter
      if (activeTab === 'customer_approvals') {
        return job.status === 'customer_approval' || job.status === 'revision'
      }

      if (activeTab === 'tasks') {
        return job.status !== 'approved'
      }

      if (activeTab === 'my_work') {
        if (workFilter === 'new') return job.status === 'received'
        if (workFilter === 'designing') return job.status === 'designing' || job.status === 'in_progress'
        if (workFilter === 'awaiting_approval') return job.status === 'customer_approval'
        if (workFilter === 'revision') return job.status === 'revision'
        if (workFilter === 'invoice_requested') return job.commercial_status === 'invoice_requested'
        if (workFilter === 'ready_for_production') {
          return (
            (job.status === 'approved' || job.is_locked) &&
            (job.commercial_status === 'invoice_created' || Boolean(job.invoice_id))
          )
        }
      }

      return true
    })
  }, [tenantJobs, activeTab, workFilter, search, priorityFilter, intakeFilter])

  // State transitions & actions
  const handleStartDesign = async (job: DesignJobRecord) => {
    startTransition(async () => {
      const now = new Date().toISOString()
      const updated = {
        ...job,
        status: 'designing' as const,
        updated_at: now,
      }
      PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated)
      showNotification(`Job #${job.design_number} moved to Designing workbench!`)
    })
  }

  const handleMarkReady = async (job: DesignJobRecord) => {
    startTransition(async () => {
      try {
        const hasInvoice = Boolean(job.invoice_id) || job.commercial_status === 'invoice_created'
        await markDesignReadyAction(job.id, 'Designer marked design ready', companyId)
        
        const nextStatus = job.customer_approval_required === false ? 'approved' : 'customer_approval'
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          status: nextStatus,
          commercial_status: hasInvoice ? 'invoice_created' : 'invoice_required',
          updated_at: new Date().toISOString(),
        })

        if (!hasInvoice) {
          showNotification('Design marked READY. Invoice is missing — please request invoice from Manager.', 'warning')
        } else if (job.customer_approval_required === false) {
          showNotification('Design marked READY! Approval bypassed per product configuration. Ready for print floor!')
        } else {
          showNotification('Design marked READY! Dispatched for Customer Proof Approval.')
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to mark design ready', 'warning')
      }
    })
  }

  const handleOpenInvoiceRequest = (job: DesignJobRecord) => {
    // Duplicate request check
    const existingReq = tenantRequests.find(
      (r) =>
        r.status === 'pending' &&
        (r.design_job_id === job.id || (job.sales_order_id && r.sales_order_id === job.sales_order_id))
    )
    if (existingReq) {
      showNotification(`An invoice request (${existingReq.request_number}) is already pending for this job!`, 'warning')
      return
    }
    setSelectedJob(job)
    setReqNotes(`Design ${job.design_number} completed. Please generate invoice for ${job.customer_name}.`)
    setIsRequestInvoiceModalOpen(true)
  }

  const handleDispatchInvoiceRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    startTransition(async () => {
      try {
        const res = await createInvoiceRequestAction({
          companyId,
          customerId: selectedJob.customer_id || null,
          customerName: selectedJob.customer_name,
          customerPhone: (selectedJob as any).customer_phone || null,
          customerEmail: (selectedJob as any).customer_email || null,
          customerAddress: (selectedJob as any).customer_address || null,
          companyName: (selectedJob as any).company_name || null,
          salesOrderId: selectedJob.sales_order_id || null,
          orderNumber: selectedJob.order_number || null,
          designJobId: selectedJob.id,
          designNumber: selectedJob.design_number,
          itemsSummary: `${selectedJob.title} (${selectedJob.dimensions_spec || 'Standard'})`,
          estimatedAmount: reqEstAmount,
          notes: reqNotes,
        })

        if (!res.success) {
          showNotification(res.error || 'Failed to dispatch request', 'warning')
          return
        }

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, selectedJob.id, {
          commercial_status: 'invoice_requested',
          invoice_request_id: res.data?.id,
          updated_at: new Date().toISOString(),
        })

        setIsRequestInvoiceModalOpen(false)
        showNotification(`Invoice request #${res.data?.request_number} sent to Manager/Billing!`)
      } catch (err: any) {
        showNotification(err.message || 'Failed to send invoice request', 'warning')
      }
    })
  }

  const handleSendToPrint = async (job: DesignJobRecord) => {
    startTransition(async () => {
      try {
        const res = await sendToPrintOperatorAction(job.id, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to send to print operator', 'warning')
          return
        }

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, {
          status: 'approved',
          workflow_routing: 'ready_production',
          is_locked: true,
          updated_at: new Date().toISOString(),
        })

        showNotification(`Job #${job.design_number} queued for Print Floor Operators!`)
      } catch (err: any) {
        showNotification(err.message || 'Failed to send to print operator', 'warning')
      }
    })
  }

  const handleSaveUploadVersion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    const nextVer = (selectedJob.versions?.length || 0) + 1
    const newVer: DesignVersionRecord = {
      id: `dv-${Date.now()}`,
      design_job_id: selectedJob.id,
      version_number: nextVer,
      version_label: `Version ${nextVer}`,
      proof_file_url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80',
      proof_file_name: uploadFileName || `proof_v${nextVer}.png`,
      source_file_name: uploadFileName || `artwork_v${nextVer}.ai`,
      file_format: uploadFormat,
      file_size_bytes: 35000000,
      change_notes: uploadNotes,
      uploaded_by_name: currentUser?.profile?.full_name || 'Designer',
      is_approved: false,
      created_at: 'Just now',
    }

    const updatedJob = {
      ...selectedJob,
      current_version: nextVer,
      versions: [...(selectedJob.versions || []), newVer],
      status: 'customer_approval' as const,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, selectedJob.id, updatedJob)
    setIsUploadModalOpen(false)
    setUploadFileName('')
    setUploadNotes('')
    showNotification(`Version ${nextVer} uploaded and submitted for proof approval!`)
  }

  const handleApproveAndLock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    const verNum = selectedJob.current_version || selectedJob.versions?.length || 1
    const updatedVersions = (selectedJob.versions || []).map((v) => ({
      ...v,
      is_approved: v.version_number === verNum,
    }))

    const updatedJob = {
      ...selectedJob,
      status: 'approved' as const,
      approved_version: verNum,
      approved_by: approverName || selectedJob.customer_name,
      approval_timestamp: new Date().toISOString(),
      approval_note: approvalNotes,
      is_locked: true,
      versions: updatedVersions,
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, selectedJob.id, updatedJob)
    setIsApprovalModalOpen(false)
    setApproverName('')
    setApprovalNotes('')
    showNotification(`Version ${verNum} approved & locked for production!`)
  }

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    const verNum = selectedJob.current_version || selectedJob.versions?.length || 1
    const newFeedback: DesignFeedbackRecord = {
      id: `fb-${Date.now()}`,
      design_job_id: selectedJob.id,
      version_number: verNum,
      sender_type: 'customer',
      sender_name: selectedJob.customer_name,
      message: feedbackText,
      created_at: 'Just now',
    }

    const revCount = (selectedJob.revision_count || 0) + 1
    const updatedJob = {
      ...selectedJob,
      status: 'revision' as const,
      revision_count: revCount,
      customer_feedback: feedbackText,
      feedback_logs: [...(selectedJob.feedback_logs || []), newFeedback],
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, selectedJob.id, updatedJob)
    setIsFeedbackModalOpen(false)
    setFeedbackText('')
    showNotification(`Customer revision feedback logged (Revision #${revCount})!`)
  }

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notificationMsg && (
        <div
          className={cn(
            'p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between gap-2 border shadow-lg animate-in fade-in-0 slide-in-from-top-2 sticky top-4 z-50',
            notificationMsg.type === 'warning'
              ? 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-800'
              : 'bg-emerald-50 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-800'
          )}
        >
          <div className="flex items-center gap-2">
            {notificationMsg.type === 'warning' ? (
              <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 font-bold">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {tBilingual('Designer Workbench', 'ডিজাইনার ওয়ার্কবেঞ্চ')}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {tBilingual(
                  'Pre-press creative queue, proof approvals & direct customer work orders',
                  'প্রি-প্রেস ক্রিয়েটিভ কিউ, প্রুফ অনুমোদন এবং সরাসরি গ্রাহক ওয়ার্ক অর্ডার ম্যানেজমেন্ট'
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* PATH A: Direct Customer Work Order Creator */}
          <Button
            onClick={() => setIsWorkOrderOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs h-9 shadow-sm"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            {tBilingual('Direct Customer Work Order', 'সরাসরি গ্রাহক ওয়ার্ক অর্ডার')}
          </Button>

          <Button
            variant="outline"
            asChild
            className="text-xs h-9"
          >
            <Link href={`/${slug}/design`}>
              <Kanban className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
              {tBilingual('Kanban View', 'কানবান ভিউ')}
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Card
          onClick={() => {
            setActiveTab('my_work')
            setWorkFilter('new')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'new' && activeTab === 'my_work' ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>New Tasks</span>
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {kpiStats.newCount}
          </div>
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium mt-0.5">Needs action</div>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('my_work')
            setWorkFilter('designing')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'designing' && activeTab === 'my_work' ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Designing</span>
            <Palette className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
            {kpiStats.designingCount}
          </div>
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">In progress</div>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('my_work')
            setWorkFilter('awaiting_approval')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'awaiting_approval' && activeTab === 'my_work' ? 'ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Awaiting Proof</span>
            <Clock className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">
            {kpiStats.approvalCount}
          </div>
          <div className="text-[10px] text-purple-600 font-medium mt-0.5">Sent to customer</div>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('my_work')
            setWorkFilter('revision')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'revision' && activeTab === 'my_work' ? 'ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Revisions</span>
            <Flame className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {kpiStats.revisionCount}
          </div>
          <div className="text-[10px] text-rose-600 font-medium mt-0.5">Feedback received</div>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('my_work')
            setWorkFilter('invoice_requested')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'invoice_requested' && activeTab === 'my_work' ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Invoice Req.</span>
            <Receipt className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {kpiStats.invoiceRequestedCount}
          </div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">Pending billing</div>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('my_work')
            setWorkFilter('ready_for_production')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'ready_for_production' && activeTab === 'my_work' ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Ready for Print</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {kpiStats.readyProdCount}
          </div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Gates cleared</div>
        </Card>

        <Card
          onClick={() => {
            setActiveTab('tasks')
          }}
          className="p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Due Today</span>
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1">
            {kpiStats.dueTodayCount}
          </div>
          <div className="text-[10px] text-red-600 font-medium mt-0.5">Priority dispatch</div>
        </Card>
      </div>

      {/* Primary Workbench Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => setActiveTab('my_work')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'my_work'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Palette className="h-4 w-4" />
            <span>My Work Queue</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {tenantJobs.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('work_orders')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'work_orders'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Layers className="h-4 w-4" />
            <span>Work Orders</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {orders.length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('customer_approvals')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'customer_approvals'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <CheckSquare className="h-4 w-4" />
            <span>Customer Approvals</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {kpiStats.approvalCount + kpiStats.revisionCount}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'tasks'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <FileCode className="h-4 w-4" />
            <span>Tasks & Deadlines</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
            {notifications.length > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-red-600">
                {notifications.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-2 pb-1.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search customer, job #, title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="text-xs h-8 pl-8 pr-7"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <select
            value={intakeFilter}
            onChange={(e) => setIntakeFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Sources</option>
            <option value="direct_customer">Direct Customer</option>
            <option value="manager_billing">Manager/Billing</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priority</option>
            <option value="very_urgent">Very Urgent</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>
        </div>
      </div>

      {/* Sub-Filters for My Work Tab */}
      {activeTab === 'my_work' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Status:</span>
          {(
            [
              { id: 'all', label: 'All Jobs', count: tenantJobs.length },
              { id: 'new', label: 'New Tasks', count: kpiStats.newCount },
              { id: 'designing', label: 'Designing', count: kpiStats.designingCount },
              { id: 'awaiting_approval', label: 'Awaiting Proof', count: kpiStats.approvalCount },
              { id: 'revision', label: 'Revisions', count: kpiStats.revisionCount },
              { id: 'invoice_requested', label: 'Invoice Requested', count: kpiStats.invoiceRequestedCount },
              { id: 'ready_for_production', label: 'Ready for Print', count: kpiStats.readyProdCount },
            ] as const
          ).map((filter) => (
            <button
              key={filter.id}
              onClick={() => setWorkFilter(filter.id)}
              className={cn(
                'px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5',
                workFilter === filter.id
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              )}
            >
              <span>{filter.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1 py-0.2 rounded-full font-mono',
                  workFilter === filter.id ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600'
                )}
              >
                {filter.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Main Work Queue List / Cards */}
      {activeTab === 'my_work' || activeTab === 'customer_approvals' || activeTab === 'tasks' ? (
        filteredJobs.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-slate-300 dark:border-slate-800">
            <Palette className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {search ? 'No matching design jobs found' : 'No design work in this queue'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {search
                ? 'Try adjusting your search query or clear your status filters.'
                : 'Direct customer work orders and Manager billing-initiated design tasks will appear here automatically.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              {search && (
                <Button size="sm" variant="outline" onClick={() => setSearch('')}>
                  Clear Search
                </Button>
              )}
              <Button size="sm" onClick={() => setIsWorkOrderOpen(true)} className="bg-indigo-600 text-white">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Create Direct Work Order
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredJobs.map((job) => {
              const hasInvoice = Boolean(job.invoice_id) || job.commercial_status === 'invoice_created'
              const isApprovalRequired = job.customer_approval_required !== false
              const isApproved = job.status === 'approved' || job.is_locked
              const isDirectCustomer = (job.intake_source || 'direct_customer') === 'direct_customer'
              const pendingReq = tenantRequests.find(
                (r) =>
                  r.status === 'pending' &&
                  (r.design_job_id === job.id || (job.sales_order_id && r.sales_order_id === job.sales_order_id))
              )
              const hasPendingReq = Boolean(pendingReq || job.commercial_status === 'invoice_requested')

              return (
                <Card
                  key={job.id}
                  className="overflow-hidden border-slate-200 dark:border-slate-800 hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <CardHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                            {job.design_number}
                          </span>
                          {/* Priority */}
                          {job.priority === 'very_urgent' ? (
                            <Badge className="bg-red-600 text-white text-[10px] px-1.5 py-0 font-bold">
                              Very Urgent
                            </Badge>
                          ) : job.priority === 'urgent' ? (
                            <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-bold">
                              Urgent
                            </Badge>
                          ) : null}
                        </div>
                        <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-1 line-clamp-1">
                          {job.customer_name}
                        </h4>
                      </div>

                      {/* Intake Source Badge */}
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-semibold shrink-0',
                          isDirectCustomer
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300'
                        )}
                      >
                        {isDirectCustomer ? 'Direct Customer' : 'Manager/Billing'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3 flex-1 text-xs">
                    {/* Item Details */}
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                        {job.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span>📐 {job.dimensions_spec || 'Custom Specs'}</span>
                        {job.quantity && <span>• Qty: {job.quantity} {job.unit || 'pcs'}</span>}
                      </div>
                      {job.instructions && (
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 italic line-clamp-2 pt-0.5">
                          &ldquo;{job.instructions}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Operational Gate Badges Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      {/* Design Status */}
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Design:</span>
                        <span
                          className={cn(
                            'font-bold capitalize',
                            job.status === 'approved'
                              ? 'text-emerald-600'
                              : job.status === 'revision'
                              ? 'text-rose-600'
                              : job.status === 'customer_approval'
                              ? 'text-purple-600'
                              : 'text-indigo-600'
                          )}
                        >
                          {job.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Invoice Status */}
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Invoice:</span>
                        {hasInvoice ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Created
                          </span>
                        ) : hasPendingReq ? (
                          <span className="text-amber-600 font-bold">Requested</span>
                        ) : (
                          <span className="text-rose-600 font-bold">Required</span>
                        )}
                      </div>

                      {/* Approval Status */}
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Approval:</span>
                        {!isApprovalRequired ? (
                          <span className="text-slate-500 font-medium">Bypassed</span>
                        ) : isApproved ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Check className="h-3 w-3" /> Approved
                          </span>
                        ) : job.status === 'revision' ? (
                          <span className="text-rose-600 font-bold">Revision</span>
                        ) : (
                          <span className="text-purple-600 font-bold">Required</span>
                        )}
                      </div>

                      {/* Production Status */}
                      <div className="p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400">Production:</span>
                        {hasInvoice && isApproved ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                            <Sparkles className="h-3 w-3" /> Ready
                          </span>
                        ) : !hasInvoice ? (
                          <span className="text-rose-600 font-bold">Hold (Invoice)</span>
                        ) : (
                          <span className="text-amber-600 font-bold">Hold (Design)</span>
                        )}
                      </div>
                    </div>

                    {/* Versions indicator */}
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>Version: <strong>V{job.current_version || 1}</strong> ({job.versions?.length || 1} files)</span>
                      <span>Deadline: <strong>{job.deadline || 'Today'}</strong></span>
                    </div>
                  </CardContent>

                  {/* Context-Aware Action Buttons */}
                  <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center justify-between gap-2">
                    <Button asChild size="sm" variant="ghost" className="h-7 text-xs px-2">
                      <Link href={`/${slug}/design/${job.id}`}>
                        <Eye className="h-3.5 w-3.5 mr-1 text-slate-500" />
                        Details
                      </Link>
                    </Button>

                    <div className="flex items-center gap-1.5 ml-auto">
                      {/* 1. New Task -> Start Design */}
                      {job.status === 'received' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartDesign(job)}
                          disabled={isPending}
                          className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          <Sparkles className="h-3 w-3 mr-1" />
                          Start Design
                        </Button>
                      )}

                      {/* 2. Designing -> Upload Version & Mark Ready */}
                      {(job.status === 'designing' || job.status === 'in_progress') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJob(job)
                              setIsUploadModalOpen(true)
                            }}
                            className="h-7 text-xs"
                          >
                            <Upload className="h-3 w-3 mr-1 text-blue-600" />
                            Upload
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleMarkReady(job)}
                            disabled={isPending}
                            className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Mark Ready
                          </Button>
                        </>
                      )}

                      {/* 3. Customer Approval / Revision -> Feedback & Approve */}
                      {(job.status === 'customer_approval' || job.status === 'revision') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJob(job)
                              setIsFeedbackModalOpen(true)
                            }}
                            className="h-7 text-xs text-purple-700 border-purple-300"
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Feedback
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedJob(job)
                              setIsApprovalModalOpen(true)
                            }}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}

                      {/* 4. Invoice missing -> Send Invoice Request */}
                      {!hasInvoice && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenInvoiceRequest(job)}
                          disabled={isPending || hasPendingReq}
                          className={cn(
                            'h-7 text-xs font-bold',
                            hasPendingReq
                              ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950'
                              : 'text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950 hover:bg-rose-100'
                          )}
                        >
                          <Send className="h-3 w-3 mr-1" />
                          {hasPendingReq ? 'Req. Pending' : 'Request Invoice'}
                        </Button>
                      )}

                      {/* 5. Production Gate Cleared -> Send to Print Operator */}
                      {hasInvoice && isApproved && (
                        <Button
                          size="sm"
                          onClick={() => handleSendToPrint(job)}
                          disabled={isPending}
                          className="h-7 text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs"
                        >
                          <Printer className="h-3 w-3 mr-1" />
                          Send to Print
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )
      ) : null}

      {/* Work Orders Tab */}
      {activeTab === 'work_orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              {tBilingual('All Direct Work Orders', 'সকল প্রত্যক্ষ ওয়ার্ক অর্ডার')}
            </h3>
            <Button size="sm" onClick={() => setIsWorkOrderOpen(true)} className="bg-indigo-600 text-white text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              New Work Order
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {orders.map((ord) => (
              <Card key={ord.id} className="p-4 space-y-3 text-xs border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
                  <span className="font-mono font-bold text-slate-900 dark:text-white">{ord.order_number}</span>
                  <Badge variant="outline" className="capitalize text-[10px]">
                    {ord.commercial_status?.replace('_', ' ') || 'invoice_required'}
                  </Badge>
                </div>
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">{ord.customer_name}</div>
                  <div className="text-slate-500 font-mono text-[11px]">{ord.customer_phone}</div>
                </div>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 text-[11px]">
                  {ord.notes || 'Direct Prepress Work Order'}
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-400 text-[11px]">Routing: {ord.workflow_routing || 'design_required'}</span>
                  {ord.invoice_id ? (
                    <Badge className="bg-emerald-600 text-white text-[10px]">Invoiced</Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const jobMatch = tenantJobs.find((j) => j.sales_order_id === ord.id)
                        if (jobMatch) handleOpenInvoiceRequest(jobMatch)
                        else showNotification('No design job linked to this order.', 'warning')
                      }}
                      className="h-6 text-[10px] text-rose-600 border-rose-300"
                    >
                      Request Invoice
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <Card className="p-4 space-y-3">
          <CardHeader className="p-0 pb-3 border-b">
            <CardTitle className="text-sm font-bold">Designer Notifications</CardTitle>
            <CardDescription className="text-xs">Real-time job assignments, customer approvals, and commercial updates</CardDescription>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No active notifications</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="py-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-slate-100">{n.title}</div>
                    <p className="text-slate-600 dark:text-slate-400">{n.message}</p>
                    <span className="text-[10px] text-slate-400">{n.created_at}</span>
                  </div>
                  {n.action_url && (
                    <Button asChild size="sm" variant="outline" className="h-7 text-xs shrink-0">
                      <Link href={n.action_url}>View</Link>
                    </Button>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: DIRECT WORK ORDER MODAL (PATH A) */}
      <WorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
        companyId={companyId}
        onSuccess={(order, sentToManager) => {
          showNotification(
            sentToManager
              ? `Work Order #${order.order_number} created & invoice request dispatched!`
              : `Work Order #${order.order_number} created successfully!`
          )
        }}
      />

      {/* MODAL 2: UPLOAD DESIGN VERSION */}
      <ModalDialog
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        title={
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-600" />
            <span>Upload Artwork Version: {selectedJob?.design_number}</span>
          </div>
        }
      >
        <form onSubmit={handleSaveUploadVersion} className="space-y-4 pt-2 text-xs">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Artwork File Name / Reference</Label>
            <Input
              placeholder="e.g. flex_banner_final_v2.ai"
              value={uploadFileName}
              onChange={(e) => setUploadFileName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">Vector Format</Label>
              <select
                value={uploadFormat}
                onChange={(e) => setUploadFormat(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-medium"
              >
                <option value="ai">.AI (Adobe Illustrator)</option>
                <option value="pdf">.PDF (Vector Print Ready)</option>
                <option value="psd">.PSD (Photoshop Raster)</option>
                <option value="cdr">.CDR (CorelDraw)</option>
                <option value="svg">.SVG (Web Vector)</option>
                <option value="zip">.ZIP (Production Package)</option>
              </select>
            </div>
            <div>
              <Label className="text-xs font-semibold mb-1 block">Target Version</Label>
              <Input
                disabled
                value={`Version ${(selectedJob?.versions?.length || 0) + 1}`}
                className="text-xs h-9 font-bold bg-slate-100 dark:bg-slate-800"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Designer Notes / Revision Details</Label>
            <Input
              placeholder="e.g. Adjusted margins and corrected typo in address"
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 text-white font-bold">
              <Upload className="h-3.5 w-3.5 mr-1" />
              Save Version & Send Proof
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 3: APPROVE & LOCK VERSION */}
      <ModalDialog
        open={isApprovalModalOpen}
        onOpenChange={setIsApprovalModalOpen}
        title={
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            <span>Approve & Lock Version: {selectedJob?.design_number}</span>
          </div>
        }
      >
        <form onSubmit={handleApproveAndLock} className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200">
            <p className="font-semibold">
              Locking version {selectedJob?.current_version || 1} will verify the design gate for print floor release.
            </p>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Approved By (Customer Representative)</Label>
            <Input
              placeholder="e.g. Mr. Kamal (Client WhatsApp Confirmation)"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Approval Note / Timestamp Proof</Label>
            <Input
              placeholder="e.g. Proof confirmed via WhatsApp message on 11:30 AM"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 text-white font-bold">
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve & Lock Artwork
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 4: CUSTOMER REVISION FEEDBACK */}
      <ModalDialog
        open={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
        title={
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-purple-600" />
            <span>Customer Revision Feedback: {selectedJob?.design_number}</span>
          </div>
        }
      >
        <form onSubmit={handleAddFeedback} className="space-y-4 pt-2 text-xs">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Customer Feedback / Changes Requested</Label>
            <textarea
              rows={4}
              placeholder="e.g. Make logo 20% larger and change background color to dark navy blue"
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsFeedbackModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-purple-600 text-white font-bold">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Record Revision Task
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 5: REQUEST INVOICE FROM MANAGER / BILLING */}
      <ModalDialog
        open={isRequestInvoiceModalOpen}
        onOpenChange={setIsRequestInvoiceModalOpen}
        title={
          <div className="flex items-center gap-2">
            <Send className="h-4 w-4 text-rose-600" />
            <span>Request Invoice from Manager / Billing</span>
          </div>
        }
      >
        <form onSubmit={handleDispatchInvoiceRequest} className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Design Job:</span>
              <strong className="font-mono">{selectedJob?.design_number}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Customer:</span>
              <strong>{selectedJob?.customer_name}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Target Spec:</span>
              <span>{selectedJob?.title} ({selectedJob?.dimensions_spec || 'Standard'})</span>
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Estimated Billable Amount (৳)</Label>
            <Input
              type="number"
              value={reqEstAmount}
              onChange={(e) => setReqEstAmount(Number(e.target.value) || 0)}
              className="text-xs h-9 font-mono font-bold"
              required
            />
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Note to Billing Manager</Label>
            <Input
              placeholder="e.g. Design is completed and customer approved. Please invoice to clear commercial gate."
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              className="text-xs h-9"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRequestInvoiceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold">
              <Send className="h-3.5 w-3.5 mr-1" />
              Send Request to Manager
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
