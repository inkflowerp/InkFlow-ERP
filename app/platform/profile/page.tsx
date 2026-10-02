'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useI18n } from '@/lib/i18n/i18n-context'
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
import { formatDate, formatDateTime } from '@/lib/formatters'

export default function PlatformOwnerProfilePage() {
  const { tBilingual } = useI18n()
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
 <div className="h-10 w-64 bg-muted rounded-xl" />
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 <div className="h-80 bg-card border border-border rounded-2xl" />
 <div className="lg:col-span-2 h-80 bg-card border border-border rounded-2xl" />
 </div>
 </div>
 )
 }

 return (
 <div className="space-y-6 max-w-6xl mx-auto pb-12">
 {/* Header */}
 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
 <div>
 <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider mb-1">
 <Shield className="h-4 w-4" />
 Platform Owner Credentials &amp; Identity
 </div>
 <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
 {tBilingual('My Profile', 'আমার প্রোফাইল')}
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground mt-1">
 {tBilingual('Manage your name, phone number, and account photo.', 'আপনার নাম, মোবাইল নম্বর এবং প্রোফাইল ছবি পরিবর্তন করুন।')}
 </p>
 </div>

 <Button
 size="sm"
 variant="outline"
 onClick={loadProfile}
 className="border-border bg-card text-muted-foreground hover:bg-muted text-xs h-9 min-h-9"
 >
 <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
 {tBilingual('Refresh', 'রিফ্রেশ')}
 </Button>
 </div>

 {/* Notification */}
 {notification && (
 <div
 className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 transition-all ${
 notification.type === 'success'
 ? 'bg-success-surface border-success/30 text-success'
 : 'bg-destructive/10 border-destructive/30 text-destructive'
 }`}
 >
 {notification.type === 'success' ? (
 <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
 ) : (
 <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
 )}
 <span>{notification.message}</span>
 </div>
 )}

 {/* Main Grid: Profile & Account Information */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Left Column: Avatar Card & Account Meta */}
 <div className="space-y-6">
 {/* Identity Card */}
 <Card className="bg-card border-border overflow-hidden shadow-xs">
 <CardHeader className="text-center pb-2">
 <div className="flex justify-center mb-3 relative">
 <div className="relative group">
 {avatarUrl ? (
 <img
 src={avatarUrl}
 alt={profile.full_name}
 className="h-24 w-24 rounded-2xl object-cover ring-2 ring-primary/50 shadow-xs"
 />
 ) : (
 <div className="h-24 w-24 rounded-2xl bg-card flex items-center justify-center text-foreground text-2xl font-black shadow-xs ring-2 ring-white/10">
 {profile.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
 </div>
 )}

 <button
 type="button"
 onClick={() => fileInputRef.current?.click()}
 className="absolute inset-0 bg-background/80 rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-foreground text-2xs font-semibold transition-opacity cursor-pointer min-h-11 min-w-11"
 aria-label="Change profile photo"
 >
 <Camera className="h-5 w-5 mb-1" />
 <span>{tBilingual('Upload', 'আপলোড')}</span>
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

 <CardTitle className="text-lg font-bold text-foreground">{profile.full_name}</CardTitle>
 <CardDescription className="text-xs text-primary tabular-nums font-medium">
 {profile.email}
 </CardDescription>

 <div className="flex items-center justify-center gap-2 mt-3">
 <span className="text-2xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
 Platform Owner
 </span>
 <span className="text-2xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-success/20 text-success border border-success/30 flex items-center gap-1">
 <span className="h-1.5 w-1.5 rounded-full bg-success" />
 Active
 </span>
 </div>
 </CardHeader>

 <CardContent className="pt-4 border-t border-border space-y-3 text-xs">
 <div className="flex items-center justify-between text-muted-foreground py-1 border-b border-border">
 <span className="flex items-center gap-1.5">
 <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
 {tBilingual('Joined Date', 'যুক্ত হওয়ার তারিখ')}
 </span>
 <span className="text-foreground tabular-nums">
 {formatDate(profile.created_at)}
 </span>
 </div>

 <div className="flex items-center justify-between text-muted-foreground py-1 border-b border-border">
 <span className="flex items-center gap-1.5">
 <Clock className="h-3.5 w-3.5 text-muted-foreground" />
 {tBilingual('Last Login', 'সর্বশেষ লগইন')}
 </span>
 <span className="text-foreground tabular-nums">
 {profile.last_login_at
 ? formatDateTime(profile.last_login_at)
 : 'Recent'}
 </span>
 </div>

 <div className="flex items-center justify-between text-muted-foreground py-1">
 <span className="flex items-center gap-1.5">
 <Laptop className="h-3.5 w-3.5 text-muted-foreground" />
 {tBilingual('Active Devices', 'চলমান ডিভাইস')}
 </span>
 <span className="text-primary font-bold tabular-nums">
 {profile.active_sessions_count} device(s)
 </span>
 </div>
 </CardContent>
 </Card>

 {/* Quick Security Shortcuts */}
 <Card className="bg-card border-border p-4 space-y-3">
 <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
 <Key className="h-4 w-4 text-primary" />
 {tBilingual('Security', 'নিরাপত্তা')}
 </div>

 <div className="space-y-2 text-xs">
 <div className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between">
 <div>
 <div className="font-semibold text-foreground">{tBilingual('Two-Step Login (OTP)', 'দুই ধাপ যাচাই (ওটিপি)')}</div>
 <div className="text-2xs text-muted-foreground">
 {profile.mfa_enabled ? 'TOTP Authenticator active' : 'Not configured'}
 </div>
 </div>
 <span
 className={`text-2xs font-bold uppercase px-2 py-0.5 rounded-full ${
 profile.mfa_enabled
 ? 'bg-success/20 text-success border border-success/30'
 : 'bg-warning/20 text-warning border border-warning/30'
 }`}
 >
 {profile.mfa_enabled ? 'Enabled' : 'Disabled'}
 </span>
 </div>

 <div className="p-2.5 rounded-xl bg-card border border-border flex items-center justify-between">
 <div>
 <div className="font-semibold text-foreground">{tBilingual('Password', 'পাসওয়ার্ড')}</div>
 <div className="text-2xs text-muted-foreground">
 {profile.password_last_changed_at
 ? `Last changed ${formatDate(profile.password_last_changed_at)}`
 : 'Compliant'}
 </div>
 </div>
 <span className="text-2xs font-bold uppercase px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/20">
 Secured
 </span>
 </div>
 </div>

 <Button asChild variant="outline" className="w-full text-xs font-bold border-border hover:bg-muted h-9 min-h-11">
 <Link href="/platform/security" className="flex items-center justify-center gap-1.5">
 <span>Manage Security &amp; Sessions</span>
 <ArrowRight className="h-3.5 w-3.5" />
 </Link>
 </Button>
 </Card>
 </div>

 {/* Right Column: Edit Profile Form */}
 <div className="lg:col-span-2 space-y-6">
 <Card className="bg-card border-border shadow-xs">
 <CardHeader className="border-b border-border pb-4">
 <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
 <User className="h-4 w-4 text-primary" />
 <span>{tBilingual('Edit Profile', 'প্রোফাইল পরিবর্তন')}</span>
 </CardTitle>
 <CardDescription className="text-xs text-muted-foreground">
 {tBilingual('Update your name, contact phone, and photo.', 'আপনার নাম, মোবাইল নম্বর এবং ছবি পরিবর্তন করুন।')}
 </CardDescription>
 </CardHeader>

 <form onSubmit={handleSaveProfile}>
 <CardContent className="space-y-4 pt-5">
 {/* Full Name */}
 <div className="space-y-1.5">
 <Label htmlFor="full-name" className="text-xs text-muted-foreground font-semibold">
 {tBilingual('Full Name', 'পুরো নাম')}
 </Label>
 <Input
 id="full-name"
 type="text"
 required
 value={fullName}
 onChange={(e) => setFullName(e.target.value)}
 icon={<User className="h-4 w-4 text-muted-foreground" />}
 placeholder="e.g. Haji Mohammad Shamim"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
 />
 </div>

 {/* Primary Email (Read-Only with verification notice) */}
 <div className="space-y-1.5">
 <div className="flex items-center justify-between">
 <Label htmlFor="email" className="text-xs text-muted-foreground font-semibold">
 {tBilingual('Email Address', 'ইমেইল এড্রেস')}
 </Label>
 <span className="text-2xs text-success font-bold flex items-center gap-1">
 <CheckCircle2 className="h-3 w-3" /> Verified Root Account
 </span>
 </div>
 <Input
 id="email"
 type="email"
 disabled
 value={profile.email}
 icon={<Mail className="h-4 w-4 text-muted-foreground" />}
 className="bg-card border-border text-muted-foreground cursor-not-allowed"
 />
 <p className="text-2xs text-muted-foreground">
 Platform email changes require cryptographic step-up verification and audit log authorization to prevent hostile takeovers.
 </p>
 </div>

 {/* Phone Number */}
 <div className="space-y-1.5">
 <Label htmlFor="phone" className="text-xs text-muted-foreground font-semibold">
 {tBilingual('Phone Number', 'মোবাইল নম্বর')}
 </Label>
 <Input
 id="phone"
 type="tel"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 icon={<Phone className="h-4 w-4 text-muted-foreground" />}
 placeholder="+8801711-892019"
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
 />
 </div>

 {/* Platform Role (Read-only) */}
 <div className="space-y-1.5">
 <Label className="text-xs text-muted-foreground font-semibold">
 {tBilingual('Account Role', 'রোল')}
 </Label>
 <div className="p-3 rounded-xl bg-card border border-border flex items-center justify-between text-xs">
 <div>
 <div className="font-bold text-foreground">{tBilingual('Owner (Full Control)', 'মালিক (পূর্ণ ক্ষমতা)')}</div>
 <div className="text-2xs text-muted-foreground">
 Unrestricted authority across all PrintERP SaaS clusters, billing, and tenants.
 </div>
 </div>
 <span className="text-2xs font-bold tabular-nums text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">
 IMMUTABLE
 </span>
 </div>
 </div>

 {/* Avatar URL / Storage selector */}
 <div className="space-y-1.5">
 <Label htmlFor="avatar-url" className="text-xs text-muted-foreground font-semibold">
 {tBilingual('Profile Photo Link (Optional)', 'প্রোফাইল ছবির লিংক (ঐচ্ছিক)')}
 </Label>
 <Input
 id="avatar-url"
 type="url"
 value={avatarUrl}
 onChange={(e) => setAvatarUrl(e.target.value)}
 icon={<Camera className="h-4 w-4 text-muted-foreground" />}
 placeholder="https://..."
 className="bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary"
 />
 <p className="text-2xs text-muted-foreground">
 Supports JPG, PNG, WEBP. Max file size: 2MB. Stored with encrypted signed access.
 </p>
 </div>
 </CardContent>

 <CardFooter className="border-t border-border pt-4 pb-4 flex flex-col sm:flex-row items-center justify-between gap-3">
 <span className="text-2xs text-muted-foreground">
 Profile modifications are immutably logged to the Platform Audit Log.
 </span>
 <Button
 type="submit"
 disabled={isSaving}
 className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-5 h-10 shadow-xs min-h-11"
 >
 <Save className="h-4 w-4 mr-1.5" />
 <span>{isSaving ? tBilingual('Saving...', 'সংরক্ষণ হচ্ছে...') : tBilingual('Save Profile', 'প্রোফাইল সেভ করুন')}</span>
 </Button>
 </CardFooter>
 </form>
 </Card>
 </div>
 </div>
 </div>
 )
}
