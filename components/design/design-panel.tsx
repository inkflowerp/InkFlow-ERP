'use client'

import React, { useState, useEffect, useMemo, useCallback, useTransition } from 'react'
import { useParams } from 'next/navigation'
import {
  Edit3,
  Plus,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { useTenant } from '@/hooks/use-tenant'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'
import { DesignRepository } from '@/lib/repositories/design.repository'
import { sendToPrintOperatorAction } from '@/actions/design.actions'
import type { DesignJobRecord } from '@/types/design.types'
import type { ProductionJobRecord } from '@/types/production.types'
import { WorkOrderModal } from '@/components/shared/work-order-modal'

import {
  type PreflightState,
  type WhatsAppTemplateKey,
  PRINT_MACHINERY_LIST,
} from './types'

import { DesignMetricsBar, type DesignMetrics } from './design-metrics-bar'
import { DesignFilterToolbar, type FilterState } from './design-filter-toolbar'
import { DesignInvoiceGroupCard, type InvoiceGroup } from './design-invoice-group-card'
import { DesignTableView } from './design-table-view'

import { DesignWhatsAppModal } from './modals/design-whatsapp-modal'
import { DesignPreflightModal } from './modals/design-preflight-modal'
import { DesignLightboxModal } from './modals/design-lightbox-modal'
import { DesignCompareModal } from './modals/design-compare-modal'
import { DesignNewJobModal } from './modals/design-new-job-modal'

export interface DesignPanelProps {
  defaultTab?: 'all' | 'new_tasks' | 'design_running' | 'waiting_approval' | 'revision' | 'in_production' | string
}

function getDueText(deadline?: string | null, priority?: string): string | null {
  if (priority === 'urgent') return 'Urgent'
  if (!deadline) return null
  const d = new Date(deadline)
  if (isNaN(d.getTime())) return null

  const now = new Date()
  const dMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.round((dMidnight - nowMidnight) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'Overdue'
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Tomorrow'
  if (diffDays > 1 && diffDays <= 7) return `${diffDays} days left`
  return null
}

export function DesignPanel({ defaultTab = 'all' }: DesignPanelProps) {
  const params = useParams()
  const { company } = useTenant()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'default'
  const { user } = useAuth()
  const companyId = company?.id || tenantSlug

  // Work Order Modal State
  const [isWorkOrderModalOpen, setIsWorkOrderModalOpen] = useState(false)

  // Data States
  const [jobs, setJobs] = useState<DesignJobRecord[]>([])
  const [, setProductionJobs] = useState<ProductionJobRecord[]>([])
  const [customers, setCustomers] = useState<Array<{ id: string; name: string; mobile?: string }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [, startTransition] = useTransition()

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
    if (defaultTab === 'pipeline') return 'all'
    return defaultTab
  })

  // Filter Toolbar State
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    quickFilter: 'all',
    selectedDesigner: 'all',
    selectedPriority: 'all',
    selectedDate: 'all',
    viewMode: 'cards',
  })

  // Preflight Health States Map
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
      let designList = await DesignRepository.getDesignJobs(companyId)

      // Purge any legacy demo jobs starting with 'dsn-ref-'
      const rawStored = PrintERPDataStore.get<DesignJobRecord[]>(STORAGE_KEYS.DESIGN_JOBS) || []
      const cleanedStored = rawStored.filter((j) => !j?.id?.startsWith('dsn-ref-'))
      if (cleanedStored.length !== rawStored.length) {
        PrintERPDataStore.set(STORAGE_KEYS.DESIGN_JOBS, cleanedStored)
      }

      const cleanList = (designList || []).filter((j) => !j?.id?.startsWith('dsn-ref-'))
      setJobs(cleanList)

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
      window.addEventListener('storage', handleDataChange)
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer)
      if (typeof window !== 'undefined') {
        window.removeEventListener('printerp_data_sync', handleDataChange)
        window.removeEventListener('printerp_table_synced', handleDataChange)
        window.removeEventListener('printerp_table_synced:design_jobs', handleDataChange)
        window.removeEventListener('printerp_table_synced:invoices', handleDataChange)
        window.removeEventListener('storage', handleDataChange)
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
    let total = jobs.length
    let newTasks = 0
    let designRunning = 0
    let waitingApproval = 0
    let revision = 0
    let inProduction = 0

    jobs.forEach((j) => {
      const status: string = j.status
      if (status === 'received' || status === 'new') newTasks++
      else if (status === 'designing' || status === 'in_progress') designRunning++
      else if (status === 'customer_approval' || status === 'waiting_approval') waitingApproval++
      else if (status === 'revision') revision++
      else if (status === 'approved') inProduction++
      else newTasks++
    })

    return {
      total,
      newTasks,
      designRunning,
      waitingApproval,
      revision,
      inProduction,
    }
  }, [jobs])

  // 5. Stage & Search Filtering
  const filteredJobs = useMemo(() => {
    const query = filters.searchQuery.toLowerCase().trim()

    return jobs.filter((job) => {
      const status: string = job.status
      // Tab Filtering
      if (activeTab === 'new_tasks' && status !== 'received' && status !== 'new') return false
      if (activeTab === 'design_running' && status !== 'designing' && status !== 'in_progress')
        return false
      if (
        activeTab === 'waiting_approval' &&
        status !== 'customer_approval' &&
        status !== 'waiting_approval'
      )
        return false
      if (activeTab === 'revision' && status !== 'revision') return false
      if (activeTab === 'in_production' && status !== 'approved') return false

      // Designer Dropdown Filter
      if (filters.selectedDesigner !== 'all' && job.designer_name !== filters.selectedDesigner) {
        return false
      }

      // Priority Dropdown Filter
      if (filters.selectedPriority && filters.selectedPriority !== 'all') {
        if (job.priority !== filters.selectedPriority) return false
      }

      // Date Filter
      if (filters.selectedDate && filters.selectedDate !== 'all') {
        if (filters.selectedDate === 'today' && !job.deadline?.includes('28 Sep 2026')) return false
        if (filters.selectedDate === '2_days' && !job.deadline?.includes('28 Sep') && !job.deadline?.includes('29 Sep')) return false
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

  // 6. Group by Invoices for Accordion View
  const { invoiceGroups, standaloneJobs } = useMemo(() => {
    const invMap = new Map<string, InvoiceGroup>()
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
            invoiceDate: (job as any).created_at
              ? new Date((job as any).created_at).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })
              : new Date().toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                }),
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

    // Compute dynamic aggregate metrics for each invoice group
    const groups = Array.from(invMap.values()).map((group) => {
      const gJobs = group.jobs
      const completedCount = gJobs.filter(
        (j) => j.status === 'approved' || (j.status as string) === 'sent_to_production' || (j.status as string) === 'completed'
      ).length

      // Determine overall group status based on lifecycle
      let overallStatus: 'designing' | 'waiting_approval' | 'revision' | 'in_production' | 'approved' | 'new' = 'new'
      if (gJobs.length > 0 && completedCount === gJobs.length) {
        overallStatus = 'approved'
      } else if (gJobs.some((j) => j.status === 'revision')) {
        overallStatus = 'revision'
      } else if (gJobs.some((j) => (j.status as string) === 'waiting_approval' || j.status === 'customer_approval')) {
        overallStatus = 'waiting_approval'
      } else if (gJobs.some((j) => (j.status as string) === 'sent_to_production')) {
        overallStatus = 'in_production'
      } else if (gJobs.some((j) => j.status === 'designing' || j.status === 'in_progress')) {
        overallStatus = 'designing'
      } else {
        overallStatus = 'new'
      }

      // Compute group due text from earliest deadline
      const sortedByDeadline = [...gJobs].filter((j) => j.deadline).sort((a, b) => {
        return new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
      })
      const earliestDeadlineJob = sortedByDeadline[0] || gJobs[0]
      const dueText = getDueText(earliestDeadlineJob?.deadline, earliestDeadlineJob?.priority)

      return {
        ...group,
        completedCount,
        overallStatus,
        dueText,
      }
    })

    // Sort by invoice number (e.g. INV-000009, INV-000010)
    const sortedGroups = groups.sort((a, b) =>
      a.invoiceNumber.localeCompare(b.invoiceNumber, undefined, { numeric: true })
    )

    return {
      invoiceGroups: sortedGroups,
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
          designer_name: user?.profile?.full_name || job.designer_name || 'Design Team',
          updated_at: new Date().toISOString(),
        }
        PrintERPDataStore.updateItem<DesignJobRecord>(STORAGE_KEYS.DESIGN_JOBS, job.id, updated)
        setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)))
        showNotification(`Job #${job.design_number || job.title} started (Designing)!`, 'success')
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
        showNotification(`Design completed! Proof ready for customer approval.`, 'success')
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
        showNotification('Production paused for correction', 'warning')
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
        showNotification('Production resumed', 'success')
      })
    },
    [showNotification]
  )

  const handlePreflightConfirmAndRoute = useCallback(
    async (job: DesignJobRecord, targetMachineId: string) => {
      const machineObj = PRINT_MACHINERY_LIST.find((m) => m.id === targetMachineId)
      const now = new Date().toISOString()
      const hasInvoice = Boolean(job.invoice_id) || Boolean(job.invoice_number)
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

      try {
        await sendToPrintOperatorAction(job.id, companyId, updated, {
          assignedMachineId: machineObj?.id,
          assignedMachineName: machineObj?.name,
          actorName: user?.profile?.full_name || 'Prepress Designer',
        })
      } catch {}

      showNotification(`Job #${job.design_number || job.title} sent to production floor successfully!`, 'success')
    },
    [companyId, user, showNotification]
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
        showNotification(`Revision requested for #${job.design_number || job.title}`, 'info')
      })
    },
    [showNotification]
  )

  const handleCreateNewJob = useCallback(
    async (newJob: DesignJobRecord) => {
      PrintERPDataStore.addItem(STORAGE_KEYS.DESIGN_JOBS, newJob)
      setJobs((prev) => [newJob, ...prev])
      showNotification('New design job created successfully!', 'success')
      try {
        await DesignRepository.createDesignJob(newJob)
      } catch (e) {
        console.error('Failed to sync design job to DB:', e)
      }
    },
    [showNotification]
  )

  // Modal Callbacks
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

  return (
    <div className="space-y-4 pb-16 max-w-7xl mx-auto">
      {/* =========================================================================
          1. HEADER: Reference Layout with squircle icon, title, subtitle & button
         ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-500/25 shrink-0">
            <Edit3 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Design Panel
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              Manage design jobs, create proofs, handle revisions and send to production.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => setIsNewJobModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm rounded-xl px-4 py-2.5 shadow-sm shadow-indigo-500/20 flex items-center gap-1.5 cursor-pointer transition-transform active:scale-[0.98]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>New Design Job</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Metrics KPI Bar (6 Cards matching reference) */}
      <DesignMetricsBar
        metrics={metrics}
        activeFilter={activeTab}
        onSelectFilter={(tabId) => setActiveTab(tabId)}
      />

      {/* 3. Status Filter Tabs & Search / Dropdown Filter Bar */}
      <DesignFilterToolbar
        filters={filters}
        activeTab={activeTab}
        tabCounts={{
          all: metrics.total,
          new_tasks: metrics.newTasks,
          design_running: metrics.designRunning,
          waiting_approval: metrics.waitingApproval,
          revision: metrics.revision || 0,
          in_production: metrics.inProduction,
        }}
        designers={designersList}
        onTabChange={(tabId) => setActiveTab(tabId)}
        onFilterChange={(newF) => setFilters((prev) => ({ ...prev, ...newF }))}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      {/* 4. Content Rendering: Invoice Accordion Cards */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-indigo-600" />
          <span>Loading design panel...</span>
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
        <div className="space-y-3.5">
          {/* Grouped Accordion Cards */}
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
            <div className="space-y-3 pt-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Direct Work / Non-Invoiced Items
              </div>
              {standaloneJobs.map((job) => (
                <DesignInvoiceGroupCard
                  key={job.id}
                  group={{
                    invoiceId: job.id,
                    invoiceNumber: job.design_number || 'JOB-001',
                    customerName: job.customer_name,
                    customerPhone: job.customer_phone,
                    invoiceDate: (job as any).created_at
                      ? new Date((job as any).created_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : new Date().toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        }),
                    jobs: [job],
                  }}
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
            </div>
          )}

          {filteredJobs.length === 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <Edit3 className="w-6 h-6 stroke-[2]" />
              </div>
              <div className="text-base font-bold text-slate-800 dark:text-slate-200">
                {activeTab === 'all' ? 'No design jobs yet' : 'No jobs found in this tab'}
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {activeTab === 'all'
                  ? 'Confirmed commercial orders requiring design will appear here automatically, or you can create a direct design job.'
                  : 'Try selecting another status tab or clear your search filters.'}
              </p>
              {activeTab === 'all' && (
                <div className="mt-4">
                  <Button
                    onClick={() => setIsNewJobModalOpen(true)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl px-4 py-2 cursor-pointer shadow-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    <span>Create New Design Job</span>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 5. Modals Layer */}
      {whatsAppModalState.isOpen && (
        <DesignWhatsAppModal
          isOpen={whatsAppModalState.isOpen}
          onClose={() => setWhatsAppModalState({ isOpen: false, job: null, template: 'proof' })}
          job={whatsAppModalState.job}
          companyName={company?.name || 'InkFlow ERP'}
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
            showNotification('Work Order created successfully and added to Design Studio.', 'success')
          }}
          companyId={companyId}
        />
      )}

      {/* Floating Toast Notification */}
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
    </div>
  )
}
