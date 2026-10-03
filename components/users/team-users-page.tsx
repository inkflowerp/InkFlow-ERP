'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useI18n } from '@/i18n/context'
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
import { ROLE_NAMES_BN } from './roles-matrix-tab'
import { UserCard } from '@/components/users/user-card'
import { CreateUserWizard } from '@/components/users/create-user-wizard'
import { EditUserAccessDialog } from '@/components/users/edit-user-access-dialog'
import { LinkEmployeeDialog } from '@/components/users/link-employee-dialog'
import { UserDetailDrawer } from '@/components/users/user-detail'
import { useParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { formatBranchName } from '@/lib/formatters'
import { resolveUserRole } from './user-resolvers'

export function TeamUsersPage() {
  const { locale, tBilingual } = useI18n()
  const isBn = locale === 'bn'
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
        const uRole = resolveUserRole(u, roles)
        if (
          uRole.name.toLowerCase() !== roleFilter.toLowerCase() &&
          uRole.slug.toLowerCase() !== roleFilter.toLowerCase()
        ) {
          return false
        }
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1 border-b border-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600"/>
            <span>{tBilingual('Team Users', 'টিম সদস্য ও অ্যাক্সেস')}</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 {tBilingual('Manage who can log in, linked workforce employees, roles, branch access, and data scopes.', 'ব্যবহারকারীদের লগইন, কর্মী লিংক, রোল ও শাখা অ্যাক্সেস পরিচালনা করুন।')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
 variant="outline"size="sm"onClick={handleRefresh}
 disabled={isRefreshing || isLoading}
 className="h-9 px-3 text-muted-foreground border-border hover:bg-muted dark:hover:bg-muted">
            <RefreshCw className={cn('w-4 h-4 mr-1.5', isRefreshing && 'animate-spin')} />
            <span>{tBilingual('Refresh', 'রিফ্রেশ')}</span>
          </Button>

          <Button
 variant="default"size="sm"onClick={handleOpenCreateWizard}
 className="h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm transition-all flex items-center gap-1.5">
            <UserPlus className="w-4 h-4"/>
            <span>{tBilingual('Add User', 'ব্যবহারকারী যোগ')}</span>
          </Button>
        </div>
      </div>

      {/* 2. Top 4 High-Signal KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Users */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{tBilingual('Total Users', 'মোট ব্যবহারকারী')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {isLoading ? '...' : kpis.total}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tBilingual('All authorized identities', 'সকল অনুমোদিত প্রোফাইল')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-100 dark:border-blue-900/50">
            <Users className="w-5 h-5"/>
          </div>
        </div>

        {/* Active Users */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{tBilingual('Active Logins', 'সক্রিয় ব্যবহারকারী')}</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {isLoading ? '...' : kpis.active}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tBilingual('Can authenticate now', 'বর্তমানে লগইন অনুমোদিত')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-100 dark:border-emerald-900/50">
            <CheckCircle2 className="w-5 h-5"/>
          </div>
        </div>

        {/* Invited / Pending */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{tBilingual('Invited / Pending', 'আমন্ত্রিত / অপেক্ষমাণ')}</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              {isLoading ? '...' : kpis.invited}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tBilingual('Invitation link pending', 'আমন্ত্রণ লিংক অপেক্ষমাণ')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-100 dark:border-amber-900/50">
            <Clock className="w-5 h-5"/>
          </div>
        </div>

        {/* Disabled */}
        <div className="bg-card rounded-xl p-4 border border-border shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{tBilingual('Disabled Logins', 'নিষ্ক্রিয় অ্যাকাউন্ট')}</p>
            <p className="text-2xl font-bold text-foreground mt-1">
              {isLoading ? '...' : kpis.disabled}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{tBilingual('Access suspended', 'অ্যাক্সেস স্থগিত করা হয়েছে')}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-muted text-muted-foreground flex items-center justify-center border border-border">
            <UserX className="w-5 h-5"/>
          </div>
        </div>
      </div>

      {/* 3. Filter & Search Toolbar */}
      <div className="bg-card rounded-xl p-3 sm:p-4 border border-border shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2"/>
            <Input
 type="text"placeholder={tBilingual('Search by name, email, employee ID...', 'নাম, ইমেইল বা আইডি দিয়ে অনুসন্ধান...')}value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 className="pl-9 pr-8 h-9 text-xs sm:text-sm bg-muted/70 border-border focus:bg-card"/>
            {searchQuery && (
              <button
 type="button"onClick={() => setSearchQuery('')}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground p-0.5">
                <X className="w-3.5 h-3.5"/>
              </button>
            )}
          </div>

          {/* Quick Status Tabs */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg self-start sm:self-auto overflow-x-auto max-w-full">
            <button
 type="button"onClick={() => setStatusFilter('all')}
 className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
 statusFilter === 'all'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
 {tBilingual('All', 'সকল')} ({kpis.total})
            </button>
            <button
 type="button"onClick={() => setStatusFilter('active')}
 className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
 statusFilter === 'active'
                  ? 'bg-card text-emerald-700 dark:text-emerald-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
 {tBilingual('Active', 'সক্রিয়')} ({kpis.active})
            </button>
            <button
 type="button"onClick={() => setStatusFilter('invited')}
 className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
 statusFilter === 'invited'
                  ? 'bg-card text-amber-700 dark:text-amber-400 shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
 {tBilingual('Invited', 'আমন্ত্রিত')} ({kpis.invited})
            </button>
            <button
 type="button"onClick={() => setStatusFilter('disabled')}
 className={cn(
                'px-2.5 py-1 text-xs font-medium rounded-md transition-all whitespace-nowrap',
 statusFilter === 'disabled'
                  ? 'bg-card text-foreground shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
 {tBilingual('Disabled', 'নিষ্ক্রিয়')} ({kpis.disabled})
            </button>
          </div>
        </div>

        {/* Dropdown Filters: Role & Branch */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Filter className="w-3.5 h-3.5"/>
            <span>{tBilingual('Filters:', 'ফিল্টার:')}</span>
          </div>

          {/* Role Filter */}
          <select
 value={roleFilter}
 onChange={(e) => setRoleFilter(e.target.value)}
 className="h-8 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">{tBilingual('All Roles', 'সকল রোল')}</option>
            {roles.map((r) => (
              <option key={r.id} value={r.name}>
                {isBn ? (ROLE_NAMES_BN[r.slug || ''] || ROLE_NAMES_BN[r.name] || r.name) : r.name}
              </option>
            ))}
          </select>

          {/* Branch Filter */}
          <select
 value={branchFilter}
 onChange={(e) => setBranchFilter(e.target.value)}
 className="h-8 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">{tBilingual('All Branches', 'সকল শাখা')}</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {formatBranchName(b.name, isBn ? 'bn' : 'en', (b as any).name_bn)}
              </option>
            ))}
          </select>

          {/* {tBilingual('Reset Filters', 'ফিল্টার রিসেট')} button if any filter is active */}
          {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || branchFilter !== 'all') && (
            <button
 type="button"onClick={() => {
 setSearchQuery('')
 setStatusFilter('all')
 setRoleFilter('all')
 setBranchFilter('all')
              }}
 className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium ml-auto">{tBilingual('Reset Filters', 'ফিল্টার রিসেট')}</button>
          )}
        </div>
      </div>

      {/* 4. Main User List / Table */}
      {isLoading ? (
        <div className="bg-card rounded-xl border border-border p-8 space-y-4 shadow-sm">
          <div className="animate-pulse flex items-center justify-between">
            <div className="h-4 bg-muted rounded w-1/4"/>
            <div className="h-4 bg-muted rounded w-1/6"/>
          </div>
          <div className="space-y-3 pt-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="animate-pulse h-12 bg-muted rounded-lg"/>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-6 text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto"/>
          <h3 className="font-semibold text-foreground text-sm">{tBilingual('Failed to Load Team Users', 'টিম ব্যবহারকারী লোড করা যায়নি')}</h3>
          <p className="text-xs text-red-700 dark:text-red-300 max-w-md mx-auto">{error}</p>
          <Button variant="outline" size="sm" onClick={() => loadData(true)} className="h-8 text-xs">{tBilingual('Retry', 'পুনরায় চেষ্টা করুন')}</Button>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-muted text-muted-foreground flex items-center justify-center mx-auto">
            <Users className="w-6 h-6"/>
          </div>
          <h3 className="font-semibold text-foreground text-sm">
            {users.length === 0 ? tBilingual('No Team Users Yet', 'কোনো টিম ব্যবহারকারী নেই') : tBilingual('No Matching Users Found', 'কোনো ব্যবহারকারী পাওয়া যায়নি')}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {users.length === 0 ? tBilingual('Add your team members to grant them secure role-based access to invoices, jobs, and branch operations.', 'ইনভয়েস, জব ও শাখা কার্যক্রমে ভূমিকাভিত্তিক অ্যাক্সেস দিতে টিম সদস্যদের যুক্ত করুন।') : tBilingual('Try clearing your search query or adjusting your status and role filters.', 'অনুসন্ধান মুছে ফেলুন বা ফিল্টার পরিবর্তন করে চেষ্টা করুন।')}
          </p>
          {users.length === 0 ? (
            <Button
 variant="default"size="sm"onClick={handleOpenCreateWizard}
 className="mt-2 bg-primary hover:bg-primary/90 text-primary-foreground">
              <UserPlus className="w-4 h-4 mr-1.5"/>
                {tBilingual('Add First User', 'প্রথম ব্যবহারকারী যোগ করুন')}
              </Button>
          ) : (
            <Button
 variant="outline"size="sm"onClick={() => {
 setSearchQuery('')
 setStatusFilter('all')
 setRoleFilter('all')
 setBranchFilter('all')
              }}
 className="mt-2 text-xs">{tBilingual('Clear Filters', 'ফিল্টার মুছুন')}</Button>
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
 title={userToToggleStatus?.status === 'active' ? tBilingual('Disable User Login?', 'লগইন নিষ্ক্রিয় করবেন?') : tBilingual('Activate User Login?', 'লগইন সক্রিয় করবেন?')}
 message={
 userToToggleStatus?.status === 'active'
            ? `Disabling login will immediately prevent ${userToToggleStatus?.profile?.full_name || userToToggleStatus?.profile?.email} from authenticating or accessing company records. Their employee profile and work logs remain preserved.`
            : `Re-activating login will restore authentication access for ${userToToggleStatus?.profile?.full_name || userToToggleStatus?.profile?.email}.`
        }
 confirmText={userToToggleStatus?.status === 'active' ? tBilingual('Disable Login', 'লগইন নিষ্ক্রিয় করুন') : tBilingual('Activate Login', 'লগইন সক্রিয় করুন')}
        cancelText={tBilingual('Cancel', 'বাতিল')}
 isDestructive={userToToggleStatus?.status === 'active'}
 isLoading={isActionSubmitting}
 onConfirm={handleConfirmToggleStatus}
      />

      {/* Confirmation: Reset Password */}
      <ConfirmDialog
 open={Boolean(userToResetPassword)}
 onOpenChange={(open) => !open && setUserToResetPassword(null)}
 title={tBilingual('Send Password Reset Link?', 'পাসওয়ার্ড রিসেট লিংক পাঠাবেন?')}message={`A secure password recovery email will be dispatched to ${userToResetPassword?.profile?.email}. The user will be prompted to choose a new password.`}
 confirmText={tBilingual('Send Reset Link', 'রিসেট লিংক পাঠান')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={false}
 isLoading={isActionSubmitting}
 onConfirm={handleConfirmResetPassword}
      />

      {/* Confirmation: Remove Login */}
      <ConfirmDialog
 open={Boolean(userToRemoveLogin)}
 onOpenChange={(open) => !open && setUserToRemoveLogin(null)}
 title={tBilingual('Remove User Login Access?', 'লগইন অ্যাক্সেস মুছে ফেলবেন?')}message={`This will completely revoke the login account for ${userToRemoveLogin?.profile?.full_name || userToRemoveLogin?.profile?.email}. If this user is linked to an employee profile (${userToRemoveLogin?.linked_employee?.name || 'Staff'}), their employee record, attendance, and salary history will NOT be deleted.`}
 confirmText={tBilingual('Remove Login', 'লগইন মুছুন')} cancelText={tBilingual('Cancel', 'বাতিল')}isDestructive={true}
 isLoading={isActionSubmitting}
 onConfirm={handleConfirmRemoveLogin}
      />
    </div>
  )
}
