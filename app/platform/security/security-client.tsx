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
 generatePlatformMfaSecretAction,
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
 const [totpSecretKey, setTotpSecretKey] = useState('')
 const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
 const [isLoadingSecret, setIsLoadingSecret] = useState(false)
 const [isUpdatingMfa, setIsUpdatingMfa] = useState(false)
 const [mfaError, setMfaError] = useState<string | null>(null)
 const [copiedSecret, setCopiedSecret] = useState(false)

 // Session Revocation state
 const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
 const [isRevokingAll, setIsRevokingAll] = useState(false)

 // Login History Filter
 const [loginFilter, setLoginFilter] = useState<'all' | 'successful' | 'failed'>('all')

 const openMfaModal = async (type: 'enable' | 'disable') => {
 setMfaActionType(type)
 setMfaError(null)
 setTotpCode('')
 setMfaModalOpen(true)
 if (type === 'enable') {
 setIsLoadingSecret(true)
 setQrCodeUrl(null)
 setTotpSecretKey('')
 try {
 const res = await generatePlatformMfaSecretAction()
 if (res.success && res.secret) {
 setTotpSecretKey(res.secret)
 if (res.qrCodeDataUrl) {
 setQrCodeUrl(res.qrCodeDataUrl)
 }
 } else {
 setMfaError(res.error || 'Failed to generate MFA secret key.')
 }
 } catch (err: any) {
 setMfaError(err?.message || 'Failed to initialize authenticator setup.')
 } finally {
 setIsLoadingSecret(false)
 }
 }
 }

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
 const res = await togglePlatformOwnerMFAAction(enable, totpCode.trim(), enable ? totpSecretKey : undefined)
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
 <div className="h-10 w-80 bg-muted rounded-xl" />
 <div className="h-4 w-96 bg-muted rounded" />
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
 {[1, 2, 3, 4].map((i) => (
 <div key={i} className="h-28 bg-card border border-border rounded-2xl" />
 ))}
 </div>
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
 <div className="h-96 bg-card border border-border rounded-2xl" />
 <div className="h-96 bg-card border border-border rounded-2xl" />
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
 <Card className="bg-card border-destructive/30 p-8 text-center space-y-4">
 <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto text-destructive">
 <ShieldAlert className="h-6 w-6" />
 </div>
 <div>
 <h2 className="text-lg font-bold text-foreground">Security Center Unavailable</h2>
 <p className="text-sm text-muted-foreground mt-1">{fetchError}</p>
 </div>
 <div className="flex items-center justify-center gap-3 pt-2">
 <Button
 onClick={loadSecurity}
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 Retry Connection
 </Button>
 <Button
 variant="outline"
 asChild
 className="border-border text-muted-foreground hover:bg-muted text-xs"
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
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <span className="h-2 w-2 rounded-full bg-primary/10 animate-pulse" />
 Root Governance &amp; Threat Defense
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 <Shield className="h-7 w-7 text-primary" />
 Platform Security &amp; Threat Defense
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 Audit privileged credentials, configure time-based MFA, govern active device sessions, and inspect platform authentication telemetry.
 </p>
 </div>

 <div className="flex items-center gap-2.5">
 <Button
 size="sm"
 variant="outline"
 onClick={loadSecurity}
 disabled={loading}
 className="border-border bg-card text-muted-foreground hover:bg-muted text-xs h-9 min-h-9"
 >
 <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin text-primary' : ''}`} />
 Refresh Telemetry
 </Button>
 <Button
 size="sm"
 asChild
 className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 min-h-9"
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
 className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2.5 transition-all shadow-xs ${
 notification.type === 'success'
 ? 'bg-success-surface border-success/30 text-success'
 : 'bg-destructive/10 border-destructive/30 text-destructive'
 }`}
 >
 <div className="flex items-center gap-2.5">
 {notification.type === 'success' ? (
 <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
 ) : (
 <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
 )}
 <span>{notification.message}</span>
 </div>
 <button
 type="button"
 onClick={() => setNotification(null)}
 className="text-muted-foreground hover:text-foreground text-xs px-1"
 >
 ✕
 </button>
 </div>
 )}

 {/* Security Status Cards */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
 <Card className="bg-card border-border p-4 relative overflow-hidden shadow-xs group hover:border-border transition-all">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Client Data Protection</span>
 <ShieldCheck className="h-4 w-4 text-success" />
 </div>
 <div className="text-2xl font-black text-success mt-1.5 flex items-center gap-2">
 Healthy
 <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-success/20 text-success border border-success/30">
 100%
 </span>
 </div>
 <div className="text-xs text-muted-foreground mt-0.5 font-medium">0 data leaks detected</div>
 <div className="absolute top-0 right-0 w-24 h-24 bg-success/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
 </Card>

 <Card className="bg-card border-border p-4 relative overflow-hidden shadow-xs group hover:border-border transition-all">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Failed Logins (24h)</span>
 <Lock className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5 flex items-center gap-2">
 {data?.failed_logins_24h ?? 0}
 <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20">
 Active Guard
 </span>
 </div>
 <div className="text-xs text-muted-foreground mt-0.5 font-medium">Rate limiting (5 attempts / 15m)</div>
 <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
 </Card>

 <Card className="bg-card border-border p-4 relative overflow-hidden shadow-xs group hover:border-border transition-all">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>MFA Adoption</span>
 <Smartphone className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-primary mt-1.5 flex items-center gap-2">
 {data?.mfa_adoption_pct ?? 100}%
 <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20">
 TOTP
 </span>
 </div>
 <div className="text-xs text-muted-foreground mt-0.5 font-medium">
 {isMfaActive ? 'Your account is protected' : 'Enable TOTP protection'}
 </div>
 <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
 </Card>

 <Card className="bg-card border-border p-4 relative overflow-hidden shadow-xs group hover:border-border transition-all">
 <div className="text-xs font-semibold text-muted-foreground flex items-center justify-between">
 <span>Active Admin Sessions</span>
 <Laptop className="h-4 w-4 text-primary" />
 </div>
 <div className="text-2xl font-black text-foreground mt-1.5 flex items-center gap-2">
 {data?.active_sessions.length ?? 1}
 <span className="text-xs uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/20">
 Tokens
 </span>
 </div>
 <div className="text-xs text-muted-foreground mt-0.5 font-medium">Hashed cryptographic tokens</div>
 <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl -mr-6 -mt-6 pointer-events-none" />
 </Card>
 </div>

 {/* Two Column Section: Password Change & MFA Management */}
 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
 {/* Card 1: Change Password */}
 <Card className="bg-card border-border shadow-xs flex flex-col justify-between">
 <div>
 <CardHeader className="border-b border-border pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <Key className="h-4 w-4 text-primary" />
 <span>Change Platform Password</span>
 </CardTitle>
 <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
 Supabase Auth
 </span>
 </div>
 <CardDescription className="text-xs text-muted-foreground">
 Update your root supervisory password and invalidate other sessions.
 </CardDescription>
 </CardHeader>

 <form id="password-form" onSubmit={handleChangePassword}>
 <CardContent className="space-y-4 pt-4">
 {passwordError && (
 <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2">
 <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
 <span>{passwordError}</span>
 </div>
 )}

 <div className="space-y-1.5">
 <Label htmlFor="current-pw" className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
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
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-10"
 />
 <button
 type="button"
 onClick={() => setShowCurrentPassword(!showCurrentPassword)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
 aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
 >
 {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="new-pw" className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
 <span>New Password</span>
 <span className="text-xs text-muted-foreground font-normal">Min 8 characters</span>
 </Label>
 <div className="relative">
 <Input
 id="new-pw"
 type={showNewPassword ? 'text' : 'password'}
 required
 value={newPassword}
 onChange={(e) => setNewPassword(e.target.value)}
 placeholder="••••••••••••"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-10"
 />
 <button
 type="button"
 onClick={() => setShowNewPassword(!showNewPassword)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
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
 ? 'bg-destructive'
 : passwordStrength <= 3
 ? 'bg-warning'
 : 'bg-success'
 : 'bg-muted'
 }`}
 />
 ))}
 </div>
 <div className="text-xs text-muted-foreground flex justify-between">
 <span>
 Strength:{' '}
 {passwordStrength <= 2
 ? 'Weak'
 : passwordStrength <= 3
 ? 'Good'
 : 'Strong'}
 </span>
 {passwordStrength >= 4 && <span className="text-success font-semibold">Ready</span>}
 </div>
 </div>
 )}
 </div>

 <div className="space-y-1.5">
 <Label htmlFor="confirm-pw" className="text-xs text-muted-foreground font-semibold flex items-center justify-between">
 <span>Confirm New Password</span>
 {confirmPassword && newPassword === confirmPassword && (
 <span className="text-xs text-success font-semibold flex items-center gap-1">
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
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-10"
 />
 <button
 type="button"
 onClick={() => setShowConfirmPassword(!showConfirmPassword)}
 className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
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
 className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-ring cursor-pointer"
 />
 <Label htmlFor="revoke-others" className="text-xs text-muted-foreground cursor-pointer font-normal">
 Sign out of all other devices and active sessions
 </Label>
 </div>
 </CardContent>
 </form>
 </div>

 <CardFooter className="border-t border-border pt-3 pb-3">
 <Button
 type="submit"
 form="password-form"
 disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 min-h-11"
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
 <Card className="bg-card border-border shadow-xs flex flex-col justify-between">
 <div>
 <CardHeader className="border-b border-border pb-3">
 <div className="flex items-center justify-between">
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <Smartphone className="h-4 w-4 text-primary" />
 <span>Multi-Factor Authentication (MFA)</span>
 </CardTitle>
 <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
 TOTP RFC 6238
 </span>
 </div>
 <CardDescription className="text-xs text-muted-foreground">
 Enhance platform root defense with time-based one-time password verification.
 </CardDescription>
 </CardHeader>

 <CardContent className="pt-4 space-y-4 text-xs">
 <div className="p-3.5 rounded-xl bg-card border border-border flex items-center justify-between">
 <div>
 <div className="font-bold text-foreground text-sm">TOTP Authenticator App</div>
 <div className="text-muted-foreground text-xs mt-0.5">
 Google Authenticator, Microsoft Authenticator, 1Password, Authy
 </div>
 </div>
 {isMfaActive ? (
 <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-success/20 text-success border border-success/30 flex items-center gap-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
 Enabled
 </span>
 ) : (
 <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase bg-warning/20 text-warning border border-warning/30 flex items-center gap-1.5">
 <span className="h-1.5 w-1.5 rounded-full bg-warning" />
 Disabled
 </span>
 )}
 </div>

 <div className="space-y-2 text-muted-foreground">
 <p>
 Admin accounts use multi-factor login to protect client data and platform settings.
 </p>
 <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-start gap-2">
 <ShieldCheck className="h-4 w-4 text-primary shrink-0 mt-0.5" />
 <span>
 SMS authentication is disabled by design to eliminate SIM-swapping attack vectors on root platform credentials.
 </span>
 </div>
 </div>
 </CardContent>
 </div>

 <CardFooter className="border-t border-border pt-3 pb-3 flex flex-col sm:flex-row gap-2">
 {isMfaActive ? (
 <>
 <Button
 type="button"
 variant="outline"
 onClick={() => openMfaModal('enable')}
 className="w-full sm:flex-1 text-xs font-bold border-border hover:bg-muted text-foreground h-10 min-h-11"
 >
 <QrCode className="h-3.5 w-3.5 mr-1.5 text-primary" />
 Re-configure Authenticator
 </Button>
 <Button
 type="button"
 variant="outline"
 onClick={() => openMfaModal('disable')}
 className="w-full sm:w-auto text-xs font-bold border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/90 h-10 min-h-11"
 >
 Disable MFA
 </Button>
 </>
 ) : (
 <Button
 type="button"
 onClick={() => openMfaModal('enable')}
 className="w-full text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground h-10 min-h-11"
 >
 <QrCode className="h-3.5 w-3.5 mr-1.5" />
 Enable Authenticator (TOTP)
 </Button>
 )}
 </CardFooter>
 </Card>
 </div>

 {/* Active Sessions Management */}
 <Card id="sessions" className="bg-card border-border overflow-hidden shadow-xs">
 <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <Laptop className="h-4 w-4 text-primary" />
 <span>Active Platform Sessions ({data?.active_sessions.length ?? 1})</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Cryptographically signed tokens currently authenticated to platform administration.
 </CardDescription>
 </div>

 {otherSessions.length > 0 && (
 <Button
 type="button"
 size="sm"
 disabled={isRevokingAll}
 onClick={handleRevokeAllOtherSessions}
 className="bg-destructive/10 hover:bg-destructive/90 border border-destructive/30 text-destructive font-bold text-xs h-9 min-h-9"
 >
 <LogOut className={`h-3.5 w-3.5 mr-1.5 ${isRevokingAll ? 'animate-spin' : ''}`} />
 {isRevokingAll ? 'Revoking All...' : 'Revoke All Other Sessions'}
 </Button>
 )}
 </CardHeader>

 <CardContent className="p-0 overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold uppercase text-xs border-b border-border">
 <tr>
 <th className="py-3 px-4">Device &amp; Browser</th>
 <th className="py-3 px-4">IP Address &amp; Location</th>
 <th className="py-3 px-4">Status &amp; Last Active</th>
 <th className="py-3 px-4 text-right">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-foreground">
 {data?.active_sessions && data.active_sessions.length > 0 ? (
 data.active_sessions.map((sess) => (
 <tr key={sess.id} className="hover:bg-muted transition-colors">
 <td className="py-3.5 px-4">
 <div className="font-bold text-foreground flex items-center gap-2">
 <Laptop className="h-4 w-4 text-muted-foreground shrink-0" />
 <span>{sess.device_name}</span>
 </div>
 <div className="text-xs text-muted-foreground tabular-nums mt-0.5">{sess.user_email}</div>
 </td>

 <td className="py-3.5 px-4">
 <div className="tabular-nums text-primary text-xs">{sess.ip_address}</div>
 <div className="text-xs text-muted-foreground">{sess.location}</div>
 </td>

 <td className="py-3.5 px-4 tabular-nums text-muted-foreground">
 {sess.is_current ? (
 <span className="text-success font-bold flex items-center gap-1.5">
 <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
 Current Device
 </span>
 ) : (
 <div>
 <div className="text-muted-foreground">
 {formatTime(sess.last_seen_at)}
 </div>
 <div className="text-xs text-muted-foreground">
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
 className="h-8 text-xs bg-destructive/10 hover:bg-destructive/90 border border-destructive/30 text-destructive font-bold min-h-8"
 >
 <LogOut className={`h-3 w-3 mr-1 ${revokingSessionId === sess.id ? 'animate-spin' : ''}`} />
 {revokingSessionId === sess.id ? 'Revoking...' : 'Revoke'}
 </Button>
 ) : (
 <span className="text-xs text-success/80 font-semibold px-2 py-0.5 rounded bg-success/10 border border-success/30">
 Active Now
 </span>
 )}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={4} className="py-6 text-center text-muted-foreground">
 No active sessions recorded.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </CardContent>
 </Card>

 {/* Login History Telemetry */}
 <Card className="bg-card border-border overflow-hidden shadow-xs">
 <CardHeader className="pb-3 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
 <div>
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <History className="h-4 w-4 text-primary" />
 <span>Platform Authentication Telemetry</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 Recent authentication events and sign-in attempts for Platform Administrator accounts.
 </CardDescription>
 </div>

 <div className="flex items-center gap-1.5 bg-card p-1 rounded-lg border border-border">
 <button
 type="button"
 onClick={() => setLoginFilter('all')}
 className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
 loginFilter === 'all'
 ? 'bg-primary text-foreground'
 : 'text-muted-foreground hover:text-primary-foreground'
 }`}
 >
 All Events
 </button>
 <button
 type="button"
 onClick={() => setLoginFilter('successful')}
 className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
 loginFilter === 'successful'
 ? 'bg-success text-foreground'
 : 'text-muted-foreground hover:text-foreground'
 }`}
 >
 Successful
 </button>
 <button
 type="button"
 onClick={() => setLoginFilter('failed')}
 className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
 loginFilter === 'failed'
 ? 'bg-destructive text-foreground'
 : 'text-muted-foreground hover:text-destructive-foreground'
 }`}
 >
 Failed
 </button>
 </div>
 </CardHeader>

 <CardContent className="p-0 overflow-x-auto">
 <table className="w-full text-left text-xs">
 <thead className="bg-card text-muted-foreground font-semibold uppercase text-xs border-b border-border">
 <tr>
 <th className="py-3 px-4">Timestamp</th>
 <th className="py-3 px-4">Device &amp; Browser</th>
 <th className="py-3 px-4">IP Address &amp; Location</th>
 <th className="py-3 px-4 text-right">Outcome</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-border text-foreground">
 {filteredLoginHistory && filteredLoginHistory.length > 0 ? (
 filteredLoginHistory.map((item) => (
 <tr key={item.id} className="hover:bg-muted transition-colors">
 <td className="py-3 px-4 tabular-nums text-muted-foreground">
 <div>
 {formatDate(item.timestamp)}
 </div>
 <div className="text-xs text-muted-foreground">
 {formatTime(item.timestamp, 'en', { second: '2-digit' })}
 </div>
 </td>

 <td className="py-3 px-4">
 <div className="font-semibold text-foreground flex items-center gap-1.5">
 <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
 <span>{item.device_browser}</span>
 </div>
 </td>

 <td className="py-3 px-4">
 <div className="tabular-nums text-primary text-xs">{item.ip_address}</div>
 <div className="text-xs text-muted-foreground">{item.location}</div>
 </td>

 <td className="py-3 px-4 text-right">
 {item.status === 'successful' ? (
 <span className="inline-flex items-center gap-1 text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-success/20 text-success border border-success/30">
 <Check className="h-3 w-3" /> Success
 </span>
 ) : (
 <span className="inline-flex items-center gap-1 text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-destructive/20 text-destructive border border-destructive/30">
 <X className="h-3 w-3" /> Failed
 </span>
 )}
 </td>
 </tr>
 ))
 ) : (
 <tr>
 <td colSpan={4} className="py-6 text-center text-muted-foreground">
 No login events match the selected filter.
 </td>
 </tr>
 )}
 </tbody>
 </table>
 </CardContent>
 </Card>

 {/* Privileged Actions Audit Log Preview */}
 <Card className="bg-card border-border shadow-xs">
 <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
 <div>
 <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
 <FileClock className="h-4 w-4 text-primary" />
 <span>Recent Privileged Administrative Interventions</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 High-impact security events and mutations recorded across the platform control plane.
 </CardDescription>
 </div>
 <Link
 href="/platform/audit"
 className="text-xs text-primary hover:text-primary font-semibold min-h-9 flex items-center gap-1"
 >
 Full Audit Trail <ArrowRight className="h-3.5 w-3.5" />
 </Link>
 </CardHeader>

 <CardContent className="p-0 divide-y divide-border text-xs">
 {data?.recent_privileged_actions && data.recent_privileged_actions.length > 0 ? (
 data.recent_privileged_actions.map((act) => (
 <div
 key={act.id}
 className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-muted transition-colors"
 >
 <div className="space-y-0.5">
 <div className="flex items-center gap-2 flex-wrap">
 <span className="tabular-nums font-bold text-primary text-xs bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
 {act.action}
 </span>
 <span className="text-muted-foreground">•</span>
 <span className="text-foreground font-semibold">
 {act.details?.company_name || act.target_company_name || 'Global Platform'}
 </span>
 </div>
 {act.reason && <div className="text-xs text-muted-foreground">Reason: {act.reason}</div>}
 </div>

 <div className="sm:text-right">
 <div className="tabular-nums text-muted-foreground text-xs">
 {formatTime(act.created_at, 'en', { second: '2-digit' })}
 </div>
 <div className="text-xs text-muted-foreground tabular-nums">{act.actor_email}</div>
 </div>
 </div>
 ))
 ) : (
 <div className="p-6 text-center text-muted-foreground">
 No recent administrative interventions recorded.
 </div>
 )}
 </CardContent>
 </Card>

 {/* Security Defenses Checklist */}
 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
 <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
 <div className="flex items-center gap-2 text-xs font-bold text-success">
 <ShieldCheck className="h-4 w-4" />
 <span>PostgreSQL RLS</span>
 </div>
 <p className="text-xs text-muted-foreground">
 Client databases are strictly separated and private.
 </p>
 </div>

 <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
 <div className="flex items-center gap-2 text-xs font-bold text-primary">
 <Fingerprint className="h-4 w-4" />
 <span>Cryptographic Tokens</span>
 </div>
 <p className="text-xs text-muted-foreground">
 Session tokens are SHA-256 hashed and matched with active database session records.
 </p>
 </div>

 <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
 <div className="flex items-center gap-2 text-xs font-bold text-primary">
 <Lock className="h-4 w-4" />
 <span>HTTPOnly Cookies</span>
 </div>
 <p className="text-xs text-muted-foreground">
 Protected with SameSite=Lax and HTTPOnly attributes to prevent XSS session exfiltration.
 </p>
 </div>

 <div className="p-4 rounded-xl bg-card border border-border space-y-1.5">
 <div className="flex items-center gap-2 text-xs font-bold text-primary">
 <Zap className="h-4 w-4" />
 <span>Rate Limiting</span>
 </div>
 <p className="text-xs text-muted-foreground">
 Brute force mitigation blocks consecutive failed attempts across all authentication routes.
 </p>
 </div>
 </div>

 {/* MFA Modal */}
 {mfaModalOpen && (
 <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-0">
 <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 shadow-xs space-y-4">
 <div className="flex items-center justify-between pb-3 border-b border-border">
 <div className="flex items-center gap-2 font-bold text-foreground text-base">
 <Smartphone className="h-5 w-5 text-primary" />
 <span>{mfaActionType === 'enable' ? 'Configure Authenticator App' : 'Disable Multi-Factor Authentication'}</span>
 </div>
 <button
 type="button"
 onClick={() => {
 setMfaModalOpen(false)
 setMfaError(null)
 setTotpCode('')
 }}
 className="text-muted-foreground hover:text-foreground p-1 rounded-lg min-h-11 min-w-11 flex items-center justify-center cursor-pointer"
 aria-label="Close dialog"
 >
 ✕
 </button>
 </div>

 {mfaError && (
 <div className="p-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl text-xs flex items-center gap-2">
 <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
 <span>{mfaError}</span>
 </div>
 )}

 {mfaActionType === 'enable' ? (
 <div className="space-y-4 text-xs">
 <p className="text-muted-foreground">
 Scan this QR code with <strong>Google Authenticator</strong>, <strong>Microsoft Authenticator</strong>, or <strong>1Password</strong>:
 </p>

 {/* Scannable Authenticator QR Code */}
 <div className="p-4 bg-card rounded-2xl border border-border flex flex-col items-center justify-center mx-auto w-56 min-h-56 shadow-xs relative">
 {isLoadingSecret ? (
 <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
 <RefreshCw className="h-6 w-6 animate-spin text-primary" />
 <span className="text-xs font-medium">Generating QR code...</span>
 </div>
 ) : qrCodeUrl ? (
 <div className="flex flex-col items-center gap-2">
 <div className="p-2 bg-card rounded-xl border border-border shadow-xs shrink-0">
 <img
 src={qrCodeUrl}
 alt="Authenticator App QR Code"
 width={176}
 height={176}
 className="w-44 h-44 block object-contain"
 />
 </div>
 <span className="text-xs tabular-nums font-bold text-foreground">
 PrintFlow: {data?.current_user_email || 'PlatformAdmin'}
 </span>
 </div>
 ) : (
 <div className="text-center p-4 text-xs text-muted-foreground space-y-1">
 <p className="font-semibold text-foreground">QR Code Unavailable</p>
 <p>Please enter the manual setup secret key below into your authenticator app.</p>
 </div>
 )}
 </div>

 {/* Manual Setup Key with Copy Button */}
 <div className="p-3 bg-card rounded-xl border border-border space-y-1">
 <div className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center justify-between">
 <span>Manual Setup Secret Key</span>
 {copiedSecret && (
 <span className="text-success font-bold lowercase">copied to clipboard!</span>
 )}
 </div>
 <div className="flex items-center justify-between gap-2">
 <span className="tabular-nums text-primary text-xs font-bold tracking-wider">
 {totpSecretKey}
 </span>
 <Button
 type="button"
 size="sm"
 variant="ghost"
 onClick={handleCopySecret}
 className="h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted px-2 min-h-7"
 >
 <Copy className="h-3 w-3 mr-1" />
 {copiedSecret ? 'Copied' : 'Copy'}
 </Button>
 </div>
 </div>

 <div className="space-y-1.5 pt-1">
 <Label htmlFor="mfa-totp-input" className="text-muted-foreground text-xs font-semibold">
 Enter 6-digit verification code from your app:
 </Label>
 <Input
 id="mfa-totp-input"
 type="text"
 inputMode="numeric"
 autoComplete="one-time-code"
 maxLength={6}
 placeholder="000000"
 value={totpCode}
 onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
 onKeyDown={(e) => {
 if (e.key === 'Enter' && totpCode.trim().length === 6 && !isUpdatingMfa) {
 e.preventDefault()
 handleToggleMFA()
 }
 }}
 className="tabular-nums text-center tracking-[0.5em] text-lg bg-card border-border text-foreground focus-visible:ring-primary font-bold"
 />
 </div>
 </div>
 ) : (
 <div className="space-y-3 text-xs text-muted-foreground">
 <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive space-y-1">
 <div className="font-bold flex items-center gap-1.5 text-destructive">
 <AlertTriangle className="h-4 w-4 shrink-0" />
 Security Warning
 </div>
 <p className="text-xs text-destructive/90">
 Disabling Multi-Factor Authentication removes secondary token verification from this platform owner account, increasing vulnerability to credential stuffing.
 </p>
 </div>
 <p>Are you sure you want to disable TOTP authentication for this Platform Administrator account?</p>
 </div>
 )}

 <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
 <Button
 variant="outline"
 size="sm"
 onClick={() => {
 setMfaModalOpen(false)
 setMfaError(null)
 setTotpCode('')
 }}
 className="border-border text-muted-foreground hover:bg-muted text-xs h-10 min-h-11"
 >
 Cancel
 </Button>
 <Button
 variant={mfaActionType === 'enable' ? 'default' : 'destructive'}
 size="sm"
 disabled={isUpdatingMfa || (mfaActionType === 'enable' && totpCode.length !== 6)}
 onClick={handleToggleMFA}
 className="text-xs font-bold h-10 min-h-11"
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
