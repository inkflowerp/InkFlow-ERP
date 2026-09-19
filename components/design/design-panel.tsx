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
  ZoomIn,
  ZoomOut,
  Maximize2,
  Share2,
  Sliders,
  Scissors,
  ShieldAlert,
  CheckCheck,
  Wrench,
  FileDown,
  Copy,
  RotateCcw,
  Split,
  Sparkle,
  Download,
  Trash2,
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
  getDesignJobsAction,
  deleteDesignJobAction,
  purgeAllDesignJobsAction,
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

const KANBAN_COLUMNS: { id: DesignStatus; title: string; titleBn: string; color: string; badgeBg: string }[] = [
  { id: 'received', title: 'Received', titleBn: 'নতুন রিকুয়েস্ট', color: 'border-t-blue-500', badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' },
  { id: 'designing', title: 'Designing', titleBn: 'ডিজাইন চলছে', color: 'border-t-indigo-500', badgeBg: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300' },
  { id: 'customer_approval', title: 'Customer Approval', titleBn: 'অনুমোদনের অপেক্ষায়', color: 'border-t-amber-500', badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  { id: 'revision', title: 'Revision Needed', titleBn: 'সংশোধন', color: 'border-t-purple-500', badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300' },
  { id: 'approved', title: 'Approved & Locked', titleBn: 'অনুমোদিত ও লক', color: 'border-t-emerald-500', badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
]

const PRINT_MACHINERY_LIST = [
  { id: 'roland_eco', name: 'Roland SolJet Pro-4 Eco-Solvent (10ft Outdoor)', type: 'Roll-to-Roll' },
  { id: 'konica_c4070', name: 'Konica Minolta AccurioPress C4070 (Digital Offset)', type: 'Cut-Sheet' },
  { id: 'uv_flatbed_8x4', name: 'UV Flatbed 8×4ft (Acrylic/Foam/Wood)', type: 'Flatbed UV' },
  { id: 'cnc_router', name: 'CNC Router 3D Cutting Bed (ACP/Acrylic)', type: 'Fabrication' },
  { id: 'laser_bed', name: 'High-Precision Laser Engraver & Cutter', type: 'Cutting' },
  { id: 'dtf_textile', name: 'DTF 24-inch Industrial Textile Apparel Printer', type: 'Textile' },
  { id: 'offset_speedmaster', name: 'Heidelberg Speedmaster 4-Color Commercial Offset', type: 'Offset' },
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
  const companyId = company?.id || (slug !== 'my-company' ? slug : '2af84f1d-1ebd-48e7-9795-fd5c24c38a96')

  // Helper for strict tenant scoping
  const isMatchingCompany = (id?: string | null) => {
    if (!id) return false
    return (
      (company?.id && id === company.id) ||
      (company?.slug && id === company.slug) ||
      (slug && id === slug)
    )
  }

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
  const [formatFilter, setFormatFilter] = useState<string>('all')
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
  
  // Power Upgrade Modals
  const [lightboxJob, setLightboxJob] = useState<DesignJobRecord | null>(null)
  const [lightboxVersionIdx, setLightboxVersionIdx] = useState<number>(0)
  const [lightboxZoom, setLightboxZoom] = useState<number>(1)
  const [whatsAppJob, setWhatsAppJob] = useState<DesignJobRecord | null>(null)
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('')
  const [whatsAppCopied, setWhatsAppCopied] = useState<boolean>(false)
  const [prepressJob, setPrepressJob] = useState<DesignJobRecord | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<string>('roland_eco')
  const [compareJob, setCompareJob] = useState<DesignJobRecord | null>(null)
  const [compareVerA, setCompareVerA] = useState<number>(1)
  const [compareVerB, setCompareVerB] = useState<number>(1)

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

  // Authoritative server synchronization on mount and company change
  useEffect(() => {
    let isMounted = true
    async function syncServerJobs() {
      if (!company?.id) return
      try {
        const res = await getDesignJobsAction(company.id)
        if (res.success && res.data && isMounted) {
          const serverJobs = res.data
          const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
          const otherTenantJobs = allStored.filter((j) => j.company_id && !isMatchingCompany(j.company_id))
          const merged = [...otherTenantJobs, ...serverJobs]
          PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, merged)
          setJobs(merged)
        }
      } catch (err) {
        console.error('Failed to sync design jobs:', err)
      }
    }
    syncServerJobs()
    return () => {
      isMounted = false
    }
  }, [company?.id, slug])

  // Delete Job handler
  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this design job? This action cannot be undone.')) {
      return
    }
    startTransition(async () => {
      try {
        const res = await deleteDesignJobAction(jobId, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to delete job', 'warning')
          return
        }
        const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const updated = allStored.filter((j) => j.id !== jobId)
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, updated)
        setJobs(updated)
        showNotification('Design job deleted successfully!')
      } catch (err: any) {
        showNotification(err.message || 'Failed to delete job', 'warning')
      }
    })
  }

  // Purge all jobs handler
  const handlePurgeAllJobs = async () => {
    if (
      !confirm(
        'WARNING: Are you sure you want to delete ALL design jobs in this pipeline? This will permanently wipe all artwork files and revision history for this organization.'
      )
    ) {
      return
    }
    startTransition(async () => {
      try {
        const res = await purgeAllDesignJobsAction(companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to delete all jobs', 'warning')
          return
        }
        const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const remaining = allStored.filter((j) => j.company_id && !isMatchingCompany(j.company_id))
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, remaining)
        setJobs(remaining)
        showNotification('All design jobs have been permanently deleted!')
      } catch (err: any) {
        showNotification(err.message || 'Failed to purge jobs', 'warning')
      }
    })
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
    return (jobs || []).filter((j) => isMatchingCompany(j.company_id))
  }, [jobs, company, slug])

  // Tenant-scoped invoice requests
  const tenantRequests = useMemo(() => {
    return (invoiceRequests || []).filter((r) => isMatchingCompany(r.company_id))
  }, [invoiceRequests, company, slug])


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

  // Filtered jobs based on tab, search, priority, format, intake source, and subfilter
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

      // Format filter
      if (formatFilter !== 'all') {
        const latestVersion = job.versions?.[job.versions.length - 1]
        if (latestVersion?.file_format !== formatFilter) return false
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
  }, [tenantJobs, activeTab, workFilter, search, priorityFilter, formatFilter, intakeFilter, onlyMyJobs, currentUser])

  // Interactive Status Transitions
  const handleQuickStatusMove = async (job: DesignJobRecord, targetStatus: DesignStatus) => {
    startTransition(async () => {
      const now = new Date().toISOString()
      const updatedJob = {
        ...job,
        status: targetStatus,
        is_locked: targetStatus === 'approved' ? true : job.is_locked,
        updated_at: now,
      }
      PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
      showNotification(`Job #${job.design_number} moved to ${targetStatus.replace('_', ' ')}!`)
    })
  }

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
          showNotification('Design marked READY! Customer approval bypassed. Ready for print floor!')
        } else {
          showNotification('Design marked READY! Digital proof dispatched for customer approval.')
        }
      } catch (err: any) {
        showNotification(err.message || 'Failed to mark design ready', 'warning')
      }
    })
  }

  const handleOpenUploadModal = (job: DesignJobRecord) => {
    setSelectedJob(job)
    const nextVer = (job.versions?.length || 0) + 1
    const latestFormat = job.versions?.[job.versions.length - 1]?.file_format || 'ai'
    setUploadFileName(`${job.design_number.toLowerCase()}_v${nextVer}`)
    setUploadFormat(latestFormat)
    setUploadNotes(`Revision v${nextVer} adjustments per client review.`)
    setIsUploadModalOpen(true)
  }

  const handleSaveUploadVersion = (e: React.FormEvent) => {
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
    setApprovalNotes('Artwork proof approved by customer representative.')
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

        const hasInvoice = Boolean(selectedJob.invoice_id) || selectedJob.commercial_status === 'invoice_created'
        if (hasInvoice) {
          try {
            await sendToPrintOperatorAction(selectedJob.id, companyId)
          } catch {}
        }

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, selectedJob.id, updatedJob)
        setIsApprovalModalOpen(false)
        showNotification(
          hasInvoice
            ? `Artwork #${selectedJob.design_number} approved & released to Production Floor!`
            : `Artwork #${selectedJob.design_number} approved & locked! Invoice required before print start.`
        )
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

  const handleOpenPrepress = (job: DesignJobRecord) => {
    setPrepressJob(job)
    setSelectedMachine('roland_eco')
  }

  const handleDispatchToMachine = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!prepressJob) return

    startTransition(async () => {
      try {
        const machineObj = PRINT_MACHINERY_LIST.find((m) => m.id === selectedMachine)
        const res = await sendToPrintOperatorAction(prepressJob.id, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to send to print operator', 'warning')
          return
        }

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, prepressJob.id, {
          status: 'approved',
          workflow_routing: 'ready_production',
          is_locked: true,
          updated_at: new Date().toISOString(),
        })

        setPrepressJob(null)
        showNotification(`Job #${prepressJob.design_number} authorized & routed to ${machineObj?.name}!`)
      } catch (err: any) {
        showNotification(err.message || 'Print dispatch error', 'warning')
      }
    })
  }

  const handleOpenWhatsApp = (job: DesignJobRecord) => {
    const cust = customers.find((c) => c.id === job.customer_id || c.name === job.customer_name)
    setWhatsAppJob(job)
    setWhatsAppPhone(cust?.mobile || (job as any).customer_phone || '01711000000')
    setWhatsAppCopied(false)
  }

  const handleGenerateWhatsAppText = (job: DesignJobRecord) => {
    const latestVersion = job.versions?.[job.versions.length - 1]
    const proofUrl = latestVersion?.proof_file_url || 'https://inkflow-erp.vercel.app/proof'
    return `Assalamu Alaikum / Hello ${job.customer_name},\n\nYour artwork digital proof for *${job.title}* (Job #${job.design_number}) is ready for review:\n\n📐 Size/Specs: ${job.dimensions_spec || 'Custom'}\n📄 Version: v${job.current_version || 1}\n🖼️ View Digital Proof: ${proofUrl}\n\nPlease reply with *APPROVED* to lock for production printing, or reply with your revision notes.\n\nThank you,\n${company?.name || 'Classic Print & Signage'}`
  }

  const handleCopyWhatsApp = (job: DesignJobRecord) => {
    const text = handleGenerateWhatsAppText(job)
    navigator.clipboard.writeText(text)
    setWhatsAppCopied(true)
    setTimeout(() => setWhatsAppCopied(false), 3000)
    showNotification('WhatsApp message copied to clipboard!')
  }

  const handleSendWhatsAppWeb = (job: DesignJobRecord) => {
    const text = encodeURIComponent(handleGenerateWhatsAppText(job))
    const cleanPhone = whatsAppPhone.replace(/[^0-9]/g, '')
    const fullPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank')
  }

  const handleOpenLightbox = (job: DesignJobRecord, versionIndex = -1) => {
    setLightboxJob(job)
    const totalVers = job.versions?.length || 1
    setLightboxVersionIdx(versionIndex >= 0 ? versionIndex : totalVers - 1)
    setLightboxZoom(1)
  }

  const handleOpenCompare = (job: DesignJobRecord) => {
    const vCount = job.versions?.length || 1
    setCompareJob(job)
    setCompareVerA(Math.max(1, vCount - 1))
    setCompareVerB(vCount)
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
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
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
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-white dark:bg-slate-900 shadow-2xs">
              <Button
                size="sm"
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                onClick={() => {
                  setViewMode('kanban')
                  if (activeTab !== 'kanban') setActiveTab('kanban')
                }}
                className="h-7 text-xs px-2.5 bangla-text"
              >
                <Kanban className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Board', 'বোর্ড')}
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                onClick={() => setViewMode('cards')}
                className="h-7 text-xs px-2.5 bangla-text"
              >
                <LayoutGrid className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Cards', 'কার্ড')}
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className="h-7 text-xs px-2.5 bangla-text"
              >
                <List className="h-3.5 w-3.5 mr-1" />
                {tBilingual('Table', 'তালিকা')}
              </Button>
            </div>

            {/* PATH A: Direct Customer Work Order */}
            <Button
              size="sm"
              onClick={() => setIsWorkOrderOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-xs text-white font-bold bangla-text shadow-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Direct Customer Work Order', 'গ্রাহক ওয়ার্ক অর্ডার')}
            </Button>

            {/* New Standalone Design Job */}
            <Button
              size="sm"
              onClick={() => setIsNewJobOpen(true)}
              className="bg-pink-600 hover:bg-pink-700 text-xs text-white font-bold bangla-text shadow-xs"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('New Design Job', 'নতুন ডিজাইন জব')}
            </Button>

            {/* Delete All Jobs Button */}
            {tenantJobs.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handlePurgeAllJobs}
                className="border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 text-xs font-bold bangla-text shadow-xs"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Delete All Jobs', 'সকল জব মুছুন')}
              </Button>
            )}
          </div>
        }
      />

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

      {/* 2. OPERATIONAL KPI BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        <Card
          onClick={() => {
            handleTabChange('pipeline')
            setWorkFilter('new')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'new' && activeTab === 'pipeline' ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>New Briefs</span>
            <Sparkles className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{kpiStats.newCount}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">Needs brief intake</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('pipeline')
            setWorkFilter('designing')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'designing' && activeTab === 'pipeline' ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Designing</span>
            <Palette className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{kpiStats.designingCount}</div>
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Active on artboard</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('customer_approvals')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'customer_approvals' ? 'ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Awaiting Proof</span>
            <Clock className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{kpiStats.approvalCount}</div>
          <div className="text-[10px] text-purple-600 font-medium mt-0.5">Sent to customer</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('pipeline')
            setWorkFilter('revision')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'revision' && activeTab === 'pipeline' ? 'ring-2 ring-rose-500 bg-rose-50/50 dark:bg-rose-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Revisions</span>
            <Flame className="h-3.5 w-3.5 text-rose-500" />
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-1">{kpiStats.revisionCount}</div>
          <div className="text-[10px] text-rose-600 font-medium mt-0.5">Feedback adjustments</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('pipeline')
            setWorkFilter('invoice_requested')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'invoice_requested' && activeTab === 'pipeline' ? 'ring-2 ring-amber-500 bg-amber-50/50 dark:bg-amber-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Invoice Req.</span>
            <Receipt className="h-3.5 w-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">{kpiStats.invoiceRequestedCount}</div>
          <div className="text-[10px] text-amber-600 font-medium mt-0.5">Billing queue</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('pipeline')
            setWorkFilter('ready_for_production')
          }}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            workFilter === 'ready_for_production' && activeTab === 'pipeline' ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Ready for Print</span>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{kpiStats.readyProdCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">Gates cleared</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('work_orders')
          }}
          className="p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Work Orders</span>
            <Layers className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{orders.length}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">Intake linked</div>
        </Card>

        <Card
          onClick={() => {
            handleTabChange('tasks')
          }}
          className="p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800"
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Due Today</span>
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{kpiStats.dueTodayCount}</div>
          <div className="text-[10px] text-red-600 font-medium mt-0.5">Urgent deadlines</div>
        </Card>
      </div>

      {/* 3. UNIFIED STUDIO NAVIGATION TABS & QUICK SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs font-bold scrollbar-none">
          <button
            onClick={() => handleTabChange('kanban')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'kanban'
                ? 'border-pink-600 text-pink-600 dark:text-pink-400 bg-pink-50/50 dark:bg-pink-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Kanban className="h-4 w-4" />
            <span>Kanban Board</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {tenantJobs.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('pipeline')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'pipeline'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Palette className="h-4 w-4" />
            <span>Designer Queue</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
              {kpiStats.designingCount + kpiStats.newCount}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('customer_approvals')}
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
            onClick={() => handleTabChange('work_orders')}
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
            onClick={() => handleTabChange('design_versions')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'design_versions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <History className="h-4 w-4" />
            <span>Artwork Assets</span>
          </button>

          <button
            onClick={() => handleTabChange('tasks')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'tasks'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <FileCode className="h-4 w-4" />
            <span>Pre-Press Tasks</span>
          </button>

          <button
            onClick={() => handleTabChange('overview')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Sparkles className="h-4 w-4" />
            <span>Studio Overview</span>
          </button>

          <button
            onClick={() => handleTabChange('notifications')}
            className={cn(
              'px-3.5 py-2.5 rounded-t-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5',
              activeTab === 'notifications'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            )}
          >
            <Bell className="h-4 w-4" />
            <span>Alerts</span>
            {notifications.length > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-red-600">
                {notifications.length}
              </Badge>
            )}
          </button>
        </div>

        {/* Search & Multi-Filters */}
        <div className="flex flex-wrap items-center gap-2 pb-1.5 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-56">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search job #, client, title..."
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
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Formats</option>
            <option value="ai">.AI (Illustrator)</option>
            <option value="psd">.PSD (Photoshop)</option>
            <option value="cdr">.CDR (CorelDraw)</option>
            <option value="pdf">.PDF (Print Ready)</option>
            <option value="svg">.SVG (Vector)</option>
          </select>

          <select
            value={intakeFilter}
            onChange={(e) => setIntakeFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Intakes</option>
            <option value="direct_customer">Direct Walk-in</option>
            <option value="manager_billing">Manager Billing</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="all">All Priorities</option>
            <option value="very_urgent">Very Urgent (জরুরি)</option>
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
          </select>

          <Button
            size="sm"
            variant={onlyMyJobs ? 'default' : 'outline'}
            onClick={() => setOnlyMyJobs(!onlyMyJobs)}
            className="text-xs h-8 px-2.5"
          >
            <User className="h-3.5 w-3.5 mr-1" />
            {onlyMyJobs ? 'My Queue Only' : 'My Queue'}
          </Button>
        </div>
      </div>

      {/* Sub-Filters for Pipeline Tab */}
      {activeTab === 'pipeline' && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
          <span className="text-slate-400 mr-1 text-[11px] uppercase tracking-wider">Queue:</span>
          {[
            { id: 'all', label: 'All Jobs', count: tenantJobs.length },
            { id: 'new', label: 'New Briefs', count: kpiStats.newCount },
            { id: 'designing', label: 'Designing', count: kpiStats.designingCount },
            { id: 'awaiting_approval', label: 'Awaiting Proof', count: kpiStats.approvalCount },
            { id: 'revision', label: 'Revisions', count: kpiStats.revisionCount },
            { id: 'invoice_requested', label: 'Invoice Req.', count: kpiStats.invoiceRequestedCount },
            { id: 'ready_for_production', label: 'Ready for Print', count: kpiStats.readyProdCount },
          ].map((sf) => (
            <button
              key={sf.id}
              onClick={() => setWorkFilter(sf.id as PipelineSubFilter)}
              className={cn(
                'px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1.5 cursor-pointer',
                workFilter === sf.id
                  ? 'bg-indigo-600 text-white font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
              )}
            >
              <span>{sf.label}</span>
              <span
                className={cn(
                  'text-[10px] px-1 rounded-full',
                  workFilter === sf.id ? 'bg-indigo-700 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                )}
              >
                {sf.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 1: KANBAN WORKFLOW BOARD
         ========================================================================= */}
      {viewMode === 'kanban' && activeTab === 'kanban' && (
        <div className="flex md:grid md:grid-cols-5 gap-4 overflow-x-auto touch-scroll snap-x snap-mandatory pb-4">
          {KANBAN_COLUMNS.map((col) => {
            const colJobs = filteredJobs.filter((j: DesignJobRecord) => {
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
                  'bg-slate-50/80 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-w-[280px] sm:min-w-[260px] md:min-w-0 snap-center shrink-0 md:shrink border-t-4',
                  col.color
                )}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">{col.title}</span>
                    <span className="h-5 px-1.5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-400">
                      {colJobs.length}
                    </span>
                  </div>
                  {col.id === 'approved' && <Lock className="h-3.5 w-3.5 text-emerald-600" />}
                </div>

                {/* Job Cards in Column */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px] pr-0.5">
                  {colJobs.map((job: DesignJobRecord) => {
                    const latestVersion = job.versions?.[job.versions.length - 1]
                    const format = latestVersion?.file_format || 'ai'
                    const hasInvoice = Boolean(job.invoice_id) || job.commercial_status === 'invoice_created'
                    const isInvoicePending = job.commercial_status === 'invoice_requested'

                    return (
                      <Card
                        key={job.id}
                        className="p-3 hover:shadow-md transition-all border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 group relative"
                      >
                        {/* Thumbnail / Lightbox preview trigger */}
                        <div
                          onClick={() => handleOpenLightbox(job)}
                          className="relative aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 mb-2.5 cursor-pointer group-hover:opacity-95"
                        >
                          <img
                            src={latestVersion?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'}
                            alt={job.title}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          {/* File Format Badge */}
                          <div className="absolute top-2 left-2">
                            <span className={`uppercase text-[10px] font-black px-1.5 py-0.5 rounded border shadow-sm ${getFormatBadgeColor(format)}`}>
                              .{format}
                            </span>
                          </div>

                          {/* Version Counter Badge */}
                          <div className="absolute top-2 right-2 flex items-center gap-1">
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/75 text-white backdrop-blur-xs">
                              v{job.current_version || 1}
                            </span>
                          </div>

                          {/* Lightbox Zoom Icon on Hover */}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-1.5 text-xs font-bold">
                            <Eye className="h-4 w-4" />
                            <span>Preview</span>
                          </div>

                          {/* Lock Badge if Approved */}
                          {job.is_locked && (
                            <div className="absolute bottom-2 right-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow">
                                <Lock className="h-2.5 w-2.5" /> Locked
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Meta & Header */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[11px] font-bold text-pink-600 dark:text-pink-400">
                              {job.design_number}
                            </span>
                            {job.priority === 'very_urgent' ? (
                              <span className="text-[10px] font-black text-red-600 flex items-center gap-0.5">
                                <Flame className="h-3 w-3" /> Urgent
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400 capitalize">
                                {job.priority}
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2">
                            {job.title}
                          </h4>

                          <div className="text-[11px] text-slate-500 truncate flex items-center justify-between">
                            <span>{job.customer_name}</span>
                            <span className="font-mono text-[10px] text-slate-400">{job.dimensions_spec}</span>
                          </div>

                          {/* Prepress Quality Indicators */}
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300">
                              CMYK 300DPI
                            </span>
                            {hasInvoice ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-0.5">
                                <Receipt className="h-2.5 w-2.5" /> Invoiced
                              </span>
                            ) : isInvoicePending ? (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 flex items-center gap-0.5">
                                <Clock className="h-2.5 w-2.5" /> Inv. Req
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Interactive Quick-Action Toolbar */}
                        <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            {/* WhatsApp Share Button */}
                            <button
                              onClick={() => handleOpenWhatsApp(job)}
                              title="Share proof via WhatsApp"
                              className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 hover:text-emerald-600 flex items-center justify-center text-slate-500"
                            >
                              <Phone className="h-3.5 w-3.5" />
                            </button>

                            {/* Upload Version Button */}
                            <button
                              onClick={() => handleOpenUploadModal(job)}
                              title="Upload new version"
                              className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 flex items-center justify-center text-slate-500"
                            >
                              <Upload className="h-3.5 w-3.5" />
                            </button>

                            {/* Flightcheck / Prepress Machine routing */}
                            <button
                              onClick={() => handleOpenPrepress(job)}
                              title="Pre-press flightcheck & machine dispatch"
                              className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-pink-50 dark:hover:bg-pink-950 hover:text-pink-600 flex items-center justify-center text-slate-500"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>

                            {/* Delete Job */}
                            <button
                              onClick={() => handleDeleteJob(job.id)}
                              title="Delete design job"
                              className="h-7 w-7 rounded-md border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950 hover:text-rose-600 hover:border-rose-300 flex items-center justify-center text-slate-400 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            {hasInvoice && (job.status === 'approved' || job.is_locked) && (
                              <Link
                                href={`/${slug}/production`}
                                className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold hover:underline text-[11px]"
                                title="Sent to Production Floor"
                              >
                                <Printer className="h-3 w-3" />
                                <span>Production &rarr;</span>
                              </Link>
                            )}
                            <Link
                              href={`/${slug}/design/${job.id}`}
                              className="inline-flex items-center gap-1 text-pink-600 dark:text-pink-400 font-bold hover:underline"
                            >
                              <span>Studio</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </div>
                      </Card>
                    )
                  })}

                  {colJobs.length === 0 && (
                    <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                      No jobs in {col.title}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* =========================================================================
          VIEW MODE 2: CARDS GRID & TABLE VIEW
         ========================================================================= */}
      {(viewMode === 'cards' || viewMode === 'table' || activeTab !== 'kanban') && (
        <div className="space-y-4">
          {/* Main Grid / Table of Jobs */}
          {activeTab !== 'overview' && activeTab !== 'notifications' && (
            <>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Job #</th>
                        <th className="py-3 px-4">Artwork & Title</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Format / Version</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Commercial Gate</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredJobs.map((job) => {
                        const latestVersion = job.versions?.[job.versions.length - 1]
                        const format = latestVersion?.file_format || 'ai'
                        const hasInvoice = Boolean(job.invoice_id) || job.commercial_status === 'invoice_created'
                        const isInvoicePending = job.commercial_status === 'invoice_requested'

                        return (
                          <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-pink-600 dark:text-pink-400">
                              #{job.design_number}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div
                                  onClick={() => handleOpenLightbox(job)}
                                  className="h-9 w-9 rounded-md overflow-hidden bg-slate-100 shrink-0 border border-slate-200 cursor-pointer"
                                >
                                  <img
                                    src={latestVersion?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=100&q=80'}
                                    alt={job.title}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1">{job.title}</div>
                                  <div className="text-[11px] text-slate-500 font-mono">{job.dimensions_spec || 'Standard'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-medium text-slate-700 dark:text-slate-300">
                              {job.customer_name}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                <span className={`uppercase text-[9px] font-black px-1.5 py-0.2 rounded border ${getFormatBadgeColor(format)}`}>
                                  .{format}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  v{job.current_version || 1}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="capitalize text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                {job.priority}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
                                {job.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {hasInvoice ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                                  <Receipt className="h-3 w-3" /> Invoiced
                                </span>
                              ) : isInvoicePending ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> Request Sent
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400">No Invoice</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenWhatsApp(job)}
                                  className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                                  title="WhatsApp"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleOpenUploadModal(job)}
                                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
                                  title="Upload Version"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  title="Delete Job"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <Link
                                  href={`/${slug}/design/${job.id}`}
                                  className="inline-flex items-center gap-0.5 text-xs font-bold text-pink-600 hover:underline ml-1"
                                >
                                  <span>Studio</span>
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {filteredJobs.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No design jobs found in pipeline.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredJobs.map((job) => {
                    const latestVersion = job.versions?.[job.versions.length - 1]
                    const format = latestVersion?.file_format || 'ai'
                    const hasInvoice = Boolean(job.invoice_id) || job.commercial_status === 'invoice_created'
                    const isInvoicePending = job.commercial_status === 'invoice_requested'

                    return (
                      <Card key={job.id} className="p-4 border-slate-200 dark:border-slate-800 hover:shadow-lg transition-all space-y-3">
                        {/* Header Spec */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-black text-pink-600 dark:text-pink-400">
                                #{job.design_number}
                              </span>
                              <span className={`uppercase text-[9px] font-black px-1.5 py-0.2 rounded border ${getFormatBadgeColor(format)}`}>
                                .{format}
                              </span>
                              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                v{job.current_version || 1}
                              </span>
                            </div>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1 line-clamp-1">{job.title}</h3>
                          </div>

                          <div className="text-right flex items-center gap-1">
                            <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 block">
                              {job.status.replace('_', ' ')}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteJob(job.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Job"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Artwork Preview Card with Lightbox Trigger */}
                        <div
                          onClick={() => handleOpenLightbox(job)}
                          className="relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer group"
                        >
                          <img
                            src={latestVersion?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=400&q=80'}
                            alt={job.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold gap-1.5">
                            <Eye className="h-4 w-4" />
                            <span>Inspect Artwork</span>
                          </div>
                          {job.is_locked && (
                            <div className="absolute bottom-2 right-2">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-600 text-white shadow">
                                <Lock className="h-3 w-3" /> Locked & Approved
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Client & Specs Info */}
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Customer:</span>
                            <strong className="text-slate-800 dark:text-slate-200">{job.customer_name}</strong>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Dimensions:</span>
                            <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">{job.dimensions_spec || 'Standard'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Designer:</span>
                            <span className="text-slate-700 dark:text-slate-300">{job.designer_name}</span>
                          </div>
                        </div>

                        {/* Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenWhatsApp(job)}
                              className="h-8 text-xs px-2 text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100"
                            >
                              <Phone className="h-3.5 w-3.5 mr-1" />
                              <span>WhatsApp</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenUploadModal(job)}
                              className="h-8 text-xs px-2"
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" />
                              <span>Upload v+1</span>
                            </Button>

                            {job.status === 'customer_approval' && (
                              <Button
                                size="sm"
                                onClick={() => handleOpenApprovalModal(job)}
                                className="h-8 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                              >
                                <Check className="h-3.5 w-3.5 mr-1" />
                                <span>Approve</span>
                              </Button>
                            )}

                            {job.status === 'approved' && hasInvoice && (
                              <Link
                                href={`/${slug}/production`}
                                className="inline-flex items-center gap-1.5 h-8 text-xs px-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                              >
                                <Printer className="h-3.5 w-3.5" />
                                <span>Production &rarr;</span>
                              </Link>
                            )}

                            {job.status === 'approved' && !hasInvoice && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenInvoiceRequest(job)}
                                className="h-8 text-xs px-2 border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 font-bold"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                <span>Req Invoice</span>
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteJob(job.id)}
                              className="h-8 text-xs px-2 text-rose-600 hover:bg-rose-50"
                              title="Delete Job"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <Link
                              href={`/${slug}/design/${job.id}`}
                              className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:underline"
                            >
                              <span>Workbench &rarr;</span>
                            </Link>
                          </div>
                        </div>
                      </Card>
                    )
                  })}

                  {filteredJobs.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No design jobs found in pipeline.
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* OVERVIEW ANALYTICS TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 border-l-4 border-l-pink-500 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Studio Productivity</span>
                    <Sparkles className="h-4 w-4 text-pink-500" />
                  </div>
                  <div className="text-3xl font-black text-slate-900 dark:text-white">{tenantJobs.length}</div>
                  <p className="text-xs text-slate-500">Total Pre-Press creative projects initiated</p>
                  <div className="pt-2 border-t text-xs flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Active Designing:</span>
                    <strong>{kpiStats.designingCount}</strong>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-emerald-500 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Production Clearance</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div className="text-3xl font-black text-emerald-600">{kpiStats.readyProdCount}</div>
                  <p className="text-xs text-slate-500">Commercial & artwork gates fully cleared for press floor</p>
                  <div className="pt-2 border-t text-xs flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Approved & Locked:</span>
                    <strong>{kpiStats.approvedCount}</strong>
                  </div>
                </Card>

                <Card className="p-5 border-l-4 border-l-amber-500 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billing Gating</span>
                    <Receipt className="h-4 w-4 text-amber-500" />
                  </div>
                  <div className="text-3xl font-black text-amber-600">{kpiStats.invoiceRequestedCount}</div>
                  <p className="text-xs text-slate-500">Invoice requests dispatched to Sales / Billing Manager</p>
                  <div className="pt-2 border-t text-xs flex justify-between text-slate-600 dark:text-slate-400">
                    <span>Awaiting Client Proof:</span>
                    <strong>{kpiStats.approvalCount}</strong>
                  </div>
                </Card>
              </div>

              {/* Supported Machine Fleet */}
              <Card className="p-5 space-y-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Printer className="h-4 w-4 text-indigo-600" />
                    <span>Pre-Press Connected Machine Floor Routing</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Target separation profiles and RIP formats ready for factory press operators.
                  </CardDescription>
                </CardHeader>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {PRINT_MACHINERY_LIST.map((m) => (
                    <div key={m.id} className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{m.name}</span>
                        <Badge variant="outline" className="text-[10px]">{m.type}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">RIP Profile: CMYK Process • Bleed Verified • Hot Folder Ready</p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* NOTIFICATIONS TAB */}
          {activeTab === 'notifications' && (
            <Card className="p-4">
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Bell className="h-4 w-4 text-pink-600" />
                  <span>Studio & Workflow Alerts</span>
                </h3>
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No unread studio alerts. All clear!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {notifications.map((n, idx) => (
                      <div key={n.id || idx} className="py-3 flex items-start gap-3">
                        <div className="h-8 w-8 rounded-full bg-pink-50 text-pink-600 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                          <Palette className="h-4 w-4" />
                        </div>
                        <div className="flex-1 text-xs">
                          <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title || n.message}</p>
                          <p className="text-slate-500 text-[11px] mt-0.5">{n.created_at || 'Recently'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* =========================================================================
          POWER UPGRADE MODAL 1: HIGH-RES ARTWORK LIGHTBOX & ZOOM INSPECTOR
         ========================================================================= */}
      {lightboxJob && (
        <ModalDialog
          open={Boolean(lightboxJob)}
          onOpenChange={(open) => {
            if (!open) setLightboxJob(null)
          }}
          title={
            <div className="flex items-center justify-between w-full pr-6">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-pink-600" />
                <span className="font-bold">Artwork Inspector: #{lightboxJob.design_number} — {lightboxJob.title}</span>
              </div>
              <Badge variant="outline" className="font-mono text-xs">
                v{(lightboxJob.versions?.[lightboxVersionIdx]?.version_number || lightboxVersionIdx + 1)}
              </Badge>
            </div>
          }
        >
          <div className="space-y-4 pt-1">
            {/* Version Switcher Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b">
              {lightboxJob.versions?.map((ver, idx) => (
                <button
                  key={ver.id || idx}
                  onClick={() => {
                    setLightboxVersionIdx(idx)
                    setLightboxZoom(1)
                  }}
                  className={cn(
                    'px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5',
                    lightboxVersionIdx === idx
                      ? 'bg-pink-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  )}
                >
                  <span>v{ver.version_number}</span>
                  {ver.is_approved && <Check className="h-3 w-3 text-emerald-400" />}
                </button>
              ))}
            </div>

            {/* Canvas / Image Viewport */}
            <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center group">
              <img
                src={
                  lightboxJob.versions?.[lightboxVersionIdx]?.proof_file_url ||
                  'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80'
                }
                alt="Artwork Proof"
                style={{ transform: `scale(${lightboxZoom})`, transition: 'transform 0.2s ease-out' }}
                className="max-h-full max-w-full object-contain cursor-grab active:cursor-grabbing"
              />

              {/* Floating Zoom Controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/80 backdrop-blur-md rounded-lg p-1 text-white border border-white/10">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLightboxZoom((z) => Math.min(3, z + 0.25))}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <span className="text-[10px] font-mono font-bold px-1">{Math.round(lightboxZoom * 100)}%</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLightboxZoom((z) => Math.max(0.5, z - 0.25))}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setLightboxZoom(1)}
                  className="h-7 w-7 p-0 text-white hover:bg-white/20"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Pre-Press Flightcheck Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border">
              <div>
                <span className="text-slate-400 block text-[10px]">Dimensions</span>
                <strong className="font-mono">{lightboxJob.dimensions_spec || 'Standard'}</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Color Separation</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">CMYK Process Ready</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Resolution</span>
                <span className="font-semibold text-emerald-600">300 DPI (High Res)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Cut Bleed Margin</span>
                <span className="font-semibold">0.125 in (3mm)</span>
              </div>
            </div>

            {/* Notes & Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t">
              <div className="text-xs text-slate-500">
                <span>Uploaded by: </span>
                <strong>{lightboxJob.versions?.[lightboxVersionIdx]?.uploaded_by_name || 'Studio Designer'}</strong>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenWhatsApp(lightboxJob)}
                  className="text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                >
                  <Phone className="h-3.5 w-3.5 mr-1" />
                  <span>WhatsApp Proof</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenCompare(lightboxJob)}
                  className="text-xs"
                >
                  <Split className="h-3.5 w-3.5 mr-1" />
                  <span>Compare Diff</span>
                </Button>

                <Button
                  size="sm"
                  asChild
                  className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs"
                >
                  <Link href={`/${slug}/design/${lightboxJob.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    <span>Open Full Studio</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* =========================================================================
          POWER UPGRADE MODAL 2: WHATSAPP DIGITAL PROOF DISPATCHER
         ========================================================================= */}
      {whatsAppJob && (
        <ModalDialog
          open={Boolean(whatsAppJob)}
          onOpenChange={(open) => {
            if (!open) setWhatsAppJob(null)
          }}
          title={
            <div className="flex items-center gap-2 text-emerald-600">
              <Phone className="h-4 w-4" />
              <span className="font-bold">WhatsApp Proof Dispatcher: #{whatsAppJob.design_number}</span>
            </div>
          }
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="space-y-1.5">
              <Label className="font-bold">Customer Mobile (WhatsApp Number)</Label>
              <Input
                value={whatsAppPhone}
                onChange={(e) => setWhatsAppPhone(e.target.value)}
                placeholder="e.g. 01712345678"
                className="h-9 font-mono font-bold"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">Generated WhatsApp Notification Message</Label>
              <textarea
                rows={6}
                readOnly
                value={handleGenerateWhatsAppText(whatsAppJob)}
                className="w-full p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 font-mono text-[11px] leading-relaxed select-all"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyWhatsApp(whatsAppJob)}
                className="text-xs"
              >
                {whatsAppCopied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                <span>{whatsAppCopied ? 'Copied!' : 'Copy Text'}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSendWhatsAppWeb(whatsAppJob)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                <Phone className="h-3.5 w-3.5 mr-1" />
                <span>Open WhatsApp Web & Send</span>
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* =========================================================================
          POWER UPGRADE MODAL 3: PRE-PRESS FLIGHTCHECK & MACHINE ROUTING
         ========================================================================= */}
      {prepressJob && (
        <ModalDialog
          open={Boolean(prepressJob)}
          onOpenChange={(open) => {
            if (!open) setPrepressJob(null)
          }}
          title={
            <div className="flex items-center gap-2 text-indigo-600">
              <Printer className="h-4 w-4" />
              <span className="font-bold">Pre-Press Flightcheck & Press Routing: #{prepressJob.design_number}</span>
            </div>
          }
        >
          <form onSubmit={handleDispatchToMachine} className="space-y-4 pt-1 text-xs">
            {/* Checklist */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border space-y-2">
              <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1">Pre-Press Verification Checklist:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Color Mode: CMYK Separations</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Resolution: &ge; 300 DPI at 100%</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Fonts: Converted to Outlines/Curves</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Bleed: 2.0" Margins for Welding/Frame</span>
                </div>
              </div>
            </div>

            {/* Target Machine Selection */}
            <div className="space-y-1.5">
              <Label className="font-bold">Target Print Floor Machine</Label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {PRINT_MACHINERY_LIST.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setPrepressJob(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                <Printer className="h-3.5 w-3.5 mr-1" />
                <span>Authorize & Route to Machine</span>
              </Button>
            </div>
          </form>
        </ModalDialog>
      )}

      {/* =========================================================================
          POWER UPGRADE MODAL 4: VERSION DIFF COMPARISON
         ========================================================================= */}
      {compareJob && (
        <ModalDialog
          open={Boolean(compareJob)}
          onOpenChange={(open) => {
            if (!open) setCompareJob(null)
          }}
          title={
            <div className="flex items-center gap-2 text-pink-600">
              <Split className="h-4 w-4" />
              <span className="font-bold">Side-by-Side Version Diff: #{compareJob.design_number}</span>
            </div>
          }
        >
          <div className="space-y-4 pt-1 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Version A */}
              <div className="space-y-2 border rounded-xl p-3 bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between items-center">
                  <strong className="font-mono">Version {compareVerA}</strong>
                  <span className="text-[10px] text-slate-500">Earlier Version</span>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-950">
                  <img
                    src={compareJob.versions?.[compareVerA - 1]?.proof_file_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}
                    alt="Version A"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {compareJob.versions?.[compareVerA - 1]?.change_notes || 'Initial brief submission.'}
                </p>
              </div>

              {/* Version B */}
              <div className="space-y-2 border rounded-xl p-3 bg-slate-50 dark:bg-slate-900">
                <div className="flex justify-between items-center">
                  <strong className="font-mono text-pink-600">Version {compareVerB} (Latest)</strong>
                  <span className="text-[10px] text-pink-600 font-bold">Revised Proof</span>
                </div>
                <div className="aspect-video rounded-lg overflow-hidden bg-slate-950">
                  <img
                    src={compareJob.versions?.[compareVerB - 1]?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80'}
                    alt="Version B"
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  {compareJob.versions?.[compareVerB - 1]?.change_notes || 'Adjustments per client review.'}
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button type="button" variant="outline" size="sm" onClick={() => setCompareJob(null)}>
                Close Comparison
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* STANDARD MODAL: CREATE STANDALONE DESIGN JOB */}
      <ModalDialog
        open={isNewJobOpen}
        onOpenChange={setIsNewJobOpen}
        title="Create New Pre-Press Design Job"
        description="Assign customer brief, specifications, and primary format to designer workbench."
      >
        <form onSubmit={handleCreateStandaloneJob} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="djCust" required>Customer Profile</Label>
            <select
              id="djCust"
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="">Select customer...</option>
              {customers.map((c: CustomerRecord) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.mobile})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="djTitle" required>Artwork / Design Title</Label>
            <Input
              id="djTitle"
              placeholder="e.g. 3D Acrylic Facade Signboard Vector Layout"
              value={newJobTitle}
              onChange={(e) => setNewJobTitle(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="djDims" required>Dimensions (W × H)</Label>
              <Input
                id="djDims"
                placeholder="e.g. 20ft × 4ft (150 DPI)"
                value={newJobDims}
                onChange={(e) => setNewJobDims(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="djFmt" required>Production Format</Label>
              <select
                id="djFmt"
                value={newJobFormat}
                onChange={(e) => setNewJobFormat(e.target.value as DesignFormat)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
              >
                <option value="ai">.AI (Adobe Illustrator)</option>
                <option value="psd">.PSD (Photoshop)</option>
                <option value="cdr">.CDR (CorelDRAW)</option>
                <option value="pdf">.PDF (Print Press Ready)</option>
                <option value="svg">.SVG (Vector)</option>
                <option value="zip">.ZIP (Package)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="djPri" required>Priority</Label>
              <select
                id="djPri"
                value={newJobPriority}
                onChange={(e) => setNewJobPriority(e.target.value as DesignPriority)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
                <option value="very_urgent">Very Urgent (জরুরি)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="djInst">Design Brief & Client Instructions</Label>
            <textarea
              id="djInst"
              rows={3}
              placeholder="e.g. PMS 300C corporate cyan, 2-inch border margins for welding, include LED holes..."
              value={newJobInstructions}
              onChange={(e) => setNewJobInstructions(e.target.value)}
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewJobOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-pink-600 hover:bg-pink-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Launch Design Job
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* STANDARD MODAL: UPLOAD NEW VERSION */}
      <ModalDialog
        open={isUploadModalOpen}
        onOpenChange={setIsUploadModalOpen}
        title={
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-indigo-600" />
            <span>Upload Artwork Version: {selectedJob?.design_number}</span>
          </div>
        }
      >
        <form onSubmit={handleSaveUploadVersion} className="space-y-4 pt-2 text-xs">
          <div>
            <Label className="text-xs font-semibold mb-1 block">Artwork File Name / Asset Label</Label>
            <Input
              placeholder="e.g. frontlit_banner_v2.ai"
              value={uploadFileName}
              onChange={(e) => setUploadFileName(e.target.value)}
              className="text-xs h-9 font-mono font-bold"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">File Format</Label>
              <select
                value={uploadFormat}
                onChange={(e) => setUploadFormat(e.target.value as DesignFormat)}
                className="w-full h-9 px-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold uppercase"
              >
                <option value="ai">.AI (Illustrator)</option>
                <option value="psd">.PSD (Photoshop)</option>
                <option value="cdr">.CDR (CorelDRAW)</option>
                <option value="pdf">.PDF (Press Ready)</option>
                <option value="svg">.SVG (Vector)</option>
                <option value="zip">.ZIP (Package)</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">New Version Number</Label>
              <div className="h-9 px-3 rounded-lg border bg-slate-100 dark:bg-slate-800 flex items-center font-mono font-bold text-indigo-600">
                v{(selectedJob?.current_version || 1) + 1}
              </div>
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

      {/* STANDARD MODAL: APPROVE & LOCK VERSION */}
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
        <form onSubmit={handleApproveDesign} className="space-y-4 pt-2 text-xs">
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

      {/* STANDARD MODAL: CUSTOMER REVISION FEEDBACK */}
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

      {/* STANDARD MODAL: REQUEST INVOICE FROM MANAGER */}
      <ModalDialog
        open={isRequestInvoiceModalOpen}
        onOpenChange={setIsRequestInvoiceModalOpen}
        title={
          <div className="flex items-center gap-2 text-rose-600">
            <Send className="h-4 w-4" />
            <span className="font-bold">Request Invoice from Billing Manager</span>
          </div>
        }
      >
        <form onSubmit={handleDispatchInvoiceRequest} className="space-y-3 pt-1 text-xs">
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

      {/* WORK ORDER MODAL */}
      <WorkOrderModal
        isOpen={isWorkOrderOpen}
        onClose={() => setIsWorkOrderOpen(false)}
        onSuccess={(order, sentToManager) => {
          showNotification(
            sentToManager
              ? tBilingual(
                  `Work Order #${order.order_number} saved & Invoice Request sent to Manager!`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সংরক্ষিত এবং ম্যানেজারের কাছে ইনভয়েস রিকোয়েস্ট পাঠানো হয়েছে!`
                )
              : tBilingual(
                  `Work Order #${order.order_number} created successfully.`,
                  `ওয়ার্ক অর্ডার #${order.order_number} সফলভাবে তৈরি হয়েছে।`
                )
          )
        }}
      />
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
