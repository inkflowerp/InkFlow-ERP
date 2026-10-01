'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  UserX,
  Shield,
  Layers,
  Sparkles,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { useTenant } from '@/hooks/use-tenant'
import { useSubscription } from '@/hooks/use-subscription'
import { useToast } from '@/components/shared/toast-feedback'
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import {
  listCompanyUsersAction,
  listRolesAction,
  listBranchesAction,
  listLinkableEmployeesAction,
  toggleUserStatusAction,
  resetUserAccessAction,
  removeLoginAction,
} from '@/actions/company-users.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { UserTable } from '@/components/users/user-table'
import { UserCard } from '@/components/users/user-card'
import { CreateUserWizard } from '@/components/users/create-user-wizard'
import { EditUserAccessDialog } from '@/components/users/edit-user-access-dialog'
import { LinkEmployeeDialog } from '@/components/users/link-employee-dialog'
import { UserDetailDrawer } from '@/components/users/user-detail'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'

export function TeamUsersPage() {
  const params = useParams()
  const routeSlug = (params?.tenantSlug as string) || ''
  const { company, currentUser } = useTenant()
  const { showToast } = useToast()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, usage } = useSubscription()

  const companyId = company?.id || ''
  const tenantSlug = routeSlug || company?.slug || ''
  const currentUserId = currentUser?.user_id || currentUser?.id || ''

  // Data states
  const [users, setUsers] = useState<CompanyUserWithProfile[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [linkableEmployees, setLinkableEmployees] = useState<any[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'invited' | 'disabled'>('all')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  // Modals & Drawers
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [selectedUserForDetail, setSelectedUserForDetail] = useState<CompanyUserWithProfile | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [selectedUserForAccess, setSelectedUserForAccess] = useState<CompanyUserWithProfile | null>(null)
  const [isAccessOpen, setIsAccessOpen] = useState(false)

  const [selectedUserForLink, setSelectedUserForLink] = useState<CompanyUserWithProfile | null>(null)
  const [isLinkOpen, setIsLinkOpen] = useState(false)

  // Quick Action Confirmation Dialogs
  const [userToToggleStatus, setUserToToggleStatus] = useState<CompanyUserWithProfile | null>(null)
  const [userToResetPassword, setUserToResetPassword] = useState<CompanyUserWithProfile | null>(null)
  const [userToRemoveLogin, setUserToRemoveLogin] = useState<CompanyUserWithProfile | null>(null)
  const [isActionSubmitting, setIsActionSubmitting] = useState(false)

  // Data loader
  const loadData = useCallback(
    async (showLoadingSpinner = true) => {
      if (!companyId) return
      if (showLoadingSpinner) setIsLoading(true)
      setError(null)

      try {
        const [usersRes, rolesRes, branchesRes, empRes] = await Promise.all([
          listCompanyUsersAction(companyId),
          listRolesAction(companyId),
          listBranchesAction(companyId),
          listLinkableEmployeesAction(companyId),
        ])

        if (usersRes && (usersRes as any).success === false) {
          setError((usersRes as any).error || 'Failed to load team users')
        } else if (Array.isArray(usersRes)) {
          setUsers(usersRes)
        } else if ((usersRes as any)?.data && Array.isArray((usersRes as any).data)) {
          setUsers((usersRes as any).data)
        }

        if (Array.isArray(rolesRes)) setRoles(rolesRes)
        if (Array.isArray(branchesRes)) setBranches(branchesRes)
        if (empRes && (empRes as any).data && Array.isArray((empRes as any).data)) {
          setLinkableEmployees((empRes as any).data)
        }
      } catch (err: any) {
        console.error('[TeamUsersPage] loadData error:', err)
        setError(err?.message || 'Unexpected error while loading team users.')
      } finally {
        setIsLoading(false)
        setIsRefreshing(false)
      }
    },
    [companyId]
  )

  useEffect(() => {
    loadData(true)
  }, [loadData])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadData(false)
    showToast({
      title: 'Users Refreshed',
      message: 'The latest user directory and linked employee records have been loaded.',
      type: 'success',
    })
  }

  // Handle Create User with Plan Entitlement Check
  const handleOpenCreateWizard = () => {
    if (checkCanCreate && !checkCanCreate('max_users')) {
      if (openLimitExceededModal) {
        openLimitExceededModal('max_users')
      } else if (openUpgradeModal) {
        openUpgradeModal()
      } else {
        showToast({
          title: 'Plan Limit Exceeded',
          message: 'You have reached the maximum number of users allowed on your current plan.',
          type: 'error',
        })
      }
      return
    }
    setIsCreateOpen(true)
  }

  // KPIs
  const kpis = useMemo(() => {
    const total = users.length
    const active = users.filter((u) => u.status === 'active').length
    const invited = users.filter((u) => u.status === 'invited').length
    const disabled = users.filter((u) => u.status === 'disabled').length

    return { total, active, invited, disabled }
  }, [users])

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // 1. Status Filter
      if (statusFilter === 'active' && u.status !== 'active') return false
      if (statusFilter === 'invited' && u.status !== 'invited') return false
      if (statusFilter === 'disabled' && u.status !== 'disabled') return false

      // 2. Role Filter
      if (roleFilter !== 'all') {
        const uRole = u.role?.name?.toLowerCase() || ''
        if (uRole !== roleFilter.toLowerCase()) return false
      }

      // 3. Branch Filter
      if (branchFilter !== 'all') {
        if (u.branch_id !== branchFilter) return false
      }

      // 4. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const name = (u.profile?.full_name || '').toLowerCase()
        const email = (u.profile?.email || '').toLowerCase()
        const empName = (u.linked_employee?.name || '').toLowerCase()
        const empId = (u.linked_employee?.employee_id_number || '').toLowerCase()
        const role = (u.role?.name || '').toLowerCase()

        const matches =
          name.includes(q) ||
          email.includes(q) ||
          empName.includes(q) ||
          empId.includes(q) ||
          role.includes(q)

        if (!matches) return false
      }

      return true
    })
  }, [users, statusFilter, roleFilter, branchFilter, searchQuery])

  // Action: Toggle Status
  const handleConfirmToggleStatus = async () => {
    if (!userToToggleStatus) return
    setIsActionSubmitting(true)
    try {
      const isCurrentlyActive = userToToggleStatus.status === 'active'
      const newStatus = isCurrentlyActive ? 'disabled' : 'active'
      const res = await toggleUserStatusAction(userToToggleStatus.id, newStatus, tenantSlug)

      if (res && (res as any).success === false) {
        showToast({
          title: 'Operation Failed',
          message: (res as any).message || 'Could not update user status.',
          type: 'error',
        })
      } else {
        showToast({
          title: isCurrentlyActive ? 'Login Disabled' : 'Login Activated',
          message: `User ${userToToggleStatus.profile?.full_name || userToToggleStatus.profile?.email} is now ${newStatus}.`,
          type: 'success',
        })
        await loadData(false)
      }
    } catch (err: any) {
      showToast({
        title: 'Error',
        message: err?.message || 'Failed to toggle status.',
        type: 'error',
      })
    } finally {
      setIsActionSubmitting(false)
      setUserToToggleStatus(null)
    }
  }

  // Action: Reset Password
  const handleConfirmResetPassword = async () => {
    if (!userToResetPassword) return
    const email = userToResetPassword.profile?.email
    if (!email) {
      showToast({ title: 'Error', message: 'User does not have an email address.', type: 'error' })
      setUserToResetPassword(null)
      return
    }

    setIsActionSubmitting(true)
    try {
      const res = await resetUserAccessAction(email)
      if (res && (res as any).success === false) {
        showToast({
          title: 'Reset Failed',
          message: (res as any).message || 'Failed to send password reset email.',
          type: 'error',
        })
      } else {
        showToast({
          title: 'Reset Link Sent',
          message: `Password recovery instructions have been sent to ${email}.`,
          type: 'success',
        })
      }
    } catch (err: any) {
      showToast({ title: 'Error', message: err?.message || 'Could not reset password.', type: 'error' })
    } finally {
      setIsActionSubmitting(false)
      setUserToResetPassword(null)
    }
  }

  // Action: Remove Login
  const handleConfirmRemoveLogin = async () => {
    if (!userToRemoveLogin) return
    setIsActionSubmitting(true)
    try {
      const res = await removeLoginAction({
        companyUserId: userToRemoveLogin.id,
        companyId,
        tenantSlug,
      })

      if (res && !res.success) {
        showToast({
          title: 'Action Denied',
          message: res.message || 'Cannot remove user login.',
          type: 'error',
        })
      } else {
        showToast({
          title: 'Login Removed',
          message: 'Login account detached successfully. Linked workforce records remain intact.',
          type: 'success',
        })
        await loadData(false)
      }
    } catch (err: any) {
      showToast({ title: 'Error', message: err?.message || 'Failed to remove user login.', type: 'error' })
    } finally {
      setIsActionSubmitting(false)
      setUserToRemoveLogin(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600" />
            <span>Team Users</span>
            <span className="text-xs font-normal text-slate-400 font-hind">টিম সদস্য ও অ্যাক্সেস</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage who can log in, linked workforce employees, roles, branch access, and data scopes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="h-9 px-3 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={cn('w-4 h-4 mr-1.5', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="default"
            size="sm"
            onClick={handleOpenCreateWizard}
            className="h-9 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add User</span>
          </Button>
        </div>
      </div>

      {/* 2. Top 4 High-Signal KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Users</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 mt-1">
              {isLoading ? '...' : kpis.total}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">All authorized identities</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Active Logins</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? '...' : kpis.active}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Can authenticate now</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Invited / Pending */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Invited / Pending</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {isLoading ? '...' : kpis.invited}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Invitation link pending</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Disabled */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Disabled Logins</p>
            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300 mt-1">
              {isLoading ? '...' : kpis.disabled}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Access suspended</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center border border-slate-200 dark:border-slate-700">
            <UserX className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by name, email, employee ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-slate-50/70 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 focus:bg-white"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                statusFilter === 'all'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              All ({kpis.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('active')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                statusFilter === 'active'
                  ? 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Active ({kpis.active})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('invited')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                statusFilter === 'invited'
                  ? 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Invited ({kpis.invited})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('disabled')}
              className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
                statusFilter === 'disabled'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              )}
            >
              Disabled ({kpis.disabled})
            </button>
          </div>
        </div>

        {/* Dropdown Filters: Role & Branch */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {r.name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="h-8 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Reset Filters button if any filter is active */}
          {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || branchFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setRoleFilter('all')
                setBranchFilter('all')
              }}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 4. Main User List / Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 space-y-4 shadow-sm">
          <div className="animate-pulse flex items-center justify-between">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/6" />
          </div>
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse h-12 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto" />
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">Failed to Load Team Users</h3>
          <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData(true)} className="h-8 text-xs">
            Retry
          </Button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
            {users.length === 0 ? 'No Team Users Yet' : 'No Matching Users Found'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {users.length === 0
              ? 'Add your team members to grant them secure role-based access to invoices, jobs, and branch operations.'
              : 'Try clearing your search query or adjusting your status and role filters.'}
          </p>
          {users.length === 0 ? (
            <Button
              variant="default"
              size="sm"
              onClick={handleOpenCreateWizard}
              className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Add First User
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setRoleFilter('all')
                setBranchFilter('all')
              }}
              className="mt-2 text-xs"
            >
              Clear Filters
            </Button>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <UserTable
              users={filteredUsers}
              roles={roles}
              branches={branches}
              currentUserId={currentUserId}
              tenantSlug={tenantSlug}
              companyId={companyId}
              onViewDetails={(u) => {
                setSelectedUserForDetail(u)
                setIsDetailOpen(true)
              }}
              onEditAccess={(u) => {
                setSelectedUserForAccess(u)
                setIsAccessOpen(true)
              }}
              onLinkEmployee={(u) => {
                setSelectedUserForLink(u)
                setIsLinkOpen(true)
              }}
              onToggleStatus={(u) => setUserToToggleStatus(u)}
              onResetPassword={(u) => setUserToResetPassword(u)}
              onRemoveLogin={(u) => setUserToRemoveLogin(u)}
              onRefresh={() => loadData(false)}
            />
          </div>

          {/* Mobile Card View */}
          <div className="block md:hidden space-y-3">
            {filteredUsers.map((u) => (
              <UserCard
                key={u.id}
                user={u}
                roles={roles}
                branches={branches}
                currentUserId={currentUserId}
                tenantSlug={tenantSlug}
                companyId={companyId}
                onViewDetails={(usr) => {
                  setSelectedUserForDetail(usr)
                  setIsDetailOpen(true)
                }}
                onEditAccess={(usr) => {
                  setSelectedUserForAccess(usr)
                  setIsAccessOpen(true)
                }}
                onLinkEmployee={(usr) => {
                  setSelectedUserForLink(usr)
                  setIsLinkOpen(true)
                }}
                onToggleStatus={(usr) => setUserToToggleStatus(usr)}
                onResetPassword={(usr) => setUserToResetPassword(usr)}
                onRemoveLogin={(usr) => setUserToRemoveLogin(usr)}
              />
            ))}
          </div>
        </>
      )}

      {/* 5. Modals & Drawers */}

      {/* Create User Wizard */}
      <CreateUserWizard
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        employees={linkableEmployees}
        roles={roles}
        branches={branches}
        companyId={companyId}
        tenantSlug={tenantSlug}
        onSuccess={() => {
          setIsCreateOpen(false)
          loadData(false)
        }}
      />

      {/* User Detail Drawer (6 Sections) */}
      <UserDetailDrawer
        user={selectedUserForDetail}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false)
          setSelectedUserForDetail(null)
        }}
        companyId={companyId}
        tenantSlug={tenantSlug}
        onEditAccess={(u) => {
          setIsDetailOpen(false)
          setSelectedUserForAccess(u)
          setIsAccessOpen(true)
        }}
        onLinkEmployee={(u) => {
          setIsDetailOpen(false)
          setSelectedUserForLink(u)
          setIsLinkOpen(true)
        }}
        onRefresh={() => loadData(false)}
      />

      {/* Edit User Access Dialog */}
      <EditUserAccessDialog
        isOpen={isAccessOpen}
        onClose={() => {
          setIsAccessOpen(false)
          setSelectedUserForAccess(null)
        }}
        user={selectedUserForAccess}
        roles={roles}
        branches={branches}
        companyId={companyId}
        tenantSlug={tenantSlug}
        onSuccess={() => {
          setIsAccessOpen(false)
          setSelectedUserForAccess(null)
          loadData(false)
        }}
      />

      {/* Link Employee Dialog */}
      <LinkEmployeeDialog
        isOpen={isLinkOpen}
        onClose={() => {
          setIsLinkOpen(false)
          setSelectedUserForLink(null)
        }}
        user={selectedUserForLink}
        employees={linkableEmployees}
        companyId={companyId}
        tenantSlug={tenantSlug}
        onSuccess={() => {
          setIsLinkOpen(false)
          setSelectedUserForLink(null)
          loadData(false)
        }}
      />

      {/* Confirmation: Toggle Status */}
      <ConfirmDialog
        open={Boolean(userToToggleStatus)}
        onOpenChange={(open) => !open && setUserToToggleStatus(null)}
        title={userToToggleStatus?.status === 'active' ? 'Disable User Login?' : 'Activate User Login?'}
        message={
          userToToggleStatus?.status === 'active'
            ? `Disabling login will immediately prevent ${userToToggleStatus?.profile?.full_name || userToToggleStatus?.profile?.email} from authenticating or accessing company records. Their employee profile and work logs remain preserved.`
            : `Re-activating login will restore authentication access for ${userToToggleStatus?.profile?.full_name || userToToggleStatus?.profile?.email}.`
        }
        confirmText={userToToggleStatus?.status === 'active' ? 'Disable Login' : 'Activate Login'}
        cancelText="Cancel"
        isDestructive={userToToggleStatus?.status === 'active'}
        isLoading={isActionSubmitting}
        onConfirm={handleConfirmToggleStatus}
      />

      {/* Confirmation: Reset Password */}
      <ConfirmDialog
        open={Boolean(userToResetPassword)}
        onOpenChange={(open) => !open && setUserToResetPassword(null)}
        title="Send Password Reset Link?"
        message={`A secure password recovery email will be dispatched to ${userToResetPassword?.profile?.email}. The user will be prompted to choose a new password.`}
        confirmText="Send Reset Link"
        cancelText="Cancel"
        isDestructive={false}
        isLoading={isActionSubmitting}
        onConfirm={handleConfirmResetPassword}
      />

      {/* Confirmation: Remove Login */}
      <ConfirmDialog
        open={Boolean(userToRemoveLogin)}
        onOpenChange={(open) => !open && setUserToRemoveLogin(null)}
        title="Remove User Login Access?"
        message={`This will completely revoke the login account for ${userToRemoveLogin?.profile?.full_name || userToRemoveLogin?.profile?.email}. If this user is linked to an employee profile (${userToRemoveLogin?.linked_employee?.name || 'Staff'}), their employee record, attendance, and salary history will NOT be deleted.`}
        confirmText="Remove Login"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isActionSubmitting}
        onConfirm={handleConfirmRemoveLogin}
      />
    </div>
  )
}
