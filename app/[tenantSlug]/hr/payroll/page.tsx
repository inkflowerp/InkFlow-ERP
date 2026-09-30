'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Wallet,
  Plus,
  RefreshCw,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { PayrollPeriodTable } from '@/components/workforce/payroll-period-table'
import {
  getPayrollPeriodsAction,
  generatePayrollDraftAction,
} from '@/actions/workforce.actions'
import type { PayrollPeriodRecord } from '@/types/workforce.types'

export default function PayrollPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useTenant()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [periods, setPeriods] = useState<PayrollPeriodRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const [generateModalOpen, setGenerateModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // New Period Form
  const defaultPeriodName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const [periodName, setPeriodName] = useState(`${defaultPeriodName} Payroll`)
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
  )
  const [workingDays, setWorkingDays] = useState(26)

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getPayrollPeriodsAction()
      if (res.success && res.data) {
        setPeriods(res.data)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleGeneratePayroll = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setIsSubmitting(true)
    try {
      const res = await generatePayrollDraftAction({
        periodName,
        startDate,
        endDate,
        workingDaysCount: workingDays,
      })
      if (res.success && res.data) {
        setGenerateModalOpen(false)
        router.push(`/${slug}/hr/payroll/${res.data.id}`)
      } else {
        setErrorMsg(res.error || 'Failed to generate payroll draft')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <PanelAccessGuard module="payroll" action="view" panelTitle="Payroll" panelTitleBn="বেতন">
      <div className="min-h-screen bg-slate-50/60 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Payroll
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-sm font-medium text-slate-500">বেতন ও পেরোল শিট</span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">
                  Generate, review, approve, lock and disburse workforce compensation
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading || isPending}
              className="h-9 px-3 text-xs font-medium text-slate-700 bg-white border-slate-200 hover:bg-slate-50 self-start sm:self-auto min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Periods Table with Lifecycle Stepper */}
          <PayrollPeriodTable
            periods={periods}
            isLoading={isLoading}
            tenantSlug={slug}
            onOpenGenerateModal={() => setGenerateModalOpen(true)}
          />

          {/* Generate Draft Modal */}
          <Dialog open={generateModalOpen} onOpenChange={setGenerateModalOpen}>
            <DialogContent className="max-w-md p-6 bg-white border-slate-200 shadow-xl rounded-2xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <span>Generate Monthly Payroll Draft</span>
                </DialogTitle>
                <p className="text-xs text-slate-500">
                  Compiles verified attendance, approved overtime and advances into draft payroll items
                </p>
              </DialogHeader>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleGeneratePayroll} className="space-y-3.5 text-xs">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Payroll Period Name *</Label>
                  <Input
                    value={periodName}
                    onChange={(e) => setPeriodName(e.target.value)}
                    className="h-9 text-xs mt-1"
                    placeholder="e.g. October 2026 Payroll"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Start Date</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">End Date</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-slate-700">Working Days in Month</Label>
                  <Input
                    type="number"
                    value={workingDays}
                    onChange={(e) => setWorkingDays(parseInt(e.target.value) || 26)}
                    className="h-9 text-xs mt-1 tabular-nums"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setGenerateModalOpen(false)}
                    className="h-8 text-xs border-slate-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSubmitting}
                    className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white min-h-[32px]"
                  >
                    {isSubmitting ? 'Generating...' : 'Generate Draft Sheet'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </PanelAccessGuard>
  )
}
