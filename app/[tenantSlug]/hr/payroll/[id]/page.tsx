'use client'

import React, { useState, useEffect, useTransition, useCallback } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Printer,
  FileText,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { PanelAccessGuard } from '@/components/shared/panel-access-guard'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { PayrollSheet } from '@/components/workforce/payroll-sheet'
import { SalaryPaymentDialog } from '@/components/workforce/salary-payment-dialog'
import {
  getPayrollPeriodDetailAction,
  approvePayrollAction,
  lockPayrollAction,
  recordSalaryPaymentAction,
} from '@/actions/workforce.actions'
import type {
  PayrollPeriodRecord,
  PayrollItemRecord,
  PaymentMethod,
} from '@/types/workforce.types'

export default function PayrollPeriodDetailPage() {
  const params = useParams()
  const router = useRouter()
  const periodId = (params?.id as string) || ''
  const { company } = useTenant()
  const slug = (params?.tenantSlug as string) || company?.slug || 'my-company'

  const [period, setPeriod] = useState<PayrollPeriodRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Payment modal state
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<PayrollItemRecord | null>(null)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)

  const loadPeriod = useCallback(async () => {
    setIsLoading(true)
    setErrorMsg(null)
    try {
      const res = await getPayrollPeriodDetailAction(periodId)
      if (res.success && res.data) {
        setPeriod(res.data)
      } else {
        setErrorMsg(res.error || 'Payroll period record not found.')
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load payroll period.')
    } finally {
      setIsLoading(false)
    }
  }, [periodId])

  useEffect(() => {
    if (periodId) loadPeriod()
  }, [periodId, loadPeriod])

  const handleApprovePeriod = async () => {
    if (!period) return
    const res = await approvePayrollAction(period.id)
    if (res.success && res.data) {
      setPeriod(res.data)
    } else {
      throw new Error(res.error || 'Failed to approve payroll period.')
    }
  }

  const handleLockPeriod = async () => {
    if (!period) return
    const res = await lockPayrollAction(period.id)
    if (res.success && res.data) {
      setPeriod(res.data)
    } else {
      throw new Error(res.error || 'Failed to lock payroll period.')
    }
  }

  const handleRecordPayment = async (data: {
    payrollPeriodId: string
    payrollItemId: string
    employeeId: string
    amount: number
    paymentMethod: PaymentMethod
    referenceNumber?: string
    notes?: string
  }) => {
    const res = await recordSalaryPaymentAction(data)
    if (res.success && res.data) {
      await loadPeriod()
    } else {
      throw new Error(res.error || 'Failed to disburse salary payment.')
    }
  }

  return (
    <PanelAccessGuard module="payroll" action="view" panelTitle="Payroll Detail" panelTitleBn="বেতন শিট বিস্তারিত">
      <div className="min-h-screen bg-slate-50/60 pb-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between gap-4 pb-2">
            <Link
              href={`/${slug}/hr/payroll`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Payroll Periods</span>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="h-8 px-3 text-xs font-medium text-slate-700 bg-white border-slate-200 hover:bg-slate-50 min-h-[32px]"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                <span>Print Payroll Sheet</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={loadPeriod}
                disabled={isLoading || isPending}
                className="h-8 px-2.5 text-xs text-slate-700 bg-white border-slate-200 hover:bg-slate-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <Card className="p-8 text-center bg-white border-slate-200">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-900">{errorMsg}</h3>
              <Button asChild size="sm" className="mt-4 text-xs">
                <Link href={`/${slug}/hr/payroll`}>Return to Payroll Overview</Link>
              </Button>
            </Card>
          )}

          {/* Main Sheet */}
          {period && (
            <PayrollSheet
              period={period}
              items={period.items || []}
              isLoading={isLoading}
              tenantSlug={slug}
              onApprovePeriod={handleApprovePeriod}
              onLockPeriod={handleLockPeriod}
              onOpenPaymentModal={(item) => {
                setSelectedPaymentItem(item)
                setPaymentModalOpen(true)
              }}
            />
          )}

          {/* Salary Payment Modal */}
          {paymentModalOpen && selectedPaymentItem && period && (
            <SalaryPaymentDialog
              item={selectedPaymentItem}
              periodId={period.id}
              periodName={period.period_name}
              open={paymentModalOpen}
              onOpenChange={setPaymentModalOpen}
              onRecordPayment={handleRecordPayment}
            />
          )}
        </div>
      </div>
    </PanelAccessGuard>
  )
}
