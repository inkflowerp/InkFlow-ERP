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
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { platformLoginAction } from '@/actions/platform-auth.actions'

// --- InkFlow Premium Vector Logo ---
function InkFlowPlatformLogo({ className = '' }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 select-none group cursor-pointer ${className}`}>
      {/* Stylized iF Icon with Holographic Ambient Glow */}
      <div className="relative w-8 h-8 sm:w-9 sm:h-9 shrink-0">
        <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-30 blur-sm group-hover:opacity-60 transition-opacity duration-300" />
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-[0_4px_12px_rgba(99,102,241,0.35)]"
        >
          {/* 'i' needle stem - Cyan/Blue gradient */}
          <path
            d="M8 12.5C8 10.5 9.5 9 11.5 9L15 6L16.5 10.5V26.5C16.5 28.5 15 30 13 30H11.5C9.5 30 8 28.5 8 26.5V12.5Z"
            fill="url(#ink_cyan_blue)"
          />
          {/* 'i' base dot - Golden yellow */}
          <rect x="8" y="32" width="8.5" height="5.5" rx="1.5" fill="#FBBF24" />

          {/* 'F' top bar - Vivid Magenta/Purple gradient */}
          <path
            d="M20 9.5C20 8.1 21.1 7 22.5 7H36C37.4 7 38.5 8.1 38.5 9.5V13C38.5 14.4 37.4 15.5 36 15.5H24.5V19.5H33.5C34.9 19.5 36 20.6 36 22V25.5C36 26.9 34.9 28 33.5 28H24.5V36.5C24.5 37.9 23.4 39 22 39H20V9.5Z"
            fill="url(#ink_magenta_purple)"
          />

          <defs>
            <linearGradient id="ink_cyan_blue" x1="8" y1="6" x2="16.5" y2="30" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22D3EE" />
              <stop offset="1" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="ink_magenta_purple" x1="20" y1="7" x2="38.5" y2="39" gradientUnits="userSpaceOnUse">
              <stop stopColor="#EC4899" />
              <stop offset="0.5" stopColor="#A855F7" />
              <stop offset="1" stopColor="#6366F1" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-lg sm:text-xl font-black tracking-tight text-white leading-none">
            InkFlow
          </span>
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
            PLATFORM
          </span>
        </div>
        <div className="text-[8px] sm:text-[9px] tracking-[0.3em] font-bold text-slate-400 uppercase mt-0.5 leading-none">
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
      setError('Unauthorized: This account does not possess platform superadministrator credentials.')
    } else if (errParam === 'disabled') {
      setError('Access Denied: This platform account has been deactivated by root security policy.')
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
        setError(res.error || 'Authentication rejected. Verify your platform owner credentials.')
      }
    } catch (err: any) {
      if (!navigator.onLine || err?.message?.includes('network') || err?.message?.includes('fetch')) {
        setIsNetworkError(true)
        setError('Network connectivity failure. Unable to reach authentication gateway.')
      } else {
        setError(err?.message || 'A security protocol error occurred during platform login.')
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
    feat2Title: language === 'en' ? 'Tenant-isolated administration' : 'টেন্যান্ট-বিচ্ছিন্ন প্রশাসন',
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
    emailLabel: language === 'en' ? 'PLATFORM EMAIL' : 'প্ল্যাটফর্ম ইমেইল',
    emailPlaceholder: 'admin@inkflow.com.bd',
    passwordLabel: language === 'en' ? 'PASSWORD' : 'পাসওয়ার্ড',
    passwordPlaceholder: language === 'en' ? 'Enter your password' : 'পাসওয়ার্ড লিখুন',
    forgotPassword: language === 'en' ? 'Forgot password?' : 'পাসওয়ার্ড ভুলে গেছেন?',
    signInBtn: language === 'en' ? 'Sign in to Control Center' : 'কন্ট্রোল সেন্টারে সাইন ইন করুন',
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
    <div className="min-h-screen w-full bg-[#070913] text-slate-100 flex flex-col justify-between relative overflow-x-hidden font-sans selection:bg-purple-600 selection:text-white">
      {/* --- Atmospheric Lighting & Mesh Gradients --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Soft Radial Ambient Glows */}
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.16),transparent_70%)] blur-3xl" />
        <div className="absolute top-10 -right-20 w-[450px] h-[450px] bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.12),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-20 left-1/4 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.10),transparent_75%)] blur-3xl" />
      </div>

      {/* --- Top Navigation Bar --- */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-3 sm:pt-4 pb-2 flex items-center justify-between shrink-0">
        {/* Brand Logo */}
        <div>
          <InkFlowPlatformLogo />
        </div>

        {/* Right Header Area: Live Status Pill & Language Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Live Status indicator */}
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-[11px] text-slate-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>{t.systemStatus}</span>
          </div>

          {/* Language Switcher */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm focus:outline-none focus:ring-1 focus:ring-purple-500/50"
              aria-expanded={langMenuOpen}
              aria-label="Select Language"
            >
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              <span>{language === 'en' ? 'English' : 'বাংলা'}</span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-150 ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-32 rounded-xl bg-[#0e1224] border border-slate-800 shadow-2xl p-1 z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en')
                    setLangMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-colors font-medium cursor-pointer ${
                    language === 'en' ? 'bg-purple-600/20 text-purple-300' : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>English</span>
                  {language === 'en' && <Check className="h-3.5 w-3.5 text-purple-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('bn')
                    setLangMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs text-left transition-colors font-medium cursor-pointer ${
                    language === 'bn' ? 'bg-purple-600/20 text-purple-300' : 'text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <span>বাংলা</span>
                  {language === 'bn' && <Check className="h-3.5 w-3.5 text-purple-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- Main Content Grid --- */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3 sm:py-5 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 lg:gap-10 my-auto min-h-0">
        
        {/* LEFT COLUMN: Platform Introduction & Security Highlights (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:max-w-[480px] xl:max-w-[520px] flex-col justify-center space-y-4 xl:space-y-5 shrink-0">
          
          {/* Platform Administration Header & Accent Line */}
          <div>
            <div className="text-[10px] xl:text-[11px] font-bold tracking-[0.24em] text-slate-400 uppercase">
              {t.platformBadge}
            </div>
            <div className="w-9 h-[2.5px] rounded-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 mt-1.5" />
          </div>

          {/* Main Headline */}
          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight text-white leading-[1.15]">
              {t.headlineMain}
              <br />
              <span className="bg-gradient-to-r from-purple-400 via-indigo-400 to-blue-400 bg-clip-text text-transparent">
                {t.headlineSub}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              {t.heroDesc}
            </p>
          </div>

          {/* 3 Platform Security Features */}
          <div className="space-y-2.5 pt-1">
            {/* Feature 1: Platform-level access */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-800/50 flex items-center justify-center text-purple-400 shrink-0 shadow-sm mt-0.5">
                <Shield className="w-4 h-4 text-purple-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs xl:text-sm font-bold text-slate-200">{t.feat1Title}</div>
                <div className="text-[11px] xl:text-xs text-slate-400 leading-normal">{t.feat1Desc}</div>
              </div>
            </div>

            {/* Feature 2: Tenant-isolated administration */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-blue-950/70 border border-blue-800/50 flex items-center justify-center text-blue-400 shrink-0 shadow-sm mt-0.5">
                <Database className="w-4 h-4 text-blue-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs xl:text-sm font-bold text-slate-200">{t.feat2Title}</div>
                <div className="text-[11px] xl:text-xs text-slate-400 leading-normal">{t.feat2Desc}</div>
              </div>
            </div>

            {/* Feature 3: Secure authenticated session */}
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-900/40 border border-slate-800/60">
              <div className="w-8 h-8 rounded-lg bg-emerald-950/70 border border-emerald-800/50 flex items-center justify-center text-emerald-400 shrink-0 shadow-sm mt-0.5">
                <Lock className="w-4 h-4 text-emerald-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs xl:text-sm font-bold text-slate-200">{t.feat3Title}</div>
                <div className="text-[11px] xl:text-xs text-slate-400 leading-normal">{t.feat3Desc}</div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Premium Authentication Card */}
        <div className="w-full max-w-[420px] flex justify-center shrink-0">
          <div className="w-full bg-[#0C1021]/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-indigo-950/40 relative z-20">
            
            {/* Card Header Icon & Headings */}
            <div className="text-center space-y-1 mb-4">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-b from-indigo-500/25 to-purple-600/25 border border-purple-500/40 text-indigo-300 shadow-lg shadow-purple-950/40 mb-1">
                <Shield className="w-5 h-5 text-indigo-300" />
              </div>

              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                  {t.cardTitle}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  {requiresMfa ? t.mfaDesc : t.cardSubtitle}
                </p>
                <p className="text-[10px] text-slate-400">
                  {t.cardNotice}
                </p>
              </div>
            </div>

            {/* Error Alert Box */}
            {error && (
              <div className="mb-3 rounded-xl bg-red-950/60 p-2.5 text-xs text-red-200 border border-red-800/80 flex items-start gap-2 animate-in fade-in-50 duration-150">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span>{error}</span>
                  {isNetworkError && (
                    <div className="mt-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => executeSignIn()}
                        className="text-[10px] h-6 border-red-700 bg-red-900/40 text-white hover:bg-red-900 px-2"
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
                  <div className="p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-800/50 text-xs text-indigo-200 flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-indigo-400 shrink-0" />
                    <span className="truncate text-xs">
                      Signing in: <strong className="text-white font-mono">{email}</strong>
                    </span>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="platform-mfa" className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
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
                        className="w-full bg-[#070A16]/90 border border-slate-700/60 text-white placeholder:text-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 font-mono tracking-widest text-center text-base sm:text-lg h-10 sm:h-11 rounded-xl outline-none"
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
                      className="text-xs text-slate-400 hover:text-white flex items-center gap-1 min-h-[32px] cursor-pointer"
                    >
                      <ChevronLeft className="h-3.5 w-3.5" />
                      <span>{t.mfaBack}</span>
                    </button>

                    <Button
                      type="submit"
                      disabled={isLoading || mfaCode.length !== 6}
                      className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-semibold text-xs py-1.5 h-9 px-4 shadow-lg shadow-purple-900/40 rounded-xl cursor-pointer"
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
                      className="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
                    >
                      {t.emailLabel}
                    </Label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-slate-400">
                        <Mail className="h-4 w-4" />
                      </div>
                      <input
                        id="platform-email"
                        type="email"
                        required
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        className="w-full bg-[#070A16]/90 border border-slate-700/60 hover:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-[13px] text-white placeholder:text-slate-600 transition-all outline-none"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label
                        htmlFor="platform-password"
                        className="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
                      >
                        {t.passwordLabel}
                      </Label>
                      <Link
                        href="/platform/forgot-password"
                        className="text-[10px] sm:text-[11px] text-purple-400 hover:text-purple-300 font-medium transition-colors hover:underline"
                      >
                        {t.forgotPassword}
                      </Link>
                    </div>
                    <div className="relative flex items-center">
                      <div className="absolute left-3 pointer-events-none text-slate-400">
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
                        className="w-full bg-[#070A16]/90 border border-slate-700/60 hover:border-slate-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/30 rounded-xl pl-9 pr-9 py-2 text-xs sm:text-[13px] text-white placeholder:text-slate-600 transition-all outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Sign In Submit Button */}
                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99] text-white font-bold text-xs sm:text-[13px] py-2.5 px-4 rounded-xl shadow-lg shadow-purple-900/40 hover:shadow-purple-900/60 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[40px] sm:min-h-[42px]"
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
                    <div className="w-full border-t border-slate-800/80" />
                    <span className="bg-[#0C1021] px-2 text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                      {t.orDivider}
                    </span>
                    <div className="w-full border-t border-slate-800/80" />
                  </div>

                  {/* Business Login Alternative */}
                  <div className="text-center text-[11px] text-slate-400">
                    {t.lookingForBusiness}{' '}
                    <Link
                      href="/login"
                      className="text-purple-400 hover:text-purple-300 font-semibold transition-colors hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>{t.goToBusinessLogin}</span>
                      <ArrowRight className="w-3 h-3 ml-0.5" />
                    </Link>
                  </div>

                  {/* Secure Access Information Box */}
                  <div className="mt-2.5 p-2.5 rounded-xl bg-[#070A14]/90 border border-slate-800/80 text-[10px] text-slate-400 flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-md bg-indigo-950/60 border border-indigo-800/40 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                      <Shield className="h-2.5 w-2.5 text-indigo-400" />
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-300 tracking-wider uppercase text-[9px]">
                        {t.secureNoticeTitle}
                      </div>
                      <div className="leading-relaxed text-slate-400 text-[10px]">
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
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-2.5 sm:py-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-slate-500 border-t border-slate-800/50 shrink-0">
        {/* Platform Motto */}
        <div className="tracking-[0.22em] font-semibold uppercase text-slate-400 flex items-center gap-1.5 text-[9px]">
          <span>PRINT</span>
          <span className="text-purple-500 font-normal">›</span>
          <span>PEOPLE</span>
          <span className="text-purple-500 font-normal">›</span>
          <span>PROCESS</span>
          <span className="text-purple-500 font-normal">›</span>
          <span>PROFIT</span>
        </div>

        {/* Legal & Support Links */}
        <div className="flex items-center gap-3 text-slate-500">
          <Link href="/privacy" className="hover:text-slate-300 transition-colors">
            Privacy
          </Link>
          <span>|</span>
          <Link href="/terms" className="hover:text-slate-300 transition-colors">
            Terms
          </Link>
          <span>|</span>
          <Link href="/platform/support" className="hover:text-slate-300 transition-colors">
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
        <div className="min-h-screen bg-[#070913] flex items-center justify-center text-slate-400">
          Loading InkFlow platform console...
        </div>
      }
    >
      <PlatformLoginForm />
    </Suspense>
  )
}
