'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Printer,
  Play,
  Pause,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Layers,
  Wrench,
  Truck,
  RotateCcw,
  Sparkles,
  Search,
  ExternalLink,
  Users,
  AlertOctagon,
  TrendingUp,
  Scissors,
  Check,
  FileCheck,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { FeatureGate } from '@/components/subscriptions/feature-gate'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import {
  getDepartmentColumns,
} from '@/lib/formatters'
import {
  ProductionJobRecord,
  ProductionDepartment,
  ProductionJobStatus,
  ProductionReworkRecord,
  JobPriority,
} from '@/types/production.types'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

const DEPARTMENTS = [
  { id: 'all', label: 'All Operations', icon: Printer },
  { id: 'pre_press', label: 'Pre-Press / Rip', icon: FileCheck },
  { id: 'printing', label: 'Wide & Flatbed Print', icon: Printer },
  { id: 'finishing', label: 'Lamination & Die-cut', icon: Layers },
  { id: 'fabrication', label: 'Metal & Acrylic Fab', icon: Wrench },
  { id: 'installation', label: 'On-Site Installation', icon: Truck },
]

export default function ProductionDashboardPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [jobs, setJobs] = useDataStore<ProductionJobRecord[]>(STORAGE_KEYS.PRODUCTION_JOBS, [])
  const [selectedDept, setSelectedDept] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Action Modals
  const [selectedJobForRework, setSelectedJobForRework] = useState<ProductionJobRecord | null>(null)
  const [selectedJobForPause, setSelectedJobForPause] = useState<ProductionJobRecord | null>(null)
  const [pauseReason, setPauseReason] = useState('')

  // Rework Form State
  const [reworkReason, setReworkReason] = useState('')
  const [reworkDept, setReworkDept] = useState<ProductionDepartment>('printing')
  const [materialWastage, setMaterialWastage] = useState('')
  const [extraLaborHours, setExtraLaborHours] = useState<number>(2)
  const [additionalHours, setAdditionalHours] = useState<number>(4)
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Filter Jobs by Dept & Search
  const filteredJobs = jobs.filter((job) => {
    const matchDept = selectedDept === 'all' || job.department === selectedDept
    const matchSearch =
      job.production_job_number.toLowerCase().includes(search.toLowerCase()) ||
      job.product_name.toLowerCase().includes(search.toLowerCase()) ||
      job.customer_name.toLowerCase().includes(search.toLowerCase())

    return matchDept && matchSearch
  })

  // Executive Count Badges
  const totalJobs = jobs.length
  const countInProgress = jobs.filter((j) => j.status === 'in_progress').length
  const countUrgent = jobs.filter((j) => j.priority === 'urgent' || j.priority === 'very_urgent').length
  const countRework = jobs.filter((j) => j.status === 'rework' || j.has_rework).length
  const countCompleted = jobs.filter((j) => j.status === 'completed').length

  const handleUpdateStatus = (jobId: string, newStatus: ProductionJobStatus) => {
    PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, jobId, {
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    showNotification(`Job #${jobId.slice(-6).toUpperCase()} status changed to ${newStatus}.`)
  }

  const handleStartJob = (jobId: string) => {
    handleUpdateStatus(jobId, 'in_progress')
  }

  const handleCompleteJob = (jobId: string) => {
    handleUpdateStatus(jobId, 'completed')
  }

  // Quick Action: Pause Job
  const handleConfirmPause = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJobForPause) return

    PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, selectedJobForPause.id, {
      status: 'paused',
      pause_reason: pauseReason,
      updated_at: new Date().toISOString(),
    })
    setSelectedJobForPause(null)
    setPauseReason('')
    showNotification('Job production paused with reason logged.')
  }

  // Quick Action: Log Rework & Scrap
  const handleConfirmRework = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedJobForRework) return

    const reworkNum = `RW-${Date.now().toString().slice(-4)}`
    const newRework: ProductionReworkRecord = {
      id: `rw-${Date.now()}`,
      production_job_id: selectedJobForRework.id,
      rework_number: reworkNum,
      reason: reworkReason,
      responsible_department: reworkDept,
      material_wastage: materialWastage,
      extra_labor_hours: extraLaborHours,
      additional_time_hours: additionalHours,
      estimated_wastage_cost: extraLaborHours * 500 + 1500,
      reported_by_name: 'Floor QC Inspector',
      status: 'in_rework',
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<ProductionReworkRecord>(STORAGE_KEYS.REWORKS, newRework)
    PrintERPDataStore.updateItem<ProductionJobRecord>(STORAGE_KEYS.PRODUCTION_JOBS, selectedJobForRework.id, {
      has_rework: true,
      rework_count: (selectedJobForRework.rework_count || 0) + 1,
      status: 'rework',
      reworks: [newRework, ...(selectedJobForRework.reworks || [])],
      updated_at: new Date().toISOString(),
    })

    setSelectedJobForRework(null)
    setReworkReason('')
    showNotification(`Rework ticket ${reworkNum} created. Additional scrap & labor logged.`)
  }

  const activeColumns = getDepartmentColumns(selectedDept)

  return (
    <FeatureGate feature="production">
      <div className="space-y-6 max-w-7xl">
        {/* Header */}
        <PageHeader
          titleEn="Shop Floor Production Terminal"
          titleBn="শপ ফ্লোর প্রোডাকশন টার্মিনাল"
          descriptionEn="Dispatch, track, pause, and log reworks across printing, finishing, fabrication, and installation."
          descriptionBn="প্রিন্টিং, ফিনিশিং, ফেব্রিকেশন এবং ইনস্টলেশন পর্যায়ের জব ট্র্যাকিং ও রি-ওয়ার্ক পর্যবেক্ষণ করুন।"
          icon={Printer}
          iconColor="text-blue-600"
          actions={
            <Link href={`/${slug}/orders`}>
              <Button variant="outline" size="sm" className="text-xs bangla-text">
                {tBilingual('View Sales Orders', 'সকল সেলস অর্ডার')}
              </Button>
            </Link>
          }
        />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Production Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
        <Card className="p-3.5">
          <span className="text-xs font-semibold text-slate-500">Floor Jobs (মোট কাজ)</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalJobs}</div>
          <span className="text-[11px] text-slate-400">Active machine bays</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500">In Progress (প্রিন্ট চলছে)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">{countInProgress}</div>
          <span className="text-[11px] text-blue-600 font-medium">Running on presses</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-amber-500">
          <span className="text-xs font-semibold text-slate-500">Urgent Priority</span>
          <div className="text-2xl font-black text-amber-600 mt-1">{countUrgent}</div>
          <span className="text-[11px] text-amber-600 font-medium">Priority queue</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-red-500 bg-red-50/20 dark:bg-red-950/10">
          <span className="text-xs font-semibold text-red-700 dark:text-red-400">Rework & Scrap (পুনঃকাজ)</span>
          <div className="text-2xl font-black text-red-600 mt-1">{countRework}</div>
          <span className="text-[11px] text-red-600 font-medium">Material wastage logged</span>
        </Card>

        <Card className="p-3.5 border-l-4 border-l-emerald-500">
          <span className="text-xs font-semibold text-slate-500">Completed Today</span>
          <div className="text-2xl font-black text-emerald-600 mt-1">{countCompleted}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Passed final QC</span>
        </Card>
      </div>

      {/* Department Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {DEPARTMENTS.map((dept) => {
            const Icon = dept.icon
            const isSelected = selectedDept === dept.id

            return (
              <Button
                key={dept.id}
                size="sm"
                variant={isSelected ? 'default' : 'ghost'}
                onClick={() => setSelectedDept(dept.id)}
                className={`text-xs h-8 px-3 whitespace-nowrap ${
                  isSelected ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <Icon className="h-3.5 w-3.5 mr-1.5" />
                {dept.label}
              </Button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Search job #, product, operator..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs bg-white dark:bg-slate-950"
          />
        </div>
      </div>

      {/* =========================================================================
          DYNAMIC ADAPTIVE KANBAN BOARD
          Columns change dynamically based on the selected department!
         ========================================================================= */}
      <div className={`grid grid-cols-1 md:grid-cols-${activeColumns.length} gap-4 overflow-x-auto pb-4`}>
        {activeColumns.map((col) => {
          const colJobs = filteredJobs.filter((j) => col.statusMatch.includes(j.status))

          return (
            <div
              key={col.id}
              className="bg-slate-50/90 dark:bg-slate-900/60 rounded-xl p-3 border border-slate-200 dark:border-slate-800 flex flex-col min-w-[280px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800 mb-3">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {col.title}
                </span>
                <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-bold flex items-center justify-center text-slate-600 dark:text-slate-400">
                  {colJobs.length}
                </span>
              </div>

              {/* Job Cards */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[650px]">
                {colJobs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs italic">
                    No jobs in this stage.
                  </div>
                ) : (
                  colJobs.map((job) => (
                    <Card
                      key={job.id}
                      className={`p-3.5 border transition-all ${
                        job.status === 'rework'
                          ? 'border-red-400 bg-red-50/20 dark:bg-red-950/20'
                          : job.status === 'paused'
                          ? 'border-amber-300 bg-amber-50/20 dark:bg-amber-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950'
                      }`}
                    >
                      {/* Top Meta: Job # & Priority */}
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400">
                          {job.production_job_number}
                        </span>

                        <div className="flex items-center gap-1">
                          {job.priority === 'very_urgent' && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-black text-red-600 bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded border border-red-200 animate-pulse">
                              <Flame className="h-2.5 w-2.5" /> Urgent
                            </span>
                          )}

                          <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {job.department}
                          </span>
                        </div>
                      </div>

                      {/* Title & Customer */}
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white">
                        {job.product_name}
                      </h4>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {job.customer_name}
                      </div>

                      {/* Specs: Dimensions, Material */}
                      <div className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Size:</span>
                          <strong className="font-mono text-slate-800 dark:text-slate-200">
                            {job.dimensions_spec}
                          </strong>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Material:</span>
                          <span className="text-slate-600 dark:text-slate-300 truncate max-w-[150px]">
                            {job.material_spec}
                          </span>
                        </div>
                      </div>

                      {/* Finishing / Fabrication Task Tags */}
                      {job.finishing_tasks && job.finishing_tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.finishing_tasks.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}

                      {job.fabrication_tasks && job.fabrication_tasks.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.fabrication_tasks.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] capitalize px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200"
                            >
                              {t.replace('_', ' ')}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Workers & Deadline */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] flex items-center justify-between text-slate-500">
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3 text-slate-400" />
                          <span className="truncate max-w-[120px]">
                            {job.assigned_workers[0] || 'Unassigned'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 text-red-600 font-semibold font-mono">
                          <Clock className="h-3 w-3" />
                          <span>{job.deadline.split(' ')[0]}</span>
                        </div>
                      </div>

                      {/* Rework Alert Warning */}
                      {job.has_rework && (
                        <div className="mt-2 p-1.5 rounded bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-300 text-[10px] font-bold flex items-center gap-1 border border-red-300">
                          <AlertOctagon className="h-3 w-3 text-red-600 shrink-0" />
                          <span>Rework Active: {job.reworks?.[0]?.reason || 'Material defect'}</span>
                        </div>
                      )}

                      {/* 1-CLICK PRODUCTION ACTION BUTTONS */}
                      <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-1">
                        {job.status === 'queued' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartJob(job.id)}
                            className="h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Start Run
                          </Button>
                        )}

                        {job.status === 'in_progress' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedJobForPause(job)
                                setPauseReason('')
                              }}
                              className="h-7 text-[11px] px-2 border-amber-300 text-amber-700 hover:bg-amber-50"
                            >
                              <Pause className="h-3 w-3 mr-1" />
                              Pause
                            </Button>

                            <Button
                              size="sm"
                              onClick={() => handleCompleteJob(job.id)}
                              className="h-7 text-[11px] px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex-1"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              Complete
                            </Button>
                          </>
                        )}

                        {job.status === 'paused' && (
                          <Button
                            size="sm"
                            onClick={() => handleStartJob(job.id)}
                            className="h-7 text-[11px] px-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold flex-1"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Resume
                          </Button>
                        )}

                        {/* Rework Button (Allowed on any active job) */}
                        {job.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedJobForRework(job)
                              setReworkDept(job.department)
                              setReworkReason('')
                              setMaterialWastage('')
                            }}
                            className="h-7 text-[11px] px-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800"
                          >
                            <RotateCcw className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL: LOG REWORK & SCRAP */}
      <ModalDialog
        open={Boolean(selectedJobForRework)}
        onOpenChange={(open) => !open && setSelectedJobForRework(null)}
        title="Log Production Rework & Material Wastage"
        description="Records defective output, scrapped substrates, and overtime labor for shop floor auditing."
      >
        {selectedJobForRework && (
          <form onSubmit={handleConfirmRework} className="space-y-4 pt-1">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs">
              <span className="text-red-600 font-bold">Defective Job: </span>
              <strong>{selectedJobForRework.production_job_number}</strong> ({selectedJobForRework.product_name})
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rwkReason" required>Defect / Rework Reason</Label>
              <textarea
                id="rwkReason"
                rows={2}
                placeholder="e.g. Color banding streaks on Flora UV 3200; yellow printhead nozzle clogged."
                value={reworkReason}
                onChange={(e) => setReworkReason(e.target.value)}
                required
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rwkDept" required>Responsible Department</Label>
                <select
                  id="rwkDept"
                  value={reworkDept}
                  onChange={(e) => setReworkDept(e.target.value as ProductionDepartment)}
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
                >
                  <option value="printing">Printing</option>
                  <option value="finishing">Finishing</option>
                  <option value="fabrication">Fabrication</option>
                  <option value="design">Design / Prepress</option>
                  <option value="installation">Installation</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rwkWaste" required>Material Wastage (Scrapped)</Label>
                <Input
                  id="rwkWaste"
                  placeholder="e.g. 75 sft Panaflex 440gsm"
                  value={materialWastage}
                  onChange={(e) => setMaterialWastage(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rwkLab">Extra Labor Hours</Label>
                <Input
                  id="rwkLab"
                  type="number"
                  step="0.5"
                  value={extraLaborHours}
                  onChange={(e) => setExtraLaborHours(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rwkDel">Additional Time (Delivery Delay)</Label>
                <Input
                  id="rwkDel"
                  type="number"
                  step="0.5"
                  value={additionalHours}
                  onChange={(e) => setAdditionalHours(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedJobForRework(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Register Rework & Scrap Ticket
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL: PAUSE JOB */}
      <ModalDialog
        open={Boolean(selectedJobForPause)}
        onOpenChange={(open) => !open && setSelectedJobForPause(null)}
        title="Temporarily Pause Machine Run"
        description="Provide a reason for putting this job on hold (e.g. drying time, roll replacement, ink refill)."
      >
        {selectedJobForPause && (
          <form onSubmit={handleConfirmPause} className="space-y-4 pt-1">
            <div className="space-y-1.5">
              <Label htmlFor="pReason" required>Mandatory Pause Reason</Label>
              <textarea
                id="pReason"
                rows={3}
                placeholder="e.g. Waiting for solvent ink to dry before roll-up; replacing Konica magenta cartridge."
                value={pauseReason}
                onChange={(e) => setPauseReason(e.target.value)}
                required
                className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setSelectedJobForPause(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white">
                Confirm Pause
              </Button>
            </div>
          </form>
        )}
      </ModalDialog>
      </div>
    </FeatureGate>
  )
}
