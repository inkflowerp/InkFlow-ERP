'use client'

import React, { useState, useTransition, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
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
import type { ProductionJobRecord, ProductionJobStatus } from '@/types/production.types'
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
} from '@/actions/design.actions'
import { getOrdersAction } from '@/actions/order.actions'
import {
  getInAppNotificationsAction,
  deleteNotificationAction,
  purgeAllNotificationsAction,
} from '@/actions/notification.actions'
import { createInvoiceRequestAction } from '@/actions/invoice-request.actions'
import { getInvoicesAction } from '@/actions/billing.actions'
import { cn } from '@/lib/utils'

export type DesignPanelTab =
  | 'all'
  | 'new_tasks'
  | 'design_running'
  | 'waiting_approval'
  | 'in_production'
  | 'pipeline'
  | 'design_requests'
  | 'design_checks'
  | 'overview'
  | 'work_orders'
  | 'customer_approvals'
  | 'design_versions'
  | 'tasks'
  | 'notifications'

export type ViewMode = 'cards' | 'table'

export interface GroupedDesignWorkItem {
  id: string
  jobRecord: DesignJobRecord
  design_number: string
  title: string
  product_name?: string | null
  dimensions_spec?: string | null
  material?: string | null
  finishing?: string | null
  quantity?: number | null
  unit?: string | null
  priority: DesignPriority
  status: DesignStatus
  workflow_routing?: 'design_required' | 'design_ok' | 'ready_production' | 'custom'
  commercial_status?: string | null
  current_version: number
  is_locked?: boolean
  customer_approval_required?: boolean
  format: DesignFormat
  proof_url: string
  proof_file_name: string
  designer_name: string
  deadline?: string | null
  instructions?: string | null
  created_at: string
}

export interface GroupedDesignCard {
  groupId: string
  groupKey: string
  groupType: 'invoice' | 'order' | 'standalone'
  invoice_id?: string | null
  invoice_number?: string | null
  sales_order_id?: string | null
  order_number?: string | null
  customer_id?: string | null
  customer_name: string
  customer_phone?: string | null
  customer_email?: string | null
  deadline?: string | null
  created_at: string
  hasInvoice: boolean
  isInvoicePending: boolean
  invoice_request_id?: string | null
  works: GroupedDesignWorkItem[]
  overallStatus: 'all_approved' | 'in_progress' | 'awaiting_approval' | 'revisions' | 'received'
  approvedCount: number
  totalWorks: number
  highestPriority: DesignPriority
}

const PRINT_MACHINERY_LIST = [
  { id: 'roland_eco', name: 'Roland SolJet Pro-4 Eco-Solvent (10ft Outdoor / ব্যানার ও পিভিসি)', type: 'Roll-to-Roll' },
  { id: 'konica_c4070', name: 'Konica Minolta AccurioPress C4070 (Digital Offset / ডিজিটাল শিট)', type: 'Cut-Sheet' },
  { id: 'offset_speedmaster', name: 'Heidelberg Speedmaster 4-Color (Commercial Offset / অফসেট প্রেস)', type: 'Offset' },
  { id: 'uv_flatbed_8x4', name: 'UV Flatbed 8×4ft (Acrylic/Foam/Wood / ইউভি প্রিন্ট)', type: 'Flatbed UV' },
  { id: 'cnc_router', name: 'CNC Router 3D Cutting Bed (ACP/Acrylic / এক্রিলিক রাউটার)', type: 'Fabrication' },
  { id: 'laser_bed', name: 'High-Precision Laser Engraver & Cutter (লেজার কাটিং)', type: 'Cutting' },
  { id: 'dtf_textile', name: 'DTF 24-inch Industrial Textile (ডিটিএফ ফেব্রিক)', type: 'Textile' },
]

export interface DesignPanelProps {
  defaultTab?: DesignPanelTab
}

function DesignPanelInner({ defaultTab = 'all' }: DesignPanelProps) {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname() || '/design'
  const { company, currentUser } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const companyId = company?.id || (slug !== 'my-company' ? slug : '2af84f1d-1ebd-48e7-9795-fd5c24c38a96')

  // Helper for generating dynamic tenant links that work for both subdomains and subpaths
  const getTenantHref = (path: string) => {
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    if (pathname.startsWith(`/${slug}`)) {
      return `/${slug}${cleanPath}`
    }
    return cleanPath
  }

  // Helper for strict tenant scoping
  const isMatchingCompany = (id?: string | null) => {
    if (!id) return true
    return (
      (company?.id && id === company.id) ||
      (company?.slug && id === company.slug) ||
      (slug && id === slug) ||
      (companyId && id === companyId) ||
      id === 'default'
    )
  }

  // URL Tab Parameter Sync
  const tabParam = searchParams?.get('tab') as DesignPanelTab | null
  const initialTab: DesignPanelTab =
    tabParam &&
    [
      'all',
      'pipeline',
      'design_requests',
      'design_checks',
      'overview',
      'work_orders',
      'customer_approvals',
      'design_versions',
      'tasks',
      'notifications',
    ].includes(tabParam)
      ? tabParam
      : defaultTab

  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState<DesignPanelTab>(initialTab)
  const [viewMode, setViewMode] = useState<ViewMode>('cards')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [intakeFilter, setIntakeFilter] = useState<string>('all')
  const [formatFilter, setFormatFilter] = useState<string>('all')
  const [onlyMyJobs, setOnlyMyJobs] = useState(false)

  const isSyncingRef = useRef(false)
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Sync tab with URL search parameter reactively
  useEffect(() => {
    if (
      tabParam &&
      [
        'all',
        'new_tasks',
        'design_running',
        'waiting_approval',
        'in_production',
        'pipeline',
        'design_requests',
        'design_checks',
        'overview',
        'work_orders',
        'customer_approvals',
        'design_versions',
        'tasks',
        'notifications',
      ].includes(tabParam)
    ) {
      setActiveTab(tabParam as DesignPanelTab)
    }
  }, [tabParam])

  // Datastore hooks
  const [jobs, setJobs] = useDataStore<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS, [])
  const [invoices] = useDataStore<InvoiceRecord[]>(STORAGE_KEYS.INVOICES, [])
  const [invoiceRequests] = useDataStore<InvoiceRequestRecord[]>(STORAGE_KEYS.INVOICE_REQUESTS, [])
  const [orders, setOrders] = useDataStore<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS, [])
  const [customers] = useDataStore<CustomerRecord[]>(STORAGE_KEYS.CUSTOMERS, [])
  const [notifications, setNotifications] = useDataStore<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS, [])
  const [productionJobs, setProductionJobs] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])
  const [jobOrders, setJobOrders] = useDataStore<any[]>(STORAGE_KEYS.JOB_ORDERS, [])

  // Modals state
  const [isWorkOrderOpen, setIsWorkOrderOpen] = useState(false)
  const [isNewJobOpen, setIsNewJobOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<DesignJobRecord | null>(null)
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isRequestInvoiceModalOpen, setIsRequestInvoiceModalOpen] = useState(false)
  
  // Power Upgrade Modals & Tools
  const [lightboxJob, setLightboxJob] = useState<DesignJobRecord | null>(null)
  const [lightboxVersionIdx, setLightboxVersionIdx] = useState<number>(0)
  const [lightboxZoom, setLightboxZoom] = useState<number>(1)
  const [whatsAppJob, setWhatsAppJob] = useState<DesignJobRecord | null>(null)
  const [whatsAppPhone, setWhatsAppPhone] = useState<string>('')
  const [whatsAppCopied, setWhatsAppCopied] = useState<boolean>(false)
  const [whatsAppTemplate, setWhatsAppTemplate] = useState<'proof' | 'reminder' | 'production' | 'revision'>('proof')
  const [whatsAppEditableText, setWhatsAppEditableText] = useState<string>('')
  const [prepressJob, setPrepressJob] = useState<DesignJobRecord | null>(null)
  const [selectedMachine, setSelectedMachine] = useState<string>('roland_eco')
  const [compareJob, setCompareJob] = useState<DesignJobRecord | null>(null)
  const [compareVerA, setCompareVerA] = useState<number>(1)
  const [compareVerB, setCompareVerB] = useState<number>(1)

  // Pre-press Flightcheck state per work item (CMYK, 300 DPI, Bleed, Curves)
  const [preflightState, setPreflightState] = useState<Record<string, { cmyk: boolean; dpi300: boolean; bleed: boolean; curves: boolean }>>({})

  // Interactive work selection per grouped invoice/order card
  const [selectedWorkIdByGroup, setSelectedWorkIdByGroup] = useState<Record<string, string>>({})

  const [notificationMsg, setNotificationMsg] = useState<{ text: string; type: 'success' | 'warning' | 'info' } | null>(null)

  // Preflight status helper & toggler
  const getPreflightStatus = (jobId: string, status?: DesignStatus) => {
    if (preflightState[jobId]) return preflightState[jobId]
    const isApprovedOrProd = status === 'approved'
    return {
      cmyk: isApprovedOrProd,
      dpi300: isApprovedOrProd,
      bleed: isApprovedOrProd,
      curves: isApprovedOrProd,
    }
  }

  const handleTogglePreflight = (jobId: string, checkKey: 'cmyk' | 'dpi300' | 'bleed' | 'curves', jobNum?: string) => {
    setPreflightState((prev) => {
      const current = prev[jobId] || { cmyk: false, dpi300: false, bleed: false, curves: false }
      const updated = { ...current, [checkKey]: !current[checkKey] }
      const labels = {
        cmyk: 'CMYK Color Separation',
        dpi300: '300 DPI Resolution',
        bleed: 'Bleed Margins (3mm / 2")',
        curves: 'Fonts Outlined / Curves',
      }
      showNotification(`${labels[checkKey]} ${updated[checkKey] ? '✅ VERIFIED' : '❌ UNCHECKED'} for #${jobNum || jobId}`)
      return { ...prev, [jobId]: updated }
    })
  }

  // Standalone new job creation form (.JPG / .PNG only)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newJobDims, setNewJobDims] = useState('')
  const [newJobPriority, setNewJobPriority] = useState<DesignPriority>('urgent')
  const [newJobFormat, setNewJobFormat] = useState<DesignFormat>('png')
  const [newJobInstructions, setNewJobInstructions] = useState('')
  const [newJobProofUrl, setNewJobProofUrl] = useState<string>('')
  const [newJobFileName, setNewJobFileName] = useState<string>('')
  const [isNewJobDragging, setIsNewJobDragging] = useState(false)

  // Version upload form (.JPG / .PNG only)
  const [uploadFileName, setUploadFileName] = useState('')
  const [uploadFormat, setUploadFormat] = useState<DesignFormat>('png')
  const [uploadNotes, setUploadNotes] = useState('')
  const [uploadProofUrl, setUploadProofUrl] = useState<string>('')
  const [isUploadDragging, setIsUploadDragging] = useState(false)

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

  // Helper: Process file for upload modals
  const processImageFileForModal = (file: File, target: 'upload' | 'new_job') => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const isJpeg = ext === 'jpg' || ext === 'jpeg'
    const isPng = ext === 'png'

    if (!isJpeg && !isPng) {
      showNotification('Unsupported file! Only .JPG and .PNG files are supported.', 'warning')
      return
    }

    const fmt: DesignFormat = isJpeg ? 'jpg' : 'png'
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      if (dataUrl) {
        if (target === 'upload') {
          setUploadProofUrl(dataUrl)
          setUploadFileName(file.name || `proof_upload_${Date.now()}.${fmt}`)
          setUploadFormat(fmt)
          showNotification(`Artwork proof loaded: ${file.name} (${fmt.toUpperCase()})!`, 'success')
        } else {
          setNewJobProofUrl(dataUrl)
          setNewJobFileName(file.name || `brief_proof_${Date.now()}.${fmt}`)
          setNewJobFormat(fmt)
          showNotification(`Brief artwork loaded: ${file.name} (${fmt.toUpperCase()})!`, 'success')
        }
      }
    }
    reader.readAsDataURL(file)
  }

  // Global Clipboard Paste (Ctrl+V) listener on Design Studio
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        const item = items[i]
        if (item.type.indexOf('image') !== -1) {
          e.preventDefault()
          const file = item.getAsFile()
          if (!file) continue

          const fmt: DesignFormat = item.type === 'image/jpeg' ? 'jpg' : 'png'
          const reader = new FileReader()
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string
            if (!dataUrl) return

            if (isUploadModalOpen && selectedJob) {
              const nextVer = (selectedJob.current_version || 1) + 1
              setUploadProofUrl(dataUrl)
              setUploadFileName(`proof_${selectedJob.design_number.toLowerCase()}_v${nextVer}.${fmt}`)
              setUploadFormat(fmt)
              showNotification(`Image pasted from clipboard (${fmt.toUpperCase()}) for #${selectedJob.design_number}!`, 'success')
            } else if (isNewJobOpen) {
              setNewJobProofUrl(dataUrl)
              setNewJobFileName(`brief_proof_${Date.now()}.${fmt}`)
              setNewJobFormat(fmt)
              showNotification(`Image pasted from clipboard (${fmt.toUpperCase()}) for new design job!`, 'success')
            } else if (selectedJob) {
              const nextVer = (selectedJob.current_version || 1) + 1
              setUploadProofUrl(dataUrl)
              setUploadFileName(`proof_${selectedJob.design_number.toLowerCase()}_v${nextVer}.${fmt}`)
              setUploadFormat(fmt)
              setUploadNotes(`Pasted artwork revision (Ctrl+V) for Version ${nextVer}`)
              setIsUploadModalOpen(true)
              showNotification(`Image pasted for #${selectedJob.design_number}! Review and save version.`, 'success')
            } else {
              setNewJobProofUrl(dataUrl)
              setNewJobFileName(`artwork_brief_${Date.now()}.${fmt}`)
              setNewJobFormat(fmt)
              setIsNewJobOpen(true)
              showNotification(`Image pasted! Enter customer & title to launch design job.`, 'success')
            }
          }
          reader.readAsDataURL(file)
          break
        }
      }
    }

    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [isUploadModalOpen, isNewJobOpen, selectedJob])

  // Authoritative server synchronization on mount and company change (Throttled & Guarded)
  useEffect(() => {
    let isMounted = true
    async function syncServerData() {
      if (!company?.id || isSyncingRef.current) return
      isSyncingRef.current = true
      try {
        const [jobsRes, ordersRes, notifsRes, invoicesRes] = await Promise.allSettled([
          getDesignJobsAction(company.id),
          getOrdersAction(company.id),
          getInAppNotificationsAction(company.id),
          getInvoicesAction(undefined, company.id),
        ])

        if (!isMounted) return

        if (invoicesRes.status === 'fulfilled' && invoicesRes.value?.success && invoicesRes.value.data) {
          const serverInvoices = invoicesRes.value.data
          const allStoredInvoices = PrintERPDataStore.get<InvoiceRecord[]>(STORAGE_KEYS.INVOICES) || []
          const invMap = new Map<string, InvoiceRecord>()
          for (const i of allStoredInvoices) {
            if (i && i.id) invMap.set(i.id, i)
          }
          for (const i of serverInvoices) {
            if (i && i.id) invMap.set(i.id, i)
          }
          const mergedInvoices = Array.from(invMap.values())
          PrintERPDataStore.set(STORAGE_KEYS.INVOICES, mergedInvoices)
        }

        if (jobsRes.status === 'fulfilled' && jobsRes.value?.success && jobsRes.value.data) {
          const serverJobs = jobsRes.value.data || []
          const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
          const jobMap = new Map<string, DesignJobRecord>()
          for (const j of allStored) {
            if (j && j.id) jobMap.set(j.id, j)
          }
          for (const j of serverJobs) {
            if (j && j.id) jobMap.set(j.id, j)
          }
          const merged = Array.from(jobMap.values())
          PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, merged)
          setJobs(merged)
        }

        if (ordersRes.status === 'fulfilled' && ordersRes.value?.success && ordersRes.value.data) {
          const serverOrders = ordersRes.value.data
          const allStoredOrders = PrintERPDataStore.get<SalesOrderRecord[]>(STORAGE_KEYS.ORDERS) || []
          const otherTenantOrders = allStoredOrders.filter((o) => o.company_id && !isMatchingCompany(o.company_id))
          const mergedOrders = [...otherTenantOrders, ...serverOrders]
          PrintERPDataStore.set(STORAGE_KEYS.ORDERS, mergedOrders)
          setOrders(mergedOrders)
        }

        if (notifsRes.status === 'fulfilled' && notifsRes.value?.success && notifsRes.value.data) {
          const serverNotifs = notifsRes.value.data
          const allStoredNotifs = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
          const otherTenantNotifs = allStoredNotifs.filter((n) => n.company_id && !isMatchingCompany(n.company_id))
          const mergedNotifs = [...otherTenantNotifs, ...serverNotifs]
          PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, mergedNotifs)
          setNotifications(mergedNotifs)
        }
      } catch (err) {
        console.warn('Silently handled design panel server sync error:', err)
      } finally {
        isSyncingRef.current = false
      }
    }
    syncServerData()

    const handleDebouncedRemoteSync = () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      syncTimeoutRef.current = setTimeout(() => {
        syncServerData()
      }, 1200)
    }

    window.addEventListener('printerp_table_synced:design_jobs', handleDebouncedRemoteSync)
    window.addEventListener('printerp_table_synced:design_versions', handleDebouncedRemoteSync)
    window.addEventListener('printerp_table_synced:sales_orders', handleDebouncedRemoteSync)
    window.addEventListener('printerp_table_synced:invoices', handleDebouncedRemoteSync)

    return () => {
      isMounted = false
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current)
      window.removeEventListener('printerp_table_synced:design_jobs', handleDebouncedRemoteSync)
      window.removeEventListener('printerp_table_synced:design_versions', handleDebouncedRemoteSync)
      window.removeEventListener('printerp_table_synced:sales_orders', handleDebouncedRemoteSync)
      window.removeEventListener('printerp_table_synced:invoices', handleDebouncedRemoteSync)
    }
  }, [company?.id, slug, setJobs, setOrders, setNotifications])

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

  // Purge all alerts / notifications handler
  const handlePurgeAllNotifications = async () => {
    if (!confirm('Are you sure you want to delete ALL alerts and studio notifications?')) {
      return
    }
    startTransition(async () => {
      try {
        const res = await purgeAllNotificationsAction(companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to delete notifications', 'warning')
          return
        }
        const allStored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
        const remaining = allStored.filter((n) => n.company_id && !isMatchingCompany(n.company_id))
        PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, remaining)
        setNotifications(remaining)
        showNotification('All studio alerts have been deleted!')
      } catch (err: any) {
        showNotification(err.message || 'Failed to purge alerts', 'warning')
      }
    })
  }

  // Delete single notification handler
  const handleDeleteNotification = async (notificationId: string) => {
    startTransition(async () => {
      try {
        await deleteNotificationAction(notificationId, companyId)
        const allStored = PrintERPDataStore.get<any[]>(STORAGE_KEYS.IN_APP_NOTIFICATIONS) || []
        const remaining = allStored.filter((n) => n.id !== notificationId)
        PrintERPDataStore.set(STORAGE_KEYS.IN_APP_NOTIFICATIONS, remaining)
        setNotifications(remaining)
        showNotification('Alert deleted')
      } catch (err: any) {
        showNotification(err.message || 'Failed to delete alert', 'warning')
      }
    })
  }

  // Handle Tab Switch
  const handleTabChange = (tab: DesignPanelTab) => {
    setActiveTab(tab)
    if (typeof window !== 'undefined') {
      try {
        const url = new URL(window.location.href)
        url.searchParams.set('tab', tab)
        window.history.replaceState(null, '', url.toString())
      } catch {
        const currentQuery = searchParams ? new URLSearchParams(searchParams.toString()) : new URLSearchParams()
        currentQuery.set('tab', tab)
        router.replace(`${pathname}?${currentQuery.toString()}`, { scroll: false })
      }
    }
  }

  // Tenant-scoped jobs
  const tenantJobs = useMemo(() => {
    return (jobs || []).filter((j) => isMatchingCompany(j.company_id))
  }, [jobs, company, slug])

  // Tenant-scoped invoices
  const tenantInvoices = useMemo(() => {
    return (invoices || []).filter((inv) => isMatchingCompany(inv.company_id))
  }, [invoices, company, slug])

  // Tenant-scoped invoice requests
  const tenantRequests = useMemo(() => {
    return (invoiceRequests || []).filter((r) => isMatchingCompany(r.company_id))
  }, [invoiceRequests, company, slug])

  // Tenant-scoped orders / work orders
  const tenantOrders = useMemo(() => {
    return (orders || []).filter((o) => isMatchingCompany(o.company_id))
  }, [orders, company, slug])

  // Tenant-scoped notifications
  const tenantNotifications = useMemo(() => {
    return (notifications || []).filter((n) => isMatchingCompany(n.company_id))
  }, [notifications, company, slug])

  // Comprehensive merged design jobs: saved jobs + synthesized invoiced items
  const allTenantDesignJobs = useMemo(() => {
    const jobMap = new Map<string, DesignJobRecord>()
    const existingByInvAndItem = new Set<string>()
    const existingByInvNumAndTitle = new Set<string>()

    for (const j of tenantJobs) {
      if (!j?.id) continue
      jobMap.set(j.id, j)
      if (j.invoice_id && j.invoice_item_id) existingByInvAndItem.add(`${j.invoice_id}__${j.invoice_item_id}`)
      if (j.invoice_id && j.id) existingByInvAndItem.add(`${j.invoice_id}__${j.id}`)
      if (j.invoice_number && j.title) existingByInvNumAndTitle.add(`${j.invoice_number}__${j.title}`)
    }

    // Synthesize missing invoice line items that require design or design verification
    for (const inv of tenantInvoices) {
      if (!inv || !inv.items || !Array.isArray(inv.items)) continue
      inv.items.forEach((it: any, idx: number) => {
        const isDesignRequired = Boolean(it.design_required || it.workflow_routing === 'design_required')
        const isDesignOk = it.workflow_routing === 'design_ok'
        if (!isDesignRequired && !isDesignOk) return

        const itemTitle = it.item_description || it.item_name || 'Design Artwork'
        const hasExisting =
          (inv.id && it.id && existingByInvAndItem.has(`${inv.id}__${it.id}`)) ||
          (inv.id && it.design_job_id && existingByInvAndItem.has(`${inv.id}__${it.design_job_id}`)) ||
          (inv.invoice_number && existingByInvNumAndTitle.has(`${inv.invoice_number}__${it.item_name}`)) ||
          (inv.invoice_number && existingByInvNumAndTitle.has(`${inv.invoice_number}__${it.item_description}`))

        if (!hasExisting) {
          const synthId = it.design_job_id || `dsn-inv-${inv.id}-${idx}`
          const synthNum = `DSN-${inv.invoice_number ? inv.invoice_number.replace('INV-', '') : '001'}-${String.fromCharCode(65 + idx)}`
          const synthJob: DesignJobRecord = {
            id: synthId,
            company_id: inv.company_id || companyId,
            design_number: synthNum,
            invoice_id: inv.id,
            invoice_number: inv.invoice_number,
            invoice_item_id: it.id || null,
            customer_id: inv.customer_id,
            customer_name: inv.customer_name || 'Walk-in Customer',
            title: itemTitle,
            product_name: it.item_name || null,
            dimensions_spec: it.dimensions_spec || (it.width && it.height ? `${it.width} × ${it.height} ${it.unit || 'ft'}` : null),
            material: it.material || null,
            finishing: it.finishing || null,
            quantity: Number(it.quantity) || 1,
            unit: it.unit || 'pcs',
            designer_name: 'Design Team',
            priority: ((inv as any).priority as any) || 'normal',
            deadline: inv.due_date || new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0],
            status: isDesignOk ? 'approved' : 'received',
            workflow_routing: isDesignOk ? 'design_ok' : 'design_required',
            commercial_status: 'invoice_created',
            intake_source: 'manager_billing',
            customer_approval_required: isDesignRequired,
            is_locked: isDesignOk,
            current_version: 1,
            versions: [
              {
                id: `dv-${inv.id}-${idx}`,
                design_job_id: synthId,
                version_number: 1,
                version_label: isDesignOk ? 'Version 1 (Customer Artwork)' : 'Version 1 (Initial Brief)',
                proof_file_name: isDesignOk ? 'customer_artwork.pdf' : 'artwork_brief.png',
                proof_file_url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
                file_format: 'png',
                uploaded_by_name: inv.created_by_name || 'Billing / Commercial',
                is_approved: isDesignOk,
                created_at: inv.created_at || new Date().toISOString(),
              },
            ],
            created_at: inv.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          jobMap.set(synthId, synthJob)
          existingByInvAndItem.add(`${inv.id}__${synthId}`)
          if (it.id) existingByInvAndItem.add(`${inv.id}__${it.id}`)
          if (inv.invoice_number) existingByInvNumAndTitle.add(`${inv.invoice_number}__${itemTitle}`)
        }
      })
    }

    return Array.from(jobMap.values())
  }, [tenantJobs, tenantInvoices, companyId])

  // Grouped cards: Groups all works/items of the same Invoice or Order into ONE Card
  const groupedDesignCards = useMemo<GroupedDesignCard[]>(() => {
    const groupsMap = new Map<string, GroupedDesignCard>()

    // Pre-index parent entities for O(1) matching
    const invById = new Map<string, InvoiceRecord>()
    const invByNumber = new Map<string, InvoiceRecord>()
    for (const inv of tenantInvoices) {
      if (inv.id) invById.set(inv.id, inv)
      if (inv.invoice_number) invByNumber.set(inv.invoice_number, inv)
    }

    const ordById = new Map<string, SalesOrderRecord>()
    const ordByNumber = new Map<string, SalesOrderRecord>()
    for (const ord of tenantOrders) {
      if (ord.id) ordById.set(ord.id, ord)
      if (ord.order_number) ordByNumber.set(ord.order_number, ord)
    }

    const custById = new Map<string, CustomerRecord>()
    const custByName = new Map<string, CustomerRecord>()
    for (const c of customers) {
      if (c.id) custById.set(c.id, c)
      if (c.name) custByName.set(c.name, c)
    }

    for (const job of allTenantDesignJobs) {
      let groupKey = ''
      let groupType: 'invoice' | 'order' | 'standalone' = 'standalone'

      if (job.invoice_id || job.invoice_number) {
        groupKey = `inv_${job.invoice_id || job.invoice_number}`
        groupType = 'invoice'
      } else if (job.sales_order_id || job.order_number) {
        groupKey = `ord_${job.sales_order_id || job.order_number}`
        groupType = 'order'
      } else {
        groupKey = `job_${job.id}`
        groupType = 'standalone'
      }

      const latestVersion = job.versions?.[job.versions.length - 1]
      const fmt = (latestVersion?.file_format || (latestVersion?.proof_file_name?.split('.').pop() as any) || 'png') as DesignFormat

      const workItem: GroupedDesignWorkItem = {
        id: job.id,
        jobRecord: job,
        design_number: job.design_number,
        title: job.title,
        product_name: job.product_name,
        dimensions_spec: job.dimensions_spec,
        material: job.material,
        finishing: job.finishing,
        quantity: job.quantity,
        unit: job.unit,
        priority: job.priority || 'normal',
        status: job.status,
        workflow_routing: job.workflow_routing,
        commercial_status: job.commercial_status,
        current_version: job.current_version || 1,
        is_locked: job.is_locked,
        customer_approval_required: job.customer_approval_required,
        format: fmt,
        proof_url: latestVersion?.proof_file_url || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=600&q=80',
        proof_file_name: latestVersion?.proof_file_name || `${job.design_number}.${fmt}`,
        designer_name: job.designer_name || 'Designer',
        deadline: job.deadline,
        instructions: job.instructions,
        created_at: job.created_at,
      }

      if (!groupsMap.has(groupKey)) {
        const matchingInv = (job.invoice_id ? invById.get(job.invoice_id) : undefined) || (job.invoice_number ? invByNumber.get(job.invoice_number) : undefined)
        const matchingOrd = (job.sales_order_id ? ordById.get(job.sales_order_id) : undefined) || (job.order_number ? ordByNumber.get(job.order_number) : undefined)
        const cust = (job.customer_id ? custById.get(job.customer_id) : undefined) || (job.customer_name ? custByName.get(job.customer_name) : undefined)

        groupsMap.set(groupKey, {
          groupId: groupKey,
          groupKey,
          groupType,
          invoice_id: job.invoice_id || matchingInv?.id || null,
          invoice_number: job.invoice_number || matchingInv?.invoice_number || null,
          sales_order_id: job.sales_order_id || matchingOrd?.id || null,
          order_number: job.order_number || matchingOrd?.order_number || null,
          customer_id: job.customer_id || matchingInv?.customer_id || matchingOrd?.customer_id || cust?.id || null,
          customer_name: job.customer_name || matchingInv?.customer_name || matchingOrd?.customer_name || 'Walk-in Customer',
          customer_phone: (job as any).customer_phone || matchingInv?.customer_phone || matchingOrd?.customer_phone || cust?.mobile || null,
          customer_email: (job as any).customer_email || matchingInv?.customer_email || matchingOrd?.customer_email || cust?.email || null,
          deadline: job.deadline || matchingInv?.due_date || matchingOrd?.delivery_date || null,
          created_at: job.created_at || matchingInv?.created_at || matchingOrd?.created_at || new Date().toISOString(),
          hasInvoice: Boolean(job.invoice_id || job.invoice_number || matchingInv || job.commercial_status === 'invoice_created'),
          isInvoicePending: job.commercial_status === 'invoice_requested',
          invoice_request_id: job.invoice_request_id || null,
          works: [workItem],
          overallStatus: job.status === 'approved' ? 'all_approved' : job.status === 'customer_approval' ? 'awaiting_approval' : job.status === 'revision' ? 'revisions' : 'in_progress',
          approvedCount: job.status === 'approved' || job.is_locked ? 1 : 0,
          totalWorks: 1,
          highestPriority: job.priority || 'normal',
        })
      } else {
        const group = groupsMap.get(groupKey)!
        group.works.push(workItem)
        group.totalWorks = group.works.length
        group.approvedCount = group.works.filter((w) => w.status === 'approved' || w.is_locked).length
        if (group.approvedCount === group.totalWorks) {
          group.overallStatus = 'all_approved'
        } else if (group.works.some((w) => w.status === 'revision')) {
          group.overallStatus = 'revisions'
        } else if (group.works.some((w) => w.status === 'customer_approval')) {
          group.overallStatus = 'awaiting_approval'
        } else if (group.works.some((w) => w.status === 'designing' || w.status === 'in_progress')) {
          group.overallStatus = 'in_progress'
        } else {
          group.overallStatus = 'received'
        }

        const priorityOrder: Record<DesignPriority, number> = { very_urgent: 3, urgent: 2, normal: 1 }
        if (priorityOrder[workItem.priority] > priorityOrder[group.highestPriority]) {
          group.highestPriority = workItem.priority
        }
      }
    }

    return Array.from(groupsMap.values())
  }, [allTenantDesignJobs, tenantInvoices, tenantOrders, customers])

  // Pre-indexed lookup maps for O(1) production job & work order relationships
  const productionLookups = useMemo(() => {
    const byProdJobId = new Map<string, ProductionJobRecord>()
    const byJobOrderId = new Map<string, ProductionJobRecord>()
    const bySalesOrderId = new Map<string, ProductionJobRecord>()
    const byInvoiceId = new Map<string, ProductionJobRecord>()
    const byInvoiceNumber = new Map<string, ProductionJobRecord>()
    const byCustAndProduct = new Map<string, ProductionJobRecord>()

    for (const pj of productionJobs || []) {
      if (pj.id) byProdJobId.set(pj.id, pj)
      if (pj.job_order_id) byJobOrderId.set(pj.job_order_id, pj)
      if (pj.sales_order_id) bySalesOrderId.set(pj.sales_order_id, pj)
      if ((pj as any).invoice_id) byInvoiceId.set((pj as any).invoice_id, pj)
      if ((pj as any).invoice_number) byInvoiceNumber.set((pj as any).invoice_number, pj)
      if (pj.customer_name && pj.product_name) {
        byCustAndProduct.set(`${pj.customer_name}__${pj.product_name}`, pj)
      }
    }

    const joByJoId = new Map<string, any>()
    const joByDesignJobId = new Map<string, any>()
    const joBySalesOrderId = new Map<string, any>()

    for (const jo of jobOrders || []) {
      if (jo.id) joByJoId.set(jo.id, jo)
      if (jo.design_job_id) joByDesignJobId.set(jo.design_job_id, jo)
      if (jo.order_id) joBySalesOrderId.set(jo.order_id, jo)
    }

    return {
      byProdJobId,
      byJobOrderId,
      bySalesOrderId,
      byInvoiceId,
      byInvoiceNumber,
      byCustAndProduct,
      joByJoId,
      joByDesignJobId,
      joBySalesOrderId,
    }
  }, [productionJobs, jobOrders])

  // Helper: Get linked production info for a work item
  const getLinkedProductionInfo = (work: GroupedDesignWorkItem, card: GroupedDesignCard) => {
    const jobRec = work.jobRecord
    const prodJob =
      ((jobRec as any).production_job_id && productionLookups.byProdJobId.get((jobRec as any).production_job_id)) ||
      (jobRec.job_order_id && productionLookups.byJobOrderId.get(jobRec.job_order_id)) ||
      (jobRec.sales_order_id && productionLookups.bySalesOrderId.get(jobRec.sales_order_id)) ||
      (card.invoice_id && productionLookups.byInvoiceId.get(card.invoice_id)) ||
      (card.invoice_number && productionLookups.byInvoiceNumber.get(card.invoice_number)) ||
      (card.customer_name && work.title && productionLookups.byCustAndProduct.get(`${card.customer_name}__${work.title}`)) ||
      (card.customer_name && work.product_name && productionLookups.byCustAndProduct.get(`${card.customer_name}__${work.product_name}`))

    const jobOrder =
      (jobRec.job_order_id && productionLookups.joByJoId.get(jobRec.job_order_id)) ||
      productionLookups.joByDesignJobId.get(work.id) ||
      (jobRec.sales_order_id && productionLookups.joBySalesOrderId.get(jobRec.sales_order_id))

    const isDesignApproved = work.status === 'approved' || work.is_locked || work.workflow_routing === 'ready_production'

    let status: ProductionJobStatus | 'not_started' = 'not_started'
    if (prodJob?.status) {
      status = prodJob.status
    } else if (jobOrder?.status === 'in_progress') {
      status = 'in_progress'
    } else if (jobOrder?.status === 'completed') {
      status = 'completed'
    } else if (isDesignApproved) {
      status = 'queued'
    }

    return {
      prodJob,
      jobOrder,
      hasJob: Boolean(prodJob || jobOrder || isDesignApproved),
      status,
      isQueued: status === 'queued',
      isInProgress: status === 'in_progress',
      isPaused: status === 'paused',
      isCompleted: status === 'completed',
      pauseReason: (prodJob as any)?.pause_reason || null,
      department: prodJob?.department || 'printing',
      stage: prodJob?.stage || (status === 'queued' ? 'Pre-Press Queued' : status === 'in_progress' ? 'Printing Active' : 'Press Floor'),
    }
  }

  // Operational KPIs
  const kpiStats = useMemo(() => {
    const newTaskCount = allTenantDesignJobs.filter(
      (j) =>
        j.status === 'received' ||
        ((j.workflow_routing === 'design_required' || j.workflow_routing === 'design_ok' || !j.workflow_routing) &&
          j.status !== 'designing' &&
          j.status !== 'in_progress' &&
          j.status !== 'customer_approval' &&
          j.status !== 'approved')
    ).length
    const designRunningCount = allTenantDesignJobs.filter((j) => j.status === 'designing' || j.status === 'in_progress').length
    const waitingApprovalCount = allTenantDesignJobs.filter((j) => j.status === 'customer_approval' || j.status === 'revision').length
    const inProductionCount = allTenantDesignJobs.filter((j) => j.status === 'approved' || j.is_locked || j.workflow_routing === 'ready_production').length

    const newCount = allTenantDesignJobs.filter((j) => j.status === 'received').length
    const designingCount = designRunningCount
    const approvalCount = allTenantDesignJobs.filter((j) => j.status === 'customer_approval').length
    const revisionCount = allTenantDesignJobs.filter((j) => j.status === 'revision').length
    const invoiceRequestedCount = allTenantDesignJobs.filter((j) => j.commercial_status === 'invoice_requested').length
    const approvedCount = allTenantDesignJobs.filter((j) => j.status === 'approved' || j.is_locked).length
    const readyProdCount = inProductionCount

    const designRequestCount = allTenantDesignJobs.filter(
      (j) => j.workflow_routing === 'design_required' || (!j.workflow_routing && j.status !== 'approved')
    ).length
    const designCheckCount = allTenantDesignJobs.filter((j) => j.workflow_routing === 'design_ok').length

    const todayStr = new Date().toISOString().split('T')[0]
    const dueTodayCount = allTenantDesignJobs.filter((j) => j.deadline && j.deadline.startsWith(todayStr)).length

    return {
      newTaskCount,
      designRunningCount,
      waitingApprovalCount,
      inProductionCount,
      newCount,
      designingCount,
      approvalCount,
      revisionCount,
      invoiceRequestedCount,
      approvedCount,
      readyProdCount,
      designRequestCount,
      designCheckCount,
      dueTodayCount,
      totalWorks: allTenantDesignJobs.length,
      totalCards: groupedDesignCards.length,
    }
  }, [allTenantDesignJobs, groupedDesignCards])

  // Helper: Get active selected work for a grouped card
  const getActiveWorkForGroup = (card: GroupedDesignCard): GroupedDesignWorkItem => {
    const selectedId = selectedWorkIdByGroup[card.groupId]
    if (selectedId) {
      const found = card.works.find((w) => w.id === selectedId)
      if (found) return found
    }
    if (activeTab === 'new_tasks') {
      const match = card.works.find(
        (w) =>
          w.workflow_routing === 'design_required' ||
          w.workflow_routing === 'design_ok' ||
          w.status === 'received' ||
          (!w.workflow_routing && w.status !== 'approved')
      )
      if (match) return match
    }
    if (activeTab === 'design_running') {
      const match = card.works.find((w) => w.status === 'designing' || w.status === 'in_progress')
      if (match) return match
    }
    if (activeTab === 'waiting_approval' || activeTab === 'customer_approvals') {
      const match = card.works.find((w) => w.status === 'customer_approval' || w.status === 'revision')
      if (match) return match
    }
    if (activeTab === 'in_production') {
      const match = card.works.find((w) => w.status === 'approved' || w.is_locked || w.workflow_routing === 'ready_production')
      if (match) return match
    }
    if (activeTab === 'design_requests') {
      const match = card.works.find((w) => w.workflow_routing === 'design_required' || (!w.workflow_routing && w.status !== 'approved'))
      if (match) return match
    }
    if (activeTab === 'design_checks') {
      const match = card.works.find((w) => w.workflow_routing === 'design_ok')
      if (match) return match
    }
    return card.works[0]
  }

  // Helper: Ensure a synthesized or unpersisted job record is added to storage before action
  const ensureJobRecord = (work: GroupedDesignWorkItem): DesignJobRecord => {
    const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
    const exists = allStored.find((j) => j.id === work.id || j.design_number === work.design_number)
    if (!exists) {
      const updated = [work.jobRecord, ...allStored]
      PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, updated)
      setJobs(updated)
    }
    return work.jobRecord
  }

  // Filtered grouped cards based on active tab, search, priority, format, and intake source
  const filteredGroupedCards = useMemo(() => {
    return groupedDesignCards.filter((card) => {
      // Search
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase()
        const matchesCard =
          (card.invoice_number && card.invoice_number.toLowerCase().includes(q)) ||
          (card.order_number && card.order_number.toLowerCase().includes(q)) ||
          card.customer_name.toLowerCase().includes(q) ||
          (card.customer_phone && card.customer_phone.toLowerCase().includes(q)) ||
          (card.customer_email && card.customer_email.toLowerCase().includes(q))

        const matchesWork = card.works.some(
          (w) =>
            w.design_number.toLowerCase().includes(q) ||
            w.title.toLowerCase().includes(q) ||
            (w.product_name && w.product_name.toLowerCase().includes(q)) ||
            w.designer_name.toLowerCase().includes(q) ||
            (w.dimensions_spec && w.dimensions_spec.toLowerCase().includes(q)) ||
            (w.instructions && w.instructions.toLowerCase().includes(q))
        )

        if (!matchesCard && !matchesWork) return false
      }

      // My jobs filter
      if (onlyMyJobs) {
        const myName = currentUser?.profile?.full_name || 'Tanvir'
        const hasMyJob = card.works.some((w) => w.designer_name.toLowerCase().includes(myName.toLowerCase()))
        if (!hasMyJob) return false
      }

      // Priority filter
      if (priorityFilter !== 'all') {
        const hasPriority = card.works.some((w) => w.priority === priorityFilter)
        if (!hasPriority) return false
      }

      // Format filter
      if (formatFilter !== 'all') {
        const targetFmt = formatFilter.toLowerCase()
        const hasFormat = card.works.some((w) => {
          if (targetFmt === 'jpg' || targetFmt === 'jpeg') {
            return w.format === 'jpg' || (w.format as any) === 'jpeg'
          }
          return w.format === targetFmt
        })
        if (!hasFormat) return false
      }

      // Intake source filter
      if (intakeFilter !== 'all') {
        const hasIntake = card.works.some((w) => {
          const source = w.jobRecord.intake_source || 'direct_customer'
          return source === intakeFilter
        })
        if (!hasIntake) return false
      }

      // Tab specific constraints
      if (activeTab === 'new_tasks') {
        return card.works.some(
          (w) =>
            w.workflow_routing === 'design_required' ||
            w.workflow_routing === 'design_ok' ||
            w.status === 'received' ||
            (!w.workflow_routing &&
              w.status !== 'designing' &&
              w.status !== 'in_progress' &&
              w.status !== 'customer_approval' &&
              w.status !== 'revision' &&
              w.status !== 'approved')
        )
      }

      if (activeTab === 'design_running') {
        return card.works.some((w) => w.status === 'designing' || w.status === 'in_progress')
      }

      if (activeTab === 'waiting_approval' || activeTab === 'customer_approvals') {
        return card.works.some((w) => w.status === 'customer_approval' || w.status === 'revision')
      }

      if (activeTab === 'in_production') {
        return card.works.some((w) => w.status === 'approved' || w.is_locked || w.workflow_routing === 'ready_production')
      }

      if (activeTab === 'design_requests') {
        return card.works.some((w) => w.workflow_routing === 'design_required' || (!w.workflow_routing && w.status !== 'approved'))
      }

      if (activeTab === 'design_checks') {
        return card.works.some((w) => w.workflow_routing === 'design_ok')
      }

      if (activeTab === 'work_orders') {
        return card.groupType === 'order' || Boolean(card.sales_order_id || card.order_number)
      }

      if (activeTab === 'tasks') {
        return card.works.some((w) => w.status !== 'approved')
      }

      return true
    })
  }, [groupedDesignCards, activeTab, deferredSearch, priorityFilter, formatFilter, intakeFilter, onlyMyJobs, currentUser])

  // Backward compatible flat filtered jobs list
  const filteredJobs = useMemo(() => {
    return filteredGroupedCards.flatMap((c) => c.works.map((w) => w.jobRecord))
  }, [filteredGroupedCards])

  // --- WORKFLOW ACTION HANDLERS FOR TABS 1-4 ---

  // 1. Tab 1 Handler: [Start Design]
  const handleStartDesign = async (workOrJob: GroupedDesignWorkItem | DesignJobRecord) => {
    startTransition(async () => {
      try {
        const job = 'jobRecord' in workOrJob ? ensureJobRecord(workOrJob) : workOrJob
        const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const updated = allStored.map((j) =>
          j.id === job.id || j.design_number === job.design_number
            ? { ...j, status: 'designing' as DesignStatus, updated_at: new Date().toISOString() }
            : j
        )
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, updated)
        setJobs(updated)
        showNotification(`🎨 Started design for #${job.design_number} (${job.title})`, 'success')
      } catch (err: any) {
        showNotification(err.message || 'Failed to start design', 'warning')
      }
    })
  }

  // 2. Tab 2 Handler: [Design Complete]
  const handleDesignComplete = async (work: GroupedDesignWorkItem) => {
    startTransition(async () => {
      try {
        const job = ensureJobRecord(work)
        const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const updated = allStored.map((j) =>
          j.id === job.id || j.design_number === job.design_number
            ? {
                ...j,
                status: 'customer_approval' as DesignStatus,
                customer_approval_required: true,
                updated_at: new Date().toISOString(),
              }
            : j
        )
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, updated)
        setJobs(updated)
        showNotification(`✅ Design completed for #${work.design_number}! Submitted for approval.`, 'success')
      } catch (err: any) {
        showNotification(err.message || 'Failed to complete design', 'warning')
      }
    })
  }

  // 3. Tab 3 Handler: [Design Confirmed send to production]
  const handleDesignConfirmedSendToProduction = async (work: GroupedDesignWorkItem, card: GroupedDesignCard) => {
    startTransition(async () => {
      try {
        const job = ensureJobRecord(work)

        // 1. Mark design approved & locked
        const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const updated = allStored.map((j) =>
          j.id === job.id || j.design_number === job.design_number
            ? {
                ...j,
                status: 'approved' as DesignStatus,
                workflow_routing: 'ready_production' as const,
                is_locked: true,
                approved_by: currentUser?.profile?.full_name || 'Design Team',
                approval_timestamp: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            : j
        )
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, updated)
        setJobs(updated)

        // 2. Call server action
        await sendToPrintOperatorAction(job.id, companyId, {
          ...job,
          status: 'approved',
          workflow_routing: 'ready_production',
          is_locked: true,
        })

        // 3. Ensure production job is recorded in PrintERPDataStore
        const allProdJobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
        const existingProd = allProdJobs.find(
          (pj) =>
            pj.id === (job as any).production_job_id ||
            pj.job_order_id === job.job_order_id ||
            (pj.customer_name === card.customer_name && pj.product_name === work.title)
        )

        if (!existingProd) {
          const newProdJob: any = {
            id: `pj-${Date.now()}`,
            company_id: companyId,
            production_job_number: `PJ-${work.design_number.replace('DSN-', '')}`,
            job_order_id: job.job_order_id || `jo-${Date.now()}`,
            sales_order_id: job.sales_order_id || null,
            customer_name: card.customer_name,
            product_name: work.title,
            department: 'printing',
            stage: 'Pre-Press Approved',
            status: 'queued',
            priority: work.priority || 'normal',
            deadline: job.deadline || card.deadline || new Date(Date.now() + 86400000).toISOString().split('T')[0],
            dimensions_spec: work.dimensions_spec || 'Standard',
            quantity: work.quantity || 1,
            material_spec: [work.material, work.finishing].filter(Boolean).join(' • ') || 'Standard Stock',
            artwork_proof_url: work.proof_url,
            assigned_workers: [],
            has_rework: false,
            rework_count: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }
          PrintERPDataStore.addItem(STORAGE_KEYS.PRODUCTION_JOBS, newProdJob)
          setProductionJobs([newProdJob, ...allProdJobs])
        }

        showNotification(`🚀 Design confirmed for #${work.design_number}! Sent to production queue.`, 'success')
      } catch (err: any) {
        showNotification(err.message || 'Failed to dispatch to production', 'warning')
      }
    })
  }

  // 4. Tab 4 Handlers:
  // 4a. [Pause Production Correction Required]
  const handlePauseProductionCorrection = async (work: GroupedDesignWorkItem, card: GroupedDesignCard) => {
    startTransition(async () => {
      try {
        const job = ensureJobRecord(work)

        // Update production job status to paused
        const allProdJobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
        const updatedProd = allProdJobs.map((pj) => {
          if (
            pj.id === (job as any).production_job_id ||
            pj.job_order_id === job.job_order_id ||
            (pj.customer_name === card.customer_name && pj.product_name === work.title)
          ) {
            return {
              ...pj,
              status: 'paused' as const,
              pause_reason: 'Correction Required from Design',
              stage: 'Paused for Correction',
              updated_at: new Date().toISOString(),
            }
          }
          return pj
        })
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, updatedProd)
        setProductionJobs(updatedProd)

        // Also set design job back to revision so designer can edit
        const allStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
        const updatedJobs = allStored.map((j) =>
          j.id === job.id || j.design_number === job.design_number
            ? { ...j, status: 'revision' as DesignStatus, is_locked: false, updated_at: new Date().toISOString() }
            : j
        )
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, updatedJobs)
        setJobs(updatedJobs)

        showNotification(`⚠️ Production paused for #${work.design_number}. Correction requested.`, 'warning')
      } catch (err: any) {
        showNotification(err.message || 'Failed to pause production', 'warning')
      }
    })
  }

  // 4b. [File Ready Start Production]
  const handleStartProduction = async (work: GroupedDesignWorkItem, card: GroupedDesignCard) => {
    startTransition(async () => {
      try {
        const job = ensureJobRecord(work)

        // Update production job status to in_progress
        const allProdJobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
        const updatedProd = allProdJobs.map((pj) => {
          if (
            pj.id === (job as any).production_job_id ||
            pj.job_order_id === job.job_order_id ||
            (pj.customer_name === card.customer_name && pj.product_name === work.title)
          ) {
            return {
              ...pj,
              status: 'in_progress' as const,
              pause_reason: null,
              stage: 'Printing Active',
              updated_at: new Date().toISOString(),
            }
          }
          return pj
        })
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, updatedProd)
        setProductionJobs(updatedProd)

        showNotification(`▶️ File verified! Production started for #${work.design_number}.`, 'success')
      } catch (err: any) {
        showNotification(err.message || 'Failed to start production', 'warning')
      }
    })
  }

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

      if (targetStatus === 'approved') {
        try {
          await sendToPrintOperatorAction(job.id, companyId)
        } catch {}
      }

      showNotification(`Job #${job.design_number} moved to ${targetStatus.replace('_', ' ')}!`)
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
    const lastFmt = job.versions?.[job.versions.length - 1]?.file_format
    const latestFormat: DesignFormat = lastFmt === 'jpg' ? 'jpg' : 'png'
    setUploadFileName(`proof_${job.design_number.toLowerCase()}_v${nextVer}.${latestFormat}`)
    setUploadFormat(latestFormat)
    setUploadProofUrl('')
    setUploadNotes(`Revision v${nextVer} adjustments per client review.`)
    setIsUploadModalOpen(true)
  }

  const handleSaveUploadVersion = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJob) return

    startTransition(async () => {
      try {
        const nextVer = (selectedJob.current_version || 1) + 1
        const proofUrl = uploadProofUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
        const fileName = uploadFileName || `proof_v${nextVer}.${uploadFormat}`

        const res = await addDesignVersionAction(
          {
            designJobId: selectedJob.id,
            versionNumber: nextVer,
            fileName: fileName,
            fileUrl: proofUrl,
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
          proof_file_url: proofUrl,
          proof_file_name: fileName,
          source_file_name: fileName,
          file_format: uploadFormat,
          file_size_bytes: 4500000,
          change_notes: uploadNotes || `Version ${nextVer} adjustments`,
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
        setUploadProofUrl('')
        setUploadFileName('')
        setUploadNotes('')
        showNotification(`Version v${nextVer} uploaded for #${selectedJob.design_number}!`, 'success')
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

        // Set all preflight checks verified on release
        setPreflightState((prev) => ({
          ...prev,
          [prepressJob.id]: { cmyk: true, dpi300: true, bleed: true, curves: true },
        }))

        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, prepressJob.id, {
          status: 'approved',
          workflow_routing: 'ready_production',
          is_locked: true,
          updated_at: new Date().toISOString(),
        })

        // Also ensure production job has target machine stage
        const allProdJobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
        const updatedProd = allProdJobs.map((pj) => {
          if (
            pj.id === (prepressJob as any).production_job_id ||
            (pj.customer_name === prepressJob.customer_name && pj.product_name === prepressJob.title)
          ) {
            return {
              ...pj,
              stage: `Pre-Press Approved (${machineObj?.name})`,
              updated_at: new Date().toISOString(),
            }
          }
          return pj
        })
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, updatedProd)
        setProductionJobs(updatedProd)

        setPrepressJob(null)
        showNotification(`Job #${prepressJob.design_number} authorized & routed to ${machineObj?.name}!`, 'success')
      } catch (err: any) {
        showNotification(err.message || 'Print dispatch error', 'warning')
      }
    })
  }

  const handlePrepressVerifyAndRelease = async (job: DesignJobRecord) => {
    startTransition(async () => {
      try {
        const res = await sendToPrintOperatorAction(job.id, companyId)
        if (!res.success) {
          showNotification(res.error || 'Failed to dispatch to print operator', 'warning')
          return
        }
        setPreflightState((prev) => ({
          ...prev,
          [job.id]: { cmyk: true, dpi300: true, bleed: true, curves: true },
        }))
        const updatedJob: DesignJobRecord = {
          ...job,
          status: 'approved',
          workflow_routing: 'ready_production',
          is_locked: true,
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updatedJob)
        showNotification(`Artwork #${job.design_number} verified & released to Production Floor!`)
      } catch (err: any) {
        showNotification(err.message || 'Dispatch error', 'warning')
      }
    })
  }

  const handleOpenWhatsApp = (job: DesignJobRecord, defaultTpl: 'proof' | 'reminder' | 'production' | 'revision' = 'proof') => {
    const cust = customers.find((c) => c.id === job.customer_id || c.name === job.customer_name)
    setWhatsAppJob(job)
    const rawPhone = cust?.mobile || (job as any).customer_phone || '01711000000'
    setWhatsAppPhone(rawPhone)
    setWhatsAppTemplate(defaultTpl)
    setWhatsAppCopied(false)
    const generated = handleGenerateWhatsAppText(job, defaultTpl, rawPhone)
    setWhatsAppEditableText(generated)
  }

  const handleGenerateWhatsAppText = (
    job: DesignJobRecord,
    tpl: 'proof' | 'reminder' | 'production' | 'revision' = whatsAppTemplate,
    phoneStr?: string
  ) => {
    const latestVersion = job.versions?.[job.versions.length - 1]
    const proofUrl = latestVersion?.proof_file_url || 'https://inkflow-erp.vercel.app/proof'
    const companyName = company?.name || 'Classic Print & Signage'
    const custName = job.customer_name || 'Valued Customer'
    const jobNum = job.design_number
    const jobTitle = job.title
    const dims = job.dimensions_spec || 'Standard Spec'
    const verNum = job.current_version || 1
    const machineObj = PRINT_MACHINERY_LIST.find((m) => m.id === selectedMachine)
    const machineName = machineObj?.name || 'High-Speed Commercial Press'
    const invNum = job.invoice_number ? `#${job.invoice_number}` : `(Job #${jobNum})`

    if (tpl === 'reminder') {
      return `আসসালামু আলাইকুম / নমস্কার ${custName},\n\nআপনার *${jobTitle}* (জব নং: #${jobNum}) এর ডিজাইন প্রুফটি পূর্বে পাঠানো হয়েছিল।\n\n⏰ সময়মতো প্রিন্ট ও ডেলিভারি সম্পন্ন করার জন্য অনুগ্রহ করে ডিজাইনটি দ্রুত দেখে অনুমোদন (Approve) করুন অথবা কোনো পরিবর্তন থাকলে জানান।\n\n🖼️ প্রুফ লিংক: ${proofUrl}\n\nধন্যবাদ,\n${companyName}`
    }

    if (tpl === 'production') {
      return `আসসালামু আলাইকুম / নমস্কার ${custName},\n\nখুশির সংবাদ! আপনার *${jobTitle}* (জব নং: #${jobNum}, ইনভয়েস: ${invNum}) এর অনুমোদিত ডিজাইনটি সফলভাবে প্রিন্ট প্রোডাকশন ফ্লোরে পাঠানো হয়েছে।\n\n🖨️ মেশিন ডিপার্টমেন্ট: ${machineName}\n📐 সাইজ: ${dims}\n\nকাজটি প্রস্তুত হওয়া মাত্রই ডেলিভারি নোটিফিকেশন পাবেন ইনশাআল্লাহ।\n\nধন্যবাদ,\n${companyName}`
    }

    if (tpl === 'revision') {
      return `আসসালামু আলাইকুম / নমস্কার ${custName},\n\nআপনার নির্দেশনা মোতাবেক *${jobTitle}* (জব নং: #${jobNum}) এর ডিজাইন সংশোধন করে নতুন ভার্সন (v${verNum}) প্রস্তুত করা হয়েছে।\n\n📐 সাইজ: ${dims}\n🖼️ সংশোধিত প্রুফ লিংক: ${proofUrl}\n\nদয়া করে বানান, নম্বর ও সাইজ চেক করে দ্রুত কনফার্ম করুন।\n\nধন্যবাদ,\n${companyName}`
    }

    // Default: 'proof' (with standard BD Printing legal disclaimer clause)
    return `আসসালামু আলাইকুম / নমস্কার ${custName},\n\n${companyName}-এর পক্ষ থেকে আপনার *${jobTitle}* (জব নং: #${jobNum}) এর ডিজিটাল আর্টওয়ার্ক প্রুফ তৈরি হয়েছে।\n\n📐 সাইজ: ${dims}\n📄 ভার্সন: v${verNum}\n🖼️ ডিজিটাল প্রুফ দেখুন: ${proofUrl}\n\n⚠️ *বিশেষ সতর্কবার্তা / দায়িত্ব:* \nদয়া করে বানান (Spelling), মোবাইল নম্বর, সাইজ এবং কালার ভালো করে দেখে নিশ্চিত করুন। অনুমোদনের পর কোনো ভুল থাকলে তার দায়ভার সম্পূর্ণ গ্রাহকের।\n\nসব ঠিক থাকলে *APPROVED* লিখে রিপ্লাই দিন অথবা কোনো পরিবর্তন প্রয়োজন হলে জানান।\n\nধন্যবাদ,\n${companyName}`
  }

  const handleCopyWhatsApp = (job: DesignJobRecord) => {
    const text = whatsAppEditableText || handleGenerateWhatsAppText(job, whatsAppTemplate)
    navigator.clipboard.writeText(text)
    setWhatsAppCopied(true)
    setTimeout(() => setWhatsAppCopied(false), 3000)
    showNotification('WhatsApp message copied to clipboard!')
  }

  const handleSendWhatsAppWeb = (job: DesignJobRecord) => {
    const text = encodeURIComponent(whatsAppEditableText || handleGenerateWhatsAppText(job, whatsAppTemplate))
    let cleanPhone = whatsAppPhone.replace(/[^0-9]/g, '')
    if (cleanPhone.startsWith('0')) {
      cleanPhone = `88${cleanPhone}`
    } else if (!cleanPhone.startsWith('88')) {
      cleanPhone = `880${cleanPhone}`
    }
    window.open(`https://wa.me/${cleanPhone}?text=${text}`, '_blank')
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
    const proofUrl = newJobProofUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80'
    const fileName = newJobFileName || `initial_brief.${newJobFormat}`

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
          proof_file_url: proofUrl,
          proof_file_name: fileName,
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
    setNewJobProofUrl('')
    setNewJobFileName('')
    showNotification(`Design Job #${dsnNumber} assigned to your workbench!`, 'success')
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
          onClick={() => handleTabChange('new_tasks')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'new_tasks' || activeTab === 'design_requests' || activeTab === 'design_checks' ? 'ring-2 ring-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 shadow-xs' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>1. New Tasks</span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{kpiStats.newTaskCount}</div>
          <div className="text-[10px] text-indigo-600 font-medium mt-0.5">Needs design / verify</div>
        </Card>

        <Card
          onClick={() => handleTabChange('design_running')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'design_running' ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30 shadow-xs' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>2. Running</span>
            <Palette className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1">{kpiStats.designRunningCount}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">Active on artboard</div>
        </Card>

        <Card
          onClick={() => handleTabChange('waiting_approval')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'waiting_approval' || activeTab === 'customer_approvals' ? 'ring-2 ring-purple-500 bg-purple-50/50 dark:bg-purple-950/30 shadow-xs' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>3. Approval</span>
            <Clock className="h-3.5 w-3.5 text-purple-500" />
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 mt-1">{kpiStats.waitingApprovalCount}</div>
          <div className="text-[10px] text-purple-600 font-medium mt-0.5">Awaiting customer/mgr</div>
        </Card>

        <Card
          onClick={() => handleTabChange('in_production')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'in_production' ? 'ring-2 ring-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 shadow-xs' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>4. In Production</span>
            <Printer className="h-3.5 w-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{kpiStats.inProductionCount}</div>
          <div className="text-[10px] text-emerald-600 font-medium mt-0.5">On press floor</div>
        </Card>

        <Card
          onClick={() => handleTabChange('all')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'all' || activeTab === 'pipeline' ? 'ring-1 ring-slate-500/50 bg-slate-50 dark:bg-slate-800/40' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>All Works</span>
            <LayoutGrid className="h-3.5 w-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{allTenantDesignJobs.length}</div>
          <div className="text-[10px] text-slate-500 font-medium mt-0.5">Total artboards</div>
        </Card>

        <Card
          onClick={() => handleTabChange('all')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'all' && kpiStats.invoiceRequestedCount > 0 ? 'ring-1 ring-amber-500/50 bg-amber-50/30 dark:bg-amber-950/20' : ''
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
          onClick={() => handleTabChange('work_orders')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'work_orders' ? 'ring-2 ring-blue-500 bg-blue-50/50 dark:bg-blue-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Work Orders</span>
            <Layers className="h-3.5 w-3.5 text-blue-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{tenantOrders.length}</div>
          <div className="text-[10px] text-blue-600 font-medium mt-0.5">Intake linked</div>
        </Card>

        <Card
          onClick={() => handleTabChange('tasks')}
          className={cn(
            'p-3 cursor-pointer transition-all hover:scale-[1.02] border-slate-200 dark:border-slate-800',
            activeTab === 'tasks' ? 'ring-2 ring-red-500 bg-red-50/50 dark:bg-red-950/30' : ''
          )}
        >
          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Due Today</span>
            <AlertCircle className="h-3.5 w-3.5 text-red-500" />
          </div>
          <div className="text-xl font-black text-red-600 dark:text-red-400 mt-1">{kpiStats.dueTodayCount}</div>
          <div className="text-[10px] text-red-600 font-medium mt-0.5">Urgent deadlines</div>
        </Card>
      </div>

      {/* 3. UNIFIED STUDIO NAVIGATION TABS (FULL-WIDTH SCROLLABLE) */}
      <div className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xs rounded-t-xl px-1 pt-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-bold scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-700">
          {/* TAB 1: New Task */}
          <button
            onClick={() => handleTabChange('new_tasks')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'new_tasks' || activeTab === 'design_requests' || activeTab === 'design_checks'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{tBilingual('1. New Task', '১. নতুন টাস্ক')}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
              {kpiStats.newTaskCount}
            </Badge>
          </button>

          {/* TAB 2: Design running */}
          <button
            onClick={() => handleTabChange('design_running')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'design_running'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <Palette className="h-4 w-4 shrink-0 text-blue-500" />
            <span>{tBilingual('2. Design running', '২. ডিজাইন চলছে')}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {kpiStats.designRunningCount}
            </Badge>
          </button>

          {/* TAB 3: Waiting for approval */}
          <button
            onClick={() => handleTabChange('waiting_approval')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'waiting_approval' || activeTab === 'customer_approvals'
                ? 'border-purple-600 text-purple-600 dark:text-purple-400 bg-purple-50/70 dark:bg-purple-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <CheckSquare className="h-4 w-4 shrink-0 text-purple-500" />
            <span>{tBilingual('3. Waiting for approval', '৩. অনুমোদনের অপেক্ষায়')}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
              {kpiStats.waitingApprovalCount}
            </Badge>
          </button>

          {/* TAB 4: In Production */}
          <button
            onClick={() => handleTabChange('in_production')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'in_production'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <Printer className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{tBilingual('4. In Production', '৪. প্রোডাকশনে')}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
              {kpiStats.inProductionCount}
            </Badge>
          </button>

          {/* All */}
          <button
            onClick={() => handleTabChange('all')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'all' || activeTab === 'pipeline'
                ? 'border-slate-800 dark:border-slate-200 text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <LayoutGrid className="h-4 w-4 shrink-0" />
            <span>{tBilingual('All', 'সকল')}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {allTenantDesignJobs.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('work_orders')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'work_orders'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <Layers className="h-4 w-4 shrink-0 text-blue-500" />
            <span>{tBilingual('Work Orders', 'ওয়ার্ক অর্ডার')}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
              {tenantOrders.length}
            </Badge>
          </button>

          <button
            onClick={() => handleTabChange('design_versions')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'design_versions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <History className="h-4 w-4 shrink-0 text-indigo-500" />
            <span>{tBilingual('Artwork Assets', 'আর্টওয়ার্ক ফাইল')}</span>
          </button>

          <button
            onClick={() => handleTabChange('tasks')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'tasks'
                ? 'border-rose-600 text-rose-600 dark:text-rose-400 bg-rose-50/70 dark:bg-rose-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <FileCode className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{tBilingual('Pre-Press Tasks', 'প্রি-প্রেস টাস্ক')}</span>
            {kpiStats.dueTodayCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-rose-100 dark:bg-rose-900 text-rose-700 dark:text-rose-300">
                {kpiStats.dueTodayCount}
              </Badge>
            )}
          </button>

          <button
            onClick={() => handleTabChange('overview')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'overview'
                ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 bg-emerald-50/70 dark:bg-emerald-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <Sparkles className="h-4 w-4 shrink-0 text-emerald-500" />
            <span>{tBilingual('Studio Overview', 'ওভারভিউ')}</span>
          </button>

          <button
            onClick={() => handleTabChange('notifications')}
            className={cn(
              'px-3.5 py-2 rounded-lg transition-all border-b-2 whitespace-nowrap cursor-pointer flex items-center gap-1.5 shrink-0 select-none text-xs font-bold',
              activeTab === 'notifications'
                ? 'border-red-600 text-red-600 dark:text-red-400 bg-red-50/70 dark:bg-red-950/40 shadow-xs'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
            )}
          >
            <Bell className="h-4 w-4 shrink-0 text-red-500" />
            <span>{tBilingual('Alerts', 'নোটিফিকেশন')}</span>
            {tenantNotifications.length > 0 && (
              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-red-600 text-white animate-pulse">
                {tenantNotifications.length}
              </Badge>
            )}
          </button>
        </div>
      </div>

      {/* 4. SEARCH & MULTI-FILTERS TOOLBAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-2.5 px-2 bg-slate-50/70 dark:bg-slate-900/40 rounded-b-xl border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
          <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <Input
            placeholder="Search job #, client, title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-xs h-8 pl-8 pr-7 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Formats</option>
            <option value="png">.PNG (Raster Image)</option>
            <option value="jpg">.JPG / .JPEG</option>
            <option value="ai">.AI (Illustrator)</option>
            <option value="psd">.PSD (Photoshop)</option>
            <option value="cdr">.CDR (CorelDraw)</option>
            <option value="pdf">.PDF (Print Ready)</option>
            <option value="svg">.SVG (Vector)</option>
          </select>

          <select
            value={intakeFilter}
            onChange={(e) => setIntakeFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Intakes</option>
            <option value="direct_customer">Direct Walk-in</option>
            <option value="manager_billing">Manager Billing</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium text-slate-700 dark:text-slate-300 shadow-2xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 cursor-pointer"
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
            className="text-xs h-8 px-2.5 border-slate-200 dark:border-slate-700 shadow-2xs cursor-pointer font-medium"
          >
            <User className="h-3.5 w-3.5 mr-1" />
            {onlyMyJobs ? 'My Jobs Only' : 'My Jobs'}
          </Button>

          {(search || formatFilter !== 'all' || intakeFilter !== 'all' || priorityFilter !== 'all' || onlyMyJobs) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSearch('')
                setFormatFilter('all')
                setIntakeFilter('all')
                setPriorityFilter('all')
                setOnlyMyJobs(false)
              }}
              className="text-xs h-8 px-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="h-3 w-3 mr-1" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* =========================================================================
          VIEW MODES: CARDS GRID & TABLE VIEW
         ========================================================================= */}
      <div className="space-y-4">
        {/* Main Grid / Table of Jobs */}
        {activeTab !== 'overview' && activeTab !== 'notifications' && (
            <>
              {viewMode === 'table' ? (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-semibold border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Invoice / Project #</th>
                        <th className="py-3 px-4">Customer</th>
                        <th className="py-3 px-4">Works in Invoice (কাজসমূহ)</th>
                        <th className="py-3 px-4">Priority</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Commercial Gate</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredGroupedCards.map((card) => {
                        const activeWork = getActiveWorkForGroup(card)
                        const format = activeWork.format || 'png'
                        const hasInvoice = card.hasInvoice
                        const isInvoicePending = card.isInvoicePending
                        const prodInfo = getLinkedProductionInfo(activeWork, card)
                        const isWalkIn = Boolean(
                          card.customer_name.toLowerCase().includes('walk-in') ||
                          card.customer_name.toLowerCase().includes('দোকান') ||
                          activeWork.jobRecord.intake_source === 'direct_customer'
                        )
                        const isDueToday = Boolean(
                          card.deadline && card.deadline.startsWith(new Date().toISOString().split('T')[0])
                        )
                        const pf = getPreflightStatus(activeWork.id, activeWork.status)

                        return (
                          <tr key={card.groupId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4">
                              <div className="space-y-1">
                                <div className="font-mono font-bold text-pink-600 dark:text-pink-400 flex items-center gap-1.5">
                                  {card.invoice_number ? (
                                    <span>#{card.invoice_number}</span>
                                  ) : card.order_number ? (
                                    <span>#{card.order_number}</span>
                                  ) : (
                                    <span>#{activeWork.design_number}</span>
                                  )}
                                  <Badge variant="outline" className={cn(
                                    "text-[9px] px-1.5 py-0 font-bold",
                                    card.works.length > 1 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-slate-100 text-slate-600"
                                  )}>
                                    {card.works.length} {card.works.length > 1 ? 'Works' : 'Work'}
                                  </Badge>
                                </div>
                                {card.order_number && card.invoice_number && (
                                  <div className="text-[10px] font-mono text-slate-400">
                                    WO: #{card.order_number}
                                  </div>
                                )}
                                {isDueToday && (
                                  <Badge className="bg-rose-600 text-white text-[8px] font-bold px-1 py-0 animate-pulse">
                                    আজকের ডেলিভারি
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                <span>{card.customer_name}</span>
                                {isWalkIn && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-100 text-amber-800 font-bold">
                                    দোকানে বসা
                                  </span>
                                )}
                              </div>
                              {card.customer_phone && (
                                <div className="text-[10px] font-mono text-slate-400">{card.customer_phone}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="space-y-1.5 max-w-md">
                                <div className="flex items-center gap-2">
                                  <div
                                    onClick={() => {
                                      ensureJobRecord(activeWork)
                                      handleOpenLightbox(activeWork.jobRecord)
                                    }}
                                    className="h-9 w-9 rounded-md overflow-hidden bg-slate-950 shrink-0 border border-slate-200 dark:border-slate-800 cursor-pointer group"
                                  >
                                    <img
                                      src={activeWork.proof_url}
                                      alt={activeWork.title}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                                    />
                                  </div>
                                  <div className="truncate flex-1">
                                    <div className="font-bold text-slate-900 dark:text-slate-100 line-clamp-1 flex items-center gap-1">
                                      <span>{activeWork.title}</span>
                                      <span className={`uppercase text-[8px] font-black px-1 rounded border ${getFormatBadgeColor(format)}`}>
                                        .{format}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-500">v{activeWork.current_version}</span>
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">{activeWork.dimensions_spec || 'Standard Specs'}</div>
                                  </div>
                                </div>

                                {/* Pre-Press Quality Mini Strip */}
                                <div className="flex items-center gap-1 text-[9px] pt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePreflight(activeWork.id, 'cmyk', activeWork.design_number)}
                                    className={cn(
                                      "px-1 py-0.2 rounded font-mono font-bold border transition-colors",
                                      pf.cmyk ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200"
                                    )}
                                  >
                                    {pf.cmyk ? '✓' : '✗'} CMYK
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePreflight(activeWork.id, 'dpi300', activeWork.design_number)}
                                    className={cn(
                                      "px-1 py-0.2 rounded font-mono font-bold border transition-colors",
                                      pf.dpi300 ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200"
                                    )}
                                  >
                                    {pf.dpi300 ? '✓' : '✗'} 300DPI
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePreflight(activeWork.id, 'bleed', activeWork.design_number)}
                                    className={cn(
                                      "px-1 py-0.2 rounded font-mono font-bold border transition-colors",
                                      pf.bleed ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200"
                                    )}
                                  >
                                    {pf.bleed ? '✓' : '✗'} Bleed
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleTogglePreflight(activeWork.id, 'curves', activeWork.design_number)}
                                    className={cn(
                                      "px-1 py-0.2 rounded font-mono font-bold border transition-colors",
                                      pf.curves ? "bg-emerald-50 text-emerald-700 border-emerald-300" : "bg-slate-100 text-slate-400 border-slate-200"
                                    )}
                                  >
                                    {pf.curves ? '✓' : '✗'} Curves
                                  </button>
                                </div>

                                {card.works.length > 1 && (
                                  <div className="flex flex-wrap gap-1 pt-0.5">
                                    {card.works.map((w, wIdx) => {
                                      const isSelected = w.id === activeWork.id
                                      return (
                                        <button
                                          key={w.id}
                                          onClick={() => setSelectedWorkIdByGroup((prev) => ({ ...prev, [card.groupId]: w.id }))}
                                          className={cn(
                                            "text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 transition-all cursor-pointer",
                                            isSelected
                                              ? "bg-pink-600 text-white border-pink-600 font-bold shadow-2xs"
                                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-pink-300"
                                          )}
                                        >
                                          <span>#{wIdx + 1} {w.title.slice(0, 14)}...</span>
                                          {w.status === 'approved' || w.is_locked ? (
                                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                                          ) : null}
                                        </button>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="capitalize text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                {card.highestPriority}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              {activeTab === 'in_production' || activeWork.status === 'approved' || activeWork.workflow_routing === 'ready_production' ? (
                                <div>
                                  {prodInfo.isQueued ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-300 inline-flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> Prod: Queued
                                    </span>
                                  ) : prodInfo.isInProgress ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-300 inline-flex items-center gap-1 animate-pulse">
                                      <Printer className="h-3 w-3" /> Printing
                                    </span>
                                  ) : prodInfo.isPaused ? (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950 dark:text-rose-300 inline-flex items-center gap-1">
                                      <AlertTriangle className="h-3 w-3" /> Paused
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                                      <CheckCircle2 className="h-3 w-3" /> Approved
                                    </span>
                                  )}
                                </div>
                              ) : card.overallStatus === 'all_approved' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 inline-flex items-center gap-1">
                                  <CheckCircle2 className="h-3 w-3" /> All Approved
                                </span>
                              ) : card.works.length > 1 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300 inline-block">
                                  {card.approvedCount}/{card.totalWorks} Approved
                                </span>
                              ) : (
                                <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
                                  {activeWork.status.replace('_', ' ')}
                                </span>
                              )}
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
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* TAB 1 Action: [Start Design] */}
                                {(activeTab === 'new_tasks' ||
                                  activeWork.status === 'received' ||
                                  ((activeWork.workflow_routing === 'design_required' || activeWork.workflow_routing === 'design_ok') &&
                                    activeWork.status !== 'designing' &&
                                    activeWork.status !== 'in_progress' &&
                                    activeWork.status !== 'customer_approval' &&
                                    activeWork.status !== 'approved')) && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartDesign(activeWork)}
                                    disabled={isPending}
                                    className="h-7 text-xs px-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                                    title="Start Design"
                                  >
                                    <Palette className="h-3 w-3" />
                                    <span>Start Design</span>
                                  </Button>
                                )}

                                {/* TAB 2 Action: [Design Complete] */}
                                {(activeTab === 'design_running' ||
                                  activeWork.status === 'designing' ||
                                  activeWork.status === 'in_progress') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleDesignComplete(activeWork)}
                                    disabled={isPending}
                                    className="h-7 text-xs px-2 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                                    title="Design Complete"
                                  >
                                    <CheckCircle2 className="h-3 w-3" />
                                    <span>Design Complete</span>
                                  </Button>
                                )}

                                {/* TAB 3 Action: [Design Confirmed send to production] */}
                                {(activeTab === 'waiting_approval' ||
                                  activeTab === 'customer_approvals' ||
                                  activeWork.status === 'customer_approval' ||
                                  activeWork.status === 'revision') && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleDesignConfirmedSendToProduction(activeWork, card)}
                                    disabled={isPending}
                                    className="h-7 text-xs px-2 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                                    title="Design Confirmed send to production"
                                  >
                                    <Send className="h-3 w-3" />
                                    <span>Send Production</span>
                                  </Button>
                                )}

                                {/* TAB 4 Actions: [Pause Production Correction Required] / [File Ready Start Production] */}
                                {(activeTab === 'in_production' ||
                                  activeWork.status === 'approved' ||
                                  activeWork.workflow_routing === 'ready_production') && (
                                  <>
                                    {prodInfo.isQueued ? (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handlePauseProductionCorrection(activeWork, card)}
                                          disabled={isPending}
                                          className="h-7 text-xs px-2 border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 font-bold gap-1 cursor-pointer"
                                          title="Pause Production Correction Required"
                                        >
                                          <AlertTriangle className="h-3 w-3 text-amber-600" />
                                          <span>Pause Correction</span>
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => handleStartProduction(activeWork, card)}
                                          disabled={isPending}
                                          className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 cursor-pointer shadow-2xs"
                                          title="File Ready Start Production"
                                        >
                                          <Printer className="h-3 w-3" />
                                          <span>Start Prod</span>
                                        </Button>
                                      </>
                                    ) : prodInfo.isPaused ? (
                                      <Button
                                        size="sm"
                                        onClick={() => handleStartProduction(activeWork, card)}
                                        disabled={isPending}
                                        className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 cursor-pointer shadow-2xs"
                                        title="File Ready Start Production"
                                      >
                                        <RotateCcw className="h-3 w-3" />
                                        <span>Start Prod</span>
                                      </Button>
                                    ) : (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handlePauseProductionCorrection(activeWork, card)}
                                        disabled={isPending}
                                        className="h-7 text-xs px-2 border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 font-bold gap-1 cursor-pointer"
                                        title="Pause Production Correction Required"
                                      >
                                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                                        <span>Pause Correction</span>
                                      </Button>
                                    )}
                                  </>
                                )}

                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const j = ensureJobRecord(activeWork)
                                    handleOpenWhatsApp(j, activeWork.status === 'revision' ? 'revision' : activeWork.status === 'customer_approval' ? 'reminder' : 'proof')
                                  }}
                                  className="h-7 w-7 p-0 text-emerald-600 hover:bg-emerald-50"
                                  title="WhatsApp Dispatcher"
                                >
                                  <Phone className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const j = ensureJobRecord(activeWork)
                                    handleOpenUploadModal(j)
                                  }}
                                  className="h-7 w-7 p-0 text-slate-600 hover:bg-slate-100"
                                  title="Upload Version"
                                >
                                  <Upload className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteJob(activeWork.id)}
                                  className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                                  title="Delete Job"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                                <Link
                                  href={getTenantHref(`/design/${activeWork.id}`)}
                                  onClick={() => ensureJobRecord(activeWork)}
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
                  {filteredGroupedCards.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-xs">
                      No design jobs or invoices found in pipeline.
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredGroupedCards.map((card) => {
                    const activeWork = getActiveWorkForGroup(card)
                    const format = activeWork.format || 'png'
                    const hasInvoice = card.hasInvoice
                    const isInvoicePending = card.isInvoicePending
                    const prodInfo = getLinkedProductionInfo(activeWork, card)

                    return (
                      <Card
                        key={card.groupId}
                        className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xs hover:shadow-lg transition-all rounded-2xl overflow-hidden flex flex-col justify-between"
                      >
                        {/* Top Accent Header Bar: Invoice / Project Number, Works Counter, and Status */}
                        <div className="p-3.5 bg-slate-50/90 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-2.5">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {card.invoice_number ? (
                                <Badge className="bg-pink-100 hover:bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300 border-pink-300 font-mono font-black text-xs gap-1 py-0.5 shadow-2xs">
                                  <Receipt className="h-3 w-3" />
                                  <span>#{card.invoice_number}</span>
                                </Badge>
                              ) : card.order_number ? (
                                <Badge className="bg-blue-100 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 font-mono font-black text-xs gap-1 py-0.5 shadow-2xs">
                                  <Layers className="h-3 w-3" />
                                  <span>#{card.order_number}</span>
                                </Badge>
                              ) : (
                                <Badge className="bg-slate-100 hover:bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 font-mono font-black text-xs gap-1 py-0.5 shadow-2xs">
                                  <Palette className="h-3 w-3" />
                                  <span>#{activeWork.design_number}</span>
                                </Badge>
                              )}

                              {card.order_number && card.invoice_number && (
                                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                                  (WO: #{card.order_number})
                                </span>
                              )}

                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] font-bold px-2 py-0.5',
                                  card.works.length > 1
                                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                )}
                              >
                                {card.works.length}{' '}
                                {card.works.length > 1 ? tBilingual('Works (কাজ)', 'কাজ') : tBilingual('Work (কাজ)', 'কাজ')}
                              </Badge>

                              {/* Bangladeshi Context: Walk-in Client & Due Today badges */}
                              {Boolean(
                                card.customer_name.toLowerCase().includes('walk-in') ||
                                card.customer_name.toLowerCase().includes('দোকান') ||
                                activeWork.jobRecord.intake_source === 'direct_customer'
                              ) && (
                                <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[9px] font-bold py-0">
                                  দোকানে বসা কাস্টমার
                                </Badge>
                              )}

                              {Boolean(
                                card.deadline && card.deadline.startsWith(new Date().toISOString().split('T')[0])
                              ) && (
                                <Badge className="bg-rose-600 text-white text-[9px] font-black py-0 px-1.5 animate-pulse">
                                  আজকের ডেলিভারি
                                </Badge>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-0.5">
                              <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug">
                                {card.customer_name}
                              </h3>
                              {card.customer_phone && (
                                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                  • {card.customer_phone}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {card.overallStatus === 'all_approved' ? (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-bold gap-1 shadow-2xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>All Approved</span>
                              </Badge>
                            ) : card.overallStatus === 'awaiting_approval' ? (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300 text-[10px] font-bold gap-1 shadow-2xs">
                                <Clock className="h-3 w-3" />
                                <span>{card.approvedCount}/{card.totalWorks} Approved</span>
                              </Badge>
                            ) : card.overallStatus === 'revisions' ? (
                              <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950 dark:text-rose-300 text-[10px] font-bold gap-1 shadow-2xs">
                                <Flame className="h-3 w-3" />
                                <span>Revision Req</span>
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 text-[10px] font-bold shadow-2xs">
                                {card.works.length > 1
                                  ? `${card.approvedCount}/${card.totalWorks} Ready`
                                  : activeWork.status.replace('_', ' ')}
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDeleteJob(activeWork.id)}
                              className="h-6 w-6 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                              title="Delete Job"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {/* Multi-work Pill Switcher (Rendered if invoice has multiple works) */}
                        {card.works.length > 1 && (
                          <div className="px-3.5 pt-2.5 pb-1 bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                              {card.works.map((work, wIdx) => {
                                const isSelected = work.id === activeWork.id
                                return (
                                  <button
                                    key={work.id}
                                    onClick={() =>
                                      setSelectedWorkIdByGroup((prev) => ({ ...prev, [card.groupId]: work.id }))
                                    }
                                    className={cn(
                                      'px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border cursor-pointer shrink-0 select-none',
                                      isSelected
                                        ? 'bg-pink-600 text-white border-pink-600 shadow-2xs font-bold'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-pink-300'
                                    )}
                                  >
                                    <span
                                      className={cn(
                                        'h-4 w-4 rounded-full text-[10px] flex items-center justify-center font-mono font-bold',
                                        isSelected
                                          ? 'bg-white/20 text-white'
                                          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                      )}
                                    >
                                      {wIdx + 1}
                                    </span>
                                    <span className="max-w-[130px] truncate">{work.title}</span>
                                    {work.workflow_routing === 'design_ok' ? (
                                      <span
                                        className={cn(
                                          'text-[9px] px-1 rounded font-mono font-black',
                                          isSelected
                                            ? 'bg-cyan-500 text-white'
                                            : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300'
                                        )}
                                      >
                                        ⚡ Check
                                      </span>
                                    ) : work.workflow_routing === 'design_required' ? (
                                      <span
                                        className={cn(
                                          'text-[9px] px-1 rounded font-mono font-black',
                                          isSelected
                                            ? 'bg-indigo-500 text-white'
                                            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                                        )}
                                      >
                                        🎨 Req
                                      </span>
                                    ) : null}
                                    {work.status === 'approved' || work.is_locked ? (
                                      <Check
                                        className={cn('h-3 w-3', isSelected ? 'text-emerald-200' : 'text-emerald-600')}
                                      />
                                    ) : null}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )}

                        {/* Active Work Card Body */}
                        <div className="p-3.5 space-y-3 flex-1">
                          {/* Active Work Title & Format / Status Badges */}
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs font-black text-pink-600 dark:text-pink-400">
                                  #{activeWork.design_number}
                                </span>
                                <span
                                  className={`uppercase text-[9px] font-black px-1.5 py-0.2 rounded border ${getFormatBadgeColor(format)}`}
                                >
                                  .{format}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  v{activeWork.current_version}
                                </span>
                                {activeWork.workflow_routing === 'design_ok' && (
                                  <Badge
                                    variant="outline"
                                    className="bg-cyan-50 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-300 text-[9px] font-bold"
                                  >
                                    🔍 Design Check
                                  </Badge>
                                )}
                                {activeWork.workflow_routing === 'design_required' && (
                                  <Badge
                                    variant="outline"
                                    className="bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-300 text-[9px] font-bold"
                                  >
                                    🎨 Design Request
                                  </Badge>
                                )}
                              </div>
                              <h4 className="font-bold text-sm text-slate-900 dark:text-white mt-1 line-clamp-1">
                                {activeWork.title}
                              </h4>
                            </div>

                            <div className="text-right shrink-0">
                              <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block">
                                {activeWork.status.replace('_', ' ')}
                              </span>
                            </div>
                          </div>

                          {/* Active Work Main Content: Information Left, Picture Right */}
                          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 items-stretch">
                            {/* Left: Active Item Specs & Details */}
                            <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 text-xs flex flex-col justify-center space-y-1.5 min-w-0">
                              <div className="flex justify-between items-center gap-1">
                                <span className="text-slate-500 shrink-0 text-[11px]">Dimensions:</span>
                                <span className="font-mono text-slate-800 dark:text-slate-200 font-bold text-right truncate">
                                  {activeWork.dimensions_spec || 'Standard'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-1">
                                <span className="text-slate-500 shrink-0 text-[11px]">Material & Finish:</span>
                                <span className="text-slate-700 dark:text-slate-300 font-semibold text-right truncate">
                                  {[activeWork.material, activeWork.finishing].filter(Boolean).join(' • ') || 'None'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center gap-1">
                                <span className="text-slate-500 shrink-0 text-[11px]">Designer:</span>
                                <span className="text-slate-700 dark:text-slate-300 font-medium text-right truncate">
                                  {activeWork.designer_name || 'Design Team'}
                                </span>
                              </div>
                            </div>

                            {/* Right: Artwork Preview Card with Lightbox Trigger */}
                            <div
                              onClick={() => {
                                ensureJobRecord(activeWork)
                                handleOpenLightbox(activeWork.jobRecord)
                              }}
                              className="relative aspect-video rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 cursor-pointer group shadow-inner flex items-center justify-center min-h-[90px]"
                            >
                              <img
                                src={activeWork.proof_url}
                                alt={activeWork.title}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[11px] font-bold gap-1 text-center p-1">
                                <Eye className="h-3.5 w-3.5 shrink-0" />
                                <span>Inspect</span>
                              </div>
                              {activeWork.is_locked && (
                                <div className="absolute bottom-1.5 right-1.5">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-600 text-white shadow">
                                    <Lock className="h-2.5 w-2.5" /> Locked
                                  </span>
                                </div>
                              )}
                              {activeWork.dimensions_spec && (
                                <div className="absolute bottom-1.5 left-1.5">
                                  <span className="inline-flex items-center font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-xs text-white border border-white/20">
                                    {activeWork.dimensions_spec}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Pre-Press Flightcheck & Quality Health Strip */}
                          <div className="flex flex-wrap items-center justify-between gap-1.5 p-2 bg-slate-50 dark:bg-slate-900/80 rounded-xl border border-slate-100 dark:border-slate-800 text-[10px]">
                            <span className="font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <CheckSquare className="h-3 w-3 text-indigo-500" />
                              <span>Pre-Press Quality:</span>
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                              {(() => {
                                const pf = getPreflightStatus(activeWork.id, activeWork.status)
                                return (
                                  <>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTogglePreflight(activeWork.id, 'cmyk', activeWork.design_number)
                                      }}
                                      title="CMYK Color Separations (Click to toggle)"
                                      className={cn(
                                        "px-1.5 py-0.5 rounded font-bold font-mono transition-all flex items-center gap-0.5 cursor-pointer border",
                                        pf.cmyk
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-400"
                                      )}
                                    >
                                      {pf.cmyk ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                                      <span>CMYK</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTogglePreflight(activeWork.id, 'dpi300', activeWork.design_number)
                                      }}
                                      title="300 DPI High Resolution (Click to toggle)"
                                      className={cn(
                                        "px-1.5 py-0.5 rounded font-bold font-mono transition-all flex items-center gap-0.5 cursor-pointer border",
                                        pf.dpi300
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-400"
                                      )}
                                    >
                                      {pf.dpi300 ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                                      <span>300 DPI</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTogglePreflight(activeWork.id, 'bleed', activeWork.design_number)
                                      }}
                                      title="Bleed Margin (3mm / 2.0 inch frame allowance)"
                                      className={cn(
                                        "px-1.5 py-0.5 rounded font-bold font-mono transition-all flex items-center gap-0.5 cursor-pointer border",
                                        pf.bleed
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-400"
                                      )}
                                    >
                                      {pf.bleed ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                                      <span>Bleed</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleTogglePreflight(activeWork.id, 'curves', activeWork.design_number)
                                      }}
                                      title="Fonts Outlined / Curves (Click to toggle)"
                                      className={cn(
                                        "px-1.5 py-0.5 rounded font-bold font-mono transition-all flex items-center gap-0.5 cursor-pointer border",
                                        pf.curves
                                          ? "bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300"
                                          : "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 hover:border-slate-400"
                                      )}
                                    >
                                      {pf.curves ? <Check className="h-2.5 w-2.5 text-emerald-600" /> : <X className="h-2.5 w-2.5 text-slate-400" />}
                                      <span>Curves</span>
                                    </button>
                                  </>
                                )
                              })()}

                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  const j = ensureJobRecord(activeWork)
                                  handleOpenPrepress(j)
                                }}
                                className="h-5 px-1.5 text-[10px] text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 font-bold"
                                title="Open Pre-Press Flightcheck Inspector"
                              >
                                <Printer className="h-2.5 w-2.5 mr-0.5" />
                                <span>Flightcheck</span>
                              </Button>
                            </div>
                          </div>

                          {/* Production Status Banner in Item Card (Tab 4 / Production status) */}
                          {(activeTab === 'in_production' || prodInfo.hasJob || activeWork.status === 'approved' || activeWork.workflow_routing === 'ready_production') && (
                            <div
                              className={cn(
                                'p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 transition-all',
                                prodInfo.isQueued
                                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                                  : prodInfo.isPaused
                                  ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
                                  : prodInfo.isCompleted
                                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
                              )}
                            >
                              <div className="flex items-center gap-2 truncate min-w-0">
                                {prodInfo.isQueued ? (
                                  <Clock className="h-4 w-4 text-amber-600 shrink-0" />
                                ) : prodInfo.isPaused ? (
                                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                                ) : prodInfo.isCompleted ? (
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                ) : (
                                  <Printer className="h-4 w-4 text-blue-600 shrink-0" />
                                )}
                                <div className="truncate">
                                  <div className="font-bold text-[11px] leading-tight truncate">
                                    Production Status: {prodInfo.status.toUpperCase().replace('_', ' ')}
                                  </div>
                                  <div className="text-[10px] opacity-80 truncate">
                                    Stage: {prodInfo.stage || 'Press Floor Queue'} {prodInfo.pauseReason ? `• ${prodInfo.pauseReason}` : ''}
                                  </div>
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[9px] font-mono font-bold shrink-0 uppercase px-1.5 py-0.5',
                                  prodInfo.isQueued
                                    ? 'border-amber-400 text-amber-700 dark:text-amber-300 bg-amber-100/50 dark:bg-amber-950/50'
                                    : prodInfo.isPaused
                                    ? 'border-rose-400 text-rose-700 dark:text-rose-300 bg-rose-100/50 dark:bg-rose-950/50'
                                    : prodInfo.isCompleted
                                    ? 'border-emerald-400 text-emerald-700 dark:text-emerald-300 bg-emerald-100/50 dark:bg-emerald-950/50'
                                    : 'border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/50'
                                )}
                              >
                                {prodInfo.status}
                              </Badge>
                            </div>
                          )}

                          {/* All Works in this Invoice Summary Checklist (when > 1 works) */}
                          {card.works.length > 1 && (
                            <div className="p-2.5 bg-slate-50/60 dark:bg-slate-900/30 rounded-xl border border-slate-100 dark:border-slate-800/80 space-y-1.5">
                              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center justify-between">
                                <span>All Works in Invoice ({card.works.length}):</span>
                                <span className="text-[10px] text-indigo-600 font-semibold">
                                  {card.approvedCount}/{card.totalWorks} Approved
                                </span>
                              </div>
                              <div className="space-y-1">
                                {card.works.map((w, idx) => (
                                  <div
                                    key={w.id}
                                    onClick={() =>
                                      setSelectedWorkIdByGroup((prev) => ({ ...prev, [card.groupId]: w.id }))
                                    }
                                    className={cn(
                                      'p-1.5 rounded-lg flex items-center justify-between gap-2 text-[11px] cursor-pointer transition-colors',
                                      w.id === activeWork.id
                                        ? 'bg-pink-50 dark:bg-pink-950/30 border border-pink-200 dark:border-pink-900'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                    )}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className="font-mono font-bold text-slate-400 text-[10px]">
                                        {idx + 1}.
                                      </span>
                                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                        {w.title}
                                      </span>
                                      <span className="text-[9px] font-mono text-slate-400">
                                        ({w.dimensions_spec || 'Std'})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      <span
                                        className={`uppercase text-[8px] font-black px-1 rounded border ${getFormatBadgeColor(w.format)}`}
                                      >
                                        .{w.format}
                                      </span>
                                      {w.status === 'approved' || w.is_locked ? (
                                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[9px] py-0 px-1 font-bold">
                                          Approved
                                        </Badge>
                                      ) : (
                                        <span className="text-[9px] text-slate-500 capitalize">
                                          {w.status.replace('_', ' ')}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Action Bar */}
                        <div className="p-3 bg-slate-50/80 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {/* TAB 1 Action: [Start Design] */}
                            {(activeTab === 'new_tasks' ||
                              activeWork.status === 'received' ||
                              ((activeWork.workflow_routing === 'design_required' || activeWork.workflow_routing === 'design_ok') &&
                                activeWork.status !== 'designing' &&
                                activeWork.status !== 'in_progress' &&
                                activeWork.status !== 'customer_approval' &&
                                activeWork.status !== 'approved')) && (
                              <Button
                                size="sm"
                                onClick={() => handleStartDesign(activeWork)}
                                disabled={isPending}
                                className="h-8 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                                title="Start Design"
                              >
                                <Palette className="h-3.5 w-3.5" />
                                <span>Start Design</span>
                              </Button>
                            )}

                            {/* TAB 2 Action: [Design Complete] */}
                            {(activeTab === 'design_running' ||
                              activeWork.status === 'designing' ||
                              activeWork.status === 'in_progress') && (
                              <Button
                                size="sm"
                                onClick={() => handleDesignComplete(activeWork)}
                                disabled={isPending}
                                className="h-8 text-xs px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                                title="Design Complete"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Design Complete</span>
                              </Button>
                            )}

                            {/* TAB 3 Action: [Design Confirmed send to production] */}
                            {(activeTab === 'waiting_approval' ||
                              activeTab === 'customer_approvals' ||
                              activeWork.status === 'customer_approval' ||
                              activeWork.status === 'revision') && (
                              <Button
                                size="sm"
                                onClick={() => handleDesignConfirmedSendToProduction(activeWork, card)}
                                disabled={isPending}
                                className="h-8 text-xs px-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                                title="Design Confirmed send to production"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Design Confirmed send to production</span>
                              </Button>
                            )}

                            {/* TAB 4 Actions: [Pause Production Correction Requird] / [File Ready Start Production] */}
                            {(activeTab === 'in_production' ||
                              activeWork.status === 'approved' ||
                              activeWork.workflow_routing === 'ready_production') && (
                              <>
                                {prodInfo.isQueued ? (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handlePauseProductionCorrection(activeWork, card)}
                                      disabled={isPending}
                                      className="h-8 text-xs px-2 border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 font-bold gap-1 cursor-pointer"
                                      title="Pause Production Correction Required"
                                    >
                                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                                      <span>Pause Production Correction Requird</span>
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => handleStartProduction(activeWork, card)}
                                      disabled={isPending}
                                      className="h-8 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 cursor-pointer shadow-2xs"
                                      title="File Ready Start Production"
                                    >
                                      <Printer className="h-3.5 w-3.5" />
                                      <span>File Ready Start Production</span>
                                    </Button>
                                  </>
                                ) : prodInfo.isPaused ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStartProduction(activeWork, card)}
                                    disabled={isPending}
                                    className="h-8 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 cursor-pointer shadow-2xs"
                                    title="File Ready Start Production"
                                  >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                    <span>File Ready Start Production</span>
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handlePauseProductionCorrection(activeWork, card)}
                                    disabled={isPending}
                                    className="h-8 text-xs px-2 border-rose-300 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 font-bold gap-1 cursor-pointer"
                                    title="Pause Production Correction Required"
                                  >
                                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                                    <span>Pause Production Correction Requird</span>
                                  </Button>
                                )}
                              </>
                            )}

                            {activeWork.workflow_routing === 'design_ok' && activeWork.status !== 'approved' && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  const j = ensureJobRecord(activeWork)
                                  handlePrepressVerifyAndRelease(j)
                                }}
                                disabled={isPending}
                                className="h-8 text-xs px-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-1 shadow-2xs cursor-pointer"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Pre-Press Verified</span>
                              </Button>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const j = ensureJobRecord(activeWork)
                                handleOpenWhatsApp(j, activeWork.status === 'revision' ? 'revision' : activeWork.status === 'customer_approval' ? 'reminder' : 'proof')
                              }}
                              className="h-8 text-xs px-2 text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 font-medium"
                            >
                              <Phone className="h-3.5 w-3.5 mr-1" />
                              <span>WhatsApp</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const j = ensureJobRecord(activeWork)
                                handleOpenUploadModal(j)
                              }}
                              className="h-8 text-xs px-2"
                            >
                              <Upload className="h-3.5 w-3.5 mr-1" />
                              <span>Upload v+1</span>
                            </Button>

                            {!hasInvoice && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const j = ensureJobRecord(activeWork)
                                  handleOpenInvoiceRequest(j)
                                }}
                                className="h-8 text-xs px-2 border-rose-300 text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 font-bold"
                              >
                                <Send className="h-3.5 w-3.5 mr-1" />
                                <span>Req Invoice</span>
                              </Button>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <Link
                              href={getTenantHref(`/design/${activeWork.id}`)}
                              onClick={() => ensureJobRecord(activeWork)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:underline"
                            >
                              <span>Studio</span>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                          </div>
                        </div>
                      </Card>
                    )
                  })}

                  {filteredGroupedCards.length === 0 && (
                    <div className="col-span-full p-12 text-center text-slate-400 text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                      No design jobs or invoices found in pipeline.
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
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    <Bell className="h-4 w-4 text-pink-600" />
                    <span>Studio & Workflow Alerts</span>
                  </h3>
                  {tenantNotifications.length > 0 && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handlePurgeAllNotifications}
                      disabled={isPending}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Delete All Alerts</span>
                    </Button>
                  )}
                </div>
                {tenantNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No unread studio alerts. All clear!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {tenantNotifications.map((n, idx) => (
                      <div key={n.id || idx} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-8 w-8 rounded-full bg-pink-50 text-pink-600 dark:bg-pink-950/40 flex items-center justify-center shrink-0">
                            <Palette className="h-4 w-4" />
                          </div>
                          <div className="flex-1 text-xs">
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{n.title || n.message}</p>
                            <p className="text-slate-500 text-[11px] mt-0.5">{n.created_at || 'Recently'}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteNotification(n.id)}
                          disabled={isPending}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                          title="Delete alert"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>

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
                  <Link href={getTenantHref(`/design/${lightboxJob.id}`)}>
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
          POWER UPGRADE MODAL 2: WHATSAPP DIGITAL PROOF DISPATCHER (BANGLADESHI PRESS TAILORED)
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
            {/* Template Selector Tabs */}
            <div className="space-y-1.5">
              <Label className="font-bold text-slate-700 dark:text-slate-300">Select Press Message Template (মেসেজ টেমপ্লেট):</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('proof')
                    setWhatsAppEditableText(handleGenerateWhatsAppText(whatsAppJob, 'proof', whatsAppPhone))
                  }}
                  className={cn(
                    "p-2 rounded-lg text-left transition-all border cursor-pointer",
                    whatsAppTemplate === 'proof'
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200 font-bold shadow-2xs"
                      : "bg-slate-50 border-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <CheckSquare className="h-3 w-3 text-emerald-600 shrink-0" />
                    <span>১. ড্রাফট প্রুফ</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-normal">আর্টওয়ার্ক ও ভুলের দায়ভার ক্লজ</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('reminder')
                    setWhatsAppEditableText(handleGenerateWhatsAppText(whatsAppJob, 'reminder', whatsAppPhone))
                  }}
                  className={cn(
                    "p-2 rounded-lg text-left transition-all border cursor-pointer",
                    whatsAppTemplate === 'reminder'
                      ? "bg-purple-50 border-purple-500 text-purple-900 dark:bg-purple-950/50 dark:text-purple-200 font-bold shadow-2xs"
                      : "bg-slate-50 border-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <Clock className="h-3 w-3 text-purple-600 shrink-0" />
                    <span>২. জরুরী তাগাদা</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-normal">অনুমোদনের রিমাইন্ডার</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('production')
                    setWhatsAppEditableText(handleGenerateWhatsAppText(whatsAppJob, 'production', whatsAppPhone))
                  }}
                  className={cn(
                    "p-2 rounded-lg text-left transition-all border cursor-pointer",
                    whatsAppTemplate === 'production'
                      ? "bg-blue-50 border-blue-500 text-blue-900 dark:bg-blue-950/50 dark:text-blue-200 font-bold shadow-2xs"
                      : "bg-slate-50 border-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <Printer className="h-3 w-3 text-blue-600 shrink-0" />
                    <span>৩. প্রেসে পাঠানো</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-normal">প্রোডাকশন ফ্লোর কনফার্মেশন</p>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setWhatsAppTemplate('revision')
                    setWhatsAppEditableText(handleGenerateWhatsAppText(whatsAppJob, 'revision', whatsAppPhone))
                  }}
                  className={cn(
                    "p-2 rounded-lg text-left transition-all border cursor-pointer",
                    whatsAppTemplate === 'revision'
                      ? "bg-rose-50 border-rose-500 text-rose-900 dark:bg-rose-950/50 dark:text-rose-200 font-bold shadow-2xs"
                      : "bg-slate-50 border-slate-200 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                  )}
                >
                  <div className="flex items-center gap-1 text-[11px]">
                    <RotateCcw className="h-3 w-3 text-rose-600 shrink-0" />
                    <span>৪. সংশোধিত প্রুফ</span>
                  </div>
                  <p className="text-[9px] text-slate-500 mt-0.5 font-normal">নতুন ভার্সন আপডেট</p>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">Customer Mobile (WhatsApp Number / মোবাইল নম্বর)</Label>
              <Input
                value={whatsAppPhone}
                onChange={(e) => {
                  setWhatsAppPhone(e.target.value)
                }}
                placeholder="e.g. 01712345678 বা 8801..."
                className="h-9 font-mono font-bold"
              />
              <p className="text-[10px] text-slate-400">বাংলাদেশী মোবাইল নম্বরে স্বয়ংক্রিয়ভাবে +88 যুক্ত হবে।</p>
            </div>

            <div className="space-y-1.5">
              <Label className="font-bold">Editable WhatsApp Message (বার্তা সম্পাদনা করুন)</Label>
              <textarea
                rows={7}
                value={whatsAppEditableText || handleGenerateWhatsAppText(whatsAppJob, whatsAppTemplate, whatsAppPhone)}
                onChange={(e) => setWhatsAppEditableText(e.target.value)}
                className="w-full p-3 rounded-lg border bg-slate-50 dark:bg-slate-900 font-sans text-xs leading-relaxed"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyWhatsApp(whatsAppJob)}
                className="text-xs font-semibold"
              >
                {whatsAppCopied ? <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
                <span>{whatsAppCopied ? 'কপি হয়েছে!' : 'Copy Text (কপি করুন)'}</span>
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleSendWhatsAppWeb(whatsAppJob)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs"
              >
                <Phone className="h-3.5 w-3.5 mr-1" />
                <span>Open WhatsApp Web & Send (হোয়াটসঅ্যাপে পাঠান)</span>
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
            {/* Interactive Flightcheck Checklist */}
            <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Pre-Press Quality Checklist (প্রি-প্রেস কোয়ালিটি নিশ্চিত করুন):
                </span>
                <Badge variant="outline" className="text-[10px] font-mono">
                  {prepressJob.dimensions_spec || 'Standard Spec'}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(() => {
                  const pf = getPreflightStatus(prepressJob.id, prepressJob.status)
                  return (
                    <>
                      <div
                        onClick={() => handleTogglePreflight(prepressJob.id, 'cmyk', prepressJob.design_number)}
                        className={cn(
                          "p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all",
                          pf.cmyk
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-white dark:bg-slate-800 border-slate-200 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 border",
                          pf.cmyk ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300"
                        )}>
                          {pf.cmyk && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">Color Mode: CMYK Process</div>
                          <div className="text-[9px] opacity-80">RGB কালার শিফট এড়াতে CMYK নিশ্চিত</div>
                        </div>
                      </div>

                      <div
                        onClick={() => handleTogglePreflight(prepressJob.id, 'dpi300', prepressJob.design_number)}
                        className={cn(
                          "p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all",
                          pf.dpi300
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-white dark:bg-slate-800 border-slate-200 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 border",
                          pf.dpi300 ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300"
                        )}>
                          {pf.dpi300 && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">Resolution: ≥ 300 DPI High-Res</div>
                          <div className="text-[9px] opacity-80">ফাটা/ব্লার ছবি বাদ দিয়ে হাই-রেজ আর্টওয়ার্ক</div>
                        </div>
                      </div>

                      <div
                        onClick={() => handleTogglePreflight(prepressJob.id, 'bleed', prepressJob.design_number)}
                        className={cn(
                          "p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all",
                          pf.bleed
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-white dark:bg-slate-800 border-slate-200 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 border",
                          pf.bleed ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300"
                        )}>
                          {pf.bleed && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">Bleed: 3mm / 2.0&quot; Margins</div>
                          <div className="text-[9px] opacity-80">কাটিং ও ফ্রেমিং মার্জিন সংরক্ষিত</div>
                        </div>
                      </div>

                      <div
                        onClick={() => handleTogglePreflight(prepressJob.id, 'curves', prepressJob.design_number)}
                        className={cn(
                          "p-2.5 rounded-lg border flex items-center gap-2 cursor-pointer transition-all",
                          pf.curves
                            ? "bg-emerald-50 border-emerald-300 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "bg-white dark:bg-slate-800 border-slate-200 text-slate-600 dark:text-slate-400"
                        )}
                      >
                        <div className={cn(
                          "h-4 w-4 rounded flex items-center justify-center shrink-0 border",
                          pf.curves ? "bg-emerald-600 text-white border-emerald-600" : "border-slate-300"
                        )}>
                          {pf.curves && <Check className="h-3 w-3" />}
                        </div>
                        <div>
                          <div className="font-bold text-[11px]">Fonts: Converted to Outlines/Curves</div>
                          <div className="text-[9px] opacity-80">ফন্ট মিসিং সমস্যা এড়াতে কার্ভ করা হয়েছে</div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Target Machine Selection */}
            <div className="space-y-1.5">
              <Label className="font-bold">Target Print Floor Machine (নির্দিষ্ট মেশিন নির্বাচন করুন)</Label>
              <select
                value={selectedMachine}
                onChange={(e) => setSelectedMachine(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                {PRINT_MACHINERY_LIST.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} [{m.type}]
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
                <span>Authorize & Route to Machine (অনুমোদন ও প্রেসে পাঠান)</span>
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
        description="Upload or paste (.JPG / .PNG) brief artwork, assign specs, and launch designer workbench."
      >
        <form onSubmit={handleCreateStandaloneJob} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1 text-xs">
          {/* DRAG & DROP / PASTE / FILE PICKER DROPZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsNewJobDragging(true)
            }}
            onDragLeave={() => setIsNewJobDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsNewJobDragging(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processImageFileForModal(e.dataTransfer.files[0], 'new_job')
              }
            }}
            onClick={() => document.getElementById('djFileInput')?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer",
              isNewJobDragging
                ? "border-pink-500 bg-pink-50/60 dark:bg-pink-950/40"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            )}
          >
            <input
              id="djFileInput"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processImageFileForModal(e.target.files[0], 'new_job')
                }
              }}
            />
            {newJobProofUrl ? (
              <div className="space-y-1.5">
                <div className="relative max-h-40 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={newJobProofUrl}
                    alt="Brief Preview"
                    className="max-h-36 object-contain mx-auto"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Brief Artwork Loaded ({newJobFormat.toUpperCase()}) — Click to replace or paste</span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 space-y-1">
                <div className="h-8 w-8 mx-auto rounded-full bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400 flex items-center justify-center">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or Drag & Drop .JPG / .PNG
                  </p>
                  <p className="text-[11px] text-pink-600 dark:text-pink-400 font-semibold">
                    💡 Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste screenshot
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  Supported formats: <strong>.JPG, .JPEG, .PNG</strong>
                </p>
              </div>
            )}
          </div>

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
              placeholder="e.g. 3D Acrylic Facade Signboard Layout"
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
                <option value="png">.PNG (Raster Proof / Transparency)</option>
                <option value="jpg">.JPG / .JPEG (High-Res Image / Proof)</option>
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
          {/* DRAG & DROP / PASTE / FILE PICKER DROPZONE */}
          <div
            onDragOver={(e) => {
              e.preventDefault()
              setIsUploadDragging(true)
            }}
            onDragLeave={() => setIsUploadDragging(false)}
            onDrop={(e) => {
              e.preventDefault()
              setIsUploadDragging(false)
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processImageFileForModal(e.dataTransfer.files[0], 'upload')
              }
            }}
            onClick={() => document.getElementById('uploadVerFileInput')?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-3.5 text-center transition-all cursor-pointer",
              isUploadDragging
                ? "border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/40"
                : "border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/60"
            )}
          >
            <input
              id="uploadVerFileInput"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processImageFileForModal(e.target.files[0], 'upload')
                }
              }}
            />
            {uploadProofUrl ? (
              <div className="space-y-1.5">
                <div className="relative max-h-40 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 flex items-center justify-center p-1">
                  <img
                    src={uploadProofUrl}
                    alt="Proof Preview"
                    className="max-h-36 object-contain mx-auto"
                  />
                </div>
                <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-600 font-semibold">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Image Loaded ({uploadFormat.toUpperCase()}) — Click to replace or paste</span>
                </div>
              </div>
            ) : (
              <div className="py-2.5 space-y-1">
                <div className="h-8 w-8 mx-auto rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 flex items-center justify-center">
                  <Upload className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Click to browse or Drag & Drop .JPG / .PNG
                  </p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                    💡 Tip: Press <kbd className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[10px]">Ctrl+V</kbd> anywhere to paste screenshot
                  </p>
                </div>
                <p className="text-[10px] text-slate-400">
                  Supported formats: <strong>.JPG, .JPEG, .PNG</strong>
                </p>
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs font-semibold mb-1 block">Artwork File Name / Asset Label</Label>
            <Input
              placeholder="e.g. proof_banner_v2.png"
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
                <option value="png">.PNG (Raster Proof / Transparency)</option>
                <option value="jpg">.JPG / .JPEG (High-Res Image / Proof)</option>
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
            <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
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

class DesignErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[DesignStudio] Unhandled error caught by Studio Error Boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-2xl border border-pink-200 dark:border-pink-900 bg-pink-50/50 dark:bg-pink-950/30 space-y-4">
          <div className="h-12 w-12 rounded-xl bg-pink-600 text-white flex items-center justify-center mx-auto shadow-md">
            <Palette className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Design Studio</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              The studio encountered a temporary rendering state. Click below to reload.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              this.setState({ hasError: false, error: null })
              if (typeof window !== 'undefined') {
                window.location.href = window.location.pathname
              }
            }}
            className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Reload Design Studio
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

export function DesignPanel(props: DesignPanelProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
        <div className="h-10 w-10 rounded-xl bg-pink-600 text-white flex items-center justify-center animate-pulse">
          <Palette className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-500">Loading Design Panel...</p>
      </div>
    )
  }

  return (
    <DesignErrorBoundary>
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
    </DesignErrorBoundary>
  )
}
