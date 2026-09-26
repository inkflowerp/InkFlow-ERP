'use client'

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import {
  Sparkles,
  Layers,
  Clock,
  CheckCircle2,
  Printer,
  PlusCircle,
  Plus,
  RefreshCw,
  Palette,
  Trash2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { PageHeader } from '@/components/shared/page-header'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { DesignRepository } from '@/lib/repositories/design.repository'
import { sendToPrintOperatorAction } from '@/actions/design.actions'
import type { DesignJobRecord } from '@/types/design.types'
import type { ProductionJobRecord, ProductionTaskRecord } from '@/types/production.types'
import { WorkOrderModal } from '@/components/shared/work-order-modal'

import {
  type PreflightState,
  type WhatsAppTemplateKey,
  PRINT_MACHINERY_LIST,
} from './types'

import { DesignMetricsBar, type DesignMetrics } from './design-metrics-bar'
import { DesignFilterToolbar, type FilterState } from './design-filter-toolbar'
import { DesignJobCard } from './design-job-card'
import { DesignInvoiceGroupCard } from './design-invoice-group-card'
import { DesignTableView } from './design-table-view'

import { DesignWhatsAppModal } from './modals/design-whatsapp-modal'
import { DesignPreflightModal } from './modals/design-preflight-modal'
import { DesignLightboxModal } from './modals/design-lightbox-modal'
import { DesignCompareModal } from './modals/design-compare-modal'
import { DesignNewJobModal } from './modals/design-new-job-modal'

export interface DesignPanelProps {
  defaultTab?: 'all' | 'new_tasks' | 'design_running' | 'waiting_approval' | 'in_production' | 'pipeline'
}

export function DesignPanel({ defaultTab = 'all' }: DesignPanelProps) {
  const params = useParams()
  const pathname = usePathname()
  const { company } = useTenant()
  const { tBilingual, locale } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'default'
  const { user } = useAuth()
  const companyId = company?.id || tenantSlug

  // Hydration Mount State
  const [mounted, setMounted] = useState(false)

  // Work Order Modal State (matching Commercial Orders & Job Hub)
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false)

  // Data States
  const [jobs, setJobs] = useState<DesignJobRecord[]>([])
  const [, setProductionJobs] = useState<ProductionJobRecord[]>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; mobile?: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Notification Banner
  const [notification, setNotification] = useState<{
    msg: string
    type: 'success' | 'warning' | 'info'
  } | null>(null)

  const showNotification = useCallback((msg: string, type: 'success' | 'warning' | 'info' = 'success') => {
    setNotification({ msg, type })
    setTimeout(() => setNotification(null), 4000)
  }, [])

  // Active Tab
  const [activeTab, setActiveTab] = useState<string>(() => {
    if (defaultTab === 'pipeline' || defaultTab === 'all') return 'new_tasks'
    return defaultTab
  })

  // Filter Toolbar State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    quickFilter: 'all',
    selectedDesigner: 'all',
    viewMode: 'cards',
  })

  // Preflight Health States Map (Stored per Job ID)
  const [preflightState, setPreflightState] = useState<Record<string, PreflightState>>({})

  // Modal States
  const [whatsAppModalState, setWhatsAppModalState] = useState<{
    isOpen: boolean
    job: DesignJobRecord | null
    template: WhatsAppTemplateKey
  }>({ isOpen: false, job: null, template: 'proof' })

  const [preflightModalState, setPreflightModalState] = useState<{
    isOpen: boolean
    job: DesignJobRecord | null
  }>({ isOpen: false, job: null })

  const [lightboxModalState, setLightboxModalState] = useState<{
    isOpen: boolean
    job: DesignJobRecord | null
    versionIndex: number
  }>({ isOpen: false, job: null, versionIndex: -1 })

  const [compareModalState, setCompareModalState] = useState<{
    isOpen: boolean
    job: DesignJobRecord | null
  }>({ isOpen: false, job: null })

  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false)

  // 1. Data Loader
  const loadData = useCallback(async () => {
    try {
      const designList = await DesignRepository.getDesignJobs(companyId)
      setJobs(designList || [])

      const prodList = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
      setProductionJobs(prodList)

      const custList = PrintERPDataStore.get<any[]>(STORAGE_KEYS.CUSTOMERS) || []
      setCustomers(
        custList.map((c) => ({
          id: c.id,
          name: c.name || c.customer_name || 'Customer',
          mobile: c.mobile || c.phone,
        }))
      )
    } catch (err: any) {
      showNotification(err.message || 'Error loading design data', 'warning')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [companyId, showNotification])

  useEffect(() => {
    loadData()

    let debounceTimer: ReturnType<typeof setTimeout> | null = null
    const handleDataChange = () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        loadData()
      }, 150)
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('printerp_data_sync', handleDataChange)
      window.addEventListener('printerp_table_synced', handleDataChange)
      window.addEventListener('printerp_table_synced:design_jobs', handleDataChange)
      window.addEventListener('printerp_table_synced:invoices', handleDataChange)
      window.addEventListener('printerp_table_synced:sales_orders', handleDataChange)
      window.addEventListener('storage', handleDataChange)
      window.addEventListener(`${STORAGE_KEYS.INVOICES}_updated`, handleDataChange)
      window.addEventListener(`${STORAGE_KEYS.DESIGN_JOBS}_updated`, handleDataChange)
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_data_sync', handleDataChange)
        window.removeEventListener('printerp_table_synced', handleDataChange)
        window.removeEventListener('printerp_table_synced:design_jobs', handleDataChange)
        window.removeEventListener('printerp_table_synced:invoices', handleDataChange)
        window.removeEventListener('printerp_table_synced:sales_orders', handleDataChange)
        window.removeEventListener('storage', handleDataChange)
        window.removeEventListener(`${STORAGE_KEYS.INVOICES}_updated`, handleDataChange)
        window.removeEventListener(`${STORAGE_KEYS.DESIGN_JOBS}_updated`, handleDataChange)
      }
    }
  }, [loadData])

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true)
    loadData()
  }, [loadData])

  // 2. Preflight State Helpers
  const getPreflightStatus = useCallback(
    (jobId: string, status?: string): PreflightState => {
      if (preflightState[jobId]) {
        return preflightState[jobId]
      }
      const isApprovedOrInProd = status === 'approved'
      return {
        cmyk: isApprovedOrInProd,
        dpi300: isApprovedOrInProd,
        bleed: isApprovedOrInProd,
        curves: isApprovedOrInProd,
      }
    },
    [preflightState]
  )

  const handleTogglePreflight = useCallback(
    (jobId: string, key: keyof PreflightState, designNumber?: string) => {
      setPreflightState((prev) => {
        const current = prev[jobId] || { cmyk: false, dpi300: false, bleed: false, curves: false }
        const nextVal = !current[key]
        const updated = { ...current, [key]: nextVal }
        return { ...prev, [jobId]: updated }
      })
      showNotification(`Pre-Press ${key.toUpperCase()} check toggled for #${designNumber || jobId}`)
    },
    [showNotification]
  )

  // 3. Unique Designers List for Filter
  const designersList = useMemo(() => {
    const set = new Set<string>()
    jobs.forEach((j) => {
      if (j.designer_name) set.add(j.designer_name)
    })
    return Array.from(set)
  }, [jobs])

  // 4. Metrics KPI Calculations
  const metrics: DesignMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0]
    let total = jobs.length
    let newTasks = 0
    let designRunning = 0
    let waitingApproval = 0
    let inProduction = 0
    let dueToday = 0
    let walkIn = 0

    jobs.forEach((j) => {
      const status = j.status
      if (status === 'received') newTasks++
      else if (status === 'designing' || status === 'in_progress') designRunning++
      else if (status === 'customer_approval' || status === 'revision') waitingApproval++
      else if (status === 'approved') inProduction++

      if (j.deadline?.includes(todayStr)) dueToday++
      if (
        j.customer_name?.toLowerCase().includes('walk') ||
        j.customer_name?.toLowerCase().includes('counter') ||
        (j as any).is_walkin
      ) {
        walkIn++
      }
    })

    return {
      total,
      newTasks,
      designRunning,
      waitingApproval,
      inProduction,
      dueToday,
      walkIn,
    }
  }, [jobs])

  // 5. Stage & Search Filtering
  const filteredJobs = useMemo(() => {
    const query = filters.searchQuery.toLowerCase().trim()
    const todayStr = new Date().toISOString().split('T')[0]

    return jobs.filter((job) => {
      // Tab Filtering
      if (activeTab === 'new_tasks' && job.status !== 'received') return false
      if (activeTab === 'design_running' && job.status !== 'designing' && job.status !== 'in_progress')
        return false
      if (
        activeTab === 'waiting_approval' &&
        job.status !== 'customer_approval' &&
        job.status !== 'revision'
      )
        return false
      if (activeTab === 'in_production' && job.status !== 'approved') return false

      // Quick Chips Filter
      if (filters.quickFilter === 'urgent') {
        if (job.priority !== 'urgent' && job.priority !== 'very_urgent') return false
      } else if (filters.quickFilter === 'walk_in') {
        const isWalk =
          job.customer_name?.toLowerCase().includes('walk') ||
          job.customer_name?.toLowerCase().includes('counter') ||
          (job as any).is_walkin
        if (!isWalk) return false
      } else if (filters.quickFilter === 'due_today') {
        if (!job.deadline?.includes(todayStr)) return false
      } else if (filters.quickFilter === 'design_needed') {
        if (job.workflow_routing === 'design_ok') return false
      } else if (filters.quickFilter === 'design_ok') {
        if (job.workflow_routing !== 'design_ok') return false
      }

      // Designer Dropdown Filter
      if (filters.selectedDesigner !== 'all' && job.designer_name !== filters.selectedDesigner) {
        return false
      }

      // Search Query
      if (query) {
        const matchTitle = job.title?.toLowerCase().includes(query)
        const matchCust = job.customer_name?.toLowerCase().includes(query)
        const matchDsn = job.design_number?.toLowerCase().includes(query)
        const matchInv = job.invoice_number?.toLowerCase().includes(query)
        const matchPhone = (job.customer_phone || (job as any).mobile || '')
          .toLowerCase()
          .includes(query)
        if (!matchTitle && !matchCust && !matchDsn && !matchInv && !matchPhone) return false
      }

      return true
    })
  }, [jobs, activeTab, filters])

  // 6. Group by Invoices for Card View
  const { invoiceGroups, standaloneJobs } = useMemo(() => {
    const invMap = new Map<
      string,
      {
        invoiceId: string
        invoiceNumber: string
        customerName: string
        customerPhone?: string | null
        jobs: DesignJobRecord[]
        allInvoiceItems?: any[]
      }
    >()
    const standalones: DesignJobRecord[] = []

    filteredJobs.forEach((job) => {
      if (job.invoice_id || job.invoice_number) {
        const invKey = job.invoice_id || job.invoice_number || 'inv-unknown'
        if (!invMap.has(invKey)) {
          invMap.set(invKey, {
            invoiceId: job.invoice_id || invKey,
            invoiceNumber: job.invoice_number || 'N/A',
            customerName: job.customer_name,
            customerPhone: job.customer_phone,
            jobs: [job],
            allInvoiceItems: job.all_invoice_items || [],
          })
        } else {
          const entry = invMap.get(invKey)!
          entry.jobs.push(job)
          if ((!entry.allInvoiceItems || entry.allInvoiceItems.length === 0) && job.all_invoice_items) {
            entry.allInvoiceItems = job.all_invoice_items
          }
        }
      } else {
        standalones.push(job)
      }
    })

    return {
      invoiceGroups: Array.from(invMap.values()),
      standaloneJobs: standalones,
    }
  }, [filteredJobs])

  // 7. Workflow Action Handlers
  const handleStartDesign = useCallback(
    (job: DesignJobRecord) => {
      startTransition(() => {
        const updated: DesignJobRecord = {
          ...job,
          status: 'designing',
          designer_name: user?.profile?.full_name || job.designer_name || 'Designer',
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated)
        setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))
        showNotification(`কাজ #${job.design_number} শুরু করা হয়েছে (In Progress)!`, 'success')
      })
    },
    [user, showNotification]
  )

  const handleCompleteDesign = useCallback(
    (job: DesignJobRecord) => {
      startTransition(() => {
        const updated: DesignJobRecord = {
          ...job,
          status: 'customer_approval',
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated)
        setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))
        showNotification(`ডিজাইন সম্পন্ন! কাস্টমার অনুমোদনের জন্য প্রুফ প্রস্তুত।`, 'success')
        // Automatically prompt WhatsApp proof modal
        setWhatsAppModalState({ isOpen: true, job: updated, template: 'proof' })
      })
    },
    [showNotification]
  )

  const handleConfirmToProduction = useCallback(
    (job: DesignJobRecord) => {
      setPreflightModalState({ isOpen: true, job })
    },
    []
  )

  const handlePreflightConfirmAndRoute = useCallback(
    async (job: DesignJobRecord, targetMachineId: string) => {
      const machineObj = PRINT_MACHINERY_LIST.find((m) => m.id === targetMachineId)
      const now = new Date().toISOString()
      const hasInvoice = Boolean(job.invoice_id) || Boolean(job.invoice_number) || job.commercial_status === 'invoice_created'
      const updated: DesignJobRecord = {
        ...job,
        status: 'approved',
        workflow_routing: 'ready_production',
        commercial_status: hasInvoice ? 'invoice_created' : (job.commercial_status || 'invoice_required'),
        is_locked: true,
        updated_at: now,
      }
      PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated)
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))

      // Update / Create Production Jobs
      const allProdJobs = PrintERPDataStore.get<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS) || []
      const matchedProdJobIdx = allProdJobs.findIndex(
        (pj) =>
          pj.id === (job as any).production_job_id ||
          (pj.customer_name === job.customer_name && pj.product_name === job.title) ||
          (job.invoice_number && pj.production_job_number && pj.production_job_number.includes(job.invoice_number.replace('INV-', '')))
      )
      if (matchedProdJobIdx >= 0) {
        allProdJobs[matchedProdJobIdx] = {
          ...allProdJobs[matchedProdJobIdx],
          stage: `Pre-Press Approved (${machineObj?.name || 'Press Floor'})`,
          status: 'queued' as const,
          commercial_gate_status: hasInvoice ? 'ready_for_production' : 'invoice_required',
          is_blocked_by_commercial_gate: !hasInvoice,
          is_blocked_by_design_gate: false,
          updated_at: now,
        }
      } else {
        allProdJobs.unshift({
          id: crypto.randomUUID(),
          company_id: companyId,
          job_order_id: (job as any).job_order_id || crypto.randomUUID(),
          sales_order_id: job.sales_order_id || null,
          customer_name: job.customer_name,
          product_name: job.title,
          dimensions_spec: job.dimensions_spec,
          quantity: job.quantity || 1,
          status: 'queued',
          stage: `Pre-Press Approved (${machineObj?.name || 'Press Floor'})`,
          commercial_gate_status: hasInvoice ? 'ready_for_production' : 'invoice_required',
          is_blocked_by_commercial_gate: !hasInvoice,
          is_blocked_by_design_gate: false,
          created_at: now,
          updated_at: now,
        } as any)
      }
      PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_JOBS, allProdJobs)
      setProductionJobs(allProdJobs)

      // Provision or Unblock linked production tasks in queue
      try {
        const allTasks = PrintERPDataStore.get<any[]>(STORAGE_KEYS.PRODUCTION_TASKS) || []
        const baseNum = (job.design_number || '001').replace('DSN-', '')
        const taskNum1 = `TSK-${baseNum}-1`
        const taskNum2 = `TSK-${baseNum}-2`

        const matchingTaskIndices = allTasks
          .map((t, idx) => ({ t, idx }))
          .filter(
            ({ t }) =>
              t.job_order_id === (job as any).job_order_id ||
              t.task_number === taskNum1 ||
              t.task_number === taskNum2 ||
              (t.customer_name === job.customer_name && (t.product_name === job.title || t.task_name?.includes(job.title)))
          )

        if (matchingTaskIndices.length > 0) {
          for (const { idx } of matchingTaskIndices) {
            allTasks[idx] = {
              ...allTasks[idx],
              is_blocked_by_design_gate: false,
              is_blocked_by_commercial_gate: !hasInvoice,
              assigned_machine_name: machineObj?.name || allTasks[idx].assigned_machine_name || 'Press Floor',
              assigned_machine_id: machineObj?.id || allTasks[idx].assigned_machine_id || null,
              status: allTasks[idx].status === 'on_hold' ? 'queued' : allTasks[idx].status,
              customer_name: allTasks[idx].customer_name || job.customer_name,
              product_name: allTasks[idx].product_name || job.title,
              job_number: allTasks[idx].job_number || job.invoice_number || job.design_number,
              job_deadline: allTasks[idx].job_deadline || job.deadline,
              updated_at: now,
            }
          }
        } else {
          const task1Id = crypto.randomUUID()
          const task2Id = crypto.randomUUID()
          const task1 = {
            id: task1Id,
            company_id: companyId,
            job_order_id: (job as any).job_order_id || crypto.randomUUID(),
            task_number: taskNum1,
            task_name: `Print: ${job.title}`,
            customer_name: job.customer_name,
            product_name: job.title,
            job_number: job.invoice_number || job.design_number,
            job_deadline: job.deadline,
            task_type: 'printing',
            department: 'printing',
            sequence_order: 1,
            quantity: job.quantity || 1,
            unit: job.unit || 'pcs',
            priority: job.priority || 'normal',
            status: 'queued',
            assigned_machine_id: machineObj?.id || null,
            assigned_machine_name: machineObj?.name || 'Press Floor',
            is_blocked_by_commercial_gate: !hasInvoice,
            is_blocked_by_design_gate: false,
            created_at: now,
            updated_at: now,
          }
          const task2 = {
            id: task2Id,
            company_id: companyId,
            job_order_id: (job as any).job_order_id || task1.job_order_id,
            task_number: taskNum2,
            task_name: `Finishing & QC: ${job.title}`,
            customer_name: job.customer_name,
            product_name: job.title,
            job_number: job.invoice_number || job.design_number,
            job_deadline: job.deadline,
            task_type: 'finishing',
            department: 'finishing',
            sequence_order: 2,
            quantity: job.quantity || 1,
            unit: job.unit || 'pcs',
            priority: job.priority || 'normal',
            status: 'queued',
            is_blocked_by_commercial_gate: !hasInvoice,
            is_blocked_by_design_gate: false,
            created_at: now,
            updated_at: now,
          }
          allTasks.unshift(task2, task1)
        }
        PrintERPDataStore.set(STORAGE_KEYS.PRODUCTION_TASKS, allTasks)
      } catch {}

      // Call backend server action in background for multi-terminal sync
      try {
        await sendToPrintOperatorAction(job.id, companyId, updated, {
          assignedMachineId: machineObj?.id,
          assignedMachineName: machineObj?.name,
          actorName: user?.profile?.full_name || 'Prepress Designer',
        })
      } catch {}

      // Update linked sales order stage to in_production
      try {
        const allOrders = PrintERPDataStore.get<any[]>(STORAGE_KEYS.ORDERS) || []
        const matchedOrder = allOrders.find(
          (o) =>
            o.id === (job as any).sales_order_id ||
            (job.invoice_number && (o.invoice_number === job.invoice_number || o.order_number?.includes(job.invoice_number.replace('INV-', '')))) ||
            (o.customer_name === job.customer_name && o.items?.some((it: any) => it.item_name?.includes(job.title) || job.title?.includes(it.item_name)))
        )
        if (matchedOrder && matchedOrder.stage !== 'delivered') {
          PrintERPDataStore.updateItem<any>(STORAGE_KEYS.ORDERS, matchedOrder.id, {
            stage: 'in_production',
            updated_at: now,
          })
        }
      } catch {}

      // Mark all preflight checks green
      setPreflightState((prev) => ({
        ...prev,
        [job.id]: { cmyk: true, dpi300: true, bleed: true, curves: true },
      }))

      // Realtime cross-tab broadcast for Production Planning & Shop Floor Terminals
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('printerp_data_sync', {
            detail: { type: 'production_tasks_updated', source: 'design_preflight', jobId: job.id },
          })
        )
        window.dispatchEvent(new CustomEvent('printerp_table_synced:production_tasks'))
        window.dispatchEvent(new CustomEvent('printerp_table_synced:production_jobs'))
        window.dispatchEvent(new CustomEvent('printerp_table_synced:design_jobs'))
      }

      showNotification(`জব #${job.design_number} প্রেসে সফলভাবে পাঠানো হয়েছে (${machineObj?.name})!`, 'success')
    },
    [companyId, user, showNotification]
  )

  const handlePauseProduction = useCallback(
    (job: DesignJobRecord) => {
      startTransition(() => {
        const updated = {
          ...job,
          is_production_paused: true,
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated as any)
        setJobs((prev) => prev.map((j) => (j.id === job.id ? (updated as any) : j)))
        showNotification(`প্রোডাকশন সাময়িকভাবে স্থগিত করা হয়েছে (Correction Required)!`, 'warning')
      })
    },
    [showNotification]
  )

  const handleResumeProduction = useCallback(
    (job: DesignJobRecord) => {
      startTransition(() => {
        const updated = {
          ...job,
          is_production_paused: false,
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated as any)
        setJobs((prev) => prev.map((j) => (j.id === job.id ? (updated as any) : j)))
        showNotification(`প্রোডাকশন আবার চালু করা হয়েছে!`, 'success')
      })
    },
    [showNotification]
  )

  const handleRequestRevision = useCallback(
    (job: DesignJobRecord) => {
      startTransition(() => {
        const updated: DesignJobRecord = {
          ...job,
          status: 'revision',
          revision_count: (job.revision_count || 0) + 1,
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated)
        setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))
        showNotification(`কাস্টমার রিভিশন নোট গ্রহণ করা হয়েছে (Revision Requested)!`, 'info')
      })
    },
    [showNotification]
  )

  const handleCreateNewJob = useCallback(
    (newJob: DesignJobRecord) => {
      PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, newJob)
      setJobs((prev) => [newJob, ...prev])
    },
    []
  )

  // 8. Modal Trigger Callbacks
  const handleOpenWhatsApp = useCallback(
    (job: DesignJobRecord, tpl: WhatsAppTemplateKey = 'proof') => {
      setWhatsAppModalState({ isOpen: true, job, template: tpl })
    },
    []
  )

  const handleOpenLightbox = useCallback((job: DesignJobRecord, versionIndex = -1) => {
    setLightboxModalState({ isOpen: true, job, versionIndex })
  }, [])

  const handleOpenCompare = useCallback((job: DesignJobRecord) => {
    setCompareModalState({ isOpen: true, job })
  }, [])

  const handleOpenPreflightModal = useCallback((job: DesignJobRecord) => {
    setPreflightModalState({ isOpen: true, job })
  }, [])

  // 9. Quick Metric Filter Handler
  const handleSelectMetricFilter = useCallback((metricId: string) => {
    if (metricId === 'urgent_today') {
      setFilters((f) => ({ ...f, quickFilter: 'due_today' }))
    } else if (metricId === 'walk_in') {
      setFilters((f) => ({ ...f, quickFilter: 'walk_in' }))
    } else if (metricId === 'all') {
      setActiveTab('all')
      setFilters((f) => ({ ...f, quickFilter: 'all' }))
    } else {
      setActiveTab(metricId)
      setFilters((f) => ({ ...f, quickFilter: 'all' }))
    }
  }, [])

  const tabsConfig = [
    { id: 'new_tasks', label: '১. নতুন কাজ ও চেক', sub: 'New Tasks', count: metrics.newTasks, icon: Sparkles },
    { id: 'design_running', label: '২. ডিজাইন চলতেছে', sub: 'In Progress', count: metrics.designRunning, icon: Clock },
    { id: 'waiting_approval', label: '৩. অনুমোদনের অপেক্ষা', sub: 'Approval', count: metrics.waitingApproval, icon: CheckCircle2 },
    { id: 'in_production', label: '৪. প্রেসে প্রোডাকশন চালু', sub: 'In Machine Floor', count: metrics.inProduction, icon: Printer },
  ]

  return (
    <div className="space-y-4 pb-16 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HEADER & PRIMARY WORKSPACE ACTIONS (Matching Quotation & Billing UI)
         ========================================================================= */}
      <div className="bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900 dark:via-slate-900/80 dark:to-slate-800/40 p-5 sm:p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white flex items-center justify-center shadow-sm shadow-indigo-500/20">
                <Palette className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>
                    {locale === 'bn' ? 'ডিজাইন স্টুডিও ও প্রি-প্রেস কোয়ালিটি' : 'Design Studio & Pre-Press Quality Panel'}
                  </span>
                  <Badge className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-2xs font-bold py-0.5">
                    Pre-Press Hub
                  </Badge>
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {locale === 'bn'
                    ? 'গ্রাফিক ডিজাইন ওয়ার্কবেঞ্চ, প্রি-ফ্লাইট কোয়ালিটি চেক, প্রুফ ভার্সন ও গ্রাহক হোয়াটসঅ্যাপ অনুমোদন হাব'
                    : 'Graphic design workbench, preflight verification, proof versions, and WhatsApp customer approval hub.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href={getTenantNavHref('/trash?tab=design', pathname, tenantSlug)}>
              <Button
                variant="outline"
                size="sm"
                className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Trash Bin</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold shadow-xs h-9 gap-1.5 cursor-pointer text-slate-600 dark:text-slate-300 rounded-xl"
              title="Refresh Design Jobs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin text-indigo-600')} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsWorkOrderModalOpen(true)}
              className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white text-xs font-bold shadow-sm shadow-indigo-500/20 h-9 px-4 gap-1.5 cursor-pointer rounded-xl transition-transform active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" />
              <span>{tBilingual('Work Order', 'ওয়ার্ক অর্ডার')}</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Top Metrics KPI Bar */}
      <DesignMetricsBar
        metrics={metrics}
        activeFilter={filters.quickFilter !== 'all' ? filters.quickFilter : activeTab}
        onSelectFilter={handleSelectMetricFilter}
      />

      {/* 4 Practical Press Tabs Navigation */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        {tabsConfig.map((t) => {
          const Icon = t.icon
          const isActive = activeTab === t.id
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`p-2.5 rounded-xl text-left transition-all flex items-center justify-between cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold border border-slate-200/80 dark:border-slate-700/80'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center gap-2 truncate">
                <Icon
                  className={`h-4 w-4 shrink-0 ${
                    isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'
                  }`}
                />
                <span className="text-xs truncate font-semibold">{t.label}</span>
              </div>
              <span
                className={`text-2xs font-mono px-2 py-0.5 rounded-full font-bold ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                }`}
              >
                {t.count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Search & Filter Toolbar */}
      <DesignFilterToolbar
        filters={filters}
        designers={designersList}
        onFilterChange={(newF) => setFilters((prev) => ({ ...prev, ...newF }))}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Content Rendering (Cards Grid vs Compact Table) */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span>ডিজাইন লোড হচ্ছে...</span>
        </div>
      ) : filters.viewMode === 'table' ? (
        <DesignTableView
          jobs={filteredJobs}
          activeTab={activeTab}
          getPreflightStatus={getPreflightStatus}
          onTogglePreflight={handleTogglePreflight}
          onOpenWhatsApp={handleOpenWhatsApp}
          onOpenLightbox={handleOpenLightbox}
          onOpenPreflightModal={handleOpenPreflightModal}
          onStartDesign={handleStartDesign}
          onCompleteDesign={handleCompleteDesign}
          onConfirmToProduction={handleConfirmToProduction}
          onPauseProduction={handlePauseProduction}
          onResumeProduction={handleResumeProduction}
          onRequestRevision={handleRequestRevision}
        />
      ) : (
        <div className="space-y-4">
          {/* Invoice Groups */}
          {invoiceGroups.map((group) => (
            <DesignInvoiceGroupCard
              key={group.invoiceId}
              group={group}
              activeTab={activeTab}
              getPreflightStatus={getPreflightStatus}
              onTogglePreflight={handleTogglePreflight}
              onOpenWhatsApp={handleOpenWhatsApp}
              onOpenLightbox={handleOpenLightbox}
              onOpenCompare={handleOpenCompare}
              onOpenPreflightModal={handleOpenPreflightModal}
              onStartDesign={handleStartDesign}
              onCompleteDesign={handleCompleteDesign}
              onConfirmToProduction={handleConfirmToProduction}
              onPauseProduction={handlePauseProduction}
              onResumeProduction={handleResumeProduction}
              onRequestRevision={handleRequestRevision}
            />
          ))}

          {/* Standalone Jobs */}
          {standaloneJobs.length > 0 && (
            <div className="space-y-3">
              {standaloneJobs.map((job) => (
                <DesignJobCard
                  key={job.id}
                  job={job}
                  activeTab={activeTab}
                  preflight={getPreflightStatus(job.id, job.status)}
                  onTogglePreflight={handleTogglePreflight}
                  onOpenWhatsApp={handleOpenWhatsApp}
                  onOpenLightbox={handleOpenLightbox}
                  onOpenCompare={handleOpenCompare}
                  onOpenPreflightModal={handleOpenPreflightModal}
                  onStartDesign={handleStartDesign}
                  onCompleteDesign={handleCompleteDesign}
                  onConfirmToProduction={handleConfirmToProduction}
                  onPauseProduction={handlePauseProduction}
                  onResumeProduction={handleResumeProduction}
                  onRequestRevision={handleRequestRevision}
                />
              ))}
            </div>
          )}

          {filteredJobs.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500">
              <div className="text-sm font-bold text-slate-700 dark:text-slate-300">
                কোনো ডিজাইন কাজ পাওয়া যায়নি
              </div>
              <p className="text-xs text-slate-400 mt-1">
                উপরের ফিল্টার বা সার্চ পরিবর্তন করুন অথবা নতুন ডিজাইন যুক্ত করুন।
              </p>
            </div>
          )}
        </div>
      )}

      {/* 10. Modals Layer (Conditional Rendering for Maximum Performance) */}
      {whatsAppModalState.isOpen && (
        <DesignWhatsAppModal
          isOpen={whatsAppModalState.isOpen}
          onClose={() => setWhatsAppModalState({ isOpen: false, job: null, template: 'proof' })}
          job={whatsAppModalState.job}
          companyName="PrintERP Studio"
          initialTemplate={whatsAppModalState.template}
          onShowNotification={showNotification}
        />
      )}

      {preflightModalState.isOpen && (
        <DesignPreflightModal
          isOpen={preflightModalState.isOpen}
          onClose={() => setPreflightModalState({ isOpen: false, job: null })}
          job={preflightModalState.job}
          currentPreflight={getPreflightStatus(
            preflightModalState.job?.id || '',
            preflightModalState.job?.status
          )}
          onToggleCheck={handleTogglePreflight}
          onConfirmAndRoute={handlePreflightConfirmAndRoute}
          onShowNotification={showNotification}
        />
      )}

      {lightboxModalState.isOpen && (
        <DesignLightboxModal
          isOpen={lightboxModalState.isOpen}
          onClose={() => setLightboxModalState({ isOpen: false, job: null, versionIndex: -1 })}
          job={lightboxModalState.job}
          versionIndex={lightboxModalState.versionIndex}
        />
      )}

      {compareModalState.isOpen && (
        <DesignCompareModal
          isOpen={compareModalState.isOpen}
          onClose={() => setCompareModalState({ isOpen: false, job: null })}
          job={compareModalState.job}
        />
      )}

      {/* Floating Toast Notification (Matching Quotation & Billing) */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900/95 text-white dark:bg-slate-100 dark:text-slate-900 backdrop-blur-md rounded-2xl shadow-2xl border border-white/10 dark:border-black/10 flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-bottom-5">
          <Sparkles className="h-4 w-4 text-indigo-400 dark:text-indigo-600 shrink-0" />
          <span>{notification.msg}</span>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="p-1 text-slate-400 hover:text-white dark:hover:text-black cursor-pointer ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Add Work Order Modal (Same as Commercial Orders & Job Hub) */}
      {isWorkOrderModalOpen && (
        <WorkOrderModal
          isOpen={isWorkOrderModalOpen}
          onClose={() => {
            setIsWorkOrderModalOpen(false)
            loadData()
          }}
          onSuccess={() => {
            setIsWorkOrderModalOpen(false)
            loadData()
            showNotification(
              tBilingual(
                'Work Order created successfully and added to Design Studio.',
                'ওয়ার্ক অর্ডার তৈরি হয়েছে এবং ডিজাইন স্টুডিওতে যুক্ত হয়েছে।'
              ),
              'success'
            )
          }}
          companyId={companyId}
        />
      )}

      {isNewJobModalOpen && (
        <DesignNewJobModal
          isOpen={isNewJobModalOpen}
          onClose={() => setIsNewJobModalOpen(false)}
          companyId={companyId}
          customers={customers}
          currentUserName={user?.profile?.full_name}
          onCreateJob={handleCreateNewJob}
          onShowNotification={showNotification}
        />
      )}
    </div>
  )
}
