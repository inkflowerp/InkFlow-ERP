'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
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
import { CompanyUserWithProfile, RoleRow, BranchRow } from '@/types/tenant.types'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ModalDialog } from '@/components/shared/modal-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { PageHeader } from '@/components/shared/page-header'
import { UserPermissionsDrawer } from '@/components/users/user-permissions-drawer'
import { cn } from '@/lib/utils'

export default function UsersManagementPage() {
  const { company } = useTenant()
  const { locale, tBilingual } = useI18n()
  const { checkCanCreate, openLimitExceededModal, openUpgradeModal, currentPlan, isTrial, refreshUsage } = useSubscription()
  const [users, setUsers] = useState<CompanyUserWithProfile[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [branches, setBranches] = useState<BranchRow[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')

  const userCheck = checkCanCreate('max_users')

  const handleOpenInvite = () => {
    if (!userCheck.allowed) {
      openLimitExceededModal('max_users')
      return
    }
    setIsInviteOpen(true)
  }

  const handleOpenAddUser = () => {
    if (!userCheck.allowed) {
      openLimitExceededModal('max_users')
      return
    }
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
  const [addEmail, setAddEmail] = useState('')
  const [addPhone, setAddPhone] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addRoleId, setAddRoleId] = useState('')
  const [addBranchId, setAddBranchId] = useState('')

  const [targetRoleId, setTargetRoleId] = useState('')
  const [targetBranchId, setTargetBranchId] = useState('')
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  // Load users, roles, branches
  useEffect(() => {
    async function loadData() {
      if (!company) return
      setIsLoading(true)
      const [uRes, rRes, bRes] = await Promise.all([
        listCompanyUsersAction(company.id),
        listRolesAction(company.id),
        listBranchesAction(company.id),
      ])

      if (uRes.data) setUsers(uRes.data)
      setRoles(rRes)
      setBranches(bRes)
      if (rRes.length > 0) {
        setInviteRoleId(rRes[0].id)
        setAddRoleId(rRes[0].id)
      }
      if (bRes.length > 0) {
        setInviteBranchId(bRes[0].id)
        setAddBranchId(bRes[0].id)
      }
      setIsLoading(false)
    }

    loadData()
  }, [company])

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const term = searchQuery.toLowerCase()
    const name = u.profile?.full_name?.toLowerCase() || ''
    const email = (u.profile?.email || u.invited_email || '').toLowerCase()
    const phone = u.profile?.phone || ''
    return name.includes(term) || email.includes(term) || phone.includes(term)
  })

  // Handlers
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !inviteEmail) return

    const res = await inviteUserAction(
      company.id,
      company.slug,
      inviteEmail,
      inviteRoleId,
      inviteBranchId || null
    )

    if (res.success) {
      const uRes = await listCompanyUsersAction(company.id)
      if (uRes.data) setUsers(uRes.data)
      refreshUsage()
      setIsInviteOpen(false)
      setInviteEmail('')
      showNotification(`Invitation sent to ${inviteEmail}`)
    } else {
      showNotification(res.message || 'Failed to send invitation')
    }
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!company || !addEmail || !addFullName) return

    const res = await createCompanyUserAction({
      companyId: company.id,
      tenantSlug: company.slug,
      fullName: addFullName,
      email: addEmail,
      phone: addPhone,
      password: addPassword,
      roleId: addRoleId,
      branchId: addBranchId || null,
    })

    if (res.success) {
      const uRes = await listCompanyUsersAction(company.id)
      if (uRes.data) setUsers(uRes.data)
      refreshUsage()
      setIsAddUserOpen(false)
      setAddFullName('')
      setAddEmail('')
      setAddPhone('')
      setAddPassword('')
      showNotification(`User ${addFullName} created successfully!`)
    } else {
      showNotification(res.message || 'Failed to create user')
    }
  }

  const handleToggleStatus = async (user: CompanyUserWithProfile) => {
    if (!company) return
    const nextStatus = user.status === 'active' ? 'disabled' : 'active'
    await toggleUserStatusAction(user.id, nextStatus, company.slug)

    setUsers(
      users.map((u) =>
        u.id === user.id ? { ...u, status: nextStatus } : u
      )
    )
    setIsDisableConfirmOpen(false)
    showNotification(
      nextStatus === 'disabled'
        ? `Access disabled for ${user.profile?.full_name || 'user'}. RLS blocked.`
        : `Access restored for ${user.profile?.full_name || 'user'}.`
    )
  }

  const handleChangeRole = async () => {
    if (!selectedUser || !company || !targetRoleId) return
    await changeUserRoleAction(selectedUser.id, targetRoleId, company.id, company.slug)
    const newRole = roles.find((r) => r.id === targetRoleId)
    setUsers(
      users.map((u) =>
        u.id === selectedUser.id ? { ...u, roles: newRole ? [newRole] : u.roles } : u
      )
    )
    setIsChangeRoleOpen(false)
    showNotification(`Role updated to ${newRole?.name}`)
  }

  const handleAssignBranch = async () => {
    if (!selectedUser || !company) return
    await assignUserBranchAction(selectedUser.id, targetBranchId || null, company.slug)
    const newBranch = branches.find((b) => b.id === targetBranchId) || null
    setUsers(
      users.map((u) =>
        u.id === selectedUser.id ? { ...u, branch_id: targetBranchId, branch: newBranch } : u
      )
    )
    setIsAssignBranchOpen(false)
    showNotification(`Branch assigned: ${newBranch?.name || 'All Branches'}`)
  }

  const handleResetAccess = async (user: CompanyUserWithProfile) => {
    const email = user.profile?.email || user.invited_email
    if (!email) return
    await resetUserAccessAction(email)
    showNotification(`Password reset dispatch sent to ${email}`)
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header & Main CTAs */}
      <PageHeader
        titleEn="User Management"
        titleBn="ব্যবহারকারী ব্যবস্থাপনা"
        descriptionEn="Manage company members, roles, branches, and active security status."
        descriptionBn="প্রতিষ্ঠান সদস্য, ভূমিকা, ব্রাঞ্চ বরাদ্দ এবং অ্যাক্সেস নিরাপত্তা পরিচালনা করুন।"
        icon={Users}
        iconColor="text-blue-600"
        actions={
          <div className="flex items-center gap-2.5">
            <Button variant="outline" onClick={handleOpenInvite} className="bangla-text">
              <Mail className="mr-1.5 h-4 w-4" />
              {tBilingual('Invite Member', 'সদস্য আমন্ত্রণ')}
            </Button>
            <Button onClick={handleOpenAddUser} className="bg-blue-600 hover:bg-blue-700 bangla-text">
              <UserPlus className="mr-1.5 h-4 w-4" />
              {tBilingual('Add User', 'নতুন ব্যবহারকারী')}
            </Button>
          </div>
        }
      />

      {/* User Quota Status Alert */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-slate-50/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-xs">
        <div className="flex items-center gap-2.5">
          <div className={cn(
            'p-1.5 rounded-lg text-white font-bold',
            userCheck.exceeded ? 'bg-red-500' : userCheck.warning ? 'bg-amber-500' : 'bg-blue-600'
          )}>
            <Users className="h-4 w-4" />
          </div>
          <div>
            <div className="font-bold text-slate-900 dark:text-white bangla-text">
              {tBilingual(
                `Plan User Limit: ${users.length} of ${currentPlan.max_users} seats active`,
                `ইউজার সীমা: ${currentPlan.max_users} জনের মধ্যে ${users.length} জন সক্রিয়`
              )}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 bangla-text">
              {userCheck.exceeded
                ? tBilingual('User limit reached. Upgrade plan to add more team members.', 'ইউজার সীমা পূর্ণ হয়েছে। নতুন মেম্বার যোগ করতে প্ল্যান আপগ্রেড করুন।')
                : tBilingual(`Active on ${currentPlan.name}.`, `${currentPlan.name_bn}-এ পরিচালিত।`)}
            </p>
          </div>
        </div>

        {currentPlan.code !== 'enterprise' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => openUpgradeModal('business')}
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40 bangla-text shrink-0"
          >
            <Crown className="mr-1.5 h-3.5 w-3.5 text-amber-500" />
            {tBilingual('Expand User Limit', 'ইউজার সীমা বৃদ্ধি')}
          </Button>
        )}
      </div>

      {/* Notification Banner */}
      {notification && (
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 animate-in fade-in-0">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Users Card Table */}
      <Card>
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Company Team Members ({filteredUsers.length})</CardTitle>
              <CardDescription className="text-xs">
                Active users can log in and view data according to their branch & role permissions.
              </CardDescription>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search user, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-9 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 dark:bg-slate-900/80 text-xs font-semibold text-slate-500 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Member / User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Assigned Branch</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredUsers.map((user) => {
                const profile = user.profile
                const primaryRole = user.roles?.[0]
                const isOwner = primaryRole?.slug === 'owner'
                const isUserActive = user.status === 'active'
                const isUserDisabled = user.status === 'disabled'
                const isUserInvited = user.status === 'invited'

                return (
                  <tr
                    key={user.id}
                    className={`hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors ${
                      isUserDisabled ? 'opacity-60 bg-slate-50/30' : ''
                    }`}
                  >
                    {/* Member Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isUserDisabled
                              ? 'bg-slate-200 text-slate-500'
                              : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white'
                          }`}
                        >
                          {(profile?.full_name || user.invited_email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {profile?.full_name || user.invited_email}
                            {profile?.full_name_bn && (
                              <span className="text-xs font-normal text-slate-400">
                                ({profile.full_name_bn})
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{profile?.email || user.invited_email}</span>
                            {profile?.phone && <span>• {profile.phone}</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role Badge */}
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className="font-medium text-xs border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"
                      >
                        <Shield className="mr-1 h-3 w-3" />
                        {primaryRole?.name || 'Team Member'}
                        {primaryRole?.name_bn && ` (${primaryRole.name_bn})`}
                      </Badge>
                    </td>

                    {/* Branch */}
                    <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300">
                      {user.branch ? (
                        <div className="flex items-center gap-1.5">
                          <Building className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{user.branch.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">All Branches</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {isUserActive && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          Active
                        </span>
                      )}
                      {isUserDisabled && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
                          Disabled
                        </span>
                      )}
                      {isUserInvited && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                          Pending Invite
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs text-blue-700 bg-blue-50/60 hover:bg-blue-100/80 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800 dark:text-blue-300 font-semibold"
                          onClick={() => {
                            setSelectedUserForPermissions(user)
                            setIsPermissionsDrawerOpen(true)
                          }}
                          title="Configure Access & Permissions"
                        >
                          <Shield className="mr-1 h-3.5 w-3.5 text-blue-600" />
                          Permissions
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs"
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
                          className="h-8 px-2 text-xs"
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
                          className="h-8 px-2 text-xs text-blue-600"
                          onClick={() => handleResetAccess(user)}
                          title="Send Password Reset"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>

                        {!isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className={`h-8 px-2 text-xs ${
                              isUserDisabled ? 'text-emerald-600' : 'text-red-600'
                            }`}
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
        </CardContent>
      </Card>

      {/* MODAL 1: INVITE USER */}
      <ModalDialog
        open={isInviteOpen}
        onOpenChange={setIsInviteOpen}
        title="Invite Team Member"
        description="Send an email invitation to join your company workspace."
      >
        <form onSubmit={handleInvite} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="inviteEmail" required>
              Email Address
            </Label>
            <Input
              id="inviteEmail"
              type="email"
              placeholder="colleague@domain.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inviteRole" required>
              Assign Role
            </Label>
            <select
              id="inviteRole"
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              value={inviteRoleId}
              onChange={(e) => setInviteRoleId(e.target.value)}
              required
            >
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.name_bn ? `(${r.name_bn})` : ''} - {r.description}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="inviteBranch">Assign Branch</Label>
            <select
              id="inviteBranch"
              className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              value={inviteBranchId}
              onChange={(e) => setInviteBranchId(e.target.value)}
            >
              <option value="">All Branches / Global</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Send Invitation
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 2: ADD USER DIRECTLY */}
      <ModalDialog
        open={isAddUserOpen}
        onOpenChange={setIsAddUserOpen}
        title="Add User Directly"
        description="Directly create an employee account with pre-set credentials."
      >
        <form onSubmit={handleAddUser} className="space-y-3.5 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="addFullName" required>
              Full Name
            </Label>
            <Input
              id="addFullName"
              placeholder="e.g. Tariqul Islam"
              value={addFullName}
              onChange={(e) => setAddFullName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addEmail" required>
                Email Address
              </Label>
              <Input
                id="addEmail"
                type="email"
                placeholder="tariqul@company.com"
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addPhone" required>
                Mobile Number
              </Label>
              <Input
                id="addPhone"
                placeholder="01711XXXXXX"
                value={addPhone}
                onChange={(e) => setAddPhone(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="addPassword" required>
              Initial Password
            </Label>
            <Input
              id="addPassword"
              type="password"
              placeholder="••••••••"
              value={addPassword}
              onChange={(e) => setAddPassword(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="addRole" required>
                Role
              </Label>
              <select
                id="addRole"
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                value={addRoleId}
                onChange={(e) => setAddRoleId(e.target.value)}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addBranch">Branch</Label>
              <select
                id="addBranch"
                className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                value={addBranchId}
                onChange={(e) => setAddBranchId(e.target.value)}
              >
                <option value="">All Branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button type="button" variant="outline" onClick={() => setIsAddUserOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
              Create User
            </Button>
          </div>
        </form>
      </ModalDialog>

      {/* MODAL 3: CHANGE ROLE */}
      <ModalDialog
        open={isChangeRoleOpen}
        onOpenChange={setIsChangeRoleOpen}
        title="Change Member Role"
        description={`Modify access role for ${selectedUser?.profile?.full_name || 'member'}.`}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            {roles.map((r) => {
              const isSelected = targetRoleId === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => setTargetRoleId(r.id)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:bg-blue-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {r.name}
                      {r.name_bn && <span className="text-xs text-slate-400">({r.name_bn})</span>}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{r.description}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsChangeRoleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleChangeRole} className="bg-blue-600 hover:bg-blue-700">
              Apply Role
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* MODAL 4: ASSIGN BRANCH */}
      <ModalDialog
        open={isAssignBranchOpen}
        onOpenChange={setIsAssignBranchOpen}
        title="Assign Branch / Factory"
        description={`Assign ${selectedUser?.profile?.full_name || 'member'} to an operational branch.`}
      >
        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <div
              onClick={() => setTargetBranchId('')}
              className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${
                targetBranchId === ''
                  ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:bg-blue-950/30'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
              }`}
            >
              <div>
                <div className="font-semibold text-sm text-slate-900 dark:text-white">
                  All Branches (Global Access)
                </div>
                <div className="text-xs text-slate-500">Can view job orders from all company locations</div>
              </div>
              {targetBranchId === '' && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
            </div>

            {branches.map((b) => {
              const isSelected = targetBranchId === b.id
              return (
                <div
                  key={b.id}
                  onClick={() => setTargetBranchId(b.id)}
                  className={`cursor-pointer p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-600/20 dark:bg-blue-950/30'
                      : 'border-slate-200 hover:border-slate-300 dark:border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                      {b.name}
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">
                        {b.code}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{b.address}</div>
                  </div>
                  {isSelected && <CheckCircle2 className="h-4 w-4 text-blue-600 shrink-0" />}
                </div>
              )
            })}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsAssignBranchOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignBranch} className="bg-blue-600 hover:bg-blue-700">
              Save Branch
            </Button>
          </div>
        </div>
      </ModalDialog>

      {/* CONFIRM DISABLE USER DIALOG */}
      <ConfirmDialog
        open={isDisableConfirmOpen}
        onOpenChange={setIsDisableConfirmOpen}
        title="Disable User Access?"
        message={`Are you sure you want to disable ${selectedUser?.profile?.full_name || 'this user'}? They will immediately lose access to the application and Row Level Security will block all database requests.`}
        confirmText="Disable Access"
        isDestructive={true}
        onConfirm={() => selectedUser && handleToggleStatus(selectedUser)}
      />

      {/* ACCESS & PERMISSIONS DRAWER */}
      <UserPermissionsDrawer
        user={selectedUserForPermissions}
        isOpen={isPermissionsDrawerOpen}
        onClose={() => {
          setIsPermissionsDrawerOpen(false)
          setSelectedUserForPermissions(null)
        }}
        onSaved={async () => {
          if (company) {
            const uRes = await listCompanyUsersAction(company.id)
            if (uRes.data) setUsers(uRes.data)
          }
          setIsPermissionsDrawerOpen(false)
          setSelectedUserForPermissions(null)
          showNotification('User access and permissions saved successfully!')
        }}
        companyId={company?.id || ''}
        allBranches={branches}
        allRoles={roles}
      />
    </div>
  )
}
