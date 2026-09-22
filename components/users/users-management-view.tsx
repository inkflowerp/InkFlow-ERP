'use client'

import React, { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { getTenantNavHref } from '@/lib/tenant/tenant-url'
import {
  Users,
  Users2,
  UserPlus,
  Mail,
  Shield,
  Building,
  CheckCircle2,
  Ban,
  RotateCcw,
  KeyRound,
  Search,
  Crown,
  Sparkles,
  Copy,
  Briefcase,
  Sliders,
  ShieldAlert,
  ShieldCheck,
  Layers,
  History,
  Lock,
  Eye,
  Check,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useI18n } from '@/i18n/context'

import {
  listCompanyUsersAction,
  listRolesAction,
  listBranchesAction,
  inviteUserAction,
  createCompanyUserAction,
  toggleUserStatusAction,
  changeUserRoleAction,
  assignUserBranchAction,
  resetUserAccessAction,
} from '@/actions/company-users.actions'
import { getEmployeesAction } from '@/actions/workforce.actions'
import type { EmployeeRecord } from '@/types/workforce.types'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { SettingsNav } from '@/components/settings/settings-nav'
import { UserPermissionsDrawer } from '@/components/users/user-permissions-drawer'
import { PermissionSimulator } from '@/components/users/permission-simulator'
import { RolesMatrixTab } from '@/components/users/roles-matrix-tab'
import { SecurityAuditTab } from '@/components/users/security-audit-tab'
import { cn } from '@/lib/utils'
import { toBengaliDigits } from '@/hooks/use-public-plans'
import { PrintERPDataStore, STORAGE_KEYS } from '@/lib/db/data-store'

interface UsersManagementViewProps {
  hideHeader?: boolean
  initialTab?: 'users' | 'roles' | 'simulator' | 'audit'
}

type ActivePanelTab = 'users' | 'roles' | 'simulator' | 'audit'

export function UsersManagementView({ hideHeader = false, initialTab }: UsersManagementViewProps) {
  const pathname = usePathname()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, isTrial, refreshUsage, usage } = useSubscription()
  const [mounted, setMounted] = useState(false)

  // Tab State with URL query sync
  const queryTab = (searchParams?.get('tab') as ActivePanelTab) || initialTab || 'users'
  const [activeTab, setActiveTab] = useState<ActivePanelTab>(queryTab)

  useEffect(() => {
    if (searchParams?.get('tab')) {
      const t = searchParams.get('tab') as ActivePanelTab
      if (['users', 'roles', 'simulator', 'audit'].includes(t)) {
        setActiveTab(t)
      }
    }
  }, [searchParams])

  const handleTabChange = (tab: ActivePanelTab) => {
    setActiveTab(tab)
    const currentParams = new URLSearchParams(searchParams ? searchParams.toString() : '')
    currentParams.set('tab', tab)
    router.replace(`${pathname}?${currentParams.toString()}`, { scroll: false })
  }

  const [users, setUsers] = useState<CompanyUserWithProfile[]>([])
  const [employees, setEmployees] = useState<EmployeeRecord[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  const userCheck = checkCanCreate('max_users')

  const handleOpenInvite = () => {
    const check = checkCanCreate('max_users')
    if (!check.allowed) {
      openLimitExceededModal('max_users')
      return
    }
    setIsInviteOpen(true)
  }

  const handleOpenAddUser = () => {
    const check = checkCanCreate('max_users')
    if (!check.allowed) {
      openLimitExceededModal('max_users')
      return
    }
    generateNewPassword()
    setIsAddUserOpen(true)
  }

  // Dialog states
  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [isAddUserOpen, setIsAddUserOpen] = useState(false)
  const [isChangeRoleOpen, setIsChangeRoleOpen] = useState(false)
  const [isAssignBranchOpen, setIsAssignBranchOpen] = useState(false)
  const [isDisableConfirmOpen, setIsDisableConfirmOpen] = useState(false)
  const [isPermissionsDrawerOpen, setIsPermissionsDrawerOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<CompanyUserWithProfile | null>(null)
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<CompanyUserWithProfile | null>(null)

  // Form states
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRoleId, setInviteRoleId] = useState('')
  const [inviteBranchId, setInviteBranchId] = useState('')

  const [addFullName, setAddFullName] = useState('')
  const [addFullNameBn, setAddFullNameBn] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRoleId, setAddRoleId] = useState('')
  const [addBranchId, setAddBranchId] = useState('')
  const [copiedPassword, setCopiedPassword] = useState(false)

  const generateNewPassword = () => {
    const randomChars = Math.random().toString(36).slice(-6)
    const randomPin = Math.floor(100 + Math.random() * 900)
    const generated = `InkFlow!${randomChars}@${randomPin}`
    setAddPassword(generated)
    setCopiedPassword(false)
  }

  const handleCopyPassword = () => {
    if (!addPassword) return
    navigator.clipboard.writeText(addPassword)
    setCopiedPassword(true)
    setTimeout(() => setCopiedPassword(false), 2000)
  }

  const [targetRoleId, setTargetRoleId] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Helper: Match system user to employee workforce identity
  const getLinkedEmployee = (user: CompanyUserWithProfile): EmployeeRecord | undefined => {
    const email = (user.profile?.email || user.invited_email || '').toLowerCase()
    const phone = user.profile?.phone || (user as any).invited_phone || (user as any).phone
    return employees.find(
      (e) =>
        (user.user_id && (e.user_id === user.user_id || e.id === user.user_id)) ||
        (email && e.email?.toLowerCase() === email) ||
        (phone && e.mobile === phone)
    )
  }

  // Load users, roles, branches, and workforce roster
  const loadData = async () => {
    if (!company) return
    const [uRes, rRes, bRes, empRes] = await Promise.all([
      listCompanyUsersAction(company.id),
      listRolesAction(company.id),
      listBranchesAction(company.id),
      getEmployeesAction(undefined, company.id),
    ])

    if (uRes.data) {
      setUsers(uRes.data)
      if (typeof window !== 'undefined') {
        try {
          PrintERPDataStore.set(STORAGE_KEYS.COMPANY_USERS, uRes.data)
        } catch {}
      }
    }
    if (empRes.success && empRes.data) {
      setEmployees(empRes.data)
    }
    if (rRes && rRes.length > 0) {
      setRoles(rRes)
      if (typeof window !== 'undefined') {
        try {
          PrintERPDataStore.set(STORAGE_KEYS.ROLES, rRes)
        } catch {}
      }
    }
    if (bRes && bRes.length > 0) {
      setBranches(bRes)
      if (typeof window !== 'undefined') {
        try {
          PrintERPDataStore.set(STORAGE_KEYS.BRANCHES, bRes)
        } catch {}
      }
    }
    if (rRes.length > 0) {
      setInviteRoleId((prev) => prev || rRes[0].id)
      setAddRoleId((prev) => prev || rRes[0].id)
    }
    if (bRes && bRes.length > 0) {
      setInviteBranchId((prev) => prev || bRes[0].id)
      setAddBranchId((prev) => prev || bRes[0].id)
    }
    setIsLoading(false)
    setMounted(true)
  }

  useEffect(() => {
    loadData()

    const handleRealtimeUsersSync = () => {
      loadData()
    }

    window.addEventListener('printerp_table_synced:company_users', handleRealtimeUsersSync)
    window.addEventListener('printerp_table_synced:roles', handleRealtimeUsersSync)
    window.addEventListener('printerp_table_synced:branches', handleRealtimeUsersSync)
    window.addEventListener('printerp_data_sync', handleRealtimeUsersSync)

    return () => {
      window.removeEventListener('printerp_table_synced:company_users', handleRealtimeUsersSync)
      window.removeEventListener('printerp_table_synced:roles', handleRealtimeUsersSync)
      window.removeEventListener('printerp_table_synced:branches', handleRealtimeUsersSync)
      window.removeEventListener('printerp_data_sync', handleRealtimeUsersSync)
    }
  }, [company])

  // Statistics & Security Posture Metrics
  const securityPosture = useMemo(() => {
    const activeCount = users.filter((u) => u.status === 'active').length
    const disabledCount = users.filter((u) => u.status === 'disabled').length
    const invitedCount = users.filter((u) => u.status === 'invited').length
    const customRolesCount = roles.filter((r) => !r.is_system).length

    const privilegedUsersCount = users.filter((u) => {
      const primaryRole = u.roles?.[0]
      const isOwner =
        primaryRole?.slug === 'business_owner' ||
        primaryRole?.slug === 'owner' ||
        (u as any).role === 'owner' ||
        (u as any).role === 'business_owner' ||
        u.responsibilities?.includes('business_owner') ||
        u.responsibilities?.includes('owner')
      return isOwner
    }).length

    return {
      total: users.length,
      activeCount,
      disabledCount,
      invitedCount,
      customRolesCount,
      privilegedUsersCount,
    }
  }, [users, roles])

  // Filtered users with multi-dimensional filtering
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery) {
        const term = searchQuery.toLowerCase().trim()
        const name = u.profile?.full_name?.toLowerCase() || ''
        const nameBn = u.profile?.full_name_bn?.toLowerCase() || ''
        const email = (u.profile?.email || u.invited_email || '').toLowerCase()
        const phone = u.profile?.phone || ''
        const dept = u.department?.toLowerCase() || ''
        const matchesSearch =
          name.includes(term) ||
          nameBn.includes(term) ||
          email.includes(term) ||
          phone.includes(term) ||
          dept.includes(term)
        if (!matchesSearch) return false
      }

      if (roleFilter !== 'all') {
        const hasRole =
          u.roles?.some((r) => r.id === roleFilter || r.slug === roleFilter) ||
          u.responsibilities?.includes(roleFilter)
        if (!hasRole) return false
      }

      if (statusFilter !== 'all') {
        if (u.status !== statusFilter) return false
      }

      if (branchFilter !== 'all') {
        if (branchFilter === 'global') {
          if (u.branch_id) return false
        } else {
          if (u.branch_id !== branchFilter && !u.authorized_branch_ids?.includes(branchFilter)) {
            return false
          }
        }
      }

      return true
    })
  }, [users, searchQuery, roleFilter, statusFilter, branchFilter])

  // Handlers
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !inviteEmail) return

    const check = checkCanCreate('max_users')
    if (!check.allowed) {
      openLimitExceededModal('max_users')
      return
    }

    const res = await inviteUserAction(
      company.id,
      company.slug,
      inviteEmail,
      inviteRoleId,
      inviteBranchId || null
    )

    if (res.success) {
      await loadData()
      refreshUsage()
      setIsInviteOpen(false)
      setInviteEmail('')
      showNotification(`Invitation sent to ${inviteEmail}`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:company_users'))
        window.dispatchEvent(new CustomEvent('printerp_data_sync'))
      }
    } else {
      showNotification(res.message || 'Failed to send invitation')
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !addEmail || !addFullName) return

    const check = checkCanCreate('max_users')
    if (!check.allowed) {
      openLimitExceededModal('max_users')
      return
    }

    const res = await createCompanyUserAction({
      companyId: company.id,
      tenantSlug: company.slug,
      fullName: addFullName,
      fullNameBn: addFullNameBn || undefined,
      email: addEmail,
      phone: addPhone,
      password: addPassword,
      roleId: addRoleId,
      branchId: addBranchId || null,
    })

    if (res.success) {
      await loadData()
      refreshUsage()
      setIsAddUserOpen(false)
      setAddFullName('')
      setAddFullNameBn('')
      setAddEmail('')
      setAddPhone('')
      setAddPassword('')
      showNotification(`User ${addFullName} created successfully!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('printerp_table_synced:company_users'))
        window.dispatchEvent(new CustomEvent('printerp_data_sync'))
      }
    } else {
      showNotification(res.message || 'Failed to create user')
    }
  }

  const handleToggleStatus = async (user: CompanyUserWithProfile) => {
    if (!company) return
    const nextStatus = user.status === 'active' ? 'disabled' : 'active'
    await toggleUserStatusAction(user.id, nextStatus, company.slug)

    setUsers(users.map((u) => (u.id === user.id ? { ...u, status: nextStatus } : u)))
    setIsDisableConfirmOpen(false)
    showNotification(
      nextStatus === 'disabled'
        ? `Access disabled for ${user.profile?.full_name || 'user'}. RLS blocked.`
        : `Access restored for ${user.profile?.full_name || 'user'}.`
    )
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_table_synced:company_users'))
      window.dispatchEvent(new CustomEvent('printerp_data_sync'))
    }
  }

  const handleChangeRole = async () => {
    if (!selectedUser || !company || !targetRoleId) return
    await changeUserRoleAction(selectedUser.id, targetRoleId, company.id, company.slug)
    const newRole = roles.find((r) => r.id === targetRoleId)
    setUsers(
      users.map((u) => (u.id === selectedUser.id ? { ...u, roles: newRole ? [newRole] : u.roles } : u))
    )
    setIsChangeRoleOpen(false)
    showNotification(`Role updated to ${newRole?.name}`)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_table_synced:company_users'))
      window.dispatchEvent(new CustomEvent('printerp_data_sync'))
    }
  }

  const handleAssignBranch = async () => {
    if (!selectedUser || !company) return
    await assignUserBranchAction(selectedUser.id, targetBranchId || null, company.slug)
    const newBranch = branches.find((b) => b.id === targetBranchId) || null
    setUsers(
      users.map((u) => (u.id === selectedUser.id ? { ...u, branch_id: targetBranchId, branch: newBranch } : u))
    )
    setIsAssignBranchOpen(false)
    showNotification(`Branch assigned: ${newBranch?.name || 'All Branches'}`)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('printerp_table_synced:company_users'))
      window.dispatchEvent(new CustomEvent('printerp_data_sync'))
    }
  }

  const handleResetAccess = async (user: CompanyUserWithProfile) => {
    const email = user.profile?.email || user.invited_email
    if (!email) return
    await resetUserAccessAction(email)
    showNotification(`Password reset dispatch sent to ${email}`)
  }

  if (!mounted) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800/40 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header & Main CTAs */}
      {!hideHeader && (
        <PageHeader
          titleEn="User & Access Control Center"
          titleBn="ইউজার ও এক্সেস কন্ট্রোল সেন্টার"
          descriptionEn="Enterprise multi-tenant RBAC panel: manage members, roles, permissions, live simulation, and security logs."
          descriptionBn="প্রতিষ্ঠান সদস্য, ভূমিকা, পারমিশন ম্যাট্রিক্স, লাইভ সিমুলেশন ও নিরাপত্তা লগ ব্যবস্থাপনা।"
          icon={ShieldCheck}
          iconColor="text-sky-500"
          actions={
            <div className="flex items-center gap-2.5 flex-wrap">
              <Link href={getTenantNavHref('/hr', pathname, company?.slug)}>
                <Button
                  variant="outline"
                  className="text-xs border-blue-300 text-blue-800 bg-blue-50/70 hover:bg-blue-100 dark:border-blue-800 dark:text-blue-300 dark:bg-blue-950/40 font-semibold bangla-text"
                >
                  <Users2 className="mr-1.5 h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  {tBilingual('Workforce Roster', 'কর্মী ও পেরোল')} →
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={handleOpenInvite}
                title={!userCheck.allowed ? userCheck.reason : undefined}
                className="bangla-text text-xs border-slate-700"
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Invite Member', 'সদস্য আমন্ত্রণ')}
              </Button>
              <Button
                onClick={handleOpenAddUser}
                title={!userCheck.allowed ? userCheck.reason : undefined}
                className="bg-primary hover:bg-primary/90 text-xs text-white font-semibold bangla-text shadow-sm"
              >
                <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                {tBilingual('Add User', 'নতুন ব্যবহারকারী')}
              </Button>
            </div>
          }
        />
      )}

      {!hideHeader && <SettingsNav />}

      {/* Security Posture & Quota Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        {/* Total Users & Plan Quota */}
        <div className="p-3.5 rounded-2xl border bg-slate-900/60 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Seat Utilization</span>
            <Users className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-lg font-bold text-white flex items-baseline gap-1.5">
            <span>{users.length}</span>
            <span className="text-xs font-normal text-slate-500">/ {currentPlan.max_users} Seats</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                userCheck.exceeded ? 'bg-red-500' : userCheck.warning ? 'bg-amber-500' : 'bg-primary'
              )}
              style={{ width: `${Math.min(100, (users.length / (currentPlan.max_users || 1)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Active Staff */}
        <div className="p-3.5 rounded-2xl border bg-slate-900/60 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Members</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">{securityPosture.activeCount}</div>
          <div className="text-[11px] text-slate-500">{securityPosture.invitedCount} pending invites</div>
        </div>

        {/* Privileged Accounts */}
        <div className="p-3.5 rounded-2xl border bg-slate-900/60 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Super Owners</span>
            <Crown className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400">{securityPosture.privilegedUsersCount}</div>
          <div className="text-[11px] text-slate-500">Protected root clearance</div>
        </div>

        {/* Custom Roles */}
        <div className="p-3.5 rounded-2xl border bg-slate-900/60 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Role Templates</span>
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white">{roles.length}</div>
          <div className="text-[11px] text-purple-400">{securityPosture.customRolesCount} custom created</div>
        </div>

        {/* Branches */}
        <div className="hidden lg:block p-3.5 rounded-2xl border bg-slate-900/60 border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Branch Coverage</span>
            <Building className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="text-lg font-bold text-white">{branches.length}</div>
          <div className="text-[11px] text-slate-500">Authorized locations</div>
        </div>
      </div>

      {/* Control Center Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => handleTabChange('users')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
            activeTab === 'users'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          )}
        >
          <Users className="w-4 h-4" />
          <span>Team Directory (ব্যবহারকারী তালিকা)</span>
          <Badge variant="outline" className={cn('text-[10px] ml-1 border-0', activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400')}>
            {users.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('roles')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
            activeTab === 'roles'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          )}
        >
          <Sliders className="w-4 h-4" />
          <span>Roles & Matrix Studio (রোল ও পারমিশন)</span>
          <Badge variant="outline" className={cn('text-[10px] ml-1 border-0', activeTab === 'roles' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400')}>
            {roles.length}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('simulator')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
            activeTab === 'simulator'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          )}
        >
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          <span>Permission Inspector & Simulator (অ্যাক্সেস নিরীক্ষক)</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('audit')}
          className={cn(
            'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap',
            activeTab === 'audit'
              ? 'bg-primary text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
          )}
        >
          <History className="w-4 h-4" />
          <span>Security Audit Trail (অডিট লগ)</span>
        </button>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* TAB 1: USERS DIRECTORY */}
      {activeTab === 'users' && (
        <Card className="rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur-md shadow-md overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-white">Company Team Members ({filteredUsers.length})</CardTitle>
                  <Badge variant="secondary" className="text-2xs px-2 py-0.5 bg-slate-800 text-slate-300">
                    Total: {users.length}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-400 mt-0.5">
                  Active members can log in, access authorized ERP modules, and perform operations per their branch & role permissions.
                </CardDescription>
              </div>

              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  placeholder="Search user, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs rounded-xl bg-slate-950 border-slate-800"
                />
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="all">All Statuses ({users.length})</option>
                  <option value="active">Active ({users.filter((u) => u.status === 'active').length})</option>
                  <option value="invited">Pending Invite ({users.filter((u) => u.status === 'invited').length})</option>
                  <option value="disabled">Disabled ({users.filter((u) => u.status === 'disabled').length})</option>
                </select>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="all">All Roles ({roles.length})</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} {r.name_bn ? `(${r.name_bn})` : ''}
                    </option>
                  ))}
                </select>

                {/* Branch Filter */}
                <select
                  value={branchFilter}
                  onChange={(e) => setBranchFilter(e.target.value)}
                  className="h-8 px-2.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none"
                >
                  <option value="all">All Locations</option>
                  <option value="global">Central / All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>

                {(searchQuery || roleFilter !== 'all' || statusFilter !== 'all' || branchFilter !== 'all') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('')
                      setRoleFilter('all')
                      setStatusFilter('all')
                      setBranchFilter('all')
                    }}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer ml-1"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              <span className="text-[11px] text-slate-400">
                Showing {filteredUsers.length} of {users.length} members
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading && users.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="animate-pulse p-3 rounded-xl border border-slate-800 flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-800 shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <div className="h-4 w-32 bg-slate-800 rounded" />
                      <div className="h-3 w-48 bg-slate-800 rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                {searchQuery ? 'No members found matching your search.' : 'No members found in this workspace.'}
              </div>
            ) : (
              <>
                {/* 1. DESKTOP VIEW: Structured Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-950/80 text-xs font-semibold text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="py-3 px-4">Member / User</th>
                        <th className="py-3 px-4">Role & Clearance</th>
                        <th className="py-3 px-4">Assigned Branch</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {filteredUsers.map((user) => {
                        const profile = user.profile
                        const primaryRole = user.roles?.[0]
                        const primaryRoleSlug = primaryRole?.slug || (user as any).role || ''
                        const isOwner =
                          primaryRoleSlug === 'owner' ||
                          primaryRoleSlug === 'business_owner' ||
                          user.responsibilities?.includes('business_owner') ||
                          user.responsibilities?.includes('owner')
                        const isUserActive = user.status === 'active'
                        const isUserDisabled = user.status === 'disabled'
                        const isUserInvited = user.status === 'invited'
                        const linkedEmp = getLinkedEmployee(user)

                        return (
                          <tr
                            key={user.id}
                            className={cn(
                              'hover:bg-slate-800/40 transition-colors',
                              isUserDisabled && 'opacity-60 bg-slate-950/40'
                            )}
                          >
                            {/* Member Info */}
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                <div
                                  className={cn(
                                    'h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                                    isUserDisabled
                                      ? 'bg-slate-800 text-slate-500'
                                      : 'bg-gradient-to-br from-sky-600 to-indigo-700 text-white'
                                  )}
                                >
                                  {(profile?.full_name || user.invited_email || 'U')[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                                    {profile?.full_name || user.invited_email}
                                    {profile?.full_name_bn && (
                                      <span className="text-xs font-normal text-slate-400">
                                        ({profile.full_name_bn})
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-xs text-slate-400 flex items-center gap-2">
                                    <span>{profile?.email || user.invited_email}</span>
                                    {profile?.phone && <span>• {profile.phone}</span>}
                                  </div>
                                  {linkedEmp && (
                                    <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-900 text-sky-300 font-medium">
                                        <Briefcase className="h-2.5 w-2.5 mr-1 text-sky-400" />
                                        Workforce: {linkedEmp.employee_id_number} • {linkedEmp.department}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Role & Clearance Badge */}
                            <td className="py-3.5 px-4">
                              {isOwner ? (
                                <Badge
                                  variant="outline"
                                  className="font-semibold text-xs border-amber-500/40 bg-amber-500/10 text-amber-300"
                                >
                                  <Crown className="mr-1 h-3.5 w-3.5 text-amber-400" />
                                  <span>Owner (Universal Clearance)</span>
                                </Badge>
                              ) : (
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <Badge
                                    variant="outline"
                                    className="font-medium text-xs border-sky-500/30 bg-sky-500/10 text-sky-300"
                                  >
                                    <Shield className="mr-1 h-3 w-3" />
                                    {primaryRole?.name || (user as any).role || 'Team Member'}
                                    {primaryRole?.name_bn && ` (${primaryRole.name_bn})`}
                                  </Badge>
                                  {user.responsibilities && user.responsibilities.length > 1 && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 bg-slate-800 text-slate-300 border-slate-700">
                                      +{user.responsibilities.length - 1} responsibilities
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Branch */}
                            <td className="py-3.5 px-4 text-xs text-slate-300">
                              {user.branch ? (
                                <div className="flex items-center gap-1.5">
                                  <Building className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                  <span className="truncate max-w-[180px]">{user.branch.name}</span>
                                </div>
                              ) : (
                                <span className="text-slate-500 italic">All Branches (Global)</span>
                              )}
                            </td>

                            {/* Status Badge */}
                            <td className="py-3.5 px-4">
                              {isUserActive && (
                                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                                  Active
                                </Badge>
                              )}
                              {isUserDisabled && (
                                <Badge className="bg-rose-500/10 text-rose-400 border-rose-500/30 text-[10px]">
                                  Disabled
                                </Badge>
                              )}
                              {isUserInvited && (
                                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/30 text-[10px]">
                                  Pending Invite
                                </Badge>
                              )}
                            </td>

                            {/* Action Buttons */}
                            <td className="py-3.5 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 px-2.5 text-xs text-sky-400 bg-sky-950/40 hover:bg-sky-900/60 border-sky-800/80 font-semibold rounded-xl"
                                  onClick={() => {
                                    setSelectedUserForPermissions(user)
                                    setIsPermissionsDrawerOpen(true)
                                  }}
                                  title="Configure Access & Permissions"
                                >
                                  <Shield className="mr-1 h-3.5 w-3.5 text-sky-400" />
                                  Permissions
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs rounded-xl text-slate-300 hover:text-white"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setTargetRoleId(primaryRole?.id || roles[0]?.id || '')
                                    setIsChangeRoleOpen(true)
                                  }}
                                  disabled={isOwner}
                                  title="Change Role"
                                >
                                  Role
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs rounded-xl text-slate-300 hover:text-white"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setTargetBranchId(user.branch_id || '')
                                    setIsAssignBranchOpen(true)
                                  }}
                                  title="Assign Branch"
                                >
                                  Branch
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 px-2 text-xs text-sky-400 hover:text-sky-300 rounded-xl"
                                  onClick={() => handleResetAccess(user)}
                                  title="Send Password Reset"
                                >
                                  <KeyRound className="h-3.5 w-3.5" />
                                </Button>

                                {!isOwner && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className={cn(
                                      'h-8 px-2 text-xs rounded-xl',
                                      isUserDisabled ? 'text-emerald-400 hover:text-emerald-300' : 'text-rose-400 hover:text-rose-300'
                                    )}
                                    onClick={() => {
                                      setSelectedUser(user)
                                      if (isUserDisabled) {
                                        handleToggleStatus(user)
                                      } else {
                                        setIsDisableConfirmOpen(true)
                                      }
                                    }}
                                  >
                                    {isUserDisabled ? <RotateCcw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 2. MOBILE VIEW */}
                <div className="md:hidden p-3 space-y-3">
                  {filteredUsers.map((user) => {
                    const profile = user.profile
                    const isUserActive = user.status === 'active'
                    const isUserDisabled = user.status === 'disabled'
                    const isUserInvited = user.status === 'invited'

                    return (
                      <div
                        key={user.id}
                        className={cn(
                          'p-4 rounded-2xl border border-slate-800 bg-slate-950/60 shadow-xs space-y-3',
                          isUserDisabled && 'opacity-65 bg-slate-950/40'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-sky-600 to-indigo-700 text-white flex items-center justify-center text-sm font-bold shrink-0">
                              {(profile?.full_name || user.invited_email || 'U')[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-white truncate">
                                {profile?.full_name || user.invited_email}
                              </div>
                              <div className="text-xs text-slate-400 truncate">
                                {profile?.email || user.invited_email}
                              </div>
                            </div>
                          </div>

                          <Badge
                            className={cn(
                              'text-[10px]',
                              isUserActive && 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                              isUserDisabled && 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                              isUserInvited && 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                            )}
                          >
                            {user.status || 'active'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs border-sky-800 text-sky-400"
                            onClick={() => {
                              setSelectedUserForPermissions(user)
                              setIsPermissionsDrawerOpen(true)
                            }}
                          >
                            <Shield className="w-3.5 h-3.5 mr-1" />
                            Permissions
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: ROLES & MATRIX STUDIO */}
      {activeTab === 'roles' && (
        <RolesMatrixTab
          companyId={company?.id || ''}
          tenantSlug={company?.slug || 'app'}
          onRolesChanged={loadData}
        />
      )}

      {/* TAB 3: PERMISSION SIMULATOR & AUDITOR */}
      {activeTab === 'simulator' && (
        <PermissionSimulator
          users={users}
          roles={roles}
          branches={branches}
          companySlug={company?.slug || 'app'}
          onEditUserPermissions={(u) => {
            setSelectedUserForPermissions(u)
            setIsPermissionsDrawerOpen(true)
          }}
        />
      )}

      {/* TAB 4: SECURITY AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <SecurityAuditTab
          companyId={company?.id || ''}
          companySlug={company?.slug || 'app'}
        />
      )}

      {/* DRAWERS & DIALOGS */}
      {/* 1. Permissions Drawer */}
      <UserPermissionsDrawer
        isOpen={isPermissionsDrawerOpen}
        onClose={() => setIsPermissionsDrawerOpen(false)}
        user={selectedUserForPermissions}
        onSaved={loadData}
        companyId={company?.id || ''}
        allBranches={branches}
        allRoles={roles}
      />

      {/* 2. Invite Member Modal */}
      <ModalDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Invite Member to Workspace (সদস্য আমন্ত্রণ)"
        description="Send an invitation to join this company workspace. They will receive access via email."
      >
        <form onSubmit={handleInvite} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Email Address</Label>
            <Input
              type="email"
              required
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="bg-slate-950 border-slate-800"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Assign Role</Label>
            <select
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.name_bn ? `(${r.name_bn})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Primary Branch</Label>
            <select
              value={inviteBranchId}
              onChange={(e) => setInviteBranchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="">All Branches / Global</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsInviteOpen(false)}
              className="border-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-primary text-xs font-semibold">
              Send Invitation
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 3. Add User Direct Modal */}
      <ModalDialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        title="Direct User Provisioning (সরাসরি ইউজার তৈরি)"
        description="Instantly create an active user login with generated credentials."
      >
        <form onSubmit={handleAddUser} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Full Name (English)</Label>
              <Input
                type="text"
                required
                placeholder="e.g. Shakil Ahmed"
                value={addFullName}
                onChange={(e) => setAddFullName(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Full Name (বাংলা - ঐচ্ছিক)</Label>
              <Input
                type="text"
                placeholder="যেমনঃ শাকিল আহমেদ"
                value={addFullNameBn}
                onChange={(e) => setAddFullNameBn(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Email Address</Label>
              <Input
                type="email"
                required
                placeholder="shakil@company.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Mobile Phone (মোবাইল)</Label>
              <Input
                type="tel"
                placeholder="017XXXXXXXX"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-slate-300 font-medium">Initial Login Password</Label>
              <button
                type="button"
                onClick={generateNewPassword}
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Regenerate
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={addPassword}
                onChange={(e) => setAddPassword(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="border-slate-800 text-xs shrink-0"
              >
                {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Role</Label>
              <select
                value={addRoleId}
                onChange={(e) => setAddRoleId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.name_bn ? `(${r.name_bn})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-slate-300 font-medium">Branch Location</Label>
              <select
                value={addBranchId}
                onChange={(e) => setAddBranchId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
              >
                <option value="">All Branches / Global</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddUserOpen(false)}
              className="border-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" className="bg-primary text-xs font-semibold">
              Create User Login
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* 4. Change Role Modal */}
      <ModalDialog
        open={isChangeRoleOpen}
        onOpenChange={setIsChangeRoleOpen}
        title="Change Primary Role Template"
        description={`Assign a new primary role for ${selectedUser?.profile?.full_name || selectedUser?.invited_email}.`}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Select New Role</Label>
            <select
              value={targetRoleId}
              onChange={(e) => setTargetRoleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.name_bn ? `(${r.name_bn})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsChangeRoleOpen(false)}
              className="border-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleChangeRole} className="bg-primary text-xs font-semibold">
              Update Role
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* 5. Assign Branch Modal */}
      <ModalDialog
        open={isAssignBranchOpen}
        onOpenChange={setIsAssignBranchOpen}
        title="Assign Primary Branch"
        description={`Set primary branch context for ${selectedUser?.profile?.full_name || selectedUser?.invited_email}.`}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300 font-medium">Select Branch</Label>
            <select
              value={targetBranchId}
              onChange={(e) => setTargetBranchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200"
            >
              <option value="">All Branches / Global Central</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAssignBranchOpen(false)}
              className="border-slate-800 text-xs"
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleAssignBranch} className="bg-primary text-xs font-semibold">
              Save Branch
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* 6. Disable User Confirm */}
      <ConfirmDialog
        open={isDisableConfirmOpen}
        onOpenChange={setIsDisableConfirmOpen}
        onConfirm={() => selectedUser && handleToggleStatus(selectedUser)}
        title="Disable User Access?"
        message={`Are you sure you want to disable login access for ${selectedUser?.profile?.full_name || selectedUser?.invited_email}? Database Row-Level Security will immediately block all requests.`}
        confirmText="Disable Access"
        isDestructive={true}
      />
    </div>
  )
}
