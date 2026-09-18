'use client'

import React, { useState, useEffect } from 'react'
import {
  DollarSign,
  AlertCircle,
  Building,
  CreditCard,
  Receipt,
  Sparkles,
  User,
  Users,
  Search,
  CheckCircle2,
  Calendar,
  Wallet,
  ArrowRight,
  TrendingDown,
  Info,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import type { AccountRecord } from '@/types/finance.types'
import type { EmployeeRecord } from '@/types/workforce.types'
import { getEmployeesAction } from '@/actions/workforce.actions'

interface SpendMoneyModalProps {
  isOpen: boolean
  onClose: () => void
  accounts: AccountRecord[]
  onSubmit: (data: {
    category: string
    amount: number
    paymentAccountId: string
    expenseAccountId?: string
    employeeId?: string
    employeeName?: string
    paymentMethod?: string
    vendorName?: string
    description: string
    expenseDate: string
    attachmentUrl?: string
  }) => Promise<void>
}

interface CategoryOption {
  id: string
  labelEn: string
  labelBn: string
  icon: string
  group: 'staff' | 'operations' | 'utilities'
  descEn: string
  descBn: string
  isWorkforce?: boolean
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  // 1. Workforce & Staff Salaries
  {
    id: 'staff_salary',
    labelEn: 'Monthly Staff Salary',
    labelBn: 'মাসিক স্টাফ বেতন',
    icon: '👨‍💼',
    group: 'staff',
    descEn: 'Regular monthly salary disbursement',
    descBn: 'কর্মচারীদের নিয়মিত মাসিক বেতন প্রদান',
    isWorkforce: true,
  },
  {
    id: 'salary_advance',
    labelEn: 'Salary Advance',
    labelBn: 'স্টাফ বেতন অগ্রিম',
    icon: '💸',
    group: 'staff',
    descEn: 'Advance payment deductible from future payroll',
    descBn: 'পরবর্তী মাসের বেতন থেকে কর্তনযোগ্য অগ্রিম',
    isWorkforce: true,
  },
  {
    id: 'daily_labor',
    labelEn: 'Daily Labor & Wages',
    labelBn: 'দৈনিক মজুরি ও ওভারটাইম',
    icon: '👷',
    group: 'staff',
    descEn: 'Daily contract worker wages or task bonus',
    descBn: 'দৈনিক চুক্তিভিত্তিক শ্রমিকের মজুরি বা অতিরিক্ত কাজ',
    isWorkforce: true,
  },

  // 2. Factory & Production Operations
  {
    id: 'factory_rent',
    labelEn: 'Factory & Shop Rent',
    labelBn: 'কারখানা ও দোকান ভাড়া',
    icon: '🏢',
    group: 'operations',
    descEn: 'Monthly factory floor or showroom rent',
    descBn: 'মাসিক কারখানা ও শোরুমের ভাড়া',
  },
  {
    id: 'electricity_utility',
    labelEn: 'Electricity & Utilities',
    labelBn: 'বিদ্যুৎ ও ইউটিলিটি বিল',
    icon: '⚡',
    group: 'operations',
    descEn: 'Factory power, generator fuel & utility bills',
    descBn: 'কারখানার বিদ্যুৎ বিল, গ্যাস ও জেনারেটর জ্বালানি',
  },
  {
    id: 'machine_maintenance',
    labelEn: 'Machine Repair & Parts',
    labelBn: 'মেশিন মেরামত ও পার্টস',
    icon: '🔧',
    group: 'operations',
    descEn: 'Printer head, motor, spare parts & technician fee',
    descBn: 'প্রিন্টার হেড, যন্ত্রাংশ ও টেকনিশিয়ান সার্ভিস চার্জ',
  },
  {
    id: 'raw_materials',
    labelEn: 'Raw Materials & Ink',
    labelBn: 'খুচরা মালামাল ও কালি',
    icon: '📦',
    group: 'operations',
    descEn: 'Retail ink, solvent, banner, vinyl, board purchases',
    descBn: 'খুচরা কালি, ব্যানার রিল, ভিনাইল ও বোর্ড ক্রয়',
  },
  {
    id: 'transport_fuel',
    labelEn: 'Transport, Courier & Fuel',
    labelBn: 'পরিবহন, কুরিয়ার ও জ্বালানি',
    icon: '🚚',
    group: 'operations',
    descEn: 'Delivery transport fare, courier charges & fuel',
    descBn: 'ডেলিভারি পরিবহন ভাড়া, কুরিয়ার চার্জ ও বাইক জ্বালানি',
  },

  // 3. Admin, Office & Utilities
  {
    id: 'tea_snacks',
    labelEn: 'Tea, Snacks & Guest',
    labelBn: 'চা, নাস্তা ও আপ্যায়ন',
    icon: '☕',
    group: 'utilities',
    descEn: 'Daily office tea, staff lunch & client entertainment',
    descBn: 'দৈনন্দিন চা-নাস্তা ও কাস্টমার আপ্যায়ন খরচ',
  },
  {
    id: 'office_stationery',
    labelEn: 'Stationery & Paper',
    labelBn: 'স্টেশনারি ও কাগজ',
    icon: '📝',
    group: 'utilities',
    descEn: 'Office stationery, pens, invoice books & supplies',
    descBn: 'অফিস স্টেশনারি, কলম, চালান বই ও সাপ্লাই',
  },
  {
    id: 'marketing_promo',
    labelEn: 'Marketing & Promotion',
    labelBn: 'মার্কেটিং ও বিজ্ঞাপন',
    icon: '📢',
    group: 'utilities',
    descEn: 'Social media ads, sample printing & promotional items',
    descBn: 'ফেসবুক বিজ্ঞাপন, স্যাম্পল প্রিন্ট ও প্রচারণা',
  },
  {
    id: 'govt_tax_fees',
    labelEn: 'Govt Tax, Trade License & Fees',
    labelBn: 'ট্যাক্স, লাইসেন্স ও ফি',
    icon: '🏛️',
    group: 'utilities',
    descEn: 'Trade license renewal, tax, VAT & legal fees',
    descBn: 'ট্রেড লাইসেন্স নবায়ন, ট্যাক্স ও সরকারি ফি',
  },
  {
    id: 'miscellaneous',
    labelEn: 'Miscellaneous Expense',
    labelBn: 'অন্যান্য বিবিধ খরচ',
    icon: '📂',
    group: 'utilities',
    descEn: 'Other unplanned general office expenses',
    descBn: 'অন্যান্য অনাকাঙ্ক্ষিত সাধারণ প্রাতিষ্ঠানিক খরচ',
  },
]

const QUICK_AMOUNTS = [500, 1000, 2000, 5000, 10000, 25000]

export function SpendMoneyModal({
  isOpen,
  onClose,
  accounts,
  onSubmit,
}: SpendMoneyModalProps) {
  const { locale, tBilingual } = useI18n()
  const [category, setCategory] = useState<string>('tea_snacks')
  const [categoryTab, setCategoryTab] = useState<'all' | 'staff' | 'operations' | 'utilities'>('all')
  const [amount, setAmount] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState<string>(
    accounts.find((a) => a.account_subtype === 'CASH')?.id || accounts[0]?.id || ''
  )
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [vendorName, setVendorName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [attachmentUrl, setAttachmentUrl] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Workforce state
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')
  const [employeeSearch, setEmployeeSearch] = useState<string>('')
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false)

  // Load employees when modal opens
  useEffect(() => {
    if (isOpen) {
      let isMounted = true
      setLoadingEmployees(true)
      getEmployeesAction()
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setEmployees(res.data)
          }
        })
        .catch((err) => console.warn('Failed to load employees for expense modal:', err))
        .finally(() => {
          if (isMounted) setLoadingEmployees(false)
        })

      return () => {
        isMounted = false
      }
    }
  }, [isOpen])

  // Filter payment accounts (Asset accounts: Cash, Bank, MFS)
  const paymentAccounts = accounts.filter(
    (a) =>
      a.account_type === 'ASSET' &&
      (a.account_subtype === 'CASH' ||
        a.account_subtype === 'BANK' ||
        a.account_subtype === 'MFS' ||
        a.account_subtype === 'RECEIVABLE')
  )

  const selectedAccount = accounts.find((a) => a.id === paymentAccountId)
  const isWorkforceCategory =
    category === 'staff_salary' ||
    category === 'salary_advance' ||
    category === 'daily_labor' ||
    category === 'salary' ||
    category === 'labor'

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId)

  // Filtered categories
  const filteredCategories =
    categoryTab === 'all'
      ? CATEGORY_OPTIONS
      : CATEGORY_OPTIONS.filter((c) => c.group === categoryTab)

  const handlePresetClick = (cat: CategoryOption) => {
    setCategory(cat.id)
    if (!description || CATEGORY_OPTIONS.some((c) => c.labelBn === description || c.labelEn === description)) {
      setDescription(cat.labelBn)
    }
    // If switching to workforce and employee is selected, populate payee
    if (cat.isWorkforce && selectedEmployee) {
      setVendorName(selectedEmployee.name)
    }
  }

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId)
    const emp = employees.find((e) => e.id === empId)
    if (emp) {
      setVendorName(emp.name)
      if (category === 'staff_salary') {
        setDescription(`স্টাফ বেতন - ${emp.name} (${emp.designation || 'Staff'})`)
        if (!amount && emp.base_salary) {
          setAmount(String(emp.base_salary))
        }
      } else if (category === 'salary_advance') {
        setDescription(`বেতন অগ্রিম - ${emp.name}`)
      } else if (category === 'daily_labor') {
        setDescription(`দৈনিক মজুরি - ${emp.name}`)
        if (!amount && emp.daily_rate) {
          setAmount(String(emp.daily_rate))
        }
      }
    }
  }

  const handleQuickAmount = (val: number) => {
    setAmount(String(val))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const numAmt = parseFloat(amount)
    if (isNaN(numAmt) || numAmt <= 0) {
      setError(tBilingual('Please enter a valid amount greater than 0', 'সঠিক টাকার পরিমাণ লিখুন (০ এর বেশি)'))
      return
    }

    if (!paymentAccountId) {
      setError(tBilingual('Please select a payment account', 'টাকা পরিশোধের হিসাব নির্বাচন করুন'))
      return
    }

    if (isWorkforceCategory && !selectedEmployeeId && category !== 'daily_labor') {
      setError(
        tBilingual(
          'Please select the staff member receiving this salary/advance payout',
          'অনুগ্রহ করে বেতন বা অগ্রিম গ্রহণকারী স্টাফ নির্বাচন করুন'
        )
      )
      return
    }

    try {
      setIsSubmitting(true)
      const emp = selectedEmployeeId ? employees.find((e) => e.id === selectedEmployeeId) : undefined
      await onSubmit({
        category,
        amount: numAmt,
        paymentAccountId,
        employeeId: selectedEmployeeId || undefined,
        employeeName: emp?.name || vendorName || undefined,
        paymentMethod,
        vendorName: emp?.name || vendorName || undefined,
        description: description || category,
        expenseDate,
        attachmentUrl: attachmentUrl || undefined,
      })
      onClose()
      setAmount('')
      setDescription('')
      setVendorName('')
      setSelectedEmployeeId('')
    } catch (err: any) {
      setError(err.message || 'Failed to record expense')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isOverdrawn =
    selectedAccount &&
    selectedAccount.account_subtype !== 'RECEIVABLE' &&
    parseFloat(amount || '0') > (selectedAccount.current_balance || 0)

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      title={tBilingual('Spend Money / Record Expense & Staff Salary', 'খরচ ও স্টাফ বেতন এন্ট্রি')}
      hideFooter={true}
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 max-h-[82vh] overflow-y-auto pr-1">
        {error && (
          <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Category Tabs & Visual Grid */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              <span>{tBilingual('Select Expense Category', 'খরচের ধরন ও খাত নির্বাচন')}</span>
            </Label>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setCategoryTab('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  categoryTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tBilingual('All', 'সব')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryTab('staff')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1 ${
                  categoryTab === 'staff'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                <span>👨‍💼</span>
                <span>{tBilingual('Staff Salary', 'বেতন ও স্টাফ')}</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryTab('operations')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  categoryTab === 'operations'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tBilingual('Factory', 'কারখানা')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryTab('utilities')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                  categoryTab === 'utilities'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                {tBilingual('Office', 'অফিস')}
              </button>
            </div>
          </div>

          {/* Category Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {filteredCategories.map((p) => {
              const isSelected = category === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{p.icon}</span>
                    {p.isWorkforce && (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1 py-0 border-rose-300 dark:border-rose-700 bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300"
                      >
                        {tBilingual('Workforce', 'স্টাফ')}
                      </Badge>
                    )}
                  </div>
                  <span className="mt-1 text-xs font-semibold leading-tight line-clamp-1">
                    {p.labelBn}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {p.labelEn}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 2. Staff Member Selector (If Workforce Category is Active) */}
        {isWorkforceCategory && (
          <div className="p-3.5 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-rose-900 dark:text-rose-200 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                <span>
                  {category === 'salary_advance'
                    ? tBilingual('Select Employee for Advance Payout', 'অগ্রিম গ্রহণকারী কর্মচারী নির্বাচন করুন')
                    : category === 'daily_labor'
                    ? tBilingual('Select Worker (Optional)', 'দৈনিক মজুরি গ্রহণকারী শ্রমিক (ঐচ্ছিক)')
                    : tBilingual('Select Employee for Monthly Salary', 'মাসিক বেতন গ্রহণকারী কর্মচারী নির্বাচন করুন')}
                </span>
                {category !== 'daily_labor' && <span className="text-rose-500">*</span>}
              </Label>
              {selectedEmployee && (
                <Badge className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-md">
                  {selectedEmployee.employee_code || 'EMP'}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <select
                  value={selectedEmployeeId}
                  onChange={(e) => handleEmployeeSelect(e.target.value)}
                  className="w-full h-10 px-3 text-xs rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-medium focus:outline-rose-500"
                >
                  <option value="">
                    {loadingEmployees
                      ? tBilingual('Loading employees...', 'কর্মচারীদের তালিকা লোড হচ্ছে...')
                      : tBilingual('-- Select Employee / Staff Member --', '-- কর্মচারী বা স্টাফ নির্বাচন করুন --')}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.designation || 'Staff'} ({emp.department || 'General'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Employee Summary Card */}
              {selectedEmployee ? (
                <div className="p-2 bg-white dark:bg-slate-900 border border-rose-200/80 dark:border-rose-800/80 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-rose-600" />
                      <span>{selectedEmployee.name}</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {selectedEmployee.designation || 'Staff'} • {selectedEmployee.department || 'Print'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-500">
                      {tBilingual('Base Salary', 'মূল বেতন')}
                    </div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      ৳{(selectedEmployee.base_salary || selectedEmployee.daily_rate || 0).toLocaleString()}
                    </div>
                    {Number(selectedEmployee.current_advance_balance || 0) > 0 && (
                      <div className="text-[9px] text-amber-600 font-medium">
                        {tBilingual('Advance Due:', 'বকেয়া অগ্রিম:')} ৳{Number(selectedEmployee.current_advance_balance).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-rose-100/40 dark:bg-rose-900/20 border border-dashed border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-center text-[11px] text-rose-700 dark:text-rose-300">
                  <Info className="w-3.5 h-3.5 mr-1.5" />
                  <span>{tBilingual('Please select an employee to link salary records', 'কর্মচারী নির্বাচন করলে সরাসরি বেতনের সাথে লিংক হবে')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Amount Input (Large with Quick Chips) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {tBilingual('Expense / Payout Amount (৳ BDT)', 'টাকার পরিমাণ (৳)')} *
            </Label>
            <div className="flex items-center gap-1">
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md transition-all"
                >
                  +{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-xl">
              ৳
            </span>
            <Input
              type="number"
              step="any"
              required
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-9 text-2xl font-black h-14 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border-slate-300 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-rose-500 text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* 4. Payment Account & Method */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {tBilingual('Paid From (Account)', 'কোন তহবিল থেকে প্রদান?')} *
              </Label>
              {selectedAccount && (
                <span
                  className={`text-[10px] font-bold ${
                    isOverdrawn
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  ব্যালেন্স: ৳{selectedAccount.current_balance.toLocaleString()}
                </span>
              )}
            </div>
            <select
              value={paymentAccountId}
              onChange={(e) => setPaymentAccountId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
            >
              {paymentAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.name_bn || acc.code}) — ৳{acc.current_balance.toLocaleString()}
                </option>
              ))}
            </select>
            {isOverdrawn && (
              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                <span>{tBilingual('Warning: Amount exceeds account balance!', 'সতর্কতা: হিসাবের ব্যালেন্সের চেয়ে খরচ বেশি!')}</span>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {tBilingual('Payment Channel / Method', 'পরিশোধের মাধ্যম')}
            </Label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-medium"
            >
              <option value="cash">{tBilingual('Cash in Hand / Drawer', 'নগদ ক্যাশ')}</option>
              <option value="bank">{tBilingual('Bank Transfer / EFT / Cheque', 'ব্যাংক ট্রান্সফার / চেক')}</option>
              <option value="bkash">{tBilingual('bKash Personal / Merchant', 'বিকাশ (bKash)')}</option>
              <option value="nagad">{tBilingual('Nagad Business / Personal', 'নগদ (Nagad)')}</option>
              <option value="rocket">{tBilingual('Rocket / DBBL MFS', 'রকেট (Rocket)')}</option>
              <option value="other_mfs">{tBilingual('Other Mobile Banking', 'অন্যান্য মোবাইল ব্যাংকিং')}</option>
            </select>
          </div>
        </div>

        {/* 5. Payee & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {isWorkforceCategory
                ? tBilingual('Payee / Employee Name', 'প্রাপক কর্মচারী / ব্যক্তির নাম')
                : tBilingual('Vendor / Payee Name', 'দোকান বা ব্যক্তির নাম')}
            </Label>
            <Input
              placeholder={isWorkforceCategory ? 'যেমন: মোহাম্মদ শামীম' : 'দোকান, বাড়িওয়ালা বা ব্যক্তির নাম'}
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {tBilingual('Expense Note / Narration', 'খরচের বিবরণ বা নোট')}
            </Label>
            <Input
              placeholder="খরচের বিস্তারিত বিবরণ লিখুন..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* 6. Date & Voucher / Slip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {tBilingual('Expense Date', 'খরচের তারিখ')}
            </Label>
            <Input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-700 dark:text-slate-300 font-medium">
              {tBilingual('Receipt Photo / Slip Reference', 'রশিদ বা স্লিপ নম্বর')}
            </Label>
            <Input
              placeholder="রশিদ নং বা স্লিপ রেফারেন্স"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              className="h-10 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>{tBilingual('Double-entry GL posted automatically', 'স্বয়ংক্রিয়ভাবে দ্বৈত খতিয়ানে পোস্টিং হবে')}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl h-10 text-xs">
              {tBilingual('Cancel', 'বাতিল')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl px-5 h-10 text-xs shadow-md shadow-rose-600/20"
            >
              {isSubmitting
                ? tBilingual('Recording...', 'রেকর্ড হচ্ছে...')
                : isWorkforceCategory
                ? tBilingual('Confirm Salary Payout', 'বেতন/মজুরি কনফার্ম করুন')
                : tBilingual('Confirm Expense', 'খরচ কনফার্ম করুন')}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}
