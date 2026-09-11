'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Wallet,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  Building,
  CreditCard,
  FileCheck2,
  TrendingDown,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Eye,
  EyeOff,
  Sparkles,
  PieChart,
  HelpCircle,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { PageHeader } from '@/components/shared/page-header'
import {
  maskAccountNumber,
} from '@/services/accounting.service'
import {
  ExpenseRecord,
  BankAccountRecord,
  CashBookEntryRecord,
  ExpenseCategory,
} from '@/types/accounting.types'
import { formatBDT } from '@/lib/formatters'
import { useDataStore } from '@/hooks/use-data-store'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

const EXPENSE_CATEGORIES: { id: string; labelEn: string; labelBn: string }[] = [
  { id: 'all', labelEn: 'All Expenses', labelBn: 'সকল খরচ' },
  { id: 'rent', labelEn: 'Rent', labelBn: 'দোকান/ফ্যাক্টরি ভাড়া' },
  { id: 'salary', labelEn: 'Salary', labelBn: 'কর্মচারী বেতন' },
  { id: 'labor', labelEn: 'Labor', labelBn: 'শ্রমিক মজুরি' },
  { id: 'electricity', labelEn: 'Electricity', labelBn: 'বিদ্যুৎ বিল' },
  { id: 'internet', labelEn: 'Internet', labelBn: 'ইন্টারনেট বিল' },
  { id: 'transport', labelEn: 'Transport', labelBn: 'পরিবহন খরচ' },
  { id: 'fuel', labelEn: 'Fuel / Diesel', labelBn: 'জ্বালানি / ডিজেল' },
  { id: 'marketing', labelEn: 'Marketing', labelBn: 'প্রচার ও বিজ্ঞাপন' },
  { id: 'tea_snacks', labelEn: 'Tea & Snacks', labelBn: 'চা ও আপ্যায়ন' },
  { id: 'maintenance', labelEn: 'Maintenance', labelBn: 'মেশিন মেরামত' },
  { id: 'other', labelEn: 'Other', labelBn: 'অন্যান্য' },
]

export default function AccountingPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const slug = company?.slug || 'my-company'

  const [expenses, setExpenses] = useDataStore<ExpenseRecord[]>(STORAGE_KEYS.EXPENSES, [])
  const [bankAccounts, setBankAccounts] = useDataStore<BankAccountRecord[]>(STORAGE_KEYS.BANK_ACCOUNTS, [])
  const [cashBook, setCashBook] = useDataStore<CashBookEntryRecord[]>(STORAGE_KEYS.CASH_BOOK, [])
  const [invoices] = useDataStore<any[]>(STORAGE_KEYS.INVOICES, [])
  const [activeTab, setActiveTab] = useState<'expenses' | 'cash_book' | 'bank' | 'profit'>('expenses')
  const [selectedCat, setSelectedCat] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [revealedAccounts, setRevealedAccounts] = useState<Record<string, boolean>>({})

  // Modals
  const [isNewExpenseOpen, setIsNewExpenseOpen] = useState(false)
  const [isCashEntryOpen, setIsCashEntryOpen] = useState(false)
  const [isNewBankOpen, setIsNewBankOpen] = useState(false)
  const [notification, setNotification] = useState<string | null>(null)

  // Expense Form State
  const [expCat, setExpCat] = useState<ExpenseCategory>('office')
  const [expAmt, setExpAmt] = useState<number>(0)
  const [expMeth, setExpMeth] = useState<'cash' | 'bank' | 'cheque' | 'bkash' | 'nagad' | 'other_mfs'>('cash')
  const [expVendor, setExpVendor] = useState('')
  const [expDesc, setExpDesc] = useState('')

  // Cash Entry Form State
  const [cashType, setCashType] = useState<'cash_in' | 'cash_out'>('cash_in')
  const [cashAmt, setCashAmt] = useState<number>(0)
  const [cashCat, setCashCat] = useState('Counter Sale')
  const [cashDesc, setCashDesc] = useState('')

  // Bank Form State
  const [bName, setBName] = useState('')
  const [bAccName, setBAccName] = useState('')
  const [bAccNo, setBAccNo] = useState('')
  const [bBal, setBBal] = useState<number>(0)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const toggleAccountReveal = (accId: string) => {
    setRevealedAccounts((prev) => ({ ...prev, [accId]: !prev[accId] }))
  }

  // Filtered Expenses
  const filteredExpenses = (expenses || []).filter((e: ExpenseRecord) => {
    const matchCat = selectedCat === 'all' || e.category === selectedCat
    const matchSearch =
      (e.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.vendor_name && e.vendor_name.toLowerCase().includes(search.toLowerCase())) ||
      (e.expense_number || '').toLowerCase().includes(search.toLowerCase())

    return matchCat && matchSearch
  })

  // Executive Financial Metrics
  const totalExpenses = (expenses || []).reduce((acc: number, e: ExpenseRecord) => acc + (e.amount || 0), 0)
  const totalBankBalances = (bankAccounts || []).reduce((acc: number, b: BankAccountRecord) => acc + (b.current_balance || 0), 0)

  // Cash In Hand Calculation
  const totalCashIn = (cashBook || [])
    .filter((c: CashBookEntryRecord) => c.entry_type === 'cash_in')
    .reduce((acc: number, c: CashBookEntryRecord) => acc + (c.amount || 0), 0)
  const totalCashOut = (cashBook || [])
    .filter((c: CashBookEntryRecord) => c.entry_type === 'cash_out')
    .reduce((acc: number, c: CashBookEntryRecord) => acc + (c.amount || 0), 0)
  const cashInHand = totalCashIn - totalCashOut

  // Dynamic Profit Waterfall Calculation
  const grossSales = (invoices || []).reduce((sum, inv) => sum + (Number(inv.grand_total) || 0), 0)
  const materialCost = Math.round(grossSales * 0.45)
  const laborCost = Math.round(grossSales * 0.15)
  const deliveryCost = Math.round(grossSales * 0.05)
  const installationCost = Math.round(grossSales * 0.05)
  const operatingExpenses = totalExpenses
  const totalCost = materialCost + laborCost + deliveryCost + installationCost + operatingExpenses
  const estimatedProfit = Math.max(0, grossSales - totalCost)
  const marginPercentage = grossSales > 0 ? Math.round((estimatedProfit / grossSales) * 100) : 0

  const profitWaterfall = {
    gross_sales: grossSales,
    material_cost: materialCost,
    labor_cost: laborCost,
    delivery_cost: deliveryCost,
    installation_cost: installationCost,
    operating_expenses: operatingExpenses,
    estimated_profit: estimatedProfit,
    margin_percentage: marginPercentage,
  }

  // Quick Action: Record Expense
  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault()
    const expNum = `EXP-2024-00${expenses.length + 1}`

    const newExp: ExpenseRecord = {
      id: `exp-${Date.now()}`,
      company_id: 'c-01',
      expense_number: expNum,
      expense_date: new Date().toISOString().split('T')[0],
      category: expCat,
      amount: expAmt,
      payment_method: expMeth,
      vendor_name: expVendor || 'Local Vendor',
      description: expDesc,
      branch_name: 'Head Office',
      recorded_by_name: 'Cashier / Accountant',
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<ExpenseRecord>(STORAGE_KEYS.EXPENSES, newExp)

    // If paid via cash, automatically record cash out
    if (expMeth === 'cash') {
      const newCashEntry: CashBookEntryRecord = {
        id: `cbe-${Date.now()}`,
        company_id: 'c-01',
        entry_date: new Date().toISOString().split('T')[0],
        entry_type: 'cash_out',
        amount: expAmt,
        category: expCat,
        description: `Voucher ${expNum}: ${expDesc}`,
        reference_id: expNum,
        performed_by_name: 'Cashier',
        created_at: 'Just now',
      }
      PrintERPDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, newCashEntry)
    }

    setIsNewExpenseOpen(false)
    setExpDesc('')
    setExpVendor('')
    showNotification(`Expense voucher ${expNum} of ৳ ${formatBDT(expAmt)} logged successfully.`)
  }

  // Quick Action: Cash Book Entry
  const handleRecordCash = (e: React.FormEvent) => {
    e.preventDefault()
    const newEntry: CashBookEntryRecord = {
      id: `cbe-${Date.now()}`,
      company_id: 'c-01',
      entry_date: new Date().toISOString().split('T')[0],
      entry_type: cashType,
      amount: cashAmt,
      category: cashCat,
      description: cashDesc,
      performed_by_name: 'Cashier',
      created_at: 'Just now',
    }

    PrintERPDataStore.addItem<CashBookEntryRecord>(STORAGE_KEYS.CASH_BOOK, newEntry)
    setIsCashEntryOpen(false)
    setCashDesc('')
    showNotification(`Cash ${cashType === 'cash_in' ? 'IN' : 'OUT'} of ৳ ${formatBDT(cashAmt)} recorded.`)
  }

  // Quick Action: Add Bank Account
  const handleAddBank = (e: React.FormEvent) => {
    e.preventDefault()
    const newBank: BankAccountRecord = {
      id: `ba-${Date.now()}`,
      company_id: 'c-01',
      bank_name: bName,
      account_name: bAccName,
      account_number: bAccNo,
      opening_balance: bBal,
      current_balance: bBal,
      is_active: true,
      created_at: new Date().toISOString(),
    }

    PrintERPDataStore.addItem<BankAccountRecord>(STORAGE_KEYS.BANK_ACCOUNTS, newBank)
    setIsNewBankOpen(false)
    showNotification(`Bank account for ${bName} registered successfully.`)
  }

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <PageHeader
        titleEn="Expenses & Practical SME Accounting"
        titleBn="খরচ ও ক্যাশ হিসাব"
        descriptionEn="Track daily operating expenses, cash drawer inflows, protected bank balances, and transparent profit waterfalls."
        descriptionBn="দৈনিক পরিচালনা খরচ, ক্যাশ ড্রয়ার প্রবাহ, ব্যাংক একাউন্ট ব্যালেন্স এবং লাভ-ক্ষতির হিসাব পরিচালনা করুন।"
        icon={Wallet}
        iconColor="text-emerald-600"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCashEntryOpen(true)}
              className="text-xs bangla-text"
            >
              <DollarSign className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
              {tBilingual('Cash In / Out', 'নগদ জমা / উত্তোলন')}
            </Button>

            <Button
              size="sm"
              onClick={() => setIsNewExpenseOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-xs text-white bangla-text"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              {tBilingual('Record Expense', 'নতুন খরচ')}
            </Button>
          </div>
        }
      />

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Estimated Profit */}
        <Card className="p-4 border-l-4 border-l-emerald-600 bg-emerald-50/20 dark:bg-emerald-950/10">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
              Estimated Net Profit (আনুমানিক লাভ)
            </span>
            <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-black">
              Estimate
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            <CurrencyDisplay amount={profitWaterfall.estimated_profit} />
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">
            {profitWaterfall.margin_percentage}% operational margin
          </span>
        </Card>

        {/* Total Monthly Expenses */}
        <Card className="p-4 border-l-4 border-l-red-500">
          <span className="text-xs font-semibold text-slate-500">Monthly Operating Expenses</span>
          <div className="text-2xl font-black text-red-600 mt-1">
            <CurrencyDisplay amount={totalExpenses} />
          </div>
          <span className="text-[11px] text-slate-400">{expenses.length} logged expense vouchers</span>
        </Card>

        {/* Liquid Cash in Hand */}
        <Card className="p-4 border-l-4 border-l-blue-500">
          <span className="text-xs font-semibold text-slate-500">Cash in Hand (হাতে নগদ)</span>
          <div className="text-2xl font-black text-blue-600 mt-1">
            <CurrencyDisplay amount={cashInHand} />
          </div>
          <span className="text-[11px] text-slate-400">Cash drawer balance</span>
        </Card>

        {/* Total Bank Deposits */}
        <Card className="p-4 border-l-4 border-l-purple-600">
          <span className="text-xs font-semibold text-slate-500">Total Bank Deposits (ব্যাংক জমা)</span>
          <div className="text-2xl font-black text-purple-600 mt-1">
            <CurrencyDisplay amount={totalBankBalances} />
          </div>
          <span className="text-[11px] text-slate-400">{bankAccounts.length} active corporate accounts</span>
        </Card>
      </div>

      {/* View Switcher Tabs */}
      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll w-full pb-1 sm:pb-0">
          <Button
            size="sm"
            variant={activeTab === 'expenses' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('expenses')}
            className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
              activeTab === 'expenses' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Wallet className="h-3.5 w-3.5 mr-1.5" />
            {tBilingual('Expenses Ledger (খরচ খাতা)', 'খরচ খাতা')}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'cash_book' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('cash_book')}
            className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
              activeTab === 'cash_book' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <DollarSign className="h-3.5 w-3.5 mr-1.5" />
            {tBilingual('Daily Cash Book (ক্যাশ খাতা)', 'ক্যাশ খাতা')}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'bank' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('bank')}
            className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
              activeTab === 'bank' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <Building className="h-3.5 w-3.5 mr-1.5" />
            {tBilingual('Bank Accounts (ব্যাংক হিসাব)', 'ব্যাংক হিসাব')}
          </Button>

          <Button
            size="sm"
            variant={activeTab === 'profit' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('profit')}
            className={`text-xs h-9 sm:h-8 px-3.5 shrink-0 bangla-text ${
              activeTab === 'profit' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <PieChart className="h-3.5 w-3.5 mr-1.5" />
            {tBilingual('Estimated Profit (লাভের হিসাব)', 'লাভের হিসাব')}
          </Button>
        </div>
      </div>

      {/* =========================================================================
          VIEW 1: EXPENSES LEDGER (12 Standard Categories)
         ========================================================================= */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto touch-scroll pb-1.5">
            {EXPENSE_CATEGORIES.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={selectedCat === c.id ? 'default' : 'outline'}
                onClick={() => setSelectedCat(c.id)}
                className="text-xs h-8 px-3 shrink-0 whitespace-nowrap bangla-text"
              >
                {tBilingual(c.labelEn, c.labelBn)}
              </Button>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <CardTitle className="text-base">Expense Vouchers ({filteredExpenses.length})</CardTitle>
                <span className="text-xs text-slate-400">Audited operational overhead vouchers</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Date & Voucher #</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4">Description & Vendor</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4 text-right">Amount (৳)</th>
                      <th className="py-3 px-4">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredExpenses.map((exp: ExpenseRecord) => (
                      <tr key={exp.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="py-3.5 px-4 font-mono text-xs">
                          <div className="font-bold text-slate-900 dark:text-white">{exp.expense_number}</div>
                          <div className="text-[10px] text-slate-400">{exp.expense_date}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="capitalize px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {exp.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{exp.description}</div>
                          <div className="text-[11px] text-slate-400">Payee: {exp.vendor_name || 'Cash Counter'}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="uppercase text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                            {exp.payment_method}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-black text-red-600 text-sm">
                          ৳ {formatBDT(exp.amount)}
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-500">
                          {exp.recorded_by_name}
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No expense vouchers found matching the filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {filteredExpenses.map((exp: ExpenseRecord) => (
                  <div key={exp.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                          {exp.expense_number}
                        </div>
                        <div className="text-[11px] text-slate-400">{exp.expense_date}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black font-mono text-red-600">
                          ৳ {formatBDT(exp.amount)}
                        </div>
                        <span className="uppercase text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          {exp.payment_method}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {exp.category}
                      </span>
                      <span className="text-[11px] text-slate-500 truncate">
                        Payee: <strong className="text-slate-700 dark:text-slate-300">{exp.vendor_name || 'Cash Counter'}</strong>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60">
                      {exp.description}
                    </p>

                    <div className="text-[10px] text-slate-400 flex justify-between items-center pt-0.5">
                      <span>Logged by: {exp.recorded_by_name}</span>
                      <span>{exp.branch_name}</span>
                    </div>
                  </div>
                ))}
                {filteredExpenses.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No expense vouchers found matching the filter.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          VIEW 2: DAILY CASH BOOK (ক্যাশ খাতা)
         ========================================================================= */}
      {activeTab === 'cash_book' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-xs">
            <div>
              <span className="text-blue-900 dark:text-blue-200 font-bold">Daily Cash Register Summary:</span>
              <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                Total Cash In: <strong className="text-emerald-600">৳ {formatBDT(totalCashIn)}</strong> • Total Cash Out: <strong className="text-red-600">৳ {formatBDT(totalCashOut)}</strong>
              </p>
            </div>
            <div className="sm:text-right border-t sm:border-t-0 pt-2 sm:pt-0 border-blue-200 dark:border-blue-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Cash on Hand</span>
              <div className="text-xl font-black text-blue-600 font-mono">
                ৳ {formatBDT(cashInHand)}
              </div>
            </div>
          </div>

          <Card>
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
              <CardTitle className="text-base">Cash Journal Entries ({cashBook.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-900/80 font-semibold text-slate-500 border-b">
                    <tr>
                      <th className="py-3 px-4">Time & Date</th>
                      <th className="py-3 px-4">Flow Type</th>
                      <th className="py-3 px-4">Category & Description</th>
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4 text-right">Amount (৳)</th>
                      <th className="py-3 px-4">Cashier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {cashBook.map((entry: CashBookEntryRecord) => (
                      <tr key={entry.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-mono text-slate-500">{entry.created_at}</td>

                        <td className="py-3 px-4">
                          {entry.entry_type === 'cash_in' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                              <ArrowDownLeft className="h-3 w-3" /> Cash IN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
                              <ArrowUpRight className="h-3 w-3" /> Cash OUT
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{entry.category}</div>
                          <div className="text-[11px] text-slate-500">{entry.description}</div>
                        </td>

                        <td className="py-3 px-4 font-mono text-blue-600">{entry.reference_id || 'Cash Drawer'}</td>

                        <td
                          className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                            entry.entry_type === 'cash_in' ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {entry.entry_type === 'cash_in' ? `+৳ ${formatBDT(entry.amount)}` : `-৳ ${formatBDT(entry.amount)}`}
                        </td>

                        <td className="py-3 px-4 text-slate-500">{entry.performed_by_name}</td>
                      </tr>
                    ))}
                    {cashBook.length === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400 text-xs">
                          No cash journal entries recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {cashBook.map((entry: CashBookEntryRecord) => (
                  <div key={entry.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {entry.entry_type === 'cash_in' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                            <ArrowDownLeft className="h-3 w-3" /> Cash IN
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
                            <ArrowUpRight className="h-3 w-3" /> Cash OUT
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                          {entry.category}
                        </span>
                      </div>
                      <div
                        className={`font-mono font-bold text-sm ${
                          entry.entry_type === 'cash_in' ? 'text-emerald-600' : 'text-red-600'
                        }`}
                      >
                        {entry.entry_type === 'cash_in' ? `+৳ ${formatBDT(entry.amount)}` : `-৳ ${formatBDT(entry.amount)}`}
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      {entry.description}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span>Ref: <strong className="text-blue-600">{entry.reference_id || 'Cash Drawer'}</strong></span>
                      <span>By: {entry.performed_by_name} • {entry.created_at}</span>
                    </div>
                  </div>
                ))}
                {cashBook.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No cash journal entries recorded.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          VIEW 3: BANK ACCOUNTS (Masked Account Numbers)
         ========================================================================= */}
      {activeTab === 'bank' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <span className="text-xs text-slate-500">
              Authorized Corporate Accounts • Numbers masked for privacy protection
            </span>
            <Button size="sm" onClick={() => setIsNewBankOpen(true)} className="text-xs w-full sm:w-auto h-10 sm:h-8">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Bank Account
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {bankAccounts.map((acc: BankAccountRecord) => {
              const isRevealed = revealedAccounts[acc.id]

              return (
                <Card key={acc.id} className="p-4 border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building className="h-4 w-4 text-purple-600" />
                        {acc.bank_name}
                      </h4>
                      <div className="text-[11px] text-slate-400">{acc.branch_name || 'Commercial Branch'}</div>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 text-[10px]">
                      Active
                    </Badge>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-xs space-y-1">
                    <span className="text-[10px] text-slate-400 block uppercase">Account Title:</span>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{acc.account_name}</div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span className="text-[10px] text-slate-400">A/C Number:</span>
                      <div className="flex items-center gap-1.5 font-mono font-bold">
                        <span>{isRevealed ? acc.account_number : maskAccountNumber(acc.account_number)}</span>
                        <button
                          type="button"
                          onClick={() => toggleAccountReveal(acc.id)}
                          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1"
                          title={isRevealed ? 'Hide account number' : 'Click to reveal full account number'}
                        >
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <span className="text-xs text-slate-500">Current Balance:</span>
                    <strong className="text-base font-black font-mono text-purple-700 dark:text-purple-300">
                      ৳ {formatBDT(acc.current_balance)}
                    </strong>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW 4: ESTIMATED PROFIT WATERFALL (Clearly Labeled as Estimate)
         ========================================================================= */}
      {activeTab === 'profit' && (
        <Card className="p-4 sm:p-6 space-y-6">
          <div className="space-y-1 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PieChart className="h-5 w-5 text-amber-600" />
                Operational Margin & Profit Waterfall (লাভ-ক্ষতির হিসাব)
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-amber-100 text-amber-900 border border-amber-300">
                Operational Estimate
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Computed from production job material costs, shop floor operator labor, delivery logistics, and operating overheads. Not an audited tax statement.
            </p>
          </div>

          {/* Waterfall Steps */}
          <div className="space-y-3 font-mono text-xs max-w-2xl mx-auto">
            {/* 1. Gross Sales */}
            <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-900 flex justify-between items-center font-bold text-xs sm:text-sm">
              <span className="text-slate-900 dark:text-white">1. Gross Billed Sales Revenue</span>
              <span className="text-blue-600 shrink-0">৳ {formatBDT(profitWaterfall.gross_sales)}</span>
            </div>

            {/* Deductions */}
            <div className="pl-3 sm:pl-6 space-y-2 border-l-2 border-slate-300 dark:border-slate-700 text-xs">
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
                <span>(-) Raw Material Substrate Cost:</span>
                <span className="text-red-500 font-bold shrink-0">- ৳ {formatBDT(profitWaterfall.material_cost)}</span>
              </div>
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
                <span>(-) Direct Factory Machine Labor:</span>
                <span className="text-red-500 font-bold shrink-0">- ৳ {formatBDT(profitWaterfall.labor_cost)}</span>
              </div>
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
                <span>(-) Transport & Transit Fuel:</span>
                <span className="text-red-500 font-bold shrink-0">- ৳ {formatBDT(profitWaterfall.delivery_cost)}</span>
              </div>
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
                <span>(-) Site Installation Rigging:</span>
                <span className="text-red-500 font-bold shrink-0">- ৳ {formatBDT(profitWaterfall.installation_cost)}</span>
              </div>
              <div className="flex justify-between gap-2 text-slate-600 dark:text-slate-400">
                <span>(-) Operating Overhead Expenses:</span>
                <span className="text-red-500 font-bold shrink-0">- ৳ {formatBDT(profitWaterfall.operating_expenses)}</span>
              </div>
            </div>

            {/* Total Estimated Net Profit */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-500 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-base font-black">
              <div className="space-y-0.5">
                <span className="text-emerald-900 dark:text-emerald-200 text-sm sm:text-base">
                  Estimated Operational Net Profit
                </span>
                <div className="text-[11px] text-emerald-600 font-normal">
                  Margin: {profitWaterfall.margin_percentage}% of gross turnover
                </div>
              </div>
              <div className="text-xl sm:text-2xl text-emerald-700 dark:text-emerald-300 font-black font-mono">
                ৳ {formatBDT(profitWaterfall.estimated_profit)}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* MODAL: RECORD EXPENSE */}
      <ModalDialog
        open={isNewExpenseOpen}
        onOpenChange={setIsNewExpenseOpen}
        title="Record Operating Expense Voucher"
        description="Categorize overhead expenses (rent, electricity, generator fuel, salaries, repairs)."
      >
        <form onSubmit={handleRecordExpense} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eCat" required>Expense Category</Label>
              <select
                id="eCat"
                value={expCat}
                onChange={(e) => setExpCat(e.target.value as ExpenseCategory)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold capitalize"
              >
                {EXPENSE_CATEGORIES.filter((c) => c.id !== 'all').map((c) => (
                  <option key={c.id} value={c.id}>
                    {tBilingual(c.labelEn, c.labelBn)}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eAmt" required>Amount (৳ BDT)</Label>
              <Input
                id="eAmt"
                type="number"
                min="1"
                value={expAmt}
                onChange={(e) => setExpAmt(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="eMeth" required>Payment Method</Label>
              <select
                id="eMeth"
                value={expMeth}
                onChange={(e) => setExpMeth(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="cash">Cash in Drawer</option>
                <option value="bank">Bank Transfer (EFT)</option>
                <option value="cheque">Bank Cheque</option>
                <option value="bkash">bKash</option>
                <option value="nagad">Nagad</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="eVend">Payee / Vendor Name</Label>
              <Input
                id="eVend"
                placeholder="e.g. DESCO / Landlord / Flora Care"
                value={expVendor}
                onChange={(e) => setExpVendor(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="eDesc" required>Expense Description</Label>
            <textarea
              id="eDesc"
              rows={2}
              placeholder="e.g. Factory diesel generator fuel refill for 50kVA standby backup."
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              required
              className="w-full p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewExpenseOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Log Expense Voucher
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: CASH REGISTER ENTRY */}
      <ModalDialog
        open={isCashEntryOpen}
        onOpenChange={setIsCashEntryOpen}
        title="Record Cash Drawer Transaction"
        description="Log petty cash inflows or instant outflows to reconcile cash in hand."
      >
        <form onSubmit={handleRecordCash} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cTyp" required>Transaction Direction</Label>
              <select
                id="cTyp"
                value={cashType}
                onChange={(e) => setCashType(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
              >
                <option value="cash_in">Cash IN (+ Inflow)</option>
                <option value="cash_out">Cash OUT (- Outflow)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cAmt" required>Cash Amount (৳ BDT)</Label>
              <Input
                id="cAmt"
                type="number"
                min="1"
                value={cashAmt}
                onChange={(e) => setCashAmt(Number(e.target.value))}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cCat" required>Entry Category</Label>
            <Input
              id="cCat"
              placeholder="e.g. Counter Sale or Daily Wage Cash"
              value={cashCat}
              onChange={(e) => setCashCat(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cDesc" required>Description / Reason</Label>
            <Input
              id="cDesc"
              placeholder="e.g. Emergency helper overtime payout."
              value={cashDesc}
              onChange={(e) => setCashDesc(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsCashEntryOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Record Cash Movement
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL: ADD BANK ACCOUNT */}
      <ModalDialog
        open={isNewBankOpen}
        onOpenChange={setIsNewBankOpen}
        title="Register Corporate Bank Account"
        description="Add corporate bank account for payment settlements and balance monitoring."
      >
        <form onSubmit={handleAddBank} className="space-y-4 pt-1 max-h-[75vh] overflow-y-auto px-1">
          <div className="space-y-1.5">
            <Label htmlFor="bBkName" required>Bank Name</Label>
            <Input
              id="bBkName"
              placeholder="e.g. Eastern Bank PLC"
              value={bName}
              onChange={(e) => setBName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bAcn" required>Account Title</Label>
              <Input
                id="bAcn"
                value={bAccName}
                onChange={(e) => setBAccName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bNum" required>Account Number</Label>
              <Input
                id="bNum"
                placeholder="e.g. 104.120.9984122"
                value={bAccNo}
                onChange={(e) => setBAccNo(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bOp" required>Opening Balance (৳ BDT)</Label>
            <Input
              id="bOp"
              type="number"
              value={bBal}
              onChange={(e) => setBBal(Number(e.target.value))}
              required
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewBankOpen(false)} className="w-full sm:w-auto h-10 sm:h-9">
              Cancel
            </Button>
            <Button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white font-bold w-full sm:w-auto h-10 sm:h-9">
              Save Account
            </Button>
          </div>
        </form>
      </ModalDialog>
    </div>
  )
}
