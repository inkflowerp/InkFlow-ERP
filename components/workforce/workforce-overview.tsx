'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import {
  Users,
  UserPlus,
  RefreshCw,
  QrCode,
  Calendar,
  Wallet,
  AlertCircle,
  Clock,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/shared/page-header'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { WorkforceKpiGrid } from './workforce-kpi-grid'
import { AttendanceSummaryWidget } from './attendance-summary-widget'
import { PayrollSummaryWidget } from './payroll-summary-widget'
import { PendingActionsCard } from './pending-actions-card'
import {
  getWorkforceOverviewSummaryAction,
  type WorkforceOverviewSummary,
} from '@/actions/workforce.actions'

export interface WorkforceOverviewProps {
  tenantSlug: string
}

export function WorkforceOverview({ tenantSlug }: WorkforceOverviewProps) {
  const [data, setData] = useState<WorkforceOverviewSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const fetchOverview = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getWorkforceOverviewSummaryAction()
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setError(res.error || 'Failed to load workforce overview.')
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while loading data.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOverview()

    // Targeted single event listener for workforce updates
    const handleTargetedSync = (e: CustomEvent) => {
      // Re-fetch only when relevant event fires
      startTransition(() => {
        fetchOverview()
      })
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('workforce_state_changed' as any, handleTargetedSync as any)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('workforce_state_changed' as any, handleTargetedSync as any)
      }
    }
  }, [fetchOverview])

  return (
    <PanelAccessGuard module="hr" action="view" panelTitle="Workforce Overview" panelTitleBn="কর্মী ব্যবস্থাপনা">
      <div className="min-h-screen bg-slate-50/60 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Workforce Overview
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-slate-500">কর্মী ব্যবস্থাপনা</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">Real-time attendance, payroll & operations</span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOverview}
                disabled={isLoading || isPending}
                className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border-slate-200 hover:bg-slate-50 min-h-[36px]"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </Button>

              <Button
                asChild
                variant="outline"
                size="sm"
                className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border-slate-200 hover:bg-slate-50 min-h-[36px]"
              >
                <Link href={`/${tenantSlug}/hr/attendance?mode=qr`}>
                  <QrCode className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  <span>QR Punch</span>
                </Link>
              </Button>

              <Button
                asChild
                size="sm"
                className="h-9 px-3.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm min-h-[36px]"
              >
                <Link href={`/${tenantSlug}/hr/employees?action=new`}>
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  <span>Add Employee</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Error State */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOverview}
                className="text-xs border-red-300 hover:bg-red-100 text-red-800 h-8"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Row 1: Decision-Useful 6 Top KPI Cards */}
          <WorkforceKpiGrid
            totalEmployees={data?.kpis.totalEmployees || 0}
            presentToday={data?.kpis.presentToday || 0}
            absentToday={data?.kpis.absentToday || 0}
            lateToday={data?.kpis.lateToday || 0}
            payrollDue={data?.kpis.payrollDue || 0}
            overtimePendingHours={data?.kpis.overtimePending || 0}
            isLoading={isLoading}
            tenantSlug={tenantSlug}
          />

          {/* Row 2: Attendance vs Payroll Status */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            <AttendanceSummaryWidget
              present={data?.todayAttendance.present || 0}
              late={data?.todayAttendance.late || 0}
              leave={data?.todayAttendance.leave || 0}
              absent={data?.todayAttendance.absent || 0}
              currentlyWorking={data?.todayAttendance.currentlyWorking || 0}
              totalActive={data?.todayAttendance.totalActive || 0}
              isLoading={isLoading}
              tenantSlug={tenantSlug}
            />

            <PayrollSummaryWidget
              periodName={data?.payrollStatus.periodName || 'Current Month'}
              grossPayroll={data?.payrollStatus.grossPayroll || 0}
              paid={data?.payrollStatus.paid || 0}
              pending={data?.payrollStatus.pending || 0}
              due={data?.payrollStatus.due || 0}
              isLoading={isLoading}
              tenantSlug={tenantSlug}
            />
          </div>

          {/* Row 3: Actionable Pending Approvals */}
          <PendingActionsCard
            items={data?.pendingActions || []}
            isLoading={isLoading}
            tenantSlug={tenantSlug}
          />
        </div>
      </div>
    </PanelAccessGuard>
  )
}
