'use client'

import React, { useState, useMemo } from 'react'
import {
  User,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Search,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Building,
  Eye,
  Sparkles,
} from 'lucide-react'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { RoleRow, BranchRow } from '@/types/tenant.types'
import { DataScope } from '@/types/rbac.types'
import {
  PRACTICAL_RESPONSIBILITIES,
  getResponsibilityPresetsForRole,
  getPracticalDefaultDataScope,
  DEFAULT_RESPONSIBILITY_MATRICES,
} from '@/lib/auth/rbac.client'
import { createUserWithEmployeeAction } from '@/actions/company-users.actions'
import { useToast } from '@/components/shared/toast-feedback'

interface CreateUserWizardProps {
  isOpen: boolean
  onClose: () => void
  employees: any[]
  roles: RoleRow[]
  branches: BranchRow[]
  companyId: string
  tenantSlug: string
  onSuccess: () => void
}

type WizardStep = 1 | 2 | 3 | 4

export function CreateUserWizard({
  isOpen,
  onClose,
  employees = [],
  roles = [],
  branches = [],
  companyId,
  tenantSlug,
  onSuccess,
}: CreateUserWizardProps) {
  const { showToast } = useToast()

  const [step, setStep] = useState<WizardStep>(1)
  const [empSearch, setEmpSearch] = useState('')

  // Step 1: Selected Employee
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)
  const [isExternalUser, setIsExternalUser] = useState(false)

  // Step 2: Account Details
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')

  // Step 3: Access & Role
  const [selectedRoleId, setSelectedRoleId] = useState<string>('')
  const [selectedResponsibilities, setSelectedResponsibilities] = useState<string[]>([])
  const [primaryBranchId, setPrimaryBranchId] = useState<string>('')
  const [additionalBranchIds, setAdditionalBranchIds] = useState<string[]>([])
  const [selectedScope, setSelectedScope] = useState<DataScope>('assigned')

  const [isSubmitting, setIsSubmitting] = useState(false)

  // Reset or initialize on open
  const resetForm = () => {
    setStep(1)
    setEmpSearch('')
    setSelectedEmpId(null)
    setIsExternalUser(false)
    setFullName('')
    setEmail('')
    setUsername('')
    setPhone('')
    const defaultRole = roles.find((r) => r.slug === 'operator' || r.slug === 'production_operator') || roles[0]
    const rId = defaultRole?.id || ''
    setSelectedRoleId(rId)
    if (defaultRole) {
      setSelectedResponsibilities(getResponsibilityPresetsForRole(defaultRole.slug || defaultRole.name))
      setSelectedScope(getPracticalDefaultDataScope(defaultRole.slug || defaultRole.name))
    }
    setPrimaryBranchId(branches[0]?.id || '')
    setAdditionalBranchIds([])
  }

  // Filtered employees for Step 1
  const filteredEmployees = useMemo(() => {
    const q = empSearch.toLowerCase().trim()
    return employees.filter((emp) => {
      if (!q) return true
      return (
        emp.name?.toLowerCase().includes(q) ||
        emp.name_bn?.toLowerCase().includes(q) ||
        emp.employee_id_number?.toLowerCase().includes(q) ||
        emp.mobile?.includes(q) ||
        emp.department?.toLowerCase().includes(q)
      )
    })
  }, [employees, empSearch])

  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmpId) || null
  }, [employees, selectedEmpId])

  const selectedRole = useMemo(() => {
    return roles.find((r) => r.id === selectedRoleId) || null
  }, [roles, selectedRoleId])

  // Select employee helper: pre-populates name, email, username, branch
  const handleSelectEmployee = (emp: any) => {
    if (emp.alreadyHasLogin) return
    setSelectedEmpId(emp.id)
    setIsExternalUser(false)
    setFullName(emp.name || '')
    setEmail(emp.email || '')
    const baseUser = (emp.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15)
    const badge = (emp.employee_id_number || '').toLowerCase().replace(/[^a-z0-9]/g, '')
    setUsername(badge ? `${baseUser}_${badge}` : baseUser)
    setPhone(emp.mobile || '')
    if (emp.branch_id) {
      setPrimaryBranchId(emp.branch_id)
    }

    // Map employee role to standard role template
    const matchedRole = roles.find(
      (r) =>
        r.slug === emp.role?.toLowerCase() ||
        r.name.toLowerCase().includes(emp.role?.toLowerCase() || '')
    )
    if (matchedRole) {
      setSelectedRoleId(matchedRole.id)
      setSelectedResponsibilities(getResponsibilityPresetsForRole(matchedRole.slug || matchedRole.name))
      setSelectedScope(getPracticalDefaultDataScope(matchedRole.slug || matchedRole.name))
    }
  }

  const handleRoleChange = (rId: string) => {
    setSelectedRoleId(rId)
    const r = roles.find((role) => role.id === rId)
    if (r) {
      setSelectedResponsibilities(getResponsibilityPresetsForRole(r.slug || r.name))
      setSelectedScope(getPracticalDefaultDataScope(r.slug || r.name))
    }
  }

  const toggleResponsibility = (resp: string) => {
    setSelectedResponsibilities((prev) =>
      prev.includes(resp) ? prev.filter((r) => r !== resp) : [...prev, resp]
    )
  }

  const toggleAdditionalBranch = (bId: string) => {
    setAdditionalBranchIds((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    )
  }

  // Count default permissions preview
  const defaultPermissionsCount = useMemo(() => {
    if (!selectedRole?.slug) return 0
    const matrix = (DEFAULT_RESPONSIBILITY_MATRICES as Record<string, any>)[selectedRole.slug]
    if (!matrix) return 0
    let count = 0
    for (const mod of Object.values(matrix)) {
      if (mod && typeof mod === 'object') {
        count += Object.values(mod).filter(Boolean).length
      }
    }
    return count
  }, [selectedRole])

  // Validation per step
  const canProceedStep1 = selectedEmpId !== null || isExternalUser
  const canProceedStep2 = fullName.trim().length > 0 && email.trim().includes('@')
  const canProceedStep3 = selectedRoleId !== '' && selectedResponsibilities.length > 0

  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    try {
      const scopesDict: Record<string, DataScope> = {
        customers: selectedScope,
        quotations: selectedScope,
        orders: selectedScope,
        design: selectedScope === 'company' ? 'company' : 'assigned',
        invoices: selectedScope === 'company' ? 'company' : selectedScope,
        payments: selectedScope === 'company' ? 'company' : selectedScope,
        production: selectedScope === 'company' ? 'company' : 'assigned',
        machineries: selectedScope,
        inventory: selectedScope === 'company' ? 'company' : 'branch',
        reports: selectedScope === 'company' ? 'company' : 'branch',
        delivery: selectedScope,
      }

      const res = await createUserWithEmployeeAction({
        companyId,
        tenantSlug,
        employeeId: isExternalUser ? null : selectedEmpId,
        email: email.trim().toLowerCase(),
        username: username.trim() || undefined,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        roleId: selectedRoleId,
        responsibilities: selectedResponsibilities,
        branchId: primaryBranchId || null,
        additionalBranchIds: additionalBranchIds,
        dataScopes: scopesDict,
      })

      if (res.success) {
        showToast({
          type: 'success',
          title: 'User Invited',
          titleBn: 'ব্যবহারকারী তৈরি করা হয়েছে',
          message: `${fullName} has been invited. They will receive an invitation email to set their login credentials.`,
        })
        resetForm()
        onSuccess()
        onClose()
      } else {
        showToast({
          type: 'error',
          title: 'Setup Failed',
          titleBn: 'অ্যাকাউন্ট তৈরি ব্যর্থ',
          message: res.message || 'Unable to complete user setup',
        })
      }
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Error',
        titleBn: 'ত্রুটি',
        message: err.message || 'An unexpected error occurred',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <ModalDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          resetForm()
          onClose()
        }
      }}
      title="Add Team User"
      description="Create a system login account and configure access in 4 quick steps."
      hideFooter={true}
      size="2xl"
    >
      <div className="space-y-5 pt-1">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 text-xs">
          {[
            { s: 1, label: '1. Select Employee' },
            { s: 2, label: '2. Account' },
            { s: 3, label: '3. Access & Scope' },
            { s: 4, label: '4. Review & Invite' },
          ].map((item) => (
            <div
              key={item.s}
              className={`flex items-center gap-1.5 font-medium ${
                step === item.s
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : step > item.s
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] ${
                  step === item.s
                    ? 'bg-blue-600 text-white'
                    : step > item.s
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {step > item.s ? <Check className="h-3 w-3" /> : item.s}
              </div>
              <span className="hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>

        {/* STEP 1: Select Employee */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search employee by name, ID (e.g. EMP-1024), mobile..."
                value={empSearch}
                onChange={(e) => setEmpSearch(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg">
              {filteredEmployees.length === 0 ? (
                <div className="p-6 text-center text-sm text-slate-500">
                  No employees found matching &quot;{empSearch}&quot;.
                </div>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedEmpId === emp.id
                  const isBlocked = emp.alreadyHasLogin

                  return (
                    <button
                      key={emp.id}
                      type="button"
                      disabled={isBlocked}
                      onClick={() => handleSelectEmployee(emp)}
                      className={`w-full text-left p-3 transition-colors flex items-center justify-between gap-3 text-sm ${
                        isSelected
                          ? 'bg-blue-50/80 dark:bg-blue-950/30'
                          : isBlocked
                          ? 'opacity-50 cursor-not-allowed bg-slate-50/50 dark:bg-slate-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span className="truncate">{emp.name}</span>
                          <Badge variant="outline" className="text-xs font-mono font-normal">
                            {emp.employee_id_number || 'EMP'}
                          </Badge>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>{emp.department || 'General'}</span>
                          {emp.role && <span>• {emp.role}</span>}
                          {emp.mobile && <span>• {emp.mobile}</span>}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {isBlocked ? (
                          <Badge variant="outline" className="text-[11px] text-amber-700 dark:text-amber-300 border-amber-200 bg-amber-50">
                            Already has a login
                          </Badge>
                        ) : isSelected ? (
                          <div className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center">
                            <Check className="h-3.5 w-3.5" />
                          </div>
                        ) : (
                          <div className="h-6 w-6 rounded-full border border-slate-300 dark:border-slate-600" />
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setSelectedEmpId(null)
                  setIsExternalUser(true)
                  setFullName('')
                  setEmail('')
                  setUsername('')
                  setPhone('')
                }}
                className={`text-xs font-medium ${
                  isExternalUser
                    ? 'text-blue-600 dark:text-blue-400 font-bold underline'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                + Create external login without linked employee
              </button>

              <Button
                size="sm"
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <span>Account Info</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2: Account Details */}
        {step === 2 && (
          <div className="space-y-4">
            {selectedEmployee ? (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs flex items-center justify-between text-blue-900 dark:text-blue-300">
                <div>
                  Linking to employee: <strong>{selectedEmployee.name}</strong> ({selectedEmployee.employee_id_number || 'EMP'})
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-blue-600 dark:text-blue-400 underline font-medium"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-400">
                External account (Not linked to workforce employee).
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Full Name *
                </Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rahim Ahmed"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Email Address (Login ID) *
                </Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahim@example.com"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Username (Optional alias)
                </Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="rahim_operator"
                  className="text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Mobile Number (Optional)
                </Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="01700-000000"
                  className="text-sm"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
              <div>
                <strong>Secure Invitation Flow:</strong> The user will receive an email invitation to verify their identity and set their private password. No temporary passwords are displayed or stored.
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep(1)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(3)}
                disabled={!canProceedStep2}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <span>Access & Role</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Access & Role */}
        {step === 3 && (
          <div className="space-y-4">
            {/* Role Selection */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Primary Role Template
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {roles.map((r) => {
                  const isSelected = selectedRoleId === r.id
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleChange(r.id)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70 dark:bg-blue-950/30 text-blue-950 dark:text-blue-200 ring-1 ring-blue-600'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <div className="text-xs font-semibold truncate">{r.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                        {r.name_bn || r.slug}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Responsibilities Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Assigned Responsibilities ({selectedResponsibilities.length})
                </Label>
                <span className="text-[11px] text-slate-400">Presets auto-applied</span>
              </div>
              <div className="flex flex-wrap gap-1.5 p-2.5 border border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-900/20">
                {PRACTICAL_RESPONSIBILITIES.map((resp) => {
                  const isChecked = selectedResponsibilities.includes(resp)
                  return (
                    <button
                      key={resp}
                      type="button"
                      onClick={() => toggleResponsibility(resp)}
                      className={`px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                        isChecked
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {isChecked && <Check className="h-3 w-3" />}
                      <span>{resp}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Branch and Scope */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Primary Branch
                </Label>
                <select
                  value={primaryBranchId}
                  onChange={(e) => setPrimaryBranchId(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {(b as any).is_head_office ? '(Main)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Data Scope
                </Label>
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value as DataScope)}
                  className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="assigned">Assigned Work (Standard)</option>
                  <option value="department">Department Work</option>
                  <option value="branch">Branch Work</option>
                  <option value="company">Entire Company (Elevated)</option>
                </select>
              </div>
            </div>

            {/* Preview Banner */}
            <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg text-xs flex items-center justify-between text-slate-700 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>
                  <strong>{defaultPermissionsCount} default permissions</strong> will be provisioned.
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Can customize after invite</span>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button variant="outline" size="sm" onClick={() => setStep(2)} className="gap-1.5">
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
              <Button
                size="sm"
                onClick={() => setStep(4)}
                disabled={!canProceedStep3}
                className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              >
                <span>Review & Invite</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Review & Invite */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px]">User</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {fullName}
                  </div>
                  <div className="text-slate-500 mt-0.5">{email}</div>
                  {username && <div className="text-slate-400 font-mono text-[11px]">@{username}</div>}
                </div>

                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px]">Workforce Link</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {selectedEmployee ? (
                      <span className="text-blue-600 dark:text-blue-400">
                        {selectedEmployee.name} ({selectedEmployee.employee_id_number || 'EMP'})
                      </span>
                    ) : (
                      <span className="text-slate-400">Not Linked (External)</span>
                    )}
                  </div>
                  <div className="text-slate-500 mt-0.5">
                    {selectedEmployee?.department || 'Operations'}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px]">Role Template</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {selectedRole?.name}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    {defaultPermissionsCount} default permissions
                  </div>
                </div>

                <div>
                  <div className="text-slate-400 uppercase tracking-wider text-[10px]">Primary Branch</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">
                    {branches.find((b) => b.id === primaryBranchId)?.name || 'Default Branch'}
                  </div>
                  <div className="text-slate-500 text-[11px]">
                    Scope: {selectedScope === 'company' ? 'Entire Company' : `${selectedScope} Work`}
                  </div>
                </div>
              </div>

              <div>
                <div className="text-slate-400 uppercase tracking-wider text-[10px] mb-1.5">
                  Responsibilities ({selectedResponsibilities.length})
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedResponsibilities.map((resp) => (
                    <Badge key={resp} variant="secondary" className="text-[11px] font-normal">
                      {resp}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStep(3)}
                disabled={isSubmitting}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>

              <Button
                size="sm"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Creating & Inviting...</span>
                  </>
                ) : (
                  <>
                    <Mail className="h-3.5 w-3.5" />
                    <span>Create & Invite</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ModalDialog>
  )
}
