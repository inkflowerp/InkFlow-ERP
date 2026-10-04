'use client'

import React, { useState, useMemo } from 'react'
import {
 ShoppingBag,
 Search,
 DollarSign,
 ArrowUpRight,
 Calendar,
 Building,
 CheckCircle2,
 AlertTriangle,
 Receipt,
 FileText,
 Clock,
 ExternalLink,
 ChevronRight,
 TrendingDown,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { SupplierRecord } from '@/types/crm.types'
import type { AccountRecord, PayablesAgingSummary, FinancialTransactionRecord } from '@/types/finance.types'

export interface PayablesViewProps {
 payables: PayablesAgingSummary | null
 suppliers: SupplierRecord[]
 accounts: AccountRecord[]
 transactions?: FinancialTransactionRecord[]
 onOpenPaySupplierModal: (supplierId?: string, supplierName?: string, dueAmount?: number) => void
}

export function PayablesView({
 payables,
 suppliers,
 accounts,
 transactions = [],
 onOpenPaySupplierModal,
}: PayablesViewProps) {
 const { tBilingual } = useI18n()
 const [activeSubTab, setActiveSubTab] = useState<'supplier_due' | 'purchase_due' | 'payment_history' | 'aging'>('supplier_due')
 const [searchQuery, setSearchQuery] = useState('')

 const items = payables?.items || []

  // Supplier-wise aggregated dues
 const supplierDueMap = useMemo(() => {
 const map = new Map<
 string,
      {
 id: string
 name: string
 phone: string
 totalAmount: number
 paidAmount: number
 dueAmount: number
 billsCount: number
 maxDaysOverdue: number
 latestBill: string
      }
    >()

 const suppPhoneMap = new Map(suppliers.map((s) => [s.id, s.mobile || '']))

 for (const item of items) {
 const sid = item.party_id || item.party_name
 const existing = map.get(sid)

 if (existing) {
 existing.totalAmount += Number(item.total_amount || 0)
 existing.paidAmount += Number(item.paid_amount || 0)
 existing.dueAmount += Number(item.due_amount || 0)
 existing.billsCount++
 existing.maxDaysOverdue = Math.max(existing.maxDaysOverdue, Number(item.days_overdue || 0))
      } else {
 map.set(sid, {
 id: item.party_id,
 name: item.party_name,
 phone: suppPhoneMap.get(item.party_id) || '',
 totalAmount: Number(item.total_amount || 0),
 paidAmount: Number(item.paid_amount || 0),
 dueAmount: Number(item.due_amount || 0),
 billsCount: 1,
 maxDaysOverdue: Number(item.days_overdue || 0),
 latestBill: item.reference_id,
        })
      }
    }

 const list = Array.from(map.values()).sort((a, b) => b.dueAmount - a.dueAmount)
 return list
  }, [items, suppliers])

  // Supplier payments history (from transactions)
 const disbursementHistory = useMemo(() => {
 return transactions
      .filter((t) => t.transaction_type === 'SUPPLIER_PAYMENT')
      .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
  }, [transactions])

  // Filtered suppliers
 const filteredSuppliers = useMemo(() => {
 if (!searchQuery.trim()) return supplierDueMap
 const q = searchQuery.toLowerCase()
 return supplierDueMap.filter(
      (s) => s.name.toLowerCase().includes(q) || s.phone.includes(q) || s.latestBill.toLowerCase().includes(q)
    )
  }, [supplierDueMap, searchQuery])

  // Filtered purchases
 const filteredPurchases = useMemo(() => {
 if (!searchQuery.trim()) return items
 const q = searchQuery.toLowerCase()
 return items.filter(
      (i) => i.party_name.toLowerCase().includes(q) || i.reference_id.toLowerCase().includes(q)
    )
  }, [items, searchQuery])

 const totalPayables = payables?.total_payable ?? supplierDueMap.reduce((s, c) => s + c.dueAmount, 0)
 const totalPurchases = supplierDueMap.reduce((s, c) => s + c.totalAmount, 0)
 const totalPaid = supplierDueMap.reduce((s, c) => s + c.paidAmount, 0)

 return (
    <div className="space-y-6">
      {/* 1. VISUAL FLOW BANNER: PURCHASE -> PAID -> DUE */}
      <div className="p-4 sm:p-5 rounded-xl bg-card border border-border shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-destructive text-white shadow-xs">
              <ShoppingBag className="w-5 h-5"/>
            </span>
            <div>
              <h3 className="font-bold text-sm text-foreground">
                {tBilingual('Supplier Due', 'সরবরাহকারী মহাজন দেনা ও বিল পরিশোধ')}
              </h3>
              <p className="text-xs text-muted-foreground">
                {tBilingual(
                  'Raw material, paper, ink, and plate purchases directly link with liabilities and payouts.',
                  'কাঁচামাল, কাগজ, কালি ও প্লেট ক্রয় সরাসরি মহাজন দেনা ও ব্যাংক/ক্যাশ পেমেন্টের সাথে যুক্ত।'
                )}
              </p>
            </div>
          </div>

          <Button
 onClick={() => onOpenPaySupplierModal()}
 className="bg-destructive hover:bg-destructive text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer self-start md:self-auto">
            <ArrowUpRight className="w-4 h-4"/>
            <span>{tBilingual('+ Pay Supplier', '+ মহাজন দেনা পরিশোধ')}</span>
          </Button>
        </div>

        {/* The Visual Pipeline Steps */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 pt-4 border-t border-border /60 text-center">
          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 1', 'ধাপ ১')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Purchase Billed', 'ক্রয় বিল')}</span>
            <span className="text-xs tabular-nums text-foreground font-semibold">{totalPurchases > 0 ? formatBDT(totalPurchases) : tBilingual('Purchase Bill', 'ক্রয় চালান')}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 2', 'ধাপ ২')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Paid to Vendor', 'মহাজনকে পরিশোধ')}</span>
            <span className="text-xs tabular-nums text-success font-semibold">{totalPaid > 0 ? `-${formatBDT(totalPaid)}` : tBilingual('Payment', 'পেমেন্ট')}</span>
          </div>

          <div className="p-2.5 rounded-xl bg-card border border-border">
            <span className="text-xs text-muted-foreground font-bold block uppercase">{tBilingual('Step 3', 'ধাপ ৩')}</span>
            <span className="text-xs font-bold text-foreground block">{tBilingual('Outstanding Due', 'অবশিষ্ট দেনা')}</span>
            <span className="text-xs tabular-nums text-destructive font-bold">{totalPayables > 0 ? formatBDT(totalPayables) : '৳0'}</span>
          </div>

          <div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-destructive/10 bg-danger-surface border border-danger-border/30">
            <span className="text-xs text-destructive text-destructive font-bold block uppercase">{tBilingual('Payout', 'পরিশোধ')}</span>
            <span className="text-xs font-bold text-destructive text-destructive block">{tBilingual('Supplier Payout', 'মহাজন পাওনা')}</span>
            <span className="text-xs tabular-nums text-destructive font-black">{totalPayables === 0 ? tBilingual('Settled ✓', 'পরিশোধিত ✓') : tBilingual('Cash / Bank / Cheque', 'ক্যাশ / ব্যাংক / চেক')}</span>
          </div>
        </div>
      </div>

      {/* 2. OPERATIONAL SUMMARY STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Supplier Due', 'মোট মহাজন দেনা')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-destructive text-destructive">
            ৳{totalPayables.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-1">
            {supplierDueMap.length} {tBilingual('suppliers with dues', 'জন সরবরাহকারীর পাওনা')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Material Purchases', 'মোট কাঁচামাল ক্রয়')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-foreground">
            ৳{totalPurchases.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-1">{items.length} {tBilingual('purchase bills', 'টি ক্রয় চালান')}</span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Total Paid', 'মোট পরিশোধ')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-success text-success">
            ৳{totalPaid.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground block mt-1">
            {totalPurchases > 0 ? Math.round((totalPaid / totalPurchases) * 100) : 0}% {tBilingual('settled', 'পরিশোধিত')}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border shadow-xs">
          <span className="text-xs text-muted-foreground uppercase font-semibold block">
            {tBilingual('Overdue Liabilities', 'মেয়াদোত্তীর্ণ দেনা')}
          </span>
          <span className="text-xl sm:text-2xl font-black tabular-nums text-destructive text-destructive">
            ৳{((payables?.bucket_31_60 || 0) + (payables?.bucket_61_90 || 0) + (payables?.bucket_90_plus || 0)).toLocaleString()}
          </span>
          <span className="text-xs text-destructive font-semibold block mt-1">{tBilingual('Payment required soon', 'দ্রুত পরিশোধ বাঞ্ছনীয়')}</span>
        </div>
      </div>

      {/* 3. SUB-NAVIGATION TABS & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-muted p-1 rounded-xl w-fit">
          <button
 type="button"onClick={() => setActiveSubTab('supplier_due')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'supplier_due'
                ? 'bg-card text-destructive text-destructive shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Supplier Due', 'সরবরাহকারী দেনা')} ({supplierDueMap.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('purchase_due')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'purchase_due'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Purchase-wise Due', 'ক্রয়ভিত্তিক দেনা')} ({items.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('payment_history')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'payment_history'
                ? 'bg-card text-success text-success shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Payment History', 'পরিশোধ ইতিহাস')} ({disbursementHistory.length})
          </button>

          <button
 type="button"onClick={() => setActiveSubTab('aging')}
 className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
 activeSubTab === 'aging'
                ? 'bg-card text-primary text-primary shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tBilingual('Payable Aging', 'দেনার মেয়াদ বিশ্লেষণ')}
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"/>
          <Input
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder={tBilingual('Search supplier, phone or bill...', 'মহাজন বা চালান খুঁজুন...')}
 className="h-8.5 pl-8 text-xs rounded-xl bg-card"/>
        </div>
      </div>

      {/* 4. SUB-TAB CONTENT */}

      {/* Sub-tab A: Supplier-wise Due */}
      {activeSubTab === 'supplier_due' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">{tBilingual('Supplier Name', 'মহাজনের নাম')}</th>
                    <th className="p-3">{tBilingual('Phone / Mobile', 'মোবাইল')}</th>
                    <th className="p-3 text-center">{tBilingual('Bills Count', 'চালান')}</th>
                    <th className="p-3 text-right">{tBilingual('Total Purchases', 'মোট ক্রয়')}</th>
                    <th className="p-3 text-right">{tBilingual('Total Paid', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Net Due (Payable)', 'নিট দেনা')}</th>
                    <th className="p-3 text-center">{tBilingual('Aging Status', 'অবস্থা')}</th>
                    <th className="p-3 text-center">{tBilingual('Action', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {filteredSuppliers.map((supp) => (
                    <tr key={supp.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 font-semibold text-foreground">
                        {supp.name}
                      </td>
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {supp.phone || '-'}
                      </td>
                      <td className="p-3 text-center tabular-nums">
                        <Badge variant="outline"className="text-xs px-1.5 py-0 h-4">
                          {supp.billsCount} {tBilingual('bills', 'টি')}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-foreground">
                        ৳{supp.totalAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-success">
                        ৳{supp.paidAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-destructive text-destructive">
                        ৳{supp.dueAmount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
 variant="outline"className={
 supp.maxDaysOverdue > 60
                              ? 'bg-danger-surface text-destructive border-danger-border bg-danger-surface text-xs'
                              : supp.maxDaysOverdue > 30
                              ? 'bg-warning-surface text-warning border-warning-border bg-warning-surface text-xs'
                              : 'bg-success-surface text-success border-success-border bg-success-surface text-xs'
                          }
                        >
                          {supp.maxDaysOverdue > 0 ? `${supp.maxDaysOverdue} ${tBilingual('days overdue', 'দিন বাকি')}` : tBilingual('Current', 'চলতি')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
 size="sm"onClick={() => onOpenPaySupplierModal(supp.id, supp.name, supp.dueAmount)}
 className="h-7 px-3 text-xs bg-destructive hover:bg-destructive text-white rounded-lg font-semibold shadow-xs">
                          {tBilingual('Pay Supplier', 'পরিশোধ')}
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {filteredSuppliers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground text-xs">
                        {tBilingual('No supplier dues found.', 'কোনো মহাজন পাওনা পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab B: Purchase-wise Due */}
      {activeSubTab === 'purchase_due' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">{tBilingual('Purchase Bill #', 'চালান নম্বর')}</th>
                    <th className="p-3">{tBilingual('Supplier Name', 'মহাজনের নাম')}</th>
                    <th className="p-3">{tBilingual('Bill Date', 'তারিখ')}</th>
                    <th className="p-3 text-right">{tBilingual('Bill Total', 'মোট চালান')}</th>
                    <th className="p-3 text-right">{tBilingual('Paid', 'পরিশোধ')}</th>
                    <th className="p-3 text-right">{tBilingual('Due Balance', 'বাকি')}</th>
                    <th className="p-3 text-center">{tBilingual('Aging Bucket', 'মেয়াদ')}</th>
                    <th className="p-3 text-center">{tBilingual('Action', 'অ্যাকশন')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {filteredPurchases.map((bill) => (
                    <tr key={bill.reference_id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 tabular-nums font-medium text-foreground">
                        {bill.reference_id}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {bill.party_name}
                      </td>
                      <td className="p-3 tabular-nums text-muted-foreground">
                        {bill.issue_date || bill.due_date}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        ৳{bill.total_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums text-success">
                        ৳{bill.paid_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-destructive text-destructive">
                        ৳{bill.due_amount.toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant="outline"className="text-xs font-medium">
                          {bill.bucket === '0_30' ? tBilingual('1–30 Days', '১–৩০ দিন') : bill.bucket === '31_60' ? tBilingual('31–60 Days', '৩১–৬০ দিন') : tBilingual('60+ Days', '৬০+ দিন')}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Button
 size="sm"onClick={() => onOpenPaySupplierModal(bill.party_id, bill.party_name, bill.due_amount)}
 className="h-7 px-2.5 text-xs bg-destructive hover:bg-destructive text-white rounded-lg font-semibold">
                          {tBilingual('Pay', 'পরিশোধ')}
                        </Button>
                      </td>
                    </tr>
                  ))}

                  {filteredPurchases.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-10 text-center text-muted-foreground text-xs">
                        {tBilingual('No purchase bills found.', 'কোনো কাঁচামাল ক্রয় চালান পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab C: Payment History */}
      {activeSubTab === 'payment_history' && (
        <Card className="rounded-xl border-border shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted text-foreground font-semibold border-b border-border">
                  <tr>
                    <th className="p-3">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="p-3">{tBilingual('Voucher #', 'ভাউচার')}</th>
                    <th className="p-3">{tBilingual('Supplier', 'সরবরাহকারী')}</th>
                    <th className="p-3">{tBilingual('Narration / Account', 'বিবরণ')}</th>
                    <th className="p-3 text-right">{tBilingual('Amount Paid', 'পরিশোধিত টাকা')}</th>
                    <th className="p-3 text-center">{tBilingual('Status', 'অবস্থা')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border dark:divide-border/50">
                  {disbursementHistory.map((t) => (
                    <tr key={t.id} className="hover:bg-muted dark:hover:bg-muted/40 transition-colors">
                      <td className="p-3 tabular-nums text-muted-foreground whitespace-nowrap">{t.transaction_date}</td>
                      <td className="p-3 tabular-nums font-medium text-destructive text-destructive">
                        {t.transaction_number}
                      </td>
                      <td className="p-3 font-semibold text-foreground">
                        {t.narration?.replace(/^(Payment to supplier |Supplier payment: )/i, '') || 'Supplier'}
                      </td>
                      <td className="p-3 text-muted-foreground text-xs tabular-nums">
                        {t.reference_id || t.narration || '-'}
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-destructive text-destructive">
                        -৳{Number(t.total_amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        <Badge className="bg-danger-surface text-destructive border border-danger-border bg-danger-surface text-xs">
 {tBilingual('Disbursed ✓', 'পরিশোধিত ✓')}
                        </Badge>
                      </td>
                    </tr>
                  ))}

                  {disbursementHistory.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-10 text-center text-muted-foreground text-xs">
                        {tBilingual('No supplier payments recorded in history.', 'কোনো মহাজন পেমেন্টের ইতিহাস পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab D: Aging */}
      {activeSubTab === 'aging' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-xl bg-success-surface bg-success-surface border border-success-border border-success-border/60">
              <span className="text-xs font-bold uppercase text-success text-success block">
                {tBilingual('0 – 30 Days (Current)', '০ – ৩০ দিন (চলতি)')}
              </span>
              <span className="text-2xl font-black tabular-nums text-success text-success block mt-1">
                ৳{(payables?.bucket_0_30 || 0).toLocaleString()}
              </span>
              <p className="text-xs text-success/80 mt-1">{tBilingual('Regular supplier credit window', 'স্বাভাবিক ক্রেডিট বিল')}</p>
            </div>

            <div className="p-4 rounded-xl bg-warning-surface bg-warning-surface border border-warning-border border-warning-border/60">
              <span className="text-xs font-bold uppercase text-warning text-warning block">
                {tBilingual('31 – 60 Days', '৩১ – ৬০ দিন')}
              </span>
              <span className="text-2xl font-black tabular-nums text-warning text-warning block mt-1">
                ৳{(payables?.bucket_31_60 || 0).toLocaleString()}
              </span>
              <p className="text-xs text-warning/80 mt-1">{tBilingual('Pay this week', 'চলতি সপ্তাহে পরিশোধ যোগ্য')}</p>
            </div>

            <div className="p-4 rounded-xl bg-warning-surface bg-warning-surface border border-warning-border border-warning-border/60">
              <span className="text-xs font-bold uppercase text-warning text-warning block">
                {tBilingual('61 – 90 Days', '৬১ – ৯০ দিন')}
              </span>
              <span className="text-2xl font-black tabular-nums text-warning text-warning block mt-1">
                ৳{(payables?.bucket_61_90 || 0).toLocaleString()}
              </span>
              <p className="text-xs text-warning/80 mt-1">{tBilingual('Overdue credit, vendor follow-up', 'মহাজন তাগাদা আসতে পারে')}</p>
            </div>

            <div className="p-4 rounded-xl bg-danger-surface bg-danger-surface border border-danger-border border-danger-border/60">
              <span className="text-xs font-bold uppercase text-destructive text-destructive block">
                {tBilingual('90+ Days (Critical)', '৯০+ দিন (জরুরি দেনা)')}
              </span>
              <span className="text-2xl font-black tabular-nums text-destructive text-destructive block mt-1">
                ৳{(payables?.bucket_90_plus || 0).toLocaleString()}
              </span>
              <p className="text-xs text-destructive/80 mt-1">{tBilingual('Supply block risk, prioritize payment', 'কাঁচামাল সরবরাহ বন্ধের ঝুঁকি')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
