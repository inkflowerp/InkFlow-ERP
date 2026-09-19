'use client'

import React, { useState, useTransition, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  LayoutGrid,
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
  FileText,
  Phone,
  ArrowRight,
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

export type DesignPanelTab =
  | 'kanban'
  | 'pipeline'
  | 'overview'
  | 'work_orders'
  | 'customer_approvals'
  | 'design_versions'
  | 'tasks'
  | 'notifications'

export type PipelineSubFilter =
  | 'all'
  | 'new'
  | 'designing'
  | 'awaiting_approval'
  | 'revision'
  | 'invoice_requested'
  | 'ready_for_production'

export type ViewMode = 'kanban' | 'cards' | 'table'

const KANBAN_COLUMNS: { id: DesignStatus; title: string; titleBn: string; color: string }[] = [
  { id: 'received', title: 'Received', titleBn: 'নতুন রিকুয়েস্ট', color: 'border-t-blue-500' },
  { id: 'designing', title: 'Designing', titleBn: 'ডিজাইন চলছে', color: 'border-t-indigo-500' },
  { id: 'customer_approval', title: 'Customer Approval', titleBn: 'অনুমোদনের অপেক্ষায়', color: 'border-t-amber-500' },
  { id: 'revision', title: 'Revision Needed', titleBn: 'সংশোধন', color: 'border-t-purple-500' },
  { id: 'approved', title: 'Approved & Locked', titleBn: 'অনুমোদিত ও লক', color: 'border-t-emerald-500' },
]

export interface DesignPanelProps {
  defaultTab?: DesignPanelTab
}

function DesignPanelInner({ defaultTab = 'kanban' }: DesignPanelProps) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company, currentUser } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id || 'c-01'

  // URL Tab Parameter Sync
  const tabParam = searchParams?.get('tab') as DesignPanelTab | null
  const initialTab: DesignPanelTab =
    tabParam &&
    ['kanban', 'pipeline', 'overview', 'work_orders', 'customer_approvals', 'design_versions', 'tasks', 'notifications'].includes(
      tabParam
    )
      ? tabParam
      : defaultTab

  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<DesignPanelTab>(initialTab)
  const [workFilter, setWorkFilter] = useState<PipelineSubFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>(initialTab === 'kanban' ? 'kanban' : 'cards')
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [intakeFilter, setIntakeFilter] = useState<string>('all')
  const [onlyMyJobs, setOnlyMyJobs] = useState(false)

  // Datastore hooks
  const [jobs, setJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [invoiceRequests] = useDataStore<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS, [])
  const [orders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [notifications] = useDataStore<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [])

  // Modals state
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)
  const [isNewJobOpen, setIsNewJobOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<DesignJobRecord | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isRequestInvoiceModalOpen, setIsRequestInvoiceModalOpen] = useState(false)
  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null)

  // Standalone new job creation form
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDims, setNewJobDims] = useState('')
  const [newJobPriority, setNewJobPriority] = useState<DesignPriority>('urgent')
  const [newJobFormat, setNewJobFormat] = useState<DesignFormat>('ai')
  const [newJobInstructions, setNewJobInstructions] = useState('')

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

  // Handle Tab Switch
  const handleTabChange = (tab: DesignPanelTab) => {
    setActiveTab(tab)
    if (tab === 'kanban') {
      setViewMode('kanban')
    } else if (viewMode === 'kanban') {
      setViewMode('cards')
    }
    const currentQuery = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams()
    currentQuery.set('tab', tab)
    router.replace(`/${slug}/design?${currentQuery.toString()}`)
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
    const approvedCount = tenantJobs.filter((j) => j.status === 'approved' || j.is_locked).length
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
      approvedCount,
      readyProdCount,
      dueTodayCount,
      total: tenantJobs.length,
    }
  }, [tenantJobs])

  // Filtered jobs based on tab, search, priority, intake source, and subfilter
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

      // My jobs filter
      if (onlyMyJobs) {
        const myName = currentUser?.profile?.full_name || 'Tanvir'
        if (!job.designer_name.toLowerCase().includes(myName.toLowerCase())) return false
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

      // Tab specific constraints
      if (activeTab === 'customer_approvals') {
        return job.status === 'customer_approval' || job.status === 'revision'
      }

      if (activeTab === 'work_orders') {
        return Boolean(job.sales_order_id || job.order_number)
      }

      if (activeTab === 'tasks') {
        return job.status !== 'approved'
      }

      if (activeTab === 'pipeline') {
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
  }, [tenantJobs, activeTab, workFilter, search, priorityFilter, intakeFilter, onlyMyJobs, currentUser])

  // Actions
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

  const handleOpenUploadModal = (job: DesignJobRecord) => {
    if (job.is_locked) {
      showNotification('Artwork is approved and locked. Unlock before uploading new version.', 'warning')
      return
    }
    setSelectedJob(job)
    setUploadFileName(`${job.design_number}_v${(job.current_version || 1) + 1}.ai`)
    setUploadNotes('')
    setIsUploadModalOpen(true)
  }

  const handleUploadVersion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    startTransition(async () => {
      try {
        const nextVer = (selectedJob.current_version || 1) + 1
        const res = await addDesignVersionAction(
          {
            designJobId: selectedJob.id,
            versionNumber: nextVer,
            fileName: uploadFileName || `proof_v${nextVer}.${uploadFormat}`,
            fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
            fileType: uploadFormat,
            notes: uploadNotes || 'New design revision uploaded by studio designer.',
          },
          companyId
        )

        if (!res.success) {
          showNotification(res.error || 'Failed to upload version', 'warning')
          return
        }

        const newVer: DesignVersionRecord = {
          id: res.data?.id || `dv-${Date.now()}`,
          design_job_id: selectedJob.id,
          version_number: nextVer,
          version_label: `Version ${nextVer}`,
          proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          proof_file_name: uploadFileName || `proof_v${nextVer}.png`,
          source_file_name: uploadFileName || `artwork_v${nextVer}.${uploadFormat}`,
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
        showNotification(`Version v${nextVer} uploaded for #${selectedJob.design_number}!`)
      } catch (err: any) {
        showNotification(err.message || 'Upload error', 'warning')
      }
    })
  }

  const handleOpenApprovalModal = (job: DesignJobRecord) => {
    setSelectedJob(job)
    setApproverName(job.customer_name || '')
    setApprovalNotes('Artwork approved by customer representative.')
    setIsApprovalModalOpen(true)
  }

  const handleApproveDesign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    startTransition(async () => {
      try {
        const verNum = selectedJob.current_version || selectedJob.versions?.length || 1
        const targetVersion = selectedJob.versions?.find((v) => v.version_number === verNum) || selectedJob.versions?.[0]
        const versionId = targetVersion?.id || `dv-${selectedJob.id}-${verNum}`

        const res = await updateDesignVersionApprovalAction(
          {
            designJobId: selectedJob.id,
            versionId: versionId,
            approvalStatus: 'approved',
            customerFeedback: approvalNotes,
          },
          companyId
        )

        if (!res.success) {
          showNotification(res.error || 'Approval failed', 'warning')
          return
        }

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
        showNotification(`Artwork #${selectedJob.design_number} approved & locked!`)
      } catch (err: any) {
        showNotification(err.message || 'Approval error', 'warning')
      }
    })
  }

  const handleOpenFeedbackModal = (job: DesignJobRecord) => {
    setSelectedJob(job)
    setFeedbackText('')
    setIsFeedbackModalOpen(true)
  }

  const handleAddFeedback = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    startTransition(async () => {
      const now = new Date().toISOString()
      const updated: DesignJobRecord = {
        ...selectedJob,
        status: 'revision',
        customer_feedback: feedbackText,
        revision_count: (selectedJob.revision_count || 0) + 1,
        updated_at: now,
      }
      PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, selectedJob.id, updated)
      setIsFeedbackModalOpen(false)
      showNotification(`Revision requested for Job #${selectedJob.design_number}`)
    })
  }

  const handleOpenInvoiceRequest = (job: DesignJobRecord) => {
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
        showNotification(`Design #${job.design_number} dispatched to Production Floor & Press Operators!`)
      } catch (err: any) {
        showNotification(err.message || 'Print dispatch error', 'warning')
      }
    })
  }

  const handleCreateStandaloneJob = (e: React.FormEvent) => {
    e.preventDefault()
    const customer = customers.find((c) => c.id === selectedCustomerId) || customers[0]
    const dsnNumber = `DSN-${Date.now().toString().slice(-4)}`

    const newJob: DesignJobRecord = {
      id: `dsn-${Date.now()}`,
      company_id: companyId,
      design_number: dsnNumber,
      customer_id: customer?.id || 'cust-01',
      customer_name: customer?.name || 'Walk-in Customer',
      title: newJobTitle || 'Custom Artwork Design',
      designer_name: currentUser?.profile?.full_name || 'Tanvir Ahmed',
      priority: newJobPriority,
      status: 'received',
      deadline: new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0] + ' 18:00',
      instructions: newJobInstructions,
      dimensions_spec: newJobDims || 'Custom Specs',
      current_version: 1,
      revision_count: 0,
      is_locked: false,
      versions: [
        {
          id: `dv-${Date.now()}`,
          design_job_id: `dsn-${Date.now()}`,
          version_number: 1,
          version_label: 'Version 1 (Initial Brief)',
          proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
          proof_file_name: `initial_brief.${newJobFormat}`,
          file_format: newJobFormat,
          change_notes: 'Client brief and initial requirements registered.',
          uploaded_by_name: currentUser?.profile?.full_name || 'Designer',
          is_approved: false,
          created_at: 'Just now',
        },
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, newJob)
    setIsNewJobOpen(false)
    setNewJobTitle('')
    setNewJobDims('')
    setNewJobInstructions('')
    showNotification(`Design Job #${dsnNumber} assigned to your workbench!`)
  }

  return (
    <div className="space-y-5 max-w-7xl">
      {/* 1. TOP HEADER & STUDIO ACTIONS */}
      <PageHeader
        titleEn="Design Panel"
        titleBn="ডিজাইন প্যানেল"
        descriptionEn="Unified Pre-Press Artwork Studio & Designer Workbench — Vector proofs, revisions, customer approvals, work order briefs, commercial gating, and production prepress."
        descriptionBn="প্রি-প্রেস আর্টওয়ার্ক স্টুডিও ও ডিজাইনার ওয়ার্কবেঞ্চ — ভেক্টর প্রুফ, রিভিশন, গ্রাহকের অনুমোদন, ওয়ার্ক অর্ডার ব্রিফ এবং প্রিন্ট প্রোডাকশন রিলিজ।"
        icon={Palette}
        iconColor="text-pink-600"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 p-0.5 bg-white dark:bg-slate-900 shadow-xs">
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => setViewMode('kanban')}
                className={cn('h-7.5 text-xs px-2.5 cursor-pointer font-bold', viewMode === 'kanban' && 'bg-slate-900 text-white dark:bg-white dark:text-slate-900')}
                title="Kanban Board View"
              >
                <Kanban className="h-3.5 w-3.5 mr-1" />
                <span>Board</span>
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                onClick={() => setViewMode('cards')}
                className={cn('h-7.5 text-xs px-2.5 cursor-pointer font-bold', viewMode === 'cards' && 'bg-slate-900 text-white dark:bg-white dark:text-slate-900')}
                title="Cards Grid View"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                <span>Cards</span>
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className={cn('h-7.5 text-xs px-2.5 cursor-pointer font-bold', viewMode === 'table' && 'bg-slate-900 text-white dark:bg-white dark:text-slate-900')}
                title="Table List View"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                <span>Table</span>
              </Button>
            </div>

            {/* Add Work Order Modal Trigger */}
            <Button
              size="sm"
              onClick={() => setIsWorkOrderOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold shadow-xs cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{tBilingual('Add Work Order', 'ওয়ার্ক অর্ডার')}</span>
            </Button>

            {/* Standalone New Design Job Trigger */}
            <Button
              size="sm"
              onClick={() => setIsNewJobOpen(true)}
              className="bg-pink-600 hover:bg-pink-700 text-xs text-white font-bold shadow-xs cursor-pointer gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>{tBilingual('New Design Job', 'নতুন ডিজাইন জব')}</span>
            </Button>
          </div>
        }
      />

      {/* Notification Toast */}
      {notificationMsg && (
        <div
          className={cn(
            'p-3.5 rounded-xl text-xs font-bold flex items-center gap-2.5 border shadow-sm animate-in fade-in-0',
            notificationMsg.type === 'success' && 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
            notificationMsg.type === 'warning' && 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
            notificationMsg.type === 'info' && 'bg-blue-50 text-blue-900 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
          )}
        >
          {notificationMsg.type === 'success' && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
          {notificationMsg.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />}
          {notificationMsg.type === 'info' && <Sparkles className="h-4 w-4 text-blue-600 shrink-0" />}
          <span>{notificationMsg.text}</span>
        </div>
      )}

      {/* 2. TOP OPERATIONAL STAT CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Designing */}
        <Card
          onClick={() => {
            setActiveTab('pipeline')
            setWorkFilter('designing')
          }}
          className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:shadow-sm transition-all"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>In Design</span>
            <Palette className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-blue-600 mt-1">
            {kpiStats.designingCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Active artboards</div>
        </Card>

        {/* Awaiting Customer Approval */}
        <Card
          onClick={() => {
            setActiveTab('customer_approvals')
          }}
          className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:shadow-sm transition-all"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Approval</span>
            <Clock className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-amber-600 mt-1">
            {kpiStats.approvalCount}
          </div>
          <div className="text-[10px] text-amber-600/90 font-medium mt-0.5">Digital proofs sent</div>
        </Card>

        {/* Revisions Needed */}
        <Card
          onClick={() => {
            setActiveTab('pipeline')
            setWorkFilter('revision')
          }}
          className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-purple-500 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:shadow-sm transition-all"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Revisions</span>
            <MessageSquare className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-purple-600 mt-1">
            {kpiStats.revisionCount}
          </div>
          <div className="text-[10px] text-purple-600/90 font-medium mt-0.5">Client adjustments</div>
        </Card>

        {/* Commercial Hold (Invoice Requested) */}
        <Card
          onClick={() => {
            setActiveTab('pipeline')
            setWorkFilter('invoice_requested')
          }}
          className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-rose-500 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:shadow-sm transition-all"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Invoice Req</span>
            <Receipt className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-rose-600 mt-1">
            {kpiStats.invoiceRequestedCount}
          </div>
          <div className="text-[10px] text-rose-600/90 font-medium mt-0.5">Commercial gating</div>
        </Card>

        {/* Approved & Locked */}
        <Card
          onClick={() => {
            setActiveTab('pipeline')
            setWorkFilter('ready_for_production')
          }}
          className="p-3 bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border-slate-200 dark:border-slate-800 shadow-xs cursor-pointer hover:shadow-sm transition-all"
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Approved</span>
            <Lock className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-bold font-numeric tabular-nums text-emerald-600 mt-1">
            {kpiStats.approvedCount}
          </div>
          <div className="text-[10px] text-emerald-600/90 font-medium mt-0.5">Ready for press</div>
        </Card>

        {/* Due Today */}
        <Card
          className={cn(
            'p-3 bg-white dark:bg-slate-900 border-l-4 border-slate-200 dark:border-slate-800 shadow-xs',
            kpiStats.dueTodayCount > 0 ? 'border-l-red-500 bg-red-50/10' : 'border-l-slate-400'
          )}
        >
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Due Today</span>
            <Flame className={cn('h-3.5 w-3.5', kpiStats.dueTodayCount > 0 ? 'text-red-500' : 'text-slate-400')} />
          </div>
          <div className={cn('text-xl font-bold font-numeric tabular-nums mt-1', kpiStats.dueTodayCount > 0 ? 'text-red-600' : 'text-slate-800 dark:text-white')}>
            {kpiStats.dueTodayCount}
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Urgent deadlines</div>
        </Card>
      </div>

      {/* 3. UNIFIED NAVIGATION TABS & SEARCH BAR */}
      <Card className="border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* Navigation Tab Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto pb-2 text-xs">
          {[
            { id: 'kanban', label: 'Kanban Board', icon: Kanban, count: kpiStats.total },
            { id: 'pipeline', label: 'Active Pipeline', icon: Layers, count: kpiStats.designingCount + kpiStats.newCount + kpiStats.revisionCount },
            { id: 'overview', label: 'Studio Overview', icon: Sparkles },
            { id: 'work_orders', label: 'Work Orders', icon: FileText, count: tenantJobs.filter((j) => j.sales_order_id).length },
            { id: 'customer_approvals', label: 'Approvals & Revisions', icon: FileCheck2, count: kpiStats.approvalCount + kpiStats.revisionCount },
            { id: 'design_versions', label: 'Artwork Gallery', icon: Eye },
            { id: 'tasks', label: 'Prepress Tasks', icon: CheckSquare },
            { id: 'notifications', label: 'Alerts', icon: Bell, count: notifications.filter((n) => !n.is_read).length },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as DesignPanelTab)}
                className={cn(
                  'px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                  isActive
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Search & Filter Controls */}
        <div className="p-3 bg-white dark:bg-slate-900 flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search design #, artwork title, customer, phone, order #, designer..."
              className="h-9 pl-9 text-xs"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Priorities</option>
              <option value="very_urgent">Very Urgent 🔥</option>
              <option value="urgent">Urgent</option>
              <option value="normal">Normal</option>
            </select>

            {/* Intake Source Filter */}
            <select
              value={intakeFilter}
              onChange={(e) => setIntakeFilter(e.target.value)}
              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              <option value="all">All Intake Sources</option>
              <option value="direct_customer">Direct Customer</option>
              <option value="manager_billing">Manager / Billing</option>
            </select>

            {/* My Jobs Toggle */}
            <Button
              size="sm"
              variant={onlyMyJobs ? 'default' : 'outline'}
              onClick={() => setOnlyMyJobs(!onlyMyJobs)}
              className={cn('h-9 text-xs font-bold gap-1 cursor-pointer', onlyMyJobs && 'bg-pink-600 text-white hover:bg-pink-700')}
            >
              <User className="h-3.5 w-3.5" />
              <span>{onlyMyJobs ? 'My Jobs' : 'All Studio'}</span>
            </Button>
          </div>
        </div>
      </Card>

      {/* 4. TAB CONTENTS */}
      {/* -------------------------------------------------------------------------
          TAB 1: KANBAN BOARD VIEW (5 STAGES)
         ------------------------------------------------------------------------- */}
      {(activeTab === 'kanban' || viewMode === 'kanban') && activeTab !== 'overview' && activeTab !== 'notifications' && (
        <div className="flex md:grid md:grid-cols-5 gap-3.5 overflow-x-auto touch-scroll snap-x snap-mandatory pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colJobs = filteredJobs.filter((j) => {
              if (col.id === 'approved') return j.status === 'approved'
              if (col.id === 'revision') return j.status === 'revision'
              if (col.id === 'customer_approval') return j.status === 'customer_approval'
              if (col.id === 'designing') return j.status === 'designing' || j.status === 'in_progress'
              return j.status === 'received'
            })

            return (
              <div
                key={col.id}
                className={cn(
                  'bg-slate-50/90 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 border-t-4 flex flex-col min-w-[280px] sm:min-w-[260px] md:min-w-0 snap-center shrink-0 md:shrink',
                  col.color
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {col.title}
                    </span>
                    <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-bold flex items-center justify-center text-slate-700 dark:text-slate-300">
                      {colJobs.length}
                    </span>
                  </div>
                  {col.id === 'approved' && <Lock className="h-3.5 w-3.5 text-emerald-600" />}
                </div>

                {/* Column Cards */}
                <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                  {colJobs.length === 0 ? (
                    <div className="p-6 text-center text-[11px] text-slate-400 border border-dashed rounded-lg">
                      No jobs in {col.title.toLowerCase()}
                    </div>
                  ) : (
                    colJobs.map((job) => {
                      const latestVersion = job.versions?.[job.versions.length - 1]
                      const format = latestVersion?.file_format || 'ai'

                      return (
                        <Card
                          key={job.id}
                          className="p-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs hover:shadow-md transition-all space-y-2"
                        >
                          {/* Image / Thumbnail Preview */}
                          <div className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                            <img
                              src={
                                latestVersion?.proof_file_url ||
                                'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'
                              }
                              alt={job.title}
                              className="w-full h-full object-cover"
                            />
                            {/* Format Badge */}
                            <div className="absolute top-1.5 left-1.5">
                              <span
                                className={`uppercase text-[9px] font-black px-1.5 py-0.5 rounded border shadow-xs ${getFormatBadgeColor(
                                  format
                                )}`}
                              >
                                .{format}
                              </span>
                            </div>

                            {/* Version Pill */}
                            <div className="absolute top-1.5 right-1.5">
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                                v{job.current_version || 1}
                              </span>
                            </div>

                            {/* Locked Badge */}
                            {job.is_locked && (
                              <div className="absolute bottom-1.5 right-1.5">
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow-xs">
                                  <Lock className="h-2.5 w-2.5" /> Locked
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Info Block */}
                          <div className="space-y-0.5">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-pink-600 dark:text-pink-400">
                                #{job.design_number}
                              </span>
                              {job.priority === 'very_urgent' && (
                                <span className="text-[10px] font-black text-rose-600 flex items-center gap-0.5">
                                  <Flame className="h-3 w-3" /> Urgent
                                </span>
                              )}
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-1">
                              {job.title}
                            </h4>
                            <div className="text-[11px] text-slate-500 flex items-center justify-between">
                              <span className="truncate">{job.customer_name}</span>
                              {job.dimensions_spec && (
                                <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                  {job.dimensions_spec}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Quick Actions per Stage */}
                          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                            <div className="flex items-center gap-1 text-slate-400 text-[10px] font-mono">
                              <Clock className="h-3 w-3" />
                              <span>{job.deadline?.split(' ')[0] || 'Flexible'}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              {job.status === 'received' && (
                                <Button
                                  size="sm"
                                  onClick={() => handleStartDesign(job)}
                                  className="h-6 px-2 text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                >
                                  Start
                                </Button>
                              )}
                              <Link
                                href={`/${slug}/design/${job.id}`}
                                className="inline-flex items-center gap-0.5 font-bold text-pink-600 hover:underline text-[11px]"
                              >
                                <span>Open</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            </div>
                          </div>
                        </Card>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* -------------------------------------------------------------------------
          TAB 2: ACTIVE PIPELINE & SUBFILTERED QUEUE (CARDS & TABLE)
         ------------------------------------------------------------------------- */}
      {(activeTab === 'pipeline' || (activeTab !== 'kanban' && activeTab !== 'overview' && activeTab !== 'notifications')) &&
        viewMode !== 'kanban' && (
          <div className="space-y-4">
            {/* Subfilter Pills */}
            <div className="flex items-center gap-1 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold overflow-x-auto">
              {[
                { id: 'all', label: 'All Active', count: kpiStats.total },
                { id: 'new', label: 'New / Received', count: kpiStats.newCount },
                { id: 'designing', label: 'In Design', count: kpiStats.designingCount },
                { id: 'awaiting_approval', label: 'Awaiting Approval', count: kpiStats.approvalCount },
                { id: 'revision', label: 'Revisions', count: kpiStats.revisionCount },
                { id: 'invoice_requested', label: 'Invoice Requested', count: kpiStats.invoiceRequestedCount },
                { id: 'ready_for_production', label: 'Ready for Print', count: kpiStats.readyProdCount },
              ].map((pill) => (
                <button
                  key={pill.id}
                  onClick={() => setWorkFilter(pill.id as PipelineSubFilter)}
                  className={cn(
                    'px-3 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shrink-0',
                    workFilter === pill.id
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-bold shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                  )}
                >
                  <span>{pill.label}</span>
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold',
                      workFilter === pill.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                    )}
                  >
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>

            {/* CARDS GRID VIEW */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredJobs.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-xs text-slate-500 border border-dashed rounded-xl">
                    No design jobs found matching your filters.
                  </div>
                ) : (
                  filteredJobs.map((job) => {
                    const latestVersion = job.versions?.[job.versions.length - 1]
                    const format = latestVersion?.file_format || 'ai'

                    return (
                      <Card
                        key={job.id}
                        className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md transition-all overflow-hidden flex flex-col justify-between"
                      >
                        <div>
                          {/* Image Banner */}
                          <div className="relative aspect-video bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
                            <img
                              src={
                                latestVersion?.proof_file_url ||
                                'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80'
                              }
                              alt={job.title}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              <span
                                className={`uppercase text-[10px] font-black px-2 py-0.5 rounded border shadow-xs ${getFormatBadgeColor(
                                  format
                                )}`}
                              >
                                .{format}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-xs">
                                v{job.current_version || 1}
                              </span>
                            </div>

                            <div className="absolute top-2 right-2">
                              {job.is_locked ? (
                                <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                                  <Lock className="h-3 w-3 mr-1" /> Approved
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-900/80 text-white text-[10px] capitalize">
                                  {job.status?.replace('_', ' ')}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Content Body */}
                          <div className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-xs text-pink-600 dark:text-pink-400">
                                #{job.design_number}
                              </span>
                              {job.order_number && (
                                <span className="font-mono text-[11px] text-slate-400">
                                  Order: #{job.order_number}
                                </span>
                              )}
                            </div>

                            <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                              {job.title}
                            </h3>

                            <div className="text-xs text-slate-500 space-y-0.5">
                              <div>Customer: <strong className="text-slate-700 dark:text-slate-300">{job.customer_name}</strong></div>
                              {job.dimensions_spec && (
                                <div className="font-mono text-[11px]">Specs: {job.dimensions_spec}</div>
                              )}
                            </div>

                            {job.customer_feedback && (
                              <div className="p-2 bg-purple-50 dark:bg-purple-950/40 rounded-lg text-[11px] text-purple-900 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                <strong>Feedback:</strong> {job.customer_feedback}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Card Actions Footer */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs">
                          <Link
                            href={`/${slug}/design/${job.id}`}
                            className="font-bold text-pink-600 hover:underline flex items-center gap-1"
                          >
                            <span>Open Details</span>
                            <ArrowRight className="h-3 w-3" />
                          </Link>

                          <div className="flex items-center gap-1.5">
                            {!job.is_locked && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenUploadModal(job)}
                                className="h-7 text-xs px-2 cursor-pointer"
                              >
                                <Upload className="h-3 w-3 mr-1" /> Version
                              </Button>
                            )}

                            {job.status === 'customer_approval' && !job.is_locked && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprovalModal(job)}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            )}

            {/* TABLE LIST VIEW */}
            {viewMode === 'table' && (
              <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 uppercase tracking-wider text-[10px] font-bold">
                      <tr>
                        <th className="p-3">Design #</th>
                        <th className="p-3">Title & Format</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Designer</th>
                        <th className="p-3">Version</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Deadline</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredJobs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-500">
                            No design jobs found matching current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredJobs.map((job) => {
                          const latestVersion = job.versions?.[job.versions.length - 1]
                          const format = latestVersion?.file_format || 'ai'

                          return (
                            <tr key={job.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                              <td className="p-3 font-mono font-bold text-pink-600">
                                <Link href={`/${slug}/design/${job.id}`} className="hover:underline">
                                  #{job.design_number}
                                </Link>
                                {job.order_number && (
                                  <span className="text-[10px] text-slate-400 block">
                                    Ord: #{job.order_number}
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{job.title}</span>
                                  <span className={`uppercase text-[9px] font-black px-1.5 py-0.2 rounded border ${getFormatBadgeColor(format)}`}>
                                    .{format}
                                  </span>
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">{job.dimensions_spec || 'Standard Specs'}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-slate-800 dark:text-slate-200">{job.customer_name}</div>
                              </td>
                              <td className="p-3 text-slate-600 dark:text-slate-400">{job.designer_name}</td>
                              <td className="p-3 font-mono font-bold">v{job.current_version || 1}</td>
                              <td className="p-3 text-center">
                                {job.is_locked ? (
                                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300">
                                    Approved & Locked
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {job.status?.replace('_', ' ')}
                                  </Badge>
                                )}
                              </td>
                              <td className="p-3 font-mono text-slate-500">{job.deadline || '—'}</td>
                              <td className="p-3 text-right">
                                <Link href={`/${slug}/design/${job.id}`}>
                                  <Button size="sm" variant="outline" className="h-7 text-xs font-bold gap-1 cursor-pointer">
                                    <span>Open</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </Link>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

      {/* -------------------------------------------------------------------------
          TAB 3: STUDIO OVERVIEW / EXECUTIVE PREPRESS METRICS
         ------------------------------------------------------------------------- */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Urgent Attention Queue */}
            <Card className="p-4 border-slate-200 dark:border-slate-800">
              <CardTitle className="text-xs font-bold text-rose-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Flame className="h-4 w-4" />
                <span>Urgent Attention & Blocked Gates</span>
              </CardTitle>
              <div className="space-y-2">
                {tenantJobs
                  .filter((j) => j.priority === 'very_urgent' || j.commercial_status === 'invoice_requested' || j.status === 'revision')
                  .slice(0, 5)
                  .map((j) => (
                    <div
                      key={j.id}
                      className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span className="font-mono text-pink-600">#{j.design_number}</span>
                          <span>{j.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500">{j.customer_name} • Deadline: {j.deadline}</div>
                      </div>
                      <Link href={`/${slug}/design/${j.id}`}>
                        <Button size="sm" variant="outline" className="h-7 text-xs font-bold">
                          Resolve
                        </Button>
                      </Link>
                    </div>
                  ))}
              </div>
            </Card>

            {/* Stage Distribution Stats */}
            <Card className="p-4 border-slate-200 dark:border-slate-800">
              <CardTitle className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-3">
                Prepress Stage Distribution
              </CardTitle>
              <div className="space-y-2.5 text-xs font-semibold">
                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Designing Artboards ({kpiStats.designingCount})</span>
                    <span>{Math.round((kpiStats.designingCount / (kpiStats.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{ width: `${(kpiStats.designingCount / (kpiStats.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Customer Approvals Pending ({kpiStats.approvalCount})</span>
                    <span>{Math.round((kpiStats.approvalCount / (kpiStats.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{ width: `${(kpiStats.approvalCount / (kpiStats.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Revisions In Progress ({kpiStats.revisionCount})</span>
                    <span>{Math.round((kpiStats.revisionCount / (kpiStats.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${(kpiStats.revisionCount / (kpiStats.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-400 mb-1">
                    <span>Approved & Locked for Press ({kpiStats.approvedCount})</span>
                    <span>{Math.round((kpiStats.approvedCount / (kpiStats.total || 1)) * 100)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${(kpiStats.approvedCount / (kpiStats.total || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
          TAB 4: NOTIFICATIONS & COMMERCIAL GATING ALERTS
         ------------------------------------------------------------------------- */}
      {activeTab === 'notifications' && (
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="p-4 border-b border-slate-200 dark:border-slate-800">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-600" />
              <span>Studio Notifications & Workflow Gating Alerts</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No active studio notifications.
              </div>
            ) : (
              notifications.map((n: any) => (
                <div key={n.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-900 dark:text-white">{n.title}</div>
                    <div className="text-slate-500">{n.message}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{n.created_at}</div>
                  </div>
                  {n.action_url && (
                    <Link href={`/${slug}${n.action_url}`}>
                      <Button size="sm" variant="outline" className="h-7 text-xs font-bold">
                        View
                      </Button>
                    </Link>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          5. SHARED ACTION MODALS
         ========================================================================= */}

      {/* MODAL 1: WORK ORDER MODAL */}
      <WorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
        companyId={companyId}
        onSuccess={(order, sentInvoiceReq) => {
          setIsWorkOrderOpen(false)
          showNotification(
            sentInvoiceReq
              ? `Work Order #${order.order_number} saved & Invoice Request sent to Manager!`
              : `Work Order #${order.order_number} registered successfully!`
          )
        }}
      />

      {/* MODAL 2: STANDALONE NEW DESIGN JOB */}
      <ModalDialog
        open={isNewJobOpen}
        onOpenChange={setIsNewJobOpen}
        title="Create Standalone Design Job"
        description="Assign customer brief, specifications, and primary format to designer workbench."
      >
        <form onSubmit={handleCreateStandaloneJob} className="space-y-4 pt-1 text-xs">
          <div className="space-y-1">
            <Label className="font-bold text-xs">Select Customer</Label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">Select an existing customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile || 'No phone'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">Artwork / Job Title</Label>
            <Input
              placeholder="e.g. Panaflex Frontlit Banner 10x4 ft"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              className="h-9 text-xs font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="font-bold text-xs">Target Dimensions</Label>
              <Input
                placeholder="e.g. 10ft x 4ft (120x48 in)"
                value={newJobDims}
                onChange={(e) => setNewJobDims(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="font-bold text-xs">Vector Format</Label>
              <select
                value={newJobFormat}
                onChange={(e) => setNewJobFormat(e.target.value as DesignFormat)}
                className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
              >
                <option value="ai">AI (Adobe Illustrator)</option>
                <option value="psd">PSD (Photoshop Document)</option>
                <option value="pdf">PDF (Print Ready)</option>
                <option value="cdr">CDR (CorelDraw)</option>
                <option value="svg">SVG (Scalable Vector)</option>
                <option value="tiff">TIFF (High Res)</option>
                <option value="png">PNG (Raster Proof)</option>
                <option value="dxf">DXF (CNC / Laser Cut)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">Customer Brief & Instructions</Label>
            <textarea
              rows={3}
              placeholder="e.g. Navy blue background, gold text, keep 1 inch margin around borders..."
              value={newJobInstructions}
              onChange={(e) => setNewJobInstructions(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewJobOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-pink-600 hover:bg-pink-700 text-white font-bold">
              Assign to Studio
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 3: UPLOAD NEW VERSION */}
      <ModalDialog
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        title={`Upload Artwork Version — #${selectedJob?.design_number}`}
      >
        <form onSubmit={handleUploadVersion} className="space-y-4 pt-2 text-xs">
          <div className="space-y-1">
            <Label className="font-bold text-xs">Proof File Name</Label>
            <Input
              value={uploadFileName}
              onChange={(e) => setUploadFileName(e.target.value)}
              className="h-9 text-xs font-mono"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">File Format</Label>
            <select
              value={uploadFormat}
              onChange={(e) => setUploadFormat(e.target.value as DesignFormat)}
              className="w-full h-9 px-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
            >
              <option value="ai">AI (Adobe Illustrator)</option>
              <option value="psd">PSD (Photoshop)</option>
              <option value="pdf">PDF (Vector Print)</option>
              <option value="cdr">CDR (CorelDraw)</option>
              <option value="svg">SVG (Scalable Vector)</option>
              <option value="tiff">TIFF (High Res)</option>
              <option value="png">PNG (Raster Proof)</option>
              <option value="dxf">DXF (Laser / CNC Cut)</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">Version Revision Notes</Label>
            <textarea
              rows={3}
              placeholder="e.g. Updated logo size to 120%, aligned text to center per client request."
              value={uploadNotes}
              onChange={(e) => setUploadNotes(e.target.value)}
              className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsUploadModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              <Upload className="h-3.5 w-3.5 mr-1" />
              Upload Version
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 4: CUSTOMER APPROVAL & LOCK */}
      <ModalDialog
        open={isApprovalModalOpen}
        onOpenChange={setIsApprovalModalOpen}
        title={`Approve & Lock Artwork — #${selectedJob?.design_number}`}
      >
        <form onSubmit={handleApproveDesign} className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 text-xs">
            <p className="font-bold">Customer Approval Locking</p>
            <p className="text-[11px] mt-0.5 opacity-90">
              Locking prevents further changes to proof files and marks the Design Gate as Cleared.
            </p>
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">Approved By (Representative Name)</Label>
            <Input
              placeholder="e.g. Mr. Kamal (Client WhatsApp Confirmation)"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              className="h-9 text-xs"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">Approval Proof Notes</Label>
            <Input
              placeholder="e.g. Proof confirmed via WhatsApp message at 11:30 AM"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsApprovalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <Check className="h-3.5 w-3.5 mr-1" />
              Approve & Lock Artwork
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 5: CUSTOMER REVISION FEEDBACK */}
      <ModalDialog
        open={isFeedbackModalOpen}
        onOpenChange={setIsFeedbackModalOpen}
        title={`Customer Revision Feedback — #${selectedJob?.design_number}`}
      >
        <form onSubmit={handleAddFeedback} className="space-y-4 pt-2 text-xs">
          <div className="space-y-1">
            <Label className="font-bold text-xs">Customer Revision Notes</Label>
            <textarea
              rows={4}
              placeholder="e.g. Make font bolder, replace phone number with new hotline, adjust background color."
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
            <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white font-bold">
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              Record Revision
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 6: REQUEST INVOICE FROM MANAGER */}
      <ModalDialog
        open={isRequestInvoiceModalOpen}
        onOpenChange={setIsRequestInvoiceModalOpen}
        title="Request Invoice from Manager / Billing"
      >
        <form onSubmit={handleDispatchInvoiceRequest} className="space-y-4 pt-2 text-xs">
          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Design Job:</span>
              <strong className="font-mono">#{selectedJob?.design_number}</strong>
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

          <div className="space-y-1">
            <Label className="font-bold text-xs">Estimated Billable Amount (৳)</Label>
            <Input
              type="number"
              value={reqEstAmount}
              onChange={(e) => setReqEstAmount(Number(e.target.value) || 0)}
              className="h-9 text-xs font-mono font-bold"
              required
            />
          </div>

          <div className="space-y-1">
            <Label className="font-bold text-xs">Note to Billing Manager</Label>
            <Input
              placeholder="e.g. Design is completed and customer approved. Please invoice to clear commercial gate."
              value={reqNotes}
              onChange={(e) => setReqNotes(e.target.value)}
              className="h-9 text-xs"
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

export function DesignPanel(props: DesignPanelProps) {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center animate-pulse">
            <Palette className="h-5 w-5 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-500">Loading Design Panel...</p>
        </div>
      }
    >
      <DesignPanelInner {...props} />
    </React.Suspense>
  )
}
