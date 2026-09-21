'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Cpu,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  PlayCircle,
  Clock,
  Wrench,
  AlertTriangle,
  PowerOff,
  Archive,
  Eye,
  Edit,
  Calendar,
  Layers,
  Sparkles,
  LayoutGrid,
  List,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  MoreVertical,
  Printer,
  ShieldAlert,
  Disc,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PageHeader } from '@/components/shared/page-header'
import {
  MachineryRecord,
  MachineryStatus,
  MachineryType,
  MachineryDepartment,
  MachinerySummaryMetrics,
} from '@/types/machinery.types'
import {
  getMachineriesAction,
  getMachineryDashboardMetricsAction,
  archiveMachineryAction,
} from '@/actions/machinery.actions'
import { MachineryStatusBadge } from '@/components/machinery/machinery-status-badge'
import { MachineryFormModal } from '@/components/machinery/machinery-form-modal'
import { AssignMachineryModal } from '@/components/machinery/assign-machinery-modal'
import { ScheduleMaintenanceModal } from '@/components/machinery/schedule-maintenance-modal'
import { ReportBreakdownModal } from '@/components/machinery/report-breakdown-modal'
import { StatusChangeModal } from '@/components/machinery/status-change-modal'

export default function MachineriesListPage() {
  const params = useParams()
  const pathname = usePathname()
  const tenantSlug = (params?.tenantSlug as string) || 'app'
  const { company } = useTenant()
  const { can, isOwner } = usePermissions()
  const { tBilingual } = useI18n()

  const [machineries, setMachineries] = useState<MachineryRecord[]>([])
  const [metrics, setMetrics] = useState<MachinerySummaryMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filters & Search
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MachineryStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MachineryType | 'all'>('all')
  const [deptFilter, setDeptFilter] = useState<MachineryDepartment | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingMachine, setEditingMachine] = useState<MachineryRecord | null>(null)
  const [assigningMachine, setAssigningMachine] = useState<MachineryRecord | null>(null)
  const [maintainingMachine, setMaintainingMachine] = useState<MachineryRecord | null>(null)
  const [breakingMachine, setBreakingMachine] = useState<MachineryRecord | null>(null)
  const [statusMachine, setStatusMachine] = useState<MachineryRecord | null>(null)

  const canCreate = isOwner || can('create', 'machineries') || can('create', 'production')
  const canEdit = isOwner || can('edit', 'machineries') || can('edit', 'production')
  const canAssign = isOwner || can('assign', 'machineries') || can('assign', 'production')
  const canMaintain = isOwner || can('edit', 'machineries') || can('edit', 'production') || can('manage', 'production')
  const canBreakdown = true // Any floor user/operator can report breakdown

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [machRes, metRes] = await Promise.all([
        getMachineriesAction({
          search,
          status: statusFilter,
          machine_type: typeFilter,
          department: deptFilter,
        }),
        getMachineryDashboardMetricsAction(),
      ])

      if (machRes.success && machRes.data) {
        setMachineries(machRes.data)
      } else {
        setError(machRes.error || 'Failed to load machineries.')
      }

      if (metRes.success && metRes.data) {
        setMetrics(metRes.data)
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, typeFilter, deptFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleArchive = async (m: MachineryRecord) => {
    if (!confirm(`Are you sure you want to retire/archive "${m.name}" (${m.code})? It will not accept new job assignments.`)) {
      return
    }

    try {
      const res = await archiveMachineryAction(m.id)
      if (res.success) {
        loadData()
      } else {
        alert(res.error || 'Failed to archive machinery.')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to archive.')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <PageHeader
        titleEn="Machineries & Equipment Fleet"
        titleBn="মেশিনারিজ ও ইকুইপমেন্ট"
        descriptionEn="Operational machine registry, live floor availability, job scheduling, preventive maintenance & breakdown tracking."
        descriptionBn="কারখানার সব প্রিন্টার, লেজার, সিএনসি ও যন্ত্রপাতির লাইভ স্ট্যাটাস, কাজ বরাদ্দ এবং রক্ষণাবেক্ষণ পরিচালনা।"
        icon={Cpu}
        actions={
          <div className="flex items-center gap-2">
            <Link href={getTenantNavHref('/operator', pathname, tenantSlug)}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/30 font-bold"
              >
                <PlayCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Shop Floor Terminal</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData()}
              disabled={loading}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            {canCreate && (
              <Button
                size="sm"
                onClick={() => {
                  setEditingMachine(null)
                  setIsFormOpen(true)
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>+ Add Machine</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
            <Cpu className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-xl font-black text-slate-900 dark:text-white mt-1">
            {metrics?.totalMachines ?? machineries.length}
          </p>
        </Card>

        <Card className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Available</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {metrics?.available ?? machineries.filter((m) => m.status === 'available').length}
          </p>
        </Card>

        <Card className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">In Use</span>
            <PlayCircle className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-xl font-black text-blue-700 dark:text-blue-400 mt-1">
            {metrics?.inUse ?? machineries.filter((m) => m.status === 'in_use').length}
          </p>
        </Card>

        <Card className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Scheduled</span>
            <Clock className="h-4 w-4 text-indigo-600" />
          </div>
          <p className="text-xl font-black text-indigo-700 dark:text-indigo-400 mt-1">
            {metrics?.scheduled ?? machineries.filter((m) => m.status === 'scheduled').length}
          </p>
        </Card>

        <Card className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Maintenance</span>
            <Wrench className="h-4 w-4 text-amber-600" />
          </div>
          <p className="text-xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {metrics?.maintenance ?? machineries.filter((m) => m.status === 'maintenance').length}
          </p>
        </Card>

        <Card className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Breakdown</span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <p className="text-xl font-black text-red-700 dark:text-red-400 mt-1">
            {metrics?.breakdown ?? machineries.filter((m) => m.status === 'breakdown').length}
          </p>
        </Card>

        <Card className="p-3 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 shadow-xs col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Offline</span>
            <PowerOff className="h-4 w-4 text-slate-500" />
          </div>
          <p className="text-xl font-black text-slate-700 dark:text-slate-300 mt-1">
            {metrics?.offline ?? machineries.filter((m) => m.status === 'offline').length}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by machine name, code, brand, model, serial #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Statuses</option>
              <option value="available">Available Only</option>
              <option value="in_use">In Use</option>
              <option value="scheduled">Scheduled</option>
              <option value="maintenance">Under Maintenance</option>
              <option value="breakdown">Breakdown</option>
              <option value="offline">Offline</option>
            </select>

            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value as any)}
              className="h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
            >
              <option value="all">All Departments</option>
              <option value="printing">Printing</option>
              <option value="finishing">Finishing</option>
              <option value="fabrication">Fabrication</option>
              <option value="design">Design</option>
              <option value="installation">Installation</option>
            </select>

            <div className="flex items-center rounded-md border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-50 dark:bg-slate-800">
              <Button
                type="button"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </Button>
              <Button
                type="button"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="h-7 px-2.5 text-xs gap-1"
              >
                <List className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-950/30 text-red-900 dark:text-red-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 shrink-0" />
            <span className="text-xs font-medium">{error}</span>
          </div>
          <Button size="sm" variant="outline" onClick={() => loadData()}>
            Retry
          </Button>
        </Card>
      )}

      {/* Loading Skeleton */}
      {loading && machineries.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <Card key={n} className="p-4 space-y-3 animate-pulse">
              <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-10 bg-slate-100 dark:bg-slate-800 rounded" />
            </Card>
          ))}
        </div>
      ) : machineries.length === 0 ? (
        /* Empty State */
        <Card className="p-12 text-center border-dashed border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="mx-auto w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center mb-3">
            <Cpu className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            No machineries added yet
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Add your printing presses, cutting plotters, CNC routers, lasers, and finishing equipment to begin tracking capacity, job assignments, and maintenance.
          </p>
          {canCreate && (
            <Button
              onClick={() => {
                setEditingMachine(null)
                setIsFormOpen(true)
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
            >
              + Add First Machinery
            </Button>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid / Card View (Touch & Mobile Friendly) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {machineries.map((m) => (
            <Card
              key={m.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-700 transition-all flex flex-col justify-between overflow-hidden"
            >
              <div className="p-4 space-y-3">
                {/* Header: Name, Code & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <Link
                      href={getTenantNavHref(`/production/machineries/${m.id}`, pathname, tenantSlug)}
                      className="font-black text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-1"
                    >
                      {m.name}
                    </Link>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {m.code}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{m.department}</span>
                      {m.brand && (
                        <>
                          <span>•</span>
                          <span>{m.brand}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <MachineryStatusBadge status={m.status} />
                </div>

                {/* Specs / Capacity Bar */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Capacity</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {m.production_capacity ? `${m.production_capacity} ${m.capacity_unit}` : 'Standard'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Dimensions</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {m.max_width ? `Max: ${m.max_width}" W` : 'Continuous'}
                    </span>
                  </div>
                </div>

                {/* Active Mounted Roll Banner */}
                {m.active_mounted_roll_tag && (
                  <div className="p-2 rounded bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 text-xs flex items-center justify-between">
                    <span className="text-indigo-800 dark:text-indigo-300 font-bold flex items-center gap-1.5 truncate">
                      <Disc className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      Roll: {m.active_mounted_roll_tag}
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-indigo-100/60 text-indigo-700 border-indigo-300 shrink-0">
                      Mounted
                    </Badge>
                  </div>
                )}

                {/* Lifetime Production Meters */}
                {(Number(m.total_sft_produced || 0) > 0 || Number(m.total_impressions || 0) > 0) && (
                  <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded bg-slate-100/60 dark:bg-slate-800/40 font-mono text-slate-600 dark:text-slate-400">
                    <span>Meter:</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {m.total_sft_produced ? `${Number(m.total_sft_produced).toLocaleString()} SFT` : `${Number(m.total_impressions).toLocaleString()} Imp`}
                    </span>
                  </div>
                )}

                {/* Current Active Assignment or Location */}
                {m.status === 'in_use' && m.current_assignment ? (
                  <div className="p-2 rounded bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs space-y-0.5">
                    <span className="text-blue-700 dark:text-blue-300 font-bold block">
                      ⚡ Active Job: {m.current_assignment.job_order?.job_number || m.current_assignment.production_job?.production_job_number || 'Running'}
                    </span>
                    <span className="text-slate-600 dark:text-slate-400 text-[11px] block">
                      Operator: {m.current_assignment.operator_name || 'Assigned Operator'}
                    </span>
                  </div>
                ) : m.status === 'breakdown' ? (
                  <div className="p-2 rounded bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-400 font-semibold">
                    🚨 Problem: {m.latest_breakdown?.problem_title || 'Machine Malfunction'}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 flex items-center justify-between">
                    <span>Location: <strong>{m.location || 'Main Floor'}</strong></span>
                    {m.next_maintenance && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        Maint: {new Date(m.next_maintenance.scheduled_date).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={getTenantNavHref(`/production/machineries/${m.id}`, pathname, tenantSlug)}
                    className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1 min-h-[36px] py-1"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Details</span>
                  </Link>

                  <Link
                    href={getTenantNavHref(`/operator?machine=${m.id}`, pathname, tenantSlug)}
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:underline inline-flex items-center gap-1 min-h-[36px] py-1"
                    title="Launch Workstation Terminal"
                  >
                    <PlayCircle className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Terminal</span>
                  </Link>
                </div>

                <div className="flex items-center gap-1">
                  {canAssign && m.status !== 'breakdown' && m.status !== 'maintenance' && m.status !== 'retired' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssigningMachine(m)}
                      className="h-8 text-xs font-bold text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                    >
                      Assign
                    </Button>
                  )}

                  {canMaintain && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setMaintainingMachine(m)}
                      title="Schedule Maintenance"
                      className="h-8 px-2 text-slate-600 dark:text-slate-300"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {canBreakdown && m.status !== 'breakdown' && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setBreakingMachine(m)}
                      title="Report Breakdown"
                      className="h-8 px-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                    >
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </Button>
                  )}

                  {canEdit && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingMachine(m)
                        setIsFormOpen(true)
                      }}
                      title="Edit Machine"
                      className="h-8 px-2 text-slate-600"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        /* Table / List View */
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="p-3">Code / Name</th>
                <th className="p-3">Type</th>
                <th className="p-3">Dept</th>
                <th className="p-3">Status</th>
                <th className="p-3">Capacity</th>
                <th className="p-3">Location</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {machineries.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="p-3">
                    <Link
                      href={getTenantNavHref(`/production/machineries/${m.id}`, pathname, tenantSlug)}
                      className="font-bold text-slate-900 dark:text-white hover:text-blue-600"
                    >
                      {m.name}
                    </Link>
                    <span className="block font-mono text-[11px] text-slate-500">{m.code}</span>
                    {m.active_mounted_roll_tag && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-indigo-700 dark:text-indigo-300 font-bold bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800 mt-1">
                        <Disc className="h-3 w-3" />
                        {m.active_mounted_roll_tag}
                      </span>
                    )}
                  </td>
                  <td className="p-3 capitalize">{m.machine_type.replace(/_/g, ' ')}</td>
                  <td className="p-3 capitalize">{m.department}</td>
                  <td className="p-3">
                    <MachineryStatusBadge status={m.status} />
                  </td>
                  <td className="p-3">
                    {m.production_capacity ? `${m.production_capacity} ${m.capacity_unit}` : '—'}
                  </td>
                  <td className="p-3 text-slate-500">{m.location || 'Floor'}</td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={getTenantNavHref(`/production/machineries/${m.id}`, pathname, tenantSlug)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-blue-600 font-bold"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>

                      <Link
                        href={getTenantNavHref(`/operator?machine=${m.id}`, pathname, tenantSlug)}
                        className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-blue-600 font-bold"
                        title="Launch Workstation Terminal"
                      >
                        <PlayCircle className="h-4 w-4 text-blue-600" />
                      </Link>

                      {canAssign && (
                        <button
                          type="button"
                          onClick={() => setAssigningMachine(m)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-indigo-600 font-bold"
                          title="Assign"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      )}

                      {canMaintain && (
                        <button
                          type="button"
                          onClick={() => setMaintainingMachine(m)}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-600"
                          title="Maintenance"
                        >
                          <Wrench className="h-4 w-4" />
                        </button>
                      )}

                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMachine(m)
                            setIsFormOpen(true)
                          }}
                          className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Action Modals */}
      <MachineryFormModal
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        machinery={editingMachine}
        onSuccess={() => loadData()}
      />

      <AssignMachineryModal
        open={Boolean(assigningMachine)}
        onOpenChange={(open) => !open && setAssigningMachine(null)}
        machine={assigningMachine}
        onSuccess={() => loadData()}
      />

      <ScheduleMaintenanceModal
        open={Boolean(maintainingMachine)}
        onOpenChange={(open) => !open && setMaintainingMachine(null)}
        machine={maintainingMachine}
        onSuccess={() => loadData()}
      />

      <ReportBreakdownModal
        open={Boolean(breakingMachine)}
        onOpenChange={(open) => !open && setBreakingMachine(null)}
        machine={breakingMachine}
        onSuccess={() => loadData()}
      />

      <StatusChangeModal
        open={Boolean(statusMachine)}
        onOpenChange={(open) => !open && setStatusMachine(null)}
        machine={statusMachine}
        onSuccess={() => loadData()}
      />
    </div>
  )
}
