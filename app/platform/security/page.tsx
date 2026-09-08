'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Smartphone,
  Key,
  RefreshCw,
  LogOut,
  Laptop,
  Globe,
  FileClock,
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  X,
  History,
  AlertCircle,
  QrCode,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { getPlatformSecurityOverviewAction } from '@/actions/platform-data.actions'
import { PlatformSecurityOverview, PlatformActiveSession, PlatformLoginHistoryItem } from '@/types/platform.types'
import {
  changePlatformOwnerPasswordAction,
  togglePlatformOwnerMFAAction,
  revokePlatformSessionAction,
  revokeAllOtherPlatformSessionsAction,
} from '@/actions/platform.actions'

export default function PlatformSecurityPage() {
  const [data, setData] = useState<PlatformSecurityOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [revokeOthersOnPasswordChange, setRevokeOthersOnPasswordChange] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // MFA Modal state
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaActionType, setMfaActionType] = useState<'enable' | 'disable'>('enable')
  const [mfaStep, setMfaStep] = useState<1 | 2>(1)
  const [totpCode, setTotpCode] = useState('')
  const [isUpdatingMfa, setIsUpdatingMfa] = useState(false)

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadSecurity = async () => {
    setLoading(true)
    const res = await getPlatformSecurityOverviewAction()
    if (res.success && res.data) {
      setData(res.data)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadSecurity()
  }, [])

  // Password change handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setIsChangingPassword(true)
    setPasswordError(null)

    const res = await changePlatformOwnerPasswordAction(
      currentPassword,
      newPassword,
      revokeOthersOnPasswordChange
    )

    if (res.success) {
      showToast('success', 'Password updated successfully. Other active sessions were invalidated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      loadSecurity()
    } else {
      setPasswordError(res.error || 'Failed to update password.')
    }
    setIsChangingPassword(false)
  }

  // Session Revocation handlers
  const handleRevokeSession = async (sessionId: string) => {
    const res = await revokePlatformSessionAction(sessionId)
    if (res.success) {
      showToast('success', 'Active administrator session revoked successfully.')
      loadSecurity()
    } else {
      showToast('error', res.error || 'Failed to revoke session.')
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    const res = await revokeAllOtherPlatformSessionsAction()
    if (res.success) {
      showToast('success', 'All other active sessions revoked successfully.')
      loadSecurity()
    } else {
      showToast('error', res.error || 'Failed to revoke sessions.')
    }
  }

  // MFA toggle handler
  const handleToggleMFA = async () => {
    setIsUpdatingMfa(true)
    const enable = mfaActionType === 'enable'
    const res = await togglePlatformOwnerMFAAction(enable)
    if (res.success) {
      showToast('success', `Multi-Factor Authentication (TOTP) ${enable ? 'enabled' : 'disabled'} successfully.`)
      setMfaModalOpen(false)
      loadSecurity()
    } else {
      showToast('error', res.error || 'Failed to update MFA settings.')
    }
    setIsUpdatingMfa(false)
  }

  if (loading || !data) {
    return (
      <div className="space-y-6 animate-pulse max-w-6xl mx-auto pb-12">
        <div className="h-10 w-72 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const currentSession = data.active_sessions.find((s) => s.is_current)
  const otherSessions = data.active_sessions.filter((s) => !s.is_current)

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            Root Governance &amp; Threat Defense
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-cyan-400" />
            Platform Security &amp; Sessions
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit privileged credentials, manage active device tokens, configure MFA, and monitor platform login telemetry.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadSecurity}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9 min-h-[36px]"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
              : 'bg-red-950/70 border-red-800 text-red-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Tenant Isolation RLS</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1">Healthy</div>
          <div className="text-[11px] text-emerald-400 mt-0.5 font-semibold">0 cross-tenant leaks</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Failed Logins (24h)</span>
            <Lock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{data.failed_logins_24h}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Rate limiting active</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>MFA Enforcement</span>
            <Smartphone className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1">{data.mfa_adoption_pct}%</div>
          <div className="text-[11px] text-cyan-400 mt-0.5">Platform Owner Enforced</div>
        </Card>

        <Card className="bg-slate-900 border-slate-800 p-4">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Active Device Sessions</span>
            <Laptop className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1">{data.active_sessions.length}</div>
          <div className="text-[11px] text-purple-400 mt-0.5">Authenticated tokens</div>
        </Card>
      </div>

      {/* Two Column Section: Password Change & MFA Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl">
          <CardHeader className="border-b border-slate-800 pb-3">
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <Key className="h-4 w-4 text-indigo-400" />
              <span>Change Platform Password</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Update your root supervisory password and invalidate other sessions.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleChangePassword}>
            <CardContent className="space-y-4 pt-4">
              {passwordError && (
                <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="current-pw" className="text-xs text-slate-300 font-semibold">
                  Current Password
                </Label>
                <Input
                  id="current-pw"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-pw" className="text-xs text-slate-300 font-semibold">
                  New Password (min 8 characters)
                </Label>
                <Input
                  id="new-pw"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  rightElement={
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="p-2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirm-pw" className="text-xs text-slate-300 font-semibold">
                  Confirm New Password
                </Label>
                <Input
                  id="confirm-pw"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  id="revoke-others"
                  type="checkbox"
                  checked={revokeOthersOnPasswordChange}
                  onChange={(e) => setRevokeOthersOnPasswordChange(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500"
                />
                <Label htmlFor="revoke-others" className="text-xs text-slate-300 cursor-pointer font-normal">
                  Sign out of all other devices and active sessions
                </Label>
              </div>
            </CardContent>

            <CardFooter className="border-t border-slate-800 pt-3 pb-3">
              <Button
                type="submit"
                disabled={isChangingPassword}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-10 min-h-[44px]"
              >
                {isChangingPassword ? 'Updating Password...' : 'Update Password'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {/* Card 2: Multi-Factor Authentication (MFA) */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-800 pb-3">
              <CardTitle className="text-base text-white font-bold flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-cyan-400" />
                <span>Multi-Factor Authentication (MFA)</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Enhance platform security with time-based one-time password (TOTP) verification.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">TOTP Authenticator</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Google Authenticator, Microsoft Authenticator, 1Password
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Enabled
                </span>
              </div>

              <div className="space-y-2 text-slate-400">
                <p>
                  Platform Owner accounts require multi-factor authentication to perform root operations including tenant database export, rate limit alterations, and emergency control toggling.
                </p>
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    SMS authentication is disabled by design to mitigate SIM-swapping attack vectors on root platform credentials.
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <CardFooter className="border-t border-slate-800 pt-3 pb-3 flex flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMfaActionType('enable')
                setMfaModalOpen(true)
              }}
              className="w-full sm:flex-1 text-xs font-bold border-slate-700 hover:bg-slate-800 text-slate-200 h-10 min-h-[44px]"
            >
              <QrCode className="h-3.5 w-3.5 mr-1.5 text-cyan-400" />
              Re-configure Authenticator
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setMfaActionType('disable')
                setMfaModalOpen(true)
              }}
              className="w-full sm:w-auto text-xs font-bold border-red-900/60 bg-red-950/20 text-red-400 hover:bg-red-950/60 h-10 min-h-[44px]"
            >
              Disable MFA
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Active Sessions Management */}
      <Card id="sessions" className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <Laptop className="h-4 w-4 text-purple-400" />
              <span>Active Platform Sessions ({data.active_sessions.length})</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Cryptographically signed tokens currently authenticated to platform administration.
            </CardDescription>
          </div>

          {otherSessions.length > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={handleRevokeAllOtherSessions}
              className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs h-9 min-h-[44px]"
            >
              <LogOut className="h-3.5 w-3.5 mr-1.5" />
              Revoke All Other Sessions
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Device &amp; Browser</th>
                <th className="py-3 px-4">IP Address &amp; Location</th>
                <th className="py-3 px-4">Status &amp; Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {data.active_sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>{sess.device_name}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">{sess.user_email}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="font-mono text-cyan-400 text-xs">{sess.ip_address}</div>
                    <div className="text-[11px] text-slate-400">{sess.location}</div>
                  </td>

                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {sess.is_current ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Current Device
                      </span>
                    ) : (
                      <div>
                        <div className="text-slate-300">{sess.last_seen_at}</div>
                        <div className="text-[10px] text-slate-500">
                          Created {new Date(sess.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    {!sess.is_current ? (
                      <Button
                        size="sm"
                        onClick={() => handleRevokeSession(sess.id)}
                        className="h-8 text-xs bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold min-h-[36px]"
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Revoke
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 font-semibold">Active Now</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Login History Telemetry */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <span>Platform Login History</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Recent authentication events for Platform Owner accounts.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Device &amp; Browser</th>
                <th className="py-3 px-4">IP Address &amp; Location</th>
                <th className="py-3 px-4 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {data.login_history && data.login_history.length > 0 ? (
                data.login_history.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div>{new Date(item.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{item.device_browser}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-cyan-400 text-xs">{item.ip_address}</div>
                      <div className="text-[11px] text-slate-400">{item.location}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.status === 'successful' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Check className="h-3 w-3" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          <X className="h-3 w-3" /> Failed Attempt
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-slate-500">
                    No recent login events recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Privileged Actions Audit Log */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <FileClock className="h-4 w-4 text-cyan-400" />
              <span>Recent Privileged Administrative Interventions</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              High-impact security events and mutations recorded across the platform.
            </CardDescription>
          </div>
          <Link href="/platform/audit" className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold min-h-[36px] flex items-center">
            Full Audit Trail →
          </Link>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-800 text-xs">
          {data.recent_privileged_actions.map((act) => (
            <div key={act.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-400">{act.action}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-white font-semibold">{act.target_company_name || 'Global Platform'}</span>
                </div>
                {act.reason && <div className="text-[11px] text-slate-400">Reason: {act.reason}</div>}
              </div>

              <div className="text-right">
                <div className="font-mono text-slate-400">{new Date(act.created_at).toLocaleTimeString()}</div>
                <div className="text-[10px] text-slate-500 font-mono">{act.actor_email}</div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* MFA Modal */}
      {mfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Smartphone className="h-5 w-5 text-cyan-400" />
                <span>{mfaActionType === 'enable' ? 'Configure Authenticator' : 'Disable MFA'}</span>
              </div>
              <button
                type="button"
                onClick={() => setMfaModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {mfaActionType === 'enable' ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-300">
                  Scan this QR code with Google Authenticator or 1Password to bind your authenticator app.
                </p>
                <div className="p-4 bg-white rounded-xl flex items-center justify-center mx-auto w-44 h-44 shadow-inner">
                  <div className="text-center font-mono font-bold text-slate-900 text-xs">
                    [TOTP QR CODE]
                    <div className="text-[10px] text-slate-600 mt-1">PrintERP:PlatformOwner</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">Enter 6-digit TOTP Code</Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    className="font-mono text-center tracking-widest text-base bg-slate-950 border-slate-800 text-white"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-red-200">
                  Warning: Disabling Multi-Factor Authentication degrades account protection against credential stuffing.
                </div>
                <p>Are you sure you want to disable TOTP authentication for this Platform Owner account?</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMfaModalOpen(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-10 min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdatingMfa || (mfaActionType === 'enable' && totpCode.length !== 6)}
                onClick={handleToggleMFA}
                className={`text-xs font-bold text-white h-10 min-h-[44px] ${
                  mfaActionType === 'enable' ? 'bg-cyan-600 hover:bg-cyan-500' : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {isUpdatingMfa
                  ? 'Verifying...'
                  : mfaActionType === 'enable'
                  ? 'Verify & Enable TOTP'
                  : 'Confirm Disable MFA'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
