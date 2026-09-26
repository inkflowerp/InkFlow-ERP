'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Cpu,
  ArrowLeft,
  Wrench,
  Clock,
  AlertTriangle,
  Play,
  CheckCircle2,
  Edit,
  Archive,
  PowerOff,
  DollarSign,
  Sliders,
  Calendar,
  Layers,
  FileText,
  AlertOctagon,
  RefreshCw,
  Plus,
  User,
  ShieldCheck,
  CheckCircle,
  Activity,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { usePermissions } from '@/hooks/use-permissions'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MachineryRecord,
  MachineryAssignmentRecord,
  MachineryMaintenanceRecord,
  MachineryBreakdownRecord,
  MachineryStatus,
} from '@/types/machinery.types'
import {
  getMachineryByIdAction,
  archiveMachineryAction,
  updateAssignmentStatusAction,
} from '@/actions/machinery.actions'
import { formatDate, formatDateTime } from '@/lib/formatters'
import { MachineryStatusBadge } from '@/components/machinery/machinery-status-badge'
import { MachineryFormModal } from '@/components/machinery/machinery-form-modal'
import { AssignMachineryModal } from '@/components/machinery/assign-machinery-modal'
import { ScheduleMaintenanceModal } from '@/components/machinery/schedule-maintenance-modal'
import { CompleteMaintenanceModal } from '@/components/machinery/complete-maintenance-modal'
import { ReportBreakdownModal } from '@/components/machinery/report-breakdown-modal'
import { ResolveBreakdownModal } from '@/components/machinery/resolve-breakdown-modal'
import { StatusChangeModal } from '@/components/machinery/status-change-modal'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { dispatchToast } from '@/components/shared/toast-feedback'

export default function MachineryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname() || ''
  const { company } = useTenant()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'my-company'
  const machineId = params?.id as string
  const { can, isOwner } = usePermissions()

  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  const [machine, setMachine] = useState<MachineryRecord | null>(null)
  const [assignments, setAssignments] = useState<MachineryAssignmentRecord[]>([])
  const [maintenances, setMaintenances] = useState<MachineryMaintenanceRecord[]>([])
  const [breakdowns, setBreakdowns] = useState<MachineryBreakdownRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeTab, setActiveTab] = useState<
    'overview' | 'production' | 'assignments' | 'maintenance' | 'breakdowns' | 'timeline'
  >('overview')

  // Modals
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [isScheduleMaintOpen, setIsScheduleMaintOpen] = useState(false)
  const [completingMaint, setCompletingMaint] = useState<MachineryMaintenanceRecord | null>(null)
  const [isReportBreakdownOpen, setIsReportBreakdownOpen] = useState(false)
  const [resolvingBreakdown, setResolvingBreakdown] = useState<MachineryBreakdownRecord | null>(null)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  const canEdit = isOwner || can('edit', 'machineries') || can('edit', 'production')
  const canAssign = isOwner || can('assign', 'machineries') || can('assign', 'production')
  const canMaintain = isOwner || can('edit', 'machineries') || can('edit', 'production') || can('manage', 'production')
  const canCostView = isOwner || can('view', 'reports') || can('view', 'settings')

  const loadData = useCallback(async () => {
    if (!machineId) return
    setLoading(true)
    setError(null)
    try {
      const res = await getMachineryByIdAction(machineId)
      if (res.success && res.data) {
        setMachine(res.data)
      } else {
        setError(res.error || 'Failed to load machine details.')
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.')
    } finally {
      setLoading(false)
    }
  }, [machineId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Archive confirm modal state
  const [isArchiveConfirmOpen, setIsArchiveConfirmOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const handleArchive = () => {
    if (!machine) return
    setIsArchiveConfirmOpen(true)
  }

  const confirmArchive = async () => {
    if (!machine) return
    setIsArchiving(true)
    try {
      const res = await archiveMachineryAction(machine.id)
      if (res.success) {
        dispatchToast({
          type: 'success',
          title: 'Machinery Archived',
          titleBn: 'মেশিন আর্কাইভ করা হয়েছে',
          message: `Machine "${machine.name}" has been retired/archived.`,
        })
        router.push(getTenantNavHref('/production/machineries', pathname, tenantSlug))
      } else {
        dispatchToast({
          type: 'error',
          title: 'Archive Failed',
          titleBn: 'আর্কাইভ ব্যর্থ হয়েছে',
          message: res.error || 'Failed to archive.',
        })
      }
    } catch (err: any) {
      dispatchToast({
        type: 'error',
        title: 'Error',
        titleBn: 'ত্রুটি',
        message: err.message || 'Failed to archive.',
      })
    } finally {
      setIsArchiving(false)
    }
  }

  const handleUpdateAssignment = async (assignmentId: string, status: 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const res = await updateAssignmentStatusAction(assignmentId, status)
      if (res.success) {
        dispatchToast({
          type: 'success',
          title: 'Assignment Updated',
          titleBn: 'অ্যাসাইনমেন্ট আপডেট হয়েছে',
          message: `Job status updated to ${status}.`,
        })
        loadData()
      } else {
        dispatchToast({
          type: 'error',
          title: 'Update Failed',
          titleBn: 'আপডেট ব্যর্থ হয়েছে',
          message: res.error || 'Failed to update assignment.',
        })
      }
    } catch (err: any) {
      dispatchToast({
        type: 'error',
        title: 'Error',
        titleBn: 'ত্রুটি',
        message: err.message || 'An error occurred.',
      })
    }
  }

  if (!mounted || (loading && !machine)) {
    return (
      <div className="space-y-6 pb-12">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-md bg-slate-200 dark:bg-slate-800 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-6 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            <div className="h-4 w-1/4 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-64 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      </div>
    )
  }

  if (error || !machine) {
    return (
      <div className="space-y-4 pb-12">
        <Link
          href={getTenantNavHref('/production/machineries', pathname, tenantSlug)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Machineries</span>
        </Link>
        <Card className="p-8 text-center border-red-200 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-300 space-y-3">
          <AlertOctagon className="h-8 w-8 text-red-600 mx-auto" />
          <h3 className="text-base font-bold">{error || 'Machine Not Found'}</h3>
          <Button size="sm" onClick={() => loadData()}>Retry</Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href={getTenantNavHref('/production/machineries', pathname, tenantSlug)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Fleet Registry</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => loadData()} className="gap-1.5 h-8">
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Main Machine Header Banner */}
      <Card className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {machine.name}
              </h1>
              <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-200 dark:border-slate-700">
                {machine.code}
              </span>
              <MachineryStatusBadge status={machine.status} />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">{machine.machine_type.replace(/_/g, ' ')}</span>
              <span>•</span>
              <span>Dept: <strong className="capitalize text-slate-700 dark:text-slate-300">{machine.department}</strong></span>
              <span>•</span>
              <span>Location: <strong className="text-slate-700 dark:text-slate-300">{machine.location || 'Main Workshop Floor'}</strong></span>
              {machine.branch && (
                <>
                  <span>•</span>
                  <span>Branch: <strong className="text-slate-700 dark:text-slate-300">{machine.branch.name}</strong></span>
                </>
              )}
            </div>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            {canAssign && machine.status !== 'breakdown' && machine.status !== 'maintenance' && machine.status !== 'retired' && (
              <Button
                size="sm"
                onClick={() => setIsAssignOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1.5 shadow-sm"
              >
                <Clock className="h-4 w-4" />
                <span>Assign Job</span>
              </Button>
            )}

            {machine.status === 'breakdown' && machine.latest_breakdown ? (
              <Button
                size="sm"
                onClick={() => setResolvingBreakdown(machine.latest_breakdown || null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-sm"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Resolve Breakdown</span>
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReportBreakdownOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Report Breakdown</span>
              </Button>
            )}

            {canMaintain && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsScheduleMaintOpen(true)}
                className="text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1.5"
              >
                <Wrench className="h-4 w-4" />
                <span>Schedule Maint</span>
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsStatusModalOpen(true)}
              className="gap-1.5"
            >
              <Activity className="h-4 w-4" />
              <span>Status</span>
            </Button>

            {canEdit && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsEditOpen(true)}
                className="gap-1.5"
              >
                <Edit className="h-4 w-4" />
                <span>Edit</span>
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Tabs Navigation Bar */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-1">
        {[
          { id: 'overview', label: '1. Overview & Costing', icon: FileText },
          { id: 'production', label: '2. Production Specs', icon: Sliders },
          { id: 'assignments', label: '3. Current Assignment', icon: Clock },
          { id: 'maintenance', label: '4. Maintenance History', icon: Wrench },
          { id: 'breakdowns', label: '5. Downtime & Breakdowns', icon: AlertTriangle },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Machine Specs Card */}
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                Machine Profile & Information
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Brand</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{machine.brand || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Model</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{machine.model || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Serial Number</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{machine.serial_number || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Supplier</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{machine.supplier || 'Direct Import'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Purchase Date</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {formatDate(machine.purchase_date)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Warranty Expiry</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {machine.warranty_expiry ? formatDate(machine.warranty_expiry) : 'Expired / None'}
                  </span>
                </div>
              </div>

              {machine.description && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-400 block uppercase text-2xs font-bold">Description / Technical Notes</span>
                  <p className="text-slate-700 dark:text-slate-300 mt-0.5">{machine.description}</p>
                </div>
              )}
            </Card>

            {/* Costing Card (Permission Gated) */}
            {canCostView && (
              <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-600" />
                    <span>Hourly Operating Costs & Financial Attributes</span>
                  </h3>
                  <Badge variant="outline" className="text-2xs font-bold">V4 Costing Ready</Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block uppercase text-2xs font-bold">Hourly Machine Run Rate</span>
                    <span className="font-black text-base text-blue-600 dark:text-blue-400">
                      ৳{machine.hourly_machine_cost?.toLocaleString()} / hr
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block uppercase text-2xs font-bold">Per-Unit / SFT Overhead</span>
                    <span className="font-black text-base text-slate-800 dark:text-slate-200">
                      ৳{machine.per_unit_machine_cost} / sft
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block uppercase text-2xs font-bold">Electricity / Energy Rate</span>
                    <span className="font-black text-base text-amber-600">
                      ৳{machine.electricity_cost_per_hour} / hr
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block uppercase text-2xs font-bold">Maintenance Reserve</span>
                    <span className="font-black text-base text-slate-800 dark:text-slate-200">
                      ৳{machine.maintenance_cost_per_hour} / hr
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block uppercase text-2xs font-bold">Other Floor Overhead</span>
                    <span className="font-black text-base text-slate-800 dark:text-slate-200">
                      ৳{machine.other_operating_cost_per_hour} / hr
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <span className="text-slate-400 block uppercase text-2xs font-bold">Asset Purchase Cost</span>
                    <span className="font-black text-base text-slate-800 dark:text-slate-200">
                      ৳{machine.purchase_cost?.toLocaleString()}
                    </span>
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* Right Column: Status & Next Maintenance Widget */}
          <div className="space-y-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Operating Status
              </h3>
              <div className="flex items-center justify-between">
                <MachineryStatusBadge status={machine.status} />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsStatusModalOpen(true)}
                  className="h-7 text-xs"
                >
                  Change
                </Button>
              </div>

              {machine.status_notes && (
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                  {machine.status_notes}
                </div>
              )}
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
                Next Scheduled Maintenance
              </h3>
              {machine.next_maintenance ? (
                <div className="p-2.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                  <span className="font-bold block capitalize">{machine.next_maintenance.maintenance_type} Maintenance</span>
                  <span className="block text-2xs">Due: {formatDate(machine.next_maintenance.scheduled_date)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCompletingMaint(machine.next_maintenance || null)}
                    className="w-full mt-2 h-7 text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    Mark Completed
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-slate-500 py-1">
                  No upcoming maintenance scheduled.
                  <Button
                    size="sm"
                    variant="link"
                    onClick={() => setIsScheduleMaintOpen(true)}
                    className="p-0 text-blue-600 block mt-1 text-xs font-bold"
                  >
                    + Schedule Routine Service
                  </Button>
                </div>
              )}
            </Card>

            {/* Retire Option */}
            <Card className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs space-y-2">
              <h3 className="font-bold text-slate-700 dark:text-slate-300">Retire from Service</h3>
              <p className="text-slate-500 text-2xs">
                Retiring a machine prevents new job assignments while preserving all historical production and cost logs.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleArchive}
                className="w-full text-slate-600 hover:bg-red-50 hover:text-red-600 border-slate-300 dark:border-slate-700"
              >
                Archive / Retire Machine
              </Button>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: PRODUCTION SPECIFICATIONS */}
      {activeTab === 'production' && (
        <div className="space-y-6">
          <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2 mb-3">
              Dimensional Limits & Capacity Parameters
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Max Width</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {machine.max_width ? `${machine.max_width} ${machine.dimension_unit}` : 'Continuous'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Max Height / Length</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {machine.max_height ? `${machine.max_height} ${machine.dimension_unit}` : 'Roll Fed'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Min Width</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {machine.min_width ? `${machine.min_width} ${machine.dimension_unit}` : 'None'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Rated Capacity</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {machine.production_capacity} {machine.capacity_unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Estimated Speed</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {machine.estimated_speed} {machine.speed_unit}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Setup Time</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{machine.setup_time_mins} mins</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Changeover Time</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{machine.changeover_time_mins} mins</span>
              </div>
              <div>
                <span className="text-slate-400 block uppercase text-2xs font-bold">Operators Required</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{machine.operators_required_count} Person</span>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                Supported Materials
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(machine.supported_materials || []).length > 0 ? (
                  machine.supported_materials.map((mat, i) => (
                    <Badge key={i} variant="outline" className="bg-slate-50 dark:bg-slate-800 text-xs font-semibold">
                      {mat}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">All standard materials supported.</span>
                )}
              </div>
            </Card>

            <Card className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">
                Supported Production Types
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {(machine.supported_production_types || []).length > 0 ? (
                  machine.supported_production_types.map((type, i) => (
                    <Badge key={i} variant="outline" className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 text-xs font-semibold">
                      {type}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">General printing & fabrication operations.</span>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 3: CURRENT ASSIGNMENT */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Production Job Allocations & Run Queue
            </h3>
            {canAssign && machine.status !== 'breakdown' && machine.status !== 'maintenance' && (
              <Button size="sm" onClick={() => setIsAssignOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-1">
                <Plus className="h-4 w-4" />
                <span>+ Assign New Job</span>
              </Button>
            )}
          </div>

          {machine.current_assignment ? (
            <Card className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-blue-600 text-white text-2xs font-bold mb-1">
                    {machine.current_assignment.status === 'in_progress' ? '⚡ RUNNING NOW' : '📅 SCHEDULED'}
                  </Badge>
                  <h4 className="font-black text-base text-slate-900 dark:text-white">
                    Job #{machine.current_assignment.job_order?.job_number || machine.current_assignment.production_job?.production_job_number || 'Direct Ticket'}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Product: <strong>{machine.current_assignment.job_order?.product_name || machine.current_assignment.production_job?.product_name || 'Commercial Print'}</strong> • Client: {machine.current_assignment.job_order?.customer_name || 'Walk-in'}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {machine.current_assignment.status === 'scheduled' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateAssignment(machine.current_assignment!.id, 'in_progress')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs"
                    >
                      Start Run
                    </Button>
                  )}
                  {machine.current_assignment.status === 'in_progress' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateAssignment(machine.current_assignment!.id, 'completed')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs"
                    >
                      Mark Completed
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-2.5 rounded bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900 text-xs">
                <div>
                  <span className="text-slate-400 block text-2xs uppercase font-bold">Operator</span>
                  <span className="font-bold">{machine.current_assignment.operator_name || 'Assigned'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase font-bold">Scheduled Start</span>
                  <span className="font-bold">{formatDateTime(machine.current_assignment.scheduled_start)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase font-bold">Expected End</span>
                  <span className="font-bold">{formatDateTime(machine.current_assignment.scheduled_end)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-2xs uppercase font-bold">Status</span>
                  <span className="font-bold capitalize">{machine.current_assignment.status}</span>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center border-dashed border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <Clock className="h-6 w-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No active job currently assigned</p>
              <p className="text-2xs text-slate-500 mt-0.5">Machine is available on the floor for new job order allocation.</p>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: MAINTENANCE */}
      {activeTab === 'maintenance' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Preventive & Corrective Maintenance History
            </h3>
            {canMaintain && (
              <Button size="sm" onClick={() => setIsScheduleMaintOpen(true)} className="bg-amber-600 hover:bg-amber-700 text-white font-bold gap-1">
                <Plus className="h-4 w-4" />
                <span>+ Schedule Maintenance</span>
              </Button>
            )}
          </div>

          {machine.next_maintenance ? (
            <Card className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <Badge className="bg-amber-600 text-white text-2xs font-bold mb-1">UPCOMING SERVICE</Badge>
                  <h4 className="font-bold text-sm capitalize">{machine.next_maintenance.maintenance_type} Maintenance</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Scheduled Date: <strong>{formatDate(machine.next_maintenance.scheduled_date)}</strong> • Technician: {machine.next_maintenance.technician_name || 'Technical Team'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setCompletingMaint(machine.next_maintenance || null)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs"
                >
                  Complete Service
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center border-dashed border border-slate-200 dark:border-slate-800">
              <Wrench className="h-6 w-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All maintenance records are up to date</p>
            </Card>
          )}
        </div>
      )}

      {/* TAB 5: BREAKDOWNS & DOWNTIME */}
      {activeTab === 'breakdowns' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Breakdown & Downtime Incidents
            </h3>
            {machine.status === 'breakdown' && machine.latest_breakdown ? (
              <Button
                size="sm"
                onClick={() => setResolvingBreakdown(machine.latest_breakdown || null)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Resolve Active Breakdown
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReportBreakdownOpen(true)}
                className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1"
              >
                <AlertTriangle className="h-4 w-4" />
                <span>Report Breakdown</span>
              </Button>
            )}
          </div>

          {machine.latest_breakdown ? (
            <Card className={`p-4 border space-y-3 ${
              machine.latest_breakdown.status === 'resolved'
                ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                : 'bg-red-50/60 dark:bg-red-950/30 border-red-200 dark:border-red-900'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant={machine.latest_breakdown.status === 'resolved' ? 'outline' : 'destructive'} className="text-2xs font-bold uppercase">
                      {machine.latest_breakdown.status}
                    </Badge>
                    <Badge variant="outline" className="text-2xs font-bold capitalize">
                      Severity: {machine.latest_breakdown.severity}
                    </Badge>
                  </div>
                  <h4 className="font-black text-sm text-slate-900 dark:text-white">
                    {machine.latest_breakdown.problem_title}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                    {machine.latest_breakdown.problem_description}
                  </p>
                </div>

                {machine.latest_breakdown.status !== 'resolved' && (
                  <Button
                    size="sm"
                    onClick={() => setResolvingBreakdown(machine.latest_breakdown || null)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-8 text-xs"
                  >
                    Resolve
                  </Button>
                )}
              </div>

              {machine.latest_breakdown.repair_action && (
                <div className="p-2.5 rounded bg-slate-50 dark:bg-slate-800 text-xs border border-slate-100 dark:border-slate-800 space-y-1">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">Repair Action & Resolution:</span>
                  <p className="text-slate-600 dark:text-slate-300">{machine.latest_breakdown.repair_action}</p>
                  {machine.latest_breakdown.downtime_minutes > 0 && (
                    <span className="text-2xs text-slate-500 block mt-1">
                      Total Downtime: <strong>{machine.latest_breakdown.downtime_minutes} Minutes</strong> • Repair Cost: <strong>৳{machine.latest_breakdown.repair_cost}</strong>
                    </span>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-8 text-center border-dashed border border-slate-200 dark:border-slate-800">
              <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Zero Breakdown Incidents</p>
              <p className="text-2xs text-slate-500 mt-0.5">Machine is running smoothly with no historical faults recorded.</p>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <MachineryFormModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        machinery={machine}
        onSuccess={() => loadData()}
      />

      <AssignMachineryModal
        open={isAssignOpen}
        onOpenChange={setIsAssignOpen}
        machine={machine}
        onSuccess={() => loadData()}
      />

      <ScheduleMaintenanceModal
        open={isScheduleMaintOpen}
        onOpenChange={setIsScheduleMaintOpen}
        machine={machine}
        onSuccess={() => loadData()}
      />

      <CompleteMaintenanceModal
        open={Boolean(completingMaint)}
        onOpenChange={(open) => !open && setCompletingMaint(null)}
        maintenance={completingMaint}
        machineId={machine.id}
        onSuccess={() => {
          setCompletingMaint(null)
          loadData()
        }}
      />

      <ReportBreakdownModal
        open={isReportBreakdownOpen}
        onOpenChange={setIsReportBreakdownOpen}
        machine={machine}
        onSuccess={() => loadData()}
      />

      <ResolveBreakdownModal
        open={Boolean(resolvingBreakdown)}
        onOpenChange={(open) => !open && setResolvingBreakdown(null)}
        breakdown={resolvingBreakdown}
        machineId={machine.id}
        onSuccess={() => {
          setResolvingBreakdown(null)
          loadData()
        }}
      />

      <StatusChangeModal
        open={isStatusModalOpen}
        onOpenChange={setIsStatusModalOpen}
        machine={machine}
        onSuccess={() => loadData()}
      />

      {/* Machinery Archive Confirm Dialog */}
      <ConfirmDialog
        open={isArchiveConfirmOpen}
        onOpenChange={setIsArchiveConfirmOpen}
        title={`Retire / Archive "${machine?.name || 'Machine'}"?`}
        titleBn={`"${machine?.name || 'মেশিন'}" আর্কাইভ করবেন?`}
        message={`Are you sure you want to retire "${machine?.name}"? It will no longer accept new production job assignments.`}
        messageBn={`আপনি কি এই মেশিনটি আর্কাইভ করতে চান? এটি আর নতুন কাজের জন্য বরাদ্দ করা যাবে না।`}
        confirmText="Retire / Archive"
        confirmTextBn="আর্কাইভ নিশ্চিত করুন"
        cancelText="Cancel"
        cancelTextBn="বাতিল"
        isDestructive={true}
        isLoading={isArchiving}
        onConfirm={confirmArchive}
      />
    </div>
  )
}
