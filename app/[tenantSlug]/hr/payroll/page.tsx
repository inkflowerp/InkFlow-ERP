'use client'

import { useI18n } from '@/i18n/context'

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
  const { tBilingual } = useI18n()
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
    <PanelAccessGuard module="payroll"action="view"panelTitle="Payroll"panelTitleBn="বেতন">
      <div className="min-h-screen bg-muted pb-12">
        <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
                        <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {tBilingual('Payroll & Compensation', 'বেতন ও পেরোল শিট')}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                {tBilingual('Generate, review, approve, lock and disburse workforce compensation.', 'কর্মীদের বেতন প্রস্তুত, পর্যালোচনা, অনুমোদন, লক ও পরিশোধ পরিচালনা করুন।')}
              </p>
            </div>

            <Button
 variant="outline"size="sm"onClick={loadData}
 disabled={isLoading || isPending}
 className="h-9 px-3 text-xs font-medium text-foreground bg-card border-border hover:bg-muted self-start sm:self-auto min-h-[36px]">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isLoading || isPending ? 'animate-spin' : ''}`} />
              <span>{tBilingual('Refresh', 'রিফ্রেশ')}</span>
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
            <DialogContent className="max-w-md p-6 bg-card border-border shadow-xs rounded-xl space-y-4">
              <DialogHeader>
                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-primary"/>
                  <span>{tBilingual('Generate Monthly Payroll Draft', 'মাসিক বেতনের ড্রাফট তৈরি করুন')}</span>
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
 Compiles verified attendance, approved overtime and advances into draft payroll items
                </p>
              </DialogHeader>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-danger-surface text-destructive text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-destructive"/>
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleGeneratePayroll} className="space-y-3.5 text-xs">
                <div>
                  <Label className="text-xs font-semibold text-foreground">{tBilingual('Payroll Period Name *', 'বেতন পিরিয়ডের নাম *')}</Label>
                  <Input
 value={periodName}
 onChange={(e) => setPeriodName(e.target.value)}
 className="h-9 text-xs mt-1"placeholder={tBilingual("e.g. October 2026 Payroll", "যেমন: অক্টোবর ২০২৬ বেতন")}/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">{tBilingual('Start Date', 'শুরুর তারিখ')}</Label>
                    <Input
 type="date"value={startDate}
 onChange={(e) => setStartDate(e.target.value)}
 className="h-9 text-xs mt-1"/>
                  </div>
                  <div>
                    <Label className="text-xs font-semibold text-foreground">{tBilingual('End Date', 'শেষের তারিখ')}</Label>
                    <Input
 type="date"value={endDate}
 onChange={(e) => setEndDate(e.target.value)}
 className="h-9 text-xs mt-1"/>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">{tBilingual('Working Days in Month', 'মাসের কর্মদিবস')}</Label>
                  <Input
 type="number"value={workingDays}
 onChange={(e) => setWorkingDays(parseInt(e.target.value) || 26)}
 className="h-9 text-xs mt-1 tabular-nums"/>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button
 type="button"variant="outline"size="sm"onClick={() => setGenerateModalOpen(false)}
 className="h-8 text-xs border-border">
 {tBilingual('Cancel', 'বাতিল')}
                  </Button>
                  <Button
 type="submit"size="sm"disabled={isSubmitting}
 className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px]">
                    {isSubmitting ? tBilingual('Generating...', 'তৈরি হচ্ছে...') : tBilingual('Generate Draft Sheet', 'ড্রাফট শিট তৈরি করুন')}
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
