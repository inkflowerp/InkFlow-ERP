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
              <p className="text-xs text-muted-foreground">
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
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 1', 'ধাপ ১')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Invoice', 'ইনভয়েস')}</span>
            <span className="text-xs tabular-nums text-primary font-semibold">{totalBilled > 0 ? formatBDT(totalBilled) : tBilingual('Billing', 'বিলিং')}</span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 2', 'ধাপ ২')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Advance', 'অগ্রিম')}</span>
            <span className="text-xs tabular-nums text-success font-semibold">{totalCollected > 0 ? formatBDT(totalCollected) : tBilingual('Deposit', 'জমা')}</span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 3', 'ধাপ ৩')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Net Due', 'নীট বাকি')}</span>
            <span className="text-xs tabular-nums text-warning font-bold">{totalReceivables > 0 ? formatBDT(totalReceivables) : '৳0'}</span>
          </div>

          <div className="p-2 rounded-xl bg-card border border-border">
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 4', 'ধাপ ৪')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Collection', 'আদায়')}</span>
            <span className="text-xs tabular-nums text-success font-bold">{totalCollected > 0 ? `+${formatBDT(totalCollected)}` : tBilingual('Collection', 'কালেকশন')}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2 rounded-xl bg-muted/50 border border-border">
            <span className="text-xs text-success text-success font-semibold block uppercase">{tBilingual('Settled', 'পরিশোধিত')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Due Balance', 'বাকি ব্যালেন্স')}</span>
            <span className="text-xs tabular-nums text-success font-black">{totalReceivables === 0 ? '৳0 ✓' : formatBDT(totalReceivables)}</span>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Customer Due', 'মোট কাস্টমার বাকি')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-warning text-warning">
            ৳{totalReceivables.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-1">
            {customerDueMap.length} {tBilingual('customers with dues', 'জন গ্রাহকের বকেয়া')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Billed', 'মোট ইনভয়েস বিল')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground">
            ৳{totalBilled.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-1">{items.length} {tBilingual('invoices tracked', 'টি ইনভয়েস')}</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Advance / Paid', 'পরিশোধ ও অগ্রিম')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-success text-success">
            ৳{totalCollected.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-1">
            {totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0}% {tBilingual('collected', 'আদায়')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Overdue > 30 Days', '৩০ দিনের বেশি বাকি')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-destructive text-destructive">
            ৳{((receivables?.bucket_31_60 || 0) + (receivables?.bucket_61_90 || 0) + (receivables?.bucket_90_plus || 0)).toLocaleString()}
          </span>
          <span className="text-xs text-destructive font-semibold block mt-1">{tBilingual('High collection priority', 'জরুরি তাগাদা')}</span>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          <button
 type="button"onClick={() => setActiveSubTab('customer_due')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'customer_due'
                ? 'bg-card text-warning text-warning shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Customer Due', 'গ্রাহকভিত্তিক বাকি')} ({customerDueMap.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('invoice_due')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'invoice_due'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Invoice-wise Due', 'ইনভয়েসভিত্তিক বাকি')} ({items.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('payment_history')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'payment_history'
                ? 'bg-card text-success text-success shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Payment History', 'আদায় ইতিহাস')} ({collectionHistory.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('aging')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'aging'
                ? 'bg-card text-primary text-primary shadow-xs'
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
                        <Badge variant="outline"className="text-xs px-1.5 py-0 h-4">
                          {cust.invoicesCount} {tBilingual('inv', 'টি')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-foreground">
                        ৳{cust.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-success">
                        ৳{cust.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-warning text-warning">
                        ৳{cust.dueAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
 variant="outline"className={
 cust.maxDaysOverdue > 60
                              ? 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-xs'
                              : cust.maxDaysOverdue > 30
                              ? 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-xs'
                              : 'bg-success-surface text-success border-success-border bg-success-surface text-xs'
                          }
                        >
                          {cust.maxDaysOverdue > 0 ? `${cust.maxDaysOverdue} ${tBilingual('days overdue', 'দিন বাকি')}` : tBilingual('Current', 'চলতি')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Collect Button */}
                          <Button
 size="sm"onClick={() => onOpenCollectModal(cust.id, cust.name, cust.dueAmount)}
 className="h-7 px-2.5 text-xs bg-success hover:bg-success text-white rounded-lg font-semibold">
                            {tBilingual('Collect', 'আদায়')}
                          </Button>

                          {/* WhatsApp Reminder */}
                          {cust.phone && (
                            <a
 href={`https://wa.me/88${cust.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                                `আসসালামু আলাইকুম ${cust.name}, PrintERP থেকে জানানো যাচ্ছে যে আপনার ৳${cust.dueAmount.toLocaleString()} টাকা বকেয়া বিল রয়েছে। অনুগ্রহ করে পরিশোধের ব্যবস্থা করবেন। ধন্যবাদ।`
                              )}`}
 target="_blank"rel="noreferrer"className="p-1.5 rounded-lg bg-success-surface text-success hover:bg-success-surface transition-colors"title="WhatsApp Reminder">
                              <MessageCircle className="w-3.5 h-3.5"/>
                            </a>
                          )}

                          {/* SMS Reminder Copy */}
                          <button
 type="button"onClick={() => handleCopySMS(cust.name, cust.dueAmount)}
 className="p-1.5 rounded-lg bg-muted hover:bg-muted text-muted-foreground transition-colors cursor-pointer"title="Copy SMS Reminder text">
                            {copiedCustomer === cust.name ? (
                              <Check className="w-3.5 h-3.5 text-success"/>
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
                      <td className="p-3 tabular-nums font-medium text-primary">
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
                      <td className="p-3 text-right tabular-nums text-success">
                        ৳{inv.paid_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-warning text-warning">
                        ৳{inv.due_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline"className="text-xs font-medium">
                          {inv.bucket === '0_30' ? tBilingual('1–30 Days', '১–৩০ দিন') : inv.bucket === '31_60' ? tBilingual('31–60 Days', '৩১–৬০ দিন') : tBilingual('60+ Days', '৬০+ দিন')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
 size="sm"onClick={() => onOpenCollectModal(inv.party_id, inv.party_name, inv.due_amount, inv.reference_id)}
 className="h-7 px-2.5 text-xs bg-success hover:bg-success text-white rounded-lg font-semibold">
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
                      <td className="p-3 tabular-nums font-medium text-success text-success">
                        {t.transaction_number}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {t.narration?.replace(/^(Cash\/Bank\/MFS inflow from |Payment from )/i, '') || 'Customer Payment'}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs tabular-nums">
                        {t.reference_id || t.narration || '-'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-success text-success">
                        +৳{Number(t.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-success-surface text-success border border-success-border bg-success-surface text-xs">
 {tBilingual('Received ✓', 'গৃহীত ✓')}
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
            <div className="p-4 rounded-xl bg-success-surface bg-success-surface border border-success-border border-success-border/60">
              <span className="text-xs font-bold uppercase text-success text-success block">
                {tBilingual('0 – 30 Days (Current)', '০ – ৩০ দিন (চলতি)')}
              </span>
              <span className="text-2xl font-black tabular-nums text-success text-success block mt-1">
                ৳{(receivables?.bucket_0_30 || 0).toLocaleString()}
              </span>
              <p className="text-xs text-success/80 mt-1">{tBilingual('Fresh invoices within grace period', 'স্বাভাবিক বাকি')}</p>
            </div>

            <div className="p-4 rounded-xl bg-warning-surface bg-warning-surface border border-warning-border border-warning-border/60">
              <span className="text-xs font-bold uppercase text-warning text-warning block">
                {tBilingual('31 – 60 Days', '৩১ – ৬০ দিন')}
              </span>
              <span className="text-2xl font-black tabular-nums text-warning text-warning block mt-1">
                ৳{(receivables?.bucket_31_60 || 0).toLocaleString()}
              </span>
              <p className="text-xs text-warning/80 mt-1">{tBilingual('Mild overdue, send polite reminder', 'তাগাদা প্রদান করুন')}</p>
            </div>

            <div className="p-4 rounded-xl bg-warning-surface bg-warning-surface border border-warning-border border-warning-border/60">
              <span className="text-xs font-bold uppercase text-warning text-warning block">
                {tBilingual('61 – 90 Days', '৬১ – ৯০ দিন')}
              </span>
              <span className="text-2xl font-black tabular-nums text-warning text-warning block mt-1">
                ৳{(receivables?.bucket_61_90 || 0).toLocaleString()}
              </span>
              <p className="text-xs text-warning/80 mt-1">{tBilingual('Significant overdue, follow up calls', 'জরুরি ফোন কল')}</p>
            </div>

            <div className="p-4 rounded-xl bg-danger-surface bg-danger-surface border border-danger-border border-danger-border/60">
              <span className="text-xs font-bold uppercase text-destructive text-destructive block">
                {tBilingual('90+ Days (High Risk)', '৯০+ দিন (উচ্চ ঝুঁকি)')}
              </span>
              <span className="text-2xl font-black tabular-nums text-destructive text-destructive block mt-1">
                ৳{(receivables?.bucket_90_plus || 0).toLocaleString()}
              </span>
              <p className="text-xs text-destructive/80 mt-1">{tBilingual('Critical default risk, pause new jobs', 'নতুন কাজ স্থগিত রাখুন')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
