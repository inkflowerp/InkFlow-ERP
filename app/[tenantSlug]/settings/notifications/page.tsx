'use client'

import React, { useState, useEffect } from 'react'
import {
  Bell,
  Save,
  CheckCircle2,
  MessageSquare,
  PhoneCall,
  Mail,
  AlertTriangle,
  AlertCircle,
  Volume2,
  VolumeX,
  Radio,
  Sliders,
  Sparkles,
  ShoppingBag,
  DollarSign,
  Truck,
  UserCheck,
  Send,
  Smartphone,
  ShieldCheck,
  Info,
  Layers,
  Package,
  Flame,
  Megaphone,
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { useTenant } from '@/hooks/use-tenant'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { updateCompanyAction, updateCompanySettingsAction } from '@/actions/tenant.actions'

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import {
  playNotificationSound,
  previewSound,
  isSoundMuted,
  setSoundMuted,
  getSoundVolume,
  setSoundVolume,
  NotificationSoundType,
  SOUND_CATALOG,
} from '@/lib/notifications/sound-manager'
import {
  getBrowserNotificationPermission,
  requestBrowserNotificationPermission,
  isBrowserNotificationEnabled,
  setBrowserNotificationEnabled,
  showBrowserNotification,
  BrowserPermissionStatus,
} from '@/lib/notifications/browser-notification'
import { notify } from '@/lib/notifications/notification-bus'
import { useToast } from '@/components/shared/toast-feedback'

export default function NotificationSettingsPage() {
  const { company, settings, refreshTenant } = useTenant()
  const { locale, tBilingual } = useI18n()
  const { showToast } = useToast()
  const [mounted, setMounted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Sound and browser notification state
  const [soundMuted, setSoundMutedState] = useState(false)
  const [volume, setVolumeState] = useState(85)
  const [browserPerm, setBrowserPerm] = useState<BrowserPermissionStatus>('default')
  const [browserEnabled, setBrowserEnabledState] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'commercial' | 'operations' | 'alerts' | 'system'>('all')
  const [activePlaying, setActivePlaying] = useState<NotificationSoundType | null>(null)

  useEffect(() => {
    setMounted(true)
    setSoundMutedState(isSoundMuted())
    setVolumeState(Math.round(getSoundVolume() * 100))
    setBrowserPerm(getBrowserNotificationPermission())
    setBrowserEnabledState(isBrowserNotificationEnabled())
  }, [])

  const [notif, setNotif] = useDataStore(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    whatsapp_enabled: !!(company?.whatsapp || settings?.whatsapp),
    whatsapp_number: company?.whatsapp || settings?.whatsapp || '',
    sms_enabled: false,
    sms_gateway: 'Greenweb SMS Gateway',
    sms_sender_id: '',
    sms_api_key: '',
    email_enabled: true,
    low_stock_alerts: true,
    low_stock_threshold: 50, // 50 sft / rolls
  })

  useEffect(() => {
    if (company?.whatsapp || settings?.whatsapp) {
      setNotif((prev) => ({
        ...prev,
        whatsapp_number: prev.whatsapp_number || company?.whatsapp || settings?.whatsapp || '',
      }))
    }
  }, [company, settings, setNotif])

  const handleToggleSoundMute = () => {
    const next = !soundMuted
    setSoundMuted(next)
    setSoundMutedState(next)
    if (!next) {
      previewSound('success')
    }
  }

  const handleVolumeChange = (newVal: number) => {
    setVolumeState(newVal)
    setSoundVolume(newVal / 100)
  }

  const handleVolumePreset = (presetVal: number) => {
    setVolumeState(presetVal)
    setSoundVolume(presetVal / 100)
    if (soundMuted) {
      setSoundMuted(false)
      setSoundMutedState(false)
    }
    previewSound('system', presetVal / 100)
  }

  const handleRequestPushPermission = async () => {
    const perm = await requestBrowserNotificationPermission()
    setBrowserPerm(perm)
    setBrowserEnabledState(isBrowserNotificationEnabled())
    if (perm === 'granted') {
      showToast({
        title: 'Browser Notifications Enabled',
        titleBn: 'ব্রাউজার পুশ নোটিফিকেশন সক্রিয় হয়েছে',
        type: 'success',
        message: 'You will now receive desktop alerts for orders, payments, and dispatch events.',
        messageBn: 'নতুন অর্ডার, পেমেন্ট এবং চালানের নোটিফিকেশন সরাসরি স্ক্রিনে পাবেন।',
      })
      showBrowserNotification({
        title: 'PrintERP Notifications Active',
        body: 'Realtime order, payment, and production alerts are now connected.',
        soundType: 'success',
      })
    }
  }

  const handleToggleBrowserEnabled = () => {
    const next = !browserEnabled
    setBrowserNotificationEnabled(next)
    setBrowserEnabledState(next)
  }

  const handleTestSound = (type: NotificationSoundType) => {
    setActivePlaying(type)
    previewSound(type)
    setTimeout(() => setActivePlaying(null), 1000)
  }

  const handleTestLivePopup = (type: NotificationSoundType) => {
    const sampleAlerts: Record<NotificationSoundType, { title: string; titleBn: string; msg: string; msgBn: string; url: string }> = {
      order: {
        title: 'New POS Order #ORD-2026-98',
        titleBn: 'নতুন পিওএস অর্ডার #ORD-2026-98',
        msg: 'Acrylic 3D Signboard (40 sft) ordered by Vision Enterprise',
        msgBn: 'ভিশন এন্টারপ্রাইজ থেকে অ্যাক্রিলিক থ্রিডি সাইনবোর্ড অর্ডার এসেছে',
        url: '/orders',
      },
      payment: {
        title: 'Payment Received: ৳15,000',
        titleBn: 'পেমেন্ট জমা হয়েছে: ৳১৫,০০০',
        msg: 'bKash Merchant settlement for Invoice #INV-5432',
        msgBn: 'ইনভয়েস #INV-5432 এর বিকাশ মার্চেন্ট পেমেন্ট সম্পন্ন হয়েছে',
        url: '/orders',
      },
      delivery: {
        title: 'Challan #CH-881 Ready for Dispatch',
        titleBn: 'চালান #CH-881 ডেলিভারির জন্য প্রস্তুত',
        msg: 'Assigned to Rider Kamrul for Motijheel Commercial Area',
        msgBn: 'মতিঝিল ডেলিভারির জন্য রাইডার কামরুলকে দায়িত্ব দেওয়া হয়েছে',
        url: '/delivery',
      },
      attendance: {
        title: 'Biometric Check-In Recorded',
        titleBn: 'বায়োমেট্রিক হাজিরা রেকর্ড হয়েছে',
        msg: 'Operator Tanvir Ahmed checked in at Floor 1 (09:05 AM)',
        msgBn: 'অপারেটর তানভীর আহমেদ ফ্লোর ১ এ চেক-ইন করেছেন (সকাল ০৯:০৫)',
        url: '/attendance',
      },
      job: {
        title: 'Production Step Completed',
        titleBn: 'প্রোডাকশন ধাপ সম্পন্ন',
        msg: 'Offset UV Varnishing finished for Job #JOB-8842',
        msgBn: 'জব #JOB-8842 এর অফসেট ইউভি বার্নিশ সফলভাবে সমাপ্ত হয়েছে',
        url: '/production',
      },
      inventory: {
        title: 'Roll Received: Self-Adhesive Vinyl 5ft',
        titleBn: 'নতুন রোল জমা: সেলফ-আঠালো ভিনাইল ৫ ফিট',
        msg: 'Added 500 sft to Main Warehouse Rack B-04',
        msgBn: 'প্রধান ওয়্যারহাউস র্যাক B-04 এ ৫০০ স্কয়ার ফিট যুক্ত হয়েছে',
        url: '/inventory/rolls',
      },
      urgent: {
        title: 'Machine Jam: Solvent Printhead 1 Halted',
        titleBn: 'জরুরি সতর্কতা: সলভেন্ট হেড ১ জ্যাম',
        msg: 'Roland VS-640 emergency stop triggered during high-speed banner print.',
        msgBn: 'হাই-স্পিড ব্যানার প্রিন্টিং চলাকালীন রোল্যান্ড মেশিনে জরুরি থামা সংকেত।',
        url: '/production',
      },
      warning: {
        title: 'Low Stock: Solvent Frontlit 440gsm',
        titleBn: 'স্টক সংকট: সলভেন্ট ফ্রন্টলিট ৪৪০ জিএসএম',
        msg: 'Remaining inventory: 35 sft (below 50 sft re-order point)',
        msgBn: 'বর্তমান স্টক: ৩৫ স্কয়ার ফিট (সর্বনিম্ন ৫০ স্কয়ার ফিটের নিচে)',
        url: '/inventory/rolls',
      },
      error: {
        title: 'Transaction Gateway Timeout',
        titleBn: 'পেমেন্ট গেটওয়ে সময়সীমা অতিক্রম',
        msg: 'bKash merchant auto-settlement failed for POS Terminal 2',
        msgBn: 'পিওএস টার্মিনাল ২ এর বিকাশ অটো-সেটেলমেন্ট ব্যর্থ হয়েছে',
        url: '/orders',
      },
      broadcast: {
        title: 'Platform Maintenance Advisory',
        titleBn: 'সিস্টেম রক্ষণাবেক্ষণ বিজ্ঞপ্তি',
        msg: 'Scheduled database indexing tonight from 02:00 AM to 02:30 AM (BST)',
        msgBn: 'আজ রাত ০২:০০ থেকে ০২:৩০ পর্যন্ত সিস্টেম আপডেট চলবে।',
        url: '/settings',
      },
      message: {
        title: 'New Customer Support Message',
        titleBn: 'নতুন গ্রাহক বার্তা',
        msg: 'Aman Graphics: "Can we get the proof approved by 4 PM today?"',
        msgBn: 'আমান গ্রাফিক্স: "আজ বিকাল ৪টার মধ্যে প্রুফ পাওয়া যাবে কি?"',
        url: '/support',
      },
      success: {
        title: 'Job Order #JB-901 Completed',
        titleBn: 'জব অর্ডার #JB-901 সম্পন্ন হয়েছে',
        msg: 'UV Flatbed printing for 10 Frosted Glass panels verified by QC',
        msgBn: '১০টি ফ্রস্টেড গ্লাস প্যানেলের ইউভি প্রিন্টিং কিউসি দ্বারা পরীক্ষিত ও প্রস্তুত',
        url: '/production',
      },
      system: {
        title: 'Database Cloud Sync Complete',
        titleBn: 'ডাটাবেস ক্লাউড সিঙ্ক সম্পন্ন',
        msg: 'All local changes synchronized with PrintERP master node',
        msgBn: 'সকল লোকাল ডাটা প্রিন্টইআরপি সার্ভারের সাথে আপডেট হয়েছে',
        url: '/settings',
      },
    }

    const item = sampleAlerts[type] || sampleAlerts.order
    notify({
      title: item.title,
      titleBn: item.titleBn,
      message: item.msg,
      messageBn: item.msgBn,
      type,
      actionUrl: item.url,
      mode: type === 'urgent' ? 'both' : 'popup',
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setIsSaved(false)
    try {
      if (company?.id) {
        const phoneToSave = notif.whatsapp_enabled ? notif.whatsapp_number : null
        await updateCompanyAction(company.id, {
          whatsapp: phoneToSave,
        })
        await updateCompanySettingsAction(company.id, {
          whatsapp: phoneToSave,
        })
        await refreshTenant()
      }
      setNotif(notif)
      setIsSaved(true)
      showToast({
        title: 'Settings Saved',
        titleBn: 'সেটিংস সংরক্ষিত হয়েছে',
        type: 'success',
        message: 'Notification gateways and audio preferences updated successfully.',
        messageBn: 'নোটিফিকেশন গেটওয়ে এবং অডিও কনফিগারেশন আপডেট করা হয়েছে।',
      })
      setTimeout(() => setIsSaved(false), 3500)
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="space-y-6 max-w-5xl animate-pulse">
        <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-12 bg-slate-100 dark:bg-slate-800/60 rounded-xl" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800/40 rounded-2xl" />
        <div className="h-48 bg-slate-100 dark:bg-slate-800/40 rounded-2xl" />
      </div>
    )
  }

  const filteredCatalog = SOUND_CATALOG.filter(
    (item) => selectedCategory === 'all' || item.category === selectedCategory
  )

  const getSoundIcon = (type: NotificationSoundType) => {
    switch (type) {
      case 'order':
        return ShoppingBag
      case 'payment':
        return DollarSign
      case 'delivery':
        return Truck
      case 'attendance':
        return UserCheck
      case 'job':
        return Layers
      case 'inventory':
        return Package
      case 'urgent':
        return Flame
      case 'warning':
        return AlertTriangle
      case 'error':
        return AlertCircle
      case 'broadcast':
        return Megaphone
      case 'message':
        return MessageSquare
      case 'success':
        return Sparkles
      case 'system':
      default:
        return Bell
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Notifications, Audio & Push Gateways"
        titleBn="নোটিফিকেশন, অডিও ও পুশ গেটওয়ে"
        descriptionEn="Configure studio-grade polyphonic audio synthesis, amplified factory chimes, browser push alerts, and SMS/WhatsApp dispatches."
        descriptionBn="স্টুডিও-গ্রেড পলিফোনিক অডিও সিন্থেসাইজার, উচ্চ শব্দযুক্ত ফ্যাক্টরি চাইম, ব্রাউজার পুশ ও এসএমএস/হোয়াটসঅ্যাপ গেটওয়ে কনফিগার করুন।"
        icon={Bell}
        iconColor="text-amber-600"
      />

      <SettingsNav />

      {isSaved && (
        <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 animate-in fade-in-0 shadow-sm">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Notification gateways and audio telemetry updated and recorded in audit log.</span>
        </div>
      )}

      {/* 1. Realtime Audio Chimes & Browser Push Notifications */}
      <Card className="border-indigo-500/30 shadow-lg shadow-indigo-950/5">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/30 dark:bg-indigo-950/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                <Radio className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Realtime Audio Chimes &amp; Browser Push</CardTitle>
                  <Badge className="bg-indigo-600 text-white text-[10px] font-bold">Web Audio 2.0</Badge>
                  <Badge className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                    Limiter Protected
                  </Badge>
                </div>
                <CardDescription className="text-xs">
                  High-fidelity harmonic synthesis with 5.6x amplified output volume and native OS desktop push notifications.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleToggleSoundMute}
                className={`text-xs h-9 font-bold border transition-all cursor-pointer ${
                  soundMuted
                    ? 'border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                }`}
              >
                {soundMuted ? (
                  <>
                    <VolumeX className="mr-1.5 h-4 w-4" />
                    Audio Muted (নিঃশব্দ)
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-1.5 h-4 w-4" />
                    Audio Active (সক্রিয়)
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Audio Volume & Browser Permission Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Audio Volume Slider & Quick Presets */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Master Chime Volume (সাউন্ড ভলিউম)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {soundMuted ? 'Muted (0%)' : `${volume}%`}
                </span>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                value={soundMuted ? 0 : volume}
                disabled={soundMuted}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 disabled:opacity-40"
              />

              {/* Quick Volume Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">Presets:</span>
                {[
                  { label: '25% Subtle', val: 25 },
                  { label: '50% Normal', val: 50 },
                  { label: '85% Loud', val: 85 },
                  { label: '100% Boost', val: 100 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handleVolumePreset(preset.val)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      volume === preset.val && !soundMuted
                        ? 'bg-indigo-600 text-white border-indigo-500'
                        : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-400'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Crafted with dynamic limiter compression to cut through loud printing presses, noisy cutter machines, and busy retail counters without digital distortion.
              </p>
            </div>

            {/* Native Browser Push Notification Card */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Desktop / OS Push Notifications
                  </span>
                </div>

                <Badge
                  className={
                    browserPerm === 'granted'
                      ? 'bg-emerald-600 text-white text-[10px]'
                      : browserPerm === 'denied'
                      ? 'bg-rose-600 text-white text-[10px]'
                      : 'bg-amber-600 text-white text-[10px]'
                  }
                >
                  {browserPerm === 'granted'
                    ? 'Granted / Active'
                    : browserPerm === 'denied'
                    ? 'Blocked in Browser'
                    : 'Permission Required'}
                </Badge>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {browserPerm === 'granted'
                    ? 'System alerts will pop up even when the browser tab is minimized or in background.'
                    : 'Enable browser permission to receive desktop alerts when away from the tab.'}
                </span>

                {browserPerm !== 'granted' ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRequestPushPermission}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 font-bold cursor-pointer"
                  >
                    Enable Push
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleToggleBrowserEnabled}
                    className="h-8 text-xs shrink-0 cursor-pointer"
                  >
                    {browserEnabled ? 'Disable' : 'Enable'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Sound Chime & Live Popup Testing Suite (13 Sound Archetypes) */}
          <div className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  Sound Synthesizer &amp; Alert Studio (13 Archetypes)
                </span>
                <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30 text-[10px]">
                  {filteredCatalog.length} Sounds
                </Badge>
              </div>

              {/* Category Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { key: 'all' as const, label: 'All' },
                  { key: 'commercial' as const, label: 'Commercial' },
                  { key: 'operations' as const, label: 'Operations' },
                  { key: 'alerts' as const, label: 'Alerts' },
                  { key: 'system' as const, label: 'System' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedCategory(tab.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                      selectedCategory === tab.key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredCatalog.map((item) => {
                const Icon = getSoundIcon(item.type)
                const isPlayingThis = activePlaying === item.type

                return (
                  <div
                    key={item.type}
                    className={`p-3.5 rounded-2xl border bg-white dark:bg-slate-900/70 flex flex-col justify-between gap-3 transition-all group ${
                      isPlayingThis
                        ? 'border-indigo-500 ring-2 ring-indigo-500/30 shadow-lg shadow-indigo-950/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl border ${
                            item.type === 'urgent'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : item.type === 'payment' || item.type === 'success'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : item.type === 'order'
                              ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
                              : item.type === 'delivery' || item.type === 'message'
                              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                              : item.type === 'attendance'
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                              : item.type === 'warning' || item.type === 'job'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : item.type === 'broadcast'
                              ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/30'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-100">
                              {tBilingual(item.nameEn, item.nameBn)}
                            </div>
                            <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider">
                              {item.category} • {item.waveform}
                            </span>
                          </div>
                        </div>

                        {isPlayingThis && (
                          <span className="flex items-center gap-1 text-[10px] text-indigo-400 font-bold animate-pulse">
                            <Volume2 className="h-3 w-3" />
                            Playing
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        {tBilingual(item.descEn, item.descBn)}
                      </p>

                      <div className="text-[9px] font-mono text-slate-400 bg-slate-50 dark:bg-slate-950/60 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 truncate">
                        {item.frequencies}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                      <button
                        type="button"
                        onClick={() => handleTestSound(item.type)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/80 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5"
                        title="Play audio chime only"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                        Chime 🔊
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestLivePopup(item.type)}
                        className="px-2.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-[11px] font-bold text-white transition-colors cursor-pointer text-center flex items-center justify-center gap-1.5 shadow-sm"
                        title="Trigger live popup card & chime"
                      >
                        <Bell className="h-3.5 w-3.5" />
                        Popup 🔔
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave} className="space-y-6">
        {/* WhatsApp Cloud API */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <div>
                  <CardTitle className="text-base">WhatsApp Order &amp; Proof Alerts</CardTitle>
                  <CardDescription className="text-xs">
                    Send high-res watermarked proofs and delivery PDF receipts to customer WhatsApp.
                  </CardDescription>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notif.whatsapp_enabled}
                onChange={(e) => setNotif({ ...notif, whatsapp_enabled: e.target.checked })}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="whatsappNo">WhatsApp Business Helpline</Label>
              <Input
                id="whatsappNo"
                placeholder="+880 1700-000000"
                value={notif.whatsapp_number}
                onChange={(e) => setNotif({ ...notif, whatsapp_number: e.target.value })}
                disabled={!notif.whatsapp_enabled}
              />
            </div>
          </CardContent>
        </Card>

        {/* Bangladeshi SMS Gateway (Greenweb / SSL Wireless) */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PhoneCall className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-base">Bangladeshi Masked SMS Gateway</CardTitle>
                  <CardDescription className="text-xs">
                    Instant delivery readiness and invoice payment confirmation SMS.
                  </CardDescription>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notif.sms_enabled}
                onChange={(e) => setNotif({ ...notif, sms_enabled: e.target.checked })}
                className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="smsGateway">SMS Provider</Label>
                <select
                  id="smsGateway"
                  className="w-full h-10 px-3 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold"
                  value={notif.sms_gateway}
                  onChange={(e) => setNotif({ ...notif, sms_gateway: e.target.value })}
                  disabled={!notif.sms_enabled}
                >
                  <option value="Greenweb SMS Gateway">Greenweb BD (Fast OTP/Alerts)</option>
                  <option value="SSL Wireless">SSL Wireless SMS Engine</option>
                  <option value="Banglalink/Grameenphone Aggregator">Direct Telco Aggregator</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="senderId">BTCL Approved Masking ID</Label>
                <Input
                  id="senderId"
                  placeholder="PRINTFLOW"
                  value={notif.sms_sender_id}
                  onChange={(e) => setNotif({ ...notif, sms_sender_id: e.target.value })}
                  disabled={!notif.sms_enabled}
                  className="font-mono text-xs uppercase"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="smsApiKey">API Secret Key</Label>
                <Input
                  id="smsApiKey"
                  type="password"
                  value={notif.sms_api_key}
                  onChange={(e) => setNotif({ ...notif, sms_api_key: e.target.value })}
                  disabled={!notif.sms_enabled}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Low-Stock & Inventory Warnings */}
        <Card>
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                <div>
                  <CardTitle className="text-base">Low-Stock Media Alerts</CardTitle>
                  <CardDescription className="text-xs">
                    Notify Floor Manager when media rolls or solvent inks reach re-order threshold.
                  </CardDescription>
                </div>
              </div>

              <input
                type="checkbox"
                checked={notif.low_stock_alerts}
                onChange={(e) => setNotif({ ...notif, low_stock_alerts: e.target.checked })}
                className="h-5 w-5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5 max-w-xs">
              <Label htmlFor="lowStockThresh">Re-order Alert Margin (sft / rolls)</Label>
              <Input
                id="lowStockThresh"
                type="number"
                value={notif.low_stock_threshold}
                onChange={(e) => setNotif({ ...notif, low_stock_threshold: Number(e.target.value) })}
                disabled={!notif.low_stock_alerts}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end pt-2">
          <Button type="submit" isLoading={isLoading} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
            <Save className="mr-1.5 h-4 w-4" />
            Save Notification Gateways
          </Button>
        </div>
      </form>
    </div>
  )
}
