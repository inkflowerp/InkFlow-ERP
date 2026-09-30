'use client'

import React, { useState } from 'react'
import {
  User,
  Briefcase,
  Wallet,
  Clock,
  CreditCard,
  Key,
  FileText,
  ChevronRight,
  ChevronLeft,
  Check,
  Building,
  AlertCircle,
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
} from '@/types/workforce.types'

export interface EmployeeFormWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialData?: EmployeeRecord | null
  branches?: Array<{ id: string; name: string }>
  onSave: (data: Partial<EmployeeRecord>) => Promise<boolean | void>
}

const STEPS = [
  { id: 1, label: 'Basic Info', labelBn: 'মৌলিক তথ্য', icon: User },
  { id: 2, label: 'Employment', labelBn: 'নিয়োগ তথ্য', icon: Briefcase },
  { id: 3, label: 'Compensation', labelBn: 'বেতন কাঠামো', icon: Wallet },
  { id: 4, label: 'Duty & Rules', labelBn: 'ডিউটি ও নিয়ম', icon: Clock },
  { id: 5, label: 'Payment', labelBn: 'পেমেন্ট পদ্ধতি', icon: CreditCard },
  { id: 6, label: 'Portal Access', labelBn: 'পোর্টাল লগইন', icon: Key },
  { id: 7, label: 'Documents', labelBn: 'ডকুমেন্টস', icon: FileText },
]

export function EmployeeFormWizard({
  open,
  onOpenChange,
  initialData,
  branches = [],
  onSave,
}: EmployeeFormWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Form State
  const [formData, setFormData] = useState<Partial<EmployeeRecord>>(() => {
    if (initialData) return { ...initialData }
    return {
      name: '',
      name_bn: '',
      mobile: '',
      email: '',
      address: '',
      employee_id_number: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      department: 'printing',
      role: '',
      employee_type: 'permanent',
      joining_date: new Date().toISOString().split('T')[0],
      salary_basis: 'monthly',
      base_salary: 20000,
      daily_rate: 800,
      hourly_rate: 100,
      overtime_hourly_rate: 150,
      payment_method: 'cash',
      status: 'active',
      duty_settings: {
        office_start_time: '09:00',
        office_end_time: '18:00',
        late_grace_minutes: 15,
        weekly_off_day: 'Friday',
        ot_calc_type: '1.5x_standard',
      },
      portal_credentials: {
        create_login: false,
        username: '',
        role: 'operator',
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

  const updatePortal = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      portal_credentials: {
        ...(prev.portal_credentials || { create_login: false }),
        [field]: value,
      },
    }))
  }

  const handleNext = () => {
    setErrorMsg(null)
    // Validate Step 1
    if (currentStep === 1) {
      if (!formData.name?.trim()) {
        setErrorMsg('Employee full name is required.')
        return
      }
      if (!formData.mobile?.trim()) {
        setErrorMsg('Mobile number is required for attendance and communication.')
        return
      }
    }
    // Validate Step 2
    if (currentStep === 2) {
      if (!formData.employee_id_number?.trim()) {
        setErrorMsg('Employee ID number is required.')
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white border-slate-200 shadow-xl rounded-2xl">
        <DialogHeader className="p-5 border-b border-slate-100 bg-slate-50/60">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {initialData ? 'Edit Employee Profile' : 'Add New Employee'}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Step {currentStep} of 7: {STEPS[currentStep - 1].label} ({STEPS[currentStep - 1].labelBn})
          </DialogDescription>

          {/* Stepper Progress Bar */}
          <div className="flex items-center gap-1.5 pt-3 overflow-x-auto">
            {STEPS.map((s) => {
              const Icon = s.icon
              const isDone = s.id < currentStep
              const isCurrent = s.id === currentStep
              return (
                <button
                  key={s.id}
                  onClick={() => setCurrentStep(s.id)}
                  type="button"
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
                    isCurrent
                      ? 'bg-blue-600 text-white shadow-sm'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {isDone ? <Check className="w-3 h-3 text-emerald-600" /> : <Icon className="w-3 h-3" />}
                  <span>{s.label}</span>
                </button>
              )
            })}
          </div>
        </DialogHeader>

        {/* Step Contents */}
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: Basic Information */}
          {currentStep === 1 && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Full Name (English) *</Label>
                  <Input
                    placeholder="e.g. Rahim Uddin"
                    value={formData.name || ''}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Full Name (বাংলা)</Label>
                  <Input
                    placeholder="যেমনঃ রহিম উদ্দিন"
                    value={formData.name_bn || ''}
                    onChange={(e) => updateField('name_bn', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Mobile Phone *</Label>
                  <Input
                    placeholder="+880 1700-000000"
                    value={formData.mobile || ''}
                    onChange={(e) => updateField('mobile', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Email Address</Label>
                  <Input
                    type="email"
                    placeholder="rahim@example.com"
                    value={formData.email || ''}
                    onChange={(e) => updateField('email', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Present Address</Label>
                <Input
                  placeholder="Street, City, Postal code..."
                  value={formData.address || ''}
                  onChange={(e) => updateField('address', e.target.value)}
                  className="h-9 text-xs mt-1"
                />
              </div>
            </div>
          )}

          {/* STEP 2: Employment */}
          {currentStep === 2 && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Employee ID Number *</Label>
                  <Input
                    placeholder="e.g. EMP-1001"
                    value={formData.employee_id_number || ''}
                    onChange={(e) => updateField('employee_id_number', e.target.value)}
                    className="h-9 text-xs mt-1 font-mono"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Department</Label>
                  <select
                    value={formData.department || 'printing'}
                    onChange={(e) => updateField('department', e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1"
                  >
                    <option value="printing">Printing</option>
                    <option value="finishing">Finishing</option>
                    <option value="fabrication">Fabrication</option>
                    <option value="design">Design & Prepress</option>
                    <option value="installation">Installation</option>
                    <option value="accounts">Accounts & Billing</option>
                    <option value="sales">Sales & Counter</option>
                    <option value="management">Management</option>
                    <option value="field_ops">Field Operations</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Role / Designation</Label>
                  <Input
                    placeholder="e.g. Master Offset Operator"
                    value={formData.role || ''}
                    onChange={(e) => updateField('role', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Employment Type</Label>
                  <select
                    value={formData.employee_type || 'permanent'}
                    onChange={(e) => updateField('employee_type', e.target.value as EmploymentType)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1 capitalize"
                  >
                    <option value="permanent">Permanent Staff</option>
                    <option value="contract">Contract Worker</option>
                    <option value="daily_worker">Daily Labor</option>
                    <option value="hourly_worker">Hourly Worker</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Joining Date</Label>
                  <Input
                    type="date"
                    value={formData.joining_date || ''}
                    onChange={(e) => updateField('joining_date', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                {branches.length > 0 && (
                  <div>
                    <Label className="text-xs font-semibold text-slate-700">Branch Assignment</Label>
                    <select
                      value={formData.branch_id || ''}
                      onChange={(e) => updateField('branch_id', e.target.value || null)}
                      className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1"
                    >
                      <option value="">Default Branch</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Compensation */}
          {currentStep === 3 && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Salary Basis</Label>
                  <select
                    value={formData.salary_basis || 'monthly'}
                    onChange={(e) => updateField('salary_basis', e.target.value as SalaryBasis)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1 capitalize"
                  >
                    <option value="monthly">Monthly Fixed Salary</option>
                    <option value="daily_rate">Daily Wage (দিনমজুর)</option>
                    <option value="hourly_rate">Hourly Rate (ঘণ্টা ভিত্তিক)</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Base Salary (৳)</Label>
                  <Input
                    type="number"
                    value={formData.base_salary || 0}
                    onChange={(e) => updateField('base_salary', parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Daily Rate (৳)</Label>
                  <Input
                    type="number"
                    value={formData.daily_rate || 0}
                    onChange={(e) => updateField('daily_rate', parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Hourly Rate (৳)</Label>
                  <Input
                    type="number"
                    value={formData.hourly_rate || 0}
                    onChange={(e) => updateField('hourly_rate', parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">OT Hourly Rate (৳)</Label>
                  <Input
                    type="number"
                    value={formData.overtime_hourly_rate || 0}
                    onChange={(e) => updateField('overtime_hourly_rate', parseFloat(e.target.value) || 0)}
                    className="h-9 text-xs mt-1 tabular-nums"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Duty & Rules */}
          {currentStep === 4 && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Office Start Time</Label>
                  <Input
                    type="time"
                    value={formData.duty_settings?.office_start_time || '09:00'}
                    onChange={(e) => updateDuty('office_start_time', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Office End Time</Label>
                  <Input
                    type="time"
                    value={formData.duty_settings?.office_end_time || '18:00'}
                    onChange={(e) => updateDuty('office_end_time', e.target.value)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Late Grace Period (Mins)</Label>
                  <Input
                    type="number"
                    value={formData.duty_settings?.late_grace_minutes ?? 15}
                    onChange={(e) => updateDuty('late_grace_minutes', parseInt(e.target.value) || 0)}
                    className="h-9 text-xs mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">Weekly Off Day</Label>
                  <select
                    value={formData.duty_settings?.weekly_off_day || 'Friday'}
                    onChange={(e) => updateDuty('weekly_off_day', e.target.value)}
                    className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1"
                  >
                    <option value="Friday">Friday (শুক্রবার)</option>
                    <option value="Sunday">Sunday (রবিবার)</option>
                    <option value="Saturday">Saturday (শনিবার)</option>
                    <option value="None">None / Roster Based</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Payment */}
          {currentStep === 5 && (
            <div className="space-y-3.5 text-xs">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Preferred Payout Method</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                  {(['cash', 'bank', 'bkash', 'nagad', 'rocket'] as PaymentMethod[]).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => updateField('payment_method', method)}
                      className={`p-2.5 rounded-lg border text-center uppercase font-bold text-xs transition-all ${
                        formData.payment_method === method
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Portal Access */}
          {currentStep === 6 && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.portal_credentials?.create_login || false}
                    onChange={(e) => updatePortal('create_login', e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <span className="font-semibold text-slate-900 text-xs">
                    Enable Web & Mobile App Access
                  </span>
                </label>

                {formData.portal_credentials?.create_login && (
                  <div className="space-y-3 pt-2">
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Login Username / Mobile</Label>
                      <Input
                        placeholder="Mobile or username"
                        value={formData.portal_credentials?.username || formData.mobile || ''}
                        onChange={(e) => updatePortal('username', e.target.value)}
                        className="h-9 text-xs mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-slate-700">Role</Label>
                      <select
                        value={formData.portal_credentials?.role || 'operator'}
                        onChange={(e) => updatePortal('role', e.target.value)}
                        className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 mt-1 capitalize"
                      >
                        <option value="operator">Production Operator</option>
                        <option value="designer">Graphic Designer</option>
                        <option value="manager">Shop Floor Manager</option>
                        <option value="sales_rep">Counter Sales Rep</option>
                        <option value="field_staff">Field Installation Staff</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 7: Documents */}
          {currentStep === 7 && (
            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-white text-center space-y-2">
                <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="font-semibold text-slate-900 text-xs">Identity & Contract Files</h4>
                <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                  National ID (NID), appointment letter, and resume attachments can be uploaded now or attached later.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleBack}
            disabled={currentStep === 1 || isSubmitting}
            className="h-8 text-xs border-slate-200"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            <span>Back</span>
          </Button>

          <div className="flex items-center gap-2">
            {currentStep < 7 ? (
              <Button
                type="button"
                size="sm"
                onClick={handleNext}
                className="h-8 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs min-h-[32px]"
              >
                <span>Continue</span>
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="h-8 px-5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs min-h-[32px]"
              >
                {isSubmitting ? 'Saving...' : initialData ? 'Update Employee' : 'Complete & Save'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
