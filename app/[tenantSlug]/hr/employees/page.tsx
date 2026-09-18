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
  Printer,
  QrCode,
  ExternalLink,
  Share2,
  CheckCheck,
  Wrench,
  GraduationCap,
  HeartPulse,
  Building2,
  Lock,
  Unlock,
  Key,
  KeyRound,
  Award,
  Target,
  ToggleLeft,
  ToggleRight,
  CheckSquare,
  Paperclip,
  Camera,
  Image as ImageIcon,
  ShieldAlert,
  CalendarDays,
  User,
  Layers,
  FileUp,
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
    title_bn: 'ফিনিশিং ও ডাই-কাট কারিগর',
    role: 'Finishing & Auto Die-Cut Operator',
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
    title: 'Pre-Press Graphic Designer',
    title_bn: 'প্রি-প্রেস গ্রাফিক ডিজাইনার',
    role: 'Commercial Pre-Press Graphic Designer',
    department: 'design',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 28000,
    hourly_rate: 135,
    overtime_hourly_rate: 200,
    daily_rate: 1000,
    icon: '🎨',
    color: 'border-purple-500/30 bg-purple-500/5 hover:border-purple-500/60 text-purple-600 dark:text-purple-400',
  },
  {
    title: 'CNC & Acrylic Fabricator',
    title_bn: 'সিএনসি ও এক্রিলিক সাইনেজ মিস্ত্রি',
    role: 'CNC Router & 3D Letter Fabricator',
    department: 'fabrication',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 25000,
    hourly_rate: 120,
    overtime_hourly_rate: 180,
    daily_rate: 850,
    icon: '⚡',
    color: 'border-orange-500/30 bg-orange-500/5 hover:border-orange-500/60 text-orange-600 dark:text-orange-400',
  },
  {
    title: 'Senior Corporate Sales Exec',
    title_bn: 'সিনিয়র কর্পোরেট সেলস এক্সিকিউটিভ',
    role: 'Senior Corporate Print Sales Executive',
    department: 'sales',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 30000,
    hourly_rate: 144,
    overtime_hourly_rate: 215,
    daily_rate: 1100,
    icon: '💼',
    color: 'border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/60 text-emerald-600 dark:text-emerald-400',
  },
  {
    title: 'Daily Laborer / Helper',
    title_bn: 'দৈনিক লেবার / হেল্পার',
    role: 'Shop-Floor General Helper',
    department: 'finishing',
    employee_type: 'daily_worker' as EmploymentType,
    salary_basis: 'daily_rate' as SalaryBasis,
    base_salary: 18000,
    hourly_rate: 80,
    overtime_hourly_rate: 120,
    daily_rate: 700,
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
  const [modalTab, setModalTab] = useState<'personal' | 'employment' | 'duty' | 'commission' | 'credentials'>('personal')
  const [drawerTab, setDrawerTab] = useState<'overview' | 'compensation' | 'duty' | 'commission' | 'payment' | 'idcard' | 'notes'>('overview')
  const [showAdvancedAllowances, setShowAdvancedAllowances] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const triggerCopy = (key: string) => {
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const calculateTenure = (joiningDateStr?: string) => {
    if (!joiningDateStr) return 'N/A'
    try {
      const start = new Date(joiningDateStr)
      const now = new Date()
      const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
      if (diffMonths < 1) return 'New Joiner (< 1 mo)'
      const years = Math.floor(diffMonths / 12)
      const months = diffMonths % 12
      if (years === 0) return `${months} ${months === 1 ? 'Month' : 'Months'}`
      if (months === 0) return `${years} ${years === 1 ? 'Year' : 'Years'}`
      return `${years} ${years === 1 ? 'Yr' : 'Yrs'} ${months} ${months === 1 ? 'Mo' : 'Mos'}`
    } catch {
      return 'N/A'
    }
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
    educational_qualification: 'Diploma in Printing Technology',
    profile_picture_url: '',
    role: 'Master Offset Machine Operator',
    department: 'printing',
    branch_id: '',
    joining_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    base_salary: 25000,
    daily_rate: 800,
    hourly_rate: 120,
    overtime_hourly_rate: 180,
    allowed_monthly_leaves: 2,
    payment_method: 'bank' as PaymentMethod,
    salary_structure: {
      basic: 15000,
      house_allowance: 5000,
      transport_allowance: 2500,
      medical_allowance: 2500,
      food_allowance: 0,
      other_allowances: 0,
    },
    // Duty, Attendance & Overtime Settings
    office_start_time: '09:00',
    office_end_time: '18:00',
    daily_duty_hours: 8,
    late_grace_minutes: 15,
    weekly_off_day: 'Friday',
    ot_calc_type: '1.5x_standard' as '1.5x_standard' | '2.0x_holiday' | 'fixed_rate' | 'none',
    overtime_rate_value: 180,
    absent_deduction_allowed: true,
    late_fine_enabled: true,
    late_fine_policy: '3_late_1_day_salary' as '3_late_1_day_salary' | 'fixed_amount' | 'warning_only',
    late_fine_amount: 100,
    // Commission & Target Settings
    enable_commission: false,
    commission_type: 'percentage' as 'percentage' | 'fixed_unit',
    commission_rate: 2.5,
    monthly_target: 150000,
    commission_notes: '',
    // Emergency Contact Details
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relation: 'Spouse',
    // Banking & Mobile Wallets
    bank_name: '',
    account_name: '',
    account_number: '',
    branch_name: '',
    routing_number: '',
    mfs_provider: 'bkash' as 'bkash' | 'nagad' | 'rocket' | 'other',
    mfs_account_type: 'personal' as 'personal' | 'merchant' | 'agent',
    mfs_number: '',
    // Login Account Credentials
    create_portal_login: false,
    login_username: '',
    login_password: '',
    login_role: 'operator',
    // Documents
    document_attachments: [
      { id: 'doc-1', name: 'NID_Card_Scan_Front.pdf', type: 'NID Front', size: '1.2 MB' },
      { id: 'doc-2', name: 'Appointment_Letter_Signed.pdf', type: 'Appointment Letter', size: '850 KB' },
    ] as Array<{ id: string; name: string; type: string; size?: string; url?: string }>,
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
    setShowPassword(false)
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
      educational_qualification: emp.educational_qualification || 'Diploma in Printing Technology',
      profile_picture_url: emp.profile_picture_url || '',
      role: emp.role || 'Staff',
      department: emp.department || 'printing',
      branch_id: emp.branch_id || '',
      joining_date: emp.joining_date || new Date().toISOString().split('T')[0],
      contract_end_date: emp.contract_end_date || '',
      employee_type: emp.employee_type || 'permanent',
      salary_basis: emp.salary_basis || 'monthly',
      base_salary: baseSalary,
      daily_rate: Number(emp.daily_rate || 0),
      hourly_rate: Number(emp.hourly_rate || (baseSalary > 0 ? Math.round(baseSalary / 208) : 0)),
      overtime_hourly_rate: Number(
        emp.overtime_hourly_rate || (baseSalary > 0 ? Math.round((baseSalary / 208) * 1.5) : 0)
      ),
      allowed_monthly_leaves: emp.allowed_monthly_leaves !== undefined && emp.allowed_monthly_leaves !== null ? emp.allowed_monthly_leaves : 2,
      payment_method: (emp.payment_method as any) || (emp.bank_payment_info?.account_number ? 'bank' : emp.mfs_payment_info?.wallet_number ? (emp.mfs_payment_info?.provider || 'bkash') : 'cash'),
      salary_structure: emp.salary_structure || {
        basic: Math.round(baseSalary * 0.6),
        house_allowance: Math.round(baseSalary * 0.2),
        transport_allowance: Math.round(baseSalary * 0.1),
        medical_allowance: Math.round(baseSalary * 0.1),
        food_allowance: 0,
        other_allowances: 0,
      },
      office_start_time: emp.duty_settings?.office_start_time || '09:00',
      office_end_time: emp.duty_settings?.office_end_time || '18:00',
      daily_duty_hours: emp.duty_settings?.daily_duty_hours || 8,
      late_grace_minutes: emp.duty_settings?.late_grace_minutes || 15,
      weekly_off_day: emp.duty_settings?.weekly_off_day || 'Friday',
      ot_calc_type: (emp.duty_settings?.ot_calc_type as any) || '1.5x_standard',
      overtime_rate_value: emp.duty_settings?.overtime_rate_value || emp.overtime_hourly_rate || 180,
      absent_deduction_allowed: emp.duty_settings?.absent_deduction_allowed !== undefined ? emp.duty_settings.absent_deduction_allowed : true,
      late_fine_enabled: emp.duty_settings?.late_fine_enabled !== undefined ? emp.duty_settings.late_fine_enabled : true,
      late_fine_policy: (emp.duty_settings?.late_fine_policy as any) || '3_late_1_day_salary',
      late_fine_amount: emp.duty_settings?.late_fine_amount || 100,
      enable_commission: emp.commission_settings?.enabled || false,
      commission_type: (emp.commission_settings?.type as any) || 'percentage',
      commission_rate: emp.commission_settings?.rate_pct || 2.5,
      monthly_target: emp.commission_settings?.monthly_target || 150000,
      commission_notes: emp.commission_settings?.notes || '',
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
      create_portal_login: emp.portal_credentials?.create_login || false,
      login_username: emp.portal_credentials?.username || emp.email || emp.mobile || '',
      login_password: emp.portal_credentials?.password || '',
      login_role: emp.portal_credentials?.role || 'operator',
      document_attachments: (emp.document_attachments as any) || [
        { id: 'doc-1', name: 'NID_Card_Scan_Front.pdf', type: 'NID Front', size: '1.2 MB' },
        { id: 'doc-2', name: 'Appointment_Letter_Signed.pdf', type: 'Appointment Letter', size: '850 KB' },
      ],
      status: emp.status || 'active',
      notes: notesClean,
    })
    setModalTab('personal')
    setShowAdvancedAllowances(false)
    setShowPassword(false)
    setIsEditModalOpen(true)
  }

  const handleOpen360 = (emp: EmployeeRecord) => {
    setSelectedEmployee(emp)
    setDrawerTab('overview')
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
      overtime_rate_value: otRate,
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
      overtime_rate_value: otRate,
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

      const payload: Partial<EmployeeRecord> & { name: string } = {
        name: empForm.name.trim(),
        name_bn: empForm.name_bn?.trim() || null,
        mobile: empForm.mobile.trim(),
        phone: empForm.phone?.trim() || null,
        email: empForm.email?.trim() || null,
        address: empForm.address?.trim() || null,
        educational_qualification: empForm.educational_qualification || null,
        profile_picture_url: empForm.profile_picture_url?.trim() || null,
        role: empForm.role.trim() || 'Staff',
        designation: empForm.role.trim() || 'Staff',
        department: empForm.department,
        branch_id: empForm.branch_id || null,
        employee_type: empForm.employee_type,
        salary_basis: empForm.salary_basis,
        joining_date: empForm.joining_date || new Date().toISOString().split('T')[0],
        contract_end_date: empForm.contract_end_date?.trim() || null,
        allowed_monthly_leaves: Number(empForm.allowed_monthly_leaves || 0),
        payment_method: empForm.payment_method,
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
        duty_settings: {
          office_start_time: empForm.office_start_time,
          office_end_time: empForm.office_end_time,
          daily_duty_hours: Number(empForm.daily_duty_hours || 8),
          late_grace_minutes: Number(empForm.late_grace_minutes || 15),
          weekly_off_day: empForm.weekly_off_day,
          ot_calc_type: empForm.ot_calc_type,
          overtime_rate_value: Number(empForm.overtime_rate_value || empForm.overtime_hourly_rate || 0),
          absent_deduction_allowed: empForm.absent_deduction_allowed,
          late_fine_enabled: empForm.late_fine_enabled,
          late_fine_policy: empForm.late_fine_policy,
          late_fine_amount: Number(empForm.late_fine_amount || 0),
        },
        commission_settings: {
          enabled: empForm.enable_commission,
          type: empForm.commission_type,
          rate_pct: Number(empForm.commission_rate || 0),
          monthly_target: Number(empForm.monthly_target || 0),
          notes: empForm.commission_notes?.trim() || undefined,
        },
        portal_credentials: {
          create_login: empForm.create_portal_login,
          username: empForm.login_username?.trim() || empForm.email?.trim() || empForm.mobile?.trim(),
          email: empForm.email?.trim() || undefined,
          password: empForm.login_password || undefined,
          role: empForm.login_role,
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
        document_attachments: empForm.document_attachments,
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
                { id: 'personal', num: 1, title: 'Basic Info & Education', title_bn: 'ব্যক্তিগত ও শিক্ষা', icon: UserCheck },
                { id: 'employment', num: 2, title: 'Employment & Salary', title_bn: 'কর্মসংস্থান ও বেতন', icon: Briefcase },
                { id: 'duty', num: 3, title: 'Duty, Attendance & OT', title_bn: 'ডিউটি ও ওভারটাইম', icon: Clock },
                { id: 'commission', num: 4, title: 'Commission & Target', title_bn: 'কমিশন ও টার্গেট', icon: Percent },
                { id: 'credentials', num: 5, title: 'Emergency, Login & Docs', title_bn: 'জরুরি, লগইন ও ফাইল', icon: ShieldCheck },
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

            {/* TAB 1: BASIC INFO & EDUCATION */}
            {modalTab === 'personal' && (
              <div className="space-y-4 pt-1">
                {/* Profile Avatar & Preview Banner */}
                <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="relative group">
                      {empForm.profile_picture_url ? (
                        <img
                          src={empForm.profile_picture_url}
                          alt={empForm.name}
                          className="w-12 h-12 rounded-full object-cover ring-2 ring-blue-500/30 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs ring-2 ring-blue-500/30">
                          {empForm.name ? empForm.name.slice(0, 2).toUpperCase() : 'EMP'}
                        </div>
                      )}
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
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white dark:bg-slate-900 text-xs px-2.5 py-1 text-slate-700 dark:text-slate-300">
                      {tBilingual('Step 1 of 5', 'ধাপ ১ / ৫')}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Employee Name *', 'কর্মীর নাম (English) *')}
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
                      {tBilingual('Name in Bengali', 'কর্মীর নাম (বাংলা)')}
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
                      {tBilingual('Mobile Number *', 'মোবাইল নম্বর *')}
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
                      {tBilingual('Educational Qualification', 'শিক্ষাগত যোগ্যতা')}
                    </Label>
                    <div className="relative">
                      <GraduationCap className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <select
                        value={empForm.educational_qualification}
                        onChange={(e) => setEmpForm({ ...empForm, educational_qualification: e.target.value })}
                        className="w-full h-9 text-xs pl-9 pr-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="Diploma in Printing Technology">{tBilingual('Diploma in Printing Technology (ডিপ্লোমা ইন প্রিন্টিং টেকনোলজি)', 'ডিপ্লোমা ইন প্রিন্টিং টেকনোলজি')}</option>
                        <option value="Graduate / B.Sc / BBA / BA">{tBilingual('Graduate / B.Sc / BBA / BA (স্নাতক / ডিগ্রি)', 'স্নাতক / ডিগ্রি')}</option>
                        <option value="Higher Secondary (HSC / Alim)">{tBilingual('Higher Secondary (HSC / আলিম)', 'উচ্চ মাধ্যমিক (এইচএসসি/আলিম)')}</option>
                        <option value="Secondary School (SSC / Dakhil)">{tBilingual('Secondary School (SSC / দাখিল)', 'মাধ্যমিক (এসএসসি/দাখিল)')}</option>
                        <option value="Vocational / Technical Certificate">{tBilingual('Vocational / Technical Certificate (কারিগরি ও ভোকেশনাল)', 'কারিগরি ও ভোকেশনাল')}</option>
                        <option value="Junior School / Primary">{tBilingual('Junior School / Primary (অষ্টম শ্রেণি / প্রাথমিক)', 'অষ্টম শ্রেণি / প্রাথমিক')}</option>
                        <option value="Self-Taught / Experienced Operator">{tBilingual('Self-Taught / Experienced Operator (স্বশিক্ষিত / অভিজ্ঞ কারিগর)', 'স্বশিক্ষিত / অভিজ্ঞ কারিগর')}</option>
                        <option value="Other Qualification">{tBilingual('Other Qualification (অন্যান্য)', 'অন্যান্য')}</option>
                      </select>
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
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Present Address', 'বর্তমান ঠিকানা')}
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

            {/* TAB 2: EMPLOYMENT & SALARY */}
            {modalTab === 'employment' && (
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

                {/* Primary Employment Attributes */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Warehouse (Branch) *', 'কারখানা / শাখা *')}
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

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Designation', 'পদবি / দায়িত্ব *')}
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
                      {tBilingual('Joining Date *', 'যোগদানের তারিখ *')}
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
                      {tBilingual('End Date (Contract)', 'চুক্তির মেয়াদ শেষ')}
                    </Label>
                    <div className="relative">
                      <CalendarDays className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="date"
                        value={empForm.contract_end_date}
                        onChange={(e) => setEmpForm({ ...empForm, contract_end_date: e.target.value })}
                        className="text-xs h-9 pl-9"
                      />
                    </div>
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
                </div>

                {/* Salary Numbers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
                  <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{tBilingual('Monthly Basic Salary (৳)', 'মূল মাসিক বেতন (৳)')}</span>
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

                  <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{tBilingual('Allowed Monthly Paid Leaves', 'মাসিক ছুটি অনুমোদন')}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">Days / mo</span>
                    </Label>
                    <Input
                      type="number"
                      value={empForm.allowed_monthly_leaves}
                      onChange={(e) => setEmpForm({ ...empForm, allowed_monthly_leaves: Number(e.target.value || 0) })}
                      className="text-sm h-9 font-bold font-mono text-emerald-600 dark:text-emerald-400"
                    />
                    <p className="text-[10px] text-slate-400">
                      {tBilingual('Paid leaves quota (default 2 days/mo)', 'বেতনসহ অনুমোদিত ছুটি')}
                    </p>
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

                {/* Payment Method & Bank / Mobile Wallet Number */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Payment Method & Bank / Mobile Wallet Number', 'বেতন প্রদানের মাধ্যম ও অ্যাকাউন্ট নম্বর')}
                    </h5>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono">
                      {empForm.payment_method}
                    </Badge>
                  </div>

                  {/* Payment Method Selector Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { id: 'bank', label: 'Bank Transfer (ব্যাংক)', icon: Landmark, color: 'text-blue-600' },
                      { id: 'bkash', label: 'bKash (বিকাশ)', icon: Smartphone, color: 'text-pink-600' },
                      { id: 'nagad', label: 'Nagad (নগদ)', icon: Smartphone, color: 'text-orange-600' },
                      { id: 'rocket', label: 'Rocket (রকেট)', icon: Smartphone, color: 'text-purple-600' },
                      { id: 'cash', label: 'Cash (নগদ টাকা)', icon: Wallet, color: 'text-emerald-600' },
                    ].map((pm) => {
                      const Icon = pm.icon
                      const isSelected = empForm.payment_method === pm.id
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => {
                            setEmpForm({
                              ...empForm,
                              payment_method: pm.id as PaymentMethod,
                              mfs_provider: (pm.id === 'nagad' || pm.id === 'rocket' ? pm.id : 'bkash') as any,
                            })
                          }}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-500 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-500'
                              : 'bg-card border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${pm.color}`} />
                          <span className="text-[11px] font-medium">{pm.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* If Bank Selected */}
                  {empForm.payment_method === 'bank' && (
                    <div className="space-y-3 pt-2">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          <Label className="text-xs font-medium">{tBilingual('Account Holder Name', 'হিসাবধারীর নাম')}</Label>
                          <Input
                            placeholder="e.g. Mohammad Rahim"
                            value={empForm.account_name}
                            onChange={(e) => setEmpForm({ ...empForm, account_name: e.target.value })}
                            className="text-xs h-9"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-medium">{tBilingual('Bank Account Number *', 'অ্যাকাউন্ট নম্বর *')}</Label>
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
                      </div>
                    </div>
                  )}

                  {/* If MFS Selected */}
                  {(empForm.payment_method === 'bkash' || empForm.payment_method === 'nagad' || empForm.payment_method === 'rocket' || empForm.payment_method === 'other') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-medium">{tBilingual('Mobile Wallet Number *', 'মোবাইল ওয়ালেট নম্বর *')}</Label>
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
                  )}

                  {/* If Cash Selected */}
                  {empForm.payment_method === 'cash' && (
                    <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300">
                      {tBilingual('Cash disbursement mode selected. Salary vouchers will be printed for direct floor disbursement.', 'নগদ বেতন পরিশোধ সিলেক্ট করা হয়েছে। পেরোলের পর ক্যাশ ভাউচার প্রিন্ট করা যাবে।')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: DUTY, ATTENDANCE & OVERTIME SETTINGS */}
            {modalTab === 'duty' && (
              <div className="space-y-4 pt-1">
                {/* Working Shift Timing Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Office Timing & Daily Duty Hours', 'অফিস সময়সূচি ও দৈনিক কাজের ঘণ্টা')}
                    </h5>
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 font-mono">
                      {empForm.daily_duty_hours} Hours Shift
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Office Start Time *', 'অফিস শুরুর সময় *')}
                      </Label>
                      <Input
                        type="time"
                        value={empForm.office_start_time}
                        onChange={(e) => setEmpForm({ ...empForm, office_start_time: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Office End Time *', 'অফিস শেষ সময় *')}
                      </Label>
                      <Input
                        type="time"
                        value={empForm.office_end_time}
                        onChange={(e) => setEmpForm({ ...empForm, office_end_time: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Daily Duty Hours *', 'দৈনিক ডিউটি ঘণ্টা *')}
                      </Label>
                      <Input
                        type="number"
                        step="0.5"
                        value={empForm.daily_duty_hours}
                        onChange={(e) => setEmpForm({ ...empForm, daily_duty_hours: Number(e.target.value || 8) })}
                        className="text-xs h-9 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Late Grace (Mins) *', 'গ্রেস টাইম (মিনিট) *')}
                      </Label>
                      <Input
                        type="number"
                        value={empForm.late_grace_minutes}
                        onChange={(e) => setEmpForm({ ...empForm, late_grace_minutes: Number(e.target.value || 0) })}
                        className="text-xs h-9 font-mono font-bold text-amber-600 dark:text-amber-400"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Weekly Off Day *', 'সাপ্তাহিক ছুটির দিন *')}
                      </Label>
                      <select
                        value={empForm.weekly_off_day}
                        onChange={(e) => setEmpForm({ ...empForm, weekly_off_day: e.target.value })}
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="Friday">{tBilingual('Friday (শুক্রবার)', 'শুক্রবার')}</option>
                        <option value="Saturday">{tBilingual('Saturday (শনিবার)', 'শনিবার')}</option>
                        <option value="Sunday">{tBilingual('Sunday (রবিবার)', 'রবিবার')}</option>
                        <option value="Thursday">{tBilingual('Thursday (বৃহস্পতিবার)', 'বৃহস্পতিবার')}</option>
                        <option value="None">{tBilingual('No Fixed Off Day (রোস্টার ভিত্তিক)', 'রোস্টার ভিত্তিক')}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Absent Deduction Allowed? *', 'অনুপস্থিতিতে বেতন কর্তন? *')}
                      </Label>
                      <select
                        value={empForm.absent_deduction_allowed ? 'yes' : 'no'}
                        onChange={(e) => setEmpForm({ ...empForm, absent_deduction_allowed: e.target.value === 'yes' })}
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="yes">{tBilingual('Yes - Deduct Daily Salary for Unapproved Absence', 'হ্যাঁ - অননুমোদিত অনুপস্থিতিতে বেতন কর্তন হবে')}</option>
                        <option value="no">{tBilingual('No - Do Not Deduct Automatically', 'না - স্বয়ংক্রিয় কর্তন হবে না')}</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Overtime & Calculation Policy Card */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                    <h5 className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {tBilingual('Overtime Calculation Policy', 'ওভারটাইম হিসাব পদ্ধতি ও রেট')}
                    </h5>
                    <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300 font-mono">
                      ৳ {empForm.overtime_rate_value || empForm.overtime_hourly_rate} / hr
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Overtime Calculation Type *', 'ওভারটাইম রেট ফর্মুলা *')}
                      </Label>
                      <select
                        value={empForm.ot_calc_type}
                        onChange={(e) => {
                          const type = e.target.value as any
                          const hr = empForm.hourly_rate || Math.round((empForm.base_salary || 0) / 208)
                          let rate = empForm.overtime_hourly_rate
                          if (type === '1.5x_standard') rate = Math.round(hr * 1.5)
                          else if (type === '2.0x_holiday') rate = Math.round(hr * 2.0)
                          else if (type === 'none') rate = 0
                          setEmpForm({
                            ...empForm,
                            ot_calc_type: type,
                            overtime_rate_value: rate,
                            overtime_hourly_rate: rate,
                          })
                        }}
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="1.5x_standard">{tBilingual('1.5x Standard Regular Day (সাধারণ দিন ১.৫ গুণ রেট)', 'সাধারণ দিন ১.৫ গুণ রেট')}</option>
                        <option value="2.0x_holiday">{tBilingual('2.0x Festival Holiday / Night Shift (ছুটির দিন ২.০ গুণ)', 'ছুটির দিন ২.০ গুণ')}</option>
                        <option value="fixed_rate">{tBilingual('Fixed Custom Hourly Rate (নির্দিষ্ট ঘণ্টা রেট)', 'নির্দিষ্ট ঘণ্টা রেট')}</option>
                        <option value="none">{tBilingual('No Overtime Allowed (ওভারটাইম প্রযোজ্য নয়)', 'ওভারটাইম প্রযোজ্য নয়')}</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Overtime Rate / Value (৳/Hour)', 'ওভারটাইম রেট (টাকা/ঘণ্টা)')}
                      </Label>
                      <Input
                        type="number"
                        value={empForm.overtime_rate_value || empForm.overtime_hourly_rate}
                        onChange={(e) => {
                          const r = Number(e.target.value || 0)
                          setEmpForm({ ...empForm, overtime_rate_value: r, overtime_hourly_rate: r })
                        }}
                        disabled={empForm.ot_calc_type === 'none'}
                        className="text-xs h-9 font-mono font-bold text-amber-600 dark:text-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Late Fine & Salary Deduction Policy Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      {tBilingual('Late Fine & Salary Deduction Policy', 'দেরি জরিমানা ও বেতন কর্তন নীতি')}
                    </h5>
                    <button
                      type="button"
                      onClick={() => setEmpForm({ ...empForm, late_fine_enabled: !empForm.late_fine_enabled })}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400"
                    >
                      {empForm.late_fine_enabled ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ToggleRight className="w-5 h-5" /> Enabled
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <ToggleLeft className="w-5 h-5" /> Disabled
                        </span>
                      )}
                    </button>
                  </div>

                  {empForm.late_fine_enabled ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Late Deduction Rule *', 'দেরির কর্তন নিয়ম *')}
                        </Label>
                        <select
                          value={empForm.late_fine_policy}
                          onChange={(e) => setEmpForm({ ...empForm, late_fine_policy: e.target.value as any })}
                          className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                        >
                          <option value="3_late_1_day_salary">{tBilingual('3 Late Days = 1 Day Basic Salary Deduction (প্রতি ৩ দিন দেরিতে ১ দিনের বেতন কর্তন)', 'প্রতি ৩ দিন দেরিতে ১ দিনের বেতন কর্তন')}</option>
                          <option value="fixed_amount">{tBilingual('Fixed Fine Amount per Late Day (প্রতি দেরিতে নির্দিষ্ট টাকা জরিমানা)', 'প্রতি দেরিতে নির্দিষ্ট টাকা জরিমানা')}</option>
                          <option value="warning_only">{tBilingual('Warning Letter & Grace Period Only (সতর্কবার্তা শুধুমাত্র)', 'সতর্কবার্তা শুধুমাত্র')}</option>
                        </select>
                      </div>

                      {empForm.late_fine_policy === 'fixed_amount' && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Fine Amount per Late (৳)', 'দেরি জরিমানা ফি (টাকা)')}
                          </Label>
                          <Input
                            type="number"
                            value={empForm.late_fine_amount}
                            onChange={(e) => setEmpForm({ ...empForm, late_fine_amount: Number(e.target.value || 0) })}
                            className="text-xs h-9 font-mono font-bold text-rose-600"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {tBilingual('Late fine deduction is currently disabled for this employee.', 'এই কর্মীর জন্য দেরি জরিমানা নিষ্ক্রিয় রয়েছে।')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: COMMISSION & TARGET SETTINGS */}
            {modalTab === 'commission' && (
              <div className="space-y-4 pt-1">
                {/* Commission Enable Card */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 rounded-lg">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {tBilingual('Commission & Target Settings', 'কমিশন ও মাসিক টার্গেট')}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          {tBilingual('Enable sales incentives or production unit commissions', 'সেলস ও প্রোডাকশন অর্ডারের উপর কমিশন সুবিধা')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEmpForm({ ...empForm, enable_commission: !empForm.enable_commission })}
                      className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400"
                    >
                      {empForm.enable_commission ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ToggleRight className="w-6 h-6" />
                          {tBilingual('Commission Enabled', 'কমিশন সক্রিয়')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <ToggleLeft className="w-6 h-6" />
                          {tBilingual('Enable Commission?', 'কমিশন চালু করুন?')}
                        </span>
                      )}
                    </button>
                  </div>

                  {empForm.enable_commission ? (
                    <div className="space-y-3 pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Commission Calculation Type', 'কমিশন পদ্ধতি')}
                          </Label>
                          <select
                            value={empForm.commission_type}
                            onChange={(e) => setEmpForm({ ...empForm, commission_type: e.target.value as any })}
                            className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                          >
                            <option value="percentage">{tBilingual('Percentage on Sales Volume (%)', 'বিক্রয়ের উপর শতকরা (%)')}</option>
                            <option value="fixed_unit">{tBilingual('Fixed per Unit / Sq.Ft (৳)', 'প্রতি পণ্যে নির্দিষ্ট টাকা (৳)')}</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {empForm.commission_type === 'percentage'
                              ? tBilingual('Commission Rate (%)', 'কমিশনের হার (%)')
                              : tBilingual('Commission Value (৳)', 'কমিশন রেট (৳)')}
                          </Label>
                          <Input
                            type="number"
                            step="0.1"
                            value={empForm.commission_rate}
                            onChange={(e) => setEmpForm({ ...empForm, commission_rate: Number(e.target.value || 0) })}
                            className="text-xs h-9 font-mono font-bold text-indigo-600 dark:text-indigo-400"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Monthly Sales Target (৳)', 'মাসিক সেলস টার্গেট (৳)')}
                          </Label>
                          <Input
                            type="number"
                            value={empForm.monthly_target}
                            onChange={(e) => setEmpForm({ ...empForm, monthly_target: Number(e.target.value || 0) })}
                            className="text-xs h-9 font-mono font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Commission Policy Notes', 'কমিশন নীতিমালা ও শর্ত')}
                        </Label>
                        <Input
                          placeholder="e.g. 2.5% commission on commercial print orders after reaching ৳ 1,50,000 monthly target."
                          value={empForm.commission_notes}
                          onChange={(e) => setEmpForm({ ...empForm, commission_notes: e.target.value })}
                          className="text-xs h-9"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 text-xs text-slate-500 italic">
                      {tBilingual('Commission module is disabled for this profile. Toggle switch to configure sales target and incentives.', 'এই কর্মীর জন্য কোন কমিশন নির্ধারিত নেই।')}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: EMERGENCY CONTACT, LOGIN CREDENTIALS & DOCUMENTS */}
            {modalTab === 'credentials' && (
              <div className="space-y-4 pt-1">
                {/* Emergency Contact Details */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {tBilingual('Emergency Contact Details', 'জরুরি যোগাযোগ ও আত্মীয়ের বিবরণ')}
                    </h5>
                    <span className="text-[11px] text-slate-400">Required for shop-floor safety</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Emergency Contact Person Name', 'যোগাযোগের ব্যক্তির নাম')}</Label>
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
                      <Label className="text-xs font-medium">{tBilingual('Emergency Phone Number', 'জরুরি মোবাইল নম্বর')}</Label>
                      <Input
                        placeholder="+88018XXXXXXXX"
                        value={empForm.emergency_contact_phone}
                        onChange={(e) => setEmpForm({ ...empForm, emergency_contact_phone: e.target.value })}
                        className="text-xs h-9 font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Login Account Credentials */}
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-blue-600" />
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {tBilingual('Login Account Credentials', 'পোর্টাল লগইন অ্যাকাউন্ট')}
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          {tBilingual('Grant employee access to ERP operator terminal or mobile app', 'ইআরপিতে প্রবেশের ইউজার আইডি ও পাসওয়ার্ড')}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setEmpForm({ ...empForm, create_portal_login: !empForm.create_portal_login })}
                      className="flex items-center gap-1 text-xs font-bold text-blue-600 dark:text-blue-400"
                    >
                      {empForm.create_portal_login ? (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                          <ToggleRight className="w-6 h-6" />
                          {tBilingual('Create Portal Login? (Yes)', 'লগইন সক্রিয়')}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-slate-400">
                          <ToggleLeft className="w-6 h-6" />
                          {tBilingual('Create Portal Login? *', 'লগইন তৈরি করবেন?')}
                        </span>
                      )}
                    </button>
                  </div>

                  {empForm.create_portal_login ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Login Email / Username *', 'ইউজারনেম / ইমেইল *')}
                          </Label>
                          {empForm.email && (
                            <button
                              type="button"
                              onClick={() => setEmpForm({ ...empForm, login_username: empForm.email })}
                              className="text-[10px] text-blue-600 hover:underline"
                            >
                              Use Email
                            </button>
                          )}
                        </div>
                        <Input
                          placeholder="rahim@visionprint.com"
                          value={empForm.login_username || empForm.email || empForm.mobile}
                          onChange={(e) => setEmpForm({ ...empForm, login_username: e.target.value })}
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Secure Login Password *', 'লগইন পাসওয়ার্ড *')}
                          </Label>
                          <span className="text-[10px] text-slate-400">Minimum 6 characters</span>
                        </div>
                        <div className="relative">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={empForm.login_password}
                            onChange={(e) => setEmpForm({ ...empForm, login_password: e.target.value })}
                            className="text-xs h-9 pr-8 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                          >
                            {showPassword ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Assigned Portal Role', 'সিস্টেম রোল')}
                        </Label>
                        <select
                          value={empForm.login_role}
                          onChange={(e) => setEmpForm({ ...empForm, login_role: e.target.value })}
                          className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                        >
                          <option value="operator">{tBilingual('Machine Operator (মেশিন অপারেটর)', 'মেশিন অপারেটর')}</option>
                          <option value="designer">{tBilingual('Graphic Designer (ডিজাইনার)', 'গ্রাফিক ডিজাইনার')}</option>
                          <option value="sales">{tBilingual('Sales Executive (সেলস এক্সিকিউটিভ)', 'সেলস')}</option>
                          <option value="supervisor">{tBilingual('Floor Supervisor (ফ্লোর সুপারভাইজার)', 'সুপারভাইজার')}</option>
                          <option value="staff">{tBilingual('General Staff (সাধারণ কর্মী)', 'স্টাফ')}</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      {tBilingual('Portal login creation is optional. Toggle above to issue credentials.', 'লগইন অ্যাকাউন্ট তৈরির প্রয়োজন না থাকলে বন্ধ রাখতে পারেন।')}
                    </p>
                  )}
                </div>

                {/* Media & Identity Documents */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Media & Identity Documents', 'ছবি ও পরিচয়পত্র স্ক্যান')}
                    </h5>
                    <Badge variant="outline" className="text-[10px]">
                      {empForm.document_attachments?.length || 0} Files Attached
                    </Badge>
                  </div>

                  {/* Profile Picture URL / Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('Profile Picture (Image URL / File)', 'প্রোফাইল ছবি')}</Label>
                      <div className="relative">
                        <Camera className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                        <Input
                          placeholder="https://... or photo.jpg"
                          value={empForm.profile_picture_url}
                          onChange={(e) => setEmpForm({ ...empForm, profile_picture_url: e.target.value })}
                          className="text-xs h-9 pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium">{tBilingual('NID / Document Scan (Multiple)', 'এনআইডি ও সনদপত্র স্ক্যান')}</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newDoc = {
                              id: `doc-${Date.now()}`,
                              name: `Scanned_Document_${empForm.document_attachments.length + 1}.pdf`,
                              type: 'NID / Certificate',
                              size: '1.5 MB',
                            }
                            setEmpForm({
                              ...empForm,
                              document_attachments: [...empForm.document_attachments, newDoc],
                            })
                            notify('Attached document scan.')
                          }}
                          className="text-xs h-9 gap-1.5 flex-1 border-dashed border-slate-300 dark:border-slate-700"
                        >
                          <FileUp className="w-3.5 h-3.5 text-blue-600" />
                          <span>{tBilingual('Attach New Document Scan', 'নতুন ডকুমেন্ট যোগ করুন')}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Attached Documents List */}
                  {empForm.document_attachments && empForm.document_attachments.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {empForm.document_attachments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                            <div className="truncate">
                              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{doc.name}</span>
                              <span className="text-[10px] text-slate-400">{doc.type} • {doc.size || '1 MB'}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEmpForm({
                                ...empForm,
                                document_attachments: empForm.document_attachments.filter((d) => d.id !== doc.id),
                              })
                            }}
                            className="text-slate-400 hover:text-rose-600 p-1"
                            title="Remove file"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
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
                      const tabs: ('personal' | 'employment' | 'duty' | 'commission' | 'credentials')[] = [
                        'personal',
                        'employment',
                        'duty',
                        'commission',
                        'credentials',
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
                {modalTab !== 'credentials' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (modalTab === 'personal' && (!empForm.name.trim() || !empForm.mobile.trim())) {
                        notify('Please enter employee name and mobile number.')
                        return
                      }
                      const tabs: ('personal' | 'employment' | 'duty' | 'commission' | 'credentials')[] = [
                        'personal',
                        'employment',
                        'duty',
                        'commission',
                        'credentials',
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
          title={
            <div className="flex items-center justify-between w-full pr-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm ring-1 ring-blue-500/20">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.name}
                    </span>
                    {selectedEmployee.name_bn && (
                      <span className="text-xs text-slate-500 font-normal font-bengali">
                        ({selectedEmployee.name_bn})
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-normal">
                    {tBilingual('Employee 360° Workforce Dossier & Service Record', 'কর্মীর পূর্ণাঙ্গ প্রোফাইল ও সার্ভিস রেকর্ড')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="font-mono text-[11px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                >
                  {selectedEmployee.employee_id_number}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[11px] px-2.5 py-0.5 capitalize font-semibold ${
                    selectedEmployee.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : selectedEmployee.status === 'on_leave'
                      ? 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-950/50 dark:text-amber-300'
                      : 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {selectedEmployee.status}
                </Badge>
              </div>
            </div>
          }
          size="5xl"
        >
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            {/* Hero Profile Banner */}
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-indigo-500/5 to-slate-50 dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md ring-2 ring-blue-500/30 shrink-0">
                  {selectedEmployee.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.name}
                    </h3>
                    <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 text-xs px-2 py-0.5 capitalize text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                      {selectedEmployee.role}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                    <span className="flex items-center gap-1 capitalize font-medium text-slate-700 dark:text-slate-300">
                      <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                      {selectedEmployee.department} Dept
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {branches.find((b) => b.id === selectedEmployee.branch_id)?.name || 'Main Factory / Head Office'}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(selectedEmployee.joining_date)} ({calculateTenure(selectedEmployee.joining_date)})
                    </span>
                  </div>
                </div>
              </div>

              {/* Header Quick Actions */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {selectedEmployee.mobile && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-white dark:bg-slate-900"
                    asChild
                  >
                    <a href={`tel:${selectedEmployee.mobile}`}>
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{tBilingual('Call', 'কল')}</span>
                    </a>
                  </Button>
                )}

                {selectedEmployee.email && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 bg-white dark:bg-slate-900"
                    asChild
                  >
                    <a href={`mailto:${selectedEmployee.email}`}>
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span>{tBilingual('Email', 'ইমেইল')}</span>
                    </a>
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  onClick={() => {
                    setIs360DrawerOpen(false)
                    handleOpenEdit(selectedEmployee)
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>{tBilingual('Edit Profile', 'সম্পাদনা')}</span>
                </Button>
              </div>
            </div>

            {/* 4 KPI Metric Highlights Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-[11px] text-slate-500 uppercase font-medium block">
                  {tBilingual('Base Pay / Rate', 'মূল বেতন')}
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {selectedEmployee.salary_basis === 'daily_rate'
                    ? `${formatBDT(selectedEmployee.daily_rate || 0)} / day`
                    : selectedEmployee.salary_basis === 'hourly_rate'
                    ? `${formatBDT(selectedEmployee.hourly_rate || 0)} / hr`
                    : `${formatBDT(selectedEmployee.base_salary || 0)} / mo`}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {selectedEmployee.salary_basis === 'daily_rate'
                    ? `~${formatBDT((selectedEmployee.daily_rate || 0) * 26)} est. monthly`
                    : `Gross Annual: ${formatBDT((selectedEmployee.base_salary || 0) * 12)}`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-[11px] text-slate-500 uppercase font-medium block">
                  {tBilingual('Hourly Regular Rate', 'ঘণ্টাপ্রতি সাধারণ রেট')}
                </span>
                <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                  {formatBDT(selectedEmployee.hourly_rate || (selectedEmployee.base_salary ? Math.round(selectedEmployee.base_salary / 208) : 0))} / hr
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  208 standard monthly work hours
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 uppercase font-medium block">
                  {tBilingual('Overtime Hourly Rate', 'ওভারটাইম ঘণ্টার রেট')}
                </span>
                <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                  {formatBDT(selectedEmployee.overtime_hourly_rate || (selectedEmployee.hourly_rate ? Math.round(selectedEmployee.hourly_rate * 1.5) : 0))} / hr
                </div>
                <span className="text-[10px] text-amber-600/80 block mt-0.5">
                  1.5x Regular Day Standard
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-[11px] text-slate-500 uppercase font-medium block">
                  {tBilingual('Advance Balance', 'বকেয়া অগ্রিম')}
                </span>
                <div
                  className={`text-base sm:text-lg font-bold mt-0.5 font-mono ${
                    Number(selectedEmployee.current_advance_balance || 0) > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatBDT(selectedEmployee.current_advance_balance || 0)}
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  {Number(selectedEmployee.current_advance_balance || 0) > 0
                    ? 'Pending payroll deduction'
                    : 'All advances cleared'}
                </span>
              </div>
            </div>

            {/* Dossier Tabs Navigation */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: 'overview', title: '1. Overview & Snapshot', title_bn: 'একনজরে বিবরণ', icon: UserCheck },
                { id: 'compensation', title: '2. Salary Breakdown', title_bn: 'বেতন কাঠামো', icon: Calculator },
                { id: 'payment', title: '3. Bank & MFS Payout', title_bn: 'ব্যাংক ও ওয়ালেট', icon: CreditCard },
                { id: 'idcard', title: '4. Digital ID Pass', title_bn: 'ডিজিটাল আইডি কার্ড', icon: Sparkles },
                { id: 'notes', title: '5. HR Notes & Skills', title_bn: 'দক্ষতা ও মন্তব্য', icon: FileText },
              ].map((tab) => {
                const isActive = drawerTab === tab.id
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                      isActive
                        ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/90 dark:border-slate-800 font-semibold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tBilingual(tab.title, tab.title_bn)}</span>
                  </button>
                )
              })}
            </div>

            {/* TAB 1: OVERVIEW & SNAPSHOT */}
            {drawerTab === 'overview' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Personal & Contact Details */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Personal & Contact Information', 'ব্যক্তিগত ও যোগাযোগ বিবরণ')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Primary Mobile:', 'প্রধান মোবাইল:')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">{selectedEmployee.mobile}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(selectedEmployee.mobile)
                            triggerCopy('mobile_main')
                          }}
                          className="text-slate-400 hover:text-blue-600"
                          title="Copy Mobile"
                        >
                          {copiedField === 'mobile_main' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    {selectedEmployee.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Secondary / WhatsApp:', 'বিকল্প / হোয়াটসঅ্যাপ:')}</span>
                        <span className="font-mono font-medium text-slate-900 dark:text-white">{selectedEmployee.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Email Address:', 'ইমেইল:')}</span>
                      <span className="text-slate-900 dark:text-white">{selectedEmployee.email || 'N/A'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('National ID (NID):', 'জাতীয় পরিচয়পত্র:')}</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {selectedEmployee.notes?.match(/NID:\s*([^\n]+)/)?.[1] || 'Verified on file'}
                      </span>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block mb-0.5">{tBilingual('Residential Address:', 'ঠিকানা:')}</span>
                      <span className="text-slate-800 dark:text-slate-200">
                        {selectedEmployee.address || tBilingual('Arambagh / Motijheel Production Zone, Dhaka', 'আরামবাগ / মতিঝিল কারখানা এলাকা, ঢাকা')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Emergency Kin & Family Contact */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {tBilingual('Emergency Kin & Safety Protocol', 'জরুরি যোগাযোগ ও নিকটাত্মীয়')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Contact Person:', 'যোগাযোগের নাম:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedEmployee.emergency_contact_name || 'N/A'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Relationship:', 'সম্পর্ক:')}</span>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-[10px] px-2 py-0.5">
                        {selectedEmployee.emergency_contact_relation || 'Spouse / Family'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Emergency Phone:', 'জরুরি ফোন:')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {selectedEmployee.emergency_contact_phone || 'N/A'}
                        </span>
                        {selectedEmployee.emergency_contact_phone && (
                          <a
                            href={`tel:${selectedEmployee.emergency_contact_phone}`}
                            className="text-emerald-600 hover:text-emerald-700 p-0.5"
                            title="Call Emergency Contact"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-400 mt-2">
                      {tBilingual(
                        'Verified for shop-floor incident escalation & medical notification protocol.',
                        'কারখানা দুর্ঘটনা ও জরুরি সহায়তার জন্য তথ্য সংরক্ষিত আছে।'
                      )}
                    </div>
                  </div>
                </div>

                {/* Education, Contract & Duty Shift Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <GraduationCap className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Education, Contract & Duty Schedule', 'শিক্ষা, চুক্তি ও ডিউটি সময়সূচি')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Educational Qualification:', 'শিক্ষাগত যোগ্যতা:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {selectedEmployee.educational_qualification || 'Diploma in Printing Technology'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Contract End Date:', 'চুক্তির মেয়াদ:')}</span>
                      <span className="font-mono text-slate-900 dark:text-white">
                        {selectedEmployee.contract_end_date ? formatDate(selectedEmployee.contract_end_date) : tBilingual('Permanent / Open-Ended', 'স্থায়ী / উন্মুক্ত চুক্তি')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Daily Shift Timings:', 'ডিউটি শিফট:')}</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        {selectedEmployee.duty_settings?.office_start_time || '09:00'} - {selectedEmployee.duty_settings?.office_end_time || '18:00'} ({selectedEmployee.duty_settings?.daily_duty_hours || 8}h Shift)
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Weekly Off Day:', 'সাপ্তাহিক ছুটি:')}</span>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                        {selectedEmployee.duty_settings?.weekly_off_day || 'Friday'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Late Grace & Fine Policy:', 'দেরি নীতি:')}</span>
                      <span className="text-slate-900 dark:text-white text-right">
                        {selectedEmployee.duty_settings?.late_grace_minutes || 15} Mins Grace • {selectedEmployee.duty_settings?.late_fine_enabled ? tBilingual('Fine Enabled', 'জরিমানা সক্রিয়') : tBilingual('Exempt', 'মুক্ত')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Commission, Portal Login & Attached Scans Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                    {tBilingual('Commission, Portal Access & Documents', 'কমিশন, লগইন ও সংযুক্ত ফাইল')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Commission Settings:', 'কমিশন সুবিধা:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {selectedEmployee.commission_settings?.enabled
                          ? `${selectedEmployee.commission_settings.rate_pct}% (${selectedEmployee.commission_settings.type}) • Target: ${formatBDT(selectedEmployee.commission_settings.monthly_target || 0)}`
                          : tBilingual('No Commission Configured', 'কমিশন প্রযোজ্য নয়')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Portal Login Access:', 'পোর্টাল লগইন:')}</span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          selectedEmployee.portal_credentials?.create_login
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {selectedEmployee.portal_credentials?.create_login
                          ? `Active (${selectedEmployee.portal_credentials.role || 'operator'})`
                          : 'Not Provisioned'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Paid Leave Quota:', 'মাসিক ছুটি:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedEmployee.allowed_monthly_leaves !== undefined ? selectedEmployee.allowed_monthly_leaves : 2} Days / Month
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500 block mb-1.5">{tBilingual('Attached Document Scans (Multiple):', 'সংযুক্ত ডকুমেন্ট স্ক্যান:')}</span>
                      <div className="flex flex-wrap gap-1.5">
                        {(selectedEmployee.document_attachments && selectedEmployee.document_attachments.length > 0
                          ? selectedEmployee.document_attachments
                          : [
                              { id: 'd1', name: 'NID_Card_Scan.pdf', type: 'NID' },
                              { id: 'd2', name: 'Appointment_Letter.pdf', type: 'Letter' },
                            ]
                        ).map((doc: any) => (
                          <span
                            key={doc.id || doc.name}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            <Paperclip className="w-3 h-3 text-blue-600" />
                            {doc.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: COMPENSATION & STATUTORY STRUCTURE */}
            {drawerTab === 'compensation' && (
              <div className="space-y-4 text-xs">
                {/* Statutory Breakdown Cards */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Bangladesh Labor Law Statutory Structure (60-20-10-10)', 'বাংলাদেশ শ্রম আইন অনুযায়ী বেতন বিশ্লেষণ')}
                    </h5>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-[10px]">
                      {selectedEmployee.salary_basis.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('Basic Salary (60%)', 'মূল বেতন (৬০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.basic || Math.round((selectedEmployee.base_salary || 0) * 0.6))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('House Rent (20%)', 'বাড়ি ভাড়া (২০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.house_allowance || Math.round((selectedEmployee.base_salary || 0) * 0.2))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('Medical Allowance (10%)', 'চিকিৎসা ভাতা (১০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.medical_allowance || Math.round((selectedEmployee.base_salary || 0) * 0.1))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-[10px] text-slate-500 block uppercase font-medium">{tBilingual('Conveyance Allowance (10%)', 'যাতায়াত ভাতা (১০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.transport_allowance || Math.round((selectedEmployee.base_salary || 0) * 0.1))}
                      </span>
                    </div>
                  </div>

                  {/* Overtime Policy Rules */}
                  <div className="p-3 rounded-lg bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 space-y-1 mt-2">
                    <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {tBilingual('Overtime Calculation Rules & Policy', 'ওভারটাইম নিয়মাবলী')}
                    </span>
                    <p className="text-[11px] text-amber-700 dark:text-amber-400">
                      Standard working shift OT is paid at <strong>1.5x regular hourly rate ({formatBDT(selectedEmployee.overtime_hourly_rate || 0)}/hr)</strong>. Festival holiday / night shifts receive <strong>2.0x multiplier</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: BANK & MFS CHANNELS */}
            {drawerTab === 'payment' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Bank Account */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Landmark className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Bank Account (BEFTN / NPSB / RTGS)', 'ব্যাংক অ্যাকাউন্ট বিবরণ')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Bank Name:', 'ব্যাংক:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {selectedEmployee.bank_payment_info?.bank_name || 'Not Configured'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Account Holder:', 'হিসাবধারীর নাম:')}</span>
                      <span className="text-slate-900 dark:text-white">
                        {selectedEmployee.bank_payment_info?.account_name || selectedEmployee.name}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Account Number:', 'অ্যাকাউন্ট নম্বর:')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {selectedEmployee.bank_payment_info?.account_number || 'N/A'}
                        </span>
                        {selectedEmployee.bank_payment_info?.account_number && (
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard?.writeText(selectedEmployee.bank_payment_info?.account_number || '')
                              triggerCopy('acc_num_360')
                            }}
                            className="text-slate-400 hover:text-blue-600"
                            title="Copy Account Number"
                          >
                            {copiedField === 'acc_num_360' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Branch Name:', 'শাখা:')}</span>
                      <span className="text-slate-900 dark:text-white">
                        {selectedEmployee.bank_payment_info?.branch_name || 'N/A'}
                      </span>
                    </div>

                    {selectedEmployee.bank_payment_info?.routing_number && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Routing Number:', 'রাউটিং নম্বর:')}</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {selectedEmployee.bank_payment_info?.routing_number}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* MFS Mobile Wallet */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Smartphone className="w-3.5 h-3.5 text-pink-600" />
                    {tBilingual('Mobile Financial Services (MFS)', 'মোবাইল ওয়ালেট')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('MFS Provider:', 'মাধ্যম:')}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs px-2.5 py-0.5 font-bold capitalize ${
                          selectedEmployee.mfs_payment_info?.provider === 'bkash'
                            ? 'bg-pink-50 text-pink-700 border-pink-300 dark:bg-pink-950/40 dark:text-pink-300'
                            : selectedEmployee.mfs_payment_info?.provider === 'nagad'
                            ? 'bg-orange-50 text-orange-700 border-orange-300 dark:bg-orange-950/40 dark:text-orange-300'
                            : 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300'
                        }`}
                      >
                        {selectedEmployee.mfs_payment_info?.provider || 'bKash'}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Wallet Number:', 'ওয়ালেট নম্বর:')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {selectedEmployee.mfs_payment_info?.wallet_number || selectedEmployee.mobile}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(
                              selectedEmployee.mfs_payment_info?.wallet_number || selectedEmployee.mobile
                            )
                            triggerCopy('mfs_num_360')
                          }}
                          className="text-slate-400 hover:text-blue-600"
                          title="Copy MFS Wallet Number"
                        >
                          {copiedField === 'mfs_num_360' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Account Type:', 'অ্যাকাউন্ট টাইপ:')}</span>
                      <span className="capitalize text-slate-900 dark:text-white font-medium">
                        {selectedEmployee.mfs_payment_info?.account_type || 'personal'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 text-[11px] text-blue-700 dark:text-blue-400 mt-2">
                      {tBilingual(
                        '1-click wage and advance disbursement enabled for this MFS number.',
                        'এই মোবাইল ওয়ালেটে সরাসরি বেতন ও অগ্রিম পাঠানো সম্ভব।'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: DIGITAL SECURITY ID PASS */}
            {drawerTab === 'idcard' && (
              <div className="space-y-4 pt-1 flex flex-col items-center">
                {/* Physical ID Card Mockup Frame */}
                <div className="w-full max-w-md p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-xl space-y-4 text-center relative overflow-hidden">
                  {/* Card Security Header Stripe */}
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 -mx-5 -mt-5 p-3 text-white flex items-center justify-between px-4">
                    <div className="text-left">
                      <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 block">InkFlow ERP Security Pass</span>
                      <span className="text-xs font-black tracking-wide">PRODUCTION FLOOR PASS</span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-white/90" />
                  </div>

                  {/* Avatar & Monogram */}
                  <div className="pt-2 flex justify-center">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-blue-500/20">
                      {selectedEmployee.name.slice(0, 2).toUpperCase()}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                      {selectedEmployee.name}
                    </h3>
                    {selectedEmployee.name_bn && (
                      <p className="text-xs text-slate-500 font-bengali mt-0.5">{selectedEmployee.name_bn}</p>
                    )}
                    <Badge variant="outline" className="mt-2 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300 text-xs font-bold px-3 py-0.5">
                      {selectedEmployee.role}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-left border-y border-slate-100 dark:border-slate-800 py-3">
                    <div>
                      <span className="text-slate-400 block text-[10px]">EMPLOYEE ID</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedEmployee.employee_id_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">DEPARTMENT</span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">{selectedEmployee.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">JOINED DATE</span>
                      <span className="font-mono text-slate-900 dark:text-white">{formatDate(selectedEmployee.joining_date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">EMERGENCY HELPLINE</span>
                      <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                        {selectedEmployee.emergency_contact_phone || selectedEmployee.mobile}
                      </span>
                    </div>
                  </div>

                  {/* Simulated Security Barcode Strip */}
                  <div className="pt-1 flex flex-col items-center gap-1">
                    <div className="w-48 h-8 bg-slate-900 dark:bg-slate-100 flex items-center justify-around px-2 rounded-xs">
                      {Array.from({ length: 32 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-6 ${i % 3 === 0 ? 'w-1 bg-white dark:bg-slate-900' : 'w-0.5 bg-white dark:bg-slate-900'}`}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] font-mono text-slate-400 tracking-widest uppercase">
                      *{selectedEmployee.employee_id_number}*
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1.5"
                    onClick={() => window.print()}
                  >
                    <Printer className="w-3.5 h-3.5" />
                    {tBilingual('Print Physical ID Card', 'প্রিন্ট আইডি কার্ড')}
                  </Button>
                </div>
              </div>
            )}

            {/* TAB 5: HR NOTES & SKILLS */}
            {drawerTab === 'notes' && (
              <div className="space-y-4 text-xs">
                {/* Machine Skills */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Wrench className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Machine Operating Capabilities & Shop-Floor Skills', 'মেশিন পরিচালনা ও কারখানা দক্ষতা')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      'Heidelberg 4-Color Press',
                      'Roland UV Flatbed',
                      'CNC Acrylic Router',
                      'Laser Cutting & Engraving',
                      'Die-Cutting & Letterpress',
                      'Pre-Press CTP & Separation',
                    ].map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1"
                      >
                        ✓ {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Internal Remarks */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <FileText className="w-3.5 h-3.5 text-slate-600" />
                    {tBilingual('Internal Administrative Remarks & Audit Notes', 'অভ্যন্তরীণ মন্তব্য ও রেকর্ড')}
                  </h4>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                    {selectedEmployee.notes || tBilingual('No special administrative remarks recorded for this employee.', 'কোনো বিশেষ প্রশাসনিক মন্তব্য নেই।')}
                  </p>
                </div>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="text-[11px] text-slate-400">
                Created: {formatDate(selectedEmployee.created_at)} • Updated: {formatDate(selectedEmployee.updated_at)}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-9 gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
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
