'use client'

import React, { useState, useMemo } from 'react'
import {
  TrendingDown,
  Plus,
  Search,
  Calendar,
  Wallet,
  Building2,
  Paperclip,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  Zap,
  Building,
  Truck,
  Globe2,
  Wrench,
  FileText,
  Users2,
  Megaphone,
  FolderOpen,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { ExpenseSummaryReport, ExpenseItemRecord, AccountRecord } from '@/types/finance.types'

export interface ExpensesTabViewProps {
  report: ExpenseSummaryReport | null
  accounts: AccountRecord[]
  onOpenSpendModal: (prefillCategory?: string) => void
  isLoading?: boolean
}

// Preset standard categories
const PRESET_CATEGORIES = [
  { id: 'electricity_utility', labelEn: 'Electricity & Utilities', labelBn: 'বিদ্যুৎ ও ইউটিলিটি', icon: Zap, color: 'text-amber-500 bg-amber-50' },
  { id: 'factory_rent', labelEn: 'Factory & Shop Rent', labelBn: 'কারখানা ও দোকান ভাড়া', icon: Building, color: 'text-blue-500 bg-blue-50' },
  { id: 'transport_fuel', labelEn: 'Transport & Fuel', labelBn: 'পরিবহন ও জ্বালানি', icon: Truck, color: 'text-emerald-500 bg-emerald-50' },
  { id: 'office_stationery', labelEn: 'Internet & Broadband', labelBn: 'ইন্টারনেট বিল', icon: Globe2, color: 'text-cyan-500 bg-cyan-50' },
  { id: 'machine_maintenance', labelEn: 'Machine Maintenance', labelBn: 'মেশিন মেরামত ও পার্টস', icon: Wrench, color: 'text-orange-500 bg-orange-50' },
  { id: 'tea_snacks', labelEn: 'Office Expense & Tea', labelBn: 'অফিস খরচ ও আপ্যায়ন', icon: FileText, color: 'text-purple-500 bg-purple-50' },
  { id: 'staff_salary', labelEn: 'Salary & Daily Wages', labelBn: 'স্টাফ বেতন ও মজুরি', icon: Users2, color: 'text-indigo-500 bg-indigo-50' },
  { id: 'marketing_promo', labelEn: 'Marketing & Promotion', labelBn: 'মার্কেটিং ও বিজ্ঞাপন', icon: Megaphone, color: 'text-pink-500 bg-pink-50' },
  { id: 'miscellaneous', labelEn: 'Miscellaneous / Other', labelBn: 'অন্যান্য বিবিধ খরচ', icon: FolderOpen, color: 'text-slate-500 bg-slate-100' },
]

// Preset Recurring Bills for print shops
const DEFAULT_RECURRING_BILLS = [
  { id: 'rec_rent', titleEn: 'Shop & Factory Rent', titleBn: 'কারখানা ও দোকান ভাড়া', category: 'factory_rent', amount: 35000, dueDay: 5, status: 'PAID' },
  { id: 'rec_elec', titleEn: 'Electricity Bill (DESCO/DPDC)', titleBn: 'বিদ্যুৎ বিল (DESCO/DPDC)', category: 'electricity_utility', amount: 18500, dueDay: 15, status: 'PAID' },
  { id: 'rec_net', titleEn: 'High-speed Internet Lease', titleBn: 'ইন্টারনেট সংযোগ বিল', category: 'office_stationery', amount: 2500, dueDay: 10, status: 'PAID' },
  { id: 'rec_amc', titleEn: 'Large-Format Printer AMC', titleBn: 'প্রিন্টার সার্ভিস চুক্তি (AMC)', category: 'machine_maintenance', amount: 6000, dueDay: 20, status: 'DUE' },
  { id: 'rec_erp', titleEn: 'PrintERP Cloud Platform', titleBn: 'প্রিন্ট ইআরপি সাবস্ক্রিপশন', category: 'miscellaneous', amount: 3000, dueDay: 1, status: 'PAID' },
]

export function ExpensesTabView({
  report,
  accounts,
  onOpenSpendModal,
  isLoading = false,
}: ExpensesTabViewProps) {
  const { tBilingual } = useI18n()
  const [activeSubTab, setActiveSubTab] = useState<'entries' | 'categories' | 'recurring'>('entries')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL')

  const sampleExpenseItems: ExpenseItemRecord[] = useMemo(
    () => [
      {
        id: 'exp-demo-1',
        transaction_number: 'EXP-2026-001',
        transaction_date: '2026-09-29',
        category: 'electricity_utility',
        category_label: 'Electricity & Utilities',
        category_label_bn: 'বিদ্যুৎ ও ইউটিলিটি',
        amount: 8500,
        payment_method: 'Bank Transfer',
        payment_account_id: 'acc-bank-1',
        payment_account_name: 'Islami Bank Bangladesh',
        payment_account_code: '1020',
        vendor_name: 'DESCO Commercial',
        description: 'DESCO Commercial Factory Electricity Bill for September',
        attachment_url: '/receipts/desco-sep.pdf',
        posted_by_name: 'Accountant',
        created_at: '2026-09-29T10:00:00Z',
      },
      {
        id: 'exp-demo-2',
        transaction_number: 'EXP-2026-002',
        transaction_date: '2026-09-29',
        category: 'machine_maintenance',
        category_label: 'Machine Maintenance',
        category_label_bn: 'মেশিন মেরামত ও রক্ষণাবেক্ষণ',
        amount: 4000,
        payment_method: 'Cash',
        payment_account_id: 'acc-cash-1',
        payment_account_name: 'Cash in Hand',
        payment_account_code: '1010',
        vendor_name: 'Universal Machine Tools',
        description: 'Roland Eco-Solvent Head Lubricant & Filter Replacement',
        attachment_url: null,
        posted_by_name: 'Accountant',
        created_at: '2026-09-29T11:30:00Z',
      },
      {
        id: 'exp-demo-3',
        transaction_number: 'EXP-2026-003',
        transaction_date: '2026-09-28',
        category: 'transport_fuel',
        category_label: 'Transport & Fuel',
        category_label_bn: 'পরিবহন ও জ্বালানি',
        amount: 2500,
        payment_method: 'Cash',
        payment_account_id: 'acc-cash-1',
        payment_account_name: 'Cash in Hand',
        payment_account_code: '1010',
        vendor_name: 'Trust Filling Station',
        description: 'Delivery Van Fuel & Express Toll Fare',
        attachment_url: '/receipts/fuel.jpg',
        posted_by_name: 'Cashier',
        created_at: '2026-09-28T14:15:00Z',
      },
      {
        id: 'exp-demo-4',
        transaction_number: 'EXP-2026-004',
        transaction_date: '2026-09-28',
        category: 'office_stationery',
        category_label: 'Internet & Broadband',
        category_label_bn: 'ইন্টারনেট বিল',
        amount: 2500,
        payment_method: 'bKash',
        payment_account_id: 'acc-mfs-1',
        payment_account_name: 'bKash Merchant Wallet',
        payment_account_code: '1030',
        vendor_name: 'Dot Internet BD',
        description: 'Factory 100Mbps Dedicated Optical Fiber Monthly Lease',
        attachment_url: '/receipts/internet.pdf',
        posted_by_name: 'Accountant',
        created_at: '2026-09-28T16:00:00Z',
      },
      {
        id: 'exp-demo-5',
        transaction_number: 'EXP-2026-005',
        transaction_date: '2026-09-27',
        category: 'tea_snacks',
        category_label: 'Office Expense & Tea',
        category_label_bn: 'নাস্তা ও চা বিল',
        amount: 1500,
        payment_method: 'Cash',
        payment_account_id: 'acc-cash-1',
        payment_account_name: 'Cash in Hand',
        payment_account_code: '1010',
        vendor_name: 'Madina Tea Stall',
        description: 'Shop Floor Evening Refreshments & Tea for Print Crew',
        attachment_url: null,
        posted_by_name: 'Floor Manager',
        created_at: '2026-09-27T18:00:00Z',
      },
    ],
    []
  )

  const items = (report?.items && report.items.length > 0) ? report.items : sampleExpenseItems
  const totalExpenses = (report?.total_expenses && report.total_expenses > 0)
    ? report.total_expenses
    : items.reduce((s, i) => s + Number(i.amount || 0), 0)
  const totalStaffSalary = report?.total_staff_salary || 0

  // Filtered expense entries
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategoryFilter !== 'ALL' && item.category !== selectedCategoryFilter) return false
      if (!searchQuery.trim()) return true

      const q = searchQuery.toLowerCase()
      const matchDesc = (item.description || '').toLowerCase().includes(q)
      const matchTxn = (item.transaction_number || '').toLowerCase().includes(q)
      const matchVendor = (item.vendor_name || '').toLowerCase().includes(q)
      const matchEmp = (item.employee_name || '').toLowerCase().includes(q)
      const matchCat = (item.category_label || '').toLowerCase().includes(q)
      return matchDesc || matchTxn || matchVendor || matchEmp || matchCat
    })
  }, [items, selectedCategoryFilter, searchQuery])

  // Category breakdown calculation
  const categoryStats = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>()

    for (const item of items) {
      const cat = item.category || 'miscellaneous'
      const existing = map.get(cat) || { total: 0, count: 0 }
      existing.total += Number(item.amount || 0)
      existing.count++
      map.set(cat, existing)
    }

    return map
  }, [items])

  return (
    <div className="space-y-6">
      {/* 1. TOP STATS BAR & + ADD EXPENSE BUTTON */}
      <div className="p-5 rounded-3xl bg-linear-to-r from-rose-950 via-slate-900 to-indigo-950 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge className="bg-rose-500/20 text-rose-300 border-none text-2xs uppercase tracking-wider">
              {tBilingual('Expenditures & Overhead', 'কারখানা পরিচালন ও দৈনন্দিন ব্যয়')}
            </Badge>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl sm:text-4xl font-black tabular-nums tracking-tight">
              ৳{totalExpenses.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400">
              ({items.length} {tBilingual('Vouchers Logged', 'টি ভাউচার')})
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {tBilingual(
              'Simple expense entry: Category, Amount, Payment Account, Reference, Notes & Receipt photo.',
              'সহজ খরচ এন্ট্রি: ক্যাটাগরি, টাকার পরিমাণ, যে অ্যাকাউন্ট থেকে দেওয়া হলো, রেফারেন্স ও রসিদের ছবি।'
            )}
          </p>
        </div>

        {/* Primary + Add Expense Button */}
        <Button
          onClick={() => onOpenSpendModal()}
          className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-10 px-5 rounded-xl shadow-lg shadow-rose-950/40 flex items-center gap-2 cursor-pointer self-start md:self-auto transition-all hover:scale-102"
        >
          <Plus className="w-4 h-4" />
          <span>{tBilingual('+ Add Expense', '+ নতুন খরচ এন্ট্রি')}</span>
        </Button>
      </div>

      {/* 2. SUB-NAVIGATION TABS & CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl w-fit">
          <button
            type="button"
            onClick={() => setActiveSubTab('entries')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'entries'
                ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {tBilingual('Expense Entries', 'খরচের তালিকা')} ({items.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('categories')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'categories'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {tBilingual('Expense Categories', 'খরচের খাত')}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('recurring')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeSubTab === 'recurring'
                ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            {tBilingual('Recurring Expenses', 'মাসিক নিয়মিত বিল')}
          </button>
        </div>

        {activeSubTab === 'entries' && (
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tBilingual('Search memo, category, payee...', 'বিবরণ বা খাত খুঁজুন...')}
              className="h-8.5 pl-8 text-xs rounded-xl bg-white dark:bg-slate-900"
            />
          </div>
        )}
      </div>

      {/* 3. SUB-TAB CONTENT */}

      {/* Sub-tab A: Expense Entries Table */}
      {activeSubTab === 'entries' && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">{tBilingual('Date', 'তারিখ')}</th>
                    <th className="p-3">{tBilingual('Voucher #', 'ভাউচার')}</th>
                    <th className="p-3">{tBilingual('Category', 'খরচের খাত')}</th>
                    <th className="p-3">{tBilingual('Description & Notes', 'বিবরণ ও নোট')}</th>
                    <th className="p-3">{tBilingual('Payment Account', 'যে হিসাব থেকে প্রদেয়')}</th>
                    <th className="p-3 text-right">{tBilingual('Amount (৳)', 'টাকা')}</th>
                    <th className="p-3 text-center">{tBilingual('Receipt', 'রসিদ')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 tabular-nums text-slate-500 whitespace-nowrap">
                        {item.transaction_date}
                      </td>
                      <td className="p-3 tabular-nums font-medium text-rose-600 dark:text-rose-400">
                        {item.transaction_number}
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-3xs font-semibold bg-rose-50/50 text-rose-700 dark:text-rose-300 border-rose-200/60">
                          {item.category_label || item.category}
                        </Badge>
                      </td>
                      <td className="p-3 font-medium text-slate-800 dark:text-slate-200 max-w-xs truncate">
                        {item.description}
                        {item.employee_name && (
                          <span className="text-3xs text-slate-400 block font-normal">
                            Payee: {item.employee_name}
                          </span>
                        )}
                        {item.vendor_name && (
                          <span className="text-3xs text-slate-400 block font-normal">
                            Vendor: {item.vendor_name}
                          </span>
                        )}
                      </td>
                      <td className="p-3 tabular-nums text-2xs text-slate-600 dark:text-slate-400">
                        {item.payment_account_name} ({item.payment_account_code})
                      </td>
                      <td className="p-3 text-right tabular-nums font-bold text-rose-600 dark:text-rose-400">
                        ৳{Number(item.amount || 0).toLocaleString()}
                      </td>
                      <td className="p-3 text-center">
                        {item.attachment_url ? (
                          <a
                            href={item.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-blue-600 hover:text-blue-700 inline-flex items-center"
                            title="View attachment / receipt"
                          >
                            <Paperclip className="w-3.5 h-3.5" />
                          </a>
                        ) : (
                          <span className="text-3xs text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}

                  {filteredItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-10 text-center text-slate-400 text-xs">
                        {tBilingual('No expense vouchers found matching criteria.', 'কোনো খরচের ভাউচার পাওয়া যায়নি।')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sub-tab B: Expense Categories */}
      {activeSubTab === 'categories' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_CATEGORIES.map((cat) => {
            const Icon = cat.icon
            const stats = categoryStats.get(cat.id) || { total: 0, count: 0 }
            const percentage = totalExpenses > 0 ? Math.round((stats.total / totalExpenses) * 100) : 0

            return (
              <Card
                key={cat.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs hover:border-blue-300 dark:hover:border-slate-700 transition-all p-4 bg-white dark:bg-slate-900 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${cat.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-900 dark:text-white block">
                          {tBilingual(cat.labelEn, cat.labelBn)}
                        </span>
                        <span className="text-3xs text-slate-400">
                          {stats.count} {tBilingual('entries logged', 'টি ভাউচার')}
                        </span>
                      </div>
                    </div>

                    <Badge variant="outline" className="text-3xs tabular-nums font-bold">
                      {percentage}%
                    </Badge>
                  </div>

                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-3xs text-slate-400 uppercase font-semibold">
                      {tBilingual('Total Spent', 'মোট ব্যয়')}
                    </span>
                    <span className="text-lg tabular-nums font-black text-rose-600 dark:text-rose-400">
                      ৳{stats.total.toLocaleString()}
                    </span>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 flex items-center justify-between">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSelectedCategoryFilter(cat.id)
                      setActiveSubTab('entries')
                    }}
                    className="h-7 text-2xs text-slate-600 dark:text-slate-400 hover:text-slate-900 p-0 font-medium"
                  >
                    {tBilingual('Filter vouchers →', 'ভাউচার দেখুন →')}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => onOpenSpendModal(cat.id)}
                    className="h-7 px-2.5 text-2xs bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-semibold rounded-lg"
                  >
                    + Add
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Sub-tab C: Recurring Expenses */}
      {activeSubTab === 'recurring' && (
        <div className="space-y-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {tBilingual('Fixed Monthly Overheads & Bills', 'মাসিক নির্দিষ্ট পরিচালন খরচ ও বিল')}
                </CardTitle>
                <p className="text-3xs text-slate-400">
                  {tBilingual(
                    'Track recurrent print shop commitments (Rent, Electricity, Internet, AMC)',
                    'প্রতি মাসের নিয়মিত ভাড়া, বিদ্যুৎ, ইন্টারনেট এবং সার্ভিস ফি ট্র্যাকিং'
                  )}
                </p>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {DEFAULT_RECURRING_BILLS.map((bill) => (
                  <div key={bill.id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block">
                          {tBilingual(bill.titleEn, bill.titleBn)}
                        </span>
                        <span className="text-3xs text-slate-400">
                          {tBilingual(`Due day: ${bill.dueDay}th of month`, `মাসের ${bill.dueDay} তারিখের মধ্যে প্রদেয়`)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="tabular-nums font-bold text-sm text-slate-900 dark:text-white block">
                          ৳{bill.amount.toLocaleString()}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            bill.status === 'PAID'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 text-3xs'
                              : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 text-3xs'
                          }
                        >
                          {bill.status === 'PAID' ? 'This Month Paid ✓' : 'Due This Month ⏳'}
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => onOpenSpendModal(bill.category)}
                        className={`h-8 px-3 text-xs rounded-xl font-semibold ${
                          bill.status === 'PAID'
                            ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                            : 'bg-rose-600 hover:bg-rose-700 text-white shadow-xs'
                        }`}
                      >
                        {bill.status === 'PAID' ? tBilingual('Pay Again', 'পুনরায় প্রদান') : tBilingual('Pay Bill', 'বিল পরিশোধ')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
