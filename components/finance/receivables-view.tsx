'use client'

import React, { useState, useMemo } from 'react'
import {
 Users,
 Search,
 Filter,
 DollarSign,
 ArrowDownLeft,
 Calendar,
 MessageCircle,
 Phone,
 Copy,
 Check,
 CheckCircle2,
 AlertTriangle,
 Receipt,
 FileText,
 Clock,
 ExternalLink,
 ChevronRight,
 TrendingUp,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { CustomerRecord } from '@/types/crm.types'
import type { AccountRecord, ReceivablesAgingSummary, FinancialTransactionRecord } from '@/types/finance.types'

export interface ReceivablesViewProps {
 receivables: ReceivablesAgingSummary | null
 customers: CustomerRecord[]
 accounts: AccountRecord[]
 transactions?: FinancialTransactionRecord[]
 onOpenCollectModal: (customerId?: string, customerName?: string, dueAmount?: number, invoiceId?: string) => void
}

export function ReceivablesView({
 receivables,
 customers,
 accounts,
 transactions = [],
 onOpenCollectModal,
}: ReceivablesViewProps) {
 const { tBilingual } = useI18n()
 const [activeSubTab, setActiveSubTab] = useState<'customer_due' | 'invoice_due' | 'payment_history' | 'aging'>('customer_due')
 const [searchQuery, setSearchQuery] = useState('')
 const [copiedCustomer, setCopiedCustomer] = useState<string | null>(null)

 const items = receivables?.items || []

  // Customer-wise aggregated due
 const customerDueMap = useMemo(() => {
 const map = new Map<
 string,
      {
 id: string
 name: string
 phone: string
 totalAmount: number
 paidAmount: number
 dueAmount: number
 invoicesCount: number
 maxDaysOverdue: number
 latestInvoice: string
      }
    >()

 const custPhoneMap = new Map(customers.map((c) => [c.id, c.mobile || '']))

 for (const item of items) {
 const cid = item.party_id || item.party_name
 const existing = map.get(cid)

 if (existing) {
 existing.totalAmount += Number(item.total_amount || 0)
 existing.paidAmount += Number(item.paid_amount || 0)
 existing.dueAmount += Number(item.due_amount || 0)
 existing.invoicesCount++
 existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, Number(item.days_overdue || 0))
      } else {
 map.set(cid, {
 id: item.party_id,
 name: item.party_name,
 phone: custPhoneMap.get(item.party_id) || '',
 totalAmount: Number(item.total_amount || 0),
 paidAmount: Number(item.paid_amount || 0),
 dueAmount: Number(item.due_amount || 0),
 invoicesCount: 1,
 maxDaysOverdue: Number(item.days_overdue || 0),
 latestInvoice: item.reference_id,
        })
      }
    }

 const list = Array.from(map.values()).sort((a, b) => b.dueAmount - a.dueAmount)
 return list
  }, [items, customers])

  // Payment Collections History (filtered from transactions)
 const collectionHistory = useMemo(() => {
 return transactions
      .filter((t) => t.transaction_type === 'CUSTOMER_PAYMENT')
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
  }, [transactions])

  // Filtered customer due list
 const filteredCustomers = useMemo(() => {
 if (!searchQuery.trim()) return customerDueMap
 const q = searchQuery.toLowerCase()
 return customerDueMap.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || c.latestInvoice.toLowerCase().includes(q)
    )
  }, [customerDueMap, searchQuery])

  // Filtered invoice-wise list
 const filteredInvoices = useMemo(() => {
 if (!searchQuery.trim()) return items
 const q = searchQuery.toLowerCase()
 return items.filter(
      (i) => i.party_name.toLowerCase().includes(q) || i.reference_id.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

  // Copy SMS text handler
 const handleCopySMS = (customerName: string, amount: number) => {
 const text = `আসসালামু আলাইকুম ${customerName}, PrintERP থেকে আপনার বকেয়া বিল ৳${amount.toLocaleString()} টাকা। অনুগ্রহ করে পরিশোধের ব্যবস্থা করবেন। ধন্যবাদ।`
 navigator.clipboard.writeText(text)
 setCopiedCustomer(customerName)
 setTimeout(() => setCopiedCustomer(null), 2500)
  }

 const totalReceivables = receivables?.total_receivable ?? customerDueMap.reduce((s, c) => s + c.dueAmount, 0)
 const totalBilled = customerDueMap.reduce((s, c) => s + c.totalAmount, 0)
 const totalCollected = customerDueMap.reduce((s, c) => s + c.paidAmount, 0)

 return (
    <div className="space-y-6">
      {/* 1. VISUAL FLOW BANNER: INVOICE -> ADVANCE -> DUE -> PAYMENT COLLECTION -> ৳0 */}
      <div className="p-4 sm:p-5 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-muted text-muted-foreground">
              <Users className="w-5 h-5"/>
            </span>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {tBilingual('Customer Due', 'কাস্টমার বকেয়া ও আদায় চেইন')}
              </h3>
              <p className="text-2xs text-muted-foreground">
                {tBilingual(
                  'Invoices seamlessly connect with customer accounts and payment collections.',
                  'প্রতিটি ইনভয়েস স্বয়ংক্রিয়ভাবে গ্রাহকের বাকি এবং ক্যাশ কালেকশনের সাথে সংযুক্ত।'
                )}
              </p>
            </div>
          </div>

          <Button
 onClick={() => onOpenCollectModal()}
 variant="success"className="text-xs h-9 px-4 gap-1.5 self-start md:self-auto">
            <ArrowDownLeft className="w-4 h-4"/>
            <span>{tBilingual('+ Collect Payment', '+ বাকি আদায় / জমা নিন')}</span>
          </Button>
        </div>

        {/* The Visual Pipeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-4 border-t border-border /60 text-center">
          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-3xs text-muted-foreground font-bold block uppercase">Step 1</span>
            <span className="text-xs font-bold text-foreground block">Invoice</span>
            <span className="text-xs tabular-nums text-blue-600 font-semibold">{totalBilled > 0 ? formatBDT(totalBilled) : 'Billing'}</span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-3xs text-muted-foreground font-bold block uppercase">Step 2</span>
            <span className="text-xs font-bold text-foreground block">Advance</span>
            <span className="text-xs tabular-nums text-emerald-600 font-semibold">{totalCollected > 0 ? formatBDT(totalCollected) : 'Deposit'}</span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-3xs text-muted-foreground font-bold block uppercase">Step 3</span>
            <span className="text-xs font-bold text-foreground block">Net Due</span>
            <span className="text-xs tabular-nums text-amber-600 font-bold">{totalReceivables > 0 ? formatBDT(totalReceivables) : '৳0'}</span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-3xs text-muted-foreground font-bold block uppercase">Step 4</span>
            <span className="text-xs font-bold text-foreground block">Collection</span>
            <span className="text-xs tabular-nums text-emerald-600 font-bold">{totalCollected > 0 ? `+${formatBDT(totalCollected)}` : 'Collection'}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-muted/50 border border-border">
            <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-semibold block uppercase">Settled</span>
            <span className="text-xs font-bold text-foreground block">Due Balance</span>
            <span className="text-xs tabular-nums text-emerald-600 font-black">{totalReceivables === 0 ? '৳0 ✓' : formatBDT(totalReceivables)}</span>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-3xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Customer Due', 'মোট কাস্টমার বাকি')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-amber-600 dark:text-amber-400">
            ৳{totalReceivables.toLocaleString()}
          </span>
          <span className="text-3xs text-muted-foreground block mt-1">
            {customerDueMap.length} {tBilingual('customers with dues', 'জন গ্রাহকের বকেয়া')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-3xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Billed', 'মোট ইনভয়েস বিল')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground">
            ৳{totalBilled.toLocaleString()}
          </span>
          <span className="text-3xs text-muted-foreground block mt-1">{items.length} {tBilingual('invoices tracked', 'টি ইনভয়েস')}</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-3xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Advance / Paid', 'পরিশোধ ও অগ্রিম')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-emerald-600 dark:text-emerald-400">
            ৳{totalCollected.toLocaleString()}
          </span>
          <span className="text-3xs text-muted-foreground block mt-1">
            {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% {tBilingual('collected', 'আদায়')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-3xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Overdue > 30 Days', '৩০ দিনের বেশি বাকি')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-rose-600 dark:text-rose-400">
            ৳{((receivables?.bucket_31_60 || 0) + (receivables?.bucket_61_90 || 0) + (receivables?.bucket_90_plus || 0)).toLocaleString()}
          </span>
          <span className="text-3xs text-rose-500 font-semibold block mt-1">{tBilingual('High collection priority', 'জরুরি তাগাদা')}</span>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          <button
 type="button"onClick={() => setActiveSubTab('customer_due')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'customer_due'
                ? 'bg-card text-amber-600 dark:text-amber-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Customer Due', 'গ্রাহকভিত্তিক বাকি')} ({customerDueMap.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('invoice_due')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'invoice_due'
                ? 'bg-card text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Invoice-wise Due', 'ইনভয়েসভিত্তিক বাকি')} ({items.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('payment_history')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'payment_history'
                ? 'bg-card text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Payment History', 'আদায় ইতিহাস')} ({collectionHistory.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('aging')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'aging'
                ? 'bg-card text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Due Aging', 'মেয়াদ বিশ্লেষণ')}
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={tBilingual('Search customer, phone or invoice...', 'গ্রাহক বা ইনভয়েস খুঁজুন...')}
 className="h-8.5 pl-8 text-xs rounded-xl bg-card"/>
        </div>
      </div>

      {/* 4. SUB-TAB CONTENT */}

      {/* Sub-tab A: Customer-wise Due */}
      {activeSubTab === 'customer_due' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">{tBilingual('Customer Name', 'গ্রাহকের নাম')}</th>
                    <th className="p-3">{tBilingual('Phone / Mobile', 'মোবাইল')}</th>
                    <th className="p-3 text-center">{tBilingual('Invoices', 'ইনভয়েস')}</th>
                    <th className="p-3 text-right">{tBilingual('Total Billed', 'মোট বিল')}</th>
                    <th className="p-3 text-right">{tBilingual('Advance / Paid', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Net Due', 'নিট বাকি')}</th>
                    <th className="p-3 text-center">{tBilingual('Aging Status', 'অবস্থা')}</th>
                    <th className="p-3 text-center">{tBilingual('Action & Reminder', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-semibold text-foreground">
                        {cust.name}
                      </td>
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {cust.phone || '-'}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        <Badge variant="outline"className="text-3xs px-1.5 py-0 h-4">
                          {cust.invoicesCount} inv
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-foreground">
                        ৳{cust.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-emerald-600">
                        ৳{cust.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                        ৳{cust.dueAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
 variant="outline"className={
 cust.maxDaysOverdue > 60
                              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 text-3xs'
                              : cust.maxDaysOverdue > 30
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 text-3xs'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 text-3xs'
                          }
                        >
                          {cust.maxDaysOverdue > 0 ? `${cust.maxDaysOverdue}d overdue` : 'Current'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Collect Button */}
                          <Button
 size="sm"onClick={() => onOpenCollectModal(cust.id, cust.name, cust.dueAmount)}
 className="h-7 px-2.5 text-2xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold">
                            {tBilingual('Collect', 'আদায়')}
                          </Button>

                          {/* WhatsApp Reminder */}
                          {cust.phone && (
                            <a
 href={`https://wa.me/88${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `আসসালামু আলাইকুম ${cust.name}, PrintERP থেকে জানানো যাচ্ছে যে আপনার ৳${cust.dueAmount.toLocaleString()} টাকা বকেয়া বিল রয়েছে। অনুগ্রহ করে পরিশোধের ব্যবস্থা করবেন। ধন্যবাদ।`
                              )}`}
 target="_blank"rel="noreferrer"className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"title="WhatsApp Reminder">
                              <MessageCircle className="w-3.5 h-3.5"/>
                            </a>
                          )}

                          {/* SMS Reminder Copy */}
                          <button
 type="button"onClick={() => handleCopySMS(cust.name, cust.dueAmount)}
 className="p-1.5 rounded-lg bg-muted hover:bg-muted text-muted-foreground transition-colors cursor-pointer"title="Copy SMS Reminder text">
                            {copiedCustomer === cust.name ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600"/>
                            ) : (
                              <Copy className="w-3.5 h-3.5"/>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredCustomers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground text-xs">
                        {tBilingual('No customer dues found.', 'কোনো বকেয়া কাস্টমার পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab B: Invoice-wise Due */}
      {activeSubTab === 'invoice_due' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">{tBilingual('Invoice #', 'ইনভয়েস নং')}</th>
                    <th className="p-3">{tBilingual('Customer Name', 'গ্রাহকের নাম')}</th>
                    <th className="p-3">{tBilingual('Due Date', 'পরিশোধের তারিখ')}</th>
                    <th className="p-3 text-right">{tBilingual('Grand Total', 'মোট বিল')}</th>
                    <th className="p-3 text-right">{tBilingual('Paid / Advance', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Due Amount', 'বাকি')}</th>
                    <th className="p-3 text-center">{tBilingual('Aging Bucket', 'মেয়াদ')}</th>
                    <th className="p-3 text-center">{tBilingual('Action', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.reference_id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 tabular-nums font-medium text-blue-600">
                        {inv.reference_id}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {inv.party_name}
                      </td>
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {inv.due_date || inv.issue_date}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        ৳{inv.total_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-emerald-600">
                        ৳{inv.paid_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-amber-600 dark:text-amber-400">
                        ৳{inv.due_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline"className="text-3xs font-medium">
                          {inv.bucket === '0_30' ? '1–30 Days' : inv.bucket === '31_60' ? '31–60 Days' : '60+ Days'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
 size="sm"onClick={() => onOpenCollectModal(inv.party_id, inv.party_name, inv.due_amount, inv.reference_id)}
 className="h-7 px-2.5 text-2xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold">
                          {tBilingual('Collect', 'আদায়')}
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground text-xs">
                        {tBilingual('No due bills found.', 'কোনো বকেয়া ইনভয়েস পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab C: Payment Collection History */}
      {activeSubTab === 'payment_history' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="p-3">{tBilingual('Receipt / Voucher #', 'রসিদ নম্বর')}</th>
                    <th className="p-3">{tBilingual('Customer', 'কাস্টমার')}</th>
                    <th className="p-3">{tBilingual('Memo / Reference', 'রেফারেন্স')}</th>
                    <th className="p-3 text-right">{tBilingual('Amount Collected', 'আদায়কৃত টাকা')}</th>
                    <th className="p-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {collectionHistory.map((t) => (
                    <tr key={t.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 tabular-nums text-muted-foreground whitespace-nowrap">{t.transaction_date}</td>
                      <td className="p-3 tabular-nums font-medium text-emerald-600 dark:text-emerald-400">
                        {t.transaction_number}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {t.narration?.replace(/^(Cash\/Bank\/MFS inflow from |Payment from )/i, '') || 'Customer Payment'}
                      </td>
                      <td className="p-3 text-muted-foreground text-3xs tabular-nums">
                        {t.reference_id || t.narration || '-'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                        +৳{Number(t.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 text-3xs">
 Received ✓
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {collectionHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground text-xs">
                        {tBilingual('No payment collection records found in history.', 'কোনো আদায়ের ইতিহাস পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab D: Due Aging Analysis */}
      {activeSubTab === 'aging' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60">
              <span className="text-3xs font-bold uppercase text-emerald-700 dark:text-emerald-400 block">
                0 – 30 Days (Current)
              </span>
              <span className="text-2xl font-black tabular-nums text-emerald-800 dark:text-emerald-200 block mt-1">
                ৳{(receivables?.bucket_0_30 || 0).toLocaleString()}
              </span>
              <p className="text-3xs text-emerald-600/80 mt-1">{tBilingual('Fresh invoices within grace period', 'স্বাভাবিক বাকি')}</p>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60">
              <span className="text-3xs font-bold uppercase text-amber-700 dark:text-amber-400 block">
                31 – 60 Days
              </span>
              <span className="text-2xl font-black tabular-nums text-amber-800 dark:text-amber-200 block mt-1">
                ৳{(receivables?.bucket_31_60 || 0).toLocaleString()}
              </span>
              <p className="text-3xs text-amber-600/80 mt-1">{tBilingual('Mild overdue, send polite reminder', 'তাগাদা প্রদান করুন')}</p>
            </div>

            <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60">
              <span className="text-3xs font-bold uppercase text-orange-700 dark:text-orange-400 block">
                61 – 90 Days
              </span>
              <span className="text-2xl font-black tabular-nums text-orange-800 dark:text-orange-200 block mt-1">
                ৳{(receivables?.bucket_61_90 || 0).toLocaleString()}
              </span>
              <p className="text-3xs text-orange-600/80 mt-1">{tBilingual('Significant overdue, follow up calls', 'জরুরি ফোন কল')}</p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60">
              <span className="text-3xs font-bold uppercase text-rose-700 dark:text-rose-400 block">
                90+ Days (High Risk)
              </span>
              <span className="text-2xl font-black tabular-nums text-rose-800 dark:text-rose-200 block mt-1">
                ৳{(receivables?.bucket_90_plus || 0).toLocaleString()}
              </span>
              <p className="text-3xs text-rose-600/80 mt-1">{tBilingual('Critical default risk, pause new jobs', 'নতুন কাজ স্থগিত রাখুন')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
