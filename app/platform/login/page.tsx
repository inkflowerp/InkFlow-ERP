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
  Activity,
  Layers,
  Database,
  Terminal,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { platformLoginAction } from '@/actions/platform-auth.actions'

// --- InkFlow Premium Vector Logo Component ---
function InkFlowPlatformLogo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Stylized iF Icon with Holographic Glow */}
      <div className="relative w-9 h-9 sm:w-10 sm:h-10 shrink-0 group">
        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-40 blur-md group-hover:opacity-75 transition-opacity duration-300" />
        <svg
          viewBox="0 0 44 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="relative w-full h-full drop-shadow-[0_4px_16px_rgba(99,102,241,0.4)]"
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
          <span className="text-xl sm:text-2xl font-black tracking-tight text-white leading-none">
            InkFlow
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
            HQ
          </span>
        </div>
        <div className="text-[9px] sm:text-[10px] tracking-[0.32em] font-bold text-slate-400 uppercase mt-0.5 leading-none">
          PLATFORM CORE
        </div>
      </div>
    </div>
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

  // Internationalized content dictionary
  const t = {
    platformBadge: language === 'en' ? 'PLATFORM OWNER CONTROL SUITE' : 'প্ল্যাটফর্ম ওনার কন্ট্রোল স্যুট',
    headlineMain: language === 'en' ? 'Command Infrastructure.' : 'ইনফ্রাস্ট্রাকচার নিয়ন্ত্রণ করুন।',
    headlineSub: language === 'en' ? 'Resilient & Protected.' : 'নিরাপদ ও সুরক্ষিত।',
    heroDesc:
      language === 'en'
        ? 'Centralized operations, tenant federation, security auditing, and runtime governance for the InkFlow Enterprise print network.'
        : 'ইঙ্কফ্লো এন্টারপ্রাইজ প্রিন্ট নেটওয়ার্কের জন্য কেন্দ্রীয় অপারেশন, টেন্যান্ট নিয়ন্ত্রণ, সুরক্ষা অডিট এবং রানটাইম পরিচালনা।',
    systemStatus: language === 'en' ? 'All Core Services Operational' : 'সকল কোর সার্ভিস সচল রয়েছে',
    uptime: language === 'en' ? '99.99% Uptime' : '৯৯.৯৯% আপটাইম',
    
    // Features
    feat1Title: language === 'en' ? 'Cryptographic Tenant Isolation' : 'ক্রিপ্টোগ্রাফিক টেন্যান্ট সেপারেশন',
    feat1Desc:
      language === 'en'
        ? 'Kernel-enforced Row-Level Security ensures zero cross-tenant leakage.'
        : 'কার্নেল-লেভেল রো-লেভেল সিকিউরিটি নিশ্চিত করে শূন্য ডেটা লিক।',
    feat2Title: language === 'en' ? 'Zero-Trust Protocol & 2FA' : 'জিরো-ট্রাস্ট প্রোটোকল ও টু-ফ্যাক্টর',
    feat2Desc:
      language === 'en'
        ? 'Hardware tokens and encrypted TOTP challenges for platform operators.'
        : 'প্ল্যাটফর্ম অপারেটরদের জন্য হার্ডওয়্যার টোকেন ও এনক্রিপ্টেড TOTP নিরাপত্তা।',
    feat3Title: language === 'en' ? 'Immutable Audit Fleet' : 'অপরিবর্তনীয় অডিট লগিং',
    feat3Desc:
      language === 'en'
        ? 'Real-time telemetry and forensic tamper-proof audit trails on all actions.'
        : 'প্রতিটি পদক্ষেপে রিয়েল-টাইম টেলিমেট্রি এবং পরিবর্তন-অযোগ্য অডিট ট্রেল।',

    // Card Strings
    cardTitle: language === 'en' ? 'Platform Owner' : 'প্ল্যাটফর্ম ওনার',
    cardSubtitle:
      language === 'en'
        ? 'Sign in to access root administrative control.'
        : 'রুট অ্যাডমিনিস্ট্রেটিভ নিয়ন্ত্রণে সাইন ইন করুন।',
    cardBadge: language === 'en' ? 'ROOT ACCESS' : 'রুট অ্যাক্সেস',
    emailLabel: language === 'en' ? 'OPERATOR EMAIL' : 'অপারেটর ইমেইল',
    emailPlaceholder: 'owner@inkflow.com.bd',
    passwordLabel: language === 'en' ? 'SECURITY KEY / PASSWORD' : 'সিকিউরিটি কি / পাসওয়ার্ড',
    passwordPlaceholder: language === 'en' ? 'Enter platform master key' : 'প্ল্যাটফর্ম মাস্টার কি লিখুন',
    forgotPassword: language === 'en' ? 'Reset key?' : 'কি রিসেট?',
    signInBtn: language === 'en' ? 'Authenticate & Enter' : 'অথেনটিকেশন ও প্রবেশ',
    signingInBtn: language === 'en' ? 'Authenticating...' : 'যাচাই করা হচ্ছে...',
    orDivider: language === 'en' ? 'OR' : 'অথবা',
    lookingForBusiness: language === 'en' ? 'Looking for a printing shop ERP?' : 'প্রিন্টিং ব্যবসার ERP খুঁজছেন?',
    goToBusinessLogin: language === 'en' ? 'Open Tenant Login' : 'টেন্যান্ট লগইনে যান',
    
    // MFA Strings
    mfaTitle: language === 'en' ? 'Two-Factor Challenge' : 'টু-ফ্যাক্টর চ্যালেঞ্জ',
    mfaDesc:
      language === 'en'
        ? 'Enter the 6-digit verification code from your authenticator app.'
        : 'আপনার প্রমাণীকরণ অ্যাপ থেকে ৬-ডিজিটের কোডটি লিখুন।',
    mfaLabel: language === 'en' ? '6-DIGIT TOTP TOKEN' : '৬-সংখ্যার TOTP টোকেন',
    mfaSubmit: language === 'en' ? 'Verify & Continue' : 'যাচাই করে এগিয়ে যান',
    mfaBack: language === 'en' ? 'Back' : 'পেছনে যান',

    // Bottom Secure Box
    secureNoticeTitle: language === 'en' ? 'ENCRYPTED ENVIRONMENT' : 'এনক্রিপ্টেড এনভায়রনমেন্ট',
    secureNoticeText:
      language === 'en'
        ? 'Platform sessions are continuously monitored and cryptographically signed. Unauthorized attempts are logged and reported.'
        : 'প্ল্যাটফর্ম সেশন সার্বক্ষণিক পর্যবেক্ষণ ও সাইন করা হয়। অননুমোদিত অ্যাক্সেস প্রচেষ্টা স্বয়ংক্রিয়ভাবে অডিট লগে সংরক্ষিত হয়।',
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen w-full bg-[#050711] text-slate-100 flex flex-col justify-between relative overflow-x-hidden lg:overflow-hidden font-sans selection:bg-indigo-600 selection:text-white">
      {/* --- Cosmic Grid & Atmospheric Light Canvas --- */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Subtle Tech Grid lines */}
        <div 
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #6366f1 1px, transparent 0)`,
            backgroundSize: '32px 32px'
          }}
        />
        
        {/* Glowing Neon Orbs */}
        <div className="absolute -top-40 -left-40 w-[650px] h-[650px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.18),transparent_70%)] blur-3xl animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-1/4 -right-32 w-[550px] h-[550px] bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15),transparent_70%)] blur-3xl" />
        <div className="absolute -bottom-32 left-1/3 w-[600px] h-[500px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.1),transparent_75%)] blur-3xl" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-[#03040a] to-transparent pointer-events-none" />
      </div>

      {/* --- Top Header Navigation Bar --- */}
      <header className="relative z-30 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 pt-4 sm:pt-6 pb-2 flex items-center justify-between shrink-0">
        {/* Mobile / Tablet View Brand Logo */}
        <div className="lg:hidden">
          <InkFlowPlatformLogo />
        </div>
        <div className="hidden lg:block">
          {/* Subtle Breadcrumb / Env Indicator on Desktop */}
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-900/60 border border-slate-800/80 px-3 py-1 rounded-full backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-300 font-semibold tracking-wide">SECURE REGION:</span>
            <span className="text-indigo-400 font-mono">BGD-DHK-01</span>
          </div>
        </div>

        {/* Right Controls: System Health Pill + Language Selector */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Status pill on tablet/desktop */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/70 border border-slate-800/90 text-xs text-slate-300 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-slate-300">{t.systemStatus}</span>
          </div>

          {/* Bilingual Language Switcher Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen(!langMenuOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer shadow-sm hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
              aria-expanded={langMenuOpen}
              aria-label="Select Language"
            >
              <Globe className="h-3.5 w-3.5 text-indigo-400" />
              <span>{language === 'en' ? 'English' : 'বাংলা'}</span>
              <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-200 ${langMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {langMenuOpen && (
              <div className="absolute right-0 mt-2 w-36 rounded-xl bg-[#0d1226] border border-slate-700/80 shadow-2xl p-1.5 z-50 animate-in fade-in-50 zoom-in-95 duration-150 backdrop-blur-xl">
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('en')
                    setLangMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors font-medium cursor-pointer ${
                    language === 'en' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-semibold">English (US)</span>
                  {language === 'en' && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLanguage('bn')
                    setLangMenuOpen(false)
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs text-left transition-colors font-medium cursor-pointer ${
                    language === 'bn' ? 'bg-indigo-600/20 text-indigo-300' : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span className="font-semibold">বাংলা (BD)</span>
                  {language === 'bn' && <Check className="h-3.5 w-3.5 text-indigo-400" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- Main Presentation & Authentication Grid --- */}
      <main className="relative z-20 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-4 sm:py-6 flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-8 lg:gap-14 my-auto min-h-0">
        
        {/* LEFT COLUMN: Mission Control Brand Identity & Infrastructure Feature Showcase (Desktop Only) */}
        <div className="hidden lg:flex w-full lg:max-w-[500px] xl:max-w-[540px] flex-col justify-center space-y-5 xl:space-y-6 shrink-0">
          
          {/* Main Logo & Platform Pill */}
          <div className="space-y-3">
            <InkFlowPlatformLogo />
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/30 text-[10px] font-bold tracking-[0.22em] text-indigo-300 uppercase">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              <span>{t.platformBadge}</span>
            </div>
          </div>

          {/* Dynamic Headline & Mission Statement */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl xl:text-[42px] font-black tracking-tight text-white leading-[1.12]">
              {t.headlineMain}
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {t.headlineSub}
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-lg">
              {t.heroDesc}
            </p>
          </div>

          {/* 3 High-Impact Security & Infrastructure Feature Cards */}
          <div className="space-y-3 pt-1">
            
            {/* Feature 1: Cryptographic Tenant Isolation */}
            <div className="group relative flex items-start gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900/80 to-[#0b0f24]/60 border border-slate-800/80 hover:border-indigo-500/40 hover:bg-slate-900/90 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-indigo-950/80 border border-indigo-700/50 flex items-center justify-center text-indigo-400 shrink-0 shadow-md shadow-indigo-950/60 group-hover:scale-105 transition-transform">
                <Database className="w-4 h-4 text-indigo-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  {t.feat1Title}
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 leading-normal">{t.feat1Desc}</div>
              </div>
            </div>

            {/* Feature 2: Zero-Trust Protocol & 2FA */}
            <div className="group relative flex items-start gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900/80 to-[#0b0f24]/60 border border-slate-800/80 hover:border-purple-500/40 hover:bg-slate-900/90 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-purple-950/80 border border-purple-700/50 flex items-center justify-center text-purple-400 shrink-0 shadow-md shadow-purple-950/60 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4 text-purple-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  {t.feat2Title}
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase font-semibold">
                    TOTP
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 leading-normal">{t.feat2Desc}</div>
              </div>
            </div>

            {/* Feature 3: Immutable Audit Fleet */}
            <div className="group relative flex items-start gap-3.5 p-3 rounded-2xl bg-gradient-to-r from-slate-900/80 to-[#0b0f24]/60 border border-slate-800/80 hover:border-cyan-500/40 hover:bg-slate-900/90 transition-all duration-200">
              <div className="w-9 h-9 rounded-xl bg-cyan-950/80 border border-cyan-700/50 flex items-center justify-center text-cyan-400 shrink-0 shadow-md shadow-cyan-950/60 group-hover:scale-105 transition-transform">
                <Terminal className="w-4 h-4 text-cyan-300" />
              </div>
              <div className="space-y-0.5">
                <div className="text-xs sm:text-sm font-bold text-slate-100 flex items-center gap-1.5">
                  {t.feat3Title}
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase font-semibold">
                    FORENSIC
                  </span>
                </div>
                <div className="text-[11px] sm:text-xs text-slate-400 leading-normal">{t.feat3Desc}</div>
              </div>
            </div>

          </div>

          {/* Security Metric Micro-Ribbon */}
          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono pt-1">
            <span className="flex items-center gap-1">
              <span className="text-indigo-400 font-bold">🔒</span> 256-Bit AES
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-emerald-400 font-bold">⚡</span> 0ms Latency
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="text-cyan-400 font-bold">🛡️</span> ISO/SOC-2 Aligned
            </span>
          </div>

        </div>

        {/* RIGHT COLUMN: Ultra-Premium Frosted Glass Authentication Card */}
        <div className="w-full max-w-[430px] flex justify-center shrink-0">
          <div className="w-full relative">
            
            {/* Ambient Card Glow Behind Glass */}
            <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-b from-indigo-500/30 via-purple-500/20 to-cyan-500/20 opacity-70 blur-xl pointer-events-none" />

            {/* Frosted Container */}
            <div className="relative w-full bg-[#0a0e22]/90 backdrop-blur-2xl border border-slate-700/60 rounded-3xl p-6 sm:p-7 xl:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.85)]">
              
              {/* Card Header Shield Icon & Badges */}
              <div className="text-center space-y-1.5 mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-blue-600 p-[1px] shadow-lg shadow-indigo-600/30 mb-1">
                  <div className="w-full h-full bg-[#090d20] rounded-2xl flex items-center justify-center">
                    <Shield className="w-6 h-6 text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.6)]" />
                  </div>
                </div>

                <div>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[9px] font-black tracking-widest uppercase mb-1">
                    {t.cardBadge}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                    {t.cardTitle}
                  </h2>
                  <p className="text-xs text-slate-300 mt-1">
                    {requiresMfa ? t.mfaDesc : t.cardSubtitle}
                  </p>
                </div>
              </div>

              {/* Error Alert Banner */}
              {error && (
                <div className="mb-4 rounded-xl bg-red-950/70 p-3 text-xs text-red-200 border border-red-700/70 flex items-start gap-2.5 animate-in fade-in-50 duration-150">
                  <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <span className="leading-relaxed">{error}</span>
                    {isNetworkError && (
                      <div className="pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => executeSignIn()}
                          className="text-[10px] h-6 border-red-700 bg-red-900/50 text-white hover:bg-red-800 px-2.5"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Retry Connection
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={executeSignIn} noValidate className="space-y-3.5">
                {requiresMfa ? (
                  /* Two-Factor Authentication (MFA) Verification Mode */
                  <div className="space-y-4 animate-in fade-in-50 duration-200">
                    <div className="p-3 rounded-xl bg-indigo-950/60 border border-indigo-700/60 text-xs text-indigo-200 flex items-center gap-2.5">
                      <KeyRound className="h-4 w-4 text-indigo-400 shrink-0" />
                      <div className="truncate">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Operator Verified</div>
                        <strong className="text-white font-mono text-xs">{email}</strong>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label
                        htmlFor="platform-mfa"
                        className="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
                      >
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
                          placeholder="••••••"
                          className="w-full bg-[#050714] border border-slate-700 hover:border-slate-600 text-white placeholder:text-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 font-mono tracking-[0.5em] text-center text-lg sm:text-xl h-11 sm:h-12 rounded-xl outline-none transition-all shadow-inner"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setRequiresMfa(false)
                          setError(null)
                        }}
                        className="text-xs text-slate-400 hover:text-white flex items-center gap-1 min-h-[36px] px-2 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        <span>{t.mfaBack}</span>
                      </button>

                      <Button
                        type="submit"
                        disabled={isLoading || mfaCode.length !== 6}
                        className="bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold text-xs py-2 h-10 px-5 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 rounded-xl cursor-pointer disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <span>{t.mfaSubmit}</span>
                        )}
                      </Button>
                    </div>
                  </div>
                ) : (
                  /* Primary Root Credentials Mode */
                  <>
                    {/* Operator Email Field */}
                    <div className="space-y-1.5">
                      <Label
                        htmlFor="platform-email"
                        className="text-[10px] font-bold tracking-wider text-slate-400 uppercase flex items-center justify-between"
                      >
                        <span>{t.emailLabel}</span>
                        <span className="text-indigo-400 text-[9px] font-normal">ROOT IDENTIFIER</span>
                      </Label>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 pointer-events-none text-slate-500">
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
                          className="w-full bg-[#050714] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl pl-10 pr-3 py-2.5 text-xs sm:text-[13px] text-white placeholder:text-slate-600 transition-all outline-none font-medium"
                        />
                      </div>
                    </div>

                    {/* Security Key / Password Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="platform-password"
                          className="text-[10px] font-bold tracking-wider text-slate-400 uppercase"
                        >
                          {t.passwordLabel}
                        </Label>
                        <Link
                          href="/platform/forgot-password"
                          className="text-[10px] sm:text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors hover:underline"
                        >
                          {t.forgotPassword}
                        </Link>
                      </div>
                      <div className="relative flex items-center">
                        <div className="absolute left-3.5 pointer-events-none text-slate-500">
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
                          className="w-full bg-[#050714] border border-slate-700/80 hover:border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 rounded-xl pl-10 pr-10 py-2.5 text-xs sm:text-[13px] text-white placeholder:text-slate-600 transition-all outline-none font-medium"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 p-1 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none cursor-pointer"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                        >
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Authentication Action Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 hover:from-indigo-500 hover:via-purple-500 hover:to-cyan-500 active:scale-[0.99] text-white font-bold text-xs sm:text-sm py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed min-h-[44px]"
                      >
                        {isLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>{t.signingInBtn}</span>
                          </>
                        ) : (
                          <>
                            <span>{t.signInBtn}</span>
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Minimal Separator */}
                    <div className="relative flex items-center justify-center py-1">
                      <div className="w-full border-t border-slate-800" />
                      <span className="bg-[#0a0e22] px-2.5 text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                        {t.orDivider}
                      </span>
                      <div className="w-full border-t border-slate-800" />
                    </div>

                    {/* Business ERP Login Alternative Link */}
                    <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5 flex-wrap">
                      <span>{t.lookingForBusiness}</span>
                      <Link
                        href="/login"
                        className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors hover:underline inline-flex items-center gap-1"
                      >
                        <span>{t.goToBusinessLogin}</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>

                    {/* Cryptographic Session Assurance Banner */}
                    <div className="mt-3.5 p-3 rounded-2xl bg-[#050713]/95 border border-slate-800 text-[10px] text-slate-400 flex items-start gap-2.5 shadow-inner">
                      <div className="w-5 h-5 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-indigo-400 shrink-0 mt-0.5">
                        <Shield className="h-3 w-3 text-indigo-300" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-300 tracking-wider uppercase text-[9px] flex items-center gap-1">
                          <span>{t.secureNoticeTitle}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
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
        </div>

      </main>

      {/* --- Global System Footer Bar --- */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-[10px] text-slate-500 border-t border-slate-800/60 shrink-0">
        
        {/* Platform Motto */}
        <div className="tracking-[0.24em] font-semibold uppercase text-slate-400 flex items-center gap-2 text-[9px]">
          <span>PRINT</span>
          <span className="text-indigo-500 font-normal">›</span>
          <span>PEOPLE</span>
          <span className="text-indigo-500 font-normal">›</span>
          <span>PROCESS</span>
          <span className="text-indigo-500 font-normal">›</span>
          <span>PROFIT</span>
        </div>

        {/* Legal & Status Links */}
        <div className="flex items-center gap-3 text-slate-400 text-[10px]">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span className="text-slate-700">•</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <span className="text-slate-700">•</span>
          <Link href="/platform/support" className="hover:text-white transition-colors">
            Support & Help
          </Link>
          <span className="text-slate-700">•</span>
          <span className="text-indigo-400 font-mono text-[9px]">v2.4-PROD</span>
        </div>

      </footer>
    </div>
  )
}

export default function PlatformLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#050711] flex flex-col items-center justify-center text-slate-400 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <div className="text-xs font-mono tracking-wider text-slate-400 uppercase">
            Initializing InkFlow Platform Core...
          </div>
        </div>
      }
    >
      <PlatformLoginForm />
    </Suspense>
  )
}
