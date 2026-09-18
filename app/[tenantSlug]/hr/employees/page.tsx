'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Employee Directory & Workforce Roster Studio
// Designed for Bangladeshi Print & Signage Owners, HR & Shop-Floor Managers
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Building,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sparkles,
  DollarSign,
  Briefcase,
  LayoutGrid,
  List,
  Wallet,
  Clock,
  ArrowUpDown,
  Download,
  ShieldCheck,
  ChevronRight,
  UserCheck,
  X,
  CreditCard,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useI18n } from '@/i18n/context'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { CurrencyDisplay } from '@/components/shared/currency-display'
import { formatBDT, formatDate } from '@/lib/formatters'
import type { BranchRow } from '@/types/tenant.types'
import { listBranchesAction } from '@/actions/branch.actions'
import type {
  EmployeeRecord,
  EmploymentType,
  SalaryBasis,
  PaymentMethod,
} from '@/types/workforce.types'
import {
  getEmployeesAction,
  createEmployeeAction,
  updateEmployeeAction,
  deleteEmployeeAction,
} from '@/actions/workforce.actions'

export default function EmployeeListPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || 'vision-sign'

  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(true)
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [notification, setNotification] = useState<string | null>(null)

  // Filters & View State
  const [searchTerm, setSearchTerm] = useState('')
  const [deptFilter, setDeptFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table')

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [is360DrawerOpen, setIs360DrawerOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null)

  // Form State
  const initialForm = {
    id: '',
    name: '',
    name_bn: '',
    mobile: '',
    email: '',
    address: '',
    role: 'Machine Operator',
    department: 'printing',
    branch_id: '',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 25000,
    daily_rate: 800,
    hourly_rate: 120,
    overtime_hourly_rate: 180,
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Spouse',
    bank_name: '',
    account_number: '',
    branch_name: '',
    mfs_provider: 'bkash' as 'bkash' | 'nagad' | 'rocket' | 'other',
    mfs_number: '',
    status: 'active' as EmployeeRecord['status'],
  }

  const [empForm, setEmpForm] = useState(initialForm)

  const notify = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 4000)
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      const [empRes, branchRes] = await Promise.all([
        getEmployeesAction(),
        listBranchesAction(),
      ])

      if (empRes.success && empRes.data) setEmployees(empRes.data)
      if (branchRes.success && branchRes.data) setBranches(branchRes.data as any)
    } catch (err: any) {
      console.error('Failed to load employees', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Open modal if action=new in URL query
  useEffect(() => {
    if (searchParams?.get('action') === 'new') {
      setIsAddModalOpen(true)
    }
  }, [searchParams])

  const handleOpenAdd = () => {
    setEmpForm({
      ...initialForm,
      branch_id: branches[0]?.id || '',
    })
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp)
    setEmpForm({
      id: emp.id,
      name: emp.name,
      name_bn: emp.name_bn || '',
      mobile: emp.mobile || '',
      email: emp.email || '',
      address: emp.address || '',
      role: emp.role || 'Staff',
      department: emp.department || 'printing',
      branch_id: emp.branch_id || '',
      employee_type: emp.employee_type || 'permanent',
      salary_basis: emp.salary_basis || 'monthly',
      base_salary: Number(emp.base_salary || 0),
      daily_rate: Number(emp.daily_rate || 0),
      hourly_rate: Number(emp.hourly_rate || 0),
      overtime_hourly_rate: Number(emp.overtime_hourly_rate || 0),
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      emergency_contact_relation: emp.emergency_contact_relation || 'Spouse',
      bank_name: emp.bank_payment_info?.bank_name || '',
      account_number: emp.bank_payment_info?.account_number || '',
      branch_name: emp.bank_payment_info?.branch_name || '',
      mfs_provider: emp.mfs_payment_info?.provider || 'bkash',
      mfs_number: emp.mfs_payment_info?.wallet_number || '',
      status: emp.status || 'active',
    })
    setIsEditModalOpen(true)
  }

  const handleOpen360 = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp)
    setIs360DrawerOpen(true)
  }

  const handleSaveEmployee = async (isEdit: boolean) => {
    if (!empForm.name.trim()) {
      notify('Please enter employee name.')
      return
    }

    startTransition(async () => {
      const payload: any = {
        name: empForm.name,
        name_bn: empForm.name_bn || null,
        mobile: empForm.mobile,
        email: empForm.email || null,
        address: empForm.address || null,
        role: empForm.role,
        department: empForm.department,
        branch_id: empForm.branch_id || null,
        employee_type: empForm.employee_type,
        salary_basis: empForm.salary_basis,
        base_salary: Number(empForm.base_salary || 0),
        daily_rate: Number(empForm.daily_rate || 0),
        hourly_rate: Number(empForm.hourly_rate || 0),
        overtime_hourly_rate: Number(empForm.overtime_hourly_rate || 0),
        emergency_contact_name: empForm.emergency_contact_name || null,
        emergency_contact_phone: empForm.emergency_contact_phone || null,
        emergency_contact_relation: empForm.emergency_contact_relation || null,
        status: empForm.status,
        bank_payment_info: empForm.account_number
          ? {
              bank_name: empForm.bank_name,
              account_number: empForm.account_number,
              branch_name: empForm.branch_name,
            }
          : null,
        mfs_payment_info: empForm.mfs_number
          ? {
              provider: empForm.mfs_provider,
              wallet_number: empForm.mfs_number,
              account_type: 'personal',
            }
          : null,
      }

      if (isEdit && selectedEmployee) {
        const res = await updateEmployeeAction(selectedEmployee.id, payload)
        if (res.success) {
          notify('Employee record updated successfully.')
          setIsEditModalOpen(false)
          loadData()
        } else {
          notify(res.error || 'Failed to update employee.')
        }
      } else {
        const res = await createEmployeeAction(payload)
        if (res.success) {
          notify('New employee enrolled successfully.')
          setIsAddModalOpen(false)
          loadData()
        } else {
          notify(res.error || 'Failed to create employee.')
        }
      }
    })
  }

  const handleDeleteEmployee = async () => {
    if (!selectedEmployee) return
    startTransition(async () => {
      const res = await deleteEmployeeAction(selectedEmployee.id)
      if (res.success) {
        notify('Employee deleted successfully.')
        setIsDeleteModalOpen(false)
        setSelectedEmployee(null)
        loadData()
      } else {
        notify(res.error || 'Failed to delete employee.')
      }
    })
  }

  // Filtered employees
  const filteredEmployees = React.useMemo(() => {
    return employees.filter((emp) => {
      const matchSearch =
        !searchTerm.trim() ||
        emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.name_bn && emp.name_bn.includes(searchTerm)) ||
        emp.employee_id_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (emp.mobile && emp.mobile.includes(searchTerm)) ||
        (emp.email && emp.email.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchDept = deptFilter === 'ALL' || emp.department === deptFilter
      const matchType = typeFilter === 'ALL' || emp.employee_type === typeFilter
      const matchStatus = statusFilter === 'ALL' || emp.status === statusFilter
      const matchBranch = branchFilter === 'ALL' || emp.branch_id === branchFilter

      return matchSearch && matchDept && matchType && matchStatus && matchBranch
    })
  }, [employees, searchTerm, deptFilter, typeFilter, statusFilter, branchFilter])

  // Stat summary
  const permanentCount = employees.filter((e) => e.employee_type === 'permanent').length
  const dailyCount = employees.filter((e) => e.is_daily_worker || e.employee_type === 'daily_worker').length
  const hourlyCount = employees.filter((e) => e.employee_type === 'hourly_worker').length
  const onLeaveCount = employees.filter((e) => e.status === 'on_leave').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-950/90 text-emerald-200 border border-emerald-500/40 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 backdrop-blur text-sm font-medium animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Page Header */}
      <PageHeader
        titleEn="Employee Directory"
        titleBn="কর্মীদের তালিকা ও ব্যবস্থাপনা"
        descriptionEn="Manage permanent staff, daily laborers, operator assignments & salary packages"
        descriptionBn="স্থায়ী কর্মী, দৈনিক চুক্তিবদ্ধ শ্রমিক ও অপারেটরদের প্রোফাইল ও বেতন কাঠামো"
        icon={Users}
        iconColor="text-blue-600 dark:text-blue-400"
        badge={
          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 bangla-text">
            {filteredEmployees.length} {tBilingual('Staff', 'জন')}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadData}
              disabled={isLoading}
              className="gap-1.5 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {tBilingual('Refresh', 'রিফ্রেশ')}
            </Button>
            <Button
              size="sm"
              onClick={handleOpenAdd}
              className="gap-1.5 text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs bangla-text"
            >
              <Plus className="w-3.5 h-3.5" />
              {tBilingual('Add New Employee', 'নতুন কর্মী যোগ করুন')}
            </Button>
          </div>
        }
      />

      {/* Top Stat Summary Pills */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Total Enrolled', 'মোট নিবন্ধিত')}
            </span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-lg">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{employees.length}</div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            {tBilingual('Registered workforce profiles', 'নিবন্ধিত জনবল প্রোফাইল')}
          </p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Permanent Staff', 'স্থায়ী কর্মী')}
            </span>
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400">{permanentCount}</div>
          <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 mt-1 truncate">
            {tBilingual('Full-time payroll members', 'স্থায়ী চুক্তিবদ্ধ কর্মী')}
          </p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('Daily / Hourly', 'দৈনিক / ঘণ্টাপ্রতি')}
            </span>
            <div className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600 dark:text-amber-400">{dailyCount + hourlyCount}</div>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 mt-1 truncate">
            {tBilingual('Flexible floor & shift labor', 'চুক্তিভিত্তিক শিফট শ্রমিক')}
          </p>
        </Card>

        <Card className="p-4 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {tBilingual('On Leave', 'ছুটিতে')}
            </span>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-lg">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-purple-600 dark:text-purple-400">{onLeaveCount}</div>
          <p className="text-[11px] text-purple-600/80 dark:text-purple-400/80 mt-1 truncate">
            {tBilingual('Approved leave leaves', 'অনুমোদিত ছুটিতে রয়েছেন')}
          </p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-3.5 shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
            {/* Search Box */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder={tBilingual('Search by name, ID, phone, role...', 'নাম, আইডি, মোবাইল, পদবি দিয়ে খুঁজুন...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9 font-medium"
              />
            </div>

            {/* Filter Tabs Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'ALL', label: tBilingual('All Staff', 'সকল কর্মী'), count: employees.length },
                { id: 'permanent', label: tBilingual('Permanent', 'স্থায়ী'), count: permanentCount },
                { id: 'daily_worker', label: tBilingual('Daily Labor', 'দৈনিক'), count: dailyCount },
                { id: 'hourly_worker', label: tBilingual('Hourly', 'ঘণ্টাপ্রতি'), count: hourlyCount },
              ].map((tab) => {
                const isSelected = typeFilter === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setTypeFilter(tab.id as any)}
                    className={`h-8 px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                          isSelected
                            ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                            : 'bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {tab.count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Department Filter */}
            <select
              aria-label="Filter by department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-8 text-xs px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-medium"
            >
              <option value="ALL">{tBilingual('All Departments', 'সব বিভাগ')}</option>
              <option value="printing">{tBilingual('Printing', 'প্রিন্টিং')}</option>
              <option value="finishing">{tBilingual('Finishing', 'ফিনিশিং')}</option>
              <option value="fabrication">{tBilingual('Fabrication', 'ফ্যাব্রিকেশন')}</option>
              <option value="design">{tBilingual('Design', 'ডিজাইন')}</option>
              <option value="installation">{tBilingual('Installation', 'ইনস্টলেশন')}</option>
              <option value="accounts">{tBilingual('Accounts', 'হিসাব')}</option>
              <option value="sales">{tBilingual('Sales', 'বিক্রি')}</option>
            </select>
          </div>

          {/* View Toggle Table / Grid */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-slate-100 dark:bg-slate-900 shrink-0">
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              className={`h-7 w-7 p-0 ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow-xs' : ''}`}
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className={`h-7 w-7 p-0 ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-xs' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Main Employee Roster List */}
      {filteredEmployees.length === 0 ? (
        <Card className="p-12 text-center border-dashed shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {tBilingual('No employees match your search criteria', 'কোন কর্মী পাওয়া যায়নি')}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {tBilingual('Try clearing your filters or enroll a new employee to your organization.', 'ফিল্টার পরিবর্তন করুন অথবা নতুন কর্মী যোগ করুন।')}
          </p>
          <Button size="sm" onClick={handleOpenAdd} className="mt-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-sm">
            <Plus className="w-3.5 h-3.5" />
            {tBilingual('Add New Employee', 'নতুন কর্মী যোগ করুন')}
          </Button>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card className="shadow-xs border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-950">
          <CardHeader className="py-3 px-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                {tBilingual('Employee Directory', 'কর্মীদের তালিকা')}
              </CardTitle>
              <Badge variant="outline" className="text-xs font-mono">
                {filteredEmployees.length} records
              </Badge>
            </div>
            {(searchTerm || typeFilter !== 'ALL' || deptFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setTypeFilter('ALL')
                  setDeptFilter('ALL')
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold cursor-pointer"
              >
                Clear Filter
              </button>
            )}
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 pl-4">{tBilingual('Employee', 'কর্মী')}</th>
                  <th className="p-3.5">{tBilingual('ID / Code', 'আইডি কোড')}</th>
                  <th className="p-3.5">{tBilingual('Department & Role', 'বিভাগ ও পদবি')}</th>
                  <th className="p-3.5">{tBilingual('Contact', 'যোগাযোগ')}</th>
                  <th className="p-3.5">{tBilingual('Salary / Rate', 'মূল বেতন / দৈনিক রেট')}</th>
                  <th className="p-3.5">{tBilingual('Advance Bal.', 'অগ্রিম স্থিতি')}</th>
                  <th className="p-3.5">{tBilingual('Status', 'স্ট্যাটাস')}</th>
                  <th className="p-3.5 pr-4 text-right">{tBilingual('Actions', 'পদক্ষেপ')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors group">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-blue-500/20">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            {emp.name_bn && (
                              <span className="text-[11px] text-slate-400 font-normal">({emp.name_bn})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 capitalize">
                            {emp.employee_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {emp.employee_id_number}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{emp.role}</div>
                      <div className="text-[11px] text-slate-500 capitalize">{emp.department}</div>
                    </td>

                    <td className="p-3.5 text-[11px]">
                      <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{emp.mobile || 'N/A'}</span>
                      </div>
                      {emp.email && (
                        <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                          <Mail className="w-3 h-3 text-slate-400" />
                          <span className="truncate max-w-[140px]">{emp.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {emp.salary_basis === 'daily_rate' || emp.is_daily_worker ? (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{formatBDT(emp.daily_rate || 0)}</span>
                          <span className="text-[10px] text-slate-400"> /day</span>
                        </div>
                      ) : emp.salary_basis === 'hourly_rate' ? (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{formatBDT(emp.hourly_rate || 0)}</span>
                          <span className="text-[10px] text-slate-400"> /hr</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{formatBDT(emp.base_salary || 0)}</span>
                          <span className="text-[10px] text-slate-400"> /mo</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {Number(emp.current_advance_balance || 0) > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-[11px] font-mono font-bold">
                          {formatBDT(emp.current_advance_balance || 0)}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-[11px]">৳ 0</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 capitalize font-semibold ${
                          emp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                            : emp.status === 'on_leave'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {emp.status}
                      </Badge>
                    </td>

                    <td className="p-3.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          onClick={() => handleOpen360(emp)}
                          title="View 360° Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          onClick={() => {
                            setSelectedEmployee(emp)
                            setIsDeleteModalOpen(true)
                          }}
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.map((emp) => (
            <Card key={emp.id} className="shadow-xs border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-blue-500/20">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{emp.name}</h4>
                      <p className="text-xs text-slate-500 font-mono">{emp.employee_id_number}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 capitalize font-semibold ${
                      emp.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : emp.status === 'on_leave'
                        ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                        : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {emp.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-slate-500 border-y border-slate-100 dark:border-slate-800/80 py-3">
                  <div className="flex items-center justify-between">
                    <span>{tBilingual('Role & Dept:', 'পদবি ও বিভাগ:')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white capitalize">{emp.role} ({emp.department})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tBilingual('Salary / Pay:', 'বেতন কাঠামো:')}</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {emp.salary_basis === 'daily_rate'
                        ? `${formatBDT(emp.daily_rate || 0)}/day`
                        : `${formatBDT(emp.base_salary || 0)}/mo`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tBilingual('Advance Bal:', 'অগ্রিম স্থিতি:')}</span>
                    <span className="font-mono text-amber-600 dark:text-amber-400">
                      {formatBDT(emp.current_advance_balance || 0)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {emp.mobile}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" className="h-7 text-xs px-2 gap-1" onClick={() => handleOpen360(emp)}>
                      <Eye className="w-3 h-3" />
                      {tBilingual('360° Profile', 'প্রোফাইল')}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleOpenEdit(emp)}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {(isAddModalOpen || isEditModalOpen) && (
        <ModalDialog
          open={isAddModalOpen || isEditModalOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAddModalOpen(false)
              setIsEditModalOpen(false)
            }
          }}
          hideFooter={true}
          title={isEditModalOpen ? tBilingual('Edit Employee Profile', 'কর্মী তথ্য পরিবর্তন') : tBilingual('Enroll New Employee', 'নতুন কর্মী অন্তর্ভুক্তি')}
          description={tBilingual(
            'Configure employee personal info, salary structure, bank accounts & emergency contact',
            'কর্মীর ব্যক্তিগত তথ্য, বেতন কাঠামো, ব্যাংক অ্যাকাউন্ট ও জরুরি যোগাযোগ সংরক্ষণ করুন'
          )}
          size="lg"
        >
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2">
            {/* Section 1: Basic Info */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {tBilingual('1. Personal & Contact Details', '১. ব্যক্তিগত ও যোগাযোগ বিবরণ')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Full Name (English) *', 'পূর্ণ নাম (ইংরেজি) *')}</Label>
                  <Input
                    placeholder="e.g. Mohammad Rahim"
                    value={empForm.name}
                    onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Full Name (Bangla)', 'নাম (বাংলা)')}</Label>
                  <Input
                    placeholder="যেমন: মোহাম্মদ রহিম"
                    value={empForm.name_bn}
                    onChange={(e) => setEmpForm({ ...empForm, name_bn: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Mobile Phone *', 'মোবাইল নম্বর *')}</Label>
                  <Input
                    placeholder="+8801700000000"
                    value={empForm.mobile}
                    onChange={(e) => setEmpForm({ ...empForm, mobile: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Email Address', 'ইমেইল অ্যাড্রেস')}</Label>
                  <Input
                    placeholder="rahim@example.com"
                    value={empForm.email}
                    onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">{tBilingual('Residential Address', 'ঠিকানা')}</Label>
                <Input
                  placeholder="Street, City, Area (e.g. Arambagh, Motijheel, Dhaka)"
                  value={empForm.address}
                  onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </div>

            {/* Section 2: Role & Department */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {tBilingual('2. Role, Department & Contract', '২. পদবি, বিভাগ ও চুক্তি')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Designation / Role', 'পদবি')}</Label>
                  <Input
                    placeholder="e.g. Large Format Printer Operator"
                    value={empForm.role}
                    onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Department', 'বিভাগ')}</Label>
                  <select
                    value={empForm.department}
                    onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                    className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="printing">{tBilingual('Printing', 'প্রিন্টিং')}</option>
                    <option value="finishing">{tBilingual('Finishing', 'ফিনিশিং')}</option>
                    <option value="fabrication">{tBilingual('Fabrication', 'ফ্যাব্রিকেশন')}</option>
                    <option value="design">{tBilingual('Design', 'ডিজাইন')}</option>
                    <option value="installation">{tBilingual('Installation', 'ইনস্টলেশন')}</option>
                    <option value="accounts">{tBilingual('Accounts', 'হিসাব')}</option>
                    <option value="sales">{tBilingual('Sales', 'বিক্রি')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Employment Type', 'চুক্তির ধরন')}</Label>
                  <select
                    value={empForm.employee_type}
                    onChange={(e) => setEmpForm({ ...empForm, employee_type: e.target.value as EmploymentType })}
                    className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="permanent">{tBilingual('Permanent Staff', 'স্থায়ী কর্মী')}</option>
                    <option value="daily_worker">{tBilingual('Daily Laborer', 'দৈনিক শ্রমিক')}</option>
                    <option value="hourly_worker">{tBilingual('Hourly Worker', 'ঘণ্টাপ্রতি')}</option>
                    <option value="contract">{tBilingual('Contract Staff', 'চুক্তিভিত্তিক')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Section 3: Salary & Compensation Structure */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1 flex items-center gap-1.5">
                <Wallet className="w-3.5 h-3.5" />
                {tBilingual('3. Compensation & Overtime Rates (BDT)', '৩. বেতন ও ওভারটাইম রেট')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Base Salary (Monthly)', 'মূল মাসিক বেতন (৳)')}</Label>
                  <Input
                    type="number"
                    value={empForm.base_salary}
                    onChange={(e) => {
                      const val = Number(e.target.value || 0)
                      const hrRate = Math.round(val / 208)
                      setEmpForm({
                        ...empForm,
                        base_salary: val,
                        hourly_rate: hrRate,
                        overtime_hourly_rate: Math.round(hrRate * 1.5),
                      })
                    }}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Daily Rate (For Daily Staff)', 'দৈনিক রেট (৳)')}</Label>
                  <Input
                    type="number"
                    value={empForm.daily_rate}
                    onChange={(e) => setEmpForm({ ...empForm, daily_rate: Number(e.target.value || 0) })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Overtime Hourly Rate (৳)', 'ওভারটাইম প্রতি ঘণ্টার রেট (৳)')}</Label>
                  <Input
                    type="number"
                    value={empForm.overtime_hourly_rate}
                    onChange={(e) => setEmpForm({ ...empForm, overtime_hourly_rate: Number(e.target.value || 0) })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Bank & MFS Payout Info */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" />
                {tBilingual('4. Bank & Mobile Financial Services (MFS)', '৪. ব্যাংক ও মোবাইল ওয়ালেট')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Bank Name & Branch', 'ব্যাংক ও ব্রাঞ্চ নাম')}</Label>
                  <Input
                    placeholder="e.g. Dutch Bangla Bank, Motijheel"
                    value={empForm.bank_name}
                    onChange={(e) => setEmpForm({ ...empForm, bank_name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Bank Account Number', 'অ্যাকাউন্ট নম্বর')}</Label>
                  <Input
                    placeholder="e.g. 115.120.45892"
                    value={empForm.account_number}
                    onChange={(e) => setEmpForm({ ...empForm, account_number: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('MFS Provider', 'মোবাইল ওয়ালেট মাধ্যম')}</Label>
                  <select
                    value={empForm.mfs_provider}
                    onChange={(e) => setEmpForm({ ...empForm, mfs_provider: e.target.value as any })}
                    className="w-full h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
                  >
                    <option value="bkash">bKash (বিকাশ)</option>
                    <option value="nagad">Nagad (নগদ)</option>
                    <option value="rocket">Rocket (রকেট)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('MFS Wallet Number', 'মোবাইল ওয়ালেট নম্বর')}</Label>
                  <Input
                    placeholder="017XXXXXXXX"
                    value={empForm.mfs_number}
                    onChange={(e) => setEmpForm({ ...empForm, mfs_number: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Section 5: Emergency Contact */}
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-primary border-b border-border/60 pb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                {tBilingual('5. Emergency Contact Info', '৫. জরুরি যোগাযোগ')}
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Contact Name', 'জরুরি যোগাযোগের নাম')}</Label>
                  <Input
                    placeholder="e.g. Nasima Begum"
                    value={empForm.emergency_contact_name}
                    onChange={(e) => setEmpForm({ ...empForm, emergency_contact_name: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Relationship', 'সম্পর্ক')}</Label>
                  <Input
                    placeholder="Spouse / Brother / Parent"
                    value={empForm.emergency_contact_relation}
                    onChange={(e) => setEmpForm({ ...empForm, emergency_contact_relation: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">{tBilingual('Emergency Phone', 'জরুরি ফোন নম্বর')}</Label>
                  <Input
                    placeholder="+8801800000000"
                    value={empForm.emergency_contact_phone}
                    onChange={(e) => setEmpForm({ ...empForm, emergency_contact_phone: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsAddModalOpen(false)
                  setIsEditModalOpen(false)
                }}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={() => handleSaveEmployee(isEditModalOpen)}
                disabled={isPending}
                className="text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {isEditModalOpen ? tBilingual('Update Employee', 'আপডেট করুন') : tBilingual('Save Employee', 'সংরক্ষণ করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Employee 360° Profile Drawer / Modal */}
      {is360DrawerOpen && selectedEmployee && (
        <ModalDialog
          open={is360DrawerOpen}
          onOpenChange={(open) => setIs360DrawerOpen(open)}
          hideFooter={true}
          title={`Employee 360°: ${selectedEmployee.name}`}
          description={`ID: ${selectedEmployee.employee_id_number} • ${selectedEmployee.role} (${selectedEmployee.department})`}
          size="lg"
        >
          <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-2">
            {/* Top Profile Banner */}
            <div className="p-4 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 ring-1 ring-primary/20">
                  {selectedEmployee.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <span>{selectedEmployee.name}</span>
                    {selectedEmployee.name_bn && (
                      <span className="text-xs text-muted-foreground font-normal">({selectedEmployee.name_bn})</span>
                    )}
                  </h3>
                  <p className="text-xs text-muted-foreground capitalize">
                    {selectedEmployee.role} • {selectedEmployee.department} Department
                  </p>
                </div>
              </div>
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 capitalize ${
                  selectedEmployee.status === 'active'
                    ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                    : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
                }`}
              >
                {selectedEmployee.status}
              </Badge>
            </div>

            {/* Compensation & Advance Summary Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  {tBilingual('Base Salary / Rate', 'মূল বেতন')}
                </span>
                <div className="text-lg font-bold text-foreground mt-1">
                  {selectedEmployee.salary_basis === 'daily_rate'
                    ? `${formatBDT(selectedEmployee.daily_rate || 0)} / day`
                    : `${formatBDT(selectedEmployee.base_salary || 0)} / month`}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  {tBilingual('OT Hourly Rate', 'ওভারটাইম রেট')}
                </span>
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">
                  {formatBDT(selectedEmployee.overtime_hourly_rate || 0)} / hr
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-border/60 bg-card">
                <span className="text-[11px] text-muted-foreground uppercase font-medium">
                  {tBilingual('Outstanding Advance', 'বকেয়া অগ্রিম')}
                </span>
                <div className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">
                  {formatBDT(selectedEmployee.current_advance_balance || 0)}
                </div>
              </div>
            </div>

            {/* Contact & Banking Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                  <Phone className="w-3.5 h-3.5 text-primary" />
                  {tBilingual('Contact Information', 'যোগাযোগ তথ্য')}
                </h4>
                <div className="space-y-1 text-muted-foreground">
                  <div><strong>Mobile:</strong> {selectedEmployee.mobile}</div>
                  <div><strong>Email:</strong> {selectedEmployee.email || 'N/A'}</div>
                  <div><strong>Address:</strong> {selectedEmployee.address || 'N/A'}</div>
                  <div><strong>Emergency Contact:</strong> {selectedEmployee.emergency_contact_name} ({selectedEmployee.emergency_contact_relation}) - {selectedEmployee.emergency_contact_phone}</div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/60 bg-card space-y-2">
                <h4 className="font-bold text-foreground flex items-center gap-1.5 border-b border-border/40 pb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                  {tBilingual('Banking & Payment Methods', 'ব্যাংক ও পেমেন্ট মাধ্যম')}
                </h4>
                <div className="space-y-1 text-muted-foreground">
                  <div><strong>Bank Name:</strong> {selectedEmployee.bank_payment_info?.bank_name || 'N/A'}</div>
                  <div><strong>Account Number:</strong> {selectedEmployee.bank_payment_info?.account_number || 'N/A'}</div>
                  <div><strong>MFS Wallet:</strong> {selectedEmployee.mfs_payment_info?.provider?.toUpperCase() || 'bKash'}: {selectedEmployee.mfs_payment_info?.wallet_number || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-9 gap-1.5"
                onClick={() => {
                  setIs360DrawerOpen(false)
                  handleOpenEdit(selectedEmployee)
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
                {tBilingual('Edit Full Profile', 'প্রোফাইল সম্পাদন')}
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIs360DrawerOpen(false)}
                className="text-xs h-9"
              >
                {tBilingual('Close', 'বন্ধ করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedEmployee && (
        <ModalDialog
          open={isDeleteModalOpen}
          onOpenChange={(open) => setIsDeleteModalOpen(open)}
          hideFooter={true}
          title={tBilingual('Delete Employee', 'কর্মী ডিলিট নিশ্চিতকরণ')}
          description={tBilingual(
            'Are you sure you want to permanently delete this employee? This action cannot be undone.',
            'আপনি কি নিশ্চিতভাবে এই কর্মীর রেকর্ড মুছে ফেলতে চান?'
          )}
          size="sm"
        >
          <div className="space-y-4 pt-2">
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-600 dark:text-rose-400 text-xs">
              <p className="font-semibold">{selectedEmployee.name} ({selectedEmployee.employee_id_number})</p>
              <p className="mt-1 text-[11px] opacity-90">
                Department: {selectedEmployee.department} • Role: {selectedEmployee.role}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isPending}
                className="text-xs h-9"
              >
                {tBilingual('Cancel', 'বাতিল')}
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteEmployee}
                disabled={isPending}
                className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white gap-1.5"
              >
                {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                {tBilingual('Confirm Delete', 'ডিলিট করুন')}
              </Button>
            </div>
          </div>
        </ModalDialog>
      )}
    </div>
  )
}
