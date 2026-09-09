'use client'

import React, { useState, useEffect } from 'react'
import {
  Users,
  Shield,
  CheckCircle2,
  AlertTriangle,
  UserCheck,
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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getPlatformUsersAction } from '@/actions/platform-data.actions'
import { PlatformAdminUser, PlatformUserRole } from '@/types/platform.types'
import {
  updatePlatformUserAction,
  createPlatformAdminAction,
  deletePlatformAdminAction,
} from '@/actions/platform.actions'

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit Modal
  const [editingAdmin, setEditingAdmin] = useState<PlatformAdminUser | null>(null)
  const [targetRole, setTargetRole] = useState<PlatformUserRole>('platform_admin')
  const [targetMfa, setTargetMfa] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState(false)

  // Delete Modal
  const [deletingAdmin, setDeletingAdmin] = useState<PlatformAdminUser | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Notifications
  const [notification, setNotification] = useState<string | null>(null)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadAdmins = async () => {
    setLoading(true)
    const res = await getPlatformUsersAction()
    if (res.success && res.data) {
      setAdmins(res.data)
    }
    setLoading(false)
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
    const res = await createPlatformAdminAction(formData)

    if (res.success) {
      showNotification(`Platform administrator "${formData.get('full_name')}" created.`)
      setShowCreateModal(false)
      loadAdmins()
    } else {
      setCreateError(res.error || 'Failed to create platform administrator.')
    }
    setIsCreating(false)
  }

  // Edit Admin
  const handleSaveAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAdmin) return
    setIsSaving(true)

    const res = await updatePlatformUserAction(editingAdmin.id, {
      role: targetRole,
      mfa_enabled: targetMfa,
    })

    if (res.success) {
      showNotification(`Permissions updated for ${editingAdmin.email}.`)
      setEditingAdmin(null)
      loadAdmins()
    } else {
      showNotification(res.error || 'Failed to update platform administrator.')
    }
    setIsSaving(false)
  }

  // Toggle Active State
  const handleToggleActive = async (admin: PlatformAdminUser) => {
    if (admin.role === 'platform_owner') {
      const activeOwners = admins.filter((a) => a.role === 'platform_owner' && a.is_active)
      if (activeOwners.length <= 1 && admin.is_active) {
        showNotification('Security Protection: Cannot deactivate the last active Platform Owner.')
        return
      }
    }

    const nextState = !admin.is_active
    const res = await updatePlatformUserAction(admin.id, { is_active: nextState })
    if (res.success) {
      showNotification(`Administrator ${admin.email} marked as ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`)
      loadAdmins()
    } else {
      showNotification(res.error || 'Failed to update administrator status.')
    }
  }

  // Delete Admin
  const handleDeleteAdmin = async () => {
    if (!deletingAdmin) return
    setIsDeleting(true)

    const res = await deletePlatformAdminAction(deletingAdmin.id)
    if (res.success) {
      showNotification(`Platform administrator ${deletingAdmin.email} removed.`)
      setDeletingAdmin(null)
      loadAdmins()
    } else {
      showNotification(res.error || 'Failed to delete administrator.')
    }
    setIsDeleting(false)
  }

  const filteredAdmins = admins.filter((a) => {
    if (!search.trim()) return true
    const q = search.toLowerCase().trim()
    return (
      a.full_name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.role.toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-5">
          {notification}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Security &amp; Internal Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-indigo-400" />
            Platform Administrators
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Privileged accounts with root administrative access to InkFlow platform infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Administrator
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={loadAdmins}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800 max-w-md">
        <Input
          placeholder="Search by name, email, or platform responsibility..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-slate-950/80 border-slate-800 text-xs text-white placeholder:text-slate-500 h-9 rounded-xl focus-visible:ring-indigo-500"
        />
      </div>

      {/* Admin Cards / Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredAdmins.length === 0 ? (
        <Card className="bg-slate-900/60 border-slate-800 text-center py-12">
          <CardContent className="space-y-2">
            <Users className="h-10 w-10 text-slate-600 mx-auto" />
            <div className="text-sm font-bold text-white">No administrators found</div>
            <p className="text-xs text-slate-400">No platform administrator records match the filter.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAdmins.map((adm) => {
            const isOwner = adm.role === 'platform_owner'
            const isInactive = !adm.is_active

            return (
              <Card
                key={adm.id}
                className={`bg-slate-900 border-slate-800 p-5 space-y-4 transition-all ${
                  isInactive ? 'opacity-60 bg-slate-950' : 'hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-black text-sm shrink-0">
                      {adm.full_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-white text-sm truncate">{adm.full_name}</div>
                      <div className="text-xs text-slate-400 font-mono truncate">{adm.email}</div>
                    </div>
                  </div>

                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border shrink-0 ${
                      isOwner
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                    }`}
                  >
                    {adm.role.replace('platform_', '').replace('_', ' ')}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500 block">Status</span>
                    <span
                      className={`font-semibold ${
                        adm.is_active ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {adm.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block">MFA Security</span>
                    <span
                      className={`font-semibold ${
                        adm.mfa_enabled ? 'text-emerald-400' : 'text-slate-400'
                      }`}
                    >
                      {adm.mfa_enabled ? 'Enforced' : 'Optional'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAdmin(adm)
                      setTargetRole(adm.role)
                      setTargetMfa(Boolean(adm.mfa_enabled))
                    }}
                    className="h-8 text-xs border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800"
                  >
                    <Edit2 className="h-3 w-3 mr-1" />
                    Edit Role
                  </Button>

                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(adm)}
                      className={`h-8 text-xs ${
                        adm.is_active
                          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-950/40'
                          : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40'
                      }`}
                      title={adm.is_active ? 'Deactivate Administrator' : 'Activate Administrator'}
                    >
                      {adm.is_active ? 'Deactivate' : 'Activate'}
                    </Button>

                    {!isOwner && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeletingAdmin(adm)}
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
      )}

      {/* CREATE ADMIN MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                  <Plus className="h-5 w-5 text-indigo-400" />
                  Add Platform Administrator
                </CardTitle>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Grants server-authorized platform administration privileges.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleCreateAdmin}>
              <CardContent className="space-y-3 pt-4 text-xs">
                {createError && (
                  <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-800 text-red-200">
                    {createError}
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Full Name *</label>
                  <Input
                    name="full_name"
                    required
                    placeholder="e.g. Tariqul Islam"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Email Address *</label>
                  <Input
                    name="email"
                    type="email"
                    required
                    placeholder="tariqul@inkflow.com.bd"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Initial Password</label>
                  <Input
                    name="password"
                    type="password"
                    placeholder="Default: InkFlowAdmin!2026"
                    className="bg-slate-950 border-slate-800 text-white text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Platform Role / Responsibility</label>
                  <select
                    name="role"
                    defaultValue="platform_admin"
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="platform_owner">Platform Owner (Root Authority)</option>
                    <option value="platform_admin">Platform Administrator</option>
                    <option value="platform_support">Support Specialist</option>
                    <option value="platform_finance">Finance &amp; Billing</option>
                    <option value="platform_operations">System Operations</option>
                    <option value="platform_readonly">Read-Only Observer</option>
                  </select>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreateModal(false)}
                  className="text-xs border-slate-800 bg-slate-900 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isCreating ? 'Creating...' : 'Create Administrator'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* EDIT ADMIN MODAL */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-indigo-400" />
                Edit Platform Responsibility
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Administrator: <strong className="text-white">{editingAdmin.email}</strong>
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveAdmin}>
              <CardContent className="space-y-3 pt-4 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Assigned Primary Role</label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as PlatformUserRole)}
                    className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                  >
                    <option value="platform_owner">Platform Owner</option>
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
                    id="edit-mfa"
                    checked={targetMfa}
                    onChange={(e) => setTargetMfa(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <label htmlFor="edit-mfa" className="text-xs text-slate-300 font-medium">
                    Require Multi-Factor Authentication (MFA)
                  </label>
                </div>
              </CardContent>

              <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAdmin(null)}
                  className="text-xs border-slate-800 bg-slate-900 text-slate-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving}
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-400" />
                Remove Administrator
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Are you sure you want to delete <strong className="text-white">{deletingAdmin.full_name}</strong> ({deletingAdmin.email})?
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 text-xs text-slate-300 space-y-2">
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-red-200">
                This action will immediately revoke all platform administration privileges and record an immutable audit event.
              </div>
            </CardContent>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/60">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeletingAdmin(null)}
                className="text-xs border-slate-800 bg-slate-900 text-slate-300"
              >
                Cancel
              </Button>
              <Button
                disabled={isDeleting}
                onClick={handleDeleteAdmin}
                size="sm"
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs"
              >
                {isDeleting ? 'Deleting...' : 'Delete Administrator'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
