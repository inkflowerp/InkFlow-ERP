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
  ChevronLeft,
  UserCheck,
  X,
  CreditCard,
  Landmark,
  Smartphone,
  Copy,
  Check,
  Calculator,
  Percent,
  FileText,
  Info,
  Coins,
  MapPin,
  Hash,
  Sparkle,
  ArrowRight,
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

const ROLE_PRESETS = [
  {
    title: 'Master Offset Printer',
    title_bn: 'মাস্টার অফসেট প্রিন্টার',
    role: 'Master Offset Machine Operator',
    department: 'printing',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 35000,
    hourly_rate: 168,
    overtime_hourly_rate: 250,
    daily_rate: 1200,
    icon: '🖨️',
    color: 'border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/60 text-cyan-600 dark:text-cyan-400',
  },
  {
    title: 'Large Format & UV Operator',
    title_bn: 'লার্জ ফরম্যাট ও ইউভি অপারেটর',
    role: 'Large Format & UV Flatbed Operator',
    department: 'printing',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 26000,
    hourly_rate: 125,
    overtime_hourly_rate: 190,
    daily_rate: 900,
    icon: '📐',
    color: 'border-blue-500/30 bg-blue-500/5 hover:border-blue-500/60 text-blue-600 dark:text-blue-400',
  },
  {
    title: 'Finishing & Die-Cut Specialist',
    title_bn: 'ফিনিশিং ও ডাই-কাটিং ইনচার্জ',
    role: 'Finishing & Die-Cutting Specialist',
    department: 'finishing',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 22000,
    hourly_rate: 105,
    overtime_hourly_rate: 160,
    daily_rate: 800,
    icon: '✂️',
    color: 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60 text-amber-600 dark:text-amber-400',
  },
  {
    title: 'Signage & Acrylic Fabricator',
    title_bn: 'সাইনেজ ও এক্রিলিক কারিগর',
    role: 'Signage & Acrylic CNC Fabricator',
    department: 'fabrication',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 28000,
    hourly_rate: 135,
    overtime_hourly_rate: 200,
    daily_rate: 950,
    icon: '⚡',
    color: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60 text-purple-600 dark:text-purple-400',
  },
  {
    title: 'Graphic Designer & Prepress',
    title_bn: 'গ্রাফিক ডিজাইনার ও প্রি-প্রেস',
    role: 'Senior Graphic Designer & Prepress',
    department: 'design',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 30000,
    hourly_rate: 144,
    overtime_hourly_rate: 220,
    daily_rate: 1000,
    icon: '🎨',
    color: 'border-pink-500/30 bg-pink-500/5 hover:border-pink-500/60 text-pink-600 dark:text-pink-400',
  },
  {
    title: 'On-Site Installation Tech',
    title_bn: 'অন-সাইট ইনস্টলেশন টেকনিশিয়ান',
    role: 'Installation & Field Technician',
    department: 'installation',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 24000,
    hourly_rate: 115,
    overtime_hourly_rate: 175,
    daily_rate: 850,
    icon: '🛠️',
    color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Accounts & Billing Officer',
    title_bn: 'অ্যাকাউন্টিং ও বিলিং অফিসার',
    role: 'Accounts & Billing Officer',
    department: 'accounts',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 28000,
    hourly_rate: 135,
    overtime_hourly_rate: 200,
    daily_rate: 950,
    icon: '📊',
    color: 'border-indigo-500/30 bg-indigo-500/5 hover:border-indigo-500/60 text-indigo-600 dark:text-indigo-400',
  },
  {
    title: 'Daily Production Laborer',
    title_bn: 'দৈনিক সাধারণ শ্রমিক',
    role: 'Daily Production Laborer',
    department: 'printing',
    employee_type: 'daily_worker' as EmploymentType,
    salary_basis: 'daily_rate' as SalaryBasis,
    base_salary: 0,
    hourly_rate: 100,
    overtime_hourly_rate: 150,
    daily_rate: 800,
    icon: '👷',
    color: 'border-slate-500/30 bg-slate-500/5 hover:border-slate-500/60 text-slate-600 dark:text-slate-400',
  },
]

const POPULAR_BANKS = [
  'Dutch-Bangla Bank (DBBL)',
  'BRAC Bank',
  'The City Bank',
  'Islami Bank Bangladesh',
  'Eastern Bank (EBL)',
  'Sonali Bank',
  'Pubali Bank',
  'United Commercial Bank (UCB)',
]

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

  // Upgraded Modal Tab Navigation & State
  const [modalTab, setModalTab] = useState<'personal' | 'role' | 'salary' | 'banking' | 'emergency'>('personal')
  const [showAdvancedAllowances, setShowAdvancedAllowances] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const triggerCopy = (key: string) => {
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // Form State
  const initialForm = {
    id: '',
    name: '',
    name_bn: '',
    mobile: '',
    phone: '',
    email: '',
    nid_number: '',
    address: '',
    role: 'Master Offset Machine Operator',
    department: 'printing',
    branch_id: '',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    joining_date: new Date().toISOString().split('T')[0],
    base_salary: 25000,
    daily_rate: 800,
    hourly_rate: 120,
    overtime_hourly_rate: 180,
    salary_structure: {
      basic: 15000,
      house_allowance: 5000,
      transport_allowance: 2500,
      medical_allowance: 2500,
      food_allowance: 0,
      other_allowances: 0,
    },
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Spouse',
    bank_name: '',
    account_name: '',
    account_number: '',
    branch_name: '',
    routing_number: '',
    mfs_provider: 'bkash' as 'bkash' | 'nagad' | 'rocket' | 'other',
    mfs_account_type: 'personal' as 'personal' | 'merchant' | 'agent',
    mfs_number: '',
    status: 'active' as EmployeeRecord['status'],
    notes: '',
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
      handleOpenAdd()
    }
  }, [searchParams])

  const handleOpenAdd = () => {
    setEmpForm({
      ...initialForm,
      branch_id: branches[0]?.id || '',
      joining_date: new Date().toISOString().split('T')[0],
    })
    setModalTab('personal')
    setShowAdvancedAllowances(false)
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp)
    const baseSalary = Number(emp.base_salary || 0)

    let nid = ''
    let notesClean = emp.notes || ''
    if (notesClean.includes('NID: ')) {
      const match = notesClean.match(/NID:\s*([^\n]+)/)
      if (match) {
        nid = match[1].trim()
        notesClean = notesClean.replace(/NID:\s*[^\n]+(\n)?/, '').trim()
      }
    }

    setEmpForm({
      id: emp.id,
      name: emp.name || '',
      name_bn: emp.name_bn || '',
      mobile: emp.mobile || '',
      phone: emp.phone || '',
      email: emp.email || '',
      nid_number: nid,
      address: emp.address || '',
      role: emp.role || 'Staff',
      department: emp.department || 'printing',
      branch_id: emp.branch_id || '',
      employee_type: emp.employee_type || 'permanent',
      salary_basis: emp.salary_basis || 'monthly',
      joining_date: emp.joining_date || new Date().toISOString().split('T')[0],
      base_salary: baseSalary,
      daily_rate: Number(emp.daily_rate || 0),
      hourly_rate: Number(emp.hourly_rate || (baseSalary > 0 ? Math.round(baseSalary / 208) : 0)),
      overtime_hourly_rate: Number(
        emp.overtime_hourly_rate || (baseSalary > 0 ? Math.round((baseSalary / 208) * 1.5) : 0)
      ),
      salary_structure: emp.salary_structure || {
        basic: Math.round(baseSalary * 0.6),
        house_allowance: Math.round(baseSalary * 0.2),
        transport_allowance: Math.round(baseSalary * 0.1),
        medical_allowance: Math.round(baseSalary * 0.1),
        food_allowance: 0,
        other_allowances: 0,
      },
      emergency_contact_name: emp.emergency_contact_name || '',
      emergency_contact_phone: emp.emergency_contact_phone || '',
      emergency_contact_relation: emp.emergency_contact_relation || 'Spouse',
      bank_name: emp.bank_payment_info?.bank_name || '',
      account_name: emp.bank_payment_info?.account_name || emp.name || '',
      account_number: emp.bank_payment_info?.account_number || '',
      branch_name: emp.bank_payment_info?.branch_name || '',
      routing_number: emp.bank_payment_info?.routing_number || '',
      mfs_provider: (emp.mfs_payment_info?.provider as any) || 'bkash',
      mfs_account_type: (emp.mfs_payment_info?.account_type as any) || 'personal',
      mfs_number: emp.mfs_payment_info?.wallet_number || '',
      status: emp.status || 'active',
      notes: notesClean,
    })
    setModalTab('personal')
    setShowAdvancedAllowances(false)
    setIsEditModalOpen(true)
  }

  const handleOpen360 = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp)
    setIs360DrawerOpen(true)
  }

  const handleSelectPreset = (preset: typeof ROLE_PRESETS[0]) => {
    const base = preset.base_salary
    const hrRate = preset.hourly_rate
    const otRate = preset.overtime_hourly_rate
    const basic = Math.round(base * 0.6)
    const house = Math.round(base * 0.2)
    const transport = Math.round(base * 0.1)
    const medical = Math.round(base * 0.1)

    setEmpForm((prev) => ({
      ...prev,
      role: preset.role,
      department: preset.department,
      employee_type: preset.employee_type,
      salary_basis: preset.salary_basis,
      base_salary: base,
      daily_rate: preset.daily_rate,
      hourly_rate: hrRate,
      overtime_hourly_rate: otRate,
      salary_structure: {
        basic,
        house_allowance: house,
        transport_allowance: transport,
        medical_allowance: medical,
        food_allowance: 0,
        other_allowances: 0,
      },
    }))
    notify(`Applied preset: ${preset.title}`)
  }

  const handleBaseSalaryChange = (val: number) => {
    const hrRate = val > 0 ? Math.round(val / 208) : 0
    const otRate = Math.round(hrRate * 1.5)
    const basic = Math.round(val * 0.6)
    const house = Math.round(val * 0.2)
    const transport = Math.round(val * 0.1)
    const medical = Math.round(val * 0.1)

    setEmpForm((prev) => ({
      ...prev,
      base_salary: val,
      hourly_rate: hrRate,
      overtime_hourly_rate: otRate,
      salary_structure: {
        ...prev.salary_structure,
        basic,
        house_allowance: house,
        transport_allowance: transport,
        medical_allowance: medical,
      },
    }))
  }

  const handleSaveEmployee = async (isEdit: boolean) => {
    if (!empForm.name.trim()) {
      setModalTab('personal')
      notify('Please enter employee full name.')
      return
    }

    if (!empForm.mobile.trim()) {
      setModalTab('personal')
      notify('Please enter employee mobile number.')
      return
    }

    startTransition(async () => {
      const notesFormatted = [
        empForm.nid_number ? `NID: ${empForm.nid_number.trim()}` : '',
        empForm.notes?.trim() || '',
      ]
        .filter(Boolean)
        .join('\n')

      const payload: any = {
        name: empForm.name.trim(),
        name_bn: empForm.name_bn?.trim() || null,
        mobile: empForm.mobile.trim(),
        phone: empForm.phone?.trim() || null,
        email: empForm.email?.trim() || null,
        address: empForm.address?.trim() || null,
        role: empForm.role.trim() || 'Staff',
        department: empForm.department,
        branch_id: empForm.branch_id || null,
        employee_type: empForm.employee_type,
        salary_basis: empForm.salary_basis,
        joining_date: empForm.joining_date || new Date().toISOString().split('T')[0],
        base_salary: Number(empForm.base_salary || 0),
        daily_rate: Number(empForm.daily_rate || 0),
        hourly_rate: Number(empForm.hourly_rate || 0),
        overtime_hourly_rate: Number(empForm.overtime_hourly_rate || 0),
        emergency_contact_name: empForm.emergency_contact_name?.trim() || null,
        emergency_contact_phone: empForm.emergency_contact_phone?.trim() || null,
        emergency_contact_relation: empForm.emergency_contact_relation?.trim() || null,
        notes: notesFormatted || null,
        status: empForm.status,
        salary_structure: {
          basic: Number(empForm.salary_structure?.basic || Math.round(Number(empForm.base_salary || 0) * 0.6)),
          house_allowance: Number(
            empForm.salary_structure?.house_allowance || Math.round(Number(empForm.base_salary || 0) * 0.2)
          ),
          transport_allowance: Number(
            empForm.salary_structure?.transport_allowance || Math.round(Number(empForm.base_salary || 0) * 0.1)
          ),
          medical_allowance: Number(
            empForm.salary_structure?.medical_allowance || Math.round(Number(empForm.base_salary || 0) * 0.1)
          ),
          food_allowance: Number(empForm.salary_structure?.food_allowance || 0),
          other_allowances: Number(empForm.salary_structure?.other_allowances || 0),
        },
        bank_payment_info: empForm.account_number?.trim()
          ? {
              bank_name: empForm.bank_name.trim(),
              account_name: empForm.account_name.trim() || empForm.name.trim(),
              account_number: empForm.account_number.trim(),
              branch_name: empForm.branch_name.trim(),
              routing_number: empForm.routing_number.trim() || undefined,
            }
          : null,
        mfs_payment_info: empForm.mfs_number?.trim()
          ? {
              provider: empForm.mfs_provider,
              wallet_number: empForm.mfs_number.trim(),
              account_type: empForm.mfs_account_type || 'personal',
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
          title={
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm ring-1 ring-blue-500/20">
                {isEditModalOpen ? <Edit2 className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-base font-bold text-slate-900 dark:text-white">
                  {isEditModalOpen
                    ? tBilingual('Edit Employee Profile', 'কর্মী তথ্য পরিবর্তন')
                    : tBilingual('Enroll New Employee', 'নতুন কর্মী অন্তর্ভুক্তি')}
                </span>
                <p className="text-xs text-slate-500 font-normal">
                  {isEditModalOpen
                    ? `ID: ${selectedEmployee?.employee_id_number || 'EMP'} • ${empForm.role || 'Staff'}`
                    : tBilingual('Bangladeshi Print & Signage Shop Workforce Registration', 'প্রিন্ট ও সাইনেজ কারখানা কর্মী নিবন্ধন')}
                </p>
              </div>
            </div>
          }
          size="4xl"
        >
          <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            {/* Step Progress & Tab Navigation Bar */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: 'personal', num: 1, title: 'Personal Info', title_bn: 'ব্যক্তিগত তথ্য', icon: UserCheck },
                { id: 'role', num: 2, title: 'Role & Contract', title_bn: 'পদবি ও চুক্তি', icon: Briefcase },
                { id: 'salary', num: 3, title: 'Compensation', title_bn: 'বেতন কাঠামো', icon: Calculator },
                { id: 'banking', num: 4, title: 'Bank & MFS', title_bn: 'ব্যাংক ও ওয়ালেট', icon: CreditCard },
                { id: 'emergency', num: 5, title: 'Emergency & Notes', title_bn: 'জরুরি ও অন্যান্য', icon: ShieldCheck },
              ].map((step) => {
                const isActive = modalTab === step.id
                const Icon = step.icon
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setModalTab(step.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                      isActive
                        ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/90 dark:border-slate-800 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {step.num}
                    </span>
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tBilingual(step.title, step.title_bn)}</span>
                  </button>
                )
              })}
            </div>

            {/* TAB 1: PERSONAL & CONTACT DETAILS */}
            {modalTab === 'personal' && (
              <div className="space-y-4 pt-1">
                {/* Profile Avatar & Preview Banner */}
                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                      {empForm.name ? empForm.name.slice(0, 2).toUpperCase() : 'EMP'}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        {empForm.name || tBilingual('New Employee', 'নতুন কর্মী')}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {empForm.name_bn ? `${empForm.name_bn} • ` : ''}
                        {empForm.mobile || tBilingual('No mobile specified', 'মোবাইল নম্বর দেওয়া হয়নি')}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs px-2.5 py-1 text-slate-700 dark:text-slate-300">
                    {tBilingual('Step 1 of 5', 'ধাপ ১ / ৫')}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Full Name (English) *', 'পূর্ণ নাম (ইংরেজি) *')}
                    </Label>
                    <Input
                      placeholder="e.g. Mohammad Rahim Uddin"
                      value={empForm.name}
                      onChange={(e) => setEmpForm({ ...empForm, name: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Full Name (Bangla)', 'নাম (বাংলা)')}
                    </Label>
                    <Input
                      placeholder="যেমন: মোহাম্মদ রহিম উদ্দিন"
                      value={empForm.name_bn}
                      onChange={(e) => setEmpForm({ ...empForm, name_bn: e.target.value })}
                      className="text-xs h-9 font-bengali"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Primary Mobile Number *', 'প্রধান মোবাইল নম্বর *')}
                    </Label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="017XXXXXXXX / +88017XXXXXXXX"
                        value={empForm.mobile}
                        onChange={(e) => setEmpForm({ ...empForm, mobile: e.target.value })}
                        className="text-xs h-9 pl-9 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Secondary Phone / WhatsApp', 'বিকল্প ফোন / হোয়াটসঅ্যাপ')}
                    </Label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="018XXXXXXXX (Optional)"
                        value={empForm.phone}
                        onChange={(e) => setEmpForm({ ...empForm, phone: e.target.value })}
                        className="text-xs h-9 pl-9 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Email Address', 'ইমেইল অ্যাড্রেস')}
                    </Label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="rahim@visionprint.com (Optional)"
                        value={empForm.email}
                        onChange={(e) => setEmpForm({ ...empForm, email: e.target.value })}
                        className="text-xs h-9 pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('National ID / Smart Card (NID)', 'জাতীয় পরিচয়পত্র / স্মার্ট কার্ড নম্বর')}
                    </Label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="10 / 13 / 17 Digit NID"
                        value={empForm.nid_number}
                        onChange={(e) => setEmpForm({ ...empForm, nid_number: e.target.value })}
                        className="text-xs h-9 pl-9 font-mono"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Joining Date', 'যোগদানের তারিখ')}
                    </Label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="date"
                        value={empForm.joining_date}
                        onChange={(e) => setEmpForm({ ...empForm, joining_date: e.target.value })}
                        className="text-xs h-9 pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Employee Status', 'বর্তমান স্ট্যাটাস')}
                    </Label>
                    <select
                      value={empForm.status}
                      onChange={(e) => setEmpForm({ ...empForm, status: e.target.value as any })}
                      className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                    >
                      <option value="active">{tBilingual('Active (কর্মরত)', 'কর্মরত')}</option>
                      <option value="on_leave">{tBilingual('On Leave (ছুটিতে)', 'ছুটিতে')}</option>
                      <option value="terminated">{tBilingual('Terminated / Inactive (অব্যাহতিপ্রাপ্ত)', 'অব্যাহতিপ্রাপ্ত')}</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Residential & Present Address', 'বর্তমান ও স্থায়ী ঠিকানা')}
                  </Label>
                  <div className="relative">
                    <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <Input
                      placeholder="e.g. 42/B Arambagh, Motijheel, Dhaka-1000"
                      value={empForm.address}
                      onChange={(e) => setEmpForm({ ...empForm, address: e.target.value })}
                      className="text-xs h-9 pl-9"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: ROLE, DEPARTMENT & CONTRACT */}
            {modalTab === 'role' && (
              <div className="space-y-4 pt-1">
                {/* Quick Role Preset Selector Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {tBilingual('1-Click Print & Signage Role Presets', '১-ক্লিক প্রিন্ট ও সাইনেজ পদবি প্রিসেট')}
                    </Label>
                    <span className="text-[11px] text-slate-400">
                      {tBilingual('Click to auto-fill designation, department & salary', 'ক্লিক করলেই বেতন ও পদবি স্বয়ংক্রিয় পূরণ হবে')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ROLE_PRESETS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => handleSelectPreset(preset)}
                        className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${preset.color} ${
                          empForm.role === preset.role ? 'ring-2 ring-blue-500 font-semibold' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="text-base">{preset.icon}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80">
                            {formatBDT(preset.base_salary || preset.daily_rate)}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <div className="text-xs font-bold line-clamp-1">{preset.title}</div>
                          <div className="text-[10px] opacity-75 capitalize">{preset.department}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Role Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Designation / Job Title *', 'পদবি / দায়িত্ব *')}
                    </Label>
                    <Input
                      placeholder="e.g. Master Offset Machine Operator"
                      value={empForm.role}
                      onChange={(e) => setEmpForm({ ...empForm, role: e.target.value })}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Department *', 'বিভাগ *')}
                    </Label>
                    <select
                      value={empForm.department}
                      onChange={(e) => setEmpForm({ ...empForm, department: e.target.value })}
                      className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                    >
                      <option value="printing">{tBilingual('Printing (মুদ্রণ ও প্রিন্টিং)', 'মুদ্রণ ও প্রিন্টিং')}</option>
                      <option value="finishing">{tBilingual('Finishing & Binding (ফিনিশিং ও বাইন্ডিং)', 'ফিনিশিং ও বাইন্ডিং')}</option>
                      <option value="fabrication">{tBilingual('Fabrication & CNC (সাইনেজ ও মেটালিক)', 'সাইনেজ ও মেটালিক')}</option>
                      <option value="design">{tBilingual('Pre-press & Design (গ্রাফিক ডিজাইন)', 'গ্রাফিক ডিজাইন')}</option>
                      <option value="installation">{tBilingual('On-site Installation (অন-সাইট ফিটিং)', 'অন-সাইট ফিটিং')}</option>
                      <option value="accounts">{tBilingual('Accounts & Billing (হিসাব ও বিলিং)', 'হিসাব ও বিলিং')}</option>
                      <option value="sales">{tBilingual('Sales & Marketing (মার্কেটিং ও সেলস)', 'মার্কেটিং ও সেলস')}</option>
                      <option value="management">{tBilingual('Management / Floor Admin (ম্যানেজমেন্ট)', 'ম্যানেজমেন্ট')}</option>
                      <option value="field_ops">{tBilingual('Field Operations (ফিল্ড অপারেশন)', 'ফিল্ড অপারেশন')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Employment Type *', 'চুক্তির ধরন *')}
                    </Label>
                    <select
                      value={empForm.employee_type}
                      onChange={(e) => {
                        const type = e.target.value as EmploymentType
                        const isDaily = type === 'daily_worker' || type === 'daily_labor'
                        setEmpForm({
                          ...empForm,
                          employee_type: type,
                          salary_basis: isDaily ? 'daily_rate' : type === 'hourly_worker' ? 'hourly_rate' : 'monthly',
                        })
                      }}
                      className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                    >
                      <option value="permanent">{tBilingual('Permanent Monthly Staff (স্থায়ী মাসিক কর্মী)', 'স্থায়ী মাসিক কর্মী')}</option>
                      <option value="daily_worker">{tBilingual('Daily Wage Laborer (দৈনিক মজুরি কর্মী)', 'দৈনিক মজুরি কর্মী')}</option>
                      <option value="hourly_worker">{tBilingual('Hourly Worker (ঘণ্টাপ্রতি পারিশ্রমিক)', 'ঘণ্টাপ্রতি পারিশ্রমিক')}</option>
                      <option value="contract">{tBilingual('Contract Staff (চুক্তিভিত্তিক কর্মী)', 'চুক্তিভিত্তিক কর্মী')}</option>
                      <option value="part_time">{tBilingual('Part-Time Worker (খণ্ডকালীন কর্মী)', 'খণ্ডকালীন কর্মী')}</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Assigned Branch / Production Unit', 'কারখানা / শাখা')}
                    </Label>
                    <select
                      value={empForm.branch_id}
                      onChange={(e) => setEmpForm({ ...empForm, branch_id: e.target.value })}
                      className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                    >
                      <option value="">{tBilingual('Main Factory / Head Office', 'প্রধান কারখানা / হেড অফিস')}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}{b.code ? ` (${b.code})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COMPENSATION & OVERTIME CALCULATOR */}
            {modalTab === 'salary' && (
              <div className="space-y-4 pt-1">
                {/* Salary Basis Selector Pills */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Salary Basis / Payout Mode', 'বেতনের ধরন')}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'monthly', label: 'Monthly Fixed (মাসিক)', desc: 'Full-time salaried staff' },
                      { id: 'daily_rate', label: 'Daily Wage (দৈনিক)', desc: 'Shop-floor labor rate' },
                      { id: 'hourly_rate', label: 'Hourly Rate (ঘণ্টাপ্রতি)', desc: 'Field & part-time tech' },
                      { id: 'contract', label: 'Contractual (চুক্তি)', desc: 'Job-wise or fixed term' },
                    ].map((mode) => (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setEmpForm({ ...empForm, salary_basis: mode.id as SalaryBasis })}
                        className={`p-2.5 rounded-xl border text-left transition-all ${
                          empForm.salary_basis === mode.id
                            ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 font-semibold shadow-xs'
                            : 'bg-card border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-xs font-bold">{mode.label}</div>
                        <div className="text-[10px] opacity-75">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Numbers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{tBilingual('Base Salary (Monthly)', 'মূল মাসিক বেতন')}</span>
                      <span className="text-[10px] text-blue-600 font-mono">৳ BDT</span>
                    </Label>
                    <Input
                      type="number"
                      value={empForm.base_salary}
                      onChange={(e) => handleBaseSalaryChange(Number(e.target.value || 0))}
                      className="text-sm h-9 font-bold font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      {tBilingual('Auto-calculates hourly & 1.5x OT rates', 'ঘণ্টা ও ১.৫x ওভারটাইম হিসাব হবে')}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{tBilingual('Daily Rate (Daily Staff)', 'দৈনিক রেট (৳)')}</span>
                      <span className="text-[10px] text-blue-600 font-mono">৳/day</span>
                    </Label>
                    <Input
                      type="number"
                      value={empForm.daily_rate}
                      onChange={(e) => setEmpForm({ ...empForm, daily_rate: Number(e.target.value || 0) })}
                      className="text-sm h-9 font-bold font-mono"
                    />
                    <p className="text-[10px] text-slate-400">
                      {tBilingual('Used for daily floor wage calculation', 'দৈনিক শ্রমিকের হাজিরা মজুরি')}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20">
                    <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                      <span>{tBilingual('OT Hourly Rate (৳)', 'ওভারটাইম রেট')}</span>
                      <span className="text-[10px] text-amber-600 font-mono">৳/hour</span>
                    </Label>
                    <Input
                      type="number"
                      value={empForm.overtime_hourly_rate}
                      onChange={(e) => setEmpForm({ ...empForm, overtime_hourly_rate: Number(e.target.value || 0) })}
                      className="text-sm h-9 font-bold font-mono text-amber-600 dark:text-amber-400"
                    />
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const hr = empForm.hourly_rate || Math.round((empForm.base_salary || 0) / 208)
                          setEmpForm({ ...empForm, overtime_hourly_rate: Math.round(hr * 1.5) })
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-bold"
                      >
                        1.5x Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const hr = empForm.hourly_rate || Math.round((empForm.base_salary || 0) / 208)
                          setEmpForm({ ...empForm, overtime_hourly_rate: Math.round(hr * 2.0) })
                        }}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-bold"
                      >
                        2.0x Holiday
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bangladesh Labor Act Statutory Salary Breakdown */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Bangladesh Labor Law Statutory Salary Structure', 'শ্রম আইন অনুযায়ী বেতন কাঠামো (৬০-২০-১০-১০)')}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setShowAdvancedAllowances(!showAdvancedAllowances)}
                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {showAdvancedAllowances ? tBilingual('Hide Custom Details', 'কাস্টম আড়াল করুন') : tBilingual('Customize Allowances', 'ভাতা কাস্টমাইজ করুন')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('Basic Salary (60%)', 'মূল বেতন (৬০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.basic || Math.round(empForm.base_salary * 0.6))}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('House Rent (20%)', 'বাড়ি ভাড়া (২০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.house_allowance || Math.round(empForm.base_salary * 0.2))}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('Medical (10%)', 'চিকিৎসা ভাতা (১০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.medical_allowance || Math.round(empForm.base_salary * 0.1))}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('Conveyance (10%)', 'যাতায়াত ভাতা (১০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.transport_allowance || Math.round(empForm.base_salary * 0.1))}
                      </span>
                    </div>
                  </div>

                  {/* Advanced Custom Allowances */}
                  {showAdvancedAllowances && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <Label className="text-[11px]">{tBilingual('Custom Basic (৳)', 'কাস্টম বেসিক')}</Label>
                        <Input
                          type="number"
                          value={empForm.salary_structure?.basic}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              salary_structure: { ...empForm.salary_structure, basic: Number(e.target.value || 0) },
                            })
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">{tBilingual('House Rent (৳)', 'বাড়ি ভাড়া')}</Label>
                        <Input
                          type="number"
                          value={empForm.salary_structure?.house_allowance}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              salary_structure: { ...empForm.salary_structure, house_allowance: Number(e.target.value || 0) },
                            })
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">{tBilingual('Food Allowance (৳)', 'খাবার ভাতা')}</Label>
                        <Input
                          type="number"
                          value={empForm.salary_structure?.food_allowance || 0}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              salary_structure: { ...empForm.salary_structure, food_allowance: Number(e.target.value || 0) },
                            })
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                      <div>
                        <Label className="text-[11px]">{tBilingual('Other Allowance (৳)', 'অন্যান্য ভাতা')}</Label>
                        <Input
                          type="number"
                          value={empForm.salary_structure?.other_allowances || 0}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              salary_structure: { ...empForm.salary_structure, other_allowances: Number(e.target.value || 0) },
                            })
                          }
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: BANKING & MOBILE FINANCIAL SERVICES (MFS) */}
            {modalTab === 'banking' && (
              <div className="space-y-4 pt-1">
                {/* Bank Transfer Section */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Bank Account Details (BEFTN / NPSB / RTGS)', 'ব্যাংক অ্যাকাউন্ট বিবরণ')}
                    </h5>
                    <span className="text-[11px] text-slate-400">Optional for direct bank disbursement</span>
                  </div>

                  {/* Popular Bank Selector Chips */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] text-slate-500 font-medium">Quick Bank Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_BANKS.map((bName) => (
                        <button
                          key={bName}
                          type="button"
                          onClick={() => setEmpForm({ ...empForm, bank_name: bName })}
                          className={`text-[10px] px-2 py-1 rounded-md border transition-all ${
                            empForm.bank_name === bName
                              ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 border-blue-400 font-bold'
                              : 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {bName}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Bank Name', 'ব্যাংকের নাম')}</Label>
                      <Input
                        placeholder="e.g. Dutch-Bangla Bank (DBBL)"
                        value={empForm.bank_name}
                        onChange={(e) => setEmpForm({ ...empForm, bank_name: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{tBilingual('Account Holder Name', 'হিসাবধারীর নাম')}</Label>
                        {empForm.name && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmpForm({ ...empForm, account_name: empForm.name })
                              triggerCopy('acc_name')
                            }}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {copiedField === 'acc_name' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                            Copy Name
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="e.g. Mohammad Rahim"
                        value={empForm.account_name}
                        onChange={(e) => setEmpForm({ ...empForm, account_name: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Account Number', 'অ্যাকাউন্ট নম্বর')}</Label>
                      <Input
                        placeholder="e.g. 115.120.45892"
                        value={empForm.account_number}
                        onChange={(e) => setEmpForm({ ...empForm, account_number: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Branch Name', 'শাখার নাম')}</Label>
                      <Input
                        placeholder="e.g. Motijheel Branch, Dhaka"
                        value={empForm.branch_name}
                        onChange={(e) => setEmpForm({ ...empForm, branch_name: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs font-medium">{tBilingual('Routing Number (9 Digits)', 'রাউটিং নম্বর (৯ ডিজিট)')}</Label>
                      <Input
                        placeholder="e.g. 090271234 (For BEFTN/NPSB)"
                        value={empForm.routing_number}
                        onChange={(e) => setEmpForm({ ...empForm, routing_number: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* MFS Wallet Section */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                      {tBilingual('Mobile Financial Services (bKash / Nagad / Rocket / Upay)', 'মোবাইল ফিনান্সিয়াল সার্ভিস (বিকাশ / নগদ / রকেট)')}
                    </h5>
                    <span className="text-[11px] text-slate-400">1-click wage payout</span>
                  </div>

                  {/* MFS Provider Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'bkash', label: 'bKash (বিকাশ)', color: 'border-pink-500/30 bg-pink-500/5 text-pink-700 dark:text-pink-400' },
                      { id: 'nagad', label: 'Nagad (নগদ)', color: 'border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-400' },
                      { id: 'rocket', label: 'Rocket (রকেট)', color: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-400' },
                      { id: 'other', label: 'Upay / Other (উপায়)', color: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEmpForm({ ...empForm, mfs_provider: p.id as any })}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${p.color} ${
                          empForm.mfs_provider === p.id ? 'ring-2 ring-blue-500 shadow-xs' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">{tBilingual('MFS Mobile Wallet Number', 'মোবাইল ওয়ালেট নম্বর')}</Label>
                        {empForm.mobile && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmpForm({ ...empForm, mfs_number: empForm.mobile })
                              triggerCopy('mfs_mobile')
                            }}
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {copiedField === 'mfs_mobile' ? <Check className="w-2.5 h-2.5 text-emerald-500" /> : <Copy className="w-2.5 h-2.5" />}
                            Same as Mobile
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder="017XXXXXXXX"
                        value={empForm.mfs_number}
                        onChange={(e) => setEmpForm({ ...empForm, mfs_number: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Account Type', 'অ্যাকাউন্টের ধরন')}</Label>
                      <select
                        value={empForm.mfs_account_type}
                        onChange={(e) => setEmpForm({ ...empForm, mfs_account_type: e.target.value as any })}
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="personal">{tBilingual('Personal (ব্যক্তিগত)', 'ব্যক্তিগত')}</option>
                        <option value="merchant">{tBilingual('Merchant (মার্চেন্ট)', 'মার্চেন্ট')}</option>
                        <option value="agent">{tBilingual('Agent (এজেন্ট)', 'এজেন্ট')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: EMERGENCY CONTACT & HR NOTES */}
            {modalTab === 'emergency' && (
              <div className="space-y-4 pt-1">
                {/* Emergency Contact */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {tBilingual('Emergency Kin / Contact Person Details', 'জরুরি যোগাযোগ ও আত্মীয়ের বিবরণ')}
                    </h5>
                    <span className="text-[11px] text-slate-400">Required for shop-floor safety protocol</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Contact Person Name', 'যোগাযোগের ব্যক্তির নাম')}</Label>
                      <Input
                        placeholder="e.g. Nasima Begum"
                        value={empForm.emergency_contact_name}
                        onChange={(e) => setEmpForm({ ...empForm, emergency_contact_name: e.target.value })}
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Relationship', 'সম্পর্ক')}</Label>
                      <select
                        value={empForm.emergency_contact_relation}
                        onChange={(e) => setEmpForm({ ...empForm, emergency_contact_relation: e.target.value })}
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="Spouse">{tBilingual('Spouse (স্ত্রী/স্বামী)', 'স্ত্রী/স্বামী')}</option>
                        <option value="Father">{tBilingual('Father (পিতা)', 'পিতা')}</option>
                        <option value="Mother">{tBilingual('Mother (মাতা)', 'মাতা')}</option>
                        <option value="Brother">{tBilingual('Brother (ভাই)', 'ভাই')}</option>
                        <option value="Sister">{tBilingual('Sister (বোন)', 'বোন')}</option>
                        <option value="Son/Daughter">{tBilingual('Son/Daughter (সন্তান)', 'সন্তান')}</option>
                        <option value="Guardian/Friend">{tBilingual('Guardian / Friend (অভিভাবক/বন্ধু)', 'অভিভাবক/বন্ধু')}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Emergency Phone', 'জরুরি ফোন নম্বর')}</Label>
                      <Input
                        placeholder="+88018XXXXXXXX"
                        value={empForm.emergency_contact_phone}
                        onChange={(e) => setEmpForm({ ...empForm, emergency_contact_phone: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Internal HR Notes & Qualifications */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Internal HR Remarks, Machine Skills & Shift Notes', 'অভ্যন্তরীণ মন্তব্য ও মেশিন দক্ষতা')}
                  </h5>
                  <textarea
                    rows={3}
                    placeholder="e.g. Proficient in Heidelberg 4-color press & Roland UV plotter. Blood group: B+, Night shift allowed."
                    value={empForm.notes}
                    onChange={(e) => setEmpForm({ ...empForm, notes: e.target.value })}
                    className="w-full text-xs p-2.5 rounded-md border border-input bg-background text-foreground resize-none"
                  />
                </div>
              </div>
            )}

            {/* Stepper Navigation Footer Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center gap-2">
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

                {modalTab !== 'personal' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const tabs: ('personal' | 'role' | 'salary' | 'banking' | 'emergency')[] = [
                        'personal',
                        'role',
                        'salary',
                        'banking',
                        'emergency',
                      ]
                      const currentIndex = tabs.indexOf(modalTab)
                      if (currentIndex > 0) setModalTab(tabs[currentIndex - 1])
                    }}
                    className="text-xs h-9 gap-1 text-slate-600 dark:text-slate-400"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {tBilingual('Previous', 'পূর্ববর্তী')}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {modalTab !== 'emergency' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (modalTab === 'personal' && (!empForm.name.trim() || !empForm.mobile.trim())) {
                        notify('Please enter employee name and mobile number.')
                        return
                      }
                      const tabs: ('personal' | 'role' | 'salary' | 'banking' | 'emergency')[] = [
                        'personal',
                        'role',
                        'salary',
                        'banking',
                        'emergency',
                      ]
                      const currentIndex = tabs.indexOf(modalTab)
                      if (currentIndex < tabs.length - 1) setModalTab(tabs[currentIndex + 1])
                    }}
                    className="text-xs h-9 gap-1 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    {tBilingual('Next Step', 'পরবর্তী ধাপ')}
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Button
                  size="sm"
                  onClick={() => handleSaveEmployee(isEditModalOpen)}
                  disabled={isPending}
                  className="text-xs h-9 bg-blue-600 hover:bg-blue-700 text-white gap-1.5 shadow-xs font-semibold px-4"
                >
                  {isPending ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  {isEditModalOpen
                    ? tBilingual('Update Employee Profile', 'প্রোফাইল আপডেট করুন')
                    : tBilingual('Save & Enroll Employee', 'কর্মী সংরক্ষণ করুন')}
                </Button>
              </div>
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
