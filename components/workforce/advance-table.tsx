'use client'

import React, { useState } from 'react'
import { useI18n } from '@/i18n/context'
import {
 Coins,
 Plus,
 CheckCircle2,
 Clock,
 Wallet,
 Check,
 X,
 CreditCard,
 AlertCircle,
 ChevronRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
 Dialog,
 DialogContent,
 DialogHeader,
 DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type {
 SalaryAdvanceRecord,
 EmployeeRecord,
 PaymentMethod,
 SalaryAdvanceStatus,
} from '@/types/workforce.types'

export interface AdvanceTableProps {
 advances: SalaryAdvanceRecord[]
 employees: EmployeeRecord[]
 isLoading?: boolean
 tenantSlug: string
 onCreateAdvance: (params: {
 employeeId: string
 amount: number
 paymentMethod: PaymentMethod
 reason?: string
  }) => Promise<void>
 onApproveAdvance?: (id: string) => Promise<void>
 onDisburseAdvance?: (id: string, paymentMethod: PaymentMethod) => Promise<void>
}

export function AdvanceTable({
 advances,
 employees,
 isLoading = false,
 tenantSlug,
 onCreateAdvance,
 onApproveAdvance,
 onDisburseAdvance,
}: AdvanceTableProps) {
  const { tBilingual } = useI18n()
 const [modalOpen, setModalOpen] = useState(false)
 const [selectedEmpId, setSelectedEmpId] = useState('')
 const [amount, setAmount] = useState<number>(5000)
 const [method, setMethod] = useState<PaymentMethod>('cash')
 const [reason, setReason] = useState('')
 const [isSubmitting, setIsSubmitting] = useState(false)
 const [errorMsg, setErrorMsg] = useState<string | null>(null)
 const [processingId, setProcessingId] = useState<string | null>(null)

 const handleCreate = async (e: React.FormEvent) => {
 e.preventDefault()
 setErrorMsg(null)

 if (!selectedEmpId) {
 setErrorMsg('Please select an employee.')
 return
    }
 if (amount <= 0) {
 setErrorMsg('Advance amount must be greater than zero.')
 return
    }

 setIsSubmitting(true)
 try {
 await onCreateAdvance({
 employeeId: selectedEmpId,
 amount,
 paymentMethod: method,
 reason,
      })
 setModalOpen(false)
 setReason('')
 setAmount(5000)
    } catch (err: any) {
 setErrorMsg(err.message || 'Failed to request advance.')
    } finally {
 setIsSubmitting(false)
    }
  }

 const handleApprove = async (id: string) => {
 if (!onApproveAdvance) return
 setProcessingId(id)
 try {
 await onApproveAdvance(id)
    } finally {
 setProcessingId(null)
    }
  }

 const handleDisburse = async (id: string, paymentMethod: PaymentMethod) => {
 if (!onDisburseAdvance) return
 setProcessingId(id)
 try {
 await onDisburseAdvance(id, paymentMethod)
    } finally {
 setProcessingId(null)
    }
  }

 const getStatusBadge = (status: SalaryAdvanceStatus) => {
 switch (status) {
 case 'disbursed':
 return 'bg-blue-50 text-blue-700 border-blue-200'
 case 'approved':
 return 'bg-emerald-50 text-emerald-700 border-emerald-200'
 case 'rejected':
 return 'bg-red-50 text-red-700 border-red-200'
 default:
 return 'bg-amber-50 text-amber-700 border-amber-200'
    }
  }

  // Summary Metrics
 const totalOutstanding = advances.reduce(
    (sum, a) => sum + (a.is_settled ? 0 : Number(a.remaining_amount || a.amount || 0)),
    0
  )
 const totalDisbursed = advances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
 const totalDeducted = advances.reduce((sum, a) => sum + Number(a.deducted_amount || 0), 0)

 return (
    <div className="space-y-4">
      {/* Advance Lifecycle Banner */}
      <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
 {tBilingual('Salary Advance Flow', 'বেতন অগ্রিম ও ঋণ সমন্বয়')}
            </h4>
            <p className="text-[11px] text-muted-foreground">
 {tBilingual('Request → Approval → Disbursement → Outstanding Balance → Payroll Deduction → Settled', 'আবেদন → অনুমোদন → বিতরণ → বকেয়া ব্যালেন্স → পেরোল কর্তন → সমন্বয়')}
            </p>
          </div>

          <Button
 size="sm"onClick={() => {
 setSelectedEmpId(employees[0]?.id || '')
 setModalOpen(true)
            }}
 className="h-8 px-3.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px] shrink-0">
            <Plus className="w-3.5 h-3.5 mr-1"/>
            <span>{tBilingual('Request Salary Advance', 'অগ্রিম বেতনের আবেদন')}</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg border border-border bg-muted">
            <span className="text-muted-foreground block text-[11px]">{tBilingual('Outstanding Balance', 'মোট বকেয়া ব্যালেন্স')}</span>
            <span className="text-base font-bold text-amber-600 tabular-nums">
              ৳ {totalOutstanding.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted">
            <span className="text-muted-foreground block text-[11px]">{tBilingual('Total Disbursed', 'মোট বিতরণকৃত')}</span>
            <span className="text-base font-bold text-foreground tabular-nums">
              ৳ {totalDisbursed.toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-3 rounded-lg border border-border bg-muted">
            <span className="text-muted-foreground block text-[11px]">{tBilingual('Recovered via Payroll', 'পেরোলে আদায়কৃত')}</span>
            <span className="text-base font-bold text-emerald-600 tabular-nums">
              ৳ {totalDeducted.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </Card>

      {/* Advance Records Table */}
      {isLoading ? (
        <Card className="bg-card border-border p-6">
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg"/>
            ))}
          </div>
        </Card>
      ) : advances.length === 0 ? (
        <Card className="bg-card border-border py-12 text-center">
          <p className="text-sm font-medium text-muted-foreground">{tBilingual('No outstanding advances', 'কোনো বকেয়া অগ্রিম নেই')}</p>
          <p className="text-xs text-muted-foreground mt-1">{tBilingual('There are no advance vouchers currently recorded.', 'বর্তমানে কোনো অগ্রিম ভাউচার রেকর্ড করা নেই।')}</p>
        </Card>
      ) : (
        <Card className="bg-card border-border shadow-[0_1px_3px_rgba(0,0,0,0.02)] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted border-b border-border text-muted-foreground uppercase tracking-wider font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">{tBilingual('Employee', 'কর্মী')}</th>
                  <th className="py-3 px-3">{tBilingual('Voucher #', 'ভাউচার নং')}</th>
                  <th className="py-3 px-3 text-right">{tBilingual('Amount', 'পরিমাণ')}</th>
                  <th className="py-3 px-3 text-right">{tBilingual('Deducted', 'আদায়কৃত')}</th>
                  <th className="py-3 px-3 text-right">{tBilingual('Remaining', 'অবশিষ্ট')}</th>
                  <th className="py-3 px-3">{tBilingual('Date', 'তারিখ')}</th>
                  <th className="py-3 px-3">{tBilingual('Method', 'মাধ্যম')}</th>
                  <th className="py-3 px-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  <th className="py-3 px-4 text-right">{tBilingual('Actions', 'অ্যাকশন')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {advances.map((adv) => {
 const remaining = Number(adv.remaining_amount || (Number(adv.amount || 0) - Number(adv.deducted_amount || 0)))
 const isProcessing = processingId === adv.id

 return (
                    <tr key={adv.id} className="hover:bg-muted transition-colors">
                      <td className="py-3 px-4 font-semibold text-foreground">
                        {adv.employee_name}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {adv.advance_voucher_number || '—'}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-foreground tabular-nums">
                        ৳ {Number(adv.amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-emerald-600 tabular-nums">
                        ৳ {Number(adv.deducted_amount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-600 tabular-nums">
                        ৳ {remaining.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 font-mono text-muted-foreground">
                        {adv.disbursed_date || '—'}
                      </td>
                      <td className="py-3 px-3 uppercase text-[11px] font-semibold text-muted-foreground">
                        {adv.payment_method}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <Badge
 variant="outline"className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
 adv.is_settled
                              ? 'bg-muted text-foreground border-input'
                              : getStatusBadge(adv.status)
                          }`}
                        >
                          {adv.is_settled ? 'Settled' : adv.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {adv.status === 'pending' && onApproveAdvance && (
                          <Button
 size="sm"disabled={isProcessing}
 onClick={() => handleApprove(adv.id)}
 className="h-7 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white min-h-[28px]">
                            <Check className="w-3 h-3 mr-1"/>
                            <span>Approve</span>
                          </Button>
                        )}

                        {adv.status === 'approved' && onDisburseAdvance && (
                          <Button
 size="sm"disabled={isProcessing}
 onClick={() => handleDisburse(adv.id, adv.payment_method)}
 className="h-7 px-2.5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[28px]">
                            <Coins className="w-3 h-3 mr-1"/>
                            <span>Disburse</span>
                          </Button>
                        )}

                        {adv.status === 'disbursed' && (
                          <span className="text-[11px] text-muted-foreground">
                            {adv.is_settled ? 'Recovered' : 'Active Balance'}
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Salary Advance Request Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md p-6 bg-card border-border shadow-xs rounded-xl space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-600"/>
              <span>Request Salary Advance</span>
            </DialogTitle>
          </DialogHeader>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600"/>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Select Employee *', 'কর্মী নির্বাচন করুন *')}</Label>
              <select
 value={selectedEmpId}
 onChange={(e) => setSelectedEmpId(e.target.value)}
 className="h-9 w-full rounded-md border border-border bg-card px-3 text-xs text-foreground mt-1">
                {employees.map((em) => (
                  <option key={em.id} value={em.id}>
                    {em.name} (Base: ৳ {Number(em.base_salary || 0).toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Advance Amount (৳) *', 'অগ্রিম পরিমাণ (৳) *')}</Label>
              <Input
 type="number"value={amount}
 onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
 className="h-9 text-xs font-bold tabular-nums mt-1"/>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Payment / Disburse Method', 'পরিশোধের মাধ্যম')}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 mt-1.5">
                {(['cash', 'bank', 'bkash', 'nagad', 'rocket'] as PaymentMethod[]).map((m) => (
                  <button
 key={m}
 type="button"onClick={() => setMethod(m)}
 className={`p-2 rounded-lg border text-center uppercase font-bold text-[11px] transition-all ${
 method === m
                        ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                        : 'border-border bg-card text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">{tBilingual('Reason / Purpose', 'কারণ / উদ্দেশ্য')}</Label>
              <Input
 placeholder={tBilingual('e.g. Medical emergency / Festival advance', 'যেমন: জরুরি চিকিৎসা / উৎসব অগ্রিম')}value={reason}
 onChange={(e) => setReason(e.target.value)}
 className="h-9 text-xs mt-1"/>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
 type="button"variant="outline"size="sm"onClick={() => setModalOpen(false)}
 className="h-8 text-xs border-border">
 Cancel
              </Button>
              <Button
 type="submit"size="sm"disabled={isSubmitting}
 className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground min-h-[32px]">
                {isSubmitting ? 'Requesting...' : 'Submit Advance'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
