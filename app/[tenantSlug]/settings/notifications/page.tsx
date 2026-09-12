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
} from 'lucide-react'
import { useI18n } from '@/i18n/context'
import { SettingsNav } from '@/components/settings/settings-nav'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

import { useDataStore } from '@/hooks/use-data-store'
import { STORAGE_KEYS } from '@/lib/db/data-store'
import {
  playNotificationSound,
  isSoundMuted,
  setSoundMuted,
  getSoundVolume,
  setSoundVolume,
  NotificationSoundType,
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
  const { locale, tBilingual } = useI18n()
  const { showToast } = useToast()
  const [isSaved, setIsSaved] = useState(false)

  // Sound and browser notification state
  const [soundMuted, setSoundMutedState] = useState(isSoundMuted())
  const [volume, setVolumeState] = useState(Math.round(getSoundVolume() * 100))
  const [browserPerm, setBrowserPerm] = useState<BrowserPermissionStatus>('default')
  const [browserEnabled, setBrowserEnabledState] = useState(false)

  useEffect(() => {
    setBrowserPerm(getBrowserNotificationPermission())
    setBrowserEnabledState(isBrowserNotificationEnabled())
  }, [])

  const [notif, setNotif] = useDataStore(STORAGE_KEYS.NOTIFICATION_SETTINGS, {
    whatsapp_enabled: false,
    whatsapp_number: '',
    sms_enabled: false,
    sms_gateway: 'Greenweb SMS Gateway',
    sms_sender_id: '',
    sms_api_key: '',
    email_enabled: true,
    low_stock_alerts: true,
    low_stock_threshold: 50, // 50 sft / rolls
  })

  const handleToggleSoundMute = () => {
    const next = !soundMuted
    setSoundMuted(next)
    setSoundMutedState(next)
    if (!next) {
      playNotificationSound('success')
    }
  }

  const handleVolumeChange = (newVal: number) => {
    setVolumeState(newVal)
    setSoundVolume(newVal / 100)
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
    playNotificationSound(type, { force: true })
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
      warning: {
        title: 'Low Stock: Solvent Frontlit 440gsm',
        titleBn: 'স্টক সংকট: সলভেন্ট ফ্রন্টলিট ৪৪০ জিএসএম',
        msg: 'Remaining inventory: 35 sft (below 50 sft re-order point)',
        msgBn: 'বর্তমান স্টক: ৩৫ স্কয়ার ফিট (সর্বনিম্ন ৫০ স্কয়ার ফিটের নিচে)',
        url: '/inventory/rolls',
      },
      error: {
        title: 'Machine Error: Eco-Solvent Head 2 Jam',
        titleBn: 'মেশিন সমস্যা: ইকো-সলভেন্ট হেড ২ জ্যাম',
        msg: 'Roland VS-640 halted on job #JOB-102. Immediate maintenance required.',
        msgBn: 'রোল্যান্ড VS-640 মেশিনে ত্রুটি ধরা পড়েছে। দ্রুত রক্ষণাবেক্ষণ প্রয়োজন।',
        url: '/production',
      },
      broadcast: {
        title: 'Platform Maintenance Advisory',
        titleBn: 'সিস্টেম রক্ষণাবেক্ষণ বিজ্ঞপ্তি',
        msg: 'Scheduled database indexing tonight from 02:00 AM to 02:30 AM (BST)',
        msgBn: 'আজ রাত ০২:০০ থেকে ০২:৩০ পর্যন্ত সিস্টেম আপডেট চলবে।',
        url: '/settings',
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
      mode: 'popup',
    })
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
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
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <PageHeader
        titleEn="Notifications, Audio & Push Gateways"
        titleBn="নোটিফিকেশন, অডিও ও পুশ গেটওয়ে"
        descriptionEn="Configure polyphonic audio chimes, browser push alerts, automated WhatsApp dispatches, and Bangladeshi masked SMS."
        descriptionBn="পলিফোনিক অডিও চাইম, ব্রাউজার পুশ নোটিফিকেশন, হোয়াটসঅ্যাপ চালন এবং মাস্কড এসএমএস গেটওয়ে কনফিগার করুন।"
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
                  <Badge className="bg-indigo-600 text-white text-[10px] font-bold">Web Audio API</Badge>
                </div>
                <CardDescription className="text-xs">
                  Zero-latency polyphonic frequency synthesis with multi-tone alerts and native OS desktop push notifications.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleToggleSoundMute}
                className={`text-xs h-9 font-bold border transition-all ${
                  soundMuted
                    ? 'border-rose-300 text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30'
                    : 'border-emerald-300 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                }`}
              >
                {soundMuted ? (
                  <>
                    <VolumeX className="mr-1.5 h-4 w-4" />
                    Audio Muted
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-1.5 h-4 w-4" />
                    Audio Active
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-5">
          {/* Audio Volume & Browser Permission Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Audio Volume Slider */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sliders className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Master Chime Volume
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

              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Uses polyphonic harmonic intervals crafted to cut through loud printing factory environments without being harsh.
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
                    ? 'System alerts will pop up even when the browser tab is in background.'
                    : 'Enable browser permission to receive desktop alerts when away from tab.'}
                </span>

                {browserPerm !== 'granted' ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleRequestPushPermission}
                    className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 font-bold"
                  >
                    Enable Push
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleToggleBrowserEnabled}
                    className="h-8 text-xs shrink-0"
                  >
                    {browserEnabled ? 'Disable' : 'Enable'}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Sound Chime & Live Popup Testing Suite */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                Audio Chime &amp; Notification Tester
              </span>
              <span className="text-[11px] text-slate-500">Click any preset to test the synthesizer sound and popup</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {[
                { type: 'order' as const, label: 'Sales Order', icon: ShoppingBag, color: 'indigo', freq: 'C5-E5-G5-C6' },
                { type: 'payment' as const, label: 'Payment', icon: DollarSign, color: 'emerald', freq: 'D5-F#5-A5-D6' },
                { type: 'delivery' as const, label: 'Dispatch', icon: Truck, color: 'cyan', freq: 'E5-G5' },
                { type: 'attendance' as const, label: 'Attendance', icon: UserCheck, color: 'blue', freq: 'G5-C6 Ping' },
                { type: 'warning' as const, label: 'Caution / Alert', icon: AlertTriangle, color: 'amber', freq: 'A4-Ab4 Amber' },
                { type: 'broadcast' as const, label: 'Broadcast', icon: Radio, color: 'purple', freq: 'F5-A5-C6 Fanfare' },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <div
                    key={item.type}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 flex flex-col gap-2 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">
                        <Icon className="h-4 w-4" />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">{item.freq}</span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-1 pt-1">
                      <button
                        type="button"
                        onClick={() => handleTestSound(item.type)}
                        className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer text-center"
                        title="Play audio chime only"
                      >
                        Chime 🔊
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTestLivePopup(item.type)}
                        className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-[10px] font-bold text-white transition-colors cursor-pointer text-center"
                        title="Trigger live popup card & chime"
                      >
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
          <Button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
            <Save className="mr-1.5 h-4 w-4" />
            Save Notification Gateways
          </Button>
        </div>
      </form>
    </div>
  )
}
