'use client'

import React, { useState, useEffect, useMemo } from 'react'
import {
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
  UserX,
  Lock,
  Smartphone,
  RefreshCw,
  Plus,
  Key,
  ShieldAlert,
  Ban,
  X,
  Edit2,
  Trash2,
  Server,
  Mail,
  Phone,
  Clock,
  Crown,
  Search,
  Filter,
  Eye,
  EyeOff,
  LayoutGrid,
  List,
  Check,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { getPlatformUsersAction } from '@/actions/platform-data.actions'
import { PlatformAdminUser, PlatformUserRole } from '@/types/platform.types'
import {
  updatePlatformUserAction,
  createPlatformAdminAction,
  deletePlatformAdminAction,
} from '@/actions/platform.actions'

const ROLE_DESCRIPTIONS: Record<PlatformUserRole, { label: string; desc: string; color: string; badge: string }> = {
  platform_owner: {
    label: 'Platform Owner',
    desc: 'Unrestricted root authority across all platform infrastructure, billing, and database exports.',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  },
  platform_admin: {
    label: 'Platform Administrator',
    desc: 'Full operational control over tenants, subscriptions, feature flags, and standard system settings.',
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    badge: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  },
  platform_support: {
    label: 'Support Specialist',
    desc: 'Tenant support access, diagnostic logging, incident response, and tenant inspection.',
    color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  },
  platform_finance: {
    label: 'Finance & Billing',
    desc: 'Subscription reconciliation, payment gateways, invoicing, and revenue metrics.',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  },
  platform_operations: {
    label: 'System Operations',
    desc: 'Background job queues, infrastructure health, database backups, and emergency controls.',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    badge: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  },
  platform_readonly: {
    label: 'Read-Only Observer',
    desc: 'Audit view-only access without mutation capabilities.',
    color: 'text-slate-400 bg-slate-500/10 border-slate-500/30',
    badge: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
  },
}

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [showCreatePassword, setShowCreatePassword] = useState(false)

  // Edit Modal
  const [editingAdmin, setEditingAdmin] = useState<PlatformAdminUser | null>(null)
  const [targetName, setTargetName] = useState<string>('')
  const [targetPhone, setTargetPhone] = useState<string>('')
  const [targetRole, setTargetRole] = useState<PlatformUserRole>('platform_admin')
  const [targetMfa, setTargetMfa] = useState<boolean>(true)
  const [targetActive, setTargetActive] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete Modal
  const [deletingAdmin, setDeletingAdmin] = useState<PlatformAdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Action in progress for toggle
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Notifications
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadAdmins = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await getPlatformUsersAction()
      if (res.success && res.data) {
        setAdmins(res.data)
      } else {
        setFetchError(res.error || 'Failed to fetch platform administrators.')
      }
    } catch (err: any) {
      setFetchError(err?.message || 'An unexpected error occurred while loading administrators.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  // Create Admin
  const handleCreateAdmin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError(null)

    const formData = new FormData(e.currentTarget)
    try {
      const res = await createPlatformAdminAction(formData)

      if (res.success) {
        showNotification(`Platform administrator "${formData.get('full_name')}" created successfully.`)
        setShowCreateModal(false)
        await loadAdmins()
      } else {
        setCreateError(res.error || 'Failed to create platform administrator.')
      }
    } catch (err: any) {
      setCreateError(err?.message || 'An unexpected error occurred.')
    } finally {
      setIsCreating(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (admin: PlatformAdminUser) => {
    setEditingAdmin(admin)
    setTargetName(admin.full_name)
    setTargetPhone(admin.phone || '')
    setTargetRole(admin.role)
    setTargetMfa(Boolean(admin.mfa_enabled))
    setTargetActive(Boolean(admin.is_active))
    setEditError(null)
  }

  // Save Edit Admin
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return
    setIsSaving(true)
    setEditError(null)

    try {
      const res = await updatePlatformUserAction(editingAdmin.id, {
        full_name: targetName.trim(),
        phone: targetPhone.trim() || undefined,
        role: targetRole,
        mfa_enabled: targetMfa,
        is_active: targetActive,
      })

      if (res.success) {
        showNotification(`Administrator profile updated for ${editingAdmin.email}.`)
        setEditingAdmin(null)
        await loadAdmins()
      } else {
        setEditError(res.error || 'Failed to update administrator.')
      }
    } catch (err: any) {
      setEditError(err?.message || 'An unexpected error occurred.')
    } finally {
      setIsSaving(false)
    }
  }

  // Toggle Active State
  const handleToggleActive = async (admin: PlatformAdminUser) => {
    if (admin.role === 'platform_owner') {
      const activeOwners = admins.filter((a) => a.role === 'platform_owner' && a.is_active)
      if (activeOwners.length <= 1 && admin.is_active) {
        showNotification('Security Protection: Cannot deactivate the last active Platform Owner.', 'error')
        return
      }
    }

    setTogglingId(admin.id)
    const nextState = !admin.is_active
    try {
      const res = await updatePlatformUserAction(admin.id, { is_active: nextState })
      if (res.success) {
        showNotification(
          `Administrator ${admin.email} marked as ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`
        )
        await loadAdmins()
      } else {
        showNotification(res.error || 'Failed to update administrator status.', 'error')
      }
    } catch {
      showNotification('An unexpected error occurred while toggling status.', 'error')
    } finally {
      setTogglingId(null)
    }
  }

  // Delete Admin
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await deletePlatformAdminAction(deletingAdmin.id)
      if (res.success) {
        showNotification(`Platform administrator ${deletingAdmin.email} deleted successfully.`)
        setDeletingAdmin(null)
        await loadAdmins()
      } else {
        setDeleteError(res.error || 'Failed to delete administrator.')
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'An unexpected error occurred.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Statistics Calculations
  const stats = useMemo(() => {
    const total = admins.length
    const active = admins.filter((a) => a.is_active).length
    const owners = admins.filter((a) => a.role === 'platform_owner').length
    const mfaEnforced = admins.filter((a) => a.mfa_enabled).length
    const mfaPct = total > 0 ? Math.round((mfaEnforced / total) * 100) : 0
    return { total, active, owners, mfaEnforced, mfaPct }
  }, [admins])

  // Filtered Admins
  const filteredAdmins = useMemo(() => {
    return admins.filter((a) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchesQuery =
          a.full_name.toLowerCase().includes(q) ||
          a.email.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          (a.phone && a.phone.includes(q))
        if (!matchesQuery) return false
      }

      if (roleFilter !== 'all' && a.role !== roleFilter) {
        return false
      }

      if (statusFilter === 'active' && !a.is_active) return false
      if (statusFilter === 'deactivated' && a.is_active) return false

      return true
    })
  }, [admins, search, roleFilter, statusFilter])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Sub-Navigation */}
      <PlatformSettingsNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            Platform Governance &amp; Root Access
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-indigo-400" />
            Platform Administrators
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Privileged accounts with root administrative access to InkFlow platform infrastructure and operational controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-600/20 min-h-[36px]"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Administrator
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadAdmins}
            disabled={loading}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9 min-h-[36px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2.5 transition-all shadow-lg ${
            notification.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {notification.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white text-xs px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error State Banner */}
      {fetchError && !loading && (
        <Card className="bg-red-950/40 border-red-900/60 p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="h-6 w-6 text-red-400 shrink-0" />
            <div>
              <div className="font-bold text-white text-sm">Failed to load platform administrators</div>
              <div className="text-xs text-red-200/80">{fetchError}</div>
            </div>
          </div>
          <Button
            size="sm"
            onClick={loadAdmins}
            className="bg-red-900 hover:bg-red-800 text-white font-bold text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Retry
          </Button>
        </Card>
      )}

      {/* Metrics Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Total Administrators</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            {stats.total}
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Assigned
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Root administrative identities</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Active Status</span>
            <UserCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5 flex items-center gap-2">
            {stats.active} / {stats.total}
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Online
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Authorized to access platform console</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Platform Owners</span>
            <Crown className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-1.5 flex items-center gap-2">
            {stats.owners}
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              Root Authority
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Protected by Last-Owner Safety Rule</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>MFA Enforcement</span>
            <Smartphone className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1.5 flex items-center gap-2">
            {stats.mfaPct}%
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {stats.mfaEnforced}/{stats.total}
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Time-based OTP token security</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
          <Input
            placeholder="Search by name, email, phone, or responsibility..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-slate-950/80 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl focus-visible:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Role Filter */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Roles</option>
            <option value="platform_owner">Platform Owner</option>
            <option value="platform_admin">Platform Administrator</option>
            <option value="platform_support">Support Specialist</option>
            <option value="platform_finance">Finance &amp; Billing</option>
            <option value="platform_operations">System Operations</option>
            <option value="platform_readonly">Read-Only Observer</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active Only</option>
            <option value="deactivated">Deactivated Only</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
              title="Table View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Admin Cards / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-56 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredAdmins.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 text-center py-16">
          <CardContent className="space-y-3">
            <Users className="h-12 w-12 text-slate-600 mx-auto" />
            <div className="text-base font-bold text-white">No administrators found</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No platform administrator records match your active search or filter criteria.
            </p>
            {(search || roleFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setRoleFilter('all')
                  setStatusFilter('all')
                }}
                className="border-slate-700 text-slate-300 text-xs mt-2"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins.map((adm) => {
            const isOwner = adm.role === 'platform_owner'
            const isInactive = !adm.is_active
            const roleInfo = ROLE_DESCRIPTIONS[adm.role] || ROLE_DESCRIPTIONS.platform_admin

            return (
              <Card
                key={adm.id}
                className={`bg-slate-900 border-slate-800 p-5 space-y-4 transition-all shadow-xl flex flex-col justify-between ${
                  isInactive ? 'opacity-65 bg-slate-950/90 border-slate-800/60' : 'hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Row: Avatar, Name & Role Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`h-11 w-11 rounded-2xl border flex items-center justify-center font-black text-sm shrink-0 ${roleInfo.color}`}
                      >
                        {isOwner ? <Crown className="h-5 w-5" /> : adm.full_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-white text-sm truncate flex items-center gap-1.5">
                          <span>{adm.full_name}</span>
                          {isOwner && <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                        </div>
                        <div className="text-xs text-slate-400 font-mono truncate flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0 text-slate-500" />
                          <span>{adm.email}</span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${roleInfo.badge}`}
                    >
                      {roleInfo.label.replace('Platform ', '')}
                    </span>
                  </div>

                  {/* Role description snippet */}
                  <p className="text-[11px] text-slate-400 line-clamp-2">{roleInfo.desc}</p>

                  {/* Phone if available */}
                  {adm.phone && (
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
                      <Phone className="h-3 w-3 text-slate-500" />
                      <span>{adm.phone}</span>
                    </div>
                  )}

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-800/80">
                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">Status</span>
                      <span
                        className={`font-semibold flex items-center gap-1.5 ${
                          adm.is_active ? 'text-emerald-400' : 'text-red-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            adm.is_active ? 'bg-emerald-400' : 'bg-red-400'
                          }`}
                        />
                        {adm.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-500 block text-[10px] uppercase font-semibold">MFA Security</span>
                      <span
                        className={`font-semibold flex items-center gap-1.5 ${
                          adm.mfa_enabled ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            adm.mfa_enabled ? 'bg-cyan-400' : 'bg-slate-500'
                          }`}
                        />
                        {adm.mfa_enabled ? 'TOTP Enforced' : 'Optional'}
                      </span>
                    </div>
                  </div>

                  {/* Last login info */}
                  <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono pt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {adm.last_login_at
                        ? `Last active ${new Date(adm.last_login_at).toLocaleDateString()} at ${new Date(
                            adm.last_login_at
                          ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'No recorded login events yet'}
                    </span>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80 mt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(adm)}
                    className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit Details
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={togglingId === adm.id}
                      onClick={() => handleToggleActive(adm)}
                      className={`h-8 text-xs ${
                        adm.is_active
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                          : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                      }`}
                      title={adm.is_active ? 'Deactivate Administrator' : 'Activate Administrator'}
                    >
                      {togglingId === adm.id ? (
                        <RefreshCw className="h-3 w-3 animate-spin" />
                      ) : adm.is_active ? (
                        'Deactivate'
                      ) : (
                        'Activate'
                      )}
                    </Button>

                    {!isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDeletingAdmin(adm)
                          setDeleteError(null)
                        }}
                        className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                        title="Delete Administrator"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ) : (
        /* Table View */
        <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Administrator</th>
                  <th className="py-3 px-4">Platform Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">MFA Security</th>
                  <th className="py-3 px-4">Last Login</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {filteredAdmins.map((adm) => {
                  const isOwner = adm.role === 'platform_owner'
                  const roleInfo = ROLE_DESCRIPTIONS[adm.role] || ROLE_DESCRIPTIONS.platform_admin

                  return (
                    <tr key={adm.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white flex items-center gap-2">
                          <div
                            className={`h-7 w-7 rounded-lg border flex items-center justify-center font-bold text-[10px] shrink-0 ${roleInfo.color}`}
                          >
                            {adm.full_name.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{adm.full_name}</span>
                          {isOwner && <Crown className="h-3 w-3 text-amber-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{adm.email}</div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${roleInfo.badge}`}
                        >
                          {roleInfo.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                            adm.is_active ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              adm.is_active ? 'bg-emerald-400' : 'bg-red-400'
                            }`}
                          />
                          {adm.is_active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 font-semibold text-xs ${
                            adm.mfa_enabled ? 'text-cyan-400' : 'text-slate-400'
                          }`}
                        >
                          {adm.mfa_enabled ? (
                            <>
                              <Smartphone className="h-3 w-3" /> Enforced
                            </>
                          ) : (
                            'Optional'
                          )}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                        {adm.last_login_at
                          ? new Date(adm.last_login_at).toLocaleDateString()
                          : 'Never'}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenEdit(adm)}
                            className="h-7 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 px-2"
                          >
                            <Edit2 className="h-3 w-3 mr-1" />
                            Edit
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={togglingId === adm.id}
                            onClick={() => handleToggleActive(adm)}
                            className={`h-7 text-xs px-2 ${
                              adm.is_active
                                ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                                : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                            }`}
                          >
                            {adm.is_active ? 'Deactivate' : 'Activate'}
                          </Button>

                          {!isOwner && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setDeletingAdmin(adm)
                                setDeleteError(null)
                              }}
                              className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-950/40"
                              title="Delete Administrator"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
      )}

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-indigo-400" />
                  Add Platform Administrator
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Grants server-authorized platform administration privileges and creates a Supabase Auth identity.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateAdmin}>
              <CardContent className="space-y-3.5 pt-4 text-xs">
                {createError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Full Name *</Label>
                  <Input
                    name="full_name"
                    required
                    placeholder="e.g. Tariqul Islam"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Email Address *</Label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="tariqul@inkflow.com.bd"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Phone Number (Optional)</Label>
                  <Input
                    name="phone"
                    type="tel"
                    placeholder="+880 1711-000000"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Initial Password</Label>
                  <div className="relative">
                    <Input
                      name="password"
                      type={showCreatePassword ? 'text' : 'password'}
                      placeholder="Default: InkFlowAdmin!2026"
                      className="bg-slate-950 border-slate-800 text-white text-xs h-9 focus-visible:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCreatePassword(!showCreatePassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                    >
                      {showCreatePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <span className="text-[10px] text-slate-500">Leave blank to use default master password.</span>
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Platform Role / Responsibility</Label>
                  <select
                    name="role"
                    defaultValue="platform_admin"
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="platform_owner">Platform Owner (Root Authority)</option>
                    <option value="platform_admin">Platform Administrator</option>
                    <option value="platform_support">Support Specialist</option>
                    <option value="platform_finance">Finance &amp; Billing</option>
                    <option value="platform_operations">System Operations</option>
                    <option value="platform_readonly">Read-Only Observer</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="create-mfa"
                    name="mfa_enabled"
                    value="true"
                    defaultChecked={true}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                  />
                  <Label htmlFor="create-mfa" className="text-xs text-slate-300 font-medium cursor-pointer">
                    Enforce Multi-Factor Authentication (TOTP)
                  </Label>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-slate-800 bg-slate-900 text-slate-300 h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9"
                >
                  {isCreating ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Administrator'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
          <Card className="w-full max-w-lg bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Edit2 className="h-5 w-5 text-indigo-400" />
                  Edit Platform Administrator
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setEditingAdmin(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Identity: <strong className="text-white font-mono">{editingAdmin.email}</strong>
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveAdmin}>
              <CardContent className="space-y-3.5 pt-4 text-xs">
                {editError && (
                  <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Full Name</Label>
                  <Input
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    required
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9 focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Phone Number</Label>
                  <Input
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="+880 1711-000000"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono focus-visible:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="font-semibold text-slate-300">Assigned Platform Role</Label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as PlatformUserRole)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="platform_owner">Platform Owner (Root Authority)</option>
                    <option value="platform_admin">Platform Administrator</option>
                    <option value="platform_support">Support Specialist</option>
                    <option value="platform_finance">Finance &amp; Billing</option>
                    <option value="platform_operations">System Operations</option>
                    <option value="platform_readonly">Read-Only Observer</option>
                  </select>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-mfa"
                      checked={targetMfa}
                      onChange={(e) => setTargetMfa(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <Label htmlFor="edit-mfa" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Require Multi-Factor Authentication (MFA)
                    </Label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="edit-active"
                      checked={targetActive}
                      onChange={(e) => setTargetActive(e.target.checked)}
                      className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0 cursor-pointer h-4 w-4"
                    />
                    <Label htmlFor="edit-active" className="text-xs text-slate-300 font-medium cursor-pointer">
                      Account Status is Active
                    </Label>
                  </div>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAdmin(null)}
                  className="text-xs border-slate-800 bg-slate-900 text-slate-300 h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-400" />
                  Remove Platform Administrator
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setDeletingAdmin(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Identity: <strong className="text-white font-mono">{deletingAdmin.email}</strong>
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 text-xs text-slate-300 space-y-3">
              {deleteError && (
                <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{deleteError}</span>
                </div>
              )}

              <p>
                Are you sure you want to permanently delete administrator{' '}
                <strong className="text-white">{deletingAdmin.full_name}</strong>?
              </p>

              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200 space-y-1">
                <div className="font-bold">Irreversible Action</div>
                <div className="text-[11px] text-red-200/90">
                  This action immediately revokes all platform privileges, destroys active sessions, and records an immutable audit trail entry.
                </div>
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingAdmin(null)}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300 h-9"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeleting}
                onClick={handleDeleteAdmin}
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs h-9"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Administrator'
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
