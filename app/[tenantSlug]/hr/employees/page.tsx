'use client'

// ==============================================================================
// InkFlow ERP - Authoritative Employee Directory & Workforce Roster Studio
// Designed for Bangladeshi Print & Signage Owners, HR & Shop-Floor Managers
// ==============================================================================

import React, { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useParams, useRouter, useSearchParams, usePathname } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Users,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
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
  Key,
  FileCheck,
  Upload,
  Trash,
  Paperclip,
  Camera,
  Send,
  ShieldAlert,
  Award,
  Sliders,
  ToggleLeft,
  ToggleRight,
  AlertOctagon,
  UserPlus,
  Image as ImageIcon,
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
  sendEmployeeInvitationAction,
  updateEmployeeLoginCredentialsAction,
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

function EmployeeListContent() {
  const params = useParams()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const tenantSlug = (params?.tenantSlug as string) || company?.slug || ''

  const [mounted, setMounted] = useState(false)
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
  const [modalTab, setModalTab] = useState<'personal' | 'role' | 'duty' | 'salary' | 'banking' | 'access_docs'>('personal')
  const [drawerTab, setDrawerTab] = useState<'overview' | 'duty' | 'compensation' | 'payment' | 'idcard' | 'notes'>('overview')
  const [showAdvancedAllowances, setShowAdvancedAllowances] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [previewDoc, setPreviewDoc] = useState<{ id?: string; name: string; type: string; url?: string; size?: string } | null>(null)
  const [isDragOverDocs, setIsDragOverDocs] = useState(false)

  // Employee Login & Invitation State
  const [isInviting, setIsInviting] = useState(false)
  const [inviteModalData, setInviteModalData] = useState<{
    isOpen: boolean
    inviteUrl: string
    email: string
    employeeName: string
    roleName: string
  } | null>(null)
  const [isEditingCredentials, setIsEditingCredentials] = useState(false)
  const [credsForm, setCredsForm] = useState<{
    create_login: boolean
    email: string
    username: string
    password: string
    role: string
    send_invitation: boolean
  }>({
    create_login: false,
    email: '',
    username: '',
    password: '',
    role: 'operator',
    send_invitation: true,
  })
  const [isSavingCreds, setIsSavingCreds] = useState(false)
  const [showCredsPassword, setShowCredsPassword] = useState(false)

  const triggerCopy = (key: string) => {
    setCopiedField(key)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const calculateDutyHours = (start?: string, end?: string): number => {
    if (!start || !end) return 9
    try {
      const parseTime = (timeStr: string) => {
        let trimmed = timeStr.trim().toUpperCase()
        const isPM = trimmed.includes('PM')
        const isAM = trimmed.includes('AM')
        trimmed = trimmed.replace(/[^\d:]/g, '')
        const parts = trimmed.split(':')
        let h = parseInt(parts[0] || '0', 10)
        const m = parseInt(parts[1] || '0', 10)
        if (isPM && h < 12) h += 12
        if (isAM && h === 12) h = 0
        return { h, m }
      }

      const s = parseTime(start)
      const e = parseTime(end)
      if (isNaN(s.h) || isNaN(e.h)) return 9

      let startTotalMins = s.h * 60 + s.m
      let endTotalMins = e.h * 60 + e.m

      // Handle overnight shifts (e.g. 22:00 to 06:00)
      if (endTotalMins <= startTotalMins) {
        endTotalMins += 24 * 60
      }

      const diffMins = endTotalMins - startTotalMins
      const hours = Math.round((diffMins / 60) * 10) / 10
      return hours > 0 ? hours : 9
    } catch {
      return 9
    }
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

  const handleDocumentFiles = (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    if (fileArray.length === 0) return

    let processedCount = 0
    fileArray.forEach((file) => {
      if (file.size > 10 * 1024 * 1024) {
        notify(`File "${file.name}" exceeds the 10MB limit.`)
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const sizeStr =
          file.size >= 1024 * 1024
            ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
            : `${Math.round(file.size / 1024)} KB`

        let docType = 'National ID / Smart Card'
        const lower = file.name.toLowerCase()
        if (lower.includes('nid') || lower.includes('national') || lower.includes('smart') || lower.includes('voter')) {
          docType = 'National ID / Smart Card'
        } else if (lower.includes('passport')) {
          docType = 'International Passport'
        } else if (
          lower.includes('contract') ||
          lower.includes('agreement') ||
          lower.includes('joining') ||
          lower.includes('offer') ||
          lower.includes('appointment')
        ) {
          docType = 'Employment Contract'
        } else if (
          lower.includes('cert') ||
          lower.includes('diploma') ||
          lower.includes('degree') ||
          lower.includes('ssc') ||
          lower.includes('hsc') ||
          lower.includes('grad') ||
          lower.includes('transcript')
        ) {
          docType = 'Educational Certificate'
        } else if (lower.includes('license') || lower.includes('driving') || lower.includes('trade')) {
          docType = 'Driving / Trade License'
        } else if (lower.includes('police') || lower.includes('clearance') || lower.includes('character')) {
          docType = 'Police Clearance / Reference'
        } else if (lower.includes('cv') || lower.includes('resume') || lower.includes('bio')) {
          docType = 'Resume / CV'
        }

        const newAttachment = {
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          type: docType,
          size: sizeStr,
          url: dataUrl,
          uploaded_at: new Date().toISOString(),
        }

        setEmpForm((prev) => ({
          ...prev,
          document_attachments: [...prev.document_attachments, newAttachment],
        }))
      }
      reader.readAsDataURL(file)
      processedCount++
    })

    if (processedCount > 0) {
      notify(`Attached ${processedCount} document(s) successfully.`)
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
    permanent_address: '',
    educational_qualification: '',
    profile_picture_url: '',
    role: 'Master Offset Machine Operator',
    department: 'printing',
    branch_id: '',
    employee_type: 'permanent' as EmploymentType,
    salary_basis: 'monthly' as SalaryBasis,
    joining_date: new Date().toISOString().split('T')[0],
    contract_end_date: '',
    allowed_monthly_leaves: 2,
    payment_method: 'cash' as PaymentMethod,
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
    commission_settings: {
      enabled: false,
      type: 'percentage' as 'percentage' | 'fixed_unit',
      rate_pct: 2.0,
      monthly_target: 100000,
      notes: '',
    },
    duty_settings: {
      office_start_time: '09:00',
      office_end_time: '18:00',
      daily_duty_hours: 9,
      late_grace_minutes: 15,
      weekly_off_day: 'Friday',
      ot_calc_type: '1.5x_standard' as '1.5x_standard' | '2.0x_holiday' | 'fixed_rate' | 'none',
      overtime_rate_value: 180,
      absent_deduction_allowed: true,
      late_fine_enabled: true,
      late_fine_policy: '3_late_1_day_salary' as '3_late_1_day_salary' | 'fixed_amount' | 'warning_only',
      late_fine_amount: 100,
    },
    portal_credentials: {
      create_login: false,
      username: '',
      email: '',
      password: '',
      role: 'operator',
      send_invitation: true,
    },
    document_attachments: [] as {
      id: string
      name: string
      type: string
      size?: string
      url?: string
      uploaded_at?: string
    }[],
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
        getEmployeesAction(undefined, tenantSlug),
        listBranchesAction(undefined, tenantSlug),
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
    setMounted(true)
  }, [])

  useEffect(() => {
    loadData()
  }, [])

  // Realtime Broadcast & Synced Event Listeners
  useEffect(() => {
    const handleSync = () => {
      loadData()
    }

    window.addEventListener('printerp_table_synced:employees', handleSync)
    window.addEventListener('printerp_data_sync', handleSync)

    return () => {
      window.removeEventListener('printerp_table_synced:employees', handleSync)
      window.removeEventListener('printerp_data_sync', handleSync)
    }
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
      document_attachments: [
        { id: `doc-${Date.now()}-1`, name: 'NID_Card_Scan.pdf', type: 'National ID' },
        { id: `doc-${Date.now()}-2`, name: 'Appointment_Contract.pdf', type: 'Employment Contract' },
      ],
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
      permanent_address: emp.permanent_address || '',
      educational_qualification: emp.educational_qualification || '',
      profile_picture_url: emp.profile_picture_url || '',
      role: emp.role || 'Staff',
      department: emp.department || 'printing',
      branch_id: emp.branch_id || '',
      employee_type: emp.employee_type || 'permanent',
      salary_basis: emp.salary_basis || 'monthly',
      joining_date: emp.joining_date || new Date().toISOString().split('T')[0],
      contract_end_date: emp.contract_end_date || '',
      allowed_monthly_leaves: emp.allowed_monthly_leaves !== undefined && emp.allowed_monthly_leaves !== null ? emp.allowed_monthly_leaves : 2,
      payment_method: emp.payment_method || 'cash',
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
      commission_settings: emp.commission_settings
        ? {
            enabled: emp.commission_settings.enabled ?? false,
            type: emp.commission_settings.type || 'percentage',
            rate_pct: emp.commission_settings.rate_pct ?? 2.0,
            monthly_target: emp.commission_settings.monthly_target ?? 100000,
            notes: emp.commission_settings.notes || '',
          }
        : {
            enabled: false,
            type: 'percentage' as const,
            rate_pct: 2.0,
            monthly_target: 100000,
            notes: '',
          },
      duty_settings: emp.duty_settings
        ? {
            office_start_time: emp.duty_settings.office_start_time || '09:00',
            office_end_time: emp.duty_settings.office_end_time || '18:00',
            daily_duty_hours:
              emp.duty_settings.daily_duty_hours && emp.duty_settings.daily_duty_hours > 0
                ? emp.duty_settings.daily_duty_hours
                : calculateDutyHours(
                    emp.duty_settings.office_start_time || '09:00',
                    emp.duty_settings.office_end_time || '18:00'
                  ),
            late_grace_minutes: emp.duty_settings.late_grace_minutes ?? 15,
            weekly_off_day: emp.duty_settings.weekly_off_day || 'Friday',
            ot_calc_type: emp.duty_settings.ot_calc_type || '1.5x_standard',
            overtime_rate_value: emp.duty_settings.overtime_rate_value ?? 180,
            absent_deduction_allowed: emp.duty_settings.absent_deduction_allowed !== false,
            late_fine_enabled: emp.duty_settings.late_fine_enabled !== false,
            late_fine_policy: emp.duty_settings.late_fine_policy || '3_late_1_day_salary',
            late_fine_amount: emp.duty_settings.late_fine_amount ?? 100,
          }
        : {
            office_start_time: '09:00',
            office_end_time: '18:00',
            daily_duty_hours: 9,
            late_grace_minutes: 15,
            weekly_off_day: 'Friday',
            ot_calc_type: '1.5x_standard' as const,
            overtime_rate_value: 180,
            absent_deduction_allowed: true,
            late_fine_enabled: true,
            late_fine_policy: '3_late_1_day_salary' as const,
            late_fine_amount: 100,
          },
      portal_credentials: emp.portal_credentials
        ? {
            create_login: emp.portal_credentials.create_login ?? false,
            username: emp.portal_credentials.username || '',
            email: emp.portal_credentials.email || emp.email || '',
            password: emp.portal_credentials.password || '',
            role: emp.portal_credentials.role || 'operator',
            send_invitation: emp.portal_credentials.send_invitation ?? true,
          }
        : {
            create_login: false,
            username: '',
            email: emp.email || '',
            password: '',
            role: 'operator',
            send_invitation: true,
          },
      document_attachments: (emp.document_attachments as any) || [
        { id: `doc-${Date.now()}-1`, name: 'NID_Card_Scan.pdf', type: 'National ID' },
        { id: `doc-${Date.now()}-2`, name: 'Appointment_Contract.pdf', type: 'Employment Contract' },
      ],
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
    setDrawerTab('overview')
    setIsEditingCredentials(false)
    const pc = emp.portal_credentials
    setCredsForm({
      create_login: pc?.create_login ?? false,
      email: pc?.email || emp.email || '',
      username: pc?.username || emp.name.toLowerCase().replace(/\s+/g, '.'),
      password: pc?.password || '',
      role: pc?.role || 'operator',
      send_invitation: true,
    })
    setIs360DrawerOpen(true)
  }

  const handleSendInvitation = async (emp: EmployeeRecord, overrideEmail?: string) => {
    const targetEmail = overrideEmail || emp.portal_credentials?.email || emp.email
    if (!targetEmail || !targetEmail.includes('@') || targetEmail.endsWith('.local')) {
      notify('Please configure a valid email address for this employee to send an invitation link.')
      setIsEditingCredentials(true)
      return
    }

    setIsInviting(true)
    try {
      const res = await sendEmployeeInvitationAction(emp.id, undefined, targetEmail)
      if (res.success && res.data?.inviteUrl) {
        notify(`Invitation link sent successfully to ${res.data.email || targetEmail}!`)
        setInviteModalData({
          isOpen: true,
          inviteUrl: res.data.inviteUrl,
          email: res.data.email || targetEmail,
          employeeName: emp.name,
          roleName: emp.portal_credentials?.role || emp.role || 'Operator',
        })
        const updatedPc = {
          ...(emp.portal_credentials || {}),
          create_login: true,
          email: res.data.email || targetEmail,
          status: 'invited' as const,
          last_invite_sent_at: new Date().toISOString(),
          invite_link: res.data.inviteUrl,
        }
        const updated = { ...emp, portal_credentials: updatedPc }
        setSelectedEmployee(updated)
        setEmployees((prev) => prev.map((e) => (e.id === emp.id ? updated : e)))
      } else {
        notify(res.error || 'Failed to dispatch invitation link.')
      }
    } catch (err: any) {
      notify(err?.message || 'Error sending invitation.')
    } finally {
      setIsInviting(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!selectedEmployee) return
    setIsSavingCreds(true)
    try {
      const res = await updateEmployeeLoginCredentialsAction(selectedEmployee.id, {
        create_login: credsForm.create_login,
        email: credsForm.email.trim() || undefined,
        username: credsForm.username.trim() || undefined,
        password: credsForm.password.trim() || undefined,
        role: credsForm.role || 'operator',
        send_invitation: credsForm.send_invitation,
      })

      if (res.success && res.data) {
        notify('Login credentials updated successfully.')
        setSelectedEmployee(res.data)
        setEmployees((prev) => prev.map((e) => (e.id === res.data!.id ? res.data! : e)))
        setIsEditingCredentials(false)

        if (credsForm.send_invitation && res.data.portal_credentials?.invite_link) {
          setInviteModalData({
            isOpen: true,
            inviteUrl: res.data.portal_credentials.invite_link,
            email: res.data.portal_credentials.email || credsForm.email,
            employeeName: res.data.name,
            roleName: res.data.portal_credentials.role || 'Operator',
          })
        }
      } else {
        notify(res.error || 'Failed to update login credentials.')
      }
    } catch (err: any) {
      notify(err?.message || 'Error updating credentials.')
    } finally {
      setIsSavingCreds(false)
    }
  }

  const handleTogglePortalAccess = async (enable: boolean) => {
    if (!selectedEmployee) return
    setIsSavingCreds(true)
    try {
      const updatedCreds = {
        ...(selectedEmployee.portal_credentials || {}),
        create_login: enable,
        status: enable ? ('active' as const) : ('disabled' as const),
      }
      const res = await updateEmployeeLoginCredentialsAction(selectedEmployee.id, updatedCreds)
      if (res.success && res.data) {
        notify(enable ? 'Portal login enabled for this employee.' : 'Portal login disabled for this employee.')
        setSelectedEmployee(res.data)
        setEmployees((prev) => prev.map((e) => (e.id === res.data!.id ? res.data! : e)))
      } else {
        notify(res.error || 'Failed to toggle portal access.')
      }
    } catch (err: any) {
      notify(err?.message || 'Error updating portal access.')
    } finally {
      setIsSavingCreds(false)
    }
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
        permanent_address: empForm.permanent_address?.trim() || null,
        educational_qualification: empForm.educational_qualification?.trim() || null,
        profile_picture_url: empForm.profile_picture_url?.trim() || null,
        role: empForm.role.trim() || 'Staff',
        department: empForm.department,
        branch_id: empForm.branch_id || null,
        employee_type: empForm.employee_type,
        salary_basis: empForm.salary_basis,
        joining_date: empForm.joining_date || new Date().toISOString().split('T')[0],
        contract_end_date: empForm.contract_end_date?.trim() || null,
        allowed_monthly_leaves: Number(empForm.allowed_monthly_leaves !== undefined ? empForm.allowed_monthly_leaves : 2),
        payment_method: empForm.payment_method,
        base_salary: Number(empForm.base_salary || 0),
        daily_rate: Number(empForm.daily_rate || 0),
        hourly_rate: Number(empForm.hourly_rate || 0),
        overtime_hourly_rate: Number(empForm.overtime_hourly_rate || 0),
        commission_settings: empForm.commission_settings,
        duty_settings: empForm.duty_settings,
        portal_credentials: empForm.portal_credentials,
        document_attachments: empForm.document_attachments,
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

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-16">
        <div className="h-14 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-96 bg-slate-100 dark:bg-slate-900 rounded-xl animate-pulse" />
      </div>
    )
  }

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
              asChild
              className="gap-1.5 text-xs h-9 hidden md:inline-flex"
            >
              <Link href={getTenantNavHref('/hr/attendance', pathname, tenantSlug)}>
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                {tBilingual('Floor Attendance', 'হাজিরা')}
              </Link>
            </Button>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-9 hidden sm:inline-flex"
            >
              <Link href={getTenantNavHref('/hr/payroll', pathname, tenantSlug)}>
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                {tBilingual('Payroll & Salary', 'পেরোল')}
              </Link>
            </Button>

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
          <p className="text-2xs text-slate-400 mt-1 truncate">
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
          <p className="text-2xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 truncate">
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
          <p className="text-2xs text-amber-600/80 dark:text-amber-400/80 mt-1 truncate">
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
          <p className="text-2xs text-purple-600/80 dark:text-purple-400/80 mt-1 truncate">
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
                        className={`text-2xs px-1.5 py-0.2 rounded-full ${
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
                <tr className="bg-slate-50/80 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-200 dark:border-slate-800 text-2xs uppercase tracking-wider">
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
                              <span className="text-2xs text-slate-400 font-normal">({emp.name_bn})</span>
                            )}
                          </div>
                          <div className="text-2xs text-slate-500 capitalize">
                            {emp.employee_type.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5 font-mono text-2xs text-slate-500">
                      {emp.employee_id_number}
                    </td>

                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900 dark:text-white">{emp.role}</div>
                      <div className="text-2xs text-slate-500 capitalize">{emp.department}</div>
                    </td>

                    <td className="p-3.5 text-2xs">
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
                          <span className="text-2xs text-slate-400"> /day</span>
                        </div>
                      ) : emp.salary_basis === 'hourly_rate' ? (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{formatBDT(emp.hourly_rate || 0)}</span>
                          <span className="text-2xs text-slate-400"> /hr</span>
                        </div>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900 dark:text-white">{formatBDT(emp.base_salary || 0)}</span>
                          <span className="text-2xs text-slate-400"> /mo</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3.5">
                      {Number(emp.current_advance_balance || 0) > 0 ? (
                        <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 text-2xs font-mono font-bold">
                          {formatBDT(emp.current_advance_balance || 0)}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-2xs">৳ 0</span>
                      )}
                    </td>

                    <td className="p-3.5">
                      <Badge
                        variant="outline"
                        className={`text-2xs px-2 py-0.5 capitalize font-semibold ${
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
                    className={`text-2xs px-2 py-0.5 capitalize font-semibold ${
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
                  <span className="text-2xs text-muted-foreground flex items-center gap-1">
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
          size="6xl"
        >
          <div className="space-y-4 max-h-[78vh] overflow-y-auto pr-1">
            {/* Step Progress & Tab Navigation Bar - 100% visible grid on all screens */}
            <div className="bg-slate-100/90 dark:bg-slate-900/90 p-1.5 rounded-xl border border-slate-200/90 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 w-full">
              {[
                { id: 'personal', num: 1, title: 'Personal Info', title_bn: 'ব্যক্তিগত তথ্য', icon: UserCheck },
                { id: 'role', num: 2, title: 'Role & Contract', title_bn: 'পদবি ও চুক্তি', icon: Briefcase },
                { id: 'duty', num: 3, title: 'Duty & Overtime', title_bn: 'ডিউটি ও হাজিরা', icon: Clock },
                { id: 'salary', num: 4, title: 'Compensation', title_bn: 'বেতন ও কমিশন', icon: Calculator },
                { id: 'banking', num: 5, title: 'Bank & MFS', title_bn: 'ব্যাংক ও ওয়ালেট', icon: CreditCard },
                { id: 'access_docs', num: 6, title: 'Login & Docs', title_bn: 'লগইন ও ডকুমেন্টস', icon: ShieldCheck },
              ].map((step) => {
                const isActive = modalTab === step.id
                const Icon = step.icon
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setModalTab(step.id as any)}
                    className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-lg text-xs font-semibold transition-all w-full text-center min-w-0 ${
                      isActive
                        ? 'bg-white dark:bg-slate-950 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-500/30 ring-1 ring-blue-500/20 font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-white/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-2xs font-extrabold shrink-0 ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {step.num}
                    </span>
                    <Icon className="w-3.5 h-3.5 shrink-0 hidden sm:inline-block" />
                    <span className="truncate">{step.title}</span>
                  </button>
                )
              })}
            </div>

            {/* Active Step Indicator Banner */}
            <div className="flex items-center justify-between px-1 py-1 text-xs text-slate-500 border-b border-slate-100 dark:border-slate-800/60">
              <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0" />
                {modalTab === 'personal' && tBilingual('Step 1 of 6: Personal Identity & Contact Details', 'ধাপ ১/৬: ব্যক্তিগত পরিচয় ও যোগাযোগের বিবরণ')}
                {modalTab === 'role' && tBilingual('Step 2 of 6: Role, Designation & Contract Period', 'ধাপ ২/৬: পদবি, বিভাগ ও চাকরির মেয়াদ')}
                {modalTab === 'duty' && tBilingual('Step 3 of 6: Shift Hours, Overtime & Attendance Rules', 'ধাপ ৩/৬: ডিউটি শিফট, ওভারটাইম ও হাজিরা পলিসি')}
                {modalTab === 'salary' && tBilingual('Step 4 of 6: Base Salary, Allowances & Sales Commission', 'ধাপ ৪/৬: মূল বেতন, ভাতা ও সেলস কমিশন')}
                {modalTab === 'banking' && tBilingual('Step 5 of 6: Bank Account & MFS Mobile Wallets', 'ধাপ ৫/৬: ব্যাংক অ্যাকাউন্ট ও মোবাইল ওয়ালেট')}
                {modalTab === 'access_docs' && tBilingual('Step 6 of 6: Portal Login & Media Document Uploads', 'ধাপ ৬/৬: পোর্টাল অ্যাকাউন্ট ও ডকুমেন্ট ফাইল আপলোড')}
              </span>
              <span className="text-2xs font-mono text-slate-400 font-medium">
                {modalTab === 'personal' && '1 / 6'}
                {modalTab === 'role' && '2 / 6'}
                {modalTab === 'duty' && '3 / 6'}
                {modalTab === 'salary' && '4 / 6'}
                {modalTab === 'banking' && '5 / 6'}
                {modalTab === 'access_docs' && '6 / 6'}
              </span>
            </div>

            {/* TAB 1: PERSONAL & CONTACT DETAILS */}
            {modalTab === 'personal' && (
              <div className="space-y-4 pt-1">
                {/* Hidden File Input for Avatar Photo Upload */}
                <input
                  id="profile-picture-upload"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        notify('Image size must be less than 5MB.')
                        return
                      }
                      const reader = new FileReader()
                      reader.onload = () => {
                        setEmpForm({ ...empForm, profile_picture_url: reader.result as string })
                        notify('Profile photo uploaded successfully!')
                      }
                      reader.readAsDataURL(file)
                    }
                  }}
                />

                {/* Profile Avatar & Interactive Media Upload Banner */}
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                  <div className="flex items-center gap-3.5">
                    {empForm.profile_picture_url ? (
                      <img
                        src={empForm.profile_picture_url}
                        alt="Profile Preview"
                        className="w-16 h-16 rounded-2xl object-cover ring-2 ring-blue-500/40 shadow-sm shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm shrink-0 ring-2 ring-blue-500/20">
                        {empForm.name ? empForm.name.slice(0, 2).toUpperCase() : 'EMP'}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        {empForm.name || tBilingual('New Employee', 'নতুন কর্মী')}
                        {empForm.profile_picture_url && (
                          <Badge variant="outline" className="text-2xs px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-300">
                            Photo Attached
                          </Badge>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {empForm.name_bn ? `${empForm.name_bn} • ` : ''}
                        {empForm.mobile || tBilingual('No mobile specified', 'মোবাইল নম্বর দেওয়া হয়নি')}
                      </p>
                      <p className="text-2xs text-blue-600 dark:text-blue-400 mt-0.5 font-medium">
                        {empForm.profile_picture_url ? '✓ Ready to save with employee profile' : 'PNG, JPG, WEBP (Max 5MB)'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <label
                      htmlFor="profile-picture-upload"
                      className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-xs hover:bg-blue-50 dark:hover:bg-blue-950/50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{empForm.profile_picture_url ? tBilingual('Replace Photo', 'ছবি পরিবর্তন') : tBilingual('Upload Photo', 'ছবি আপলোড')}</span>
                    </label>

                    {empForm.profile_picture_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEmpForm({ ...empForm, profile_picture_url: '' })}
                        className="h-8 px-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 text-xs gap-1"
                        title="Remove uploaded photo"
                      >
                        <Trash className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Remove</span>
                      </Button>
                    )}
                  </div>
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
                        onChange={(e) => {
                          const val = e.target.value
                          setEmpForm({
                            ...empForm,
                            email: val,
                            portal_credentials: {
                              ...empForm.portal_credentials,
                              email: empForm.portal_credentials.email ? empForm.portal_credentials.email : val,
                            },
                          })
                        }}
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
                      {tBilingual('Educational Qualification', 'শিক্ষাগত যোগ্যতা')}
                    </Label>
                    <div className="relative">
                      <GraduationCap className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="e.g. Diploma in Printing / HSC / SSC / B.Sc"
                        value={empForm.educational_qualification}
                        onChange={(e) => setEmpForm({ ...empForm, educational_qualification: e.target.value })}
                        className="text-xs h-9 pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Profile Picture URL', 'প্রোফাইল ছবির লিংক')}
                    </Label>
                    <div className="relative">
                      <Camera className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="https://.../photo.jpg or Upload above"
                        value={empForm.profile_picture_url}
                        onChange={(e) => setEmpForm({ ...empForm, profile_picture_url: e.target.value })}
                        className="text-xs h-9 pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Residential & Present Address', 'বর্তমান ঠিকানা')}
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

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Permanent Address', 'স্থায়ী ঠিকানা')}
                      </Label>
                      {empForm.address && (
                        <button
                          type="button"
                          onClick={() => setEmpForm({ ...empForm, permanent_address: empForm.address })}
                          className="text-2xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          {tBilingual('Same as Present', 'বর্তমান ঠিকানার মতো')}
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <MapPin className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        placeholder="e.g. Vill: Goalbathan, Upazila: Kaliakair, Gazipur"
                        value={empForm.permanent_address}
                        onChange={(e) => setEmpForm({ ...empForm, permanent_address: e.target.value })}
                        className="text-xs h-9 pl-9"
                      />
                    </div>
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
                    <span className="text-2xs text-slate-400">
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
                          <span className="text-2xs font-bold px-1.5 py-0.5 rounded-md bg-white/80 dark:bg-slate-900/80">
                            {formatBDT(preset.base_salary || preset.daily_rate)}
                          </span>
                        </div>
                        <div className="mt-1.5">
                          <div className="text-xs font-bold line-clamp-1">{preset.title}</div>
                          <div className="text-2xs opacity-75 capitalize">{preset.department}</div>
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
                      <option value="printing">{tBilingual('Printing', 'মুদ্রণ ও প্রিন্টিং')}</option>
                      <option value="finishing">{tBilingual('Finishing & Binding', 'ফিনিশিং ও বাইন্ডিং')}</option>
                      <option value="fabrication">{tBilingual('Fabrication & CNC', 'সাইনেজ ও মেটালিক')}</option>
                      <option value="design">{tBilingual('Pre-press & Design', 'গ্রাফিক ডিজাইন')}</option>
                      <option value="installation">{tBilingual('On-site Installation', 'অন-সাইট ফিটিং')}</option>
                      <option value="accounts">{tBilingual('Accounts & Billing', 'হিসাব ও বিলিং')}</option>
                      <option value="sales">{tBilingual('Sales & Marketing', 'মার্কেটিং ও সেলস')}</option>
                      <option value="management">{tBilingual('Management / Floor Admin', 'ম্যানেজমেন্ট')}</option>
                      <option value="field_ops">{tBilingual('Field Operations', 'ফিল্ড অপারেশন')}</option>
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
                      <option value="permanent">{tBilingual('Permanent Monthly Staff', 'স্থায়ী মাসিক কর্মী')}</option>
                      <option value="daily_worker">{tBilingual('Daily Wage Laborer', 'দৈনিক মজুরি কর্মী')}</option>
                      <option value="hourly_worker">{tBilingual('Hourly Worker', 'ঘণ্টাপ্রতি পারিশ্রমিক')}</option>
                      <option value="contract">{tBilingual('Contract Staff', 'চুক্তিভিত্তিক কর্মী')}</option>
                      <option value="part_time">{tBilingual('Part-Time Worker', 'খণ্ডকালীন কর্মী')}</option>
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
                      {tBilingual('End Date (Contract)', 'চুক্তির শেষ তারিখ (প্রযোজ্য ক্ষেত্রে)')}
                    </Label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="date"
                        value={empForm.contract_end_date}
                        onChange={(e) => setEmpForm({ ...empForm, contract_end_date: e.target.value })}
                        className="text-xs h-9 pl-9"
                        placeholder="Optional"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {tBilingual('Allowed Monthly Paid Leaves', 'মাসিক বেতনসহ অনুমোদিত ছুটি')}
                    </Label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                      <Input
                        type="number"
                        min="0"
                        max="30"
                        value={empForm.allowed_monthly_leaves}
                        onChange={(e) => setEmpForm({ ...empForm, allowed_monthly_leaves: Number(e.target.value || 0) })}
                        className="text-xs h-9 pl-9 font-mono"
                        placeholder="e.g. 2 Days"
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
                      <option value="active">{tBilingual('Active', 'কর্মরত')}</option>
                      <option value="on_leave">{tBilingual('On Leave', 'ছুটিতে')}</option>
                      <option value="terminated">{tBilingual('Terminated / Inactive', 'অব্যাহতিপ্রাপ্ত')}</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DUTY, ATTENDANCE & OVERTIME SETTINGS */}
            {modalTab === 'duty' && (
              <div className="space-y-4 pt-1">
                {/* Office & Shift Timings */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Duty, Attendance & Shift Timings', 'ডিউটি, সময়সূচি ও সাপ্তাহিক ছুটি')}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Office Start Time *', 'অফিস শুরুর সময় *')}
                      </Label>
                      <Input
                        type="time"
                        value={empForm.duty_settings.office_start_time}
                        onChange={(e) => {
                          const newStart = e.target.value
                          const newHours = calculateDutyHours(newStart, empForm.duty_settings.office_end_time)
                          setEmpForm({
                            ...empForm,
                            duty_settings: {
                              ...empForm.duty_settings,
                              office_start_time: newStart,
                              daily_duty_hours: newHours,
                            },
                          })
                        }}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Office End Time *', 'অফিস শেষের সময় *')}
                      </Label>
                      <Input
                        type="time"
                        value={empForm.duty_settings.office_end_time}
                        onChange={(e) => {
                          const newEnd = e.target.value
                          const newHours = calculateDutyHours(empForm.duty_settings.office_start_time, newEnd)
                          setEmpForm({
                            ...empForm,
                            duty_settings: {
                              ...empForm.duty_settings,
                              office_end_time: newEnd,
                              daily_duty_hours: newHours,
                            },
                          })
                        }}
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Daily Duty Hours *', 'দৈনিক ডিউটি ঘণ্টা *')}
                        </Label>
                        <button
                          type="button"
                          onClick={() => {
                            const newHours = calculateDutyHours(
                              empForm.duty_settings.office_start_time,
                              empForm.duty_settings.office_end_time
                            )
                            setEmpForm({
                              ...empForm,
                              duty_settings: {
                                ...empForm.duty_settings,
                                daily_duty_hours: newHours,
                              },
                            })
                          }}
                          className="text-2xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-medium"
                          title="Auto calculate from start/end time"
                        >
                          <Sparkles className="w-2.5 h-2.5 text-blue-500" />
                          {tBilingual('Auto Calc', 'অটো হিসাব')}
                        </button>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        step="0.5"
                        value={empForm.duty_settings.daily_duty_hours}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            duty_settings: { ...empForm.duty_settings, daily_duty_hours: Number(e.target.value || 0) },
                          })
                        }
                        className="text-xs h-9 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Late Grace (Mins) *', 'বিলম্ব ছাড় (মিনিট) *')}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={empForm.duty_settings.late_grace_minutes}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            duty_settings: { ...empForm.duty_settings, late_grace_minutes: Number(e.target.value || 0) },
                          })
                        }
                        className="text-xs h-9 font-mono"
                        placeholder="e.g. 15 Mins"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Weekly Off Day *', 'সাপ্তাহিক ছুটির দিন *')}
                      </Label>
                      <select
                        value={empForm.duty_settings.weekly_off_day}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            duty_settings: { ...empForm.duty_settings, weekly_off_day: e.target.value },
                          })
                        }
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="Friday">{tBilingual('Friday', 'শুক্রবার')}</option>
                        <option value="Saturday">{tBilingual('Saturday', 'শনিবার')}</option>
                        <option value="Sunday">{tBilingual('Sunday', 'রবিবার')}</option>
                        <option value="None">{tBilingual('Rotating Shift / None', 'রোটেটিং')}</option>
                      </select>
                    </div>

                    <div className="space-y-1 flex flex-col justify-end">
                      <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 cursor-pointer h-9">
                        <input
                          type="checkbox"
                          checked={empForm.duty_settings.absent_deduction_allowed}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              duty_settings: {
                                ...empForm.duty_settings,
                                absent_deduction_allowed: e.target.checked,
                              },
                            })
                          }
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {tBilingual('Absent Deduction Allowed? *', 'অনুপস্থিতির বেতন কর্তন চালু?')}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Overtime Settings */}
                <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
                  <h5 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 border-b border-amber-500/20 pb-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    {tBilingual('Overtime Calculation Rules & Policy', 'ওভারটাইম হিসাবের নিয়ম ও পলিসি')}
                  </h5>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Overtime Calculation Type *', 'ওভারটাইম হিসাবের ধরন *')}
                      </Label>
                      <select
                        value={empForm.duty_settings.ot_calc_type}
                        onChange={(e) => {
                          const type = e.target.value as any
                          let rateVal = empForm.duty_settings.overtime_rate_value
                          if (type === '1.5x_standard') {
                            rateVal = Math.round((empForm.hourly_rate || 120) * 1.5)
                          } else if (type === '2.0x_holiday') {
                            rateVal = Math.round((empForm.hourly_rate || 120) * 2.0)
                          }
                          setEmpForm({
                            ...empForm,
                            overtime_hourly_rate: rateVal,
                            duty_settings: {
                              ...empForm.duty_settings,
                              ot_calc_type: type,
                              overtime_rate_value: rateVal,
                            },
                          })
                        }}
                        className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                      >
                        <option value="1.5x_standard">{tBilingual('1.5x Regular Hourly Rate', 'সাধারণ দেড়গুণ রেট')}</option>
                        <option value="2.0x_holiday">{tBilingual('2.0x Holiday / Night Shift', 'ছুটি বা রাতের দ্বিগুণ রেট')}</option>
                        <option value="fixed_rate">{tBilingual('Fixed Hourly OT Rate', 'নির্দিষ্ট রেট')}</option>
                        <option value="none">{tBilingual('No Overtime Allowed', 'প্রযোজ্য নয়')}</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        {tBilingual('Overtime Rate', 'ওভারটাইম রেট')}
                      </Label>
                      <Input
                        type="number"
                        value={empForm.duty_settings.overtime_rate_value}
                        onChange={(e) => {
                          const val = Number(e.target.value || 0)
                          setEmpForm({
                            ...empForm,
                            overtime_hourly_rate: val,
                            duty_settings: { ...empForm.duty_settings, overtime_rate_value: val },
                          })
                        }}
                        className="text-xs h-9 font-mono font-bold text-amber-600 dark:text-amber-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Late Fine & Salary Deduction Policy */}
                <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 dark:bg-rose-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                    <h5 className="text-xs font-bold text-rose-900 dark:text-rose-300 flex items-center gap-1.5">
                      <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
                      {tBilingual('Late Fine & Salary Deduction Policy', 'দেরির জন্য জরিমানা ও বেতন কর্তন পলিসি')}
                    </h5>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={empForm.duty_settings.late_fine_enabled}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            duty_settings: {
                              ...empForm.duty_settings,
                              late_fine_enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-rose-800 dark:text-rose-300">
                        {tBilingual('Enable Late Fine/Deduction? *', 'দেরির জরিমানা কর্তন চালু?')}
                      </span>
                    </label>
                  </div>

                  {empForm.duty_settings.late_fine_enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Late Fine Policy Rule', 'জরিমানা পলিসি নিয়ম')}
                        </Label>
                        <select
                          value={empForm.duty_settings.late_fine_policy}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              duty_settings: { ...empForm.duty_settings, late_fine_policy: e.target.value as any },
                            })
                          }
                          className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                        >
                          <option value="3_late_1_day_salary">{tBilingual('3 Days Late = 1 Day Salary Cut', '৩ দিন দেরিতে ১ দিনের বেতন কর্তন')}</option>
                          <option value="fixed_amount">{tBilingual('Fixed Fine Amount per Late', 'প্রতি দেরিতে নির্দিষ্ট জরিমানা')}</option>
                          <option value="warning_only">{tBilingual('Warning Notice Only', 'শুধুমাত্র সতর্কবার্তা')}</option>
                        </select>
                      </div>

                      {empForm.duty_settings.late_fine_policy === 'fixed_amount' && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Fine Amount per Late', 'দেরির জরিমানা')}
                          </Label>
                          <Input
                            type="number"
                            value={empForm.duty_settings.late_fine_amount}
                            onChange={(e) =>
                              setEmpForm({
                                ...empForm,
                                duty_settings: {
                                  ...empForm.duty_settings,
                                  late_fine_amount: Number(e.target.value || 0),
                                },
                              })
                            }
                            className="text-xs h-9 font-mono"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: COMPENSATION & COMMISSION SETTINGS */}
            {modalTab === 'salary' && (
              <div className="space-y-4 pt-1">
                {/* Salary Basis Selector Pills */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {tBilingual('Salary Basis / Payout Mode', 'বেতনের ধরন')}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'monthly', label: 'Monthly Fixed', label_bn: 'মাসিক', desc: 'Full-time salaried staff', desc_bn: 'স্থায়ী মাসিক কর্মী' },
                      { id: 'daily_rate', label: 'Daily Wage', label_bn: 'দৈনিক', desc: 'Shop-floor labor rate', desc_bn: 'দৈনিক মজুরি কর্মী' },
                      { id: 'hourly_rate', label: 'Hourly Rate', label_bn: 'ঘণ্টাপ্রতি', desc: 'Field & part-time tech', desc_bn: 'ঘণ্টাপ্রতি কর্মী' },
                      { id: 'contract', label: 'Contractual', label_bn: 'চুক্তিভিত্তিক', desc: 'Job-wise or fixed term', desc_bn: 'চুক্তিভিত্তিক কর্মী' },
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
                        <div className="text-xs font-bold">{tBilingual(mode.label, mode.label_bn)}</div>
                        <div className="text-2xs opacity-75">{tBilingual(mode.desc, mode.desc_bn)}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Numbers Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{tBilingual('Base Salary (Monthly)', 'মূল মাসিক বেতন')}</span>
                      <span className="text-2xs text-blue-600 font-mono">৳ BDT</span>
                    </Label>
                    <Input
                      type="number"
                      value={empForm.base_salary}
                      onChange={(e) => handleBaseSalaryChange(Number(e.target.value || 0))}
                      className="text-sm h-9 font-bold font-mono"
                    />
                    <p className="text-2xs text-slate-400">
                      {tBilingual('Auto-calculates hourly & overtime rates', 'ঘণ্টা ও ওভারটাইম রেট স্বয়ংক্রিয় হিসাব হবে')}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{tBilingual('Daily Rate', 'দৈনিক রেট')}</span>
                      <span className="text-2xs text-blue-600 font-mono">৳/day</span>
                    </Label>
                    <Input
                      type="number"
                      value={empForm.daily_rate}
                      onChange={(e) => setEmpForm({ ...empForm, daily_rate: Number(e.target.value || 0) })}
                      className="text-sm h-9 font-bold font-mono"
                    />
                    <p className="text-2xs text-slate-400">
                      {tBilingual('Used for daily floor wage calculation', 'দৈনিক শ্রমিকের হাজিরা মজুরি')}
                    </p>
                  </div>

                  <div className="space-y-1.5 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20">
                    <Label className="text-xs font-semibold text-amber-700 dark:text-amber-300 flex items-center justify-between">
                      <span>{tBilingual('OT Hourly Rate', 'ওভারটাইম রেট')}</span>
                      <span className="text-2xs text-amber-600 font-mono">৳/hour</span>
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
                        className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-bold"
                      >
                        1.5x Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const hr = empForm.hourly_rate || Math.round((empForm.base_salary || 0) / 208)
                          setEmpForm({ ...empForm, overtime_hourly_rate: Math.round(hr * 2.0) })
                        }}
                        className="text-2xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 hover:bg-amber-500/20 font-bold"
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
                      className="text-2xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      {showAdvancedAllowances ? tBilingual('Hide Custom Details', 'কাস্টম আড়াল করুন') : tBilingual('Customize Allowances', 'ভাতা কাস্টমাইজ করুন')}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Basic Salary (60%)', 'মূল বেতন (৬০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.basic || Math.round(empForm.base_salary * 0.6))}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('House Rent (20%)', 'বাড়ি ভাড়া (২০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.house_allowance || Math.round(empForm.base_salary * 0.2))}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Medical (10%)', 'চিকিৎসা ভাতা (১০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.medical_allowance || Math.round(empForm.base_salary * 0.1))}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Conveyance (10%)', 'যাতায়াত ভাতা (১০%)')}</span>
                      <span className="text-sm font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(empForm.salary_structure?.transport_allowance || Math.round(empForm.base_salary * 0.1))}
                      </span>
                    </div>
                  </div>

                  {/* Advanced Custom Allowances */}
                  {showAdvancedAllowances && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <Label className="text-2xs">{tBilingual('Custom Basic', 'মূল বেতন')}</Label>
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
                        <Label className="text-2xs">{tBilingual('House Rent', 'বাড়ি ভাড়া')}</Label>
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
                        <Label className="text-2xs">{tBilingual('Food Allowance', 'খাবার ভাতা')}</Label>
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
                        <Label className="text-2xs">{tBilingual('Other Allowance', 'অন্যান্য ভাতা')}</Label>
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

                {/* Commission & Target Settings Section */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      {tBilingual('Commission & Target Settings', 'কমিশন ও মাসিক সেলস টার্গেট সেটিংস')}
                    </h5>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={empForm.commission_settings.enabled}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            commission_settings: {
                              ...empForm.commission_settings,
                              enabled: e.target.checked,
                            },
                          })
                        }
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                        {tBilingual('Enable Commission?', 'কমিশন সুবিধা চালু?')}
                      </span>
                    </label>
                  </div>

                  {empForm.commission_settings.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Commission Type', 'কমিশনের ধরন')}
                        </Label>
                        <select
                          value={empForm.commission_settings.type}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              commission_settings: {
                                ...empForm.commission_settings,
                                type: e.target.value as any,
                              },
                            })
                          }
                          className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                        >
                          <option value="percentage">{tBilingual('Percentage of Sales', 'বিক্রয়ের শতকরা হার')}</option>
                          <option value="fixed_unit">{tBilingual('Fixed Amount per Unit', 'প্রতি ইউনিটে নির্দিষ্ট টাকা')}</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Commission Rate (% or Fixed)', 'কমিশন হার (% বা নির্দিষ্ট টাকা)')}
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={empForm.commission_settings.rate_pct}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              commission_settings: {
                                ...empForm.commission_settings,
                                rate_pct: Number(e.target.value || 0),
                              },
                            })
                          }
                          className="text-xs h-9 font-mono font-bold"
                          placeholder="e.g. 2.5%"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Monthly Sales Target', 'মাসিক বিক্রয় লক্ষ্যমাত্রা')}
                        </Label>
                        <Input
                          type="number"
                          value={empForm.commission_settings.monthly_target}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              commission_settings: {
                                ...empForm.commission_settings,
                                monthly_target: Number(e.target.value || 0),
                              },
                            })
                          }
                          className="text-xs h-9 font-mono"
                          placeholder="e.g. 100000"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: BANKING & MOBILE FINANCIAL SERVICES (MFS) */}
            {modalTab === 'banking' && (
              <div className="space-y-4 pt-1">
                {/* Bank Transfer Section */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Bank Account Details (BEFTN / NPSB / RTGS)', 'ব্যাংক অ্যাকাউন্ট বিবরণ')}
                    </h5>
                    <span className="text-2xs text-slate-400">Optional for direct bank disbursement</span>
                  </div>

                  {/* Popular Bank Selector Chips */}
                  <div className="space-y-1.5">
                    <span className="text-2xs text-slate-500 font-medium">Quick Bank Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {POPULAR_BANKS.map((bName) => (
                        <button
                          key={bName}
                          type="button"
                          onClick={() => setEmpForm({ ...empForm, bank_name: bName })}
                          className={`text-2xs px-2 py-1 rounded-md border transition-all ${
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
                            className="text-2xs text-blue-600 hover:underline flex items-center gap-1"
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
                    <span className="text-2xs text-slate-400">1-click wage payout</span>
                  </div>

                  {/* MFS Provider Selection */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'bkash', label: 'bKash', label_bn: 'বিকাশ', color: 'border-pink-500/30 bg-pink-500/5 text-pink-700 dark:text-pink-400' },
                      { id: 'nagad', label: 'Nagad', label_bn: 'নগদ', color: 'border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-400' },
                      { id: 'rocket', label: 'Rocket', label_bn: 'রকেট', color: 'border-purple-500/30 bg-purple-500/5 text-purple-700 dark:text-purple-400' },
                      { id: 'other', label: 'Upay / Other', label_bn: 'উপায় / অন্যান্য', color: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-400' },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setEmpForm({ ...empForm, mfs_provider: p.id as any })}
                        className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all ${p.color} ${
                          empForm.mfs_provider === p.id ? 'ring-2 ring-blue-500 shadow-xs' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {tBilingual(p.label, p.label_bn)}
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
                            className="text-2xs text-blue-600 hover:underline flex items-center gap-1"
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
                        <option value="personal">{tBilingual('Personal', 'ব্যক্তিগত')}</option>
                        <option value="merchant">{tBilingual('Merchant', 'মার্চেন্ট')}</option>
                        <option value="agent">{tBilingual('Agent', 'এজেন্ট')}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 6: PORTAL LOGIN ACCESS, DOCUMENTS & EMERGENCY CONTACT */}
            {modalTab === 'access_docs' && (
              <div className="space-y-4 pt-1">
                {/* Portal Login Account Credentials */}
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-blue-500/20 pb-2">
                    <h5 className="text-xs font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Login Account Credentials', 'সফটওয়্যার পোর্টাল লগইন ও নিরাপত্তা')}
                    </h5>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={empForm.portal_credentials.create_login}
                        onChange={(e) =>
                          setEmpForm({
                            ...empForm,
                            portal_credentials: {
                              ...empForm.portal_credentials,
                              create_login: e.target.checked,
                              email: empForm.portal_credentials.email || empForm.email || `${empForm.mobile}@company.local`,
                              username: empForm.portal_credentials.username || empForm.name.toLowerCase().replace(/\s+/g, '.'),
                            },
                          })
                        }
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                        {tBilingual('Create Portal Login? *', 'পোর্টাল লগইন তৈরি করবেন? *')}
                      </span>
                    </label>
                  </div>

                  {empForm.portal_credentials.create_login && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Login Email *', 'লগইন ইমেইল *')}
                        </Label>
                        <Input
                          type="email"
                          placeholder="e.g. rahim@company.com"
                          value={empForm.portal_credentials.email}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              portal_credentials: {
                                ...empForm.portal_credentials,
                                email: e.target.value,
                              },
                            })
                          }
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Login Username *', 'লগইন ইউজারনেম *')}
                        </Label>
                        <Input
                          placeholder="e.g. rahim_operator"
                          value={empForm.portal_credentials.username}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              portal_credentials: {
                                ...empForm.portal_credentials,
                                username: e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''),
                              },
                            })
                          }
                          className="text-xs h-9 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Secure Login Password *', 'পাসওয়ার্ড *')}
                          </Label>
                          <button
                            type="button"
                            onClick={() => {
                              const pass = `Pass@${Math.floor(100000 + Math.random() * 900000)}`
                              setEmpForm({
                                ...empForm,
                                portal_credentials: { ...empForm.portal_credentials, password: pass },
                              })
                            }}
                            className="text-2xs text-blue-600 hover:underline"
                          >
                            Generate
                          </button>
                        </div>
                        <Input
                          type="text"
                          placeholder="Password (min 6 chars)"
                          value={empForm.portal_credentials.password}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              portal_credentials: { ...empForm.portal_credentials, password: e.target.value },
                            })
                          }
                          className="text-xs h-9 font-mono"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          {tBilingual('Assigned Portal Role', 'পোর্টাল রোল')}
                        </Label>
                        <select
                          value={empForm.portal_credentials.role}
                          onChange={(e) =>
                            setEmpForm({
                              ...empForm,
                              portal_credentials: { ...empForm.portal_credentials, role: e.target.value },
                            })
                          }
                          className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                        >
                          <option value="operator">{tBilingual('Operator / Technician', 'ফ্লোর অপারেটর')}</option>
                          <option value="designer">{tBilingual('Graphic Designer', 'ডিজাইনার')}</option>
                          <option value="sales">{tBilingual('Sales Executive', 'সেলস এক্সিকিউটিভ')}</option>
                          <option value="accounts">{tBilingual('Accountant / Billing', 'অ্যাকাউন্ট্যান্ট')}</option>
                          <option value="manager">{tBilingual('Branch Manager', 'ব্রাঞ্চ ম্যানেজার')}</option>
                        </select>
                      </div>

                      <div className="col-span-1 sm:col-span-2 lg:col-span-4 pt-2 border-t border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={empForm.portal_credentials.send_invitation !== false}
                            onChange={(e) =>
                              setEmpForm({
                                ...empForm,
                                portal_credentials: {
                                  ...empForm.portal_credentials,
                                  send_invitation: e.target.checked,
                                },
                              })
                            }
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                            {tBilingual('Send invitation link to employee email upon enrollment', 'নিবন্ধনের সাথে কর্মীর ইমেইলে আমন্ত্রণ লিংক পাঠান')}
                          </span>
                        </label>
                        <span className="text-2xs text-blue-700/80 dark:text-blue-300">
                          {tBilingual('Employee can log in using email, username or mobile', 'কর্মী ইমেইল, ইউজারনেম বা মোবাইল দিয়ে লগইন করতে পারবেন')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Media & Identity Document Scans (Multiple) Dropzone & File Suite */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                        {tBilingual('Media & Identity Documents (Multiple Scans)', 'জাতীয় পরিচয়পত্র ও ডকুমেন্ট স্ক্যান')}
                      </h5>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        {tBilingual(
                          'Attach NID card scans, passport, joining contract, educational certificates or CV',
                          'ভোটার আইডি, পাসপোর্ট, নিয়োগ চুক্তি ও শিক্ষাগত সনদপত্র যুক্ত করুন'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label
                        htmlFor="multi-doc-upload"
                        className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-xs hover:bg-blue-100 dark:hover:bg-blue-900/50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>{tBilingual('Upload Files', 'ফাইল আপলোড')}</span>
                      </label>
                      <input
                        id="multi-doc-upload"
                        type="file"
                        multiple
                        accept=".pdf,image/png,image/jpeg,image/webp,image/jpg,.doc,.docx,.xls,.xlsx"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            handleDocumentFiles(e.target.files)
                            e.target.value = ''
                          }
                        }}
                      />

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const newDoc = {
                            id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
                            name: `Document_${empForm.document_attachments.length + 1}.pdf`,
                            type: 'National ID / Smart Card',
                            size: 'Manual Entry',
                            uploaded_at: new Date().toISOString(),
                          }
                          setEmpForm({
                            ...empForm,
                            document_attachments: [...empForm.document_attachments, newDoc],
                          })
                        }}
                        className="text-xs h-7 gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span className="hidden sm:inline">{tBilingual('Add Row', 'সারি')}</span>
                      </Button>
                    </div>
                  </div>

                  {/* Interactive Drag & Drop Area */}
                  <div
                    onDragOver={(e) => {
                      e.preventDefault()
                      setIsDragOverDocs(true)
                    }}
                    onDragLeave={() => setIsDragOverDocs(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setIsDragOverDocs(false)
                      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                        handleDocumentFiles(e.dataTransfer.files)
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all flex flex-col items-center justify-center gap-2 ${
                      isDragOverDocs
                        ? 'border-blue-500 bg-blue-500/10 dark:bg-blue-950/40 scale-[0.99]'
                        : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 hover:border-blue-400 hover:bg-blue-50/30'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {tBilingual('Drag & drop document scans here, or', 'ডকুমেন্ট ফাইল টেনে এখানে ফেলুন, অথবা')}{' '}
                        <label
                          htmlFor="multi-doc-upload"
                          className="text-blue-600 dark:text-blue-400 underline cursor-pointer hover:text-blue-700 font-bold"
                        >
                          {tBilingual('click to browse', 'ক্লিক করুন')}
                        </label>
                      </p>
                      <p className="text-2xs text-slate-400 mt-0.5">
                        PDF, JPG, PNG, WEBP, DOCX (Up to 10MB per file • Multi-file upload supported)
                      </p>
                    </div>
                  </div>

                  {/* Document List */}
                  <div className="space-y-2 pt-1">
                    {empForm.document_attachments.length === 0 ? (
                      <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50/50 dark:bg-slate-900/30 rounded-lg border border-slate-100 dark:border-slate-800">
                        {tBilingual(
                          'No document scans attached yet. Use the upload area above to attach NID or contract scans.',
                          'কোনো ডকুমেন্ট স্ক্যান সংযুক্ত নেই। উপরে ফাইল আপলোড করুন।'
                        )}
                      </p>
                    ) : (
                      empForm.document_attachments.map((doc, idx) => {
                        const isImage =
                          doc.url?.startsWith('data:image') ||
                          Boolean(doc.name && doc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
                        const isPdf =
                          doc.url?.startsWith('data:application/pdf') ||
                          Boolean(doc.name && doc.name.match(/\.pdf$/i))

                        return (
                          <div
                            key={doc.id || idx}
                            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition-all hover:border-slate-300 dark:hover:border-slate-700"
                          >
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              {/* Thumbnail / Icon */}
                              {isImage && doc.url ? (
                                <img
                                  src={doc.url}
                                  alt={doc.name}
                                  className="w-10 h-10 rounded-lg object-cover ring-1 ring-blue-500/30 shrink-0 cursor-pointer shadow-xs"
                                  onClick={() => setPreviewDoc(doc)}
                                />
                              ) : (
                                <div
                                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
                                    isPdf
                                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-900'
                                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-900'
                                  }`}
                                >
                                  {isPdf ? 'PDF' : <FileCheck className="w-5 h-5" />}
                                </div>
                              )}

                              <div className="flex-1 min-w-0 space-y-1">
                                <Input
                                  placeholder="Document name"
                                  value={doc.name}
                                  onChange={(e) => {
                                    const updated = [...empForm.document_attachments]
                                    updated[idx] = { ...updated[idx], name: e.target.value }
                                    setEmpForm({ ...empForm, document_attachments: updated })
                                  }}
                                  className="h-7 text-xs px-2 font-medium"
                                />
                                <div className="flex items-center gap-2 text-2xs text-slate-400">
                                  {doc.size && (
                                    <span className="font-mono bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-300 font-semibold">
                                      {doc.size}
                                    </span>
                                  )}
                                  <span>{doc.url ? '✓ Media file attached' : 'Record only'}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <select
                                value={doc.type}
                                onChange={(e) => {
                                  const updated = [...empForm.document_attachments]
                                  updated[idx] = { ...updated[idx], type: e.target.value }
                                  setEmpForm({ ...empForm, document_attachments: updated })
                                }}
                                className="h-7 text-xs px-2 rounded-md border border-input bg-background text-foreground"
                              >
                                <option value="National ID / Smart Card">NID / Smart Card (জাতীয় পরিচয়পত্র)</option>
                                <option value="International Passport">Passport (পাসপোর্ট)</option>
                                <option value="Employment Contract">Appointment Contract (নিয়োগ চুক্তি)</option>
                                <option value="Educational Certificate">Educational Certificate (সনদপত্র)</option>
                                <option value="Driving / Trade License">Driving / Trade License (লাইসেন্স)</option>
                                <option value="Police Clearance / Reference">Police Clearance (চারিত্রিক সনদ)</option>
                                <option value="Resume / CV">Resume / CV (জীবনবৃত্তান্ত)</option>
                                <option value="Other">Other Document (অন্যান্য)</option>
                              </select>

                              {doc.url && (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewDoc(doc)}
                                  className="h-7 px-2 text-xs gap-1 text-blue-600 dark:text-blue-400"
                                  title="Preview Document"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">Preview</span>
                                </Button>
                              )}

                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEmpForm({
                                    ...empForm,
                                    document_attachments: empForm.document_attachments.filter((_, i) => i !== idx),
                                  })
                                }}
                                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50"
                                title="Remove Document"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </div>

                {/* Emergency Contact */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      {tBilingual('Emergency Kin / Contact Person Details', 'জরুরি যোগাযোগ ও আত্মীয়ের বিবরণ')}
                    </h5>
                    <span className="text-2xs text-slate-400">Required for shop-floor safety protocol</span>
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
                        <option value="Spouse">{tBilingual('Spouse', 'স্ত্রী/স্বামী')}</option>
                        <option value="Father">{tBilingual('Father', 'পিতা')}</option>
                        <option value="Mother">{tBilingual('Mother', 'মাতা')}</option>
                        <option value="Brother">{tBilingual('Brother', 'ভাই')}</option>
                        <option value="Sister">{tBilingual('Sister', 'বোন')}</option>
                        <option value="Son/Daughter">{tBilingual('Son / Daughter', 'সন্তান')}</option>
                        <option value="Guardian/Friend">{tBilingual('Guardian / Friend', 'অভিভাবক / বন্ধু')}</option>
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
              <div>
                {modalTab !== 'personal' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const tabs: ('personal' | 'role' | 'duty' | 'salary' | 'banking' | 'access_docs')[] = [
                        'personal',
                        'role',
                        'duty',
                        'salary',
                        'banking',
                        'access_docs',
                      ]
                      const currentIndex = tabs.indexOf(modalTab)
                      if (currentIndex > 0) setModalTab(tabs[currentIndex - 1])
                    }}
                    className="text-xs h-9 gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    {tBilingual('Previous', 'পূর্ববর্তী')}
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {modalTab !== 'access_docs' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (modalTab === 'personal' && (!empForm.name.trim() || !empForm.mobile.trim())) {
                        notify('Please enter employee name and mobile number.')
                        return
                      }
                      const tabs: ('personal' | 'role' | 'duty' | 'salary' | 'banking' | 'access_docs')[] = [
                        'personal',
                        'role',
                        'duty',
                        'salary',
                        'banking',
                        'access_docs',
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

                {modalTab === 'access_docs' && (
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
                )}
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
                  className="font-mono text-2xs px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700"
                >
                  {selectedEmployee.employee_id_number}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-2xs px-2.5 py-0.5 capitalize font-semibold ${
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
                {selectedEmployee.profile_picture_url ? (
                  <img
                    src={selectedEmployee.profile_picture_url}
                    alt={selectedEmployee.name}
                    className="w-14 h-14 rounded-2xl object-cover ring-2 ring-blue-500/30 shadow-md shrink-0"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md ring-2 ring-blue-500/30 shrink-0">
                    {selectedEmployee.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                      {selectedEmployee.name}
                    </h3>
                    <Badge variant="outline" className="bg-white/80 dark:bg-slate-900/80 text-xs px-2 py-0.5 capitalize text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700">
                      {selectedEmployee.role}
                    </Badge>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-xs px-2 py-0.5 capitalize">
                      {selectedEmployee.employee_type.replace('_', ' ')}
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
                    {selectedEmployee.contract_end_date && (
                      <>
                        <span>•</span>
                        <span className="text-amber-600 dark:text-amber-400 font-medium">
                          Contract Ends: {formatDate(selectedEmployee.contract_end_date)}
                        </span>
                      </>
                    )}
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
                <span className="text-2xs text-slate-500 uppercase font-medium block">
                  {tBilingual('Base Pay / Rate', 'মূল বেতন')}
                </span>
                <div className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5 font-mono">
                  {selectedEmployee.salary_basis === 'daily_rate'
                    ? `${formatBDT(selectedEmployee.daily_rate || 0)} / day`
                    : selectedEmployee.salary_basis === 'hourly_rate'
                    ? `${formatBDT(selectedEmployee.hourly_rate || 0)} / hr`
                    : `${formatBDT(selectedEmployee.base_salary || 0)} / mo`}
                </div>
                <span className="text-2xs text-slate-400 block mt-0.5">
                  {selectedEmployee.salary_basis === 'daily_rate'
                    ? `~${formatBDT((selectedEmployee.daily_rate || 0) * 26)} est. monthly`
                    : `Gross Annual: ${formatBDT((selectedEmployee.base_salary || 0) * 12)}`}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-2xs text-slate-500 uppercase font-medium block">
                  {tBilingual('Hourly Regular Rate', 'ঘণ্টাপ্রতি সাধারণ রেট')}
                </span>
                <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5 font-mono">
                  {formatBDT(selectedEmployee.hourly_rate || (selectedEmployee.base_salary ? Math.round(selectedEmployee.base_salary / 208) : 0))} / hr
                </div>
                <span className="text-2xs text-slate-400 block mt-0.5">
                  208 standard monthly work hours
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 shadow-xs">
                <span className="text-2xs text-amber-700 dark:text-amber-400 uppercase font-medium block">
                  {tBilingual('Overtime Hourly Rate', 'ওভারটাইম ঘণ্টার রেট')}
                </span>
                <div className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5 font-mono">
                  {formatBDT(selectedEmployee.overtime_hourly_rate || (selectedEmployee.hourly_rate ? Math.round(selectedEmployee.hourly_rate * 1.5) : 0))} / hr
                </div>
                <span className="text-2xs text-amber-600/80 block mt-0.5">
                  {selectedEmployee.duty_settings?.ot_calc_type || '1.5x Regular Day Standard'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xs">
                <span className="text-2xs text-slate-500 uppercase font-medium block">
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
                <span className="text-2xs text-slate-400 block mt-0.5">
                  {Number(selectedEmployee.current_advance_balance || 0) > 0
                    ? 'Pending payroll deduction'
                    : 'All advances cleared'}
                </span>
              </div>
            </div>

            {/* Dossier Tabs Navigation */}
            <div className="bg-slate-50/80 dark:bg-slate-900/60 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {[
                { id: 'overview', title: '1. Overview & Bio', title_bn: 'একনজরে বিবরণ', icon: UserCheck },
                { id: 'duty', title: '2. Duty & Attendance', title_bn: 'ডিউটি ও সময়সূচি', icon: Clock },
                { id: 'compensation', title: '3. Salary & Commission', title_bn: 'বেতন ও কমিশন', icon: Calculator },
                { id: 'payment', title: '4. Bank & MFS', title_bn: 'ব্যাংক ও ওয়ালেট', icon: CreditCard },
                { id: 'idcard', title: '5. Digital ID Pass', title_bn: 'ডিজিটাল আইডি', icon: Sparkles },
                { id: 'notes', title: '6. Login & Docs', title_bn: 'লগইন ও ডকুমেন্টস', icon: Key },
              ].map((tab) => {
                const isActive = drawerTab === tab.id
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setDrawerTab(tab.id as any)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex-1 justify-center ${
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

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Educational Qualification:', 'শিক্ষাগত যোগ্যতা:')}</span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {selectedEmployee.educational_qualification || 'Diploma in Printing / SSC / HSC'}
                      </span>
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <div>
                        <span className="text-slate-500 block text-2xs">{tBilingual('Present Address:', 'বর্তমান ঠিকানা:')}</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {selectedEmployee.address || tBilingual('Arambagh / Motijheel Production Zone, Dhaka', 'আরামবাগ / মতিঝিল কারখানা এলাকা, ঢাকা')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-500 block text-2xs">{tBilingual('Permanent Address:', 'স্থায়ী ঠিকানা:')}</span>
                        <span className="text-slate-800 dark:text-slate-200">
                          {selectedEmployee.permanent_address || selectedEmployee.address || tBilingual('Same as Present Address', 'বর্তমান ঠিকানার মতো')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role, Contract & Emergency Kin */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                    {tBilingual('Employment Contract & Kin Protocol', 'চুক্তি ও জরুরি যোগাযোগ')}
                  </h4>
                  <div className="space-y-2 text-slate-600 dark:text-slate-400">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Employment Type:', 'চুক্তির ধরন:')}</span>
                      <Badge variant="outline" className="bg-slate-50 dark:bg-slate-900 text-2xs px-2 py-0.5 capitalize">
                        {selectedEmployee.employee_type.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">{tBilingual('Allowed Monthly Paid Leaves:', 'মাসিক অনুমোদিত ছুটি:')}</span>
                      <span className="font-semibold text-slate-900 dark:text-white font-mono">
                        {selectedEmployee.allowed_monthly_leaves ?? 2} {tBilingual('Days / Month', 'দিন / মাস')}
                      </span>
                    </div>

                    {selectedEmployee.contract_end_date && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Contract Expiry Date:', 'চুক্তির মেয়াদ শেষ:')}</span>
                        <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">
                          {formatDate(selectedEmployee.contract_end_date)}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Emergency Kin:', 'জরুরি যোগাযোগ:')}</span>
                        <span className="font-semibold text-slate-900 dark:text-white">
                          {selectedEmployee.emergency_contact_name || 'N/A'} ({selectedEmployee.emergency_contact_relation || 'Spouse'})
                        </span>
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
                    </div>

                    <div className="p-2.5 rounded-lg bg-emerald-500/5 dark:bg-emerald-950/20 border border-emerald-500/20 text-2xs text-emerald-700 dark:text-emerald-400 mt-2">
                      {tBilingual(
                        'Verified for shop-floor incident escalation & medical notification protocol.',
                        'কারখানা দুর্ঘটনা ও জরুরি সহায়তার জন্য তথ্য সংরক্ষিত আছে।'
                      )}
                    </div>
                  </div>
                </div>

                {/* Portal Access Quick Card */}
                <div className="col-span-1 sm:col-span-2 p-3.5 rounded-xl border border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                      <Key className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {tBilingual('Employee Login Credentials', 'কর্মীর সফটওয়্যার লগইন তথ্য')}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            selectedEmployee.portal_credentials?.create_login
                              ? selectedEmployee.portal_credentials?.status === 'invited'
                                ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                          }
                        >
                          {selectedEmployee.portal_credentials?.create_login
                            ? selectedEmployee.portal_credentials?.status === 'invited'
                              ? tBilingual('Invitation Sent', 'আমন্ত্রণ পাঠানো হয়েছে')
                              : tBilingual('Login Active', 'লগইন সক্রিয়')
                            : tBilingual('No Portal Access', 'এক্সেস নেই')}
                        </Badge>
                      </div>
                      <span className="text-2xs text-slate-500 block mt-0.5">
                        {selectedEmployee.portal_credentials?.create_login
                          ? `${tBilingual('Username/Email:', 'ইউজারনেম/ইমেইল:')} ${selectedEmployee.portal_credentials.email || selectedEmployee.portal_credentials.username || selectedEmployee.email || selectedEmployee.mobile}`
                          : tBilingual('Enable portal login to send invitation link for shop-floor & ERP access.', 'কারখানা ও সফটওয়্যার এক্সেসের জন্য লগইন চালু করুন ও আমন্ত্রণ পাঠান।')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {selectedEmployee.portal_credentials?.create_login && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs gap-1.5 bg-white dark:bg-slate-900 border-blue-200 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        onClick={() => handleSendInvitation(selectedEmployee)}
                        disabled={isInviting}
                      >
                        {isInviting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        <span>{tBilingual('Send Invite Link', 'আমন্ত্রণ পাঠান')}</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs gap-1 text-slate-700 dark:text-slate-300"
                      onClick={() => setDrawerTab('notes')}
                    >
                      <span>{tBilingual('Manage Credentials', 'লগইন ম্যানেজ')}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: DUTY, ATTENDANCE & OVERTIME SETTINGS */}
            {drawerTab === 'duty' && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Shift Timings Card */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                    <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Duty & Shift Schedule', 'ডিউটি ও শিফট সময়সূচি')}
                    </h4>
                    <div className="space-y-2 text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Office Timings:', 'অফিস সময়:')}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {selectedEmployee.duty_settings?.office_start_time || '09:00'} - {selectedEmployee.duty_settings?.office_end_time || '18:00'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Daily Duty Hours:', 'দৈনিক ডিউটি ঘণ্টা:')}</span>
                        <span className="font-mono font-semibold text-slate-900 dark:text-white">
                          {selectedEmployee.duty_settings?.daily_duty_hours || 9} Hours
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Late Grace Period:', 'বিলম্ব ছাড়:')}</span>
                        <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                          {selectedEmployee.duty_settings?.late_grace_minutes || 15} Mins
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Weekly Off Day:', 'সাপ্তাহিক ছুটি:')}</span>
                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold">
                          {selectedEmployee.duty_settings?.weekly_off_day || 'Friday'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Overtime & Deduction Rules */}
                  <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-950/20 space-y-3">
                    <h4 className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 border-b border-amber-500/20 pb-2">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      {tBilingual('Overtime & Deduction Rules', 'ওভারটাইম ও কর্তন পলিসি')}
                    </h4>
                    <div className="space-y-2 text-slate-700 dark:text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('OT Calc Type:', 'ওভারটাইম হিসাব:')}</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-300 capitalize">
                          {selectedEmployee.duty_settings?.ot_calc_type?.replace('_', ' ') || '1.5x Standard'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('OT Hourly Rate:', 'ওভারটাইম রেট:')}</span>
                        <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                          {formatBDT(selectedEmployee.duty_settings?.overtime_rate_value || selectedEmployee.overtime_hourly_rate || 0)} / hr
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Absent Deduction:', 'অনুপস্থিতি কর্তন:')}</span>
                        <Badge
                          variant="outline"
                          className={
                            selectedEmployee.duty_settings?.absent_deduction_allowed !== false
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-100 text-slate-600'
                          }
                        >
                          {selectedEmployee.duty_settings?.absent_deduction_allowed !== false ? tBilingual('Enabled', 'কর্তন প্রযোজ্য') : tBilingual('Disabled', 'নিষ্ক্রিয়')}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{tBilingual('Late Fine Policy:', 'দেরির জরিমানা:')}</span>
                        <span className="font-medium text-rose-700 dark:text-rose-300">
                          {selectedEmployee.duty_settings?.late_fine_enabled !== false
                            ? selectedEmployee.duty_settings?.late_fine_policy === '3_late_1_day_salary'
                              ? '3 Lates = 1 Day Salary Deduction'
                              : `Fixed ${formatBDT(selectedEmployee.duty_settings?.late_fine_amount || 100)} / late`
                            : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: COMPENSATION & STATUTORY STRUCTURE */}
            {drawerTab === 'compensation' && (
              <div className="space-y-4 text-xs">
                {/* Statutory Breakdown Cards */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                    <h5 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-blue-600" />
                      {tBilingual('Bangladesh Labor Law Statutory Structure (60-20-10-10)', 'বাংলাদেশ শ্রম আইন অনুযায়ী বেতন বিশ্লেষণ')}
                    </h5>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 text-2xs">
                      {selectedEmployee.salary_basis.replace('_', ' ').toUpperCase()}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Basic Salary (60%)', 'মূল বেতন (৬০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.basic || Math.round((selectedEmployee.base_salary || 0) * 0.6))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('House Rent (20%)', 'বাড়ি ভাড়া (২০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.house_allowance || Math.round((selectedEmployee.base_salary || 0) * 0.2))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Medical Allowance (10%)', 'চিকিৎসা ভাতা (১০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.medical_allowance || Math.round((selectedEmployee.base_salary || 0) * 0.1))}
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                      <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Conveyance Allowance (10%)', 'যাতায়াত ভাতা (১০%)')}</span>
                      <span className="text-base font-bold text-slate-900 dark:text-white font-mono mt-0.5 block">
                        {formatBDT(selectedEmployee.salary_structure?.transport_allowance || Math.round((selectedEmployee.base_salary || 0) * 0.1))}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Commission & Target Settings Section */}
                <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                    <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-indigo-600" />
                      {tBilingual('Commission & Monthly Sales Target', 'কমিশন ও মাসিক সেলস টার্গেট')}
                    </h5>
                    <Badge
                      variant="outline"
                      className={
                        selectedEmployee.commission_settings?.enabled
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-slate-100 text-slate-600'
                      }
                    >
                      {selectedEmployee.commission_settings?.enabled ? 'Commission Active' : 'No Commission'}
                    </Badge>
                  </div>

                  {selectedEmployee.commission_settings?.enabled ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-500/10">
                        <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Commission Type', 'কমিশনের ধরন')}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block capitalize">
                          {selectedEmployee.commission_settings.type === 'percentage' ? 'Percentage of Sales' : 'Fixed per Unit'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-500/10">
                        <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Commission Rate', 'কমিশন রেট')}</span>
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mt-0.5 block font-mono">
                          {selectedEmployee.commission_settings.rate_pct || 2}%
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/80 border border-indigo-500/10">
                        <span className="text-2xs text-slate-500 block uppercase font-medium">{tBilingual('Monthly Sales Target', 'মাসিক টার্গেট')}</span>
                        <span className="text-xs font-bold text-slate-900 dark:text-white mt-0.5 block font-mono">
                          {formatBDT(selectedEmployee.commission_settings.monthly_target || 100000)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-2xs text-slate-500 italic">
                      {tBilingual('This employee does not have active sales commission incentives configured.', 'এই কর্মীর জন্য সেলস কমিশন সক্রিয় নয়।')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: BANK & MFS CHANNELS */}
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

                    <div className="p-2.5 rounded-lg bg-blue-500/5 dark:bg-blue-950/20 border border-blue-500/20 text-2xs text-blue-700 dark:text-blue-400 mt-2">
                      {tBilingual(
                        '1-click wage and advance disbursement enabled for this MFS number.',
                        'এই মোবাইল ওয়ালেটে সরাসরি বেতন ও অগ্রিম পাঠানো সম্ভব।'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DIGITAL SECURITY ID PASS */}
            {drawerTab === 'idcard' && (
              <div className="space-y-4 pt-1 flex flex-col items-center">
                {/* Physical ID Card Mockup Frame */}
                <div className="w-full max-w-md p-5 rounded-2xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 shadow-xl space-y-4 text-center relative overflow-hidden">
                  {/* Card Security Header Stripe */}
                  <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 -mx-5 -mt-5 p-3 text-white flex items-center justify-between px-4">
                    <div className="text-left">
                      <span className="text-2xs uppercase font-bold tracking-wider opacity-90 block">InkFlow ERP Security Pass</span>
                      <span className="text-xs font-black tracking-wide">PRODUCTION FLOOR PASS</span>
                    </div>
                    <ShieldCheck className="w-5 h-5 text-white/90" />
                  </div>

                  {/* Avatar & Monogram */}
                  <div className="pt-2 flex justify-center">
                    {selectedEmployee.profile_picture_url ? (
                      <img
                        src={selectedEmployee.profile_picture_url}
                        alt={selectedEmployee.name}
                        className="w-20 h-20 rounded-2xl object-cover shadow-lg ring-4 ring-blue-500/20"
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-blue-500/20">
                        {selectedEmployee.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
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

                  <div className="grid grid-cols-2 gap-2 text-2xs text-left border-y border-slate-100 dark:border-slate-800 py-3">
                    <div>
                      <span className="text-slate-400 block text-2xs">EMPLOYEE ID</span>
                      <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedEmployee.employee_id_number}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs">DEPARTMENT</span>
                      <span className="font-semibold text-slate-900 dark:text-white capitalize">{selectedEmployee.department}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs">JOINED DATE</span>
                      <span className="font-mono text-slate-900 dark:text-white">{formatDate(selectedEmployee.joining_date)}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-2xs">EMERGENCY HELPLINE</span>
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
                    <span className="text-2xs font-mono text-slate-400 tracking-widest uppercase">
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

            {/* TAB 6: DOCS, PORTAL ACCESS & HR NOTES */}
            {drawerTab === 'notes' && (
              <div className="space-y-4 text-xs">
                {/* Media & Identity Document Scans (Multiple) */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-3">
                  <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800 pb-2">
                    <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                    {tBilingual('Media & Identity Documents (Scans Attached)', 'জাতীয় পরিচয়পত্র ও ডকুমেন্ট স্ক্যান')}
                  </h4>
                  {selectedEmployee.document_attachments && selectedEmployee.document_attachments.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedEmployee.document_attachments.map((doc, idx) => {
                        const isImage =
                          doc.url?.startsWith('data:image') ||
                          Boolean(doc.name && doc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i))
                        const isPdf =
                          doc.url?.startsWith('data:application/pdf') ||
                          Boolean(doc.name && doc.name.match(/\.pdf$/i))

                        return (
                          <div
                            key={doc.id || idx}
                            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              {isImage && doc.url ? (
                                <img
                                  src={doc.url}
                                  alt={doc.name}
                                  className="w-9 h-9 rounded-lg object-cover ring-1 ring-blue-500/30 shrink-0 cursor-pointer"
                                  onClick={() => setPreviewDoc(doc)}
                                />
                              ) : (
                                <div
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                    isPdf
                                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-900'
                                      : 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 border border-blue-200 dark:border-blue-900'
                                  }`}
                                >
                                  {isPdf ? 'PDF' : <FileCheck className="w-4 h-4 text-blue-600" />}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 dark:text-white truncate text-xs">{doc.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <Badge variant="outline" className="text-2xs px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
                                    {doc.type}
                                  </Badge>
                                  {doc.size && <span className="text-2xs text-slate-400 font-mono">{doc.size}</span>}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              {doc.url && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2 gap-1 text-blue-600 dark:text-blue-400"
                                  onClick={() => setPreviewDoc(doc)}
                                  title="View Document"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View</span>
                                </Button>
                              )}
                              {doc.url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                  asChild
                                >
                                  <a href={doc.url} download={doc.name} target="_blank" rel="noreferrer" title="Download Document">
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-slate-500 italic py-1">
                      {tBilingual('No document attachments uploaded for this employee.', 'কোনো ডকুমেন্ট স্ক্যান যুক্ত নেই।')}
                    </p>
                  )}
                </div>

                {/* Portal Login Account Credentials Card */}
                <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 dark:bg-blue-950/20 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-blue-500/20 pb-2.5">
                    <div>
                      <h4 className="font-bold text-blue-900 dark:text-blue-300 flex items-center gap-1.5">
                        <Key className="w-4 h-4 text-blue-600" />
                        {tBilingual('Login Account Credentials', 'সফটওয়্যার পোর্টাল লগইন ও নিরাপত্তা')}
                      </h4>
                      <p className="text-2xs text-slate-500 mt-0.5">
                        {tBilingual(
                          'Configure employee authentication credentials and dispatch secure invite links',
                          'কর্মীর সফটওয়্যার লগইন অ্যাকাউন্ট ও ইমেইল আমন্ত্রণ লিংক নিয়ন্ত্রণ করুন'
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          selectedEmployee.portal_credentials?.create_login
                            ? selectedEmployee.portal_credentials?.status === 'invited'
                              ? 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 font-bold'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 font-bold'
                            : 'bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-400'
                        }
                      >
                        {selectedEmployee.portal_credentials?.create_login
                          ? selectedEmployee.portal_credentials?.status === 'invited'
                            ? 'Invitation Sent'
                            : 'Login Active'
                          : 'No Portal Access'}
                      </Badge>

                      {selectedEmployee.portal_credentials?.create_login ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs px-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950"
                          onClick={() => handleTogglePortalAccess(false)}
                          disabled={isSavingCreds}
                        >
                          {tBilingual('Revoke Access', 'এক্সেস বন্ধ')}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs px-2.5 bg-blue-600 text-white hover:bg-blue-700 border-none"
                          onClick={() => {
                            setCredsForm({
                              create_login: true,
                              email: selectedEmployee.email || `${selectedEmployee.mobile}@company.local`,
                              username: selectedEmployee.name.toLowerCase().replace(/\s+/g, '.'),
                              password: `InkFlow@${Math.floor(100000 + Math.random() * 900000)}`,
                              role: selectedEmployee.role ? selectedEmployee.role.toLowerCase() : 'operator',
                              send_invitation: true,
                            })
                            setIsEditingCredentials(true)
                          }}
                        >
                          {tBilingual('Enable Portal Login', 'লগইন চালু করুন')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Credentials Content */}
                  {selectedEmployee.portal_credentials?.create_login && !isEditingCredentials ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-2xs text-slate-500 uppercase font-semibold block">
                            {tBilingual('Login Email', 'লগইন ইমেইল')}
                          </span>
                          <div className="flex items-center justify-between gap-1.5 mt-1">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                              {selectedEmployee.portal_credentials.email || selectedEmployee.email || '—'}
                            </span>
                            {(selectedEmployee.portal_credentials.email || selectedEmployee.email) && (
                              <button
                                type="button"
                                onClick={() => {
                                  const val = selectedEmployee.portal_credentials?.email || selectedEmployee.email || ''
                                  navigator.clipboard?.writeText(val)
                                  triggerCopy('login_email')
                                }}
                                className="text-slate-400 hover:text-blue-600"
                                title="Copy Email"
                              >
                                {copiedField === 'login_email' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-2xs text-slate-500 uppercase font-semibold block">
                            {tBilingual('Login Username', 'লগইন ইউজারনেম')}
                          </span>
                          <div className="flex items-center justify-between gap-1.5 mt-1">
                            <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 truncate">
                              {selectedEmployee.portal_credentials.username || '—'}
                            </span>
                            {selectedEmployee.portal_credentials.username && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(selectedEmployee.portal_credentials?.username || '')
                                  triggerCopy('login_user')
                                }}
                                className="text-slate-400 hover:text-blue-600"
                                title="Copy Username"
                              >
                                {copiedField === 'login_user' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-2xs text-slate-500 uppercase font-semibold block">
                            {tBilingual('Login Mobile', 'লগইন মোবাইল')}
                          </span>
                          <div className="flex items-center justify-between gap-1.5 mt-1">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white truncate">
                              {selectedEmployee.mobile || '—'}
                            </span>
                            {selectedEmployee.mobile && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(selectedEmployee.mobile || '')
                                  triggerCopy('login_mobile')
                                }}
                                className="text-slate-400 hover:text-blue-600"
                                title="Copy Mobile"
                              >
                                {copiedField === 'login_mobile' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-2xs text-slate-500 uppercase font-semibold block">
                            {tBilingual('Assigned Portal Role', 'পোর্টাল রোল')}
                          </span>
                          <div className="mt-1">
                            <Badge variant="outline" className="capitalize bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 font-bold text-xs">
                              {selectedEmployee.portal_credentials.role || 'Operator'}
                            </Badge>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                          <span className="text-2xs text-slate-500 uppercase font-semibold block">
                            {tBilingual('Invitation Status', 'আমন্ত্রণ স্ট্যাটাস')}
                          </span>
                          <div className="mt-1 flex items-center justify-between">
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {selectedEmployee.portal_credentials.last_invite_sent_at
                                ? `${tBilingual('Sent:', 'পাঠানো হয়েছে:')} ${formatDate(selectedEmployee.portal_credentials.last_invite_sent_at)}`
                                : tBilingual('Ready to invite', 'আমন্ত্রণের জন্য প্রস্তুত')}
                            </span>
                            {selectedEmployee.portal_credentials.invite_link && (
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(selectedEmployee.portal_credentials?.invite_link || '')
                                  triggerCopy('invite_link_card')
                                  notify('Invitation link copied to clipboard!')
                                }}
                                className="text-blue-600 hover:underline text-2xs font-semibold flex items-center gap-0.5"
                                title="Copy Last Invitation Link"
                              >
                                {copiedField === 'invite_link_card' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                <span>Copy Link</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold shadow-xs"
                          onClick={() => handleSendInvitation(selectedEmployee)}
                          disabled={isInviting}
                        >
                          {isInviting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{tBilingual('Sending Invitation...', 'পাঠানো হচ্ছে...')}</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3.5 h-3.5" />
                              <span>{tBilingual('Send Invitation Link to Employee Email', 'কর্মীর ইমেইলে আমন্ত্রণ লিংক পাঠান')}</span>
                            </>
                          )}
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
                          onClick={() => {
                            setCredsForm({
                              create_login: true,
                              email: selectedEmployee.portal_credentials?.email || selectedEmployee.email || '',
                              username: selectedEmployee.portal_credentials?.username || selectedEmployee.name.toLowerCase().replace(/\s+/g, '.'),
                              password: selectedEmployee.portal_credentials?.password || '',
                              role: selectedEmployee.portal_credentials?.role || 'operator',
                              send_invitation: true,
                            })
                            setIsEditingCredentials(true)
                          }}
                        >
                          <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{tBilingual('Edit Credentials / Reset Password', 'পাসওয়ার্ড ও তথ্য পরিবর্তন')}</span>
                        </Button>

                        {selectedEmployee.portal_credentials?.invite_link && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 text-xs gap-1 text-slate-600 dark:text-slate-300"
                            onClick={() => {
                              setInviteModalData({
                                isOpen: true,
                                inviteUrl: selectedEmployee.portal_credentials!.invite_link!,
                                email: selectedEmployee.portal_credentials?.email || selectedEmployee.email || '',
                                employeeName: selectedEmployee.name,
                                roleName: selectedEmployee.portal_credentials?.role || 'Operator',
                              })
                            }}
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-blue-500" />
                            <span>{tBilingual('View Invite Details', 'আমন্ত্রণ বিবরণ দেখুন')}</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : selectedEmployee.portal_credentials?.create_login && isEditingCredentials ? (
                    /* Inline Editing Mode */
                    <div className="space-y-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-blue-500/20">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Login Email *', 'লগইন ইমেইল *')}
                          </Label>
                          <Input
                            placeholder="e.g. rahim@company.com"
                            value={credsForm.email}
                            onChange={(e) => setCredsForm({ ...credsForm, email: e.target.value })}
                            className="text-xs h-9"
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Login Username *', 'লগইন ইউজারনেম *')}
                          </Label>
                          <Input
                            placeholder="e.g. rahim.op"
                            value={credsForm.username}
                            onChange={(e) => setCredsForm({ ...credsForm, username: e.target.value.toLowerCase().replace(/\s+/g, '.') })}
                            className="text-xs h-9 font-mono"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {tBilingual('Secure Password', 'পাসওয়ার্ড')}
                            </Label>
                            <button
                              type="button"
                              onClick={() => {
                                const pass = `Pass@${Math.floor(100000 + Math.random() * 900000)}`
                                setCredsForm({ ...credsForm, password: pass })
                              }}
                              className="text-2xs text-blue-600 hover:underline"
                            >
                              Generate
                            </button>
                          </div>
                          <div className="relative">
                            <Input
                              type={showCredsPassword ? 'text' : 'password'}
                              placeholder="Min 6 chars"
                              value={credsForm.password}
                              onChange={(e) => setCredsForm({ ...credsForm, password: e.target.value })}
                              className="text-xs h-9 font-mono pr-8"
                            />
                            <button
                              type="button"
                              onClick={() => setShowCredsPassword(!showCredsPassword)}
                              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                            >
                              {showCredsPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {tBilingual('Assigned Portal Role', 'পোর্টাল রোল')}
                          </Label>
                          <select
                            value={credsForm.role}
                            onChange={(e) => setCredsForm({ ...credsForm, role: e.target.value })}
                            className="w-full h-9 text-xs px-3 rounded-md border border-input bg-background text-foreground"
                          >
                            <option value="operator">{tBilingual('Operator / Technician', 'ফ্লোর অপারেটর')}</option>
                            <option value="designer">{tBilingual('Graphic Designer', 'ডিজাইনার')}</option>
                            <option value="sales">{tBilingual('Sales Executive', 'সেলস এক্সিকিউটিভ')}</option>
                            <option value="accounts">{tBilingual('Accountant / Billing', 'অ্যাকাউন্ট্যান্ট')}</option>
                            <option value="manager">{tBilingual('Branch Manager', 'ব্রাঞ্চ ম্যানেজার')}</option>
                            <option value="general_staff">{tBilingual('General Staff', 'সাধারণ কর্মী')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={credsForm.send_invitation}
                            onChange={(e) => setCredsForm({ ...credsForm, send_invitation: e.target.checked })}
                            className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                          />
                          <span className="text-xs text-slate-700 dark:text-slate-300">
                            {tBilingual('Send invitation link to employee email upon saving', 'সংরক্ষণের সাথে কর্মীর ইমেইলে আমন্ত্রণ লিংক পাঠান')}
                          </span>
                        </label>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs"
                            onClick={() => setIsEditingCredentials(false)}
                            disabled={isSavingCreds}
                          >
                            {tBilingual('Cancel', 'বাতিল')}
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleSaveCredentials}
                            disabled={isSavingCreds}
                          >
                            {isSavingCreds ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                <span>{tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...')}</span>
                              </>
                            ) : (
                              <span>{tBilingual('Save & Apply', 'সংরক্ষণ করুন')}</span>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* No Portal Access Card */
                    <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-center space-y-2.5">
                      <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="font-semibold text-xs text-slate-900 dark:text-white">
                          {tBilingual('No Portal Login Credentials Configured', 'কোনো পোর্টাল লগইন নেই')}
                        </h5>
                        <p className="text-2xs text-slate-500 max-w-sm mx-auto mt-0.5">
                          {tBilingual(
                            'Grant this employee access to the InkFlow shop-floor kiosk, designer portal, or sales workspace by creating credentials.',
                            'এই কর্মীকে কারখানা কিয়স্ক, ডিজাইন বা সেলস পোর্টালে যুক্ত করার জন্য লগইন তৈরি করুন।'
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                        onClick={() => {
                          setCredsForm({
                            create_login: true,
                            email: selectedEmployee.email || `${selectedEmployee.mobile}@company.local`,
                            username: selectedEmployee.name.toLowerCase().replace(/\s+/g, '.'),
                            password: `InkFlow@${Math.floor(100000 + Math.random() * 900000)}`,
                            role: selectedEmployee.role ? selectedEmployee.role.toLowerCase() : 'operator',
                            send_invitation: true,
                          })
                          setIsEditingCredentials(true)
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>{tBilingual('Configure Login & Send Invite', 'লগইন কনফিগার ও আমন্ত্রণ পাঠান')}</span>
                      </Button>
                    </div>
                  )}
                </div>

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
              <div className="text-2xs text-slate-400">
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

      {/* Document Preview Lightbox Modal */}
      {previewDoc && (
        <ModalDialog
          open={!!previewDoc}
          onOpenChange={(open) => {
            if (!open) setPreviewDoc(null)
          }}
          hideFooter={true}
          title={
            <div className="flex items-center justify-between w-full pr-6">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-md">
                  {previewDoc.name}
                </span>
                <Badge variant="outline" className="text-2xs px-1.5 py-0 bg-blue-50 text-blue-700 border-blue-200">
                  {previewDoc.type}
                </Badge>
              </div>
            </div>
          }
          size="4xl"
        >
          <div className="space-y-3">
            <div className="p-2 rounded-xl bg-slate-950 flex items-center justify-center min-h-[360px] max-h-[70vh] overflow-auto">
              {previewDoc.url?.startsWith('data:image') || (previewDoc.name && previewDoc.name.match(/\.(jpg|jpeg|png|webp|gif)$/i)) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.name}
                  className="max-h-[65vh] max-w-full object-contain rounded-lg shadow-lg"
                />
              ) : previewDoc.url?.startsWith('data:application/pdf') || (previewDoc.name && previewDoc.name.match(/\.pdf$/i)) ? (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.name}
                  className="w-full h-[65vh] rounded-lg bg-white"
                />
              ) : (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-slate-500" />
                  <p className="text-sm">Preview not supported directly in browser for this file type.</p>
                  <p className="text-xs text-slate-500">Click Download below to open this document on your device.</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">
                {previewDoc.size ? `File Size: ${previewDoc.size}` : 'Document Attachment'}
              </span>
              <div className="flex items-center gap-2">
                {previewDoc.url && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-8 gap-1.5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                    asChild
                  >
                    <a href={previewDoc.url} download={previewDoc.name} target="_blank" rel="noreferrer">
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPreviewDoc(null)}
                  className="text-xs h-8"
                >
                  Close Preview
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
              <p className="mt-1 text-2xs opacity-90">
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

      {/* Employee Invitation Dispatched Modal */}
      {inviteModalData?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {tBilingual('Invitation Link Dispatched!', 'আমন্ত্রণ লিংক সফলভাবে পাঠানো হয়েছে!')}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {tBilingual('Employee can now accept invite and login', 'কর্মী এখন লিংকে ক্লিক করে সিস্টেমে যুক্ত হতে পারবেন')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInviteModalData(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">{tBilingual('Recipient Employee:', 'কর্মী:')}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{inviteModalData.employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tBilingual('Recipient Email:', 'ইমেইল:')}</span>
                <span className="font-mono font-medium text-slate-800 dark:text-slate-200">{inviteModalData.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">{tBilingual('Assigned Role:', 'রোল:')}</span>
                <Badge variant="outline" className="text-2xs capitalize bg-blue-50 text-blue-700 border-blue-200">
                  {inviteModalData.roleName}
                </Badge>
              </div>
            </div>

            {/* Generated Link Box */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {tBilingual('Direct Invitation URL:', 'সরাসরি আমন্ত্রণ লিংক:')}
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteModalData.inviteUrl}
                  className="font-mono text-xs h-9 bg-slate-50 dark:bg-slate-900 select-all"
                />
                <Button
                  size="sm"
                  className="h-9 px-3 shrink-0 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
                  onClick={() => {
                    navigator.clipboard?.writeText(inviteModalData.inviteUrl)
                    triggerCopy('modal_invite_url')
                    notify('Invitation URL copied to clipboard!')
                  }}
                >
                  {copiedField === 'modal_invite_url' ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedField === 'modal_invite_url' ? 'Copied' : 'Copy'}</span>
                </Button>
              </div>
            </div>

            {/* WhatsApp / SMS Quick Copy */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-8 gap-1.5 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950 flex-1"
                onClick={() => {
                  const msg = `*InkFlow PrintERP Invitation*\nHello ${inviteModalData.employeeName},\nYou have been invited to join the team on InkFlow PrintERP as ${inviteModalData.roleName}.\nClick the secure link below to accept and access your workspace:\n${inviteModalData.inviteUrl}`
                  navigator.clipboard?.writeText(msg)
                  triggerCopy('modal_whatsapp')
                  notify('WhatsApp message template copied!')
                }}
              >
                {copiedField === 'modal_whatsapp' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{tBilingual('Copy WhatsApp Text', 'হোয়াটসঅ্যাপ টেক্সট কপি')}</span>
              </Button>

              <Button
                size="sm"
                variant="default"
                className="text-xs h-8 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900"
                onClick={() => setInviteModalData(null)}
              >
                {tBilingual('Done', 'সম্পন্ন')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function EmployeeListPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-3">
          <Users className="h-6 w-6 text-indigo-500 animate-pulse" />
          <p className="text-xs text-slate-500">Loading Employee Directory...</p>
        </div>
      }
    >
      <EmployeeListContent />
    </React.Suspense>
  )
}

