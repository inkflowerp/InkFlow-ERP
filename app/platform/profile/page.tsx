'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  User,
  Mail,
  Phone,
  Shield,
  Key,
  Smartphone,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Camera,
  Save,
  Clock,
  Calendar,
  Lock,
  ArrowRight,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PlatformAdminUser } from '@/types/platform.types'
import { updatePlatformOwnerProfileAction } from '@/actions/platform.actions'
import { getPlatformSessionUserAction } from '@/actions/platform-auth.actions'

export default function PlatformOwnerProfilePage() {
  const [profile, setProfile] = useState<PlatformAdminUser | null>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const loadProfile = async () => {
    setIsLoading(true)
    const sessionUser = await getPlatformSessionUserAction()
    if (sessionUser) {
      setProfile({
        id: sessionUser.id,
        user_id: sessionUser.user_id,
        email: sessionUser.email,
        full_name: sessionUser.full_name,
        role: sessionUser.role,
        phone: sessionUser.phone || '',
        avatar_url: sessionUser.avatar_url || '',
        is_active: sessionUser.is_active,
        mfa_enabled: Boolean(sessionUser.mfa_enabled),
        active_sessions_count: 1,
        created_at: sessionUser.created_at,
        last_login_at: sessionUser.last_login_at,
      })
      setFullName(sessionUser.full_name)
      setPhone(sessionUser.phone || '')
      setAvatarUrl(sessionUser.avatar_url || '')
    }
    setIsLoading(false)
  }

  const isDirty = profile ? (fullName !== profile.full_name || phone !== (profile.phone || '') || avatarUrl !== (profile.avatar_url || '')) : false
  const isDirtyRef = useRef(false)

  useEffect(() => {
    isDirtyRef.current = isDirty
  }, [isDirty])

  useEffect(() => {
    loadProfile()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)

    // Server Action for PostgreSQL update, session cookie sync, audit log, and Next.js cache revalidation
    const res = await updatePlatformOwnerProfileAction({
      full_name: fullName,
      phone,
      avatar_url: avatarUrl,
    })

    if (res.success && res.data) {
      setProfile(res.data)
      showToast('success', 'Platform Owner profile updated successfully.')
    } else {
      showToast('error', res.error || 'Failed to update profile.')
    }
    setIsSaving(false)
  }

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Allowed formats: JPG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      showToast('error', 'Invalid file type. Allowed formats: JPG, PNG, WEBP.')
      return
    }

    // Max 2MB
    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Image size must be less than 2MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAvatarUrl(reader.result as string)
      showToast('success', 'Profile photo uploaded. Click "Save Profile Changes" to confirm.')
    }
    reader.readAsDataURL(file)
  }

  if (isLoading || !profile) {
    return (
      <div className="space-y-6 animate-pulse p-4 sm:p-6">
        <div className="h-10 w-64 bg-slate-800 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-80 bg-slate-900 border border-slate-800 rounded-2xl" />
          <div className="lg:col-span-2 h-80 bg-slate-900 border border-slate-800 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">
            <Shield className="h-4 w-4" />
            Platform Owner Credentials &amp; Identity
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            Platform Owner Profile
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage your root supervisory profile, contact information, and security posture.
          </p>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={loadProfile}
          className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 text-xs h-9 min-h-[36px]"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh Profile
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

      {/* Main Grid: Profile & Account Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Avatar Card & Account Meta */}
        <div className="space-y-6">
          {/* Identity Card */}
          <Card className="bg-slate-900 border-slate-800 overflow-hidden shadow-xl">
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-3 relative">
                <div className="relative group">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile.full_name}
                      className="h-24 w-24 rounded-2xl object-cover ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-500/20"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-500/20 ring-2 ring-white/10">
                      {profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white text-[10px] font-semibold transition-opacity cursor-pointer min-h-[44px] min-w-[44px]"
                    aria-label="Change profile photo"
                  >
                    <Camera className="h-5 w-5 mb-1" />
                    <span>Upload</span>
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarFileSelect}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                  />
                </div>
              </div>

              <CardTitle className="text-lg font-bold text-white">{profile.full_name}</CardTitle>
              <CardDescription className="text-xs text-indigo-400 font-mono font-medium">
                {profile.email}
              </CardDescription>

              <div className="flex items-center justify-center gap-2 mt-3">
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Platform Owner
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Active
                </span>
              </div>
            </CardHeader>

            <CardContent className="pt-4 border-t border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-500" />
                  Created Date
                </span>
                <span className="text-slate-200 font-mono">
                  {new Date(profile.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 py-1 border-b border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-slate-500" />
                  Last Login
                </span>
                <span className="text-slate-200 font-mono">
                  {profile.last_login_at
                    ? new Date(profile.last_login_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                    : 'Recent'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 py-1">
                <span className="flex items-center gap-1.5">
                  <Laptop className="h-3.5 w-3.5 text-slate-500" />
                  Active Sessions
                </span>
                <span className="text-indigo-400 font-bold font-mono">
                  {profile.active_sessions_count} device(s)
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Security Shortcuts */}
          <Card className="bg-slate-900 border-slate-800 p-4 space-y-3">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Key className="h-4 w-4 text-cyan-400" />
              Security Posture
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">MFA Authentication</div>
                  <div className="text-[11px] text-slate-400">
                    {profile.mfa_enabled ? 'TOTP Authenticator active' : 'Not configured'}
                  </div>
                </div>
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    profile.mfa_enabled
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {profile.mfa_enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Password Status</div>
                  <div className="text-[11px] text-slate-400">
                    {profile.password_last_changed_at
                      ? `Last changed ${new Date(profile.password_last_changed_at).toLocaleDateString()}`
                      : 'Compliant'}
                  </div>
                </div>
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Secured
                </span>
              </div>
            </div>

            <Button asChild variant="outline" className="w-full text-xs font-bold border-slate-700 hover:bg-slate-800 h-9 min-h-[44px]">
              <Link href="/platform/security" className="flex items-center justify-center gap-1.5">
                <span>Manage Security &amp; Sessions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </Card>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-slate-900 border-slate-800 shadow-xl">
            <CardHeader className="border-b border-slate-800 pb-4">
              <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-400" />
                <span>Edit Profile Details</span>
              </CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Update your display name, contact phone number, and avatar image.
              </CardDescription>
            </CardHeader>

            <form onSubmit={handleSaveProfile}>
              <CardContent className="space-y-4 pt-5">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="full-name" className="text-xs text-slate-300 font-semibold">
                    Full Legal Name
                  </Label>
                  <Input
                    id="full-name"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    icon={<User className="h-4 w-4 text-slate-400" />}
                    placeholder="e.g. Haji Mohammad Shamim"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Primary Email (Read-Only with verification notice) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email" className="text-xs text-slate-300 font-semibold">
                      Platform Owner Email
                    </Label>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Verified Root Account
                    </span>
                  </div>
                  <Input
                    id="email"
                    type="email"
                    disabled
                    value={profile.email}
                    icon={<Mail className="h-4 w-4 text-slate-500" />}
                    className="bg-slate-950/40 border-slate-800 text-slate-400 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-500">
                    Platform email changes require cryptographic step-up verification and audit log authorization to prevent hostile takeovers.
                  </p>
                </div>

                {/* Phone Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs text-slate-300 font-semibold">
                    Direct Contact Phone (Bangladesh)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={<Phone className="h-4 w-4 text-slate-400" />}
                    placeholder="+8801711-892019"
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                </div>

                {/* Platform Role (Read-only) */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300 font-semibold">
                    Assigned Platform Role
                  </Label>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-white">Platform Owner (Super Administrator)</div>
                      <div className="text-[11px] text-slate-400">
                        Unrestricted authority across all PrintERP SaaS clusters, billing, and tenants.
                      </div>
                    </div>
                    <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded border border-indigo-800">
                      IMMUTABLE
                    </span>
                  </div>
                </div>

                {/* Avatar URL / Storage selector */}
                <div className="space-y-1.5">
                  <Label htmlFor="avatar-url" className="text-xs text-slate-300 font-semibold">
                    Custom Avatar Image URL (Optional)
                  </Label>
                  <Input
                    id="avatar-url"
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    icon={<Camera className="h-4 w-4 text-slate-400" />}
                    placeholder="https://..."
                    className="bg-slate-950/60 border-slate-800 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Supports JPG, PNG, WEBP. Max file size: 2MB. Stored with encrypted signed access.
                  </p>
                </div>
              </CardContent>

              <CardFooter className="border-t border-slate-800 pt-4 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className="text-[11px] text-slate-500">
                  Profile modifications are immutably logged to the Platform Audit Log.
                </span>
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 h-10 shadow-lg shadow-indigo-600/30 min-h-[44px]"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  <span>{isSaving ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
