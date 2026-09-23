'use client'

import React, { useState } from 'react'
import {
  User,
  Phone,
  MapPin,
  DollarSign,
  Plus,
  Printer,
  Receipt,
  FileSpreadsheet,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  Share2,
  ExternalLink,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CustomerRecord } from '@/types/crm.types'
import { InvoiceRecord, PaymentRecord } from '@/types/billing.types'
import { ProductionJobRecord } from '@/types/production.types'
import { formatBDT } from '@/lib/formatters'
import { NewWorkWizard } from '@/components/orders/new-work-wizard'
import { RecordPaymentModal } from '@/components/billing/record-payment-modal'

interface Customer360ViewProps {
  customer: CustomerRecord
  invoices?: InvoiceRecord[]
  payments?: PaymentRecord[]
  productionJobs?: ProductionJobRecord[]
  onRefresh?: () => void
}

export function Customer360View({
  customer,
  invoices = [],
  payments = [],
  productionJobs = [],
  onRefresh,
}: Customer360ViewProps) {
  const { tBilingual } = useI18n()
  const [activeTab, setActiveTab] = useState<'jobs' | 'invoices' | 'payments'>('jobs')
  const [isNewWorkOpen, setIsNewWorkOpen] = useState(false)
  const [isPaymentOpen, setIsPaymentOpen] = useState(false)

  const phone = (customer as any).phone || customer.mobile || ''
  const cleanPhone = phone.replace(/\D/g, '')
  const formattedPhone = cleanPhone.startsWith('880') ? cleanPhone : cleanPhone.startsWith('0') ? `88${cleanPhone}` : `880${cleanPhone}`
  const dueAmount = Number((customer as any).current_balance || (customer as any).total_due || 0)

  const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(
    `নমস্কার ${customer.name},\nInkFlow থেকে আপনার বর্তমান বাকি হিসাব: ৳${dueAmount.toLocaleString()}।\nধন্যবাদ!`
  )}`

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Customer 360 Header Banner */}
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 font-black text-xl shadow-xs">
              {customer.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100">
                  {customer.name}
                </h1>
                {customer.company_name && (
                  <Badge variant="outline" className="text-xs font-semibold">
                    {customer.company_name}
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {phone}
                </span>
                {customer.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {customer.address}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Due Balance Card */}
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 text-right min-w-[160px]">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              {tBilingual('Receivable Due', 'বাকি টাকা')}
            </div>
            <div className={`text-xl font-black font-mono ${dueAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              ৳{dueAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 flex-wrap">
            <a
              href={`tel:${phone}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 shadow-xs dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
            >
              <Phone className="h-3.5 w-3.5 text-blue-600" />
              {tBilingual('Call', 'কল দিন')}
            </a>

            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 shadow-xs dark:bg-emerald-950/40 dark:border-emerald-800 dark:text-emerald-300"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              {tBilingual('WhatsApp', 'হোয়াটসঅ্যাপ')}
            </a>

            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setIsPaymentOpen(true)}
              className="text-xs font-bold h-9 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <DollarSign className="h-3.5 w-3.5 mr-1 text-amber-600" />
              {tBilingual('Record Payment', 'পেমেন্ট গ্রহণ')}
            </Button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => setIsNewWorkOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold h-9 px-5 shadow-xs"
          >
            <Plus className="h-4 w-4 mr-1" />
            {tBilingual('New Work', 'নতুন কাজ')}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('jobs')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'jobs'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tBilingual('Active Jobs', 'চলমান কাজ সমূহ')} ({productionJobs.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'invoices'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tBilingual('Invoices & Bills', 'ইনভয়েস ও বিল')} ({invoices.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
            }`}
          >
            {tBilingual('Payment History', 'পেমেন্ট হিস্ট্রি')} ({payments.length})
          </button>
        </div>

        {/* Tab 1: Jobs */}
        {activeTab === 'jobs' && (
          <div className="space-y-2.5">
            {productionJobs.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
                {tBilingual('No active production jobs found for this customer.', 'এই কাস্টমারের কোনো চলমান প্রোডাকশন কাজ নেই।')}
              </Card>
            ) : (
              productionJobs.map((j) => (
                <Card key={j.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-slate-800 text-white text-xs font-mono font-bold">
                          #{j.production_job_number}
                        </Badge>
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{j.product_name}</span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {j.dimensions_spec} • {j.material_spec} • Qty: {j.quantity}
                      </p>
                    </div>

                    <div className="text-right">
                      <Badge variant="outline" className="text-xs font-semibold capitalize">
                        {j.status}
                      </Badge>
                      <div className="text-[11px] text-slate-500 mt-1">Due: {j.deadline}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 2: Invoices */}
        {activeTab === 'invoices' && (
          <div className="space-y-2.5">
            {invoices.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
                {tBilingual('No invoices recorded.', 'কোনো ইনভয়েস নেই।')}
              </Card>
            ) : (
              invoices.map((inv) => (
                <Card key={inv.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400">
                          {inv.invoice_number}
                        </span>
                        <Badge
                          className={`text-[10px] font-bold ${
                            inv.status === 'paid' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
                          }`}
                        >
                          {inv.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">Due Date: {inv.due_date}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100">
                        ৳{inv.grand_total.toLocaleString()}
                      </div>
                      {inv.due_amount && inv.due_amount > 0 ? (
                        <div className="text-xs font-bold text-rose-600 font-mono">
                          Due: ৳{inv.due_amount.toLocaleString()}
                        </div>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Tab 3: Payments */}
        {activeTab === 'payments' && (
          <div className="space-y-2.5">
            {payments.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-500 border-dashed">
                {tBilingual('No payments recorded yet.', 'কোনো পেমেন্ট রেকর্ড পাওয়া যায়নি।')}
              </Card>
            ) : (
              payments.map((p) => (
                <Card key={p.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono">{p.receipt_number}</span>
                        <Badge variant="outline" className="text-[10px] uppercase font-bold">
                          {p.payment_method}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500">Received by: {p.received_by_name || 'Cashier'}</p>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-bold font-mono text-emerald-600">
                        +৳{p.amount.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">{p.created_at.split('T')[0]}</div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* New Work Modal */}
      {isNewWorkOpen && (
        <NewWorkWizard
          isOpen={true}
          isInlineModal={true}
          onClose={() => setIsNewWorkOpen(false)}
          onSuccess={() => {
            setIsNewWorkOpen(false)
            onRefresh?.()
          }}
        />
      )}

      {/* Payment Modal */}
      {isPaymentOpen && (
        <RecordPaymentModal
          open={isPaymentOpen}
          onOpenChange={setIsPaymentOpen}
          preselectedCustomerId={customer.id}
          onPaymentRecorded={() => {
            setIsPaymentOpen(false)
            onRefresh?.()
          }}
        />
      )}
    </div>
  )
}
