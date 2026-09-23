'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  ShieldCheck,
  RefreshCw,
  FileText,
  Clock,
  Layers,
  Building2,
  Phone,
  Tag,
  BadgePercent,
  Coins,
  FileCheck2,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/i18n/context'
import { formatBDT } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { AccountRecord } from '@/types/finance.types'
import type { EmployeeRecord } from '@/types/workforce.types'
import { getEmployeesAction } from '@/actions/workforce.actions'

export interface SpendMoneyModalProps {
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
  glAccount: string
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
    glAccount: '6030 (Operating Expense: Salary)',
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
    glAccount: '6030 (Salary Advance Ledger)',
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
    glAccount: '5020 (Direct Labor COGS)',
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
    glAccount: '6010 (Operating Expense: Rent)',
  },
  {
    id: 'electricity_utility',
    labelEn: 'Electricity & Utilities',
    labelBn: 'বিদ্যুৎ ও ইউটিলিটি বিল',
    icon: '⚡',
    group: 'operations',
    descEn: 'Factory power, generator fuel & utility bills',
    descBn: 'কারখানার বিদ্যুৎ বিল, গ্যাস ও জেনারেটর জ্বালানি',
    glAccount: '6020 (Utilities Expense)',
  },
  {
    id: 'machine_maintenance',
    labelEn: 'Machine Repair & Parts',
    labelBn: 'মেশিন মেরামত ও পার্টস',
    icon: '🔧',
    group: 'operations',
    descEn: 'Printer head, motor, spare parts & technician fee',
    descBn: 'প্রিন্টার হেড, যন্ত্রাংশ ও টেকনিশিয়ান সার্ভিস চার্জ',
    glAccount: '6050 (Maintenance & Repairs)',
  },
  {
    id: 'raw_materials',
    labelEn: 'Raw Materials & Ink',
    labelBn: 'খুচরা মালামাল ও কালি',
    icon: '📦',
    group: 'operations',
    descEn: 'Retail ink, solvent, banner, vinyl, board purchases',
    descBn: 'খুচরা কালি, ব্যানার রিল, ভিনাইল ও বোর্ড ক্রয়',
    glAccount: '5010 (Direct Materials COGS)',
  },
  {
    id: 'transport_fuel',
    labelEn: 'Transport, Courier & Fuel',
    labelBn: 'পরিবহন, কুরিয়ার ও জ্বালানি',
    icon: '🚚',
    group: 'operations',
    descEn: 'Delivery transport fare, courier charges & fuel',
    descBn: 'ডেলিভারি পরিবহন ভাড়া, কুরিয়ার চার্জ ও বাইক জ্বালানি',
    glAccount: '6040 (Transport & Logistics)',
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
    glAccount: '6070 (General & Administrative)',
  },
  {
    id: 'office_stationery',
    labelEn: 'Stationery & Paper',
    labelBn: 'স্টেশনারি ও কাগজ',
    icon: '📝',
    group: 'utilities',
    descEn: 'Office stationery, pens, invoice books & supplies',
    descBn: 'অফিস স্টেশনারি, কলম, চালান বই ও সাপ্লাই',
    glAccount: '6070 (General & Administrative)',
  },
  {
    id: 'marketing_promo',
    labelEn: 'Marketing & Promotion',
    labelBn: 'মার্কেটিং ও বিজ্ঞাপন',
    icon: '📢',
    group: 'utilities',
    descEn: 'Social media ads, sample printing & promotional items',
    descBn: 'ফেসবুক বিজ্ঞাপন, স্যাম্পল প্রিন্ট ও প্রচারণা',
    glAccount: '6060 (Marketing & Advertising)',
  },
  {
    id: 'govt_tax_fees',
    labelEn: 'Govt Tax, Trade License & Fees',
    labelBn: 'ট্যাক্স, লাইসেন্স ও ফি',
    icon: '🏛️',
    group: 'utilities',
    descEn: 'Trade license renewal, tax, VAT & legal fees',
    descBn: 'ট্রেড লাইসেন্স নবায়ন, ট্যাক্স ও সরকারি ফি',
    glAccount: '6070 (General & Administrative)',
  },
  {
    id: 'miscellaneous',
    labelEn: 'Miscellaneous Expense',
    labelBn: 'অন্যান্য বিবিধ খরচ',
    icon: '📂',
    group: 'utilities',
    descEn: 'Other unplanned general office expenses',
    descBn: 'অন্যান্য অনাকাঙ্ক্ষিত সাধারণ প্রাতিষ্ঠানিক খরচ',
    glAccount: '6070 (General & Administrative)',
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
  const [category, setCategory] = useState<string>('staff_salary')
  const [categoryTab, setCategoryTab] = useState<'all' | 'staff' | 'operations' | 'utilities'>('staff')
  const [amount, setAmount] = useState<string>('')
  const [paymentAccountId, setPaymentAccountId] = useState<string>(
    accounts.find((a) => a.account_subtype === 'CASH')?.id || accounts[0]?.id || ''
  )
  const [paymentMethod, setPaymentMethod] = useState<string>('cash')
  const [vendorName, setVendorName] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [attachmentUrl, setAttachmentUrl] = useState<string>('')
  const [voucherNumber, setVoucherNumber] = useState<string>(`VCH-${Date.now().toString().slice(-6)}`)
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
  const paymentAccounts = useMemo(() => {
    return accounts.filter(
      (a) =>
        a.account_type === 'ASSET' &&
        (a.account_subtype === 'CASH' ||
          a.account_subtype === 'BANK' ||
          a.account_subtype === 'MFS' ||
          a.account_subtype === 'RECEIVABLE')
    )
  }, [accounts])

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === paymentAccountId)
  }, [accounts, paymentAccountId])

  const isWorkforceCategory =
    category === 'staff_salary' ||
    category === 'salary_advance' ||
    category === 'daily_labor' ||
    category === 'salary' ||
    category === 'labor'

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId)
  }, [employees, selectedEmployeeId])

  const activeCategoryDef = useMemo(() => {
    return CATEGORY_OPTIONS.find((c) => c.id === category) || CATEGORY_OPTIONS[0]
  }, [category])

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categoryTab === 'all'
      ? CATEGORY_OPTIONS
      : CATEGORY_OPTIONS.filter((c) => c.group === categoryTab)
  }, [categoryTab])

  // Filtered employees for search
  const filteredEmployees = useMemo(() => {
    if (!employeeSearch.trim()) return employees
    const q = employeeSearch.toLowerCase()
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
        (e.designation && e.designation.toLowerCase().includes(q)) ||
        (e.phone && e.phone.includes(q)) ||
        (e.department && e.department.toLowerCase().includes(q))
    )
  }, [employees, employeeSearch])

  const handlePresetClick = (cat: CategoryOption) => {
    setCategory(cat.id)
    if (!description || CATEGORY_OPTIONS.some((c) => c.labelBn === description || c.labelEn === description)) {
      setDescription(cat.labelBn)
    }
    // If switching to workforce and employee is selected, populate payee
    if (cat.isWorkforce && selectedEmployee) {
      setVendorName(selectedEmployee.name)
      if (cat.id === 'staff_salary' && selectedEmployee.base_salary && !amount) {
        setAmount(String(selectedEmployee.base_salary))
      } else if (cat.id === 'daily_labor' && selectedEmployee.daily_rate && !amount) {
        setAmount(String(selectedEmployee.daily_rate))
      }
    }
  }

  const handleEmployeeSelect = (empId: string) => {
    setSelectedEmployeeId(empId)
    const emp = employees.find((e) => e.id === empId)
    if (emp) {
      setVendorName(emp.name)
      if (category === 'staff_salary') {
        setDescription(`স্টাফ বেতন - ${emp.name} (${emp.designation || 'Staff'})`)
        if (emp.base_salary) {
          setAmount(String(emp.base_salary))
        }
      } else if (category === 'salary_advance') {
        setDescription(`বেতন অগ্রিম - ${emp.name}`)
      } else if (category === 'daily_labor') {
        setDescription(`দৈনিক মজুরি - ${emp.name}`)
        if (emp.daily_rate) {
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
      setEmployeeSearch('')
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
      size="5xl"
      title={
        <div className="flex items-center justify-between w-full pr-6">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-rose-600/10 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">
                {locale === 'bn' ? 'খরচ ও স্টাফ বেতন এন্ট্রি' : 'Spend Money / Record Expense & Staff Salary'}
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Double-Entry General Ledger • Auto Staff Advance Tracking • Instant Voucher Generation
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 text-xs font-mono font-bold px-2.5 py-1 flex items-center gap-1.5"
            >
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>{voucherNumber}</span>
            </Badge>
          </div>
        </div>
      }
      hideFooter
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1 pb-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* Error Alert */}
        {error && (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2 animate-in fade-in-0">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <strong>Action Required:</strong> {error}
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 1: EXPENSE CATEGORY & CLASSIFICATION
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                1
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {locale === 'bn' ? 'খরচের খাত ও শ্রেণিবিভাগ' : 'Expense Category & GL Account'}
              </h3>
            </div>

            {/* Category Quick Filter Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg text-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setCategoryTab('all')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer',
                  categoryTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {tBilingual('All', 'সব')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryTab('staff')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer',
                  categoryTab === 'staff'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                <span>👨‍💼</span>
                <span>{tBilingual('Staff & Salary', 'বেতন ও স্টাফ')}</span>
              </button>
              <button
                type="button"
                onClick={() => setCategoryTab('operations')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer',
                  categoryTab === 'operations'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {tBilingual('Factory & Ops', 'কারখানা ও অপস')}
              </button>
              <button
                type="button"
                onClick={() => setCategoryTab('utilities')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-semibold text-xs transition-all cursor-pointer',
                  categoryTab === 'utilities'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                )}
              >
                {tBilingual('Office & Admin', 'অফিস ও প্রশাসন')}
              </button>
            </div>
          </div>

          {/* Interactive Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {filteredCategories.map((p) => {
              const isSelected = category === p.id
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={cn(
                    'flex flex-col items-start p-3 rounded-xl border text-left transition-all relative cursor-pointer',
                    isSelected
                      ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-950 dark:text-rose-100 ring-2 ring-rose-500/20 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{p.icon}</span>
                    {p.isWorkforce ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-rose-300 dark:border-rose-700 bg-rose-100/50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 font-semibold"
                      >
                        {tBilingual('Payroll', 'বেতন')}
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono font-medium">
                        {p.glAccount.split(' ')[0]}
                      </span>
                    )}
                  </div>
                  <span className="mt-1.5 text-xs font-bold leading-tight line-clamp-1">
                    {p.labelBn}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                    {p.labelEn}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Active Category GL Route Info Banner */}
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-base">{activeCategoryDef.icon}</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                {activeCategoryDef.labelBn} ({activeCategoryDef.labelEn})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-500">{activeCategoryDef.descBn}</span>
              <Badge variant="outline" className="text-[10px] font-mono font-bold bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700">
                GL: {activeCategoryDef.glAccount}
              </Badge>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 2: STAFF SELECTION & PAYEE HUD
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                2
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {isWorkforceCategory
                  ? locale === 'bn'
                    ? 'স্টাফ / কর্মচারী ও প্রাপক তথ্য'
                    : 'Staff Member & Payee Information'
                  : locale === 'bn'
                  ? 'প্রাপক ও ভেন্ডর তথ্য'
                  : 'Payee / Vendor Information'}
              </h3>
            </div>

            {selectedEmployee && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-800">
                <Users className="h-3.5 w-3.5" />
                {tBilingual('Employee Linked & Salary Resolved', 'কর্মচারী লিংক ও বেতন হার লোড হয়েছে')}
              </span>
            )}
          </div>

          {isWorkforceCategory ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {/* Employee Selector Dropdown */}
                <div className="sm:col-span-2">
                  <Label className="text-xs font-semibold mb-1 block">
                    {category === 'salary_advance'
                      ? tBilingual('Select Staff for Advance', 'অগ্রিম গ্রহণকারী কর্মচারী')
                      : category === 'daily_labor'
                      ? tBilingual('Select Worker (Optional)', 'দৈনিক মজুরি গ্রহণকারী শ্রমিক (ঐচ্ছিক)')
                      : tBilingual('Select Staff for Monthly Salary', 'মাসিক বেতন গ্রহণকারী কর্মচারী')}
                    {category !== 'daily_labor' && <span className="text-rose-500"> *</span>}
                  </Label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => handleEmployeeSelect(e.target.value)}
                    className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 font-medium focus:border-rose-500"
                    required={category !== 'daily_labor'}
                  >
                    <option value="">
                      {loadingEmployees
                        ? tBilingual('Loading employees...', 'কর্মচারীদের তালিকা লোড হচ্ছে...')
                        : tBilingual('-- Select Employee / Staff Member --', '-- কর্মচারী বা স্টাফ নির্বাচন করুন --')}
                    </option>
                    {filteredEmployees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.employee_code || 'EMP'}) — {emp.designation || 'Staff'} [
                        {emp.department || 'General'}] • ৳{(emp.base_salary || emp.daily_rate || 0).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Payee / Receiver Name */}
                <div>
                  <Label className="text-xs font-semibold mb-1 block">
                    {tBilingual('Receiver Name', 'টাকা গ্রহণকারীর নাম')} <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    placeholder="নাম লিখুন..."
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              {/* EMPLOYEE WORKFORCE HUD CARD (similar to Customer HUD in invoice modal) */}
              {selectedEmployee ? (
                <div className="p-3 bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs animate-in fade-in-0">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {tBilingual('Designation & Dept', 'পদবি ও বিভাগ')}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1 mt-0.5">
                      <User className="h-3.5 w-3.5 text-rose-600" />
                      <span>{selectedEmployee.designation || 'Staff'}</span>
                    </span>
                    <span className="text-[10px] text-slate-500 block">{selectedEmployee.department || 'Print Production'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {tBilingual('Base Salary Rate', 'নির্ধারিত মূল বেতন')}
                    </span>
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 block">
                      ৳{(selectedEmployee.base_salary || selectedEmployee.daily_rate || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedEmployee.salary_type === 'daily' ? 'Daily Wage' : 'Per Month'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {tBilingual('Outstanding Advance', 'পূর্ববর্তী বকেয়া অগ্রিম')}
                    </span>
                    <span className={cn(
                      "font-mono font-bold text-sm mt-0.5 block",
                      Number(selectedEmployee.current_advance_balance || 0) > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600"
                    )}>
                      ৳{Number(selectedEmployee.current_advance_balance || 0).toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      {Number(selectedEmployee.current_advance_balance || 0) > 0 ? 'Deduct from payroll' : 'No prior advance'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {tBilingual('Phone / Contact', 'যোগাযোগ নম্বর')}
                    </span>
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-xs mt-0.5 block">
                      {selectedEmployee.phone || 'N/A'}
                    </span>
                    <span className="text-[10px] text-slate-500 block">
                      Status: <strong className="text-emerald-600">Active</strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-rose-500" />
                    <span>
                      {tBilingual(
                        'Select an active employee above to automatically calculate base salary and link payroll advance ledger.',
                        'উপরের ড্রপডাউন থেকে কর্মচারী নির্বাচন করলে বেতনের হিসাব ও অগ্রিম ব্যালেন্স স্বয়ংক্রিয়ভাবে লিঙ্ক হবে।'
                      )}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Vendor / Payee Name', 'দোকান বা ব্যক্তির নাম')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="যেমন: মেঘনা পেপার হাউস / বাড়িওয়ালা"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold mb-1 block">
                  {tBilingual('Expense Narration / Details', 'খরচের বিবরণ ও বিবরণী')} <span className="text-rose-500">*</span>
                </Label>
                <Input
                  placeholder="খরচের পূর্ণ বিবরণ লিখুন..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* =========================================================================
            SECTION 3: AMOUNT, PAYMENT ACCOUNT & SETTLEMENT
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                3
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {locale === 'bn' ? 'টাকার পরিমাণ ও পেমেন্ট মাধ্যম' : 'Payment Source, Method & Amount'}
              </h3>
            </div>

            {/* Quick Amount Chips */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-slate-400 font-medium mr-1 hidden sm:inline">
                {tBilingual('Quick Add:', 'কুইক বাটন:')}
              </span>
              {QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickAmount(amt)}
                  className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-300 hover:text-rose-600 rounded-md transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
                >
                  +{amt >= 1000 ? `${amt / 1000}k` : amt}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {/* Large Hero Amount Input */}
            <div className="sm:col-span-1">
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Amount to Pay', 'পরিশোধের পরিমাণ')} <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400 text-lg">
                  ৳
                </span>
                <Input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-8 text-base font-mono font-black h-9 rounded-md bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 focus:border-rose-500 text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Payment Account Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs font-semibold block">
                  {tBilingual('Paid From (Account)', 'পরিশোধের হিসাব')} <span className="text-rose-500">*</span>
                </Label>
                {selectedAccount && (
                  <span
                    className={cn(
                      'text-[10px] font-mono font-bold',
                      isOverdrawn
                        ? 'text-rose-600 dark:text-rose-400'
                        : 'text-emerald-600 dark:text-emerald-400'
                    )}
                  >
                    ব্যালেন্স: ৳{selectedAccount.current_balance.toLocaleString()}
                  </span>
                )}
              </div>
              <select
                value={paymentAccountId}
                onChange={(e) => setPaymentAccountId(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
                required
              >
                {paymentAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.name_bn || acc.code}) — ৳{acc.current_balance.toLocaleString()}
                  </option>
                ))}
              </select>
              {isOverdrawn && (
                <p className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>{tBilingual('Warning: Amount exceeds account balance!', 'সতর্কতা: নির্বাচিত তহবিলে পর্যাপ্ত ব্যালেন্স নেই!')}</span>
                </p>
              )}
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Payment Channel / Method', 'পরিশোধ মাধ্যম')}
              </Label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full h-9 text-xs rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 font-medium"
              >
                <option value="cash">Cash Counter (নগদ ক্যাশ)</option>
                <option value="bank">Bank Transfer / Cheque (ব্যাংক)</option>
                <option value="bkash">bKash Personal / Merchant (বিকাশ)</option>
                <option value="nagad">Nagad Wallet (নগদ)</option>
                <option value="rocket">Rocket / DBBL (রকেট)</option>
                <option value="other_mfs">Other Mobile Banking</option>
              </select>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECTION 4: DATE, VOUCHER & RECEIPT ATTACHMENT
           ========================================================================= */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center font-bold text-xs">
                4
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {locale === 'bn' ? 'তারিখ ও ভাউচার রেফারেন্স' : 'Date, Narration & Voucher Reference'}
              </h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Expense Date', 'খরচের তারিখ')} <span className="text-rose-500">*</span>
              </Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Voucher / Slip Reference', 'রশিদ বা স্লিপ নম্বর')}
              </Label>
              <Input
                placeholder="রশিদ বা ভাউচার নম্বর"
                value={attachmentUrl}
                onChange={(e) => setAttachmentUrl(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('General Ledger Debit Account', 'খতিয়ান হিসাব')}
              </Label>
              <div className="h-9 px-3 flex items-center bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-md font-mono text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">
                {activeCategoryDef.glAccount}
              </div>
            </div>
          </div>

          {isWorkforceCategory && (
            <div>
              <Label className="text-xs font-semibold mb-1 block">
                {tBilingual('Salary Narration / Note', 'বেতন বিবরণী / অতিরিক্ত নোট')}
              </Label>
              <Input
                placeholder="যেমন: সেপ্টেম্বর ২০২৬ মাসের নিয়মিত স্টাফ বেতন / ঈদ বোনাস"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          )}
        </div>

        {/* =========================================================================
            STANDARDIZED MODAL BOTTOM ACTION BAR (Matching Invoice & Quotation)
           ========================================================================= */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>
              {tBilingual(
                'Balanced double-entry journal entry will be posted to General Ledger.',
                'স্বয়ংক্রিয়ভাবে ডেবিট/ক্রেডিট সমতাযুক্ত খতিয়ানে এন্ট্রি হবে।'
              )}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 px-4 rounded-xl font-bold border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              {tBilingual('Cancel', 'বাতিল')}
            </Button>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 px-5 rounded-xl font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>{tBilingual('Recording...', 'রেকর্ড হচ্ছে...')}</span>
                </>
              ) : isWorkforceCategory ? (
                <>
                  <Coins className="h-4 w-4" />
                  <span>
                    {category === 'salary_advance'
                      ? tBilingual('Confirm Salary Advance', 'অগ্রিম বেতন নিশ্চিত করুন')
                      : category === 'daily_labor'
                      ? tBilingual('Confirm Daily Wage Payout', 'মজুরি পরিশোধ নিশ্চিত করুন')
                      : tBilingual('Confirm Staff Salary Payout', 'স্টাফ বেতন নিশ্চিত করুন')}
                  </span>
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4" />
                  <span>{tBilingual('Confirm & Record Expense', 'খরচ রেকর্ড নিশ্চিত করুন')}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </ModalDialog>
  )
}
