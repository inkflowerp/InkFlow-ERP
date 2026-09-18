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

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400 ring-1 ring-blue-500/20">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                {tBilingual('Employee Directory', 'কর্মীদের তালিকা ও ব্যবস্থাপনা')}
                <Badge variant="secondary" className="font-bold text-xs">
                  {filteredEmployees.length} {tBilingual('Staff', 'জন')}
                </Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                {tBilingual(
                  'Manage permanent staff, daily laborers, operator assignments & salary packages',
                  'স্থায়ী কর্মী, দৈনিক চুক্তিবদ্ধ শ্রমিক ও অপারেটরদের প্রোফাইল ও বেতন কাঠামো'
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
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
            className="gap-1.5 text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="w-3.5 h-3.5" />
            {tBilingual('Add New Employee', 'নতুন কর্মী যোগ করুন')}
          </Button>
        </div>
      </div>

      {/* Top Stat Summary Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-medium">
              {tBilingual('Total Enrolled', 'মোট নিবন্ধিত')}
            </div>
            <div className="text-xl font-bold text-foreground mt-0.5">{employees.length}</div>
          </div>
          <Users className="w-5 h-5 text-blue-500/60" />
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-medium">
              {tBilingual('Permanent Staff', 'স্থায়ী কর্মী')}
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{permanentCount}</div>
          </div>
          <ShieldCheck className="w-5 h-5 text-emerald-500/60" />
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-medium">
              {tBilingual('Daily / Hourly', 'দৈনিক / ঘণ্টাপ্রতি')}
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-0.5">{dailyCount + hourlyCount}</div>
          </div>
          <Clock className="w-5 h-5 text-amber-500/60" />
        </div>

        <div className="p-3.5 rounded-xl border border-border/60 bg-card shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-medium">
              {tBilingual('On Leave', 'ছুটিতে')}
            </div>
            <div className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-0.5">{onLeaveCount}</div>
          </div>
          <Calendar className="w-5 h-5 text-purple-500/60" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="border-border/60 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-2.5 w-full">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tBilingual('Search by name, ID, phone...', 'নাম, আইডি, মোবাইল দিয়ে খুঁজুন...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            {/* Department Filter */}
            <select
              aria-label="Filter by department"
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
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

            {/* Employment Type Filter */}
            <select
              aria-label="Filter by employment type"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
            >
              <option value="ALL">{tBilingual('All Types', 'সব ধরন')}</option>
              <option value="permanent">{tBilingual('Permanent', 'স্থায়ী')}</option>
              <option value="daily_worker">{tBilingual('Daily Worker', 'দৈনিক শ্রমিক')}</option>
              <option value="hourly_worker">{tBilingual('Hourly Worker', 'ঘণ্টাপ্রতি')}</option>
              <option value="contract">{tBilingual('Contract', 'চুক্তিভিত্তিক')}</option>
            </select>

            {/* Status Filter */}
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 text-xs px-2.5 rounded-md border border-input bg-background text-foreground"
            >
              <option value="ALL">{tBilingual('All Statuses', 'সব স্ট্যাটাস')}</option>
              <option value="active">{tBilingual('Active', 'সক্রিয়')}</option>
              <option value="on_leave">{tBilingual('On Leave', 'ছুটিতে')}</option>
              <option value="inactive">{tBilingual('Inactive', 'নিষ্ক্রিয়')}</option>
            </select>
          </div>

          {/* View Toggle Table / Grid */}
          <div className="flex items-center gap-1 border border-border rounded-lg p-0.5 bg-muted/30 shrink-0">
            <Button
              size="sm"
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('table')}
              title="Table View"
            >
              <List className="w-3.5 h-3.5" />
            </Button>
            <Button
              size="sm"
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              className="h-7 w-7 p-0"
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Employee Roster List */}
      {filteredEmployees.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">
            {tBilingual('No employees match your search criteria', 'কোন কর্মী পাওয়া যায়নি')}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {tBilingual('Try clearing your filters or enroll a new employee to your organization.', 'ফিল্টার পরিবর্তন করুন অথবা নতুন কর্মী যোগ করুন।')}
          </p>
          <Button size="sm" onClick={handleOpenAdd} className="mt-4 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            {tBilingual('Add New Employee', 'নতুন কর্মী যোগ করুন')}
          </Button>
        </Card>
      ) : viewMode === 'table' ? (
        /* Table View */
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-medium text-muted-foreground">
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
              <tbody className="divide-y divide-border/40">
                {filteredEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-muted/30 transition-colors group">
                    <td className="p-3.5 pl-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 ring-1 ring-primary/20">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>{emp.name}</span>
                            {emp.name_bn && (
                              <span className="text-[11px] text-muted-foreground font-normal">({emp.name_bn})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground capitalize">
                            {emp.employee_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-[11px] text-muted-foreground">
                      {emp.employee_id_number}
                    </td>

                    <td className="p-3.5">
                      <div className="font-medium text-foreground">{emp.role}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">{emp.department}</div>
                    </td>

                    <td className="p-3.5 text-[11px]">
                      <div className="flex items-center gap-1 text-foreground">
                        <Phone className="w-3 h-3 text-muted-foreground" />
                        <span>{emp.mobile || 'N/A'}</span>
                      </div>
                      {emp.email && (
                        <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="truncate max-w-[140px]">{emp.email}</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {emp.salary_basis === 'daily_rate' || emp.is_daily_worker ? (
                        <div>
                          <span className="font-semibold text-foreground">{formatBDT(emp.daily_rate || 0)}</span>
                          <span className="text-[10px] text-muted-foreground"> /day</span>
                        </div>
                      ) : emp.salary_basis === 'hourly_rate' ? (
                        <div>
                          <span className="font-semibold text-foreground">{formatBDT(emp.hourly_rate || 0)}</span>
                          <span className="text-[10px] text-muted-foreground"> /hr</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-foreground">{formatBDT(emp.base_salary || 0)}</span>
                          <span className="text-[10px] text-muted-foreground"> /mo</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {Number(emp.current_advance_balance || 0) > 0 ? (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] font-mono">
                          {formatBDT(emp.current_advance_balance || 0)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px]">৳ 0</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0.5 capitalize ${
                          emp.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                            : emp.status === 'on_leave'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30'
                            : 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30'
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
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => handleOpen360(emp)}
                          title="View 360° Profile"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-blue-500"
                          onClick={() => handleOpenEdit(emp)}
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500"
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
            <Card key={emp.id} className="border-border/60 hover:border-primary/40 transition-colors shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 ring-1 ring-primary/20">
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-foreground">{emp.name}</h4>
                      <p className="text-xs text-muted-foreground font-mono">{emp.employee_id_number}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0.5 capitalize ${
                      emp.status === 'active'
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                        : 'bg-zinc-500/10 text-zinc-600 border-zinc-500/30'
                    }`}
                  >
                    {emp.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground border-y border-border/40 py-3">
                  <div className="flex items-center justify-between">
                    <span>{tBilingual('Role & Dept:', 'পদবি ও বিভাগ:')}</span>
                    <span className="font-medium text-foreground capitalize">{emp.role} ({emp.department})</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{tBilingual('Salary / Pay:', 'বেতন কাঠামো:')}</span>
                    <span className="font-semibold text-foreground">
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
