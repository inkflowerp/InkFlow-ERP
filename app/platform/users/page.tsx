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
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PlatformService } from '@/services/platform.service'
import { PlatformAdminUser, PlatformUserRole } from '@/types/platform.types'
import { updatePlatformUserAction } from '@/actions/platform.actions'

export default function PlatformUsersPage() {
  const [users, setUsers] = useState<PlatformAdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<PlatformAdminUser | null>(null)
  const [targetRole, setTargetRole] = useState<PlatformUserRole>('platform_admin')
  const [targetMfa, setTargetMfa] = useState<boolean>(true)
  const [notification, setNotification] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const showNotification = (msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  const loadUsers = async () => {
    setLoading(true)
    const res = await PlatformService.getPlatformUsers()
    if (res.success && res.data) {
      setUsers(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadUsers()
  }, [])

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setIsSaving(true)

    const res = await updatePlatformUserAction(editingUser.id, {
      role: targetRole,
      mfa_enabled: targetMfa,
    })

    if (res.success) {
      showNotification(`Administrator permissions updated for ${editingUser.email}.`)
      setEditingUser(null)
      loadUsers()
    } else {
      showNotification(res.error || 'Failed to update platform administrator.')
    }
    setIsSaving(false)
  }

  const handleToggleActive = async (user: PlatformAdminUser) => {
    if (user.role === 'platform_owner') {
      showNotification('Lockout Protection: Platform Owner cannot be deactivated.')
      return
    }

    const nextState = !user.is_active
    const res = await updatePlatformUserAction(user.id, { is_active: nextState })
    if (res.success) {
      showNotification(`User ${user.email} marked as ${nextState ? 'ACTIVE' : 'DEACTIVATED'}.`)
      loadUsers()
    } else {
      showNotification(res.error || 'Failed to update user state.')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-indigo-400" />
            Internal Personnel &amp; Platform Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Users className="h-7 w-7 text-indigo-400" />
            Platform Administrators
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage internal PrintERP system operators, role assignments, MFA compliance, and remote session controls.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadUsers}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Safety Notice Card */}
      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 flex items-start gap-3 text-xs text-indigo-200">
        <ShieldAlert className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold text-white text-sm">Privileged Root Access Boundary</div>
          <p className="text-[11px] text-slate-300 mt-0.5">
            Platform administrators have root oversight over all multi-tenant databases in Bangladesh. Platform users cannot automatically become tenant staff, and tenant staff never inherit platform administration privileges.
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-800">
          <CardTitle className="text-base text-white font-bold">
            Platform Administrators ({users.length})
          </CardTitle>
          <CardDescription className="text-xs text-slate-400">
            System-level accounts with access to the PrintERP Platform Console.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Administrator</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">MFA Security</th>
                <th className="py-3 px-4">Active Sessions</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {users.map((u) => {
                const isOwner = u.role === 'platform_owner'
                return (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-xs border border-indigo-500/30">
                        {u.full_name.charAt(0)}
                      </div>
                      <div>
                        <div>{u.full_name}</div>
                        {isOwner && (
                          <span className="text-[9px] font-mono text-indigo-400 font-bold">
                            ROOT OWNER
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">{u.email}</td>

                    <td className="py-3.5 px-4">
                      <span className="capitalize px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                        {u.role.replace('platform_', '').replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`capitalize px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : 'bg-red-500/10 text-red-400 border-red-500/30'
                        }`}
                      >
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.mfa_enabled ? (
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Enforced</span>
                        </span>
                      ) : (
                        <span className="text-amber-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Optional</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {u.active_sessions_count} device{u.active_sessions_count > 1 ? 's' : ''}
                    </td>

                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString() : 'Never'}
                    </td>

                    <td className="py-3.5 px-4 text-right space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingUser(u)
                          setTargetRole(u.role)
                          setTargetMfa(u.mfa_enabled)
                        }}
                        className="h-7 text-xs border-slate-700 text-slate-300 hover:bg-slate-800"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Edit
                      </Button>

                      {!isOwner && (
                        <Button
                          size="sm"
                          onClick={() => handleToggleActive(u)}
                          className={`h-7 text-xs font-semibold ${
                            u.is_active
                              ? 'bg-red-950/60 hover:bg-red-900 border border-red-800 text-red-300'
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {u.is_active ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Edit Admin Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="font-bold text-white text-sm">
                Edit Administrator: {editingUser.full_name}
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveUser} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Platform Role</label>
                <select
                  value={targetRole}
                  disabled={editingUser.role === 'platform_owner'}
                  onChange={(e) => setTargetRole(e.target.value as PlatformUserRole)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-white capitalize font-semibold"
                >
                  <option value="platform_owner">Platform Owner (Root Superadmin)</option>
                  <option value="platform_admin">Platform Admin (System Configuration)</option>
                  <option value="platform_support">Platform Support (Support Mode &amp; Audit)</option>
                  <option value="platform_operations">Platform Operations (Health &amp; Workers)</option>
                  <option value="platform_finance">Platform Finance (Subscriptions &amp; Billing)</option>
                  <option value="platform_readonly">Platform Read Only (Observer)</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <div className="font-bold text-white">Require 2FA (MFA)</div>
                  <div className="text-[11px] text-slate-400">Enforce TOTP authenticator on console login.</div>
                </div>
                <input
                  type="checkbox"
                  checked={targetMfa}
                  onChange={(e) => setTargetMfa(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 text-indigo-600 bg-slate-900"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditingUser(null)} className="border-slate-700 text-xs">
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs">
                  {isSaving ? 'Saving...' : 'Save Permissions'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
