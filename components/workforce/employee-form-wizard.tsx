'use client'

import React, { useState, useId, useRef } from 'react'
import { useI18n } from '@/i18n/context'
import {
  User,
  Briefcase,
  Wallet,
  Clock,
  CreditCard,
  Key,
  ChevronRight,
  ChevronLeft,
  Check,
  Building,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Shield,
  Calendar,
  RefreshCw,
  Sparkles,
  DollarSign,
  Smartphone,
  Landmark,
  CheckCircle2,
  HeartPulse,
  UserCheck,
  Eye,
  EyeOff,
  Copy,
  FileCheck2,
  FileText,
  BadgeCheck,
  Camera,
  Upload,
  Trash2,
  Plus,
  X,
  ExternalLink,
  File,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type {
  EmployeeRecord,
  EmploymentType,
  SalaryBasis,
  PaymentMethod,
  DocumentAttachment,
  PortalCredentials,
} from '@/types/workforce.types'

export interface EmployeeFormWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: EmployeeRecord | null
  branches?: Array<{ id: string; name: string }>
  onSave: (data: Partial<EmployeeRecord>) => Promise<boolean | void>
}

interface StepMeta {
  id: number
  label: string
  labelBn: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const STEPS: StepMeta[] = [
  { id: 1, label: 'Basic Info', labelBn: 'মৌলিক তথ্য', icon: User, description: 'Personal identity, photo, mobile & addresses' },
  { id: 2, label: 'Employment', labelBn: 'নিয়োগ তথ্য', icon: Briefcase, description: 'Role, department, branch & designation' },
  { id: 3, label: 'Compensation', labelBn: 'বেতন কাঠামো', icon: Wallet, description: 'Salary basis, rate breakdown & OT' },
  { id: 4, label: 'Duty & Rules', labelBn: 'ডিউটি ও নিয়ম', icon: Clock, description: 'Shift timings, grace period & weekly off' },
  { id: 5, label: 'Payment', labelBn: 'পেমেন্ট পদ্ধতি', icon: CreditCard, description: 'Cash, MFS wallet or bank transfer' },
  { id: 6, label: 'Portal Access', labelBn: 'পোর্টাল লগইন', icon: Key, description: 'Credentials, security password & role scope' },
  { id: 7, label: 'Documents & Save', labelBn: 'নথি ও অনুমোদন', icon: BadgeCheck, description: 'Attach NID/contract & 360° profile review' },
]

const DOCUMENT_TYPES = [
  { id: 'nid_front', label: 'NID Front', labelBn: 'এনআইডি সম্মুখ' },
  { id: 'nid_back', label: 'NID Back', labelBn: 'এনআইডি বিপরীত' },
  { id: 'appointment_letter', label: 'Appointment / Contract', labelBn: 'নিয়োগপত্র / চুক্তি' },
  { id: 'resume', label: 'CV / Resume', labelBn: 'জীবনবৃত্তান্ত' },
  { id: 'certificate', label: 'Certificate', labelBn: 'সনদপত্র' },
  { id: 'other', label: 'Other Document', labelBn: 'অন্যান্য নথি' },
]

const ROLE_PERMISSION_DETAILS: Record<string, { title: string; badge: string; scopes: string[] }> = {
  operator: {
    title: 'Production Machine Operator (মেশিন অপারেটর)',
    badge: 'Operator Level',
    scopes: [
      'View assigned job orders & queue',
      'Start/Stop press run timers',
      'Log waste & scrap consumption',
      'Personal attendance & shift check-in',
    ],
  },
  designer: {
    title: 'Graphic Designer & Pre-press (ডিজাইনার)',
    badge: 'Design Studio',
    scopes: [
      'Customer design asset library',
      'Proof generation & approval flow',
      'Pre-press prep & color separation',
      'Design stage progress tracking',
    ],
  },
  manager: {
    title: 'Floor Manager / Supervisor (সুপারভাইজার)',
    badge: 'Supervisory',
    scopes: [
      'Full production scheduling & routing',
      'Attendance & OT approval',
      'Machine maintenance scheduling',
      'Staff task delegation',
    ],
  },
  sales_rep: {
    title: 'Sales & Counter Executive (কাউন্টার সেলস)',
    badge: 'Front Desk',
    scopes: [
      'Order creation & estimation',
      'Customer directory & balance checks',
      'Invoice printing & payment receipt',
      'Counter POS terminal',
    ],
  },
  field_staff: {
    title: 'Field Fitting & Delivery Staff (মাঠকর্মী)',
    badge: 'Field Ops',
    scopes: [
      'Site delivery confirmation',
      'Signage installation sign-off',
      'Geo-tagged mobile check-in',
      'Field expense submission',
    ],
  },
  accounts: {
    title: 'Accounts & Billing Executive (হিসাবরক্ষণ)',
    badge: 'Finance Desk',
    scopes: [
      'Payment vouchers & money receipt',
      'Expense entry & cash drawer balance',
      'Advance salary deduction review',
      'Payroll sheet verification',
    ],
  },
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-']

const DEPARTMENT_ROLES: Record<string, string[]> = {
  printing: [
    'Flex & Banner Machine Master',
    'Eco-Solvent Operator',
    'UV Flatbed & Hybrid Specialist',
    'Industrial Offset Master',
    'Inkjet Printer Operator',
    'Assistant Press Operator',
  ],
  finishing: [
    'Lamination & Pasting Master',
    'Die-Cutting & Creasing Specialist',
    'Eyelet & Seaming Master',
    'Plotter & Vinyl Cutting Operator',
    'Book Binding & Trimming Operator',
  ],
  fabrication: [
    'LED & Acrylic Channel Letter Artisan',
    'Metal Fabrication Craftsman',
    'CNC Router Operator',
    'Laser Cutting Technician',
    'Signboard Assembler',
  ],
  design: [
    'Pre-press & Color Separation Artist',
    'Senior Graphic Visualizer',
    'Layout & Production Designer',
    'Creative Print Designer',
  ],
  installation: [
    'Billboard & Signage Rigger',
    'Vinyl & Wall Sticker Installer',
    'Façade & ACP Installer',
    'Field Operations Fitter',
  ],
  sales: [
    'Counter Sales Executive',
    'Customer Relationship Officer',
    'Estimation & Sales Associate',
  ],
  accounts: [
    'Billing & Cashier',
    'Accounts Executive',
    'Inventory & Costing Assistant',
  ],
  management: [
    'Shop Floor Manager',
    'Production Supervisor',
    'Operations Lead',
  ],
  field_ops: [
    'Delivery Dispatch Specialist',
    'Field Surveyor & Technician',
    'Logistics Coordinator',
  ],
}

function generateEmployeeCode(): string {
  const year = new Date().getFullYear()
  const randomSeq = Math.floor(Math.random() * 9000) + 1000
  return `EMP-${year}-${randomSeq}`
}

export function EmployeeFormWizard({
  open,
  onOpenChange,
  initialData,
  branches = [],
  onSave,
}: EmployeeFormWizardProps) {
  const { tBilingual } = useI18n()
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [sameAsPresentAddress, setSameAsPresentAddress] = useState(false)

  // Photo & Documents refs and states
  const photoInputRef = useRef<HTMLInputElement>(null)
  const docInputRef = useRef<HTMLInputElement>(null)
  const [selectedDocType, setSelectedDocType] = useState<string>('nid_front')
  const [showPassword, setShowPassword] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // Form State
  const [formData, setFormData] = useState<Partial<EmployeeRecord>>(() => {
    if (initialData) return { ...initialData }
    return {
      name: '',
      name_bn: '',
      mobile: '',
      phone: '',
      email: '',
      address: '',
      permanent_address: '',
      profile_picture_url: null,
      document_attachments: [],
      employee_id_number: generateEmployeeCode(),
      department: 'printing',
      role: '',
      employee_type: 'permanent',
      joining_date: new Date().toISOString().split('T')[0],
      salary_basis: 'monthly',
      base_salary: 20000,
      daily_rate: 769,
      hourly_rate: 96,
      overtime_hourly_rate: 144,
      allowed_monthly_leaves: 2,
      payment_method: 'cash',
      status: 'active',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      emergency_contact_relation: 'Spouse',
      duty_settings: {
        office_start_time: '09:00',
        office_end_time: '18:00',
        late_grace_minutes: 15,
        weekly_off_day: 'Friday',
        ot_calc_type: '1.5x_standard',
        absent_deduction_allowed: true,
        late_fine_policy: '3_late_1_day_salary',
      },
      salary_structure: {
        basic: 12000,
        house_allowance: 4000,
        transport_allowance: 2000,
        food_allowance: 0,
        medical_allowance: 2000,
        other_allowances: 0,
        bonuses: 0,
      },
      portal_credentials: {
        create_login: false,
        username: '',
        email: '',
        password: '',
        role: 'operator',
        send_invitation: true,
      },
      bank_payment_info: {
        bank_name: '',
        branch_name: '',
        account_name: '',
        account_number: '',
        routing_number: '',
      },
      mfs_payment_info: {
        provider: 'bkash',
        wallet_number: '',
        account_type: 'personal',
      },
    }
  })

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const updateDuty = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      duty_settings: {
        ...(prev.duty_settings || {}),
        [field]: value,
      },
    }))
  }

  const updateSalaryStructure = (field: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      salary_structure: {
        ...(prev.salary_structure || {
          basic: 0,
          house_allowance: 0,
          transport_allowance: 0,
          food_allowance: 0,
          medical_allowance: 0,
          other_allowances: 0,
        }),
        [field]: value,
      },
    }))
  }

  const updatePortal = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      portal_credentials: {
        ...(prev.portal_credentials || { create_login: false }),
        [field]: value,
      },
    }))
  }

  const updateBank = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      bank_payment_info: {
        ...(prev.bank_payment_info || {}),
        [field]: value,
      },
    }))
  }

  const updateMfs = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      mfs_payment_info: {
        ...(prev.mfs_payment_info || { provider: 'bkash', account_type: 'personal' }),
        [field]: value,
      },
    }))
  }

  // Photo handlers
  const handlePhotoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (JPG, PNG, or WebP).')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Photo file size must be less than 5 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      updateField('profile_picture_url', dataUrl)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemovePhoto = () => {
    updateField('profile_picture_url', null)
    if (photoInputRef.current) {
      photoInputRef.current.value = ''
    }
  }

  // Document handlers
  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Document file size must be less than 10 MB.')
      return
    }
    const formatSize = (bytes: number): string => {
      if (bytes < 1024) return `${bytes} B`
      if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      const newDoc: DocumentAttachment = {
        id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        type: selectedDocType,
        size: formatSize(file.size),
        url: dataUrl,
        uploaded_at: new Date().toISOString(),
      }
      const existing = formData.document_attachments || []
      updateField('document_attachments', [...existing, newDoc])
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleRemoveDoc = (id: string) => {
    const existing = formData.document_attachments || []
    updateField(
      'document_attachments',
      existing.filter((d) => d.id !== id)
    )
  }

  // Password Generator & Clipboard copy
  const generateRandomPassword = () => {
    const specialChars = ['!', '@', '#', '$', '%']
    const char = specialChars[Math.floor(Math.random() * specialChars.length)]
    const num = Math.floor(1000 + Math.random() * 9000)
    const newPass = `PrintFlow${char}${num}`
    updatePortal('password', newPass)
  }

  const handleCopyPassword = () => {
    const pass = formData.portal_credentials?.password
    if (pass) {
      navigator.clipboard?.writeText(pass)
      setCopiedPassword(true)
      setTimeout(() => setCopiedPassword(false), 2000)
    }
  }

  // Auto calculate daily, hourly and OT rates when base salary changes
  const handleBaseSalaryChange = (newBase: number) => {
    const validBase = Math.max(0, newBase || 0)
    const daily = Math.round((validBase / 26) * 100) / 100
    const hourly = Math.round((validBase / 208) * 100) / 100
    const ot = Math.round((hourly * 1.5) * 100) / 100

    // Also distribute into standard Bangladesh salary structure (60% basic, 20% house, 10% medical, 10% transport)
    const basic = Math.round(validBase * 0.6)
    const house = Math.round(validBase * 0.2)
    const medical = Math.round(validBase * 0.1)
    const transport = Math.round(validBase * 0.1)

    setFormData((prev) => ({
      ...prev,
      base_salary: validBase,
      daily_rate: daily,
      hourly_rate: hourly,
      overtime_hourly_rate: ot,
      salary_structure: {
        ...(prev.salary_structure || {}),
        basic,
        house_allowance: house,
        medical_allowance: medical,
        transport_allowance: transport,
        food_allowance: prev.salary_structure?.food_allowance || 0,
        other_allowances: prev.salary_structure?.other_allowances || 0,
      },
    }))
  }

  // Handle address copy
  const handleToggleSameAddress = (checked: boolean) => {
    setSameAsPresentAddress(checked)
    if (checked && formData.address) {
      updateField('permanent_address', formData.address)
    }
  }

  // Shift preset picker
  const applyShiftPreset = (start: string, end: string, offDay: string) => {
    updateDuty('office_start_time', start)
    updateDuty('office_end_time', end)
    updateDuty('weekly_off_day', offDay)
  }

  const handleNext = () => {
    setErrorMsg(null)
    // Validate Step 1
    if (currentStep === 1) {
      if (!formData.name?.trim()) {
        setErrorMsg('Employee full name in English is required.')
        return
      }
      if (!formData.mobile?.trim()) {
        setErrorMsg('Mobile number is required for attendance tracking & payroll SMS.')
        return
      }
    }
    // Validate Step 2
    if (currentStep === 2) {
      if (!formData.employee_id_number?.trim()) {
        setErrorMsg('Employee ID number is required.')
        return
      }
      if (!formData.role?.trim()) {
        setErrorMsg('Designation or role is required. Select a recommendation or type custom.')
        return
      }
    }

    if (currentStep < 7) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    setErrorMsg(null)
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setErrorMsg(null)
    if (!formData.name?.trim()) {
      setErrorMsg('Employee name is required.')
      setCurrentStep(1)
      return
    }
    if (!formData.mobile?.trim()) {
      setErrorMsg('Employee mobile number is required.')
      setCurrentStep(1)
      return
    }

    setIsSubmitting(true)
    try {
      const ok = await onSave(formData)
      if (ok !== false) {
        onOpenChange(false)
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save employee profile.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentStepMeta = STEPS[currentStep - 1]

  return (
    <Dialog open={open} onOpenChange={onOpenChange} maxWidth="max-w-4xl">
      <DialogContent className="p-0 overflow-hidden bg-card border border-border shadow-xs rounded-xl flex flex-col max-h-[90vh]">
        {/* Header with Title & Stepper Progress */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-muted shrink-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
                  {initialData ? tBilingual('Edit Employee Profile', 'কর্মী প্রোফাইল সম্পাদনা') : tBilingual('Add New Employee', 'নতুন কর্মী নিবন্ধন')}
                </DialogTitle>
                <Badge variant="outline" className="text-xs font-mono font-medium border-border bg-background px-2 py-0.5">
                  {formData.employee_id_number || 'EMP-NEW'}
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {tBilingual(`Step ${currentStep} of 7: ${currentStepMeta.label}`, `ধাপ ${currentStep} / ৭: ${currentStepMeta.labelBn}`)}
                <span className="hidden sm:inline"> — {currentStepMeta.description}</span>
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">
                {Math.round((currentStep / 7) * 100)}%
              </span>
              <div className="w-24 sm:w-32 h-2 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${(currentStep / 7) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stepper Navigation Pills */}
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-1 scrollbar-none">
            {STEPS.map((s) => {
              const Icon = s.icon
              const isDone = s.id < currentStep
              const isCurrent = s.id === currentStep
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(s.id)}
                  type="button"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border ${
                    isCurrent
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : isDone
                      ? 'bg-success-surface text-success border-border hover:bg-muted'
                      : 'bg-card text-muted-foreground border-border hover:bg-muted'
                  }`}
                >
                  {isDone ? (
                    <Check className="w-3.5 h-3.5 text-success stroke-[2.5]" />
                  ) : (
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span className="whitespace-nowrap">{s.label}</span>
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* Step Contents - Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-destructive" />
                <span className="font-medium">{errorMsg}</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setErrorMsg(null)}
                className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
              >
                Dismiss
              </Button>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 1: Basic Information */}
          {/* ==================================================================== */}
          {currentStep === 1 && (
            <div className="space-y-4 text-xs">
              {/* Employee Photo / Avatar Upload Card */}
              <div className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-border bg-muted flex items-center justify-center overflow-hidden">
                    {formData.profile_picture_url ? (
                      <img
                        src={formData.profile_picture_url}
                        alt={formData.name || 'Employee Photo'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground p-2 text-center">
                        <Camera className="w-8 h-8 text-muted-foreground/70 mb-1" />
                        <span className="text-[12px] font-medium leading-tight">No Photo</span>
                      </div>
                    )}
                  </div>
                  {formData.profile_picture_url && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      title="Remove Photo"
                      aria-label="Remove Photo"
                      className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-xs hover:opacity-90 transition-opacity"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-primary" />
                      <span>{tBilingual('Employee Photograph', 'কর্মীর পাসপোর্ট ছবি')}</span>
                    </h4>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {tBilingual(
                        'Upload a clear portrait for digital ID card, kiosk attendance and profile directory.',
                        'ডিজিটাল আইডি কার্ড, কিয়স্ক হাজিরা ও কর্মী তালিকার জন্য স্পষ্ট ছবি যুক্ত করুন।'
                      )}
                    </p>
                  </div>

                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handlePhotoFileChange}
                    className="hidden"
                    id="employee-photo-upload"
                  />

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => photoInputRef.current?.click()}
                      className="h-8 px-3 text-xs border-border bg-background hover:bg-muted"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-primary" />
                      <span>{formData.profile_picture_url ? tBilingual('Change Photo', 'ছবি পরিবর্তন') : tBilingual('Upload Photo', 'ছবি আপলোড করুন')}</span>
                    </Button>

                    {formData.profile_picture_url && (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={handleRemovePhoto}
                        className="h-8 px-2.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        <span>{tBilingual('Remove', 'মুছে ফেলুন')}</span>
                      </Button>
                    )}
                    <span className="text-[12px] text-muted-foreground">JPG, PNG or WebP (max 5MB)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Full Name (English) *', 'পূর্ণ নাম (ইংরেজি) *')}
                  </Label>
                  <Input
                    placeholder="e.g. Md. Rahim Uddin"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Full Name (Bengali Script)', 'পূর্ণ নাম (বাংলায়)')}
                  </Label>
                  <Input
                    placeholder="যেমনঃ মোঃ রহিম উদ্দিন"
                    value={formData.name_bn || ''}
                    onChange={(e) => updateField('name_bn', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Primary Mobile Phone *', 'প্রধান মোবাইল নম্বর *')}</span>
                  </Label>
                  <Input
                    placeholder="+880 1700-000000"
                    value={formData.mobile || ''}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    className="h-9 text-xs mt-1 font-mono bg-background"
                  />
                  <p className="text-[12px] text-muted-foreground mt-0.5">Used for biometric sync & payroll SMS</p>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{tBilingual('Alternative Phone / WhatsApp', 'বিকল্প ফোন / হোয়াটসঅ্যাপ')}</span>
                  </Label>
                  <Input
                    placeholder="+880 1800-000000"
                    value={formData.phone || ''}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="h-9 text-xs mt-1 font-mono bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{tBilingual('Email Address', 'ইমেইল অ্যাড্রেস')}</span>
                  </Label>
                  <Input
                    type="email"
                    placeholder="rahim@printpress.bd"
                    value={formData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>
              </div>

              {/* National Identity & Health */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3.5 rounded-lg border border-border bg-muted/40">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('National ID / Birth Cert No', 'জাতীয় পরিচয়পত্র / জন্ম সনদ নম্বর')}</span>
                  </Label>
                  <Input
                    placeholder="e.g. 19902692500000123"
                    value={(formData as any).nid_number || ''}
                    onChange={(e) => updateField('nid_number', e.target.value)}
                    className="h-9 text-xs mt-1 font-mono bg-background"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{tBilingual('Date of Birth', 'জন্ম তারিখ')}</span>
                  </Label>
                  <Input
                    type="date"
                    value={(formData as any).date_of_birth || ''}
                    onChange={(e) => updateField('date_of_birth', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <HeartPulse className="w-3.5 h-3.5 text-destructive" />
                    <span>{tBilingual('Blood Group', 'রক্তের গ্রুপ')}</span>
                  </Label>
                  <select
                    value={(formData as any).blood_group || ''}
                    onChange={(e) => updateField('blood_group', e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                  >
                    <option value="">Select Blood Group</option>
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Present & Permanent Address */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Present Address', 'বর্তমান ঠিকানা')}</span>
                  </Label>
                  <Input
                    placeholder="House, Road, Area, Thana, District..."
                    value={formData.address || ''}
                    onChange={(e) => {
                      updateField('address', e.target.value)
                      if (sameAsPresentAddress) {
                        updateField('permanent_address', e.target.value)
                      }
                    }}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{tBilingual('Permanent Address', 'স্থায়ী ঠিকানা')}</span>
                    </Label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                      <input
                        type="checkbox"
                        checked={sameAsPresentAddress}
                        onChange={(e) => handleToggleSameAddress(e.target.checked)}
                        className="rounded border-input text-primary w-3.5 h-3.5"
                      />
                      <span className="text-[12px]">{tBilingual('Same as present', 'একই')}</span>
                    </label>
                  </div>
                  <Input
                    placeholder="Village, Post, Thana, District..."
                    value={formData.permanent_address || ''}
                    onChange={(e) => updateField('permanent_address', e.target.value)}
                    disabled={sameAsPresentAddress}
                    className="h-9 text-xs mt-1 bg-background disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3.5 rounded-lg border border-border bg-muted/40 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span>{tBilingual('Emergency Contact Person', 'জরুরি যোগাযোগের ব্যক্তি')}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Contact Person Name</Label>
                    <Input
                      placeholder="e.g. Ayesha Begum"
                      value={formData.emergency_contact_name || ''}
                      onChange={(e) => updateField('emergency_contact_name', e.target.value)}
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Relationship</Label>
                    <select
                      value={formData.emergency_contact_relation || 'Spouse'}
                      onChange={(e) => updateField('emergency_contact_relation', e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                    >
                      <option value="Father">Father / পিতা</option>
                      <option value="Mother">Mother / মাতা</option>
                      <option value="Spouse">Spouse / স্বামী/স্ত্রী</option>
                      <option value="Brother">Brother / ভাই</option>
                      <option value="Sister">Sister / বোন</option>
                      <option value="Relative">Relative / আত্মীয়</option>
                      <option value="Friend">Friend / বন্ধু</option>
                    </select>
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">Emergency Phone</Label>
                    <Input
                      placeholder="+880 1900-000000"
                      value={formData.emergency_contact_phone || ''}
                      onChange={(e) => updateField('emergency_contact_phone', e.target.value)}
                      className="h-9 text-xs mt-1 font-mono bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 2: Employment & Designation */}
          {/* ==================================================================== */}
          {currentStep === 2 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-foreground">
                      {tBilingual('Employee ID Number *', 'কর্মী আইডি নম্বর *')}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => updateField('employee_id_number', generateEmployeeCode())}
                      className="h-6 px-1.5 text-[12px] text-primary hover:text-primary hover:bg-primary/10"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      <span>Regenerate</span>
                    </Button>
                  </div>
                  <Input
                    placeholder="e.g. EMP-2026-1001"
                    value={formData.employee_id_number || ''}
                    onChange={(e) => updateField('employee_id_number', e.target.value)}
                    className="h-9 text-xs mt-1 font-mono bg-background"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Department *', 'কারখানা বিভাগ *')}
                  </Label>
                  <select
                    value={formData.department || 'printing'}
                    onChange={(e) => {
                      const newDept = e.target.value
                      updateField('department', newDept)
                      // Preselect first suggestion if role is empty
                      if (!formData.role && DEPARTMENT_ROLES[newDept]?.length) {
                        updateField('role', DEPARTMENT_ROLES[newDept][0])
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1 capitalize"
                  >
                    <option value="printing">Printing (ফ্লেক্স, ব্যানার, ইকো-সলভেন্ট ও অফসেট)</option>
                    <option value="finishing">Finishing & Lamination (লেমিনেশন, পেস্টিং ও কাটিং)</option>
                    <option value="fabrication">Fabrication & Signage (মেটাল, এক্রিলিক ও সাইনবোর্ড)</option>
                    <option value="design">Design & Pre-press (গ্রাফিক্স ও প্রি-প্রেস)</option>
                    <option value="installation">Installation & Field Ops (মাঠপর্যায়ে ফিটিং)</option>
                    <option value="sales">Sales & Counter (কাউন্টার ও বিক্রয়)</option>
                    <option value="accounts">Accounts & Billing (হিসাবরক্ষণ ও বিলিং)</option>
                    <option value="management">Management & Supervision (ব্যবস্থাপনা)</option>
                    <option value="field_ops">Field Operations & Delivery (ডেলিভারি ও লজিস্টিকস)</option>
                  </select>
                </div>
              </div>

              {/* Designation / Role with Quick Chips */}
              <div className="space-y-2 p-3.5 rounded-lg border border-border bg-muted/40">
                <Label className="text-xs font-semibold text-foreground">
                  {tBilingual('Designation / Role *', 'পদবী ও দায়িত্ব *')}
                </Label>
                <Input
                  placeholder="e.g. Flex Machine Master Operator"
                  value={formData.role || ''}
                  onChange={(e) => updateField('role', e.target.value)}
                  className="h-9 text-xs bg-background"
                />

                {/* Recommendation Chips */}
                {DEPARTMENT_ROLES[formData.department || 'printing'] && (
                  <div className="pt-1.5 space-y-1.5">
                    <span className="text-[12px] text-muted-foreground flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>{tBilingual('Quick-pick suggestions for this department:', 'এই বিভাগের জন্য দ্রুত বাছাই করুন:')}</span>
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {DEPARTMENT_ROLES[formData.department || 'printing'].map((sRole) => (
                        <button
                          key={sRole}
                          type="button"
                          onClick={() => updateField('role', sRole)}
                          className={`px-2.5 py-1 rounded-md text-[12px] font-medium border transition-colors ${
                            formData.role === sRole
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background text-foreground border-border hover:bg-muted'
                          }`}
                        >
                          {sRole}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Employment Type & Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Employment Type', 'নিয়োগের ধরন')}
                  </Label>
                  <select
                    value={formData.employee_type || 'permanent'}
                    onChange={(e) => {
                      const empType = e.target.value as EmploymentType
                      updateField('employee_type', empType)
                      if (empType === 'daily_labor' || empType === 'daily_worker') {
                        updateField('salary_basis', 'daily_rate')
                      } else if (empType === 'hourly_worker') {
                        updateField('salary_basis', 'hourly_rate')
                      }
                    }}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1 capitalize"
                  >
                    <option value="permanent">Permanent Staff / স্থায়ী কর্মী</option>
                    <option value="contract">Contract Worker / চুক্তিভিত্তিক কর্মী</option>
                    <option value="daily_labor">Daily Labor / দিনমজুর</option>
                    <option value="hourly_worker">Hourly Worker / ঘণ্টা ভিত্তিক</option>
                    <option value="part_time">Part Time / পার্ট টাইম</option>
                    <option value="field_worker">Field Worker / মাঠ কর্মী</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Branch Assignment', 'শাখা নির্ধারণ')}</span>
                  </Label>
                  <select
                    value={formData.branch_id || ''}
                    onChange={(e) => updateField('branch_id', e.target.value || null)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                  >
                    <option value="">Main Factory / Head Office (প্রধান কারখানা)</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{tBilingual('Joining Date', 'যোগদানের তারিখ')}</span>
                  </Label>
                  <Input
                    type="date"
                    value={formData.joining_date || ''}
                    onChange={(e) => updateField('joining_date', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>
              </div>

              {/* Extra Employment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {formData.employee_type === 'contract' && (
                  <div>
                    <Label className="text-xs font-semibold text-foreground">
                      {tBilingual('Contract Expiry Date', 'চুক্তি শেষের তারিখ')}
                    </Label>
                    <Input
                      type="date"
                      value={formData.contract_end_date || ''}
                      onChange={(e) => updateField('contract_end_date', e.target.value)}
                      className="h-9 text-xs mt-1 bg-background"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Allowed Monthly Paid Leaves', 'মাসিক সবেতন ছুটি (দিন)')}
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={formData.allowed_monthly_leaves ?? 2}
                    onChange={(e) => updateField('allowed_monthly_leaves', parseInt(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 tabular-nums bg-background"
                  />
                  <p className="text-[12px] text-muted-foreground mt-0.5">Default 2 days casual/sick leave per month</p>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 3: Compensation & Payroll Structure */}
          {/* ==================================================================== */}
          {currentStep === 3 && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Salary Basis / Payout Model', 'বেতন কাঠামো মডেল')}
                  </Label>
                  <select
                    value={formData.salary_basis || 'monthly'}
                    onChange={(e) => updateField('salary_basis', e.target.value as SalaryBasis)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1 capitalize"
                  >
                    <option value="monthly">{tBilingual('Monthly Fixed Salary / মাসিক নির্দিষ্ট বেতন', 'মাসিক নির্দিষ্ট বেতন')}</option>
                    <option value="daily_rate">{tBilingual('Daily Wage / দৈনিক হাজিরা ভিত্তিক', 'দৈনিক হাজিরা ভিত্তিক')}</option>
                    <option value="hourly_rate">{tBilingual('Hourly Rate / ঘণ্টা ভিত্তিক মজুরি', 'ঘণ্টা ভিত্তিক মজুরি')}</option>
                    <option value="contract">{tBilingual('Contract Basis / চুক্তিভিত্তিক পারিশ্রমিক', 'চুক্তিভিত্তিক পারিশ্রমিক')}</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">
                    {formData.salary_basis === 'daily_rate'
                      ? tBilingual('Daily Rate (৳) *', 'দৈনিক হাজিরা (৳) *')
                      : formData.salary_basis === 'hourly_rate'
                      ? tBilingual('Hourly Rate (৳) *', 'ঘণ্টা ভিত্তিক মজুরি (৳) *')
                      : tBilingual('Base Monthly Salary (৳) *', 'মাসিক মূল বেতন (৳) *')}
                  </Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-xs font-bold text-muted-foreground">৳</span>
                    <Input
                      type="number"
                      min="0"
                      value={formData.base_salary || 0}
                      onChange={(e) => handleBaseSalaryChange(parseFloat(e.target.value) || 0)}
                      className="h-9 pl-7 text-xs tabular-nums bg-background font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Automatic Rates Calculator Card */}
              <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    <span>{tBilingual('Live Economics & Overtime Rates Breakdown', 'দৈনিক, ঘণ্টাপ্রতি ও ওভারটাইম রেটের হিসাব')}</span>
                  </h4>
                  <Badge variant="secondary" className="text-[12px] font-mono">
                    26 Days / 208 Working Hours Basis
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <span className="text-[12px] text-muted-foreground font-medium">Daily Rate (Base / 26)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-bold text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        value={formData.daily_rate || 0}
                        onChange={(e) => updateField('daily_rate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs tabular-nums bg-background font-semibold"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border">
                    <span className="text-[12px] text-muted-foreground font-medium">Hourly Rate (Base / 208)</span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-bold text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        value={formData.hourly_rate || 0}
                        onChange={(e) => updateField('hourly_rate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs tabular-nums bg-background font-semibold"
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-card border border-border">
                    <span className="text-[12px] text-muted-foreground font-medium flex items-center justify-between">
                      <span>OT Rate (1.5x)</span>
                      <span className="text-primary font-bold">150%</span>
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                      <span className="text-xs font-bold text-muted-foreground">৳</span>
                      <Input
                        type="number"
                        value={formData.overtime_hourly_rate || 0}
                        onChange={(e) => updateField('overtime_hourly_rate', parseFloat(e.target.value) || 0)}
                        className="h-8 text-xs tabular-nums bg-background font-semibold text-primary"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Salary Structure Breakdown (Bangladesh Standard Accordion) */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground">
                      {tBilingual('Salary Structure Allowances Breakdown', 'বেতন কাঠামো ও ভাতার বিভাজন')}
                    </h4>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      Compliant with BD Labor Act (Basic 60%, House Rent 20%, Medical 10%, Transport 10%)
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono font-bold text-foreground">
                    Total: ৳ {Number(formData.base_salary || 0).toLocaleString()}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <Label className="text-[12px] text-muted-foreground font-medium">Basic Salary (মূল বেতন)</Label>
                    <Input
                      type="number"
                      value={formData.salary_structure?.basic || 0}
                      onChange={(e) => updateSalaryStructure('basic', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs mt-1 tabular-nums bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px] text-muted-foreground font-medium">House Rent (বাড়ি ভাড়া)</Label>
                    <Input
                      type="number"
                      value={formData.salary_structure?.house_allowance || 0}
                      onChange={(e) => updateSalaryStructure('house_allowance', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs mt-1 tabular-nums bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px] text-muted-foreground font-medium">Medical (চিকিৎসা ভাতা)</Label>
                    <Input
                      type="number"
                      value={formData.salary_structure?.medical_allowance || 0}
                      onChange={(e) => updateSalaryStructure('medical_allowance', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs mt-1 tabular-nums bg-background"
                    />
                  </div>
                  <div>
                    <Label className="text-[12px] text-muted-foreground font-medium">Conveyance (যাতায়াত)</Label>
                    <Input
                      type="number"
                      value={formData.salary_structure?.transport_allowance || 0}
                      onChange={(e) => updateSalaryStructure('transport_allowance', parseFloat(e.target.value) || 0)}
                      className="h-8 text-xs mt-1 tabular-nums bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 4: Duty Schedule & Attendance Rules */}
          {/* ==================================================================== */}
          {currentStep === 4 && (
            <div className="space-y-4 text-xs">
              {/* Quick Shift Presets */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{tBilingual('Quick Shift Presets:', 'দ্রুত শিফট বাছাই করুন:')}</span>
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => applyShiftPreset('09:00', '18:00', 'Friday')}
                    className="p-2.5 rounded-lg border border-border bg-card text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-semibold text-foreground block">Regular Day Shift</span>
                    <span className="text-[12px] text-muted-foreground">09:00 AM – 06:00 PM (Fri Off)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShiftPreset('08:00', '17:00', 'Friday')}
                    className="p-2.5 rounded-lg border border-border bg-card text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-semibold text-foreground block">Morning Factory Shift</span>
                    <span className="text-[12px] text-muted-foreground">08:00 AM – 05:00 PM (Fri Off)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => applyShiftPreset('14:00', '23:00', 'Sunday')}
                    className="p-2.5 rounded-lg border border-border bg-card text-left hover:bg-muted transition-colors"
                  >
                    <span className="font-semibold text-foreground block">Evening Press Shift</span>
                    <span className="text-[12px] text-muted-foreground">02:00 PM – 11:00 PM (Sun Off)</span>
                  </button>
                </div>
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Office Start Time (শিফট শুরু)</Label>
                  <Input
                    type="time"
                    value={formData.duty_settings?.office_start_time || '09:00'}
                    onChange={(e) => updateDuty('office_start_time', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-foreground">Office End Time (শিফট শেষ)</Label>
                  <Input
                    type="time"
                    value={formData.duty_settings?.office_end_time || '18:00'}
                    onChange={(e) => updateDuty('office_end_time', e.target.value)}
                    className="h-9 text-xs mt-1 bg-background"
                  />
                </div>
              </div>

              {/* Late Grace & Weekly Off */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Late Attendance Grace Period</Label>
                  <div className="flex gap-2 mt-1">
                    {[5, 10, 15, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => updateDuty('late_grace_minutes', mins)}
                        className={`flex-1 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
                          formData.duty_settings?.late_grace_minutes === mins
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {mins} Min
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Weekly Off Day (সাপ্তাহিক ছুটি)</Label>
                  <select
                    value={formData.duty_settings?.weekly_off_day || 'Friday'}
                    onChange={(e) => updateDuty('weekly_off_day', e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                  >
                    <option value="Friday">{tBilingual('Friday / শুক্রবার', 'শুক্রবার')}</option>
                    <option value="Sunday">{tBilingual('Sunday / রবিবার', 'রবিবার')}</option>
                    <option value="Saturday">{tBilingual('Saturday / শনিবার', 'শনিবার')}</option>
                    <option value="Thursday">{tBilingual('Thursday / বৃহস্পতিবার', 'বৃহস্পতিবার')}</option>
                    <option value="None">{tBilingual('Rotational Roster / রোস্টার অনুযায়ী', 'রোস্টার অনুযায়ী')}</option>
                  </select>
                </div>
              </div>

              {/* Overtime Policy & Late Fine Rules */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-lg border border-border bg-card">
                <div>
                  <Label className="text-xs font-semibold text-foreground">Overtime Multiplier Rule</Label>
                  <select
                    value={formData.duty_settings?.ot_calc_type || '1.5x_standard'}
                    onChange={(e) => updateDuty('ot_calc_type', e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                  >
                    <option value="1.5x_standard">1.5x Regular Hourly Rate (Standard)</option>
                    <option value="2.0x_holiday">2.0x Double Rate (Holiday/Night Shift)</option>
                    <option value="fixed_rate">Fixed Overtime Rate</option>
                    <option value="none">No Overtime (Executive/Non-eligible)</option>
                  </select>
                </div>

                <div>
                  <Label className="text-xs font-semibold text-foreground">Late Attendance Deduction Policy</Label>
                  <select
                    value={formData.duty_settings?.late_fine_policy || '3_late_1_day_salary'}
                    onChange={(e) => updateDuty('late_fine_policy', e.target.value)}
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                  >
                    <option value="3_late_1_day_salary">3 Days Late = 1 Day Salary Deduction</option>
                    <option value="warning_only">Warning Only (No automatic deduction)</option>
                    <option value="fixed_amount">Fixed Amount Fine per Late Occurrence</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 5: Payment Method & Disbursement */}
          {/* ==================================================================== */}
          {currentStep === 5 && (
            <div className="space-y-4 text-xs">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  {tBilingual('Preferred Disbursement Channel *', 'বেতন ও পারিশ্রমিক পাওয়ার মাধ্যম *')}
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-2">
                  {[
                    { id: 'cash', label: 'Cash / নগদ', icon: DollarSign },
                    { id: 'bkash', label: 'bKash / বিকাশ', icon: Smartphone },
                    { id: 'nagad', label: 'Nagad / নগদ', icon: Smartphone },
                    { id: 'rocket', label: 'Rocket / রকেট', icon: Smartphone },
                    { id: 'bank', label: 'Bank Transfer', icon: Landmark },
                  ].map((method) => {
                    const Icon = method.icon
                    const isSelected = formData.payment_method === method.id
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => updateField('payment_method', method.id)}
                        className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary shadow-xs font-bold'
                            : 'border-border bg-card text-muted-foreground hover:bg-muted font-medium'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="text-xs">{method.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* MFS Details for bKash, Nagad, Rocket */}
              {['bkash', 'nagad', 'rocket'].includes(formData.payment_method || '') && (
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground uppercase">
                      {formData.payment_method} Wallet Details
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Mobile Wallet Number</Label>
                      <Input
                        placeholder="01700-000000 (11 Digits)"
                        value={formData.mfs_payment_info?.wallet_number || formData.mobile || ''}
                        onChange={(e) => updateMfs('wallet_number', e.target.value)}
                        className="h-9 text-xs mt-1 font-mono bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Account Type</Label>
                      <select
                        value={formData.mfs_payment_info?.account_type || 'personal'}
                        onChange={(e) => updateMfs('account_type', e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1"
                      >
                        <option value="personal">Personal Account</option>
                        <option value="agent">Agent Account</option>
                        <option value="merchant">Merchant Account</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Account Details */}
              {formData.payment_method === 'bank' && (
                <div className="p-4 rounded-xl border border-border bg-muted/40 space-y-3">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-foreground">Bank Account Information</h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Bank Name</Label>
                      <Input
                        placeholder="e.g. Dutch-Bangla Bank / Islami Bank"
                        value={formData.bank_payment_info?.bank_name || ''}
                        onChange={(e) => updateBank('bank_name', e.target.value)}
                        className="h-9 text-xs mt-1 bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Branch Name</Label>
                      <Input
                        placeholder="e.g. Motijheel Branch, Dhaka"
                        value={formData.bank_payment_info?.branch_name || ''}
                        onChange={(e) => updateBank('branch_name', e.target.value)}
                        className="h-9 text-xs mt-1 bg-background"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Account Holder Name</Label>
                      <Input
                        placeholder="Name as written on cheque"
                        value={formData.bank_payment_info?.account_name || formData.name || ''}
                        onChange={(e) => updateBank('account_name', e.target.value)}
                        className="h-9 text-xs mt-1 bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Account Number</Label>
                      <Input
                        placeholder="13-17 Digit Account Number"
                        value={formData.bank_payment_info?.account_number || ''}
                        onChange={(e) => updateBank('account_number', e.target.value)}
                        className="h-9 text-xs mt-1 font-mono bg-background"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">Routing Number (Optional)</Label>
                      <Input
                        placeholder="9 Digit Routing Code"
                        value={formData.bank_payment_info?.routing_number || ''}
                        onChange={(e) => updateBank('routing_number', e.target.value)}
                        className="h-9 text-xs mt-1 font-mono bg-background"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 6: Portal Access & App Login */}
          {/* ==================================================================== */}
          {currentStep === 6 && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.portal_credentials?.create_login || false}
                    onChange={(e) => {
                      const checked = e.target.checked
                      updatePortal('create_login', checked)
                      if (checked) {
                        if (!formData.portal_credentials?.username) {
                          updatePortal('username', formData.mobile || '')
                        }
                        if (!formData.portal_credentials?.email) {
                          updatePortal('email', formData.email || '')
                        }
                        if (!formData.portal_credentials?.password) {
                          generateRandomPassword()
                        }
                      }
                    }}
                    className="rounded border-input text-primary focus:ring-ring w-4 h-4 mt-0.5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-xs block">
                        {tBilingual('Provision PrintFlow ERP & Mobile Portal Account', 'প্রিন্টফ্লো সিস্টেম ও মোবাইল পোর্টাল লগইন সক্রিয় করুন')}
                      </span>
                      <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-border bg-muted">
                        {formData.portal_credentials?.create_login ? 'Active' : 'Disabled'}
                      </Badge>
                    </div>
                    <span className="text-[12px] text-muted-foreground block mt-0.5">
                      {tBilingual(
                        'Allows employee to log in to view assigned job orders, start press run timers, check attendance history, inspect payslips, and submit advance/leave requests.',
                        'কর্মী নিজে অ্যাপে লগইন করে কাজ দেখা, প্রেসে সময় রেকর্ড করা, হাজিরা ইতিহাস, পে-স্লিপ ও অগ্রিম বেতন আবেদন করতে পারবেন।'
                      )}
                    </span>
                  </div>
                </label>

                {formData.portal_credentials?.create_login && (
                  <div className="space-y-4 pt-3 border-t border-border">
                    {/* Username & Portal Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            {tBilingual('Login Username / Mobile *', 'লগইন ইউজারনেম / মোবাইল নম্বর *')}
                          </Label>
                          {formData.mobile && formData.portal_credentials?.username !== formData.mobile && (
                            <button
                              type="button"
                              onClick={() => updatePortal('username', formData.mobile)}
                              className="text-[12px] text-primary hover:underline font-medium"
                            >
                              Sync Mobile
                            </button>
                          )}
                        </div>
                        <Input
                          placeholder="e.g. 01700000000"
                          value={formData.portal_credentials?.username || ''}
                          onChange={(e) => updatePortal('username', e.target.value)}
                          className="h-9 text-xs mt-1 font-mono bg-background"
                        />
                        <p className="text-[12px] text-muted-foreground mt-0.5">Employee uses this username or phone number to sign in.</p>
                      </div>

                      <div>
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-foreground">
                            {tBilingual('Official Portal Email', 'অফিসিয়াল পোর্টাল ইমেইল')}
                          </Label>
                          {formData.email && formData.portal_credentials?.email !== formData.email && (
                            <button
                              type="button"
                              onClick={() => updatePortal('email', formData.email)}
                              className="text-[12px] text-primary hover:underline font-medium"
                            >
                              Sync Email
                            </button>
                          )}
                        </div>
                        <Input
                          type="email"
                          placeholder="employee@printpress.bd"
                          value={formData.portal_credentials?.email || ''}
                          onChange={(e) => updatePortal('email', e.target.value)}
                          className="h-9 text-xs mt-1 bg-background"
                        />
                        <p className="text-[12px] text-muted-foreground mt-0.5">For password recovery & system notifications.</p>
                      </div>
                    </div>

                    {/* Password & Generator */}
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-primary" />
                          <span>{tBilingual('Temporary Login Password *', 'সাময়িক লগইন পাসওয়ার্ড *')}</span>
                        </Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={generateRandomPassword}
                          className="h-6 px-2 text-[12px] text-primary hover:bg-primary/10"
                        >
                          <Sparkles className="w-3 h-3 mr-1" />
                          <span>{tBilingual('Generate Strong Password', 'নতুন পাসওয়ার্ড তৈরি')}</span>
                        </Button>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Set or generate a password"
                            value={formData.portal_credentials?.password || ''}
                            onChange={(e) => updatePortal('password', e.target.value)}
                            className="h-9 text-xs font-mono pr-9 bg-background"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        {formData.portal_credentials?.password && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleCopyPassword}
                            className="h-9 px-3 text-xs border-border bg-card shrink-0"
                          >
                            {copiedPassword ? (
                              <>
                                <Check className="w-3.5 h-3.5 mr-1 text-success" />
                                <span className="text-success">{tBilingual('Copied', 'কপি হয়েছে')}</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 mr-1" />
                                <span>{tBilingual('Copy', 'কপি')}</span>
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                      <p className="text-[12px] text-muted-foreground">
                        Provide this temporary password to the employee. They will be prompted to change it upon first login.
                      </p>
                    </div>

                    {/* Role & Access Scope */}
                    <div>
                      <Label className="text-xs font-semibold text-foreground">
                        {tBilingual('System Role & Permission Level *', 'সিস্টেম রোল ও অনুমতির পরিধি *')}
                      </Label>
                      <select
                        value={formData.portal_credentials?.role || 'operator'}
                        onChange={(e) => updatePortal('role', e.target.value)}
                        className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs text-foreground mt-1 capitalize"
                      >
                        <option value="operator">Production Machine Operator (মেশিন অপারেটর)</option>
                        <option value="designer">Graphic Designer & Pre-press (ডিজাইনার)</option>
                        <option value="manager">Shop Floor Manager / Supervisor (সুপারভাইজার)</option>
                        <option value="sales_rep">Counter Sales Representative (কাউন্টার সেলস)</option>
                        <option value="field_staff">Field Installation Staff (মাঠকর্মী)</option>
                        <option value="accounts">Accounts & Billing Executive (হিসাবরক্ষণ)</option>
                      </select>
                    </div>

                    {/* Role Capabilities Preview Card */}
                    {ROLE_PERMISSION_DETAILS[formData.portal_credentials?.role || 'operator'] && (
                      <div className="p-3.5 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                            <Shield className="w-3.5 h-3.5 text-primary" />
                            <span>{ROLE_PERMISSION_DETAILS[formData.portal_credentials?.role || 'operator'].title}</span>
                          </span>
                          <Badge variant="secondary" className="text-[12px]">
                            {ROLE_PERMISSION_DETAILS[formData.portal_credentials?.role || 'operator'].badge}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {ROLE_PERMISSION_DETAILS[formData.portal_credentials?.role || 'operator'].scopes.map((scope, idx) => (
                            <div key={idx} className="flex items-center gap-1.5 text-muted-foreground text-[12px]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                              <span>{scope}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Send Invitation Toggle */}
                    <div className="p-3.5 rounded-xl border border-border bg-muted/40 flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="send-invite-checkbox"
                        checked={formData.portal_credentials?.send_invitation ?? true}
                        onChange={(e) => updatePortal('send_invitation', e.target.checked)}
                        className="rounded border-input text-primary focus:ring-ring w-4 h-4 mt-0.5"
                      />
                      <label htmlFor="send-invite-checkbox" className="cursor-pointer">
                        <span className="font-semibold text-foreground text-xs block">
                          {tBilingual('Send Welcome Invitation SMS / WhatsApp Notification', 'স্বাগতম এসএমএস / হোয়াটসঅ্যাপ আমন্ত্রণ পাঠান')}
                        </span>
                        <span className="text-[12px] text-muted-foreground block mt-0.5">
                          Automatically dispatches portal URL, username and temporary password to the employee&apos;s phone.
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* STEP 7: Documents Attachments & 360° Profile Verification */}
          {/* ==================================================================== */}
          {currentStep === 7 && (
            <div className="space-y-4 text-xs">
              {/* 1. Document Attachments Hub */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-border">
                  <div>
                    <h4 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>{tBilingual('Employee Documents & Attachments', 'কর্মীর নথিপত্র ও সংযুক্তি')}</span>
                    </h4>
                    <p className="text-[12px] text-muted-foreground mt-0.5">
                      {tBilingual(
                        'Attach NID card front/back, appointment letter, resume or certificates for HR compliance.',
                        'এইচআর রেকর্ড সংরক্ষণের জন্য জাতীয় পরিচয়পত্র, নিয়োগপত্র বা জীবনবৃত্তান্ত সংযুক্ত করুন।'
                      )}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono self-start sm:self-auto bg-background border-border">
                    {formData.document_attachments?.length || 0} Attached
                  </Badge>
                </div>

                {/* Preset Document Category Selector */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">
                    {tBilingual('Select Document Category to Attach', 'সংযুক্তির ধরন নির্বাচন করুন')}
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {DOCUMENT_TYPES.map((dtype) => {
                      const isSelected = selectedDocType === dtype.id
                      const countForType = (formData.document_attachments || []).filter((d) => d.type === dtype.id).length
                      return (
                        <button
                          key={dtype.id}
                          type="button"
                          onClick={() => setSelectedDocType(dtype.id)}
                          className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between gap-1.5 ${
                            isSelected
                              ? 'border-primary bg-primary/10 text-primary font-semibold shadow-xs'
                              : 'border-border bg-card text-muted-foreground hover:bg-muted font-medium'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block text-xs truncate">{dtype.label}</span>
                            <span className="text-[12px] opacity-80 truncate">{dtype.labelBn}</span>
                          </div>
                          {countForType > 0 && (
                            <Badge variant="secondary" className="text-[12px] px-1.5 py-0 shrink-0">
                              {countForType}
                            </Badge>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Hidden File Input & Upload Action */}
                <input
                  ref={docInputRef}
                  type="file"
                  accept="application/pdf,image/png,image/jpeg,image/webp"
                  onChange={handleDocFileChange}
                  className="hidden"
                  id="employee-doc-upload"
                />

                <div className="p-4 rounded-xl border border-dashed border-border bg-muted/40 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      {tBilingual(
                        `Upload ${DOCUMENT_TYPES.find((d) => d.id === selectedDocType)?.label || 'Document'} File`,
                        `${DOCUMENT_TYPES.find((d) => d.id === selectedDocType)?.labelBn || 'নথি'} ফাইল আপলোড করুন`
                      )}
                    </span>
                    <span className="text-[12px] text-muted-foreground block mt-0.5">
                      Supported formats: PDF, PNG, JPG, WebP (Max size 10MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => docInputRef.current?.click()}
                    className="h-8 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    <span>{tBilingual('Browse & Attach File', 'ফাইল বেছে নিন')}</span>
                  </Button>
                </div>

                {/* List of Attached Documents */}
                {formData.document_attachments && formData.document_attachments.length > 0 && (
                  <div className="space-y-2 pt-1">
                    <span className="text-xs font-semibold text-foreground block">
                      {tBilingual('Attached Documents List', 'সংযুক্ত নথিপত্রের তালিকা')} ({formData.document_attachments.length})
                    </span>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {formData.document_attachments.map((doc) => {
                        const category = DOCUMENT_TYPES.find((d) => d.id === doc.type)
                        const isPdf = doc.name.toLowerCase().endsWith('.pdf')
                        return (
                          <div
                            key={doc.id}
                            className="p-2.5 rounded-lg border border-border bg-background flex items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                {isPdf ? <FileText className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0 truncate">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-foreground truncate">{doc.name}</span>
                                  <Badge variant="outline" className="text-[12px] px-1.5 py-0 border-border bg-muted shrink-0">
                                    {category?.label || doc.type}
                                  </Badge>
                                </div>
                                <span className="text-[12px] text-muted-foreground block">
                                  {doc.size || 'Unknown size'} • Uploaded {new Date(doc.uploaded_at || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {doc.url && (
                                <a
                                  href={doc.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                  title="View / Download Document"
                                  aria-label="View document"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc(doc.id)}
                                className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive transition-colors"
                                title="Delete Document"
                                aria-label="Delete document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. 360° Profile Verification Card */}
              <div className="p-4 rounded-xl border border-border bg-card space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl border border-border overflow-hidden bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {formData.profile_picture_url ? (
                        <img
                          src={formData.profile_picture_url}
                          alt={formData.name || 'Employee Photo'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        formData.name?.slice(0, 2).toUpperCase() || 'EM'
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-foreground">{formData.name || 'Unnamed Employee'}</h3>
                      {formData.name_bn && <p className="text-xs text-muted-foreground">{formData.name_bn}</p>}
                      <div className="flex items-center gap-1.5 mt-1">
                        <Badge variant="outline" className="font-mono text-[12px] bg-background">
                          {formData.employee_id_number}
                        </Badge>
                        <Badge variant="secondary" className="text-[12px] capitalize">
                          {formData.department}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <span className="text-[12px] text-muted-foreground block">Base Salary Package</span>
                    <span className="text-base font-extrabold text-foreground tabular-nums">
                      ৳ {Number(formData.base_salary || 0).toLocaleString()}
                    </span>
                    <span className="text-[12px] text-muted-foreground block capitalize">
                      {formData.salary_basis?.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                {/* Profile Grid Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Designation</span>
                    <span className="font-semibold text-foreground">{formData.role || 'Staff'}</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Mobile Contact</span>
                    <span className="font-mono font-medium text-foreground">{formData.mobile || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Shift Hours</span>
                    <span className="font-medium text-foreground">
                      {formData.duty_settings?.office_start_time || '09:00'} – {formData.duty_settings?.office_end_time || '18:00'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Weekly Off</span>
                    <span className="font-medium text-foreground">{formData.duty_settings?.weekly_off_day || 'Friday'}</span>
                  </div>

                  <div>
                    <span className="text-[12px] text-muted-foreground block">Overtime Rate</span>
                    <span className="font-semibold text-primary">৳ {formData.overtime_hourly_rate}/hr</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Payment Method</span>
                    <span className="font-semibold text-foreground uppercase">{formData.payment_method || 'cash'}</span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Portal Access</span>
                    <span className={`font-semibold ${formData.portal_credentials?.create_login ? 'text-success' : 'text-muted-foreground'}`}>
                      {formData.portal_credentials?.create_login ? `Enabled (${formData.portal_credentials.role})` : 'Disabled'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[12px] text-muted-foreground block">Attached Docs</span>
                    <span className="font-semibold text-foreground">
                      {formData.document_attachments?.length ? `${formData.document_attachments.length} Files` : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Ready Confirmation Banner */}
              <div className="p-3.5 rounded-xl border border-success/30 bg-success-surface text-success text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-success" />
                <div>
                  <span className="font-bold block">Ready for Employee Registration</span>
                  <span className="text-[12px] opacity-90">
                    Clicking &ldquo;Complete &amp; Save&rdquo; will register this profile into the workforce directory and generate their attendance roster profile.
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-3.5 sm:p-4 border-t border-border bg-muted flex items-center justify-between shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="h-9 px-3 text-xs border-border bg-card hover:bg-muted"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            <span>{tBilingual('Back', 'পূর্ববর্তী')}</span>
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="h-9 px-4 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                <span>{tBilingual('Continue', 'পরবর্তী ধাপ')}</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-9 px-5 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
              >
                {isSubmitting
                  ? tBilingual('Saving Employee...', 'সংরক্ষণ করা হচ্ছে...')
                  : initialData
                  ? tBilingual('Update Employee Profile', 'প্রোফাইল আপডেট করুন')
                  : tBilingual('Complete & Save Employee', 'কর্মী নিবন্ধন সম্পন্ন করুন')}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
