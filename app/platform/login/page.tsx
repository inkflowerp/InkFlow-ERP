'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
 Shield,
 Lock,
 Mail,
 ShieldAlert,
 Eye,
 EyeOff,
 RefreshCw,
 KeyRound,
 ChevronLeft,
 ArrowRight,
 Globe,
 Check,
 ChevronDown,
 Database,
 Terminal,
 CheckCircle2,
 ExternalLink,
 Server,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { platformLoginAction } from '@/actions/platform-auth.actions'

// --- InkFlow Premium Vector Logo ---
function InkFlowPlatformLogo({ className = '' }: { className?: string }) {
 return (
 <Link href="/" className={`inline-flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
 <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs shrink-0">
 <Server className="h-4 w-4 sm:h-5 sm:w-5" />
 </div>
 <div className="flex flex-col">
 <div className="flex items-center gap-1.5">
 <span className="text-lg sm:text-xl font-black tracking-tight text-foreground leading-none">
 InkFlow
 </span>
 <span className="text-2xs font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
 PLATFORM
 </span>
 </div>
 <div className="text-2xs sm:text-2xs tracking-[0.3em] font-bold text-muted-foreground uppercase mt-0.5 leading-none">
 CONTROL CENTER
 </div>
 </div>
 </Link>
 )
}

function PlatformLoginForm() {
 const [email, setEmail] = useState('')
 const [password, setPassword] = useState('')
 const [mfaCode, setMfaCode] = useState('')
 const [requiresMfa, setRequiresMfa] = useState(false)
 const [error, setError] = useState<string | null>(null)
 const [isNetworkError, setIsNetworkError] = useState(false)
 const [isLoading, setIsLoading] = useState(false)
 const [showPassword, setShowPassword] = useState(false)
 const [language, setLanguage] = useState<'en' | 'bn'>('en')
 const [langMenuOpen, setLangMenuOpen] = useState(false)

 const router = useRouter()
 const searchParams = useSearchParams()

 useEffect(() => {
 const errParam = searchParams.get('error')
 if (errParam === 'unauthorized') {
 setError(language === 'en' ? 'You do not have access to the owner panel.' : 'আপনার এই প্যানেলে প্রবেশের অনুমতি নেই।')
 } else if (errParam === 'disabled') {
 setError(language === 'en' ? 'This account has been stopped. Contact support.' : 'এই অ্যাকাউন্ট বন্ধ করা হয়েছে। সাপোর্টে কথা বলুন।')
 }
 }, [searchParams])

 const executeSignIn = async (e?: React.FormEvent) => {
 if (e) e.preventDefault()
 if (isLoading) return

 setIsLoading(true)
 setError(null)
 setIsNetworkError(false)

 const redirectTo = searchParams.get('redirectTo') || '/platform'
 const formData = new FormData()
 formData.append('email', email.trim())
 formData.append('password', password)
 formData.append('redirectTo', redirectTo)
 if (mfaCode) {
 formData.append('mfaCode', mfaCode.trim())
 }

 try {
 const res = await platformLoginAction(formData)

 if (res.success && res.redirectUrl) {
 window.location.href = res.redirectUrl
 } else if (res.requiresMfa || res.mfaRequired) {
 setRequiresMfa(true)
 setError(res.error || null)
 } else {
 setError(res.error || (language === 'en' ? 'Wrong email or password. Please try again.' : 'ভুল ইমেইল বা পাসওয়ার্ড। আবার চেষ্টা করুন।'))
 }
 } catch (err: any) {
 if (!navigator.onLine || err?.message?.includes('network') || err?.message?.includes('fetch')) {
 setIsNetworkError(true)
 setError(language === 'en' ? 'Internet problem. Check connection and try again.' : 'ইন্টারনেট সমস্যা। সংযোগ পরীক্ষা করে আবার চেষ্টা করুন।')
 } else {
 setError(err?.message || (language === 'en' ? 'Could not sign in. Please try again.' : 'সাইন ইন করা যায়নি। আবার চেষ্টা করুন।'))
 }
 } finally {
 setIsLoading(false)
 }
 }

 // Bilingual strings
 const t = {
 platformBadge: language === 'en' ? 'PLATFORM ADMINISTRATION' : 'প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেশন',
 headlineMain: language === 'en' ? 'Operate InkFlow.' : 'ইঙ্কফ্লো পরিচালনা করুন।',
 headlineSub: language === 'en' ? 'Securely.' : 'সম্পূর্ণ নিরাপদে।',
 heroDesc:
 language === 'en'
 ? 'Manage the InkFlow platform, tenants, users, and system operations from one secure control center.'
 : 'একটি নিরাপদ কন্ট্রোল সেন্টার থেকে ইঙ্কফ্লো প্ল্যাটফর্ম, টেন্যান্ট, ইউজার এবং সিস্টেম পরিচালনা করুন।',
 systemStatus: language === 'en' ? 'Core Fleet Operational' : 'কোর সিস্টেম সচল',
 
 // Features
 feat1Title: language === 'en' ? 'Platform-level access' : 'প্ল্যাটফর্ম-স্তরের অ্যাক্সেস',
 feat1Desc:
 language === 'en'
 ? 'Built for authorized administrators only.'
 : 'শুধুমাত্র অনুমোদিত অ্যাডমিনিস্ট্রেটরদের জন্য নির্মিত।',
 feat2Title: language === 'en' ? 'Separate client accounts' : 'আলাদা ক্লায়েন্ট অ্যাকাউন্ট',
 feat2Desc:
 language === 'en'
 ? 'Keep every business separate and secure.'
 : 'প্রতিটি ব্যবসা আলাদা ও সুরক্ষিত রাখুন।',
 feat3Title: language === 'en' ? 'Secure authenticated session' : 'নিরাপদ প্রমাণিত সেশন',
 feat3Desc:
 language === 'en'
 ? 'Your data and actions are always protected.'
 : 'আপনার ডেটা ও কার্যক্রম সর্বদা সুরক্ষিত।',

 // Card Strings
 cardTitle: language === 'en' ? 'Platform Owner' : 'প্ল্যাটফর্ম ওনার',
 cardSubtitle:
 language === 'en'
 ? 'Sign in to your InkFlow control center.'
 : 'আপনার ইঙ্কফ্লো কন্ট্রোল সেন্টারে সাইন ইন করুন।',
 cardNotice:
 language === 'en'
 ? 'Authorized platform administrators only.'
 : 'শুধুমাত্র অনুমোদিত প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেটরদের জন্য।',
 emailLabel: language === 'en' ? 'EMAIL, USERNAME OR MOBILE' : 'ইমেইল, ইউজারনেম বা মোবাইল',
 emailPlaceholder: language === 'en' ? 'admin@inkflow.com.bd, username, or 017...' : 'admin@inkflow.com.bd, ইউজারনেম বা ০১...',
 passwordLabel: language === 'en' ? 'PASSWORD' : 'পাসওয়ার্ড',
 passwordPlaceholder: language === 'en' ? 'Enter your password' : 'পাসওয়ার্ড লিখুন',
 forgotPassword: language === 'en' ? 'Forgot password?' : 'পাসওয়ার্ড ভুলে গেছেন?',
 signInBtn: language === 'en' ? 'Sign In' : 'লগইন করুন',
 signingInBtn: language === 'en' ? 'Signing in...' : 'সাইন ইন হচ্ছে...',
 orDivider: language === 'en' ? 'OR' : 'অথবা',
 lookingForBusiness: language === 'en' ? 'Looking for your business ERP?' : 'আপনার ব্যবসায়িক ERP খুঁজছেন?',
 goToBusinessLogin: language === 'en' ? 'Go to Business Login' : 'বিজনেস লগইনে যান',
 
 // MFA Strings
 mfaTitle: language === 'en' ? 'Two-Factor Verification' : 'টু-ফ্যাক্টর ভেরিফিকেশন',
 mfaDesc:
 language === 'en'
 ? 'Enter the 6-digit authentication token.'
 : 'আপনার ৬-ডিজিটের প্রমাণীকরণ টোকেনটি লিখুন।',
 mfaLabel: language === 'en' ? '6-DIGIT AUTHENTICATOR CODE' : '৬-সংখ্যার প্রমাণীকরণ কোড',
 mfaSubmit: language === 'en' ? 'Verify & Sign In' : 'যাচাই করে প্রবেশ করুন',
 mfaBack: language === 'en' ? 'Back' : 'পেছনে যান',

 // Secure Access Box
 secureNoticeTitle: language === 'en' ? 'SECURE ACCESS' : 'সুরক্ষিত অ্যাক্সেস',
 secureNoticeText:
 language === 'en'
 ? 'This area is restricted to authorized InkFlow platform administrators. Your session is protected by secure authentication and platform-level authorization.'
 : 'এই বিভাগটি শুধুমাত্র অনুমোদিত ইঙ্কফ্লো প্ল্যাটফর্ম অ্যাডমিনিস্ট্রেটরদের জন্য সংরক্ষিত। আপনার সেশনটি নিরাপদ প্রমাণীকরণ দ্বারা সুরক্ষিত।',
 }

 return (
 <div className="min-h-screen w-full bg-background text-foreground flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-primary selection:text-primary-foreground">
 {/* --- Top Navigation Bar --- */}
 <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-3 sm:pt-4 pb-2 flex items-center justify-between shrink-0">
 <div>
 <InkFlowPlatformLogo />
 </div>

 <div className="flex items-center gap-2 sm:gap-3">
 <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border text-2xs text-muted-foreground">
 <span className="relative flex h-2 w-2">
 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
 <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
 </span>
 <span>{t.systemStatus}</span>
 </div>

 <div className="relative">
 <button
 type="button"
 onClick={() => setLangMenuOpen(!langMenuOpen)}
 className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card hover:bg-muted border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all cursor-pointer shadow-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
 aria-expanded={langMenuOpen}
 aria-label="Select Language"
 >
 <Globe className="h-3.5 w-3.5 text-muted-foreground" />
 <span>{language === 'en' ? 'English' : 'বাংলা'}</span>
 <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform duration-150 ${langMenuOpen ? 'rotate-180' : ''}`} />
 </button>

 {langMenuOpen && (
 <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-popover border border-border shadow-xs p-1 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
 <button
 type="button"
 onClick={() => {
 setLanguage('en')
 setLangMenuOpen(false)
 }}
 className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-colors font-medium cursor-pointer ${
 language === 'en' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
 }`}
 >
 <span>English</span>
 {language === 'en' && <Check className="h-3.5 w-3.5 text-primary" />}
 </button>
 <button
 type="button"
 onClick={() => {
 setLanguage('bn')
 setLangMenuOpen(false)
 }}
 className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-colors font-medium cursor-pointer ${
 language === 'bn' ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
 }`}
 >
 <span>বাংলা</span>
 {language === 'bn' && <Check className="h-3.5 w-3.5 text-primary" />}
 </button>
 </div>
 )}
 </div>
 </div>
 </header>

 {/* --- Main Content Grid --- */}
 <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3 sm:py-5 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 lg:gap-10 my-auto min-h-0">
 
 {/* LEFT COLUMN: Platform Introduction & Security Highlights (Desktop Only) */}
 <div className="hidden lg:flex w-full lg:max-w-lg xl:max-w-xl flex-col justify-center space-y-4 xl:space-y-5 shrink-0">
 
 {/* Platform Administration Header & Accent Line */}
 <div>
 <div className="text-2xs xl:text-2xs font-bold tracking-[0.24em] text-muted-foreground uppercase">
 {t.platformBadge}
 </div>
 <div className="w-9 h-1 rounded-full bg-primary" />
 </div>

 {/* Main Headline */}
 <div className="space-y-1.5">
 <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-foreground leading-[1.15]">
 {t.headlineMain}
 <br />
 <span className="text-primary">
 {t.headlineSub}
 </span>
 </h1>
 <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-md">
 {t.heroDesc}
 </p>
 </div>

 {/* 3 Platform Security Features */}
 <div className="space-y-2.5 pt-1">
 {/* Feature 1: Platform-level access */}
 <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border">
 <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm mt-0.5">
 <Shield className="w-4 h-4 text-primary" />
 </div>
 <div className="space-y-0.5">
 <div className="text-xs xl:text-sm font-bold text-foreground">{t.feat1Title}</div>
 <div className="text-2xs xl:text-xs text-muted-foreground leading-normal">{t.feat1Desc}</div>
 </div>
 </div>

 {/* Feature 2: Tenant-isolated administration */}
 <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border">
 <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-sm mt-0.5">
 <Database className="w-4 h-4 text-primary" />
 </div>
 <div className="space-y-0.5">
 <div className="text-xs xl:text-sm font-bold text-foreground">{t.feat2Title}</div>
 <div className="text-2xs xl:text-xs text-muted-foreground leading-normal">{t.feat2Desc}</div>
 </div>
 </div>

 {/* Feature 3: Secure authenticated session */}
 <div className="flex items-start gap-3 p-2.5 rounded-xl bg-card border border-border">
 <div className="w-8 h-8 rounded-lg bg-success-surface border border-success/30 flex items-center justify-center text-success shrink-0 shadow-sm mt-0.5">
 <Lock className="w-4 h-4 text-success" />
 </div>
 <div className="space-y-0.5">
 <div className="text-xs xl:text-sm font-bold text-foreground">{t.feat3Title}</div>
 <div className="text-2xs xl:text-xs text-muted-foreground leading-normal">{t.feat3Desc}</div>
 </div>
 </div>
 </div>
 </div>

 {/* RIGHT COLUMN: Premium Authentication Card */}
 <div className="w-full max-max-w-md flex justify-center shrink-0">
 <div className="w-full bg-card/95 backdrop-blur-2xl border border-border rounded-2xl p-5 sm:p-6 shadow-xs relative z-20">
 
 {/* Card Header Icon & Headings */}
 <div className="text-center space-y-1 mb-4">
 <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-card border border-primary/20 text-primary shadow-xs mb-1">
 <Shield className="w-5 h-5 text-primary" />
 </div>

 <div>
 <h2 className="text-xl sm:text-2xl font-black tracking-tight text-foreground leading-tight">
 {t.cardTitle}
 </h2>
 <p className="text-xs text-muted-foreground mt-0.5">
 {requiresMfa ? t.mfaDesc : t.cardSubtitle}
 </p>
 <p className="text-2xs text-muted-foreground">
 {t.cardNotice}
 </p>
 </div>
 </div>

 {/* Error Alert Box */}
 {error && (
 <div className="mb-3 rounded-xl bg-destructive/10 p-2.5 text-xs text-destructive border border-destructive/30 flex items-start gap-2 animate-in fade-in-50 duration-150">
 <ShieldAlert className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
 <div className="flex-1">
 <span>{error}</span>
 {isNetworkError && (
 <div className="mt-1.5">
 <Button
 type="button"
 variant="outline"
 size="sm"
 onClick={() => executeSignIn()}
 className="text-2xs h-6 border-destructive/30 bg-destructive/10 text-foreground hover:bg-destructive/90 px-2"
 >
 <RefreshCw className="h-3 w-3 mr-1" />
 Try Again
 </Button>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Authentication Form */}
 <form onSubmit={executeSignIn} noValidate className="space-y-3">
 {requiresMfa ? (
 /* Two-Factor Authentication (MFA) Mode */
 <div className="space-y-3 animate-in fade-in-50 duration-200">
 <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary flex items-center gap-2">
 <KeyRound className="h-4 w-4 text-primary shrink-0" />
 <span className="truncate text-xs">
 Signing in: <strong className="text-foreground tabular-nums">{email}</strong>
 </span>
 </div>

 <div className="space-y-1">
 <Label htmlFor="platform-mfa" className="text-2xs font-bold tracking-wider text-muted-foreground uppercase">
 {t.mfaLabel}
 </Label>
 <div className="relative">
 <input
 id="platform-mfa"
 type="text"
 inputMode="numeric"
 pattern="[0-9]*"
 maxLength={6}
 autoFocus
 required
 autoComplete="one-time-code"
 value={mfaCode}
 onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
 placeholder="123456"
 className="w-full bg-background/90 border border-border text-foreground placeholder:text-muted-foreground focus:border-primary/20 focus:ring-2 focus:ring-primary/30 tabular-nums tracking-widest text-center text-base sm:text-lg h-10 sm:h-11 rounded-xl outline-none"
 />
 </div>
 </div>

 <div className="flex items-center justify-between gap-2 pt-1">
 <button
 type="button"
 onClick={() => {
 setRequiresMfa(false)
 setError(null)
 }}
 className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 min-h-8 cursor-pointer"
 >
 <ChevronLeft className="h-3.5 w-3.5" />
 <span>{t.mfaBack}</span>
 </button>

 <Button
 type="submit"
 disabled={isLoading || mfaCode.length !== 6}
 className="bg-primary hover:bg-primary/90 text-primary-foreground"
 >
 {isLoading ? 'Verifying...' : t.mfaSubmit}
 </Button>
 </div>
 </div>
 ) : (
 /* Standard Credentials Mode */
 <>
 {/* Platform Email Field */}
 <div className="space-y-1">
 <Label
 htmlFor="platform-email"
 className="text-2xs font-bold tracking-wider text-muted-foreground uppercase"
 >
 {t.emailLabel}
 </Label>
 <div className="relative flex items-center">
 <div className="absolute left-3 pointer-events-none text-muted-foreground">
 <Mail className="h-4 w-4" />
 </div>
 <input
 id="platform-email"
 type="text"
 required
 autoComplete="username"
 autoCapitalize="none"
 autoCorrect="off"
 spellCheck={false}
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder={t.emailPlaceholder}
 className="w-full bg-background/90 border border-border hover:border-border focus:border-primary/20 focus:ring-2 focus:ring-primary/30 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all outline-none"
 />
 </div>
 </div>

 {/* Password Field */}
 <div className="space-y-1">
 <Label
 htmlFor="platform-password"
 className="text-2xs font-bold tracking-wider text-muted-foreground uppercase"
 >
 {t.passwordLabel}
 </Label>
 <div className="relative flex items-center">
 <div className="absolute left-3 pointer-events-none text-muted-foreground">
 <Lock className="h-4 w-4" />
 </div>
 <input
 id="platform-password"
 type={showPassword ? 'text' : 'password'}
 required
 autoComplete="current-password"
 autoCapitalize="none"
 autoCorrect="off"
 spellCheck={false}
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 placeholder={t.passwordPlaceholder}
 className="w-full bg-background/90 border border-border hover:border-border focus:border-primary/20 focus:ring-2 focus:ring-primary/30 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground transition-all outline-none"
 />
 <button
 type="button"
 onClick={() => setShowPassword(!showPassword)}
 className="absolute right-2.5 p-1 text-muted-foreground hover:text-foreground transition-colors focus:outline-none cursor-pointer"
 aria-label={showPassword ? 'Hide password' : 'Show password'}
 >
 {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
 </button>
 </div>
 </div>

 {/* Forgot Password Link Below Password Field */}
 <div className="flex justify-end pt-0.5">
 <Link
 href="/platform/forgot-password"
 className="text-2xs sm:text-2xs text-primary hover:text-primary font-medium transition-colors hover:underline"
 >
 {t.forgotPassword}
 </Link>
 </div>

 {/* Sign In Submit Button */}
 <div className="pt-1">
 <button
 type="submit"
 disabled={isLoading}
 className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
 >
 {isLoading ? (
 <>
 <RefreshCw className="h-4 w-4 animate-spin" />
 <span>{t.signingInBtn}</span>
 </>
 ) : (
 <>
 <span>{t.signInBtn}</span>
 <ArrowRight className="h-4 w-4" />
 </>
 )}
 </button>
 </div>

 {/* Divider */}
 <div className="relative flex items-center justify-center py-0.5">
 <div className="w-full border-t border-border" />
 <span className="bg-card px-2 text-2xs font-bold tracking-wider text-muted-foreground uppercase">
 {t.orDivider}
 </span>
 <div className="w-full border-t border-border" />
 </div>

 {/* Business Login Alternative */}
 <div className="text-center text-2xs text-muted-foreground">
 {t.lookingForBusiness}{' '}
 <Link
 href="/login"
 className="text-primary hover:text-primary font-semibold transition-colors hover:underline inline-flex items-center gap-0.5"
 >
 <span>{t.goToBusinessLogin}</span>
 <ArrowRight className="w-3 h-3 ml-0.5" />
 </Link>
 </div>

 {/* Secure Access Information Box */}
 <div className="mt-2.5 p-2.5 rounded-xl bg-background/90 border border-border text-2xs text-muted-foreground flex items-start gap-2.5">
 <div className="w-4 h-4 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0 mt-0.5">
 <Shield className="h-2.5 w-2.5 text-primary" />
 </div>
 <div className="space-y-0.5">
 <div className="font-bold text-muted-foreground tracking-wider uppercase text-2xs">
 {t.secureNoticeTitle}
 </div>
 <div className="leading-relaxed text-muted-foreground text-2xs">
 {t.secureNoticeText}
 </div>
 </div>
 </div>
 </>
 )}
 </form>
 </div>
 </div>

 </main>

 {/* --- Footer Area --- */}
 <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-2xs text-muted-foreground border-t border-border shrink-0">
 {/* Platform Motto */}
 <div className="tracking-[0.22em] font-semibold uppercase text-muted-foreground flex items-center gap-1.5 text-2xs">
 <span>PRINT</span>
 <span className="text-primary font-normal">›</span>
 <span>PEOPLE</span>
 <span className="text-primary font-normal">›</span>
 <span>PROCESS</span>
 <span className="text-primary font-normal">›</span>
 <span>PROFIT</span>
 </div>

 {/* Legal & Support Links */}
 <div className="flex items-center gap-3 text-muted-foreground">
 <Link href="/privacy" className="hover:text-muted-foreground transition-colors">
 Privacy
 </Link>
 <span>|</span>
 <Link href="/terms" className="hover:text-muted-foreground transition-colors">
 Terms
 </Link>
 <span>|</span>
 <Link href="/platform/support" className="hover:text-muted-foreground transition-colors">
 Support
 </Link>
 </div>
 </footer>
 </div>
 )
}

export default function PlatformLoginPage() {
 return (
 <Suspense
 fallback={
 <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
 Loading InkFlow platform console...
 </div>
 }
 >
 <PlatformLoginForm />
 </Suspense>
 )
}
