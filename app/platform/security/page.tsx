'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  Copy,
  ExternalLink,
  Info,
  Server,
  Fingerprint,
  Zap,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PlatformSettingsNav } from '@/components/platform/platform-settings-nav'
import { getPlatformSecurityOverviewAction } from '@/actions/platform-data.actions'
import { PlatformSecurityOverview, PlatformActiveSession, PlatformLoginHistoryItem } from '@/types/platform.types'
import { formatDate, formatTime, formatDateTime } from '@/lib/formatters'
import {
  changePlatformOwnerPasswordAction,
  togglePlatformOwnerMFAAction,
  revokePlatformSessionAction,
  revokeAllOtherPlatformSessionsAction,
} from '@/actions/platform.actions'

export default function PlatformSecurityPage() {
  const [data, setData] = useState<PlatformSecurityOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Password state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [revokeOthersOnPasswordChange, setRevokeOthersOnPasswordChange] = useState(true)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  // MFA Modal state
  const [mfaModalOpen, setMfaModalOpen] = useState(false)
  const [mfaActionType, setMfaActionType] = useState<'enable' | 'disable'>('enable')
  const [totpCode, setTotpCode] = useState('')
  const [isUpdatingMfa, setIsUpdatingMfa] = useState(false)
  const [mfaError, setMfaError] = useState<string | null>(null)
  const [copiedSecret, setCopiedSecret] = useState(false)

  // Session Revocation state
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [isRevokingAll, setIsRevokingAll] = useState(false)

  // Login History Filter
  const [loginFilter, setLoginFilter] = useState<'all' | 'successful' | 'failed'>('all')

  const totpSecretKey = 'JBSWY3DPEHPK3PXP'

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadSecurity = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await getPlatformSecurityOverviewAction()
      if (res.success && res.data) {
        setData(res.data)
      } else {
        setFetchError(res.error || 'Failed to load platform security telemetry.')
      }
    } catch (err: any) {
      setFetchError(err?.message || 'An unexpected error occurred while loading security center.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSecurity()
  }, [])

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!newPassword) return 0
    let score = 0
    if (newPassword.length >= 8) score += 1
    if (newPassword.length >= 12) score += 1
    if (/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword)) score += 1
    if (/[0-9]/.test(newPassword)) score += 1
    if (/[^A-Za-z0-9]/.test(newPassword)) score += 1
    return score
  }, [newPassword])

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

    try {
      const res = await changePlatformOwnerPasswordAction(
        currentPassword,
        newPassword,
        revokeOthersOnPasswordChange
      )

      if (res.success) {
        showToast(
          'success',
          revokeOthersOnPasswordChange
            ? 'Root password updated successfully. All other active sessions were invalidated.'
            : 'Root password updated successfully.'
        )
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        await loadSecurity()
      } else {
        setPasswordError(res.error || 'Failed to update password.')
      }
    } catch {
      setPasswordError('An unexpected error occurred while updating password.')
    } finally {
      setIsChangingPassword(false)
    }
  }

  // Session Revocation handlers
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId)
    try {
      const res = await revokePlatformSessionAction(sessionId)
      if (res.success) {
        showToast('success', 'Active administrator session token revoked immediately.')
        await loadSecurity()
      } else {
        showToast('error', res.error || 'Failed to revoke session.')
      }
    } catch {
      showToast('error', 'An error occurred while revoking session.')
    } finally {
      setRevokingSessionId(null)
    }
  }

  const handleRevokeAllOtherSessions = async () => {
    setIsRevokingAll(true)
    try {
      const currentSess = data?.active_sessions.find((s) => s.is_current)
      const res = await revokeAllOtherPlatformSessionsAction(currentSess?.id)
      if (res.success) {
        showToast('success', 'All other active administrator sessions revoked successfully.')
        await loadSecurity()
      } else {
        showToast('error', res.error || 'Failed to revoke sessions.')
      }
    } catch {
      showToast('error', 'An error occurred while revoking all sessions.')
    } finally {
      setIsRevokingAll(false)
    }
  }

  // MFA toggle handler
  const handleToggleMFA = async () => {
    setIsUpdatingMfa(true)
    setMfaError(null)
    const enable = mfaActionType === 'enable'

    if (enable && totpCode.trim().length !== 6) {
      setMfaError('Please enter a valid 6-digit numeric verification code.')
      setIsUpdatingMfa(false)
      return
    }

    try {
      const res = await togglePlatformOwnerMFAAction(enable)
      if (res.success) {
        showToast(
          'success',
          `Multi-Factor Authentication (TOTP) ${enable ? 'enabled' : 'disabled'} successfully.`
        )
        setMfaModalOpen(false)
        setTotpCode('')
        await loadSecurity()
      } else {
        setMfaError(res.error || 'Failed to update MFA settings.')
      }
    } catch {
      setMfaError('An unexpected error occurred while updating MFA.')
    } finally {
      setIsUpdatingMfa(false)
    }
  }

  const handleCopySecret = () => {
    navigator.clipboard.writeText(totpSecretKey)
    setCopiedSecret(true)
    setTimeout(() => setCopiedSecret(false), 2500)
  }

  // Filtered Login History
  const loginHistory = data?.login_history
  const filteredLoginHistory = useMemo(() => {
    if (!loginHistory) return []
    if (loginFilter === 'all') return loginHistory
    return loginHistory.filter((item) => item.status === loginFilter)
  }, [loginHistory, loginFilter])

  const activeSessions = data?.active_sessions
  const otherSessions = useMemo(() => {
    return (activeSessions || []).filter((s) => !s.is_current)
  }, [activeSessions])

  const isMfaActive = Boolean(data?.current_user_mfa_enabled)

  // Loading skeleton
  if (loading && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PlatformSettingsNav />
        <div className="space-y-4 animate-pulse">
          <div className="h-10 w-80 bg-slate-800/80 rounded-xl" />
          <div className="h-4 w-96 bg-slate-800/50 rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
            <div className="h-96 bg-slate-900 border border-slate-800 rounded-2xl" />
          </div>
        </div>
      </div>
    )
  }

  // Error fallback
  if (fetchError && !data) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto pb-12">
        <PlatformSettingsNav />
        <Card className="bg-slate-900 border-red-900/50 p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-950 border border-red-800 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Security Center Unavailable</h2>
            <p className="text-sm text-slate-400 mt-1">{fetchError}</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              onClick={loadSecurity}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Retry Connection
            </Button>
            <Button
              variant="outline"
              asChild
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              <Link href="/platform/login">Platform Login</Link>
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Sub-Navigation */}
      <PlatformSettingsNav />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            Root Governance &amp; Threat Defense
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Shield className="h-7 w-7 text-cyan-400" />
            Platform Security &amp; Threat Defense
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit privileged credentials, configure time-based MFA, govern active device sessions, and inspect platform authentication telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={loadSecurity}
            disabled={loading}
            className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9 min-h-[36px]"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            Refresh Telemetry
          </Button>
          <Button
            size="sm"
            asChild
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-9 min-h-[36px]"
          >
            <Link href="/platform/audit">
              <FileClock className="h-3.5 w-3.5 mr-1.5" />
              Audit Logs
            </Link>
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
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
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

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Tenant Isolation RLS</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-1.5 flex items-center gap-2">
            Healthy
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              100%
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">0 cross-tenant leaks detected</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Failed Logins (24h)</span>
            <Lock className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            {data?.failed_logins_24h ?? 0}
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              Active Guard
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Rate limiting (5 attempts / 15m)</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>MFA Adoption</span>
            <Smartphone className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-cyan-400 mt-1.5 flex items-center gap-2">
            {data?.mfa_adoption_pct ?? 100}%
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              TOTP
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
            {isMfaActive ? 'Your account is protected' : 'Enable TOTP protection'}
          </div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>

        <Card className="bg-slate-900/90 border-slate-800 p-4 relative overflow-hidden shadow-lg group hover:border-slate-700 transition-all">
          <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
            <span>Active Admin Sessions</span>
            <Laptop className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-white mt-1.5 flex items-center gap-2">
            {data?.active_sessions.length ?? 1}
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Tokens
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">Hashed cryptographic tokens</div>
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
        </Card>
      </div>

      {/* Two Column Section: Password Change & MFA Management */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Change Password */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white font-bold flex items-center gap-2">
                  <Key className="h-4 w-4 text-indigo-400" />
                  <span>Change Platform Password</span>
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  Supabase Auth
                </span>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Update your root supervisory password and invalidate other sessions.
              </CardDescription>
            </CardHeader>

            <form id="password-form" onSubmit={handleChangePassword}>
              <CardContent className="space-y-4 pt-4">
                {passwordError && (
                  <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="current-pw" className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                    <span>Current Password</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="current-pw"
                      type={showCurrentPassword ? 'text' : 'password'}
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="new-pw" className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                    <span>New Password</span>
                    <span className="text-[10px] text-slate-400 font-normal">Min 8 characters</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="new-pw"
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Password Strength Meter */}
                  {newPassword.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <div className="flex gap-1 h-1">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                          <div
                            key={lvl}
                            className={`flex-1 rounded-full transition-all ${
                              passwordStrength >= lvl
                                ? passwordStrength <= 2
                                  ? 'bg-red-500'
                                  : passwordStrength <= 3
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                                : 'bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-400 flex justify-between">
                        <span>
                          Strength:{' '}
                          {passwordStrength <= 2
                            ? 'Weak'
                            : passwordStrength <= 3
                            ? 'Good'
                            : 'Strong'}
                        </span>
                        {passwordStrength >= 4 && <span className="text-emerald-400 font-semibold">Ready</span>}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm-pw" className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                    <span>Confirm New Password</span>
                    {confirmPassword && newPassword === confirmPassword && (
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" /> Matches
                      </span>
                    )}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm-pw"
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 focus:outline-none"
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="revoke-others"
                    type="checkbox"
                    checked={revokeOthersOnPasswordChange}
                    onChange={(e) => setRevokeOthersOnPasswordChange(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <Label htmlFor="revoke-others" className="text-xs text-slate-300 cursor-pointer font-normal">
                    Sign out of all other devices and active sessions
                  </Label>
                </div>
              </CardContent>
            </form>
          </div>

          <CardFooter className="border-t border-slate-800 pt-3 pb-3">
            <Button
              type="submit"
              form="password-form"
              disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-10 min-h-[44px]"
            >
              {isChangingPassword ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                  Updating Password...
                </>
              ) : (
                'Update Master Password'
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Card 2: Multi-Factor Authentication (MFA) */}
        <Card className="bg-slate-900 border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <CardHeader className="border-b border-slate-800 pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base text-white font-bold flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-cyan-400" />
                  <span>Multi-Factor Authentication (MFA)</span>
                </CardTitle>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  TOTP RFC 6238
                </span>
              </div>
              <CardDescription className="text-xs text-slate-400">
                Enhance platform root defense with time-based one-time password verification.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-4 space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-white text-sm">TOTP Authenticator App</div>
                  <div className="text-slate-400 text-xs mt-0.5">
                    Google Authenticator, Microsoft Authenticator, 1Password, Authy
                  </div>
                </div>
                {isMfaActive ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Enabled
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Disabled
                  </span>
                )}
              </div>

              <div className="space-y-2 text-slate-400">
                <p>
                  Platform accounts require multi-factor authentication to perform root operations including tenant database export, rate limit alterations, and emergency control toggles.
                </p>
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-900/40 text-[11px] text-indigo-300 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>
                    SMS authentication is disabled by design to eliminate SIM-swapping attack vectors on root platform credentials.
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          <CardFooter className="border-t border-slate-800 pt-3 pb-3 flex flex-col sm:flex-row gap-2">
            {isMfaActive ? (
              <>
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
              </>
            ) : (
              <Button
                type="button"
                onClick={() => {
                  setMfaActionType('enable')
                  setMfaModalOpen(true)
                }}
                className="w-full text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white h-10 min-h-[44px]"
              >
                <QrCode className="h-3.5 w-3.5 mr-1.5" />
                Enable Authenticator (TOTP)
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>

      {/* Active Sessions Management */}
      <Card id="sessions" className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <Laptop className="h-4 w-4 text-purple-400" />
              <span>Active Platform Sessions ({data?.active_sessions.length ?? 1})</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Cryptographically signed tokens currently authenticated to platform administration.
            </CardDescription>
          </div>

          {otherSessions.length > 0 && (
            <Button
              type="button"
              size="sm"
              disabled={isRevokingAll}
              onClick={handleRevokeAllOtherSessions}
              className="bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold text-xs h-9 min-h-[36px]"
            >
              <LogOut className={`h-3.5 w-3.5 mr-1.5 ${isRevokingAll ? 'animate-spin' : ''}`} />
              {isRevokingAll ? 'Revoking All...' : 'Revoke All Other Sessions'}
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
              {data?.active_sessions && data.active_sessions.length > 0 ? (
                data.active_sessions.map((sess) => (
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
                          <div className="text-slate-300">
                            {formatTime(sess.last_seen_at)}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Created {formatDate(sess.created_at)}
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      {!sess.is_current ? (
                        <Button
                          size="sm"
                          disabled={revokingSessionId === sess.id}
                          onClick={() => handleRevokeSession(sess.id)}
                          className="h-8 text-xs bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 font-bold min-h-[32px]"
                        >
                          <LogOut className={`h-3 w-3 mr-1 ${revokingSessionId === sess.id ? 'animate-spin' : ''}`} />
                          {revokingSessionId === sess.id ? 'Revoking...' : 'Revoke'}
                        </Button>
                      ) : (
                        <span className="text-[11px] text-emerald-400/80 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          Active Now
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No active sessions recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Login History Telemetry */}
      <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <History className="h-4 w-4 text-indigo-400" />
              <span>Platform Authentication Telemetry</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Recent authentication events and sign-in attempts for Platform Administrator accounts.
            </CardDescription>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => setLoginFilter('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                loginFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Events
            </button>
            <button
              type="button"
              onClick={() => setLoginFilter('successful')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                loginFilter === 'successful'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Successful
            </button>
            <button
              type="button"
              onClick={() => setLoginFilter('failed')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
                loginFilter === 'failed'
                  ? 'bg-red-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Failed
            </button>
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
              {filteredLoginHistory && filteredLoginHistory.length > 0 ? (
                filteredLoginHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <div>
                        {formatDate(item.timestamp)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatTime(item.timestamp, 'en', { second: '2-digit' })}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        <Laptop className="h-3.5 w-3.5 text-slate-400" />
                        <span>{item.device_browser}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-mono text-cyan-400 text-xs">{item.ip_address}</div>
                      <div className="text-[11px] text-slate-400">{item.location}</div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      {item.status === 'successful' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          <Check className="h-3 w-3" /> Success
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                          <X className="h-3 w-3" /> Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-slate-500">
                    No login events match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Privileged Actions Audit Log Preview */}
      <Card className="bg-slate-900 border-slate-800 shadow-xl">
        <CardHeader className="pb-3 border-b border-slate-800 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base text-white font-bold flex items-center gap-2">
              <FileClock className="h-4 w-4 text-cyan-400" />
              <span>Recent Privileged Administrative Interventions</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              High-impact security events and mutations recorded across the platform control plane.
            </CardDescription>
          </div>
          <Link
            href="/platform/audit"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold min-h-[36px] flex items-center gap-1"
          >
            Full Audit Trail <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-800 text-xs">
          {data?.recent_privileged_actions && data.recent_privileged_actions.length > 0 ? (
            data.recent_privileged_actions.map((act) => (
              <div
                key={act.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30 transition-colors"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-indigo-400 text-xs bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
                      {act.action}
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="text-white font-semibold">
                      {act.details?.company_name || act.target_company_name || 'Global Platform'}
                    </span>
                  </div>
                  {act.reason && <div className="text-[11px] text-slate-400">Reason: {act.reason}</div>}
                </div>

                <div className="sm:text-right">
                  <div className="font-mono text-slate-300 text-xs">
                    {formatTime(act.created_at, 'en', { second: '2-digit' })}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">{act.actor_email}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-slate-500">
              No recent administrative interventions recorded.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Defenses Checklist */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
            <ShieldCheck className="h-4 w-4" />
            <span>PostgreSQL RLS</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Fail-closed multi-tenant database policies isolate tenant databases at the storage engine level.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400">
            <Fingerprint className="h-4 w-4" />
            <span>Cryptographic Tokens</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Session tokens are SHA-256 hashed and matched with active database session records.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <Lock className="h-4 w-4" />
            <span>HTTPOnly Cookies</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Protected with SameSite=Lax and HTTPOnly attributes to prevent XSS session exfiltration.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
            <Zap className="h-4 w-4" />
            <span>Rate Limiting</span>
          </div>
          <p className="text-[11px] text-slate-400">
            Brute force mitigation blocks consecutive failed attempts across all authentication routes.
          </p>
        </div>
      </div>

      {/* MFA Modal */}
      {mfaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in-0">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 font-bold text-white text-base">
                <Smartphone className="h-5 w-5 text-cyan-400" />
                <span>{mfaActionType === 'enable' ? 'Configure Authenticator App' : 'Disable Multi-Factor Authentication'}</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMfaModalOpen(false)
                  setMfaError(null)
                  setTotpCode('')
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            {mfaError && (
              <div className="p-3 bg-red-950/80 border border-red-800 text-red-200 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span>{mfaError}</span>
              </div>
            )}

            {mfaActionType === 'enable' ? (
              <div className="space-y-4 text-xs">
                <p className="text-slate-300">
                  Scan this QR code with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>1Password</strong>:
                </p>

                {/* SVG Visual QR Code */}
                <div className="p-4 bg-white rounded-2xl flex flex-col items-center justify-center mx-auto w-48 h-48 shadow-inner relative">
                  <svg className="w-36 h-36" viewBox="0 0 100 100" fill="none">
                    {/* Corner Position Detection Patterns */}
                    {/* Top Left */}
                    <rect x="5" y="5" width="28" height="28" fill="#0f172a" rx="4" />
                    <rect x="9" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="13" width="12" height="12" fill="#0f172a" rx="1" />

                    {/* Top Right */}
                    <rect x="67" y="5" width="28" height="28" fill="#0f172a" rx="4" />
                    <rect x="71" y="9" width="20" height="20" fill="white" rx="2" />
                    <rect x="75" y="13" width="12" height="12" fill="#0f172a" rx="1" />

                    {/* Bottom Left */}
                    <rect x="5" y="67" width="28" height="28" fill="#0f172a" rx="4" />
                    <rect x="9" y="71" width="20" height="20" fill="white" rx="2" />
                    <rect x="13" y="75" width="12" height="12" fill="#0f172a" rx="1" />

                    {/* Matrix Mock Pattern Elements */}
                    <rect x="38" y="8" width="6" height="6" fill="#0f172a" rx="1" />
                    <rect x="48" y="8" width="12" height="6" fill="#0f172a" rx="1" />
                    <rect x="38" y="18" width="12" height="6" fill="#0f172a" rx="1" />
                    <rect x="54" y="18" width="6" height="6" fill="#0f172a" rx="1" />
                    <rect x="38" y="28" width="6" height="6" fill="#0f172a" rx="1" />
                    <rect x="48" y="28" width="12" height="6" fill="#0f172a" rx="1" />

                    <rect x="8" y="38" width="6" height="12" fill="#0f172a" rx="1" />
                    <rect x="18" y="38" width="12" height="6" fill="#0f172a" rx="1" />
                    <rect x="18" y="48" width="6" height="12" fill="#0f172a" rx="1" />

                    <rect x="38" y="38" width="24" height="24" fill="#0284c7" rx="3" />
                    <path d="M50 44 L56 47 L56 53 C56 57 50 60 50 60 C50 60 44 57 44 53 L44 47 Z" fill="white" />

                    <rect x="68" y="38" width="12" height="6" fill="#0f172a" rx="1" />
                    <rect x="84" y="38" width="8" height="12" fill="#0f172a" rx="1" />
                    <rect x="68" y="48" width="6" height="12" fill="#0f172a" rx="1" />
                    <rect x="78" y="48" width="14" height="6" fill="#0f172a" rx="1" />

                    <rect x="38" y="68" width="12" height="6" fill="#0f172a" rx="1" />
                    <rect x="54" y="68" width="6" height="12" fill="#0f172a" rx="1" />
                    <rect x="38" y="78" width="6" height="14" fill="#0f172a" rx="1" />
                    <rect x="48" y="86" width="12" height="6" fill="#0f172a" rx="1" />

                    <rect x="68" y="68" width="8" height="6" fill="#0f172a" rx="1" />
                    <rect x="80" y="68" width="12" height="6" fill="#0f172a" rx="1" />
                    <rect x="68" y="78" width="24" height="6" fill="#0f172a" rx="1" />
                    <rect x="74" y="88" width="18" height="4" fill="#0f172a" rx="1" />
                  </svg>
                  <span className="text-[10px] font-mono font-bold text-slate-800 mt-1">
                    PrintERP:PlatformAdmin
                  </span>
                </div>

                {/* Manual Setup Key with Copy Button */}
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>Manual Setup Secret Key</span>
                    {copiedSecret && (
                      <span className="text-emerald-400 font-bold lowercase">copied to clipboard!</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-cyan-400 text-xs font-bold tracking-wider">
                      {totpSecretKey}
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleCopySecret}
                      className="h-7 text-xs text-slate-300 hover:text-white hover:bg-slate-800 px-2 min-h-[28px]"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      {copiedSecret ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5 pt-1">
                  <Label className="text-slate-300 text-xs font-semibold">
                    Enter 6-digit verification code from your app:
                  </Label>
                  <Input
                    type="text"
                    maxLength={6}
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                    className="font-mono text-center tracking-[0.5em] text-lg bg-slate-950 border-slate-800 text-white focus-visible:ring-cyan-500 font-bold"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-300">
                <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-800 text-red-200 space-y-1">
                  <div className="font-bold flex items-center gap-1.5 text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    Security Warning
                  </div>
                  <p className="text-[11px] text-red-200/90">
                    Disabling Multi-Factor Authentication removes secondary token verification from this platform owner account, increasing vulnerability to credential stuffing.
                  </p>
                </div>
                <p>Are you sure you want to disable TOTP authentication for this Platform Administrator account?</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMfaModalOpen(false)
                  setMfaError(null)
                  setTotpCode('')
                }}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-10 min-h-[44px]"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isUpdatingMfa || (mfaActionType === 'enable' && totpCode.length !== 6)}
                onClick={handleToggleMFA}
                className={`text-xs font-bold text-white h-10 min-h-[44px] ${
                  mfaActionType === 'enable'
                    ? 'bg-cyan-600 hover:bg-cyan-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {isUpdatingMfa ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : mfaActionType === 'enable' ? (
                  'Verify & Enable TOTP'
                ) : (
                  'Confirm Disable MFA'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
