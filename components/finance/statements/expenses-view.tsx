'use client'

import React, { useState, useMemo } from 'react'
import {
  DollarSign,
  TrendingDown,
  Users,
  Search,
  Filter,
  Download,
  Plus,
  Receipt,
  User,
  Building,
  CreditCard,
  Printer,
  Calendar,
  Sparkles,
  CheckCircle2,
  FileText,
  AlertCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { ExpenseSummaryReport, ExpenseItemRecord } from '@/types/finance.types'

interface ExpensesViewProps {
  report: ExpenseSummaryReport | null
  isLoading?: boolean
  onOpenSpendModal: () => void
  onRefresh: () => void
}

export function ExpensesView({
  report,
  isLoading,
  onOpenSpendModal,
  onRefresh,
}: ExpensesViewProps) {
  const { locale, tBilingual } = useI18n()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedEmployee, setSelectedEmployee] = useState('all')
  const [activeVoucher, setActiveVoucher] = useState<ExpenseItemRecord | null>(null)
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false)

  const items = report?.items || []

  // Filtered expense items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // 1. Search Query
      if (searchTerm) {
        const query = searchTerm.toLowerCase()
        const matchNum = item.transaction_number.toLowerCase().includes(query)
        const matchDesc = item.description.toLowerCase().includes(query)
        const matchVendor = (item.vendor_name || '').toLowerCase().includes(query)
        const matchEmp = (item.employee_name || '').toLowerCase().includes(query)
        const matchCat = item.category_label.toLowerCase().includes(query)
        if (!matchNum && !matchDesc && !matchVendor && !matchEmp && !matchCat) {
          return false
        }
      }

      // 2. Category Filter
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false
      }

      // 3. Employee Filter
      if (selectedEmployee !== 'all') {
        const empId = item.employee_id || item.employee_name
        if (empId !== selectedEmployee) return false
      }

      return true
    })
  }, [items, searchTerm, selectedCategory, selectedEmployee])

  const handlePrintVoucher = (item: ExpenseItemRecord) => {
    setActiveVoucher(item)
    setIsVoucherModalOpen(true)
  }

  const handleExportCSV = () => {
    if (filteredItems.length === 0) return
    const headers = ['Voucher No', 'Date', 'Category', 'Payee / Employee', 'Account', 'Amount (BDT)', 'Narration']
    const rows = filteredItems.map((i) => [
      i.transaction_number,
      i.transaction_date,
      i.category_label,
      i.employee_name || i.vendor_name || 'General',
      i.payment_account_name,
      i.amount,
      `"${(i.description || '').replace(/"/g, '""')}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `inkflow_expenses_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-rose-600" />
            <span>{tBilingual('Expense & Staff Salary Ledger', 'ব্যয় ও কর্মকর্তা-কর্মচারীদের বেতন খতিয়ান')}</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {tBilingual(
              'Track operating expenses, factory overhead, staff salaries, advances, and daily worker wages.',
              'কারখানা পরিচালনা ব্যয়, মাসিক বেতন, স্টাফ অগ্রিম ও দৈনিক মজুরির সার্বিক হিসাব।'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="rounded-xl text-xs h-9"
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            <span>{tBilingual('Export CSV', 'এক্সপোর্ট')}</span>
          </Button>
          <Button
            size="sm"
            onClick={onOpenSpendModal}
            className="rounded-xl text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold shadow-md shadow-rose-600/20"
          >
            <Plus className="w-4 h-4 mr-1" />
            <span>{tBilingual('Record Expense / Salary', 'নতুন খরচ / বেতন এন্ট্রি')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Top Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="rounded-2xl border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-800 dark:text-rose-300">
              {tBilingual('Total Expenses', 'মোট সর্বমোট ব্যয়')}
            </span>
            <TrendingDown className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-black text-rose-950 dark:text-rose-100 mt-1">
            ৳{(report?.total_expenses || 0).toLocaleString()}
          </div>
          <div className="text-2xs text-rose-700/80 dark:text-rose-300/80 mt-0.5">
            {items.length} {tBilingual('Vouchers recorded', 'টি ভাউচার')}
          </div>
        </Card>

        <Card className="rounded-2xl border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800 dark:text-indigo-300">
              {tBilingual('Monthly Staff Salaries', 'মাসিক স্টাফ বেতন')}
            </span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-black text-indigo-950 dark:text-indigo-100 mt-1">
            ৳{(report?.total_staff_salary || 0).toLocaleString()}
          </div>
          <div className="text-2xs text-indigo-700/80 dark:text-indigo-300/80 mt-0.5">
            {tBilingual('OPEX Staff Payroll', 'নিয়মিত কর্মচারীদের বেতন')}
          </div>
        </Card>

        <Card className="rounded-2xl border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {tBilingual('Salary Advances', 'স্টাফ বেতন অগ্রিম')}
            </span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-black text-amber-950 dark:text-amber-100 mt-1">
            ৳{(report?.total_salary_advance || 0).toLocaleString()}
          </div>
          <div className="text-2xs text-amber-700/80 dark:text-amber-300/80 mt-0.5">
            {tBilingual('Deductible from payroll', 'ভবিষ্যতে কর্তনযোগ্য')}
          </div>
        </Card>

        <Card className="rounded-2xl border-blue-200 dark:border-blue-900/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-blue-800 dark:text-blue-300">
              {tBilingual('Daily Labor & Wages', 'দৈনিক মজুরি ও ওভারটাইম')}
            </span>
            <User className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-black text-blue-950 dark:text-blue-100 mt-1">
            ৳{(report?.total_daily_labor || 0).toLocaleString()}
          </div>
          <div className="text-2xs text-blue-700/80 dark:text-blue-300/80 mt-0.5">
            {tBilingual('COGS Direct Labor', 'উৎপাদন শ্রম খরচ')}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {tBilingual('Factory & Overhead', 'কারখানা ও অন্যান্য খরচ')}
            </span>
            <Building className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-200 mt-1">
            ৳{(report?.total_operational_overhead || 0).toLocaleString()}
          </div>
          <div className="text-2xs text-slate-500 mt-0.5">
            {tBilingual('Rent, Utilities, Parts, Fuel', 'ভাড়া, বিদ্যুৎ, মেরামত ও তেল')}
          </div>
        </Card>
      </div>

      {/* 3. Staff Salary & Advance Payout Overview Card */}
      {report?.by_employee && report.by_employee.length > 0 && (
        <Card className="rounded-2xl border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 dark:from-slate-900 dark:to-indigo-950/20 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-600" />
                  <span>{tBilingual('Staff Salary & Advance Payout Summary', 'কর্মচারী অনুযায়ী বেতন ও অগ্রিম বিবরণ')}</span>
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  {tBilingual('Individual payout totals for current period', 'চলতি সময়ের স্টাফভিত্তিক মোট প্রাপ্তি')}
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 text-xs">
                {report.by_employee.length} {tBilingual('Staff Members Paid', 'জন স্টাফ')}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
              {report.by_employee.map((emp) => (
                <div
                  key={emp.employee_id}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl space-y-1.5 shadow-2xs hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {emp.employee_name}
                    </div>
                    <Badge variant="secondary" className="text-2xs px-1.5 py-0">
                      {emp.transaction_count} {tBilingual('payouts', 'বার')}
                    </Badge>
                  </div>
                  <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <span className="text-2xs text-slate-500">{tBilingual('Total Paid:', 'মোট পরিশোধ:')}</span>
                    <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      ৳{emp.total_paid.toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-2xs text-slate-500 pt-0.5">
                    <div>
                      বেতন: <span className="font-semibold text-slate-700 dark:text-slate-300">৳{emp.salary_total.toLocaleString()}</span>
                    </div>
                    <div>
                      অগ্রিম: <span className="font-semibold text-amber-600">৳{emp.advance_total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 4. Filter & Search Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={tBilingual('Search voucher, payee, narration...', 'ভাউচার, কর্মচারী বা বিবরণ খুঁজুন...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-9 text-xs rounded-xl"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="h-9 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            <option value="all">{tBilingual('All Categories', 'সকল খরচের খাত')}</option>
            <option value="staff_salary">👨‍💼 {tBilingual('Monthly Staff Salary', 'মাসিক স্টাফ বেতন')}</option>
            <option value="salary_advance">💸 {tBilingual('Salary Advance', 'স্টাফ বেতন অগ্রিম')}</option>
            <option value="daily_labor">👷 {tBilingual('Daily Labor & Wages', 'দৈনিক মজুরি ও ওভারটাইম')}</option>
            <option value="factory_rent">🏢 {tBilingual('Factory & Rent', 'কারখানা ও দোকান ভাড়া')}</option>
            <option value="electricity_utility">⚡ {tBilingual('Electricity & Utilities', 'বিদ্যুৎ ও ইউটিলিটি')}</option>
            <option value="machine_maintenance">🔧 {tBilingual('Machine Repair & Parts', 'মেশিন মেরামত ও পার্টস')}</option>
            <option value="raw_materials">📦 {tBilingual('Raw Materials & Ink', 'খুচরা মালামাল ও কালি')}</option>
            <option value="transport_fuel">🚚 {tBilingual('Transport & Fuel', 'পরিবহন ও জ্বালানি')}</option>
            <option value="tea_snacks">☕ {tBilingual('Tea, Snacks & Guest', 'চা, নাস্তা ও আপ্যায়ন')}</option>
            <option value="office_stationery">📝 {tBilingual('Office Stationery', 'স্টেশনারি ও কাগজ')}</option>
            <option value="marketing_promo">📢 {tBilingual('Marketing & Promo', 'মার্কেটিং ও বিজ্ঞাপন')}</option>
            <option value="govt_tax_fees">🏛️ {tBilingual('Govt Tax & Fees', 'ট্যাক্স ও লাইসেন্স ফি')}</option>
            <option value="miscellaneous">📂 {tBilingual('Miscellaneous', 'অন্যান্য বিবিধ খরচ')}</option>
          </select>

          {/* Employee Filter */}
          {report?.by_employee && report.by_employee.length > 0 && (
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="h-9 px-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
            >
              <option value="all">{tBilingual('All Staff Members', 'সকল স্টাফ / কর্মচারী')}</option>
              {report.by_employee.map((emp) => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {tBilingual('Showing', 'দেখানো হচ্ছে')} <span className="font-bold text-slate-800 dark:text-slate-200">{filteredItems.length}</span> {tBilingual('of', 'এর মধ্যে')} {items.length} {tBilingual('records', 'টি রেকর্ড')}
        </div>
      </div>

      {/* 5. Transactions Table */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 font-semibold">
                <th className="py-3 px-4">{tBilingual('Voucher No', 'ভাউচার নং')}</th>
                <th className="py-3 px-3">{tBilingual('Date', 'তারিখ')}</th>
                <th className="py-3 px-3">{tBilingual('Category', 'খরচের খাত')}</th>
                <th className="py-3 px-3">{tBilingual('Payee / Employee', 'প্রাপক / কর্মচারী')}</th>
                <th className="py-3 px-3">{tBilingual('Payment Account', 'পরিশোধের তহবিল')}</th>
                <th className="py-3 px-3">{tBilingual('Description', 'বিবরণ ও নোট')}</th>
                <th className="py-3 px-4 text-right">{tBilingual('Amount', 'পরিমাণ')}</th>
                <th className="py-3 px-4 text-center">{tBilingual('Action', 'অ্যাকশন')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Receipt className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                    <div className="text-sm font-semibold">{tBilingual('No expense records found', 'কোনো খরচের রেকর্ড পাওয়া যায়নি')}</div>
                    <p className="text-xs text-slate-400 mt-1">
                      {tBilingual('Click "Record Expense / Salary" to create your first voucher.', 'নতুন ভাউচার এন্ট্রি করতে উপরের বাটনে ক্লিক করুন।')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isSalary = item.category === 'staff_salary' || item.category === 'salary'
                  const isAdvance = item.category === 'salary_advance' || item.category === 'advance'
                  const isLabor = item.category === 'daily_labor' || item.category === 'labor'

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {item.transaction_number}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {item.transaction_date}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant="outline"
                          className={`text-2xs font-medium px-2 py-0.5 rounded-md ${
                            isSalary
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                              : isAdvance
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : isLabor
                              ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                              : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {locale === 'bn' ? item.category_label_bn : item.category_label}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200">
                        {item.employee_name ? (
                          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-semibold">
                            <User className="w-3.5 h-3.5" />
                            <span>{item.employee_name}</span>
                          </div>
                        ) : item.vendor_name ? (
                          <span className="text-slate-700 dark:text-slate-300">{item.vendor_name}</span>
                        ) : (
                          <span className="text-slate-400 italic">{tBilingual('General', 'সাধারণ')}</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-3 h-3 text-slate-400" />
                          <span>{item.payment_account_name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600 dark:text-slate-400 max-w-[240px] truncate" title={item.description}>
                        {item.description}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-rose-600 dark:text-rose-400">
                        ৳{item.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePrintVoucher(item)}
                          className="h-7 w-7 p-0 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title={tBilingual('Print Voucher Slip', 'ভাউচার রসিদ দেখুন / প্রিন্ট করুন')}
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 6. Printable Payment Voucher Modal */}
      {activeVoucher && (
        <ModalDialog
          open={isVoucherModalOpen}
          onOpenChange={(open) => !open && setIsVoucherModalOpen(false)}
          title={tBilingual('Payment Voucher Slip', 'টাকা প্রদানের ভাউচার রসিদ')}
          hideFooter={true}
        >
          <div className="space-y-4 pt-1" id="printable-voucher">
            {/* Voucher Header */}
            <div className="border-b-2 border-slate-800 pb-3 flex items-start justify-between">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-slate-100">
                  {tBilingual('InkFlow Business ERP', 'ইঙ্কফ্লো বিজনেস ইআরপি')}
                </h3>
                <p className="text-xs text-slate-500">
                  {tBilingual('Debit / Payment Voucher', 'ডেবিট / খরচ প্রদান ভাউচার')}
                </p>
              </div>
              <div className="text-right font-mono text-xs">
                <div className="font-bold text-rose-600">{activeVoucher.transaction_number}</div>
                <div className="text-slate-500">{activeVoucher.transaction_date}</div>
              </div>
            </div>

            {/* Voucher Details Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-2xs text-slate-500 uppercase font-semibold">
                  {tBilingual('Expense Category', 'খরচের খাত')}
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {activeVoucher.category_label} ({activeVoucher.category_label_bn})
                </div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
                <span className="text-2xs text-slate-500 uppercase font-semibold">
                  {tBilingual('Payee / Beneficiary', 'প্রাপক / সুবিধাভোগী')}
                </span>
                <div className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                  {activeVoucher.employee_name || activeVoucher.vendor_name || 'General Payee'}
                </div>
              </div>
            </div>

            {/* Amount Box */}
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                  {tBilingual('Total Amount Paid', 'মোট প্রদত্ত টাকা')}
                </span>
                <div className="text-2xl font-black text-rose-950 dark:text-rose-100">
                  ৳{activeVoucher.amount.toLocaleString()}
                </div>
              </div>
              <div className="text-right text-xs text-rose-800 dark:text-rose-300">
                <div>{tBilingual('Paid From:', 'হিসাব:')} <strong>{activeVoucher.payment_account_name}</strong></div>
                <div>{tBilingual('Channel:', 'মাধ্যম:')} {activeVoucher.payment_method || 'Cash'}</div>
              </div>
            </div>

            {/* Memo & Narration */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/30 rounded-xl text-xs space-y-1">
              <span className="text-2xs text-slate-500 uppercase font-semibold">
                {tBilingual('Narration & Notes', 'বিবরণ ও মন্তব্য')}
              </span>
              <p className="text-slate-700 dark:text-slate-300 font-medium">
                {activeVoucher.description}
              </p>
            </div>

            {/* Signature Blocks for Print */}
            <div className="grid grid-cols-3 gap-3 pt-6 border-t border-dashed border-slate-300 dark:border-slate-700 text-center text-2xs text-slate-500">
              <div>
                <div className="h-8"></div>
                <div className="border-t border-slate-400 pt-1 font-semibold">{tBilingual('Prepared By', 'প্রস্তুতকারক')}</div>
                <div>{activeVoucher.posted_by_name}</div>
              </div>
              <div>
                <div className="h-8"></div>
                <div className="border-t border-slate-400 pt-1 font-semibold">{tBilingual('Receiver Sign', 'গ্রহীতার স্বাক্ষর')}</div>
                <div>{activeVoucher.employee_name || activeVoucher.vendor_name || ''}</div>
              </div>
              <div>
                <div className="h-8"></div>
                <div className="border-t border-slate-400 pt-1 font-semibold">{tBilingual('Authorized Manager', 'অনুমোদনকারী')}</div>
                <div>Managing Director</div>
              </div>
            </div>

            {/* Print & Close Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsVoucherModalOpen(false)}
                className="rounded-xl"
              >
                {tBilingual('Close', 'বন্ধ করুন')}
              </Button>
              <Button
                size="sm"
                onClick={() => window.print()}
                className="bg-slate-900 text-white hover:bg-slate-800 rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>{tBilingual('Print Voucher', 'ভাউচার প্রিন্ট করুন')}</span>
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
